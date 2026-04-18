// ─── Auth-scoped key prefix ───────────────────────────────────────────────────
let _uid = '';

/** Called by AuthContext once Firebase resolves the signed-in user. */
export function setCurrentUser(uid) { _uid = uid || ''; }

/** Prefix a storage key with the current user's uid. */
function k(base) { return _uid ? `${_uid}_${base}` : base; }

// ─── Base keys (without uid prefix) ──────────────────────────────────────────
const PRODUCTS_KEY   = 'kw_products';
const SALES_KEY      = 'kw_sales';
const PURCHASES_KEY  = 'kw_purchases';
const INVENTORY_KEY  = 'kw_inventory';    // { [productId]: totalQty }
const STORE_INV_KEY  = 'kw_store_inv';   // { [productId]: storeQty }
const ONLINE_INV_KEY = 'kw_online_inv';  // { [productId]: onlineQty }
const INV_SIZES_KEY  = 'kw_inv_sizes';   // { [productId]: { [size]: qty } }
const VARIANTS_KEY   = 'kw_variants';    // { [productId]: { [variantKey]: { total, store, online } } }
const TUTORIAL_KEY   = 'kw_tutorial_done';
const SETTINGS_KEY   = 'kw_settings';

const ALL_KEYS = [
  PRODUCTS_KEY, SALES_KEY, PURCHASES_KEY,
  INVENTORY_KEY, STORE_INV_KEY, ONLINE_INV_KEY, INV_SIZES_KEY, VARIANTS_KEY,
  TUTORIAL_KEY, SETTINGS_KEY,
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Cryptographically secure ID. */
function uid() { return crypto.randomUUID(); }

function sanitize(value) {
  if (value === null || typeof value !== 'object') return value;
  try { return JSON.parse(JSON.stringify(value)); } catch { return null; }
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
    console.error('[storage] save failed:', e);
  }
}

// ─── Data migration (non-prefixed → uid-prefixed) ────────────────────────────
/**
 * On first sign-in, copy any data from the old non-prefixed keys to the
 * uid-prefixed keys so existing users don't lose their data.
 */
export function migrateToUser(uidStr) {
  if (!uidStr) return;
  for (const base of ALL_KEYS) {
    const newKey = `${uidStr}_${base}`;
    const oldRaw = localStorage.getItem(base);
    if (oldRaw && !localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, oldRaw);
      localStorage.removeItem(base);
    }
  }
}

// ─── Variant helpers (size × color granularity) ──────────────────────────────

function vk(size = '', color = '') { return `${size}::${color}`; }

export function parseVariantKey(key = '') {
  const sep = key.indexOf('::');
  return sep < 0
    ? { size: key, color: '' }
    : { size: key.slice(0, sep), color: key.slice(sep + 2) };
}

function getAllVariants() { return load(k(VARIANTS_KEY), {}); }

function patchVariant(productId, size, color, updater) {
  const all  = getAllVariants();
  const prod = all[productId] ?? {};
  const key  = vk(size, color);
  const cur  = prod[key] ?? { total: 0, store: 0, online: 0 };
  save(k(VARIANTS_KEY), { ...all, [productId]: { ...prod, [key]: updater(cur) } });
}

export function getProductVariants(productId) {
  return getAllVariants()[productId] ?? {};
}

export function getProductVariantList(productId) {
  const variants = getProductVariants(productId);
  return Object.entries(variants)
    .map(([key, v]) => ({
      key,
      ...parseVariantKey(key),
      total:     v.total,
      store:     v.store,
      online:    v.online,
      warehouse: Math.max(0, v.total - v.store - v.online),
    }))
    .sort((a, b) => {
      const si = DEFAULT_SIZES.indexOf(a.size);
      const bi = DEFAULT_SIZES.indexOf(b.size);
      if (si >= 0 && bi >= 0 && si !== bi) return si - bi;
      const sc = a.size.localeCompare(b.size, 'zh-TW');
      if (sc !== 0) return sc;
      return a.color.localeCompare(b.color, 'zh-TW');
    });
}

export function setVariantStore(productId, size, color, qty) {
  patchVariant(productId, size, color, v => ({
    ...v,
    store: Math.max(0, Math.min(v.total - v.online, Number(qty))),
  }));
}

