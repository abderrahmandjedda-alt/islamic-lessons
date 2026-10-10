// ═══════════════════════════════════════════════
// 👨‍💼 لوحة تحكم الأدمن — دخول بالبريد وكلمة السر
// ═══════════════════════════════════════════════

const API = '/api';
let reviewPassword = sessionStorage.getItem('reviewPwd') || '';
let currentUser = null;

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

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}

function showToast(msg) {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.classList.add('toast-hide'); setTimeout(() => toast.remove(), 300); }, 2500);
}

// 🌙 الوضع الليلي
(function initTheme() {
  const themeToggle = $('themeToggle');
  if (!themeToggle) return;
  const setThemeIcon = (theme) => {
    themeToggle.innerHTML = '<i data-lucide="' + (theme === 'dark' ? 'sun' : 'moon') + '" class="admin-icon"></i>';
    themeToggle.setAttribute('aria-label', theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي');
    if (window.lucide) window.lucide.createIcons();
  };
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  setThemeIcon(saved);
  themeToggle.addEventListener('click', function () {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setThemeIcon(next);
  });
})();

// 🔵 فحص الجلسة
async function checkSession() {
  try {
    const res = await fetch(API + '/me', { credentials: 'same-origin' });
    if (res.ok) {
      currentUser = await res.json();
      showPanel();
      return true;
    }
  } catch (e) {}
  return false;
}

// 👤 عرض اسم المستخدم في الأعلى
function showUserChip() {
  if (!currentUser) return;
  const chip = $('userChip');
  const nameEl = $('userNameLabel');
  if (!chip || !nameEl) return;

  const roleLabel = currentUser.role === 'admin' ? 'مدير'
                  : currentUser.role === 'teacher' ? 'أستاذ'
                  : currentUser.role === 'reviewer' ? 'مراجع'
                  : '';

  const displayName = (currentUser.name || currentUser.email || '').trim();

  // تطبيع النص: احذف "ال" من البداية والتشكيل
  function normalize(s) {
    return String(s || '')
      .trim()
      .replace(/^ال/, '')
      .replace(/[ًٌٍَُِّْـ]/g, '');
  }

  const sameAsRole = normalize(displayName) === normalize(roleLabel);

  if (!displayName || sameAsRole) {
    nameEl.textContent = roleLabel;
  } else {
    nameEl.textContent = displayName + ' · ' + roleLabel;
  }

  chip.style.display = 'inline-flex';
  if (window.lucide) window.lucide.createIcons();
}

async function logout() {
  try { await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch (e) {}
  sessionStorage.removeItem('reviewPwd');
  location.href = '/admin.html';
}

// 🔐 تسجيل الدخول
async function login(e) {
  if (e) e.preventDefault();
  const email = $('emailInput').value.trim();
  const password = $('passwordInput').value;
  const errEl = $('loginError');

  if (!email || !password) {
    errEl.textContent = 'البريد وكلمة السر مطلوبان';
    return;
  }
  errEl.textContent = 'جارٍ التحقق...';

  try {
    const res = await fetch(API + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    if (res.ok) {
      errEl.textContent = '';
      const meRes = await fetch(API + '/me', { credentials: 'same-origin' });
      if (meRes.ok) currentUser = await meRes.json();

      // 💾 احفظ الحساب على الجهاز
      if (currentUser) {
        saveAccount(currentUser.email, currentUser.role, currentUser.name);
      }

      showPanel();
    } else {
      errEl.textContent = json.error || 'فشل الدخول';
    }
  } catch (err) {
    errEl.textContent = 'خطأ في الاتصال';
  }
}
window.login = login;

function showPanel() {
  $('loginScreen').style.display = 'none';
  $('adminPanel').style.display = 'block';
  showUserChip();
  fillYears();
  loadAdminLessons();
  initReviewSection();
}

// 📋 القوائم
function fillYears() {
  const sel = $('yearSelect');
  if (!sel || sel.options.length > 1) return;
  YEARS.forEach(function (y) {
    const opt = document.createElement('option');
    opt.value = y.id; opt.textContent = y.name;
    sel.appendChild(opt);
  });
}

function updateSpecializations() {
  const yearId = $('yearSelect').value;
  const specSel = $('specializationSelect');
  const subSel = $('subjectSelect');
  specSel.innerHTML = '<option value="">اختر التخصص</option>';
  subSel.innerHTML = '<option value="">اختر التخصص أولاً</option>';
  if (yearId && SPECIALIZATIONS[yearId]) {
    SPECIALIZATIONS[yearId].forEach(function (spec) {
      const opt = document.createElement('option');
      opt.value = spec; opt.textContent = spec;
      specSel.appendChild(opt);
    });
  }
}

function updateSubjects() {
  const yearId = $('yearSelect').value;
  const spec = $('specializationSelect').value;
  const subSel = $('subjectSelect');
  subSel.innerHTML = '<option value="">اختر المادة</option>';
  if (yearId && spec && SUBJECTS[yearId] && SUBJECTS[yearId][spec]) {
    SUBJECTS[yearId][spec].forEach(function (sub) {
      const subName = typeof sub === 'string' ? sub : sub.name;
      const opt = document.createElement('option');
      opt.value = subName; opt.textContent = subName;
      subSel.appendChild(opt);
    });
  }
}
window.updateSpecializations = updateSpecializations;
window.updateSubjects = updateSubjects;

// 📤 رفع درس
async function handleUpload(e) {
  e.preventDefault();
  const form = e.target;
  const status = $('uploadStatus');
  const data = new FormData(form);
  status.textContent = 'جارٍ الرفع...';
  status.style.color = 'var(--emerald)';
  try {
    const res = await fetch(API + '/lessons', {
      method: 'POST', credentials: 'same-origin', body: data
    });
    const json = await res.json();
    if (res.ok) {
      status.textContent = 'تم رفع الدرس بنجاح!';
      status.style.color = 'green';
      form.reset();
      updateSpecializations();
      loadAdminLessons();
    } else {
      status.textContent = json.error || 'فشل الرفع';
      status.style.color = 'red';
    }
  } catch (err) {
    status.textContent = 'خطأ في الاتصال';
    status.style.color = 'red';
  }
}

// 🗂️ إدارة الدروس
async function loadAdminLessons() {
  try {
    const res = await fetch(API + '/lessons');
    const lessons = await res.json();
    const div = $('adminLessons');
    if (!lessons.length) {
      div.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:20px">لا توجد دروس مرفوعة</p>';
      return;
    }
    div.innerHTML = lessons.map(function (l) {
      const yearObj = YEARS.find(y => y.id === l.year);
      const yearName = yearObj ? yearObj.name : (l.year || 'غير محدد');
      const uploaderLabel = l.uploader === 'teacher' ? '👨‍🏫 ' + (l.uploaderName || 'أستاذ')
                          : l.uploader === 'student' ? '👨‍🎓 ' + (l.uploaderName || 'طالب')
                          : '👨‍💼 الأدمن';
      return '<div class="admin-lesson-item">' +
        '<div class="info">' +
          '<h5>' + escapeHtml(l.title) + '</h5>' +
          '<small>' + escapeHtml(yearName) + ' › ' + escapeHtml(l.specialization || 'غير محدد') + ' › ' +
            escapeHtml(l.subject) + ' • ' + (l.type || '').toUpperCase() + ' • ' + uploaderLabel +
            ' • ' + new Date(l.date).toLocaleDateString('ar-EG') + '</small>' +
        '</div>' +
        '<a href="' + escapeHtml(l.url) + '" target="_blank" class="btn btn-view" style="flex:0 0 auto;padding:8px 14px"><i data-lucide="eye"></i></a>' +
        '<button class="btn btn-delete" onclick="deleteLesson(\'' + escapeHtml(l.id) + '\')"><i data-lucide="trash-2"></i></button>' +
      '</div>';
    }).join('');
    if (window.lucide) window.lucide.createIcons();
  } catch (err) { console.error(err); }
}

async function deleteLesson(id) {
  if (!confirm('هل تريد حذف هذا الدرس نهائياً؟')) return;
  try {
    const res = await fetch(API + '/lessons/' + id, { method: 'DELETE', credentials: 'same-origin' });
    if (res.ok) { showToast('تم الحذف'); loadAdminLessons(); }
    else { showToast('فشل الحذف'); }
  } catch (err) { showToast('خطأ في الاتصال'); }
}
window.deleteLesson = deleteLesson;

// 📥 قسم المراجعة
function initReviewSection() {
  if (reviewPassword) verifyReviewAndShow();
}

async function verifyReviewAndShow() {
  try {
    const res = await fetch(API + '/pending', { headers: { 'x-review-password': reviewPassword } });
    if (res.ok) { showPendingList(); loadPending(); }
    else { sessionStorage.removeItem('reviewPwd'); reviewPassword = ''; }
  } catch (err) {}
}

async function reviewLogin() {
  const pwd = $('reviewPasswordInput').value;
  const errEl = $('reviewLoginError');
  if (!pwd) { errEl.textContent = 'أدخل كلمة السر'; return; }
  errEl.textContent = 'جارٍ التحقق...';
  errEl.style.color = 'var(--emerald)';
  try {
    const res = await fetch(API + '/review-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd })
    });
    if (res.ok) {
      reviewPassword = pwd;
      sessionStorage.setItem('reviewPwd', pwd);
      errEl.textContent = '';
      showPendingList();
      loadPending();
    } else {
      errEl.textContent = 'كلمة سر المراجعة خاطئة';
      errEl.style.color = 'red';
    }
  } catch (err) {
    errEl.textContent = 'خطأ في الاتصال';
    errEl.style.color = 'red';
  }
}
window.reviewLogin = reviewLogin;

function showPendingList() {
  const ls = $('reviewLoginScreen');
  const list = $('pendingList');
  if (ls) ls.style.display = 'none';
  if (list) list.style.display = 'flex';
}

async function loadPending() {
  const list = $('pendingList');
  if (!list) return;
  list.innerHTML = '<div class="pending-loading">جارٍ التحميل...</div>';
  try {
    const res = await fetch(API + '/pending', { headers: { 'x-review-password': reviewPassword } });
    if (!res.ok) { list.innerHTML = '<div class="pending-empty">تعذّر التحميل</div>'; return; }
    const lessons = await res.json();
    const countEl = $('pendingCount');
    if (countEl) countEl.textContent = lessons.length;
    if (!lessons.length) {
      list.innerHTML = '<div class="pending-empty"><p>لا توجد دروس بانتظار المراجعة</p></div>';
      return;
    }
    list.innerHTML = lessons.map(function (l) {
      const yearObj = YEARS.find(y => y.id === l.year);
      const yearName = yearObj ? yearObj.name : l.year;
      return '<div class="pending-item">' +
        '<div class="pending-info">' +
          '<div class="pending-header">' +
            '<span class="pending-file-type">' + (l.type || '').toUpperCase() + '</span>' +
            '<h4>' + escapeHtml(l.title) + '</h4>' +
          '</div>' +
          '<div class="pending-meta">' +
            '<span><strong>' + escapeHtml(l.uploaderName || 'طالب') + '</strong></span>' +
            (l.uploaderEmail ? '<span>' + escapeHtml(l.uploaderEmail) + '</span>' : '') +
            '<span>' + escapeHtml(yearName) + '</span>' +
            '<span>' + escapeHtml(l.specialization) + '</span>' +
            '<span>' + escapeHtml(l.subject) + '</span>' +
            '<span>' + formatSize(l.size) + '</span>' +
            '<span>' + formatDate(l.date) + '</span>' +
          '</div>' +
          (l.description ? '<p class="pending-note">' + escapeHtml(l.description) + '</p>' : '') +
        '</div>' +
        '<div class="pending-actions">' +
          '<a href="' + escapeHtml(l.url) + '" target="_blank" class="pending-btn view">معاينة</a>' +
          '<button class="pending-btn approve" onclick="approvePending(\'' + escapeHtml(l.id) + '\')">قبول</button>' +
          '<button class="pending-btn reject" onclick="rejectPending(\'' + escapeHtml(l.id) + '\')">رفض</button>' +
        '</div>' +
      '</div>';
    }).join('');
    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    list.innerHTML = '<div class="pending-empty">خطأ في الاتصال</div>';
  }
}

async function approvePending(id) {
  if (!confirm('الموافقة على نشر هذا الدرس؟')) return;
  try {
    const res = await fetch(API + '/pending/' + id + '/approve', {
      method: 'POST',
      headers: { 'x-review-password': reviewPassword, 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: 'تمت الموافقة' })
    });
    if (res.ok) { showToast('تمت الموافقة'); loadPending(); loadAdminLessons(); }
    else { const d = await res.json(); showToast(d.error || 'فشلت الموافقة'); }
  } catch (err) { showToast('خطأ في الاتصال'); }
}
window.approvePending = approvePending;

async function rejectPending(id) {
  if (!confirm('رفض وحذف هذا الدرس؟ لا يمكن التراجع!')) return;
  try {
    const res = await fetch(API + '/pending/' + id + '/reject', {
      method: 'POST',
      headers: { 'x-review-password': reviewPassword }
    });
    if (res.ok) { showToast('تم الرفض والحذف'); loadPending(); }
    else { const d = await res.json(); showToast(d.error || 'فشل الرفض'); }
  } catch (err) { showToast('خطأ في الاتصال'); }
}
window.rejectPending = rejectPending;

// 🎯 الأحداث
document.addEventListener('DOMContentLoaded', async function () {
  await checkSession();

  const loginForm = $('loginForm');
  if (loginForm) loginForm.addEventListener('submit', login);
    const emailToggle = $('emailDropdownToggle');
  if (emailToggle) emailToggle.addEventListener('click', function (e) {
    e.stopPropagation();
    toggleEmailDropdown();
  });

  const emailInput = $('emailInput');
  if (emailInput) emailInput.addEventListener('focus', function () {
    if (getSavedAccounts().length) toggleEmailDropdown(true);
  });

  const reviewLoginBtn = $('reviewLoginBtn');
  if (reviewLoginBtn) reviewLoginBtn.addEventListener('click', reviewLogin);
  const reviewPwdInput = $('reviewPasswordInput');
  if (reviewPwdInput) reviewPwdInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); reviewLogin(); }
  });

  const refreshBtn = $('refreshPendingBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', function () {
    if (reviewPassword) loadPending();
  });

  const yearSelect = $('yearSelect');
  if (yearSelect) yearSelect.addEventListener('change', updateSpecializations);
  const specSelect = $('specializationSelect');
  if (specSelect) specSelect.addEventListener('change', updateSubjects);

  const uploadForm = $('uploadForm');
  if (uploadForm) uploadForm.addEventListener('submit', handleUpload);

  const logoutBtn = $('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  if (window.lucide) window.lucide.createIcons();
});
// ═══════════════════════════════════════════════
// 💾 الحسابات المحفوظة على الجهاز
// ═══════════════════════════════════════════════
const SAVED_KEY = 'savedAccounts_v1';

