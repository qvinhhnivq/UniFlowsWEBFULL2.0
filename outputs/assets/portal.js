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

// Payout button handler
requestPayoutBtn?.addEventListener('click', () => {
  const balanceRaw = parseInt(String(artist.payableBalance || '0').replace(/[^0-9]/g, ''), 10) || 0;
  if (balanceRaw < 1000000) {
    alert(`Số dư khả dụng hiện tại (₫ ${artist.payableBalance || 0}) chưa đạt ngưỡng tối thiểu ₫ 1,000,000 để yêu cầu rút tiền.`);
  } else {
    alert(`Yêu cầu rút số tiền ₫ ${artist.payableBalance} đã được gửi thành công đến bộ phận Tài chính của UniFLOWs.`);
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

renderReleases();
