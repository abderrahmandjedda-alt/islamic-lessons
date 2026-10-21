'use strict';

// ═══════════════════════════════════════════════
// ⚙️ الإعدادات العامة
// ═══════════════════════════════════════════════
const API = '/api';
let allLessons = [];
const FAVORITES_KEY = 'islamic_lessons_favorites';

// ═══════════════════════════════════════════════
// 🧭 ذاكرة موضع التمرير لكل قسم
// ═══════════════════════════════════════════════
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

const scrollMemory = {};
let currentViewKey = 'home';

function getScrollY() {
  return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
}

function saveCurrentScroll() {
  if (!currentViewKey) return;
  scrollMemory[currentViewKey] = getScrollY();
}

function setView(key) {
  currentViewKey = key;
}

function scrollToView(key) {
  const hasSaved = Object.prototype.hasOwnProperty.call(scrollMemory, key);
  const pos = hasSaved ? scrollMemory[key] : 0;
  const delays = [0, 30, 100, 250, 500];
  delays.forEach(function (d) {
    setTimeout(function () {
      window.scrollTo({ top: pos, behavior: 'smooth' });
    }, d);
  });
}

window.addEventListener('beforeunload', function () {
  saveCurrentScroll();
});

// ═══════════════════════════════════════════════
// 🎨 الأيقونات
// ═══════════════════════════════════════════════
function icon(name, cls = '') {
  const safeName = String(name || 'book-open').replace(/[^a-z0-9-]/gi, '');
  const safeClass = cls ? ` class="${cls}"` : '';
  return `<i data-lucide="${safeName}"${safeClass} aria-hidden="true"></i>`;
}

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

(function watchIcons() {
  if (!window.lucide || !document.body) return;
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      refreshIcons();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  refreshIcons();
})();

// ═══════════════════════════════════════════════
// 📅 أيقونات السنوات والتخصصات
// ═══════════════════════════════════════════════
const YEAR_ICONS = {
  L1: 'sprout',
  L2: 'book-open',
  L3: 'library',
  M1: 'graduation-cap',
  M2: 'award'
};

const SPECIALIZATION_ICONS = {
  'جذع مشترك علوم إسلامية': 'book-open',
  'شعبة الشريعة': 'scale',
  'شعبة أصول الدين': 'landmark',
  'شعبة اللغة العربية والحضارة الإسلامية': 'languages',
  'الفقه وأصوله': 'scale',
  'الشريعة والقانون': 'scale',
  'الكتاب والسنة': 'book-open-text',
  'العقيدة ومقارنة الأديان': 'shield-check',
  'الدعوة والإعلام الإسلامي': 'megaphone',
  'تاريخ وحضارة إسلامية': 'landmark',
  'اللغة والدراسات القرآنية': 'book-open-text',
  'الحضارة الإسلامية': 'landmark',
  'تاريخ إسلامي': 'history',
  'إعجاز القرآن': 'sparkles',
  'تفسير وعلوم القرآن': 'book-open',
  'عقيدة إسلامية': 'shield-check',
  'مقارنة الأديان': 'git-compare',
  'مقارنة أديان': 'git-compare',
  'حديث وعلومه': 'scroll-text',
  'فقه الأحوال الشخصية المقارن': 'users-round',
  'الفقه المالكي': 'scale',
  'فقه مالكي وأصوله': 'scale',
  'الفقه المقارن وأصوله': 'git-compare',
  'فقه المعاملات المالية المعاصرة': 'hand-coins',
  'إعجاز والدراسات البيانية': 'feather',
  'المعاملات المالية المعاصرة': 'coins'
};

function getSpecializationIcon(spec) {
  return SPECIALIZATION_ICONS[spec] || 'graduation-cap';
}

function getSubjectIcon(subject) {
  if (typeof SUBJECT_ICONS !== 'undefined' && SUBJECT_ICONS && SUBJECT_ICONS[subject]) {
    return SUBJECT_ICONS[subject];
  }
  return 'book-open';
}

// ═══════════════════════════════════════════════
// ⭐ المفضلة
// ═══════════════════════════════════════════════
function getFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY));
    return {
      specializations: Array.isArray(stored?.specializations) ? stored.specializations : [],
      lessons: Array.isArray(stored?.lessons) ? stored.lessons : []
    };
  } catch (err) {
    return { specializations: [], lessons: [] };
  }
}