export function setVariantOnline(productId, size, color, qty) {
  patchVariant(productId, size, color, v => ({
    ...v,
    online: Math.max(0, Math.min(v.total - v.store, Number(qty))),
  }));
}

// ─── Default categories & sizes ───────────────────────────────────────────────
export const DEFAULT_CATEGORIES = ['上衣', '褲子', '外套', '襪子', '鞋子', '帽子'];
export const DEFAULT_SIZES      = ['90', '100', '110', '120', '130', '140', '150', '160'];

// ─── Settings API ─────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = { lowStockThreshold: 5 };

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...load(k(SETTINGS_KEY), {}) };
}

export function saveSettings(updates) {
  save(k(SETTINGS_KEY), { ...getSettings(), ...updates });
}

export function getLowStockThreshold() {
  return getSettings().lowStockThreshold ?? 5;
}

// ─── Products API ─────────────────────────────────────────────────────────────
export function getProducts() {
  return load(k(PRODUCTS_KEY), []);
}

export function addProduct(product) {
  const products   = getProducts();
  const newProduct = { sizes: [], colors: [], ...product, id: uid() };
  save(k(PRODUCTS_KEY), [...products, newProduct]);
  return newProduct;
}

export function updateProduct(id, updates) {
  save(k(PRODUCTS_KEY), getProducts().map(p => p.id === id ? { ...p, ...updates } : p));
}

export function deleteProduct(id) {
  save(k(PRODUCTS_KEY), getProducts().filter(p => p.id !== id));
}

// ─── Inventory API ────────────────────────────────────────────────────────────
export function getInventory()       { return load(k(INVENTORY_KEY),  {}); }
export function getStoreInventory()  { return load(k(STORE_INV_KEY),  {}); }
export function getOnlineInventory() { return load(k(ONLINE_INV_KEY), {}); }
export function getInventorySizes()  { return load(k(INV_SIZES_KEY),  {}); }

export function setStoreStock(productId, qty) {
  const total   = getInventory()[productId] ?? 0;
  const online  = getOnlineInventory()[productId] ?? 0;
  const clamped = Math.max(0, Math.min(total - online, Number(qty)));
  save(k(STORE_INV_KEY), { ...getStoreInventory(), [productId]: clamped });
}

export function setOnlineStock(productId, qty) {
  const total   = getInventory()[productId] ?? 0;
  const store   = getStoreInventory()[productId] ?? 0;
  const clamped = Math.max(0, Math.min(total - store, Number(qty)));
  save(k(ONLINE_INV_KEY), { ...getOnlineInventory(), [productId]: clamped });
}

export function addStock(productId, qty, size = '', color = '') {
  const n = Number(qty);
  const inv = getInventory();
  save(k(INVENTORY_KEY), { ...inv, [productId]: (inv[productId] ?? 0) + n });

  if (size) {
    const sizeInv   = getInventorySizes();
    const prodSizes = sizeInv[productId] ?? {};
    save(k(INV_SIZES_KEY), {
      ...sizeInv,
      [productId]: { ...prodSizes, [size]: (prodSizes[size] ?? 0) + n },
    });
  }

  patchVariant(productId, size, color, v => ({ ...v, total: v.total + n }));
}

export function deductStock(productId, qty, size = '', color = '') {
  const n = Number(qty);

  const inv      = getInventory();
  const newTotal = Math.max(0, (inv[productId] ?? 0) - n);
  save(k(INVENTORY_KEY), { ...inv, [productId]: newTotal });

  if (size) {
    const sizeInv   = getInventorySizes();
    const prodSizes = sizeInv[productId] ?? {};
    save(k(INV_SIZES_KEY), {
      ...sizeInv,
      [productId]: { ...prodSizes, [size]: Math.max(0, (prodSizes[size] ?? 0) - n) },
    });
  }

  const storeInv = getStoreInventory();
  const curStore = storeInv[productId] ?? 0;
  const newStore = Math.max(0, Math.min(curStore - n, newTotal));
  save(k(STORE_INV_KEY), { ...storeInv, [productId]: newStore });

  const onlineInv = getOnlineInventory();
  const curOnline = onlineInv[productId] ?? 0;
  const newOnline = Math.max(0, Math.min(curOnline, newTotal - newStore));
  save(k(ONLINE_INV_KEY), { ...onlineInv, [productId]: newOnline });

  patchVariant(productId, size, color, v => {
    const vTotal  = Math.max(0, v.total - n);
    const vStore  = Math.max(0, Math.min(v.store,  vTotal));
    const vOnline = Math.max(0, Math.min(v.online, vTotal - vStore));
    return { total: vTotal, store: vStore, online: vOnline };
  });
}

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

