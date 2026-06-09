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
  const c=CAT_COLOR[cat]||"#15161a";
  const svg=`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
    <rect width='400' height='400' fill='${c}'/>
    <rect x='110' y='110' width='180' height='180' rx='24' fill='#feee00'/>
    <text x='200' y='350' font-family='Outfit,Arial' font-size='24' font-weight='800' fill='#fff' text-anchor='middle'>${txt}</text>
  </svg>`;
  return "data:image/svg+xml,"+encodeURIComponent(svg);
}
const imgOf=p=>p.image?p.image:placeholder(p.name,p.category);

/* ---------------- seed ---------------- */
const SEED_CATS=[
  {id:"c1",name:"Phones",icon:"📱"},{id:"c2",name:"Laptops",icon:"💻"},
  {id:"c3",name:"Audio",icon:"🎧"},{id:"c4",name:"Wearables",icon:"⌚"},
  {id:"c5",name:"Gaming",icon:"🎮"},{id:"c6",name:"Cameras",icon:"📷"},
  {id:"c7",name:"Accessories",icon:"🔌"},{id:"c8",name:"TVs",icon:"📺"}
];
const SEED_PRODUCTS=[
  ["Galaxy Ultra Smartphone","Phones",3299,3799,40,4.7,1],
  ["ProBook 16 Laptop","Laptops",4599,5199,18,4.6,1],
  ["Wireless Earbuds Pro","Audio",249,349,120,4.5,1],
  ["Smart Watch Series 8","Wearables",899,1099,55,4.4,1],
  ["Console X Gaming","Gaming",1799,1999,12,4.8,1],
  ["4K Action Camera","Cameras",549,699,33,4.3,0],
  ["Mechanical Keyboard RGB","Accessories",329,0,80,4.5,0],
  ["55\" 4K Smart TV","TVs",1999,2499,9,4.6,1],
  ["Noise-Cancel Headphones","Audio",459,599,40,4.7,0],
  ["Power Bank 20000mAh","Accessories",99,149,200,4.2,0],
  ["Budget Smartphone Lite","Phones",699,799,60,4.0,0],
  ["Gaming Laptop RTX","Laptops",6499,0,7,4.9,1],
  ["Fitness Band Slim","Wearables",179,229,90,4.1,0],
  ["Mirrorless Camera Kit","Cameras",3299,3699,5,4.8,0],
  ["Bluetooth Speaker Boom","Audio",199,259,70,4.3,0],
  ["Wireless Charger Pad","Accessories",89,0,150,4.0,0]
].map((a,i)=>({id:"p"+i,name:a[0],category:a[1],price:a[2],oldPrice:a[3],
  stock:a[4],rating:a[5],featured:!!a[6],image:"",
  desc:"Premium "+a[1].toLowerCase()+" with great performance, warranty included. Genuine product shipped across the UAE.",
  created:Date.now()-i*86400000}));
const SEED_COUPONS=[{code:"SAVE10",percent:10},{code:"NOON20",percent:20}];
const SEED_SETTINGS={storeName:"noon",freeThreshold:100,shippingFee:15};
const HERO_SLIDES=[
  {tag:"ELECTRONICS SALE",title:"Big tech.<br>Bigger savings.",sub:"Up to 40% off phones, laptops & gadgets.",emoji:"📱",bg:"linear-gradient(120deg,#15161a,#2f2f3a)"},
  {tag:"GAME ON",title:"Level up your<br>setup.",sub:"Consoles, accessories & more in stock.",emoji:"🎮",bg:"linear-gradient(120deg,#5b1d8a,#a02bd1)"},
  {tag:"SOUND CHECK",title:"Hear every<br>detail.",sub:"Top audio brands at unbeatable prices.",emoji:"🎧",bg:"linear-gradient(120deg,#0b6e63,#1fa463)"}
];

/* ---------------- state ---------------- */
let categories=load(KEYS.categories,null); if(!categories){categories=SEED_CATS;save(KEYS.categories,categories);}
let products=load(KEYS.products,null);     if(!products){products=SEED_PRODUCTS;save(KEYS.products,products);}
let coupons=load(KEYS.coupons,null);       if(!coupons){coupons=SEED_COUPONS;save(KEYS.coupons,coupons);}
let settings=load(KEYS.settings,null);     if(!settings){settings=SEED_SETTINGS;save(KEYS.settings,settings);}
let cart=load(KEYS.cart,[]);
let wishlist=load(KEYS.wishlist,[]);
let orders=load(KEYS.orders,[]);
let reviews=load(KEYS.reviews,[]);
let recent=load(KEYS.recent,[]);

let filterState={cats:new Set(),maxPrice:5000,minRating:0,sort:"featured",search:""};
let activePromo=null;          // {code,percent}
let buyNowItem=null;
let pdProduct=null, pdQty=1;
let editingProductId=null;

/* ---------------- shortcuts ---------------- */
const $=id=>document.getElementById(id);
const aed=n=>"AED "+Number(n).toLocaleString(undefined,{maximumFractionDigits:0});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function stars(r){const f=Math.round(r);return "★".repeat(f)+"☆".repeat(5-f);}
let toastT;
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),2400);}

/* =========================================================
   STOREFRONT — HERO
   ========================================================= */
let heroIdx=0,heroTimer;
function renderHero(){
  $("heroTrack").innerHTML=HERO_SLIDES.map(s=>`
    <div class="slide" style="background:${s.bg}">
      <div><p class="slide__tag">${s.tag}</p><h2>${s.title}</h2><p>${s.sub}</p>
      <a href="#shopAnchor" class="slide__btn">Shop now</a></div>
      <div class="slide__emoji">${s.emoji}</div>
    </div>`).join("");
  $("heroDots").innerHTML=HERO_SLIDES.map((_,i)=>`<button data-dot="${i}" class="${i===0?'is-active':''}"></button>`).join("");
  goHeroSlide(0); startHeroAuto();
}
function goHeroSlide(i){
  heroIdx=(i+HERO_SLIDES.length)%HERO_SLIDES.length;
  $("heroTrack").style.transform=`translateX(-${heroIdx*100}%)`;
  document.querySelectorAll("#heroDots button").forEach((d,k)=>d.classList.toggle("is-active",k===heroIdx));
}
function startHeroAuto(){clearInterval(heroTimer);heroTimer=setInterval(()=>goHeroSlide(heroIdx+1),5000);}

/* =========================================================
   CATEGORIES (nav, tiles, filters)
   ========================================================= */
