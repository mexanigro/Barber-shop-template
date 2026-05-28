// Knowledge RAG module — private to the admin CRM assistant.
//
// Scope:
//   - Chunk plain text into ~500-token windows with overlap.
//   - Embed chunks with Gemini text-embedding-004 (REST).
//   - Retrieve top-K chunks by cosine similarity for a given clientId.
//
// CRITICAL — tenant isolation:
//   Every read is hard-scoped by clientId at the Firestore query level via
//   collectionGroup + where("clientId", "==", clientId). Never trust the
//   clientId from request bodies for retrieval — callers must pass the
//   authenticated tenant's clientId.
//
// Storage layout:
//   knowledge_docs/{clientId}/docs/{docId}                — metadata
//   knowledge_docs/{clientId}/docs/{docId}/chunks/{chunkId} — text + embedding
//
// We rely on the Admin SDK passed in via the `db` arg so this module stays
// runtime-agnostic (server.ts express + api/index.ts serverless).

import type { Firestore } from "firebase-admin/firestore";

export const GEMINI_EMBEDDING_MODEL = "text-embedding-004";
const GEMINI_REST_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Sizing knobs. Tuned for the volume documented in CLAUDE.md (single tenant,
// dozens of docs, thousands of chunks total).
export const CHUNK_TARGET_CHARS = 2000; // ~500 tokens at ~4 chars/token
export const CHUNK_OVERLAP_CHARS = 200;
export const MAX_CHUNKS_PER_DOC = 200;
export const MAX_DOCS_PER_CLIENT = 50;
export const MAX_TOTAL_BYTES_PER_CLIENT = 10 * 1024 * 1024; // 10 MB raw text
export const MAX_RETRIEVE_CHUNKS = 5000;
export const DEFAULT_TOP_K = 5;
export const MIN_SIMILARITY = 0.6;
export const RETRIEVAL_CONTEXT_CHAR_CAP = 12_000; // ~3000 tokens

export type ContentType = "pdf" | "txt" | "md" | "csv" | "manual";
export type DocSource = "upload" | "whatsapp-transcript" | "manual-paste";
export type DocStatus = "processing" | "indexed" | "failed";

export interface KnowledgeDoc {
  id: string;
  clientId: string;
  title: string;
  contentType: ContentType;
  source: DocSource;
  rawTextChars: number;
  chunkCount: number;
  createdAt: string;
  uploadedBy: string;
  status: DocStatus;
  errorReason?: string;
}

export interface KnowledgeChunkRecord {
  docId: string;
  text: string;
  embedding: number[];
  index: number;
  charStart: number;
  charEnd: number;
}

export interface RetrievedChunk {
  docId: string;
  docTitle: string;
  text: string;
  similarity: number;
}

// ───────────────────────────────────────────────────────────── chunking ──

/**
 * Split a long string into roughly-equal text windows with overlap.
 *
 * Boundary preference:
 *   1. Paragraph break (\n\n) near the target boundary
 *   2. Sentence end (. ! ?) near the boundary
 *   3. Hard cut at the target length
 *
 * Boundary search window: ±200 chars from the ideal cut, so we never push the
 * chunk size past ~2200 chars or below ~1800.
 */
export function chunkText(input: string, opts?: { target?: number; overlap?: number }): Array<{ text: string; charStart: number; charEnd: number }> {
  const target = opts?.target ?? CHUNK_TARGET_CHARS;
  const overlap = opts?.overlap ?? CHUNK_OVERLAP_CHARS;
  const text = input.replace(/\r\n?/g, "\n").trim();
  if (text.length === 0) return [];
  if (text.length <= target) return [{ text, charStart: 0, charEnd: text.length }];

  const chunks: Array<{ text: string; charStart: number; charEnd: number }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    const idealEnd = Math.min(cursor + target, text.length);
    if (idealEnd >= text.length) {
      const slice = text.slice(cursor).trim();
      if (slice) chunks.push({ text: slice, charStart: cursor, charEnd: text.length });
      break;
    }

    const window = 200;
    const searchStart = Math.max(cursor + Math.floor(target * 0.6), idealEnd - window);
    const searchEnd = Math.min(text.length, idealEnd + window);
    const region = text.slice(searchStart, searchEnd);

    let cut = -1;
    const paragraph = region.lastIndexOf("\n\n");
    if (paragraph >= 0) cut = searchStart + paragraph;
    if (cut < 0) {
      const sentenceMatch = /[.!?](\s|$)/g;
      let last = -1;
      let m: RegExpExecArray | null;
      while ((m = sentenceMatch.exec(region)) != null) last = m.index;
      if (last >= 0) cut = searchStart + last + 1;
    }
    if (cut < cursor + Math.floor(target * 0.4)) cut = idealEnd;

    const slice = text.slice(cursor, cut).trim();
    if (slice) chunks.push({ text: slice, charStart: cursor, charEnd: cut });
    if (chunks.length >= MAX_CHUNKS_PER_DOC) break;

    const next = cut - overlap;
    cursor = next > cursor ? next : cut;
  }

  return chunks;
}

