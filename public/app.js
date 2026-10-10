// ═══════════════════════════════════════════════
// ⚙️ YEARS, SPECIALIZATIONS, SUBJECTS في data.js
// ═══════════════════════════════════════════════

const API = '/api';
let allLessons = [];

// ═══════════════════════════════════════════════
// 🎨 نظام الأيقونات (Lucide)
// ═══════════════════════════════════════════════
// icon('star') يرجع كود أيقونة، وتتحول تلقائياً إلى رسمة SVG
function icon(name, cls) {
  return `<i data-lucide="${name}"${cls ? ` class="${cls}"` : ''}></i>`;
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

// مراقب: كلما أُضيف محتوى جديد للصفحة (دروس، بطاقات...) يحوّل أيقوناته تلقائياً
(function watchIcons() {
  if (!window.lucide) return;
  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      refreshIcons();
    });
  }).observe(document.body, { childList: true, subtree: true });
  refreshIcons();
})();

// أيقونة كل سنة دراسية (بدل الإيموجي القديمة في data.js)
const YEAR_ICONS = {
  L1: 'sprout',
  L2: 'book-open',
  L3: 'library',
  M1: 'graduation-cap',
  M2: 'award'
};

// ═══════════════════════════════════════════════
// ⭐ نظام المفضلة (localStorage)
// ═══════════════════════════════════════════════
const FAVORITES_KEY = 'islamic_lessons_favorites';

// قراءة المفضلة
function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || {
      specializations: [],
      lessons: []
    };
  } catch (err) {
    return { specializations: [], lessons: [] };
  }
}

// حفظ المفضلة
function saveFavorites(favs) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  } catch (err) {
    console.error('خطأ في حفظ المفضلة:', err);
  }
}

// إضافة/إزالة تخصص من المفضلة
function toggleFavoriteSpecialization(yearId, spec) {
  const favs = getFavorites();
  const key = `${yearId}|${spec}`;
  const index = favs.specializations.findIndex(f => `${f.year}|${f.spec}` === key);
  
  if (index >= 0) {
    favs.specializations.splice(index, 1);
    showToast('تمت الإزالة من المفضلة', 'trash-2');
  } else {
    favs.specializations.push({ year: yearId, spec });
    showToast('تمت الإضافة للمفضلة', 'star');
  }
  
  saveFavorites(favs);
  return index < 0; // true إذا أُضيف
}

// إضافة/إزالة درس من المفضلة
function toggleFavoriteLesson(lessonId) {
  const favs = getFavorites();
  const index = favs.lessons.findIndex(id => id === lessonId);
  
  if (index >= 0) {
    favs.lessons.splice(index, 1);
    showToast('تمت الإزالة من المفضلة', 'trash-2');
  } else {
    favs.lessons.push(lessonId);
    showToast('تمت الإضافة للمفضلة', 'heart');
  }
  
  saveFavorites(favs);
  return index < 0; // true إذا أُضيف
}

// هل التخصص في المفضلة؟
function isSpecFavorite(yearId, spec) {
  const favs = getFavorites();
  return favs.specializations.some(f => f.year === yearId && f.spec === spec);
}

// هل الدرس في المفضلة؟
function isLessonFavorite(lessonId) {
  const favs = getFavorites();
  return favs.lessons.includes(lessonId);
}

// ═══════════════════════════════════════════════
// 🌙 الوضع الليلي
// ═══════════════════════════════════════════════
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// أيقونة الزر: قمر في الوضع النهاري، شمس في الوضع الليلي
// (إن لم تُحمَّل مكتبة الأيقونات في الصفحة نستعمل الإيموجي القديمة مؤقتاً)
function setThemeIcon(theme) {
  if (window.lucide) {
    themeToggle.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
    refreshIcons();
  } else {
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}
setThemeIcon(savedTheme);

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  setThemeIcon(next);
});

// ═══════════════════════════════════════════════
// 🔄 جلب الدروس
// ═══════════════════════════════════════════════
async function fetchLessons() {
  try {
    const res = await fetch(`${API}/lessons`);
    allLessons = await res.json();
  } catch (err) {
    allLessons = [];
  }
}

// ═══════════════════════════════════════════════
// 🎯 إظهار/إخفاء الأقسام
// ═══════════════════════════════════════════════
function hideAllSections() {
  document.getElementById('yearsSection').style.display = 'none';
  document.getElementById('specializationsSection').style.display = 'none';
  document.getElementById('subjectsSection').style.display = 'none';
  document.getElementById('lessonsSection').style.display = 'none';
  document.getElementById('searchResultsSection').style.display = 'none';
}

