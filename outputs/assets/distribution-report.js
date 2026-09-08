/**
 * UniFLOWs Label — Music Distribution & Royalty Statement Engine
 * Module xử lý báo cáo phân phối, khấu trừ %, đối soát đa nền tảng và xuất CSV / PDF A4.
 */

// ============================================================================
// SAMPLE DATASET (DỮ LIỆU MẪU MẶC ĐỊNH)
// ============================================================================
export const sampleDistributionData = [
  { artist: 'Lumi', track: 'Vệt Sáng', dsp: 'Spotify', streams: 185420, revenue: 16800000, currency: 'VND', isrc: 'VN-UFL-26-00101', territory: 'VN', configuration: 'Stream' },
  { artist: 'Lumi', track: 'Vệt Sáng', dsp: 'Apple Music', streams: 84200, revenue: 9262000, currency: 'VND', isrc: 'VN-UFL-26-00101', territory: 'VN', configuration: 'Stream' },
  { artist: 'Lumi', track: 'Vệt Sáng', dsp: 'YouTube', streams: 142000, revenue: 6390000, currency: 'VND', isrc: 'VN-UFL-26-00101', territory: 'VN', configuration: 'Ad-supported' },
  { artist: 'Lumi', track: 'Vệt Sáng', dsp: 'TikTok', streams: 390000, revenue: 3510000, currency: 'VND', isrc: 'VN-UFL-26-00101', territory: 'VN', configuration: 'UGC' },
  { artist: 'Lumi', track: 'Mơ Giữa Ban Ngày', dsp: 'Spotify', streams: 98400, revenue: 8856000, currency: 'VND', isrc: 'VN-UFL-26-00102', territory: 'VN', configuration: 'Stream' },
  { artist: 'Lumi', track: 'Mơ Giữa Ban Ngày', dsp: 'Apple Music', streams: 54100, revenue: 5951000, currency: 'VND', isrc: 'VN-UFL-26-00102', territory: 'VN', configuration: 'Stream' },
  { artist: 'Lumi', track: 'Mơ Giữa Ban Ngày', dsp: 'Zing MP3', streams: 110000, revenue: 2200000, currency: 'VND', isrc: 'VN-UFL-26-00102', territory: 'VN', configuration: 'Stream' },
  { artist: '48K', track: 'Neon Pulse', dsp: 'Spotify', streams: 245000, revenue: 22050000, currency: 'VND', isrc: 'VN-UFL-26-00201', territory: 'VN', configuration: 'Stream' },
  { artist: '48K', track: 'Neon Pulse', dsp: 'Apple Music', streams: 112000, revenue: 12320000, currency: 'VND', isrc: 'VN-UFL-26-00201', territory: 'US', configuration: 'Stream' },
  { artist: '48K', track: 'Neon Pulse', dsp: 'Amazon Music', streams: 43000, revenue: 4730000, currency: 'VND', isrc: 'VN-UFL-26-00201', territory: 'US', configuration: 'Stream' },
  { artist: '48K', track: 'Midnight Shift', dsp: 'Spotify', streams: 135000, revenue: 12150000, currency: 'VND', isrc: 'VN-UFL-26-00202', territory: 'VN', configuration: 'Stream' },
  { artist: '48K', track: 'Midnight Shift', dsp: 'YouTube', streams: 89000, revenue: 4005000, currency: 'VND', isrc: 'VN-UFL-26-00202', territory: 'VN', configuration: 'Video Stream' },
  { artist: 'Minh Trí', track: 'Giai Điệu Đêm', dsp: 'Spotify', streams: 160000, revenue: 14400000, currency: 'VND', isrc: 'VN-UFL-26-00301', territory: 'VN', configuration: 'Stream' },
  { artist: 'Minh Trí', track: 'Giai Điệu Đêm', dsp: 'Apple Music', streams: 72000, revenue: 7920000, currency: 'VND', isrc: 'VN-UFL-26-00301', territory: 'VN', configuration: 'Stream' },
  { artist: 'Minh Trí', track: 'Sóng Ngầm', dsp: 'Spotify', streams: 88000, revenue: 7920000, currency: 'VND', isrc: 'VN-UFL-26-00302', territory: 'VN', configuration: 'Stream' },
  { artist: 'Minh Trí', track: 'Sóng Ngầm', dsp: 'TikTok', streams: 210000, revenue: 1890000, currency: 'VND', isrc: 'VN-UFL-26-00302', territory: 'VN', configuration: 'UGC' },
  { artist: 'Vũ Thanh', track: 'Chân Trời Mới', dsp: 'Spotify', streams: 105000, revenue: 9450000, currency: 'VND', isrc: 'VN-UFL-26-00401', territory: 'VN', configuration: 'Stream' },
  { artist: 'Vũ Thanh', track: 'Chân Trời Mới', dsp: 'Apple Music', streams: 48000, revenue: 5280000, currency: 'VND', isrc: 'VN-UFL-26-00401', territory: 'VN', configuration: 'Stream' },
  { artist: 'The Flaws', track: 'Không Lối Thoát', dsp: 'Spotify', streams: 92000, revenue: 8280000, currency: 'VND', isrc: 'VN-UFL-26-00501', territory: 'VN', configuration: 'Stream' },
  { artist: 'The Flaws', track: 'Không Lối Thoát', dsp: 'Deezer', streams: 31000, revenue: 2790000, currency: 'VND', isrc: 'VN-UFL-26-00501', territory: 'FR', configuration: 'Stream' }
];

