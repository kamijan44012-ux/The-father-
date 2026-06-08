/* =========================================================
   noon clone — App logic
   Storefront + Cart + Orders + Admin  (LocalStorage)
   ========================================================= */

const ADMIN_PASSWORD = "202612570";

/* ---------- LocalStorage keys ---------- */
const KEYS = { products: "noon_products", cart: "noon_cart", orders: "noon_orders" };

/* ---------- Storage helpers ---------- */
const load = (key, fallback) => {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; }
  catch { return fallback; }
};
const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));

/* ---------- Placeholder image (no network needed) ---------- */
function placeholder(label) {
  const txt = (label || "Product").replace(/[<>&]/g, "").slice(0, 14);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
    <rect width='400' height='400' fill='#feee00'/>
    <rect x='120' y='120' width='160' height='160' rx='20' fill='#1a1a1a'/>
    <text x='200' y='340' font-family='Outfit,Arial' font-size='26' font-weight='700'
      fill='#1a1a1a' text-anchor='middle'>${txt}</text>
  </svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

/* ---------- Seed data (first visit only) ---------- */
const SEED = [
  { name: "Wireless Earbuds Pro",       price: 249 },
  { name: "Smart Watch Series 8",       price: 899 },
  { name: "4K Action Camera",           price: 549 },
  { name: "Bluetooth Speaker Boom",     price: 199 },
  { name: "Gaming Mouse RGB",           price: 129 },
  { name: "Mechanical Keyboard",        price: 329 },
  { name: "Power Bank 20000mAh",        price: 99  },
  { name: "Noise-Cancel Headphones",    price: 459 },
].map((p, i) => ({ id: "seed-" + i, name: p.name, price: p.price, image: "" }));

/* ---------- State ---------- */
let products = load(KEYS.products, null);
if (!products) { products = SEED; save(KEYS.products, products); }
let cart   = load(KEYS.cart, []);
let orders = load(KEYS.orders, []);

let buyNowItem = null; // holds single product when "Buy Now" is used

/* ---------- Shortcuts ---------- */
const $ = (id) => document.getElementById(id);
const aed = (n) => "AED " + Number(n).toLocaleString();

/* =========================================================
   RENDER: STOREFRONT PRODUCTS
   ========================================================= */
function renderProducts(filter = "") {
  const grid = $("productGrid");
  const term = filter.trim().toLowerCase();
  const list = products.filter(p => p.name.toLowerCase().includes(term));

  grid.innerHTML = list.map(p => {
    const img = p.image ? p.image : placeholder(p.name);
    return `
      <div class="product">
        <img class="product__img" src="${img}" alt="${escapeHtml(p.name)}"
             onerror="this.src='${placeholder(p.name)}'">
        <div class="product__body">
          <div class="product__name">${escapeHtml(p.name)}</div>
          <div class="product__price">${aed(p.price)} <small>incl. VAT</small></div>
          <div class="product__actions">
            <button class="btn btn--ghost" data-add="${p.id}">Add to Cart</button>
            <button class="btn btn--yellow" data-buy="${p.id}">Buy Now</button>
          </div>
        </div>
      </div>`;
  }).join("");

  $("emptyState").hidden = list.length !== 0;
  $("resultCount").textContent = list.length + " items";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* =========================================================
   CART
   ========================================================= */
function addToCart(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const line = cart.find(c => c.id === id);
  if (line) line.qty++;
  else cart.push({ id, name: p.name, price: p.price, image: p.image, qty: 1 });
  save(KEYS.cart, cart);
  renderCart();
  toast(`${p.name} added to cart`);
}

function changeQty(id, delta) {
  const line = cart.find(c => c.id === id);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) cart = cart.filter(c => c.id !== id);
  save(KEYS.cart, cart);
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  save(KEYS.cart, cart);
  renderCart();
}

function cartTotal() { return cart.reduce((s, c) => s + c.price * c.qty, 0); }

function renderCart() {
  const box = $("cartItems");
  const count = cart.reduce((s, c) => s + c.qty, 0);
  $("cartCount").textContent = count;

  if (cart.length === 0) {
    box.innerHTML = `<p class="empty">Your cart is empty.</p>`;
  } else {
    box.innerHTML = cart.map(c => {
      const img = c.image ? c.image : placeholder(c.name);
      return `
        <div class="cart-item">
          <img src="${img}" alt="" onerror="this.src='${placeholder(c.name)}'">
          <div class="cart-item__info">
            <div class="cart-item__name">${escapeHtml(c.name)}</div>
            <div class="cart-item__price">${aed(c.price)}</div>
            <div class="cart-item__qty">
              <button data-dec="${c.id}">−</button>
              <span>${c.qty}</span>
              <button data-inc="${c.id}">+</button>
            </div>
          </div>
          <button class="cart-item__remove" data-rm="${c.id}">Remove</button>
        </div>`;
    }).join("");
  }
  $("cartTotal").textContent = aed(cartTotal());
}

/* =========================================================
   CHECKOUT / ORDERS
   ========================================================= */
function openCheckout(single = null) {
  buyNowItem = single;
  const summary = single
    ? `${single.name} — ${aed(single.price)}`
    : `${cart.reduce((s, c) => s + c.qty, 0)} items — ${aed(cartTotal())}`;
  if (!single && cart.length === 0) { toast("Your cart is empty"); return; }
  $("checkoutSummary").textContent = summary;
  $("checkoutErr").textContent = "";
  openModal("checkoutModal");
}

function placeOrder() {
  const name = $("custName").value.trim();
  const phone = $("custPhone").value.trim();
  const addr = $("custAddr").value.trim();
  if (!name || !phone || !addr) { $("checkoutErr").textContent = "Please fill all fields."; return; }

  const items = buyNowItem
    ? [{ name: buyNowItem.name, price: buyNowItem.price, qty: 1 }]
    : cart.map(c => ({ name: c.name, price: c.price, qty: c.qty }));
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  const order = {
    id: "ORD-" + Date.now().toString().slice(-6),
    customer: { name, phone, addr },
    items, total,
    date: new Date().toLocaleString("en-GB"),
  };
  orders.unshift(order);
  save(KEYS.orders, orders);

  if (!buyNowItem) { cart = []; save(KEYS.cart, cart); renderCart(); }
  buyNowItem = null;

  ["custName", "custPhone", "custAddr"].forEach(id => ($(id).value = ""));
  closeModal("checkoutModal");
  closeCart();
  renderOrders();
  toast(`✅ Order ${order.id} placed!`);
}

/* =========================================================
   ADMIN
   ========================================================= */
function addProduct() {
  const name = $("pName").value.trim();
  const price = parseFloat($("pPrice").value);
  const image = $("pImage").value.trim();
  if (!name || isNaN(price) || price < 0) {
    $("addErr").textContent = "Enter a valid name and price."; return;
  }
  products.unshift({ id: "p-" + Date.now(), name, price, image });
  save(KEYS.products, products);
  $("pName").value = ""; $("pPrice").value = ""; $("pImage").value = "";
  $("addErr").textContent = "";
  renderProducts($("searchInput").value);
  renderAdminProducts();
  toast(`"${name}" added`);
}

function editPrice(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const val = prompt(`New price (AED) for "${p.name}":`, p.price);
  if (val === null) return;
  const num = parseFloat(val);
  if (isNaN(num) || num < 0) { toast("Invalid price"); return; }
  p.price = num;
  save(KEYS.products, products);
  renderProducts($("searchInput").value);
  renderAdminProducts();
  toast("Price updated");
}

function deleteProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p || !confirm(`Delete "${p.name}"?`)) return;
  products = products.filter(x => x.id !== id);
  save(KEYS.products, products);
  renderProducts($("searchInput").value);
  renderAdminProducts();
  toast("Product deleted");
}