function renderCategories(){
  // top nav
  $("catNav").innerHTML=`<button class="${filterState.cats.size===0?'is-active':''}" data-allcat>All</button>`+
    categories.map(c=>`<button data-cat="${esc(c.name)}">${c.icon} ${esc(c.name)}</button>`).join("");
  // tiles
  $("catTiles").innerHTML=categories.map(c=>`
    <div class="cat-tile" data-cat="${esc(c.name)}"><div class="cat-tile__ico">${c.icon}</div><div class="cat-tile__name">${esc(c.name)}</div></div>`).join("");
  // filter checkboxes
  $("filterCats").innerHTML=categories.map(c=>`
    <label class="check-row"><input type="checkbox" value="${esc(c.name)}" ${filterState.cats.has(c.name)?'checked':''}> ${c.icon} ${esc(c.name)}</label>`).join("");
  // mobile nav
  $("mobileCats").innerHTML=`<button data-allcat>🛍 All Products</button>`+
    categories.map(c=>`<button data-cat="${esc(c.name)}">${c.icon} ${esc(c.name)}</button>`).join("");
}

/* =========================================================
   PRODUCT CARD + GRID
   ========================================================= */
function ratingOf(p){
  const rv=reviews.filter(r=>r.productId===p.id);
  if(rv.length) return rv.reduce((s,r)=>s+r.rating,0)/rv.length;
  return p.rating||0;
}
function reviewCount(p){return reviews.filter(r=>r.productId===p.id).length;}

function productCard(p){
  const disc=p.oldPrice&&p.oldPrice>p.price?Math.round((1-p.price/p.oldPrice)*100):0;
  const inWish=wishlist.includes(p.id);
  const r=ratingOf(p);
  const stockTxt=p.stock<=0?`<span class="product__stock out">Out of stock</span>`
    :p.stock<10?`<span class="product__stock low">Only ${p.stock} left</span>`
    :`<span class="product__stock">In stock</span>`;
  return `<div class="product">
    ${disc?`<span class="product__badge">-${disc}%</span>`:""}
    <button class="product__wish ${inWish?'on':''}" data-wish="${p.id}">${inWish?'♥':'♡'}</button>
    <div class="product__imgwrap" data-view="${p.id}"><img class="product__img" src="${imgOf(p)}" alt="${esc(p.name)}" onerror="this.src='${placeholder(p.name,p.category)}'"></div>
    <div class="product__body">
      <div class="product__name" data-view="${p.id}">${esc(p.name)}</div>
      <div class="product__rating"><span class="stars">${stars(r)}</span> ${r.toFixed(1)} (${reviewCount(p)})</div>
      <div class="product__price"><b>${aed(p.price)}</b>${p.oldPrice&&p.oldPrice>p.price?`<del>${aed(p.oldPrice)}</del><em>Save ${disc}%</em>`:""}</div>
      ${stockTxt}
      <div class="product__actions">
        <button class="btn btn--ghost" data-add="${p.id}" ${p.stock<=0?'disabled':''}>Add to Cart</button>
        <button class="btn btn--yellow" data-buy="${p.id}" ${p.stock<=0?'disabled':''}>Buy Now</button>
      </div>
    </div></div>`;
}

function computeProducts(){
  let list=products.slice();
  const f=filterState;
  if(f.cats.size) list=list.filter(p=>f.cats.has(p.category));
  list=list.filter(p=>p.price<=f.maxPrice);
  if(f.minRating) list=list.filter(p=>ratingOf(p)>=f.minRating);
  if(f.search){const t=f.search.toLowerCase();list=list.filter(p=>p.name.toLowerCase().includes(t)||p.category.toLowerCase().includes(t));}
  switch(f.sort){
    case"low":list.sort((a,b)=>a.price-b.price);break;
    case"high":list.sort((a,b)=>b.price-a.price);break;
    case"rating":list.sort((a,b)=>ratingOf(b)-ratingOf(a));break;
    case"new":list.sort((a,b)=>b.created-a.created);break;
    default:list.sort((a,b)=>(b.featured?1:0)-(a.featured?1:0));
  }
  return list;
}
function renderGrid(){
  const list=computeProducts();
  $("productGrid").innerHTML=list.map(productCard).join("");
  $("emptyState").hidden=list.length!==0;
  $("shopTitle").textContent=filterState.cats.size===1?[...filterState.cats][0]:"All Products";
}
function renderDeals(){
  const deals=products.filter(p=>p.featured);
  $("dealsRow").innerHTML=deals.map(productCard).join("")||`<p class="muted">No deals right now.</p>`;
}
function renderRecent(){
  const items=recent.map(id=>products.find(p=>p.id===id)).filter(Boolean);
  $("recentSection").hidden=items.length===0;
  $("recentRow").innerHTML=items.map(productCard).join("");
}

/* =========================================================
   SEARCH SUGGESTIONS
   ========================================================= */
function renderSuggest(term){
  const box=$("searchSuggest");
  if(!term.trim()){box.classList.remove("show");return;}
  const t=term.toLowerCase();
  const matches=products.filter(p=>p.name.toLowerCase().includes(t)).slice(0,5);
  if(!matches.length){box.classList.remove("show");return;}
  box.innerHTML=matches.map(p=>`<div class="suggest__item" data-view="${p.id}"><img src="${imgOf(p)}"><b>${esc(p.name)}</b><span>${aed(p.price)}</span></div>`).join("");
  box.classList.add("show");
}

/* =========================================================
   PRODUCT DETAIL
   ========================================================= */
