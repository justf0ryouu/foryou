/**
 * Digital Journal — script.js
 * Enhanced version with bug fixes, premium effects, and new features.
 */

'use strict';

/* =========================================================
   CONSTANTS & STATE
   ========================================================= */
const TOTAL_PAGES = 6;
const IS_MOBILE   = () => window.innerWidth < 768;

const state = {
  currentPage:     1,
  isTransitioning: false,
  musicPlaying:    false,
  endingTriggered: false,
  bookOpen:        false,
};

/* Cleanup references — timeouts to clear on closeBook */
const _timers = [];
const addTimer = (id) => { _timers.push(id); return id; };
const clearAllTimers = () => { _timers.forEach(clearTimeout); _timers.length = 0; };

/* AbortControllers for event listeners */
let scrapbookAbort = null;

/* IntersectionObserver refs */
let letterObserver = null;

/* Ending stars animation frame */
let endingStarsRAF = null;

const $ = (id) => document.getElementById(id);

const DOM = {
  canvas:            $('particle-canvas'),
  introScreen:       $('intro-screen'),
  bookCoverScene:    $('book-cover-scene'),
  bookOpenScene:     $('book-open-scene'),
  book3d:            $('book-3d'),
  bookWrapper:       $('book-wrapper'),
  bookLight:         $('book-light'),
  coverHint:         $('cover-hint'),
  openBook:          $('open-book'),
  navArrows:         $('nav-arrows'),
  navPrev:           $('nav-prev'),
  navNext:           $('nav-next'),
  currentPageNum:    $('current-page-num'),
  totalPageNum:      $('total-page-num'),
  flipOverlay:       $('page-flip-overlay'),
  musicPlayer:       $('music-player'),
  musicToggle:       $('music-toggle'),
  bgAudio:           $('bg-audio'),
  musicBars:         $('music-bars'),
  iconPlay:          document.querySelector('.icon-play'),
  iconPause:         document.querySelector('.icon-pause'),
  closeBookBtn:      $('close-book-btn'),
  globalCloseBtn:    $('global-close-btn'),
  secretOverlay:     $('secret-overlay'),
  secretClose:       $('secret-close'),
  photoViewer:       $('photo-viewer'),
  photoViewerImg:    $('photo-viewer-img'),
  photoViewerCap:    $('photo-viewer-caption'),
  photoViewerClose:  $('photo-viewer-close'),
  photoViewerBg:     $('photo-viewer-backdrop'),
  oneLastThingBtn:   $('one-last-thing-btn'),
  endingStarsCanvas: $('ending-stars-canvas'),
};

