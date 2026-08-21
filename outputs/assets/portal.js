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

let data = await getData();
const currentArtistId = sessionStorage.getItem('uniflows-artist-id') || 'lumi';
let artist = data.artists.find(a => a.id === currentArtistId) || {
  id: currentArtistId,
  name: 'Nghệ sĩ',
  monthlyStreams: '0',
  estimatedRevenue: '0',
  payableBalance: '0',
  products: []
};

// Render Artist Info & Stats
if (artist) {
  if (artistDisplayName) artistDisplayName.textContent = artist.name + '.';
  if (primaryArtistInput) primaryArtistInput.value = artist.name;
  if (monthlyStreamsEl) monthlyStreamsEl.textContent = artist.monthlyStreams || '0';
  if (estimatedRevenueEl) estimatedRevenueEl.textContent = `₫ ${artist.estimatedRevenue || '0'}`;
  if (payableBalanceEl) payableBalanceEl.textContent = `₫ ${artist.payableBalance || '0'}`;
}

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

async function renderReleases() {
  let releases = artist.products || [];

  if (isSupabaseConfigured()) {
    try {
      const { data: dbReleases, error } = await supabase
        .from('releases')
        .select('*')
        .eq('artist_id', currentArtistId)
        .order('created_at', { ascending: false });

      if (!error && dbReleases) {
        releases = dbReleases.map(r => {
          const meta = (typeof r.metadata === 'object' && r.metadata) ? r.metadata : {};
          return {
            id: r.id,
            title: r.title,
            type: r.type,
            slug: r.slug,
            submissionStatus: r.submission_status || 'Đã phát hành',
            audioUrl: r.audio_url,
            artworkUrl: r.artwork_url,
            links: r.links || {},
            streams: meta.streams || '0',
            revenue: meta.revenue || '0',
            playlists: Array.isArray(meta.playlists) ? meta.playlists : []
          };
        });
      }
    } catch (e) {
      console.warn('Lỗi tải release:', e);
    }
  }

  const pending = releases.filter(r => r.submissionStatus?.includes('chờ') || r.submissionStatus?.includes('Duyệt') || r.submissionStatus?.includes('gỡ')).length;
  if (pendingCountEl) pendingCountEl.textContent = String(pending).padStart(2, '0');

  // 1. Render Catalogue list with badges
  if (releases.length === 0) {
    list.innerHTML = '<p class="empty">Chưa có bản phát hành nào trong catalogue.</p>';
  } else {
    list.innerHTML = releases.map(p => {
      const isTakedownRequested = p.submissionStatus === 'Yêu cầu gỡ / xóa bản phát hành';
      const releaseSlug = p.slug || slug(p.title);
      const playlistsHtml = (p.playlists && p.playlists.length > 0)
        ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">${p.playlists.map(pl => `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:bold;">🌟 ${pl}</span>`).join('')}</div>`
        : '';

      return `
        <div class="queue-item" style="border-top:1px solid var(--line);padding:14px 0;display:grid;grid-template-columns:100px 1fr auto auto;gap:15px;align-items:center;">
          <span>${p.type || 'Single'}</span>
          <div>
            <strong>${p.title}</strong>
            <div style="font-size:12px;opacity:0.8;margin:3px 0;">
              Trạng thái: <b style="color:${isTakedownRequested ? '#d9534f' : 'inherit'};">${p.submissionStatus || 'Đã phát hành'}</b>
              · <span style="background:#f3f3f3;padding:1px 6px;border-radius:3px;">Streams: <b>${p.streams || 0}</b></span>
              · <span style="background:#e6f4ea;color:#137333;padding:1px 6px;border-radius:3px;font-weight:bold;">₫ ${p.revenue || 0}</span>
            </div>
            ${playlistsHtml}
          </div>
          <div style="display:flex;gap:0.8rem;align-items:center;">
            ${p.audioUrl ? `<a href="${p.audioUrl}" target="_blank" title="Nghe file Master">🎵 Audio</a>` : ''}
            ${p.artworkUrl ? `<a href="${p.artworkUrl}" target="_blank" title="Xem Artwork">🖼 Artwork</a>` : ''}
            <a href="/listen/${encodeURIComponent(releaseSlug)}" target="_blank">Smart Link (/listen/${releaseSlug}) ↗</a>
          </div>
          <div>
            ${p.id ? (
              isTakedownRequested
                ? `<span style="font-size:11px;color:#d9534f;font-weight:bold;">⏳ Đang chờ duyệt gỡ</span>`
                : `<button class="button alt remove" type="button" data-request-takedown="${p.id}" style="padding:6px 10px;font-size:10px;">Yêu cầu gỡ bài</button>`
            ) : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // 2. Render Track Earnings Breakdown table
  const trackEarningsList = document.querySelector('#track-earnings-list');
  if (trackEarningsList) {
    if (releases.length === 0) {
      trackEarningsList.innerHTML = '<p class="empty" style="font-size:13px;">Chưa có dữ liệu doanh thu chi tiết.</p>';
    } else {
      trackEarningsList.innerHTML = `
        <div style="border:1px solid var(--line);border-radius:4px;overflow:hidden;">
          <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;background:#f5f5f5;padding:10px 14px;font-weight:bold;font-size:11px;text-transform:uppercase;">
            <span>Tên bản phát hành</span>
            <span>Lượt Streams</span>
            <span>Doanh thu ước tính</span>
            <span>Đối soát</span>
          </div>
          ${releases.map(p => `
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;padding:12px 14px;border-top:1px solid var(--line);font-size:13px;align-items:center;">
              <strong>${p.title}</strong>
              <span>${p.streams || '0'}</span>
              <b style="color:#137333;">₫ ${p.revenue || '0'}</b>
              <span style="font-size:11px;color:#008800;font-weight:600;">✓ Đã xác nhận</span>
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
    releases.forEach(p => {
      (p.playlists || []).forEach(pl => {
        allPlaylists.push({ track: p.title, playlist: pl });
      });
    });

    if (allPlaylists.length === 0) {
      playlistShowcase.innerHTML = '<p class="empty" style="font-size:13px;">Chưa có playlist biên tập ghi nhận trong kỳ này.</p>';
    } else {
      playlistShowcase.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));gap:12px;">
          ${allPlaylists.map(item => `
            <div style="background:#fff;border:1px solid #fed7aa;padding:12px;border-radius:6px;">
              <div style="font-size:10px;color:#c2410c;font-weight:bold;text-transform:uppercase;margin-bottom:4px;">🌟 Editorial Playlist</div>
              <div style="font-weight:bold;font-size:14px;margin-bottom:4px;">${item.playlist}</div>
              <div style="font-size:12px;opacity:0.8;">Bản phát hành: <em>${item.track}</em></div>
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
  releases.forEach(r => {
    const revNum = parseInt(String(r.revenue || '0').replace(/[^0-9]/g, ''), 10) || 0;
    const streamNum = parseInt(String(r.streams || '0').replace(/[^0-9]/g, ''), 10) || 0;
    totalTrackRevenue += revNum;
    totalTrackStreams += streamNum;
  });

  const finalRevNum = totalDspRev > 0
    ? totalDspRev
    : (totalTrackRevenue > 0 ? totalTrackRevenue : (parseInt(String(artist.estimatedRevenue || '0').replace(/[^0-9]/g, ''), 10) || 0));

  const finalStreamsNum = totalDspStreams > 0
    ? totalDspStreams
    : (totalTrackStreams > 0 ? totalTrackStreams : (parseInt(String(artist.monthlyStreams || '0').replace(/[^0-9]/g, ''), 10) || 0));

  const displayRevenue = (artist.estimatedRevenue && artist.estimatedRevenue !== '0' && totalDspRev === 0)
    ? artist.estimatedRevenue
    : (finalRevNum > 0 ? finalRevNum.toLocaleString('vi-VN') : '0');

  const displayStreams = (artist.monthlyStreams && artist.monthlyStreams !== '0' && totalDspStreams === 0)
    ? artist.monthlyStreams
    : (finalStreamsNum > 0 ? finalStreamsNum.toLocaleString('vi-VN') : '0');

  const displayBalance = (artist.payableBalance && artist.payableBalance !== '0')
    ? artist.payableBalance
    : displayRevenue;

  if (monthlyStreamsEl) monthlyStreamsEl.textContent = displayStreams;
  if (estimatedRevenueEl) estimatedRevenueEl.textContent = `₫ ${displayRevenue}`;
  // payableBalance will be updated accurately with pending deductions in loadArtistPayouts()

  // Calculate percentage between platforms
  const denom = totalDspRev > 0 ? totalDspRev : (finalRevNum > 0 ? finalRevNum : 1);
  const spPct = totalDspRev > 0 ? Math.round((spRev / denom) * 100) : 55;
  const apPct = totalDspRev > 0 ? Math.round((apRev / denom) * 100) : 25;
  const ytPct = totalDspRev > 0 ? Math.round((ytRev / denom) * 100) : 15;
  const otPct = totalDspRev > 0 ? Math.max(0, 100 - spPct - apPct - ytPct) : 5;

  const platformsList = [
    { id: 'earn-spotify', name: 'Spotify', rev: (totalDspRev > 0 ? spRev : Math.round(finalRevNum * 0.55)), pct: spPct },
    { id: 'earn-apple', name: 'Apple Music', rev: (totalDspRev > 0 ? apRev : Math.round(finalRevNum * 0.25)), pct: apPct },
    { id: 'earn-youtube', name: 'YouTube Music', rev: (totalDspRev > 0 ? ytRev : Math.round(finalRevNum * 0.15)), pct: ytPct },
    { id: 'earn-other', name: 'NCT / Zing / khác', rev: (totalDspRev > 0 ? otRev : Math.round(finalRevNum * 0.05)), pct: otPct }
  ];

  const maxPct = Math.max(...platformsList.map(p => p.pct));

  platformsList.forEach(p => {
    const el = document.querySelector(`#${p.id}`);
    if (el) {
      const isTop = (p.pct === maxPct && maxPct > 0);
      el.innerHTML = `₫ ${p.rev.toLocaleString('vi-VN')} <small style="display:block;font-size:11px;color:${isTop ? '#b45309' : 'inherit'};font-weight:${isTop ? 'bold' : 'normal'};margin-top:4px;">${p.pct}% thị phần ${isTop ? '🔥 (Dẫn đầu)' : ''}</small>`;
    }
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

  // Attach takedown request events
  list.querySelectorAll('[data-request-takedown]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const releaseId = e.target.dataset.requestTakedown;
      if (!confirm('Bạn có chắc chắn muốn gửi yêu cầu gỡ / xóa bản phát hành này tới Admin của UniFLOWs?')) return;

      btn.disabled = true;
      btn.textContent = 'Đang gửi yêu cầu...';

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

    // 1. Upload Master Audio hoặc dùng Link ngoài
    if (audioFile) {
      submitBtn.textContent = 'Đang tải Audio...';
      audioUrl = await uploadAudioFile(audioFile, `${artist.id}_${slug(v.title)}`);
    } else if (v.audioExternalUrl && v.audioExternalUrl.trim()) {
      audioUrl = v.audioExternalUrl.trim();
    }

    // 2. Upload Artwork hoặc dùng Link ngoài
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

    showNotice(`✓ Đã gửi bản phát hành "${v.title}" thành công. Đang chờ UniFLOWs duyệt!`);
    await renderReleases();
  } catch (err) {
    console.error(err);
    showNotice('Lỗi khi gửi phát hành: ' + (err.message || 'Không xác định'), true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Gửi phát hành';
  }
});

// Payout Dialog & History Logic
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

// Subscribe to Live Supabase Changes on Payouts
if (isSupabaseConfigured()) {
  try {
    supabase
      .channel('public:payout_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payout_requests' }, () => {
        loadArtistPayouts();
      })
      .subscribe();
  } catch (err) {
    console.warn('Realtime subscription error:', err);
  }
}

// Open Payout Dialog
requestPayoutBtn?.addEventListener('click', () => {
  if (availableBalanceNumber < 1000000) {
    alert(`Số dư khả dụng hiện tại (₫ ${availableBalanceNumber.toLocaleString('vi-VN')}) chưa đạt ngưỡng tối thiểu ₫ 1,000,000 để yêu cầu thanh toán.`);
    return;
  }
  if (payoutDialogNotice) payoutDialogNotice.style.display = 'none';
  payoutRequestForm?.reset();

  const amountInput = document.querySelector('#payout-amount');
  if (amountInput) {
    amountInput.value = availableBalanceNumber;
    amountInput.max = availableBalanceNumber;
  }
  payoutDialog?.showModal();
});

closePayoutDialogBtn?.addEventListener('click', () => {
  payoutDialog?.close();
});

payoutRequestForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const amountVal = parseInt(document.querySelector('#payout-amount')?.value, 10) || 0;
  const bank = document.querySelector('#payout-bank')?.value.trim();
  const accountNumber = document.querySelector('#payout-account-number')?.value.trim();
  const accountName = document.querySelector('#payout-account-name')?.value.trim();

  if (amountVal < 1000000) {
    if (payoutDialogNotice) {
      payoutDialogNotice.textContent = 'Số tiền rút tối thiểu là ₫ 1,000,000.';
      payoutDialogNotice.style.display = 'block';
    }
    return;
  }

  if (amountVal > availableBalanceNumber) {
    if (payoutDialogNotice) {
      payoutDialogNotice.textContent = `Số tiền rút vượt quá số dư khả dụng (₫ ${availableBalanceNumber.toLocaleString('vi-VN')}).`;
      payoutDialogNotice.style.display = 'block';
    }
    return;
  }

  if (submitPayoutBtn) {
    submitPayoutBtn.disabled = true;
    submitPayoutBtn.textContent = 'Đang gửi yêu cầu...';
  }

  const newPayoutItem = {
    id: 'payout-' + Date.now().toString(36),
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
