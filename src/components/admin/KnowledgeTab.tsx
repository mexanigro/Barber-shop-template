import React from "react";
import {
  BookOpen,
  Upload,
  ClipboardPaste,
  Trash2,
  Loader2,
  FileText,
  FileSpreadsheet,
  FileType2,
  Hash,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Eye,
} from "lucide-react";
import { auth as firebaseAuth } from "../../lib/firebase";
import { localeConfig } from "../../config/locale";
import { TOUR_CONFIG } from "../../config/tour.config";
import { cn } from "../../lib/utils";

type ContentType = "pdf" | "txt" | "md" | "csv" | "manual";
type DocStatus = "processing" | "indexed" | "failed";

interface KnowledgeDocSummary {
  id: string;
  title: string;
  contentType: ContentType;
  source: string;
  rawTextChars: number;
  chunkCount: number;
  status: DocStatus;
  errorReason?: string;
  uploadedBy: string;
  createdAt: string | null;
}

interface ListResponse {
  docs: KnowledgeDocSummary[];
  counts: { docs: number; maxDocs: number; totalBytes: number; maxBytes: number };
}

const DEMO_DOCS: KnowledgeDocSummary[] = [
  {
    id: "demo-doc-1",
    title: "Manual de productos demo",
    contentType: "pdf",
    source: "upload",
    rawTextChars: 18420,
    chunkCount: 12,
    status: "indexed",
    uploadedBy: "demo@arzac.studio",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: "demo-doc-2",
    title: "Política de cancelación demo",
    contentType: "md",
    source: "manual-paste",
    rawTextChars: 1850,
    chunkCount: 2,
    status: "indexed",
    uploadedBy: "demo@arzac.studio",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
  {
    id: "demo-doc-3",
    title: "FAQ frecuentes demo",
    contentType: "txt",
    source: "upload",
    rawTextChars: 4220,
    chunkCount: 4,
    status: "indexed",
    uploadedBy: "demo@arzac.studio",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
  },
];

async function getAdminAuthHeader(): Promise<Record<string, string>> {
  try {
    const user = firebaseAuth?.currentUser;
    if (!user) return {};
    const token = await user.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "—";
  }
}

function readFileAsBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read_failed"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const commaIdx = result.indexOf(",");
      const base64 = commaIdx >= 0 ? result.slice(commaIdx + 1) : result;
      const mimeMatch = /^data:([^;]+);base64/.exec(result);
      resolve({ base64, mimeType: mimeMatch?.[1] || file.type || "application/octet-stream" });
    };
    reader.readAsDataURL(file);
  });
}

function ContentTypeIcon({ type }: { type: ContentType }) {
  const Icon = type === "pdf" ? FileText
    : type === "csv" ? FileSpreadsheet
    : type === "md" ? FileType2
    : Hash;
  return <Icon size={14} className="text-muted-foreground" />;
}

function StatusBadge({ status, error, t }: { status: DocStatus; error?: string; t: typeof localeConfig.admin.knowledge }) {
  if (status === "indexed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
        <CheckCircle2 size={10} />
        {t.statusIndexed}
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500">
        <Clock size={10} className="animate-pulse" />
        {t.statusProcessing}
      </span>
    );
  }
  return (
    <span
      title={error}
      className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500"
    >
      <AlertCircle size={10} />
      {t.statusFailed}
    </span>
  );
}

