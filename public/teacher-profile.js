// ═══════════════════════════════════════════════
// 👤 صفحة الأستاذ
// ═══════════════════════════════════════════════

const API = '/api';
function $(id) { return document.getElementById(id); }

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
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

function renderProfile(data) {
  const t = data.teacher;
  const container = $('profileContent');

  const avatar = t.photoUrl
    ? '<img src="' + escapeHtml(t.photoUrl) + '" alt="' + escapeHtml(t.name) + '">'
    : escapeHtml(initialOf(t.name));

  const rank = t.rank ? '<div class="profile-rank">' + escapeHtml(t.rank) + '</div>' : '';
  const specialty = t.specialty ? '<div class="profile-specialty">' + escapeHtml(t.specialty) + '</div>' : '';

  const bio = t.bio
    ? '<div class="profile-bio">' + escapeHtml(t.bio) + '</div>'
    : '<div class="profile-bio empty">لم يُضف الأستاذ نبذة شخصية بعد.</div>';

  const contact = t.contactEmail
    ? '<div class="profile-contact">' +
        '<a href="mailto:' + escapeHtml(t.contactEmail) + '" class="contact-btn">' +
          '<i data-lucide="mail"></i> تواصل بالبريد' +
        '</a>' +
      '</div>'
    : '';

  container.innerHTML =
    '<div class="profile-card">' +
      '<div class="profile-avatar">' + avatar + '</div>' +
      rank +
      '<h1>' + escapeHtml(t.name) + '</h1>' +
      specialty +
      '<div class="profile-stats">' +
        '<div class="profile-stat">' +
          '<i data-lucide="book-open"></i>' +
          '<span>' + data.lessonCount + ' درس على المنصة</span>' +
        '</div>' +
      '</div>' +
      bio +
      contact +
    '</div>';

  if (window.lucide) window.lucide.createIcons();

  // الدروس
  const lessonsSection = $('lessonsSection');
  const lessonsDiv = $('profileLessons');

  if (!data.lessons.length) {
    lessonsSection.style.display = 'block';
    lessonsDiv.innerHTML = '<div class="profile-empty">لم يرفع هذا الأستاذ أي دروس بعد.</div>';
    return;
  }

  lessonsSection.style.display = 'block';
  lessonsDiv.innerHTML = data.lessons.map(function (l) {
    const yearObj = (typeof YEARS !== 'undefined' ? YEARS : []).find(y => y.id === l.year);
    const yearName = yearObj ? yearObj.name : (l.year || '');
    const type = (l.type || '').toUpperCase();

    return '<div class="lesson-card">' +
      '<div class="lesson-header">' +
        '<h4>' + escapeHtml(l.title) + '</h4>' +
        '<span class="file-badge ' + (type === 'PDF' ? 'pdf' : 'doc') + '">' + type + '</span>' +
      '</div>' +
      (l.description ? '<p class="lesson-desc">' + escapeHtml(l.description) + '</p>' : '') +
      '<div class="lesson-meta">' +
        (yearName ? '<span>' + escapeHtml(yearName) + '</span>' : '') +
        '<span>' + escapeHtml(l.specialization || '') + '</span>' +
        '<span>' + escapeHtml(l.subject || '') + '</span>' +
        '<span>' + formatSize(l.size) + '</span>' +
      '</div>' +
      '<div class="lesson-actions">' +
        '<a href="' + escapeHtml(l.url) + '" target="_blank" class="btn btn-view">' +
          '<i data-lucide="eye"></i> معاينة' +
        '</a>' +
        '<a href="' + escapeHtml(l.url) + '" download class="btn btn-download">' +
          '<i data-lucide="download"></i> تحميل' +
        '</a>' +
      '</div>' +
    '</div>';
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

async function loadProfile() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) {
    $('profileContent').innerHTML =
      '<div class="profile-card"><div class="profile-empty">لم يُحدَّد الأستاذ</div></div>';
    return;
  }

  try {
    const res = await fetch(API + '/teachers/public/' + encodeURIComponent(id));
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    document.title = data.teacher.name + ' — كلية العلوم الإسلامية';
    renderProfile(data);
  } catch (err) {
    $('profileContent').innerHTML =
      '<div class="profile-card"><div class="profile-empty">لم يُعثر على الأستاذ المطلوب</div></div>';
  }
}

document.addEventListener('DOMContentLoaded', loadProfile);