/* =========================================================
   PARTICLE SYSTEM
   ========================================================= */
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.particles = [];
    this.shootingStars = [];
    this.mouse  = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this._raf   = null;
    this._resizeHandler  = () => this.resize();
    this._mousemoveHandler = (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; };

    this.resize();
    this.init();
    this.startAnimation();

    window.addEventListener('resize', this._resizeHandler);
    window.addEventListener('mousemove', this._mousemoveHandler, { passive: true });
  }

  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /** Reduce particle count on mobile for performance */
  get targetCount() {
    return IS_MOBILE() ? 60 : 120;
  }

  createParticle() {
    return {
      x:           Math.random() * this.canvas.width,
      y:           Math.random() * this.canvas.height,
      size:        Math.random() * 1.0 + 0.3,
      opacity:     Math.random() * 0.5 + 0.08,
      vx:          (Math.random() - 0.5) * 0.07,
      vy:          -(Math.random() * 0.08 + 0.018),
      life:        0,
      maxLife:     Math.random() * 380 + 280,
      twinkleSpeed:Math.random() * 0.045 + 0.018,
    };
  }

  init() {
    const count = this.targetCount;
    for (let i = 0; i < count; i++) {
      const p = this.createParticle();
      p.life = Math.random() * p.maxLife;
      this.particles.push(p);
    }
  }

  startAnimation() {
    const loop = () => {
      this.draw();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  draw() {
    const { ctx, canvas, particles, mouse } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const target = this.targetCount;
    /* Maintain correct particle count after resize */
    while (particles.length < target) {
      const p = this.createParticle();
      p.life = Math.random() * p.maxLife;
      particles.push(p);
    }
    if (particles.length > target + 10) {
      particles.splice(target);
    }

    particles.forEach((p, i) => {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;

      /* Very subtle mouse drift */
      const dx   = mouse.x - p.x;
      const dy   = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 160) {
        p.vx += dx * 0.000015;
        p.vy += dy * 0.000015;
      }

      /* Clamp velocity */
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (spd > 0.25) { p.vx = (p.vx / spd) * 0.25; p.vy = (p.vy / spd) * 0.25; }

      const progress = p.life / p.maxLife;
      const baseAlpha = progress < 0.2
        ? (progress / 0.2) * p.opacity
        : progress > 0.8
        ? ((1 - progress) / 0.2) * p.opacity
        : p.opacity;

      const twinkle = Math.sin(p.life * p.twinkleSpeed) * 0.38 + 0.62;
      const alpha   = baseAlpha * twinkle;

      /* Draw small star */
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 245, 228, ${alpha})`;
      ctx.fill();

      /* Core glow for larger particles */
      if (p.size > 0.9) {
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
        grad.addColorStop(0, `rgba(255, 240, 210, ${alpha * 0.6})`);
        grad.addColorStop(1, `rgba(255, 240, 210, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      if (p.life >= p.maxLife || p.y < -20 || p.x < -20 || p.x > canvas.width + 20) {
        particles[i] = this.createParticle();
      }
    });

    /* Occasional shooting star (desktop only) */
    if (!IS_MOBILE() && Math.random() < 0.004 && this.shootingStars.length < 1) {
      this.shootingStars.push({
        x:       Math.random() * (canvas.width * 0.6),
        y:       Math.random() * (canvas.height * 0.35),
        vx:      10 + Math.random() * 7,
        vy:      3 + Math.random() * 3,
        life:    0,
        maxLife: 90,
        opacity: 0.65 + Math.random() * 0.25,
      });
    }

    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const ss = this.shootingStars[i];
      ss.life++;
      ss.x += ss.vx;
      ss.y += ss.vy;
      const p = ss.life / ss.maxLife;
      const a = p > 0.8 ? ((1 - p) / 0.2) * ss.opacity : ss.opacity;
      if (ss.life >= ss.maxLife || ss.x > canvas.width || ss.y > canvas.height) {
        this.shootingStars.splice(i, 1);
        continue;
      }
      const g = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.vx * 5, ss.y - ss.vy * 5);
      g.addColorStop(0, `rgba(255, 255, 255, ${a})`);
      g.addColorStop(1, `rgba(255, 255, 255, 0)`);
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x - ss.vx * 5, ss.y - ss.vy * 5);
      ctx.strokeStyle = g;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
      ctx.fill();
    }
  }
}

/* =========================================================
   COVER BOOK — MOUSE PARALLAX
   Uses lerp for ultra-smooth movement
   ========================================================= */
function initBookCoverParallax() {
  const wrapper = DOM.bookWrapper;
  const book    = DOM.book3d;
  const light   = DOM.bookLight;

  let targetRotX = 4, targetRotY = -10;
  let currentRotX = 4, currentRotY = -10;
  let parallaxRAF = null;
  let isHovering  = false;

  const lerp = (a, b, t) => a + (b - a) * t;

  const smoothLoop = () => {
    currentRotX = lerp(currentRotX, targetRotX, 0.08);
    currentRotY = lerp(currentRotY, targetRotY, 0.08);
    book.style.transform = `rotateX(${currentRotX}deg) rotateY(${currentRotY}deg)`;
    parallaxRAF = requestAnimationFrame(smoothLoop);
  };

  wrapper.addEventListener('mousemove', (e) => {
    if (!isHovering) {
      isHovering = true;
      if (!parallaxRAF) smoothLoop();
    }
    const rect = wrapper.getBoundingClientRect();
    const cx   = rect.left + rect.width / 2;
    const cy   = rect.top  + rect.height / 2;
    const dx   = (e.clientX - cx) / (rect.width  / 2);
    const dy   = (e.clientY - cy) / (rect.height / 2);

    targetRotX = -dy * 9;
    targetRotY = dx * 12 - 10;

    const lx = ((e.clientX - rect.left) / rect.width)  * 100;
    const ly = ((e.clientY - rect.top)  / rect.height) * 100;
    light.style.background = `radial-gradient(ellipse 45% 45% at ${lx}% ${ly}%, rgba(255,235,200,0.11) 0%, transparent 70%)`;
  });

  wrapper.addEventListener('mouseleave', () => {
    isHovering = false;
    targetRotX = 4;
    targetRotY = -10;
    light.style.background = 'radial-gradient(ellipse 40% 40% at 30% 30%, rgba(255,235,200,0.08) 0%, transparent 70%)';
  });

  /* Start smooth loop so it lerps back on mouseleave */
  smoothLoop();

  /* Store reference so we can cancel on page destroy if needed */
  wrapper._parallaxRAF = parallaxRAF;
}

