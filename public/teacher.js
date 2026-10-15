// ═══════════════════════════════════════════════
// 👨‍🏫 بوابة الأساتذة
// ═══════════════════════════════════════════════

const API = '/api';
const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

let teacherName = sessionStorage.getItem('teacherName') || '';
let fileCounter = 0;
let resetTimer = null;
let resultsTimer = null;
let profileCache = { photoUrl: '' };

// ═══════════════════════════════════════════════
// 🎨 الأيقونات
// ═══════════════════════════════════════════════
function icon(name, cls) {
  return '<i data-lucide="' + name + '"' + (cls ? ' class="' + cls + '"' : '') + '></i>';
}
function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}
(function watchIcons() {
  if (!window.lucide) return;
  let scheduled = false;
  new MutationObserver(function() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function() { scheduled = false; refreshIcons(); });
  }).observe(document.body, { childList: true, subtree: true });
  refreshIcons();
})();

function setMsg(el, msg, iconName) {
  if (!el) return;
  el.innerHTML = '';
  if (!msg) return;
  if (iconName && window.lucide) {
    el.insertAdjacentHTML('beforeend', icon(iconName, iconName === 'loader-circle' ? 'spin' : ''));
  }
  el.appendChild(document.createTextNode(msg));
}

// ═══════════════════════════════════════════════
// 🛠️ أدوات
// ═══════════════════════════════════════════════
function $(id) { return document.getElementById(id); }

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function currentFilesCount() { return document.querySelectorAll('.file-input-item').length; }

function setStatus(msg, color, iconName) {
  const status = $('uploadStatus');
  if (!status) return;
  setMsg(status, msg, iconName);
  status.style.color = color || '';
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function showToast(msg, iconName) {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.innerHTML = (iconName && window.lucide ? icon(iconName) : '') + '<span></span>';
  toast.querySelector('span').textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.classList.add('toast-hide');
    setTimeout(function() { toast.remove(); }, 300);
  }, 2500);
}

// ═══════════════════════════════════════════════
// 🌙 الوضع الليلي
// ═══════════════════════════════════════════════
(function initTheme() {
  const themeToggle = $('themeToggle');
  if (!themeToggle) return;
  function setThemeIcon(theme) {
    if (window.lucide) {
      themeToggle.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
      refreshIcons();
    } else {
      themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  setThemeIcon(savedTheme);
  themeToggle.addEventListener('click', function() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setThemeIcon(next);
  });
})();

// ═══════════════════════════════════════════════
// 💾 الحسابات المحفوظة
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
  const accounts = getSavedAccounts().filter(a => a.role === 'teacher');
  if (!accounts.length) {
    dropdown.innerHTML = '<div class="email-empty">لا توجد حسابات محفوظة بعد</div>';
    return;
  }
  dropdown.innerHTML = accounts.map(function(a) {
    const initial = (a.name || a.email || '?').trim().charAt(0).toUpperCase();
    return '<div class="email-item" data-email="' + escapeHtml(a.email) + '">' +
      '<div class="avatar">' + escapeHtml(initial) + '</div>' +
      '<div class="info">' +
        '<span class="email">' + escapeHtml(a.email) + '</span>' +
        '<span class="role">' + (a.name ? escapeHtml(a.name) : 'أستاذ') + '</span>' +
      '</div>' +
      '<button type="button" class="remove-btn" data-remove="' + escapeHtml(a.email) + '" title="إزالة">' +
        icon('x') +
      '</button>' +
    '</div>';
  }).join('');
  refreshIcons();

  dropdown.querySelectorAll('.email-item').forEach(function(item) {
    item.addEventListener('click', function(ev) {
      if (ev.target.closest('[data-remove]')) return;
      const email = item.getAttribute('data-email');
      $('emailInput').value = email;
      dropdown.style.display = 'none';
      setTimeout(() => $('passwordInput').focus(), 50);
    });
  });
  dropdown.querySelectorAll('[data-remove]').forEach(function(btn) {
    btn.addEventListener('click', function(ev) {
      ev.stopPropagation();
      removeSavedAccount(btn.getAttribute('data-remove'));
    });
  });
}

