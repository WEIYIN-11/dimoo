import { useState, useEffect } from 'react';
import { Trash2, Calendar, ChevronDown, FileDown } from 'lucide-react';
import { getSales, deleteSale } from '../storage';

// ─── CSV export (replaces xlsx to eliminate HIGH CVEs) ────────────────────────
function exportToCSV(sales, label) {
  const headers = ['日期','商品名稱','尺寸','花色','類別','數量','售價','小計','進貨成本','毛利','毛利率'];

  const dataRows = sales.map(s => [
    s.date,
    s.productName,
    s.size  || '—',
    s.color || '—',
    s.category,
    s.quantity,
    s.actualPrice,
    s.actualPrice * s.quantity,
    s.cost,
    (s.actualPrice - s.cost) * s.quantity,
    s.actualPrice > 0
      ? `${(((s.actualPrice - s.cost) / s.actualPrice) * 100).toFixed(1)}%`
      : '—',
  ]);

  // Summary row
  const totalRev    = sales.reduce((sum, s) => sum + s.actualPrice * s.quantity, 0);
  const totalCost   = sales.reduce((sum, s) => sum + s.cost * s.quantity, 0);
  const totalProfit = totalRev - totalCost;
  dataRows.push([]);
  dataRows.push([
    '合計', '', '', '', '',
    sales.reduce((s, r) => s + r.quantity, 0),
    '', totalRev, totalCost, totalProfit,
    totalRev > 0 ? `${((totalProfit / totalRev) * 100).toFixed(1)}%` : '—',
  ]);

  // Escape and join — wrap cells in double-quotes, escape existing quotes
  const csv = [headers, ...dataRows]
    .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  // BOM prefix so Excel opens UTF-8 correctly
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `童裝店銷售_${label}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function groupByDate(sales) {
  const map = {};
  for (const s of sales) {
    if (!map[s.date]) map[s.date] = [];
    map[s.date].push(s);
  }
  return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function Sales() {
  const [all, setAll]           = useState([]);
  const [filter, setFilter]     = useState('all');
  const [expanded, setExpanded] = useState({});

  function reload() {
    const sales = getSales();
    setAll(sales);
    const today = new Date().toISOString().slice(0, 10);
    setExpanded({ [today]: true });
  }
  useEffect(reload, []);

  const today = new Date().toISOString().slice(0, 10);
  const ym    = today.slice(0, 7);

  const filtered = all.filter(s => {
    if (filter === 'today') return s.date === today;
    if (filter === 'month') return s.date.startsWith(ym);
    return true;
  });

  const groups = groupByDate(filtered);
  const totalRevenue = filtered.reduce((s, r) => s + r.actualPrice * r.quantity, 0);

  function handleDelete(id) {
    if (window.confirm('確定要刪除此筆銷售？')) {
      deleteSale(id);
      reload();
    }
  }

  function toggleGroup(date) {
    setExpanded(e => ({ ...e, [date]: !e[date] }));
  }

  const filterBtns = [
    { key: 'today', label: '今日' },
    { key: 'month', label: '本月' },
    { key: 'all',   label: '全部' },
  ];

  const exportLabel = filter === 'today' ? '今日' : filter === 'month' ? '本月' : '全部';

  return (
    <div className="flex flex-col pb-20 pt-10 px-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">銷售紀錄</h1>
        <button
          onClick={() => exportToCSV(filtered, exportLabel)}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold px-3 py-2.5 rounded-xl active:scale-95 transition-all"
        >
          <FileDown size={16} />
          匯出 CSV
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {filterBtns.map(btn => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
              filter === btn.key
                ? 'bg-brand-600 text-white'
                : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm flex justify-between text-sm">
        <span className="text-gray-500">共 {filtered.length} 筆</span>
        <span className="font-bold text-brand-600">
          總計 NT${totalRevenue.toLocaleString()}
        </span>
      </div>

      {/* Grouped list */}
      {groups.length === 0 && (
        <div className="text-center text-gray-300 text-sm py-16">暫無銷售紀錄</div>
      )}

      <div className="space-y-3">
        {groups.map(([date, items]) => {
          const dayTotal = items.reduce((s, r) => s + r.actualPrice * r.quantity, 0);
          const isOpen = expanded[date];
          return (
            <div key={date} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Date header */}
              <button
                onClick={() => toggleGroup(date)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-brand-400" />
                  <span className="font-semibold text-gray-700 text-sm">{date}</span>
                  <span className="text-xs text-gray-400">{items.length} 筆</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-brand-600 text-sm">NT${dayTotal.toLocaleString()}</span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {/* Items */}
              {isOpen && (
                <div className="divide-y divide-gray-50">
                  {items.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{s.productName}</p>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          {s.size  && <span className="text-xs bg-brand-50 text-brand-600 rounded-lg px-2 py-0.5 font-medium">{s.size}</span>}
                          {s.color && <span className="text-xs bg-purple-50 text-purple-600 rounded-lg px-2 py-0.5 font-medium">{s.color}</span>}
                          <span className="text-xs text-gray-400">x{s.quantity}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-800">
                            NT${(s.actualPrice * s.quantity).toLocaleString()}
                          </p>
                          <p className="text-xs text-green-500">
                            毛利 NT${(s.actualPrice - s.cost) * s.quantity}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="w-9 h-9 rounded-xl hover:bg-red-50 text-red-300 hover:text-red-500 flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
