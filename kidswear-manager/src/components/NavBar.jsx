import { NavLink } from 'react-router-dom';
import { Home, BarChart2, Package, ClipboardList, Truck, Boxes } from 'lucide-react';

const tabs = [
  { to: '/',          label: '首頁',   Icon: Home          },
  { to: '/dashboard', label: '儀表板', Icon: BarChart2     },
  { to: '/purchases', label: '採購',   Icon: Truck         },
  { to: '/inventory', label: '庫存',   Icon: Boxes         },
  { to: '/products',  label: '商品',   Icon: Package       },
  { to: '/sales',     label: '銷售',   Icon: ClipboardList },
];

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 z-40 shadow-lg">
      <div className="flex">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1.5 gap-0.5 text-[9px] transition-colors ${
                isActive
                  ? 'text-brand-600 font-semibold'
                  : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={19} strokeWidth={isActive ? 2.2 : 1.6} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
