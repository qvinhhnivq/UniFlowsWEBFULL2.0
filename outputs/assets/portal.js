import { getData, saveData } from './data.js';
import { supabase, isSupabaseConfigured, uploadArtworkFile, uploadAudioFile } from './supabase.js';

// Kiểm tra quyền đăng nhập
if (sessionStorage.getItem('uniflows-artist') !== 'true') {
  location.replace('artist-login');
}

const form = document.querySelector('#release-form');
const list = document.querySelector('#release-list');
const notice = document.querySelector('#portal-notice');
const submitBtn = document.querySelector('#submit-release-btn');
const artistDisplayName = document.querySelector('#artist-display-name');
const primaryArtistInput = document.querySelector('#primary-artist-input');
const audioFileInput = document.querySelector('#audio-file');
const artworkFileInput = document.querySelector('#artwork-file');
const audioFilename = document.querySelector('#audio-filename');
const artworkFilename = document.querySelector('#artwork-filename');
const pendingCountEl = document.querySelector('#pending-count');
const logoutBtn = document.querySelector('#artist-logout');
const monthlyStreamsEl = document.querySelector('#artist-monthly-streams');
const estimatedRevenueEl = document.querySelector('#artist-estimated-revenue');
const payableBalanceEl = document.querySelector('#artist-payable-balance');
const requestPayoutBtn = document.querySelector('#request-payout-btn');
const quickPayoutBtn = document.querySelector('#quick-open-payout-modal-btn');
const releaseDialog = document.querySelector('#release-dialog');
const openReleaseModalBtn = document.querySelector('#open-release-modal-btn');
const quickOpenReleaseModalBtn = document.querySelector('#quick-open-release-modal-btn');
const closeReleaseDialogBtn = document.querySelector('#close-release-dialog-btn');
const cancelReleaseBtn = document.querySelector('#cancel-release-btn');

let data = await getData();
const sessionArtistId = sessionStorage.getItem('uniflows-artist-id');
const sessionEmail = sessionStorage.getItem('uniflows-artist-email') || '';
const sessionArtistName = sessionStorage.getItem('uniflows-artist-name') || '';
const emailPrefix = sessionEmail ? sessionEmail.split('@')[0].toLowerCase() : '';

// Tự động tìm nghệ sĩ theo ID, Email đăng nhập, hoặc Username
let artist = (data.artists || []).find(a => 
  (sessionArtistId && a.id === sessionArtistId) ||
  (sessionEmail && a.email && a.email.toLowerCase() === sessionEmail.toLowerCase()) ||
  (emailPrefix && a.id && a.id.toLowerCase() === emailPrefix) ||
  (emailPrefix && a.name && a.name.toLowerCase() === emailPrefix) ||
  (sessionArtistName && a.name && a.name.toLowerCase() === sessionArtistName.toLowerCase())
);

if (!artist) {
  const fallbackName = sessionArtistName || (emailPrefix ? (emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)) : 'Nghệ sĩ');
  artist = {
    id: sessionArtistId || emailPrefix || 'artist',
    name: fallbackName,
    monthlyStreams: '0',
    estimatedRevenue: '0',
    payableBalance: '0',
    products: []
  };
}

const currentArtistId = artist.id;
sessionStorage.setItem('uniflows-artist-id', currentArtistId);
sessionStorage.setItem('uniflows-artist-name', artist.name);