// ──────────────────────────────────────────────────────────── embeddings ──

/**
 * Embed a list of texts with Gemini text-embedding-004 in batches of 100.
 * Returns one vector per input, in order. Throws on any non-OK status.
 */
export async function embedTexts(apiKey: string, texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const BATCH = 100;
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const url = `${GEMINI_REST_BASE}/models/${GEMINI_EMBEDDING_MODEL}:batchEmbedContents?key=${encodeURIComponent(apiKey)}`;
    const body = {
      requests: batch.map((t) => ({
        model: `models/${GEMINI_EMBEDDING_MODEL}`,
        content: { parts: [{ text: t }] },
      })),
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    let res: Awaited<ReturnType<typeof fetch>>;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    const data = (await res.json()) as {
      error?: { message?: string };
      embeddings?: Array<{ values?: number[] }>;
    };
    if (!res.ok) {
      throw new Error(`Gemini embeddings failed: ${data?.error?.message ?? res.statusText}`);
    }
    const vectors = data.embeddings ?? [];
    if (vectors.length !== batch.length) {
      throw new Error(`Gemini embeddings returned ${vectors.length}/${batch.length} vectors`);
    }
    for (const v of vectors) {
      const values = v.values;
      if (!Array.isArray(values) || values.length === 0) {
        throw new Error("Gemini embeddings returned an empty vector");
      }
      out.push(values);
    }
  }
  return out;
}

export async function embedQuery(apiKey: string, query: string): Promise<number[]> {
  const vectors = await embedTexts(apiKey, [query]);
  return vectors[0];
}

// ──────────────────────────────────────────────────────────── retrieval ──

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Read all chunks for a tenant and rank them against a query vector.
 *
 * Hard isolation: only reads /knowledge_docs/{clientId}/docs/*. Cross-tenant
 * leakage is impossible by construction — the path encodes the tenant.
 */