/* =========================================================
   SPARKLE EFFECT — on book open
   ========================================================= */
function triggerOpenSparkle() {
  const container = document.createElement('div');
  container.className = 'sparkle-container';
  document.body.appendChild(container);

  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;
  const count = IS_MOBILE() ? 18 : 32;

  for (let i = 0; i < count; i++) {
    const dot = document.createElement('div');
    dot.className = 'sparkle-dot';
    const angle    = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
    const distance = 60 + Math.random() * 180;
    const tx       = Math.cos(angle) * distance;
    const ty       = Math.sin(angle) * distance;
    const size     = 2 + Math.random() * 4;
    const duration = 0.8 + Math.random() * 0.6;

    dot.style.cssText = `
      left: ${cx}px;
      top:  ${cy}px;
      width:  ${size}px;
      height: ${size}px;
      --tx: ${tx}px;
      --ty: ${ty}px;
      --duration: ${duration}s;
      animation-delay: ${Math.random() * 0.3}s;
      background: ${Math.random() > 0.6 ? 'var(--gold-light)' : 'rgba(255,255,255,0.9)'};
      box-shadow: 0 0 ${size * 2}px ${Math.random() > 0.5 ? 'rgba(201,169,110,0.6)' : 'rgba(255,255,255,0.5)'};
    `;
    container.appendChild(dot);
  }

  setTimeout(() => container.remove(), 2200);
}

/* =========================================================
   PAGE HELPERS
   ========================================================= */
const getPage = (num) => document.querySelector(`.book-page[data-page="${num}"]`);

function updateNavUI() {
  DOM.currentPageNum.textContent = state.currentPage;
  DOM.navPrev.disabled = state.currentPage === 1;
  DOM.navNext.disabled = state.currentPage === TOTAL_PAGES;
}

/* =========================================================
   PAGE NAVIGATION
   ========================================================= */
function showPage(pageNum, direction = 'forward') {
  if (state.isTransitioning) return;
  state.isTransitioning = true;

  const oldPage = getPage(state.currentPage);
  const newPage = getPage(pageNum);

  if (!newPage) { state.isTransitioning = false; return; }

  triggerFlipEffect(direction);
  newPage.scrollTop = 0;

  oldPage.classList.remove('active');
  oldPage.classList.add(direction === 'forward' ? 'leaving' : 'leaving-back');

  newPage.classList.add('active', direction === 'forward' ? 'entering' : 'entering-back');

  const tid = setTimeout(() => {
    oldPage.classList.remove('leaving', 'leaving-back');
    newPage.classList.remove('entering', 'entering-back');
    state.currentPage = pageNum;
    updateNavUI();
    state.isTransitioning = false;
    onPageEnter(pageNum);
  }, 600);
  addTimer(tid);
}

function triggerFlipEffect(direction) {
  const overlay = DOM.flipOverlay;
  overlay.classList.remove('animating-forward', 'animating-back');
  void overlay.offsetWidth; /* Reflow to restart animation */
  overlay.classList.add(direction === 'forward' ? 'animating-forward' : 'animating-back');
  const tid = setTimeout(() => overlay.classList.remove('animating-forward', 'animating-back'), 750);
  addTimer(tid);
}

/* =========================================================
   PAGE ENTER HANDLERS
   ========================================================= */
