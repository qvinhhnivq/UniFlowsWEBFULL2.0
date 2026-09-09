// ============================================================================
// UNIFLOWS LABEL — EMAIL AUTOMATION ENGINE (DOMAIN CUSTOM EMAIL DISPATCHER)
// Hỗ trợ gửi email tự động từ domain riêng qua Resend, Brevo, Supabase Edge Function hoặc Webhook
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
    onBroadcastNotif: false,    // Tự động gửi khi phát broadcast toàn bộ nghệ sĩ
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
          textContent: text || ''
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
          text: text || ''
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
          text: text || ''
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
        body: JSON.stringify({ from: sender, to: to.trim(), subject, html, text })
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
// EMAIL TEMPLATE BUILDER: GIAO DIỆN HTML EMAIL CHUẨN UNIFLOWS BRANDING
// ----------------------------------------------------------------------------
function buildHtmlEmailLayout({ preheader, headerTitle, badgeText, badgeColor, contentHtml, actionBtnText, actionBtnUrl, footerNote }) {
  const origin = window.location.origin;
  const portalUrl = actionBtnUrl || `${origin}/portal.html`;

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headerTitle || 'UniFLOWs Label'}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;-webkit-font-smoothing:antialiased;">
  <!-- Preheader preview text -->
  <div style="display:none;font-size:1px;color:#0b0f19;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || headerTitle}
  </div>

  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b0f19;padding:30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:#0f172a;padding:28px 32px;border-bottom:3px solid #f59e0b;text-align:left;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:#f59e0b;margin-bottom:6px;">
                      UniFLOWs Record Label &bull; Artist Portal
                    </div>
                    <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:800;letter-spacing:-0.02em;">
                      ${headerTitle}
                    </h1>
                  </td>
                  ${badgeText ? `
                  <td align="right" valign="top">
                    <span style="display:inline-block;padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;background-color:${badgeColor || '#2563eb'};color:#ffffff;">
                      ${badgeText}
                    </span>
                  </td>
                  ` : ''}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:32px;font-size:14px;line-height:1.6;color:#334155;">
              ${contentHtml}

              ${actionBtnText ? `
              <div style="margin-top:28px;text-align:center;">
                <a href="${portalUrl}" target="_blank" style="display:inline-block;padding:14px 32px;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;border-radius:6px;box-shadow:0 4px 12px rgba(15,23,42,0.3);">
                  ${actionBtnText} &rarr;
                </a>
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;font-size:12px;color:#64748b;text-align:center;line-height:1.5;">
              ${footerNote ? `<p style="margin:0 0 8px;">${footerNote}</p>` : ''}
              <p style="margin:0;font-weight:600;color:#0f172a;">
                UniFLOWs Label &bull; MAKE THE WORLD MOVE.
              </p>
              <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;">
                Hồ Chí Minh, Việt Nam &bull; <a href="${origin}" target="_blank" style="color:#2563eb;text-decoration:none;">uniflowslabel.com</a>
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

  const origin = window.location.origin;
  const loginUrl = `${origin}/artist-login.html`;
  const subject = `🎉 Chào mừng đến với UniFLOWs! Phiếu bàn giao tài khoản Artist Portal: ${artist.name}`;

  const contentHtml = `
    <p style="font-size:16px;color:#0f172a;font-weight:700;margin-top:0;">
      Xin chào ${artist.name},
    </p>
    <p>
      Ban quản trị <b>UniFLOWs Record Label</b> xin chúc mừng và hoan nghênh bạn chính thức gia nhập hệ sinh thái phân phối & phát triển âm nhạc của chúng tôi!
    </p>
    <p>
      Dưới đây là thông tin đăng nhập vào <b>Artist Portal</b> dành riêng cho bạn để quản lý các bản phát hành, tải lên file Master chất lượng cao, theo dõi thống kê streaming toàn cầu và đối soát doanh thu:
    </p>

    <!-- Handover Vault Card -->
    <div style="background-color:#f1f5f9;border:2px solid #cbd5e1;border-radius:8px;padding:20px;margin:20px 0;font-family:'Courier New',Courier,monospace;">
      <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size:13px;color:#0f172a;">
        <tr>
          <td width="38%" style="color:#64748b;font-weight:bold;">👤 TÊN HIỂN THỊ:</td>
          <td><b>${artist.name}</b></td>
        </tr>
        <tr>
          <td style="color:#64748b;font-weight:bold;">🔑 USERNAME:</td>
          <td style="color:#1d4ed8;font-weight:bold;font-size:15px;">${artist.username || artist.id}</td>
        </tr>
        <tr>
          <td style="color:#64748b;font-weight:bold;">📧 EMAIL LIÊN KẾT:</td>
          <td>${artist.email}</td>
        </tr>
        <tr>
          <td style="color:#64748b;font-weight:bold;">🔒 MẬT KHẨU BAN ĐẦU:</td>
          <td style="color:#b91c1c;font-weight:bold;font-size:15px;background:#fee2e2;padding:4px 8px;border-radius:4px;display:inline-block;">${artist.password}</td>
        </tr>
        <tr>
          <td style="color:#64748b;font-weight:bold;">📜 PHÂN QUYỀN / VAI TRÒ:</td>
          <td><b>${artist.roleType || 'Nghệ sĩ Độc quyền'}</b></td>
        </tr>
        <tr>
          <td style="color:#64748b;font-weight:bold;">💳 TỶ LỆ ROYALTY:</td>
          <td>${artist.royaltyRate || '80% Master'}</td>
        </tr>
        <tr>
          <td style="color:#64748b;font-weight:bold;">🕒 KỲ ĐỐI SOÁT:</td>
          <td>${artist.payoutCycle || 'Hàng tháng (Monthly)'}</td>
        </tr>
      </table>
    </div>

    <div style="background-color:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:4px;font-size:12.5px;color:#92400e;line-height:1.5;">
      💡 <b>Lưu ý bảo mật:</b> Vui lòng đổi mật khẩu ngay trong lần đăng nhập đầu tiên tại mục <i>Cài đặt hồ sơ</i> trên Artist Portal để bảo vệ quyền riêng tư và dữ liệu doanh thu của bạn.
    </div>
  `;

  const html = buildHtmlEmailLayout({
    preheader: `Thông tin tài khoản Portal của bạn tại UniFLOWs: Username: ${artist.username || artist.id}`,
    headerTitle: 'Phiếu Bàn Giao Tài Khoản Artist Portal',
    badgeText: 'MỚI KÍCH HOẠT',
    badgeColor: '#10b981',
    contentHtml,
    actionBtnText: 'Đăng Nhập Artist Portal Ngay',
    actionBtnUrl: loginUrl,
    footerNote: 'Email này chứa thông tin bảo mật tài khoản. Vui lòng không chia sẻ cho bên thứ ba.'
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

  const origin = window.location.origin;
  const portalUrl = `${origin}/portal.html?tab=releases`;
  const subject = `⚠️ [Yêu cầu chỉnh sửa] Bản phát hành "${release.title}" — UniFLOWs A&R Review`;

  const contentHtml = `
    <p style="font-size:16px;color:#0f172a;font-weight:700;margin-top:0;">
      Chào ${artist.name},
    </p>
    <p>
      Đội ngũ A&R và Quality Control của <b>UniFLOWs Label</b> đã hoàn tất xét duyệt bản phát hành <b>"${release.title}"</b> của bạn.
    </p>
    <p>
      Để đảm bảo sản phẩm đạt tiêu chuẩn phân phối quốc tế của Spotify, Apple Music và tránh bị từ chối từ DSPs, chúng tôi cần bạn hỗ trợ điều chỉnh một số chi tiết:
    </p>

    <!-- Feedback Box -->
    <div style="background-color:#fff1f2;border:1px solid #fecdd3;border-left:4px solid #e11d48;padding:16px 20px;border-radius:6px;margin:20px 0;">
      <strong style="display:block;color:#9f1239;font-size:13px;text-transform:uppercase;margin-bottom:6px;">
        💬 Góp ý & Lời nhắn từ Đội ngũ A&R:
      </strong>
      <p style="margin:0;font-size:14px;color:#881337;white-space:pre-wrap;line-height:1.6;">
        ${feedback || 'Vui lòng kiểm tra lại file âm thanh Master (chuẩn 16/24-bit 44.1kHz WAV) hoặc ảnh Artwork đúng kích thước chuẩn tối thiểu 3000x3000px, không bị mờ và không chứa logo nền tảng khác.'}
      </p>
    </div>

    <p style="font-size:13px;color:#64748b;">
      Sau khi hoàn tất chỉnh sửa, vui lòng truy cập Artist Portal để tải lại file hoặc cập nhật thông tin tương ứng. Đội ngũ sẽ tiến hành duyệt lại trong vòng 24 giờ.
    </p>
  `;

  const html = buildHtmlEmailLayout({
    preheader: `Bản phát hành "${release.title}" cần điều chỉnh theo yêu cầu của A&R`,
    headerTitle: 'Yêu Cầu Chỉnh Sửa Bản Phát Hành',
    badgeText: 'CẦN CHỈNH SỬA',
    badgeColor: '#e11d48',
    contentHtml,
    actionBtnText: 'Mở Portal & Cập Nhật Bài Hát',
    actionBtnUrl: portalUrl,
    footerNote: 'Nếu bạn có thắc mắc kỹ thuật, vui lòng phản hồi trực tiếp email này hoặc liên hệ A&R team.'
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

  const origin = window.location.origin;
  const portalUrl = `${origin}/portal.html?tab=releases`;
  const subject = `❌ [Thông báo xét duyệt] Bản phát hành "${release.title}" — UniFLOWs Label`;

  const contentHtml = `
    <p style="font-size:16px;color:#0f172a;font-weight:700;margin-top:0;">
      Chào ${artist.name},
    </p>
    <p>
      Rất tiếc, sau khi kiểm duyệt kỹ thuật và chính sách bản quyền, bản phát hành <b>"${release.title}"</b> chưa thể tiếp tục quy trình phân phối thương mại trên hệ thống của UniFLOWs.
    </p>

    <!-- Reason Box -->
    <div style="background-color:#fef2f2;border:1px solid #fee2e2;border-left:4px solid #dc2626;padding:16px 20px;border-radius:6px;margin:20px 0;">
      <strong style="display:block;color:#991b1b;font-size:13px;text-transform:uppercase;margin-bottom:6px;">
        Lý do từ chối:
      </strong>
      <p style="margin:0;font-size:14px;color:#7f1d1d;white-space:pre-wrap;line-height:1.6;">
        ${reason || 'Sản phẩm vi phạm bản quyền mẫu sample chưa được cấp phép (cleared sample), chất lượng âm thanh không đạt chuẩn thương mại hoặc thông tin tác giả/nhà sản xuất chưa được xác minh đầy đủ.'}
      </p>
    </div>

    <p style="font-size:13px;color:#64748b;">
      Bạn có thể gửi câu hỏi phản hồi hoặc tải lên bản demo khác trên Artist Portal bất cứ lúc nào.
    </p>
  `;

  const html = buildHtmlEmailLayout({
    preheader: `Bản phát hành "${release.title}" chưa đạt điều kiện phát hành`,
    headerTitle: 'Thông Báo Từ Chối Bản Phát Hành',
    badgeText: 'TỪ CHỐI',
    badgeColor: '#dc2626',
    contentHtml,
    actionBtnText: 'Xem Chi Tiết Trên Portal',
    actionBtnUrl: portalUrl,
    footerNote: 'UniFLOWs Label luôn sẵn sàng hỗ trợ bạn hoàn thiện sản phẩm ở các dự án tiếp theo.'
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

  const origin = window.location.origin;
  const portalUrl = `${origin}/portal.html?tab=releases`;
  const subject = `🎉 [Chúc mừng] Bản phát hành "${release.title}" đã được duyệt phân phối chính thức!`;

  const contentHtml = `
    <p style="font-size:16px;color:#0f172a;font-weight:700;margin-top:0;">
      Chúc mừng ${artist.name}!
    </p>
    <p>
      Bản phát hành <b>"${release.title}"</b> của bạn đã vượt qua toàn bộ các bài kiểm tra kỹ thuật và chính thức được đưa vào luồng phân phối toàn cầu của <b>UniFLOWs Label</b>!
    </p>

    <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #16a34a;padding:16px 20px;border-radius:6px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#14532d;line-height:1.6;">
        💿 <b>Tác phẩm:</b> ${release.title}<br>
        📅 <b>Ngày phát hành dự kiến:</b> ${release.release_date || release.releaseDate || 'Theo lịch trình'}<br>
        🌍 <b>Phạm vi:</b> Toàn cầu 150+ nền tảng (Spotify, Apple Music, YouTube Music, Zing MP3, v.v.)
      </p>
    </div>

    <p style="font-size:13px;color:#64748b;">
      Bạn có thể truy cập Portal để lấy Smart Link quảng bá, tạo mã QR Code hoặc theo dõi chiến dịch Pitching Playlist.
    </p>
  `;

  const html = buildHtmlEmailLayout({
    preheader: `Bản phát hành "${release.title}" đã được duyệt phân phối!`,
    headerTitle: 'Bản Phát Hành Đã Được Phê Duyệt!',
    badgeText: 'APPROVED',
    badgeColor: '#16a34a',
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
  const origin = window.location.origin;
  const actionUrl = notif.action_url ? (notif.action_url.startsWith('http') ? notif.action_url : `${origin}/${notif.action_url}`) : `${origin}/portal.html`;

  const typeLabels = {
    important: '🔥 Quan trọng',
    info: '📢 Tin tức',
    payout: '💳 Đối soát doanh thu',
    release: '💿 Bản phát hành',
    update: '⚡ Cập nhật kỹ thuật'
  };

  const contentHtml = `
    <p style="font-size:16px;color:#0f172a;font-weight:700;margin-top:0;">
      Chào ${artist.name || 'Nghệ sĩ'},
    </p>
    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;padding:18px 22px;border-radius:8px;margin:18px 0;">
      <h3 style="margin:0 0 10px;font-size:16px;color:#0f172a;">${notif.title}</h3>
      <p style="margin:0;font-size:14px;color:#334155;white-space:pre-wrap;line-height:1.6;">
        ${notif.message}
      </p>
    </div>
  `;

  const html = buildHtmlEmailLayout({
    preheader: notif.title,
    headerTitle: notif.title,
    badgeText: typeLabels[notif.type] || 'Thông Báo',
    badgeColor: notif.type === 'important' ? '#dc2626' : '#2563eb',
    contentHtml,
    actionBtnText: notif.action_url ? 'Xem Chi Tiết Ngay' : 'Mở Artist Portal',
    actionBtnUrl: actionUrl
  });

  return await sendEmail({ to: artist.email, subject, html });
}

// ----------------------------------------------------------------------------
// 6. GỬI EMAIL THỬ NGHIỆM ĐỂ TEST CẤU HÌNH DOMAIN
// ----------------------------------------------------------------------------
export async function sendTestEmail(toEmail) {
  const cfg = getEmailConfig();
  const subject = `🧪 [UniFLOWs Test] Kiểm tra kết nối Email Domain: ${cfg.senderEmail}`;

  const contentHtml = `
    <p style="font-size:16px;color:#0f172a;font-weight:700;margin-top:0;">
      Xin chúc mừng! Hệ thống Email Domain của bạn đã hoạt động hoàn hảo.
    </p>
    <p>
      Email này được gửi tự động từ địa chỉ <b>${cfg.senderEmail}</b> thông qua nhà cung cấp <b>${cfg.provider.toUpperCase()}</b>.
    </p>
    <div style="background:#f0fdf4;border:1px solid #86efac;padding:14px;border-radius:6px;font-size:13px;color:#166534;margin:15px 0;">
      ✓ Kết nối API thành công.<br>
      ✓ Tên miền người gửi đã được xác thực.<br>
      ✓ Sẵn sàng tự động gửi thư bàn giao tài khoản và thông báo bài hát.
    </div>
  `;

  const html = buildHtmlEmailLayout({
    preheader: 'Thử nghiệm kết nối Email Domain UniFLOWs thành công!',
    headerTitle: 'Kiểm Tra Kết Nối Email Domain',
    badgeText: 'TEST PASS',
    badgeColor: '#10b981',
    contentHtml,
    actionBtnText: 'Truy cập Admin Dashboard',
    actionBtnUrl: `${window.location.origin}/admin.html`
  });

  return await sendEmail({ to: toEmail, subject, html, text: 'Email thử nghiệm kết nối UniFLOWs thành công!' });
}
