import { getData, saveData } from './data.js';
import { supabase, isSupabaseConfigured, uploadArtworkFile } from './supabase.js';

if (sessionStorage.getItem('uniflows-admin') !== 'true') {
  location.replace('login');
}

const form = document.querySelector('#site-form');
const artistsBox = document.querySelector('#artists-editor');
const articlesBox = document.querySelector('#articles-editor');
const releasesBox = document.querySelector('#releases-reviewer');
const emailsContainer = document.querySelector('#emails-editor-container');
const addEmailBtn = document.querySelector('#add-email-row-btn');
const notice = document.querySelector('#notice');
const saveBtn = document.querySelector('#save-all-btn');

let data = await getData();
let releases = [];

const esc = s => String(s ?? '').replace(/"/g, '&quot;');
const slug = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function renderEmailsEditor(emailsList) {
  if (!emailsContainer) return;
  const list = Array.isArray(emailsList) ? emailsList : Object.entries(emailsList || {}).map(([label, email]) => ({ label, email }));
  
  emailsContainer.innerHTML = list.map((item) => `
    <div class="custom-email-row" style="display:flex;gap:10px;align-items:center;">
      <input class="email-row-label" value="${esc(item.label || '')}" placeholder="Tên phòng ban / Nhãn (vd: Gửi Demo & A&R)" style="width:240px;padding:10px;border:1px solid var(--ink);">
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
    <input class="email-row-label" placeholder="Tên phòng ban / Nhãn (vd: Booking & Sự kiện)" style="width:240px;padding:10px;border:1px solid var(--ink);">
    <input class="email-row-value" placeholder="email@uniflowslabel.com" style="flex:1;padding:10px;border:1px solid var(--ink);">
    <button type="button" class="remove-email-btn button alt" style="padding:10px 14px;">✕</button>
  `;
  emailsContainer.appendChild(row);
  row.querySelector('.remove-email-btn').onclick = () => row.remove();
});

function artistEditor(a, i) {
  return `
    <div class="item-editor" data-artist="${i}" style="border: 1px solid var(--ink); padding: 18px; margin-bottom: 20px;">
      <h3 style="margin-top:0;font-size:20px;">${esc(a.name)} (${esc(a.id)})</h3>
      <div class="mini-grid">
        <div class="field"><label>Tên nghệ sĩ</label><input data-key="name" value="${esc(a.name)}"></div>
        <div class="field"><label>ID định danh (slug không dấu)</label><input data-key="id" value="${esc(a.id)}"></div>
        <div class="field"><label>Thể loại âm nhạc</label><input data-key="genre" value="${esc(a.genre)}"></div>
        <div class="field"><label>Ảnh đại diện (URL)</label><input data-key="image" value="${esc(a.image)}"></div>
      </div>
      <div class="field"><label>Tiểu sử / Giới thiệu</label><textarea data-key="bio" rows="3">${a.bio || ''}</textarea></div>
      <div class="field"><label>Gallery ảnh (mỗi dòng một URL)</label><textarea data-key="gallery" rows="2">${(a.gallery || []).join('\n')}</textarea></div>
      
      <div class="mini-grid">
        <div class="field"><label>Instagram URL</label><input data-key="instagram" value="${esc(a.instagram || '')}" placeholder="https://instagram.com/..."></div>
        <div class="field"><label>YouTube URL</label><input data-key="youtube" value="${esc(a.youtube || '')}" placeholder="https://youtube.com/..."></div>
        <div class="field"><label>TikTok URL</label><input data-key="tiktok" value="${esc(a.tiktok || '')}" placeholder="https://tiktok.com/@..."></div>
      </div>

      <h4 style="margin: 15px 0 5px; font-size: 15px; text-transform: uppercase;">Số liệu & Doanh thu nghệ sĩ (Cập nhật cho Portal)</h4>
      <div class="mini-grid">
        <div class="field"><label>Monthly Streams</label><input data-key="monthlyStreams" value="${esc(a.monthlyStreams || '0')}" placeholder="Ví dụ: 150.2K hoặc 0"></div>
        <div class="field"><label>Doanh thu ước tính (₫)</label><input data-key="estimatedRevenue" value="${esc(a.estimatedRevenue || '0')}" placeholder="Ví dụ: 5,400,000 hoặc 0"></div>
        <div class="field"><label>Số dư khả dụng thanh toán (₫)</label><input data-key="payableBalance" value="${esc(a.payableBalance || '0')}" placeholder="Ví dụ: 3,200,000 hoặc 0"></div>
      </div>

      <div class="field" style="margin-top:10px;"><label>Sản phẩm (mỗi dòng: Tên | Loại | Nền tảng=URL)</label><textarea data-key="products" rows="3">${(a.products || []).map(p => `${p.title} | ${p.type} | ${Object.entries(p.links || { Spotify: p.url || '#' }).map(([n, u]) => `${n}=${u}`).join(', ')}`).join('\n')}</textarea></div>
      <button class="button alt remove" type="button" data-remove-artist="${i}" style="margin-top:10px;">Xóa nghệ sĩ này</button>
    </div>
  `;
}

function articleEditor(a, i) {
  return `
    <div class="item-editor" data-article="${i}" style="border: 1px solid var(--ink); padding: 18px; margin-bottom: 20px;">
      <h3 style="margin-top:0;font-size:20px;">${esc(a.title)}</h3>
      <div class="mini-grid">
        <div class="field"><label>Tiêu đề bài viết</label><input data-key="title" value="${esc(a.title)}"></div>
        <div class="field"><label>ID (slug bài viết)</label><input data-key="id" value="${esc(a.id)}"></div>
        <div class="field"><label>Chuyên mục</label><input data-key="category" value="${esc(a.category)}"></div>
        <div class="field"><label>Ngày (vd. 08.2026)</label><input data-key="date" value="${esc(a.date)}"></div>
        <div class="field"><label>Tác giả</label><input data-key="author" value="${esc(a.author || 'UniFLOWs Editorial')}"></div>
        <div class="field"><label>Thời gian đọc</label><input data-key="readTime" value="${esc(a.readTime || '3 phút đọc')}"></div>
      </div>

      <div class="field">
        <label>Ảnh bìa bài viết <span style="font-weight:normal;font-size:11px;opacity:0.75;">(Dán URL ảnh bên ngoài để tiết kiệm dung lượng, hoặc bấm nút chọn file để tải lên)</span></label>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <input data-key="cover" id="cover-input-${i}" value="${esc(a.cover || '')}" placeholder="Dán link ảnh https://... (Unsplash, Imgur, CDN...)" style="flex:1;min-width:250px;">
          <label class="button alt" style="cursor:pointer;white-space:nowrap;margin:0;padding:12px;font-size:11px;">
            📁 Chọn file ảnh tải lên
            <input type="file" data-article-upload="${i}" accept="image/*" style="display:none;">
          </label>
        </div>
        <small id="cover-status-${i}" style="color:var(--accent,#507000);font-size:12px;margin-top:4px;display:none;"></small>
      </div>

      <div class="field"><label>Tóm tắt bài viết</label><textarea data-key="excerpt" rows="2">${a.excerpt || ''}</textarea></div>
      <div class="field"><label>Nội dung bài viết đầy đủ</label><textarea data-key="body" rows="6">${a.body || ''}</textarea></div>
      <label class="kicker"><input data-key="published" type="checkbox" ${a.published ? 'checked' : ''}> Xuất bản công khai trên Tạp chí</label>
      <br><br>
      <button class="button alt remove" type="button" data-remove-article="${i}">Xóa bài viết này</button>
    </div>
  `;
}

async function loadReleasesQueue() {
  if (!releasesBox) return;
  if (!isSupabaseConfigured()) {
    releasesBox.innerHTML = '<p class="portal-note">Chế độ Demo: Dữ liệu releases đang được đọc từ Mock/LocalStorage.</p>';
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

    releasesBox.innerHTML = releases.map((r) => {
      const links = r.links || {};
      const releaseSlug = r.slug || slug(r.title);
      const isTakedown = r.submission_status === 'Yêu cầu gỡ / xóa bản phát hành';

      const standardKeys = ['spotify', 'apple', 'applemusic', 'youtube', 'youtubemusic', 'zingmp3', 'zing', 'nct', 'soundcloud'];
      const customLinks = Object.entries(links).filter(([k]) => !standardKeys.includes(k.toLowerCase()));

      return `
        <div class="item-editor" data-release-card="${r.id}" style="border: 1px solid ${isTakedown ? '#ff4d4f' : '#999'}; padding: 18px; margin-bottom: 20px; background: ${isTakedown ? '#fffafa' : '#fff'};">
          ${isTakedown ? `
            <div style="background:#fff2f0;border:1px solid #ffccc7;padding:10px 14px;margin-bottom:12px;color:#cf1322;font-size:13px;font-weight:bold;">
              ⚠️ NGHỆ SĨ ĐANG YÊU CẦU GỠ BẢN PHÁT HÀNH NÀY. Bấm "Duyệt gỡ & Xóa vĩnh viễn" bên dưới để chấp thuận, hoặc chọn lại trạng thái khác nếu từ chối.
            </div>
          ` : ''}

          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
            <div>
              <h3 style="margin:0 0 5px;font-size:22px;">${esc(r.title)}</h3>
              <strong>Nghệ sĩ: ${esc(r.artists?.name || r.artist_id)}</strong> · <em>${esc(r.type || 'Single')}</em>
              <br>
              <small style="opacity:0.8">Ngày phát hành: ${esc(r.release_date || 'N/A')} · Thể loại: ${esc(r.genre || 'Pop')} · ISRC/Tracks: ${(r.tracks || []).length} tracks</small>
            </div>
            <div>
              <label style="font-size:11px;text-transform:uppercase;display:block;margin-bottom:4px;">Trạng thái phê duyệt:</label>
              <select data-release-status="${r.id}" style="padding:8px;border:1px solid ${isTakedown ? '#ff4d4f' : '#000'};background:#f9f9f9;font-weight:600;">
                <option ${r.submission_status === 'Đang chờ UniFLOWs duyệt' ? 'selected' : ''}>Đang chờ UniFLOWs duyệt</option>
                <option ${r.submission_status === 'Đã duyệt / Chuẩn bị phân phối' ? 'selected' : ''}>Đã duyệt / Chuẩn bị phân phối</option>
                <option ${r.submission_status === 'Đã phát hành' ? 'selected' : ''}>Đã phát hành</option>
                <option ${r.submission_status === 'Từ chối / Cần chỉnh sửa metadata' ? 'selected' : ''}>Từ chối / Cần chỉnh sửa metadata</option>
                <option ${isTakedown ? 'selected' : ''}>Yêu cầu gỡ / xóa bản phát hành</option>
              </select>
            </div>
          </div>

          <!-- Direct Short Link Box & File Links -->
          <div style="display:flex;gap:12px;margin:15px 0;flex-wrap:wrap;align-items:center;background:#f3f3f3;padding:12px;border-radius:4px;">
            ${r.audio_url ? `<a href="${r.audio_url}" target="_blank" style="font-weight:600;color:#0066cc;">🎵 File Master ↗</a>` : '<span style="opacity:0.5">Không có audio</span>'}
            ${r.artwork_url ? `<a href="${r.artwork_url}" target="_blank" style="font-weight:600;color:#0066cc;">🖼 Artwork Gốc ↗</a>` : '<span style="opacity:0.5">Không có artwork</span>'}
            <a href="/listen/${releaseSlug}" target="_blank" style="font-weight:700;color:#008800;">🔗 Mở SmartLink (/listen/${releaseSlug}) ↗</a>
            <button type="button" class="button alt" data-copy-link="/listen/${releaseSlug}" style="padding:6px 10px;font-size:11px;background:#fff;margin:0;">📋 Copy link rút gọn</button>
          </div>

          <h4 style="margin:12px 0 6px;font-size:14px;text-transform:uppercase;">Cập nhật link các nền tảng streaming (SmartLink)</h4>
          <div class="mini-grid">
            <div class="field"><label>Spotify URL</label><input data-dsp="spotify" data-rel-id="${r.id}" value="${esc(links.spotify || '')}" placeholder="https://open.spotify.com/track/..."></div>
            <div class="field"><label>Apple Music URL</label><input data-dsp="apple" data-rel-id="${r.id}" value="${esc(links.apple || '')}" placeholder="https://music.apple.com/..."></div>
            <div class="field"><label>YouTube Music URL</label><input data-dsp="youtube" data-rel-id="${r.id}" value="${esc(links.youtube || '')}" placeholder="https://music.youtube.com/watch?v=..."></div>
            <div class="field"><label>Zing MP3 URL</label><input data-dsp="zingmp3" data-rel-id="${r.id}" value="${esc(links.zingmp3 || '')}" placeholder="https://zingmp3.vn/bai-hat/..."></div>
            <div class="field"><label>Nhaccuatui (NCT) URL</label><input data-dsp="nct" data-rel-id="${r.id}" value="${esc(links.nct || '')}" placeholder="https://www.nhaccuatui.com/bai-hat/..."></div>
            <div class="field"><label>SoundCloud URL</label><input data-dsp="soundcloud" data-rel-id="${r.id}" value="${esc(links.soundcloud || '')}" placeholder="https://soundcloud.com/..."></div>
          </div>

          <!-- Custom Platforms List -->
          <div style="margin-top:12px;">
            <label style="font-size:11px;text-transform:uppercase;font-weight:bold;display:block;margin-bottom:6px;">Nền tảng tuỳ chọn khác (Tự đặt tên & link):</label>
            <div class="custom-dsp-container" data-custom-dsp-for="${r.id}">
              ${customLinks.map(([name, url]) => `
                <div class="custom-dsp-row" style="display:flex;gap:10px;margin-bottom:8px;align-items:center;">
                  <input class="custom-dsp-name" value="${esc(name)}" placeholder="Tên nền tảng (vd: Bandcamp, Tidal, TikTok)" style="width:180px;padding:8px;font-size:13px;border:1px solid #aaa;">
                  <input class="custom-dsp-url" value="${esc(url)}" placeholder="https://..." style="flex:1;padding:8px;font-size:13px;border:1px solid #aaa;">
                  <button type="button" class="remove-dsp-row button alt" style="padding:7px 10px;font-size:11px;">✕</button>
                </div>
              `).join('')}
            </div>
            <button type="button" class="button alt add-custom-dsp-btn" data-add-dsp-to="${r.id}" style="padding:6px 12px;font-size:11px;margin-top:4px;">+ Thêm nền tảng khác</button>
          </div>

          <div style="display:flex;justify-content:space-between;margin-top:15px;align-items:center;border-top:1px solid #eee;padding-top:12px;">
            <button class="button" type="button" data-save-release-links="${r.id}" style="padding:10px 14px;font-size:11px;">Lưu toàn bộ link SmartLink</button>
            <button class="button alt remove" type="button" data-delete-release="${r.id}" style="padding:10px 14px;font-size:11px;background:${isTakedown ? '#ff4d4f' : 'transparent'};color:${isTakedown ? '#fff' : 'inherit'};">
              ${isTakedown ? '🗑 Duyệt gỡ & Xóa vĩnh viễn khỏi hệ thống' : '🗑 Xóa bản phát hành này'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    attachReleaseEvents();
  } catch (err) {
    releasesBox.innerHTML = `<p class="empty">Lỗi tải releases: ${err.message}</p>`;
  }
}

function attachReleaseEvents() {
  // Copy smartlink button
  releasesBox.querySelectorAll('[data-copy-link]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const path = e.target.dataset.copyLink;
      const fullUrl = `${location.origin}${path}`;
      try {
        await navigator.clipboard.writeText(fullUrl);
        btn.textContent = 'Đã chép link ✓';
        setTimeout(() => btn.textContent = '📋 Copy link rút gọn', 2000);
      } catch {
        prompt('Copy link chia sẻ tại đây:', fullUrl);
      }
    });
  });

  // Add dynamic custom DSP row
  releasesBox.querySelectorAll('.add-custom-dsp-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const relId = e.target.dataset.addDspTo;
      const container = releasesBox.querySelector(`[data-custom-dsp-for="${relId}"]`);
      if (!container) return;

      const row = document.createElement('div');
      row.className = 'custom-dsp-row';
      row.style.cssText = 'display:flex;gap:10px;margin-bottom:8px;align-items:center;';
      row.innerHTML = `
        <input class="custom-dsp-name" placeholder="Tên nền tảng (vd: Bandcamp, Tidal, TikTok)" style="width:180px;padding:8px;font-size:13px;border:1px solid #aaa;">
        <input class="custom-dsp-url" placeholder="https://..." style="flex:1;padding:8px;font-size:13px;border:1px solid #aaa;">
        <button type="button" class="remove-dsp-row button alt" style="padding:7px 10px;font-size:11px;">✕</button>
      `;
      container.appendChild(row);
      row.querySelector('.remove-dsp-row').onclick = () => row.remove();
    });
  });

  releasesBox.querySelectorAll('.remove-dsp-row').forEach(btn => {
    btn.onclick = () => btn.closest('.custom-dsp-row')?.remove();
  });

  // Status change
  releasesBox.querySelectorAll('[data-release-status]').forEach(select => {
    select.addEventListener('change', async (e) => {
      const releaseId = e.target.dataset.releaseStatus;
      const newStatus = e.target.value;
      const { error: updateErr } = await supabase
        .from('releases')
        .update({ submission_status: newStatus })
        .eq('id', releaseId);

      if (updateErr) {
        alert('Lỗi khi cập nhật trạng thái: ' + updateErr.message);
      } else {
        notice.textContent = `✓ Đã cập nhật trạng thái bản phát hành: "${newStatus}"`;
        notice.style.display = 'block';
        loadReleasesQueue();
      }
    });
  });

  // Save DSP links for release
  releasesBox.querySelectorAll('[data-save-release-links]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const releaseId = e.target.dataset.saveReleaseLinks;
      const card = releasesBox.querySelector(`[data-release-card="${releaseId}"]`);
      if (!card) return;

      const links = {};
      // 1. Standard DSPs
      card.querySelectorAll('[data-dsp]').forEach(input => {
        const dsp = input.dataset.dsp;
        const val = input.value.trim();
        if (val) links[dsp] = val;
      });

      // 2. Custom DSPs
      card.querySelectorAll('.custom-dsp-row').forEach(row => {
        const name = row.querySelector('.custom-dsp-name')?.value.trim();
        const url = row.querySelector('.custom-dsp-url')?.value.trim();
        if (name && url) {
          links[name] = url;
        }
      });

      btn.disabled = true;
      btn.textContent = 'Đang lưu...';

      const { error: updateErr } = await supabase
        .from('releases')
        .update({ links })
        .eq('id', releaseId);

      btn.disabled = false;
      btn.textContent = 'Lưu toàn bộ link SmartLink';

      if (updateErr) {
        alert('Lỗi khi lưu link nền tảng: ' + updateErr.message);
      } else {
        notice.textContent = '✓ Đã cập nhật thành công link SmartLink cho bản phát hành!';
        notice.style.display = 'block';
      }
    });
  });

  // Delete release / Approve takedown
  releasesBox.querySelectorAll('[data-delete-release]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const releaseId = e.target.dataset.deleteRelease;
      if (!confirm('Bạn có chắc chắn muốn duyệt gỡ và xóa vĩnh viễn bản phát hành này khỏi hệ thống?')) return;

      btn.disabled = true;
      btn.textContent = 'Đang xóa...';

      const { error: delErr } = await supabase
        .from('releases')
        .delete()
        .eq('id', releaseId);

      if (delErr) {
        alert('Lỗi khi xóa release: ' + delErr.message);
        btn.disabled = false;
        btn.textContent = '🗑 Xóa bản phát hành này';
      } else {
        notice.textContent = '✓ Đã duyệt gỡ & xóa bản phát hành thành công khỏi Supabase!';
        notice.style.display = 'block';
        loadReleasesQueue();
      }
    });
  });
}

function attachArticleUploadEvents() {
  document.querySelectorAll('[data-article-upload]').forEach(input => {
    input.addEventListener('change', async (e) => {
      const idx = e.target.dataset.articleUpload;
      const file = e.target.files[0];
      if (!file) return;

      const statusEl = document.querySelector(`#cover-status-${idx}`);
      const inputEl = document.querySelector(`#cover-input-${idx}`);

      if (statusEl) {
        statusEl.textContent = `Đang tải lên ảnh: ${file.name}...`;
        statusEl.style.display = 'block';
      }

      try {
        const publicUrl = await uploadArtworkFile(file, `article_${Date.now()}`);
        if (inputEl) inputEl.value = publicUrl;
        if (statusEl) statusEl.textContent = `✓ Đã upload thành công ảnh bìa bài viết!`;
      } catch (err) {
        alert('Lỗi tải ảnh lên: ' + err.message);
        if (statusEl) statusEl.textContent = `Lỗi upload: ${err.message}`;
      }
    });
  });
}

