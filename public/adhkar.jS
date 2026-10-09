// ═══════════════════════════════════════════════
// 🤲 الأذكار - إشعار صغير يظهر 2 ثواني
// ═══════════════════════════════════════════════

const ADHKAR = [
  { icon: '📿', text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', source: 'رواه البخاري ومسلم' },
  { icon: '📿', text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', source: 'كنز من كنوز الجنة' },
  { icon: '📿', text: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ', source: 'ذكر مأثور' },
  { icon: '📿', text: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', source: 'الصلاة على النبي ﷺ' },
  { icon: '📿', text: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ', source: 'الباقيات الصالحات' },
  { icon: '📿', text: 'لَا إِلَٰهَ إِلَّا اللَّهُ', source: 'أفضل الذكر' },
  { icon: '📖', text: 'وَقُل رَّبِّ زِدْنِي عِلْمًا', source: 'سورة طه — 114' },
  { icon: '📖', text: 'رَبِّ اشْرَحْ لِي صَدْرِي', source: 'سورة طه — 25' },
  { icon: '📖', text: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً', source: 'سورة البقرة — 201' },
  { icon: '📖', text: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', source: 'سورة آل عمران — 173' },
  { icon: '📖', text: 'وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ', source: 'سورة هود — 88' },
  { icon: '🤲', text: 'اللَّهُمَّ زِدْنِي عِلْمًا نَافِعًا', source: 'دعاء مأثور' },
  { icon: '🤲', text: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ', source: 'رواه أبو داود' },
  { icon: '🤲', text: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا', source: 'سورة آل عمران — 8' },
  { icon: '🤲', text: 'اللَّهُمَّ بَارِكْ لَنَا فِي أَعْمَارِنَا', source: 'دعاء مأثور' }
];

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

  notify.innerHTML =
    '<div class="adhkar-notify-icon">' + dhikr.icon + '</div>' +
    '<div class="adhkar-notify-content">' +
      '<div class="adhkar-notify-text">' + dhikr.text + '</div>' +
      '<div class="adhkar-notify-source">' + dhikr.source + '</div>' +
    '</div>' +
    '<button class="adhkar-notify-close" aria-label="إغلاق">✖</button>';

  document.body.appendChild(notify);

  // زر الإغلاق
  notify.querySelector('.adhkar-notify-close').addEventListener('click', function() {
    hideAdhkar(notify);
  });

  // ظهور
  setTimeout(function() {
    notify.classList.add('visible');
  }, 50);

  // ✅ إخفاء تلقائي بعد 2 ثواني
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