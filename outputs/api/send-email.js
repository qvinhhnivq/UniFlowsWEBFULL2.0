// ==============================================================================
// VERCEL SERVERLESS FUNCTION: /api/send-email
// Hỗ trợ gửi email an toàn từ Resend / Brevo qua Serverless (Không bị lỗi CORS trình duyệt)
// ==============================================================================

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, apikey'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ hỗ trợ phương thức POST' });
  }

  try {
    const { to, subject, html, text, from, apiKey, provider } = req.body || {};

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Thiếu các trường bắt buộc: to, subject, html' });
    }

    const targetProvider = provider || (apiKey && apiKey.startsWith('re_') ? 'resend' : 'brevo');
    const senderFrom = from || 'UniFLOWs Record Label <no-reply@uniflowslabel.com>';

    // 1. GỬI QUA RESEND API (Server-side bypass CORS)
    if (targetProvider === 'resend') {
      const activeResendKey = apiKey || process.env.RESEND_API_KEY;
      if (!activeResendKey) {
        return res.status(400).json({ error: 'Chưa có Resend API Key. Vui lòng cung cấp trong cài đặt hoặc Vercel Environment Variables.' });
      }

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeResendKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: senderFrom,
          to: Array.isArray(to) ? to : [to.trim()],
          subject,
          html,
          text: text || ''
        })
      });

      const data = await resendResponse.json();
      if (resendResponse.ok) {
        return res.status(200).json({ success: true, messageId: data.id, provider: 'resend' });
      } else {
        return res.status(resendResponse.status).json({ 
          error: data.message || `Lỗi từ Resend HTTP ${resendResponse.status}`,
          details: data 
        });
      }
    }

    // 2. GỬI QUA BREVO API
    if (targetProvider === 'brevo') {
      const activeBrevoKey = apiKey || process.env.BREVO_API_KEY;
      if (!activeBrevoKey) {
        return res.status(400).json({ error: 'Chưa có Brevo API Key.' });
      }

      const senderEmail = (from && from.includes('@')) 
        ? (from.match(/<([^>]+)>/)?.[1] || from).trim()
        : 'no-reply@uniflowslabel.com';
      const senderName = from && from.includes('<') 
        ? from.split('<')[0].trim() 
        : 'UniFLOWs Record Label';

      const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': activeBrevoKey.trim(),
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: Array.isArray(to) ? to.map(e => ({ email: typeof e === 'string' ? e.trim() : e.email })) : [{ email: to.trim() }],
          subject,
          htmlContent: html,
          textContent: text || ''
        })
      });

      const data = await brevoResponse.json();
      if (brevoResponse.ok) {
        return res.status(200).json({ success: true, messageId: data.messageId, provider: 'brevo' });
      } else {
        return res.status(brevoResponse.status).json({ 
          error: data.message || `Lỗi từ Brevo HTTP ${brevoResponse.status}`,
          details: data 
        });
      }
    }

    return res.status(400).json({ error: `Provider "${targetProvider}" không được hỗ trợ.` });
  } catch (err) {
    return res.status(500).json({ error: `Lỗi Serverless Function: ${err.message}` });
  }
}