function render() {
  ['tagline', 'heroText', 'aboutTitle', 'aboutText', 'city'].forEach(k => {
    if (form.elements[k]) form.elements[k].value = data[k] || '';
  });

  renderEmailsEditor(data.emails || defaultData.emails);
  artistsBox.innerHTML = data.artists.map(artistEditor).join('');
  articlesBox.innerHTML = data.articles.map(articleEditor).join('');
  attachArticleUploadEvents();
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
    instagram: '',
    youtube: '',
    tiktok: '',
    monthlyStreams: '0',
    estimatedRevenue: '0',
    payableBalance: '0'
  });
  render();
});

document.querySelector('#add-article')?.addEventListener('click', () => {
  data.articles.unshift({
    id: 'bai-viet-' + Date.now().toString(36),
    date: '08.2026',
    category: 'News',
    title: 'Bài viết mới',
    cover: '',
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
  saveBtn.textContent = 'Đang lưu...';

  ['tagline', 'heroText', 'aboutTitle', 'aboutText', 'city'].forEach(k => {
    if (form.elements[k]) data[k] = form.elements[k].value.trim();
  });

  // Read dynamic emails list
  const collectedEmails = [];
  document.querySelectorAll('.custom-email-row').forEach(row => {
    const label = row.querySelector('.email-row-label')?.value.trim();
    const email = row.querySelector('.email-row-value')?.value.trim();
    if (label && email) {
      collectedEmails.push({ label, email });
    }
  });

  data.emails = collectedEmails.length > 0 ? collectedEmails : defaultData.emails;
  data.email = data.emails[0]?.email || 'hello@uniflowslabel.com';

  data.artists = readItems('[data-artist]', 'artist');
  data.articles = readItems('[data-article]', 'article');

  const success = await saveData(data);

  saveBtn.disabled = false;
  saveBtn.textContent = 'Lưu toàn bộ lên Supabase';

  if (success) {
    notice.textContent = '✓ Đã lưu toàn bộ dữ liệu thành công!';
    notice.style.display = 'block';
    scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    alert('Có lỗi khi lưu. Vui lòng kiểm tra lại cấu hình kết nối.');
  }
};

document.querySelector('#logout')?.addEventListener('click', async () => {
  if (isSupabaseConfigured()) {
    await supabase.auth.signOut();
  }
  sessionStorage.removeItem('uniflows-admin');
  sessionStorage.removeItem('uniflows-user-email');
  location.href = 'login';
});

render();
