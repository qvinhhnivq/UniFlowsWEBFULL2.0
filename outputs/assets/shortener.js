// ============================================================================
// UNIFLOWS CUSTOM SHORTURL & REDIRECTION ENGINE
// ============================================================================
import { getData, saveData, defaultData } from './data.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const slugify = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '');

export async function initShortener() {
  const root = document.querySelector('[data-shortener-page]') || document.body;
  if (!root) return;

  // 1. Check if user is navigating to a shortlink slug: e.g. /s/demo or ?s=demo
  const q = new URLSearchParams(location.search);
  const rawPath = decodeURIComponent(location.pathname).replace(/^\/+|\/+$/g, '');
  const parts = rawPath.split('/').filter(Boolean);

  let targetSlug = q.get('s') || q.get('slug') || q.get('alias') || q.get('to') || q.get('r') || q.get('go') || '';

  if (!targetSlug && parts.length > 0) {
    const firstPart = parts[0].toLowerCase().replace(/\.html$/i, '');
    if (['s', 'go', 'r', 'link', 'short'].includes(firstPart)) {
      if (parts.length >= 2) {
        targetSlug = parts[1];
      }
    }
  }

  if (targetSlug) {
    targetSlug = slugify(targetSlug.replace(/\.html$/i, '').trim());
  }

  const liveData = await getData();
  const shortlinks = liveData.shortlinks || defaultData.shortlinks || [];
  const artists = liveData.artists || defaultData.artists || [];

  // 2. If a slug is requested, perform instant resolver & redirect
  if (targetSlug) {
    let matchedItem = shortlinks.find(x => slugify(x.slug) === targetSlug);
    let targetUrl = '';
    let targetTitle = '';

    if (matchedItem) {
      targetUrl = matchedItem.targetUrl;
      targetTitle = matchedItem.title || matchedItem.slug;
      
      // Increment clicks
      matchedItem.clicks = (matchedItem.clicks || 0) + 1;
      saveData(liveData);
    } else {
      // Check in releases list
      for (const a of artists) {
        const prods = a.products || [];
        const matchedRel = prods.find(p => slugify(p.slug || p.title) === targetSlug || p.id === targetSlug);
        if (matchedRel) {
          targetUrl = `${location.origin}/listen?release=${encodeURIComponent(matchedRel.slug || slugify(matchedRel.title))}`;
          targetTitle = `SmartLink: ${a.name} — ${matchedRel.title}`;
          break;
        }
      }
      
      // Check in artists list
      if (!targetUrl) {
        const matchedArt = artists.find(a => slugify(a.id) === targetSlug || slugify(a.name) === targetSlug);
        if (matchedArt) {
          targetUrl = `${location.origin}/artist?id=${encodeURIComponent(matchedArt.id)}`;
          targetTitle = `Hồ sơ Nghệ sĩ: ${matchedArt.name}`;
        }
      }
    }

    if (targetUrl) {
      renderRedirectingScreen(root, targetTitle, targetUrl);
      setTimeout(() => {
        window.location.replace(targetUrl);
      }, 400);
      return;
    } else {
      renderShortlinkNotFound(root, targetSlug);
      return;
    }
  }

  // 3. If no slug, render the standalone ShortURL Generator Tool (Like ShortURL.at)
  renderShortenerTool(root, liveData);
}

function renderRedirectingScreen(root, title, url) {
  root.innerHTML = `
    <div style="min-height:100vh;background:#090a0f;color:#fff;display:flex;align-items:center;justify-content:center;padding:20px;font-family:'Space Grotesk',sans-serif;">
      <div style="background:rgba(20,20,24,0.7);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.15);border-radius:24px;padding:36px 28px;text-align:center;max-width:440px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.8);">
        <div style="width:48px;height:48px;border:3px solid rgba(255,255,255,0.2);border-top-color:#d8ff48;border-radius:50%;margin:0 auto 20px;animation:spin 0.8s linear infinite;"></div>
        <span style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1.5px;color:#d8ff48;text-transform:uppercase;font-weight:700;">UNIFLOWS SHORTLINK</span>
        <h2 style="font-size:22px;margin:12px 0 6px;letter-spacing:-0.03em;color:#fff;">Đang chuyển hướng...</h2>
        <p style="font-size:13px;color:rgba(255,255,255,0.6);margin:0 0 20px;word-break:break-all;">${esc(title)}</p>
        <a href="${esc(url)}" style="display:inline-block;padding:10px 22px;background:#ffffff;color:#000000;border-radius:20px;font-size:11px;font-weight:800;font-family:'DM Mono',monospace;text-transform:uppercase;text-decoration:none;">Bấm vào đây nếu không tự chuyển</a>
      </div>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg);}}</style>
  `;
}