function toggleEmailDropdown(show) {
  const dropdown = $('emailDropdown');
  if (!dropdown) return;
  const willShow = show !== undefined ? show : dropdown.style.display === 'none';
  if (willShow) { renderSavedAccounts(); dropdown.style.display = 'block'; }
  else dropdown.style.display = 'none';
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.email-field-wrap')) toggleEmailDropdown(false);
});

// ═══════════════════════════════════════════════
// 🔐 تسجيل الدخول
// ═══════════════════════════════════════════════
async function doLogin(e) {
  if (e) e.preventDefault();
  const email = $('emailInput').value.trim();
  const password = $('passwordInput').value;
  const errEl = $('loginError');

  if (!email || !password) {
    setMsg(errEl, 'البريد وكلمة السر مطلوبان', 'circle-x');
    return;
  }

  setMsg(errEl, 'جارٍ التحقق...', 'loader-circle');
  errEl.style.color = 'var(--emerald, #0d5a3a)';

  try {
    const res = await fetch(API + '/teacher-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (res.ok) {
      teacherName = data.name || '';
      sessionStorage.setItem('teacherName', teacherName);
      sessionStorage.setItem('teacherEmail', email);
      setMsg(errEl, '');
      saveAccount(email, 'teacher', teacherName);
      showPanel();
    } else {
      setMsg(errEl, data.error || 'البريد أو كلمة السر غير صحيحة', 'circle-x');
      errEl.style.color = 'red';
    }
  } catch (err) {
    setMsg(errEl, 'خطأ في الاتصال', 'circle-x');
    errEl.style.color = 'red';
  }
}
window.doLogin = doLogin;

// ═══════════════════════════════════════════════
// ✅ التحقق من الجلسة
// ═══════════════════════════════════════════════
async function verifyAndShow() {
  const params = new URLSearchParams(location.search);
  const err = params.get('error');
  if (err) {
    const errEl = $('loginError');
    const messages = {
      unauthorized: 'هذا الحساب غير مصرح له بالدخول. تواصل مع إدارة المنصة.',
      google_denied: 'تم إلغاء الدخول من Google.',
      google_failed: 'فشل الدخول بحساب Google. حاول مجدداً.',
      no_code: 'لم يتم استلام بيانات من Google.',
      wrong_role: 'هذا الحساب لا يملك صلاحية لهذه الصفحة.'
    };
    if (errEl) {
      setMsg(errEl, messages[err] || 'حدث خطأ في الدخول.', 'circle-x');
      errEl.style.color = 'red';
    }
    history.replaceState({}, '', location.pathname);
  }

  try {
    const res = await fetch(API + '/me', { credentials: 'same-origin' });
    if (res.ok) {
      const user = await res.json();
      if (user.role === 'admin') {
        window.location.href = '/admin.html';
        return;
      }
      if (user.role === 'teacher') {
        teacherName = user.name || teacherName;
        sessionStorage.setItem('teacherName', teacherName);
        if (user.email) {
          sessionStorage.setItem('teacherEmail', user.email);
          saveAccount(user.email, 'teacher', teacherName);
        }
        showPanel();
        return;
      }
      // student → لا يفتح البوابة
      sessionStorage.removeItem('teacherName');
      sessionStorage.removeItem('teacherEmail');
      teacherName = '';
    } else {
      sessionStorage.removeItem('teacherName');
      sessionStorage.removeItem('teacherEmail');
      teacherName = '';
    }
  } catch (err) { console.error('خطأ:', err); }
}

