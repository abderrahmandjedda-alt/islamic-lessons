/* ═══════════════════════════════════════════════════════════════
   🕌 ISLAMIC LESSONS — MODERN UI LAYER  ·  modern-ui.js
   الحركة الانسيابية، التموّجات، الظهور عند التمرير، الكبسولة العائمة
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─────────────────────────────
     🌊 التموّج (Ripple) لكل زر
  ───────────────────────────── */
  const APP_JS_SELECTOR = '.btn, .btn-primary, .search-btn-circle, .year-card, .subject-card, .back-btn';
  const RIPPLE_SELECTOR = [
    '.btn', '.btn-primary', '.btn-view', '.btn-download', '.back-btn', '.capsule-btn',
    '.nav-cta', '.login-nav-btn', '.logout-nav-btn', '.fav-btn', '.btn-modal', '.copy-btn',
    '.whatsapp-btn', '.pending-btn', '.fav-go-btn', '.fav-remove-btn', '.btn-back-large',
    '.btn-refresh', '.btn-add-file', '.btn-add-teacher', '.btn-icon-sm', '.icon-btn',
    '.theme-btn', '.menu-item', '.year-card', '.subject-card', '.specialization-card',
    '.lesson-card', '.teacher-card', '.btn-upload-submit', '.welcome-btn-primary',
    '.welcome-btn-google', '.google-login-btn', '.my-lesson-btn', '.profile-chip', '.collapsible-chip'
  ].join(',');

  function spawnRipple(target, event) {
    if (!target) return;
    if (!target.classList.contains('ripple-surface')) target.classList.add('ripple-surface');

    const rect = target.getBoundingClientRect();
    const diameter = Math.max(target.clientWidth, target.clientHeight);
    const radius = diameter / 2;
    const circle = document.createElement('span');

    circle.className = 'ripple-wave';
    circle.style.width = circle.style.height = diameter + 'px';
    circle.style.left = (event.clientX - rect.left - radius) + 'px';
    circle.style.top = (event.clientY - rect.top - radius) + 'px';

    const previous = target.querySelector(':scope > .ripple-wave');
    if (previous) previous.remove();

    target.appendChild(circle);
    setTimeout(() => circle.remove(), 800);
  }

  document.addEventListener('pointerdown', function (event) {
    if (reduceMotion || event.button !== 0) return;
    const target = event.target.closest(RIPPLE_SELECTOR);
    if (!target) return;
    if (target.matches(APP_JS_SELECTOR)) return; // app.js يتكفّل بها
    spawnRipple(target, event);
  }, { passive: true });

  /* ─────────────────────────────
     📌 شريط التقدم + شريط علوي لاصق
  ───────────────────────────── */
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  document.body.appendChild(progressBar);

  const navbar = $('.navbar');

  function onScroll() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progressBar.style.width = (ratio * 100) + '%';
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 12);
    const top = $('.to-top');
    if (top) top.classList.toggle('show', window.scrollY > 480);
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  /* ─────────────────────────────
     ⬆️ زر العودة إلى الأعلى
  ───────────────────────────── */
  const toTop = document.createElement('button');
  toTop.className = 'to-top';
  toTop.type = 'button';
  toTop.setAttribute('aria-label', 'العودة إلى الأعلى');
  toTop.innerHTML = '<i data-lucide="arrow-up"></i>';
  document.body.appendChild(toTop);
  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ─────────────────────────────
     ✨ الظهور الانسيابي عند التمرير
  ───────────────────────────── */
  const revealTargets = [
    '.trust', '.auth-card', '.login-box',
    '.contact-card', '.tips-card', '.fav-section', '.profile-card', '.dash-head',
    '.upload-card', '.my-lessons-section', '.teachers-card', '.collapsible-card',
    '.student-notice', '.profile-chip'
  ];

  function tagReveals(root) {
    if (reduceMotion) return;
    revealTargets.forEach(function (selector) {
      $$(selector, root).forEach(function (el) {
        if (el.dataset.reveal !== undefined) return;
        el.dataset.reveal = '';
        el.style.setProperty('--reveal-delay', (el.dataset.delay || 0) + 'ms');
        if (observer) observer.observe(el);
      });
    });
  }

  let observer = null;
  if ('IntersectionObserver' in window && !reduceMotion) {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  }

  /* ─────────────────────────────
     🔢 عدّادات الأرقام
  ───────────────────────────── */
  function animateCounter(el) {
    const target = parseFloat(el.dataset.count || '0');
    if (!isFinite(target)) return;
    if (reduceMotion) { el.textContent = String(target); return; }

    const duration = 1300;
    const start = performance.now();
    const from = 0;

    function frame(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (target - from) * eased).toString();
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function initCounters() {
    const counters = $$('[data-count]');
    if (!counters.length) return;
    if (!('IntersectionObserver' in window)) { counters.forEach(animateCounter); return; }

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    counters.forEach(c => io.observe(c));
  }

  /* ─────────────────────────────
     📊 أرقام إحصاءات حقيقية (إن توفّرت data.js)
  ───────────────────────────── */
  function fillRealStats() {
    try {
      if (typeof YEARS === 'undefined' || typeof SPECIALIZATIONS === 'undefined') return;
      const years = YEARS.length;
      let specs = 0;
      let subjects = 0;
      Object.keys(SPECIALIZATIONS).forEach(function (yearId) {
        const list = SPECIALIZATIONS[yearId] || [];
        specs += list.length;
        list.forEach(function (spec) {
          const arr = (typeof SUBJECTS !== 'undefined' && SUBJECTS[yearId] && SUBJECTS[yearId][spec]) || [];
          subjects += arr.length;
        });
      });
      const map = { years: years, specs: specs, subjects: subjects };
      $$('[data-stat]').forEach(function (el) {
        const key = el.dataset.stat;
        if (map[key]) el.dataset.count = String(map[key]);
      });
    } catch (err) { /* تجاهل */ }
  }

  /* ─────────────────────────────
     🔎 كبسولة البحث العائمة
  ───────────────────────────── */
  function initSearchCapsule() {
    const yearSelect = $('#quickYearFilter');
    const specSelect = $('#quickSpecFilter');
    const searchInput = $('#searchInput');
    const actionBtn = $('#searchActionBtn');

    if (yearSelect) {
      yearSelect.innerHTML = '<option value="">كل السنوات</option>';
      if (typeof YEARS !== 'undefined') {
        YEARS.forEach(function (year) {
          const opt = document.createElement('option');
          opt.value = year.id;
          opt.textContent = year.name;
          yearSelect.appendChild(opt);
        });
      }

      yearSelect.addEventListener('change', function () {
        const yearId = yearSelect.value;
        if (!specSelect) return;

        specSelect.innerHTML = '<option value="">كل التخصصات</option>';
        const specs = (typeof SPECIALIZATIONS !== 'undefined' && SPECIALIZATIONS[yearId]) || [];
        specs.forEach(function (spec) {
          const opt = document.createElement('option');
          opt.value = spec;
          opt.textContent = spec;
          specSelect.appendChild(opt);
        });
        specSelect.disabled = specs.length === 0;
      });
    }

    if (specSelect) {
      specSelect.disabled = true;
      specSelect.addEventListener('change', function () {
        const spec = specSelect.value;
        if (!spec || typeof selectSpecialization !== 'function') return;
        selectSpecialization(spec);
        const section = document.getElementById('subjectsSection');
        if (section) {
          setTimeout(function () {
            window.scrollTo({ top: section.offsetTop - 90, behavior: reduceMotion ? 'auto' : 'smooth' });
          }, 120);
        }
      });
    }

    if (searchInput && actionBtn) {
      actionBtn.addEventListener('click', function (event) {
        event.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          setTimeout(function () {
            const section = document.getElementById('searchResultsSection');
            if (section) window.scrollTo({ top: section.offsetTop - 90, behavior: reduceMotion ? 'auto' : 'smooth' });
          }, 120);
        } else {
          searchInput.focus();
        }
      });

      searchInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          actionBtn.click();
        }
      });
    }
  }

  /* ─────────────────────────────
     🧭 تمييز رابط الصفحة الحالية
  ───────────────────────────── */
  function markActiveNav() {
    const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    $$('.nav-link').forEach(function (link) {
      const href = (link.getAttribute('href') || '').split('?')[0].toLowerCase();
      const isHome = (current === '' || current === 'index.html') && (href === 'index.html' || href === './' || href === '/');
      link.classList.toggle('is-active', href === current || isHome);
    });
  }

  /* ─────────────────────────────
     🚀 انتقال ناعم بين الصفحات
  ───────────────────────────── */
  function initPageTransitions() {
    const veil = document.createElement('div');
    veil.className = 'page-veil';
    document.body.appendChild(veil);

    document.addEventListener('click', function (event) {
      if (reduceMotion || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = event.target.closest('a[href]');
      if (!link) return;
      if (link.target === '_blank' || link.hasAttribute('download')) return;

      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return;
      if (!/\.html?$|\/$/.test(url.pathname)) return;

      event.preventDefault();
      document.body.classList.add('page-leaving');
      setTimeout(function () { window.location.href = url.href; }, 320);
    });

    window.addEventListener('pageshow', function () {
      document.body.classList.remove('page-leaving');
    });
  }

  /* ─────────────────────────────
     🎈 حركة ضوء الهيرو مع المؤشر
  ───────────────────────────── */
  function initHeroParallax() {
    const hero = $('.hero-card');
    if (!hero || reduceMotion || window.matchMedia('(hover: none)').matches) return;

    const glow = $('.hero-glow', hero);
    if (!glow) return;

    let frame = null;
    hero.addEventListener('pointermove', function (event) {
      if (frame) return;
      frame = requestAnimationFrame(function () {
        frame = null;
        const rect = hero.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 60;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 40;
        glow.style.translate = x + 'px ' + y + 'px';
      });
    });

    hero.addEventListener('pointerleave', function () {
      glow.style.translate = '0px 0px';
    });
  }

  /* ─────────────────────────────
     ☰ قائمة الجوال (تُضاف تلقائياً)
  ───────────────────────────── */
  function initMobileNav() {
    if (document.getElementById('menuDropdown')) return;

    const nav = document.querySelector('.nav-menu');
    if (!nav) return;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'menuToggle';
    toggle.className = 'icon-btn menu-toggle';
    toggle.setAttribute('aria-label', 'القائمة');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<i data-lucide="menu"></i>';

    const dropdown = document.createElement('div');
    dropdown.id = 'menuDropdown';
    dropdown.className = 'menu-dropdown';

    const items = [
      ['index.html', 'house', 'الرئيسية'],
      ['teachers.html', 'users', 'هيئة التدريس'],
      ['favorites.html', 'star', 'مفضلتي'],
      ['contact.html', 'phone', 'تواصل مع الإدارة'],
      ['student.html', 'graduation-cap', 'بوابة الطلبة'],
      ['teacher.html', 'presentation', 'بوابة الأساتذة']
    ];

    dropdown.innerHTML = items.map(function (item) {
      return '<a href="' + item[0] + '" class="menu-item">' +
        '<span class="menu-icon"><i data-lucide="' + item[1] + '"></i></span>' +
        '<span>' + item[2] + '</span></a>';
    }).join('');

    nav.appendChild(toggle);
    nav.appendChild(dropdown);

    if (window.lucide) window.lucide.createIcons();

    function close() {
      dropdown.classList.remove('open');
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function (event) {
      event.stopPropagation();
      const isOpen = dropdown.classList.toggle('open');
      toggle.classList.toggle('active', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    dropdown.addEventListener('click', function (event) { event.stopPropagation(); });
    document.addEventListener('click', close);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') close();
    });
  }

  /* ─────────────────────────────
     ▾ قوائم منسدلة مخصّصة (بدل القوائم الافتراضية)
  ───────────────────────────── */
  function closeAllCustomSelects(except) {
    $$('.cselect.open').forEach(function (wrap) {
      if (wrap === except) return;
      wrap.classList.remove('open');
      const trigger = wrap.querySelector('.cselect-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  }

  function buildCustomSelect(select) {
    select.dataset.customReady = '1';

    const wrap = document.createElement('div');
    wrap.className = 'cselect';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'cselect-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const valueEl = document.createElement('span');
    valueEl.className = 'cselect-value';
    trigger.appendChild(valueEl);

    const menu = document.createElement('div');
    menu.className = 'cselect-menu';
    menu.setAttribute('role', 'listbox');

    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    wrap.appendChild(trigger);
    wrap.appendChild(menu);
    select.setAttribute('tabindex', '-1');

    let open = false;

    function syncLabel() {
      const selected = select.options[select.selectedIndex];
      valueEl.textContent = selected ? selected.textContent.trim() : '';
      wrap.classList.toggle('disabled', select.disabled);
      trigger.disabled = select.disabled;
    }

    function renderMenu() {
      menu.innerHTML = '';
      Array.prototype.forEach.call(select.options, function (opt) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'cselect-option';
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', opt.selected ? 'true' : 'false');
        item.dataset.value = opt.value;
        item.disabled = opt.disabled;
        item.textContent = opt.textContent;
        item.addEventListener('click', function () { choose(opt.value); });
        menu.appendChild(item);
      });
    }

    function choose(value) {
      if (select.value !== value) {
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      syncLabel();
      close();
      trigger.focus();
    }

    function openMenu() {
      if (select.disabled || open) return;
      closeAllCustomSelects(wrap);
      renderMenu();
      open = true;
      wrap.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');

      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 14;
      const spaceAbove = rect.top - 14;
      const openUp = spaceBelow < 300 && spaceAbove > spaceBelow;

      wrap.classList.toggle('up', openUp);
      menu.style.maxHeight = Math.min(286, Math.max(150, openUp ? spaceAbove : spaceBelow)) + 'px';

      requestAnimationFrame(function () {
        const current = menu.querySelector('[aria-selected="true"]');
        if (current) {
          menu.scrollTop = current.offsetTop - (menu.clientHeight / 2) + (current.offsetHeight / 2);
        } else {
          menu.scrollTop = 0;
        }
      });
    }

    function close() {
      open = false;
      wrap.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', function (event) {
      event.stopPropagation();
      if (open) close(); else openMenu();
    });

    trigger.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!open) openMenu();
        const items = $$('.cselect-option:not(:disabled)', menu);
        if (items.length) items[event.key === 'ArrowDown' ? 0 : items.length - 1].focus();
      } else if (event.key === 'Escape') {
        close();
      }
    });

    menu.addEventListener('keydown', function (event) {
      const items = $$('.cselect-option:not(:disabled)', menu);
      const index = items.indexOf(document.activeElement);
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (items[index + 1]) items[index + 1].focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (items[index - 1]) items[index - 1].focus();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        close();
        trigger.focus();
      } else if (event.key === 'Tab') {
        close();
      }
    });

    select.addEventListener('change', syncLabel);

    if ('MutationObserver' in window) {
      const mo = new MutationObserver(function () {
        syncLabel();
        if (open) renderMenu();
      });
      mo.observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    }

    syncLabel();
  }

  function initCustomSelects() {
    $$('select').forEach(function (select) {
      if (select.dataset.customReady === '1' || select.closest('.cselect')) return;
      buildCustomSelect(select);
    });
  }

  /* ─────────────────────────────
     🌊 انبثاق البطاقات عند دخولها الشاشة
  ───────────────────────────── */
  function initCardWave() {
    const CARD = '.year-card, .specialization-card, .subject-card, .lesson-card, .teacher-card';
    const all = function () { return $$(CARD); };

    if (!('IntersectionObserver' in window)) {
      all().forEach(function (card) { card.classList.add('wave-play'); });
      return;
    }

    function play(card) {
      if (card.dataset.wavePlayed === '1') return;
      card.dataset.wavePlayed = '1';
      const parent = card.parentElement;
      const index = parent ? Array.prototype.indexOf.call(parent.children, card) : 0;
      card.style.animationDelay = ((index % 5) * 80) + 'ms';
      card.classList.add('wave-play');
    }

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        play(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    function observeAll() {
      all().forEach(function (card) {
        if (card.dataset.waveObs === '1' || card.dataset.wavePlayed === '1') return;
        card.dataset.waveObs = '1';
        io.observe(card);
      });
    }

    observeAll();

    function checkVisible() {
      all().forEach(function (card) {
        if (card.dataset.wavePlayed === '1') return;
        const rect = card.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight * 0.92) play(card);
      });
    }

    window.addEventListener('scroll', checkVisible, { passive: true });
    window.addEventListener('resize', checkVisible, { passive: true });
    setInterval(checkVisible, 400);

    if ('MutationObserver' in window) {
      new MutationObserver(observeAll).observe(document.body, { childList: true, subtree: true });
    }
  }

  /* ─────────────────────────────
     🏁 التشغيل
  ───────────────────────────── */
  function init() {
    markActiveNav();
    initMobileNav();
    initCardWave();
    fillRealStats();
    tagReveals(document);
    initCounters();
    initSearchCapsule();
    initCustomSelects();
    document.addEventListener('click', function () { closeAllCustomSelects(null); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeAllCustomSelects(null);
    });
    initPageTransitions();
    initHeroParallax();
    onScroll();

    // شبكة أمان: أي عنصر ظاهر في الشاشة يظهر حتى لو تأخّر المراقب
    setTimeout(function () {
      $$('[data-reveal]:not(.in-view)').forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight * 1.15) el.classList.add('in-view');
      });
    }, 900);

    // العناصر التي تُضاف ديناميكياً (بطاقات، قوائم...)
    if ('MutationObserver' in window) {
      let scheduled = false;
      const mo = new MutationObserver(function () {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(function () {
          scheduled = false;
          tagReveals(document);
        });
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
