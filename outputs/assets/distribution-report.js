/**
 * UniFLOWs Label — Music Distribution & Royalty Statement Engine
 * Module xử lý báo cáo phân phối, khấu trừ %, đối soát đa nền tảng và xuất CSV / PDF A4.
 */

// ============================================================================
// SAMPLE DATASET (DỮ LIỆU MẪU MẶC ĐỊNH)
// ============================================================================
export const sampleDistributionData = [
  { artist: 'Lumi', track: 'Vệt Sáng', dsp: 'Spotify', streams: 185420, revenue: 16800000, currency: 'VND', isrc: 'VN-UFL-26-00101' },
  { artist: 'Lumi', track: 'Vệt Sáng', dsp: 'Apple Music', streams: 84200, revenue: 9262000, currency: 'VND', isrc: 'VN-UFL-26-00101' },
  { artist: 'Lumi', track: 'Vệt Sáng', dsp: 'YouTube Music', streams: 142000, revenue: 6390000, currency: 'VND', isrc: 'VN-UFL-26-00101' },
  { artist: 'Lumi', track: 'Vệt Sáng', dsp: 'TikTok', streams: 390000, revenue: 3510000, currency: 'VND', isrc: 'VN-UFL-26-00101' },
  { artist: 'Lumi', track: 'Mơ Giữa Ban Ngày', dsp: 'Spotify', streams: 98400, revenue: 8856000, currency: 'VND', isrc: 'VN-UFL-26-00102' },
  { artist: 'Lumi', track: 'Mơ Giữa Ban Ngày', dsp: 'Apple Music', streams: 54100, revenue: 5951000, currency: 'VND', isrc: 'VN-UFL-26-00102' },
  { artist: 'Lumi', track: 'Mơ Giữa Ban Ngày', dsp: 'Zing MP3', streams: 110000, revenue: 2200000, currency: 'VND', isrc: 'VN-UFL-26-00102' },
  { artist: '48K', track: 'Neon Pulse', dsp: 'Spotify', streams: 245000, revenue: 22050000, currency: 'VND', isrc: 'VN-UFL-26-00201' },
  { artist: '48K', track: 'Neon Pulse', dsp: 'Apple Music', streams: 112000, revenue: 12320000, currency: 'VND', isrc: 'VN-UFL-26-00201' },
  { artist: '48K', track: 'Neon Pulse', dsp: 'Amazon Music', streams: 43000, revenue: 4730000, currency: 'VND', isrc: 'VN-UFL-26-00201' },
  { artist: '48K', track: 'Midnight Shift', dsp: 'Spotify', streams: 135000, revenue: 12150000, currency: 'VND', isrc: 'VN-UFL-26-00202' },
  { artist: '48K', track: 'Midnight Shift', dsp: 'YouTube Music', streams: 89000, revenue: 4005000, currency: 'VND', isrc: 'VN-UFL-26-00202' },
  { artist: 'Minh Trí', track: 'Giai Điệu Đêm', dsp: 'Spotify', streams: 160000, revenue: 14400000, currency: 'VND', isrc: 'VN-UFL-26-00301' },
  { artist: 'Minh Trí', track: 'Giai Điệu Đêm', dsp: 'Apple Music', streams: 72000, revenue: 7920000, currency: 'VND', isrc: 'VN-UFL-26-00301' },
  { artist: 'Minh Trí', track: 'Sóng Ngầm', dsp: 'Spotify', streams: 88000, revenue: 7920000, currency: 'VND', isrc: 'VN-UFL-26-00302' },
  { artist: 'Minh Trí', track: 'Sóng Ngầm', dsp: 'TikTok', streams: 210000, revenue: 1890000, currency: 'VND', isrc: 'VN-UFL-26-00302' },
  { artist: 'Vũ Thanh', track: 'Chân Trời Mới', dsp: 'Spotify', streams: 105000, revenue: 9450000, currency: 'VND', isrc: 'VN-UFL-26-00401' },
  { artist: 'Vũ Thanh', track: 'Chân Trời Mới', dsp: 'Apple Music', streams: 48000, revenue: 5280000, currency: 'VND', isrc: 'VN-UFL-26-00401' },
  { artist: 'The Flaws', track: 'Không Lối Thoát', dsp: 'Spotify', streams: 92000, revenue: 8280000, currency: 'VND', isrc: 'VN-UFL-26-00501' },
  { artist: 'The Flaws', track: 'Không Lối Thoát', dsp: 'Deezer', streams: 31000, revenue: 2790000, currency: 'VND', isrc: 'VN-UFL-26-00501' }
];

// DSP Meta colors & icons
export const DSP_META = {
  'Spotify': { color: '#1db954', icon: '🟢', bg: 'rgba(29,185,84,0.1)' },
  'Apple Music': { color: '#fc3c44', icon: '🍎', bg: 'rgba(252,60,68,0.1)' },
  'YouTube Music': { color: '#ff0000', icon: '▶️', bg: 'rgba(255,0,0,0.1)' },
  'TikTok': { color: '#000000', icon: '🎵', bg: 'rgba(0,0,0,0.06)' },
  'Amazon Music': { color: '#25d1da', icon: '📦', bg: 'rgba(37,209,218,0.1)' },
  'Deezer': { color: '#a238ff', icon: '🎧', bg: 'rgba(162,56,255,0.1)' },
  'Zing MP3': { color: '#8b5cf6', icon: '🟣', bg: 'rgba(139,92,246,0.1)' },
  'Tidal': { color: '#000000', icon: '🌊', bg: 'rgba(0,0,0,0.06)' },
  'SoundCloud': { color: '#ff5500', icon: '☁️', bg: 'rgba(255,85,0,0.1)' },
  'Khác': { color: '#64748b', icon: '🌐', bg: 'rgba(100,116,139,0.1)' }
};

// ============================================================================
// STATE QUẢN LÝ TẬP TRUNG
// ============================================================================
export const state = {
  records: [...sampleDistributionData],
  labelPercentage: 20, // Tỷ lệ mặc định Label giữ lại (20%)
  selectedArtist: 'all',
  selectedDsp: 'all',
  searchQuery: '',
  currency: 'VND', // 'VND' | 'USD'
  exchangeRate: 25400, // 1 USD = 25,400 VND
  statementPeriod: 'Tháng ' + (new Date().getMonth() + 1) + '/' + new Date().getFullYear(),
  isCustomLoaded: false,
  fileName: 'uniflows_sample_dataset.csv'
};

