// ═══════════════════════════════════════════════
// 👨‍💼 لوحة تحكم الأدمن - نسخة كاملة
// ═══════════════════════════════════════════════

const API = '/api';
let adminPassword = sessionStorage.getItem('adminPwd') || '';
let reviewPassword = sessionStorage.getItem('reviewPwd') || '';

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

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
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
  }, 2500);
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
// 🔐 تسجيل الدخول (الأدمن)
// ═══════════════════════════════════════════════
async function adminLogin() {
  const pwd = $('passwordInput').value;
  if (!pwd) return;
  
  try {
    const res = await fetch(API + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd })
    });
    
    if (res.ok) {
      adminPassword = pwd;
      sessionStorage.setItem('adminPwd', pwd);
      showPanel();
    } else {
      $('loginError').textContent = '❌ كلمة السر غير صحيحة';
    }
  } catch (err) {
    $('loginError').textContent = '❌ خطأ في الاتصال';
  }
}

window.adminLogin = adminLogin;

if (adminPassword) {
  showPanel();
}

function showPanel() {
  $('loginScreen').style.display = 'none';
  $('adminPanel').style.display = 'block';
  fillYears();
  loadAdminLessons();
  initReviewSection();
}

// ═══════════════════════════════════════════════
// 📋 ملء القوائم
// ═══════════════════════════════════════════════
function fillYears() {
  const sel = $('yearSelect');
  if (!sel || sel.options.length > 1) return;
  
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
  
  specSel.innerHTML = '<option value="">اختر التخصص</option>';
  subSel.innerHTML = '<option value="">اختر التخصص أولاً</option>';
  
  if (yearId && SPECIALIZATIONS[yearId]) {
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
  
  subSel.innerHTML = '<option value="">اختر المادة</option>';
  
  if (yearId && spec && SUBJECTS[yearId] && SUBJECTS[yearId][spec]) {
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
// 📤 رفع درس (الأدمن)
// ═══════════════════════════════════════════════
async function handleUpload(e) {
  e.preventDefault();
  
  const form = e.target;
  const status = $('uploadStatus');
  const data = new FormData(form);
  
  status.textContent = '⏳ جارٍ الرفع...';
  status.style.color = 'var(--emerald)';
  
  try {
    const res = await fetch(API + '/lessons', {
      method: 'POST',
      headers: { 'x-admin-password': adminPassword },
      body: data
    });
    
    const json = await res.json();
    
    if (res.ok) {
      status.textContent = '✅ تم رفع الدرس بنجاح!';
      status.style.color = 'green';
      form.reset();
      updateSpecializations();
      loadAdminLessons();
    } else {
      status.textContent = '❌ ' + (json.error || 'فشل الرفع');
      status.style.color = 'red';
    }
  } catch (err) {
    status.textContent = '❌ خطأ في الاتصال';
    status.style.color = 'red';
  }
}

// ═══════════════════════════════════════════════
// 🗂️ إدارة الدروس
// ═══════════════════════════════════════════════
async function loadAdminLessons() {
  try {
    const res = await fetch(API + '/lessons');
    const lessons = await res.json();
    const div = $('adminLessons');
    
    if (!lessons.length) {
      div.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:20px">لا توجد دروس مرفوعة</p>';
      return;
    }
    
    div.innerHTML = lessons.map(function(l) {
      const yearObj = YEARS.find(function(y) { return y.id === l.year; });
      const yearName = yearObj ? yearObj.name : (l.year || 'غير محدد');
      
      const uploaderLabel = l.uploader === 'teacher' 
        ? '👨‍🏫 ' + (l.uploaderName || 'أستاذ')
        : l.uploader === 'student'
        ? '👨‍🎓 ' + (l.uploaderName || 'طالب')
        : '👨‍💼 الأدمن';
      
      return '<div class="admin-lesson-item">' +
        '<div class="info">' +
          '<h5>' + escapeHtml(l.title) + '</h5>' +
          '<small>' +
            escapeHtml(yearName) + ' › ' +
            escapeHtml(l.specialization || 'غير محدد') + ' › ' +
            escapeHtml(l.subject) +
            ' • ' + (l.type || '').toUpperCase() +
            ' • ' + uploaderLabel +
            ' • ' + new Date(l.date).toLocaleDateString('ar-EG') +
          '</small>' +
        '</div>' +
        '<a href="' + escapeHtml(l.url) + '" target="_blank" class="btn btn-view" style="flex:0 0 auto;padding:8px 14px">👁️</a>' +
        '<button class="btn btn-delete" onclick="deleteLesson(\'' + escapeHtml(l.id) + '\')">🗑️</button>' +
      '</div>';
    }).join('');
  } catch (err) {
    console.error('خطأ:', err);
  }
}

async function deleteLesson(id) {
  if (!confirm('هل تريد حذف هذا الدرس نهائياً؟')) return;
  
  try {
    const res = await fetch(API + '/lessons/' + id, {
      method: 'DELETE',
      headers: { 'x-admin-password': adminPassword }
    });
    
    if (res.ok) {
      showToast('✅ تم الحذف');
      loadAdminLessons();
    } else {
      showToast('❌ فشل الحذف');
    }
  } catch (err) {
    showToast('❌ خطأ في الاتصال');
  }
}

window.deleteLesson = deleteLesson;

// ═══════════════════════════════════════════════
// 📥 قسم المراجعة
// ═══════════════════════════════════════════════
function initReviewSection() {
  if (reviewPassword) {
    verifyReviewAndShow();
  }
}

async function verifyReviewAndShow() {
  try {
    const res = await fetch(API + '/pending', {
      headers: { 'x-review-password': reviewPassword }
    });
    
    if (res.ok) {
      showPendingList();
      loadPending();
    } else {
      sessionStorage.removeItem('reviewPwd');
      reviewPassword = '';
    }
  } catch (err) {
    console.error('خطأ:', err);
  }
}

async function reviewLogin() {
  const pwd = $('reviewPasswordInput').value;
  const errEl = $('reviewLoginError');
  
  if (!pwd) {
    errEl.textContent = '❌ أدخل كلمة السر';
    return;
  }
  
  errEl.textContent = '⏳ جارٍ التحقق...';
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
      errEl.textContent = '❌ كلمة سر المراجعة خاطئة';
      errEl.style.color = 'red';
    }
  } catch (err) {
    errEl.textContent = '❌ خطأ في الاتصال';
    errEl.style.color = 'red';
  }
}

window.reviewLogin = reviewLogin;

function showPendingList() {
  const loginScreen = $('reviewLoginScreen');
  const list = $('pendingList');
  if (loginScreen) loginScreen.style.display = 'none';
  if (list) list.style.display = 'flex';
}

async function loadPending() {
  const list = $('pendingList');
  if (!list) return;
  
  list.innerHTML = '<div class="pending-loading">⏳ جارٍ التحميل...</div>';
  
  try {
    const res = await fetch(API + '/pending', {
      headers: { 'x-review-password': reviewPassword }
    });
    
    if (!res.ok) {
      list.innerHTML = '<div class="pending-empty">❌ تعذّر التحميل</div>';
      return;
    }
    
    const lessons = await res.json();
    
    const countEl = $('pendingCount');
    if (countEl) countEl.textContent = lessons.length;
    
    if (!lessons.length) {
      list.innerHTML = 
        '<div class="pending-empty">' +
          '<span>✨</span>' +
          '<p>لا توجد دروس بانتظار المراجعة</p>' +
        '</div>';
      return;
    }
    
    list.innerHTML = lessons.map(function(l) {
      const yearObj = YEARS.find(function(y) { return y.id === l.year; });
      const yearName = yearObj ? yearObj.name : l.year;
      
      return '<div class="pending-item">' +
        '<div class="pending-info">' +
          '<div class="pending-header">' +
            '<span class="pending-file-type">' + (l.type || '').toUpperCase() + '</span>' +
            '<h4>' + escapeHtml(l.title) + '</h4>' +
          '</div>' +
          '<div class="pending-meta">' +
            '<span>👤 <strong>' + escapeHtml(l.uploaderName || 'طالب') + '</strong></span>' +
            (l.uploaderEmail ? '<span>📧 ' + escapeHtml(l.uploaderEmail) + '</span>' : '') +
            '<span>📅 ' + escapeHtml(yearName) + '</span>' +
            '<span>🎓 ' + escapeHtml(l.specialization) + '</span>' +
            '<span>📚 ' + escapeHtml(l.subject) + '</span>' +
            '<span>💾 ' + formatSize(l.size) + '</span>' +
            '<span>📅 ' + formatDate(l.date) + '</span>' +
          '</div>' +
          (l.description ? '<p class="pending-note">💬 ' + escapeHtml(l.description) + '</p>' : '') +
        '</div>' +
        '<div class="pending-actions">' +
          '<a href="' + escapeHtml(l.url) + '" target="_blank" class="pending-btn view">👁️ معاينة</a>' +
          '<button class="pending-btn approve" onclick="approvePending(\'' + escapeHtml(l.id) + '\', \'' + escapeHtml(l.title).replace(/'/g, "\\'") + '\')">✅ قبول</button>' +
          '<button class="pending-btn reject" onclick="rejectPending(\'' + escapeHtml(l.id) + '\', \'' + escapeHtml(l.title).replace(/'/g, "\\'") + '\')">❌ رفض</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (err) {
    console.error('خطأ:', err);
    list.innerHTML = '<div class="pending-empty">❌ خطأ في الاتصال</div>';
  }
}

window.loadPending = loadPending;

async function approvePending(id, title) {
  if (!confirm('✅ الموافقة على نشر هذا الدرس؟\n\n' + title)) return;
  
  try {
    const res = await fetch(API + '/pending/' + id + '/approve', {
      method: 'POST',
      headers: {
        'x-review-password': reviewPassword,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ note: 'تمت الموافقة' })
    });
    
    if (res.ok) {
      showToast('✅ تمت الموافقة ونُشر الدرس');
      loadPending();
      loadAdminLessons();
    } else {
      const data = await res.json();
      showToast('❌ ' + (data.error || 'فشلت الموافقة'));
    }
  } catch (err) {
    showToast('❌ خطأ في الاتصال');
  }
}

window.approvePending = approvePending;

async function rejectPending(id, title) {
  if (!confirm('❌ رفض وحذف هذا الدرس؟\n\n' + title + '\n\nلا يمكن التراجع!')) return;
  
  try {
    const res = await fetch(API + '/pending/' + id + '/reject', {
      method: 'POST',
      headers: { 'x-review-password': reviewPassword }
    });
    
    if (res.ok) {
      showToast('🗑️ تم رفض وحذف الدرس');
      loadPending();
    } else {
      const data = await res.json();
      showToast('❌ ' + (data.error || 'فشل الرفض'));
    }
  } catch (err) {
    showToast('❌ خطأ في الاتصال');
  }
}

window.rejectPending = rejectPending;

// ═══════════════════════════════════════════════
// 🎯 ربط الأحداث
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  // زر دخول الأدمن
  const loginBtn = $('loginBtn');
  if (loginBtn) loginBtn.addEventListener('click', adminLogin);
  
  const pwdInput = $('passwordInput');
  if (pwdInput) {
    pwdInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); adminLogin(); }
    });
  }
  
  // زر دخول المراجعة
  const reviewLoginBtn = $('reviewLoginBtn');
  if (reviewLoginBtn) reviewLoginBtn.addEventListener('click', reviewLogin);
  
  const reviewPwdInput = $('reviewPasswordInput');
  if (reviewPwdInput) {
    reviewPwdInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); reviewLogin(); }
    });
  }
  
  // زر تحديث المراجعة
  const refreshBtn = $('refreshPendingBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      if (reviewPassword) loadPending();
    });
  }
  
  // قوائم السنة
  const yearSelect = $('yearSelect');
  if (yearSelect) yearSelect.addEventListener('change', updateSpecializations);
  
  const specSelect = $('specializationSelect');
  if (specSelect) specSelect.addEventListener('change', updateSubjects);
  
  // النموذج
  const uploadForm = $('uploadForm');
  if (uploadForm) uploadForm.addEventListener('submit', handleUpload);
});