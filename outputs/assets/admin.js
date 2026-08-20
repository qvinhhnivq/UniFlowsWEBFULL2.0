import { getData, saveData } from './data.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

if (sessionStorage.getItem('uniflows-admin') !== 'true') {
  location.replace('login.html');
}

const form = document.querySelector('#site-form');
const artistsBox = document.querySelector('#artists-editor');
const articlesBox = document.querySelector('#articles-editor');
const releasesBox = document.querySelector('#releases-reviewer');
const notice = document.querySelector('#notice');
const saveBtn = document.querySelector('#save-all-btn');

let data = await getData();
let releases = [];

const esc = s => String(s ?? '').replace(/"/g, '&quot;');

function artistEditor(a, i) {
  return `
    <div class="item-editor" data-artist="${i}">
      <div class="mini-grid">
        <div class="field"><label>Tên</label><input data-key="name" value="${esc(a.name)}"></div>
        <div class="field"><label>ID (slug)</label><input data-key="id" value="${esc(a.id)}"></div>
        <div class="field"><label>Thể loại</label><input data-key="genre" value="${esc(a.genre)}"></div>
        <div class="field"><label>Ảnh đại diện (URL)</label><input data-key="image" value="${esc(a.image)}"></div>
      </div>
      <div class="field"><label>Giới thiệu</label><textarea data-key="bio">${a.bio || ''}</textarea></div>
      <div class="field"><label>Gallery ảnh (mỗi dòng một URL)</label><textarea data-key="gallery">${(a.gallery || []).join('\n')}</textarea></div>
      <div class="mini-grid">
        <div class="field"><label>Instagram URL</label><input data-key="instagram" value="${esc(a.instagram)}"></div>
        <div class="field"><label>YouTube URL</label><input data-key="youtube" value="${esc(a.youtube)}"></div>
        <div class="field"><label>TikTok URL</label><input data-key="tiktok" value="${esc(a.tiktok)}"></div>
        <div class="field"><label>Sản phẩm (mỗi dòng: Tên | Loại | Nền tảng=URL)</label><textarea data-key="products">${(a.products || []).map(p => `${p.title} | ${p.type} | ${Object.entries(p.links || { Spotify: p.url || '#' }).map(([n, u]) => `${n}=${u}`).join(', ')}`).join('\n')}</textarea></div>
      </div>
      <button class="button alt remove" type="button" data-remove-artist="${i}">Xóa nghệ sĩ</button>
    </div>
  `;
}

function articleEditor(a, i) {
  return `
    <div class="item-editor" data-article="${i}">
      <div class="mini-grid">
        <div class="field"><label>Tiêu đề</label><input data-key="title" value="${esc(a.title)}"></div>
        <div class="field"><label>ID</label><input data-key="id" value="${esc(a.id)}"></div>
        <div class="field"><label>Chuyên mục</label><input data-key="category" value="${esc(a.category)}"></div>
        <div class="field"><label>Ngày (vd. 08.2026)</label><input data-key="date" value="${esc(a.date)}"></div>
        <div class="field"><label>Tác giả</label><input data-key="author" value="${esc(a.author || 'UniFLOWs Editorial')}"></div>
        <div class="field"><label>Thời gian đọc</label><input data-key="readTime" value="${esc(a.readTime || '3 phút đọc')}"></div>
      </div>
      <div class="field"><label>Link ảnh bìa</label><input data-key="cover" value="${esc(a.cover || '')}"></div>
      <div class="field"><label>Tóm tắt</label><textarea data-key="excerpt">${a.excerpt || ''}</textarea></div>
      <div class="field"><label>Nội dung bài viết</label><textarea data-key="body" rows="6">${a.body || ''}</textarea></div>
      <label class="kicker"><input data-key="published" type="checkbox" ${a.published ? 'checked' : ''}> Xuất bản công khai</label>
      <br><br>
      <button class="button alt remove" type="button" data-remove-article="${i}">Xóa bài viết</button>
    </div>
  `;
}

async function loadReleasesQueue() {
  if (!releasesBox) return;
  if (!isSupabaseConfigured()) {
    releasesBox.innerHTML = '<p class="portal-note">Chế độ Demo: Dữ liệu releases đang được lưu trên LocalStorage / Mock.</p>';
    return;
  }

  try {
    const { data: dbReleases, error } = await supabase
      .from('releases')
      .select('*, artists(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    releases = dbReleases || [];

    if (releases.length === 0) {
      releasesBox.innerHTML = '<p class="empty">Không có bản phát hành nào trong hàng đợi.</p>';
      return;
    }

    releasesBox.innerHTML = releases.map(r => `
      <div class="item-editor" style="margin-bottom:1rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <strong>${esc(r.title)}</strong> — <em>${esc(r.artists?.name || r.artist_id)}</em> (${esc(r.type || 'Single')})
            <br>
            <small style="opacity:0.7">Ngày ra mắt: ${esc(r.release_date || 'N/A')} · ISRC/Tracks: ${(r.tracks || []).length} tracks</small>
          </div>
          <div style="display:flex;gap:0.6rem;align-items:center;">
            <select data-release-status="${r.id}" style="padding:0.4rem;background:#111;color:#fff;border:1px solid #333;border-radius:4px;">
              <option ${r.submission_status === 'Đang chờ UniFLOWs duyệt' ? 'selected' : ''}>Đang chờ UniFLOWs duyệt</option>
              <option ${r.submission_status === 'Đã duyệt / Chuẩn bị phân phối' ? 'selected' : ''}>Đã duyệt / Chuẩn bị phân phối</option>
              <option ${r.submission_status === 'Đã phát hành' ? 'selected' : ''}>Đã phát hành</option>
              <option ${r.submission_status === 'Từ chối / Cần chỉnh sửa metadata' ? 'selected' : ''}>Từ chối / Cần chỉnh sửa metadata</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:1rem;margin-top:0.8rem;font-size:0.85rem;">
          ${r.audio_url ? `<a href="${r.audio_url}" target="_blank" style="color:var(--accent,#fff)">🎵 Nghe File Master WAV/FLAC ↗</a>` : '<span style="opacity:0.5">Không có audio đính kèm</span>'}
          ${r.artwork_url ? `<a href="${r.artwork_url}" target="_blank" style="color:var(--accent,#fff)">🖼 Xem Artwork Gốc ↗</a>` : '<span style="opacity:0.5">Không có artwork</span>'}
          <a href="listen.html?artist=${encodeURIComponent(r.artist_id)}&release=${encodeURIComponent(r.slug || r.title)}" target="_blank">Xem Smart Link ↗</a>
        </div>
      </div>
    `).join('');

    // Bắt sự kiện cập nhật trạng thái release
    releasesBox.querySelectorAll('[data-release-status]').forEach(select => {
      select.addEventListener('change', async (e) => {
        const releaseId = e.target.dataset.releaseStatus;
        const newStatus = e.target.value;
        const { error: updateErr } = await supabase
          .from('releases')
          .update({ submission_status: newStatus })
          .eq('id', releaseId);

        if (updateErr) {
          alert('Lỗi khi cập nhật trạng thái release: ' + updateErr.message);
        } else {
          notice.textContent = `✓ Đã cập nhật trạng thái bản phát hành thành: "${newStatus}"`;
          notice.style.display = 'block';
        }
      });
    });
  } catch (err) {
    releasesBox.innerHTML = `<p class="empty">Lỗi tải releases: ${err.message}</p>`;
  }
}

function render() {
  ['tagline', 'heroText', 'aboutTitle', 'aboutText', 'email', 'city'].forEach(k => {
    if (form.elements[k]) form.elements[k].value = data[k] || '';
  });
  artistsBox.innerHTML = data.artists.map(artistEditor).join('');
  articlesBox.innerHTML = data.articles.map(articleEditor).join('');
  loadReleasesQueue();
}

function readItems(selector, kind) {
  return [...document.querySelectorAll(selector)].map(el => {
    let obj = {};
    el.querySelectorAll('[data-key]').forEach(input => {
      obj[input.dataset.key] = input.type === 'checkbox' ? input.checked : input.value.trim();
    });
    if (kind === 'artist') {
      obj.gallery = (obj.gallery || '').split('\n').map(x => x.trim()).filter(Boolean);
      obj.products = (obj.products || '').split('\n').filter(Boolean).map(row => {
        let [title, type, rawLinks = ''] = row.split('|').map(x => x.trim());
        let links = {};
        rawLinks.split(',').forEach(part => {
          let [name, ...url] = part.split('=');
          if (name && url.length) links[name.trim().toLowerCase().replace(/\s+/g, '-')] = url.join('=').trim();
        });
        return { title, type, links };
      });
    }
    return obj;
  });
}

document.querySelector('#add-artist')?.addEventListener('click', () => {
  data.artists.push({
    id: 'artist-' + Date.now().toString(36),
    name: 'Nghệ sĩ mới',
    genre: 'Pop',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=85',
    bio: '',
    products: [],
    instagram: '#',
    youtube: '#',
    tiktok: '#'
  });
  render();
});

document.querySelector('#add-article')?.addEventListener('click', () => {
  data.articles.unshift({
    id: 'bai-viet-' + Date.now().toString(36),
    date: '08.2026',
    category: 'News',
    title: 'Bài viết mới',
    excerpt: '',
    body: '',
    published: true
  });
  render();
});

document.addEventListener('click', e => {
  let a = e.target.dataset.removeArtist;
  let n = e.target.dataset.removeArticle;
  if (a !== undefined) {
    if (confirm('Bạn có chắc muốn xóa nghệ sĩ này?')) {
      data.artists.splice(+a, 1);
      render();
    }
  }
  if (n !== undefined) {
    if (confirm('Bạn có chắc muốn xóa bài viết này?')) {
      data.articles.splice(+n, 1);
      render();
    }
  }
});

form.onsubmit = async e => {
  e.preventDefault();
  saveBtn.disabled = true;
  saveBtn.textContent = 'Đang lưu lên Supabase...';

  ['tagline', 'heroText', 'aboutTitle', 'aboutText', 'email', 'city'].forEach(k => {
    if (form.elements[k]) data[k] = form.elements[k].value.trim();
  });

  data.artists = readItems('[data-artist]', 'artist');
  data.articles = readItems('[data-article]', 'article');

  const success = await saveData(data);

  saveBtn.disabled = false;
  saveBtn.textContent = 'Lưu toàn bộ lên Supabase';

  if (success) {
    notice.textContent = '✓ Đã lưu toàn bộ dữ liệu thành công vào Supabase!';
    notice.style.display = 'block';
    scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    alert('Có lỗi khi lưu lên Supabase. Vui lòng kiểm tra lại cấu hình kết nối.');
  }
};

document.querySelector('#logout')?.addEventListener('click', async () => {
  if (isSupabaseConfigured()) {
    await supabase.auth.signOut();
  }
  sessionStorage.removeItem('uniflows-admin');
  sessionStorage.removeItem('uniflows-user-email');
  location.href = 'login.html';
});

render();
