
'use strict';

const TOTAL_PAGES = 6;

const state = {
  currentPage: 1,
  isTransitioning: false,
  musicPlaying: false,
  endingTriggered: false,
};

const $ = (id) => document.getElementById(id);

const DOM = {
  canvas:         $('particle-canvas'),
  introScreen:    $('intro-screen'),
  bookCoverScene: $('book-cover-scene'),
  bookOpenScene:  $('book-open-scene'),
  book3d:         $('book-3d'),
  bookWrapper:    $('book-wrapper'),
  bookLight:      $('book-light'),
  coverHint:      $('cover-hint'),
  openBook:       $('open-book'),
  navArrows:      $('nav-arrows'),
  navPrev:        $('nav-prev'),
  navNext:        $('nav-next'),
  currentPageNum: $('current-page-num'),
  totalPageNum:   $('total-page-num'),
  flipOverlay:    $('page-flip-overlay'),
  musicPlayer:    $('music-player'),
  musicToggle:    $('music-toggle'),
  bgAudio:        $('bg-audio'),
  musicBars:      $('music-bars'),
  iconPlay:       document.querySelector('.icon-play'),
  iconPause:      document.querySelector('.icon-pause'),
  closeBookBtn:   $('close-book-btn'),
  globalCloseBtn: $('global-close-btn'),
};

class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.resize();
    this.init();
    this.animate();

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createParticle() {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      size: Math.random() * 1.2 + 0.4,
      opacity: Math.random() * 0.6 + 0.1,
      vx: (Math.random() - 0.5) * 0.08,
      vy: -(Math.random() * 0.1 + 0.02),
      life: 0,
      maxLife: Math.random() * 400 + 300,
      twinkleSpeed: Math.random() * 0.05 + 0.02
    };
  }

  init() {
    for (let i = 0; i < 150; i++) {
      const p = this.createParticle();
      p.life = Math.random() * p.maxLife;
      this.particles.push(p);
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach((p, i) => {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;

      // Subtle mouse attraction
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 180) {
        p.vx += dx * 0.00002;
        p.vy += dy * 0.00002;
      }

      // Clamp velocity
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 0.3) {
        p.vx = (p.vx / speed) * 0.3;
        p.vy = (p.vy / speed) * 0.3;
      }

      const progress = p.life / p.maxLife;
      const baseAlpha = progress < 0.2
        ? (progress / 0.2) * p.opacity
        : progress > 0.8
        ? ((1 - progress) / 0.2) * p.opacity
        : p.opacity;

      // Twinkle effect
      const twinkle = Math.sin(p.life * p.twinkleSpeed) * 0.4 + 0.6;
      const currentOpacity = baseAlpha * twinkle;

      this.ctx.beginPath();
      // Draw 4-point star
      this.ctx.ellipse(p.x, p.y, p.size * 0.6, p.size * 2.5, 0, 0, Math.PI * 2);
      this.ctx.ellipse(p.x, p.y, p.size * 2.5, p.size * 0.6, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 245, 230, ${currentOpacity})`;
      this.ctx.fill();

      // Add a core glow for larger stars
      if (p.size > 1.0) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity * 1.5})`;
        this.ctx.fill();
      }

      if (p.life >= p.maxLife || p.y < -20 || p.x < -20 || p.x > this.canvas.width + 20) {
        this.particles[i] = this.createParticle();
      }
    });

    if (Math.random() < 0.005 && (!this.shootingStars || this.shootingStars.length < 1)) {
      if (!this.shootingStars) this.shootingStars = [];
      this.shootingStars.push({
        x: Math.random() * (this.canvas.width / 2),
        y: Math.random() * (this.canvas.height / 3),
        vx: 12 + Math.random() * 8,
        vy: 4 + Math.random() * 4,
        life: 0,
        maxLife: 80,
        opacity: 0.7 + Math.random() * 0.3
      });
    }

    if (this.shootingStars) {
      for (let i = this.shootingStars.length - 1; i >= 0; i--) {
        let ss = this.shootingStars[i];
        ss.life++;
        ss.x += ss.vx;
        ss.y += ss.vy;
        
        let progress = ss.life / ss.maxLife;
        let alpha = progress > 0.8 ? ((1 - progress) / 0.2) * ss.opacity : ss.opacity;
        
        if (ss.life >= ss.maxLife || ss.x > this.canvas.width || ss.y > this.canvas.height) {
          this.shootingStars.splice(i, 1);
          continue;
        }
        
        let grad = this.ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.vx * 4, ss.y - ss.vy * 4);
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        grad.addColorStop(1, `rgba(255, 255, 255, 0)`);
        
        this.ctx.beginPath();
        this.ctx.moveTo(ss.x, ss.y);
        this.ctx.lineTo(ss.x - ss.vx * 4, ss.y - ss.vy * 4);
        this.ctx.strokeStyle = grad;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.arc(ss.x, ss.y, 1.5, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        this.ctx.fill();
      }
    }

    requestAnimationFrame(() => this.animate());
  }
}

