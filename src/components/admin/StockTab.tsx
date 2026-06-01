import React, { useEffect, useState, useId } from "react";
import { Package, Plus, Minus, Search, AlertTriangle, History, Trash2, X, RotateCw } from "lucide-react";
import {
  StockItem, StockMovement, StockUnit,
  subscribeItems, addItem, updateItem, adjustQuantity, subscribeMovements, deleteItem,
} from "../../services/stock";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { useModalA11y } from "../../hooks/useModalA11y";
import { useToast } from "../ui/Toast";

const UNITS: StockUnit[] = ["unidades", "ml", "gr", "oz", "kg", "litros"];

export function StockTab() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [adjustModal, setAdjustModal] = useState<{ item: StockItem; mode: "add" | "deduct" } | null>(null);
  const [historyItem, setHistoryItem] = useState<StockItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const t = localeConfig.admin.stock;
  const toast = useToast();

  useEffect(() => {
    const unsub = subscribeItems(setItems);
    return () => unsub();
  }, []);

  const lowStockItems = items.filter(i => i.quantity <= i.minStock && i.minStock > 0);
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];

  const filtered = items.filter(i => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter && i.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-accent" />
          <h2 className="text-lg font-bold text-foreground">{t.title}</h2>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            {items.length}
          </span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90"
        >
          <Plus size={14} />
          {t.addItem}
        </button>
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-yellow-500" />
          <div>
            <p className="text-xs font-semibold text-yellow-400">{t.lowStock}</p>
            <p className="mt-0.5 text-[11px] text-yellow-300/80">
              {lowStockItems.map(i => `${i.name} (${i.quantity}/${i.minStock})`).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.search}
            className="w-full rounded-lg border border-border bg-card py-2 ps-9 pe-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
          />
        </div>
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
          >
            <option value="">{t.allCategories}</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Items List */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <Package size={32} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{t.noItems}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={() => setEditingItem(item)}
              onAdjust={(mode) => setAdjustModal({ item, mode })}
              onHistory={() => setHistoryItem(item)}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <ItemFormModal
          onClose={() => setShowAddModal(false)}
          onSave={async (data) => { await addItem(data, t.initialMovementReason); setShowAddModal(false); }}
          t={t}
        />
      )}
      {editingItem && (
        <ItemFormModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={async (data) => { await updateItem(editingItem.id, data); setEditingItem(null); }}
          onDelete={async () => setShowDeleteConfirm(true)}
          t={t}
        />
      )}
      {showDeleteConfirm && editingItem && (
        <ConfirmDeleteModal
          title={t.deleteConfirmTitle ?? "Delete product?"}
          body={t.deleteConfirm}
          confirmLabel={t.deleteConfirmOk ?? "Delete"}
          cancelLabel={t.deleteConfirmCancel ?? "Cancel"}
          onConfirm={async () => {
            const id = editingItem.id;
            setShowDeleteConfirm(false);
            try {
              await deleteItem(id);
              setEditingItem(null);
            } catch {
              toast.error(t.saveError ?? "Error deleting.");
            }
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      {adjustModal && (
        <AdjustModal
          item={adjustModal.item}
          mode={adjustModal.mode}
          onClose={() => setAdjustModal(null)}
          t={t}
        />
      )}
      {historyItem && (
        <HistoryModal
          item={historyItem}
          onClose={() => setHistoryItem(null)}
          t={t}
        />
      )}
    </div>
  );
}

function ItemCard({
  item, onEdit, onAdjust, onHistory, t,
}: {
  item: StockItem;
  onEdit: () => void;
  onAdjust: (mode: "add" | "deduct") => void;
  onHistory: () => void;
  t: typeof localeConfig.admin.stock;
}) {
  const isLow = item.minStock > 0 && item.quantity <= item.minStock;

  return (
    <div className={`rounded-xl border p-3 transition-colors ${isLow ? "border-yellow-500/40 bg-yellow-500/5" : "border-border bg-card"}`}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="truncate text-sm font-semibold text-foreground hover:text-accent">
              {item.name}
            </button>
            {item.category && (
              <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                {item.category}
              </span>
            )}
          </div>
          {item.notes && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.notes}</p>}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onAdjust("deduct")}
            className="rounded-md border border-border p-1.5 text-muted-foreground hover:border-red-400 hover:text-red-400"
          >
            <Minus size={12} />
          </button>
          <div className="min-w-[60px] text-center">
            <span className={`text-sm font-bold ${isLow ? "text-yellow-400" : "text-foreground"}`}>
              {item.quantity}
            </span>
            <span className="ml-1 text-[10px] text-muted-foreground">{(t.unitLabels as Record<string, string>)[item.unit] ?? item.unit}</span>
          </div>
          <button
            onClick={() => onAdjust("add")}
            className="rounded-md border border-border p-1.5 text-muted-foreground hover:border-green-400 hover:text-green-400"
          >
            <Plus size={12} />
          </button>
        </div>

        <button
          onClick={onHistory}
          className="rounded-md border border-border p-1.5 text-muted-foreground hover:border-accent hover:text-accent"
          title={t.history}
        >
          <History size={12} />
        </button>
      </div>
    </div>
  );
}