// ═══════════════════════════════════════════════
// 🎨 اللوحة
// ═══════════════════════════════════════════════
function showPanel() {
  const loginScreen = $('loginScreen');
  const panel = $('teacherPanel');
  const logoutBtn = $('logoutBtn');

  if (loginScreen) loginScreen.style.display = 'none';
  if (panel) panel.style.display = 'block';
  if (logoutBtn) logoutBtn.style.display = 'inline-flex';

  const welcomeEl = $('welcomeTeacher');
  if (welcomeEl && teacherName) {
    welcomeEl.textContent = 'مرحباً، ' + teacherName;
    welcomeEl.style.display = 'block';
  }

  fillYears();
  if (currentFilesCount() === 0) addFileInput();
  loadMyLessons();
  initProfileCard();
  initUploadChip();
}
// ═══════════════════════════════════════════════
// 📤 رفع الدروس — طي/فتح
// ═══════════════════════════════════════════════
function toggleUploadForm(show) {
  const wrap = $('uploadFormWrap');
  const chip = $('uploadChip');
  if (!wrap || !chip) return;

  const willShow = show !== undefined ? show : wrap.style.display === 'none';

  wrap.style.display = willShow ? 'block' : 'none';
  chip.classList.toggle('open', willShow);
  chip.setAttribute('aria-expanded', String(willShow));

  if (window.lucide) window.lucide.createIcons();
}

function initUploadChip() {
  const chip = $('uploadChip');
  if (!chip) return;

  chip.addEventListener('click', function () {
    toggleUploadForm();
  });

  chip.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleUploadForm();
    }
  });
}

// ═══════════════════════════════════════════════
// 📋 القوائم
// ═══════════════════════════════════════════════
function fillYears() {
  const sel = $('yearSelect');
  if (!sel || sel.options.length > 1) return;
  if (typeof YEARS === 'undefined') return;
  YEARS.forEach(function(y) {
    const opt = document.createElement('option');
    opt.value = y.id;
    opt.textContent = y.name;
    sel.appendChild(opt);
  });
}

function updateSpecializations() {
  const yearId = $('yearSelect').value;
  const specSel = $('specializationSelect');
  const subSel = $('subjectSelect');
  specSel.innerHTML = '<option value="">— اختر التخصص —</option>';
  subSel.innerHTML = '<option value="">— اختر السنة أولاً —</option>';
  if (yearId && typeof SPECIALIZATIONS !== 'undefined' && SPECIALIZATIONS[yearId]) {
    SPECIALIZATIONS[yearId].forEach(function(spec) {
      const opt = document.createElement('option');
      opt.value = spec;
      opt.textContent = spec;
      specSel.appendChild(opt);
    });
  }
}

function updateSubjects() {
  const yearId = $('yearSelect').value;
  const spec = $('specializationSelect').value;
  const subSel = $('subjectSelect');
  subSel.innerHTML = '<option value="">— اختر المادة —</option>';
  if (yearId && spec && typeof SUBJECTS !== 'undefined' && SUBJECTS[yearId] && SUBJECTS[yearId][spec]) {
    SUBJECTS[yearId][spec].forEach(function(sub) {
      const subName = typeof sub === 'string' ? sub : sub.name;
      const opt = document.createElement('option');
      opt.value = subName;
      opt.textContent = subName;
      subSel.appendChild(opt);
    });
  }
}
window.updateSpecializations = updateSpecializations;
window.updateSubjects = updateSubjects;

// ═══════════════════════════════════════════════
// 📄 إدارة الملفات
// ═══════════════════════════════════════════════
function addFileInput() {
  if (currentFilesCount() >= MAX_FILES) {
    alert('الحد الأقصى ' + MAX_FILES + ' ملفات');
    return;
  }
  fileCounter++;
  const container = $('filesContainer');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'file-input-item';
  div.innerHTML =
    '<div class="file-input-header">' +
      '<span class="file-number">' + icon('file-text') + ' ملف</span>' +
      '<button type="button" class="file-remove-btn" title="حذف" aria-label="حذف">' + icon('x') + '</button>' +
    '</div>' +
    '<input type="file" name="files" accept=".pdf,.doc,.docx" class="file-input">' +
    '<input type="text" name="titles" placeholder="عنوان الدرس (اختياري)" class="file-title-input" maxlength="200">';
  container.appendChild(div);
  updateFilesCount();
}

