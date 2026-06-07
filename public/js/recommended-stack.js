// React, ReactDOM, and htm are loaded as UMD globals from CDN before this file.
(function () {
  const { useEffect, useRef, useState } = React;
  const { createRoot } = ReactDOM;
  const html = htm.bind(React.createElement);

  function RecommendedWheel() {
    const [cards, setCards]           = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);
    const [activeDot, setActiveDot]   = useState(0);
    const [toast, setToast]           = useState(null);

    const wheelRef                = useRef(null);
    const currentProgressRef      = useRef(0);
    const targetProgressRef       = useRef(0);
    const isDraggingRef           = useRef(false);
    const isInteractingRef        = useRef(false);
    const interactionTimeoutRef   = useRef(null);
    const startXRef               = useRef(0);
    const dragStartProgressRef    = useRef(0);

    useEffect(() => {
      fetch('/api/recommended')
        .then(r => r.json())
        .then(data => setCards(data.items || []))
        .catch(() => setCards([]));
    }, []);

    const cardCount = cards.length;
    const lerpSpeed = 0.085;

    useEffect(() => {
      let animationFrameId;

      const updateCards = () => {
        if (!wheelRef.current || cardCount === 0) return;
        const cards = wheelRef.current.children;
        const width = window.innerWidth;

        let radius = 340;
        if (width < 640) radius = 180;
        else if (width < 1024) radius = 260;

        const currentProgress = currentProgressRef.current;

        for (let i = 0; i < cardCount; i++) {
          const card = cards[i];
          if (!card) continue;

          const theta = (i - currentProgress) * (2 * Math.PI / cardCount);
          const x = Math.sin(theta) * radius;
          const z = Math.cos(theta) * radius;

          const normalizedZ = (z + radius) / (2 * radius);
          const scale = 0.70 + (0.30 * normalizedZ);
          const opacity = 0.20 + (0.80 * Math.pow(normalizedZ, 1.5));
          const zIndex = Math.round(normalizedZ * 100);

          card.style.transform = `translateX(${x}px) translateZ(${z}px) scale(${scale}) rotateY(0deg)`;
          card.style.opacity = opacity;
          card.style.zIndex = zIndex;

          if (normalizedZ < 0.75) {
            card.classList.add('pointer-events-none');
          } else {
            card.classList.remove('pointer-events-none');
          }
        }

        const activeIndex = ((Math.round(currentProgress) % cardCount) + cardCount) % cardCount;
        setActiveDot(activeIndex);
      };

      const physicsLoop = () => {
        currentProgressRef.current += (targetProgressRef.current - currentProgressRef.current) * lerpSpeed;
        updateCards();
        animationFrameId = requestAnimationFrame(physicsLoop);
      };

      animationFrameId = requestAnimationFrame(physicsLoop);

      const autoPlayInterval = setInterval(() => {
        if (!isInteractingRef.current && !isDraggingRef.current) {
          targetProgressRef.current += 1;
        }
      }, 4000);

      window.addEventListener('resize', updateCards);

      return () => {
        cancelAnimationFrame(animationFrameId);
        clearInterval(autoPlayInterval);
        window.removeEventListener('resize', updateCards);
      };
    }, [cardCount]);

    const resetInteractionTimer = () => {
      isInteractingRef.current = true;
      clearTimeout(interactionTimeoutRef.current);
      interactionTimeoutRef.current = setTimeout(() => {
        isInteractingRef.current = false;
      }, 10000);
    };

    const handlePrev = () => { targetProgressRef.current -= 1; resetInteractionTimer(); };
    const handleNext = () => { targetProgressRef.current += 1; resetInteractionTimer(); };

    const handleDotClick = (index) => {
      const currentModulo = ((Math.round(targetProgressRef.current) % cardCount) + cardCount) % cardCount;
      let diff = index - currentModulo;
      if (diff > cardCount / 2) diff -= cardCount;
      if (diff < -cardCount / 2) diff += cardCount;
      targetProgressRef.current += diff;
      resetInteractionTimer();
    };

    const handleDragStart = (e) => {
      isDraggingRef.current = true;
      isInteractingRef.current = true;
      startXRef.current = e.pageX || (e.touches && e.touches[0].pageX);
      dragStartProgressRef.current = targetProgressRef.current;
    };

    const handleDragMove = (e) => {
      if (!isDraggingRef.current) return;
      const x = e.pageX || (e.touches && e.touches[0].pageX);
      const dragDistance = x - startXRef.current;
      const sensitivity = window.innerWidth < 640 ? 150 : 280;
      targetProgressRef.current = dragStartProgressRef.current + (-dragDistance / sensitivity);
    };

    const handleDragEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      targetProgressRef.current = Math.round(targetProgressRef.current);
      resetInteractionTimer();
    };

    const handleCardClick = (e, card, index) => {
      const indexDiff = Math.round(targetProgressRef.current) - index;
      const normalizedDiff = ((indexDiff % cardCount) + cardCount) % cardCount;

      if (normalizedDiff !== 0) {
        e.preventDefault();
        let targetOffset = -indexDiff;
        if (Math.abs(targetOffset) > cardCount / 2) {
          targetOffset = targetOffset > 0 ? targetOffset - cardCount : targetOffset + cardCount;
        }
        targetProgressRef.current += targetOffset;
        resetInteractionTimer();
      } else {
        setSelectedCard(card);
      }
    };

    return html`
      <div className="w-full">
        <div className="relative w-full h-[350px] flex items-center justify-center overflow-visible my-4">

          <div className="absolute w-[280px] h-[280px] sm:w-[400px] sm:h-[400px] border border-dashed border-violet-500/10 rounded-full z-0 pointer-events-none animate-spin-slow"></div>

          <div
            ref=${wheelRef}
            className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing overflow-visible z-10"
            style=${{ perspective: '1200px' }}
            onMouseDown=${handleDragStart}
            onMouseMove=${handleDragMove}
            onMouseUp=${handleDragEnd}
            onMouseLeave=${handleDragEnd}
            onTouchStart=${handleDragStart}
            onTouchMove=${handleDragMove}
            onTouchEnd=${handleDragEnd}
          >
            ${cards.map((card, idx) => html`
              <div
                key=${card.id}
                onClick=${(e) => handleCardClick(e, card, idx)}
                className="absolute w-[240px] sm:w-[270px] h-[290px] rounded-xl overflow-hidden bg-slate-800/70 backdrop-blur-md border border-slate-700/50 hover:border-violet-500/50 hover:shadow-2xl transition-shadow duration-300 pointer-events-auto cursor-pointer flex flex-col select-none"
                style=${{ transformStyle: 'preserve-3d' }}
              >
                <div className="relative w-full h-[120px] overflow-hidden">
                  <img src=${card.image} alt=${card.title} className="w-full h-full object-cover pointer-events-none" />
                  <div className="absolute top-2 left-2 bg-violet-600/95 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                    ${card.category}
                  </div>
                  <div className="absolute bottom-2 right-2 bg-slate-900/85 text-white text-[9px] px-2 py-0.5 rounded-full">
                    📍 ${card.distance}
                  </div>
                </div>

                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400 font-medium">
                      ${card.ownerImg
                        ? html`<img src=${card.ownerImg} alt=${card.owner} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />`
                        : html`<div className="w-4 h-4 rounded-full bg-violet-500/20 flex items-center justify-center text-[8px] text-violet-300 font-bold flex-shrink-0">
                            ${card.owner.charAt(0).toUpperCase()}
                          </div>`
                      }
                      ${card.owner}
                    </div>
                    <h3 className="text-sm font-bold text-white tracking-wide line-clamp-1">${card.title}</h3>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">${card.desc}</p>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-emerald-400">${card.value}</span>
                    <button
                      onClick=${(e) => { e.stopPropagation(); window.location.href = '/item-details/' + card.id; }}
                      className="bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-md transition-colors"
                    >
                      Deal ➜
                    </button>
                  </div>
                </div>
              </div>
            `)}
          </div>

          <button onClick=${handlePrev} className="absolute left-2 z-20 w-10 h-10 rounded-full flex items-center justify-center bg-violet-500/10 border border-violet-500/30 text-white hover:bg-violet-500/30 transition-all">
            ◀
          </button>
          <button onClick=${handleNext} className="absolute right-2 z-20 w-10 h-10 rounded-full flex items-center justify-center bg-violet-500/10 border border-violet-500/30 text-white hover:bg-violet-500/30 transition-all">
            ▶
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 mt-3">
          <div className="flex gap-2">
            ${cards.map((_, idx) => html`
              <button
                key=${idx}
                onClick=${() => handleDotClick(idx)}
                className=${`transition-all duration-300 ${activeDot === idx ? 'w-6 h-2 bg-violet-500' : 'w-2 h-2 bg-slate-600 hover:bg-violet-400'} rounded-full`}
              />
            `)}
          </div>
          <p className="text-[11px] text-slate-500">
            Swipe, drag, or use arrows to spin the wheel
          </p>
        </div>
      </div>
    `;
  }

  const checkDataInterval = setInterval(() => {
    if (document.getElementById('recommended-react-root')) {
      clearInterval(checkDataInterval);
      const root = createRoot(document.getElementById('recommended-react-root'));
      root.render(html`<${RecommendedWheel} />`);
    }
  }, 50);
})();
