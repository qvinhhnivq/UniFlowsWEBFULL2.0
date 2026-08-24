import { getData, saveData, defaultData } from './data.js';
import { supabase, isSupabaseConfigured, uploadArtworkFile, uploadAudioFile } from './supabase.js';
import './security.js';

const isAdminAuth = sessionStorage.getItem('uniflows-admin') === 'true' || localStorage.getItem('uniflows-admin') === 'true';
if (!isAdminAuth) {
  location.replace('login');
}

const form = document.querySelector('#site-form');
const artistsBox = document.querySelector('#artists-editor');
const artistSelectorGrid = document.querySelector('#artist-selector-grid');
const articlesBox = document.querySelector('#articles-editor');
const releasesBox = document.querySelector('#releases-reviewer');
const emailsContainer = document.querySelector('#emails-editor-container');
const addEmailBtn = document.querySelector('#add-email-row-btn');
const announcementsContainer = document.querySelector('#announcements-editor-container');
const addAnnouncementBtn = document.querySelector('#add-announcement-btn');
const notice = document.querySelector('#notice');
const saveBtn = document.querySelector('#save-all-btn');

let data = await getData();
let releases = [];
let selectedArtistId = data.artists?.[0]?.id || '';
let currentReleaseFilter = 'all';

const esc = s => String(s ?? '').replace(/"/g, '&quot;');
const slug = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function showNotice(msg) {
  if (!notice) return;
  notice.textContent = msg;
  notice.style.display = 'block';
  scrollTo({ top: 0, behavior: 'smooth' });
}

// ----------------------------------------------------
// TAB NAVIGATION FOR ADMIN
// ----------------------------------------------------
function switchAdminTab(tabId) {
  document.querySelectorAll('#admin-tabs .admin-tab-btn').forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.querySelectorAll('.tab-pane').forEach(pane => {
    if (pane.id === tabId) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });

  if (tabId === 'admin-tab-overview') {
    renderDashboard();
  }
  if (tabId === 'admin-tab-pitching') {
    renderPitchingBoard();
  }
  if (tabId === 'admin-tab-audit') {
    loadAdminAuditLogs();
  }
  if (tabId === 'admin-tab-publishing') {
    renderPublishingAdmin();
  }
  if (tabId === 'admin-tab-unihube') {
    renderUniHubeAdmin();
  }
  if (tabId === 'admin-tab-collective48k') {
    renderCollective48kAdmin();
  }
  if (tabId === 'admin-tab-submissions') {
    renderMusicSubmissionsAdmin();
  }
}

document.querySelectorAll('#admin-tabs .admin-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchAdminTab(btn.dataset.tab);
  });
});

// ----------------------------------------------------
// EMAILS EDITOR
// ----------------------------------------------------
function renderEmailsEditor(emailsList) {
  if (!emailsContainer) return;
  const list = Array.isArray(emailsList) ? emailsList : Object.entries(emailsList || {}).map(([label, email]) => ({ label, email }));
  emailsContainer.innerHTML = list.map((item) => `
    <div class="custom-email-row" style="display:flex;gap:10px;align-items:center;">
      <input class="email-row-label" value="${esc(item.label || '')}" placeholder="Tên phòng ban / Nhãn" style="width:240px;padding:10px;border:1px solid var(--ink);">
      <input class="email-row-value" value="${esc(item.email || '')}" placeholder="email@uniflowslabel.com" style="flex:1;padding:10px;border:1px solid var(--ink);">
      <button type="button" class="remove-email-btn button alt" style="padding:10px 14px;">✕</button>
    </div>
  `).join('');

  emailsContainer.querySelectorAll('.remove-email-btn').forEach(btn => {
    btn.onclick = () => btn.closest('.custom-email-row')?.remove();
  });
}

addEmailBtn?.addEventListener('click', () => {
  if (!emailsContainer) return;
  const row = document.createElement('div');
  row.className = 'custom-email-row';
  row.style.cssText = 'display:flex;gap:10px;align-items:center;';
  row.innerHTML = `
    <input class="email-row-label" placeholder="Tên phòng ban mới" style="width:240px;padding:10px;border:1px solid var(--ink);">
    <input class="email-row-value" placeholder="email@uniflowslabel.com" style="flex:1;padding:10px;border:1px solid var(--ink);">
    <button type="button" class="remove-email-btn button alt" style="padding:10px 14px;">✕</button>
  `;
  row.querySelector('.remove-email-btn').onclick = () => row.remove();
  emailsContainer.appendChild(row);
});

// ----------------------------------------------------
// ANNOUNCEMENTS MANAGER (BROADCAST TO ARTIST PORTAL)
// ----------------------------------------------------
function renderAnnouncementsEditor(announcements = []) {
  if (!announcementsContainer) return;
  if (!announcements || announcements.length === 0) {
    announcementsContainer.innerHTML = '<p class="empty" style="background:#f9f9f9;padding:12px;border:1px solid #eee;">Chưa có thông báo nào gửi cho nghệ sĩ.</p>';
    return;
  }

  announcementsContainer.innerHTML = announcements.map((ann, idx) => `
    <div class="custom-announcement-card" data-ann-idx="${idx}" style="background:#fafafa;border:1px solid var(--ink);padding:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span class="eyebrow" style="color:#b45309;">Thông báo #${idx + 1}</span>
        <button type="button" class="remove-ann-btn button alt remove" style="padding:4px 10px;font-size:11px;">✕ Xóa thông báo</button>
      </div>
      <div class="mini-grid">
        <div class="field" style="grid-column:1/-1;">
          <label>Tiêu đề thông báo</label>
          <input class="ann-title" value="${esc(ann.title || '')}" placeholder="Ví dụ: Lịch đối soát doanh thu quý 3/2026" required>
        </div>
        <div class="field">
          <label>Mức độ / Loại thông báo</label>
          <select class="ann-type" style="padding:8px;border:1px solid var(--ink);background:#fff;">
            <option value="important" ${ann.type === 'important' ? 'selected' : ''}>🔥 Quan trọng (Important)</option>
            <option value="info" ${ann.type === 'info' ? 'selected' : ''}>📢 Tin tức chung (Info)</option>
            <option value="update" ${ann.type === 'update' ? 'selected' : ''}>⚡ Cập nhật kỹ thuật (Update)</option>
          </select>
        </div>
        <div class="field">
          <label>Ngày thông báo</label>
          <input class="ann-date" value="${esc(ann.date || new Date().toLocaleDateString('vi-VN'))}" placeholder="DD/MM/YYYY">
        </div>
        <div class="field" style="grid-column:1/-1;">
          <label>Nội dung thông báo chi tiết</label>
          <textarea class="ann-content" rows="3" placeholder="Nhập nội dung thông báo gửi đến toàn thể nghệ sĩ...">${esc(ann.content || '')}</textarea>
        </div>
        <div class="field">
          <label>Trạng thái hiển thị trên Portal</label>
          <select class="ann-active" style="padding:8px;border:1px solid var(--ink);background:#fff;">
            <option value="true" ${ann.active !== false ? 'selected' : ''}>🟢 Hiển thị trên Artist Portal</option>
            <option value="false" ${ann.active === false ? 'selected' : ''}>🔴 Tạm ẩn</option>
          </select>
        </div>
      </div>
    </div>
  `).join('');

  announcementsContainer.querySelectorAll('.remove-ann-btn').forEach(btn => {
    btn.onclick = () => btn.closest('.custom-announcement-card')?.remove();
  });
}

addAnnouncementBtn?.addEventListener('click', () => {
  if (!announcementsContainer) return;
  const emptyP = announcementsContainer.querySelector('.empty');
  if (emptyP) emptyP.remove();

  const card = document.createElement('div');
  card.className = 'custom-announcement-card';
  card.style.cssText = 'background:#fafafa;border:1px solid var(--ink);padding:16px;margin-bottom:12px;';
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <span class="eyebrow" style="color:#b45309;">Thông báo mới</span>
      <button type="button" class="remove-ann-btn button alt remove" style="padding:4px 10px;font-size:11px;">✕ Xóa thông báo</button>
    </div>
    <div class="mini-grid">
      <div class="field" style="grid-column:1/-1;">
        <label>Tiêu đề thông báo</label>
        <input class="ann-title" placeholder="Ví dụ: Lịch đối soát quý mới..." required>
      </div>
      <div class="field">
        <label>Mức độ / Loại thông báo</label>
        <select class="ann-type" style="padding:8px;border:1px solid var(--ink);background:#fff;">
          <option value="important">🔥 Quan trọng (Important)</option>
          <option value="info" selected>📢 Tin tức chung (Info)</option>
          <option value="update">⚡ Cập nhật kỹ thuật (Update)</option>
        </select>
      </div>
      <div class="field">
        <label>Ngày thông báo</label>
        <input class="ann-date" value="${new Date().toLocaleDateString('vi-VN')}">
      </div>
      <div class="field" style="grid-column:1/-1;">
        <label>Nội dung thông báo chi tiết</label>
        <textarea class="ann-content" rows="3" placeholder="Nhập nội dung thông báo gửi đến toàn thể nghệ sĩ..."></textarea>
      </div>
      <div class="field">
        <label>Trạng thái hiển thị trên Portal</label>
        <select class="ann-active" style="padding:8px;border:1px solid var(--ink);background:#fff;">
          <option value="true" selected>🟢 Hiển thị trên Artist Portal</option>
          <option value="false">🔴 Tạm ẩn</option>
        </select>
      </div>
    </div>
  `;
  card.querySelector('.remove-ann-btn').onclick = () => card.remove();
  announcementsContainer.prepend(card);
});

// ----------------------------------------------------
// ARTIST & USER MANAGER (SELECTOR + CARD EDITOR)
// ----------------------------------------------------
function renderArtistSelector() {
  if (!artistSelectorGrid) return;
  if (!data.artists || data.artists.length === 0) {
    artistSelectorGrid.innerHTML = '<p class="empty" style="grid-column:1/-1;">Chưa có tài khoản nghệ sĩ / người dùng nào.</p>';
    return;
  }

  const typeFilter = document.querySelector('#admin-user-type-filter')?.value || 'all';
  let filteredArtists = data.artists;
  if (typeFilter === 'public') {
    filteredArtists = data.artists.filter(a => a.showOnWeb !== false && a.showOnWeb !== 'false');
  } else if (typeFilter === 'private') {
    filteredArtists = data.artists.filter(a => a.showOnWeb === false || a.showOnWeb === 'false');
  } else if (typeFilter === 'partner') {
    filteredArtists = data.artists.filter(a => a.roleType === 'partner');
  } else if (typeFilter === 'collab') {
    filteredArtists = data.artists.filter(a => a.roleType === 'collab');
  }

  if (filteredArtists.length === 0) {
    artistSelectorGrid.innerHTML = '<p class="empty" style="grid-column:1/-1;">Không có tài khoản nào theo bộ lọc này.</p>';
    return;
  }

  if (!selectedArtistId || !data.artists.some(a => a.id === selectedArtistId)) {
    selectedArtistId = filteredArtists[0]?.id || data.artists[0].id;
  }

  artistSelectorGrid.innerHTML = filteredArtists.map((a) => {
    const isPublic = a.showOnWeb !== false && a.showOnWeb !== 'false';
    const roleBadge = a.roleType === 'partner' ? '🤝 Đối tác' :
      (a.roleType === 'collab' ? '✨ Collab' :
      (a.roleType === 'producer' ? '🎛️ Producer' :
      (a.roleType === 'manager' ? '👔 Quản lý' :
      (a.roleType === 'exclusive' ? '⭐ Độc quyền' : '💿 Phân phối'))));

    const roleBg = a.roleType === 'partner' ? '#eff6ff; color:#1d4ed8' :
      (a.roleType === 'collab' ? '#fdf4ff; color:#86198f' :
      (a.roleType === 'producer' ? '#f5f3ff; color:#6d28d9' :
      (a.roleType === 'manager' ? '#f1f5f9; color:#334155' :
      (a.roleType === 'exclusive' ? '#fef3c7; color:#b45309' : '#f0fdf4; color:#15803d'))));

    return `
      <div class="artist-picker-card ${a.id === selectedArtistId ? 'active' : ''}" data-select-artist-id="${esc(a.id)}" style="position:relative;display:flex;align-items:center;justify-content:space-between;padding:10px 12px;">
        <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
          <img src="${esc(a.image || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=200&q=80')}" alt="${esc(a.name)}">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:bold;color:#64748b;background:#f1f5f9;padding:1px 4px;border-radius:3px;">#${data.artists.indexOf(a) + 1}</span>
              <strong style="font-size: 13px; display: block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(a.name || 'Người dùng')}</strong>
            </div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:2px;">
              <span style="font-family:'DM Mono',monospace;font-size:9px;padding:2px 5px;border-radius:3px;font-weight:bold;letter-spacing:0;line-height:1.2;background:${isPublic ? '#dbeafe; color:#1e40af' : '#fef3c7; color:#92400e'};">
                ${isPublic ? '🌐 Web' : '🔒 Portal'}
              </span>
              <span style="font-family:'DM Mono',monospace;font-size:9px;padding:2px 5px;border-radius:3px;font-weight:bold;letter-spacing:0;line-height:1.2;background:${roleBg};">
                ${esc(roleBadge)}
              </span>
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;margin-left:8px;" onclick="event.stopPropagation();">
          <button type="button" class="btn-move-artist-up" data-id="${esc(a.id)}" title="Đưa nghệ sĩ lên trên" style="padding:3px 7px;font-size:10px;background:#fff;border:1px solid #94a3b8;border-radius:3px;cursor:pointer;line-height:1;font-weight:bold;">▲</button>
          <button type="button" class="btn-move-artist-down" data-id="${esc(a.id)}" title="Đưa nghệ sĩ xuống dưới" style="padding:3px 7px;font-size:10px;background:#fff;border:1px solid #94a3b8;border-radius:3px;cursor:pointer;line-height:1;font-weight:bold;">▼</button>
        </div>
      </div>
    `;
  }).join('');

  artistSelectorGrid.querySelectorAll('[data-select-artist-id]').forEach(card => {
    card.addEventListener('click', () => {
      selectedArtistId = card.dataset.selectArtistId;
      renderArtistSelector();
      renderSelectedArtistEditor();
    });
  });

  attachArtistReorderEvents();
}

async function moveArtistPosition(id, direction) {
  const index = data.artists.findIndex(x => x.id === id);
  if (index < 0) return;
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= data.artists.length) return;

  const temp = data.artists[index];
  data.artists[index] = data.artists[newIndex];
  data.artists[newIndex] = temp;
  data.artist_order = data.artists.map(a => a.id);
  selectedArtistId = id;

  await saveData(data);
  renderArtistSelector();
  renderSelectedArtistEditor();
  showNotice(`✓ Đã thay đổi thứ tự: Nghệ sĩ "${temp.name}" chuyển sang vị trí #${newIndex + 1}!`);
}

async function setArtistExactPosition(id, targetIdx) {
  const currentIndex = data.artists.findIndex(x => x.id === id);
  if (currentIndex < 0 || targetIdx < 0 || targetIdx >= data.artists.length) return;
  if (currentIndex === targetIdx) return;

  const [moved] = data.artists.splice(currentIndex, 1);
  data.artists.splice(targetIdx, 0, moved);
  data.artist_order = data.artists.map(a => a.id);
  selectedArtistId = id;

  await saveData(data);
  renderArtistSelector();
  renderSelectedArtistEditor();
  showNotice(`✓ Đã chuyển nghệ sĩ "${moved.name}" sang vị trí #${targetIdx + 1}!`);
}

function attachArtistReorderEvents() {
  document.querySelectorAll('.btn-move-artist-up').forEach(btn => {
    btn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.id;
      await moveArtistPosition(id, -1);
    };
  });

  document.querySelectorAll('.btn-move-artist-down').forEach(btn => {
    btn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.id;
      await moveArtistPosition(id, 1);
    };
  });

  document.querySelectorAll('.select-artist-position').forEach(select => {
    select.onchange = async (e) => {
      const id = select.dataset.id;
      const targetIdx = parseInt(select.value, 10);
      await setArtistExactPosition(id, targetIdx);
    };
  });
}

document.querySelector('#admin-user-type-filter')?.addEventListener('change', () => {
  renderArtistSelector();
});

function renderSelectedArtistEditor() {
  if (!artistsBox) return;
  const currentArtist = data.artists.find(a => a.id === selectedArtistId);
  if (!currentArtist) {
    artistsBox.innerHTML = '<p class="empty">Vui lòng chọn một nghệ sĩ từ danh sách bên trên để chỉnh sửa.</p>';
    return;
  }
  const idx = data.artists.indexOf(currentArtist);
  artistsBox.innerHTML = artistEditor(currentArtist, idx);
  attachArtistUploadEvents();
  attachArtistReorderEvents();
}

const artistEditor = (a, idx) => {
  const isPublic = a.showOnWeb !== false && a.showOnWeb !== 'false';

  return `
  <div class="item-editor" data-artist data-artist-id="${esc(a.id)}" data-artist-idx="${idx}" style="background:#fff;border:2px solid var(--ink);padding:24px;margin-top:10px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;border-bottom:1px solid var(--line);padding-bottom:12px;flex-wrap:wrap;gap:10px;">
      <div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="eyebrow" style="color:#2563eb;margin:0;">Đang chỉnh sửa</span>
          <span style="font-size:10px;padding:2px 6px;border-radius:10px;font-weight:bold;background:${isPublic ? '#dbeafe' : '#fef3c7'};color:${isPublic ? '#1e40af' : '#92400e'};">
            ${isPublic ? '🌐 Hiển thị trên Web' : '🔒 Chỉ dùng Portal nội bộ'}
          </span>
        </div>
        <h3 style="margin:4px 0 0;font-size:22px;">${esc(a.name)}</h3>
        
        <!-- Interactive Position Ordering Bar -->
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px;background:#f8fafc;padding:6px 12px;border:1px solid #cbd5e1;border-radius:4px;flex-wrap:wrap;">
          <span style="font-family:'DM Mono',monospace;font-size:11px;font-weight:700;color:#1e293b;">⚡ Vị trí hiển thị:</span>
          <select class="select-artist-position" data-id="${esc(a.id)}" style="padding:4px 8px;font-family:'DM Mono',monospace;font-size:11px;font-weight:700;border:1px solid #94a3b8;background:#fff;cursor:pointer;border-radius:3px;">
            ${data.artists.map((art, i) => `
              <option value="${i}" ${i === idx ? 'selected' : ''}>Vị trí #${i + 1} (${esc(art.name)})</option>
            `).join('')}
          </select>
          <button type="button" class="btn-move-artist-up button alt" data-id="${esc(a.id)}" ${idx === 0 ? 'disabled' : ''} style="padding:3px 10px;font-size:10px;font-weight:bold;cursor:${idx === 0 ? 'not-allowed;opacity:0.4' : 'pointer'};">▲ Lên</button>
          <button type="button" class="btn-move-artist-down button alt" data-id="${esc(a.id)}" ${idx === data.artists.length - 1 ? 'disabled' : ''} style="padding:3px 10px;font-size:10px;font-weight:bold;cursor:${idx === data.artists.length - 1 ? 'not-allowed;opacity:0.4' : 'pointer'};">▼ Xuống</button>
        </div>
      </div>
      <button class="button alt remove" type="button" data-remove-artist="${idx}" style="padding:6px 12px;font-size:11px;">✕ Xóa tài khoản này</button>
    </div>

    <!-- 01: Visibility & Role Settings -->
    <div style="background:#e0f2fe;border:1px solid #7dd3fc;padding:15px;margin-bottom:15px;">
      <h4 style="margin:0 0 10px;font-size:13px;text-transform:uppercase;color:#0369a1;">⚙️ Phân loại tài khoản & Quyền hiển thị Website</h4>
      <div class="mini-grid">
        <div class="field">
          <label style="font-weight:bold;color:#0369a1;">Trạng thái hiển thị Website</label>
          <select data-key="showOnWeb" style="padding:10px;border:1px solid var(--ink);background:#fff;font-weight:bold;">
            <option value="true" ${isPublic ? 'selected' : ''}>🌐 Hiển thị trên Website (Nghệ sĩ công khai - Public Roster)</option>
            <option value="false" ${!isPublic ? 'selected' : ''}>🔒 Chỉ dùng Portal (ẨN khỏi Website công khai)</option>
          </select>
          <small style="margin-top:4px;display:block;opacity:0.8;">Chọn "Chỉ dùng Portal" nếu không muốn người này xuất hiện trên trang chủ hay trang Nghệ sĩ.</small>
        </div>

        <div class="field">
          <label style="font-weight:bold;color:#0369a1;">Phân loại tài khoản / Vai trò</label>
          <select data-key="roleType" style="padding:10px;border:1px solid var(--ink);background:#fff;font-weight:bold;">
            <option value="partner" ${a.roleType === 'partner' ? 'selected' : ''}>🤝 Đối tác quan trọng (Strategic Partner)</option>
            <option value="collab" ${a.roleType === 'collab' ? 'selected' : ''}>✨ Nghệ sĩ Collab / Khách mời (Collab / Featured Artist)</option>
            <option value="exclusive" ${a.roleType === 'exclusive' ? 'selected' : ''}>⭐ Nghệ sĩ Độc quyền (Exclusive Artist)</option>
            <option value="distribution" ${a.roleType === 'distribution' ? 'selected' : ''}>💿 Nghệ sĩ Phân phối (Distribution Client)</option>
            <option value="producer" ${a.roleType === 'producer' ? 'selected' : ''}>🎛️ Producer / Beatmaker (Music Producer)</option>
            <option value="manager" ${a.roleType === 'manager' ? 'selected' : ''}>👔 Quản lý / Đại diện (Manager Account)</option>
          </select>
          <small style="margin-top:4px;display:block;opacity:0.8;">Tài khoản Collab/Đối tác sẽ chỉ xem stats các bài mình có tham gia và hưởng doanh thu theo thỏa thuận Split.</small>
        </div>
      </div>
    </div>

    <!-- 02: Login Credentials & Security Vault -->
    <div style="background:#f0fdf4;border:1px solid #86efac;padding:15px;margin-bottom:15px;border-radius:6px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
        <h4 style="margin:0;font-size:13px;text-transform:uppercase;color:#166534;">🔑 Thông Tin Đăng Nhập & Mật Khẩu Portal</h4>
        <button type="button" class="btn-export-artist-handover button" data-artist-idx="${idx}" style="background:#16a34a;color:#fff;border-color:#16a34a;padding:5px 12px;font-size:11px;font-weight:bold;">
          📋 Xuất Phiếu Bàn Giao Tài Khoản
        </button>
      </div>
      <div class="mini-grid">
        <div class="field">
          <label style="color:#166534;font-weight:bold;">Tên đăng nhập (Username)</label>
          <input data-key="username" value="${esc(a.username || a.id)}" placeholder="Ví dụ: lumi.artist">
        </div>
        <div class="field">
          <label style="color:#166534;font-weight:bold;">Email liên kết đăng nhập</label>
          <input data-key="email" value="${esc(a.email || '')}" placeholder="artist@uniflowslabel.com">
        </div>
        <div class="field" style="grid-column: 1 / -1;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <label style="color:#166534;font-weight:bold;margin:0;">Mật khẩu đăng nhập Portal</label>
            <span style="font-size:11px;color:#15803d;">Admin có thể đổi mật khẩu trực tiếp tại đây bất cứ lúc nào</span>
          </div>
          <input data-key="password" type="text" value="${esc(a.password || (a.name ? `${a.name}@2026` : 'Uniflows@2026'))}" style="font-family:'DM Mono',monospace;font-weight:bold;color:#14532d;background:#fff;border:1px solid #86efac;padding:10px;">
        </div>
      </div>
    </div>

    <div class="mini-grid">
      <div class="field"><label>Tên nghệ sĩ / Tên người dùng</label><input data-key="name" value="${esc(a.name)}" required></div>
      <div class="field"><label>ID hệ thống (Slug cố định)</label><input data-key="id" value="${esc(a.id)}" required></div>
      <div class="field" style="grid-column: 1 / -1;"><label>Thể loại chính / Lĩnh vực</label><input data-key="genre" value="${esc(a.genre || 'Independent')}"></div>
      <div class="field" style="grid-column: 1 / -1;">
        <label>URL Ảnh đại diện (Hoặc tải ảnh từ máy tính)</label>
        <input data-key="image" id="artist-img-${idx}" value="${esc(a.image)}" placeholder="https://...">
        <div style="margin-top:6px;display:flex;align-items:center;gap:10px;">
          <input type="file" accept="image/*" class="artist-file-input" data-target-input="#artist-img-${idx}" data-status-el="#artist-status-${idx}" style="font-size:11px;">
          <span id="artist-status-${idx}" style="font-size:11px;color:#008800;"></span>
        </div>
      </div>
    </div>

    <!-- Contract & Accounting Cycle Settings -->
    <div style="background:#fffbe6;border:1px solid #ffe58f;padding:15px;margin:15px 0;">
      <h4 style="margin:0 0 10px;font-size:13px;text-transform:uppercase;color:#d48806;">📜 Hợp đồng & Kỳ đối soát doanh thu</h4>
      <div class="mini-grid">
        <div class="field">
          <label>Kỳ đối soát doanh thu (Payout Accounting Cycle)</label>
          <input data-key="payoutCycle" value="${esc(a.payoutCycle || 'Hàng tháng (Monthly)')}" placeholder="Ví dụ: Hàng tháng / Net-45 / Ngày 15 hàng tháng">
        </div>
        <div class="field">
          <label>Tỷ lệ phân chia Royalty (% Nghệ sĩ nhận)</label>
          <input data-key="royaltyRate" value="${esc(a.royaltyRate || '80% Master')}" placeholder="Ví dụ: 80% Master / 20% Label">
        </div>
        <div class="field" style="grid-column: 1 / -1;">
          <label>Thời hạn hợp đồng / Ghi chú hợp đồng</label>
          <input data-key="contractTerm" value="${esc(a.contractTerm || 'Hợp đồng độc quyền phân phối 2024 - 2027')}" placeholder="Ví dụ: 2024 - 2027 (Thời hạn 3 năm)">
        </div>
        <div class="field">
          <label style="color:#2563eb;font-weight:bold;">Doanh thu Publishing & Sync đã ghi nhận (₫)</label>
          <input data-key="publishingRevenue" value="${esc(a.publishingRevenue || '0')}" placeholder="Ví dụ: 8500000" style="font-weight:bold;color:#2563eb;">
        </div>
        <div class="field">
          <label style="color:#2563eb;font-weight:bold;">Tỷ lệ chia sẻ Publishing (% Nghệ sĩ nhận)</label>
          <input data-key="publishingRoyaltyRate" value="${esc(a.publishingRoyaltyRate || '75%')}" placeholder="Ví dụ: 75%">
        </div>
      </div>
    </div>

    <!-- DSP Insights & Revenue Breakdown -->
    <div style="background:#f8f9fa;border:1px solid #dee2e6;padding:15px;margin:15px 0;">
      <h4 style="margin:0 0 10px;font-size:13px;text-transform:uppercase;color:#1e40af;">📊 Phân bổ Doanh thu & Streams từng nền tảng (DSP)</h4>
      <div class="mini-grid">
        <div class="field"><label>Spotify Streams</label><input data-key="spotifyStreams" value="${esc(a.spotifyStreams || '0')}" placeholder="Ví dụ: 120000"></div>
        <div class="field"><label>Spotify Doanh thu (₫)</label><input data-key="spotifyRevenue" value="${esc(a.spotifyRevenue || '0')}" placeholder="Ví dụ: 25000000"></div>
        <div class="field"><label>Apple Music Streams</label><input data-key="appleStreams" value="${esc(a.appleStreams || '0')}" placeholder="Ví dụ: 45000"></div>
        <div class="field"><label>Apple Music Doanh thu (₫)</label><input data-key="appleRevenue" value="${esc(a.appleRevenue || '0')}" placeholder="Ví dụ: 15000000"></div>
        <div class="field"><label>YouTube Music Streams</label><input data-key="youtubeStreams" value="${esc(a.youtubeStreams || '0')}" placeholder="Ví dụ: 80000"></div>
        <div class="field"><label>YouTube Music Doanh thu (₫)</label><input data-key="youtubeRevenue" value="${esc(a.youtubeRevenue || '0')}" placeholder="Ví dụ: 8000000"></div>
        <div class="field"><label>Zing / NCT / Khác Streams</label><input data-key="otherStreams" value="${esc(a.otherStreams || '0')}" placeholder="Ví dụ: 20000"></div>
        <div class="field"><label>Zing / NCT / Khác Doanh thu (₫)</label><input data-key="otherRevenue" value="${esc(a.otherRevenue || '0')}" placeholder="Ví dụ: 2000000"></div>
      </div>

      <h4 style="margin:15px 0 10px;font-size:13px;text-transform:uppercase;color:#1e40af;">🌍 Thống kê Địa lý & Nguồn Streams</h4>
      <div class="mini-grid">
        <div class="field"><label>Top Quốc gia</label><input data-key="topCountry" value="${esc(a.topCountry || 'Việt Nam')}" placeholder="Ví dụ: Việt Nam"></div>
        <div class="field"><label>Top Thành phố</label><input data-key="topCity" value="${esc(a.topCity || 'Hồ Chí Minh')}" placeholder="Ví dụ: Hồ Chí Minh"></div>
        <div class="field" style="grid-column: 1 / -1;"><label>Nguồn Streams dẫn đầu</label><input data-key="topSource" value="${esc(a.topSource || 'DSP Editorial & Algorithmic')}" placeholder="Ví dụ: DSP Editorial Playlists"></div>
      </div>
    </div>

    <!-- Bio & Links -->
    <div class="field"><label>Tiểu sử nghệ sĩ / Giới thiệu</label><textarea data-key="bio" rows="3">${esc(a.bio || '')}</textarea></div>
    <div class="mini-grid">
      <div class="field"><label>Instagram URL</label><input data-key="instagram" value="${esc(a.instagram || '')}" placeholder="https://instagram.com/..."></div>
      <div class="field"><label>YouTube URL</label><input data-key="youtube" value="${esc(a.youtube || '')}" placeholder="https://youtube.com/..."></div>
      <div class="field"><label>TikTok URL</label><input data-key="tiktok" value="${esc(a.tiktok || '')}" placeholder="https://tiktok.com/@..."></div>
    </div>
    <div class="field" style="margin-top:10px;"><label>Bộ sưu tập ảnh Gallery (Mỗi dòng một URL ảnh)</label><textarea data-key="gallery" rows="3">${esc((a.gallery || []).join('\n'))}</textarea></div>
  </div>
`;
};

