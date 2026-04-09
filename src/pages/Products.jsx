import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { getProducts, addProduct, updateProduct, deleteProduct } from '../storage';

const CATEGORIES = ['嬰兒', '套裝', '上衣', '下著', '洋裝', '外套', '配件', '鞋類', '睡衣'];

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

// ─── Product form ──────────────────────────────────────────────────────────────
function ProductForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial ?? {
      name: '', category: CATEGORIES[0],
      cost: '', defaultPrice: '',
      sizes: [], colors: [],
    }
  );

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.cost || !form.defaultPrice) return;
    onSave({ ...form, cost: Number(form.cost), defaultPrice: Number(form.defaultPrice) });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-brand-50 border border-brand-200 rounded-2xl p-4 space-y-3">
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">商品名稱</label>
        <input
          type="text"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          required
          placeholder="例：小兔子套裝"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 bg-white"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">類別</label>
        <select
          value={form.category}
          onChange={e => set('category', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 bg-white"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">進貨成本 (NT$)</label>
          <input
            type="number"
            inputMode="numeric"
            value={form.cost}
            onChange={e => set('cost', e.target.value)}
            required
            placeholder="0"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">預設售價 (NT$)</label>
          <input
            type="number"
            inputMode="numeric"
            value={form.defaultPrice}
            onChange={e => set('defaultPrice', e.target.value)}
            required
            placeholder="0"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 bg-white"
          />
        </div>
      </div>

      {/* Sizes tag input */}
      <TagInput
        label="尺寸（可多個，如 90cm / 100cm）"
        tags={form.sizes ?? []}
        onChange={v => set('sizes', v)}
      />

      {/* Colors tag input */}
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
          className="flex-1 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 flex items-center justify-center gap-1"
        >
          <Check size={16} /> 儲存
        </button>
      </div>
    </form>
  );
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">商品管理</h1>
        <button
          onClick={() => { setShowAdd(s => !s); setEditId(null); }}
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
        >
          <Plus size={16} /> 新增商品
        </button>
      </div>

      {showAdd && (
        <ProductForm
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      )}

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
                    <p className="font-bold text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.category} · 成本 NT${p.cost} · 售價 NT${p.defaultPrice}
                    </p>
                    <p className="text-xs text-green-500 mt-0.5">
                      毛利率 {p.defaultPrice > 0
                        ? (((p.defaultPrice - p.cost) / p.defaultPrice) * 100).toFixed(1)
                        : 0}%
                    </p>
                    {/* Size chips preview */}
                    {p.sizes?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.sizes.map(s => (
                          <span key={s} className="text-xs bg-gray-100 text-gray-500 rounded-lg px-2 py-0.5">{s}</span>
                        ))}
                      </div>
                    )}
                    {/* Color chips preview */}
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
    </div>
  );
}
