const API = '/api';
let adminPassword = sessionStorage.getItem('adminPwd') || '';

// الوضع الليلي
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
});

// إذا كانت كلمة السر محفوظة سابقاً
if (adminPassword) showPanel();

document.getElementById('loginBtn').addEventListener('click', async () => {
  const pwd = document.getElementById('passwordInput').value;
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pwd })
  });
  if (res.ok) {
    adminPassword = pwd;
    sessionStorage.setItem('adminPwd', pwd);
    showPanel();
  } else {
    document.getElementById('loginError').textContent = '❌ كلمة السر غير صحيحة';
  }
});

function showPanel() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';
  loadAdminLessons();
}

// رفع ملف
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const status = document.getElementById('uploadStatus');
  const data = new FormData(form);
  status.textContent = '⏳ جارٍ الرفع...';
  status.style.color = 'var(--primary)';

  try {
    const res = await fetch(`${API}/lessons`, {
      method: 'POST',
      headers: { 'x-admin-password': adminPassword },
      body: data
    });
    const json = await res.json();
    if (res.ok) {
      status.textContent = '✅ تم رفع الدرس بنجاح!';
      status.style.color = 'green';
      form.reset();
      loadAdminLessons();
    } else {
      status.textContent = '❌ ' + (json.error || 'فشل الرفع');
      status.style.color = 'red';
    }
  } catch (err) {
    status.textContent = '❌ خطأ في الاتصال';
    status.style.color = 'red';
  }
});

// عرض الدروس للإدارة
async function loadAdminLessons() {
  const res = await fetch(`${API}/lessons`);
  const lessons = await res.json();
  const div = document.getElementById('adminLessons');

  if (!lessons.length) {
    div.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:20px">لا توجد دروس مرفوعة</p>';
    return;
  }

  div.innerHTML = lessons.map(l => `
    <div class="admin-lesson-item">
      <div class="info">
        <h5>${escapeHtml(l.title)}</h5>
        <small>${escapeHtml(l.subject)} • ${l.type.toUpperCase()} • ${new Date(l.date).toLocaleDateString('ar-EG')}</small>
      </div>
      <a href="${l.url}" target="_blank" class="btn btn-view" style="flex:0 0 auto;padding:8px 14px">👁️</a>
      <button class="btn btn-delete" onclick="deleteLesson('${l.id}')">🗑️</button>
    </div>
  `).join('');
}

async function deleteLesson(id) {
  if (!confirm('هل تريد حذف هذا الدرس نهائياً؟')) return;
  const res = await fetch(`${API}/lessons/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-password': adminPassword }
  });
  if (res.ok) loadAdminLessons();
  else alert('فشل الحذف');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}