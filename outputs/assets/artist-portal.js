// ============================================================================
// UNIFLOWS ARTIST PORTAL — REDESIGN LOGIC ENGINE
// Fully mirrors the 5 mockups: Dashboard Overview, DSP Analytics, Earnings Chart,
// 4-Step Release Wizard (Audio/WebP Artwork, DSP toggles, Splits PieChart, Review).
// ============================================================================

import { getData, saveData } from './data.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

// Global wizard state
export const releaseWizardState = {
  currentStep: 1,
  audioFile: null,
  audioFileName: '',
  audioFileSize: '',
  artworkFile: null,
  artworkDataUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
  artworkFormat: 'image/webp',
  trackTitle: 'Midnight Echoes',
  primaryArtist: 'Astral Waves',
  featuredArtists: '',
  composers: 'Astral Waves',
  lyricists: 'Astral Waves',
  isExplicit: false,
  releaseDate: '2026-10-31',
  releaseTime: '00:00 EST',
  labelPublisher: 'UniFLOWs Label',
  genre: 'Electronic / Ambient',
  tags: ['chill', 'upbeat', 'summer'],
  territory: 'Worldwide',
  pricingTier: 'Mid-tier',
  pricingTier2: 'Full-price',
  dsps: {
    spotify: true,
    apple: true,
    tiktok: false,
    ytmusic: false,
    ytcontentid: true,
    amazon: false,
    prime: false,
    deezer: false,
    tidal: false,
    zing: true,
    pandora: false,
    beatport: false
  },
  collaborators: [
    { id: 'c1', name: 'Alex Rivers', role: 'Producer', percent: 50, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80', color: '#a855f7' },
    { id: 'c2', name: 'Maya Chen', role: 'Songwriter, Artist', percent: 25, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80', color: '#38bdf8' },
    { id: 'c3', name: 'Maxhixton', role: 'Artist', percent: 15, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80', color: '#f97316' },
    { id: 'c4', name: 'Prach Barnien', role: 'Producer', percent: 10, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80', color: '#eab308' }
  ],
  isrc: 'VN-A12-26-00001',
  upc: '001000830016'
};

// ----------------------------------------------------------------------------
// 1. EARNINGS OVERVIEW AREA CHART
// ----------------------------------------------------------------------------
export function renderEarningsAreaChart(period = 'monthly') {
  const container = document.querySelector('#ap-area-chart-container');
  if (!container) return;

  const dataSets = {
    today: [12, 18, 14, 25, 30, 22, 28, 35, 42, 38, 45, 52],
    week: [20, 24, 22, 35, 28, 42, 39, 48, 44, 50, 48, 55],
    monthly: [14, 26, 22, 32, 28, 45, 34, 46, 38, 42, 48, 54]
  };

  const points = dataSets[period] || dataSets.monthly;
  const width = 600;
  const height = 130;
  const paddingX = 40;
  const paddingY = 15;
  const maxVal = 60;

  const stepX = (width - paddingX * 2) / (points.length - 1);
  const coords = points.map((val, idx) => {
    const x = paddingX + idx * stepX;
    const y = height - paddingY - (val / maxVal) * (height - paddingY * 2);
    return { x, y };
  });

  // Generate smooth cubic bezier SVG path
  let pathD = `M ${coords[0].x},${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i];
    const next = coords[i + 1];
    const mx = (curr.x + next.x) / 2;
    pathD += ` C ${mx},${curr.y} ${mx},${next.y} ${next.x},${next.y}`;
  }

  const areaD = `${pathD} L ${coords[coords.length - 1].x},${height - paddingY} L ${coords[0].x},${height - paddingY} Z`;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const xLabelsSvg = months.map((m, i) => {
    const x = paddingX + i * stepX;
    return `<text x="${x}" y="${height - 2}" fill="#64748b" font-size="9" text-anchor="middle" font-family="system-ui">${m}</text>`;
  }).join('');

  const gridLinesSvg = [0, 20, 40, 60].map(val => {
    const y = height - paddingY - (val / maxVal) * (height - paddingY * 2);
    return `
      <line x1="${paddingX}" y1="${y}" x2="${width - paddingX}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,2"/>
      <text x="${paddingX - 8}" y="${y + 3}" fill="#64748b" font-size="9" text-anchor="end" font-family="'DM Mono', monospace">$${val}</text>
    `;
  }).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="portal-area-chart-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="apChartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      ${gridLinesSvg}
      <path d="${areaD}" fill="url(#apChartGrad)"/>
      <path d="${pathD}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
      ${xLabelsSvg}
      ${coords.map(c => `<circle cx="${c.x}" cy="${c.y}" r="3" fill="#ffffff" stroke="#38bdf8" stroke-width="1.5"/>`).join('')}
    </svg>
  `;
}

// ----------------------------------------------------------------------------
// 2. RELEASES OVERVIEW TABLE RENDERER
// ----------------------------------------------------------------------------
export function renderReleasesOverviewTable(artistReleases = []) {
  const tbody = document.querySelector('#ap-releases-table-body');
  if (!tbody) return;

  const defaultMockReleases = [
    {
      title: 'UniFLOWs Debut',
      format: '18M',
      upc: '001000830016',
      artist: 'UniFLOWs',
      date: '12/9/2022',
      status: 'submitted',
      artwork: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=100&q=80'
    },
    {
      title: 'EP 01',
      format: '18M',
      upc: '001000850010',
      artist: 'Taylor Swift',
      date: '12/9/2023',
      status: 'processing',
      artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=100&q=80'
    },
    {
      title: '48K Collective Mixtape',
      format: '18M',
      upc: '001000033739',
      artist: '48K Collective',
      date: '12/9/2020',
      status: 'delivered',
      artwork: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=100&q=80'
    }
  ];

  const allReleases = [...(artistReleases || []), ...defaultMockReleases];

  tbody.innerHTML = allReleases.map(rel => {
    const badgeClass = rel.status === 'delivered' ? 'delivered' : (rel.status === 'processing' ? 'processing' : 'submitted');
    const badgeLabel = rel.status === 'delivered' ? 'Delivered' : (rel.status === 'processing' ? 'Processing' : 'Submitted');

    return `
      <tr>
        <td>
          <div class="portal-cell-title">
            <img class="portal-cell-artwork" src="${rel.artwork || rel.artworkUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=100&q=80'}" alt="Cover">
            <span class="portal-cell-name">${rel.title}</span>
          </div>
        </td>
        <td class="portal-cell-mono">${rel.format || rel.type || '18M'}</td>
        <td class="portal-cell-mono">${rel.upc || rel.upcCode || '001000830016'}</td>
        <td>${rel.artist || rel.primaryArtist || 'UniFLOWs'}</td>
        <td class="portal-cell-mono">${rel.date || rel.releaseDate || '12/9/2026'}</td>
        <td><span class="portal-badge ${badgeClass}">${badgeLabel}</span></td>
      </tr>
    `;
  }).join('');
}

// ----------------------------------------------------------------------------
// 3. REVENUE DISTRIBUTION PIE / DONUT CHART
// ----------------------------------------------------------------------------
export function renderSplitsPieChart() {
  const container = document.querySelector('#ap-splits-pie-container');
  const summaryEl = document.querySelector('#ap-splits-summary-bar');
  if (!container) return;

  const collabs = releaseWizardState.collaborators;
  const totalPercent = collabs.reduce((acc, c) => acc + (Number(c.percent) || 0), 0);
  const unallocated = Math.max(0, 100 - totalPercent);

  if (summaryEl) {
    summaryEl.className = `portal-splits-summary-bar ${totalPercent === 100 ? 'valid' : 'invalid'}`;
    summaryEl.innerHTML = `
      <span>Total Splits: <b>${totalPercent}%</b> ${totalPercent === 100 ? '✓' : '(Phải đủ 100%)'}</span>
      <span>Unallocated: <b>${unallocated}%</b></span>
    `;
  }

  // Generate SVG Pie
  let cumulativeAngle = 0;
  const cx = 120, cy = 120, r = 85;

  const pathsSvg = collabs.map((collab) => {
    const fraction = (Number(collab.percent) || 0) / 100;
    if (fraction <= 0) return '';

    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + fraction * 2 * Math.PI;
    cumulativeAngle = endAngle;

    const x1 = cx + r * Math.sin(startAngle);
    const y1 = cy - r * Math.cos(startAngle);
    const x2 = cx + r * Math.sin(endAngle);
    const y2 = cy - r * Math.cos(endAngle);

    const largeArcFlag = fraction > 0.5 ? 1 : 0;
    const d = `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${largeArcFlag} 1 ${x2},${y2} Z`;

    return `
      <path d="${d}" fill="${collab.color}" stroke="#0f111a" stroke-width="2">
        <title>${collab.name}: ${collab.percent}%</title>
      </path>
    `;
  }).join('');

  const legendSvg = collabs.map((c) => `
    <div style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:#cbd5e1;">
      <span style="width:10px;height:10px;border-radius:50%;background:${c.color};display:inline-block;"></span>
      <span>${c.name} (<b>${c.percent}%</b>)</span>
    </div>
  `).join('');

  container.innerHTML = `
    <svg viewBox="0 0 240 240" class="portal-pie-svg">
      ${pathsSvg}
      <circle cx="${cx}" cy="${cy}" r="34" fill="#0f111a" stroke="rgba(255,255,255,0.1)" stroke-width="1.5"/>
      <text x="${cx}" y="${cy + 4}" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle" font-family="'DM Mono', monospace">${totalPercent}%</text>
    </svg>
    <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:14px;">
      ${legendSvg}
    </div>
  `;
}

// ----------------------------------------------------------------------------
// 4. CLIENT-SIDE WEBP AUTO-CONVERSION
// ----------------------------------------------------------------------------
export async function convertArtworkToWebP(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 3000;
        canvas.height = 3000;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 3000, 3000);

        canvas.toBlob((blob) => {
          if (blob) {
            const webpUrl = URL.createObjectURL(blob);
            resolve({ blob, dataUrl: canvas.toDataURL('image/webp', 0.9), previewUrl: webpUrl });
          } else {
            resolve({ blob: file, dataUrl: e.target.result, previewUrl: e.target.result });
          }
        }, 'image/webp', 0.9);
      };
      img.onerror = () => reject(new Error('Không thể load file ảnh'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Không thể đọc file'));
    reader.readAsDataURL(file);
  });
}

// ----------------------------------------------------------------------------
// 5. ISRC CODE VALIDATOR & GENERATOR
// ----------------------------------------------------------------------------
export function isValidISRC(code) {
  // Standard ISRC: Country(2) - Registrant(3) - Year(2) - Designation(5)
  // e.g. VN-A12-26-00001
  const clean = String(code || '').trim().toUpperCase();
  const regex = /^[A-Z]{2}-?[A-Z0-9]{3}-?[0-9]{2}-?[0-9]{5}$/;
  return regex.test(clean);
}

export function generateNextISRC() {
  const randNum = Math.floor(10000 + Math.random() * 90000);
  return `VN-A12-26-${randNum}`;
}

// ----------------------------------------------------------------------------
// 6. PDF STATEMENT DOWNLOADER
// ----------------------------------------------------------------------------
export function downloadSamplePdfStatement(artistName = 'Astral Waves') {
  const content = `
================================================================================
                    UNIFLOWS RECORD LABEL — ROYALTY STATEMENT
================================================================================
Artist / Payee:   ${artistName}
Statement Period: Q3 2026 (Monthly Settlement)
Generated Date:   ${new Date().toLocaleDateString('vi-VN')}
Currency:         USD ($)
--------------------------------------------------------------------------------

1. REVENUE BREAKDOWN BY DSP PLATFORM:
   - Apple Music:               $ 142.50   (54.2%)
   - Spotify:                   $  86.17   (32.8%)
   - Tidal Lossless:            $  24.00   ( 9.1%)
   - Zing MP3 / Other:          $  10.00   ( 3.9%)
   --------------------------------------------------
   Total Gross Royalty:         $ 262.67

2. DISBURSEMENT SUMMARY:
   - Paid Out (Transferred):    $ 262.67  (Status: COMPLETED)
   - Pending DSP Reserves:      $ 129.00  (Status: IN CLEARING)

3. STATEMENT VERIFICATION:
   Verified by UniFLOWs Accounting Engine & Distributed DSP Ledger.
================================================================================
`;
  const blob = new Blob([content], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `UniFLOWs_Statement_${artistName.replace(/\s+/g, '_')}_2026.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ----------------------------------------------------------------------------
// 7. WIZARD STEP CONTROLLER
// ----------------------------------------------------------------------------
export function setWizardStep(stepNum) {
  releaseWizardState.currentStep = stepNum;

  // Toggle views
  const wizardViews = document.querySelectorAll('.portal-wizard-step-view');
  wizardViews.forEach(v => {
    v.style.display = (v.dataset.step === String(stepNum)) ? 'block' : 'none';
  });

  const stepPill = document.querySelector('#ap-wizard-step-indicator');
  if (stepPill) stepPill.textContent = `${stepNum} of 4`;

  const wizardTitle = document.querySelector('#ap-wizard-dynamic-title');
  if (wizardTitle) {
    const titles = {
      1: 'Create New Release - Track Upload & Metadata',
      2: 'Create New Release - DSP Selection',
      3: 'Create New Release - Splits & Royalties',
      4: 'Create New Release - Review & Submit'
    };
    wizardTitle.textContent = titles[stepNum] || 'Create New Release';
  }

  // When reaching Step 3, re-render Pie chart
  if (stepNum === 3) {
    renderSplitsPieChart();
  }

  // When reaching Step 4, populate review details
  if (stepNum === 4) {
    populateStep4Review();
  }

  // Scroll to top of window
  document.querySelector('.portal-window-shell')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function populateStep4Review() {
  const s = releaseWizardState;
  const coverImg = document.querySelector('#ap-review-cover-img');
  const coverTitle = document.querySelector('#ap-review-cover-title');
  const coverArtist = document.querySelector('#ap-review-cover-artist');

  if (coverImg) coverImg.src = s.artworkDataUrl;
  if (coverTitle) coverTitle.textContent = s.trackTitle || 'Midnight Echoes';
  if (coverArtist) coverArtist.textContent = s.primaryArtist || 'Astral Waves';

  const albumTitleEl = document.querySelector('#ap-review-album-title');
  const artistEl = document.querySelector('#ap-review-artist');
  const genreEl = document.querySelector('#ap-review-genre');
  const isrcEl = document.querySelector('#ap-review-isrc');
  const upcEl = document.querySelector('#ap-review-upc');
  const dateEl = document.querySelector('#ap-review-release-date');

  if (albumTitleEl) albumTitleEl.textContent = s.trackTitle;
  if (artistEl) artistEl.textContent = s.primaryArtist;
  if (genreEl) genreEl.textContent = s.genre;
  if (isrcEl) isrcEl.textContent = s.isrc;
  if (upcEl) upcEl.textContent = s.upc;
  if (dateEl) dateEl.textContent = s.releaseDate;
}

// ----------------------------------------------------------------------------
// 8. INITIALIZE ARTIST PORTAL REDESIGN
// ----------------------------------------------------------------------------
export function initArtistPortalRedesign(currentArtist) {
  if (currentArtist?.name) {
    releaseWizardState.primaryArtist = currentArtist.name;
    const userNames = document.querySelectorAll('.portal-user-name, #ap-header-artist-name');
    userNames.forEach(el => { el.textContent = currentArtist.name; });
    const userAvatars = document.querySelectorAll('.portal-user-avatar');
    if (currentArtist.image) {
      userAvatars.forEach(el => { el.src = currentArtist.image; });
    }
  }

  // Render initial overview components
  renderEarningsAreaChart('monthly');
  renderReleasesOverviewTable(currentArtist?.products || []);

  // Earnings chart filter toggles
  document.querySelectorAll('.portal-chart-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.portal-chart-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderEarningsAreaChart(btn.dataset.period || 'monthly');
    });
  });

  // PDF Statements download buttons
  document.querySelectorAll('.portal-pdf-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      downloadSamplePdfStatement(currentArtist?.name || 'Astral Waves');
    });
  });

  // Switch between Dashboard and Wizard
  const dashboardView = document.querySelector('#ap-view-dashboard');
  const wizardView = document.querySelector('#ap-view-wizard');
  const btnNewRelease = document.querySelector('#ap-btn-new-release');
  const btnCancelWizard = document.querySelector('#ap-btn-cancel-wizard');

  const openWizard = () => {
    if (dashboardView) dashboardView.style.display = 'none';
    if (wizardView) wizardView.style.display = 'block';
    setWizardStep(1);
  };

  const closeWizard = () => {
    if (wizardView) wizardView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'block';
    renderReleasesOverviewTable(currentArtist?.products || []);
  };

  if (btnNewRelease) btnNewRelease.addEventListener('click', openWizard);
  if (btnCancelWizard) btnCancelWizard.addEventListener('click', closeWizard);

  document.querySelector('#quick-open-release-modal-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('#portal-nav a[data-tab="tab-overview"]')?.click();
    openWizard();
  });

  document.querySelector('#ap-signout-btn')?.addEventListener('click', () => {
    document.querySelector('#artist-logout')?.click();
  });

  document.querySelector('#ap-link-more-releases')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('#portal-nav a[data-tab="tab-releases"]')?.click();
  });

  // Setup Step 1 (Track Upload & Metadata)
  setupStep1Handlers();

  // Setup Step 2 (DSP Selection)
  setupStep2Handlers();

  // Setup Step 3 (Splits & Royalties)
  setupStep3Handlers();

  // Setup Step 4 (Review & Submit)
  setupStep4Handlers(currentArtist, closeWizard);
}

function setupStep1Handlers() {
  const audioDropzone = document.querySelector('#ap-audio-dropzone');
  const audioInput = document.querySelector('#ap-audio-input');
  const audioLabel = document.querySelector('#ap-audio-filename');

  if (audioDropzone && audioInput) {
    audioDropzone.addEventListener('click', () => audioInput.click());
    audioInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        releaseWizardState.audioFile = file;
        releaseWizardState.audioFileName = file.name;
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        if (audioLabel) audioLabel.textContent = `✓ ${file.name} (${sizeMb} MB)`;
      }
    });

    ['dragover', 'dragenter'].forEach(ev => {
      audioDropzone.addEventListener(ev, (e) => { e.preventDefault(); audioDropzone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(ev => {
      audioDropzone.addEventListener(ev, (e) => { e.preventDefault(); audioDropzone.classList.remove('dragover'); });
    });
    audioDropzone.addEventListener('drop', (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        releaseWizardState.audioFile = file;
        releaseWizardState.audioFileName = file.name;
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        if (audioLabel) audioLabel.textContent = `✓ ${file.name} (${sizeMb} MB)`;
      }
    });
  }

  // Artwork dropzone with WebP conversion
  const artworkDropzone = document.querySelector('#ap-artwork-dropzone');
  const artworkInput = document.querySelector('#ap-artwork-input');
  const artworkPreviewImg = document.querySelector('#ap-artwork-preview-img');

  if (artworkDropzone && artworkInput) {
    artworkDropzone.addEventListener('click', () => artworkInput.click());
    const handleArtFile = async (file) => {
      if (!file) return;
      try {
        const converted = await convertArtworkToWebP(file);
        releaseWizardState.artworkFile = converted.blob;
        releaseWizardState.artworkDataUrl = converted.dataUrl;
        if (artworkPreviewImg) artworkPreviewImg.src = converted.dataUrl;
      } catch (err) {
        console.warn('Lỗi chuyển WebP:', err);
      }
    };
    artworkInput.addEventListener('change', (e) => handleArtFile(e.target.files?.[0]));
    artworkDropzone.addEventListener('dragover', (e) => { e.preventDefault(); artworkDropzone.classList.add('dragover'); });
    artworkDropzone.addEventListener('dragleave', () => artworkDropzone.classList.remove('dragover'));
    artworkDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      artworkDropzone.classList.remove('dragover');
      handleArtFile(e.dataTransfer?.files?.[0]);
    });
  }

  // Metadata inputs
  document.querySelector('#ap-track-title')?.addEventListener('input', (e) => {
    releaseWizardState.trackTitle = e.target.value;
  });
  document.querySelector('#ap-primary-artist')?.addEventListener('input', (e) => {
    releaseWizardState.primaryArtist = e.target.value;
  });
  document.querySelector('#ap-featured-artists')?.addEventListener('input', (e) => {
    releaseWizardState.featuredArtists = e.target.value;
  });
  document.querySelector('#ap-composers')?.addEventListener('input', (e) => {
    releaseWizardState.composers = e.target.value;
  });
  document.querySelector('#ap-lyricists')?.addEventListener('input', (e) => {
    releaseWizardState.lyricists = e.target.value;
  });

  // Explicit pills
  const btnExplicitYes = document.querySelector('#ap-explicit-yes');
  const btnExplicitNo = document.querySelector('#ap-explicit-no');
  if (btnExplicitYes && btnExplicitNo) {
    btnExplicitYes.addEventListener('click', () => {
      btnExplicitYes.classList.add('active');
      btnExplicitNo.classList.remove('active');
      releaseWizardState.isExplicit = true;
    });
    btnExplicitNo.addEventListener('click', () => {
      btnExplicitNo.classList.add('active');
      btnExplicitYes.classList.remove('active');
      releaseWizardState.isExplicit = false;
    });
  }

  // Tags Chips
  const tagsContainer = document.querySelector('#ap-tags-container');
  const tagInput = document.querySelector('#ap-tag-input');
  if (tagsContainer && tagInput) {
    const renderTags = () => {
      const chips = releaseWizardState.tags.map((t, idx) => `
        <span class="portal-tag-chip">
          ${t}
          <span class="portal-tag-close" data-index="${idx}">✕</span>
        </span>
      `).join('');
      tagsContainer.querySelectorAll('.portal-tag-chip').forEach(c => c.remove());
      tagInput.insertAdjacentHTML('beforebegin', chips);

      tagsContainer.querySelectorAll('.portal-tag-close').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.index);
          releaseWizardState.tags.splice(idx, 1);
          renderTags();
        });
      });
    };

    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = tagInput.value.trim().replace(/,/g, '');
        if (val && !releaseWizardState.tags.includes(val)) {
          releaseWizardState.tags.push(val);
          tagInput.value = '';
          renderTags();
        }
      }
    });

    renderTags();
  }

  // Advance to Step 2
  document.querySelector('#ap-btn-step1-next')?.addEventListener('click', () => {
    const title = document.querySelector('#ap-track-title')?.value.trim();
    if (!title) {
      alert('Vui lòng nhập Tên bài hát (Track Title)!');
      document.querySelector('#ap-track-title')?.focus();
      return;
    }
    setWizardStep(2);
  });
}

function setupStep2Handlers() {
  document.querySelectorAll('.portal-dsp-card-toggle').forEach(card => {
    card.addEventListener('click', () => {
      const dspKey = card.dataset.dsp;
      const isChecked = card.classList.contains('checked');
      if (isChecked) {
        card.classList.remove('checked');
        if (dspKey) releaseWizardState.dsps[dspKey] = false;
      } else {
        card.classList.add('checked');
        if (dspKey) releaseWizardState.dsps[dspKey] = true;
      }
    });
  });

  document.querySelector('#ap-btn-step2-prev')?.addEventListener('click', () => setWizardStep(1));
  document.querySelector('#ap-btn-step2-next')?.addEventListener('click', () => setWizardStep(3));
}

function setupStep3Handlers() {
  const collabList = document.querySelector('#ap-collab-list');
  const nameInput = document.querySelector('#ap-collab-name-input');
  const roleSelect = document.querySelector('#ap-collab-role-select');
  const splitInput = document.querySelector('#ap-collab-split-input');
  const addBtn = document.querySelector('#ap-btn-add-collab');

  const renderCollabList = () => {
    if (!collabList) return;
    collabList.innerHTML = releaseWizardState.collaborators.map((c, idx) => `
      <div class="portal-collab-row">
        <img src="${c.avatar}" class="portal-collab-avatar" alt="Avatar">
        <div class="portal-collab-meta">
          <div class="portal-collab-name">${c.name}</div>
          <div class="portal-collab-role">${c.role}</div>
        </div>
        <div class="portal-collab-pill">${c.percent}%</div>
        <button type="button" class="portal-collab-delete" data-index="${idx}" title="Xoá">🗑️</button>
      </div>
    `).join('');

    collabList.querySelectorAll('.portal-collab-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index);
        releaseWizardState.collaborators.splice(idx, 1);
        renderCollabList();
        renderSplitsPieChart();
      });
    });
  };

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const name = nameInput?.value.trim();
      const role = roleSelect?.value || 'Artist';
      const percent = Number(splitInput?.value);

      if (!name) {
        alert('Vui lòng nhập Tên hoặc Email người cộng tác!');
        nameInput?.focus();
        return;
      }
      if (isNaN(percent) || percent <= 0 || percent > 100) {
        alert('Tỷ lệ phần trăm chia royalty phải từ 1% đến 100%!');
        splitInput?.focus();
        return;
      }

      const colors = ['#a855f7', '#38bdf8', '#f97316', '#eab308', '#34d399', '#ec4899'];
      const color = colors[releaseWizardState.collaborators.length % colors.length];

      releaseWizardState.collaborators.push({
        id: 'c-' + Date.now(),
        name,
        role,
        percent,
        avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80`,
        color
      });

      if (nameInput) nameInput.value = '';
      if (splitInput) splitInput.value = '';

      renderCollabList();
      renderSplitsPieChart();
    });
  }

  renderCollabList();

  document.querySelector('#ap-btn-step3-prev')?.addEventListener('click', () => setWizardStep(2));
  document.querySelector('#ap-btn-step3-next')?.addEventListener('click', () => {
    const total = releaseWizardState.collaborators.reduce((acc, c) => acc + (Number(c.percent) || 0), 0);
    if (total !== 100) {
      alert(`⚠️ Tỷ lệ phân chia doanh thu hiện tại là ${total}%. Tổng phần trăm của tất cả người tham gia PHẢI ĐỦ CHÍNH XÁC 100% trước khi tiếp tục!`);
      return;
    }
    setWizardStep(4);
  });
}

