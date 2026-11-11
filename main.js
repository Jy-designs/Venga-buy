/* Page behaviour: nav, scroll reveals, FAQ, banner parallax. The calculator lives in calculator.js. */
(function () {
  'use strict';

  // Where every "Download" / "Get the App" button points. Replace with the app store / smart link.
  var DOWNLOAD_URL = '#download';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  $$('[data-download]').forEach(function (a) { a.setAttribute('href', DOWNLOAD_URL); });

  /* ---------- Intro ---------- */
  var loaded = function () { document.body.classList.add('is-loaded'); };
  requestAnimationFrame(loaded);
  setTimeout(loaded, 120); // also when animation frames are paused (background tab)

  /* ---------- Nav: scrolled state + mobile menu ---------- */
  var nav = $('#nav');
  var burger = $('.nav__burger');
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  }
  burger.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
  $$('.nav__menu a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); burger.focus(); } });
  document.addEventListener('pointerdown', function (e) { if (nav.classList.contains('is-open') && !nav.contains(e.target)) setMenu(false); });

  /* ---------- Scroll: nav state + gentle parallax on the "Ready, buy, Venga!" photo ---------- */
  var banner = $('.banner__card');
  var bannerImg = $('.banner__bg');
  var ticking = false;
  function onScroll() {
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
    if (!reduce && banner) {
      var r = banner.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) {
        var p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        bannerImg.style.setProperty('--py', (p * 60).toFixed(1) + 'px');
      }
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Scroll reveals ---------- */
  // Once an element has revealed, drop the attribute so hover transforms work again.
  function settle(el) {
    var delay = parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0;
    setTimeout(function () { el.removeAttribute('data-reveal'); el.classList.remove('is-in'); }, 1100 + delay * 1000);
  }
  var revealEls = $$('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.removeAttribute('data-reveal'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        settle(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Step cards carousel (tablet and phone): the pager follows the scroll and scrolls to a card ---------- */
  var track = $('#steps');
  var pager = $('#steps-pager');
  if (track && pager) {
    var cards = $$('.stepcard', track);
    var dots = $$('.pager__dot', pager);
    var prev = $('.pager__arrow--prev', pager);
    var next = $('.pager__arrow--next', pager);
    var current = 0;
    var startPad = function () { return parseFloat(getComputedStyle(track).paddingLeft) || 0; };
    var paint = function (i) {
      current = i;
      dots.forEach(function (d, j) { if (j === i) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
      prev.disabled = i === 0;
      next.disabled = i === cards.length - 1;
    };
    var go = function (i) {
      i = Math.max(0, Math.min(cards.length - 1, i));
      track.scrollTo({ left: cards[i].offsetLeft - startPad(), behavior: reduce ? 'auto' : 'smooth' });
      paint(i);
    };
    var sync = function () {
      var max = track.scrollWidth - track.clientWidth;
      if (max <= 0) return;
      if (track.scrollLeft >= max - 4) return paint(cards.length - 1); // the last card can't reach the left edge
      var x = track.scrollLeft + startPad(), best = 0;
      cards.forEach(function (c, j) { if (Math.abs(c.offsetLeft - x) < Math.abs(cards[best].offsetLeft - x)) best = j; });
      paint(best);
    };
    var raf = 0;
    track.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
    track.addEventListener('scrollend', sync);
    prev.addEventListener('click', function () { go(current - 1); });
    next.addEventListener('click', function () { go(current + 1); });
    dots.forEach(function (d, j) { d.addEventListener('click', function () { go(j); }); });
    pager.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
    });
    window.addEventListener('resize', sync);
  }

  /* ---------- FAQ accordion ---------- */
  $$('.qa').forEach(function (qa) {
    var btn = $('.qa__q', qa);
    btn.addEventListener('click', function () {
      var open = !qa.classList.contains('is-open');
      $$('.qa.is-open').forEach(function (o) {
        if (o !== qa) { o.classList.remove('is-open'); $('.qa__q', o).setAttribute('aria-expanded', 'false'); }
      });
      qa.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });
})();