// DSP Meta colors & icons
export const DSP_META = {
  'Spotify': { color: '#1db954', icon: '🟢', bg: 'rgba(29,185,84,0.1)' },
  'Apple Music': { color: '#fc3c44', icon: '🍎', bg: 'rgba(252,60,68,0.1)' },
  'YouTube': { color: '#ff0000', icon: '▶️', bg: 'rgba(255,0,0,0.1)' },
  'YouTube Red': { color: '#dc2626', icon: '🔴', bg: 'rgba(220,38,38,0.1)' },
  'YouTube Music': { color: '#dc2626', icon: '🎵', bg: 'rgba(220,38,38,0.1)' },
  'Meta': { color: '#0081fb', icon: '📸', bg: 'rgba(0,129,251,0.1)' },
  'Meta (IG & FB)': { color: '#0081fb', icon: '📸', bg: 'rgba(0,129,251,0.1)' },
  'TikTok': { color: '#000000', icon: '🎵', bg: 'rgba(0,0,0,0.08)' },
  'Amazon Music': { color: '#25d1da', icon: '📦', bg: 'rgba(37,209,218,0.1)' },
  'Deezer': { color: '#a238ff', icon: '🎧', bg: 'rgba(162,56,255,0.1)' },
  'Zing MP3': { color: '#8b5cf6', icon: '🟣', bg: 'rgba(139,92,246,0.1)' },
  'Tidal': { color: '#000000', icon: '🌊', bg: 'rgba(0,0,0,0.08)' },
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
  fileName: 'uniflows_sample_dataset.csv',
  activeView: 'summary' // 'summary' | 'transactions'
};