// ============================================================================
// HÀM TIỆN ÍCH ĐỊNH DẠNG SỐ & TIỀN TỆ
// ============================================================================
export function formatCurrency(amountVND, targetCurrency = state.currency) {
  const num = Number(amountVND) || 0;
  if (targetCurrency === 'USD') {
    const usd = num / state.exchangeRate;
    return '$ ' + usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return '₫ ' + Math.round(num).toLocaleString('vi-VN');
}

export function formatStreams(num) {
  return (Number(num) || 0).toLocaleString('vi-VN');
}

export function parseRawNumber(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  let clean = String(str).replace(/[₫$,\s]/g, '').trim();
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

// ============================================================================
// PARSER CSV THÔNG MINH (MULTI-DISTRIBUTOR COMPATIBLE)
// ============================================================================
export function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  const rawLines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (rawLines.length < 2) {
    throw new Error('File CSV không có đủ dữ liệu (tối thiểu 1 dòng tiêu đề và 1 dòng dữ liệu).');
  }

  function splitCSVRow(rowStr) {
    const result = [];
    let current = '';
    let insideQuotes = false;
    for (let i = 0; i < rowStr.length; i++) {
      const char = rowStr[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    return result;
  }

  const rawHeaders = splitCSVRow(rawLines[0]);
  const headers = rawHeaders.map(h => h.toLowerCase().trim());

  function findColIndex(keywords) {
    return headers.findIndex(h => keywords.some(k => h === k || h.includes(k)));
  }

  const artistIdx = findColIndex(['artist', 'artist_name', 'nghe_si', 'nghệ sĩ', 'performer', 'main_artist', 'tên nghệ sĩ']);
  const trackIdx = findColIndex(['track', 'track_title', 'title', 'song', 'bai_hat', 'bài hát', 'item_title']);
  const dspIdx = findColIndex(['dsp', 'platform', 'store', 'service', 'channel', 'nen_tang', 'nền tảng']);
  const streamsIdx = findColIndex(['streams', 'quantity', 'plays', 'units', 'luot_nghe', 'lượt nghe', 'count']);
  const revenueIdx = findColIndex(['revenue', 'amount', 'net_amount', 'gross_revenue', 'earnings', 'doanh_thu', 'doanh thu', 'royalties']);
  const currencyIdx = findColIndex(['currency', 'tien_te', 'tiền tệ']);
  const isrcIdx = findColIndex(['isrc', 'upc', 'barcode']);

  if (trackIdx === -1 && revenueIdx === -1) {
    throw new Error('Không thể nhận diện cột Tên bài hát hoặc Doanh thu trong file CSV. Vui lòng kiểm tra file mẫu.');
  }

  const records = [];
  for (let i = 1; i < rawLines.length; i++) {
    const cells = splitCSVRow(rawLines[i]);
    if (!cells || cells.length === 0 || !cells.some(Boolean)) continue;

    const artist = artistIdx !== -1 ? cells[artistIdx] || 'UniFLOWs Artist' : 'UniFLOWs Artist';
    const track = trackIdx !== -1 ? cells[trackIdx] || 'Bản ghi ' + i : 'Bản ghi ' + i;
    let dsp = dspIdx !== -1 ? cells[dspIdx] || 'Spotify' : 'Spotify';
    const dspLower = dsp.toLowerCase();
    if (dspLower.includes('spotify')) dsp = 'Spotify';
    else if (dspLower.includes('apple')) dsp = 'Apple Music';
    else if (dspLower.includes('youtube')) dsp = 'YouTube Music';
    else if (dspLower.includes('tiktok')) dsp = 'TikTok';
    else if (dspLower.includes('amazon')) dsp = 'Amazon Music';
    else if (dspLower.includes('deezer')) dsp = 'Deezer';
    else if (dspLower.includes('zing')) dsp = 'Zing MP3';
    else if (dspLower.includes('tidal')) dsp = 'Tidal';
    else if (dspLower.includes('soundcloud')) dsp = 'SoundCloud';

    let streams = streamsIdx !== -1 ? parseRawNumber(cells[streamsIdx]) : 0;
    let revenue = revenueIdx !== -1 ? parseRawNumber(cells[revenueIdx]) : 0;
    const cur = currencyIdx !== -1 && cells[currencyIdx] ? cells[currencyIdx].toUpperCase().trim() : 'VND';
    const isrc = isrcIdx !== -1 ? cells[isrcIdx] : '';

    if (cur === 'USD' && revenue < 10000) {
      revenue = revenue * state.exchangeRate;
    }

    records.push({
      artist: artist || 'Chưa định danh',
      track: track || 'Không có tên',
      dsp: dsp || 'Khác',
      streams: Math.round(streams),
      revenue: revenue,
      currency: 'VND',
      isrc: isrc
    });
  }

  return records;
}

// ============================================================================
// TÍNH TOÁN REAL-TIME & LỌC DỮ LIỆU
// ============================================================================
export function computeFilteredData() {
  const { records, labelPercentage, selectedArtist, selectedDsp, searchQuery } = state;

  const filtered = records.filter(item => {
    if (selectedArtist !== 'all' && item.artist !== selectedArtist) return false;
    if (selectedDsp !== 'all' && item.dsp !== selectedDsp) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTrack = item.track.toLowerCase().includes(q);
      const matchArtist = item.artist.toLowerCase().includes(q);
      const matchDsp = item.dsp.toLowerCase().includes(q);
      if (!matchTrack && !matchArtist && !matchDsp) return false;
    }
    return true;
  });

  let totalStreams = 0;
  let totalGrossRevenue = 0;

  filtered.forEach(row => {
    totalStreams += row.streams;
    totalGrossRevenue += row.revenue;
  });

  const labelPct = Math.max(0, Math.min(100, Number(labelPercentage) || 0));
  const artistPct = 100 - labelPct;
  const labelRetained = totalGrossRevenue * (labelPct / 100);
  const artistNetPayout = totalGrossRevenue * (artistPct / 100);

  // Group theo DSP
  const dspMap = {};
  filtered.forEach(row => {
    if (!dspMap[row.dsp]) {
      dspMap[row.dsp] = {
        name: row.dsp,
        streams: 0,
        gross: 0,
        labelShare: 0,
        artistShare: 0,
        trackCount: 0
      };
    }
    dspMap[row.dsp].streams += row.streams;
    dspMap[row.dsp].gross += row.revenue;
    dspMap[row.dsp].trackCount += 1;
  });

  const dspBreakdown = Object.values(dspMap).map(d => {
    const lShare = d.gross * (labelPct / 100);
    const aShare = d.gross * (artistPct / 100);
    const sharePct = totalGrossRevenue > 0 ? ((d.gross / totalGrossRevenue) * 100) : 0;
    return {
      ...d,
      labelShare: lShare,
      artistShare: aShare,
      sharePct: sharePct
    };
  }).sort((a, b) => b.gross - a.gross);

  // Group theo Bài Hát
  const trackMap = {};
  filtered.forEach(row => {
    const key = `${row.artist}:::${row.track}`;
    if (!trackMap[key]) {
      trackMap[key] = {
        artist: row.artist,
        track: row.track,
        isrc: row.isrc || '',
        streams: 0,
        gross: 0,
        dsps: new Set()
      };
    }
    trackMap[key].streams += row.streams;
    trackMap[key].gross += row.revenue;
    trackMap[key].dsps.add(row.dsp);
  });

  const trackBreakdown = Object.values(trackMap).map(t => {
    const lShare = t.gross * (labelPct / 100);
    const aShare = t.gross * (artistPct / 100);
    return {
      ...t,
      dspsList: Array.from(t.dsps).join(', '),
      labelShare: lShare,
      artistShare: aShare
    };
  }).sort((a, b) => b.gross - a.gross);

  const uniqueArtists = Array.from(new Set(records.map(r => r.artist))).sort();
  const uniqueDsps = Array.from(new Set(records.map(r => r.dsp))).sort();

  return {
    filteredRows: filtered,
    totalStreams,
    totalGrossRevenue,
    labelRetained,
    artistNetPayout,
    labelPct,
    artistPct,
    dspBreakdown,
    trackBreakdown,
    uniqueArtists,
    uniqueDsps
  };
}

// ============================================================================
// XUẤT BÁO CÁO CSV CHI TIẾT (ĐẦY ĐỦ CỘT KHẤU TRỪ VÀ TỔNG CỘNG)
// ============================================================================
export function exportProcessedCSV() {
  const { filteredRows, totalStreams, totalGrossRevenue, labelRetained, artistNetPayout, labelPct, artistPct } = computeFilteredData();

  if (filteredRows.length === 0) {
    alert('Không có dữ liệu để xuất CSV.');
    return;
  }

  const cur = state.currency;
  const isUSD = cur === 'USD';

  function formatVal(vnd) {
    if (isUSD) {
      return (vnd / state.exchangeRate).toFixed(2);
    }
    return Math.round(vnd);
  }

  const headers = [
    'Nghệ sĩ (Artist)',
    'Tên bài hát (Track Title)',
    'Nền tảng (DSP / Platform)',
    'Mã ISRC',
    'Lượt stream (Streams)',
    `Doanh thu gộp Gross (${cur})`,
    'Tỷ lệ Label (%)',
    `Khấu trừ Label Share (${cur})`,
    'Tỷ lệ Nghệ sĩ (%)',
    `Nghệ sĩ thực nhận Net (${cur})`,
    'Kỳ đối soát'
  ];

  const rows = [headers];

  filteredRows.forEach(row => {
    const gross = row.revenue;
    const lShare = gross * (labelPct / 100);
    const aShare = gross * (artistPct / 100);

    rows.push([
      `"${row.artist.replace(/"/g, '""')}"`,
      `"${row.track.replace(/"/g, '""')}"`,
      `"${row.dsp.replace(/"/g, '""')}"`,
      `"${row.isrc || ''}"`,
      row.streams,
      formatVal(gross),
      `${labelPct}%`,
      formatVal(lShare),
      `${artistPct}%`,
      formatVal(aShare),
      `"${state.statementPeriod}"`
    ]);
  });

  rows.push([
    '"TỔNG CỘNG (TOTAL)"',
    `"Toàn bộ ${filteredRows.length} bản ghi"`,
    '""',
    '""',
    totalStreams,
    formatVal(totalGrossRevenue),
    `${labelPct}%`,
    formatVal(labelRetained),
    `${artistPct}%`,
    formatVal(artistNetPayout),
    `"${state.statementPeriod}"`
  ]);

  const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const artistTag = state.selectedArtist === 'all' ? 'All_Artists' : state.selectedArtist.replace(/\s+/g, '_');
  const dspTag = state.selectedDsp === 'all' ? 'All_DSPs' : state.selectedDsp.replace(/\s+/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `UniFLOWs_Royalty_Statement_${artistTag}_${dspTag}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// TẢI FILE CSV MẪU (CSV TEMPLATE)
// ============================================================================
export function downloadCSVTemplate() {
  const templateHeaders = ['artist', 'track', 'dsp', 'streams', 'revenue', 'currency', 'isrc'];
  const templateRows = [
    templateHeaders,
    ['Lumi', 'Vệt Sáng', 'Spotify', 185420, 16800000, 'VND', 'VN-UFL-26-00101'],
    ['Lumi', 'Vệt Sáng', 'Apple Music', 84200, 9262000, 'VND', 'VN-UFL-26-00101'],
    ['48K', 'Neon Pulse', 'Spotify', 245000, 22050000, 'VND', 'VN-UFL-26-00201'],
    ['Minh Trí', 'Giai Điệu Đêm', 'YouTube Music', 95000, 4275000, 'VND', 'VN-UFL-26-00301']
  ];

  const csvContent = '\uFEFF' + templateRows.map(r => r.join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'UniFLOWs_Distribution_Template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// XUẤT PHIẾU ĐỐI SOÁT PDF A4 CHUYÊN NGHIỆP (ROYALTY STATEMENT)
// ============================================================================
export function generateRoyaltyStatementHTML() {
  const { totalStreams, totalGrossRevenue, labelRetained, artistNetPayout, labelPct, artistPct, dspBreakdown, trackBreakdown } = computeFilteredData();

  const artistDisplay = state.selectedArtist === 'all' 
    ? 'Toàn bộ Hãng đĩa (Catalogue Statement)' 
    : state.selectedArtist;
  
  const dspDisplay = state.selectedDsp === 'all' ? 'Tất cả DSP (Global Digital Services)' : state.selectedDsp;
  const statementId = 'UFL-ROY-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);
  const printDate = new Date().toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });

  const dspRowsHTML = dspBreakdown.map((item) => `
    <tr>
      <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">
        ${item.name}
      </td>
      <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: 'DM Mono', monospace;">
        ${formatStreams(item.streams)}
      </td>
      <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: 'DM Mono', monospace; font-weight: 600;">
        ${formatCurrency(item.gross)}
      </td>
      <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: 'DM Mono', monospace; color: #b45309;">
        ${formatCurrency(item.labelShare)}
      </td>
      <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: 'DM Mono', monospace; font-weight: 700; color: #15803d;">
        ${formatCurrency(item.artistShare)}
      </td>
      <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: 'DM Mono', monospace; color: #64748b;">
        ${item.sharePct.toFixed(1)}%
      </td>
    </tr>
  `).join('');

  const trackRowsHTML = trackBreakdown.slice(0, 14).map((t, idx) => `
    <tr>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: 'DM Mono', monospace; color: #94a3b8; width: 30px;">
        ${String(idx + 1).padStart(2, '0')}
      </td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">
        ${t.track}
        <small style="display: block; font-weight: normal; color: #64748b; font-size: 11px;">${t.artist} ${t.isrc ? '· ' + t.isrc : ''}</small>
      </td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #475569;">
        ${t.dspsList}
      </td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: 'DM Mono', monospace;">
        ${formatStreams(t.streams)}
      </td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: 'DM Mono', monospace; font-weight: 600;">
        ${formatCurrency(t.gross)}
      </td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: 'DM Mono', monospace; font-weight: 700; color: #15803d;">
        ${formatCurrency(t.artistShare)}
      </td>
    </tr>
  `).join('');

  return `
    <div class="a4-royalty-statement-sheet" style="
      background: #ffffff;
      color: #0b0b0b;
      font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 32px 38px;
      margin: 0 auto;
      max-width: 820px;
      box-sizing: border-box;
      line-height: 1.45;
      font-size: 12.5px;
    ">
      <!-- HEADER VỚI LOGO & BRANDING UNIFLOWS -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0b0b0b; padding-bottom: 18px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <img src="/assets/logo.jpg" alt="UniFLOWs Label" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #0b0b0b;" onerror="this.style.display='none'">
          <div>
            <span style="font-size: 25px; font-weight: 900; letter-spacing: -0.06em; line-height: 1; display: block; font-family: 'Manrope', sans-serif;">UNIFLOWS LABEL</span>
            <span style="font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #64748b; margin-top: 4px; display: block;">MAKE THE WORLD MOVE · ROYALTY ACCOUNTING</span>
            <span style="font-size: 11px; color: #475569; margin-top: 3px; display: block;">Hồ Chí Minh City, Vietnam · hello@uniflowslabel.com</span>
          </div>
        </div>

        <div style="text-align: right;">
          <span style="display: inline-block; background: #0b0b0b; color: #d8ff48; font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 3px; text-transform: uppercase; letter-spacing: 1px;">
            OFFICIAL ROYALTY STATEMENT
          </span>
          <div style="margin-top: 8px; font-family: 'DM Mono', monospace; font-size: 11px; color: #475569;">
            <div>Mã số: <b style="color: #0b0b0b;">${statementId}</b></div>
            <div>Ngày phát hành: <b>${printDate}</b></div>
          </div>
        </div>
      </div>

      <!-- THÔNG TIN ĐỐI TÁC / NGHỆ SĨ & KỲ ĐỐI SOÁT -->
      <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px 18px; margin-bottom: 20px;">
        <div>
          <span style="font-family: 'DM Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; display: block;">Đối tác thụ hưởng / Nghệ sĩ (Beneficiary):</span>
          <h2 style="font-size: 18px; margin: 4px 0 2px; font-weight: 800; letter-spacing: -0.03em; color: #0b0b0b;">${artistDisplay}</h2>
          <span style="font-size: 11px; color: #475569;">Phạm vi đối soát: ${dspDisplay}</span>
        </div>
        <div style="border-left: 1px dashed #cbd5e1; padding-left: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748b; font-size: 11px;">Kỳ đối soát:</span>
            <strong style="font-family: 'DM Mono', monospace;">${state.statementPeriod}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748b; font-size: 11px;">Tỷ lệ phân chia:</span>
            <strong style="font-family: 'DM Mono', monospace; color: #15803d;">Hãng ${labelPct}% / Nghệ sĩ ${artistPct}%</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b; font-size: 11px;">Đơn vị tiền tệ:</span>
            <strong style="font-family: 'DM Mono', monospace;">${state.currency}</strong>
          </div>
        </div>
      </div>

      <!-- 4 THẺ TỔNG QUAN TÀI CHÍNH (EXECUTIVE SUMMARY) -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 22px;">
        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-top: 3px solid #3b82f6; padding: 12px; border-radius: 4px;">
          <span style="font-family: 'DM Mono', monospace; font-size: 9.5px; text-transform: uppercase; color: #3b82f6; font-weight: 700; display: block;">🎧 TỔNG LƯỢT STREAM</span>
          <strong style="font-size: 18px; display: block; margin-top: 4px; letter-spacing: -0.04em; color: #0f172a; font-family: 'DM Mono', monospace;">
            ${formatStreams(totalStreams)}
          </strong>
          <small style="color: #64748b; font-size: 10px;">Toàn cầu DSPs</small>
        </div>

        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-top: 3px solid #0b0b0b; padding: 12px; border-radius: 4px;">
          <span style="font-family: 'DM Mono', monospace; font-size: 9.5px; text-transform: uppercase; color: #0b0b0b; font-weight: 700; display: block;">💰 DOANH THU GỘP</span>
          <strong style="font-size: 18px; display: block; margin-top: 4px; letter-spacing: -0.04em; color: #0f172a; font-family: 'DM Mono', monospace;">
            ${formatCurrency(totalGrossRevenue)}
          </strong>
          <small style="color: #64748b; font-size: 10px;">100% Gross Royalties</small>
        </div>

        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-top: 3px solid #b45309; padding: 12px; border-radius: 4px;">
          <span style="font-family: 'DM Mono', monospace; font-size: 9.5px; text-transform: uppercase; color: #b45309; font-weight: 700; display: block;">🏛️ LABEL GIỮ (${labelPct}%)</span>
          <strong style="font-size: 18px; display: block; margin-top: 4px; letter-spacing: -0.04em; color: #92400e; font-family: 'DM Mono', monospace;">
            ${formatCurrency(labelRetained)}
          </strong>
          <small style="color: #64748b; font-size: 10px;">Phí phân phối & A&R</small>
        </div>

        <div style="background: #f0fdf4; border: 1.5px solid #16a34a; border-top: 3px solid #15803d; padding: 12px; border-radius: 4px;">
          <span style="font-family: 'DM Mono', monospace; font-size: 9.5px; text-transform: uppercase; color: #15803d; font-weight: 800; display: block;">💳 NGHỆ SĨ THỰC NHẬN</span>
          <strong style="font-size: 18px; display: block; margin-top: 4px; letter-spacing: -0.04em; color: #15803d; font-family: 'DM Mono', monospace;">
            ${formatCurrency(artistNetPayout)}
          </strong>
          <small style="color: #166534; font-size: 10px; font-weight: 600;">Số tiền giải ngân (${artistPct}%)</small>
        </div>
      </div>

      <!-- BẢNG 1: ĐỐI SOÁT CHI TIẾT THEO NỀN TẢNG (DSP BREAKDOWN CÓ HÀNG TỔNG CỘNG) -->
      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; color: #0b0b0b;">
            1. Bảng Chi Tiết Nền Tảng Phân Phối (DSP Breakdown)
          </h3>
          <span style="font-family: 'DM Mono', monospace; font-size: 10.5px; color: #64748b;">${dspBreakdown.length} nền tảng</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background: #0f172a; color: #ffffff; font-family: 'DM Mono', monospace; font-size: 10px; text-transform: uppercase;">
              <th style="padding: 8px 12px; text-align: left;">Nền tảng (DSP)</th>
              <th style="padding: 8px 12px; text-align: right;">Lượt Stream</th>
              <th style="padding: 8px 12px; text-align: right;">Doanh thu Gộp</th>
              <th style="padding: 8px 12px; text-align: right;">Khấu trừ (${labelPct}%)</th>
              <th style="padding: 8px 12px; text-align: right;">Thực nhận (${artistPct}%)</th>
              <th style="padding: 8px 12px; text-align: right;">Thị phần</th>
            </tr>
          </thead>
          <tbody>
            ${dspRowsHTML}
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; border-top: 2px solid #0f172a; font-weight: 800; font-size: 12px;">
              <td style="padding: 10px 12px; text-transform: uppercase; color: #0f172a; font-family: 'DM Mono', monospace;">
                ★ TỔNG CỘNG (TOTAL)
              </td>
              <td style="padding: 10px 12px; text-align: right; font-family: 'DM Mono', monospace;">
                ${formatStreams(totalStreams)}
              </td>
              <td style="padding: 10px 12px; text-align: right; font-family: 'DM Mono', monospace; color: #0f172a;">
                ${formatCurrency(totalGrossRevenue)}
              </td>
              <td style="padding: 10px 12px; text-align: right; font-family: 'DM Mono', monospace; color: #b45309;">
                ${formatCurrency(labelRetained)}
              </td>
              <td style="padding: 10px 12px; text-align: right; font-family: 'DM Mono', monospace; color: #15803d; font-size: 13px;">
                ${formatCurrency(artistNetPayout)}
              </td>
              <td style="padding: 10px 12px; text-align: right; font-family: 'DM Mono', monospace; color: #0f172a;">
                100.0%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- BẢNG 2: TOP BÀI HÁT PHÁT SINH DOANH THU CAO NHẤT -->
      <div style="margin-bottom: 22px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; color: #0b0b0b;">
            2. Danh Sách Bài Hát & Doanh Thu Chi Tiết (Track Performance)
          </h3>
          <span style="font-family: 'DM Mono', monospace; font-size: 10.5px; color: #64748b;">${trackBreakdown.length} bài hát</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1.5px solid #cbd5e1; color: #475569; font-family: 'DM Mono', monospace; font-size: 10px; text-transform: uppercase;">
              <th style="padding: 7px 10px; text-align: left;">#</th>
              <th style="padding: 7px 10px; text-align: left;">Tên bài hát & Nghệ sĩ</th>
              <th style="padding: 7px 10px; text-align: left;">DSPs</th>
              <th style="padding: 7px 10px; text-align: right;">Lượt Stream</th>
              <th style="padding: 7px 10px; text-align: right;">Doanh thu Gộp</th>
              <th style="padding: 7px 10px; text-align: right;">Nghệ sĩ Thực nhận</th>
            </tr>
          </thead>
          <tbody>
            ${trackRowsHTML}
          </tbody>
        </table>
      </div>

      <!-- CHỮ KÝ & XÁC NHẬN ĐỐI SOÁT PHÁP LÝ -->
      <div style="margin-top: 26px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; page-break-inside: avoid;">
        <div>
          <span style="font-family: 'DM Mono', monospace; font-size: 10px; text-transform: uppercase; color: #64748b; display: block;">ĐẠI DIỆN HÃNG ĐĨA (UNIFLOWS LABEL)</span>
          <p style="font-size: 11px; color: #475569; margin: 4px 0 45px;">Kế toán Trưởng & Trưởng bộ phận Phân phối DSP</p>
          <div style="border-top: 1px solid #0b0b0b; width: 180px; padding-top: 4px; font-weight: bold; font-size: 11px;">
            UniFLOWs Accounting Team
          </div>
        </div>

        <div style="text-align: right;">
          <span style="font-family: 'DM Mono', monospace; font-size: 10px; text-transform: uppercase; color: #64748b; display: block;">ĐẠI DIỆN NGHỆ SĨ / CHỦ THỂ BẢN QUYỀN</span>
          <p style="font-size: 11px; color: #475569; margin: 4px 0 45px;">Xác nhận số liệu đối soát & phương thức giải ngân</p>
          <div style="border-top: 1px solid #0b0b0b; width: 180px; padding-top: 4px; font-weight: bold; font-size: 11px; margin-left: auto;">
            ${artistDisplay}
          </div>
        </div>
      </div>

      <!-- FOOTER BẢO MẬT & BẢN QUYỀN -->
      <div style="margin-top: 22px; padding-top: 12px; border-top: 1px dashed #cbd5e1; font-family: 'DM Mono', monospace; font-size: 9.5px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center;">
        <span>UniFLOWs Entertainment JSC · Confidential Royalty Statement</span>
        <span>Hệ thống đối soát tự động UniFLOWs Engine 2.0</span>
      </div>
    </div>
  `;
}

// ============================================================================
// MỞ HỘP THOẠI XEM TRƯỚC VÀ IN PDF A4
// ============================================================================
export function openRoyaltyStatementPreview() {
  const dialog = document.querySelector('#admin-royalty-statement-dialog');
  const printableArea = document.querySelector('#admin-royalty-printable-area');

  if (!dialog || !printableArea) {
    alert('Không tìm thấy hộp thoại đối soát PDF.');
    return;
  }

  printableArea.innerHTML = generateRoyaltyStatementHTML();
  dialog.showModal();
}

// ============================================================================
// HÀM IN A4 KHÔNG LÀM RELOAD TRANG WEB (CLEAN PRINT ENGINE)
// ============================================================================
export function printRoyaltyStatement() {
  const printContent = document.querySelector('#admin-royalty-printable-area');
  if (!printContent) return;

  let iframe = document.getElementById('ufl-print-frame');
  if (iframe) iframe.remove();

  iframe = document.createElement('iframe');
  iframe.id = 'ufl-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>UniFLOWs_Royalty_Statement_${state.statementPeriod.replace(/\\//g, '-')}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&family=Manrope:wght@400;600;700;800;900&display=swap');
        @page {
          size: A4 portrait;
          margin: 10mm 12mm;
        }
        body {
          margin: 0;
          padding: 0;
          background: #fff;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        table {
          page-break-inside: auto;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
      </style>
    </head>
    <body>
      ${printContent.innerHTML}
    </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 400);
}

// ============================================================================
// RENDER GIAO DIỆN CHÍNH TAB ĐỐI SOÁT PHÂN PHỐI (ADMIN DASHBOARD)
// ============================================================================
export function renderDistributionTab() {
  const container = document.querySelector('#admin-tab-distribution');
  if (!container) return;

  const data = computeFilteredData();
  const { totalStreams, totalGrossRevenue, labelRetained, artistNetPayout, labelPct, artistPct, dspBreakdown, trackBreakdown, uniqueArtists, uniqueDsps } = data;

  const artistOptions = ['<option value="all">🌐 Toàn bộ nghệ sĩ (All Artists)</option>']
    .concat(uniqueArtists.map(a => `<option value="${a}" ${state.selectedArtist === a ? 'selected' : ''}>👤 ${a}</option>`))
    .join('');

  const dspOptions = ['<option value="all">🌐 Tất cả nền tảng (All DSPs)</option>']
    .concat(uniqueDsps.map(d => `<option value="${d}" ${state.selectedDsp === d ? 'selected' : ''}>${DSP_META[d]?.icon || '●'} ${d}</option>`))
    .join('');

  const dspCardsHTML = dspBreakdown.map(d => {
    const meta = DSP_META[d.name] || DSP_META['Khác'];
    return `
      <div style="background: #fff; border: 1px solid var(--ink); padding: 14px 16px; border-radius: 8px; border-top: 3px solid ${meta.color};">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
          <strong style="font-size: 13px; color: #0f172a; display: flex; align-items: center; gap: 6px;">
            <span>${meta.icon}</span> ${d.name}
          </strong>
          <span style="font-family:'DM Mono',monospace; font-size: 11px; font-weight: bold; background: ${meta.bg}; color: ${meta.color}; padding: 2px 7px; border-radius: 4px;">
            ${d.sharePct.toFixed(1)}%
          </span>
        </div>
        <b style="font-size: 19px; display: block; letter-spacing: -0.04em; color: #0b0b0b; margin: 4px 0;">
          ${formatCurrency(d.gross)}
        </b>
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b; font-family:'DM Mono',monospace;">
          <span>🎧 ${formatStreams(d.streams)} streams</span>
          <span style="color: #15803d; font-weight: bold;">Net: ${formatCurrency(d.artistShare)}</span>
        </div>
        <div style="background: #e2e8f0; height: 5px; border-radius: 3px; overflow: hidden; margin-top: 8px;">
          <div style="background: ${meta.color}; width: ${d.sharePct}%; height: 100%;"></div>
        </div>
      </div>
    `;
  }).join('');

  const trackRowsHTML = trackBreakdown.map((t, idx) => {
    return `
      <tr style="border-bottom: 1px solid #e2e8f0; transition: background 0.1s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
        <td style="padding: 12px 14px; font-family: 'DM Mono', monospace; font-size: 11px; color: #94a3b8;">
          ${String(idx + 1).padStart(2, '0')}
        </td>
        <td style="padding: 12px 14px;">
          <strong style="font-size: 13px; color: #0f172a; display: block;">${t.track}</strong>
          <span style="font-size: 11px; color: #64748b;">👤 ${t.artist} ${t.isrc ? '· <code style="font-size:10px;">' + t.isrc + '</code>' : ''}</span>
        </td>
        <td style="padding: 12px 14px; font-size: 11px; color: #475569;">
          ${t.dspsList}
        </td>
        <td style="padding: 12px 14px; text-align: right; font-family: 'DM Mono', monospace; font-size: 12px;">
          ${formatStreams(t.streams)}
        </td>
        <td style="padding: 12px 14px; text-align: right; font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 600;">
          ${formatCurrency(t.gross)}
        </td>
        <td style="padding: 12px 14px; text-align: right; font-family: 'DM Mono', monospace; font-size: 12px; color: #b45309;">
          ${formatCurrency(t.labelShare)}
        </td>
        <td style="padding: 12px 14px; text-align: right; font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 800; color: #15803d;">
          ${formatCurrency(t.artistShare)}
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <!-- HEADER SECTION -->
    <div class="section-head" style="padding-left: 0; padding-right: 0; margin-bottom: 20px;">
      <div>
        <h2 style="font-size: 24px; letter-spacing: -0.04em; margin: 0;">Đối Soát Phân Phối Âm Nhạc & Khấu Trừ Doanh Thu</h2>
        <p style="font-size: 13px; opacity: 0.8; margin: 4px 0 0;">
          Xử lý Distribution Report đa nền tảng (CSV), tự động khấu trừ tỷ lệ % Label theo thời gian thực và xuất phiếu đối soát A4 PDF chuyên nghiệp.
        </p>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <span class="kicker" style="background: var(--lime); color: var(--ink); padding: 4px 8px; font-weight: bold; border-radius: 4px;">
          ⚡ Engine 2.0 Active
        </span>
      </div>
    </div>

    <!-- KHỐI ĐIỀU KHIỂN ĐẦU VÀO (CSV IMPORT & DEMO CONTROLS) -->
    <div style="background: #fff; border: 2px solid var(--ink); box-shadow: 4px 4px 0 var(--ink); border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 16px;">
        <div>
          <h3 style="margin: 0; font-size: 16px; letter-spacing: -0.03em; display: flex; align-items: center; gap: 8px;">
            <span>📥</span> Nạp Báo Cáo Phân Phối (Distribution CSV Report)
          </h3>
          <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.75;">
            Hỗ trợ file CSV xuất từ Believe, The Orchard, TuneCore, DistroKid, FUGA hoặc file chuẩn UniFLOWs.
          </p>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <input type="file" id="dist-csv-file-input" accept=".csv" style="display: none;">
          <button type="button" id="dist-btn-browse-csv" class="button" style="background: #0f172a; color: #fff; padding: 9px 16px; font-size: 11px;">
            📂 Tải Lên File CSV
          </button>
          <button type="button" id="dist-btn-load-sample" class="button alt" style="padding: 9px 14px; font-size: 11px;">
            ✨ Nạp Dữ Liệu Demo
          </button>
          <button type="button" id="dist-btn-download-tpl" class="button alt" style="padding: 9px 14px; font-size: 11px;">
            📑 Tải CSV Mẫu
          </button>
        </div>
      </div>

      <div id="dist-file-dropzone" style="border: 2px dashed #cbd5e1; border-radius: 6px; padding: 14px; text-align: center; background: #f8fafc; cursor: pointer; transition: all 0.2s;">
        <span style="font-size: 12px; color: #475569; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <span>📎</span> 
          <span>Đang sử dụng dữ liệu: <b id="dist-current-filename" style="color: #0b0b0b;">${state.fileName}</b> (${state.records.length} dòng dữ liệu bản ghi)</span>
          <span style="color: #64748b; font-size: 11px;">(Kéo thả file CSV vào đây để nạp nhanh)</span>
        </span>
      </div>
    </div>

    <!-- KHỐI CẤU HÌNH KHẤU TRỪ % VÀ BỘ LỌC TỨC THỜI (REACTIVE CONTROLS) -->
    <div style="background: #0b0b0b; color: #fff; border-radius: 8px; padding: 22px; margin-bottom: 24px; box-shadow: 4px 4px 0 var(--line);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 10px;">
        <span class="eyebrow" style="color: var(--lime); margin: 0;">REAL-TIME REVENUE SPLIT & FILTERS</span>
        <div style="display: flex; gap: 14px; align-items: center; font-size: 12px;">
          <div style="display: flex; align-items: center; gap: 6px; background: #1e293b; padding: 4px 10px; border-radius: 4px;">
            <label style="font-family:'DM Mono',monospace; font-size: 11px; text-transform: uppercase; color: #94a3b8;">Tiền tệ:</label>
            <button type="button" id="dist-cur-vnd" class="button" style="padding: 4px 10px; font-size: 11px; ${state.currency === 'VND' ? 'background:var(--lime); color:#0b0b0b; font-weight:bold;' : 'background:transparent; color:#fff;'}">VND (₫)</button>
            <button type="button" id="dist-cur-usd" class="button" style="padding: 4px 10px; font-size: 11px; ${state.currency === 'USD' ? 'background:var(--lime); color:#0b0b0b; font-weight:bold;' : 'background:transparent; color:#fff;'}">USD ($)</button>
          </div>
          <span style="font-family:'DM Mono',monospace; font-size: 10.5px; color: #94a3b8;">Tỷ giá: 1$ = ${state.exchangeRate.toLocaleString()}₫</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; align-items: flex-end;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label style="font-family:'DM Mono',monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #fff;">
              🏛️ Tỷ Lệ Hãng Giữ Lại (% Label)
            </label>
            <span id="dist-split-indicator" style="font-family:'DM Mono',monospace; font-size: 11px; color: var(--lime); font-weight: bold;">
              Hãng ${labelPct}% / Nghệ sĩ ${artistPct}%
            </span>
          </div>
          <div style="display: flex; gap: 6px;">
            <input type="number" id="dist-label-pct-input" min="0" max="100" step="1" value="${labelPct}" 
              style="width: 80px; padding: 9px; font-size: 14px; font-weight: bold; font-family:'DM Mono',monospace; border: 1px solid #475569; background: #1e293b; color: #fff; text-align: center;">
            <div style="display: flex; gap: 4px; flex: 1;">
              <button type="button" class="dist-pct-pill button alt" data-pct="10" style="flex:1; padding: 8px 2px; font-size: 11px; color: #fff; border-color: #475569;">10%</button>
              <button type="button" class="dist-pct-pill button alt" data-pct="15" style="flex:1; padding: 8px 2px; font-size: 11px; color: #fff; border-color: #475569;">15%</button>
              <button type="button" class="dist-pct-pill button alt" data-pct="20" style="flex:1; padding: 8px 2px; font-size: 11px; color: #fff; border-color: #475569;">20%</button>
              <button type="button" class="dist-pct-pill button alt" data-pct="30" style="flex:1; padding: 8px 2px; font-size: 11px; color: #fff; border-color: #475569;">30%</button>
              <button type="button" class="dist-pct-pill button alt" data-pct="50" style="flex:1; padding: 8px 2px; font-size: 11px; color: #fff; border-color: #475569;">50%</button>
            </div>
          </div>
        </div>

        <div>
          <label style="font-family:'DM Mono',monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #fff; display: block; margin-bottom: 6px;">
            👤 Lọc Theo Nghệ Sĩ
          </label>
          <select id="dist-artist-select" style="width: 100%; padding: 9px 12px; font-size: 12px; border: 1px solid #475569; background: #1e293b; color: #fff;">
            ${artistOptions}
          </select>
        </div>

        <div>
          <label style="font-family:'DM Mono',monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #fff; display: block; margin-bottom: 6px;">
            🌐 Lọc Theo Nền Tảng (DSP)
          </label>
          <select id="dist-dsp-select" style="width: 100%; padding: 9px 12px; font-size: 12px; border: 1px solid #475569; background: #1e293b; color: #fff;">
            ${dspOptions}
          </select>
        </div>

        <div>
          <label style="font-family:'DM Mono',monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #fff; display: block; margin-bottom: 6px;">
            🔍 Tìm Bài Hát / Từ Khóa
          </label>
          <input type="text" id="dist-search-input" value="${state.searchQuery}" placeholder="Nhập tên bài hát..." 
            style="width: 100%; padding: 9px 12px; font-size: 12px; border: 1px solid #475569; background: #1e293b; color: #fff;">
        </div>
      </div>
    </div>

    <!-- 4 THẺ METRIC CARDS TỔNG QUAN -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 24px;">
      <div style="background: #fff; border: 1px solid var(--ink); padding: 18px; border-radius: 8px; border-top: 4px solid #3b82f6;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #3b82f6; font-family:'DM Mono',monospace;">🎧 Tổng Lượt Stream</span>
          <span style="font-size: 10px; font-family:'DM Mono',monospace; color: #64748b;">DSPs Global</span>
        </div>
        <strong style="display: block; font-size: 28px; margin-top: 6px; letter-spacing: -0.04em; color: #0f172a; font-family:'DM Mono',monospace;">
          ${formatStreams(totalStreams)}
        </strong>
        <span style="font-size: 11px; opacity: 0.7; margin-top: 4px; display: block;">Từ các đối tác phân phối</span>
      </div>

      <div style="background: #fff; border: 1px solid var(--ink); padding: 18px; border-radius: 8px; border-top: 4px solid #0b0b0b;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #0b0b0b; font-family:'DM Mono',monospace;">💰 Doanh Thu Gộp (Gross)</span>
          <span style="font-size: 10px; font-family:'DM Mono',monospace; color: #64748b;">100% DSPs</span>
        </div>
        <strong style="display: block; font-size: 28px; margin-top: 6px; letter-spacing: -0.04em; color: #0b0b0b; font-family:'DM Mono',monospace;">
          ${formatCurrency(totalGrossRevenue)}
        </strong>
        <span style="font-size: 11px; opacity: 0.7; margin-top: 4px; display: block;">Tổng tiền phát sinh trước phí</span>
      </div>

      <div style="background: #fff; border: 1px solid var(--ink); padding: 18px; border-radius: 8px; border-top: 4px solid #b45309;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #b45309; font-family:'DM Mono',monospace;">🏛️ Hãng Giữ Lại (${labelPct}%)</span>
          <span style="font-size: 10px; font-family:'DM Mono',monospace; color: #b45309; font-weight:bold;">Label Share</span>
        </div>
        <strong style="display: block; font-size: 28px; margin-top: 6px; letter-spacing: -0.04em; color: #92400e; font-family:'DM Mono',monospace;">
          ${formatCurrency(labelRetained)}
        </strong>
        <span style="font-size: 11px; opacity: 0.7; margin-top: 4px; display: block;">Phí vận hành & phát hành hãng</span>
      </div>

      <div style="background: #f0fdf4; border: 1.5px solid #16a34a; padding: 18px; border-radius: 8px; border-top: 4px solid #15803d; box-shadow: 2px 2px 0 #15803d;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #15803d; font-family:'DM Mono',monospace;">💳 Nghệ Sĩ Thực Nhận (${artistPct}%)</span>
          <span style="font-size: 10px; font-family:'DM Mono',monospace; background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 3px; font-weight: bold;">Net Payout</span>
        </div>
        <strong style="display: block; font-size: 28px; margin-top: 6px; letter-spacing: -0.04em; color: #15803d; font-family:'DM Mono',monospace;">
          ${formatCurrency(artistNetPayout)}
        </strong>
        <span style="font-size: 11px; color: #166534; margin-top: 4px; display: block; font-weight: 600;">Số tiền giải ngân về tài khoản</span>
      </div>
    </div>

    <!-- KHỐI THAO TÁC XUẤT BÁO CÁO (EXPORT ACTIONS) -->
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
      <div>
        <strong style="font-size: 14px; color: #0f172a; display: block;">Xuất Báo Cáo & Phiếu Đối Soát Bản Quyền</strong>
        <span style="font-size: 12px; color: #64748b;">Tải về file dữ liệu chi tiết hoặc in bản đối soát A4 có logo và chữ ký xác nhận.</span>
      </div>

      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <button type="button" id="dist-btn-export-csv" class="button" style="background: #15803d; border-color: #15803d; color: #fff; font-weight: bold; padding: 11px 18px; font-size: 11.5px;">
          📥 Xuất File CSV (Chi Tiết & Khấu Trừ)
        </button>
        <button type="button" id="dist-btn-open-pdf" class="button" style="background: #0f172a; border-color: #0f172a; color: #fff; font-weight: bold; padding: 11px 18px; font-size: 11.5px;">
          🖨️ Xem & Xuất Phiếu Đối Soát PDF (A4)
        </button>
      </div>
    </div>

    <!-- BẢNG 1: THỊ PHẦN THEO NỀN TẢNG (DSP BREAKDOWN) -->
    <div style="background: #fff; border: 1px solid var(--ink); border-radius: 8px; padding: 22px; margin-bottom: 24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px; flex-wrap:wrap; gap:8px;">
        <div>
          <h3 style="font-size: 16px; margin: 0;">🌐 Báo Cáo Phân Bổ Nền Tảng (DSP Breakdown)</h3>
          <p style="font-size: 12px; opacity: 0.75; margin: 2px 0 0;">Thống kê chi tiết streams, doanh thu gộp, phần hãng giữ và nghệ sĩ thực nhận từng nền tảng.</p>
        </div>
        <span class="kicker">Market Share & Royalties</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px;">
        ${dspCardsHTML}
      </div>

      <!-- Bảng tóm tắt DSP có hàng TỔNG CỘNG -->
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-family: 'DM Mono', monospace; font-size: 11px; text-transform: uppercase;">
              <th style="padding: 10px 14px;">Nền tảng (DSP)</th>
              <th style="padding: 10px 14px; text-align: right;">Lượt Stream</th>
              <th style="padding: 10px 14px; text-align: right;">Doanh thu Gộp</th>
              <th style="padding: 10px 14px; text-align: right;">Khấu trừ Label (${labelPct}%)</th>
              <th style="padding: 10px 14px; text-align: right;">Nghệ sĩ Nhận (${artistPct}%)</th>
              <th style="padding: 10px 14px; text-align: right;">Thị phần (%)</th>
            </tr>
          </thead>
          <tbody>
            ${dspBreakdown.map(d => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 14px; font-weight: bold; color: #0f172a;">${d.name}</td>
                <td style="padding: 10px 14px; text-align: right; font-family: 'DM Mono', monospace;">${formatStreams(d.streams)}</td>
                <td style="padding: 10px 14px; text-align: right; font-family: 'DM Mono', monospace; font-weight: 600;">${formatCurrency(d.gross)}</td>
                <td style="padding: 10px 14px; text-align: right; font-family: 'DM Mono', monospace; color: #b45309;">${formatCurrency(d.labelShare)}</td>
                <td style="padding: 10px 14px; text-align: right; font-family: 'DM Mono', monospace; font-weight: bold; color: #15803d;">${formatCurrency(d.artistShare)}</td>
                <td style="padding: 10px 14px; text-align: right; font-family: 'DM Mono', monospace; color: #64748b;">${d.sharePct.toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; border-top: 2px solid var(--ink); font-weight: bold;">
              <td style="padding: 12px 14px; font-family: 'DM Mono', monospace; text-transform: uppercase;">★ TỔNG CỘNG (TOTAL)</td>
              <td style="padding: 12px 14px; text-align: right; font-family: 'DM Mono', monospace;">${formatStreams(totalStreams)}</td>
              <td style="padding: 12px 14px; text-align: right; font-family: 'DM Mono', monospace; color: #0b0b0b;">${formatCurrency(totalGrossRevenue)}</td>
              <td style="padding: 12px 14px; text-align: right; font-family: 'DM Mono', monospace; color: #b45309;">${formatCurrency(labelRetained)}</td>
              <td style="padding: 12px 14px; text-align: right; font-family: 'DM Mono', monospace; color: #15803d; font-size: 13px;">${formatCurrency(artistNetPayout)}</td>
              <td style="padding: 12px 14px; text-align: right; font-family: 'DM Mono', monospace;">100.0%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- BẢNG 2: CHI TIẾT THEO BÀI HÁT (TRACK-BY-TRACK TABLE) -->
    <div style="background: #fff; border: 1px solid var(--ink); border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
      <div style="padding: 16px 20px; background: #0f172a; color: #fff; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div>
          <strong style="font-size: 15px; letter-spacing: -0.02em;">Chi Tiết Từng Bài Hát (Track-by-Track Performance)</strong>
          <span style="font-size: 12px; opacity: 0.75; display: block; margin-top: 2px;">Danh sách toàn bộ ca khúc có dữ liệu phát sinh trong kỳ đối soát.</span>
        </div>
        <span style="font-family:'DM Mono',monospace; font-size: 11px; background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 4px;">
          ${trackBreakdown.length} bài hát
        </span>
      </div>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #cbd5e1; font-family: 'DM Mono', monospace; font-size: 11px; text-transform: uppercase;">
              <th style="padding: 12px 14px; width: 40px;">#</th>
              <th style="padding: 12px 14px;">Tên bài hát & Nghệ sĩ</th>
              <th style="padding: 12px 14px;">DSPs</th>
              <th style="padding: 12px 14px; text-align: right;">Lượt Stream</th>
              <th style="padding: 12px 14px; text-align: right;">Doanh thu Gộp</th>
              <th style="padding: 12px 14px; text-align: right;">Label (${labelPct}%)</th>
              <th style="padding: 12px 14px; text-align: right;">Nghệ sĩ Thực nhận (${artistPct}%)</th>
            </tr>
          </thead>
          <tbody>
            ${trackRowsHTML.length > 0 ? trackRowsHTML : `
              <tr>
                <td colspan="7" style="padding: 30px; text-align: center; color: #64748b;">
                  Không tìm thấy bài hát nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            `}
          </tbody>
          ${trackBreakdown.length > 0 ? `
            <tfoot>
              <tr style="background: #f8fafc; border-top: 2px solid var(--ink); font-weight: bold;">
                <td colspan="3" style="padding: 12px 14px; font-family: 'DM Mono', monospace; text-transform: uppercase;">
                  ★ TỔNG CỘNG DANH MỤC (${trackBreakdown.length} bài hát)
                </td>
                <td style="padding: 12px 14px; text-align: right; font-family: 'DM Mono', monospace;">${formatStreams(totalStreams)}</td>
                <td style="padding: 12px 14px; text-align: right; font-family: 'DM Mono', monospace;">${formatCurrency(totalGrossRevenue)}</td>
                <td style="padding: 12px 14px; text-align: right; font-family: 'DM Mono', monospace; color: #b45309;">${formatCurrency(labelRetained)}</td>
                <td style="padding: 12px 14px; text-align: right; font-family: 'DM Mono', monospace; color: #15803d; font-size: 13px;">${formatCurrency(artistNetPayout)}</td>
              </tr>
            </tfoot>
          ` : ''}
        </table>
      </div>
    </div>
  `;

  attachEventHandlers();
}

// ============================================================================
// GẮN SỰ KIỆN TƯƠNG TÁC CHO GIAO DIỆN
// ============================================================================
function attachEventHandlers() {
  const fileInput = document.querySelector('#dist-csv-file-input');
  const browseBtn = document.querySelector('#dist-btn-browse-csv');
  const loadSampleBtn = document.querySelector('#dist-btn-load-sample');
  const downloadTplBtn = document.querySelector('#dist-btn-download-tpl');
  const dropzone = document.querySelector('#dist-file-dropzone');
  const pctInput = document.querySelector('#dist-label-pct-input');
  const artistSelect = document.querySelector('#dist-artist-select');
  const dspSelect = document.querySelector('#dist-dsp-select');
  const searchInput = document.querySelector('#dist-search-input');
  const curVndBtn = document.querySelector('#dist-cur-vnd');
  const curUsdBtn = document.querySelector('#dist-cur-usd');
  const exportCsvBtn = document.querySelector('#dist-btn-export-csv');
  const openPdfBtn = document.querySelector('#dist-btn-open-pdf');

  browseBtn?.addEventListener('click', () => fileInput?.click());
  dropzone?.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        alert('File CSV không có dữ liệu hợp lệ.');
        return;
      }
      state.records = parsed;
      state.fileName = file.name;
      state.isCustomLoaded = true;
      state.selectedArtist = 'all';
      state.selectedDsp = 'all';
      state.searchQuery = '';
      renderDistributionTab();
      alert(`✓ Nạp thành công ${parsed.length} dòng dữ liệu phân phối từ file: ${file.name}`);
    } catch (err) {
      console.error('Lỗi khi đọc file CSV:', err);
      alert('Lỗi khi đọc file CSV: ' + err.message);
    }
    fileInput.value = '';
  });

  if (dropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#16a34a';
        dropzone.style.background = '#f0fdf4';
      });
    });
    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#cbd5e1';
        dropzone.style.background = '#f8fafc';
      });
    });
    dropzone.addEventListener('drop', async (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file && file.name.endsWith('.csv')) {
        try {
          const text = await file.text();
          const parsed = parseCSV(text);
          state.records = parsed;
          state.fileName = file.name;
          state.isCustomLoaded = true;
          state.selectedArtist = 'all';
          state.selectedDsp = 'all';
          renderDistributionTab();
          alert(`✓ Nạp thành công ${parsed.length} dòng dữ liệu từ ${file.name}`);
        } catch (err) {
          alert('Lỗi đọc CSV: ' + err.message);
        }
      }
    });
  }

  loadSampleBtn?.addEventListener('click', () => {
    state.records = [...sampleDistributionData];
    state.fileName = 'uniflows_sample_dataset.csv';
    state.isCustomLoaded = false;
    state.selectedArtist = 'all';
    state.selectedDsp = 'all';
    state.searchQuery = '';
    renderDistributionTab();
    alert('✓ Đã nạp lại bộ dữ liệu phân phối mẫu của UniFLOWs!');
  });

  downloadTplBtn?.addEventListener('click', () => {
    downloadCSVTemplate();
  });

  pctInput?.addEventListener('input', (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) val = 0;
    state.labelPercentage = Math.max(0, Math.min(100, val));
    renderDistributionTab();
  });

  document.querySelectorAll('.dist-pct-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      state.labelPercentage = Number(pill.dataset.pct) || 20;
      renderDistributionTab();
    });
  });

  artistSelect?.addEventListener('change', (e) => {
    state.selectedArtist = e.target.value;
    renderDistributionTab();
  });

  dspSelect?.addEventListener('change', (e) => {
    state.selectedDsp = e.target.value;
    renderDistributionTab();
  });

  searchInput?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderDistributionTab();
  });

  curVndBtn?.addEventListener('click', () => {
    state.currency = 'VND';
    renderDistributionTab();
  });
  curUsdBtn?.addEventListener('click', () => {
    state.currency = 'USD';
    renderDistributionTab();
  });

  exportCsvBtn?.addEventListener('click', () => {
    exportProcessedCSV();
  });

  openPdfBtn?.addEventListener('click', () => {
    openRoyaltyStatementPreview();
  });
}
