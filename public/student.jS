// ═══════════════════════════════════════════════
// 👨‍🎓 بوابة التلاميذ - بدون كلمة سر
// ═══════════════════════════════════════════════

const API = '/api';
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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

function showToast(msg) {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = msg;
  document.body.appendChild(toast);
  
  setTimeout(function() {
    toast.classList.add('toast-hide');
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
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

window.addFileInput = addFileInput;

// ═══════════════════════════════════════════════
// 📤 الإرسال
// ═══════════════════════════════════════════════
async function handleSubmit(e) {
  e.preventDefault();
  
  const studentName = $('studentName').value.trim();
  const studentEmail = $('studentEmail').value.trim();
  const year = $('yearSelect').value;
  const specialization = $('specializationSelect').value;
  const subject = $('subjectSelect').value;
  const note = $('noteInput') ? $('noteInput').value.trim() : '';
  
  // التحقق من البيانات
  if (!studentName) {
    setStatus('❌ يجب كتابة اسمك', 'red');
    $('studentName').focus();
    return;
  }
  
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
  
  // التحقق من حجم الملفات
  const oversized = [];
  for (let i = 0; i < files.length; i++) {
    if (files[i].size > MAX_FILE_SIZE) {
      const sizeMB = (files[i].size / 1024 / 1024).toFixed(1);
      oversized.push(files[i].name + ' (' + sizeMB + ' MB)');
    }
  }
  
  if (oversized.length > 0) {
    setStatus('❌ ملفات كبيرة (الحد 10 MB)', 'red');
    alert(
      '❌ الملفات التالية كبيرة جداً:\n\n' + 
      oversized.join('\n') + 
      '\n\nالحد الأقصى: 10 MB لكل ملف\n\n' +
      '💡 استخدم ilovepdf.com للضغط'
    );
    return;
  }
  
  // تأكيد
  const confirmed = confirm(
    '📤 هل تريد إرسال ' + files.length + ' ملف للمراجعة؟\n\n' +
    'سيتم مراجعتها من قبل الإدارة قبل النشر.'
  );
  
  if (!confirmed) return;
  
  const formData = new FormData();
  formData.append('studentName', studentName);
  formData.append('studentEmail', studentEmail);
  formData.append('year', year);
  formData.append('specialization', specialization);
  formData.append('subject', subject);
  formData.append('note', note);
  files.forEach(function(f) { formData.append('files', f); });
  titles.forEach(function(t) { formData.append('titles', t); });
  
  const submitBtn = $('uploadForm').querySelector('[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
  
  setStatus('⏳ جارٍ إرسال ' + files.length + ' ملف...', 'var(--emerald)');
  
  try {
    const res = await fetch(API + '/student/submit', {
      method: 'POST',
      body: formData
    });
    
    const data = await res.json();
    
    if (res.ok && data.success) {
      setStatus('✅ تم إرسال ' + data.submitted + ' ملف للمراجعة!', 'green');
      showResults(data);
      
      clearTimeout(resetTimer);
      resetTimer = setTimeout(resetForm, 3000);
    } else {
      setStatus('❌ ' + (data.error || 'فشل الإرسال'), 'red');
    }
  } catch (err) {
    setStatus('❌ خطأ في الاتصال: ' + err.message, 'red');
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
  
  let html = 
    '<div class="result-summary">' +
      '<p>✅ تم الإرسال: <strong>' + (Number(data.submitted) || 0) + '</strong></p>' +
      (data.failed > 0 ? '<p>❌ فشل: <strong>' + Number(data.failed) + '</strong></p>' : '') +
      '<p class="result-note">📩 سيتم مراجعة دروسك ونشرها قريباً</p>' +
      '<p class="result-thanks">شكراً لمساهمتك! 🤲</p>' +
    '</div>';
  
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
  }, 10000);
}

function resetForm() {
  const container = $('filesContainer');
  if (container) container.innerHTML = '';
  fileCounter = 0;
  addFileInput();
  
  const noteInput = $('noteInput');
  if (noteInput) noteInput.value = '';
  
  setStatus('', '');
}

// ═══════════════════════════════════════════════
// 🎯 ربط الأحداث
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  // ملء السنوات
  fillYears();
  
  // إضافة حقل ملف أول
  addFileInput();
  
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
    form.addEventListener('submit', handleSubmit);
  }
});