/* Buy calculator (hero). Behaviour ported from the "buy" prototype, variant D (Jy-designs/buy):
   euro amount with ± steppers, crypto dropdown with search, estimated amount, "what if the price changes" slider
   with a future price field, and what the crypto would be worth.
   Live EUR prices come from Kraken's public Ticker endpoint (no API key, CORS enabled). */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = $('#calc');
  if (!root) return;

  // ---------------------------------------------------------------- coins
  // keys = the result keys Kraken may return for each pair. fallback = reference price used if Kraken can't be reached.
  const COINS = [
    { sym: 'BTC',  name: 'Bitcoin',      pair: 'XBTEUR',  keys: ['XXBTZEUR', 'XBTEUR'], icon: 'assets/calc-btc-icon.svg', coin: 'assets/calc-coin-btc.png', cta: 'assets/cta-btc.svg', fallback: 67098.40 },
    { sym: 'ETH',  name: 'Ethereum',     pair: 'ETHEUR',  keys: ['XETHZEUR', 'ETHEUR'], coin: 'assets/coins3d/eth.png',  fallback: 1884.43 },
    { sym: 'LINK', name: 'Chainlink',    pair: 'LINKEUR', keys: ['LINKEUR'], coin: 'assets/coins3d/link.png', fallback: 9.50 },
    { sym: 'AAVE', name: 'Aave',         pair: 'AAVEEUR', keys: ['AAVEEUR'], coin: 'assets/coins3d/aave.png', fallback: 112.27 },
    { sym: 'UNI',  name: 'Uniswap',      pair: 'UNIEUR',  keys: ['UNIEUR'],  coin: 'assets/coins3d/uni.png',  fallback: 5.97 },
    { sym: 'TRX',  name: 'TRON',         pair: 'TRXEUR',  keys: ['TRXEUR'],  coin: 'assets/coins3d/trx.png',  fallback: 0.285101 },
    { sym: 'POL',  name: 'Polygon',      pair: 'POLEUR',  keys: ['POLEUR'],  coin: 'assets/coins3d/pol.png',  fallback: 0.19 },
    { sym: 'COMP', name: 'Compound',     pair: 'COMPEUR', keys: ['COMPEUR'], coin: 'assets/coins3d/comp.png', fallback: 36.5 },
    { sym: 'MANA', name: 'Decentraland', pair: 'MANAEUR', keys: ['MANAEUR'], coin: 'assets/coins3d/mana.png', fallback: 0.24 },
    { sym: 'SAND', name: 'The Sandbox',  pair: 'SANDEUR', keys: ['SANDEUR'], coin: 'assets/coins3d/sand.png', fallback: 0.22 },
  ];
  const KRAKEN_URL = 'https://api.kraken.com/0/public/Ticker?pair=' + COINS.map(c => c.pair).join(',');
  const REFRESH_MS = 30000;
  const MAX_INVEST = 1000000;
  const RANGE = 100; // the slider goes from −100% to +100%

  const state = { coin: COINS[0], invest: 100, pct: 0, prices: {}, updatedAt: null, live: false };

  // ---------------------------------------------------------------- formatting
  const eur = (v, forceCents) => {
    const cents = forceCents || Math.round(v * 100) % 100 !== 0;
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 }).format(v);
  };
  const eurRate = v => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: v < 1 ? 6 : 2 }).format(v);
  const qty = v => {
    if (!isFinite(v) || v === 0) return '0';
    if (v >= 1000) return v.toLocaleString('en-GB', { maximumFractionDigits: 2 });
    if (v >= 1) return v.toLocaleString('en-GB', { maximumFractionDigits: 4 });
    const decimals = Math.max(6, -Math.floor(Math.log10(v)) + 2); // small amounts keep 3 significant figures
    return v.toFixed(Math.min(decimals, 10));
  };
  const priceNum = v => v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: v < 1 ? 6 : 2 });
  const signed = v => (v > 0 ? '+' : v < 0 ? '−' : '+') + '€' + Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pctLabel = p => (p > 0 ? '+' : p < 0 ? '−' : '+') + Math.abs(p) + '%';
  const updatedLabel = d => 'Last updated: ' + new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid', timeZoneName: 'short',
  }).format(d).replace(/ at /, ', ');
  const clampPct = p => Math.max(-RANGE, Math.min(RANGE, p));

  // ---------------------------------------------------------------- elements
  const el = {
    invest: $('#invest'), investBox: $('[data-role="investBox"]', root),
    future: $('#future'), futureBox: $('[data-role="futureBox"]', root),
    receive: $('#receive'), receiveCoin: $('#receive-coin'),
    worth: $('#worth'), gain: $('#gain'), ref: $('#ref'), updated: $('#updated'),
    slider: $('#slider'), knob: $('#knob'), fill: $('#fill'), tagText: $('#tag-text'), tick: $('#tick'),
    select: $('#select'), selectBtn: $('#select-btn'), panel: $('#select-panel'), list: $('#coin-list'), search: $('#search'), empty: $('#select-empty'),
    selIcon: $('#select-icon'), selName: $('#select-name'), ctaText: $('#cta-text'), ctaIcon: $('#cta-icon'),
  };

  // ---------------------------------------------------------------- prices (Kraken, with reference fallback)
  async function fetchPrices() {
    try {
      const res = await fetch(KRAKEN_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (json.error && json.error.length) throw new Error(json.error.join(', '));
      for (const c of COINS) {
        const k = c.keys.find(key => json.result[key]);
        if (k) state.prices[c.sym] = parseFloat(json.result[k].c[0]); // c[0] = last trade price
      }
      state.updatedAt = new Date();
      state.live = true;
    } catch (err) {
      console.warn('Kraken price fetch failed, using reference prices:', err);
      if (!state.live) COINS.forEach(c => { if (!state.prices[c.sym]) state.prices[c.sym] = c.fallback; });
    }
    updateRates();
    updateOptionPrices();
  }

  // ---------------------------------------------------------------- updates
  function updateRates() {
    const c = state.coin, p = state.prices[c.sym];
    if (p) el.receive.textContent = qty(state.invest / p) + ' ' + c.sym;
    else el.receive.innerHTML = '<span class="skeleton">0.000000 ' + c.sym + '</span>';
    el.ref.textContent = p ? '1 ' + c.sym + ' = ' + eurRate(p) + ' | Fees excluded.' : 'loading live price…';
    el.updated.textContent = state.live && state.updatedAt ? updatedLabel(state.updatedAt) : (p ? 'Reference prices: live prices are unavailable right now.' : 'Last updated: –');
    updateMove();
  }

  // everything that depends on the % move: slider, future price, worth and gain
  function updateMove() {
    const pct = state.pct, worth = state.invest * (1 + pct / 100), gain = worth - state.invest;
    const W = el.slider.offsetWidth, half = W / 2;
    const kw = parseFloat(getComputedStyle(el.slider).getPropertyValue('--kw')) || 34;
    const x = half + (pct / RANGE) * (half - kw / 2);
    el.slider.style.setProperty('--x', x + 'px');
    el.fill.style.left = Math.min(x, half) + 'px';
    el.fill.style.width = Math.abs(x - half) + 'px';
    el.tagText.textContent = pctLabel(pct);
    el.knob.setAttribute('aria-valuenow', pct);
    el.knob.setAttribute('aria-valuetext', pctLabel(pct));
    const p = state.prices[state.coin.sym];
    if (document.activeElement !== el.future) el.future.value = p ? priceNum(p * (1 + pct / 100)) : '';
    el.worth.textContent = eur(worth, true);
    el.gain.textContent = signed(gain) + ' on your ' + eur(state.invest);
    el.gain.classList.toggle('is-down', gain < 0);
    el.gain.classList.toggle('is-flat', gain === 0);
  }

  function updateInvestField() {
    if (document.activeElement !== el.invest) el.invest.value = state.invest.toLocaleString('en-GB', { maximumFractionDigits: 2 });
    const minus = $('[data-step="invest"][data-dir="-1"]', root);
    minus.disabled = state.invest <= 0;
  }
  function updateAll() { updateInvestField(); updateRates(); }

  function setPct(p, animate) {
    p = clampPct(p);
    if (p === state.pct && !animate) return;
    el.slider.classList.toggle('is-animating', !!animate);
    state.pct = p;
    updateMove();
  }
  function setInvest(v) {
    state.invest = Math.max(0, Math.min(MAX_INVEST, Math.round(v * 100) / 100));
    updateAll();
  }

  // ---------------------------------------------------------------- input helpers
  const parseAmount = s => { const n = parseFloat(String(s).replace(/,/g, '').replace(/[^\d.]/g, '')); return isFinite(n) ? n : 0; };
  const cleanTyping = v => { // digits and one decimal point, max 2 decimals
    v = v.replace(/,/g, '').replace(/[^\d.]/g, '');
    const [i, ...rest] = v.split('.');
    return rest.length ? i + '.' + rest.join('').slice(0, 2) : i;
  };

  // press and hold to repeat: starts after 400ms and speeds up; step(heldMs) does one step and returns false at a limit
  function holdToRepeat(btn, box, step) {
    let timer = 0, started = 0;
    const stop = () => { clearTimeout(timer); timer = 0; box.classList.remove('is-active'); };
    const tick = () => {
      const held = performance.now() - started;
      if (step(held) === false) return stop();
      timer = setTimeout(tick, Math.max(40, 140 - held / 15));
    };
    btn.addEventListener('pointerdown', e => {
      if (e.button !== 0 || btn.disabled) return;
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (_) { /* works without capture */ }
      started = performance.now();
      box.classList.add('is-active');
      step(0);
      timer = setTimeout(tick, 400);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => btn.addEventListener(t, stop));
    btn.addEventListener('click', e => { if (e.detail === 0) step(0); }); // keyboard: one step per press
  }

  // ---------------------------------------------------------------- invest field
  el.invest.addEventListener('input', () => {
    let v = cleanTyping(el.invest.value);
    if (parseFloat(v) > MAX_INVEST) v = String(MAX_INVEST);
    el.invest.value = v;
    state.invest = parseAmount(v);
    updateInvestField(); updateRates();
  });
  el.invest.addEventListener('focus', () => { el.invest.value = String(state.invest || ''); el.invest.select(); });
  el.invest.addEventListener('blur', updateInvestField);
  el.invest.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      setInvest(state.invest + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 100 : 10));
      el.invest.value = String(state.invest);
    }
    if (e.key === 'Enter') el.invest.blur();
  });
  $$('[data-step="invest"]', root).forEach(btn => {
    const dir = +btn.dataset.dir;
    holdToRepeat(btn, el.investBox, held => {
      setInvest(state.invest + dir * (held > 2000 ? 50 : 10));
      return !((dir < 0 && state.invest <= 0) || (dir > 0 && state.invest >= MAX_INVEST));
    });
  });

  // ---------------------------------------------------------------- future price: typing sets the % move; ± steps 1% (5% after 2s)
  el.future.addEventListener('focus', () => el.future.select());
  el.future.addEventListener('input', () => {
    el.future.value = cleanTyping(el.future.value);
    const p = state.prices[state.coin.sym], v = parseAmount(el.future.value);
    if (p && el.future.value !== '') setPct(Math.round((v / p - 1) * 100), false);
  });
  el.future.addEventListener('blur', updateMove); // snap to the 1% step
  el.future.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      setPct(state.pct + (e.key === 'ArrowUp' ? 1 : -1), false);
      el.future.value = priceNum((state.prices[state.coin.sym] || 0) * (1 + state.pct / 100));
    }
    if (e.key === 'Enter') el.future.blur();
  });
  $$('[data-step="future"]', root).forEach(btn => {
    const dir = +btn.dataset.dir;
    holdToRepeat(btn, el.futureBox, held => {
      setPct(state.pct + dir * (held > 2000 ? 5 : 1), false);
      return Math.abs(state.pct) < RANGE;
    });
  });

  // ---------------------------------------------------------------- slider: only the knob drags; the centre dot resets to 0%
  const pctFromClientX = clientX => {
    const r = el.slider.getBoundingClientRect(), half = r.width / 2;
    const kw = parseFloat(getComputedStyle(el.slider).getPropertyValue('--kw')) || 34;
    return clampPct(Math.round(((clientX - r.left - half) / (half - kw / 2)) * RANGE));
  };
  let dragging = false, grabOffset = 0;
  el.knob.addEventListener('pointerdown', e => {
    dragging = true;
    const k = el.knob.getBoundingClientRect();
    grabOffset = e.clientX - (k.left + k.width / 2);
    try { el.knob.setPointerCapture(e.pointerId); } catch (_) { /* fine without capture */ }
    el.slider.classList.remove('is-animating');
    el.slider.classList.add('is-dragging');
  });
  el.knob.addEventListener('pointermove', e => { if (dragging) setPct(pctFromClientX(e.clientX - grabOffset), false); });
  const endDrag = () => { dragging = false; el.slider.classList.remove('is-dragging'); };
  el.knob.addEventListener('pointerup', endDrag);
  el.knob.addEventListener('pointercancel', endDrag);
  el.tick.addEventListener('click', () => setPct(0, true));
  el.knob.addEventListener('keydown', e => {
    const map = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 };
    let p = state.pct;
    if (e.key in map) p += map[e.key] * (e.shiftKey ? 10 : 1);
    else if (e.key === 'Home') p = -RANGE;
    else if (e.key === 'End') p = RANGE;
    else return;
    e.preventDefault();
    setPct(p, true);
  });
  addEventListener('resize', () => updateMove());

  // ---------------------------------------------------------------- crypto dropdown with search
  const iconFor = c => c.icon || c.coin;
  el.list.innerHTML = COINS.map((c, i) => `
    <li class="select__opt" role="option" id="opt-${c.sym}" data-i="${i}" aria-selected="${c === state.coin}">
      <img src="${iconFor(c)}" alt=""><span class="select__label">${c.name}<span class="sym">${c.sym}</span></span><span class="px" data-px="${c.sym}"></span>
    </li>`).join('');
  const opts = $$('.select__opt', el.list);
  let visible = COINS.map((_, i) => i), focusPos = 0;

  function updateOptionPrices() {
    $$('[data-px]', el.list).forEach(px => { const p = state.prices[px.dataset.px]; px.textContent = p ? eurRate(p) : ''; });
  }
  function markFocus() {
    opts.forEach(o => o.classList.remove('is-focus'));
    const o = opts[visible[focusPos]];
    if (!o) return;
    o.classList.add('is-focus');
    // scroll only the list (scrollIntoView would also scroll the page)
    if (o.offsetTop < el.list.scrollTop) el.list.scrollTop = o.offsetTop;
    else if (o.offsetTop + o.offsetHeight > el.list.scrollTop + el.list.clientHeight) el.list.scrollTop = o.offsetTop + o.offsetHeight - el.list.clientHeight;
    el.search.setAttribute('aria-activedescendant', o.id);
  }
  function filter(q) {
    q = q.trim().toLowerCase();
    visible = [];
    COINS.forEach((c, i) => {
      const hit = !q || c.name.toLowerCase().includes(q) || c.sym.toLowerCase().includes(q);
      opts[i].hidden = !hit;
      if (hit) visible.push(i);
    });
    el.empty.hidden = visible.length > 0;
    focusPos = 0;
    markFocus();
  }
  function open(on) {
    el.select.classList.toggle('is-open', on);
    el.selectBtn.setAttribute('aria-expanded', on);
    if (!on) return;
    // the panel opens inside the card, from just under the fields down to the card's bottom padding
    const fields = el.select.closest('.calc__fields');
    el.panel.style.top = (fields.getBoundingClientRect().bottom - root.getBoundingClientRect().top + 8) + 'px';
    el.search.value = '';
    filter('');
    focusPos = Math.max(0, visible.indexOf(COINS.indexOf(state.coin)));
    markFocus();
    el.search.focus({ preventScroll: true });
  }
  function choose(i) {
    const c = COINS[i];
    open(false);
    el.selectBtn.focus({ preventScroll: true });
    if (c === state.coin) return;
    state.coin = c;
    opts.forEach((o, j) => o.setAttribute('aria-selected', j === i));
    el.selIcon.src = iconFor(c);
    el.selName.textContent = c.name;
    el.receiveCoin.classList.add('is-changing');
    setTimeout(() => { el.receiveCoin.src = c.coin; el.receiveCoin.classList.remove('is-changing'); }, 180);
    el.ctaText.textContent = 'Get ' + c.sym;
    el.ctaIcon.src = c.cta || c.coin;
    updateRates();
  }
  el.selectBtn.addEventListener('click', () => open(!el.select.classList.contains('is-open')));
  el.list.addEventListener('click', e => { const o = e.target.closest('.select__opt'); if (o) choose(+o.dataset.i); });
  el.list.addEventListener('mousemove', e => {
    const o = e.target.closest('.select__opt');
    if (o) { const pos = visible.indexOf(+o.dataset.i); if (pos !== focusPos) { focusPos = pos; opts.forEach(x => x.classList.toggle('is-focus', x === o)); } }
  });
  el.search.addEventListener('input', () => filter(el.search.value));
  el.search.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { focusPos = Math.min(visible.length - 1, focusPos + 1); markFocus(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { focusPos = Math.max(0, focusPos - 1); markFocus(); e.preventDefault(); }
    else if (e.key === 'Enter') { if (visible.length) choose(visible[focusPos]); e.preventDefault(); }
    else if (e.key === 'Escape' || e.key === 'Tab') { open(false); el.selectBtn.focus(); }
  });
  document.addEventListener('pointerdown', e => { if (!el.select.contains(e.target)) open(false); });

  // ---------------------------------------------------------------- start
  updateAll();
  fetchPrices();
  setInterval(() => { if (!document.hidden) fetchPrices(); }, REFRESH_MS);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateMove);
})();