function initBookCoverParallax() {
  const wrapper = DOM.bookWrapper;
  const book = DOM.book3d;
  const light = DOM.bookLight;

  wrapper.addEventListener('mousemove', (e) => {
    const rect = wrapper.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);   // -1 to 1
    const dy = (e.clientY - cy) / (rect.height / 2);  // -1 to 1

    const rotX = -dy * 10;
    const rotY = dx * 14;

    book.style.transform = `rotateX(${rotX}deg) rotateY(${rotY - 10}deg)`;

    // Light follows mouse
    const lx = ((e.clientX - rect.left) / rect.width) * 100;
    const ly = ((e.clientY - rect.top) / rect.height) * 100;
    light.style.background = `radial-gradient(ellipse 40% 40% at ${lx}% ${ly}%, rgba(255,235,200,0.12) 0%, transparent 70%)`;
  });

  wrapper.addEventListener('mouseleave', () => {
    book.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    book.style.transform = 'rotateY(-10deg) rotateX(4deg)';
    light.style.background = 'radial-gradient(ellipse 40% 40% at 30% 30%, rgba(255,235,200,0.08) 0%, transparent 70%)';
    setTimeout(() => { book.style.transition = 'transform 0.15s ease'; }, 600);
  });
}

function getPage(num) {
  return document.querySelector(`.book-page[data-page="${num}"]`);
}

function updateNavUI() {
  DOM.currentPageNum.textContent = state.currentPage;
  DOM.navPrev.disabled = state.currentPage === 1;
  DOM.navNext.disabled = state.currentPage === TOTAL_PAGES;
}

function showPage(pageNum, direction = 'forward') {
  if (state.isTransitioning) return;
  state.isTransitioning = true;

  const oldPage = getPage(state.currentPage);
  const newPage = getPage(pageNum);

  if (!newPage) { state.isTransitioning = false; return; }

  const enterClass = direction === 'forward' ? 'entering' : 'entering-back';
  const leaveClass = direction === 'forward' ? 'leaving' : 'leaving-back';

  // Play flip sound / tvisual
  triggerFlipEffect(direction);

  // Reset scroll of new page
  newPage.scrollTop = 0;

  oldPage.classList.remove('active');
  oldPage.classList.add(leaveClass);

  newPage.classList.add('active', enterClass);

  setTimeout(() => {
    oldPage.classList.remove(leaveClass);
    newPage.classList.remove(enterClass);
    state.currentPage = pageNum;
    updateNavUI();
    state.isTransitioning = false;

    // Trigger page-specific animations
    onPageEnter(pageNum);
  }, 580);
}

function triggerFlipEffect(direction) {
  const overlay = DOM.flipOverlay;
  overlay.classList.remove('animating-forward', 'animating-back');
  // Trigger reflow to restart animation
  void overlay.offsetWidth;
  overlay.classList.add(direction === 'forward' ? 'animating-forward' : 'animating-back');
  setTimeout(() => overlay.classList.remove('animating-forward', 'animating-back'), 700);
}

function onPageEnter(pageNum) {
  if (pageNum === 1) startTypewriter();
  if (pageNum === 2) revealStoryText();
  if (pageNum === 3) revealLikeCards();
  if (pageNum === 4) initScrapbookParallax();
  if (pageNum === 5) revealLetterText();
  if (pageNum === 6) triggerEnding();
}

function typeText(el, text, speed = 35, delay = 0) {
  return new Promise((resolve) => {
    el.style.width = 'auto';
    el.style.whiteSpace = 'pre-wrap';
    el.textContent = '';
    let i = 0;
    setTimeout(() => {
      const interval = setInterval(() => {
        if (i < text.length) {
          el.textContent += text[i];
          i++;
        } else {
          clearInterval(interval);
          resolve();
        }
      }, speed);
    }, delay);
  });
}