function openProduct(id){
  const p=products.find(x=>x.id===id); if(!p)return;
  pdProduct=p; pdQty=1;
  // track recently viewed
  recent=[id,...recent.filter(x=>x!==id)].slice(0,8); save(KEYS.recent,recent); renderRecent();
  renderPD();
  openModal("productModal");
}
function renderPD(){
  const p=pdProduct; const r=ratingOf(p);
  const disc=p.oldPrice&&p.oldPrice>p.price?Math.round((1-p.price/p.oldPrice)*100):0;
  const rv=reviews.filter(x=>x.productId===p.id);
  $("pdBody").innerHTML=`
    <img class="pd__img" src="${imgOf(p)}" onerror="this.src='${placeholder(p.name,p.category)}'">
    <div>
      <h3 class="pd__title">${esc(p.name)}</h3>
      <div class="pd__rating"><span class="stars">${stars(r)}</span> ${r.toFixed(1)} · ${rv.length} reviews · ${esc(p.category)}</div>
      <div class="pd__price"><b>${aed(p.price)}</b>${p.oldPrice&&p.oldPrice>p.price?`<del>${aed(p.oldPrice)}</del>`:""}${disc?`<em style="color:var(--green);font-weight:700">-${disc}%</em>`:""}</div>
      <div class="product__stock ${p.stock<=0?'out':p.stock<10?'low':''}">${p.stock<=0?'Out of stock':p.stock<10?'Only '+p.stock+' left':'In stock'}</div>
      <p class="pd__desc">${esc(p.desc||"")}</p>
      <div class="pd__qty"><span>Qty</span>
        <button data-pdqty="-1">−</button><b id="pdQtyVal">${pdQty}</b><button data-pdqty="1">+</button></div>
      <div class="pd__actions">
        <button class="btn btn--ghost" id="pdAdd" ${p.stock<=0?'disabled':''}>Add to Cart</button>
        <button class="btn btn--yellow" id="pdBuy" ${p.stock<=0?'disabled':''}>Buy Now</button>
      </div>
    </div>
    <div class="pd__reviews">
      <h4 style="margin-bottom:10px">Reviews (${rv.length})</h4>
      ${rv.length?rv.map(x=>`<div class="review"><b>${esc(x.name)}</b> <span class="stars">${stars(x.rating)}</span><p>${esc(x.text)}</p></div>`).join(""):`<p class="muted">No reviews yet. Be the first!</p>`}
      <div class="review-form">
        <input id="rvName" placeholder="Your name">
        <select id="rvRating"><option value="5">★★★★★</option><option value="4">★★★★</option><option value="3">★★★</option><option value="2">★★</option><option value="1">★</option></select>
        <input id="rvText" placeholder="Write a review..." style="flex:1 1 100%">
        <button class="btn btn--sm" id="rvSubmit">Submit review</button>
      </div>
    </div>`;
}

/* =========================================================
   CART
   ========================================================= */
function addToCart(id,qty=1){
  const p=products.find(x=>x.id===id); if(!p||p.stock<=0)return;
  const line=cart.find(c=>c.id===id);
  if(line) line.qty=Math.min(line.qty+qty,p.stock);
  else cart.push({id,qty:Math.min(qty,p.stock)});
  save(KEYS.cart,cart); renderCart(); toast(`${p.name} added to cart`);
}
function changeQty(id,d){
  const line=cart.find(c=>c.id===id); if(!line)return;
  const p=products.find(x=>x.id===id);
  line.qty+=d;
  if(line.qty<=0) cart=cart.filter(c=>c.id!==id);
  else if(p&&line.qty>p.stock) line.qty=p.stock;
  save(KEYS.cart,cart); renderCart();
}
function removeCart(id){cart=cart.filter(c=>c.id!==id);save(KEYS.cart,cart);renderCart();}
function cartLines(){return cart.map(c=>{const p=products.find(x=>x.id===c.id);return p?{...p,qty:c.qty}:null;}).filter(Boolean);}
function cartSubtotal(){return cartLines().reduce((s,l)=>s+l.price*l.qty,0);}

function renderCart(){
  const lines=cartLines();
  const count=lines.reduce((s,l)=>s+l.qty,0);
  $("cartCount").textContent=count; $("cartItemsCount").textContent=count;
  const box=$("cartItems");
  if(!lines.length){box.innerHTML=`<p class="empty">Your cart is empty.</p>`;$("cartFoot").style.display="none";}
  else{
    $("cartFoot").style.display="block";
    box.innerHTML=lines.map(l=>`<div class="cart-item">
      <img src="${imgOf(l)}" onerror="this.src='${placeholder(l.name,l.category)}'">
      <div class="cart-item__info"><div class="cart-item__name">${esc(l.name)}</div>
        <div class="cart-item__price">${aed(l.price)}</div>
        <div class="qty"><button data-dec="${l.id}">−</button><span>${l.qty}</span><button data-inc="${l.id}">+</button></div></div>
      <button class="cart-item__rm" data-rm="${l.id}">Remove</button></div>`).join("");
  }
  const sub=cartSubtotal();
  const disc=activePromo?Math.round(sub*activePromo.percent/100):0;
  const ship=(sub-disc)>=settings.freeThreshold||sub===0?0:settings.shippingFee;
  $("sumSub").textContent=aed(sub);
  $("sumDisc").textContent="- "+aed(disc);
  $("sumTotal").textContent=aed(sub-disc+ship);
  $("sumShip").textContent=ship===0?"FREE":aed(ship);
}
function applyPromo(){
  const code=$("promoInput").value.trim().toUpperCase();
  const msg=$("promoMsg");
  const c=coupons.find(x=>x.code.toUpperCase()===code);
  if(!code){msg.textContent="";return;}
  if(c){activePromo=c;msg.textContent=`✓ ${c.percent}% off applied!`;msg.className="promo__msg ok";}
  else{activePromo=null;msg.textContent="Invalid promo code.";msg.className="promo__msg bad";}
  renderCart();
}

/* =========================================================
   WISHLIST
   ========================================================= */
function toggleWish(id){
  if(wishlist.includes(id)) wishlist=wishlist.filter(x=>x!==id);
  else {wishlist.push(id);toast("Added to wishlist");}
  save(KEYS.wishlist,wishlist); renderWish(); renderGrid(); renderDeals(); renderRecent();
}
function renderWish(){
  $("wishCount").textContent=wishlist.length;
  const items=wishlist.map(id=>products.find(p=>p.id===id)).filter(Boolean);
  $("wishItems").innerHTML=items.length?items.map(p=>`<div class="wish-item">
    <img src="${imgOf(p)}" onerror="this.src='${placeholder(p.name,p.category)}'">
    <div class="wish-item__info"><b>${esc(p.name)}</b><span>${aed(p.price)}</span></div>
    <button class="btn btn--sm" data-add="${p.id}">Add</button>
    <button class="cart-item__rm" data-wish="${p.id}">✕</button></div>`).join(""):`<p class="empty">Your wishlist is empty.</p>`;
}

/* =========================================================
   CHECKOUT
   ========================================================= */