function renderAdminProducts() {
  const box = $("adminProductList");
  if (products.length === 0) { box.innerHTML = `<p class="empty">No products yet.</p>`; return; }
  box.innerHTML = products.map(p => {
    const img = p.image ? p.image : placeholder(p.name);
    return `
      <div class="admin-row">
        <img src="${img}" alt="" onerror="this.src='${placeholder(p.name)}'">
        <div class="admin-row__info"><b>${escapeHtml(p.name)}</b><span>${aed(p.price)}</span></div>
        <div class="admin-row__actions">
          <button class="btn btn--sm btn--ghost" data-edit="${p.id}">Edit price</button>
          <button class="btn btn--sm btn--danger" data-del="${p.id}">Delete</button>
        </div>
      </div>`;
  }).join("");
}

function deleteOrder(id) {
  if (!confirm("Delete this order?")) return;
  orders = orders.filter(o => o.id !== id);
  save(KEYS.orders, orders);
  renderOrders();
}

function renderOrders() {
  const box = $("adminOrderList");
  $("ordersBadge").textContent = orders.length;
  if (orders.length === 0) { box.innerHTML = `<p class="empty">No orders yet.</p>`; return; }
  box.innerHTML = orders.map(o => `
    <div class="order-card">
      <div class="order-card__head">
        <span class="order-card__id">${o.id}</span>
        <span class="order-card__date">${o.date}</span>
      </div>
      <div class="order-card__cust">
        <span>Customer:</span> ${escapeHtml(o.customer.name)} ·
        <span>📞</span> ${escapeHtml(o.customer.phone)}<br>
        <span>📍</span> ${escapeHtml(o.customer.addr)}
      </div>
      <ul class="order-card__items">
        ${o.items.map(i => `<li><span>${escapeHtml(i.name)} × ${i.qty}</span><span>${aed(i.price * i.qty)}</span></li>`).join("")}
      </ul>
      <div class="order-card__total"><span>Total</span><span>${aed(o.total)}</span></div>
      <div style="margin-top:12px;text-align:right">
        <button class="btn btn--sm btn--danger" data-delorder="${o.id}">Delete order</button>
      </div>
    </div>`).join("");
}

