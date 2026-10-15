// ═══════════════════════════════════════════════
// 👨‍💼 لوحة تحكم الأدمن
// ═══════════════════════════════════════════════

const API = '/api';
let reviewPassword = sessionStorage.getItem('reviewPwd') || '';
let currentUser = null;
let teachersCache = [];

// ═══════════════════════════════════════════════
// 🛠️ أدوات
// ═══════════════════════════════════════════════
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
  if (!iso) return '—';
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

// ═══════════════════════════════════════════════
// 🌙 الوضع الليلي
// ═══════════════════════════════════════════════
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

// ═══════════════════════════════════════════════
// 🔵 فحص الجلسة
// ═══════════════════════════════════════════════
async function checkSession() {
  try {
    const res = await fetch(API + '/me', { credentials: 'same-origin' });
    if (res.ok) {
      const user = await res.json();
      if (user.role !== 'admin') return false;
      currentUser = user;
      showPanel();
      return true;
    }
  } catch (e) {}
  return false;
}

function showUserChip() {
  if (!currentUser) return;
  const chip = $('userChip');
  const nameEl = $('userNameLabel');
  if (!chip || !nameEl) return;

  const roleLabel = currentUser.role === 'admin' ? 'مدير'
                  : currentUser.role === 'teacher' ? 'أستاذ'
                  : currentUser.role === 'reviewer' ? 'مراجع' : '';
  const displayName = (currentUser.name || currentUser.email || '').trim();

  function normalize(s) {
    return String(s || '').trim().replace(/^ال/, '').replace(/[ًٌٍَُِّْـ]/g, '');
  }
  const sameAsRole = normalize(displayName) === normalize(roleLabel);

  if (!displayName || sameAsRole) nameEl.textContent = roleLabel;
  else nameEl.textContent = displayName + ' · ' + roleLabel;

  chip.style.display = 'inline-flex';
  if (window.lucide) window.lucide.createIcons();
}

async function logout() {
  try { await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch (e) {}
  sessionStorage.removeItem('reviewPwd');
  location.href = '/admin.html';
}

// ═══════════════════════════════════════════════
// 🔐 تسجيل الدخول
// ═══════════════════════════════════════════════
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
      if (currentUser) saveAccount(currentUser.email, currentUser.role, currentUser.name);
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
  if (currentUser && currentUser.role === 'admin') {
    const card = $('teachersCard');
    if (card) card.style.display = 'block';
    loadTeachers();
  }
}

// ═══════════════════════════════════════════════
// 📋 القوائم
// ═══════════════════════════════════════════════
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

// ═══════════════════════════════════════════════
// 🎨 نافذة تأكيد
// ═══════════════════════════════════════════════
function customConfirm(options) {
  return new Promise(function (resolve) {
    const opt = options || {};
    const title = opt.title || 'تأكيد';
    const message = opt.message || '';
    const lines = opt.lines || [];
    const confirmText = opt.confirmText || 'حسنًا';
    const cancelText = opt.cancelText || 'إلغاء';
    const variant = opt.variant || 'primary';

    const root = $('modalRoot');
    root.innerHTML =
      '<div class="modal-backdrop" id="confirmBackdrop">' +
        '<div class="modal-card confirm-card confirm-' + variant + '" onclick="event.stopPropagation()">' +
          '<div class="confirm-icon">' +
            (variant === 'danger' ? '<i data-lucide="alert-triangle"></i>'
              : variant === 'warning' ? '<i data-lucide="alert-circle"></i>'
              : '<i data-lucide="help-circle"></i>') +
          '</div>' +
          '<h3 class="confirm-title">' + escapeHtml(title) + '</h3>' +
          (message ? '<p class="confirm-message">' + escapeHtml(message) + '</p>' : '') +
          (lines.length
            ? '<ul class="confirm-lines">' + lines.map(function (line) {
                return '<li>' + escapeHtml(line) + '</li>';
              }).join('') + '</ul>'
            : '') +
          (opt.hint ? '<p class="confirm-hint">' + escapeHtml(opt.hint) + '</p>' : '') +
          '<div class="confirm-actions">' +
            '<button type="button" class="btn-modal secondary" id="confirmCancelBtn">' + escapeHtml(cancelText) + '</button>' +
            '<button type="button" class="btn-modal ' + variant + '" id="confirmOkBtn">' + escapeHtml(confirmText) + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    if (window.lucide) window.lucide.createIcons();

    function cleanup(result) {
      document.removeEventListener('keydown', onKey);
      root.innerHTML = '';
      resolve(result);
    }
    function onKey(e) {
      if (e.key === 'Escape') cleanup(false);
      if (e.key === 'Enter') cleanup(true);
    }

    document.addEventListener('keydown', onKey);
    $('confirmBackdrop').addEventListener('click', function (e) {
      if (e.target.id === 'confirmBackdrop') cleanup(false);
    });
    $('confirmCancelBtn').addEventListener('click', function () { cleanup(false); });
    $('confirmOkBtn').addEventListener('click', function () { cleanup(true); });
    $('confirmOkBtn').focus();
  });
}
window.customConfirm = customConfirm;