function startCheckout(single=null){
  buyNowItem=single;
  if(!single&&!cart.length){toast("Your cart is empty");return;}
  gotoStep(1);
  ["coErr1","coErr2","coErr3"].forEach(id=>$(id).textContent="");
  openModal("checkoutModal");
}
function gotoStep(n){
  document.querySelectorAll(".step-panel").forEach(p=>p.classList.remove("is-active"));
  $("step-"+n).classList.add("is-active");
  document.querySelectorAll(".step").forEach(s=>{
    const sn=+s.dataset.step;
    s.classList.toggle("is-active",sn===n);
    s.classList.toggle("done",sn<n);
  });
}
function checkoutItems(){
  return buyNowItem?[{...buyNowItem,qty:1}]:cartLines();
}
function renderReview(){
  const items=checkoutItems();
  const sub=items.reduce((s,l)=>s+l.price*l.qty,0);
  const disc=activePromo&&!buyNowItem?Math.round(sub*activePromo.percent/100):0;
  const ship=(sub-disc)>=settings.freeThreshold?0:settings.shippingFee;
  const pay=document.querySelector('input[name="pay"]:checked').value;
  const payTxt={cod:"Cash on Delivery",card:"Credit/Debit Card",apple:"Apple Pay"}[pay];
  $("reviewBox").innerHTML=`
    <div class="rev-block"><b>${esc($("coName").value)}</b><br>${esc($("coPhone").value)} · ${esc($("coEmail").value)}<br>
    ${esc($("coAddr").value)}, ${esc($("coZone").value)}, ${esc($("coCity").value)}<br>Payment: ${payTxt}</div>
    ${items.map(l=>`<div class="rev-item"><span>${esc(l.name)} × ${l.qty}</span><b>${aed(l.price*l.qty)}</b></div>`).join("")}
    <div class="rev-item"><span>Subtotal</span><b>${aed(sub)}</b></div>
    ${disc?`<div class="rev-item"><span>Discount</span><b>- ${aed(disc)}</b></div>`:""}
    <div class="rev-item"><span>Delivery</span><b>${ship===0?"FREE":aed(ship)}</b></div>
    <div class="rev-item" style="font-size:1.1rem;font-weight:800"><span>Total</span><b>${aed(sub-disc+ship)}</b></div>`;
}
function placeOrder(){
  const items=checkoutItems();
  const sub=items.reduce((s,l)=>s+l.price*l.qty,0);
  const disc=activePromo&&!buyNowItem?Math.round(sub*activePromo.percent/100):0;
  const ship=(sub-disc)>=settings.freeThreshold?0:settings.shippingFee;
  const pay=document.querySelector('input[name="pay"]:checked').value;
  const order={
    id:"ORD-"+Date.now().toString().slice(-7),
    customer:{name:$("coName").value.trim(),phone:$("coPhone").value.trim(),email:$("coEmail").value.trim(),
      addr:$("coAddr").value.trim(),city:$("coCity").value,zone:$("coZone").value.trim()},
    payment:pay, items:items.map(l=>({id:l.id,name:l.name,price:l.price,qty:l.qty})),
    subtotal:sub,discount:disc,shipping:ship,total:sub-disc+ship,
    status:"pending",date:new Date().toLocaleString("en-GB")
  };
  // reduce stock
  items.forEach(l=>{const p=products.find(x=>x.id===l.id);if(p)p.stock=Math.max(0,p.stock-l.qty);});
  save(KEYS.products,products);
  orders.unshift(order); save(KEYS.orders,orders);
  if(!buyNowItem){cart=[];save(KEYS.cart,cart);}
  activePromo=null; buyNowItem=null;
  renderCart();renderGrid();renderDeals();
  $("doneId").textContent=order.id;
  gotoStep("done");
}

/* =========================================================
   MY ORDERS (customer)
   ========================================================= */
function renderMyOrders(){
  $("myOrders").innerHTML=orders.length?orders.map(o=>`
    <div class="myorder"><div class="myorder__head">
      <span class="myorder__id">${o.id}</span>
      <span class="status-tag st-${o.status}">${o.status}</span></div>
      <div class="myorder__items">${o.items.map(i=>esc(i.name)+" ×"+i.qty).join(", ")}</div>
      <div style="display:flex;justify-content:space-between;margin-top:8px"><span class="muted">${o.date}</span><b>${aed(o.total)}</b></div>
    </div>`).join(""):`<p class="empty">You have no orders yet.</p>`;
}

/* =========================================================
   ADMIN
   ========================================================= */
function openAdmin(){$("adminPanel").classList.add("show");document.body.style.overflow="hidden";switchView("dashboard");}
function closeAdmin(){$("adminPanel").classList.remove("show");document.body.style.overflow="";}

function switchView(v){
  document.querySelectorAll(".snav[data-view]").forEach(b=>b.classList.toggle("is-active",b.dataset.view===v));
  const titles={dashboard:"Dashboard",products:"Products",categories:"Categories",orders:"Orders",reviews:"Reviews",coupons:"Coupons",settings:"Settings"};
  $("adminTitle").textContent=titles[v];
  ({dashboard:adminDashboard,products:adminProducts,categories:adminCategories,orders:adminOrders,reviews:adminReviews,coupons:adminCoupons,settings:adminSettings})[v]();
  $("sidebar").classList.remove("open");
}

/* ---- dashboard ---- */
function adminDashboard(){
  const revenue=orders.reduce((s,o)=>s+o.total,0);
  const pending=orders.filter(o=>o.status==="pending").length;
  const lowStock=products.filter(p=>p.stock>0&&p.stock<10);
  const out=products.filter(p=>p.stock<=0);
  // last 7 days revenue
  const days=[];
  for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push(d);}
  const dayRev=days.map(d=>{
    const key=d.toLocaleDateString("en-GB");
    return orders.filter(o=>o.date.startsWith(key)).reduce((s,o)=>s+o.total,0);
  });
  const maxRev=Math.max(...dayRev,1);
  // top products by qty in orders
  const tally={};
  orders.forEach(o=>o.items.forEach(i=>tally[i.id]=(tally[i.id]||0)+i.qty));
  const top=Object.entries(tally).sort((a,b)=>b[1]-a[1]).slice(0,5)
    .map(([id,q])=>({p:products.find(x=>x.id===id),q})).filter(x=>x.p);

  $("adminContent").innerHTML=`
    <div class="kpis">
      <div class="kpi"><span class="kpi__ico">💰</span><div class="kpi__label">Total Revenue</div><div class="kpi__val">${aed(revenue)}</div></div>
      <div class="kpi"><span class="kpi__ico">🧾</span><div class="kpi__label">Total Orders</div><div class="kpi__val">${orders.length}</div></div>
      <div class="kpi"><span class="kpi__ico">📦</span><div class="kpi__label">Products</div><div class="kpi__val">${products.length}</div></div>
      <div class="kpi"><span class="kpi__ico">⏳</span><div class="kpi__label">Pending Orders</div><div class="kpi__val">${pending}</div></div>
    </div>
    <div class="dash-2">
      <div class="panel"><h3>Revenue — last 7 days</h3>
        <div class="chart">${dayRev.map((v,i)=>`<div class="chart__bar">
          <span class="chart__amt">${v?aed(v).replace('AED ',''):''}</span>
          <div class="chart__fill" style="height:${(v/maxRev*100)}%"></div>
          <span class="chart__lbl">${days[i].toLocaleDateString("en-GB",{weekday:"short"})}</span></div>`).join("")}</div>
      </div>
      <div class="panel"><h3>Top Products</h3>
        <div class="toplist">${top.length?top.map(t=>`<div class="topitem"><img src="${imgOf(t.p)}"><b>${esc(t.p.name)}</b><span>${t.q} sold</span></div>`).join(""):`<p class="muted">No sales yet.</p>`}</div>
      </div>
    </div>
    <div class="panel"><h3>⚠ Inventory alerts</h3>
      ${out.length?`<p style="color:var(--red)"><b>${out.length}</b> product(s) out of stock: ${out.map(p=>esc(p.name)).join(", ")}</p>`:""}
      ${lowStock.length?`<p style="color:var(--orange);margin-top:6px"><b>${lowStock.length}</b> low on stock: ${lowStock.map(p=>esc(p.name)+" ("+p.stock+")").join(", ")}</p>`:""}
      ${(!out.length&&!lowStock.length)?`<p class="muted">All products are well stocked. ✅</p>`:""}
    </div>
    <div class="panel"><h3>Recent Orders</h3>
      <div class="table-wrap"><table class="atable"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
      <tbody>${orders.slice(0,5).map(o=>`<tr><td><b>${o.id}</b></td><td>${esc(o.customer.name)}</td><td>${aed(o.total)}</td><td><span class="status-tag st-${o.status}">${o.status}</span></td></tr>`).join("")||`<tr><td colspan="4" class="muted">No orders yet.</td></tr>`}</tbody></table></div>
    </div>`;
  $("navOrders").textContent=orders.length;
}

