// Client-side ordering logic using Lovable Cloud (PostgREST) APIs
(async function(){
  const BASE = (window.VITE_SUPABASE_URL || window.LOVABLE_URL || '').replace(/\/$/, '') || 'https://mfdbmxfgqxoelzvdgvzw.supabase.co';
  const KEY = window.VITE_SUPABASE_PUBLISHABLE_KEY || window.LOVABLE_KEY || null;

  // Allow passing key via URL param anon_key for quick testing (not persisted)
  try{
    const params = new URLSearchParams(location.search);
    if(!KEY && params.get('anon_key')){
      window.VITE_SUPABASE_PUBLISHABLE_KEY = params.get('anon_key');
    }
  }catch(e){/* ignore */}

  const publishableKey = window.VITE_SUPABASE_PUBLISHABLE_KEY || KEY;

  const menuRoot = document.getElementById('menu-list');
  const cartRoot = document.getElementById('cart-list');
  const totalEl = document.getElementById('cart-total');
  const placeBtn = document.getElementById('place-order');
  const msgEl = document.getElementById('order-msg');
  const statusEl = document.getElementById('supabase-status');

  const nameInput = document.getElementById('cust-name');
  const phoneInput = document.getElementById('cust-phone');
  const addressInput = document.getElementById('cust-address');
  const notesInput = document.getElementById('cust-notes');

  if(!publishableKey){
    if(statusEl) statusEl.textContent = 'Backend key missing';
    if(menuRoot) menuRoot.innerHTML = '<div class="opacity-70 text-sm">Missing publishable key. Set window.VITE_SUPABASE_PUBLISHABLE_KEY in the console or pass ?anon_key=YOUR_KEY</div>';
    return;
  }

  const headers = {
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
    'Content-Type': 'application/json'
  };

  // Cart state
  let menuItems = [];
  const cart = {}; // key = id, value = { item, qty }

  function formatPrice(v){ return `GH₵${Number(v).toFixed(2)}` }
  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])) }

  function renderMenu(items){
    menuRoot.innerHTML = '';
    if(!items || items.length === 0){ menuRoot.innerHTML = '<p class="opacity-60">No menu items available.</p>'; return }
    items.forEach(it => {
      const d = document.createElement('div');
      d.className = 'flex items-center justify-between p-2 border rounded';
      d.innerHTML = `
        <div>
          <div class="font-medium">${escapeHtml(it.name)}</div>
          <div class="text-xs opacity-70">${escapeHtml(it.description || '')}</div>
        </div>
        <div class="text-right">
          <div class="font-mono text-sm text-yellow-300 mb-2">${formatPrice(it.price)}</div>
          <div class="flex items-center gap-2">
            <button class="px-2 py-1 bg-gray-700 rounded text-sm add" data-id="${it.id}">Add</button>
            <button class="px-2 py-1 bg-transparent rounded text-xs opacity-70">Category: ${escapeHtml(it.category || '')}</button>
          </div>
        </div>
      `;
      menuRoot.appendChild(d);
    });
    menuRoot.querySelectorAll('.add').forEach(btn => btn.addEventListener('click', ()=>{
      const id = btn.dataset.id;
      const item = menuItems.find(x => String(x.id) === String(id));
      if(!item) return; addToCart(item, 1);
    }));
  }

  function renderCart(){
    cartRoot.innerHTML = '';
    const keys = Object.keys(cart);
    if(!keys.length){ cartRoot.innerHTML = '<p class="opacity-60">No items yet</p>'; totalEl.textContent = formatPrice(0); return }
    let total = 0;
    keys.forEach(k => {
      const ci = cart[k];
      const el = document.createElement('div');
      el.className = 'flex items-center justify-between p-2 border rounded';
      const subtotal = Number(ci.item.price) * ci.qty;
      total += subtotal;
      el.innerHTML = `
        <div>
          <div class="font-medium">${escapeHtml(ci.item.name)}</div>
          <div class="text-xs opacity-70">Qty: <strong>${ci.qty}</strong></div>
        </div>
        <div class="text-right">
          <div class="font-mono">${formatPrice(subtotal)}</div>
          <div class="flex gap-2 mt-2 justify-end">
            <button class="px-2 py-1 bg-gray-700 rounded text-sm dec" data-id="${ci.item.id}">-</button>
            <button class="px-2 py-1 bg-gray-700 rounded text-sm inc" data-id="${ci.item.id}">+</button>
            <button class="px-2 py-1 bg-red-600 rounded text-sm del" data-id="${ci.item.id}">Remove</button>
          </div>
        </div>
      `;
      cartRoot.appendChild(el);
    });
    totalEl.textContent = formatPrice(total);

    cartRoot.querySelectorAll('.inc').forEach(b=>b.addEventListener('click', ()=> changeQty(Number(b.dataset.id), 1)));
    cartRoot.querySelectorAll('.dec').forEach(b=>b.addEventListener('click', ()=> changeQty(Number(b.dataset.id), -1)));
    cartRoot.querySelectorAll('.del').forEach(b=>b.addEventListener('click', ()=> removeFromCart(Number(b.dataset.id))));
  }

  function addToCart(item, qty){ if(cart[item.id]) cart[item.id].qty += qty; else cart[item.id] = { item, qty }; if(cart[item.id].qty <= 0) delete cart[item.id]; renderCart(); }
  function changeQty(id, delta){ if(cart[id]){ cart[id].qty += delta; if(cart[id].qty <= 0) delete cart[id]; renderCart(); } }
  function removeFromCart(id){ delete cart[id]; renderCart(); }

  async function loadMenu(){
    menuRoot.innerHTML = '<p class="opacity-70">Loading menu…</p>';
    try{
      const url = `${BASE}/rest/v1/menu_items?is_available=eq.true&order=category,sort_order`;
      const res = await fetch(url, { headers });
      if(!res.ok){
        const text = await res.text();
        throw new Error(`Menu fetch failed: HTTP ${res.status} ${text}`);
      }
      const data = await res.json();
      // map to expected shape (price may be numeric string)
      menuItems = (data || []).map(i => ({ id: i.id, category: i.category, name: i.name, description: i.description, price: Number(i.price), image_url: i.image_url }));
      renderMenu(menuItems);
      if(statusEl) statusEl.textContent = 'Menu loaded';
    }catch(err){
      menuRoot.innerHTML = `<div class="text-sm opacity-70">Failed to load menu: ${escapeHtml(err.message || err)}</div>`;
      if(statusEl) statusEl.textContent = 'Menu load failed';
      console.error(err);
    }
  }

  // Place order using Lovable Cloud API
  placeBtn.addEventListener('click', async ()=>{
    msgEl.textContent = '';
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const address = addressInput.value.trim();
    const notes = notesInput.value.trim();

    if(!name || !phone){ msgEl.textContent = 'Please enter your name and phone.'; return; }
    const items = Object.values(cart);
    if(!items.length){ msgEl.textContent = 'Your cart is empty.'; return; }

    // compute totals and payload
    let total = 0;
    const payloadItems = items.map(ci => { const unit = Number(ci.item.price); total += unit * ci.qty; return { id: ci.item.id, name: ci.item.name, price: unit, qty: ci.qty }; });

    const body = {
      customer_name: name,
      customer_phone: phone,
      customer_address: address,
      delivery_day: 'Saturday', // optionally collect from UI; default to Saturday for simplicity
      items: payloadItems,
      total,
      notes
    };

    placeBtn.disabled = true; placeBtn.textContent = 'Placing…';
    try{
      const res = await fetch(`${BASE}/rest/v1/orders`, { method: 'POST', headers: Object.assign({ Prefer: 'return=representation' }, headers), body: JSON.stringify(body) });
      if(!res.ok){ const t = await res.text(); throw new Error(`Order failed: HTTP ${res.status} ${t}`); }
      const result = await res.json();
      msgEl.textContent = 'Order placed! We will contact you shortly.';
      Object.keys(cart).forEach(k=>delete cart[k]); renderCart(); nameInput.value=''; phoneInput.value=''; addressInput.value=''; notesInput.value='';
      console.log('order result', result);
    }catch(err){
      msgEl.textContent = 'Failed to place order: ' + (err.message || err);
      console.error(err);
    }finally{ placeBtn.disabled = false; placeBtn.textContent = 'Place order'; }
  });

  // initial load
  await loadMenu();
  renderCart();
})();
