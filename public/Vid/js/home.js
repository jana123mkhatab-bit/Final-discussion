/* ============================================================
   script.js — Swapify Home Page Engine
   Runs after app.js. Handles all home-page-specific logic.
   ============================================================ */
(function () {
  'use strict';

  /* ─── MOCK DATABASE ─────────────────────────────────────── */
  const users = {
    'u1': { id:'u1', name:'Sarah Jenkins',   avatar:'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200', location:'Brooklyn, NY', bio:'Sustainability enthusiast, amateur photographer, and language learner. 🌿📸', swaps:34, cachedRating:4.9, online:true },
    'u2': { id:'u2', name:'Carlos Martinez', avatar:'https://images.unsplash.com/photo-1599566150163-29194dcaad36?crop=entropy&cs=tinysrgb&fit=facearea&facepad=2&w=256&h=256&q=80',  location:'Online', bio:'Language teacher and coding enthusiast.', swaps:21, cachedRating:4.8, online:true },
    'u3': { id:'u3', name:'Miguel O\'Hara',  avatar:'https://i.pravatar.cc/150?img=11',  location:'Madrid', bio:'Spanish tutor.', swaps:17, cachedRating:5.0, online:false },
    'u4': { id:'u4', name:'Alex Mercer',    avatar:'https://i.pravatar.cc/150?img=12',  location:'LA', bio:'Sneakerhead and trader.', swaps:28, cachedRating:4.5, online:true },
  };

  /* Central items array — single source of truth for "Recommended" section */
  const swapItems = [
    {
      id: 'item-001', ownerId: 'u1',
      title: 'Vintage Camera',
      badge: 'Swap Only', badgeClass: 'badge-primary',
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=400&h=300',
      condition: 'Like New', distance: '2.5 km',
      cachedRating: 4.8, category: 'Electronics',
      description: 'Classic 35mm film camera in excellent condition. Perfect for photography enthusiasts looking to explore analog photography.',
      wantedFor: 'Acoustic Guitar or Music Gear',
      postedAt: '2 mins ago'
    },
    {
      id: 'item-002', ownerId: 'u3',
      title: 'Spanish Lessons',
      badge: 'Skill', badgeClass: 'badge-secondary',
      image: 'https://media.istockphoto.com/id/494161718/photo/question-hablas-espanol-do-you-speak-spanish.jpg?s=1024x1024&w=is&k=20&c=4B2cvNThZD3S3r7UUsZZrNzz8BXpaDYUPHCHAJsso4A=&q=80&w=400&h=300',
      condition: 'Intermediate', distance: 'Online',
      cachedRating: 5.0, category: 'Language',
      description: 'Interactive Spanish conversation practice for intermediate learners. Sessions are 1 hour each, twice a week.',
      wantedFor: 'Coding Basics / React Lessons',
      postedAt: '15 mins ago'
    },
    {
      id: 'item-003', ownerId: 'u4',
      title: 'Nike Air Max',
      badge: '$45', badgeClass: 'badge-beige',
      image: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&q=80&w=400&h=300',
      condition: 'Good', distance: '1.2 km',
      cachedRating: 4.5, category: 'Fashion',
      description: 'Gently used Nike Air Max, size 10. Only worn 5 times. No major scratches or scuffs.',
      price: 45, originalPrice: 90,
      wantedFor: null,
      postedAt: '30 mins ago'
    },
    {
      id: 'item-004', ownerId: 'u1',
      title: 'Wooden Desk',
      badge: 'Swap Only', badgeClass: 'badge-primary',
      image: 'https://st3.depositphotos.com/1014680/16209/i/1600/depositphotos_162094036-stock-photo-used-wooden-table-isolated.jpg&q=80&w=400&h=10',
      condition: 'Fair', distance: '5.0 km',
      cachedRating: 4.2, category: 'Furniture',
      description: 'Solid oak desk, sturdy and stylish. Minor surface scratches. Great for a home office setup.',
      wantedFor: 'Office Chair or Bookshelf',
      postedAt: '1 hr ago'
    }
  ];

  /* Activity feed data */
  const activities = [
    { id:'act-01', userId1:'u1', userId2:'u2', item1:'Vintage Camera', item2:'Acoustic Guitar', time:'2 mins ago',  location:'Cairo' },
    { id:'act-02', userId1:'u3', userId2:'u2', item1:'Spanish Lessons', item2:'Yoga Sessions',  time:'8 mins ago',  location:'Online' },
    { id:'act-03', userId1:'u4', userId2:'u1', item1:'Nike Air Max',    item2:'Photography Kit',time:'14 mins ago', location:'Brooklyn' },
    { id:'act-04', userId1:'u2', userId2:'u4', item1:'Coding Bootcamp', item2:'Guitar Basics',  time:'21 mins ago', location:'Online' },
    { id:'act-05', userId1:'u4', userId2:'u3', item1:'Yoga Flow Guide', item2:'Spanish eBook',  time:'35 mins ago', location:'Dubai' },
  ];

  /* ─── STATE ──────────────────────────────────────────────── */
  const state = {
    selectedItem: null,
    currentActivityIdx: 0,
    activityTimer: null
  };
  let scrollStackCleanup = null;

  /* ─── DOM CACHE ──────────────────────────────────────────── */
  const grid        = document.getElementById('recommendedGrid');
  const feedEl      = document.getElementById('activityFeed');
  const itemModal   = document.getElementById('itemModal');
  const modalBody   = document.getElementById('modalBody');
  const modalFooter = document.getElementById('modalFooter');
  const modalTitle  = document.getElementById('modalTitle');
  const profileModal       = document.getElementById('profileModal');
  const profileModalBody   = document.getElementById('profileModalBody');
  const profileModalFooter = document.getElementById('profileModalFooter');
  const profileModalTitle  = document.getElementById('profileModalTitle');

  /* ─── HELPERS ────────────────────────────────────────────── */
  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = String(str || '');
    return d.innerHTML;
  }

  function showLoading(container) {
    const ov = document.createElement('div');
    ov.className = 'loading-overlay';
    ov.id = 'loadingOverlay';
    ov.innerHTML = '<div class="loading-spinner"></div>';
    container.style.position = 'relative';
    container.appendChild(ov);
  }

  function hideLoading(container) {
    const ov = container.querySelector('#loadingOverlay');
    if (ov) ov.remove();
  }

  /* ─── INTRO SEQUENCE ────────────────────────────────────── */
  function initIntroSequence() {
    const overlay = document.getElementById('introOverlay');
    if (!overlay) return;

    const hasSeenIntro = window.sessionStorage && sessionStorage.getItem('swapifyIntroSeen') === '1';
    if (hasSeenIntro) {
      overlay.remove();
      return;
    }

    const content = document.getElementById('introContent');
    const typingEl = document.getElementById('introTyping');
    const button = document.getElementById('introButton');
    let isActive = true;

    if (window.sessionStorage) {
      sessionStorage.setItem('swapifyIntroSeen', '1');
    }

    document.body.classList.add('intro-lock');

    function wait(ms) {
      return new Promise(function (resolve) {
        setTimeout(resolve, ms);
      });
    }

    function typeText(text, speed) {
      return new Promise(function (resolve) {
        if (!typingEl || !isActive) return resolve();
        let index = 1;
        function step() {
          if (!isActive) return resolve();
          typingEl.textContent = text.slice(0, index);
          if (index < text.length) {
            index += 1;
            setTimeout(step, speed);
          } else {
            resolve();
          }
        }
        step();
      });
    }

    function deleteText(speed) {
      return new Promise(function (resolve) {
        if (!typingEl || !isActive) return resolve();
        let index = typingEl.textContent.length;
        function step() {
          if (!isActive) return resolve();
          if (index <= 0) {
            typingEl.textContent = '';
            return resolve();
          }
          typingEl.textContent = typingEl.textContent.slice(0, index - 1);
          index -= 1;
          setTimeout(step, speed);
        }
        step();
      });
    }

    function endIntro() {
      if (!isActive) return;
      isActive = false;
      overlay.classList.add('is-hidden');
      document.body.classList.remove('intro-lock');
      setTimeout(function () {
        overlay.remove();
      }, 600);
    }

    if (button) {
      button.addEventListener('click', endIntro);
    }

    (async function runSequence() {
      await wait(5000);
      if (!isActive) return;
      overlay.classList.add('is-blurred');
      if (content) content.classList.add('is-visible');
      await typeText('Welcome to Swapify.', 65);
      await wait(500);
      await deleteText(35);
      await wait(250);
      await typeText('Swap What You Have. Learn What You Want.', 50);
      if (button) {
        button.classList.add('is-visible');
        button.focus();
      }
    })();
  }

  /* ─── RENDER RECOMMENDED CARDS (exactly 4) ───────────────── */
  function renderRecommendedCards() {
    if (!grid) return;

    const fragment = document.createDocumentFragment();
    const four = swapItems.slice(0, 4);

    four.forEach(function (item, idx) {
      const owner = users[item.ownerId];
      if (!owner) { console.error('Invalid owner for item', item.id); return; }

      const delay = ['','fade-in-delay-1','fade-in-delay-2','fade-in-delay-3'][idx] || '';
      const priceRow = item.price
        ? `<div class="flex justify-between items-center" style="margin-bottom:4px">
             <span></span>
             <div style="text-align:right">
               <span class="text-xs line-through" style="color:var(--muted-fg)">$${item.originalPrice}</span><br>
               <span class="font-bold" style="color:var(--success)">$${item.price}</span>
             </div>
           </div>`
        : '';

      const card = document.createElement('div');
      card.className = `item-card scroll-stack-card fade-in ${delay}`;
      card.setAttribute('data-item-id', item.id);
      card.setAttribute('role', 'listitem');
      card.innerHTML = `
        <div class="item-card-img">
          <img class="card-img" src="${escHtml(item.image)}" alt="${escHtml(item.title)}" loading="lazy">
          <div class="item-card-badges"><span class="badge ${escHtml(item.badgeClass)}">${escHtml(item.badge)}</span></div>
          <button class="item-card-fav" aria-label="Add ${escHtml(item.title)} to favorites" data-fav-id="${escHtml(item.id)}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </button>
        </div>
        <div class="item-card-body">
          <h3 class="item-card-title">${escHtml(item.title)}</h3>
          ${priceRow}
          <div class="item-card-meta">
            <span>${escHtml(item.condition)}</span><span>•</span>
            <span class="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              ${escHtml(item.distance)}
            </span>
          </div>
          <div class="item-card-footer">
            <div class="item-card-owner">
              <img src="${escHtml(owner.avatar)}" alt="${escHtml(owner.name)}">
              <span>${escHtml(owner.name)}</span>
            </div>
            <div class="item-card-rating">
              <svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              ${item.cachedRating.toFixed(1)}
            </div>
          </div>
          <button class="btn btn-primary w-full explore-btn" data-item-id="${escHtml(item.id)}" aria-label="Explore ${escHtml(item.title)}">
            Explore
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
        </div>`;

      fragment.appendChild(card);
    });

    grid.innerHTML = '';
    grid.appendChild(fragment);

    /* Trigger fade-in via IntersectionObserver (already set in app.js) */
    setTimeout(function () {
      grid.querySelectorAll('.fade-in').forEach(function (el) {
        el.classList.add('visible');
      });
    }, 80);
  }

  /* ─── RECOMMENDED SCROLL STACK ──────────────────────────── */
  function initRecommendedScrollStack() {
    const scroller = document.getElementById('recommendedScroller');
    if (!grid || !scroller) return;

    if (scrollStackCleanup) {
      scrollStackCleanup();
      scrollStackCleanup = null;
    }

    const cards = Array.from(grid.querySelectorAll('.scroll-stack-card'));
    const endElement = scroller.querySelector('.scroll-stack-end');
    if (!cards.length || !endElement) return;

    const itemDistance = 55;
    const itemScale = 0.02;
    const itemStackDistance = 6;
    const stackPosition = '20%';
    const scaleEndPosition = '0%';
    const baseScale = 0.94;
    const rotationAmount = 0;
    const blurAmount = 0;
    const currentTransforms = new Map();
    const transformLerp = 1;
    let isUpdating = false;

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function smoothstep(t) {
      const x = Math.max(0, Math.min(1, t));
      return x * x * (3 - 2 * x);
    }

    function calculateProgress(scrollTop, start, end) {
      if (scrollTop < start) return 0;
      if (scrollTop > end) return 1;
      return (scrollTop - start) / (end - start);
    }

    function parsePercentage(value, containerHeight) {
      if (typeof value === 'string' && value.indexOf('%') !== -1) {
        return (parseFloat(value) / 100) * containerHeight;
      }
      return parseFloat(value);
    }

    function getElementOffset(element) {
      return element.offsetTop;
    }

    cards.forEach(function (card, i) {
      if (i < cards.length - 1) {
        card.style.marginBottom = itemDistance + 'px';
      }
      card.style.willChange = 'transform, filter';
      card.style.transformOrigin = 'top center';
      card.style.backfaceVisibility = 'hidden';
      card.style.transform = 'translateZ(0)';
      card.style.webkitTransform = 'translateZ(0)';
      card.style.perspective = '1000px';
      card.style.webkitPerspective = '1000px';
    });

    function updateCardTransforms() {
      if (!cards.length || isUpdating) return;
      isUpdating = true;

      const scrollTop = scroller.scrollTop;
      const containerHeight = scroller.clientHeight;
      const stackPositionPx = parsePercentage(stackPosition, containerHeight);
      const scaleEndPositionPx = parsePercentage(scaleEndPosition, containerHeight);
      const endElementTop = getElementOffset(endElement);

      cards.forEach(function (card, i) {
        const cardTop = getElementOffset(card);
        const triggerStart = cardTop - stackPositionPx - itemStackDistance * i;
        const triggerEnd = cardTop - scaleEndPositionPx;
        const pinStart = cardTop - stackPositionPx - itemStackDistance * i;
        const pinEnd = endElementTop - containerHeight / 2;

        const scaleProgress = smoothstep(calculateProgress(scrollTop, triggerStart, triggerEnd));
        const targetScale = baseScale + i * itemScale;
        const scale = 1 - scaleProgress * (1 - targetScale);
        const rotation = rotationAmount ? i * rotationAmount * scaleProgress : 0;

        let blur = 0;
        if (blurAmount) {
          let topCardIndex = 0;
          for (let j = 0; j < cards.length; j++) {
            const jCardTop = getElementOffset(cards[j]);
            const jTriggerStart = jCardTop - stackPositionPx - itemStackDistance * j;
            if (scrollTop >= jTriggerStart) topCardIndex = j;
          }
          if (i < topCardIndex) {
            const depthInStack = topCardIndex - i;
            blur = Math.max(0, depthInStack * blurAmount);
          }
        }

        let translateY = 0;
        const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;

        if (isPinned) {
          translateY = scrollTop - cardTop + stackPositionPx + itemStackDistance * i;
        } else if (scrollTop > pinEnd) {
          translateY = pinEnd - cardTop + stackPositionPx + itemStackDistance * i;
        }

        const target = {
          translateY: translateY,
          scale: scale,
          rotation: rotation,
          blur: blur
        };

        const current = currentTransforms.get(i);
        const next = current
          ? {
              translateY: lerp(current.translateY, target.translateY, transformLerp),
              scale: lerp(current.scale, target.scale, transformLerp),
              rotation: lerp(current.rotation, target.rotation, transformLerp),
              blur: lerp(current.blur, target.blur, transformLerp)
            }
          : target;

        currentTransforms.set(i, next);

        const transform = 'translate3d(0, ' + next.translateY + 'px, 0) scale(' + next.scale + ') rotate(' + next.rotation + 'deg)';
        const filter = next.blur > 0 ? 'blur(' + next.blur + 'px)' : '';
        card.style.transform = transform;
        card.style.filter = filter;
      });

      isUpdating = false;
    }

    let rafPending = false;
    function handleScroll() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(function () {
        updateCardTransforms();
        rafPending = false;
      });
    }

    let lenis = null;
    let lenisRafId = null;

    if (window.Lenis) {
      lenis = new window.Lenis({
        wrapper: scroller,
        content: scroller.querySelector('.scroll-stack-inner'),
        duration: 1.05,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true,
        touchMultiplier: 2,
        infinite: false,
        gestureOrientationHandler: true,
        normalizeWheel: true,
        wheelMultiplier: 1,
        touchInertiaMultiplier: 35,
        lerp: 0.15,
        syncTouch: true,
        syncTouchLerp: 0.15,
        touchInertia: 0.6
      });

      const raf = function (time) {
        lenis.raf(time);
        updateCardTransforms();
        lenisRafId = requestAnimationFrame(raf);
      };
      lenisRafId = requestAnimationFrame(raf);
    } else {
      scroller.addEventListener('scroll', handleScroll, { passive: true });
    }

    window.addEventListener('resize', handleScroll);
    handleScroll();

    scrollStackCleanup = function () {
      if (lenisRafId) cancelAnimationFrame(lenisRafId);
      if (lenis) lenis.destroy();
      if (!lenis) scroller.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);

      cards.forEach(function (card) {
        card.style.marginBottom = '';
        card.style.transform = '';
        card.style.filter = '';
        card.style.willChange = '';
        card.style.transformOrigin = '';
        card.style.backfaceVisibility = '';
        card.style.webkitTransform = '';
        card.style.perspective = '';
        card.style.webkitPerspective = '';
      });
      currentTransforms.clear();
    };
  }

  /* ─── OPEN ITEM MODAL ────────────────────────────────────── */
  function openItemModal(itemId) {
    const item = swapItems.find(function (i) { return i.id === itemId; });

    if (!item) {
      showItemNotFound();
      return;
    }

    const owner = users[item.ownerId];
    if (!item || !owner) {
      console.error('Missing item or owner data', itemId);
      showItemNotFound();
      return;
    }

    state.selectedItem = item;
    modalTitle.textContent = item.title;

    const wantedHtml = item.wantedFor
      ? `<div class="modal-item-wanted">
           <div class="label">Looking to swap for</div>
           <div class="value">${escHtml(item.wantedFor)}</div>
         </div>`
      : '';

    const priceHtml = item.price
      ? `<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
           <span style="font-size:28px;font-weight:700;color:var(--success)">$${item.price}</span>
           <span style="text-decoration:line-through;color:var(--muted-fg);font-size:16px">$${item.originalPrice}</span>
           <span class="badge badge-success">50% OFF</span>
         </div>`
      : '';

    modalBody.innerHTML = `
      <img class="modal-item-img" src="${escHtml(item.image)}" alt="${escHtml(item.title)}">
      <div class="modal-item-badges">
        <span class="badge ${escHtml(item.badgeClass)}">${escHtml(item.badge)}</span>
        <span class="badge badge-outline">${escHtml(item.category)}</span>
      </div>
      ${priceHtml}
      <div class="modal-item-meta">
        <span>⭐ ${item.cachedRating.toFixed(1)}</span>
        <span>📍 ${escHtml(item.distance)}</span>
        <span>🕐 ${escHtml(item.postedAt)}</span>
        <span>🏷️ ${escHtml(item.condition)}</span>
      </div>
      <p class="modal-item-desc">${escHtml(item.description)}</p>
      ${wantedHtml}
      <div class="modal-owner-row" id="modalOwnerRow" data-user-id="${escHtml(owner.id)}" tabindex="0" role="button" aria-label="View ${escHtml(owner.name)}'s profile">
        <img src="${escHtml(owner.avatar)}" alt="${escHtml(owner.name)}">
        <div class="modal-owner-info">
          <h4>${escHtml(owner.name)}</h4>
          <p>${escHtml(owner.location)}</p>
          ${owner.online ? '<span class="modal-owner-online">Online now</span>' : ''}
        </div>
      </div>`;

    modalFooter.innerHTML = `
      <button class="btn btn-outline" id="modalCancelBtn">Cancel</button>
      <a href="/messages?partner=${encodeURIComponent(owner.id)}" class="btn btn-primary" aria-label="Message ${escHtml(owner.name)}">
        Message ${escHtml(owner.name)}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/></svg>
      </a>`;

    /* Owner row → open profile */
    const ownerRow = document.getElementById('modalOwnerRow');
    if (ownerRow) {
      ownerRow.addEventListener('click', function () {
        closeModal(itemModal);
        openProfileModal(owner.id);
      });
      ownerRow.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ownerRow.click(); }
      });
    }

    const cancelBtn = document.getElementById('modalCancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', function () { closeModal(itemModal); });

    showModal(itemModal);
  }

  function showItemNotFound() {
    modalTitle.textContent = 'Oops!';
    modalBody.innerHTML = `
      <div class="error-state">
        <div class="error-state-icon">🔍</div>
        <h3>Item not found</h3>
        <p>This item may have been removed or the link is outdated.</p>
        <button class="btn btn-primary" id="errorBackBtn">Back to Home</button>
      </div>`;
    modalFooter.innerHTML = '';
    showModal(itemModal);
    const backBtn = document.getElementById('errorBackBtn');
    if (backBtn) backBtn.addEventListener('click', function () { closeModal(itemModal); });
  }

  /* ─── OPEN PROFILE MODAL ─────────────────────────────────── */
  function openProfileModal(userId) {
    if (userId === 'community') return;
    window.location.href = '/profile?id=' + encodeURIComponent(userId);
  }

  /* ─── MODAL HELPERS ──────────────────────────────────────── */
  function showModal(overlay) {
    if (!overlay) return;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    overlay.focus && overlay.focus();
  }
  function closeModal(overlay) {
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  /* ─── RENDER ACTIVITY FEED ───────────────────────────────── */
  function renderActivity(idx) {
    if (!feedEl) return;
    const act = activities[idx];
    if (!act) return;

    const u1 = users[act.userId1];
    const u2 = users[act.userId2];
    if (!u1 || !u2) return;

    feedEl.innerHTML = `
      <div class="activity-card fade-in visible" role="article" aria-label="${escHtml(u1.name)} and ${escHtml(u2.name)} activity">
        <img src="${escHtml(u1.avatar)}" alt="${escHtml(u1.name)}">
        <div class="activity-card-content">
          <p>
            <span class="activity-user-name">${escHtml(u1.name)}</span>
            just swapped a
            <span class="activity-item-name">${escHtml(act.item1)}</span>
            for a
            <span class="activity-item-name">${escHtml(act.item2)}</span>
            with
            <span class="activity-user-name">${escHtml(u2.name)}</span>!
          </p>
          <p class="time">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${escHtml(act.time)} in ${escHtml(act.location)}
          </p>
        </div>
      </div>`;

    /* nav dots */
    const dotsHtml = activities.map(function (_, i) {
      return `<button class="activity-dot ${i === idx ? 'active' : ''}" data-activity-idx="${i}" aria-label="Activity ${i + 1}"></button>`;
    }).join('');

    let nav = document.getElementById('activityNav');
    if (!nav) {
      nav = document.createElement('div');
      nav.className = 'activity-nav';
      nav.id = 'activityNav';
      feedEl.parentElement.appendChild(nav);
    }
    nav.innerHTML = dotsHtml;
  }

  function startActivityRotation() {
    renderActivity(state.currentActivityIdx);
    state.activityTimer = setInterval(function () {
      state.currentActivityIdx = (state.currentActivityIdx + 1) % activities.length;
      renderActivity(state.currentActivityIdx);
    }, 4000);
  }

  /* ─── EVENT DELEGATION ───────────────────────────────────── */
  function bindEvents() {
    /* Recommended grid — Explore button & card clicks */
    if (grid) {
      grid.addEventListener('click', function (e) {
        /* Favourite button */
        const favBtn = e.target.closest('.item-card-fav');
        if (favBtn) {
          e.stopPropagation();
          const itemId = favBtn.dataset.favId;
          if (!itemId) return;
          favBtn.classList.toggle('active');
          favBtn.classList.add('heart-pop');
          setTimeout(function () { favBtn.classList.remove('heart-pop'); }, 300);
          if (window.SwapifyUI) window.SwapifyUI.toast(favBtn.classList.contains('active') ? 'Added to favorites ❤️' : 'Removed from favorites', favBtn.classList.contains('active') ? 'success' : 'info');
          return;
        }
        /* Explore button */
        const exploreBtn = e.target.closest('.explore-btn');
        if (exploreBtn) {
          e.stopPropagation();
          const itemId = exploreBtn.dataset.itemId;
          showLoadingThenOpen(itemId);
          return;
        }
        /* Card title link */
        const card = e.target.closest('.item-card');
        if (card) {
          const itemId = card.dataset.itemId;
          if (itemId) showLoadingThenOpen(itemId);
        }
      });
    }

    /* Activity feed is informational only — clicks disabled */

    /* Activity dot nav disabled — feed is informational only */

    /* Close modals on overlay click */
    if (itemModal) {
      itemModal.addEventListener('click', function (e) {
        if (e.target === itemModal) closeModal(itemModal);
      });
    }
    if (profileModal) {
      profileModal.addEventListener('click', function (e) {
        if (e.target === profileModal) closeModal(profileModal);
      });
    }

    /* Close buttons */
    const closeBtn = document.getElementById('modalCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', function () { closeModal(itemModal); });

    const profCloseBtn = document.getElementById('profileModalCloseBtn');
    if (profCloseBtn) profCloseBtn.addEventListener('click', function () { closeModal(profileModal); });

    /* Keyboard ESC */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeModal(itemModal);
        closeModal(profileModal);
      }
    });
  }

  /* Loading shimmer then open modal */
  function showLoadingThenOpen(itemId) {
    const card = grid ? grid.querySelector(`[data-item-id="${itemId}"]`) : null;
    if (card) showLoading(card);
    setTimeout(function () {
      if (card) hideLoading(card);
      openItemModal(itemId);
    }, 450);
  }

  window.SwapifyData = {
    swapItems: swapItems || [],
    users: users || {}
  };

  window.showItemModal = function(itemId) {
    if (typeof openItemModal === 'function') {
      openItemModal(itemId);
    } else {
      console.warn("Modal trigger target missing.");
    }
  };

  /* ─── INIT ───────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    initIntroSequence();
    renderRecommendedCards();
    initRecommendedScrollStack();
    bindEvents();
    /* Small delay so skeleton is visible for a moment */
    setTimeout(startActivityRotation, 600);
  });

})();