export function KnowledgeTab() {
  const t = localeConfig.admin.knowledge;
  const [docs, setDocs] = React.useState<KnowledgeDocSummary[]>([]);
  const [counts, setCounts] = React.useState<ListResponse["counts"]>({ docs: 0, maxDocs: 50, totalBytes: 0, maxBytes: 10 * 1024 * 1024 });
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [pasteOpen, setPasteOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState<KnowledgeDocSummary | null>(null);

  const [banner, setBanner] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<KnowledgeDocSummary | null>(null);

  const refresh = React.useCallback(() => setRefreshKey((k) => k + 1), []);

  // Load docs
  React.useEffect(() => {
    let cancelled = false;
    if (TOUR_CONFIG.isDemoMode) {
      setDocs(DEMO_DOCS);
      const totalBytes = DEMO_DOCS.reduce((a, d) => a + d.rawTextChars, 0);
      setCounts({ docs: DEMO_DOCS.length, maxDocs: 50, totalBytes, maxBytes: 10 * 1024 * 1024 });
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const headers = await getAdminAuthHeader();
        const res = await fetch("/api/knowledge/list", { headers });
        if (!res.ok) {
          if (!cancelled) setBanner({ tone: "error", text: t.errorList });
          return;
        }
        const data = (await res.json()) as ListResponse;
        if (cancelled) return;
        setDocs(data.docs);
        setCounts(data.counts);
      } catch {
        if (!cancelled) setBanner({ tone: "error", text: t.errorList });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey, t.errorList]);

  React.useEffect(() => {
    if (!banner) return;
    const id = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(id);
  }, [banner]);

  const onUploaded = React.useCallback((msg: string) => {
    setBanner({ tone: "ok", text: msg });
    refresh();
  }, [refresh]);

  const handleDelete = async (doc: KnowledgeDocSummary) => {
    setPendingDelete(doc);
  };

  const handleConfirmDelete = async () => {
    const doc = pendingDelete;
    if (!doc) return;
    setPendingDelete(null);
    if (TOUR_CONFIG.isDemoMode) {
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      setBanner({ tone: "ok", text: t.deleteOk });
      return;
    }
    try {
      const headers = await getAdminAuthHeader();
      const res = await fetch(`/api/knowledge/${encodeURIComponent(doc.id)}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error(String(res.status));
      setBanner({ tone: "ok", text: t.deleteOk });
      refresh();
    } catch {
      setBanner({ tone: "error", text: t.deleteError });
    }
  };

  const docsPct = Math.min(100, (counts.docs / counts.maxDocs) * 100);
  const bytesPct = Math.min(100, (counts.totalBytes / counts.maxBytes) * 100);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">{t.title}</h3>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-accent-light px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-950 shadow-lg shadow-accent-light/20 transition hover:shadow-xl hover:shadow-accent-light/30"
          >
            <Upload size={13} />
            {t.uploadFile}
          </button>
          <button
            type="button"
            onClick={() => setPasteOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/80 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-foreground transition hover:border-accent-light/40 hover:bg-accent-light/5"
          >
            <ClipboardPaste size={13} />
            {t.pasteText}
          </button>
        </div>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card/80 px-4 py-3">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <span>{t.docsCount}</span>
            <span>{counts.docs} / {counts.maxDocs}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", docsPct >= 90 ? "bg-red-500" : "bg-accent-light")}
              style={{ width: `${docsPct}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card/80 px-4 py-3">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <span>{t.totalSize}</span>
            <span>{fmtBytes(counts.totalBytes)} / {fmtBytes(counts.maxBytes)}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", bytesPct >= 90 ? "bg-red-500" : "bg-accent-light")}
              style={{ width: `${bytesPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Banner */}
      {banner && (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-[11px] font-bold",
            banner.tone === "ok"
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-500"
              : "border-red-500/30 bg-red-500/5 text-red-500",
          )}
        >
          {banner.text}
        </div>
      )}

      {/* List */}
      <div className="rounded-2xl border border-border bg-card/80 backdrop-blur">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <BookOpen size={32} className="mb-4 text-muted-foreground/30" />
            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{t.empty}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {docs.map((doc) => (
              <li key={doc.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <ContentTypeIcon type={doc.contentType} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-foreground" title={doc.title}>{doc.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                      <span className="font-bold uppercase tracking-widest">{doc.contentType}</span>
                      <span>•</span>
                      <span>{doc.chunkCount} {t.chunks}</span>
                      <span>•</span>
                      <span>{fmtBytes(doc.rawTextChars)}</span>
                      <span>•</span>
                      <span>{fmtDate(doc.createdAt)}</span>
                      {doc.uploadedBy && (
                        <>
                          <span>•</span>
                          <span className="truncate">{doc.uploadedBy}</span>
                        </>
                      )}
                    </div>
                    {doc.status === "failed" && doc.errorReason && (
                      <p className="mt-1 text-[10px] text-red-500">{doc.errorReason}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={doc.status} error={doc.errorReason} t={t} />
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(doc)}
                    className="rounded-lg border border-border bg-card px-2 py-1.5 text-muted-foreground transition hover:border-accent-light/40 hover:text-foreground"
                    title={t.preview}
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    className="rounded-lg border border-border bg-card px-2 py-1.5 text-muted-foreground transition hover:border-red-500/40 hover:text-red-500"
                    title={t.delete}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onUploaded={onUploaded}
          t={t}
        />
      )}
      {pasteOpen && (
        <PasteModal
          onClose={() => setPasteOpen(false)}
          onUploaded={onUploaded}
          t={t}
        />
      )}
      {previewOpen && (
        <PreviewModal
          doc={previewOpen}
          onClose={() => setPreviewOpen(null)}
          t={t}
        />
      )}
      {pendingDelete && (
        <ConfirmDeleteModal
          title={t.confirmDeleteTitle ?? "Delete document?"}
          body={t.confirmDelete.replace("{title}", pendingDelete.title)}
          confirmLabel={t.confirmDeleteOk ?? "Delete"}
          cancelLabel={t.confirmDeleteCancel ?? "Cancel"}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────── Upload modal ──

function UploadModal({
  onClose,
  onUploaded,
  t,
}: {
  onClose: () => void;
  onUploaded: (msg: string) => void;
  t: typeof localeConfig.admin.knowledge;
}) {
  const [title, setTitle] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [progress, setProgress] = React.useState<"idle" | "reading" | "uploading" | "done">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const ACCEPTED = ["text/plain", "text/markdown", "text/csv", "application/pdf"];
  const ACCEPTED_EXT = [".txt", ".md", ".csv", ".pdf"];

  const validateFile = (f: File): string | null => {
    if (f.size > 10 * 1024 * 1024) return t.errorFileTooLarge;
    const ok = ACCEPTED.includes(f.type) || ACCEPTED_EXT.some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!ok) return t.errorUnsupportedType;
    return null;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    const err = validateFile(f);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const submit = async () => {
    if (!file || !title.trim()) return;
    setError(null);
    setProgress("reading");

    if (TOUR_CONFIG.isDemoMode) {
      await new Promise((r) => setTimeout(r, 600));
      onUploaded(t.uploadOk);
      onClose();
      return;
    }

    try {
      const { base64, mimeType } = await readFileAsBase64(file);
      setProgress("uploading");
      const headers = await getAdminAuthHeader();
      const res = await fetch("/api/knowledge/upload", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          filename: file.name,
          mimeType,
          base64,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setProgress("done");
      onUploaded(t.uploadOk);
      onClose();
    } catch (err) {
      setProgress("idle");
      setError(err instanceof Error ? err.message : t.uploadError);
    }
  };

  return (
    <ModalShell onClose={onClose} title={t.uploadModalTitle}>
      <div className="space-y-4">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t.titleLabel}</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.titlePlaceholder}
            maxLength={200}
            className="mt-1.5 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-accent-light/60 focus:outline-none"
          />
        </label>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
            dragOver ? "border-accent-light bg-accent-light/5" : "border-border bg-background/40",
          )}
        >
          <Upload size={22} className="text-muted-foreground/60" />
          {file ? (
            <>
              <p className="text-xs font-bold text-foreground">{file.name}</p>
              <p className="text-[10px] text-muted-foreground">{fmtBytes(file.size)}</p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold text-foreground">{t.dropHere}</p>
              <p className="text-[10px] text-muted-foreground">{t.acceptedTypes}</p>
            </>
          )}
          <label className="mt-2 cursor-pointer rounded-xl border border-border bg-card px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-foreground transition hover:border-accent-light/40">
            {t.pickFile}
            <input
              type="file"
              className="hidden"
              accept={ACCEPTED_EXT.join(",")}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        </div>

        {progress !== "idle" && progress !== "done" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Loader2 size={12} className="animate-spin text-accent-light" />
              <span>{progress === "reading" ? t.reading : t.uploading}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full bg-accent-light transition-all", progress === "reading" ? "w-1/3" : "w-2/3 animate-pulse")} />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-[11px] text-red-500">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={progress === "reading" || progress === "uploading"}
            className="rounded-xl border border-border px-4 py-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!file || !title.trim() || progress === "reading" || progress === "uploading"}
            className={cn(
              "rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest transition",
              !file || !title.trim() || progress === "reading" || progress === "uploading"
                ? "cursor-not-allowed bg-muted text-muted-foreground/50"
                : "bg-accent-light text-zinc-950 shadow-lg shadow-accent-light/20 hover:shadow-xl hover:shadow-accent-light/30",
            )}
          >
            {t.upload}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ──────────────────────────────────────────────────────────── Paste modal ──

function PasteModal({
  onClose,
  onUploaded,
  t,
}: {
  onClose: () => void;
  onUploaded: (msg: string) => void;
  t: typeof localeConfig.admin.knowledge;
}) {
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    if (!title.trim() || content.trim().length < 10) return;
    setError(null);
    setSubmitting(true);

    if (TOUR_CONFIG.isDemoMode) {
      await new Promise((r) => setTimeout(r, 500));
      onUploaded(t.uploadOk);
      onClose();
      return;
    }

    try {
      const headers = await getAdminAuthHeader();
      const res = await fetch("/api/knowledge/upload", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      onUploaded(t.uploadOk);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.uploadError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title={t.pasteModalTitle}>
      <div className="space-y-4">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t.titleLabel}</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.titlePlaceholder}
            maxLength={200}
            className="mt-1.5 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-accent-light/60 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t.contentLabel}</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t.contentPlaceholder}
            rows={10}
            className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background/60 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-accent-light/60 focus:outline-none"
          />
          <p className="mt-1 text-[10px] text-muted-foreground/60">{content.length.toLocaleString()} {t.chars}</p>
        </label>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-[11px] text-red-500">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-border px-4 py-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !title.trim() || content.trim().length < 10}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest transition",
              submitting || !title.trim() || content.trim().length < 10
                ? "cursor-not-allowed bg-muted text-muted-foreground/50"
                : "bg-accent-light text-zinc-950 shadow-lg shadow-accent-light/20 hover:shadow-xl hover:shadow-accent-light/30",
            )}
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            {t.save}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ────────────────────────────────────────────────────────── Preview modal ──

interface PreviewChunk { index: number; text: string }

function PreviewModal({
  doc,
  onClose,
  t,
}: {
  doc: KnowledgeDocSummary;
  onClose: () => void;
  t: typeof localeConfig.admin.knowledge;
}) {
  const [chunks, setChunks] = React.useState<PreviewChunk[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (TOUR_CONFIG.isDemoMode) {
        await new Promise((r) => setTimeout(r, 200));
        if (cancelled) return;
        setChunks([
          { index: 0, text: `[Demo preview for "${doc.title}"] — primer fragmento del documento. La IA del CRM usa estos pasajes para responder preguntas específicas sobre tu negocio.` },
          { index: 1, text: "Segundo fragmento — políticas, productos o cualquier contenido que el dueño haya subido al RAG privado." },
        ]);
        setLoading(false);
        return;
      }
      try {
        const headers = await getAdminAuthHeader();
        const res = await fetch(`/api/knowledge/preview/${encodeURIComponent(doc.id)}`, { headers });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json() as { chunks: PreviewChunk[] };
        if (!cancelled) setChunks(data.chunks ?? []);
      } catch {
        if (!cancelled) setError(t.previewError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [doc.id, doc.title, t.previewError]);

  return (
    <ModalShell onClose={onClose} title={doc.title}>
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t.previewSubtitle}</p>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-[11px] text-red-500">{error}</div>
        ) : chunks && chunks.length > 0 ? (
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {chunks.map((c) => (
              <li key={c.index} className="rounded-xl border border-border bg-background/40 px-3 py-2">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">#{c.index + 1}</p>
                <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/80">{c.text}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-muted-foreground">{t.previewEmpty}</p>
        )}
      </div>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────────── shell ──

function ModalShell({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="truncate text-sm font-black tracking-tight text-foreground">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────── Confirm-delete modal ──

function ConfirmDeleteModal({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
          <Trash2 size={20} className="text-red-500" />
        </div>
        <h3 className="mb-2 text-sm font-black uppercase tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{body}</p>
        <div className="flex gap-3">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border bg-muted/60 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all hover:text-foreground active:scale-[0.97]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-500/20 active:scale-[0.97]"
          >
            <Trash2 size={11} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