function onPageEnter(pageNum) {
  /* Ink-write chapter title */
  const chapter = document.getElementById(`chapter-${pageNum}`);
  if (chapter && chapter.textContent.trim()) {
    chapter.classList.remove('ink-written');
    void chapter.offsetWidth;
    const tid = setTimeout(() => chapter.classList.add('ink-written'), 120);
    addTimer(tid);
  }

  if (pageNum === 1) startTypewriter();
  if (pageNum === 2) revealStoryText();
  if (pageNum === 3) revealLikeCards();
  if (pageNum === 4) initScrapbookPage();
  if (pageNum === 5) revealLetterText();
  if (pageNum === 6) triggerEnding();
}

/* =========================================================
   TYPEWRITER — Page 1
   ========================================================= */
function typeText(el, text, speed = 35, delay = 0) {
  return new Promise((resolve) => {
    el.style.width     = 'auto';
    el.style.whiteSpace = 'pre-wrap';
    el.style.opacity    = '1';
    el.textContent      = '';
    let i = 0;

    /* Remove any existing cursor */
    const oldCursor = el.parentElement.querySelector('.typewriter-cursor');
    if (oldCursor) oldCursor.remove();

    /* Add blinking cursor */
    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    el.insertAdjacentElement('afterend', cursor);

    const tid = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < text.length) {
          el.textContent += text[i];
          i++;
        } else {
          clearInterval(interval);
          cursor.remove();
          resolve();
        }
      }, speed);
    }, delay);
    addTimer(tid);
  });
}

function startTypewriter() {
  const line1 = $('typewriter-line-1');
  const line2 = $('typewriter-line-2');

  /* Reset */
  line1.style.width   = 'auto';
  line1.style.opacity = '0';
  line2.style.opacity = '0';
  line1.textContent   = '';
  line2.textContent   = '';

  /* Remove old cursors */
  document.querySelectorAll('#page-1 .typewriter-cursor').forEach(c => c.remove());

  const text1 = 'Hi.Firaaa';
  const text2 = 'Sebenernya aku gatau ya apa tujuannya aku buat\n ini mungkin buat nyampein sesuatu kali ya yang gabisa aku omongin atau\nmungkin nyimpen hal tentang aku dan kamu disini.';

  typeText(line1, text1, 80, 400).then(() => {
    const tid = setTimeout(() => {
      line2.style.transition = 'opacity 0.5s ease';
      line2.style.opacity    = '1';
      typeText(line2, text2, 28, 0);
    }, 500);
    addTimer(tid);
  });
}

/* =========================================================
   REVEAL TEXT — Page 2
   ========================================================= */
function revealStoryText() {
  const elements = document.querySelectorAll('#page-2 .reveal-text');
  elements.forEach((el, i) => {
    el.classList.remove('revealed');
    const tid = setTimeout(() => el.classList.add('revealed'), 200 + i * 200);
    addTimer(tid);
  });
}

/* =========================================================
   LIKE CARDS — Page 3
   ========================================================= */
function revealLikeCards() {
  const cards = document.querySelectorAll('.like-card');
  cards.forEach((card) => {
    card.classList.remove('visible');
    const delay = parseInt(card.dataset.delay || 0, 10);
    const tid   = setTimeout(() => card.classList.add('visible'), 150 + delay);
    addTimer(tid);
  });
}

/* =========================================================
   SCRAPBOOK — Page 4
   Drop-in animation + parallax + photo click
   ========================================================= */
function initScrapbookPage() {
  /* Drop-in animation */
  triggerScrapbookDropIn();

  /* Parallax (desktop only) */
  if (!IS_MOBILE()) initScrapbookParallax();

  /* Photo viewer clicks */
  initScrapbookClicks();
}

function triggerScrapbookDropIn() {
  const items = document.querySelectorAll('.scrapbook-item');
  items.forEach((item) => {
    item.style.opacity = '0';
    item.classList.remove('drop-in');
    void item.offsetWidth;
    item.classList.add('drop-in');
  });
}