function saveFavorites(favs) {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs)); }
  catch (err) { console.error('خطأ في حفظ المفضلة:', err); }
}

function toggleFavoriteSpecialization(yearId, spec) {
  const favs = getFavorites();
  const index = favs.specializations.findIndex(
    item => item.year === yearId && item.spec === spec
  );
  if (index >= 0) {
    favs.specializations.splice(index, 1);
    showToast('تمت الإزالة من المفضلة', 'trash-2');
    saveFavorites(favs);
    return false;
  }
  favs.specializations.push({ year: yearId, spec });
  saveFavorites(favs);
  showToast('تمت الإضافة للمفضلة', 'star');
  return true;
}

function toggleFavoriteLesson(lessonId) {
  const favs = getFavorites();
  const index = favs.lessons.indexOf(lessonId);
  if (index >= 0) {
    favs.lessons.splice(index, 1);
    saveFavorites(favs);
    showToast('تمت الإزالة من المفضلة', 'trash-2');
    return false;
  }
  favs.lessons.push(lessonId);
  saveFavorites(favs);
  showToast('تمت الإضافة للمفضلة', 'heart');
  return true;
}

function isSpecFavorite(yearId, spec) {
  return getFavorites().specializations.some(
    item => item.year === yearId && item.spec === spec
  );
}

function isLessonFavorite(lessonId) {
  return getFavorites().lessons.includes(lessonId);
}

// ═══════════════════════════════════════════════
// 🌙 الوضع الليلي
// ═══════════════════════════════════════════════
const themeToggle = document.getElementById('themeToggle');
let savedTheme = 'light';
try { savedTheme = localStorage.getItem('theme') || 'light'; }
catch (err) { console.warn('تعذر قراءة إعداد الوضع الليلي.'); }

document.documentElement.setAttribute('data-theme', savedTheme);

function setThemeIcon(theme) {
  if (!themeToggle) return;
  themeToggle.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
  refreshIcons();
}
setThemeIcon(savedTheme);

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (err) {}
    setThemeIcon(next);
  });
}

// ═══════════════════════════════════════════════
// 🔄 جلب الدروس
// ═══════════════════════════════════════════════
async function fetchLessons() {
  try {
    const response = await fetch(`${API}/lessons`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    allLessons = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('تعذر جلب الدروس:', err);
    allLessons = [];
  }
}

// ═══════════════════════════════════════════════
// 🎯 إظهار/إخفاء الأقسام
// ═══════════════════════════════════════════════
function hideAllSections() {
  ['yearsSection', 'specializationsSection', 'subjectsSection',
   'lessonsSection', 'searchResultsSection'].forEach(id => {
    const section = document.getElementById(id);
    if (section) section.style.display = 'none';
  });
}

// ═══════════════════════════════════════════════
// 🏠 الصفحة الرئيسية
// ═══════════════════════════════════════════════
function goHome() {
  saveCurrentScroll();
  hideAllSections();

  const yearsSection = document.getElementById('yearsSection');
  if (yearsSection) yearsSection.style.display = 'block';

  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb) breadcrumb.innerHTML = '';

  renderYears();
  setView('home');
  scrollToView('home');
}

function renderYears() {
  const grid = document.getElementById('yearsGrid');
  if (!grid || typeof YEARS === 'undefined') return;

  grid.innerHTML = YEARS.map(year => {
    const specs = SPECIALIZATIONS[year.id] || [];
    const yearIcon = YEAR_ICONS[year.id] || 'book-open';
    return `
      <div class="year-card ripple-surface" onclick="selectYear('${year.id}')">
        <span class="year-icon">${icon(yearIcon)}</span>
        <h4>${escapeHtml(year.name)}</h4>
        <span class="count">${specs.length} تخصص</span>
      </div>
    `;
  }).join('');

  refreshIcons();
}

// ═══════════════════════════════════════════════
// 📅 اختيار السنة والتخصصات والمواد
// ═══════════════════════════════════════════════
let currentYear = null;
let currentSpecialization = null;
let currentSubject = null;

