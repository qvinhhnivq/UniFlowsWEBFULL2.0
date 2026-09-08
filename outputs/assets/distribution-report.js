/**
 * UniFLOWs Label — Music Distribution & Royalty Statement Engine v3.0
 * Fix: Revenue hiển thị đúng, nguồn stream chi tiết, PDF đẹp như brand thật
 */

// ============================================================================
// SAMPLE DATASET (DỮ LIỆU MẪU MẶC ĐỊNH)
// ============================================================================
export const sampleDistributionData = [
  { artist: 'Khờ Band', track: 'mùa hạ 2019', dsp: 'Spotify', subSource: 'Stream', streams: 59, revenue: 836187, netVnd: 836187, currency: 'VND', isrc: 'TCAJT2506106', territory: 'VN', configuration: 'Stream', saleDate: '2026-05-31' },
  { artist: 'Khờ Band', track: 'mùa hạ 2019', dsp: 'YouTube Red', subSource: 'Family Promotion Stream', streams: 18, revenue: 1032530, netVnd: 1032530, currency: 'VND', isrc: 'TCAJT2506106', territory: 'VN,US,NG', configuration: 'Family Promotion Stream', saleDate: '2026-06-01' },
  { artist: 'Khờ Band', track: 'mùa hạ 2019', dsp: 'YouTube Red', subSource: 'Premium Stream', streams: 5, revenue: 503945, netVnd: 503945, currency: 'VND', isrc: 'TCAJT2506106', territory: 'VN', configuration: 'Premium Stream', saleDate: '2026-06-01' },
  { artist: 'Khờ Band', track: 'mùa hạ 2019', dsp: 'YouTube Red', subSource: 'UGC Stream', streams: 2, revenue: 58971, netVnd: 58971, currency: 'VND', isrc: 'TCAJT2506106', territory: 'VN', configuration: 'UGC Stream', saleDate: '2026-06-01' },
  { artist: 'Khờ Band', track: 'mùa hạ 2019', dsp: 'YouTube', subSource: 'Promotion Stream', streams: 83, revenue: 14972, netVnd: 14972, currency: 'VND', isrc: 'TCAJT2506106', territory: 'VN,GB,TW', configuration: 'Promotion Stream', saleDate: '2026-06-01' },
  { artist: 'Khờ Band', track: 'mùa hạ 2019', dsp: 'Meta', subSource: 'IG Music', streams: 46, revenue: 1332, netVnd: 1332, currency: 'VND', isrc: 'TCAJT2506106', territory: 'VN', configuration: 'IG_MUSIC_NOTES', saleDate: '2026-05-31' },
  { artist: 'Khờ Band', track: 'mùa hạ 2019', dsp: 'TikTok', subSource: 'UGC', streams: 8, revenue: 277, netVnd: 277, currency: 'VND', isrc: 'TCAJT2506106', territory: 'VN', configuration: 'UGC', saleDate: '2026-05-31' },
  { artist: 'Khờ Band', track: 'khoảng trống (unplugged)', dsp: 'Spotify', subSource: 'Stream', streams: 6, revenue: 91191, netVnd: 91191, currency: 'VND', isrc: 'TCAJQ2502820', territory: 'VN', configuration: 'Stream', saleDate: '2026-05-31' },
  { artist: 'Khờ Band', track: 'khoảng trống (unplugged)', dsp: 'YouTube Red', subSource: 'Stream', streams: 1, revenue: 70252, netVnd: 70252, currency: 'VND', isrc: 'TCAJQ2502820', territory: 'VN', configuration: 'Stream', saleDate: '2026-06-01' },
  { artist: 'Khờ Band', track: 'khoảng trống (unplugged)', dsp: 'YouTube Red', subSource: 'Family Promotion Stream', streams: 10, revenue: 517531, netVnd: 517531, currency: 'VND', isrc: 'TCAJQ2502820', territory: 'VN,AU,US', configuration: 'Family Promotion Stream', saleDate: '2026-06-01' },
  { artist: 'Khờ Band', track: 'khoảng trống (unplugged)', dsp: 'YouTube Red', subSource: 'Premium Stream', streams: 2, revenue: 287708, netVnd: 287708, currency: 'VND', isrc: 'TCAJQ2502820', territory: 'VN,KR', configuration: 'Premium Stream', saleDate: '2026-06-01' },
  { artist: 'Khờ Band', track: 'khoảng trống (unplugged)', dsp: 'YouTube', subSource: 'Promotion Stream', streams: 168, revenue: 283780, netVnd: 283780, currency: 'VND', isrc: 'TCAJQ2502820', territory: 'VN,LA,JP,KR', configuration: 'Promotion Stream', saleDate: '2026-06-01' },
  { artist: 'Khờ Band', track: 'khoảng trống (unplugged)', dsp: 'Meta', subSource: 'IG Music', streams: 2, revenue: 59, netVnd: 59, currency: 'VND', isrc: 'TCAJQ2502820', territory: 'VN', configuration: 'IG_MUSIC_NOTES', saleDate: '2026-06-01' },
  { artist: 'Khờ Band', track: 'Đôi tay, bàn chân...', dsp: 'YouTube', subSource: 'Promotion Stream', streams: 5, revenue: 4435, netVnd: 4435, currency: 'VND', isrc: 'VNA1M2601128', territory: 'VN', configuration: 'Promotion Stream', saleDate: '2026-06-16' },
];

// DSP Meta
export const DSP_META = {
  'Spotify':       { color: '#1db954', icon: '🟢', bg: 'rgba(29,185,84,0.12)' },
  'Apple Music':   { color: '#fc3c44', icon: '🍎', bg: 'rgba(252,60,68,0.12)' },
  'YouTube':       { color: '#ff0000', icon: '▶️', bg: 'rgba(255,0,0,0.1)' },
  'YouTube Red':   { color: '#dc2626', icon: '🔴', bg: 'rgba(220,38,38,0.1)' },
  'YouTube Music': { color: '#dc2626', icon: '🎵', bg: 'rgba(220,38,38,0.1)' },
  'Meta':          { color: '#0081fb', icon: '📸', bg: 'rgba(0,129,251,0.1)' },
  'TikTok':        { color: '#111827', icon: '🎵', bg: 'rgba(0,0,0,0.08)' },
  'Amazon Music':  { color: '#25d1da', icon: '📦', bg: 'rgba(37,209,218,0.1)' },
  'Deezer':        { color: '#a238ff', icon: '🎧', bg: 'rgba(162,56,255,0.1)' },
  'Zing MP3':      { color: '#8b5cf6', icon: '🟣', bg: 'rgba(139,92,246,0.1)' },
  'Tidal':         { color: '#0a0a0a', icon: '🌊', bg: 'rgba(0,0,0,0.08)' },
  'SoundCloud':    { color: '#ff5500', icon: '☁️', bg: 'rgba(255,85,0,0.1)' },
  'Khác':          { color: '#64748b', icon: '🌐', bg: 'rgba(100,116,139,0.1)' }
};

// CONFIG TYPE BADGE
const CONFIG_COLORS = {
  'Stream':                  { bg: '#dcfce7', color: '#15803d', label: 'Premium Stream' },
  'Premium Stream':          { bg: '#dcfce7', color: '#15803d', label: 'Premium' },
  'Promotion Stream':        { bg: '#f0f9ff', color: '#0369a1', label: 'Promo Stream' },
  'Family Promotion Stream': { bg: '#fef3c7', color: '#92400e', label: 'Family Promo' },
  'UGC Stream':              { bg: '#f5f3ff', color: '#6d28d9', label: 'UGC Stream' },
  'Premium UGC Stream':      { bg: '#f5f3ff', color: '#6d28d9', label: 'Premium UGC' },
  'UGC':                     { bg: '#f5f3ff', color: '#6d28d9', label: 'UGC' },
  'PGC':                     { bg: '#fff7ed', color: '#c2410c', label: 'PGC' },
  'IG_MUSIC_NOTES':          { bg: '#fdf4ff', color: '#7e22ce', label: 'IG Music Notes' },
  'IG_MUSIC_STICKER':        { bg: '#fdf4ff', color: '#7e22ce', label: 'IG Music Sticker' },
  'FB_FROM_IG_CROSSPOST':    { bg: '#eff6ff', color: '#1d4ed8', label: 'FB×IG Crosspost' },
  'Video Stream':            { bg: '#fff1f2', color: '#be123c', label: 'Video Stream' },
  'Ad-supported':            { bg: '#fefce8', color: '#a16207', label: 'Ad-supported' },
};

function getConfigMeta(cfg) {
  return CONFIG_COLORS[cfg] || { bg: '#f1f5f9', color: '#475569', label: cfg || 'Other' };
}

// ============================================================================
// STATE
// ============================================================================
export const state = {
  records: [...sampleDistributionData],
  labelPercentage: 20,
  selectedArtist: 'all',
  selectedDsp: 'all',
  searchQuery: '',
  currency: 'VND',
  exchangeRate: 25989,
  statementPeriod: 'Tháng ' + (new Date().getMonth() + 1) + '/' + new Date().getFullYear(),
  isCustomLoaded: false,
  fileName: 'uniflows_sample_dataset.csv',
  activeView: 'summary'
};

