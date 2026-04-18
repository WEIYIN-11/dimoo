import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, X, AlertTriangle, Clock,
  PackageSearch, Boxes, TrendingDown, ArrowRight,
  Plus, Minus, Store, Warehouse, Globe,
  ChevronDown, ChevronUp, CheckCircle2, Settings,
} from 'lucide-react';
import {
  getInventoryStats, setStoreStock, setOnlineStock,
  setVariantStore, setVariantOnline,
  DEFAULT_CATEGORIES, DEFAULT_SIZES,
  getLowStockThreshold, saveSettings,
} from '../storage';

// ─── Category order helper ────────────────────────────────────────────────────
function sortedCategoryGroups(items) {
  const map = new Map();
  for (const item of items) {
    const cat = item.product.category || '其他';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push(item);
  }
  const keys = [...map.keys()].sort((a, b) => {
    const ai = DEFAULT_CATEGORIES.indexOf(a);
    const bi = DEFAULT_CATEGORIES.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b, 'zh-TW');
  });
  return keys.map(cat => ({ cat, items: map.get(cat) }));
}

// ─── Constants ────────────────────────────────────────────────────────────────
const FILTER_ALL     = 'all';
const FILTER_LOW     = 'low';
const FILTER_PENDING = 'pending';
const FILTER_STORE   = 'store';