function selectYear(yearId) {
  saveCurrentScroll();

  currentYear = yearId;
  currentSpecialization = null;
  currentSubject = null;

  hideAllSections();

  const section = document.getElementById('specializationsSection');
  if (section) section.style.display = 'block';

  const yearObj = YEARS.find(year => year.id === yearId);
  if (!yearObj) return;

  document.getElementById('specTitle').textContent = `تخصصات ${yearObj.name}`;

  document.getElementById('breadcrumb').innerHTML = `
    <span onclick="goHome()" class="crumb-link">
      ${icon('landmark')} الرئيسية
    </span>
    <span class="crumb-sep">›</span>
    <span class="crumb-current">${escapeHtml(yearObj.name)}</span>
  `;

  renderSpecializations(yearId);
  refreshIcons();

  const key = 'year:' + yearId;
  setView(key);
  scrollToView(key);
}

function renderSpecializations(yearId) {
  const grid = document.getElementById('specializationsGrid');
  if (!grid) return;

  const specs = SPECIALIZATIONS[yearId] || [];
  if (!specs.length) {
    grid.innerHTML = '<p class="empty">لا توجد تخصصات في هذه السنة بعد.</p>';
    return;
  }

  grid.innerHTML = specs.map(spec => {
    const subjects = (SUBJECTS[yearId] && SUBJECTS[yearId][spec]) || [];
    const lessonsCount = allLessons.filter(lesson =>
      lesson.year === yearId && lesson.specialization === spec
    ).length;
    const isFav = isSpecFavorite(yearId, spec);
    const specJson = JSON.stringify(spec);

    return `
      <div class="specialization-card ripple-surface" onclick='selectSpecialization(${specJson})'>
        <div class="spec-header">
          <div style="display:flex;align-items:center;gap:12px;">
            <span class="spec-icon">${icon(getSpecializationIcon(spec))}</span>
            <h4>${escapeHtml(spec)}</h4>
          </div>
        </div>
        <div class="spec-meta">
          <span>${icon('library')} ${subjects.length} مادة</span>
          <span>${icon('file-text')} ${lessonsCount} درس</span>
          <button type="button" class="fav-btn ${isFav ? 'active' : ''}"
            onclick='handleSpecFavorite(event, ${JSON.stringify(yearId)}, ${specJson})'
            title="${isFav ? 'إزالة من المفضلة' : 'أضف للمفضلة'}"
            aria-label="${isFav ? 'إزالة من المفضلة' : 'أضف للمفضلة'}">
            ${icon('star')}
          </button>
        </div>
      </div>
    `;
  }).join('');

  refreshIcons();
}

function handleSpecFavorite(event, yearId, spec) {
  event.stopPropagation();
  const added = toggleFavoriteSpecialization(yearId, spec);
  const button = event.currentTarget;
  button.classList.toggle('active', added);
  button.title = added ? 'إزالة من المفضلة' : 'أضف للمفضلة';
  button.setAttribute('aria-label', button.title);
}

function selectSpecialization(spec) {
  saveCurrentScroll();

  currentSpecialization = spec;
  currentSubject = null;

  hideAllSections();

  document.getElementById('subjectsSection').style.display = 'block';
  document.getElementById('subjectTitle').textContent = `مواد ${spec}`;

  const yearObj = YEARS.find(year => year.id === currentYear);

  document.getElementById('breadcrumb').innerHTML = `
    <span onclick="goHome()" class="crumb-link">${icon('landmark')} الرئيسية</span>
    <span class="crumb-sep">›</span>
    <span onclick="selectYear(${JSON.stringify(currentYear)})" class="crumb-link">
      ${escapeHtml(yearObj ? yearObj.name : currentYear)}
    </span>
    <span class="crumb-sep">›</span>
    <span class="crumb-current">${escapeHtml(spec)}</span>
  `;

  renderSubjects();
  refreshIcons();

  const key = 'spec:' + currentYear + ':' + spec;
  setView(key);
  scrollToView(key);
}

