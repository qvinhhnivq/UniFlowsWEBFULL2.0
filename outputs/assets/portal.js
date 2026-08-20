import { getData, saveData } from './data.js';
import { supabase, isSupabaseConfigured, uploadArtworkFile, uploadAudioFile } from './supabase.js';

// Kiểm tra quyền đăng nhập
if (sessionStorage.getItem('uniflows-artist') !== 'true') {
  location.replace('artist-login.html');
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

let data = await getData();
const currentArtistId = sessionStorage.getItem('uniflows-artist-id') || 'lumi';
let artist = data.artists.find(a => a.id === currentArtistId) || data.artists[0];

if (artist) {
  if (artistDisplayName) artistDisplayName.textContent = artist.name + '.';
  if (primaryArtistInput) primaryArtistInput.value = artist.name;
}

// File name change indicators
audioFileInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && audioFilename) {
    audioFilename.textContent = `✓ Đã chọn Audio: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
  }
});

artworkFileInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && artworkFilename) {
    artworkFilename.textContent = `✓ Đã chọn Artwork: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
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
        releases = dbReleases.map(r => ({
          id: r.id,
          title: r.title,
          type: r.type,
          slug: r.slug,
          submissionStatus: r.submission_status || 'Đã phát hành',
          audioUrl: r.audio_url,
          artworkUrl: r.artwork_url,
          links: r.links || {}
        }));
      }
    } catch (e) {
      console.warn('Lỗi tải release từ Supabase:', e);
    }
  }

  const pending = releases.filter(r => r.submissionStatus?.includes('chờ') || r.submissionStatus?.includes('Duyệt')).length;
  if (pendingCountEl) pendingCountEl.textContent = String(pending).padStart(2, '0');

  if (releases.length === 0) {
    list.innerHTML = '<p class="empty">Chưa có bản phát hành nào trong catalogue.</p>';
    return;
  }

  list.innerHTML = releases.map(p => `
    <div class="queue-item">
      <span>${p.type || 'Single'}</span>
      <strong>${p.title}</strong>
      <b>${p.submissionStatus || 'Đã phát hành'}</b>
      <div style="display:flex;gap:0.8rem;align-items:center;">
        ${p.audioUrl ? `<a href="${p.audioUrl}" target="_blank" title="Nghe file Master" style="color:var(--accent,#fff)">🎵 Audio</a>` : ''}
        ${p.artworkUrl ? `<a href="${p.artworkUrl}" target="_blank" title="Xem Artwork" style="color:var(--accent,#fff)">🖼 Artwork</a>` : ''}
        <a href="listen.html?artist=${encodeURIComponent(artist.id)}&release=${encodeURIComponent(p.slug || slug(p.title))}" target="_blank">Smart Link ↗</a>
      </div>
    </div>
  `).join('');
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Đang xử lý tải file & gửi phát hành...';
  notice.style.display = 'none';

  try {
    const formData = new FormData(form);
    const v = Object.fromEntries(formData);
    const audioFile = audioFileInput?.files[0];
    const artworkFile = artworkFileInput?.files[0];

    let audioUrl = '';
    let artworkUrl = '';

    // 1. Upload Master Audio WAV/FLAC to Supabase Storage
    if (audioFile) {
      submitBtn.textContent = `Đang tải lên file Audio master (${(audioFile.size / (1024 * 1024)).toFixed(1)} MB)...`;
      audioUrl = await uploadAudioFile(audioFile, `${artist.id}_${slug(v.title)}`);
    }

    // 2. Upload Artwork to Supabase Storage
    if (artworkFile) {
      submitBtn.textContent = 'Đang tải lên Artwork 3000x3000px...';
      artworkUrl = await uploadArtworkFile(artworkFile, `${artist.id}_${slug(v.title)}_art`);
    }

    const releaseSlug = slug(v.title);
    const releaseTypeFormatted = `${v.type} · ${v.releaseDate}`;

    // 3. Parse tracklist
    const parsedTracks = (v.tracks || '').split('\n').filter(Boolean).map(line => {
      const [trackTitle, isrc, version] = line.split('|').map(s => s.trim());
      return { trackTitle, isrc: isrc || '', version: version || 'Original' };
    });

    const newReleaseObj = {
      title: v.title,
      type: releaseTypeFormatted,
      slug: releaseSlug,
      links: {},
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

    // 4. Lưu vào Supabase Database
    if (isSupabaseConfigured()) {
      submitBtn.textContent = 'Đang ghi nhận metadata vào Supabase Database...';
      const { error: dbError } = await supabase.from('releases').insert({
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
        links: {},
        metadata: v
      });

      if (dbError) throw dbError;
    }

    // 5. Cập nhật state local
    artist.products = artist.products || [];
    artist.products.unshift(newReleaseObj);
    await saveData(data);

    form.reset();
    if (audioFilename) audioFilename.textContent = 'Thả hoặc chọn file master WAV/FLAC vào đây';
    if (artworkFilename) artworkFilename.textContent = 'Artwork 3000 × 3000 px';
    if (primaryArtistInput) primaryArtistInput.value = artist.name;

    showNotice(`✓ Bản phát hành "${v.title}" đã được nộp thành công và đang chờ UniFLOWs kiểm duyệt!`);
    await renderReleases();
  } catch (err) {
    console.error(err);
    showNotice('Lỗi khi gửi phát hành: ' + (err.message || 'Không xác định'), true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Gửi UniFLOWs duyệt phát hành';
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
  location.href = 'artist-login.html';
});

renderReleases();
