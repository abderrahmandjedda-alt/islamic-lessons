const API = '/api';
let allLessons = [];

// ═══════════════════════════════════════════════
// 📅 قائمة السنوات الدراسية
// ═══════════════════════════════════════════════
const YEARS = [
  { id: 'L1', name: 'السنة الأولى ليسانس', icon: '🎓' },
  { id: 'L2', name: 'السنة الثانية ليسانس', icon: '🎓' },
  { id: 'L3', name: 'السنة الثالثة ليسانس', icon: '🎓' },
  { id: 'M1', name: 'السنة الأولى ماستر', icon: '📘' },
  { id: 'M2', name: 'السنة الثانية ماستر', icon: '📗' }
];

// ═══════════════════════════════════════════════
// 🎓 التخصصات لكل سنة (عدّلها كما تريد لاحقاً)
// ═══════════════════════════════════════════════
const SPECIALIZATIONS = {
  'L1': [
    'العلوم الإسلامية',
    'اللغة العربية',
    'الحضارة الإسلامية'
  ],
  'L2': [
    'العلوم الإسلامية',
    'اللغة العربية',
    'الحضارة الإسلامية'
  ],
  'L3': [
    'العلوم الإسلامية',
    'اللغة العربية',
    'الحضارة الإسلامية'
  ],
  'M1': [
    'اللغة والدراسات القرآنية',
    'الحديث وعلومه',
    'العقيدة والفكر الإسلامي',
    'الفقه وأصوله'
  ],
  'M2': [
    'اللغة والدراسات القرآنية',
    'الحديث وعلومه',
    'العقيدة والفكر الإسلامي'
  ]
};

// ═══════════════════════════════════════════════
// 📚 المواد لكل سنة وتخصص
// ═══════════════════════════════════════════════
const SUBJECTS = {
  'M1': {
    'اللغة والدراسات القرآنية': [
      { name: 'حفظ القرآن', icon: '📖' },
      { name: 'تاريخ المصحف', icon: '📜' },
      { name: 'أصول النحو ومذاهبه', icon: '📝' },
      { name: 'دراسات في البلاغة العربية', icon: '💭' },
      { name: 'علم الدلالة', icon: '📚' },
      { name: 'مصادر الاحتجاج اللغوي', icon: '🔍' },
      { name: 'علم الرسم والضبط 1', icon: '✒️' },
      { name: 'غريب القرآن', icon: '📕' },
      { name: 'اللغة الإنجليزية', icon: '🌍' },
      { name: 'البرمجة والذكاء الاصطناعي', icon: '🤖' },
      { name: 'نظرية النظم', icon: '🧠' },
      { name: 'اللسانيات', icon: '🗣️' }
    ],
    'الحديث وعلومه': [
      { name: 'علم الحديث', icon: '📗' },
      { name: 'مصطلح الحديث', icon: '📘' },
      { name: 'تخريج الحديث', icon: '🔍' },
      { name: 'علل الحديث', icon: '📕' },
      { name: 'رجال الحديث', icon: '👥' },
      { name: 'مناهج المحدثين', icon: '📜' }
    ],
    'العقيدة والفكر الإسلامي': [
      { name: 'العقيدة الإسلامية', icon: '🕋' },
      { name: 'الفكر الإسلامي', icon: '💭' },
      { name: 'الفرق والمذاهب', icon: '📚' },
      { name: 'علم الكلام', icon: '🗣️' },
      { name: 'التصوف الإسلامي', icon: '🕌' },
      { name: 'الفلسفة الإسلامية', icon: '🧠' }
    ],
    'الفقه وأصوله': [
      { name: 'الفقه المقارن', icon: '⚖️' },
      { name: 'أصول الفقه', icon: '📖' },
      { name: 'مقاصد الشريعة', icon: '🎯' },
      { name: 'القواعد الفقهية', icon: '📏' }
    ]
  },
  'L1': {
    'العلوم الإسلامية': [
      { name: 'القرآن الكريم', icon: '📖' },
      { name: 'السيرة النبوية', icon: '🕌' },
      { name: 'التوحيد', icon: '🕋' },
      { name: 'الفقه', icon: '⚖️' },
      { name: 'الحديث', icon: '📗' }
    ],
    'اللغة العربية': [
      { name: 'النحو', icon: '📝' },
      { name: 'الصرف', icon: '🔤' },
      { name: 'البلاغة', icon: '💭' },
      { name: 'الأدب', icon: '📚' },
      { name: 'النصوص', icon: '📜' }
    ],
    'الحضارة الإسلامية': [
      { name: 'تاريخ الحضارة', icon: '📜' },
      { name: 'الفكر الإسلامي', icon: '💭' },
      { name: 'العلوم الإسلامية', icon: '🔬' }
    ]
  }
};

// ═══════════════════════════════════════════════
// 🌙 الوضع الليلي
// ═══════════════════════════════════════════════
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
});

