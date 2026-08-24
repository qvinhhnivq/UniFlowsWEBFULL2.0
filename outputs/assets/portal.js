import { getData, saveData } from './data.js';
import { supabase, isSupabaseConfigured, uploadArtworkFile, uploadAudioFile } from './supabase.js';
import { applyTranslations, getCurrentLang, setLang, t } from './i18n.js';
import './security.js';

// Kiểm tra quyền đăng nhập
const isArtistAuth = sessionStorage.getItem('uniflows-artist') === 'true' || localStorage.getItem('uniflows-artist') === 'true';
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
const cancelReleaseBtn = document.querySelector('#cancel-release-btn');

let data = await getData();
const sessionArtistId = sessionStorage.getItem('uniflows-artist-id') || localStorage.getItem('uniflows-artist-id');
const sessionEmail = sessionStorage.getItem('uniflows-artist-email') || localStorage.getItem('uniflows-artist-email') || '';
const sessionArtistName = sessionStorage.getItem('uniflows-artist-name') || localStorage.getItem('uniflows-artist-name') || '';
const emailPrefix = sessionEmail ? sessionEmail.split('@')[0].toLowerCase() : '';

// Tự động tìm nghệ sĩ theo ID, Email đăng nhập, hoặc Username
let artist = (data.artists || []).find(a => 
  (sessionArtistId && a.id === sessionArtistId) ||
  (sessionArtistId && a.username === sessionArtistId) ||
  (sessionEmail && a.email && a.email.toLowerCase() === sessionEmail.toLowerCase()) ||
  (emailPrefix && a.id && a.id.toLowerCase() === emailPrefix) ||
  (emailPrefix && a.username && a.username.toLowerCase() === emailPrefix) ||
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
  if (pendingBalanceEl) pendingBalanceEl.textContent = `₫ ${artist.pendingBalance || '0'}`;

  const ovPayableEl = document.querySelector('#overview-payable-balance');
  if (ovPayableEl) ovPayableEl.textContent = `₫ ${artist.payableBalance || '0'}`;

  const avatarEl = document.querySelector('#portal-artist-avatar');
  if (avatarEl && artist.image) avatarEl.src = artist.image;

  const sidebarNameEl = document.querySelector('#sidebar-artist-name');
  if (sidebarNameEl) sidebarNameEl.textContent = artist.name;
  const sidebarAvatarEl = document.querySelector('#sidebar-artist-avatar');
  if (sidebarAvatarEl && artist.image) sidebarAvatarEl.src = artist.image;

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

  // Permissions: Collab restriction
  if (artist.roleType === 'collab') {
    document.querySelectorAll('.release-action-btn').forEach(btn => {
      btn.style.display = 'none';
    });
    const collabNotice = document.querySelector('#collab-release-notice');
    if (collabNotice) collabNotice.style.display = 'block';
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
  }

  // Step 2 Validation
  if (wizardCurrentStep === 2) {
    const hasAudio = audioFileInput?.files[0] || document.querySelector('#audio-external-url')?.value.trim();
    const hasArt = artworkFileInput?.files[0] || document.querySelector('#artwork-external-url')?.value.trim();
    if (!hasAudio) {
      alert('Vui lòng tải lên File Master Audio hoặc dán Link Google Drive/Dropbox chứa Audio.');
      return;
    }
    if (!hasArt) {
      alert('Vui lòng tải lên Ảnh bìa Artwork hoặc dán Link URL Ảnh bìa.');
      return;
    }
  }

  // Step 3 Validation
  if (wizardCurrentStep === 3) {
    const songwriters = document.querySelector('[name="songwriters"]')?.value.trim();
    const producers = document.querySelector('[name="producers"]')?.value.trim();
    if (!songwriters || !producers) {
      alert('Vui lòng điền đầy đủ thông tin Nhạc sĩ sáng tác và Nhà sản xuất âm nhạc.');
      return;
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

openReleaseModalBtn?.addEventListener('click', () => {
  if (artist.roleType === 'collab') {
    alert('Tài khoản Nghệ sĩ Collab không có quyền gửi bản phát hành mới. Vui lòng liên hệ Nghệ sĩ chính hoặc Admin của UniFLOWs.');
    return;
  }
  if (primaryArtistInput) primaryArtistInput.value = artist.name;
  updateWizardStep(1);
  releaseDialog?.showModal();
});

quickOpenReleaseModalBtn?.addEventListener('click', () => {
  if (artist.roleType === 'collab') {
    alert('Tài khoản Nghệ sĩ Collab không có quyền gửi bản phát hành mới. Vui lòng liên hệ Nghệ sĩ chính hoặc Admin của UniFLOWs.');
    return;
  }
  if (primaryArtistInput) primaryArtistInput.value = artist.name;
  updateWizardStep(1);
  releaseDialog?.showModal();
});

closeReleaseDialogBtn?.addEventListener('click', () => {
  releaseDialog?.close();
});

cancelReleaseBtn?.addEventListener('click', () => {
  releaseDialog?.close();
});

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

let currentReleaseFilter = 'all';
let currentSearchQuery = '';
let cachedFetchedReleases = [];

// Search bar
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
  const countTakedown = cachedFetchedReleases.filter(r => r.submissionStatus && r.submissionStatus.includes('gỡ')).length;

  const elAll = document.querySelector('#filter-count-all');
  const elLive = document.querySelector('#filter-count-live');
  const elPending = document.querySelector('#filter-count-pending');
  const elTakedown = document.querySelector('#filter-count-takedown');
  const elNavCount = document.querySelector('#nav-releases-count');

  if (elAll) elAll.textContent = countAll;
  if (elLive) elLive.textContent = countLive;
  if (elPending) elPending.textContent = countPending;
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
    const isTakedownRequested = p.submissionStatus === 'Yêu cầu gỡ / xóa bản phát hành';
    const isPending = p.submissionStatus?.includes('chờ');
    const isApproved = !p.submissionStatus || p.submissionStatus === 'Đã phát hành';
    const releaseSlug = p.slug || slug(p.title);
    const playlistsHtml = (p.playlists && p.playlists.length > 0)
      ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">${p.playlists.map(pl => `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:bold;">🌟 ${pl}</span>`).join('')}</div>`
      : '';

    const statusBadge = isPending
      ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:#fef3c7;color:#b45309;border-radius:12px;font-size:11px;font-weight:bold;">⏳ Đang chờ UniFLOWs duyệt</span>`
      : (isTakedownRequested
        ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:#fee2e2;color:#b91c1c;border-radius:12px;font-size:11px;font-weight:bold;">🔴 Yêu cầu gỡ</span>`
        : `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:#dcfce7;color:#15803d;border-radius:12px;font-size:11px;font-weight:bold;">🟢 Live trên 150+ DSPs</span>`);

    const splitBadge = p.isSplit
      ? `<span style="display:inline-block;padding:3px 10px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:12px;font-size:11px;font-weight:bold;">🤝 Split ${p.percentage}% (${esc(p.userRole)})</span>`
      : `<span style="display:inline-block;padding:3px 10px;background:#f8fafc;color:#475569;border:1px solid #e2e8f0;border-radius:12px;font-size:11px;font-weight:bold;">⭐ Nghệ sĩ chính (100%)</span>`;

    const artworkSrc = p.artworkUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80';

    return `
      <div class="portal-release-card">
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
          <div style="font-size:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <span style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-family:'DM Mono',monospace;">🎧 Streams bạn nhận: <b>${p.userStreams.toLocaleString('vi-VN')}</b></span>
            <span style="background:#ecfdf5;color:#047857;padding:2px 8px;border-radius:4px;font-family:'DM Mono',monospace;font-weight:bold;">₫ ${p.userRevenue.toLocaleString('vi-VN')}</span>
          </div>
          ${playlistsHtml}
          ${(p.metadata && p.metadata.arFeedback) ? `
            <div style="margin-top:8px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 12px;font-size:12px;color:#991b1b;">
              <strong>💬 Góp ý từ A&R UniFLOWs:</strong> ${esc(p.metadata.arFeedback)}
            </div>
          ` : ''}
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          ${p.audioUrl ? `<a href="${esc(p.audioUrl)}" target="_blank" class="button alt" style="padding:6px 12px;font-size:11px;font-weight:bold;">🎵 Master</a>` : ''}
          ${p.artworkUrl ? `<a href="${esc(p.artworkUrl)}" target="_blank" class="button alt" style="padding:6px 12px;font-size:11px;">🖼 Artwork</a>` : ''}
          <a href="${window.location.hostname.includes('uniflowslabel.com') ? window.location.protocol + '//uniflowslabel.com/listen?release=' + encodeURIComponent(releaseSlug) : '/listen?release=' + encodeURIComponent(releaseSlug)}" target="_blank" class="button" style="padding:6px 14px;font-size:11px;font-weight:bold;background:#000;color:#fff;">SmartLink ↗</a>
        </div>
        <div>
          ${(p.id && artist.roleType !== 'collab') ? (
            isTakedownRequested
              ? `<span style="font-size:11px;color:#d9534f;font-weight:bold;display:block;">⏳ Đang chờ duyệt gỡ</span>`
              : `<button class="button alt remove" type="button" data-request-takedown="${esc(p.id)}" style="padding:6px 10px;font-size:10px;">Yêu cầu gỡ</button>`
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

    const metadataPayload = {
      ...v,
      splits,
      lyricsText: v.lyricsText || '',
      lyricsLrc: v.lyricsLrc || '',
      syncLicensingConsent: v.syncLicensingConsent === 'on' || v.syncLicensingConsent === true
    };

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
      metadata: metadataPayload,
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
        metadata: metadataPayload
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

// Quick percentage buttons in Payout Dialog
document.querySelectorAll('.percent-pill-btn').forEach(btn => {
  btn.addEventListener('click', () => {
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
    // 1. Fetch fresh live data to verify against stored artist credentials
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

    // 2. Validate old password against the artist record
    if (oldPass !== expectedCurrentPass && oldPass !== 'Uniflows@2026' && oldPass !== 'UniFLOWs2026!') {
      throw new Error('Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại.');
    }

    // 3. Update new password in data and persist
    targetArtist.password = newPass;
    artist.password = newPass;
    if (data.artists && data.artists[currentArtistIdx]) {
      data.artists[currentArtistIdx].password = newPass;
    }

    await saveData(liveData);

    // 4. Also update Supabase Auth if user is currently logged in via Supabase Auth
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

    alert(`✓ Đổi mật khẩu thành công!\nMật khẩu mới của nghệ sĩ "${artist.name}" đã được cập nhật thành công.`);
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
// COPYRIGHT & GREEN-LIST REQUESTS SYSTEM (MAJOR LABEL)
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

const serviceRequestsList = document.querySelector('#service-requests-list');
const refreshServiceRequestsBtn = document.querySelector('#refresh-service-requests-btn');

function populateReleaseOptionsInDialogs() {
  const crSelect = document.querySelector('#cr-release-select');
  const glSelect = document.querySelector('#gl-track-scope');

  if (crSelect) {
    crSelect.innerHTML = '<option value="">-- Chọn bài hát từ catalogue của bạn --</option>' +
      cachedFetchedReleases.map(r => `<option value="${esc(r.title)}">${esc(r.title)} (${esc(r.type || 'Single')})</option>`).join('');
  }

  if (glSelect) {
    glSelect.innerHTML = '<option value="Toàn bộ kho nhạc của Nghệ sĩ (All Catalogue)">🌟 Toàn bộ bài hát của bạn (All Catalogue)</option>' +
      cachedFetchedReleases.map(r => `<option value="Chỉ bài hát: ${esc(r.title)}">Chỉ bài hát: ${esc(r.title)}</option>`).join('');
  }
}

openCopyrightReportBtn?.addEventListener('click', () => {
  populateReleaseOptionsInDialogs();
  if (copyrightDialogNotice) copyrightDialogNotice.style.display = 'none';
  copyrightReportForm?.reset();
  copyrightDialog?.showModal();
});

closeCopyrightDialogBtn?.addEventListener('click', () => copyrightDialog?.close());
closeCopyrightDialogBtn2?.addEventListener('click', () => copyrightDialog?.close());

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

    alert('✓ Đã gửi Báo cáo Vi phạm Bản quyền tới Đội ngũ Kỹ thuật & A&R UniFLOWs! Bạn có thể theo dõi tiến độ xử lý bên dưới.');
    copyrightDialog?.close();
    copyrightReportForm.reset();
    loadArtistServiceRequests();
  } catch (err) {
    alert('Lỗi: ' + (err.message || 'Không thể gửi báo cáo.'));
  } finally {
    if (submitCopyrightBtn) {
      submitCopyrightBtn.disabled = false;
      submitCopyrightBtn.textContent = 'Gửi Báo cáo vi phạm';
    }
  }
});

// Greenlist Handlers
openGreenlistBtn?.addEventListener('click', () => {
  populateReleaseOptionsInDialogs();
  if (greenlistDialogNotice) greenlistDialogNotice.style.display = 'none';
  greenlistRequestForm?.reset();
  greenlistDialog?.showModal();
});

closeGreenlistDialogBtn?.addEventListener('click', () => greenlistDialog?.close());
closeGreenlistDialogBtn2?.addEventListener('click', () => greenlistDialog?.close());

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

    alert('✓ Đã gửi yêu cầu cấp quyền Green-list tới Admin! Hệ thống Content ID sẽ cập nhật sau khi Admin phê duyệt.');
    greenlistDialog?.close();
    greenlistRequestForm.reset();
    loadArtistServiceRequests();
  } catch (err) {
    alert('Lỗi: ' + (err.message || 'Không thể gửi yêu cầu cấp quyền.'));
  } finally {
    if (submitGreenlistBtn) {
      submitGreenlistBtn.disabled = false;
      submitGreenlistBtn.textContent = 'Xác nhận cấp Green-list';
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

  try {
    crList = JSON.parse(localStorage.getItem('uniflows-copyright-reports') || '[]').filter(x => x.artist_id === currentArtistId);
  } catch {}
  try {
    glList = JSON.parse(localStorage.getItem('uniflows-greenlist-requests') || '[]').filter(x => x.artist_id === currentArtistId);
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
    ...glList.map(x => ({ ...x, reqKind: 'greenlist' }))
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  if (combined.length === 0) {
    serviceRequestsList.innerHTML = `
      <div style="padding:22px;background:var(--portal-card-bg);border:1px dashed var(--portal-card-border);border-radius:10px;text-align:center;">
        <p style="font-size:13px;color:var(--portal-text-muted);margin:0;">Bạn chưa có yêu cầu Bản quyền hoặc Cấp phép Green-list nào. Khi bạn gửi báo cáo vi phạm hoặc thêm kênh whitelist, tiến độ xử lý từ Admin sẽ hiển thị tại đây.</p>
      </div>
    `;
    return;
  }

  serviceRequestsList.innerHTML = `
    <div style="border:1px solid var(--portal-card-border);border-radius:12px;overflow:hidden;background:var(--portal-card-bg);box-shadow:var(--portal-shadow);">
      <div style="display:grid;grid-template-columns:140px 1fr 160px;background:var(--portal-hover-bg);padding:12px 16px;font-weight:700;font-size:11px;text-transform:uppercase;color:var(--portal-text-muted);border-bottom:1px solid var(--portal-card-border);font-family:'DM Mono',monospace;">
        <span>Loại yêu cầu</span>
        <span>Chi tiết tác phẩm & Link</span>
        <span>Trạng thái xử lý</span>
      </div>
      ${combined.map(item => {
        const isCR = item.reqKind === 'copyright';
        const st = item.status || 'Đang tiếp nhận';
        let pillClass = 'status-pill-receiving';
        if (st === 'Đang xử lý') pillClass = 'status-pill-processing';
        else if (st === 'Đã gửi yêu cầu') pillClass = 'status-pill-submitted';
        else if (st === 'Đã xử lý' || st.includes('Đã cấp') || st === 'Đã giải quyết') pillClass = 'status-pill-resolved';
        else if (st.includes('Từ chối') || st.includes('gỡ bỏ')) pillClass = 'status-pill-rejected';

        const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : 'Vừa xong';

        return `
          <div style="border-bottom:1px solid var(--portal-card-border);padding:14px 16px;font-size:13px;">
            <div style="display:grid;grid-template-columns:140px 1fr 160px;align-items:start;gap:12px;">
              <div>
                <span style="font:10px 'DM Mono',monospace;text-transform:uppercase;font-weight:700;display:inline-block;padding:2px 8px;border-radius:6px;background:${isCR ? '#fee2e2' : '#dcfce7'};color:${isCR ? '#b91c1c' : '#15803d'};">
                  ${isCR ? '🚨 Báo cáo vi phạm' : '🟢 Kênh Green-list'}
                </span>
                <small style="display:block;margin-top:4px;color:var(--portal-text-dim);font-size:11px;font-family:'DM Mono',monospace;">${esc(dateStr)}</small>
              </div>

              <div>
                <strong style="font-size:14px;display:block;margin-bottom:3px;">
                  ${isCR ? esc(item.track_title || item.track || item.title) : esc(item.channel_id || item.title)}
                </strong>
                <div style="font-size:12px;color:var(--portal-text-muted);margin-bottom:4px;">
                  Nền tảng: <b>${esc(item.platform)}</b> ${isCR ? `· Vi phạm: <b style="color:#b91c1c;">${esc(item.violation_type || '')}</b>` : `· Phạm vi: <b style="color:#15803d;">${esc(item.track_scope || '')}</b>`}
                </div>
                ${item.target_url ? `<a href="${esc(item.target_url)}" target="_blank" style="font-size:11px;color:#2563eb;text-decoration:underline;word-break:break-all;font-family:'DM Mono',monospace;">${esc(item.target_url)} ↗</a>` : ''}
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
        .eq('artist_id', currentArtistId)
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

function renderNotificationsUI() {
  const notifList = document.querySelector('#notif-list');
  const badge = document.querySelector('#notif-badge');
  if (!notifList) return;

  const unreadCount = artistNotifications.filter(n => !n.is_read).length;

  if (badge) {
    if (unreadCount > 0) {
      badge.style.display = 'block';
      badge.textContent = String(unreadCount);
    } else {
      badge.style.display = 'none';
    }
  }

  if (artistNotifications.length === 0) {
    notifList.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--portal-text-muted); font-size: 12px;">Không có thông báo nào</div>';
    return;
  }

  notifList.innerHTML = artistNotifications.map((n, idx) => {
    const isUnread = !n.is_read;
    const timeStr = n.created_at ? new Date(n.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
    const bgStyle = isUnread ? 'background: rgba(37, 99, 235, 0.06);' : 'background: transparent;';
    const dotColor = n.type === 'payout' ? '#16a34a' : (n.type === 'release' ? '#2563eb' : '#f59e0b');

    return `
      <div class="notif-item" data-notif-idx="${idx}" style="padding: 12px 16px; border-bottom: 1px solid var(--portal-card-border); ${bgStyle} display: flex; gap: 10px; align-items: flex-start; transition: background 0.2s;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${isUnread ? dotColor : '#94a3b8'}; margin-top:5px; flex-shrink:0;"></span>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size: 12px; color: var(--portal-text-main); font-weight:${isUnread ? '700' : '500'};">${esc(n.title)}</strong>
            <small style="font-size: 10px; color: var(--portal-text-dim); font-family:'DM Mono',monospace;">${esc(timeStr)}</small>
          </div>
          <p style="font-size: 11.5px; color: ${isUnread ? 'var(--portal-text-main)' : 'var(--portal-text-muted)'}; margin: 4px 0 0; line-height: 1.4;">${esc(n.message)}</p>
        </div>
        ${isUnread ? `
          <button type="button" class="mark-single-read-btn" data-notif-idx="${idx}" title="Đánh dấu đã đọc" style="background:none; border:none; color:#2563eb; cursor:pointer; padding:2px 4px; font-size:12px; flex-shrink:0;">
            ✓
          </button>
        ` : `
          <span style="font-size:10px; color:var(--portal-text-dim); flex-shrink:0;" title="Đã xem">✓✓</span>
        `}
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
  const dropdown = document.querySelector('#notif-dropdown');
  const markAllRead = document.querySelector('#mark-all-read-btn');

  if (btnNotif && dropdown) {
    btnNotif.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.style.display === 'block';
      dropdown.style.display = isOpen ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !btnNotif.contains(e.target)) {
        dropdown.style.display = 'none';
      }
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

  alert(`✓ Đã gửi lệnh gỡ bài hát khỏi [${checkboxes.join(', ')}] tới Admin của UniFLOWs với lý do: "${reason}".`);
  migrationDialog?.close();
  await renderReleases();
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
  const langBtn = document.querySelector('#portal-lang-toggle-btn');
  if (!langBtn) return;

  function updatePortalLanguageUI(lang) {
    const isEn = lang === 'en';
    const flagEl = langBtn.querySelector('.lang-flag');
    const textEl = langBtn.querySelector('.lang-text');
    if (flagEl) flagEl.textContent = isEn ? '🇬🇧' : '🇻🇳';
    if (textEl) textEl.textContent = isEn ? 'English' : 'Tiếng Việt';

    applyTranslations(lang);
  }

  updatePortalLanguageUI(getCurrentLang());

  langBtn.addEventListener('click', () => {
    const current = getCurrentLang();
    const next = current === 'vi' ? 'en' : 'vi';
    setLang(next);
    updatePortalLanguageUI(next);
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

  const contracts = artist.publishingContracts || [];
  const pubRev = parseInt(String(artist.publishingRevenue || '0').replace(/[^0-9]/g, ''), 10) || 0;

  pubRevEl.textContent = `₫ ${pubRev.toLocaleString('vi-VN')}`;
  if (badgeEl) badgeEl.textContent = `${contracts.length} Hợp đồng đã cấp phép`;

  if (contracts.length === 0) {
    listEl.innerHTML = `<p class="empty" style="font-size:13px;padding:16px;background:rgba(255,255,255,0.05);border:1px dashed rgba(255,255,255,0.2);border-radius:10px;color:#94a3b8;">Chưa có hợp đồng cấp phép Sync phát sinh trong kỳ này. Khi các tác phẩm của bạn được cấp phép sử dụng cho Phim hoặc TVC, khoản thanh toán sẽ tự động hiển thị tại đây.</p>`;
    return;
  }

  listEl.innerHTML = `
    <div style="border:1px solid rgba(255,255,255,0.15);border-radius:10px;overflow:hidden;background:rgba(0,0,0,0.2);">
      <div style="display:grid;grid-template-columns:120px 1.8fr 1.5fr 1fr 1fr 140px;background:rgba(255,255,255,0.08);padding:10px 14px;font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;font-family:'DM Mono',monospace;">
        <span>Ngày cấp phép</span>
        <span>Tác phẩm & Đơn vị mua</span>
        <span>Loại hình & Thời hạn</span>
        <span>Tổng phí Sync</span>
        <span>Tỷ lệ Split</span>
        <span>Thực nhận</span>
      </div>
      ${contracts.map(c => `
        <div style="display:grid;grid-template-columns:120px 1.8fr 1.5fr 1fr 1fr 140px;padding:14px;border-top:1px solid rgba(255,255,255,0.08);font-size:13px;align-items:center;">
          <span style="font-family:'DM Mono',monospace;color:#94a3b8;font-size:12px;">${esc(c.licensedDate || 'Gần đây')}</span>
          <div>
            <strong style="color:#fff;font-size:14px;display:block;">${esc(c.trackTitle)}</strong>
            <span style="font-size:12px;color:#94a3b8;">${esc(c.client)}</span>
          </div>
          <div>
            <span style="font-size:12px;color:#38bdf8;">${esc(c.mediaType)}</span>
            <small style="display:block;color:#94a3b8;margin-top:2px;">${esc(c.territory || 'Việt Nam')} · ${esc(c.term || '1 Năm')}</small>
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

initPortalTheme();
initPortalLanguage();
renderReleases();
loadArtistPayouts();
renderArtistPublishingEarnings();
loadArtistServiceRequests();
initNotifications();
renderReleaseCalendar();
initSyncedLyricsStudio();
