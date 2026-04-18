import { useState, useEffect } from 'react';
import {
  Truck, Plus, CheckCircle2, Clock, Trash2,
  ChevronDown, PackageCheck, Pencil, X, Check,
} from 'lucide-react';
import {
  getPurchases, addPurchase, updatePurchase, confirmReceipt, deletePurchase,
  getProducts, addProduct,
  DEFAULT_SIZES, DEFAULT_CATEGORIES,
} from '../storage';

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  return status === '已完成'
    ? <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 rounded-xl px-2 py-0.5"><CheckCircle2 size={11} />已完成</span>
    : <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-2 py-0.5"><Clock size={11} />已下單</span>;
}

// ─── New-product modal (shown when confirming receipt of an unknown product) ──
function NewProductModal({ purchase, onConfirm, onSkip }) {
  const [category, setCategory] = useState('');
  const [price,    setPrice]    = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-[480px] bg-white rounded-t-3xl px-5 pt-6 pb-8 space-y-4 shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-gray-800">補充商品資料</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              「{purchase.productName}」尚未在商品清單中。<br />
              填寫後方便計算利潤，也可略過直接入庫。
            </p>
          </div>
          <span className="text-[11px] font-semibold bg-amber-100 text-amber-700 rounded-xl px-2 py-1 shrink-0">
            選填
          </span>
        </div>

        {/* Readonly name */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">商品名稱</label>
          <div className="w-full border border-gray-100 bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-500">
            {purchase.productName}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">商品類別</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-amber-400 bg-white"
          >
            <option value="">不設定</option>
            {DEFAULT_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">建議售價 (NT$)</label>
          <input
            type="number"
            inputMode="numeric"
            value={price}
            onChange={e => setPrice(e.target.value)}
            min={0}
            max={999999}
            placeholder="0"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-amber-400 bg-white"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold"
          >
            略過，直接入庫
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ category, price: price ? Number(price) : 0 })}
            className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 active:scale-[0.98] text-white text-sm font-bold flex items-center justify-center gap-1.5"
          >
            <PackageCheck size={15} /> 建立並入庫
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Color chips ─────────────────────────────────────────────────────────────
const PRESET_COLORS = ['紅', '藍', '綠', '黃', '白', '黑', '粉', '灰', '橘', '紫'];