function renderSubjects() {
  const grid = document.getElementById('subjectsGrid');
  if (!grid) return;

  const subjects = (SUBJECTS[currentYear] && SUBJECTS[currentYear][currentSpecialization]) || [];

  if (!subjects.length) {
    grid.innerHTML = '<p class="empty">لا توجد مواد في هذا التخصص بعد.</p>';
    return;
  }

  grid.innerHTML = subjects.map(subject => {
    const subjectName = typeof subject === 'string' ? subject : subject.name;
    const lessonsCount = allLessons.filter(lesson =>
      lesson.year === currentYear &&
      lesson.specialization === currentSpecialization &&
      lesson.subject === subjectName
    ).length;
    const subjectIcon = getSubjectIcon(subjectName);

    return `
      <div class="subject-card ripple-surface" onclick='selectSubject(${JSON.stringify(subjectName)})'>
        <span class="icon">${icon(subjectIcon)}</span>
        <h4>${escapeHtml(subjectName)}</h4>
        <span class="count">${lessonsCount} درس</span>
      </div>
    `;
  }).join('');

  refreshIcons();
}

function selectSubject(subjectName) {
  saveCurrentScroll();
  currentSubject = subjectName;

  hideAllSections();

  document.getElementById('lessonsSection').style.display = 'block';
  document.getElementById('lessonsTitle').textContent = `دروس ${subjectName}`;

  const yearObj = YEARS.find(year => year.id === currentYear);

  document.getElementById('breadcrumb').innerHTML = `
    <span onclick="goHome()" class="crumb-link">${icon('landmark')} الرئيسية</span>
    <span class="crumb-sep">›</span>
    <span onclick="selectYear(${JSON.stringify(currentYear)})" class="crumb-link">
      ${escapeHtml(yearObj ? yearObj.name : currentYear)}
    </span>
    <span class="crumb-sep">›</span>
    <span onclick='selectSpecialization(${JSON.stringify(currentSpecialization)})' class="crumb-link">
      ${escapeHtml(currentSpecialization)}
    </span>
    <span class="crumb-sep">›</span>
    <span class="crumb-current">${escapeHtml(subjectName)}</span>
  `;

  const filtered = allLessons.filter(lesson =>
    lesson.year === currentYear &&
    lesson.specialization === currentSpecialization &&
    lesson.subject === subjectName
  );

  renderLessons(filtered, 'lessonsGrid', 'emptyMsg');
  refreshIcons();

  const key = 'subject:' + currentYear + ':' + currentSpecialization + ':' + subjectName;
  setView(key);
  scrollToView(key);
}

function backToSpecializations() {
  if (currentYear) selectYear(currentYear);
  else goHome();
}

function backToSubjects() {
  if (currentSpecialization) selectSpecialization(currentSpecialization);
  else goHome();
}

function formatSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value) {
  if (!value) return 'غير محدد';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير محدد';
  return date.toLocaleDateString('ar-DZ', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

function buildTeacherLine(lesson) {
  if (lesson.uploader !== 'teacher') return '';
  if (!lesson.uploaderName) return '';
  const name = escapeHtml(lesson.uploaderName);
  if (lesson.uploaderId) {
    const teacherUrl = 'teacher-profile.html?id=' + encodeURIComponent(String(lesson.uploaderId));
    return `
      <a href="${teacherUrl}" class="lesson-teacher" onclick="event.stopPropagation()">
        ${icon('user-round')}
        <span>${name}</span>
      </a>
    `;
  }
  return `
    <span class="lesson-teacher no-link">
      ${icon('user-round')}
      <span>${name}</span>
    </span>
  `;
}

function renderLessons(lessons, gridId, emptyId) {
  const grid = document.getElementById(gridId);
  const empty = document.getElementById(emptyId);
  if (!grid || !empty) return;

  if (!lessons.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    refreshIcons();
    return;
  }

  empty.style.display = 'none';

  grid.innerHTML = lessons.map(lesson => {
    const isFav = isLessonFavorite(lesson.id);
    const lessonIdJson = JSON.stringify(String(lesson.id));
    const lessonUrl = escapeHtml(lesson.url || '#');
    const lessonTitle = escapeHtml(lesson.title || 'درس بدون عنوان');
    const fileName = escapeHtml(lesson.filename || 'lesson');
    const teacherLine = buildTeacherLine(lesson);

    return `
      <div class="lesson-card ripple-surface">
        <div class="lesson-header">
          <h4>${lessonTitle}</h4>
          <div class="lesson-badges">
            <span class="file-badge ${lesson.type === 'pdf' ? 'pdf' : 'doc'}">
              ${escapeHtml(String(lesson.type || 'file').toUpperCase())}
            </span>
            <button type="button" class="fav-btn lesson-fav ${isFav ? 'active' : ''}"
              onclick='handleLessonFavorite(event, ${lessonIdJson})'
              title="${isFav ? 'إزالة من المفضلة' : 'أضف للمفضلة'}"
              aria-label="${isFav ? 'إزالة من المفضلة' : 'أضف للمفضلة'}">
              ${icon('heart')}
            </button>
          </div>
        </div>

        ${teacherLine}

        ${lesson.description ? `<p class="lesson-desc">${escapeHtml(lesson.description)}</p>` : ''}

        <div class="lesson-meta">
          <span>${icon('calendar')} ${formatDate(lesson.date)}</span>
          <span>${icon('hard-drive')} ${formatSize(lesson.size)}</span>
        </div>

        <div class="lesson-actions">
          <a href="${lessonUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-view">
            ${icon('eye')} فتح
          </a>
          <a href="${lessonUrl}" download="${fileName}" class="btn btn-download">
            ${icon('download')} تحميل
          </a>
        </div>
      </div>
    `;
  }).join('');

  refreshIcons();
}

function handleLessonFavorite(event, lessonId) {
  event.stopPropagation();
  const added = toggleFavoriteLesson(lessonId);
  const button = event.currentTarget;
  button.classList.toggle('active', added);
  button.title = added ? 'إزالة من المفضلة' : 'أضف للمفضلة';
  button.setAttribute('aria-label', button.title);
}

// ═══════════════════════════════════════════════
// 🔎 البحث
// ═══════════════════════════════════════════════
const searchInput = document.getElementById('searchInput');

if (searchInput) {
  searchInput.addEventListener('input', event => {
    const query = event.target.value.trim().toLowerCase();

    if (!query) { goHome(); return; }

    saveCurrentScroll();
    hideAllSections();
    document.getElementById('searchResultsSection').style.display = 'block';

    document.getElementById('breadcrumb').innerHTML = `
      <span onclick="goHome()" class="crumb-link">${icon('landmark')} الرئيسية</span>
      <span class="crumb-sep">›</span>
      <span class="crumb-current">نتائج البحث</span>
    `;

    const filtered = allLessons.filter(lesson => {
      const fields = [lesson.title, lesson.subject, lesson.specialization,
                      lesson.year, lesson.description, lesson.filename,
                      lesson.uploaderName];
      return fields.some(value =>
        String(value || '').toLowerCase().includes(query)
      );
    });

    renderLessons(filtered, 'searchResultsGrid', 'searchEmptyMsg');
    refreshIcons();

    setView('search');
    scrollToView('search');
  });
}

// ═══════════════════════════════════════════════
// 🏠 زر الرئيسية
// ═══════════════════════════════════════════════
const homeBtn = document.getElementById('homeBtn');
if (homeBtn) {
  homeBtn.addEventListener('click', event => {
    event.preventDefault();
    if (searchInput) searchInput.value = '';
    goHome();
  });
}

// ═══════════════════════════════════════════════
// 💬 Toast
// ═══════════════════════════════════════════════
function showToast(message, iconName) {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification';

  if (iconName) toast.insertAdjacentHTML('beforeend', icon(iconName));

  const text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(text);
  document.body.appendChild(toast);
  refreshIcons();

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

  menuToggle.addEventListener('click', event => {
    event.stopPropagation();
    const isOpen = menuDropdown.classList.toggle('open');
    menuToggle.classList.toggle('active', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  menuDropdown.addEventListener('click', event => event.stopPropagation());

  document.addEventListener('click', () => {
    menuDropdown.classList.remove('open');
    menuToggle.classList.remove('active');
    menuToggle.setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      menuDropdown.classList.remove('open');
      menuToggle.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      menuDropdown.classList.remove('open');
      menuToggle.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });
})();

// ═══════════════════════════════════════════════
// 🔐 الشعار السري
// ═══════════════════════════════════════════════
(function initSecretAdmin() {
  const logo = document.getElementById('secretLogo');
  const adminBtn = document.getElementById('adminBtn');
  if (!logo || !adminBtn) return;

  try {
    if (sessionStorage.getItem('showAdmin') === '1') {
      adminBtn.classList.remove('admin-hidden');
    }
  } catch (err) {}

  let clicks = 0;
  let timer;

  logo.addEventListener('click', () => {
    clicks++;
    clearTimeout(timer);
    timer = setTimeout(() => { clicks = 0; }, 2000);

    if (clicks >= 5) {
      adminBtn.classList.remove('admin-hidden');
      try { sessionStorage.setItem('showAdmin', '1'); } catch (err) {}
      clicks = 0;
      showToast('تم إظهار رابط لوحة التحكم', 'shield-check');
    }
  });
})();

// ═══════════════════════════════════════════════
// 🔗 استعادة التنقل
// ═══════════════════════════════════════════════
function restoreFavoriteNavigation() {
  let gotoYear = null;
  let gotoSpec = null;

  try {
    gotoYear = sessionStorage.getItem('goto_year');
    gotoSpec = sessionStorage.getItem('goto_spec');
    if (gotoYear && gotoSpec) {
      sessionStorage.removeItem('goto_year');
      sessionStorage.removeItem('goto_spec');
    }
  } catch (err) {
    console.warn('تعذر استعادة الانتقال.');
  }

  if (!gotoYear || !gotoSpec) { goHome(); return; }

  if (!YEARS.some(year => year.id === gotoYear) ||
      !(SPECIALIZATIONS[gotoYear] || []).includes(gotoSpec)) {
    goHome();
    return;
  }

  currentYear = gotoYear;
  currentSpecialization = gotoSpec;
  selectSpecialization(gotoSpec);
}

// ═══════════════════════════════════════════════
// 🌟 نافذة الترحيب + تسجيل دخول موحّد
// ═══════════════════════════════════════════════
(function initWelcomeModal() {
  const modal = document.getElementById('welcomeModal');
  if (!modal) return;

  const closeBtn = document.getElementById('welcomeCloseBtn');
  const openLoginBtn = document.getElementById('openLoginBtn');
  const form = document.getElementById('welcomeForm');
  const emailInput = document.getElementById('welcomeEmail');
  const passwordInput = document.getElementById('welcomePassword');
  const loginBtn = document.getElementById('welcomeLoginBtn');
  const errorEl = document.getElementById('welcomeError');
  const chip = document.getElementById('loggedInChip');

  let isLoggedIn = false;

  function openModal() {
    modal.style.display = 'flex';
    if (window.lucide) window.lucide.createIcons();
    setTimeout(function () {
      if (emailInput) emailInput.focus();
    }, 200);
  }

  function closeModal() {
    modal.style.display = 'none';
    if (errorEl) errorEl.textContent = '';
  }

  function setGuestMode() {
    try { sessionStorage.setItem('guestModeActive', '1'); } catch (e) {}
    closeModal();
  }

  function isGuestMode() {
    try { return sessionStorage.getItem('guestModeActive') === '1'; }
    catch (e) { return false; }
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.style.display === 'flex') setGuestMode();
  });

  modal.addEventListener('click', function (e) {
    if (e.target === modal) setGuestMode();
  });

  if (closeBtn) closeBtn.addEventListener('click', setGuestMode);

  if (openLoginBtn) {
    openLoginBtn.addEventListener('click', function () {
      if (isLoggedIn) {
        fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' })
          .then(function () { location.reload(); })
          .catch(function () { location.reload(); });
      } else {
        openModal();
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!email || !password) {
        if (errorEl) errorEl.textContent = 'البريد وكلمة السر مطلوبان';
        return;
      }

      loginBtn.disabled = true;
      const originalText = loginBtn.innerHTML;
      loginBtn.innerHTML = 'جارٍ التحقق...';
      if (errorEl) errorEl.textContent = '';

      try {
        const res = await fetch('/api/unified-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ email, password })
        });
        const json = await res.json();

        if (res.ok && json.redirect) {
          if (errorEl) errorEl.textContent = '';
          window.location.href = json.redirect;
          return;
        }
        if (errorEl) errorEl.textContent = json.error || 'فشل الدخول';
      } catch (err) {
        if (errorEl) errorEl.textContent = 'خطأ في الاتصال';
      } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = originalText;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  const params = new URLSearchParams(location.search);
  const googleError = params.get('error');

  fetch('/api/me', { credentials: 'same-origin' })
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(function (user) {
      if (user && (user.role === 'admin' || user.role === 'teacher' || user.role === 'student')) {
        isLoggedIn = true;
        if (openLoginBtn) {
          const roleLabels = { admin: 'مدير', teacher: 'أستاذ', student: 'طالب' };
          const roleLabel = roleLabels[user.role] || 'زائر';

          openLoginBtn.classList.remove('login-nav-btn');
          openLoginBtn.classList.add('logout-nav-btn');
          openLoginBtn.title = 'تسجيل الخروج';
          openLoginBtn.innerHTML =
            '<span>خروج</span>' +
            '<i data-lucide="log-out"></i>' +
            '<span class="role-badge role-' + user.role + '">' + roleLabel + '</span>';

          if (window.lucide) window.lucide.createIcons();
        }
        if (chip) chip.style.display = 'none';
      } else {
        if (googleError) {
          openModal();
          const messages = {
            unauthorized: 'هذا الحساب غير مصرّح له بالدخول',
            google_denied: 'تم إلغاء الدخول بجوجل',
            google_failed: 'تعذر الدخول بجوجل، حاول مرة أخرى',
            wrong_role: 'هذا الحساب لا يملك صلاحية لهذه الصفحة'
          };
          if (errorEl) errorEl.textContent = messages[googleError] || 'تعذر الدخول';
          history.replaceState(null, '', location.pathname);
        } else if (!isGuestMode()) {
          setTimeout(openModal, 400);
        }
      }
    })
    .catch(function () {
      if (!isGuestMode()) setTimeout(openModal, 400);
    });
})();

// ═══════════════════════════════════════════════
// 🌊 تفعيل التموج والانسيابية (Wave / Ripple)
// ═══════════════════════════════════════════════
document.addEventListener('click', function (e) {
  const target = e.target.closest('.btn, .btn-primary, .search-btn-circle, .year-card, .subject-card, .back-btn');
  if (!target) return;

  const circle = document.createElement('span');
  const diameter = Math.max(target.clientWidth, target.clientHeight);
  const radius = diameter / 2;
  const rect = target.getBoundingClientRect();

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${e.clientX - rect.left - radius}px`;
  circle.style.top = `${e.clientY - rect.top - radius}px`;
  circle.classList.add('ripple-wave');

  const prev = target.getElementsByClassName('ripple-wave')[0];
  if (prev) prev.remove();

  target.appendChild(circle);
});

// تفعيل الفلتر السريع في كبسولة البحث
const quickYearFilter = document.getElementById('quickYearFilter');
if (quickYearFilter) {
  quickYearFilter.addEventListener('change', function (e) {
    const val = e.target.value;
    if (val) {
      selectYear(val);
      const targetSec = document.getElementById('specializationsSection');
      if (targetSec) {
        window.scrollTo({ top: targetSec.offsetTop - 80, behavior: 'smooth' });
      }
    } else {
      goHome();
    }
  });
}

// تفعيل زر البحث الدائري في الكبسولة
const searchActionBtn = document.getElementById('searchActionBtn');
if (searchActionBtn) {
  searchActionBtn.addEventListener('click', function () {
    const query = (document.getElementById('searchInput')?.value || '').trim();
    if (query) {
      const searchSec = document.getElementById('searchResultsSection');
      if (searchSec) {
        window.scrollTo({ top: searchSec.offsetTop - 80, behavior: 'smooth' });
      }
    } else {
      document.getElementById('searchInput')?.focus();
    }
  });
}

// ═══════════════════════════════════════════════
// 🚀 بدء التطبيق
// ═══════════════════════════════════════════════
(async function startApp() {
  await fetchLessons();
  restoreFavoriteNavigation();
  refreshIcons();
})();