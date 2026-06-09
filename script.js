/* =========================================================
   noon clone — Advanced application logic
   Storefront + Admin · 100% client-side (LocalStorage)
   ========================================================= */

const ADMIN_PASSWORD = "202612570";

const KEYS = {
  products:"noon_products", categories:"noon_categories", cart:"noon_cart",
  wishlist:"noon_wishlist", orders:"noon_orders", reviews:"noon_reviews",
  coupons:"noon_coupons", settings:"noon_settings", recent:"noon_recent"
};

/* ---------------- storage ---------------- */
const load=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??f;}catch{return f;}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));

/* ---------------- placeholder image ---------------- */
const CAT_COLOR={Phones:"#2f6bff",Laptops:"#5b3bd1",Audio:"#1fa463",Wearables:"#ff7a1a",
  Gaming:"#e23b3b",Cameras:"#0bb5c4",Accessories:"#8b8e98",TVs:"#d1467a"};
function placeholder(label,cat){
  const txt=(label||"Product").replace(/[<>&]/g,"").slice(0,16);
  const c={Phones:"#2f6bff",Laptops:"#5b3bd1"}[cat]||"#15161a";
  return `https://dummyimage.com/600x600/${c.slice(1)}/ffffff&text=${encodeURIComponent(txt)}`;
}

/* ---------------- DEFAULT DATA (SAMPLE PRODUCTS) ---------------- */
const defaultCategories = ["Phones", "Laptops", "Audio", "Wearables", "Gaming", "TVs", "Accessories"];

const defaultProducts = [
  {
    id: "p1",
    title: "Apple iPhone 15 Pro Max (256GB, Natural Titanium)",
    category: "Phones",
    price: 4199,
    oldPrice: 4599,
    stock: 15,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?q=80&w=600",
    description: "Experience the ultimate iPhone with a titanium design, A17 Pro chip, and the most powerful iPhone camera system ever.",
    featured: true
  },
  {
    id: "p2",
    title: "Samsung Galaxy S24 Ultra (512GB, Titanium Gray)",
    category: "Phones",
    price: 3999,
    oldPrice: 4399,
    stock: 10,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=600",
    description: "Welcome to the era of mobile AI. With Galaxy S24 Ultra in your hands, you can unleash whole new levels of creativity and productivity.",
    featured: true
  }
];

/* ---------------- state ---------------- */
let categories = load(KEYS.categories, defaultCategories);
let products = load(KEYS.products, defaultProducts);
let cart = load(KEYS.cart, []);
let wishlist = load(KEYS.wishlist, []);
let orders = load(KEYS.orders, []);
let coupons = load(KEYS.coupons, [{code:"NOON20",discount:20,type:"percent"},{code:"SAVE50",discount:50,type:"flat"}]);
let currentCategory = "all";
let currentSort = "featured";
let searchQuery = "";
let selectedProduct = null;
let editingProductId = null;

