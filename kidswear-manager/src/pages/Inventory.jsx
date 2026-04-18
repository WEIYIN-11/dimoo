import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, X, AlertTriangle, Clock,
  PackageSearch, Boxes, TrendingDown, ArrowRight,
  Plus, Minus, Store, Warehouse, Globe,
} from 'lucide-react';
import {
  getInventoryStats, setStoreStock, setOnlineStock,
  setVariantStore, setVariantOnline,
  DEFAULT_CATEGORIES, DEFAULT_SIZES,
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
const LOW_STOCK      = 5;
const FILTER_ALL     = 'all';
const FILTER_LOW     = 'low';
const FILTER_PENDING = 'pending';
const FILTER_STORE   = 'store';

// ─── Summary card at top of list ─────────────────────────────────────────────
function InventorySummary({ stats }) {
  const total     = stats.reduce((s, i) => s + i.totalStock,     0);
  const store     = stats.reduce((s, i) => s + i.storeStock,     0);
  const online    = stats.reduce((s, i) => s + i.onlineStock,    0);
  const warehouse = total - store - online;
  const storePct  = total > 0 ? Math.round((store   / total) * 100) : 0;
  const onlinePct = total > 0 ? Math.round((online  / total) * 100) : 0;
  const whPct     = 100 - storePct - onlinePct;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
      <p className="text-xs font-semibold text-gray-500 mb-3">庫存分布總覽</p>

      {/* Four-column totals */}
      <div className="flex gap-1.5">
        <div className="flex-1 text-center bg-gray-50 rounded-xl py-2.5">
          <p className={`text-xl font-black ${total === 0 ? 'text-red-500' : 'text-gray-800'}`}>{total}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">總庫存</p>
        </div>
        <div className="flex-1 text-center bg-brand-50 rounded-xl py-2.5">
          <p className="text-xl font-black text-brand-600">{store}</p>
          <p className="text-[10px] text-brand-400 mt-0.5">🏪 店面</p>
        </div>
        <div className="flex-1 text-center bg-purple-50 rounded-xl py-2.5">
          <p className="text-xl font-black text-purple-600">{online}</p>
          <p className="text-[10px] text-purple-400 mt-0.5">🌐 網路</p>
        </div>
        <div className="flex-1 text-center bg-blue-50 rounded-xl py-2.5">
          <p className="text-xl font-black text-blue-600">{warehouse}</p>
          <p className="text-[10px] text-blue-400 mt-0.5">📦 倉庫</p>
        </div>
      </div>

      {/* 3-segment distribution bar */}
      {total > 0 && (
        <>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden flex">
            <div className="bg-brand-400 h-full transition-all duration-500" style={{ width: `${storePct}%` }} />
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
function StockBar({ stock, max = 30 }) {
  const pct    = Math.min(100, (stock / max) * 100);
  const isZero = stock === 0;
  const isLow  = stock > 0 && stock < LOW_STOCK;
  const color  = isZero ? 'bg-red-500' : isLow ? 'bg-orange-400' : 'bg-green-400';
  return (
    <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Channel adjuster row ─────────────────────────────────────────────────────
function ChannelAdjuster({ label, icon, value, max, onDecrement, onIncrement, color }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-xs font-semibold ${color.text}`}>{label}</p>
        <p className="text-[10px] text-gray-400">
          {max - value > 0 ? `最多可設 ${max} 件` : '已達上限'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onDecrement}
          disabled={value === 0}
          className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center active:scale-95 transition-all"
        >
          <Minus size={13} className="text-gray-600" />
        </button>
        <span className="w-7 text-center text-sm font-black text-gray-800">{value}</span>
        <button
          onClick={onIncrement}
          disabled={value >= max}
          className={`w-8 h-8 rounded-xl disabled:opacity-30 flex items-center justify-center active:scale-95 transition-all ${color.btn}`}
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Per-variant channel table ────────────────────────────────────────────────
function VariantTable({ variants, productId, onSetStore, onSetOnline }) {
  if (!variants || variants.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-[10px] font-semibold text-gray-400 mb-2">尺碼 / 花色庫存分配</p>

      {/* Header row */}
      <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 pb-1.5 border-b border-gray-100">
        <span className="flex-1">規格</span>
        <span className="w-7 text-center">總</span>
        <span className="w-[76px] text-center text-brand-400">🏪 店面</span>
        <span className="w-[76px] text-center text-purple-400">🌐 網路</span>
        <span className="w-7 text-center text-blue-400">倉</span>
      </div>

      {/* Variant rows */}
      {variants.map(v => (
        <div key={v.key} className="flex items-center gap-1 py-2 border-b border-gray-50 last:border-0">
          {/* Spec badges */}
          <div className="flex-1 flex items-center gap-1 flex-wrap min-w-0">
            {v.size  && <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 rounded-lg px-1.5 py-0.5 font-semibold">{v.size}</span>}
            {v.color && <span className="text-[10px] bg-pink-50  text-pink-600  border border-pink-200  rounded-lg px-1.5 py-0.5 font-semibold">{v.color}</span>}
            {!v.size && !v.color && <span className="text-[10px] text-gray-400">全規格</span>}
          </div>

          {/* Total */}
          <span className="w-7 text-center text-xs font-bold text-gray-600">{v.total}</span>

          {/* Store stepper */}
          <div className="w-[76px] flex items-center justify-center gap-0.5">
            <button
              onClick={() => onSetStore(productId, v.size, v.color, v.store - 1)}
              disabled={v.store === 0}
              className="w-5 h-5 rounded-md bg-brand-50 text-brand-600 text-xs font-bold disabled:opacity-30 flex items-center justify-center active:scale-95"
            >-</button>
            <span className="w-7 text-center text-xs font-black text-brand-700">{v.store}</span>
            <button
              onClick={() => onSetStore(productId, v.size, v.color, v.store + 1)}
              disabled={v.store >= v.total - v.online}
              className="w-5 h-5 rounded-md bg-brand-50 text-brand-600 text-xs font-bold disabled:opacity-30 flex items-center justify-center active:scale-95"
            >+</button>
          </div>

          {/* Online stepper */}
          <div className="w-[76px] flex items-center justify-center gap-0.5">
            <button
              onClick={() => onSetOnline(productId, v.size, v.color, v.online - 1)}
              disabled={v.online === 0}
              className="w-5 h-5 rounded-md bg-purple-50 text-purple-600 text-xs font-bold disabled:opacity-30 flex items-center justify-center active:scale-95"
            >-</button>
            <span className="w-7 text-center text-xs font-black text-purple-700">{v.online}</span>
            <button
              onClick={() => onSetOnline(productId, v.size, v.color, v.online + 1)}
              disabled={v.online >= v.total - v.store}
              className="w-5 h-5 rounded-md bg-purple-50 text-purple-600 text-xs font-bold disabled:opacity-30 flex items-center justify-center active:scale-95"
            >+</button>
          </div>

          {/* Warehouse */}
          <span className="w-7 text-center text-xs font-bold text-blue-600">{v.warehouse}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Single inventory card ────────────────────────────────────────────────────
function InventoryCard({ item, onTransferStore, onTransferOnline, onSetVariantStore, onSetVariantOnline }) {
  const {
    product, totalStock, storeStock, onlineStock, warehouseStock,
    avgCost, hasPending, sizeBreakdown = {}, variants = [],
  } = item;
  const hasVariants = variants.length > 0;
  const isZero     = totalStock === 0;
  const isLow      = totalStock > 0 && totalStock < LOW_STOCK;
  const storeEmpty = storeStock === 0 && totalStock > 0;

  const storePct  = totalStock > 0 ? Math.round((storeStock  / totalStock) * 100) : 0;
  const onlinePct = totalStock > 0 ? Math.round((onlineStock / totalStock) * 100) : 0;
  const whPct     = 100 - storePct - onlinePct;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm px-4 py-3.5 transition-all ${
      isZero ? 'border-red-200 bg-red-50/30'
             : isLow ? 'border-orange-200 bg-orange-50/20'
             : 'border-gray-100'
    }`}>

      {/* Row 1 — name + badges + total */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-800 leading-tight">{product.name}</p>
            {isZero && (
              <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-2 py-0.5">已售罄</span>
            )}
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
        <div className="text-right shrink-0">
          <p className={`text-xl font-black leading-none ${
            isZero ? 'text-red-600' : isLow ? 'text-orange-500' : 'text-gray-800'
          }`}>
            {totalStock}<span className="text-xs font-normal text-gray-400 ml-0.5">件</span>
          </p>
          <p className="text-[10px] text-gray-400">總庫存</p>
        </div>
      </div>

      {/* Row 2 — three-channel tiles */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <div className={`rounded-xl px-2 py-2 text-center border ${
          storeEmpty ? 'bg-red-50 border-red-100' : 'bg-brand-50 border-brand-100'
        }`}>
          <p className={`text-[10px] font-medium mb-0.5 flex items-center justify-center gap-0.5 ${
            storeEmpty ? 'text-red-400' : 'text-brand-400'
          }`}>
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

      {/* Row 3 — 3-segment distribution bar */}
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

      {/* Row 4 — cost + margin */}
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>成本：<span className="font-semibold text-gray-700 ml-0.5">NT${avgCost}</span></span>
          <span className="text-gray-300">|</span>
          <span>定價：<span className="font-semibold text-gray-700 ml-0.5">NT${product.defaultPrice}</span></span>
        </div>
        <StockBar stock={totalStock} />
      </div>
      {avgCost > 0 && (
        <p className="text-xs text-green-600 mt-1">
          毛利率約 <span className="font-bold">
            {(((product.defaultPrice - avgCost) / product.defaultPrice) * 100).toFixed(1)}%
          </span>
        </p>
      )}

      {/* Row 5 — size breakdown */}
      {(() => {
        const inOrder    = DEFAULT_SIZES.filter(s => (sizeBreakdown[s] ?? 0) > 0);
        const nonDefault = Object.keys(sizeBreakdown).filter(s => !DEFAULT_SIZES.includes(s) && sizeBreakdown[s] > 0);
        const sizes = [...inOrder, ...nonDefault];
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

      {/* Row 6 — channel adjusters (per-variant when available, aggregate otherwise) */}
      {totalStock > 0 && (
        hasVariants ? (
          <VariantTable
            variants={variants}
            productId={product.id}
            onSetStore={onSetVariantStore}
            onSetOnline={onSetVariantOnline}
          />
        ) : (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
            <ChannelAdjuster
              label="設定店面庫存"
              icon={Store}
              value={storeStock}
              max={totalStock - onlineStock}
              onDecrement={() => onTransferStore(product.id, storeStock - 1)}
              onIncrement={() => onTransferStore(product.id, storeStock + 1)}
              color={{ text: 'text-brand-700', btn: 'bg-brand-100 hover:bg-brand-200 text-brand-700' }}
            />
            <ChannelAdjuster
              label="設定網路庫存"
              icon={Globe}
              value={onlineStock}
              max={totalStock - storeStock}
              onDecrement={() => onTransferOnline(product.id, onlineStock - 1)}
              onIncrement={() => onTransferOnline(product.id, onlineStock + 1)}
              color={{ text: 'text-purple-700', btn: 'bg-purple-100 hover:bg-purple-200 text-purple-700' }}
            />
          </div>
        )
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
             filter === FILTER_STORE   ? '店面商品庫存充足'        :
             '尚無庫存資料'}
          </p>
          <p className="text-sm text-gray-400 mb-5">
            {filter === FILTER_STORE ? '所有商品皆已備有店面庫存' : '請先確認採購收貨以建立庫存'}
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
  const [searchTerm,   setSearchTerm]   = useState('');
  const [activeFilter, setActiveFilter] = useState(FILTER_ALL);
  const [refresh,      setRefresh]      = useState(0);

  const allStats = useMemo(() => getInventoryStats(), [refresh]);

  const totalItems          = allStats.length;
  const totalStock          = allStats.reduce((s, i) => s + i.totalStock,     0);
  const totalStoreStock     = allStats.reduce((s, i) => s + i.storeStock,     0);
  const totalOnlineStock    = allStats.reduce((s, i) => s + i.onlineStock,    0);
  const totalWarehouseStock = totalStock - totalStoreStock - totalOnlineStock;
  const lowCount            = allStats.filter(s => s.stock < LOW_STOCK).length;
  const pendingCount        = allStats.filter(s => s.hasPending).length;
  const storeEmptyCount     = allStats.filter(s => s.storeStock === 0 && s.totalStock > 0).length;

  const tick = useCallback(() => setRefresh(r => r + 1), []);

  const handleTransferStore = useCallback((productId, qty) => {
    setStoreStock(productId, qty);
    tick();
  }, [tick]);

  const handleTransferOnline = useCallback((productId, qty) => {
    setOnlineStock(productId, qty);
    tick();
  }, [tick]);

  const handleSetVariantStore = useCallback((productId, size, color, qty) => {
    setVariantStore(productId, size, color, qty);
    tick();
  }, [tick]);

  const handleSetVariantOnline = useCallback((productId, size, color, qty) => {
    setVariantOnline(productId, size, color, qty);
    tick();
  }, [tick]);

  const filteredInventory = useMemo(() => {
    let list = allStats;
    if (activeFilter === FILTER_LOW)     list = list.filter(s => s.stock < LOW_STOCK);
    if (activeFilter === FILTER_PENDING) list = list.filter(s => s.hasPending);
    if (activeFilter === FILTER_STORE)   list = list.filter(s => s.storeStock === 0 && s.totalStock > 0);
    const term = searchTerm.trim().toLowerCase();
    if (term) list = list.filter(s =>
      s.product.name.toLowerCase().includes(term) ||
      s.product.category.toLowerCase().includes(term)
    );
    return list;
  }, [allStats, searchTerm, activeFilter]);

  const handleClear = useCallback(() => {
    setSearchTerm('');
    setActiveFilter(FILTER_ALL);
  }, []);

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

      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <div className="bg-white px-4 pt-10 pb-4 shadow-sm sticky top-0 z-10">

        {/* Title + four totals */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Boxes size={20} className="text-brand-500" /> 庫存管理
          </h1>
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

        {/* Search bar */}
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

      {/* ── List area ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 space-y-2.5">

        {activeFilter === FILTER_ALL && !searchTerm && (
          <InventorySummary stats={allStats} />
        )}

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
              <p className="text-sm font-bold text-red-700">{lowCount} 件商品庫存不足</p>
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
              <p className="text-xs text-purple-500">點擊查看並設定店面庫存</p>
            </div>
            <ArrowRight size={16} className="text-purple-400" />
          </button>
        )}

        {/* Inventory cards grouped by category */}
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
              <div className="space-y-2.5">
                {groupItems.map(item => (
                  <InventoryCard
                    key={item.product.id}
                    item={item}
                    onTransferStore={handleTransferStore}
                    onTransferOnline={handleTransferOnline}
                    onSetVariantStore={handleSetVariantStore}
                    onSetVariantOnline={handleSetVariantOnline}
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
