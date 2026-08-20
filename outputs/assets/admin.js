import { getData, saveData, defaultData } from './data.js';
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

function showNotice(msg) {
  if (!notice) return;
  notice.textContent = msg;
  notice.style.display = 'block';
  scrollTo({ top: 0, behavior: 'smooth' });
}

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
    <input class="email-row-label" placeholder="Tên phòng ban / Nhãn" style="width:240px;padding:10px;border:1px solid var(--ink);">
    <input class="email-row-value" placeholder="email@uniflowslabel.com" style="flex:1;padding:10px;border:1px solid var(--ink);">
    <button type="button" class="remove-email-btn button alt" style="padding:10px 14px;">✕</button>
  `;
  emailsContainer.appendChild(row);
  row.querySelector('.remove-email-btn').onclick = () => row.remove();
});

function artistEditor(a, i) {
  return `
    <div class="item-editor" data-artist="${i}" data-artist-id="${esc(a.id)}" style="border: 1px solid var(--ink); padding: 18px; margin-bottom: 20px;">
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
      <h4 style="margin: 15px 0 5px; font-size: 15px; text-transform: uppercase;">Doanh thu nghệ sĩ</h4>
      <div class="mini-grid">
        <div class="field"><label>Monthly Streams</label><input data-key="monthlyStreams" value="${esc(a.monthlyStreams || '0')}"></div>
        <div class="field"><label>Doanh thu ước tính (₫)</label><input data-key="estimatedRevenue" value="${esc(a.estimatedRevenue || '0')}"></div>
        <div class="field"><label>Số dư khả dụng (₫)</label><input data-key="payableBalance" value="${esc(a.payableBalance || '0')}"></div>
      </div>
      <div class="field" style="margin-top:10px;"><label>Sản phẩm (mỗi dòng: Tên | Loại | Nền tảng=URL)</label><textarea data-key="products" rows="3">${(a.products || []).map(p => `${p.title} | ${p.type} | ${Object.entries(p.links || { Spotify: p.url || '#' }).map(([n, u]) => `${n}=${u}`).join(', ')}`).join('\n')}</textarea></div>
      <button class="button alt remove" type="button" data-remove-artist="${i}" style="margin-top:10px;">Xóa nghệ sĩ này</button>
    </div>
  `;
}

function articleEditor(a, i) {
  return `
    <div class="item-editor" data-article="${i}" data-article-id="${esc(a.id)}" style="border: 1px solid var(--ink); padding: 18px; margin-bottom: 20px;">
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
        <label>Ảnh bìa bài viết <span style="font-weight:normal;font-size:11px;opacity:0.75;">(Dán URL hoặc tải lên file)</span></label>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <input data-key="cover" id="cover-input-${i}" value="${esc(a.cover || '')}" placeholder="Dán link ảnh https://..." style="flex:1;min-width:250px;">
          <label class="button alt" style="cursor:pointer;white-space:nowrap;margin:0;padding:12px;font-size:11px;">
            📁 Chọn file ảnh
            <input type="file" data-article-upload="${i}" accept="image/*" style="display:none;">
          </label>
        </div>
        <small id="cover-status-${i}" style="color:var(--accent,#507000);font-size:12px;margin-top:4px;display:none;"></small>
      </div>
      <div class="field"><label>Tóm tắt</label><textarea data-key="excerpt" rows="2">${a.excerpt || ''}</textarea></div>
      <div class="field"><label>Nội dung đầy đủ</label><textarea data-key="body" rows="6">${a.body || ''}</textarea></div>
      <label class="kicker"><input data-key="published" type="checkbox" ${a.published ? 'checked' : ''}> Xuất bản công khai</label>
      <br><br>
      <button class="button alt remove" type="button" data-remove-article="${i}">Xóa bài viết này</button>
    </div>
  `;
}

async function loadReleasesQueue() {
  if (!releasesBox) return;
  if (!isSupabaseConfigured()) {
    releasesBox.innerHTML = '<p class="portal-note">Chế độ Demo.</p>';
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
        <div class="item-editor" data-release-card="${r.id}" style="border:1px solid ${isTakedown ? '#ff4d4f' : '#999'};padding:18px;margin-bottom:20px;background:${isTakedown ? '#fffafa' : '#fff'};">
          ${isTakedown ? `<div style="background:#fff2f0;border:1px solid #ffccc7;padding:10px 14px;margin-bottom:12px;color:#cf1322;font-size:13px;font-weight:bold;">⚠️ NGHỆ SĨ ĐANG YÊU CẦU GỠ BẢN PHÁT HÀNH NÀY.</div>` : ''}
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
            <div>
              <h3 style="margin:0 0 5px;font-size:22px;">${esc(r.title)}</h3>
              <strong>Nghệ sĩ: ${esc(r.artists?.name || r.artist_id)}</strong> · <em>${esc(r.type || 'Single')}</em>
              <br><small style="opacity:0.8">Ngày: ${esc(r.release_date || 'N/A')} · Thể loại: ${esc(r.genre || '')}</small>
            </div>
            <div>
              <label style="font-size:11px;text-transform:uppercase;display:block;margin-bottom:4px;">Trạng thái:</label>
              <select data-release-status="${r.id}" style="padding:8px;border:1px solid ${isTakedown ? '#ff4d4f' : '#000'};font-weight:600;">
                <option ${r.submission_status === 'Đang chờ UniFLOWs duyệt' ? 'selected' : ''}>Đang chờ UniFLOWs duyệt</option>
                <option ${r.submission_status === 'Đã duyệt / Chuẩn bị phân phối' ? 'selected' : ''}>Đã duyệt / Chuẩn bị phân phối</option>
                <option ${r.submission_status === 'Đã phát hành' ? 'selected' : ''}>Đã phát hành</option>
                <option ${r.submission_status === 'Từ chối / Cần chỉnh sửa metadata' ? 'selected' : ''}>Từ chối / Cần chỉnh sửa metadata</option>
                <option ${isTakedown ? 'selected' : ''}>Yêu cầu gỡ / xóa bản phát hành</option>
              </select>
            </div>
          </div>
          <div style="margin:15px 0;background:#f3f3f3;padding:14px;border-radius:4px;">
            <div style="display:flex;gap:15px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">
              ${r.artwork_url ? `<img src="${esc(r.artwork_url)}" alt="Artwork" style="width:60px;height:60px;object-fit:cover;border-radius:4px;border:1px solid #ccc;">` : ''}
              <div style="flex:1;min-width:220px;">
                ${r.audio_url ? `
                  <audio controls preload="none" src="${esc(r.audio_url)}" style="width:100%;height:36px;margin-bottom:6px;"></audio>
                  <div style="display:flex;gap:12px;font-size:12px;font-weight:600;">
                    <a href="${r.audio_url}" target="_blank" style="color:#0066cc;">📥 Tải / Mở File Master Audio ↗</a>
                    ${r.artwork_url ? `<a href="${r.artwork_url}" target="_blank" style="color:#0066cc;">🖼 Xem Artwork Gốc ↗</a>` : ''}
                  </div>
                ` : '<span style="opacity:0.6;font-size:12px;">Chưa có file Master Audio</span>'}
              </div>
            </div>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;border-top:1px solid #e0e0e0;padding-top:10px;">
              <a href="/listen/${encodeURIComponent(releaseSlug)}" target="_blank" style="font-weight:700;color:#008800;font-size:13px;">🔗 Mở SmartLink: /listen/${releaseSlug} ↗</a>
              <button type="button" data-copy-link="listen/${encodeURIComponent(releaseSlug)}" class="button alt" style="padding:5px 10px;font-size:11px;margin:0;">📋 Copy link: /listen/${releaseSlug}</button>
              <button type="button" data-copy-link="l/${encodeURIComponent(releaseSlug)}" class="button alt" style="padding:5px 10px;font-size:11px;margin:0;">📋 Copy link siêu ngắn: /l/${releaseSlug}</button>
            </div>
          </div>
          <h4 style="margin:12px 0 6px;font-size:14px;text-transform:uppercase;">Link nền tảng streaming (SmartLink)</h4>
          <div class="mini-grid">
            <div class="field"><label>Spotify</label><input data-dsp="spotify" value="${esc(links.spotify || '')}" placeholder="https://open.spotify.com/track/..."></div>
            <div class="field"><label>Apple Music</label><input data-dsp="apple" value="${esc(links.apple || '')}" placeholder="https://music.apple.com/..."></div>
            <div class="field"><label>YouTube Music</label><input data-dsp="youtube" value="${esc(links.youtube || '')}" placeholder="https://music.youtube.com/..."></div>
            <div class="field"><label>Zing MP3</label><input data-dsp="zingmp3" value="${esc(links.zingmp3 || '')}" placeholder="https://zingmp3.vn/..."></div>
            <div class="field"><label>Nhaccuatui (NCT)</label><input data-dsp="nct" value="${esc(links.nct || '')}" placeholder="https://www.nhaccuatui.com/..."></div>
            <div class="field"><label>SoundCloud</label><input data-dsp="soundcloud" value="${esc(links.soundcloud || '')}" placeholder="https://soundcloud.com/..."></div>
          </div>
          <div style="margin-top:12px;">
            <label style="font-size:11px;text-transform:uppercase;font-weight:bold;display:block;margin-bottom:6px;">Nền tảng khác (tự đặt tên):</label>
            <div class="custom-dsp-container" data-custom-dsp-for="${r.id}">
              ${customLinks.map(([name, url]) => `
                <div class="custom-dsp-row" style="display:flex;gap:10px;margin-bottom:8px;align-items:center;">
                  <input class="custom-dsp-name" value="${esc(name)}" placeholder="Tên nền tảng" style="width:180px;padding:8px;font-size:13px;border:1px solid #aaa;">
                  <input class="custom-dsp-url" value="${esc(url)}" placeholder="https://..." style="flex:1;padding:8px;font-size:13px;border:1px solid #aaa;">
                  <button type="button" class="remove-dsp-row button alt" style="padding:7px 10px;font-size:11px;">✕</button>
                </div>`).join('')}
            </div>
            <button type="button" class="button alt add-custom-dsp-btn" data-add-dsp-to="${r.id}" style="padding:6px 12px;font-size:11px;margin-top:4px;">+ Thêm nền tảng khác</button>
          </div>
          <h4 style="margin:16px 0 6px;font-size:14px;text-transform:uppercase;color:#b45309;">📊 Doanh thu, Streams & Playlists cho bài hát này (Hiện trên Portal)</h4>
          <div class="mini-grid">
            <div class="field">
              <label>Lượt streams bài này</label>
              <input data-rel-streams="${r.id}" value="${esc(r.metadata?.streams || '0')}" placeholder="Ví dụ: 125,400 hoặc 125.4K">
            </div>
            <div class="field">
              <label>Doanh thu bài này (₫)</label>
              <input data-rel-revenue="${r.id}" value="${esc(r.metadata?.revenue || '0')}" placeholder="Ví dụ: 6,800,000">
            </div>
          </div>
          <div class="field" style="margin-top:6px;">
            <label>Playlists & Thành tích đạt được (mỗi dòng một playlist - sẽ hiện huy hiệu trên Portal nghệ sĩ)</label>
            <textarea data-rel-playlists="${r.id}" rows="2" placeholder="Spotify · RADAR Vietnam&#10;Apple Music · V-Pop Không Thể Bỏ Lỡ&#10;Zing MP3 · Top 100 V-Pop">${(Array.isArray(r.metadata?.playlists) ? r.metadata.playlists : []).join('\n')}</textarea>
          </div>

          <div style="display:flex;justify-content:space-between;margin-top:15px;align-items:center;border-top:1px solid #eee;padding-top:12px;">
            <button class="button" type="button" data-save-release-links="${r.id}" style="padding:10px 14px;font-size:11px;">Lưu toàn bộ SmartLink, Doanh thu & Playlists</button>
            <button class="button alt remove" type="button" data-delete-release="${r.id}" style="padding:10px 14px;font-size:11px;${isTakedown ? 'background:#ff4d4f;color:#fff;' : ''}">
              ${isTakedown ? '🗑 Duyệt gỡ & Xóa vĩnh viễn' : '🗑 Xóa bản phát hành này'}
            </button>
          </div>
        </div>`;
    }).join('');
    attachReleaseEvents();
  } catch (err) {
    releasesBox.innerHTML = `<p class="empty">Lỗi tải releases: ${err.message}</p>`;
  }
}

