import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ============================================================================
// CẤU HÌNH SUPABASE — Thay thế thông tin dự án của bạn tại đây
// ============================================================================
export const DEFAULT_SUPABASE_URL = 'https://oizygltqzavvymvmikzt.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9penlnbHRxemF2dnltdm1pa3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNzMyOTcsImV4cCI6MjEwMjY0OTI5N30.LMaHfdvZ39LYYFAde35D4Q25Ua3H0LhE2s0_KnC5e_4';

export const getSupabaseUrl = () => {
  try {
    const custom = localStorage.getItem('uniflows-supabase-url');
    if (custom && custom.trim().startsWith('http')) return custom.trim();
  } catch {}
  return window.__SUPABASE_URL__ || DEFAULT_SUPABASE_URL;
};

export const getSupabaseAnonKey = () => {
  try {
    const custom = localStorage.getItem('uniflows-supabase-key');
    if (custom && custom.trim().length > 20) return custom.trim();
  } catch {}
  return window.__SUPABASE_ANON_KEY__ || DEFAULT_SUPABASE_ANON_KEY;
};

export const SUPABASE_URL = getSupabaseUrl();
export const SUPABASE_ANON_KEY = getSupabaseAnonKey();

export const isSupabaseConfigured = () => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(
    url && 
    !url.includes('YOUR_SUPABASE_PROJECT_ID') && 
    url.startsWith('https://') &&
    key && 
    !key.includes('YOUR_SUPABASE_ANON_KEY') &&
    key.length > 20
  );
};

export function saveCustomSupabaseConfig(url, key) {
  if (url && url.trim()) {
    localStorage.setItem('uniflows-supabase-url', url.trim());
  } else {
    localStorage.removeItem('uniflows-supabase-url');
  }
  if (key && key.trim()) {
    localStorage.setItem('uniflows-supabase-key', key.trim());
  } else {
    localStorage.removeItem('uniflows-supabase-key');
  }
}

export function resetSupabaseConfig() {
  localStorage.removeItem('uniflows-supabase-url');
  localStorage.removeItem('uniflows-supabase-key');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Diagnostic tool to test connection to Supabase
export async function testSupabaseConnection() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  const startTime = Date.now();

  const report = {
    configured: isSupabaseConfigured(),
    url,
    latencyMs: 0,
    online: false,
    tables: {
      site_settings: false,
      articles: false,
      artists: false,
      releases: false,
      notifications: false,
      payout_requests: false,
      copyright_reports: false,
      greenlist_requests: false
    },
    storage: {
      artworks: false,
      audio_masters: false
    },
    errors: [],
    details: ''
  };

  if (!report.configured) {
    report.details = 'Chưa cấu hình Supabase URL hoặc Anon Key hợp lệ.';
    return report;
  }

  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Kết nối tới Supabase bị quá thời gian (Timeout 5s). Dự án có thể đang bị tạm dừng (Paused) trên Supabase hoặc mất kết nối mạng.')), 5000)
  );

  try {
    const testWork = async () => {
      // 1. Test ping site_settings
      const { data: sData, error: sErr } = await supabase.from('site_settings').select('id').limit(1);
      if (sErr) report.errors.push(`site_settings: ${sErr.message}`);
      else report.tables.site_settings = true;

      // 2. Test articles
      const { error: artErr } = await supabase.from('articles').select('id').limit(1);
      if (artErr) report.errors.push(`articles: ${artErr.message}`);
      else report.tables.articles = true;

      // 3. Test artists
      const { error: aErr } = await supabase.from('artists').select('id').limit(1);
      if (aErr) report.errors.push(`artists: ${aErr.message}`);
      else report.tables.artists = true;

      // 4. Test releases
      const { error: relErr } = await supabase.from('releases').select('id').limit(1);
      if (relErr) report.errors.push(`releases: ${relErr.message}`);
      else report.tables.releases = true;

      // 5. Test notifications
      const { error: notifErr } = await supabase.from('notifications').select('id').limit(1);
      if (notifErr) report.errors.push(`notifications: ${notifErr.message}`);
      else report.tables.notifications = true;

      // 6. Test payout_requests
      const { error: payErr } = await supabase.from('payout_requests').select('id').limit(1);
      if (payErr) report.errors.push(`payout_requests: ${payErr.message}`);
      else report.tables.payout_requests = true;

      // 7. Test copyright_reports
      const { error: crErr } = await supabase.from('copyright_reports').select('id').limit(1);
      if (crErr) report.errors.push(`copyright_reports: ${crErr.message}`);
      else report.tables.copyright_reports = true;

      // 8. Test greenlist_requests
      const { error: glErr } = await supabase.from('greenlist_requests').select('id').limit(1);
      if (glErr) report.errors.push(`greenlist_requests: ${glErr.message}`);
      else report.tables.greenlist_requests = true;

      // 9. Test storage
      try {
        const { data: bData, error: bErr } = await supabase.storage.listBuckets();
        if (!bErr && Array.isArray(bData)) {
          report.storage.artworks = bData.some(b => b.name === 'artworks');
          report.storage.audio_masters = bData.some(b => b.name === 'audio-masters');
        }
      } catch {}
    };

    await Promise.race([testWork(), timeoutPromise]);
    report.latencyMs = Date.now() - startTime;
    
    const passedCount = Object.values(report.tables).filter(Boolean).length;
    if (passedCount > 0) {
      report.online = true;
      report.details = `Đã kết nối thành công (${passedCount}/8 bảng phản hồi, độ trễ ${report.latencyMs}ms).`;
    } else {
      report.online = false;
      report.details = `Kết nối được máy chủ nhưng các bảng dữ liệu chưa sẵn sàng: ${report.errors.join('; ')}`;
    }
  } catch (err) {
    report.latencyMs = Date.now() - startTime;
    report.online = false;
    report.errors.push(err.message);
    report.details = err.message;
  }

  return report;
}


// Lấy thông tin user và profile hiện tại
export async function getCurrentUserProfile() {
  if (!isSupabaseConfigured()) return null;
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !profile) {
    return {
      id: session.user.id,
      email: session.user.email,
      role: 'artist', // fallback
      artist_id: null
    };
  }
  return profile;
}

// Upload file ảnh artwork
export async function uploadArtworkFile(file, prefix = 'artwork') {
  if (!isSupabaseConfigured()) {
    return URL.createObjectURL(file);
  }
  const ext = file.name.split('.').pop() || 'png';
  const filePath = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const { data, error } = await supabase.storage.from('artworks').upload(filePath, file, {
    cacheControl: '3600',
    upsert: false
  });
  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from('artworks').getPublicUrl(filePath);
  return publicUrl;
}

// Upload file master WAV/FLAC
export async function uploadAudioFile(file, prefix = 'master') {
  if (!isSupabaseConfigured()) {
    return URL.createObjectURL(file);
  }
  const ext = file.name.split('.').pop() || 'wav';
  const filePath = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const { data, error } = await supabase.storage.from('audio-masters').upload(filePath, file, {
    cacheControl: '3600',
    upsert: false
  });
  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from('audio-masters').getPublicUrl(filePath);
  return publicUrl;
}
