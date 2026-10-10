// ═══════════════════════════════════════════════
// 👨‍🏫 بوابة الأساتذة - نظام كلمات سر متعددة
// ═══════════════════════════════════════════════

const API = '/api';
const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

let teacherPassword = sessionStorage.getItem('teacherPwd') || '';
let teacherName = sessionStorage.getItem('teacherName') || '';
let fileCounter = 0;
let resetTimer = null;
let resultsTimer = null;

// ═══════════════════════════════════════════════
// 🎨 نظام الأيقونات (Lucide)
// ═══════════════════════════════════════════════
// icon('star') يرجع كود أيقونة، وتتحول تلقائياً إلى رسمة SVG
function icon(name, cls) {
  return '<i data-lucide="' + name + '"' + (cls ? ' class="' + cls + '"' : '') + '></i>';
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

// مراقب: كلما أُضيف محتوى جديد للصفحة يحوّل أيقوناته تلقائياً
(function watchIcons() {
  if (!window.lucide) return;
  let scheduled = false;
  new MutationObserver(function() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function() {
      scheduled = false;
      refreshIcons();
    });
  }).observe(document.body, { childList: true, subtree: true });
  refreshIcons();
})();

// رسالة نصية بجانبها أيقونة (النص يُضاف كنص عادي فلا خطر عليه)
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
function $(id) {
  return document.getElementById(id);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function currentFilesCount() {
  return document.querySelectorAll('.file-input-item').length;
}

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

// iconName اختياري: اسم أيقونة تظهر بجانب الرسالة
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
  
  // أيقونة الزر: قمر نهاراً، شمس ليلاً
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
// 🔐 تسجيل الدخول
// ═══════════════════════════════════════════════
async function doLogin() {
  const pwd = $('passwordInput').value;
  const errEl = $('loginError');
  
  if (!pwd) {
    setMsg(errEl, 'أدخل كلمة السر', 'circle-x');
    return;
  }
  
  setMsg(errEl, 'جارٍ التحقق...', 'loader-circle');
  errEl.style.color = 'var(--emerald)';
  
  try {
    const res = await fetch(API + '/teacher-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd })
    });
    
    if (res.ok) {
      const data = await res.json();
      teacherPassword = pwd;
      teacherName = data.name || '';
      sessionStorage.setItem('teacherPwd', pwd);
      sessionStorage.setItem('teacherName', teacherName);
      setMsg(errEl, '');
      showPanel();
    } else {
      setMsg(errEl, 'كلمة السر غير صحيحة', 'circle-x');
      errEl.style.color = 'red';
    }
  } catch (err) {
    setMsg(errEl, 'خطأ في الاتصال', 'circle-x');
    errEl.style.color = 'red';
  }
}

// 🌐 جعل الدالة عامة
window.doLogin = doLogin;

// ═══════════════════════════════════════════════
// ✅ التحقق التلقائي
// ═══════════════════════════════════════════════
async function verifyAndShow() {
  try {
    const res = await fetch(API + '/teacher-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: teacherPassword })
    });
    
    if (res.ok) {
      const data = await res.json();
      teacherName = data.name || teacherName;
      sessionStorage.setItem('teacherName', teacherName);
      showPanel();
    } else {
      sessionStorage.removeItem('teacherPwd');
      sessionStorage.removeItem('teacherName');
      teacherPassword = '';
      teacherName = '';
    }
  } catch (err) {
    console.error('خطأ:', err);
  }
}

// ═══════════════════════════════════════════════
// 🎨 عرض اللوحة
// ═══════════════════════════════════════════════
function showPanel() {
  const loginScreen = $('loginScreen');
  const panel = $('teacherPanel');
  const logoutBtn = $('logoutBtn');
  
  if (loginScreen) loginScreen.style.display = 'none';
  if (panel) panel.style.display = 'block';
  if (logoutBtn) logoutBtn.style.display = 'inline-flex';
  
  // 👋 عرض اسم الأستاذ
  const welcomeEl = $('welcomeTeacher');
  if (welcomeEl && teacherName) {
    welcomeEl.textContent = 'مرحباً، ' + teacherName;
    welcomeEl.style.display = 'block';
  }
  
  fillYears();
  if (currentFilesCount() === 0) addFileInput();
  
  // 📚 تحميل دروسي
  loadMyLessons();
}