export async function retrieveContext(
  db: Firestore,
  apiKey: string,
  clientId: string,
  query: string,
  opts?: { topK?: number; minSimilarity?: number },
): Promise<RetrievedChunk[]> {
  if (!clientId || !query.trim()) return [];
  const topK = Math.max(1, Math.min(opts?.topK ?? DEFAULT_TOP_K, 20));
  const minSim = opts?.minSimilarity ?? MIN_SIMILARITY;

  // Fetch indexed docs for this tenant (status=indexed only — skip processing/failed)
  const docsSnap = await db
    .collection("knowledge_docs")
    .doc(clientId)
    .collection("docs")
    .where("status", "==", "indexed")
    .limit(MAX_DOCS_PER_CLIENT)
    .get();
  if (docsSnap.empty) return [];

  const titleByDocId = new Map<string, string>();
  for (const d of docsSnap.docs) {
    titleByDocId.set(d.id, String(d.data().title ?? "Untitled"));
  }

  const queryVec = await embedQuery(apiKey, query);

  // Read chunks per-doc (parallel). Cap total chunks scanned.
  let remaining = MAX_RETRIEVE_CHUNKS;
  const scored: RetrievedChunk[] = [];
  await Promise.all(
    docsSnap.docs.map(async (docSnap) => {
      if (remaining <= 0) return;
      const docId = docSnap.id;
      const title = titleByDocId.get(docId) ?? "Untitled";
      const chunksSnap = await db
        .collection("knowledge_docs")
        .doc(clientId)
        .collection("docs")
        .doc(docId)
        .collection("chunks")
        .limit(Math.min(remaining, MAX_CHUNKS_PER_DOC))
        .get();
      remaining -= chunksSnap.size;
      for (const c of chunksSnap.docs) {
        const data = c.data() as { text?: string; embedding?: number[] };
        if (!Array.isArray(data.embedding) || typeof data.text !== "string") continue;
        const sim = cosineSimilarity(queryVec, data.embedding);
        if (sim >= minSim) {
          scored.push({ docId, docTitle: title, text: data.text, similarity: sim });
        }
      }
    }),
  );

  scored.sort((a, b) => b.similarity - a.similarity);
  const top = scored.slice(0, topK);

  // Cap total context length so we don't blow the system-prompt budget
  let used = 0;
  const capped: RetrievedChunk[] = [];
  for (const r of top) {
    if (used + r.text.length > RETRIEVAL_CONTEXT_CHAR_CAP) break;
    capped.push(r);
    used += r.text.length;
  }
  return capped;
}

/**
 * Format the retrieval result as a system-prompt block. Returns empty string
 * when there's nothing to inject (no matches above the threshold).
 */
export function formatContextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";
  const body = chunks
    .map((c) => `[Doc: "${c.docTitle}" — similarity ${c.similarity.toFixed(2)}]\n${c.text}`)
    .join("\n\n");
  return `\n\n--- BUSINESS KNOWLEDGE BASE (private docs uploaded by the owner) ---\n${body}\n--- END BUSINESS KNOWLEDGE BASE ---`;
}

// ───────────────────────────────────────────────────────── text extract ──

/**
 * Extract plain text from a file buffer based on declared MIME type.
 * PDF support is wired through a dynamic import so the lib stays optional —
 * if `pdf-parse` is not installed at deploy time, we return a clear error.
 */
export async function extractTextFromBuffer(buf: Buffer, mime: string, filename: string): Promise<{ text: string; contentType: ContentType }> {
  const lower = (filename || "").toLowerCase();
  const isPdf = mime === "application/pdf" || lower.endsWith(".pdf");
  const isTxt = mime === "text/plain" || lower.endsWith(".txt");
  const isMd = mime === "text/markdown" || lower.endsWith(".md") || lower.endsWith(".markdown");
  const isCsv = mime === "text/csv" || lower.endsWith(".csv");

  if (isPdf) {
    try {
      // Optional dependency. If it's not present we surface a clean error and
      // the upstream caller can route the file to the "failed" status with the
      // reason "pdf_support_unavailable".
      const mod: unknown = await import("pdf-parse").catch(() => null);
      const fn = mod && typeof (mod as { default?: unknown }).default === "function"
        ? (mod as { default: (b: Buffer) => Promise<{ text: string }> }).default
        : null;
      if (!fn) {
        throw new Error("pdf_support_unavailable");
      }
      const parsed = await fn(buf);
      return { text: String(parsed.text ?? "").trim(), contentType: "pdf" };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "pdf_extract_failed");
    }
  }

  if (isTxt || isMd || isCsv) {
    const text = buf.toString("utf8").trim();
    return { text, contentType: isMd ? "md" : isCsv ? "csv" : "txt" };
  }

  throw new Error("unsupported_content_type");
}
