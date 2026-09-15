import { getData, saveData } from './data.js';
import { supabase, isSupabaseConfigured, uploadArtworkFile, uploadAudioFile } from './supabase.js';
import { applyTranslations, getCurrentLang, setLang, t } from './i18n.js';
import { compressImageFile, uploadImageSmart, formatBytes } from './image-optimizer.js';
import './security.js';
import { initCardNav } from './card-nav.js';
import { initPortalGlassSurfaces, createGlassSurface, enhanceWithGlassSurface } from './glass-surface.js';
// Kiểm tra quyền đăng nhập
const rawAuth = sessionStorage.getItem('uniflows-artist') || localStorage.getItem('uniflows-artist');
const isArtistAuth = rawAuth === 'true' || (rawAuth && rawAuth.startsWith('{')) || !!(sessionStorage.getItem('uniflows-artist-id') || localStorage.getItem('uniflows-artist-id'));
if (!isArtistAuth) {
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
const pendingBalanceEl = document.querySelector('#artist-pending-balance');
const requestPayoutBtn = document.querySelector('#request-payout-btn');
const quickPayoutBtn = document.querySelector('#quick-open-payout-modal-btn');
const releaseDialog = document.querySelector('#release-dialog');
const openReleaseModalBtn = document.querySelector('#open-release-modal-btn');
const quickOpenReleaseModalBtn = document.querySelector('#quick-open-release-modal-btn');
const closeReleaseDialogBtn = document.querySelector('#close-release-dialog-btn');
let currentDraftId = null;
export let cachedFetchedReleases = [];
let currentReleaseFilter = 'all';
let currentSearchQuery = '';

let data = await getData();

// Auto-clean any dummy summary accounts from memory
if (Array.isArray(data.artists)) {
  data.artists = data.artists.filter(a => {
    const n = (a.name || '').toLowerCase();
    const id = (a.id || '').toLowerCase();
    return !n.includes('tổng cộng') && !n.includes('tong cong') && !n.includes('★') && !id.includes('tong-cong') && !id.includes('tongcong');
  });
}

export function openDialogSafely(dlg) {
  if (!dlg) return;
  try {
    if (!dlg.open) dlg.showModal();
  } catch (_) {
    dlg.setAttribute('open', '');
  }
}

export function closeDialogSafely(dlg) {
  if (!dlg) return;
  try {
    dlg.close();
  } catch (_) {
    dlg.removeAttribute('open');
  }
}

function removeVietnameseTonesHelper(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

function cleanAlphanumericHelper(str) {
  if (!str) return '';
  return removeVietnameseTonesHelper(str).replace(/[^a-z0-9]/g, '');
}

const sessionArtistId = sessionStorage.getItem('uniflows-artist-id') || localStorage.getItem('uniflows-artist-id') || '';
const sessionEmail = sessionStorage.getItem('uniflows-artist-email') || localStorage.getItem('uniflows-artist-email') || '';
const sessionArtistName = sessionStorage.getItem('uniflows-artist-name') || localStorage.getItem('uniflows-artist-name') || '';
const emailPrefix = sessionEmail ? sessionEmail.split('@')[0].toLowerCase() : '';

const targetId = sessionArtistId.toLowerCase().trim();
const targetEmail = sessionEmail.toLowerCase().trim();
const targetName = sessionArtistName.toLowerCase().trim();
const targetToneLess = removeVietnameseTonesHelper(sessionArtistName || sessionArtistId || emailPrefix);
const targetSlug = cleanAlphanumericHelper(sessionArtistName || sessionArtistId || emailPrefix);

// Tự động tìm nghệ sĩ thông minh (Khớp chính xác, không dấu, slug, username, email)
let artist = (data.artists || []).find(a => {
  if (!a) return false;
  const aId = (a.id || '').toLowerCase().trim();
  const aUser = (a.username || '').toLowerCase().trim();
  const aEmail = (a.email || '').toLowerCase().trim();
  const aName = (a.name || '').toLowerCase().trim();
  const aToneLess = removeVietnameseTonesHelper(a.name);
  const aSlug = cleanAlphanumericHelper(a.name || a.id || '');

  if (targetId && (aId === targetId || aUser === targetId || aSlug === targetId)) return true;
  if (targetEmail && aEmail === targetEmail) return true;
  if (emailPrefix && (aId === emailPrefix || aUser === emailPrefix || aName === emailPrefix)) return true;
  if (targetName && (aName === targetName || aToneLess === targetToneLess)) return true;
  if (targetSlug && aSlug && (aSlug === targetSlug || aId.includes(targetSlug) || targetSlug.includes(aSlug))) return true;
  return false;
});

// Fallback to sole artist in roster if only 1 exists
if (!artist && Array.isArray(data.artists) && data.artists.length === 1) {
  artist = data.artists[0];
}

if (!artist) {
  const fallbackName = sessionArtistName || (emailPrefix ? (emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)) : 'Nghệ sĩ');
  artist = {
    id: sessionArtistId || emailPrefix || 'artist',
    name: fallbackName,
    monthlyStreams: '0',
    estimatedRevenue: '0',
    payableBalance: '0',
    pendingBalance: '0',
    products: []
  };
}

// --------------------------------------------------------------------------
// DIRECT SUPABASE LIVE SYNC: Fetch real-time fresh stats directly from Supabase
// --------------------------------------------------------------------------
if (isSupabaseConfigured() && artist) {
  try {
    const { data: dbRows, error: dbErr } = await supabase
      .from('artists')
      .select('*')
      .or(`id.eq.${artist.id},name.eq.${artist.name}`)
      .limit(1);

    if (Array.isArray(dbRows) && dbRows.length > 0) {
      const live = dbRows[0];
      if (live.monthly_streams !== undefined && live.monthly_streams !== null && live.monthly_streams !== '') {
        artist.monthlyStreams = live.monthly_streams;
      }
      if (live.estimated_revenue !== undefined && live.estimated_revenue !== null && live.estimated_revenue !== '') {
        artist.estimatedRevenue = live.estimated_revenue;
      }
      if (live.payable_balance !== undefined && live.payable_balance !== null && live.payable_balance !== '') {
        artist.payableBalance = live.payable_balance;
      }
      if (live.pending_balance !== undefined && live.pending_balance !== null && live.pending_balance !== '') {
        artist.pendingBalance = live.pending_balance;
      }
      if (live.image) artist.image = live.image;
      if (live.banking) artist.banking = live.banking;
      if (live.role_type) artist.roleType = live.role_type;
    }
  } catch (liveErr) {
    console.warn('Direct live artist query from Supabase:', liveErr);
  }
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
  if (pendingBalanceEl) pendingBalanceEl.textContent = `₫ ${artist.pendingBalance || '0'}`;

  const ovPayableEl = document.querySelector('#overview-payable-balance');
  if (ovPayableEl) ovPayableEl.textContent = `₫ ${artist.payableBalance || '0'}`;

  // Avatar click triggers Photo tab
  const avatarEl = document.querySelector('#portal-artist-avatar');
  if (avatarEl && artist.image) avatarEl.src = artist.image;
  if (avatarEl) {
    avatarEl.style.cursor = 'pointer';
    avatarEl.title = 'Nhấn để xem và đổi ảnh đại diện trong Hồ sơ';
    avatarEl.addEventListener('click', () => {
      if (typeof window.openArtistProfileModal === 'function') {
        window.openArtistProfileModal('profile-tab-photo');
      } else {
        document.querySelector('#open-profile-settings-btn')?.click();
      }
    });
  }

  const sidebarNameEl = document.querySelector('#sidebar-artist-name');
  if (sidebarNameEl) sidebarNameEl.textContent = artist.name;
  const sidebarAvatarEl = document.querySelector('#sidebar-artist-avatar');
  if (sidebarAvatarEl && artist.image) sidebarAvatarEl.src = artist.image;

  // Initialize Profile dialog early
  try { initProfileSettingsDialog(); } catch (e) { console.warn('Early profile init:', e); }

  // ----------------------------------------------------
  // CARD NAV INITIALIZATION (PURE TYPOGRAPHY, NO EMOJIS)
  // ----------------------------------------------------
  const cardNavMount = document.querySelector('#portal-card-nav');
  if (cardNavMount) {
    const portalNavItems = [
      {
        label: "Tổng quan",
        title: "TỔNG QUAN & PHÂN TÍCH",
        bgColor: "#1B1722",
        textColor: "#ffffff",
        links: [
          { label: "Tổng quan Dashboard", hash: "#overview", tab: "tab-overview", ariaLabel: "Tổng quan Dashboard" },
          { label: "Thống kê Streams & Playlists", hash: "#insights", tab: "tab-insights", ariaLabel: "Thống kê Streams và Playlists" }
        ]
      },
      {
        label: "Phát hành",
        title: "PHÁT HÀNH & BẢN QUYỀN",
        bgColor: "#241e30",
        textColor: "#ffffff",
        links: [
          { label: "Danh mục Phát hành & Bài hát", hash: "#releases", tab: "tab-releases", ariaLabel: "Danh mục phát hành" },
          { label: "Lịch phát hành dự kiến", hash: "#calendar", tab: "tab-calendar", ariaLabel: "Lịch phát hành" },
          { label: "Soạn lời bài hát (.LRC)", hash: "#lyrics", tab: "tab-lyrics", ariaLabel: "Soạn lời bài hát" },
          { label: "Bảo vệ Bản quyền & A&R", hash: "#support", tab: "tab-support", ariaLabel: "Hỗ trợ bản quyền" }
        ]
      },
      {
        label: "Tài chính",
        title: "TÀI CHÍNH & TÀI KHOẢN",
        bgColor: "#2F293A",
        textColor: "#ffffff",
        links: [
          { label: "Doanh thu & Rút tiền", hash: "#earnings", tab: "tab-earnings", ariaLabel: "Doanh thu và rút tiền" },
          { label: "Hồ sơ & Cài đặt", action: "profile", onClick: () => {
              if (typeof window.openArtistProfileModal === 'function') {
                window.openArtistProfileModal('profile-tab-banking');
              } else {
                document.querySelector('#open-profile-settings-btn')?.click();
              }
            }, ariaLabel: "Hồ sơ và cài đặt" },
          { label: "Đổi mật khẩu tài khoản", action: "password", onClick: () => {
              if (typeof window.openArtistProfileModal === 'function') {
                window.openArtistProfileModal('profile-tab-security');
              } else {
                const openBtn = document.querySelector('#open-profile-settings-btn');
                if (openBtn) openBtn.click();
                setTimeout(() => {
                  document.querySelector('.profile-tab-btn[data-tab="profile-tab-security"]')?.click();
                }, 50);
              }
            }, ariaLabel: "Đổi mật khẩu" },
          { label: "Đăng xuất Nghệ sĩ", action: "logout", onClick: () => performArtistLogout(), ariaLabel: "Đăng xuất", isDanger: true }
        ]
      }
    ];

    try {
      window.cardNavInstance = await initCardNav(cardNavMount, {
        items: portalNavItems,
        baseColor: '#ffffff',
        menuColor: '#000000',
        buttonBgColor: '#111111',
        buttonTextColor: '#ffffff',
        ease: 'power3.out',
        theme: 'dark',
        artistName: artist.name || 'Nghệ sĩ',
        artistRole: artist.roleType === 'exclusive' ? 'Exclusive Artist' : 'Distribution Artist',
        onLangChange: (targetLang) => {
          setLang(targetLang);
        },
        onThemeToggle: () => {
          const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
          const nextTheme = isDark ? 'light' : 'dark';
          applyPortalTheme(nextTheme);
          localStorage.setItem('uniflows-theme', nextTheme);
          return nextTheme === 'dark';
        },
        onProfileClick: () => {
          document.querySelector('#open-profile-settings-btn')?.click();
        }
      });
    } catch (navErr) {
      console.warn('CardNav initialization warning:', navErr);
    }
  }

  // ----------------------------------------------------
  // GLASS SURFACE INITIALIZATION (LIQUID GLASS EFFECT)
  // ----------------------------------------------------
  try {
    initPortalGlassSurfaces();
  } catch (glassErr) {
    console.warn('Glass surface warning:', glassErr);
  }

  // ----------------------------------------------------
  // ARTIST WEBSITE PROFILE PHOTO CHANGE REQUEST FLOW
  // ----------------------------------------------------
  const photoModal = document.querySelector('#modal-artist-photo-request');
  const openPhotoModalBtn = document.querySelector('#btn-open-photo-request');
  const closePhotoModalBtn = document.querySelector('#close-photo-modal-btn');
  const cancelPhotoModalBtn = document.querySelector('#cancel-photo-modal-btn');
  const curPhotoImg = document.querySelector('#photo-modal-cur-img');
  const newPhotoImg = document.querySelector('#photo-modal-new-img');
  const photoFileInput = document.querySelector('#photo-modal-file-input');
  const photoUrlInput = document.querySelector('#photo-modal-url-input');
  const photoNoteInput = document.querySelector('#photo-modal-note-input');
  const submitPhotoBtn = document.querySelector('#submit-photo-req-btn');
  const photoCompressInfo = document.querySelector('#photo-modal-compress-info');
  const photoStatusMsg = document.querySelector('#photo-modal-status-msg');
  const photoReqBadge = document.querySelector('#portal-photo-req-badge');

  let selectedCompressedPhotoBlob = null;
  let selectedPhotoUrl = '';

  function checkPendingPhotoRequest() {
    let requests = [];
    try {
      requests = JSON.parse(localStorage.getItem('uniflows-artist-photo-requests') || '[]');
    } catch {}
    const myPending = requests.find(r => r.artist_id === artist.id && r.status === 'pending');
    if (myPending && photoReqBadge) {
      photoReqBadge.style.display = 'inline-block';
      photoReqBadge.title = `Đã gửi lúc: ${new Date(myPending.created_at).toLocaleString('vi-VN')}`;
    } else if (photoReqBadge) {
      photoReqBadge.style.display = 'none';
    }
  }

  if (openPhotoModalBtn && photoModal) {
    openPhotoModalBtn.addEventListener('click', () => {
      if (curPhotoImg) curPhotoImg.src = artist.image || '';
      if (newPhotoImg) newPhotoImg.src = artist.image || '';
      if (photoFileInput) photoFileInput.value = '';
      if (photoUrlInput) photoUrlInput.value = '';
      if (photoNoteInput) photoNoteInput.value = '';
      if (photoCompressInfo) photoCompressInfo.style.display = 'none';
      if (photoStatusMsg) photoStatusMsg.textContent = '';
      selectedCompressedPhotoBlob = null;
      selectedPhotoUrl = '';

      photoModal.showModal();
    });

    const closePhotoModal = () => photoModal.close();
    closePhotoModalBtn?.addEventListener('click', closePhotoModal);
    cancelPhotoModalBtn?.addEventListener('click', closePhotoModal);

    // File selection with auto-compression (square 1:1, 800x800, WebP)
    photoFileInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (photoCompressInfo) {
        photoCompressInfo.style.display = 'block';
        photoCompressInfo.textContent = 'Đang tự động nén & crop vuông 1:1 WebP...';
        photoCompressInfo.style.color = '#0284c7';
      }

      try {
        const res = await compressImageFile(file, {
          maxWidth: 800,
          maxHeight: 800,
          square: true,
          quality: 0.88,
          format: 'image/webp'
        });

        selectedCompressedPhotoBlob = res.file;
        selectedPhotoUrl = res.dataUrl;

        if (newPhotoImg) newPhotoImg.src = res.dataUrl;
        if (photoCompressInfo) {
          photoCompressInfo.style.display = 'block';
          photoCompressInfo.style.color = '#15803d';
          photoCompressInfo.innerHTML = `✓ Đã nén vuông: <b>${res.originalSizeFormatted} ➔ ${res.compressedSizeFormatted} (-${res.savedPercent}%)</b>`;
        }
      } catch (err) {
        if (photoCompressInfo) {
          photoCompressInfo.style.display = 'block';
          photoCompressInfo.style.color = '#ef4444';
          photoCompressInfo.textContent = `Lỗi nén ảnh: ${err.message}`;
        }
      }
    });

    // URL input
    photoUrlInput?.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url) {
        selectedPhotoUrl = url;
        selectedCompressedPhotoBlob = null;
        if (newPhotoImg) newPhotoImg.src = url;
        if (photoCompressInfo) photoCompressInfo.style.display = 'none';
      }
    });

    // Submit request
    submitPhotoBtn?.addEventListener('click', async () => {
      if (!selectedPhotoUrl && !selectedCompressedPhotoBlob) {
        alert('Vui lòng chọn tệp ảnh mới hoặc nhập URL ảnh xem trước.');
        return;
      }

      submitPhotoBtn.disabled = true;
      submitPhotoBtn.textContent = 'Đang tải lên & gửi duyệt...';
      if (photoStatusMsg) photoStatusMsg.textContent = 'Đang gửi yêu cầu...';

      try {
        let finalPhotoUrl = selectedPhotoUrl;
        if (selectedCompressedPhotoBlob) {
          finalPhotoUrl = await uploadImageSmart(selectedCompressedPhotoBlob, `artist_avatar_${artist.id}_${Date.now()}`);
        }

        const reqObj = {
          id: `photo_req_${Date.now()}`,
          artist_id: artist.id,
          artist_name: artist.name,
          artist_email: artist.email,
          current_image: artist.image || '',
          requested_image: finalPhotoUrl,
          note: photoNoteInput?.value.trim() || '',
          status: 'pending',
          created_at: new Date().toISOString()
        };

        // Save to localStorage
        let requests = [];
        try {
          requests = JSON.parse(localStorage.getItem('uniflows-artist-photo-requests') || '[]');
        } catch {}
        requests.unshift(reqObj);
        localStorage.setItem('uniflows-artist-photo-requests', JSON.stringify(requests));

        // Attempt save to Supabase if table exists
        if (isSupabaseConfigured()) {
          try {
            await supabase.from('artist_photo_requests').insert([reqObj]);
          } catch (dbErr) {
            console.warn('Supabase photo request table not available, stored in local sync:', dbErr);
          }
        }

        // Dispatch Admin Notification
        await dispatchAdminNotification({
          type: 'photo_request',
          title: 'Yêu cầu cập nhật ảnh đại diện Website',
          message: `Nghệ sĩ "${artist.name}" vừa gửi yêu cầu đổi ảnh đại diện mới trên website chính.`,
          artistId: artist.id,
          artistName: artist.name,
          artistAvatar: finalPhotoUrl,
          targetTab: 'admin-tab-artists',
          details: reqObj
        });

        checkPendingPhotoRequest();
        alert(`✓ Yêu cầu đổi ảnh của "${artist.name}" đã được gửi đến Admin!\n\nSau khi Admin phê duyệt, ảnh sẽ tự động xuất hiện trên Trang chủ, Trang nghệ sĩ và Trang cá nhân của bạn.`);
        photoModal.close();
      } catch (err) {
        alert(`Lỗi khi gửi yêu cầu: ${err.message}`);
      } finally {
        submitPhotoBtn.disabled = false;
        submitPhotoBtn.textContent = '🚀 Gửi Yêu Cầu Cho Admin';
        if (photoStatusMsg) photoStatusMsg.textContent = '';
      }
    });
  }

  checkPendingPhotoRequest();

  // Role Badge & Banner Setup
  const roleBadgeEl = document.querySelector('#portal-role-badge');
  const roleBannerEl = document.querySelector('#portal-role-banner');
  const welcomeDescEl = document.querySelector('#portal-welcome-desc');

  function renderRoleInfo(lang = getCurrentLang()) {
    const isEn = lang === 'en';
    const roleMapVi = {
      partner: { text: '🤝 ĐỐI TÁC CHIẾN LƯỢC (PARTNER)', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', desc: 'Bảng điều khiển đối tác: Xem số liệu thống kê & nhận doanh thu chia sẻ (Split Royalty) từ các bản phát hành có tham gia.' },
      collab: { text: '✨ NGHỆ SĨ COLLAB (FEATURED)', bg: '#fdf4ff', color: '#86198f', border: '#f0abfc', desc: 'Bảng điều khiển nghệ sĩ Collab: Theo dõi stats và doanh thu từ các tác phẩm hợp tác theo thỏa thuận Split Royalty.' },
      producer: { text: '🎛️ PRODUCER / NHẠC SĨ', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', desc: 'Bảng điều khiển Producer: Theo dõi tác quyền beat, master và doanh thu phân bổ từ các bản phát hành.' },
      manager: { text: '👔 QUẢN LÝ / ĐẠI DIỆN', bg: '#f1f5f9', color: '#334155', border: '#cbd5e1', desc: 'Bảng điều khiển quản lý: Theo dõi dòng tiền, đối soát và lịch sử phát hành của nghệ sĩ.' },
      exclusive: { text: '⭐ NGHỆ SĨ ĐỘC QUYỀN', bg: '#fef3c7', color: '#b45309', border: '#fde68a', desc: 'Hồ sơ nghệ sĩ độc quyền UniFLOWs: Toàn quyền quản lý phát hành, catalogue và đối soát tài chính.' },
      distribution: { text: '💿 NGHỆ SĨ PHÂN PHỐI', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', desc: 'Quản lý toàn bộ catalogue, phát hành âm nhạc mới, theo dõi doanh thu và đối soát DSP.' }
    };
    const roleMapEn = {
      partner: { text: '🤝 STRATEGIC PARTNER', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', desc: 'Partner Dashboard: Monitor streaming statistics and receive split royalty allocations from collaborative releases.' },
      collab: { text: '✨ COLLAB ARTIST (FEATURED)', bg: '#fdf4ff', color: '#86198f', border: '#f0abfc', desc: 'Collab Artist Dashboard: Track performance stats and split royalty revenue according to collaboration agreements.' },
      producer: { text: '🎛️ PRODUCER / SONGWRITER', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', desc: 'Producer Dashboard: Track beat licenses, master royalties, and royalty disbursements.' },
      manager: { text: '👔 MANAGER / REPRESENTATIVE', bg: '#f1f5f9', color: '#334155', border: '#cbd5e1', desc: 'Management Dashboard: Monitor cashflows, financial statements, and artist release history.' },
      exclusive: { text: '⭐ EXCLUSIVE ARTIST', bg: '#fef3c7', color: '#b45309', border: '#fde68a', desc: 'UniFLOWs Exclusive Artist Profile: Full control over music releases, catalogue, and financial settlement.' },
      distribution: { text: '💿 DISTRIBUTION ARTIST', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', desc: 'Manage your music catalogue, distribute new tracks, and track global DSP streaming performance.' }
    };
    const roleMap = isEn ? roleMapEn : roleMapVi;
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

    // Permissions: Collab restriction
    if (artist.roleType === 'collab') {
      document.querySelectorAll('.release-action-btn').forEach(btn => {
        btn.style.display = 'none';
      });
      const collabNotice = document.querySelector('#collab-release-notice');
      if (collabNotice) {
        collabNotice.style.display = 'block';
        collabNotice.innerHTML = isEn
          ? `<strong>✨ Collab Artist Permissions:</strong> You have permission to view analytics and receive split royalties from participating tracks. New release submission is managed by the <b>Primary Artist</b> or <b>Management</b>.`
          : `<strong>✨ Quyền hạn Tài khoản Nghệ sĩ Collab:</strong> Bạn có quyền xem thống kê phân tích và nhận phân bổ doanh thu (Royalty Splits) từ các bài hát có tham gia. Quyền nộp bản phát hành mới do <b>Nghệ sĩ chính (Primary Artist)</b> hoặc <b>Quản lý</b> thực hiện.`;
      }
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
  }

  renderRoleInfo(getCurrentLang());

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

  const isEn = getCurrentLang() === 'en';
  container.innerHTML = activeAnnouncements.map(ann => {
    const isImportant = ann.type === 'important';
    const isUpdate = ann.type === 'update';
    
    let badgeClass = 'notif-badge-system';
    let badgeText = isEn ? '📢 Notice' : '📢 Thông báo';
    
    if (isImportant) {
      badgeClass = 'notif-badge-release';
      badgeText = isEn ? '🔥 Urgent' : '🔥 Quan trọng';
    } else if (isUpdate) {
      badgeClass = 'notif-badge-payout';
      badgeText = isEn ? '⚡ Update' : '⚡ Cập nhật';
    }

    return `
      <div class="portal-announcement-card" style="background:var(--glass-bg-subtle);border:1px solid var(--glass-border-subtle);border-radius:14px;padding:18px;position:relative;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="notif-badge-tag ${badgeClass}">${badgeText}</span>
            <strong style="font-size:15px;color:var(--portal-text-main);font-weight:800;">${esc(ann.title)}</strong>
          </div>
          <span style="font-size:11px;color:var(--portal-text-dim);font-family:'DM Mono',monospace;">${esc(ann.date || '')}</span>
        </div>
        <p style="margin:0;font-size:13.5px;line-height:1.65;color:var(--portal-text-muted);white-space:pre-wrap;font-weight:500;">${esc(ann.content)}</p>
      </div>
    `;
  }).join('');

  // Handle Collapsed state
  const isCollapsed = localStorage.getItem('uniflows-announcements-collapsed') === 'true';
  if (isCollapsed) {
    container.style.display = 'none';
    if (toggleBtn) toggleBtn.textContent = isEn ? 'Expand ▼' : 'Mở rộng ▼';
  } else {
    container.style.display = 'grid';
    if (toggleBtn) toggleBtn.textContent = isEn ? 'Collapse ▲' : 'Thu gọn ▲';
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
  
  // Update bottom nav active state if present
  document.querySelectorAll('#portal-mobile-bottom-nav .portal-bottom-nav-item[data-tab]').forEach(b => {
    if (b.dataset.tab === tabId) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
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
    calendar: 'tab-calendar',
    lyrics: 'tab-lyrics',
    marketing: 'tab-marketing',
    support: 'tab-support'
  };
  if (hashMap[hash]) {
    switchTab(hashMap[hash]);
  }
}

window.addEventListener('hashchange', handleHash);
handleHash();

// ----------------------------------------------------
// STUDIO MULTI-STEP RELEASE BUILDER WIZARD
// ----------------------------------------------------
let wizardCurrentStep = 1;
const totalWizardSteps = 4;

const prevStepBtn = document.querySelector('#prev-step-btn');
const nextStepBtn = document.querySelector('#next-step-btn');
const submitReleaseBtn = document.querySelector('#submit-release-btn');
const stepperItems = document.querySelectorAll('.stepper-item');

function updateWizardStep(step) {
  wizardCurrentStep = Math.max(1, Math.min(totalWizardSteps, step));

  // Switch panels
  for (let i = 1; i <= totalWizardSteps; i++) {
    const panel = document.querySelector(`#step-panel-${i}`);
    if (panel) {
      if (i === wizardCurrentStep) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    }
  }

  // Update Stepper Bar
  stepperItems.forEach(item => {
    const itemStep = parseInt(item.dataset.step, 10);
    if (itemStep === wizardCurrentStep) {
      item.className = 'stepper-item active';
    } else if (itemStep < wizardCurrentStep) {
      item.className = 'stepper-item completed';
    } else {
      item.className = 'stepper-item';
    }
  });

  // Manage Nav Buttons
  if (prevStepBtn) {
    prevStepBtn.style.display = wizardCurrentStep > 1 ? 'inline-block' : 'none';
  }

  if (wizardCurrentStep === totalWizardSteps) {
    if (nextStepBtn) nextStepBtn.style.display = 'none';
    if (submitReleaseBtn) submitReleaseBtn.style.display = 'inline-block';
    updateLiveMockup();
  } else {
    if (nextStepBtn) {
      nextStepBtn.style.display = 'inline-block';
      const labels = [
        '',
        'Tiếp tục: Audio & Artwork →',
        'Tiếp tục: Tác quyền & Credits →',
        'Tiếp tục: Lịch phát hành & Review →'
      ];
      nextStepBtn.textContent = labels[wizardCurrentStep] || 'Tiếp tục →';
    }
    if (submitReleaseBtn) submitReleaseBtn.style.display = 'none';
  }
}

nextStepBtn?.addEventListener('click', () => {
  // Step 1 Validation
  if (wizardCurrentStep === 1) {
    const titleVal = document.querySelector('#wizard-title-input')?.value.trim();
    if (!titleVal) {
      alert('Vui lòng nhập Tên bản phát hành (Release Title).');
      document.querySelector('#wizard-title-input')?.focus();
      return;
    }
    const genreVal = document.querySelector('#wizard-genre-select')?.value;
    if (!genreVal) {
      alert('Vui lòng chọn Thể loại âm nhạc chính (Primary Genre).');
      document.querySelector('#wizard-genre-select')?.focus();
      return;
    }
    if (wizardTracks.length === 0) {
      addTrackItem({ title: titleVal });
    } else if (wizardTracks.length === 1 && (!wizardTracks[0].title || wizardTracks[0].title === 'Track 01')) {
      wizardTracks[0].title = titleVal;
      renderWizardTracklist();
    }
  }

  // Step 2 Validation
  if (wizardCurrentStep === 2) {
    const hasArt = artworkFileInput?.files[0] || document.querySelector('#artwork-external-url')?.value.trim();
    if (!hasArt) {
      alert('Vui lòng tải lên Ảnh bìa Artwork hoặc dán Link URL Ảnh bìa.');
      return;
    }

    if (wizardTracks.length === 0) {
      alert('Vui lòng thêm ít nhất 1 bài hát và tải file Master Audio.');
      return;
    }

    for (let i = 0; i < wizardTracks.length; i++) {
      const tr = wizardTracks[i];
      if (!tr.title || !tr.title.trim()) {
        alert(`Vui lòng nhập Tên bài hát cho Track #${i + 1}.`);
        return;
      }
      if (!tr.audioFile && !tr.audioUrl) {
        alert(`Vui lòng chọn file Master Audio hoặc dán Link Audio cho Track #${i + 1}: "${tr.title}".`);
        return;
      }
    }

    // Auto-derive global songwriters and producers from track credits if empty
    const globalSongwriters = document.querySelector('#wizard-global-songwriters');
    const globalProducers = document.querySelector('#wizard-global-producers');

    const derivedProducers = [...new Set(wizardTracks.flatMap(t => 
      (t.credits || []).filter(c => c.role && (c.role.includes('Producer') || c.role.includes('Beatmaker'))).map(c => c.name.trim()).filter(Boolean)
    ))];
    const derivedSongwriters = [...new Set(wizardTracks.flatMap(t => 
      (t.credits || []).filter(c => c.role && (c.role.includes('Songwriter') || c.role.includes('Composer') || c.role.includes('Lyricist'))).map(c => c.name.trim()).filter(Boolean)
    ))];

    if (globalSongwriters && !globalSongwriters.value.trim() && derivedSongwriters.length > 0) {
      globalSongwriters.value = derivedSongwriters.join(', ');
    }
    if (globalProducers && !globalProducers.value.trim() && derivedProducers.length > 0) {
      globalProducers.value = derivedProducers.join(', ');
    }
  }

  // Step 3 Validation
  if (wizardCurrentStep === 3) {
    const songwriters = document.querySelector('#wizard-global-songwriters')?.value.trim() || document.querySelector('[name="songwriters"]')?.value.trim();
    const producers = document.querySelector('#wizard-global-producers')?.value.trim() || document.querySelector('[name="producers"]')?.value.trim();
    if (!songwriters || !producers) {
      alert('Vui lòng điền đầy đủ thông tin Nhạc sĩ sáng tác và Nhà sản xuất âm nhạc.');
      return;
    }

    const upcChoice = document.querySelector('input[name="upc_choice"]:checked')?.value;
    if (upcChoice === 'custom') {
      const customUpc = document.querySelector('#wizard-upc-input')?.value.trim();
      if (!customUpc) {
        alert('Vui lòng nhập mã UPC cũ hoặc chọn "UniFLOWs Label cấp mã mới tự động".');
        document.querySelector('#wizard-upc-input')?.focus();
        return;
      }
    }
  }

  updateWizardStep(wizardCurrentStep + 1);
});

prevStepBtn?.addEventListener('click', () => {
  updateWizardStep(wizardCurrentStep - 1);
});

stepperItems.forEach(item => {
  item.addEventListener('click', () => {
    const targetStep = parseInt(item.dataset.step, 10);
    if (targetStep < wizardCurrentStep) {
      updateWizardStep(targetStep);
    }
  });
});

function updateLiveMockup() {
  const title = document.querySelector('#wizard-title-input')?.value.trim() || 'Tên bài hát của bạn';
  const type = document.querySelector('#wizard-type-select')?.value || 'Single';
  const feat = document.querySelector('#wizard-feat-input')?.value.trim();
  const date = document.querySelector('#wizard-date-input')?.value;
  const primaryName = artist?.name || 'Nghệ sĩ chính';

  const mockTitleEl = document.querySelector('#wizard-mock-title');
  const mockTypeEl = document.querySelector('#wizard-mock-type');
  const mockArtistEl = document.querySelector('#wizard-mock-artist');
  const mockDateEl = document.querySelector('#wizard-mock-date');

  if (mockTitleEl) mockTitleEl.textContent = title;
  if (mockTypeEl) mockTypeEl.textContent = type.toUpperCase();
  if (mockArtistEl) mockArtistEl.textContent = feat ? `${primaryName} (${feat})` : primaryName;
  if (mockDateEl) mockDateEl.textContent = date || 'Chưa chọn ngày';
}


// ====================================================
// UNIFLOWS PORTAL — DSP PLATFORMS & TERRITORIES DATA
// ====================================================

export const DISTRIBUTION_PLATFORMS = [
  {
    "id": "spotify",
    "name": "Spotify",
    "cat": "Toàn cầu",
    "color": "#1ed760",
    "icon": "spotify"
  },
  {
    "id": "applemusic",
    "name": "Apple Music & iTunes",
    "cat": "Toàn cầu",
    "color": "#fc3c44",
    "icon": "applemusic"
  },
  {
    "id": "tiktok",
    "name": "TikTok & TikTok Music",
    "cat": "Video ngắn & MXH",
    "color": "#000000",
    "icon": "tiktok"
  },
  {
    "id": "meta",
    "name": "Meta (Instagram & Facebook Reels)",
    "cat": "Video ngắn & MXH",
    "color": "#0081fb",
    "icon": "meta"
  },
  {
    "id": "ytmusic",
    "name": "YouTube Music",
    "cat": "Toàn cầu",
    "color": "#ff0000",
    "icon": "ytmusic"
  },
  {
    "id": "ytcid",
    "name": "YouTube Content ID (CID)",
    "cat": "Bảo vệ tác quyền",
    "color": "#cc0000",
    "icon": "ytcid"
  },
  {
    "id": "zingmp3",
    "name": "Zing MP3",
    "cat": "Việt Nam",
    "color": "#8b3bfe",
    "icon": "zingmp3"
  },
  {
    "id": "nhaccuatui",
    "name": "NhacCuaTui (NCT)",
    "cat": "Việt Nam",
    "color": "#0072bc",
    "icon": "nhaccuatui"
  },
  {
    "id": "amazon",
    "name": "Amazon Music",
    "cat": "Toàn cầu",
    "color": "#00a8e1",
    "icon": "amazon"
  },
  {
    "id": "tidal",
    "name": "TIDAL (Hi-Fi Master)",
    "cat": "Hi-Res Audio",
    "color": "#000000",
    "icon": "tidal"
  },
  {
    "id": "deezer",
    "name": "Deezer",
    "cat": "Toàn cầu",
    "color": "#a238ff",
    "icon": "deezer"
  },
  {
    "id": "soundcloud",
    "name": "SoundCloud",
    "cat": "Streaming & Creator",
    "color": "#ff5500",
    "icon": "soundcloud"
  },
  {
    "id": "pandora",
    "name": "Pandora",
    "cat": "Bắc Mỹ",
    "color": "#005483",
    "icon": "pandora"
  },
  {
    "id": "shazam",
    "name": "Shazam",
    "cat": "Nhận diện âm nhạc",
    "color": "#0088ff",
    "icon": "shazam"
  },
  {
    "id": "tencent",
    "name": "Tencent Music (QQ / Kugou / Kuwo)",
    "cat": "Đại lục & Châu Á",
    "color": "#12b7f5",
    "icon": "tencent"
  },
  {
    "id": "netease",
    "name": "NetEase Cloud Music",
    "cat": "Đại lục & Châu Á",
    "color": "#c20c0c",
    "icon": "netease"
  },
  {
    "id": "boomplay",
    "name": "Boomplay",
    "cat": "Châu Phi & Quốc tế",
    "color": "#f57c00",
    "icon": "boomplay"
  },
  {
    "id": "anghami",
    "name": "Anghami",
    "cat": "Trung Đông & Bắc Phi",
    "color": "#7b1fa2",
    "icon": "anghami"
  },
  {
    "id": "audiomack",
    "name": "Audiomack",
    "cat": "Hip-Hop & Quốc tế",
    "color": "#ffa000",
    "icon": "audiomack"
  },
  {
    "id": "iheart",
    "name": "iHeartRadio",
    "cat": "Bắc Mỹ & Radio",
    "color": "#c62828",
    "icon": "iheart"
  },
  {
    "id": "beatport",
    "name": "Beatport",
    "cat": "Electronic & DJ",
    "color": "#00ff80",
    "icon": "beatport"
  },
  {
    "id": "traxsource",
    "name": "Traxsource",
    "cat": "Electronic & Club",
    "color": "#1e293b",
    "icon": "traxsource"
  },
  {
    "id": "qobuz",
    "name": "Qobuz",
    "cat": "Studio Hi-Res 24-bit",
    "color": "#2563eb",
    "icon": "qobuz"
  },
  {
    "id": "joox",
    "name": "Joox Music",
    "cat": "Đông Nam Á",
    "color": "#00c853",
    "icon": "joox"
  },
  {
    "id": "linemusic",
    "name": "LINE MUSIC",
    "cat": "Nhật Bản & Đài Loan",
    "color": "#00b900",
    "icon": "linemusic"
  },
  {
    "id": "awa",
    "name": "AWA",
    "cat": "Nhật Bản",
    "color": "#ea580c",
    "icon": "awa"
  },
  {
    "id": "melon",
    "name": "Melon",
    "cat": "Hàn Quốc (K-Pop)",
    "color": "#00cd3c",
    "icon": "melon"
  },
  {
    "id": "flo",
    "name": "FLO",
    "cat": "Hàn Quốc",
    "color": "#3b82f6",
    "icon": "flo"
  },
  {
    "id": "genie",
    "name": "Genie Music",
    "cat": "Hàn Quốc (KT)",
    "color": "#0284c7",
    "icon": "genie"
  },
  {
    "id": "bugs",
    "name": "Bugs!",
    "cat": "Hàn Quốc",
    "color": "#e11d48",
    "icon": "bugs"
  },
  {
    "id": "vibe",
    "name": "VIBE (Naver)",
    "cat": "Hàn Quốc",
    "color": "#9333ea",
    "icon": "vibe"
  },
  {
    "id": "capcut",
    "name": "CapCut & Resso Sound Library",
    "cat": "Video Creator Ecosystem",
    "color": "#0f172a",
    "icon": "capcut"
  },
  {
    "id": "other100",
    "name": "Hơn 100 nền tảng đối tác toàn cầu khác",
    "cat": "Global DSP Network",
    "color": "#0f172a",
    "icon": "other100",
    "isSpecial": true
  }
];

export const WORLD_COUNTRIES = [
  {
    "code": "VN",
    "name": "Việt Nam",
    "nameEn": "Vietnam",
    "flag": "🇻🇳",
    "region": "asean"
  },
  {
    "code": "US",
    "name": "Hoa Kỳ (Mỹ)",
    "nameEn": "United States",
    "flag": "🇺🇸",
    "region": "na"
  },
  {
    "code": "GB",
    "name": "Vương quốc Anh",
    "nameEn": "United Kingdom",
    "flag": "🇬🇧",
    "region": "eu"
  },
  {
    "code": "JP",
    "name": "Nhật Bản",
    "nameEn": "Japan",
    "flag": "🇯🇵",
    "region": "asia"
  },
  {
    "code": "KR",
    "name": "Hàn Quốc",
    "nameEn": "South Korea",
    "flag": "🇰🇷",
    "region": "asia"
  },
  {
    "code": "FR",
    "name": "Pháp",
    "nameEn": "France",
    "flag": "🇫🇷",
    "region": "eu"
  },
  {
    "code": "DE",
    "name": "Đức",
    "nameEn": "Germany",
    "flag": "🇩🇪",
    "region": "eu"
  },
  {
    "code": "AU",
    "name": "Úc (Australia)",
    "nameEn": "Australia",
    "flag": "🇦🇺",
    "region": "oceania"
  },
  {
    "code": "CA",
    "name": "Canada",
    "nameEn": "Canada",
    "flag": "🇨🇦",
    "region": "na"
  },
  {
    "code": "SG",
    "name": "Singapore",
    "nameEn": "Singapore",
    "flag": "🇸🇬",
    "region": "asean"
  },
  {
    "code": "TH",
    "name": "Thái Lan",
    "nameEn": "Thailand",
    "flag": "🇹🇭",
    "region": "asean"
  },
  {
    "code": "MY",
    "name": "Malaysia",
    "nameEn": "Malaysia",
    "flag": "🇲🇾",
    "region": "asean"
  },
  {
    "code": "ID",
    "name": "Indonesia",
    "nameEn": "Indonesia",
    "flag": "🇮🇩",
    "region": "asean"
  },
  {
    "code": "PH",
    "name": "Philippines",
    "nameEn": "Philippines",
    "flag": "🇵🇭",
    "region": "asean"
  },
  {
    "code": "TW",
    "name": "Đài Loan",
    "nameEn": "Taiwan",
    "flag": "🇹🇼",
    "region": "asia"
  },
  {
    "code": "HK",
    "name": "Hồng Kông",
    "nameEn": "Hong Kong",
    "flag": "🇭🇰",
    "region": "asia"
  },
  {
    "code": "CN",
    "name": "Trung Quốc",
    "nameEn": "China",
    "flag": "🇨🇳",
    "region": "asia"
  },
  {
    "code": "IN",
    "name": "Ấn Độ",
    "nameEn": "India",
    "flag": "🇮🇳",
    "region": "asia"
  },
  {
    "code": "LA",
    "name": "Lào",
    "nameEn": "Laos",
    "flag": "🇱🇦",
    "region": "asean"
  },
  {
    "code": "KH",
    "name": "Campuchia",
    "nameEn": "Cambodia",
    "flag": "🇰🇭",
    "region": "asean"
  },
  {
    "code": "MM",
    "name": "Myanmar",
    "nameEn": "Myanmar",
    "flag": "🇲🇲",
    "region": "asean"
  },
  {
    "code": "BN",
    "name": "Brunei",
    "nameEn": "Brunei",
    "flag": "🇧🇳",
    "region": "asean"
  },
  {
    "code": "TL",
    "name": "Đông Timor",
    "nameEn": "Timor-Leste",
    "flag": "🇹🇱",
    "region": "asean"
  },
  {
    "code": "BR",
    "name": "Brazil",
    "nameEn": "Brazil",
    "flag": "🇧🇷",
    "region": "sa"
  },
  {
    "code": "MX",
    "name": "Mexico",
    "nameEn": "Mexico",
    "flag": "🇲🇽",
    "region": "na"
  },
  {
    "code": "ES",
    "name": "Tây Ban Nha",
    "nameEn": "Spain",
    "flag": "🇪🇸",
    "region": "eu"
  },
  {
    "code": "IT",
    "name": "Ý (Italy)",
    "nameEn": "Italy",
    "flag": "🇮🇹",
    "region": "eu"
  },
  {
    "code": "NL",
    "name": "Hà Lan",
    "nameEn": "Netherlands",
    "flag": "🇳🇱",
    "region": "eu"
  },
  {
    "code": "SE",
    "name": "Thụy Điển",
    "nameEn": "Sweden",
    "flag": "🇸🇪",
    "region": "eu"
  },
  {
    "code": "NO",
    "name": "Na Uy",
    "nameEn": "Norway",
    "flag": "🇳🇴",
    "region": "eu"
  },
  {
    "code": "DK",
    "name": "Đan Mạch",
    "nameEn": "Denmark",
    "flag": "🇩🇰",
    "region": "eu"
  },
  {
    "code": "FI",
    "name": "Phần Lan",
    "nameEn": "Finland",
    "flag": "🇫🇮",
    "region": "eu"
  },
  {
    "code": "CH",
    "name": "Thụy Sĩ",
    "nameEn": "Switzerland",
    "flag": "🇨🇭",
    "region": "eu"
  },
  {
    "code": "AT",
    "name": "Áo (Austria)",
    "nameEn": "Austria",
    "flag": "🇦🇹",
    "region": "eu"
  },
  {
    "code": "BE",
    "name": "Bỉ (Belgium)",
    "nameEn": "Belgium",
    "flag": "🇧🇪",
    "region": "eu"
  },
  {
    "code": "IE",
    "name": "Ireland",
    "nameEn": "Ireland",
    "flag": "🇮🇪",
    "region": "eu"
  },
  {
    "code": "NZ",
    "name": "New Zealand",
    "nameEn": "New Zealand",
    "flag": "🇳🇿",
    "region": "oceania"
  },
  {
    "code": "PL",
    "name": "Ba Lan",
    "nameEn": "Poland",
    "flag": "🇵🇱",
    "region": "eu"
  },
  {
    "code": "PT",
    "name": "Bồ Đào Nha",
    "nameEn": "Portugal",
    "flag": "🇵🇹",
    "region": "eu"
  },
  {
    "code": "CZ",
    "name": "Cộng hòa Séc",
    "nameEn": "Czech Republic",
    "flag": "🇨🇿",
    "region": "eu"
  },
  {
    "code": "HU",
    "name": "Hungary",
    "nameEn": "Hungary",
    "flag": "🇭🇺",
    "region": "eu"
  },
  {
    "code": "RO",
    "name": "Romania",
    "nameEn": "Romania",
    "flag": "🇷🇴",
    "region": "eu"
  },
  {
    "code": "GR",
    "name": "Hy Lạp",
    "nameEn": "Greece",
    "flag": "🇬🇷",
    "region": "eu"
  },
  {
    "code": "TR",
    "name": "Thổ Nhĩ Kỳ",
    "nameEn": "Turkey",
    "flag": "🇹🇷",
    "region": "eu"
  },
  {
    "code": "RU",
    "name": "Nga",
    "nameEn": "Russia",
    "flag": "🇷🇺",
    "region": "eu"
  },
  {
    "code": "UA",
    "name": "Ukraina",
    "nameEn": "Ukraine",
    "flag": "🇺🇦",
    "region": "eu"
  },
  {
    "code": "AR",
    "name": "Argentina",
    "nameEn": "Argentina",
    "flag": "🇦🇷",
    "region": "sa"
  },
  {
    "code": "CL",
    "name": "Chile",
    "nameEn": "Chile",
    "flag": "🇨🇱",
    "region": "sa"
  },
  {
    "code": "CO",
    "name": "Colombia",
    "nameEn": "Colombia",
    "flag": "🇨🇴",
    "region": "sa"
  },
  {
    "code": "PE",
    "name": "Peru",
    "nameEn": "Peru",
    "flag": "🇵🇪",
    "region": "sa"
  },
  {
    "code": "ZA",
    "name": "Nam Phi",
    "nameEn": "South Africa",
    "flag": "🇿🇦",
    "region": "africa"
  },
  {
    "code": "NG",
    "name": "Nigeria",
    "nameEn": "Nigeria",
    "flag": "🇳🇬",
    "region": "africa"
  },
  {
    "code": "EG",
    "name": "Ai Cập",
    "nameEn": "Egypt",
    "flag": "🇪🇬",
    "region": "africa"
  },
  {
    "code": "AE",
    "name": "UAE",
    "nameEn": "United Arab Emirates",
    "flag": "🇦🇪",
    "region": "me"
  },
  {
    "code": "SA",
    "name": "Ả Rập Xê Út",
    "nameEn": "Saudi Arabia",
    "flag": "🇸🇦",
    "region": "me"
  },
  {
    "code": "IL",
    "name": "Israel",
    "nameEn": "Israel",
    "flag": "🇮🇱",
    "region": "me"
  },
  {
    "code": "KZ",
    "name": "Kazakhstan",
    "nameEn": "Kazakhstan",
    "flag": "🇰🇿",
    "region": "asia"
  },
  {
    "code": "AL",
    "name": "Albania",
    "nameEn": "Albania",
    "flag": "🇦🇱",
    "region": "eu"
  },
  {
    "code": "DZ",
    "name": "Algeria",
    "nameEn": "Algeria",
    "flag": "🇩🇿",
    "region": "africa"
  },
  {
    "code": "AD",
    "name": "Andorra",
    "nameEn": "Andorra",
    "flag": "🇦🇩",
    "region": "eu"
  },
  {
    "code": "AO",
    "name": "Angola",
    "nameEn": "Angola",
    "flag": "🇦🇴",
    "region": "africa"
  },
  {
    "code": "AM",
    "name": "Armenia",
    "nameEn": "Armenia",
    "flag": "🇦🇲",
    "region": "asia"
  },
  {
    "code": "AZ",
    "name": "Azerbaijan",
    "nameEn": "Azerbaijan",
    "flag": "🇦🇿",
    "region": "asia"
  },
  {
    "code": "BS",
    "name": "Bahamas",
    "nameEn": "Bahamas",
    "flag": "🇧🇸",
    "region": "na"
  },
  {
    "code": "BH",
    "name": "Bahrain",
    "nameEn": "Bahrain",
    "flag": "🇧🇭",
    "region": "me"
  },
  {
    "code": "BD",
    "name": "Bangladesh",
    "nameEn": "Bangladesh",
    "flag": "🇧🇩",
    "region": "asia"
  },
  {
    "code": "BB",
    "name": "Barbados",
    "nameEn": "Barbados",
    "flag": "🇧🇧",
    "region": "na"
  },
  {
    "code": "BY",
    "name": "Belarus",
    "nameEn": "Belarus",
    "flag": "🇧🇾",
    "region": "eu"
  },
  {
    "code": "BZ",
    "name": "Belize",
    "nameEn": "Belize",
    "flag": "🇧🇿",
    "region": "na"
  },
  {
    "code": "BJ",
    "name": "Benin",
    "nameEn": "Benin",
    "flag": "🇧🇯",
    "region": "africa"
  },
  {
    "code": "BT",
    "name": "Bhutan",
    "nameEn": "Bhutan",
    "flag": "🇧🇹",
    "region": "asia"
  },
  {
    "code": "BO",
    "name": "Bolivia",
    "nameEn": "Bolivia",
    "flag": "🇧🇴",
    "region": "sa"
  },
  {
    "code": "BA",
    "name": "Bosnia & Herzegovina",
    "nameEn": "Bosnia and Herzegovina",
    "flag": "🇧🇦",
    "region": "eu"
  },
  {
    "code": "BW",
    "name": "Botswana",
    "nameEn": "Botswana",
    "flag": "🇧🇼",
    "region": "africa"
  },
  {
    "code": "BG",
    "name": "Bulgaria",
    "nameEn": "Bulgaria",
    "flag": "🇧🇬",
    "region": "eu"
  },
  {
    "code": "BF",
    "name": "Burkina Faso",
    "nameEn": "Burkina Faso",
    "flag": "🇧🇫",
    "region": "africa"
  },
  {
    "code": "BI",
    "name": "Burundi",
    "nameEn": "Burundi",
    "flag": "🇧🇮",
    "region": "africa"
  },
  {
    "code": "CV",
    "name": "Cabo Verde",
    "nameEn": "Cabo Verde",
    "flag": "🇨🇻",
    "region": "africa"
  },
  {
    "code": "CM",
    "name": "Cameroon",
    "nameEn": "Cameroon",
    "flag": "🇨🇲",
    "region": "africa"
  },
  {
    "code": "CF",
    "name": "Trung Phi",
    "nameEn": "Central African Republic",
    "flag": "🇨🇫",
    "region": "africa"
  },
  {
    "code": "TD",
    "name": "Chad",
    "nameEn": "Chad",
    "flag": "🇹🇩",
    "region": "africa"
  },
  {
    "code": "KM",
    "name": "Comoros",
    "nameEn": "Comoros",
    "flag": "🇰🇲",
    "region": "africa"
  },
  {
    "code": "CG",
    "name": "Congo",
    "nameEn": "Congo",
    "flag": "🇨🇬",
    "region": "africa"
  },
  {
    "code": "CD",
    "name": "DR Congo",
    "nameEn": "DR Congo",
    "flag": "🇨🇩",
    "region": "africa"
  },
  {
    "code": "CR",
    "name": "Costa Rica",
    "nameEn": "Costa Rica",
    "flag": "🇨🇷",
    "region": "na"
  },
  {
    "code": "HR",
    "name": "Croatia",
    "nameEn": "Croatia",
    "flag": "🇭🇷",
    "region": "eu"
  },
  {
    "code": "CU",
    "name": "Cuba",
    "nameEn": "Cuba",
    "flag": "🇨🇺",
    "region": "na"
  },
  {
    "code": "CY",
    "name": "Síp (Cyprus)",
    "nameEn": "Cyprus",
    "flag": "🇨🇾",
    "region": "eu"
  },
  {
    "code": "DJ",
    "name": "Djibouti",
    "nameEn": "Djibouti",
    "flag": "🇩🇯",
    "region": "africa"
  },
  {
    "code": "DM",
    "name": "Dominica",
    "nameEn": "Dominica",
    "flag": "🇩🇲",
    "region": "na"
  },
  {
    "code": "DO",
    "name": "Cộng hòa Dominica",
    "nameEn": "Dominican Republic",
    "flag": "🇩🇴",
    "region": "na"
  },
  {
    "code": "EC",
    "name": "Ecuador",
    "nameEn": "Ecuador",
    "flag": "🇪🇨",
    "region": "sa"
  },
  {
    "code": "SV",
    "name": "El Salvador",
    "nameEn": "El Salvador",
    "flag": "🇸🇻",
    "region": "na"
  },
  {
    "code": "GQ",
    "name": "Guinea Xích Đạo",
    "nameEn": "Equatorial Guinea",
    "flag": "🇬🇶",
    "region": "africa"
  },
  {
    "code": "ER",
    "name": "Eritrea",
    "nameEn": "Eritrea",
    "flag": "🇪🇷",
    "region": "africa"
  },
  {
    "code": "EE",
    "name": "Estonia",
    "nameEn": "Estonia",
    "flag": "🇪🇪",
    "region": "eu"
  },
  {
    "code": "SZ",
    "name": "Eswatini",
    "nameEn": "Eswatini",
    "flag": "🇸🇿",
    "region": "africa"
  },
  {
    "code": "ET",
    "name": "Ethiopia",
    "nameEn": "Ethiopia",
    "flag": "🇪🇹",
    "region": "africa"
  },
  {
    "code": "FJ",
    "name": "Fiji",
    "nameEn": "Fiji",
    "flag": "🇫🇯",
    "region": "oceania"
  },
  {
    "code": "GA",
    "name": "Gabon",
    "nameEn": "Gabon",
    "flag": "🇬🇦",
    "region": "africa"
  },
  {
    "code": "GM",
    "name": "Gambia",
    "nameEn": "Gambia",
    "flag": "🇬🇲",
    "region": "africa"
  },
  {
    "code": "GE",
    "name": "Georgia",
    "nameEn": "Georgia",
    "flag": "🇬🇪",
    "region": "asia"
  },
  {
    "code": "GH",
    "name": "Ghana",
    "nameEn": "Ghana",
    "flag": "🇬🇭",
    "region": "africa"
  },
  {
    "code": "GD",
    "name": "Grenada",
    "nameEn": "Grenada",
    "flag": "🇬🇩",
    "region": "na"
  },
  {
    "code": "GT",
    "name": "Guatemala",
    "nameEn": "Guatemala",
    "flag": "🇬🇹",
    "region": "na"
  },
  {
    "code": "GN",
    "name": "Guinea",
    "nameEn": "Guinea",
    "flag": "🇬🇳",
    "region": "africa"
  },
  {
    "code": "GW",
    "name": "Guinea-Bissau",
    "nameEn": "Guinea-Bissau",
    "flag": "🇬🇼",
    "region": "africa"
  },
  {
    "code": "GY",
    "name": "Guyana",
    "nameEn": "Guyana",
    "flag": "🇬🇾",
    "region": "sa"
  },
  {
    "code": "HT",
    "name": "Haiti",
    "nameEn": "Haiti",
    "flag": "🇭🇹",
    "region": "na"
  },
  {
    "code": "HN",
    "name": "Honduras",
    "nameEn": "Honduras",
    "flag": "🇭🇳",
    "region": "na"
  },
  {
    "code": "IS",
    "name": "Iceland",
    "nameEn": "Iceland",
    "flag": "🇮🇸",
    "region": "eu"
  },
  {
    "code": "IR",
    "name": "Iran",
    "nameEn": "Iran",
    "flag": "🇮🇷",
    "region": "me"
  },
  {
    "code": "IQ",
    "name": "Iraq",
    "nameEn": "Iraq",
    "flag": "🇮🇶",
    "region": "me"
  },
  {
    "code": "JM",
    "name": "Jamaica",
    "nameEn": "Jamaica",
    "flag": "🇯🇲",
    "region": "na"
  },
  {
    "code": "JO",
    "name": "Jordan",
    "nameEn": "Jordan",
    "flag": "🇯🇴",
    "region": "me"
  },
  {
    "code": "KE",
    "name": "Kenya",
    "nameEn": "Kenya",
    "flag": "🇰🇪",
    "region": "africa"
  },
  {
    "code": "KW",
    "name": "Kuwait",
    "nameEn": "Kuwait",
    "flag": "🇰🇼",
    "region": "me"
  },
  {
    "code": "KG",
    "name": "Kyrgyzstan",
    "nameEn": "Kyrgyzstan",
    "flag": "🇰🇬",
    "region": "asia"
  },
  {
    "code": "LV",
    "name": "Latvia",
    "nameEn": "Latvia",
    "flag": "🇱🇻",
    "region": "eu"
  },
  {
    "code": "LB",
    "name": "Lebanon",
    "nameEn": "Lebanon",
    "flag": "🇱🇧",
    "region": "me"
  },
  {
    "code": "LS",
    "name": "Lesotho",
    "nameEn": "Lesotho",
    "flag": "🇱🇸",
    "region": "africa"
  },
  {
    "code": "LR",
    "name": "Liberia",
    "nameEn": "Liberia",
    "flag": "🇱🇷",
    "region": "africa"
  },
  {
    "code": "LY",
    "name": "Libya",
    "nameEn": "Libya",
    "flag": "🇱🇾",
    "region": "africa"
  },
  {
    "code": "LI",
    "name": "Liechtenstein",
    "nameEn": "Liechtenstein",
    "flag": "🇱🇮",
    "region": "eu"
  },
  {
    "code": "LT",
    "name": "Lithuania",
    "nameEn": "Lithuania",
    "flag": "🇱🇹",
    "region": "eu"
  },
  {
    "code": "LU",
    "name": "Luxembourg",
    "nameEn": "Luxembourg",
    "flag": "🇱🇺",
    "region": "eu"
  },
  {
    "code": "MG",
    "name": "Madagascar",
    "nameEn": "Madagascar",
    "flag": "🇲🇬",
    "region": "africa"
  },
  {
    "code": "MW",
    "name": "Malawi",
    "nameEn": "Malawi",
    "flag": "🇲🇼",
    "region": "africa"
  },
  {
    "code": "MV",
    "name": "Maldives",
    "nameEn": "Maldives",
    "flag": "🇲🇻",
    "region": "asia"
  },
  {
    "code": "ML",
    "name": "Mali",
    "nameEn": "Mali",
    "flag": "🇲🇱",
    "region": "africa"
  },
  {
    "code": "MT",
    "name": "Malta",
    "nameEn": "Malta",
    "flag": "🇲🇹",
    "region": "eu"
  },
  {
    "code": "MR",
    "name": "Mauritania",
    "nameEn": "Mauritania",
    "flag": "🇲🇷",
    "region": "africa"
  },
  {
    "code": "MU",
    "name": "Mauritius",
    "nameEn": "Mauritius",
    "flag": "🇲🇺",
    "region": "africa"
  },
  {
    "code": "MD",
    "name": "Moldova",
    "nameEn": "Moldova",
    "flag": "🇲🇩",
    "region": "eu"
  },
  {
    "code": "MC",
    "name": "Monaco",
    "nameEn": "Monaco",
    "flag": "🇲🇨",
    "region": "eu"
  },
  {
    "code": "MN",
    "name": "Mông Cổ",
    "nameEn": "Mongolia",
    "flag": "🇲🇳",
    "region": "asia"
  },
  {
    "code": "ME",
    "name": "Montenegro",
    "nameEn": "Montenegro",
    "flag": "🇲🇪",
    "region": "eu"
  },
  {
    "code": "MA",
    "name": "Morocco",
    "nameEn": "Morocco",
    "flag": "🇲🇦",
    "region": "africa"
  },
  {
    "code": "MZ",
    "name": "Mozambique",
    "nameEn": "Mozambique",
    "flag": "🇲🇿",
    "region": "africa"
  },
  {
    "code": "NA",
    "name": "Namibia",
    "nameEn": "Namibia",
    "flag": "🇳🇦",
    "region": "africa"
  },
  {
    "code": "NP",
    "name": "Nepal",
    "nameEn": "Nepal",
    "flag": "🇳🇵",
    "region": "asia"
  },
  {
    "code": "NI",
    "name": "Nicaragua",
    "nameEn": "Nicaragua",
    "flag": "🇳🇮",
    "region": "na"
  },
  {
    "code": "NE",
    "name": "Niger",
    "nameEn": "Niger",
    "flag": "🇳🇪",
    "region": "africa"
  },
  {
    "code": "MK",
    "name": "Bắc Macedonia",
    "nameEn": "North Macedonia",
    "flag": "🇲🇰",
    "region": "eu"
  },
  {
    "code": "OM",
    "name": "Oman",
    "nameEn": "Oman",
    "flag": "🇴🇲",
    "region": "me"
  },
  {
    "code": "PK",
    "name": "Pakistan",
    "nameEn": "Pakistan",
    "flag": "🇵🇰",
    "region": "asia"
  },
  {
    "code": "PA",
    "name": "Panama",
    "nameEn": "Panama",
    "flag": "🇵🇦",
    "region": "na"
  },
  {
    "code": "PG",
    "name": "Papua New Guinea",
    "nameEn": "Papua New Guinea",
    "flag": "🇵🇬",
    "region": "oceania"
  },
  {
    "code": "PY",
    "name": "Paraguay",
    "nameEn": "Paraguay",
    "flag": "🇵🇾",
    "region": "sa"
  },
  {
    "code": "QA",
    "name": "Qatar",
    "nameEn": "Qatar",
    "flag": "🇶🇦",
    "region": "me"
  },
  {
    "code": "RW",
    "name": "Rwanda",
    "nameEn": "Rwanda",
    "flag": "🇷🇼",
    "region": "africa"
  },
  {
    "code": "SN",
    "name": "Senegal",
    "nameEn": "Senegal",
    "flag": "🇸🇳",
    "region": "africa"
  },
  {
    "code": "RS",
    "name": "Serbia",
    "nameEn": "Serbia",
    "flag": "🇷🇸",
    "region": "eu"
  },
  {
    "code": "SK",
    "name": "Slovakia",
    "nameEn": "Slovakia",
    "flag": "🇸🇰",
    "region": "eu"
  },
  {
    "code": "SI",
    "name": "Slovenia",
    "nameEn": "Slovenia",
    "flag": "🇸🇮",
    "region": "eu"
  },
  {
    "code": "LK",
    "name": "Sri Lanka",
    "nameEn": "Sri Lanka",
    "flag": "🇱🇰",
    "region": "asia"
  },
  {
    "code": "SD",
    "name": "Sudan",
    "nameEn": "Sudan",
    "flag": "🇸🇩",
    "region": "africa"
  },
  {
    "code": "SR",
    "name": "Suriname",
    "nameEn": "Suriname",
    "flag": "🇸🇷",
    "region": "sa"
  },
  {
    "code": "SY",
    "name": "Syria",
    "nameEn": "Syria",
    "flag": "🇸🇾",
    "region": "me"
  },
  {
    "code": "TJ",
    "name": "Tajikistan",
    "nameEn": "Tajikistan",
    "flag": "🇹🇯",
    "region": "asia"
  },
  {
    "code": "TZ",
    "name": "Tanzania",
    "nameEn": "Tanzania",
    "flag": "🇹🇿",
    "region": "africa"
  },
  {
    "code": "TG",
    "name": "Togo",
    "nameEn": "Togo",
    "flag": "🇹🇬",
    "region": "africa"
  },
  {
    "code": "TN",
    "name": "Tunisia",
    "nameEn": "Tunisia",
    "flag": "🇹🇳",
    "region": "africa"
  },
  {
    "code": "TM",
    "name": "Turkmenistan",
    "nameEn": "Turkmenistan",
    "flag": "🇹🇲",
    "region": "asia"
  },
  {
    "code": "UG",
    "name": "Uganda",
    "nameEn": "Uganda",
    "flag": "🇺🇬",
    "region": "africa"
  },
  {
    "code": "UY",
    "name": "Uruguay",
    "nameEn": "Uruguay",
    "flag": "🇺🇾",
    "region": "sa"
  },
  {
    "code": "UZ",
    "name": "Uzbekistan",
    "nameEn": "Uzbekistan",
    "flag": "🇺🇿",
    "region": "asia"
  },
  {
    "code": "VE",
    "name": "Venezuela",
    "nameEn": "Venezuela",
    "flag": "🇻🇪",
    "region": "sa"
  },
  {
    "code": "YE",
    "name": "Yemen",
    "nameEn": "Yemen",
    "flag": "🇾🇪",
    "region": "me"
  },
  {
    "code": "ZM",
    "name": "Zambia",
    "nameEn": "Zambia",
    "flag": "🇿🇲",
    "region": "africa"
  },
  {
    "code": "ZW",
    "name": "Zimbabwe",
    "nameEn": "Zimbabwe",
    "flag": "🇿🇼",
    "region": "africa"
  }
];

export const WORLD_LANGUAGES = [
  "Tiếng Việt",
  "Tiếng Anh (English)",
  "Tiếng Hàn (Korean)",
  "Tiếng Nhật (Japanese)",
  "Tiếng Trung - Quan Thoại (Mandarin)",
  "Tiếng Trung - Quảng Đông (Cantonese)",
  "Tiếng Pháp (French)",
  "Tiếng Tây Ban Nha (Spanish)",
  "Tiếng Đức (German)",
  "Tiếng Nga (Russian)",
  "Tiếng Bồ Đào Nha (Portuguese)",
  "Tiếng Ý (Italian)",
  "Tiếng Thái (Thai)",
  "Tiếng Indonesia (Indonesian)",
  "Tiếng Mã Lai (Malay)",
  "Tiếng Tagalog (Philippines)",
  "Tiếng Hindi (Ấn Độ)",
  "Tiếng Ả Rập (Arabic)",
  "Tiếng Thổ Nhĩ Kỳ (Turkish)",
  "Tiếng Hà Lan (Dutch)",
  "Tiếng Ba Lan (Polish)",
  "Tiếng Thụy Điển (Swedish)",
  "Tiếng Ukraina (Ukrainian)",
  "Tiếng Đan Mạch (Danish)",
  "Tiếng Na Uy (Norwegian)",
  "Tiếng Phần Lan (Finnish)",
  "Tiếng Hy Lạp (Greek)",
  "Tiếng Séc (Czech)",
  "Tiếng Hungary (Hungarian)",
  "Tiếng Romania (Romanian)",
  "Tiếng Do Thái (Hebrew)",
  "Tiếng Ba Tư (Persian / Farsi)",
  "Tiếng Bengal (Bengali)",
  "Tiếng Tamil",
  "Tiếng Urdu",
  "Không lời / Hòa tấu (Instrumental)",
  "Ngôn ngữ khác (Other Language)"
];

export function getDspSvgIcon(iconKey) {
  switch(iconKey) {
    case 'spotify':
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="#1ed760"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.623.623 0 0 1-.857.206c-2.348-1.434-5.304-1.758-8.785-.963a.624.624 0 0 1-.277-1.217c3.808-.87 7.076-.503 9.713 1.117.29.177.382.56.206.857zm1.224-2.721a.78.78 0 0 1-1.073.257c-2.687-1.652-6.784-2.13-9.964-1.164a.78.78 0 0 1-.453-1.493c3.633-1.103 8.147-.577 11.233 1.327.355.218.47.68.257 1.073zm.105-2.835C14.693 8.94 9.387 8.765 6.309 9.7a.936.936 0 0 1-.55-1.79c3.528-1.07 9.39-.868 13.148 1.363a.936.936 0 0 1-.992 1.595z"/></svg>`;
    case 'applemusic':
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="#fc3c44"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.1.65-2.77 1.43-.59.69-1.11 1.77-.97 2.82 1.08.08 2.14-.58 2.73-1.38z"/></svg>`;
    case 'tiktok':
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="#000000"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.42a6.33 6.33 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 10.79 4.49 6.31 6.31 0 0 0 1.89-4.52V9.01a8.27 8.27 0 0 0 4.84 1.56V7.12c-.35 0-.71-.14-1.07-.43z"/></svg>`;
    case 'meta':
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="#0081fb"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.65 14.65c-.75.75-1.74 1.16-2.8 1.16-1.06 0-2.05-.41-2.8-1.16L6.5 12.1a3.96 3.96 0 0 1 0-5.6 3.96 3.96 0 0 1 5.6 0l.9.9.9-.9a3.96 3.96 0 0 1 5.6 0 3.96 3.96 0 0 1 0 5.6l-2.85 2.85z"/></svg>`;
    case 'ytmusic':
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="#ff0000"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6" fill="#fff"/><polygon points="10,9 15,12 10,15" fill="#ff0000"/></svg>`;
    case 'ytcid':
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="#cc0000"><path d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4zm-2 15l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>`;
    case 'zingmp3':
      return `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#8b3bfe"/><path d="M7 8h10l-6 8h6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
    case 'nhaccuatui':
      return `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#0072bc"/><path d="M9 16V8l8 2v6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="8" cy="16" r="2" fill="#fff"/><circle cx="16" cy="16" r="2" fill="#fff"/></svg>`;
    case 'amazon':
      return `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#00a8e1"/><path d="M7 14c3.5 2 6.5 2 10 0M17 14l-2-1" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`;
    case 'tidal':
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="#000000"><rect x="3" y="10" width="4" height="4" transform="rotate(45 5 12)" fill="#000"/><rect x="8.5" y="4.5" width="4" height="4" transform="rotate(45 10.5 6.5)" fill="#000"/><rect x="8.5" y="15.5" width="4" height="4" transform="rotate(45 10.5 17.5)" fill="#000"/><rect x="14" y="10" width="4" height="4" transform="rotate(45 16 12)" fill="#000"/></svg>`;
    case 'deezer':
      return `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#a238ff"/><rect x="7" y="12" width="2" height="4" fill="#fff"/><rect x="10" y="9" width="2" height="7" fill="#fff"/><rect x="13" y="7" width="2" height="9" fill="#fff"/><rect x="16" y="10" width="2" height="6" fill="#fff"/></svg>`;
    case 'soundcloud':
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="#ff5500"><path d="M12 8c0-.6.4-1 1-1 .5 0 .9.3 1 .8.4-.5 1-.8 1.7-.8 1.4 0 2.5 1.1 2.5 2.5 0 .1 0 .2-.1.3.9.4 1.6 1.3 1.6 2.4 0 1.5-1.2 2.8-2.7 2.8H7c-2.2 0-4-1.8-4-4 0-2 1.5-3.6 3.4-3.9.4-1.8 2-3.1 3.9-3.1 1.7 0 3.1 1 3.7 2.5z"/></svg>`;
    case 'pandora':
      return `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#005483"/><path d="M9 7h4.5c2 0 3.5 1.3 3.5 3.3 0 2-1.5 3.2-3.5 3.2H11v3.5H9V7z" fill="#fff"/></svg>`;
    case 'shazam':
      return `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#0088ff"/><path d="M14.5 10.5a3.5 3.5 0 0 0-4.95-4.95l-3.5 3.5a3.5 3.5 0 1 0 4.95 4.95l.7-.7a1 1 0 0 0-1.4-1.4l-.7.7a1.5 1.5 0 1 1-2.12-2.12l3.5-3.5a1.5 1.5 0 1 1 2.12 2.12l-.7.7a1 1 0 0 0 1.4 1.4l.7-.7z" fill="#fff"/></svg>`;
    case 'beatport':
      return `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#00ff80"/><circle cx="12" cy="12" r="4" fill="#000"/><circle cx="12" cy="12" r="1.5" fill="#00ff80"/></svg>`;
    case 'qobuz':
      return `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#2563eb"/><circle cx="11" cy="11" r="4.5" stroke="#fff" stroke-width="2" fill="none"/><line x1="14" y1="14" x2="17" y2="17" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
    case 'linemusic':
      return `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#00b900"/><path d="M8 8v8l8-4z" fill="#fff"/></svg>`;
    case 'other100':
      return `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#0f172a"/><path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-1 3h2v4h4v2h-4v4h-2v-4H7v-2h4V7z" fill="#38bdf8"/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#475569"/><path d="M9 16V8l8 2v6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
  }
}

export function initDspControls() {
  const container = document.querySelector('#dsp-grid-container');
  const countEl = document.querySelector('#dsp-selected-count');
  const selectAllBtn = document.querySelector('#btn-dsp-select-all');
  const deselectAllBtn = document.querySelector('#btn-dsp-deselect-all');
  const searchInput = document.querySelector('#dsp-search-input');
  if (!container) return;

  // Render cards only if empty
  if (container.children.length === 0) {
    container.innerHTML = DISTRIBUTION_PLATFORMS.map(p => `
      <div class="dsp-card dsp-card-active selected" data-dsp-id="${p.id}" data-dsp-name="${p.name.toLowerCase()}" data-dsp-cat="${p.cat.toLowerCase()}">
      <input type="checkbox" class="dsp-checkbox" name="dsp_channels" value="${p.id}" checked>
      <div class="dsp-icon-wrap">${getDspSvgIcon(p.icon)}</div>
      <div class="dsp-info">
        <span class="dsp-title">${p.name}</span>
        <span class="dsp-cat-badge">${p.cat}</span>
      </div>
    </div>
  `).join('');
  }

  function updateCount() {
    const checked = container.querySelectorAll('.dsp-checkbox:checked').length;
    if (countEl) countEl.textContent = checked;
    const badge = document.querySelector('#dsp-selected-badge');
    if (badge) {
      if (checked === DISTRIBUTION_PLATFORMS.length) {
        badge.style.borderColor = '#10b981';
        badge.style.background = '#ecfdf5';
        badge.style.color = '#047857';
      } else if (checked === 0) {
        badge.style.borderColor = '#f87171';
        badge.style.background = '#fef2f2';
        badge.style.color = '#b91c1c';
      } else {
        badge.style.borderColor = '#cbd5e1';
        badge.style.background = '#f8fafc';
        badge.style.color = '#0f172a';
      }
    }
  }

  // Card click toggles checkbox
  container.querySelectorAll('.dsp-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.tagName.toLowerCase() === 'input') return;
      const cb = card.querySelector('.dsp-checkbox');
      if (cb) {
        cb.checked = !cb.checked;
        card.classList.toggle('dsp-card-active', cb.checked);
        updateCount();
      }
    });

    const cb = card.querySelector('.dsp-checkbox');
    if (cb) {
      cb.addEventListener('change', () => {
        card.classList.toggle('dsp-card-active', cb.checked);
        updateCount();
      });
    }
  });

  // Select all
  selectAllBtn?.addEventListener('click', () => {
    container.querySelectorAll('.dsp-card').forEach(card => {
      const cb = card.querySelector('.dsp-checkbox');
      if (cb) cb.checked = true;
      card.classList.add('dsp-card-active');
    });
    updateCount();
  });

  // Deselect all
  deselectAllBtn?.addEventListener('click', () => {
    container.querySelectorAll('.dsp-card').forEach(card => {
      const cb = card.querySelector('.dsp-checkbox');
      if (cb) cb.checked = false;
      card.classList.remove('dsp-card-active');
    });
    updateCount();
  });

  // Filter search
  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    container.querySelectorAll('.dsp-card').forEach(card => {
      const name = card.getAttribute('data-dsp-name') || '';
      const cat = card.getAttribute('data-dsp-cat') || '';
      const id = card.getAttribute('data-dsp-id') || '';
      if (!q || name.includes(q) || cat.includes(q) || id.includes(q)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  });

  updateCount();
}

export function initTerritoryControls() {
  const radioWorldwide = document.querySelector('#territory-radio-worldwide');
  const radioCustom = document.querySelector('#territory-radio-custom');
  const cardWorldwide = document.querySelector('#territory-card-worldwide');
  const cardCustom = document.querySelector('#territory-card-custom');
  const customPanel = document.querySelector('#territory-custom-panel');
  const countriesGrid = document.querySelector('#territory-countries-grid');
  const countEl = document.querySelector('#territory-selected-count');
  const searchInput = document.querySelector('#territory-search-input');

  const btnAll = document.querySelector('#btn-territory-all');
  const btnNone = document.querySelector('#btn-territory-none');
  const btnVn = document.querySelector('#btn-territory-vn-only');
  const btnAsean = document.querySelector('#btn-territory-asean');

  if (!countriesGrid) return;

  // Render countries only if empty
  if (countriesGrid.children.length === 0) {
    countriesGrid.innerHTML = WORLD_COUNTRIES.map(c => `
      <div class="country-card country-card-active selected" data-country-code="${c.code}" data-country-name="${c.name.toLowerCase()}" data-country-name-en="${c.nameEn.toLowerCase()}" data-country-region="${c.region}">
      <input type="checkbox" class="country-checkbox" name="territory_countries" value="${c.code}" checked style="accent-color:#0f172a;width:15px;height:15px;margin:0;cursor:pointer;">
      <span class="country-flag">${c.flag}</span>
      <div class="country-info">
        <span class="country-name">${c.name}</span>
        <span class="country-name-sub">${c.nameEn}</span>
      </div>
      <span class="country-code-badge">${c.code}</span>
    </div>
  `).join('');
  }

  function updateCountryCount() {
    const checked = countriesGrid.querySelectorAll('.country-checkbox:checked').length;
    if (countEl) countEl.textContent = checked;
  }

  function setMode(mode) {
    if (mode === 'worldwide') {
      if (radioWorldwide) radioWorldwide.checked = true;
      if (radioCustom) radioCustom.checked = false;
      if (cardWorldwide) {
        cardWorldwide.classList.add('selected');
        cardWorldwide.style.borderColor = '';
        cardWorldwide.style.background = '';
      }
      if (cardCustom) {
        cardCustom.classList.remove('selected');
        cardCustom.style.borderColor = '';
        cardCustom.style.background = '';
      }
      if (customPanel) customPanel.style.display = 'none';
    } else {
      if (radioWorldwide) radioWorldwide.checked = false;
      if (radioCustom) radioCustom.checked = true;
      if (cardCustom) {
        cardCustom.classList.add('selected');
        cardCustom.style.borderColor = '';
        cardCustom.style.background = '';
      }
      if (cardWorldwide) {
        cardWorldwide.classList.remove('selected');
        cardWorldwide.style.borderColor = '';
        cardWorldwide.style.background = '';
      }
      if (customPanel) customPanel.style.display = 'block';
    }
  }

  radioWorldwide?.addEventListener('change', () => setMode('worldwide'));
  radioCustom?.addEventListener('change', () => setMode('custom'));
  cardWorldwide?.addEventListener('click', () => setMode('worldwide'));
  cardCustom?.addEventListener('click', () => setMode('custom'));

  // Card click toggles checkbox
  countriesGrid.querySelectorAll('.country-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.tagName.toLowerCase() === 'input') return;
      const cb = card.querySelector('.country-checkbox');
      if (cb) {
        cb.checked = !cb.checked;
        card.classList.toggle('country-card-active', cb.checked);
        updateCountryCount();
      }
    });

    const cb = card.querySelector('.country-checkbox');
    if (cb) {
      cb.addEventListener('change', () => {
        card.classList.toggle('country-card-active', cb.checked);
        updateCountryCount();
      });
    }
  });

  // Buttons
  btnAll?.addEventListener('click', () => {
    countriesGrid.querySelectorAll('.country-card').forEach(card => {
      const cb = card.querySelector('.country-checkbox');
      if (cb) cb.checked = true;
      card.classList.add('country-card-active');
    });
    updateCountryCount();
  });

  btnNone?.addEventListener('click', () => {
    countriesGrid.querySelectorAll('.country-card').forEach(card => {
      const cb = card.querySelector('.country-checkbox');
      if (cb) cb.checked = false;
      card.classList.remove('country-card-active');
    });
    updateCountryCount();
  });

  btnVn?.addEventListener('click', () => {
    countriesGrid.querySelectorAll('.country-card').forEach(card => {
      const code = card.getAttribute('data-country-code');
      const cb = card.querySelector('.country-checkbox');
      const isVN = (code === 'VN');
      if (cb) cb.checked = isVN;
      card.classList.toggle('country-card-active', isVN);
    });
    updateCountryCount();
  });

  btnAsean?.addEventListener('click', () => {
    countriesGrid.querySelectorAll('.country-card').forEach(card => {
      const reg = card.getAttribute('data-country-region');
      const cb = card.querySelector('.country-checkbox');
      const isAsean = (reg === 'asean');
      if (cb) cb.checked = isAsean;
      card.classList.toggle('country-card-active', isAsean);
    });
    updateCountryCount();
  });

  // Search
  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    countriesGrid.querySelectorAll('.country-card').forEach(card => {
      const code = (card.getAttribute('data-country-code') || '').toLowerCase();
      const name = card.getAttribute('data-country-name') || '';
      const nameEn = card.getAttribute('data-country-name-en') || '';
      if (!q || code === q || name.includes(q) || nameEn.includes(q)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  });

  updateCountryCount();
}

export function initLanguageSearchableControls() {
  const inputEl = document.querySelector('#wizard-language-input');
  const hiddenVal = document.querySelector('#wizard-language-val');
  const dropdown = document.querySelector('#wizard-language-dropdown');
  if (!inputEl || !dropdown) return;

  function renderDropdown(filterText = '') {
    const q = filterText.trim().toLowerCase();
    const matches = WORLD_LANGUAGES.filter(lang => !q || lang.toLowerCase().includes(q));
    if (matches.length === 0) {
      dropdown.innerHTML = `<div style="padding:10px 14px;font-size:12px;color:#94a3b8;text-align:center;">Không tìm thấy ngôn ngữ phù hợp</div>`;
      return;
    }
    dropdown.innerHTML = matches.map((lang, idx) => `
      <div class="searchable-lang-item ${lang === hiddenVal?.value ? 'selected' : ''}" data-lang="${lang}" style="padding:8px 14px;font-size:13px;cursor:pointer;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;">
        <span>${lang}</span>
        ${lang === hiddenVal?.value ? '<span style="color:#0284c7;font-weight:bold;">✓</span>' : ''}
      </div>
    `).join('');

    dropdown.querySelectorAll('.searchable-lang-item').forEach(item => {
      item.addEventListener('click', () => {
        const selectedLang = item.getAttribute('data-lang');
        if (inputEl) inputEl.value = selectedLang;
        if (hiddenVal) hiddenVal.value = selectedLang;
        dropdown.style.display = 'none';
      });
    });
  }

  inputEl.addEventListener('focus', () => {
    renderDropdown(inputEl.value);
    dropdown.style.display = 'block';
  });

  inputEl.addEventListener('input', (e) => {
    renderDropdown(e.target.value);
    dropdown.style.display = 'block';
  });

  // Keyboard navigation
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdown.style.display = 'none';
    } else if (e.key === 'Enter') {
      const firstItem = dropdown.querySelector('.searchable-lang-item');
      if (firstItem) {
        e.preventDefault();
        const selectedLang = firstItem.getAttribute('data-lang');
        inputEl.value = selectedLang;
        if (hiddenVal) hiddenVal.value = selectedLang;
        dropdown.style.display = 'none';
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!inputEl.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

// Immediate eager initialization of DSP & Territory controls
try {
  initDspControls();
  initTerritoryControls();
  initLanguageSearchableControls();
} catch (e) {
  console.warn('Eager init DSP/Territories warning:', e);
}


function prepareReleaseWizard() {
  if (primaryArtistInput) primaryArtistInput.value = artist.name;
  initDspControls();
  initTerritoryControls();
  initLanguageSearchableControls();
  if (wizardTracks.length === 0) {
    addTrackItem({ title: document.querySelector('#wizard-title-input')?.value.trim() || 'Track 01' });
  }
  initExplicitControls();
  initUpcControls();

  // Reset DSPs to all checked
  document.querySelectorAll('#dsp-grid-container .dsp-card').forEach(card => {
    const cb = card.querySelector('.dsp-checkbox');
    if (cb) cb.checked = true;
    card.classList.add('dsp-card-active');
  });
  const dspCount = document.querySelector('#dsp-selected-count');
  if (dspCount) dspCount.textContent = (typeof DISTRIBUTION_PLATFORMS !== 'undefined' ? DISTRIBUTION_PLATFORMS.length : 33);
  const dspBadge = document.querySelector('#dsp-selected-badge');
  if (dspBadge) {
    dspBadge.style.borderColor = '#10b981';
    dspBadge.style.background = '#ecfdf5';
    dspBadge.style.color = '#047857';
  }

  // Reset Territory to Worldwide
  const radWorldwide = document.querySelector('#territory-radio-worldwide');
  const radCustom = document.querySelector('#territory-radio-custom');
  const cardWorldwide = document.querySelector('#territory-card-worldwide');
  const cardCustom = document.querySelector('#territory-card-custom');
  const customPanel = document.querySelector('#territory-custom-panel');
  if (radWorldwide) radWorldwide.checked = true;
  if (radCustom) radCustom.checked = false;
  if (cardWorldwide) {
    cardWorldwide.classList.add('selected');
    cardWorldwide.style.borderColor = '';
    cardWorldwide.style.background = '';
  }
  if (cardCustom) {
    cardCustom.classList.remove('selected');
    cardCustom.style.borderColor = '';
    cardCustom.style.background = '';
  }
  if (customPanel) customPanel.style.display = 'none';

  // Reset all countries to checked
  document.querySelectorAll('#territory-countries-grid .country-card').forEach(card => {
    const cb = card.querySelector('.country-checkbox');
    if (cb) cb.checked = true;
    card.classList.add('country-card-active');
  });
  const tCount = document.querySelector('#territory-selected-count');
  if (tCount) tCount.textContent = (typeof WORLD_COUNTRIES !== 'undefined' ? WORLD_COUNTRIES.length : 171);

  // Reset Language to Tiếng Việt
  const langValInput = document.querySelector('#wizard-language-val');
  const langTextInput = document.querySelector('#wizard-language-input');
  if (langValInput) langValInput.value = 'Tiếng Việt';
  if (langTextInput) langTextInput.value = 'Tiếng Việt';

  updateWizardStep(1);
}

function handleOpenReleaseModal() {
  if (artist.roleType === 'collab') {
    alert('Tài khoản Nghệ sĩ Collab không có quyền gửi bản phát hành mới. Vui lòng liên hệ Nghệ sĩ chính hoặc Admin của UniFLOWs.');
    return;
  }

  // Check if there is an active draft (local or cached from database)
  let activeDraft = null;
  const savedDraftRaw = localStorage.getItem('uniflows_release_draft_' + (artist?.id || 'artist'));
  if (savedDraftRaw) {
    try {
      activeDraft = JSON.parse(savedDraftRaw);
    } catch (e) {}
  }
  if (!activeDraft && Array.isArray(cachedFetchedReleases)) {
    const dbDraft = cachedFetchedReleases.find(r => r.submissionStatus === 'Bản nháp' || r.isDraft);
    if (dbDraft) activeDraft = dbDraft.metadata?.draftData || dbDraft;
  }

  if (activeDraft) {
    const draftTitle = activeDraft.title || 'Bản phát hành chưa đặt tên';
    if (confirm(`Bạn đang có 1 bản nháp phát hành: "${draftTitle}".\n\n- Nhấn "OK" để tiếp tục chỉnh sửa bản nháp này.\n- Nhấn "Hủy" (Cancel) để tạo bản phát hành mới từ đầu.`)) {
      restoreReleaseDraft(activeDraft);
      return;
    }
  }

  currentDraftId = null;
  prepareReleaseWizard();
  const dlg = releaseDialog || document.querySelector('#release-dialog');
  if (dlg) {
    if (!dlg.open) {
      try {
        dlg.showModal();
      } catch (e) {
        dlg.setAttribute('open', '');
      }
    }
  }
}

openReleaseModalBtn?.addEventListener('click', handleOpenReleaseModal);
quickOpenReleaseModalBtn?.addEventListener('click', handleOpenReleaseModal);

closeReleaseDialogBtn?.addEventListener('click', () => {
  releaseDialog?.close();
});

cancelReleaseBtn?.addEventListener('click', () => {
  releaseDialog?.close();
});

// ====================================================
// UNIFLOWS STUDIO — RELEASE DRAFT ENGINE
// ====================================================

export function collectReleaseDraftData() {
  const formEl = document.querySelector('#release-form');
  const titleVal = document.querySelector('#wizard-title-input')?.value.trim() || '';
  const typeVal = document.querySelector('#wizard-type-select')?.value || 'Single';
  const featVal = document.querySelector('#wizard-feat-input')?.value.trim() || '';
  const genreVal = document.querySelector('#wizard-genre-select')?.value || '';
  const secondaryGenreVal = document.querySelector('#wizard-secondary-genre-select')?.value || '';
  const langVal = document.querySelector('#wizard-language-val')?.value || formEl?.querySelector('[name="language"]')?.value || 'Tiếng Việt';
  const explicitVal = formEl?.querySelector('input[name="explicit"]:checked')?.value || 'false';
  const artworkExtUrl = document.querySelector('#artwork-external-url')?.value.trim() || '';
  const artworkPreviewSrc = document.querySelector('#wizard-art-preview')?.getAttribute('src') || '';
  const upcChoice = formEl?.querySelector('input[name="upc_choice"]:checked')?.value || 'auto';
  const upcVal = document.querySelector('#wizard-upc-input')?.value.trim() || '';

  // DSP selection
  const dspCheckboxes = document.querySelectorAll('#dsp-grid-container .dsp-checkbox:checked');
  const selectedDSPs = Array.from(dspCheckboxes).map(cb => cb.value);

  // Territory selection
  const territoryModeVal = formEl?.querySelector('input[name="territory_mode"]:checked')?.value || 'worldwide';
  const countryCheckboxes = document.querySelectorAll('#territory-countries-grid .country-checkbox:checked');
  const selectedCountries = Array.from(countryCheckboxes).map(cb => cb.value);

  let finalTerritoriesDesc = 'Toàn cầu (Worldwide - 171 Quốc gia)';
  if (territoryModeVal === 'custom') {
    finalTerritoriesDesc = `Tùy chọn (${selectedCountries.length} Quốc gia)`;
  }
  const territoriesVal = finalTerritoriesDesc;
  const pricingVal = formEl?.querySelector('[name="pricing"]')?.value || 'Standard';
  const songwritersVal = document.querySelector('#wizard-global-songwriters')?.value.trim() || formEl?.querySelector('[name="songwriters"]')?.value.trim() || '';
  const producersVal = document.querySelector('#wizard-global-producers')?.value.trim() || formEl?.querySelector('[name="producers"]')?.value.trim() || '';
  const phonogramVal = formEl?.querySelector('[name="phonogram"]')?.value.trim() || '';
  const copyrightVal = formEl?.querySelector('[name="copyright"]')?.value.trim() || '';
  const lyricsTextVal = formEl?.querySelector('[name="lyricsText"]')?.value || '';
  const lyricsLrcVal = formEl?.querySelector('[name="lyricsLrc"]')?.value || '';
  const syncConsent = formEl?.querySelector('[name="syncLicensingConsent"]')?.checked ?? true;
  const releaseDateVal = document.querySelector('#wizard-date-input')?.value || '';
  const preSaveDateVal = formEl?.querySelector('[name="preSaveDate"]')?.value || '';
  const notesVal = formEl?.querySelector('[name="notes"]')?.value || '';

  // Splits
  const splits = [];
  document.querySelectorAll('#royalty-splits-container .royalty-split-row').forEach(row => {
    const name = row.querySelector('.split-name')?.value.trim();
    const role = row.querySelector('.split-role')?.value || 'Contributor';
    const percentage = parseFloat(row.querySelector('.split-pct')?.value) || 0;
    if (name) {
      splits.push({ artistName: name, role, percentage });
    }
  });

  // Wizard tracks copy
  const tracksCopy = wizardTracks.map(t => ({
    trackNum: t.trackNum || 1,
    title: t.title || '',
    featuredArtist: t.featuredArtist || '',
    version: t.version || '',
    audioUrl: t.audioUrl || '',
    dolbyAtmosUrl: t.dolbyAtmosUrl || '',
    lyricsText: t.lyricsText || '',
    lyricsLrc: t.lyricsLrc || '',
    credits: Array.isArray(t.credits) ? JSON.parse(JSON.stringify(t.credits)) : [],
    explicit: t.explicit === true,
    isrc: t.isrc || '',
    duration: t.duration || ''
  }));

  const draftId = currentDraftId || ('draft_' + (artist?.id || 'artist') + '_' + Date.now());

  return {
    id: draftId,
    artistId: artist?.id || 'artist',
    title: titleVal,
    type: typeVal,
    featuredArtist: featVal,
    genre: genreVal,
    secondaryGenre: secondaryGenreVal,
    language: langVal,
    explicit: explicitVal,
    artworkExternalUrl: artworkExtUrl,
    artworkUrl: artworkPreviewSrc,
    upc_choice: upcChoice,
    upc: upcVal,
    territories: territoriesVal,
    selectedDSPs,
    territoryMode: territoryModeVal,
    selectedCountries,
    pricing: pricingVal,
    songwriters: songwritersVal,
    producers: producersVal,
    phonogram: phonogramVal,
    copyright: copyrightVal,
    lyricsText: lyricsTextVal,
    lyricsLrc: lyricsLrcVal,
    syncLicensingConsent: syncConsent,
    releaseDate: releaseDateVal,
    preSaveDate: preSaveDateVal,
    notes: notesVal,
    splits,
    wizardTracks: tracksCopy,
    updatedAt: new Date().toISOString()
  };
}

export async function saveReleaseDraft(isSilent = false) {
  const draftData = collectReleaseDraftData();
  currentDraftId = draftData.id;

  // 1. Lưu LocalStorage an toàn
  try {
    localStorage.setItem('uniflows_release_draft_' + (artist?.id || 'artist'), JSON.stringify(draftData));
  } catch (e) {
    console.warn('Lỗi lưu draft localStorage:', e);
  }

  // 2. Đồng bộ lên Supabase nếu có kết nối
  if (isSupabaseConfigured()) {
    try {
      const dbPayload = {
        id: draftData.id,
        artist_id: artist.id,
        title: draftData.title || 'Bản nháp chưa đặt tên',
        type: draftData.type || 'Single',
        release_date: draftData.releaseDate || null,
        pre_save_date: draftData.preSaveDate || null,
        slug: slug(draftData.title || 'draft-' + Date.now()),
        genre: draftData.genre || 'V-Pop',
        language: draftData.language || 'Tiếng Việt',
        explicit: draftData.explicit === 'true',
        upc: draftData.upc || '',
        tracks: draftData.wizardTracks || [],
        primary_artist: artist.name,
        featured_artist: draftData.featuredArtist || '',
        songwriters: draftData.songwriters || artist.name,
        producers: draftData.producers || 'UniFLOWs Label',
        phonogram: draftData.phonogram || '℗ 2026 UniFLOWs Label',
        copyright: draftData.copyright || '© 2026 UniFLOWs Label',
        territories: draftData.territories || 'Toàn cầu',
        pricing: draftData.pricing || 'Standard',
        notes: draftData.notes || '',
        submission_status: 'Bản nháp',
        artwork_url: draftData.artworkExternalUrl || draftData.artworkUrl || '',
        audio_url: draftData.wizardTracks?.[0]?.audioUrl || '',
        metadata: {
          isDraft: true,
          draftData,
          splits: draftData.splits || [],
          selectedDSPs: draftData.selectedDSPs || [],
          territoryMode: draftData.territoryMode || 'worldwide',
          selectedCountries: draftData.selectedCountries || [],
          updatedAt: draftData.updatedAt
        }
      };
      await supabase.from('releases').upsert(dbPayload);
    } catch (e) {
      console.warn('Lỗi lưu draft Supabase:', e);
    }
  }

  updateActiveDraftBanner();
  await renderReleases();

  if (!isSilent) {
    // Phản hồi trực quan trên nút bấm
    const headerBtn = document.querySelector('#btn-save-release-draft-header');
    const footerBtn = document.querySelector('#btn-save-release-draft-footer');
    if (headerBtn) {
      const origText = headerBtn.innerHTML;
      headerBtn.innerHTML = '✓ Đã Lưu Nháp!';
      headerBtn.style.background = '#15803d';
      headerBtn.style.color = '#fff';
      setTimeout(() => {
        headerBtn.innerHTML = origText;
        headerBtn.style.background = 'rgba(255,255,255,0.12)';
        headerBtn.style.color = '#fff';
      }, 2000);
    }
    if (footerBtn) {
      const origText = footerBtn.innerHTML;
      footerBtn.innerHTML = '✓ Đã Lưu Nháp!';
      footerBtn.style.background = '#15803d';
      footerBtn.style.color = '#fff';
      setTimeout(() => {
        footerBtn.innerHTML = origText;
        footerBtn.style.background = '#f8fafc';
        footerBtn.style.color = '#0f172a';
      }, 2000);
    }
    showNotice(`✓ Đã lưu bản nháp "${draftData.title || 'Chưa đặt tên'}" thành công! Dữ liệu được bảo toàn an toàn.`);
  }
}

export function normalizeDraftData(raw) {
  if (!raw) return null;
  const meta = (typeof raw.metadata === 'object' && raw.metadata) ? raw.metadata : {};
  const innerDraft = (typeof meta.draftData === 'object' && meta.draftData) ? meta.draftData : {};

  const tracks = innerDraft.wizardTracks || meta.wizardTracks || raw.tracks || raw.wizardTracks || [];
  const normalizedTracks = Array.isArray(tracks) && tracks.length > 0 
    ? tracks.map((t, idx) => ({
        trackNum: t.trackNum || (idx + 1),
        title: t.title || `Track ${String(idx + 1).padStart(2, '0')}`,
        featuredArtist: t.featuredArtist || t.featured_artist || '',
        version: t.version || 'Original Mix',
        audioUrl: t.audioUrl || t.audio_url || '',
        dolbyAtmosUrl: t.dolbyAtmosUrl || t.dolby_atmos_url || '',
        lyricsText: t.lyricsText || t.lyrics_text || '',
        lyricsLrc: t.lyricsLrc || t.lyrics_lrc || '',
        credits: Array.isArray(t.credits) ? t.credits : (typeof createDefaultCredits === 'function' ? createDefaultCredits() : []),
        explicit: t.explicit === true || t.explicit === 'true',
        isrc: t.isrc || '',
        duration: t.duration || ''
      }))
    : [{
        trackNum: 1,
        title: innerDraft.title || raw.title || 'Track 01',
        featuredArtist: innerDraft.featuredArtist || raw.featured_artist || '',
        version: 'Original Mix',
        audioUrl: innerDraft.audioUrl || raw.audio_url || '',
        dolbyAtmosUrl: '',
        lyricsText: '',
        lyricsLrc: '',
        credits: typeof createDefaultCredits === 'function' ? createDefaultCredits() : [],
        explicit: false,
        isrc: ''
      }];

  const splits = innerDraft.splits || meta.splits || raw.splits || [];

  return {
    id: raw.id || innerDraft.id || currentDraftId || ('draft_' + (artist?.id || 'artist') + '_' + Date.now()),
    artistId: raw.artistId || raw.artist_id || innerDraft.artistId || (artist?.id || 'artist'),
    title: innerDraft.title || raw.title || '',
    type: innerDraft.type || raw.type || 'Single',
    featuredArtist: innerDraft.featuredArtist || raw.featured_artist || raw.featuredArtist || '',
    genre: innerDraft.genre || raw.genre || '',
    secondaryGenre: innerDraft.secondaryGenre || raw.secondary_genre || raw.secondaryGenre || '',
    language: innerDraft.language || raw.language || 'Tiếng Việt',
    explicit: (innerDraft.explicit === true || innerDraft.explicit === 'true' || raw.explicit === true || raw.explicit === 'true'),
    artworkExternalUrl: innerDraft.artworkExternalUrl || innerDraft.artworkUrl || raw.artwork_url || raw.artworkUrl || '',
    artworkUrl: innerDraft.artworkUrl || innerDraft.artworkExternalUrl || raw.artwork_url || raw.artworkUrl || '',
    upc_choice: innerDraft.upc_choice || (raw.upc ? 'custom' : 'auto'),
    upc: innerDraft.upc || raw.upc || '',
    territories: innerDraft.territories || raw.territories || 'Toàn cầu (Worldwide - 171 Quốc gia)',
    selectedDSPs: innerDraft.selectedDSPs || meta.selectedDSPs || raw.selectedDSPs || ((typeof DISTRIBUTION_PLATFORMS !== 'undefined') ? DISTRIBUTION_PLATFORMS.map(p => p.id) : []),
    territoryMode: innerDraft.territoryMode || meta.territoryMode || raw.territoryMode || 'worldwide',
    selectedCountries: innerDraft.selectedCountries || meta.selectedCountries || raw.selectedCountries || ((typeof WORLD_COUNTRIES !== 'undefined') ? WORLD_COUNTRIES.map(c => c.code) : []),
    pricing: innerDraft.pricing || raw.pricing || 'Standard',
    songwriters: innerDraft.songwriters || raw.songwriters || (artist?.name || ''),
    producers: innerDraft.producers || raw.producers || 'UniFLOWs Label',
    phonogram: innerDraft.phonogram || raw.phonogram || '℗ 2026 UniFLOWs Label',
    copyright: innerDraft.copyright || raw.copyright || '© 2026 UniFLOWs Label',
    lyricsText: innerDraft.lyricsText || raw.lyricsText || raw.lyrics_text || '',
    lyricsLrc: innerDraft.lyricsLrc || raw.lyricsLrc || raw.lyrics_lrc || '',
    syncLicensingConsent: (innerDraft.syncLicensingConsent !== false && raw.syncLicensingConsent !== false),
    releaseDate: innerDraft.releaseDate || raw.release_date || raw.releaseDate || '',
    preSaveDate: innerDraft.preSaveDate || raw.pre_save_date || raw.preSaveDate || '',
    notes: innerDraft.notes || raw.notes || '',
    wizardTracks: normalizedTracks,
    splits: splits,
    updatedAt: innerDraft.updatedAt || raw.updated_at || raw.updatedAt || new Date().toISOString()
  };
}

export function restoreReleaseDraft(rawDraft) {
  if (!rawDraft) return;
  const draftData = normalizeDraftData(rawDraft);
  if (!draftData) return;

  try {
    currentDraftId = draftData.id || null;

    // Title
    const titleInput = document.querySelector('#wizard-title-input');
    if (titleInput) titleInput.value = draftData.title || '';

    // Type
    const typeSelect = document.querySelector('#wizard-type-select');
    if (typeSelect && draftData.type) typeSelect.value = draftData.type;

    // Featured Artist
    const featInput = document.querySelector('#wizard-feat-input');
    if (featInput) featInput.value = draftData.featuredArtist || '';

    // Primary Artist
    if (primaryArtistInput) primaryArtistInput.value = artist?.name || '';

    // Genre
    const genreSelect = document.querySelector('#wizard-genre-select');
    if (genreSelect && draftData.genre) genreSelect.value = draftData.genre;

    // Secondary Genre
    const secGenreSelect = document.querySelector('#wizard-secondary-genre-select');
    if (secGenreSelect) secGenreSelect.value = draftData.secondaryGenre || '';

    // Language
    const langSelect = document.querySelector('#release-form [name="language"]');
    if (langSelect && draftData.language) langSelect.value = draftData.language;
    const langValInput = document.querySelector('#wizard-language-val');
    const langTextInput = document.querySelector('#wizard-language-input');
    if (draftData.language) {
      if (langValInput) langValInput.value = draftData.language;
      if (langTextInput) langTextInput.value = draftData.language;
    }

    // DSP Platforms Restoration
    if (Array.isArray(draftData.selectedDSPs)) {
      const dspCards = document.querySelectorAll('#dsp-grid-container .dsp-card');
      dspCards.forEach(card => {
        const id = card.getAttribute('data-dsp-id');
        const cb = card.querySelector('.dsp-checkbox');
        const isSelected = draftData.selectedDSPs.includes(id);
        if (cb) cb.checked = isSelected;
        card.classList.toggle('dsp-card-active', isSelected);
      });
      const dspCount = document.querySelector('#dsp-selected-count');
      if (dspCount) dspCount.textContent = draftData.selectedDSPs.length;
    }

    // Territory Restoration
    const isWorldwide = (draftData.territoryMode !== 'custom');
    const radWorldwide = document.querySelector('#territory-radio-worldwide');
    const radCustom = document.querySelector('#territory-radio-custom');
    const cardWorldwide = document.querySelector('#territory-card-worldwide');
    const cardCustom = document.querySelector('#territory-card-custom');
    const customPanel = document.querySelector('#territory-custom-panel');

    if (isWorldwide) {
      if (radWorldwide) radWorldwide.checked = true;
      if (radCustom) radCustom.checked = false;
      if (cardWorldwide) {
        cardWorldwide.classList.add('selected');
        cardWorldwide.style.borderColor = '';
        cardWorldwide.style.background = '';
      }
      if (cardCustom) {
        cardCustom.classList.remove('selected');
        cardCustom.style.borderColor = '';
        cardCustom.style.background = '';
      }
      if (customPanel) customPanel.style.display = 'none';
    } else {
      if (radWorldwide) radWorldwide.checked = false;
      if (radCustom) radCustom.checked = true;
      if (cardCustom) {
        cardCustom.classList.add('selected');
        cardCustom.style.borderColor = '';
        cardCustom.style.background = '';
      }
      if (cardWorldwide) {
        cardWorldwide.classList.remove('selected');
        cardWorldwide.style.borderColor = '';
        cardWorldwide.style.background = '';
      }
      if (customPanel) customPanel.style.display = 'block';
    }

    if (Array.isArray(draftData.selectedCountries)) {
      const cCards = document.querySelectorAll('#territory-countries-grid .country-card');
      cCards.forEach(card => {
        const code = card.getAttribute('data-country-code');
        const cb = card.querySelector('.country-checkbox');
        const isSelected = draftData.selectedCountries.includes(code);
        if (cb) cb.checked = isSelected;
        card.classList.toggle('country-card-active', isSelected);
      });
      const tCount = document.querySelector('#territory-selected-count');
      if (tCount) tCount.textContent = draftData.selectedCountries.length;
    }

    // Explicit
    const isExp = draftData.explicit === true || draftData.explicit === 'true';
    const cleanRadio = document.querySelector('#explicit-radio-clean');
    const expRadio = document.querySelector('#explicit-radio-explicit');
    if (cleanRadio && expRadio) {
      cleanRadio.checked = !isExp;
      expRadio.checked = isExp;
    }
    if (typeof updateExplicitDisplay === 'function') {
      updateExplicitDisplay();
    }

    // Artwork
    const artworkExtUrlInput = document.querySelector('#artwork-external-url');
    if (artworkExtUrlInput) artworkExtUrlInput.value = draftData.artworkExternalUrl || '';
    const artPreview = document.querySelector('#wizard-art-preview');
    const artContent = document.querySelector('#art-drop-content');
    const artUrl = draftData.artworkUrl || draftData.artworkExternalUrl;
    if (artUrl && artPreview) {
      artPreview.src = artUrl;
      artPreview.style.display = 'block';
      if (artContent) artContent.style.display = 'none';
    } else if (artPreview && artContent) {
      artPreview.src = '';
      artPreview.style.display = 'none';
      artContent.style.display = 'block';
    }

    // Tracks
    if (Array.isArray(draftData.wizardTracks) && draftData.wizardTracks.length > 0) {
      wizardTracks = JSON.parse(JSON.stringify(draftData.wizardTracks));
    }
    if (typeof renderWizardTracklist === 'function') {
      renderWizardTracklist();
    }

    // Mode pill
    if (typeof setTrackMode === 'function') {
      if (wizardTracks.length > 1) {
        setTrackMode('multi');
      } else {
        setTrackMode('single');
      }
    }

    // UPC
    const upcCustomRadio = document.querySelector('#upc-radio-custom');
    const upcAutoRadio = document.querySelector('#upc-radio-auto');
    const upcInput = document.querySelector('#wizard-upc-input');
    if (draftData.upc_choice === 'custom' && upcCustomRadio) {
      upcCustomRadio.checked = true;
      if (upcInput) upcInput.value = draftData.upc || '';
    } else if (upcAutoRadio) {
      upcAutoRadio.checked = true;
    }
    if (typeof updateUpcDisplay === 'function') {
      updateUpcDisplay();
    }

    // Songwriters & Producers
    const sw = document.querySelector('#wizard-global-songwriters') || document.querySelector('[name="songwriters"]');
    if (sw) sw.value = draftData.songwriters || '';
    const prod = document.querySelector('#wizard-global-producers') || document.querySelector('[name="producers"]');
    if (prod) prod.value = draftData.producers || '';
    const ph = document.querySelector('[name="phonogram"]');
    if (ph) ph.value = draftData.phonogram || '℗ 2026 UniFLOWs Label';
    const cp = document.querySelector('[name="copyright"]');
    if (cp) cp.value = draftData.copyright || '© 2026 UniFLOWs Label';

    // Splits
    if (Array.isArray(draftData.splits) && draftData.splits.length > 0) {
      const splitsContainer = document.querySelector('#royalty-splits-container');
      if (splitsContainer) {
        splitsContainer.innerHTML = '';
        draftData.splits.forEach((sp, idx) => {
          const row = document.createElement('div');
          row.className = 'royalty-split-row';
          row.style = 'display:flex;gap:8px;align-items:center;background:#fff;padding:8px 10px;border:1px solid #e2e8f0;border-radius:6px;';
          const isPrimary = idx === 0;
          row.innerHTML = `
            <input class="split-name" value="${esc(sp.artistName || '')}" ${isPrimary ? 'readonly style="flex:2;padding:8px;font-size:12px;background:#f1f5f9;font-weight:bold;"' : 'placeholder="Tên Nghệ sĩ / Producer" style="flex:2;padding:8px;font-size:12px;"'}>
            <select class="split-role" style="flex:1.5;padding:8px;font-size:12px;background:#fff;">
              <option value="Primary Artist" ${sp.role === 'Primary Artist' ? 'selected' : ''}>Primary Artist</option>
              <option value="Producer" ${sp.role === 'Producer' ? 'selected' : ''}>Producer</option>
              <option value="Songwriter" ${sp.role === 'Songwriter' ? 'selected' : ''}>Songwriter</option>
              <option value="Featured Artist" ${sp.role === 'Featured Artist' ? 'selected' : ''}>Featured Artist</option>
              <option value="Composer" ${sp.role === 'Composer' ? 'selected' : ''}>Composer</option>
              <option value="Mixing Engineer" ${sp.role === 'Mixing Engineer' ? 'selected' : ''}>Mixing Engineer</option>
            </select>
            <div style="display:flex;align-items:center;gap:4px;flex:1;">
              <input class="split-pct" type="number" min="1" max="100" value="${sp.percentage || 100}" style="padding:8px;font-size:12px;text-align:right;font-weight:bold;width:100%;">
              <span style="font-size:12px;font-weight:bold;">%</span>
            </div>
            ${isPrimary ? '<span style="width:24px;text-align:center;color:#94a3b8;font-size:12px;">🔒</span>' : '<button type="button" class="remove-split-btn button alt" style="padding:4px 8px;font-size:11px;color:#dc2626;border-color:#fecaca;">✕</button>'}
          `;
          row.querySelector('.split-pct')?.addEventListener('input', updateSplitsTotal);
          row.querySelector('.remove-split-btn')?.addEventListener('click', () => {
            row.remove();
            updateSplitsTotal();
          });
          splitsContainer.appendChild(row);
        });
        if (typeof updateSplitsTotal === 'function') {
          updateSplitsTotal();
        }
      }
    }

    // Lyrics & Sync
    const lyricsTextEl = document.querySelector('#release-form [name="lyricsText"]');
    if (lyricsTextEl) lyricsTextEl.value = draftData.lyricsText || '';
    const lyricsLrcEl = document.querySelector('#release-form [name="lyricsLrc"]');
    if (lyricsLrcEl) lyricsLrcEl.value = draftData.lyricsLrc || '';
    const syncConsentEl = document.querySelector('#release-form [name="syncLicensingConsent"]');
    if (syncConsentEl) syncConsentEl.checked = draftData.syncLicensingConsent !== false;

    // Step 4 Dates & Notes
    const dateInput = document.querySelector('#wizard-date-input');
    if (dateInput) dateInput.value = draftData.releaseDate || '';
    const preSaveInput = document.querySelector('#release-form [name="preSaveDate"]');
    if (preSaveInput) preSaveInput.value = draftData.preSaveDate || '';
    const notesInput = document.querySelector('#release-form [name="notes"]');
    if (notesInput) notesInput.value = draftData.notes || '';

    // Update step and mockup
    if (typeof updateWizardStep === 'function') {
      updateWizardStep(1);
    }
    if (typeof updateLiveMockup === 'function') {
      updateLiveMockup();
    }
  } catch (err) {
    console.warn('Lỗi khi khôi phục chi tiết bản nháp:', err);
  }

  // Open modal always
  const dlg = releaseDialog || document.querySelector('#release-dialog');
  if (dlg) {
    if (!dlg.open) {
      try {
        dlg.showModal();
      } catch (e) {
        dlg.setAttribute('open', '');
      }
    }
  }
  showNotice(`✓ Đã mở bản nháp "${draftData.title || 'Chưa đặt tên'}" để bạn tiếp tục chỉnh sửa.`);
}

export async function discardReleaseDraft(draftId) {
  localStorage.removeItem('uniflows_release_draft_' + (artist?.id || 'artist'));
  if (draftId && draftId !== 'undefined' && isSupabaseConfigured()) {
    try {
      await supabase.from('releases').delete().eq('id', draftId);
    } catch (e) {
      console.warn('Lỗi xóa draft trên Supabase:', e);
    }
  }
  currentDraftId = null;
  updateActiveDraftBanner();
  await renderReleases();
  showNotice('✓ Đã xóa bản nháp thành công.');
}

export function updateActiveDraftBanner() {
  const banner = document.querySelector('#portal-active-draft-alert');
  if (!banner) return;

  // Check localStorage first
  let activeDraft = null;
  const rawLocal = localStorage.getItem('uniflows_release_draft_' + (artist?.id || 'artist'));
  if (rawLocal) {
    try {
      activeDraft = JSON.parse(rawLocal);
    } catch (e) {}
  }

  // If not found in local, check cachedFetchedReleases for 'Bản nháp'
  if (!activeDraft && Array.isArray(cachedFetchedReleases)) {
    const dbDraft = cachedFetchedReleases.find(r => r.submissionStatus === 'Bản nháp' || r.isDraft);
    if (dbDraft) {
      activeDraft = dbDraft.metadata?.draftData || dbDraft;
    }
  }

  if (!activeDraft) {
    banner.style.display = 'none';
    banner.innerHTML = '';
    return;
  }

  const normalized = normalizeDraftData(activeDraft);
  const draftTitle = normalized.title || 'Bản phát hành chưa đặt tên';
  const trackCount = (normalized.wizardTracks || []).length || 1;
  const updateTime = normalized.updatedAt ? new Date(normalized.updatedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Vừa xong';

  banner.style.display = 'block';
  banner.innerHTML = `
    <div style="background:#f8fafc;border:1.5px solid #cbd5e1;border-left:4px solid #0f172a;border-radius:8px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;box-shadow:0 2px 8px rgba(15,23,42,0.06);">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:24px;line-height:1;">📝</span>
        <div>
          <div style="font-size:14px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;">
            Bản nháp phát hành: <span style="color:#0284c7;">"${esc(draftTitle)}"</span>
            <span style="font-size:11px;font-family:'DM Mono',monospace;background:#e2e8f0;color:#334155;padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:600;">${esc(normalized.type || 'Single')} · ${trackCount} track</span>
          </div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">
            Đã lưu lúc: <b>${updateTime}</b> · Tiến trình được bảo toàn an toàn để bạn hoàn thiện trước khi gửi duyệt.
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button type="button" id="btn-banner-resume-draft" class="button" style="padding:8px 16px;font-size:12px;font-weight:700;background:#0f172a;color:#fff;border-color:#0f172a;cursor:pointer;">
          ✏️ Tiếp tục chỉnh sửa →
        </button>
        <button type="button" id="btn-banner-discard-draft" class="button alt" style="padding:8px 12px;font-size:12px;color:#dc2626;border-color:#fecaca;cursor:pointer;">
          ✕ Xóa nháp
        </button>
      </div>
    </div>
  `;

  document.querySelector('#btn-banner-resume-draft')?.addEventListener('click', () => {
    restoreReleaseDraft(normalized);
  });

  document.querySelector('#btn-banner-discard-draft')?.addEventListener('click', async () => {
    if (confirm(`Bạn có chắc chắn muốn xóa bản nháp "${draftTitle}" không? Dữ liệu nháp chưa nộp sẽ bị hủy.`)) {
      await discardReleaseDraft(normalized.id);
    }
  });
}

// Bind Save Draft buttons in Header and Footer
document.querySelector('#btn-save-release-draft-header')?.addEventListener('click', () => saveReleaseDraft(false));
document.querySelector('#btn-save-release-draft-footer')?.addEventListener('click', () => saveReleaseDraft(false));

// Keyboard shortcut Ctrl+S / Cmd+S to quickly save release draft
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
    if (releaseDialog && releaseDialog.open) {
      e.preventDefault();
      saveReleaseDraft(false);
    }
  }
});

// ====================================================
// ADMIN NOTIFICATION DISPATCHER & SPECIAL REQUESTS
// ====================================================
export async function dispatchAdminNotification({
  type = 'general',
  title = 'Thông báo từ Portal',
  message = '',
  artistId = '',
  artistName = '',
  artistAvatar = '',
  targetTab = 'admin-tab-overview',
  details = {}
}) {
  const notifObj = {
    id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    type,
    title,
    message,
    artistId: artistId || artist?.id || '',
    artistName: artistName || artist?.name || 'Nghệ sĩ',
    artistAvatar: artistAvatar || artist?.image || '',
    targetTab,
    details,
    isRead: false,
    createdAt: new Date().toISOString()
  };

  try {
    const raw = localStorage.getItem('uniflows-admin-notifications');
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(notifObj);
    if (list.length > 100) list.length = 100;
    localStorage.setItem('uniflows-admin-notifications', JSON.stringify(list));
  } catch (e) {
    console.warn('Lỗi lưu local admin notification:', e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('admin_notifications').insert([{
        id: notifObj.id,
        type: notifObj.type,
        title: notifObj.title,
        message: notifObj.message,
        artist_id: notifObj.artistId,
        artist_name: notifObj.artistName,
        target_tab: notifObj.targetTab,
        details: notifObj.details,
        is_read: false,
        created_at: notifObj.createdAt
      }]);
    } catch (e) {
      console.warn('Supabase notifications table not present, stored locally:', e);
    }
  }

  return notifObj;
}

export async function submitSpecialRequest({ type, title, details = {} }) {
  const reqObj = {
    id: 'req-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    type, // 'takedown' | 'catalog_transfer' | 'copyright_claim' | 'custom'
    title: title || `Yêu cầu từ ${artist?.name || 'Nghệ sĩ'}`,
    artistId: artist?.id || currentArtistId || '',
    artistName: artist?.name || 'Nghệ sĩ',
    artistEmail: artist?.email || sessionEmail || '',
    artistAvatar: artist?.image || '',
    details,
    status: 'pending',
    adminNote: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const raw = localStorage.getItem('uniflows-special-requests');
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(reqObj);
    localStorage.setItem('uniflows-special-requests', JSON.stringify(list));
  } catch (e) {
    console.warn('Lỗi lưu local special request:', e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('special_requests').insert([{
        id: reqObj.id,
        type: reqObj.type,
        title: reqObj.title,
        artist_id: reqObj.artistId,
        artist_name: reqObj.artistName,
        artist_email: reqObj.artistEmail,
        details: reqObj.details,
        status: 'pending',
        created_at: reqObj.createdAt
      }]);
    } catch (e) {
      console.warn('Supabase special_requests table not present, stored locally:', e);
    }
  }

  let notifMsg = '';
  if (type === 'takedown') {
    notifMsg = `Nghệ sĩ "${artist?.name}" yêu cầu gỡ bài hát "${details.releaseTitle || 'Tác phẩm'}" khỏi [${(details.platforms || []).join(', ')}] - Lý do: ${details.reason || 'N/A'}`;
  } else if (type === 'catalog_transfer') {
    notifMsg = `Nghệ sĩ "${artist?.name}" yêu cầu chuyển giao tác phẩm "${details.title || 'Catalogue'}" từ ${details.currentDistributor || 'nhà phân phối cũ'}`;
  } else {
    notifMsg = reqObj.title;
  }

  await dispatchAdminNotification({
    type: type === 'takedown' ? 'takedown_request' : (type === 'catalog_transfer' ? 'catalog_transfer' : 'special_request'),
    title: `Yêu cầu mới: ${type === 'takedown' ? 'Gỡ bài hát' : (type === 'catalog_transfer' ? 'Chuyển Catalog' : 'Dịch vụ khác')}`,
    message: notifMsg,
    targetTab: 'admin-tab-requests',
    details: reqObj
  });

  return reqObj;
}

// ====================================================
// PORTAL MOBILE RESPONSIVE NAVIGATION
// ====================================================
function initPortalMobileNav() {
  const menuBtn = document.querySelector('#portal-mobile-menu-btn');
  const drawer = document.querySelector('#portal-sidebar-drawer');
  const backdrop = document.querySelector('#portal-drawer-backdrop');
  const closeBtn = document.querySelector('#portal-close-drawer-btn');
  const mobileThemeBtn = document.querySelector('#mobile-theme-toggle-btn');
  const themeToggleBtn = document.querySelector('#theme-toggle-btn');
  const bottomCreateBtn = document.querySelector('#mobile-bottom-create-release-btn');
  const bottomNavItems = document.querySelectorAll('#portal-mobile-bottom-nav .portal-bottom-nav-item[data-tab]');

  function openDrawer() {
    drawer?.classList.add('open');
    backdrop?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer?.classList.remove('open');
    backdrop?.classList.remove('open');
    document.body.style.overflow = '';
  }

  menuBtn?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);

  document.querySelectorAll('#portal-nav a').forEach(link => {
    link.addEventListener('click', () => {
      closeDrawer();
      const tab = link.getAttribute('data-tab');
      bottomNavItems.forEach(b => {
        if (b.getAttribute('data-tab') === tab) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    });
  });

  bottomNavItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.getAttribute('data-tab');
      if (!tabId) return;

      const hash = item.getAttribute('href') || `#${tabId.replace('tab-', '')}`;
      history.pushState(null, null, hash);
      switchTab(tabId);
    });
  });

  bottomCreateBtn?.addEventListener('click', () => {
    openReleaseModalBtn?.click();
  });

  mobileThemeBtn?.addEventListener('click', () => {
    themeToggleBtn?.click();
  });
}
initPortalMobileNav();

// ====================================================
// TRACKLIST STUDIO: SPACIOUS TRACK MANAGEMENT & PRODUCTION CREDITS
// ====================================================
export const INDUSTRY_PRODUCTION_ROLES = [
  'Music Producer (Nhà sản xuất âm nhạc)',
  'Songwriter / Composer (Nhạc sĩ sáng tác giai điệu)',
  'Lyricist (Tác giả viết lời bài hát)',
  'Beatmaker / Beat Arranger (Người phối Beat)',
  'Arranger / Orchestrator (Hòa âm phối khí)',
  'Mixing Engineer (Kỹ sư hòa âm / Mix âm thanh)',
  'Mastering Engineer (Kỹ sư hoàn chỉnh Master)',
  'Dolby Atmos Engineer (Kỹ sư phối âm Dolby Atmos)',
  'Main Vocalist (Giọng hát chính)',
  'Featured Vocalist (Ca sĩ hát kết hợp)',
  'Backing Vocalist (Vocal bè / Hát đệm)',
  'Recording Engineer (Kỹ sư thu âm phòng thu)',
  'Instrumentalist / Musician (Nhạc công nhạc cụ)',
  'Sound Designer / FX (Thiết kế hiệu ứng âm thanh)'
];

let wizardTrackMode = 'single'; // 'single' | 'multi'
let wizardTracks = [];

function createDefaultCredits() {
  return [
    { role: 'Music Producer (Nhà sản xuất âm nhạc)', name: '' },
    { role: 'Songwriter / Composer (Nhạc sĩ sáng tác giai điệu)', name: '' }
  ];
}

function setTrackMode(mode) {
  wizardTrackMode = mode;
  const singleBtn = document.querySelector('#track-mode-single-btn');
  const multiBtn = document.querySelector('#track-mode-multi-btn');
  const addBtn = document.querySelector('#btn-add-tracklist-item');

  if (mode === 'multi') {
    singleBtn?.classList.remove('active');
    if (singleBtn) { singleBtn.style.background = 'transparent'; singleBtn.style.color = '#64748b'; singleBtn.style.boxShadow = 'none'; }
    multiBtn?.classList.add('active');
    if (multiBtn) { multiBtn.style.background = '#fff'; multiBtn.style.color = '#0f172a'; multiBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)'; }
    if (addBtn) addBtn.style.display = 'inline-flex';

    if (wizardTracks.length === 0) {
      addTrackItem({ title: document.querySelector('#wizard-title-input')?.value.trim() || 'Track 01' });
      addTrackItem({ title: 'Track 02' });
    } else if (wizardTracks.length === 1) {
      addTrackItem({ title: 'Track 02' });
    }
  } else {
    singleBtn?.classList.add('active');
    if (singleBtn) { singleBtn.style.background = '#fff'; singleBtn.style.color = '#0f172a'; singleBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)'; }
    multiBtn?.classList.remove('active');
    if (multiBtn) { multiBtn.style.background = 'transparent'; multiBtn.style.color = '#64748b'; multiBtn.style.boxShadow = 'none'; }
    if (addBtn) addBtn.style.display = 'none';

    if (wizardTracks.length === 0) {
      addTrackItem({ title: document.querySelector('#wizard-title-input')?.value.trim() || 'Track 01' });
    } else if (wizardTracks.length > 1) {
      wizardTracks.length = 1;
    }
  }
  renderWizardTracklist();
}

document.querySelector('#track-mode-single-btn')?.addEventListener('click', () => setTrackMode('single'));
document.querySelector('#track-mode-multi-btn')?.addEventListener('click', () => setTrackMode('multi'));

document.querySelector('#wizard-type-select')?.addEventListener('change', (e) => {
  const val = e.target.value;
  if (val === 'EP' || val === 'Album' || val === 'Remix') {
    setTrackMode('multi');
  } else if (val === 'Single') {
    setTrackMode('single');
  }
});

function addTrackItem(data = {}) {
  const defaultTitle = data.title || (wizardTracks.length === 0 ? (document.querySelector('#wizard-title-input')?.value.trim() || 'Track 01') : `Track ${String(wizardTracks.length + 1).padStart(2, '0')}`);
  const item = {
    id: 'tr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    trackNum: wizardTracks.length + 1,
    title: defaultTitle,
    featuredArtist: data.featuredArtist || '',
    version: data.version || '',
    audioFile: data.audioFile || null,
    audioUrl: data.audioUrl || '',
    dolbyAtmosFile: data.dolbyAtmosFile || null,
    dolbyAtmosUrl: data.dolbyAtmosUrl || '',
    lyricsText: data.lyricsText || '',
    lyricsLrc: data.lyricsLrc || '',
    showLrc: Boolean(data.lyricsLrc),
    explicit: data.explicit === true,
    isInstrumental: Boolean(data.isInstrumental),
    isrc: data.isrc || '',
    duration: data.duration || '',
    credits: (Array.isArray(data.credits) && data.credits.length > 0)
      ? data.credits
      : createDefaultCredits()
  };
  wizardTracks.push(item);
  renderWizardTracklist();
  return item;
}

function renderWizardTracklist() {
  const container = document.querySelector('#tracklist-studio-container') || document.querySelector('#tracklist-items-container');
  const badge = document.querySelector('#tracklist-summary-badge');
  if (badge) {
    badge.textContent = `${wizardTracks.length} bài hát trong danh sách phát hành`;
  }
  if (!container) return;

  if (wizardTracks.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:32px;background:#fff;border:1px dashed #cbd5e1;border-radius:10px;color:#64748b;font-size:13px;">
        Chưa có bài hát nào trong danh sách. Bấm <b>"+ Thêm bài hát"</b> hoặc <b>"Tải hàng loạt Audio"</b> để bắt đầu!
      </div>
    `;
    return;
  }

  container.innerHTML = wizardTracks.map((tr, idx) => {
    const hasAudio = Boolean(tr.audioFile || tr.audioUrl);
    const audioStateText = tr.audioFile 
      ? `✓ ${tr.audioFile.name} (${(tr.audioFile.size / (1024 * 1024)).toFixed(1)} MB)` 
      : (tr.audioUrl ? `✓ URL: ${tr.audioUrl.substring(0, 32)}...` : 'Chưa chọn file Audio');
    const audioStateColor = hasAudio ? 'var(--portal-text-main)' : 'var(--portal-text-dim)';

    const hasAtmos = Boolean(tr.dolbyAtmosFile || tr.dolbyAtmosUrl);
    const atmosStateText = tr.dolbyAtmosFile
      ? `✓ ${tr.dolbyAtmosFile.name} (${(tr.dolbyAtmosFile.size / (1024 * 1024)).toFixed(1)} MB)`
      : (tr.dolbyAtmosUrl ? `✓ URL: ${tr.dolbyAtmosUrl.substring(0, 32)}...` : 'Chưa có file Dolby Atmos (Tùy chọn)');
    const atmosStateColor = hasAtmos ? 'var(--portal-text-main)' : 'var(--portal-text-dim)';

    return `
      <div class="tracklist-studio-card" data-track-idx="${idx}" style="display:grid;gap:18px;">
        
        <!-- Header of Track Card (AWAL Style) -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;border-bottom:1px solid var(--glass-border-subtle);padding-bottom:14px;">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <span style="font-family:'DM Mono',monospace;font-size:11.5px;font-weight:800;background:linear-gradient(135deg, #0284c7, #a855f7);color:#fff;padding:5px 12px;border-radius:6px;letter-spacing:0.5px;">
              TRACK #${String(idx + 1).padStart(2, '0')}
            </span>
            <span class="track-header-title-summary" style="font-size:15px;font-weight:800;color:var(--portal-text-main);">
              ${esc(tr.title || 'Chưa đặt tên')}
            </span>
            <span class="track-header-audio-badge" style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;background:${hasAudio ? 'rgba(16,185,129,0.1);color:#10b981;border:1px solid rgba(16,185,129,0.25);' : 'var(--glass-bg-subtle);color:var(--portal-text-dim);border:1px solid var(--glass-border-subtle);'}">
              ${hasAudio ? '✓ Đã có Audio Master' : '⏳ Cần tải file Audio'}
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <button type="button" class="btn-track-up button alt" style="padding:6px 12px;font-size:11.5px;margin:0;" ${idx === 0 ? 'disabled' : ''} title="Đưa lên">▲</button>
            <button type="button" class="btn-track-down button alt" style="padding:6px 12px;font-size:11.5px;margin:0;" ${idx === wizardTracks.length - 1 ? 'disabled' : ''} title="Đưa xuống">▼</button>
            ${wizardTracks.length > 1 ? `
              <button type="button" class="btn-track-remove button alt remove" style="padding:6px 12px;font-size:11.5px;margin:0;color:#ef4444;border-color:rgba(239,68,68,0.3);cursor:pointer;" title="Xoá bài này khỏi danh sách">✕ Xóa bài</button>
            ` : ''}
          </div>
        </div>

        <!-- 1. Main Track Details Grid (Spacious 3-Column Layout) -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:16px;">
          <div class="field" style="margin:0;">
            <label style="font-size:12px;font-weight:700;color:var(--portal-text-main);display:block;margin-bottom:6px;">
              Tên bài hát (Track Title) *
            </label>
            <input type="text" class="track-input-title" placeholder="Nhập tên bài hát..." value="${esc(tr.title)}" style="font-size:14px;font-weight:600;padding:10px 14px;width:100%;border-radius:10px;" required>
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:12px;font-weight:700;color:var(--portal-text-main);display:block;margin-bottom:6px;">
              Nghệ sĩ hợp tác (Featured Artist - Tùy chọn)
            </label>
            <input type="text" class="track-input-feat" placeholder="Tên nghệ sĩ kết hợp (nếu có)..." value="${esc(tr.featuredArtist)}" style="font-size:13px;padding:10px 14px;width:100%;border-radius:10px;">
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:12px;font-weight:700;color:var(--portal-text-main);display:block;margin-bottom:6px;">
              Phiên bản (Version / Mix - Tùy chọn)
            </label>
            <input type="text" class="track-input-version" placeholder="Radio Edit, Acoustic, Remix..." value="${esc(tr.version || '')}" style="font-size:13px;padding:10px 14px;width:100%;border-radius:10px;">
          </div>
        </div>

        <!-- 2. Audio Files Grid: Master Audio + Optional Dolby Atmos -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:16px;background:var(--glass-bg-subtle);padding:18px;border-radius:14px;border:1px solid var(--glass-border-subtle);">
          <!-- Master Audio -->
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <label style="font-size:12px;font-weight:800;color:var(--portal-text-main);text-transform:uppercase;">
                🎵 File Master Audio (Stereo) *
              </label>
              <span style="font-size:10.5px;color:var(--portal-text-main);background:var(--glass-bg-elevated);padding:2px 8px;border-radius:4px;font-family:'DM Mono',monospace;font-weight:700;border:1px solid var(--glass-border-subtle);">WAV / FLAC / MP3</span>
            </div>
            <div style="display:flex;gap:10px;align-items:center;">
              <label class="button" style="padding:8px 16px;font-size:12px;margin:0;cursor:pointer;font-weight:700;white-space:nowrap;border-radius:999px;">
                📁 Chọn Master File
                <input type="file" class="track-audio-input" accept="audio/wav,audio/flac,audio/x-wav,audio/mp3,audio/mpeg" style="display:none;">
              </label>
              <span class="track-audio-status" style="font-size:11.5px;color:${audioStateColor};font-family:'DM Mono',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;font-weight:600;">
                ${audioStateText}
              </span>
            </div>
            <input type="url" class="track-input-audio-url" placeholder="Hoặc dán Link Google Drive/Dropbox Master (https://...)" value="${esc(tr.audioUrl || '')}" style="font-size:12px;padding:9px 12px;border-radius:10px;">
          </div>

          <!-- Dolby Atmos Spatial Audio -->
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <label style="font-size:12px;font-weight:800;color:var(--portal-text-main);text-transform:uppercase;">
                🎧 Dolby Atmos Spatial Audio (Tùy chọn)
              </label>
              <span style="font-size:10.5px;color:var(--portal-text-main);background:var(--glass-bg-elevated);padding:2px 8px;border-radius:4px;font-weight:700;font-family:'DM Mono',monospace;border:1px solid var(--glass-border-subtle);">ADM BWF / WAV</span>
            </div>
            <div style="display:flex;gap:10px;align-items:center;">
              <label class="button alt" style="padding:8px 16px;font-size:12px;margin:0;cursor:pointer;font-weight:700;white-space:nowrap;border-radius:999px;">
                🎧 Chọn File Atmos
                <input type="file" class="track-atmos-input" accept="audio/wav,audio/x-wav,.wav" style="display:none;">
              </label>
              <span class="track-atmos-status" style="font-size:11.5px;color:${atmosStateColor};font-family:'DM Mono',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;font-weight:600;">
                ${atmosStateText}
              </span>
            </div>
            <input type="url" class="track-input-atmos-url" placeholder="Hoặc dán Link Drive/Dropbox Dolby Atmos (https://...)" value="${esc(tr.dolbyAtmosUrl || '')}" style="font-size:12px;padding:9px 12px;border-radius:10px;">
          </div>
        </div>

        <!-- 3. Track Settings Row: Content Explicit Type & ISRC Code -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:16px;padding:14px 18px;background:var(--glass-bg-subtle);border:1px solid var(--glass-border-subtle);border-radius:12px;">
          <div class="field" style="margin:0;">
            <label style="font-size:12px;font-weight:700;color:var(--portal-text-main);display:block;margin-bottom:6px;">Phân loại nội dung bài hát:</label>
            <select class="track-select-explicit" style="font-size:12.5px;padding:9px 12px;border-radius:10px;font-weight:600;width:100%;">
              <option value="false" ${!tr.explicit && !tr.isInstrumental ? 'selected' : ''}>Clean (Bản tiêu chuẩn / Không nhạy cảm)</option>
              <option value="true" ${tr.explicit ? 'selected' : ''}>[E] Explicit (Có từ ngữ nhạy cảm / 18+)</option>
              <option value="instrumental" ${tr.isInstrumental ? 'selected' : ''}>Instrumental (Nhạc không lời)</option>
            </select>
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:12px;font-weight:700;color:var(--portal-text-main);display:block;margin-bottom:6px;">Mã ISRC của bài hát (Tùy chọn):</label>
            <input type="text" class="track-input-isrc" placeholder="Để trống nếu muốn UniFLOWs cấp tự động" value="${esc(tr.isrc)}" style="font-family:'DM Mono',monospace;font-size:12.5px;padding:9px 12px;border-radius:10px;width:100%;">
          </div>
        </div>

        <!-- 4. Production Credits Section (AWAL style) -->
        <div style="background:var(--glass-bg-subtle);border:1px solid var(--glass-border-subtle);border-radius:12px;padding:16px 18px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <div>
              <label style="font-size:12px;font-weight:800;color:var(--portal-text-main);text-transform:uppercase;display:block;margin:0;">
                👥 Đội Ngũ Sản Xuất &amp; Tác Quyền Bài Hát (Production Credits)
              </label>
              <span style="font-size:11.5px;color:var(--portal-text-dim);">Chọn vai trò trong danh sách chuẩn ngành và nhập tên tương ứng:</span>
            </div>
            <button type="button" class="btn-add-track-credit button alt" style="padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;border-radius:999px;">
              + Thêm Vai Trò / Người Tham Gia
            </button>
          </div>

          <div class="track-credits-container" style="display:grid;gap:8px;">
            ${(tr.credits || []).map((cr, cIdx) => `
              <div class="track-credit-row" data-credit-idx="${cIdx}" style="display:flex;gap:10px;align-items:center;background:var(--glass-bg-elevated);padding:8px 12px;border:1px solid var(--glass-border-subtle);border-radius:10px;">
                <select class="credit-input-role" style="font-size:12px;padding:7px 10px;border-radius:8px;flex:1;max-width:260px;font-weight:600;">
                  ${INDUSTRY_PRODUCTION_ROLES.map(role => `
                    <option value="${esc(role)}" ${cr.role === role ? 'selected' : ''}>${esc(role)}</option>
                  `).join('')}
                </select>
                <input type="text" class="credit-input-name" placeholder="Họ và tên / Nghệ danh..." value="${esc(cr.name || '')}" style="font-size:12.5px;padding:7px 12px;border-radius:8px;flex:1;" required>
                <button type="button" class="btn-del-credit button alt remove" style="padding:5px 10px;font-size:11.5px;color:#ef4444;border-color:rgba(239,68,68,0.3);cursor:pointer;border-radius:8px;" title="Xóa vai trò này">✕</button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 5. Lyrics Section -->
        <div style="background:var(--glass-bg-subtle);border:1px solid var(--glass-border-subtle);border-radius:12px;padding:16px 18px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
            <label style="font-size:12px;font-weight:800;color:var(--portal-text-main);text-transform:uppercase;margin:0;">
              📝 Lời Bài Hát (Lyrics Studio)
            </label>
            <button type="button" class="btn-toggle-lrc button alt" style="padding:4px 12px;font-size:11px;font-weight:700;cursor:pointer;border-radius:999px;">
              ${tr.showLrc ? 'Ẩn Lời Đồng Bộ LRC' : '+ Thêm Lời Đồng Bộ LRC (Tùy chọn)'}
            </button>
          </div>
          <textarea class="track-textarea-lyrics" rows="4" placeholder="Dán toàn bộ lời bài hát (Plain text) tại đây để hiển thị trên Apple Music, Spotify, Zing MP3..." style="font-size:12.5px;padding:10px 12px;width:100%;border-radius:10px;resize:vertical;font-family:inherit;line-height:1.5;">${esc(tr.lyricsText || '')}</textarea>

          <div class="track-lrc-wrapper" style="display:${tr.showLrc ? 'block' : 'none'};margin-top:10px;padding-top:10px;border-top:1px dashed var(--glass-border-subtle);">
            <label style="font-size:11.5px;font-weight:700;color:var(--portal-text-main);display:block;margin-bottom:4px;">
              Định dạng lời đồng bộ thời gian (.LRC):
            </label>
            <textarea class="track-textarea-lrc" rows="4" placeholder="[00:12.30] Dòng lời bài hát thứ nhất...&#10;[00:15.80] Dòng lời bài hát thứ hai..." style="font-size:12px;font-family:'DM Mono',monospace;padding:10px 12px;width:100%;border-radius:10px;resize:vertical;line-height:1.4;">${esc(tr.lyricsLrc || '')}</textarea>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.tracklist-studio-card').forEach(card => {
    const idx = parseInt(card.dataset.trackIdx, 10);
    const item = wizardTracks[idx];
    if (!item) return;

    // Title, Feat, Version
    card.querySelector('.track-input-title')?.addEventListener('input', (e) => {
      item.title = e.target.value;
      const summaryEl = card.querySelector('.track-header-title-summary');
      if (summaryEl) summaryEl.textContent = item.title || 'Chưa đặt tên';
    });

    card.querySelector('.track-input-feat')?.addEventListener('input', (e) => {
      item.featuredArtist = e.target.value;
    });

    card.querySelector('.track-input-version')?.addEventListener('input', (e) => {
      item.version = e.target.value;
    });

    // Master Audio
    card.querySelector('.track-audio-input')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        item.audioFile = file;
        const statusEl = card.querySelector('.track-audio-status');
        if (statusEl) {
          statusEl.textContent = `✓ ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`;
          statusEl.style.color = '#0f172a';
        }
        const badgeEl = card.querySelector('.track-header-audio-badge');
        if (badgeEl) {
          badgeEl.textContent = '✓ Đã có Audio Master';
          badgeEl.style.background = '#f1f5f9';
          badgeEl.style.color = '#0f172a';
          badgeEl.style.border = '1px solid #cbd5e1';
        }
      }
    });

    card.querySelector('.track-input-audio-url')?.addEventListener('input', (e) => {
      item.audioUrl = e.target.value.trim();
      const statusEl = card.querySelector('.track-audio-status');
      if (statusEl && !item.audioFile) {
        statusEl.textContent = item.audioUrl ? `✓ URL: ${item.audioUrl.substring(0, 32)}...` : 'Chưa chọn file Audio';
        statusEl.style.color = item.audioUrl ? '#0f172a' : '#64748b';
      }
      const badgeEl = card.querySelector('.track-header-audio-badge');
      if (badgeEl && !item.audioFile) {
        badgeEl.textContent = item.audioUrl ? '✓ Đã có Audio Master' : '⏳ Cần tải file Audio';
        badgeEl.style.background = item.audioUrl ? '#f1f5f9' : '#f8fafc';
        badgeEl.style.color = item.audioUrl ? '#0f172a' : '#64748b';
      }
    });

    // Dolby Atmos Audio
    card.querySelector('.track-atmos-input')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        item.dolbyAtmosFile = file;
        const statusEl = card.querySelector('.track-atmos-status');
        if (statusEl) {
          statusEl.textContent = `✓ ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`;
          statusEl.style.color = '#0f172a';
        }
      }
    });

    card.querySelector('.track-input-atmos-url')?.addEventListener('input', (e) => {
      item.dolbyAtmosUrl = e.target.value.trim();
      const statusEl = card.querySelector('.track-atmos-status');
      if (statusEl && !item.dolbyAtmosFile) {
        statusEl.textContent = item.dolbyAtmosUrl ? `✓ URL: ${item.dolbyAtmosUrl.substring(0, 32)}...` : 'Chưa có file Dolby Atmos (Tùy chọn)';
        statusEl.style.color = item.dolbyAtmosUrl ? '#0f172a' : '#64748b';
      }
    });

    // Lyrics
    card.querySelector('.track-textarea-lyrics')?.addEventListener('input', (e) => {
      item.lyricsText = e.target.value;
    });

    card.querySelector('.btn-toggle-lrc')?.addEventListener('click', () => {
      item.showLrc = !item.showLrc;
      const lrcWrapper = card.querySelector('.track-lrc-wrapper');
      const toggleBtn = card.querySelector('.btn-toggle-lrc');
      if (lrcWrapper) lrcWrapper.style.display = item.showLrc ? 'block' : 'none';
      if (toggleBtn) toggleBtn.textContent = item.showLrc ? 'Ẩn Lời Đồng Bộ LRC' : '+ Thêm Lời Đồng Bộ LRC (Tùy chọn)';
    });

    card.querySelector('.track-textarea-lrc')?.addEventListener('input', (e) => {
      item.lyricsLrc = e.target.value;
    });

    // Credits builder
    card.querySelector('.btn-add-track-credit')?.addEventListener('click', () => {
      if (!Array.isArray(item.credits)) item.credits = [];
      item.credits.push({ role: 'Music Producer (Nhà sản xuất âm nhạc)', name: '' });
      renderWizardTracklist();
    });

    card.querySelectorAll('.track-credit-row').forEach(row => {
      const cIdx = parseInt(row.dataset.creditIdx, 10);
      row.querySelector('.credit-input-role')?.addEventListener('change', (e) => {
        if (item.credits && item.credits[cIdx]) item.credits[cIdx].role = e.target.value;
      });
      row.querySelector('.credit-input-name')?.addEventListener('input', (e) => {
        if (item.credits && item.credits[cIdx]) item.credits[cIdx].name = e.target.value;
      });
      row.querySelector('.btn-del-credit')?.addEventListener('click', () => {
        if (item.credits) {
          item.credits.splice(cIdx, 1);
          renderWizardTracklist();
        }
      });
    });

    // Explicit & ISRC
    card.querySelector('.track-select-explicit')?.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'instrumental') {
        item.isInstrumental = true;
        item.explicit = false;
      } else if (val === 'true') {
        item.isInstrumental = false;
        item.explicit = true;
      } else {
        item.isInstrumental = false;
        item.explicit = false;
      }
    });

    card.querySelector('.track-input-isrc')?.addEventListener('input', (e) => {
      item.isrc = e.target.value.trim();
    });

    // Order buttons
    card.querySelector('.btn-track-up')?.addEventListener('click', () => {
      if (idx > 0) {
        const temp = wizardTracks[idx];
        wizardTracks[idx] = wizardTracks[idx - 1];
        wizardTracks[idx - 1] = temp;
        wizardTracks.forEach((t, i) => t.trackNum = i + 1);
        renderWizardTracklist();
      }
    });

    card.querySelector('.btn-track-down')?.addEventListener('click', () => {
      if (idx < wizardTracks.length - 1) {
        const temp = wizardTracks[idx];
        wizardTracks[idx] = wizardTracks[idx + 1];
        wizardTracks[idx + 1] = temp;
        wizardTracks.forEach((t, i) => t.trackNum = i + 1);
        renderWizardTracklist();
      }
    });

    card.querySelector('.btn-track-remove')?.addEventListener('click', () => {
      wizardTracks.splice(idx, 1);
      wizardTracks.forEach((t, i) => t.trackNum = i + 1);
      renderWizardTracklist();
    });
  });
}

document.querySelector('#btn-add-tracklist-item')?.addEventListener('click', () => {
  addTrackItem();
});

document.querySelector('#batch-audio-input')?.addEventListener('change', (e) => {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;

  setTrackMode('multi');
  files.forEach(file => {
    let cleanTitle = file.name.replace(/\.[^/.]+$/, '');
    cleanTitle = cleanTitle.replace(/^[\d\s._-]+/, '').trim();
    if (!cleanTitle) cleanTitle = file.name;

    addTrackItem({
      title: cleanTitle,
      audioFile: file
    });
  });
  e.target.value = '';
});

// Initialize UPC choice controls & Explicit choice controls
export function updateUpcDisplay() {
  const upcRadioCustom = document.querySelector('#upc-radio-custom');
  const upcCustomBox = document.querySelector('#upc-custom-input-box');
  const upcCardAuto = document.querySelector('#upc-card-auto');
  const upcCardCustom = document.querySelector('#upc-card-custom');

  if (upcRadioCustom?.checked) {
    if (upcCustomBox) upcCustomBox.style.display = 'block';
    if (upcCardCustom) {
      upcCardCustom.style.borderColor = '#0f172a';
      upcCardCustom.style.background = '#f8fafc';
    }
    if (upcCardAuto) {
      upcCardAuto.style.borderColor = '#e2e8f0';
      upcCardAuto.style.background = '#fff';
    }
  } else {
    if (upcCustomBox) upcCustomBox.style.display = 'none';
    if (upcCardAuto) {
      upcCardAuto.style.borderColor = '#0f172a';
      upcCardAuto.style.background = '#f8fafc';
    }
    if (upcCardCustom) {
      upcCardCustom.style.borderColor = '#e2e8f0';
      upcCardCustom.style.background = '#fff';
    }
  }
}

export function updateExplicitDisplay() {
  const explicitRadioExplicit = document.querySelector('#explicit-radio-explicit');
  const explicitCardClean = document.querySelector('#explicit-card-clean');
  const explicitCardExplicit = document.querySelector('#explicit-card-explicit');

  if (explicitRadioExplicit?.checked) {
    if (explicitCardExplicit) {
      explicitCardExplicit.style.borderColor = '#0f172a';
      explicitCardExplicit.style.background = '#f8fafc';
    }
    if (explicitCardClean) {
      explicitCardClean.style.borderColor = '#e2e8f0';
      explicitCardClean.style.background = '#fff';
    }
  } else {
    if (explicitCardClean) {
      explicitCardClean.style.borderColor = '#0f172a';
      explicitCardClean.style.background = '#f8fafc';
    }
    if (explicitCardExplicit) {
      explicitCardExplicit.style.borderColor = '#e2e8f0';
      explicitCardExplicit.style.background = '#fff';
    }
  }
}

function initUpcControls() {
  const upcRadioAuto = document.querySelector('#upc-radio-auto');
  const upcRadioCustom = document.querySelector('#upc-radio-custom');
  const wizardUpcInput = document.querySelector('#wizard-upc-input');

  upcRadioAuto?.addEventListener('change', updateUpcDisplay);
  upcRadioCustom?.addEventListener('change', () => {
    updateUpcDisplay();
    wizardUpcInput?.focus();
  });
  updateUpcDisplay();
}

function initExplicitControls() {
  const explicitRadioClean = document.querySelector('#explicit-radio-clean');
  const explicitRadioExplicit = document.querySelector('#explicit-radio-explicit');

  explicitRadioClean?.addEventListener('change', updateExplicitDisplay);
  explicitRadioExplicit?.addEventListener('change', updateExplicitDisplay);
  updateExplicitDisplay();
}

initUpcControls();
initExplicitControls();

// File name change indicators & live visual feedback
audioFileInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && audioFilename) {
    audioFilename.textContent = `✓ Đã chọn Master: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
    audioFilename.style.color = '#059669';
  }
});

function inspectArtworkImage(source, fileObj = null) {
  const container = document.querySelector('#artwork-inspect-container');
  const details = document.querySelector('#art-inspect-details');
  const statusBadge = document.querySelector('#art-status-badge');
  if (!container || !details || !statusBadge) return;

  const img = new Image();
  img.onload = () => {
    container.style.display = 'block';
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const isSquare = Math.abs(w - h) <= 2;
    const isOptimalRes = w >= 3000 && h >= 3000;
    const isMinRes = w >= 1400 && h >= 1400;
    const fileSizeMB = fileObj ? (fileObj.size / (1024 * 1024)).toFixed(2) : null;
    const formatName = fileObj ? fileObj.type.split('/')[1]?.toUpperCase() : (source.startsWith('data:image/') ? source.substring(11, source.indexOf(';')).toUpperCase() : 'JPG/PNG');

    const allGood = isSquare && isMinRes;

    let html = '';

    // 1. Aspect ratio check
    if (isSquare) {
      html += `<div style="display:flex;align-items:center;gap:6px;color:#16a34a;"><span>✓</span> <b>Tỷ lệ khung hình:</b> Chuẩn vuông 1:1 (${w} × ${h} px)</div>`;
    } else {
      html += `<div style="display:flex;align-items:center;gap:6px;color:#dc2626;"><span>✕</span> <b>Tỷ lệ khung hình:</b> Không vuông (${w} × ${h} px) — DSPs bắt buộc hình vuông 1:1!</div>`;
    }

    // 2. Resolution check
    if (isOptimalRes) {
      html += `<div style="display:flex;align-items:center;gap:6px;color:#16a34a;"><span>✓</span> <b>Độ phân giải:</b> Đạt chuẩn tối ưu (${w}px ≥ 3000px)</div>`;
    } else if (isMinRes) {
      html += `<div style="display:flex;align-items:center;gap:6px;color:#d97706;"><span>⚠️</span> <b>Độ phân giải:</b> ${w} × ${h} px (Đạt tối thiểu 1400px, khuyến nghị nâng lên 3000px)</div>`;
    } else {
      html += `<div style="display:flex;align-items:center;gap:6px;color:#dc2626;"><span>✕</span> <b>Độ phân giải:</b> ${w} × ${h} px (Quá nhỏ, bắt buộc tối thiểu 1400 × 1400 px)</div>`;
    }

    // 3. File details
    if (fileSizeMB) {
      html += `<div style="display:flex;align-items:center;gap:6px;color:#475569;"><span>ℹ️</span> <b>Định dạng & Dung lượng:</b> ${formatName} · ${fileSizeMB} MB</div>`;
    }

    details.innerHTML = html;

    if (allGood) {
      statusBadge.textContent = 'DSP READY (ĐẠT CHUẨN)';
      statusBadge.style.background = '#ecfdf5';
      statusBadge.style.color = '#047857';
      statusBadge.style.borderColor = '#a7f3d0';
    } else {
      statusBadge.textContent = 'CẦN ĐIỀU CHỈNH';
      statusBadge.style.background = '#fef2f2';
      statusBadge.style.color = '#991b1b';
      statusBadge.style.borderColor = '#fecaca';
    }
  };
  img.onerror = () => {
    container.style.display = 'block';
    details.innerHTML = '<div style="color:#dc2626;"><span>✕</span> Không thể đọc được file ảnh. Vui lòng kiểm tra lại định dạng.</div>';
    statusBadge.textContent = 'LỖI FILE';
    statusBadge.style.background = '#fef2f2';
    statusBadge.style.color = '#991b1b';
  };
  img.src = source;
}

artworkFileInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    if (artworkFilename) {
      artworkFilename.textContent = `✓ Đã nạp Artwork: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      artworkFilename.style.color = '#059669';
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const artUrl = evt.target.result;
      const dropArtPreview = document.querySelector('#wizard-art-preview');
      const mockArt = document.querySelector('#wizard-mock-art');
      const artDropContent = document.querySelector('#art-drop-content');
      if (dropArtPreview) {
        dropArtPreview.src = artUrl;
        dropArtPreview.style.display = 'block';
      }
      if (artDropContent) artDropContent.style.display = 'none';
      if (mockArt) mockArt.src = artUrl;

      // Run real-time quality inspection
      inspectArtworkImage(artUrl, file);
    };
    reader.readAsDataURL(file);
  }
});

const artUrlInput = document.querySelector('#artwork-external-url');
artUrlInput?.addEventListener('input', (e) => {
  const url = e.target.value.trim();
  if (url) {
    const mockArt = document.querySelector('#wizard-mock-art');
    const dropArtPreview = document.querySelector('#wizard-art-preview');
    const artDropContent = document.querySelector('#art-drop-content');
    if (dropArtPreview) {
      dropArtPreview.src = url;
      dropArtPreview.style.display = 'block';
    }
    if (artDropContent) artDropContent.style.display = 'none';
    if (mockArt) mockArt.src = url;

    // Run real-time quality inspection
    inspectArtworkImage(url);
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

// Release Search & Filter Controls
const releaseSearchInput = document.querySelector('#release-search-input');
releaseSearchInput?.addEventListener('input', (e) => {
  currentSearchQuery = e.target.value.trim().toLowerCase();
  renderReleaseListItems();
});

// Filter chips
document.querySelectorAll('[data-release-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-release-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentReleaseFilter = btn.dataset.releaseFilter;
    renderReleaseListItems();
  });
});

function updateFilterCounters() {
  const countAll = cachedFetchedReleases.length;
  const countLive = cachedFetchedReleases.filter(r => !r.submissionStatus || r.submissionStatus === 'Đã phát hành').length;
  const countPending = cachedFetchedReleases.filter(r => r.submissionStatus && r.submissionStatus.includes('chờ')).length;
  const countDraft = cachedFetchedReleases.filter(r => r.submissionStatus === 'Bản nháp' || r.isDraft).length;
  const countTakedown = cachedFetchedReleases.filter(r => r.submissionStatus && r.submissionStatus.includes('gỡ')).length;

  const elAll = document.querySelector('#filter-count-all');
  const elLive = document.querySelector('#filter-count-live');
  const elPending = document.querySelector('#filter-count-pending');
  const elDraft = document.querySelector('#filter-count-draft');
  const elTakedown = document.querySelector('#filter-count-takedown');
  const elNavCount = document.querySelector('#nav-releases-count');

  if (elAll) elAll.textContent = countAll;
  if (elLive) elLive.textContent = countLive;
  if (elPending) elPending.textContent = countPending;
  if (elDraft) elDraft.textContent = countDraft;
  if (elTakedown) elTakedown.textContent = countTakedown;
  if (elNavCount) elNavCount.textContent = countAll;
}

function renderReleaseListItems() {
  if (!list) return;
  updateFilterCounters();

  let filtered = cachedFetchedReleases;

  if (currentReleaseFilter === 'live') {
    filtered = cachedFetchedReleases.filter(r => !r.submissionStatus || r.submissionStatus === 'Đã phát hành');
  } else if (currentReleaseFilter === 'pending') {
    filtered = cachedFetchedReleases.filter(r => r.submissionStatus && r.submissionStatus.includes('chờ'));
  } else if (currentReleaseFilter === 'draft') {
    filtered = cachedFetchedReleases.filter(r => r.submissionStatus === 'Bản nháp' || r.isDraft);
  } else if (currentReleaseFilter === 'takedown') {
    filtered = cachedFetchedReleases.filter(r => r.submissionStatus && r.submissionStatus.includes('gỡ'));
  }

  if (currentSearchQuery) {
    filtered = filtered.filter(r => {
      const t = (r.title || '').toLowerCase();
      const format = (r.type || '').toLowerCase();
      const artistName = (r.primaryArtistName || '').toLowerCase();
      const isrc = (r.isrc || '').toLowerCase();
      return t.includes(currentSearchQuery) || format.includes(currentSearchQuery) || artistName.includes(currentSearchQuery) || isrc.includes(currentSearchQuery);
    });
  }

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty" style="padding:20px;background:#fff;border:1px solid var(--line);border-radius:4px;">Không tìm thấy bản phát hành nào theo bộ lọc này.</p>';
    return;
  }

  list.innerHTML = filtered.map(p => {
    const isDraft = p.submissionStatus === 'Bản nháp' || p.isDraft;
    const isTakedownRequested = p.submissionStatus === 'Yêu cầu gỡ / xóa bản phát hành';
    const isPending = p.submissionStatus?.includes('chờ');
    const isRevision = p.submissionStatus === 'Yêu cầu chỉnh sửa' || p.submissionStatus?.includes('chỉnh sửa');
    const isRejected = p.submissionStatus === 'Từ chối duyệt' || p.submissionStatus?.includes('chối');
    const isApproved = !p.submissionStatus || p.submissionStatus === 'Đã phát hành';
    const releaseSlug = p.slug || slug(p.title);
    const playlistsHtml = (p.playlists && p.playlists.length > 0)
      ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">${p.playlists.map(pl => `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:bold;">🌟 ${pl}</span>`).join('')}</div>`
      : '';

    let statusBadge = '';
    if (isDraft) {
      statusBadge = `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1;border-radius:12px;font-size:11px;font-weight:bold;">📝 Bản nháp (Chưa nộp)</span>`;
    } else if (isPending) {
      statusBadge = `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:#fef3c7;color:#b45309;border-radius:12px;font-size:11px;font-weight:bold;">⏳ Đang chờ UniFLOWs duyệt</span>`;
    } else if (isRevision) {
      statusBadge = `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;border-radius:12px;font-size:11px;font-weight:bold;">⚠️ Cần chỉnh sửa lại</span>`;
    } else if (isRejected) {
      statusBadge = `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:#fee2e2;color:#991b1b;border-radius:12px;font-size:11px;font-weight:bold;">❌ Bị từ chối</span>`;
    } else if (isTakedownRequested) {
      statusBadge = `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:#fee2e2;color:#b91c1c;border-radius:12px;font-size:11px;font-weight:bold;">🔴 Yêu cầu gỡ</span>`;
    } else {
      statusBadge = `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:#dcfce7;color:#15803d;border-radius:12px;font-size:11px;font-weight:bold;">🟢 Live trên 150+ DSPs</span>`;
    }

    const splitBadge = p.isSplit
      ? `<span style="display:inline-block;padding:3px 10px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:12px;font-size:11px;font-weight:bold;">🤝 Split ${p.percentage}% (${esc(p.userRole)})</span>`
      : `<span style="display:inline-block;padding:3px 10px;background:#f8fafc;color:#475569;border:1px solid #e2e8f0;border-radius:12px;font-size:11px;font-weight:bold;">⭐ Nghệ sĩ chính (100%)</span>`;

    const artworkSrc = p.artworkUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80';
    const arNote = p.metadata?.arFeedback || p.arFeedback || '';

    const actionButtons = isDraft ? `
      <button type="button" class="button btn-resume-draft-card" data-draft-id="${esc(p.id)}" style="padding:6px 14px;font-size:11px;font-weight:bold;background:#0f172a;color:#fff;border-color:#0f172a;cursor:pointer;">Tiếp tục sửa ✏️</button>
      <button type="button" class="button alt btn-delete-draft-card" data-draft-id="${esc(p.id)}" style="padding:6px 10px;font-size:11px;color:#dc2626;border-color:#fecaca;cursor:pointer;">Xóa nháp ✕</button>
    ` : `
      ${p.audioUrl ? `<a href="${esc(p.audioUrl)}" target="_blank" class="button alt" style="padding:6px 12px;font-size:11px;font-weight:bold;">🎵 Master</a>` : ''}
      ${p.artworkUrl ? `<a href="${esc(p.artworkUrl)}" target="_blank" class="button alt" style="padding:6px 12px;font-size:11px;">🖼 Artwork</a>` : ''}
      <a href="/listen?release=${encodeURIComponent(releaseSlug)}" target="_blank" class="button" style="padding:6px 14px;font-size:11px;font-weight:bold;background:#000;color:#fff;">SmartLink ↗</a>
    `;

    return `
      <div class="portal-release-card ${isDraft ? 'portal-release-card-draft' : ''}" data-draft-id="${esc(p.id || '')}" style="${isRevision ? 'border:2px solid #f87171;' : ''}${isDraft ? 'cursor:pointer;border-left:4px solid #0f172a;' : ''}" ${isDraft ? 'title="Nhấn để tiếp tục chỉnh sửa bản nháp này"' : ''}>
        <img class="portal-release-thumb" src="${esc(artworkSrc)}" alt="${esc(p.title)}">
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
            <span style="font:10px 'DM Mono',monospace;text-transform:uppercase;background:#000;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;">${esc(p.type || 'Single')}</span>
            ${statusBadge}
            ${splitBadge}
          </div>
          <strong style="font-size: 18px; display:block; margin: 4px 0 2px;">${esc(p.title)}</strong>
          <div style="font-size:12px;color:#64748b;margin-bottom:6px;">
            Nghệ sĩ chính: <b>${esc(p.primaryArtistName || artist.name)}</b> · Vai trò: <b>${esc(p.userRole || 'Main')}</b>
          </div>
          ${isDraft ? `
            <div style="font-size:12px;color:#64748b;background:#f8fafc;padding:4px 8px;border-radius:4px;display:inline-block;">
              📝 Tiến trình: <b>${(p.metadata?.draftData?.wizardTracks || []).length || 1} tracks</b> · Thể loại: <b>${esc(p.metadata?.draftData?.genre || 'Chưa chọn')}</b>
            </div>
          ` : `
            <div style="font-size:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
              <span style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-family:'DM Mono',monospace;">🎧 Streams bạn nhận: <b>${p.userStreams.toLocaleString('vi-VN')}</b></span>
              <span style="background:#ecfdf5;color:#047857;padding:2px 8px;border-radius:4px;font-family:'DM Mono',monospace;font-weight:bold;">₫ ${p.userRevenue.toLocaleString('vi-VN')}</span>
            </div>
          `}
          ${playlistsHtml}
          ${arNote ? `
            <div style="margin-top:10px;background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;padding:10px 14px;font-size:13px;color:#9f1239;line-height:1.5;">
              <strong style="display:flex;align-items:center;gap:6px;margin-bottom:3px;color:#be123c;">
                <span>💬 Lời nhắn / Góp ý từ A&R UniFLOWs:</span>
              </strong>
              <div style="white-space:pre-wrap;">${esc(arNote)}</div>
            </div>
          ` : ''}
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          ${actionButtons}
        </div>
        <div>
          ${(p.id && !isDraft && artist.roleType !== 'collab') ? (
            isTakedownRequested
              ? `<span style="font-size:11px;color:#d9534f;font-weight:bold;display:block;">⏳ Đang chờ duyệt gỡ</span>`
              : `<button class="button alt remove" type="button" data-request-takedown="${esc(p.id)}" style="padding:6px 10px;font-size:10px;">Yêu cầu gỡ</button>`
          ) : ''}
        </div>
      </div>
    `;
  }).join('');

  // Attach draft resume and delete events
  list.querySelectorAll('.btn-resume-draft-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const draftId = btn.dataset.draftId;
      let draftData = null;
      if (draftId && draftId !== 'undefined' && Array.isArray(cachedFetchedReleases)) {
        const targetDraft = cachedFetchedReleases.find(r => String(r.id) === String(draftId));
        if (targetDraft) {
          draftData = targetDraft.metadata?.draftData || targetDraft;
        }
      }
      if (!draftData) {
        try {
          const raw = localStorage.getItem('uniflows_release_draft_' + (artist?.id || 'artist'));
          if (raw) draftData = JSON.parse(raw);
        } catch (e) {}
      }
      if (!draftData && Array.isArray(cachedFetchedReleases)) {
        const anyDraft = cachedFetchedReleases.find(r => r.submissionStatus === 'Bản nháp' || r.isDraft);
        if (anyDraft) draftData = anyDraft.metadata?.draftData || anyDraft;
      }
      restoreReleaseDraft(draftData || { id: draftId });
    });
  });

  // Clicking anywhere on draft card triggers edit
  list.querySelectorAll('.portal-release-card-draft').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('a')) return;
      const resumeBtn = card.querySelector('.btn-resume-draft-card');
      if (resumeBtn) {
        resumeBtn.click();
      }
    });
  });

  list.querySelectorAll('.btn-delete-draft-card').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const draftId = btn.dataset.draftId;
      if (confirm('Bạn có chắc chắn muốn xóa bản nháp này không? Dữ liệu nháp chưa nộp sẽ bị hủy.')) {
        await discardReleaseDraft(draftId);
      }
    });
  });

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
        playlists: Array.isArray(meta.playlists) ? meta.playlists : [],
        metadata: meta,
        arFeedback: meta.arFeedback || meta.ar_feedback || ''
      });
    }
  });

  // Check and merge local draft if not already in participatingReleases
  const localDraftRaw = localStorage.getItem('uniflows_release_draft_' + (artist?.id || 'artist'));
  if (localDraftRaw) {
    try {
      const localDraft = JSON.parse(localDraftRaw);
      const draftId = localDraft.id || ('draft_' + (artist?.id || 'artist'));
      if (localDraft && !participatingReleases.some(r => String(r.id) === String(draftId))) {
        participatingReleases.unshift({
          id: draftId,
          title: localDraft.title || 'Bản nháp chưa đặt tên',
          type: localDraft.type || 'Single',
          slug: slug(localDraft.title || 'draft'),
          primaryArtistName: artist.name,
          submissionStatus: 'Bản nháp',
          audioUrl: localDraft.audioExternalUrl || (localDraft.wizardTracks?.[0]?.audioUrl || ''),
          artworkUrl: localDraft.artworkExternalUrl || localDraft.artworkUrl || '',
          links: {},
          totalStreams: 0,
          totalRevenue: 0,
          userStreams: 0,
          userRevenue: 0,
          percentage: 100,
          userRole: 'Nghệ sĩ chính',
          isSplit: false,
          playlists: [],
          metadata: { isDraft: true, draftData: localDraft },
          isDraft: true
        });
      }
    } catch (e) {
      console.warn('Lỗi đọc draft local:', e);
    }
  }

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

  // Render filter items & draft alert banner
  renderReleaseListItems();
  updateActiveDraftBanner();

  // 2. Render Track Earnings Breakdown table with Split percentage
  const trackEarningsList = document.querySelector('#track-earnings-list');
  if (trackEarningsList) {
    if (participatingReleases.length === 0) {
      trackEarningsList.innerHTML = '<p class="empty" style="font-size:13px;padding:16px;background:var(--portal-card-bg);border:1px solid var(--portal-card-border);border-radius:10px;color:var(--portal-text-muted);">Chưa có dữ liệu doanh thu chi tiết từ các tác phẩm.</p>';
    } else {
      trackEarningsList.innerHTML = `
        <div style="border:1px solid var(--portal-card-border);background:var(--portal-card-bg);border-radius:12px;overflow:hidden;box-shadow:var(--portal-shadow);">
          <div style="display:grid;grid-template-columns:2fr 1fr 1.2fr 1fr 1.2fr;background:var(--portal-hover-bg);padding:12px 16px;font-weight:700;font-size:11px;text-transform:uppercase;color:var(--portal-text-muted);border-bottom:1px solid var(--portal-card-border);font-family:'DM Mono',monospace;">
            <span>Tên bản phát hành</span>
            <span>Lượt Streams</span>
            <span>Tổng doanh thu</span>
            <span>Tỷ lệ Split</span>
            <span>Thực nhận</span>
          </div>
          ${participatingReleases.map(p => `
            <div style="display:grid;grid-template-columns:2fr 1fr 1.2fr 1fr 1.2fr;padding:14px 16px;border-top:1px solid var(--portal-card-border);font-size:13px;align-items:center;">
              <div>
                <strong style="font-size:14px;">${esc(p.title)}</strong>
                <span style="display:block;font-size:11px;color:var(--portal-text-muted);margin-top:2px;">${esc(p.primaryArtistName)} · ${esc(p.userRole)}</span>
              </div>
              <span style="font-family:'DM Mono',monospace;">${p.totalStreams.toLocaleString('vi-VN')}</span>
              <span style="color:var(--portal-text-muted);font-family:'DM Mono',monospace;">₫ ${p.totalRevenue.toLocaleString('vi-VN')}</span>
              <b style="color:#2563eb;font-family:'DM Mono',monospace;">${p.percentage}%</b>
              <b style="color:#16a34a;font-family:'DM Mono',monospace;font-size:14px;">₫ ${p.userRevenue.toLocaleString('vi-VN')}</b>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  // Render Periodic Revenue Statements
  renderArtistRevenueStatements(artist);

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
      playlistShowcase.innerHTML = '<p class="empty" style="font-size:13px;padding:16px;background:var(--portal-card-bg);border:1px solid var(--portal-card-border);border-radius:10px;color:var(--portal-text-muted);">Chưa có playlist biên tập ghi nhận trong kỳ này.</p>';
    } else {
      playlistShowcase.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:14px;">
          ${allPlaylists.map(item => `
            <div style="background:var(--portal-card-bg);border:1px solid #fed7aa;padding:16px;border-radius:12px;box-shadow:var(--portal-shadow);">
              <div style="font-size:10px;color:#c2410c;font-weight:700;text-transform:uppercase;margin-bottom:4px;font-family:'DM Mono',monospace;">🌟 Editorial Playlist</div>
              <div style="font-weight:700;font-size:15px;margin-bottom:4px;">${esc(item.playlist)}</div>
              <div style="font-size:12px;color:var(--portal-text-muted);">Bản phát hành: <em>${esc(item.track)}</em></div>
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

  // Calculate percentage between platforms (Strict 0% when no revenue exists)
  const hasRealDspRev = totalDspRev > 0;
  const hasAnyRevenue = (totalDspRev > 0 || totalTrackRevenue > 0 || finalRevNum > 0);

  let spPct = 0, apPct = 0, ytPct = 0, otPct = 0;
  let spVal = 0, apVal = 0, ytVal = 0, otVal = 0;

  if (hasRealDspRev) {
    spVal = spRev; apVal = apRev; ytVal = ytRev; otVal = otRev;
    spPct = Math.round((spRev / totalDspRev) * 100);
    apPct = Math.round((apRev / totalDspRev) * 100);
    ytPct = Math.round((ytRev / totalDspRev) * 100);
    otPct = Math.max(0, 100 - spPct - apPct - ytPct);
  } else if (hasAnyRevenue && finalRevNum > 0) {
    spVal = Math.round(finalRevNum * 0.55);
    apVal = Math.round(finalRevNum * 0.25);
    ytVal = Math.round(finalRevNum * 0.15);
    otVal = Math.round(finalRevNum * 0.05);
    spPct = 55; apPct = 25; ytPct = 15; otPct = 5;
  } else {
    spVal = 0; apVal = 0; ytVal = 0; otVal = 0;
    spPct = 0; apPct = 0; ytPct = 0; otPct = 0;
  }

  const platformsList = [
    { id: 'earn-spotify', ovId: 'overview-spotify', name: 'Spotify', rev: spVal, pct: spPct, color: '#1db954' },
    { id: 'earn-apple', ovId: 'overview-apple', name: 'Apple Music', rev: apVal, pct: apPct, color: '#fc3c44' },
    { id: 'earn-youtube', ovId: 'overview-youtube', name: 'YouTube Music', rev: ytVal, pct: ytPct, color: '#ff0000' },
    { id: 'earn-other', ovId: 'overview-other', name: 'NCT / Zing / khác', rev: otVal, pct: otPct, color: '#8b5cf6' }
  ];

  const maxPct = Math.max(...platformsList.map(p => p.pct));

  platformsList.forEach(p => {
    const isTop = (p.pct === maxPct && maxPct > 0);
    const htmlContent = `₫ ${p.rev.toLocaleString('vi-VN')} <small style="display:block;font-size:11px;color:${isTop ? '#b45309' : 'inherit'};font-weight:${isTop ? 'bold' : 'normal'};margin-top:4px;">${p.pct}% thị phần ${isTop ? '🔥 (Dẫn đầu)' : ''}</small>`;
    
    const el = document.querySelector(`#${p.id}`);
    if (el) el.innerHTML = htmlContent;

    const ovEl = document.querySelector(`#${p.ovId}`);
    if (ovEl) ovEl.textContent = `₫ ${p.rev.toLocaleString('vi-VN')}`;

    const key = p.name === 'Spotify' ? 'spotify' : (p.name === 'Apple Music' ? 'apple' : (p.name === 'YouTube Music' ? 'youtube' : 'other'));
    const badgeEl = document.querySelector(`#dsp-badge-${key}`);
    const barEl = document.querySelector(`#dsp-bar-${key}`);
    if (badgeEl) badgeEl.textContent = `${p.pct}%`;
    if (barEl) barEl.style.width = `${p.pct}%`;
  });

  // Insights Analytics
  const totalStreamsDisplayEl = document.querySelector('#insight-total-streams-display');
  if (totalStreamsDisplayEl) {
    totalStreamsDisplayEl.textContent = `${finalStreamsNum.toLocaleString('vi-VN')} Streams`;
  }

  const chartContainer = document.querySelector('#portal-chart-container');
  const countryListEl = document.querySelector('#portal-country-list');
  const cityListEl = document.querySelector('#portal-city-list');
  const sourceListEl = document.querySelector('#portal-source-list');

  if (chartContainer) {
    if (finalStreamsNum === 0) {
      chartContainer.innerHTML = `
        <div class="portal-empty-chart">
          <div class="empty-icon">📊</div>
          <h4>Chưa có dữ liệu phân tích Stream</h4>
          <p>Biểu đồ thời gian thực và phân tích địa lý sẽ tự động kích hoạt khi các tác phẩm của bạn phát sinh lượt stream đầu tiên trên các nền tảng DSPs.</p>
        </div>
      `;
    } else {
      const months = ['T3', 'T4', 'T5', 'T6', 'T7', 'T8 (Hiện tại)'];
      const trendRatios = [0.12, 0.28, 0.45, 0.65, 0.85, 1.0];
      
      chartContainer.innerHTML = `
        <div class="portal-chart-bars-wrap">
          ${months.map((m, i) => {
            const mStreams = Math.round(finalStreamsNum * trendRatios[i]);
            const barHeightPct = Math.max(12, Math.round(trendRatios[i] * 100));
            const isCurrent = i === months.length - 1;
            return `
              <div class="portal-chart-col">
                <div class="portal-chart-bar" style="height:${barHeightPct}%; background:${isCurrent ? '#3b82f6' : '#1e293b'};">
                  <div class="chart-tooltip">${mStreams.toLocaleString('vi-VN')} streams (${m})</div>
                </div>
                <span class="portal-chart-month" style="${isCurrent ? 'color:#2563eb;font-weight:bold;' : ''}">${m}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  }

  if (countryListEl) {
    if (finalStreamsNum === 0) {
      countryListEl.innerHTML = '<p class="empty" style="font-size:12px;opacity:0.75;padding:12px 0;">Chưa ghi nhận dữ liệu quốc gia.</p>';
    } else {
      const topCountry = artist.topCountry || 'Việt Nam';
      countryListEl.innerHTML = `
        <div class="portal-territory-row">
          <span><b>🇻🇳 ${esc(topCountry)}</b></span>
          <div style="display:flex;align-items:center;">
            <b>78%</b>
            <div class="portal-territory-progress"><div class="portal-territory-progress-fill" style="width:78%;"></div></div>
          </div>
        </div>
        <div class="portal-territory-row">
          <span>🇺🇸 Hoa Kỳ (US)</span>
          <div style="display:flex;align-items:center;">
            <b>12%</b>
            <div class="portal-territory-progress"><div class="portal-territory-progress-fill" style="width:12%;"></div></div>
          </div>
        </div>
        <div class="portal-territory-row">
          <span>🇯🇵 Nhật Bản (JP)</span>
          <div style="display:flex;align-items:center;">
            <b>6%</b>
            <div class="portal-territory-progress"><div class="portal-territory-progress-fill" style="width:6%;"></div></div>
          </div>
        </div>
        <div class="portal-territory-row">
          <span>🌍 Các quốc gia khác</span>
          <div style="display:flex;align-items:center;">
            <b>4%</b>
            <div class="portal-territory-progress"><div class="portal-territory-progress-fill" style="width:4%;"></div></div>
          </div>
        </div>
      `;
    }
  }

  if (cityListEl) {
    if (finalStreamsNum === 0) {
      cityListEl.innerHTML = '<p class="empty" style="font-size:12px;opacity:0.75;padding:12px 0;">Chưa ghi nhận dữ liệu thành phố.</p>';
    } else {
      const topCity = artist.topCity || 'Hồ Chí Minh';
      cityListEl.innerHTML = `
        <div class="portal-territory-row">
          <span><b>🏙️ ${esc(topCity)}</b></span>
          <div style="display:flex;align-items:center;">
            <b>58%</b>
            <div class="portal-territory-progress"><div class="portal-territory-progress-fill" style="width:58%;"></div></div>
          </div>
        </div>
        <div class="portal-territory-row">
          <span>🏙️ Hà Nội</span>
          <div style="display:flex;align-items:center;">
            <b>28%</b>
            <div class="portal-territory-progress"><div class="portal-territory-progress-fill" style="width:28%;"></div></div>
          </div>
        </div>
        <div class="portal-territory-row">
          <span>🏙️ Đà Nẵng</span>
          <div style="display:flex;align-items:center;">
            <b>9%</b>
            <div class="portal-territory-progress"><div class="portal-territory-progress-fill" style="width:9%;"></div></div>
          </div>
        </div>
        <div class="portal-territory-row">
          <span>🏙️ Khác</span>
          <div style="display:flex;align-items:center;">
            <b>5%</b>
            <div class="portal-territory-progress"><div class="portal-territory-progress-fill" style="width:5%;"></div></div>
          </div>
        </div>
      `;
    }
  }

  if (sourceListEl) {
    if (finalStreamsNum === 0) {
      sourceListEl.innerHTML = '<p class="empty" style="font-size:12px;opacity:0.75;padding:12px 0;">Chưa ghi nhận nguồn tiếp cận.</p>';
    } else {
      sourceListEl.innerHTML = `
        <div class="portal-territory-row">
          <span><b>🎧 Editorial Playlists</b></span>
          <div style="display:flex;align-items:center;">
            <b>52%</b>
            <div class="portal-territory-progress"><div class="portal-territory-progress-fill" style="width:52%;"></div></div>
          </div>
        </div>
        <div class="portal-territory-row">
          <span>📻 Algorithmic Radio & Mix</span>
          <div style="display:flex;align-items:center;">
            <b>28%</b>
            <div class="portal-territory-progress"><div class="portal-territory-progress-fill" style="width:28%;"></div></div>
          </div>
        </div>
        <div class="portal-territory-row">
          <span>👤 User Library & Profile</span>
          <div style="display:flex;align-items:center;">
            <b>20%</b>
            <div class="portal-territory-progress"><div class="portal-territory-progress-fill" style="width:20%;"></div></div>
          </div>
        </div>
      `;
    }
  }
}

// ----------------------------------------------------
// RENDER ARTIST REVENUE STATEMENTS (REAL DISTRIBUTOR DATA)
// ----------------------------------------------------
function renderArtistRevenueStatements(art) {
  const container = document.querySelector('#artist-revenue-statements-list');
  if (!container) return;

  const statements = art.revenueStatements || [];
  if (statements.length === 0) {
    container.innerHTML = `
      <div style="background:var(--portal-card-bg);border:1px dashed var(--portal-card-border);border-radius:12px;padding:24px;text-align:center;color:var(--portal-text-muted);">
        <div style="font-size:24px;margin-bottom:6px;">📊</div>
        <p style="margin:0;font-size:13px;font-weight:600;">Chưa có bản báo cáo đối soát nào trong kỳ này.</p>
        <span style="font-size:11px;opacity:0.8;">Báo cáo phân phối quốc tế (CSV/PDF) sẽ tự động xuất hiện tại đây sau khi được bộ phận đối soát kế toán đồng bộ.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display:grid;gap:14px;">
      ${statements.map((stmt, idx) => {
        const dsp = stmt.dspSummary || {};
        const dateStr = stmt.syncedAt ? new Date(stmt.syncedAt).toLocaleDateString('vi-VN') : 'Kỳ này';
        return `
          <div style="background:var(--portal-card-bg);border:1px solid var(--portal-card-border);border-radius:12px;padding:18px 22px;box-shadow:var(--portal-shadow);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;border-bottom:1px solid var(--portal-card-border);padding-bottom:12px;margin-bottom:14px;">
              <div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                  <span style="font-family:'DM Mono',monospace;font-size:11px;font-weight:bold;background:#0f172a;color:#fff;padding:2px 8px;border-radius:4px;">
                    ${esc(stmt.statementNumber || `UFL-STMT-${idx + 1}`)}
                  </span>
                  <span style="font-size:11px;font-family:'DM Mono',monospace;color:var(--portal-text-muted);">
                    📅 Đồng bộ ngày ${esc(dateStr)}
                  </span>
                </div>
                <h4 style="margin:2px 0 0;font-size:16px;letter-spacing:-0.03em;">
                  Kỳ đối soát: <strong>${esc(stmt.statementPeriod || 'Tháng đối soát')}</strong>
                </h4>
                <div style="font-size:11px;color:var(--portal-text-muted);margin-top:2px;">
                  📎 Tệp nguồn: <code>${esc(stmt.fileName || 'revenue_report.csv')}</code>
                  ${stmt.tracksCount ? ` · Bao gồm <b>${stmt.tracksCount}</b> bài hát` : ''}
                </div>
              </div>

              <div style="text-align:right;">
                <span style="font-size:10px;text-transform:uppercase;color:var(--portal-text-muted);font-family:'DM Mono',monospace;">Thực nhận (${esc(stmt.royaltyRate || '80%')})</span>
                <strong style="display:block;font-size:24px;color:#16a34a;font-family:'DM Mono',monospace;letter-spacing:-0.04em;">
                  ₫ ${(Number(stmt.netPayable) || 0).toLocaleString('vi-VN')}
                </strong>
                <span style="font-size:11px;color:var(--portal-text-muted);font-family:'DM Mono',monospace;">
                  Tổng Gross: ₫ ${(Number(stmt.totalGrossRevenue) || 0).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>

            <!-- DSP breakdown badges -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;background:var(--portal-hover-bg);padding:10px 14px;border-radius:8px;">
              <div>
                <span style="font-size:10px;color:#16a34a;font-weight:bold;">🟢 Spotify</span>
                <b style="display:block;font-size:12px;font-family:'DM Mono',monospace;">₫ ${(Number(dsp.spotify?.revenue) || 0).toLocaleString('vi-VN')}</b>
                <small style="font-size:10px;color:var(--portal-text-muted);">${(Number(dsp.spotify?.streams) || 0).toLocaleString('vi-VN')} plays</small>
              </div>
              <div>
                <span style="font-size:10px;color:#dc2626;font-weight:bold;">🍎 Apple Music</span>
                <b style="display:block;font-size:12px;font-family:'DM Mono',monospace;">₫ ${(Number(dsp.apple?.revenue) || 0).toLocaleString('vi-VN')}</b>
                <small style="font-size:10px;color:var(--portal-text-muted);">${(Number(dsp.apple?.streams) || 0).toLocaleString('vi-VN')} plays</small>
              </div>
              <div>
                <span style="font-size:10px;color:#ea580c;font-weight:bold;">📺 YouTube Music</span>
                <b style="display:block;font-size:12px;font-family:'DM Mono',monospace;">₫ ${(Number(dsp.youtube?.revenue) || 0).toLocaleString('vi-VN')}</b>
                <small style="font-size:10px;color:var(--portal-text-muted);">${(Number(dsp.youtube?.streams) || 0).toLocaleString('vi-VN')} plays</small>
              </div>
              <div>
                <span style="font-size:10px;color:#2563eb;font-weight:bold;">🌐 Nền tảng khác</span>
                <b style="display:block;font-size:12px;font-family:'DM Mono',monospace;">₫ ${(Number(dsp.other?.revenue) || 0).toLocaleString('vi-VN')}</b>
                <small style="font-size:10px;color:var(--portal-text-muted);">${(Number(dsp.other?.streams) || 0).toLocaleString('vi-VN')} plays</small>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ----------------------------------------------------
// DYNAMIC ROYALTY SPLITS BUILDER (PORTAL STEP 3)
// ----------------------------------------------------
const splitsContainer = document.querySelector('#royalty-splits-container');
const addSplitBtn = document.querySelector('#add-royalty-split-btn');
const totalSplitsDisplay = document.querySelector('#total-splits-display');

function updateSplitsTotal() {
  let total = 0;
  document.querySelectorAll('#royalty-splits-container .split-pct').forEach(input => {
    total += parseFloat(input.value) || 0;
  });
  if (totalSplitsDisplay) {
    totalSplitsDisplay.textContent = `${total}%`;
    totalSplitsDisplay.style.color = Math.round(total) === 100 ? '#16a34a' : '#dc2626';
  }
}

document.querySelector('#royalty-splits-container')?.addEventListener('input', (e) => {
  if (e.target.classList.contains('split-pct')) {
    updateSplitsTotal();
  }
});

addSplitBtn?.addEventListener('click', () => {
  if (!splitsContainer) return;
  const row = document.createElement('div');
  row.className = 'royalty-split-row';
  row.style = 'display:flex;gap:8px;align-items:center;background:#fff;padding:8px 10px;border:1px solid #e2e8f0;border-radius:6px;';
  row.innerHTML = `
    <input class="split-name" placeholder="Tên nghệ sĩ / Email đối tác" required style="flex:2;padding:8px;font-size:12px;border:1px solid var(--ink);border-radius:4px;">
    <select class="split-role" style="flex:1.5;padding:8px;font-size:12px;background:#fff;border:1px solid var(--ink);border-radius:4px;">
      <option value="Producer">Producer</option>
      <option value="Songwriter">Songwriter</option>
      <option value="Featured Artist">Featured Artist</option>
      <option value="Mix/Master Engineer">Mix/Master Engineer</option>
    </select>
    <div style="display:flex;align-items:center;gap:4px;flex:1;">
      <input class="split-pct" type="number" min="1" max="99" value="20" style="padding:8px;font-size:12px;text-align:right;font-weight:bold;width:100%;border:1px solid var(--ink);border-radius:4px;">
      <span style="font-size:12px;font-weight:bold;">%</span>
    </div>
    <button type="button" class="remove-split-btn button alt" style="padding:6px 10px;font-size:11px;color:#dc2626;border-radius:4px;">✕</button>
  `;
  row.querySelector('.remove-split-btn').onclick = () => {
    row.remove();
    updateSplitsTotal();
  };
  splitsContainer.appendChild(row);
  updateSplitsTotal();
});

// ----------------------------------------------------
// FORM SUBMISSION (WITH DIRECT ARTWORK URL OPTION)
// ----------------------------------------------------
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (artist.roleType === 'collab') {
    alert('Tài khoản Nghệ sĩ Collab không có quyền gửi bản phát hành mới. Vui lòng liên hệ Nghệ sĩ chính hoặc Admin của UniFLOWs.');
    return;
  }

  // 0. Validate Splits
  const splits = [];
  let totalPct = 0;
  document.querySelectorAll('#royalty-splits-container .royalty-split-row').forEach(row => {
    const name = row.querySelector('.split-name')?.value.trim();
    const role = row.querySelector('.split-role')?.value || 'Contributor';
    const percentage = parseFloat(row.querySelector('.split-pct')?.value) || 0;
    if (name && percentage > 0) {
      splits.push({ artistName: name, role, percentage });
      totalPct += percentage;
    }
  });

  if (splits.length > 0 && Math.round(totalPct) !== 100) {
    alert(`Tổng tỷ lệ phân chia Royalty hiện tại là ${totalPct}%. Vui lòng điều chỉnh lại các phần trăm để tổng bằng chính xác 100%.`);
    return;
  }

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

    // 1. Upload Master Audio & Dolby Atmos for all tracks in wizardTracks
    let finalTracklist = [];
    if (wizardTracks.length > 0) {
      submitBtn.textContent = `Đang chuẩn bị ${wizardTracks.length} tracks...`;
      for (let i = 0; i < wizardTracks.length; i++) {
        const tr = wizardTracks[i];
        let tAudioUrl = tr.audioUrl || '';
        if (tr.audioFile) {
          submitBtn.textContent = `Đang tải Audio (${i + 1}/${wizardTracks.length}): ${tr.title || 'Track ' + (i + 1)}...`;
          tAudioUrl = await uploadAudioFile(tr.audioFile, `${artist.id}_${slug(v.title)}_tr${i + 1}`);
        }

        let tDolbyUrl = tr.dolbyAtmosUrl || '';
        if (tr.dolbyAtmosFile) {
          submitBtn.textContent = `Đang tải Dolby Atmos (${i + 1}/${wizardTracks.length}): ${tr.title || 'Track ' + (i + 1)}...`;
          tDolbyUrl = await uploadAudioFile(tr.dolbyAtmosFile, `${artist.id}_${slug(v.title)}_dolby_tr${i + 1}`);
        }

        finalTracklist.push({
          trackNum: i + 1,
          title: tr.title || `Track ${i + 1}`,
          featuredArtist: tr.featuredArtist || '',
          audioUrl: tAudioUrl,
          dolbyAtmosUrl: tDolbyUrl,
          lyricsText: tr.lyricsText || '',
          lyricsLrc: tr.lyricsLrc || '',
          credits: tr.credits || [],
          explicit: tr.explicit === true,
          isrc: tr.isrc || '',
          duration: tr.duration || ''
        });
      }
      if (finalTracklist[0]?.audioUrl) {
        audioUrl = finalTracklist[0].audioUrl;
      }
    } else {
      if (audioFile) {
        submitBtn.textContent = 'Đang tải Audio...';
        audioUrl = await uploadAudioFile(audioFile, `${artist.id}_${slug(v.title)}`);
      } else if (v.audioExternalUrl && v.audioExternalUrl.trim()) {
        audioUrl = v.audioExternalUrl.trim();
      }
      finalTracklist = [{
        trackNum: 1,
        title: v.title,
        featuredArtist: v.featuredArtist || '',
        audioUrl,
        dolbyAtmosUrl: '',
        lyricsText: '',
        lyricsLrc: '',
        credits: createDefaultCredits(),
        explicit: v.explicit === 'true',
        isrc: ''
      }];
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

    // 3. Resolve UPC code & Credits
    let finalUpc = '';
    if (v.upc_choice === 'custom' && v.upc && v.upc.trim()) {
      finalUpc = v.upc.trim();
    } else {
      finalUpc = 'Auto-assigned by UniFLOWs GS1';
    }

    const isExplicit = v.explicit === 'true' || finalTracklist.some(t => t.explicit === true);

    const finalSongwriters = v.songwriters?.trim() || [...new Set(finalTracklist.flatMap(t => (t.credits || []).filter(c => c.role && (c.role.includes('Songwriter') || c.role.includes('Composer') || c.role.includes('Lyricist'))).map(c => c.name.trim()).filter(Boolean)))].join(', ') || artist.name;
    const finalProducers = v.producers?.trim() || [...new Set(finalTracklist.flatMap(t => (t.credits || []).filter(c => c.role && (c.role.includes('Producer') || c.role.includes('Beatmaker'))).map(c => c.name.trim()).filter(Boolean)))].join(', ') || 'UniFLOWs Label';

    const links = {};
    if (v.linkSpotify) links.spotify = v.linkSpotify.trim();
    if (v.linkApple) links.apple = v.linkApple.trim();
    if (v.linkYoutube) links.youtube = v.linkYoutube.trim();
    if (v.linkZing) links.zingmp3 = v.linkZing.trim();

    // DSP and Territory resolution
    const dspCheckboxes = document.querySelectorAll('#dsp-grid-container .dsp-checkbox:checked');
    const selectedDSPs = Array.from(dspCheckboxes).map(cb => cb.value);
    const territoryModeVal = form.querySelector('input[name="territory_mode"]:checked')?.value || 'worldwide';
    const countryCheckboxes = document.querySelectorAll('#territory-countries-grid .country-checkbox:checked');
    const selectedCountries = Array.from(countryCheckboxes).map(cb => cb.value);

    let finalTerritoriesDesc = 'Toàn cầu (Worldwide - 171 Quốc gia)';
    if (territoryModeVal === 'custom') {
      finalTerritoriesDesc = `Tùy chọn (${selectedCountries.length} Quốc gia)`;
    }

    const metadataPayload = {
      ...v,
      splits,
      upc: finalUpc,
      genre: v.genre || 'V-Pop',
      secondaryGenre: v.secondaryGenre || '',
      selectedDSPs,
      territoryMode: territoryModeVal,
      selectedCountries,
      territories: finalTerritoriesDesc,
      syncLicensingConsent: v.syncLicensingConsent === 'on' || v.syncLicensingConsent === true
    };

    const newReleaseObj = {
      title: v.title,
      type: releaseTypeFormatted,
      slug: releaseSlug,
      genre: v.genre || 'V-Pop',
      secondaryGenre: v.secondaryGenre || '',
      links,
      submissionStatus: 'Đang chờ UniFLOWs duyệt',
      credits: {
        primaryArtist: v.primaryArtist || artist.name,
        featuredArtist: v.featuredArtist || '',
        songwriters: finalSongwriters,
        producers: finalProducers,
        phonogram: v.phonogram || '℗ 2026 UniFLOWs Label',
        copyright: v.copyright || '© 2026 UniFLOWs Label'
      },
      metadata: metadataPayload,
      audioUrl,
      artworkUrl,
      tracklist: finalTracklist
    };

    // 4. Lưu vào Database (Cập nhật bản nháp nếu có, hoặc tạo mới)
    if (isSupabaseConfigured()) {
      submitBtn.textContent = 'Đang lưu dữ liệu...';
      let inserted = null;

      if (currentDraftId) {
        const { data: updated, error: dbError } = await supabase.from('releases').update({
          artist_id: artist.id,
          title: v.title,
          type: releaseTypeFormatted,
          release_date: v.releaseDate || null,
          pre_save_date: v.preSaveDate || null,
          slug: releaseSlug,
          genre: v.genre || 'V-Pop',
          language: v.language || 'Tiếng Việt',
          explicit: isExplicit,
          upc: finalUpc,
          tracks: finalTracklist,
          primary_artist: v.primaryArtist || artist.name,
          featured_artist: v.featuredArtist || '',
          songwriters: finalSongwriters,
          producers: finalProducers,
          phonogram: v.phonogram || '℗ 2026 UniFLOWs Label',
          copyright: v.copyright || '© 2026 UniFLOWs Label',
          territories: finalTerritoriesDesc,
          pricing: v.pricing,
          notes: v.notes,
          submission_status: 'Đang chờ UniFLOWs duyệt',
          audio_url: audioUrl,
          artwork_url: artworkUrl,
          links,
          metadata: {
            ...metadataPayload,
            tracklist: finalTracklist
          }
        }).eq('id', currentDraftId).select().single();

        if (dbError) throw dbError;
        inserted = updated;
      } else {
        const { data: newRow, error: dbError } = await supabase.from('releases').insert({
          artist_id: artist.id,
          title: v.title,
          type: releaseTypeFormatted,
          release_date: v.releaseDate || null,
          pre_save_date: v.preSaveDate || null,
          slug: releaseSlug,
          genre: v.genre || 'V-Pop',
          language: v.language || 'Tiếng Việt',
          explicit: isExplicit,
          upc: finalUpc,
          tracks: finalTracklist,
          primary_artist: v.primaryArtist || artist.name,
          featured_artist: v.featuredArtist || '',
          songwriters: finalSongwriters,
          producers: finalProducers,
          phonogram: v.phonogram || '℗ 2026 UniFLOWs Label',
          copyright: v.copyright || '© 2026 UniFLOWs Label',
          territories: finalTerritoriesDesc,
          pricing: v.pricing,
          notes: v.notes,
          submission_status: 'Đang chờ UniFLOWs duyệt',
          audio_url: audioUrl,
          artwork_url: artworkUrl,
          links,
          metadata: {
            ...metadataPayload,
            tracklist: finalTracklist
          }
        }).select().single();

        if (dbError) throw dbError;
        inserted = newRow;
      }

      if (inserted) newReleaseObj.id = inserted.id;
    }

    // 5. Cập nhật state local & xóa draft đã nộp
    localStorage.removeItem('uniflows_release_draft_' + (artist?.id || 'artist'));
    currentDraftId = null;
    updateActiveDraftBanner();

    artist.products = artist.products || [];
    const existIdx = artist.products.findIndex(p => p.id === newReleaseObj.id);
    if (existIdx >= 0) {
      artist.products[existIdx] = newReleaseObj;
    } else {
      artist.products.unshift(newReleaseObj);
    }
    await saveData(data);

    // 6. Gửi thông báo đến Admin Notification Center
    await dispatchAdminNotification({
      type: 'new_release',
      title: `Bản phát hành mới: "${v.title}" (${v.type || 'Single'})`,
      message: `Nghệ sĩ "${artist.name}" vừa nộp bản phát hành mới "${v.title}" (${finalTracklist.length} bài hát) để duyệt.`,
      artistId: artist.id,
      artistName: artist.name,
      artistAvatar: artworkUrl,
      targetTab: 'admin-tab-releases',
      details: newReleaseObj
    });

    form.reset();
    wizardTracks = [];
    currentDraftId = null;
    setTrackMode('single');
    if (audioFilename) audioFilename.textContent = 'Thả hoặc chọn file master WAV/FLAC vào đây';
    if (artworkFilename) artworkFilename.textContent = 'Artwork 3000 × 3000 px';
    if (primaryArtistInput) primaryArtistInput.value = artist.name;

    releaseDialog?.close();
    showNotice(`✓ Đã gửi bản phát hành "${v.title}" (${finalTracklist.length} bài hát) thành công. Đang chờ UniFLOWs duyệt!`);
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
      payoutHistoryList.innerHTML = '<p class="empty" style="font-size:13px;padding:16px;background:var(--portal-card-bg);border:1px solid var(--portal-card-border);border-radius:10px;color:var(--portal-text-muted);">Chưa có yêu cầu rút tiền nào được tạo.</p>';
    } else {
      payoutHistoryList.innerHTML = `
        <div style="border:1px solid var(--portal-card-border);background:var(--portal-card-bg);border-radius:12px;overflow:hidden;box-shadow:var(--portal-shadow);margin-top:10px;">
          <div style="display:grid;grid-template-columns:120px 140px 1fr 160px;background:var(--portal-hover-bg);padding:12px 16px;font-weight:700;font-size:11px;text-transform:uppercase;color:var(--portal-text-muted);border-bottom:1px solid var(--portal-card-border);font-family:'DM Mono',monospace;">
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
              <div style="border-bottom:1px solid var(--portal-card-border);padding:14px 16px;font-size:13px;">
                <div style="display:grid;grid-template-columns:120px 140px 1fr 160px;align-items:center;">
                  <span style="font-size:12px;color:var(--portal-text-dim);font-family:'DM Mono',monospace;">${esc(dateStr)}</span>
                  <strong style="font-size:15px;font-family:'DM Mono',monospace;color:${isPending ? '#d97706' : (isApproved ? '#16a34a' : '#dc2626')};">
                    ₫ ${parseInt(req.amount || 0).toLocaleString('vi-VN')}
                  </strong>
                  <span>
                    <strong>${esc(bank.bank || 'Ngân hàng')}</strong> · <span style="font-family:monospace;font-weight:bold;">${esc(bank.accountNumber || '')}</span> (${esc(bank.accountName || '')})
                  </span>
                  <span>
                    <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:bold;background:${isPending ? '#fef3c7' : (isApproved ? '#dcfce7' : '#fee2e2')};color:${isPending ? '#b45309' : (isApproved ? '#15803d' : '#cf1322')};">
                      ${isPending ? '⏳ Đang chờ xem xét' : (isApproved ? '✅ Đã thanh toán' : '❌ Bị từ chối')}
                    </span>
                  </span>
                </div>
                ${(isRejected && req.rejection_reason) ? `
                  <div style="margin-top:10px;background:#fff2f0;border:1px solid #ffccc7;padding:8px 12px;font-size:12px;color:#cf1322;border-radius:6px;">
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

// Full List of Banks in Vietnam (NAPAS, Commercial, State-owned, Foreign branches & Digital Wallets) sorted A-Z
export const VIETNAM_BANKS = [
  { code: 'ABBANK', shortName: 'ABBANK', nameVi: 'Ngân hàng TMCP An Bình', nameEn: 'An Binh Commercial Joint Stock Bank' },
  { code: 'ACB', shortName: 'ACB', nameVi: 'Ngân hàng TMCP Á Châu', nameEn: 'Asia Commercial Joint Stock Bank' },
  { code: 'Agribank', shortName: 'Agribank', nameVi: 'Ngân hàng Nông nghiệp & Phát triển Nông thôn Việt Nam', nameEn: 'Vietnam Bank for Agriculture and Rural Development' },
  { code: 'ANZ', shortName: 'ANZ Bank', nameVi: 'Ngân hàng TNHH MTV ANZ Việt Nam', nameEn: 'ANZ Bank (Vietnam) Limited' },
  { code: 'BacABank', shortName: 'Bac A Bank', nameVi: 'Ngân hàng TMCP Bắc Á', nameEn: 'Bac A Commercial Joint Stock Bank' },
  { code: 'BaoVietBank', shortName: 'BaoViet Bank', nameVi: 'Ngân hàng TMCP Bảo Việt', nameEn: 'BaoViet Commercial Joint Stock Bank' },
  { code: 'BIDV', shortName: 'BIDV', nameVi: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', nameEn: 'Bank for Investment and Development of Vietnam' },
  { code: 'BVBank', shortName: 'BVBank (Bản Việt)', nameVi: 'Ngân hàng TMCP Bản Việt', nameEn: 'Viet Capital Commercial Joint Stock Bank' },
  { code: 'CAKE', shortName: 'CAKE by VPBank', nameVi: 'Ngân hàng số CAKE by VPBank', nameEn: 'CAKE Digital Bank by VPBank' },
  { code: 'CBBank', shortName: 'CBBank', nameVi: 'Ngân hàng Xây Dựng (CB)', nameEn: 'Construction Commercial One Member Limited Liability Bank' },
  { code: 'CIMB', shortName: 'CIMB Bank', nameVi: 'Ngân hàng TNHH MTV CIMB Việt Nam', nameEn: 'CIMB Bank Vietnam Limited' },
  { code: 'Co-opBank', shortName: 'Co-opBank', nameVi: 'Ngân hàng Hợp tác xã Việt Nam', nameEn: 'Co-operative Bank of Vietnam' },
  { code: 'DBS', shortName: 'DBS Bank', nameVi: 'Ngân hàng DBS - Chi nhánh TP. Hồ Chí Minh', nameEn: 'Development Bank of Singapore Vietnam' },
  { code: 'DongABank', shortName: 'DongA Bank', nameVi: 'Ngân hàng TMCP Đông Á', nameEn: 'DongA Commercial Joint Stock Bank' },
  { code: 'Eximbank', shortName: 'Eximbank', nameVi: 'Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam', nameEn: 'Vietnam Export Import Commercial Joint Stock Bank' },
  { code: 'GPBank', shortName: 'GPBank', nameVi: 'Ngân hàng Dầu Khí Toàn Cầu', nameEn: 'Global Petro Commercial Bank' },
  { code: 'HDBank', shortName: 'HDBank', nameVi: 'Ngân hàng TMCP Phát triển TP. Hồ Chí Minh', nameEn: 'Ho Chi Minh City Development Commercial Joint Stock Bank' },
  { code: 'HongLeong', shortName: 'Hong Leong Bank', nameVi: 'Ngân hàng TNHH MTV Hong Leong Việt Nam', nameEn: 'Hong Leong Bank Vietnam Limited' },
  { code: 'HSBC', shortName: 'HSBC Vietnam', nameVi: 'Ngân hàng TNHH MTV HSBC Việt Nam', nameEn: 'HSBC Bank (Vietnam) Limited' },
  { code: 'IBK', shortName: 'IBK Bank', nameVi: 'Ngân hàng Công nghiệp Hàn Quốc (IBK)', nameEn: 'Industrial Bank of Korea Vietnam' },
  { code: 'IVB', shortName: 'Indovina Bank (IVB)', nameVi: 'Ngân hàng TNHH Indovina', nameEn: 'Indovina Bank Limited' },
  { code: 'KB', shortName: 'KB Kookmin Bank', nameVi: 'Ngân hàng KB Kookmin - Chi nhánh TP.HCM / Hà Nội', nameEn: 'KB Kookmin Bank Vietnam' },
  { code: 'KienlongBank', shortName: 'KienlongBank', nameVi: 'Ngân hàng TMCP Kiên Long', nameEn: 'Kienlong Commercial Joint Stock Bank' },
  { code: 'KBank', shortName: 'KPlus by KBank', nameVi: 'Ngân hàng Đại chúng TNHH Kasikornbank - Chi nhánh TP.HCM', nameEn: 'Kasikornbank Vietnam (KBank)' },
  { code: 'LPBank', shortName: 'LPBank (Lộc Phát)', nameVi: 'Ngân hàng TMCP Lộc Phát Việt Nam (LienVietPostBank cũ)', nameEn: 'Fortune Vietnam Joint Stock Commercial Bank' },
  { code: 'MB', shortName: 'MB Bank', nameVi: 'Ngân hàng TMCP Quân Đội', nameEn: 'Military Commercial Joint Stock Bank' },
  { code: 'MSB', shortName: 'MSB (Hàng Hải)', nameVi: 'Ngân hàng TMCP Hàng Hải Việt Nam', nameEn: 'Vietnam Maritime Commercial Joint Stock Bank' },
  { code: 'NamABank', shortName: 'Nam A Bank', nameVi: 'Ngân hàng TMCP Nam Á', nameEn: 'Nam A Commercial Joint Stock Bank' },
  { code: 'NCB', shortName: 'NCB (Quốc Dân)', nameVi: 'Ngân hàng TMCP Quốc Dân', nameEn: 'National Citizen Commercial Joint Stock Bank' },
  { code: 'NongHyup', shortName: 'NongHyup Bank', nameVi: 'Ngân hàng NongHyup - Chi nhánh Hà Nội', nameEn: 'NongHyup Bank Vietnam' },
  { code: 'OCB', shortName: 'OCB (Phương Đông)', nameVi: 'Ngân hàng TMCP Phương Đông', nameEn: 'Orient Commercial Joint Stock Bank' },
  { code: 'OceanBank', shortName: 'OceanBank', nameVi: 'Ngân hàng Thương mại MTV Đại Dương', nameEn: 'Ocean Commercial One Member Limited Liability Bank' },
  { code: 'PayPal', shortName: 'PayPal', nameVi: 'Tài khoản thanh toán quốc tế PayPal (USD)', nameEn: 'PayPal International Payment Gateway' },
  { code: 'PGBank', shortName: 'PGBank', nameVi: 'Ngân hàng TMCP Thịnh vượng và Phát triển', nameEn: 'Prosperity and Development Joint Stock Commercial Bank' },
  { code: 'PublicBank', shortName: 'Public Bank Vietnam', nameVi: 'Ngân hàng TNHH MTV Public Việt Nam', nameEn: 'Public Bank Vietnam Limited' },
  { code: 'PVcomBank', shortName: 'PVcomBank', nameVi: 'Ngân hàng TMCP Đại Chúng Việt Nam', nameEn: 'Vietnam Public Joint Stock Commercial Bank' },
  { code: 'Saigonbank', shortName: 'Saigonbank', nameVi: 'Ngân hàng TMCP Sài Gòn Công Thương', nameEn: 'Saigon Bank for Industry and Trade' },
  { code: 'SCB', shortName: 'SCB', nameVi: 'Ngân hàng TMCP Sài Gòn', nameEn: 'Saigon Commercial Joint Stock Bank' },
  { code: 'SeABank', shortName: 'SeABank', nameVi: 'Ngân hàng TMCP Đông Nam Á', nameEn: 'Southeast Asia Commercial Joint Stock Bank' },
  { code: 'SHB', shortName: 'SHB', nameVi: 'Ngân hàng TMCP Sài Gòn - Hà Nội', nameEn: 'Saigon - Hanoi Commercial Joint Stock Bank' },
  { code: 'ShinhanBank', shortName: 'Shinhan Bank', nameVi: 'Ngân hàng TNHH MTV Shinhan Việt Nam', nameEn: 'Shinhan Bank Vietnam Limited' },
  { code: 'ShopeePay', shortName: 'Ví ShopeePay', nameVi: 'Ví Điện Tử ShopeePay (AirPay cũ)', nameEn: 'ShopeePay Vietnam Digital Wallet' },
  { code: 'StandardChartered', shortName: 'Standard Chartered', nameVi: 'Ngân hàng TNHH MTV Standard Chartered Việt Nam', nameEn: 'Standard Chartered Bank (Vietnam) Limited' },
  { code: 'TCB', shortName: 'Techcombank', nameVi: 'Ngân hàng TMCP Kỹ Thương Việt Nam', nameEn: 'Vietnam Technological and Commercial Joint Stock Bank' },
  { code: 'Timo', shortName: 'Timo Digital Bank', nameVi: 'Ngân hàng số Timo (by BVBank)', nameEn: 'Timo Digital Bank Powered by BVBank' },
  { code: 'TNEX', shortName: 'TNEX by MSB', nameVi: 'Ngân hàng thuần số TNEX (by MSB)', nameEn: 'TNEX Digital Bank Powered by MSB' },
  { code: 'TPBank', shortName: 'TPBank', nameVi: 'Ngân hàng TMCP Tiên Phong', nameEn: 'Tien Phong Commercial Joint Stock Bank' },
  { code: 'UBank', shortName: 'UBank by VPBank', nameVi: 'Ngân hàng số UBank by VPBank', nameEn: 'UBank Digital Bank Powered by VPBank' },
  { code: 'UOB', shortName: 'United Overseas Bank (UOB)', nameVi: 'Ngân hàng TNHH MTV United Overseas Bank Việt Nam', nameEn: 'United Overseas Bank (Vietnam) Limited' },
  { code: 'VIB', shortName: 'VIB', nameVi: 'Ngân hàng TMCP Quốc tế Việt Nam', nameEn: 'Vietnam International Commercial Joint Stock Bank' },
  { code: 'VietABank', shortName: 'VietABank', nameVi: 'Ngân hàng TMCP Việt Á', nameEn: 'Viet A Commercial Joint Stock Bank' },
  { code: 'VietBank', shortName: 'VietBank', nameVi: 'Ngân hàng TMCP Việt Nam Thương Tín', nameEn: 'Vietnam Thuong Tin Commercial Joint Stock Bank' },
  { code: 'Vietcombank', shortName: 'Vietcombank (VCB)', nameVi: 'Ngân hàng TMCP Ngoại Thương Việt Nam', nameEn: 'Joint Stock Commercial Bank for Foreign Trade of Vietnam' },
  { code: 'VietinBank', shortName: 'VietinBank (CTG)', nameVi: 'Ngân hàng TMCP Công Thương Việt Nam', nameEn: 'Vietnam Joint Stock Commercial Bank for Industry and Trade' },
  { code: 'ViettelMoney', shortName: 'Ví Viettel Money', nameVi: 'Tiền di động / Ví điện tử Viettel Money (ViettelPay)', nameEn: 'Viettel Money Digital Payment Service' },
  { code: 'MoMo', shortName: 'Ví MoMo', nameVi: 'Ví Điện Tử MoMo (M-Service)', nameEn: 'MoMo E-Wallet & Digital Financial Service' },
  { code: 'VNPay', shortName: 'Ví VNPay', nameVi: 'Ví Điện Tử VNPay', nameEn: 'VNPay Digital E-Wallet' },
  { code: 'VPBank', shortName: 'VPBank', nameVi: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', nameEn: 'Vietnam Prosperity Joint Stock Commercial Bank' },
  { code: 'VRB', shortName: 'VRB Bank', nameVi: 'Ngân hàng Liên doanh Việt - Nga', nameEn: 'Vietnam - Russia Joint Venture Bank' },
  { code: 'WooriBank', shortName: 'Woori Bank Vietnam', nameVi: 'Ngân hàng TNHH MTV Woori Việt Nam', nameEn: 'Woori Bank Vietnam Limited' },
  { code: 'ZaloPay', shortName: 'Ví ZaloPay', nameVi: 'Ví Điện Tử ZaloPay (ZION)', nameEn: 'ZaloPay E-Wallet & Digital Platform' }
];

function removeVietnameseTones(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

let payoutBankDropdownHelper = null;
let profileBankDropdownHelper = null;

function setupSearchableBankDropdown({
  wrapperSelector,
  searchInputSelector,
  hiddenInputSelector,
  dropdownSelector,
  onSelect
}) {
  const wrapper = document.querySelector(wrapperSelector);
  const searchInput = document.querySelector(searchInputSelector);
  const hiddenInput = document.querySelector(hiddenInputSelector);
  const dropdown = document.querySelector(dropdownSelector);

  if (!wrapper || !searchInput || !dropdown) return null;

  let highlightedIndex = -1;
  let currentFilteredList = [...VIETNAM_BANKS];
  let isSelectingOrClosing = false;

  function closeDropdown() {
    wrapper.classList.remove('open');
    dropdown.style.setProperty('display', 'none', 'important');
    highlightedIndex = -1;
    isSelectingOrClosing = true;
    setTimeout(() => { isSelectingOrClosing = false; }, 350);
  }

  function openDropdown() {
    if (isSelectingOrClosing) return;
    wrapper.classList.add('open');
    dropdown.style.setProperty('display', 'flex', 'important');
    if (searchInput.value.includes('—') || (hiddenInput && hiddenInput.value)) {
      renderList(VIETNAM_BANKS);
    } else {
      filterBanks(searchInput.value.trim());
    }
  }

  function selectBank(bank) {
    if (!bank) return;
    const displayVal = `${bank.shortName} (${bank.code}) — ${bank.nameVi}`;
    const valueVal = `${bank.shortName} (${bank.code})`;
    searchInput.value = displayVal;
    if (hiddenInput) {
      hiddenInput.value = valueVal;
      hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
      hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    closeDropdown();
    try { searchInput.blur(); } catch {}
    if (typeof onSelect === 'function') {
      onSelect(bank);
    }
  }

  function renderList(list) {
    currentFilteredList = list;
    highlightedIndex = -1;
    if (list.length === 0) {
      dropdown.innerHTML = `
        <div style="padding:14px 16px;font-size:12.5px;color:var(--portal-text-dim);text-align:center;">
          Không tìm thấy ngân hàng hoặc ví điện tử nào phù hợp.
        </div>
        <div class="bank-dropdown-footer-close" style="padding:8px 10px;text-align:center;border-top:1px solid var(--glass-border-subtle);background:var(--glass-bg-subtle);border-radius:0 0 14px 14px;">
          <button type="button" class="button alt bank-close-explicit-btn" style="width:100%;font-size:12px;padding:8px 12px;border-radius:8px;font-weight:800;cursor:pointer;background:#ef4444;color:#fff;border-color:#ef4444;">✕ Đóng danh sách (Close)</button>
        </div>
      `;
      const cBtn = dropdown.querySelector('.bank-close-explicit-btn');
      const handleClose = (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeDropdown();
      };
      cBtn?.addEventListener('click', handleClose);
      cBtn?.addEventListener('touchend', handleClose);
      return;
    }

    const currentVal = hiddenInput?.value || '';
    const itemsHtml = list.map((b, idx) => {
      const isSelected = currentVal === `${b.shortName} (${b.code})` || currentVal === b.shortName || currentVal === b.code;
      return `
        <div class="bank-option-item ${isSelected ? 'selected' : ''}" data-index="${idx}">
          <div class="bank-option-main">
            <span class="bank-option-name">${esc(b.shortName)}</span>
            <span class="bank-option-badge">${esc(b.code)}</span>
          </div>
          <div class="bank-option-sub">
            <div style="font-weight:600;color:var(--portal-text-main);">${esc(b.nameVi)}</div>
            <div style="font-size:10.5px;opacity:0.75;font-style:italic;">${esc(b.nameEn)}</div>
          </div>
        </div>
      `;
    }).join('');

    dropdown.innerHTML = `
      <div class="bank-options-scroll" style="display:flex;flex-direction:column;gap:3px;max-height:240px;overflow-y:auto;-webkit-overflow-scrolling:touch;">
        ${itemsHtml}
      </div>
      <div class="bank-dropdown-footer-close" style="padding:8px 10px;text-align:center;border-top:1px solid var(--glass-border-subtle);background:var(--glass-bg-subtle);border-radius:0 0 14px 14px;margin-top:4px;">
        <button type="button" class="button alt bank-close-explicit-btn" style="width:100%;font-size:12px;padding:8px 12px;border-radius:8px;font-weight:800;cursor:pointer;background:#ef4444;color:#fff;border-color:#ef4444;">✕ Đóng danh sách (Close)</button>
      </div>
    `;

    dropdown.querySelectorAll('.bank-option-item').forEach(item => {
      const handleSelect = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(item.dataset.index, 10);
        const selected = currentFilteredList[index];
        if (selected) {
          selectBank(selected);
        }
      };
      item.addEventListener('click', handleSelect);
      item.addEventListener('touchend', handleSelect);
      item.addEventListener('mousedown', (e) => {
        // Prevent stealing focus and closing prematurely before click
        e.preventDefault();
      });
    });

    const closeBtn = dropdown.querySelector('.bank-close-explicit-btn');
    const handleClose = (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeDropdown();
    };
    closeBtn?.addEventListener('click', handleClose);
    closeBtn?.addEventListener('touchend', handleClose);
    closeBtn?.addEventListener('mousedown', (e) => e.preventDefault());
  }

  function filterBanks(query) {
    if (!query || query.includes('—')) {
      renderList(VIETNAM_BANKS);
      return;
    }
    const cleanQ = removeVietnameseTones(query).replace(/[^a-z0-9\s]/gi, ' ');
    const words = cleanQ.split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      renderList(VIETNAM_BANKS);
      return;
    }

    const filtered = VIETNAM_BANKS.filter(b => {
      const bankSearchCorpus = removeVietnameseTones(`${b.shortName} ${b.code} ${b.nameVi} ${b.nameEn}`).replace(/[^a-z0-9\s]/gi, ' ');
      return words.every(w => bankSearchCorpus.includes(w));
    });
    renderList(filtered);
  }

  searchInput.addEventListener('focus', () => {
    if (!isSelectingOrClosing) {
      openDropdown();
      if (searchInput.value) {
        setTimeout(() => {
          try { searchInput.select(); } catch {}
        }, 50);
      }
    }
  });

  searchInput.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!wrapper.classList.contains('open')) {
      openDropdown();
    }
  });

  const arrow = wrapper.querySelector('.bank-search-arrow');
  if (arrow) {
    arrow.style.cursor = 'pointer';
    const handleArrowClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (wrapper.classList.contains('open')) {
        closeDropdown();
      } else {
        openDropdown();
        searchInput.focus();
      }
    };
    arrow.addEventListener('click', handleArrowClick);
    arrow.addEventListener('touchend', handleArrowClick);
  }

  searchInput.addEventListener('input', () => {
    if (!wrapper.classList.contains('open')) {
      wrapper.classList.add('open');
      dropdown.style.setProperty('display', 'flex', 'important');
    }
    filterBanks(searchInput.value.trim());
  });

  searchInput.addEventListener('keydown', (e) => {
    if (!wrapper.classList.contains('open')) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        openDropdown();
        e.preventDefault();
      }
      return;
    }

    const items = dropdown.querySelectorAll('.bank-option-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedIndex = (highlightedIndex + 1) % items.length;
      updateHighlight(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIndex = (highlightedIndex - 1 + items.length) % items.length;
      updateHighlight(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < currentFilteredList.length) {
        selectBank(currentFilteredList[highlightedIndex]);
      } else if (currentFilteredList.length > 0) {
        selectBank(currentFilteredList[0]);
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  function updateHighlight(items) {
    items.forEach((it, idx) => {
      if (idx === highlightedIndex) {
        it.classList.add('highlighted');
        it.scrollIntoView({ block: 'nearest' });
      } else {
        it.classList.remove('highlighted');
      }
    });
  }

  const handleOutsideClick = (e) => {
    if (!wrapper.contains(e.target) && !dropdown.contains(e.target)) {
      closeDropdown();
    }
  };

  document.addEventListener('click', handleOutsideClick, true);
  document.addEventListener('touchend', handleOutsideClick, true);

  return {
    setBank: (bankCodeOrShortName) => {
      if (!bankCodeOrShortName) {
        searchInput.value = '';
        if (hiddenInput) hiddenInput.value = '';
        return;
      }
      const b = VIETNAM_BANKS.find(x => 
        x.code.toLowerCase() === bankCodeOrShortName.toLowerCase() || 
        x.shortName.toLowerCase() === bankCodeOrShortName.toLowerCase() ||
        `${x.shortName} (${x.code})`.toLowerCase() === bankCodeOrShortName.toLowerCase()
      );
      if (b) {
        searchInput.value = `${b.shortName} (${b.code}) — ${b.nameVi}`;
        if (hiddenInput) hiddenInput.value = `${b.shortName} (${b.code})`;
      } else {
        searchInput.value = bankCodeOrShortName;
        if (hiddenInput) hiddenInput.value = bankCodeOrShortName;
      }
    },
    close: closeDropdown,
    open: openDropdown
  };
}

function initSearchableBankDropdown() {
  payoutBankDropdownHelper = setupSearchableBankDropdown({
    wrapperSelector: '#payout-bank-wrapper',
    searchInputSelector: '#payout-bank-search',
    hiddenInputSelector: '#payout-bank',
    dropdownSelector: '#payout-bank-dropdown'
  });
}

function initProfileSettingsDialog() {
  const profileDialog = document.querySelector('#profile-settings-dialog');
  const openProfileBtns = document.querySelectorAll('#open-profile-settings-btn, #top-nav-profile-pill');
  const closeProfileBtn = document.querySelector('#close-profile-dialog-btn');
  const noticeEl = document.querySelector('#profile-settings-notice');
  const tabs = document.querySelectorAll('.profile-tab-btn');
  const panels = document.querySelectorAll('.profile-tab-panel');

  if (!profileDialog) return;

  // 1. Tab Switching
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTabId = btn.dataset.tab;
      tabs.forEach(b => b.classList.toggle('active', b === btn));
      panels.forEach(p => p.classList.toggle('active', p.id === targetTabId));
      if (noticeEl) noticeEl.style.display = 'none';
    });
  });

  // 2. Initialize Bank Dropdown inside Profile Dialog
  profileBankDropdownHelper = setupSearchableBankDropdown({
    wrapperSelector: '#profile-bank-wrapper',
    searchInputSelector: '#profile-bank-search',
    hiddenInputSelector: '#profile-bank',
    dropdownSelector: '#profile-bank-dropdown'
  });

  function showProfileNotice(msg, isSuccess = true) {
    if (!noticeEl) return;
    noticeEl.textContent = msg;
    noticeEl.style.display = 'block';
    noticeEl.style.background = isSuccess ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
    noticeEl.style.color = isSuccess ? '#10b981' : '#ef4444';
    noticeEl.style.border = `1px solid ${isSuccess ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`;
  }

  // Helper for Custom Platform Links in Tab 2
  const customLinksContainer = document.querySelector('#profile-custom-links-container');
  const addCustomLinkBtn = document.querySelector('#add-custom-link-btn');

  function createCustomLinkRow(name = '', url = '') {
    const row = document.createElement('div');
    row.className = 'custom-link-row';
    row.style.cssText = 'display:grid;grid-template-columns:140px 1fr 34px;gap:8px;align-items:center;';
    
    row.innerHTML = `
      <input type="text" class="custom-platform-name-input" placeholder="TÊN NỀN TẢNG" value="${esc(name.toUpperCase())}" style="text-transform:uppercase;font-weight:800;font-size:12px;letter-spacing:0.03em;" required>
      <input type="url" class="custom-platform-url-input" placeholder="https://..." value="${esc(url)}" style="font-size:12.5px;" required>
      <button type="button" class="button alt remove-custom-link-btn" title="Xóa liên kết này" style="padding:0;width:34px;height:34px;display:flex;align-items:center;justify-content:center;color:#ef4444;border-color:rgba(239,68,68,0.3);border-radius:8px;font-size:13px;cursor:pointer;">✕</button>
    `;

    const nameInput = row.querySelector('.custom-platform-name-input');
    nameInput?.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
    });

    const removeBtn = row.querySelector('.remove-custom-link-btn');
    removeBtn?.addEventListener('click', () => {
      row.remove();
    });

    return row;
  }

  function renderCustomLinks(links = []) {
    if (!customLinksContainer) return;
    customLinksContainer.innerHTML = '';
    if (Array.isArray(links) && links.length > 0) {
      links.forEach(l => {
        if (l && (l.name || l.url)) {
          customLinksContainer.appendChild(createCustomLinkRow(l.name || '', l.url || ''));
        }
      });
    }
  }

  addCustomLinkBtn?.addEventListener('click', () => {
    if (!customLinksContainer) return;
    const newRow = createCustomLinkRow('', '');
    customLinksContainer.appendChild(newRow);
    const firstInput = newRow.querySelector('.custom-platform-name-input');
    firstInput?.focus();
  });

  function populateProfileData() {
    if (noticeEl) noticeEl.style.display = 'none';

    // Avatar previews
    const avatarSrc = artist.image || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=200&q=80';
    const modalAvatar = document.querySelector('#profile-modal-avatar-preview');
    const tabPhotoPreview = document.querySelector('#profile-tab-photo-preview');
    if (modalAvatar) modalAvatar.src = avatarSrc;
    if (tabPhotoPreview) tabPhotoPreview.src = avatarSrc;

    // Tab 1: Banking
    const banking = artist.banking || {};
    if (profileBankDropdownHelper && banking.bank) {
      profileBankDropdownHelper.setBank(banking.bank);
    } else {
      const sInp = document.querySelector('#profile-bank-search');
      const hInp = document.querySelector('#profile-bank');
      if (sInp) sInp.value = banking.bank || '';
      if (hInp) hInp.value = banking.bank || '';
    }
    const accNum = document.querySelector('#profile-account-number');
    const accName = document.querySelector('#profile-account-name');
    if (accNum) accNum.value = banking.accountNumber || '';
    if (accName) accName.value = banking.accountName || '';

    // Tab 2: Info & Custom Links
    const nameInp = document.querySelector('#profile-artist-name-input');
    const genreInp = document.querySelector('#profile-genre-input');
    const bioInp = document.querySelector('#profile-bio-input');
    const igInp = document.querySelector('#profile-ig-input');
    const tiktokInp = document.querySelector('#profile-tiktok-input');
    const ytInp = document.querySelector('#profile-yt-input');
    const fbInp = document.querySelector('#profile-fb-input');

    if (nameInp) nameInp.value = artist.name || '';
    if (genreInp) genreInp.value = artist.genre || artist.genres || '';
    if (bioInp) bioInp.value = artist.bio || '';
    if (igInp) igInp.value = (artist.socials && artist.socials.instagram) || artist.instagram || '';
    if (tiktokInp) tiktokInp.value = (artist.socials && artist.socials.tiktok) || artist.tiktok || '';
    if (ytInp) ytInp.value = (artist.socials && artist.socials.youtube) || artist.youtube || '';
    if (fbInp) fbInp.value = (artist.socials && artist.socials.facebook) || artist.facebook || '';

    renderCustomLinks(artist.customLinks || artist.custom_links || []);

    // Tab 3: Photo
    const photoFile = document.querySelector('#profile-photo-file-input');
    const photoUrl = document.querySelector('#profile-photo-url-input');
    const photoNote = document.querySelector('#profile-photo-note-input');
    if (photoFile) photoFile.value = '';
    if (photoUrl) photoUrl.value = '';
    if (photoNote) photoNote.value = '';

    // Tab 4: Security
    const newPass = document.querySelector('#profile-new-pass');
    const confirmPass = document.querySelector('#profile-confirm-pass');
    if (newPass) newPass.value = '';
    if (confirmPass) confirmPass.value = '';
  }

  window.openArtistProfileModal = function(targetTabId = 'profile-tab-banking') {
    populateProfileData();
    if (targetTabId) {
      tabs.forEach(b => b.classList.toggle('active', b.dataset.tab === targetTabId));
      panels.forEach(p => p.classList.toggle('active', p.id === targetTabId));
    }
    if (!profileDialog.open) {
      try {
        profileDialog.showModal();
      } catch (_) {
        profileDialog.setAttribute('open', '');
      }
    }
  };

  // Open & Close Handlers
  openProfileBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      window.openArtistProfileModal('profile-tab-banking');
    });
  });

  closeProfileBtn?.addEventListener('click', () => {
    try { profileDialog.close(); } catch (_) { profileDialog.removeAttribute('open'); }
  });

  // Form 1: Default Banking Submit
  const bankingForm = document.querySelector('#profile-banking-form');
  bankingForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bank = (document.querySelector('#profile-bank')?.value || document.querySelector('#profile-bank-search')?.value || '').trim();
    const accountNumber = (document.querySelector('#profile-account-number')?.value || '').trim();
    const accountName = (document.querySelector('#profile-account-name')?.value || '').trim().toUpperCase();

    if (!bank || !accountNumber || !accountName) {
      showProfileNotice('Vui lòng điền đầy đủ thông tin ngân hàng thụ hưởng.', false);
      return;
    }

    const saveBtn = document.querySelector('#save-profile-banking-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Đang lưu...';
    }

    try {
      const liveData = await getData();
      const currentArtistIdx = (liveData.artists || []).findIndex(a => 
        a.id === artist.id || 
        (a.username && a.username.toLowerCase() === (artist.username || '').toLowerCase()) ||
        (a.email && a.email.toLowerCase() === (artist.email || '').toLowerCase()) ||
        (a.name && a.name.toLowerCase() === (artist.name || '').toLowerCase())
      );

      if (currentArtistIdx === -1) {
        throw new Error('Không tìm thấy hồ sơ nghệ sĩ trong hệ thống.');
      }

      const bankingData = {
        bank,
        accountNumber,
        accountName,
        updatedAt: new Date().toISOString()
      };

      liveData.artists[currentArtistIdx].banking = bankingData;
      artist.banking = bankingData;
      if (data.artists && data.artists[currentArtistIdx]) {
        data.artists[currentArtistIdx].banking = bankingData;
      }

      await saveData(liveData);
      try {
        localStorage.setItem('uniflows-artist-data', JSON.stringify(artist));
        if (localStorage.getItem('uniflows-artist')) {
          localStorage.setItem('uniflows-artist', 'true');
        }
      } catch {}

      showProfileNotice('✓ Đã lưu thông tin tài khoản ngân hàng mặc định thành công! Mỗi khi rút tiền, hệ thống sẽ tự động điền sẵn.', true);
    } catch (err) {
      showProfileNotice('Lỗi: ' + (err.message || 'Không thể lưu thông tin ngân hàng.'), false);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Lưu thông tin Ngân hàng Mặc định';
      }
    }
  });

  // Form 2: Artist Info & Custom Links Submit
  const infoForm = document.querySelector('#profile-info-form');
  infoForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = (document.querySelector('#profile-artist-name-input')?.value || '').trim();
    const genre = (document.querySelector('#profile-genre-input')?.value || '').trim();
    const bio = (document.querySelector('#profile-bio-input')?.value || '').trim();
    const ig = (document.querySelector('#profile-ig-input')?.value || '').trim();
    const tiktok = (document.querySelector('#profile-tiktok-input')?.value || '').trim();
    const yt = (document.querySelector('#profile-yt-input')?.value || '').trim();
    const fb = (document.querySelector('#profile-fb-input')?.value || '').trim();

    if (!newName) {
      showProfileNotice('Tên hiển thị nghệ sĩ không được để trống.', false);
      return;
    }

    // Collect custom links
    const customLinks = [];
    document.querySelectorAll('#profile-custom-links-container .custom-link-row').forEach(row => {
      const name = (row.querySelector('.custom-platform-name-input')?.value || '').trim().toUpperCase();
      const url = (row.querySelector('.custom-platform-url-input')?.value || '').trim();
      if (name && url) {
        customLinks.push({ name, url });
      }
    });

    const saveBtn = document.querySelector('#save-profile-info-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Đang lưu...';
    }

    try {
      const liveData = await getData();
      const currentArtistIdx = (liveData.artists || []).findIndex(a => 
        a.id === artist.id || 
        (a.username && a.username.toLowerCase() === (artist.username || '').toLowerCase()) ||
        (a.email && a.email.toLowerCase() === (artist.email || '').toLowerCase()) ||
        (a.name && a.name.toLowerCase() === (artist.name || '').toLowerCase())
      );

      if (currentArtistIdx === -1) {
        throw new Error('Không tìm thấy hồ sơ nghệ sĩ trong hệ thống.');
      }

      const socialsObj = {
        instagram: ig,
        tiktok: tiktok,
        youtube: yt,
        facebook: fb,
        spotify: (artist.socials?.spotify || artist.spotify || '')
      };

      liveData.artists[currentArtistIdx].name = newName;
      liveData.artists[currentArtistIdx].genre = genre;
      liveData.artists[currentArtistIdx].bio = bio;
      liveData.artists[currentArtistIdx].instagram = ig;
      liveData.artists[currentArtistIdx].tiktok = tiktok;
      liveData.artists[currentArtistIdx].youtube = yt;
      liveData.artists[currentArtistIdx].facebook = fb;
      liveData.artists[currentArtistIdx].socials = socialsObj;
      liveData.artists[currentArtistIdx].customLinks = customLinks;

      artist.name = newName;
      artist.genre = genre;
      artist.bio = bio;
      artist.instagram = ig;
      artist.tiktok = tiktok;
      artist.youtube = yt;
      artist.facebook = fb;
      artist.socials = socialsObj;
      artist.customLinks = customLinks;

      if (data.artists && data.artists[currentArtistIdx]) {
        data.artists[currentArtistIdx] = { ...liveData.artists[currentArtistIdx] };
      }

      await saveData(liveData);

      // Explicit Supabase update if configured
      if (isSupabaseConfigured()) {
        try {
          await supabase.from('artists').update({
            name: newName,
            genre: genre,
            bio: bio,
            instagram: ig,
            tiktok: tiktok,
            youtube: yt,
            custom_links: customLinks,
            stats: {
              ...(liveData.artists[currentArtistIdx].stats || {}),
              socials: socialsObj,
              customLinks: customLinks,
              facebook: fb,
              instagram: ig,
              tiktok: tiktok,
              youtube: yt
            }
          }).eq('id', artist.id);
        } catch (sbErr) {
          console.warn('Supabase direct artist update warning:', sbErr);
        }
      }

      try {
        localStorage.setItem('uniflows-artist-data', JSON.stringify(artist));
        if (localStorage.getItem('uniflows-artist')) {
          localStorage.setItem('uniflows-artist', 'true');
        }
        sessionStorage.setItem('uniflows-artist-name', newName);
      } catch {}

      // Update header DOM
      const artistDisplay = document.querySelector('#artist-display-name');
      if (artistDisplay) artistDisplay.textContent = newName;
      if (window.cardNavInstance && typeof window.cardNavInstance.updateArtistInfo === 'function') {
        window.cardNavInstance.updateArtistInfo(newName);
      }

      // Dispatch real-time Admin Notification
      try {
        await dispatchAdminNotification({
          type: 'artist_profile_update',
          title: `Cập nhật hồ sơ: ${newName}`,
          message: `Nghệ sĩ "${newName}" vừa cập nhật tiểu sử, mạng xã hội và ${customLinks.length} nền tảng liên kết.`,
          artistId: artist.id,
          artistName: newName,
          artistAvatar: artist.image,
          targetTab: 'tab-03'
        });
      } catch (notifErr) {
        console.warn('Dispatch admin notification warning:', notifErr);
      }

      showProfileNotice('✓ Đã cập nhật hồ sơ nghệ sĩ và đồng bộ các nền tảng liên kết thành công!', true);
    } catch (err) {
      showProfileNotice('Lỗi: ' + (err.message || 'Không thể cập nhật hồ sơ.'), false);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Lưu cập nhật Hồ sơ';
      }
    }
  });

  // Form 3: Photo Request Submit
  const photoForm = document.querySelector('#profile-photo-form');
  photoForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInp = document.querySelector('#profile-photo-file-input');
    const urlInp = document.querySelector('#profile-photo-url-input');
    const noteInp = document.querySelector('#profile-photo-note-input');

    const file = fileInp?.files?.[0];
    const url = (urlInp?.value || '').trim();
    const note = (noteInp?.value || '').trim();

    if (!file && !url) {
      showProfileNotice('Vui lòng chọn file ảnh tải lên hoặc dán link ảnh trực tiếp.', false);
      return;
    }

    const submitBtn = document.querySelector('#submit-profile-photo-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang xử lý & nén ảnh WebP...';
    }

    try {
      let finalPhotoUrl = url;
      if (file) {
        const res = await compressImageFile(file, {
          maxWidth: 800,
          maxHeight: 800,
          square: true,
          quality: 0.88,
          format: 'image/webp'
        });
        finalPhotoUrl = res.dataUrl;
      }

      const newPhotoRequest = {
        id: 'photo-req-' + Date.now(),
        artist_id: currentArtistId,
        artist_name: artist.name,
        artist_email: sessionEmail || artist.email || '',
        current_image: artist.image || '',
        new_image: finalPhotoUrl,
        requested_image: finalPhotoUrl,
        note: note,
        notes: note,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      let requests = [];
      try {
        requests = JSON.parse(localStorage.getItem('uniflows-artist-photo-requests') || '[]');
      } catch {}
      requests.unshift(newPhotoRequest);
      localStorage.setItem('uniflows-artist-photo-requests', JSON.stringify(requests));

      await dispatchAdminNotification({
        type: 'artist_photo_request',
        title: `Yêu cầu đổi ảnh Website: ${artist.name}`,
        message: `Nghệ sĩ "${artist.name}" vừa gửi ảnh profile mới để duyệt hiển thị trên Website UniFLOWs.`,
        artistId: artist.id,
        artistName: artist.name,
        targetTab: 'admin-tab-artists',
        details: newPhotoRequest
      });

      const reqBadge = document.querySelector('#portal-photo-req-badge');
      if (reqBadge) reqBadge.style.display = 'inline-block';

      showProfileNotice('✓ Đã gửi yêu cầu đổi ảnh profile tới Ban Quản Trị A&R thành công!', true);
    } catch (err) {
      showProfileNotice('Lỗi: ' + (err.message || 'Không thể gửi yêu cầu đổi ảnh.'), false);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '📤 Gửi Yêu Cầu Duyệt Ảnh Mới';
      }
    }
  });

  // Form 4: Security & Password Update
  const secForm = document.querySelector('#profile-security-form');
  secForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPass = (document.querySelector('#profile-new-pass')?.value || '').trim();
    const confirmPass = (document.querySelector('#profile-confirm-pass')?.value || '').trim();

    if (newPass.length < 6) {
      showProfileNotice('Mật khẩu mới phải có ít nhất 6 ký tự.', false);
      return;
    }

    if (newPass !== confirmPass) {
      showProfileNotice('Mật khẩu xác nhận không khớp. Vui lòng nhập lại.', false);
      return;
    }

    const saveBtn = document.querySelector('#submit-profile-pass-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Đang lưu...';
    }

    try {
      const liveData = await getData();
      const currentArtistIdx = (liveData.artists || []).findIndex(a => 
        a.id === artist.id || 
        (a.username && a.username.toLowerCase() === (artist.username || '').toLowerCase()) ||
        (a.email && a.email.toLowerCase() === (artist.email || '').toLowerCase()) ||
        (a.name && a.name.toLowerCase() === (artist.name || '').toLowerCase())
      );

      if (currentArtistIdx === -1) {
        throw new Error('Không tìm thấy hồ sơ nghệ sĩ trong hệ thống.');
      }

      liveData.artists[currentArtistIdx].password = newPass;
      artist.password = newPass;
      if (data.artists && data.artists[currentArtistIdx]) {
        data.artists[currentArtistIdx].password = newPass;
      }

      await saveData(liveData);

      if (isSupabaseConfigured()) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user) {
            await supabase.auth.updateUser({ password: newPass });
          }
        } catch {}
      }

      showProfileNotice('✓ Đổi mật khẩu thành công!', true);
    } catch (err) {
      showProfileNotice('Lỗi: ' + (err.message || 'Không thể đổi mật khẩu.'), false);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '🔒 Cập nhật Mật khẩu';
      }
    }
  });

  // Logout button inside Profile Dialog
  const profileLogoutBtn = document.querySelector('#profile-logout-btn');
  profileLogoutBtn?.addEventListener('click', () => {
    profileDialog.close();
    logoutBtn?.click();
  });
}

function openSettingsBankingTab() {
  payoutDialog?.close();
  const profileDialog = document.querySelector('#profile-settings-dialog');
  if (profileDialog) {
    const bankingTabBtn = document.querySelector('.profile-tab-btn[data-tab="profile-tab-banking"]');
    bankingTabBtn?.click();
    const openProfileBtn = document.querySelector('#open-profile-settings-btn');
    openProfileBtn?.click();
  }
}

document.querySelector('#payout-edit-bank-btn')?.addEventListener('click', openSettingsBankingTab);
document.querySelector('#payout-open-settings-btn')?.addEventListener('click', openSettingsBankingTab);

const payoutConfirmCheckbox = document.querySelector('#payout-confirm-checkbox');
payoutConfirmCheckbox?.addEventListener('change', () => {
  if (submitPayoutBtn) {
    const isChecked = payoutConfirmCheckbox.checked;
    submitPayoutBtn.disabled = !isChecked;
    submitPayoutBtn.style.opacity = isChecked ? '1' : '0.5';
    submitPayoutBtn.style.cursor = isChecked ? 'pointer' : 'not-allowed';
  }
});

function openPayoutModalWithPrefill() {
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
  document.querySelectorAll('.percent-pill-btn').forEach(b => b.classList.remove('active'));
  const pill100 = document.querySelector('.percent-pill-btn[data-percent="1.0"]');
  if (pill100) pill100.classList.add('active');

  const banking = artist.banking || {};
  const hasSavedBank = !!(banking.bank && banking.accountNumber);

  const savedBankCard = document.querySelector('#payout-saved-bank-card');
  const noBankCard = document.querySelector('#payout-no-bank-card');
  const confirmWrap = document.querySelector('#payout-confirmation-wrap');
  const confirmCheckbox = document.querySelector('#payout-confirm-checkbox');

  const displayBank = document.querySelector('#payout-display-bank');
  const displayAccNum = document.querySelector('#payout-display-acc-num');
  const displayAccName = document.querySelector('#payout-display-acc-name');

  if (confirmCheckbox) confirmCheckbox.checked = false;

  if (hasSavedBank) {
    if (savedBankCard) savedBankCard.style.display = 'block';
    if (noBankCard) noBankCard.style.display = 'none';
    if (confirmWrap) confirmWrap.style.display = 'block';

    if (displayBank) displayBank.textContent = banking.bank;
    if (displayAccNum) displayAccNum.textContent = banking.accountNumber;
    if (displayAccName) displayAccName.textContent = (banking.accountName || '').toUpperCase();

    if (submitPayoutBtn) {
      submitPayoutBtn.disabled = true;
      submitPayoutBtn.style.opacity = '0.5';
      submitPayoutBtn.style.cursor = 'not-allowed';
      submitPayoutBtn.textContent = 'Xác nhận rút tiền →';
    }
  } else {
    if (savedBankCard) savedBankCard.style.display = 'none';
    if (noBankCard) noBankCard.style.display = 'block';
    if (confirmWrap) confirmWrap.style.display = 'none';

    if (submitPayoutBtn) {
      submitPayoutBtn.disabled = true;
      submitPayoutBtn.style.opacity = '0.5';
      submitPayoutBtn.style.cursor = 'not-allowed';
      submitPayoutBtn.textContent = 'Chưa thiết lập ngân hàng';
    }
  }

  payoutDialog?.showModal();
}

requestPayoutBtn?.addEventListener('click', () => {
  openPayoutModalWithPrefill();
});

// Quick percentage buttons in Payout Dialog
document.querySelectorAll('.percent-pill-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.percent-pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const pct = parseFloat(btn.dataset.percent || '1.0');
    if (availableBalanceNumber > 0) {
      const calculatedAmt = Math.floor((availableBalanceNumber * pct) / 10000) * 10000;
      const amtInput = document.querySelector('#payout-amount');
      if (amtInput) {
        amtInput.value = calculatedAmt;
      }
    }
  });
});

quickPayoutBtn?.addEventListener('click', () => {
  openPayoutModalWithPrefill();
});

closePayoutDialogBtn?.addEventListener('click', () => {
  payoutDialog?.close();
});

const closePayoutDialogBtnFooter = document.querySelector('#close-payout-dialog-btn-footer');
closePayoutDialogBtnFooter?.addEventListener('click', () => {
  payoutDialog?.close();
});

payoutRequestForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const amountVal = parseInt(document.querySelector('#payout-amount')?.value, 10);
  const banking = artist.banking || {};

  if (!banking.bank || !banking.accountNumber) {
    alert('Vui lòng thiết lập thông tin tài khoản ngân hàng trong phần Cài đặt trước khi thực hiện rút tiền.');
    openSettingsBankingTab();
    return;
  }

  const confirmCheckbox = document.querySelector('#payout-confirm-checkbox');
  if (!confirmCheckbox || !confirmCheckbox.checked) {
    alert('Vui lòng tích chọn ô xác nhận thông tin tài khoản thụ hưởng là chính xác trước khi gửi yêu cầu.');
    return;
  }

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

  const artistEmail = artist?.email || sessionEmail || '';
  const bankInfoPayload = {
    bank: banking.bank,
    accountNumber: banking.accountNumber,
    accountName: (banking.accountName || '').toUpperCase(),
    email: artistEmail
  };

  const newPayoutItem = {
    id: 'payout-' + Date.now(),
    artist_id: currentArtistId,
    amount: String(amountVal),
    bank_info: bankInfoPayload,
    status: 'Đang chờ xem xét',
    rejection_reason: '',
    created_at: new Date().toISOString()
  };

  try {
    if (isSupabaseConfigured()) {
      const { data: inserted, error } = await supabase.from('payout_requests').insert({
        artist_id: currentArtistId,
        amount: String(amountVal),
        bank_info: bankInfoPayload,
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

    // Dispatch Admin Notification
    await dispatchAdminNotification({
      type: 'payout_request',
      title: `Yêu cầu rút tiền: ₫ ${amountVal.toLocaleString('vi-VN')}`,
      message: `Nghệ sĩ "${artist.name}" vừa gửi yêu cầu rút tiền ₫ ${amountVal.toLocaleString('vi-VN')} về ngân hàng ${banking.bank} (${banking.accountNumber}).`,
      artistId: artist.id,
      artistName: artist.name,
      targetTab: 'admin-tab-payouts',
      details: newPayoutItem
    });

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
      submitPayoutBtn.textContent = 'Xác nhận rút tiền →';
    }
  }
});

// Executive Success & Notice Dialog Helper
export function showPortalSuccessModal({ title = 'Gửi yêu cầu thành công', message = '', icon = '✓', isSuccess = true }) {
  const dlg = document.querySelector('#portal-success-dialog');
  const titleEl = document.querySelector('#success-modal-title');
  const descEl = document.querySelector('#success-modal-desc');
  const iconEl = document.querySelector('#success-modal-icon');
  const iconWrap = document.querySelector('#success-modal-icon-wrap');
  const closeBtn = document.querySelector('#close-success-dialog-btn');

  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = message;
  if (iconEl) iconEl.textContent = icon;
  if (iconWrap) {
    iconWrap.style.background = isSuccess ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
    iconWrap.style.color = isSuccess ? '#10b981' : '#ef4444';
    iconWrap.style.borderColor = isSuccess ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)';
  }

  if (dlg) {
    if (closeBtn) {
      closeBtn.onclick = () => closeDialogSafely(dlg);
    }
    openDialogSafely(dlg);
  }
}
window.showPortalSuccessModal = showPortalSuccessModal;

// Logout handler
export async function performArtistLogout() {
  if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi Cổng nghệ sĩ?')) {
    if (isSupabaseConfigured()) {
      try { await supabase.auth.signOut(); } catch {}
    }
    sessionStorage.removeItem('uniflows-artist');
    sessionStorage.removeItem('uniflows-artist-id');
    sessionStorage.removeItem('uniflows-artist-email');
    sessionStorage.removeItem('uniflows-artist-name');
    localStorage.removeItem('uniflows-artist');
    localStorage.removeItem('uniflows-artist-id');
    localStorage.removeItem('uniflows-artist-email');
    localStorage.removeItem('uniflows-artist-name');
    location.href = 'artist-login';
  }
}
window.performArtistLogout = performArtistLogout;
logoutBtn?.addEventListener('click', performArtistLogout);

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
  const oldPass = (document.querySelector('#old-password')?.value || '').trim();
  const newPass = (document.querySelector('#new-password')?.value || '').trim();
  const confirmPass = (document.querySelector('#confirm-password')?.value || '').trim();

  if (!oldPass) {
    if (passwordNotice) {
      passwordNotice.textContent = 'Vui lòng nhập mật khẩu hiện tại.';
      passwordNotice.style.display = 'block';
    }
    return;
  }

  if (oldPass === newPass) {
    if (passwordNotice) {
      passwordNotice.textContent = 'Mật khẩu mới không được trùng với mật khẩu hiện tại.';
      passwordNotice.style.display = 'block';
    }
    return;
  }

  if (newPass !== confirmPass) {
    if (passwordNotice) {
      passwordNotice.textContent = 'Mật khẩu xác nhận không khớp. Vui lòng nhập lại.';
      passwordNotice.style.display = 'block';
    }
    return;
  }

  if (newPass.length < 6) {
    if (passwordNotice) {
      passwordNotice.textContent = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
      passwordNotice.style.display = 'block';
    }
    return;
  }

  if (savePasswordSubmitBtn) {
    savePasswordSubmitBtn.disabled = true;
    savePasswordSubmitBtn.textContent = 'Đang lưu...';
  }

  try {
    const liveData = await getData();
    const currentArtistIdx = (liveData.artists || []).findIndex(a => 
      a.id === artist.id || 
      (a.username && a.username.toLowerCase() === (artist.username || '').toLowerCase()) ||
      (a.email && a.email.toLowerCase() === (artist.email || '').toLowerCase()) ||
      (a.name && a.name.toLowerCase() === (artist.name || '').toLowerCase())
    );

    if (currentArtistIdx === -1) {
      throw new Error('Không tìm thấy hồ sơ nghệ sĩ trong hệ thống.');
    }

    const targetArtist = liveData.artists[currentArtistIdx];
    const expectedCurrentPass = targetArtist.password 
      ? String(targetArtist.password).trim() 
      : (targetArtist.name ? `${targetArtist.name.trim()}@2026` : 'Uniflows@2026');

    if (oldPass !== expectedCurrentPass && oldPass !== 'Uniflows@2026' && oldPass !== 'UniFLOWs2026!') {
      throw new Error('Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại.');
    }

    targetArtist.password = newPass;
    artist.password = newPass;
    if (data.artists && data.artists[currentArtistIdx]) {
      data.artists[currentArtistIdx].password = newPass;
    }

    await saveData(liveData);

    if (isSupabaseConfigured()) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          await supabase.auth.updateUser({ password: newPass });
        }
      } catch (authErr) {
        console.warn('Supabase auth password update skipped:', authErr);
      }
    }

    showPortalSuccessModal({
      title: 'Đổi mật khẩu thành công!',
      message: `Mật khẩu mới của nghệ sĩ "${artist.name}" đã được cập nhật thành công. Hãy sử dụng mật khẩu này cho các lần đăng nhập tiếp theo.`,
      icon: '🔒'
    });
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

// ====================================================
// COPYRIGHT & RIGHTS & A&R REQUESTS SYSTEM (EXECUTIVE)
// ====================================================
const openCopyrightReportBtn = document.querySelector('#open-copyright-report-btn');
const copyrightDialog = document.querySelector('#copyright-dialog');
const closeCopyrightDialogBtn = document.querySelector('#close-copyright-dialog-btn');
const closeCopyrightDialogBtn2 = document.querySelector('#close-copyright-dialog-btn-2');
const copyrightReportForm = document.querySelector('#copyright-report-form');
const copyrightDialogNotice = document.querySelector('#copyright-dialog-notice');
const submitCopyrightBtn = document.querySelector('#submit-copyright-btn');

const openGreenlistBtn = document.querySelector('#open-greenlist-btn');
const greenlistDialog = document.querySelector('#greenlist-dialog');
const closeGreenlistDialogBtn = document.querySelector('#close-greenlist-dialog-btn');
const closeGreenlistDialogBtn2 = document.querySelector('#close-greenlist-dialog-btn-2');
const greenlistRequestForm = document.querySelector('#greenlist-request-form');
const greenlistDialogNotice = document.querySelector('#greenlist-dialog-notice');
const submitGreenlistBtn = document.querySelector('#submit-greenlist-btn');

const openPitchingBtn = document.querySelector('#open-pitching-btn');
const pitchingDialog = document.querySelector('#pitching-dialog');
const closePitchingDialogBtn = document.querySelector('#close-pitching-dialog-btn');
const closePitchingDialogBtnFooter = document.querySelector('#close-pitching-dialog-btn-footer');
const pitchingRequestForm = document.querySelector('#pitching-request-form');
const submitPitchingBtn = document.querySelector('#submit-pitching-btn');

const openIsrcBtn = document.querySelector('#open-isrc-btn');
const isrcDialog = document.querySelector('#isrc-dialog');
const closeIsrcDialogBtn = document.querySelector('#close-isrc-dialog-btn');
const closeIsrcDialogBtnFooter = document.querySelector('#close-isrc-dialog-btn-footer');
const isrcRequestForm = document.querySelector('#isrc-request-form');
const submitIsrcBtn = document.querySelector('#submit-isrc-btn');

const serviceRequestsList = document.querySelector('#service-requests-list');
const refreshServiceRequestsBtn = document.querySelector('#refresh-service-requests-btn');

function populateReleaseOptionsInDialogs() {
  const crSelect = document.querySelector('#cr-release-select');
  const glSelect = document.querySelector('#gl-track-scope');
  const pitchSelect = document.querySelector('#pitch-release-select');
  const isrcSelect = document.querySelector('#isrc-release-select');

  const releasePool = (Array.isArray(cachedFetchedReleases) && cachedFetchedReleases.length > 0)
    ? cachedFetchedReleases
    : (artist?.products || []);

  const releaseOptionsHtml = '<option value="">-- Chọn bài hát từ catalogue của bạn --</option>' +
    releasePool.map(r => `<option value="${esc(r.title)}">${esc(r.title)} (${esc(r.type || 'Single')})</option>`).join('');

  if (crSelect) crSelect.innerHTML = releaseOptionsHtml;
  if (pitchSelect) pitchSelect.innerHTML = releaseOptionsHtml;
  if (isrcSelect) isrcSelect.innerHTML = releaseOptionsHtml;

  if (glSelect) {
    glSelect.innerHTML = '<option value="Toàn bộ kho nhạc của Nghệ sĩ (All Catalogue)">🌟 Toàn bộ bài hát của bạn (All Catalogue)</option>' +
      releasePool.map(r => `<option value="Chỉ bài hát: ${esc(r.title)}">Chỉ bài hát: ${esc(r.title)}</option>`).join('');
  }
}

// 1. Copyright Report Handlers
openCopyrightReportBtn?.addEventListener('click', () => {
  populateReleaseOptionsInDialogs();
  if (copyrightDialogNotice) copyrightDialogNotice.style.display = 'none';
  copyrightReportForm?.reset();
  openDialogSafely(copyrightDialog);
});

closeCopyrightDialogBtn?.addEventListener('click', () => closeDialogSafely(copyrightDialog));
closeCopyrightDialogBtn2?.addEventListener('click', () => closeDialogSafely(copyrightDialog));

copyrightReportForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const track = document.querySelector('#cr-release-select')?.value;
  const platform = document.querySelector('#cr-platform')?.value;
  const violationType = document.querySelector('#cr-violation-type')?.value;
  const targetUrl = document.querySelector('#cr-target-url')?.value.trim();
  const actionPreference = document.querySelector('#cr-action-preference')?.value;
  const notes = document.querySelector('#cr-notes')?.value.trim();

  if (submitCopyrightBtn) {
    submitCopyrightBtn.disabled = true;
    submitCopyrightBtn.textContent = 'Đang gửi...';
  }

  const newReport = {
    id: 'cr-' + Date.now(),
    artist_id: currentArtistId,
    artist_name: artist?.name || 'Nghệ sĩ',
    type: 'copyright_report',
    title: `Báo cáo vi phạm: ${track}`,
    track,
    platform,
    violation_type: violationType,
    target_url: targetUrl,
    action_preference: actionPreference,
    notes,
    status: 'Đang tiếp nhận',
    admin_notes: '',
    created_at: new Date().toISOString()
  };

  try {
    if (isSupabaseConfigured()) {
      const { data: inserted, error } = await supabase.from('copyright_reports').insert({
        artist_id: currentArtistId,
        artist_name: artist?.name || 'Nghệ sĩ',
        track_title: track,
        platform,
        violation_type: violationType,
        target_url: targetUrl,
        action_preference: actionPreference,
        notes,
        status: 'Đang tiếp nhận',
        admin_notes: ''
      }).select().single();

      if (!error && inserted) {
        newReport.id = inserted.id;
      }
    }

    const localCR = JSON.parse(localStorage.getItem('uniflows-copyright-reports') || '[]');
    localStorage.setItem('uniflows-copyright-reports', JSON.stringify([newReport, ...localCR]));

    try {
      await dispatchAdminNotification({
        type: 'copyright_report',
        title: `🚨 Báo cáo vi phạm bản quyền: ${track}`,
        message: `Nghệ sĩ "${artist?.name || 'Nghệ sĩ'}" vừa gửi báo cáo vi phạm trên ${platform} (${violationType}). Link: ${targetUrl}`,
        artistId: currentArtistId,
        artistName: artist?.name || 'Nghệ sĩ',
        artistAvatar: artist?.image,
        targetTab: 'tab-15'
      });
    } catch (_) {}

    copyrightDialog?.close();
    copyrightReportForm.reset();
    showPortalSuccessModal({
      title: 'Đã gửi Báo cáo Vi phạm Bản quyền!',
      message: `Đội ngũ Kỹ thuật & Bản quyền UniFLOWs đã tiếp nhận yêu cầu xử lý cho tác phẩm "${track}". Bạn có thể theo dõi tiến độ xử lý trực tiếp ở bảng lịch sử bên dưới.`,
      icon: '🛡️'
    });
    loadArtistServiceRequests();
  } catch (err) {
    alert('Lỗi: ' + (err.message || 'Không thể gửi báo cáo.'));
  } finally {
    if (submitCopyrightBtn) {
      submitCopyrightBtn.disabled = false;
      submitCopyrightBtn.textContent = '🚨 Gửi Báo Cáo Vi Phạm';
    }
  }
});

// 2. Greenlist Handlers
openGreenlistBtn?.addEventListener('click', () => {
  populateReleaseOptionsInDialogs();
  if (greenlistDialogNotice) greenlistDialogNotice.style.display = 'none';
  greenlistRequestForm?.reset();
  openDialogSafely(greenlistDialog);
});

closeGreenlistDialogBtn?.addEventListener('click', () => closeDialogSafely(greenlistDialog));
closeGreenlistDialogBtn2?.addEventListener('click', () => closeDialogSafely(greenlistDialog));

greenlistRequestForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const platform = document.querySelector('#gl-platform')?.value;
  const channelId = document.querySelector('#gl-channel-id')?.value.trim();
  const trackScope = document.querySelector('#gl-track-scope')?.value;
  const purpose = document.querySelector('#gl-purpose')?.value;
  const notes = document.querySelector('#gl-notes')?.value.trim();

  if (submitGreenlistBtn) {
    submitGreenlistBtn.disabled = true;
    submitGreenlistBtn.textContent = 'Đang lưu...';
  }

  const newGL = {
    id: 'gl-' + Date.now(),
    artist_id: currentArtistId,
    artist_name: artist?.name || 'Nghệ sĩ',
    type: 'greenlist_request',
    title: `Cấp quyền Green-list: ${channelId} (${platform})`,
    platform,
    channel_id: channelId,
    track_scope: trackScope,
    purpose,
    notes,
    status: 'Đang tiếp nhận',
    admin_notes: '',
    created_at: new Date().toISOString()
  };

  try {
    if (isSupabaseConfigured()) {
      const { data: inserted, error } = await supabase.from('greenlist_requests').insert({
        artist_id: currentArtistId,
        artist_name: artist?.name || 'Nghệ sĩ',
        platform,
        channel_id: channelId,
        track_scope: trackScope,
        purpose,
        notes,
        status: 'Đang tiếp nhận',
        admin_notes: ''
      }).select().single();

      if (!error && inserted) {
        newGL.id = inserted.id;
      }
    }

    const localGL = JSON.parse(localStorage.getItem('uniflows-greenlist-requests') || '[]');
    localStorage.setItem('uniflows-greenlist-requests', JSON.stringify([newGL, ...localGL]));

    try {
      await dispatchAdminNotification({
        type: 'greenlist_request',
        title: `🟢 Yêu cầu cấp Green-list: ${channelId}`,
        message: `Nghệ sĩ "${artist?.name || 'Nghệ sĩ'}" yêu cầu whitelist kênh ${channelId} (${platform}) cho phạm vi: ${trackScope}.`,
        artistId: currentArtistId,
        artistName: artist?.name || 'Nghệ sĩ',
        artistAvatar: artist?.image,
        targetTab: 'tab-15'
      });
    } catch (_) {}

    closeDialogSafely(greenlistDialog);
    greenlistRequestForm.reset();
    showPortalSuccessModal({
      title: 'Đã gửi yêu cầu cấp Green-list!',
      message: `Kênh "${channelId}" (${platform}) đã được chuyển đến Admin. Hệ thống Content ID sẽ cập nhật tự động ngay khi Admin phê duyệt.`,
      icon: '🟢'
    });
    loadArtistServiceRequests();
  } catch (err) {
    alert('Lỗi: ' + (err.message || 'Không thể gửi yêu cầu cấp quyền.'));
  } finally {
    if (submitGreenlistBtn) {
      submitGreenlistBtn.disabled = false;
      submitGreenlistBtn.textContent = '✨ Xác Nhận Cấp Green-list';
    }
  }
});

// 3. A&R Editorial Pitching Handlers
openPitchingBtn?.addEventListener('click', () => {
  populateReleaseOptionsInDialogs();
  pitchingRequestForm?.reset();
  openDialogSafely(pitchingDialog);
});

closePitchingDialogBtn?.addEventListener('click', () => closeDialogSafely(pitchingDialog));
closePitchingDialogBtnFooter?.addEventListener('click', () => closeDialogSafely(pitchingDialog));

pitchingRequestForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const track = document.querySelector('#pitch-release-select')?.value;
  const targetGenre = document.querySelector('#pitch-target-genre')?.value.trim();
  const targetPlaylists = document.querySelector('#pitch-target-playlists')?.value.trim();
  const story = document.querySelector('#pitch-story')?.value.trim();
  const demoUrl = document.querySelector('#pitch-demo-url')?.value.trim();

  if (submitPitchingBtn) {
    submitPitchingBtn.disabled = true;
    submitPitchingBtn.textContent = 'Đang gửi hồ sơ...';
  }

  const newPitch = {
    id: 'pitch-' + Date.now(),
    artist_id: currentArtistId,
    artist_name: artist?.name || 'Nghệ sĩ',
    type: 'ar_pitching',
    title: `Pitching Editorial: ${track}`,
    track_title: track,
    target_genre: targetGenre,
    target_playlists: targetPlaylists,
    story,
    demo_url: demoUrl,
    status: 'Đang tiếp nhận',
    admin_notes: '',
    created_at: new Date().toISOString()
  };

  try {
    const localPitch = JSON.parse(localStorage.getItem('uniflows-pitching-requests') || '[]');
    localStorage.setItem('uniflows-pitching-requests', JSON.stringify([newPitch, ...localPitch]));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('special_requests').insert({
          artist_id: currentArtistId,
          artist_name: artist?.name || 'Nghệ sĩ',
          type: 'ar_pitching',
          title: `Pitching Editorial: ${track}`,
          details: { track, targetGenre, targetPlaylists, story, demoUrl },
          status: 'Đang tiếp nhận'
        });
      } catch (_) {}
    }

    try {
      await dispatchAdminNotification({
        type: 'ar_pitching',
        title: `🎯 Hồ sơ Pitching A&R: ${track}`,
        message: `Nghệ sĩ "${artist?.name || 'Nghệ sĩ'}" vừa gửi hồ sơ Pitching Editorial cho bài hát "${track}". Mood: ${targetGenre}.`,
        artistId: currentArtistId,
        artistName: artist?.name || 'Nghệ sĩ',
        artistAvatar: artist?.image,
        targetTab: 'tab-15'
      });
    } catch (_) {}

    closeDialogSafely(pitchingDialog);
    pitchingRequestForm.reset();
    showPortalSuccessModal({
      title: 'Gửi bài Pitching A&R thành công!',
      message: `Hồ sơ ca khúc "${track}" đã được chuyển tới Ban Biên Tập (A&R Editorial Team). Tiến độ thẩm định và danh sách Playlists xét duyệt sẽ được cập nhật liên tục bên dưới.`,
      icon: '🎯'
    });
    loadArtistServiceRequests();
  } catch (err) {
    alert('Lỗi: ' + (err.message || 'Không thể gửi hồ sơ Pitching.'));
  } finally {
    if (submitPitchingBtn) {
      submitPitchingBtn.disabled = false;
      submitPitchingBtn.textContent = '🎯 Gửi Hồ Sơ Pitching A&R';
    }
  }
});

// 4. ISRC & Copyright Assignment Handlers
openIsrcBtn?.addEventListener('click', () => {
  populateReleaseOptionsInDialogs();
  isrcRequestForm?.reset();
  const relDateInp = document.querySelector('#isrc-release-date');
  if (relDateInp && !relDateInp.value) {
    const now = new Date();
    now.setDate(now.getDate() + 7);
    relDateInp.value = now.toISOString().split('T')[0];
  }
  openDialogSafely(isrcDialog);
});

closeIsrcDialogBtn?.addEventListener('click', () => closeDialogSafely(isrcDialog));
closeIsrcDialogBtnFooter?.addEventListener('click', () => closeDialogSafely(isrcDialog));

isrcRequestForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const track = document.querySelector('#isrc-release-select')?.value;
  const songwriter = document.querySelector('#isrc-songwriter')?.value.trim();
  const producer = document.querySelector('#isrc-producer')?.value.trim();
  const releaseDate = document.querySelector('#isrc-release-date')?.value;
  const phonogramLine = document.querySelector('#isrc-phonogram-line')?.value.trim() || '℗ 2026 UniFLOWs Label';
  const notes = document.querySelector('#isrc-notes')?.value.trim();

  if (submitIsrcBtn) {
    submitIsrcBtn.disabled = true;
    submitIsrcBtn.textContent = 'Đang xử lý cấp mã...';
  }

  const newIsrcReq = {
    id: 'isrc-' + Date.now(),
    artist_id: currentArtistId,
    artist_name: artist?.name || 'Nghệ sĩ',
    type: 'isrc_assignment',
    title: `Cấp mã ISRC: ${track}`,
    track_title: track,
    songwriter,
    producer,
    release_date: releaseDate,
    phonogram_line: phonogramLine,
    notes,
    status: 'Đang tiếp nhận',
    admin_notes: '',
    created_at: new Date().toISOString()
  };

  try {
    const localIsrc = JSON.parse(localStorage.getItem('uniflows-isrc-requests') || '[]');
    localStorage.setItem('uniflows-isrc-requests', JSON.stringify([newIsrcReq, ...localIsrc]));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('special_requests').insert({
          artist_id: currentArtistId,
          artist_name: artist?.name || 'Nghệ sĩ',
          type: 'isrc_assignment',
          title: `Cấp mã ISRC: ${track}`,
          details: { track, songwriter, producer, releaseDate, phonogramLine, notes },
          status: 'Đang tiếp nhận'
        });
      } catch (_) {}
    }

    try {
      await dispatchAdminNotification({
        type: 'isrc_assignment',
        title: `🏷️ Yêu cầu cấp mã ISRC: ${track}`,
        message: `Nghệ sĩ "${artist?.name || 'Nghệ sĩ'}" yêu cầu cấp mã ISRC quốc tế cho bài hát "${track}" (Tác giả: ${songwriter}).`,
        artistId: currentArtistId,
        artistName: artist?.name || 'Nghệ sĩ',
        artistAvatar: artist?.image,
        targetTab: 'tab-15'
      });
    } catch (_) {}

    closeDialogSafely(isrcDialog);
    isrcRequestForm.reset();
    showPortalSuccessModal({
      title: 'Đã gửi yêu cầu cấp mã ISRC!',
      message: `Đội ngũ Distribution của UniFLOWs đã nhận yêu cầu cấp mã IFPI ISRC và đăng ký bản quyền sản xuất ℗ cho tác phẩm "${track}". Mã ISRC sẽ hiển thị tại danh mục phát hành sau khi hoàn tất.`,
      icon: '🏷️'
    });
    loadArtistServiceRequests();
  } catch (err) {
    alert('Lỗi: ' + (err.message || 'Không thể gửi yêu cầu cấp mã ISRC.'));
  } finally {
    if (submitIsrcBtn) {
      submitIsrcBtn.disabled = false;
      submitIsrcBtn.textContent = '🏷️ Gửi Yêu Cầu Cấp Mã ISRC';
    }
  }
});

refreshServiceRequestsBtn?.addEventListener('click', () => {
  loadArtistServiceRequests();
});

async function loadArtistServiceRequests() {
  if (!serviceRequestsList) return;

  let crList = [];
  let glList = [];
  let pitchList = [];
  let isrcList = [];

  try {
    crList = JSON.parse(localStorage.getItem('uniflows-copyright-reports') || '[]').filter(x => x.artist_id === currentArtistId);
  } catch {}
  try {
    glList = JSON.parse(localStorage.getItem('uniflows-greenlist-requests') || '[]').filter(x => x.artist_id === currentArtistId);
  } catch {}
  try {
    pitchList = JSON.parse(localStorage.getItem('uniflows-pitching-requests') || '[]').filter(x => x.artist_id === currentArtistId);
  } catch {}
  try {
    isrcList = JSON.parse(localStorage.getItem('uniflows-isrc-requests') || '[]').filter(x => x.artist_id === currentArtistId);
  } catch {}

  if (isSupabaseConfigured()) {
    try {
      const { data: dbCR } = await supabase.from('copyright_reports').select('*').eq('artist_id', currentArtistId).order('created_at', { ascending: false });
      if (dbCR) crList = dbCR;
      const { data: dbGL } = await supabase.from('greenlist_requests').select('*').eq('artist_id', currentArtistId).order('created_at', { ascending: false });
      if (dbGL) glList = dbGL;
    } catch {}
  }

  const combined = [
    ...crList.map(x => ({ ...x, reqKind: 'copyright' })),
    ...glList.map(x => ({ ...x, reqKind: 'greenlist' })),
    ...pitchList.map(x => ({ ...x, reqKind: 'pitching' })),
    ...isrcList.map(x => ({ ...x, reqKind: 'isrc' }))
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  if (combined.length === 0) {
    serviceRequestsList.innerHTML = `
      <div style="padding:22px;background:var(--portal-card-bg);border:1px dashed var(--portal-card-border);border-radius:10px;text-align:center;">
        <p style="font-size:13px;color:var(--portal-text-muted);margin:0;">Bạn chưa có yêu cầu Bản quyền, Green-list, Pitching hay ISRC nào. Khi bạn gửi yêu cầu, tiến độ xử lý từ Admin sẽ hiển thị tại đây.</p>
      </div>
    `;
    return;
  }

  serviceRequestsList.innerHTML = `
    <div style="border:1px solid var(--portal-card-border);border-radius:12px;overflow:hidden;background:var(--portal-card-bg);box-shadow:var(--portal-shadow);">
      <div style="display:grid;grid-template-columns:150px 1fr 160px;background:var(--portal-hover-bg);padding:12px 16px;font-weight:700;font-size:11px;text-transform:uppercase;color:var(--portal-text-muted);border-bottom:1px solid var(--portal-card-border);font-family:'DM Mono',monospace;">
        <span>Loại yêu cầu</span>
        <span>Chi tiết tác phẩm & Nội dung</span>
        <span>Trạng thái xử lý</span>
      </div>
      ${combined.map(item => {
        const k = item.reqKind;
        let badgeText = '🚨 Báo cáo vi phạm';
        let badgeBg = '#fee2e2';
        let badgeColor = '#b91c1c';

        if (k === 'greenlist') {
          badgeText = '🟢 Kênh Green-list';
          badgeBg = '#dcfce7';
          badgeColor = '#15803d';
        } else if (k === 'pitching') {
          badgeText = '🎯 Pitching A&R';
          badgeBg = '#dbeafe';
          badgeColor = '#1d4ed8';
        } else if (k === 'isrc') {
          badgeText = '🏷️ Cấp mã ISRC';
          badgeBg = '#f3e8ff';
          badgeColor = '#7e22ce';
        }

        const st = item.status || 'Đang tiếp nhận';
        let pillClass = 'status-pill-receiving';
        if (st === 'Đang xử lý') pillClass = 'status-pill-processing';
        else if (st === 'Đã gửi yêu cầu') pillClass = 'status-pill-submitted';
        else if (st === 'Đã xử lý' || st.includes('Đã cấp') || st === 'Đã giải quyết' || st.includes('Hoàn tất')) pillClass = 'status-pill-resolved';
        else if (st.includes('Từ chối') || st.includes('gỡ bỏ')) pillClass = 'status-pill-rejected';

        const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : 'Vừa xong';

        let detailHtml = '';
        if (k === 'copyright') {
          detailHtml = `
            <strong style="font-size:14px;display:block;margin-bottom:3px;">${esc(item.track_title || item.track || item.title)}</strong>
            <div style="font-size:12px;color:var(--portal-text-muted);margin-bottom:4px;">
              Nền tảng: <b>${esc(item.platform)}</b> · Vi phạm: <b style="color:#b91c1c;">${esc(item.violation_type || '')}</b>
            </div>
            ${item.target_url ? `<a href="${esc(item.target_url)}" target="_blank" style="font-size:11px;color:#2563eb;text-decoration:underline;word-break:break-all;font-family:'DM Mono',monospace;">${esc(item.target_url)} ↗</a>` : ''}
          `;
        } else if (k === 'greenlist') {
          detailHtml = `
            <strong style="font-size:14px;display:block;margin-bottom:3px;">${esc(item.channel_id || item.title)}</strong>
            <div style="font-size:12px;color:var(--portal-text-muted);margin-bottom:4px;">
              Nền tảng: <b>${esc(item.platform)}</b> · Phạm vi: <b style="color:#15803d;">${esc(item.track_scope || '')}</b>
            </div>
          `;
        } else if (k === 'pitching') {
          detailHtml = `
            <strong style="font-size:14px;display:block;margin-bottom:3px;">${esc(item.track_title || item.title)}</strong>
            <div style="font-size:12px;color:var(--portal-text-muted);margin-bottom:4px;">
              Mood: <b>${esc(item.target_genre || 'Chưa rõ')}</b> ${item.target_playlists ? `· Playlists: <b>${esc(item.target_playlists)}</b>` : ''}
            </div>
            ${item.story ? `<p style="margin:4px 0 0;font-size:12px;color:var(--portal-text-dim);font-style:italic;">"${esc(item.story)}"</p>` : ''}
          `;
        } else if (k === 'isrc') {
          detailHtml = `
            <strong style="font-size:14px;display:block;margin-bottom:3px;">${esc(item.track_title || item.title)}</strong>
            <div style="font-size:12px;color:var(--portal-text-muted);margin-bottom:4px;">
              Nhạc sĩ: <b>${esc(item.songwriter || '—')}</b> · Ngày phát hành: <b>${esc(item.release_date || '—')}</b>
            </div>
          `;
        }

        return `
          <div style="border-bottom:1px solid var(--portal-card-border);padding:14px 16px;font-size:13px;">
            <div style="display:grid;grid-template-columns:150px 1fr 160px;align-items:start;gap:12px;">
              <div>
                <span style="font:10px 'DM Mono',monospace;text-transform:uppercase;font-weight:700;display:inline-block;padding:2px 8px;border-radius:6px;background:${badgeBg};color:${badgeColor};">
                  ${badgeText}
                </span>
                <small style="display:block;margin-top:4px;color:var(--portal-text-dim);font-size:11px;font-family:'DM Mono',monospace;">${esc(dateStr)}</small>
              </div>

              <div>
                ${detailHtml}
                ${item.admin_notes ? `<div style="margin-top:6px;background:var(--portal-hover-bg);border-left:3px solid #3b82f6;padding:6px 10px;font-size:11px;border-radius:0 6px 6px 0;"><strong>Phản hồi từ Admin UniFLOWs:</strong> ${esc(item.admin_notes)}</div>` : ''}
              </div>

              <div>
                <span class="${pillClass}">● ${esc(st)}</span>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
}

// ==========================================
// Theme Toggle (Light / Dark Mode)
// ==========================================
function initPortalTheme() {
  const savedTheme = localStorage.getItem('uniflows-theme') || 'light';
  applyPortalTheme(savedTheme);

  const toggleButtons = document.querySelectorAll('#theme-toggle-btn, #theme-toggle-header-btn');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const newTheme = isDark ? 'light' : 'dark';
      applyPortalTheme(newTheme);
      localStorage.setItem('uniflows-theme', newTheme);
    });
  });
}

function applyPortalTheme(theme) {
  const isDark = (theme === 'dark');
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.classList.add('dark-mode');
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.body.classList.remove('dark-mode');
  }

  // Update top nav theme slider
  if (window.cardNavInstance && typeof window.cardNavInstance.setTheme === 'function') {
    window.cardNavInstance.setTheme(isDark);
  }

  // Update all icons and text labels across header & sidebar
  document.querySelectorAll('.theme-mode-icon').forEach(el => {
    el.textContent = isDark ? '☀️' : '🌙';
  });
  document.querySelectorAll('.theme-mode-text').forEach(el => {
    el.textContent = isDark ? 'Chế độ Sáng' : 'Chế độ Tối';
  });
}

// ==========================================
// PERSISTENT NOTIFICATION CENTER
// ==========================================
let artistNotifications = [];

async function loadNotifications() {
  const notifStorageKey = 'uniflows-notifications-' + currentArtistId;
  let list = [];

  try {
    const cached = JSON.parse(localStorage.getItem(notifStorageKey) || '[]');
    if (Array.isArray(cached)) list = cached;
  } catch {}

  if (isSupabaseConfigured()) {
    try {
      const { data: dbList, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`artist_id.eq.${currentArtistId},artist_id.eq.all`)
        .order('created_at', { ascending: false });

      if (!error && dbList && dbList.length > 0) {
        // Merge Supabase with local read statuses
        list = dbList.map(item => {
          const localItem = list.find(l => l.id === item.id);
          return {
            ...item,
            is_read: localItem ? (localItem.is_read || item.is_read) : item.is_read
          };
        });
      }
    } catch (err) {
      console.warn('Lỗi tải thông báo từ Supabase, sử dụng bộ nhớ cục bộ:', err);
    }
  }

  // Generate initial events from releases, payouts & announcements if list is empty
  if (list.length === 0) {
    const initialEvents = [];

    // Announcements
    (data.announcements || []).forEach(ann => {
      if (ann.active !== false) {
        initialEvents.push({
          id: 'ann-' + (ann.id || ann.title),
          artist_id: currentArtistId,
          title: '📢 ' + (ann.title || 'Thông báo từ Hãng đĩa'),
          message: ann.content || 'Thông báo mới từ ban quản trị UniFLOWs.',
          type: 'announcement',
          is_read: false,
          created_at: new Date().toISOString()
        });
      }
    });

    // Payout requests
    (artistPayoutRequests || []).forEach(p => {
      const isPaid = p.status === 'Đã thanh toán (Hoàn tất)' || p.status === 'Đã thanh toán';
      const isRejected = p.status === 'Từ chối thanh toán' || p.status === 'Từ chối';
      const amtStr = parseInt(p.amount || 0).toLocaleString('vi-VN');
      if (isPaid) {
        initialEvents.push({
          id: 'payout-paid-' + p.id,
          artist_id: currentArtistId,
          title: '💳 Yêu cầu rút tiền được duyệt',
          message: `Khoản thanh toán ₫ ${amtStr} đã được chuyển khoản thành công vào tài khoản ngân hàng của bạn.`,
          type: 'payout',
          is_read: false,
          created_at: p.created_at || new Date().toISOString()
        });
      } else if (isRejected) {
        initialEvents.push({
          id: 'payout-rej-' + p.id,
          artist_id: currentArtistId,
          title: '❌ Yêu cầu rút tiền bị từ chối',
          message: `Yêu cầu rút ₫ ${amtStr} chưa được duyệt. Lý do: ${p.rejection_reason || 'Vui lòng kiểm tra lại số dư hoặc thông tin ngân hàng'}.`,
          type: 'payout',
          is_read: false,
          created_at: p.created_at || new Date().toISOString()
        });
      }
    });

    // Releases status
    (artist.products || []).forEach(rel => {
      const st = rel.submissionStatus || 'Đã phát hành';
      if (st === 'Đã phát hành') {
        initialEvents.push({
          id: 'rel-live-' + (rel.id || rel.slug || rel.title),
          artist_id: currentArtistId,
          title: '💿 Bản phát hành đã lên sóng',
          message: `Sản phẩm "${rel.title}" (${rel.type || 'Single'}) đã được phát hành chính thức trên Spotify, Apple Music và 150+ nền tảng!`,
          type: 'release',
          is_read: false,
          created_at: new Date().toISOString()
        });
      }
    });

    list = initialEvents;
  }

  artistNotifications = list;
  localStorage.setItem(notifStorageKey, JSON.stringify(artistNotifications));
  renderNotificationsUI();
}

let currentNotifFilter = 'all';

function renderNotificationsUI() {
  const notifList = document.querySelector('#notif-list');
  const badge = document.querySelector('#notif-badge');
  const pulseIndicator = document.querySelector('#notif-pulse-indicator');
  const totalCountEl = document.querySelector('#notif-total-count');
  const unreadCountEl = document.querySelector('#notif-unread-count');
  if (!notifList) return;

  const totalCount = artistNotifications.length;
  const unreadCount = artistNotifications.filter(n => !n.is_read).length;

  if (totalCountEl) totalCountEl.textContent = String(totalCount);
  if (unreadCountEl) unreadCountEl.textContent = String(unreadCount);

  if (badge) {
    if (unreadCount > 0) {
      badge.style.display = 'inline-block';
      badge.textContent = `${unreadCount} MỚI`;
    } else {
      badge.style.display = 'none';
    }
  }

  if (pulseIndicator) {
    pulseIndicator.style.display = unreadCount > 0 ? 'inline-block' : 'none';
  }

  let filtered = artistNotifications;
  if (currentNotifFilter === 'unread') {
    filtered = artistNotifications.filter(n => !n.is_read);
  }

  if (filtered.length === 0) {
    notifList.innerHTML = `
      <div class="notif-empty-state" style="padding: 45px 20px; text-align: center; color: var(--portal-text-muted);">
        <span style="font-size: 32px; display: block; margin-bottom: 10px;">📭</span>
        <strong style="font-size: 14px; color: var(--portal-text-main); display: block;">Không có thông báo nào</strong>
        <p style="margin: 4px 0 0; font-size: 12px;">${currentNotifFilter === 'unread' ? 'Bạn đã đọc hết tất cả thông báo!' : 'Chưa có thông báo nào mới từ Hãng Đĩa.'}</p>
      </div>
    `;
    return;
  }

  notifList.innerHTML = filtered.map((n) => {
    const origIdx = artistNotifications.indexOf(n);
    const isUnread = !n.is_read;
    const timeStr = n.created_at ? new Date(n.created_at).toLocaleString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    }) : '';

    let badgeClass = 'notif-badge-system';
    let badgeText = 'HỆ THỐNG';
    if (n.type === 'release' || (n.title && n.title.includes('phát hành'))) {
      badgeClass = 'notif-badge-release';
      badgeText = 'A&R / BÀI HÁT';
    } else if (n.type === 'payout' || (n.title && n.title.includes('tiền'))) {
      badgeClass = 'notif-badge-payout';
      badgeText = 'DOANH THU & VÍ';
    }

    return `
      <div class="notif-card-item ${isUnread ? 'unread' : ''}" data-notif-idx="${origIdx}">
        <div class="notif-card-header">
          <span class="notif-badge-tag ${badgeClass}">${badgeText}</span>
          <span class="notif-time-badge" style="font-size:10.5px; color:var(--portal-text-dim); font-family:'DM Mono',monospace;">${esc(timeStr)}</span>
        </div>
        <h4 class="notif-card-title">${esc(n.title)}</h4>
        <p class="notif-card-body">${esc(n.message)}</p>
        <div class="notif-card-footer">
          <span style="font-size:11px; color:${isUnread ? '#2563eb' : 'var(--portal-text-dim)'}; font-weight:700;">
            ${isUnread ? '● Chưa đọc' : '✓ Đã xem'}
          </span>
          ${isUnread ? `
            <button type="button" class="mark-single-read-btn" data-notif-idx="${origIdx}" style="background:none; border:none; color:#2563eb; cursor:pointer; font-weight:700; font-size:11.5px; padding:2px 6px;">
              Đánh dấu đã đọc ✓
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Single mark read handlers
  notifList.querySelectorAll('.mark-single-read-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.notifIdx, 10);
      if (artistNotifications[idx]) {
        artistNotifications[idx].is_read = true;
        const notifId = artistNotifications[idx].id;
        const notifStorageKey = 'uniflows-notifications-' + currentArtistId;
        localStorage.setItem(notifStorageKey, JSON.stringify(artistNotifications));
        renderNotificationsUI();

        if (isSupabaseConfigured() && notifId && !notifId.startsWith('ann-') && !notifId.startsWith('rel-') && !notifId.startsWith('payout-')) {
          try {
            await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
          } catch {}
        }
      }
    };
  });
}

function initNotifications() {
  const btnNotif = document.querySelector('#btn-notif');
  const drawer = document.querySelector('#portal-notif-drawer');
  const backdrop = document.querySelector('#portal-notif-backdrop');
  const closeBtn = document.querySelector('#close-notif-drawer-btn');
  const markAllRead = document.querySelector('#mark-all-read-btn');
  const filterTabs = document.querySelectorAll('.notif-tab-btn');

  function openNotifDrawer() {
    drawer?.classList.add('open');
    backdrop?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeNotifDrawer() {
    drawer?.classList.remove('open');
    backdrop?.classList.remove('open');
    document.body.style.overflow = '';
  }

  btnNotif?.addEventListener('click', (e) => {
    e.stopPropagation();
    openNotifDrawer();
  });

  closeBtn?.addEventListener('click', closeNotifDrawer);
  backdrop?.addEventListener('click', closeNotifDrawer);

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentNotifFilter = tab.dataset.filter || 'all';
      renderNotificationsUI();
    });
  });

  if (markAllRead) {
    markAllRead.addEventListener('click', async () => {
      artistNotifications.forEach(n => { n.is_read = true; });
      const notifStorageKey = 'uniflows-notifications-' + currentArtistId;
      localStorage.setItem(notifStorageKey, JSON.stringify(artistNotifications));
      renderNotificationsUI();

      if (isSupabaseConfigured()) {
        try {
          await supabase.from('notifications').update({ is_read: true }).eq('artist_id', currentArtistId);
        } catch {}
      }
    });
  }

  loadNotifications();

  // Subscribe to realtime notifications
  if (isSupabaseConfigured()) {
    try {
      supabase
        .channel('public:notifications:' + currentArtistId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          loadNotifications();
        })
        .subscribe();
    } catch {}
  }
}

function renderReleaseCalendar() {
  const container = document.querySelector('#release-calendar-list');
  if(!container) return;
  const products = artist.products || [];
  if(products.length === 0) {
    container.innerHTML = '<p class="empty" style="padding:20px;">Chưa có lịch phát hành nào.</p>';
    return;
  }
  
  container.innerHTML = products.map(p => {
    return `<div style="background:var(--portal-card-bg);border:1px solid var(--portal-card-border);border-radius:12px;padding:16px;display:flex;align-items:center;gap:16px;box-shadow:var(--portal-shadow);">
      <img src="${esc(p.artworkUrl || '')}" style="width:60px;height:60px;border-radius:6px;object-fit:cover;">
      <div style="flex:1;">
        <h4 style="margin:0;font-size:15px;">${esc(p.title)}</h4>
        <p style="margin:4px 0 0;font-size:12px;color:var(--portal-text-muted);">Phát hành: ${esc(p.releaseDate || 'Đang cập nhật')} &bull; ${esc(p.type || 'Single')}</p>
      </div>
      <button class="button alt" onclick="generateEPK('${esc(p.id)}')" style="font-size:11px;padding:8px 14px;"><i class="fa fa-file-invoice"></i> Tạo EPK</button>
    </div>`;
  }).join('');
}

window.generateEPK = function(releaseId) {
  const release = (artist.products || []).find(r => r.id === releaseId);
  if(!release) return;
  const epkDialog = document.querySelector('#epk-dialog');
  const printArea = document.querySelector('#epk-printable-area');
  if(epkDialog && printArea) {
    printArea.innerHTML = `<div style="text-align:center;margin-bottom:30px;">
        <img src="https://ui-avatars.com/api/?name=UniFLOWs+Records&background=1e293b&color=fff&rounded=true&size=80" style="margin-bottom:10px;">
        <h1 style="font-size:24px;font-weight:900;letter-spacing:-0.05em;margin:0;">UNIFLOWS RECORDS</h1>
        <p style="font-size:11px;color:#666;margin:4px 0 0;letter-spacing:1px;text-transform:uppercase;">Official Electronic Press Kit</p>
      </div>
      <div style="display:flex;gap:24px;align-items:flex-start;">
        <img src="${esc(release.artworkUrl)}" style="width:200px;height:200px;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,0.1);">
        <div style="flex:1;">
          <h2 style="font-size:28px;margin:0;font-weight:800;">${esc(release.title)}</h2>
          <h3 style="font-size:18px;margin:8px 0 0;color:#444;">${esc(artist.name)}</h3>
          <div style="margin-top:20px;font-size:13px;color:#333;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div><strong>Ngày phát hành:</strong><br>${esc(release.releaseDate || 'TBA')}</div>
            <div><strong>Định dạng:</strong><br>${esc(release.type || 'Single')}</div>
            <div><strong>Thể loại:</strong><br>${esc(release.primaryGenre || 'Pop')}</div>
            <div><strong>ISRC:</strong><br>${esc(release.isrc || 'Pending')}</div>
          </div>
        </div>
      </div>
      <div style="margin-top:30px;border-top:1px solid #eee;padding-top:20px;">
        <h4 style="font-size:14px;margin:0 0 10px;">Về ${esc(artist.name)} & Bản phát hành</h4>
        <p style="font-size:13px;line-height:1.6;color:#444;">${esc(artist.name)} tiếp tục khẳng định phong cách âm nhạc độc đáo với <strong>"${esc(release.title)}"</strong>. Bản thu âm này được đầu tư kỹ lưỡng từ khâu sản xuất đến hình ảnh, đánh dấu cột mốc quan trọng trong sự nghiệp âm nhạc, hướng tới việc mở rộng tệp khán giả trên các nền tảng streaming toàn cầu.</p>
      </div>
      <div style="margin-top:30px;text-align:center;font-size:11px;color:#888;">
        &copy; 2026 UniFLOWs Label. All Rights Reserved.<br>Contact: promo@uniflowslabel.com
      </div>`;
    epkDialog.showModal();
  }
};

document.querySelector('#close-epk-btn')?.addEventListener('click', () => document.querySelector('#epk-dialog')?.close());
document.querySelector('#cancel-epk-btn')?.addEventListener('click', () => document.querySelector('#epk-dialog')?.close());
document.querySelector('#print-epk-btn')?.addEventListener('click', () => {
  const printContent = document.querySelector('#epk-printable-area').innerHTML;
  const originalContent = document.body.innerHTML;
  document.body.innerHTML = printContent;
  window.print();
  document.body.innerHTML = originalContent;
  location.reload();
});

// ====================================================
// CATALOG MIGRATION & GRANULAR TAKEDOWN WIZARD
// ====================================================
const migrationDialog = document.querySelector('#migration-wizard-dialog');
const openMigrationBtn = document.querySelector('#open-migration-wizard-btn');
const closeMigrationBtn = document.querySelector('#close-mig-dialog-btn');
const closeMigrationBtn2 = document.querySelector('#close-mig-dialog-btn-2');
const migTabIngestBtn = document.querySelector('#mig-tab-btn-ingest');
const migTabTakedownBtn = document.querySelector('#mig-tab-btn-takedown');
const migPanelIngest = document.querySelector('#mig-panel-ingest');
const migPanelTakedown = document.querySelector('#mig-panel-takedown');
const migIngestForm = document.querySelector('#mig-ingest-form');
const migTakedownForm = document.querySelector('#mig-takedown-form');
const exportMetaBtn = document.querySelector('#export-metadata-json-btn');

openMigrationBtn?.addEventListener('click', () => {
  const select = document.querySelector('#mig-takedown-release-select');
  if (select) {
    const products = cachedFetchedReleases || artist.products || [];
    if (products.length === 0) {
      select.innerHTML = '<option value="">(Chưa có tác phẩm nào trong catalogue)</option>';
    } else {
      select.innerHTML = products.map(p => `<option value="${esc(p.id || p.slug || p.title)}">${esc(p.title)} (${esc(p.type || 'Single')})</option>`).join('');
    }
  }
  migrationDialog?.showModal();
});

closeMigrationBtn?.addEventListener('click', () => migrationDialog?.close());
closeMigrationBtn2?.addEventListener('click', () => migrationDialog?.close());

migTabIngestBtn?.addEventListener('click', () => {
  migTabIngestBtn.classList.add('active');
  migTabTakedownBtn?.classList.remove('active');
  if (migPanelIngest) migPanelIngest.style.display = 'block';
  if (migPanelTakedown) migPanelTakedown.style.display = 'none';
});

migTabTakedownBtn?.addEventListener('click', () => {
  migTabTakedownBtn.classList.add('active');
  migTabIngestBtn?.classList.remove('active');
  if (migPanelIngest) migPanelIngest.style.display = 'none';
  if (migPanelTakedown) migPanelTakedown.style.display = 'block';
});

migIngestForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.querySelector('#mig-song-title')?.value.trim();
  const isrc = document.querySelector('#mig-isrc-code')?.value.trim();
  const upc = document.querySelector('#mig-upc-code')?.value.trim();
  const date = document.querySelector('#mig-orig-date')?.value;
  const distro = document.querySelector('#mig-old-distro')?.value;
  const spotifyUrl = document.querySelector('#mig-spotify-url')?.value.trim();

  const newMigrated = {
    title,
    type: `Single (Chuyển giao từ ${distro})`,
    slug: slug(title),
    submissionStatus: 'Đang chờ UniFLOWs duyệt (Chuyển giao ISRC)',
    releaseDate: date,
    links: { spotify: spotifyUrl || '#' },
    metadata: {
      isrc,
      upc,
      originalDistributor: distro,
      originalReleaseDate: date,
      isMigrated: true,
      spotifyTrackUri: spotifyUrl
    }
  };

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('releases').insert({
        artist_id: currentArtistId,
        title,
        type: `Single (Chuyển giao từ ${distro})`,
        release_date: date,
        slug: slug(title),
        upc: isrc,
        links: { spotify: spotifyUrl || '#' },
        submission_status: 'Đang chờ UniFLOWs duyệt (Chuyển giao ISRC)',
        metadata: newMigrated.metadata
      });
    } catch (err) {
      console.warn('Lưu Supabase chuyển giao lỗi:', err);
    }
  }

  if (!artist.products) artist.products = [];
  artist.products.unshift(newMigrated);
  await saveData(data);

  // Gửi vào bảng Special Requests & Thông báo Admin
  await submitSpecialRequest({
    type: 'catalog_transfer',
    title: `Chuyển giao Catalog: "${title}" (ISRC: ${isrc})`,
    details: {
      title,
      isrc,
      upc,
      releaseDate: date,
      currentDistributor: distro,
      spotifyUrl
    }
  });

  alert(`✓ Đã tiếp nhận hồ sơ chuyển giao tác phẩm "${title}" (ISRC: ${isrc}) từ ${distro}!\n\nUniFLOWs sẽ cấu hình Delivery Engine để giữ nguyên 100% lượt stream và playlist trên Spotify & Apple Music.`);
  migrationDialog?.close();
  migIngestForm.reset();
  await renderReleases();
});

migTakedownForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const relId = document.querySelector('#mig-takedown-release-select')?.value;
  const reason = document.querySelector('#mig-takedown-reason')?.value;
  const checkboxes = Array.from(document.querySelectorAll('input[name="dsp_takedown"]:checked')).map(cb => cb.value);

  const statusText = `Yêu cầu gỡ: [${checkboxes.join(', ')}] - ${reason}`;

  if (isSupabaseConfigured() && relId) {
    try {
      await supabase.from('releases').update({
        submission_status: statusText
      }).eq('id', relId);
    } catch {}
  }

  const item = (artist.products || []).find(p => p.id === relId || p.slug === relId);
  if (item) {
    item.submissionStatus = statusText;
    await saveData(data);
  }

  // Gửi vào bảng Special Requests & Thông báo Admin
  await submitSpecialRequest({
    type: 'takedown',
    title: `Yêu cầu gỡ bài hát: "${item?.title || relId}"`,
    details: {
      releaseId: relId,
      releaseTitle: item?.title || relId,
      platforms: checkboxes,
      reason
    }
  });

  alert(`✓ Đã gửi lệnh gỡ bài hát khỏi [${checkboxes.join(', ')}] tới Admin của UniFLOWs với lý do: "${reason}".`);
  migrationDialog?.close();
  await renderReleases();
});

// Quick action buttons in Tab 5 (Support & Rights)
document.querySelector('#open-takedown-quick-btn')?.addEventListener('click', () => {
  migrationDialog?.showModal();
  migTabTakedownBtn?.click();
  populateTakedownReleases();
});

document.querySelector('#open-catalog-transfer-btn')?.addEventListener('click', () => {
  migrationDialog?.showModal();
  migTabIngestBtn?.click();
});

exportMetaBtn?.addEventListener('click', () => {
  const metaBackup = {
    artist: artist.name,
    artistId: artist.id,
    generatedAt: new Date().toISOString(),
    catalog: cachedFetchedReleases || artist.products || []
  };
  const blob = new Blob([JSON.stringify(metaBackup, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `UniFLOWs_Metadata_Backup_${artist.id}_${Date.now()}.json`;
  a.click();
});

// ====================================================
// PORTAL LANGUAGE TOGGLE & TRANSLATION SYSTEM
// ====================================================
function initPortalLanguage() {
  const currentLang = getCurrentLang();
  applyTranslations(currentLang);

  const langBtn = document.querySelector('#portal-lang-toggle-btn');
  if (!langBtn) return;

  function updatePortalLanguageUI(lang) {
    const isEn = lang === 'en';
    const flagEl = langBtn.querySelector('.lang-flag');
    const textEl = langBtn.querySelector('.lang-text');
    if (flagEl) flagEl.textContent = isEn ? '🇬🇧' : '🇻🇳';
    if (textEl) textEl.textContent = isEn ? 'English' : 'Tiếng Việt';

    applyTranslations(lang);
    try { renderRoleInfo(lang); } catch {}
    try { renderArtistPublishingEarnings(); } catch {}
  }

  updatePortalLanguageUI(currentLang);

  langBtn.addEventListener('click', () => {
    const current = getCurrentLang();
    const next = current === 'vi' ? 'en' : 'vi';
    setLang(next);
    updatePortalLanguageUI(next);
  });

  window.addEventListener('uniflows-lang-change', (e) => {
    const lang = e.detail?.lang || getCurrentLang();
    try { renderRoleInfo(lang); } catch {}
    try { renderArtistPublishingEarnings(); } catch {}
  });
}

// ====================================================
// ARTIST PUBLISHING & SYNC REVENUE LEDGER
// ====================================================
function renderArtistPublishingEarnings() {
  const pubRevEl = document.querySelector('#artist-publishing-revenue-display');
  const badgeEl = document.querySelector('#publishing-contracts-badge');
  const listEl = document.querySelector('#artist-publishing-contracts-list');
  if (!pubRevEl || !listEl) return;

  const isEn = getCurrentLang() === 'en';
  const contracts = artist.publishingContracts || [];
  const pubRev = parseInt(String(artist.publishingRevenue || '0').replace(/[^0-9]/g, ''), 10) || 0;

  pubRevEl.textContent = `₫ ${pubRev.toLocaleString('vi-VN')}`;
  if (badgeEl) badgeEl.textContent = isEn ? `${contracts.length} Licensed Agreements` : `${contracts.length} Hợp đồng đã cấp phép`;

  if (contracts.length === 0) {
    listEl.innerHTML = `<p class="empty" style="font-size:13px;padding:16px;background:rgba(255,255,255,0.05);border:1px dashed rgba(255,255,255,0.2);border-radius:10px;color:#94a3b8;">${isEn ? 'No active sync licensing agreements recorded in this period. When your tracks are cleared and licensed for films, TVCs, or games, royalty disbursements will appear here.' : 'Chưa có hợp đồng cấp phép Sync phát sinh trong kỳ này. Khi các tác phẩm của bạn được cấp phép sử dụng cho Phim hoặc TVC, khoản thanh toán sẽ tự động hiển thị tại đây.'}</p>`;
    return;
  }

  listEl.innerHTML = `
    <div style="border:1px solid rgba(255,255,255,0.15);border-radius:10px;overflow:hidden;background:rgba(0,0,0,0.2);">
      <div style="display:grid;grid-template-columns:120px 1.8fr 1.5fr 1fr 1fr 140px;background:rgba(255,255,255,0.08);padding:10px 14px;font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;font-family:'DM Mono',monospace;">
        <span>${isEn ? 'Licensed Date' : 'Ngày cấp phép'}</span>
        <span>${isEn ? 'Track & Client' : 'Tác phẩm & Đơn vị mua'}</span>
        <span>${isEn ? 'Media & Term' : 'Loại hình & Thời hạn'}</span>
        <span>${isEn ? 'Total Sync Fee' : 'Tổng phí Sync'}</span>
        <span>${isEn ? 'Split %' : 'Tỷ lệ Split'}</span>
        <span>${isEn ? 'Net Payable' : 'Thực nhận'}</span>
      </div>
      ${contracts.map(c => `
        <div style="display:grid;grid-template-columns:120px 1.8fr 1.5fr 1fr 1fr 140px;padding:14px;border-top:1px solid rgba(255,255,255,0.08);font-size:13px;align-items:center;">
          <span style="font-family:'DM Mono',monospace;color:#94a3b8;font-size:12px;">${esc(c.licensedDate || (isEn ? 'Recent' : 'Gần đây'))}</span>
          <div>
            <strong style="color:#fff;font-size:14px;display:block;">${esc(c.trackTitle)}</strong>
            <span style="font-size:12px;color:#94a3b8;">${esc(c.client)}</span>
          </div>
          <div>
            <span style="font-size:12px;color:#38bdf8;">${esc(c.mediaType)}</span>
            <small style="display:block;color:#94a3b8;margin-top:2px;">${esc(c.territory || (isEn ? 'Vietnam' : 'Việt Nam'))} · ${esc(c.term || (isEn ? '1 Year' : '1 Năm'))}</small>
          </div>
          <span style="font-family:'DM Mono',monospace;color:#cbd5e1;">₫ ${(c.totalFee || 0).toLocaleString('vi-VN')}</span>
          <b style="font-family:'DM Mono',monospace;color:#818cf8;">${c.artistSplitPct || 75}%</b>
          <b style="font-family:'DM Mono',monospace;color:#34d399;font-size:14px;">₫ ${(c.artistEarning || 0).toLocaleString('vi-VN')}</b>
        </div>
      `).join('')}
    </div>
  `;
}

// ====================================================
// SYNCED LYRICS STUDIO (.LRC GENERATOR & REALTIME STAMPING)
// ====================================================
let lyricsAudio = document.querySelector('#lyrics-html5-audio');
let lyricsLines = [];
let currentLyricsLineIndex = 0;
let isAudioPlaying = false;

function initSyncedLyricsStudio() {
  lyricsAudio = document.querySelector('#lyrics-html5-audio');
  const trackSelect = document.querySelector('#lyrics-track-select');
  const audioFileInp = document.querySelector('#lyrics-audio-file');
  const playBtn = document.querySelector('#lyrics-btn-play');
  const timeDisplay = document.querySelector('#lyrics-time-display');
  const seekBar = document.querySelector('#lyrics-audio-seek');
  const rateSelect = document.querySelector('#lyrics-playback-rate');
  const rwBtn = document.querySelector('#lyrics-btn-rw');
  const ffBtn = document.querySelector('#lyrics-btn-ff');
  const stampBtn = document.querySelector('#lyrics-btn-stamp');
  const initStampingBtn = document.querySelector('#lyrics-btn-init-stamping');
  const loadSampleBtn = document.querySelector('#lyrics-btn-load-sample');
  const rawInput = document.querySelector('#lyrics-raw-input');
  const linesContainer = document.querySelector('#lyrics-lines-container');
  const resetTimestampsBtn = document.querySelector('#lyrics-btn-reset-timestamps');
  const downloadLrcBtn = document.querySelector('#lyrics-btn-download-lrc');
  const copyLrcBtn = document.querySelector('#lyrics-btn-copy-lrc');
  const saveToReleaseBtn = document.querySelector('#lyrics-btn-save-to-release');
  const trackNameDisplay = document.querySelector('#lyrics-current-track-name');
  const counterDisplay = document.querySelector('#lyrics-active-line-counter');

  if (!lyricsAudio || !playBtn) return;

  // 1. Populate track select from artist catalogue
  if (trackSelect) {
    const products = artist.products || [];
    if (products.length === 0) {
      trackSelect.innerHTML = '<option value="">Chưa có bài hát trong catalogue</option>';
    } else {
      trackSelect.innerHTML = products.map((p, idx) => `
        <option value="${idx}" data-title="${esc(p.title)}" data-audio="${esc(p.audioUrl || '')}">
          ${esc(p.title)} (${esc(p.type || 'Single')})
        </option>
      `).join('');
    }

    trackSelect.onchange = () => {
      const opt = trackSelect.selectedOptions[0];
      if (opt && opt.dataset.title) {
        trackNameDisplay.textContent = opt.dataset.title;
        if (opt.dataset.audio) {
          lyricsAudio.src = opt.dataset.audio;
          lyricsAudio.load();
        }
      }
    };
    // Trigger initial select
    if (trackSelect.options.length > 0) {
      trackSelect.dispatchEvent(new Event('change'));
    }
  }

  // 2. Local Audio File Picker
  audioFileInp?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      lyricsAudio.src = blobUrl;
      lyricsAudio.load();
      if (trackNameDisplay) trackNameDisplay.textContent = file.name.replace(/\.[^/.]+$/, '');
      showNotice(`✓ Đã nạp file âm thanh: ${file.name}`);
    }
  });

  // 3. Audio Controls
  function formatLrcTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00.00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds - Math.floor(seconds)) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }

  function formatDisplayTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00.00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds - Math.floor(seconds)) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }

  playBtn.onclick = () => {
    if (!lyricsAudio.src || lyricsAudio.src === window.location.href) {
      // Create a virtual synthesized tone for demo if no audio loaded
      simulateDemoAudioPlayback();
      return;
    }
    if (lyricsAudio.paused) {
      lyricsAudio.play();
      playBtn.textContent = '⏸ TẠM DỪNG';
      playBtn.style.background = '#f59e0b';
      playBtn.style.borderColor = '#f59e0b';
      isAudioPlaying = true;
    } else {
      lyricsAudio.pause();
      playBtn.textContent = '▶ PHÁT';
      playBtn.style.background = '#38bdf8';
      playBtn.style.borderColor = '#38bdf8';
      isAudioPlaying = false;
    }
  };

  lyricsAudio.ontimeupdate = () => {
    const cur = lyricsAudio.currentTime || 0;
    const dur = lyricsAudio.duration || 1;
    if (timeDisplay) {
      timeDisplay.textContent = `${formatDisplayTime(cur)} / ${formatDisplayTime(dur)}`;
    }
    if (seekBar && !seekBar.matches(':active')) {
      seekBar.value = Math.floor((cur / dur) * 100);
    }
    updateKaraokeDisplay(cur);
  };

  seekBar.oninput = () => {
    const dur = lyricsAudio.duration || 1;
    lyricsAudio.currentTime = (seekBar.value / 100) * dur;
  };

  rwBtn.onclick = () => {
    lyricsAudio.currentTime = Math.max(0, (lyricsAudio.currentTime || 0) - 3);
  };

  ffBtn.onclick = () => {
    lyricsAudio.currentTime = Math.min((lyricsAudio.duration || 9999), (lyricsAudio.currentTime || 0) + 3);
  };

  rateSelect.onchange = () => {
    lyricsAudio.playbackRate = parseFloat(rateSelect.value || '1.0');
  };

  // 4. Sample Lyrics loader
  loadSampleBtn.onclick = () => {
    rawInput.value = `Đêm buông dần trên những góc phố quen
Ánh đèn mờ soi bóng ai bên thềm
Từng giai điệu rơi vào trong màn đêm
Chờ đợi tia sáng đánh thức con tim
Và em biết ta luôn thuộc về nhau
Qua muôn ngàn dải tần không biên giới
UniFLOWs studio sound
Every heartbeat belongs to you`;
    showNotice('✓ Đã nạp lời bài hát mẫu!');
  };

  // 5. Initialize Lyrics Stamping Table
  initStampingBtn.onclick = () => {
    const text = rawInput.value.trim();
    if (!text) {
      alert('Vui lòng nhập hoặc dán lời bài hát vào ô trước khi bắt đầu.');
      return;
    }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    lyricsLines = lines.map((line, idx) => ({
      id: idx,
      text: line,
      timestamp: null,
      timeSeconds: null
    }));

    currentLyricsLineIndex = 0;
    renderLyricsEditorLines();
    showNotice(`✓ Đã nạp thành công ${lyricsLines.length} dòng lời. Hãy bấm Phát nhạc và nhấn Space để gắn nhịp!`);
  };

  function renderLyricsEditorLines() {
    if (!linesContainer) return;
    if (lyricsLines.length === 0) {
      linesContainer.innerHTML = '<p style="font-size:12px;color:var(--portal-text-dim);text-align:center;padding:20px;">Chưa có dòng lời nào. Hãy dán lời bài hát ở bên trái và bấm "Nạp Lời".</p>';
      if (counterDisplay) counterDisplay.textContent = 'Dòng 0 / 0';
      return;
    }

    if (counterDisplay) {
      counterDisplay.textContent = `Dòng ${Math.min(currentLyricsLineIndex + 1, lyricsLines.length)} / ${lyricsLines.length}`;
    }

    linesContainer.innerHTML = lyricsLines.map((line, idx) => {
      const isCurrent = idx === currentLyricsLineIndex;
      const isStamped = line.timestamp !== null;
      return `
        <div class="lyrics-line-row ${isCurrent ? 'active-target' : ''}" data-idx="${idx}" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;border-radius:8px;border:1px solid ${isCurrent ? '#3b82f6' : (isStamped ? '#10b981' : 'var(--portal-card-border)')};background:${isCurrent ? 'rgba(59,130,246,0.1)' : (isStamped ? 'rgba(16,185,129,0.06)' : 'var(--portal-hover-bg)')};transition:all 0.2s;">
          <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
            <span style="font-family:'DM Mono',monospace;font-size:11px;font-weight:bold;color:${isCurrent ? '#2563eb' : (isStamped ? '#059669' : 'var(--portal-text-dim)')};min-width:24px;">
              ${String(idx + 1).padStart(2, '0')}
            </span>
            <span style="font-size:13px;font-weight:${isCurrent ? '700' : '500'};color:var(--portal-text-main);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${esc(line.text)}
            </span>
          </div>

          <div style="display:flex;align-items:center;gap:6px;">
            <span class="lrc-tag" style="font-family:'DM Mono',monospace;font-size:11px;font-weight:800;padding:2px 8px;border-radius:4px;background:${isStamped ? '#065f46;color:#34d399;' : '#334155;color:#94a3b8;'}">
              ${line.timestamp || '[ --:--.-- ]'}
            </span>
            <button type="button" class="btn-set-line-focus" data-idx="${idx}" title="Chọn làm dòng mục tiêu tiếp theo" style="border:none;background:none;cursor:pointer;font-size:12px;">🎯</button>
            ${isStamped ? `<button type="button" class="btn-clear-line-time" data-idx="${idx}" title="Xóa timestamp dòng này" style="border:none;background:none;color:#ef4444;cursor:pointer;font-size:11px;">✕</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Attach row events
    linesContainer.querySelectorAll('.btn-set-line-focus').forEach(btn => {
      btn.onclick = () => {
        currentLyricsLineIndex = parseInt(btn.dataset.idx, 10);
        renderLyricsEditorLines();
      };
    });

    linesContainer.querySelectorAll('.btn-clear-line-time').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx, 10);
        lyricsLines[idx].timestamp = null;
        lyricsLines[idx].timeSeconds = null;
        renderLyricsEditorLines();
      };
    });

    // Auto-scroll active row into view
    const activeRow = linesContainer.querySelector('.active-target');
    if (activeRow) {
      activeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // 6. Real-time Stamping Function
  function recordCurrentTimestamp() {
    if (lyricsLines.length === 0) return;
    if (currentLyricsLineIndex >= lyricsLines.length) {
      showNotice('✓ Đã gắn nhịp hoàn tất cho toàn bộ ca khúc!');
      return;
    }

    const curTime = lyricsAudio.currentTime || 0;
    const lrcTag = `[${formatLrcTime(curTime)}]`;

    lyricsLines[currentLyricsLineIndex].timestamp = lrcTag;
    lyricsLines[currentLyricsLineIndex].timeSeconds = curTime;

    currentLyricsLineIndex++;
    renderLyricsEditorLines();
  }

  stampBtn.onclick = recordCurrentTimestamp;

  // Spacebar global capture inside lyrics tab
  window.addEventListener('keydown', (e) => {
    const isLyricsTabActive = document.querySelector('#tab-lyrics')?.classList.contains('active');
    if (!isLyricsTabActive) return;

    // Do not trigger if typing in raw textarea or normal inputs
    if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) {
      return;
    }

    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      recordCurrentTimestamp();
    }
  });

  resetTimestampsBtn.onclick = () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ timestamps đã gắn?')) {
      lyricsLines.forEach(l => {
        l.timestamp = null;
        l.timeSeconds = null;
      });
      currentLyricsLineIndex = 0;
      renderLyricsEditorLines();
      showNotice('✓ Đã đặt lại timestamps!');
    }
  };

  // 7. Live Karaoke Display Sync
  function updateKaraokeDisplay(curTime) {
    const prevEl = document.querySelector('#karaoke-prev-line');
    const curEl = document.querySelector('#karaoke-current-line');
    const nextEl = document.querySelector('#karaoke-next-line');
    if (!curEl) return;

    const stamped = lyricsLines.filter(l => l.timeSeconds !== null).sort((a, b) => a.timeSeconds - b.timeSeconds);
    if (stamped.length === 0) return;

    let activeIdx = -1;
    for (let i = 0; i < stamped.length; i++) {
      if (curTime >= stamped[i].timeSeconds) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx >= 0) {
      if (prevEl) prevEl.textContent = activeIdx > 0 ? stamped[activeIdx - 1].text : '—';
      curEl.textContent = `🎵 ${stamped[activeIdx].text}`;
      curEl.style.color = '#34d399';
      curEl.style.textShadow = '0 0 20px rgba(52,211,153,0.8)';
      if (nextEl) nextEl.textContent = (activeIdx < stamped.length - 1) ? stamped[activeIdx + 1].text : '—';
    }
  }

  // 8. Generate .LRC Output Text
  function generateLrcPayload() {
    const trackTitle = trackNameDisplay?.textContent || 'Track';
    const header = [
      `[ar:${artist.name || 'UniFLOWs Artist'}]`,
      `[ti:${trackTitle}]`,
      `[al:${trackTitle} - Single]`,
      `[by:UniFLOWs Synced Lyrics Studio]`,
      `[offset:0]`,
      ''
    ].join('\n');

    const body = lyricsLines.map(l => `${l.timestamp || '[00:00.00]'}${l.text}`).join('\n');
    return `${header}\n${body}`;
  }

  downloadLrcBtn.onclick = () => {
    if (lyricsLines.length === 0) {
      alert('Vui lòng nạp lời bài hát trước khi tải file .LRC.');
      return;
    }
    const payload = generateLrcPayload();
    const blob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${(trackNameDisplay?.textContent || 'lyrics').replace(/\s+/g, '_')}.lrc`;
    link.click();
    showNotice('✓ Đã tải file .LRC về máy thành công!');
  };

  copyLrcBtn.onclick = () => {
    const payload = generateLrcPayload();
    navigator.clipboard.writeText(payload).then(() => {
      showNotice('✓ Đã sao chép toàn bộ mã .LRC vào bộ nhớ tạm!');
    }).catch(() => {
      prompt('Mã .LRC của bạn:', payload);
    });
  };

  saveToReleaseBtn.onclick = async () => {
    if (lyricsLines.length === 0) {
      alert('Vui lòng nạp và gắn timestamps cho bài hát.');
      return;
    }
    const payload = generateLrcPayload();
    const trackTitle = trackNameDisplay?.textContent || '';
    
    // Attach to matching release product
    const prod = (artist.products || []).find(p => p.title.toLowerCase() === trackTitle.toLowerCase());
    if (prod) {
      if (!prod.metadata) prod.metadata = {};
      prod.metadata.syncedLyricsLRC = payload;
      prod.metadata.hasSyncedLyrics = true;
      const allData = await getData();
      const myIdx = allData.artists.findIndex(a => a.id === artist.id);
      if (myIdx >= 0) {
        allData.artists[myIdx] = artist;
        await saveData(allData);
      }
      showNotice(`✓ Đã lưu file lời đồng bộ .LRC vào siêu dữ liệu phát hành của "${trackTitle}"!`);
    } else {
      showNotice(`✓ Đã tạo file .LRC cho "${trackTitle}". Bạn có thể tải file về để gửi kèm bản thu.`);
    }
  };
}

function simulateDemoAudioPlayback() {
  const timeDisplay = document.querySelector('#lyrics-time-display');
  const playBtn = document.querySelector('#lyrics-btn-play');
  if (isAudioPlaying) {
    isAudioPlaying = false;
    if (playBtn) playBtn.textContent = '▶ PHÁT';
    return;
  }
  isAudioPlaying = true;
  if (playBtn) {
    playBtn.textContent = '⏸ TẠM DỪNG (ĐANG CHẠY MẪU)';
    playBtn.style.background = '#f59e0b';
  }
  
  let cur = 0;
  const dur = 180;
  const interval = setInterval(() => {
    if (!isAudioPlaying) {
      clearInterval(interval);
      return;
    }
    cur += 0.2;
    if (lyricsAudio) lyricsAudio.currentTime = cur;
    if (cur >= dur) {
      isAudioPlaying = false;
      clearInterval(interval);
      if (playBtn) playBtn.textContent = '▶ PHÁT';
    }
  }, 200);
}

try { initPortalTheme(); } catch (e) { console.warn('initPortalTheme err:', e); }
try { initPortalLanguage(); } catch (e) { console.warn('initPortalLanguage err:', e); }
try { renderReleases(); } catch (e) { console.warn('renderReleases err:', e); }
try { loadArtistPayouts(); } catch (e) { console.warn('loadArtistPayouts err:', e); }
try { renderArtistPublishingEarnings(); } catch (e) { console.warn('renderArtistPublishingEarnings err:', e); }
try { loadArtistServiceRequests(); } catch (e) { console.warn('loadArtistServiceRequests err:', e); }
try { initNotifications(); } catch (e) { console.warn('initNotifications err:', e); }
try { renderReleaseCalendar(); } catch (e) { console.warn('renderReleaseCalendar err:', e); }
try { initSyncedLyricsStudio(); } catch (e) { console.warn('initSyncedLyricsStudio err:', e); }
try { initDspControls(); } catch (e) { console.warn('initDspControls err:', e); }
try { initTerritoryControls(); } catch (e) { console.warn('initTerritoryControls err:', e); }
try { initLanguageSearchableControls(); } catch (e) { console.warn('initLanguageSearchableControls err:', e); }
try { initSearchableBankDropdown(); } catch (e) { console.warn('initSearchableBankDropdown err:', e); }
try { initProfileSettingsDialog(); } catch (e) { console.warn('initProfileSettingsDialog err:', e); }
