import { useState, useEffect } from 'react';
import { X, Search, ShoppingCart, Plus, Minus, ChevronRight, Store } from 'lucide-react';
import { getProducts, addSale, getInventory, getStoreInventory } from '../storage';

// ─── Chip button ──────────────────────────────────────────────────────────────
function Chip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-2xl text-sm font-semibold border-2 transition-all active:scale-95 ${
        active
          ? 'bg-brand-600 border-brand-600 text-white shadow-md'
          : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-600'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Step indicator ────────────────────────────────────────────────────────────
function StepDot({ n, current }) {
  return (
    <div className={`w-2 h-2 rounded-full transition-all ${n <= current ? 'bg-brand-500' : 'bg-gray-200'}`} />
  );
}

export default function SaleModal({ open, onClose, onSaved }) {
  const [products,  setProducts]  = useState([]);
  const [invMap,    setInvMap]    = useState({});   // { productId: totalQty }
  const [storeMap,  setStoreMap]  = useState({});   // { productId: storeQty }
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState(null);
  const [size,      setSize]      = useState('');
  const [color,     setColor]     = useState('');
  const [price,     setPrice]     = useState('');
  const [qty,       setQty]       = useState(1);
  // steps: 1=pick product  2=pick variant  3=confirm qty+price
  const [step,      setStep]      = useState(1);

  useEffect(() => {
    if (open) {
      const prods    = getProducts();
      const inv      = getInventory();
      const storeInv = getStoreInventory();
      // Clamp store qty to total
      const clampedStore = {};
      for (const p of prods) {
        const total = inv[p.id] ?? 0;
        clampedStore[p.id] = Math.min(storeInv[p.id] ?? 0, total);
      }
      setProducts(prods);
      setInvMap(inv);
      setStoreMap(clampedStore);
      setSearch('');
      setSelected(null);
      setSize('');
      setColor('');
      setPrice('');
      setQty(1);
      setStep(1);
    }
  }, [open]);

  const filtered = products.filter(p =>
    p.name.includes(search) || p.category.includes(search)
  );

  const hasVariants = selected && (
    (selected.sizes?.length > 0) || (selected.colors?.length > 0)
  );

  function handleSelectProduct(p) {
    setSelected(p);
    setSize('');
    setColor('');
    setPrice(String(p.defaultPrice));
    setQty(1);
    // skip variant step if no variants defined
    const noVariants = (!p.sizes || p.sizes.length === 0) && (!p.colors || p.colors.length === 0);
    setStep(noVariants ? 3 : 2);
  }

  function handleSave() {
    if (!selected || !price || Number(price) <= 0) return;
    addSale({
      productId:   selected.id,
      actualPrice: Number(price),
      quantity:    qty,
      size,
      color,
    });
    onSaved?.();
    onClose();
  }

  const totalSteps = hasVariants ? 3 : 2;
  const currentStep = step === 1 ? 1 : step === 2 ? 2 : totalSteps;

  const stepTitle = {
    1: '選擇商品',
    2: '選擇尺寸 / 花色',
    3: '確認售價',
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[94svh]">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-1 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{stepTitle[step]}</h2>
            {/* Step dots */}
            <div className="flex gap-1.5 mt-1">
              {[1, 2, 3].slice(0, totalSteps).map(n => (
                <StepDot key={n} n={n} current={currentStep} />
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
          >
            <X size={22} />
          </button>
        </div>

        {/* ── Step 1: Product list ─────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-3">
                <Search size={17} className="text-gray-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="搜尋商品或類別…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-base outline-none text-gray-700 placeholder-gray-400"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2">
              {filtered.length === 0 && (
                <p className="text-center text-gray-400 text-sm mt-10">找不到商品</p>
              )}
              {filtered.map(p => {
                const totalQty = invMap[p.id] ?? 0;
                const storeQty = storeMap[p.id] ?? 0;
                const outOfStock  = totalQty === 0;
                const storeEmpty  = storeQty === 0 && totalQty > 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    className={`w-full flex items-center justify-between border rounded-2xl px-4 py-4 transition-colors active:scale-[0.98] ${
                      outOfStock
                        ? 'bg-gray-50 border-gray-200 opacity-50'
                        : 'bg-gray-50 active:bg-brand-50 border-gray-200 active:border-brand-300'
                    }`}
                  >
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-800">{p.name}</p>
                        {outOfStock && (
                          <span className="text-[10px] font-bold text-white bg-gray-400 rounded-full px-1.5 py-0.5">
                            無庫存
                          </span>
                        )}
                        {storeEmpty && (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-100 rounded-full px-1.5 py-0.5">
                            店面缺貨
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {p.category}
                        {p.sizes?.length > 0 && ` · ${p.sizes.join(' / ')}`}
                      </p>
                      {/* Store stock indicator */}
                      {!outOfStock && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="flex items-center gap-0.5 text-[10px] text-brand-600 bg-brand-50 border border-brand-100 rounded-lg px-1.5 py-0.5 font-semibold">
                            <Store size={9} /> 店面 {storeQty} 件
                          </span>
                          <span className="text-[10px] text-gray-400">
                            總庫存 {totalQty} 件
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-brand-600">NT${p.defaultPrice}</p>
                        <p className="text-xs text-gray-400">成本 NT${p.cost}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Step 2: Variant chips ────────────────────────────────────────── */}
        {step === 2 && selected && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 pb-8">
            {/* Product badge */}
            <div className="bg-brand-50 border border-brand-200 rounded-2xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-brand-800">{selected.name}</p>
                <p className="text-xs text-brand-400 mt-0.5">{selected.category}</p>
              </div>
              <span className="font-bold text-brand-600">NT${selected.defaultPrice}</span>
            </div>

            {/* Size chips */}
            {selected.sizes?.length > 0 && (
              <div>
                <p className="text-sm font-bold text-gray-600 mb-3">
                  尺寸
                  {size && <span className="ml-2 text-brand-600">✓ {size}</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selected.sizes.map(s => (
                    <Chip
                      key={s}
                      label={s}
                      active={size === s}
                      onClick={() => setSize(prev => prev === s ? '' : s)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Color chips */}
            {selected.colors?.length > 0 && (
              <div>
                <p className="text-sm font-bold text-gray-600 mb-3">
                  花色
                  {color && <span className="ml-2 text-brand-600">✓ {color}</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selected.colors.map(c => (
                    <Chip
                      key={c}
                      label={c}
                      active={color === c}
                      onClick={() => setColor(prev => prev === c ? '' : c)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Note: variant is optional */}
            <p className="text-xs text-gray-400">尺寸與花色可不選，直接跳過</p>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
              >
                返回
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold flex items-center justify-center gap-2"
              >
                下一步 <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Qty + Price ──────────────────────────────────────────── */}
        {step === 3 && selected && (() => {
          const totalQty  = invMap[selected.id] ?? 0;
          const storeQty  = storeMap[selected.id] ?? 0;
          const storeWarn = qty > storeQty;
          return (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-8">
            {/* Summary badge */}
            <div className="bg-brand-50 border border-brand-200 rounded-2xl px-4 py-3">
              <p className="font-bold text-brand-800">{selected.name}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                {size  && <span className="text-xs bg-brand-100 text-brand-700 rounded-lg px-2 py-0.5 font-semibold">{size}</span>}
                {color && <span className="text-xs bg-brand-100 text-brand-700 rounded-lg px-2 py-0.5 font-semibold">{color}</span>}
                {!size && !color && <span className="text-xs text-brand-400">{selected.category} · 進貨成本 NT${selected.cost}</span>}
              </div>
              {/* Inventory status row */}
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-brand-100">
                <span className="flex items-center gap-1 text-[11px] text-brand-600 font-semibold">
                  <Store size={10} /> 店面 {storeQty} 件
                </span>
                <span className="text-[11px] text-gray-400">總庫存 {totalQty} 件</span>
              </div>
            </div>

            {/* Store stock warning */}
            {storeWarn && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">⚠️</span>
                <p className="text-xs text-amber-700">
                  {storeQty === 0
                    ? '店面目前無庫存，此筆銷售將從倉庫扣除'
                    : `店面僅剩 ${storeQty} 件，超出部分將從倉庫扣除`}
                </p>
              </div>
            )}

            {/* Quantity – big touch targets */}
            <div>
              <p className="text-sm font-bold text-gray-600 mb-3">數量</p>
              <div className="flex items-center gap-5">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-14 h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center transition-all"
                >
                  <Minus size={22} className="text-gray-600" />
                </button>
                <span className="text-3xl font-bold text-gray-800 w-10 text-center">{qty}</span>
                <button
                  onClick={() => setQty(q => q + 1)}
                  className="w-14 h-14 rounded-2xl bg-brand-100 hover:bg-brand-200 active:scale-95 flex items-center justify-center transition-all"
                >
                  <Plus size={22} className="text-brand-700" />
                </button>
              </div>
            </div>

            {/* Price */}
            <div>
              <p className="text-sm font-bold text-gray-600 mb-2">實際成交價 (NT$)</p>
              <input
                type="number"
                inputMode="numeric"
                value={price}
                onChange={e => setPrice(e.target.value)}
                min={1}
                max={999999}
                className="w-full border-2 border-gray-200 focus:border-brand-400 rounded-2xl px-4 py-4 text-2xl font-bold text-gray-800 outline-none transition-colors"
              />
            </div>

            {/* Live profit preview */}
            {price && Number(price) > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm space-y-1.5">
                <div className="flex justify-between text-gray-600">
                  <span>單件毛利</span>
                  <span className="font-semibold text-green-700">
                    NT${Number(price) - selected.cost}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>合計金額</span>
                  <span className="font-bold text-gray-800">NT${Number(price) * qty}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>毛利率</span>
                  <span className="font-semibold text-green-600">
                    {(((Number(price) - selected.cost) / Number(price)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setStep(hasVariants ? 2 : 1)}
                className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
              >
                返回
              </button>
              <button
                onClick={handleSave}
                disabled={!price || Number(price) <= 0}
                className="flex-1 py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-bold flex items-center justify-center gap-2 transition-colors active:scale-95"
              >
                <ShoppingCart size={20} />
                確認成交
              </button>
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
}