function ColorChips({ value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
        花色
        <span className="font-normal text-gray-400 ml-1">（選填）</span>
      </label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(value === c ? '' : c)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all active:scale-95 ${
              value === c
                ? 'bg-pink-500 border-pink-500 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-pink-300'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={20}
        placeholder="或輸入自訂花色…"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-pink-300 bg-white"
      />
    </div>
  );
}

// ─── Size chips (multi-select) ────────────────────────────────────────────────
function SizeChips({ value, onChange }) {
  // value is an array of selected sizes
  function toggle(s) {
    onChange(value.includes(s) ? value.filter(x => x !== s) : [...value, s]);
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
        尺碼
        <span className="font-normal text-gray-400 ml-1">（可複選，不選為不分尺碼）</span>
      </label>
      <div className="flex flex-wrap gap-1.5">
        {DEFAULT_SIZES.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => toggle(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all active:scale-95 ${
              value.includes(s)
                ? 'bg-amber-500 border-amber-500 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {value.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-amber-600 font-semibold">已選：</span>
          {value.map(s => (
            <span key={s} className="text-[11px] bg-amber-100 text-amber-700 rounded-lg px-1.5 py-0.5 font-semibold">
              {s}
            </span>
          ))}
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] text-gray-400 hover:text-red-400 ml-0.5"
          >
            清除
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Edit purchase form (inline, 已下單 only) ────────────────────────────────
function EditPurchaseForm({ purchase, onSave, onCancel }) {
  const [supplier,    setSupplier]    = useState(purchase.supplier);
  const [productName, setProductName] = useState(purchase.productName);
  const [unitCost,    setUnitCost]    = useState(String(purchase.unitCost));
  const [quantity,    setQuantity]    = useState(String(purchase.quantity));
  const [size,        setSize]        = useState(purchase.size ?? '');

  function handleSubmit(e) {
    e.preventDefault();
    if (!supplier || !productName || !unitCost || !quantity) return;
    onSave(purchase.id, {
      supplier,
      productName,
      unitCost: Number(unitCost),
      quantity: Number(quantity),
      size,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 bg-blue-50 border border-blue-200 rounded-2xl p-3 space-y-2.5"
    >
      <p className="text-xs font-bold text-blue-700 flex items-center gap-1">
        <Pencil size={12} /> 編輯採購單
      </p>

      {/* Supplier */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">供應商名稱</label>
        <input
          type="text"
          value={supplier}
          onChange={e => setSupplier(e.target.value)}
          required
          maxLength={60}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
        />
      </div>

      {/* Product name */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">商品名稱</label>
        <input
          type="text"
          value={productName}
          onChange={e => setProductName(e.target.value)}
          required
          maxLength={60}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
        />
      </div>

      {/* Size (single, read-only label if present) */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">尺碼</label>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSize('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
              size === ''
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
            }`}
          >
            不分尺碼
          </button>
          {DEFAULT_SIZES.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                size === s
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Cost + Qty */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">進貨單價 (NT$)</label>
          <input
            type="number"
            inputMode="numeric"
            value={unitCost}
            onChange={e => setUnitCost(e.target.value)}
            required
            min={0}
            max={999999}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">數量（件）</label>
          <input
            type="number"
            inputMode="numeric"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            required
            min={1}
            max={9999}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
          />
        </div>
      </div>

      {/* Preview */}
      {unitCost && quantity && (
        <div className="bg-white rounded-xl px-3 py-2 text-sm flex justify-between border border-blue-100">
          <span className="text-gray-500">預計總成本</span>
          <span className="font-bold text-blue-700">
            NT${(Number(unitCost) * Number(quantity)).toLocaleString()}
          </span>
        </div>
      )}

      <div className="flex gap-2 pt-0.5">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold flex items-center justify-center gap-1"
        >
          <X size={14} /> 取消
        </button>
        <button
          type="submit"
          className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold flex items-center justify-center gap-1"
        >
          <Check size={14} /> 儲存
        </button>
      </div>
    </form>
  );
}

// ─── Add purchase form ────────────────────────────────────────────────────────
function PurchaseForm({ onSave, onCancel }) {
  const [supplier,     setSupplier]     = useState('');
  const [productName,  setProductName]  = useState('');
  const [unitCost,     setUnitCost]     = useState('');
  const [quantity,     setQuantity]     = useState('');
  const [sizes,        setSizes]        = useState([]);
  const [color,        setColor]        = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!supplier || !productName || !unitCost || !quantity) return;

    const base = {
      supplier,
      productId:   '',
      productName,
      unitCost:    Number(unitCost),
      quantity:    Number(quantity),
      color:       color.trim(),
    };

    const records = sizes.length === 0
      ? [{ ...base, size: '' }]
      : sizes.map(size => ({ ...base, size }));

    onSave(records);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3"
    >
      <p className="font-bold text-amber-800 text-sm flex items-center gap-1.5">
        <Truck size={16} /> 新增採購單
      </p>

      {/* Supplier */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">供應商名稱</label>
        <input
          type="text"
          value={supplier}
          onChange={e => setSupplier(e.target.value)}
          required
          maxLength={60}
          placeholder="例：台北批發商"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-amber-400 bg-white"
        />
      </div>

      {/* Product name – manual only */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">商品名稱</label>
        <input
          type="text"
          value={productName}
          onChange={e => setProductName(e.target.value)}
          required
          autoFocus
          maxLength={60}
          placeholder="輸入商品名稱"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-amber-400 bg-white"
        />
      </div>

      {/* Size chips (multi-select) */}
      <SizeChips value={sizes} onChange={setSizes} />

      {/* Color chips */}
      <ColorChips value={color} onChange={setColor} />

      {/* Cost + Qty */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">進貨單價 (NT$)</label>
          <input
            type="number"
            inputMode="numeric"
            value={unitCost}
            onChange={e => setUnitCost(e.target.value)}
            required
            min={0}
            max={999999}
            placeholder="0"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-amber-400 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            每尺碼數量（件）
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            required
            min={1}
            max={9999}
            placeholder="0"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-amber-400 bg-white"
          />
        </div>
      </div>

      {/* Preview */}
      {unitCost && quantity && (
        sizes.length > 0 ? (
          <div className="bg-white rounded-xl px-3 py-2.5 border border-amber-100 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">{sizes.length} 個尺碼 × {quantity} 件</span>
              <span className="font-semibold text-gray-700">共 {sizes.length * Number(quantity)} 件</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">預計總成本</span>
              <span className="font-bold text-amber-700">
                NT${(Number(unitCost) * Number(quantity) * sizes.length).toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl px-3 py-2 text-sm flex justify-between border border-amber-100">
            <span className="text-gray-500">預計總成本</span>
            <span className="font-bold text-amber-700">NT${(Number(unitCost) * Number(quantity)).toLocaleString()}</span>
          </div>
        )
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold"
        >
          取消
        </button>
        <button
          type="submit"
          className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold flex items-center justify-center gap-1"
        >
          <Plus size={16} /> 建立採購單
        </button>
      </div>
    </form>
  );
}

// ─── Purchase card ────────────────────────────────────────────────────────────
function PurchaseCard({ p, onConfirm, onDelete, onEdit, isEditing }) {
  const isPending = p.status === '已下單';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
      isPending ? 'border-amber-200' : 'border-gray-100'
    }`}>
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-800">{p.productName}</p>
              <StatusBadge status={p.status} />
              {p.size && (
                <span className="text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200 rounded-lg px-2 py-0.5">
                  {p.size}
                </span>
              )}
              {p.color && (
                <span className="text-[11px] font-bold bg-pink-50 text-pink-600 border border-pink-200 rounded-lg px-2 py-0.5">
                  {p.color}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              供應商：{p.supplier}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              單價 NT${p.unitCost} × {p.quantity} 件 ＝{' '}
              <span className="font-semibold text-gray-700">NT${p.totalCost.toLocaleString()}</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              下單：{p.date}
              {p.completedDate && `　收貨：${p.completedDate}`}
            </p>
          </div>

          <div className="flex gap-1 shrink-0">
            {/* Edit button – only for 已下單 */}
            {isPending && (
              <button
                onClick={() => onEdit(p.id)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  isEditing
                    ? 'bg-blue-100 text-blue-500'
                    : 'hover:bg-blue-50 text-gray-300 hover:text-blue-400'
                }`}
              >
                <Pencil size={14} />
              </button>
            )}
            <button
              onClick={() => onDelete(p.id)}
              className="w-8 h-8 rounded-xl hover:bg-red-50 text-red-300 hover:text-red-500 flex items-center justify-center"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Inline edit form */}
        {isEditing && isPending && (
          <EditPurchaseForm
            purchase={p}
            onSave={onEdit}
            onCancel={() => onEdit(null)}
          />
        )}
      </div>

      {/* Confirm button – only for 已下單, not while editing */}
      {isPending && !isEditing && (
        <button
          onClick={() => onConfirm(p.id)}
          className="w-full py-3 bg-green-500 hover:bg-green-600 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <PackageCheck size={18} />
          確認收貨　（＋{p.quantity} 件{p.size ? `・${p.size}` : ''}{p.color ? `・${p.color}` : ''}入庫）
        </button>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function Purchases() {
  const [purchases,        setPurchases]        = useState([]);
  const [showForm,         setShowForm]         = useState(false);
  const [showDone,         setShowDone]         = useState(false);
  const [editId,           setEditId]           = useState(null);
  const [pendingReceiptId, setPendingReceiptId] = useState(null);  // waiting for product info

  function reload() {
    setPurchases(getPurchases());
  }
  useEffect(reload, []);

  const pending   = purchases.filter(p => p.status === '已下單').sort((a,b)=>b.date.localeCompare(a.date));
  const completed = purchases.filter(p => p.status === '已完成').sort((a,b)=>b.completedDate.localeCompare(a.completedDate));

  function handleAdd(records) {
    records.forEach(data => addPurchase(data));
    reload();
    setShowForm(false);
  }

  function handleConfirm(id) {
    const purchase = purchases.find(p => p.id === id);
    if (!purchase) return;

    // Check if the product already exists in the product catalogue
    const productExists = getProducts().some(p => p.name === purchase.productName);
    if (productExists) {
      // Product found — confirm immediately
      confirmReceipt(id);
      reload();
    } else {
      // Unknown product — ask user to fill in details first
      setPendingReceiptId(id);
    }
  }

  /** User filled in category + price and wants to create the product */
  function handleNewProductConfirm({ category, price }) {
    const purchase = purchases.find(p => p.id === pendingReceiptId);
    if (purchase) {
      addProduct({
        name:     purchase.productName,
        category: category || '',
        cost:     purchase.unitCost,
        price:    price || 0,
        sizes:    purchase.size ? [purchase.size] : [],
        colors:   [],
      });
      // confirmReceipt will now find the product by name and add stock
      confirmReceipt(pendingReceiptId);
      reload();
    }
    setPendingReceiptId(null);
  }

  /** User chose to skip product creation — auto-create with minimal info */
  function handleNewProductSkip() {
    confirmReceipt(pendingReceiptId);
    reload();
    setPendingReceiptId(null);
  }

  function handleDelete(id) {
    if (window.confirm('確定刪除此採購單？')) {
      deletePurchase(id);
      if (editId === id) setEditId(null);
      reload();
    }
  }

  /**
   * Called from PurchaseCard:
   *  - onEdit(id)         → toggle edit panel open
   *  - onEdit(null)       → close edit panel
   *  - onEdit(id, data)   → save changes (from EditPurchaseForm.onSave)
   */
  function handleEdit(idOrNull, updates) {
    if (updates) {
      // Save changes
      updatePurchase(idOrNull, updates);
      setEditId(null);
      reload();
    } else {
      // Toggle panel
      setEditId(prev => (prev === idOrNull ? null : idOrNull));
    }
  }

  // Stats
  const totalPending = pending.reduce((s, p) => s + p.totalCost, 0);
  const totalDone    = completed.reduce((s, p) => s + p.totalCost, 0);

  return (
    <div className="flex flex-col pb-20 pt-10 px-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">採購管理</h1>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-all"
        >
          <Plus size={16} /> 新增採購
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <PurchaseForm
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <p className="text-xs text-amber-600 font-semibold mb-1">待收貨</p>
          <p className="text-xl font-bold text-amber-800">{pending.length} 筆</p>
          <p className="text-xs text-amber-500 mt-0.5">NT${totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
          <p className="text-xs text-green-600 font-semibold mb-1">已完成</p>
          <p className="text-xl font-bold text-green-800">{completed.length} 筆</p>
          <p className="text-xs text-green-500 mt-0.5">NT${totalDone.toLocaleString()}</p>
        </div>
      </div>

      {/* ── 已下單 (待收貨) list ─────────────────────────────────────────── */}
      <div>
        <p className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
          <Clock size={14} className="text-amber-500" /> 待收貨（{pending.length}）
        </p>

        {pending.length === 0 && (
          <div className="text-center text-gray-300 text-sm py-8 bg-white rounded-2xl border border-gray-100">
            目前沒有待收貨的採購單
          </div>
        )}

        <div className="space-y-3">
          {pending.map(p => (
            <PurchaseCard
              key={p.id}
              p={p}
              onConfirm={handleConfirm}
              onDelete={handleDelete}
              onEdit={handleEdit}
              isEditing={editId === p.id}
            />
          ))}
        </div>
      </div>

      {/* ── 已完成 collapsible ───────────────────────────────────────────── */}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowDone(s => !s)}
            className="w-full flex items-center justify-between text-sm font-semibold text-gray-500 mb-2"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-green-500" />
              已完成（{completed.length}）
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${showDone ? 'rotate-180' : ''}`}
            />
          </button>

          {showDone && (
            <div className="space-y-3">
              {completed.map(p => (
                <PurchaseCard
                  key={p.id}
                  p={p}
                  onConfirm={handleConfirm}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  isEditing={false}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── New-product modal ─────────────────────────────────────────────── */}
      {pendingReceiptId !== null && (() => {
        const p = purchases.find(x => x.id === pendingReceiptId);
        return p ? (
          <NewProductModal
            purchase={p}
            onConfirm={handleNewProductConfirm}
            onSkip={handleNewProductSkip}
          />
        ) : null;
      })()}
    </div>
  );
}