function attachReleaseEvents() {
  releasesBox.querySelectorAll('[data-copy-link]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const path = e.target.dataset.copyLink;
      const fullUrl = `${location.origin}/${path}`;
      try {
        await navigator.clipboard.writeText(fullUrl);
        btn.textContent = '✓ Đã chép';
        setTimeout(() => btn.textContent = '📋 Copy link', 2000);
      } catch {
        prompt('Copy link:', fullUrl);
      }
    });
  });

  releasesBox.querySelectorAll('.add-custom-dsp-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const container = releasesBox.querySelector(`[data-custom-dsp-for="${e.target.dataset.addDspTo}"]`);
      if (!container) return;
      const row = document.createElement('div');
      row.className = 'custom-dsp-row';
      row.style.cssText = 'display:flex;gap:10px;margin-bottom:8px;align-items:center;';
      row.innerHTML = `
        <input class="custom-dsp-name" placeholder="Tên nền tảng" style="width:180px;padding:8px;font-size:13px;border:1px solid #aaa;">
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

  releasesBox.querySelectorAll('[data-release-status]').forEach(select => {
    select.addEventListener('change', async (e) => {
      const { error } = await supabase.from('releases').update({ submission_status: e.target.value }).eq('id', e.target.dataset.releaseStatus);
      if (error) alert('Lỗi: ' + error.message);
      else { showNotice(`✓ Cập nhật trạng thái: "${e.target.value}"`); loadReleasesQueue(); }
    });
  });

  releasesBox.querySelectorAll('[data-save-release-links]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const releaseId = e.target.dataset.saveReleaseLinks;
      const card = releasesBox.querySelector(`[data-release-card="${releaseId}"]`);
      if (!card) return;
      const links = {};
      card.querySelectorAll('[data-dsp]').forEach(input => { if (input.value.trim()) links[input.dataset.dsp] = input.value.trim(); });
      card.querySelectorAll('.custom-dsp-row').forEach(row => {
        const name = row.querySelector('.custom-dsp-name')?.value.trim();
        const url = row.querySelector('.custom-dsp-url')?.value.trim();
        if (name && url) links[name] = url;
      });

      const streams = card.querySelector(`[data-rel-streams="${releaseId}"]`)?.value.trim() || '0';
      const revenue = card.querySelector(`[data-rel-revenue="${releaseId}"]`)?.value.trim() || '0';
      const rawPlaylists = card.querySelector(`[data-rel-playlists="${releaseId}"]`)?.value || '';
      const playlists = rawPlaylists.split('\n').map(s => s.trim()).filter(Boolean);

      const rel = releases.find(r => r.id === releaseId) || {};
      const currentMeta = (typeof rel.metadata === 'object' && rel.metadata) ? rel.metadata : {};
      const updatedMeta = {
        ...currentMeta,
        streams,
        revenue,
        playlists
      };

      btn.disabled = true; btn.textContent = 'Đang lưu...';
      const { error } = await supabase.from('releases').update({
        links,
        metadata: updatedMeta
      }).eq('id', releaseId);
      btn.disabled = false; btn.textContent = 'Lưu toàn bộ SmartLink, Doanh thu & Playlists';
      if (error) alert('Lỗi: ' + error.message);
      else showNotice('✓ Đã lưu thành công link SmartLink, Doanh thu và Playlists cho bài hát!');
    });
  });

  releasesBox.querySelectorAll('[data-delete-release]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('Xóa vĩnh viễn bản phát hành này?')) return;
      btn.disabled = true; btn.textContent = 'Đang xóa...';
      const { error } = await supabase.from('releases').delete().eq('id', e.target.dataset.deleteRelease);
      if (error) { alert('Lỗi: ' + error.message); btn.disabled = false; btn.textContent = '🗑 Xóa'; }
      else { showNotice('✓ Đã xóa bản phát hành!'); loadReleasesQueue(); }
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
      if (statusEl) { statusEl.textContent = `Đang tải lên ảnh...`; statusEl.style.display = 'block'; }
      try {
        const publicUrl = await uploadArtworkFile(file, `article_${Date.now()}`);
        if (inputEl) inputEl.value = publicUrl;
        if (statusEl) statusEl.textContent = `✓ Đã upload ảnh bìa thành công!`;
      } catch (err) {
        if (statusEl) statusEl.textContent = `Lỗi: ${err.message}`;
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
  data.artists.push({ id: 'artist-' + Date.now().toString(36), name: 'Nghệ sĩ mới', genre: 'Pop', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=85', bio: '', products: [], instagram: '', youtube: '', tiktok: '', monthlyStreams: '0', estimatedRevenue: '0', payableBalance: '0' });
  render();
});

document.querySelector('#add-article')?.addEventListener('click', () => {
  data.articles.unshift({ id: 'bai-viet-' + Date.now().toString(36), date: '08.2026', category: 'News', title: 'Bài viết mới', cover: '', excerpt: '', body: '', published: true });
  render();
});

// Xóa nghệ sĩ và bài viết trực tiếp trên Supabase
document.addEventListener('click', async e => {
  const removeArtistIdx = e.target.dataset.removeArtist;
  if (removeArtistIdx !== undefined) {
    const artistEl = e.target.closest('[data-artist]');
    const artistId = artistEl?.dataset.artistId;
    if (!confirm(`Bạn có chắc muốn xóa nghệ sĩ "${artistId}" và toàn bộ dữ liệu liên quan?`)) return;
    
    if (isSupabaseConfigured() && artistId) {
      e.target.disabled = true;
      e.target.textContent = 'Đang xóa...';
      const { error } = await supabase.from('artists').delete().eq('id', artistId);
      if (error) {
        alert('Lỗi khi xóa nghệ sĩ trên Supabase: ' + error.message);
        e.target.disabled = false;
        e.target.textContent = 'Xóa nghệ sĩ này';
        return;
      }
    }
    data.artists.splice(+removeArtistIdx, 1);
    await saveData(data);
    showNotice(`✓ Đã xóa nghệ sĩ thành công!`);
    render();
  }

  const removeArticleIdx = e.target.dataset.removeArticle;
  if (removeArticleIdx !== undefined) {
    const articleEl = e.target.closest('[data-article]');
    const articleId = articleEl?.dataset.articleId;
    if (!confirm(`Bạn có chắc muốn xóa bài viết này?`)) return;

    if (isSupabaseConfigured() && articleId) {
      e.target.disabled = true;
      e.target.textContent = 'Đang xóa...';
      const { error } = await supabase.from('articles').delete().eq('id', articleId);
      if (error) {
        alert('Lỗi khi xóa bài viết trên Supabase: ' + error.message);
        e.target.disabled = false;
        e.target.textContent = 'Xóa bài viết này';
        return;
      }
    }
    data.articles.splice(+removeArticleIdx, 1);
    await saveData(data);
    showNotice(`✓ Đã xóa bài viết thành công!`);
    render();
  }
});

form.onsubmit = async e => {
  e.preventDefault();
  saveBtn.disabled = true;
  saveBtn.textContent = 'Đang lưu...';

  ['tagline', 'heroText', 'aboutTitle', 'aboutText', 'city'].forEach(k => {
    if (form.elements[k]) data[k] = form.elements[k].value.trim();
  });

  const collectedEmails = [];
  document.querySelectorAll('.custom-email-row').forEach(row => {
    const label = row.querySelector('.email-row-label')?.value.trim();
    const email = row.querySelector('.email-row-value')?.value.trim();
    if (label && email) collectedEmails.push({ label, email });
  });
  data.emails = collectedEmails.length > 0 ? collectedEmails : defaultData.emails;
  data.email = data.emails[0]?.email || 'hello@uniflowslabel.com';

  data.artists = readItems('[data-artist]', 'artist');
  data.articles = readItems('[data-article]', 'article');

  const success = await saveData(data);
  saveBtn.disabled = false;
  saveBtn.textContent = 'Lưu toàn bộ lên Supabase';

  if (success) { showNotice('✓ Đã lưu toàn bộ dữ liệu thành công!'); }
  else { alert('Có lỗi khi lưu. Vui lòng kiểm tra lại.'); }
};

document.querySelector('#logout')?.addEventListener('click', async () => {
  if (isSupabaseConfigured()) await supabase.auth.signOut();
  sessionStorage.removeItem('uniflows-admin');
  sessionStorage.removeItem('uniflows-user-email');
  location.href = 'login';
});

render();