// Render Artist Info, Stats, Role & Contract Terms
if (artist) {
  if (artistDisplayName) artistDisplayName.textContent = artist.name + '.';
  if (primaryArtistInput) primaryArtistInput.value = artist.name;
  if (monthlyStreamsEl) monthlyStreamsEl.textContent = artist.monthlyStreams || '0';
  if (estimatedRevenueEl) estimatedRevenueEl.textContent = `₫ ${artist.estimatedRevenue || '0'}`;
  if (payableBalanceEl) payableBalanceEl.textContent = `₫ ${artist.payableBalance || '0'}`;

  // Role Badge & Banner Setup
  const roleBadgeEl = document.querySelector('#portal-role-badge');
  const roleBannerEl = document.querySelector('#portal-role-banner');
  const welcomeDescEl = document.querySelector('#portal-welcome-desc');

  const roleMap = {
    partner: { text: '🤝 ĐỐI TÁC CHIẾN LƯỢC (PARTNER)', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', desc: 'Bảng điều khiển đối tác: Xem số liệu thống kê & nhận doanh thu chia sẻ (Split Royalty) từ các bản phát hành có tham gia.' },
    collab: { text: '✨ NGHỆ SĨ COLLAB (FEATURED)', bg: '#fdf4ff', color: '#86198f', border: '#f0abfc', desc: 'Bảng điều khiển nghệ sĩ Collab: Theo dõi stats và doanh thu từ các tác phẩm hợp tác theo thỏa thuận Split Royalty.' },
    producer: { text: '🎛️ PRODUCER / NHẠC SĨ', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', desc: 'Bảng điều khiển Producer: Theo dõi tác quyền beat, master và doanh thu phân bổ từ các bản phát hành.' },
    manager: { text: '👔 QUẢN LÝ / ĐẠI DIỆN', bg: '#f1f5f9', color: '#334155', border: '#cbd5e1', desc: 'Bảng điều khiển quản lý: Theo dõi dòng tiền, đối soát và lịch sử phát hành của nghệ sĩ.' },
    exclusive: { text: '⭐ NGHỆ SĨ ĐỘC QUYỀN', bg: '#fef3c7', color: '#b45309', border: '#fde68a', desc: 'Hồ sơ nghệ sĩ độc quyền UniFLOWs: Toàn quyền quản lý phát hành, catalogue và đối soát tài chính.' },
    distribution: { text: '💿 NGHỆ SĨ PHÂN PHỐI', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', desc: 'Quản lý toàn bộ catalogue, phát hành âm nhạc mới, theo dõi doanh thu và đối soát DSP.' }
  };

  const currentRole = roleMap[artist.roleType] || roleMap.distribution;
  if (roleBadgeEl) {
    roleBadgeEl.style.display = 'inline-flex';
    roleBadgeEl.style.alignItems = 'center';
    roleBadgeEl.textContent = currentRole.text;
    roleBadgeEl.style.background = currentRole.bg;
    roleBadgeEl.style.color = currentRole.color;
    roleBadgeEl.style.border = `1px solid ${currentRole.border}`;
    roleBadgeEl.style.letterSpacing = '0.5px';
    roleBadgeEl.style.fontFamily = "'DM Mono', monospace, sans-serif";
    roleBadgeEl.style.fontSize = '11px';
    roleBadgeEl.style.fontWeight = '700';
    roleBadgeEl.style.lineHeight = '1.4';
    roleBadgeEl.style.whiteSpace = 'nowrap';
  }

  if (roleBannerEl) {
    if (artist.roleType === 'partner' || artist.roleType === 'collab' || artist.roleType === 'producer') {
      roleBannerEl.style.display = 'block';
      roleBannerEl.style.background = currentRole.bg;
      roleBannerEl.style.color = currentRole.color;
      roleBannerEl.style.border = `1px solid ${currentRole.border}`;
      roleBannerEl.innerHTML = `<strong>${currentRole.text}:</strong> ${currentRole.desc}`;
    } else {
      roleBannerEl.style.display = 'none';
    }
  }

  if (welcomeDescEl && currentRole.desc) {
    welcomeDescEl.textContent = currentRole.desc;
  }

  // Contract & Payout Cycle fields
  const overviewCycleEl = document.querySelector('#overview-payout-cycle');
  const contractTermEl = document.querySelector('#portal-contract-term');
  const portalCycleEl = document.querySelector('#portal-payout-cycle');
  const portalRoyaltyEl = document.querySelector('#portal-royalty-rate');
  const payoutNoteEl = document.querySelector('#contract-payout-note');

  const cycleText = artist.payoutCycle || 'Hàng tháng (Monthly)';
  const royaltyText = artist.royaltyRate || (artist.roleType === 'partner' || artist.roleType === 'collab' ? 'Theo thỏa thuận Split từng bài' : '80% Master');
  const contractText = artist.contractTerm || 'Hợp đồng phân phối âm nhạc 2024 - 2027';

  if (overviewCycleEl) overviewCycleEl.textContent = `Kỳ đối soát: ${cycleText}`;
  if (contractTermEl) contractTermEl.textContent = contractText;
  if (portalCycleEl) portalCycleEl.textContent = cycleText;
  if (portalRoyaltyEl) portalRoyaltyEl.textContent = royaltyText;
  if (payoutNoteEl) payoutNoteEl.textContent = `Ngưỡng thanh toán tối thiểu: ₫ 1,000,000 · Kỳ đối soát: ${cycleText}`;
}

// ----------------------------------------------------
// OFFICIAL ANNOUNCEMENTS FROM LABEL BROADCAST (COLLAPSIBLE)
// ----------------------------------------------------
function renderPortalAnnouncements(announcements = []) {
  const container = document.querySelector('#portal-announcements-list');
  const section = document.querySelector('#portal-announcements-section');
  const toggleBtn = document.querySelector('#toggle-announcements-btn');
  const dismissBtn = document.querySelector('#dismiss-announcements-btn');
  if (!container) return;

  const activeAnnouncements = (announcements || []).filter(a => a.active !== false);

  if (activeAnnouncements.length === 0) {
    if (section) section.style.display = 'none';
    return;
  }

  // Check if dismissed in this session
  if (sessionStorage.getItem('uniflows-announcements-dismissed') === 'true') {
    if (section) section.style.display = 'none';
    return;
  }

  if (section) section.style.display = 'block';

  container.innerHTML = activeAnnouncements.map(ann => {
    const isImportant = ann.type === 'important';
    const isUpdate = ann.type === 'update';
    
    let badgeStyle = 'background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe;';
    let badgeText = '📢 Thông báo';
    
    if (isImportant) {
      badgeStyle = 'background:#fee2e2;color:#cf1322;border:1px solid #fca5a5;';
      badgeText = '🔥 Quan trọng';
    } else if (isUpdate) {
      badgeStyle = 'background:#dcfce7;color:#15803d;border:1px solid #86efac;';
      badgeText = '⚡ Cập nhật';
    }

    return `
      <div style="background:#fcfcfc;border:1px solid var(--ink);padding:16px;position:relative;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;${badgeStyle}">
              ${badgeText}
            </span>
            <strong style="font-size:15px;color:#111;">${esc(ann.title)}</strong>
          </div>
          <span style="font-size:11px;color:#666;font-family:monospace;">${esc(ann.date || '')}</span>
        </div>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#333;white-space:pre-wrap;">${esc(ann.content)}</p>
      </div>
    `;
  }).join('');

  // Handle Collapsed state
  const isCollapsed = localStorage.getItem('uniflows-announcements-collapsed') === 'true';
  if (isCollapsed) {
    container.style.display = 'none';
    if (toggleBtn) toggleBtn.textContent = 'Mở rộng ▼';
  } else {
    container.style.display = 'grid';
    if (toggleBtn) toggleBtn.textContent = 'Thu gọn ▲';
  }

  toggleBtn?.addEventListener('click', () => {
    const currentlyHidden = container.style.display === 'none';
    if (currentlyHidden) {
      container.style.display = 'grid';
      toggleBtn.textContent = 'Thu gọn ▲';
      localStorage.setItem('uniflows-announcements-collapsed', 'false');
    } else {
      container.style.display = 'none';
      toggleBtn.textContent = 'Mở rộng ▼';
      localStorage.setItem('uniflows-announcements-collapsed', 'true');
    }
  });

  dismissBtn?.addEventListener('click', () => {
    if (section) section.style.display = 'none';
    sessionStorage.setItem('uniflows-announcements-dismissed', 'true');
  });
}

renderPortalAnnouncements(data.announcements || defaultData?.announcements || []);

// ----------------------------------------------------
// TAB NAVIGATION LOGIC
// ----------------------------------------------------
function switchTab(tabId) {
  if (!tabId) tabId = 'tab-overview';
  
  // Update nav link active state
  document.querySelectorAll('#portal-nav a[data-tab]').forEach(link => {
    if (link.dataset.tab === tabId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Update tab pane active state
  document.querySelectorAll('.tab-pane').forEach(pane => {
    if (pane.id === tabId) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });
}

document.querySelectorAll('#portal-nav a[data-tab]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetTab = link.dataset.tab;
    const hash = link.getAttribute('href');
    if (hash) history.pushState(null, null, hash);
    switchTab(targetTab);
  });
});

// Support URL Hash direct navigation (e.g. portal#releases)
function handleHash() {
  const hash = location.hash.replace('#', '');
  const hashMap = {
    overview: 'tab-overview',
    releases: 'tab-releases',
    earnings: 'tab-earnings',
    insights: 'tab-insights',
    support: 'tab-support'
  };
  if (hashMap[hash]) {
    switchTab(hashMap[hash]);
  }
}

window.addEventListener('hashchange', handleHash);
handleHash();

// ----------------------------------------------------
// MODAL DIALOGS (RELEASE & PAYOUT)
// ----------------------------------------------------
openReleaseModalBtn?.addEventListener('click', () => {
  if (primaryArtistInput) primaryArtistInput.value = artist.name;
  releaseDialog?.showModal();
});

quickOpenReleaseModalBtn?.addEventListener('click', () => {
  if (primaryArtistInput) primaryArtistInput.value = artist.name;
  releaseDialog?.showModal();
});

closeReleaseDialogBtn?.addEventListener('click', () => {
  releaseDialog?.close();
});

cancelReleaseBtn?.addEventListener('click', () => {
  releaseDialog?.close();
});

// File name change indicators
audioFileInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && audioFilename) {
    audioFilename.textContent = `✓ Audio: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
  }
});

artworkFileInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && artworkFilename) {
    artworkFilename.textContent = `✓ Artwork: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  }
});

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slug(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function showNotice(msg, isError = false) {
  if (!notice) return;
  notice.textContent = msg;
  notice.style.display = 'block';
  notice.style.borderColor = isError ? 'var(--red, #ff4d4f)' : 'var(--accent, #66bb6a)';
  scrollTo({ top: notice.offsetTop - 80, behavior: 'smooth' });
}

let currentReleaseFilter = 'all';
let cachedFetchedReleases = [];

// Filter chips
document.querySelectorAll('[data-release-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-release-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentReleaseFilter = btn.dataset.releaseFilter;
    renderReleaseListItems();
  });
});