// ═══════════════════════════════════════════════
// 🪟 Modal عام
// ═══════════════════════════════════════════════
function openModal(html) {
  const root = $('modalRoot');
  root.innerHTML =
    '<div class="modal-backdrop" id="modalBackdrop">' +
      '<div class="modal-card" onclick="event.stopPropagation()">' + html + '</div>' +
    '</div>';
  $('modalBackdrop').addEventListener('click', closeModal);
  if (window.lucide) window.lucide.createIcons();
}
function closeModal() {
  const root = $('modalRoot');
  if (root) root.innerHTML = '';
}
window.closeModal = closeModal;

// ═══════════════════════════════════════════════
// 📤 رفع درس
// ═══════════════════════════════════════════════
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
  const ok = await customConfirm({
    title: 'حذف درس',
    message: 'هل تريد حذف هذا الدرس نهائياً؟',
    lines: ['سيُحذف الملف من السيرفر', 'لن يظهر للطلاب بعد الآن'],
    confirmText: 'حذف',
    variant: 'danger',
    hint: 'لا يمكن التراجع!'
  });
  if (!ok) return;
  try {
    const res = await fetch(API + '/lessons/' + id, { method: 'DELETE', credentials: 'same-origin' });
    if (res.ok) { showToast('تم الحذف'); loadAdminLessons(); }
    else { showToast('فشل الحذف'); }
  } catch (err) { showToast('خطأ في الاتصال'); }
}
window.deleteLesson = deleteLesson;

