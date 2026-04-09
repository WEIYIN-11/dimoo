// ─── Keys ────────────────────────────────────────────────────────────────────
const PRODUCTS_KEY   = 'kw_products';
const SALES_KEY      = 'kw_sales';
const PURCHASES_KEY  = 'kw_purchases';
const INVENTORY_KEY  = 'kw_inventory';   // { [productId]: number }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Default seed products (with sizes + colors) ──────────────────────────────
const DEFAULT_PRODUCTS = [
  {
    id: uid(), name: '小兔子套裝',  category: '套裝',
    cost: 200, defaultPrice: 480,
    sizes:  ['80cm', '90cm', '100cm', '110cm'],
    colors: ['粉色', '藍色', '黃色'],
  },
  {
    id: uid(), name: '嬰兒連身衣',  category: '嬰兒',
    cost: 150, defaultPrice: 350,
    sizes:  ['59cm', '66cm', '73cm', '80cm'],
    colors: ['白色', '粉色', '藍色'],
  },
  {
    id: uid(), name: '兒童T恤',     category: '上衣',
    cost: 120, defaultPrice: 280,
    sizes:  ['90cm', '100cm', '110cm', '120cm', '130cm'],
    colors: ['白色', '黑色', '紅色', '藍色'],
  },
  {
    id: uid(), name: '兒童牛仔褲',  category: '下著',
    cost: 200, defaultPrice: 450,
    sizes:  ['90cm', '100cm', '110cm', '120cm', '130cm'],
    colors: ['深藍', '淺藍', '黑色'],
  },
  {
    id: uid(), name: '兒童洋裝',    category: '洋裝',
    cost: 250, defaultPrice: 580,
    sizes:  ['90cm', '100cm', '110cm', '120cm'],
    colors: ['粉色', '白色', '紫色'],
  },
  {
    id: uid(), name: '兒童外套',    category: '外套',
    cost: 300, defaultPrice: 680,
    sizes:  ['90cm', '100cm', '110cm', '120cm', '130cm'],
    colors: ['紅色', '藍色', '卡其'],
  },
  {
    id: uid(), name: '嬰兒帽子',    category: '配件',
    cost:  60, defaultPrice: 150,
    sizes:  ['S', 'M', 'L'],
    colors: ['白色', '粉色', '藍色', '黃色'],
  },
  {
    id: uid(), name: '兒童涼鞋',    category: '鞋類',
    cost: 180, defaultPrice: 390,
    sizes:  ['14cm', '15cm', '16cm', '17cm', '18cm'],
    colors: ['白色', '粉色', '藍色'],
  },
];

// ─── Products API ─────────────────────────────────────────────────────────────
export function getProducts() {
  const products = load(PRODUCTS_KEY, null);
  if (!products) {
    save(PRODUCTS_KEY, DEFAULT_PRODUCTS);
    return DEFAULT_PRODUCTS;
  }
  return products;
}

export function addProduct(product) {
  const products = getProducts();
  const newProduct = { sizes: [], colors: [], ...product, id: uid() };
  save(PRODUCTS_KEY, [...products, newProduct]);
  return newProduct;
}

export function updateProduct(id, updates) {
  save(PRODUCTS_KEY, getProducts().map(p => p.id === id ? { ...p, ...updates } : p));
}

export function deleteProduct(id) {
  save(PRODUCTS_KEY, getProducts().filter(p => p.id !== id));
}

// ─── Inventory API ────────────────────────────────────────────────────────────
/** Returns { [productId]: qty } */
export function getInventory() {
  return load(INVENTORY_KEY, {});
}

/** Add stock (positive qty). Used when confirming receipt. */
export function addStock(productId, qty) {
  const inv = getInventory();
  inv[productId] = (inv[productId] ?? 0) + Number(qty);
  save(INVENTORY_KEY, inv);
}

/** Deduct stock (positive qty). Used when recording a sale. */
export function deductStock(productId, qty) {
  const inv = getInventory();
  inv[productId] = Math.max(0, (inv[productId] ?? 0) - Number(qty));
  save(INVENTORY_KEY, inv);
}

/**
 * Returns array of { product, stock } sorted by stock asc.
 * stock < 5 → low stock warning.
 */