function renderShortlinkNotFound(root, slug) {
  root.innerHTML = `
    <div style="min-height:100vh;background:#090a0f;color:#fff;display:flex;align-items:center;justify-content:center;padding:20px;font-family:'Space Grotesk',sans-serif;">
      <div style="background:rgba(20,20,24,0.7);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.15);border-radius:24px;padding:36px 28px;text-align:center;max-width:440px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.8);">
        <a href="/" style="font-weight:900;letter-spacing:-0.04em;color:#ffffff;text-decoration:none;font-size:16px;">UNIFLOWs</a>
        <h1 style="font-size:52px;letter-spacing:-0.05em;color:#fff;margin:24px 0 8px;font-weight:900;">404</h1>
        <strong style="font-size:15px;color:#fff;display:block;">Không tìm thấy link rút gọn "/s/${esc(slug)}"</strong>
        <p style="font-size:13px;color:rgba(255,255,255,0.6);margin:8px auto 24px;max-width:320px;">Đường link có thể đã hết hạn hoặc bạn nhập chưa chính xác.</p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <a href="/s" style="padding:11px 22px;background:#d8ff48;color:#000;border-radius:20px;font-size:11px;font-weight:800;font-family:'DM Mono',monospace;text-transform:uppercase;text-decoration:none;">Tạo Link Mới</a>
          <a href="/" style="padding:11px 22px;background:rgba(255,255,255,0.1);color:#fff;border-radius:20px;font-size:11px;font-weight:800;font-family:'DM Mono',monospace;text-transform:uppercase;text-decoration:none;">Về Trang Chủ</a>
        </div>
      </div>
    </div>
  `;
}