/* ---- products management ---- */
let prodSearch="";
function adminProducts(){
  $("adminContent").innerHTML=`
    <div class="toolbar">
      <input class="search-in" id="adminProdSearch" placeholder="Search products..." value="${esc(prodSearch)}">
      <button class="btn" id="newProdBtn">➕ Add Product</button>
    </div>
    <div class="table-wrap"><table class="atable">
      <thead><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Rating</th><th>Actions</th></tr></thead>
      <tbody id="adminProdBody"></tbody></table></div>`;
  renderAdminProdRows();
  $("adminProdSearch").addEventListener("input",e=>{prodSearch=e.target.value;renderAdminProdRows();});
  $("newProdBtn").addEventListener("click",()=>openProdEditor(null));
  $("adminProdBody").addEventListener("click",e=>{
    const ed=e.target.closest("[data-ed]"),dl=e.target.closest("[data-dl]");
    if(ed)openProdEditor(ed.dataset.ed);
    if(dl)delProduct(dl.dataset.dl);
  });
}
function renderAdminProdRows(){
  const t=prodSearch.toLowerCase();
  const list=products.filter(p=>p.name.toLowerCase().includes(t)||p.category.toLowerCase().includes(t));
  $("adminProdBody").innerHTML=list.map(p=>`<tr>
    <td><img src="${imgOf(p)}"></td>
    <td><b>${esc(p.name)}</b>${p.featured?' <span style="color:var(--orange)">⚡</span>':''}</td>
    <td>${esc(p.category)}</td><td>${aed(p.price)}</td>
    <td style="color:${p.stock<=0?'var(--red)':p.stock<10?'var(--orange)':'inherit'}">${p.stock}</td>
    <td>${(p.rating||0).toFixed(1)}★</td>
    <td><div class="actions"><button class="btn btn--sm btn--ghost" data-ed="${p.id}">Edit</button><button class="btn btn--sm btn--danger" data-dl="${p.id}">Delete</button></div></td></tr>`).join("")||`<tr><td colspan="7" class="muted">No products found.</td></tr>`;
}
function openProdEditor(id){
  editingProductId=id;
  $("fCategory").innerHTML=categories.map(c=>`<option>${esc(c.name)}</option>`).join("");
  const p=id?products.find(x=>x.id===id):null;
  $("prodModalTitle").textContent=p?"Edit Product":"Add Product";
  $("fName").value=p?p.name:""; $("fCategory").value=p?p.category:categories[0]?.name;
  $("fPrice").value=p?p.price:""; $("fOld").value=p&&p.oldPrice?p.oldPrice:"";
  $("fStock").value=p?p.stock:""; $("fRating").value=p?p.rating:"";
  $("fImage").value=p?p.image:""; $("fDesc").value=p?p.desc:""; $("fFeatured").checked=p?!!p.featured:false;
  $("prodErr").textContent="";
  openModal("prodModal");
}
function saveProduct(){
  const name=$("fName").value.trim(),price=parseFloat($("fPrice").value);
  if(!name||isNaN(price)||price<0){$("prodErr").textContent="Name and valid price required.";return;}
  const data={name,category:$("fCategory").value,price,
    oldPrice:parseFloat($("fOld").value)||0,stock:parseInt($("fStock").value)||0,
    rating:Math.min(5,parseFloat($("fRating").value)||0),image:$("fImage").value.trim(),
    desc:$("fDesc").value.trim(),featured:$("fFeatured").checked};
  if(editingProductId){Object.assign(products.find(p=>p.id===editingProductId),data);toast("Product updated");}
  else{products.unshift({id:"p"+Date.now(),created:Date.now(),...data});toast("Product added");}
  save(KEYS.products,products);
  closeModal("prodModal");
  renderAdminProdRows();renderGrid();renderDeals();renderCategories();
}
function delProduct(id){
  const p=products.find(x=>x.id===id);
  if(!p||!confirm(`Delete "${p.name}"?`))return;
  products=products.filter(x=>x.id!==id);save(KEYS.products,products);
  renderAdminProdRows();renderGrid();renderDeals();toast("Deleted");
}