function initScrapbookParallax() {
  const gallery = $('scrapbook-gallery');
  if (!gallery) return;

  /* Cancel previous listener */
  if (scrapbookAbort) scrapbookAbort.abort();
  scrapbookAbort = new AbortController();
  const { signal } = scrapbookAbort;

  const items     = gallery.querySelectorAll('.scrapbook-item');
  const rotations = Array.from(items).map(item => {
    const rotStr = item.style.getPropertyValue('--rot') || '0deg';
    return parseFloat(rotStr) || 0;
  });

  gallery.addEventListener('mousemove', (e) => {
    const rect = gallery.getBoundingClientRect();
    const cx   = rect.width  / 2;
    const cy   = rect.height / 2;
    const dx   = e.clientX - rect.left - cx;
    const dy   = e.clientY - rect.top  - cy;

    items.forEach((item, idx) => {
      const factor = parseFloat(item.dataset.parallax || 0.02);
      const rot    = rotations[idx];
      item.style.transform = `rotate(${rot}deg) translate(${dx * factor}px, ${dy * factor}px) scale(1.03)`;
    });
  }, { signal });

  gallery.addEventListener('mouseleave', () => {
    items.forEach((item, idx) => {
      item.style.transform = `rotate(${rotations[idx]}deg)`;
    });
  }, { signal });
}

function initScrapbookClicks() {
  const items = document.querySelectorAll('.scrapbook-item');
  items.forEach((item) => {
    /* Remove old listener by cloning (safe approach for these simple elements) */
    const clone = item.cloneNode(true);
    item.parentNode.replaceChild(clone, item);

    clone.addEventListener('click', () => {
      const img     = clone.querySelector('img');
      const caption = clone.dataset.caption || clone.querySelector('.scrapbook-caption')?.textContent || '';
      if (img && img.src) openPhotoViewer(img.src, caption);
    });
  });
}

/* =========================================================
   LETTER TEXT REVEAL — Page 5
   ========================================================= */
function revealLetterText() {
  /* Disconnect old observer to prevent leak */
  if (letterObserver) {
    letterObserver.disconnect();
    letterObserver = null;
  }

  const elements = document.querySelectorAll('#page-5 .reveal-text');
  const page5    = $('page-5');

  letterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, { root: page5, rootMargin: '0px', threshold: 0.08 });

  elements.forEach((el, i) => {
    el.classList.remove('revealed');
    if (i < 2) {
      const tid = setTimeout(() => el.classList.add('revealed'), 200 + i * 220);
      addTimer(tid);
    } else {
      letterObserver.observe(el);
    }
  });
}

/* =========================================================
   ENDING — Page 6
   ========================================================= */
function triggerEnding() {
  if (state.endingTriggered) return;
  state.endingTriggered = true;

  /* Start stars canvas */
  startEndingStars();

  const lines    = document.querySelectorAll('.ending-line');
  const thanks   = $('ending-thanks');
  const closeBtn = $('close-book-btn');
  const oltBtn   = $('one-last-thing-btn');

  /* Animate lines one by one (faster sequence, no initial delay) */
  lines.forEach((line, i) => {
    const tid = setTimeout(() => line.classList.add('visible'), i * 400);
    addTimer(tid);
  });

  const afterLines = lines.length * 400 + 600;

  const tid1 = setTimeout(() => {
    if (thanks)   thanks.classList.add('visible');
  }, afterLines);
  addTimer(tid1);

  const tid2 = setTimeout(() => {
    if (closeBtn) closeBtn.classList.add('visible');
    if (oltBtn)   oltBtn.classList.add('visible');
  }, afterLines + 600);
  addTimer(tid2);
}

/* =========================================================
   ENDING STARS CANVAS
   ========================================================= */
