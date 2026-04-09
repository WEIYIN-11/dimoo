import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, X, AlertTriangle, Clock,
  PackageSearch, Boxes, TrendingDown, ArrowRight,
} from 'lucide-react';
import { getInventoryStats } from '../storage';

// ─── Constants ────────────────────────────────────────────────────────────────
const LOW_STOCK      = 5;
const FILTER_ALL     = 'all';
const FILTER_LOW     = 'low';
const FILTER_PENDING = 'pending';

// ─── Mini stock bar ───────────────────────────────────────────────────────────
function StockBar({ stock, max = 30 }) {
  const pct    = Math.min(100, (stock / max) * 100);
  const isZero = stock === 0;
  const isLow  = stock > 0 && stock < LOW_STOCK;
  const color  = isZero ? 'bg-red-500' : isLow ? 'bg-orange-400' : 'bg-green-400';
  return (
    <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Single inventory card ────────────────────────────────────────────────────
function InventoryCard({ item }) {
  const { product, stock, avgCost, hasPending } = item;
  const isZero = stock === 0;
  const isLow  = stock > 0 && stock < LOW_STOCK;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm px-4 py-3.5 transition-all ${
      isZero ? 'border-red-200 bg-red-50/30'
             : isLow ? 'border-orange-200 bg-orange-50/20'
             : 'border-gray-100'
    }`}>
      {/* Row 1 — name + status badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-800 leading-tight">{product.name}</p>
            {isZero && (
              <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-2 py-0.5">
                已售罄
              </span>
            )}
            {isLow && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-orange-700 bg-orange-100 rounded-full px-2 py-0.5">
                <AlertTriangle size={9} /> 補貨預警
              </span>
            )}
            {hasPending && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                <Clock size={9} /> 待收貨
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{product.category}</p>
        </div>

        {/* Current stock count */}
        <div className="text-right shrink-0">
          <p className={`text-xl font-black leading-none ${
            isZero ? 'text-red-600' : isLow ? 'text-orange-500' : 'text-gray-800'
          }`}>
            {stock}
            <span className="text-xs font-normal text-gray-400 ml-0.5">件</span>
          </p>
        </div>
      </div>

      {/* Row 2 — average purchase cost + stock bar */}
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>
            平均進貨成本：
            <span className="font-semibold text-gray-700 ml-0.5">NT${avgCost}</span>
          </span>
          <span className="text-gray-300">|</span>
          <span>
            定價：
            <span className="font-semibold text-gray-700 ml-0.5">NT${product.defaultPrice}</span>
          </span>
        </div>
        <StockBar stock={stock} />
      </div>

      {/* Row 3 — margin hint */}
      {avgCost > 0 && (
        <p className="text-xs text-green-600 mt-1">
          毛利率約{' '}
          <span className="font-bold">
            {(((product.defaultPrice - avgCost) / product.defaultPrice) * 100).toFixed(1)}%
          </span>
        </p>
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
        /* ── keyword returned nothing ── */
        <>
          <p className="text-gray-500 font-semibold mb-1">
            找不到「{searchTerm}」相關商品
          </p>
          <p className="text-sm text-gray-400 mb-5">
            查無此商品，是否要新增採購？
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClear}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
            >
              清除搜尋
            </button>
            <Link
              to="/purchases"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 active:scale-95 transition-all"
            >
              前往採購 <ArrowRight size={14} />
            </Link>
          </div>
        </>
      ) : (
        /* ── filter returned nothing ── */
        <>
          <p className="text-gray-500 font-semibold mb-1">
            {filter === FILTER_LOW     ? '目前沒有庫存不足的商品' :
             filter === FILTER_PENDING ? '目前沒有待收貨的商品'   :
             '尚無庫存資料'}
          </p>
          <p className="text-sm text-gray-400 mb-5">請先確認採購收貨以建立庫存</p>
          <Link
            to="/purchases"
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 active:scale-95 transition-all"
          >
            前往採購管理 <ArrowRight size={14} />
          </Link>
        </>
      )}
    </div>
  );
}

// ─── Main Inventory page ──────────────────────────────────────────────────────
export default function Inventory() {
  // 1. searchTerm state — drives the search bar
  const [searchTerm, setSearchTerm] = useState('');

  // 2. active quick-filter
  const [activeFilter, setActiveFilter] = useState(FILTER_ALL);

  // Full list from LocalStorage
  const allStats = useMemo(() => getInventoryStats(), []);

  // Badge counts for filter buttons
  const lowCount     = allStats.filter(s => s.stock < LOW_STOCK).length;
  const pendingCount = allStats.filter(s => s.hasPending).length;
  const totalItems   = allStats.length;
  const totalStock   = allStats.reduce((sum, s) => sum + s.stock, 0);

  // 3. filteredInventory — applies quick-filter THEN searchTerm
  const filteredInventory = useMemo(() => {
    let list = allStats;

    // Quick-filter step
    if (activeFilter === FILTER_LOW)     list = list.filter(s => s.stock < LOW_STOCK);
    if (activeFilter === FILTER_PENDING) list = list.filter(s => s.hasPending);

    // Keyword search step (case-insensitive, matches name or category)
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(s =>
        s.product.name.toLowerCase().includes(term) ||
        s.product.category.toLowerCase().includes(term)
      );
    }

    return list;
  }, [allStats, searchTerm, activeFilter]);

  // Clear both search + filter
  const handleClear = useCallback(() => {
    setSearchTerm('');
    setActiveFilter(FILTER_ALL);
  }, []);

  // Filter button config
  const filterBtns = [
    { key: FILTER_ALL,     label: '全部',    count: totalItems,   colorKey: 'brand'  },
    { key: FILTER_LOW,     label: '庫存不足', count: lowCount,     colorKey: 'orange' },
    { key: FILTER_PENDING, label: '待收貨',  count: pendingCount, colorKey: 'amber'  },
  ];

  const colorMap = {
    brand:  { active: 'bg-brand-600  text-white border-brand-600',  dot: 'bg-brand-400'  },
    orange: { active: 'bg-orange-500 text-white border-orange-500', dot: 'bg-orange-400' },
    amber:  { active: 'bg-amber-500  text-white border-amber-500',  dot: 'bg-amber-400'  },
  };

  return (
    <div className="flex flex-col pb-20 bg-gray-50 min-h-screen">

      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <div className="bg-white px-4 pt-10 pb-4 shadow-sm sticky top-0 z-10">

        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Boxes size={20} className="text-brand-500" /> 庫存管理
          </h1>
          <div className="text-right">
            <p className="text-xs text-gray-400">庫存總量</p>
            <p className="text-lg font-black text-gray-800">{totalStock} 件</p>
          </div>
        </div>

        {/* ── Search bar (value + onChange bound to searchTerm) ─────── */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchTerm}                            {/* ← bound to searchTerm */}
            onChange={e => setSearchTerm(e.target.value)} {/* ← updates searchTerm  */}
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

        {/* ── Quick filter chips ─────────────────────────────────────── */}
        <div className="flex gap-2 mt-3">
          {filterBtns.map(({ key, label, count, colorKey }) => {
            const isActive = activeFilter === key;
            const cm       = colorMap[colorKey];
            return (
              <button
                key={key}
                onClick={() =>
                  setActiveFilter(isActive && key !== FILTER_ALL ? FILTER_ALL : key)
                }
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                  isActive ? cm.active : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {!isActive && count > 0 && (
                  <span className={`w-1.5 h-1.5 rounded-full ${cm.dot}`} />
                )}
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── List area ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 space-y-2.5">

        {/* Result count row */}
        {(searchTerm || activeFilter !== FILTER_ALL) && filteredInventory.length > 0 && (
          <div className="flex items-center justify-between text-xs text-gray-400 px-1">
            <span>找到 {filteredInventory.length} 項結果</span>
            <button onClick={handleClear} className="text-brand-500 font-semibold">
              清除篩選
            </button>
          </div>
        )}

        {/* Low-stock urgent banner (shown only in "全部" default view) */}
        {activeFilter === FILTER_ALL && !searchTerm && lowCount > 0 && (
          <button
            onClick={() => setActiveFilter(FILTER_LOW)}
            className="w-full flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-left hover:bg-red-100 active:scale-[0.98] transition-all"
          >
            <TrendingDown size={18} className="text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-700">
                {lowCount} 件商品庫存不足
              </p>
              <p className="text-xs text-red-500">點擊查看需要補貨的商品</p>
            </div>
            <ArrowRight size={16} className="text-red-400" />
          </button>
        )}

        {/* 4. Render filteredInventory ── not allStats */}
        {filteredInventory.map(item => (
          <InventoryCard key={item.product.id} item={item} />
        ))}

        {/* Empty state */}
        {filteredInventory.length === 0 && (
          <EmptyState
            searchTerm={searchTerm}
            filter={activeFilter}
            onClear={handleClear}
          />
        )}
      </div>
    </div>
  );
}
