import { getData, saveData, defaultData } from './data.js';
import { supabase, isSupabaseConfigured, uploadArtworkFile, uploadAudioFile } from './supabase.js';

if (sessionStorage.getItem('uniflows-admin') !== 'true') {
  location.replace('login');
}

const form = document.querySelector('#site-form');
const artistsBox = document.querySelector('#artists-editor');
const artistSelectorGrid = document.querySelector('#artist-selector-grid');
const articlesBox = document.querySelector('#articles-editor');
const releasesBox = document.querySelector('#releases-reviewer');
const emailsContainer = document.querySelector('#emails-editor-container');
const addEmailBtn = document.querySelector('#add-email-row-btn');
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
// ARTIST MANAGER (SELECTOR + CARD EDITOR)
// ----------------------------------------------------
function renderArtistSelector() {
  if (!artistSelectorGrid) return;
  if (!data.artists || data.artists.length === 0) {
    artistSelectorGrid.innerHTML = '<p class="empty" style="grid-column:1/-1;">Chưa có nghệ sĩ nào.</p>';
    return;
  }

  if (!selectedArtistId || !data.artists.some(a => a.id === selectedArtistId)) {
    selectedArtistId = data.artists[0].id;
  }

  artistSelectorGrid.innerHTML = data.artists.map((a, idx) => `
    <div class="artist-picker-card ${a.id === selectedArtistId ? 'active' : ''}" data-select-artist-id="${esc(a.id)}">
      <img src="${esc(a.image || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=200&q=80')}" alt="${esc(a.name)}">
      <div>
        <strong style="font-size: 14px; display: block;">${esc(a.name || 'Nghệ sĩ')}</strong>
        <span style="font-size: 11px; opacity: 0.7;">${esc(a.genre || 'Pop')}</span>
      </div>
    </div>
  `).join('');

  artistSelectorGrid.querySelectorAll('[data-select-artist-id]').forEach(card => {
    card.addEventListener('click', () => {
      selectedArtistId = card.dataset.selectArtistId;
      renderArtistSelector();
      renderSelectedArtistEditor();
    });
  });
}

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

const artistEditor = (a, idx) => `
  <div class="item-editor" data-artist data-artist-id="${esc(a.id)}" style="background:#fff;border:2px solid var(--ink);padding:24px;margin-top:10px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;border-bottom:1px solid var(--line);padding-bottom:12px;">
      <div>
        <span class="eyebrow" style="color:#2563eb;">Đang chỉnh sửa nghệ sĩ</span>
        <h3 style="margin:4px 0 0;font-size:22px;">${esc(a.name)}</h3>
      </div>
      <button class="button alt remove" type="button" data-remove-artist="${idx}" style="padding:6px 12px;font-size:11px;">✕ Xóa nghệ sĩ này</button>
    </div>

    <div class="mini-grid">
      <div class="field"><label>Tên nghệ sĩ</label><input data-key="name" value="${esc(a.name)}" required></div>
      <div class="field"><label>ID hệ thống (Slug cố định)</label><input data-key="id" value="${esc(a.id)}" required></div>
      <div class="field"><label>Thể loại chính</label><input data-key="genre" value="${esc(a.genre)}"></div>
      <div class="field">
        <label>URL Ảnh đại diện (Hoặc dán Link trực tiếp)</label>
        <input data-key="image" id="artist-img-${idx}" value="${esc(a.image)}" placeholder="https://...">
        <div style="margin-top:6px;display:flex;align-items:center;gap:10px;">
          <input type="file" accept="image/*" class="artist-file-input" data-target-input="#artist-img-${idx}" data-status-el="#artist-status-${idx}" style="font-size:11px;">
          <span id="artist-status-${idx}" style="font-size:11px;color:#008800;"></span>
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

      <h4 style="margin:15px 0 10px;font-size:13px;text-transform:uppercase;color:#555;">💰 Tổng số liệu chung (Tuỳ chọn ghi đè)</h4>
      <div class="mini-grid">
        <div class="field"><label>Tổng Streams tháng này</label><input data-key="monthlyStreams" value="${esc(a.monthlyStreams || '0')}"></div>
        <div class="field"><label>Tổng Doanh thu ước tính (₫)</label><input data-key="estimatedRevenue" value="${esc(a.estimatedRevenue || '0')}"></div>
        <div class="field"><label>Số dư khả dụng ban đầu (₫)</label><input data-key="payableBalance" value="${esc(a.payableBalance || '0')}"></div>
      </div>
    </div>

    <div class="field"><label>Tiểu sử / Giới thiệu</label><textarea data-key="bio" rows="3">${esc(a.bio)}</textarea></div>

    <div class="mini-grid" style="margin-top:10px;">
      <div class="field"><label>Instagram URL</label><input data-key="instagram" value="${esc(a.instagram || '')}"></div>
      <div class="field"><label>YouTube URL</label><input data-key="youtube" value="${esc(a.youtube || '')}"></div>
      <div class="field"><label>TikTok URL</label><input data-key="tiktok" value="${esc(a.tiktok || '')}"></div>
    </div>

    <div class="field" style="margin-top:10px;"><label>Bộ sưu tập ảnh Gallery (Mỗi dòng một URL ảnh)</label><textarea data-key="gallery" rows="3">${esc((a.gallery || []).join('\n'))}</textarea></div>
  </div>
`;

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

  // Apply Filter
  const filterVal = document.querySelector('#admin-payout-filter')?.value || 'all';
  let filtered = payoutRequests;

  if (filterVal === 'pending') {
    filtered = payoutRequests.filter(r => r.status === 'Đang chờ xem xét');
  } else if (filterVal === 'paid') {
    filtered = payoutRequests.filter(r => r.status === 'Đã thanh toán (Hoàn tất)' || r.status === 'Đã thanh toán');
  } else if (filterVal === 'rejected') {
    filtered = payoutRequests.filter(r => r.status === 'Từ chối thanh toán' || r.status === 'Từ chối');
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
      <div class="item-editor" data-payout-id="${esc(req.id)}" style="background:#fff;border:1px solid var(--ink);padding:18px;margin-bottom:12px;">
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
      }
    } catch (e) {
      console.warn('Lỗi tải queue từ Supabase:', e);
    }
  }

  // Filter Releases
  const filterVal = document.querySelector('#admin-release-filter')?.value || 'all';
  let filtered = releases;

  if (filterVal === 'pending') {
    filtered = releases.filter(r => r.submission_status && r.submission_status.includes('chờ'));
  } else if (filterVal === 'live') {
    filtered = releases.filter(r => !r.submission_status || r.submission_status === 'Đã phát hành');
  } else if (filterVal === 'takedown') {
    filtered = releases.filter(r => r.submission_status && r.submission_status.includes('gỡ'));
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
            <a class="button alt" href="/listen/${encodeURIComponent(releaseSlug)}" target="_blank" style="padding:6px 12px;font-size:11px;">SmartLink ↗</a>
            <button class="button alt remove" type="button" data-delete-release="${esc(r.id)}" style="padding:6px 10px;font-size:11px;">✕ Xóa</button>
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

      const links = {
        spotify: card.querySelector('.rel-link-spotify')?.value.trim() || '',
        apple: card.querySelector('.rel-link-apple')?.value.trim() || '',
        youtube: card.querySelector('.rel-link-youtube')?.value.trim() || '',
        zingmp3: card.querySelector('.rel-link-zing')?.value.trim() || ''
      };

      btn.disabled = true; btn.textContent = 'Đang lưu...';

      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('releases').update({
          artwork_url,
          audio_url,
          submission_status: status,
          links,
          metadata: { streams, revenue, playlists }
        }).eq('id', relId);

        if (error) {
          alert('Lỗi cập nhật Supabase: ' + error.message);
          btn.disabled = false; btn.textContent = 'Lưu bản phát hành';
          return;
        }
      }

      btn.disabled = false; btn.textContent = 'Lưu bản phát hành';
      showNotice('✓ Đã cập nhật bản phát hành & SmartLink thành công!');
      loadReleasesQueue();
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

