// ============================================================
// SWAPIFY — Core Application Engine
// Modules: Store, Auth, Validation, UI, Favorites, Chat, Notifications
// ============================================================

(function () {
  'use strict';

  // ===== DEFAULT AVATAR (stock photo — used for accounts without a PFP) =====
  const DEFAULT_AVATAR = "/img/stock_pfp.jpg";

  // ===== STORE (localStorage CRUD) =====
  const Store = {
    get(key) { try { return JSON.parse(localStorage.getItem('swapify_' + key)); } catch { return null; } },
    set(key, val) { localStorage.setItem('swapify_' + key, JSON.stringify(val)); },
    remove(key) { localStorage.removeItem('swapify_' + key); },
    getSession() { return this.get('session'); },
    setSession(user) { this.set('session', { userId: user.id, email: user.email, name: user.name, role: user.role || 'user', loggedIn: true }); },
    clearSession() { this.remove('session'); }
  };

  // ===== SEED DATA =====
  function seedData() {
    if (Store.get('seeded')) return;
    const users = [
      { id: 'u1', name: 'Sarah Jenkins', email: 'sarah@example.com', password: 'Test@1234', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200', bio: 'Sustainability enthusiast, amateur photographer, and language learner. 🌿📸', location: 'Brooklyn, NY', joined: 'Mar 2023', createdAt: '2023-03-01T00:00:00Z', favorites: [], role: 'admin' },
      { id: 'u2', name: 'Carlos Martinez', email: 'carlos@example.com', password: 'Test@1234', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?crop=entropy&cs=tinysrgb&fit=facearea&facepad=2&w=256&h=256&q=80', bio: 'Language teacher and coding enthusiast.', location: 'Online', joined: 'Jan 2024', createdAt: '2024-01-01T00:00:00Z', favorites: [] },
      { id: 'u3', name: 'Miguel O\'Hara', email: 'miguel@example.com', password: 'Test@1234', avatar: 'https://i.pravatar.cc/150?img=11', bio: 'Spanish tutor.', location: 'Madrid', joined: 'Feb 2024', createdAt: '2024-02-01T00:00:00Z', favorites: [] },
      { id: 'u4', name: 'Alex Mercer', email: 'alex@example.com', password: 'Test@1234', avatar: 'https://i.pravatar.cc/150?img=12', bio: 'Sneakerhead and trader.', location: 'LA', joined: 'Dec 2023', createdAt: '2023-12-01T00:00:00Z', favorites: [] }
    ];
    const items = [
      { id: 'i1', title: 'Vintage Camera', description: 'Classic film camera in excellent condition. Perfect for photography enthusiasts.', category: 'Electronics', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=400&h=300', type: 'swap', condition: 'Like New', distance: '2.5 km', owner: 'u1', cachedRating: 4.8 },
      { id: 'i2', title: 'Spanish Lessons', description: 'Intermediate Spanish conversation practice sessions.', category: 'Language', image: 'https://media.istockphoto.com/id/494161718/photo/question-hablas-espanol-do-you-speak-spanish.jpg?s=1024x1024&w=is&k=20&c=4B2cvNThZD3S3r7UUsZZrNzz8BXpaDYUPHCHAJsso4A=&q=80&w=400&h=300', type: 'skill', condition: 'Intermediate', distance: 'Online', owner: 'u3', cachedRating: 5.0 },
      { id: 'i3', title: 'Nike Air Max', description: 'Gently used Nike Air Max, size 10. Great condition.', category: 'Fashion', image: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&q=80&w=400&h=300', type: 'deal', condition: 'Good', distance: '1.2 km', owner: 'u4', price: 45, originalPrice: 90, cachedRating: 4.5 },
      { id: 'i4', title: 'Wooden Desk', description: 'Solid oak desk, sturdy and stylish. Minor scratches.', category: 'Furniture', image: 'https://st3.depositphotos.com/1014680/16209/i/1600/depositphotos_162094036-stock-photo-used-wooden-table-isolated.jpg&q=80&w=400&h=10', type: 'swap', condition: 'Fair', distance: '5.0 km', owner: 'u1', cachedRating: 4.2 },
      { id: 'i5', title: 'Acoustic Guitar', description: 'Yamaha acoustic guitar, perfect for beginners.', category: 'Music', image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&q=80&w=400&h=300', type: 'swap', condition: 'Good', distance: '3.1 km', owner: 'u2', cachedRating: 4.6 },
      { id: 'i6', title: 'Leather Backpack', description: 'Premium leather backpack, barely used.', category: 'Fashion', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=400&h=300', type: 'deal', condition: 'Like New', distance: '0.8 km', owner: 'u4', price: 35, originalPrice: 70, cachedRating: 4.7 }
    ];
    const skills = [
      { id: 's1', userId: 'u2', offers: 'Spanish Lessons', requests: 'Coding Basics', level: 'Expert', location: 'Online', cachedRating: 5.0 },
      { id: 's2', userId: 'u1', offers: 'Photography', requests: 'Graphic Design', level: 'Intermediate', location: 'New York, 2km', cachedRating: 4.8 },
      { id: 's3', userId: 'u2', offers: 'React Dev', requests: 'UI/UX Design', level: 'Expert', location: 'Online', cachedRating: 4.9 },
      { id: 's4', userId: 'u1', offers: 'Yoga Flow', requests: 'French Lessons', level: 'Advanced', location: 'London, 5km', cachedRating: 4.7 },
      { id: 's5', userId: 'u4', offers: 'Guitar Basics', requests: 'Video Editing', level: 'Beginner', location: 'Online', cachedRating: 4.5 },
      { id: 's6', userId: 'u1', offers: 'SEO Marketing', requests: 'Content Writing', level: 'Expert', location: 'Dubai, 10km', cachedRating: 4.9 }
    ];
    const notifications = [
      { id: 'n1', userId: 'u2', type: 'message', content: 'Sarah Jenkins sent you a message', link: '/messages', isRead: false, createdAt: Date.now() - 120000 },
      { id: 'n2', userId: 'u2', type: 'match', content: 'New skill match found: Photography ↔ Graphic Design', link: '/skills', isRead: false, createdAt: Date.now() - 3600000 },
      { id: 'n3', userId: 'u2', type: 'deal', content: 'Your deal "Nike Air Max" was viewed 15 times', link: '/deals', isRead: true, createdAt: Date.now() - 86400000 }
    ];
    const swaps = [
      { id: 'sw1', fromUserId: 'u2', toUserId: 'u1', skillId: 's2', fromName: 'Carlos Martinez', toName: 'Sarah Jenkins', status: 'pending', createdAt: Date.now() - 86400000 }
    ];
    const reports = [
      { id: 'r1', type: 'user', targetId: 'u4', reporterId: 'u1', reason: 'Spamming messages', status: 'open', createdAt: Date.now() - 4000000 }
    ];
    Store.set('users', users);
    Store.set('items', items);
    Store.set('skills', skills);
    Store.set('notifications', notifications);
    Store.set('swaps', swaps);
    Store.set('reports', reports);
    Store.set('seeded', true);
  }

  // ===== TILT CARD INIT =====
  function initTiltCards(root) {
    var container = root || document;
    var cards = container.querySelectorAll('.object-card, .deal-card, .skill-card');
    if (!cards.length) return;

    cards.forEach(function (card) {
      if (card.dataset.tiltInit) return;
      card.dataset.tiltInit = '1';
      card.classList.add('tilt-card');
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
      card.style.setProperty('--tilt-scale', '1');
      card.style.setProperty('--tilt-shine-x', '50%');
      card.style.setProperty('--tilt-shine-y', '50%');

      var amplitude = parseFloat(card.dataset.tiltAmp || '12');

      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        var x = (e.clientX - rect.left) / rect.width;
        var y = (e.clientY - rect.top) / rect.height;
        var rotateX = (0.5 - y) * amplitude;
        var rotateY = (x - 0.5) * amplitude;
        card.style.setProperty('--tilt-x', rotateX.toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', rotateY.toFixed(2) + 'deg');
        card.style.setProperty('--tilt-scale', '1.03');
        card.style.setProperty('--tilt-shine-x', (x * 100).toFixed(2) + '%');
        card.style.setProperty('--tilt-shine-y', (y * 100).toFixed(2) + '%');
      });

      card.addEventListener('mouseleave', function () {
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
        card.style.setProperty('--tilt-scale', '1');
        card.style.setProperty('--tilt-shine-x', '50%');
        card.style.setProperty('--tilt-shine-y', '50%');
      });
    });
  }

  // ===== AUTH =====
  const Auth = {
    register(name, email, password) {
      const normalizedEmail = email.toLowerCase().trim();
      const users = Store.get('users') || [];
      if (users.find(u => (u.email || '').toLowerCase() === normalizedEmail)) return { success: false, error: 'Email already registered' };
      const user = {
        id: 'u' + Date.now(),
        name,
        email: normalizedEmail,
        password,
        avatar: DEFAULT_AVATAR,
        bio: '',
        location: '',
        joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        createdAt: new Date().toISOString(),
        favorites: []
      };
      users.push(user);
      Store.set('users', users);
      Store.setSession(user);
      return { success: true, user };
    },
    login(email, password) {
      const users = Store.get('users') || [];
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) return { success: false, error: 'Incorrect email or password' };
      Store.setSession(user);
      return { success: true, user };
    },
    logout() {
      // Clear all client-side storage
      Store.clearSession();
      // Also clear other sensitive data
      Store.remove('notifications');
      Store.remove('cart');
      Store.remove('favorites');
      // Destroy server-side session
      fetch('/logout', { method: 'GET', credentials: 'same-origin' })
        .then(() => {
          window.location.href = '/login?action=loggedout';
        })
        .catch(() => {
          window.location.href = '/login?action=loggedout';
        });
    },
    isLoggedIn() { const s = Store.getSession(); return s && s.loggedIn; },
    currentUser() {
      const s = Store.getSession();
      if (!s) return null;
      const users = Store.get('users') || [];
      return users.find(u => u.id === s.userId) || null;
    },
    updateUser(data) {
      const s = Store.getSession();
      if (!s) return false;
      const users = Store.get('users') || [];
      const idx = users.findIndex(u => u.id === s.userId);
      if (idx === -1) return false;
      Object.assign(users[idx], data);
      Store.set('users', users);
      return true;
    }
  };

  // ===== VALIDATION =====
  const Validate = {
    email(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); },
    required(v) { return v && v.trim().length > 0; },
    minLength(v, n) { return v && v.trim().length >= n; },
    passwordStrength(v) {
      if (!v || v.length < 8) return 'weak';
      let score = 0;
      if (/[a-z]/.test(v)) score++;
      if (/[A-Z]/.test(v)) score++;
      if (/[0-9]/.test(v)) score++;
      if (/[^a-zA-Z0-9]/.test(v)) score++;
      if (v.length >= 12) score++;
      return score <= 2 ? 'weak' : score <= 3 ? 'medium' : 'strong';
    },
    passwordValid(v) { return v && v.length >= 10 && /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v) && /[^a-zA-Z0-9]/.test(v); },
    match(a, b) { return a === b; },
    name(v) { return v && v.trim().length >= 2 && !/^\d+$/.test(v.trim()); },
    sanitize(v) { const d = document.createElement('div'); d.textContent = v; return d.innerHTML; }
  };

  // ===== UI HELPERS =====
  const UI = {
    // Toast system
    toast(message, type, link) {
      type = type || 'info';
      let container = document.querySelector('.toast-container');
      if (!container) { container = document.createElement('div'); container.className = 'toast-container'; document.body.appendChild(container); }
      const toast = document.createElement('div');
      toast.className = 'toast ' + type;
      const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
      toast.innerHTML = '<span style="font-size:18px">' + (icons[type] || 'ℹ') + '</span><span>' + message + '</span><span class="toast-close" onclick="this.parentElement.remove()">✕</span>';
      container.appendChild(toast);
      setTimeout(function () { toast.style.opacity = '0'; toast.style.transform = 'translateX(100px)'; setTimeout(function () { toast.remove(); }, 300); }, 4000);

      const user = Auth.currentUser();
      if (user && (type === 'error' || type === 'warning' || type === 'info' || type === 'success')) {
        const notifs = Store.get('notifications') || [];
        notifs.push({
          id: 'n' + Date.now() + Math.random().toString(36).slice(2),
          userId: user.id,
          type: 'alert',
          content: message,
          link: link || '',
          isRead: false,
          createdAt: Date.now()
        });
        Store.set('notifications', notifs);
        if (typeof this.updateNav === 'function') this.updateNav();
      }
    },

    // Modal
    showModal(title, bodyHtml, footerHtml) {
      let overlay = document.querySelector('.modal-overlay');
      if (!overlay) { overlay = document.createElement('div'); overlay.className = 'modal-overlay'; overlay.innerHTML = '<div class="modal"><div class="modal-header"><h2></h2><button class="btn btn-ghost btn-icon modal-close">&times;</button></div><div class="modal-body"></div><div class="modal-footer"></div></div>'; document.body.appendChild(overlay); overlay.querySelector('.modal-close').onclick = function () { UI.closeModal(); }; overlay.onclick = function (e) { if (e.target === overlay) UI.closeModal(); }; }
      overlay.querySelector('.modal-header h2').textContent = title;
      overlay.querySelector('.modal-body').innerHTML = bodyHtml || '';
      overlay.querySelector('.modal-footer').innerHTML = footerHtml || '';
      overlay.classList.add('active');
    },
    closeModal() { const o = document.querySelector('.modal-overlay'); if (o) o.classList.remove('active'); },

    // Loading state
    setLoading(btn, loading) {
      if (loading) { btn.dataset.originalText = btn.innerHTML; btn.innerHTML = '<span style="display:inline-block;width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite"></span>'; btn.disabled = true; }
      else { btn.innerHTML = btn.dataset.originalText || btn.innerHTML; btn.disabled = false; }
    },

    // Shake animation on element
    shake(el) { el.style.animation = 'shake 0.5s'; setTimeout(function () { el.style.animation = ''; }, 500); },

    // Ripple effect on button
    addRipple(e) {
      const btn = e.currentTarget;
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(ripple);
      setTimeout(function () { ripple.remove(); }, 600);
    },

    // Update header based on auth state
    updateNav() {
      const profileRings = document.querySelectorAll('.profile-ring img');
      // If the server did not render an authenticated user, do NOT use the
      // client-side localStorage session to populate the avatar. This avoids
      // showing a stale or local-only session avatar when the user is not
      // actually logged in on the server.
      if (typeof window !== 'undefined' && !window.__SERVER_AUTH) {
        profileRings.forEach(function (img) { img.src = DEFAULT_AVATAR; img.alt = 'Profile'; });
        return;
      }
      // Server-authenticated: the image is already server-rendered from the DB.
      // hydrateServerUserNav() will sync from /api/me.
      // Never override with localStorage data — it may be mock/stale.
      // Notification badge is now managed by hydrateNotificationBadge() via real API
    }
  };

  // Override native alert to use UI.toast
  window.alert = function (msg) {
    if (typeof UI !== 'undefined' && UI.toast) {
      UI.toast(msg, 'warning');
    } else {
      console.warn('Alert:', msg);
    }
  };

  // ===== FAVORITES (server-backed via POST /api/favorites/toggle) =====
  const Favorites = {
    // isFavorited: checks the server-injected list (set by each template)
    isFavorited(itemId) {
      return (window._userFavoriteIds || []).indexOf(String(itemId)) > -1;
    },
    // toggleWithData: calls the server API and updates the local cache on success
    toggleWithData(itemId, _snapshot, btn) {
      var id = String(itemId);
      var wasFav = this.isFavorited(id);
      var nowFav = !wasFav;

      // Optimistic UI
      if (btn) {
        btn.classList.toggle('active', nowFav);
        var svg = btn.querySelector('svg');
        if (svg) {
          svg.setAttribute('fill', nowFav ? '#FF4D4D' : 'none');
          svg.setAttribute('stroke', nowFav ? '#FF4D4D' : 'currentColor');
        }
      }

      fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ itemId: id })
      })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success) {
          // Revert optimistic update
          if (btn) {
            btn.classList.toggle('active', wasFav);
            var svg2 = btn.querySelector('svg');
            if (svg2) { svg2.setAttribute('fill', wasFav ? '#FF4D4D' : 'none'); svg2.setAttribute('stroke', wasFav ? '#FF4D4D' : 'currentColor'); }
          }
          UI.toast(
            (data.error === 'Not authenticated.' || data.error === 'Unauthorized.')
              ? 'Please log in to add favorites'
              : (data.error || 'Failed to update favorites'),
            'warning'
          );
          return;
        }
        // Sync local cache
        window._userFavoriteIds = window._userFavoriteIds || [];
        if (data.added) {
          if (window._userFavoriteIds.indexOf(id) === -1) window._userFavoriteIds.push(id);
        } else {
          window._userFavoriteIds = window._userFavoriteIds.filter(function (x) { return x !== id; });
        }
        UI.toast(data.added ? 'Added to favorites ❤️' : 'Removed from favorites', data.added ? 'success' : 'info');
      })
      .catch(function () {
        if (btn) {
          btn.classList.toggle('active', wasFav);
          var svg3 = btn.querySelector('svg');
          if (svg3) { svg3.setAttribute('fill', wasFav ? '#FF4D4D' : 'none'); svg3.setAttribute('stroke', wasFav ? '#FF4D4D' : 'currentColor'); }
        }
        UI.toast('Network error. Try again.', 'error');
      });

      return nowFav; // synchronous hint for callers that still read the return value
    },
    toggle(itemId, btn) {
      return this.toggleWithData(itemId, null, btn);
    },
    getAll() { return []; } // favorites page is server-rendered; this stub keeps old callers safe
  };

  // ===== CHAT (Server-backed) =====
  const Chat = {
    send(senderId, receiverId, text) {
      if (!text || !text.trim()) {
        return Promise.resolve({ success: false, error: 'Message text is required.' });
      }
      return fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ receiverId: receiverId, text: text.trim() })
      })
        .then(function (res) { return res.json(); })
        .catch(function () { return { success: false, error: 'Network error. Try again.' }; });
    }
  };

  // ===== NOTIFICATIONS =====
  const Notifications = {
    getForUser(userId) {
      return (Store.get('notifications') || []).filter(function (n) { return n.userId === userId; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
    },
    markRead(notifId) {
      const notifs = Store.get('notifications') || [];
      const n = notifs.find(function (n) { return n.id === notifId; });
      if (n) { n.isRead = true; Store.set('notifications', notifs); }
    },
    markAllRead(userId) {
      const notifs = Store.get('notifications') || [];
      notifs.forEach(function (n) { if (n.userId === userId) n.isRead = true; });
      Store.set('notifications', notifs);
    },
    unreadCount(userId) {
      return (Store.get('notifications') || []).filter(function (n) { return n.userId === userId && !n.isRead; }).length;
    }
  };

  // ===== SEARCH =====
  const Search = {
    items(query) {
      const allItems = Store.get('items') || [];
      if (!query || !query.trim()) return allItems;
      const q = query.toLowerCase().trim();
      return allItems.filter(function (i) {
        return i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.category.toLowerCase().includes(q);
      });
    },
    skills(query) {
      const allSkills = Store.get('skills') || [];
      if (!query || !query.trim()) return allSkills;
      const q = query.toLowerCase().trim();
      return allSkills.filter(function (s) {
        return s.offers.toLowerCase().includes(q) || s.requests.toLowerCase().includes(q);
      });
    }
  };

  // ===== ADMIN =====
  const Admin = {
    requireAdmin() {
      // Dual-layer check: session must declare admin role AND user record must confirm it.
      const session = Store.getSession();
      if (!session || session.role !== 'admin') {
        window.location.href = '/login';
        return false;
      }
      const user = Auth.currentUser();
      if (!user || user.role !== 'admin') {
        Store.clearSession(); // tampered session — wipe it
        window.location.href = 'login';
        return false;
      }
      return true;
    },
    verifyPin(pin) {
      const ADMIN_PIN = Store.get('adminPin') || '2580';
      return String(pin) === String(ADMIN_PIN);
    },
    getAllUsers() { return Store.get('users') || []; },
    banUser(uid) {
      const users = Store.get('users') || [];
      const idx = users.findIndex(u => u.id === uid);
      if (idx > -1) {
        users[idx].status = 'banned';
        Store.set('users', users);
        this.notify(uid, 'admin', 'Your account has been banned due to policy violations.', '/profile');
      }
    },
    suspendUser(uid) {
      const users = Store.get('users') || [];
      const idx = users.findIndex(u => u.id === uid);
      if (idx > -1) {
        users[idx].status = 'suspended';
        Store.set('users', users);
        this.notify(uid, 'admin', 'Your account has been suspended.', '/profile');
      }
    },
    activateUser(uid) {
      const users = Store.get('users') || [];
      const idx = users.findIndex(u => u.id === uid);
      if (idx > -1) {
        users[idx].status = 'active';
        Store.set('users', users);
        this.notify(uid, 'admin', 'Your account has been reactivated.', '/profile');
      }
    },
    deleteUser(uid) {
      let users = Store.get('users') || [];
      users = users.filter(u => u.id !== uid);
      Store.set('users', users);
    },
    getAllSkills() { return Store.get('skills') || []; },
    approveSkill(sid) {
      const skills = Store.get('skills') || [];
      const idx = skills.findIndex(s => s.id === sid);
      if (idx > -1) {
        skills[idx].status = 'active'; // Approved means active
        Store.set('skills', skills);
        this.notify(skills[idx].userId, 'admin', 'Your skill "' + skills[idx].offers + '" was approved!', '/skills');
      }
    },
    rejectSkill(sid) {
      const skills = Store.get('skills') || [];
      const idx = skills.findIndex(s => s.id === sid);
      if (idx > -1) {
        skills[idx].status = 'rejected';
        Store.set('skills', skills);
        this.notify(skills[idx].userId, 'admin', 'Your skill "' + skills[idx].offers + '" was rejected.', '/skills');
      }
    },
    getAllSwaps() { return Store.get('swaps') || []; },
    cancelSwap(sid) {
      const swaps = Store.get('swaps') || [];
      const idx = swaps.findIndex(s => s.id === sid);
      if (idx > -1) {
        swaps[idx].status = 'cancelled';
        Store.set('swaps', swaps);
        this.notify(swaps[idx].fromUserId, 'admin', 'Your swap has been canceled by an admin.', '/messages');
        this.notify(swaps[idx].toUserId, 'admin', 'Your swap has been canceled by an admin.', '/messages');
      }
    },
    flagSwap(sid) {
      const swaps = Store.get('swaps') || [];
      const idx = swaps.findIndex(s => s.id === sid);
      if (idx > -1) {
        swaps[idx].flagged = true;
        Store.set('swaps', swaps);
      }
    },
    unflagSwap(sid) {
      const swaps = Store.get('swaps') || [];
      const idx = swaps.findIndex(s => s.id === sid);
      if (idx > -1) {
        swaps[idx].flagged = false;
        Store.set('swaps', swaps);
      }
    },
    getAllReports() { return Store.get('reports') || []; },
    resolveReport(rid, action, tid) {
      const reports = Store.get('reports') || [];
      const idx = reports.findIndex(r => r.id === rid);
      if (idx > -1) {
        reports[idx].status = 'resolved';
        Store.set('reports', reports);
        if (action === 'warn') this.notify(tid, 'admin', 'Warning: You have been reported for inappropriate behavior.', '/profile');
        else if (action === 'ban') this.banUser(tid);
      }
    },
    addReport(type, targetId, reporterId, reason) {
      const reports = Store.get('reports') || [];
      reports.push({ id: 'r' + Date.now(), type, targetId, reporterId, reason, status: 'open', createdAt: Date.now() });
      Store.set('reports', reports);
    },
    notify(userId, type, content, link) {
      const notifs = Store.get('notifications') || [];
      notifs.push({ id: 'n' + Date.now() + Math.random(), userId, type, content, link, isRead: false, createdAt: Date.now() });
      Store.set('notifications', notifs);
    }
  };

  // ===== API (Server Mock) =====
  const API = {
    createListing(data) {
      // ===== COMMON VALIDATION FOR ALL TYPES =====
      if (!data.title || data.title.trim() === '') {
        return { success: false, error: 'Item title is required.' };
      }
      if (!data.description || data.description.trim() === '') {
        return { success: false, error: 'Item description is required.' };
      }

      // ===== TYPE-SPECIFIC VALIDATION =====
      if (data.type === 'object' || data.type === 'deal') {
        // Object and Deal require images
        if (!data.images || data.images.length === 0) {
          return { success: false, error: 'At least one photo is required.' };
        }

        // Validate image file types
        const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        for (let i = 0; i < data.images.length; i++) {
          const img = data.images[i];
          if (!img || !img.name) {
            return { success: false, error: 'Invalid image file uploaded.' };
          }

          const parts = img.name.split('.');
          const ext = parts[parts.length - 1].toLowerCase();
          if (!validExtensions.includes(ext)) {
            return { success: false, error: 'File must be an appropriate image type (JPG, PNG, WEBP).' };
          }
        }

        // Condition is required
        if (!data.condition) {
          return { success: false, error: 'Item condition is required.' };
        }

        // Location is required
        if (!data.location || data.location.trim() === '') {
          return { success: false, error: 'Location is required.' };
        }
      }

      if (data.type === 'skill') {
        // Skills require CV file
        if (!data.cvFile) {
          return { success: false, error: 'CV document is required for skill listings.' };
        }
      }

      if (data.type === 'deal') {
        // Deal requires pricing information
        if (data.originalPrice === null || data.originalPrice === undefined) {
          return { success: false, error: 'Original price is required for deals.' };
        }
        if (data.sellingPrice === null || data.sellingPrice === undefined) {
          return { success: false, error: 'Selling price is required for deals.' };
        }

        // Validate prices are numbers and non-negative
        const origPrice = parseFloat(data.originalPrice);
        const sellPrice = parseFloat(data.sellingPrice);

        if (isNaN(origPrice)) {
          return { success: false, error: 'Original price must be a valid number.' };
        }
        if (isNaN(sellPrice)) {
          return { success: false, error: 'Selling price must be a valid number.' };
        }

        if (origPrice < 0) {
          return { success: false, error: 'Original price cannot be negative.' };
        }
        if (sellPrice < 0) {
          return { success: false, error: 'Selling price cannot be negative.' };
        }

        // Logical validation: selling price must not exceed original price
        if (sellPrice > origPrice) {
          return { success: false, error: 'Selling price cannot exceed original price.' };
        }
      }

      // ===== SUCCESS: SAVE LISTING TO STORE =====
      const items = Store.get('items') || [];
      const user = Auth.currentUser();

      let newItem = {
        id: 'i' + Date.now(),
        title: Validate.sanitize(data.title.trim()),
        description: Validate.sanitize(data.description.trim()),
        category: 'General',
        type: data.type || 'swap',
        owner: user ? user.id : 'u1',
        createdAt: Date.now(),
        status: 'active'
      };

      // Add type-specific fields
      if (data.type === 'object' || data.type === 'deal') {
        newItem.image = data.images[0].url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400&h=400';
        newItem.images = data.images;
        newItem.condition = data.condition || 'New';
        newItem.location = data.location || 'Unknown';
        newItem.distance = '0 km';
      }

      if (data.type === 'deal') {
        newItem.originalPrice = parseFloat(data.originalPrice);
        newItem.sellingPrice = parseFloat(data.sellingPrice);
        newItem.discount = Math.round(((data.originalPrice - data.sellingPrice) / data.originalPrice) * 100);
      }

      if (data.type === 'skill') {
        newItem.cvFileName = data.cvFile ? data.cvFile.name : 'cv.pdf';
        newItem.location = data.location || 'Online';
      }

      newItem.cachedRating = 0;
      newItem.views = 0;

      items.push(newItem);
      Store.set('items', items);

      return { success: true, item: newItem };
    }
  };
  // ===== THEME =====
  function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    localStorage.setItem('swapify_theme', isDark ? 'dark' : 'light');
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = isDark ? '☀️' : '🌙';
  }


  // ===== MOBILE MENU =====
  function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const iconOpen = document.getElementById('menuIconOpen');
    const iconClose = document.getElementById('menuIconClose');
    if (!menu) return;
    const isOpen = menu.classList.toggle('open');
    if (iconOpen) iconOpen.style.display = isOpen ? 'none' : 'block';
    if (iconClose) iconClose.style.display = isOpen ? 'block' : 'none';
  }

  // ===== ESCAPE HTML =====
  function escapeHtml(text) { var d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

  // ===== PHOTO COUNT =====
  function updatePhotoCount() {
    var grid = document.getElementById('photoGrid');
    var counter = document.getElementById('photoCount');
    if (grid && counter) { var count = grid.querySelectorAll('.photo-item').length; counter.textContent = count; var addLabel = grid.querySelector('.photo-add'); if (addLabel) addLabel.style.display = count >= 5 ? 'none' : 'flex'; }
  }

  // ===== SERVER USER HYDRATION (Session-backed) =====
  function hydrateServerUserNav() {
    var targets = document.querySelectorAll('.profile-ring img, #headerAvatarImg');
    if (!targets.length) return;

    fetch('/api/me', { credentials: 'same-origin' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !data.success || !data.user) return;
        var src = (data.user.profileImage && data.user.profileImage.trim()) ? data.user.profileImage : DEFAULT_AVATAR;
        var alt = data.user.username || 'Profile';
        targets.forEach(function (img) { img.src = src; img.alt = alt; });
      })
      .catch(function () {});
  }

  // ===== NOTIFICATION BADGE (real API, not localStorage) =====
  function showNotifDot() {
    // notification-dot spans on any bell button / notifications link
    document.querySelectorAll('.notification-dot').forEach(function(d) { d.style.display = 'block'; });
    // inline badge used in messages.ejs header
    var badge = document.getElementById('notifBadge');
    if (badge) badge.style.display = 'block';
  }

  function hydrateNotificationBadge() {
    // Ensure bell buttons have a notification-dot child
    document.querySelectorAll('a[href="/notifications"], #notifBtn').forEach(function(btn) {
      btn.style.position = 'relative';
      if (!btn.querySelector('.notification-dot')) {
        var dot = document.createElement('span');
        dot.className = 'notification-dot';
        dot.style.cssText = 'display:none;position:absolute;top:4px;right:4px;width:8px;height:8px;background:#7C3AED;border-radius:50%;border:2px solid var(--bg,#fff)';
        btn.appendChild(dot);
      }
    });

    fetch('/api/notifications/count', { credentials: 'same-origin' })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (data && data.count > 0) showNotifDot();
      })
      .catch(function() {});
  }

  // ===== GLOBAL SOCKET.IO NOTIFICATION LISTENER =====
  function initGlobalSocket() {
    var pollTimer = null;
    var pollIntervalMs = 20000;
    var lastNotifKey = 'swapify_last_notif_ts';

    function getLastNotifTs() {
      var ts = Number(sessionStorage.getItem(lastNotifKey));
      return isNaN(ts) ? 0 : ts;
    }

    function setLastNotifTs(ts) {
      if (!ts || isNaN(ts)) return;
      sessionStorage.setItem(lastNotifKey, String(ts));
    }

    function bumpLastNotifTs(value) {
      var ts = new Date(value || 0).getTime();
      if (!ts) return;
      if (ts > getLastNotifTs()) setLastNotifTs(ts);
    }

    function makeMsgAlertKey(data) {
      if (data && data.id) return 'swapify_alerted_msg_' + String(data.id);
      var fallback = String((data && data.senderId) || 'unknown') + '_' + String((data && data.createdAt) || Date.now());
      return 'swapify_alerted_msg_' + fallback;
    }

    function showToast(message, type) {
      if (typeof UI !== 'undefined' && UI.toast) {
        UI.toast(message, type || 'info');
      } else if (typeof window.SwapifyUI !== 'undefined' && window.SwapifyUI.toast) {
        window.SwapifyUI.toast(message, type || 'info');
      } else {
        alert(message);
      }
    }

    function handleNotificationAlert(data, opts) {
      if (!data) return;
      showNotifDot();

      var type = data.type || '';
      var msg = data.message || 'You have a new notification.';

      if (data.id) {
        var notifKey = 'swapify_alerted_notif_' + String(data.id);
        if (sessionStorage.getItem(notifKey)) {
          bumpLastNotifTs(data.createdAt);
          return;
        }
        sessionStorage.setItem(notifKey, '1');
      }

      // Avoid double-alerts for message notifications when socket delivers new_message.
      if (type === 'message' && !(opts && opts.forceMessageAlert)) {
        bumpLastNotifTs(data.createdAt);
        return;
      }

      showToast(msg, 'info');
      bumpLastNotifTs(data.createdAt);
    }

    function pollNotifications() {
      var since = getLastNotifTs();
      var url = '/api/notifications?limit=20';
      if (since > 0) url += '&since=' + encodeURIComponent(since);

      fetch(url, { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data || !data.success || !Array.isArray(data.notifications)) return;
          if (data.notifications.length === 0) return;

          var sorted = data.notifications.slice().sort(function (a, b) {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });

          sorted.forEach(function (n) {
            handleNotificationAlert(n, { forceMessageAlert: true });
          });

          var maxTs = sorted.reduce(function (acc, n) {
            var ts = new Date(n.createdAt).getTime();
            return ts > acc ? ts : acc;
          }, getLastNotifTs());
          setLastNotifTs(maxTs || Date.now());
        })
        .catch(function () {});
    }

    function startPolling() {
      if (pollTimer) return;
      if (!getLastNotifTs()) setLastNotifTs(Date.now());
      pollTimer = setInterval(pollNotifications, pollIntervalMs);
      pollNotifications();
    }

    function stopPolling() {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }

    function connectSocket() {
      var socket = io({ transports: ['websocket', 'polling'] });

      socket.on('connect', function () {
        stopPolling();
      });

      socket.on('connect_error', function () {
        startPolling();
      });

      socket.on('disconnect', function () {
        startPolling();
      });

      socket.on('notification', function (data) {
        handleNotificationAlert(data, { forceMessageAlert: false });
      });

      socket.on('new_message', function (data) {
        showNotifDot();
        bumpLastNotifTs(data && data.createdAt);

        var key = makeMsgAlertKey(data || {});
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');

        var preview = (data && data.text) ? ':\n' + data.text : '';
        alert('New message from ' + ((data && data.senderName) || 'someone') + preview);
      });
    }

    if (typeof io !== 'undefined') {
      connectSocket();
      return;
    }

    // Dynamically load socket.io client if not already present
    var s = document.createElement('script');
    s.src = '/socket.io/socket.io.js';
    s.onload = connectSocket;
    s.onerror = startPolling;
    document.head.appendChild(s);
  }

  // ===== INIT ON LOAD =====
  document.addEventListener('DOMContentLoaded', function () {
    initTiltCards(document);
    // Seed data
    seedData();

    // Restore theme
    var savedTheme = localStorage.getItem('swapify_theme');
    if (savedTheme === 'dark') { document.documentElement.classList.add('dark'); var btn = document.getElementById('themeToggle'); if (btn) btn.textContent = '☀️'; }

    // Ensure notification buttons have IDs
    document.querySelectorAll('.header-actions button:not([id])').forEach(function (btn) {
      if (btn.innerHTML.includes('M6 8a6')) {
        btn.id = 'notifBtn';
      }
    });

    // Update nav for logged in user
    UI.updateNav();
    hydrateServerUserNav();
    hydrateNotificationBadge();
    initGlobalSocket();

    // Set active nav link
    var currentPage = window.location.pathname.split('/').pop() || '';
    document.querySelectorAll('.nav-link').forEach(function (link) { var href = link.getAttribute('href'); link.classList.toggle('active', href === currentPage); });
    document.querySelectorAll('.bottom-nav a').forEach(function (link) { var href = link.getAttribute('href'); if (href !== '#') link.classList.toggle('active', href === currentPage); });

    // Fade-in on scroll
    var fadeEls = document.querySelectorAll('.fade-in');
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) { entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }); }, { threshold: 0.1 });
      fadeEls.forEach(function (el) { observer.observe(el); });
    } else { fadeEls.forEach(function (el) { el.classList.add('visible'); }); }

    // Responsive elements
    function handleResize() {
      var w = window.innerWidth;
      var vd = document.getElementById('viewAllDesktop');
      var vm = document.getElementById('viewAllMobile');
      if (vd) vd.style.display = w >= 768 ? 'inline-flex' : 'none';
      if (vm) vm.style.display = w < 768 ? 'block' : 'none';
      // Show back button on mobile for chat
      var backBtn = document.getElementById('chatBackBtn');
      if (backBtn) backBtn.style.display = w < 768 ? 'flex' : 'none';
    }
    handleResize();
    window.addEventListener('resize', handleResize);

    // ===== RIPPLE EFFECT ON ALL BUTTONS =====
    document.querySelectorAll('.btn').forEach(function (btn) { btn.addEventListener('click', UI.addRipple); });

    // ===== FAVORITES / HEART BUTTONS =====
    // Set initial active state from server-injected list
    document.querySelectorAll('.item-card-fav').forEach(function (btn) {
      var card = btn.closest('[data-item-id]') || btn.closest('.item-card');
      var itemId = card ? (card.dataset.itemId || card.dataset.dealId) : null;
      if (!itemId) return;
      var favIds = window._userFavoriteIds || [];
      if (favIds.indexOf(String(itemId)) > -1) {
        btn.classList.add('active');
        var svg = btn.querySelector('svg');
        if (svg) { svg.setAttribute('fill', '#FF4D4D'); svg.setAttribute('stroke', '#FF4D4D'); }
      }
    });
    // Global delegation — calls server API; objects.ejs stops propagation so it handles its own
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.item-card-fav');
      if (!btn) return;
      e.preventDefault(); e.stopPropagation();

      var card = btn.closest('[data-item-id]') || btn.closest('.item-card');
      var itemId = card ? (card.dataset.itemId || card.dataset.dealId) : null;
      if (!itemId) return;

      var wasFav = btn.classList.contains('active');
      var nowFav = !wasFav;

      // Optimistic UI flip
      btn.classList.toggle('active', nowFav);
      btn.classList.add('heart-pop');
      setTimeout(function () { btn.classList.remove('heart-pop'); }, 300);
      var svg = btn.querySelector('svg');
      function setSvg(fav) {
        if (svg) { svg.setAttribute('fill', fav ? '#FF4D4D' : 'none'); svg.setAttribute('stroke', fav ? '#FF4D4D' : 'currentColor'); }
      }
      setSvg(nowFav);

      fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ itemId: String(itemId) })
      })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success) {
          btn.classList.toggle('active', wasFav); setSvg(wasFav);
          UI.toast(
            (data.error === 'Not authenticated.' || data.error === 'Unauthorized.')
              ? 'Please log in to add favorites'
              : (data.error || 'Failed to update favorites'),
            'warning'
          );
          return;
        }
        window._userFavoriteIds = window._userFavoriteIds || [];
        var id = String(itemId);
        if (data.added) { if (window._userFavoriteIds.indexOf(id) === -1) window._userFavoriteIds.push(id); }
        else { window._userFavoriteIds = window._userFavoriteIds.filter(function (x) { return x !== id; }); }
        UI.toast(data.added ? 'Added to favorites ❤️' : 'Removed from favorites', data.added ? 'success' : 'info');
      })
      .catch(function () {
        btn.classList.toggle('active', wasFav); setSvg(wasFav);
        UI.toast('Network error. Try again.', 'error');
      });
    });

    // ===== SWAP REQUEST BUTTONS =====
    document.querySelectorAll('[data-swap-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!Auth.isLoggedIn()) { UI.toast('Please log in to request a swap', 'warning'); return; }
        var original = btn.getAttribute('data-original') || btn.textContent;
        if (!btn.getAttribute('data-original')) btn.setAttribute('data-original', original);
        btn.innerHTML = '✓ Swap Requested!';
        btn.style.background = 'var(--success)';
        btn.style.color = '#fff';
        btn.disabled = true;

        var itemId = btn.dataset.itemId || btn.closest('[data-item-id]')?.dataset.itemId || new URLSearchParams(window.location.search).get('id');
        var typeStr = window.location.pathname.includes('skill') ? 'skill' : 'item';
        var link = itemId ? '/' + typeStr + '-details?id=' + itemId : window.location.href;

        UI.toast('Swap request sent! 🔄', 'success', link);
        setTimeout(function () { btn.textContent = original; btn.style.background = ''; btn.style.color = ''; btn.disabled = false; }, 3000);
      });
    });

    // ===== PROFILE TABS =====
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.getAttribute('data-tab');
        document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(function (c) { c.classList.remove('active'); });
        var content = document.getElementById('tab-' + target);
        if (content) content.classList.add('active');
      });
    });

    // ===== ADD ITEM TYPE SELECTOR WITH DYNAMIC FORM FIELDS =====
    function updateFormFields(type) {
      // Update field visibility based on type
      var conditionField = document.getElementById('conditionField');
      var locationField = document.getElementById('locationField');
      var locationRequired = document.getElementById('locationRequired');
      var priceCard = document.getElementById('priceCard');
      var photoCard = document.getElementById('photoCard');
      var cvCard = document.getElementById('cvCard');

      // Reset all fields visibility first
      if (conditionField) conditionField.style.display = 'none';
      if (priceCard) priceCard.style.display = 'none';
      if (photoCard) photoCard.style.display = 'none';
      if (cvCard) cvCard.style.display = 'none';

      // Clear errors on type change
      document.querySelectorAll('.form-error').forEach(function (el) { el.textContent = ''; });

      if (type === 'object') {
        // Object: Condition, Location (required), Photos
        if (conditionField) conditionField.style.display = 'block';
        if (photoCard) photoCard.style.display = 'block';
        if (locationRequired) locationRequired.style.display = 'inline';
      } else if (type === 'skill') {
        // Skill: Location (optional), CV, Photos
        if (locationRequired) locationRequired.style.display = 'none';
        if (photoCard) photoCard.style.display = 'block';
        if (cvCard) cvCard.style.display = 'block';
      } else if (type === 'deal') {
        // Deal: Condition, Location (required), Prices, Photos
        if (conditionField) conditionField.style.display = 'block';
        if (priceCard) priceCard.style.display = 'block';
        if (photoCard) photoCard.style.display = 'block';
        if (locationRequired) locationRequired.style.display = 'inline';
      }
    }

    document.querySelectorAll('.type-option').forEach(function (opt) {
      opt.addEventListener('click', function () {
        document.querySelectorAll('.type-option').forEach(function (o) { o.classList.remove('active'); });
        opt.classList.add('active');
        var type = opt.getAttribute('data-type');
        updateFormFields(type);
      });
    });

    // Set initial state
    var initialActive = document.querySelector('.type-option.active');
    if (initialActive) {
      updateFormFields(initialActive.getAttribute('data-type'));
    }

    // ===== ENHANCED PRICE VALIDATION =====
    var Validator = {
      isValidPrice: function (val) {
        // Check if empty
        if (val === '' || val === null) return false;
        // Convert to number
        var num = parseFloat(val);
        // Check if it's a valid number and non-negative
        return !isNaN(num) && num >= 0;
      },
      priceError: function (val) {
        if (val === '' || val === null) return 'Price is required';
        var num = parseFloat(val);
        if (isNaN(num)) return 'Price must be a valid number';
        if (num < 0) return 'Price cannot be negative';
        return '';
      }
    };

    // ===== PRICE INPUT VALIDATION (Real-time) =====
    var originalPriceInput = document.getElementById('originalPrice');
    var sellingPriceInput = document.getElementById('sellingPrice');

    if (originalPriceInput) {
      originalPriceInput.addEventListener('input', function () {
        // Remove any invalid characters (allow only digits and decimal point)
        var val = this.value;
        var validVal = val.replace(/[^\d.]/g, '');
        // Allow only one decimal point
        if ((validVal.match(/\./g) || []).length > 1) {
          validVal = validVal.replace(/\./, '').slice(0, -1) + '.';
        }
        this.value = validVal;

        var error = Validator.priceError(validVal);
        var errorEl = document.getElementById('originalPriceError');
        if (errorEl) {
          errorEl.textContent = error;
          this.classList.toggle('invalid', error !== '');
          this.classList.toggle('valid', error === '' && validVal !== '');
        }

        // Also validate selling price if it has a value
        if (sellingPriceInput && sellingPriceInput.value) {
          var sellingVal = parseFloat(sellingPriceInput.value);
          var originalVal = parseFloat(validVal);
          if (!isNaN(originalVal) && !isNaN(sellingVal) && sellingVal > originalVal) {
            var sellingErrorEl = document.getElementById('sellingPriceError');
            if (sellingErrorEl) {
              sellingErrorEl.textContent = 'Selling price cannot exceed original price';
              sellingPriceInput.classList.add('invalid');
            }
          }
        }
      });

      originalPriceInput.addEventListener('blur', function () {
        var val = this.value;
        if (val !== '' && Validator.isValidPrice(val)) {
          var num = parseFloat(val);
          this.value = num.toFixed(2);
        } else if (val !== '' && !Validator.isValidPrice(val)) {
          this.value = '0.00';
        }
      });
    }

    if (sellingPriceInput) {
      sellingPriceInput.addEventListener('input', function () {
        // Remove any invalid characters (allow only digits and decimal point)
        var val = this.value;
        var validVal = val.replace(/[^\d.]/g, '');
        // Allow only one decimal point
        if ((validVal.match(/\./g) || []).length > 1) {
          validVal = validVal.replace(/\./, '').slice(0, -1) + '.';
        }
        this.value = validVal;

        var error = Validator.priceError(validVal);
        var errorEl = document.getElementById('sellingPriceError');
        if (errorEl) {
          errorEl.textContent = error;
          this.classList.toggle('invalid', error !== '');
          this.classList.toggle('valid', error === '' && validVal !== '');
        }

        // Check if selling price exceeds original price
        if (!error && originalPriceInput && originalPriceInput.value) {
          var sellingVal = parseFloat(validVal);
          var originalVal = parseFloat(originalPriceInput.value);
          if (!isNaN(originalVal) && !isNaN(sellingVal) && sellingVal > originalVal) {
            errorEl.textContent = 'Selling price cannot exceed original price';
            this.classList.add('invalid');
          } else if (sellingVal <= originalVal) {
            errorEl.textContent = '';
            this.classList.remove('invalid');
            this.classList.toggle('valid', validVal !== '');
          }
        }
      });

      sellingPriceInput.addEventListener('blur', function () {
        var val = this.value;
        if (val !== '' && Validator.isValidPrice(val)) {
          var num = parseFloat(val);
          this.value = num.toFixed(2);
        } else if (val !== '' && !Validator.isValidPrice(val)) {
          this.value = '0.00';
        }
      });
    }


    // ===== ENHANCED ADD ITEM FORM SUBMISSION =====
    var addForm = document.getElementById('addItemForm');
    var realAddForm = document.getElementById('realAddForm');
    if (addForm && !realAddForm) {
      var submitBtn = addForm.querySelector('button[type="submit"]');
      addForm.addEventListener('submit', function (e) {
        e.preventDefault();

        // Clear all previous errors
        document.querySelectorAll('.form-error').forEach(function (el) { el.textContent = ''; });

        // Get values
        var title = document.getElementById('itemTitle');
        var desc = document.getElementById('itemDesc');
        var location = document.getElementById('itemLocation');
        var condition = document.getElementById('itemCondition');
        var originalPrice = document.getElementById('originalPrice');
        var sellingPrice = document.getElementById('sellingPrice');
        var photoGrid = document.getElementById('photoGrid');
        var cvInput = document.getElementById('cvInput');
        var activeType = document.querySelector('.type-option.active');
        var type = activeType ? activeType.getAttribute('data-type') : 'object';

        var photoItems = photoGrid ? photoGrid.querySelectorAll('.photo-item') : [];
        var errors = [];

        // ===== COMMON VALIDATION (All types) =====
        if (!title || !title.value.trim()) {
          errors.push({ el: 'titleError', msg: 'Title is required' });
        }

        if (!desc || !desc.value.trim()) {
          errors.push({ el: 'descError', msg: 'Description is required' });
        }

        // ===== TYPE-SPECIFIC VALIDATION =====
        if (type === 'object' || type === 'deal') {
          // Condition is required
          if (!condition || !condition.value) {
            errors.push({ el: 'conditionError', msg: 'Condition is required' });
          }

          // Location is required
          if (!location || !location.value.trim()) {
            errors.push({ el: 'locationError', msg: 'Location is required' });
          }

          // Photos are required
          if (photoItems.length === 0) {
            errors.push({ el: 'photoError', msg: 'At least one photo is required' });
          }
        }

        if (type === 'skill') {
          // Location is optional, but if provided, validate it
          // CV is required
          if (!cvInput || !cvInput.value) {
            errors.push({ el: 'cvError', msg: 'CV document is required' });
          }
        }

        if (type === 'deal') {
          // Original Price validation
          if (!originalPrice || !Validator.isValidPrice(originalPrice.value)) {
            var originalError = Validator.priceError(originalPrice ? originalPrice.value : '');
            errors.push({ el: 'originalPriceError', msg: originalError || 'Original price is required' });
          }

          // Selling Price validation
          if (!sellingPrice || !Validator.isValidPrice(sellingPrice.value)) {
            var sellingError = Validator.priceError(sellingPrice ? sellingPrice.value : '');
            errors.push({ el: 'sellingPriceError', msg: sellingError || 'Selling price is required' });
          }

          // Logical validation: Selling price must not exceed original price
          if (originalPrice && sellingPrice && Validator.isValidPrice(originalPrice.value) && Validator.isValidPrice(sellingPrice.value)) {
            var origVal = parseFloat(originalPrice.value);
            var sellVal = parseFloat(sellingPrice.value);
            if (sellVal > origVal) {
              errors.push({ el: 'sellingPriceError', msg: 'Selling price cannot exceed original price' });
            }
          }
        }

        // Display errors
        if (errors.length > 0) {
          errors.forEach(function (err) {
            var el = document.getElementById(err.el);
            if (el) {
              el.textContent = err.msg;
              el.style.color = 'var(--danger)';
            }
          });
          UI.shake(addForm);
          UI.toast('Please fix the errors before submitting', 'error');
          return;
        }

        // ===== PREPARE LISTING DATA =====
        var images = [];
        if (photoItems.length > 0) {
          photoItems.forEach(function (item) {
            var fileName = item.dataset.fileName || 'image.jpg';
            images.push({
              name: fileName,
              url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400&h=400'
            });
          });
        }

        var listingData = {
          title: title.value.trim(),
          description: desc.value.trim(),
          type: type,
          location: location ? location.value.trim() : '',
          images: images,
          condition: condition ? condition.value : '',
          originalPrice: type === 'deal' ? parseFloat(originalPrice.value) : null,
          sellingPrice: type === 'deal' ? parseFloat(sellingPrice.value) : null,
          cvFile: type === 'skill' ? (cvInput ? cvInput.files[0] : null) : null
        };

        if (submitBtn) submitBtn.disabled = true;

        // API Server Mock validation
        var result = API.createListing(listingData);

        if (!result.success) {
          if (submitBtn) submitBtn.disabled = false;
          UI.toast(result.error, 'error');
          UI.shake(addForm);
          return;
        }

        UI.toast('Listing published successfully! 🎉', 'success');
        setTimeout(function () {
          window.location.href = type === 'skill' ? '/skills' : type === 'deal' ? '/deals' : '/objects';
        }, 1500);
      });
    }

    // ===== REAL-TIME INPUT VALIDATION =====
    document.querySelectorAll('[data-validate]').forEach(function (input) {
      input.addEventListener('input', function () {
        var type = input.dataset.validate;
        var val = input.value;
        var valid = false;
        if (type === 'email') valid = Validate.email(val);
        else if (type === 'password') valid = Validate.passwordValid(val);
        else if (type === 'name') valid = Validate.name(val);
        else if (type === 'required') valid = Validate.required(val);
        else if (type === 'confirm-password') { var pw = document.getElementById('password') || document.getElementById('regPassword'); valid = pw && Validate.match(val, pw.value); }
        input.classList.toggle('valid', valid);
        input.classList.toggle('invalid', val.length > 0 && !valid);
        // Update error message
        var errEl = input.parentElement.querySelector('.form-error') || input.closest('.form-group') && input.closest('.form-group').querySelector('.form-error');
        if (errEl) { errEl.textContent = val.length > 0 && !valid ? input.dataset.errorMsg || 'Invalid input' : ''; }
        // Password strength meter
        if (type === 'password') {
          var meter = document.querySelector('.password-strength');
          var text = document.querySelector('.strength-text');
          if (meter) { var str = Validate.passwordStrength(val); meter.className = 'password-strength ' + str; if (text) text.textContent = val.length > 0 ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }
        }
      });
    });

    // ===== LOGIN FORM =====
    // Inline auth pages manage their own handlers.
    var skipAuthHandlers = window.SWAPIFY_INLINE_AUTH === true;
    var loginForm = document.getElementById('loginForm');
    if (loginForm && !skipAuthHandlers) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = document.getElementById('loginEmail');
        var password = document.getElementById('loginPassword');
        var hasError = false;
        if (!Validate.email(email.value)) { email.classList.add('invalid'); hasError = true; }
        if (!Validate.required(password.value)) { password.classList.add('invalid'); hasError = true; }
        if (hasError) { UI.shake(loginForm); UI.toast('Please fill in all fields correctly', 'error'); return; }
        var submitBtn = loginForm.querySelector('button[type="submit"]');
        UI.setLoading(submitBtn, true);
        setTimeout(function () {
          var result = Auth.login(email.value.trim(), password.value);
          UI.setLoading(submitBtn, false);
          if (result.success) { UI.toast('Welcome back! 🎉', 'success'); setTimeout(function () { window.location.href = '/'; }, 1000); }
          else { UI.toast(result.error, 'error'); UI.shake(loginForm); }
        }, 800);
      });
    }

    // ===== REGISTER FORM =====
    var registerForm = document.getElementById('registerForm');
    if (registerForm && !skipAuthHandlers) {
      registerForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = document.getElementById('regName');
        var email = document.getElementById('regEmail');
        var password = document.getElementById('regPassword');
        var confirm = document.getElementById('regConfirm');
        var hasError = false;
        [[name, Validate.name, 'Name must be at least 2 characters'], [email, Validate.email, 'Invalid email format'], [password, Validate.passwordValid, 'Password needs 8+ chars, upper, lower, number & symbol'], [confirm, function (v) { return Validate.match(v, password.value); }, 'Passwords do not match']].forEach(function (rule) {
          var el = rule[0], fn = rule[1], msg = rule[2];
          if (!el) return;
          var valid = fn(el.value);
          el.classList.toggle('valid', valid);
          el.classList.toggle('invalid', !valid);
          var errEl = el.closest('.form-group') ? el.closest('.form-group').querySelector('.form-error') : null;
          if (errEl && !valid) errEl.textContent = msg;
          if (!valid) hasError = true;
        });
        if (hasError) { UI.shake(registerForm); UI.toast('Please fix the errors', 'error'); return; }
        var submitBtn = registerForm.querySelector('button[type="submit"]');
        UI.setLoading(submitBtn, true);
        setTimeout(function () {
          var result = Auth.register(name.value.trim(), email.value.trim(), password.value);
          UI.setLoading(submitBtn, false);
          if (result.success) { UI.toast('Account created! Welcome! 🎉', 'success'); setTimeout(function () { window.location.href = '/'; }, 1000); }
          else {
            UI.toast(result.error, 'error');
            UI.shake(registerForm);
            // Show inline error on the email field for duplicate-email case
            if (result.error && result.error.toLowerCase().includes('email')) {
              var emailErrEl = document.getElementById('regEmailErr');
              if (emailErrEl) emailErrEl.textContent = result.error;
              if (email) { email.classList.add('invalid'); email.classList.remove('valid'); }
            }
          }
        }, 800);
      });
    }

    // ===== SETTINGS TOGGLES =====
    document.querySelectorAll('.toggle').forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        toggle.classList.toggle('active');
        if (toggle.id === 'darkModeToggle') toggleTheme();
      });
    });

    // ===== SEARCH FUNCTIONALITY =====
    var headerSearch = document.querySelector('.header-search .input');
    if (headerSearch) {
      headerSearch.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var query = headerSearch.value.trim();
          if (!query) { UI.toast('Please enter a search term', 'warning'); return; }
          if (window.location.pathname.includes('skills') && window.setSkillSearchQuery) {
            window.setSkillSearchQuery(query);
          } else if (window.location.pathname.includes('objects') && window.setObjectSearchQuery) {
            window.setObjectSearchQuery(query);
          } else if (window.location.pathname.includes('deals') && window.setDealSearchQuery) {
            window.setDealSearchQuery(query);
          } else {
            var results = Search.items(query);
            if (results.length === 0) { UI.toast('No results found for "' + escapeHtml(query) + '"', 'info'); }
            else { UI.toast(results.length + ' result(s) found', 'success'); }
          }
        }
      });
    }

    // ===== PHOTO UPLOAD WITH MAX 5 FILES =====
    var photoInput = document.getElementById('photoInput');
    var photoGrid = document.getElementById('photoGrid');
    var photoFiles = [];

    function buildPhotoKey(file) {
      return [file.name, file.size, file.lastModified].join('::');
    }

    function syncPhotoInput() {
      if (!photoInput) return;
      var dt = new DataTransfer();
      photoFiles.forEach(function (f) { dt.items.add(f); });
      photoInput.files = dt.files;
    }

    if (photoInput && photoGrid) {
      photoInput.addEventListener('change', function () {
        var files = Array.from(this.files || []);
        if (files.length === 0) return;

        files.forEach(function (file) {
          var count = photoGrid.querySelectorAll('.photo-item').length;
          if (count >= 5) {
            UI.toast('Maximum 5 photos allowed', 'warning');
            return;
          }

          // Validate file type
          var validTypes = ['image/jpeg', 'image/png', 'image/webp'];
          if (!validTypes.includes(file.type)) {
            UI.toast('Only JPG, PNG, and WEBP images are allowed', 'error');
            return;
          }

          // Validate file size (max 5MB per image)
          if (file.size > 5 * 1024 * 1024) {
            UI.toast('Image size must be less than 5MB', 'error');
            return;
          }

          var fileKey = buildPhotoKey(file);
          if (photoFiles.some(function (f) { return buildPhotoKey(f) === fileKey; })) {
            return;
          }

          photoFiles.push(file);

          var div = document.createElement('div');
          div.className = 'photo-item';
          div.dataset.fileName = file.name;
          div.dataset.fileKey = fileKey;

          // Create a preview using FileReader
          var reader = new FileReader();
          reader.onload = function (e) {
            div.innerHTML = '<img src="' + e.target.result + '" alt="Upload preview" style="width:100%;height:100%;object-fit:cover"><button class="remove-btn" type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>';

            var removeBtn = div.querySelector('.remove-btn');
            if (removeBtn) {
              removeBtn.addEventListener('click', function (e) {
                e.preventDefault();
                var key = div.dataset.fileKey;
                photoFiles = photoFiles.filter(function (f) { return buildPhotoKey(f) !== key; });
                div.remove();
                syncPhotoInput();
                updatePhotoCount();
              });
            }
          };
          reader.readAsDataURL(file);

          photoGrid.insertBefore(div, photoGrid.querySelector('.photo-add'));
          updatePhotoCount();
          syncPhotoInput();
        });
      });
    }

    // ===== CV UPLOAD FOR SKILLS =====
    var cvInput = document.getElementById('cvInput');
    var cvUploadArea = document.getElementById('cvUploadArea');
    var cvFileDisplay = document.getElementById('cvFileDisplay');
    var cvFileName = document.getElementById('cvFileName');

    if (cvInput) {
      // Handle click
      if (cvUploadArea) {
        cvUploadArea.addEventListener('click', function () {
          cvInput.click();
        });

        // Handle drag and drop
        cvUploadArea.addEventListener('dragover', function (e) {
          e.preventDefault();
          this.style.background = 'rgba(124,58,237,.1)';
          this.style.borderColor = 'var(--primary)';
        });

        cvUploadArea.addEventListener('dragleave', function (e) {
          e.preventDefault();
          this.style.background = 'rgba(124,58,237,.02)';
          this.style.borderColor = 'var(--border)';
        });

        cvUploadArea.addEventListener('drop', function (e) {
          e.preventDefault();
          this.style.background = 'rgba(124,58,237,.02)';
          this.style.borderColor = 'var(--border)';
          var files = e.dataTransfer.files;
          if (files.length > 0) {
            cvInput.files = files;
            var event = new Event('change', { bubbles: true });
            cvInput.dispatchEvent(event);
          }
        });
      }

      cvInput.addEventListener('change', function () {
        var file = this.files && this.files[0];
        if (!file) return;

        // Validate file type
        var validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!validTypes.includes(file.type)) {
          UI.toast('Only PDF and Word documents are allowed', 'error');
          this.value = '';
          return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          UI.toast('CV size must be less than 10MB', 'error');
          this.value = '';
          return;
        }

        if (cvFileName) cvFileName.textContent = file.name;
        if (cvFileDisplay) cvFileDisplay.style.display = 'block';
        if (cvUploadArea) cvUploadArea.style.display = 'none';
      });
    }

    // ===== NAVBAR ACTIVE STATE MANAGER =====
    // Single source of truth for which panel/dropdown is currently open.
    // When a panel opens its trigger button gets .navbar-item--active.
    // When it closes (by any means) the class is removed.
    var NavbarState = (function () {
      var _current = null; // { triggerId, closePanel }

      function open(triggerId, closeFn) {
        // Close any previously open panel first
        if (_current && _current.triggerId !== triggerId) {
          _current.closePanel();
        }
        _current = { triggerId: triggerId, closePanel: closeFn };
        var btn = document.getElementById(triggerId);
        if (btn) {
          btn.classList.add('navbar-item--active', 'navbar-item--animate');
          btn.setAttribute('aria-expanded', 'true');
          // Remove animate class after animation completes
          setTimeout(function () { btn.classList.remove('navbar-item--animate'); }, 250);
        }
      }

      function close(triggerId) {
        if (_current && _current.triggerId === triggerId) {
          _current = null;
        }
        var btn = triggerId ? document.getElementById(triggerId) : null;
        if (btn) {
          btn.classList.remove('navbar-item--active', 'navbar-item--animate');
          btn.setAttribute('aria-expanded', 'false');
        }
      }

      function closeAll() {
        if (_current) {
          _current.closePanel();
          _current = null;
        }
      }

      function isOpen(triggerId) {
        return _current && _current.triggerId === triggerId;
      }

      return { open: open, close: close, closeAll: closeAll, isOpen: isOpen };
    })();

    // Expose globally so external scripts can use it
    window.SwapifyNavbarState = NavbarState;

    // Close any open panel when pressing Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') NavbarState.closeAll();
    });

    // ===== NOTIFICATIONS DROPDOWN =====
    var notifBtn = document.getElementById('notifBtn');
    if (notifBtn) {
      // Wrap the button in a relative-positioned container (if not already)
      var notifWrap = notifBtn.parentNode;
      if (!notifWrap.classList.contains('notif-dropdown-wrap')) {
        var wrapper = document.createElement('div');
        wrapper.className = 'notif-dropdown-wrap';
        notifBtn.parentNode.insertBefore(wrapper, notifBtn);
        wrapper.appendChild(notifBtn);
        notifWrap = wrapper;
      }

      // Create dropdown panel
      var notifPanel = document.createElement('div');
      notifPanel.className = 'notif-dropdown';
      notifPanel.setAttribute('role', 'dialog');
      notifPanel.setAttribute('aria-label', 'Notifications');
      notifWrap.appendChild(notifPanel);

      function timeAgo(ts) {
        var diff = Date.now() - ts;
        var m = Math.floor(diff / 60000);
        if (m < 1) return 'just now';
        if (m < 60) return m + 'm ago';
        var h = Math.floor(m / 60);
        if (h < 24) return h + 'h ago';
        return Math.floor(h / 24) + 'd ago';
      }

      function iconForType(type) {
        var icons = {
          message: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/></svg>',
          match: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3L4 7l4 4"/><path d="M4 7h16"/><path d="M16 21l4-4-4-4"/><path d="M20 17H4"/></svg>',
          deal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9.5 11.5 5-5"/><circle cx="11" cy="11" r="1"/><circle cx="14" cy="14" r="1"/></svg>',
          admin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
          alert: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
        };
        return icons[type] || icons.alert;
      }

      function notifTypeIconClass(type) {
        if (type === 'message') return 'message';
        if (type && type.startsWith('swap')) return 'match';
        if (type && type.startsWith('deal')) return 'deal';
        return 'alert';
      }

      function notifTypeHref(type) {
        if (type === 'message') return '/messages';
        if (type && type.startsWith('swap')) return '/swap-requests';
        if (type && type.startsWith('deal')) return '/deals';
        return '/notifications';
      }

      function buildNotifListHtml(notifs) {
        if (!notifs || notifs.length === 0) {
          return '<div class="notif-dropdown-empty"><span class="notif-dropdown-empty-icon">🔔</span>You have no notifications yet.</div>';
        }
        var html = '';
        notifs.forEach(function(n) {
          var type = n.type || 'system';
          var iconClass = notifTypeIconClass(type);
          var href = notifTypeHref(type);
          var id = n._id || n.id || '';
          var unreadClass = !n.isRead ? ' unread' : '';
          var unreadDot = !n.isRead ? '<span class="notif-dropdown-unread-dot" aria-hidden="true"></span>' : '';
          var ts = n.createdAt ? timeAgo(new Date(n.createdAt).getTime()) : '';
          html += '<a href="' + href + '" class="notif-dropdown-item' + unreadClass + '" data-notif-id="' + id + '">' +
            '<span class="notif-dropdown-icon ' + iconClass + '" aria-hidden="true">' + iconForType(iconClass) + '</span>' +
            '<span class="notif-dropdown-text">' +
            '<p>' + escapeHtml(n.message || '') + '</p>' +
            '<span class="notif-dropdown-time">' + unreadDot + ts + '</span>' +
            '</span>' +
            '</a>';
        });
        return html;
      }

      function renderNotifPanel(notifs) {
        var unread = notifs.filter(function(n) { return !n.isRead; });
        var badgeHtml = unread.length > 0
          ? '<span class="notif-dropdown-badge">' + (unread.length > 9 ? '9+' : unread.length) + '</span>'
          : '';
        var markAllHtml = unread.length > 0
          ? '<button class="notif-dropdown-mark-all" id="notifMarkAll" aria-label="Mark all as read">Mark all read</button>'
          : '';

        notifPanel.innerHTML =
          '<div class="notif-dropdown-header">' +
          '<h3>Notifications ' + badgeHtml + '</h3>' +
          '<div class="notif-dropdown-actions">' + markAllHtml +
          '<button class="notif-dropdown-close" id="notifPanelClose" aria-label="Close notifications">&times;</button>' +
          '</div></div>' +
          '<div class="notif-dropdown-list" role="list">' + buildNotifListHtml(notifs) + '</div>' +
          '<div class="notif-dropdown-footer"><a href="/notifications">View all notifications &rarr;</a></div>';

        // Mark single notification read on click (optimistic)
        notifPanel.querySelectorAll('.notif-dropdown-item').forEach(function(item) {
          item.addEventListener('click', function() {
            var nid = item.getAttribute('data-notif-id');
            if (nid && item.classList.contains('unread')) {
              fetch('/api/notifications/' + nid + '/read', { method: 'POST', credentials: 'same-origin' }).catch(function(){});
            }
            closeNotifPanel();
          });
        });

        // Mark all read
        var markAllBtn = document.getElementById('notifMarkAll');
        if (markAllBtn) {
          markAllBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            fetch('/api/notifications/read-all', { method: 'POST', credentials: 'same-origin' })
              .then(function(r) { return r.json(); })
              .then(function(d) {
                if (d.success) {
                  notifPanel.querySelectorAll('.notif-dropdown-item.unread').forEach(function(el) {
                    el.classList.remove('unread');
                    var dot = el.querySelector('.notif-dropdown-unread-dot');
                    if (dot) dot.remove();
                  });
                  var badge = notifPanel.querySelector('.notif-dropdown-badge');
                  if (badge) badge.remove();
                  markAllBtn.remove();
                }
              })
              .catch(function(){});
          });
        }

        // Close button
        var closeBtn = document.getElementById('notifPanelClose');
        if (closeBtn) {
          closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            closeNotifPanel();
          });
        }
      }

      function openNotifPanel() {
        // Show panel immediately with loading state
        notifPanel.innerHTML =
          '<div class="notif-dropdown-header"><h3>Notifications</h3>' +
          '<div class="notif-dropdown-actions">' +
          '<button class="notif-dropdown-close" id="notifPanelClose" aria-label="Close notifications">&times;</button>' +
          '</div></div>' +
          '<div class="notif-dropdown-list" role="list">' +
          '<div class="notif-dropdown-empty">Loading…</div>' +
          '</div>';
        var closeBtnLoading = document.getElementById('notifPanelClose');
        if (closeBtnLoading) {
          closeBtnLoading.addEventListener('click', function(e) { e.stopPropagation(); closeNotifPanel(); });
        }

        notifPanel.classList.add('open');
        NavbarState.open('notifBtn', closeNotifPanel);
        setTimeout(function() {
          document.addEventListener('click', onOutsideNotifClick);
        }, 10);

        // Fetch real notifications from API
        fetch('/api/notifications', { credentials: 'same-origin' })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (notifPanel.classList.contains('open')) {
              renderNotifPanel(data.notifications || []);
            }
          })
          .catch(function() {
            if (notifPanel.classList.contains('open')) {
              var list = notifPanel.querySelector('.notif-dropdown-list');
              if (list) list.innerHTML = '<div class="notif-dropdown-empty">Could not load notifications.</div>';
            }
          });
      }

      function closeNotifPanel() {
        notifPanel.classList.remove('open');
        NavbarState.close('notifBtn');
        document.removeEventListener('click', onOutsideNotifClick);
      }

      function onOutsideNotifClick(e) {
        if (!notifWrap.contains(e.target)) {
          closeNotifPanel();
        }
      }

      notifBtn.setAttribute('aria-expanded', 'false');
      notifBtn.setAttribute('aria-haspopup', 'true');
      notifBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (NavbarState.isOpen('notifBtn')) {
          closeNotifPanel();
        } else {
          openNotifPanel();
        }
      });
    }

    // ===== MESSAGES LINK — active state on click =====
    // Since Messages is a navigation link, give it a brief active state before navigation
    document.querySelectorAll('a[href="/messages"].btn-icon, a[href*="/messages"].btn-icon').forEach(function (msgLink) {
      if (!msgLink.id) msgLink.id = 'messagesNavBtn';
      msgLink.addEventListener('click', function () {
        NavbarState.closeAll();
        msgLink.classList.add('navbar-item--active', 'navbar-item--animate');
      });
    });

    // ===== CART LINK — active state on click =====
    document.querySelectorAll('#cartIconBtn, a[href="/cart"].btn-icon').forEach(function (cartLink) {
      cartLink.addEventListener('click', function () {
        NavbarState.closeAll();
        cartLink.classList.add('navbar-item--active', 'navbar-item--animate');
      });
    });

    // ===== PROFILE RING — active state on click =====
    document.querySelectorAll('.profile-ring').forEach(function (profileLink) {
      profileLink.addEventListener('click', function () {
        NavbarState.closeAll();
        profileLink.classList.add('navbar-item--active', 'navbar-item--animate');
      });
    });

    // ===== LOGOUT BUTTON =====
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        var modal = document.getElementById('logoutModal');
        if (modal) {
          modal.style.display = 'flex';
        } else {
          Auth.logout();
        }
      });
    }

    // ===== SETTINGS FORM =====
    var settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
      var user = Auth.currentUser();
      if (user) {
        var nameInput = document.getElementById('settingsName');
        var emailInput = document.getElementById('settingsEmail');
        var locationInput = document.getElementById('settingsLocation');
        var avatarInput = document.getElementById('settingsAvatar');
        if (nameInput) nameInput.value = user.name || '';
        if (emailInput) emailInput.value = user.email || '';
        if (locationInput) locationInput.value = user.location || '';
        if (avatarInput) avatarInput.value = user.avatar || '';
      }
      settingsForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var nameInput = document.getElementById('settingsName');
        var emailInput = document.getElementById('settingsEmail');
        var locationInput = document.getElementById('settingsLocation');
        var avatarInput = document.getElementById('settingsAvatar');
        var onlineToggle = document.getElementById('settingsOnlineToggle');
        if (nameInput && emailInput) {
          Auth.updateUser({
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            location: locationInput ? locationInput.value.trim() : '',
            avatar: avatarInput ? avatarInput.value.trim() : '',
            online: onlineToggle ? onlineToggle.classList.contains('active') : false
          });
          UI.updateNav();
          UI.toast('Settings saved! ✓', 'success');
        }
      });
    }

    // ===== PROFILE PAGE DATA =====
    if (currentPage === 'profile') {
      var user = Auth.currentUser();
      if (user) {
        var pName = document.querySelector('.profile-name');
        var pBio = document.querySelector('.profile-bio');
        var pAvatar = document.querySelector('.profile-avatar img');
        if (pName) pName.textContent = user.name;
        if (pBio && user.bio) pBio.textContent = user.bio;
        if (pAvatar) pAvatar.src = (user.avatar && user.avatar.trim()) ? user.avatar : DEFAULT_AVATAR;
      }
    }
  });

  // Expose globals needed by inline handlers
  window.toggleTheme = toggleTheme;
  window.toggleMobileMenu = toggleMobileMenu;
  window.updatePhotoCount = updatePhotoCount;
  window.escapeHtml = escapeHtml;
  window.SwapifyDefaultAvatar = DEFAULT_AVATAR;
  window.SwapifyAuth = Auth;
  window.SwapifyUI = UI;
  window.SwapifyStore = Store;
  window.SwapifyFavorites = Favorites;
  window.SwapifyChat = Chat;
  window.SwapifyNotifications = Notifications;
  window.SwapifySearch = Search;
  window.SwapifyValidate = Validate;
  window.SwapifyAdmin = Admin;
  window.SwapifyInitTiltCards = initTiltCards;

})();

// ===== AUTO-LOAD CART ENGINE ON ALL PAGES =====
(function () {
  if (!document.querySelector('script[src="cart.js"]')) {
    var cartScript = document.createElement('script');
    cartScript.src = 'cart.js';
    document.body.appendChild(cartScript);
  }
})();
