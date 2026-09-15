import { getData, saveData, defaultData, saveSingleArticle, deleteArticleFromSupabase, saveAllArticlesToSupabase } from './data.js';
import { 
  supabase, 
  isSupabaseConfigured, 
  isOfflineModeActive,
  setOfflineMode,
  withTimeout,
  uploadArtworkFile, 
  uploadAudioFile, 
  testSupabaseConnection, 
  getSupabaseUrl, 
  getSupabaseAnonKey, 
  saveCustomSupabaseConfig, 
  resetSupabaseConfig, 
  DEFAULT_SUPABASE_URL, 
  DEFAULT_SUPABASE_ANON_KEY 
} from './supabase.js';
import './security.js';
import { renderDistributionTab, printRoyaltyStatement } from './distribution-report.js';
import { 
  getEmailConfig, 
  saveEmailConfig, 
  sendAccountHandoverEmail, 
  sendReleaseRevisionEmail, 
  sendReleaseRejectedEmail, 
  sendReleaseApprovedEmail, 
  sendArtistNotificationEmail, 
  sendPayoutStatusEmail, 
  sendTestEmail,
  sendBroadcastEmail,
  sendDemoReplyEmail,
  sendTrackPlaylistUpdateEmail,
  sendSpecialRequestStatusEmail,
  sendPhotoRequestStatusEmail,
  sendAppointmentConfirmationEmail
} from './mailer.js';
import { compressImageFile, batchCompressImages, uploadImageSmart, formatBytes } from './image-optimizer.js';

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
const socialsContainer = document.querySelector('#socials-editor-container');
const addSocialBtn = document.querySelector('#add-social-row-btn');
const saveSocialsBtn = document.querySelector('#save-socials-btn');
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

function showNotice(msg, isError = false) {
  if (!notice) return;
  notice.textContent = msg;
  notice.style.display = 'block';
  notice.style.background = isError ? '#fef2f2' : '#f0fdf4';
  notice.style.color = isError ? '#991b1b' : '#166534';
  notice.style.borderColor = isError ? '#f87171' : '#86efac';
  scrollTo({ top: 0, behavior: 'smooth' });
}

// Resilient artist email and profile resolver across local data, Supabase, and fallbacks
export async function resolveArtistObj(artistId) {
  if (!artistId) return null;
  let artist = (data.artists || []).find(a => a.id === artistId || a.username === artistId);
  if (!artist?.email && isSupabaseConfigured()) {
    try {
      const { data: dbArt } = await supabase.from('artists').select('*').or(`id.eq.${artistId},username.eq.${artistId}`).maybeSingle();
      if (dbArt) artist = { ...(artist || {}), ...dbArt };
    } catch {}
  }
  if (!artist?.email) {
    try {
      const acts = JSON.parse(localStorage.getItem('uniflows-artist-accounts') || '[]');
      const acc = acts.find(x => x.id === artistId || x.username === artistId);
      if (acc && acc.email) artist = { ...(artist || {}), ...acc };
    } catch {}
  }
  if (!artist?.email) {
    const def = (defaultData.artists || []).find(d => d.id === artistId);
    if (def && def.email) {
      artist = { ...(artist || {}), ...def };
    } else {
      artist = { ...(artist || {}), id: artistId, name: artist?.name || artistId, email: `${artistId}@uniflowslabel.com` };
    }
  }
  return artist;
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
  if (tabId === 'admin-tab-distribution') {
    renderDistributionTab();
  }
  if (tabId === 'admin-tab-requests') {
    renderSpecialRequestsAdmin();
  }
  if (tabId === 'admin-tab-appointments') {
    renderAppointmentsAdmin();
  }

  // Sync mobile select
  const mobileSelect = document.querySelector('#admin-mobile-tab-select');
  if (mobileSelect && mobileSelect.value !== tabId) {
    mobileSelect.value = tabId;
  }
}

document.querySelectorAll('#admin-tabs .admin-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchAdminTab(btn.dataset.tab);
  });
});

document.querySelector('#admin-mobile-tab-select')?.addEventListener('change', (e) => {
  switchAdminTab(e.target.value);
});