// ═══════════════════════════════════════════════
// 🏠 الصفحة الرئيسية
// ═══════════════════════════════════════════════
function goHome() {
  hideAllSections();
  document.getElementById('yearsSection').style.display = 'block';
  document.getElementById('breadcrumb').innerHTML = '';
  renderYears();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderYears() {
  const grid = document.getElementById('yearsGrid');
  grid.innerHTML = YEARS.map(y => {
    const specs = SPECIALIZATIONS[y.id] || [];
    return `
      <div class="year-card" onclick="selectYear('${y.id}')">
        <span class="year-icon">${icon(YEAR_ICONS[y.id] || 'book-open')}</span>
        <h4>${y.name}</h4>
        <span class="count">${specs.length} تخصص</span>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════
// 📅 اختيار السنة
// ═══════════════════════════════════════════════
let currentYear = null;
let currentSpecialization = null;
let currentSubject = null;

function selectYear(yearId) {
  currentYear = yearId;
  hideAllSections();
  document.getElementById('specializationsSection').style.display = 'block';
  
  const yearObj = YEARS.find(y => y.id === yearId);
  document.getElementById('specTitle').textContent = `تخصصات ${yearObj.name}`;
  document.getElementById('breadcrumb').innerHTML = `
    <span onclick="goHome()" class="crumb-link">${icon('landmark')} الرئيسية</span>
    <span class="crumb-sep">›</span>
    <span class="crumb-current">${yearObj.name}</span>
  `;
  
  renderSpecializations(yearId);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderSpecializations(yearId) {
  const grid = document.getElementById('specializationsGrid');
  const specs = SPECIALIZATIONS[yearId] || [];
  
  if (!specs.length) {
    grid.innerHTML = '<p class="empty">لا توجد تخصصات في هذه السنة بعد.</p>';
    return;
  }
  
  grid.innerHTML = specs.map(spec => {
    const subjects = (SUBJECTS[yearId] && SUBJECTS[yearId][spec]) || [];
    const lessonsCount = allLessons.filter(l => 
      l.year === yearId && l.specialization === spec
    ).length;
    
    const isFav = isSpecFavorite(yearId, spec);
    const specEscaped = spec.replace(/'/g, "\\'");
    
    return `
      <div class="specialization-card">
        <div class="spec-header" onclick="selectSpecialization('${specEscaped}')">
          <span class="spec-icon">${icon('graduation-cap')}</span>
          <h4>${spec}</h4>
        </div>
        <div class="spec-meta">
          <span>${icon('library')} ${subjects.length} مادة</span>
          <span>${icon('file-text')} ${lessonsCount} درس</span>
          <button class="fav-btn ${isFav ? 'active' : ''}" 
                  onclick="handleSpecFavorite(event, '${yearId}', '${specEscaped}')"
                  title="${isFav ? 'إزالة من المفضلة' : 'أضف للمفضلة'}">
            ${icon('star')}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// معالج زر المفضلة للتخصص
function handleSpecFavorite(event, yearId, spec) {
  event.stopPropagation();
  const added = toggleFavoriteSpecialization(yearId, spec);
  
  // تحديث الزر مباشرة (النجمة تمتلئ عند التفعيل عبر CSS)
  const btn = event.currentTarget;
  btn.classList.toggle('active', added);
  btn.title = added ? 'إزالة من المفضلة' : 'أضف للمفضلة';
}

// ═══════════════════════════════════════════════
// 🎓 اختيار التخصص
// ═══════════════════════════════════════════════
function selectSpecialization(spec) {
  currentSpecialization = spec;
  hideAllSections();
  document.getElementById('subjectsSection').style.display = 'block';
  
  const yearObj = YEARS.find(y => y.id === currentYear);
  document.getElementById('subjectTitle').textContent = `مواد ${spec}`;
  document.getElementById('breadcrumb').innerHTML = `
    <span onclick="goHome()" class="crumb-link">${icon('landmark')} الرئيسية</span>
    <span class="crumb-sep">›</span>
    <span onclick="selectYear('${currentYear}')" class="crumb-link">${yearObj.name}</span>
    <span class="crumb-sep">›</span>
    <span class="crumb-current">${spec}</span>
  `;
  
  renderSubjects();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderSubjects() {
  const grid = document.getElementById('subjectsGrid');
  const subjects = (SUBJECTS[currentYear] && SUBJECTS[currentYear][currentSpecialization]) || [];
  
  if (!subjects.length) {
    grid.innerHTML = '<p class="empty">لا توجد مواد في هذا التخصص بعد.</p>';
    return;
  }
  
  grid.innerHTML = subjects.map(sub => {
    const subName = typeof sub === 'string' ? sub : sub.name;
    
    const lessonsCount = allLessons.filter(l => 
      l.year === currentYear && 
      l.specialization === currentSpecialization && 
      l.subject === subName
    ).length;
    
    return `
      <div class="subject-card" onclick="selectSubject('${subName.replace(/'/g, "\\'")}')">
        <span class="icon">${icon('book-open')}</span>
        <h4>${subName}</h4>
        <span class="count">${lessonsCount} درس</span>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════
// 📚 اختيار المادة
// ═══════════════════════════════════════════════
function selectSubject(subName) {
  currentSubject = subName;
  hideAllSections();
  document.getElementById('lessonsSection').style.display = 'block';
  
  const yearObj = YEARS.find(y => y.id === currentYear);
  document.getElementById('lessonsTitle').textContent = `دروس ${subName}`;
  document.getElementById('breadcrumb').innerHTML = `
    <span onclick="goHome()" class="crumb-link">${icon('landmark')} الرئيسية</span>
    <span class="crumb-sep">›</span>
    <span onclick="selectYear('${currentYear}')" class="crumb-link">${yearObj.name}</span>
    <span class="crumb-sep">›</span>
    <span onclick="selectSpecialization('${currentSpecialization.replace(/'/g, "\\'")}')" class="crumb-link">${currentSpecialization}</span>
    <span class="crumb-sep">›</span>
    <span class="crumb-current">${subName}</span>
  `;
  
  const filtered = allLessons.filter(l => 
    l.year === currentYear && 
    l.specialization === currentSpecialization && 
    l.subject === subName
  );
  renderLessons(filtered, 'lessonsGrid', 'emptyMsg');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ═══════════════════════════════════════════════
// 🔙 الرجوع
// ═══════════════════════════════════════════════
function backToSpecializations() {
  selectYear(currentYear);
}
function backToSubjects() {
  selectSpecialization(currentSpecialization);
}

// ═══════════════════════════════════════════════
// 📄 عرض الدروس
// ═══════════════════════════════════════════════
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function renderLessons(lessons, gridId, emptyId) {
  const grid = document.getElementById(gridId);
  const empty = document.getElementById(emptyId);
  
  if (!lessons.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  
  grid.innerHTML = lessons.map(l => {
    const isFav = isLessonFavorite(l.id);
    return `
      <div class="lesson-card">
        <div class="lesson-header">
          <h4>${escapeHtml(l.title)}</h4>
          <div class="lesson-badges">
            <span class="file-badge ${l.type === 'pdf' ? 'pdf' : 'doc'}">
              ${l.type.toUpperCase()}
            </span>
            <button class="fav-btn lesson-fav ${isFav ? 'active' : ''}" 
                    onclick="handleLessonFavorite(event, '${l.id}')"
                    title="${isFav ? 'إزالة الإعجاب' : 'أعجبني'}">
              ${icon('heart')}
            </button>
          </div>
        </div>
        ${l.description ? `<p class="lesson-desc">${escapeHtml(l.description)}</p>` : ''}
        <div class="lesson-meta">
          <span>${icon('calendar')} ${formatDate(l.date)}</span>
          <span>${icon('hard-drive')} ${formatSize(l.size)}</span>
        </div>
        <div class="lesson-actions">
          <a href="${l.url}" target="_blank" class="btn btn-view">${icon('eye')} فتح</a>
          <a href="${l.url}" download="${escapeHtml(l.filename)}" class="btn btn-download">${icon('download')} تحميل</a>
        </div>
      </div>
    `;
  }).join('');
}

// معالج زر الإعجاب للدرس
function handleLessonFavorite(event, lessonId) {
  event.stopPropagation();
  const added = toggleFavoriteLesson(lessonId);
  
  // (القلب يمتلئ عند التفعيل عبر CSS)
  const btn = event.currentTarget;
  btn.classList.toggle('active', added);
  btn.title = added ? 'إزالة الإعجاب' : 'أعجبني';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ═══════════════════════════════════════════════
// 🔎 البحث (محمي - يعمل فقط في index.html)
// ═══════════════════════════════════════════════
const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    
    if (!q) {
      goHome();
      return;
    }
    
    hideAllSections();
    document.getElementById('searchResultsSection').style.display = 'block';
    document.getElementById('breadcrumb').innerHTML = `
      <span onclick="goHome()" class="crumb-link">${icon('landmark')} الرئيسية</span>
      <span class="crumb-sep">›</span>
      <span class="crumb-current">نتائج البحث</span>
    `;
    
    const filtered = allLessons.filter(l =>
      (l.title || '').toLowerCase().includes(q) ||
      (l.subject || '').toLowerCase().includes(q) ||
      (l.specialization || '').toLowerCase().includes(q) ||
      (l.year || '').toLowerCase().includes(q) ||
      (l.description || '').toLowerCase().includes(q) ||
      (l.filename || '').toLowerCase().includes(q)
    );
    
    renderLessons(filtered, 'searchResultsGrid', 'searchEmptyMsg');
  });
}

// ═══════════════════════════════════════════════
// 🚀 بدء التطبيق
// ═══════════════════════════════════════════════
const homeBtn = document.getElementById('homeBtn');
if (homeBtn) {
  homeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const si = document.getElementById('searchInput');
    if (si) si.value = '';
    goHome();
  });
}

// ═══════════════════════════════════════════════
// 💬 إشعار Toast
// ═══════════════════════════════════════════════
// iconName اختياري: اسم أيقونة تظهر بجانب الرسالة
function showToast(message, iconName) {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.innerHTML = (iconName && window.lucide ? icon(iconName) : '') + '<span></span>';
  toast.querySelector('span').textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ═══════════════════════════════════════════════
// ☰ القائمة المنسدلة
// ═══════════════════════════════════════════════
(function initMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const menuDropdown = document.getElementById('menuDropdown');
  
  if (!menuToggle || !menuDropdown) return;
  
  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menuDropdown.classList.toggle('open');
    menuToggle.classList.toggle('active', isOpen);
  });
  
  menuDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  document.addEventListener('click', () => {
    if (menuDropdown.classList.contains('open')) {
      menuDropdown.classList.remove('open');
      menuToggle.classList.remove('active');
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuDropdown.classList.contains('open')) {
      menuDropdown.classList.remove('open');
      menuToggle.classList.remove('active');
    }
  });
  
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) return;
    if (menuDropdown.classList.contains('open')) {
      menuDropdown.classList.remove('open');
      menuToggle.classList.remove('active');
    }
  });
})();

// ═══════════════════════════════════════════════
// 🚀 تشغيل التطبيق
// ═══════════════════════════════════════════════
(async () => {
  await fetchLessons();
  
  // ═══════════════════════════════════════════════
  // 🔗 التحقق من طلب الانتقال من صفحة المفضلة
  // ═══════════════════════════════════════════════
  const gotoYear = sessionStorage.getItem('goto_year');
  const gotoSpec = sessionStorage.getItem('goto_spec');
  
  if (gotoYear && gotoSpec) {
    // مسح الطلب بعد القراءة
    sessionStorage.removeItem('goto_year');
    sessionStorage.removeItem('goto_spec');
    
    // الانتقال إلى التخصص مباشرة
    currentYear = gotoYear;
    currentSpecialization = gotoSpec;
    
    // إظهار قسم المواد
    hideAllSections();
    document.getElementById('subjectsSection').style.display = 'block';
    
    const yearObj = YEARS.find(y => y.id === gotoYear);
    const yearName = yearObj ? yearObj.name : gotoYear;
    
    document.getElementById('subjectTitle').textContent = `مواد ${gotoSpec}`;
    document.getElementById('breadcrumb').innerHTML = `
      <span onclick="goHome()" class="crumb-link">${icon('landmark')} الرئيسية</span>
      <span class="crumb-sep">›</span>
      <span onclick="selectYear('${gotoYear}')" class="crumb-link">${yearName}</span>
      <span class="crumb-sep">›</span>
      <span class="crumb-current">${gotoSpec}</span>
    `;
    
    renderSubjects();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log('✅ تم الانتقال إلى:', gotoSpec);
  } else {
    // الصفحة الرئيسية العادية
    goHome();
  }
})();

// ═══════════════════════════════════════════════
// 🔐 إظهار لوحة التحكم بعد الضغط على الشعار 5 مرات
// ═══════════════════════════════════════════════
(function () {
  const logo = document.getElementById('secretLogo');
  const adminBtn = document.getElementById('adminBtn');
  if (!logo || !adminBtn) return;

  // إن كان ظاهراً من قبل في هذه الجلسة، أظهره مباشرة
  if (sessionStorage.getItem('showAdmin') === '1') {
    adminBtn.classList.remove('admin-hidden');
  }

  let clicks = 0;
  let timer;

  logo.addEventListener('click', function () {
    clicks++;
    clearTimeout(timer);
    // إن توقفت عن الضغط ثانيتين يبدأ العدّ من جديد
    timer = setTimeout(() => { clicks = 0; }, 2000);

    if (clicks >= 5) {
      adminBtn.classList.remove('admin-hidden');
      sessionStorage.setItem('showAdmin', '1');
      clicks = 0;
    }
  });
})();