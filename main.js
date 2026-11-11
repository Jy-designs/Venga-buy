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
