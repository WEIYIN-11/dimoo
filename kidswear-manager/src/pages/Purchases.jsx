import { useState, useEffect } from 'react';
import {
  Truck, Plus, CheckCircle2, Clock, Trash2,
  ChevronDown, PackageCheck,
} from 'lucide-react';
import {
  getPurchases, addPurchase, confirmReceipt, deletePurchase,
  getProducts, DEFAULT_SIZES,
} from '../storage';

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  return status === '已完成'
    ? <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 rounded-xl px-2 py-0.5"><CheckCircle2 size={11} />已完成</span>
    : <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-2 py-0.5"><Clock size={11} />已下單</span>;
}

// ─── Size chip selector ───────────────────────────────────────────────────────
function SizeChips({ value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">尺碼</label>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all active:scale-95 ${
            value === ''
              ? 'bg-amber-500 border-amber-500 text-white'
              : 'bg-white border-gray-200 text-gray-500 hover:border-amber-300'
          }`}
        >
          不分尺碼
        </button>
        {DEFAULT_SIZES.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all active:scale-95 ${
              value === s
                ? 'bg-amber-500 border-amber-500 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Add purchase form ────────────────────────────────────────────────────────
function PurchaseForm({ products, onSave, onCancel }) {
  const [supplier,   setSupplier]   = useState('');
  const [productId,  setProductId]  = useState(products[0]?.id ?? '');
  const [unitCost,   setUnitCost]   = useState('');
  const [quantity,   setQuantity]   = useState('');
  const [size,       setSize]       = useState('');
  const [manualName, setManualName] = useState('');
  const useManual = productId === '__manual__';

  // Auto-fill cost when product changes
  function handleProductChange(pid) {
    setProductId(pid);
    if (pid !== '__manual__') {
      const p = products.find(x => x.id === pid);
      if (p) setUnitCost(String(p.cost));
    } else {
      setUnitCost('');
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const pName = useManual
      ? manualName
      : products.find(p => p.id === productId)?.name ?? '';
    if (!supplier || !pName || !unitCost || !quantity) return;
    onSave({
      supplier,
      productId:   useManual ? '' : productId,
      productName: pName,
      unitCost:    Number(unitCost),
      quantity:    Number(quantity),
      size,
    });
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

      {/* Product picker */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">商品</label>
        <select
          value={productId}
          onChange={e => handleProductChange(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-amber-400 bg-white"
        >
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name}（{p.category}）</option>
          ))}
          <option value="__manual__">── 手動輸入商品 ──</option>
        </select>
        {useManual && (
          <input
            type="text"
            value={manualName}
            onChange={e => setManualName(e.target.value)}
            required={useManual}
            maxLength={60}
            placeholder="輸入商品名稱"
            className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-amber-400 bg-white"
          />
        )}
      </div>

      {/* Size chips */}
      <SizeChips value={size} onChange={setSize} />

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
          <label className="block text-xs font-semibold text-gray-500 mb-1">數量（件）</label>
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

      {/* Total preview */}
      {unitCost && quantity && (
        <div className="bg-white rounded-xl px-3 py-2 text-sm flex justify-between border border-amber-100">
          <span className="text-gray-500">預計總成本</span>
          <span className="font-bold text-amber-700">NT${(Number(unitCost) * Number(quantity)).toLocaleString()}</span>
        </div>
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
function PurchaseCard({ p, onConfirm, onDelete }) {
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
          <button
            onClick={() => onDelete(p.id)}
            className="w-8 h-8 rounded-xl hover:bg-red-50 text-red-300 hover:text-red-500 flex items-center justify-center shrink-0"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Confirm button – only for 已下單 */}
      {isPending && (
        <button
          onClick={() => onConfirm(p.id)}
          className="w-full py-3 bg-green-500 hover:bg-green-600 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <PackageCheck size={18} />
          確認收貨　（＋{p.quantity} 件{p.size ? `・${p.size}` : ''}入庫）
        </button>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [products,  setProducts]  = useState([]);
  const [showForm,  setShowForm]  = useState(false);
  const [showDone,  setShowDone]  = useState(false);

  function reload() {
    setPurchases(getPurchases());
    setProducts(getProducts());
  }
  useEffect(reload, []);

  const pending   = purchases.filter(p => p.status === '已下單').sort((a,b)=>b.date.localeCompare(a.date));
  const completed = purchases.filter(p => p.status === '已完成').sort((a,b)=>b.completedDate.localeCompare(a.completedDate));

  function handleAdd(data) {
    addPurchase(data);
    reload();
    setShowForm(false);
  }

  function handleConfirm(id) {
    confirmReceipt(id);
    reload();
  }

  function handleDelete(id) {
    if (window.confirm('確定刪除此採購單？')) {
      deletePurchase(id);
      reload();
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
          products={products}
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
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
