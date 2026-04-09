import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Inventory from './pages/Inventory';

export default function App() {
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
    </>
  );
}
