import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ============================================================================
// CẤU HÌNH SUPABASE — Thay thế thông tin dự án của bạn tại đây
// ============================================================================
export const SUPABASE_URL = window.__SUPABASE_URL__ || 'https://oizygltqzavvymvmikzt.supabase.co';
export const SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY__ || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9penlnbHRxemF2dnltdm1pa3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNzMyOTcsImV4cCI6MjEwMjY0OTI5N30.LMaHfdvZ39LYYFAde35D4Q25Ua3H0LhE2s0_KnC5e_4';

export const isSupabaseConfigured = () => {
  return SUPABASE_URL && !SUPABASE_URL.includes('YOUR_SUPABASE_PROJECT_ID') && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY');
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

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
