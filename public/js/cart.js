// ============================================================
// SWAPIFY — Cart Engine  (DB-backed persistence)
// • localStorage is the render cache (fast UI)
// • MongoDB is the source of truth (survives browser clears)
// • On every page load: fetch /api/cart → merge into localStorage
// ============================================================

(function () {
    'use strict';

    function esc(str) {
        try { const d = document.createElement('div'); d.textContent = String(str || ''); return d.innerHTML; } catch (e) { return '' + (str || ''); }
    }

    // ===== PRODUCT CATALOGUE (hardcoded/demo items — NOT in DB) =====
    const PRODUCTS = [
        { id: '1', name: 'Apple AirPods Pro', price: 120.00, img: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&q=80&w=400&h=300', condition: 'Like New', category: 'Electronics', stock: 1 },
        { id: '2', name: 'IKEA Office Chair', price: 50.00, img: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=400&h=300', condition: 'Good', category: 'Furniture', stock: 1 },
        { id: '3', name: 'Nintendo Switch', price: 145.00, img: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&q=80&w=400&h=300', condition: 'Used', category: 'Electronics', stock: 1 },
        { id: '4', name: 'Winter Coat', price: 80.00, img: 'https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?auto=format&fit=crop&q=80&w=400&h=300', condition: 'New w/o tags', category: 'Fashion', stock: 1 },
        { id: '5', name: 'Coffee Maker', price: 40.00, img: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&q=80&w=400&h=300', condition: 'Good', category: 'Kitchen', stock: 1 },
        { id: '6', name: 'Acoustic Panels (6pk)', price: 25.00, img: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=400&h=300', condition: 'New', category: 'Home', stock: 1 }
    ];

    // ===== CART STORE =====
    const Cart = {
        _key: 'swapify_cart',
        _stockKey: 'swapify_stock',

        getAll() {
            try { return JSON.parse(localStorage.getItem(this._key) || '[]'); } catch { return []; }
        },

        _getStock(productId) {
            const stockMap = JSON.parse(localStorage.getItem(this._stockKey) || '{}');
            const product = PRODUCTS.find(p => p.id === String(productId));
            if (!product) {
                return stockMap[String(productId)] !== undefined ? stockMap[String(productId)] : 1;
            }
            return stockMap[String(productId)] !== undefined ? stockMap[String(productId)] : product.stock;
        },

        _setStock(productId, qty) {
            const stockMap = JSON.parse(localStorage.getItem(this._stockKey) || '{}');
            stockMap[String(productId)] = qty;
            localStorage.setItem(this._stockKey, JSON.stringify(stockMap));
        },

        reduceStock(productId, qty) {
            const current = this._getStock(productId);
            const newStock = Math.max(0, current - qty);
            this._setStock(productId, newStock);
            return newStock;
        },

        getStock(productId) { return this._getStock(productId); },

        save(items) {
            localStorage.setItem(this._key, JSON.stringify(items));
            this._updateBadge();
            if (typeof window.renderCart === 'function') window.renderCart();
        },

        // ── Merge DB items into localStorage (DB wins, local fills gaps) ──
        mergeFromDB(dbItems) {
            const local = this.getAll();
            const localIds = local.map(i => i.id);

            // Add DB items that are not in local
            dbItems.forEach(function(dbItem) {
                const idx = localIds.indexOf(dbItem.id);
                if (idx === -1) {
                    local.push(dbItem);
                } else {
                    // DB qty wins over local
                    local[idx].qty = dbItem.qty;
                }
            });

            // Remove local items that are DB items (have valid ObjectId) but no longer in DB
            // A valid ObjectId is 24 hex chars. PRODUCTS use ids '1'–'6'.
            const dbIds = dbItems.map(i => i.id);
            const isObjectId = function(id) { return /^[a-f0-9]{24}$/i.test(String(id)); };
            const merged = local.filter(function(item) {
                if (isObjectId(item.id)) {
                    return dbIds.includes(item.id); // keep only if still in DB
                }
                return true; // keep demo PRODUCTS regardless
            });

            localStorage.setItem(this._key, JSON.stringify(merged));
            this._updateBadge();
        },

        add(productId, itemData) {
            let product = PRODUCTS.find(p => p.id === String(productId));
            if (!product && itemData) product = itemData;
            if (!product) return false;

            const liveStock = this._getStock(productId);
            if (liveStock === 0) {
                if (window.SwapifyUI) window.SwapifyUI.toast('This item is out of stock or sold out.', 'error');
                else alert('This item is out of stock or sold out.');
                return false;
            }

            const items = this.getAll();
            const existingIndex = items.findIndex(i => i.id === String(productId));
            const existing = existingIndex >= 0 ? items[existingIndex] : null;
            const prevQty = existing ? existing.qty : 0;
            if (existing) {
                if (existing.qty >= liveStock) {
                    if (window.SwapifyUI) window.SwapifyUI.toast('No more stock available for this item.', 'warning');
                    return false;
                }
                existing.qty += 1;
            } else {
                items.push({
                    id: String(product.id || productId),
                    name: product.name,
                    price: product.price,
                    img: product.img,
                    condition: product.condition,
                    category: product.category,
                    qty: 1
                });
            }
            this.save(items);

            // ── Sync add to backend (DB persistence) ──
            if (window.fetch) {
                fetch('/api/cart/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ itemId: productId })
                })
                .then(function(res) { return res.json().catch(function() { return null; }); })
                .then(function(data) {
                    if (data && data.success) {
                        if (window.SwapifyUI) window.SwapifyUI.toast((product.name || 'Item') + ' added to cart 🛒', 'success');
                        return;
                    }
                    // Rollback optimistic local update on failure
                    if (existingIndex >= 0) {
                        items[existingIndex].qty = prevQty;
                    } else {
                        const idx = items.findIndex(i => i.id === String(productId));
                        if (idx >= 0) items.splice(idx, 1);
                    }
                    Cart.save(items);
                    const msg = (data && data.error) ? data.error : 'Unable to add item to cart.';
                    if (window.SwapifyUI) window.SwapifyUI.toast(msg, 'error');
                    else alert(msg);
                })
                .catch(function() {
                    if (existingIndex >= 0) {
                        items[existingIndex].qty = prevQty;
                    } else {
                        const idx = items.findIndex(i => i.id === String(productId));
                        if (idx >= 0) items.splice(idx, 1);
                    }
                    Cart.save(items);
                    if (window.SwapifyUI) window.SwapifyUI.toast('Unable to add item to cart.', 'error');
                    else alert('Unable to add item to cart.');
                });
            } else if (window.SwapifyUI) {
                window.SwapifyUI.toast((product.name || 'Item') + ' added to cart 🛒', 'success');
            }
            return true;
        },

        remove(productId) {
            const items = this.getAll().filter(i => i.id !== String(productId));
            this.save(items);
            // ── Sync remove to backend (DB persistence) ──
            if (window.fetch) {
                fetch('/api/cart/remove', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ itemId: productId })
                }).catch(function() {});
            }
            if (window.SwapifyUI) window.SwapifyUI.toast('Item removed from cart', 'info');
        },

        updateQty(productId, qty) {
            const items = this.getAll();
            const item = items.find(i => i.id === String(productId));
            if (!item) return;
            if (qty < 1) { this.remove(productId); return; }
            const liveStock = this._getStock(productId);
            if (qty > liveStock) {
                if (window.SwapifyUI) window.SwapifyUI.toast('Not enough stock.', 'warning');
                return;
            }
            item.qty = qty;
            this.save(items);
        },

        clear() {
            localStorage.removeItem(this._key);
            this._updateBadge();
        },

        total()  { return this.getAll().reduce((sum, i) => sum + i.price * i.qty, 0); },
        count()  { return this.getAll().reduce((sum, i) => sum + i.qty, 0); },

        _updateBadge() {
            const badges = document.querySelectorAll('.cart-badge');
            const cnt = this.count();
            badges.forEach(b => {
                b.textContent = cnt;
                b.style.display = cnt > 0 ? 'flex' : 'none';
            });
        },

        // ── Fetch cart from DB and rehydrate localStorage ──────────────────
        rehydrateFromDB() {
            return fetch('/api/cart', { credentials: 'same-origin' })
                .then(function(r) { return r.ok ? r.json() : null; })
                .then(function(data) {
                    if (data && data.success && Array.isArray(data.items)) {
                        Cart.mergeFromDB(data.items);
                        if (typeof window.renderCart === 'function') window.renderCart();
                    }
                })
                .catch(function() { /* silent fail — use cached localStorage */ });
        }
    };

    // ===== SMART RECOMMENDATIONS =====
    function getRecommendations() {
        const cartItems = Cart.getAll();
        if (cartItems.length === 0) return PRODUCTS.slice(0, 3);
        const cartCategories = [...new Set(cartItems.map(i => i.category))];
        const cartIds = cartItems.map(i => i.id);
        const sameCategory = PRODUCTS.filter(p => cartCategories.includes(p.category) && !cartIds.includes(p.id));
        const others = PRODUCTS.filter(p => !cartCategories.includes(p.category) && !cartIds.includes(p.id));
        return [...sameCategory, ...others].slice(0, 3);
    }

    // ===== INJECT CART ICON INTO HEADER =====
    function injectCartIcon() {
        const headerActions = document.querySelector('.header-actions');
        if (!headerActions) return;
        if (document.getElementById('cartIconBtn')) return;

        const cartBtn = document.createElement('a');
        cartBtn.id = 'cartIconBtn';
        cartBtn.href = '/cart';
        cartBtn.className = 'btn btn-icon btn-ghost';
        cartBtn.setAttribute('aria-label', 'Shopping Cart');
        cartBtn.style.position = 'relative';
        cartBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
      </svg>
      <span class="cart-badge notification-dot" style="display:none;"></span>
    `;
        const themeToggle = headerActions.querySelector('#themeToggle');
        if (themeToggle) headerActions.insertBefore(cartBtn, themeToggle);
        else headerActions.appendChild(cartBtn);
        Cart._updateBadge();
    }

    // ===== CART PAGE RENDERER =====
    window.renderCart = function () {
        const container = document.getElementById('cartItemsContainer');
        const emptyState = document.getElementById('cartEmptyState');
        const cartSummary = document.getElementById('cartSummary');
        const recommendSection = document.getElementById('cartRecommendations');
        if (!container) return;

        const items = Cart.getAll();

        if (items.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
            if (cartSummary) cartSummary.style.display = 'none';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            if (cartSummary) cartSummary.style.display = 'block';

            container.innerHTML = items.map(item => `
        <div class="card card-body" style="display:flex;gap:20px;align-items:center;margin-bottom:16px;border:1px solid var(--border);" id="cart-item-${item.id}">
          <img src="${item.img}" alt="${item.name}" style="width:90px;height:90px;border-radius:var(--radius-sm);object-fit:cover;border:1px solid var(--border);flex-shrink:0;">
          <div style="flex:1;">
            <div style="font-weight:700;font-size:16px;margin-bottom:4px;">${item.name}</div>
            <div style="font-size:13px;color:var(--muted-fg);margin-bottom:12px;">Condition: ${item.condition} • $${Number(item.price).toFixed(2)} each</div>
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
              <div style="display:flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:var(--radius-sm);padding:4px 8px;">
                <button onclick="SwapifyCart.updateQty('${item.id}', ${item.qty - 1})" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--fg);padding:0 4px;" aria-label="Decrease quantity">−</button>
                <span style="font-weight:700;min-width:20px;text-align:center;">${item.qty}</span>
                <button onclick="SwapifyCart.updateQty('${item.id}', ${item.qty + 1})" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--fg);padding:0 4px;" aria-label="Increase quantity">+</button>
              </div>
              <span style="font-weight:800;color:var(--primary);font-size:16px;">$${(Number(item.price) * item.qty).toFixed(2)}</span>
              <button onclick="SwapifyCart.remove('${item.id}')" class="btn btn-ghost btn-sm" style="color:var(--error);margin-left:auto;" aria-label="Remove item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                Remove
              </button>
            </div>
          </div>
        </div>
      `).join('');

            const total = Cart.total();
            const totalEl = document.getElementById('cartTotal');
            if (totalEl) totalEl.textContent = '$' + total.toFixed(2);
            const countEl = document.getElementById('cartCount');
            if (countEl) countEl.textContent = items.length + ' item' + (items.length !== 1 ? 's' : '');
        }

                if (recommendSection) {
                        const grid = document.getElementById('recGrid');
                        if (!grid) return;
                        // show loader while fetching
                        recommendSection.style.display = 'block';
                        grid.innerHTML = '<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--muted-fg)">Loading recommendations…</div>';

                        fetch('/api/recommendations/cart', { credentials: 'same-origin' })
                                .then(function (res) { return res.ok ? res.json() : null; })
                                .then(function (data) {
                                        const recs = (data && Array.isArray(data.items) && data.items.length) ? data.items : PRODUCTS.slice(0,3);
                                        if (!recs || recs.length === 0) {
                                                recommendSection.style.display = 'none';
                                                return;
                                        }
                                        grid.innerHTML = recs.map(function(p) {
                                                const img = p.image || p.img || '';
                                                const title = p.title || p.name || '';
                                                const price = (p.price !== undefined && p.price !== null) ? p.price : (p.price ? p.price : (p.price === 0 ? '0.00' : null));
                                                const priceHtml = price ? ('$' + Number(price).toFixed(2)) : '';
                                                const id = p.id || p._id || p.id;
                                                return `
                        <div class="card" style="overflow:hidden;">
                            <div style="height:140px;overflow:hidden;">
                                <img src="${img}" alt="${esc(p.title || p.name || '')}" style="width:100%;height:100%;object-fit:cover;">
                            </div>
                            <div class="card-body">
                                <h3 style="font-weight:700;font-size:15px;margin-bottom:4px;">${(p.title || p.name || '')}</h3>
                                <div style="font-weight:800;color:var(--primary);margin-bottom:12px;">${priceHtml}</div>
                                <div style="display:flex;gap:8px;">
                                    <button onclick="SwapifyCart.add('${id}')" class="btn btn-outline btn-sm" style="flex:1;">Add to Cart</button>
                                    <button onclick="window.location='/payment?id=${id}'" class="btn btn-secondary btn-sm" style="flex:1;">Buy Now</button>
                                </div>
                            </div>
                        </div>
                    `;
                                        }).join('');
                                })
                                .catch(function () {
                                        // fallback to PRODUCTS
                                        const recs = PRODUCTS.slice(0,3);
                                        if (!recs || recs.length === 0) { recommendSection.style.display = 'none'; return; }
                                        grid.innerHTML = recs.map(function(p) {
                                                return `
                        <div class="card" style="overflow:hidden;">
                            <div style="height:140px;overflow:hidden;">
                                <img src="${p.img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">
                            </div>
                            <div class="card-body">
                                <h3 style="font-weight:700;font-size:15px;margin-bottom:4px;">${p.name}</h3>
                                <div style="font-weight:800;color:var(--primary);margin-bottom:12px;">$${p.price.toFixed(2)}</div>
                                <div style="display:flex;gap:8px;">
                                    <button onclick="SwapifyCart.add('${p.id}')" class="btn btn-outline btn-sm" style="flex:1;">Add to Cart</button>
                                    <button onclick="window.location='/payment?id=${p.id}'" class="btn btn-secondary btn-sm" style="flex:1;">Buy Now</button>
                                </div>
                            </div>
                        </div>
                    `;
                                        }).join('');
                                });
                }
    };

    // ===== EXPOSE GLOBALLY =====
    window.SwapifyCart = Cart;
    window.SwapifyProducts = PRODUCTS;

    // ===== INIT ON DOM READY =====
    document.addEventListener('DOMContentLoaded', function () {
        injectCartIcon();
        Cart._updateBadge();

        // ── Rehydrate cart from MongoDB on every page load ──────────────────
        // This restores the cart even after browser clears localStorage or session expires.
        // Only runs if the user is logged in (the endpoint is protected by isLoggedIn).
        Cart.rehydrateFromDB().then(function() {
            // After merge, update badge and re-render cart page if open
            Cart._updateBadge();
            if (window.location.pathname.includes('cart') || document.getElementById('cartItemsContainer')) {
                window.renderCart();
            }
        });

        // Deals page: sync sold-out state from localStorage stock map
        if (window.location.pathname.includes('deals')) {
            document.querySelectorAll('.deal-card').forEach(card => {
                const titleEl = card.querySelector('.item-card-title');
                if (!titleEl) return;
                const name = titleEl.textContent.trim();
                const productId = card.getAttribute('data-deal-id') || card.dataset.dealId;
                const product = PRODUCTS.find(p => p.name === name);

                const bodyEl = card.querySelector('.item-card-body');
                if (!bodyEl) return;

                // DB items rendered on the deals page are available — reset local stock
                if (productId && !product) {
                    const currentStock = Cart._getStock(productId);
                    if (currentStock === 0) Cart._setStock(productId, 1);
                }

                const liveStock = productId ? Cart._getStock(productId) : 1;
                const isSoldOut = liveStock === 0;

                if (isSoldOut) {
                    const buyBtn = bodyEl.querySelector('button.btn-secondary');
                    if (buyBtn) { buyBtn.disabled = true; buyBtn.textContent = 'Sold Out'; buyBtn.style.opacity = '0.5'; buyBtn.style.cursor = 'not-allowed'; buyBtn.onclick = null; }
                    const addBtn = bodyEl.querySelector('.add-to-cart-btn');
                    if (addBtn) { addBtn.disabled = true; addBtn.textContent = 'Out of Stock'; addBtn.style.opacity = '0.5'; addBtn.style.cursor = 'not-allowed'; addBtn.onclick = null; }
                } else {
                    if (product && !bodyEl.querySelector('.add-to-cart-btn')) {
                        const addBtn = document.createElement('button');
                        addBtn.className = 'btn btn-outline w-full add-to-cart-btn';
                        addBtn.style.marginTop = '8px';
                        addBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg> Add to Cart`;
                        addBtn.addEventListener('click', function () { Cart.add(product.id); });
                        bodyEl.appendChild(addBtn);
                    }
                }
            });
        }
    });

    window.SwapifyCart = Cart;
})();
