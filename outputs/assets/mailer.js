// ============================================================================
// UNIFLOWS LABEL — EMAIL AUTOMATION ENGINE (DOMAIN CUSTOM EMAIL DISPATCHER)
// Hỗ trợ gửi email tự động từ domain riêng qua Brevo, Resend, Supabase Edge Function hoặc Webhook
// Thiết kế giao diện HTML Email Brutalism / Editorial đồng bộ với Homepage UniFLOWs
// ============================================================================

import { getSupabaseUrl, getSupabaseAnonKey } from './supabase.js';

export const DEFAULT_EMAIL_CONFIG = {
  enabled: false,
  provider: 'brevo', // 'brevo' (khuyên dùng trực tiếp từ Web) | 'resend' | 'supabase_edge' | 'custom_webhook'
  apiKey: '',
  senderEmail: 'notifications@uniflowslabel.com',
  senderName: 'UniFLOWs Record Label',
  supabaseEdgeUrl: '',
  webhookUrl: '',
  triggers: {
    onAccountCreated: true,     // Tự động gửi phiếu bàn giao khi cấp tài khoản
    onReleaseRevision: true,    // Tự động gửi khi có yêu cầu chỉnh sửa bài hát
    onReleaseRejected: true,    // Tự động gửi khi từ chối bản phát hành
    onReleaseApproved: true,    // Tự động gửi khi duyệt phát hành
    onDirectNotif: true,        // Tự động gửi khi gửi thông báo riêng cho nghệ sĩ
    onBroadcastNotif: true,     // Tự động gửi khi phát broadcast toàn bộ nghệ sĩ
    onPayoutUpdate: true        // Tự động gửi khi duyệt/từ chối rút tiền
  }
};

export function getEmailConfig() {
  try {
    const raw = localStorage.getItem('uniflows-email-config');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_EMAIL_CONFIG,
        ...parsed,
        triggers: { ...DEFAULT_EMAIL_CONFIG.triggers, ...(parsed.triggers || {}) }
      };
    }
  } catch {}
  return { ...DEFAULT_EMAIL_CONFIG };
}

export function saveEmailConfig(cfg) {
  try {
    localStorage.setItem('uniflows-email-config', JSON.stringify(cfg));
  } catch (e) {
    console.warn('Lỗi lưu cấu hình email:', e);
  }
}

// ----------------------------------------------------------------------------
// CORE DISPATCHER: GỬI EMAIL QUA PROVIDER ĐÃ CHỌN
// ----------------------------------------------------------------------------
export async function sendEmail({ to, subject, html, text }) {
  const cfg = getEmailConfig();

  if (!cfg.enabled) {
    return { success: false, disabled: true, message: 'Tính năng gửi email tự động đang tắt trong Cấu hình Admin.' };
  }

  if (!to || !to.includes('@')) {
    return { success: false, error: 'Địa chỉ email người nhận không hợp lệ.' };
  }

  // Tự động chuyển HTML sang plain-text nếu text không được truyền
  function htmlToPlainText(raw) {
    if (!raw) return '';
    return raw
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&bull;/g, '•')
      .replace(/&rarr;/g, '->')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  let plainText = (typeof text === 'string' && text.trim().length > 0)
    ? text.trim()
    : htmlToPlainText(html);

  if (!plainText) {
    plainText = subject || 'UniFLOWs Record Label Notification';
  }

  const sender = `${cfg.senderName || 'UniFLOWs Label'} <${cfg.senderEmail}>`;

  // 1. Gửi qua Brevo (Sendinblue) API v3 (Khuyên dùng - hoạt động trực tiếp trên Browser không bị CORS)
  if (cfg.provider === 'brevo') {
    if (!cfg.apiKey) return { success: false, error: 'Chưa cấu hình API Key Brevo.' };

    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': cfg.apiKey.trim(),
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: cfg.senderName || 'UniFLOWs Record Label',
            email: cfg.senderEmail.trim()
          },
          to: [{ email: to.trim() }],
          subject,
          htmlContent: html,
          textContent: plainText
        })
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        return { success: true, messageId: json.messageId, provider: 'brevo' };
      } else {
        return { success: false, error: json.message || `Lỗi Brevo HTTP ${res.status}`, details: json };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // 2. Gửi qua Resend API
  if (cfg.provider === 'resend') {
    if (!cfg.apiKey) return { success: false, error: 'Chưa cấu hình Resend API Key.' };

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.apiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: sender,
          to: [to.trim()],
          subject,
          html,
          text: plainText
        })
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        return { success: true, messageId: json.id, provider: 'resend' };
      } else {
        return { success: false, error: json.message || `Lỗi Resend HTTP ${res.status}`, details: json };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // 3. Gửi qua Supabase Edge Function
  if (cfg.provider === 'supabase_edge') {
    const edgeUrl = cfg.supabaseEdgeUrl || `${getSupabaseUrl()}/functions/v1/send-email`;
    const anonKey = getSupabaseAnonKey();

    try {
      const res = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey
        },
        body: JSON.stringify({
          from: sender,
          to: to.trim(),
          subject,
          html,
          text: plainText
        })
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        return { success: true, provider: 'supabase_edge', details: json };
      } else {
        return { success: false, error: json.error || `Lỗi Edge Function HTTP ${res.status}` };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // 4. Gửi qua Custom Webhook (Cloudflare Worker, n8n, Zapier)
  if (cfg.provider === 'custom_webhook') {
    if (!cfg.webhookUrl) return { success: false, error: 'Chưa cấu hình Webhook URL.' };

    try {
      const res = await fetch(cfg.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: sender, to: to.trim(), subject, html, text: plainText })
      });

      if (res.ok) {
        return { success: true, provider: 'webhook' };
      } else {
        return { success: false, error: `Webhook trả về HTTP ${res.status}` };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: 'Provider không hợp lệ hoặc chưa được hỗ trợ.' };
}