// ============================================================================
// HÀM TIỆN ÍCH ĐỊNH DẠNG SỐ & TIỀN TỆ
// ============================================================================
export function formatCurrency(amountVND, targetCurrency = state.currency) {
  const num = Number(amountVND) || 0;
  if (targetCurrency === 'USD') {
    const usd = num / state.exchangeRate;
    if (Math.abs(usd) > 0 && Math.abs(usd) < 0.01) {
      return '$ ' + usd.toFixed(4);
    }
    return '$ ' + usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Tiền tệ VND:
  if (num === 0) return '₫ 0';

  // Nếu số tiền có phần lẻ hoặc nhỏ hơn 1,000đ thì hiển thị 2 chữ số thập phân để không bị làm tròn thành 0
  if (Math.abs(num) > 0 && Math.abs(num) < 1000) {
    return '₫ ' + num.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (num % 1 !== 0 && Math.abs(num) < 100000) {
    return '₫ ' + num.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  // Tìm index cột với ưu tiên chính xác tuyệt đối trước, sau đó mới đến chứa từ khóa
  function findColIndex(exactCandidates, fallbackContains = []) {
    // 1. Kiểm tra chính xác tên cột
    for (const c of exactCandidates) {
      const idx = headers.indexOf(c.toLowerCase());
      if (idx !== -1) return idx;
    }
    // 2. Kiểm tra bắt đầu bằng hoặc chứa
    for (const c of fallbackContains) {
      const idx = headers.findIndex(h => h.includes(c.toLowerCase()));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  // 1. Nghệ sĩ (Artist)
  const artistIdx = findColIndex(
    ['track artist', 'release artist', 'artist_name', 'artist', 'nghe_si', 'nghệ sĩ', 'performer', 'main_artist'],
    ['artist', 'nghe_si', 'performer']
  );

  // 2. Tên bài hát (Track Title)
  const trackIdx = findColIndex(
    ['track title', 'release title', 'song_title', 'track', 'title', 'song', 'bai_hat', 'bài hát'],
    ['track', 'title', 'song', 'bai_hat']
  );

  // 3. Nguồn / Nền tảng (Source / DSP)
  // LƯU Ý QUAN TRỌNG: Không để 'channel' đè lên 'source' vì cột 'Distribution Channel' thường chỉ chứa chữ 'Digital'!
  const dspIdx = findColIndex(
    ['source', 'sub source', 'dsp', 'platform', 'store', 'service_name', 'service'],
    ['source', 'platform', 'dsp', 'store']
  );

  // 4. Lượt stream / Units
  const streamsIdx = findColIndex(
    ['units', 'quantity', 'streams', 'plays', 'luot_nghe', 'lượt nghe', 'count'],
    ['unit', 'stream', 'play', 'quantity']
  );

  // 5. Doanh thu (Revenue / Gross / Net Amount)
  // Ưu tiên Gross Amount hoặc Net Amount quy đổi chuẩn (tránh lấy cột "in currency" ngoại tệ cents)
  const grossAmountIdx = headers.indexOf('gross amount');
  const netAmountIdx = headers.indexOf('net amount');
  const netPayableIdx = headers.indexOf('net payable');
  const grossInCurIdx = headers.indexOf('gross amount in currency');
  const netInCurIdx = headers.indexOf('net amount in currency');
  const exchangeRateColIdx = headers.indexOf('exchange rate');

  const revenueIdx = findColIndex(
    ['gross amount', 'net amount', 'revenue', 'gross_revenue', 'doanh_thu', 'doanh thu', 'earnings', 'amount'],
    ['gross_revenue', 'revenue', 'doanh_thu']
  );

  // 6. Tiền tệ (Currency)
  const currencyIdx = findColIndex(['currency', 'tien_te', 'tiền tệ'], ['currency']);
  const originalCurrencyIdx = headers.indexOf('original currency');

  // 7. Metadata bổ sung: ISRC, Territory, Configuration, Sale Date
  const isrcIdx = findColIndex(['isrc', 'upc', 'barcode'], ['isrc']);
  const territoryIdx = findColIndex(['territory', 'country', 'quoc_gia'], ['territory', 'country']);
  const configIdx = findColIndex(['configuration', 'description', 'type'], ['config']);
  const saleDateIdx = findColIndex(['sale date', 'transaction date', 'date', 'ngay'], ['date']);

  if (trackIdx === -1 && revenueIdx === -1 && grossAmountIdx === -1 && netAmountIdx === -1) {
    throw new Error('Không thể nhận diện cột Tên bài hát hoặc Doanh thu trong file CSV. Vui lòng kiểm tra file mẫu.');
  }

  const records = [];
  for (let i = 1; i < rawLines.length; i++) {
    const cells = splitCSVRow(rawLines[i]);
    if (!cells || cells.length === 0 || !cells.some(Boolean)) continue;

    const artist = artistIdx !== -1 ? (cells[artistIdx] || 'UniFLOWs Artist').trim() : 'UniFLOWs Artist';
    const track = trackIdx !== -1 ? (cells[trackIdx] || 'Bản ghi ' + i).trim() : 'Bản ghi ' + i;
    
    // Nguồn DSP
    let rawDsp = dspIdx !== -1 ? (cells[dspIdx] || 'Khác').trim() : 'Khác';
    let dsp = rawDsp;
    const dspLower = rawDsp.toLowerCase();

    if (dspLower.includes('spotify')) dsp = 'Spotify';
    else if (dspLower.includes('apple')) dsp = 'Apple Music';
    else if (dspLower === 'youtube red' || dspLower.includes('youtube red')) dsp = 'YouTube Red';
    else if (dspLower.includes('youtube')) dsp = 'YouTube';
    else if (dspLower.includes('meta') || dspLower.includes('facebook') || dspLower.includes('instagram')) dsp = 'Meta';
    else if (dspLower.includes('tiktok') || dspLower.includes('bytedance')) dsp = 'TikTok';
    else if (dspLower.includes('amazon')) dsp = 'Amazon Music';
    else if (dspLower.includes('deezer')) dsp = 'Deezer';
    else if (dspLower.includes('zing')) dsp = 'Zing MP3';
    else if (dspLower.includes('tidal')) dsp = 'Tidal';
    else if (dspLower.includes('soundcloud')) dsp = 'SoundCloud';

    // Số lượt stream
    let streams = streamsIdx !== -1 ? parseRawNumber(cells[streamsIdx]) : 0;

    // Tính toán Doanh thu chuẩn xác
    let revenue = 0;
    let netAmountVal = 0;
    let grossAmountVal = 0;

    if (grossAmountIdx !== -1 && cells[grossAmountIdx]) {
      grossAmountVal = parseRawNumber(cells[grossAmountIdx]);
    }
    if (netAmountIdx !== -1 && cells[netAmountIdx]) {
      netAmountVal = parseRawNumber(cells[netAmountIdx]);
    }

    // Ưu tiên Gross Amount nếu > 0, nếu không lấy Net Amount
    if (grossAmountVal > 0) {
      revenue = grossAmountVal;
    } else if (netAmountVal > 0) {
      revenue = netAmountVal;
    } else if (netPayableIdx !== -1 && parseRawNumber(cells[netPayableIdx]) > 0) {
      revenue = parseRawNumber(cells[netPayableIdx]);
    } else if (revenueIdx !== -1) {
      revenue = parseRawNumber(cells[revenueIdx]);
    }

    // Nếu chỉ có Gross/Net Amount in Currency (ngoại tệ) và có Exchange Rate
    if (revenue === 0 && grossInCurIdx !== -1 && parseRawNumber(cells[grossInCurIdx]) > 0) {
      const foreignGross = parseRawNumber(cells[grossInCurIdx]);
      const exRate = exchangeRateColIdx !== -1 ? parseRawNumber(cells[exchangeRateColIdx]) : state.exchangeRate;
      revenue = foreignGross * (exRate > 0 ? exRate : state.exchangeRate);
    }

    // Kiểm tra đơn vị tiền tệ của file
    const cur = currencyIdx !== -1 && cells[currencyIdx] ? cells[currencyIdx].toUpperCase().trim() : 'VND';
    const origCur = originalCurrencyIdx !== -1 && cells[originalCurrencyIdx] ? cells[originalCurrencyIdx].toUpperCase().trim() : '';

    // Nếu tiền tệ đích của file là USD và số tiền rất nhỏ (dưới $1000 mà không có cột VND)
    if (cur === 'USD' && revenue < 1000 && grossAmountIdx === -1) {
      revenue = revenue * state.exchangeRate;
    }

    const isrc = isrcIdx !== -1 ? cells[isrcIdx] : '';
    const territory = territoryIdx !== -1 ? (cells[territoryIdx] || 'VN').trim() : 'VN';
    const configuration = configIdx !== -1 ? (cells[configIdx] || 'Stream').trim() : 'Stream';
    const saleDate = saleDateIdx !== -1 ? cells[saleDateIdx] : '';

    records.push({
      artist: artist || 'Chưa định danh',
      track: track || 'Không có tên',
      dsp: dsp || 'Khác',
      rawDsp: rawDsp,
      streams: Math.round(streams),
      revenue: revenue,
      netAmount: netAmountVal,
      grossAmount: grossAmountVal,
      currency: 'VND',
      isrc: isrc,
      territory: territory,
      configuration: configuration,
      saleDate: saleDate
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
      const matchIsrc = (item.isrc || '').toLowerCase().includes(q);
      const matchTerritory = (item.territory || '').toLowerCase().includes(q);
      if (!matchTrack && !matchArtist && !matchDsp && !matchIsrc && !matchTerritory) return false;
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
        dsps: new Set(),
        territories: new Set()
      };
    }
    trackMap[key].streams += row.streams;
    trackMap[key].gross += row.revenue;
    trackMap[key].dsps.add(row.dsp);
    if (row.territory) trackMap[key].territories.add(row.territory);
  });

  const trackBreakdown = Object.values(trackMap).map(t => {
    const lShare = t.gross * (labelPct / 100);
    const aShare = t.gross * (artistPct / 100);
    return {
      ...t,
      dspsList: Array.from(t.dsps).join(', '),
      territoriesList: Array.from(t.territories).slice(0, 5).join(', ') + (t.territories.size > 5 ? '...' : ''),
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
      return (vnd / state.exchangeRate).toFixed(4);
    }
    if (vnd > 0 && vnd < 1000) {
      return vnd.toFixed(2);
    }
    return Math.round(vnd);
  }

  const headers = [
    'Nghệ sĩ (Artist)',
    'Tên bài hát (Track Title)',
    'Nền tảng (DSP / Source)',
    'Định dạng (Format / Config)',
    'Quốc gia (Territory)',
    'Mã ISRC',
    'Lượt stream (Units)',
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
      `"${(row.configuration || '').replace(/"/g, '""')}"`,
      `"${row.territory || ''}"`,
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
  const templateHeaders = ['Source', 'Track Artist', 'Track Title', 'ISRC', 'Territory', 'Units', 'Gross Amount', 'Currency'];
  const templateRows = [
    templateHeaders,
    ['Spotify', 'Khờ Band', 'mùa hạ 2019', 'TCAJT2506106', 'VN', 32, 564.93, 'VND'],
    ['YouTube Red', 'Khờ Band', 'mùa hạ 2019', 'TCAJT2506106', 'US', 3, 573.81, 'VND'],
    ['YouTube', 'Khờ Band', 'khoảng trống (unplugged)', 'TCAJQ2502820', 'VN', 51, 65.96, 'VND'],
    ['Meta', 'Khờ Band', 'khoảng trống (unplugged)', 'TCAJQ2502820', 'VN', 2, 0.06, 'VND'],
    ['TikTok', 'Khờ Band', 'mùa hạ 2019', 'TCAJT2506106', 'VN', 1, 0.03, 'VND']
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
        ${DSP_META[item.name]?.icon || '●'} ${item.name}
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

  const trackRowsHTML = trackBreakdown.slice(0, 15).map((t, idx) => `
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
          <span style="font-family: 'DM Mono', monospace; font-size: 10.5px; color: #64748b;">${dspBreakdown.length} nền tảng ghi nhận</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background: #0f172a; color: #ffffff; font-family: 'DM Mono', monospace; font-size: 10px; text-transform: uppercase;">
              <th style="padding: 8px 12px; text-align: left;">Nền tảng (DSP / Source)</th>
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
  const { filteredRows, totalStreams, totalGrossRevenue, labelRetained, artistNetPayout, labelPct, artistPct, dspBreakdown, trackBreakdown, uniqueArtists, uniqueDsps } = data;

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

  // Bảng gộp theo bài hát
  const trackRowsHTML = trackBreakdown.map((t, idx) => {
    return `
      <tr style="border-bottom: 1px solid #e2e8f0; transition: background 0.1s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
        <td style="padding: 12px 14px; font-family: 'DM Mono', monospace; font-size: 11px; color: #94a3b8;">
          ${String(idx + 1).padStart(2, '0')}
        </td>
        <td style="padding: 12px 14px;">
          <strong style="font-size: 13px; color: #0f172a; display: block;">${t.track}</strong>
          <span style="font-size: 11px; color: #64748b;">👤 ${t.artist} ${t.isrc ? '· <code style="font-size:10px; background:#f1f5f9; padding:1px 4px; border-radius:3px;">' + t.isrc + '</code>' : ''}</span>
        </td>
        <td style="padding: 12px 14px; font-size: 11.5px; color: #475569;">
          <span style="display:inline-block; font-weight:600; color:#0f172a;">${t.dspsList}</span>
          ${t.territoriesList ? `<small style="display:block; color:#64748b; font-size:10.5px;">Quốc gia: ${t.territoriesList}</small>` : ''}
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

  // Bảng chi tiết toàn bộ dòng giao dịch (Transaction View)
  const transactionRowsHTML = filteredRows.map((r, idx) => {
    const lShare = r.revenue * (labelPct / 100);
    const aShare = r.revenue * (artistPct / 100);
    const dspMeta = DSP_META[r.dsp] || DSP_META['Khác'];
    return `
      <tr style="border-bottom: 1px solid #f1f5f9; font-size: 12px; transition: background 0.1s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
        <td style="padding: 10px 12px; font-family: 'DM Mono', monospace; color: #94a3b8; font-size: 10.5px;">
          ${String(idx + 1).padStart(2, '0')}
        </td>
        <td style="padding: 10px 12px;">
          <strong style="color: #0f172a; display: block;">${r.track}</strong>
          <span style="font-size: 11px; color: #64748b;">${r.artist}</span>
        </td>
        <td style="padding: 10px 12px;">
          <span style="display: inline-flex; align-items: center; gap: 4px; background: ${dspMeta.bg}; color: ${dspMeta.color}; font-weight: bold; padding: 2px 7px; border-radius: 4px; font-size: 11px;">
            <span>${dspMeta.icon}</span> ${r.dsp}
          </span>
          ${r.configuration ? `<small style="display:block; color:#64748b; font-size:10px; margin-top:2px;">${r.configuration}</small>` : ''}
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          <span style="font-family:'DM Mono',monospace; font-size:11px; background:#f1f5f9; color:#334155; padding:2px 6px; border-radius:3px; font-weight:600;">
            ${r.territory || 'VN'}
          </span>
        </td>
        <td style="padding: 10px 12px; text-align: right; font-family: 'DM Mono', monospace;">
          ${formatStreams(r.streams)}
        </td>
        <td style="padding: 10px 12px; text-align: right; font-family: 'DM Mono', monospace; font-weight: 600;">
          ${formatCurrency(r.revenue)}
        </td>
        <td style="padding: 10px 12px; text-align: right; font-family: 'DM Mono', monospace; color: #b45309;">
          ${formatCurrency(lShare)}
        </td>
        <td style="padding: 10px 12px; text-align: right; font-family: 'DM Mono', monospace; font-weight: bold; color: #15803d;">
          ${formatCurrency(aShare)}
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
            Tự động nhận diện cột Source (Spotify, YouTube, Meta, TikTok...), Units, Gross & Net Amount, ISRC, Territory.
          </p>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <input type="file" id="dist-csv-file-input" accept=".csv" style="display: none;">
          <button type="button" id="dist-btn-browse-csv" class="button" style="background: #0f172a; color: #fff; padding: 9px 16px; font-size: 11px;">
            📂 Tải Lên File CSV
          </button>
          <button type="button" id="dist-btn-load-sample" class="button alt" style="padding: 9px 14px; font-size: 11px;">
            ✨ Dữ Liệu Demo
          </button>
          <button type="button" id="dist-btn-load-khoband" class="button alt" style="padding: 9px 14px; font-size: 11px; border-color: #2563eb; color: #2563eb; font-weight: bold;">
            🎸 Nạp Mẫu Khờ Band (Real CSV)
          </button>
          <button type="button" id="dist-btn-download-tpl" class="button alt" style="padding: 9px 14px; font-size: 11px;">
            📑 Tải CSV Mẫu
          </button>
        </div>
      </div>

      <div id="dist-file-dropzone" style="border: 2px dashed #cbd5e1; border-radius: 6px; padding: 14px; text-align: center; background: #f8fafc; cursor: pointer; transition: all 0.2s;">
        <span style="font-size: 12px; color: #475569; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <span>📎</span> 
          <span>Đang sử dụng dữ liệu: <b id="dist-current-filename" style="color: #0b0b0b;">${state.fileName}</b> (${state.records.length} dòng bản ghi)</span>
          <span style="color: #64748b; font-size: 11px;">(Kéo thả file CSV vào đây để phân tích ngay)</span>
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
            🌐 Lọc Theo Nền Tảng (DSP / Source)
          </label>
          <select id="dist-dsp-select" style="width: 100%; padding: 9px 12px; font-size: 12px; border: 1px solid #475569; background: #1e293b; color: #fff;">
            ${dspOptions}
          </select>
        </div>

        <div>
          <label style="font-family:'DM Mono',monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #fff; display: block; margin-bottom: 6px;">
            🔍 Tìm Kiếm (Bài Hát / ISRC / Quốc Gia)
          </label>
          <input type="text" id="dist-search-input" value="${state.searchQuery}" placeholder="Nhập tên bài, mã ISRC, mã quốc gia..." 
            style="width: 100%; padding: 9px 12px; font-size: 12px; border: 1px solid #475569; background: #1e293b; color: #fff;">
        </div>
      </div>
    </div>

    <!-- 4 THẺ METRIC CARDS TỔNG QUAN -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 24px;">
      <div style="background: #fff; border: 1px solid var(--ink); padding: 18px; border-radius: 8px; border-top: 4px solid #3b82f6;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #3b82f6; font-family:'DM Mono',monospace;">🎧 Tổng Lượt Stream</span>
          <span style="font-size: 10px; font-family:'DM Mono',monospace; color: #64748b;">${filteredRows.length} lượt dòng</span>
        </div>
        <strong style="display: block; font-size: 28px; margin-top: 6px; letter-spacing: -0.04em; color: #0f172a; font-family:'DM Mono',monospace;">
          ${formatStreams(totalStreams)}
        </strong>
        <span style="font-size: 11px; opacity: 0.7; margin-top: 4px; display: block;">Lượt nghe / Units thực tế</span>
      </div>

      <div style="background: #fff; border: 1px solid var(--ink); padding: 18px; border-radius: 8px; border-top: 4px solid #0b0b0b;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #0b0b0b; font-family:'DM Mono',monospace;">💰 Doanh Thu Gộp (Gross)</span>
          <span style="font-size: 10px; font-family:'DM Mono',monospace; color: #64748b;">100% Nguồn DSPs</span>
        </div>
        <strong style="display: block; font-size: 28px; margin-top: 6px; letter-spacing: -0.04em; color: #0b0b0b; font-family:'DM Mono',monospace;">
          ${formatCurrency(totalGrossRevenue)}
        </strong>
        <span style="font-size: 11px; opacity: 0.7; margin-top: 4px; display: block;">Doanh thu gốc trước khấu trừ</span>
      </div>

      <div style="background: #fff; border: 1px solid var(--ink); padding: 18px; border-radius: 8px; border-top: 4px solid #b45309;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #b45309; font-family:'DM Mono',monospace;">🏛️ Hãng Giữ Lại (${labelPct}%)</span>
          <span style="font-size: 10px; font-family:'DM Mono',monospace; color: #b45309; font-weight:bold;">Label Share</span>
        </div>
        <strong style="display: block; font-size: 28px; margin-top: 6px; letter-spacing: -0.04em; color: #92400e; font-family:'DM Mono',monospace;">
          ${formatCurrency(labelRetained)}
        </strong>
        <span style="font-size: 11px; opacity: 0.7; margin-top: 4px; display: block;">Phí phân phối & quản lý Label</span>
      </div>

      <div style="background: #f0fdf4; border: 1.5px solid #16a34a; padding: 18px; border-radius: 8px; border-top: 4px solid #15803d; box-shadow: 2px 2px 0 #15803d;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #15803d; font-family:'DM Mono',monospace;">💳 Nghệ Sĩ Thực Nhận (${artistPct}%)</span>
          <span style="font-size: 10px; font-family:'DM Mono',monospace; background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 3px; font-weight: bold;">Net Payout</span>
        </div>
        <strong style="display: block; font-size: 28px; margin-top: 6px; letter-spacing: -0.04em; color: #15803d; font-family:'DM Mono',monospace;">
          ${formatCurrency(artistNetPayout)}
        </strong>
        <span style="font-size: 11px; color: #166534; margin-top: 4px; display: block; font-weight: 600;">Số tiền giải ngân về nghệ sĩ</span>
      </div>
    </div>

    <!-- KHỐI THAO TÁC XUẤT BÁO CÁO & CHUYỂN CHẾ ĐỘ XEM -->
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
      <!-- Toggle Chế độ xem -->
      <div style="display: flex; gap: 8px; align-items: center;">
        <span style="font-size: 12px; font-weight: bold; text-transform: uppercase; font-family: 'DM Mono', monospace; color: #475569;">Chế độ xem:</span>
        <button type="button" id="dist-view-summary-btn" class="button" style="padding: 7px 14px; font-size: 11px; ${state.activeView === 'summary' ? 'background:#0f172a; color:#fff;' : 'background:#fff; color:#0f172a; border-color:#cbd5e1;'}">
          📊 Bảng Tổng Hợp
        </button>
        <button type="button" id="dist-view-tx-btn" class="button" style="padding: 7px 14px; font-size: 11px; ${state.activeView === 'transactions' ? 'background:#0f172a; color:#fff;' : 'background:#fff; color:#0f172a; border-color:#cbd5e1;'}">
          📋 Chi Tiết Toàn Bộ Dòng (${filteredRows.length})
        </button>
      </div>

      <!-- Action buttons -->
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <button type="button" id="dist-btn-export-csv" class="button" style="background: #15803d; border-color: #15803d; color: #fff; font-weight: bold; padding: 10px 18px; font-size: 11.5px;">
          📥 Xuất File CSV (Chi Tiết & Khấu Trừ)
        </button>
        <button type="button" id="dist-btn-open-pdf" class="button" style="background: #0f172a; border-color: #0f172a; color: #fff; font-weight: bold; padding: 10px 18px; font-size: 11.5px;">
          🖨️ Xem & Xuất Phiếu Đối Soát PDF (A4)
        </button>
      </div>
    </div>

    <!-- BẢNG 1: THỊ PHẦN THEO NỀN TẢNG (DSP BREAKDOWN) -->
    <div style="background: #fff; border: 1px solid var(--ink); border-radius: 8px; padding: 22px; margin-bottom: 24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px; flex-wrap:wrap; gap:8px;">
        <div>
          <h3 style="font-size: 16px; margin: 0;">🌐 Báo Cáo Phân Bổ Nền Tảng (DSP / Source Breakdown)</h3>
          <p style="font-size: 12px; opacity: 0.75; margin: 2px 0 0;">Thống kê doanh thu và lượt stream theo từng nguồn phân phối đối tác.</p>
        </div>
        <span class="kicker">Market Share & Royalties</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px;">
        ${dspCardsHTML.length > 0 ? dspCardsHTML : '<p style="color:#64748b; font-size:13px;">Chưa có dữ liệu nền tảng.</p>'}
      </div>

      <!-- Bảng tóm tắt DSP có hàng TỔNG CỘNG -->
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-family: 'DM Mono', monospace; font-size: 11px; text-transform: uppercase;">
              <th style="padding: 10px 14px;">Nguồn / Nền tảng (DSP)</th>
              <th style="padding: 10px 14px; text-align: right;">Lượt Stream (Units)</th>
              <th style="padding: 10px 14px; text-align: right;">Doanh thu Gộp</th>
              <th style="padding: 10px 14px; text-align: right;">Khấu trừ Label (${labelPct}%)</th>
              <th style="padding: 10px 14px; text-align: right;">Nghệ sĩ Nhận (${artistPct}%)</th>
              <th style="padding: 10px 14px; text-align: right;">Thị phần (%)</th>
            </tr>
          </thead>
          <tbody>
            ${dspBreakdown.map(d => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 14px; font-weight: bold; color: #0f172a;">
                  ${DSP_META[d.name]?.icon || '●'} ${d.name}
                </td>
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

    ${state.activeView === 'summary' ? `
      <!-- BẢNG 2A: CHI TIẾT THEO BÀI HÁT (AGGREGATED TRACK VIEW) -->
      <div style="background: #fff; border: 1px solid var(--ink); border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
        <div style="padding: 16px 20px; background: #0f172a; color: #fff; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <strong style="font-size: 15px; letter-spacing: -0.02em;">Chi Tiết Từng Bài Hát (Track-by-Track Summary)</strong>
            <span style="font-size: 12px; opacity: 0.75; display: block; margin-top: 2px;">Tổng hợp theo ca khúc, các nguồn DSP phát sinh và thị trường phát sóng.</span>
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
                <th style="padding: 12px 14px;">Nguồn & Lãnh thổ</th>
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
    ` : `
      <!-- BẢNG 2B: CHI TIẾT TOÀN BỘ DÒNG GIAO DỊCH (FULL TRANSACTION LEDGER) -->
      <div style="background: #fff; border: 1px solid var(--ink); border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
        <div style="padding: 16px 20px; background: #0f172a; color: #fff; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <strong style="font-size: 15px; letter-spacing: -0.02em;">Chi Tiết Toàn Bộ Dòng Bản Ghi (Raw Distribution Ledger)</strong>
            <span style="font-size: 12px; opacity: 0.75; display: block; margin-top: 2px;">Hiển thị từng dòng phân phối cụ thể với đầy đủ thông tin nguồn phát sinh, loại stream, quốc gia và số tiền.</span>
          </div>
          <span style="font-family:'DM Mono',monospace; font-size: 11px; background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 4px;">
            ${filteredRows.length} dòng
          </span>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #cbd5e1; font-family: 'DM Mono', monospace; font-size: 10.5px; text-transform: uppercase;">
                <th style="padding: 10px 12px; width: 35px;">#</th>
                <th style="padding: 10px 12px;">Tên bài hát & Nghệ sĩ</th>
                <th style="padding: 10px 12px;">Nguồn & Loại (Configuration)</th>
                <th style="padding: 10px 12px; text-align: center;">Quốc gia</th>
                <th style="padding: 10px 12px; text-align: right;">Lượt Stream</th>
                <th style="padding: 10px 12px; text-align: right;">Doanh thu Gộp</th>
                <th style="padding: 10px 12px; text-align: right;">Label (${labelPct}%)</th>
                <th style="padding: 10px 12px; text-align: right;">Thực nhận (${artistPct}%)</th>
              </tr>
            </thead>
            <tbody>
              ${transactionRowsHTML.length > 0 ? transactionRowsHTML : `
                <tr>
                  <td colspan="8" style="padding: 30px; text-align: center; color: #64748b;">
                    Không có dòng bản ghi nào phù hợp.
                  </td>
                </tr>
              `}
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc; border-top: 2px solid var(--ink); font-weight: bold;">
                <td colspan="4" style="padding: 12px; font-family: 'DM Mono', monospace; text-transform: uppercase;">
                  ★ TỔNG CỘNG (${filteredRows.length} dòng bản ghi)
                </td>
                <td style="padding: 12px; text-align: right; font-family: 'DM Mono', monospace;">${formatStreams(totalStreams)}</td>
                <td style="padding: 12px; text-align: right; font-family: 'DM Mono', monospace;">${formatCurrency(totalGrossRevenue)}</td>
                <td style="padding: 12px; text-align: right; font-family: 'DM Mono', monospace; color: #b45309;">${formatCurrency(labelRetained)}</td>
                <td style="padding: 12px; text-align: right; font-family: 'DM Mono', monospace; color: #15803d; font-size: 13px;">${formatCurrency(artistNetPayout)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `}
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
  const viewSummaryBtn = document.querySelector('#dist-view-summary-btn');
  const viewTxBtn = document.querySelector('#dist-view-tx-btn');

  // Chuyển đổi chế độ xem
  viewSummaryBtn?.addEventListener('click', () => {
    state.activeView = 'summary';
    renderDistributionTab();
  });
  viewTxBtn?.addEventListener('click', () => {
    state.activeView = 'transactions';
    renderDistributionTab();
  });

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

  const loadKhobandBtn = document.querySelector('#dist-btn-load-khoband');
  loadKhobandBtn?.addEventListener('click', async () => {
    try {
      const res = await fetch('/sample_distribution_khoband.csv');
      const text = await res.text();
      const parsed = parseCSV(text);
      state.records = parsed;
      state.fileName = 'sample_distribution_khoband.csv';
      state.isCustomLoaded = true;
      state.selectedArtist = 'all';
      state.selectedDsp = 'all';
      state.searchQuery = '';
      renderDistributionTab();
      alert(`✓ Đã nạp thành công ${parsed.length} dòng báo cáo phân phối thực tế của Khờ Band!`);
    } catch (err) {
      alert('Lỗi nạp file mẫu: ' + err.message);
    }
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
