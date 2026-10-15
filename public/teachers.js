// ═══════════════════════════════════════════════
// 👥 صفحة هيئة التدريس
// ═══════════════════════════════════════════════

const API = '/api';
let allTeachers = [];

function $(id) { return document.getElementById(id); }

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 🌙 الوضع الليلي
(function initTheme() {
  const btn = $('themeToggle');
  if (!btn) return;
  const setIcon = (theme) => {
    btn.innerHTML = '<i data-lucide="' + (theme === 'dark' ? 'sun' : 'moon') + '"></i>';
    if (window.lucide) window.lucide.createIcons();
  };
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  setIcon(saved);
  btn.addEventListener('click', function () {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setIcon(next);
  });
})();

function initialOf(name) {
  const n = String(name || '').replace(/^أ\.\s*/, '').replace(/^د\.\s*/, '').trim();
  return n.charAt(0) || '؟';
}

function renderTeachers(list) {
  const grid = $('teachersGrid');
  if (!list.length) {
    grid.innerHTML = '<div class="teachers-empty">لا يوجد أساتذة مطابقون</div>';
    return;
  }
  grid.innerHTML = list.map(function (t) {
    const avatar = t.photoUrl
      ? '<img src="' + escapeHtml(t.photoUrl) + '" alt="' + escapeHtml(t.name) + '" loading="lazy">'
      : escapeHtml(initialOf(t.name));

    const rank = t.rank ? '<span class="teacher-rank">' + escapeHtml(t.rank) + '</span>' : '';
    const specialty = t.specialty ? escapeHtml(t.specialty) : 'أستاذ بالكلية';
    const bio = t.bio ? escapeHtml(t.bio) : 'لم يُضف الأستاذ نبذة بعد.';

    return '<div class="teacher-card" onclick="openTeacher(\'' + escapeHtml(t._id) + '\')">' +
      '<div class="teacher-avatar">' + avatar + '</div>' +
      rank +
      '<h3>' + escapeHtml(t.name) + '</h3>' +
      '<div class="teacher-specialty">' + specialty + '</div>' +
      '<div class="teacher-bio-preview">' + bio + '</div>' +
      '<div class="teacher-stats">' +
        '<i data-lucide="book-open"></i>' +
        '<span>' + t.lessonCount + ' درس</span>' +
      '</div>' +
    '</div>';
  }).join('');
  if (window.lucide) window.lucide.createIcons();
}

function openTeacher(id) {
  window.location.href = 'teacher-profile.html?id=' + encodeURIComponent(id);
}
window.openTeacher = openTeacher;

async function loadTeachers() {
  try {
    const res = await fetch(API + '/teachers/public');
    if (!res.ok) throw new Error();
    allTeachers = await res.json();
    renderTeachers(allTeachers);
  } catch (err) {
    $('teachersGrid').innerHTML = '<div class="teachers-empty">تعذّر تحميل القائمة</div>';
  }
}

// بحث
function setupSearch() {
  const input = $('teacherSearch');
  if (!input) return;
  input.addEventListener('input', function () {
    const q = input.value.trim().toLowerCase();
    if (!q) return renderTeachers(allTeachers);
    const filtered = allTeachers.filter(function (t) {
      return (t.name || '').toLowerCase().includes(q)
          || (t.specialty || '').toLowerCase().includes(q)
          || (t.bio || '').toLowerCase().includes(q);
    });
    renderTeachers(filtered);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  loadTeachers();
  setupSearch();
});