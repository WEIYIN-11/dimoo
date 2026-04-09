import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  todaySales, monthSales, computeStats,
  salesByCategory, dailyRevenueLast30Days,
  getInventoryStats,
} from '../storage';
import { AlertTriangle, BoxIcon } from 'lucide-react';

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

// ─── Inventory stats block ────────────────────────────────────────────────────
function InventoryBlock() {
  const stats   = useMemo(getInventoryStats, []);
  const lowItems = stats.filter(s => s.stock < LOW_STOCK);
  const okItems  = stats.filter(s => s.stock >= LOW_STOCK);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-500 flex items-center gap-1.5">
          <BoxIcon size={14} /> 庫存統計
        </h2>
        <span className="text-xs text-gray-400">{stats.length} 種商品</span>
      </div>

      {/* Low-stock warnings */}
      {lowItems.length > 0 && (
        <div className="mx-4 mb-3 bg-red-50 border border-red-200 rounded-2xl px-3 py-2.5 space-y-1.5">
          <p className="text-xs font-bold text-red-600 flex items-center gap-1">
            <AlertTriangle size={13} /> 補貨預警（庫存 &lt; {LOW_STOCK} 件）
          </p>
          {lowItems.map(({ product, stock }) => (
            <div key={product.id} className="flex items-center justify-between text-xs">
              <span className="text-red-700 font-semibold">{product.name}</span>
              <span className="font-bold text-red-600">
                {stock === 0 ? '已售罄' : `剩 ${stock} 件`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Full inventory table */}
      <div className="divide-y divide-gray-50">
        {stats.map(({ product, stock }) => {
          const isLow  = stock < LOW_STOCK;
          const isZero = stock === 0;
          return (
            <div key={product.id} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{product.name}</p>
                <p className="text-xs text-gray-400">{product.category}</p>
              </div>
              <div className="text-right ml-2">
                <p className={`text-sm font-bold ${
                  isZero ? 'text-red-600' : isLow ? 'text-orange-500' : 'text-gray-800'
                }`}>
                  {isZero ? '0 件' : `${stock} 件`}
                </p>
                {isLow && !isZero && (
                  <p className="text-xs text-red-500 font-semibold">補貨預警</p>
                )}
                {isZero && (
                  <p className="text-xs text-red-600 font-bold">已售罄</p>
                )}
              </div>
              {/* Mini stock bar */}
              <div className="ml-3 w-16">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isZero ? 'bg-red-500' : isLow ? 'bg-orange-400' : 'bg-green-400'
                    }`}
                    style={{ width: `${Math.min(100, (stock / 30) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {stats.length === 0 && (
          <p className="text-center text-gray-300 text-sm py-6">
            尚無庫存資料，請先確認採購收貨
          </p>
        )}
      </div>
    </div>
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
