import { supabase, isSupabaseConfigured, getCurrentUserProfile } from './supabase.js';

const form = document.querySelector('#login-form');
const errorNotice = document.querySelector('#login-error');
const submitBtn = document.querySelector('#submit-btn');

function showError(msg) {
  errorNotice.textContent = msg;
  errorNotice.style.display = 'block';
}

form.onsubmit = async (e) => {
  e.preventDefault();
  errorNotice.style.display = 'none';
  const email = document.querySelector('#admin-email').value.trim();
  const password = document.querySelector('#admin-password').value;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Đang đăng nhập...';

  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Kiểm tra role admin trong profiles
      const profile = await getCurrentUserProfile();
      if (profile && profile.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Tài khoản này không có quyền Quản trị viên (Admin).');
      }

      sessionStorage.setItem('uniflows-admin', 'true');
      sessionStorage.setItem('uniflows-user-email', email);
      location.href = 'admin';
    } else {
      // Fallback chế độ demo khi chưa cấu hình Supabase URL/Key
      if ((email === 'admin@uniflowslabel.com' || email === 'admin') && password === 'UniFLOWs2026!') {
        sessionStorage.setItem('uniflows-admin', 'true');
        sessionStorage.setItem('uniflows-user-email', email);
        location.href = 'admin';
      } else {
        throw new Error('Email hoặc mật khẩu chưa đúng (Demo: admin@uniflowslabel.com / UniFLOWs2026!).');
      }
    }
  } catch (err) {
    showError(err.message || 'Đăng nhập không thành công.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Đăng nhập Admin';
  }
};