/* =========================================================
   UI HELPERS
   ========================================================= */
function openCart() { $("cartDrawer").classList.add("open"); $("overlay").classList.add("show"); }
function closeCart() { $("cartDrawer").classList.remove("open"); $("overlay").classList.remove("show"); }
function openModal(id) { $(id).classList.add("show"); }
function closeModal(id) { $(id).classList.remove("show"); }

let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2500);
}

function openAdmin() {
  $("adminPanel").classList.add("show");
  document.body.style.overflow = "hidden";
  renderAdminProducts();
  renderOrders();
}
function closeAdmin() {
  $("adminPanel").classList.remove("show");
  document.body.style.overflow = "";
}

/* =========================================================
   EVENTS
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  $("year").textContent = new Date().getFullYear();
  renderProducts();
  renderCart();

  /* Search */
  $("searchInput").addEventListener("input", e => renderProducts(e.target.value));

  /* Product grid clicks (event delegation) */
  $("productGrid").addEventListener("click", e => {
    const add = e.target.closest("[data-add]");
    const buy = e.target.closest("[data-buy]");
    if (add) addToCart(add.dataset.add);
    if (buy) {
      const p = products.find(x => x.id === buy.dataset.buy);
      if (p) openCheckout(p);
    }
  });

  /* Cart */
  $("cartBtn").addEventListener("click", openCart);
  $("closeCart").addEventListener("click", closeCart);
  $("overlay").addEventListener("click", closeCart);
  $("cartItems").addEventListener("click", e => {
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    const rm  = e.target.closest("[data-rm]");
    if (inc) changeQty(inc.dataset.inc, 1);
    if (dec) changeQty(dec.dataset.dec, -1);
    if (rm)  removeFromCart(rm.dataset.rm);
  });
  $("checkoutBtn").addEventListener("click", () => openCheckout(null));

  /* Checkout modal */
  $("placeOrderBtn").addEventListener("click", placeOrder);

  /* Close-buttons for any modal */
  document.querySelectorAll("[data-close-modal]").forEach(btn =>
    btn.addEventListener("click", e => e.target.closest(".modal").classList.remove("show")));
  document.querySelectorAll(".modal").forEach(m =>
    m.addEventListener("click", e => { if (e.target === m) m.classList.remove("show"); }));

  /* Admin login flow */
  $("adminTrigger").addEventListener("click", e => { e.preventDefault(); openModal("loginModal"); $("adminPass").focus(); });
  $("loginBtn").addEventListener("click", doLogin);
  $("adminPass").addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });

  function doLogin() {
    if ($("adminPass").value === ADMIN_PASSWORD) {
      $("adminPass").value = ""; $("loginErr").textContent = "";
      closeModal("loginModal");
      openAdmin();
    } else {
      $("loginErr").textContent = "Wrong password. Try again.";
    }
  }

  /* Admin panel */
  $("logoutBtn").addEventListener("click", closeAdmin);
  $("viewStoreBtn").addEventListener("click", closeAdmin);
  $("addProductBtn").addEventListener("click", addProduct);

  $("adminProductList").addEventListener("click", e => {
    const edit = e.target.closest("[data-edit]");
    const del  = e.target.closest("[data-del]");
    if (edit) editPrice(edit.dataset.edit);
    if (del)  deleteProduct(del.dataset.del);
  });
  $("adminOrderList").addEventListener("click", e => {
    const d = e.target.closest("[data-delorder]");
    if (d) deleteOrder(d.dataset.delorder);
  });

  /* Tabs */
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("is-active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("is-active"));
      tab.classList.add("is-active");
      $("tab-" + tab.dataset.tab).classList.add("is-active");
    });
  });

  /* Logo -> top */
  $("goHome").addEventListener("click", e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); });
});