// ═══════════════════════════════════════════════
// 🔄 جلب الدروس من السيرفر
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
// 🏠 الصفحة الرئيسية: عرض السنوات
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
        <span class="year-icon">${y.icon}</span>
        <h4>${y.name}</h4>
        <span class="count">${specs.length} تخصص</span>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════
// 📅 اختيار السنة → عرض التخصصات
// ═══════════════════════════════════════════════
let currentYear = null;
let currentSpecialization = null;

function selectYear(yearId) {
  currentYear = yearId;
  hideAllSections();
  document.getElementById('specializationsSection').style.display = 'block';
  
  const yearObj = YEARS.find(y => y.id === yearId);
  document.getElementById('specTitle').textContent = `🎓 تخصصات ${yearObj.name}`;
  document.getElementById('breadcrumb').innerHTML = `
    <span onclick="goHome()" class="crumb-link">🏛️ الرئيسية</span>
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
    
    return `
      <div class="specialization-card" onclick="selectSpecialization('${spec}')">
        <div class="spec-header">
          <span class="spec-icon">🎓</span>
          <h4>${spec}</h4>
        </div>
        <div class="spec-meta">
          <span>📚 ${subjects.length} مادة</span>
          <span>📄 ${lessonsCount} درس</span>
        </div>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════
// 🎓 اختيار التخصص → عرض المواد
// ═══════════════════════════════════════════════
function selectSpecialization(spec) {
  currentSpecialization = spec;
  hideAllSections();
  document.getElementById('subjectsSection').style.display = 'block';
  
  const yearObj = YEARS.find(y => y.id === currentYear);
  document.getElementById('subjectTitle').textContent = `📚 مواد ${spec}`;
  document.getElementById('breadcrumb').innerHTML = `
    <span onclick="goHome()" class="crumb-link">🏛️ الرئيسية</span>
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
    const lessonsCount = allLessons.filter(l => 
      l.year === currentYear && 
      l.specialization === currentSpecialization && 
      l.subject === sub.name
    ).length;
    
    return `
      <div class="subject-card" onclick="selectSubject('${sub.name}')">
        <span class="icon">${sub.icon}</span>
        <h4>${sub.name}</h4>
        <span class="count">${lessonsCount} درس</span>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════
// 📚 اختيار المادة → عرض الدروس
// ═══════════════════════════════════════════════
let currentSubject = null;

function selectSubject(subName) {
  currentSubject = subName;
  hideAllSections();
  document.getElementById('lessonsSection').style.display = 'block';
  
  const yearObj = YEARS.find(y => y.id === currentYear);
  document.getElementById('lessonsTitle').textContent = `📄 دروس ${subName}`;
  document.getElementById('breadcrumb').innerHTML = `
    <span onclick="goHome()" class="crumb-link">🏛️ الرئيسية</span>
    <span class="crumb-sep">›</span>
    <span onclick="selectYear('${currentYear}')" class="crumb-link">${yearObj.name}</span>
    <span class="crumb-sep">›</span>
    <span onclick="selectSpecialization('${currentSpecialization}')" class="crumb-link">${currentSpecialization}</span>
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
// 🔙 أزرار الرجوع
// ═══════════════════════════════════════════════
function backToSpecializations() {
  selectYear(currentYear);
}
function backToSubjects() {
  selectSpecialization(currentSpecialization);
}

// ═══════════════════════════════════════════════
// 📄 عرض بطاقات الدروس
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
  
  grid.innerHTML = lessons.map(l => `
    <div class="lesson-card">
      <div class="lesson-header">
        <h4>${escapeHtml(l.title)}</h4>
        <span class="file-badge ${l.type === 'pdf' ? 'pdf' : 'doc'}">
          ${l.type.toUpperCase()}
        </span>
      </div>
      ${l.description ? `<p class="lesson-desc">${escapeHtml(l.description)}</p>` : ''}
      <div class="lesson-meta">
        <span>📅 ${formatDate(l.date)}</span>
        <span>💾 ${formatSize(l.size)}</span>
      </div>
      <div class="lesson-actions">
        <a href="${l.url}" target="_blank" class="btn btn-view">👁️ فتح</a>
        <a href="${l.url}" download="${escapeHtml(l.filename)}" class="btn btn-download">📥 تحميل</a>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ═══════════════════════════════════════════════
// 🔎 البحث الشامل
// ═══════════════════════════════════════════════
document.getElementById('searchInput').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  
  if (!q) {
    goHome();
    return;
  }
  
  hideAllSections();
  document.getElementById('searchResultsSection').style.display = 'block';
  document.getElementById('breadcrumb').innerHTML = `
    <span onclick="goHome()" class="crumb-link">🏛️ الرئيسية</span>
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

// ═══════════════════════════════════════════════
// 🚀 بدء التطبيق
// ═══════════════════════════════════════════════
document.getElementById('homeBtn').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('searchInput').value = '';
  goHome();
});

(async () => {
  await fetchLessons();
  goHome();
})();