function attachArtistUploadEvents() {
  document.querySelectorAll('.artist-file-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const targetInput = document.querySelector(e.target.dataset.targetInput);
      const statusEl = document.querySelector(e.target.dataset.statusEl);
      if (statusEl) statusEl.textContent = 'Đang upload...';
      try {
        const publicUrl = await uploadArtworkFile(file, `artist_${Date.now()}`);
        if (targetInput) targetInput.value = publicUrl;
        if (statusEl) statusEl.textContent = '✓ Đã upload ảnh thành công!';
        renderArtistSelector();
      } catch (err) {
        if (statusEl) statusEl.textContent = `Lỗi: ${err.message}`;
      }
    });
  });
}

// ----------------------------------------------------
// ARTICLES & JOURNAL EDITOR
// ----------------------------------------------------
const articleEditor = (art, idx) => `
  <div class="item-editor" data-article style="background:#fff;border:1px solid var(--ink);padding:20px;margin-bottom:15px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <h3 style="margin:0;font-size:18px;">Bài viết #${idx + 1}: ${esc(art.title)}</h3>
      <button class="button alt remove" type="button" data-remove-article="${idx}" style="padding:6px 12px;font-size:11px;">✕ Xóa bài viết</button>
    </div>
    <div class="mini-grid">
      <div class="field"><label>Tiêu đề</label><input data-key="title" value="${esc(art.title)}" required></div>
      <div class="field"><label>ID / Slug bài viết</label><input data-key="id" value="${esc(art.id)}" required></div>
      <div class="field"><label>Thời gian</label><input data-key="date" value="${esc(art.date)}"></div>
      <div class="field"><label>Chuyên mục</label><input data-key="category" value="${esc(art.category)}"></div>
      <div class="field">
        <label>URL Ảnh bìa (Hoặc dán Link trực tiếp)</label>
        <input data-key="cover" id="article-cover-${idx}" value="${esc(art.cover)}" placeholder="https://...">
        <div style="margin-top:6px;display:flex;align-items:center;gap:10px;">
          <input type="file" accept="image/*" class="article-cover-input" data-target="#article-cover-${idx}" data-status="#art-status-${idx}" style="font-size:11px;">
          <span id="art-status-${idx}" style="font-size:11px;color:#008800;"></span>
        </div>
      </div>
      <div class="field"><label>Hiển thị</label><select data-key="published"><option value="true" ${art.published ? 'selected' : ''}>Công khai</option><option value="false" ${!art.published ? 'selected' : ''}>Ẩn</option></select></div>
    </div>
    <div class="field" style="margin-top:10px;"><label>Tóm tắt bài viết</label><textarea data-key="excerpt" rows="2">${esc(art.excerpt)}</textarea></div>
    <div class="field"><label>Nội dung chi tiết</label><textarea data-key="body" rows="6">${esc(art.body)}</textarea></div>
  </div>
`;

function attachArticleUploadEvents() {
  document.querySelectorAll('.article-cover-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const inputEl = document.querySelector(e.target.dataset.target);
      const statusEl = document.querySelector(e.target.dataset.status);
      if (statusEl) statusEl.textContent = 'Đang upload...';
      try {
        const publicUrl = await uploadArtworkFile(file, `article_${Date.now()}`);
        if (inputEl) inputEl.value = publicUrl;
        if (statusEl) statusEl.textContent = '✓ Đã upload ảnh bìa thành công!';
      } catch (err) {
        if (statusEl) statusEl.textContent = `Lỗi: ${err.message}`;
      }
    });
  });
}

// ----------------------------------------------------
// PAYOUT REQUESTS REVIEWER & STATS
// ----------------------------------------------------
const payoutBox = document.querySelector('#payout-requests-reviewer');
let payoutRequests = [];

async function loadPayoutRequests() {
  if (!payoutBox) return;
  
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem('uniflows-payouts') || '[]');
  } catch {}

  if (isSupabaseConfigured()) {
    try {
      const { data: dbPayouts, error } = await supabase
        .from('payout_requests')
        .select('*, artists(name)')
        .order('created_at', { ascending: false });

      if (!error && dbPayouts) {
        list = dbPayouts;
        try { localStorage.setItem('uniflows-payouts', JSON.stringify(list)); } catch {}
      }
    } catch (err) {
      console.warn('Lỗi tải payout từ Supabase:', err);
    }
  }

  payoutRequests = list;
  renderDashboard();

  // Calculate statistics
  let pendingCount = 0;
  let pendingTotal = 0;
  let paidCount = 0;
  let paidTotal = 0;
  let rejectedCount = 0;

  payoutRequests.forEach(req => {
    const amt = parseInt(String(req.amount || 0).replace(/[^0-9]/g, ''), 10) || 0;
    if (req.status === 'Đang chờ xem xét') {
      pendingCount++;
      pendingTotal += amt;
    } else if (req.status === 'Đã thanh toán (Hoàn tất)' || req.status === 'Đã thanh toán') {
      paidCount++;
      paidTotal += amt;
    } else if (req.status === 'Từ chối thanh toán' || req.status === 'Từ chối') {
      rejectedCount++;
    }
  });

  const statPending = document.querySelector('#stat-pending-payout');
  const statPaid = document.querySelector('#stat-paid-payout');
  const statRejected = document.querySelector('#stat-rejected-payout');

  if (statPending) statPending.textContent = `${pendingCount} (₫ ${pendingTotal.toLocaleString('vi-VN')})`;
  if (statPaid) statPaid.textContent = `${paidCount} GD (₫ ${paidTotal.toLocaleString('vi-VN')})`;
  if (statRejected) statRejected.textContent = `${rejectedCount} yêu cầu`;

  // Apply Filter by Status and Artist
  const filterVal = document.querySelector('#admin-payout-filter')?.value || 'all';
  const artistFilterVal = document.querySelector('#admin-payout-artist-filter')?.value || 'all';
  let filtered = payoutRequests;

  if (artistFilterVal !== 'all') {
    filtered = filtered.filter(r => r.artist_id === artistFilterVal);
  }

  if (filterVal === 'pending') {
    filtered = filtered.filter(r => r.status === 'Đang chờ xem xét');
  } else if (filterVal === 'paid') {
    filtered = filtered.filter(r => r.status === 'Đã thanh toán (Hoàn tất)' || r.status === 'Đã thanh toán');
  } else if (filterVal === 'rejected') {
    filtered = filtered.filter(r => r.status === 'Từ chối thanh toán' || r.status === 'Từ chối');
  }

  if (filtered.length === 0) {
    payoutBox.innerHTML = '<p class="empty" style="padding:15px;background:#fff;border:1px solid var(--line);">Không có yêu cầu rút tiền nào trong danh mục này.</p>';
    return;
  }

  payoutBox.innerHTML = filtered.map(req => {
    const isPending = req.status === 'Đang chờ xem xét';
    const isPaid = req.status === 'Đã thanh toán (Hoàn tất)' || req.status === 'Đã thanh toán';
    const isRejected = req.status === 'Từ chối thanh toán' || req.status === 'Từ chối';
    const bank = req.bank_info || {};
    const artistName = req.artists?.name || data.artists.find(a => a.id === req.artist_id)?.name || req.artist_id || 'Nghệ sĩ';
    const dateStr = req.created_at ? new Date(req.created_at).toLocaleString('vi-VN') : 'Mới';

    return `
      <div class="item-editor" data-payout-id="${esc(req.id)}" data-artist-id="${esc(req.artist_id)}" data-payout-amount="${esc(req.amount)}" style="background:#fff;border:1px solid var(--ink);padding:18px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;border-bottom:1px solid var(--line);padding-bottom:10px;">
          <div>
            <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold;background:${isPending ? '#fef3c7' : (isPaid ? '#dcfce7' : '#fee2e2')};color:${isPending ? '#b45309' : (isPaid ? '#15803d' : '#cf1322')};">
              ${isPending ? '⏳ Đang chờ xem xét' : (isPaid ? '✅ Đã thanh toán' : '❌ Bị từ chối')}
            </span>
            <strong style="font-size:18px;margin-left:8px;color:#111;">₫ ${parseInt(req.amount || 0).toLocaleString('vi-VN')}</strong>
          </div>
          <span style="font-size:12px;opacity:0.7;">Gửi lúc: ${esc(dateStr)}</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:12px 0;font-size:13px;background:#f9f9f9;padding:12px;border:1px solid #eee;">
          <div>
            <span style="font-size:11px;opacity:0.6;text-transform:uppercase;display:block;">Nghệ sĩ yêu cầu:</span>
            <strong>${esc(artistName)}</strong> <small style="opacity:0.7;">(${esc(req.artist_id)})</small>
          </div>
          <div>
            <span style="font-size:11px;opacity:0.6;text-transform:uppercase;display:block;">Ngân hàng:</span>
            <b>${esc(bank.bank || 'Chưa rõ')}</b>
          </div>
          <div>
            <span style="font-size:11px;opacity:0.6;text-transform:uppercase;display:block;">Số tài khoản:</span>
            <b style="font-family:monospace;color:#1e40af;">${esc(bank.accountNumber || '')}</b>
          </div>
          <div>
            <span style="font-size:11px;opacity:0.6;text-transform:uppercase;display:block;">Tên chủ tài khoản:</span>
            <b style="text-transform:uppercase;">${esc(bank.accountName || '')}</b>
          </div>
        </div>

        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:12px;">
          <div style="flex:1;min-width:240px;">
            <label style="font-size:11px;font-weight:bold;text-transform:uppercase;display:block;margin-bottom:4px;">Chuyển đổi trạng thái:</label>
            <select class="payout-status-select" style="width:100%;padding:8px;border:1px solid var(--ink);font-weight:bold;background:#fff;">
              <option value="Đang chờ xem xét" ${isPending ? 'selected' : ''}>⏳ Đang chờ xem xét</option>
              <option value="Đã thanh toán (Hoàn tất)" ${isPaid ? 'selected' : ''}>✅ Đã thanh toán (Hoàn tất)</option>
              <option value="Từ chối thanh toán" ${isRejected ? 'selected' : ''}>❌ Từ chối thanh toán</option>
            </select>
          </div>

          <div class="rejection-reason-box" style="flex:2;min-width:280px;display:${isRejected ? 'block' : 'none'};">
            <label style="font-size:11px;font-weight:bold;text-transform:uppercase;color:#cf1322;display:block;margin-bottom:4px;">Lý do từ chối (Gửi về tài khoản nghệ sĩ):</label>
            <input class="payout-rejection-input" value="${esc(req.rejection_reason || '')}" placeholder="Ví dụ: Sai số tài khoản, chưa đủ kỳ đối soát..." style="width:100%;padding:8px;border:1px solid #cf1322;">
          </div>

          <div style="margin-top:auto;display:flex;gap:8px;">
            <button class="button" type="button" data-save-payout="${esc(req.id)}" style="padding:9px 16px;font-size:11px;">Lưu cập nhật</button>
            <button class="button alt remove" type="button" data-delete-payout="${esc(req.id)}" style="padding:9px 12px;font-size:11px;">✕ Xóa</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach status change events
  payoutBox.querySelectorAll('.payout-status-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const card = e.target.closest('[data-payout-id]');
      const reasonBox = card?.querySelector('.rejection-reason-box');
      if (reasonBox) {
        reasonBox.style.display = e.target.value === 'Từ chối thanh toán' ? 'block' : 'none';
      }
    });
  });

  // Attach Save Payout events
  payoutBox.querySelectorAll('[data-save-payout]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const payoutId = e.target.dataset.savePayout;
      const card = e.target.closest('[data-payout-id]');
      const status = card?.querySelector('.payout-status-select')?.value;
      const rejection_reason = card?.querySelector('.payout-rejection-input')?.value.trim() || '';
      const artistId = card?.dataset.artistId;
      const amount = card?.dataset.payoutAmount;

      btn.disabled = true; btn.textContent = 'Đang lưu...';

      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('payout_requests')
          .update({ status, rejection_reason })
          .eq('id', payoutId);

        if (error) {
          alert('Lỗi cập nhật Supabase: ' + error.message);
          btn.disabled = false; btn.textContent = 'Lưu cập nhật';
          return;
        }
      }

      // Send notification to artist
      const amtStr = parseInt(amount || 0).toLocaleString('vi-VN');
      if (status === 'Đã thanh toán (Hoàn tất)') {
        await sendArtistNotification(
          artistId,
          '💳 Yêu cầu rút tiền được duyệt',
          `Khoản thanh toán ₫ ${amtStr} đã được Quản trị viên duyệt và chuyển khoản hoàn tất vào tài khoản ngân hàng của bạn.`,
          'payout'
        );
      } else if (status === 'Từ chối thanh toán') {
        await sendArtistNotification(
          artistId,
          '❌ Yêu cầu rút tiền bị từ chối',
          `Yêu cầu rút ₫ ${amtStr} chưa được duyệt.${rejection_reason ? ' Lý do: ' + rejection_reason : ''}`,
          'payout'
        );
      }

      // Update local storage
      try {
        const cached = JSON.parse(localStorage.getItem('uniflows-payouts') || '[]');
        const idx = cached.findIndex(x => x.id === payoutId);
        if (idx >= 0) {
          cached[idx].status = status;
          cached[idx].rejection_reason = rejection_reason;
          localStorage.setItem('uniflows-payouts', JSON.stringify(cached));
        }
      } catch {}

      btn.disabled = false; btn.textContent = 'Lưu cập nhật';
      showNotice(`✓ Đã cập nhật trạng thái yêu cầu rút tiền: "${status}"`);
      loadPayoutRequests();
    });
  });

  payoutBox.querySelectorAll('[data-delete-payout]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('Xóa yêu cầu rút tiền này?')) return;
      btn.disabled = true;
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('payout_requests').delete().eq('id', e.target.dataset.deletePayout);
        if (error) alert('Lỗi: ' + error.message);
      }
      try {
        const cached = JSON.parse(localStorage.getItem('uniflows-payouts') || '[]');
        const filtered = cached.filter(x => x.id !== e.target.dataset.deletePayout);
        localStorage.setItem('uniflows-payouts', JSON.stringify(filtered));
      } catch {}
      showNotice('✓ Đã xóa yêu cầu rút tiền!');
      loadPayoutRequests();
    });
  });
}

document.querySelector('#admin-payout-filter')?.addEventListener('change', () => {
  loadPayoutRequests();
});

document.querySelector('#admin-refresh-payouts-btn')?.addEventListener('click', () => {
  loadPayoutRequests();
});

// ----------------------------------------------------
// COPYRIGHT & DMCA REPORTS MANAGEMENT (ADMIN)
// ----------------------------------------------------
const copyrightBox = document.querySelector('#admin-copyright-reports-list');
const greenlistBox = document.querySelector('#admin-greenlist-requests-list');

async function loadAdminCopyrightReports() {
  if (!copyrightBox) return;

  let list = [];
  try {
    list = JSON.parse(localStorage.getItem('uniflows-copyright-reports') || '[]');
  } catch {}

  if (isSupabaseConfigured()) {
    try {
      const { data: dbList, error } = await supabase.from('copyright_reports').select('*').order('created_at', { ascending: false });
      if (!error && dbList) {
        list = dbList;
        localStorage.setItem('uniflows-copyright-reports', JSON.stringify(list));
      }
    } catch {}
  }

  if (list.length === 0) {
    copyrightBox.innerHTML = '<p class="empty" style="padding:15px;background:#fff;border:1px solid var(--line);">Chưa có báo cáo vi phạm bản quyền nào từ nghệ sĩ.</p>';
    return;
  }

  copyrightBox.innerHTML = list.map(req => {
    const st = req.status || 'Đang tiếp nhận';
    const dateStr = req.created_at ? new Date(req.created_at).toLocaleString('vi-VN') : 'Mới';
    const isReceiving = st === 'Đang tiếp nhận';
    const isProcessing = st === 'Đang xử lý';
    const isSubmitted = st === 'Đã gửi yêu cầu';
    const isResolved = st === 'Đã xử lý';
    const isRejected = st === 'Từ chối';

    return `
      <div class="item-editor" data-copyright-id="${esc(req.id)}" style="background:#fff;border:1px solid var(--ink);padding:18px;margin-bottom:14px;border-radius:8px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;border-bottom:1px solid var(--line);padding-bottom:10px;">
          <div>
            <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:bold;background:#fee2e2;color:#b91c1c;">
              🚨 ${esc(st)}
            </span>
            <strong style="font-size:16px;margin-left:8px;color:#111;">${esc(req.track_title || req.track || req.title)}</strong>
          </div>
          <span style="font-size:12px;opacity:0.7;">Gửi lúc: ${esc(dateStr)}</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:12px 0;font-size:13px;background:#f9f9f9;padding:12px;border:1px solid #eee;border-radius:6px;">
          <div>
            <span style="font-size:11px;opacity:0.6;text-transform:uppercase;display:block;">Nghệ sĩ báo cáo:</span>
            <strong>${esc(req.artist_name || req.artist_id || 'Nghệ sĩ')}</strong>
          </div>
          <div>
            <span style="font-size:11px;opacity:0.6;text-transform:uppercase;display:block;">Nền tảng & Hình thức:</span>
            <b>${esc(req.platform)}</b> · <span style="color:#b91c1c;">${esc(req.violation_type || '')}</span>
          </div>
          <div>
            <span style="font-size:11px;opacity:0.6;text-transform:uppercase;display:block;">Hướng xử lý yêu cầu:</span>
            <b>${esc(req.action_preference || 'Takedown')}</b>
          </div>
        </div>

        <div style="margin-bottom:12px;font-size:13px;">
          <span style="font-size:11px;opacity:0.6;text-transform:uppercase;display:block;margin-bottom:2px;">Link video / bài đăng vi phạm:</span>
          <a href="${esc(req.target_url)}" target="_blank" style="color:#2563eb;word-break:break-all;font-weight:bold;">${esc(req.target_url)} ↗</a>
          ${req.notes ? `<div style="margin-top:6px;font-size:12px;color:#475569;background:#fff;padding:8px;border:1px solid #e2e8f0;border-radius:4px;"><b>Ghi chú từ nghệ sĩ:</b> ${esc(req.notes)}</div>` : ''}
        </div>

        <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;border-top:1px solid #f1f5f9;padding-top:12px;">
          <div style="flex:1;min-width:220px;">
            <label style="font-size:11px;font-weight:bold;text-transform:uppercase;display:block;margin-bottom:4px;">Chuyển đổi trạng thái:</label>
            <select class="copyright-status-select" style="width:100%;padding:8px;border:1px solid var(--ink);font-weight:bold;background:#fff;border-radius:4px;">
              <option value="Đang tiếp nhận" ${isReceiving ? 'selected' : ''}>📥 Đang tiếp nhận</option>
              <option value="Đang xử lý" ${isProcessing ? 'selected' : ''}>⚙️ Đang xử lý (Quét Content ID)</option>
              <option value="Đã gửi yêu cầu" ${isSubmitted ? 'selected' : ''}>📨 Đã gửi yêu cầu (Đã khiếu nại DSP)</option>
              <option value="Đã xử lý" ${isResolved ? 'selected' : ''}>✅ Đã xử lý (Gỡ bài / Thu hồi thành công)</option>
              <option value="Từ chối" ${isRejected ? 'selected' : ''}>❌ Từ chối (Không đủ bằng chứng)</option>
            </select>
          </div>

          <div style="flex:2;min-width:280px;">
            <label style="font-size:11px;font-weight:bold;text-transform:uppercase;color:#2563eb;display:block;margin-bottom:4px;">Phản hồi gửi về Portal Nghệ sĩ:</label>
            <input class="copyright-admin-notes" value="${esc(req.admin_notes || '')}" placeholder="Ví dụ: Đã gửi strike takedown YouTube, video đã bị hạ..." style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:4px;">
          </div>

          <div style="display:flex;gap:8px;">
            <button class="button" type="button" data-save-copyright="${esc(req.id)}" style="padding:9px 16px;font-size:11px;">Lưu trạng thái</button>
            <button class="button alt remove" type="button" data-delete-copyright="${esc(req.id)}" style="padding:9px 12px;font-size:11px;">✕ Xóa</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  copyrightBox.querySelectorAll('[data-save-copyright]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.saveCopyright;
      const card = e.target.closest('[data-copyright-id]');
      const status = card?.querySelector('.copyright-status-select')?.value;
      const admin_notes = card?.querySelector('.copyright-admin-notes')?.value.trim() || '';

      btn.disabled = true; btn.textContent = 'Đang lưu...';

      if (isSupabaseConfigured()) {
        await supabase.from('copyright_reports').update({ status, admin_notes }).eq('id', id);
      }

      try {
        const cached = JSON.parse(localStorage.getItem('uniflows-copyright-reports') || '[]');
        const idx = cached.findIndex(x => x.id === id);
        if (idx >= 0) {
          cached[idx].status = status;
          cached[idx].admin_notes = admin_notes;
          localStorage.setItem('uniflows-copyright-reports', JSON.stringify(cached));
        }
      } catch {}

      btn.disabled = false; btn.textContent = 'Lưu trạng thái';
      showNotice(`✓ Đã cập nhật trạng thái báo cáo bản quyền: "${status}"`);
      loadAdminCopyrightReports();
    });
  });

  copyrightBox.querySelectorAll('[data-delete-copyright]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('Xóa báo cáo bản quyền này?')) return;
      const id = e.target.dataset.deleteCopyright;
      if (isSupabaseConfigured()) {
        await supabase.from('copyright_reports').delete().eq('id', id);
      }
      try {
        const cached = JSON.parse(localStorage.getItem('uniflows-copyright-reports') || '[]');
        localStorage.setItem('uniflows-copyright-reports', JSON.stringify(cached.filter(x => x.id !== id)));
      } catch {}
      showNotice('✓ Đã xóa báo cáo!');
      loadAdminCopyrightReports();
    });
  });
}