function startTypewriter() {
  const line1 = $('typewriter-line-1');
  const line2 = $('typewriter-line-2');

  line1.style.width = 'auto';
  line1.style.opacity = '1';
  line2.style.opacity = '0';
  line1.textContent = '';
  line2.textContent = '';

  const text1 = 'Hi.Firaaa';
  const text2 = 'Sebenernya aku gatau ya apa tujuannya aku buat \n ini mungkin buat nyampein sesuatu kali ya yang gabisa aku omongin atau \nmungkin nyimpen hal tentang aku dan kamu disini.';

  typeText(line1, text1, 80, 400).then(() => {
    setTimeout(() => {
      line2.style.opacity = '1';
      line2.style.transition = 'opacity 0.5s ease';
      typeText(line2, text2, 32, 0);
    }, 600);
  });
}

function revealStoryText() {
  const elements = document.querySelectorAll('#page-2 .reveal-text');
  elements.forEach((el, i) => {
    el.classList.remove('revealed');
    setTimeout(() => el.classList.add('revealed'), 200 + i * 180);
  });
}

function revealLikeCards() {
  const cards = document.querySelectorAll('.like-card');
  cards.forEach((card) => {
    card.classList.remove('visible');
    const delay = parseInt(card.dataset.delay || 0, 10);
    setTimeout(() => card.classList.add('visible'), 150 + delay);
  });
}

function revealLetterText() {
  const elements = document.querySelectorAll('#page-5 .reveal-text');
  const page5 = $('page-5');

  // Use Intersection Observer for scroll-based reveal
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, { root: page5, rootMargin: '0px', threshold: 0.1 });

  elements.forEach((el, i) => {
    el.classList.remove('revealed');
    // First few reveal on enter
    if (i < 2) {
      setTimeout(() => el.classList.add('revealed'), 200 + i * 200);
    } else {
      observer.observe(el);
    }
  });
}

function initScrapbookParallax() {
  const gallery = $('scrapbook-gallery');
  if (!gallery) return;

  const items = gallery.querySelectorAll('.scrapbook-item');
  // Store original rotation values from inline style
  const rotations = Array.from(items).map(item => {
    const rotStr = item.style.getPropertyValue('--rot') || '0deg';
    return parseFloat(rotStr) || 0;
  });

  gallery.addEventListener('mousemove', (e) => {
    const rect = gallery.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = e.clientX - rect.left - cx;
    const dy = e.clientY - rect.top - cy;

    items.forEach((item, idx) => {
      const factor = parseFloat(item.dataset.parallax || 0.02);
      const rot = rotations[idx];
      item.style.transform = `rotate(${rot}deg) translate(${dx * factor}px, ${dy * factor}px)`;
    });
  });

  gallery.addEventListener('mouseleave', () => {
    items.forEach((item, idx) => {
      const rot = rotations[idx];
      item.style.transform = `rotate(${rot}deg)`;
    });
  });
}

function triggerEnding() {
  if (state.endingTriggered) return;
  state.endingTriggered = true;

  const lines = document.querySelectorAll('.ending-line');
  const thanks = $('ending-thanks');
  const closeBtn = $('close-book-btn');

  lines.forEach((line, i) => {
    setTimeout(() => line.classList.add('visible'), 500 + i * 600);
  });

  setTimeout(() => {
    thanks.classList.add('visible');
    closeBtn.classList.add('visible');
  }, 500 + lines.length * 600 + 800);
}

function runIntroSequence() {
  // After intro animation completes (~5s), show book cover
  setTimeout(() => {
    DOM.introScreen.classList.add('fade-out');
    setTimeout(() => {
      DOM.introScreen.classList.add('hidden');
      showBookCover();
    }, 800);
  }, 4800);
}

function showBookCover() {
  DOM.bookCoverScene.classList.remove('hidden', 'fade-out');
  // Trigger the .visible state which enables opacity transition
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      DOM.bookCoverScene.classList.add('visible');
    });
  });
  initBookCoverParallax();
}

