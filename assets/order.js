// Client-side ordering logic using Supabase JS
(async function(){
  // Find configuration
  const SUPABASE_URL = window.SUPABASE_URL || 'https://xvthbnokdyhttmmrhoos.supabase.co';
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_vmZGIikzAppmmd7NN-2-bA_xhX7qLxC';

  if(!SUPABASE_URL || !SUPABASE_ANON_KEY){
    const menuRoot = document.getElementById('menu-list');
    menuRoot.innerHTML = '<div class="opacity-70 text-sm">Supabase not configured. Set window.SUPABASE_URL and window.SUPABASE_ANON_KEY in the console, then reload.</div>';
    return;
  }

  // Use the UMD global `supabase` provided by the <script> in the page
  const supabase = (typeof supabase !== 'undefined' && supabase.createClient) ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  // Elements
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

  // Cart state
  let menuItems = [];
  const cart = {}; // key = id, value = {item, qty}

  function formatPrice(v){ return `GH₵${Number(v).toFixed(2)}` }

  function renderMenu(items){
    menuRoot.innerHTML = '';
    if(!items || items.length === 0){
      menuRoot.innerHTML = '<p class="opacity-60">No menu items available.</p>';
      return;
    }
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
            <button class="px-2 py-1 bg-transparent rounded text-xs opacity-70">Category: ${escapeHtml((it.category_id && (it.category_id.title || it.category_id.slug)) || '')}</button>
          </div>
        </div>
      `;
      menuRoot.appendChild(d);
    });
    // bind
    menuRoot.querySelectorAll('.add').forEach(btn => btn.addEventListener('click', e => {
      const id = Number(btn.dataset.id);
      const item = menuItems.find(x => x.id === id);
      if(!item) return;
      addToCart(item, 1);
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

    // bind cart buttons
    cartRoot.querySelectorAll('.inc').forEach(b => b.addEventListener('click', ()=> changeQty(Number(b.dataset.id), 1)));
    cartRoot.querySelectorAll('.dec').forEach(b => b.addEventListener('click', ()=> changeQty(Number(b.dataset.id), -1)));
    cartRoot.querySelectorAll('.del').forEach(b => b.addEventListener('click', ()=> removeFromCart(Number(b.dataset.id))));
  }

  function addToCart(item, qty){
    if(cart[item.id]) cart[item.id].qty += qty; else cart[item.id] = { item, qty };
    if(cart[item.id].qty <= 0) delete cart[item.id];
    renderCart();
  }
  function changeQty(id, delta){ if(cart[id]){ cart[id].qty += delta; if(cart[id].qty <= 0) delete cart[id]; renderCart(); } }
  function removeFromCart(id){ delete cart[id]; renderCart(); }

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])) }

  // Helper: direct REST fetch using anon key (fallback)
  async function restFetchMenu(){
    const simpleUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/menu_items?select=id,name,description,price,available&available=eq.true`;
    try{
      const res = await fetch(simpleUrl, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
      const text = await res.text();
      let json = null;
      try{ json = JSON.parse(text); }catch(e){ json = null; }
      return { status: res.status, ok: res.ok, data: json, text };
    }catch(e){ return { status: 0, ok:false, error: e.message || String(e) }; }
  }

  // Render an actionable RLS help message with copy button
  function showRlsHelp(details){
    const sql = `-- Enable row level security and allow anon select of available menu items\nALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY public_select_menu_items\n  ON public.menu_items\n  FOR SELECT\n  USING (available IS TRUE);`;
    menuRoot.innerHTML = `
      <div class="text-sm opacity-80 mb-3">Unable to load menu from the backend. Reason: <strong>${escapeHtml(details)}</strong></div>
      <div class="text-sm mb-2">If you enabled Row-Level Security in Supabase, paste and run the SQL below in the Supabase SQL editor, then reload this page.</div>
      <pre id="wun-sql" class="p-3 text-xs bg-black/30 rounded" style="white-space:pre-wrap;max-height:240px;overflow:auto">${escapeHtml(sql)}</pre>
      <div class="flex gap-2 mt-3">
        <button id="copy-sql" class="px-3 py-2 bg-yellow-400 text-black rounded">Copy SQL</button>
        <button id="open-sql" class="px-3 py-2 bg-gray-700 text-white rounded">Open Supabase SQL (new tab)</button>
      </div>
    `;
    document.getElementById('copy-sql').addEventListener('click', ()=>{
      navigator.clipboard.writeText(sql).then(()=>{
        alert('SQL copied to clipboard — paste into Supabase SQL editor.');
      }).catch(()=>{ alert('Copy failed — select and copy the SQL manually.'); });
    });
    document.getElementById('open-sql').addEventListener('click', ()=>{
      const editorUrl = SUPABASE_URL.replace('https://','https://app.supabase.com/project/') + '/sql';
      window.open(editorUrl, '_blank');
    });
  }

  // Fetch menu items from Supabase with robust error handling and fallback to REST
  async function loadMenu(){
    menuRoot.innerHTML = '<p class="opacity-70">Loading menu…</p>';

    // First, try the Supabase client if available
    if(supabase){
      try{
        const { data, error } = await supabase.from('menu_items').select('id,name,description,price,available,category_id(id,slug,title)').eq('available', true).order('id', {ascending:true});
        console.log('supabase client response', { data, error });
        if(error) throw error;
        if(Array.isArray(data) && data.length){ menuItems = data; renderMenu(menuItems); if(statusEl) statusEl.textContent = 'Menu loaded (client)'; return; }
        if(Array.isArray(data) && data.length === 0){ menuItems = []; renderMenu(menuItems); if(statusEl) statusEl.textContent = 'No menu items'; return; }
      }catch(err){
        console.warn('Supabase client query failed:', err.message || err);
        // continue to REST fallback
      }
    }

    // Try direct REST fetch using anon key
    const rest = await restFetchMenu();
    console.log('rest fallback response', rest);
    if(rest.ok && Array.isArray(rest.data)){
      menuItems = rest.data;
      renderMenu(menuItems);
      if(statusEl) statusEl.textContent = 'Menu loaded (REST)';
      return;
    }

    // If we get 401/403, it's likely RLS/policy issue — show helpful SQL
    if(rest.status === 401 || rest.status === 403){
      showRlsHelp(`HTTP ${rest.status} — Access denied (RLS or invalid anon key)`);
      if(statusEl) statusEl.textContent = 'Menu load failed (permission)';
      return;
    }

    // Other errors
    const detail = rest.error || rest.text || `HTTP ${rest.status}`;
    showRlsHelp(detail || 'Unknown error');
    if(statusEl) statusEl.textContent = 'Menu load failed';
  }

  // Place order flow
  placeBtn.addEventListener('click', async ()=>{
    msgEl.textContent = '';
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const address = addressInput.value.trim();
    const notes = notesInput.value.trim();

    if(!name || !phone){ msgEl.textContent = 'Please enter your name and phone.'; return; }
    const items = Object.values(cart);
    if(!items.length){ msgEl.textContent = 'Your cart is empty.'; return; }

    // compute totals
    let total = 0;
    const payloadItems = items.map(ci => {
      const unit = Number(ci.item.price);
      total += unit * ci.qty;
      return { menu_item_id: ci.item.id, quantity: ci.qty, unit_price: unit };
    });

    placeBtn.disabled = true; placeBtn.textContent = 'Placing…';

    try{
      // Insert order via Supabase client if available
      if(supabase){
        const { data: orderData, error: orderError } = await supabase.from('orders').insert([{ customer_name: name, phone, address, total, notes }]).select('id').single();
        if(orderError) throw orderError;
        const orderId = orderData.id;
        const itemsToInsert = payloadItems.map(pi => ({ order_id: orderId, menu_item_id: pi.menu_item_id, quantity: pi.quantity, unit_price: pi.unit_price }));
        const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
        if(itemsError) throw itemsError;
      }else{
        // Fallback: direct REST insert
        const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ customer_name: name, phone, address, total, notes })
        });
        if(!res.ok) throw new Error(`Order insert failed: HTTP ${res.status}`);
        const orderData = await res.json();
        const orderId = (orderData && orderData[0] && orderData[0].id) || (orderData && orderData.id);
        if(!orderId) throw new Error('Failed to obtain order id');
        const itemsRes = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/order_items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify(payloadItems.map(pi => ({ order_id: orderId, menu_item_id: pi.menu_item_id, quantity: pi.quantity, unit_price: pi.unit_price })))
        });
        if(!itemsRes.ok) throw new Error(`Order items insert failed: HTTP ${itemsRes.status}`);
      }

      // Success
      msgEl.textContent = 'Order placed! We will contact you shortly.';
      // Reset
      Object.keys(cart).forEach(k => delete cart[k]); renderCart(); nameInput.value=''; phoneInput.value=''; addressInput.value=''; notesInput.value='';
    }catch(err){
      msgEl.textContent = 'Failed to place order: ' + (err.message || err);
    }finally{ placeBtn.disabled = false; placeBtn.textContent = 'Place order'; }
  });

  // initial load
  await loadMenu();
  renderCart();
})();