// ═══════════════════════════════════════════════
// 👥 إدارة الأساتذة
// ═══════════════════════════════════════════════
async function loadTeachers() {
  const container = $('teachersList');
  if (!container) return;
  container.innerHTML = '<div class="teachers-empty">جارٍ التحميل...</div>';

  try {
    const res = await fetch(API + '/admin/teachers', { credentials: 'same-origin' });
    if (!res.ok) {
      container.innerHTML = '<div class="teachers-empty">تعذّر تحميل قائمة الأساتذة</div>';
      return;
    }
    teachersCache = await res.json();

    if (!teachersCache.length) {
      container.innerHTML = '<div class="teachers-empty">لا يوجد أساتذة بعد. اضغط "إضافة أستاذ" للبدء.</div>';
      return;
    }

    container.innerHTML =
      '<table class="teachers-table">' +
        '<thead><tr>' +
          '<th>الاسم</th>' +
          '<th>البريد الإلكتروني</th>' +
          '<th>الدروس</th>' +
          '<th>الحالة</th>' +
          '<th>إجراءات</th>' +
        '</tr></thead>' +
        '<tbody>' +
          teachersCache.map(function (t) {
            const statusBadge = t.active
              ? '<span class="teacher-badge active">نشط</span>'
              : '<span class="teacher-badge inactive">معطّل</span>';
            const toggleIcon = t.active ? 'pause-circle' : 'play-circle';
            const toggleTitle = t.active ? 'تعطيل' : 'تفعيل';
            const toggleClass = t.active ? 'danger' : 'success';
            const subLine = t.specialty
              ? '<br><small style="color:var(--text-light);font-size:0.8rem">' + escapeHtml(t.specialty) + '</small>'
              : '';
            return '<tr class="' + (t.active ? '' : 'inactive') + '">' +
              '<td><strong>' + escapeHtml(t.name) + '</strong>' + subLine + '</td>' +
              '<td dir="ltr" style="text-align:left">' + escapeHtml(t.email) + '</td>' +
              '<td>' + t.lessonCount + '</td>' +
              '<td>' + statusBadge + '</td>' +
              '<td>' +
                '<div class="teacher-actions">' +
                  '<button class="btn-icon-sm" title="تعديل" onclick="openEditTeacher(\'' + t._id + '\')">' +
                    '<i data-lucide="pencil"></i>' +
                  '</button>' +
                  '<button class="btn-icon-sm ' + toggleClass + '" title="' + toggleTitle + '" onclick="toggleTeacherStatus(\'' + t._id + '\', ' + (!t.active) + ')">' +
                    '<i data-lucide="' + toggleIcon + '"></i>' +
                  '</button>' +
                  '<button class="btn-icon-sm danger" title="حذف" onclick="tryDeleteTeacher(\'' + t._id + '\')">' +
                    '<i data-lucide="trash-2"></i>' +
                  '</button>' +
                '</div>' +
              '</td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table>';

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div class="teachers-empty">خطأ في الاتصال</div>';
  }
}
window.loadTeachers = loadTeachers;

// ➕ إضافة أستاذ
function openAddTeacher() {
  openModal(
    '<h3 class="modal-title"><i data-lucide="user-plus"></i> إضافة أستاذ جديد</h3>' +
    '<div class="modal-body">' +
      '<div class="modal-field">' +
        '<label for="tName">الاسم الكامل</label>' +
        '<input type="text" id="tName" placeholder="مثال: أ. أحمد محمد" autocomplete="off">' +
      '</div>' +
      '<div class="modal-field">' +
        '<label for="tEmail">البريد الإلكتروني</label>' +
        '<input type="email" id="tEmail" placeholder="teacher@example.com" dir="ltr" autocomplete="off">' +
      '</div>' +
      '<div class="modal-field">' +
        '<label for="tRank">الرتبة العلمية (اختياري)</label>' +
        '<input type="text" id="tRank" placeholder="أستاذ محاضر أ" maxlength="80">' +
      '</div>' +
      '<div class="modal-field">' +
        '<label for="tSpecialty">التخصص (اختياري)</label>' +
        '<input type="text" id="tSpecialty" placeholder="أصول الفقه" maxlength="100">' +
      '</div>' +
      '<div class="modal-field">' +
        '<label for="tContactEmail">بريد للتواصل (اختياري)</label>' +
        '<input type="email" id="tContactEmail" placeholder="teacher@univ.dz" dir="ltr" maxlength="120">' +
      '</div>' +
      '<div class="modal-field">' +
        '<label for="tBio">نبذة شخصية (اختياري)</label>' +
        '<textarea id="tBio" rows="3" maxlength="800" placeholder="نبذة قصيرة عن الأستاذ..."></textarea>' +
      '</div>' +
      '<div class="modal-field">' +
        '<label for="tPassword">كلمة السر</label>' +
        '<input type="text" id="tPassword" placeholder="6 أحرف على الأقل" dir="ltr" autocomplete="off">' +
        '<div class="modal-hint">انسخها وأرسلها للأستاذ. يمكنه تغييرها لاحقاً.</div>' +
      '</div>' +
      '<p class="modal-error" id="modalErr"></p>' +
    '</div>' +
    '<div class="modal-actions">' +
      '<button class="btn-modal secondary" type="button" onclick="closeModal()">إلغاء</button>' +
      '<button class="btn-modal primary" type="button" id="saveTeacherBtn">حفظ</button>' +
    '</div>'
  );

  $('saveTeacherBtn').addEventListener('click', function () { saveTeacher(null); });
}
window.openAddTeacher = openAddTeacher;

// ✏️ تعديل أستاذ
function openEditTeacher(id) {
  const t = teachersCache.find(x => x._id === id);
  if (!t) return;

  openModal(
    '<h3 class="modal-title"><i data-lucide="pencil"></i> تعديل أستاذ</h3>' +
    '<div class="modal-body">' +
      '<div class="modal-field">' +
        '<label>البريد الإلكتروني</label>' +
        '<input type="email" value="' + escapeHtml(t.email) + '" dir="ltr" disabled>' +
        '<div class="modal-hint">البريد غير قابل للتعديل.</div>' +
      '</div>' +
      '<div class="modal-field">' +
        '<label for="tName">الاسم الكامل</label>' +
        '<input type="text" id="tName" value="' + escapeHtml(t.name) + '">' +
      '</div>' +
      '<div class="modal-field">' +
        '<label for="tRank">الرتبة العلمية</label>' +
        '<input type="text" id="tRank" value="' + escapeHtml(t.rank || '') + '" placeholder="أستاذ محاضر أ" maxlength="80">' +
      '</div>' +
      '<div class="modal-field">' +
        '<label for="tSpecialty">التخصص</label>' +
        '<input type="text" id="tSpecialty" value="' + escapeHtml(t.specialty || '') + '" placeholder="أصول الفقه" maxlength="100">' +
      '</div>' +
      '<div class="modal-field">' +
        '<label for="tContactEmail">بريد للتواصل (اختياري)</label>' +
        '<input type="email" id="tContactEmail" value="' + escapeHtml(t.contactEmail || '') + '" dir="ltr" maxlength="120">' +
      '</div>' +
      '<div class="modal-field">' +
        '<label for="tBio">نبذة شخصية</label>' +
        '<textarea id="tBio" rows="4" maxlength="800">' + escapeHtml(t.bio || '') + '</textarea>' +
      '</div>' +
      '<div class="modal-field">' +
        '<label for="tPassword">كلمة سر جديدة (اتركها فارغة لعدم التغيير)</label>' +
        '<input type="text" id="tPassword" placeholder="6 أحرف على الأقل" dir="ltr">' +
      '</div>' +
      '<p class="modal-error" id="modalErr"></p>' +
    '</div>' +
    '<div class="modal-actions">' +
      '<button class="btn-modal secondary" type="button" onclick="closeModal()">إلغاء</button>' +
      '<button class="btn-modal primary" type="button" id="saveTeacherBtn">حفظ التغييرات</button>' +
    '</div>'
  );

  $('saveTeacherBtn').addEventListener('click', function () { saveTeacher(id); });
}
window.openEditTeacher = openEditTeacher;

// 💾 حفظ
async function saveTeacher(id) {
  const errEl = $('modalErr');
  const name = $('tName').value.trim();
  const pwdEl = $('tPassword');
  const password = pwdEl ? pwdEl.value : '';
  const rank = ($('tRank') && $('tRank').value.trim()) || '';
  const specialty = ($('tSpecialty') && $('tSpecialty').value.trim()) || '';
  const contactEmail = ($('tContactEmail') && $('tContactEmail').value.trim()) || '';
  const bio = ($('tBio') && $('tBio').value) || '';

  if (!name) { errEl.textContent = 'الاسم مطلوب'; return; }
  if (!id && !password) { errEl.textContent = 'كلمة السر مطلوبة'; return; }
  if (password && password.length < 6) {
    errEl.textContent = 'كلمة السر 6 أحرف على الأقل'; return;
  }

  const btn = $('saveTeacherBtn');
  btn.disabled = true;
  btn.textContent = 'جارٍ الحفظ...';

  try {
    let res;
    if (id) {
      res = await fetch(API + '/admin/teachers/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name, password: password || undefined, rank, specialty, contactEmail, bio })
      });
    } else {
      const email = $('tEmail').value.trim();
      if (!email) { errEl.textContent = 'البريد مطلوب'; btn.disabled = false; btn.textContent = 'حفظ'; return; }
      res = await fetch(API + '/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, name, password, rank, specialty, contactEmail, bio })
      });
    }
    const json = await res.json();
    if (res.ok) {
      showToast(id ? 'تم تحديث الأستاذ' : 'تمت إضافة الأستاذ');
      closeModal();
      loadTeachers();
    } else {
      errEl.textContent = json.error || 'فشل الحفظ';
      btn.disabled = false;
      btn.textContent = id ? 'حفظ التغييرات' : 'حفظ';
    }
  } catch (err) {
    errEl.textContent = 'خطأ في الاتصال';
    btn.disabled = false;
    btn.textContent = 'حفظ';
  }
}

