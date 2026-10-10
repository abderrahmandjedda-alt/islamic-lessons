// ═══════════════════════════════════════════════
// 🤲 الأذكار - إشعار صغير يظهر 3 ثواني
// ═══════════════════════════════════════════════

// ✏️ معدّل: الأيقونات صارت أسماء Lucide بدل الإيموجي
//   sparkles  = التسبيح والذكر
//   book-open = آيات القرآن
//   hand-heart = الأدعية
const ADHKAR = [
  { icon: 'sparkles', text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', source: 'رواه البخاري ومسلم' },
  { icon: 'sparkles', text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', source: 'كنز من كنوز الجنة' },
  { icon: 'sparkles', text: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ', source: 'ذكر مأثور' },
  { icon: 'sparkles', text: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', source: 'الصلاة على النبي ﷺ' },
  { icon: 'sparkles', text: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ', source: 'الباقيات الصالحات' },
  { icon: 'sparkles', text: 'لَا إِلَٰهَ إِلَّا اللَّهُ', source: 'أفضل الذكر' },
  { icon: 'book-open', text: 'وَقُل رَّبِّ زِدْنِي عِلْمًا', source: 'سورة طه — 114' },
  { icon: 'book-open', text: 'رَبِّ اشْرَحْ لِي صَدْرِي', source: 'سورة طه — 25' },
  { icon: 'book-open', text: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً', source: 'سورة البقرة — 201' },
  { icon: 'book-open', text: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', source: 'سورة آل عمران — 173' },
  { icon: 'book-open', text: 'وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ', source: 'سورة هود — 88' },
  { icon: 'hand-heart', text: 'اللَّهُمَّ زِدْنِي عِلْمًا نَافِعًا', source: 'دعاء مأثور' },
  { icon: 'hand-heart', text: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ', source: 'رواه أبو داود' },
  { icon: 'hand-heart', text: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا', source: 'سورة آل عمران — 8' },
  { icon: 'hand-heart', text: 'اللَّهُمَّ بَارِكْ لَنَا فِي أَعْمَارِنَا', source: 'دعاء مأثور' }
];

// ✏️ جديد: بديل احتياطي (إيموجي) للصفحات التي لم تُحمَّل فيها مكتبة الأيقونات بعد
const ADHKAR_ICON_FALLBACK = {
  'sparkles': '📿',
  'book-open': '📖',
  'hand-heart': '🤲'
};

// ═══════════════════════════════════════════════
// 🚀 التشغيل
// ═══════════════════════════════════════════════
const SESSION_KEY = 'adhkarShown_' + new Date().toDateString();

if (!sessionStorage.getItem(SESSION_KEY)) {
  sessionStorage.setItem(SESSION_KEY, 'true');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
}

function run() {
  setTimeout(function() {
    const dhikr = ADHKAR[Math.floor(Math.random() * ADHKAR.length)];
    showAdhkar(dhikr);
  }, 300);
}

function showAdhkar(dhikr) {
  const existing = document.getElementById('adhkarNotify');
  if (existing) existing.remove();

  const notify = document.createElement('div');
  notify.id = 'adhkarNotify';
  notify.className = 'adhkar-notify';

  // ✏️ معدّل: أيقونة Lucide إن توفرت المكتبة، وإلا الإيموجي القديمة
  const hasLucide = !!window.lucide;
  const iconHtml = hasLucide
    ? '<i data-lucide="' + dhikr.icon + '"></i>'
    : (ADHKAR_ICON_FALLBACK[dhikr.icon] || '📿');
  const closeHtml = hasLucide ? '<i data-lucide="x"></i>' : '✖';

  notify.innerHTML =
    '<div class="adhkar-notify-icon">' + iconHtml + '</div>' +
    '<div class="adhkar-notify-content">' +
      '<div class="adhkar-notify-text">' + dhikr.text + '</div>' +
      '<div class="adhkar-notify-source">' + dhikr.source + '</div>' +
    '</div>' +
    '<button class="adhkar-notify-close" aria-label="إغلاق">' + closeHtml + '</button>';

  document.body.appendChild(notify);
  if (hasLucide) window.lucide.createIcons();

  // زر الإغلاق
  notify.querySelector('.adhkar-notify-close').addEventListener('click', function() {
    hideAdhkar(notify);
  });

  // ظهور
  setTimeout(function() {
    notify.classList.add('visible');
  }, 50);

  // إخفاء تلقائي بعد 3 ثواني
  setTimeout(function() {
    hideAdhkar(notify);
  }, 3000);
}

function hideAdhkar(el) {
  if (!el || !el.parentNode) return;
  el.classList.remove('visible');
  setTimeout(function() {
    if (el.parentNode) el.remove();
  }, 400);
}