// Royalty Statement Dialog Close & Print Handlers
document.querySelector('#btn-close-royalty-dialog')?.addEventListener('click', () => {
  document.querySelector('#admin-royalty-statement-dialog')?.close();
});
document.querySelector('#btn-print-royalty-dialog')?.addEventListener('click', () => {
  printRoyaltyStatement();
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
// SOCIALS MANAGER (NAVIGATION SOCIALS)
// ----------------------------------------------------
function renderSocialsEditor(socialsList = []) {
  if (!socialsContainer) return;
  const list = Array.isArray(socialsList) && socialsList.length > 0 ? socialsList : (defaultData.socials || []);
  socialsContainer.innerHTML = list.map((item) => `
    <div class="custom-social-row" style="display:flex;gap:10px;align-items:center;">
      <input class="social-row-label" value="${esc(item.label || '')}" placeholder="Tên nền tảng (VD: Instagram, TikTok, Threads...)" style="width:240px;padding:10px;border:1px solid var(--ink);font-weight:600;">
      <input class="social-row-link" value="${esc(item.link || '')}" placeholder="https://..." style="flex:1;padding:10px;border:1px solid var(--ink);">
      <button type="button" class="remove-social-btn button alt" style="padding:10px 14px;" title="Xoá nền tảng">✕</button>
    </div>
  `).join('');

  socialsContainer.querySelectorAll('.remove-social-btn').forEach(btn => {
    btn.onclick = () => btn.closest('.custom-social-row')?.remove();
  });
}

addSocialBtn?.addEventListener('click', () => {
  if (!socialsContainer) return;
  const row = document.createElement('div');
  row.className = 'custom-social-row';
  row.style.cssText = 'display:flex;gap:10px;align-items:center;';
  row.innerHTML = `
    <input class="social-row-label" placeholder="Tên nền tảng mới" style="width:240px;padding:10px;border:1px solid var(--ink);font-weight:600;">
    <input class="social-row-link" placeholder="https://..." style="flex:1;padding:10px;border:1px solid var(--ink);">
    <button type="button" class="remove-social-btn button alt" style="padding:10px 14px;" title="Xoá nền tảng">✕</button>
  `;
  row.querySelector('.remove-social-btn').onclick = () => row.remove();
  socialsContainer.appendChild(row);
});

saveSocialsBtn?.addEventListener('click', async () => {
  if (!socialsContainer) return;
  const newSocials = [];
  socialsContainer.querySelectorAll('.custom-social-row').forEach(row => {
    const label = row.querySelector('.social-row-label')?.value.trim();
    const link = row.querySelector('.social-row-link')?.value.trim();
    if (label && link) {
      newSocials.push({ label, link });
    }
  });
  data.socials = newSocials;
  try {
    saveSocialsBtn.disabled = true;
    saveSocialsBtn.textContent = 'Đang lưu...';
    await saveData(data);
    showNotice('Đã lưu danh sách mạng xã hội thành công.');
  } catch (err) {
    showNotice('Lỗi khi lưu mạng xã hội: ' + err.message, true);
  } finally {
    saveSocialsBtn.disabled = false;
    saveSocialsBtn.textContent = 'Lưu Mạng Xã Hội';
  }
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
            <option value="true" ${ann.active !== false ? 'selected' : ''}>🟢 Hiển thị trên UniPORTAL (by UniENGINE)</option>
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
          <option value="true" selected>🟢 Hiển thị trên UniPORTAL (by UniENGINE)</option>
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
function syncCurrentlyEditedArtistToState() {
  const artistContainer = document.querySelector('[data-artist]');
  if (!artistContainer) return;
  const origArtistId = artistContainer.dataset.artistId;
  const artistIdxStr = artistContainer.dataset.artistIdx;
  const editedArtistData = readItems('[data-artist]', 'artist')[0];

  if (!editedArtistData) return;

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
  } else if (editedArtistData.id || editedArtistData.name) {
    data.artists.push(editedArtistData);
  }

  try {
    localStorage.setItem('uniflows-content', JSON.stringify(data));
  } catch (_) {}
}

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
      syncCurrentlyEditedArtistToState();
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
  syncCurrentlyEditedArtistToState();
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
  attachArtistBalanceEvents(currentArtist, idx);
  attachArtistLiveSync(currentArtist, idx);
  attachArtistProductEvents(currentArtist, idx);
}

const artistEditor = (a, idx) => {
  const isPublic = a.showOnWeb !== false && a.showOnWeb !== 'false';
  if (!Array.isArray(a.products)) a.products = [];

  // Merge any releases from releases queue for this artist if not already in a.products
  (releases || []).forEach(r => {
    if ((r.artist_id === a.id || r.artists?.name === a.name) && !a.products.some(p => p.id === r.id || (p.slug && p.slug === r.slug))) {
      const meta = (typeof r.metadata === 'object' && r.metadata) ? r.metadata : {};
      a.products.push({
        id: r.id,
        title: r.title,
        type: r.type || 'Single',
        slug: r.slug || slug(r.title),
        submissionStatus: r.submission_status || 'Đã phát hành',
        artworkUrl: r.artwork_url || '',
        audioUrl: r.audio_url || '',
        links: r.links || {},
        streams: meta.streams || '0',
        revenue: meta.revenue || '0',
        metadata: meta
      });
    }
  });

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
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button class="button btn-save-current-artist" type="button" data-save-artist="${idx}" style="background:#10b981;color:#fff;border-color:#10b981;font-weight:bold;padding:7px 16px;font-size:12px;cursor:pointer;">💾 Lưu Riêng Nghệ Sĩ Này</button>
        <button class="button alt remove" type="button" data-remove-artist="${idx}" style="padding:6px 12px;font-size:11px;">✕ Xóa tài khoản này</button>
      </div>
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
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button type="button" class="btn-email-artist-handover button" data-artist-idx="${idx}" style="background:#2563eb;color:#fff;border-color:#2563eb;padding:5px 12px;font-size:11px;font-weight:bold;">
            ✉️ Gửi Email Bàn Giao
          </button>
          <button type="button" class="btn-export-artist-handover button" data-artist-idx="${idx}" style="background:#16a34a;color:#fff;border-color:#16a34a;padding:5px 12px;font-size:11px;font-weight:bold;">
            📋 Xuất Phiếu Bàn Giao
          </button>
        </div>
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

    <!-- 03: ARTIST WALLET & FINANCIAL BALANCES (SỐ DƯ & VÍ NGHỆ SĨ) -->
    <div style="background:#fdf2f8;border:2px solid #f472b6;padding:18px;margin:15px 0;border-radius:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div>
          <span class="eyebrow" style="color:#be185d;margin:0;font-size:10px;">Artist Financial Ledger</span>
          <h4 style="margin:2px 0 0;font-size:14px;text-transform:uppercase;color:#9d174d;">💳 Quản Lý Số Dư Khả Dụng & Doanh Thu Nghệ Sĩ</h4>
        </div>
        <span style="font-size:11px;background:#fce7f3;color:#be185d;padding:3px 8px;border-radius:12px;font-family:'DM Mono',monospace;font-weight:bold;">
          Ví Portal Nghệ Sĩ
        </span>
      </div>

      <div class="mini-grid" style="margin-bottom:14px;">
        <div class="field">
          <label style="color:#9d174d;font-weight:bold;">Số dư khả dụng để rút (Payable Balance ₫) *</label>
          <input data-key="payableBalance" class="artist-payable-balance-input" value="${esc(a.payableBalance || '0')}" placeholder="Ví dụ: 18,500,000" style="font-family:'DM Mono',monospace;font-weight:bold;font-size:15px;color:#9d174d;border-color:#f472b6;background:#fff;">
          <small style="color:#64748b;font-size:11px;margin-top:4px;display:block;">💡 Đây là số tiền nghệ sĩ thấy tại mục "Số dư khả dụng" trên Portal và có thể tạo lệnh rút tiền.</small>
        </div>

        <div class="field">
          <label style="color:#1e40af;font-weight:bold;">Tổng doanh thu tích lũy (Estimated Revenue ₫)</label>
          <input data-key="estimatedRevenue" value="${esc(a.estimatedRevenue || '0')}" placeholder="Ví dụ: 25,000,000" style="font-family:'DM Mono',monospace;font-weight:bold;font-size:14px;color:#1e40af;background:#fff;">
          <small style="color:#64748b;font-size:11px;margin-top:4px;display:block;">Tổng thu nhập ước tính ghi nhận trên hệ sinh thái.</small>
        </div>

        <div class="field" style="grid-column: 1 / -1;">
          <label style="color:#059669;font-weight:bold;">Tổng lượt nghe hàng tháng (Monthly Streams)</label>
          <input data-key="monthlyStreams" value="${esc(a.monthlyStreams || '0')}" placeholder="Ví dụ: 450,000" style="font-family:'DM Mono',monospace;font-weight:bold;font-size:14px;color:#059669;background:#fff;">
          <small style="color:#64748b;font-size:11px;margin-top:4px;display:block;">Lượt stream hiển thị trên Portal và Profile nghệ sĩ.</small>
        </div>
      </div>

      <!-- Quick Adjustment Control Bar -->
      <div style="background:#fff;border:1px dashed #f472b6;padding:12px 14px;border-radius:6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
          <span style="font-size:11px;font-weight:bold;color:#be185d;text-transform:uppercase;">⚡ Điều chỉnh nhanh số dư ví:</span>
          <span style="font-size:10.5px;color:#64748b;">(Thao tác này chỉ cập nhật ví nghệ sĩ, tuyệt đối KHÔNG gửi email)</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input type="number" id="quick-adjust-amount-${idx}" placeholder="Nhập số tiền ₫..." style="width:160px;padding:6px 10px;font-size:12px;font-family:'DM Mono',monospace;font-weight:bold;border:1px solid #cbd5e1;border-radius:4px;">
          <input type="text" id="quick-adjust-reason-${idx}" placeholder="Lý do điều chỉnh (Ví dụ: Ứng trước, thưởng, phạt)..." style="flex:1;min-width:200px;padding:6px 10px;font-size:12px;border:1px solid #cbd5e1;border-radius:4px;">
          <button type="button" class="btn-quick-adjust-add button" data-idx="${idx}" style="background:#15803d;color:#fff;border-color:#15803d;font-weight:bold;padding:6px 12px;font-size:11px;">+ Cộng Tiền</button>
          <button type="button" class="btn-quick-adjust-sub button" data-idx="${idx}" style="background:#dc2626;color:#fff;border-color:#dc2626;font-weight:bold;padding:6px 12px;font-size:11px;">- Trừ Tiền</button>
        </div>
      </div>
    </div>

    <!-- 04: MUSIC CATALOG, RELEASES & SMARTLINKS (BẢN PHÁT HÀNH, SMARTLINK & SỐ LIỆU) -->
    <div style="background:#f0f9ff;border:2px solid #0284c7;padding:18px;margin:15px 0;border-radius:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div>
          <span class="eyebrow" style="color:#0284c7;margin:0;font-size:10px;">Music Catalog & SmartLinks</span>
          <h4 style="margin:2px 0 0;font-size:14px;text-transform:uppercase;color:#0369a1;">
            💿 Quản Lý Bản Phát Hành & SmartLink (${(a.products || []).length} tác phẩm)
          </h4>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button type="button" class="btn-artist-add-quick-rel button" data-artist-id="${esc(a.id)}" style="background:#16a34a;color:#fff;border-color:#16a34a;font-weight:bold;padding:6px 14px;font-size:11px;display:inline-flex;align-items:center;gap:4px;cursor:pointer;">
            ⚡ + Phát Hành Nhanh Cho Nghệ Sĩ Này
          </button>
        </div>
      </div>
      <p style="font-size:12px;color:#475569;margin:0 0 14px;line-height:1.4;">
        Admin có thể chỉnh sửa trực tiếp đường dẫn SmartLink (<code>/listen?release=...</code>), liên kết các nền tảng (Spotify, Apple Music, YouTube Music, Zing MP3, TikTok) và cập nhật số liệu lượt nghe & doanh thu cho từng bài hát của nghệ sĩ.
      </p>

      <div class="artist-products-container" style="display:flex;flex-direction:column;gap:12px;">
        ${(!a.products || a.products.length === 0) ? `
          <div style="text-align:center;padding:22px;background:#fff;border:1px dashed #7dd3fc;border-radius:6px;color:#64748b;font-size:12px;">
            Chưa có bài hát hoặc bản phát hành nào được gán cho nghệ sĩ này.<br>
            Bấm nút <b>"⚡ + Phát Hành Nhanh Cho Nghệ Sĩ Này"</b> ở trên để tạo bản phát hành ngay lập tức lên Web!
          </div>
        ` : a.products.map((p, pIdx) => renderArtistProductCard(p, pIdx, a, idx)).join('')}
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

function attachArtistBalanceEvents(artist, idx) {
  const container = document.querySelector(`.item-editor[data-artist-idx="${idx}"]`);
  if (!container) return;

  const balanceInput = container.querySelector('.artist-payable-balance-input');
  const addBtn = container.querySelector(`.btn-quick-adjust-add[data-idx="${idx}"]`);
  const subBtn = container.querySelector(`.btn-quick-adjust-sub[data-idx="${idx}"]`);
  const amtInput = container.querySelector(`#quick-adjust-amount-${idx}`);
  const reasonInput = container.querySelector(`#quick-adjust-reason-${idx}`);

  const adjustBalance = async (isAdd) => {
    const rawAmt = amtInput ? parseFloat(amtInput.value) : 0;
    if (!rawAmt || isNaN(rawAmt) || rawAmt <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ (> 0)!');
      return;
    }

    const currentBal = parseInt(String(balanceInput ? balanceInput.value : (artist.payableBalance || 0)).replace(/[^0-9]/g, ''), 10) || 0;
    const delta = isAdd ? rawAmt : -rawAmt;
    const newBal = Math.max(0, currentBal + delta);
    const reason = reasonInput ? reasonInput.value.trim() : '';

    if (!confirm(`Xác nhận ${isAdd ? 'CỘNG' : 'TRỪ'} ₫ ${rawAmt.toLocaleString('vi-VN')} ${isAdd ? 'vào' : 'khỏi'} số dư của nghệ sĩ "${artist.name}"?\n\n- Số dư hiện tại: ₫ ${currentBal.toLocaleString('vi-VN')}\n- Số dư mới: ₫ ${newBal.toLocaleString('vi-VN')}`)) return;

    if (balanceInput) {
      balanceInput.value = newBal.toLocaleString('vi-VN');
    }
    artist.payableBalance = newBal.toLocaleString('vi-VN');

    if (!artist.balanceAdjustments) artist.balanceAdjustments = [];
    artist.balanceAdjustments.unshift({
      id: `adj-${Date.now()}`,
      date: new Date().toISOString(),
      type: isAdd ? 'credit' : 'debit',
      amount: rawAmt,
      previousBalance: currentBal,
      newBalance: newBal,
      reason: reason || (isAdd ? 'Cộng tiền thủ công từ Admin' : 'Trừ tiền thủ công từ Admin'),
      adjustedBy: 'Admin'
    });

    await saveData(data);
    await logAuditEvent('Điều chỉnh số dư ví nghệ sĩ', `Admin đã ${isAdd ? 'cộng' : 'trừ'} ₫ ${rawAmt.toLocaleString('vi-VN')} cho "${artist.name}". Số dư mới: ₫ ${newBal.toLocaleString('vi-VN')}.${reason ? ` Lý do: ${reason}` : ''}`);
    showNotice(`✓ Đã cập nhật số dư cho "${artist.name}": ₫ ${newBal.toLocaleString('vi-VN')} (Thao tác không gửi email)!`);

    if (amtInput) amtInput.value = '';
    if (reasonInput) reasonInput.value = '';
  };

  addBtn?.addEventListener('click', () => adjustBalance(true));
  subBtn?.addEventListener('click', () => adjustBalance(false));
}

function attachArtistLiveSync(artist, idx) {
  const container = document.querySelector(`.item-editor[data-artist-idx="${idx}"]`);
  if (!container) return;

  const updateField = (key, val) => {
    if (key === 'showOnWeb' || key === 'published') {
      val = val === 'true' || val === true;
    }
    if (key === 'gallery') {
      val = typeof val === 'string' ? val.split('\n').map(x => x.trim()).filter(Boolean) : val;
    }
    artist[key] = val;
    if (data.artists && data.artists[idx]) {
      data.artists[idx][key] = val;
    }
    try {
      localStorage.setItem('uniflows-content', JSON.stringify(data));
    } catch (_) {}
  };

  container.addEventListener('input', (e) => {
    const input = e.target;
    if (!input || !input.dataset || !input.dataset.key) return;
    const key = input.dataset.key;
    const val = input.type === 'checkbox' ? input.checked : input.value.trim();
    updateField(key, val);

    if (key === 'name') {
      const cardName = document.querySelector(`[data-select-artist-id="${artist.id}"] strong`);
      if (cardName) cardName.textContent = input.value || 'Người dùng';
    }
  });

  container.addEventListener('change', (e) => {
    const input = e.target;
    if (!input || !input.dataset || !input.dataset.key) return;
    const key = input.dataset.key;
    const val = input.type === 'checkbox' ? input.checked : input.value.trim();
    updateField(key, val);
  });

  // Dedicated Save Current Artist Button
  const saveBtnCurrent = container.querySelector('.btn-save-current-artist');
  if (saveBtnCurrent) {
    saveBtnCurrent.onclick = async () => {
      saveBtnCurrent.disabled = true;
      const origText = saveBtnCurrent.textContent;
      saveBtnCurrent.textContent = '⏳ Đang lưu...';

      try {
        const updated = readItems(`.item-editor[data-artist-idx="${idx}"]`, 'artist')[0];
        if (updated) {
          data.artists[idx] = { ...data.artists[idx], ...updated };
        }

        await saveData(data);
        await logAuditEvent('Cập nhật thông tin nghệ sĩ', `Đã lưu hồ sơ và số dư cho nghệ sĩ "${data.artists[idx]?.name || 'Nghệ sĩ'}".`);
        showNotice(`✓ Đã lưu thành công thông tin & số dư cho "${data.artists[idx]?.name || 'Nghệ sĩ'}"!`);
      } catch (err) {
        console.error('Lỗi khi lưu nghệ sĩ:', err);
        showNotice(`✕ Lỗi khi lưu: ${err.message || 'Không thể lưu'}`, true);
      } finally {
        saveBtnCurrent.disabled = false;
        saveBtnCurrent.textContent = origText;
        renderArtistSelector();
      }
    };
  }
}

function renderArtistProductCard(p, pIdx, a, aIdx) {
  const pSlug = p.slug || slug(p.title);
  const smartLinkUrl = `${location.origin}/listen?release=${encodeURIComponent(pSlug)}`;
  const pArtwork = p.artworkUrl || a.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80';
  const links = p.links || {};

  return `
    <div class="artist-product-item-card" data-prod-idx="${pIdx}" style="background:#fff;border:1px solid #bae6fd;border-radius:6px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;gap:12px;align-items:center;">
          <img src="${esc(pArtwork)}" alt="Artwork" style="width:52px;height:52px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1;flex-shrink:0;">
          <div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:bold;background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:3px;">${esc(p.type || 'Single')}</span>
              <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:bold;background:${p.submissionStatus === 'Đã phát hành' ? '#dcfce7;color:#15803d' : '#fef3c7;color:#b45309'};padding:2px 6px;border-radius:3px;">● ${esc(p.submissionStatus || 'Đã phát hành')}</span>
            </div>
            <h5 style="margin:4px 0 0;font-size:15px;font-weight:800;color:#0f172a;">${esc(p.title || 'Untitled Track')}</h5>
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          <a href="/listen?release=${encodeURIComponent(pSlug)}" target="_blank" class="button alt" style="padding:4px 10px;font-size:11px;font-weight:bold;color:#0284c7;border-color:#7dd3fc;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
            🔗 Mở SmartLink
          </a>
          <button type="button" class="btn-copy-prod-smartlink button alt" data-url="${esc(smartLinkUrl)}" style="padding:4px 8px;font-size:11px;font-weight:bold;">
            📋 Chép Link
          </button>
          <button type="button" class="btn-save-single-product button" data-artist-idx="${aIdx}" data-prod-idx="${pIdx}" style="background:#10b981;color:#fff;border-color:#10b981;font-weight:bold;padding:5px 12px;font-size:11px;cursor:pointer;">
            💾 Lưu Bài Này
          </button>
          <button type="button" class="btn-delete-single-product button alt remove" data-artist-idx="${aIdx}" data-prod-idx="${pIdx}" style="padding:4px 8px;font-size:11px;cursor:pointer;">
            ✕
          </button>
        </div>
      </div>

      <!-- Main Metadata & Metrics Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #e2e8f0;margin-bottom:10px;">
        <div class="field" style="margin:0;">
          <label style="font-size:10.5px;font-weight:bold;color:#1e293b;">Tiêu đề bài hát (Track Title)</label>
          <input class="prod-input-title" value="${esc(p.title || '')}" style="font-size:12px;padding:6px 8px;background:#fff;">
        </div>
        <div class="field" style="margin:0;">
          <label style="font-size:10.5px;font-weight:bold;color:#1e293b;">Định dạng (Type)</label>
          <select class="prod-input-type" style="font-size:12px;padding:6px 8px;background:#fff;">
            <option value="Single" ${p.type === 'Single' ? 'selected' : ''}>Single</option>
            <option value="EP" ${p.type === 'EP' ? 'selected' : ''}>EP</option>
            <option value="Album" ${p.type === 'Album' ? 'selected' : ''}>Album</option>
            <option value="Remix" ${p.type === 'Remix' ? 'selected' : ''}>Remix</option>
          </select>
        </div>
        <div class="field" style="margin:0;">
          <label style="font-size:10.5px;font-weight:bold;color:#1e293b;">Trạng thái phát hành</label>
          <select class="prod-input-status" style="font-size:12px;padding:6px 8px;background:#fff;font-weight:600;">
            <option value="Đã phát hành" ${p.submissionStatus === 'Đã phát hành' ? 'selected' : ''}>🟢 Đã phát hành (Live)</option>
            <option value="Chờ duyệt" ${p.submissionStatus && p.submissionStatus.includes('chờ') ? 'selected' : ''}>🟡 Chờ duyệt</option>
            <option value="Đã gỡ" ${p.submissionStatus && p.submissionStatus.includes('gỡ') ? 'selected' : ''}>🔴 Đã gỡ (Takedown)</option>
          </select>
        </div>
        <div class="field" style="margin:0;">
          <label style="font-size:10.5px;font-weight:bold;color:#0284c7;">Đường dẫn Slug SmartLink (/listen?release=...)</label>
          <input class="prod-input-slug" value="${esc(pSlug)}" style="font-size:12px;font-family:'DM Mono',monospace;font-weight:bold;padding:6px 8px;color:#0284c7;background:#fff;">
        </div>
        <div class="field" style="margin:0;">
          <label style="font-size:10.5px;font-weight:bold;color:#059669;">Số lượt nghe (Streams)</label>
          <input class="prod-input-streams" value="${esc(p.streams || '0')}" placeholder="Ví dụ: 290,000" style="font-size:12px;font-family:'DM Mono',monospace;font-weight:bold;padding:6px 8px;color:#059669;background:#fff;">
        </div>
        <div class="field" style="margin:0;">
          <label style="font-size:10.5px;font-weight:bold;color:#b45309;">Doanh thu bài hát (Revenue ₫)</label>
          <input class="prod-input-revenue" value="${esc(p.revenue || '0')}" placeholder="Ví dụ: 16,000,000" style="font-size:12px;font-family:'DM Mono',monospace;font-weight:bold;padding:6px 8px;color:#b45309;background:#fff;">
        </div>
        <div class="field" style="margin:0;grid-column:1/-1;">
          <label style="font-size:10.5px;font-weight:bold;color:#1e293b;">URL Ảnh Artwork</label>
          <input class="prod-input-artwork" value="${esc(p.artworkUrl || '')}" placeholder="https://..." style="font-size:11px;padding:6px 8px;background:#fff;">
        </div>
      </div>

      <!-- DSP Platform SmartLinks Grid -->
      <div style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:10px 12px;">
        <span style="font-size:10.5px;font-weight:bold;text-transform:uppercase;color:#334155;display:block;margin-bottom:8px;">
          🔗 Liên kết SmartLink Đa Nền Tảng (DSP Platforms):
        </span>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:8px;">
          <div class="field" style="margin:0;">
            <label style="font-size:10px;font-weight:600;color:#166534;">Spotify URL</label>
            <input class="prod-input-spotify" value="${esc(links.spotify || '')}" placeholder="https://open.spotify.com/..." style="font-size:11px;padding:5px 8px;background:#fff;">
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:10px;font-weight:600;color:#991b1b;">Apple Music URL</label>
            <input class="prod-input-apple" value="${esc(links.apple || '')}" placeholder="https://music.apple.com/..." style="font-size:11px;padding:5px 8px;background:#fff;">
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:10px;font-weight:600;color:#b91c1c;">YouTube Music / Video URL</label>
            <input class="prod-input-youtube" value="${esc(links.youtube || '')}" placeholder="https://youtube.com/..." style="font-size:11px;padding:5px 8px;background:#fff;">
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:10px;font-weight:600;color:#4338ca;">Zing MP3 URL</label>
            <input class="prod-input-zing" value="${esc(links.zing || '')}" placeholder="https://zingmp3.vn/..." style="font-size:11px;padding:5px 8px;background:#fff;">
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:10px;font-weight:600;color:#0f172a;">TikTok Sound URL</label>
            <input class="prod-input-tiktok" value="${esc(links.tiktok || '')}" placeholder="https://tiktok.com/music/..." style="font-size:11px;padding:5px 8px;background:#fff;">
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:10px;font-weight:600;color:#ea580c;">SoundCloud URL</label>
            <input class="prod-input-soundcloud" value="${esc(links.soundcloud || '')}" placeholder="https://soundcloud.com/..." style="font-size:11px;padding:5px 8px;background:#fff;">
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:10px;font-weight:600;color:#0284c7;">Amazon Music URL</label>
            <input class="prod-input-amazon" value="${esc(links.amazon || '')}" placeholder="https://music.amazon.com/..." style="font-size:11px;padding:5px 8px;background:#fff;">
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:10px;font-weight:600;color:#0284c7;">Audio Master / Preview URL</label>
            <input class="prod-input-audio" value="${esc(p.audioUrl || '')}" placeholder="https://..." style="font-size:11px;padding:5px 8px;background:#fff;">
          </div>
        </div>
      </div>
    </div>
  `;
}

function attachArtistProductEvents(artist, idx) {
  const container = document.querySelector(`.item-editor[data-artist-idx="${idx}"]`);
  if (!container) return;

  // Add Quick Release button in artist section
  container.querySelectorAll('.btn-artist-add-quick-rel').forEach(btn => {
    btn.onclick = () => {
      const artSelect = document.querySelector('#quick-rel-artist');
      const openBtn = document.querySelector('#btn-open-quick-release-modal');
      if (openBtn) openBtn.click();
      if (artSelect) {
        artSelect.value = artist.id;
      }
    };
  });

  // Copy Smartlink button
  container.querySelectorAll('.btn-copy-prod-smartlink').forEach(btn => {
    btn.onclick = async (e) => {
      const url = btn.dataset.url;
      if (url) {
        try {
          await navigator.clipboard.writeText(url);
          const orig = btn.textContent;
          btn.textContent = '✓ Đã chép!';
          setTimeout(() => { btn.textContent = orig; }, 2000);
        } catch {
          prompt('Sao chép liên kết SmartLink:', url);
        }
      }
    };
  });

  // Save single product
  container.querySelectorAll('.btn-save-single-product').forEach(btn => {
    btn.onclick = async () => {
      const pIdx = parseInt(btn.dataset.prodIdx, 10);
      const card = btn.closest('.artist-product-item-card');
      if (!card || isNaN(pIdx) || !artist.products || !artist.products[pIdx]) return;

      btn.disabled = true;
      const orig = btn.textContent;
      btn.textContent = '⏳ Đang lưu...';

      try {
        const title = card.querySelector('.prod-input-title')?.value.trim() || 'Untitled Track';
        const type = card.querySelector('.prod-input-type')?.value || 'Single';
        const submissionStatus = card.querySelector('.prod-input-status')?.value || 'Đã phát hành';
        const slugVal = card.querySelector('.prod-input-slug')?.value.trim() || slug(title);
        const streams = card.querySelector('.prod-input-streams')?.value.trim() || '0';
        const revenue = card.querySelector('.prod-input-revenue')?.value.trim() || '0';
        const artworkUrl = card.querySelector('.prod-input-artwork')?.value.trim() || '';
        const audioUrl = card.querySelector('.prod-input-audio')?.value.trim() || '';

        const spotify = card.querySelector('.prod-input-spotify')?.value.trim() || '';
        const apple = card.querySelector('.prod-input-apple')?.value.trim() || '';
        const youtube = card.querySelector('.prod-input-youtube')?.value.trim() || '';
        const zing = card.querySelector('.prod-input-zing')?.value.trim() || '';
        const tiktok = card.querySelector('.prod-input-tiktok')?.value.trim() || '';
        const soundcloud = card.querySelector('.prod-input-soundcloud')?.value.trim() || '';
        const amazon = card.querySelector('.prod-input-amazon')?.value.trim() || '';

        const existingProd = artist.products[pIdx];
        const updatedProd = {
          ...existingProd,
          title,
          type,
          submissionStatus,
          slug: slugVal,
          streams,
          revenue,
          artworkUrl: artworkUrl || existingProd.artworkUrl || '',
          audioUrl: audioUrl || existingProd.audioUrl || '',
          links: {
            ...(existingProd.links || {}),
            spotify,
            apple,
            youtube,
            zing,
            tiktok,
            soundcloud,
            amazon
          },
          metadata: {
            ...(existingProd.metadata || {}),
            streams,
            revenue
          }
        };

        artist.products[pIdx] = updatedProd;
        if (data.artists && data.artists[idx] && data.artists[idx].products) {
          data.artists[idx].products[pIdx] = updatedProd;
        }

        // Also sync in releases array if present
        const relMatch = (releases || []).find(r => r.id === updatedProd.id || r.slug === updatedProd.slug);
        if (relMatch) {
          relMatch.title = title;
          relMatch.type = type;
          relMatch.submission_status = submissionStatus;
          relMatch.slug = slugVal;
          relMatch.artwork_url = updatedProd.artworkUrl;
          relMatch.audio_url = updatedProd.audioUrl;
          relMatch.links = updatedProd.links;
          if (!relMatch.metadata) relMatch.metadata = {};
          relMatch.metadata.streams = streams;
          relMatch.metadata.revenue = revenue;
        }

        // Save data to localStorage & Supabase
        await saveData(data);

        // Sync to Supabase releases table if configured
        if (isSupabaseConfigured()) {
          try {
            await withTimeout(supabase.from('releases').upsert({
              id: updatedProd.id,
              artist_id: artist.id,
              title,
              type,
              slug: slugVal,
              submission_status: submissionStatus,
              artwork_url: updatedProd.artworkUrl,
              audio_url: updatedProd.audioUrl,
              links: updatedProd.links,
              metadata: updatedProd.metadata,
              updated_at: new Date().toISOString()
            }), 3000, null);
          } catch (e) {
            console.warn('Lỗi lưu release lên Supabase:', e);
          }
        }

        await logAuditEvent('Cập nhật SmartLink', `Đã lưu SmartLink và số liệu cho "${title}" (${artist.name})`);
        showNotice(`✓ Đã lưu thành công SmartLink & số liệu bài hát "${title}"!`);
        renderSelectedArtistEditor();
        loadReleasesQueue();
      } catch (err) {
        alert(`Lỗi khi lưu bài hát: ${err.message}`);
      } finally {
        btn.disabled = false;
        btn.textContent = orig;
      }
    };
  });

  // Delete single product
  container.querySelectorAll('.btn-delete-single-product').forEach(btn => {
    btn.onclick = async () => {
      const pIdx = parseInt(btn.dataset.prodIdx, 10);
      if (isNaN(pIdx) || !artist.products || !artist.products[pIdx]) return;
      const targetP = artist.products[pIdx];

      if (!confirm(`Bạn có chắc chắn muốn xóa bài hát "${targetP.title}" khỏi danh sách phát hành của nghệ sĩ "${artist.name}"?`)) return;

      artist.products.splice(pIdx, 1);
      if (data.artists && data.artists[idx] && data.artists[idx].products) {
        data.artists[idx].products.splice(pIdx, 1);
      }

      await saveData(data);

      if (isSupabaseConfigured() && targetP.id) {
        try {
          await withTimeout(supabase.from('releases').delete().eq('id', targetP.id), 3000, null);
        } catch (_) {}
      }

      await logAuditEvent('Xóa bản phát hành', `Đã xóa bài hát "${targetP.title}" của ${artist.name}`);
      showNotice(`✓ Đã xóa bài hát "${targetP.title}"!`);
      renderSelectedArtistEditor();
      loadReleasesQueue();
    };
  });
}

// ----------------------------------------------------
// ARTICLES & JOURNAL EDITOR
// ----------------------------------------------------
// ARTICLE GALLERY RENDERER
// ----------------------------------------------------
function renderArticleGalleryHTML(images = [], artIdx) {
  if (!images || images.length === 0) {
    return `<div class="empty-gallery-msg" style="grid-column:1/-1;padding:16px;text-align:center;color:#94a3b8;font-size:12px;border:1px dashed #cbd5e1;border-radius:6px;background:#fff;">Chưa có ảnh nào trong album bài viết này. Hãy kéo thả ảnh hoặc bấm "+ Tải lên nhiều ảnh" ở trên.</div>`;
  }
  return images.map((img, gIdx) => {
    const url = typeof img === 'string' ? img : (img.url || '');
    const caption = typeof img === 'object' ? (img.caption || '') : '';
    const size = typeof img === 'object' ? (img.size || '') : '';
    return `
      <div class="art-gal-card" data-img-idx="${gIdx}" data-art-idx="${artIdx}" style="background:#fff;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 1px 3px rgba(0,0,0,0.06);position:relative;">
        <div style="position:relative;aspect-ratio:16/10;background:#0f172a;overflow:hidden;">
          <img src="${esc(url)}" alt="Photo ${gIdx + 1}" style="width:100%;height:100%;object-fit:cover;display:block;">
          <span style="position:absolute;top:5px;left:5px;background:rgba(0,0,0,0.75);color:#fff;font-size:9.5px;font-weight:bold;padding:2px 6px;border-radius:3px;font-family:'DM Mono',monospace;">#${gIdx + 1}</span>
          ${size ? `<span style="position:absolute;bottom:5px;right:5px;background:#d8ff48;color:#000;font-size:9px;font-weight:bold;padding:2px 5px;border-radius:3px;font-family:'DM Mono',monospace;">${esc(size)}</span>` : ''}
        </div>
        <div style="padding:8px;display:flex;flex-direction:column;gap:6px;flex:1;">
          <input class="art-gal-caption-input" type="text" value="${esc(caption)}" placeholder="Chú thích ảnh..." data-img-idx="${gIdx}" data-art-idx="${artIdx}" style="font-size:11px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;width:100%;background:#f8fafc;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:6px;border-top:1px solid #f1f5f9;">
            <div style="display:flex;gap:3px;">
              <button type="button" class="btn-art-gal-move-up button alt" data-img-idx="${gIdx}" data-art-idx="${artIdx}" title="Di chuyển lên trước" style="padding:2px 7px;font-size:10px;line-height:1.2;">▲</button>
              <button type="button" class="btn-art-gal-move-down button alt" data-img-idx="${gIdx}" data-art-idx="${artIdx}" title="Di chuyển ra sau" style="padding:2px 7px;font-size:10px;line-height:1.2;">▼</button>
            </div>
            <div style="display:flex;gap:3px;">
              <button type="button" class="btn-art-gal-set-cover button alt" data-img-idx="${gIdx}" data-art-idx="${artIdx}" data-img-url="${esc(url)}" title="Đặt làm ảnh bìa bài viết" style="padding:2px 6px;font-size:10px;color:#0284c7;line-height:1.2;">⭐ Bìa</button>
              <button type="button" class="btn-art-gal-delete button alt remove" data-img-idx="${gIdx}" data-art-idx="${artIdx}" title="Xóa ảnh này" style="padding:2px 6px;font-size:10px;line-height:1.2;">✕</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

const articleEditor = (art, idx) => {
  const images = Array.isArray(art.images) ? art.images : [];
  return `
  <div class="item-editor" data-article data-art-idx="${idx}" style="background:#fff;border:1px solid var(--ink);padding:20px;margin-bottom:15px;border-radius:8px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
      <h3 style="margin:0;font-size:18px;">Bài viết #${idx + 1}: ${esc(art.title)}</h3>
      <div style="display:flex;gap:8px;">
        <button class="button save-single-art-btn" type="button" data-save-article="${idx}" style="background:#10b981;border-color:#10b981;color:#fff;padding:6px 14px;font-size:11px;font-weight:bold;">💾 Lưu bài viết này</button>
        <button class="button alt remove" type="button" data-remove-article="${idx}" style="padding:6px 12px;font-size:11px;">✕ Xóa bài viết</button>
      </div>
    </div>
    <div class="mini-grid">
      <div class="field"><label>Tiêu đề bài viết <span style="color:#ef4444;">*</span></label><input data-key="title" value="${esc(art.title)}" placeholder="Tiêu đề bài viết..." required></div>
      <div class="field"><label>ID / Slug bài viết <span style="color:#ef4444;">*</span></label><input data-key="id" value="${esc(art.id)}" placeholder="slug-bai-viet" required></div>
      <div class="field"><label>Thời gian đăng</label><input data-key="date" value="${esc(art.date || new Date().toLocaleDateString('vi-VN'))}"></div>
      <div class="field"><label>Chuyên mục</label><input data-key="category" value="${esc(art.category || 'Tin Tức')}"></div>
      <div class="field"><label>Tác giả / Bút danh</label><input data-key="author" value="${esc(art.author || 'UniFLOWs Editorial')}"></div>
      <div class="field"><label>Thời gian đọc dự kiến</label><input data-key="readTime" value="${esc(art.readTime || '3 phút đọc')}"></div>
      <div class="field" style="grid-column: 1 / -1;">
        <label>URL Ảnh bìa (Hoặc tải tệp lên Supabase / Tự động nén WebP)</label>
        <input data-key="cover" id="article-cover-${idx}" value="${esc(art.cover || '')}" placeholder="https://...">
        <div style="margin-top:6px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <input type="file" accept="image/*" class="article-cover-input" data-target="#article-cover-${idx}" data-status="#art-status-${idx}" style="font-size:11px;">
          <span id="art-status-${idx}" style="font-size:11px;color:#008800;font-weight:600;"></span>
        </div>
      </div>
      <div class="field"><label>Hiển thị trên Tạp chí (news.html)</label><select data-key="published"><option value="true" ${art.published !== false && art.published !== 'false' ? 'selected' : ''}>🟢 Công khai</option><option value="false" ${art.published === false || art.published === 'false' ? 'selected' : ''}>🔴 Ẩn bài viết</option></select></div>
    </div>
    <div class="field" style="margin-top:10px;"><label>Tóm tắt ngắn (Lead / Excerpt)</label><textarea data-key="excerpt" rows="2" placeholder="Tóm tắt nội dung bài viết...">${esc(art.excerpt || '')}</textarea></div>
    <div class="field"><label>Nội dung chi tiết (Hỗ trợ xuống dòng)</label><textarea data-key="body" rows="6" placeholder="Nội dung bài viết đầy đủ...">${esc(art.body || '')}</textarea></div>

    <!-- Multi-image Gallery Section -->
    <div class="field art-gallery-box" data-art-idx="${idx}" style="grid-column:1/-1;margin-top:15px;border-top:1.5px dashed #cbd5e1;padding-top:15px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:10px;">
        <div>
          <label style="font-weight:800;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;display:block;margin:0;color:#0f172a;">
            📸 Album Ảnh Bài Viết (Multi-image Gallery)
          </label>
          <span style="font-size:11px;color:#64748b;">
            Tự động nén WebP siêu nhẹ giảm ~90% dung lượng. Hỗ trợ chọn nhiều ảnh cùng lúc, kéo thả và sắp xếp thứ tự.
          </span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <label class="button" style="background:#0284c7;color:#fff;border-color:#0284c7;padding:6px 14px;font-size:11px;cursor:pointer;font-weight:700;display:inline-flex;align-items:center;gap:4px;">
            <span>+ Tải lên nhiều ảnh</span>
            <input type="file" multiple accept="image/*" class="article-multi-upload-input" data-art-idx="${idx}" style="display:none;">
          </label>
        </div>
      </div>

      <!-- Drag and drop zone -->
      <div class="art-dropzone" data-art-idx="${idx}" style="border:2px dashed #94a3b8;border-radius:8px;padding:16px;text-align:center;background:#f8fafc;cursor:pointer;transition:all 0.2s ease;">
        <span style="font-size:12.5px;color:#475569;font-weight:600;display:block;">
          📥 Kéo &amp; Thả nhiều ảnh vào đây hoặc bấm nút "+ Tải lên nhiều ảnh"
        </span>
        <div class="art-upload-progress" style="display:none;font-size:11.5px;color:#0284c7;font-weight:bold;margin-top:8px;"></div>
      </div>

      <!-- Direct URL Input -->
      <div style="display:flex;gap:8px;margin-top:10px;">
        <input type="text" class="art-manual-img-url" placeholder="Hoặc dán URL ảnh trực tiếp (https://...) rồi bấm Thêm" style="flex:1;font-size:11px;padding:6px 10px;border:1px solid var(--ink);border-radius:4px;">
        <button type="button" class="button alt btn-add-manual-img" data-art-idx="${idx}" style="padding:6px 12px;font-size:11px;font-weight:bold;">+ Thêm URL</button>
      </div>

      <!-- Gallery Grid Container -->
      <div class="article-gallery-container" data-art-idx="${idx}" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:12px;margin-top:14px;">
        ${renderArticleGalleryHTML(images, idx)}
      </div>
      <input type="hidden" data-key="images" class="art-gallery-hidden" id="art-images-json-${idx}" value="${esc(JSON.stringify(images))}">
    </div>
  </div>
`;
};

function attachArticleUploadEvents() {
  // 1. Single Cover Upload with Auto-compression
  document.querySelectorAll('.article-cover-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const inputEl = document.querySelector(e.target.dataset.target);
      const statusEl = document.querySelector(e.target.dataset.status);
      if (statusEl) {
        statusEl.textContent = 'Đang nén WebP & upload...';
        statusEl.style.color = '#0284c7';
      }
      try {
        const compressed = await compressImageFile(file, { maxWidth: 1600, quality: 0.85 });
        const publicUrl = await uploadImageSmart(compressed.file, `article_${Date.now()}`);
        if (inputEl) inputEl.value = publicUrl;
        if (statusEl) {
          statusEl.innerHTML = `✓ Đã upload: <b>${compressed.originalSizeFormatted} ➔ ${compressed.compressedSizeFormatted} (-${compressed.savedPercent}%)</b>`;
          statusEl.style.color = '#15803d';
        }
      } catch (err) {
        if (statusEl) {
          statusEl.textContent = `Lỗi: ${err.message}`;
          statusEl.style.color = '#ef4444';
        }
      }
    });
  });

  // 2. Multi-image gallery handlers for each article
  document.querySelectorAll('[data-article]').forEach(itemEl => {
    const artIdx = parseInt(itemEl.dataset.artIdx, 10);
    const multiInput = itemEl.querySelector('.article-multi-upload-input');
    const dropzone = itemEl.querySelector('.art-dropzone');
    const progressEl = itemEl.querySelector('.art-upload-progress');
    const galleryContainer = itemEl.querySelector('.article-gallery-container');
    const imagesHiddenInput = itemEl.querySelector('.art-gallery-hidden');
    const manualInput = itemEl.querySelector('.art-manual-img-url');
    const addManualBtn = itemEl.querySelector('.btn-add-manual-img');

    if (!galleryContainer || !imagesHiddenInput) return;

    let currentImages = [];
    try {
      currentImages = JSON.parse(imagesHiddenInput.value || '[]');
    } catch {
      currentImages = [];
    }
    currentImages = currentImages.map(img => typeof img === 'string' ? { url: img, caption: '', size: '' } : img);

    const updateGalleryView = () => {
      galleryContainer.innerHTML = renderArticleGalleryHTML(currentImages, artIdx);
      imagesHiddenInput.value = JSON.stringify(currentImages);
      attachGalleryCardEvents();
    };

    const attachGalleryCardEvents = () => {
      // Caption changes
      galleryContainer.querySelectorAll('.art-gal-caption-input').forEach(capInput => {
        capInput.oninput = (e) => {
          const gIdx = parseInt(e.target.dataset.imgIdx, 10);
          if (currentImages[gIdx]) {
            currentImages[gIdx].caption = e.target.value;
            imagesHiddenInput.value = JSON.stringify(currentImages);
          }
        };
      });

      // Move Up
      galleryContainer.querySelectorAll('.btn-art-gal-move-up').forEach(btn => {
        btn.onclick = () => {
          const gIdx = parseInt(btn.dataset.imgIdx, 10);
          if (gIdx > 0) {
            const temp = currentImages[gIdx];
            currentImages[gIdx] = currentImages[gIdx - 1];
            currentImages[gIdx - 1] = temp;
            updateGalleryView();
          }
        };
      });

      // Move Down
      galleryContainer.querySelectorAll('.btn-art-gal-move-down').forEach(btn => {
        btn.onclick = () => {
          const gIdx = parseInt(btn.dataset.imgIdx, 10);
          if (gIdx < currentImages.length - 1) {
            const temp = currentImages[gIdx];
            currentImages[gIdx] = currentImages[gIdx + 1];
            currentImages[gIdx + 1] = temp;
            updateGalleryView();
          }
        };
      });

      // Set as Cover
      galleryContainer.querySelectorAll('.btn-art-gal-set-cover').forEach(btn => {
        btn.onclick = () => {
          const coverInput = itemEl.querySelector(`#article-cover-${artIdx}`);
          if (coverInput && btn.dataset.imgUrl) {
            coverInput.value = btn.dataset.imgUrl;
            showNotice('✓ Đã chọn ảnh này làm ảnh bìa bài viết!');
          }
        };
      });

      // Delete
      galleryContainer.querySelectorAll('.btn-art-gal-delete').forEach(btn => {
        btn.onclick = () => {
          const gIdx = parseInt(btn.dataset.imgIdx, 10);
          if (confirm('Xóa ảnh này khỏi album bài viết?')) {
            currentImages.splice(gIdx, 1);
            updateGalleryView();
          }
        };
      });
    };

    // Process files batch
    const handleFilesBatch = async (files) => {
      if (!files || files.length === 0) return;
      if (progressEl) {
        progressEl.style.display = 'block';
        progressEl.style.color = '#0284c7';
        progressEl.textContent = `Đang nén & tối ưu ${files.length} ảnh...`;
      }
      try {
        const results = await batchCompressImages(files, { maxWidth: 1600, quality: 0.85 }, (p) => {
          if (progressEl) {
            progressEl.textContent = `Đang tối ưu ảnh ${p.current}/${p.total} (${p.percent}%)...`;
          }
        });

        for (const res of results) {
          if (res.success) {
            const publicUrl = await uploadImageSmart(res.result.file, `art_gal_${Date.now()}`);
            currentImages.push({
              url: publicUrl,
              caption: '',
              size: `${res.result.compressedSizeFormatted} (-${res.result.savedPercent}%)`
            });
          }
        }
        if (progressEl) {
          progressEl.textContent = `✓ Đã nén và thêm ${results.filter(r => r.success).length} ảnh thành công!`;
          progressEl.style.color = '#15803d';
          setTimeout(() => { progressEl.style.display = 'none'; }, 4000);
        }
        updateGalleryView();
      } catch (err) {
        if (progressEl) {
          progressEl.textContent = `Lỗi tải ảnh: ${err.message}`;
          progressEl.style.color = '#ef4444';
        }
      }
    };

    // Multi file input listener
    if (multiInput) {
      multiInput.onchange = (e) => {
        handleFilesBatch(e.target.files);
        e.target.value = '';
      };
    }

    // Drag and drop zone
    if (dropzone) {
      dropzone.ondragover = (e) => {
        e.preventDefault();
        dropzone.style.background = '#e0f2fe';
        dropzone.style.borderColor = '#0284c7';
      };
      dropzone.ondragleave = (e) => {
        e.preventDefault();
        dropzone.style.background = '#f8fafc';
        dropzone.style.borderColor = '#94a3b8';
      };
      dropzone.ondrop = (e) => {
        e.preventDefault();
        dropzone.style.background = '#f8fafc';
        dropzone.style.borderColor = '#94a3b8';
        if (e.dataTransfer?.files?.length) {
          handleFilesBatch(e.dataTransfer.files);
        }
      };
    }

    // Add manual URL
    if (addManualBtn && manualInput) {
      addManualBtn.onclick = () => {
        const val = manualInput.value.trim();
        if (!val) return;
        currentImages.push({
          url: val,
          caption: '',
          size: 'External URL'
        });
        manualInput.value = '';
        updateGalleryView();
      };
    }

    // Initial attachment of card events
    attachGalleryCardEvents();
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
      const res = await withTimeout(
        supabase
          .from('payout_requests')
          .select('*, artists(name)')
          .order('created_at', { ascending: false }),
        2500,
        null
      );

      if (res && !res.error && res.data) {
        list = res.data;
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

    const matchedArtist = (data.artists || []).find(a => a.id === req.artist_id || a.username === req.artist_id);
    const resolvedEmail = bank.email || matchedArtist?.email || '';

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

        <div style="margin:8px 0 14px;padding:10px 12px;background:#f8fafc;border:1px dashed #cbd5e1;display:flex;align-items:center;gap:10px;font-size:12px;">
          <span style="font-weight:bold;color:#334155;white-space:nowrap;">📧 Email nhận thông báo:</span>
          <input class="payout-artist-email-input" type="email" value="${esc(resolvedEmail)}" placeholder="Nhập email nghệ sĩ hoặc email test của bạn..." style="flex:1;padding:6px 10px;border:1px solid #cbd5e1;font-size:12px;background:#fff;font-family:monospace;">
          <span style="color:#64748b;font-size:11px;">(Sẽ gửi thư xác nhận / từ chối tới email này)</span>
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
      const targetEmail = card?.querySelector('.payout-artist-email-input')?.value.trim() || '';

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

      // Send automated email for payout update if enabled
      let artistObj = await resolveArtistObj(artistId) || {};
      if (targetEmail) {
        artistObj.email = targetEmail;
      }

      const payoutReq = (payoutRequests || []).find(x => x.id === payoutId) || {};
      const payoutData = {
        id: payoutId,
        amount: amount || payoutReq.amount || '0',
        bank_info: payoutReq.bank_info || {},
        created_at: payoutReq.created_at || new Date().toISOString()
      };

      let emailNotice = '';
      if (artistObj && artistObj.email && (status === 'Đã thanh toán (Hoàn tất)' || status === 'Từ chối thanh toán')) {
        try {
          const emailRes = await sendPayoutStatusEmail({
            artist: artistObj,
            payout: payoutData,
            status,
            rejectionReason: rejection_reason
          });

          if (emailRes && emailRes.success) {
            emailNotice = ` & đã tự động gửi email thông báo tới "${artistObj.email}"!`;
          } else if (emailRes && !emailRes.disabled && !emailRes.skipped && emailRes.error) {
            emailNotice = ` ⚠️ (Cảnh báo email: ${emailRes.error})`;
            console.warn('Lỗi gửi email đối soát:', emailRes.error);
            alert(`Cập nhật trạng thái thành công, NHƯNG không thể gửi email tới ${artistObj.email}: ${emailRes.error}`);
          } else if (emailRes && emailRes.disabled) {
            emailNotice = ` (Email tự động đang tắt trong Cấu hình)`;
          }
        } catch (eErr) {
          console.warn('Lỗi dispatch email payout:', eErr);
          emailNotice = ` ⚠️ (Lỗi gửi email: ${eErr.message})`;
          alert(`Lỗi hệ thống khi gửi email: ${eErr.message}`);
        }
      } else if (!artistObj?.email) {
        emailNotice = ` ⚠️ (Nghệ sĩ "${artistId}" chưa có địa chỉ email trong hệ thống nên không thể gửi thư)`;
      }

      // Update local storage
      try {
        const cached = JSON.parse(localStorage.getItem('uniflows-payouts') || '[]');
        const idx = cached.findIndex(x => x.id === payoutId);
        if (idx >= 0) {
          cached[idx].status = status;
          cached[idx].rejection_reason = rejection_reason;
          if (targetEmail) {
            cached[idx].bank_info = cached[idx].bank_info || {};
            cached[idx].bank_info.email = targetEmail;
          }
          localStorage.setItem('uniflows-payouts', JSON.stringify(cached));
        }
      } catch {}

      btn.disabled = false; btn.textContent = 'Lưu cập nhật';
      showNotice(`✓ Đã cập nhật trạng thái yêu cầu rút tiền: "${status}"${emailNotice}`);
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
      const res = await withTimeout(supabase.from('copyright_reports').select('*').order('created_at', { ascending: false }), 2500, null);
      if (res && !res.error && res.data) {
        list = res.data;
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
      <div class="item-editor" data-copyright-id="${esc(req.id)}" data-artist-id="${esc(req.artist_id || '')}" data-track-title="${esc(req.track_title || req.track || req.title || '')}" style="background:#fff;border:1px solid var(--ink);padding:18px;margin-bottom:14px;border-radius:8px;">
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
      const artistId = card?.dataset.artistId;
      const trackTitle = card?.dataset.trackTitle || 'Tác phẩm';

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

      // Send automated email if artist found
      let emailNotice = '';
      if (artistId) {
        try {
          const artistObj = await resolveArtistObj(artistId);
          if (artistObj && artistObj.email) {
            const notifPayload = {
              title: `[Bản quyền] Cập nhật báo cáo: "${trackTitle}" (${status})`,
              message: `Báo cáo vi phạm bản quyền đối với bài "${trackTitle}" đã được cập nhật trạng thái: "${status}".${admin_notes ? '\n\nPhản hồi từ Ban Quản Trị: ' + admin_notes : ''}`,
              type: 'important',
              action_url: 'portal.html?tab=copyrights'
            };
            const emailRes = await sendArtistNotificationEmail(artistObj, notifPayload);
            if (emailRes && emailRes.success) {
              emailNotice = ` & đã gửi email tới "${artistObj.email}"`;
            }
          }
        } catch (eErr) {
          console.warn('Lỗi gửi email copyright:', eErr);
        }
      }

      btn.disabled = false; btn.textContent = 'Lưu trạng thái';
      showNotice(`✓ Đã cập nhật trạng thái báo cáo bản quyền: "${status}"${emailNotice}`);
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
      const res = await withTimeout(supabase.from('greenlist_requests').select('*').order('created_at', { ascending: false }), 2500, null);
      if (res && !res.error && res.data) {
        list = res.data;
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
      <div class="item-editor" data-greenlist-id="${esc(req.id)}" data-artist-id="${esc(req.artist_id || '')}" data-channel-name="${esc(req.channel_id || req.title || req.platform || 'Kênh')}" style="background:#fff;border:1px solid var(--ink);padding:18px;margin-bottom:14px;border-radius:8px;">
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
      const artistId = card?.dataset.artistId;
      const channelName = card?.dataset.channelName || 'Kênh';

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

      // Send automated email if artist found
      let emailNotice = '';
      if (artistId) {
        try {
          const artistObj = await resolveArtistObj(artistId);
          if (artistObj && artistObj.email) {
            const notifPayload = {
              title: `[Greenlist] Cập nhật kênh: "${channelName}" (${status})`,
              message: `Yêu cầu cấp quyền Green-list cho ${channelName} đã được cập nhật trạng thái: "${status}".${admin_notes ? '\n\nGhi chú từ A&R: ' + admin_notes : ''}`,
              type: status.includes('cấp quyền') ? 'update' : 'important',
              action_url: 'portal.html?tab=greenlist'
            };
            const emailRes = await sendArtistNotificationEmail(artistObj, notifPayload);
            if (emailRes && emailRes.success) {
              emailNotice = ` & đã gửi email tới "${artistObj.email}"`;
            }
          }
        } catch (eErr) {
          console.warn('Lỗi gửi email greenlist:', eErr);
        }
      }

      btn.disabled = false; btn.textContent = 'Lưu cập nhật';
      showNotice(`✓ Đã cập nhật trạng thái Green-list: "${status}"${emailNotice}`);
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
      const res = await withTimeout(
        supabase
          .from('releases')
          .select('*, artists(name)')
          .order('created_at', { ascending: false }),
        3000,
        null
      );

      if (res && !res.error && Array.isArray(res.data) && res.data.length > 0) {
        releases = res.data;
        renderDashboard();
        renderPitchingBoard();
      }
    } catch (e) {
      console.warn('Lỗi tải queue từ Supabase (dùng fallback cục bộ):', e);
    }
  }

  // Fallback: If releases is empty (offline or disconnected), populate from artist products
  if (!releases || releases.length === 0) {
    releases = (data.artists || []).flatMap(a => (a.products || []).map(p => ({
      ...p,
      artist_id: a.id,
      artists: { name: a.name }
    })));
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
  } else if (filterVal === 'draft') {
    filtered = filtered.filter(r => r.submission_status === 'Bản nháp' || r.submissionStatus === 'Bản nháp');
  } else if (filterVal === 'takedown') {
    filtered = filtered.filter(r => r.submission_status && r.submission_status.includes('gỡ'));
  }

  if (filtered.length === 0) {
    releasesBox.innerHTML = '<p class="empty" style="padding:15px;background:#fff;border:1px solid var(--line);">Không tìm thấy bản phát hành nào theo bộ lọc này.</p>';
    return;
  }

  releasesBox.innerHTML = filtered.map(r => {
    const artistObj = (data.artists || []).find(a => a.id === r.artist_id || a.username === r.artist_id);
    const artistName = r.artists?.name || artistObj?.name || r.artist_id || 'Nghệ sĩ';
    const artistEmail = artistObj?.email || '';
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
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button type="button" class="button view-admin-meta-btn" data-meta-id="${esc(r.id)}" style="padding:6px 14px;font-size:11px;background:#2563eb;color:#fff;border-color:#2563eb;font-weight:bold;display:inline-flex;align-items:center;gap:4px;">
              🔍 Toàn Bộ Metadata
            </button>
            <button type="button" class="button alt view-admin-epk-btn" data-epk-id="${esc(r.id)}" style="padding:6px 12px;font-size:11px;background:#f8fafc;border-color:var(--ink);font-weight:bold;">📄 Xem EPK</button>
            <a class="button alt" href="/listen?release=${encodeURIComponent(releaseSlug)}" target="_blank" style="padding:6px 12px;font-size:11px;">SmartLink ↗</a>
            <button class="button alt remove" type="button" data-delete-release="${esc(r.id)}" style="padding:6px 10px;font-size:11px;">✕ Xóa</button>
          </div>
        </div>

        <!-- A&R SUBMISSION METADATA SNAPSHOT -->
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:12px 16px;margin:12px 0;display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;font-size:12px;">
          <div>
            <span style="font-size:10px;color:#64748b;text-transform:uppercase;font-weight:bold;display:block;">✍️ Nhạc sĩ (Songwriters):</span>
            <strong style="color:#0f172a;">${esc(meta.songwriters || 'Chưa cung cấp')}</strong>
          </div>
          <div>
            <span style="font-size:10px;color:#64748b;text-transform:uppercase;font-weight:bold;display:block;">🎛️ Producer / Beatmaker:</span>
            <strong style="color:#0f172a;">${esc(meta.producers || 'Chưa cung cấp')}</strong>
          </div>
          <div>
            <span style="font-size:10px;color:#64748b;text-transform:uppercase;font-weight:bold;display:block;">💰 Royalty Splits:</span>
            <strong style="color:#15803d;">${meta.splits?.length > 0 ? meta.splits.map(s => `${esc(s.artistName || s.artistId)} (${s.percentage}%)`).join(' + ') : '100% Nghệ sĩ chính'}</strong>
          </div>
          <div>
            <span style="font-size:10px;color:#64748b;text-transform:uppercase;font-weight:bold;display:block;">📅 Ngày phát hành:</span>
            <strong style="color:#0f172a;">${esc(meta.releaseDate || r.type?.split('·')[1]?.trim() || 'Chưa định ngày')}</strong>
          </div>
          <div>
            <span style="font-size:10px;color:#64748b;text-transform:uppercase;font-weight:bold;display:block;">🌐 Ngôn ngữ & Explicit:</span>
            <strong style="color:#0f172a;">${esc(meta.language || 'Tiếng Việt')} · ${meta.explicit === 'true' || meta.explicit === true ? '<span style="color:#dc2626;font-weight:bold;">[E] Explicit</span>' : '<span style="color:#16a34a;">Clean</span>'}</strong>
          </div>
          <div>
            <span style="font-size:10px;color:#64748b;text-transform:uppercase;font-weight:bold;display:block;">🎬 Cấp phép Sync:</span>
            <strong style="color:${meta.syncLicensingConsent ? '#16a34a' : '#64748b'};">${meta.syncLicensingConsent ? '🟢 Đã ủy quyền Sync' : '⚪ Tắt Sync'}</strong>
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

        <!-- 01B: MULTI-TRACK EP / ALBUM TRACKLIST INSPECTOR -->
        ${(() => {
          const tracklist = r.tracklist || meta.tracklist || [];
          if (!Array.isArray(tracklist) || tracklist.length <= 1) return '';
          return `
            <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:14px;margin:12px 0;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
                <strong style="font-size:12.5px;color:#0f172a;text-transform:uppercase;">
                  💿 Danh Sách Track Trong Album (${tracklist.length} Bài Hát)
                </strong>
                <span style="font-size:11px;background:#0f172a;color:#fff;padding:2px 8px;border-radius:4px;font-family:'DM Mono',monospace;">
                  ${esc(r.type || 'EP / Album')}
                </span>
              </div>
              <div style="display:grid;gap:8px;">
                ${tracklist.map((t, tIdx) => `
                  <div style="display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid #e2e8f0;padding:8px 12px;border-radius:6px;flex-wrap:wrap;gap:8px;">
                    <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:220px;">
                      <b style="font-family:'DM Mono',monospace;font-size:11px;color:#64748b;">#${String(t.trackNum || tIdx + 1).padStart(2, '0')}</b>
                      <strong style="font-size:13px;color:#0f172a;">${esc(t.title || 'Track ' + (tIdx + 1))}</strong>
                      ${t.featuredArtist ? `<small style="color:#64748b;">(feat. ${esc(t.featuredArtist)})</small>` : ''}
                      ${t.explicit ? '<span style="font-size:9.5px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:1px 4px;border-radius:3px;font-weight:bold;">[E]</span>' : ''}
                      ${t.isrc ? `<span style="font-family:'DM Mono',monospace;font-size:10px;color:#0284c7;background:#f0f9ff;padding:1px 5px;border-radius:3px;">ISRC: ${esc(t.isrc)}</span>` : ''}
                    </div>
                    <div>
                      ${t.audioUrl ? `<audio controls src="${esc(t.audioUrl)}" style="height:28px;max-width:240px;"></audio>` : '<small style="color:#94a3b8;font-size:11px;">Chưa có audio</small>'}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        })()}

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

        <div style="margin:12px 0 6px;padding:8px 12px;background:#f8fafc;border:1px dashed #cbd5e1;display:flex;align-items:center;gap:10px;font-size:12px;">
          <span style="font-weight:bold;color:#334155;white-space:nowrap;">📧 Email nghệ sĩ nhận thông báo A&R:</span>
          <input class="rel-artist-email-input" type="email" value="${esc(artistEmail)}" placeholder="email_nghe_si@domain.com (Nhập email của bạn để test nhận thư)" style="flex:1;padding:6px 10px;border:1px solid #cbd5e1;font-size:12px;background:#fff;font-family:monospace;">
          <span style="color:#64748b;font-size:11px;">(Sẽ gửi email khi duyệt, yêu cầu sửa hoặc từ chối)</span>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:15px;border-top:1px solid var(--line);padding-top:12px;flex-wrap:wrap;gap:12px;">
          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:6px;">
              <label style="font-size:12px;font-weight:bold;text-transform:uppercase;">Trạng thái:</label>
              <select class="rel-status-select" style="padding:8px 10px;border:1px solid var(--ink);font-weight:bold;background:#fff;border-radius:4px;">
                <option value="Đang chờ UniFLOWs duyệt" ${status === 'Đang chờ UniFLOWs duyệt' ? 'selected' : ''}>⏳ Đang chờ UniFLOWs duyệt</option>
                <option value="Đã phát hành" ${status === 'Đã phát hành' ? 'selected' : ''}>🟢 Đã phát hành (Live)</option>
                <option value="Bản nháp" ${status === 'Bản nháp' ? 'selected' : ''}>📝 Bản nháp (Artist Draft)</option>
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

        let { error } = await supabase.from('releases').update(updatePayload).eq('id', relId);

        // Fallback resilience if any optional column is missing in schema cache
        if (error && error.message && error.message.includes('column')) {
          const fallbackPayload = {
            links,
            metadata: updatedMetadata,
            submission_status: status
          };
          const fallbackRes = await supabase.from('releases').update(fallbackPayload).eq('id', relId);
          error = fallbackRes.error;
        }

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

      // Send automated email to artist if enabled
      let emailNotice = '';
      try {
        const targetEmailInput = card?.querySelector('.rel-artist-email-input')?.value.trim();
        let targetArtistObj = await resolveArtistObj(relArtistId) || {};
        if (targetEmailInput) {
          targetArtistObj.email = targetEmailInput;
        }

        if (targetArtistObj && targetArtistObj.email) {
          let emailRes = null;
          const releaseData = targetRel || { id: relId, title: relTitle, artist_id: relArtistId };
          if (status === 'Đã phát hành') {
            emailRes = await sendReleaseApprovedEmail(targetArtistObj, releaseData);
          } else if (status === 'Yêu cầu chỉnh sửa' || (status && status.includes('chỉnh sửa'))) {
            emailRes = await sendReleaseRevisionEmail(targetArtistObj, releaseData, arFeedback);
          } else if (status === 'Từ chối duyệt' || (status && status.includes('chối'))) {
            emailRes = await sendReleaseRejectedEmail(targetArtistObj, releaseData, arFeedback);
          }

          if (emailRes && emailRes.success) {
            emailNotice = ` & đã tự động gửi email tới "${targetArtistObj.email}"!`;
          } else if (emailRes && !emailRes.disabled && !emailRes.skipped && emailRes.error) {
            emailNotice = ` ⚠️ (Cảnh báo email: ${emailRes.error})`;
            console.warn('Lỗi gửi email release:', emailRes.error);
            alert(`Lưu bản phát hành thành công, NHƯNG không thể gửi email tới ${targetArtistObj.email}: ${emailRes.error}`);
          } else if (emailRes && emailRes.disabled) {
            emailNotice = ` (Email tự động đang tắt trong Cấu hình)`;
          }
        }

        // Check and send playlist update email if playlists changed
        const oldPlaylists = Array.isArray(existingMeta.playlists) ? existingMeta.playlists : [];
        const addedPlaylists = playlists.filter(p => !oldPlaylists.includes(p));
        if (targetArtistObj && targetArtistObj.email && (addedPlaylists.length > 0 || (playlists.length > 0 && JSON.stringify(playlists) !== JSON.stringify(oldPlaylists)))) {
          sendTrackPlaylistUpdateEmail({
            artist: targetArtistObj,
            trackTitle: relTitle,
            newPlaylists: addedPlaylists.length > 0 ? addedPlaylists : playlists,
            allPlaylists: playlists,
            pitchStatus: status || 'In Playlist',
            notes: arFeedback || 'Ca khúc của bạn đã được ban biên tập đưa vào danh sách phát.'
          }).catch(err => console.warn('Lỗi gửi email playlist update:', err));
        }
      } catch (err) {
        console.warn('Lỗi gửi email release:', err);
        alert(`Lỗi hệ thống khi gửi email xét duyệt: ${err.message}`);
      }

      btn.disabled = false; btn.textContent = 'Lưu bản phát hành';
      showNotice(`✓ Đã cập nhật bản phát hành, góp ý A&R và SmartLink thành công!${emailNotice}`);
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

  // Attach Metadata Inspector view events
  releasesBox.querySelectorAll('.view-admin-meta-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const relId = btn.dataset.metaId;
      openAdminMetadataModal(relId);
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

      // Notify artist of Pitching status change
      try {
        const artistObj = await resolveArtistObj(targetRel.artist_id);
        if (artistObj && artistObj.email) {
          const plArr = (meta.pitchingPlaylists || (Array.isArray(meta.playlists) ? meta.playlists.join(', ') : '')).split(',').map(s => s.trim()).filter(Boolean);
          sendTrackPlaylistUpdateEmail({
            artist: artistObj,
            trackTitle: targetRel.title,
            newPlaylists: plArr,
            allPlaylists: plArr,
            pitchStatus: newStatus,
            notes: `Trạng thái Pitching chiến dịch đã được cập nhật thành "${newStatus}".`
          }).catch(err => console.warn('Lỗi gửi email pitching status:', err));
        }
      } catch (err) {
        console.warn('Lỗi gửi email pitching update:', err);
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

        // Notify artist of target playlists update
        try {
          const artistObj = await resolveArtistObj(targetRel.artist_id);
          if (artistObj && artistObj.email) {
            const plArr = newVal.split(',').map(s => s.trim()).filter(Boolean);
            sendTrackPlaylistUpdateEmail({
              artist: artistObj,
              trackTitle: targetRel.title,
              newPlaylists: plArr,
              allPlaylists: plArr,
              pitchStatus: meta.pitchingStatus || 'Đang Pitching',
              notes: 'Danh sách Playlist mục tiêu cho ca khúc đã được cập nhật.'
            }).catch(err => console.warn('Lỗi gửi email pitching playlists:', err));
          }
        } catch (err) {
          console.warn('Lỗi gửi email pitching update:', err);
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
  renderSocialsEditor(data.socials || defaultData.socials);
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
  populateNotificationArtistDropdown();
  loadSentNotifications();
  updateSupabaseStatusBanner();
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
      if (input.dataset.key === 'showOnWeb' || input.dataset.key === 'published') {
        val = val === 'true' || val === true;
      }
      if (input.dataset.key === 'images') {
        try { val = JSON.parse(val || '[]'); } catch { val = []; }
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

document.querySelector('#add-article')?.addEventListener('click', () => {
  // Sync current DOM values into data.articles first so unsaved edits aren't wiped
  const currentDomArticles = readItems('[data-article]', 'article');
  if (currentDomArticles.length > 0) {
    data.articles = currentDomArticles;
  }
  const newId = 'bai-viet-' + Date.now().toString(36);
  const newArt = {
    id: newId,
    title: 'Bài viết mới',
    category: 'Tin Tức',
    date: new Date().toLocaleDateString('vi-VN'),
    author: 'UniFLOWs Editorial',
    readTime: '3 phút đọc',
    cover: '',
    excerpt: '',
    body: '',
    published: true
  };
  data.articles.unshift(newArt);
  articlesBox.innerHTML = data.articles.map(articleEditor).join('');
  attachArticleUploadEvents();
  showNotice('✓ Đã thêm khung bài viết mới ở đầu danh sách. Nhập nội dung và bấm "Lưu bài viết này"!');
  const firstTitleInput = articlesBox.querySelector('[data-key="title"]');
  if (firstTitleInput) {
    firstTitleInput.focus();
    firstTitleInput.select();
  }
});

// Save all articles button handler
document.querySelector('#save-all-articles-btn')?.addEventListener('click', async () => {
  const btn = document.querySelector('#save-all-articles-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Đang lưu lên Supabase...';
  }
  data.articles = readItems('[data-article]', 'article');
  const res = await saveAllArticlesToSupabase(data.articles);
  if (btn) {
    btn.disabled = false;
    btn.textContent = '💾 Lưu tất cả bài viết lên Supabase';
  }
  if (res.success) {
    showNotice(`✓ Đã lưu toàn bộ ${data.articles.length} bài viết lên Supabase và Website thành công!`);
    await logAuditEvent('Cập nhật bài viết', `Đã lưu toàn bộ danh sách ${data.articles.length} bài viết.`);
  } else {
    showNotice(`⚠️ Đã lưu ${data.articles.length} bài viết vào bộ nhớ cục bộ (Có một số lỗi khi đồng bộ lên Supabase).`);
  }
});

// Remove artist and article handler
document.addEventListener('click', async e => {
  // 1. Single article save handler
  const saveArtBtn = e.target.closest('[data-save-article]');
  if (saveArtBtn) {
    const saveArticleIdx = saveArtBtn.dataset.saveArticle;
    const idxNum = parseInt(saveArticleIdx, 10);
    const itemEl = saveArtBtn.closest('[data-article]');
    if (!itemEl) return;

    const singleObj = {};
    itemEl.querySelectorAll('[data-key]').forEach(input => {
      let val = input.type === 'checkbox' ? input.checked : input.value.trim();
      if (input.dataset.key === 'published') val = val === 'true' || val === true;
      if (input.dataset.key === 'images') {
        try { val = JSON.parse(val || '[]'); } catch { val = []; }
      }
      singleObj[input.dataset.key] = val;
    });

    if (!singleObj.id || !singleObj.title) {
      alert('Vui lòng nhập đầy đủ Tiêu đề và ID / Slug bài viết.');
      return;
    }

    saveArtBtn.disabled = true;
    saveArtBtn.textContent = 'Đang lưu...';

    const res = await saveSingleArticle(singleObj);
    if (idxNum >= 0 && idxNum < data.articles.length && data.articles[idxNum].id === singleObj.id) {
      data.articles[idxNum] = singleObj;
    } else {
      const existingIdx = data.articles.findIndex(a => a.id === singleObj.id);
      if (existingIdx >= 0) {
        data.articles[existingIdx] = singleObj;
      } else {
        data.articles.unshift(singleObj);
      }
    }

    saveArtBtn.disabled = false;
    saveArtBtn.textContent = '💾 Lưu bài viết này';

    if (res.success) {
      showNotice(`✓ Đã lưu bài viết "${singleObj.title}" lên Supabase thành công!`);
      await logAuditEvent('Lưu bài viết', `Đã lưu bài viết: "${singleObj.title}" (${singleObj.id})`);
    } else {
      showNotice(`⚠️ Đã lưu bài viết vào bộ nhớ cục bộ. Lỗi Supabase: ${res.error || 'Mất kết nối'}`);
    }
    return;
  }

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
    return;
  }

  const removeArticleIdx = e.target.dataset.removeArticle;
  if (removeArticleIdx !== undefined) {
    const idxNum = parseInt(removeArticleIdx, 10);
    const article = data.articles[idxNum];
    if (!confirm(`Xóa bài viết "${article?.title || ''}"?`)) return;
    if (article?.id) {
      await deleteArticleFromSupabase(article.id);
    }
    data.articles.splice(idxNum, 1);
    articlesBox.innerHTML = data.articles.map(articleEditor).join('');
    attachArticleUploadEvents();
    showNotice('✓ Đã xóa bài viết khỏi Supabase và cập nhật Website!');
    await logAuditEvent('Xóa bài viết', `Đã xóa bài viết: "${article?.title || ''}"`);
    return;
  }
});

async function executeFullSiteSave() {
  if (!saveBtn) return;
  saveBtn.disabled = true;
  saveBtn.textContent = 'Đang lưu lên Supabase...';

  try {
    // 1. Read General Settings
    ['tagline', 'heroText', 'aboutTitle', 'aboutText', 'city'].forEach(k => {
      if (form && form.elements[k]) {
        data[k] = form.elements[k].value || '';
      }
    });

    // 2. Read Emails
    const customEmails = [];
    document.querySelectorAll('.custom-email-row').forEach(row => {
      const label = row.querySelector('.email-row-label')?.value.trim();
      const email = row.querySelector('.email-row-value')?.value.trim();
      if (label && email) customEmails.push({ label, email });
    });
    data.emails = customEmails;

    // 2.1 Read Socials
    const customSocials = [];
    document.querySelectorAll('.custom-social-row').forEach(row => {
      const label = row.querySelector('.social-row-label')?.value.trim();
      const link = row.querySelector('.social-row-link')?.value.trim();
      if (label && link) customSocials.push({ label, link });
    });
    data.socials = customSocials;

    // 3. Read Announcements
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

    // 4. Flush current edited artist data into state
    syncCurrentlyEditedArtistToState();

    // 5. Update articles
    data.articles = readItems('[data-article]', 'article');

    // 6. Update UniPUBLISHING settings & pricing
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

    // 7. Save to local storage & Supabase
    const saved = await saveData(data);
    await logAuditEvent('Cập nhật toàn bộ hệ thống', 'Lưu thay đổi nghệ sĩ, số dư, email và cấu hình toàn website');
    
    if (saved) {
      showNotice('✓ Đã lưu toàn bộ dữ liệu, số dư nghệ sĩ và cấu hình hệ thống lên Supabase thành công!');
    } else {
      showNotice('✓ Đã lưu dữ liệu vào bộ nhớ máy (Offline/Local). Vui lòng kiểm tra lại kết nối Supabase.', true);
    }
  } catch (err) {
    console.error('Lỗi khi lưu hệ thống:', err);
    showNotice(`✕ Có lỗi khi lưu: ${err.message || 'Vui lòng kiểm tra lại'}`, true);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Lưu toàn bộ lên Supabase';
    render();
  }
}

if (saveBtn) {
  saveBtn.onclick = (e) => {
    e.preventDefault();
    executeFullSiteSave();
  };
}
if (form) {
  form.onsubmit = (e) => {
    e.preventDefault();
    executeFullSiteSave();
  };
}

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
// FULL RELEASE METADATA INSPECTOR (A&R REVIEW)
// ==========================================
window.openAdminMetadataModal = function(releaseId) {
  const rel = releases.find(r => r.id === releaseId) || 
    (data.artists || []).flatMap(a => (a.products || []).map(p => ({ ...p, artist_id: a.id }))).find(p => p.id === releaseId || p.slug === releaseId);
  if (!rel) {
    alert('Không tìm thấy thông tin bản phát hành để kiểm tra metadata.');
    return;
  }

  const artistObj = (data.artists || []).find(a => a.id === rel.artist_id) || { name: rel.primary_artist || rel.artist_id || 'Nghệ sĩ' };
  const artistName = rel.artists?.name || artistObj.name || rel.primary_artist || 'Nghệ sĩ';
  const meta = (typeof rel.metadata === 'object' && rel.metadata) ? rel.metadata : {};
  const artwork = rel.artwork_url || rel.artworkUrl || meta.artworkUrl || meta.artworkExternalUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80';
  const audio = rel.audio_url || rel.audioUrl || meta.audioUrl || meta.audioExternalUrl || '';
  const status = rel.submission_status || rel.submissionStatus || 'Đã phát hành';
  const statusSelect = document.querySelector('#meta-modal-status-select');
  const dialog = document.querySelector('#admin-metadata-dialog');
  const modalBody = document.querySelector('#admin-metadata-modal-body');
  const modalTitle = document.querySelector('#meta-modal-title');

  if (statusSelect) statusSelect.value = status;
  if (modalTitle) modalTitle.textContent = `🔍 Thẩm Định Metadata: ${rel.title} — ${artistName}`;

  const splits = Array.isArray(meta.splits) && meta.splits.length > 0 ? meta.splits : [
    { artistName: artistName, role: 'Nghệ sĩ chính (Primary Artist)', percentage: 100 }
  ];

  const lyrics = meta.lyricsText || 'Nghệ sĩ chưa cung cấp lời bài hát.';
  const lrc = meta.lyricsLrc || '';
  const notes = meta.notes || 'Không có ghi chú thêm từ nghệ sĩ.';
  const songwriters = meta.songwriters || 'Chưa cập nhật';
  const producers = meta.producers || 'Chưa cập nhật';
  const phonogram = meta.phonogram || '© 2026 UniFLOWs Label';
  const copyright = meta.copyright || artistName;
  const isrc = meta.isrc || rel.upc || 'Pending / UniFLOWs Auto';
  const upc = meta.upc || 'UniFLOWs Digital Ingestion';
  const territories = meta.territories || 'Toàn cầu (Worldwide - 150+ Lãnh thổ)';
  const releaseDate = meta.releaseDate || rel.releaseDate || rel.type?.split('·')[1]?.trim() || 'Chưa định ngày';
  const preSaveDate = meta.preSaveDate || 'Không thiết lập';
  const language = meta.language || 'Tiếng Việt';
  const explicit = (meta.explicit === 'true' || meta.explicit === true) ? 'Explicit [E] (Có từ ngữ nhạy cảm)' : 'Clean (Không chứa từ ngữ nhạy cảm)';
  const syncConsent = meta.syncLicensingConsent ? '🟢 ĐÃ ỦY QUYỀN (Sẵn sàng chào hàng cho TVC, Phim, Game)' : '⚪ Tắt (Không ủy quyền Sync Licensing)';

  modalBody.innerHTML = `
    <!-- Top Summary Banner -->
    <div style="display:flex;gap:20px;align-items:flex-start;background:#0f172a;color:#fff;padding:20px;border-radius:10px;flex-wrap:wrap;">
      <img src="${esc(artwork)}" alt="Artwork" style="width:140px;height:140px;object-fit:cover;border-radius:8px;border:2px solid rgba(255,255,255,0.2);box-shadow:0 10px 25px rgba(0,0,0,0.5);">
      <div style="flex:1;min-width:240px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
          <span style="font-family:'DM Mono',monospace;font-size:11px;background:#2563eb;color:#fff;padding:2px 8px;border-radius:4px;font-weight:bold;">${esc(rel.type || 'Single')}</span>
          <span style="font-family:'DM Mono',monospace;font-size:11px;background:${status === 'Đã phát hành' ? '#10b981' : (status.includes('chờ') ? '#f59e0b' : '#ef4444')};color:#fff;padding:2px 8px;border-radius:4px;font-weight:bold;">● ${esc(status)}</span>
          <span style="font-family:'DM Mono',monospace;font-size:11px;background:rgba(255,255,255,0.15);padding:2px 8px;border-radius:4px;">${esc(language)}</span>
        </div>
        <h2 style="margin:0 0 4px;font-size:24px;letter-spacing:-0.03em;color:#fff;">${esc(rel.title)}</h2>
        <p style="margin:0 0 10px;font-size:14px;color:#94a3b8;font-weight:600;">Nghệ sĩ chính: <span style="color:#fff;">${esc(artistName)}</span> ${meta.featuredArtist ? `&bull; feat. <span style="color:#38bdf8;">${esc(meta.featuredArtist)}</span>` : ''}</p>
        
        <div style="display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap;">
          ${audio ? `
            <audio controls src="${esc(audio)}" style="height:34px;background:#1e293b;border-radius:20px;"></audio>
            <a href="${esc(audio)}" target="_blank" download class="button" style="background:#fff;color:#000;padding:6px 12px;font-size:11px;font-weight:bold;border-radius:6px;box-shadow:none;">📥 Tải File Master Audio</a>
          ` : '<span style="color:#f87171;font-size:12px;font-weight:bold;">⚠️ Chưa có file Master Audio</span>'}
          <a href="${esc(artwork)}" target="_blank" class="button alt" style="background:rgba(255,255,255,0.1);color:#fff;border-color:rgba(255,255,255,0.3);padding:6px 12px;font-size:11px;font-weight:bold;border-radius:6px;">🖼️ Mở Artwork Gốc 3000px ↗</a>
        </div>
      </div>
    </div>

    <!-- Section 1: Thông tin Định danh & Lịch phát hành -->
    <div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:18px;">
      <h3 style="margin:0 0 14px;font-size:15px;color:#0f172a;letter-spacing:-0.02em;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">
        💿 1. Định Danh Tác Phẩm & Lịch Phát Hành (Release Specs)
      </h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px;font-size:12.5px;">
        <div><span style="color:#64748b;font-size:11px;display:block;font-weight:bold;text-transform:uppercase;">Tên tác phẩm:</span><strong style="font-size:13.5px;color:#0f172a;">${esc(rel.title)}</strong></div>
        <div><span style="color:#64748b;font-size:11px;display:block;font-weight:bold;text-transform:uppercase;">Định dạng (Format):</span><strong>${esc(rel.type || 'Single')}</strong></div>
        <div><span style="color:#64748b;font-size:11px;display:block;font-weight:bold;text-transform:uppercase;">Thể loại chính (Primary Genre):</span><strong>${esc(meta.genre || 'Pop / Indie')}</strong></div>
        <div><span style="color:#64748b;font-size:11px;display:block;font-weight:bold;text-transform:uppercase;">Ngày phát hành chính thức:</span><strong style="color:#2563eb;font-size:13.5px;">📅 ${esc(releaseDate)}</strong></div>
        <div><span style="color:#64748b;font-size:11px;display:block;font-weight:bold;text-transform:uppercase;">Ngày kích hoạt Pre-save:</span><strong>${esc(preSaveDate)}</strong></div>
        <div><span style="color:#64748b;font-size:11px;display:block;font-weight:bold;text-transform:uppercase;">Ngôn ngữ bài hát:</span><strong>${esc(language)}</strong></div>
        <div><span style="color:#64748b;font-size:11px;display:block;font-weight:bold;text-transform:uppercase;">Nội dung nhạy cảm (Explicit):</span><strong>${esc(explicit)}</strong></div>
        <div><span style="color:#64748b;font-size:11px;display:block;font-weight:bold;text-transform:uppercase;">Lãnh thổ phát hành:</span><strong>${esc(territories)}</strong></div>
      </div>
    </div>

    <!-- Section 2: Tác quyền, Credits & Mã ISRC / UPC -->
    <div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:18px;">
      <h3 style="margin:0 0 14px;font-size:15px;color:#0f172a;letter-spacing:-0.02em;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">
        🛡️ 2. Tác Quyền, Bản Quyền & Mã Định Danh ISRC / UPC
      </h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px;font-size:12.5px;">
        <div><span style="color:#64748b;font-size:11px;display:block;font-weight:bold;text-transform:uppercase;">Nhạc sĩ sáng tác (Songwriters):</span><strong style="color:#0f172a;font-size:13px;">${esc(songwriters)}</strong></div>
        <div><span style="color:#64748b;font-size:11px;display:block;font-weight:bold;text-transform:uppercase;">Nhà sản xuất (Music Producers):</span><strong style="color:#0f172a;font-size:13px;">${esc(producers)}</strong></div>
        <div><span style="color:#64748b;font-size:11px;display:block;font-weight:bold;text-transform:uppercase;">Bản quyền bản ghi ℗ (Master Copyright):</span><strong>${esc(phonogram)}</strong></div>
        <div><span style="color:#64748b;font-size:11px;display:block;font-weight:bold;text-transform:uppercase;">Tác quyền sáng tác © (Composition):</span><strong>${esc(copyright)}</strong></div>
        <div><span style="color:#64748b;font-size:11px;display:block;font-weight:bold;text-transform:uppercase;">Mã ISRC:</span><strong style="font-family:'DM Mono',monospace;color:#1e40af;">${esc(isrc)}</strong></div>
        <div><span style="color:#64748b;font-size:11px;display:block;font-weight:bold;text-transform:uppercase;">Mã UPC / EAN:</span><strong style="font-family:'DM Mono',monospace;">${esc(upc)}</strong></div>
        <div style="grid-column:1/-1;"><span style="color:#64748b;font-size:11px;display:block;font-weight:bold;text-transform:uppercase;">Ủy quyền Sync Licensing:</span><strong style="color:#16a34a;">${syncConsent}</strong></div>
      </div>
    </div>

    <!-- Section 3: Bảng Phân Chia Doanh Thu (Royalty Splits Table) -->
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <h3 style="margin:0;font-size:15px;color:#166534;letter-spacing:-0.02em;">
          💰 3. Bảng Phân Chia Doanh Thu Tác Quyền (Royalty Splits)
        </h3>
        <span style="font-family:'DM Mono',monospace;font-size:12px;font-weight:bold;color:#15803d;background:#dcfce7;padding:3px 10px;border-radius:12px;border:1px solid #86efac;">
          Tổng cộng: 100%
        </span>
      </div>

      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:12.5px;text-align:left;background:#fff;border-radius:6px;overflow:hidden;border:1px solid #bbf7d0;">
          <thead>
            <tr style="background:#dcfce7;color:#14532d;font-family:'DM Mono',monospace;font-size:11px;text-transform:uppercase;">
              <th style="padding:10px 14px;">Đối tượng thụ hưởng</th>
              <th style="padding:10px 14px;">Vai trò tham gia</th>
              <th style="padding:10px 14px;text-align:right;">Tỷ lệ chia sẻ</th>
              <th style="padding:10px 14px;width:160px;">Tỷ lệ trực quan</th>
            </tr>
          </thead>
          <tbody>
            ${splits.map(s => `
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:10px 14px;font-weight:bold;color:#0f172a;">${esc(s.artistName || s.artistId)}</td>
                <td style="padding:10px 14px;color:#475569;">${esc(s.role || 'Contributor')}</td>
                <td style="padding:10px 14px;text-align:right;font-weight:bold;font-family:'DM Mono',monospace;color:#15803d;">${s.percentage}%</td>
                <td style="padding:10px 14px;">
                  <div style="background:#e2e8f0;height:8px;border-radius:4px;overflow:hidden;">
                    <div style="background:#16a34a;height:100%;width:${s.percentage}%;"></div>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Section 4: Lời Bài Hát & LRC -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:16px;">
      <div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:16px;">
        <h4 style="margin:0 0 8px;font-size:13px;color:#0f172a;font-weight:bold;">📝 Lời bài hát chuẩn (Plain Lyrics)</h4>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;max-height:160px;overflow-y:auto;font-size:12px;line-height:1.6;white-space:pre-wrap;color:#334155;">
          ${esc(lyrics)}
        </div>
      </div>
      <div style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:16px;">
        <h4 style="margin:0 0 8px;font-size:13px;color:#0f172a;font-weight:bold;">⏱️ Đồng bộ thời gian (.LRC Time-synced)</h4>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;max-height:160px;overflow-y:auto;font-family:'DM Mono',monospace;font-size:11px;line-height:1.5;white-space:pre-wrap;color:#0369a1;">
          ${esc(lrc || 'Chưa cung cấp file .LRC')}
        </div>
      </div>
    </div>

    <!-- Section 5: Ghi chú Pitching & Phản hồi A&R -->
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:18px;">
      <h3 style="margin:0 0 10px;font-size:14px;color:#92400e;letter-spacing:-0.02em;">
        🎯 5. Kế Hoạch Pitching & Ghi Chú A&R Review
      </h3>
      <div style="margin-bottom:14px;background:#fff;border:1px solid #fde68a;padding:12px;border-radius:6px;">
        <span style="font-size:11px;color:#92400e;font-weight:bold;display:block;margin-bottom:4px;">Ghi chú chiến dịch từ nghệ sĩ:</span>
        <p style="margin:0;font-size:12.5px;color:#78350f;line-height:1.5;">${esc(notes)}</p>
      </div>

      <div>
        <label style="font-size:11px;color:#92400e;font-weight:bold;display:block;margin-bottom:6px;text-transform:uppercase;">
          Phản hồi A&R gửi lại nghệ sĩ (Hiển thị trực tiếp trên UniPORTAL (by UniENGINE)):
        </label>
        <textarea id="meta-modal-ar-feedback" rows="3" placeholder="Ví dụ: [01:15] Đoạn điệp khúc vocal cần mix sáng hơn. Bản thu đạt chuẩn chất lượng DSPs..." style="width:100%;padding:10px;font-size:12.5px;border:1px solid #d97706;border-radius:6px;background:#fff;font-family:inherit;">${esc(meta.arFeedback || '')}</textarea>
      </div>
    </div>
  `;

  // Copy DSP Metadata Sheet in standard JSON/Text
  const copyBtn = document.querySelector('#meta-modal-copy-json-btn');
  if (copyBtn) {
    copyBtn.onclick = () => {
      const sheetData = `UNIFLOWs RECORDS — METADATA INGESTION SHEET
--------------------------------------------------
RELEASE TITLE: ${rel.title}
FORMAT: ${rel.type || 'Single'}
PRIMARY ARTIST: ${artistName}
FEATURED ARTISTS: ${meta.featuredArtist || 'N/A'}
PRIMARY GENRE: ${meta.genre || 'Pop'}
RELEASE DATE: ${releaseDate}
PRE-SAVE DATE: ${preSaveDate}
LANGUAGE: ${language}
EXPLICIT: ${explicit}
SONGWRITERS: ${songwriters}
PRODUCERS: ${producers}
PHONOGRAM ℗: ${phonogram}
COMPOSITION ©: ${copyright}
ISRC: ${isrc}
UPC: ${upc}
TERRITORIES: ${territories}
SYNC LICENSING: ${meta.syncLicensingConsent ? 'YES' : 'NO'}

ROYALTY SPLITS:
${splits.map(s => `- ${s.artistName} (${s.role}): ${s.percentage}%`).join('\n')}

AUDIO MASTER: ${audio || 'N/A'}
ARTWORK URL: ${artwork || 'N/A'}
--------------------------------------------------`;
      navigator.clipboard?.writeText(sheetData);
      copyBtn.textContent = '✓ Đã Copy Sheet!';
      setTimeout(() => { copyBtn.textContent = '📋 Copy Metadata Sheet'; }, 2000);
    };
  }

  // Save Modal Action
  const saveBtn = document.querySelector('#meta-modal-save-btn');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      const newStatus = statusSelect?.value || status;
      const newFeedback = document.querySelector('#meta-modal-ar-feedback')?.value.trim() || '';

      saveBtn.disabled = true;
      saveBtn.textContent = 'Đang lưu xét duyệt...';

      // Update release in memory
      rel.submission_status = newStatus;
      rel.submissionStatus = newStatus;
      if (!rel.metadata) rel.metadata = {};
      rel.metadata.arFeedback = newFeedback;
      rel.metadata.status = newStatus;

      // Update in data.artists
      const artistIndex = (data.artists || []).findIndex(a => a.id === rel.artist_id);
      if (artistIndex >= 0) {
        const prod = (data.artists[artistIndex].products || []).find(p => p.id === rel.id || p.slug === rel.slug);
        if (prod) {
          prod.submissionStatus = newStatus;
          if (!prod.metadata) prod.metadata = {};
          prod.metadata.arFeedback = newFeedback;
          prod.metadata.status = newStatus;
        }
      }

      await saveData(data);
      await logAuditEvent('Xét Duyệt Metadata Bản Phát Hành', `Bản phát hành "${rel.title}" của "${artistName}" chuyển sang trạng thái "${newStatus}".`);
      
      // Notify artist via Portal & automated Email from custom domain
      let emailNotice = '';
      try {
        const targetArtistObj = await resolveArtistObj(rel.artist_id);
        if (newStatus === 'Đã phát hành') {
          await sendArtistNotification(
            rel.artist_id,
            '💿 Bản phát hành đã được phê duyệt!',
            `Bản phát hành "${rel.title}" đã được duyệt phân phối chính thức trên các nền tảng streaming!${newFeedback ? `\n\n💬 Góp ý từ A&R:\n"${newFeedback}"` : ''}`,
            'release'
          );
          if (targetArtistObj && targetArtistObj.email) {
            const res = await sendReleaseApprovedEmail(targetArtistObj, rel);
            if (res && res.success) emailNotice = ` & đã gửi email tới "${targetArtistObj.email}"`;
            else if (res && !res.disabled && !res.skipped && res.error) emailNotice = ` ⚠️ (Cảnh báo email: ${res.error})`;
          }
        } else if (newStatus === 'Yêu cầu chỉnh sửa') {
          await sendArtistNotification(
            rel.artist_id,
            '⚠️ Yêu cầu chỉnh sửa bản phát hành',
            `Bản phát hành "${rel.title}" cần chỉnh sửa theo yêu cầu của A&R:${newFeedback ? `\n\n💬 Lời nhắn từ A&R:\n"${newFeedback}"` : ' Vui lòng kiểm tra lại file Master hoặc Artwork.'}`,
            'release'
          );
          if (targetArtistObj && targetArtistObj.email) {
            const res = await sendReleaseRevisionEmail(targetArtistObj, rel, newFeedback);
            if (res && res.success) emailNotice = ` & đã gửi email tới "${targetArtistObj.email}"`;
            else if (res && !res.disabled && !res.skipped && res.error) emailNotice = ` ⚠️ (Cảnh báo email: ${res.error})`;
          }
        } else if (newStatus === 'Từ chối phát hành' || newStatus === 'Từ chối' || newStatus.includes('chối')) {
          await sendArtistNotification(
            rel.artist_id,
            '❌ Bản phát hành chưa đạt tiêu chuẩn',
            `Bản phát hành "${rel.title}" đã bị từ chối phát hành.${newFeedback ? `\n\n💬 Lý do từ A&R:\n"${newFeedback}"` : ''}`,
            'release'
          );
          if (targetArtistObj && targetArtistObj.email) {
            const res = await sendReleaseRejectedEmail(targetArtistObj, rel, newFeedback);
            if (res && res.success) emailNotice = ` & đã gửi email tới "${targetArtistObj.email}"`;
            else if (res && !res.disabled && !res.skipped && res.error) emailNotice = ` ⚠️ (Cảnh báo email: ${res.error})`;
          }
        }
      } catch (err) {
        console.warn('Lỗi gửi email modal metadata:', err);
      }

      showNotice(`✓ ĐÃ CẬP NHẬT XÉT DUYỆT! Bản phát hành "${rel.title}" hiện ở trạng thái "${newStatus}".${emailNotice}`);

      dialog.close();
      renderReleasesAdmin();
    };
  }

  dialog.showModal();
};

document.querySelector('#close-admin-metadata-btn')?.addEventListener('click', () => document.querySelector('#admin-metadata-dialog')?.close());
document.querySelector('#cancel-admin-metadata-btn')?.addEventListener('click', () => document.querySelector('#admin-metadata-dialog')?.close());

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

    // Automatically send handover email if email provided
    let emailNotice = '';
    if (email) {
      try {
        const res = await sendAccountHandoverEmail(artistRecord);
        if (res && res.success) {
          emailNotice = ` và TỰ ĐỘNG GỬI EMAIL BÀN GIAO đến "${email}"!`;
        } else if (res && !res.disabled && res.error) {
          emailNotice = ` (⚠️ Cảnh báo gửi email: ${res.error})`;
        } else if (res && res.disabled) {
          emailNotice = ` (Email tự động đang tắt trong Cấu hình)`;
        }
      } catch (err) {
        console.warn('Lỗi gửi email bàn giao:', err);
      }
    }

    showNotice(`✓ Đã cấp tài khoản thành công cho "${name}"!${emailNotice}`);
  };

  const emailHandoverBtn = document.querySelector('#btn-email-handover');
  if (emailHandoverBtn) {
    emailHandoverBtn.onclick = async () => {
      const email = document.querySelector('#prov-email')?.value.trim();
      if (!email) {
        alert('Tài khoản này chưa có email để gửi!');
        return;
      }
      emailHandoverBtn.disabled = true;
      emailHandoverBtn.textContent = '⏳ Đang gửi mail...';
      const targetArtist = (data.artists || []).find(a => a.id === selectedArtistId) || {};
      const res = await sendAccountHandoverEmail(targetArtist);
      emailHandoverBtn.disabled = false;
      emailHandoverBtn.textContent = '✉️ Gửi Email Bàn Giao';
      if (res.success) {
        showNotice(`✓ Đã gửi email phiếu bàn giao tài khoản đến "${email}" thành công!`);
        alert(`🎉 Đã gửi email phiếu bàn giao tài khoản đến ${email}!`);
      } else {
        alert(`Không thể gửi email: ${res.error || 'Vui lòng kiểm tra lại cấu hình Email trong Tab 07.'}`);
      }
    };
  }

  copyHandoverBtn.onclick = () => {
    const text = handoverPre.textContent;
    navigator.clipboard.writeText(text).then(() => {
      showNotice('✓ Đã sao chép Phiếu Bàn Giao vào bộ nhớ tạm! Sẵn sàng gửi qua Zalo / Telegram / Email.');
    }).catch(() => {
      prompt('Nội dung bàn giao:', text);
    });
  };
}

// Handover slip export & email dispatch from individual artist card
document.addEventListener('click', async (e) => {
  const emailBtn = e.target.closest('.btn-email-artist-handover');
  if (emailBtn) {
    const idx = parseInt(emailBtn.dataset.artistIdx, 10);
    const a = data.artists[idx];
    if (!a || !a.email) {
      alert('Nghệ sĩ này chưa có thông tin email liên kết để gửi thư!');
      return;
    }
    const origText = emailBtn.textContent;
    emailBtn.disabled = true;
    emailBtn.textContent = '⏳ Đang gửi mail...';
    const res = await sendAccountHandoverEmail(a);
    emailBtn.disabled = false;
    emailBtn.textContent = origText;
    if (res.success) {
      showNotice(`✓ Đã gửi email phiếu bàn giao tài khoản đến "${a.email}" thành công!`);
      alert(`🎉 Đã gửi email phiếu bàn giao tài khoản đến ${a.email}!`);
    } else {
      alert(`Không thể gửi email: ${res.error || 'Vui lòng kiểm tra lại cấu hình Email trong Tab 07.'}`);
    }
    return;
  }

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
  const dlg = document.querySelector('#admin-producer-tracks-dialog');
  if (dlg) {
    dlg.style.display = 'flex';
    dlg.showModal();
  }
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
  const dlg = document.querySelector('#admin-producer-tracks-dialog');
  if (dlg) { dlg.style.display = 'none'; dlg.close(); }
});
document.querySelector('#btn-save-close-producer-tracks')?.addEventListener('click', () => {
  const dlg = document.querySelector('#admin-producer-tracks-dialog');
  if (dlg) { dlg.style.display = 'none'; dlg.close(); }
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
            <button type="button" class="btn-email-demo-sub button" data-idx="${idx}" style="background:#15803d;color:#fff;border-color:#15803d;font-weight:bold;padding:6px 14px;font-size:11px;">
              📧 Phản Hồi Email
            </button>
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
      if (!confirm(`Xác nhận chuyển ứng viên "${artistName}" thành Nghệ sĩ chính thức trên UniPORTAL (by UniENGINE)?`)) return;

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

      let emailNotice = '';
      if (sub.email) {
        try {
          const res = await sendAccountHandoverEmail(newArtist);
          if (res && res.success) {
            emailNotice = ` & đã tự động gửi email bàn giao tài khoản đến "${sub.email}"!`;
          }
        } catch (eErr) {
          console.warn('Lỗi gửi email handover onboard:', eErr);
        }
      }

      showNotice(`🎉 ĐÃ ONBOARD THÀNH CÔNG! Nghệ sĩ "${artistName}" đã được đưa vào hệ thống và hiển thị trên Website!${emailNotice}`);
      
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

  // Attach Reply Email Modal Trigger
  feed.querySelectorAll('.btn-email-demo-sub').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      openDemoReplyModal(idx);
    });
  });
}

// Filter listeners for A&R Submissions
document.querySelector('#admin-submission-status-filter')?.addEventListener('change', renderMusicSubmissionsAdmin);
document.querySelector('#admin-submission-search')?.addEventListener('input', renderMusicSubmissionsAdmin);

// ----------------------------------------------------
// A&R DEMO EMAIL DIRECT OUTREACH MODAL CONTROLLER
// ----------------------------------------------------
let currentDemoSubReplyIdx = null;

function applyDemoReplyTemplate(type, artistName, dossierCode = '') {
  const subjectInput = document.querySelector('#demo-reply-subject');
  const messageInput = document.querySelector('#demo-reply-message');
  if (!subjectInput || !messageInput) return;

  const codeTag = dossierCode ? ` [${dossierCode}]` : '';

  const templates = {
    interview: {
      subject: `[UniFLOWs A&R] Thư mời trao đổi & lắng nghe thêm demo mới${codeTag} — ${artistName}`,
      message: `Xin chào ${artistName},\n\nĐội ngũ A&R của UniFLOWs đã lắng nghe bản demo của bạn và thực sự rất ấn tượng với phong cách âm nhạc cũng như năng lượng mà tác phẩm mang lại.\n\nChúng tôi rất mong muốn sắp xếp một buổi trò chuyện trực tiếp (hoặc online qua Google Meet) để lắng nghe thêm các dự án mới mà bạn đang ấp ủ, cũng như thảo luận về cơ hội đồng hành phát hành âm nhạc cùng UniFLOWs Label.\n\nBạn vui lòng gửi email phản hồi (hoặc bấm nút "Gửi Email Nhanh" bên dưới) kèm Mã hồ sơ [${dossierCode || 'Mã hồ sơ của bạn'}] trực tiếp tới: management@uniflowslabel.com cùng khung thời gian rảnh thuận tiện nhất trong tuần tới của bạn nhé.\n\nRất mong sớm có dịp hợp tác cùng bạn!`
    },
    stems: {
      subject: `[UniFLOWs A&R] Yêu cầu bổ sung tệp thu âm Master WAV & Stems${codeTag} — ${artistName}`,
      message: `Xin chào ${artistName},\n\nCảm ơn bạn đã gửi sản phẩm tới UniFLOWs. Đội ngũ A&R và Audio Engineering của chúng tôi đã tiến hành thẩm định bước đầu.\n\nĐể hoàn tất quy trình đánh giá kỹ thuật và chuẩn bị cho các phương án phát hành, bạn vui lòng gửi email kèm Mã hồ sơ [${dossierCode || 'Mã hồ sơ của bạn'}] trực tiếp tới: management@uniflowslabel.com và đính kèm link tải (Google Drive / Dropbox) bao gồm:\n1. File Master WAV chất lượng cao (24-bit, 44.1kHz hoặc 48kHz)\n2. Bản Vocal Stems & Instrumental tách rời\n3. File văn bản Lời bài hát (Lyrics) chính xác\n\nChúc bạn một ngày làm việc sáng tạo!`
    },
    signed: {
      subject: `🎉 [UniFLOWs Label] Đề xuất ký kết hợp đồng phân phối âm nhạc${codeTag} — ${artistName}`,
      message: `Xin chào ${artistName},\n\nChúc mừng bạn! Sau khi hội đồng A&R đánh giá toàn diện, UniFLOWs Label chính thức gửi lời mời hợp tác và đề xuất ký hợp đồng phân phối toàn cầu cho sản phẩm của bạn qua hệ thống UniENGINE.\n\nChúng tôi sẽ liên hệ để trao đổi các điều khoản bảo đảm tối đa quyền tác giả, phân chia doanh thu bản quyền minh bạch và lộ trình quảng bá (Playlist Pitching / TikTok Campaign).\n\nBạn vui lòng gửi email kèm Mã hồ sơ [${dossierCode || 'Mã hồ sơ của bạn'}] trực tiếp tới: management@uniflowslabel.com để người phụ trách hợp đồng gửi bản thảo thảo luận chi tiết nhé!`
    },
    encourage: {
      subject: `[UniFLOWs Label] Thư cảm ơn & phản hồi về bản demo${codeTag} — ${artistName}`,
      message: `Xin chào ${artistName},\n\nCảm ơn bạn rất nhiều vì đã tin tưởng lựa chọn gửi gắm tác phẩm âm nhạc của mình tới UniFLOWs Label. Chúng tôi trân trọng từng phút lắng nghe sản phẩm của bạn.\n\nTuy nhiên trong đợt phát hành quý này, màu sắc tác phẩm chưa hoàn toàn khớp với định hướng danh mục dự án mà hãng đang triển khai. Quyết định này hoàn toàn không phủ nhận tài năng và nỗ lực của bạn.\n\nChúng tôi khuyến khích bạn tiếp tục sáng tạo và luôn sẵn sàng chào đón bạn gửi những bản demo tiếp theo tới cổng tuyển sinh A&R của UniFLOWs trong tương lai!\n\nNếu cần giải đáp thêm, bạn có thể liên hệ trực tiếp: management@uniflowslabel.com kèm Mã hồ sơ [${dossierCode || 'Mã hồ sơ của bạn'}].\n\nChúc bạn luôn giữ trọn ngọn lửa đam mê âm nhạc.`
    },
    custom: {
      subject: `[UniFLOWs A&R] Phản hồi về bản demo gửi tới UniFLOWs Label${codeTag} — ${artistName}`,
      message: `Xin chào ${artistName},\n\nĐội ngũ A&R của UniFLOWs đã nhận và lắng nghe bản demo của bạn (Mã hồ sơ: ${dossierCode || 'Hồ sơ demo'}).\n\n[Nhập nội dung phản hồi cụ thể tại đây...]\n\nĐể trao đổi thêm hoặc gửi tư liệu, bạn vui lòng gửi thư trực tiếp tới: management@uniflowslabel.com (kèm Mã hồ sơ) hoặc nhấn nút Gửi Mail Nhanh bên dưới.\n\nTrân trọng,\nĐội ngũ A&R UniFLOWs Label\nmanagement@uniflowslabel.com`
    }
  };

  const selected = templates[type] || templates.custom;
  subjectInput.value = selected.subject;
  messageInput.value = selected.message;
}

function openDemoReplyModal(idx) {
  const submissions = data.musicSubmissions || defaultData.musicSubmissions || [];
  const sub = submissions[idx];
  if (!sub) return;

  currentDemoSubReplyIdx = idx;

  // Ensure dossier code exists
  if (!sub.dossierCode) {
    const cleanNum = String(sub.id || '').replace(/[^0-9]/g, '');
    sub.dossierCode = cleanNum ? `DEMO-${cleanNum.padStart(4, '0')}` : ('DEMO-' + Math.random().toString(36).substring(2, 8).toUpperCase());
  }

  const modal = document.querySelector('#modal-demo-reply-email');
  const targetNameEl = document.querySelector('#demo-reply-target-name');
  const targetEmailEl = document.querySelector('#demo-reply-target-email');
  const targetSongEl = document.querySelector('#demo-reply-target-song');
  const targetCodeEl = document.querySelector('#demo-reply-target-code');
  const templateSel = document.querySelector('#demo-reply-template');

  const artistName = sub.artistName || sub.fullName || 'Nghệ sĩ';
  const email = sub.email || '';
  const trackInfo = sub.tracklistNotes ? sub.tracklistNotes.slice(0, 100) : (sub.demoUrl || 'Bản thu A&R');

  if (targetNameEl) targetNameEl.textContent = artistName;
  if (targetEmailEl) targetEmailEl.textContent = email || 'Chưa cung cấp email';
  if (targetSongEl) targetSongEl.textContent = trackInfo;
  if (targetCodeEl) targetCodeEl.textContent = sub.dossierCode;

  if (templateSel) {
    templateSel.value = 'interview';
    applyDemoReplyTemplate('interview', artistName, sub.dossierCode);
  }

  if (modal) {
    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.style.display = 'block';
    }
  }
}

function initDemoReplyEmailModal() {
  const modal = document.querySelector('#modal-demo-reply-email');
  if (!modal) return;

  const form = document.querySelector('#demo-reply-form');
  const closeBtn = document.querySelector('#close-demo-reply-btn');
  const cancelBtn = document.querySelector('#cancel-demo-reply-btn');
  const templateSel = document.querySelector('#demo-reply-template');
  const autoStatusCheckbox = document.querySelector('#demo-reply-auto-status');
  const submitBtn = document.querySelector('#submit-demo-reply-btn');

  const closeModal = () => {
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.style.display = 'none';
    }
  };

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  templateSel?.addEventListener('change', () => {
    const submissions = data.musicSubmissions || defaultData.musicSubmissions || [];
    const sub = currentDemoSubReplyIdx !== null ? submissions[currentDemoSubReplyIdx] : null;
    const artistName = sub ? (sub.artistName || sub.fullName || 'Nghệ sĩ') : 'Nghệ sĩ';
    const dossierCode = sub ? sub.dossierCode : '';
    applyDemoReplyTemplate(templateSel.value, artistName, dossierCode);
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submissions = data.musicSubmissions || defaultData.musicSubmissions || [];
    const sub = currentDemoSubReplyIdx !== null ? submissions[currentDemoSubReplyIdx] : null;

    if (!sub) {
      alert('Không tìm thấy thông tin hồ sơ demo!');
      return;
    }

    const email = (sub.email || '').trim();
    if (!email || !email.includes('@')) {
      alert('Ứng viên này chưa có địa chỉ email hợp lệ để gửi phản hồi!');
      return;
    }

    const subject = document.querySelector('#demo-reply-subject')?.value.trim();
    const message = document.querySelector('#demo-reply-message')?.value.trim();

    if (!subject || !message) {
      alert('Vui lòng điền đầy đủ tiêu đề và nội dung thư!');
      return;
    }

    const originalBtnText = submitBtn ? submitBtn.innerHTML : '🚀 Gửi Email Phản Hồi Ngay';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Đang gửi email...';
    }

    try {
      const res = await sendDemoReplyEmail({
        to: email,
        artistName: sub.artistName || sub.fullName,
        trackName: sub.tracklistNotes || sub.demoUrl,
        subject,
        message,
        demoUrl: sub.demoUrl,
        demoRefCode: sub.dossierCode
      });

      if (res && res.success) {
        if (autoStatusCheckbox && autoStatusCheckbox.checked) {
          sub.status = 'Đã liên hệ';
          await saveData(data);
          await logAuditEvent('A&R Phản Hồi Demo', `Đã gửi email phản hồi demo (Mã: ${sub.dossierCode}) tới "${sub.artistName || sub.fullName}" (${email}).`);
          renderMusicSubmissionsAdmin();
        }

        showNotice(`✓ Đã gửi email phản hồi thành công tới ${email} (Mã: ${sub.dossierCode})!`);
        closeModal();
      } else {
        const errMsg = res?.error || 'Không thể gửi email. Vui lòng kiểm tra lại cấu hình Brevo / Resend trong Tab 06!';
        alert(`❌ Lỗi gửi email: ${errMsg}`);
      }
    } catch (err) {
      alert(`❌ Đã xảy ra lỗi khi gửi thư: ${err.message}`);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  });
}

// ============================================================================
// 13. TRÌNH RÚT GỌN LINK & QR CODE (SHORTURL ENGINE)
// ============================================================================
function renderShortlinksAdmin() {
  const tbody = document.querySelector('#admin-shortlinks-tbody');
  const countBadge = document.querySelector('#admin-shortlinks-count-badge');
  if (!tbody) return;

  const shortlinks = data.shortlinks || [];
  if (countBadge) countBadge.textContent = `${shortlinks.length} links`;

  if (shortlinks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="padding:30px; text-align:center; color:#64748b;">
          Chưa có link rút gọn nào được tạo. Hãy nhập link ở trên để tạo link ngắn!
        </td>
      </tr>
    `;
    return;
  }

  const origin = location.origin;

  tbody.innerHTML = shortlinks.map((item, idx) => {
    const fullShortUrl = `${origin}/s/${encodeURIComponent(item.slug)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fullShortUrl)}`;

    return `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:12px 16px;">
          <strong style="display:block; font-size:13px; color:#0f172a;">${esc(item.title || item.slug)}</strong>
          <span style="font-size:11px; color:#64748b; font-family:'DM Mono',monospace;">Ngày tạo: ${esc(item.createdAt || 'Mới')}</span>
        </td>
        <td style="padding:12px 16px;">
          <a href="/s/${encodeURIComponent(item.slug)}" target="_blank" style="font-family:'DM Mono',monospace; font-weight:bold; color:#10b981; font-size:13px; text-decoration:underline;">
            /s/${esc(item.slug)} ↗
          </a>
        </td>
        <td style="padding:12px 16px;">
          <a href="${esc(item.targetUrl)}" target="_blank" style="color:#475569; font-size:12px; display:block; max-width:280px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(item.targetUrl)}">
            ${esc(item.targetUrl)}
          </a>
        </td>
        <td style="padding:12px 16px; text-align:center;">
          <span style="font-family:'DM Mono',monospace; font-weight:bold; font-size:12px; background:#f1f5f9; padding:3px 8px; border-radius:4px; color:#1e293b;">
            ${(item.clicks || 0).toLocaleString('vi-VN')}
          </span>
        </td>
        <td style="padding:12px 16px; text-align:right; white-space:nowrap;">
          <div style="display:inline-flex; gap:6px;">
            <button type="button" class="btn-copy-shortlink-admin" data-url="${fullShortUrl}" style="padding:5px 10px; font-size:11px; background:#fff; border:1px solid #cbd5e1; border-radius:6px; cursor:pointer; font-weight:bold;">
              📋 Copy
            </button>
            <a href="${qrUrl}" download="qr_${esc(item.slug)}.png" target="_blank" style="padding:5px 10px; font-size:11px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; text-decoration:none; color:#0f172a; font-weight:bold; display:inline-flex; align-items:center;">
              📷 QR
            </a>
            <button type="button" class="btn-delete-shortlink-admin" data-idx="${idx}" style="padding:5px 10px; font-size:11px; background:#fff1f0; border:1px solid #ffa39e; border-radius:6px; color:#cf1322; cursor:pointer; font-weight:bold;">
              ✕ Xóa
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach Copy
  tbody.querySelectorAll('.btn-copy-shortlink-admin').forEach(btn => {
    btn.onclick = () => {
      navigator.clipboard?.writeText(btn.dataset.url);
      const orig = btn.textContent;
      btn.textContent = '✓ Đã chép';
      btn.style.borderColor = '#10b981';
      btn.style.color = '#10b981';
      setTimeout(() => {
        btn.textContent = orig;
        btn.style.borderColor = '#cbd5e1';
        btn.style.color = 'inherit';
      }, 1500);
    };
  });

  // Attach Delete
  tbody.querySelectorAll('.btn-delete-shortlink-admin').forEach(btn => {
    btn.onclick = async () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const item = data.shortlinks[idx];
      if (!item) return;

      if (!confirm(`Xác nhận xóa link rút gọn "/s/${item.slug}"?`)) return;

      data.shortlinks.splice(idx, 1);
      await saveData(data);
      await logAuditEvent('Xóa ShortURL', `Đã xóa link rút gọn /s/${item.slug}`);
      showNotice(`✓ Đã xóa link rút gọn /s/${item.slug}`);
      renderShortlinksAdmin();
    };
  });
}

function initShortlinksAdmin() {
  const btnCreate = document.querySelector('#btn-admin-create-shortlink');
  const btnRandom = document.querySelector('#btn-admin-random-slug');
  const inputUrl = document.querySelector('#admin-short-url');
  const inputSlug = document.querySelector('#admin-short-slug');
  const inputTitle = document.querySelector('#admin-short-title');

  btnRandom?.addEventListener('click', () => {
    const rand = Math.random().toString(36).substring(2, 8);
    if (inputSlug) inputSlug.value = rand;
  });

  btnCreate?.addEventListener('click', async () => {
    const targetUrl = inputUrl?.value.trim();
    let rawSlug = inputSlug?.value.trim();
    const title = inputTitle?.value.trim() || rawSlug;

    if (!targetUrl) {
      alert('Vui lòng nhập đường link gốc cần rút gọn!');
      inputUrl?.focus();
      return;
    }

    if (!rawSlug) {
      rawSlug = Math.random().toString(36).substring(2, 8);
    }

    const cleanSlug = slug(rawSlug);

    if (!data.shortlinks) data.shortlinks = [];
    const existingIdx = data.shortlinks.findIndex(x => slug(x.slug) === cleanSlug);

    const newShortItem = {
      id: `short-${Date.now()}`,
      slug: cleanSlug,
      targetUrl,
      title,
      clicks: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };

    if (existingIdx >= 0) {
      data.shortlinks[existingIdx] = newShortItem;
    } else {
      data.shortlinks.unshift(newShortItem);
    }

    await saveData(data);
    await logAuditEvent('Tạo ShortURL Mới', `Đã tạo link rút gọn /s/${cleanSlug} trỏ tới ${targetUrl}`);
    showNotice(`✓ Đã tạo link rút gọn "uniflowslabel.com/s/${cleanSlug}" thành công!`);

    if (inputUrl) inputUrl.value = '';
    if (inputSlug) inputSlug.value = '';
    if (inputTitle) inputTitle.value = '';

    renderShortlinksAdmin();
  });
}

// ============================================================================
// 14. QUẢN LÝ SUPABASE CLOUD & LIVE DIAGNOSTICS
// ============================================================================
function updateSupabaseStatusBanner() {
  const dot = document.querySelector('#supabase-live-status-dot');
  const text = document.querySelector('#supabase-live-status-text');
  const sub = document.querySelector('#supabase-live-status-sub');
  
  const isOffline = isOfflineModeActive();
  const configured = isSupabaseConfigured();
  const currentUrl = getSupabaseUrl();

  const btnQuickOffline = document.querySelector('#btn-quick-toggle-offline');
  const btnQuickReconnect = document.querySelector('#btn-quick-reconnect-supabase');
  const btnTabOffline = document.querySelector('#btn-tab-toggle-offline');
  const btnTabReconnect = document.querySelector('#btn-tab-reconnect-supabase');

  if (isOffline) {
    if (dot) {
      dot.style.background = '#f59e0b';
      dot.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.25)';
    }
    if (text) text.textContent = '⚡ Chế độ Ngoại Tuyến (Offline Mode: Đang Bật)';
    if (sub) sub.textContent = 'Dữ liệu được lưu và chỉnh sửa trực tiếp trên trình duyệt (LocalStorage). Không đồng bộ lên Supabase Cloud.';
    if (btnQuickOffline) btnQuickOffline.style.display = 'none';
    if (btnQuickReconnect) btnQuickReconnect.style.display = 'inline-flex';
    if (btnTabOffline) btnTabOffline.style.display = 'none';
    if (btnTabReconnect) btnTabReconnect.style.display = 'inline-flex';
  } else if (configured) {
    if (dot) {
      dot.style.background = '#10b981';
      dot.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.2)';
    }
    if (text) text.textContent = 'Supabase Cloud: Đang kết nối';
    let host = '';
    try { host = new URL(currentUrl).hostname; } catch { host = currentUrl; }
    if (sub) sub.textContent = `Endpoint: ${host} · Sẵn sàng đồng bộ cơ sở dữ liệu và lưu trữ Storage.`;
    if (btnQuickOffline) btnQuickOffline.style.display = 'inline-flex';
    if (btnQuickReconnect) btnQuickReconnect.style.display = 'none';
    if (btnTabOffline) btnTabOffline.style.display = 'inline-flex';
    if (btnTabReconnect) btnTabReconnect.style.display = 'none';
  } else {
    if (dot) {
      dot.style.background = '#ef4444';
      dot.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.2)';
    }
    if (text) text.textContent = 'Supabase Cloud: Chưa kích hoạt';
    if (sub) sub.textContent = 'Hệ thống đang hoạt động ở chế độ Local Storage Offline (Chưa cấu hình URL hoặc Anon Key).';
    if (btnQuickOffline) btnQuickOffline.style.display = 'inline-flex';
    if (btnQuickReconnect) btnQuickReconnect.style.display = 'none';
    if (btnTabOffline) btnTabOffline.style.display = 'inline-flex';
    if (btnTabReconnect) btnTabReconnect.style.display = 'none';
  }

  // Populate Tab 7 inputs
  const tabUrlInput = document.querySelector('#tab-supabase-url');
  const tabKeyInput = document.querySelector('#tab-supabase-key');
  if (tabUrlInput && !tabUrlInput.value) tabUrlInput.value = currentUrl;
  if (tabKeyInput && !tabKeyInput.value) tabKeyInput.value = getSupabaseAnonKey();

  // Populate Modal inputs
  const modalUrlInput = document.querySelector('#modal-supabase-url');
  const modalKeyInput = document.querySelector('#modal-supabase-key');
  if (modalUrlInput && !modalUrlInput.value) modalUrlInput.value = currentUrl;
  if (modalKeyInput && !modalKeyInput.value) modalKeyInput.value = getSupabaseAnonKey();
}

const QUICKFIX_SQL_CONTENT = `-- ==============================================================================
-- UNIFLOWS LABEL — SUPABASE COMPLETE SAFE UPGRADE & QUICK-FIX (2026)
-- Hướng dẫn: Mở Supabase Dashboard -> SQL Editor -> New Query -> Dán mã này -> Run
-- (100% AN TOÀN — SỬ DỤNG 'IF NOT EXISTS', KHÔNG XÓA DỮ LIỆU ĐANG CÓ TRÊN DATABASE)
-- ==============================================================================

-- 1. BẢNG CẤU HÌNH TỔNG QUAN WEBSITE (SITE SETTINGS)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id text PRIMARY KEY DEFAULT 'main',
  tagline text DEFAULT 'MAKE THE WORLD MOVE.',
  hero_text text DEFAULT 'UniFLOWs Label phát triển âm nhạc, nghệ sĩ và những chuyển động văn hoá dành cho thế hệ mới.',
  about_title text DEFAULT 'Không chỉ phát hành âm nhạc. Chúng tôi tạo ra dòng chảy.',
  about_text text DEFAULT 'Từ phòng thu đến sân khấu, từ những bản demo đầu tiên đến cộng đồng người hâm mộ — UniFLOWs là ngôi nhà cho những tiếng nói táo bạo và chân thật.',
  email text DEFAULT 'hello@uniflowslabel.com',
  emails jsonb DEFAULT '[]'::jsonb,
  city text DEFAULT 'Hồ Chí Minh · Việt Nam',
  announcements jsonb DEFAULT '[]'::jsonb,
  publishing jsonb DEFAULT '{}'::jsonb,
  unihube jsonb DEFAULT '{}'::jsonb,
  collective48k jsonb DEFAULT '{}'::jsonb,
  admin_accounts jsonb DEFAULT '[]'::jsonb,
  music_submissions jsonb DEFAULT '[]'::jsonb,
  shortlinks jsonb DEFAULT '[]'::jsonb,
  artist_order jsonb DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. BẢNG NGHỆ SĨ & HỒ SƠ TÀI KHOẢN (ARTISTS)
CREATE TABLE IF NOT EXISTS public.artists (
  id text PRIMARY KEY,
  name text NOT NULL,
  username text,
  email text,
  password text,
  role_type text DEFAULT 'exclusive',
  show_on_web boolean DEFAULT true,
  genre text,
  image text,
  bio text,
  gallery jsonb DEFAULT '[]'::jsonb,
  instagram text DEFAULT '',
  youtube text DEFAULT '',
  tiktok text DEFAULT '',
  spotify text DEFAULT '',
  monthly_streams text DEFAULT '0',
  estimated_revenue text DEFAULT '0',
  pending_balance text DEFAULT '0',
  payable_balance text DEFAULT '0',
  payout_cycle text DEFAULT 'Hàng tháng (Monthly)',
  royalty_rate text DEFAULT '80% Master',
  contract_term text DEFAULT '2024 - 2027',
  stats jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. BẢNG BẢN PHÁT HÀNH ÂM NHẠC (RELEASES)
CREATE TABLE IF NOT EXISTS public.releases (
  id text PRIMARY KEY,
  artist_id text,
  title text NOT NULL,
  type text DEFAULT 'Single',
  release_date text,
  pre_save_date text,
  slug text,
  genre text,
  submission_status text DEFAULT 'Đã phát hành',
  artwork_url text,
  audio_url text,
  links jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  tracklist jsonb DEFAULT '[]'::jsonb,
  tracks jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 4. BẢNG BÀI VIẾT & TẠP CHÍ (ARTICLES)
CREATE TABLE IF NOT EXISTS public.articles (
  id text PRIMARY KEY,
  title text NOT NULL,
  category text DEFAULT 'Tin Tức',
  date text,
  author text DEFAULT 'UniFLOWs Editorial',
  read_time text DEFAULT '3 phút đọc',
  cover text,
  excerpt text,
  content text,
  images jsonb DEFAULT '[]'::jsonb,
  published boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 5. BẢNG YÊU CẦU RÚT TIỀN (PAYOUT REQUESTS)
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id text,
  amount text NOT NULL,
  bank_info jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'Đang chờ xem xét',
  rejection_reason text DEFAULT '',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. BẢNG THÔNG BÁO NGHỆ SĨ & HỆ THỐNG (NOTIFICATIONS)
CREATE TABLE IF NOT EXISTS public.notifications (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  recipient_id text,
  title text NOT NULL,
  message text NOT NULL,
  action_url text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. BẢNG THÔNG BÁO DÀNH CHO ADMIN (ADMIN NOTIFICATIONS)
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id text PRIMARY KEY,
  type text DEFAULT 'general',
  title text NOT NULL,
  message text NOT NULL,
  artist_id text,
  artist_name text,
  artist_avatar text DEFAULT '',
  target_tab text DEFAULT 'admin-tab-overview',
  details jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. BẢNG TIẾP NHẬN YÊU CẦU ĐẶC BIỆT (SPECIAL REQUESTS: Takedown, Catalog, Tranh chấp)
CREATE TABLE IF NOT EXISTS public.special_requests (
  id text PRIMARY KEY,
  type text NOT NULL,
  title text NOT NULL,
  artist_id text,
  artist_name text,
  artist_email text,
  artist_avatar text DEFAULT '',
  details jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  admin_note text DEFAULT '',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. BẢNG DUYỆT ĐỔI ẢNH HỒ SƠ NGHỆ SĨ (ARTIST PHOTO REQUESTS)
CREATE TABLE IF NOT EXISTS public.artist_photo_requests (
  id text PRIMARY KEY,
  artist_id text,
  artist_name text,
  current_image text,
  requested_image text NOT NULL,
  status text DEFAULT 'pending',
  reject_reason text DEFAULT '',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  approved_at timestamp with time zone
);

-- 10. BẢNG BÁO CÁO VI PHẠM BẢN QUYỀN (COPYRIGHT REPORTS)
CREATE TABLE IF NOT EXISTS public.copyright_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id text,
  artist_name text,
  track_title text NOT NULL,
  platform text,
  violation_type text,
  target_url text NOT NULL,
  action_preference text,
  notes text,
  status text DEFAULT 'Đang tiếp nhận',
  admin_notes text DEFAULT '',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. BẢNG MIỄN TRỪ BẢN QUYỀN / GREEN-LIST (GREENLIST REQUESTS)
CREATE TABLE IF NOT EXISTS public.greenlist_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id text,
  artist_name text,
  platform text,
  channel_id text NOT NULL,
  track_scope text,
  purpose text,
  notes text,
  status text DEFAULT 'Đang tiếp nhận',
  admin_notes text DEFAULT '',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. BẢNG ĐẶT LỊCH HẸN & BOOKING A&R (APPOINTMENTS)
CREATE TABLE IF NOT EXISTS public.appointments (
  id text PRIMARY KEY,
  date text NOT NULL,
  time_slot text NOT NULL,
  duration_minutes integer DEFAULT 45,
  host text DEFAULT 'UniFLOWs A&R Team',
  topic_category text DEFAULT 'Thẩm định Demo',
  status text DEFAULT 'open',
  slot_notes text DEFAULT '',
  booker jsonb,
  meeting_method text DEFAULT '',
  meeting_link text DEFAULT '',
  admin_notes text DEFAULT '',
  confirmed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. BẢNG ĐĂNG KÝ NHẬN TIN NEWSLETTER (SUBSCRIBERS)
CREATE TABLE IF NOT EXISTS public.subscribers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text DEFAULT '',
  source text DEFAULT 'website_newsletter',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. BẢNG NHẬT KÝ KIỂM TOÁN / BẢO MẬT (AUDIT LOGS)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email text DEFAULT 'admin@uniflowslabel.com',
  action text NOT NULL,
  details text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 15. BỔ SUNG CỘT BẢO ĐẢM KHÔNG THIẾU Ở CÁC BẢNG HIỆN HỮU (ADD COLUMN IF NOT EXISTS)
-- ==============================================================================
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS role_type text DEFAULT 'exclusive';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS show_on_web boolean DEFAULT true;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS monthly_streams text DEFAULT '0';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS estimated_revenue text DEFAULT '0';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS payable_balance text DEFAULT '0';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS payout_cycle text DEFAULT 'Hàng tháng (Monthly)';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS royalty_rate text DEFAULT '80% Master';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS contract_term text DEFAULT '2024 - 2027';
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS stats jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS submission_status text DEFAULT 'Đã phát hành';
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS artwork_url text;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS links jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS tracklist jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS author text DEFAULT 'UniFLOWs Editorial';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS read_time text DEFAULT '3 phút đọc';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url text;

-- ==============================================================================
-- 16. KÍCH HOẠT ROW LEVEL SECURITY (RLS) & PHÂN QUYỀN TRUY CẬP CHO TOÀN BỘ BẢNG
-- ==============================================================================
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public read on %I" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow full admin on %I" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow public read on %I" ON public.%I FOR SELECT USING (true);', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow full admin on %I" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;

-- 17. TẠO & CẤU HÌNH STORAGE BUCKETS (artworks & audio-masters)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('artworks', 'artworks', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/*']),
  ('audio-masters', 'audio-masters', true, 104857600, ARRAY['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/*'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Phân quyền Storage Objects
DROP POLICY IF EXISTS "Mọi người đều có thể xem Artworks" ON storage.objects;
DROP POLICY IF EXISTS "Người dùng có thể upload Artworks" ON storage.objects;
DROP POLICY IF EXISTS "Toàn quyền xóa sửa Artworks" ON storage.objects;
DROP POLICY IF EXISTS "Mọi người đều có thể tải/nghe Audio Masters" ON storage.objects;
DROP POLICY IF EXISTS "Người dùng có thể upload Audio Masters" ON storage.objects;
DROP POLICY IF EXISTS "Toàn quyền xóa sửa Audio Masters" ON storage.objects;

CREATE POLICY "Mọi người đều có thể xem Artworks" ON storage.objects FOR SELECT USING (bucket_id = 'artworks');
CREATE POLICY "Người dùng có thể upload Artworks" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'artworks');
CREATE POLICY "Toàn quyền xóa sửa Artworks" ON storage.objects FOR ALL USING (bucket_id = 'artworks');

CREATE POLICY "Mọi người đều có thể tải/nghe Audio Masters" ON storage.objects FOR SELECT USING (bucket_id = 'audio-masters');
CREATE POLICY "Người dùng có thể upload Audio Masters" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio-masters');
CREATE POLICY "Toàn quyền xóa sửa Audio Masters" ON storage.objects FOR ALL USING (bucket_id = 'audio-masters');

-- 18. CẤP QUYỀN SCHEMA CHO CLIENT (ANON / AUTHENTICATED)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT ALL ON TABLE storage.objects TO anon, authenticated;
GRANT ALL ON TABLE storage.buckets TO anon, authenticated;
`;

let fullSchemaCached = '';

async function runSupabaseDiagnosticTest(resultContainer) {
  if (!resultContainer) return;
  resultContainer.style.display = 'block';
  resultContainer.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px; color:#2563eb; font-weight:600; padding:10px 0;">
      <span style="font-size:16px;">⏳</span>
      Đang kiểm tra kết nối Supabase Cloud và quét 8 bảng cơ sở dữ liệu...
    </div>
  `;

  try {
    const report = await testSupabaseConnection();
    
    let tablesHtml = '';
    for (const [tbl, isOk] of Object.entries(report.tables || {})) {
      const errDetail = report.tableErrors?.[tbl];
      const isMissingTable = errDetail && (errDetail.includes('does not exist') || errDetail.includes('relation'));

      tablesHtml += `
        <li style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid #f1f5f9; gap:10px; flex-wrap:wrap;">
          <span style="font-family:'DM Mono',monospace; font-size:11.5px; color:#1e293b;">${esc(tbl)}</span>
          <span style="font-weight:bold; font-size:11px; color:${isOk ? '#16a34a' : '#dc2626'}; text-align:right;">
            ${isOk ? '✓ Sẵn sàng' : '✗ ' + (isMissingTable ? 'Chưa tạo bảng trên Supabase' : (errDetail ? esc(errDetail) : 'Chưa sẵn sàng'))}
          </span>
        </li>
      `;
    }

    const storageOk = Boolean(report.storage?.artworks);
    const storageErr = report.storageErrors?.artworks || report.storageErrors?.listBuckets || '';
    const isOverallOk = Boolean(report.online);

    resultContainer.innerHTML = `
      <div style="background:${isOverallOk ? '#f0fdf4' : '#fef2f2'}; border:1px solid ${isOverallOk ? '#86efac' : '#fca5a5'}; border-radius:6px; padding:12px; margin-bottom:10px;">
        <div style="display:flex; align-items:center; gap:8px; font-weight:bold; color:${isOverallOk ? '#15803d' : '#991b1b'}; margin-bottom:4px;">
          <span style="font-size:16px;">${isOverallOk ? '✅' : '❌'}</span>
          <span>${esc(report.details || (isOverallOk ? 'Supabase Cloud kết nối thành công!' : 'Kết nối thất bại'))}</span>
        </div>
        <div style="font-size:11px; color:#475569; font-family:'DM Mono',monospace;">
          URL: ${esc(report.url || 'None')} · Độ trễ: ${report.latencyMs || 0}ms
        </div>
      </div>

      <div style="margin-top:8px;">
        <strong style="font-size:11px; text-transform:uppercase; color:#64748b; display:block; margin-bottom:6px;">Trạng thái chi tiết 8 bảng cơ sở dữ liệu:</strong>
        <ul style="list-style:none; padding:0; margin:0;">
          ${tablesHtml}
          <li style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; gap:10px; flex-wrap:wrap;">
            <span style="font-family:'DM Mono',monospace; font-size:11.5px; color:#1e293b;">storage.buckets (artworks)</span>
            <span style="font-weight:bold; font-size:11px; color:${storageOk ? '#16a34a' : '#d97706'}; text-align:right;">
              ${storageOk ? '✓ Sẵn sàng (artworks public)' : '⚠️ ' + (storageErr ? esc(storageErr) : 'Chưa tạo bucket hoặc chưa cấp quyền')}
            </span>
          </li>
        </ul>
      </div>

      ${(!isOverallOk || !storageOk || !report.tables.copyright_reports || !report.tables.greenlist_requests) ? `
        <div style="margin-top:12px; padding:12px 14px; background:#fffbeb; border:1px solid #fde68a; border-radius:6px; font-size:12px; color:#92400e; line-height:1.5;">
          <div style="display:flex; align-items:center; gap:6px; font-weight:bold; margin-bottom:4px;">
            <span>⚡</span>
            <span>Khắc phục lỗi thiếu bảng & Storage Bucket</span>
          </div>
          <div>Bạn chỉ cần sao chép script <b>SQL Sửa Nhanh</b> và chạy trong Supabase SQL Editor (an toàn 100%, không mất dữ liệu).</div>
          <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" class="btn-diag-quickfix-copy button" style="background:#f59e0b; color:#fff; border-color:#f59e0b; font-weight:bold; font-size:11px; padding:6px 14px;">
              ⚡ Sao chép SQL Sửa Nhanh
            </button>
            <button type="button" class="btn-diag-open-schema button alt" style="background:#fff; font-size:11px; padding:6px 12px; font-weight:bold;">
              📋 Mở Trình Xem SQL
            </button>
          </div>
        </div>
      ` : ''}
    `;

    // Attach click events inside diagnostic container
    resultContainer.querySelector('.btn-diag-quickfix-copy')?.addEventListener('click', (e) => {
      navigator.clipboard?.writeText(QUICKFIX_SQL_CONTENT);
      const btn = e.currentTarget;
      const orig = btn.textContent;
      btn.textContent = '✓ Đã sao chép SQL!';
      btn.style.background = '#10b981';
      setTimeout(() => {
        btn.textContent = orig;
        btn.style.background = '#f59e0b';
      }, 2000);
    });

    resultContainer.querySelector('.btn-diag-open-schema')?.addEventListener('click', () => {
      const schemaDialog = document.querySelector('#admin-sql-schema-dialog');
      openSqlSchemaDialog(schemaDialog, 'quickfix');
    });
  } catch (err) {
    resultContainer.innerHTML = `
      <div style="color:#dc2626; font-weight:bold; font-size:12px; padding:10px; background:#fef2f2; border:1px solid #fca5a5; border-radius:6px;">
        ❌ Không thể thực hiện kiểm tra: ${esc(err.message)}
      </div>
    `;
  }
}

async function openSqlSchemaDialog(dialog, initialMode = 'quickfix') {
  if (!dialog) return;
  const preview = document.querySelector('#schema-sql-content-preview');
  const tabQuickfix = document.querySelector('#tab-btn-sql-quickfix');
  const tabFull = document.querySelector('#tab-btn-sql-full');

  async function loadFullSchema() {
    if (fullSchemaCached) return fullSchemaCached;
    try {
      const res = await fetch('supabase_schema.sql');
      if (res.ok) {
        fullSchemaCached = await res.text();
        return fullSchemaCached;
      }
    } catch {}
    return '-- Xem file supabase_schema.sql trong thư mục dự án.';
  }

  function setMode(mode) {
    if (mode === 'quickfix') {
      if (preview) preview.textContent = QUICKFIX_SQL_CONTENT;
      if (tabQuickfix) {
        tabQuickfix.style.background = '#0f172a';
        tabQuickfix.style.color = '#fff';
      }
      if (tabFull) {
        tabFull.style.background = '#f1f5f9';
        tabFull.style.color = '#334155';
      }
    } else {
      if (preview) preview.textContent = '-- Đang nạp toàn bộ Schema V2...';
      loadFullSchema().then(text => {
        if (preview) preview.textContent = text;
      });
      if (tabFull) {
        tabFull.style.background = '#0f172a';
        tabFull.style.color = '#fff';
      }
      if (tabQuickfix) {
        tabQuickfix.style.background = '#f1f5f9';
        tabQuickfix.style.color = '#334155';
      }
    }
  }

  setMode(initialMode);
  dialog.showModal();
}

function initSupabaseCloudAdmin() {
  updateSupabaseStatusBanner();

  const btnQuickTest = document.querySelector('#btn-quick-test-supabase');
  const btnQuickConfig = document.querySelector('#btn-quick-config-supabase');
  const btnQuickSchema = document.querySelector('#btn-quick-schema-supabase');
  const bannerDiagBox = document.querySelector('#supabase-diagnostic-details');

  const configDialog = document.querySelector('#admin-supabase-config-dialog');
  const schemaDialog = document.querySelector('#admin-sql-schema-dialog');

  btnQuickTest?.addEventListener('click', () => {
    if (bannerDiagBox) {
      if (bannerDiagBox.style.display === 'block' && bannerDiagBox.innerHTML.includes('Trạng thái chi tiết')) {
        bannerDiagBox.style.display = 'none';
      } else {
        runSupabaseDiagnosticTest(bannerDiagBox);
      }
    }
  });

  btnQuickConfig?.addEventListener('click', () => {
    if (configDialog) {
      const modalUrl = document.querySelector('#modal-supabase-url');
      const modalKey = document.querySelector('#modal-supabase-key');
      if (modalUrl) modalUrl.value = getSupabaseUrl();
      if (modalKey) modalKey.value = getSupabaseAnonKey();
      configDialog.showModal();
    }
  });

  btnQuickSchema?.addEventListener('click', async () => {
    await openSqlSchemaDialog(schemaDialog, 'quickfix');
  });

  const handleToggleOffline = () => {
    setOfflineMode(true);
    updateSupabaseStatusBanner();
    showNotice('⚡ Đã kích hoạt Chế độ Ngoại Tuyến (Offline Mode)! Toàn bộ dữ liệu & thao tác sẽ lưu trực tiếp trên máy của bạn.');
  };

  const handleReconnectSupabase = () => {
    setOfflineMode(false);
    updateSupabaseStatusBanner();
    showNotice('🌐 Đang kết nối lại Supabase Cloud...');
    if (bannerDiagBox) {
      runSupabaseDiagnosticTest(bannerDiagBox);
    }
  };

  document.querySelector('#btn-quick-toggle-offline')?.addEventListener('click', handleToggleOffline);
  document.querySelector('#btn-tab-toggle-offline')?.addEventListener('click', handleToggleOffline);
  document.querySelector('#btn-quick-reconnect-supabase')?.addEventListener('click', handleReconnectSupabase);
  document.querySelector('#btn-tab-reconnect-supabase')?.addEventListener('click', handleReconnectSupabase);

  document.querySelector('#close-supabase-config-dialog-btn')?.addEventListener('click', () => configDialog?.close());
  document.querySelector('#modal-close-supabase-btn')?.addEventListener('click', () => configDialog?.close());
  document.querySelector('#close-sql-schema-dialog-btn')?.addEventListener('click', () => schemaDialog?.close());

  document.querySelector('#modal-save-supabase-btn')?.addEventListener('click', async () => {
    const url = document.querySelector('#modal-supabase-url')?.value.trim();
    const key = document.querySelector('#modal-supabase-key')?.value.trim();
    if (!url || !key) {
      alert('Vui lòng nhập cả Supabase URL và Anon Public Key!');
      return;
    }
    saveCustomSupabaseConfig(url, key);
    updateSupabaseStatusBanner();
    const statusEl = document.querySelector('#modal-supabase-status');
    await runSupabaseDiagnosticTest(statusEl);
  });

  document.querySelector('#modal-test-supabase-btn')?.addEventListener('click', async () => {
    const statusEl = document.querySelector('#modal-supabase-status');
    await runSupabaseDiagnosticTest(statusEl);
  });

  document.querySelector('#modal-reset-supabase-btn')?.addEventListener('click', async () => {
    if (confirm('Khôi phục Supabase URL và Key về mặc định ban đầu?')) {
      resetSupabaseConfig();
      const modalUrl = document.querySelector('#modal-supabase-url');
      const modalKey = document.querySelector('#modal-supabase-key');
      if (modalUrl) modalUrl.value = getSupabaseUrl();
      if (modalKey) modalKey.value = getSupabaseAnonKey();
      updateSupabaseStatusBanner();
      const statusEl = document.querySelector('#modal-supabase-status');
      await runSupabaseDiagnosticTest(statusEl);
    }
  });

  // Tab 7 Controls
  const btnTabTest = document.querySelector('#btn-tab-test-supabase');
  const btnTabViewSchema = document.querySelector('#btn-tab-view-schema');
  const btnTabSave = document.querySelector('#btn-tab-save-supabase');
  const btnTabReset = document.querySelector('#btn-tab-reset-supabase');
  const tabDiagBox = document.querySelector('#tab-supabase-diag-box');
  const tabMsg = document.querySelector('#tab-supabase-msg');

  btnTabTest?.addEventListener('click', () => {
    runSupabaseDiagnosticTest(tabDiagBox);
  });

  btnTabViewSchema?.addEventListener('click', async () => {
    await openSqlSchemaDialog(schemaDialog, 'quickfix');
  });

  btnTabSave?.addEventListener('click', async () => {
    const url = document.querySelector('#tab-supabase-url')?.value.trim();
    const key = document.querySelector('#tab-supabase-key')?.value.trim();
    if (!url || !key) {
      if (tabMsg) {
        tabMsg.textContent = '❌ Vui lòng nhập đủ URL và Key';
        tabMsg.style.color = '#dc2626';
      }
      return;
    }
    saveCustomSupabaseConfig(url, key);
    updateSupabaseStatusBanner();
    if (tabMsg) {
      tabMsg.textContent = '✓ Đã lưu cấu hình!';
      tabMsg.style.color = '#16a34a';
      setTimeout(() => { tabMsg.textContent = ''; }, 3000);
    }
    await runSupabaseDiagnosticTest(tabDiagBox);
  });

  btnTabReset?.addEventListener('click', async () => {
    if (confirm('Khôi phục cấu hình Supabase về mặc định ban đầu?')) {
      resetSupabaseConfig();
      const tabUrl = document.querySelector('#tab-supabase-url');
      const tabKey = document.querySelector('#tab-supabase-key');
      if (tabUrl) tabUrl.value = getSupabaseUrl();
      if (tabKey) tabKey.value = getSupabaseAnonKey();
      updateSupabaseStatusBanner();
      if (tabMsg) {
        tabMsg.textContent = '✓ Đã khôi phục mặc định';
        tabMsg.style.color = '#16a34a';
        setTimeout(() => { tabMsg.textContent = ''; }, 3000);
      }
      await runSupabaseDiagnosticTest(tabDiagBox);
    }
  });

  // Copy Quick-Fix SQL button
  const btnCopyQuickfix = document.querySelector('#btn-copy-quickfix-sql');
  btnCopyQuickfix?.addEventListener('click', () => {
    navigator.clipboard?.writeText(QUICKFIX_SQL_CONTENT);
    const orig = btnCopyQuickfix.textContent;
    btnCopyQuickfix.textContent = '✓ Đã chép SQL Sửa Nhanh!';
    btnCopyQuickfix.style.background = '#10b981';
    setTimeout(() => {
      btnCopyQuickfix.textContent = orig;
      btnCopyQuickfix.style.background = '#f59e0b';
    }, 2000);
  });

  // Copy Full SQL button
  const btnCopySql = document.querySelector('#btn-copy-full-sql');
  btnCopySql?.addEventListener('click', async () => {
    let text = fullSchemaCached;
    if (!text) {
      try {
        const res = await fetch('supabase_schema.sql');
        if (res.ok) text = await res.text();
      } catch {}
    }
    if (!text) text = document.querySelector('#schema-sql-content-preview')?.textContent || '';
    if (text) {
      navigator.clipboard?.writeText(text);
      const orig = btnCopySql.textContent;
      btnCopySql.textContent = '✓ Đã chép Toàn bộ V2!';
      btnCopySql.style.color = '#10b981';
      setTimeout(() => {
        btnCopySql.textContent = orig;
        btnCopySql.style.color = 'inherit';
      }, 2000);
    }
  });

  // Modal tab switcher
  document.querySelector('#tab-btn-sql-quickfix')?.addEventListener('click', () => {
    const preview = document.querySelector('#schema-sql-content-preview');
    if (preview) preview.textContent = QUICKFIX_SQL_CONTENT;
    const tabQ = document.querySelector('#tab-btn-sql-quickfix');
    const tabF = document.querySelector('#tab-btn-sql-full');
    if (tabQ) { tabQ.style.background = '#0f172a'; tabQ.style.color = '#fff'; }
    if (tabF) { tabF.style.background = '#f1f5f9'; tabF.style.color = '#334155'; }
  });

  document.querySelector('#tab-btn-sql-full')?.addEventListener('click', async () => {
    const preview = document.querySelector('#schema-sql-content-preview');
    if (preview) preview.textContent = '-- Đang nạp toàn bộ Schema V2...';
    let text = fullSchemaCached;
    if (!text) {
      try {
        const res = await fetch('supabase_schema.sql');
        if (res.ok) {
          text = await res.text();
          fullSchemaCached = text;
        }
      } catch {}
    }
    if (preview) preview.textContent = text || '-- Vui lòng xem file supabase_schema.sql trong thư mục dự án.';
    const tabQ = document.querySelector('#tab-btn-sql-quickfix');
    const tabF = document.querySelector('#tab-btn-sql-full');
    if (tabF) { tabF.style.background = '#0f172a'; tabF.style.color = '#fff'; }
    if (tabQ) { tabQ.style.background = '#f1f5f9'; tabQ.style.color = '#334155'; }
  });
}

// ============================================================================
// 15. LƯU NHANH BANNER THÔNG BÁO (TAB 7)
// ============================================================================
function initAnnouncementsQuickSave() {
  const saveBtn = document.querySelector('#save-announcements-btn');
  saveBtn?.addEventListener('click', async () => {
    const origText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Đang lưu...';

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
    try {
      await saveData(data);
      await logAuditEvent('Cập nhật Banner Thông Báo', `Đã lưu ${customAnnouncements.length} thông báo portal lên hệ thống`);
      showNotice(`✓ Đã lưu thành công ${customAnnouncements.length} banner thông báo lên Supabase và bộ nhớ!`);
      saveBtn.textContent = '✓ Đã lưu thành công!';
      saveBtn.style.background = '#059669';
    } catch (err) {
      showNotice(`Lỗi lưu thông báo: ${err.message}`, true);
      saveBtn.textContent = 'Lỗi lưu!';
    } finally {
      setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.textContent = origText;
        saveBtn.style.background = '#10b981';
      }, 2000);
    }
  });
}

// ============================================================================
// 16. TRUNG TÂM GỬI THÔNG BÁO NGHỆ SĨ (TAB 3 - SECTION 03.1)
// ============================================================================
function populateNotificationArtistDropdown() {
  const sel = document.querySelector('#notif-target-artist');
  if (!sel) return;
  
  const currentVal = sel.value;
  sel.innerHTML = `
    <option value="all">📢 Tất cả nghệ sĩ (Gửi Broadcast toàn hệ thống)</option>
    ${(data.artists || []).map(a => `
      <option value="${esc(a.id)}" ${a.id === currentVal ? 'selected' : ''}>👤 ${esc(a.name)} (${esc(a.id)})</option>
    `).join('')}
  `;
}

async function loadSentNotifications() {
  const listContainer = document.querySelector('#admin-sent-notifications-list');
  if (!listContainer) return;

  let list = [];

  // 1. Try Supabase first
  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout(
        supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30),
        2500,
        null
      );

      if (res && !res.error && res.data && res.data.length > 0) {
        list = res.data;
      }
    } catch (err) {
      console.warn('Lỗi đọc notifications từ Supabase:', err);
    }
  }

  // 2. If Supabase empty or offline, merge with localStorage
  try {
    const local = JSON.parse(localStorage.getItem('uniflows-admin-sent-notifications') || '[]');
    if (Array.isArray(local)) {
      const ids = new Set(list.map(x => x.id));
      local.forEach(item => {
        if (!ids.has(item.id)) {
          list.push(item);
          ids.add(item.id);
        }
      });
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
  } catch {}

  renderSentNotificationsList(list);
}

function renderSentNotificationsList(list = []) {
  const listContainer = document.querySelector('#admin-sent-notifications-list');
  if (!listContainer) return;

  if (list.length === 0) {
    listContainer.innerHTML = '<p class="empty" style="padding:16px; font-size:12px; text-align:center; color:#64748b; margin:0;">Chưa có thông báo nào được gửi. Hãy soạn và bấm "Gửi Thông Báo Ngay" ở trên.</p>';
    return;
  }

  const typeBadges = {
    important: { label: 'Quan trọng', bg: '#fee2e2', text: '#dc2626' },
    info: { label: 'Tin tức', bg: '#e0f2fe', text: '#0284c7' },
    payout: { label: 'Doanh thu', bg: '#dcfce7', text: '#16a34a' },
    release: { label: 'Phát hành', bg: '#fef3c7', text: '#d97706' },
    update: { label: 'Cập nhật', bg: '#ede9fe', text: '#7c3aed' }
  };

  listContainer.innerHTML = list.map((n, idx) => {
    const badge = typeBadges[n.type] || { label: n.type || 'Thông báo', bg: '#f1f5f9', text: '#475569' };
    const dateStr = n.created_at ? new Date(n.created_at).toLocaleString('vi-VN') : 'Vừa xong';
    const targetArtistName = n.artist_id === 'all' 
      ? '📢 Toàn bộ nghệ sĩ (Broadcast)' 
      : (data.artists?.find(a => a.id === n.artist_id)?.name || n.artist_id);

    return `
      <div class="sent-notif-item" style="padding:12px 16px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:flex-start; gap:12px; background:${idx % 2 === 0 ? '#fff' : '#f8fafc'};">
        <div style="flex:1;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
            <span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; background:${badge.bg}; color:${badge.text}; text-transform:uppercase;">
              ${badge.label}
            </span>
            <strong style="font-size:13px; color:#0f172a;">${esc(n.title)}</strong>
            <span style="font-size:11px; color:#64748b;">gửi đến <b>${esc(targetArtistName)}</b></span>
          </div>
          <p style="font-size:12px; color:#334155; margin:2px 0 4px; line-height:1.4;">${esc(n.message)}</p>
          <div style="display:flex; align-items:center; gap:12px; font-size:11px; color:#94a3b8; font-family:'DM Mono',monospace;">
            <span>🕒 ${esc(dateStr)}</span>
            ${n.action_url ? `<a href="${esc(n.action_url)}" target="_blank" style="color:#2563eb; text-decoration:underline;">🔗 Link: ${esc(n.action_url)}</a>` : ''}
          </div>
        </div>
        <button type="button" class="btn-delete-sent-notif button alt remove" data-notif-id="${esc(n.id)}" style="padding:4px 8px; font-size:11px; white-space:nowrap;">
          ✕ Xóa
        </button>
      </div>
    `;
  }).join('');

  listContainer.querySelectorAll('.btn-delete-sent-notif').forEach(btn => {
    btn.onclick = async () => {
      const notifId = btn.dataset.notifId;
      if (!notifId) return;
      if (!confirm('Xác nhận xóa thông báo này khỏi hệ thống?')) return;

      btn.disabled = true;
      btn.textContent = '...';

      // Delete on Supabase
      if (isSupabaseConfigured()) {
        try {
          await supabase.from('notifications').delete().eq('id', notifId);
        } catch (e) {
          console.warn('Lỗi xóa notification trên Supabase:', e);
        }
      }

      // Delete in localStorage
      try {
        let local = JSON.parse(localStorage.getItem('uniflows-admin-sent-notifications') || '[]');
        local = local.filter(x => x.id !== notifId);
        localStorage.setItem('uniflows-admin-sent-notifications', JSON.stringify(local));
      } catch {}

      showNotice('✓ Đã xóa thông báo thành công');
      loadSentNotifications();
    };
  });
}

function initArtistNotificationDispatcher() {
  populateNotificationArtistDropdown();
  loadSentNotifications();

  document.querySelector('#btn-refresh-sent-notifs')?.addEventListener('click', () => {
    loadSentNotifications();
  });

  const btnSend = document.querySelector('#btn-send-artist-notif');
  const targetSel = document.querySelector('#notif-target-artist');
  const typeSel = document.querySelector('#notif-type');
  const titleInput = document.querySelector('#notif-title');
  const messageInput = document.querySelector('#notif-message');
  const linkInput = document.querySelector('#notif-link');
  const syncBannerCheck = document.querySelector('#notif-sync-banner');
  const statusEl = document.querySelector('#notif-dispatch-status');

  btnSend?.addEventListener('click', async () => {
    const targetArtist = targetSel?.value || 'all';
    const type = typeSel?.value || 'info';
    const title = titleInput?.value.trim();
    const message = messageInput?.value.trim();
    const link = linkInput?.value.trim() || null;
    const syncBanner = syncBannerCheck?.checked ?? false;

    if (!title) {
      alert('Vui lòng nhập tiêu đề thông báo!');
      titleInput?.focus();
      return;
    }
    if (!message) {
      alert('Vui lòng nhập nội dung thông báo!');
      messageInput?.focus();
      return;
    }

    const origBtnText = btnSend.textContent;
    btnSend.disabled = true;
    btnSend.textContent = '⏳ Đang gửi lên Supabase...';
    if (statusEl) {
      statusEl.textContent = 'Đang xử lý...';
      statusEl.style.color = '#2563eb';
    }

    const notifId = 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newNotif = {
      id: notifId,
      artist_id: targetArtist,
      title,
      message,
      type,
      action_url: link,
      is_read: false,
      created_at: new Date().toISOString()
    };

    let supabaseSuccess = false;

    // 1. Send to Supabase
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('notifications').insert([newNotif]);
        if (error) {
          console.warn('Lỗi insert notification Supabase:', error);
        } else {
          supabaseSuccess = true;
        }
      } catch (err) {
        console.warn('Lỗi gửi notification catch:', err);
      }
    }

    // 2. Always persist locally
    try {
      const localHistory = JSON.parse(localStorage.getItem('uniflows-admin-sent-notifications') || '[]');
      localHistory.unshift(newNotif);
      localStorage.setItem('uniflows-admin-sent-notifications', JSON.stringify(localHistory.slice(0, 50)));

      if (targetArtist === 'all') {
        (data.artists || []).forEach(a => {
          const aKey = 'uniflows-notifications-' + a.id;
          const aList = JSON.parse(localStorage.getItem(aKey) || '[]');
          aList.unshift(newNotif);
          localStorage.setItem(aKey, JSON.stringify(aList.slice(0, 30)));
        });
      } else {
        const aKey = 'uniflows-notifications-' + targetArtist;
        const aList = JSON.parse(localStorage.getItem(aKey) || '[]');
        aList.unshift(newNotif);
        localStorage.setItem(aKey, JSON.stringify(aList.slice(0, 30)));
      }
    } catch (e) {
      console.warn('Lỗi lưu notification local:', e);
    }

    // 3. Sync to Banner Announcements if requested
    if (syncBanner) {
      if (!data.announcements) data.announcements = [];
      data.announcements.unshift({
        id: 'ann-' + Date.now(),
        title,
        type: type === 'important' ? 'important' : (type === 'release' ? 'update' : 'info'),
        date: new Date().toLocaleDateString('vi-VN'),
        content: message,
        active: true
      });
      try {
        await saveData(data);
        renderAnnouncementsEditor(data.announcements);
      } catch (e) {
        console.warn('Lỗi đồng bộ announcement:', e);
      }
    }

    // 4. Send automated email from custom domain if configured
    const emailCfg = getEmailConfig();
    let emailStatusNote = '';

    if (emailCfg.enabled) {
      if (targetArtist === 'all') {
        if (emailCfg.triggers.onBroadcastNotif) {
          const allArtists = [];
          const seenIds = new Set();
          for (const a of (data.artists || [])) {
            if (a.id && !seenIds.has(a.id)) {
              seenIds.add(a.id);
              allArtists.push(a);
            }
          }
          for (const d of (defaultData.artists || [])) {
            if (d.id && !seenIds.has(d.id)) {
              seenIds.add(d.id);
              allArtists.push(d);
            }
          }

          const sendPromises = allArtists.map(async (art) => {
            const resolvedArt = await resolveArtistObj(art.id);
            if (resolvedArt && resolvedArt.email) {
              return sendArtistNotificationEmail(resolvedArt, newNotif);
            }
            return { skipped: true };
          });

          const results = await Promise.allSettled(sendPromises);
          const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
          emailStatusNote = ` & đã tự động gửi email broadcast tới ${successCount} nghệ sĩ!`;
        } else {
          emailStatusNote = ` (Lưu ý: Tùy chọn "Thông báo toàn thể: Gửi email broadcast hàng loạt" đang tắt trong Cấu hình Email)`;
        }
      } else {
        if (emailCfg.triggers.onDirectNotif) {
          const targetArtistObj = await resolveArtistObj(targetArtist);
          if (targetArtistObj && targetArtistObj.email) {
            const emailRes = await sendArtistNotificationEmail(targetArtistObj, newNotif);
            if (emailRes && emailRes.success) {
              emailStatusNote = ` & đã gửi email thông báo tới "${targetArtistObj.email}"!`;
            } else if (emailRes && !emailRes.disabled && !emailRes.skipped && emailRes.error) {
              emailStatusNote = ` ⚠️ (Lỗi gửi email: ${emailRes.error})`;
            }
          } else {
            emailStatusNote = ` ⚠️ (Nghệ sĩ "${targetArtist}" chưa có địa chỉ email trong hệ thống)`;
          }
        } else {
          emailStatusNote = ` (Lưu ý: Tùy chọn "Thông báo riêng nghệ sĩ" đang tắt trong Cấu hình Email)`;
        }
      }
    } else {
      emailStatusNote = ` (Lưu ý: Tính năng gửi email tự động đang tắt trong Cấu hình Email)`;
    }

    await logAuditEvent('Gửi Thông Báo Nghệ Sĩ', `Đã gửi thông báo "${title}" tới ${targetArtist === 'all' ? 'tất cả nghệ sĩ' : targetArtist}`);

    if (statusEl) {
      statusEl.textContent = `✓ Đã gửi thông báo thành công!${emailStatusNote}`;
      statusEl.style.color = '#16a34a';
    }

    showNotice(`✓ Đã gửi thông báo "${title}" tới ${targetArtist === 'all' ? 'tất cả nghệ sĩ' : targetArtist} thành công!${emailStatusNote}`);

    if (titleInput) titleInput.value = '';
    if (messageInput) messageInput.value = '';
    if (linkInput) linkInput.value = '';

    btnSend.disabled = false;
    btnSend.textContent = origBtnText;

    loadSentNotifications();
  });
}

// ============================================================================
// 17. QUẢN LÝ CẤU HÌNH EMAIL DOMAIN TỰ ĐỘNG (TAB 7 - SECTION 05)
// ============================================================================
function initEmailConfigAdmin() {
  const chkEnabled = document.querySelector('#email-cfg-enabled');
  const selProvider = document.querySelector('#email-cfg-provider');
  const inputSenderEmail = document.querySelector('#email-cfg-sender-email');
  const inputSenderName = document.querySelector('#email-cfg-sender-name');
  const inputApiKey = document.querySelector('#email-cfg-api-key');
  const inputWebhookUrl = document.querySelector('#email-cfg-webhook-url');
  const boxWebhook = document.querySelector('#box-email-webhook-url');

  const trigAccount = document.querySelector('#email-trig-account');
  const trigRevision = document.querySelector('#email-trig-revision');
  const trigReject = document.querySelector('#email-trig-reject');
  const trigApprove = document.querySelector('#email-trig-approve');
  const trigDirect = document.querySelector('#email-trig-direct');
  const trigBroadcast = document.querySelector('#email-trig-broadcast');
  const trigPayout = document.querySelector('#email-trig-payout');

  const btnSave = document.querySelector('#btn-save-email-cfg');
  const statusMsg = document.querySelector('#email-cfg-status-msg');
  const btnTest = document.querySelector('#btn-send-test-email');
  const testRecipientInput = document.querySelector('#email-test-recipient');

  if (!chkEnabled) return;

  // Load current configuration
  const cfg = getEmailConfig();
  chkEnabled.checked = Boolean(cfg.enabled);
  if (selProvider) selProvider.value = cfg.provider || 'brevo';
  if (inputSenderEmail) inputSenderEmail.value = cfg.senderEmail || '';
  if (inputSenderName) inputSenderName.value = cfg.senderName || 'UniFLOWs Record Label';
  if (inputApiKey) inputApiKey.value = cfg.apiKey || '';
  if (inputWebhookUrl) inputWebhookUrl.value = cfg.webhookUrl || '';

  if (boxWebhook) {
    boxWebhook.style.display = (cfg.provider === 'custom_webhook' || cfg.provider === 'supabase_edge') ? 'block' : 'none';
  }

  if (cfg.triggers) {
    if (trigAccount) trigAccount.checked = cfg.triggers.onAccountCreated !== false;
    if (trigRevision) trigRevision.checked = cfg.triggers.onReleaseRevision !== false;
    if (trigReject) trigReject.checked = cfg.triggers.onReleaseRejected !== false;
    if (trigApprove) trigApprove.checked = cfg.triggers.onReleaseApproved !== false;
    if (trigDirect) trigDirect.checked = cfg.triggers.onDirectNotif !== false;
    if (trigBroadcast) trigBroadcast.checked = Boolean(cfg.triggers.onBroadcastNotif);
    if (trigPayout) trigPayout.checked = cfg.triggers.onPayoutUpdate !== false;
  }

  selProvider?.addEventListener('change', () => {
    const val = selProvider.value;
    if (boxWebhook) {
      boxWebhook.style.display = (val === 'custom_webhook' || val === 'supabase_edge') ? 'block' : 'none';
    }
  });

  btnSave?.addEventListener('click', () => {
    const updatedCfg = {
      enabled: chkEnabled.checked,
      provider: selProvider?.value || 'brevo',
      senderEmail: inputSenderEmail?.value.trim() || 'notifications@uniflowslabel.com',
      senderName: inputSenderName?.value.trim() || 'UniFLOWs Record Label',
      apiKey: inputApiKey?.value.trim() || '',
      webhookUrl: inputWebhookUrl?.value.trim() || '',
      triggers: {
        onAccountCreated: trigAccount?.checked ?? true,
        onReleaseRevision: trigRevision?.checked ?? true,
        onReleaseRejected: trigReject?.checked ?? true,
        onReleaseApproved: trigApprove?.checked ?? true,
        onDirectNotif: trigDirect?.checked ?? true,
        onBroadcastNotif: trigBroadcast?.checked ?? false,
        onPayoutUpdate: trigPayout?.checked ?? true
      }
    };

    saveEmailConfig(updatedCfg);
    if (statusMsg) {
      statusMsg.textContent = '✓ Đã lưu cấu hình email!';
      statusMsg.style.color = '#16a34a';
      setTimeout(() => { statusMsg.textContent = ''; }, 3000);
    }
    showNotice('✓ Đã lưu cấu hình Email Domain thành công!');
    logAuditEvent('Cập nhật cấu hình Email Domain', `Provider: ${updatedCfg.provider} - Sender: ${updatedCfg.senderEmail} - Trạng thái: ${updatedCfg.enabled ? 'Bật' : 'Tắt'}`);
  });

  btnTest?.addEventListener('click', async () => {
    const recipient = testRecipientInput?.value.trim();
    if (!recipient || !recipient.includes('@')) {
      alert('Vui lòng nhập địa chỉ email nhận thư thử nghiệm!');
      testRecipientInput?.focus();
      return;
    }

    const origText = btnTest.textContent;
    btnTest.disabled = true;
    btnTest.textContent = '⏳ Đang gửi mail...';

    const res = await sendTestEmail(recipient);
    btnTest.disabled = false;
    btnTest.textContent = origText;

    if (res.success) {
      alert(`🎉 Gửi email thử nghiệm THÀNH CÔNG đến ${recipient}!\nVui lòng kiểm tra Hộp thư đến (hoặc mục Spam).`);
      showNotice(`✓ Đã gửi email thử nghiệm thành công đến ${recipient}!`);
    } else {
      alert(`❌ Gửi email thất bại:\n${res.error || 'Vui lòng kiểm tra lại API Key và Email người gửi.'}`);
    }
  });
}

// ============================================================================
// 14. ARTIST PHOTO CHANGE REQUESTS REVIEWER (ADMIN DUYỆT 1-CLICK LÊN WEB)
// ============================================================================
async function loadArtistPhotoRequests() {
  const container = document.querySelector('#admin-photo-requests-list');
  const counterEl = document.querySelector('#admin-photo-requests-counter');
  if (!container) return;

  let requests = [];
  try {
    requests = JSON.parse(localStorage.getItem('uniflows-artist-photo-requests') || '[]');
  } catch {}

  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout(
        supabase
          .from('artist_photo_requests')
          .select('*')
          .order('created_at', { ascending: false }),
        2500,
        null
      );
      const dbRequests = res?.data;
      const error = res?.error;
      if (!error && Array.isArray(dbRequests) && dbRequests.length > 0) {
        requests = dbRequests;
        try { localStorage.setItem('uniflows-artist-photo-requests', JSON.stringify(requests)); } catch {}
      }
    } catch {}
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  if (counterEl) {
    counterEl.textContent = `${pendingRequests.length} chờ duyệt`;
    counterEl.style.background = pendingRequests.length > 0 ? '#fef3c7' : '#f1f5f9';
    counterEl.style.color = pendingRequests.length > 0 ? '#b45309' : '#64748b';
  }

  if (pendingRequests.length === 0) {
    container.innerHTML = `<div style="color:#94a3b8; font-size:12px; font-style:italic; padding:10px 0; grid-column:1/-1;">Không có yêu cầu đổi ảnh nào đang chờ duyệt. Mọi hồ sơ nghệ sĩ đang ở trạng thái mới nhất.</div>`;
    return;
  }

  container.innerHTML = pendingRequests.map(req => {
    const art = (data.artists || []).find(a => a.id === req.artist_id || a.name === req.artist_name || a.email === req.artist_email);
    const currentImg = art?.image || req.current_image || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=200&q=80';
    const newImg = req.requested_image;
    const timeStr = new Date(req.created_at || Date.now()).toLocaleString('vi-VN');

    return `
      <div class="photo-req-card" style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:10px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <strong style="font-size:14px; color:#0f172a; display:block;">${esc(req.artist_name)}</strong>
            <span style="font-size:11px; font-family:'DM Mono',monospace; color:#64748b;">${esc(req.artist_email || req.artist_id)}</span>
          </div>
          <span style="font-size:10px; font-family:'DM Mono',monospace; background:#eff6ff; color:#1d4ed8; padding:2px 6px; border-radius:4px; font-weight:bold;">${timeStr}</span>
        </div>

        ${req.note ? `<p style="margin:0; font-size:11.5px; color:#475569; background:#fff; padding:6px 10px; border-radius:4px; border:1px solid #e2e8f0; font-style:italic;">"${esc(req.note)}"</p>` : ''}

        <!-- Comparison Preview -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; text-align:center; background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:10px;">
          <div>
            <span style="font-size:9.5px; font-family:'DM Mono',monospace; color:#64748b; font-weight:bold; display:block; margin-bottom:4px;">ẢNH CŨ TRÊN WEB</span>
            <div style="width:64px; height:64px; border-radius:50%; overflow:hidden; margin:0 auto; border:1px solid #cbd5e1; background:#000;">
              <img src="${esc(currentImg)}" style="width:100%; height:100%; object-fit:cover; display:block;">
            </div>
          </div>
          <div>
            <span style="font-size:9.5px; font-family:'DM Mono',monospace; color:#16a34a; font-weight:bold; display:block; margin-bottom:4px;">ẢNH MỚI XIN ĐỔI ➔</span>
            <div style="width:64px; height:64px; border-radius:50%; overflow:hidden; margin:0 auto; border:2px solid #16a34a; background:#000;">
              <img src="${esc(newImg)}" style="width:100%; height:100%; object-fit:cover; display:block;">
            </div>
          </div>
        </div>

        <div style="display:flex; gap:8px; margin-top:auto; padding-top:4px;">
          <button type="button" class="btn-approve-photo-req button" data-req-id="${req.id}" style="flex:1; background:#16a34a; color:#fff; border-color:#16a34a; padding:6px 12px; font-size:11px; font-weight:bold;">
            ✅ Duyệt &amp; Đăng Web
          </button>
          <button type="button" class="btn-reject-photo-req button alt remove" data-req-id="${req.id}" style="padding:6px 10px; font-size:11px;">
            ✕ Từ chối
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach Approve Events
  container.querySelectorAll('.btn-approve-photo-req').forEach(btn => {
    btn.onclick = async () => {
      const reqId = btn.dataset.reqId;
      const targetReq = requests.find(r => r.id === reqId);
      if (!targetReq) return;

      btn.disabled = true;
      btn.textContent = 'Đang duyệt...';

      // 1. Update in data.artists
      const artistIndex = (data.artists || []).findIndex(a => a.id === targetReq.artist_id || a.name === targetReq.artist_name || a.email === targetReq.artist_email);
      if (artistIndex >= 0) {
        data.artists[artistIndex].image = targetReq.requested_image;
      }

      // 2. Update cached data
      saveData(data);

      // 3. Update Supabase artists table
      if (isSupabaseConfigured() && targetReq.artist_id) {
        try {
          await supabase.from('artists').update({ image: targetReq.requested_image }).eq('id', targetReq.artist_id);
        } catch (err) {
          console.warn('Lỗi cập nhật ảnh nghệ sĩ lên Supabase:', err);
        }
      }

      // 4. Mark request approved
      targetReq.status = 'approved';
      targetReq.approved_at = new Date().toISOString();
      localStorage.setItem('uniflows-artist-photo-requests', JSON.stringify(requests));

      if (isSupabaseConfigured()) {
        try {
          await supabase.from('artist_photo_requests').update({ status: 'approved', approved_at: targetReq.approved_at }).eq('id', reqId);
        } catch {}
      }

      // 5. Send in-app notification to artist
      if (isSupabaseConfigured() && targetReq.artist_id) {
        try {
          await supabase.from('notifications').insert([{
            artist_id: targetReq.artist_id,
            title: 'Ảnh đại diện Website đã được phê duyệt',
            message: 'Ban quản trị đã phê duyệt ảnh đại diện mới của bạn. Ảnh hiện đã xuất hiện trực tiếp trên trang chủ và trang nghệ sĩ uniflowslabel.com.',
            type: 'info',
            created_at: new Date().toISOString(),
            read: false
          }]);
        } catch {}
      }

      // 6. Send email notification to artist
      try {
        const artistObj = (data.artists || []).find(a => a.id === targetReq.artist_id || a.name === targetReq.artist_name || a.email === targetReq.artist_email) || {
          name: targetReq.artist_name,
          email: targetReq.artist_email
        };
        if (artistObj && artistObj.email) {
          sendPhotoRequestStatusEmail({
            artist: artistObj,
            status: 'approved',
            reviewNotes: 'Ảnh đã được ban quản trị phê duyệt và cập nhật trực tiếp lên website chính thức.',
            newPhotoUrl: targetReq.requested_image
          }).catch(e => console.warn('Lỗi gửi email duyệt ảnh:', e));
        }
      } catch (err) {
        console.warn('Lỗi gửi email duyệt ảnh:', err);
      }

      showNotice(`✓ Đã duyệt ảnh mới cho nghệ sĩ "${targetReq.artist_name}" và cập nhật lên Website thành công!`);
      await logAuditEvent('Duyệt ảnh nghệ sĩ', `Đã duyệt ảnh mới cho: ${targetReq.artist_name} (${targetReq.artist_id})`);
      renderArtistSelector();
      loadArtistPhotoRequests();
    };
  });

  // Attach Reject Events
  container.querySelectorAll('.btn-reject-photo-req').forEach(btn => {
    btn.onclick = async () => {
      const reqId = btn.dataset.reqId;
      const targetReq = requests.find(r => r.id === reqId);
      if (!targetReq) return;

      const reason = prompt(`Lý do từ chối ảnh của "${targetReq.artist_name}" (tùy chọn):`, 'Ảnh chất lượng chưa đạt chuẩn hoặc sai tỉ lệ');
      if (reason === null) return;

      targetReq.status = 'rejected';
      targetReq.reject_reason = reason;
      targetReq.rejected_at = new Date().toISOString();
      localStorage.setItem('uniflows-artist-photo-requests', JSON.stringify(requests));

      if (isSupabaseConfigured()) {
        try {
          await supabase.from('artist_photo_requests').update({ status: 'rejected', reject_reason: reason }).eq('id', reqId);
        } catch {}
      }

      // Send email notification to artist
      try {
        const artistObj = (data.artists || []).find(a => a.id === targetReq.artist_id || a.name === targetReq.artist_name || a.email === targetReq.artist_email) || {
          name: targetReq.artist_name,
          email: targetReq.artist_email
        };
        if (artistObj && artistObj.email) {
          sendPhotoRequestStatusEmail({
            artist: artistObj,
            status: 'rejected',
            reviewNotes: reason || 'Ảnh chưa đạt yêu cầu về chất lượng hoặc nhận diện.',
            newPhotoUrl: targetReq.requested_image
          }).catch(e => console.warn('Lỗi gửi email từ chối ảnh:', e));
        }
      } catch (err) {
        console.warn('Lỗi gửi email từ chối ảnh:', err);
      }

      showNotice(`✕ Đã từ chối yêu cầu đổi ảnh của "${targetReq.artist_name}".`);
      loadArtistPhotoRequests();
    };
  });
}

function initArtistPhotoRequestsAdmin() {
  loadArtistPhotoRequests();
}

// ============================================================================
// 15. QUICK RELEASE CREATOR (ADMIN PHÁT HÀNH NHANH LÊN WEB VỚI PREVIEW 10S-30S)
// ============================================================================
function initQuickReleaseAdmin() {
  const modal = document.querySelector('#quick-release-modal');
  const openBtn = document.querySelector('#btn-open-quick-release-modal');
  const closeBtn = document.querySelector('#close-quick-release-modal-btn');
  const cancelBtn = document.querySelector('#cancel-quick-release-btn');
  const form = document.querySelector('#quick-release-form');

  const artistSelect = document.querySelector('#quick-rel-artist');
  const titleInput = document.querySelector('#quick-rel-title');
  const typeSelect = document.querySelector('#quick-rel-type');
  const artFileInput = document.querySelector('#quick-rel-art-file');
  const artUrlInput = document.querySelector('#quick-rel-art-url');
  const artPreviewImg = document.querySelector('#quick-rel-art-preview');
  const artStatusEl = document.querySelector('#quick-rel-art-status');

  const audioFileInput = document.querySelector('#quick-rel-audio-file');
  const audioUrlInput = document.querySelector('#quick-rel-audio-url');
  const audioStatusEl = document.querySelector('#quick-rel-audio-status');
  const audioPlayer = document.querySelector('#quick-rel-audio-element');

  const startSlider = document.querySelector('#quick-rel-start-slider');
  const startInput = document.querySelector('#quick-rel-start-input');
  const totalLenEl = document.querySelector('#quick-rel-audio-total-len');
  const snippetReadout = document.querySelector('#quick-rel-snippet-readout');
  const testPlayBtn = document.querySelector('#quick-rel-test-play-btn');
  const submitStatus = document.querySelector('#quick-rel-submit-status');

  // Platform Links & Custom Platforms
  const linkSpotifyInput = document.querySelector('#quick-rel-link-spotify');
  const linkAppleInput = document.querySelector('#quick-rel-link-apple');
  const linkYoutubeInput = document.querySelector('#quick-rel-link-youtube');
  const linkZingInput = document.querySelector('#quick-rel-link-zing');
  const linkTiktokInput = document.querySelector('#quick-rel-link-tiktok');
  const linkSoundcloudInput = document.querySelector('#quick-rel-link-soundcloud');
  const linkAmazonInput = document.querySelector('#quick-rel-link-amazon');
  const addCustomPlatBtn = document.querySelector('#btn-add-quick-rel-custom-platform');
  const customPlatList = document.querySelector('#quick-rel-custom-platforms-list');

  let activeSnippetDuration = 30;
  let audioDuration = 180;
  let testPlayTimer = null;
  let isTestingSnippet = false;

  let selectedCompressedArtworkFile = null;
  let selectedAudioFile = null;

  function formatTimeMinSec(secs) {
    const s = Math.max(0, Math.floor(secs));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }

  function updateSnippetDisplay() {
    const startSec = parseInt(startInput?.value || 30, 10);
    const endSec = startSec + activeSnippetDuration;
    if (snippetReadout) {
      snippetReadout.textContent = `Đoạn phát: ${formatTimeMinSec(startSec)} ➔ ${formatTimeMinSec(endSec)} (${activeSnippetDuration}s)`;
    }
  }

  function populateArtists() {
    if (!artistSelect) return;
    const artists = data.artists || [];
    artistSelect.innerHTML = artists.map(a => `<option value="${esc(a.id)}">${esc(a.name)} (${esc(a.id)})</option>`).join('');
  }

  function addCustomPlatformRow(nameVal = '', urlVal = '') {
    if (!customPlatList) return;
    const row = document.createElement('div');
    row.className = 'quick-rel-custom-plat-row';
    row.style.cssText = 'display:flex; gap:8px; align-items:center; background:#fff; padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px;';
    row.innerHTML = `
      <input type="text" class="custom-plat-name" placeholder="Tên nền tảng (Deezer, Tidal, NCT...)" value="${esc(nameVal)}" style="font-size:11.5px; padding:6px 8px; flex:1; border:1px solid #cbd5e1; border-radius:4px;" required>
      <input type="url" class="custom-plat-url" placeholder="https://..." value="${esc(urlVal)}" style="font-size:11.5px; padding:6px 8px; flex:2; border:1px solid #cbd5e1; border-radius:4px;" required>
      <button type="button" class="btn-del-custom-plat button alt remove" style="padding:4px 8px; font-size:11px; color:#dc2626; border-color:#fca5a5; cursor:pointer;" title="Xóa nền tảng này">✕</button>
    `;
    row.querySelector('.btn-del-custom-plat')?.addEventListener('click', () => row.remove());
    customPlatList.appendChild(row);
  }

  addCustomPlatBtn?.addEventListener('click', () => addCustomPlatformRow());

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      populateArtists();
      if (titleInput) titleInput.value = '';
      if (artUrlInput) artUrlInput.value = '';
      if (artFileInput) artFileInput.value = '';
      if (artStatusEl) artStatusEl.textContent = '';
      if (audioFileInput) audioFileInput.value = '';
      if (audioUrlInput) audioUrlInput.value = '';
      if (audioStatusEl) audioStatusEl.textContent = '';
      if (submitStatus) submitStatus.textContent = '';

      if (linkSpotifyInput) linkSpotifyInput.value = '';
      if (linkAppleInput) linkAppleInput.value = '';
      if (linkYoutubeInput) linkYoutubeInput.value = '';
      if (linkZingInput) linkZingInput.value = '';
      if (linkTiktokInput) linkTiktokInput.value = '';
      if (linkSoundcloudInput) linkSoundcloudInput.value = '';
      if (linkAmazonInput) linkAmazonInput.value = '';
      if (customPlatList) customPlatList.innerHTML = '';

      selectedCompressedArtworkFile = null;
      selectedAudioFile = null;
      if (audioPlayer) audioPlayer.pause();
      isTestingSnippet = false;
      if (testPlayBtn) testPlayBtn.innerHTML = '<span>▶ Nghe Thử Đoạn Preview</span>';

      modal.showModal();
    });

    const closeModal = () => {
      if (audioPlayer) audioPlayer.pause();
      clearTimeout(testPlayTimer);
      modal.close();
    };
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    // Duration preset buttons
    modal.querySelectorAll('.btn-snippet-dur').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.btn-snippet-dur').forEach(b => {
          b.style.background = '#fff';
          b.style.color = 'inherit';
          b.style.borderColor = 'var(--ink)';
        });
        btn.style.background = '#0f172a';
        btn.style.color = '#d8ff48';
        btn.style.borderColor = '#0f172a';
        activeSnippetDuration = parseInt(btn.dataset.sec, 10);
        updateSnippetDisplay();
      });
    });

    // Slider & Start input synchronization
    startSlider?.addEventListener('input', (e) => {
      if (startInput) startInput.value = e.target.value;
      updateSnippetDisplay();
    });
    startInput?.addEventListener('input', (e) => {
      if (startSlider) startSlider.value = e.target.value;
      updateSnippetDisplay();
    });

    // Artwork file auto-compression (1:1 square, 1200x1200, WebP)
    artFileInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (artStatusEl) {
        artStatusEl.textContent = 'Đang tự động nén vuông 1:1 WebP...';
        artStatusEl.style.color = '#0284c7';
      }
      try {
        const res = await compressImageFile(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          square: true,
          quality: 0.86,
          format: 'image/webp'
        });
        selectedCompressedArtworkFile = res.file;
        if (artPreviewImg) artPreviewImg.src = res.dataUrl;
        if (artStatusEl) {
          artStatusEl.innerHTML = `✓ Đã nén: <b>${res.originalSizeFormatted} ➔ ${res.compressedSizeFormatted} (-${res.savedPercent}%)</b>`;
          artStatusEl.style.color = '#15803d';
        }
      } catch (err) {
        if (artStatusEl) {
          artStatusEl.textContent = `Lỗi nén ảnh: ${err.message}`;
          artStatusEl.style.color = '#ef4444';
        }
      }
    });

    artUrlInput?.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url && artPreviewImg) {
        artPreviewImg.src = url;
        selectedCompressedArtworkFile = null;
      }
    });

    // Audio file loading into audio element for preview calculation
    audioFileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      selectedAudioFile = file;
      const objectUrl = URL.createObjectURL(file);
      if (audioPlayer) {
        audioPlayer.src = objectUrl;
        audioPlayer.load();
      }
      if (audioStatusEl) {
        audioStatusEl.textContent = `✓ Đã nạp tệp: ${file.name} (${formatBytes(file.size)})`;
        audioStatusEl.style.color = '#15803d';
      }
    });

    audioUrlInput?.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url && audioPlayer) {
        audioPlayer.src = url;
        audioPlayer.load();
        selectedAudioFile = null;
      }
    });

    // When audio metadata is loaded
    audioPlayer?.addEventListener('loadedmetadata', () => {
      audioDuration = Math.floor(audioPlayer.duration || 180);
      if (totalLenEl) {
        totalLenEl.textContent = `Tổng thời lượng: ${formatTimeMinSec(audioDuration)}`;
      }
      if (startSlider) {
        const maxStart = Math.max(10, audioDuration - activeSnippetDuration);
        startSlider.max = maxStart;
        if (parseInt(startSlider.value, 10) > maxStart) {
          startSlider.value = Math.floor(maxStart / 2);
          if (startInput) startInput.value = startSlider.value;
        }
      }
      updateSnippetDisplay();
    });

    // Test Play Snippet Button
    testPlayBtn?.addEventListener('click', () => {
      if (!audioPlayer || !audioPlayer.src) {
        alert('Vui lòng chọn tệp Audio hoặc dán URL nhạc trước khi nghe thử.');
        return;
      }

      if (isTestingSnippet) {
        audioPlayer.pause();
        clearTimeout(testPlayTimer);
        isTestingSnippet = false;
        testPlayBtn.innerHTML = '<span>▶ Nghe Thử Đoạn Preview</span>';
        return;
      }

      const startSec = parseInt(startInput?.value || 30, 10);
      audioPlayer.currentTime = startSec;
      audioPlayer.play().then(() => {
        isTestingSnippet = true;
        testPlayBtn.innerHTML = '<span>⏹ Dừng Nghe Thử</span>';

        clearTimeout(testPlayTimer);
        testPlayTimer = setTimeout(() => {
          audioPlayer.pause();
          isTestingSnippet = false;
          testPlayBtn.innerHTML = '<span>▶ Nghe Thử Đoạn Preview</span>';
        }, activeSnippetDuration * 1000);
      }).catch(err => {
        alert(`Không thể phát âm thanh: ${err.message}`);
      });
    });

    // Submit Quick Release Form
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const artistId = artistSelect?.value;
      const title = titleInput?.value.trim();
      const type = typeSelect?.value || 'Single';
      const startSec = parseInt(startInput?.value || 30, 10);

      if (!artistId || !title) {
        alert('Vui lòng chọn nghệ sĩ và nhập tên bài hát.');
        return;
      }

      const submitBtn = document.querySelector('#submit-quick-release-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Đang tải lên & phát hành...';
      }
      if (submitStatus) submitStatus.textContent = 'Đang tải file lên đám mây...';

      try {
        // 1. Upload Artwork
        let finalArtworkUrl = artUrlInput?.value.trim() || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=85';
        if (selectedCompressedArtworkFile) {
          finalArtworkUrl = await uploadImageSmart(selectedCompressedArtworkFile, `artwork_${slug(title)}_${Date.now()}`);
        }

        // 2. Upload Audio
        let finalAudioUrl = audioUrlInput?.value.trim() || '';
        if (selectedAudioFile) {
          if (isSupabaseConfigured()) {
            finalAudioUrl = await uploadAudioFile(selectedAudioFile, `master_${slug(title)}_${Date.now()}`);
          } else {
            finalAudioUrl = URL.createObjectURL(selectedAudioFile);
          }
        }

        const cleanSlug = slug(title);
        const newReleaseId = Date.now();
        const todayDate = new Date().toISOString().split('T')[0];

        // Find artist
        const targetArtist = (data.artists || []).find(a => a.id === artistId);
        if (!targetArtist) throw new Error('Không tìm thấy thông tin nghệ sĩ được chọn');

        if (!Array.isArray(targetArtist.products)) {
          targetArtist.products = [];
        }

        // Release Product Object
        const releaseObj = {
          id: newReleaseId,
          title,
          type,
          slug: cleanSlug,
          submissionStatus: 'Đã phát hành',
          releaseDate: todayDate,
          artworkUrl: finalArtworkUrl,
          audioUrl: finalAudioUrl,
          previewStart: startSec,
          previewDuration: activeSnippetDuration,
          previewMode: 'custom',
          previewEnabled: true,
          streams: '0',
          revenue: '0',
          links: (() => {
            const lk = {
              spotify: linkSpotifyInput?.value.trim() || `https://open.spotify.com/search/${encodeURIComponent(title + ' ' + targetArtist.name)}`,
              apple: linkAppleInput?.value.trim() || `https://music.apple.com/us/search?term=${encodeURIComponent(title + ' ' + targetArtist.name)}`,
              youtube: linkYoutubeInput?.value.trim() || `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' ' + targetArtist.name)}`,
              zing: linkZingInput?.value.trim() || '',
              tiktok: linkTiktokInput?.value.trim() || '',
              soundcloud: linkSoundcloudInput?.value.trim() || '',
              amazon: linkAmazonInput?.value.trim() || ''
            };
            const customPlatforms = [];
            document.querySelectorAll('#quick-rel-custom-platforms-list .quick-rel-custom-plat-row').forEach(row => {
              const pName = row.querySelector('.custom-plat-name')?.value.trim();
              const pUrl = row.querySelector('.custom-plat-url')?.value.trim();
              if (pName && pUrl) {
                customPlatforms.push({ name: pName, url: pUrl, action: 'PLAY' });
              }
            });
            if (customPlatforms.length > 0) {
              lk.customPlatforms = customPlatforms;
            }
            return lk;
          })(),
          metadata: {
            previewStart: startSec,
            previewDuration: activeSnippetDuration,
            previewMode: 'custom',
            previewEnabled: true
          }
        };

        // Prepend to artist products
        targetArtist.products.unshift(releaseObj);

        // Prepend to releases queue
        if (!Array.isArray(releases)) releases = [];
        releases.unshift({
          id: newReleaseId,
          artist_id: artistId,
          title,
          type,
          slug: cleanSlug,
          submission_status: 'Đã phát hành',
          artwork_url: finalArtworkUrl,
          audio_url: finalAudioUrl,
          links: releaseObj.links,
          metadata: releaseObj.metadata,
          created_at: new Date().toISOString(),
          artists: { name: targetArtist.name }
        });

        // Save data to localStorage & Supabase
        await saveData(data);

        // Sync to Supabase releases table with timeout
        if (isSupabaseConfigured()) {
          try {
            await withTimeout(supabase.from('releases').upsert({
              id: newReleaseId,
              artist_id: artistId,
              title,
              type,
              slug: cleanSlug,
              submission_status: 'Đã phát hành',
              artwork_url: finalArtworkUrl,
              audio_url: finalAudioUrl,
              links: releaseObj.links,
              metadata: releaseObj.metadata,
              created_at: new Date().toISOString()
            }), 3000, null);
          } catch (dbErr) {
            console.warn('Lỗi lưu release lên Supabase:', dbErr);
          }
        }

        modal.close();

        // Focus on target artist and switch to Tab 03 so admin can edit SmartLink & metrics
        selectedArtistId = artistId;
        renderArtistSelector();
        renderSelectedArtistEditor();
        loadReleasesQueue();
        switchAdminTab('admin-tab-artists');

        const smartLinkUrl = `${location.origin}/listen?release=${encodeURIComponent(cleanSlug)}`;
        const artistPageUrl = `${location.origin}/artist-detail?id=${encodeURIComponent(artistId)}`;

        alert(`🎉 PHÁT HÀNH NHANH THÀNH CÔNG!\n\n` +
          `• Tác phẩm: "${title}" (${type})\n` +
          `• Nghệ sĩ: ${targetArtist.name}\n` +
          `• Đoạn preview: ${formatTimeMinSec(startSec)} ➔ ${formatTimeMinSec(startSec + activeSnippetDuration)} (${activeSnippetDuration}s)\n\n` +
          `Đã đưa lên Website & tạo SmartLink thành công!\n` +
          `Tác phẩm đã xuất hiện ngay bên dưới trong mục của nghệ sĩ "${targetArtist.name}" để bạn chỉnh sửa SmartLink và cập nhật số liệu.\n\n` +
          `SmartLink: ${smartLinkUrl}\n` +
          `Trang nghệ sĩ: ${artistPageUrl}`);

        showNotice(`✓ Đã phát hành nhanh "${title}" lên Web! Đã hiển thị trong mục của "${targetArtist.name}" để chỉnh sửa SmartLink & số liệu.`);
        await logAuditEvent('Phát hành nhanh', `Đã phát hành "${title}" cho nghệ sĩ ${targetArtist.name} (Slug: ${cleanSlug})`);
      } catch (err) {
        alert(`Lỗi phát hành nhanh: ${err.message}`);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '🚀 Phát Hành Lên Web Ngay';
        }
        if (submitStatus) submitStatus.textContent = '';
      }
    });
  }
}

// ============================================================================
// 16. STANDALONE IMAGE OPTIMIZER & CLOUD TOOL IN ADMIN
// ============================================================================
function initImageOptimizerAdmin() {
  const modal = document.querySelector('#modal-admin-image-optimizer');
  const openBtn = document.querySelector('#btn-open-img-optimizer-modal');
  const closeBtn = document.querySelector('#close-img-optimizer-dialog-btn');

  const maxWidthSelect = document.querySelector('#opt-tool-max-width');
  const qualitySelect = document.querySelector('#opt-tool-quality');
  const squareCheck = document.querySelector('#opt-tool-square');
  const dropzone = document.querySelector('#opt-tool-dropzone');
  const fileInput = document.querySelector('#opt-tool-file-input');
  const progressEl = document.querySelector('#opt-tool-progress');
  const resultsContainer = document.querySelector('#opt-tool-results');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => modal.showModal());
    closeBtn?.addEventListener('click', () => modal.close());

    const handleFiles = async (files) => {
      if (!files || files.length === 0) return;
      const maxWidth = parseInt(maxWidthSelect?.value || 1600, 10);
      const quality = parseFloat(qualitySelect?.value || 0.85);
      const square = squareCheck?.checked || false;

      if (progressEl) {
        progressEl.style.display = 'block';
        progressEl.textContent = `Đang nén & tối ưu hóa ${files.length} ảnh...`;
      }

      try {
        const compressedList = await batchCompressImages(files, {
          maxWidth,
          maxHeight: maxWidth,
          quality,
          square,
          format: 'image/webp'
        }, (p) => {
          if (progressEl) {
            progressEl.textContent = `Đang xử lý ${p.current}/${p.total} (${p.percent}%)...`;
          }
        });

        if (resultsContainer && (resultsContainer.querySelector('.empty-opt-msg') || resultsContainer.innerHTML.includes('Chưa có ảnh'))) {
          resultsContainer.innerHTML = '';
        }

        for (const item of compressedList) {
          if (!item.success) continue;
          const res = item.result;
          const publicUrl = await uploadImageSmart(res.file, `opt_${Date.now()}`);

          const card = document.createElement('div');
          card.className = 'opt-result-card';
          card.style.cssText = 'background:#fff; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 1px 3px rgba(0,0,0,0.06);';
          card.innerHTML = `
            <div style="aspect-ratio:16/10; background:#0f172a; overflow:hidden; position:relative;">
              <img src="${res.dataUrl}" style="width:100%; height:100%; object-fit:cover; display:block;">
              <span style="position:absolute; bottom:6px; right:6px; background:#d8ff48; color:#000; font-family:'DM Mono',monospace; font-size:10px; font-weight:900; padding:2px 6px; border-radius:3px;">
                -${res.savedPercent}%
              </span>
            </div>
            <div style="padding:10px; display:flex; flex-direction:column; gap:6px; flex:1;">
              <div style="display:flex; justify-content:space-between; font-size:11px; font-family:'DM Mono',monospace;">
                <span style="color:#64748b;">${res.originalSizeFormatted}</span>
                <span style="color:#16a34a; font-weight:bold;">➔ ${res.compressedSizeFormatted}</span>
              </div>
              <input type="text" readonly value="${esc(publicUrl)}" style="font-size:10.5px; font-family:'DM Mono',monospace; padding:4px 6px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; width:100%;">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:auto; padding-top:6px;">
                <button type="button" class="btn-copy-url button alt" style="padding:4px 6px; font-size:10px; font-weight:bold;">📋 Copy URL</button>
                <button type="button" class="btn-copy-md button alt" style="padding:4px 6px; font-size:10px; font-weight:bold;">Markdown</button>
              </div>
            </div>
          `;

          card.querySelector('.btn-copy-url')?.addEventListener('click', async (e) => {
            await navigator.clipboard.writeText(publicUrl);
            e.target.textContent = '✓ Đã chép!';
            setTimeout(() => { e.target.textContent = '📋 Copy URL'; }, 2000);
          });

          card.querySelector('.btn-copy-md')?.addEventListener('click', async (e) => {
            await navigator.clipboard.writeText(`![Image](${publicUrl})`);
            e.target.textContent = '✓ Đã chép MD!';
            setTimeout(() => { e.target.textContent = 'Markdown'; }, 2000);
          });

          resultsContainer?.prepend(card);
        }

        if (progressEl) {
          progressEl.textContent = `✓ Đã tối ưu hóa xong ${compressedList.length} ảnh!`;
          setTimeout(() => { progressEl.style.display = 'none'; }, 3500);
        }
      } catch (err) {
        if (progressEl) {
          progressEl.textContent = `Lỗi: ${err.message}`;
          progressEl.style.color = '#ef4444';
        }
      }
    };

    dropzone?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      e.target.value = '';
    });

    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.background = '#e0f2fe';
    });
    dropzone?.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzone.style.background = '#f0f9ff';
    });
    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.background = '#f0f9ff';
      if (e.dataTransfer?.files?.length) {
        handleFiles(e.dataTransfer.files);
      }
    });
  }
}

initAccountProvisioning();
initShortlinksAdmin();
initSupabaseCloudAdmin();
initArtistNotificationDispatcher();
initAnnouncementsQuickSave();
initEmailConfigAdmin();
initArtistPhotoRequestsAdmin();
initQuickReleaseAdmin();
initImageOptimizerAdmin();
render();
renderShortlinksAdmin();

// ====================================================
// 1. ADMIN NOTIFICATION CENTER (Live alerts from Artists)
// ====================================================
async function getAdminNotifications() {
  let list = [];
  try {
    const raw = localStorage.getItem('uniflows-admin-notifications');
    if (raw) list = JSON.parse(raw);
  } catch (e) {
    console.warn('Lỗi đọc local admin notifications:', e);
  }

  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout(
        supabase
          .from('admin_notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
        2500,
        null
      );
      const data = res?.data;
      const error = res?.error;
      if (!error && Array.isArray(data) && data.length > 0) {
        const sbList = data.map(row => ({
          id: row.id,
          type: row.type || 'general',
          title: row.title || '',
          message: row.message || '',
          artistId: row.artist_id || '',
          artistName: row.artist_name || 'Nghệ sĩ',
          artistAvatar: row.artist_avatar || '',
          targetTab: row.target_tab || 'admin-tab-overview',
          details: row.details || {},
          isRead: row.is_read ?? false,
          createdAt: row.created_at || new Date().toISOString()
        }));

        const idMap = new Map();
        sbList.forEach(n => idMap.set(n.id, n));
        list.forEach(n => {
          if (!idMap.has(n.id)) idMap.set(n.id, n);
        });
        list = Array.from(idMap.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        try {
          localStorage.setItem('uniflows-admin-notifications', JSON.stringify(list));
        } catch (_) {}
      }
    } catch (e) {
      console.warn('Lỗi fetch admin notifications từ Supabase:', e);
    }
  }

  return list;
}

function updateAdminNotificationBadge(count) {
  const badge = document.querySelector('#admin-notif-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

async function renderAdminNotificationsFlyout() {
  const notifs = await getAdminNotifications();
  const unreadCount = notifs.filter(n => !n.isRead).length;
  updateAdminNotificationBadge(unreadCount);

  const listEl = document.querySelector('#admin-notif-list');
  if (!listEl) return;

  if (notifs.length === 0) {
    listEl.innerHTML = `
      <div style="padding:24px 16px;text-align:center;color:#64748b;font-size:12px;">
        <div style="font-size:24px;margin-bottom:6px;">📭</div>
        Không có thông báo mới nào từ nghệ sĩ.
      </div>`;
    return;
  }

  const typeIcons = {
    release: '🎵',
    photo_update: '📸',
    payout: '💰',
    takedown: '🗑️',
    catalog_transfer: '📦',
    migration: '🚚',
    copyright_claim: '🛡️',
    appointment: '📅',
    general: '🔔'
  };

  listEl.innerHTML = notifs.map(n => {
    const icon = typeIcons[n.type] || '🔔';
    const timeStr = n.createdAt ? new Date(n.createdAt).toLocaleDateString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
    }) : '';
    const unreadStyle = !n.isRead ? 'background:#f0fdf4;border-left:3px solid #10b981;' : 'border-left:3px solid transparent;opacity:0.85;';

    return `
      <div class="admin-notif-item" data-notif-id="${n.id}" data-target-tab="${n.targetTab || ''}" style="padding:10px 14px;border-bottom:1px solid #f1f5f9;cursor:pointer;display:flex;gap:10px;align-items:flex-start;transition:background 0.15s;${unreadStyle}">
        <span style="font-size:18px;line-height:1;margin-top:2px;">${icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px;margin-bottom:2px;">
            <strong style="font-size:12px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${n.artistName || 'Nghệ sĩ'}</strong>
            <span style="font-size:10px;color:#94a3b8;flex-shrink:0;">${timeStr}</span>
          </div>
          <div style="font-size:12px;font-weight:600;color:#1e293b;line-height:1.3;margin-bottom:3px;">${n.title || ''}</div>
          <div style="font-size:11px;color:#64748b;line-height:1.4;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${n.message || ''}</div>
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.admin-notif-item').forEach(item => {
    item.addEventListener('click', async () => {
      const notifId = item.dataset.notifId;
      const targetTab = item.dataset.targetTab;

      try {
        const raw = localStorage.getItem('uniflows-admin-notifications');
        const list = raw ? JSON.parse(raw) : [];
        const found = list.find(x => x.id === notifId);
        if (found) {
          found.isRead = true;
          localStorage.setItem('uniflows-admin-notifications', JSON.stringify(list));
        }
      } catch (_) {}

      if (isSupabaseConfigured()) {
        try {
          await supabase.from('admin_notifications').update({ is_read: true }).eq('id', notifId);
        } catch (_) {}
      }

      const flyout = document.querySelector('#admin-notif-flyout');
      if (flyout) flyout.style.display = 'none';

      if (targetTab) {
        switchAdminTab(targetTab);
      }

      renderAdminNotificationsFlyout();
    });
  });
}

function initAdminNotificationCenter() {
  const notifBtn = document.querySelector('#admin-notif-btn');
  const flyout = document.querySelector('#admin-notif-flyout');
  const markReadBtn = document.querySelector('#admin-notif-mark-read-btn');

  notifBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!flyout) return;
    const isClosed = flyout.style.display === 'none' || !flyout.style.display;
    flyout.style.display = isClosed ? 'block' : 'none';
    if (isClosed) {
      renderAdminNotificationsFlyout();
    }
  });

  document.addEventListener('click', (e) => {
    if (flyout && flyout.style.display === 'block' && !flyout.contains(e.target) && e.target !== notifBtn) {
      flyout.style.display = 'none';
    }
  });

  markReadBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      const raw = localStorage.getItem('uniflows-admin-notifications');
      const list = raw ? JSON.parse(raw) : [];
      list.forEach(n => { n.isRead = true; });
      localStorage.setItem('uniflows-admin-notifications', JSON.stringify(list));
    } catch (_) {}

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('admin_notifications').update({ is_read: true }).neq('id', '');
      } catch (_) {}
    }

    renderAdminNotificationsFlyout();
  });

  renderAdminNotificationsFlyout();

  window.addEventListener('storage', (e) => {
    if (e.key === 'uniflows-admin-notifications') {
      renderAdminNotificationsFlyout();
    }
  });

  setInterval(() => {
    renderAdminNotificationsFlyout();
  }, 20000);
}

// ====================================================
// 2. SPECIAL REQUESTS ADMIN (Takedown, Catalog, etc.)
// ====================================================
let currentReqFilter = 'all';

async function getSpecialRequests() {
  let list = [];
  try {
    const raw = localStorage.getItem('uniflows-special-requests');
    if (raw) list = JSON.parse(raw);
  } catch (e) {
    console.warn('Lỗi đọc local special requests:', e);
  }

  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout(
        supabase
          .from('special_requests')
          .select('*')
          .order('created_at', { ascending: false }),
        2500,
        null
      );
      const data = res?.data;
      const error = res?.error;
      if (!error && Array.isArray(data) && data.length > 0) {
        const sbList = data.map(row => ({
          id: row.id,
          type: row.type,
          title: row.title || '',
          artistId: row.artist_id || '',
          artistName: row.artist_name || 'Nghệ sĩ',
          artistEmail: row.artist_email || '',
          artistAvatar: row.artist_avatar || '',
          details: row.details || {},
          status: row.status || 'pending',
          adminNote: row.admin_note || '',
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString()
        }));

        const idMap = new Map();
        sbList.forEach(r => idMap.set(r.id, r));
        list.forEach(r => {
          if (!idMap.has(r.id)) idMap.set(r.id, r);
        });
        list = Array.from(idMap.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        try {
          localStorage.setItem('uniflows-special-requests', JSON.stringify(list));
        } catch (_) {}
      }
    } catch (e) {
      console.warn('Lỗi fetch special requests từ Supabase:', e);
    }
  }

  return list;
}

async function updateSpecialRequestStatus(reqId, newStatus, adminNote = '') {
  let list = [];
  try {
    const raw = localStorage.getItem('uniflows-special-requests');
    if (raw) list = JSON.parse(raw);
    const target = list.find(r => r.id === reqId);
    if (target) {
      target.status = newStatus;
      if (adminNote) target.adminNote = adminNote;
      target.updatedAt = new Date().toISOString();
      localStorage.setItem('uniflows-special-requests', JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Lỗi cập nhật local special request:', e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('special_requests').update({
        status: newStatus,
        admin_note: adminNote,
        updated_at: new Date().toISOString()
      }).eq('id', reqId);
    } catch (e) {
      console.warn('Lỗi cập nhật special request Supabase:', e);
    }
  }

  // Send automated email notification to artist
  try {
    const raw = localStorage.getItem('uniflows-special-requests');
    const target = raw ? JSON.parse(raw).find(r => r.id === reqId) : null;
    if (target) {
      let artObj = null;
      if (target.artistEmail) {
        artObj = { name: target.artistName || 'Nghệ sĩ', email: target.artistEmail };
      } else if (target.artistId) {
        artObj = (data.artists || []).find(a => a.id === target.artistId);
      }
      if (artObj && artObj.email) {
        sendSpecialRequestStatusEmail({
          artist: artObj,
          requestType: target.type || 'special_request',
          refCode: target.id ? target.id.substring(0, 8).toUpperCase() : 'REQ',
          status: newStatus,
          adminNotes: adminNote || ''
        }).catch(err => console.warn('Lỗi gửi email special request status:', err));
      }
    }
  } catch (err) {
    console.warn('Lỗi gửi email special request:', err);
  }

  renderSpecialRequestsAdmin(currentReqFilter);
}

async function deleteSpecialRequest(reqId) {
  if (!confirm('Bạn có chắc chắn muốn xoá yêu cầu này khỏi hệ thống?')) return;

  try {
    const raw = localStorage.getItem('uniflows-special-requests');
    if (raw) {
      const list = JSON.parse(raw).filter(r => r.id !== reqId);
      localStorage.setItem('uniflows-special-requests', JSON.stringify(list));
    }
  } catch (_) {}

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('special_requests').delete().eq('id', reqId);
    } catch (_) {}
  }

  renderSpecialRequestsAdmin(currentReqFilter);
}

async function renderSpecialRequestsAdmin(filter = currentReqFilter) {
  currentReqFilter = filter;

  // Update filter buttons active status
  document.querySelectorAll('.req-filter-btn').forEach(btn => {
    if (btn.dataset.reqFilter === filter) {
      btn.classList.add('active');
      btn.classList.remove('alt');
    } else {
      btn.classList.remove('active');
      btn.classList.add('alt');
    }
  });

  const listEl = document.querySelector('#special-requests-list');
  if (!listEl) return;

  const allRequests = await getSpecialRequests();

  // Update count badges
  const counts = {
    all: allRequests.length,
    takedown: allRequests.filter(r => r.type === 'takedown').length,
    catalog_transfer: allRequests.filter(r => r.type === 'catalog_transfer').length,
    copyright_claim: allRequests.filter(r => r.type === 'copyright_claim').length,
    custom: allRequests.filter(r => !['takedown', 'catalog_transfer', 'copyright_claim'].includes(r.type)).length
  };

  const countAll = document.querySelector('#req-count-all');
  const countTakedown = document.querySelector('#req-count-takedown');
  const countCatalog = document.querySelector('#req-count-catalog');
  const countCopyright = document.querySelector('#req-count-copyright');
  const countCustom = document.querySelector('#req-count-custom');
  const badgeTab = document.querySelector('#admin-requests-badge');

  if (countAll) countAll.textContent = counts.all;
  if (countTakedown) countTakedown.textContent = counts.takedown;
  if (countCatalog) countCatalog.textContent = counts.catalog;
  if (countCopyright) countCopyright.textContent = counts.copyright;
  if (countCustom) countCustom.textContent = counts.custom;
  if (badgeTab) {
    const pendingCount = allRequests.filter(r => r.status === 'pending').length;
    badgeTab.textContent = pendingCount;
    badgeTab.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }

  // Filter requests
  const filtered = filter === 'all' 
    ? allRequests 
    : filter === 'custom' 
      ? allRequests.filter(r => !['takedown', 'catalog_transfer', 'copyright_claim'].includes(r.type))
      : allRequests.filter(r => r.type === filter);

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div style="background:#fff;border:1px dashed #cbd5e1;padding:40px;text-align:center;border-radius:10px;">
        <div style="font-size:32px;margin-bottom:8px;">📬</div>
        <strong style="display:block;font-size:15px;color:#1e293b;">Không có yêu cầu nào trong mục này</strong>
        <p style="font-size:12px;color:#64748b;margin:6px 0 0;">Khi nghệ sĩ gửi yêu cầu gỡ bài hát, chuyển catalog hoặc các hỗ trợ đặc biệt khác từ UniPORTAL, thông tin sẽ hiển thị tại đây.</p>
      </div>
    `;
    return;
  }

  const typeLabels = {
    takedown: { text: '🗑️ Gỡ bài hát (Takedown)', color: '#fee2e2', textColor: '#991b1b' },
    catalog_transfer: { text: '📦 Chuyển giao Catalog', color: '#e0e7ff', textColor: '#3730a3' },
    copyright_claim: { text: '🛡️ Tranh chấp bản quyền', color: '#fef3c7', textColor: '#92400e' },
    custom: { text: '✨ Dịch vụ & Hỗ trợ khác', color: '#f3e8ff', textColor: '#6b21a8' }
  };

  const statusBadges = {
    pending: '<span style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:bold;">⏳ Chờ xử lý</span>',
    in_progress: '<span style="background:#dbeafe;color:#1e40af;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:bold;">🔄 Đang xử lý</span>',
    completed: '<span style="background:#d1fae5;color:#065f46;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:bold;">✅ Đã hoàn tất</span>',
    rejected: '<span style="background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:bold;">❌ Đã từ chối</span>'
  };

  listEl.innerHTML = filtered.map(req => {
    const typeMeta = typeLabels[req.type] || typeLabels.custom;
    const timeStr = req.createdAt ? new Date(req.createdAt).toLocaleString('vi-VN') : '';
    const details = req.details || {};

    let detailsHtml = '';
    if (req.type === 'takedown') {
      detailsHtml = `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px 14px;border-radius:6px;margin:10px 0;font-size:12px;display:grid;gap:6px;">
          <div><strong>Tên tác phẩm:</strong> ${details.releaseTitle || details.songTitle || 'Không rõ'}</div>
          <div><strong>ISRC / UPC:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:3px;">${details.isrc || details.upc || 'N/A'}</code></div>
          <div><strong>Lý do gỡ bài:</strong> ${details.reason || details.notes || 'Không ghi'}</div>
          ${details.platforms ? `<div><strong>Nền tảng yêu cầu gỡ:</strong> ${details.platforms}</div>` : ''}
        </div>
      `;
    } else if (req.type === 'catalog_transfer') {
      detailsHtml = `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px 14px;border-radius:6px;margin:10px 0;font-size:12px;display:grid;gap:6px;">
          <div><strong>Tên Catalog / Album:</strong> ${details.catalogName || details.title || 'Toàn bộ Catalog'}</div>
          <div><strong>Đơn vị nhận chuyển giao (New Label/Distributor):</strong> <b>${details.targetDistributor || details.newLabel || 'Chưa ghi'}</b></div>
          <div><strong>Số lượng bài hát:</strong> ${details.trackCount || 'N/A'}</div>
          <div><strong>Thời gian chuyển dự kiến:</strong> ${details.effectiveDate || 'Ngay lập tức'}</div>
          ${details.notes ? `<div><strong>Ghi chú:</strong> ${details.notes}</div>` : ''}
        </div>
      `;
    } else {
      detailsHtml = `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px 14px;border-radius:6px;margin:10px 0;font-size:12px;display:grid;gap:6px;">
          <div><strong>Chi tiết nội dung yêu cầu:</strong></div>
          <div style="white-space:pre-wrap;color:#334155;">${details.message || details.notes || req.message || 'Không có mô tả thêm.'}</div>
        </div>
      `;
    }

    return `
      <div class="card special-req-card" data-req-id="${req.id}" style="background:#fff;border:2px solid var(--ink);border-radius:8px;padding:18px;position:relative;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="background:${typeMeta.color};color:${typeMeta.textColor};padding:4px 10px;border-radius:20px;font-size:11px;font-weight:bold;letter-spacing:-0.01em;">
              ${typeMeta.text}
            </span>
            ${statusBadges[req.status] || statusBadges.pending}
          </div>
          <div style="font-size:11px;color:#64748b;font-family:'DM Mono',monospace;">
            ${timeStr}
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
          <h3 style="font-size:16px;margin:0;letter-spacing:-0.03em;color:#0f172a;">${req.title || 'Yêu cầu từ nghệ sĩ'}</h3>
          <div style="font-size:12px;color:#475569;">
            Gửi bởi: <strong style="color:#0f172a;">${req.artistName || 'Nghệ sĩ'}</strong> ${req.artistEmail ? `(&lt;${req.artistEmail}&gt;)` : ''}
          </div>
        </div>

        ${detailsHtml}

        <!-- Admin Note & Response -->
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;display:grid;gap:10px;">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <input type="text" class="req-admin-note-input" value="${req.adminNote || ''}" placeholder="Ghi chú nội bộ admin hoặc phản hồi cho nghệ sĩ..." style="flex:1;min-width:200px;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;">
            <button type="button" class="button alt btn-save-req-note" data-req-id="${req.id}" style="padding:8px 14px;font-size:11px;">💾 Lưu ghi chú</button>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;">
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="button btn-req-action" data-req-id="${req.id}" data-action="completed" style="background:#10b981;color:#fff;border-color:#10b981;padding:6px 14px;font-size:11px;font-weight:bold;">
                ✓ Hoàn tất yêu cầu
              </button>
              <button type="button" class="button alt btn-req-action" data-req-id="${req.id}" data-action="in_progress" style="padding:6px 14px;font-size:11px;background:#f0f9ff;border-color:#0284c7;color:#0284c7;font-weight:bold;">
                🔄 Đang xử lý
              </button>
              <button type="button" class="button alt btn-req-action" data-req-id="${req.id}" data-action="rejected" style="padding:6px 14px;font-size:11px;background:#fef2f2;border-color:#ef4444;color:#dc2626;">
                ✕ Từ chối
              </button>
            </div>
            <button type="button" class="button alt btn-delete-req" data-req-id="${req.id}" style="padding:6px 12px;font-size:11px;color:#94a3b8;border-color:#e2e8f0;margin-left:auto;">
              🗑️ Xóa
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Wire event handlers
  listEl.querySelectorAll('.btn-save-req-note').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.special-req-card');
      const noteInput = card.querySelector('.req-admin-note-input');
      const reqId = btn.dataset.reqId;
      const targetReq = allRequests.find(r => r.id === reqId);
      const currentStatus = targetReq ? targetReq.status : 'pending';
      updateSpecialRequestStatus(reqId, currentStatus, noteInput.value.trim());
      btn.textContent = '✓ Đã lưu';
      setTimeout(() => { btn.textContent = '💾 Lưu ghi chú'; }, 2000);
    });
  });

  listEl.querySelectorAll('.btn-req-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.special-req-card');
      const noteInput = card.querySelector('.req-admin-note-input');
      const reqId = btn.dataset.reqId;
      const action = btn.dataset.action;
      updateSpecialRequestStatus(reqId, action, noteInput.value.trim());
    });
  });

  listEl.querySelectorAll('.btn-delete-req').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteSpecialRequest(btn.dataset.reqId);
    });
  });
}

// Wire filter buttons & refresh
document.querySelectorAll('.req-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    renderSpecialRequestsAdmin(btn.dataset.reqFilter);
  });
});

document.querySelector('#btn-refresh-special-requests')?.addEventListener('click', () => {
  renderSpecialRequestsAdmin(currentReqFilter);
});

// ====================================================
// 3. BROADCAST EMAIL ADMIN DISPATCHER
// ====================================================
function initBroadcastEmailAdmin() {
  const openBtn = document.querySelector('#btn-open-broadcast-email');
  const dialog = document.querySelector('#modal-admin-broadcast-email');
  const closeBtn = document.querySelector('#close-admin-broadcast-btn');
  const cancelBtn = document.querySelector('#cancel-admin-broadcast-btn');
  const form = document.querySelector('#admin-broadcast-form');
  const previewEl = document.querySelector('#broadcast-recipient-preview');
  const testEmailBox = document.querySelector('#broadcast-test-email-box');
  const testEmailInput = document.querySelector('#broadcast-test-email');
  const configWarningBox = document.querySelector('#broadcast-config-warning');

  let isRecipientsListExpanded = false;

  function renderRecipientsRows(items) {
    if (!items || items.length === 0) {
      return '<div style="font-size:11px;color:#94a3b8;font-style:italic;padding:8px 0;text-align:center;">Không tìm thấy email nào khớp với bộ lọc tìm kiếm.</div>';
    }
    return items.map((r, i) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;font-size:11.5px;gap:8px;">
        <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;">
          <span style="color:#94a3b8;font-family:'DM Mono',monospace;font-size:10px;min-width:22px;">#${i + 1}</span>
          <code style="color:#0f172a;font-weight:bold;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.email}</code>
          <span style="color:#64748b;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">(${r.name}${r.username ? ' &bull; @' + r.username : ''})</span>
        </div>
        <span style="font-family:'DM Mono',monospace;font-size:9.5px;font-weight:bold;padding:2px 6px;border-radius:4px;background:${r.badgeBg || '#f1f5f9'};color:${r.badgeColor || '#0f172a'};white-space:nowrap;">
          ${r.badgeText || r.role}
        </span>
      </div>
    `).join('');
  }

  const getRecipientDetails = async (targetType) => {
    let currentData = data;
    if (!currentData || !Array.isArray(currentData.artists) || currentData.artists.length === 0) {
      try {
        currentData = await getData();
      } catch (_) {
        currentData = defaultData;
      }
    }
    if (!currentData) currentData = defaultData;

    // Template mock emails that should not be treated as real accounts unless explicitly provisioned
    const templateMockEmails = [
      'lumi@uniflowslabel.com',
      'producer48k@uniflowslabel.com',
      'vule@uniflowslabel.com',
      'monotone@uniflowslabel.com'
    ];

    // 1. Gather Real Artist Accounts (Tài khoản nghệ sĩ / Portal thực tế đã tạo)
    let rawArtistAccounts = null;
    try {
      rawArtistAccounts = localStorage.getItem('uniflows-artist-accounts');
    } catch (_) {}
    const provisionedAccounts = rawArtistAccounts ? JSON.parse(rawArtistAccounts) : [];

    const artistAccountMap = new Map();

    // From currentData.artists
    (currentData.artists || []).forEach(a => {
      const email = String(a.email || '').trim().toLowerCase();
      // Bắt buộc phải có email hợp lệ; TUYỆT ĐỐI KHÔNG tự bịa đuôi @uniflowslabel.com khi không có email
      if (!email || !email.includes('@')) return;

      // Loại bỏ các email mock demo mặc định nếu chưa từng được cấp mật khẩu / tài khoản thực tế
      const isMock = templateMockEmails.includes(email) && !a.password && !provisionedAccounts.some(p => String(p.email || '').toLowerCase() === email);
      if (isMock) return;

      artistAccountMap.set(email, {
        email,
        name: a.name || a.username || 'Nghệ sĩ',
        username: a.username || a.id || '',
        role: 'Tài khoản Nghệ sĩ / Portal',
        type: 'artist',
        badgeText: 'NGHỆ SĨ',
        badgeBg: '#dcfce7',
        badgeColor: '#15803d'
      });
    });

    // From provisioned accounts
    provisionedAccounts.forEach(acc => {
      const email = String(acc.email || '').trim().toLowerCase();
      if (email && email.includes('@')) {
        artistAccountMap.set(email, {
          email,
          name: acc.name || acc.username || 'Nghệ sĩ',
          username: acc.username || acc.id || '',
          role: 'Tài khoản Nghệ sĩ / Portal',
          type: 'artist',
          badgeText: 'NGHỆ SĨ',
          badgeBg: '#dcfce7',
          badgeColor: '#15803d'
        });
      }
    });

    // Check Supabase artists if configured
    if (isSupabaseConfigured()) {
      try {
        const { data: dbArtists } = await supabase.from('artists').select('id, name, username, email, password');
        if (Array.isArray(dbArtists)) {
          dbArtists.forEach(a => {
            const email = String(a.email || '').trim().toLowerCase();
            if (email && email.includes('@')) {
              const isMock = templateMockEmails.includes(email) && !a.password;
              if (!isMock) {
                artistAccountMap.set(email, {
                  email,
                  name: a.name || a.username || 'Nghệ sĩ',
                  username: a.username || a.id || '',
                  role: 'Tài khoản Nghệ sĩ / Portal',
                  type: 'artist',
                  badgeText: 'NGHỆ SĨ',
                  badgeBg: '#dcfce7',
                  badgeColor: '#15803d'
                });
              }
            }
          });
        }
      } catch (_) {}
    }

    const artistRecipients = Array.from(artistAccountMap.values());

    // 2. Gather Real Subscribers (Khách hàng đăng ký nhận tin thực tế - TUYỆT ĐỐI KHÔNG thêm email giả định fallback)
    const subscriberMap = new Map();
    try {
      const rawSub = localStorage.getItem('uniflows-subscribers');
      if (rawSub) {
        const parsed = JSON.parse(rawSub);
        if (Array.isArray(parsed)) {
          parsed.forEach(item => {
            const email = (typeof item === 'string' ? item : (item?.email || '')).trim().toLowerCase();
            if (email && email.includes('@') && !['contact@uniflowslabel.com', 'press@uniflowslabel.com', 'booking@uniflowslabel.com'].includes(email)) {
              subscriberMap.set(email, {
                email,
                name: (typeof item === 'object' && item?.name) ? item.name : 'Khách hàng / Subscriber',
                username: '',
                role: 'Đăng ký nhận tin',
                type: 'subscriber',
                badgeText: 'SUBSCRIBER',
                badgeBg: '#eff6ff',
                badgeColor: '#1d4ed8'
              });
            }
          });
        }
      }
    } catch (_) {}

    if (Array.isArray(currentData.subscribers)) {
      currentData.subscribers.forEach(s => {
        const email = (typeof s === 'string' ? s : (s?.email || '')).trim().toLowerCase();
        if (email && email.includes('@') && !['contact@uniflowslabel.com', 'press@uniflowslabel.com', 'booking@uniflowslabel.com'].includes(email)) {
          subscriberMap.set(email, {
            email,
            name: (typeof s === 'object' && s?.name) ? s.name : 'Khách hàng / Subscriber',
            username: '',
            role: 'Đăng ký nhận tin',
            type: 'subscriber',
            badgeText: 'SUBSCRIBER',
            badgeBg: '#eff6ff',
            badgeColor: '#1d4ed8'
          });
        }
      });
    }

    const subscriberRecipients = Array.from(subscriberMap.values());

    // 3. Gather Admin Accounts (Tài khoản Quản trị thực tế)
    const adminMap = new Map();
    (currentData.adminAccounts || []).forEach(a => {
      const email = String(a.email || '').trim().toLowerCase();
      if (email && email.includes('@')) {
        adminMap.set(email, {
          email,
          name: a.name || a.username || 'Quản trị viên',
          username: a.username || 'admin',
          role: 'Ban Quản Trị (Admin)',
          type: 'admin',
          badgeText: 'ADMIN',
          badgeBg: '#fef3c7',
          badgeColor: '#b45309'
        });
      }
    });

    // 4. Test Email Mode
    const cfg = getEmailConfig();
    const customTestEmail = testEmailInput?.value.trim().toLowerCase();
    const testEmail = (customTestEmail && customTestEmail.includes('@')) 
      ? customTestEmail 
      : (cfg.senderEmail && cfg.senderEmail.includes('@') ? cfg.senderEmail.toLowerCase() : 'admin@uniflowslabel.com');

    if (targetType === 'test') {
      return [{
        email: testEmail,
        name: 'Email Thử Nghiệm Admin',
        username: 'test',
        role: 'Gửi thử nghiệm',
        type: 'test',
        badgeText: 'TEST',
        badgeBg: '#f3e8ff',
        badgeColor: '#7e22ce'
      }];
    }

    if (targetType === 'artists') {
      return artistRecipients;
    }

    if (targetType === 'subscribers') {
      return subscriberRecipients;
    }

    // targetType === 'all'
    // Combine real created accounts (Nghệ sĩ + Subscribers + Admin), deduplicate by email
    const combinedMap = new Map();
    artistRecipients.forEach(r => combinedMap.set(r.email, r));
    subscriberRecipients.forEach(r => {
      if (!combinedMap.has(r.email)) combinedMap.set(r.email, r);
    });
    Array.from(adminMap.values()).forEach(r => {
      if (!combinedMap.has(r.email)) combinedMap.set(r.email, r);
    });

    return Array.from(combinedMap.values());
  };

  const getRecipientEmails = async (targetType) => {
    const details = await getRecipientDetails(targetType);
    return details.map(d => d.email);
  };

  const updateRecipientPreview = async () => {
    if (!previewEl) return;
    const selRadio = form?.querySelector('input[name="broadcast_target"]:checked');
    const targetType = selRadio ? selRadio.value : 'all';

    // Toggle test email input
    if (testEmailBox) {
      testEmailBox.style.display = targetType === 'test' ? 'block' : 'none';
      if (targetType === 'test' && testEmailInput && !testEmailInput.value) {
        const cfg = getEmailConfig();
        testEmailInput.value = cfg.senderEmail || 'admin@uniflowslabel.com';
      }
    }

    previewEl.innerHTML = '<span style="color:#64748b;">⏳ Đang quét danh sách tài khoản hợp lệ...</span>';
    const recipientDetails = await getRecipientDetails(targetType);
    const list = recipientDetails.map(d => d.email);

    const targetName = {
      all: 'tất cả tài khoản hệ thống (Nghệ sĩ + Quản trị + Khách hàng)',
      artists: 'tài khoản nghệ sĩ đã tạo (Roster Accounts)',
      subscribers: 'khách hàng & người đăng ký nhận tin thực tế (Subscribers)',
      test: 'chế độ gửi thử nghiệm (admin)'
    }[targetType] || targetType;

    if (list.length === 0) {
      previewEl.innerHTML = `
        <div style="margin-bottom:6px;color:#b91c1c;font-weight:bold;">
          ⚠️ Không tìm thấy email nào trong nhóm: <u>${targetName}</u> (0 địa chỉ email).
        </div>
        <div style="font-size:11.5px;color:#64748b;background:#fef2f2;border:1px solid #fecaca;padding:10px 12px;border-radius:6px;line-height:1.6;font-family:inherit;">
          ${targetType === 'artists' 
            ? 'Chưa có tài khoản nghệ sĩ nào có email được tạo. Bạn có thể vào <b>Tab 03 (Quản lý Nghệ sĩ & Portal)</b> ➔ bấm <b>"✨ + Cấp Tài Khoản Mới"</b> để thêm nghệ sĩ kèm email.' 
            : (targetType === 'subscribers'
              ? 'Chưa có khách hàng nào đăng ký nhận tin (Subscribers). Bạn có thể chọn nhóm <b>"🌐 Tất cả tài khoản"</b> hoặc <b>"🧪 Thử nghiệm"</b>.'
              : 'Vui lòng kiểm tra lại dữ liệu tài khoản hoặc chọn nhóm đối tượng khác.')
          }
        </div>
      `;
      return;
    }

    const samplePreview = list.slice(0, 3).join(', ') + (list.length > 3 ? ` và ${list.length - 3} email khác` : '');

    previewEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
        <div style="color:#0f172a;font-size:12px;">
          🎯 <b>Dự kiến gửi đến <span style="color:#2563eb;font-size:14px;font-weight:900;">${list.length}</span> địa chỉ email</b> (${targetName}).
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <button type="button" id="btn-toggle-view-recipients" style="background:#0f172a;color:#d8ff48;border:1px solid #0f172a;border-radius:4px;padding:4px 10px;font-size:11px;font-family:'DM Mono',monospace;font-weight:bold;cursor:pointer;display:inline-flex;align-items:center;gap:5px;">
            <span id="toggle-view-icon">${isRecipientsListExpanded ? '▲' : '👁️'}</span>
            <span id="toggle-view-text">${isRecipientsListExpanded ? 'Thu gọn ▴' : `Xem toàn bộ (${list.length} email) ▾`}</span>
          </button>
          <button type="button" id="btn-copy-recipients" style="background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer;font-family:'DM Mono',monospace;" title="Sao chép toàn bộ email">
            📋 Copy
          </button>
        </div>
      </div>

      <!-- Compact preview -->
      <div style="font-size:11.5px;color:#334155;background:#f0f9ff;border:1px solid #bae6fd;padding:8px 12px;border-radius:6px;word-break:break-all;line-height:1.5;">
        <b>Danh sách tóm tắt:</b> <span style="font-family:'DM Mono',monospace;color:#0369a1;">${samplePreview}</span>
      </div>

      <!-- Expandable full recipients list container -->
      <div id="broadcast-recipients-full-container" style="display:${isRecipientsListExpanded ? 'block' : 'none'};margin-top:10px;background:#ffffff;border:2px solid #0f172a;border-radius:8px;padding:12px;box-shadow:0 6px 16px rgba(0,0,0,0.06);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e2e8f0;font-size:11px;">
          <span style="font-weight:bold;text-transform:uppercase;color:#0f172a;">Toàn Bộ ${recipientDetails.length} Tài Khoản Nhận Thư:</span>
          <input type="text" id="filter-recipients-search" placeholder="🔍 Lọc email / tên..." style="padding:3px 8px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;width:170px;">
        </div>
        <div id="broadcast-recipients-scroll-list" style="max-height:190px;overflow-y:auto;display:grid;gap:6px;">
          ${renderRecipientsRows(recipientDetails)}
        </div>
      </div>
    `;

    // Attach listeners
    document.querySelector('#btn-toggle-view-recipients')?.addEventListener('click', () => {
      isRecipientsListExpanded = !isRecipientsListExpanded;
      const container = document.querySelector('#broadcast-recipients-full-container');
      const icon = document.querySelector('#toggle-view-icon');
      const text = document.querySelector('#toggle-view-text');
      if (container) container.style.display = isRecipientsListExpanded ? 'block' : 'none';
      if (icon) icon.textContent = isRecipientsListExpanded ? '▲' : '👁️';
      if (text) text.textContent = isRecipientsListExpanded ? 'Thu gọn ▴' : `Xem toàn bộ (${list.length} email) ▾`;
    });

    document.querySelector('#btn-copy-recipients')?.addEventListener('click', () => {
      navigator.clipboard.writeText(list.join(', ')).then(() => {
        showNotice(`✓ Đã sao chép ${list.length} email vào clipboard!`);
      }).catch(() => {
        alert(`Danh sách email:\n${list.join(', ')}`);
      });
    });

    document.querySelector('#filter-recipients-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = recipientDetails.filter(r => 
        r.email.toLowerCase().includes(q) || 
        r.name.toLowerCase().includes(q) || 
        (r.username && r.username.toLowerCase().includes(q))
      );
      const scrollList = document.querySelector('#broadcast-recipients-scroll-list');
      if (scrollList) {
        scrollList.innerHTML = renderRecipientsRows(filtered);
      }
    });

    // Check configuration status & show warning if not configured
    const cfg = getEmailConfig();
    if (configWarningBox) {
      if (!cfg.enabled || !cfg.apiKey) {
        configWarningBox.style.display = 'block';
        configWarningBox.innerHTML = `
          ⚠️ <b>Cảnh báo Cấu hình Email:</b> 
          ${!cfg.enabled ? 'Tính năng gửi email tự động đang TẮT. ' : ''}
          ${!cfg.apiKey ? 'Chưa nhập API Key (Brevo / Resend). ' : ''}
          <button type="button" id="btn-goto-email-tab" style="background:none;border:none;color:#1d4ed8;font-weight:bold;text-decoration:underline;cursor:pointer;padding:0;margin-left:6px;font-size:12px;">
            ⚙️ Mở Tab 06 để cấu hình ngay ↗
          </button>
        `;
        document.querySelector('#btn-goto-email-tab')?.addEventListener('click', () => {
          dialog?.close();
          switchAdminTab('admin-tab-marketing');
          const emailSec = document.querySelector('#email-cfg-enabled')?.closest('.card');
          if (emailSec) emailSec.scrollIntoView({ behavior: 'smooth' });
        });
      } else {
        configWarningBox.style.display = 'none';
      }
    }
  };

  openBtn?.addEventListener('click', () => {
    updateRecipientPreview();
    dialog?.showModal();
  });

  closeBtn?.addEventListener('click', () => dialog?.close());
  cancelBtn?.addEventListener('click', () => dialog?.close());

  form?.querySelectorAll('input[name="broadcast_target"]').forEach(radio => {
    radio.addEventListener('change', updateRecipientPreview);
  });

  testEmailInput?.addEventListener('input', () => {
    updateRecipientPreview();
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const cfg = getEmailConfig();
    if (!cfg.apiKey && cfg.provider !== 'supabase_edge' && cfg.provider !== 'custom_webhook') {
      alert(`⚠️ Bạn chưa nhập API Key cho nhà cung cấp ${cfg.provider ? cfg.provider.toUpperCase() : 'EMAIL'}!\n\nVui lòng vào Tab 06 / Cấu hình Email để nhập API Key và nhấn "Lưu Cấu Hình".`);
      return;
    }

    const selRadio = form.querySelector('input[name="broadcast_target"]:checked');
    const targetType = selRadio ? selRadio.value : 'all';
    const recipients = await getRecipientEmails(targetType);

    if (recipients.length === 0) {
      alert('Không tìm thấy địa chỉ email hợp lệ nào trong danh sách nhóm này!');
      return;
    }

    const kicker = document.querySelector('#broadcast-kicker')?.value.trim() || 'THÔNG BÁO QUAN TRỌNG';
    const subject = document.querySelector('#broadcast-subject')?.value.trim();
    const headline = document.querySelector('#broadcast-headline')?.value.trim();
    const content = document.querySelector('#broadcast-content')?.value.trim();
    const ctaText = document.querySelector('#broadcast-cta-text')?.value.trim() || '';
    const ctaUrl = document.querySelector('#broadcast-cta-url')?.value.trim() || '';

    if (!subject || !content) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo!');
      return;
    }

    const confirmed = confirm(`Bạn có chắc chắn muốn gửi email broadcast này đến ${recipients.length} người nhận?`);
    if (!confirmed) return;

    const progressBox = document.querySelector('#broadcast-progress-box');
    const progressBar = document.querySelector('#broadcast-progress-bar');
    const progressText = document.querySelector('#broadcast-progress-text');
    const progressPct = document.querySelector('#broadcast-progress-pct');
    const logText = document.querySelector('#broadcast-log-text');
    const submitBtn = document.querySelector('#submit-admin-broadcast-btn');

    if (progressBox) progressBox.style.display = 'block';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Đang gửi thư hàng loạt...';
    }
    if (progressBar) progressBar.style.width = '0%';
    if (progressPct) progressPct.textContent = '0%';
    if (progressText) progressText.textContent = `Bắt đầu gửi đến ${recipients.length} người nhận...`;
    if (logText) logText.innerHTML = '';

    try {
      const result = await sendBroadcastEmail({
        recipientEmails: recipients,
        recipients: recipients,
        subject,
        kicker,
        headerTitle: headline,
        headline,
        contentHtml: content,
        message: content,
        actionBtnText: ctaText,
        ctaText,
        actionBtnUrl: ctaUrl,
        ctaUrl,
        onProgress: ({ current, total, sent, failed, percent, currentRecipient, success }) => {
          const pct = percent || Math.round((current / total) * 100);
          if (progressBar) progressBar.style.width = `${pct}%`;
          if (progressPct) progressPct.textContent = `${pct}%`;
          if (progressText) progressText.textContent = `Đang gửi ${current} / ${total} (Thành công: ${sent}, Thất bại: ${failed})...`;
          if (logText) {
            const statusIcon = success ? '✓' : '⚠️';
            const logLine = document.createElement('div');
            logLine.style.padding = '2px 0';
            logLine.style.color = success ? '#86efac' : '#fca5a5';
            logLine.textContent = `${statusIcon} [${current}/${total}] ${currentRecipient || ''}`;
            logText.prepend(logLine);
          }
        }
      });

      if (!result.success && result.total === 0) {
        alert(`❌ Không thể bắt đầu gửi:\n${result.error || 'Vui lòng kiểm tra lại danh sách người nhận.'}`);
        if (progressText) progressText.textContent = `Thất bại: ${result.error || 'Lỗi gửi thư'}`;
        return;
      }

      const totalSent = result.sent ?? result.successCount ?? 0;
      const totalFailed = result.failed ?? result.failCount ?? 0;

      if (progressText) {
        progressText.textContent = `✓ Đã hoàn tất: ${totalSent} thành công, ${totalFailed} thất bại.`;
      }
      if (progressBar) progressBar.style.width = '100%';
      if (progressPct) progressPct.textContent = '100%';

      if (totalFailed > 0 && result.errors && result.errors.length > 0) {
        const firstErr = result.errors[0];
        alert(`Đã gửi broadcast hoàn tất!\n- Thành công: ${totalSent}\n- Thất bại: ${totalFailed}\n\nChi tiết lỗi gần nhất:\n${firstErr.email}: ${firstErr.error}`);
      } else {
        alert(`🎉 Đã gửi broadcast THÀNH CÔNG đến ${totalSent} người nhận!`);
      }
    } catch (err) {
      alert(`Lỗi khi gửi broadcast: ${err.message}`);
      if (progressText) progressText.textContent = `Lỗi: ${err.message}`;
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚀 Bắt Đầu Gửi Thư Hàng Loạt';
      }
    }
  });
}

// ============================================================================
// 16. APPOINTMENTS & A&R BOOKINGS ADMIN (LỊCH HẸN VÀ XÁC NHẬN MEETING)
// ============================================================================
let currentApptFilter = 'all';

async function getAppointments() {
  let list = [];
  try {
    const raw = localStorage.getItem('uniflows_appointments');
    if (raw) list = JSON.parse(raw);
  } catch (e) {
    console.warn('Lỗi đọc local appointments:', e);
  }

  if (isSupabaseConfigured()) {
    try {
      const res = await withTimeout(
        supabase
          .from('appointments')
          .select('*')
          .order('date', { ascending: true }),
        2500,
        null
      );
      const data = res?.data;
      const error = res?.error;
      if (!error && Array.isArray(data) && data.length > 0) {
        const sbList = data.map(r => ({
          id: r.id,
          date: r.date,
          timeSlot: r.time_slot || r.timeSlot,
          durationMinutes: r.duration_minutes || r.durationMinutes || 45,
          host: r.host || 'UniFLOWs A&R Team',
          topicCategory: r.topic_category || r.topicCategory || 'Thẩm định Demo',
          status: r.status || 'open',
          slotNotes: r.slot_notes || r.slotNotes || '',
          booker: r.booker || null,
          meetingMethod: r.meeting_method || r.meetingMethod || '',
          meetingLink: r.meeting_link || r.meetingLink || '',
          adminNotes: r.admin_notes || r.adminNotes || '',
          confirmedAt: r.confirmed_at || r.confirmedAt || null,
          createdAt: r.created_at || r.createdAt || new Date().toISOString()
        }));

        const idMap = new Map();
        sbList.forEach(r => idMap.set(r.id, r));
        list.forEach(r => {
          if (!idMap.has(r.id)) idMap.set(r.id, r);
        });
        list = Array.from(idMap.values());
        try {
          localStorage.setItem('uniflows_appointments', JSON.stringify(list));
        } catch (_) {}
      }
    } catch (e) {
      console.warn('Lỗi fetch appointments từ Supabase:', e);
    }
  }

  // Seed default slots if empty
  if (!Array.isArray(list) || list.length === 0) {
    const today = new Date();
    const d1 = new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0];
    const d2 = new Date(today.getTime() + 3 * 86400000).toISOString().split('T')[0];
    const d3 = new Date(today.getTime() + 5 * 86400000).toISOString().split('T')[0];

    list = [
      {
        id: 'appt-sample-1',
        date: d1,
        timeSlot: '10:00 - 10:45',
        durationMinutes: 45,
        host: 'UniFLOWs A&R Lead Team',
        topicCategory: 'Nghe & Thẩm định Demo A&R',
        status: 'open',
        slotNotes: 'Dành cho các ca khúc demo mới gửi trong tuần',
        createdAt: new Date().toISOString()
      },
      {
        id: 'appt-sample-2',
        date: d1,
        timeSlot: '14:30 - 15:15',
        durationMinutes: 45,
        host: 'A&R & Distribution Lead',
        topicCategory: 'Ký hợp đồng & Phân phối Master',
        status: 'open',
        slotNotes: 'Tư vấn ký độc quyền & đối soát phân phối DSP',
        createdAt: new Date().toISOString()
      },
      {
        id: 'appt-sample-3',
        date: d2,
        timeSlot: '15:00 - 15:45',
        durationMinutes: 45,
        host: 'UniFLOWs A&R Team',
        topicCategory: 'Tư vấn Chiến lược Ra mắt (Single/Album)',
        status: 'open',
        slotNotes: 'Chiến dịch pitching Spotify Editorial & TikTok Sound',
        createdAt: new Date().toISOString()
      },
      {
        id: 'appt-sample-4',
        date: d3,
        timeSlot: '16:00 - 17:00',
        durationMinutes: 60,
        host: 'Head of Production & A&R',
        topicCategory: 'Gặp gỡ trực tiếp tại Studio',
        status: 'open',
        slotNotes: 'Trải nghiệm phòng thu UniFLOWs Studio',
        createdAt: new Date().toISOString()
      }
    ];
    try {
      localStorage.setItem('uniflows_appointments', JSON.stringify(list));
    } catch (_) {}
  }

  return list;
}

async function renderAppointmentsAdmin(filter = currentApptFilter) {
  currentApptFilter = filter;

  // Update filter buttons UI
  document.querySelectorAll('.appt-filter-btn').forEach(btn => {
    if (btn.dataset.apptFilter === filter) {
      btn.classList.add('active');
      btn.classList.remove('alt');
    } else {
      btn.classList.remove('active');
      btn.classList.add('alt');
    }
  });

  const listContainer = document.querySelector('#admin-appointments-list');
  if (!listContainer) return;

  const allSlots = await getAppointments();

  // Update counters
  const bookedCount = allSlots.filter(s => s.status === 'booked').length;
  const openCount = allSlots.filter(s => s.status === 'open').length;
  const confirmedCount = allSlots.filter(s => s.status === 'confirmed').length;
  const doneCount = allSlots.filter(s => s.status === 'completed' || s.status === 'cancelled').length;

  const countAllEl = document.querySelector('#appt-count-all');
  const countBookedEl = document.querySelector('#appt-count-booked');
  const countOpenEl = document.querySelector('#appt-count-open');
  const countConfirmedEl = document.querySelector('#appt-count-confirmed');
  const countDoneEl = document.querySelector('#appt-count-done');
  const badgeNav = document.querySelector('#badge-tab-appointments');

  if (countAllEl) countAllEl.textContent = allSlots.length;
  if (countBookedEl) countBookedEl.textContent = bookedCount;
  if (countOpenEl) countOpenEl.textContent = openCount;
  if (countConfirmedEl) countConfirmedEl.textContent = confirmedCount;
  if (countDoneEl) countDoneEl.textContent = doneCount;

  if (badgeNav) {
    badgeNav.textContent = bookedCount;
    badgeNav.style.display = bookedCount > 0 ? 'inline-block' : 'none';
  }

  // Filter slots
  let filtered = allSlots;
  if (filter === 'booked') filtered = allSlots.filter(s => s.status === 'booked');
  else if (filter === 'open') filtered = allSlots.filter(s => s.status === 'open');
  else if (filter === 'confirmed') filtered = allSlots.filter(s => s.status === 'confirmed');
  else if (filter === 'done') filtered = allSlots.filter(s => s.status === 'completed' || s.status === 'cancelled');

  // Sort: booked first, then by date ascending
  filtered.sort((a, b) => {
    if (a.status === 'booked' && b.status !== 'booked') return -1;
    if (b.status === 'booked' && a.status !== 'booked') return 1;
    return new Date(a.date) - new Date(b.date);
  });

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div style="background:#fff;border:1px solid var(--ink);border-radius:10px;padding:32px 20px;text-align:center;">
        <div style="font-size:28px;margin-bottom:8px;">📭</div>
        <strong style="font-size:14px;color:#0f172a;">Không có lịch hẹn nào trong mục này</strong>
        <p style="font-size:12px;color:#64748b;margin:4px 0 0;">Bạn có thể tạo thêm khung giờ trống ở biểu mẫu bên trên để mở cho nghệ sĩ book.</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = filtered.map(slot => {
    const isBooked = slot.status === 'booked';
    const isConfirmed = slot.status === 'confirmed';
    const isOpen = slot.status === 'open';
    const isDone = slot.status === 'completed';
    const isCancelled = slot.status === 'cancelled';

    let statusBadge = '';
    let borderStyle = 'border: 1px solid var(--ink);';
    if (isBooked) {
      statusBadge = '<span style="background:#fef3c7;color:#b45309;font-weight:bold;font-size:11px;padding:3px 8px;border-radius:4px;border:1px solid #fde68a;">🟡 Chờ Duyệt & Gán Link</span>';
      borderStyle = 'border: 2px solid #f59e0b; background: #fffdf5;';
    } else if (isConfirmed) {
      statusBadge = '<span style="background:#dbeafe;color:#1d4ed8;font-weight:bold;font-size:11px;padding:3px 8px;border-radius:4px;border:1px solid #bfdbfe;">🔵 Đã Xác Nhận & Đã Gửi Mail</span>';
      borderStyle = 'border: 1px solid #3b82f6; background: #fff;';
    } else if (isOpen) {
      statusBadge = '<span style="background:#dcfce7;color:#15803d;font-weight:bold;font-size:11px;padding:3px 8px;border-radius:4px;border:1px solid #bbf7d0;">🟢 Đang Mở Đặt</span>';
      borderStyle = 'border: 1px solid #cbd5e1; background: #fff;';
    } else if (isDone) {
      statusBadge = '<span style="background:#f1f5f9;color:#475569;font-size:11px;padding:3px 8px;border-radius:4px;">✓ Đã hoàn thành</span>';
      borderStyle = 'border: 1px solid #e2e8f0; background: #f8fafc; opacity: 0.85;';
    } else {
      statusBadge = '<span style="background:#fee2e2;color:#b91c1c;font-size:11px;padding:3px 8px;border-radius:4px;">✕ Đã huỷ</span>';
      borderStyle = 'border: 1px solid #fca5a5; background: #fff5f5; opacity: 0.8;';
    }

    const dateObj = new Date(slot.date + 'T00:00:00');
    const dateFormatted = dateObj.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const booker = slot.booker || null;

    return `
      <div class="appointment-card" style="border-radius:10px;padding:18px;${borderStyle}box-shadow:0 2px 8px rgba(0,0,0,0.04);display:flex;flex-direction:column;gap:12px;">
        <!-- Top Info Line -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <strong style="font-size:15px;color:#0f172a;letter-spacing:-0.02em;">📅 ${dateFormatted}</strong>
              <span style="font-family:'DM Mono',monospace;font-weight:bold;font-size:14px;color:#2563eb;background:#eff6ff;padding:2px 8px;border-radius:4px;">⏰ ${slot.timeSlot}</span>
              <span style="font-size:11px;color:#64748b;font-family:'DM Mono',monospace;">(${slot.durationMinutes || 45} phút)</span>
            </div>
            <div style="font-size:12px;color:#475569;margin-top:4px;">
              Chuyên đề: <b>${esc(slot.topicCategory || 'Gặp gỡ & Thẩm định Demo')}</b> | Đại diện: <b>${esc(slot.host || 'A&R Team')}</b>
            </div>
          </div>
          <div>${statusBadge}</div>
        </div>

        ${slot.slotNotes ? `
          <div style="font-size:11px;color:#64748b;font-style:italic;background:#f8fafc;padding:6px 10px;border-radius:4px;">
            💬 Ghi chú slot: ${esc(slot.slotNotes)}
          </div>
        ` : ''}

        <!-- Booker Information Details (if booked or confirmed) -->
        ${booker ? `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;display:grid;gap:6px;font-size:12px;">
            <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;">
              <div>
                👤 Người đặt: <strong style="color:#0f172a;font-size:13px;">${esc(booker.name)}</strong>
                ${booker.artistName ? ` (Nghệ danh: <strong style="color:#2563eb;">${esc(booker.artistName)}</strong>)` : ''}
              </div>
              <span style="font-size:11px;color:#64748b;background:#e2e8f0;padding:2px 6px;border-radius:4px;">
                ${booker.type === 'demo' ? '🎵 Gửi Demo' : booker.type === 'artist' ? '⭐ Nghệ sĩ Hãng' : booker.type === 'producer' ? '🎛️ Producer' : '💬 Đối tác'}
              </span>
            </div>
            <div>
              ✉️ Email: <code style="font-weight:bold;color:#0284c7;">${esc(booker.email)}</code> | 📞 Điện thoại: <b>${esc(booker.phone || 'Chưa cung cấp')}</b>
            </div>
            ${booker.demoLink ? `
              <div>
                🔗 Link demo: <a href="${esc(booker.demoLink)}" target="_blank" style="color:#2563eb;font-weight:bold;text-decoration:underline;">${esc(booker.demoLink)} ↗</a>
              </div>
            ` : ''}
            ${booker.notes ? `
              <div style="color:#475569;margin-top:2px;">
                📝 Nội dung muốn trao đổi: <em>"${esc(booker.notes)}"</em>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Meeting Method & Link Details (if confirmed) -->
        ${isConfirmed ? `
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 14px;font-size:12px;display:grid;gap:4px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
              <strong style="color:#1e40af;">🚀 Phương thức: ${esc(slot.meetingMethod || 'Google Meet')}</strong>
              <span style="font-size:10px;color:#64748b;font-family:'DM Mono',monospace;">ĐÃ XÁC NHẬN: ${slot.confirmedAt ? new Date(slot.confirmedAt).toLocaleDateString('vi-VN', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' }) : ''}</span>
            </div>
            <div>
              🔗 Link tham gia / Địa điểm: <a href="${esc(slot.meetingLink)}" target="_blank" style="color:#2563eb;font-weight:bold;font-family:'DM Mono',monospace;word-break:break-all;">${esc(slot.meetingLink)} ↗</a>
            </div>
            ${slot.adminNotes ? `
              <div style="color:#475569;font-size:11px;margin-top:2px;">
                💬 Hướng dẫn gửi kèm: <em>"${esc(slot.adminNotes)}"</em>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Action Buttons -->
        <div style="display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;border-top:1px solid #f1f5f9;padding-top:10px;margin-top:4px;">
          ${isOpen ? `
            <button type="button" class="btn-delete-appt-slot button alt remove" data-slot-id="${slot.id}" style="padding:6px 12px;font-size:11px;">
              🗑️ Xoá Khung Giờ
            </button>
          ` : ''}

          ${isBooked ? `
            <button type="button" class="btn-open-confirm-modal button" data-slot-id="${slot.id}" style="background:#8b5cf6;color:#fff;border-color:#8b5cf6;font-weight:bold;padding:7px 16px;font-size:11px;">
              ⚡ Thêm Phương Thức & Xác Nhận Lịch Hẹn
            </button>
            <button type="button" class="btn-cancel-appt-slot button alt remove" data-slot-id="${slot.id}" style="padding:6px 12px;font-size:11px;">
              ✕ Huỷ Lịch
            </button>
          ` : ''}

          ${isConfirmed ? `
            <button type="button" class="btn-open-confirm-modal button alt" data-slot-id="${slot.id}" style="padding:6px 12px;font-size:11px;border-color:#3b82f6;color:#1d4ed8;">
              ✏️ Sửa Link / Gửi Lại Email
            </button>
            <button type="button" class="btn-complete-appt-slot button" data-slot-id="${slot.id}" style="background:#15803d;color:#fff;border-color:#15803d;padding:6px 12px;font-size:11px;font-weight:bold;">
              ✓ Đã Họp Xong
            </button>
            <button type="button" class="btn-cancel-appt-slot button alt remove" data-slot-id="${slot.id}" style="padding:6px 10px;font-size:11px;">
              ✕ Huỷ
            </button>
          ` : ''}

          ${isDone || isCancelled ? `
            <button type="button" class="btn-reopen-appt-slot button alt" data-slot-id="${slot.id}" style="padding:5px 10px;font-size:11px;">
              🔄 Mở Lại Khung Này
            </button>
            <button type="button" class="btn-delete-appt-slot button alt remove" data-slot-id="${slot.id}" style="padding:5px 10px;font-size:11px;">
              🗑️ Xoá
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Attach button events
  // 1. Delete slot
  listContainer.querySelectorAll('.btn-delete-appt-slot').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.slotId;
      if (!confirm('Bạn có chắc chắn muốn xoá khung giờ này?')) return;
      let slots = await getAppointments();
      slots = slots.filter(s => s.id !== id);
      localStorage.setItem('uniflows_appointments', JSON.stringify(slots));
      if (isSupabaseConfigured()) {
        try { await supabase.from('appointments').delete().eq('id', id); } catch (_) {}
      }
      showNotice('✓ Đã xoá khung giờ thành công!');
      renderAppointmentsAdmin(currentApptFilter);
    });
  });

  // 2. Open confirmation modal
  listContainer.querySelectorAll('.btn-open-confirm-modal').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.slotId;
      const slots = await getAppointments();
      const targetSlot = slots.find(s => s.id === id);
      if (!targetSlot) return;

      const modal = document.querySelector('#modal-confirm-appointment');
      if (!modal) return;

      document.querySelector('#confirm-appt-id').value = targetSlot.id;
      document.querySelector('#confirm-appt-booker-name').textContent = targetSlot.booker?.name || 'Khách';
      document.querySelector('#confirm-appt-artist-name').textContent = targetSlot.booker?.artistName || 'N/A';
      document.querySelector('#confirm-appt-booker-email').textContent = targetSlot.booker?.email || '';
      document.querySelector('#confirm-appt-booker-phone').textContent = targetSlot.booker?.phone || 'Chưa cung cấp';
      document.querySelector('#confirm-appt-topic').textContent = targetSlot.topicCategory || 'Gặp gỡ & Thẩm định Demo';

      const apptCode = targetSlot.booker?.dossierCode || targetSlot.dossierCode || targetSlot.id;
      const apptCodeEl = document.querySelector('#confirm-appt-code');
      if (apptCodeEl) apptCodeEl.textContent = apptCode;

      const dateObj = new Date(targetSlot.date + 'T00:00:00');
      document.querySelector('#confirm-appt-datetime').textContent = `${dateObj.toLocaleDateString('vi-VN')} (${targetSlot.timeSlot})`;

      const demoBox = document.querySelector('#confirm-appt-demo-box');
      const demoLinkEl = document.querySelector('#confirm-appt-demo-link');
      if (targetSlot.booker?.demoLink) {
        demoBox.style.display = 'block';
        demoLinkEl.href = targetSlot.booker.demoLink;
        demoLinkEl.textContent = targetSlot.booker.demoLink;
      } else {
        demoBox.style.display = 'none';
      }

      // Pre-fill existing or default values
      if (targetSlot.meetingMethod) {
        document.querySelector('#confirm-appt-method').value = targetSlot.meetingMethod;
      }
      document.querySelector('#confirm-appt-link').value = targetSlot.meetingLink || 'https://meet.google.com/';
      document.querySelector('#confirm-appt-notes').value = targetSlot.adminNotes || 'Bạn vui lòng vào link đúng giờ và chuẩn bị sẵn file WAV bản demo cùng lời bài hát nhé.';

      modal.showModal();
    });
  });

  // 3. Cancel slot booking
  listContainer.querySelectorAll('.btn-cancel-appt-slot').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.slotId;
      if (!confirm('Bạn có chắc muốn huỷ lịch hẹn này? Khung giờ sẽ được đánh dấu đã huỷ.')) return;
      let slots = await getAppointments();
      const target = slots.find(s => s.id === id);
      if (target) {
        target.status = 'cancelled';
        localStorage.setItem('uniflows_appointments', JSON.stringify(slots));
        if (isSupabaseConfigured()) {
          try { await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id); } catch (_) {}
        }
        showNotice('✕ Đã huỷ lịch hẹn.');
        renderAppointmentsAdmin(currentApptFilter);
      }
    });
  });

  // 4. Complete slot
  listContainer.querySelectorAll('.btn-complete-appt-slot').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.slotId;
      let slots = await getAppointments();
      const target = slots.find(s => s.id === id);
      if (target) {
        target.status = 'completed';
        localStorage.setItem('uniflows_appointments', JSON.stringify(slots));
        if (isSupabaseConfigured()) {
          try { await supabase.from('appointments').update({ status: 'completed' }).eq('id', id); } catch (_) {}
        }
        showNotice('✓ Đã đánh dấu lịch hẹn hoàn tất thành công!');
        renderAppointmentsAdmin(currentApptFilter);
      }
    });
  });

  // 5. Re-open slot
  listContainer.querySelectorAll('.btn-reopen-appt-slot').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.slotId;
      let slots = await getAppointments();
      const target = slots.find(s => s.id === id);
      if (target) {
        target.status = 'open';
        target.booker = null;
        target.meetingLink = '';
        target.adminNotes = '';
        localStorage.setItem('uniflows_appointments', JSON.stringify(slots));
        if (isSupabaseConfigured()) {
          try { await supabase.from('appointments').update({ status: 'open', booker: null, meeting_link: '', admin_notes: '' }).eq('id', id); } catch (_) {}
        }
        showNotice('✓ Đã mở lại khung giờ này để nhận đặt lịch mới!');
        renderAppointmentsAdmin(currentApptFilter);
      }
    });
  });
}

function initAppointmentsAdmin() {
  // 1. Setup shareable booking URL
  const bookingUrl = window.location.origin + '/booking.html';
  const urlInput = document.querySelector('#admin-booking-url-input');
  const previewLink = document.querySelector('#btn-preview-booking-url');
  const copyBtn = document.querySelector('#btn-copy-booking-url');

  if (urlInput) urlInput.value = bookingUrl;
  if (previewLink) previewLink.href = bookingUrl;

  if (copyBtn && urlInput) {
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(urlInput.value);
        copyBtn.textContent = '✓ Đã Copy!';
        setTimeout(() => { copyBtn.textContent = '📋 Copy Link'; }, 2000);
      } catch (_) {
        urlInput.select();
        document.execCommand('copy');
        copyBtn.textContent = '✓ Đã Copy!';
        setTimeout(() => { copyBtn.textContent = '📋 Copy Link'; }, 2000);
      }
    };
  }

  // 2. Set min date for new slot creation form to today
  const dateInput = document.querySelector('#appt-new-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;
  }

  // 3. New slot form submission
  const handleCreateNewSlot = async (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    const dateInputEl = document.querySelector('#appt-new-date');
    const timeInputEl = document.querySelector('#appt-new-time');
    const durationInputEl = document.querySelector('#appt-new-duration');
    const hostInputEl = document.querySelector('#appt-new-host');
    const categoryInputEl = document.querySelector('#appt-new-category');
    const noteInputEl = document.querySelector('#appt-new-note');

    const dateVal = dateInputEl ? dateInputEl.value : '';
    const timeVal = timeInputEl ? timeInputEl.value.trim() : '';
    const durationVal = durationInputEl ? durationInputEl.value : '45';
    const hostVal = hostInputEl ? hostInputEl.value.trim() : '';
    const categoryVal = categoryInputEl ? categoryInputEl.value : '';
    const noteVal = noteInputEl ? noteInputEl.value.trim() : '';

    if (!dateVal || !timeVal) {
      alert('Vui lòng chọn ngày và nhập khung giờ hẹn.');
      return;
    }

    const newSlot = {
      id: 'appt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      date: dateVal,
      timeSlot: timeVal,
      durationMinutes: parseInt(durationVal, 10) || 45,
      host: hostVal || 'UniFLOWs A&R Lead Team',
      topicCategory: categoryVal,
      status: 'open',
      slotNotes: noteVal,
      createdAt: new Date().toISOString()
    };

    const slots = await getAppointments();
    slots.push(newSlot);
    try {
      localStorage.setItem('uniflows_appointments', JSON.stringify(slots));
    } catch (_) {}

    if (isSupabaseConfigured() && typeof supabase !== 'undefined' && supabase) {
      try {
        const res = await withTimeout(
          supabase.from('appointments').insert([{
            id: newSlot.id,
            date: newSlot.date,
            time_slot: newSlot.timeSlot,
            duration_minutes: newSlot.durationMinutes,
            host: newSlot.host,
            topic_category: newSlot.topicCategory,
            status: 'open',
            slot_notes: newSlot.slotNotes,
            created_at: newSlot.createdAt
          }]),
          3000,
          null
        );
        if (res?.error) {
          console.error('Lỗi ghi Supabase appointment:', res.error);
          showNotice(`⚠️ Đã lưu local nhưng Supabase lỗi: ${res.error.message}`, true);
        }
      } catch (apptErr) {
        console.warn('Lỗi kết nối Supabase khi tạo appointment:', apptErr);
      }
    }

    showNotice(`✓ Đã thêm khung giờ trống ngày ${dateVal} (${timeVal}) thành công!`);
    if (timeInputEl) timeInputEl.value = '';
    if (noteInputEl) noteInputEl.value = '';
    await renderAppointmentsAdmin(currentApptFilter);
  };

  const submitSlotBtn = document.querySelector('#btn-submit-create-slot');
  if (submitSlotBtn) {
    submitSlotBtn.onclick = handleCreateNewSlot;
  }
  const createForm = document.querySelector('#form-create-appt-slot');
  if (createForm) {
    if (createForm.tagName === 'FORM') {
      createForm.onsubmit = handleCreateNewSlot;
    }
    createForm.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT') {
        e.preventDefault();
        handleCreateNewSlot(e);
      }
    });
  }

  // 4. Filter buttons
  document.querySelectorAll('.appt-filter-btn').forEach(btn => {
    btn.onclick = () => {
      renderAppointmentsAdmin(btn.dataset.apptFilter);
    };
  });

  // 5. Refresh button
  document.querySelector('#btn-refresh-appointments')?.addEventListener('click', () => {
    renderAppointmentsAdmin(currentApptFilter);
  });

  // 6. Confirm appointment form submission (Modal)
  const confirmForm = document.querySelector('#confirm-appt-form');
  const confirmModal = document.querySelector('#modal-confirm-appointment');
  const closeConfirmBtn = document.querySelector('#close-confirm-appt-btn');
  const cancelConfirmBtn = document.querySelector('#cancel-confirm-appt-btn');

  if (closeConfirmBtn && confirmModal) closeConfirmBtn.onclick = () => confirmModal.close();
  if (cancelConfirmBtn && confirmModal) cancelConfirmBtn.onclick = () => confirmModal.close();

  if (confirmForm) {
    confirmForm.onsubmit = async (e) => {
      e.preventDefault();
      const slotId = document.querySelector('#confirm-appt-id').value;
      const method = document.querySelector('#confirm-appt-method').value;
      const link = document.querySelector('#confirm-appt-link').value.trim();
      const notes = document.querySelector('#confirm-appt-notes').value.trim();
      const sendEmail = document.querySelector('#confirm-appt-auto-email').checked;

      const submitBtn = document.querySelector('#submit-confirm-appt-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang xử lý & gửi email...';

      try {
        const slots = await getAppointments();
        const targetSlot = slots.find(s => s.id === slotId);
        if (!targetSlot) {
          alert('Không tìm thấy lịch hẹn.');
          return;
        }

        targetSlot.status = 'confirmed';
        targetSlot.meetingMethod = method;
        targetSlot.meetingLink = link;
        targetSlot.adminNotes = notes;
        targetSlot.confirmedAt = new Date().toISOString();

        localStorage.setItem('uniflows_appointments', JSON.stringify(slots));

        if (isSupabaseConfigured()) {
          try {
            await supabase.from('appointments').update({
              status: 'confirmed',
              meeting_method: method,
              meeting_link: link,
              admin_notes: notes,
              confirmed_at: targetSlot.confirmedAt,
              updated_at: new Date().toISOString()
            }).eq('id', slotId);
          } catch (err) {
            console.warn('Lỗi update appointment Supabase:', err);
          }
        }

        // Send confirmation email
        let emailMsg = '';
        if (sendEmail && targetSlot.booker?.email) {
          try {
            const isArtist = targetSlot.booker?.type === 'artist' || targetSlot.booker?.isArtist;
            const refCode = targetSlot.booker?.dossierCode || targetSlot.dossierCode || targetSlot.id;
            const mailRes = await sendAppointmentConfirmationEmail({
              to: targetSlot.booker.email,
              bookerName: targetSlot.booker.name || 'Bạn',
              artistName: targetSlot.booker.artistName || '',
              date: targetSlot.date,
              timeSlot: targetSlot.timeSlot,
              topic: targetSlot.topicCategory || 'Gặp gỡ A&R',
              meetingMethod: method,
              meetingLink: link,
              notes: notes,
              recipientType: isArtist ? 'artist' : 'demo',
              demoRefCode: refCode
            });
            if (mailRes && mailRes.success) {
              emailMsg = ` & đã tự động gửi email xác nhận kèm link tới "${targetSlot.booker.email}"!`;
            } else if (mailRes && mailRes.error) {
              emailMsg = ` ⚠️ (Cảnh báo email: ${mailRes.error})`;
            }
          } catch (err) {
            console.warn('Lỗi dispatch appointment email:', err);
            emailMsg = ` ⚠️ (Lỗi gửi email: ${err.message})`;
          }
        }

        confirmModal.close();
        showNotice(`✓ Đã xác nhận lịch hẹn thành công${emailMsg}`);
        await logAuditEvent('Xác nhận lịch hẹn A&R', `Xác nhận lịch cho: ${targetSlot.booker?.name} (${targetSlot.booker?.email}) - ${method}`);
        renderAppointmentsAdmin(currentApptFilter);
      } catch (err) {
        alert('Lỗi xác nhận lịch hẹn: ' + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚀 Xác Nhận & Gửi Email Cho Khách';
      }
    };
  }

  renderAppointmentsAdmin();
}

// Initial calls
initAdminNotificationCenter();
renderSpecialRequestsAdmin();
initBroadcastEmailAdmin();
initDemoReplyEmailModal();
initAppointmentsAdmin();






