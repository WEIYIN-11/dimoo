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
import { isTutorialDone } from './storage';

export default function App() {
  const [showTutorial, setShowTutorial] = useState(() => !isTutorialDone());

  return (
    <>
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
