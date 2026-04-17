// ─── Keys ────────────────────────────────────────────────────────────────────
const PRODUCTS_KEY   = 'kw_products';
const SALES_KEY      = 'kw_sales';
const PURCHASES_KEY  = 'kw_purchases';
const INVENTORY_KEY  = 'kw_inventory';    // { [productId]: totalQty }
const STORE_INV_KEY  = 'kw_store_inv';   // { [productId]: storeQty }
const ONLINE_INV_KEY = 'kw_online_inv';  // { [productId]: onlineQty }
const INV_SIZES_KEY  = 'kw_inv_sizes';   // { [productId]: { [size]: qty } }

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Cryptographically secure ID (replaces Math.random). */
function uid() {
  return crypto.randomUUID();
}

/**
 * Sanitize parsed JSON: round-trips through JSON.stringify/parse to strip
 * any prototype-chain pollution from the deserialized value.
 */
function sanitize(value) {
  if (value === null || typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = sanitize(JSON.parse(raw));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    // QuotaExceededError — log but do not crash the app
    console.error('[storage] save failed:', e);
  }
}

// ─── Default categories & sizes (no pre-seeded products) ─────────────────────
export const DEFAULT_CATEGORIES = ['上衣', '褲子', '外套', '襪子', '鞋子', '帽子'];
export const DEFAULT_SIZES      = ['90', '100', '110', '120', '130', '140', '150', '160'];