/* ---------------- helpers ---------------- */
const $=(id)=>document.getElementById(id);
const toast=(m)=>{const t=$("toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),3000);};

function fixDriveLink(url) {
    if (!url) return "";
    if (url.includes('drive.google.com')) {
        let fileId = '';
        if (url.includes('/d/')) fileId = url.split('/d/')[1].split('/')[0];
        else if (url.includes('id=')) fileId = url.split('id=')[1].split('&')[0];
        return fileId ? `https://drive.google.com/uc?export=view&id=${fileId}` : url;
    }
    return url;
}

/* ---------------- render storefront ---------------- */
function initStore() {
  renderCatMenu();
  renderProducts();
  updateCartBadge();
  initFilters();
}

function renderCatMenu() {
  const container = $("catMenu");
  if(!container) return;
  let html = `<button class="cat-pill ${currentCategory==='all'?'active':''}" data-cat="all">All Products</button>`;
  categories.forEach(c => {
    html += `<button class="cat-pill ${currentCategory===c?'active':''}" data-cat="${c}">${c}</button>`;
  });
  container.innerHTML = html;
  container.querySelectorAll(".cat-pill").forEach(b => {
    b.onclick = () => { currentCategory = b.dataset.cat; renderCatMenu(); renderProducts(); };
  });

  // admin select
  const sel = $("fCategory");
  if(sel) {
    sel.innerHTML = categories.map(c=>`<option value="${c}">${c}</option>`).join("");
  }
}

function renderProducts() {
  const grid = $("storeGrid");
  if(!grid) return;

  let filtered = products.filter(p => {
    const mCat = currentCategory === "all" || p.category === currentCategory;
    const mSrc = !searchQuery || p.title.toLowerCase().includes(searchQuery) || p.description.toLowerCase().includes(searchQuery);
    return mCat && mSrc;
  });

  if(currentSort === "low") filtered.sort((a,b)=>a.price-b.price);
  else if(currentSort === "high") filtered.sort((a,b)=>b.price-a.price);
  else if(currentSort === "rating") filtered.sort((a,b)=>b.rating-a.rating);

  if(filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state"><h3>No products found</h3><p>Try resetting filters or search query.</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const inWish = wishlist.includes(p.id);
    const saveAmt = p.oldPrice && p.oldPrice > p.price ? Math.round(((p.oldPrice-p.price)/p.oldPrice)*100) : 0;
    const imgUrl = p.image ? fixDriveLink(p.image) : placeholder(p.title, p.category);

    return `
      <div class="p-card" data-id="${p.id}">
        <div class="p-card__badge" style="display:${saveAmt?'block':'none'}">${saveAmt}% OFF</div>
        <button class="p-card__wish ${inWish?'active':''}" onclick="toggleWish('${p.id}',event)">${inWish?'❤️':'🤍'}</button>
        <div class="p-card__img" onclick="openDetails('${p.id}')">
          <img src="${imgUrl}" alt="${p.title}" loading="lazy" onerror="this.src='${placeholder(p.title,p.category)}'">
        </div>
        <div class="p-card__info" onclick="openDetails('${p.id}')">
          <div class="p-card__cat">${p.category}</div>
          <h3 class="p-card__title">${p.title}</h3>
          <div class="p-card__rating">⭐ <span>${p.rating || 4.5}</span></div>
          <div class="p-card__price">
            <span class="curr">AED</span> <b>${p.price}</b>
            ${p.oldPrice?`<span class="old">AED ${p.oldPrice}</span>`:""}
          </div>
        </div>
        <button class="btn btn--yellow btn--block" onclick="addCart('${p.id}',1,event)">Add to Cart</button>
      </div>
    `;
  }).join("");
}

function initFilters() {
  const s = $("sortSelect");
  if(s) s.onchange = (e) => { currentSort = e.target.value; renderProducts(); };
  
  const src = $("srcInp");
  if(src) src.oninput = (e) => { searchQuery = e.target.value.toLowerCase().trim(); renderProducts(); };
  
  const msrc = $("msrcInp");
  if(msrc) msrc.oninput = (e) => { searchQuery = e.target.value.toLowerCase().trim(); renderProducts(); };
}

/* ---------------- interactions ---------------- */
window.toggleWish = (id,e) => {
  e.stopPropagation();
  if(wishlist.includes(id)) wishlist=wishlist.filter(i=>i!==id);
  else wishlist.push(id);
  save(KEYS.wishlist,wishlist);
  renderProducts();
  toast(wishlist.includes(id)?"Added to Wishlist! ❤️":"Removed from Wishlist");
};

window.addCart = (id,qty=1,e) => {
  if(e) e.stopPropagation();
  const p = products.find(i=>i.id===id);
  if(!p) return;
  const exist = cart.find(i=>i.id===id);
  if(exist) exist.qty += qty;
  else cart.push({id, qty});
  save(KEYS.cart,cart);
  updateCartBadge();
  toast("Added to Cart! 🛒");
};

function updateCartBadge() {
  const c = cart.reduce((a,i)=>a+i.qty,0);
  const b = $("cartBadge"); if(b) b.textContent = c;
  const mb = $("mCartBadge"); if(mb) mb.textContent = c;
}

window.openDetails = (id) => {
  const p = products.find(i=>i.id===id);
  if(!p) return;
  selectedProduct = p;
  $("pModalImg").src = p.image ? fixDriveLink(p.image) : placeholder(p.title, p.category);
  $("pModalCat").textContent = p.category;
  $("pModalTitle").textContent = p.title;
  $("pModalPrice").textContent = p.price;
  $("pModalOld").textContent = p.oldPrice ? `AED ${p.oldPrice}` : "";
  $("pModalDesc").textContent = p.description || "No description available.";
  openModal("productModal");
};

$("pModalAddBtn").onclick = () => {
  if(selectedProduct) {
    addCart(selectedProduct.id, 1);
    closeModal("productModal");
  }
};

/* ---------------- modals framework ---------------- */
function openModal(id) { $(id).classList.add("show"); document.body.style.overflow="hidden"; }
function closeModal(id) { $(id).classList.remove("show"); document.body.style.overflow=""; }

$("cartTrigger").onclick = openCartModal;
$("mCartTrigger").onclick = openCartModal;

function openCartModal() {
  renderCartItems();
  openModal("cartModal");
}

function renderCartItems() {
  const container = $("cartItemsList");
  if(!container) return;
  if(cart.length===0){
    container.innerHTML="<p style='text-align:center;padding:40px 0;color:var(--muted)'>Your cart is empty</p>";
    $("cartTotal").textContent="0";
    return;
  }
  let total = 0;
  container.innerHTML = cart.map(item => {
    const p = products.find(i=>i.id===item.id);
    if(!p) return "";
    total += p.price * item.qty;
    return `
      <div class="cart-item">
        <img src="${p.image?fixDriveLink(p.image):placeholder(p.title,p.category)}" width="60">
        <div style="flex:1">
          <h4>${p.title}</h4>
          <p class="price">AED ${p.price}</p>
        </div>
        <div class="cart-item__actions">
          <button onclick="changeQty('${p.id}',-1)">-</button>
          <span>${item.qty}</span>
          <button onclick="changeQty('${p.id}',1)">+</button>
        </div>
      </div>
    `;
  }).join("");
  $("cartTotal").textContent = total;
}

window.changeQty = (id,amt) => {
  const item = cart.find(i=>i.id===id);
  if(!item) return;
  item.qty += amt;
  if(item.qty <= 0) cart = cart.filter(i=>i.id!==id);
  save(KEYS.cart,cart);
  updateCartBadge();
  renderCartItems();
};

$("checkoutBtn").onclick = () => {
  if(cart.length===0) return toast("Cart is empty");
  closeModal("cartModal");
  $("checkoutTotal").textContent = $("cartTotal").textContent;
  openModal("checkoutModal");
};

function placeOrder() {
  const name = $("orderName").value.trim();
  const phone = $("orderPhone").value.trim();
  const address = $("orderAddress").value.trim();
  if(!name || !phone || !address) return toast("Please fill all fields");

  const order = {
    id: "ORD-"+Math.floor(100000+Math.random()*900000),
    name, phone, address,
    items: [...cart],
    total: Number($("cartTotal").textContent),
    status: "Pending",
    date: new Date().toLocaleDateString()
  };

  orders.push(order);
  save(KEYS.orders,orders);
  cart = [];
  save(KEYS.cart,cart);
  updateCartBadge();
  closeModal("checkoutModal");
  $("orderSuccessId").textContent = order.id;
  openModal("doneModal");
}

document.querySelectorAll('input[name="pay"]').forEach(r=>r.addEventListener("change",()=>{$("cardFields").hidden=document.querySelector('input[name="pay"]:checked').value!=="card";}));
$("placeOrderBtn").onclick = placeOrder;
$("doneClose").onclick = () => closeModal("doneModal");

/* ===== ADMIN ===== */
$("adminTrigger").onclick = e => { e.preventDefault(); openModal("loginModal"); };
function doLogin() {
  if($("adminPass").value === ADMIN_PASSWORD) {
    $("adminPass").value = "";
    $("loginErr").textContent = "";
    closeModal("loginModal");
    openAdmin();
  } else $("loginErr").textContent = "Incorrect password.";
}
$("loginBtn").onclick = doLogin;
$("adminPass").addEventListener("keydown",e=>{if(e.key==="Enter")doLogin();});
$("exitAdmin").onclick = closeAdmin;
$("logoutBtn").onclick = closeAdmin;

function openAdmin() {
  $("store").style.display = "none";
  $("admin").style.display = "block";
  renderAdminProducts();
  renderAdminOrders();
}
function closeAdmin() {
  $("admin").style.display = "none";
  $("store").style.display = "block";
  renderProducts();
}

function renderAdminProducts() {
  const tbody = $("adminProdTable");
  if(!tbody) return;
  tbody.innerHTML = products.map(p => `
    <tr>
      <td><img src="${p.image?fixDriveLink(p.image):placeholder(p.title,p.category)}" width="40"></td>
      <td><strong>${p.title}</strong></td>
      <td>${p.category}</td>
      <td>AED ${p.price}</td>
      <td>${p.stock}</td>
      <td>
        <button class="icon-btn" onclick="editProd('${p.id}')">✏️</button>
        <button class="icon-btn" onclick="deleteProd('${p.id}')">❌</button>
      </td>
    </tr>
  `).join("");
}

$("saveProdBtn").onclick = () => {
  const title = $("fTitle").value.trim();
  const category = $("fCategory").value;
  const price = Number($("fPrice").value);
  const oldPrice = Number($("fOld").value) || null;
  const stock = Number($("fStock").value) || 0;
  const rating = Number($("fRating").value) || 4.5;
  const image = $("fImage").value.trim();
  const description = $("fDesc").value.trim();
  const featured = $("fFeatured").checked;

  if(!title || !price) return $("prodErr").textContent="Title and Price are required";

  if(editingProductId) {
    const p = products.find(i=>i.id===editingProductId);
    Object.assign(p, {title, category, price, oldPrice, stock, rating, image, description, featured});
    editingProductId = null;
    $("saveProdBtn").textContent = "Save Product";
  } else {
    products.push({id:"p-"+Date.now(), title, category, price, oldPrice, stock, rating, image, description, featured});
  }

  save(KEYS.products,products);
  renderAdminProducts();
  clearProdForm();
  toast("Product saved successfully!");
};

window.deleteProd = (id) => {
  if(confirm("Delete this product?")) {
    products = products.filter(i=>i.id!==id);
    save(KEYS.products,products);
    renderAdminProducts();
  }
};

window.editProd = (id) => {
  const p = products.find(i=>i.id===id);
  if(!p) return;
  editingProductId = p.id;
  $("fTitle").value = p.title;
  $("fCategory").value = p.category;
  $("fPrice").value = p.price;
  $("fOld").value = p.oldPrice || "";
  $("fStock").value = p.stock;
  $("fRating").value = p.rating;
  $("fImage").value = p.image;
  $("fDesc").value = p.description;
  $("fFeatured").checked = !!p.featured;
  $("saveProdBtn").textContent = "Update Product";
  $("fTitle").focus();
};

function clearProdForm() {
  $("fTitle").value=""; $("fPrice").value=""; $("fOld").value="";
  $("fStock").value=""; $("fRating").value=""; $("fImage").value="";
  $("fDesc").value=""; $("fFeatured").checked=false; $("prodErr").textContent="";
}

function renderAdminOrders() {
  const tbody = $("adminOrderTable");
  if(!tbody) return;
  if(orders.length===0) { tbody.innerHTML="<tr><td colspan='6' style='text-align:center'>No orders yet</td></tr>"; return; }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><strong>${o.id}</strong></td>
      <td>${o.name}<br><small>${o.phone}</small></td>
      <td>${o.date}</td>
      <td>AED ${o.total}</td>
      <td><span class="badge badge--pending">${o.status}</span></td>
      <td><button class="btn btn--sm" onclick="viewOrder('${o.id}')">View</button></td>
    </tr>
  `).join("");
}

window.viewOrder = (id) => {
  const o = orders.find(i=>i.id===id);
  if(!o) return;
  $("oModalId").textContent = o.id;
  $("oModalCust").textContent = `${o.name} (${o.phone})`;
  $("oModalAddr").textContent = o.address;
  $("oModalItems").innerHTML = o.items.map(item => {
    const p = products.find(i=>i.id===item.id);
    return `<li>${p?p.title:'Unknown Product'} x ${item.qty}</li>`;
  }).join("");
  openModal("orderModal");
};

// Auto close modals on background click
document.querySelectorAll(".modal").forEach(m => {
  m.onclick = (e) => { if(e.target === m) m.classList.remove("show"); document.body.style.overflow=""; };
});
document.querySelectorAll("[data-close-modal]").forEach(b => {
  b.onclick = () => { b.closest(".modal").classList.remove("show"); document.body.style.overflow=""; };
});

// App Initiation
initStore();