export function getPendingPurchaseProductIds() {
  return new Set(
    getPurchases()
      .filter(p => p.status === '已下單' && p.productId)
      .map(p => p.productId)
  );
}

export function getInventoryStats() {
  const products   = getProducts();
  const inv        = getInventory();
  const storeInv   = getStoreInventory();
  const onlineInv  = getOnlineInventory();
  const sizeInv    = getInventorySizes();
  const pendingIds = getPendingPurchaseProductIds();
  return products
    .map(p => {
      const total       = inv[p.id] ?? 0;
      const variantList = getProductVariantList(p.id);

      // For products with variants, aggregate store/online from variant-level data
      // so that variant allocation is always reflected in the summary.
      let store, online;
      if (variantList.length > 0) {
        store  = variantList.reduce((s, v) => s + v.store,  0);
        online = variantList.reduce((s, v) => s + v.online, 0);
      } else {
        store  = Math.min(storeInv[p.id]  ?? 0, total);
        online = Math.min(onlineInv[p.id] ?? 0, total - store);
      }

      store  = Math.min(store,  total);
      online = Math.min(online, total - store);

      return {
        product:        p,
        stock:          total,
        totalStock:     total,
        storeStock:     store,
        onlineStock:    online,
        warehouseStock: total - store - online,
        avgCost:        getAveragePurchaseCost(p.id),
        hasPending:     pendingIds.has(p.id),
        sizeBreakdown:  sizeInv[p.id] ?? {},
        variants:       variantList,
      };
    })
    .sort((a, b) => a.stock - b.stock);
}

// ─── Purchases API ────────────────────────────────────────────────────────────
export function getPurchases() {
  return load(k(PURCHASES_KEY), []);
}

export function addPurchase({ supplier, productId, productName, unitCost, quantity, size = '', color = '' }) {
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
    color,
    unitCost:      Number(unitCost),
    quantity:      Number(quantity),
    totalCost:     Number(unitCost) * Number(quantity),
    status:        '已下單',
    completedDate: null,
  };
  save(k(PURCHASES_KEY), [...getPurchases(), purchase]);
  return purchase;
}

export function updatePurchase(id, updates) {
  save(k(PURCHASES_KEY), getPurchases().map(p => {
    if (p.id !== id) return p;
    const unitCost = Number(updates.unitCost ?? p.unitCost);
    const quantity = Number(updates.quantity ?? p.quantity);
    return { ...p, ...updates, unitCost, quantity, totalCost: unitCost * quantity };
  }));
}

export function confirmReceipt(purchaseId) {
  const purchases = getPurchases();
  const purchase  = purchases.find(p => p.id === purchaseId);
  if (!purchase || purchase.status !== '已下單') return;

  let effectiveId = purchase.productId ||
    getProducts().find(p => p.name === purchase.productName)?.id || '';

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

  save(k(PURCHASES_KEY), getPurchases().map(p =>
    p.id === purchaseId
      ? { ...p, productId: effectiveId, status: '已完成', completedDate: new Date().toISOString().slice(0, 10) }
      : p
  ));

  if (effectiveId) {
    addStock(effectiveId, purchase.quantity, purchase.size ?? '', purchase.color ?? '');
  }
}

export function deletePurchase(id) {
  save(k(PURCHASES_KEY), getPurchases().filter(p => p.id !== id));
}

// ─── Sales API ────────────────────────────────────────────────────────────────
export function getSales() {
  return load(k(SALES_KEY), []);
}

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

  save(k(SALES_KEY), [...getSales(), sale]);
  deductStock(productId, quantity, size, color);
  return sale;
}

export function deleteSale(id) {
  save(k(SALES_KEY), getSales().filter(s => s.id !== id));
}

// ─── Reset ────────────────────────────────────────────────────────────────────
export function clearAllData() {
  ALL_KEYS.forEach(base => localStorage.removeItem(k(base)));
}

// ─── Tutorial ─────────────────────────────────────────────────────────────────
export function isTutorialDone()   { return load(k(TUTORIAL_KEY), false) === true; }
export function markTutorialDone() { save(k(TUTORIAL_KEY), true); }

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