function setupStep4Handlers(currentArtist, closeWizardCallback) {
  document.querySelector('#ap-btn-step4-prev')?.addEventListener('click', () => setWizardStep(3));

  const submitBtn = document.querySelector('#ap-btn-submit-release');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const s = releaseWizardState;
      const check1 = document.querySelector('#ap-check-metadata')?.checked;
      const check2 = document.querySelector('#ap-check-cover')?.checked;
      const check3 = document.querySelector('#ap-check-rights')?.checked;

      if (!check1 || !check2 || !check3) {
        alert('Vui lòng tích xác nhận đầy đủ 3 điều khoản Ready to Submit!');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Đang khởi tạo bản phát hành...';

      try {
        const data = await getData();
        const newRel = {
          id: 'rel-' + Date.now(),
          title: s.trackTitle || 'Bản phát hành mới',
          type: 'Single',
          format: '18M',
          upc: s.upc || '001000830016',
          isrc: s.isrc || generateNextISRC(),
          artist: s.primaryArtist || currentArtist?.name || 'Nghệ sĩ',
          primaryArtist: s.primaryArtist || currentArtist?.name || 'Nghệ sĩ',
          genre: s.genre || 'Pop',
          tags: s.tags,
          submissionStatus: 'Chờ duyệt',
          status: 'submitted',
          artworkUrl: s.artworkDataUrl,
          date: new Date().toLocaleDateString('vi-VN'),
          releaseDate: s.releaseDate,
          streams: '0',
          revenue: '0',
          splits: s.collaborators,
          dsps: s.dsps
        };

        // Add to artist products
        const targetArtist = (data.artists || []).find(a => a.id === currentArtist?.id || a.name === currentArtist?.name);
        if (targetArtist) {
          if (!Array.isArray(targetArtist.products)) targetArtist.products = [];
          targetArtist.products.unshift(newRel);
        }

        // Add to global releases if present
        if (Array.isArray(data.releases)) {
          data.releases.unshift(newRel);
        }

        await saveData(data);

        // Supabase sync
        if (isSupabaseConfigured()) {
          try {
            await supabase.from('releases').insert([{
              id: newRel.id,
              artist_id: currentArtist?.id || 'artist',
              title: newRel.title,
              type: newRel.type,
              status: 'pending',
              artwork_url: newRel.artworkUrl,
              created_at: new Date().toISOString()
            }]);
          } catch (_) {}
        }

        alert(`🎉 Chúc mừng! Bản phát hành "${newRel.title}" đã được nộp thành công đến Ban Biên Tập UniFLOWs Label! Bản nhạc sẽ được đối soát chất lượng Lossless và phân phối theo lịch.`);
        closeWizardCallback();
      } catch (err) {
        alert('Lỗi nộp bản phát hành: ' + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚀 Submit Release';
      }
    });
  }
}