function renderReleaseListItems() {
  if (!list) return;
  let filtered = cachedFetchedReleases;

  if (currentReleaseFilter === 'live') {
    filtered = cachedFetchedReleases.filter(r => !r.submissionStatus || r.submissionStatus === 'Đã phát hành');
  } else if (currentReleaseFilter === 'pending') {
    filtered = cachedFetchedReleases.filter(r => r.submissionStatus && r.submissionStatus.includes('chờ'));
  } else if (currentReleaseFilter === 'takedown') {
    filtered = cachedFetchedReleases.filter(r => r.submissionStatus && r.submissionStatus.includes('gỡ'));
  }

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty" style="padding:15px;background:#fff;border:1px solid var(--line);">Không tìm thấy bản phát hành nào theo bộ lọc này.</p>';
    return;
  }

  list.innerHTML = filtered.map(p => {
    const isTakedownRequested = p.submissionStatus === 'Yêu cầu gỡ / xóa bản phát hành';
    const isPending = p.submissionStatus?.includes('chờ');
    const isApproved = !p.submissionStatus || p.submissionStatus === 'Đã phát hành';
    const releaseSlug = p.slug || slug(p.title);
    const playlistsHtml = (p.playlists && p.playlists.length > 0)
      ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">${p.playlists.map(pl => `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:bold;">🌟 ${pl}</span>`).join('')}</div>`
      : '';

    const statusBadge = isPending
      ? `<span style="display:inline-block;padding:2px 8px;background:#fef3c7;color:#b45309;border-radius:10px;font-size:11px;font-weight:bold;">⏳ Đang chờ UniFLOWs duyệt</span>`
      : (isTakedownRequested
        ? `<span style="display:inline-block;padding:2px 8px;background:#fee2e2;color:#b91c1c;border-radius:10px;font-size:11px;font-weight:bold;">🔴 Yêu cầu gỡ</span>`
        : `<span style="display:inline-block;padding:2px 8px;background:#dcfce7;color:#15803d;border-radius:10px;font-size:11px;font-weight:bold;">🟢 Đã phát hành (Live)</span>`);

    const splitBadge = p.isSplit
      ? `<span style="display:inline-block;padding:2px 8px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:10px;font-size:10px;font-weight:bold;">🤝 Split ${p.percentage}% (${esc(p.userRole)})</span>`
      : '';

    return `
      <div class="queue-item" style="border-top:1px solid var(--line);padding:14px 0;display:grid;grid-template-columns:110px 1fr auto auto;gap:15px;align-items:center;">
        <span>${esc(p.type || 'Single')}</span>
        <div>
          <strong style="font-size: 16px;">${esc(p.title)}</strong>
          <div style="font-size:12px;opacity:0.8;margin:4px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            ${statusBadge}
            ${splitBadge}
            · <span style="background:#f3f3f3;padding:1px 6px;border-radius:3px;">Streams bạn nhận: <b>${p.userStreams.toLocaleString('vi-VN')}</b></span>
            · <span style="background:#e6f4ea;color:#137333;padding:1px 6px;border-radius:3px;font-weight:bold;">₫ ${p.userRevenue.toLocaleString('vi-VN')}</span>
          </div>
          ${playlistsHtml}
        </div>
        <div style="display:flex;gap:0.8rem;align-items:center;font-size:12px;">
          ${p.audioUrl ? `<a href="${esc(p.audioUrl)}" target="_blank" title="Nghe file Master" style="border-bottom:1px solid;">🎵 Master</a>` : ''}
          ${p.artworkUrl ? `<a href="${esc(p.artworkUrl)}" target="_blank" title="Xem Artwork" style="border-bottom:1px solid;">🖼 Artwork</a>` : ''}
          <a href="/listen/${encodeURIComponent(releaseSlug)}" target="_blank" style="border-bottom:1px solid;font-weight:bold;">SmartLink ↗</a>
        </div>
        <div>
          ${p.id ? (
            isTakedownRequested
              ? `<span style="font-size:11px;color:#d9534f;font-weight:bold;">⏳ Đang chờ duyệt gỡ</span>`
              : `<button class="button alt remove" type="button" data-request-takedown="${esc(p.id)}" style="padding:6px 10px;font-size:10px;">Yêu cầu gỡ bài</button>`
          ) : ''}
        </div>
      </div>
    `;
  }).join('');

  // Attach takedown request events
  list.querySelectorAll('[data-request-takedown]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const releaseId = e.target.dataset.requestTakedown;
      if (!confirm('Bạn có chắc chắn muốn gửi yêu cầu gỡ / xóa bản phát hành này tới Admin của UniFLOWs?')) return;

      btn.disabled = true;
      btn.textContent = 'Đang gửi...';

      if (isSupabaseConfigured()) {
        const { error: updateErr } = await supabase
          .from('releases')
          .update({ submission_status: 'Yêu cầu gỡ / xóa bản phát hành' })
          .eq('id', releaseId);

        if (updateErr) {
          alert('Lỗi: ' + updateErr.message);
          btn.disabled = false;
          btn.textContent = 'Yêu cầu gỡ bài';
          return;
        }
      }

      const item = (artist.products || []).find(p => p.id === releaseId);
      if (item) item.submissionStatus = 'Yêu cầu gỡ / xóa bản phát hành';
      await saveData(data);

      showNotice('✓ Đã gửi yêu cầu gỡ / xóa bản phát hành tới Admin thành công!');
      await renderReleases();
    });
  });
}