function startEndingStars() {
  const canvas = DOM.endingStarsCanvas;
  if (!canvas) return;

  if (endingStarsRAF) { cancelAnimationFrame(endingStarsRAF); endingStarsRAF = null; }

  const ctx = canvas.getContext('2d');
  canvas.width  = canvas.offsetWidth  || 800;
  canvas.height = canvas.offsetHeight || 600;

  const starCount = IS_MOBILE() ? 40 : 80;
  const stars = [];

  for (let i = 0; i < starCount; i++) {
    stars.push({
      x:      Math.random() * canvas.width,
      y:      Math.random() * canvas.height,
      r:      Math.random() * 1.2 + 0.2,
      alpha:  Math.random(),
      speed:  Math.random() * 0.02 + 0.008,
      phase:  Math.random() * Math.PI * 2,
    });
  }

  const drawStars = (ts) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      const a = (Math.sin(ts * s.speed + s.phase) * 0.5 + 0.5) * 0.7 + 0.08;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 240, 210, ${a})`;
      ctx.fill();
    });

    /* Occasional golden sparkle */
    if (Math.random() < 0.008) {
      const gx = Math.random() * canvas.width;
      const gy = Math.random() * canvas.height;
      const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, 8);
      gr.addColorStop(0, 'rgba(201,169,110,0.5)');
      gr.addColorStop(1, 'rgba(201,169,110,0)');
      ctx.beginPath();
      ctx.arc(gx, gy, 8, 0, Math.PI * 2);
      ctx.fillStyle = gr;
      ctx.fill();
    }

    endingStarsRAF = requestAnimationFrame(drawStars);
  };

  endingStarsRAF = requestAnimationFrame(drawStars);
}

function stopEndingStars() {
  if (endingStarsRAF) {
    cancelAnimationFrame(endingStarsRAF);
    endingStarsRAF = null;
  }
  const canvas = DOM.endingStarsCanvas;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/* =========================================================
   PHOTO VIEWER
   ========================================================= */
function openPhotoViewer(src, caption) {
  const { photoViewer, photoViewerImg, photoViewerCap } = DOM;
  photoViewerImg.src = src;
  photoViewerImg.alt = caption;
  photoViewerCap.textContent = caption;
  photoViewer.classList.add('open');
  photoViewer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closePhotoViewer() {
  DOM.photoViewer.classList.remove('open');
  DOM.photoViewer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  /* Delay src clear to avoid flicker during transition */
  setTimeout(() => { DOM.photoViewerImg.src = ''; }, 400);
}

/* =========================================================
   SECRET MESSAGE
   ========================================================= */
function openSecretMessage() {
  const overlay = DOM.secretOverlay;
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');

  /* Animate lines in sequence */
  const lines = overlay.querySelectorAll('.secret-line');
  lines.forEach((line, i) => {
    line.classList.remove('revealed');
    const tid = setTimeout(() => line.classList.add('revealed'), 300 + i * 280);
    addTimer(tid);
  });
}

function closeSecretMessage() {
  const overlay = DOM.secretOverlay;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  /* Reset lines */
  overlay.querySelectorAll('.secret-line').forEach(l => l.classList.remove('revealed'));
}

/* =========================================================
   BOOK FLOW
   ========================================================= */
function runIntroSequence() {
  const tid1 = setTimeout(() => {
    DOM.introScreen.classList.add('fade-out');
    const tid2 = setTimeout(() => {
      DOM.introScreen.classList.add('hidden');
      showBookCover();
    }, 800);
    addTimer(tid2);
  }, 4800);
  addTimer(tid1);
}

function showBookCover() {
  DOM.bookCoverScene.classList.remove('hidden', 'fade-out');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      DOM.bookCoverScene.classList.add('visible');
    });
  });
  initBookCoverParallax();
}

function openBook() {
  if (state.isTransitioning || state.bookOpen) return;
  state.isTransitioning = true;
  state.bookOpen        = true;

  DOM.book3d.classList.add('opening');
  if (DOM.coverHint) DOM.coverHint.style.opacity = '0';

  /* Sparkle at peak of opening animation */
  const tid1 = setTimeout(() => triggerOpenSparkle(), 700);
  addTimer(tid1);

  const tid2 = setTimeout(() => {
    DOM.bookCoverScene.classList.remove('visible');
    DOM.bookCoverScene.classList.add('fade-out');

    const tid3 = setTimeout(() => {
      DOM.bookCoverScene.classList.add('hidden');
      DOM.bookCoverScene.classList.remove('fade-out');
      DOM.bookOpenScene.classList.remove('hidden');
      DOM.bookOpenScene.style.opacity   = '0';

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          DOM.bookOpenScene.style.transition = 'opacity 0.9s ease';
          DOM.bookOpenScene.style.opacity    = '1';
        });
      });

      const firstPage = getPage(1);
      firstPage.classList.add('active');

      DOM.totalPageNum.textContent = TOTAL_PAGES;
      updateNavUI();

      const tid4 = setTimeout(() => {
        DOM.navArrows.classList.add('visible');
        if (DOM.globalCloseBtn) DOM.globalCloseBtn.classList.add('visible');
        state.isTransitioning = false;
        onPageEnter(1);
      }, 950);
      addTimer(tid4);

    }, 700);
    addTimer(tid3);
  }, 1200);
  addTimer(tid2);
}

function closeBook() {
  DOM.bookOpenScene.style.transition = 'opacity 1.1s ease';
  DOM.bookOpenScene.style.opacity    = '0';

  /* Stop ending stars */
  stopEndingStars();

  /* Disconnect letter observer */
  if (letterObserver) { letterObserver.disconnect(); letterObserver = null; }

  /* Cancel scrapbook listeners */
  if (scrapbookAbort) { scrapbookAbort.abort(); scrapbookAbort = null; }

  /* Clear all pending timers */
  clearAllTimers();

  const tid = setTimeout(() => {
    DOM.bookOpenScene.classList.add('hidden');
    DOM.navArrows.classList.remove('visible');
    if (DOM.globalCloseBtn) DOM.globalCloseBtn.classList.remove('visible');

    /* Full state reset */
    state.currentPage     = 1;
    state.endingTriggered = false;
    state.bookOpen        = false;

    /* Reset all pages */
    document.querySelectorAll('.book-page').forEach(p => {
      p.classList.remove('active', 'entering', 'leaving', 'entering-back', 'leaving-back');
    });

    /* Reset ending elements */
    document.querySelectorAll('.ending-line').forEach(el => el.classList.remove('visible'));
    document.querySelectorAll('.scrapbook-item').forEach(el => { el.classList.remove('drop-in'); el.style.opacity = '0'; });
    document.querySelectorAll('.like-card').forEach(el => el.classList.remove('visible'));
    document.querySelectorAll('.reveal-text').forEach(el => el.classList.remove('revealed'));
    document.querySelectorAll('.page-chapter').forEach(el => el.classList.remove('ink-written'));
    const thanks   = $('ending-thanks');
    const closeBtn = $('close-book-btn');
    const oltBtn   = $('one-last-thing-btn');
    if (thanks)   thanks.classList.remove('visible');
    if (closeBtn) { closeBtn.classList.remove('visible'); closeBtn.style.opacity = ''; }
    if (oltBtn)   { oltBtn.classList.remove('visible'); oltBtn.style.opacity = ''; }

    /* Reset typewriter lines */
    const tw1 = $('typewriter-line-1');
    const tw2 = $('typewriter-line-2');
    if (tw1) { tw1.style.opacity = '0'; tw1.textContent = ''; }
    if (tw2) { tw2.style.opacity = '0'; tw2.textContent = ''; }
    document.querySelectorAll('.typewriter-cursor').forEach(c => c.remove());

    /* Show cover again */
    DOM.book3d.classList.remove('opening');
    DOM.book3d.style.transform = 'rotateY(-10deg) rotateX(4deg)';
    if (DOM.coverHint) DOM.coverHint.style.opacity = '';
    DOM.bookCoverScene.classList.remove('hidden', 'fade-out');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        DOM.bookCoverScene.classList.add('visible');
      });
    });

    if (state.musicPlaying) toggleMusic();
  }, 1100);
  /* Note: not adding this to _timers since we just cleared them */
  setTimeout(() => {}, 0); // Flush
}

/* =========================================================
   MUSIC
   ========================================================= */
function toggleMusic() {
  const audio = DOM.bgAudio;
  if (!audio || !audio.getAttribute('src')) return;

  if (state.musicPlaying) {
    audio.pause();
    DOM.iconPlay.classList.remove('hidden');
    DOM.iconPause.classList.add('hidden');
    DOM.musicBars.classList.remove('playing');
    document.body.classList.remove('music-active');
    state.musicPlaying = false;
  } else {
    const promise = audio.play();
    if (promise !== undefined) {
      promise.then(() => {
        DOM.iconPlay.classList.add('hidden');
        DOM.iconPause.classList.remove('hidden');
        DOM.musicBars.classList.add('playing');
        document.body.classList.add('music-active');
        state.musicPlaying = true;
      }).catch((err) => {
        console.warn('Audio play blocked:', err);
      });
    }
  }
}

/* =========================================================
   KEYBOARD NAV
   ========================================================= */
function initKeyboardNav() {
  document.addEventListener('keydown', (e) => {
    /* Photo viewer ESC */
    if (DOM.photoViewer.classList.contains('open')) {
      if (e.key === 'Escape') closePhotoViewer();
      return;
    }

    /* Secret message ESC */
    if (DOM.secretOverlay.classList.contains('open')) {
      if (e.key === 'Escape') closeSecretMessage();
      return;
    }

    /* Book navigation */
    if (!DOM.bookOpenScene.classList.contains('hidden')) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigateNext();
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')  navigatePrev();
      if (e.key === 'Escape') closeBook();
    }
  });
}

function navigateNext() {
  if (state.currentPage < TOTAL_PAGES && !state.isTransitioning) {
    showPage(state.currentPage + 1, 'forward');
  }
}

function navigatePrev() {
  if (state.currentPage > 1 && !state.isTransitioning) {
    showPage(state.currentPage - 1, 'back');
  }
}

/* =========================================================
   SWIPE NAVIGATION
   ========================================================= */
function initSwipeNav() {
  let startX = 0, startY = 0;

  document.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (DOM.bookOpenScene.classList.contains('hidden')) return;
    if (DOM.photoViewer.classList.contains('open'))    return;

    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) navigateNext();
      else        navigatePrev();
    }
  }, { passive: true });
}

/* =========================================================
   POLAROID CLICK — Page 2
   ========================================================= */
function initPolaroidClick() {
  const polaroid = $('polaroid-1');
  const img      = polaroid?.querySelector('img');
  if (!polaroid || !img) return;

  polaroid.style.cursor = 'pointer';
  polaroid.addEventListener('click', () => {
    openPhotoViewer(img.src, '— a moment');
  });
}

/* =========================================================
   COVER PHOTO CLICK — Page 1
   ========================================================= */
function initCoverPhotoClick() {
  const coverPhoto = $('photo-cover');
  const img        = coverPhoto?.querySelector('img');
  if (!coverPhoto || !img) return;

  coverPhoto.addEventListener('click', () => {
    if (!img.classList.contains('no-img') && img.src) {
      openPhotoViewer(img.src, 'Cover');
    }
  });
}

/* =========================================================
   BIND EVENTS
   ========================================================= */
function bindEvents() {
  /* Book open */
  DOM.bookWrapper.addEventListener('click', openBook);

  /* Navigation */
  DOM.navNext.addEventListener('click', navigateNext);
  DOM.navPrev.addEventListener('click', navigatePrev);

  /* Close book */
  DOM.closeBookBtn.addEventListener('click', closeBook);
  if (DOM.globalCloseBtn) DOM.globalCloseBtn.addEventListener('click', closeBook);

  /* Music */
  DOM.musicToggle.addEventListener('click', toggleMusic);

  /* Photo viewer */
  DOM.photoViewerClose.addEventListener('click', closePhotoViewer);
  DOM.photoViewerBg.addEventListener('click', closePhotoViewer);

  /* Secret message */
  if (DOM.oneLastThingBtn) {
    DOM.oneLastThingBtn.addEventListener('click', openSecretMessage);
  }
  if (DOM.secretClose) {
    DOM.secretClose.addEventListener('click', closeSecretMessage);
  }
  if (DOM.secretOverlay) {
    DOM.secretOverlay.addEventListener('click', (e) => {
      if (e.target === DOM.secretOverlay) closeSecretMessage();
    });
  }
}

/* =========================================================
   INIT
   ========================================================= */
function init() {
  /* Particles */
  new ParticleSystem(DOM.canvas);

  /* Events */
  bindEvents();
  initKeyboardNav();
  initSwipeNav();
  initPolaroidClick();
  initCoverPhotoClick();

  /* Start experience */
  runIntroSequence();
}

/* Wait for DOM + fonts */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