function ItemFormModal({
  item, onClose, onSave, onDelete, t,
}: {
  item?: StockItem;
  onClose: () => void;
  onSave: (data: Omit<StockItem, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onDelete?: () => Promise<void>;
  t: typeof localeConfig.admin.stock;
}) {
  const modalRef = useModalA11y(true, onClose);
  const datalistId = useId();
  const [name, setName] = useState(item?.name || "");
  const [category, setCategory] = useState(item?.category || "");
  const [quantity, setQuantity] = useState(item?.quantity ?? 0);
  const [unit, setUnit] = useState<StockUnit>(item?.unit || "unidades");
  const [minStock, setMinStock] = useState(item?.minStock ?? 0);
  const [notes, setNotes] = useState(item?.notes || "");
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), category, quantity, unit, minStock, notes });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveError);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submit();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div ref={modalRef} tabIndex={-1} className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-xl outline-none" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">{item ? t.editItem : t.addItem}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3" role="alert">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-500" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-red-400">{t.saveError}</p>
              <p className="mt-0.5 break-words text-[10px] text-red-300/80">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-red-500/40 px-2 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-500/15 disabled:opacity-50"
            >
              <RotateCw size={10} />
              {t.retry}
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{t.name}</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{t.category}</label>
              <input value={category} onChange={e => setCategory(e.target.value)} list={datalistId}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none" />
              <datalist id={datalistId}>
                {(t.categoryPresets as readonly string[]).map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{t.unit}</label>
              <select value={unit} onChange={e => setUnit(e.target.value as StockUnit)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none">
                {UNITS.map(u => <option key={u} value={u}>{(t.unitLabels as Record<string, string>)[u] ?? u}</option>)}
              </select>
            </div>
          </div>
          {!item && (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{t.quantity}</label>
              <input type="number" min={0} value={quantity} onChange={e => setQuantity(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none" />
            </div>
          )}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{t.minStock}</label>
            <input type="number" min={0} value={minStock} onChange={e => setMinStock(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{t.notes}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button type="submit" disabled={busy || !name.trim()}
              className="flex-1 rounded-lg bg-accent py-2 text-xs font-semibold text-white hover:bg-accent/90 disabled:opacity-50">
              {t.save}
            </button>
            {item && onDelete && (
              <button type="button" onClick={onDelete}
                className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function AdjustModal({
  item, mode, onClose, t,
}: {
  item: StockItem;
  mode: "add" | "deduct";
  onClose: () => void;
  t: typeof localeConfig.admin.stock;
}) {
  const modalRef = useModalA11y(true, onClose);
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const newTotal = mode === "add" ? item.quantity + qty : Math.max(0, item.quantity - qty);

  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (qty <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const delta = mode === "add" ? qty : -qty;
      await adjustQuantity(item.id, delta, reason, siteConfig.adminEmail || "admin");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.adjustError);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submit();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div ref={modalRef} tabIndex={-1} className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-xl outline-none" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">
            {mode === "add" ? t.add : t.deduct}: {item.name}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3" role="alert">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-500" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-red-400">{t.adjustError}</p>
              <p className="mt-0.5 break-words text-[10px] text-red-300/80">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-red-500/40 px-2 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-500/15 disabled:opacity-50"
            >
              <RotateCw size={10} />
              {t.retry}
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{t.quantity}</label>
            <input type="number" min={1} value={qty} onChange={e => setQty(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{t.reason}</label>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder={t.optional}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none" />
          </div>
          <div className="rounded-lg bg-card/50 p-3 text-center">
            <span className="text-[11px] text-muted-foreground">{t.newTotal} </span>
            <span className={`text-sm font-bold ${newTotal <= item.minStock && item.minStock > 0 ? "text-yellow-400" : "text-foreground"}`}>
              {newTotal} {(t.unitLabels as Record<string, string>)[item.unit] ?? item.unit}
            </span>
          </div>
          <button type="submit" disabled={busy || qty <= 0}
            className={`w-full rounded-lg py-2 text-xs font-semibold text-white disabled:opacity-50 ${mode === "add" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
            {mode === "add" ? `+ ${t.add} ${qty}` : `- ${t.deduct} ${qty}`}
          </button>
        </form>
      </div>
    </div>
  );
}

function HistoryModal({
  item, onClose, t,
}: {
  item: StockItem;
  onClose: () => void;
  t: typeof localeConfig.admin.stock;
}) {
  const [movements, setMovements] = useState<StockMovement[]>([]);

  useEffect(() => {
    const unsub = subscribeMovements(item.id, setMovements);
    return () => unsub();
  }, [item.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">{t.history}: {item.name}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        {movements.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{t.noMovements}</p>
        ) : (
          <div className="max-h-[300px] space-y-2 overflow-y-auto">
            {movements.map(m => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 p-2.5">
                <span className={`rounded-full p-1 ${m.type === "add" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                  {m.type === "add" ? <Plus size={10} /> : <Minus size={10} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-foreground">
                    {m.type === "add" ? "+" : "-"}{m.quantity} {(t.unitLabels as Record<string, string>)[item.unit] ?? item.unit}
                    <span className="ml-1 text-muted-foreground">({m.previousQuantity} → {m.type === "add" ? m.previousQuantity + m.quantity : m.previousQuantity - m.quantity})</span>
                  </p>
                  {m.reason && <p className="truncate text-[10px] text-muted-foreground">{m.reason}</p>}
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {m.createdAt.toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
  useEffect(() => {
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