document.querySelector('#admin-release-filter')?.addEventListener('change', () => {
  loadReleasesQueue();
});

document.querySelector('#admin-refresh-releases-btn')?.addEventListener('click', () => {
  loadReleasesQueue();
});

// ----------------------------------------------------
// MAIN RENDER & FORM SUBMISSION
// ----------------------------------------------------
function render() {
  ['tagline', 'heroText', 'aboutTitle', 'aboutText', 'city'].forEach(k => {
    if (form.elements[k]) form.elements[k].value = data[k] || '';
  });
  renderEmailsEditor(data.emails || defaultData.emails);
  renderArtistSelector();
  renderSelectedArtistEditor();
  articlesBox.innerHTML = data.articles.map(articleEditor).join('');
  attachArticleUploadEvents();
  loadReleasesQueue();
  loadPayoutRequests();
}

function readItems(selector, kind) {
  return [...document.querySelectorAll(selector)].map(el => {
    let obj = {};
    el.querySelectorAll('[data-key]').forEach(input => {
      obj[input.dataset.key] = input.type === 'checkbox' ? input.checked : input.value.trim();
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
    genre: 'Pop',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=85',
    bio: '',
    products: [],
    instagram: '',
    youtube: '',
    tiktok: '',
    monthlyStreams: '0',
    estimatedRevenue: '0',
    payableBalance: '0'
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

  // Update current edited artist data into state
  const editedArtistData = readItems('[data-artist]', 'artist')[0];
  if (editedArtistData && editedArtistData.id) {
    const existingIdx = data.artists.findIndex(a => a.id === editedArtistData.id);
    if (existingIdx >= 0) {
      data.artists[existingIdx] = { ...data.artists[existingIdx], ...editedArtistData };
    }
  }

  // Update articles
  data.articles = readItems('[data-article]', 'article');

  await saveData(data);
  showNotice('✓ Đã lưu toàn bộ dữ liệu hệ thống lên Supabase thành công!');
  saveBtn.disabled = false;
  saveBtn.textContent = 'Lưu toàn bộ lên Supabase';
  render();
});

document.querySelector('#logout')?.addEventListener('click', async () => {
  if (isSupabaseConfigured()) {
    await supabase.auth.signOut();
  }
  sessionStorage.removeItem('uniflows-admin');
  location.href = 'login';
});

render();