// ----------------------------------------------------------------------------
// EMAIL TEMPLATE BUILDER: GIAO DIỆN HTML EMAIL CHUẨN BRUTALISM / EDITORIAL HOMEPAGE
// Đồng bộ với màu sắc, font DM Mono, logo /assets/logo.jpg và slogan MAKE THE WORLD MOVE.
// ----------------------------------------------------------------------------
function buildHtmlEmailLayout({ kicker, preheader, headerTitle, badgeText, badgeColor, badgeBg, badgeBorder, contentHtml, actionBtnText, actionBtnUrl, footerNote }) {
  const origin = (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:')) 
    ? window.location.origin 
    : 'https://uniflowslabel.com';
  const portalUrl = actionBtnUrl || `${origin}/portal.html`;
  const logoUrl = `${origin}/assets/logo.jpg`;

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${headerTitle || 'UniFLOWs Label'}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0b0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f1f5f9;-webkit-font-smoothing:antialiased;">
  <!-- Preheader preview text -->
  <div style="display:none;font-size:1px;color:#0b0b0b;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || headerTitle}
  </div>

  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b0b0b;padding:36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container: Brutalist Frame with Dark Editorial Surface -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:620px;background-color:#121212;border:1px solid #2a2a2a;box-shadow:8px 8px 0px #000000;overflow:hidden;">
          
          <!-- Top Header: Logo, Brand Typography & Status Tag -->
          <tr>
            <td style="background-color:#0d0d0d;padding:26px 32px 22px;border-bottom:2px solid #d8ff48;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:14px;">
                          <!-- Official UniFLOWs Logo -->
                          <img src="${logoUrl}" alt="UniFLOWs Logo" width="46" height="46" style="display:block;width:46px;height:46px;object-fit:cover;border:1px solid #333333;background:#000000;" onerror="this.style.display='none'">
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="font-family:'DM Mono',Courier,monospace;font-size:18px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;line-height:1.1;">
                            UNIFLOWs
                          </div>
                          <div style="font-family:'DM Mono',Courier,monospace;font-size:9.5px;letter-spacing:2px;color:#d8ff48;text-transform:uppercase;margin-top:4px;font-weight:700;">
                            RECORD LABEL &bull; ARTIST SERVICES
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  ${badgeText ? `
                  <td align="right" valign="middle">
                    <span style="display:inline-block;padding:6px 13px;font-family:'DM Mono',Courier,monospace;font-size:10.5px;font-weight:800;letter-spacing:1px;text-transform:uppercase;background-color:${badgeBg || '#1e1e1e'};color:${badgeColor || '#d8ff48'};border:1px solid ${badgeBorder || '#d8ff48'};">
                      ${badgeText}
                    </span>
                  </td>
                  ` : ''}
                </tr>
              </table>

              <!-- Section Kicker and Headline -->
              <div style="margin-top:20px;padding-top:16px;border-top:1px solid #222222;">
                <div style="font-family:'DM Mono',Courier,monospace;font-size:10.5px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#d8ff48;margin-bottom:6px;">
                  ${kicker || '01 / NOTIFICATION'}
                </div>
                <h1 style="margin:0;font-size:23px;line-height:1.25;color:#ffffff;font-weight:800;letter-spacing:-0.03em;">
                  ${headerTitle}
                </h1>
              </div>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="background-color:#141414;padding:32px;font-size:14.5px;line-height:1.65;color:#e2e8f0;">
              ${contentHtml}

              ${actionBtnText ? `
              <div style="margin-top:34px;text-align:center;">
                <a href="${portalUrl}" target="_blank" style="display:inline-block;padding:15px 34px;background-color:#d8ff48;color:#0b0b0b;text-decoration:none;font-family:'DM Mono',Courier,monospace;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;border:1px solid #d8ff48;box-shadow:4px 4px 0px #000000;">
                  ${actionBtnText} &rarr;
                </a>
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Editorial Brutalist Footer -->
          <tr>
            <td style="background-color:#0d0d0d;border-top:1px solid #242424;padding:24px 32px;font-family:'DM Mono',Courier,monospace;font-size:11px;color:#71717a;text-align:center;line-height:1.6;">
              ${footerNote ? `<p style="margin:0 0 10px;color:#a1a1aa;font-size:11.5px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">${footerNote}</p>` : ''}
              <p style="margin:0;font-weight:800;color:#ffffff;letter-spacing:1.5px;text-transform:uppercase;font-size:11px;">
                UNIFLOWS LABEL &bull; MAKE THE WORLD MOVE.
              </p>
              <p style="margin:6px 0 0;font-size:10px;color:#71717a;letter-spacing:1px;text-transform:uppercase;">
                Independent entertainment / Vietnam &bull; <a href="${origin}" target="_blank" style="color:#d8ff48;text-decoration:none;">uniflowslabel.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ----------------------------------------------------------------------------
// 1. SỰ KIỆN: GỬI PHIẾU BÀN GIAO TÀI KHOẢN (ACCOUNT HANDOVER)
// ----------------------------------------------------------------------------
export async function sendAccountHandoverEmail(artist) {
  const cfg = getEmailConfig();
  if (!cfg.enabled || !cfg.triggers.onAccountCreated) return { skipped: true };
  if (!artist.email) return { success: false, error: 'Nghệ sĩ chưa có địa chỉ email.' };

  const origin = (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:')) 
    ? window.location.origin 
    : 'https://uniflowslabel.com';
  const loginUrl = `${origin}/artist-login.html`;
  const subject = `🎉 [UniFLOWs] Chào mừng gia nhập Label! Phiếu bàn giao tài khoản: ${artist.name}`;

  const contentHtml = `
    <p style="font-size:16px;color:#ffffff;font-weight:700;margin-top:0;">
      Xin chào ${artist.name},
    </p>
    <p style="color:#cbd5e1;">
      Ban quản trị <b>UniFLOWs Record Label</b> trân trọng hoan nghênh bạn chính thức gia nhập hệ sinh thái phát hành & phân phối âm nhạc độc lập của chúng tôi!
    </p>
    <p style="color:#cbd5e1;">
      Dưới đây là thông tin định danh & mật khẩu đăng nhập vào <b>Artist Portal</b> dành riêng cho bạn để quản lý các bản phát hành, tải lên Master WAV, theo dõi số liệu streaming toàn cầu và nhận thanh toán doanh thu:
    </p>

    <!-- Handover Vault Card -->
    <div style="background-color:#1a1a1a;border:1px solid #333333;padding:20px;margin:22px 0;font-family:'DM Mono',Courier,monospace;">
      <div style="font-size:11px;letter-spacing:1.5px;color:#d8ff48;text-transform:uppercase;margin-bottom:14px;font-weight:800;">
        PHIẾU BÀN GIAO TÀI KHOẢN HỆ THỐNG
      </div>
      <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size:12.5px;color:#e2e8f0;">
        <tr>
          <td width="38%" style="color:#94a3b8;font-weight:bold;">👤 TÊN HIỂN THỊ:</td>
          <td><b style="color:#ffffff;font-size:14px;">${artist.name}</b></td>
        </tr>
        <tr>
          <td style="color:#94a3b8;font-weight:bold;">🔑 USERNAME:</td>
          <td style="color:#93c5fd;font-weight:bold;font-size:14px;">${artist.username || artist.id}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;font-weight:bold;">📧 EMAIL LIÊN KẾT:</td>
          <td style="color:#f1f5f9;">${artist.email}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;font-weight:bold;">🔒 MẬT KHẨU BAN ĐẦU:</td>
          <td>
            <span style="color:#fca5a5;font-weight:bold;font-size:14px;background:#3b1114;border:1px solid #7f1d1d;padding:4px 10px;display:inline-block;">
              ${artist.password}
            </span>
          </td>
        </tr>
        <tr>
          <td style="color:#94a3b8;font-weight:bold;">📜 PHÂN QUYỀN:</td>
          <td style="color:#ffffff;"><b>${artist.roleType || 'Nghệ sĩ Độc quyền'}</b></td>
        </tr>
        <tr>
          <td style="color:#94a3b8;font-weight:bold;">💳 TỶ LỆ ROYALTY:</td>
          <td style="color:#d8ff48;font-weight:bold;">${artist.royaltyRate || '80% Master'}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;font-weight:bold;">🕒 KỲ ĐỐI SOÁT:</td>
          <td style="color:#ffffff;">${artist.payoutCycle || 'Hàng tháng (Monthly)'}</td>
        </tr>
      </table>
    </div>

    <div style="background-color:#1c1917;border-left:4px solid #d8ff48;border:1px solid #333333;padding:14px 18px;font-size:12.5px;color:#fef08a;line-height:1.5;">
      ⚡ <b>Lưu ý bảo mật:</b> Vui lòng truy cập Portal và đổi mật khẩu trong lần đăng nhập đầu tiên tại mục <i>Cài đặt hồ sơ</i> để bảo vệ quyền riêng tư và dữ liệu đối soát của bạn.
    </div>
  `;

  const html = buildHtmlEmailLayout({
    kicker: '01 / ACCOUNT HANDOVER',
    preheader: `Thông tin tài khoản Artist Portal UniFLOWs của bạn: Username: ${artist.username || artist.id}`,
    headerTitle: 'Phiếu Bàn Giao Tài Khoản Artist Portal',
    badgeText: 'MỚI KÍCH HOẠT',
    badgeColor: '#0b0b0b',
    badgeBg: '#d8ff48',
    badgeBorder: '#d8ff48',
    contentHtml,
    actionBtnText: 'Đăng Nhập Artist Portal Ngay',
    actionBtnUrl: loginUrl,
    footerNote: 'Email này chứa thông tin bảo mật đăng nhập. Vui lòng không chuyển tiếp cho bên thứ ba.'
  });

  return await sendEmail({ to: artist.email, subject, html });
}

// ----------------------------------------------------------------------------
// 2. SỰ KIỆN: YÊU CẦU CHỈNH SỬA BÀI HÁT (REVISION REQUESTED)
// ----------------------------------------------------------------------------
export async function sendReleaseRevisionEmail(artist, release, feedback) {
  const cfg = getEmailConfig();
  if (!cfg.enabled || !cfg.triggers.onReleaseRevision) return { skipped: true };
  if (!artist.email) return { success: false, error: 'Nghệ sĩ chưa có địa chỉ email.' };

  const origin = (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:')) 
    ? window.location.origin 
    : 'https://uniflowslabel.com';
  const portalUrl = `${origin}/portal.html?tab=releases`;
  const subject = `⚠️ [UniFLOWs A&R] Yêu cầu chỉnh sửa bài hát "${release.title}"`;

  const contentHtml = `
    <p style="font-size:16px;color:#ffffff;font-weight:700;margin-top:0;">
      Chào ${artist.name},
    </p>
    <p style="color:#cbd5e1;">
      Đội ngũ A&R và Quality Control của <b>UniFLOWs Label</b> đã hoàn tất xét duyệt bản phát hành <b>"${release.title}"</b> của bạn.
    </p>
    <p style="color:#cbd5e1;">
      Để đảm bảo sản phẩm đạt tiêu chuẩn kỹ thuật phân phối quốc tế trên Spotify, Apple Music và tránh bị DSPs gỡ bỏ, chúng tôi cần bạn hỗ trợ điều chỉnh một số chi tiết sau:
    </p>

    <!-- Feedback Box -->
    <div style="background-color:#1c1012;border:1px solid #7f1d1d;border-left:4px solid #ef4444;padding:18px 20px;margin:22px 0;">
      <span style="display:block;font-family:'DM Mono',Courier,monospace;color:#f87171;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:800;margin-bottom:6px;">
        💬 Góp ý & Lời nhắn từ Đội ngũ A&R:
      </span>
      <p style="margin:0;font-size:14px;color:#fca5a5;white-space:pre-wrap;line-height:1.6;font-weight:500;">
        ${feedback || 'Vui lòng kiểm tra lại file âm thanh Master (chuẩn 16/24-bit 44.1kHz WAV không nén) hoặc ảnh Artwork đúng kích thước vuông tối thiểu 3000x3000px, không mờ, không chứa logo nền tảng khác.'}
      </p>
    </div>

    <p style="font-size:13px;color:#94a3b8;line-height:1.6;">
      Sau khi hoàn tất chỉnh sửa, vui lòng vào Artist Portal để tải lại file hoặc cập nhật thông tin. Đội ngũ kiểm duyệt sẽ tiến hành duyệt lại trong vòng 24 giờ làm việc.
    </p>
  `;

  const html = buildHtmlEmailLayout({
    kicker: '02 / A&R REVIEW & REVISION',
    preheader: `Bản phát hành "${release.title}" cần điều chỉnh theo yêu cầu từ A&R`,
    headerTitle: 'Yêu Cầu Chỉnh Sửa Bản Phát Hành',
    badgeText: 'CẦN CHỈNH SỬA',
    badgeColor: '#fca5a5',
    badgeBg: '#261214',
    badgeBorder: '#7f1d1d',
    contentHtml,
    actionBtnText: 'Mở Portal & Cập Nhật Bài Hát',
    actionBtnUrl: portalUrl,
    footerNote: 'Nếu bạn có thắc mắc về tiêu chuẩn âm thanh hoặc bản quyền sample, vui lòng phản hồi email này.'
  });

  return await sendEmail({ to: artist.email, subject, html });
}

// ----------------------------------------------------------------------------
// 3. SỰ KIỆN: TỪ CHỐI BẢN PHÁT HÀNH (RELEASE REJECTED)
// ----------------------------------------------------------------------------
export async function sendReleaseRejectedEmail(artist, release, reason) {
  const cfg = getEmailConfig();
  if (!cfg.enabled || !cfg.triggers.onReleaseRejected) return { skipped: true };
  if (!artist.email) return { success: false, error: 'Nghệ sĩ chưa có địa chỉ email.' };

  const origin = (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:')) 
    ? window.location.origin 
    : 'https://uniflowslabel.com';
  const portalUrl = `${origin}/portal.html?tab=releases`;
  const subject = `❌ [UniFLOWs] Thông báo xét duyệt bản phát hành "${release.title}"`;

  const contentHtml = `
    <p style="font-size:16px;color:#ffffff;font-weight:700;margin-top:0;">
      Chào ${artist.name},
    </p>
    <p style="color:#cbd5e1;">
      Rất tiếc, sau khi thẩm định kỹ thuật và chính sách bản quyền âm nhạc, bản phát hành <b>"${release.title}"</b> chưa đủ điều kiện để đưa vào luồng phân phối thương mại trên hệ thống của UniFLOWs.
    </p>

    <!-- Reason Box -->
    <div style="background-color:#1c1012;border:1px solid #7f1d1d;border-left:4px solid #ef4444;padding:18px 20px;margin:22px 0;">
      <span style="display:block;font-family:'DM Mono',Courier,monospace;color:#f87171;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:800;margin-bottom:6px;">
        Lý do từ chối:
      </span>
      <p style="margin:0;font-size:14px;color:#fca5a5;white-space:pre-wrap;line-height:1.6;font-weight:500;">
        ${reason || 'Sản phẩm vi phạm bản quyền mẫu sample chưa được cấp phép (cleared sample), chất lượng âm thanh không đạt chuẩn thương mại hoặc thông tin tác giả/nhà sản xuất chưa được xác minh đầy đủ.'}
      </p>
    </div>

    <p style="font-size:13px;color:#94a3b8;line-height:1.6;">
      Bạn luôn có thể trao đổi thêm với bộ phận A&R hoặc tải lên các bản demo mới trên Artist Portal bất cứ lúc nào.
    </p>
  `;

  const html = buildHtmlEmailLayout({
    kicker: '03 / RELEASE REVIEW DECISION',
    preheader: `Bản phát hành "${release.title}" chưa đạt điều kiện phát hành thương mại`,
    headerTitle: 'Thông Báo Từ Chối Bản Phát Hành',
    badgeText: 'TỪ CHỐI',
    badgeColor: '#fca5a5',
    badgeBg: '#261214',
    badgeBorder: '#7f1d1d',
    contentHtml,
    actionBtnText: 'Xem Chi Tiết Trên Portal',
    actionBtnUrl: portalUrl,
    footerNote: 'UniFLOWs Label luôn sẵn sàng đồng hành và lắng nghe các sản phẩm âm nhạc tiếp theo của bạn.'
  });

  return await sendEmail({ to: artist.email, subject, html });
}

// ----------------------------------------------------------------------------
// 4. SỰ KIỆN: PHÊ DUYỆT PHÁT HÀNH (RELEASE APPROVED)
// ----------------------------------------------------------------------------
export async function sendReleaseApprovedEmail(artist, release) {
  const cfg = getEmailConfig();
  if (!cfg.enabled || !cfg.triggers.onReleaseApproved) return { skipped: true };
  if (!artist.email) return { success: false, error: 'Nghệ sĩ chưa có địa chỉ email.' };

  const origin = (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:')) 
    ? window.location.origin 
    : 'https://uniflowslabel.com';
  const portalUrl = `${origin}/portal.html?tab=releases`;
  const subject = `🎉 [UniFLOWs Chúc Mừng] Bản phát hành "${release.title}" đã được duyệt phân phối toàn cầu!`;

  const contentHtml = `
    <p style="font-size:16px;color:#ffffff;font-weight:700;margin-top:0;">
      Chúc mừng ${artist.name}!
    </p>
    <p style="color:#cbd5e1;">
      Bản phát hành <b>"${release.title}"</b> của bạn đã vượt qua toàn bộ các bài kiểm tra kỹ thuật và chính thức được đưa vào luồng phân phối toàn cầu của <b>UniFLOWs Label</b>!
    </p>

    <div style="background-color:#112217;border:1px solid #14532d;border-left:4px solid #d8ff48;padding:18px 20px;margin:22px 0;font-family:'DM Mono',Courier,monospace;">
      <div style="font-size:11px;letter-spacing:1.5px;color:#d8ff48;text-transform:uppercase;margin-bottom:10px;font-weight:800;">
        THÔNG TIN LỊCH TRÌNH PHÁT HÀNH
      </div>
      <p style="margin:0;font-size:13.5px;color:#f0fdf4;line-height:1.7;">
        💿 <b>Tác phẩm:</b> ${release.title}<br>
        📅 <b>Ngày phát hành dự kiến:</b> ${release.release_date || release.releaseDate || 'Theo lịch trình đã đăng ký'}<br>
        🌍 <b>Phạm vi phân phối:</b> Toàn cầu 150+ nền tảng (Spotify, Apple Music, YouTube Music, Zing MP3, TikTok, v.v.)
      </p>
    </div>

    <p style="font-size:13px;color:#94a3b8;line-height:1.6;">
      Bạn có thể truy cập Portal để lấy Smart Link quảng bá, tạo mã QR Code hoặc theo dõi chiến dịch Pitching Playlist cùng đội ngũ truyền thông của UniFLOWs.
    </p>
  `;

  const html = buildHtmlEmailLayout({
    kicker: '04 / GLOBAL DISTRIBUTION',
    preheader: `Bản phát hành "${release.title}" đã được duyệt phân phối chính thức!`,
    headerTitle: 'Bản Phát Hành Đã Được Phê Duyệt!',
    badgeText: 'APPROVED',
    badgeColor: '#0b0b0b',
    badgeBg: '#d8ff48',
    badgeBorder: '#d8ff48',
    contentHtml,
    actionBtnText: 'Mở Smart Link & Thống Kê',
    actionBtnUrl: portalUrl
  });

  return await sendEmail({ to: artist.email, subject, html });
}

// ----------------------------------------------------------------------------
// 5. SỰ KIỆN: THÔNG BÁO TỚI NGHỆ SĨ (DIRECT / BROADCAST NOTIFICATION)
// ----------------------------------------------------------------------------
export async function sendArtistNotificationEmail(artist, notif) {
  const cfg = getEmailConfig();
  if (!cfg.enabled) return { skipped: true };

  const isBroadcast = notif.artist_id === 'all';
  if (isBroadcast && !cfg.triggers.onBroadcastNotif) return { skipped: true };
  if (!isBroadcast && !cfg.triggers.onDirectNotif) return { skipped: true };

  if (!artist.email) return { success: false, error: 'Nghệ sĩ chưa có địa chỉ email.' };

  const subject = `📢 [UniFLOWs] ${notif.title}`;
  const origin = (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:')) 
    ? window.location.origin 
    : 'https://uniflowslabel.com';
  const actionUrl = notif.action_url ? (notif.action_url.startsWith('http') ? notif.action_url : `${origin}/${notif.action_url}`) : `${origin}/portal.html`;

  const typeLabels = {
    important: '🔥 Quan trọng',
    info: '📢 Tin tức',
    payout: '💳 Đối soát doanh thu',
    release: '💿 Bản phát hành',
    update: '⚡ Cập nhật kỹ thuật'
  };

  const contentHtml = `
    <p style="font-size:16px;color:#ffffff;font-weight:700;margin-top:0;">
      Chào ${artist.name || 'Nghệ sĩ'},
    </p>
    <div style="background-color:#1a1a1a;border:1px solid #2e2e2e;padding:20px 24px;margin:20px 0;">
      <h3 style="margin:0 0 10px;font-size:16px;color:#ffffff;letter-spacing:-0.02em;">${notif.title}</h3>
      <p style="margin:0;font-size:14px;color:#cbd5e1;white-space:pre-wrap;line-height:1.65;">
        ${notif.message}
      </p>
    </div>
  `;

  const html = buildHtmlEmailLayout({
    kicker: '05 / LABEL DISPATCH',
    preheader: notif.title,
    headerTitle: notif.title,
    badgeText: typeLabels[notif.type] || 'Thông Báo',
    badgeColor: notif.type === 'important' ? '#fca5a5' : '#0b0b0b',
    badgeBg: notif.type === 'important' ? '#261214' : '#d8ff48',
    badgeBorder: notif.type === 'important' ? '#7f1d1d' : '#d8ff48',
    contentHtml,
    actionBtnText: notif.action_url ? 'Xem Chi Tiết Ngay' : 'Mở Artist Portal',
    actionBtnUrl: actionUrl
  });

  return await sendEmail({ to: artist.email, subject, html });
}

// ----------------------------------------------------------------------------
// 6. SỰ KIỆN: DUYỆT HOẶC TỪ CHỐI RÚT TIỀN (PAYOUT STATUS UPDATE) — CRITICAL FIX
// ----------------------------------------------------------------------------
export async function sendPayoutStatusEmail({ artist, payout, status, rejectionReason }) {
  const cfg = getEmailConfig();
  if (!cfg.enabled || !cfg.triggers.onPayoutUpdate) return { skipped: true };
  if (!artist || !artist.email) return { success: false, error: 'Nghệ sĩ chưa có địa chỉ email trong hồ sơ.' };

  const isRejected = status === 'Từ chối thanh toán' || status === 'Từ chối';
  const amt = parseInt(String(payout?.amount || 0).replace(/[^0-9]/g, ''), 10) || 0;
  const amtFormatted = `₫ ${amt.toLocaleString('vi-VN')}`;
  const bank = payout?.bank_info || {};
  const origin = (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:')) 
    ? window.location.origin 
    : 'https://uniflowslabel.com';
  const portalUrl = `${origin}/portal.html?tab=payouts`;

  const subject = isRejected 
    ? `❌ [UniFLOWs Đối Soát] Yêu cầu rút tiền ${amtFormatted} chưa được duyệt`
    : `💳 [UniFLOWs Xác Nhận] Khoản rút tiền ${amtFormatted} đã được chuyển khoản hoàn tất`;

  let contentHtml = '';
  if (isRejected) {
    contentHtml = `
      <p style="font-size:16px;color:#ffffff;font-weight:700;margin-top:0;">
        Chào ${artist.name || 'Nghệ sĩ'},
      </p>
      <p style="color:#cbd5e1;line-height:1.65;">
        Ban quản trị <b>UniFLOWs Label</b> xin thông báo yêu cầu rút tiền bản quyền / doanh thu của bạn vừa được xử lý, tuy nhiên yêu cầu này <b>chưa được duyệt giải ngân</b> trong đợt này.
      </p>

      <!-- Rejection Reason Card -->
      <div style="background-color:#1c1012;border:1px solid #7f1d1d;border-left:4px solid #ef4444;padding:18px 20px;margin:22px 0;">
        <span style="display:block;font-family:'DM Mono',Courier,monospace;color:#f87171;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:800;margin-bottom:6px;">
          ⚠️ Lý do từ chối từ Ban Quản Trị:
        </span>
        <p style="margin:0;font-size:14px;color:#fca5a5;white-space:pre-wrap;line-height:1.6;font-weight:500;">
          ${rejectionReason || 'Thông tin ngân hàng thụ hưởng chưa khớp với hồ sơ đăng ký, hoặc số dư khả dụng chưa đủ điều kiện rút theo thỏa thuận đối soát.'}
        </p>
      </div>

      <!-- Transaction Details Table -->
      <div style="background-color:#1a1a1a;border:1px solid #2e2e2e;padding:18px 20px;margin:22px 0;font-family:'DM Mono',Courier,monospace;">
        <div style="font-size:10.5px;letter-spacing:1.5px;color:#d8ff48;text-transform:uppercase;margin-bottom:12px;font-weight:800;">
          THÔNG TIN YÊU CẦU ĐỐI SOÁT
        </div>
        <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size:12.5px;color:#e2e8f0;">
          <tr>
            <td width="38%" style="color:#94a3b8;font-weight:bold;">SỐ TIỀN YÊU CẦU:</td>
            <td><strong style="color:#ffffff;font-size:15px;">${amtFormatted}</strong></td>
          </tr>
          <tr>
            <td style="color:#94a3b8;font-weight:bold;">NGÂN HÀNG:</td>
            <td><b>${bank.bank || 'Mặc định hồ sơ'}</b></td>
          </tr>
          <tr>
            <td style="color:#94a3b8;font-weight:bold;">SỐ TÀI KHOẢN:</td>
            <td style="color:#93c5fd;">${bank.accountNumber || '—'}</td>
          </tr>
          <tr>
            <td style="color:#94a3b8;font-weight:bold;">CHỦ TÀI KHOẢN:</td>
            <td style="text-transform:uppercase;">${bank.accountName || artist.name}</td>
          </tr>
          <tr>
            <td style="color:#94a3b8;font-weight:bold;">TRẠNG THÁI:</td>
            <td><span style="color:#ef4444;font-weight:bold;">TỪ CHỐI THANH TOÁN</span></td>
          </tr>
        </table>
      </div>

      <p style="font-size:13px;color:#94a3b8;line-height:1.6;">
        Số dư của bạn đã được hoàn trả lại ví khả dụng trên hệ thống. Bạn có thể kiểm tra lại thông tin ngân hàng trong mục <i>Cài đặt hồ sơ</i> trên Artist Portal và gửi lại yêu cầu rút tiền bất cứ lúc nào.
      </p>
    `;
  } else {
    contentHtml = `
      <p style="font-size:16px;color:#ffffff;font-weight:700;margin-top:0;">
        Chào ${artist.name || 'Nghệ sĩ'},
      </p>
      <p style="color:#cbd5e1;line-height:1.65;">
        Ban quản trị <b>UniFLOWs Record Label</b> xin thông báo khoản yêu cầu rút tiền của bạn đã được phê duyệt và <b>chuyển khoản hoàn tất</b> vào tài khoản ngân hàng thụ hưởng!
      </p>

      <!-- Transaction Details Table -->
      <div style="background-color:#1a1a1a;border:1px solid #2e2e2e;padding:18px 20px;margin:22px 0;font-family:'DM Mono',Courier,monospace;">
        <div style="font-size:10.5px;letter-spacing:1.5px;color:#d8ff48;text-transform:uppercase;margin-bottom:12px;font-weight:800;">
          BIÊN NHẬN GIẢI NGÂN DOANH THU
        </div>
        <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size:12.5px;color:#e2e8f0;">
          <tr>
            <td width="38%" style="color:#94a3b8;font-weight:bold;">SỐ TIỀN GIẢI NGÂN:</td>
            <td><strong style="color:#d8ff48;font-size:16px;">${amtFormatted}</strong></td>
          </tr>
          <tr>
            <td style="color:#94a3b8;font-weight:bold;">NGÂN HÀNG THỤ HƯỞNG:</td>
            <td><b>${bank.bank || 'Mặc định hồ sơ'}</b></td>
          </tr>
          <tr>
            <td style="color:#94a3b8;font-weight:bold;">SỐ TÀI KHOẢN:</td>
            <td style="color:#93c5fd;">${bank.accountNumber || '—'}</td>
          </tr>
          <tr>
            <td style="color:#94a3b8;font-weight:bold;">CHỦ TÀI KHOẢN:</td>
            <td style="text-transform:uppercase;">${bank.accountName || artist.name}</td>
          </tr>
          <tr>
            <td style="color:#94a3b8;font-weight:bold;">TRẠNG THÁI:</td>
            <td><span style="color:#d8ff48;font-weight:bold;">ĐÃ THANH TOÁN (HOÀN TẤT)</span></td>
          </tr>
        </table>
      </div>

      <p style="font-size:13px;color:#94a3b8;line-height:1.6;">
        Tùy theo hệ thống liên ngân hàng Napas, tiền sẽ được ghi có vào tài khoản của bạn trong vòng vài phút đến tối đa 24 giờ làm việc. Cảm ơn bạn đã luôn sáng tạo và đồng hành cùng UniFLOWs!
      </p>
    `;
  }

  const html = buildHtmlEmailLayout({
    kicker: '06 / FINANCES & PAYOUT',
    preheader: isRejected 
      ? `Yêu cầu rút tiền ${amtFormatted} chưa được duyệt: ${rejectionReason || 'Vui lòng kiểm tra lại'}`
      : `Khoản thanh toán ${amtFormatted} đã được giải ngân thành công`,
    headerTitle: isRejected ? 'Yêu Cầu Rút Tiền Bị Từ Chối' : 'Xác Nhận Giải Ngân Doanh Thu',
    badgeText: isRejected ? 'TỪ CHỐI THANH TOÁN' : 'ĐÃ THANH TOÁN',
    badgeColor: isRejected ? '#fca5a5' : '#0b0b0b',
    badgeBg: isRejected ? '#261214' : '#d8ff48',
    badgeBorder: isRejected ? '#7f1d1d' : '#d8ff48',
    contentHtml,
    actionBtnText: 'Mở Artist Portal & Đối Soát',
    actionBtnUrl: portalUrl,
    footerNote: 'Nếu có bất kỳ thắc mắc nào về đối soát số dư, vui lòng phản hồi trực tiếp email này để bộ phận Tài chính hỗ trợ.'
  });

  return await sendEmail({ to: artist.email, subject, html });
}

// ----------------------------------------------------------------------------
// 7. GỬI EMAIL THỬ NGHIỆM ĐỂ TEST CẤU HÌNH DOMAIN
// ----------------------------------------------------------------------------
export async function sendTestEmail(toEmail) {
  const cfg = getEmailConfig();
  const subject = `🧪 [UniFLOWs Test] Kiểm tra kết nối Email Domain: ${cfg.senderEmail}`;

  const contentHtml = `
    <p style="font-size:16px;color:#ffffff;font-weight:700;margin-top:0;">
      Xin chúc mừng! Hệ thống Email Domain của bạn đã hoạt động hoàn hảo.
    </p>
    <p style="color:#cbd5e1;line-height:1.65;">
      Email này được gửi tự động từ địa chỉ <b>${cfg.senderEmail}</b> thông qua nhà cung cấp <b>${cfg.provider.toUpperCase()}</b>.
    </p>
    <div style="background:#112217;border:1px solid #14532d;border-left:4px solid #d8ff48;padding:16px 20px;font-size:13px;color:#bbf7d0;margin:20px 0;line-height:1.7;font-family:'DM Mono',Courier,monospace;">
      ✓ Kết nối API nhà cung cấp thành công.<br>
      ✓ Tên miền người gửi đã được xác thực.<br>
      ✓ Logo và layout Brutalism Homepage đã đồng bộ.<br>
      ✓ Hệ thống sẵn sàng tự động gửi thư bàn giao, xét duyệt bài hát và đối soát rút tiền.
    </div>
  `;

  const html = buildHtmlEmailLayout({
    kicker: '07 / SYSTEM VERIFICATION',
    preheader: 'Thử nghiệm kết nối Email Domain UniFLOWs thành công!',
    headerTitle: 'Kiểm Tra Kết Nối Email Domain',
    badgeText: 'TEST PASS',
    badgeColor: '#0b0b0b',
    badgeBg: '#d8ff48',
    badgeBorder: '#d8ff48',
    contentHtml,
    actionBtnText: 'Truy cập Admin Dashboard',
    actionBtnUrl: `${(typeof window !== 'undefined' && window.location.origin) ? window.location.origin : ''}/admin.html`
  });

  return await sendEmail({ to: toEmail, subject, html, text: 'Email thử nghiệm kết nối UniFLOWs thành công!' });
}