// ═══════════════════════════════════════════════
// 📋 ملء القوائم
// ═══════════════════════════════════════════════
function fillYears() {
  const sel = $('yearSelect');
  if (!sel || sel.options.length > 1) return;
  
  if (typeof YEARS === 'undefined') {
    console.error('YEARS غير معرّف');
    return;
  }
  
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

// 🌐 جعل الدوال عامة
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
  if (countEl) {
    countEl.textContent = items.length + ' من ' + MAX_FILES;
  }
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
  
  // ✅ التحقق من حجم الملفات
  const oversized = [];
  for (let i = 0; i < files.length; i++) {
    if (files[i].size > MAX_FILE_SIZE) {
      const sizeMB = (files[i].size / 1024 / 1024).toFixed(1);
      oversized.push(files[i].name + ' (' + sizeMB + ' MB)');
    }
  }
  
  if (oversized.length > 0) {
    setStatus('ملفات كبيرة (الحد 10 MB)', 'red', 'circle-x');
    alert(
      'الملفات التالية كبيرة جداً:\n\n' + 
      oversized.join('\n') + 
      '\n\nالحد الأقصى: 10 MB لكل ملف\n\n' +
      'نصيحة: استخدم ilovepdf.com للضغط'
    );
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
      method: 'POST',
      headers: { 'x-teacher-password': teacherPassword },
      body: formData
    });
    
    if (res.status === 401 || res.status === 403) {
      setStatus('انتهت الجلسة', 'red', 'circle-x');
      sessionStorage.removeItem('teacherPwd');
      sessionStorage.removeItem('teacherName');
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
// 📊 عرض النتائج
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
  resultsTimer = setTimeout(function() {
    results.style.display = 'none';
  }, 8000);
}

function resetForm() {
  const container = $('filesContainer');
  if (container) container.innerHTML = '';
  fileCounter = 0;
  addFileInput();
  setStatus('', '');
}

// ═══════════════════════════════════════════════
// 📚 إدارة دروسي المرفوعة
// ═══════════════════════════════════════════════
async function loadMyLessons() {
  const list = $('myLessonsList');
  const countEl = $('myLessonsCount');
  
  if (!list) return;
  
  list.innerHTML = '<div class="my-lessons-loading">' + icon('loader-circle', 'spin') + ' جارٍ التحميل...</div>';
  
  try {
    const res = await fetch(API + '/teacher/my-lessons', {
      headers: { 'x-teacher-password': teacherPassword }
    });
    
    if (!res.ok) {
      list.innerHTML = '<div class="my-lessons-empty">' + icon('circle-x') + ' تعذّر تحميل الدروس</div>';
      return;
    }
    
    const lessons = await res.json();
    
    if (countEl) countEl.textContent = lessons.length;
    
    if (!lessons.length) {
      list.innerHTML = 
        '<div class="my-lessons-empty">' +
          '<span class="empty-icon">' + icon('inbox') + '</span>' +
          '<p>لم ترفع أي دروس بعد</p>' +
        '</div>';
      return;
    }
    
    list.innerHTML = lessons.map(function(lesson) {
      const date = new Date(lesson.date).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
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

// 🗑️ حذف درس
async function deleteMyLesson(id, title) {
  if (!confirm('هل أنت متأكد من حذف هذا الدرس؟\n\n' + title + '\n\nلا يمكن التراجع!')) {
    return;
  }
  
  try {
    const res = await fetch(API + '/teacher/lessons/' + id, {
      method: 'DELETE',
      headers: { 'x-teacher-password': teacherPassword }
    });
    
    if (res.ok) {
      showToast('تم حذف الدرس', 'circle-check');
      loadMyLessons();
    } else {
      const data = await res.json();
      showToast(data.error || 'فشل الحذف', 'circle-x');
    }
  } catch (err) {
    showToast('خطأ في الاتصال', 'circle-x');
    console.error('خطأ:', err);
  }
}

window.loadMyLessons = loadMyLessons;
window.deleteMyLesson = deleteMyLesson;

// ═══════════════════════════════════════════════
// 🎯 ربط الأحداث
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  // زر الدخول
  const loginBtn = $('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', doLogin);
  }
  
  // Enter للدخول
  const pwdInput = $('passwordInput');
  if (pwdInput) {
    pwdInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        doLogin();
      }
    });
  }
  
  // زر الخروج
  const logoutBtn = $('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      sessionStorage.removeItem('teacherPwd');
      sessionStorage.removeItem('teacherName');
      location.reload();
    });
  }
  
  // زر إضافة ملف
  const addFileBtn = $('addFileBtn');
  if (addFileBtn) {
    addFileBtn.addEventListener('click', addFileInput);
  }
  
  // زر تحديث الدروس
  const refreshBtn = $('refreshLessonsBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadMyLessons);
  }
  
  // ربط القوائم
  const yearSelect = $('yearSelect');
  if (yearSelect) {
    yearSelect.addEventListener('change', updateSpecializations);
  }
  
  const specSelect = $('specializationSelect');
  if (specSelect) {
    specSelect.addEventListener('change', updateSubjects);
  }
  
  // حذف ملفات
  const container = $('filesContainer');
  if (container) {
    container.addEventListener('click', function(e) {
      const btn = e.target.closest('.file-remove-btn');
      if (!btn) return;
      const item = btn.closest('.file-input-item');
      if (item) {
        item.remove();
        updateFilesCount();
      }
    });
  }
  
  // النموذج
  const form = $('uploadForm');
  if (form) {
    form.addEventListener('submit', handleUpload);
  }
  
  // التحقق التلقائي
  if (teacherPassword) {
    verifyAndShow();
  }
});