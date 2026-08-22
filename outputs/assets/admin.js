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
      <div class="artist-picker-card ${a.id === selectedArtistId ? 'active' : ''}" data-select-artist-id="${esc(a.id)}" style="position:relative;">
        <img src="${esc(a.image || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=200&q=80')}" alt="${esc(a.name)}">
        <div style="flex:1;min-width:0;">
          <strong style="font-size: 13px; display: block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(a.name || 'Người dùng')}</strong>
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
    `;
  }).join('');

  artistSelectorGrid.querySelectorAll('[data-select-artist-id]').forEach(card => {
    card.addEventListener('click', () => {
      selectedArtistId = card.dataset.selectArtistId;
      renderArtistSelector();
      renderSelectedArtistEditor();
    });
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

    <div class="mini-grid">
      <div class="field"><label>Tên nghệ sĩ / Tên người dùng</label><input data-key="name" value="${esc(a.name)}" required></div>
      <div class="field"><label>ID hệ thống (Slug cố định)</label><input data-key="id" value="${esc(a.id)}" required></div>
      <div class="field"><label>Email đăng nhập Portal (để liên kết tài khoản)</label><input data-key="email" value="${esc(a.email || '')}" placeholder="artist@uniflowslabel.com"></div>
      <div class="field"><label>Thể loại chính / Lĩnh vực</label><input data-key="genre" value="${esc(a.genre || 'Independent')}"></div>
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
            <a class="button alt" href="/listen/${encodeURIComponent(releaseSlug)}" target="_blank" style="padding:6px 12px;font-size:11px;">SmartLink ↗</a>
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

        <!-- Links to Streaming Platforms -->
        <h4 style="margin:12px 0 6px;font-size:12px;text-transform:uppercase;color:#555;">🔗 Link Nền tảng Streaming (Dành cho SmartLink)</h4>
        <div class="mini-grid">
          <div class="field"><label>Spotify URL</label><input class="rel-link-spotify" value="${esc(links.spotify || '')}" placeholder="https://open.spotify.com/..."></div>
          <div class="field"><label>Apple Music URL</label><input class="rel-link-apple" value="${esc(links.apple || '')}" placeholder="https://music.apple.com/..."></div>
          <div class="field"><label>YouTube Music URL</label><input class="rel-link-youtube" value="${esc(links.youtube || '')}" placeholder="https://music.youtube.com/..."></div>
          <div class="field"><label>Zing MP3 URL</label><input class="rel-link-zing" value="${esc(links.zingmp3 || '')}" placeholder="https://zingmp3.vn/..."></div>
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

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:15px;border-top:1px solid var(--line);padding-top:12px;flex-wrap:wrap;gap:10px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <label style="font-size:12px;font-weight:bold;text-transform:uppercase;">Trạng thái:</label>
            <select class="rel-status-select" style="padding:8px;border:1px solid var(--ink);font-weight:bold;background:#fff;">
              <option value="Đang chờ UniFLOWs duyệt" ${status === 'Đang chờ UniFLOWs duyệt' ? 'selected' : ''}>⏳ Đang chờ UniFLOWs duyệt</option>
              <option value="Đã phát hành" ${status === 'Đã phát hành' ? 'selected' : ''}>🟢 Đã phát hành (Live)</option>
              <option value="Yêu cầu gỡ / xóa bản phát hành" ${status === 'Yêu cầu gỡ / xóa bản phát hành' ? 'selected' : ''}>🔴 Yêu cầu gỡ / xóa</option>
            </select>
          </div>
          <button class="button" type="button" data-save-release="${esc(r.id)}" style="padding:10px 18px;">Lưu bản phát hành</button>
        </div>
      </div>
    `;
  }).join('');

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

  releasesBox.querySelectorAll('.remove-split-row-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.split-row')?.remove();
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

      const links = {
        spotify: card.querySelector('.rel-link-spotify')?.value.trim() || '',
        apple: card.querySelector('.rel-link-apple')?.value.trim() || '',
        youtube: card.querySelector('.rel-link-youtube')?.value.trim() || '',
        zingmp3: card.querySelector('.rel-link-zing')?.value.trim() || ''
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

      const targetRel = releases.find(r => r.id === relId);
      const existingMeta = (targetRel && typeof targetRel.metadata === 'object' && targetRel.metadata) ? targetRel.metadata : {};
      const updatedMetadata = { ...existingMeta, streams, revenue, playlists, splits, arFeedback };

      btn.disabled = true; btn.textContent = 'Đang lưu...';

      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('releases').update({
          artwork_url,
          audio_url,
          submission_status: status,
          links,
          metadata: updatedMetadata
        }).eq('id', relId);

        if (error) {
          alert('Lỗi cập nhật Supabase: ' + error.message);
          btn.disabled = false; btn.textContent = 'Lưu bản phát hành';
          return;
        }
      }

      // Notify artist of release status change
      const relArtistId = targetRel?.artist_id;
      const relTitle = targetRel?.title || 'Bản phát hành';
      if (status === 'Đã phát hành') {
        await sendArtistNotification(
          relArtistId,
          '💿 Bản phát hành đã được duyệt',
          `Sản phẩm "${relTitle}" đã được duyệt phát hành và chính thức phân phối trên các nền tảng streaming!`,
          'release'
        );
      } else if (status && status.includes('chờ')) {
        await sendArtistNotification(
          relArtistId,
          '⏳ Bản phát hành đang được A&R xử lý',
          `Sản phẩm "${relTitle}" đang được ban biên tập và A&R UniFLOWs xem xét đối soát Master.`,
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

document.querySelector('#add-artist')?.addEventListener('click', () => {
  const newId = 'artist-' + Date.now().toString(36);
  data.artists.push({
    id: newId,
    name: 'Nghệ sĩ mới',
    email: '',
    showOnWeb: true,
    roleType: 'exclusive',
    genre: 'Pop / Indie',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=85',
    bio: '',
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

document.querySelector('#add-portal-user')?.addEventListener('click', () => {
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

document.querySelector('#add-article')?.addEventListener('click', () => {
  data.articles.unshift({ id: 'bai-viet-' + Date.now().toString(36), date: '08.2026', category: 'News', title: 'Bài viết mới', cover: '', excerpt: '', body: '', published: true });
  render();
});

// Remove artist handler
document.addEventListener('click', async e => {
  const removeArtistIdx = e.target.dataset.removeArtist;
  if (removeArtistIdx !== undefined) {
    const artistEl = e.target.closest('[data-artist]');
    const artistId = artistEl?.dataset.artistId;
    if (!confirm(`Xác nhận xóa nghệ sĩ này khỏi hệ thống?`)) return;

    if (isSupabaseConfigured() && artistId) {
      const { error } = await supabase.from('artists').delete().eq('id', artistId);
      if (error) console.error('Lỗi khi xóa nghệ sĩ trên Supabase:', error);
    }

    data.artists.splice(removeArtistIdx, 1);
    selectedArtistId = data.artists[0]?.id || '';
    render();
  }

  const removeArticleIdx = e.target.dataset.removeArticle;
  if (removeArticleIdx !== undefined) {
    if (!confirm('Xóa bài viết này?')) return;
    data.articles.splice(removeArticleIdx, 1);
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
    tbody.innerHTML = `<tr><td colspan="7" style="padding:20px;text-align:center;color:#64748b;">Chưa có yêu cầu cấp phép Sync nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = requests.map((req, idx) => {
    const isApproved = req.status === 'Đã cấp phép & Đã thanh toán';
    return `
      <tr style="border-bottom:1px solid #e2e8f0;background:${isApproved ? '#f8fafc' : '#fff'};">
        <td style="padding:12px 14px;font-family:'DM Mono',monospace;font-size:12px;color:#64748b;">
          ${esc(req.requestedDate || 'Hôm nay')}
        </td>
        <td style="padding:12px 14px;">
          <strong style="font-size:14px;display:block;">${esc(req.trackTitle)}</strong>
          <span style="font-size:12px;color:#2563eb;">${esc(req.artistName || 'Nghệ sĩ Label')}</span>
        </td>
        <td style="padding:12px 14px;">
          <strong style="font-size:13px;display:block;">${esc(req.clientName)}</strong>
          <small style="color:#64748b;">${esc(req.clientEmail || '—')}</small>
        </td>
        <td style="padding:12px 14px;font-size:12px;">
          <span style="font-weight:600;display:block;">${esc(req.mediaType)}</span>
          <small style="color:#64748b;">${esc(req.territory || 'Việt Nam')} · ${esc(req.term || '1 Năm')}</small>
        </td>
        <td style="padding:12px 14px;font-family:'DM Mono',monospace;font-weight:bold;color:#0f172a;font-size:14px;">
          ₫ ${(req.totalFee || 0).toLocaleString('vi-VN')}
        </td>
        <td style="padding:12px 14px;text-align:center;">
          <span style="font-size:11px;font-weight:bold;padding:3px 8px;border-radius:12px;${isApproved ? 'background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;' : 'background:#fffbeb;color:#b45309;border:1px solid #fde68a;'}">
            ${isApproved ? '🟢 Đã Cấp Phép & Cộng Tiền' : '🟡 Chờ Xét Duyệt'}
          </span>
        </td>
        <td style="padding:12px 14px;text-align:right;">
          ${!isApproved ? `
            <button type="button" class="button btn-grant-sync-license" data-idx="${idx}" style="background:#059669;color:#fff;border-color:#059669;font-size:11px;padding:6px 12px;font-weight:bold;">
              ⚡ Duyệt & Cộng Tiền Portal
            </button>
          ` : `
            <span style="font-size:11px;color:#059669;font-weight:bold;">✓ Đã ghi nhận Portal</span>
          `}
        </td>
      </tr>
    `;
  }).join('');

  // Handle Grant License & Auto-Credit Artist Royalty
  tbody.querySelectorAll('.btn-grant-sync-license').forEach(btn => {
    btn.onclick = async () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const req = requests[idx];
      if (!req) return;

      btn.disabled = true;
      btn.textContent = 'Đang xử lý...';

      // 1. Find matching artist in data.artists
      let matchedArtist = (data.artists || []).find(a => 
        a.name.toLowerCase().trim() === req.artistName.toLowerCase().trim() ||
        (a.products || []).some(p => p.title.toLowerCase().trim() === req.trackTitle.toLowerCase().trim())
      );

      // Default split percentage (default 75% or artist's custom rate)
      let splitPct = 75;
      if (matchedArtist && matchedArtist.publishingRoyaltyRate) {
        splitPct = parseInt(String(matchedArtist.publishingRoyaltyRate).replace(/[^0-9]/g, ''), 10) || 75;
      }

      const totalFee = req.totalFee || 0;
      const artistEarning = Math.round(totalFee * (splitPct / 100));

      // 2. Mark request as approved
      req.status = 'Đã cấp phép & Đã thanh toán';
      req.licensedDate = new Date().toLocaleDateString('vi-VN');
      req.artistSplitPct = splitPct;
      req.artistEarning = artistEarning;

      // 3. Update matched artist's financial balance in Portal
      if (matchedArtist) {
        if (!matchedArtist.publishingContracts) matchedArtist.publishingContracts = [];
        
        // Add contract ledger entry
        matchedArtist.publishingContracts.unshift({
          id: `sync-contract-${Date.now()}`,
          trackTitle: req.trackTitle,
          client: req.clientName,
          mediaType: req.mediaType,
          territory: req.territory || 'Việt Nam',
          term: req.term || '1 Năm',
          totalFee: totalFee,
          artistSplitPct: splitPct,
          artistEarning: artistEarning,
          status: 'Đã cấp phép & Đã thanh toán',
          licensedDate: new Date().toLocaleDateString('vi-VN')
        });

        // Credit to publishingRevenue
        const currentPubRev = parseInt(String(matchedArtist.publishingRevenue || '0').replace(/[^0-9]/g, ''), 10) || 0;
        matchedArtist.publishingRevenue = (currentPubRev + artistEarning).toLocaleString('vi-VN');

        // Credit to payableBalance (Available Cleared Balance for immediate payout)
        const currentPayable = parseInt(String(matchedArtist.payableBalance || '0').replace(/[^0-9]/g, ''), 10) || 0;
        matchedArtist.payableBalance = (currentPayable + artistEarning).toLocaleString('vi-VN');

        // Add persistent in-portal notification
        if (!matchedArtist.notifications) matchedArtist.notifications = [];
        matchedArtist.notifications.unshift({
          id: `notif-pub-${Date.now()}`,
          title: '🎉 Nhận doanh thu Cấp phép Sync Licensing!',
          content: `Hợp đồng cấp phép Sync cho tác phẩm "${req.trackTitle}" (${req.clientName}) đã được Admin duyệt thành công. Khoản thu ₫ ${artistEarning.toLocaleString('vi-VN')} (${splitPct}% Split) đã được cộng trực tiếp vào Số dư khả dụng của bạn!`,
          date: new Date().toLocaleDateString('vi-VN'),
          type: 'financial',
          read: false
        });
      }

      await saveData(data);
      await logAuditEvent('Duyệt Cấp Phép Sync & Phân Bổ Tiền', `Tác phẩm: ${req.trackTitle} - Đơn vị: ${req.clientName} - Nghệ sĩ nhận: ₫ ${artistEarning.toLocaleString('vi-VN')}`);
      
      renderSyncLicenseRequests();
      renderSelectedArtistEditor();
      showNotice(`✓ Đã duyệt cấp phép thành công! Đã tự động cộng ₫ ${artistEarning.toLocaleString('vi-VN')} vào Số dư khả dụng của nghệ sĩ ${matchedArtist?.name || req.artistName}`);
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

render();
