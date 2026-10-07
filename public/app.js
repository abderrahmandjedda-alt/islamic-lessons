const API = '/api';
let allLessons = [];

// الوضع الليلي
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

// جلب الدروس
async function fetchLessons() {
  const res = await fetch(`${API}/lessons`);
  allLessons = await res.json();
  renderSubjects();
  renderLessons(allLessons);
}

// أيقونات المواد
const subjectIcons = {
  'منهجية البحث': '🔍',
  'الحضارة الإسلامية': '🕌',
  'اللغة العربية': '📝',
  'التاريخ الإسلامي': '📜',
  'الفكر الإسلامي': '💭',
  'علوم القرآن': '📖',
  'الحديث الشريف': '🕋',
  'عام': '📁'
};

function renderSubjects() {
  const grid = document.getElementById('subjectsGrid');
  const subjects = {};
  allLessons.forEach(l => {
    subjects[l.subject] = (subjects[l.subject] || 0) + 1;
  });

  grid.innerHTML = Object.entries(subjects).map(([name, count]) => `
    <div class="subject-card" onclick="filterBySubject('${name}')">
      <span class="icon">${subjectIcons[name] || '📁'}</span>
      <h4>${name}</h4>
      <span class="count">${count} درس</span>
    </div>
  `).join('') || '<p style="text-align:center;grid-column:1/-1;color:var(--text-light)">لا توجد مواد بعد</p>';
}

function filterBySubject(subject) {
  document.getElementById('searchInput').value = subject;
  renderLessons(allLessons.filter(l => l.subject === subject));
  document.getElementById('lessons').scrollIntoView({ behavior: 'smooth' });
}

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

function renderLessons(lessons) {
  const grid = document.getElementById('lessonsGrid');
  const empty = document.getElementById('emptyMsg');

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
      <span class="lesson-subject">${escapeHtml(l.subject)}</span>
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

// البحث
document.getElementById('searchInput').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) return renderLessons(allLessons);
  const filtered = allLessons.filter(l =>
    l.title.toLowerCase().includes(q) ||
    l.subject.toLowerCase().includes(q) ||
    (l.description || '').toLowerCase().includes(q) ||
    l.filename.toLowerCase().includes(q)
  );
  renderLessons(filtered);
  if (q) document.getElementById('lessons').scrollIntoView({ behavior: 'smooth' });
});

fetchLessons();