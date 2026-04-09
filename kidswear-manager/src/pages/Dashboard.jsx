import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  todaySales, monthSales, computeStats,
  salesByCategory, dailyRevenueLast30Days,
  getInventoryStats,
} from '../storage';
import { AlertTriangle, Boxes, ArrowRight } from 'lucide-react';

const PIE_COLORS = ['#c026d3','#7c3aed','#2563eb','#0891b2','#059669','#d97706','#dc2626','#db2777'];
const LOW_STOCK  = 5;

// ─── Small reusable components ────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent }) {
  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border ${accent ? 'border-brand-200' : 'border-gray-100'}`}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="text-sm font-semibold text-gray-500 mb-3">{children}</h2>;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow text-xs">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-brand-600 font-bold">NT${payload[0].value?.toLocaleString()}</p>
    </div>
  );
};

// ─── Inventory summary card (links to full /inventory page) ──────────────────
function InventoryBlock() {
  const stats    = useMemo(getInventoryStats, []);
  const lowItems = stats.filter(s => s.stock < LOW_STOCK);
  const total    = stats.reduce((s, i) => s + i.stock, 0);

  return (
    <Link
      to="/inventory"
      className="block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:border-brand-200 active:scale-[0.98] transition-all"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-600 flex items-center gap-1.5">
          <Boxes size={15} className="text-brand-500" /> 庫存概況
        </h2>
        <span className="flex items-center gap-1 text-xs text-brand-500 font-semibold">
          查看詳情 <ArrowRight size={13} />
        </span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
        <div className="px-3 py-3 text-center">
          <p className="text-xs text-gray-400 mb-0.5">總庫存</p>
          <p className="text-lg font-black text-gray-800">{total}</p>
          <p className="text-[10px] text-gray-400">件</p>
        </div>
        <div className="px-3 py-3 text-center">
          <p className="text-xs text-gray-400 mb-0.5">商品種類</p>
          <p className="text-lg font-black text-gray-800">{stats.length}</p>
          <p className="text-[10px] text-gray-400">種</p>
        </div>
        <div className="px-3 py-3 text-center">
          <p className="text-xs text-gray-400 mb-0.5">補貨預警</p>
          <p className={`text-lg font-black ${lowItems.length > 0 ? 'text-red-500' : 'text-gray-800'}`}>
            {lowItems.length}
          </p>
          <p className="text-[10px] text-gray-400">項</p>
        </div>
      </div>

      {/* Low stock preview */}
      {lowItems.length > 0 && (
        <div className="mx-4 mb-3 mt-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 space-y-1">
          <p className="text-xs font-bold text-red-600 flex items-center gap-1">
            <AlertTriangle size={11} /> 需要補貨的商品
          </p>
          {lowItems.slice(0, 3).map(({ product, stock }) => (
            <div key={product.id} className="flex justify-between text-xs">
              <span className="text-red-700 font-medium">{product.name}</span>
              <span className="font-bold text-red-600">
                {stock === 0 ? '已售罄' : `剩 ${stock} 件`}
              </span>
            </div>
          ))}
          {lowItems.length > 3 && (
            <p className="text-xs text-red-400 text-right">還有 {lowItems.length - 3} 項…</p>
          )}
        </div>
      )}
    </Link>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const today  = useMemo(todaySales,  []);
  const month  = useMemo(monthSales,  []);
  const daily  = useMemo(dailyRevenueLast30Days, []);

  const todayStats = computeStats(today);
  const monthStats = computeStats(month);
  const todayCat   = salesByCategory(today);
  const monthCat   = salesByCategory(month);

  return (
    <div className="flex flex-col pb-20 pt-10 px-4 gap-5">
      <h1 className="text-xl font-bold text-gray-800">儀表板</h1>

      {/* ── 庫存統計（最重要，放最上面）───────────────────────── */}
      <InventoryBlock />

      {/* ── 今日概覽 ─────────────────────────────────────────── */}
      <div>
        <SectionTitle>今日概覽</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="今日營業額" value={`NT$${todayStats.revenue.toLocaleString()}`} accent />
          <KpiCard label="今日毛利"   value={`NT$${todayStats.profit.toLocaleString()}`} />
          <KpiCard label="今日成本"   value={`NT$${todayStats.cost.toLocaleString()}`} />
          <KpiCard label="今日毛利率" value={`${todayStats.margin}%`} sub="(毛利 / 營業額)" />
        </div>
      </div>

      {/* ── 本月概覽 ─────────────────────────────────────────── */}
      <div>
        <SectionTitle>本月概覽</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="本月營業額" value={`NT$${monthStats.revenue.toLocaleString()}`} accent />
          <KpiCard label="本月毛利"   value={`NT$${monthStats.profit.toLocaleString()}`} />
          <KpiCard label="本月成本"   value={`NT$${monthStats.cost.toLocaleString()}`} />
          <KpiCard label="本月毛利率" value={`${monthStats.margin}%`} sub={`共 ${month.length} 筆`} />
        </div>
      </div>

      {/* ── 近 30 天長條圖 ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <SectionTitle>近 30 天每日營業額</SectionTitle>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} interval={4} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" fill="#c026d3" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── 今日類別圓餅 ──────────────────────────────────────── */}
      {todayCat.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <SectionTitle>今日各類別業績</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={todayCat}
                dataKey="revenue"
                nameKey="name"
                cx="50%" cy="45%"
                outerRadius={75}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {todayCat.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {todayCat.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-gray-700">{c.name}</span>
                </div>
                <span className="font-semibold text-gray-800">NT${c.revenue.toLocaleString()} ({c.qty}件)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 本月類別排行 ──────────────────────────────────────── */}
      {monthCat.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <SectionTitle>本月各類別業績排行</SectionTitle>
          <ResponsiveContainer width="100%" height={monthCat.length * 44 + 20}>
            <BarChart layout="vertical" data={monthCat} margin={{ top: 4, right: 40, left: 10, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#4b5563' }} width={60} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                {monthCat.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {month.length === 0 && (
        <div className="flex flex-col items-center justify-center text-gray-300 py-10">
          <p className="text-sm">尚無銷售資料，新增第一筆銷售後即可看到圖表</p>
        </div>
      )}
    </div>
  );
}