function getSavedAccounts() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); }
  catch (e) { return []; }
}

function saveAccount(email, role, name) {
  if (!email) return;
  const list = getSavedAccounts().filter(a => a.email !== email);
  list.unshift({ email, role, name: name || '', lastUsed: Date.now() });
  localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, 8)));
}

function removeSavedAccount(email) {
  const list = getSavedAccounts().filter(a => a.email !== email);
  localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  renderSavedAccounts();
}

function renderSavedAccounts() {
  const dropdown = $('emailDropdown');
  if (!dropdown) return;

  const accounts = getSavedAccounts();
  if (!accounts.length) {
    dropdown.innerHTML = '<div class="email-empty">لا توجد حسابات محفوظة بعد</div>';
    return;
  }

  dropdown.innerHTML = accounts.map(function (a) {
    const initial = (a.name || a.email || '?').trim().charAt(0).toUpperCase();
    const roleLabel = a.role === 'admin' ? 'مدير'
                    : a.role === 'teacher' ? 'أستاذ' : 'حساب';
    return '<div class="email-item" data-email="' + escapeHtml(a.email) + '">' +
      '<div class="avatar">' + escapeHtml(initial) + '</div>' +
      '<div class="info">' +
        '<span class="email">' + escapeHtml(a.email) + '</span>' +
        '<span class="role">' + roleLabel + (a.name ? ' · ' + escapeHtml(a.name) : '') + '</span>' +
      '</div>' +
      '<button type="button" class="remove-btn" data-remove="' + escapeHtml(a.email) + '" title="إزالة">' +
        '<i data-lucide="x" class="admin-icon"></i>' +
      '</button>' +
    '</div>';
  }).join('');

  if (window.lucide) window.lucide.createIcons();

  // انقر لاختيار حساب
  dropdown.querySelectorAll('.email-item').forEach(function (item) {
    item.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-remove]')) return;
      const email = item.getAttribute('data-email');
      $('emailInput').value = email;
      dropdown.style.display = 'none';
      setTimeout(() => $('passwordInput').focus(), 50);
    });
  });

  // زر الإزالة
  dropdown.querySelectorAll('[data-remove]').forEach(function (btn) {
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      const email = btn.getAttribute('data-remove');
      removeSavedAccount(email);
    });
  });
}

function toggleEmailDropdown(show) {
  const dropdown = $('emailDropdown');
  if (!dropdown) return;
  const willShow = show !== undefined ? show : dropdown.style.display === 'none';
  if (willShow) {
    renderSavedAccounts();
    dropdown.style.display = 'block';
  } else {
    dropdown.style.display = 'none';
  }
}

// أغلق القائمة عند النقر خارجها
document.addEventListener('click', function (e) {
  const wrap = e.target.closest('.email-field-wrap');
  if (!wrap) toggleEmailDropdown(false);
});
// استخدم واجهة المتصفح لعرض الحسابات المحفوظة تلقائياً
if (window.PasswordCredential && navigator.credentials) {
  window.addEventListener('load', async () => {
    try {
      await navigator.credentials.get({ password: true, mediation: 'optional' });
    } catch (e) { /* المستخدم رفض */ }
  });
}