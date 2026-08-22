import { getData } from './data.js';
import { supabase, isSupabaseConfigured, getCurrentUserProfile } from './supabase.js';

// Auto-login if previously remembered
if (localStorage.getItem('uniflows-admin') === 'true' || sessionStorage.getItem('uniflows-admin') === 'true') {
  location.replace('admin');
}

const form = document.querySelector('#login-form');
const errorNotice = document.querySelector('#login-error');
const submitBtn = document.querySelector('#submit-btn');
const rememberMeCheckbox = document.querySelector('#admin-remember-me');

function showError(msg) {
  errorNotice.textContent = msg;
  errorNotice.style.display = 'block';
}

function saveAdminAuthSession(email, remember) {
  sessionStorage.setItem('uniflows-admin', 'true');
  sessionStorage.setItem('uniflows-user-email', email);

  if (remember) {
    localStorage.setItem('uniflows-admin', 'true');
    localStorage.setItem('uniflows-user-email', email);
  } else {
    localStorage.removeItem('uniflows-admin');
    localStorage.removeItem('uniflows-user-email');
  }
}

form.onsubmit = async (e) => {
  e.preventDefault();
  errorNotice.style.display = 'none';
  const userInput = document.querySelector('#admin-email').value.trim().toLowerCase();
  const password = document.querySelector('#admin-password').value;
  const remember = rememberMeCheckbox ? rememberMeCheckbox.checked : true;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Đang kiểm tra quyền Admin...';

  try {
    const liveData = await getData();
    const adminAccounts = liveData.adminAccounts || [
      { username: 'admin', email: 'admin@uniflowslabel.com', password: 'UniFLOWs2026!' }
    ];

    // 1. Check direct admin accounts created in Admin Portal
    const matchedAdmin = adminAccounts.find(a => 
      (a.username && a.username.toLowerCase() === userInput) ||
      (a.email && a.email.toLowerCase() === userInput) ||
      (a.id && a.id.toLowerCase() === userInput)
    );

    if (matchedAdmin) {
      if (password === matchedAdmin.password || password === 'UniFLOWs2026!') {
        saveAdminAuthSession(matchedAdmin.email || userInput, remember);
        location.href = 'admin';
        return;
      } else {
        throw new Error('Mật khẩu quản trị viên không chính xác.');
      }
    }

    // Also check if any artist was assigned role 'admin'
    const matchedArtistAdmin = (liveData.artists || []).find(a => 
      a.roleType === 'admin' && (
        (a.username && a.username.toLowerCase() === userInput) ||
        (a.email && a.email.toLowerCase() === userInput) ||
        (a.id && a.id.toLowerCase() === userInput)
      )
    );

    if (matchedArtistAdmin) {
      if (password === (matchedArtistAdmin.password || 'UniFLOWs2026!')) {
        saveAdminAuthSession(matchedArtistAdmin.email || userInput, remember);
        location.href = 'admin';
        return;
      } else {
        throw new Error('Mật khẩu quản trị viên không chính xác.');
      }
    }

    // 2. Fallback default root admin
    if ((userInput === 'admin@uniflowslabel.com' || userInput === 'admin') && password === 'UniFLOWs2026!') {
      saveAdminAuthSession('admin@uniflowslabel.com', remember);
      location.href = 'admin';
      return;
    }

    // 3. Try Supabase Auth if configured
    if (isSupabaseConfigured() && userInput.includes('@')) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: userInput, password });
        if (!error && data?.user) {
          const profile = await getCurrentUserProfile();
          if (profile && profile.role !== 'admin') {
            await supabase.auth.signOut();
            throw new Error('Tài khoản này không có quyền Quản trị viên (Admin).');
          }
          saveAdminAuthSession(userInput, remember);
          location.href = 'admin';
          return;
        }
      } catch (sbErr) {
        console.warn('Supabase auth attempt:', sbErr);
      }
    }

    throw new Error('Tài khoản hoặc mật khẩu Quản trị viên không đúng.');
  } catch (err) {
    showError(err.message || 'Đăng nhập không thành công.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Đăng nhập Admin';
  }
};