// ⏸️/▶️ تعطيل/تفعيل
async function toggleTeacherStatus(id, activate) {
  const t = teachersCache.find(x => x._id === id);
  if (!t) return;

  if (!activate) {
    const ok = await customConfirm({
      title: 'تعطيل ' + t.name,
      message: 'هل تريد تعطيل هذا الحساب؟',
      lines: [
        'لن يستطيع الأستاذ الدخول',
        t.lessonCount > 0 ? 'دروسه (' + t.lessonCount + ') ستبقى ظاهرة للطلاب'
                          : 'يمكنك إعادة تفعيله في أي وقت'
      ],
      confirmText: 'تعطيل',
      variant: 'warning'
    });
    if (!ok) return;
  }

  const action = activate ? 'activate' : 'disable';
  try {
    const res = await fetch(API + '/admin/teachers/' + id + '/' + action, {
      method: 'POST', credentials: 'same-origin'
    });
    const json = await res.json();
    if (res.ok) {
      showToast(activate ? 'تم تفعيل الأستاذ' : 'تم تعطيل الأستاذ');
      loadTeachers();
    } else {
      showToast(json.error || 'فشل التغيير');
    }
  } catch (err) { showToast('خطأ في الاتصال'); }
}
window.toggleTeacherStatus = toggleTeacherStatus;

