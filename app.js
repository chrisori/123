// ===== 1. CONFIG: paste your Supabase project values (Project Settings > API) =====
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-KEY";

const configured = !SUPABASE_URL.includes("YOUR-PROJECT");
const db = configured ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Demo products shown until Supabase is connected
const DEMO = [
  {id:1,name:"Chicken & Rice Dog Food 3kg",category:"dog",price:749,emoji:"🐕",description:"Complete adult dry food."},
  {id:2,name:"Rubber Chew Bone",category:"dog",price:199,emoji:"🦴",description:"Tough toy for strong chewers."},
  {id:3,name:"Tuna Cat Food 1.2kg",category:"cat",price:459,emoji:"🐈",description:"Dry food with real tuna."},
  {id:4,name:"Feather Wand Toy",category:"cat",price:129,emoji:"🪶",description:"Interactive play for indoor cats."},
  {id:5,name:"Hamster Wheel",category:"small",price:349,emoji:"🐹",description:"Silent spinner, 18cm."},
  {id:6,name:"Rabbit Hay 1kg",category:"small",price:189,emoji:"🐇",description:"Fresh timothy hay."}
];

let products = [], cart = JSON.parse(localStorage.getItem("cart") || "[]"), cat = "all";
const $ = id => document.getElementById(id);
const peso = n => "₱" + Number(n).toLocaleString("en-PH", {minimumFractionDigits:2});

// ===== 2. LOAD PRODUCTS FROM SUPABASE =====
async function loadProducts() {
  if (!configured) {
    products = DEMO;
    $("notice").hidden = false;
    $("notice").textContent = "Demo mode: showing sample products. Add your Supabase keys in app.js to go live.";
  } else {
    const { data, error } = await db.from("products").select("*").eq("active", true).order("name");
    if (error) { $("notice").hidden = false; $("notice").textContent = "Could not load products: " + error.message; return; }
    products = data;
  }
  renderProducts();
}

function renderProducts() {
  const list = products.filter(p => cat === "all" || p.category === cat);
  $("grid").innerHTML = list.length ? list.map(p => `
    <article class="card">
      <div class="pic">${p.image_url ? `<img src="${p.image_url}" alt="${p.name}">` : (p.emoji || "🐾")}</div>
      <div class="body">
        <h3>${p.name}</h3><p class="desc">${p.description || ""}</p>
        <span class="price">${peso(p.price)}</span>
        <button class="add" onclick="addToCart(${p.id})">Add to cart</button>
      </div>
    </article>`).join("") : "<p>No products in this category yet.</p>";
}

$("filters").onclick = e => {
  if (!e.target.dataset.cat) return;
  cat = e.target.dataset.cat;
  document.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c === e.target));
  renderProducts();
};

// ===== 3. CART =====
function save() { localStorage.setItem("cart", JSON.stringify(cart)); renderCart(); }
function addToCart(id) {
  const item = cart.find(i => i.id === id);
  item ? item.qty++ : cart.push({ id, qty: 1 });
  save(); $("drawer").classList.add("open");
}
function changeQty(id, d) {
  const item = cart.find(i => i.id === id);
  item.qty += d;
  cart = cart.filter(i => i.qty > 0);
  save();
}
function renderCart() {
  let total = 0, count = 0;
  $("cartItems").innerHTML = cart.length ? cart.map(i => {
    const p = products.find(x => x.id === i.id); if (!p) return "";
    total += p.price * i.qty; count += i.qty;
    return `<div class="row"><span>${p.name}<br><small>${peso(p.price)}</small></span>
      <span class="qty"><button onclick="changeQty(${i.id},-1)">−</button> ${i.qty} <button onclick="changeQty(${i.id},1)">+</button></span></div>`;
  }).join("") : "<p>Your cart is empty. Add something for your pet.</p>";
  $("cartTotal").textContent = peso(total);
  $("cartCount").textContent = count;
  $("checkoutForm").hidden = !cart.length;
}
$("cartBtn").onclick = () => $("drawer").classList.add("open");
$("closeCart").onclick = () => $("drawer").classList.remove("open");

// ===== 4. CHECKOUT: save order in Supabase, then pay via PayMongo =====
$("checkoutForm").onsubmit = async e => {
  e.preventDefault();
  const msg = $("formMsg"); msg.textContent = "";
  if (!configured) { msg.textContent = "Connect Supabase first (see README)."; return; }
  $("payBtn").disabled = true; $("payBtn").textContent = "Please wait...";
  const f = Object.fromEntries(new FormData(e.target));
  const orderId = crypto.randomUUID();
  try {
    let r = await db.from("orders").insert({ id: orderId, customer_name: f.name, email: f.email, phone: f.phone, address: f.address });
    if (r.error) throw r.error;
    r = await db.from("order_items").insert(cart.map(i => ({ order_id: orderId, product_id: i.id, quantity: i.qty })));
    if (r.error) throw r.error;
    // The Edge Function calculates the real total on the server and creates the payment page
    const { data, error } = await db.functions.invoke("create-checkout", { body: { order_id: orderId } });
    if (error || !data?.checkout_url) throw error || new Error("No payment link returned");
    cart = []; save();
    location.href = data.checkout_url;
  } catch (err) {
    msg.textContent = "Checkout failed: " + (err.message || err);
    $("payBtn").disabled = false; $("payBtn").textContent = "Pay now";
  }
};

if (new URLSearchParams(location.search).get("paid")) {
  $("notice").hidden = false; $("notice").textContent = "Thank you! Your payment is being confirmed. Check your email for the receipt.";
}
loadProducts().then(renderCart);