function renderShortenerTool(root, liveData) {
  const shortlinks = liveData.shortlinks || defaultData.shortlinks || [];
  const origin = location.origin;

  root.innerHTML = `
    <div style="min-height:100vh;background:#090a0f;color:#fff;padding:40px 20px 80px;font-family:'Space Grotesk',-apple-system,sans-serif;">
      
      <div style="max-width:680px;margin:0 auto;">
        
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:36px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.12);">
          <a href="/" style="font-weight:900;letter-spacing:-0.04em;color:#ffffff;text-decoration:none;font-size:18px;">UNIFLOWs</a>
          <span style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;color:#d8ff48;background:rgba(216,255,72,0.1);border:1px solid rgba(216,255,72,0.3);padding:4px 12px;border-radius:20px;text-transform:uppercase;font-weight:700;">URL SHORTENER</span>
        </div>

        <!-- Hero Box -->
        <div style="text-align:center;margin-bottom:36px;">
          <h1 style="font-size:clamp(28px, 6vw, 42px);font-weight:900;letter-spacing:-0.04em;margin:0 0 10px;line-height:1.1;">Trình Rút Gọn Link UniFLOWs</h1>
          <p style="font-size:14px;color:rgba(255,255,255,0.65);margin:0;max-width:500px;margin:0 auto;line-height:1.5;">Tạo liên kết ngắn dạng <b>${origin}/s/ten-link</b> chuyên nghiệp cho bài hát, nghệ sĩ, chiến dịch truyền thông và tạo mã QR Code tức thì.</p>
        </div>

        <!-- Main Form Card -->
        <div style="background:rgba(20,20,24,0.7);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.15);border-radius:24px;padding:32px 24px;box-shadow:0 30px 70px rgba(0,0,0,0.8);margin-bottom:36px;">
          <form id="shortener-create-form" style="display:grid;gap:18px;">
            
            <div>
              <label style="display:block;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.7);margin-bottom:8px;font-weight:700;">1. Nhập URL Gốc Cần Rút Gọn *</label>
              <input type="url" id="short-target-input" required placeholder="https://uniflowslabel.com/listen?release=vet-sang hoặc https://open.spotify.com/..." style="width:100%;padding:14px 16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);border-radius:12px;color:#fff;font-size:14px;outline:none;">
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <label style="display:block;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.7);margin-bottom:8px;font-weight:700;">2. Bí danh / Slug Viết Tắt *</label>
                <div style="display:flex;align-items:center;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);border-radius:12px;overflow:hidden;">
                  <span style="font-family:'DM Mono',monospace;font-size:12px;color:rgba(255,255,255,0.4);padding-left:12px;">/s/</span>
                  <input type="text" id="short-slug-input" required placeholder="vetsang" style="flex:1;padding:14px 12px;background:transparent;border:none;color:#fff;font-size:14px;outline:none;font-weight:700;">
                </div>
              </div>

              <div>
                <label style="display:block;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.7);margin-bottom:8px;font-weight:700;">3. Tên Ghi Chú Chiến Dịch</label>
                <input type="text" id="short-title-input" placeholder="Single Vệt Sáng (Spotify Promo)" style="width:100%;padding:14px 16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);border-radius:12px;color:#fff;font-size:14px;outline:none;">
              </div>
            </div>

            <button type="submit" id="btn-submit-shorten" style="padding:15px;background:#d8ff48;color:#000000;border:none;border-radius:14px;font-family:'DM Mono',monospace;font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:900;cursor:pointer;margin-top:6px;box-shadow:0 6px 20px rgba(216,255,72,0.25);transition:transform 0.15s ease;">
              ⚡ TẠO LINK RÚT GỌN NGAY
            </button>
          </form>

          <!-- Result Output Box (Hidden initially) -->
          <div id="shortener-result-box" style="display:none;margin-top:24px;padding-top:24px;border-top:1px dashed rgba(255,255,255,0.2);">
            <div style="background:rgba(216,255,72,0.08);border:1px solid rgba(216,255,72,0.3);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:14px;">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <div>
                  <span style="font-family:'DM Mono',monospace;font-size:11px;color:#d8ff48;text-transform:uppercase;font-weight:700;display:block;">✓ Link Rút Gọn Của Bạn:</span>
                  <a id="res-short-link" href="#" target="_blank" style="font-size:18px;color:#ffffff;font-weight:900;text-decoration:underline;letter-spacing:-0.02em;"></a>
                </div>
                <button type="button" id="btn-copy-short-link" style="padding:10px 20px;background:#ffffff;color:#000000;border:none;border-radius:10px;font-family:'DM Mono',monospace;font-size:11px;font-weight:900;cursor:pointer;text-transform:uppercase;">
                  SAO CHÉP LINK
                </button>
              </div>

              <!-- QR Code Preview -->
              <div style="display:flex;align-items:center;gap:16px;background:rgba(0,0,0,0.3);padding:14px;border-radius:12px;">
                <img id="res-qr-img" src="" alt="QR Code" style="width:75px;height:75px;border-radius:8px;background:#fff;padding:4px;">
                <div style="flex:1;">
                  <strong style="font-size:13px;color:#fff;display:block;">Mã QR Code Chính Thức</strong>
                  <span style="font-size:11px;color:rgba(255,255,255,0.6);display:block;margin-bottom:6px;">Quét để mở trực tiếp trên di động hoặc tải về in ấn</span>
                  <a id="res-download-qr-btn" href="#" download="uniflows-qr.png" target="_blank" style="font-family:'DM Mono',monospace;font-size:11px;color:#d8ff48;text-decoration:underline;">Tải ảnh QR Code ↓</a>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Recent Shortlinks Table -->
        <div>
          <h3 style="font-size:16px;font-weight:800;letter-spacing:-0.02em;margin:0 0 14px;color:#fff;">Danh sách Link Rút Gọn Đã Tạo</h3>
          <div style="display:grid;gap:10px;">
            ${shortlinks.map(item => `
              <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <div>
                  <strong style="font-size:14px;color:#fff;display:block;">${esc(item.title || item.slug)}</strong>
                  <div style="display:flex;gap:12px;align-items:center;margin-top:3px;">
                    <a href="/s/${encodeURIComponent(item.slug)}" target="_blank" style="font-family:'DM Mono',monospace;font-size:12px;color:#d8ff48;font-weight:700;">/s/${esc(item.slug)}</a>
                    <span style="font-size:11px;color:rgba(255,255,255,0.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px;">➔ ${esc(item.targetUrl)}</span>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <span style="font-family:'DM Mono',monospace;font-size:11px;color:rgba(255,255,255,0.6);background:rgba(255,255,255,0.08);padding:4px 8px;border-radius:6px;">
                    ${(item.clicks || 0).toLocaleString('vi-VN')} clicks
                  </span>
                  <button type="button" class="btn-copy-item-link" data-url="${origin}/s/${encodeURIComponent(item.slug)}" style="padding:6px 12px;background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:8px;font-size:11px;font-family:'DM Mono',monospace;cursor:pointer;">
                    Copy
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

    </div>
  `;

  // Attach Form Submit
  const form = root.querySelector('#shortener-create-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const targetUrl = root.querySelector('#short-target-input').value.trim();
    let rawSlug = root.querySelector('#short-slug-input').value.trim();
    const title = root.querySelector('#short-title-input').value.trim() || rawSlug;
    const cleanSlug = slugify(rawSlug || Date.now().toString(36));

    const submitBtn = root.querySelector('#btn-submit-shorten');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang tạo link...';

    try {
      const existingIdx = (liveData.shortlinks || []).findIndex(x => slugify(x.slug) === cleanSlug);
      const newShortItem = {
        id: `short-${Date.now()}`,
        slug: cleanSlug,
        targetUrl,
        title,
        clicks: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };

      if (!liveData.shortlinks) liveData.shortlinks = [];
      if (existingIdx >= 0) {
        liveData.shortlinks[existingIdx] = newShortItem;
      } else {
        liveData.shortlinks.unshift(newShortItem);
      }

      await saveData(liveData);

      // Display result box
      const fullShortUrl = `${origin}/s/${encodeURIComponent(cleanSlug)}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fullShortUrl)}`;

      const resBox = root.querySelector('#shortener-result-box');
      const resLink = root.querySelector('#res-short-link');
      const resQr = root.querySelector('#res-qr-img');
      const resDownloadQr = root.querySelector('#res-download-qr-btn');

      if (resBox && resLink && resQr) {
        resLink.href = fullShortUrl;
        resLink.textContent = fullShortUrl;
        resQr.src = qrUrl;
        if (resDownloadQr) resDownloadQr.href = qrUrl;
        resBox.style.display = 'block';
        resBox.scrollIntoView({ behavior: 'smooth' });
      }

      // Copy result button
      root.querySelector('#btn-copy-short-link').onclick = () => {
        navigator.clipboard?.writeText(fullShortUrl);
        const btn = root.querySelector('#btn-copy-short-link');
        btn.textContent = '✓ ĐÃ COPY!';
        btn.style.background = '#d8ff48';
        setTimeout(() => { btn.textContent = 'SAO CHÉP LINK'; btn.style.background = '#fff'; }, 2000);
      };

    } catch (err) {
      console.error('Error saving shortlink:', err);
      alert('Có lỗi khi tạo link rút gọn. Vui lòng thử lại.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '⚡ TẠO LINK RÚT GỌN NGAY';
    }
  });

  // Attach item copy buttons
  root.querySelectorAll('.btn-copy-item-link').forEach(btn => {
    btn.onclick = () => {
      const url = btn.dataset.url;
      navigator.clipboard?.writeText(url);
      const orig = btn.textContent;
      btn.textContent = '✓';
      btn.style.color = '#d8ff48';
      setTimeout(() => { btn.textContent = orig; btn.style.color = '#fff'; }, 1500);
    };
  });
}

// Auto boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initShortener());
} else {
  initShortener();
}