/* ---- categories ---- */
function adminCategories(){
  $("adminContent").innerHTML=`
    <div class="toolbar">
      <input class="search-in" id="catName" placeholder="Category name">
      <input id="catIcon" placeholder="Icon (emoji)" style="width:120px">
      <button class="btn" id="addCatBtn">Add Category</button>
    </div>
    <div class="table-wrap"><table class="atable"><thead><tr><th>Icon</th><th>Name</th><th>Products</th><th>Actions</th></tr></thead>
    <tbody id="catBody"></tbody></table></div>`;
  renderCatRows();
  $("addCatBtn").addEventListener("click",()=>{
    const n=$("catName").value.trim(),ic=$("catIcon").value.trim()||"🏷";
    if(!n)return;
    if(categories.some(c=>c.name.toLowerCase()===n.toLowerCase())){toast("Category exists");return;}
    categories.push({id:"c"+Date.now(),name:n,icon:ic});save(KEYS.categories,categories);
    $("catName").value="";$("catIcon").value="";renderCatRows();renderCategories();toast("Category added");
  });
  $("catBody").addEventListener("click",e=>{
    const ed=e.target.closest("[data-ced]"),dl=e.target.closest("[data-cdl]");
    if(ed){const c=categories.find(x=>x.id===ed.dataset.ced);const nn=prompt("Rename category:",c.name);if(nn&&nn.trim()){const old=c.name;c.name=nn.trim();products.forEach(p=>{if(p.category===old)p.category=c.name;});save(KEYS.categories,categories);save(KEYS.products,products);renderCatRows();renderCategories();renderGrid();}}
    if(dl){const c=categories.find(x=>x.id===dl.dataset.cdl);if(confirm(`Delete category "${c.name}"? Products keep their label.`)){categories=categories.filter(x=>x.id!==c.id);save(KEYS.categories,categories);renderCatRows();renderCategories();}}
  });
}
function renderCatRows(){
  $("catBody").innerHTML=categories.map(c=>`<tr><td style="font-size:1.4rem">${c.icon}</td><td><b>${esc(c.name)}</b></td>
    <td>${products.filter(p=>p.category===c.name).length}</td>
    <td><div class="actions"><button class="btn btn--sm btn--ghost" data-ced="${c.id}">Rename</button><button class="btn btn--sm btn--danger" data-cdl="${c.id}">Delete</button></div></td></tr>`).join("");
}

/* ---- orders ---- */
let orderFilter="all";
function adminOrders(){
  $("adminContent").innerHTML=`
    <div class="toolbar">
      <select id="orderStatusFilter" class="status-sel" style="height:42px">
        <option value="all">All statuses</option><option value="pending">Pending</option>
        <option value="confirmed">Confirmed</option><option value="shipped">Shipped</option>
        <option value="delivered">Delivered</option><option value="cancelled">Cancelled</option>
      </select>
    </div>
    <div class="table-wrap"><table class="atable">
      <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Date</th><th>Status</th><th></th></tr></thead>
      <tbody id="orderBody"></tbody></table></div>`;
  $("orderStatusFilter").value=orderFilter;
  renderOrderRows();
  $("orderStatusFilter").addEventListener("change",e=>{orderFilter=e.target.value;renderOrderRows();});
  $("orderBody").addEventListener("click",e=>{
    const v=e.target.closest("[data-ov]"),dl=e.target.closest("[data-odl]");
    if(v)openOrderDetail(v.dataset.ov);
    if(dl){if(confirm("Delete this order?")){orders=orders.filter(o=>o.id!==dl.dataset.odl);save(KEYS.orders,orders);renderOrderRows();$("navOrders").textContent=orders.length;}}
  });
  $("orderBody").addEventListener("change",e=>{
    const sel=e.target.closest("[data-ost]");
    if(sel){const o=orders.find(x=>x.id===sel.dataset.ost);o.status=sel.value;save(KEYS.orders,orders);renderOrderRows();toast("Status updated");}
  });
}
function renderOrderRows(){
  const list=orderFilter==="all"?orders:orders.filter(o=>o.status===orderFilter);
  const opts=s=>["pending","confirmed","shipped","delivered","cancelled"].map(x=>`<option value="${x}" ${x===s?'selected':''}>${x}</option>`).join("");
  $("orderBody").innerHTML=list.map(o=>`<tr>
    <td><b>${o.id}</b></td><td>${esc(o.customer.name)}<br><span class="muted">${esc(o.customer.phone)}</span></td>
    <td>${o.items.reduce((s,i)=>s+i.qty,0)} items</td><td><b>${aed(o.total)}</b></td>
    <td class="muted">${o.date}</td>
    <td><select class="status-sel" data-ost="${o.id}">${opts(o.status)}</select></td>
    <td><div class="actions"><button class="btn btn--sm btn--ghost" data-ov="${o.id}">View</button><button class="btn btn--sm btn--danger" data-odl="${o.id}">✕</button></div></td></tr>`).join("")||`<tr><td colspan="7" class="muted">No orders.</td></tr>`;
}
function openOrderDetail(id){
  const o=orders.find(x=>x.id===id);if(!o)return;
  $("orderDetail").innerHTML=`<h3>Order ${o.id} <span class="status-tag st-${o.status}">${o.status}</span></h3>
    <p class="muted" style="margin:6px 0 16px">${o.date}</p>
    <div class="rev-block"><b>${esc(o.customer.name)}</b><br>📞 ${esc(o.customer.phone)}<br>✉ ${esc(o.customer.email)}<br>
    📍 ${esc(o.customer.addr)}, ${esc(o.customer.zone)}, ${esc(o.customer.city)}<br>💳 ${({cod:"Cash on Delivery",card:"Card",apple:"Apple Pay"})[o.payment]}</div>
    ${o.items.map(i=>`<div class="rev-item"><span>${esc(i.name)} × ${i.qty}</span><b>${aed(i.price*i.qty)}</b></div>`).join("")}
    <div class="rev-item"><span>Subtotal</span><b>${aed(o.subtotal)}</b></div>
    ${o.discount?`<div class="rev-item"><span>Discount</span><b>- ${aed(o.discount)}</b></div>`:""}
    <div class="rev-item"><span>Delivery</span><b>${o.shipping===0?"FREE":aed(o.shipping)}</b></div>
    <div class="rev-item" style="font-size:1.15rem;font-weight:800"><span>Total</span><b>${aed(o.total)}</b></div>`;
  openModal("orderModal");
}

/* ---- reviews ---- */
function adminReviews(){
  $("adminContent").innerHTML=`<div class="table-wrap"><table class="atable">
    <thead><tr><th>Product</th><th>Customer</th><th>Rating</th><th>Review</th><th></th></tr></thead>
    <tbody id="revBody"></tbody></table></div>`;
  const body=$("revBody");
  body.innerHTML=reviews.length?reviews.map(r=>{const p=products.find(x=>x.id===r.productId);
    return `<tr><td>${p?esc(p.name):"(deleted)"}</td><td>${esc(r.name)}</td><td><span class="stars">${stars(r.rating)}</span></td>
    <td>${esc(r.text)}</td><td><button class="btn btn--sm btn--danger" data-rdl="${r.id}">Delete</button></td></tr>`;}).join(""):`<tr><td colspan="5" class="muted">No reviews yet.</td></tr>`;
  body.addEventListener("click",e=>{const dl=e.target.closest("[data-rdl]");if(dl){reviews=reviews.filter(r=>r.id!==dl.dataset.rdl);save(KEYS.reviews,reviews);adminReviews();}});
}

