import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, Package } from 'lucide-react';
import { getProducts, addProduct, updateProduct, deleteProduct, DEFAULT_CATEGORIES } from '../storage';

// ─── Tag input – type + Enter to add, click × to remove ───────────────────────
function TagInput({ label, tags, onChange }) {
  const [input, setInput] = useState('');

  function add() {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput('');
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {tags.map(t => (
          <span key={t} className="flex items-center gap-1 bg-brand-100 text-brand-700 text-xs font-semibold px-2.5 py-1 rounded-xl">
            {t}
            <button type="button" onClick={() => onChange(tags.filter(x => x !== t))}>
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          maxLength={30}
          placeholder="輸入後按 Enter 新增"
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
        <button
          type="button"
          onClick={add}
          disabled={!input.trim()}
          className="px-3 py-2 bg-brand-100 text-brand-700 rounded-xl text-sm font-semibold disabled:opacity-40"
        >
          新增
        </button>
      </div>
    </div>
  );
}

// ─── Category chip selector ────────────────────────────────────────────────────
function CategoryChips({ value, onChange }) {
  const [custom, setCustom] = useState('');
  const isDefault = DEFAULT_CATEGORIES.includes(value);

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-2">類別</label>

      {/* Preset chips */}
      <div className="flex flex-wrap gap-2 mb-2">
        {DEFAULT_CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => { onChange(cat); setCustom(''); }}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95 ${
              value === cat
                ? 'bg-brand-600 border-brand-600 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Custom category input */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={isDefault ? '' : value === custom ? custom : value}
          onChange={e => { setCustom(e.target.value); onChange(e.target.value); }}
          placeholder="或自訂類別…"
          className={`flex-1 border-2 rounded-xl px-3 py-2 text-sm outline-none transition-all ${
            !isDefault && value
              ? 'border-brand-400 bg-brand-50 text-brand-700'
              : 'border-gray-200 bg-white text-gray-600 focus:border-brand-300'
          }`}
        />
        {!isDefault && value && (
          <span className="text-xs text-brand-600 font-semibold shrink-0">✓ 已選</span>
        )}
      </div>
    </div>
  );
}

// ─── Product form ──────────────────────────────────────────────────────────────
function ProductForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial ?? {
      name: '', category: DEFAULT_CATEGORIES[0],
      cost: '', defaultPrice: '',
      sizes: [], colors: [],
    }
  );

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.cost || !form.defaultPrice || !form.category.trim()) return;
    onSave({ ...form, cost: Number(form.cost), defaultPrice: Number(form.defaultPrice) });
  }

  const canSave = form.name.trim() && form.cost && form.defaultPrice && form.category.trim();

  return (
    <form onSubmit={handleSubmit} className="bg-brand-50 border border-brand-200 rounded-2xl p-4 space-y-3">

      {/* Name – fully manual */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">
          商品名稱 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          required
          autoFocus
          maxLength={60}
          placeholder="請輸入商品名稱"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 bg-white"
        />
      </div>

      {/* Category chips */}
      <CategoryChips value={form.category} onChange={v => set('category', v)} />

      {/* Cost + Price */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            進貨成本 (NT$) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={form.cost}
            onChange={e => set('cost', e.target.value)}
            required
            min={0}
            max={999999}
            placeholder="0"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            預設售價 (NT$) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={form.defaultPrice}
            onChange={e => set('defaultPrice', e.target.value)}
            required
            min={0}
            max={999999}
            placeholder="0"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 bg-white"
          />
        </div>
      </div>

      {/* Live margin preview */}
      {form.cost && form.defaultPrice && Number(form.defaultPrice) > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs flex justify-between">
          <span className="text-gray-500">預估毛利率</span>
          <span className="font-bold text-green-600">
            {(((Number(form.defaultPrice) - Number(form.cost)) / Number(form.defaultPrice)) * 100).toFixed(1)}%
          </span>
        </div>
      )}

      {/* Sizes */}
      <TagInput
        label="尺寸（可多個，如 90cm / 100cm）"
        tags={form.sizes ?? []}
        onChange={v => set('sizes', v)}
      />

      {/* Colors */}
      <TagInput
        label="花色（可多個，如 粉色 / 藍色）"
        tags={form.colors ?? []}
        onChange={v => set('colors', v)}
      />

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={!canSave}
          className="flex-1 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-40 flex items-center justify-center gap-1 active:scale-95 transition-all"
        >
          <Check size={16} /> 儲存
        </button>
      </div>
    </form>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyProducts({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mb-4">
        <Package size={36} className="text-brand-300" />
      </div>
      <p className="font-bold text-gray-600 mb-1">尚未建立任何商品</p>
      <p className="text-sm text-gray-400 mb-6">新增商品後才能記錄銷售與庫存</p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 bg-brand-600 text-white font-bold px-6 py-3 rounded-2xl active:scale-95 transition-all"
      >
        <Plus size={18} /> 新增第一個商品
      </button>
    </div>
  );
}

// ─── Category badge color map ──────────────────────────────────────────────────
const CAT_COLOR = {
  '上衣': 'bg-blue-50 text-blue-600',
  '褲子': 'bg-indigo-50 text-indigo-600',
  '外套': 'bg-orange-50 text-orange-600',
  '襪子': 'bg-pink-50 text-pink-600',
  '鞋子': 'bg-amber-50 text-amber-600',
  '帽子': 'bg-green-50 text-green-600',
};
function catColor(c) {
  return CAT_COLOR[c] ?? 'bg-gray-100 text-gray-500';
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function Products() {
  const [products, setProducts] = useState([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [editId, setEditId]     = useState(null);

  function reload() { setProducts(getProducts()); }
  useEffect(reload, []);

  function handleAdd(data) {
    addProduct(data);
    reload();
    setShowAdd(false);
  }

  function handleEdit(id, data) {
    updateProduct(id, data);
    reload();
    setEditId(null);
  }

  function handleDelete(id) {
    if (window.confirm('確定要刪除此商品？')) {
      deleteProduct(id);
      reload();
    }
  }

  return (
    <div className="flex flex-col pb-20 pt-10 px-4 gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">商品管理</h1>
        <button
          onClick={() => { setShowAdd(s => !s); setEditId(null); }}
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl active:scale-95 transition-all"
        >
          <Plus size={16} /> 新增商品
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <ProductForm
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Empty state */}
      {products.length === 0 && !showAdd && (
        <EmptyProducts onAdd={() => setShowAdd(true)} />
      )}

      {/* Product list */}
      {products.length > 0 && (
        <div className="space-y-2">
          {products.map(p => (
            <div key={p.id}>
              {editId === p.id ? (
                <ProductForm
                  initial={p}
                  onSave={data => handleEdit(p.id, data)}
                  onCancel={() => setEditId(null)}
                />
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-800">{p.name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${catColor(p.category)}`}>
                          {p.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        成本 NT${p.cost} · 售價 NT${p.defaultPrice}
                      </p>
                      <p className="text-xs text-green-500 mt-0.5">
                        毛利率 {p.defaultPrice > 0
                          ? (((p.defaultPrice - p.cost) / p.defaultPrice) * 100).toFixed(1)
                          : 0}%
                      </p>
                      {p.sizes?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {p.sizes.map(s => (
                            <span key={s} className="text-xs bg-gray-100 text-gray-500 rounded-lg px-2 py-0.5">{s}</span>
                          ))}
                        </div>
                      )}
                      {p.colors?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.colors.map(c => (
                            <span key={c} className="text-xs bg-brand-50 text-brand-500 rounded-lg px-2 py-0.5">{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => { setEditId(p.id); setShowAdd(false); }}
                        className="w-10 h-10 rounded-xl hover:bg-brand-50 text-brand-600 flex items-center justify-center"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="w-10 h-10 rounded-xl hover:bg-red-50 text-red-400 flex items-center justify-center"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
