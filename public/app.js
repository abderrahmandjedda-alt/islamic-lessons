// ═══════════════════════════════════════════════
// ⚙️ ملاحظة: YEARS, SPECIALIZATIONS, SUBJECTS موجودة في data.js
// ═══════════════════════════════════════════════

const API = '/api';
let allLessons = [];

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
        <span class="year-icon">${y.icon}</span>
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
      <div class="specialization-card" onclick="selectSpecialization('${spec.replace(/'/g, "\\'")}')">
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
// 🎓 اختيار التخصص
// ═══════════════════════════════════════════════
function selectSpecialization(spec) {
  currentSpecialization = spec;
  hideAllSections();
  document.getElementById('subjectsSection').style.display = 'block';
  
  const yearObj = YEARS.find(y => y.id === currentYear);
  document.getElementById('subjectTitle').textContent = `مواد ${spec}`;
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
    const subName = typeof sub === 'string' ? sub : sub.name;
    const subIcon = typeof sub === 'string' ? '📖' : sub.icon;
    
    const lessonsCount = allLessons.filter(l => 
      l.year === currentYear && 
      l.specialization === currentSpecialization && 
      l.subject === subName
    ).length;
    
    return `
      <div class="subject-card" onclick="selectSubject('${subName.replace(/'/g, "\\'")}')">
        <span class="icon">${subIcon}</span>
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
    <span onclick="goHome()" class="crumb-link">🏛️ الرئيسية</span>
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
// 🔎 البحث
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

// ═══════════════════════════════════════════════
// 🔐 الشعار السري - إظهار زر لوحة التحكم
// ═══════════════════════════════════════════════
let logoClickCount = 0;
let logoClickTimer = null;
const logo = document.getElementById('secretLogo');
const adminBtn = document.getElementById('adminBtn');

if (logo && adminBtn) {
  logo.addEventListener('click', () => {
    logoClickCount++;
    
    logo.classList.add('pulse');
    setTimeout(() => logo.classList.remove('pulse'), 400);
    
    clearTimeout(logoClickTimer);
    logoClickTimer = setTimeout(() => {
      logoClickCount = 0;
    }, 3000);
    
    if (logoClickCount >= 5) {
      adminBtn.classList.add('visible');
      logoClickCount = 0;
      showToast('✅ تم إظهار زر لوحة التحكم');
    }
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #0d5f4a, #1a7d63);
    color: white;
    padding: 14px 28px;
    border-radius: 30px;
    font-family: 'Tajawal', sans-serif;
    font-weight: 700;
    box-shadow: 0 8px 32px rgba(13, 95, 74, 0.4);
    z-index: 9999;
    animation: toastIn 0.4s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.4s ease forwards';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes toastIn {
    from { opacity: 0; transform: translate(-50%, 20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
  @keyframes toastOut {
    from { opacity: 1; transform: translate(-50%, 0); }
    to { opacity: 0; transform: translate(-50%, 20px); }
  }
`;
document.head.appendChild(toastStyle);

// ═══════════════════════════════════════════════
// تشغيل التطبيق
// ═══════════════════════════════════════════════
(async () => {
  await fetchLessons();
  goHome();
})();
// ═══════════════════════════════════════════════
// ☰ القائمة المنسدلة
// ═══════════════════════════════════════════════
(function initMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const menuDropdown = document.getElementById('menuDropdown');
  
  if (!menuToggle || !menuDropdown) return;
  
  // فتح/إغلاق عند الضغط على الزر
  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menuDropdown.classList.toggle('open');
    menuToggle.classList.toggle('active', isOpen);
  });
  
  // منع الإغلاق عند الضغط داخل القائمة
  menuDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  // إغلاق القائمة عند الضغط في أي مكان آخر
  document.addEventListener('click', () => {
    if (menuDropdown.classList.contains('open')) {
      menuDropdown.classList.remove('open');
      menuToggle.classList.remove('active');
    }
  });
  
  // إغلاق القائمة عند الضغط على Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuDropdown.classList.contains('open')) {
      menuDropdown.classList.remove('open');
      menuToggle.classList.remove('active');
    }
  });
  
  // إغلاق تلقائي عند تغيير حجم الشاشة (من الجوال إلى الحاسوب)
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) return;
    if (menuDropdown.classList.contains('open')) {
      menuDropdown.classList.remove('open');
      menuToggle.classList.remove('active');
    }
  });
})();