function updateFilesCount() {
  const items = document.querySelectorAll('.file-input-item');
  items.forEach(function(item, i) {
    const num = item.querySelector('.file-number');
    if (num) num.innerHTML = icon('file-text') + ' ملف ' + (i + 1);
  });
  const countEl = $('filesCount');
  if (countEl) countEl.textContent = items.length + ' من ' + MAX_FILES;
}
window.addFileInput = addFileInput;

// ═══════════════════════════════════════════════
// 📤 الرفع
// ═══════════════════════════════════════════════
async function handleUpload(e) {
  e.preventDefault();
  const year = $('yearSelect').value;
  const specialization = $('specializationSelect').value;
  const subject = $('subjectSelect').value;

  if (!year || !specialization || !subject) {
    setStatus('يجب اختيار السنة والتخصص والمادة', 'red', 'circle-x');
    return;
  }

  const files = [];
  const titles = [];
  document.querySelectorAll('.file-input-item').forEach(function(item) {
    const fileInput = item.querySelector('.file-input');
    const titleInput = item.querySelector('.file-title-input');
    if (fileInput && fileInput.files.length > 0) {
      files.push(fileInput.files[0]);
      titles.push(titleInput ? titleInput.value.trim() : '');
    }
  });

  if (files.length === 0) {
    setStatus('اختر ملفاً واحداً على الأقل', 'red', 'circle-x');
    return;
  }

  const oversized = [];
  for (let i = 0; i < files.length; i++) {
    if (files[i].size > MAX_FILE_SIZE) {
      const sizeMB = (files[i].size / 1024 / 1024).toFixed(1);
      oversized.push(files[i].name + ' (' + sizeMB + ' MB)');
    }
  }
  if (oversized.length > 0) {
    setStatus('ملفات كبيرة (الحد 10 MB)', 'red', 'circle-x');
    alert('الملفات التالية كبيرة جداً:\n\n' + oversized.join('\n') +
      '\n\nالحد الأقصى: 10 MB لكل ملف\n\nنصيحة: استخدم ilovepdf.com للضغط');
    return;
  }

  const formData = new FormData();
  formData.append('year', year);
  formData.append('specialization', specialization);
  formData.append('subject', subject);
  files.forEach(function(f) { formData.append('files', f); });
  titles.forEach(function(t) { formData.append('titles', t); });

  const submitBtn = $('uploadForm').querySelector('[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  setStatus('جارٍ رفع ' + files.length + ' ملف...', 'var(--emerald)', 'loader-circle');

  try {
    const res = await fetch(API + '/teacher/batch', {
      method: 'POST', credentials: 'same-origin', body: formData
    });

    if (res.status === 401 || res.status === 403) {
      setStatus('انتهت الجلسة', 'red', 'circle-x');
      sessionStorage.removeItem('teacherName');
      sessionStorage.removeItem('teacherEmail');
      setTimeout(function() { location.reload(); }, 2000);
      return;
    }

    const data = await res.json();
    if (res.ok && data.success) {
      setStatus('تم رفع ' + data.uploaded + ' ملف بنجاح!', 'green', 'circle-check');
      showResults(data);
      loadMyLessons();
      clearTimeout(resetTimer);
      resetTimer = setTimeout(resetForm, 2000);
    } else {
      setStatus(data.error || 'فشل الرفع', 'red', 'circle-x');
    }
  } catch (err) {
    setStatus('خطأ في الاتصال: ' + err.message, 'red', 'circle-x');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ═══════════════════════════════════════════════
// 📊 النتائج
// ═══════════════════════════════════════════════
function showResults(data) {
  const results = $('uploadResults');
  const content = $('resultsContent');
  if (!results || !content) return;

  let html = '<div class="result-summary">' +
    '<p>' + icon('circle-check') + ' نجح: <strong>' + (Number(data.uploaded) || 0) + '</strong></p>';
  if (data.failed > 0) {
    html += '<p>' + icon('circle-x') + ' فشل: <strong>' + Number(data.failed) + '</strong></p>';
  }
  html += '</div>';

  if (Array.isArray(data.errors) && data.errors.length > 0) {
    html += '<div class="result-errors"><h4>أخطاء:</h4><ul>';
    data.errors.forEach(function(err) {
      html += '<li><strong>' + escapeHtml(err.filename) + '</strong>: ' + escapeHtml(err.error) + '</li>';
    });
    html += '</ul></div>';
  }
  content.innerHTML = html;
  results.style.display = 'block';
  clearTimeout(resultsTimer);
  resultsTimer = setTimeout(function() { results.style.display = 'none'; }, 8000);
}

function resetForm() {
  const container = $('filesContainer');
  if (container) container.innerHTML = '';
  fileCounter = 0;
  addFileInput();
  setStatus('', '');
}

// ═══════════════════════════════════════════════
// 📚 دروسي المرفوعة
// ═══════════════════════════════════════════════
async function loadMyLessons() {
  const list = $('myLessonsList');
  const countEl = $('myLessonsCount');
  if (!list) return;

  list.innerHTML = '<div class="my-lessons-loading">' + icon('loader-circle', 'spin') + ' جارٍ التحميل...</div>';

  try {
    const res = await fetch(API + '/teacher/my-lessons', { credentials: 'same-origin' });
    if (!res.ok) {
      list.innerHTML = '<div class="my-lessons-empty">' + icon('circle-x') + ' تعذّر تحميل الدروس</div>';
      return;
    }
    const lessons = await res.json();
    if (countEl) countEl.textContent = lessons.length;

    if (!lessons.length) {
      list.innerHTML = '<div class="my-lessons-empty">' +
        '<span class="empty-icon">' + icon('inbox') + '</span>' +
        '<p>لم ترفع أي دروس بعد</p></div>';
      return;
    }

    list.innerHTML = lessons.map(function(lesson) {
      const date = new Date(lesson.date).toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
      return '<div class="my-lesson-item">' +
        '<div class="my-lesson-info">' +
          '<span class="my-lesson-icon">' + icon('file-text') + '</span>' +
          '<div class="my-lesson-text">' +
            '<h4>' + escapeHtml(lesson.title) + '</h4>' +
            '<p>' +
              '<span>' + icon('calendar') + ' ' + escapeHtml(date) + '</span>' +
              '<span>' + icon('hard-drive') + ' ' + formatSize(lesson.size) + '</span>' +
              '<span>' + icon('library') + ' ' + escapeHtml(lesson.subject) + '</span>' +
            '</p>' +
          '</div>' +
        '</div>' +
        '<div class="my-lesson-actions">' +
          '<a href="' + escapeHtml(lesson.url) + '" target="_blank" class="my-lesson-btn view" title="فتح" aria-label="فتح">' + icon('eye') + '</a>' +
          '<button type="button" class="my-lesson-btn delete" onclick="deleteMyLesson(\'' + escapeHtml(lesson.id) + '\', \'' + escapeHtml(lesson.title).replace(/'/g, "\\'") + '\')" title="حذف" aria-label="حذف">' + icon('trash-2') + '</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (err) {
    console.error('خطأ:', err);
    list.innerHTML = '<div class="my-lessons-empty">' + icon('circle-x') + ' خطأ في الاتصال</div>';
  }
}

async function deleteMyLesson(id, title) {
  if (!confirm('هل أنت متأكد من حذف هذا الدرس؟\n\n' + title + '\n\nلا يمكن التراجع!')) return;
  try {
    const res = await fetch(API + '/teacher/lessons/' + id, { method: 'DELETE', credentials: 'same-origin' });
    if (res.ok) { showToast('تم حذف الدرس', 'circle-check'); loadMyLessons(); }
    else { const data = await res.json(); showToast(data.error || 'فشل الحذف', 'circle-x'); }
  } catch (err) { showToast('خطأ في الاتصال', 'circle-x'); }
}
window.loadMyLessons = loadMyLessons;
window.deleteMyLesson = deleteMyLesson;

// ═══════════════════════════════════════════════
// 🎴 بطاقة الأستاذ
// ═══════════════════════════════════════════════
function initialOf(name) {
  const n = String(name || '').replace(/^أ\.\s*/, '').replace(/^د\.\s*/, '').trim();
  return n.charAt(0) || '؟';
}

function renderProfileAvatar() {
  const el = $('profileAvatar');
  if (!el) return;
  if (profileCache.photoUrl) {
    const img = document.createElement('img');
    img.alt = '';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    img.src = profileCache.photoUrl + (profileCache.photoUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
    img.onerror = function () {
      console.error('❌ فشل تحميل الصورة:', profileCache.photoUrl);
      el.textContent = initialOf(teacherName);
    };
    el.innerHTML = '';
    el.appendChild(img);
  } else {
    el.textContent = initialOf(teacherName);
  }
  const removeBtn = $('removePhotoBtn');
  if (removeBtn) removeBtn.style.display = profileCache.photoUrl ? 'inline-flex' : 'none';
}

// الشريط المصغّر
function updateProfileChip() {
  const chipName = $('profileChipName');
  const chipEmail = $('profileChipEmail');
  const chipAvatar = $('profileChipAvatar');

  if (chipName) chipName.textContent = teacherName || '—';
  if (chipEmail) {
    const email = sessionStorage.getItem('teacherEmail') || '';
    chipEmail.textContent = email || '—';
  }
  if (chipAvatar) {
    if (profileCache.photoUrl) {
      const img = document.createElement('img');
      img.src = profileCache.photoUrl;
      img.alt = teacherName || '';
      img.onerror = function () {
        chipAvatar.textContent = initialOf(teacherName);
      };
      chipAvatar.innerHTML = '';
      chipAvatar.appendChild(img);
    } else {
      chipAvatar.textContent = initialOf(teacherName);
    }
  }
}

function toggleProfileForm(show) {
  const wrap = $('profileFormWrap');
  const chip = $('profileChip');
  if (!wrap || !chip) return;

  const willShow = show !== undefined ? show : wrap.style.display === 'none';

  wrap.style.display = willShow ? 'block' : 'none';
  chip.classList.toggle('open', willShow);
  chip.setAttribute('aria-expanded', String(willShow));

  if (window.lucide) window.lucide.createIcons();
}

async function loadProfileCard() {
  const card = $('profileCard');
  if (card) card.style.display = 'block';

  try {
    const res = await fetch(API + '/teacher/me/profile', { credentials: 'same-origin' });
    if (!res.ok) throw new Error();
    const data = await res.json();
    profileCache.photoUrl = data.photoUrl || '';
    const rankEl = $('profileRank');
    const specEl = $('profileSpecialty');
    const contactEl = $('profileContactEmail');
    const bioEl = $('profileBio');
    if (rankEl) rankEl.value = data.rank || '';
    if (specEl) specEl.value = data.specialty || '';
    if (contactEl) contactEl.value = data.contactEmail || '';
    if (bioEl) bioEl.value = data.bio || '';
    updateBioCount();
    renderProfileAvatar();
    updateProfileChip();
  } catch (err) {
    console.error('فشل تحميل البطاقة', err);
  }
}

function updateBioCount() {
  const el = $('bioCount');
  const ta = $('profileBio');
  if (el && ta) el.textContent = ta.value.length;
}

async function saveProfile() {
  const status = $('profileSaveStatus');
  status.textContent = 'جارٍ الحفظ...';
  status.style.color = 'var(--emerald)';

  try {
    const res = await fetch(API + '/teacher/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        rank: $('profileRank').value.trim(),
        specialty: $('profileSpecialty').value.trim(),
        contactEmail: $('profileContactEmail').value.trim(),
        bio: $('profileBio').value
      })
    });
    const data = await res.json();
    if (res.ok) {
      status.textContent = 'تم حفظ بطاقتك بنجاح';
      status.style.color = 'green';
      setTimeout(() => { status.textContent = ''; }, 2500);
    } else {
      status.textContent = data.error || 'فشل الحفظ';
      status.style.color = 'red';
    }
  } catch (err) {
    status.textContent = 'خطأ في الاتصال';
    status.style.color = 'red';
  }
}

async function uploadPhoto(file) {
  const status = $('profileSaveStatus');
  status.textContent = 'جارٍ رفع الصورة...';
  status.style.color = 'var(--emerald)';

  const fd = new FormData();
  fd.append('photo', file);

  try {
    const res = await fetch(API + '/teacher/profile/photo', {
      method: 'POST', credentials: 'same-origin', body: fd
    });
    const data = await res.json();
    if (res.ok) {
      profileCache.photoUrl = data.photoUrl;
      renderProfileAvatar();
      updateProfileChip();
      status.textContent = 'تم رفع الصورة';
      status.style.color = 'green';
      setTimeout(() => { status.textContent = ''; }, 2500);
    } else {
      status.textContent = data.error || 'فشل الرفع';
      status.style.color = 'red';
    }
  } catch (err) {
    status.textContent = 'خطأ في الاتصال';
    status.style.color = 'red';
  }
}

async function removePhoto() {
  if (!confirm('حذف صورة البطاقة؟')) return;
  try {
    const res = await fetch(API + '/teacher/profile/photo', {
      method: 'DELETE', credentials: 'same-origin'
    });
    if (res.ok) {
      profileCache.photoUrl = '';
      renderProfileAvatar();
      updateProfileChip();
      showToast('تم حذف الصورة', 'circle-check');
    }
  } catch (err) {}
}

function initProfileCard() {
  loadProfileCard();

  const chip = $('profileChip');
  if (chip) {
    chip.addEventListener('click', function (e) {
      if (e.target.closest('.profile-chip-toggle')) return;
      toggleProfileForm();
    });
    chip.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleProfileForm();
      }
    });
  }

  const toggleBtn = document.querySelector('.profile-chip-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleProfileForm();
    });
  }

  const saveBtn = $('saveProfileBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveProfile);

  const bio = $('profileBio');
  if (bio) bio.addEventListener('input', updateBioCount);

  const uploadBtn = $('uploadPhotoBtn');
  const fileInput = $('profilePhotoInput');
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      const f = fileInput.files[0];
      if (f) uploadPhoto(f);
      fileInput.value = '';
    });
  }

  const removeBtn = $('removePhotoBtn');
  if (removeBtn) removeBtn.addEventListener('click', removePhoto);

  renderProfileAvatar();
  updateProfileChip();
}

