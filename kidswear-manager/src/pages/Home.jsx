import { useState, useCallback } from 'react';
import { PlusCircle, TrendingUp, ShoppingBag, DollarSign } from 'lucide-react';
import SaleModal from '../components/SaleModal';
import { todaySales, computeStats } from '../storage';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-400 leading-none mb-0.5">{label}</p>
        <p className="text-lg font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [refresh, setRefresh]     = useState(0);

  const reload = useCallback(() => setRefresh(r => r + 1), []);

  const sales = todaySales();
  const { revenue, profit, margin } = computeStats(sales);

  const today = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

  return (
    <div className="flex flex-col flex-1 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-700 to-brand-500 px-5 pt-12 pb-8 text-white rounded-b-3xl shadow-md">
        <p className="text-brand-200 text-sm mb-1">{today}</p>
        <h1 className="text-2xl font-bold">童裝店營收管理</h1>
        <p className="text-brand-200 text-sm mt-1">今日已完成 {sales.length} 筆銷售</p>
      </div>

      {/* Stats */}
      <div className="px-4 -mt-4 grid grid-cols-2 gap-3">
        <StatCard
          icon={DollarSign}
          label="今日營業額"
          value={`NT$${revenue.toLocaleString()}`}
          color="bg-brand-500"
        />
        <StatCard
          icon={TrendingUp}
          label="今日毛利率"
          value={`${margin}%`}
          color="bg-green-500"
        />
        <StatCard
          icon={ShoppingBag}
          label="今日毛利"
          value={`NT$${profit.toLocaleString()}`}
          color="bg-blue-500"
        />
        <StatCard
          icon={ShoppingBag}
          label="今日筆數"
          value={`${sales.length} 筆`}
          color="bg-orange-400"
        />
      </div>

      {/* CTA Button */}
      <div className="px-4 mt-6">
        <button
          onClick={() => setModalOpen(true)}
          className="w-full bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold text-xl py-5 rounded-3xl shadow-lg flex items-center justify-center gap-3 transition-all"
        >
          <PlusCircle size={28} strokeWidth={2.2} />
          新增今日銷售
        </button>
      </div>

      {/* Today's sales list */}
      {sales.length > 0 && (
        <div className="px-4 mt-6">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">今日銷售明細</h2>
          <div className="space-y-2">
            {[...sales].reverse().map(s => (
              <div
                key={s.id}
                className="bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{s.productName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.category} · 數量 {s.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-600 text-sm">NT${(s.actualPrice * s.quantity).toLocaleString()}</p>
                  <p className="text-xs text-green-500">
                    毛利 NT${(s.actualPrice - s.cost) * s.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sales.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-300 pb-10 mt-8">
          <ShoppingBag size={48} strokeWidth={1} />
          <p className="mt-3 text-sm">今日尚未有銷售紀錄</p>
        </div>
      )}

      <SaleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={reload}
      />
    </div>
  );
}
