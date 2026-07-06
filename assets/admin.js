// Admin dashboard client logic
// Supports two modes:
// 1) If window.SUPABASE_URL and window.SUPABASE_ANON_KEY are set, this will use Supabase JS client.
// 2) Otherwise, it uses localStorage as a temporary store for development.

let supabase = null;
let useSupabase = false;

function initSupabase(){
  if(window.SUPABASE_URL && window.SUPABASE_ANON_KEY && window.supabase){
    supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    useSupabase = true;
    console.log('Supabase client initialized');
  }
}

initSupabase();

// Elements
const menuRoot = document.getElementById('menu-items');
const ordersRoot = document.getElementById('orders');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout');
const adminEmailSpan = document.getElementById('admin-email');
const whoSpan = document.getElementById('who');

let currentAdmin = null;

// Basic admin "auth" for convenience (development only).
// If Supabase is available, authenticate against admins table (requires you to set up later).
async function adminSignIn(email, password){
  if(useSupabase){
    // Expect an "admins" table with email and password_hash (bcrypt)
    const { data, error } = await supabase.from('admins').select('id,email').eq('email', email).limit(1).single();
    if(error || !data) throw new Error('Invalid credentials or admins table not configured');
    // In a real setup you'd verify password server-side; for now accept presence as sign-in.
    currentAdmin = data;
    return data;
  } else {
    // development fallback: check localStorage
    const stored = JSON.parse(localStorage.getItem('wunpini_admins') || '[]');
    const match = stored.find(a => a.email === email && a.password === password);
    if(!match) throw new Error('Invalid admin credentials (dev)');
    currentAdmin = { id: match.id, email: match.email };
    return currentAdmin;
  }
}

function renderMenuItems(items){
  menuRoot.innerHTML = '';
  if(!items.length){ menuRoot.innerHTML = '<p class="text-sm opacity-70">No items yet</p>'; return }
  items.forEach(i => {
    const el = document.createElement('div');
    el.className = 'flex items-center justify-between p-2 border rounded';
    el.innerHTML = `<div><div class="font-medium">${escapeHtml(i.name)}</div><div class="text-xs opacity-70">${escapeHtml(i.category)} • GH₵${i.price}</div></div><div class="flex gap-2"><button class="edit text-sm px-2 py-1 bg-yellow-500 rounded">Edit</button><button class="del text-sm px-2 py-1 bg-red-600 rounded text-white">Delete</button></div>`;
    el.querySelector('.edit').addEventListener('click', ()=> openEditItem(i));
    el.querySelector('.del').addEventListener('click', ()=> deleteItem(i));
    menuRoot.appendChild(el);
  });
}

function renderOrders(orders){
  ordersRoot.innerHTML = '';
  if(!orders.length){ ordersRoot.innerHTML = '<p class="text-sm opacity-70">No orders yet</p>'; return }
  orders.forEach(o => {
    const div = document.createElement('div');
    div.className = 'p-2 border rounded';
    div.innerHTML = `<div class="font-medium">Order #${o.id} — GH₵${o.total}</div><div class="text-xs opacity-70">${o.notes || ''}</div>`;
    ordersRoot.appendChild(div);
  });
}

// CRUD helpers (localStorage fallback)
function loadLocalMenu(){
  return JSON.parse(localStorage.getItem('wunpini_menu') || '[]');
}
function saveLocalMenu(items){ localStorage.setItem('wunpini_menu', JSON.stringify(items)); }

async function fetchMenu(){
  if(useSupabase){
    const { data, error } = await supabase.from('menu_items').select('*').order('id', {ascending:true});
    if(error) throw error; return data || [];
  } else return loadLocalMenu();
}

async function fetchOrders(){
  if(useSupabase){
    const { data, error } = await supabase.from('orders').select('*').order('created_at', {ascending:false}).limit(50);
    if(error) throw error; return data || [];
  } else return JSON.parse(localStorage.getItem('wunpini_orders') || '[]');
}