// Greenlist Management (Admin)
async function loadAdminGreenlistRequests() {
  if (!greenlistBox) return;

  let list = [];
  try {
    list = JSON.parse(localStorage.getItem('uniflows-greenlist-requests') || '[]');
  } catch {}

  if (isSupabaseConfigured()) {
    try {
      const { data: dbList, error } = await supabase.from('greenlist_requests').select('*').order('created_at', { ascending: false });
      if (!error && dbList) {
        list = dbList;
        localStorage.setItem('uniflows-greenlist-requests', JSON.stringify(list));
      }
    } catch {}
  }

  if (list.length === 0) {
    greenlistBox.innerHTML = '<p class="empty" style="padding:15px;background:#fff;border:1px solid var(--line);">Chưa có yêu cầu cấp quyền Green-list nào.</p>';
    return;
  }

  greenlistBox.innerHTML = list.map(req => {
    const st = req.status || 'Đang tiếp nhận';
    const dateStr = req.created_at ? new Date(req.created_at).toLocaleString('vi-VN') : 'Mới';
    const isReceiving = st === 'Đang tiếp nhận';
    const isApproved = st === '🟢 Đã cấp quyền (Whitelisted)' || st === 'Đã cấp quyền';
    const isRevoked = st === '🔴 Đã thu hồi quyền' || st === 'Đã thu hồi';

    return `
      <div class="item-editor" data-greenlist-id="${esc(req.id)}" style="background:#fff;border:1px solid var(--ink);padding:18px;margin-bottom:14px;border-radius:8px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;border-bottom:1px solid var(--line);padding-bottom:10px;">
          <div>
            <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:bold;background:#dcfce7;color:#15803d;">
              🟢 ${esc(st)}
            </span>
            <strong style="font-size:16px;margin-left:8px;color:#111;">${esc(req.channel_id || req.title)} (${esc(req.platform)})</strong>
          </div>
          <span style="font-size:12px;opacity:0.7;">Gửi lúc: ${esc(dateStr)}</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:12px 0;font-size:13px;background:#f9f9f9;padding:12px;border:1px solid #eee;border-radius:6px;">
          <div>
            <span style="font-size:11px;opacity:0.6;text-transform:uppercase;display:block;">Nghệ sĩ yêu cầu:</span>
            <strong>${esc(req.artist_name || req.artist_id || 'Nghệ sĩ')}</strong>
          </div>
          <div>
            <span style="font-size:11px;opacity:0.6;text-transform:uppercase;display:block;">Phạm vi cấp quyền:</span>
            <b>${esc(req.track_scope || 'Toàn bộ bài hát')}</b>
          </div>
          <div>
            <span style="font-size:11px;opacity:0.6;text-transform:uppercase;display:block;">Mục đích / Đối tác:</span>
            <b>${esc(req.purpose || 'Kênh cá nhân / Đối tác')}</b>
          </div>
        </div>

        <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;border-top:1px solid #f1f5f9;padding-top:12px;">
          <div style="flex:1;min-width:240px;">
            <label style="font-size:11px;font-weight:bold;text-transform:uppercase;display:block;margin-bottom:4px;">Trạng thái Whitelist:</label>
            <select class="greenlist-status-select" style="width:100%;padding:8px;border:1px solid var(--ink);font-weight:bold;background:#fff;border-radius:4px;">
              <option value="Đang tiếp nhận" ${isReceiving ? 'selected' : ''}>📥 Đang tiếp nhận</option>
              <option value="🟢 Đã cấp quyền (Whitelisted)" ${isApproved ? 'selected' : ''}>🟢 Đã cấp quyền (Whitelisted)</option>
              <option value="🔴 Đã thu hồi quyền" ${isRevoked ? 'selected' : ''}>🔴 Đã thu hồi quyền</option>
            </select>
          </div>

          <div style="flex:2;min-width:280px;">
            <label style="font-size:11px;font-weight:bold;text-transform:uppercase;color:#16a34a;display:block;margin-bottom:4px;">Phản hồi gửi về Nghệ sĩ:</label>
            <input class="greenlist-admin-notes" value="${esc(req.admin_notes || '')}" placeholder="Ví dụ: Kênh đã được đưa vào whitelist Content ID..." style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:4px;">
          </div>

          <div style="display:flex;gap:8px;">
            <button class="button" type="button" data-save-greenlist="${esc(req.id)}" style="padding:9px 16px;font-size:11px;background:#16a34a;border-color:#16a34a;">Lưu cập nhật</button>
            <button class="button alt remove" type="button" data-delete-greenlist="${esc(req.id)}" style="padding:9px 12px;font-size:11px;">✕ Xóa</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  greenlistBox.querySelectorAll('[data-save-greenlist]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.saveGreenlist;
      const card = e.target.closest('[data-greenlist-id]');
      const status = card?.querySelector('.greenlist-status-select')?.value;
      const admin_notes = card?.querySelector('.greenlist-admin-notes')?.value.trim() || '';

      btn.disabled = true; btn.textContent = 'Đang lưu...';

      if (isSupabaseConfigured()) {
        await supabase.from('greenlist_requests').update({ status, admin_notes }).eq('id', id);
      }

      try {
        const cached = JSON.parse(localStorage.getItem('uniflows-greenlist-requests') || '[]');
        const idx = cached.findIndex(x => x.id === id);
        if (idx >= 0) {
          cached[idx].status = status;
          cached[idx].admin_notes = admin_notes;
          localStorage.setItem('uniflows-greenlist-requests', JSON.stringify(cached));
        }
      } catch {}

      btn.disabled = false; btn.textContent = 'Lưu cập nhật';
      showNotice(`✓ Đã cập nhật trạng thái Green-list: "${status}"`);
      loadAdminGreenlistRequests();
    });
  });

  greenlistBox.querySelectorAll('[data-delete-greenlist]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('Xóa yêu cầu Green-list này?')) return;
      const id = e.target.dataset.deleteGreenlist;
      if (isSupabaseConfigured()) {
        await supabase.from('greenlist_requests').delete().eq('id', id);
      }
      try {
        const cached = JSON.parse(localStorage.getItem('uniflows-greenlist-requests') || '[]');
        localStorage.setItem('uniflows-greenlist-requests', JSON.stringify(cached.filter(x => x.id !== id)));
      } catch {}
      showNotice('✓ Đã xóa yêu cầu Green-list!');
      loadAdminGreenlistRequests();
    });
  });
}

document.querySelector('#admin-refresh-copyright-btn')?.addEventListener('click', () => loadAdminCopyrightReports());
document.querySelector('#admin-refresh-greenlist-btn')?.addEventListener('click', () => loadAdminGreenlistRequests());

// ----------------------------------------------------
// RELEASE REVIEWER & SMARTLINK MANAGER (WITH DIRECT ARTWORK URL)
// ----------------------------------------------------
async function loadReleasesQueue() {
  if (!releasesBox) return;

  if (isSupabaseConfigured()) {
    try {
      const { data: dbReleases, error } = await supabase
        .from('releases')
        .select('*, artists(name)')
        .order('created_at', { ascending: false });

      if (!error && dbReleases) {
        releases = dbReleases;
        renderDashboard();
        renderPitchingBoard();
      }
    } catch (e) {
      console.warn('Lỗi tải queue từ Supabase:', e);
    }
  }

  // Filter Releases by Status and Artist
  const filterVal = document.querySelector('#admin-release-filter')?.value || 'all';
  const artistFilterVal = document.querySelector('#admin-release-artist-filter')?.value || 'all';
  let filtered = releases;

  if (artistFilterVal !== 'all') {
    filtered = filtered.filter(r => r.artist_id === artistFilterVal);
  }

  if (filterVal === 'pending') {
    filtered = filtered.filter(r => r.submission_status && r.submission_status.includes('chờ'));
  } else if (filterVal === 'live') {
    filtered = filtered.filter(r => !r.submission_status || r.submission_status === 'Đã phát hành');
  } else if (filterVal === 'takedown') {
    filtered = filtered.filter(r => r.submission_status && r.submission_status.includes('gỡ'));
  }

  if (filtered.length === 0) {
    releasesBox.innerHTML = '<p class="empty" style="padding:15px;background:#fff;border:1px solid var(--line);">Không tìm thấy bản phát hành nào theo bộ lọc này.</p>';
    return;
  }

  releasesBox.innerHTML = filtered.map(r => {
    const artistName = r.artists?.name || data.artists.find(a => a.id === r.artist_id)?.name || r.artist_id || 'Nghệ sĩ';
    const status = r.submission_status || 'Đã phát hành';
    const links = r.links || {};
    const meta = (typeof r.metadata === 'object' && r.metadata) ? r.metadata : {};
    const releaseSlug = r.slug || slug(r.title);
    const artworkPreview = r.artwork_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80';

    return `
      <div class="item-editor" data-release-id="${esc(r.id)}" style="background:#fff;border:1px solid var(--ink);padding:20px;margin-bottom:15px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;border-bottom:1px solid var(--line);padding-bottom:12px;">
          <div style="display:flex;gap:14px;align-items:center;">
            <img class="rel-thumb-preview" src="${esc(artworkPreview)}" alt="Artwork" style="width:60px;height:60px;object-fit:cover;border:1px solid var(--ink);border-radius:3px;">
            <div>
              <span class="eyebrow">${esc(artistName)} · ${esc(r.type || 'Single')}</span>
              <h3 style="margin:4px 0 0;font-size:20px;">${esc(r.title)}</h3>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button type="button" class="button alt view-admin-epk-btn" data-epk-id="${esc(r.id)}" style="padding:6px 12px;font-size:11px;background:#f8fafc;border-color:var(--ink);font-weight:bold;">📄 Xem EPK</button>
            <a class="button alt" href="${window.location.hostname.includes('uniflowslabel.com') ? window.location.protocol + '//uniflowslabel.com/listen?release=' + encodeURIComponent(releaseSlug) : '/listen?release=' + encodeURIComponent(releaseSlug)}" target="_blank" style="padding:6px 12px;font-size:11px;">SmartLink ↗</a>
            <button class="button alt remove" type="button" data-delete-release="${esc(r.id)}" style="padding:6px 10px;font-size:11px;">✕ Xóa</button>
          </div>
        </div>

        <!-- 00: PRE-CLEARANCE CONTENT ID & COPYRIGHT CHECK -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin:12px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="background:#ecfdf5;border:1px solid #a7f3d0;color:#047857;font-size:11px;font-weight:bold;padding:3px 8px;border-radius:4px;">
              🛡️ CONTENT ID PRE-CLEARANCE: CLEAN (100% SẠCH)
            </span>
            <small style="color:#64748b;font-size:11px;">Quét dấu vân tay âm thanh Audio Fingerprint · Không phát hiện sample trùng lặp vi phạm</small>
          </div>
          <span style="font-size:11px;font-family:'DM Mono',monospace;color:#0284c7;background:#e0f2fe;padding:2px 6px;border-radius:3px;">
            ${meta.syncLicensingConsent ? '🎬 Đã bật Sync Licensing' : 'Sync: Tắt'}
          </span>
        </div>

        <!-- 01: WAVEFORM A&R AUDIO PLAYER & TIMED FEEDBACK -->
        <div style="background:#0f172a;border-radius:8px;padding:16px;margin:12px 0;color:#fff;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:18px;">🎧</span>
              <div>
                <strong style="font-size:13px;display:block;color:#f8fafc;">Waveform A&R Review & Góp ý Demo</strong>
                <small style="color:#94a3b8;font-size:11px;">Nghe thử Master Audio trực tiếp và để lại góp ý theo mốc thời gian (timestamp)</small>
              </div>
            </div>
            ${r.audio_url ? `<audio controls src="${esc(r.audio_url)}" style="height:32px;max-width:280px;"></audio>` : '<small style="color:#f87171;">Chưa có file Audio Master</small>'}
          </div>

          <div style="display:grid;gap:8px;margin-top:12px;">
            <label style="font-size:11px;color:#94a3b8;font-weight:bold;text-transform:uppercase;">Ghi chú & Phản hồi A&R gửi nghệ sĩ (Nghệ sĩ sẽ thấy trong Portal):</label>
            <textarea class="rel-ar-feedback" rows="2" placeholder="Ví dụ: [01:15] Đoạn điệp khúc vocal cần mix sáng hơn. [02:30] Giảm bass outro để tránh vỡ tiếng..." style="background:#1e293b;border:1px solid #334155;color:#f8fafc;padding:8px;font-size:12px;border-radius:4px;">${esc(meta.arFeedback || '')}</textarea>
          </div>
        </div>

        <!-- Direct Artwork URL & Audio Controls (Upload OR Paste Link) -->
        <div class="mini-grid" style="margin:12px 0;">
          <div class="field">
            <label style="font-weight:bold;">Ảnh bìa Artwork (Dán Link hoặc Tải ảnh từ máy)</label>
            <input class="rel-artwork-url" value="${esc(r.artwork_url || '')}" placeholder="https://...">
            <div style="margin-top:6px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <input type="file" accept="image/*" class="rel-artwork-file-input" style="font-size:11px;">
              <span class="rel-artwork-status" style="font-size:11px;color:#008800;"></span>
            </div>
          </div>

          <div class="field">
            <label style="font-weight:bold;">Master Audio (Dán Link Drive hoặc Tải file từ máy)</label>
            <input class="rel-audio-url" value="${esc(r.audio_url || '')}" placeholder="https://drive.google.com/...">
            <div style="margin-top:6px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <input type="file" accept="audio/*" class="rel-audio-file-input" style="font-size:11px;">
              <span class="rel-audio-status" style="font-size:11px;color:#008800;"></span>
            </div>
          </div>
        </div>

        <!-- Audio Preview & Shortlink Settings -->
        <div style="background:#f1f5f9;border:1px solid #cbd5e1;padding:12px 14px;border-radius:6px;margin:12px 0;">
          <h4 style="margin:0 0 8px;font-size:12px;text-transform:uppercase;color:#0f172a;font-weight:800;">🎛️ Cài Đặt Audio Preview & Đường Dẫn Rút Gọn (ShortLink)</h4>
          
          <div class="mini-grid" style="margin-bottom:6px;">
            <div class="field">
              <label style="font-size:11px;font-weight:bold;">Chế độ Nghe Thử trên SmartLink (Audio Preview):</label>
              <select class="rel-preview-mode" style="padding:6px;font-size:12px;border:1px solid var(--ink);background:#fff;width:100%;">
                <option value="none" ${meta.previewMode === 'none' ? 'selected' : ''}>🚫 Tắt (Không cho nghe trước / Ẩn player)</option>
                <option value="custom" ${(!meta.previewMode || meta.previewMode === 'custom') ? 'selected' : ''}>⏱️ Đoạn trích hay nhất (Snippet Preview)</option>
                <option value="full" ${meta.previewMode === 'full' ? 'selected' : ''}>🎵 Cho nghe toàn bộ bài hát</option>
              </select>
            </div>

            <div class="field">
              <label style="font-size:11px;font-weight:bold;">Giây bắt đầu (Start Time):</label>
              <input type="number" min="0" class="rel-preview-start" value="${meta.previewStart !== undefined ? meta.previewStart : 30}" placeholder="30 (giây)">
            </div>

            <div class="field">
              <label style="font-size:11px;font-weight:bold;">Thời lượng nghe thử (Duration):</label>
              <input type="number" min="5" max="180" class="rel-preview-duration" value="${meta.previewDuration !== undefined ? meta.previewDuration : 30}" placeholder="30 (giây)">
            </div>

            <div class="field">
              <label style="font-size:11px;font-weight:bold;">Slug Rút Gọn (Shortlink Slug):</label>
              <div style="display:flex;align-items:center;gap:4px;">
                <span style="font-family:'DM Mono',monospace;font-size:11px;color:#64748b;">/l/</span>
                <input class="rel-slug-input" value="${esc(r.slug || releaseSlug)}" placeholder="ten-bai-hat" style="flex:1;padding:6px;border:1px solid var(--ink);background:#fff;font-size:12px;">
              </div>
            </div>
          </div>
        </div>

        <!-- Links to Streaming Platforms -->
        <div style="background:#f8fafc;border:1px solid #cbd5e1;padding:12px 14px;border-radius:6px;margin:12px 0;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
            <h4 style="margin:0;font-size:12px;text-transform:uppercase;color:#0f172a;font-weight:800;">🔗 Link Nền tảng Streaming (Dành cho SmartLink)</h4>
            <div style="display:flex;gap:6px;">
              <a href="/listen?release=${encodeURIComponent(releaseSlug)}" target="_blank" class="button alt" style="padding:4px 8px;font-size:11px;background:#fff;border-color:var(--ink);">👁 Xem SmartLink ↗</a>
              <button type="button" class="button alt add-custom-platform-btn" style="padding:4px 10px;font-size:11px;font-weight:bold;background:#fff;border:1px solid #0f172a;">+ Thêm Nền Tảng Khác</button>
            </div>
          </div>
          
          <div class="mini-grid" style="margin-bottom:10px;">
            <div class="field"><label style="font-size:11px;">🟢 Spotify URL</label><input class="rel-link-spotify" value="${esc(links.spotify || '')}" placeholder="https://open.spotify.com/track/..."></div>
            <div class="field"><label style="font-size:11px;">🔴 Apple Music URL</label><input class="rel-link-apple" value="${esc(links.apple || links.applemusic || '')}" placeholder="https://music.apple.com/album/..."></div>
            <div class="field"><label style="font-size:11px;">▶️ YouTube Music URL</label><input class="rel-link-youtube" value="${esc(links.youtube || links.youtubemusic || '')}" placeholder="https://music.youtube.com/watch?v=..."></div>
            <div class="field"><label style="font-size:11px;">🟠 SoundCloud URL</label><input class="rel-link-soundcloud" value="${esc(links.soundcloud || '')}" placeholder="https://soundcloud.com/..."></div>
            <div class="field"><label style="font-size:11px;">🟣 Zing MP3 URL</label><input class="rel-link-zing" value="${esc(links.zingmp3 || links.zing || '')}" placeholder="https://zingmp3.vn/bai-hat/..."></div>
            <div class="field"><label style="font-size:11px;">🟢 Nhaccuatui (NCT) URL</label><input class="rel-link-nct" value="${esc(links.nct || '')}" placeholder="https://www.nhaccuatui.com/bai-hat/..."></div>
            <div class="field"><label style="font-size:11px;">🎵 TikTok Sound URL</label><input class="rel-link-tiktok" value="${esc(links.tiktok || '')}" placeholder="https://www.tiktok.com/music/..."></div>
            <div class="field"><label style="font-size:11px;">📦 Amazon Music URL</label><input class="rel-link-amazon" value="${esc(links.amazon || links.amazonmusic || '')}" placeholder="https://music.amazon.com/..."></div>
          </div>

          <div class="custom-platforms-container" style="border-top:1px dashed #cbd5e1;padding-top:8px;">
            <strong style="display:block;font-size:11px;color:#475569;margin-bottom:6px;text-transform:uppercase;">Nền tảng Tuỳ Chọn Khác (Deezer, Tidal, Bandcamp, Audiomack, Beatport, v.v.):</strong>
            <div class="custom-platforms-list">
              ${renderCustomPlatformsList(links.customPlatforms || [])}
            </div>
          </div>
        </div>

        <!-- Lyrics & Publishing View -->
        ${(meta.lyricsText || meta.lyricsLrc) ? `
        <div style="background:#fefce8;border:1px solid #fef08a;padding:12px;border-radius:6px;margin:12px 0;">
          <h4 style="margin:0 0 6px;font-size:12px;text-transform:uppercase;color:#854d0e;">📝 Lời bài hát & LRC đã nộp</h4>
          <div style="max-height:100px;overflow-y:auto;font-size:11px;color:#713f12;background:#fff;padding:8px;border:1px solid #fde047;border-radius:4px;white-space:pre-wrap;">${esc(meta.lyricsLrc || meta.lyricsText)}</div>
        </div>
        ` : ''}

        <!-- Financial Statement & Playlists for this track -->
        <h4 style="margin:12px 0 6px;font-size:12px;text-transform:uppercase;color:#555;">📈 Số liệu bài hát & Editorial Playlists</h4>
        <div class="mini-grid">
          <div class="field"><label>Lượt Streams bài này</label><input class="rel-streams" value="${esc(meta.streams || '0')}" placeholder="Ví dụ: 50000"></div>
          <div class="field"><label>Doanh thu bài này (₫)</label><input class="rel-revenue" value="${esc(meta.revenue || '0')}" placeholder="Ví dụ: 10000000"></div>
          <div class="field" style="grid-column:1/-1;">
            <label>Editorial Playlists (Phân cách bằng dấu phẩy)</label>
            <input class="rel-playlists" value="${esc(Array.isArray(meta.playlists) ? meta.playlists.join(', ') : '')}" placeholder="Ví dụ: V-Pop Không Thể Thiếu, Radar Vietnam, New Music Friday">
          </div>
        </div>

        <!-- Royalty Splits Section -->
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:14px;margin:14px 0;border-radius:4px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
            <div>
              <h4 style="margin:0;font-size:12px;text-transform:uppercase;color:#166534;">🤝 Phân chia Doanh thu & Tác quyền (Royalty Splits)</h4>
              <p style="margin:2px 0 0;font-size:11px;color:#15803d;">Cài đặt % chia doanh thu cho các nghệ sĩ tham gia (Collab) hoặc đối tác (Partner). Tài khoản được gán sẽ chỉ xem stats bài này theo đúng %.</p>
            </div>
            <button type="button" class="button alt add-split-btn" style="padding:4px 10px;font-size:11px;background:#fff;border:1px solid #166534;color:#166534;font-weight:bold;">+ Thêm đối tác / Collab</button>
          </div>
          <div class="splits-container" style="display:grid;gap:8px;">
            ${renderSplitsList(r, meta.splits || [])}
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:15px;border-top:1px solid var(--line);padding-top:12px;flex-wrap:wrap;gap:12px;">
          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:6px;">
              <label style="font-size:12px;font-weight:bold;text-transform:uppercase;">Trạng thái:</label>
              <select class="rel-status-select" style="padding:8px 10px;border:1px solid var(--ink);font-weight:bold;background:#fff;border-radius:4px;">
                <option value="Đang chờ UniFLOWs duyệt" ${status === 'Đang chờ UniFLOWs duyệt' ? 'selected' : ''}>⏳ Đang chờ UniFLOWs duyệt</option>
                <option value="Đã phát hành" ${status === 'Đã phát hành' ? 'selected' : ''}>🟢 Đã phát hành (Live)</option>
                <option value="Yêu cầu chỉnh sửa" ${status === 'Yêu cầu chỉnh sửa' ? 'selected' : ''}>⚠️ Yêu cầu chỉnh sửa (A&R Revision)</option>
                <option value="Từ chối duyệt" ${status === 'Từ chối duyệt' ? 'selected' : ''}>❌ Từ chối duyệt (Rejected)</option>
                <option value="Yêu cầu gỡ / xóa bản phát hành" ${status === 'Yêu cầu gỡ / xóa bản phát hành' ? 'selected' : ''}>🔴 Yêu cầu gỡ / xóa</option>
              </select>
            </div>

            <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:bold;cursor:pointer;background:#f0fdf4;padding:6px 10px;border:1px solid #86efac;border-radius:4px;">
              <input type="checkbox" class="rel-show-on-web" ${(meta.showOnWeb !== false && r.show_on_web !== false) ? 'checked' : ''} style="cursor:pointer;">
              <span>🌐 Hiển thị trên Website (Trang chủ & Danh mục)</span>
            </label>
          </div>

          <button class="button" type="button" data-save-release="${esc(r.id)}" style="padding:10px 20px;font-weight:bold;background:#000;color:#fff;">Lưu bản phát hành</button>
        </div>
      </div>
    `;
  }).join('');

  // Helper to render custom platforms
  function renderCustomPlatformsList(customList = []) {
    if (!Array.isArray(customList) || customList.length === 0) {
      return `<p class="no-custom-platforms" style="font-size:11px;color:#888;margin:4px 0;">Chưa có nền tảng tuỳ chọn nào. Bấm "+ Thêm Nền Tảng Khác" để bổ sung.</p>`;
    }
    return customList.map((cp) => `
      <div class="custom-platform-row" style="display:grid;grid-template-columns:1.5fr 3fr auto;gap:8px;align-items:center;margin-bottom:6px;">
        <input type="text" class="custom-plat-name" value="${esc(cp.name || '')}" placeholder="Tên Nền Tảng (VD: Tidal, Bandcamp...)" style="padding:6px 8px;font-size:11px;border:1px solid var(--ink);background:#fff;">
        <input type="text" class="custom-plat-url" value="${esc(cp.url || '')}" placeholder="https://..." style="padding:6px 8px;font-size:11px;border:1px solid var(--ink);background:#fff;">
        <button type="button" class="button alt remove-custom-plat-btn" style="padding:6px 10px;font-size:11px;color:#dc2626;border:1px solid #fca5a5;">✕</button>
      </div>
    `).join('');
  }

  // Helper to render splits list
  function renderSplitsList(releaseItem, splitsList = []) {
    if (!Array.isArray(splitsList) || splitsList.length === 0) {
      const mainA = data.artists.find(a => a.id === releaseItem.artist_id);
      splitsList = [
        {
          artistId: releaseItem.artist_id,
          artistName: mainA?.name || releaseItem.artist_id,
          percentage: 100,
          role: 'Nghệ sĩ chính (Main Artist)'
        }
      ];
    }

    return splitsList.map((s) => `
      <div class="split-row" style="display:grid;grid-template-columns:2fr 1fr 1.5fr auto;gap:8px;align-items:center;background:#fff;padding:8px 10px;border:1px solid #cbd5e1;border-radius:3px;">
        <div>
          <label style="font-size:10px;font-weight:bold;color:#475569;display:block;margin-bottom:2px;">Nghệ sĩ / Đối tác nhận tiền</label>
          <select class="split-artist-select" style="width:100%;padding:6px;font-size:12px;border:1px solid var(--ink);background:#fff;">
            <option value="">-- Chọn tài khoản --</option>
            ${data.artists.map(a => `<option value="${esc(a.id)}" ${a.id === s.artistId ? 'selected' : ''}>${esc(a.name)} (${esc(a.id)})</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:10px;font-weight:bold;color:#475569;display:block;margin-bottom:2px;">Tỷ lệ Split (%)</label>
          <input type="number" min="0" max="100" class="split-percent-input" value="${s.percentage !== undefined ? s.percentage : 0}" style="width:100%;padding:6px;font-size:12px;border:1px solid var(--ink);" placeholder="%">
        </div>
        <div>
          <label style="font-size:10px;font-weight:bold;color:#475569;display:block;margin-bottom:2px;">Vai trò tham gia</label>
          <input class="split-role-input" value="${esc(s.role || 'Collab / Feature')}" style="width:100%;padding:6px;font-size:12px;border:1px solid var(--ink);" placeholder="vd: Feat, Producer, Partner">
        </div>
        <div style="padding-top:16px;">
          <button type="button" class="button alt remove-split-row-btn" style="padding:6px 10px;font-size:11px;color:#dc2626;border:1px solid #fca5a5;">✕</button>
        </div>
      </div>
    `).join('');
  }

  // Attach add split row handlers
  releasesBox.querySelectorAll('.add-split-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('[data-release-id]');
      const container = card?.querySelector('.splits-container');
      if (!container) return;

      const newRow = document.createElement('div');
      newRow.className = 'split-row';
      newRow.style = 'display:grid;grid-template-columns:2fr 1fr 1.5fr auto;gap:8px;align-items:center;background:#fff;padding:8px 10px;border:1px solid #cbd5e1;border-radius:3px;';
      newRow.innerHTML = `
        <div>
          <label style="font-size:10px;font-weight:bold;color:#475569;display:block;margin-bottom:2px;">Nghệ sĩ / Đối tác nhận tiền</label>
          <select class="split-artist-select" style="width:100%;padding:6px;font-size:12px;border:1px solid var(--ink);background:#fff;">
            <option value="">-- Chọn tài khoản --</option>
            ${data.artists.map(a => `<option value="${esc(a.id)}">${esc(a.name)} (${esc(a.id)})</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:10px;font-weight:bold;color:#475569;display:block;margin-bottom:2px;">Tỷ lệ Split (%)</label>
          <input type="number" min="0" max="100" class="split-percent-input" value="20" style="width:100%;padding:6px;font-size:12px;border:1px solid var(--ink);" placeholder="%">
        </div>
        <div>
          <label style="font-size:10px;font-weight:bold;color:#475569;display:block;margin-bottom:2px;">Vai trò tham gia</label>
          <input class="split-role-input" value="Collab / Feature" style="width:100%;padding:6px;font-size:12px;border:1px solid var(--ink);" placeholder="vd: Feat, Producer, Partner">
        </div>
        <div style="padding-top:16px;">
          <button type="button" class="button alt remove-split-row-btn" style="padding:6px 10px;font-size:11px;color:#dc2626;border:1px solid #fca5a5;">✕</button>
        </div>
      `;
      newRow.querySelector('.remove-split-row-btn').onclick = () => newRow.remove();
      container.appendChild(newRow);
    });
  });

  // Attach Add & Remove Custom Platform handlers
  releasesBox.querySelectorAll('.add-custom-platform-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('[data-release-id]');
      const list = card?.querySelector('.custom-platforms-list');
      if (!list) return;

      const noMsg = list.querySelector('.no-custom-platforms');
      if (noMsg) noMsg.remove();

      const row = document.createElement('div');
      row.className = 'custom-platform-row';
      row.style = 'display:grid;grid-template-columns:1.5fr 3fr auto;gap:8px;align-items:center;margin-bottom:6px;';
      row.innerHTML = `
        <input type="text" class="custom-plat-name" placeholder="Tên Nền Tảng (VD: Tidal, Deezer...)" style="padding:6px 8px;font-size:11px;border:1px solid var(--ink);background:#fff;">
        <input type="text" class="custom-plat-url" placeholder="https://..." style="padding:6px 8px;font-size:11px;border:1px solid var(--ink);background:#fff;">
        <button type="button" class="button alt remove-custom-plat-btn" style="padding:6px 10px;font-size:11px;color:#dc2626;border:1px solid #fca5a5;">✕</button>
      `;
      row.querySelector('.remove-custom-plat-btn').onclick = () => row.remove();
      list.appendChild(row);
    });
  });

  releasesBox.querySelectorAll('.remove-custom-plat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.custom-platform-row')?.remove();
    });
  });

  // Attach Artwork & Audio file upload handlers
  releasesBox.querySelectorAll('.rel-artwork-file-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const card = e.target.closest('[data-release-id]');
      const urlInput = card?.querySelector('.rel-artwork-url');
      const statusEl = card?.querySelector('.rel-artwork-status');
      const previewEl = card?.querySelector('.rel-thumb-preview');

      if (statusEl) statusEl.textContent = 'Đang tải ảnh lên...';
      try {
        const publicUrl = await uploadArtworkFile(file, `release_art_${Date.now()}`);
        if (urlInput) urlInput.value = publicUrl;
        if (previewEl) previewEl.src = publicUrl;
        if (statusEl) statusEl.textContent = '✓ Đã tải ảnh thành công!';
      } catch (err) {
        if (statusEl) statusEl.textContent = `Lỗi: ${err.message}`;
      }
    });
  });

  releasesBox.querySelectorAll('.rel-audio-file-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const card = e.target.closest('[data-release-id]');
      const urlInput = card?.querySelector('.rel-audio-url');
      const statusEl = card?.querySelector('.rel-audio-status');

      if (statusEl) statusEl.textContent = 'Đang tải audio lên...';
      try {
        const publicUrl = await uploadAudioFile(file, `release_audio_${Date.now()}`);
        if (urlInput) urlInput.value = publicUrl;
        if (statusEl) statusEl.textContent = '✓ Đã tải audio thành công!';
      } catch (err) {
        if (statusEl) statusEl.textContent = `Lỗi: ${err.message}`;
      }
    });
  });

  // Attach Save Release events
  releasesBox.querySelectorAll('[data-save-release]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const relId = e.target.dataset.saveRelease;
      const card = e.target.closest('[data-release-id]');
      if (!card) return;

      const artwork_url = card.querySelector('.rel-artwork-url')?.value.trim();
      const audio_url = card.querySelector('.rel-audio-url')?.value.trim();
      const status = card.querySelector('.rel-status-select')?.value;
      const streams = card.querySelector('.rel-streams')?.value.trim() || '0';
      const revenue = card.querySelector('.rel-revenue')?.value.trim() || '0';
      const rawPlaylists = card.querySelector('.rel-playlists')?.value.trim() || '';
      const playlists = rawPlaylists.split(',').map(s => s.trim()).filter(Boolean);

      const arFeedback = card.querySelector('.rel-ar-feedback')?.value.trim() || '';

      // Read Custom Platforms
      const customPlatforms = [];
      card.querySelectorAll('.custom-platform-row').forEach(row => {
        const name = row.querySelector('.custom-plat-name')?.value.trim();
        const url = row.querySelector('.custom-plat-url')?.value.trim();
        if (name && url) {
          customPlatforms.push({ name, url });
        }
      });

      const links = {
        spotify: card.querySelector('.rel-link-spotify')?.value.trim() || '',
        apple: card.querySelector('.rel-link-apple')?.value.trim() || '',
        youtube: card.querySelector('.rel-link-youtube')?.value.trim() || '',
        soundcloud: card.querySelector('.rel-link-soundcloud')?.value.trim() || '',
        zingmp3: card.querySelector('.rel-link-zing')?.value.trim() || '',
        nct: card.querySelector('.rel-link-nct')?.value.trim() || '',
        tiktok: card.querySelector('.rel-link-tiktok')?.value.trim() || '',
        amazon: card.querySelector('.rel-link-amazon')?.value.trim() || '',
        customPlatforms
      };

      // Read Splits
      const splits = [];
      card.querySelectorAll('.split-row').forEach(row => {
        const sel = row.querySelector('.split-artist-select');
        const artistId = sel?.value;
        const artistName = sel?.selectedOptions[0]?.text?.split(' (')[0] || artistId;
        const percentage = parseFloat(row.querySelector('.split-percent-input')?.value) || 0;
        const role = row.querySelector('.split-role-input')?.value.trim() || 'Collab';
        if (artistId && percentage > 0) {
          splits.push({ artistId, artistName, percentage, role });
        }
      });

      const previewMode = card.querySelector('.rel-preview-mode')?.value || 'custom';
      const previewStart = parseFloat(card.querySelector('.rel-preview-start')?.value) || 0;
      const previewDuration = parseFloat(card.querySelector('.rel-preview-duration')?.value) || 30;
      const customSlug = card.querySelector('.rel-slug-input')?.value.trim() || '';
      const showOnWeb = card.querySelector('.rel-show-on-web')?.checked ?? true;

      const targetRel = releases.find(r => r.id === relId);
      const existingMeta = (targetRel && typeof targetRel.metadata === 'object' && targetRel.metadata) ? targetRel.metadata : {};
      const updatedMetadata = { 
        ...existingMeta, 
        streams, 
        revenue, 
        playlists, 
        splits, 
        arFeedback, 
        previewMode, 
        previewStart, 
        previewDuration, 
        previewEnabled: (previewMode !== 'none'),
        showOnWeb
      };

      btn.disabled = true; btn.textContent = 'Đang lưu...';

      if (isSupabaseConfigured()) {
        const updatePayload = {
          artwork_url,
          audio_url,
          submission_status: status,
          links,
          metadata: updatedMetadata
        };
        if (customSlug) updatePayload.slug = customSlug;
        if (typeof showOnWeb === 'boolean') updatePayload.show_on_web = showOnWeb;

        const { error } = await supabase.from('releases').update(updatePayload).eq('id', relId);

        if (error) {
          alert('Lỗi cập nhật Supabase: ' + error.message);
          btn.disabled = false; btn.textContent = 'Lưu bản phát hành';
          return;
        }
      }

      // Notify artist of release status change with A&R feedback
      const relArtistId = targetRel?.artist_id;
      const relTitle = targetRel?.title || 'Bản phát hành';
      if (status === 'Đã phát hành') {
        await sendArtistNotification(
          relArtistId,
          '💿 Bản phát hành đã được duyệt',
          `Sản phẩm "${relTitle}" đã được duyệt phát hành và chính thức phân phối trên các nền tảng streaming!${arFeedback ? `\n\n💬 Ghi chú A&R: "${arFeedback}"` : ''}`,
          'release'
        );
      } else if (status === 'Yêu cầu chỉnh sửa' || (status && status.includes('chỉnh sửa'))) {
        await sendArtistNotification(
          relArtistId,
          '⚠️ Yêu cầu chỉnh sửa bản phát hành',
          `Bản phát hành "${relTitle}" cần chỉnh sửa lại theo góp ý của A&R:${arFeedback ? `\n\n💬 Lời nhắn từ A&R:\n"${arFeedback}"` : ' Vui lòng kiểm tra lại file Master hoặc Artwork.'}\n\nVui lòng vào mục Phát Hành trên Portal để cập nhật và gửi lại.`,
          'release'
        );
      } else if (status === 'Từ chối duyệt' || (status && status.includes('chối'))) {
        await sendArtistNotification(
          relArtistId,
          '❌ Bản phát hành chưa được phê duyệt',
          `Sản phẩm "${relTitle}" chưa được phê duyệt phát hành đợt này.${arFeedback ? `\n\n💬 Lý do từ A&R: "${arFeedback}"` : ''}`,
          'release'
        );
      } else if (status && status.includes('chờ')) {
        await sendArtistNotification(
          relArtistId,
          '⏳ Bản phát hành đang được A&R xử lý',
          `Sản phẩm "${relTitle}" đang được ban biên tập và A&R UniFLOWs xem xét đối soát Master.${arFeedback ? `\n\n💬 Ghi chú A&R: "${arFeedback}"` : ''}`,
          'release'
        );
      }

      btn.disabled = false; btn.textContent = 'Lưu bản phát hành';
      showNotice('✓ Đã cập nhật bản phát hành, góp ý A&R và SmartLink thành công!');
      loadReleasesQueue();
    });
  });

  // Attach EPK view events
  releasesBox.querySelectorAll('.view-admin-epk-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const relId = btn.dataset.epkId;
      openAdminEPK(relId);
    });
  });

  // Attach Delete Release events
  releasesBox.querySelectorAll('[data-delete-release]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('Bạn có chắc chắn muốn xóa bản phát hành này khỏi catalogue?')) return;
      const relId = e.target.dataset.deleteRelease;
      btn.disabled = true;
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('releases').delete().eq('id', relId);
        if (error) alert('Lỗi xóa Supabase: ' + error.message);
      }
      showNotice('✓ Đã xóa bản phát hành thành công!');
      loadReleasesQueue();
    });
  });
}

// ----------------------------------------------------
// EDITORIAL PITCHING & PLAYLIST KANBAN TRACKER
// ----------------------------------------------------
function renderPitchingBoard() {
  const colQueue = document.querySelector('#kanban-col-queue');
  const colSubmitted = document.querySelector('#kanban-col-submitted');
  const colPlaced = document.querySelector('#kanban-col-placed');
  const colPassed = document.querySelector('#kanban-col-passed');

  if (!colQueue || !colSubmitted || !colPlaced || !colPassed) return;

  const cols = {
    queue: [],
    submitted: [],
    placed: [],
    passed: []
  };

  releases.forEach(r => {
    const meta = (typeof r.metadata === 'object' && r.metadata) ? r.metadata : {};
    const status = meta.pitchingStatus || (r.submission_status === 'Đang chờ UniFLOWs duyệt' ? 'queue' : 'submitted');
    if (cols[status]) {
      cols[status].push(r);
    } else {
      cols.queue.push(r);
    }
  });

  // Update counts
  const setTxt = (id, txt) => {
    const el = document.querySelector(id);
    if (el) el.textContent = txt;
  };
  setTxt('#kanban-count-queue', cols.queue.length.toString());
  setTxt('#kanban-count-submitted', cols.submitted.length.toString());
  setTxt('#kanban-count-placed', cols.placed.length.toString());
  setTxt('#kanban-count-passed', cols.passed.length.toString());

  // Helper to render card
  const renderCard = (r, curStatus) => {
    const artistName = r.artists?.name || data.artists.find(a => a.id === r.artist_id)?.name || r.artist_id || 'Nghệ sĩ';
    const artwork = r.artwork_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=150&q=80';
    const meta = (typeof r.metadata === 'object' && r.metadata) ? r.metadata : {};
    const targetPlaylists = meta.pitchingPlaylists || (Array.isArray(meta.playlists) ? meta.playlists.join(', ') : 'Chưa gán playlist');

    return `
      <div class="pitch-card" data-rel-id="${esc(r.id)}" style="background:#fff;border:1px solid var(--ink);border-radius:8px;padding:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
          <img src="${esc(artwork)}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;border:1px solid #cbd5e1;">
          <div style="overflow:hidden;">
            <strong style="font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.title)}</strong>
            <small style="color:#64748b;font-size:11px;">${esc(artistName)}</small>
          </div>
        </div>
        
        <div style="background:#f1f5f9;border-radius:4px;padding:6px 8px;margin-bottom:8px;font-size:11px;color:#334155;">
          <b>🎯 Mục tiêu:</b> <span class="pitch-target-text">${esc(targetPlaylists)}</span>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;border-top:1px dashed #e2e8f0;padding-top:8px;">
          <select class="pitch-move-select" data-rel-id="${esc(r.id)}" style="font-size:11px;padding:4px 6px;border:1px solid var(--ink);background:#fff;border-radius:4px;">
            <option value="queue" ${curStatus === 'queue' ? 'selected' : ''}>⏳ Chờ Pitching</option>
            <option value="submitted" ${curStatus === 'submitted' ? 'selected' : ''}>🚀 Đang gửi</option>
            <option value="placed" ${curStatus === 'placed' ? 'selected' : ''}>🌟 Vào Playlist</option>
            <option value="passed" ${curStatus === 'passed' ? 'selected' : ''}>❌ Không chọn</option>
          </select>
          <button type="button" class="button alt pitch-edit-btn" data-rel-id="${esc(r.id)}" style="padding:4px 8px;font-size:10px;">Gán Playlist</button>
        </div>
      </div>
    `;
  };

  const renderCol = (el, list, statusKey) => {
    if (list.length === 0) {
      el.innerHTML = '<p class="empty" style="font-size:12px;padding:12px;background:#fff;border-radius:6px;">Không có bài nào.</p>';
    } else {
      el.innerHTML = list.map(r => renderCard(r, statusKey)).join('');
    }
  };

  renderCol(colQueue, cols.queue, 'queue');
  renderCol(colSubmitted, cols.submitted, 'submitted');
  renderCol(colPlaced, cols.placed, 'placed');
  renderCol(colPassed, cols.passed, 'passed');

  // Attach status change events
  document.querySelectorAll('.pitch-move-select').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const relId = e.target.dataset.relId;
      const newStatus = e.target.value;
      const targetRel = releases.find(r => r.id === relId);
      if (!targetRel) return;

      const meta = (typeof targetRel.metadata === 'object' && targetRel.metadata) ? targetRel.metadata : {};
      meta.pitchingStatus = newStatus;
      targetRel.metadata = meta;

      if (isSupabaseConfigured()) {
        await supabase.from('releases').update({ metadata: meta }).eq('id', relId);
      }
      showNotice(`✓ Đã chuyển trạng thái Pitching của "${targetRel.title}"!`);
      renderPitchingBoard();
    });
  });

  // Attach target playlist edit events
  document.querySelectorAll('.pitch-edit-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const relId = e.target.dataset.relId;
      const targetRel = releases.find(r => r.id === relId);
      if (!targetRel) return;

      const meta = (typeof targetRel.metadata === 'object' && targetRel.metadata) ? targetRel.metadata : {};
      const currentVal = meta.pitchingPlaylists || (Array.isArray(meta.playlists) ? meta.playlists.join(', ') : '');
      const newVal = prompt('Nhập danh sách Playlist mục tiêu (phân cách bằng dấu phẩy):', currentVal);
      
      if (newVal !== null) {
        meta.pitchingPlaylists = newVal.trim();
        targetRel.metadata = meta;
        if (isSupabaseConfigured()) {
          await supabase.from('releases').update({ metadata: meta }).eq('id', relId);
        }
        showNotice(`✓ Đã cập nhật Playlist mục tiêu cho "${targetRel.title}"!`);
        renderPitchingBoard();
      }
    });
  });
}

document.querySelector('#admin-release-filter')?.addEventListener('change', () => {
  loadReleasesQueue();
});

document.querySelector('#admin-release-artist-filter')?.addEventListener('change', () => {
  loadReleasesQueue();
});

document.querySelector('#admin-refresh-releases-btn')?.addEventListener('click', () => {
  loadReleasesQueue();
});

document.querySelector('#admin-payout-artist-filter')?.addEventListener('change', () => {
  loadPayoutRequests();
});

function populateArtistFilters() {
  const relArtistFilter = document.querySelector('#admin-release-artist-filter');
  const payArtistFilter = document.querySelector('#admin-payout-artist-filter');
  const currentRelVal = relArtistFilter?.value || 'all';
  const currentPayVal = payArtistFilter?.value || 'all';

  const optionsHtml = '<option value="all">Tất cả nghệ sĩ</option>' +
    (data.artists || []).map(a => `<option value="${esc(a.id)}">${esc(a.name)} (${esc(a.id)})</option>`).join('');

  if (relArtistFilter) {
    relArtistFilter.innerHTML = optionsHtml;
    relArtistFilter.value = currentRelVal;
  }
  if (payArtistFilter) {
    payArtistFilter.innerHTML = optionsHtml;
    payArtistFilter.value = currentPayVal;
  }
}

// ----------------------------------------------------
// MAIN RENDER & FORM SUBMISSION
// ----------------------------------------------------
function render() {
  ['tagline', 'heroText', 'aboutTitle', 'aboutText', 'city'].forEach(k => {
    if (form.elements[k]) form.elements[k].value = data[k] || '';
  });
  renderEmailsEditor(data.emails || defaultData.emails);
  renderAnnouncementsEditor(data.announcements || defaultData.announcements);
  populateArtistFilters();
  renderArtistSelector();
  renderSelectedArtistEditor();
  articlesBox.innerHTML = data.articles.map(articleEditor).join('');
  attachArticleUploadEvents();
  loadReleasesQueue();
  loadPayoutRequests();
  loadAdminCopyrightReports();
  loadAdminGreenlistRequests();
  renderDashboard();
  renderPitchingBoard();
  renderPublishingAdmin();
  renderUniHubeAdmin();
  renderCollective48kAdmin();
  renderMusicSubmissionsAdmin();
}

// ----------------------------------------------------
// DASHBOARD ANALYTICS & REVENUE SYNC
// ----------------------------------------------------
function parseNumber(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim().toUpperCase();
  if (str === '' || str === 'NULL' || str === 'UNDEFINED') return 0;
  if (str.endsWith('M')) {
    return Math.round(parseFloat(str.slice(0, -1).replace(/,/g, '.')) * 1000000) || 0;
  }
  if (str.endsWith('K')) {
    return Math.round(parseFloat(str.slice(0, -1).replace(/,/g, '.')) * 1000) || 0;
  }
  return parseInt(str.replace(/[^0-9]/g, ''), 10) || 0;
}

function renderDashboard() {
  const totalRevEl = document.querySelector('#admin-total-revenue');
  const totalStreamsEl = document.querySelector('#admin-total-streams');
  const totalLiveEl = document.querySelector('#admin-total-live-releases');
  const pendingRelEl = document.querySelector('#admin-pending-releases-count');
  const pendingPayoutsEl = document.querySelector('#admin-total-pending-payouts');
  const pendingPayoutsCountEl = document.querySelector('#admin-pending-payouts-count');
  const topArtistsList = document.querySelector('#admin-top-artists-list');
  
  if (!totalRevEl) return;
  
  let totalRev = 0;
  let totalStreams = 0;
  let spotifyRevTotal = 0;
  let spotifyStreamsTotal = 0;
  let appleRevTotal = 0;
  let appleStreamsTotal = 0;
  let youtubeRevTotal = 0;
  let youtubeStreamsTotal = 0;
  let otherRevTotal = 0;
  let otherStreamsTotal = 0;

  // 1. Calculate releases metrics
  const liveCount = releases.filter(r => !r.submission_status || r.submission_status === 'Đã phát hành').length;
  const pendingCount = releases.filter(r => r.submission_status && r.submission_status.includes('chờ')).length;

  if (totalLiveEl) totalLiveEl.textContent = liveCount.toString();
  if (pendingRelEl) pendingRelEl.textContent = `${pendingCount} bản phát hành chờ duyệt`;

  // 2. Calculate payouts metrics
  let pendingPayoutAmount = 0;
  let pendingPayoutCount = 0;
  (payoutRequests || []).forEach(req => {
    if (req.status === 'Đang chờ xem xét') {
      pendingPayoutCount++;
      pendingPayoutAmount += parseNumber(req.amount);
    }
  });

  if (pendingPayoutsEl) pendingPayoutsEl.textContent = `₫ ${pendingPayoutAmount.toLocaleString('vi-VN')}`;
  if (pendingPayoutsCountEl) pendingPayoutsCountEl.textContent = `${pendingPayoutCount} yêu cầu cần xử lý`;

  // 3. Process Artists Data & Sums
  const processedArtists = (data.artists || []).map(a => {
    const spRev = parseNumber(a.spotifyRevenue);
    const spStr = parseNumber(a.spotifyStreams);
    const apRev = parseNumber(a.appleRevenue);
    const apStr = parseNumber(a.appleStreams);
    const ytRev = parseNumber(a.youtubeRevenue);
    const ytStr = parseNumber(a.youtubeStreams);
    const otRev = parseNumber(a.otherRevenue);
    const otStr = parseNumber(a.otherStreams);

    const dspRevSum = spRev + apRev + ytRev + otRev;
    const dspStrSum = spStr + apStr + ytStr + otStr;

    const estRev = parseNumber(a.estimatedRevenue);
    const mStr = parseNumber(a.monthlyStreams);

    // Use the highest available revenue and streams
    const finalRev = dspRevSum > 0 ? dspRevSum : estRev;
    const finalStr = dspStrSum > 0 ? dspStrSum : mStr;

    spotifyRevTotal += spRev;
    spotifyStreamsTotal += spStr;
    appleRevTotal += apRev;
    appleStreamsTotal += apStr;
    youtubeRevTotal += ytRev;
    youtubeStreamsTotal += ytStr;
    otherRevTotal += otRev;
    otherStreamsTotal += otStr;

    totalRev += finalRev;
    totalStreams += finalStr;

    return {
      ...a,
      calculatedRev: finalRev,
      calculatedStreams: finalStr,
      spRev,
      apRev,
      ytRev,
      otRev
    };
  });

  totalRevEl.textContent = `₫ ${totalRev.toLocaleString('vi-VN')}`;
  totalStreamsEl.textContent = totalStreams.toLocaleString('vi-VN');

  // 4. Update Platform Breakdown
  const totalDspRev = (spotifyRevTotal + appleRevTotal + youtubeRevTotal + otherRevTotal) || totalRev || 1;
  
  const spPct = Math.round((spotifyRevTotal / totalDspRev) * 100) || 0;
  const apPct = Math.round((appleRevTotal / totalDspRev) * 100) || 0;
  const ytPct = Math.round((youtubeRevTotal / totalDspRev) * 100) || 0;
  const otPct = Math.max(0, 100 - spPct - apPct - ytPct);

  const setEl = (id, val) => {
    const el = document.querySelector(id);
    if (el) el.textContent = val;
  };

  setEl('#admin-dsp-val-spotify', `₫ ${spotifyRevTotal.toLocaleString('vi-VN')}`);
  setEl('#admin-dsp-pct-spotify', `${spPct}%`);
  setEl('#admin-dsp-streams-spotify', `${spotifyStreamsTotal.toLocaleString('vi-VN')} streams`);

  setEl('#admin-dsp-val-apple', `₫ ${appleRevTotal.toLocaleString('vi-VN')}`);
  setEl('#admin-dsp-pct-apple', `${apPct}%`);
  setEl('#admin-dsp-streams-apple', `${appleStreamsTotal.toLocaleString('vi-VN')} streams`);

  setEl('#admin-dsp-val-youtube', `₫ ${youtubeRevTotal.toLocaleString('vi-VN')}`);
  setEl('#admin-dsp-pct-youtube', `${ytPct}%`);
  setEl('#admin-dsp-streams-youtube', `${youtubeStreamsTotal.toLocaleString('vi-VN')} streams`);

  setEl('#admin-dsp-val-other', `₫ ${otherRevTotal.toLocaleString('vi-VN')}`);
  setEl('#admin-dsp-pct-other', `${otPct}%`);
  setEl('#admin-dsp-streams-other', `${otherStreamsTotal.toLocaleString('vi-VN')} streams`);

  // 5. Render Artists Table
  const sortedArtists = [...processedArtists].sort((a, b) => b.calculatedRev - a.calculatedRev);

  if (topArtistsList) {
    if (sortedArtists.length === 0) {
      topArtistsList.innerHTML = '<p class="empty" style="font-size:13px;">Chưa có dữ liệu nghệ sĩ trong hệ thống.</p>';
    } else {
      topArtistsList.innerHTML = `
        <div style="overflow-x: auto;">
          <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
            <thead>
              <tr style="border-bottom: 2px solid var(--ink); background:#fafafa;">
                <th style="padding:10px 12px; width:40px;">#</th>
                <th style="padding:10px 12px;">Nghệ sĩ</th>
                <th style="padding:10px 12px;">Vai trò & Thể loại</th>
                <th style="padding:10px 12px; text-align:right;">Lượt Streams</th>
                <th style="padding:10px 12px; text-align:right;">Doanh thu ước tính</th>
                <th style="padding:10px 12px; text-align:right;">Royalty Rate</th>
                <th style="padding:10px 12px; text-align:right;">Số dư khả dụng</th>
                <th style="padding:10px 12px; text-align:center;">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${sortedArtists.map((a, i) => `
                <tr style="border-bottom: 1px solid var(--line); transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                  <td style="padding:12px; font-weight:bold; color:#64748b;">${i + 1}</td>
                  <td style="padding:12px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                      <img src="${a.image || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=80&q=80'}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid var(--ink);">
                      <div>
                        <strong style="font-size:14px; display:block;">${esc(a.name)}</strong>
                        <small style="color:#64748b; font-family:'DM Mono',monospace;">${esc(a.id)}</small>
                      </div>
                    </div>
                  </td>
                  <td style="padding:12px;">
                    <span style="display:inline-block; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; background:#eff6ff; color:#1d4ed8; text-transform:uppercase;">${esc(a.roleType || 'Distribution')}</span>
                    <div style="font-size:11px; color:#64748b; margin-top:2px;">${esc(a.genre || 'Music')}</div>
                  </td>
                  <td style="padding:12px; text-align:right; font-weight:bold; font-family:'DM Mono',monospace; color:#059669;">
                    ${a.calculatedStreams.toLocaleString('vi-VN')}
                  </td>
                  <td style="padding:12px; text-align:right; font-weight:bold; font-size:14px; color:#2563eb;">
                    ₫ ${a.calculatedRev.toLocaleString('vi-VN')}
                  </td>
                  <td style="padding:12px; text-align:right; font-size:12px;">
                    <span style="font-family:'DM Mono',monospace; background:#fef3c7; color:#92400e; padding:2px 6px; border-radius:4px; font-weight:bold;">${esc(a.royaltyRate || '80% Master')}</span>
                  </td>
                  <td style="padding:12px; text-align:right; font-weight:bold; font-family:'DM Mono',monospace; color:#7c3aed;">
                    ₫ ${parseNumber(a.payableBalance).toLocaleString('vi-VN')}
                  </td>
                  <td style="padding:12px; text-align:center;">
                    <button type="button" class="button alt" style="padding:4px 8px; font-size:11px;" onclick="window.adminSelectArtist('${esc(a.id)}')">✏️ Sửa</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }
}

// Global helper to switch to artist editor from dashboard
window.adminSelectArtist = function(artistId) {
  selectedArtistId = artistId;
  switchAdminTab('admin-tab-artists');
  renderArtistSelector();
  renderSelectedArtistEditor();
  scrollTo({ top: 300, behavior: 'smooth' });
};

// Refresh Dashboard Button
document.querySelector('#admin-refresh-dashboard-btn')?.addEventListener('click', async () => {
  data = await getData();
  await loadReleasesQueue();
  await loadPayoutRequests();
  renderDashboard();
  showNotice('✓ Đã cập nhật toàn bộ số liệu thống kê Dashboard mới nhất!');
});

// CSV Revenue Report Import Handler
document.querySelector('#admin-csv-upload')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      alert('File CSV không đúng định dạng hoặc không có dòng dữ liệu.');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
    let matchedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(c => c.trim().replace(/["']/g, ''));
      if (row.length === 0 || !row.some(Boolean)) continue;

      let artistId = '';
      let artistName = '';
      let addRev = 0;
      let addStreams = 0;

      headers.forEach((h, colIdx) => {
        const val = row[colIdx] || '';
        if (h === 'id' || h === 'artist_id' || h === 'artist id' || h === 'slug') artistId = val;
        if (h === 'name' || h === 'artist' || h === 'artist_name' || h === 'artist name') artistName = val;
        if (h.includes('revenue') || h.includes('doanh_thu') || h.includes('amount') || h.includes('earnings') || h.includes('usd') || h.includes('vnd')) {
          addRev += parseNumber(val);
        }
        if (h.includes('stream') || h.includes('play') || h.includes('luot_nghe') || h.includes('quantity')) {
          addStreams += parseNumber(val);
        }
      });

      const targetArtist = data.artists.find(a => 
        (artistId && a.id.toLowerCase() === artistId.toLowerCase()) ||
        (artistName && a.name.toLowerCase() === artistName.toLowerCase())
      );

      if (targetArtist) {
        matchedCount++;
        const currentRev = parseNumber(targetArtist.estimatedRevenue);
        const currentPayable = parseNumber(targetArtist.payableBalance);
        const currentStreams = parseNumber(targetArtist.monthlyStreams);

        targetArtist.estimatedRevenue = (currentRev + addRev).toLocaleString('vi-VN');
        targetArtist.payableBalance = (currentPayable + addRev).toLocaleString('vi-VN');
        targetArtist.monthlyStreams = (currentStreams + addStreams).toLocaleString('vi-VN');
      }
    }

    if (matchedCount > 0) {
      await saveData(data);
      showNotice(`✓ Đã import thành công dữ liệu doanh thu cho ${matchedCount} nghệ sĩ!`);
      render();
    } else {
      alert('Không tìm thấy nghệ sĩ nào khớp trong hệ thống từ file CSV. Vui lòng kiểm tra cột "artist_id" hoặc "artist_name".');
    }
  } catch (err) {
    console.error('Lỗi khi đọc file CSV:', err);
    alert('Đã xảy ra lỗi khi đọc file CSV: ' + err.message);
  }
  e.target.value = '';
});

function readItems(selector, kind) {
  return [...document.querySelectorAll(selector)].map(el => {
    let obj = {};
    el.querySelectorAll('[data-key]').forEach(input => {
      let val = input.type === 'checkbox' ? input.checked : input.value.trim();
      if (input.dataset.key === 'showOnWeb') {
        val = val === 'true' || val === true;
      }
      obj[input.dataset.key] = val;
    });
    if (kind === 'artist') {
      obj.gallery = (obj.gallery || '').split('\n').map(x => x.trim()).filter(Boolean);
    }
    return obj;
  });
}

document.querySelector('#add-user')?.addEventListener('click', async () => {
  const newId = 'artist-' + Date.now().toString(36);
  data.artists.push({
    id: newId,
    name: 'Nghệ sĩ mới',
    email: '',
    showOnWeb: true,
    roleType: 'exclusive',
    genre: 'Pop / R&B',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=85',
    bio: 'Thông tin giới thiệu về phong cách âm nhạc...',
    products: [],
    instagram: '',
    youtube: '',
    tiktok: '',
    monthlyStreams: '0',
    estimatedRevenue: '0',
    payableBalance: '0',
    payoutCycle: 'Hàng tháng (Monthly)',
    royaltyRate: '80% Master',
    contractTerm: '2024 - 2027'
  });
  data.artist_order = data.artists.map(a => a.id);
  selectedArtistId = newId;
  await saveData(data);
  showNotice('✓ Đã thêm tài khoản nghệ sĩ mới!');
  render();
});

document.querySelector('#add-portal-user')?.addEventListener('click', async () => {
  const newId = 'user-' + Date.now().toString(36);
  data.artists.push({
    id: newId,
    name: 'Người dùng Portal mới',
    email: '',
    showOnWeb: false,
    roleType: 'distribution',
    genre: 'Distribution',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=85',
    bio: 'Tài khoản người dùng / nghệ sĩ phân phối nội bộ.',
    products: [],
    instagram: '',
    youtube: '',
    tiktok: '',
    monthlyStreams: '0',
    estimatedRevenue: '0',
    payableBalance: '0',
    payoutCycle: 'Hàng tháng (Monthly)',
    royaltyRate: '80% Master',
    contractTerm: '2024 - 2027'
  });
  selectedArtistId = newId;
  render();
});

document.querySelector('#add-partner-user')?.addEventListener('click', () => {
  const newId = 'partner-' + Date.now().toString(36);
  data.artists.push({
    id: newId,
    name: 'Đối tác / Collab mới',
    email: '',
    showOnWeb: false,
    roleType: 'partner',
    genre: 'Partner / Collab',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=85',
    bio: 'Tài khoản đối tác / collab nhận chia doanh thu theo thỏa thuận Split từng bài hát.',
    products: [],
    instagram: '',
    youtube: '',
    tiktok: '',
    monthlyStreams: '0',
    estimatedRevenue: '0',
    payableBalance: '0',
    payoutCycle: 'Hàng tháng (Monthly)',
    royaltyRate: 'Theo thỏa thuận Split từng bài',
    contractTerm: '2024 - 2027'
  });
  selectedArtistId = newId;
  render();
});

document.querySelector('#add-article')?.addEventListener('click', async () => {
  data.articles.unshift({ id: 'bai-viet-' + Date.now().toString(36), date: '08.2026', category: 'News', title: 'Bài viết mới', cover: '', excerpt: '', body: '', published: true });
  await saveData(data);
  render();
});

// Remove artist and article handler
document.addEventListener('click', async e => {
  const removeArtistIdx = e.target.dataset.removeArtist;
  if (removeArtistIdx !== undefined) {
    const artistEl = e.target.closest('[data-artist]');
    const artistId = artistEl?.dataset.artistId;
    const idxNum = parseInt(removeArtistIdx, 10);
    const artistToRemove = data.artists[idxNum] || data.artists.find(a => a.id === artistId);
    const artistName = artistToRemove?.name || 'nghệ sĩ này';

    if (!confirm(`Xác nhận xóa nghệ sĩ "${artistName}" khỏi hệ thống?`)) return;

    if (isSupabaseConfigured() && (artistId || artistToRemove?.id)) {
      const targetId = artistId || artistToRemove?.id;
      const { error } = await supabase.from('artists').delete().eq('id', targetId);
      if (error) console.error('Lỗi khi xóa nghệ sĩ trên Supabase:', error);
    }

    if (artistToRemove) {
      const actualIdx = data.artists.indexOf(artistToRemove);
      if (actualIdx >= 0) {
        data.artists.splice(actualIdx, 1);
      }
    } else if (!isNaN(idxNum) && idxNum >= 0 && idxNum < data.artists.length) {
      data.artists.splice(idxNum, 1);
    }

    data.artist_order = data.artists.map(a => a.id);
    selectedArtistId = data.artists[0]?.id || '';
    await saveData(data);
    await logAuditEvent('Xóa tài khoản', `Đã xóa nghệ sĩ "${artistName}" khỏi hệ thống.`);
    showNotice(`✓ Đã xóa nghệ sĩ "${artistName}" khỏi hệ thống và đồng bộ ngay lên Website!`);
    render();
  }

  const removeArticleIdx = e.target.dataset.removeArticle;
  if (removeArticleIdx !== undefined) {
    const idxNum = parseInt(removeArticleIdx, 10);
    const article = data.articles[idxNum];
    if (!confirm(`Xóa bài viết "${article?.title || ''}"?`)) return;
    if (isSupabaseConfigured() && article?.id) {
      await supabase.from('articles').delete().eq('id', article.id);
    }
    data.articles.splice(idxNum, 1);
    await saveData(data);
    showNotice('✓ Đã xóa bài viết và cập nhật Website!');
    render();
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  saveBtn.disabled = true;
  saveBtn.textContent = 'Đang lưu lên Supabase...';

  // Read General Settings
  ['tagline', 'heroText', 'aboutTitle', 'aboutText', 'city'].forEach(k => {
    data[k] = form.elements[k]?.value || '';
  });

  // Read Emails
  const customEmails = [];
  document.querySelectorAll('.custom-email-row').forEach(row => {
    const label = row.querySelector('.email-row-label')?.value.trim();
    const email = row.querySelector('.email-row-value')?.value.trim();
    if (label && email) customEmails.push({ label, email });
  });
  data.emails = customEmails;

  // Read Announcements
  const customAnnouncements = [];
  document.querySelectorAll('.custom-announcement-card').forEach((card, i) => {
    const title = card.querySelector('.ann-title')?.value.trim();
    const type = card.querySelector('.ann-type')?.value || 'info';
    const date = card.querySelector('.ann-date')?.value.trim() || new Date().toLocaleDateString('vi-VN');
    const content = card.querySelector('.ann-content')?.value.trim() || '';
    const active = card.querySelector('.ann-active')?.value !== 'false';
    if (title) {
      customAnnouncements.push({
        id: 'ann-' + (i + 1) + '-' + Date.now().toString(36),
        title,
        type,
        date,
        content,
        active
      });
    }
  });
  data.announcements = customAnnouncements;

  // Update current edited artist data into state
  const artistContainer = document.querySelector('[data-artist]');
  const origArtistId = artistContainer?.dataset.artistId;
  const artistIdxStr = artistContainer?.dataset.artistIdx;
  const editedArtistData = readItems('[data-artist]', 'artist')[0];

  if (editedArtistData) {
    let targetIdx = -1;
    if (artistIdxStr !== undefined && artistIdxStr !== '') {
      targetIdx = parseInt(artistIdxStr, 10);
    }
    if ((targetIdx < 0 || targetIdx >= data.artists.length) && origArtistId) {
      targetIdx = data.artists.findIndex(a => a.id === origArtistId);
    }
    if (targetIdx < 0 && selectedArtistId) {
      targetIdx = data.artists.findIndex(a => a.id === selectedArtistId);
    }

    if (targetIdx >= 0 && targetIdx < data.artists.length) {
      data.artists[targetIdx] = { ...data.artists[targetIdx], ...editedArtistData };
      selectedArtistId = editedArtistData.id || data.artists[targetIdx].id;
    } else if (editedArtistData.id || editedArtistData.name) {
      data.artists.push(editedArtistData);
      selectedArtistId = editedArtistData.id;
    }
  }

  // Update articles
  data.articles = readItems('[data-article]', 'article');

  // Update UniPUBLISHING settings & pricing
  if (!data.publishing) data.publishing = JSON.parse(JSON.stringify(defaultData.publishing));
  data.publishing.basePrices = {
    commercial: parseInt(document.querySelector('#pub-price-commercial')?.value || '15000000', 10),
    film: parseInt(document.querySelector('#pub-price-film')?.value || '10000000', 10),
    series: parseInt(document.querySelector('#pub-price-series')?.value || '6000000', 10),
    gaming: parseInt(document.querySelector('#pub-price-gaming')?.value || '4000000', 10),
    creator: parseInt(document.querySelector('#pub-price-creator')?.value || '2500000', 10),
    event: parseInt(document.querySelector('#pub-price-event')?.value || '5000000', 10)
  };
  data.publishing.bundleDiscounts = {
    b10: { count: 10, discountPct: parseInt(document.querySelector('#pub-bundle-10')?.value || '15', 10), name: 'Gói Mini Sync (10 bài)' },
    b15: { count: 15, discountPct: parseInt(document.querySelector('#pub-bundle-15')?.value || '25', 10), name: 'Gói Pro Film (15 bài)' },
    b20: { count: 20, discountPct: parseInt(document.querySelector('#pub-bundle-20')?.value || '35', 10), name: 'Gói Agency Master (20 bài)' },
    full: { discountPct: parseInt(document.querySelector('#pub-bundle-full')?.value || '50', 10), name: 'Cấp phép Toàn bộ Catalogue' }
  };
  data.publishing.terms = document.querySelector('#pub-terms-text')?.value || '';

  await saveData(data);
  await logAuditEvent('Cập nhật UniPUBLISHING & Cấu hình hệ thống', 'Lưu thay đổi bảng giá và danh mục toàn website');
  showNotice('✓ Đã lưu toàn bộ dữ liệu hệ thống và bảng giá UniPUBLISHING lên Supabase thành công!');
  saveBtn.disabled = false;
  saveBtn.textContent = 'Lưu toàn bộ lên Supabase';
  render();
});

// Logout handler
document.querySelector('#logout')?.addEventListener('click', async () => {
  if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi trang Quản trị?')) {
    if (isSupabaseConfigured()) {
      try { await supabase.auth.signOut(); } catch {}
    }
    sessionStorage.removeItem('uniflows-admin');
    sessionStorage.removeItem('uniflows-user-email');
    localStorage.removeItem('uniflows-admin');
    localStorage.removeItem('uniflows-user-email');
    location.href = 'login';
  }
});

// ==========================================
// ARTIST NOTIFICATION DISPATCHER
// ==========================================
async function sendArtistNotification(artistId, title, message, type = 'info', link = '') {
  if (!artistId) return;
  const newNotif = {
    id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    artist_id: artistId,
    title,
    message,
    type,
    link,
    is_read: false,
    created_at: new Date().toISOString()
  };

  // 1. Update localStorage for target artist
  try {
    const key = 'uniflows-notifications-' + artistId;
    const cached = JSON.parse(localStorage.getItem(key) || '[]');
    cached.unshift(newNotif);
    localStorage.setItem(key, JSON.stringify(cached));
  } catch {}

  // 2. Insert into Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('notifications').insert({
        artist_id: artistId,
        title,
        message,
        type,
        link,
        is_read: false
      });
    } catch (err) {
      console.warn('Lỗi ghi thông báo vào Supabase:', err);
    }
  }
}

// ==========================================
// ELECTRONIC PRESS KIT (EPK) FOR ADMIN
// ==========================================
window.openAdminEPK = function(releaseId) {
  const rel = releases.find(r => r.id === releaseId) || 
    (data.artists || []).flatMap(a => (a.products || []).map(p => ({ ...p, artist_id: a.id }))).find(p => p.id === releaseId || p.slug === releaseId);
  if (!rel) {
    alert('Không tìm thấy thông tin bản phát hành để tạo EPK.');
    return;
  }

  const artistObj = (data.artists || []).find(a => a.id === rel.artist_id) || { name: rel.primary_artist || rel.artist_id || 'Nghệ sĩ' };
  const artistName = rel.artists?.name || artistObj.name || rel.primary_artist || 'Nghệ sĩ';
  const artwork = rel.artwork_url || rel.artworkUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80';
  const relDate = rel.release_date || rel.releaseDate || 'Đang cập nhật';
  const relType = rel.type || 'Single';
  const genre = rel.genre || rel.primaryGenre || artistObj.genre || 'Pop';
  const isrc = rel.upc || rel.isrc || 'Pending / UniFLOWs Master';
  const bio = artistObj.bio || `${artistName} là nghệ sĩ trực thuộc hãng đĩa UniFLOWs Records, mang đến phong cách âm nhạc độc đáo và tầm nhìn đương đại.`;

  const dialog = document.querySelector('#admin-epk-dialog');
  const printArea = document.querySelector('#admin-epk-printable-area');
  if (dialog && printArea) {
    printArea.innerHTML = `
      <div style="text-align:center;margin-bottom:28px;border-bottom:2px solid #0f172a;padding-bottom:18px;">
        <img src="https://ui-avatars.com/api/?name=UniFLOWs+Records&background=1e293b&color=fff&rounded=true&size=80" style="margin-bottom:8px;border-radius:50%;">
        <h1 style="font-size:24px;font-weight:900;letter-spacing:-0.05em;margin:0;color:#0f172a;">UNIFLOWs RECORDS</h1>
        <p style="font-size:11px;color:#64748b;margin:4px 0 0;letter-spacing:1.5px;text-transform:uppercase;font-weight:bold;">Official Electronic Press Kit (EPK)</p>
      </div>
      <div style="display:flex;gap:24px;align-items:flex-start;">
        <img src="${esc(artwork)}" style="width:200px;height:200px;border-radius:8px;object-fit:cover;box-shadow:0 10px 30px rgba(0,0,0,0.15);border:1px solid #e2e8f0;flex-shrink:0;">
        <div style="flex:1;">
          <span style="font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#2563eb;display:block;margin-bottom:4px;">Official Release One-Sheet</span>
          <h2 style="font-size:28px;margin:0;font-weight:900;letter-spacing:-0.03em;color:#0f172a;">${esc(rel.title)}</h2>
          <h3 style="font-size:18px;margin:6px 0 0;color:#334155;font-weight:700;">${esc(artistName)}</h3>
          
          <div style="margin-top:16px;font-size:12.5px;display:grid;grid-template-columns:1fr 1fr;gap:10px;background:#f8fafc;padding:12px 16px;border-radius:8px;border:1px solid #e2e8f0;">
            <div><strong style="color:#64748b;font-size:10.5px;text-transform:uppercase;display:block;">Ngày phát hành:</strong><span style="font-weight:600;color:#0f172a;">${esc(relDate)}</span></div>
            <div><strong style="color:#64748b;font-size:10.5px;text-transform:uppercase;display:block;">Định dạng:</strong><span style="font-weight:600;color:#0f172a;">${esc(relType)}</span></div>
            <div><strong style="color:#64748b;font-size:10.5px;text-transform:uppercase;display:block;">Thể loại:</strong><span style="font-weight:600;color:#0f172a;">${esc(genre)}</span></div>
            <div><strong style="color:#64748b;font-size:10.5px;text-transform:uppercase;display:block;">ISRC / UPC:</strong><span style="font-weight:600;color:#0f172a;font-family:monospace;">${esc(isrc)}</span></div>
          </div>
        </div>
      </div>
      <div style="margin-top:24px;border-top:1px solid #e2e8f0;padding-top:18px;">
        <h4 style="font-size:14px;margin:0 0 8px;color:#0f172a;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">Tiểu sử nghệ sĩ & Thông cáo báo chí</h4>
        <p style="font-size:13px;line-height:1.6;color:#334155;">${esc(bio)}</p>
        <p style="font-size:13px;line-height:1.6;color:#334155;margin-top:6px;">Bản phát hành <strong>"${esc(rel.title)}"</strong> được bảo chứng và phân phối độc quyền bởi <strong>UniFLOWs Records</strong> trên các nền tảng streaming toàn cầu (Spotify, Apple Music, YouTube Music, Zing MP3, TikTok).</p>
      </div>
      <div style="margin-top:28px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px dashed #cbd5e1;padding-top:14px;">
        © 2026 UniFLOWs Label & Distribution. All Rights Reserved.<br>Media / A&R Contact: press@uniflowslabel.com &bull; demos@uniflowslabel.com
      </div>
    `;
    dialog.showModal();
  }
};

document.querySelector('#close-admin-epk-btn')?.addEventListener('click', () => document.querySelector('#admin-epk-dialog')?.close());
document.querySelector('#cancel-admin-epk-btn')?.addEventListener('click', () => document.querySelector('#admin-epk-dialog')?.close());
document.querySelector('#print-admin-epk-btn')?.addEventListener('click', () => {
  const printContent = document.querySelector('#admin-epk-printable-area').innerHTML;
  const originalContent = document.body.innerHTML;
  document.body.innerHTML = printContent;
  window.print();
  document.body.innerHTML = originalContent;
  location.reload();
});

// ==========================================
// AUDIT LOGS SECURITY SYSTEM
// ==========================================
let auditLogs = [
  {
    created_at: new Date().toISOString(),
    user_email: 'admin@uniflowslabel.com',
    action: 'Hệ thống khởi động',
    details: 'Đăng nhập phiên làm việc Quản trị viên Master'
  }
];

async function logAuditEvent(action, details = '') {
  const logEntry = {
    created_at: new Date().toISOString(),
    user_email: sessionStorage.getItem('uniflows-admin-email') || 'admin@uniflowslabel.com',
    action,
    details
  };
  auditLogs.unshift(logEntry);
  localStorage.setItem('uniflows-audit-logs', JSON.stringify(auditLogs));

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('audit_logs').insert(logEntry);
    } catch (e) {
      console.warn('Lỗi ghi log Supabase:', e);
    }
  }
}

async function loadAdminAuditLogs() {
  const tbody = document.querySelector('#admin-audit-logs-tbody');
  if (!tbody) return;

  try {
    const cached = JSON.parse(localStorage.getItem('uniflows-audit-logs') || 'null');
    if (cached) auditLogs = cached;
  } catch {}

  if (isSupabaseConfigured()) {
    try {
      const { data: dbLogs, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50);
      if (!error && dbLogs && dbLogs.length > 0) {
        auditLogs = dbLogs;
      }
    } catch (err) {
      console.warn('Lỗi lấy audit logs từ Supabase:', err);
    }
  }

  tbody.innerHTML = auditLogs.map(log => `
    <tr style="border-bottom: 1px solid var(--line);">
      <td style="padding: 10px 14px; font-family: 'DM Mono', monospace; font-size: 12px; color: #64748b;">
        ${new Date(log.created_at).toLocaleString('vi-VN')}
      </td>
      <td style="padding: 10px 14px; font-weight: bold;">
        ${esc(log.user_email)}
      </td>
      <td style="padding: 10px 14px;">
        <span style="font-size: 11px; font-weight: bold; background: #eff6ff; color: #1d4ed8; padding: 2px 8px; border-radius: 4px;">
          ${esc(log.action)}
        </span>
      </td>
      <td style="padding: 10px 14px; font-size: 12px; color: #334155;">
        ${esc(log.details || '—')}
      </td>
    </tr>
  `).join('');
}

document.querySelector('#refresh-audit-logs-btn')?.addEventListener('click', () => {
  loadAdminAuditLogs();
  showNotice('✓ Đã làm mới lịch sử bảo mật Audit Log!');
});

// ====================================================
// UNIPUBLISHING & SYNC MANAGEMENT SYSTEM
// ====================================================
function renderPublishingAdmin() {
  const pubData = data.publishing || defaultData.publishing || {};
  const basePrices = pubData.basePrices || {};
  const bundles = pubData.bundleDiscounts || {};

  // 1. Populate base prices
  const pComm = document.querySelector('#pub-price-commercial');
  const pFilm = document.querySelector('#pub-price-film');
  const pSeries = document.querySelector('#pub-price-series');
  const pGaming = document.querySelector('#pub-price-gaming');
  const pCreator = document.querySelector('#pub-price-creator');
  const pEvent = document.querySelector('#pub-price-event');

  if (pComm) pComm.value = basePrices.commercial || 15000000;
  if (pFilm) pFilm.value = basePrices.film || 10000000;
  if (pSeries) pSeries.value = basePrices.series || 6000000;
  if (pGaming) pGaming.value = basePrices.gaming || 4000000;
  if (pCreator) pCreator.value = basePrices.creator || 2500000;
  if (pEvent) pEvent.value = basePrices.event || 5000000;

  // 2. Populate bundle discounts
  const b10 = document.querySelector('#pub-bundle-10');
  const b15 = document.querySelector('#pub-bundle-15');
  const b20 = document.querySelector('#pub-bundle-20');
  const bFull = document.querySelector('#pub-bundle-full');
  const termsText = document.querySelector('#pub-terms-text');

  if (b10) b10.value = bundles.b10?.discountPct || 15;
  if (b15) b15.value = bundles.b15?.discountPct || 25;
  if (b20) b20.value = bundles.b20?.discountPct || 35;
  if (bFull) bFull.value = bundles.full?.discountPct || 50;
  if (termsText) termsText.value = pubData.terms || '';

  // 3. Render publishing tracks list & Portal releases dropdown & Sync requests
  populatePortalReleasesToSyncSelect();
  renderPublishingTracksList();
  renderSyncLicenseRequests();
}

// Populate releases from portal into UniPUBLISHING select
function populatePortalReleasesToSyncSelect() {
  const select = document.querySelector('#portal-release-to-sync-select');
  if (!select) return;

  const options = [];
  (data.artists || []).forEach(art => {
    (art.products || []).forEach(prod => {
      options.push({
        artistName: art.name,
        artistId: art.id,
        trackTitle: prod.title,
        genre: art.genre || 'Independent',
        audioUrl: prod.url || '',
        display: `${prod.title} — ${art.name} (${prod.type || 'Single'})`
      });
    });
  });

  if (options.length === 0) {
    select.innerHTML = '<option value="">Chưa có bài hát nào trong kho phát hành</option>';
    return;
  }

  select.innerHTML = options.map((opt, idx) => `
    <option value="${idx}" data-artist="${esc(opt.artistName)}" data-artist-id="${esc(opt.artistId)}" data-title="${esc(opt.trackTitle)}" data-genre="${esc(opt.genre)}">
      ${esc(opt.display)}
    </option>
  `).join('');
}

// 1-Click Add Track from Artist Portal Releases into UniPUBLISHING
document.querySelector('#btn-add-portal-release-to-sync')?.addEventListener('click', async () => {
  const select = document.querySelector('#portal-release-to-sync-select');
  const selectedOpt = select?.selectedOptions[0];
  if (!selectedOpt || !selectedOpt.dataset.title) {
    alert('Vui lòng chọn bài hát từ danh sách bản phát hành.');
    return;
  }

  const title = selectedOpt.dataset.title;
  const artist = selectedOpt.dataset.artist;
  const genre = selectedOpt.dataset.genre || 'Alternative';

  if (!data.publishing) data.publishing = JSON.parse(JSON.stringify(defaultData.publishing));
  if (!data.publishing.customTracks) data.publishing.customTracks = [];

  // Check if already in publishing
  const exists = data.publishing.customTracks.some(t => t.title.toLowerCase() === title.toLowerCase() && t.artist.toLowerCase() === artist.toLowerCase());
  if (exists) {
    alert(`Tác phẩm "${title}" của ${artist} đã có trong danh mục UniPUBLISHING rồi!`);
    return;
  }

  const newTrack = {
    id: `pub-portal-${Date.now()}`,
    title,
    artist,
    genre,
    mood: 'Cinematic · Original Master',
    bpm: '115 BPM · Master Quality',
    audioUrl: '',
    isExternal: false,
    enabled: true
  };

  data.publishing.customTracks.unshift(newTrack);
  await saveData(data);
  renderPublishingTracksList();
  showNotice(`✓ Đã thêm tác phẩm "${title}" của ${artist} từ Portal vào UniPUBLISHING thành công!`);
  await logAuditEvent('Thêm tác phẩm Portal vào UniPUBLISHING', `Tác phẩm: ${title} - Nghệ sĩ: ${artist}`);
});

function renderPublishingTracksList() {
  const tbody = document.querySelector('#pub-tracks-admin-tbody');
  const countEl = document.querySelector('#pub-total-tracks-count');
  if (!tbody) return;

  if (!data.publishing) data.publishing = JSON.parse(JSON.stringify(defaultData.publishing));
  if (!data.publishing.customTracks) data.publishing.customTracks = [];

  const tracks = data.publishing.customTracks;
  if (countEl) countEl.textContent = `${tracks.length} Tác phẩm`;

  if (tracks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:#64748b;">Chưa có tác phẩm nào trong thư viện Sync. Hãy thêm tác phẩm mới ở trên.</td></tr>`;
    return;
  }

  tbody.innerHTML = tracks.map((tr, idx) => `
    <tr style="border-bottom:1px solid #e2e8f0;">
      <td style="padding:12px 14px;">
        <strong style="font-size:14px;display:block;">${esc(tr.title)}</strong>
        <span style="font-size:12px;color:#64748b;">${esc(tr.artist)}</span>
      </td>
      <td style="padding:12px 14px;">
        <span style="font-size:11px;font-weight:bold;background:#eff6ff;color:#1d4ed8;padding:2px 6px;border-radius:4px;">${esc(tr.genre || 'Music')}</span>
        <small style="display:block;color:#64748b;margin-top:2px;">${esc(tr.mood || 'Standard')}</small>
      </td>
      <td style="padding:12px 14px;font-family:'DM Mono',monospace;font-size:12px;">
        ${esc(tr.bpm || '—')}
      </td>
      <td style="padding:12px 14px;">
        <span style="font-size:11px;padding:2px 8px;border-radius:12px;${tr.isExternal ? 'background:#fef3c7;color:#92400e;' : 'background:#ecfdf5;color:#065f46;'}">
          ${tr.isExternal ? '👤 Nghệ sĩ ngoài' : '⭐ Label Roster'}
        </span>
      </td>
      <td style="padding:12px 14px;text-align:center;">
        <button type="button" class="button alt toggle-pub-track" data-idx="${idx}" style="padding:4px 10px;font-size:11px;${tr.enabled ? 'background:#ecfdf5;color:#047857;border-color:#a7f3d0;' : 'background:#fef2f2;color:#dc2626;border-color:#fecaca;'}">
          ${tr.enabled ? '🟢 Đang Cấp Phép' : '⚪ Đã Tắt'}
        </button>
      </td>
      <td style="padding:12px 14px;text-align:right;">
        <button type="button" class="button alt remove-pub-track" data-idx="${idx}" style="padding:4px 8px;font-size:11px;color:#dc2626;">
          ✕ Xóa
        </button>
      </td>
    </tr>
  `).join('');

  // Toggle handler
  tbody.querySelectorAll('.toggle-pub-track').forEach(btn => {
    btn.onclick = async () => {
      const idx = parseInt(btn.dataset.idx, 10);
      tracks[idx].enabled = !tracks[idx].enabled;
      await saveData(data);
      renderPublishingTracksList();
      showNotice(`✓ Đã ${tracks[idx].enabled ? 'bật' : 'tắt'} cấp phép tác phẩm "${tracks[idx].title}"`);
    };
  });

  // Delete handler
  tbody.querySelectorAll('.remove-pub-track').forEach(btn => {
    btn.onclick = async () => {
      const idx = parseInt(btn.dataset.idx, 10);
      if (confirm(`Bạn có chắc muốn xóa tác phẩm "${tracks[idx].title}" khỏi UniPUBLISHING?`)) {
        tracks.splice(idx, 1);
        await saveData(data);
        renderPublishingTracksList();
        showNotice(`✓ Đã xóa tác phẩm khỏi danh mục Sync!`);
      }
    };
  });
}

// ====================================================
// SYNC LICENSING REQUESTS & AUTOMATED ROYALTY CREDITING
// ====================================================
function renderSyncLicenseRequests() {
  const tbody = document.querySelector('#sync-license-requests-tbody');
  const countBadge = document.querySelector('#pub-pending-requests-count');
  if (!tbody) return;

  if (!data.publishing) data.publishing = JSON.parse(JSON.stringify(defaultData.publishing));
  if (!data.publishing.syncLicenseRequests) data.publishing.syncLicenseRequests = [];

  const requests = data.publishing.syncLicenseRequests;
  const pendingCount = requests.filter(r => r.status === 'Chờ xét duyệt').length;

  if (countBadge) {
    countBadge.textContent = `${pendingCount} Yêu cầu chờ duyệt`;
    countBadge.style.background = pendingCount > 0 ? '#ecfdf5' : '#f1f5f9';
    countBadge.style.color = pendingCount > 0 ? '#047857' : '#64748b';
  }

  if (requests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="padding:20px;text-align:center;color:#64748b;">Chưa có yêu cầu cấp phép Sync nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = requests.map((req, idx) => {
    const isApproved = req.status === 'Đã cấp phép & Đã thanh toán';
    const statusVal = req.status || 'Chờ tiếp nhận';

    return `
      <tr style="border-bottom:1px solid #e2e8f0;background:${isApproved ? '#f8fafc' : '#fff'};" data-req-idx="${idx}">
        <td style="padding:12px 14px;font-family:'DM Mono',monospace;font-size:12px;color:#0f172a;">
          <strong style="color:#0284c7;display:block;">${esc(req.refCode || req.id || 'UNIPUB-ORD')}</strong>
          <small style="color:#64748b;">${esc(req.requestedDate || 'Hôm nay')}</small>
        </td>
        <td style="padding:12px 14px;">
          <strong style="font-size:14px;display:block;color:#0f172a;">${esc(req.trackTitle)}</strong>
          <span style="font-size:12px;color:#2563eb;">${esc(req.artistName || 'Nghệ sĩ Label')}</span>
        </td>
        <td style="padding:12px 14px;">
          <strong style="font-size:13px;display:block;color:#0f172a;">${esc(req.clientName)}</strong>
          <small style="color:#64748b;">📧 ${esc(req.clientEmail || '—')} · 📞 ${esc(req.clientPhone || '—')}</small>
        </td>
        <td style="padding:12px 14px;font-size:12px;">
          <span style="font-weight:600;display:block;color:#0f172a;">${esc(req.mediaType)}</span>
          <small style="color:#64748b;">${esc(req.territory || 'Việt Nam')} · ${esc(req.term || '1 Năm')}</small>
        </td>
        <td style="padding:12px 14px;font-family:'DM Mono',monospace;font-weight:bold;color:#0f172a;font-size:13px;">
          ${typeof req.totalFee === 'number' ? '₫ ' + req.totalFee.toLocaleString('vi-VN') : esc(req.totalFee || '0')}
        </td>
        <td style="padding:12px 14px;">
          <select class="req-status-select" data-idx="${idx}" style="padding:6px 10px;border-radius:4px;border:1px solid #0f172a;font-size:12px;font-weight:bold;background:#fff;width:100%;">
            <option value="Chờ tiếp nhận" ${statusVal === 'Chờ tiếp nhận' || statusVal === 'Chờ xét duyệt' ? 'selected' : ''}>🟡 Chờ tiếp nhận</option>
            <option value="Đang soạn hợp đồng" ${statusVal === 'Đang soạn hợp đồng' ? 'selected' : ''}>🔵 Đang soạn hợp đồng</option>
            <option value="Đã gửi hợp đồng qua Email" ${statusVal === 'Đã gửi hợp đồng qua Email' ? 'selected' : ''}>📬 Đã gửi hợp đồng qua Email</option>
            <option value="Chờ thanh toán" ${statusVal === 'Chờ thanh toán' ? 'selected' : ''}>🟣 Chờ thanh toán & VAT</option>
            <option value="Đã cấp phép & Đã thanh toán" ${statusVal === 'Đã cấp phép & Đã thanh toán' ? 'selected' : ''}>🟢 Đã cấp phép & Đã thanh toán</option>
            <option value="Từ chối cấp phép" ${statusVal === 'Từ chối cấp phép' ? 'selected' : ''}>🔴 Từ chối cấp phép</option>
          </select>
        </td>
        <td style="padding:12px 14px;">
          <input type="text" class="req-admin-note" data-idx="${idx}" value="${esc(req.adminNotes || '')}" placeholder="Ghi chú dặn dò khách hàng khi tra cứu..." style="width:100%;padding:6px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px;">
        </td>
        <td style="padding:12px 14px;text-align:right;white-space:nowrap;">
          <button type="button" class="button btn-save-order-status" data-idx="${idx}" style="background:#0f172a;color:#fff;border-color:#0f172a;font-size:11px;padding:6px 10px;font-weight:bold;margin-right:4px;" title="Lưu cập nhật trạng thái và ghi chú">
            💾 Lưu
          </button>
          <button type="button" class="button alt remove btn-delete-sync-req" data-idx="${idx}" style="padding:6px 8px;font-size:11px;" title="Xóa đơn này">
            ✕
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Handle Save Status & Note
  tbody.querySelectorAll('.btn-save-order-status').forEach(btn => {
    btn.onclick = async () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const req = requests[idx];
      if (!req) return;

      const row = btn.closest('tr');
      const newStatus = row.querySelector('.req-status-select')?.value || req.status;
      const newNote = row.querySelector('.req-admin-note')?.value.trim() || '';

      btn.disabled = true;
      btn.textContent = 'Đang lưu...';

      req.status = newStatus;
      req.adminNotes = newNote;

      // If status changed to Approved, credit royalty to artist
      if (newStatus === 'Đã cấp phép & Đã thanh toán' && !req.licensedDate) {
        req.licensedDate = new Date().toLocaleDateString('vi-VN');
        
        let matchedArtist = (data.artists || []).find(a => 
          a.name.toLowerCase().trim() === (req.artistName || '').toLowerCase().trim() ||
          (a.products || []).some(p => p.title.toLowerCase().trim() === (req.trackTitle || '').toLowerCase().trim())
        );

        let splitPct = 75;
        if (matchedArtist && matchedArtist.publishingRoyaltyRate) {
          splitPct = parseInt(String(matchedArtist.publishingRoyaltyRate).replace(/[^0-9]/g, ''), 10) || 75;
        }

        const feeNum = typeof req.totalFee === 'number' ? req.totalFee : (parseInt(String(req.totalFee || '0').replace(/[^0-9]/g, ''), 10) || 0);
        const artistEarning = Math.round(feeNum * (splitPct / 100));

        if (matchedArtist && artistEarning > 0) {
          if (!matchedArtist.publishingContracts) matchedArtist.publishingContracts = [];
          matchedArtist.publishingContracts.unshift({
            id: `sync-contract-${Date.now()}`,
            trackTitle: req.trackTitle,
            client: req.clientName,
            mediaType: req.mediaType,
            territory: req.territory || 'Việt Nam',
            term: req.term || '1 Năm',
            totalFee: feeNum,
            artistSplitPct: splitPct,
            artistEarning: artistEarning,
            status: 'Đã cấp phép & Đã thanh toán',
            licensedDate: req.licensedDate
          });

          const currentPayable = parseInt(String(matchedArtist.payableBalance || '0').replace(/[^0-9]/g, ''), 10) || 0;
          matchedArtist.payableBalance = (currentPayable + artistEarning).toLocaleString('vi-VN');
        }
      }

      await saveData(data);
      await logAuditEvent('Cập nhật trạng thái đơn cấp phép', `Mã đơn: ${req.refCode || req.id} - Trạng thái: ${newStatus}`);
      showNotice(`✓ Đã cập nhật trạng thái đơn "${req.refCode || req.id}" thành "${newStatus}"! Khách hàng có thể tra cứu ngay.`);
      renderSyncLicenseRequests();
    };
  });

  // Handle Delete Request
  tbody.querySelectorAll('.btn-delete-sync-req').forEach(btn => {
    btn.onclick = async () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const req = requests[idx];
      if (!req) return;

      if (!confirm(`Xác nhận xóa đơn cấp phép "${req.refCode || req.id}" của ${req.clientName}?`)) return;

      requests.splice(idx, 1);
      await saveData(data);
      showNotice(`✓ Đã xóa đơn cấp phép.`);
      renderSyncLicenseRequests();
    };
  });
}

// Add External Track Button Handler
document.querySelector('#btn-add-external-track')?.addEventListener('click', async () => {
  const title = document.querySelector('#ext-track-title')?.value.trim();
  const artist = document.querySelector('#ext-track-artist')?.value.trim();
  const genre = document.querySelector('#ext-track-genre')?.value.trim() || 'General';
  const mood = document.querySelector('#ext-track-mood')?.value.trim() || 'Cinematic / Modern';
  const bpm = document.querySelector('#ext-track-bpm')?.value.trim() || '120 BPM';
  const audio = document.querySelector('#ext-track-audio')?.value.trim();

  if (!title || !artist) {
    alert('Vui lòng nhập đầy đủ Tên tác phẩm và Nhạc sĩ/Nghệ sĩ.');
    return;
  }

  if (!data.publishing) data.publishing = JSON.parse(JSON.stringify(defaultData.publishing));
  if (!data.publishing.customTracks) data.publishing.customTracks = [];

  const newTrack = {
    id: `pub-ext-${Date.now()}`,
    title,
    artist,
    genre,
    mood,
    bpm,
    audioUrl: audio,
    isExternal: true,
    enabled: true
  };

  data.publishing.customTracks.unshift(newTrack);
  await saveData(data);

  // Reset form inputs
  document.querySelector('#ext-track-title').value = '';
  document.querySelector('#ext-track-artist').value = '';
  document.querySelector('#ext-track-genre').value = '';
  document.querySelector('#ext-track-mood').value = '';
  document.querySelector('#ext-track-bpm').value = '';
  document.querySelector('#ext-track-audio').value = '';

  renderPublishingTracksList();
  showNotice(`✓ Đã thêm tác phẩm ký gửi "${title}" của ${artist} vào UniPUBLISHING thành công!`);
  await logAuditEvent('Thêm tác phẩm UniPUBLISHING', `Tác phẩm: ${title} - Nghệ sĩ: ${artist}`);
});

// Save UniPUBLISHING Pricing Function
async function savePublishingPricing(quiet = false) {
  if (!data.publishing) data.publishing = JSON.parse(JSON.stringify(defaultData.publishing || {}));

  data.publishing.basePrices = {
    commercial: parseInt(document.querySelector('#pub-price-commercial')?.value || '15000000', 10),
    film: parseInt(document.querySelector('#pub-price-film')?.value || '10000000', 10),
    series: parseInt(document.querySelector('#pub-price-series')?.value || '6000000', 10),
    gaming: parseInt(document.querySelector('#pub-price-gaming')?.value || '4000000', 10),
    creator: parseInt(document.querySelector('#pub-price-creator')?.value || '2500000', 10),
    event: parseInt(document.querySelector('#pub-price-event')?.value || '5000000', 10)
  };

  data.publishing.bundleDiscounts = {
    b10: { count: 10, discountPct: parseInt(document.querySelector('#pub-bundle-10')?.value || '15', 10), name: 'Gói Mini Sync (10 bài)' },
    b15: { count: 15, discountPct: parseInt(document.querySelector('#pub-bundle-15')?.value || '25', 10), name: 'Gói Pro Film (15 bài)' },
    b20: { count: 20, discountPct: parseInt(document.querySelector('#pub-bundle-20')?.value || '35', 10), name: 'Gói Agency Master (20 bài)' },
    full: { discountPct: parseInt(document.querySelector('#pub-bundle-full')?.value || '50', 10), name: 'Cấp phép Toàn bộ Catalogue' }
  };

  data.publishing.terms = document.querySelector('#pub-terms-text')?.value || '';

  await saveData(data);
  await logAuditEvent('Cập nhật giá UniPUBLISHING', 'Lưu bảng giá cấp phép và tỷ lệ chiết khấu');
  if (!quiet) {
    showNotice('✓ Đã lưu bảng giá & chính sách chiết khấu UniPUBLISHING thành công!');
  }
}

document.querySelector('#btn-save-publishing-pricing')?.addEventListener('click', async () => {
  await savePublishingPricing(false);
});

// Auto-save when changing any pricing field
document.querySelectorAll('#pub-price-commercial, #pub-price-film, #pub-price-series, #pub-price-gaming, #pub-price-creator, #pub-price-event, #pub-bundle-10, #pub-bundle-15, #pub-bundle-20, #pub-bundle-full, #pub-terms-text').forEach(input => {
  input?.addEventListener('change', async () => {
    await savePublishingPricing(true);
  });
});

// ====================================================
// DIRECT ACCOUNT PROVISIONING & HANDOVER GENERATOR
// ====================================================
function initAccountProvisioning() {
  const openBtn = document.querySelector('#open-provision-dialog-btn');
  const dialog = document.querySelector('#admin-provision-dialog');
  const closeBtn = document.querySelector('#close-provision-dialog-btn');
  const cancelBtn = document.querySelector('#cancel-provision-dialog-btn');
  const genPassBtn = document.querySelector('#btn-generate-pass');
  const form = document.querySelector('#provision-user-form');
  const resultCard = document.querySelector('#provision-result-card');
  const handoverPre = document.querySelector('#handover-text-preview');
  const copyHandoverBtn = document.querySelector('#btn-copy-handover');

  if (!openBtn || !dialog || !form) return;

  openBtn.onclick = () => {
    resultCard.style.display = 'none';
    form.reset();
    document.querySelector('#prov-password').value = generateSecurePassword('Artist');
    dialog.showModal();
  };

  closeBtn.onclick = () => dialog.close();
  cancelBtn.onclick = () => dialog.close();

  function generateSecurePassword(prefix = 'Flow') {
    const specials = ['@', '#', '!', '$'];
    const spec = specials[Math.floor(Math.random() * specials.length)];
    const year = new Date().getFullYear();
    const randNum = Math.floor(100 + Math.random() * 900);
    return `${prefix}${spec}${year}_${randNum}`;
  }

  genPassBtn.onclick = () => {
    const name = document.querySelector('#prov-name').value.trim() || 'Artist';
    const cleanPrefix = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z]/g, '') || 'Artist';
    document.querySelector('#prov-password').value = generateSecurePassword(cleanPrefix);
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.querySelector('#prov-name').value.trim();
    const username = document.querySelector('#prov-username').value.trim().toLowerCase();
    const email = document.querySelector('#prov-email').value.trim().toLowerCase();
    const password = document.querySelector('#prov-password').value.trim();
    const roleType = document.querySelector('#prov-role').value;
    const showOnWeb = document.querySelector('#prov-visibility').value === 'true';
    const royaltyRate = document.querySelector('#prov-royalty').value.trim() || '80% Master';
    const payoutCycle = document.querySelector('#prov-payout-cycle').value.trim() || 'Hàng tháng (Monthly)';

    if (!name || !username || !password) {
      alert('Vui lòng nhập đầy đủ Tên hiển thị, Tên đăng nhập và Mật khẩu.');
      return;
    }

    const id = username.replace(/[^a-z0-9]/g, '-').replace(/^-+|-+$/g, '') || `user-${Date.now()}`;

    // Role display title
    const roleMap = {
      admin: '👑 Quản trị viên Tối cao (Super Admin)',
      exclusive: '⭐ Nghệ sĩ Độc quyền (Exclusive Artist)',
      distribution: '💿 Nghệ sĩ Phân phối (Distribution Client)',
      partner: '🤝 Đối tác Chiến lược (Strategic Partner)',
      collab: '✨ Nghệ sĩ Collab / Featured (Guest Artist)',
      producer: '🎛️ Producer / Beatmaker',
      manager: '👔 Quản lý Nghệ sĩ (Artist Manager)'
    };
    const roleTitle = roleMap[roleType] || 'Nghệ sĩ';
    const loginUrl = roleType === 'admin' 
      ? `${window.location.origin}/login`
      : `${window.location.origin}/artist-login`;

    // 1. If role is Admin, save to adminAccounts
    if (roleType === 'admin') {
      if (!data.adminAccounts) data.adminAccounts = [];
      const existingAdminIdx = data.adminAccounts.findIndex(a => a.username === username || a.email === email);
      const adminObj = {
        id,
        username,
        email,
        name,
        password,
        role: 'admin',
        createdAt: new Date().toISOString().split('T')[0]
      };
      if (existingAdminIdx >= 0) {
        data.adminAccounts[existingAdminIdx] = adminObj;
      } else {
        data.adminAccounts.push(adminObj);
      }
    }

    // 2. Add or update in data.artists
    if (!data.artists) data.artists = [];
    const existingIdx = data.artists.findIndex(a => a.id === id || a.username === username || (email && a.email === email));
    
    const artistRecord = {
      id,
      name,
      username,
      email,
      password,
      roleType,
      showOnWeb,
      genre: roleType === 'producer' ? 'Music Producer' : (roleType === 'partner' ? 'Strategic Partner' : 'Independent'),
      image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80',
      bio: `${name} — Thành viên chính thức trong hệ sinh thái UniFLOWs Label.`,
      gallery: [],
      monthlyStreams: '0',
      estimatedRevenue: '0',
      payableBalance: '0',
      payoutCycle,
      royaltyRate,
      contractTerm: `Hợp đồng ${roleTitle} 2026 - 2029`,
      publishingRevenue: '0',
      publishingRoyaltyRate: '75%',
      publishingContracts: [],
      spotifyStreams: '0',
      spotifyRevenue: '0',
      appleStreams: '0',
      appleRevenue: '0',
      youtubeStreams: '0',
      youtubeRevenue: '0',
      otherStreams: '0',
      otherRevenue: '0',
      topCountry: 'Việt Nam',
      topCity: 'Hồ Chí Minh',
      topSource: 'Direct Portal Provisioning',
      products: []
    };

    if (existingIdx >= 0) {
      data.artists[existingIdx] = { ...data.artists[existingIdx], ...artistRecord };
    } else {
      data.artists.push(artistRecord);
    }

    await saveData(data);
    await logAuditEvent('Cấp tài khoản mới trực tiếp', `Tên: ${name} - Username: ${username} - Vai trò: ${roleTitle}`);

    // Generate Handover Text
    const handoverText = [
      `══════════════════════════════════════════════`,
      `🎉 THÔNG TIN BÀN GIAO TÀI KHOẢN UNIFLOWS PORTAL`,
      `══════════════════════════════════════════════`,
      `👤 Tên hiển thị: ${name}`,
      `🔑 Tên đăng nhập (Username): ${username}`,
      `📧 Email liên kết: ${email}`,
      `🔒 Mật khẩu khởi tạo: ${password}`,
      `🎭 Phân quyền: ${roleTitle}`,
      `🌐 Link đăng nhập: ${loginUrl}`,
      `══════════════════════════════════════════════`,
      `💡 Vui lòng bảo mật thông tin và đổi mật khẩu sau khi đăng nhập thành công.`,
      `Trân trọng, UniFLOWs Record Label & Distribution.`
    ].join('\n');

    handoverPre.textContent = handoverText;
    resultCard.style.display = 'block';

    selectedArtistId = id;
    renderArtistSelector();
    renderSelectedArtistEditor();

    showNotice(`✓ Đã cấp tài khoản thành công cho "${name}"!`);
  };

  copyHandoverBtn.onclick = () => {
    const text = handoverPre.textContent;
    navigator.clipboard.writeText(text).then(() => {
      showNotice('✓ Đã sao chép Phiếu Bàn Giao vào bộ nhớ tạm! Sẵn sàng gửi qua Zalo / Telegram / Email.');
    }).catch(() => {
      prompt('Nội dung bàn giao:', text);
    });
  };
}

// Handover slip export from individual artist card
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-export-artist-handover');
  if (!btn) return;
  const idx = parseInt(btn.dataset.artistIdx, 10);
  const a = data.artists[idx];
  if (!a) return;

  const roleMap = {
    admin: '👑 Quản trị viên Tối cao (Super Admin)',
    exclusive: '⭐ Nghệ sĩ Độc quyền (Exclusive Artist)',
    distribution: '💿 Nghệ sĩ Phân phối (Distribution Client)',
    partner: '🤝 Đối tác Chiến lược (Strategic Partner)',
    collab: '✨ Nghệ sĩ Collab / Featured (Guest Artist)',
    producer: '🎛️ Producer / Beatmaker',
    manager: '👔 Quản lý Nghệ sĩ (Artist Manager)'
  };
  const roleTitle = roleMap[a.roleType] || 'Nghệ sĩ';
  const loginUrl = a.roleType === 'admin' 
    ? `${window.location.origin}/login`
    : `${window.location.origin}/artist-login`;

  const handoverText = [
    `══════════════════════════════════════════════`,
    `🎉 THÔNG TIN BÀN GIAO TÀI KHOẢN UNIFLOWS PORTAL`,
    `══════════════════════════════════════════════`,
    `👤 Tên hiển thị: ${a.name}`,
    `🔑 Tên đăng nhập (Username): ${a.username || a.id}`,
    `📧 Email liên kết: ${a.email || 'Chưa cập nhật'}`,
    `🔒 Mật khẩu đăng nhập: ${a.password || (a.name ? `${a.name}@2026` : 'Uniflows@2026')}`,
    `🎭 Phân quyền: ${roleTitle}`,
    `🌐 Link đăng nhập: ${loginUrl}`,
    `══════════════════════════════════════════════`,
    `💡 Vui lòng bảo mật thông tin và đổi mật khẩu sau khi đăng nhập thành công.`,
    `Trân trọng, UniFLOWs Record Label & Distribution.`
  ].join('\n');

  navigator.clipboard.writeText(handoverText).then(() => {
    showNotice(`✓ Đã sao chép Phiếu Bàn Giao của "${a.name}" vào bộ nhớ tạm!`);
  }).catch(() => {
    alert(handoverText);
  });
});

// ==============================================================================
// TAB 10: QUẢN TRỊ UNI-HUBE (SẢN XUẤT ÂM NHẠC & PRODUCERS)
// ==============================================================================
function renderUniHubeAdmin() {
  if (!data.unihube) data.unihube = JSON.parse(JSON.stringify(defaultData.unihube));
  const hube = data.unihube;

  // 1. Render Inquiries Queue
  const tbody = document.querySelector('#hube-inquiries-tbody');
  if (tbody) {
    const inqs = hube.inquiries || [];
    if (inqs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="padding:24px;text-align:center;color:#666;">Chưa có yêu cầu đặt lịch sản xuất nào.</td></tr>`;
    } else {
      tbody.innerHTML = inqs.map(inq => {
        let badgeStyle = 'background:#fef3c7;color:#92400e;';
        if (inq.status === 'Đã chốt hợp đồng') badgeStyle = 'background:#dcfce7;color:#166534;';
        if (inq.status === 'Đang thảo luận' || inq.status === 'Đang trao đổi') badgeStyle = 'background:#e0f2fe;color:#075985;';
        if (inq.status === 'Đã từ chối') badgeStyle = 'background:#fee2e2;color:#991b1b;';

        return `
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:12px 14px;">
              <strong>${esc(inq.clientName)}</strong><br>
              <span style="font-size:11px;color:#666;">📧 ${esc(inq.clientEmail)}</span><br>
              <span style="font-size:11px;color:#16a34a;">📞 ${esc(inq.clientPhone || 'N/A')}</span>
            </td>
            <td style="padding:12px 14px;">
              <strong>${esc(inq.producerName || 'Chưa chỉ định')}</strong><br>
              <span style="font-size:11px;color:#666;">Ngày gửi: ${esc(inq.createdAt || '')}</span>
            </td>
            <td style="padding:12px 14px;">
              <strong>${esc(inq.serviceType || 'Full Track')}</strong><br>
              <span style="font-family:'DM Mono',monospace;font-size:11px;color:#b45309;">💰 ${esc(inq.budget || 'Thỏa thuận')}</span>
            </td>
            <td style="padding:12px 14px;max-width:240px;">
              ${inq.demoUrl ? `<a href="${inq.demoUrl}" target="_blank" style="color:#2563eb;font-size:11px;display:block;margin-bottom:4px;word-break:break-all;">🔗 Link Demo</a>` : ''}
              <span style="font-size:12px;color:#444;">${esc(inq.notes || 'Không có ghi chú')}</span>
            </td>
            <td style="padding:12px 14px;text-align:center;">
              <select class="hube-inquiry-status-select" data-id="${inq.id}" style="padding:4px 8px;font-size:11px;border-radius:12px;font-weight:bold;${badgeStyle}">
                <option value="Mới tiếp nhận" ${inq.status === 'Mới tiếp nhận' ? 'selected' : ''}>Mới tiếp nhận</option>
                <option value="Đang thảo luận" ${inq.status === 'Đang thảo luận' || inq.status === 'Đang trao đổi' ? 'selected' : ''}>Đang thảo luận</option>
                <option value="Đã chốt hợp đồng" ${inq.status === 'Đã chốt hợp đồng' ? 'selected' : ''}>Đã chốt hợp đồng</option>
                <option value="Đã từ chối" ${inq.status === 'Đã từ chối' ? 'selected' : ''}>Đã từ chối</option>
              </select>
            </td>
            <td style="padding:12px 14px;text-align:right;">
              <button type="button" class="button alt remove delete-hube-inquiry-btn" data-id="${inq.id}" style="padding:4px 8px;font-size:11px;">✕ Xóa</button>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.hube-inquiry-status-select').forEach(sel => {
        sel.onchange = async () => {
          const inq = hube.inquiries.find(x => x.id === sel.dataset.id);
          if (inq) {
            inq.status = sel.value;
            await saveData(data);
            showNotice(`✓ Đã cập nhật trạng thái yêu cầu của "${inq.clientName}" thành "${sel.value}".`);
            renderUniHubeAdmin();
          }
        };
      });

      tbody.querySelectorAll('.delete-hube-inquiry-btn').forEach(btn => {
        btn.onclick = async () => {
          if (confirm('Xác nhận xóa yêu cầu đặt lịch sản xuất này?')) {
            hube.inquiries = hube.inquiries.filter(x => x.id !== btn.dataset.id);
            await saveData(data);
            renderUniHubeAdmin();
            showNotice('✓ Đã xóa yêu cầu sản xuất.');
          }
        };
      });
    }
  }

  // 2. Render Services & Technical Solutions
  const servicesGrid = document.querySelector('#hube-services-admin-grid');
  if (servicesGrid) {
    if (!hube.services || !Array.isArray(hube.services)) {
      hube.services = JSON.parse(JSON.stringify(defaultData.unihube.services));
    }
    servicesGrid.innerHTML = hube.services.map((s, idx) => `
      <div style="background:#fafafa;border:1px solid var(--ink);border-radius:8px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">
            <span style="font-family:'DM Mono',monospace;font-size:10px;color:#d97706;font-weight:bold;text-transform:uppercase;">0${idx+1} / Solution</span>
            <span style="font-family:'DM Mono',monospace;font-size:11px;color:#15803d;font-weight:bold;">${esc(s.price || 'Thỏa thuận')}</span>
          </div>
          <h4 style="margin:2px 0 6px;font-size:15px;line-height:1.2;">${esc(s.title)}</h4>
          <p style="font-size:12px;color:#555;line-height:1.4;margin:0 0 10px;">${esc(s.desc)}</p>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:6px;border-top:1px solid #eee;padding-top:10px;">
          <button type="button" class="button alt edit-hube-service-btn" data-id="${s.id}" style="padding:4px 8px;font-size:10px;">✏️ Sửa</button>
          <button type="button" class="button alt remove delete-hube-service-btn" data-id="${s.id}" style="padding:4px 8px;font-size:10px;">✕ Xóa</button>
        </div>
      </div>
    `).join('');

    servicesGrid.querySelectorAll('.edit-hube-service-btn').forEach(btn => {
      btn.onclick = async () => {
        const s = hube.services.find(x => x.id === btn.dataset.id);
        if (!s) return;
        const newTitle = prompt('Sửa Tên Gói Dịch Vụ:', s.title);
        if (newTitle === null) return;
        const newPrice = prompt('Sửa Mức Giá Niêm Yết:', s.price);
        if (newPrice === null) return;
        const newDesc = prompt('Sửa Mô tả dịch vụ:', s.desc);
        if (newDesc === null) return;

        s.title = newTitle.trim() || s.title;
        s.price = newPrice.trim() || s.price;
        s.desc = newDesc.trim() || s.desc;

        await saveData(data);
        renderUniHubeAdmin();
        showNotice(`✓ Đã cập nhật gói dịch vụ "${s.title}"!`);
      };
    });

    servicesGrid.querySelectorAll('.delete-hube-service-btn').forEach(btn => {
      btn.onclick = async () => {
        if (confirm('Xác nhận xóa gói dịch vụ này khỏi Uni-HUBE?')) {
          hube.services = hube.services.filter(x => x.id !== btn.dataset.id);
          await saveData(data);
          renderUniHubeAdmin();
          showNotice('✓ Đã xóa gói dịch vụ.');
        }
      };
    });
  }

  // 3. Render Producers Roster
  const grid = document.querySelector('#hube-producers-admin-grid');
  if (grid) {
    const list = hube.producers || [];
    grid.innerHTML = list.map(p => `
      <div style="background:#fafafa;border:1px solid var(--ink);border-radius:8px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;">
        <div style="display:flex;gap:12px;margin-bottom:10px;">
          <img src="${p.image || 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=600&q=80'}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;border:1px solid var(--ink);">
          <div>
            <h4 style="margin:0;font-size:15px;">${esc(p.name)}</h4>
            <span style="font-size:11px;color:#d97706;font-family:'DM Mono',monospace;display:block;">${esc(p.role)}</span>
          </div>
        </div>
        <p style="font-size:12px;color:#555;margin:0 0 8px;line-height:1.4;"><strong>Sở trường:</strong> ${esc(p.specialty)}</p>
        <p style="font-size:12px;color:#666;margin:0 0 10px;line-height:1.4;"><strong>Credits:</strong> ${esc(p.credits)}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #eee;padding-top:10px;flex-wrap:wrap;gap:6px;">
          <span style="font-family:'DM Mono',monospace;font-size:11px;font-weight:bold;color:#16a34a;">${esc(p.priceRate || 'Thỏa thuận')}</span>
          <div style="display:flex;gap:6px;">
            <button type="button" class="button manage-producer-tracks-btn" data-id="${p.id}" style="padding:5px 10px;font-size:10px;background:#d97706;color:#fff;border-color:#d97706;font-weight:bold;">
              🎵 Ca khúc (${(p.tracks || []).length})
            </button>
            <button type="button" class="button alt remove delete-hube-producer-btn" data-id="${p.id}" style="padding:5px 8px;font-size:10px;">✕ Xóa</button>
          </div>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.manage-producer-tracks-btn').forEach(btn => {
      btn.onclick = () => openProducerTracksModal(btn.dataset.id);
    });

    grid.querySelectorAll('.delete-hube-producer-btn').forEach(btn => {
      btn.onclick = async () => {
        if (confirm('Xác nhận xóa thành viên này khỏi Uni-HUBE?')) {
          hube.producers = hube.producers.filter(x => x.id !== btn.dataset.id);
          await saveData(data);
          renderUniHubeAdmin();
          showNotice('✓ Đã xóa thành viên khỏi Uni-HUBE.');
        }
      };
    });
  }

  // 3. Render Budget Tiers
  const tiersContainer = document.querySelector('#hube-budget-tiers-container');
  if (tiersContainer) {
    if (!hube.budgetTiers || !Array.isArray(hube.budgetTiers)) {
      hube.budgetTiers = JSON.parse(JSON.stringify(defaultData.unihube.budgetTiers));
    }
    const tiers = hube.budgetTiers;
    tiersContainer.innerHTML = tiers.map((tier, idx) => `
      <div style="display:flex;gap:10px;align-items:center;background:#fafafa;padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;">
        <span style="font-family:'DM Mono',monospace;font-size:11px;color:#92400e;font-weight:bold;min-width:24px;">#${idx+1}</span>
        <input type="text" class="hube-tier-input" data-idx="${idx}" value="${esc(tier)}" style="flex:1;padding:6px 10px;border:1px solid var(--ink);border-radius:4px;font-size:13px;font-family:'Manrope',sans-serif;">
        <button type="button" class="button alt remove delete-hube-tier-btn" data-idx="${idx}" style="padding:4px 8px;font-size:10px;">✕ Xóa</button>
      </div>
    `).join('');

    tiersContainer.querySelectorAll('.hube-tier-input').forEach(input => {
      input.onchange = async () => {
        const idx = parseInt(input.dataset.idx, 10);
        const val = input.value.trim();
        if (val) {
          hube.budgetTiers[idx] = val;
          await saveData(data);
          showNotice(`✓ Đã cập nhật mức ngân sách #${idx+1}.`);
        }
      };
    });

    tiersContainer.querySelectorAll('.delete-hube-tier-btn').forEach(btn => {
      btn.onclick = async () => {
        const idx = parseInt(btn.dataset.idx, 10);
        hube.budgetTiers.splice(idx, 1);
        await saveData(data);
        renderUniHubeAdmin();
        showNotice('✓ Đã xóa mức ngân sách.');
      };
    });
  }
}

document.querySelector('#btn-add-budget-tier')?.addEventListener('click', async () => {
  if (!data.unihube) data.unihube = JSON.parse(JSON.stringify(defaultData.unihube));
  if (!data.unihube.budgetTiers) data.unihube.budgetTiers = JSON.parse(JSON.stringify(defaultData.unihube.budgetTiers));
  
  const custom = prompt('Nhập tên mức ngân sách mới (ví dụ: 15 - 25 Triệu VNĐ - Sản xuất Beat & Mixing):');
  if (custom && custom.trim()) {
    data.unihube.budgetTiers.push(custom.trim());
    await saveData(data);
    renderUniHubeAdmin();
    showNotice(`✓ Đã thêm mức ngân sách: "${custom.trim()}"!`);
  }
});

// ----------------------------------------------------
// PRODUCER TRACKS MODAL CONTROLLER
// ----------------------------------------------------
let selectedProducerForTracks = null;

function openProducerTracksModal(prodId) {
  const p = (data.unihube?.producers || []).find(x => x.id === prodId);
  if (!p) return;
  selectedProducerForTracks = p;
  if (!p.tracks) p.tracks = [];

  const titleEl = document.querySelector('#modal-producer-name-title');
  if (titleEl) titleEl.textContent = `🎵 Quản Lý Ca Khúc: ${p.name}`;

  renderProducerTracksList();
  document.querySelector('#admin-producer-tracks-dialog')?.showModal();
}

function renderProducerTracksList() {
  const tbody = document.querySelector('#modal-producer-tracks-tbody');
  if (!tbody || !selectedProducerForTracks) return;

  const tracks = selectedProducerForTracks.tracks || [];
  if (tracks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding:16px;text-align:center;color:#666;">Chưa có ca khúc nào trong danh sách. Hãy thêm ca khúc ở khung trên.</td></tr>`;
    return;
  }

  tbody.innerHTML = tracks.map((tr, idx) => {
    // Normalize links array
    if (!Array.isArray(tr.links)) {
      tr.links = tr.dspLink ? [{ name: tr.platform || 'Spotify', url: tr.dspLink }] : [];
    }

    const linksHtml = tr.links.map((link, lIdx) => `
      <div style="display:inline-flex;align-items:center;gap:4px;border:1px solid #0b0b0b;padding:2px 6px;border-radius:3px;font-size:10px;font-family:'DM Mono',monospace;background:#fff;margin:2px 3px 2px 0;">
        <a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer" style="color:#0b0b0b;font-weight:bold;text-decoration:none;">${esc(link.name || 'Link')} ↗</a>
        <button type="button" class="delete-track-link-btn" data-tidx="${idx}" data-lidx="${lIdx}" title="Xóa link này" style="background:none;border:none;color:#ef4444;font-weight:bold;cursor:pointer;padding:0 2px;line-height:1;font-size:11px;">✕</button>
      </div>
    `).join('');

    return `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:10px 12px;">
          <strong>${esc(tr.title)}</strong><br>
          <span style="font-size:11px;color:#666;">Ca sĩ: ${esc(tr.artist || 'N/A')} (${esc(tr.releaseYear || '2026')})</span>
        </td>
        <td style="padding:10px 12px;font-size:12px;color:#d97706;">
          ${esc(tr.role || 'Producer')}
        </td>
        <td style="padding:10px 12px;font-size:12px;color:#16a34a;font-weight:bold;">
          ${esc(tr.streams || 'Live')}
        </td>
        <td style="padding:10px 12px;min-width:160px;">
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px;">
            ${linksHtml || '<span style="color:#999;font-size:11px;">Chưa có link</span>'}
            <button type="button" class="button alt add-link-to-track-btn" data-idx="${idx}" style="padding:2px 6px;font-size:10px;font-weight:bold;" title="Thêm link nền tảng mới">+ Link</button>
          </div>
        </td>
        <td style="padding:10px 12px;text-align:right;white-space:nowrap;">
          <button type="button" class="button alt edit-producer-track-btn" data-idx="${idx}" style="padding:3px 6px;font-size:10px;margin-right:4px;">✏️ Sửa</button>
          <button type="button" class="button alt remove delete-single-producer-track-btn" data-idx="${idx}" style="padding:3px 6px;font-size:10px;">✕ Xóa</button>
        </td>
      </tr>
    `;
  }).join('');

  // Delete individual platform link
  tbody.querySelectorAll('.delete-track-link-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const tIdx = parseInt(btn.dataset.tidx, 10);
      const lIdx = parseInt(btn.dataset.lidx, 10);
      selectedProducerForTracks.tracks[tIdx].links.splice(lIdx, 1);
      await saveData(data);
      renderProducerTracksList();
      renderUniHubeAdmin();
      showNotice('✓ Đã xóa link nền tảng.');
    };
  });

  // Add new platform link to existing track
  tbody.querySelectorAll('.add-link-to-track-btn').forEach(btn => {
    btn.onclick = async () => {
      const tIdx = parseInt(btn.dataset.idx, 10);
      const tr = selectedProducerForTracks.tracks[tIdx];
      const platform = prompt(`Nhập tên nền tảng (vd: Spotify, Apple Music, Beatport, YouTube, Zing MP3...):`, 'Spotify');
      if (!platform || !platform.trim()) return;
      const url = prompt(`Nhập link URL cho ${platform.trim()}:`, 'https://');
      if (!url || !url.trim() || url === 'https://') return;

      if (!Array.isArray(tr.links)) tr.links = [];
      tr.links.push({ name: platform.trim(), url: url.trim() });
      await saveData(data);
      renderProducerTracksList();
      renderUniHubeAdmin();
      showNotice(`✓ Đã thêm link ${platform.trim()} cho bài hát "${tr.title}"!`);
    };
  });

  // Edit track metadata
  tbody.querySelectorAll('.edit-producer-track-btn').forEach(btn => {
    btn.onclick = async () => {
      const tIdx = parseInt(btn.dataset.idx, 10);
      const tr = selectedProducerForTracks.tracks[tIdx];
      const newTitle = prompt('Sửa Tên bài hát:', tr.title);
      if (newTitle === null) return;
      const newArtist = prompt('Sửa Tên ca sĩ / nghệ sĩ:', tr.artist);
      if (newArtist === null) return;
      const newRole = prompt('Sửa Vai trò sản xuất (Role/Credit):', tr.role || 'Music Producer');
      if (newRole === null) return;
      const newStreams = prompt('Sửa Thành tích / Lượt stream:', tr.streams || 'Live');
      if (newStreams === null) return;

      tr.title = newTitle.trim() || tr.title;
      tr.artist = newArtist.trim() || tr.artist;
      tr.role = newRole.trim() || tr.role;
      tr.streams = newStreams.trim() || tr.streams;

      await saveData(data);
      renderProducerTracksList();
      renderUniHubeAdmin();
      showNotice(`✓ Đã cập nhật thông tin bài hát "${tr.title}"!`);
    };
  });

  // Delete full track
  tbody.querySelectorAll('.delete-single-producer-track-btn').forEach(btn => {
    btn.onclick = async () => {
      const idx = parseInt(btn.dataset.idx, 10);
      selectedProducerForTracks.tracks.splice(idx, 1);
      await saveData(data);
      renderProducerTracksList();
      renderUniHubeAdmin();
      showNotice(`✓ Đã xóa ca khúc khỏi danh sách của ${selectedProducerForTracks.name}.`);
    };
  });
}

// Add Track inside modal
document.querySelector('#btn-add-track-to-producer')?.addEventListener('click', async () => {
  if (!selectedProducerForTracks) return;
  const title = document.querySelector('#modal-track-title').value.trim();
  const artist = document.querySelector('#modal-track-artist').value.trim();
  const role = document.querySelector('#modal-track-role').value.trim() || 'Music Producer';
  const streams = document.querySelector('#modal-track-streams').value.trim() || 'Live on DSPs';
  const dspLink = document.querySelector('#modal-track-dsplink')?.value.trim() || '';
  const platform = document.querySelector('#modal-track-platform')?.value.trim() || 'Spotify';
  const audioUrl = document.querySelector('#modal-track-audio').value.trim();
  const releaseYear = document.querySelector('#modal-track-year').value.trim() || '2026';

  if (!title || !artist) {
    alert('Vui lòng nhập Tên bài hát và Nghệ sĩ thể hiện.');
    return;
  }

  const links = [];
  if (dspLink) {
    links.push({ name: platform, url: dspLink });
  }

  const newTrack = {
    title,
    artist,
    role,
    streams,
    links,
    audioUrl,
    releaseYear
  };

  selectedProducerForTracks.tracks.unshift(newTrack);
  await saveData(data);
  renderProducerTracksList();
  renderUniHubeAdmin();

  // Clear inputs
  document.querySelector('#modal-track-title').value = '';
  document.querySelector('#modal-track-artist').value = '';
  if (document.querySelector('#modal-track-dsplink')) document.querySelector('#modal-track-dsplink').value = '';
  document.querySelector('#modal-track-audio').value = '';
  document.querySelector('#modal-track-streams').value = '';

  showNotice(`✓ Đã thêm ca khúc "${title}" cho Producer ${selectedProducerForTracks.name}!`);
});

document.querySelector('#close-producer-tracks-dialog-btn')?.addEventListener('click', () => {
  document.querySelector('#admin-producer-tracks-dialog')?.close();
});
document.querySelector('#btn-save-close-producer-tracks')?.addEventListener('click', () => {
  document.querySelector('#admin-producer-tracks-dialog')?.close();
});

// Add Service UI Handlers
document.querySelector('#btn-show-add-hube-service-form')?.addEventListener('click', () => {
  const box = document.querySelector('#add-hube-service-box');
  if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
});
document.querySelector('#btn-cancel-add-hube-service')?.addEventListener('click', () => {
  const box = document.querySelector('#add-hube-service-box');
  if (box) box.style.display = 'none';
});
document.querySelector('#btn-save-new-hube-service')?.addEventListener('click', async () => {
  const title = document.querySelector('#new-service-title').value.trim();
  const price = document.querySelector('#new-service-price').value.trim() || 'Thỏa thuận';
  const desc = document.querySelector('#new-service-desc').value.trim();

  if (!title || !desc) {
    alert('Vui lòng nhập Tên gói dịch vụ và Mô tả chi tiết.');
    return;
  }

  const newService = {
    id: `srv-${Date.now()}`,
    title,
    price,
    desc
  };

  if (!data.unihube) data.unihube = JSON.parse(JSON.stringify(defaultData.unihube));
  if (!data.unihube.services) data.unihube.services = [];
  data.unihube.services.push(newService);

  await saveData(data);
  renderUniHubeAdmin();

  // Clear inputs
  document.querySelector('#new-service-title').value = '';
  document.querySelector('#new-service-price').value = '';
  document.querySelector('#new-service-desc').value = '';
  document.querySelector('#add-hube-service-box').style.display = 'none';

  showNotice(`✓ Đã thêm gói dịch vụ "${title}" vào Uni-HUBE!`);
});

// Add Producer UI Handlers
document.querySelector('#btn-show-add-producer-form')?.addEventListener('click', () => {
  const box = document.querySelector('#add-producer-box');
  if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
});
document.querySelector('#btn-cancel-add-producer')?.addEventListener('click', () => {
  const box = document.querySelector('#add-producer-box');
  if (box) box.style.display = 'none';
});
document.querySelector('#btn-save-new-producer')?.addEventListener('click', async () => {
  const name = document.querySelector('#new-prod-name').value.trim();
  const role = document.querySelector('#new-prod-role').value.trim();
  const specialty = document.querySelector('#new-prod-specialty').value.trim();
  const priceRate = document.querySelector('#new-prod-price').value.trim() || 'Thỏa thuận';
  const image = document.querySelector('#new-prod-image').value.trim() || 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=600&q=80';
  const sampleAudio = document.querySelector('#new-prod-audio').value.trim();
  const credits = document.querySelector('#new-prod-credits').value.trim();
  const bio = document.querySelector('#new-prod-bio').value.trim();

  if (!name || !role) {
    alert('Vui lòng nhập Họ tên và Vai trò chính.');
    return;
  }

  const newProd = {
    id: `prod-${Date.now()}`,
    name,
    role,
    specialty,
    priceRate,
    image,
    sampleAudio,
    credits,
    bio,
    status: 'Sẵn sàng nhận dự án',
    tracks: []
  };

  if (!data.unihube) data.unihube = JSON.parse(JSON.stringify(defaultData.unihube));
  if (!data.unihube.producers) data.unihube.producers = [];
  data.unihube.producers.push(newProd);

  await saveData(data);
  renderUniHubeAdmin();
  document.querySelector('#add-producer-box').style.display = 'none';
  showNotice(`✓ Đã thêm "${name}" vào tổ đội Uni-HUBE!`);
});

document.querySelector('#refresh-hube-inquiries-btn')?.addEventListener('click', () => {
  renderUniHubeAdmin();
  showNotice('✓ Đã làm mới hộp thư Uni-HUBE.');
});

// ==============================================================================
// TAB 11: QUẢN TRỊ 48K COLLECTIVE (MEDIA AGENCY & DISTRO)
// ==============================================================================
function renderCollective48kAdmin() {
  if (!data.collective48k) data.collective48k = JSON.parse(JSON.stringify(defaultData.collective48k));
  const col48k = data.collective48k;

  // 1. Render Proposals Queue
  const tbody = document.querySelector('#collective48k-proposals-tbody');
  if (tbody) {
    const props = col48k.proposals || [];
    if (props.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="padding:24px;text-align:center;color:#666;">Chưa có đề xuất chiến dịch truyền thông nào.</td></tr>`;
    } else {
      tbody.innerHTML = props.map(prop => {
        let badgeStyle = 'background:#faf5ff;color:#6b21a8;';
        if (prop.status === 'Đang triển khai' || prop.status === 'Hoàn tất') badgeStyle = 'background:#dcfce7;color:#166534;';
        if (prop.status === 'Đang lập Media Plan') badgeStyle = 'background:#e0f2fe;color:#075985;';

        return `
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:12px 14px;">
              <strong>${esc(prop.clientName)}</strong><br>
              <span style="font-size:12px;color:#7c3aed;font-weight:bold;">🎵 "${esc(prop.songTitle || 'Dự án mới')}"</span><br>
              <span style="font-size:11px;color:#666;">📧 ${esc(prop.clientEmail)} · 📞 ${esc(prop.clientPhone || 'N/A')}</span>
            </td>
            <td style="padding:12px 14px;">
              <strong>${esc(prop.packageType || 'Chiến dịch 360')}</strong>
            </td>
            <td style="padding:12px 14px;">
              <span style="font-size:11px;color:#666;">Ngày ra mắt:</span> <strong>${esc(prop.releaseDate || 'Chưa định')}</strong><br>
              <span style="font-size:11px;color:#16a34a;">🎯 ${esc(prop.targetGoal || 'Không rõ')}</span>
            </td>
            <td style="padding:12px 14px;">
              <span style="font-family:'DM Mono',monospace;font-size:12px;color:#b45309;font-weight:bold;">${esc(prop.budget || 'Thỏa thuận')}</span>
            </td>
            <td style="padding:12px 14px;text-align:center;">
              <select class="prop-status-select" data-id="${prop.id}" style="padding:4px 8px;font-size:11px;border-radius:12px;font-weight:bold;${badgeStyle}">
                <option value="Chờ phản hồi" ${prop.status === 'Chờ phản hồi' ? 'selected' : ''}>Chờ phản hồi</option>
                <option value="Đang lập Media Plan" ${prop.status === 'Đang lập Media Plan' ? 'selected' : ''}>Đang lập Media Plan</option>
                <option value="Đang triển khai" ${prop.status === 'Đang triển khai' ? 'selected' : ''}>Đang triển khai</option>
                <option value="Hoàn tất" ${prop.status === 'Hoàn tất' ? 'selected' : ''}>Hoàn tất</option>
              </select>
            </td>
            <td style="padding:12px 14px;text-align:right;">
              <button type="button" class="button alt remove delete-proposal-btn" data-id="${prop.id}" style="padding:4px 8px;font-size:11px;">✕ Xóa</button>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.prop-status-select').forEach(sel => {
        sel.onchange = async () => {
          const p = col48k.proposals.find(x => x.id === sel.dataset.id);
          if (p) {
            p.status = sel.value;
            await saveData(data);
            showNotice(`✓ Đã cập nhật trạng thái đề xuất "${p.songTitle}" thành "${sel.value}".`);
            renderCollective48kAdmin();
          }
        };
      });

      tbody.querySelectorAll('.delete-proposal-btn').forEach(btn => {
        btn.onclick = async () => {
          if (confirm('Xác nhận xóa đề xuất chiến dịch này?')) {
            col48k.proposals = col48k.proposals.filter(x => x.id !== btn.dataset.id);
            await saveData(data);
            renderCollective48kAdmin();
            showNotice('✓ Đã xóa đề xuất chiến dịch.');
          }
        };
      });
    }
  }

  // 2. Render Case Studies
  const grid = document.querySelector('#collective48k-casestudies-admin-grid');
  if (grid) {
    const list = col48k.caseStudies || [];
    grid.innerHTML = list.map(cs => `
      <div style="background:#fafafa;border:1px solid var(--ink);border-radius:8px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <img src="${cs.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80'}" style="width:100%;height:140px;object-fit:cover;border-radius:6px;border:1px solid var(--ink);margin-bottom:10px;">
          <span style="font-size:10px;font-family:'DM Mono',monospace;color:#7c3aed;font-weight:bold;text-transform:uppercase;">${esc(cs.client)}</span>
          <h4 style="margin:4px 0 6px;font-size:16px;">${esc(cs.title)}</h4>
          <p style="font-size:11px;color:#16a34a;font-weight:bold;margin:0 0 6px;">⚡ ${esc(cs.tags)}</p>
          <p style="font-size:12px;color:#555;line-height:1.4;margin:0 0 10px;">${esc(cs.summary)}</p>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #eee;padding-top:10px;">
          <span style="font-family:'DM Mono',monospace;font-size:11px;font-weight:bold;color:#0f172a;">📊 ${esc(cs.reach)}</span>
          <button type="button" class="button alt remove delete-casestudy-btn" data-id="${cs.id}" style="padding:4px 8px;font-size:11px;">✕ Xóa</button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.delete-casestudy-btn').forEach(btn => {
      btn.onclick = async () => {
        if (confirm('Xác nhận xóa Case Study này khỏi 48K Collective?')) {
          col48k.caseStudies = col48k.caseStudies.filter(x => x.id !== btn.dataset.id);
          await saveData(data);
          renderCollective48kAdmin();
          showNotice('✓ Đã xóa Case Study.');
        }
      };
    });
  }
}

// Add Case Study UI Handlers
document.querySelector('#btn-show-add-casestudy-form')?.addEventListener('click', () => {
  const box = document.querySelector('#add-casestudy-box');
  if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
});
document.querySelector('#btn-cancel-add-casestudy')?.addEventListener('click', () => {
  const box = document.querySelector('#add-casestudy-box');
  if (box) box.style.display = 'none';
});
document.querySelector('#btn-save-new-casestudy')?.addEventListener('click', async () => {
  const title = document.querySelector('#new-cs-title').value.trim();
  const client = document.querySelector('#new-cs-client').value.trim();
  const tags = document.querySelector('#new-cs-tags').value.trim();
  const reach = document.querySelector('#new-cs-reach').value.trim();
  const image = document.querySelector('#new-cs-image').value.trim() || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80';
  const summary = document.querySelector('#new-cs-summary').value.trim();

  if (!title || !client) {
    alert('Vui lòng nhập Tiêu đề chiến dịch và Khách hàng/Nghệ sĩ.');
    return;
  }

  const newCS = {
    id: `cs-${Date.now()}`,
    title,
    client,
    tags,
    reach,
    image,
    summary
  };

  if (!data.collective48k) data.collective48k = JSON.parse(JSON.stringify(defaultData.collective48k));
  if (!data.collective48k.caseStudies) data.collective48k.caseStudies = [];
  data.collective48k.caseStudies.push(newCS);

  await saveData(data);
  renderCollective48kAdmin();
  document.querySelector('#add-casestudy-box').style.display = 'none';
  showNotice(`✓ Đã thêm Case Study "${title}" vào 48K Collective!`);
});

document.querySelector('#refresh-48k-proposals-btn')?.addEventListener('click', () => {
  renderCollective48kAdmin();
  showNotice('✓ Đã làm mới hộp thư 48K Collective.');
});

// ====================================================
// A&R DEMO DROP & MUSIC SUBMISSIONS MANAGEMENT
// ====================================================
function renderMusicSubmissionsAdmin() {
  const feed = document.querySelector('#admin-submissions-feed');
  if (!feed) return;

  const submissions = data.musicSubmissions || defaultData.musicSubmissions || [];

  // Update Metric Counters
  const totalCountEl = document.querySelector('#admin-total-submissions-count');
  const pendingCountEl = document.querySelector('#admin-pending-submissions-count');
  const signedCountEl = document.querySelector('#admin-signed-submissions-count');

  const pendingSubs = submissions.filter(s => s.status === 'Chờ duyệt' || s.status === 'Đang thẩm định');
  const signedSubs = submissions.filter(s => s.status === 'Đã ký hợp đồng');

  if (totalCountEl) totalCountEl.textContent = submissions.length;
  if (pendingCountEl) pendingCountEl.textContent = pendingSubs.length;
  if (signedCountEl) signedCountEl.textContent = signedSubs.length;

  // Filter & Search Logic
  const statusFilter = document.querySelector('#admin-submission-status-filter')?.value || 'all';
  const searchTerm = (document.querySelector('#admin-submission-search')?.value || '').toLowerCase().trim();

  let filtered = submissions;
  if (statusFilter !== 'all') {
    filtered = filtered.filter(s => s.status === statusFilter);
  }
  if (searchTerm) {
    filtered = filtered.filter(s => {
      const targetStr = `${s.artistName || ''} ${s.fullName || ''} ${s.email || ''} ${(s.genres || []).join(' ')} ${s.bio || ''} ${s.goals || ''}`.toLowerCase();
      return targetStr.includes(searchTerm);
    });
  }

  if (filtered.length === 0) {
    feed.innerHTML = `
      <div style="background:#fff;border:1px dashed #cbd5e1;padding:40px;text-align:center;border-radius:8px;color:#64748b;">
        <div style="font-size:36px;margin-bottom:10px;">📭</div>
        <p style="margin:0;font-size:14px;font-weight:600;">Không có hồ sơ demo nào phù hợp với bộ lọc hiện tại.</p>
        <span style="font-size:12px;opacity:0.8;">Các bản demo gửi từ trang ngoài sẽ tự động xuất hiện tại đây.</span>
      </div>
    `;
    return;
  }

  feed.innerHTML = filtered.map((sub) => {
    const idx = submissions.indexOf(sub);
    const isPending = sub.status === 'Chờ duyệt';
    const isInReview = sub.status === 'Đang thẩm định';
    const isContacted = sub.status === 'Đã liên hệ';
    const isSigned = sub.status === 'Đã ký hợp đồng';

    const statusBg = isSigned ? '#dcfce7; color:#15803d; border-color:#86efac' :
      (isContacted ? '#f3e8ff; color:#6b21a8; border-color:#d8b4fe' :
      (isInReview ? '#e0f2fe; color:#0369a1; border-color:#7dd3fc' :
      (isPending ? '#fef3c7; color:#92400e; border-color:#fcd34d' : '#f1f5f9; color:#475569; border-color:#cbd5e1')));

    const genresHtml = (sub.genres || []).map(g => `
      <span style="font-size:11px;font-weight:700;background:#f1f5f9;color:#334155;padding:3px 8px;border-radius:4px;">${esc(g)}</span>
    `).join('');

    const ratingStars = [1, 2, 3, 4, 5].map(star => `
      <span class="sub-star-btn" data-idx="${idx}" data-star="${star}" style="cursor:pointer;font-size:18px;color:${star <= (sub.rating || 0) ? '#f59e0b' : '#cbd5e1'};">★</span>
    `).join('');

    const socials = sub.socials || {};

    return `
      <div class="submission-card" data-sub-idx="${idx}" style="background:#fff;border:2px solid var(--ink);border-radius:8px;padding:24px;box-shadow:4px 4px 0 var(--ink);">
        <!-- Top Row: Artist Header & Status -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;border-bottom:1px solid #e2e8f0;padding-bottom:14px;margin-bottom:16px;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <span style="font-family:'DM Mono',monospace;font-size:11px;background:#0f172a;color:#fff;padding:2px 6px;border-radius:3px;">
                ${esc(sub.refCode || sub.id)}
              </span>
              <span style="font-size:11px;font-family:'DM Mono',monospace;color:#64748b;">
                📅 Gửi ngày ${esc(sub.submittedAt || 'Mới đây')}
              </span>
            </div>
            <h3 style="margin:0;font-size:22px;letter-spacing:-0.04em;">
              ${esc(sub.artistName || 'Chưa đặt nghệ danh')}
              <span style="font-size:14px;font-weight:normal;color:#64748b;">(${esc(sub.fullName || 'Họ tên')})</span>
            </h3>
            <div style="display:flex;gap:12px;margin-top:6px;font-size:12px;color:#475569;flex-wrap:wrap;">
              <span>📧 <a href="mailto:${esc(sub.email)}" style="font-weight:600;text-decoration:underline;">${esc(sub.email)}</a></span>
              <span>📞 <a href="tel:${esc(sub.phone)}" style="font-weight:600;">${esc(sub.phone)}</a></span>
              <span>📍 ${esc(sub.city || 'Việt Nam')}</span>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-family:'DM Mono',monospace;font-size:11px;font-weight:bold;padding:4px 10px;border-radius:20px;border:1px solid;background:${statusBg};">
              ${esc(sub.status || 'Chờ duyệt')}
            </span>
          </div>
        </div>

        <!-- Genres & Direct Music Stream Links -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;background:#f8fafc;padding:12px 16px;border-radius:6px;border:1px solid #e2e8f0;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span style="font-size:11px;font-family:'DM Mono',monospace;font-weight:bold;color:#475569;">Thể loại:</span>
            ${genresHtml || '<span style="font-size:11px;">Chưa chọn</span>'}
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${sub.demoUrl ? `
              <a href="${esc(sub.demoUrl)}" target="_blank" class="button" style="background:var(--lime);color:var(--ink);border-color:var(--ink);padding:6px 14px;font-size:11px;font-weight:bold;box-shadow:none;">
                ▶ MỞ DEMO STREAMING (SoundCloud / Drive) ↗
              </a>
            ` : '<span style="color:#ef4444;font-size:11px;font-weight:bold;">⚠️ Không có link demo</span>'}

            ${sub.spotifyUrl ? `
              <a href="${esc(sub.spotifyUrl)}" target="_blank" class="button alt" style="padding:6px 12px;font-size:11px;font-weight:bold;">
                🎧 Spotify ↗
              </a>
            ` : ''}

            ${sub.appleMusicUrl ? `
              <a href="${esc(sub.appleMusicUrl)}" target="_blank" class="button alt" style="padding:6px 12px;font-size:11px;font-weight:bold;">
                🍎 Apple Music ↗
              </a>
            ` : ''}
          </div>
        </div>

        <!-- Tracklist Notes if provided -->
        ${sub.tracklistNotes ? `
          <div style="margin-bottom:14px;background:#fff;border:1px solid #e2e8f0;padding:10px 14px;border-radius:4px;font-size:12px;">
            <strong style="color:#0f172a;display:block;margin-bottom:2px;">🎼 Danh sách bài hát / Ghi chú sản xuất:</strong>
            <div style="white-space:pre-wrap;color:#334155;line-height:1.4;">${esc(sub.tracklistNotes)}</div>
          </div>
        ` : ''}

        <!-- Social Media Row -->
        <div style="display:flex;gap:12px;margin-bottom:16px;font-size:12px;flex-wrap:wrap;">
          <span style="font-family:'DM Mono',monospace;color:#64748b;font-weight:bold;">Mạng xã hội:</span>
          ${socials.instagram ? `<a href="${esc(socials.instagram)}" target="_blank" style="color:#e1306c;font-weight:600;">📷 Instagram ↗</a>` : ''}
          ${socials.tiktok ? `<a href="${esc(socials.tiktok)}" target="_blank" style="color:#000;font-weight:600;">🎵 TikTok ↗</a>` : ''}
          ${socials.youtube ? `<a href="${esc(socials.youtube)}" target="_blank" style="color:#dc2626;font-weight:600;">📺 YouTube ↗</a>` : ''}
          ${socials.other ? `<a href="${esc(socials.other)}" target="_blank" style="color:#2563eb;font-weight:600;">🔗 Khác ↗</a>` : ''}
          ${!socials.instagram && !socials.tiktok && !socials.youtube && !socials.other ? '<span style="color:#94a3b8;">Chưa cung cấp link MXH</span>' : ''}
        </div>

        <!-- Artist Statement & Career Goals -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:14px;margin-bottom:16px;">
          <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:14px;border-radius:6px;">
            <strong style="font-size:12px;color:#1e40af;display:block;margin-bottom:4px;">🎯 Mục tiêu & Định hướng hợp tác:</strong>
            <p style="font-size:13px;color:#1e3a8a;margin:0;line-height:1.4;white-space:pre-wrap;">${esc(sub.goals || 'Chưa cung cấp')}</p>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:14px;border-radius:6px;">
            <strong style="font-size:12px;color:#0f172a;display:block;margin-bottom:4px;">✍️ Giới thiệu bản thân & Phong cách âm nhạc:</strong>
            <p style="font-size:13px;color:#334155;margin:0;line-height:1.4;white-space:pre-wrap;">${esc(sub.bio || 'Chưa cung cấp')}</p>
          </div>
        </div>

        ${sub.proudestProject ? `
          <div style="margin-bottom:16px;background:#f0fdf4;border:1px solid #bbf7d0;padding:10px 14px;border-radius:6px;font-size:12px;color:#166534;">
            <strong>🏆 Dự án / Thành tích tự hào:</strong> ${esc(sub.proudestProject)}
          </div>
        ` : ''}

        <!-- A&R Review & Action Toolbar -->
        <div style="border-top:1px solid #e2e8f0;padding-top:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;background:#f8fafc;padding:14px;border-radius:6px;">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:6px;">
              <label style="font-family:'DM Mono',monospace;font-size:11px;font-weight:bold;">Trạng thái:</label>
              <select class="sub-status-select" data-idx="${idx}" style="padding:4px 8px;font-size:11px;font-weight:bold;border:1px solid #94a3b8;background:#fff;border-radius:4px;cursor:pointer;">
                <option value="Chờ duyệt" ${sub.status === 'Chờ duyệt' ? 'selected' : ''}>⏳ Chờ duyệt</option>
                <option value="Đang thẩm định" ${sub.status === 'Đang thẩm định' ? 'selected' : ''}>🔍 Đang thẩm định</option>
                <option value="Đã liên hệ" ${sub.status === 'Đã liên hệ' ? 'selected' : ''}>💬 Đã liên hệ</option>
                <option value="Đã ký hợp đồng" ${sub.status === 'Đã ký hợp đồng' ? 'selected' : ''}>✨ Đã ký hợp đồng</option>
                <option value="Lưu trữ" ${sub.status === 'Lưu trữ' ? 'selected' : ''}>📁 Lưu trữ</option>
              </select>
            </div>

            <div style="display:flex;align-items:center;gap:4px;">
              <label style="font-family:'DM Mono',monospace;font-size:11px;font-weight:bold;">Đánh giá:</label>
              <div style="display:inline-flex;gap:2px;">
                ${ratingStars}
              </div>
            </div>
          </div>

          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button type="button" class="btn-onboard-sub-artist button" data-idx="${idx}" style="background:#2563eb;color:#fff;border-color:#2563eb;font-weight:bold;padding:6px 14px;font-size:11px;">
              ✨ Chuyển thành Nghệ sĩ Portal
            </button>
            <button type="button" class="btn-remove-submission button alt remove" data-idx="${idx}" style="padding:6px 12px;font-size:11px;">
              ✕ Xóa
            </button>
          </div>
        </div>

        <!-- A&R Internal Notes -->
        <div style="margin-top:10px;display:flex;gap:8px;align-items:center;">
          <input type="text" class="sub-admin-notes-input" data-idx="${idx}" value="${esc(sub.adminNotes || '')}" placeholder="Ghi chú nội bộ của A&R (Ví dụ: Giọng tốt, hẹn phỏng vấn thứ 6)..." style="flex:1;padding:6px 10px;font-size:12px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;">
          <button type="button" class="btn-save-sub-notes button alt" data-idx="${idx}" style="padding:6px 12px;font-size:11px;font-weight:bold;">
            💾 Lưu ghi chú
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach Status Change Listener
  feed.querySelectorAll('.sub-status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const idx = parseInt(sel.dataset.idx, 10);
      if (submissions[idx]) {
        submissions[idx].status = sel.value;
        await saveData(data);
        await logAuditEvent('Cập nhật A&R Demo', `Đã đổi trạng thái của "${submissions[idx].artistName}" sang: ${sel.value}`);
        showNotice(`✓ Đã cập nhật trạng thái của "${submissions[idx].artistName}" sang "${sel.value}"!`);
        renderMusicSubmissionsAdmin();
      }
    });
  });

  // Attach Star Rating Click Listener
  feed.querySelectorAll('.sub-star-btn').forEach(starBtn => {
    starBtn.addEventListener('click', async () => {
      const idx = parseInt(starBtn.dataset.idx, 10);
      const rating = parseInt(starBtn.dataset.star, 10);
      if (submissions[idx]) {
        submissions[idx].rating = rating;
        await saveData(data);
        renderMusicSubmissionsAdmin();
      }
    });
  });

  // Attach Save Notes Listener
  feed.querySelectorAll('.btn-save-sub-notes').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const input = feed.querySelector(`.sub-admin-notes-input[data-idx="${idx}"]`);
      if (submissions[idx] && input) {
        submissions[idx].adminNotes = input.value.trim();
        await saveData(data);
        showNotice(`✓ Đã lưu ghi chú A&R cho "${submissions[idx].artistName}"!`);
      }
    });
  });

  // Attach 1-Click Onboard to Artist Portal
  feed.querySelectorAll('.btn-onboard-sub-artist').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const sub = submissions[idx];
      if (!sub) return;

      const artistName = sub.artistName || sub.fullName || 'Nghệ sĩ mới';
      if (!confirm(`Xác nhận chuyển ứng viên "${artistName}" thành Nghệ sĩ chính thức trên Artist Portal?`)) return;

      // Check if already in data.artists
      const existing = (data.artists || []).find(a => (a.email && a.email.toLowerCase() === sub.email?.toLowerCase()) || a.name.toLowerCase() === artistName.toLowerCase());
      if (existing) {
        alert(`Nghệ sĩ "${artistName}" (${sub.email}) đã tồn tại trong danh sách nghệ sĩ!`);
        return;
      }

      const newId = slug(artistName) || ('artist-' + Date.now().toString(36));
      const newArtist = {
        id: newId,
        username: newId,
        password: `${newId.replace(/[^a-zA-Z0-9]/g, '')}@2026`,
        name: artistName,
        email: sub.email || '',
        genre: Array.isArray(sub.genres) ? sub.genres[0] : (sub.genres || 'Independent Music'),
        bio: sub.bio || '',
        image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=85',
        gallery: [],
        showOnWeb: true,
        roleType: 'exclusive',
        monthlyStreams: '0',
        estimatedRevenue: '0',
        payableBalance: '0',
        payoutCycle: 'Hàng tháng (Monthly)',
        royaltyRate: '80% Master',
        contractTerm: '2026 - 2029',
        instagram: sub.socials?.instagram || '',
        youtube: sub.socials?.youtube || '',
        tiktok: sub.socials?.tiktok || '',
        products: []
      };

      if (!data.artists) data.artists = [];
      data.artists.push(newArtist);
      data.artist_order = data.artists.map(a => a.id);

      sub.status = 'Đã ký hợp đồng';
      await saveData(data);
      await logAuditEvent('A&R Onboard Nghệ Sĩ Mới', `Đã kích hoạt tài khoản nghệ sĩ cho "${artistName}" từ hồ sơ Demo.`);
      showNotice(`🎉 ĐÃ ONBOARD THÀNH CÔNG! Nghệ sĩ "${artistName}" đã được đưa vào hệ thống và hiển thị trên Website!`);
      
      selectedArtistId = newId;
      render();
    });
  });

  // Attach Remove Submission Listener
  feed.querySelectorAll('.btn-remove-submission').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const sub = submissions[idx];
      if (!sub) return;

      if (!confirm(`Xác nhận xóa hồ sơ demo của "${sub.artistName || sub.fullName}"?`)) return;

      submissions.splice(idx, 1);
      data.musicSubmissions = submissions;
      await saveData(data);
      await logAuditEvent('Xóa Hồ sơ A&R Demo', `Đã xóa hồ sơ của "${sub.artistName || sub.fullName}".`);
      showNotice(`✓ Đã xóa hồ sơ demo thành công!`);
      renderMusicSubmissionsAdmin();
    });
  });
}

// Filter listeners for A&R Submissions
document.querySelector('#admin-submission-status-filter')?.addEventListener('change', renderMusicSubmissionsAdmin);
document.querySelector('#admin-submission-search')?.addEventListener('input', renderMusicSubmissionsAdmin);

initAccountProvisioning();
render();