async function renderReleases() {
  let allRawReleases = [];

  if (isSupabaseConfigured()) {
    try {
      const { data: dbReleases, error } = await supabase
        .from('releases')
        .select('*, artists(name)')
        .order('created_at', { ascending: false });

      if (!error && dbReleases) {
        allRawReleases = dbReleases;
      }
    } catch (e) {
      console.warn('Lỗi tải releases từ Supabase:', e);
    }
  }

  // Fallback to cached local releases across artists if empty
  if (allRawReleases.length === 0) {
    (data.artists || []).forEach(art => {
      (art.products || []).forEach(p => {
        allRawReleases.push({
          ...p,
          artist_id: art.id,
          artists: { name: art.name }
        });
      });
    });
  }

  // Filter releases that the current artist participates in (as primary artist or in splits)
  const participatingReleases = [];
  let totalUserCalculatedRevenue = 0;
  let totalUserCalculatedStreams = 0;

  allRawReleases.forEach(r => {
    const meta = (typeof r.metadata === 'object' && r.metadata) ? r.metadata : {};
    const splits = Array.isArray(meta.splits) ? meta.splits : [];
    
    let isParticipant = false;
    let percentage = 0;
    let role = 'Nghệ sĩ';

    const isPrimaryArtist = r.artist_id === currentArtistId;

    if (isPrimaryArtist) {
      isParticipant = true;
      if (splits.length > 0) {
        const mySplit = splits.find(s => s.artistId === currentArtistId);
        percentage = mySplit ? (parseFloat(mySplit.percentage) || 0) : 100;
        role = mySplit?.role || 'Nghệ sĩ chính';
      } else {
        percentage = 100;
        role = 'Nghệ sĩ chính';
      }
    } else if (splits.length > 0) {
      const mySplit = splits.find(s => s.artistId === currentArtistId || (s.artistName && s.artistName.toLowerCase() === artist.name.toLowerCase()));
      if (mySplit && (parseFloat(mySplit.percentage) || 0) > 0) {
        isParticipant = true;
        percentage = parseFloat(mySplit.percentage) || 0;
        role = mySplit.role || (artist.roleType === 'partner' ? 'Đối tác' : 'Collab / Feat');
      }
    }

    if (isParticipant) {
      const rawStreams = parseInt(String(meta.streams || r.streams || '0').replace(/[^0-9]/g, ''), 10) || 0;
      const rawRevenue = parseInt(String(meta.revenue || r.revenue || '0').replace(/[^0-9]/g, ''), 10) || 0;

      const userStreams = Math.round(rawStreams * (percentage / 100));
      const userRevenue = Math.round(rawRevenue * (percentage / 100));

      totalUserCalculatedRevenue += userRevenue;
      totalUserCalculatedStreams += userStreams;

      participatingReleases.push({
        id: r.id,
        title: r.title,
        type: r.type || 'Single',
        slug: r.slug,
        primaryArtistName: r.artists?.name || r.artist_id,
        submissionStatus: r.submission_status || r.submissionStatus || 'Đã phát hành',
        audioUrl: r.audio_url || r.audioUrl,
        artworkUrl: r.artwork_url || r.artworkUrl,
        links: r.links || {},
        totalStreams: rawStreams,
        totalRevenue: rawRevenue,
        userStreams: userStreams,
        userRevenue: userRevenue,
        percentage: percentage,
        userRole: role,
        isSplit: percentage < 100 || !isPrimaryArtist,
        playlists: Array.isArray(meta.playlists) ? meta.playlists : []
      });
    }
  });

  cachedFetchedReleases = participatingReleases;

  // Update Overview stats for Collab / Partner automatically
  if (artist.roleType === 'partner' || artist.roleType === 'collab' || artist.roleType === 'producer') {
    if (monthlyStreamsEl && totalUserCalculatedStreams > 0) {
      monthlyStreamsEl.textContent = totalUserCalculatedStreams.toLocaleString('vi-VN');
    }
    if (estimatedRevenueEl && totalUserCalculatedRevenue > 0) {
      estimatedRevenueEl.textContent = `₫ ${totalUserCalculatedRevenue.toLocaleString('vi-VN')}`;
    }
  }

  const pending = participatingReleases.filter(r => r.submissionStatus?.includes('chờ') || r.submissionStatus?.includes('Duyệt') || r.submissionStatus?.includes('gỡ')).length;
  if (pendingCountEl) pendingCountEl.textContent = String(pending).padStart(2, '0');

  // Render filter items
  renderReleaseListItems();

  // 2. Render Track Earnings Breakdown table with Split percentage
  const trackEarningsList = document.querySelector('#track-earnings-list');
  if (trackEarningsList) {
    if (participatingReleases.length === 0) {
      trackEarningsList.innerHTML = '<p class="empty" style="font-size:13px;padding:12px;background:#fff;border:1px solid var(--line);">Chưa có dữ liệu doanh thu chi tiết từ các tác phẩm.</p>';
    } else {
      trackEarningsList.innerHTML = `
        <div style="border:1px solid var(--line);background:#fff;overflow:hidden;">
          <div style="display:grid;grid-template-columns:2fr 1fr 1.2fr 1fr 1.2fr;background:#f5f5f5;padding:10px 14px;font-weight:bold;font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--line);">
            <span>Tên bản phát hành</span>
            <span>Lượt Streams</span>
            <span>Tổng doanh thu</span>
            <span>Tỷ lệ Split</span>
            <span>Thực nhận</span>
          </div>
          ${participatingReleases.map(p => `
            <div style="display:grid;grid-template-columns:2fr 1fr 1.2fr 1fr 1.2fr;padding:12px 14px;border-top:1px solid var(--line);font-size:13px;align-items:center;">
              <div>
                <strong>${esc(p.title)}</strong>
                <span style="display:block;font-size:11px;opacity:0.7;">${esc(p.primaryArtistName)} · ${esc(p.userRole)}</span>
              </div>
              <span>${p.totalStreams.toLocaleString('vi-VN')}</span>
              <span style="opacity:0.8;">₫ ${p.totalRevenue.toLocaleString('vi-VN')}</span>
              <b style="color:#2563eb;">${p.percentage}%</b>
              <b style="color:#137333;">₫ ${p.userRevenue.toLocaleString('vi-VN')}</b>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  // 3. Render Playlists Showcase
  const playlistShowcase = document.querySelector('#artist-playlists-showcase');
  if (playlistShowcase) {
    const allPlaylists = [];
    participatingReleases.forEach(p => {
      (p.playlists || []).forEach(pl => {
        allPlaylists.push({ track: p.title, playlist: pl });
      });
    });

    if (allPlaylists.length === 0) {
      playlistShowcase.innerHTML = '<p class="empty" style="font-size:13px;padding:12px;background:#fff;border:1px solid var(--line);">Chưa có playlist biên tập ghi nhận trong kỳ này.</p>';
    } else {
      playlistShowcase.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));gap:12px;">
          ${allPlaylists.map(item => `
            <div style="background:#fff;border:1px solid #fed7aa;padding:14px;border-radius:4px;">
              <div style="font-size:10px;color:#c2410c;font-weight:bold;text-transform:uppercase;margin-bottom:4px;">🌟 Editorial Playlist</div>
              <div style="font-weight:bold;font-size:15px;margin-bottom:4px;">${esc(item.playlist)}</div>
              <div style="font-size:12px;opacity:0.8;">Bản phát hành: <em>${esc(item.track)}</em></div>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  // 4. Update Summary Stats & Platform Breakdown with real %
  const spRev = parseInt(String(artist.spotifyRevenue || '0').replace(/[^0-9]/g, ''), 10) || 0;
  const apRev = parseInt(String(artist.appleRevenue || '0').replace(/[^0-9]/g, ''), 10) || 0;
  const ytRev = parseInt(String(artist.youtubeRevenue || '0').replace(/[^0-9]/g, ''), 10) || 0;
  const otRev = parseInt(String(artist.otherRevenue || '0').replace(/[^0-9]/g, ''), 10) || 0;

  const spStreams = parseInt(String(artist.spotifyStreams || '0').replace(/[^0-9]/g, ''), 10) || 0;
  const apStreams = parseInt(String(artist.appleStreams || '0').replace(/[^0-9]/g, ''), 10) || 0;
  const ytStreams = parseInt(String(artist.youtubeStreams || '0').replace(/[^0-9]/g, ''), 10) || 0;
  const otStreams = parseInt(String(artist.otherStreams || '0').replace(/[^0-9]/g, ''), 10) || 0;

  const totalDspRev = spRev + apRev + ytRev + otRev;
  const totalDspStreams = spStreams + apStreams + ytStreams + otStreams;

  // Track-based totals as fallback
  let totalTrackRevenue = 0;
  let totalTrackStreams = 0;
  participatingReleases.forEach(r => {
    totalTrackRevenue += (r.userRevenue || 0);
    totalTrackStreams += (r.userStreams || 0);
  });

  const finalRevNum = (artist.roleType === 'partner' || artist.roleType === 'collab' || artist.roleType === 'producer')
    ? (totalTrackRevenue > 0 ? totalTrackRevenue : (parseInt(String(artist.estimatedRevenue || '0').replace(/[^0-9]/g, ''), 10) || 0))
    : (totalDspRev > 0 ? totalDspRev : (totalTrackRevenue > 0 ? totalTrackRevenue : (parseInt(String(artist.estimatedRevenue || '0').replace(/[^0-9]/g, ''), 10) || 0)));

  const finalStreamsNum = (artist.roleType === 'partner' || artist.roleType === 'collab' || artist.roleType === 'producer')
    ? (totalTrackStreams > 0 ? totalTrackStreams : (parseInt(String(artist.monthlyStreams || '0').replace(/[^0-9]/g, ''), 10) || 0))
    : (totalDspStreams > 0 ? totalDspStreams : (totalTrackStreams > 0 ? totalTrackStreams : (parseInt(String(artist.monthlyStreams || '0').replace(/[^0-9]/g, ''), 10) || 0)));

  const displayRevenue = (artist.estimatedRevenue && artist.estimatedRevenue !== '0' && totalDspRev === 0 && artist.roleType !== 'partner' && artist.roleType !== 'collab')
    ? artist.estimatedRevenue
    : (finalRevNum > 0 ? finalRevNum.toLocaleString('vi-VN') : '0');

  const displayStreams = (artist.monthlyStreams && artist.monthlyStreams !== '0' && totalDspStreams === 0 && artist.roleType !== 'partner' && artist.roleType !== 'collab')
    ? artist.monthlyStreams
    : (finalStreamsNum > 0 ? finalStreamsNum.toLocaleString('vi-VN') : '0');

  if (monthlyStreamsEl) monthlyStreamsEl.textContent = displayStreams;
  if (estimatedRevenueEl) estimatedRevenueEl.textContent = `₫ ${displayRevenue}`;

  // Calculate percentage between platforms
  const denom = totalDspRev > 0 ? totalDspRev : (finalRevNum > 0 ? finalRevNum : 1);
  const spPct = totalDspRev > 0 ? Math.round((spRev / denom) * 100) : 55;
  const apPct = totalDspRev > 0 ? Math.round((apRev / denom) * 100) : 25;
  const ytPct = totalDspRev > 0 ? Math.round((ytRev / denom) * 100) : 15;
  const otPct = totalDspRev > 0 ? Math.max(0, 100 - spPct - apPct - ytPct) : 5;

  const platformsList = [
    { id: 'earn-spotify', ovId: 'overview-spotify', name: 'Spotify', rev: (totalDspRev > 0 ? spRev : Math.round(finalRevNum * 0.55)), pct: spPct },
    { id: 'earn-apple', ovId: 'overview-apple', name: 'Apple Music', rev: (totalDspRev > 0 ? apRev : Math.round(finalRevNum * 0.25)), pct: apPct },
    { id: 'earn-youtube', ovId: 'overview-youtube', name: 'YouTube Music', rev: (totalDspRev > 0 ? ytRev : Math.round(finalRevNum * 0.15)), pct: ytPct },
    { id: 'earn-other', ovId: 'overview-other', name: 'NCT / Zing / khác', rev: (totalDspRev > 0 ? otRev : Math.round(finalRevNum * 0.05)), pct: otPct }
  ];

  const maxPct = Math.max(...platformsList.map(p => p.pct));

  platformsList.forEach(p => {
    const isTop = (p.pct === maxPct && maxPct > 0);
    const htmlContent = `₫ ${p.rev.toLocaleString('vi-VN')} <small style="display:block;font-size:11px;color:${isTop ? '#b45309' : 'inherit'};font-weight:${isTop ? 'bold' : 'normal'};margin-top:4px;">${p.pct}% thị phần ${isTop ? '🔥 (Dẫn đầu)' : ''}</small>`;
    
    const el = document.querySelector(`#${p.id}`);
    if (el) el.innerHTML = htmlContent;

    const ovEl = document.querySelector(`#${p.ovId}`);
    if (ovEl) ovEl.innerHTML = htmlContent;
  });

  // Insights Geography & Top Sources
  const topCountryEl = document.querySelector('#insight-top-country');
  const topCityEl = document.querySelector('#insight-top-city');
  const topSourceEl = document.querySelector('#insight-top-source');

  if (topCountryEl) topCountryEl.textContent = artist.topCountry || 'Việt Nam';
  if (topCityEl) topCityEl.textContent = artist.topCity || 'Hồ Chí Minh';
  if (topSourceEl) topSourceEl.textContent = artist.topSource || 'DSP Editorial & Algorithmic';

  // Dynamic Chart Heights
  const chartEl = document.querySelector('.chart-placeholder');
  if (chartEl) {
    chartEl.innerHTML = `
      <i style="--h:${Math.max(15, spPct)}%" title="Spotify: ${spPct}%"></i>
      <i style="--h:${Math.max(20, spPct - 5)}%"></i>
      <i style="--h:${Math.max(10, apPct)}%" title="Apple Music: ${apPct}%"></i>
      <i style="--h:${Math.max(15, apPct + 5)}%"></i>
      <i style="--h:${Math.max(10, ytPct)}%" title="YouTube Music: ${ytPct}%"></i>
      <i style="--h:${Math.max(12, ytPct + 8)}%"></i>
      <i style="--h:${Math.max(8, otPct)}%" title="Zing/NCT/Khác: ${otPct}%"></i>
      <i style="--h:${Math.max(10, otPct + 4)}%"></i>
      <i style="--h:${Math.max(25, spPct + 10)}%"></i>
      <i style="--h:${Math.max(20, spPct + 5)}%"></i>
      <i style="--h:${Math.max(30, spPct + 15)}%"></i>
      <i style="--h:${Math.max(35, spPct + 20)}%"></i>
    `;
  }
}

// ----------------------------------------------------
// FORM SUBMISSION (WITH DIRECT ARTWORK URL OPTION)
// ----------------------------------------------------
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Đang gửi...';
  notice.style.display = 'none';

  try {
    const formData = new FormData(form);
    const v = Object.fromEntries(formData);
    const audioFile = audioFileInput?.files[0];
    const artworkFile = artworkFileInput?.files[0];

    let audioUrl = '';
    let artworkUrl = '';

    // 1. Upload Master Audio hoặc dùng Link ngoài (Google Drive/Dropbox)
    if (audioFile) {
      submitBtn.textContent = 'Đang tải Audio...';
      audioUrl = await uploadAudioFile(audioFile, `${artist.id}_${slug(v.title)}`);
    } else if (v.audioExternalUrl && v.audioExternalUrl.trim()) {
      audioUrl = v.audioExternalUrl.trim();
    }

    // 2. Upload Artwork hoặc dùng Link ngoài (URL ảnh trực tiếp)
    if (artworkFile) {
      submitBtn.textContent = 'Đang tải Artwork...';
      artworkUrl = await uploadArtworkFile(artworkFile, `${artist.id}_${slug(v.title)}_art`);
    } else if (v.artworkExternalUrl && v.artworkExternalUrl.trim()) {
      artworkUrl = v.artworkExternalUrl.trim();
    }

    const releaseSlug = slug(v.title);
    const releaseTypeFormatted = `${v.type} · ${v.releaseDate}`;

    // 3. Parse tracklist
    const parsedTracks = (v.tracks || '').split('\n').filter(Boolean).map(line => {
      const [trackTitle, isrc, version] = line.split('|').map(s => s.trim());
      return { trackTitle, isrc: isrc || '', version: version || 'Original' };
    });

    const links = {};
    if (v.linkSpotify) links.spotify = v.linkSpotify.trim();
    if (v.linkApple) links.apple = v.linkApple.trim();
    if (v.linkYoutube) links.youtube = v.linkYoutube.trim();
    if (v.linkZing) links.zingmp3 = v.linkZing.trim();

    const newReleaseObj = {
      title: v.title,
      type: releaseTypeFormatted,
      slug: releaseSlug,
      links,
      submissionStatus: 'Đang chờ UniFLOWs duyệt',
      credits: {
        primaryArtist: v.primaryArtist,
        featuredArtist: v.featuredArtist,
        songwriters: v.songwriters,
        producers: v.producers,
        phonogram: v.phonogram,
        copyright: v.copyright
      },
      metadata: v,
      audioUrl,
      artworkUrl
    };

    // 4. Lưu vào Database
    if (isSupabaseConfigured()) {
      submitBtn.textContent = 'Đang lưu dữ liệu...';
      const { data: inserted, error: dbError } = await supabase.from('releases').insert({
        artist_id: artist.id,
        title: v.title,
        type: releaseTypeFormatted,
        release_date: v.releaseDate,
        pre_save_date: v.preSaveDate || null,
        slug: releaseSlug,
        genre: v.genre,
        language: v.language,
        explicit: v.explicit === 'true',
        upc: v.upc,
        tracks: parsedTracks,
        primary_artist: v.primaryArtist,
        featured_artist: v.featuredArtist,
        songwriters: v.songwriters,
        producers: v.producers,
        phonogram: v.phonogram,
        copyright: v.copyright,
        territories: v.territories,
        pricing: v.pricing,
        notes: v.notes,
        submission_status: 'Đang chờ UniFLOWs duyệt',
        audio_url: audioUrl,
        artwork_url: artworkUrl,
        links,
        metadata: v
      }).select().single();

      if (dbError) throw dbError;
      if (inserted) newReleaseObj.id = inserted.id;
    }

    // 5. Cập nhật state local
    artist.products = artist.products || [];
    artist.products.unshift(newReleaseObj);
    await saveData(data);

    form.reset();
    if (audioFilename) audioFilename.textContent = 'Thả hoặc chọn file master WAV/FLAC vào đây';
    if (artworkFilename) artworkFilename.textContent = 'Artwork 3000 × 3000 px';
    if (primaryArtistInput) primaryArtistInput.value = artist.name;

    releaseDialog?.close();
    showNotice(`✓ Đã gửi bản phát hành "${v.title}" thành công. Đang chờ UniFLOWs duyệt!`);
    await renderReleases();
    switchTab('tab-releases');
  } catch (err) {
    console.error(err);
    showNotice('Lỗi khi gửi phát hành: ' + (err.message || 'Không xác định'), true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Gửi bản phát hành tới UniFLOWs';
  }
});

// ----------------------------------------------------
// PAYOUT DIALOG & HISTORY LOGIC
// ----------------------------------------------------
const payoutDialog = document.querySelector('#payout-dialog');
const closePayoutDialogBtn = document.querySelector('#close-payout-dialog-btn');
const payoutRequestForm = document.querySelector('#payout-request-form');
const payoutDialogNotice = document.querySelector('#payout-dialog-notice');
const submitPayoutBtn = document.querySelector('#submit-payout-btn');
const artistPendingPayoutEl = document.querySelector('#artist-pending-payout');
const dialogAvailableBalanceEl = document.querySelector('#dialog-available-balance');
const payoutHistoryList = document.querySelector('#payout-history-list');

let artistPayoutRequests = [];
let availableBalanceNumber = 0;

async function loadArtistPayouts() {
  let list = [];
  try {
    const cachedPayouts = JSON.parse(localStorage.getItem('uniflows-payouts') || '[]');
    list = cachedPayouts.filter(x => x.artist_id === currentArtistId);
  } catch {}

  if (isSupabaseConfigured()) {
    try {
      const { data: dbList, error } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('artist_id', currentArtistId)
        .order('created_at', { ascending: false });

      if (!error && dbList) {
        list = dbList;
        // Merge with local storage
        try {
          const allCached = JSON.parse(localStorage.getItem('uniflows-payouts') || '[]');
          const otherCached = allCached.filter(x => x.artist_id !== currentArtistId);
          localStorage.setItem('uniflows-payouts', JSON.stringify([...list, ...otherCached]));
        } catch {}
      }
    } catch (err) {
      console.warn('Lỗi tải lịch sử payout từ Supabase, fallback dữ liệu cục bộ:', err);
    }
  }

  artistPayoutRequests = list;

  // Calculate pending and paid deductions
  let pendingSum = 0;
  let paidSum = 0;
  artistPayoutRequests.forEach(req => {
    const amt = parseInt(String(req.amount || 0).replace(/[^0-9]/g, ''), 10) || 0;
    if (req.status === 'Đang chờ xem xét') {
      pendingSum += amt;
    } else if (req.status === 'Đã thanh toán (Hoàn tất)' || req.status === 'Đã thanh toán') {
      paidSum += amt;
    }
  });

  const baseBalance = parseInt(String(artist.payableBalance || artist.estimatedRevenue || '0').replace(/[^0-9]/g, ''), 10) || 0;
  availableBalanceNumber = Math.max(0, baseBalance - pendingSum - paidSum);

  if (payableBalanceEl) payableBalanceEl.textContent = `₫ ${availableBalanceNumber.toLocaleString('vi-VN')}`;
  if (artistPendingPayoutEl) artistPendingPayoutEl.textContent = `₫ ${pendingSum.toLocaleString('vi-VN')}`;
  if (dialogAvailableBalanceEl) dialogAvailableBalanceEl.textContent = `₫ ${availableBalanceNumber.toLocaleString('vi-VN')}`;

  // Render Payout History Table
  if (payoutHistoryList) {
    if (artistPayoutRequests.length === 0) {
      payoutHistoryList.innerHTML = '<p class="empty" style="font-size:13px;padding:12px;background:#f9f9f9;border:1px solid var(--line);">Chưa có yêu cầu rút tiền nào được tạo.</p>';
    } else {
      payoutHistoryList.innerHTML = `
        <div style="border:1px solid var(--ink);overflow:hidden;background:#fff;margin-top:10px;">
          <div style="display:grid;grid-template-columns:110px 130px 1fr 140px;background:#f5f4f0;padding:10px 14px;font-weight:bold;font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--ink);">
            <span>Ngày yêu cầu</span>
            <span>Số tiền rút</span>
            <span>Tài khoản nhận tiền</span>
            <span>Trạng thái</span>
          </div>
          ${artistPayoutRequests.map(req => {
            const isPending = req.status === 'Đang chờ xem xét';
            const isApproved = req.status === 'Đã thanh toán (Hoàn tất)' || req.status === 'Đã thanh toán';
            const isRejected = req.status === 'Từ chối thanh toán' || req.status === 'Từ chối';
            const bank = req.bank_info || {};
            const dateStr = req.created_at ? new Date(req.created_at).toLocaleDateString('vi-VN') : 'Vừa xong';

            return `
              <div style="border-bottom:1px solid var(--line);padding:12px 14px;font-size:13px;">
                <div style="display:grid;grid-template-columns:110px 130px 1fr 140px;align-items:center;">
                  <span style="font-size:12px;opacity:0.8;">${esc(dateStr)}</span>
                  <strong style="font-size:15px;color:${isPending ? '#b45309' : (isApproved ? '#15803d' : '#cf1322')};">
                    ₫ ${parseInt(req.amount || 0).toLocaleString('vi-VN')}
                  </strong>
                  <span>
                    <b>${esc(bank.bank || 'Ngân hàng')}</b> · <span style="font-family:monospace;font-weight:bold;">${esc(bank.accountNumber || '')}</span> (${esc(bank.accountName || '')})
                  </span>
                  <span>
                    <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:bold;background:${isPending ? '#fef3c7' : (isApproved ? '#dcfce7' : '#fee2e2')};color:${isPending ? '#b45309' : (isApproved ? '#15803d' : '#cf1322')};">
                      ${isPending ? '⏳ Đang chờ xem xét' : (isApproved ? '✅ Đã thanh toán' : '❌ Bị từ chối')}
                    </span>
                  </span>
                </div>
                ${(isRejected && req.rejection_reason) ? `
                  <div style="margin-top:10px;background:#fff2f0;border:1px solid #ffccc7;padding:8px 12px;font-size:12px;color:#cf1322;border-radius:2px;">
                    <b>Lý do từ chối từ Admin:</b> ${esc(req.rejection_reason)} <br>
                    <small style="color:#666;">(Số tiền này đã được hoàn trả lại về Số dư khả dụng của bạn).</small>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  }
}

// Real-time listener for Payout Request changes
if (isSupabaseConfigured()) {
  supabase
    .channel('public:payout_requests')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payout_requests' }, () => {
      loadArtistPayouts();
    })
    .subscribe();
}

requestPayoutBtn?.addEventListener('click', () => {
  if (availableBalanceNumber < 1000000) {
    alert(`Số dư khả dụng hiện tại của bạn là ₫ ${availableBalanceNumber.toLocaleString('vi-VN')}, chưa đạt mức rút tối thiểu (₫ 1,000,000).`);
    return;
  }
  if (payoutDialogNotice) payoutDialogNotice.style.display = 'none';
  payoutRequestForm?.reset();
  const amtInput = document.querySelector('#payout-amount');
  if (amtInput) {
    amtInput.max = availableBalanceNumber;
    amtInput.value = availableBalanceNumber;
  }
  payoutDialog?.showModal();
});

quickPayoutBtn?.addEventListener('click', () => {
  requestPayoutBtn?.click();
});

closePayoutDialogBtn?.addEventListener('click', () => {
  payoutDialog?.close();
});

payoutRequestForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const amountVal = parseInt(document.querySelector('#payout-amount')?.value, 10);
  const bank = document.querySelector('#payout-bank')?.value.trim();
  const accountNumber = document.querySelector('#payout-account-number')?.value.trim();
  const accountName = document.querySelector('#payout-account-name')?.value.trim().toUpperCase();

  if (amountVal < 1000000) {
    alert('Số tiền rút tối thiểu là ₫ 1,000,000');
    return;
  }

  if (amountVal > availableBalanceNumber) {
    alert(`Số tiền yêu cầu vượt quá số dư khả dụng (₫ ${availableBalanceNumber.toLocaleString('vi-VN')})`);
    return;
  }

  if (submitPayoutBtn) {
    submitPayoutBtn.disabled = true;
    submitPayoutBtn.textContent = 'Đang gửi...';
  }

  const newPayoutItem = {
    id: 'payout-' + Date.now(),
    artist_id: currentArtistId,
    amount: String(amountVal),
    bank_info: { bank, accountNumber, accountName },
    status: 'Đang chờ xem xét',
    rejection_reason: '',
    created_at: new Date().toISOString()
  };

  try {
    if (isSupabaseConfigured()) {
      const { data: inserted, error } = await supabase.from('payout_requests').insert({
        artist_id: currentArtistId,
        amount: String(amountVal),
        bank_info: { bank, accountNumber, accountName },
        status: 'Đang chờ xem xét',
        rejection_reason: ''
      }).select().single();

      if (error) {
        console.warn('Lưu Supabase gặp lỗi, lưu local fallback:', error);
      } else if (inserted) {
        newPayoutItem.id = inserted.id;
      }
    }

    // Save to local cache
    try {
      const allCached = JSON.parse(localStorage.getItem('uniflows-payouts') || '[]');
      allCached.unshift(newPayoutItem);
      localStorage.setItem('uniflows-payouts', JSON.stringify(allCached));
    } catch {}

    payoutDialog?.close();
    showNotice(`✓ Yêu cầu rút số tiền ₫ ${amountVal.toLocaleString('vi-VN')} đã được gửi thành công tới Admin của UniFLOWs!`);
    await loadArtistPayouts();
  } catch (err) {
    if (payoutDialogNotice) {
      payoutDialogNotice.textContent = 'Lỗi: ' + (err.message || 'Không thể gửi yêu cầu.');
      payoutDialogNotice.style.display = 'block';
    }
  } finally {
    if (submitPayoutBtn) {
      submitPayoutBtn.disabled = false;
      submitPayoutBtn.textContent = 'Gửi yêu cầu rút tiền';
    }
  }
});

// Logout handler
logoutBtn?.addEventListener('click', async () => {
  if (isSupabaseConfigured()) {
    await supabase.auth.signOut();
  }
  sessionStorage.removeItem('uniflows-artist');
  sessionStorage.removeItem('uniflows-artist-id');
  sessionStorage.removeItem('uniflows-artist-email');
  location.href = 'artist-login';
});

// Change Password Dialog & Submission Handlers
const openPasswordDialogBtn = document.querySelector('#open-password-dialog-btn');
const passwordDialog = document.querySelector('#password-dialog');
const closePasswordDialogBtn = document.querySelector('#close-password-dialog-btn');
const changePasswordForm = document.querySelector('#change-password-form');
const passwordNotice = document.querySelector('#password-notice');
const savePasswordSubmitBtn = document.querySelector('#save-password-submit-btn');

openPasswordDialogBtn?.addEventListener('click', () => {
  if (passwordNotice) passwordNotice.style.display = 'none';
  changePasswordForm?.reset();
  passwordDialog?.showModal();
});

closePasswordDialogBtn?.addEventListener('click', () => {
  passwordDialog?.close();
});

changePasswordForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newPass = document.querySelector('#new-password')?.value;
  const confirmPass = document.querySelector('#confirm-password')?.value;

  if (newPass !== confirmPass) {
    if (passwordNotice) {
      passwordNotice.textContent = 'Mật khẩu xác nhận không khớp. Vui lòng nhập lại.';
      passwordNotice.style.display = 'block';
    }
    return;
  }

  if (savePasswordSubmitBtn) {
    savePasswordSubmitBtn.disabled = true;
    savePasswordSubmitBtn.textContent = 'Đang lưu...';
  }

  try {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
    }
    alert('✓ Đổi mật khẩu thành công! Mật khẩu mới đã được cập nhật.');
    passwordDialog?.close();
    changePasswordForm.reset();
  } catch (err) {
    if (passwordNotice) {
      passwordNotice.textContent = 'Lỗi: ' + (err.message || 'Không thể đổi mật khẩu.');
      passwordNotice.style.display = 'block';
    }
  } finally {
    if (savePasswordSubmitBtn) {
      savePasswordSubmitBtn.disabled = false;
      savePasswordSubmitBtn.textContent = 'Lưu mật khẩu';
    }
  }
});

renderReleases();
loadArtistPayouts();
