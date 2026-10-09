// ═══════════════════════════════════════════════
// 👨‍🏫 بوابة الأساتذة - نسخة نظيفة
// ═══════════════════════════════════════════════

const API = '/api';
const MAX_FILES = 10;
let teacherPassword = sessionStorage.getItem('teacherPwd') || '';
let fileCounter = 0;
let resetTimer = null;
let resultsTimer = null;

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

function setStatus(msg, color) {
  const status = $('uploadStatus');
  if (!status) return;
  status.textContent = msg;
  status.style.color = color || '';
}

// ═══════════════════════════════════════════════
// 🌙 الوضع الليلي
// ═══════════════════════════════════════════════
(function initTheme() {
  const themeToggle = $('themeToggle');
  if (!themeToggle) return;
  
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  
  themeToggle.addEventListener('click', function() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
  });
})();

// ═══════════════════════════════════════════════
// 🔐 تسجيل الدخول
// ═══════════════════════════════════════════════
async function doLogin() {
  const pwd = $('passwordInput').value;
  const errEl = $('loginError');
  
  if (!pwd) {
    errEl.textContent = '❌ أدخل كلمة السر';
    return;
  }
  
  errEl.textContent = '⏳ جارٍ التحقق...';
  errEl.style.color = 'var(--emerald)';
  
  try {
    const res = await fetch(API + '/teacher-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd })
    });
    
    if (res.ok) {
      teacherPassword = pwd;
      sessionStorage.setItem('teacherPwd', pwd);
      showPanel();
    } else {
      errEl.textContent = '❌ كلمة السر غير صحيحة';
      errEl.style.color = 'red';
    }
  } catch (err) {
    errEl.textContent = '❌ خطأ في الاتصال';
    errEl.style.color = 'red';
  }
}

// 🌐 جعل الدالة عامة
window.doLogin = doLogin;

// ربط الزر
document.addEventListener('DOMContentLoaded', function() {
  const loginBtn = $('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', doLogin);
  }
  
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
      location.reload();
    });
  }
  
  // زر إضافة ملف
  const addFileBtn = $('addFileBtn');
  if (addFileBtn) {
    addFileBtn.addEventListener('click', addFileInput);
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
  
  // حذف ملفات (event delegation)
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

async function verifyAndShow() {
  try {
    const res = await fetch(API + '/teacher-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: teacherPassword })
    });
    if (res.ok) {
      showPanel();
    } else {
      sessionStorage.removeItem('teacherPwd');
      teacherPassword = '';
    }
  } catch (err) {
    console.error('خطأ:', err);
  }
}

function showPanel() {
  const loginScreen = $('loginScreen');
  const panel = $('teacherPanel');
  const logoutBtn = $('logoutBtn');
  
  if (loginScreen) loginScreen.style.display = 'none';
  if (panel) panel.style.display = 'block';
  if (logoutBtn) logoutBtn.style.display = 'inline-flex';
  
  fillYears();
  if (currentFilesCount() === 0) addFileInput();
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
      '<span class="file-number">📄 ملف</span>' +
      '<button type="button" class="file-remove-btn" title="حذف">✖️</button>' +
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
    if (num) num.textContent = '📄 ملف ' + (i + 1);
  });
  
  const countEl = $('filesCount');
  if (countEl) {
    countEl.textContent = items.length + ' من ' + MAX_FILES;
  }
}

// جعل الدوال عامة
window.addFileInput = addFileInput;
window.updateSpecializations = updateSpecializations;
window.updateSubjects = updateSubjects;

// ═══════════════════════════════════════════════
// 📤 الرفع
// ═══════════════════════════════════════════════
async function handleUpload(e) {
  e.preventDefault();
  
  const year = $('yearSelect').value;
  const specialization = $('specializationSelect').value;
  const subject = $('subjectSelect').value;
  const teacherName = $('teacherNameInput') ? $('teacherNameInput').value : '';
  
  if (!year || !specialization || !subject) {
    setStatus('❌ يجب اختيار السنة والتخصص والمادة', 'red');
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
    setStatus('❌ اختر ملفاً واحداً على الأقل', 'red');
    return;
  }
  
  const formData = new FormData();
  formData.append('year', year);
  formData.append('specialization', specialization);
  formData.append('subject', subject);
  formData.append('teacherName', teacherName);
  files.forEach(function(f) { formData.append('files', f); });
  titles.forEach(function(t) { formData.append('titles', t); });
  
  const submitBtn = $('uploadForm').querySelector('[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
  
  setStatus('⏳ جارٍ رفع ' + files.length + ' ملف...', 'var(--emerald)');
  
  try {
    const res = await fetch(API + '/teacher/batch', {
      method: 'POST',
      headers: { 'x-teacher-password': teacherPassword },
      body: formData
    });
    
    if (res.status === 401 || res.status === 403) {
      setStatus('❌ انتهت الجلسة، سجّل الدخول من جديد', 'red');
      sessionStorage.removeItem('teacherPwd');
      setTimeout(function() { location.reload(); }, 2000);
      return;
    }
    
    const data = await res.json();
    
    if (res.ok && data.success) {
      setStatus('✅ تم رفع ' + data.uploaded + ' ملف بنجاح!', 'green');
      showResults(data);
      clearTimeout(resetTimer);
      resetTimer = setTimeout(resetForm, 2000);
    } else {
      setStatus('❌ ' + (data.error || 'فشل الرفع'), 'red');
    }
  } catch (err) {
    setStatus('❌ خطأ في الاتصال: ' + err.message, 'red');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

function showResults(data) {
  const results = $('uploadResults');
  const content = $('resultsContent');
  if (!results || !content) return;
  
  let html = '<div class="result-summary">' +
    '<p>✅ نجح: <strong>' + (Number(data.uploaded) || 0) + '</strong></p>';
  
  if (data.failed > 0) {
    html += '<p>❌ فشل: <strong>' + Number(data.failed) + '</strong></p>';
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