// ═══════════════════════════════════════════════
// 🎯 الأحداث
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  const loginForm = $('loginForm');
  if (loginForm) loginForm.addEventListener('submit', doLogin);

  const emailToggle = $('emailDropdownToggle');
  if (emailToggle) emailToggle.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleEmailDropdown();
  });

  const emailInput = $('emailInput');
  if (emailInput) emailInput.addEventListener('focus', function() {
    if (getSavedAccounts().filter(a => a.role === 'teacher').length) toggleEmailDropdown(true);
  });

  const logoutBtn = $('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function() {
      try { await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch (e) {}
      sessionStorage.removeItem('teacherName');
      sessionStorage.removeItem('teacherEmail');
      location.reload();
    });
  }

  const addFileBtn = $('addFileBtn');
  if (addFileBtn) addFileBtn.addEventListener('click', addFileInput);

  const refreshBtn = $('refreshLessonsBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', loadMyLessons);

  const yearSelect = $('yearSelect');
  if (yearSelect) yearSelect.addEventListener('change', updateSpecializations);
  const specSelect = $('specializationSelect');
  if (specSelect) specSelect.addEventListener('change', updateSubjects);

  const container = $('filesContainer');
  if (container) {
    container.addEventListener('click', function(e) {
      const btn = e.target.closest('.file-remove-btn');
      if (!btn) return;
      const item = btn.closest('.file-input-item');
      if (item) { item.remove(); updateFilesCount(); }
    });
  }

  const form = $('uploadForm');
  if (form) form.addEventListener('submit', handleUpload);

  verifyAndShow();
});