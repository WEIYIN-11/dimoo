import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import NavBar    from './components/NavBar';
import Tutorial  from './components/Tutorial';
import Home      from './pages/Home';
import Dashboard from './pages/Dashboard';
import Products  from './pages/Products';
import Sales     from './pages/Sales';
import Purchases from './pages/Purchases';
import Inventory from './pages/Inventory';
import Login     from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isTutorialDone } from './storage';

function AppShell() {
  const { user, loading, logout } = useAuth();
  const [showTutorial, setShowTutorial] = useState(() => !isTutorialDone());

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <>
      {/* User badge — tapping opens logout confirm */}
      <UserBadge user={user} onLogout={logout} />

      <Routes>
        <Route path="/"           element={<Home />}      />
        <Route path="/dashboard"  element={<Dashboard />} />
        <Route path="/purchases"  element={<Purchases />} />
        <Route path="/inventory"  element={<Inventory />} />
        <Route path="/products"   element={<Products />}  />
        <Route path="/sales"      element={<Sales />}     />
      </Routes>
      <NavBar />
      {showTutorial && (
        <Tutorial onDone={() => setShowTutorial(false)} />
      )}
    </>
  );
}

function UserBadge({ user, onLogout }) {
  async function handleLogout() {
    if (window.confirm(`確定要登出 ${user.displayName ?? user.email}？`)) {
      await onLogout();
    }
  }

  return (
    <div className="fixed top-2 right-3 z-50 flex items-center gap-2">
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full pl-1 pr-3 py-1 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
      >
        {user.photoURL
          ? <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
          : <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white text-[10px] font-bold">
              {(user.displayName ?? user.email ?? '?')[0].toUpperCase()}
            </div>
        }
        <span className="text-[11px] font-medium text-gray-600 max-w-[80px] truncate">
          {user.displayName ?? user.email}
        </span>
      </button>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