async function createItem(payload){
  if(useSupabase){
    const { data, error } = await supabase.from('menu_items').insert([payload]).select();
    if(error) throw error; return data[0];
  } else {
    const items = loadLocalMenu(); payload.id = Date.now(); items.push(payload); saveLocalMenu(items); return payload;
  }
}

async function updateItem(payload){
  if(useSupabase){
    const { data, error } = await supabase.from('menu_items').update(payload).eq('id', payload.id).select();
    if(error) throw error; return data[0];
  } else {
    const items = loadLocalMenu(); const idx = items.findIndex(i=>i.id===payload.id); if(idx!==-1) items[idx]=payload; saveLocalMenu(items); return payload;
  }
}

async function removeItem(id){
  if(useSupabase){
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if(error) throw error; return true;
  } else {
    const items = loadLocalMenu().filter(i=>i.id!==id); saveLocalMenu(items); return true;
  }
}

// UI flows
function openEditItem(item){
  const name = prompt('Item name', item.name);
  if(name===null) return;
  const category = prompt('Category', item.category || 'uncategorized'); if(category===null) return;
  const price = prompt('Price (numeric)', item.price);
  if(price===null) return;
  const payload = {...item, name, category, price: Number(price)};
  updateItem(payload).then(loadAndRender).catch(alert);
}

function deleteItem(item){
  if(!confirm('Delete this item?')) return;
  removeItem(item.id).then(loadAndRender).catch(alert);
}

async function loadAndRender(){
  const items = await fetchMenu();
  renderMenuItems(items || []);
  const orders = await fetchOrders();
  renderOrders(orders || []);
}

// Add new
document.getElementById('add-item').addEventListener('click', async ()=>{
  const name = prompt('Name'); if(!name) return;
  const category = prompt('Category', 'uncategorized') || 'uncategorized';
  const price = Number(prompt('Price (GH₵)') || 0);
  const item = { name, category, price };
  createItem(item).then(loadAndRender).catch(err=>alert(err.message||err));
});

// Login
loginBtn.addEventListener('click', async ()=>{
  const email = document.getElementById('admin-email-input').value.trim();
  const pass = document.getElementById('admin-pass-input').value;
  try{
    const admin = await adminSignIn(email, pass);
    currentAdmin = admin; onSignedIn(admin);
  }catch(e){ alert(e.message || e); }
});

logoutBtn.addEventListener('click', ()=>{
  currentAdmin = null; document.getElementById('admin-controls').style.display='none'; document.getElementById('login-box').style.display='block'; logoutBtn.classList.add('hidden'); adminEmailSpan.textContent=''; whoSpan.textContent='';
});

function onSignedIn(admin){
  document.getElementById('login-box').style.display='none';
  document.getElementById('admin-controls').style.display='block';
  logoutBtn.classList.remove('hidden'); adminEmailSpan.textContent = admin.email || '';
  whoSpan.textContent = admin.email || 'admin';
  loadAndRender();
}

// Seed sample data (dev)
document.getElementById('seed-sample').addEventListener('click', ()=>{
  if(useSupabase){
    alert('Seeding via Supabase not enabled in this script. Use SQL seed file.');
    return;
  }
  const sample = [
    { id: 1, name: 'T.Z. with Ayoyo, Beef', category: 'tz', price: 48 },
    { id: 2, name: 'Banku with Okro, Fresh Fish', category: 'banku', price: 48 },
    { id: 3, name: 'Kelewele with Gizzard', category: 'kelewele', price: 30 }
  ];
  localStorage.setItem('wunpini_menu', JSON.stringify(sample));
  localStorage.setItem('wunpini_admins', JSON.stringify([{id:1,email:'admin@example.com',password:'admin'}]));
  loadAndRender();
  alert('Sample data seeded (local dev)');
});

// helpers
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])) }

// Initial render
loadAndRender();