/* ---- coupons ---- */
function adminCoupons(){
  $("adminContent").innerHTML=`
    <div class="toolbar">
      <input class="search-in" id="cpCode" placeholder="Code e.g. SAVE15">
      <input id="cpPct" type="number" min="1" max="90" placeholder="% off" style="width:120px">
      <button class="btn" id="addCpBtn">Add Coupon</button>
    </div>
    <div class="panel"><h3>Active coupons</h3><div id="cpList"></div></div>`;
  renderCoupons();
  $("addCpBtn").addEventListener("click",()=>{
    const code=$("cpCode").value.trim().toUpperCase(),pct=parseInt($("cpPct").value);
    if(!code||!pct||pct<1||pct>90){toast("Enter valid code & %");return;}
    if(coupons.some(c=>c.code===code)){toast("Coupon exists");return;}
    coupons.push({code,percent:pct});save(KEYS.coupons,coupons);$("cpCode").value="";$("cpPct").value="";renderCoupons();toast("Coupon added");
  });
  $("cpList").addEventListener("click",e=>{const d=e.target.closest("[data-cpdl]");if(d){coupons=coupons.filter(c=>c.code!==d.dataset.cpdl);save(KEYS.coupons,coupons);renderCoupons();}});
}
function renderCoupons(){
  $("cpList").innerHTML=coupons.length?coupons.map(c=>`<span class="coupon-pill">🎟 ${esc(c.code)} — ${c.percent}% off <button data-cpdl="${esc(c.code)}">✕</button></span>`).join(""):`<p class="muted">No coupons.</p>`;
}

/* ---- settings ---- */
function adminSettings(){
  $("adminContent").innerHTML=`<div class="panel" style="max-width:480px">
    <h3>Store settings</h3>
    <div class="setting-row"><label>Store name</label><input id="setName" value="${esc(settings.storeName)}"></div>
    <div class="setting-row"><label>Free delivery threshold (AED)</label><input id="setThresh" type="number" value="${settings.freeThreshold}"></div>
    <div class="setting-row"><label>Delivery fee (AED)</label><input id="setShip" type="number" value="${settings.shippingFee}"></div>
    <button class="btn" id="saveSettings">Save settings</button>
    <hr style="margin:22px 0;border:none;border-top:1px solid var(--line)">
    <h3>Danger zone</h3>
    <button class="btn btn--danger" id="resetData" style="margin-top:8px">Reset all data to defaults</button>
  </div>`;
  $("saveSettings").addEventListener("click",()=>{
    settings.storeName=$("setName").value.trim()||"noon";
    settings.freeThreshold=parseFloat($("setThresh").value)||0;
    settings.shippingFee=parseFloat($("setShip").value)||0;
    save(KEYS.settings,settings);renderCart();toast("Settings saved");
  });
  $("resetData").addEventListener("click",()=>{
    if(confirm("This will erase all products, orders, reviews and reset to defaults. Continue?")){
      Object.values(KEYS).forEach(k=>localStorage.removeItem(k));location.reload();
    }
  });
}

/* =========================================================
   UI HELPERS
   ========================================================= */
function openDrawer(el){closeDrawers();el.classList.add("open");$("overlay").classList.add("show");}
function closeDrawers(){document.querySelectorAll(".drawer,.mdrawer,#filters").forEach(d=>d.classList.remove("open"));$("overlay").classList.remove("show");}
function openModal(id){$(id).classList.add("show");}
function closeModal(id){$(id).classList.remove("show");}

/* =========================================================
   EVENTS
   ========================================================= */