function openBook() {
  if (state.isTransitioning) return;
  state.isTransitioning = true;

  // Animate book opening
  DOM.book3d.classList.add('opening');
  if (DOM.coverHint) DOM.coverHint.style.opacity = '0';

  setTimeout(() => {
    DOM.bookCoverScene.classList.remove('visible');
    DOM.bookCoverScene.classList.add('fade-out');

    setTimeout(() => {
      DOM.bookCoverScene.classList.add('hidden');
      DOM.bookCoverScene.classList.remove('fade-out');
      DOM.bookOpenScene.classList.remove('hidden');
      DOM.bookOpenScene.style.opacity = '0';

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          DOM.bookOpenScene.style.transition = 'opacity 0.8s ease';
          DOM.bookOpenScene.style.opacity = '1';
        });
      });

      // Show first page
      const firstPage = getPage(1);
      firstPage.classList.add('active');

      DOM.totalPageNum.textContent = TOTAL_PAGES;
      updateNavUI();

      setTimeout(() => {
        DOM.navArrows.classList.add('visible');
        if (DOM.globalCloseBtn) DOM.globalCloseBtn.classList.add('visible');
        state.isTransitioning = false;
        onPageEnter(1);
      }, 900);

    }, 700);
  }, 1200);
}

function closeBook() {
  DOM.bookOpenScene.style.transition = 'opacity 1.2s ease';
  DOM.bookOpenScene.style.opacity = '0';

  setTimeout(() => {
    DOM.bookOpenScene.classList.add('hidden');
    DOM.navArrows.classList.remove('visible');
    if (DOM.globalCloseBtn) DOM.globalCloseBtn.classList.remove('visible');
    state.currentPage = 1;
    state.endingTriggered = false;

    // Reset all pages
    document.querySelectorAll('.book-page').forEach(p => p.classList.remove('active'));

    // Reset ending elements for replay
    document.querySelectorAll('.ending-line').forEach(el => el.classList.remove('visible'));
    const thanks = $('ending-thanks');
    const closeBtn = $('close-book-btn');
    if (thanks) thanks.classList.remove('visible');
    if (closeBtn) closeBtn.classList.remove('visible');

    // Show book cover again
    DOM.book3d.classList.remove('opening');
    DOM.book3d.style.transform = 'rotateY(-10deg) rotateX(4deg)';
    if (DOM.coverHint) DOM.coverHint.style.opacity = '';
    DOM.bookCoverScene.classList.remove('hidden', 'fade-out');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        DOM.bookCoverScene.classList.add('visible');
      });
    });

    // Stop music
    if (state.musicPlaying) toggleMusic();
  }, 1200);
}

function toggleMusic() {
  const audio = DOM.bgAudio;
  // Check if audio source is actually set and valid
  if (!audio || !audio.getAttribute('src')) return;

  if (state.musicPlaying) {
    audio.pause();
    DOM.iconPlay.classList.remove('hidden');
    DOM.iconPause.classList.add('hidden');
    DOM.musicBars.classList.remove('playing');
    state.musicPlaying = false;
  } else {
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        DOM.iconPlay.classList.add('hidden');
        DOM.iconPause.classList.remove('hidden');
        DOM.musicBars.classList.add('playing');
        state.musicPlaying = true;
      }).catch((err) => {
        console.warn('Audio play blocked by browser policy:', err);
      });
    }
  }
}

function initKeyboardNav() {
  document.addEventListener('keydown', (e) => {
    if (!DOM.bookOpenScene.classList.contains('hidden')) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigateNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navigatePrev();
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

function initSwipeNav() {
  let startX = 0;
  let startY = 0;

  document.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - startX;
    const dy = endY - startY;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (DOM.bookOpenScene.classList.contains('hidden')) return;
      if (dx < 0) navigateNext();
      else navigatePrev();
    }
  }, { passive: true });
}

function bindEvents() {
  // Open book on click
  DOM.bookWrapper.addEventListener('click', openBook);

  // Navigation buttons
  DOM.navNext.addEventListener('click', navigateNext);
  DOM.navPrev.addEventListener('click', navigatePrev);

  // Close book
  DOM.closeBookBtn.addEventListener('click', closeBook);
  if (DOM.globalCloseBtn) DOM.globalCloseBtn.addEventListener('click', closeBook);

  // Music toggle
  DOM.musicToggle.addEventListener('click', toggleMusic);
}

function init() {
  // Start particles immediately
  new ParticleSystem(DOM.canvas);

  // Bind all events
  bindEvents();
  initKeyboardNav();
  initSwipeNav();

  // Begin the experience
  runIntroSequence();
}

// Wait for DOM + fonts
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

