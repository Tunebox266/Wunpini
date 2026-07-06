// Updated admin client to use server-side admin functions when available

let supabase = null;
let useSupabase = false;
let useAdminApi = Boolean(window.ADMIN_API_BASE);
const ADMIN_API_BASE = window.ADMIN_API_BASE || null;

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

// Admin token storage
function setToken(t){ if(t) localStorage.setItem('wunpini_admin_token', t); else localStorage.removeItem('wunpini_admin_token'); }
function getToken(){ return localStorage.getItem('wunpini_admin_token'); }

async function adminSignIn(email, password){
  // If ADMIN_API_BASE is set, call server-side auth function
  if(ADMIN_API_BASE){
    const res = await fetch(`${ADMIN_API_BASE}/admin-auth`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Login failed');
    setToken(data.token);
    currentAdmin = { email };
    return currentAdmin;
  }

  // Supabase mode (unsafe client-side check)
  if(useSupabase){
    const { data, error } = await supabase.from('admins').select('id,email').eq('email', email).limit(1).single();
    if(error || !data) throw new Error('Invalid credentials or admins table not configured');
    currentAdmin = data; return data;
  }

  // development fallback: localStorage
  const stored = JSON.parse(localStorage.getItem('wunpini_admins') || '[]');
  const match = stored.find(a => a.email === email && a.password === password);
  if(!match) throw new Error('Invalid admin credentials (dev)');
  currentAdmin = { id: match.id, email: match.email };
  return currentAdmin;
}

function authHeaders(){
  const t = getToken();
  if(!t) return {};
  return { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' };
}

// Fetch implementations
async function fetchMenu(){
  if(ADMIN_API_BASE){
    const res = await fetch(`${ADMIN_API_BASE}/admin-menu`, { headers: authHeaders() });
    if(!res.ok) throw new Error('Failed to fetch menu');
    return await res.json();
  }
  if(useSupabase){
    const { data, error } = await supabase.from('menu_items').select('*').order('id', {ascending:true});
    if(error) throw error; return data || [];
  }
  return JSON.parse(localStorage.getItem('wunpini_menu') || '[]');
}

async function fetchOrders(){
  if(ADMIN_API_BASE){
    const res = await fetch(`${ADMIN_API_BASE}/admin-orders`, { headers: authHeaders() });
    if(!res.ok) throw new Error('Failed to fetch orders');
    return await res.json();
  }
  if(useSupabase){
    const { data, error } = await supabase.from('orders').select('*').order('created_at', {ascending:false}).limit(50);
    if(error) throw error; return data || [];
  }
  return JSON.parse(localStorage.getItem('wunpini_orders') || '[]');
}

async function createItem(payload){
  if(ADMIN_API_BASE){
    const res = await fetch(`${ADMIN_API_BASE}/admin-menu`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
    if(!res.ok) throw new Error('Create failed');
    const data = await res.json(); return data[0] || data;
  }
  if(useSupabase){
    const { data, error } = await supabase.from('menu_items').insert([payload]).select();
    if(error) throw error; return data[0];
  }
  const items = JSON.parse(localStorage.getItem('wunpini_menu') || '[]'); payload.id = Date.now(); items.push(payload); localStorage.setItem('wunpini_menu', JSON.stringify(items)); return payload;
}

async function updateItem(payload){
  if(ADMIN_API_BASE){
    const res = await fetch(`${ADMIN_API_BASE}/admin-menu`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(payload) });
    if(!res.ok) throw new Error('Update failed');
    const data = await res.json(); return data[0] || data;
  }
  if(useSupabase){
    const { data, error } = await supabase.from('menu_items').update(payload).eq('id', payload.id).select();
    if(error) throw error; return data[0];
  }
  const items = JSON.parse(localStorage.getItem('wunpini_menu') || '[]'); const idx = items.findIndex(i=>i.id===payload.id); if(idx!==-1) items[idx]=payload; localStorage.setItem('wunpini_menu', JSON.stringify(items)); return payload;
}

async function removeItem(id){
  if(ADMIN_API_BASE){
    const res = await fetch(`${ADMIN_API_BASE}/admin-menu?id=${id}`, { method: 'DELETE', headers: authHeaders() });
    if(!res.ok) throw new Error('Delete failed');
    return true;
  }
  if(useSupabase){
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if(error) throw error; return true;
  }
  const items = JSON.parse(localStorage.getItem('wunpini_menu') || '[]').filter(i=>i.id!==id); localStorage.setItem('wunpini_menu', JSON.stringify(items)); return true;
}

// UI rendering (same as before)
function renderMenuItems(items){
  menuRoot.innerHTML = '';
  if(!items.length){ menuRoot.innerHTML = '<p class="text-sm opacity-70">No items yet</p>'; return }
  items.forEach(i => {
    const el = document.createElement('div');
    el.className = 'flex items-center justify-between p-2 border rounded';
    el.innerHTML = `<div><div class="font-medium">${escapeHtml(i.name)}</div><div class="text-xs opacity-70">${escapeHtml(i.category || i.category_id || '')} • GH₵${i.price}</div></div><div class="flex gap-2"><button class="edit text-sm px-2 py-1 bg-yellow-500 rounded">Edit</button><button class="del text-sm px-2 py-1 bg-red-600 rounded text-white">Delete</button></div>`;
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

// UI flows
function openEditItem(item){
  const name = prompt('Item name', item.name);
  if(name===null) return;
  const category = prompt('Category', item.category || item.category_id || 'uncategorized'); if(category===null) return;
  const price = prompt('Price (numeric)', item.price);
  if(price===null) return;
  const payload = {...item, name, category, price: Number(price)};
  updateItem(payload).then(loadAndRender).catch(err=>alert(err.message||err));
}

function deleteItem(item){
  if(!confirm('Delete this item?')) return;
  removeItem(item.id).then(loadAndRender).catch(err=>alert(err.message||err));
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
  currentAdmin = null; document.getElementById('admin-controls').style.display='none'; document.getElementById('login-box').style.display='block'; logoutBtn.classList.add('hidden'); adminEmailSpan.textContent=''; whoSpan.textContent=''; setToken(null);
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
  if(ADMIN_API_BASE){
    alert('Seeding via Admin API not supported. Use SQL seed file or Supabase dashboard.');
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

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])) }

loadAndRender();