document.addEventListener("DOMContentLoaded",()=>{
  $("year").textContent=new Date().getFullYear();
  renderHero();renderCategories();renderGrid();renderDeals();renderRecent();renderCart();renderWish();

  /* hero controls */
  $("heroPrev").onclick=()=>{goHeroSlide(heroIdx-1);startHeroAuto();};
  $("heroNext").onclick=()=>{goHeroSlide(heroIdx+1);startHeroAuto();};
  $("heroDots").addEventListener("click",e=>{const d=e.target.closest("[data-dot]");if(d){goHeroSlide(+d.dataset.dot);startHeroAuto();}});

  /* countdown to midnight */
  setInterval(()=>{
    const now=new Date();const end=new Date();end.setHours(24,0,0,0);
    let s=Math.floor((end-now)/1000);
    const h=String(Math.floor(s/3600)).padStart(2,"0");s%=3600;
    const m=String(Math.floor(s/60)).padStart(2,"0");const sec=String(s%60).padStart(2,"0");
    $("countdown").innerHTML=`<span>${h}</span>:<span>${m}</span>:<span>${sec}</span>`;
  },1000);

  /* category clicks (nav, tiles, mobile) */
  function pickCat(name){filterState.cats=new Set(name?[name]:[]);renderCategories();renderGrid();closeDrawers();document.getElementById("shopAnchor").scrollIntoView({behavior:"smooth"});}
  $("catNav").addEventListener("click",e=>{const c=e.target.closest("[data-cat]"),a=e.target.closest("[data-allcat]");if(c)pickCat(c.dataset.cat);if(a)pickCat(null);});
  $("catTiles").addEventListener("click",e=>{const c=e.target.closest("[data-cat]");if(c)pickCat(c.dataset.cat);});
  $("mobileCats").addEventListener("click",e=>{const c=e.target.closest("[data-cat]"),a=e.target.closest("[data-allcat]");if(c)pickCat(c.dataset.cat);if(a)pickCat(null);});
  document.querySelectorAll("[data-foot-cat]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();pickCat(a.textContent);}));

  /* filters */
  $("filterCats").addEventListener("change",e=>{const cb=e.target;if(cb.checked)filterState.cats.add(cb.value);else filterState.cats.delete(cb.value);renderGrid();renderCategories();});
  $("priceRange").addEventListener("input",e=>{filterState.maxPrice=+e.target.value;$("priceVal").textContent=aed(+e.target.value);renderGrid();});
  $("ratingFilter").addEventListener("click",e=>{const b=e.target.closest("[data-r]");if(b){filterState.minRating=+b.dataset.r;document.querySelectorAll("#ratingFilter button").forEach(x=>x.classList.toggle("is-active",x===b));renderGrid();}});
  $("clearFilters").addEventListener("click",()=>{filterState={cats:new Set(),maxPrice:5000,minRating:0,sort:filterState.sort,search:""};$("priceRange").value=5000;$("priceVal").textContent="AED 5000";document.querySelectorAll("#ratingFilter button").forEach((x,i)=>x.classList.toggle("is-active",i===0));$("searchInput").value="";$("msearchInput").value="";renderCategories();renderGrid();});
  $("sortSelect").addEventListener("change",e=>{filterState.sort=e.target.value;renderGrid();});
  $("filterToggle").addEventListener("click",()=>{$("filters").classList.add("open");$("overlay").classList.add("show");});

  /* search */
  function doSearch(v){filterState.search=v;renderGrid();renderSuggest(v);}
  $("searchInput").addEventListener("input",e=>doSearch(e.target.value));
  $("msearchInput").addEventListener("input",e=>{filterState.search=e.target.value;renderGrid();});
  $("searchInput").addEventListener("focus",e=>renderSuggest(e.target.value));
  document.addEventListener("click",e=>{if(!e.target.closest("#searchWrap"))$("searchSuggest").classList.remove("show");});
  $("searchSuggest").addEventListener("click",e=>{const v=e.target.closest("[data-view]");if(v){openProduct(v.dataset.view);$("searchSuggest").classList.remove("show");}});

  /* product grid / deals / recent delegation */
  function gridClicks(e){
    const add=e.target.closest("[data-add]"),buy=e.target.closest("[data-buy]"),w=e.target.closest("[data-wish]"),v=e.target.closest("[data-view]");
    if(add){addToCart(add.dataset.add);return;}
    if(buy){const p=products.find(x=>x.id===buy.dataset.buy);if(p)startCheckout(p);return;}
    if(w){toggleWish(w.dataset.wish);return;}
    if(v){openProduct(v.dataset.view);}
  }
  $("productGrid").addEventListener("click",gridClicks);
  $("dealsRow").addEventListener("click",gridClicks);
  $("recentRow").addEventListener("click",gridClicks);

  /* product modal interactions */
  $("pdBody").addEventListener("click",e=>{
    const q=e.target.closest("[data-pdqty]");
    if(q){pdQty=Math.max(1,Math.min(pdProduct.stock||99,pdQty+ +q.dataset.pdqty));$("pdQtyVal").textContent=pdQty;return;}
    if(e.target.id==="pdAdd"){addToCart(pdProduct.id,pdQty);closeModal("productModal");}
    if(e.target.id==="pdBuy"){closeModal("productModal");startCheckout({...pdProduct});}
    if(e.target.id==="rvSubmit"){
      const name=$("rvName").value.trim(),text=$("rvText").value.trim(),rating=+$("rvRating").value;
      if(!name||!text){toast("Enter name and review");return;}
      reviews.unshift({id:"r"+Date.now(),productId:pdProduct.id,name,text,rating,date:new Date().toLocaleDateString("en-GB")});
      save(KEYS.reviews,reviews);renderPD();renderGrid();renderDeals();toast("Review added");
    }
  });

  /* header buttons */
  $("cartBtn").onclick=()=>openDrawer($("cartDrawer"));
  $("wishBtn").onclick=()=>openDrawer($("wishDrawer"));
  $("ordersBtn").onclick=()=>{renderMyOrders();openDrawer($("myOrdersDrawer"));};
  $("menuToggle").onclick=()=>openDrawer($("mobileNav"));
  $("deliverBtn").onclick=()=>{const c=prompt("Deliver to which city?",$("deliverCity").textContent);if(c)$("deliverCity").textContent=c;};
  $("goHome").onclick=e=>{e.preventDefault();window.scrollTo({top:0,behavior:"smooth"});};

  /* drawers close */
  $("overlay").onclick=closeDrawers;
  document.querySelectorAll("[data-close-drawer]").forEach(b=>b.onclick=closeDrawers);

  /* cart interactions */
  $("cartItems").addEventListener("click",e=>{
    const inc=e.target.closest("[data-inc]"),dec=e.target.closest("[data-dec]"),rm=e.target.closest("[data-rm]");
    if(inc)changeQty(inc.dataset.inc,1);if(dec)changeQty(dec.dataset.dec,-1);if(rm)removeCart(rm.dataset.rm);
  });
  $("applyPromo").onclick=applyPromo;
  $("checkoutBtn").onclick=()=>{closeDrawers();startCheckout(null);};

  /* wishlist interactions */
  $("wishItems").addEventListener("click",e=>{
    const add=e.target.closest("[data-add]"),w=e.target.closest("[data-wish]");
    if(add)addToCart(add.dataset.add);if(w)toggleWish(w.dataset.wish);
  });

  /* checkout steps */
  $("toStep2").onclick=()=>{
    if(!$("coName").value.trim()||!$("coPhone").value.trim()||!$("coEmail").value.trim()||!$("coAddr").value.trim()){$("coErr1").textContent="Please fill all fields.";return;}
    $("coErr1").textContent="";gotoStep(2);
  };
  $("toStep3").onclick=()=>{
    const pay=document.querySelector('input[name="pay"]:checked').value;
    if(pay==="card"&&(!$("cardNo").value.trim()||!$("cardExp").value.trim()||!$("cardCvv").value.trim())){$("coErr2").textContent="Enter card details.";return;}
    $("coErr2").textContent="";renderReview();gotoStep(3);
  };
  document.querySelectorAll("[data-back]").forEach(b=>b.onclick=()=>gotoStep(+b.dataset.back));
  document.querySelectorAll('input[name="pay"]').forEach(r=>r.addEventListener("change",()=>{$("cardFields").hidden=document.querySelector('input[name="pay"]:checked').value!=="card";}));
  $("placeOrderBtn").onclick=placeOrder;
  $("doneClose").onclick=()=>closeModal("checkoutModal");

  /* newsletter */
  $("newsBtn").onclick=()=>{const v=$("newsEmail").value.trim();if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)){toast("Subscribed! 🎉");$("newsEmail").value="";}else toast("Enter a valid email");};

  /* modal close (backdrop + buttons) */
  document.querySelectorAll("[data-close-modal]").forEach(b=>b.onclick=e=>e.target.closest(".modal").classList.remove("show"));
  document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.remove("show");}));

  /* ===== ADMIN ===== */
  $("adminTrigger").onclick=e=>{e.preventDefault();openModal("loginModal");setTimeout(()=>$("adminPass").focus(),100);};
  function doLogin(){if($("adminPass").value===ADMIN_PASSWORD){$("adminPass").value="";$("loginErr").textContent="";closeModal("loginModal");openAdmin();}else $("loginErr").textContent="Incorrect password.";}
  $("loginBtn").onclick=doLogin;
  $("adminPass").addEventListener("keydown",e=>{if(e.key==="Enter")doLogin();});
  $("exitAdmin").onclick=closeAdmin;
  $("logoutBtn").onclick=closeAdmin;
  $("sidebarToggle").onclick=()=>$("sidebar").classList.toggle("open");
  document.querySelectorAll(".snav[data-view]").forEach(b=>b.onclick=()=>switchView(b.dataset.view));
  $("saveProdBtn").onclick=saveProduct;
});
