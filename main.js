(function () {
  var root = document.documentElement;

  function readLang() {
    try {
      var saved = localStorage.getItem('lang');
      if (saved === 'fr' || saved === 'en') return saved;
    } catch (e) {}
    var nav = (navigator.language || 'fr').toLowerCase();
    return nav.indexOf('en') === 0 ? 'en' : 'fr';
  }

  function applyLang(lang) {
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);
    var t = root.getAttribute('data-title-' + lang);
    if (t) document.title = t;
    document.querySelectorAll('.lang-toggle').forEach(function (b) {
      b.textContent = lang === 'fr' ? 'EN' : 'FR';
      b.setAttribute('aria-label', lang === 'fr' ? 'Switch to English' : 'Passer en français');
    });
  }

  applyLang(readLang());

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.lang-toggle');
    if (!btn) return;
    var next = root.getAttribute('data-lang') === 'fr' ? 'en' : 'fr';
    try { localStorage.setItem('lang', next); } catch (err) {}
    applyLang(next);
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
  });

  /* Reveal sections and rows once, as they scroll into view */
  var revealables = document.querySelectorAll('.block .wrap > *, .project-row, .timeline li, .case-body section');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealables.forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
  }

  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* Hero: a small K-means that clusters points into four colored segments */
  var canvas = document.getElementById('clusters');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var colors = ['#2EC4B6', '#FF7F6E', '#9FE7DF', '#5B7A8E'];
  var W, H, dpr, points = [], centers = [], t0 = null, mouse = { x: -9999, y: -9999 };

  function rand(a, b) { return a + Math.random() * (b - a); }

  function setup() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var narrow = W < 641;
    var x0 = narrow ? 0.06 : 0.52, x1 = 0.94;
    centers = [
      { x: W * (x0 + (x1 - x0) * 0.25), y: H * 0.3 },
      { x: W * (x0 + (x1 - x0) * 0.78), y: H * 0.26 },
      { x: W * (x0 + (x1 - x0) * 0.62), y: H * 0.72 },
      { x: W * (x0 + (x1 - x0) * 0.15), y: H * 0.74 }
    ];
    var count = narrow ? 70 : 140;
    var spread = Math.min(W, H) * (narrow ? 0.14 : 0.12);
    points = [];
    for (var i = 0; i < count; i++) {
      var k = i % 4;
      var ang = rand(0, Math.PI * 2), r = Math.abs(rand(-1, 1) * rand(0.2, 1)) * spread;
      points.push({
        sx: rand(W * (narrow ? 0 : 0.4), W), sy: rand(0, H),
        tx: centers[k].x + Math.cos(ang) * r, ty: centers[k].y + Math.sin(ang) * r,
        k: k, size: rand(1.6, 3.4), phase: rand(0, Math.PI * 2)
      });
    }
  }

  function ease(x) { return x < 0 ? 0 : x > 1 ? 1 : 1 - Math.pow(1 - x, 3); }

  function draw(ts) {
    if (t0 === null) t0 = ts;
    var elapsed = (ts - t0) / 1000;
    var p = reduce ? 1 : ease((elapsed - 0.4) / 2.6);
    ctx.clearRect(0, 0, W, H);
    for (var c = 0; c < 4; c++) {
      ctx.beginPath();
      ctx.arc(centers[c].x, centers[c].y, 7, 0, Math.PI * 2);
      ctx.strokeStyle = colors[c];
      ctx.globalAlpha = 0.9 * p;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    for (var i = 0; i < points.length; i++) {
      var pt = points[i];
      var wob = reduce ? 0 : Math.sin(elapsed * 0.8 + pt.phase) * 2.2 * p;
      var x = pt.sx + (pt.tx - pt.sx) * p + wob;
      var y = pt.sy + (pt.ty - pt.sy) * p + Math.cos(elapsed * 0.7 + pt.phase) * (reduce ? 0 : 1.6 * p);
      var dx = x - mouse.x, dy = y - mouse.y, d2 = dx * dx + dy * dy;
      if (!reduce && d2 < 9000) {
        var push = (1 - d2 / 9000) * 26, d = Math.sqrt(d2) || 1;
        pt.ox = (pt.ox || 0) + (dx / d * push - (pt.ox || 0)) * 0.2;
        pt.oy = (pt.oy || 0) + (dy / d * push - (pt.oy || 0)) * 0.2;
      } else {
        pt.ox = (pt.ox || 0) * 0.9; pt.oy = (pt.oy || 0) * 0.9;
      }
      x += pt.ox; y += pt.oy;
      ctx.beginPath();
      ctx.arc(x, y, pt.size, 0, Math.PI * 2);
      ctx.fillStyle = p < 0.35 ? '#5B7A8E' : colors[pt.k];
      ctx.globalAlpha = 0.55 + 0.35 * p;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!reduce) requestAnimationFrame(draw);
  }

  setup();
  requestAnimationFrame(draw);
  var hero = canvas.parentElement;
  hero.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  hero.addEventListener('pointerleave', function () { mouse.x = -9999; mouse.y = -9999; });
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { setup(); if (reduce) requestAnimationFrame(draw); }, 150);
  });
})();
