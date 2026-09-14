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
export async function sendEmail({ to, subject, html, text, bypassEnabledCheck = false }) {
  const cfg = getEmailConfig();

  if (!cfg.enabled && !bypassEnabledCheck) {
    return { 
      success: false, 
      disabled: true, 
      error: 'Tính năng gửi email tự động đang TẮT. Vui lòng vào Tab 06 / Cấu hình Email, tích chọn "Kích hoạt gửi Email tự động" và nhấn "Lưu Cấu Hình".' 
    };
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

  const senderName = cfg.senderName || 'UniFLOWs Record Label';
  const senderEmail = (cfg.senderEmail && cfg.senderEmail.includes('@')) 
    ? cfg.senderEmail.trim() 
    : 'notifications@uniflowslabel.com';
  const sender = `${senderName} <${senderEmail}>`;

  // 1. Gửi qua Brevo (Sendinblue) API v3 (Khuyên dùng - hoạt động trực tiếp trên Browser không bị CORS)
  if (cfg.provider === 'brevo') {
    if (!cfg.apiKey || !cfg.apiKey.trim()) {
      return { 
        success: false, 
        error: 'Chưa có API Key Brevo. Vui lòng vào Tab 06 / Cấu hình Email để dán API Key (bắt đầu bằng xkeysib-...).' 
      };
    }

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
            name: senderName,
            email: senderEmail
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
        let errMsg = json.message || `Lỗi Brevo HTTP ${res.status}`;
        if (errMsg.includes('sender.email is not verified') || errMsg.includes('unverified sender')) {
          errMsg = `Email người gửi "${senderEmail}" chưa được xác thực (Verified Sender) trên tài khoản Brevo của bạn. Hãy vào Brevo Dashboard -> Senders & Domains để thêm email này.`;
        } else if (errMsg.includes('Key not found') || res.status === 401) {
          errMsg = 'API Key Brevo không hợp lệ hoặc đã bị xoá trên Brevo.';
        }
        return { success: false, error: errMsg, details: json };
      }
    } catch (err) {
      return { success: false, error: `Lỗi kết nối mạng khi gửi Brevo: ${err.message}` };
    }
  }

  // 2. Gửi qua Resend API
  if (cfg.provider === 'resend') {
    if (!cfg.apiKey || !cfg.apiKey.trim()) {
      return { 
        success: false, 
        error: 'Chưa có Resend API Key. Vui lòng vào Tab 06 / Cấu hình Email để nhập API Key từ resend.com (bắt đầu bằng re_...).' 
      };
    }

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
      // Resend blocks client-side browser fetch with CORS
      if (err.name === 'TypeError' || err.message.includes('fetch') || err.message.includes('NetworkError')) {
        return { 
          success: false, 
          error: 'Lỗi CORS trình duyệt: Resend API chặn yêu cầu gửi trực tiếp từ Client Browser. Bạn vui lòng chuyển sang nhà cung cấp Brevo (khuyên dùng, miễn phí 300 mail/ngày và chạy trực tiếp từ web không bị CORS) trong Tab 06.' 
        };
      }
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
// EMAIL TEMPLATE BUILDER: GIAO DIỆN EDITORIAL / HOMEPAGE BRUTALISM
// Thiết kế đồng bộ 100% với Homepage UniFLOWs: Font Manrope, DM Mono, Playfair Display
// Bố cục: Top bar điều hướng, Hero Banner vinyl "WHERE THE MUSIC SPEAKS.", 
// Thân bài trắng tối giản, nút bấm đen sắc nét và Chân trang đen có thông báo No-reply.
// ----------------------------------------------------------------------------
export function buildHtmlEmailLayout({ kicker, preheader, headerTitle, badgeText, badgeColor, badgeBg, badgeBorder, contentHtml, actionBtnText, actionBtnUrl, footerNote }) {
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
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${headerTitle || 'UniFLOWs Label'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&family=Manrope:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;1,500&display=swap" rel="stylesheet">
  <style>
    body, table, td, p, a, div, span {
      font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .dm-mono {
      font-family: 'DM Mono', 'Courier New', Courier, monospace !important;
    }
    .serif {
      font-family: 'Playfair Display', Georgia, serif !important;
    }
    @media only screen and (max-width: 620px) {
      .hero-left {
        width: 100% !important;
        display: block !important;
        padding: 26px 22px !important;
      }
      .hero-right {
        display: none !important;
      }
      .email-nav {
        display: none !important;
      }
      .content-cell {
        padding: 22px 18px !important;
      }
      .footer-stack {
        display: block !important;
        text-align: center !important;
        margin-bottom: 12px !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Manrope',-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;color:#111827;-webkit-font-smoothing:antialiased;">
  <!-- Preheader preview text -->
  <div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || headerTitle}
  </div>

  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container: Clean Editorial Frame matching homepage reference -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:660px;background-color:#ffffff;border:1px solid #e4e4e7;box-shadow:0 8px 30px rgba(0,0,0,0.06);overflow:hidden;">
          
          <!-- Top Navigation Header -->
          <tr>
            <td style="background-color:#ffffff;padding:22px 34px;border-bottom:1px solid #f0f0f0;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <a href="${origin}" target="_blank" style="text-decoration:none;color:#000000;display:inline-block;">
                      <table border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="vertical-align:middle;padding-right:12px;">
                            <img src="${logoUrl}" alt="UniFLOWs Logo" width="38" height="38" style="display:block;width:38px;height:38px;object-fit:cover;border:1px solid #e5e7eb;" onerror="this.style.display='none'">
                          </td>
                          <td style="vertical-align:middle;">
                            <div style="font-family:'Manrope',sans-serif;font-size:20px;font-weight:900;letter-spacing:-0.5px;color:#000000;line-height:1;">
                              UniFLOWs
                            </div>
                            <div style="font-family:'DM Mono',Courier,monospace;font-size:9.5px;letter-spacing:2.5px;color:#000000;text-transform:uppercase;margin-top:3px;font-weight:700;">
                              LABEL
                            </div>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                  <td align="right" valign="middle">
                    <div style="font-family:'DM Mono',Courier,monospace;font-size:9.5px;letter-spacing:2px;text-transform:uppercase;color:#9ca3af;font-weight:700;">
                      OFFICIAL DISPATCH
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero Banner: Black Brutalist Typography "WHERE THE MUSIC SPEAKS." -->
          <tr>
            <td style="background-color:#0b0b0b;padding:36px 36px 32px;border-bottom:3px solid #d8ff48;">
              <div style="font-family:'DM Mono',Courier,monospace;font-size:10px;font-weight:700;letter-spacing:2.5px;color:#9ca3af;text-transform:uppercase;margin-bottom:8px;">
                ${kicker || 'UNIFLOWS LABEL —'}
              </div>
              <div style="font-family:'Manrope',sans-serif;font-size:30px;line-height:1.08;font-weight:900;letter-spacing:-0.035em;color:#ffffff;text-transform:uppercase;">
                WHERE THE MUSIC SPEAKS.
              </div>
              <div style="margin-top:14px;font-family:'DM Mono',Courier,monospace;font-size:10.5px;letter-spacing:2px;color:#d8ff48;text-transform:uppercase;font-weight:700;">
                MAKE THE WORLD MOVE.
              </div>
            </td>
          </tr>

          <!-- Section Headline & Status Badge -->
          <tr>
            <td style="background-color:#ffffff;padding:30px 34px 18px;border-bottom:1px solid #f0f0f0;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="top">
                    <div style="font-family:'DM Mono',Courier,monospace;font-size:10.5px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#64748b;margin-bottom:6px;">
                      ${kicker || 'LABEL DISPATCH'}
                    </div>
                    <h1 style="margin:0;font-family:'Manrope',sans-serif;font-size:23px;line-height:1.25;color:#000000;font-weight:800;letter-spacing:-0.03em;">
                      ${headerTitle}
                    </h1>
                  </td>
                  ${badgeText ? `
                  <td align="right" valign="top" style="padding-left:14px;">
                    <span style="display:inline-block;padding:6px 12px;font-family:'DM Mono',Courier,monospace;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;background-color:${badgeBg || '#f4f4f5'};color:${badgeColor || '#000000'};border:1px solid ${badgeBorder || '#000000'};">
                      ${badgeText}
                    </span>
                  </td>
                  ` : ''}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td class="content-cell" style="background-color:#ffffff;padding:26px 34px 34px;font-family:'Manrope',sans-serif;font-size:14.5px;line-height:1.65;color:#1f2937;">
              ${contentHtml}

              ${actionBtnText ? `
              <div style="margin-top:32px;text-align:left;">
                <a href="${portalUrl}" target="_blank" style="display:inline-block;padding:14px 30px;background-color:#000000;color:#ffffff;text-decoration:none;font-family:'DM Mono',Courier,monospace;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;border:1px solid #000000;box-shadow:3px 3px 0px #000000;">
                  ${actionBtnText} &rarr;
                </a>
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Editorial Brutalist Footer with No-reply Notice & Support Email -->
          <tr>
            <td style="background-color:#000000;border-top:2px solid #000000;padding:28px 34px 30px;font-family:'DM Mono',Courier,monospace;color:#ffffff;">
              
              <!-- Brand and Slogan Row -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td class="footer-stack" align="left" valign="middle">
                    <div style="font-family:'Manrope',sans-serif;font-size:16px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;line-height:1;">
                      UniFLOWs
                    </div>
                    <div style="font-family:'DM Mono',Courier,monospace;font-size:8.5px;letter-spacing:2px;color:#d8ff48;text-transform:uppercase;margin-top:2px;font-weight:700;">
                      LABEL
                    </div>
                  </td>
                  <td class="footer-stack" align="center" valign="middle" style="color:#9ca3af;font-size:10px;letter-spacing:1px;font-style:italic;">
                    where the music speaks.
                  </td>
                  <td class="footer-stack" align="right" valign="middle" style="font-size:10.5px;letter-spacing:1px;text-transform:uppercase;">
                    <a href="${origin}" target="_blank" style="color:#ffffff;text-decoration:none;">uniflowslabel.com</a>
                  </td>
                </tr>
              </table>

              <!-- Optional Context Note -->
              ${footerNote ? `<div style="margin-top:16px;padding-top:14px;border-top:1px solid #222222;color:#d1d5db;font-size:12px;font-family:'Manrope',sans-serif;text-align:left;line-height:1.5;">${footerNote}</div>` : ''}

              <!-- Mandatory Support Note: No-Reply Notice & Management Contact -->
              <div style="border-top:1px solid #222222;margin-top:20px;padding-top:18px;font-family:'DM Mono',Courier,monospace;font-size:11px;color:#9ca3af;line-height:1.65;text-align:center;">
                Đây là email tự động (no-reply) từ hệ thống. Vui lòng không trả lời thư này.<br>
                Để được hỗ trợ, vui lòng <b>liên hệ người phụ trách</b> của bạn hoặc gửi email về <a href="mailto:management@uniflowslabel.com" style="color:#d8ff48;text-decoration:none;font-weight:bold;">management@uniflowslabel.com</a>.
              </div>

              <div style="margin-top:12px;font-size:9.5px;color:#6b7280;letter-spacing:1.5px;text-transform:uppercase;text-align:center;">
                &copy; 2026 UNIFLOWS LABEL &bull; INDEPENDENT ENTERTAINMENT / VIETNAM &bull; ALL RIGHTS RESERVED.
              </div>
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
    <p style="font-size:16px;color:#111827;font-weight:700;margin-top:0;font-family:'Manrope',sans-serif;">
      Xin chào ${artist.name},
    </p>
    <p style="color:#374151;font-family:'Manrope',sans-serif;">
      Ban quản trị <b>UniFLOWs Record Label</b> trân trọng hoan nghênh bạn chính thức gia nhập hệ sinh thái phát hành & phân phối âm nhạc độc lập của chúng tôi!
    </p>
    <p style="color:#374151;font-family:'Manrope',sans-serif;">
      Dưới đây là thông tin định danh & mật khẩu đăng nhập vào <b>UniPORTAL (by UniENGINE)</b> dành riêng cho bạn để quản lý các bản phát hành, tải lên Master WAV, theo dõi số liệu streaming toàn cầu và nhận thanh toán doanh thu:
    </p>

    <!-- Handover Vault Card -->
    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;padding:20px;margin:22px 0;font-family:'DM Mono',Courier,monospace;">
      <div style="font-size:10.5px;letter-spacing:1.5px;color:#000000;text-transform:uppercase;margin-bottom:12px;font-weight:800;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">
        PHIẾU BÀN GIAO TÀI KHOẢN HỆ THỐNG
      </div>
      <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size:12.5px;color:#1e293b;">
        <tr>
          <td width="38%" style="color:#64748b;font-weight:bold;">👤 TÊN HIỂN THỊ:</td>
          <td><b style="color:#000000;font-size:14px;">${artist.name}</b></td>
        </tr>
        <tr>
          <td style="color:#64748b;font-weight:bold;">🔑 USERNAME:</td>
          <td style="color:#2563eb;font-weight:bold;font-size:14px;">${artist.username || artist.id}</td>
        </tr>
        <tr>
          <td style="color:#64748b;font-weight:bold;">📧 EMAIL LIÊN KẾT:</td>
          <td style="color:#0f172a;">${artist.email}</td>
        </tr>
        <tr>
          <td style="color:#64748b;font-weight:bold;">🔒 MẬT KHẨU BAN ĐẦU:</td>
          <td>
            <span style="color:#b91c1c;font-weight:bold;font-size:14px;background:#fef2f2;border:1px solid #fecaca;padding:4px 10px;display:inline-block;">
              ${artist.password}
            </span>
          </td>
        </tr>
        <tr>
          <td style="color:#64748b;font-weight:bold;">📜 PHÂN QUYỀN:</td>
          <td style="color:#000000;"><b>${artist.roleType || 'Nghệ sĩ Độc quyền'}</b></td>
        </tr>
        <tr>
          <td style="color:#64748b;font-weight:bold;">💳 TỶ LỆ ROYALTY:</td>
          <td style="color:#15803d;font-weight:bold;">${artist.royaltyRate || '80% Master'}</td>
        </tr>
        <tr>
          <td style="color:#64748b;font-weight:bold;">🕒 KỲ ĐỐI SOÁT:</td>
          <td style="color:#000000;">${artist.payoutCycle || 'Hàng tháng (Monthly)'}</td>
        </tr>
      </table>
    </div>

    <div style="background-color:#fefce8;border-left:4px solid #eab308;border:1px solid #fef08a;padding:14px 18px;font-size:12.5px;color:#854d0e;line-height:1.5;">
      ⚡ <b>Lưu ý bảo mật:</b> Vui lòng truy cập UniPORTAL và đổi mật khẩu trong lần đăng nhập đầu tiên tại mục <i>Cài đặt hồ sơ</i> để bảo vệ quyền riêng tư và dữ liệu đối soát của bạn.
    </div>
  `;

  const html = buildHtmlEmailLayout({
    kicker: '01 / ACCOUNT HANDOVER',
    preheader: `Thông tin tài khoản UniPORTAL (by UniENGINE) của bạn: Username: ${artist.username || artist.id}`,
    headerTitle: 'Phiếu Bàn Giao Tài Khoản UniPORTAL (by UniENGINE)',
    badgeText: 'MỚI KÍCH HOẠT',
    badgeColor: '#000000',
    badgeBg: '#d8ff48',
    badgeBorder: '#000000',
    contentHtml,
    actionBtnText: 'Đăng Nhập UniPORTAL (by UniENGINE) Ngay',
    actionBtnUrl: loginUrl,
    footerNote: 'Email này chứa thông tin bảo mật đăng nhập hệ thống.'
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
    <p style="font-size:16px;color:#111827;font-weight:700;margin-top:0;font-family:'Manrope',sans-serif;">
      Chào ${artist.name},
    </p>
    <p style="color:#374151;font-family:'Manrope',sans-serif;">
      Đội ngũ A&R và Quality Control của <b>UniFLOWs Label</b> đã hoàn tất xét duyệt bản phát hành <b>"${release.title}"</b> của bạn.
    </p>
    <p style="color:#374151;font-family:'Manrope',sans-serif;">
      Để đảm bảo sản phẩm đạt tiêu chuẩn kỹ thuật phân phối quốc tế trên Spotify, Apple Music và tránh bị DSPs gỡ bỏ, chúng tôi cần bạn hỗ trợ điều chỉnh một số chi tiết sau:
    </p>

    <!-- Feedback Box -->
    <div style="background-color:#fef2f2;border:1px solid #fecaca;border-left:4px solid #ef4444;padding:18px 20px;margin:22px 0;">
      <span style="display:block;font-family:'DM Mono',Courier,monospace;color:#dc2626;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:800;margin-bottom:6px;">
        💬 Góp ý & Lời nhắn từ Đội ngũ A&R:
      </span>
      <p style="margin:0;font-size:14px;color:#991b1b;white-space:pre-wrap;line-height:1.6;font-weight:500;">
        ${feedback || 'Vui lòng kiểm tra lại file âm thanh Master (chuẩn 16/24-bit 44.1kHz WAV không nén) hoặc ảnh Artwork đúng kích thước vuông tối thiểu 3000x3000px, không mờ, không chứa logo nền tảng khác.'}
      </p>
    </div>

    <p style="font-size:13px;color:#6b7280;line-height:1.6;font-family:'Manrope',sans-serif;">
      Sau khi hoàn tất chỉnh sửa, vui lòng vào UniPORTAL (by UniENGINE) để tải lại file hoặc cập nhật thông tin. Đội ngũ kiểm duyệt sẽ tiến hành duyệt lại trong vòng 24 giờ làm việc.
    </p>
  `;

  const html = buildHtmlEmailLayout({
    kicker: '02 / A&R REVIEW & REVISION',
    preheader: `Bản phát hành "${release.title}" cần điều chỉnh theo yêu cầu từ A&R`,
    headerTitle: 'Yêu Cầu Chỉnh Sửa Bản Phát Hành',
    badgeText: 'CẦN CHỈNH SỬA',
    badgeColor: '#b91c1c',
    badgeBg: '#fef2f2',
    badgeBorder: '#fecaca',
    contentHtml,
    actionBtnText: 'Mở UniPORTAL Cập Nhật Lại',
    actionBtnUrl: releaseUrl
  });

  return await sendEmail({ to: artist.email, subject, html });
}

// ----------------------------------------------------------------------------
// 3. SỰ KIỆN: TỪ CHỐI PHÁT HÀNH HOÀN TOÀN (REJECT RELEASE)
// ----------------------------------------------------------------------------
export async function sendReleaseRejectedEmail({ artist, release, reason }) {
  const cfg = getEmailConfig();
  if (!cfg.enabled || !cfg.triggers.onReleaseRejected) return { skipped: true };
  if (!artist || !artist.email) return { success: false, error: 'Nghệ sĩ chưa có địa chỉ email trong hồ sơ.' };

  const subject = `❌ [UniFLOWs A&R] Thông báo từ chối phát hành: ${release.title}`;
  const origin = (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:')) 
    ? window.location.origin 
    : 'https://uniflowslabel.com';
  const portalUrl = `${origin}/portal.html?tab=releases`;

  const contentHtml = `
    <p style="font-size:16px;color:#111827;font-weight:700;margin-top:0;font-family:'Manrope',sans-serif;">
      Chào ${artist.name || 'Nghệ sĩ'},
    </p>
    <p style="color:#374151;line-height:1.65;font-family:'Manrope',sans-serif;">
      Hội đồng thẩm định âm nhạc và A&R của <b>UniFLOWs Label</b> đã hoàn tất quá trình nghe thẩm định bản phát hành <b>"${release.title}"</b> của bạn.
    </p>
    <p style="color:#374151;line-height:1.65;font-family:'Manrope',sans-serif;">
      Rất tiếc, trong đợt kiểm duyệt này, bản phát hành chưa đáp ứng đủ tiêu chuẩn phân phối thương mại lên các DSP toàn cầu theo chính sách của hãng.
    </p>

    <!-- Feedback Card -->
    <div style="background-color:#fef2f2;border:1px solid #fecaca;border-left:4px solid #ef4444;padding:18px 20px;margin:22px 0;">
      <span style="display:block;font-family:'DM Mono',Courier,monospace;color:#dc2626;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:800;margin-bottom:6px;">
        ⚠️ Lý do không tiếp nhận từ Ban Biên Tập:
      </span>
      <p style="margin:0;font-size:14px;color:#991b1b;white-space:pre-wrap;line-height:1.6;font-weight:500;">
        ${reason || 'Sản phẩm vi phạm bản quyền mẫu sample chưa được cấp phép (cleared sample), chất lượng âm thanh không đạt chuẩn thương mại hoặc thông tin tác giả/nhà sản xuất chưa được xác minh đầy đủ.'}
      </p>
    </div>

    <p style="font-size:13px;color:#6b7280;line-height:1.6;font-family:'Manrope',sans-serif;">
      Bạn luôn có thể trao đổi thêm với bộ phận A&R hoặc tải lên các bản demo mới trên UniPORTAL (by UniENGINE) bất cứ lúc nào.
    </p>
  `;

  const html = buildHtmlEmailLayout({
    kicker: '03 / RELEASE REVIEW DECISION',
    preheader: `Bản phát hành "${release.title}" chưa đạt điều kiện phát hành thương mại`,
    headerTitle: 'Thông Báo Từ Chối Bản Phát Hành',
    badgeText: 'TỪ CHỐI',
    badgeColor: '#b91c1c',
    badgeBg: '#fef2f2',
    badgeBorder: '#fecaca',
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
    <p style="font-size:16px;color:#111827;font-weight:700;margin-top:0;font-family:'Manrope',sans-serif;">
      Chúc mừng ${artist.name}!
    </p>
    <p style="color:#374151;font-family:'Manrope',sans-serif;">
      Bản phát hành <b>"${release.title}"</b> của bạn đã vượt qua toàn bộ các bài kiểm tra kỹ thuật và chính thức được đưa vào luồng phân phối toàn cầu của <b>UniFLOWs Label</b>!
    </p>

    <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #16a34a;padding:18px 20px;margin:22px 0;font-family:'DM Mono',Courier,monospace;">
      <div style="font-size:10.5px;letter-spacing:1.5px;color:#15803d;text-transform:uppercase;margin-bottom:10px;font-weight:800;">
        THÔNG TIN LỊCH TRÌNH PHÁT HÀNH
      </div>
      <p style="margin:0;font-size:13.5px;color:#166534;line-height:1.7;">
        💿 <b>Tác phẩm:</b> ${release.title}<br>
        📅 <b>Ngày phát hành dự kiến:</b> ${release.release_date || release.releaseDate || 'Theo lịch trình đã đăng ký'}<br>
        🌍 <b>Phạm vi phân phối:</b> Toàn cầu 150+ nền tảng (Spotify, Apple Music, YouTube Music, Zing MP3, TikTok, v.v.)
      </p>
    </div>

    <p style="font-size:13px;color:#6b7280;line-height:1.6;font-family:'Manrope',sans-serif;">
      Bạn có thể truy cập Portal để lấy Smart Link quảng bá, tạo mã QR Code hoặc theo dõi chiến dịch Pitching Playlist cùng đội ngũ truyền thông của UniFLOWs.
    </p>
  `;

  const html = buildHtmlEmailLayout({
    kicker: '04 / GLOBAL DISTRIBUTION',
    preheader: `Bản phát hành "${release.title}" đã được duyệt phân phối chính thức!`,
    headerTitle: 'Bản Phát Hành Đã Được Phê Duyệt!',
    badgeText: 'APPROVED',
    badgeColor: '#000000',
    badgeBg: '#d8ff48',
    badgeBorder: '#000000',
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
    <p style="font-size:16px;color:#111827;font-weight:700;margin-top:0;font-family:'Manrope',sans-serif;">
      Chào ${artist.name || 'Nghệ sĩ'},
    </p>
    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #000000;padding:20px 24px;margin:20px 0;">
      <h3 style="margin:0 0 10px;font-size:16px;color:#000000;letter-spacing:-0.02em;font-family:'Manrope',sans-serif;">${notif.title}</h3>
      <p style="margin:0;font-size:14px;color:#334155;white-space:pre-wrap;line-height:1.65;font-family:'Manrope',sans-serif;">
        ${notif.message}
      </p>
    </div>
  `;

  const html = buildHtmlEmailLayout({
    kicker: '05 / LABEL DISPATCH',
    preheader: notif.title,
    headerTitle: notif.title,
    badgeText: typeLabels[notif.type] || 'Thông Báo',
    badgeColor: notif.type === 'important' ? '#b91c1c' : '#000000',
    badgeBg: notif.type === 'important' ? '#fef2f2' : '#d8ff48',
    badgeBorder: notif.type === 'important' ? '#fecaca' : '#000000',
    contentHtml,
    actionBtnText: notif.action_url ? 'Xem Chi Tiết Ngay' : 'Mở UniPORTAL (by UniENGINE)',
    actionBtnUrl: actionUrl
  });

  return await sendEmail({ to: artist.email, subject, html });
}

// ----------------------------------------------------------------------------
// 6. SỰ KIỆN: DUYỆT HOẶC TỪ CHỐI RÚT TIỀN (PAYOUT STATUS UPDATE)
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
      <p style="font-size:16px;color:#111827;font-weight:700;margin-top:0;font-family:'Manrope',sans-serif;">
        Chào ${artist.name || 'Nghệ sĩ'},
      </p>
      <p style="color:#374151;line-height:1.65;font-family:'Manrope',sans-serif;">
        Ban quản trị <b>UniFLOWs Label</b> xin thông báo yêu cầu rút tiền bản quyền / doanh thu của bạn vừa được xử lý, tuy nhiên yêu cầu này <b>chưa được duyệt giải ngân</b> trong đợt này.
      </p>

      <!-- Rejection Reason Card -->
      <div style="background-color:#fef2f2;border:1px solid #fecaca;border-left:4px solid #ef4444;padding:18px 20px;margin:22px 0;">
        <span style="display:block;font-family:'DM Mono',Courier,monospace;color:#dc2626;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:800;margin-bottom:6px;">
          ⚠️ Lý do từ chối từ Ban Quản Trị:
        </span>
        <p style="margin:0;font-size:14px;color:#991b1b;white-space:pre-wrap;line-height:1.6;font-weight:500;">
          ${rejectionReason || 'Thông tin ngân hàng thụ hưởng chưa khớp với hồ sơ đăng ký, hoặc số dư khả dụng chưa đủ điều kiện rút theo thỏa thuận đối soát.'}
        </p>
      </div>

      <!-- Transaction Details Table -->
      <div style="background-color:#f8fafc;border:1px solid #e2e8f0;padding:18px 20px;margin:22px 0;font-family:'DM Mono',Courier,monospace;">
        <div style="font-size:10.5px;letter-spacing:1.5px;color:#000000;text-transform:uppercase;margin-bottom:12px;font-weight:800;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">
          THÔNG TIN YÊU CẦU ĐỐI SOÁT
        </div>
        <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size:12.5px;color:#1e293b;">
          <tr>
            <td width="38%" style="color:#64748b;font-weight:bold;">SỐ TIỀN YÊU CẦU:</td>
            <td><strong style="color:#000000;font-size:15px;">${amtFormatted}</strong></td>
          </tr>
          <tr>
            <td style="color:#64748b;font-weight:bold;">NGÂN HÀNG:</td>
            <td><b>${bank.bank || 'Mặc định hồ sơ'}</b></td>
          </tr>
          <tr>
            <td style="color:#64748b;font-weight:bold;">SỐ TÀI KHOẢN:</td>
            <td style="color:#2563eb;">${bank.accountNumber || '—'}</td>
          </tr>
          <tr>
            <td style="color:#64748b;font-weight:bold;">CHỦ TÀI KHOẢN:</td>
            <td style="text-transform:uppercase;">${bank.accountName || artist.name}</td>
          </tr>
          <tr>
            <td style="color:#64748b;font-weight:bold;">TRẠNG THÁI:</td>
            <td><span style="color:#dc2626;font-weight:bold;">TỪ CHỐI THANH TOÁN</span></td>
          </tr>
        </table>
      </div>

      <p style="font-size:13px;color:#6b7280;line-height:1.6;font-family:'Manrope',sans-serif;">
        Số dư của bạn đã được hoàn trả lại ví khả dụng trên hệ thống. Bạn có thể kiểm tra lại thông tin ngân hàng trong mục <i>Cài đặt hồ sơ</i> trên UniPORTAL (by UniENGINE) và gửi lại yêu cầu rút tiền bất cứ lúc nào.
      </p>
    `;
  } else {
    contentHtml = `
      <p style="font-size:16px;color:#111827;font-weight:700;margin-top:0;font-family:'Manrope',sans-serif;">
        Chào ${artist.name || 'Nghệ sĩ'},
      </p>
      <p style="color:#374151;line-height:1.65;font-family:'Manrope',sans-serif;">
        Ban quản trị <b>UniFLOWs Record Label</b> xin thông báo khoản yêu cầu rút tiền của bạn đã được phê duyệt và <b>chuyển khoản hoàn tất</b> vào tài khoản ngân hàng thụ hưởng!
      </p>

      <!-- Transaction Details Table -->
      <div style="background-color:#f8fafc;border:1px solid #e2e8f0;padding:18px 20px;margin:22px 0;font-family:'DM Mono',Courier,monospace;">
        <div style="font-size:10.5px;letter-spacing:1.5px;color:#000000;text-transform:uppercase;margin-bottom:12px;font-weight:800;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">
          BIÊN NHẬN GIẢI NGÂN DOANH THU
        </div>
        <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size:12.5px;color:#1e293b;">
          <tr>
            <td width="38%" style="color:#64748b;font-weight:bold;">SỐ TIỀN GIẢI NGÂN:</td>
            <td><strong style="color:#15803d;font-size:16px;">${amtFormatted}</strong></td>
          </tr>
          <tr>
            <td style="color:#64748b;font-weight:bold;">NGÂN HÀNG THỤ HƯỞNG:</td>
            <td><b>${bank.bank || 'Mặc định hồ sơ'}</b></td>
          </tr>
          <tr>
            <td style="color:#64748b;font-weight:bold;">SỐ TÀI KHOẢN:</td>
            <td style="color:#2563eb;">${bank.accountNumber || '—'}</td>
          </tr>
          <tr>
            <td style="color:#64748b;font-weight:bold;">CHỦ TÀI KHOẢN:</td>
            <td style="text-transform:uppercase;">${bank.accountName || artist.name}</td>
          </tr>
          <tr>
            <td style="color:#64748b;font-weight:bold;">TRẠNG THÁI:</td>
            <td><span style="color:#15803d;font-weight:bold;">ĐÃ THANH TOÁN (HOÀN TẤT)</span></td>
          </tr>
        </table>
      </div>

      <p style="font-size:13px;color:#6b7280;line-height:1.6;font-family:'Manrope',sans-serif;">
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
    badgeColor: isRejected ? '#b91c1c' : '#000000',
    badgeBg: isRejected ? '#fef2f2' : '#d8ff48',
    badgeBorder: isRejected ? '#fecaca' : '#000000',
    contentHtml,
    actionBtnText: 'Mở UniPORTAL (by UniENGINE) & Đối Soát',
    actionBtnUrl: portalUrl
  });

  return await sendEmail({ to: artist.email, subject, html });
}

// ----------------------------------------------------------------------------
// 7. GỬI EMAIL THỬ NGHIỆM ĐỂ TEST CẤU HÌNH DOMAIN
// ----------------------------------------------------------------------------
export async function sendTestEmail(toEmail) {
  const cfg = getEmailConfig();

  if (!toEmail || !toEmail.includes('@')) {
    return { success: false, error: 'Địa chỉ email người nhận thử nghiệm không hợp lệ.' };
  }

  if (cfg.provider === 'brevo' && (!cfg.apiKey || !cfg.apiKey.trim())) {
    return { 
      success: false, 
      error: 'Chưa nhập API Key Brevo. Hãy dán API Key vào ô "API Key (Brevo / Resend)" trong Tab 06 và nhấn Lưu Cấu Hình.' 
    };
  }
  if (cfg.provider === 'resend' && (!cfg.apiKey || !cfg.apiKey.trim())) {
    return { 
      success: false, 
      error: 'Chưa nhập API Key Resend. Hãy dán API Key vào ô "API Key (Brevo / Resend)" trong Tab 06 và nhấn Lưu Cấu Hình.' 
    };
  }

  const subject = `🧪 [UniFLOWs Test] Kiểm tra kết nối Email Domain: ${cfg.senderEmail || 'notifications@uniflowslabel.com'}`;

  const contentHtml = `
    <p style="font-size:16px;color:#111827;font-weight:700;margin-top:0;font-family:'Manrope',sans-serif;">
      Xin chúc mừng! Hệ thống Email Domain của bạn đã hoạt động hoàn hảo.
    </p>
    <p style="color:#374151;line-height:1.65;font-family:'Manrope',sans-serif;">
      Email này được gửi tự động từ địa chỉ <b>${cfg.senderEmail || 'notifications@uniflowslabel.com'}</b> thông qua nhà cung cấp <b>${(cfg.provider || 'BREVO').toUpperCase()}</b>.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #16a34a;padding:16px 20px;font-size:13px;color:#166534;margin:20px 0;line-height:1.7;font-family:'DM Mono',Courier,monospace;">
      ✓ Kết nối API nhà cung cấp thành công.<br>
      ✓ Tên miền người gửi đã được xác thực.<br>
      ✓ Giao diện Editorial & Hero Banner Vinyl đồng bộ với Homepage.<br>
      ✓ Hệ thống sẵn sàng tự động gửi thư bàn giao, xét duyệt bài hát và đối soát rút tiền.
    </div>
  `;

  const html = buildHtmlEmailLayout({
    kicker: '07 / SYSTEM VERIFICATION',
    preheader: 'Thử nghiệm kết nối Email Domain UniFLOWs thành công!',
    headerTitle: 'Kiểm Tra Kết Nối Email Domain',
    badgeText: 'TEST PASS',
    badgeColor: '#000000',
    badgeBg: '#d8ff48',
    badgeBorder: '#000000',
    contentHtml,
    actionBtnText: 'Truy cập Admin Dashboard',
    actionBtnUrl: `${(typeof window !== 'undefined' && window.location.origin) ? window.location.origin : ''}/admin.html`
  });

  // Bật cờ bypassEnabledCheck: true để admin luôn test được API Key ngay cả khi chưa bật toggle tự động
  return await sendEmail({ to: toEmail, subject, html, text: 'Email thử nghiệm kết nối UniFLOWs thành công!', bypassEnabledCheck: true });
}

// ----------------------------------------------------------------------------
// 8. GỬI EMAIL THÔNG BÁO HÀNG LOẠT (BROADCAST NOTIFICATION DISPATCHER)
// ----------------------------------------------------------------------------
export async function sendBroadcastEmail({
  recipientEmails = [],
  recipients = [],
  subject,
  kicker = 'THÔNG BÁO QUAN TRỌNG',
  headerTitle,
  headline,
  badgeText = 'BROADCAST',
  contentHtml = '',
  message = '',
  actionBtnText = '',
  ctaText = '',
  actionBtnUrl = '',
  ctaUrl = '',
  onProgress
}) {
  const cfg = getEmailConfig();
  if (!cfg.enabled) {
    return { 
      success: false, 
      error: 'Tính năng gửi email tự động đang TẮT. Vui lòng vào Tab 06 / Cấu hình Email, tích chọn "Kích hoạt gửi Email tự động" và nhấn "Lưu Cấu Hình".' 
    };
  }

  // Hỗ trợ cả 2 tên tham số: recipientEmails hoặc recipients
  const rawList = (Array.isArray(recipientEmails) && recipientEmails.length > 0)
    ? recipientEmails
    : (Array.isArray(recipients) ? recipients : []);

  const validEmails = Array.from(new Set(
    rawList
      .map(e => String(e || '').trim().toLowerCase())
      .filter(e => e && e.includes('@'))
  ));

  if (validEmails.length === 0) {
    return { success: false, error: 'Không tìm thấy địa chỉ email người nhận hợp lệ nào trong danh sách.' };
  }

  const finalHeaderTitle = headerTitle || headline || 'Thông Báo Mới Từ UniFLOWs Label';
  const rawContent = contentHtml || message || '';

  // Chuyển định dạng xuống dòng thành các đoạn văn <p> đẹp mắt
  const finalContentHtml = (rawContent.includes('<p') || rawContent.includes('<div'))
    ? rawContent
    : rawContent
        .split(/\n\n+/)
        .map(para => `<p style="margin:0 0 14px;color:#374151;line-height:1.65;font-size:15px;font-family:'Manrope',sans-serif;">${para.replace(/\n/g, '<br>')}</p>`)
        .join('');

  const finalBtnText = actionBtnText || ctaText || '';
  const finalBtnUrl = actionBtnUrl || ctaUrl || '';

  const html = buildHtmlEmailLayout({
    kicker: kicker.toUpperCase(),
    preheader: subject,
    headerTitle: finalHeaderTitle,
    badgeText: badgeText.toUpperCase(),
    badgeColor: '#000000',
    badgeBg: '#d8ff48',
    badgeBorder: '#000000',
    contentHtml: finalContentHtml,
    actionBtnText: finalBtnText,
    actionBtnUrl: finalBtnUrl
  });

  const results = {
    total: validEmails.length,
    sent: 0,
    failed: 0,
    errors: []
  };

  for (let i = 0; i < validEmails.length; i++) {
    const toEmail = validEmails[i];
    let isSuccess = false;
    try {
      const res = await sendEmail({ to: toEmail, subject, html, bypassEnabledCheck: true });
      if (res.success) {
        results.sent++;
        isSuccess = true;
      } else {
        results.failed++;
        results.errors.push({ email: toEmail, error: res.error || 'Lỗi gửi thư' });
      }
    } catch (err) {
      results.failed++;
      results.errors.push({ email: toEmail, error: err.message });
    }

    if (typeof onProgress === 'function') {
      onProgress({
        current: i + 1,
        total: validEmails.length,
        sent: results.sent,
        failed: results.failed,
        percent: Math.round(((i + 1) / validEmails.length) * 100),
        currentRecipient: toEmail,
        success: isSuccess
      });
    }

    // Khoảng nghỉ 150ms giữa mỗi email để tránh nghẽn mạng / rate limit API
    if (i < validEmails.length - 1) {
      await new Promise(r => setTimeout(r, 150));
    }
  }

  return {
    success: results.sent > 0,
    total: validEmails.length,
    sent: results.sent,
    successCount: results.sent,
    failed: results.failed,
    failCount: results.failed,
    errors: results.errors
  };
}

// ----------------------------------------------------------------------------
// 9. SỰ KIỆN: PHẢN HỒI EMAIL A&R TRỰC TIẾP CHO HỒ SƠ DEMO (TAB 12 A&R DEMO)
// ----------------------------------------------------------------------------
export async function sendDemoReplyEmail({ to, artistName, trackName, subject, message, demoUrl }) {
  if (!to || !to.includes('@')) {
    return { success: false, error: 'Địa chỉ email người nhận không hợp lệ.' };
  }

  const paragraphs = String(message || '')
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 14px;line-height:1.7;color:#334155;font-size:14px;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');

  const contentHtml = `
    <div style="margin-bottom:16px;">
      ${paragraphs}
    </div>
    ${trackName ? `
      <div style="background:#f1f5f9;border:1px solid #cbd5e1;padding:12px 16px;border-radius:6px;font-size:12px;margin:16px 0;color:#475569;">
        🎵 <b>Bản thu / Hồ sơ tham chiếu:</b> ${trackName}
      </div>
    ` : ''}
    <div style="border-top:1px solid #e2e8f0;padding-top:14px;margin-top:20px;font-size:12.5px;color:#64748b;">
      Trân trọng,<br>
      <b style="color:#0f172a;">Đội ngũ Tuyển chọn & A&R — UniFLOWs Label</b><br>
      <span>Liên hệ: <a href="mailto:management@uniflowslabel.com" style="color:#2563eb;text-decoration:none;">management@uniflowslabel.com</a></span>
    </div>
  `;

  const html = buildHtmlEmailLayout({
    kicker: 'A&R OUTREACH',
    preheader: subject || `[UniFLOWs A&R] Phản hồi về bản demo của ${artistName || 'bạn'}`,
    headerTitle: 'A&R DEMO FEEDBACK',
    badgeText: 'A&R DIRECT',
    badgeColor: '#15803d',
    badgeBg: '#dcfce7',
    badgeBorder: '#86efac',
    contentHtml,
    actionBtnText: demoUrl ? 'NGHE LẠI BẢN DEMO ↗' : undefined,
    actionBtnUrl: demoUrl || undefined,
    footerNote: 'Email phản hồi trực tiếp từ Ban Tuyển chọn & Phát triển Nghệ sĩ (A&R) UniFLOWs Label.'
  });

  return await sendEmail({
    to,
    subject: subject || `[UniFLOWs A&R] Phản hồi về bản demo gửi tới UniFLOWs Label`,
    html,
    text: message,
    bypassEnabledCheck: true
  });
}


