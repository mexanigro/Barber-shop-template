/**
 * Functional tests for src/lib/knowledge-rag.ts.
 *
 * Run with: npx tsx --test src/lib/knowledge-rag.test.ts
 *
 * The primary purpose of this file is to prove TENANT ISOLATION — i.e. that
 * retrieveContext(clientId, ...) cannot under any circumstance return chunks
 * belonging to a different clientId. The fake Firestore mirrors the path
 * structure the production code uses, so a bug in the query (missing
 * .doc(clientId) anchor, accidental collectionGroup, etc.) would surface
 * as a cross-tenant leak in this test.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  chunkText,
  cosineSimilarity,
  formatContextBlock,
  retrieveContext,
  MIN_SIMILARITY,
} from "./knowledge-rag.ts";

// ─── In-memory Firestore fake (tenant-pathed) ────────────────────────────────
// Mirrors the API surface retrieveContext touches: db.collection("knowledge_docs")
// .doc(clientId).collection("docs").where(...).limit(...).get() and the matching
// .doc(docId).collection("chunks").limit(...).get() path.

type DocData = Record<string, unknown>;
type Snap = { id: string; data: () => DocData };

class FakeQuery {
  constructor(
    private readonly docs: Map<string, DocData>,
    private filters: Array<[string, string, unknown]> = [],
    private limitN = Infinity,
    private orderField?: string,
  ) {}
  where(field: string, op: string, value: unknown): FakeQuery {
    return new FakeQuery(this.docs, [...this.filters, [field, op, value]], this.limitN, this.orderField);
  }
  orderBy(field: string): FakeQuery {
    return new FakeQuery(this.docs, this.filters, this.limitN, field);
  }
  limit(n: number): FakeQuery {
    return new FakeQuery(this.docs, this.filters, n, this.orderField);
  }
  async get() {
    const all: Snap[] = [];
    for (const [id, data] of this.docs.entries()) {
      const ok = this.filters.every(([f, op, v]) => {
        if (op === "==") return data[f] === v;
        return false;
      });
      if (ok) all.push({ id, data: () => ({ ...data }) });
    }
    const results = all.slice(0, this.limitN);
    return {
      empty: results.length === 0,
      size: results.length,
      docs: results,
    };
  }
}

class FakeChunksColl {
  docs = new Map<string, DocData>();
  add(data: DocData) {
    const id = `chunk_${this.docs.size + 1}`;
    this.docs.set(id, data);
  }
  limit(n: number): FakeQuery {
    return new FakeQuery(this.docs, [], n);
  }
}

class FakeDocsCollection {
  docs = new Map<string, DocData>();
  chunksByDoc = new Map<string, FakeChunksColl>();
  setDoc(id: string, data: DocData) {
    this.docs.set(id, data);
  }
  doc(id: string) {
    const self = this;
    return {
      collection(name: string) {
        if (name !== "chunks") throw new Error(`unexpected sub-collection: ${name}`);
        let c = self.chunksByDoc.get(id);
        if (!c) {
          c = new FakeChunksColl();
          self.chunksByDoc.set(id, c);
        }
        return c;
      },
    };
  }
  where(field: string, op: string, value: unknown): FakeQuery {
    return new FakeQuery(this.docs, [[field, op, value]]);
  }
  limit(n: number): FakeQuery {
    return new FakeQuery(this.docs, [], n);
  }
}

class FakeTenantsCollection {
  byTenant = new Map<string, FakeDocsCollection>();
  doc(tenantId: string) {
    const self = this;
    return {
      collection(name: string) {
        if (name !== "docs") throw new Error(`unexpected sub-collection: ${name}`);
        let c = self.byTenant.get(tenantId);
        if (!c) {
          c = new FakeDocsCollection();
          self.byTenant.set(tenantId, c);
        }
        return c;
      },
    };
  }
}

class FakeDb {
  knowledgeDocs = new FakeTenantsCollection();
  collection(name: string): FakeTenantsCollection {
    if (name !== "knowledge_docs") throw new Error(`unexpected collection: ${name}`);
    return this.knowledgeDocs;
  }
  // Convenience seed for tests
  seedDoc(clientId: string, docId: string, title: string, chunks: Array<{ text: string; embedding: number[] }>) {
    const tenant = this.knowledgeDocs.byTenant.get(clientId) ?? new FakeDocsCollection();
    this.knowledgeDocs.byTenant.set(clientId, tenant);
    tenant.setDoc(docId, { clientId, title, status: "indexed", chunkCount: chunks.length });
    const chunksColl = tenant.doc(docId).collection("chunks") as FakeChunksColl;
    for (let i = 0; i < chunks.length; i++) {
      chunksColl.add({ docId, index: i, text: chunks[i].text, embedding: chunks[i].embedding });
    }
  }
}

// ─── Embedding mock ──────────────────────────────────────────────────────────
// Stub global fetch so embedQuery returns a deterministic vector. The chunks we
// seed below use vectors crafted so we know exactly which ones should rank
// highest for a given query.

function mockEmbeddingFetch(queryVector: number[]) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    return {
      ok: true,
      statusText: "OK",
      json: async () => ({ embeddings: [{ values: queryVector }] }),
    } as unknown as Response;
  }) as typeof fetch;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("chunkText", () => {
  test("returns empty array on empty input", () => {
    assert.deepEqual(chunkText(""), []);
    assert.deepEqual(chunkText("   "), []);
  });

  test("returns a single chunk when below target", () => {
    const out = chunkText("a short paragraph that fits in one window.");
    assert.equal(out.length, 1);
    assert.equal(out[0].charStart, 0);
    assert.ok(out[0].charEnd > 0);
  });

  test("splits a long string with overlap", () => {
    const para = "Sentence one. Sentence two. Sentence three. ".repeat(200);
    const out = chunkText(para, { target: 500, overlap: 50 });
    assert.ok(out.length > 1, "expected multiple chunks");
    for (const c of out) {
      assert.ok(c.text.length > 0);
      assert.ok(c.text.length <= 1000, `chunk too large: ${c.text.length}`);
    }
    // First chunk starts at 0
    assert.equal(out[0].charStart, 0);
    // Subsequent chunk should overlap the previous by at most overlap chars
    for (let i = 1; i < out.length; i++) {
      assert.ok(out[i].charStart < out[i - 1].charEnd, "expected overlap");
    }
  });
});

describe("cosineSimilarity", () => {
  test("identical vectors → 1", () => {
    assert.ok(Math.abs(cosineSimilarity([1, 0, 1], [1, 0, 1]) - 1) < 1e-9);
  });
  test("orthogonal vectors → 0", () => {
    assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  });
  test("zero vector → 0", () => {
    assert.equal(cosineSimilarity([0, 0], [1, 1]), 0);
  });
});

describe("formatContextBlock", () => {
  test("empty list → empty string", () => {
    assert.equal(formatContextBlock([]), "");
  });
  test("non-empty list → labelled block", () => {
    const out = formatContextBlock([
      { docId: "d1", docTitle: "Manual", text: "the answer is 42", similarity: 0.91 },
    ]);
    assert.ok(out.includes("BUSINESS KNOWLEDGE BASE"));
    assert.ok(out.includes("Manual"));
    assert.ok(out.includes("0.91"));
    assert.ok(out.includes("the answer is 42"));
  });
});

describe("retrieveContext — TENANT ISOLATION", () => {
  test("only returns chunks belonging to the queried clientId", async () => {
    const db = new FakeDb();
    const queryVec = [1, 0, 0];

    // Tenant A has a doc with chunks ranked high against the query
    db.seedDoc("tenant_a", "doc_a1", "Tenant A — pricing policy", [
      { text: "TENANT A SECRET: prices were raised 5% this quarter.", embedding: [1, 0, 0] },
      { text: "Tenant A unrelated noise.", embedding: [0, 1, 0] },
    ]);

    // Tenant B has chunks that would rank even HIGHER but must never appear
    db.seedDoc("tenant_b", "doc_b1", "Tenant B — confidential", [
      { text: "TENANT B SECRET: about to launch a competing brand.", embedding: [1, 0, 0] },
      { text: "Tenant B unrelated noise.", embedding: [0, 0, 1] },
    ]);

    const restore = mockEmbeddingFetch(queryVec);
    try {
      const hitsA = await retrieveContext(db as any, "stubKey", "tenant_a", "what's the pricing?");
      assert.ok(hitsA.length > 0, "expected at least one hit for tenant_a");
      for (const h of hitsA) {
        assert.ok(!h.text.includes("TENANT B"), `LEAK: tenant_a query returned tenant_b chunk: ${h.text}`);
        assert.equal(h.docTitle, "Tenant A — pricing policy");
      }

      const hitsB = await retrieveContext(db as any, "stubKey", "tenant_b", "what's the pricing?");
      assert.ok(hitsB.length > 0, "expected at least one hit for tenant_b");
      for (const h of hitsB) {
        assert.ok(!h.text.includes("TENANT A"), `LEAK: tenant_b query returned tenant_a chunk: ${h.text}`);
        assert.equal(h.docTitle, "Tenant B — confidential");
      }
    } finally {
      restore();
    }
  });

  test("returns empty array when tenant has no docs", async () => {
    const db = new FakeDb();
    db.seedDoc("tenant_with_docs", "doc_1", "Has docs", [
      { text: "some content", embedding: [1, 0, 0] },
    ]);
    const restore = mockEmbeddingFetch([1, 0, 0]);
    try {
      const hits = await retrieveContext(db as any, "stubKey", "empty_tenant", "anything");
      assert.deepEqual(hits, []);
    } finally {
      restore();
    }
  });

  test("filters out chunks below minSimilarity threshold", async () => {
    const db = new FakeDb();
    db.seedDoc("tenant_a", "doc_a", "A", [
      { text: "highly relevant", embedding: [1, 0, 0] },
      { text: "irrelevant", embedding: [0, 0, 1] },
    ]);
    const restore = mockEmbeddingFetch([1, 0, 0]);
    try {
      const hits = await retrieveContext(db as any, "stubKey", "tenant_a", "find me something");
      assert.ok(hits.every((h) => h.similarity >= MIN_SIMILARITY));
      assert.ok(hits.some((h) => h.text.includes("highly relevant")));
      assert.ok(!hits.some((h) => h.text.includes("irrelevant")));
    } finally {
      restore();
    }
  });

  test("skips docs with status !== 'indexed'", async () => {
    const db = new FakeDb();
    // Manually seed a processing doc — it should NOT be queried.
    const tenant = new FakeDocsCollection();
    db.knowledgeDocs.byTenant.set("tenant_a", tenant);
    tenant.setDoc("processing_doc", { clientId: "tenant_a", title: "Still indexing", status: "processing" });
    tenant.doc("processing_doc").collection("chunks");
    const procChunks = tenant.chunksByDoc.get("processing_doc")!;
    procChunks.add({ docId: "processing_doc", index: 0, text: "should not appear", embedding: [1, 0, 0] });

    const restore = mockEmbeddingFetch([1, 0, 0]);
    try {
      const hits = await retrieveContext(db as any, "stubKey", "tenant_a", "anything");
      assert.deepEqual(hits, []);
    } finally {
      restore();
    }
  });
});
