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
      {/* CRM-03 diseño: controles de 44 px, textos de 13 px o más, «נמוך» dicho con palabras */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground"><span className="font-semibold tabular-nums text-foreground">{items.length}</span> מוצרים</p>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          <Plus size={18} aria-hidden />
          {t.addItem}
        </button>
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-amber-600/40 bg-amber-500/10 p-3">
          <AlertTriangle size={18} aria-hidden className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{t.lowStock} · {lowStockItems.length}</p>
            <p className="mt-0.5 text-sm text-amber-900 dark:text-amber-200">
              {lowStockItems.map(i => `${i.name}: נשארו ${i.quantity}, מינימום ${i.minStock}`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1">
          <Search size={18} aria-hidden className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="חיפוש מוצר"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.search}
            className="h-11 w-full rounded-xl border border-border bg-card ps-10 pe-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        </div>
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            aria-label={t.category}
            className="h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <option value="">{t.allCategories}</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Items List */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <Package size={32} aria-hidden className="mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t.noItems}</p>
        </div>
      ) : (
        <ul className="space-y-2">
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
        </ul>
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
  const unidad = (t.unitLabels as Record<string, string>)[item.unit] ?? item.unit;
  const boton = "flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-muted";

  return (
    <li className={`rounded-2xl border p-4 ${isLow ? "border-amber-600/40 bg-amber-500/5" : "border-border bg-card"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button onClick={onEdit} className="flex min-h-11 items-center text-start text-base font-semibold text-foreground hover:underline focus-visible:underline">
            {item.name}<span className="sr-only"> — עריכה</span>
          </button>
          <p className="text-sm text-muted-foreground">{[item.category, item.notes].filter(Boolean).join(" · ")}</p>
        </div>
        <button onClick={onHistory} aria-label={`${t.history}: ${item.name}`} className={boton}>
          <History size={18} aria-hidden />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="min-w-0">
          <span className="text-2xl font-semibold tabular-nums text-foreground">{item.quantity}</span>
          <span className="ms-1.5 text-sm text-muted-foreground">{unidad}</span>
          {isLow && <span className="ms-2 inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:text-amber-200">{t.lowStock} · מינימום {item.minStock}</span>}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={() => onAdjust("deduct")} aria-label={t.deduct} className={boton}><Minus size={18} aria-hidden /></button>
          <button onClick={() => onAdjust("add")} aria-label={t.add} className={boton}><Plus size={18} aria-hidden /></button>
        </div>
      </div>
    </li>
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
  const fid = useId();
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
          <h3 className="text-lg font-bold text-foreground">{item ? t.editItem : t.addItem}</h3>
          <button type="button" onClick={onClose} aria-label="סגירה" className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"><X size={20} aria-hidden /></button>
        </div>
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3" role="alert">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">{t.saveError}</p>
              <p className="mt-0.5 break-words text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-red-600/40 px-3 text-sm font-semibold text-red-700 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-300"
            >
              <RotateCw size={10} />
              {t.retry}
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor={`${fid}-name`} className="mb-1.5 block text-sm font-medium text-foreground">{t.name}</label>
            <input id={`${fid}-name`} value={name} onChange={e => setName(e.target.value)} required
              className="min-h-12 w-full rounded-xl border border-border bg-background px-3 py-2 text-base text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${fid}-category`} className="mb-1.5 block text-sm font-medium text-foreground">{t.category}</label>
              <input id={`${fid}-category`} value={category} onChange={e => setCategory(e.target.value)} list={datalistId}
                className="min-h-12 w-full rounded-xl border border-border bg-background px-3 py-2 text-base text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
              <datalist id={datalistId}>
                {(t.categoryPresets as readonly string[]).map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label htmlFor={`${fid}-unit`} className="mb-1.5 block text-sm font-medium text-foreground">{t.unit}</label>
              <select id={`${fid}-unit`} value={unit} onChange={e => setUnit(e.target.value as StockUnit)}
                className="min-h-12 w-full rounded-xl border border-border bg-background px-3 py-2 text-base text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                {UNITS.map(u => <option key={u} value={u}>{(t.unitLabels as Record<string, string>)[u] ?? u}</option>)}
              </select>
            </div>
          </div>
          {!item && (
            <div>
              <label htmlFor={`${fid}-quantity`} className="mb-1.5 block text-sm font-medium text-foreground">{t.quantity}</label>
              <input id={`${fid}-quantity`} type="number" min={0} value={quantity} onChange={e => setQuantity(Number(e.target.value))}
                className="min-h-12 w-full rounded-xl border border-border bg-background px-3 py-2 text-base text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
            </div>
          )}
          <div>
            <label htmlFor={`${fid}-minStock`} className="mb-1.5 block text-sm font-medium text-foreground">{t.minStock}</label>
            <input id={`${fid}-minStock`} type="number" min={0} value={minStock} onChange={e => setMinStock(Number(e.target.value))}
              className="min-h-12 w-full rounded-xl border border-border bg-background px-3 py-2 text-base text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
          </div>
          <div>
            <label htmlFor={`${fid}-notes`} className="mb-1.5 block text-sm font-medium text-foreground">{t.notes}</label>
            <textarea id={`${fid}-notes`} value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="min-h-12 w-full rounded-xl border border-border bg-background px-3 py-2 text-base text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button type="submit" disabled={busy || !name.trim()}
              className="h-12 flex-1 rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50">
              {t.save}
            </button>
            {item && onDelete && (
              <button type="button" onClick={onDelete} aria-label="מחיקת המוצר"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-600/40 text-red-700 hover:bg-red-500/10 dark:text-red-300">
                <Trash2 size={18} aria-hidden />
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
  const fid = useId();
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
          <h3 className="text-lg font-bold text-foreground">
            {mode === "add" ? t.add : t.deduct}: {item.name}
          </h3>
          <button type="button" onClick={onClose} aria-label="סגירה" className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"><X size={20} aria-hidden /></button>
        </div>
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3" role="alert">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">{t.adjustError}</p>
              <p className="mt-0.5 break-words text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-red-600/40 px-3 text-sm font-semibold text-red-700 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-300"
            >
              <RotateCw size={10} />
              {t.retry}
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor={`${fid}-quantity`} className="mb-1.5 block text-sm font-medium text-foreground">{t.quantity}</label>
            <input id={`${fid}-quantity`} type="number" min={1} value={qty} onChange={e => setQty(Number(e.target.value))}
              className="min-h-12 w-full rounded-xl border border-border bg-background px-3 py-2 text-base text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
          </div>
          <div>
            <label htmlFor={`${fid}-reason`} className="mb-1.5 block text-sm font-medium text-foreground">{t.reason}</label>
            <input id={`${fid}-reason`} value={reason} onChange={e => setReason(e.target.value)} placeholder={t.optional}
              className="min-h-12 w-full rounded-xl border border-border bg-background px-3 py-2 text-base text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
          </div>
          <div className="rounded-lg bg-card/50 p-3 text-center">
            <span className="text-sm text-muted-foreground">{t.newTotal} </span>
            <span className={`text-base font-bold tabular-nums ${newTotal <= item.minStock && item.minStock > 0 ? "text-amber-700 dark:text-amber-400" : "text-foreground"}`}>
              {newTotal} {(t.unitLabels as Record<string, string>)[item.unit] ?? item.unit}
            </span>
          </div>
          <button type="submit" disabled={busy || qty <= 0}
            className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50">
            {mode === "add" ? t.add : t.deduct}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${t.history}: ${item.name}`}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">{t.history}: {item.name}</h3>
          <button type="button" onClick={onClose} aria-label="סגירה" className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"><X size={20} aria-hidden /></button>
        </div>
        {movements.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t.noMovements}</p>
        ) : (
          <div className="max-h-[300px] space-y-2 overflow-y-auto">
            {movements.map(m => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 p-2.5">
                <span aria-hidden className="rounded-full bg-muted p-1.5 text-foreground">
                  {m.type === "add" ? <Plus size={14} /> : <Minus size={14} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {m.type === "add" ? t.add : t.deduct} {m.quantity} {(t.unitLabels as Record<string, string>)[item.unit] ?? item.unit}
                    <span dir="ltr" className="ms-1 text-muted-foreground">({m.previousQuantity} → {m.type === "add" ? m.previousQuantity + m.quantity : m.previousQuantity - m.quantity})</span>
                  </p>
                  {m.reason && <p className="truncate text-xs text-muted-foreground">{m.reason}</p>}
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {m.createdAt.toLocaleDateString("he-IL")}
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
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
          <Trash2 size={20} className="text-red-500" />
        </div>
        <h3 className="mb-2 text-lg font-bold text-foreground">
          {title}
        </h3>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{body}</p>
        <div className="flex gap-3">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="h-11 flex-1 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800"
          >
            <Trash2 size={16} aria-hidden />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