export function getInventoryStats() {
  const products = getProducts();
  const inv      = getInventory();
  return products
    .map(p => ({ product: p, stock: inv[p.id] ?? 0 }))
    .sort((a, b) => a.stock - b.stock);
}

// ─── Purchases API ────────────────────────────────────────────────────────────
export function getPurchases() {
  return load(PURCHASES_KEY, []);
}

/**
 * @param {object} p
 * @param {string} p.supplier    供應商名稱
 * @param {string} p.productId   商品 ID（可為空）
 * @param {string} p.productName 商品名稱
 * @param {number} p.unitCost    進貨單價
 * @param {number} p.quantity    數量
 */
export function addPurchase({ supplier, productId, productName, unitCost, quantity }) {
  const purchase = {
    id:            uid(),
    date:          new Date().toISOString().slice(0, 10),
    supplier,
    productId:     productId ?? '',
    productName,
    unitCost:      Number(unitCost),
    quantity:      Number(quantity),
    totalCost:     Number(unitCost) * Number(quantity),
    status:        '已下單',
    completedDate: null,
  };
  save(PURCHASES_KEY, [...getPurchases(), purchase]);
  return purchase;
}

/**
 * Confirm receipt: set status → 已完成, add stock to inventory.
 */
export function confirmReceipt(purchaseId) {
  const purchases = getPurchases();
  const purchase  = purchases.find(p => p.id === purchaseId);
  if (!purchase || purchase.status !== '已下單') return;

  // Update status
  const updated = purchases.map(p =>
    p.id === purchaseId
      ? { ...p, status: '已完成', completedDate: new Date().toISOString().slice(0, 10) }
      : p
  );
  save(PURCHASES_KEY, updated);

  // Add stock — link to product if productId exists
  if (purchase.productId) {
    addStock(purchase.productId, purchase.quantity);
  }
}

export function deletePurchase(id) {
  save(PURCHASES_KEY, getPurchases().filter(p => p.id !== id));
}

// ─── Sales API ────────────────────────────────────────────────────────────────
export function getSales() {
  return load(SALES_KEY, []);
}

/**
 * @param {object} param
 * @param {string} param.productId
 * @param {number} param.actualPrice
 * @param {number} [param.quantity]
 * @param {string} [param.size]
 * @param {string} [param.color]
 */
export function addSale({ productId, actualPrice, quantity = 1, size = '', color = '' }) {
  const product = getProducts().find(p => p.id === productId);
  if (!product) throw new Error('Product not found');

  const sale = {
    id:          uid(),
    date:        new Date().toISOString().slice(0, 10),
    productId,
    productName: product.name,
    category:    product.category,
    size,
    color,
    quantity:    Number(quantity),
    actualPrice: Number(actualPrice),
    cost:        product.cost,
  };

  save(SALES_KEY, [...getSales(), sale]);

  // Automatically deduct from inventory
  deductStock(productId, quantity);

  return sale;
}

export function deleteSale(id) {
  save(SALES_KEY, getSales().filter(s => s.id !== id));
}

// ─── Computed helpers ─────────────────────────────────────────────────────────
export function computeStats(sales) {
  const revenue = sales.reduce((sum, s) => sum + s.actualPrice * s.quantity, 0);
  const cost    = sales.reduce((sum, s) => sum + s.cost    * s.quantity, 0);
  const profit  = revenue - cost;
  const margin  = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0.0';
  return { revenue, cost, profit, margin };
}

export function salesByCategory(sales) {
  const map = {};
  for (const s of sales) {
    if (!map[s.category]) map[s.category] = { name: s.category, revenue: 0, qty: 0 };
    map[s.category].revenue += s.actualPrice * s.quantity;
    map[s.category].qty     += s.quantity;
  }
  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
}

export function todaySales() {
  const today = new Date().toISOString().slice(0, 10);
  return getSales().filter(s => s.date === today);
}

export function monthSales() {
  const ym = new Date().toISOString().slice(0, 7);
  return getSales().filter(s => s.date.startsWith(ym));
}

export function dailyRevenueLast30Days() {
  const sales = getSales();
  const map = {};
  for (const s of sales) {
    if (!map[s.date]) map[s.date] = 0;
    map[s.date] += s.actualPrice * s.quantity;
  }
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key.slice(5), revenue: map[key] || 0 });
  }
  return days;
}
