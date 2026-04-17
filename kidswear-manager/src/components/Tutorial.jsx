import { useState } from 'react';
import {
  Home, BarChart2, Truck, Boxes, Package, ClipboardList,
  ChevronLeft, ChevronRight, X, CheckCircle2, Sparkles,
} from 'lucide-react';
import { markTutorialDone } from '../storage';

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  {
    bg:    'from-amber-400 to-orange-500',
    Icon:  Sparkles,
    title: '歡迎使用童裝管理！',
    body:  '專為童裝店設計的輕量管理工具，幫你追蹤採購、庫存與銷售。跟著教學快速上手！',
  },
  {
    bg:    'from-sky-400 to-blue-500',
    Icon:  Home,
    label: '首頁',
    title: '首頁 — 快速總覽',
    body:  '每天開店前先看首頁：今日銷售筆數、當月收入、毛利率，以及低庫存提示，一目瞭然。',
  },
  {
    bg:    'from-violet-500 to-purple-600',
    Icon:  BarChart2,
    label: '儀表板',
    title: '儀表板 — 趨勢分析',
    body:  '近 30 天每日營收折線圖、各品類銷售排行，幫你找出熱銷商品，掌握整體趨勢。',
  },
  {
    bg:    'from-amber-500 to-yellow-500',
    Icon:  Truck,
    label: '採購',
    title: '採購管理 — 進貨入庫',
    body:  '新增進貨單後，收到貨物時點「確認收貨」，系統自動將數量加入庫存，完全不需手動調整。',
  },
  {
    bg:    'from-teal-500 to-emerald-600',
    Icon:  Boxes,
    label: '庫存',
    title: '庫存管理 — 三通路分配',
    body:  '每項商品可分配給「店面」「網路」「倉庫」三個通路，方便分開管理實體店與線上訂單。',
  },
  {
    bg:    'from-rose-500 to-pink-600',
    Icon:  Package,
    label: '商品',
    title: '商品管理 — 建立商品資料',
    body:  '設定商品的成本與售價，系統就能自動計算每筆銷售的毛利和利潤率。採購到貨後也會自動建立商品。',
  },
  {
    bg:    'from-indigo-500 to-blue-600',
    Icon:  ClipboardList,
    label: '銷售',
    title: '銷售記錄 — 自動扣庫存',
    body:  '記錄銷售時輸入實際售價，系統自動扣除庫存並計算利潤。月底可匯出 CSV 報表對帳。',
  },
  {
    bg:    'from-green-500 to-emerald-500',
    Icon:  CheckCircle2,
    title: '準備好了！',
    body:  '建議從「採購」頁新增第一筆進貨單，確認收貨後商品會自動出現在庫存中，馬上開始吧！',
    isLast: true,
  },
];

// ─── Tutorial overlay ─────────────────────────────────────────────────────────
export default function Tutorial({ onDone }) {
  const [step, setStep] = useState(0);
  const cur    = STEPS[step];
  const { Icon } = cur;
  const isFirst = step === 0;

  function finish() {
    markTutorialDone();
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-5">
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl">

        {/* ── Coloured header ── */}
        <div className={`bg-gradient-to-br ${cur.bg} relative flex flex-col items-center justify-center pt-10 pb-8 px-6`}>
          {/* Skip (×) — hidden on last step */}
          {!cur.isLast && (
            <button
              onClick={finish}
              aria-label="略過教學"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            >
              <X size={15} />
            </button>
          )}

          {/* Icon bubble */}
          <div className="w-20 h-20 rounded-2xl bg-white/25 flex items-center justify-center mb-3">
            <Icon size={40} className="text-white" strokeWidth={1.5} />
          </div>

          {/* Section badge */}
          {cur.label && (
            <span className="text-[11px] font-bold bg-white/25 text-white rounded-full px-3 py-0.5 mb-2 tracking-wide">
              {cur.label}
            </span>
          )}

          <h2 className="text-lg font-bold text-white text-center leading-snug">
            {cur.title}
          </h2>
        </div>

        {/* ── Body text ── */}
        <div className="px-7 pt-5 pb-1 min-h-[72px]">
          <p className="text-sm text-gray-500 text-center leading-relaxed">
            {cur.body}
          </p>
        </div>

        {/* ── Progress dots ── */}
        <div className="flex items-center justify-center gap-1.5 py-5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`rounded-full transition-all duration-200 ${
                i === step  ? 'w-5 h-2 bg-gray-800'
                : i < step  ? 'w-2 h-2 bg-gray-400'
                :              'w-2 h-2 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* ── Navigation ── */}
        <div className="flex gap-2 px-6 pb-7">
          {/* Back button */}
          {!isFirst && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="w-11 h-12 rounded-2xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 shrink-0 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {cur.isLast ? (
            <button
              onClick={finish}
              className="flex-1 h-12 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <CheckCircle2 size={16} /> 開始使用！不再顯示教學
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 h-12 rounded-2xl bg-gray-900 hover:bg-gray-700 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              下一步 <ChevronRight size={16} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