// 🗑️ حذف
async function tryDeleteTeacher(id) {
  const t = teachersCache.find(x => x._id === id);
  if (!t) return;

  const lines = ['حساب الأستاذ'];
  if (t.lessonCount > 0) {
    lines.push(t.lessonCount + ' درس من دروسه');
    lines.push('جميع ملفات هذه الدروس');
  }

  const ok = await customConfirm({
    title: 'حذف حساب ' + t.name,
    message: t.lessonCount > 0 ? '⚠️ سيتم حذف:' : 'لا يوجد لديه دروس حالياً.',
    lines: lines,
    confirmText: 'حذف نهائي',
    cancelText: 'إلغاء',
    variant: 'danger',
    hint: t.lessonCount > 0
      ? '💡 لإبقاء الدروس، اختر "إلغاء" ثم "تعطيل" بدلاً من الحذف.'
      : 'لا يمكن التراجع!'
  });
  if (!ok) return;

  try {
    const res = await fetch(API + '/admin/teachers/' + id, {
      method: 'DELETE', credentials: 'same-origin'
    });
    const json = await res.json();
    if (res.ok) {
      showToast(json.message || 'تم حذف الأستاذ');
      loadTeachers();
      loadAdminLessons();
    } else {
      showToast(json.error || 'فشل الحذف');
    }
  } catch (err) { showToast('خطأ في الاتصال'); }
}
window.tryDeleteTeacher = tryDeleteTeacher;

// ═══════════════════════════════════════════════
// 📥 قسم المراجعة
// ═══════════════════════════════════════════════
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
  const ok = await customConfirm({
    title: 'نشر الدرس',
    message: 'الموافقة على نشر هذا الدرس؟',
    confirmText: 'نشر',
    variant: 'primary'
  });
  if (!ok) return;

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
  const ok = await customConfirm({
    title: 'رفض الدرس',
    message: 'هل تريد رفض وحذف هذا الدرس؟',
    lines: ['سيُحذف الملف نهائياً'],
    confirmText: 'رفض',
    variant: 'danger',
    hint: 'لا يمكن التراجع!'
  });
  if (!ok) return;

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

// ═══════════════════════════════════════════════
// 🎯 الأحداث
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async function () {
  await checkSession();

  const googleError = new URLSearchParams(location.search).get('error');
  if (googleError && $('loginError')) {
    const messages = {
      unauthorized: 'هذا الحساب غير مصرّح له بالدخول',
      google_denied: 'تم إلغاء الدخول بجوجل',
      google_failed: 'تعذر الدخول بجوجل، حاول مرة أخرى',
      wrong_role: 'هذا الحساب أستاذ. ادخل من بوابة الأساتذة بدلاً من هنا.'
    };
    $('loginError').textContent = messages[googleError] || 'تعذر الدخول بجوجل';
    history.replaceState(null, '', location.pathname);
  }

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

  const addTeacherBtn = $('addTeacherBtn');
  if (addTeacherBtn) addTeacherBtn.addEventListener('click', openAddTeacher);

  if (window.lucide) window.lucide.createIcons();
});

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

  dropdown.querySelectorAll('.email-item').forEach(function (item) {
    item.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-remove]')) return;
      const email = item.getAttribute('data-email');
      $('emailInput').value = email;
      dropdown.style.display = 'none';
      setTimeout(() => $('passwordInput').focus(), 50);
    });
  });
  dropdown.querySelectorAll('[data-remove]').forEach(function (btn) {
    btn.addEventListener('click', function (ev) {
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

document.addEventListener('click', function (e) {
  const wrap = e.target.closest('.email-field-wrap');
  if (!wrap) toggleEmailDropdown(false);
});

if (window.PasswordCredential && navigator.credentials) {
  window.addEventListener('load', async () => {
    try { await navigator.credentials.get({ password: true, mediation: 'optional' }); } catch (e) {}
  });
}