// ─── Low-stock threshold settings panel ───────────────────────────────────────
function ThresholdPanel({ threshold, onSave, onClose }) {
  const [val, setVal] = useState(String(threshold));

  function handleSave() {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1) { onSave(n); onClose(); }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-4 mt-2 mx-4">
      <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
        <Settings size={12} /> 補貨預警門檻
      </p>
      <p className="text-[11px] text-gray-400 mb-3">
        總庫存低於此數量時顯示「補貨預警」標籤
      </p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={999}
          value={val}
          onChange={e => setVal(e.target.value)}
          className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center outline-none focus:border-brand-400"
        />
        <span className="text-sm text-gray-500">件</span>
        <button
          onClick={handleSave}
          className="ml-auto flex items-center gap-1 bg-brand-600 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-brand-700 active:scale-95 transition-all"
        >
          <CheckCircle2 size={12} /> 儲存
        </button>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────
function InventorySummary({ stats }) {
  const total     = stats.reduce((s, i) => s + i.totalStock,  0);
  const store     = stats.reduce((s, i) => s + i.storeStock,  0);
  const online    = stats.reduce((s, i) => s + i.onlineStock, 0);
  const warehouse = total - store - online;
  const storePct  = total > 0 ? Math.round((store   / total) * 100) : 0;
  const onlinePct = total > 0 ? Math.round((online  / total) * 100) : 0;
  const whPct     = 100 - storePct - onlinePct;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
      <p className="text-xs font-semibold text-gray-500 mb-3">庫存分布總覽</p>
      <div className="flex gap-1.5">
        {[
          { label: '總庫存', value: total,     className: total === 0 ? 'text-red-500' : 'text-gray-800', bg: 'bg-gray-50' },
          { label: '🏪 店面', value: store,     className: 'text-brand-600',  bg: 'bg-brand-50'  },
          { label: '🌐 網路', value: online,    className: 'text-purple-600', bg: 'bg-purple-50' },
          { label: '📦 倉庫', value: warehouse, className: 'text-blue-600',   bg: 'bg-blue-50'   },
        ].map(({ label, value, className, bg }) => (
          <div key={label} className={`flex-1 text-center ${bg} rounded-xl py-2.5`}>
            <p className={`text-xl font-black ${className}`}>{value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      {total > 0 && (
        <>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden flex">
            <div className="bg-brand-400 h-full transition-all duration-500"  style={{ width: `${storePct}%` }} />
            <div className="bg-purple-400 h-full transition-all duration-500" style={{ width: `${onlinePct}%` }} />
            <div className="bg-blue-300 h-full transition-all duration-500 flex-1" />
          </div>
          <div className="flex justify-between text-[10px] mt-1">
            <span className="text-brand-500  font-semibold">店 {storePct}%</span>
            <span className="text-purple-500 font-semibold">網 {onlinePct}%</span>
            <span className="text-blue-400   font-semibold">倉 {whPct}%</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Mini stock bar ───────────────────────────────────────────────────────────
function StockBar({ stock, threshold }) {
  const pct   = Math.min(100, (stock / Math.max(threshold * 4, 20)) * 100);
  const color = stock === 0 ? 'bg-red-500' : stock < threshold ? 'bg-orange-400' : 'bg-green-400';
  return (
    <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Channel stepper ──────────────────────────────────────────────────────────
function Stepper({ value, max, onDec, onInc, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onDec}
        disabled={value === 0}
        className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center active:scale-95 transition-all"
      >
        <Minus size={13} className="text-gray-600" />
      </button>
      <span className={`w-8 text-center text-sm font-black ${color}`}>{value}</span>
      <button
        onClick={onInc}
        disabled={value >= max}
        className={`w-8 h-8 rounded-xl disabled:opacity-30 flex items-center justify-center active:scale-95 transition-all ${color === 'text-brand-700' ? 'bg-brand-100 hover:bg-brand-200 text-brand-700' : 'bg-purple-100 hover:bg-purple-200 text-purple-700'}`}
      >
        <Plus size={13} />
      </button>
    </div>
  );
}

// ─── Variant allocation table ─────────────────────────────────────────────────
function VariantTable({ variants, draft, onUpdateStore, onUpdateOnline }) {
  if (!variants || variants.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-[10px] font-semibold text-gray-400 mb-2">按規格分配</p>

      <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 pb-1.5 border-b border-gray-100">
        <span className="flex-1">規格</span>
        <span className="w-6 text-center">總</span>
        <span className="w-[84px] text-center text-brand-400">🏪 店面</span>
        <span className="w-[84px] text-center text-purple-400">🌐 網路</span>
        <span className="w-6 text-center text-blue-400">倉</span>
      </div>

      {variants.map(v => {
        const d         = draft[v.key] ?? { store: v.store, online: v.online };
        const warehouse = Math.max(0, v.total - d.store - d.online);
        return (
          <div key={v.key} className="flex items-center gap-1 py-2 border-b border-gray-50 last:border-0">
            <div className="flex-1 flex items-center gap-1 flex-wrap min-w-0">
              {v.size  && <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 rounded-lg px-1.5 py-0.5 font-semibold">{v.size}</span>}
              {v.color && <span className="text-[10px] bg-pink-50 text-pink-600 border border-pink-200 rounded-lg px-1.5 py-0.5 font-semibold">{v.color}</span>}
              {!v.size && !v.color && <span className="text-[10px] text-gray-400">全規格</span>}
            </div>

            <span className="w-6 text-center text-xs font-bold text-gray-600">{v.total}</span>

            <div className="w-[84px] flex items-center justify-center gap-0.5">
              <button onClick={() => onUpdateStore(v.key, v.size, v.color, d.store - 1)} disabled={d.store === 0}
                className="w-6 h-6 rounded-lg bg-brand-50 text-brand-600 text-xs font-bold disabled:opacity-30 flex items-center justify-center active:scale-95">−</button>
              <span className="w-8 text-center text-xs font-black text-brand-700">{d.store}</span>
              <button onClick={() => onUpdateStore(v.key, v.size, v.color, d.store + 1)} disabled={d.store >= v.total - d.online}
                className="w-6 h-6 rounded-lg bg-brand-50 text-brand-600 text-xs font-bold disabled:opacity-30 flex items-center justify-center active:scale-95">+</button>
            </div>

            <div className="w-[84px] flex items-center justify-center gap-0.5">
              <button onClick={() => onUpdateOnline(v.key, v.size, v.color, d.online - 1)} disabled={d.online === 0}
                className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 text-xs font-bold disabled:opacity-30 flex items-center justify-center active:scale-95">−</button>
              <span className="w-8 text-center text-xs font-black text-purple-700">{d.online}</span>
              <button onClick={() => onUpdateOnline(v.key, v.size, v.color, d.online + 1)} disabled={d.online >= v.total - d.store}
                className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 text-xs font-bold disabled:opacity-30 flex items-center justify-center active:scale-95">+</button>
            </div>

            <span className="w-6 text-center text-xs font-bold text-blue-600">{warehouse}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Inventory card — collapsible ─────────────────────────────────────────────
function InventoryCard({ item, threshold, onSaveStore, onSaveOnline, onSaveVariantStore, onSaveVariantOnline }) {
  const {
    product, totalStock, storeStock, onlineStock, warehouseStock,
    avgCost, hasPending, sizeBreakdown = {}, variants = [],
  } = item;
  const hasVariants = variants.length > 0;
  const isZero    = totalStock === 0;
  const isLow     = totalStock > 0 && totalStock < threshold;
  // "店面缺貨" only meaningful when online channel has stock but store doesn't
  const storeEmpty = storeStock === 0 && onlineStock > 0;
  const storePct  = totalStock > 0 ? Math.round((storeStock  / totalStock) * 100) : 0;
  const onlinePct = totalStock > 0 ? Math.round((onlineStock / totalStock) * 100) : 0;
  const whPct     = 100 - storePct - onlinePct;

  const [expanded, setExpanded] = useState(false);

  const [draftStore,   setDraftStore]   = useState(storeStock);
  const [draftOnline,  setDraftOnline]  = useState(onlineStock);
  const [variantDraft, setVariantDraft] = useState({});

  function handleOpen() {
    setDraftStore(storeStock);
    setDraftOnline(onlineStock);
    setVariantDraft(
      Object.fromEntries(variants.map(v => [v.key, { store: v.store, online: v.online }]))
    );
    setExpanded(true);
  }

  function handleConfirm() {
    if (hasVariants) {
      variants.forEach(v => {
        const d = variantDraft[v.key] ?? { store: v.store, online: v.online };
        onSaveVariantStore(product.id, v.size, v.color, d.store);
        onSaveVariantOnline(product.id, v.size, v.color, d.online);
      });
    } else {
      onSaveStore(product.id, draftStore);
      onSaveOnline(product.id, draftOnline);
    }
    setExpanded(false);
  }

  function updateDraftStore(key, _size, _color, qty) {
    setVariantDraft(prev => {
      const v   = variants.find(x => x.key === key) ?? { total: 0 };
      const cur = prev[key] ?? { store: 0, online: 0 };
      return { ...prev, [key]: { ...cur, store: Math.max(0, Math.min(v.total - cur.online, qty)) } };
    });
  }
  function updateDraftOnline(key, _size, _color, qty) {
    setVariantDraft(prev => {
      const v   = variants.find(x => x.key === key) ?? { total: 0 };
      const cur = prev[key] ?? { store: 0, online: 0 };
      return { ...prev, [key]: { ...cur, online: Math.max(0, Math.min(v.total - cur.store, qty)) } };
    });
  }

  // ── COLLAPSED ────────────────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <button
        onClick={handleOpen}
        className={`w-full bg-white rounded-2xl border shadow-sm px-4 py-3 text-left active:scale-[0.99] transition-all ${
          isZero ? 'border-red-200' : isLow ? 'border-orange-200' : 'border-gray-100'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-bold text-gray-800 text-sm leading-tight">{product.name}</p>
              <span className="text-[10px] text-gray-400">{product.category}</span>
              {isZero && <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-2 py-0.5">已售罄</span>}
              {isLow && !isZero && <span className="text-[10px] font-bold text-orange-700 bg-orange-100 rounded-full px-2 py-0.5">補貨預警</span>}
              {hasPending && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">待收貨</span>}
            </div>
            <div className="flex items-center gap-2.5 mt-0.5 text-xs">
              <span className="text-brand-600  font-semibold">🏪 {storeStock}</span>
              <span className="text-purple-600 font-semibold">🌐 {onlineStock}</span>
              <span className="text-blue-600   font-semibold">📦 {warehouseStock}</span>
              <span className="text-gray-500">
                共 <span className="font-bold text-gray-700">{totalStock}</span> 件
              </span>
            </div>
            {totalStock > 0 && (
              <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="bg-brand-400  h-full" style={{ width: `${storePct}%` }} />
                <div className="bg-purple-400 h-full" style={{ width: `${onlinePct}%` }} />
                <div className="bg-blue-300   h-full flex-1" />
              </div>
            )}
          </div>
          <ChevronDown size={18} className="text-gray-300 shrink-0" />
        </div>
      </button>
    );
  }

  // ── EXPANDED ─────────────────────────────────────────────────────────────────
  return (
    <div className={`bg-white rounded-2xl border shadow-sm px-4 py-3.5 ${
      isZero ? 'border-red-200 bg-red-50/30' : isLow ? 'border-orange-200 bg-orange-50/20' : 'border-gray-100'
    }`}>

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-800 leading-tight">{product.name}</p>
            {isZero && <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-2 py-0.5">已售罄</span>}
            {isLow && !isZero && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-orange-700 bg-orange-100 rounded-full px-2 py-0.5">
                <AlertTriangle size={9} /> 補貨預警
              </span>
            )}
            {storeEmpty && (
              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 rounded-full px-2 py-0.5">店面缺貨</span>
            )}
            {hasPending && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                <Clock size={9} /> 待收貨
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{product.category}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className={`text-xl font-black leading-none ${isZero ? 'text-red-600' : isLow ? 'text-orange-500' : 'text-gray-800'}`}>
              {totalStock}<span className="text-xs font-normal text-gray-400 ml-0.5">件</span>
            </p>
            <p className="text-[10px] text-gray-400">總庫存</p>
          </div>
          <button
            onClick={() => setExpanded(false)}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <ChevronUp size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Three-channel tiles */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <div className={`rounded-xl px-2 py-2 text-center border ${storeEmpty ? 'bg-red-50 border-red-100' : 'bg-brand-50 border-brand-100'}`}>
          <p className={`text-[10px] font-medium mb-0.5 flex items-center justify-center gap-0.5 ${storeEmpty ? 'text-red-400' : 'text-brand-400'}`}>
            <Store size={9} /> 店面
          </p>
          <p className={`text-base font-black ${storeEmpty ? 'text-red-500' : 'text-brand-700'}`}>
            {storeStock}<span className="text-[10px] font-normal ml-0.5 opacity-60">件</span>
          </p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl px-2 py-2 text-center">
          <p className="text-[10px] text-purple-400 font-medium mb-0.5 flex items-center justify-center gap-0.5">
            <Globe size={9} /> 網路
          </p>
          <p className="text-base font-black text-purple-700">
            {onlineStock}<span className="text-[10px] font-normal text-purple-400 ml-0.5">件</span>
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-2 py-2 text-center">
          <p className="text-[10px] text-blue-400 font-medium mb-0.5 flex items-center justify-center gap-0.5">
            <Warehouse size={9} /> 倉庫
          </p>
          <p className="text-base font-black text-blue-700">
            {warehouseStock}<span className="text-[10px] font-normal text-blue-400 ml-0.5">件</span>
          </p>
        </div>
      </div>

      {/* Distribution bar */}
      {totalStock > 0 && (
        <>
          <div className="mt-2.5 h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
            <div className="bg-brand-400  h-full transition-all duration-300" style={{ width: `${storePct}%` }} />
            <div className="bg-purple-400 h-full transition-all duration-300" style={{ width: `${onlinePct}%` }} />
            <div className="bg-blue-300   h-full transition-all duration-300 flex-1" />
          </div>
          <div className="flex justify-between text-[10px] mt-0.5">
            <span className="text-brand-500">店 {storePct}%</span>
            <span className="text-purple-500">網 {onlinePct}%</span>
            <span className="text-blue-400">倉 {whPct}%</span>
          </div>
        </>
      )}

      {/* Cost + margin */}
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>成本：<span className="font-semibold text-gray-700 ml-0.5">NT${avgCost}</span></span>
          <span className="text-gray-300">|</span>
          <span>定價：<span className="font-semibold text-gray-700 ml-0.5">NT${product.defaultPrice}</span></span>
        </div>
        <StockBar stock={totalStock} threshold={threshold} />
      </div>
      {avgCost > 0 && product.defaultPrice > 0 && (
        <p className="text-xs text-green-600 mt-1">
          毛利率約 <span className="font-bold">
            {(((product.defaultPrice - avgCost) / product.defaultPrice) * 100).toFixed(1)}%
          </span>
        </p>
      )}

      {/* Size breakdown (only if no variants) */}
      {!hasVariants && (() => {
        const inOrder    = DEFAULT_SIZES.filter(s => (sizeBreakdown[s] ?? 0) > 0);
        const nonDefault = Object.keys(sizeBreakdown).filter(s => !DEFAULT_SIZES.includes(s) && sizeBreakdown[s] > 0);
        const sizes      = [...inOrder, ...nonDefault];
        return sizes.length > 0 ? (
          <div className="mt-2.5 pt-2.5 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 mb-1.5 font-medium">尺碼庫存</p>
            <div className="flex flex-wrap gap-1.5">
              {sizes.map(s => (
                <span key={s} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-2 py-0.5 font-semibold">
                  {s} <span className="opacity-60">×</span> {sizeBreakdown[s]}
                </span>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Allocation editor */}
      {totalStock > 0 && (
        hasVariants ? (
          <VariantTable
            variants={variants}
            draft={variantDraft}
            onUpdateStore={updateDraftStore}
            onUpdateOnline={updateDraftOnline}
          />
        ) : (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-brand-700">🏪 店面庫存</p>
                <p className="text-[10px] text-gray-400">最多可設 {totalStock - draftOnline} 件</p>
              </div>
              <Stepper
                value={draftStore}
                max={totalStock - draftOnline}
                onDec={() => setDraftStore(s => Math.max(0, s - 1))}
                onInc={() => setDraftStore(s => Math.min(totalStock - draftOnline, s + 1))}
                color="text-brand-700"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-purple-700">🌐 網路庫存</p>
                <p className="text-[10px] text-gray-400">最多可設 {totalStock - draftStore} 件</p>
              </div>
              <Stepper
                value={draftOnline}
                max={totalStock - draftStore}
                onDec={() => setDraftOnline(s => Math.max(0, s - 1))}
                onInc={() => setDraftOnline(s => Math.min(totalStock - draftStore, s + 1))}
                color="text-purple-700"
              />
            </div>
            <div className="bg-blue-50 rounded-xl px-3 py-2 flex justify-between items-center">
              <p className="text-xs text-blue-600">📦 倉庫（剩餘）</p>
              <p className="text-sm font-black text-blue-700">
                {Math.max(0, totalStock - draftStore - draftOnline)} 件
              </p>
            </div>
          </div>
        )
      )}

      {/* Confirm / Cancel */}
      {totalStock > 0 && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={() => setExpanded(false)}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white text-sm font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <CheckCircle2 size={15} /> 確認分配
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ searchTerm, filter, onClear }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <PackageSearch size={28} className="text-gray-300" />
      </div>
      {searchTerm ? (
        <>
          <p className="text-gray-500 font-semibold mb-1">找不到「{searchTerm}」相關商品</p>
          <p className="text-sm text-gray-400 mb-5">查無此商品，是否要新增採購？</p>
          <div className="flex gap-3">
            <button onClick={onClear} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
              清除搜尋
            </button>
            <Link to="/purchases" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 active:scale-95 transition-all">
              前往採購 <ArrowRight size={14} />
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="text-gray-500 font-semibold mb-1">
            {filter === FILTER_LOW     ? '目前沒有庫存不足的商品'  :
             filter === FILTER_PENDING ? '目前沒有待收貨的商品'    :
             filter === FILTER_STORE   ? '店面與網路庫存均已配置'  :
             '尚無庫存資料'}
          </p>
          <p className="text-sm text-gray-400 mb-5">
            {filter === FILTER_STORE ? '目前沒有「有網路庫存但店面為零」的商品' : '請先確認採購收貨以建立庫存'}
          </p>
          <Link to="/purchases" className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 active:scale-95 transition-all">
            前往採購管理 <ArrowRight size={14} />
          </Link>
        </>
      )}
    </div>
  );
}

// ─── Main Inventory page ──────────────────────────────────────────────────────
export default function Inventory() {
  const [searchTerm,    setSearchTerm]    = useState('');
  const [activeFilter,  setActiveFilter]  = useState(FILTER_ALL);
  const [refresh,       setRefresh]       = useState(0);
  const [threshold,     setThreshold]     = useState(() => getLowStockThreshold());
  const [showSettings,  setShowSettings]  = useState(false);

  const allStats = useMemo(() => getInventoryStats(), [refresh]);

  const totalItems          = allStats.length;
  const totalStock          = allStats.reduce((s, i) => s + i.totalStock,  0);
  const totalStoreStock     = allStats.reduce((s, i) => s + i.storeStock,  0);
  const totalOnlineStock    = allStats.reduce((s, i) => s + i.onlineStock, 0);
  const totalWarehouseStock = totalStock - totalStoreStock - totalOnlineStock;
  const lowCount            = allStats.filter(s => s.totalStock > 0 && s.stock < threshold).length;
  const pendingCount        = allStats.filter(s => s.hasPending).length;
  // "店面缺貨" = has online stock but store is empty (real channel imbalance)
  const storeEmptyCount     = allStats.filter(s => s.onlineStock > 0 && s.storeStock === 0).length;

  const tick = useCallback(() => setRefresh(r => r + 1), []);

  const handleSaveStore         = useCallback((id, qty)           => { setStoreStock(id, qty);             tick(); }, [tick]);
  const handleSaveOnline        = useCallback((id, qty)           => { setOnlineStock(id, qty);            tick(); }, [tick]);
  const handleSaveVariantStore  = useCallback((id, size, clr, qty) => { setVariantStore(id, size, clr, qty); tick(); }, [tick]);
  const handleSaveVariantOnline = useCallback((id, size, clr, qty) => { setVariantOnline(id, size, clr, qty); tick(); }, [tick]);

  function handleSaveThreshold(n) {
    saveSettings({ lowStockThreshold: n });
    setThreshold(n);
    tick();
  }

  const filteredInventory = useMemo(() => {
    let list = allStats;
    if (activeFilter === FILTER_LOW)     list = list.filter(s => s.totalStock > 0 && s.stock < threshold);
    if (activeFilter === FILTER_PENDING) list = list.filter(s => s.hasPending);
    // Fixed: only show items where online > 0 but store = 0 (real imbalance)
    if (activeFilter === FILTER_STORE)   list = list.filter(s => s.onlineStock > 0 && s.storeStock === 0);
    const term = searchTerm.trim().toLowerCase();
    if (term) list = list.filter(s =>
      s.product.name.toLowerCase().includes(term) ||
      s.product.category.toLowerCase().includes(term)
    );
    return list;
  }, [allStats, searchTerm, activeFilter, threshold]);

  const handleClear = useCallback(() => { setSearchTerm(''); setActiveFilter(FILTER_ALL); }, []);

  const filterBtns = [
    { key: FILTER_ALL,     label: '全部',    count: totalItems,      colorKey: 'brand'  },
    { key: FILTER_LOW,     label: '庫存不足', count: lowCount,        colorKey: 'orange' },
    { key: FILTER_STORE,   label: '店面缺貨', count: storeEmptyCount, colorKey: 'purple' },
    { key: FILTER_PENDING, label: '待收貨',  count: pendingCount,    colorKey: 'amber'  },
  ];
  const colorMap = {
    brand:  { active: 'bg-brand-600  text-white border-brand-600',  dot: 'bg-brand-400'  },
    orange: { active: 'bg-orange-500 text-white border-orange-500', dot: 'bg-orange-400' },
    purple: { active: 'bg-purple-500 text-white border-purple-500', dot: 'bg-purple-400' },
    amber:  { active: 'bg-amber-500  text-white border-amber-500',  dot: 'bg-amber-400'  },
  };

  return (
    <div className="flex flex-col pb-20 bg-gray-50 min-h-screen">

      {/* Sticky header */}
      <div className="bg-white px-4 pt-10 pb-4 shadow-sm sticky top-0 z-10">

        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Boxes size={20} className="text-brand-500" /> 庫存管理
          </h1>
          <div className="flex items-center gap-2">
            {/* Settings toggle */}
            <button
              onClick={() => setShowSettings(s => !s)}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${showSettings ? 'bg-brand-100 text-brand-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
            >
              <Settings size={16} />
            </button>
            <div className="flex items-end gap-2.5 text-right">
              <div>
                <p className="text-[10px] text-brand-400 leading-none">🏪 店面</p>
                <p className="text-base font-bold text-brand-600 leading-snug">
                  {totalStoreStock}<span className="text-[10px] font-normal ml-0.5">件</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] text-purple-400 leading-none">🌐 網路</p>
                <p className="text-base font-bold text-purple-600 leading-snug">
                  {totalOnlineStock}<span className="text-[10px] font-normal ml-0.5">件</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] text-blue-400 leading-none">📦 倉庫</p>
                <p className="text-base font-bold text-blue-600 leading-snug">
                  {totalWarehouseStock}<span className="text-[10px] font-normal ml-0.5">件</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 leading-none">總計</p>
                <p className="text-lg font-black text-gray-800 leading-snug">
                  {totalStock}<span className="text-xs font-normal ml-0.5">件</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="搜尋商品名稱或類別…"
            className="w-full bg-gray-100 rounded-2xl pl-9 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-300 transition-all placeholder-gray-400 text-gray-700"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-gray-300 hover:bg-gray-400 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={11} className="text-white" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 mt-3">
          {filterBtns.map(({ key, label, count, colorKey }) => {
            const isActive = activeFilter === key;
            const cm       = colorMap[colorKey];
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(isActive && key !== FILTER_ALL ? FILTER_ALL : key)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border text-[11px] font-semibold transition-all active:scale-95 ${
                  isActive ? cm.active : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {!isActive && count > 0 && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cm.dot}`} />}
                {label}
                <span className={`text-[10px] px-1 py-0.5 rounded-full font-bold shrink-0 ${
                  isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Threshold settings panel (below header) */}
      {showSettings && (
        <ThresholdPanel
          threshold={threshold}
          onSave={handleSaveThreshold}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* List */}
      <div className="px-4 pt-4 space-y-2.5">

        {activeFilter === FILTER_ALL && !searchTerm && <InventorySummary stats={allStats} />}

        {(searchTerm || activeFilter !== FILTER_ALL) && filteredInventory.length > 0 && (
          <div className="flex items-center justify-between text-xs text-gray-400 px-1">
            <span>找到 {filteredInventory.length} 項結果</span>
            <button onClick={handleClear} className="text-brand-500 font-semibold">清除篩選</button>
          </div>
        )}

        {activeFilter === FILTER_ALL && !searchTerm && lowCount > 0 && (
          <button
            onClick={() => setActiveFilter(FILTER_LOW)}
            className="w-full flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-left hover:bg-red-100 active:scale-[0.98] transition-all"
          >
            <TrendingDown size={18} className="text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-700">{lowCount} 件商品庫存不足（&lt;{threshold} 件）</p>
              <p className="text-xs text-red-500">點擊查看需要補貨的商品</p>
            </div>
            <ArrowRight size={16} className="text-red-400" />
          </button>
        )}

        {activeFilter === FILTER_ALL && !searchTerm && storeEmptyCount > 0 && (
          <button
            onClick={() => setActiveFilter(FILTER_STORE)}
            className="w-full flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-2xl px-4 py-3 text-left hover:bg-purple-100 active:scale-[0.98] transition-all"
          >
            <Store size={18} className="text-purple-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-purple-700">{storeEmptyCount} 件商品店面缺貨</p>
              <p className="text-xs text-purple-500">有網路庫存但店面庫存為零，點擊設定分配</p>
            </div>
            <ArrowRight size={16} className="text-purple-400" />
          </button>
        )}

        {/* Cards grouped by category */}
        {sortedCategoryGroups(filteredInventory).map(({ cat, items: groupItems }) => {
          const groupTotal  = groupItems.reduce((s, i) => s + i.totalStock,  0);
          const groupStore  = groupItems.reduce((s, i) => s + i.storeStock,  0);
          const groupOnline = groupItems.reduce((s, i) => s + i.onlineStock, 0);
          return (
            <div key={cat}>
              <div className="flex items-center justify-between px-1 mb-2 mt-3 first:mt-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-700">{cat}</span>
                  <span className="text-[10px] bg-gray-200 text-gray-500 rounded-full px-2 py-0.5 font-semibold">
                    {groupItems.length} 款
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                  <span className="text-brand-500 font-semibold">店 {groupStore}</span>
                  <span>·</span>
                  <span className="text-purple-500 font-semibold">網 {groupOnline}</span>
                  <span>·</span>
                  <span className="font-semibold text-gray-600">共 {groupTotal} 件</span>
                </div>
              </div>
              <div className="space-y-2">
                {groupItems.map(item => (
                  <InventoryCard
                    key={item.product.id}
                    item={item}
                    threshold={threshold}
                    onSaveStore={handleSaveStore}
                    onSaveOnline={handleSaveOnline}
                    onSaveVariantStore={handleSaveVariantStore}
                    onSaveVariantOnline={handleSaveVariantOnline}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {filteredInventory.length === 0 && (
          <EmptyState searchTerm={searchTerm} filter={activeFilter} onClear={handleClear} />
        )}
      </div>
    </div>
  );
}