// ============================================================================
// UTILITIES
// ============================================================================
export function formatCurrency(amountVND, targetCurrency = state.currency) {
  const num = Number(amountVND) || 0;
  if (targetCurrency === 'USD') {
    const usd = num / state.exchangeRate;
    if (Math.abs(usd) > 0 && Math.abs(usd) < 0.01) return '$ ' + usd.toFixed(4);
    return '$ ' + usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (num === 0) return '₫ 0';
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
  const clean = String(str).replace(/[₫$,\s]/g, '').trim();
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

// ============================================================================
// CSV PARSER — tối ưu cho format UniFLOWs / Amuse / DistroKid / TuneCore
// ============================================================================
export function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rawLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (rawLines.length < 2) throw new Error('File CSV không có đủ dữ liệu (cần ít nhất 1 dòng tiêu đề + 1 dòng dữ liệu).');

  function splitRow(rowStr) {
    const result = [];
    let cur = '', inQ = false;
    for (let i = 0; i < rowStr.length; i++) {
      const c = rowStr[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { result.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"')); cur = ''; }
      else { cur += c; }
    }
    result.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    return result;
  }

  const rawHeaders = splitRow(rawLines[0]);
  const headers = rawHeaders.map(h => h.toLowerCase().trim());

  function findCol(exactList, fallbackContains = []) {
    for (const c of exactList) {
      const idx = headers.indexOf(c.toLowerCase());
      if (idx !== -1) return idx;
    }
    for (const c of fallbackContains) {
      const idx = headers.findIndex(h => h.includes(c.toLowerCase()));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  // Cột quan trọng
  const artistIdx    = findCol(['track artist','release artist','artist_name','artist','performer','main_artist'],['artist','performer']);
  const trackIdx     = findCol(['track title','release title','song_title','track','title','song','bai_hat'],['track','title','song']);
  const sourceIdx    = findCol(['source'],['source']);
  const subSourceIdx = findCol(['sub source','subsource'],['sub source','subsource']);
  const configIdx    = findCol(['configuration'],['config']);
  const streamsIdx   = findCol(['units','quantity','streams','plays','count'],['unit','stream','play','quantity']);
  const territoryIdx = findCol(['territory','country'],['territory','country']);
  const isrcIdx      = findCol(['isrc'],['isrc']);
  const saleDateIdx  = findCol(['sale date','transaction date','date'],['date']);

  // Cột doanh thu — ưu tiên theo thứ tự
  const grossAmtIdx    = headers.indexOf('gross amount');           // VND sau quy đổi (cột này trong file UniFLOWs)
  const netAmtIdx      = headers.indexOf('net amount');
  const netPayableIdx  = headers.indexOf('net payable');
  const grossInCurIdx  = headers.indexOf('gross amount in currency'); // Ngoại tệ gốc
  const netInCurIdx    = headers.indexOf('net amount in currency');
  const exRateIdx      = headers.indexOf('exchange rate');
  const origCurIdx     = headers.indexOf('original currency');
  const curIdx         = findCol(['currency'],['currency']);

  if (trackIdx === -1 && sourceIdx === -1) {
    throw new Error('Không tìm thấy cột Track Title hoặc Source trong file CSV. Kiểm tra định dạng file.');
  }

  const records = [];
  for (let i = 1; i < rawLines.length; i++) {
    const cells = splitRow(rawLines[i]);
    if (!cells || cells.length < 3 || !cells.some(Boolean)) continue;

    const artist  = artistIdx !== -1 ? (cells[artistIdx] || 'UniFLOWs Artist').trim() : 'UniFLOWs Artist';
    const track   = trackIdx !== -1  ? (cells[trackIdx]  || 'Track ' + i).trim()      : 'Track ' + i;

    // Xử lý DSP/Source
    let rawDsp = sourceIdx !== -1 ? (cells[sourceIdx] || 'Khác').trim() : 'Khác';
    let dsp = normalizeDSP(rawDsp);

    // Sub Source & Configuration
    const subSource    = subSourceIdx !== -1 ? (cells[subSourceIdx] || '').trim() : '';
    const configuration = configIdx !== -1   ? (cells[configIdx]    || '').trim() : '';

    // Streams
    const streams = streamsIdx !== -1 ? Math.max(0, Math.round(parseRawNumber(cells[streamsIdx]))) : 0;

    // ===== TÍNH DOANH THU =====
    // Trong file UniFLOWs/sample CSV:
    // - "Gross Amount in Currency" = số tiền nhỏ theo ngoại tệ gốc (USD/EUR cents)
    // - "Exchange Rate" = tỷ giá VND/1 đơn vị ngoại tệ
    // - "Gross Amount" = Gross Amount in Currency × Exchange Rate (VND)
    // - "Net Amount"   = sau phí DSP, cũng đã quy đổi VND
    // => Ưu tiên: Gross Amount (VND) > Net Amount (VND) > Gross in Currency × Exchange Rate
    let revenue = 0;

    const exRate = exRateIdx !== -1 ? parseRawNumber(cells[exRateIdx]) : state.exchangeRate;

    let grossVND   = grossAmtIdx !== -1  ? parseRawNumber(cells[grossAmtIdx])   : 0;
    let netVND     = netAmtIdx !== -1    ? parseRawNumber(cells[netAmtIdx])     : 0;
    let netPay     = netPayableIdx !== -1 ? parseRawNumber(cells[netPayableIdx]) : 0;
    let grossInCur = grossInCurIdx !== -1 ? parseRawNumber(cells[grossInCurIdx]) : 0;
    let netInCur   = netInCurIdx !== -1   ? parseRawNumber(cells[netInCurIdx])   : 0;

    // Đơn vị tiền gốc
    const origCur = origCurIdx !== -1 && cells[origCurIdx] ? cells[origCurIdx].toUpperCase().trim() : '';
    const fileCur = curIdx !== -1 && cells[curIdx] ? cells[curIdx].toUpperCase().trim() : 'VND';

    if (grossVND > 0) {
      // "Gross Amount" cột trong file UniFLOWs đã là VND sau quy đổi
      revenue = grossVND;
    } else if (netVND > 0) {
      revenue = netVND;
    } else if (netPay > 0) {
      revenue = netPay;
    } else if (grossInCur > 0 && exRate > 0) {
      // Quy đổi từ ngoại tệ sang VND
      revenue = grossInCur * exRate;
    } else if (netInCur > 0 && exRate > 0) {
      revenue = netInCur * exRate;
    }

    // Nếu revenue vẫn = 0 và file là USD, thử nhân exchange rate
    if (revenue === 0 && fileCur === 'USD' && grossVND > 0) {
      revenue = grossVND * (exRate > 0 ? exRate : state.exchangeRate);
    }

    const territory = territoryIdx !== -1 ? (cells[territoryIdx] || 'VN').trim() : 'VN';
    const isrc      = isrcIdx !== -1      ? (cells[isrcIdx]      || '').trim()   : '';
    const saleDate  = saleDateIdx !== -1  ? (cells[saleDateIdx]  || '').trim()   : '';

    records.push({
      artist, track, dsp, rawDsp, subSource, configuration,
      streams, revenue,
      netVnd: netVND > 0 ? netVND : revenue,
      currency: 'VND',
      isrc, territory, saleDate
    });
  }

  return records;
}

function normalizeDSP(raw) {
  const s = raw.toLowerCase();
  if (s.includes('spotify'))                 return 'Spotify';
  if (s.includes('apple'))                   return 'Apple Music';
  if (s === 'youtube red' || s.includes('youtube red')) return 'YouTube Red';
  if (s.includes('youtube'))                 return 'YouTube';
  if (s.includes('meta') || s.includes('facebook') || s.includes('instagram')) return 'Meta';
  if (s.includes('tiktok') || s.includes('bytedance')) return 'TikTok';
  if (s.includes('amazon'))                  return 'Amazon Music';
  if (s.includes('deezer'))                  return 'Deezer';
  if (s.includes('zing'))                    return 'Zing MP3';
  if (s.includes('tidal'))                   return 'Tidal';
  if (s.includes('soundcloud'))              return 'SoundCloud';
  return raw || 'Khác';
}

// ============================================================================
// TÍNH TOÁN DỮ LIỆU
// ============================================================================
export function computeFilteredData() {
  const { records, labelPercentage, selectedArtist, selectedDsp, searchQuery } = state;

  const filtered = records.filter(item => {
    if (selectedArtist !== 'all' && item.artist !== selectedArtist) return false;
    if (selectedDsp    !== 'all' && item.dsp    !== selectedDsp)    return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (![item.track, item.artist, item.dsp, item.isrc, item.territory, item.configuration, item.subSource]
            .some(v => (v||'').toLowerCase().includes(q))) return false;
    }
    return true;
  });

  let totalStreams = 0, totalGrossRevenue = 0;
  filtered.forEach(r => { totalStreams += r.streams; totalGrossRevenue += r.revenue; });

  const labelPct   = Math.max(0, Math.min(100, Number(labelPercentage) || 0));
  const artistPct  = 100 - labelPct;
  const labelRetained   = totalGrossRevenue * (labelPct / 100);
  const artistNetPayout = totalGrossRevenue * (artistPct / 100);

  // Group by DSP
  const dspMap = {};
  filtered.forEach(r => {
    if (!dspMap[r.dsp]) dspMap[r.dsp] = { name: r.dsp, streams: 0, gross: 0, rows: 0 };
    dspMap[r.dsp].streams += r.streams;
    dspMap[r.dsp].gross   += r.revenue;
    dspMap[r.dsp].rows    += 1;
  });
  const dspBreakdown = Object.values(dspMap).map(d => ({
    ...d,
    labelShare: d.gross * (labelPct / 100),
    artistShare: d.gross * (artistPct / 100),
    sharePct: totalGrossRevenue > 0 ? (d.gross / totalGrossRevenue) * 100 : 0
  })).sort((a, b) => b.gross - a.gross);

  // Group by Configuration/SubSource (nguồn stream chi tiết)
  const configMap = {};
  filtered.forEach(r => {
    const key = r.configuration || r.subSource || 'Other';
    if (!configMap[key]) configMap[key] = { name: key, streams: 0, gross: 0 };
    configMap[key].streams += r.streams;
    configMap[key].gross   += r.revenue;
  });
  const configBreakdown = Object.values(configMap).map(c => ({
    ...c,
    sharePct: totalGrossRevenue > 0 ? (c.gross / totalGrossRevenue) * 100 : 0
  })).sort((a, b) => b.gross - a.gross);

  // Group by Track
  const trackMap = {};
  filtered.forEach(r => {
    const key = `${r.artist}:::${r.track}`;
    if (!trackMap[key]) {
      trackMap[key] = { artist: r.artist, track: r.track, isrc: r.isrc || '', streams: 0, gross: 0, dsps: new Set(), territories: new Set(), configs: new Set() };
    }
    trackMap[key].streams += r.streams;
    trackMap[key].gross   += r.revenue;
    trackMap[key].dsps.add(r.dsp);
    if (r.territory) r.territory.split(',').forEach(t => trackMap[key].territories.add(t.trim()));
    if (r.configuration) trackMap[key].configs.add(r.configuration);
  });
  const trackBreakdown = Object.values(trackMap).map(t => {
    const terrs = Array.from(t.territories);
    return {
      ...t,
      dspsList: Array.from(t.dsps).join(', '),
      territoriesList: terrs.slice(0, 5).join(', ') + (terrs.length > 5 ? ` +${terrs.length - 5}` : ''),
      configsList: Array.from(t.configs).join(', '),
      labelShare: t.gross * (labelPct / 100),
      artistShare: t.gross * (artistPct / 100)
    };
  }).sort((a, b) => b.gross - a.gross);

  const uniqueArtists = Array.from(new Set(records.map(r => r.artist))).sort();
  const uniqueDsps    = Array.from(new Set(records.map(r => r.dsp))).sort();

  return { filteredRows: filtered, totalStreams, totalGrossRevenue, labelRetained, artistNetPayout, labelPct, artistPct, dspBreakdown, configBreakdown, trackBreakdown, uniqueArtists, uniqueDsps };
}

// ============================================================================
// XUẤT CSV
// ============================================================================
export function exportProcessedCSV() {
  const { filteredRows, totalStreams, totalGrossRevenue, labelRetained, artistNetPayout, labelPct, artistPct } = computeFilteredData();
  if (filteredRows.length === 0) { alert('Không có dữ liệu để xuất.'); return; }

  const isUSD = state.currency === 'USD';
  const fv = vnd => isUSD ? (vnd / state.exchangeRate).toFixed(4) : (vnd < 1000 ? vnd.toFixed(2) : Math.round(vnd));

  const headers = ['Nghệ sĩ','Bài hát','Nền tảng (DSP)','Loại Stream','Quốc gia','ISRC','Lượt Stream',
    `Doanh thu Gộp (${state.currency})`,`Khấu trừ Label (${labelPct}%)`,`Nghệ sĩ Nhận (${artistPct}%)`,'Ngày bán','Kỳ đối soát'];
  const rows = [headers];

  filteredRows.forEach(r => {
    const gross = r.revenue;
    rows.push([
      `"${r.artist.replace(/"/g,'""')}"`, `"${r.track.replace(/"/g,'""')}"`,
      `"${r.dsp}"`, `"${r.configuration || r.subSource || ''}"`, `"${r.territory || ''}"`,
      `"${r.isrc || ''}"`, r.streams, fv(gross), fv(gross * labelPct / 100), fv(gross * artistPct / 100),
      `"${r.saleDate || ''}"`, `"${state.statementPeriod}"`
    ]);
  });

  rows.push(['"★ TỔNG CỘNG"', `"${filteredRows.length} bản ghi"`, '""','""','""','""',
    totalStreams, fv(totalGrossRevenue), fv(labelRetained), fv(artistNetPayout), '""', `"${state.statementPeriod}"`]);

  const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8;'})), download: `UniFLOWs_Royalty_${new Date().toISOString().slice(0,10)}.csv` });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ============================================================================
// TẢI CSV MẪU
// ============================================================================
export function downloadCSVTemplate() {
  const rows = [
    ['Source','Sub Source','Track Artist','Track Title','ISRC','Territory','Units','Gross Amount in Currency','Net Amount in Currency','Original Currency','Exchange Rate','Configuration'],
    ['Spotify','','Khờ Band','mùa hạ 2019','TCAJT2506106','VN',32,0.019049,0.018763,'EUR',29657,'Stream'],
    ['YouTube Red','','Khờ Band','mùa hạ 2019','TCAJT2506106','VN',5,0.019689,0.019394,'USD',25985,'Premium Stream'],
    ['YouTube','','Khờ Band','mùa hạ 2019','TCAJT2506106','VN',51,0.002538,0.0025,'USD',25989,'Promotion Stream'],
    ['Meta','','Khờ Band','mùa hạ 2019','TCAJT2506106','VN',19,0.000022,0.000021,'USD',25989,'IG_MUSIC_NOTES'],
    ['TikTok','TikTok','Khờ Band','mùa hạ 2019','TCAJT2506106','VN',1,0.00000099,0.000000892,'USD',25989,'UGC'],
  ];
  const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8;'})), download: 'UniFLOWs_Distribution_Template.csv' });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ============================================================================
// GENERATE PDF A4 — PROFESSIONAL UNIFLOWS STYLE
// ============================================================================
export function generateRoyaltyStatementHTML() {
  const { totalStreams, totalGrossRevenue, labelRetained, artistNetPayout, labelPct, artistPct, dspBreakdown, configBreakdown, trackBreakdown } = computeFilteredData();

  const artistDisplay = state.selectedArtist === 'all' ? 'Toàn bộ Roster — Catalogue Statement' : state.selectedArtist;
  const dspDisplay    = state.selectedDsp    === 'all' ? 'All Platforms (Global)' : state.selectedDsp;
  const statId    = 'UFL-' + new Date().getFullYear() + '-' + String(Math.floor(100000 + Math.random() * 900000));
  const printDate = new Date().toLocaleDateString('vi-VN', { year:'numeric', month:'long', day:'numeric' });

  const dspRows = dspBreakdown.map((d, i) => `
    <tr style="background:${i%2===0?'#ffffff':'#f8fafc'}">
      <td style="padding:9px 14px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:8px;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${(DSP_META[d.name]||DSP_META['Khác']).color};flex-shrink:0;"></span>
        ${d.name}
      </td>
      <td style="padding:9px 14px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:'DM Mono',monospace;">${formatStreams(d.streams)}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:'DM Mono',monospace;font-weight:600;">${formatCurrency(d.gross)}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:'DM Mono',monospace;color:#b45309;">${formatCurrency(d.labelShare)}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:'DM Mono',monospace;font-weight:800;color:#15803d;">${formatCurrency(d.artistShare)}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:'DM Mono',monospace;color:#64748b;font-size:11px;">${d.sharePct.toFixed(1)}%</td>
    </tr>`).join('');

  const configRows = configBreakdown.map(c => {
    const meta = getConfigMeta(c.name);
    return `
    <tr>
      <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;">
        <span style="background:${meta.bg};color:${meta.color};font-family:'DM Mono',monospace;font-size:10px;font-weight:700;padding:2px 7px;border-radius:3px;text-transform:uppercase;">${meta.label}</span>
      </td>
      <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;text-align:right;font-family:'DM Mono',monospace;font-size:11.5px;">${formatStreams(c.streams)}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;text-align:right;font-family:'DM Mono',monospace;font-size:11.5px;font-weight:600;">${formatCurrency(c.gross)}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;text-align:right;font-family:'DM Mono',monospace;font-size:11px;color:#64748b;">${c.sharePct.toFixed(1)}%</td>
    </tr>`;
  }).join('');

  const trackRows = trackBreakdown.slice(0, 20).map((t, i) => `
    <tr style="background:${i%2===0?'#ffffff':'#f8fafc'}">
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-family:'DM Mono',monospace;font-size:10px;color:#94a3b8;text-align:center;">${String(i+1).padStart(2,'0')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">
        <strong style="display:block;font-size:12.5px;color:#0f172a;font-weight:800;">${t.track}</strong>
        <span style="font-size:10.5px;color:#64748b;">👤 ${t.artist}${t.isrc ? ' · <code style="background:#f1f5f9;padding:1px 4px;border-radius:2px;font-size:9.5px;">'+t.isrc+'</code>' : ''}</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:10.5px;color:#475569;">${t.dspsList}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:10px;color:#64748b;">${t.territoriesList}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:'DM Mono',monospace;font-size:11.5px;">${formatStreams(t.streams)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:'DM Mono',monospace;font-weight:700;font-size:11.5px;">${formatCurrency(t.gross)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:'DM Mono',monospace;font-weight:800;font-size:12px;color:#15803d;">${formatCurrency(t.artistShare)}</td>
    </tr>`).join('');

  return `
<div style="background:#fff;color:#0b0b0b;font-family:'Manrope',-apple-system,sans-serif;padding:36px 42px;max-width:840px;margin:0 auto;box-sizing:border-box;line-height:1.5;font-size:12.5px;">

  <!-- ===== HEADER ===== -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0b0b0b;padding-bottom:20px;margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:18px;">
      <img src="/assets/logo.jpg" alt="UniFLOWs" style="width:62px;height:62px;object-fit:cover;border-radius:8px;border:1.5px solid #0b0b0b;" onerror="this.style.display='none'">
      <div>
        <div style="font-size:28px;font-weight:900;letter-spacing:-0.07em;line-height:1;font-family:'Manrope',sans-serif;">UNIFLOWS</div>
        <div style="font-family:'DM Mono',monospace;font-size:9.5px;letter-spacing:2.5px;text-transform:uppercase;color:#475569;margin-top:3px;">MUSIC GROUP · LABEL SERVICES</div>
        <div style="font-size:10.5px;color:#64748b;margin-top:3px;">hello@uniflowslabel.com · uniflowslabel.com</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="background:#0b0b0b;color:#d8ff48;font-family:'DM Mono',monospace;font-size:10px;font-weight:900;padding:5px 12px;border-radius:3px;text-transform:uppercase;letter-spacing:1.5px;display:inline-block;margin-bottom:10px;">
        ⚡ ROYALTY STATEMENT
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:10.5px;color:#475569;line-height:1.8;">
        <div>Mã số: <strong style="color:#0b0b0b;">${statId}</strong></div>
        <div>Ngày: <strong>${printDate}</strong></div>
        <div>Kỳ: <strong>${state.statementPeriod}</strong></div>
      </div>
    </div>
  </div>

  <!-- ===== THÔNG TIN ĐỐI TÁC ===== -->
  <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:22px;">
    <div>
      <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;margin-bottom:4px;">ĐỐI TÁC THỤ HƯỞNG / BENEFICIARY</div>
      <div style="font-size:20px;font-weight:900;letter-spacing:-0.04em;color:#0b0b0b;">${artistDisplay}</div>
      <div style="font-size:11px;color:#475569;margin-top:3px;">Phạm vi: ${dspDisplay} · ${state.fileName}</div>
    </div>
    <div style="border-left:1px dashed #cbd5e1;padding-left:18px;display:grid;gap:6px;align-content:center;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:10.5px;color:#64748b;">Tỷ lệ phân chia:</span>
        <strong style="font-family:'DM Mono',monospace;font-size:11px;color:#15803d;">Hãng ${labelPct}% / NĐ ${artistPct}%</strong>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:10.5px;color:#64748b;">Đơn vị tiền tệ:</span>
        <strong style="font-family:'DM Mono',monospace;font-size:11px;">${state.currency}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:10.5px;color:#64748b;">Tỷ giá quy đổi:</span>
        <strong style="font-family:'DM Mono',monospace;font-size:11px;">1 USD = ${state.exchangeRate.toLocaleString('vi-VN')}₫</strong>
      </div>
    </div>
  </div>

  <!-- ===== 4 METRIC CARDS ===== -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px;">
    <div style="border:1px solid #e2e8f0;border-top:3px solid #3b82f6;border-radius:6px;padding:13px;">
      <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;color:#3b82f6;font-weight:800;letter-spacing:0.5px;">🎧 Tổng Streams</div>
      <div style="font-size:19px;font-weight:900;letter-spacing:-0.05em;margin-top:5px;color:#0f172a;font-family:'DM Mono',monospace;">${formatStreams(totalStreams)}</div>
      <div style="font-size:9.5px;color:#94a3b8;margin-top:2px;">Toàn cầu DSPs</div>
    </div>
    <div style="border:1px solid #e2e8f0;border-top:3px solid #0b0b0b;border-radius:6px;padding:13px;">
      <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;color:#0b0b0b;font-weight:800;letter-spacing:0.5px;">💰 Doanh Thu Gộp</div>
      <div style="font-size:19px;font-weight:900;letter-spacing:-0.05em;margin-top:5px;color:#0b0b0b;font-family:'DM Mono',monospace;">${formatCurrency(totalGrossRevenue)}</div>
      <div style="font-size:9.5px;color:#94a3b8;margin-top:2px;">Gross Royalties (100%)</div>
    </div>
    <div style="border:1px solid #e2e8f0;border-top:3px solid #b45309;border-radius:6px;padding:13px;">
      <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;color:#b45309;font-weight:800;letter-spacing:0.5px;">🏛️ Label Giữ (${labelPct}%)</div>
      <div style="font-size:19px;font-weight:900;letter-spacing:-0.05em;margin-top:5px;color:#92400e;font-family:'DM Mono',monospace;">${formatCurrency(labelRetained)}</div>
      <div style="font-size:9.5px;color:#94a3b8;margin-top:2px;">Phí phân phối & A&R</div>
    </div>
    <div style="border:1.5px solid #16a34a;border-top:3px solid #15803d;border-radius:6px;padding:13px;background:#f0fdf4;">
      <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;color:#15803d;font-weight:800;letter-spacing:0.5px;">💳 Nghệ Sĩ Nhận (${artistPct}%)</div>
      <div style="font-size:19px;font-weight:900;letter-spacing:-0.05em;margin-top:5px;color:#15803d;font-family:'DM Mono',monospace;">${formatCurrency(artistNetPayout)}</div>
      <div style="font-size:9.5px;color:#166534;font-weight:700;margin-top:2px;">Net Payout — Giải ngân</div>
    </div>
  </div>

  <!-- ===== BẢNG 1: DSP BREAKDOWN ===== -->
  <div style="margin-bottom:22px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;">
      <h3 style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.8px;margin:0;color:#0b0b0b;border-left:3px solid #d8ff48;padding-left:10px;">
        1. Phân Bổ Theo Nền Tảng Phân Phối (DSP Breakdown)
      </h3>
      <span style="font-family:'DM Mono',monospace;font-size:10px;color:#64748b;">${dspBreakdown.length} nền tảng</span>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:11.5px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
      <thead>
        <tr style="background:#0f172a;color:#fff;font-family:'DM Mono',monospace;font-size:9.5px;text-transform:uppercase;letter-spacing:0.5px;">
          <th style="padding:9px 14px;text-align:left;">Nền tảng (DSP / Source)</th>
          <th style="padding:9px 14px;text-align:right;">Streams</th>
          <th style="padding:9px 14px;text-align:right;">Doanh thu Gộp</th>
          <th style="padding:9px 14px;text-align:right;">Label (${labelPct}%)</th>
          <th style="padding:9px 14px;text-align:right;">Nghệ sĩ (${artistPct}%)</th>
          <th style="padding:9px 14px;text-align:right;">Thị phần</th>
        </tr>
      </thead>
      <tbody>${dspRows}</tbody>
      <tfoot>
        <tr style="background:#0f172a;color:#fff;font-weight:900;font-size:12px;">
          <td style="padding:11px 14px;font-family:'DM Mono',monospace;text-transform:uppercase;">★ TỔNG CỘNG</td>
          <td style="padding:11px 14px;text-align:right;font-family:'DM Mono',monospace;">${formatStreams(totalStreams)}</td>
          <td style="padding:11px 14px;text-align:right;font-family:'DM Mono',monospace;">${formatCurrency(totalGrossRevenue)}</td>
          <td style="padding:11px 14px;text-align:right;font-family:'DM Mono',monospace;color:#fcd34d;">${formatCurrency(labelRetained)}</td>
          <td style="padding:11px 14px;text-align:right;font-family:'DM Mono',monospace;color:#d8ff48;font-size:13px;">${formatCurrency(artistNetPayout)}</td>
          <td style="padding:11px 14px;text-align:right;font-family:'DM Mono',monospace;">100.0%</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- ===== BẢNG 2: NGUỒN STREAM / CONFIGURATION BREAKDOWN ===== -->
  ${configBreakdown.length > 0 ? `
  <div style="margin-bottom:22px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;">
      <h3 style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.8px;margin:0;color:#0b0b0b;border-left:3px solid #d8ff48;padding-left:10px;">
        2. Phân Tích Nguồn Stream (Stream Type Breakdown)
      </h3>
      <span style="font-family:'DM Mono',monospace;font-size:10px;color:#64748b;">${configBreakdown.length} loại</span>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:11.5px;border:1px solid #e2e8f0;">
      <thead>
        <tr style="background:#f8fafc;border-bottom:1.5px solid #cbd5e1;font-family:'DM Mono',monospace;font-size:9.5px;text-transform:uppercase;color:#475569;">
          <th style="padding:8px 14px;text-align:left;">Loại Stream / Configuration</th>
          <th style="padding:8px 14px;text-align:right;">Streams</th>
          <th style="padding:8px 14px;text-align:right;">Doanh thu</th>
          <th style="padding:8px 14px;text-align:right;">Thị phần</th>
        </tr>
      </thead>
      <tbody>${configRows}</tbody>
    </table>
  </div>` : ''}

  <!-- ===== BẢNG 3: TRACK PERFORMANCE ===== -->
  <div style="margin-bottom:22px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;">
      <h3 style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.8px;margin:0;color:#0b0b0b;border-left:3px solid #d8ff48;padding-left:10px;">
        3. Doanh Thu Chi Tiết Theo Bài Hát (Track Performance)
      </h3>
      <span style="font-family:'DM Mono',monospace;font-size:10px;color:#64748b;">${trackBreakdown.length} bài hát</span>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:11px;border:1px solid #e2e8f0;">
      <thead>
        <tr style="background:#f8fafc;border-bottom:1.5px solid #cbd5e1;font-family:'DM Mono',monospace;font-size:9.5px;text-transform:uppercase;color:#475569;">
          <th style="padding:8px 12px;width:30px;text-align:center;">#</th>
          <th style="padding:8px 12px;text-align:left;">Bài hát & Nghệ sĩ</th>
          <th style="padding:8px 12px;text-align:left;">Nguồn DSPs</th>
          <th style="padding:8px 12px;text-align:left;">Lãnh thổ</th>
          <th style="padding:8px 12px;text-align:right;">Streams</th>
          <th style="padding:8px 12px;text-align:right;">Doanh thu Gộp</th>
          <th style="padding:8px 12px;text-align:right;">Nghệ sĩ Nhận</th>
        </tr>
      </thead>
      <tbody>${trackRows}</tbody>
      <tfoot>
        <tr style="background:#f1f5f9;border-top:2px solid #0f172a;font-weight:900;">
          <td colspan="4" style="padding:10px 12px;font-family:'DM Mono',monospace;font-size:10.5px;text-transform:uppercase;color:#0f172a;">★ TỔNG (${trackBreakdown.length} bài hát)</td>
          <td style="padding:10px 12px;text-align:right;font-family:'DM Mono',monospace;">${formatStreams(totalStreams)}</td>
          <td style="padding:10px 12px;text-align:right;font-family:'DM Mono',monospace;font-weight:800;">${formatCurrency(totalGrossRevenue)}</td>
          <td style="padding:10px 12px;text-align:right;font-family:'DM Mono',monospace;font-weight:900;font-size:13px;color:#15803d;">${formatCurrency(artistNetPayout)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- ===== CHỮ KÝ ===== -->
  <div style="margin-top:30px;padding-top:18px;border-top:1px solid #e2e8f0;display:grid;grid-template-columns:1fr 1fr;gap:50px;page-break-inside:avoid;">
    <div>
      <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;color:#94a3b8;letter-spacing:1px;">ĐẠI DIỆN PHÁT HÀNH</div>
      <div style="font-size:10.5px;color:#475569;margin:4px 0 40px;">UniFLOWs Label — Kế toán Trưởng</div>
      <div style="border-top:1.5px solid #0b0b0b;width:200px;padding-top:5px;font-weight:800;font-size:11px;">UniFLOWs Entertainment JSC</div>
    </div>
    <div style="text-align:right;">
      <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;color:#94a3b8;letter-spacing:1px;">ĐẠI DIỆN NGHỆ SĨ / RIGHTS HOLDER</div>
      <div style="font-size:10.5px;color:#475569;margin:4px 0 40px;">Xác nhận số liệu & phương thức giải ngân</div>
      <div style="border-top:1.5px solid #0b0b0b;width:200px;padding-top:5px;font-weight:800;font-size:11px;margin-left:auto;">${artistDisplay.replace('Toàn bộ Roster — Catalogue Statement', 'Nghệ sĩ')}</div>
    </div>
  </div>

  <!-- ===== FOOTER ===== -->
  <div style="margin-top:22px;padding-top:12px;border-top:1px dashed #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-family:'DM Mono',monospace;font-size:9px;color:#94a3b8;">
    <span>UniFLOWs Entertainment JSC · Confidential Royalty Statement · ${statId}</span>
    <span style="background:#0b0b0b;color:#d8ff48;padding:2px 8px;border-radius:2px;font-weight:800;">UNIFLOWS ENGINE 3.0</span>
  </div>
</div>`;
}

// ============================================================================
// MỞ DIALOG XEM TRƯỚC PDF
// ============================================================================
export function openRoyaltyStatementPreview() {
  const dialog = document.querySelector('#admin-royalty-statement-dialog');
  const area   = document.querySelector('#admin-royalty-printable-area');
  if (!dialog || !area) { alert('Không tìm thấy dialog.'); return; }
  area.innerHTML = generateRoyaltyStatementHTML();
  dialog.showModal();
}

// ============================================================================
// IN PDF A4 QUA IFRAME
// ============================================================================
export function printRoyaltyStatement() {
  const content = document.querySelector('#admin-royalty-printable-area');
  if (!content) return;

  let iframe = document.getElementById('ufl-print-frame');
  if (iframe) iframe.remove();
  iframe = document.createElement('iframe');
  iframe.id = 'ufl-print-frame';
  Object.assign(iframe.style, { position:'fixed', right:'0', bottom:'0', width:'0', height:'0', border:'0' });
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
    <title>UniFLOWs_Royalty_${state.statementPeriod.replace(/\//g,'-')}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&family=Manrope:wght@400;600;700;800;900&display=swap');
      @page { size: A4 portrait; margin: 8mm 10mm; }
      body { margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important; }
      table { page-break-inside:auto; }
      tr { page-break-inside:avoid;page-break-after:auto; }
      h3 { page-break-after:avoid; }
    </style>
  </head><body>${content.innerHTML}</body></html>`);
  doc.close();
  setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); }, 500);
}

// ============================================================================
// RENDER GIAO DIỆN CHÍNH TAB 14 (ADMIN DASHBOARD)
// ============================================================================
export function renderDistributionTab() {
  const container = document.querySelector('#admin-tab-distribution');
  if (!container) return;

  const data = computeFilteredData();
  const { filteredRows, totalStreams, totalGrossRevenue, labelRetained, artistNetPayout, labelPct, artistPct, dspBreakdown, configBreakdown, trackBreakdown, uniqueArtists, uniqueDsps } = data;

  const artistOptions = ['<option value="all">🌐 Toàn bộ nghệ sĩ (All Artists)</option>']
    .concat(uniqueArtists.map(a => `<option value="${a}" ${state.selectedArtist===a?'selected':''}>👤 ${a}</option>`)).join('');
  const dspOptions = ['<option value="all">🌐 Tất cả nền tảng (All DSPs)</option>']
    .concat(uniqueDsps.map(d => `<option value="${d}" ${state.selectedDsp===d?'selected':''}>${(DSP_META[d]||{}).icon||'●'} ${d}</option>`)).join('');

  // DSP CARDS
  const dspCardsHTML = dspBreakdown.map(d => {
    const meta = DSP_META[d.name] || DSP_META['Khác'];
    const barW = Math.min(100, d.sharePct);
    return `
    <div style="background:#fff;border:1px solid #e2e8f0;border-top:3px solid ${meta.color};border-radius:10px;padding:16px;position:relative;overflow:hidden;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:16px;">${meta.icon}</span>
          <strong style="font-size:13px;color:#0f172a;font-weight:800;">${d.name}</strong>
        </div>
        <span style="font-family:'DM Mono',monospace;font-size:11px;font-weight:800;background:${meta.bg};color:${meta.color};padding:3px 8px;border-radius:5px;">${d.sharePct.toFixed(1)}%</span>
      </div>
      <div style="font-size:22px;font-weight:900;letter-spacing:-0.05em;color:#0b0b0b;margin:4px 0 2px;font-family:'DM Mono',monospace;">${formatCurrency(d.gross)}</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;font-family:'DM Mono',monospace;margin-bottom:10px;">
        <span>🎧 ${formatStreams(d.streams)} streams</span>
        <span style="color:#15803d;font-weight:700;">Net: ${formatCurrency(d.artistShare)}</span>
      </div>
      <div style="background:#f1f5f9;height:4px;border-radius:3px;overflow:hidden;">
        <div style="background:${meta.color};width:${barW}%;height:100%;border-radius:3px;"></div>
      </div>
    </div>`;
  }).join('');

  // CONFIG BREAKDOWN PILLS (chỉ show ở summary)
  const configHTML = configBreakdown.map(c => {
    const meta = getConfigMeta(c.name);
    return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #f1f5f9;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="background:${meta.bg};color:${meta.color};font-family:'DM Mono',monospace;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;text-transform:uppercase;white-space:nowrap;">${meta.label}</span>
        <span style="font-size:11px;color:#64748b;font-family:'DM Mono',monospace;">${formatStreams(c.streams)} streams</span>
      </div>
      <div style="text-align:right;">
        <div style="font-family:'DM Mono',monospace;font-weight:700;font-size:13px;color:#0f172a;">${formatCurrency(c.gross)}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:#94a3b8;">${c.sharePct.toFixed(1)}%</div>
      </div>
    </div>`;
  }).join('');

  // TRACK TABLE ROWS
  const trackRowsHTML = trackBreakdown.map((t, i) => `
    <tr style="border-bottom:1px solid #f1f5f9;transition:background 0.1s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
      <td style="padding:12px 14px;font-family:'DM Mono',monospace;font-size:11px;color:#94a3b8;">${String(i+1).padStart(2,'0')}</td>
      <td style="padding:12px 14px;">
        <strong style="font-size:13px;color:#0f172a;display:block;font-weight:800;">${t.track}</strong>
        <span style="font-size:11px;color:#64748b;">👤 ${t.artist}${t.isrc?` · <code style="font-size:10px;background:#f1f5f9;padding:1px 4px;border-radius:3px;">${t.isrc}</code>`:''}</span>
      </td>
      <td style="padding:12px 14px;font-size:11.5px;">
        <div style="font-weight:600;color:#0f172a;">${t.dspsList}</div>
        ${t.territoriesList?`<small style="display:block;color:#94a3b8;font-size:10px;margin-top:2px;">🌍 ${t.territoriesList}</small>`:''}
      </td>
      <td style="padding:12px 14px;text-align:right;font-family:'DM Mono',monospace;font-size:12px;">${formatStreams(t.streams)}</td>
      <td style="padding:12px 14px;text-align:right;font-family:'DM Mono',monospace;font-size:12px;font-weight:700;">${formatCurrency(t.gross)}</td>
      <td style="padding:12px 14px;text-align:right;font-family:'DM Mono',monospace;font-size:11.5px;color:#b45309;">${formatCurrency(t.labelShare)}</td>
      <td style="padding:12px 14px;text-align:right;font-family:'DM Mono',monospace;font-size:13px;font-weight:900;color:#15803d;">${formatCurrency(t.artistShare)}</td>
    </tr>`).join('');

  // TRANSACTION ROWS (full detail)
  const txRowsHTML = filteredRows.map((r, i) => {
    const lShare = r.revenue * (labelPct / 100);
    const aShare = r.revenue * (artistPct / 100);
    const dspMeta = DSP_META[r.dsp] || DSP_META['Khác'];
    const cfgMeta = getConfigMeta(r.configuration || r.subSource);
    return `
    <tr style="border-bottom:1px solid #f1f5f9;font-size:11.5px;transition:background 0.1s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
      <td style="padding:9px 12px;font-family:'DM Mono',monospace;color:#94a3b8;font-size:10px;">${String(i+1).padStart(2,'0')}</td>
      <td style="padding:9px 12px;">
        <strong style="color:#0f172a;display:block;font-size:12.5px;font-weight:800;">${r.track}</strong>
        <span style="font-size:10.5px;color:#64748b;">${r.artist}</span>
      </td>
      <td style="padding:9px 12px;">
        <span style="display:inline-flex;align-items:center;gap:5px;background:${dspMeta.bg};color:${dspMeta.color};font-weight:800;padding:3px 8px;border-radius:5px;font-size:11px;">
          ${dspMeta.icon} ${r.dsp}
        </span>
      </td>
      <td style="padding:9px 12px;">
        <span style="background:${cfgMeta.bg};color:${cfgMeta.color};font-family:'DM Mono',monospace;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:3px;text-transform:uppercase;">${cfgMeta.label}</span>
      </td>
      <td style="padding:9px 12px;text-align:center;">
        <span style="font-family:'DM Mono',monospace;font-size:11px;background:#f1f5f9;color:#334155;padding:2px 6px;border-radius:3px;font-weight:600;">${r.territory||'VN'}</span>
      </td>
      <td style="padding:9px 12px;text-align:right;font-family:'DM Mono',monospace;">${formatStreams(r.streams)}</td>
      <td style="padding:9px 12px;text-align:right;font-family:'DM Mono',monospace;font-weight:700;">${formatCurrency(r.revenue)}</td>
      <td style="padding:9px 12px;text-align:right;font-family:'DM Mono',monospace;color:#b45309;">${formatCurrency(lShare)}</td>
      <td style="padding:9px 12px;text-align:right;font-family:'DM Mono',monospace;font-weight:800;color:#15803d;">${formatCurrency(aShare)}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
  <!-- HEADER -->
  <div class="section-head" style="padding-left:0;padding-right:0;margin-bottom:24px;">
    <div>
      <h2 style="font-size:24px;letter-spacing:-0.04em;margin:0;font-weight:900;">📊 Đối Soát Phân Phối & Doanh Thu Royalty</h2>
      <p style="font-size:13px;opacity:0.7;margin:5px 0 0;">Phân tích đa nền tảng, nguồn stream chi tiết và xuất phiếu PDF chuẩn quốc tế.</p>
    </div>
    <span class="kicker" style="background:#0b0b0b;color:#d8ff48;padding:6px 12px;font-weight:900;border-radius:4px;">⚡ Engine 3.0</span>
  </div>

  <!-- IMPORT CSV -->
  <div style="background:#fff;border:2px solid var(--ink);box-shadow:4px 4px 0 var(--ink);border-radius:8px;padding:20px;margin-bottom:24px;">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;margin-bottom:16px;">
      <div>
        <h3 style="margin:0;font-size:15px;letter-spacing:-0.02em;display:flex;align-items:center;gap:8px;">📥 Nạp Báo Cáo CSV Phân Phối</h3>
        <p style="margin:4px 0 0;font-size:12px;opacity:0.7;">Hỗ trợ CSV từ UniFLOWs, Amuse, DistroKid, TuneCore, CD Baby. Tự nhận diện cột doanh thu, exchange rate, nguồn stream.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <input type="file" id="dist-csv-file-input" accept=".csv" style="display:none;">
        <button type="button" id="dist-btn-browse-csv" class="button" style="background:#0f172a;color:#fff;padding:9px 16px;font-size:11px;">📂 Tải Lên CSV</button>
        <button type="button" id="dist-btn-load-khoband" class="button alt" style="padding:9px 14px;font-size:11px;border-color:#2563eb;color:#2563eb;font-weight:800;">🎸 Mẫu Khờ Band</button>
        <button type="button" id="dist-btn-load-sample" class="button alt" style="padding:9px 14px;font-size:11px;">✨ Dữ liệu Demo</button>
        <button type="button" id="dist-btn-download-tpl" class="button alt" style="padding:9px 14px;font-size:11px;">📑 Tải CSV Mẫu</button>
      </div>
    </div>
    <div id="dist-file-dropzone" style="border:2px dashed #cbd5e1;border-radius:6px;padding:12px 16px;background:#f8fafc;cursor:pointer;text-align:center;transition:all 0.2s;">
      <span style="font-size:12px;color:#475569;">📎 Đang dùng: <strong style="color:#0b0b0b;">${state.fileName}</strong> — ${state.records.length} dòng · Kéo thả file CSV vào đây</span>
    </div>
  </div>

  <!-- CONTROLS -->
  <div style="background:#0b0b0b;color:#fff;border-radius:10px;padding:22px;margin-bottom:24px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
      <span style="font-family:'DM Mono',monospace;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#d8ff48;">⚙️ Cấu Hình Khấu Trừ & Bộ Lọc</span>
      <div style="display:flex;align-items:center;gap:10px;font-size:12px;">
        <div style="display:flex;align-items:center;gap:4px;background:#1e293b;padding:4px 8px;border-radius:5px;">
          <span style="font-family:'DM Mono',monospace;font-size:10px;color:#94a3b8;">Tiền tệ:</span>
          <button type="button" id="dist-cur-vnd" class="button" style="padding:3px 10px;font-size:10px;${state.currency==='VND'?'background:#d8ff48;color:#0b0b0b;font-weight:900;':'background:transparent;color:#fff;border-color:#475569;'}">VND ₫</button>
          <button type="button" id="dist-cur-usd" class="button" style="padding:3px 10px;font-size:10px;${state.currency==='USD'?'background:#d8ff48;color:#0b0b0b;font-weight:900;':'background:transparent;color:#fff;border-color:#475569;'}">USD $</button>
        </div>
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:#94a3b8;">1$ = ${state.exchangeRate.toLocaleString()}₫</span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;align-items:flex-end;">
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <label style="font-family:'DM Mono',monospace;font-size:10px;font-weight:800;text-transform:uppercase;color:#d8ff48;">🏛️ Label Giữ (%)</label>
          <span id="dist-split-indicator" style="font-family:'DM Mono',monospace;font-size:10px;color:#d8ff48;font-weight:800;">Hãng ${labelPct}% / NĐ ${artistPct}%</span>
        </div>
        <div style="display:flex;gap:6px;">
          <input type="number" id="dist-label-pct-input" min="0" max="100" step="1" value="${labelPct}"
            style="width:75px;padding:9px;font-size:14px;font-weight:900;font-family:'DM Mono',monospace;border:1px solid #475569;background:#1e293b;color:#d8ff48;text-align:center;border-radius:4px;">
          <div style="display:flex;gap:4px;flex:1;">
            ${[10,15,20,30,50].map(p=>`<button type="button" class="dist-pct-pill button" data-pct="${p}" style="flex:1;padding:8px 2px;font-size:10px;${labelPct===p?'background:#d8ff48;color:#0b0b0b;border-color:#d8ff48;font-weight:900;':'background:transparent;color:#fff;border-color:#475569;'}">${p}%</button>`).join('')}
          </div>
        </div>
      </div>
      <div>
        <label style="font-family:'DM Mono',monospace;font-size:10px;font-weight:800;text-transform:uppercase;color:#fff;display:block;margin-bottom:6px;">👤 Nghệ sĩ</label>
        <select id="dist-artist-select" style="width:100%;padding:9px 12px;font-size:12px;border:1px solid #475569;background:#1e293b;color:#fff;border-radius:4px;">${artistOptions}</select>
      </div>
      <div>
        <label style="font-family:'DM Mono',monospace;font-size:10px;font-weight:800;text-transform:uppercase;color:#fff;display:block;margin-bottom:6px;">🌐 Nền tảng (DSP)</label>
        <select id="dist-dsp-select" style="width:100%;padding:9px 12px;font-size:12px;border:1px solid #475569;background:#1e293b;color:#fff;border-radius:4px;">${dspOptions}</select>
      </div>
      <div>
        <label style="font-family:'DM Mono',monospace;font-size:10px;font-weight:800;text-transform:uppercase;color:#fff;display:block;margin-bottom:6px;">🔍 Tìm kiếm</label>
        <input type="text" id="dist-search-input" value="${state.searchQuery}" placeholder="Bài hát, ISRC, quốc gia, loại stream..."
          style="width:100%;padding:9px 12px;font-size:12px;border:1px solid #475569;background:#1e293b;color:#fff;border-radius:4px;">
      </div>
    </div>
  </div>

  <!-- 4 METRIC CARDS -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:24px;">
    <div style="background:#fff;border:1px solid #e2e8f0;border-top:4px solid #3b82f6;border-radius:10px;padding:18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:11px;font-weight:800;text-transform:uppercase;color:#3b82f6;font-family:'DM Mono',monospace;">🎧 Tổng Streams</span>
        <span style="font-size:10px;font-family:'DM Mono',monospace;color:#94a3b8;">${filteredRows.length} dòng</span>
      </div>
      <strong style="display:block;font-size:28px;margin-top:6px;letter-spacing:-0.05em;color:#0f172a;font-family:'DM Mono',monospace;">${formatStreams(totalStreams)}</strong>
      <span style="font-size:11px;color:#94a3b8;margin-top:3px;display:block;">Lượt nghe / Units thực tế</span>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-top:4px solid #0b0b0b;border-radius:10px;padding:18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:11px;font-weight:800;text-transform:uppercase;color:#0b0b0b;font-family:'DM Mono',monospace;">💰 Doanh Thu Gộp</span>
        <span style="font-size:10px;font-family:'DM Mono',monospace;color:#94a3b8;">100% Gross</span>
      </div>
      <strong style="display:block;font-size:28px;margin-top:6px;letter-spacing:-0.05em;color:#0b0b0b;font-family:'DM Mono',monospace;">${formatCurrency(totalGrossRevenue)}</strong>
      <span style="font-size:11px;color:#94a3b8;margin-top:3px;display:block;">Trước khấu trừ Label</span>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-top:4px solid #b45309;border-radius:10px;padding:18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:11px;font-weight:800;text-transform:uppercase;color:#b45309;font-family:'DM Mono',monospace;">🏛️ Label Giữ (${labelPct}%)</span>
        <span style="font-size:10px;font-family:'DM Mono',monospace;color:#b45309;font-weight:800;">Label Share</span>
      </div>
      <strong style="display:block;font-size:28px;margin-top:6px;letter-spacing:-0.05em;color:#92400e;font-family:'DM Mono',monospace;">${formatCurrency(labelRetained)}</strong>
      <span style="font-size:11px;color:#94a3b8;margin-top:3px;display:block;">Phí phân phối & quản lý</span>
    </div>
    <div style="background:#f0fdf4;border:1.5px solid #16a34a;border-top:4px solid #15803d;border-radius:10px;padding:18px;box-shadow:2px 2px 0 #15803d;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:11px;font-weight:900;text-transform:uppercase;color:#15803d;font-family:'DM Mono',monospace;">💳 Nghệ Sĩ Nhận (${artistPct}%)</span>
        <span style="font-size:10px;font-family:'DM Mono',monospace;background:#dcfce7;color:#166534;padding:2px 6px;border-radius:3px;font-weight:800;">NET</span>
      </div>
      <strong style="display:block;font-size:28px;margin-top:6px;letter-spacing:-0.05em;color:#15803d;font-family:'DM Mono',monospace;">${formatCurrency(artistNetPayout)}</strong>
      <span style="font-size:11px;color:#166534;margin-top:3px;display:block;font-weight:700;">Số tiền giải ngân</span>
    </div>
  </div>

  <!-- ACTIONS BAR -->
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;background:#f8fafc;border:1px solid #e2e8f0;padding:14px 18px;border-radius:8px;margin-bottom:24px;">
    <div style="display:flex;gap:8px;align-items:center;">
      <span style="font-size:11px;font-weight:800;text-transform:uppercase;font-family:'DM Mono',monospace;color:#475569;">Chế độ xem:</span>
      <button type="button" id="dist-view-summary-btn" class="button" style="padding:7px 14px;font-size:11px;${state.activeView==='summary'?'background:#0f172a;color:#fff;':'background:#fff;color:#0f172a;border-color:#e2e8f0;'}">📊 Tổng Hợp</button>
      <button type="button" id="dist-view-tx-btn" class="button" style="padding:7px 14px;font-size:11px;${state.activeView==='transactions'?'background:#0f172a;color:#fff;':'background:#fff;color:#0f172a;border-color:#e2e8f0;'}">📋 Chi Tiết (${filteredRows.length})</button>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <button type="button" id="dist-btn-export-csv" class="button" style="background:#15803d;border-color:#15803d;color:#fff;font-weight:800;padding:10px 18px;font-size:11px;">📥 Xuất CSV</button>
      <button type="button" id="dist-btn-open-pdf" class="button" style="background:#0f172a;border-color:#0f172a;color:#fff;font-weight:800;padding:10px 18px;font-size:11px;">🖨️ Xuất Phiếu PDF A4</button>
    </div>
  </div>

  <!-- DSP CARDS GRID -->
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:22px;margin-bottom:24px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div>
        <h3 style="font-size:15px;margin:0;font-weight:900;letter-spacing:-0.02em;">🌐 Thị Phần Theo Nền Tảng (DSP Breakdown)</h3>
        <p style="font-size:12px;color:#64748b;margin:3px 0 0;">Phân bổ doanh thu & lượt stream theo từng nguồn phân phối.</p>
      </div>
      <span class="kicker">Market Share</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:18px;">
      ${dspCardsHTML || '<p style="color:#94a3b8;font-size:13px;">Chưa có dữ liệu nền tảng.</p>'}
    </div>
    <!-- DSP Table -->
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
        <thead>
          <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;font-family:'DM Mono',monospace;font-size:10.5px;text-transform:uppercase;color:#64748b;">
            <th style="padding:10px 14px;text-align:left;">Nguồn / Nền tảng</th>
            <th style="padding:10px 14px;text-align:right;">Streams</th>
            <th style="padding:10px 14px;text-align:right;">Doanh thu Gộp</th>
            <th style="padding:10px 14px;text-align:right;">Khấu trừ Label (${labelPct}%)</th>
            <th style="padding:10px 14px;text-align:right;">Nghệ sĩ Nhận (${artistPct}%)</th>
            <th style="padding:10px 14px;text-align:right;">Thị phần</th>
          </tr>
        </thead>
        <tbody>
          ${dspBreakdown.map(d => `
            <tr style="border-bottom:1px solid #f1f5f9;transition:background 0.1s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
              <td style="padding:10px 14px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:8px;">
                <span style="font-size:15px;">${(DSP_META[d.name]||{}).icon||'●'}</span> ${d.name}
              </td>
              <td style="padding:10px 14px;text-align:right;font-family:'DM Mono',monospace;">${formatStreams(d.streams)}</td>
              <td style="padding:10px 14px;text-align:right;font-family:'DM Mono',monospace;font-weight:700;">${formatCurrency(d.gross)}</td>
              <td style="padding:10px 14px;text-align:right;font-family:'DM Mono',monospace;color:#b45309;">${formatCurrency(d.labelShare)}</td>
              <td style="padding:10px 14px;text-align:right;font-family:'DM Mono',monospace;font-weight:800;color:#15803d;">${formatCurrency(d.artistShare)}</td>
              <td style="padding:10px 14px;text-align:right;font-family:'DM Mono',monospace;color:#64748b;">${d.sharePct.toFixed(1)}%</td>
            </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr style="background:#0f172a;color:#fff;font-weight:900;">
            <td style="padding:12px 14px;font-family:'DM Mono',monospace;font-size:11px;text-transform:uppercase;">★ TỔNG CỘNG</td>
            <td style="padding:12px 14px;text-align:right;font-family:'DM Mono',monospace;">${formatStreams(totalStreams)}</td>
            <td style="padding:12px 14px;text-align:right;font-family:'DM Mono',monospace;">${formatCurrency(totalGrossRevenue)}</td>
            <td style="padding:12px 14px;text-align:right;font-family:'DM Mono',monospace;color:#fcd34d;">${formatCurrency(labelRetained)}</td>
            <td style="padding:12px 14px;text-align:right;font-family:'DM Mono',monospace;color:#d8ff48;font-size:14px;">${formatCurrency(artistNetPayout)}</td>
            <td style="padding:12px 14px;text-align:right;font-family:'DM Mono',monospace;">100.0%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>

  ${configBreakdown.length > 0 ? `
  <!-- NGUỒN STREAM CHI TIẾT -->
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:24px;">
    <div style="padding:16px 20px;background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <strong style="font-size:15px;letter-spacing:-0.02em;">📡 Nguồn Stream Chi Tiết (Configuration Breakdown)</strong>
        <span style="font-size:12px;opacity:0.7;display:block;margin-top:2px;">Phân loại Premium, Promotion, UGC, Family, IG Music... theo từng loại tương tác.</span>
      </div>
      <span style="font-family:'DM Mono',monospace;font-size:11px;background:rgba(255,255,255,0.15);padding:4px 10px;border-radius:4px;">${configBreakdown.length} loại stream</span>
    </div>
    <div>${configHTML}</div>
  </div>` : ''}

  ${state.activeView === 'summary' ? `
  <!-- TRACK TABLE -->
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:30px;">
    <div style="padding:16px 20px;background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <div>
        <strong style="font-size:15px;letter-spacing:-0.02em;">Chi Tiết Doanh Thu Từng Bài Hát (Track-by-Track)</strong>
        <span style="font-size:12px;opacity:0.7;display:block;margin-top:2px;">Tổng hợp lượt stream, doanh thu gộp và thực nhận theo từng ca khúc.</span>
      </div>
      <span style="font-family:'DM Mono',monospace;font-size:11px;background:rgba(255,255,255,0.15);padding:4px 10px;border-radius:4px;">${trackBreakdown.length} bài hát</span>
    </div>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
        <thead>
          <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;font-family:'DM Mono',monospace;font-size:10.5px;text-transform:uppercase;color:#64748b;">
            <th style="padding:12px 14px;width:40px;">#</th>
            <th style="padding:12px 14px;">Bài hát & Nghệ sĩ</th>
            <th style="padding:12px 14px;">Nguồn & Lãnh thổ</th>
            <th style="padding:12px 14px;text-align:right;">Streams</th>
            <th style="padding:12px 14px;text-align:right;">Doanh thu Gộp</th>
            <th style="padding:12px 14px;text-align:right;">Label (${labelPct}%)</th>
            <th style="padding:12px 14px;text-align:right;">Nghệ sĩ (${artistPct}%)</th>
          </tr>
        </thead>
        <tbody>
          ${trackRowsHTML || `<tr><td colspan="7" style="padding:30px;text-align:center;color:#94a3b8;">Không có dữ liệu phù hợp với bộ lọc.</td></tr>`}
        </tbody>
        ${trackBreakdown.length > 0 ? `
        <tfoot>
          <tr style="background:#0f172a;color:#fff;font-weight:900;">
            <td colspan="3" style="padding:12px 14px;font-family:'DM Mono',monospace;font-size:11px;text-transform:uppercase;">★ TỔNG (${trackBreakdown.length} bài hát)</td>
            <td style="padding:12px 14px;text-align:right;font-family:'DM Mono',monospace;">${formatStreams(totalStreams)}</td>
            <td style="padding:12px 14px;text-align:right;font-family:'DM Mono',monospace;">${formatCurrency(totalGrossRevenue)}</td>
            <td style="padding:12px 14px;text-align:right;font-family:'DM Mono',monospace;color:#fcd34d;">${formatCurrency(labelRetained)}</td>
            <td style="padding:12px 14px;text-align:right;font-family:'DM Mono',monospace;color:#d8ff48;font-size:14px;">${formatCurrency(artistNetPayout)}</td>
          </tr>
        </tfoot>` : ''}
      </table>
    </div>
  </div>` : `
  <!-- TRANSACTION LEDGER -->
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:30px;">
    <div style="padding:16px 20px;background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <div>
        <strong style="font-size:15px;letter-spacing:-0.02em;">Chi Tiết Toàn Bộ Dòng Giao Dịch (Raw Distribution Ledger)</strong>
        <span style="font-size:12px;opacity:0.7;display:block;margin-top:2px;">Từng dòng bản ghi với đầy đủ nguồn, loại stream, quốc gia và doanh thu.</span>
      </div>
      <span style="font-family:'DM Mono',monospace;font-size:11px;background:rgba(255,255,255,0.15);padding:4px 10px;border-radius:4px;">${filteredRows.length} dòng</span>
    </div>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;color:#64748b;">
            <th style="padding:10px 12px;width:35px;">#</th>
            <th style="padding:10px 12px;">Bài hát & Nghệ sĩ</th>
            <th style="padding:10px 12px;">Nền tảng</th>
            <th style="padding:10px 12px;">Loại Stream</th>
            <th style="padding:10px 12px;text-align:center;">Quốc gia</th>
            <th style="padding:10px 12px;text-align:right;">Streams</th>
            <th style="padding:10px 12px;text-align:right;">Doanh thu Gộp</th>
            <th style="padding:10px 12px;text-align:right;">Label (${labelPct}%)</th>
            <th style="padding:10px 12px;text-align:right;">NĐ Nhận (${artistPct}%)</th>
          </tr>
        </thead>
        <tbody>
          ${txRowsHTML || `<tr><td colspan="9" style="padding:30px;text-align:center;color:#94a3b8;">Không có dữ liệu.</td></tr>`}
        </tbody>
        <tfoot>
          <tr style="background:#0f172a;color:#fff;font-weight:900;">
            <td colspan="5" style="padding:12px;font-family:'DM Mono',monospace;font-size:10.5px;text-transform:uppercase;">★ TỔNG (${filteredRows.length} dòng)</td>
            <td style="padding:12px;text-align:right;font-family:'DM Mono',monospace;">${formatStreams(totalStreams)}</td>
            <td style="padding:12px;text-align:right;font-family:'DM Mono',monospace;">${formatCurrency(totalGrossRevenue)}</td>
            <td style="padding:12px;text-align:right;font-family:'DM Mono',monospace;color:#fcd34d;">${formatCurrency(labelRetained)}</td>
            <td style="padding:12px;text-align:right;font-family:'DM Mono',monospace;color:#d8ff48;font-size:14px;">${formatCurrency(artistNetPayout)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>`}
  `;

  attachEventHandlers();
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================
function attachEventHandlers() {
  const fileInput    = document.querySelector('#dist-csv-file-input');
  const browseBtn    = document.querySelector('#dist-btn-browse-csv');
  const loadSample   = document.querySelector('#dist-btn-load-sample');
  const loadKhoband  = document.querySelector('#dist-btn-load-khoband');
  const downloadTpl  = document.querySelector('#dist-btn-download-tpl');
  const dropzone     = document.querySelector('#dist-file-dropzone');
  const pctInput     = document.querySelector('#dist-label-pct-input');
  const artistSelect = document.querySelector('#dist-artist-select');
  const dspSelect    = document.querySelector('#dist-dsp-select');
  const searchInput  = document.querySelector('#dist-search-input');
  const curVndBtn    = document.querySelector('#dist-cur-vnd');
  const curUsdBtn    = document.querySelector('#dist-cur-usd');
  const exportCsvBtn = document.querySelector('#dist-btn-export-csv');
  const openPdfBtn   = document.querySelector('#dist-btn-open-pdf');
  const viewSummary  = document.querySelector('#dist-view-summary-btn');
  const viewTx       = document.querySelector('#dist-view-tx-btn');

  viewSummary?.addEventListener('click',  () => { state.activeView = 'summary';      renderDistributionTab(); });
  viewTx?.addEventListener('click',       () => { state.activeView = 'transactions'; renderDistributionTab(); });

  browseBtn?.addEventListener('click', () => fileInput?.click());
  dropzone?.addEventListener('click',  () => fileInput?.click());

  async function loadCSV(file) {
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      if (parsed.length === 0) { alert('File CSV không có dữ liệu hợp lệ.'); return; }
      state.records = parsed;
      state.fileName = file.name;
      state.isCustomLoaded = true;
      state.selectedArtist = 'all';
      state.selectedDsp = 'all';
      state.searchQuery = '';
      renderDistributionTab();
      alert(`✓ Nạp thành công ${parsed.length} dòng dữ liệu từ: ${file.name}`);
    } catch (err) { alert('Lỗi đọc CSV: ' + err.message); }
  }

  fileInput?.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (file) await loadCSV(file);
    if (fileInput) fileInput.value = '';
  });

  if (dropzone) {
    ['dragenter','dragover'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.style.borderColor='#16a34a'; dropzone.style.background='#f0fdf4'; }));
    ['dragleave','drop'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.style.borderColor='#cbd5e1'; dropzone.style.background='#f8fafc'; }));
    dropzone.addEventListener('drop', async e => { const f = e.dataTransfer?.files?.[0]; if (f?.name.endsWith('.csv')) await loadCSV(f); });
  }

  loadSample?.addEventListener('click', () => {
    state.records = [...sampleDistributionData];
    state.fileName = 'uniflows_sample_dataset.csv';
    state.isCustomLoaded = false;
    state.selectedArtist = 'all'; state.selectedDsp = 'all'; state.searchQuery = '';
    renderDistributionTab();
    alert('✓ Đã nạp dữ liệu demo UniFLOWs!');
  });

  loadKhoband?.addEventListener('click', async () => {
    try {
      const res = await fetch('/sample_distribution_khoband.csv');
      if (!res.ok) throw new Error('Không tải được file mẫu.');
      const text = await res.text();
      const parsed = parseCSV(text);
      state.records = parsed;
      state.fileName = 'sample_distribution_khoband.csv';
      state.isCustomLoaded = true;
      state.selectedArtist = 'all'; state.selectedDsp = 'all'; state.searchQuery = '';
      renderDistributionTab();
      alert(`✓ Nạp thành công ${parsed.length} dòng báo cáo Khờ Band!`);
    } catch (err) { alert('Lỗi: ' + err.message); }
  });

  downloadTpl?.addEventListener('click', () => downloadCSVTemplate());

  pctInput?.addEventListener('input', e => {
    let v = parseFloat(e.target.value);
    if (isNaN(v)) v = 0;
    state.labelPercentage = Math.max(0, Math.min(100, v));
    renderDistributionTab();
  });

  document.querySelectorAll('.dist-pct-pill').forEach(p =>
    p.addEventListener('click', () => { state.labelPercentage = Number(p.dataset.pct) || 20; renderDistributionTab(); })
  );

  artistSelect?.addEventListener('change', e => { state.selectedArtist = e.target.value; renderDistributionTab(); });
  dspSelect?.addEventListener('change',    e => { state.selectedDsp    = e.target.value; renderDistributionTab(); });
  searchInput?.addEventListener('input',   e => { state.searchQuery = e.target.value; renderDistributionTab(); });
  curVndBtn?.addEventListener('click', () => { state.currency = 'VND'; renderDistributionTab(); });
  curUsdBtn?.addEventListener('click', () => { state.currency = 'USD'; renderDistributionTab(); });
  exportCsvBtn?.addEventListener('click', () => exportProcessedCSV());
  openPdfBtn?.addEventListener('click',   () => openRoyaltyStatementPreview());

  // Print button inside dialog
  const printBtn = document.querySelector('#btn-print-royalty-dialog');
  const closeBtn = document.querySelector('#btn-close-royalty-dialog');
  printBtn?.addEventListener('click', () => printRoyaltyStatement());
  closeBtn?.addEventListener('click', () => document.querySelector('#admin-royalty-statement-dialog')?.close());
}