// ─── Products API ─────────────────────────────────────────────────────────────
export function getProducts() {
  return load(PRODUCTS_KEY, []);
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
/** Returns { [productId]: totalQty } */
export function getInventory() {
  return load(INVENTORY_KEY, {});
}

/** Returns { [productId]: storeQty } — the in-store portion */
export function getStoreInventory() {
  return load(STORE_INV_KEY, {});
}

/** Returns { [productId]: onlineQty } — the online-channel portion */
export function getOnlineInventory() {
  return load(ONLINE_INV_KEY, {});
}

/** Returns { [productId]: { [size]: qty } } — size-level breakdown */
export function getInventorySizes() {
  return load(INV_SIZES_KEY, {});
}

/**
 * Manually set how many of productId are in-store.
 * Clamped to [0, total - onlineQty].
 */
export function setStoreStock(productId, qty) {
  const total   = getInventory()[productId] ?? 0;
  const online  = getOnlineInventory()[productId] ?? 0;
  const clamped = Math.max(0, Math.min(total - online, Number(qty)));
  save(STORE_INV_KEY, { ...getStoreInventory(), [productId]: clamped });
}

/**
 * Manually set how many of productId are in the online channel.
 * Clamped to [0, total - storeQty].
 */
export function setOnlineStock(productId, qty) {
  const total   = getInventory()[productId] ?? 0;
  const store   = getStoreInventory()[productId] ?? 0;
  const clamped = Math.max(0, Math.min(total - store, Number(qty)));
  save(ONLINE_INV_KEY, { ...getOnlineInventory(), [productId]: clamped });
}

/** Add stock (positive qty). New stock goes to warehouse by default.
 *  Pass size to also track in the per-size breakdown. */
export function addStock(productId, qty, size = '') {
  const n = Number(qty);
  const inv = getInventory();
  save(INVENTORY_KEY, { ...inv, [productId]: (inv[productId] ?? 0) + n });

  if (size) {
    const sizeInv   = getInventorySizes();
    const prodSizes = sizeInv[productId] ?? {};
    save(INV_SIZES_KEY, {
      ...sizeInv,
      [productId]: { ...prodSizes, [size]: (prodSizes[size] ?? 0) + n },
    });
  }
}

/**
 * Deduct stock (positive qty). Deducts from total, store, and online proportionally.
 * Pass size to also deduct from the per-size breakdown.
 */
export function deductStock(productId, qty, size = '') {
  const n = Number(qty);

  // Update total
  const inv      = getInventory();
  const newTotal = Math.max(0, (inv[productId] ?? 0) - n);
  save(INVENTORY_KEY, { ...inv, [productId]: newTotal });

  // Update size breakdown
  if (size) {
    const sizeInv   = getInventorySizes();
    const prodSizes = sizeInv[productId] ?? {};
    save(INV_SIZES_KEY, {
      ...sizeInv,
      [productId]: { ...prodSizes, [size]: Math.max(0, (prodSizes[size] ?? 0) - n) },
    });
  }

  // Clamp store stock to newTotal
  const storeInv = getStoreInventory();
  const curStore = storeInv[productId] ?? 0;
  const newStore = Math.max(0, Math.min(curStore - n, newTotal));
  save(STORE_INV_KEY, { ...storeInv, [productId]: newStore });

  // Clamp online stock to remaining (newTotal - newStore)
  const onlineInv = getOnlineInventory();
  const curOnline = onlineInv[productId] ?? 0;
  const newOnline = Math.max(0, Math.min(curOnline, newTotal - newStore));
  save(ONLINE_INV_KEY, { ...onlineInv, [productId]: newOnline });
}

/**
 * Weighted-average cost from *completed* purchases for a given productId.
 * Falls back to product.cost if no purchase history exists.
 */
export function getAveragePurchaseCost(productId) {
  const purchases = getPurchases().filter(
    p => p.productId === productId && p.status === '已完成'
  );
  if (purchases.length === 0) {
    const product = getProducts().find(p => p.id === productId);
    return product?.cost ?? 0;
  }
  const totalCost = purchases.reduce((s, p) => s + p.unitCost * p.quantity, 0);
  const totalQty  = purchases.reduce((s, p) => s + p.quantity, 0);
  return totalQty > 0 ? Math.round(totalCost / totalQty) : 0;
}

/**
 * Returns a Set of productIds that currently have at least one '已下單' purchase.
 */
export function getPendingPurchaseProductIds() {
  return new Set(
    getPurchases()
      .filter(p => p.status === '已下單' && p.productId)
      .map(p => p.productId)
  );
}

/**
 * Returns array of { product, stock, totalStock, storeStock, onlineStock, warehouseStock, avgCost, hasPending, sizeBreakdown }
 * sorted by totalStock asc (low stock first).
 * `stock` is kept as an alias for `totalStock` for backward compat.
 */
export function getInventoryStats() {
  const products   = getProducts();
  const inv        = getInventory();
  const storeInv   = getStoreInventory();
  const onlineInv  = getOnlineInventory();
  const sizeInv    = getInventorySizes();
  const pendingIds = getPendingPurchaseProductIds();
  return products
    .map(p => {
      const total  = inv[p.id] ?? 0;
      const store  = Math.min(storeInv[p.id]  ?? 0, total);
      const online = Math.min(onlineInv[p.id] ?? 0, total - store);
      return {
        product:        p,
        stock:          total,          // backward compat
        totalStock:     total,
        storeStock:     store,
        onlineStock:    online,
        warehouseStock: total - store - online,
        avgCost:        getAveragePurchaseCost(p.id),
        hasPending:     pendingIds.has(p.id),
        sizeBreakdown:  sizeInv[p.id] ?? {},
      };
    })
    .sort((a, b) => a.stock - b.stock);
}

// ─── Purchases API ────────────────────────────────────────────────────────────
export function getPurchases() {
  return load(PURCHASES_KEY, []);
}

/**
 * @param {object} p
 * @param {string} p.supplier    供應商名稱
 * @param {string} p.productId   商品 ID（可為空，會自動以名稱比對）
 * @param {string} p.productName 商品名稱
 * @param {number} p.unitCost    進貨單價
 * @param {number} p.quantity    數量
 * @param {string} [p.size]      尺碼（空字串 = 不分尺碼）
 */
export function addPurchase({ supplier, productId, productName, unitCost, quantity, size = '' }) {
  // Auto-link to existing product by name if productId not provided
  let resolvedId = productId ?? '';
  if (!resolvedId && productName) {
    const match = getProducts().find(p => p.name === productName);
    if (match) resolvedId = match.id;
  }

  const purchase = {
    id:            uid(),
    date:          new Date().toISOString().slice(0, 10),
    supplier,
    productId:     resolvedId,
    productName,
    size,
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
 * Update a pending purchase record (only allowed while status = '已下單').
 */
export function updatePurchase(id, updates) {
  save(PURCHASES_KEY, getPurchases().map(p => {
    if (p.id !== id) return p;
    const unitCost = Number(updates.unitCost ?? p.unitCost);
    const quantity = Number(updates.quantity ?? p.quantity);
    return { ...p, ...updates, unitCost, quantity, totalCost: unitCost * quantity };
  }));
}

/**
 * Confirm receipt: set status → 已完成, add stock to inventory.
 * Resolution order:
 *   1. purchase.productId (already stored)
 *   2. name-based lookup in products list
 *   3. auto-create a new product so stock is never silently lost
 */
export function confirmReceipt(purchaseId) {
  const purchases = getPurchases();
  const purchase  = purchases.find(p => p.id === purchaseId);
  if (!purchase || purchase.status !== '已下單') return;

  // Step 1 & 2: resolve from stored id or name lookup
  let effectiveId = purchase.productId ||
    getProducts().find(p => p.name === purchase.productName)?.id || '';

  // Step 3: auto-create product so stock is never lost
  if (!effectiveId && purchase.productName) {
    const created = addProduct({
      name:     purchase.productName,
      category: '',
      cost:     purchase.unitCost,
      price:    0,
      sizes:    purchase.size ? [purchase.size] : [],
      colors:   [],
    });
    effectiveId = created.id;
  }

  // Update purchase status (re-read to get latest after potential addProduct)
  save(PURCHASES_KEY, getPurchases().map(p =>
    p.id === purchaseId
      ? { ...p, productId: effectiveId, status: '已完成', completedDate: new Date().toISOString().slice(0, 10) }
      : p
  ));

  // Add stock to inventory
  if (effectiveId) {
    addStock(effectiveId, purchase.quantity, purchase.size ?? '');
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
  deductStock(productId, quantity, size);
  return sale;
}

export function deleteSale(id) {
  save(SALES_KEY, getSales().filter(s => s.id !== id));
}

// ─── Reset ────────────────────────────────────────────────────────────────────
/** Wipe ALL app data from localStorage. Use with caution. */
export function clearAllData() {
  [PRODUCTS_KEY, SALES_KEY, PURCHASES_KEY, INVENTORY_KEY, STORE_INV_KEY, ONLINE_INV_KEY, INV_SIZES_KEY]
    .forEach(key => localStorage.removeItem(key));
}

// ─── Tutorial ─────────────────────────────────────────────────────────────────
const TUTORIAL_KEY = 'kw_tutorial_done';
export function isTutorialDone()  { return load(TUTORIAL_KEY, false) === true; }
export function markTutorialDone() { save(TUTORIAL_KEY, true); }

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
