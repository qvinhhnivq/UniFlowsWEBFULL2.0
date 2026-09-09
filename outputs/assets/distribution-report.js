/**
 * UniFLOWs Label — Distribution & Royalty Report Engine v4.0
 * Swiss Editorial Brutalist UI — Paper / Ink / Lime palette
 * Matches uniflowslabel.com design language exactly.
 */

// ============================================================================
// SAMPLE DATA (KHỜ BAND STYLE)
// ============================================================================
export const sampleDistributionData = [
  { artist:'Khờ Band', track:'mùa hạ 2019',               dsp:'Spotify',     subSource:'Stream',                  streams:59,  revenue:981907,  currency:'VND', isrc:'TCAJT2506106', territory:'VN',    configuration:'Stream',                  saleDate:'2026-05-31' },
  { artist:'Khờ Band', track:'mùa hạ 2019',               dsp:'YouTube Red', subSource:'Family Promotion Stream', streams:18,  revenue:1032531, currency:'VND', isrc:'TCAJT2506106', territory:'VN,US', configuration:'Family Promotion Stream',  saleDate:'2026-06-01' },
  { artist:'Khờ Band', track:'mùa hạ 2019',               dsp:'YouTube Red', subSource:'Premium Stream',          streams:5,   revenue:503945,  currency:'VND', isrc:'TCAJT2506106', territory:'VN',    configuration:'Premium Stream',           saleDate:'2026-06-01' },
  { artist:'Khờ Band', track:'mùa hạ 2019',               dsp:'YouTube Red', subSource:'UGC Stream',             streams:2,   revenue:58971,   currency:'VND', isrc:'TCAJT2506106', territory:'VN',    configuration:'UGC Stream',               saleDate:'2026-06-01' },
  { artist:'Khờ Band', track:'mùa hạ 2019',               dsp:'YouTube',     subSource:'Promotion Stream',       streams:83,  revenue:14972,   currency:'VND', isrc:'TCAJT2506106', territory:'VN',    configuration:'Promotion Stream',         saleDate:'2026-06-01' },
  { artist:'Khờ Band', track:'mùa hạ 2019',               dsp:'Meta',        subSource:'IG Music Notes',         streams:46,  revenue:1332,    currency:'VND', isrc:'TCAJT2506106', territory:'VN',    configuration:'IG_MUSIC_NOTES',           saleDate:'2026-05-31' },
  { artist:'Khờ Band', track:'mùa hạ 2019',               dsp:'TikTok',      subSource:'UGC',                    streams:8,   revenue:277,     currency:'VND', isrc:'TCAJT2506106', territory:'VN',    configuration:'UGC',                      saleDate:'2026-05-31' },
  { artist:'Khờ Band', track:'khoảng trống (unplugged)',   dsp:'Spotify',     subSource:'Stream',                  streams:6,   revenue:91191,   currency:'VND', isrc:'TCAJQ2502820', territory:'VN',    configuration:'Stream',                  saleDate:'2026-05-31' },
  { artist:'Khờ Band', track:'khoảng trống (unplugged)',   dsp:'YouTube Red', subSource:'Stream',                  streams:1,   revenue:70252,   currency:'VND', isrc:'TCAJQ2502820', territory:'VN',    configuration:'Stream',                  saleDate:'2026-06-01' },
  { artist:'Khờ Band', track:'khoảng trống (unplugged)',   dsp:'YouTube Red', subSource:'Family Promotion Stream', streams:10,  revenue:517531,  currency:'VND', isrc:'TCAJQ2502820', territory:'VN,AU', configuration:'Family Promotion Stream',  saleDate:'2026-06-01' },
  { artist:'Khờ Band', track:'khoảng trống (unplugged)',   dsp:'YouTube Red', subSource:'Premium Stream',          streams:2,   revenue:287708,  currency:'VND', isrc:'TCAJQ2502820', territory:'VN,KR', configuration:'Premium Stream',           saleDate:'2026-06-01' },
  { artist:'Khờ Band', track:'khoảng trống (unplugged)',   dsp:'YouTube',     subSource:'Promotion Stream',       streams:168, revenue:283780,  currency:'VND', isrc:'TCAJQ2502820', territory:'VN',    configuration:'Promotion Stream',         saleDate:'2026-06-01' },
  { artist:'Khờ Band', track:'khoảng trống (unplugged)',   dsp:'Meta',        subSource:'IG Music Notes',         streams:2,   revenue:59,      currency:'VND', isrc:'TCAJQ2502820', territory:'VN',    configuration:'IG_MUSIC_NOTES',           saleDate:'2026-06-01' },
  { artist:'Khờ Band', track:'Đôi tay, bàn chân...',      dsp:'YouTube',     subSource:'Promotion Stream',       streams:5,   revenue:4435,    currency:'VND', isrc:'VNA1M2601128', territory:'VN',    configuration:'Promotion Stream',         saleDate:'2026-06-16' },
];

// ============================================================================
// DSP META
// ============================================================================
export const DSP_META = {
  'Spotify':       { color:'#1db954', dot:'#1db954' },
  'Apple Music':   { color:'#fc3c44', dot:'#fc3c44' },
  'YouTube':       { color:'#ff0000', dot:'#ff0000' },
  'YouTube Red':   { color:'#dc2626', dot:'#dc2626' },
  'YouTube Music': { color:'#dc2626', dot:'#dc2626' },
  'Meta':          { color:'#0081fb', dot:'#0081fb' },
  'TikTok':        { color:'#0b0b0b', dot:'#0b0b0b' },
  'Amazon Music':  { color:'#25d1da', dot:'#25d1da' },
  'Deezer':        { color:'#a238ff', dot:'#a238ff' },
  'Zing MP3':      { color:'#8b5cf6', dot:'#8b5cf6' },
  'Tidal':         { color:'#0a0a0a', dot:'#0a0a0a' },
  'SoundCloud':    { color:'#ff5500', dot:'#ff5500' },
  'Khác':          { color:'#475569', dot:'#475569' },
};

const CONFIG_META = {
  'Stream':                  { label:'Premium Stream',    bg:'#d8ff48', color:'#0b0b0b' },
  'Premium Stream':          { label:'Premium',           bg:'#d8ff48', color:'#0b0b0b' },
  'Promotion Stream':        { label:'Promo Stream',      bg:'#0b0b0b', color:'#fff' },
  'Family Promotion Stream': { label:'Family Promo',      bg:'#0b0b0b', color:'#d8ff48' },
  'UGC Stream':              { label:'UGC Stream',        bg:'#e5e4de', color:'#0b0b0b' },
  'Premium UGC Stream':      { label:'Premium UGC',       bg:'#e5e4de', color:'#0b0b0b' },
  'UGC':                     { label:'UGC',               bg:'#e5e4de', color:'#0b0b0b' },
  'PGC':                     { label:'PGC',               bg:'#e5e4de', color:'#0b0b0b' },
  'IG_MUSIC_NOTES':          { label:'IG Music Notes',    bg:'#f5f4f0', color:'#0b0b0b' },
  'IG_MUSIC_STICKER':        { label:'IG Music Sticker',  bg:'#f5f4f0', color:'#0b0b0b' },
  'FB_FROM_IG_CROSSPOST':    { label:'FB×IG',             bg:'#f5f4f0', color:'#0b0b0b' },
  'Video Stream':            { label:'Video Stream',      bg:'#0b0b0b', color:'#fff' },
  'Ad-supported':            { label:'Ad-supported',      bg:'#e5e4de', color:'#0b0b0b' },
};
function cfgMeta(cfg) { return CONFIG_META[cfg] || { label: cfg || 'Other', bg:'#e5e4de', color:'#0b0b0b' }; }

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
  statementPeriod: 'Tháng ' + (new Date().getMonth()+1) + '/' + new Date().getFullYear(),
  statementNumber: 'UFL-' + new Date().getFullYear() + '-001',
  curveNote: 'Bản đối soát này đã được Curve thông qua và đã lọc streams ảo từ các DSP theo tiêu chuẩn phân phối quốc tế.',
  isCustomLoaded: false,
  fileName: 'uniflows_sample_dataset.csv',
  activeView: 'summary',
};

// ============================================================================
// UTILITIES
// ============================================================================
export function formatCurrency(vnd, cur = state.currency) {
  const n = Number(vnd) || 0;
  if (cur === 'USD') {
    const u = n / state.exchangeRate;
    if (Math.abs(u) > 0 && Math.abs(u) < 0.01) return '$' + u.toFixed(4);
    return '$' + u.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  }
  if (n === 0) return '₫ 0';
  if (Math.abs(n) > 0 && Math.abs(n) < 1000)
    return '₫ ' + n.toLocaleString('vi-VN', {minimumFractionDigits:2, maximumFractionDigits:2});
  if (n % 1 !== 0 && Math.abs(n) < 100000)
    return '₫ ' + n.toLocaleString('vi-VN', {minimumFractionDigits:2, maximumFractionDigits:2});
  return '₫ ' + Math.round(n).toLocaleString('vi-VN');
}
export function formatStreams(n) { return (Number(n)||0).toLocaleString('vi-VN'); }
export function parseRawNumber(s) {
  if (typeof s === 'number') return s;
  if (!s) return 0;
  const v = parseFloat(String(s).replace(/[₫$,\s]/g,'').trim());
  return isNaN(v) ? 0 : v;
}

// ============================================================================
// CSV PARSER
// ============================================================================
export function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV quá ít dữ liệu.');

  function splitRow(r) {
    const out=[]; let cur='', inQ=false;
    for (let i=0;i<r.length;i++) {
      const c=r[i];
      if (c==='"') { inQ=!inQ; }
      else if (c===',' && !inQ) { out.push(cur.trim().replace(/^"|"$/g,'').replace(/""/g,'"')); cur=''; }
      else { cur+=c; }
    }
    out.push(cur.trim().replace(/^"|"$/g,'').replace(/""/g,'"'));
    return out;
  }

  const hdrs = splitRow(lines[0]).map(h=>h.toLowerCase().trim());
  function col(exact, fuzzy=[]) {
    for (const e of exact) { const i=hdrs.indexOf(e.toLowerCase()); if (i!==-1) return i; }
    for (const f of fuzzy) { const i=hdrs.findIndex(h=>h.includes(f.toLowerCase())); if (i!==-1) return i; }
    return -1;
  }

  const iArtist  = col(['track artist','release artist','artist_name','artist','performer'],['artist','performer']);
  const iTrack   = col(['track title','release title','song_title','track','title'],['track','title','song']);
  const iSource  = col(['source'],['source']);
  const iSubSrc  = col(['sub source','subsource'],['sub source']);
  const iConfig  = col(['configuration'],['config']);
  const iStreams  = col(['units','quantity','streams','plays'],['unit','stream','play']);
  const iTerritory = col(['territory','country'],['territory','country']);
  const iIsrc    = col(['isrc'],['isrc']);
  const iDate    = col(['sale date','transaction date'],['date']);
  const iGross   = hdrs.indexOf('gross amount');
  const iNet     = hdrs.indexOf('net amount');
  const iNetPay  = hdrs.indexOf('net payable');
  const iGrossC  = hdrs.indexOf('gross amount in currency');
  const iNetC    = hdrs.indexOf('net amount in currency');
  const iExRate  = hdrs.indexOf('exchange rate');
  const iOrigCur = hdrs.indexOf('original currency');
  const iCur     = col(['currency'],['currency']);

  const records = [];
  for (let i=1;i<lines.length;i++) {
    const cells = splitRow(lines[i]);
    if (!cells.some(Boolean)) continue;

    const artist  = iArtist  !==-1 ? (cells[iArtist] ||'UniFLOWs Artist').trim() : 'UniFLOWs Artist';
    const track   = iTrack   !==-1 ? (cells[iTrack]  ||'Track '+i).trim()        : 'Track '+i;
    const rawSrc  = iSource  !==-1 ? (cells[iSource] ||'Khác').trim()            : 'Khác';
    const dsp     = normDSP(rawSrc);
    const subSrc  = iSubSrc  !==-1 ? (cells[iSubSrc]  ||'').trim() : '';
    const config  = iConfig  !==-1 ? (cells[iConfig]  ||'').trim() : '';
    const streams = iStreams  !==-1 ? Math.max(0, Math.round(parseRawNumber(cells[iStreams]))) : 0;
    const territory = iTerritory !==-1 ? (cells[iTerritory]||'VN').trim() : 'VN';
    const isrc    = iIsrc    !==-1 ? (cells[iIsrc]||'').trim() : '';
    const date    = iDate    !==-1 ? (cells[iDate]||'').trim() : '';

    const exRate = iExRate !==-1 ? parseRawNumber(cells[iExRate]) : state.exchangeRate;
    let revenue = 0;
    const gVnd  = iGross  !==-1 ? parseRawNumber(cells[iGross])  : 0;
    const nVnd  = iNet    !==-1 ? parseRawNumber(cells[iNet])    : 0;
    const nPay  = iNetPay !==-1 ? parseRawNumber(cells[iNetPay]) : 0;
    const gCur  = iGrossC !==-1 ? parseRawNumber(cells[iGrossC]) : 0;
    const nCur  = iNetC   !==-1 ? parseRawNumber(cells[iNetC])   : 0;

    if (nPay  > 0) revenue = nPay;
    else if (nVnd  > 0) revenue = nVnd;
    else if (gVnd  > 0) revenue = gVnd;
    else if (nCur  > 0 && exRate > 0) revenue = nCur * exRate;
    else if (gCur  > 0 && exRate > 0) revenue = gCur * exRate;

    records.push({ artist, track, dsp, rawDsp:rawSrc, subSource:subSrc, configuration:config, streams, revenue, currency:'VND', isrc, territory, saleDate:date });
  }
  return records;
}

function normDSP(r) {
  const s = r.toLowerCase();
  if (s.includes('spotify'))   return 'Spotify';
  if (s.includes('apple'))     return 'Apple Music';
  if (s==='youtube red'||s.includes('youtube red')) return 'YouTube Red';
  if (s.includes('youtube'))   return 'YouTube';
  if (s.includes('meta')||s.includes('facebook')||s.includes('instagram')) return 'Meta';
  if (s.includes('tiktok')||s.includes('bytedance')) return 'TikTok';
  if (s.includes('amazon'))    return 'Amazon Music';
  if (s.includes('deezer'))    return 'Deezer';
  if (s.includes('zing'))      return 'Zing MP3';
  if (s.includes('tidal'))     return 'Tidal';
  if (s.includes('soundcloud')) return 'SoundCloud';
  return r || 'Khác';
}

// ============================================================================
// COMPUTE
// ============================================================================
export function computeFilteredData() {
  const { records, labelPercentage, selectedArtist, selectedDsp, searchQuery } = state;
  const filtered = records.filter(r => {
    if (selectedArtist !== 'all' && r.artist !== selectedArtist) return false;
    if (selectedDsp    !== 'all' && r.dsp    !== selectedDsp)    return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (![r.track,r.artist,r.dsp,r.isrc,r.territory,r.configuration,r.subSource].some(v=>(v||'').toLowerCase().includes(q))) return false;
    }
    return true;
  });

  let totalStreams=0, totalGross=0;
  filtered.forEach(r=>{ totalStreams+=r.streams; totalGross+=r.revenue; });
  const labelPct  = Math.max(0,Math.min(100,Number(labelPercentage)||0));
  const artistPct = 100-labelPct;
  const labelRet  = totalGross*(labelPct/100);
  const artistNet = totalGross*(artistPct/100);

  // DSP map
  const dspMap={};
  filtered.forEach(r=>{
    if (!dspMap[r.dsp]) dspMap[r.dsp]={name:r.dsp,streams:0,gross:0};
    dspMap[r.dsp].streams+=r.streams; dspMap[r.dsp].gross+=r.revenue;
  });
  const dspBreakdown = Object.values(dspMap).map(d=>({
    ...d, labelShare:d.gross*(labelPct/100), artistShare:d.gross*(artistPct/100),
    sharePct:totalGross>0?(d.gross/totalGross)*100:0
  })).sort((a,b)=>b.gross-a.gross);

  // Config map
  const cfgMap={};
  filtered.forEach(r=>{
    const k=r.configuration||r.subSource||'Other';
    if (!cfgMap[k]) cfgMap[k]={name:k,streams:0,gross:0};
    cfgMap[k].streams+=r.streams; cfgMap[k].gross+=r.revenue;
  });
  const configBreakdown = Object.values(cfgMap).map(c=>({
    ...c, sharePct:totalGross>0?(c.gross/totalGross)*100:0
  })).sort((a,b)=>b.gross-a.gross);

  // Track map
  const trackMap={};
  filtered.forEach(r=>{
    const k=`${r.artist}:::${r.track}`;
    if (!trackMap[k]) trackMap[k]={artist:r.artist,track:r.track,isrc:r.isrc||'',streams:0,gross:0,dsps:new Set(),territories:new Set()};
    trackMap[k].streams+=r.streams; trackMap[k].gross+=r.revenue;
    trackMap[k].dsps.add(r.dsp);
    if (r.territory) r.territory.split(',').forEach(t=>trackMap[k].territories.add(t.trim()));
  });
  const trackBreakdown = Object.values(trackMap).map(t=>{
    const terrs=Array.from(t.territories);
    return { ...t, dspsList:Array.from(t.dsps).join(', '), territoriesList:terrs.slice(0,5).join(', ')+(terrs.length>5?` +${terrs.length-5}`:''),
      labelShare:t.gross*(labelPct/100), artistShare:t.gross*(artistPct/100) };
  }).sort((a,b)=>b.gross-a.gross);

  const uniqueArtists = [...new Set(records.map(r=>r.artist))].sort();
  const uniqueDsps    = [...new Set(records.map(r=>r.dsp))].sort();

  return { filteredRows:filtered, totalStreams, totalGross, labelRet, artistNet, labelPct, artistPct, dspBreakdown, configBreakdown, trackBreakdown, uniqueArtists, uniqueDsps };
}

// ============================================================================
// EXPORT CSV
// ============================================================================
export function exportProcessedCSV() {
  const { filteredRows, totalStreams, totalGross, labelRet, artistNet, labelPct, artistPct } = computeFilteredData();
  if (!filteredRows.length) { alert('Không có dữ liệu.'); return; }
  const isUSD = state.currency==='USD';
  const fv = v => isUSD ? (v/state.exchangeRate).toFixed(4) : (v<1000?v.toFixed(2):Math.round(v));
  const hdrs = ['Nghệ sĩ','Bài hát','DSP','Loại Stream','Quốc gia','ISRC','Streams',`Gross (${state.currency})`,`Label (${labelPct}%)`,`Artist (${artistPct}%)`,'Ngày','Kỳ đối soát'];
  const rows = [hdrs];
  filteredRows.forEach(r=>{
    rows.push([`"${r.artist.replace(/"/g,'""')}"`,`"${r.track.replace(/"/g,'""')}"`,`"${r.dsp}"`,
      `"${r.configuration||r.subSource||''}"`,`"${r.territory||''}"`,`"${r.isrc||''}"`,r.streams,
      fv(r.revenue),fv(r.revenue*labelPct/100),fv(r.revenue*artistPct/100),`"${r.saleDate||''}"`,`"${state.statementPeriod}"`]);
  });
  rows.push(['"★ TỔNG CỘNG"',`"${filteredRows.length} rows"`,'""','""','""','""',totalStreams,fv(totalGross),fv(labelRet),fv(artistNet),'""',`"${state.statementPeriod}"`]);
  const csv = '\uFEFF'+rows.map(r=>r.join(',')).join('\r\n');
  const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),download:`UniFLOWs_Royalty_${new Date().toISOString().slice(0,10)}.csv`});
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

/**
 * Xuất CSV riêng cho từng nghệ sĩ — chỉ lấy đúng data của nghệ sĩ được chỉ định.
 * An toàn khi file gốc chứa data của nhiều nghệ sĩ trong label.
 */
export function exportArtistCSV(targetArtist) {
  const { labelPct, artistPct } = computeFilteredData();
  const artistRows = state.records.filter(r => r.artist === targetArtist);
  if (!artistRows.length) { alert('Không tìm thấy dữ liệu cho: ' + targetArtist); return; }

  const isUSD = state.currency==='USD';
  const fv = v => isUSD ? (v/state.exchangeRate).toFixed(4) : (v<1000?v.toFixed(2):Math.round(v));
  let totalStreams=0, totalGross=0;
  artistRows.forEach(r=>{ totalStreams+=r.streams; totalGross+=r.revenue; });
  const labelRet  = totalGross*(labelPct/100);
  const artistNet = totalGross*(artistPct/100);

  const hdrs = ['Nghệ sĩ','Bài hát','DSP','Loại Stream','Quốc gia','ISRC','Streams',`Gross (${state.currency})`,`Label (${labelPct}%)`,`Artist (${artistPct}%)`,'Ngày','Kỳ đối soát'];
  const rows = [hdrs];
  artistRows.forEach(r=>{
    rows.push([`"${r.artist.replace(/"/g,'""')}"`,`"${r.track.replace(/"/g,'""')}"`,`"${r.dsp}"`,
      `"${r.configuration||r.subSource||''}"`,`"${r.territory||''}"`,`"${r.isrc||''}"`,r.streams,
      fv(r.revenue),fv(r.revenue*labelPct/100),fv(r.revenue*artistPct/100),`"${r.saleDate||''}"`,`"${state.statementPeriod}"`]);
  });
  rows.push(['"★ TỔNG CỘNG"',`"${artistRows.length} rows"`,'""','""','""','""',totalStreams,fv(totalGross),fv(labelRet),fv(artistNet),'""',`"${state.statementPeriod}"`]);
  const safeName = targetArtist.replace(/[^a-zA-Z0-9_À-ỹ]/g,'_');
  const periodSafe = state.statementPeriod.replace(/[\s\/]/g,'-');
  const csv = '\uFEFF'+rows.map(r=>r.join(',')).join('\r\n');
  const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),download:`UniFLOWs_${safeName}_${periodSafe}.csv`});
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

export function downloadCSVTemplate() {
  const rows=[['Source','Sub Source','Track Artist','Track Title','ISRC','Territory','Units','Gross Amount in Currency','Original Currency','Exchange Rate','Configuration'],
    ['Spotify','','Khờ Band','mùa hạ 2019','TCAJT2506106','VN',32,0.019049,'EUR',29657,'Stream'],
    ['YouTube Red','','Khờ Band','mùa hạ 2019','TCAJT2506106','VN',5,0.019689,'USD',25985,'Premium Stream'],
    ['YouTube','','Khờ Band','mùa hạ 2019','TCAJT2506106','VN',51,0.002538,'USD',25989,'Promotion Stream'],
    ['Meta','','Khờ Band','mùa hạ 2019','TCAJT2506106','VN',19,0.000022,'USD',25989,'IG_MUSIC_NOTES'],
    ['TikTok','TikTok','Khờ Band','mùa hạ 2019','TCAJT2506106','VN',1,0.00000099,'USD',25989,'UGC']];
  const csv = '\uFEFF'+rows.map(r=>r.join(',')).join('\r\n');
  const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),download:'UniFLOWs_Distribution_Template.csv'});
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ============================================================================
// PDF A4 — SWISS EDITORIAL BRUTALIST (uniflowslabel.com style)
// ============================================================================
export function generateRoyaltyStatementHTML() {
  const { totalStreams, totalGross, labelRet, artistNet, labelPct, artistPct, dspBreakdown, configBreakdown, trackBreakdown } = computeFilteredData();
  const artistDisplay = state.selectedArtist==='all' ? 'Toàn bộ Roster — Catalogue Statement' : state.selectedArtist;
  const statId = 'UFL-'+new Date().getFullYear()+'-'+Math.floor(100000+Math.random()*900000);
  const printDate = new Date().toLocaleDateString('vi-VN',{year:'numeric',month:'long',day:'numeric'});

  const dspRows = dspBreakdown.map((d,i)=>`
    <tr style="border-bottom:1px solid #0b0b0b;background:${i%2===0?'#ffffff':'#f5f4f0'};">
      <td style="padding:10px 14px;font-weight:800;font-size:12px;display:flex;align-items:center;gap:10px;">
        <span style="width:9px;height:9px;border-radius:50%;background:${(DSP_META[d.name]||{color:'#475569'}).color};display:inline-block;flex-shrink:0;"></span>
        ${d.name}
      </td>
      <td style="padding:10px 14px;text-align:right;font-family:'DM Mono',monospace;font-size:11px;">${formatStreams(d.streams)}</td>
      <td style="padding:10px 14px;text-align:right;font-family:'DM Mono',monospace;font-weight:700;font-size:11.5px;">${formatCurrency(d.gross)}</td>
      <td style="padding:10px 14px;text-align:right;font-family:'DM Mono',monospace;font-size:11px;opacity:0.6;">${formatCurrency(d.labelShare)}</td>
      <td style="padding:10px 14px;text-align:right;font-family:'DM Mono',monospace;font-weight:900;font-size:12px;">${formatCurrency(d.artistShare)}</td>
      <td style="padding:10px 14px;text-align:right;font-family:'DM Mono',monospace;font-size:11px;opacity:0.5;">${d.sharePct.toFixed(1)}%</td>
    </tr>`).join('');

  const cfgRows = configBreakdown.map(c=>{
    const m=cfgMeta(c.name);
    return `<tr style="border-bottom:1px solid rgba(11,11,11,0.15);">
      <td style="padding:9px 14px;">
        <span style="background:${m.bg};color:${m.color};font-family:'DM Mono',monospace;font-size:9.5px;font-weight:800;padding:3px 8px;text-transform:uppercase;letter-spacing:0.5px;">${m.label}</span>
      </td>
      <td style="padding:9px 14px;text-align:right;font-family:'DM Mono',monospace;font-size:11px;">${formatStreams(c.streams)}</td>
      <td style="padding:9px 14px;text-align:right;font-family:'DM Mono',monospace;font-weight:700;font-size:11.5px;">${formatCurrency(c.gross)}</td>
      <td style="padding:9px 14px;text-align:right;font-family:'DM Mono',monospace;font-size:11px;opacity:0.5;">${c.sharePct.toFixed(1)}%</td>
    </tr>`;}).join('');

  const trackRows = trackBreakdown.slice(0,20).map((t,i)=>`
    <tr style="border-bottom:1px solid rgba(11,11,11,0.12);background:${i%2===0?'#fff':'#f5f4f0'};">
      <td style="padding:8px 12px;font-family:'DM Mono',monospace;font-size:10px;opacity:0.4;text-align:center;">${String(i+1).padStart(2,'0')}</td>
      <td style="padding:8px 12px;">
        <strong style="display:block;font-size:12px;font-weight:800;">${t.track}</strong>
        <span style="font-family:'DM Mono',monospace;font-size:9.5px;opacity:0.6;">${t.artist}${t.isrc?' · '+t.isrc:''}</span>
      </td>
      <td style="padding:8px 12px;font-family:'DM Mono',monospace;font-size:10px;opacity:0.7;">${t.dspsList}</td>
      <td style="padding:8px 12px;font-family:'DM Mono',monospace;font-size:10px;opacity:0.5;">${t.territoriesList}</td>
      <td style="padding:8px 12px;text-align:right;font-family:'DM Mono',monospace;font-size:11px;">${formatStreams(t.streams)}</td>
      <td style="padding:8px 12px;text-align:right;font-family:'DM Mono',monospace;font-weight:700;font-size:11.5px;">${formatCurrency(t.gross)}</td>
      <td style="padding:8px 12px;text-align:right;font-family:'DM Mono',monospace;font-weight:900;font-size:12px;">${formatCurrency(t.artistShare)}</td>
    </tr>`).join('');

  return `
<div style="background:#f5f4f0;color:#0b0b0b;font-family:'Manrope',-apple-system,sans-serif;padding:0;max-width:830px;margin:0 auto;box-sizing:border-box;font-size:12.5px;line-height:1.5;">

  <!-- HEADER STRIP -->
  <div style="background:#0b0b0b;color:#fff;padding:20px 36px;display:flex;justify-content:space-between;align-items:center;">
    <div style="display:flex;align-items:center;gap:18px;">
      <img src="/assets/logo.jpg" alt="UniFLOWs" style="width:52px;height:52px;object-fit:cover;border:1px solid rgba(255,255,255,0.3);" onerror="this.style.display='none'">
      <div>
        <div style="font-size:22px;font-weight:900;letter-spacing:-0.07em;line-height:1;">UNIFLOWS</div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-top:3px;">MUSIC GROUP · LABEL SERVICES</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="background:#d8ff48;color:#0b0b0b;font-family:'DM Mono',monospace;font-size:10px;font-weight:900;padding:5px 14px;text-transform:uppercase;letter-spacing:1.5px;display:inline-block;margin-bottom:8px;">⚡ ROYALTY STATEMENT</div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,0.6);line-height:1.9;">
        <div>Mã số: <strong style="color:#d8ff48;">${state.statementNumber}</strong></div>
        <div>Kỳ: <strong style="color:#fff;">${state.statementPeriod}</strong></div>
        <div>Ngày: <strong style="color:#fff;">${printDate}</strong></div>
      </div>
    </div>
  </div>

  <!-- INFO BAND -->
  <div style="background:#fff;border-bottom:2px solid #0b0b0b;padding:16px 36px;display:grid;grid-template-columns:1.5fr 1fr;gap:24px;">
    <div>
      <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;opacity:0.5;margin-bottom:4px;">ĐỐI TÁC THỤ HƯỞNG / BENEFICIARY</div>
      <div style="font-size:18px;font-weight:900;letter-spacing:-0.04em;">${artistDisplay}</div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;opacity:0.5;margin-top:3px;">${state.fileName}</div>
      ${state.curveNote ? `<div style="margin-top:10px;padding:8px 12px;background:#f5f4f0;border-left:3px solid #0b0b0b;font-size:10.5px;line-height:1.5;font-style:italic;opacity:0.75;">✓ ${state.curveNote}</div>` : ''}
    </div>
    <div style="border-left:1px solid rgba(11,11,11,0.15);padding-left:20px;display:grid;gap:5px;align-content:center;">
      <div style="display:flex;justify-content:space-between;font-size:11px;">
        <span style="opacity:0.5;">Tỷ lệ phân chia:</span>
        <strong style="font-family:'DM Mono',monospace;">Label ${labelPct}% / NĐ ${artistPct}%</strong>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;">
        <span style="opacity:0.5;">Đơn vị tiền tệ:</span>
        <strong style="font-family:'DM Mono',monospace;">${state.currency}</strong>
      </div>
    </div>
  </div>

  <!-- 4 METRIC STRIP -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:2px solid #0b0b0b;">
    <div style="padding:20px 24px;border-right:1px solid #0b0b0b;">
      <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;opacity:0.5;margin-bottom:8px;">Tổng Streams</div>
      <div style="font-size:22px;font-weight:900;letter-spacing:-0.05em;font-family:'DM Mono',monospace;">${formatStreams(totalStreams)}</div>
    </div>
    <div style="padding:20px 24px;border-right:1px solid #0b0b0b;">
      <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;opacity:0.5;margin-bottom:8px;">Doanh Thu Gộp</div>
      <div style="font-size:22px;font-weight:900;letter-spacing:-0.05em;font-family:'DM Mono',monospace;">${formatCurrency(totalGross)}</div>
    </div>
    <div style="padding:20px 24px;border-right:1px solid #0b0b0b;">
      <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;opacity:0.5;margin-bottom:8px;">Label Giữ (${labelPct}%)</div>
      <div style="font-size:22px;font-weight:900;letter-spacing:-0.05em;font-family:'DM Mono',monospace;opacity:0.55;">${formatCurrency(labelRet)}</div>
    </div>
    <div style="padding:20px 24px;background:#d8ff48;">
      <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;opacity:0.7;margin-bottom:8px;">Nghệ Sĩ Nhận (${artistPct}%)</div>
      <div style="font-size:22px;font-weight:900;letter-spacing:-0.05em;font-family:'DM Mono',monospace;">${formatCurrency(artistNet)}</div>
    </div>
  </div>

  <!-- BODY CONTENT -->
  <div style="padding:28px 36px;">

    <!-- TABLE 1: DSP -->
    <div style="margin-bottom:28px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #0b0b0b;padding-bottom:8px;margin-bottom:0;">
        <span style="font-family:'DM Mono',monospace;font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">01 / Phân Bổ Nền Tảng (DSP Breakdown)</span>
        <span style="font-family:'DM Mono',monospace;font-size:9.5px;opacity:0.5;">${dspBreakdown.length} nền tảng</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
        <thead>
          <tr style="background:#0b0b0b;color:#fff;">
            <th style="padding:8px 14px;text-align:left;font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;">Nền tảng</th>
            <th style="padding:8px 14px;text-align:right;font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;">Streams</th>
            <th style="padding:8px 14px;text-align:right;font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;">Doanh thu Gộp</th>
            <th style="padding:8px 14px;text-align:right;font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;opacity:0.7;">Label (${labelPct}%)</th>
            <th style="padding:8px 14px;text-align:right;font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:#d8ff48;">NĐ (${artistPct}%)</th>
            <th style="padding:8px 14px;text-align:right;font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;opacity:0.5;">%</th>
          </tr>
        </thead>
        <tbody>${dspRows}</tbody>
        <tfoot>
          <tr style="background:#0b0b0b;color:#fff;font-weight:900;">
            <td style="padding:10px 14px;font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;">★ TỔNG CỘNG</td>
            <td style="padding:10px 14px;text-align:right;font-family:'DM Mono',monospace;">${formatStreams(totalStreams)}</td>
            <td style="padding:10px 14px;text-align:right;font-family:'DM Mono',monospace;">${formatCurrency(totalGross)}</td>
            <td style="padding:10px 14px;text-align:right;font-family:'DM Mono',monospace;opacity:0.6;">${formatCurrency(labelRet)}</td>
            <td style="padding:10px 14px;text-align:right;font-family:'DM Mono',monospace;color:#d8ff48;font-size:13px;">${formatCurrency(artistNet)}</td>
            <td style="padding:10px 14px;text-align:right;font-family:'DM Mono',monospace;">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>

    ${configBreakdown.length>0?`
    <!-- TABLE 2: STREAM TYPES -->
    <div style="margin-bottom:28px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #0b0b0b;padding-bottom:8px;margin-bottom:0;">
        <span style="font-family:'DM Mono',monospace;font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">02 / Nguồn Stream Chi Tiết (Configuration)</span>
        <span style="font-family:'DM Mono',monospace;font-size:9.5px;opacity:0.5;">${configBreakdown.length} loại</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
        <thead>
          <tr style="background:#f5f4f0;border-bottom:1px solid #0b0b0b;">
            <th style="padding:8px 14px;text-align:left;font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;">Loại Stream</th>
            <th style="padding:8px 14px;text-align:right;font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;">Streams</th>
            <th style="padding:8px 14px;text-align:right;font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;">Doanh thu</th>
            <th style="padding:8px 14px;text-align:right;font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;">Thị phần</th>
          </tr>
        </thead>
        <tbody>${cfgRows}</tbody>
      </table>
    </div>` : ''}

    <!-- TABLE 3: TRACKS -->
    <div style="margin-bottom:28px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #0b0b0b;padding-bottom:8px;margin-bottom:0;">
        <span style="font-family:'DM Mono',monospace;font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">03 / Doanh Thu Từng Bài Hát (Track Performance)</span>
        <span style="font-family:'DM Mono',monospace;font-size:9.5px;opacity:0.5;">${trackBreakdown.length} bài hát</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>
          <tr style="background:#f5f4f0;border-bottom:1px solid #0b0b0b;">
            <th style="padding:8px 12px;width:30px;font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;">#</th>
            <th style="padding:8px 12px;text-align:left;font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;">Bài hát & Nghệ sĩ</th>
            <th style="padding:8px 12px;text-align:left;font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;">DSPs</th>
            <th style="padding:8px 12px;text-align:left;font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;">Lãnh thổ</th>
            <th style="padding:8px 12px;text-align:right;font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;">Streams</th>
            <th style="padding:8px 12px;text-align:right;font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;">Gross</th>
            <th style="padding:8px 12px;text-align:right;font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;">NĐ Nhận</th>
          </tr>
        </thead>
        <tbody>${trackRows}</tbody>
        <tfoot>
          <tr style="background:#0b0b0b;color:#fff;font-weight:900;">
            <td colspan="4" style="padding:10px 12px;font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;">★ TỔNG (${trackBreakdown.length} bài hát)</td>
            <td style="padding:10px 12px;text-align:right;font-family:'DM Mono',monospace;">${formatStreams(totalStreams)}</td>
            <td style="padding:10px 12px;text-align:right;font-family:'DM Mono',monospace;">${formatCurrency(totalGross)}</td>
            <td style="padding:10px 12px;text-align:right;font-family:'DM Mono',monospace;color:#d8ff48;font-size:13px;">${formatCurrency(artistNet)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- SIGNATURES -->
    <div style="margin-top:32px;padding-top:20px;border-top:2px solid #0b0b0b;display:grid;grid-template-columns:1fr 1fr;gap:60px;">
      <div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;opacity:0.5;">ĐẠI DIỆN PHÁT HÀNH</div>
        <div style="font-size:11px;opacity:0.6;margin:4px 0 44px;">UniFLOWs Label — Kế toán Trưởng</div>
        <div style="border-top:1.5px solid #0b0b0b;padding-top:6px;font-weight:900;font-size:11px;">UniFLOWs Entertainment JSC</div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;opacity:0.5;">ĐẠI DIỆN NGHỆ SĨ / RIGHTS HOLDER</div>
        <div style="font-size:11px;opacity:0.6;margin:4px 0 44px;">Xác nhận số liệu & phương thức giải ngân</div>
        <div style="border-top:1.5px solid #0b0b0b;padding-top:6px;font-weight:900;font-size:11px;margin-left:auto;">${artistDisplay.replace('Toàn bộ Roster — Catalogue Statement','Nghệ sĩ')}</div>
      </div>
    </div>
  </div>

  <!-- FOOTER STRIP -->
  <div style="background:#0b0b0b;color:rgba(255,255,255,0.45);padding:12px 36px;display:flex;justify-content:space-between;align-items:center;font-family:'DM Mono',monospace;font-size:8.5px;text-transform:uppercase;letter-spacing:1px;">
    <span>UniFLOWs Entertainment JSC · Confidential Royalty Statement · ${statId}</span>
    <span style="color:#d8ff48;font-weight:900;">ENGINE 4.0</span>
  </div>
</div>`;
}

// ============================================================================
// OPEN PDF DIALOG
// ============================================================================
export function openRoyaltyStatementPreview() {
  const dialog = document.querySelector('#admin-royalty-statement-dialog');
  const area   = document.querySelector('#admin-royalty-printable-area');
  if (!dialog||!area) { alert('Không tìm thấy dialog.'); return; }
  area.innerHTML = generateRoyaltyStatementHTML();
  dialog.showModal();
}

// ============================================================================
// PRINT PDF
// ============================================================================
export function printRoyaltyStatement() {
  const content = document.querySelector('#admin-royalty-printable-area');
  if (!content) return;
  let f = document.getElementById('ufl-pf'); if (f) f.remove();
  f = document.createElement('iframe');
  f.id = 'ufl-pf';
  Object.assign(f.style,{position:'fixed',right:'0',bottom:'0',width:'0',height:'0',border:'0'});
  document.body.appendChild(f);
  const doc = f.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
    <title>UniFLOWs_Royalty_${state.statementPeriod.replace(/\//g,'-')}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&family=Manrope:wght@400;600;700;800;900&display=swap');
      @page { size:A4 portrait; margin:8mm 10mm; }
      body { margin:0;padding:0;background:#f5f4f0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important; }
      table { page-break-inside:auto; } tr { page-break-inside:avoid;page-break-after:auto; }
    </style>
  </head><body>${content.innerHTML}</body></html>`);
  doc.close();
  setTimeout(()=>{ f.contentWindow.focus(); f.contentWindow.print(); },500);
}

// ============================================================================
// RENDER ADMIN TAB — Swiss Editorial UI
// ============================================================================
export function renderDistributionTab() {
  const container = document.querySelector('#admin-tab-distribution');
  if (!container) return;

  const d = computeFilteredData();
  const { filteredRows, totalStreams, totalGross, labelRet, artistNet, labelPct, artistPct, dspBreakdown, configBreakdown, trackBreakdown, uniqueArtists, uniqueDsps } = d;

  const artistOpts = ['<option value="all">— Toàn bộ nghệ sĩ</option>']
    .concat(uniqueArtists.map(a=>`<option value="${a}" ${state.selectedArtist===a?'selected':''}>${a}</option>`)).join('');
  const dspOpts = ['<option value="all">— Tất cả nền tảng</option>']
    .concat(uniqueDsps.map(a=>`<option value="${a}" ${state.selectedDsp===a?'selected':''}>${a}</option>`)).join('');

  // DSP row items (list style)
  const dspListHTML = dspBreakdown.map(d=>{
    const meta = DSP_META[d.name]||{color:'#475569'};
    const barW = Math.min(100, d.sharePct);
    return `
    <div style="border-bottom:1px solid var(--line);padding:14px 0;display:grid;grid-template-columns:auto 1fr auto auto auto;gap:16px;align-items:center;">
      <span style="width:10px;height:10px;border-radius:50%;background:${meta.color};display:block;flex-shrink:0;"></span>
      <div>
        <strong style="font-size:14px;font-weight:800;letter-spacing:-0.02em;">${d.name}</strong>
        <div style="background:var(--line);height:3px;border-radius:0;margin-top:6px;overflow:hidden;">
          <div style="background:${meta.color};width:${barW}%;height:100%;"></div>
        </div>
      </div>
      <span style="font-family:'DM Mono',monospace;font-size:11px;opacity:0.5;text-align:right;">${formatStreams(d.streams)} streams</span>
      <span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:700;text-align:right;min-width:100px;">${formatCurrency(d.gross)}</span>
      <span style="font-family:'DM Mono',monospace;font-size:11px;opacity:0.4;text-align:right;">${d.sharePct.toFixed(1)}%</span>
    </div>`;
  }).join('');

  // Config pills
  const cfgHTML = configBreakdown.map(c=>{
    const m=cfgMeta(c.name);
    return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line);">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="background:${m.bg};color:${m.color};font-family:'DM Mono',monospace;font-size:9.5px;font-weight:800;padding:3px 9px;text-transform:uppercase;letter-spacing:0.5px;">${m.label}</span>
        <span style="font-family:'DM Mono',monospace;font-size:11px;opacity:0.5;">${formatStreams(c.streams)} streams</span>
      </div>
      <div style="text-align:right;">
        <span style="font-family:'DM Mono',monospace;font-weight:800;font-size:13px;">${formatCurrency(c.gross)}</span>
        <span style="font-family:'DM Mono',monospace;font-size:10px;opacity:0.4;margin-left:8px;">${c.sharePct.toFixed(1)}%</span>
      </div>
    </div>`;
  }).join('');

  // Track rows
  const trackHTML = trackBreakdown.map((t,i)=>`
    <tr style="border-bottom:1px solid var(--line);" onmouseover="this.style.background='var(--lime)'" onmouseout="this.style.background='transparent'">
      <td style="padding:12px 16px;font-family:'DM Mono',monospace;font-size:11px;opacity:0.35;">${String(i+1).padStart(2,'0')}</td>
      <td style="padding:12px 16px;">
        <strong style="font-size:14px;font-weight:800;letter-spacing:-0.02em;display:block;">${t.track}</strong>
        <span style="font-family:'DM Mono',monospace;font-size:10.5px;opacity:0.5;">${t.artist}${t.isrc?` · ${t.isrc}`:''}</span>
      </td>
      <td style="padding:12px 16px;font-size:11.5px;opacity:0.7;">${t.dspsList}<br><span style="font-size:10px;opacity:0.6;">${t.territoriesList}</span></td>
      <td style="padding:12px 16px;text-align:right;font-family:'DM Mono',monospace;font-size:12px;">${formatStreams(t.streams)}</td>
      <td style="padding:12px 16px;text-align:right;font-family:'DM Mono',monospace;font-weight:700;font-size:13px;">${formatCurrency(t.gross)}</td>
      <td style="padding:12px 16px;text-align:right;font-family:'DM Mono',monospace;font-size:11px;opacity:0.5;">${formatCurrency(t.labelShare)}</td>
      <td style="padding:12px 16px;text-align:right;font-family:'DM Mono',monospace;font-weight:900;font-size:14px;">${formatCurrency(t.artistShare)}</td>
    </tr>`).join('');

  // Transaction rows
  const txHTML = filteredRows.map((r,i)=>{
    const ls=r.revenue*(labelPct/100), as_=r.revenue*(artistPct/100);
    const dm=DSP_META[r.dsp]||{color:'#475569'};
    const cm=cfgMeta(r.configuration||r.subSource);
    return `
    <tr style="border-bottom:1px solid var(--line);font-size:12px;" onmouseover="this.style.background='var(--lime)'" onmouseout="this.style.background='transparent'">
      <td style="padding:9px 12px;font-family:'DM Mono',monospace;font-size:10px;opacity:0.35;">${String(i+1).padStart(2,'0')}</td>
      <td style="padding:9px 12px;">
        <strong style="font-size:13px;font-weight:800;display:block;letter-spacing:-0.02em;">${r.track}</strong>
        <span style="font-size:10.5px;opacity:0.5;">${r.artist}</span>
      </td>
      <td style="padding:9px 12px;"><span style="display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:12px;"><span style="width:8px;height:8px;border-radius:50%;background:${dm.color};display:inline-block;flex-shrink:0;"></span>${r.dsp}</span></td>
      <td style="padding:9px 12px;"><span style="background:${cm.bg};color:${cm.color};font-family:'DM Mono',monospace;font-size:9px;font-weight:800;padding:2px 7px;text-transform:uppercase;">${cm.label}</span></td>
      <td style="padding:9px 12px;font-family:'DM Mono',monospace;font-size:11px;opacity:0.6;text-align:center;">${r.territory||'VN'}</td>
      <td style="padding:9px 12px;text-align:right;font-family:'DM Mono',monospace;">${formatStreams(r.streams)}</td>
      <td style="padding:9px 12px;text-align:right;font-family:'DM Mono',monospace;font-weight:700;">${formatCurrency(r.revenue)}</td>
      <td style="padding:9px 12px;text-align:right;font-family:'DM Mono',monospace;opacity:0.5;">${formatCurrency(ls)}</td>
      <td style="padding:9px 12px;text-align:right;font-family:'DM Mono',monospace;font-weight:900;">${formatCurrency(as_)}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
  <!-- ===== PAGE HEADER ===== -->
  <div style="border-bottom:2px solid var(--ink);padding-bottom:20px;margin-bottom:32px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px;">
    <div>
      <span style="font:10px 'DM Mono',monospace;text-transform:uppercase;letter-spacing:1.5px;opacity:0.5;display:block;margin-bottom:6px;">14 / Đối Soát Phân Phối</span>
      <h2 style="font-size:clamp(32px,4vw,52px);letter-spacing:-0.06em;font-weight:900;margin:0;line-height:.9;">Distribution<br>&amp; Royalty Report.</h2>
    </div>
    <div style="text-align:right;">
      <div style="background:var(--ink);color:var(--lime);font:10px 'DM Mono',monospace;font-weight:900;padding:6px 14px;text-transform:uppercase;letter-spacing:1.5px;display:inline-block;margin-bottom:8px;">⚡ Engine 4.0 Active</div>
      <div style="font:11px 'DM Mono',monospace;opacity:0.5;">${state.records.length} bản ghi · ${state.fileName}</div>
    </div>
  </div>

  <!-- ===== IMPORT STRIP ===== -->
  <div style="border:1px solid var(--ink);box-shadow:4px 4px 0 var(--ink);padding:20px;margin-bottom:28px;background:#fff;">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;">
      <div>
        <strong style="font-size:15px;font-weight:900;letter-spacing:-0.03em;display:block;margin-bottom:4px;">📥 Nạp Báo Cáo CSV</strong>
        <span style="font:11px 'DM Mono',monospace;opacity:0.5;">Hỗ trợ UniFLOWs / Amuse / DistroKid / TuneCore. Tự nhận diện cột doanh thu, exchange rate, nguồn stream.</span>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <input type="file" id="dist-csv-file-input" accept=".csv" style="display:none;">
        <button type="button" id="dist-btn-browse-csv" class="button">📂 Tải CSV</button>
        <button type="button" id="dist-btn-load-khoband" class="button alt" style="border-color:var(--ink);font-weight:900;">🎸 Mẫu Khờ Band</button>
        <button type="button" id="dist-btn-load-sample" class="button alt">✨ Demo</button>
        <button type="button" id="dist-btn-download-tpl" class="button alt">📑 CSV Mẫu</button>
      </div>
    </div>
    <div id="dist-file-dropzone" style="border:1px dashed rgba(11,11,11,0.3);margin-top:14px;padding:10px 16px;background:var(--paper);cursor:pointer;text-align:center;">
      <span style="font:11px 'DM Mono',monospace;opacity:0.55;">📎 Đang dùng: <strong style="opacity:1;">${state.fileName}</strong> — ${state.records.length} dòng · Kéo thả CSV vào đây</span>
    </div>
  </div>

  <!-- ===== CONTROLS STRIP ===== -->
  <div style="background:var(--ink);color:#fff;padding:22px;margin-bottom:28px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
      <span style="font:10px 'DM Mono',monospace;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:var(--lime);">⚙️ Revenue Split & Filters</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;align-items:flex-end;">
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <label style="font:10px 'DM Mono',monospace;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;color:var(--lime);">🏛️ Label Giữ (%)</label>
          <span id="dist-split-indicator" style="font:10px 'DM Mono',monospace;color:var(--lime);font-weight:900;">Hãng ${labelPct}% / NĐ ${artistPct}%</span>
        </div>
        <div style="display:flex;gap:6px;">
          <input type="number" id="dist-label-pct-input" min="0" max="100" value="${labelPct}"
            style="width:70px;padding:9px;font:14px 'DM Mono',monospace;font-weight:900;border:1px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.07);color:var(--lime);text-align:center;">
          <div style="display:flex;gap:4px;flex:1;">
            ${[10,15,20,30,50].map(p=>`<button type="button" class="dist-pct-pill button" data-pct="${p}" style="flex:1;padding:7px 2px;font-size:10px;${labelPct===p?'background:var(--lime);color:var(--ink);border-color:var(--lime);font-weight:900;':'background:transparent;color:#fff;border-color:rgba(255,255,255,0.25);'}">${p}%</button>`).join('')}
          </div>
        </div>
      </div>
      <div>
        <label style="font:10px 'DM Mono',monospace;font-weight:900;text-transform:uppercase;color:#fff;display:block;margin-bottom:6px;letter-spacing:0.5px;">👤 Nghệ sĩ</label>
        <select id="dist-artist-select" style="width:100%;padding:9px 12px;font:12px 'DM Mono',monospace;border:1px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.07);color:#fff;">${artistOpts}</select>
      </div>
      <div>
        <label style="font:10px 'DM Mono',monospace;font-weight:900;text-transform:uppercase;color:#fff;display:block;margin-bottom:6px;letter-spacing:0.5px;">🌐 Nền tảng</label>
        <select id="dist-dsp-select" style="width:100%;padding:9px 12px;font:12px 'DM Mono',monospace;border:1px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.07);color:#fff;">${dspOpts}</select>
      </div>
      <div>
        <label style="font:10px 'DM Mono',monospace;font-weight:900;text-transform:uppercase;color:#fff;display:block;margin-bottom:6px;letter-spacing:0.5px;">🔍 Tìm kiếm</label>
        <input type="text" id="dist-search-input" value="${state.searchQuery}" placeholder="Bài hát, ISRC, quốc gia, loại stream..."
          style="width:100%;padding:9px 12px;font:12px 'DM Mono',monospace;border:1px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.07);color:#fff;">
      </div>
    </div>
  </div>

  <!-- ===== PDF SETTINGS STRIP ===== -->
  <div style="border:1px solid var(--ink);box-shadow:4px 4px 0 var(--ink);padding:20px;margin-bottom:28px;background:#fff;">
    <div style="border-bottom:2px solid var(--ink);padding-bottom:10px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:baseline;">
      <strong style="font-size:13px;font-weight:900;letter-spacing:-0.02em;">📋 Cài Đặt Phiếu Đối Soát PDF</strong>
      <span style="font:10px 'DM Mono',monospace;opacity:0.4;">Thông tin hiển thị trên bản in</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 2fr;gap:16px;align-items:flex-end;">
      <div>
        <label style="font:10px 'DM Mono',monospace;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:6px;">📅 Kỳ Đối Soát</label>
        <input type="text" id="dist-statement-period" value="${state.statementPeriod}" placeholder="VD: Tháng 6/2026 hoặc Q2-2026"
          style="width:100%;padding:9px 12px;font:12px Manrope,sans-serif;border:1px solid var(--ink);background:var(--paper);">
      </div>
      <div>
        <label style="font:10px 'DM Mono',monospace;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:6px;">🔢 Số Phiếu (Statement No.)</label>
        <input type="text" id="dist-statement-number" value="${state.statementNumber}" placeholder="VD: UFL-2026-001"
          style="width:100%;padding:9px 12px;font:12px 'DM Mono',monospace;border:1px solid var(--ink);background:var(--paper);">
      </div>
      <div>
        <label style="font:10px 'DM Mono',monospace;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:6px;">✅ Ghi Chú Chứng Thực (Curve Note)</label>
        <input type="text" id="dist-curve-note" value="${state.curveNote}" placeholder="VD: Bản đối soát được Curve thông qua..."
          style="width:100%;padding:9px 12px;font:12px Manrope,sans-serif;border:1px solid var(--ink);background:var(--paper);">
      </div>
    </div>
  </div>

  <!-- ===== 4 METRIC CARDS ===== -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid var(--ink);box-shadow:4px 4px 0 var(--ink);margin-bottom:28px;">
    <div style="padding:22px;border-right:1px solid var(--ink);">
      <div style="font:10px 'DM Mono',monospace;text-transform:uppercase;letter-spacing:1px;opacity:0.5;margin-bottom:10px;">🎧 Tổng Streams</div>
      <div style="font-size:clamp(22px,2.5vw,32px);font-weight:900;letter-spacing:-0.05em;font-family:'DM Mono',monospace;">${formatStreams(totalStreams)}</div>
      <div style="font:10px 'DM Mono',monospace;opacity:0.4;margin-top:6px;">${filteredRows.length} dòng bản ghi</div>
    </div>
    <div style="padding:22px;border-right:1px solid var(--ink);">
      <div style="font:10px 'DM Mono',monospace;text-transform:uppercase;letter-spacing:1px;opacity:0.5;margin-bottom:10px;">💰 Doanh Thu Gộp</div>
      <div style="font-size:clamp(22px,2.5vw,32px);font-weight:900;letter-spacing:-0.05em;font-family:'DM Mono',monospace;">${formatCurrency(totalGross)}</div>
      <div style="font:10px 'DM Mono',monospace;opacity:0.4;margin-top:6px;">100% Gross Royalties</div>
    </div>
    <div style="padding:22px;border-right:1px solid var(--ink);">
      <div style="font:10px 'DM Mono',monospace;text-transform:uppercase;letter-spacing:1px;opacity:0.5;margin-bottom:10px;">🏛️ Label (${labelPct}%)</div>
      <div style="font-size:clamp(22px,2.5vw,32px);font-weight:900;letter-spacing:-0.05em;font-family:'DM Mono',monospace;opacity:0.55;">${formatCurrency(labelRet)}</div>
      <div style="font:10px 'DM Mono',monospace;opacity:0.4;margin-top:6px;">Phí phân phối & A&R</div>
    </div>
    <div style="padding:22px;background:var(--lime);">
      <div style="font:10px 'DM Mono',monospace;text-transform:uppercase;letter-spacing:1px;opacity:0.6;margin-bottom:10px;">💳 Nghệ Sĩ (${artistPct}%)</div>
      <div style="font-size:clamp(22px,2.5vw,32px);font-weight:900;letter-spacing:-0.05em;font-family:'DM Mono',monospace;">${formatCurrency(artistNet)}</div>
      <div style="font:10px 'DM Mono',monospace;opacity:0.6;margin-top:6px;font-weight:800;">Net Payout</div>
    </div>
  </div>

  <!-- ===== ACTION BAR ===== -->
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;border-bottom:1px solid var(--line);padding-bottom:20px;margin-bottom:28px;">
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
      <span style="font:10px 'DM Mono',monospace;text-transform:uppercase;letter-spacing:1px;opacity:0.5;">Chế độ xem:</span>
      <button type="button" id="dist-view-summary-btn" class="button" style="padding:8px 14px;font-size:10px;${state.activeView==='summary'?'':'background:transparent;color:var(--ink);'}">📊 Tổng Hợp</button>
      <button type="button" id="dist-view-tx-btn" class="button" style="padding:8px 14px;font-size:10px;${state.activeView==='transactions'?'':'background:transparent;color:var(--ink);'}">📋 Chi Tiết (${filteredRows.length})</button>
      <span style="width:1px;height:20px;background:var(--line);display:inline-block;margin:0 4px;"></span>
      <button type="button" id="dist-cur-vnd" class="button" style="padding:6px 10px;font-size:10px;${state.currency==='VND'?'':'background:transparent;color:var(--ink);'}">₫ VND</button>
      <button type="button" id="dist-cur-usd" class="button" style="padding:6px 10px;font-size:10px;${state.currency==='USD'?'':'background:transparent;color:var(--ink);'}">$ USD</button>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      ${state.selectedArtist !== 'all' ? `<button type="button" id="dist-btn-export-artist-csv" class="button" style="background:var(--lime);color:var(--ink);border-color:var(--ink);">📤 CSV: ${state.selectedArtist}</button>` : ''}
      ${uniqueArtists.length > 1 ? `<button type="button" id="dist-btn-export-all-artists" class="button alt" title="Xuất riêng CSV cho từng nghệ sĩ">📦 CSV Tất Cả NĐ (${uniqueArtists.length})</button>` : ''}
      <button type="button" id="dist-btn-export-csv" class="button alt">📥 Xuất CSV (filtered)</button>
      <button type="button" id="dist-btn-open-pdf" class="button">🖨️ Xuất PDF A4</button>
    </div>
  </div>

  <!-- ===== DSP SECTION ===== -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:28px;align-items:start;">
    <!-- DSP List -->
    <div>
      <div style="border-bottom:2px solid var(--ink);padding-bottom:8px;margin-bottom:0;display:flex;justify-content:space-between;align-items:baseline;">
        <span style="font:10px 'DM Mono',monospace;font-weight:900;text-transform:uppercase;letter-spacing:1px;">Nền Tảng (DSP)</span>
        <span style="font:10px 'DM Mono',monospace;opacity:0.4;">${dspBreakdown.length} nguồn</span>
      </div>
      ${dspListHTML||'<p style="opacity:0.4;font:12px DM Mono,monospace;padding:20px 0;">Chưa có dữ liệu.</p>'}
    </div>

    <!-- Config List -->
    <div>
      <div style="border-bottom:2px solid var(--ink);padding-bottom:8px;margin-bottom:0;display:flex;justify-content:space-between;align-items:baseline;">
        <span style="font:10px 'DM Mono',monospace;font-weight:900;text-transform:uppercase;letter-spacing:1px;">Nguồn Stream</span>
        <span style="font:10px 'DM Mono',monospace;opacity:0.4;">${configBreakdown.length} loại</span>
      </div>
      ${cfgHTML||'<p style="opacity:0.4;font:12px DM Mono,monospace;padding:20px 0;">Chưa có dữ liệu.</p>'}
    </div>
  </div>

  <!-- ===== DSP SUMMARY TABLE ===== -->
  <div style="border:1px solid var(--ink);box-shadow:4px 4px 0 var(--ink);margin-bottom:28px;overflow:hidden;">
    <div style="background:var(--ink);color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
      <strong style="font-size:13px;font-weight:900;letter-spacing:-0.02em;">Thị Phần Doanh Thu Theo Nền Tảng</strong>
      <span style="font:10px 'DM Mono',monospace;opacity:0.5;">Market Share & Royalties</span>
    </div>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
        <thead>
          <tr style="border-bottom:1px solid var(--line);background:var(--paper);">
            <th style="padding:10px 16px;text-align:left;font:10px 'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.5px;opacity:0.6;">Nền tảng</th>
            <th style="padding:10px 16px;text-align:right;font:10px 'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.5px;opacity:0.6;">Streams</th>
            <th style="padding:10px 16px;text-align:right;font:10px 'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.5px;opacity:0.6;">Doanh thu Gộp</th>
            <th style="padding:10px 16px;text-align:right;font:10px 'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.5px;opacity:0.6;">Label (${labelPct}%)</th>
            <th style="padding:10px 16px;text-align:right;font:10px 'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.5px;opacity:0.6;">Nghệ sĩ (${artistPct}%)</th>
            <th style="padding:10px 16px;text-align:right;font:10px 'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.5px;opacity:0.6;">%</th>
          </tr>
        </thead>
        <tbody>
          ${dspBreakdown.map((dd,i)=>`
            <tr style="border-bottom:1px solid var(--line);background:${i%2===0?'#fff':'var(--paper)'};" onmouseover="this.style.background='var(--lime)'" onmouseout="this.style.background='${i%2===0?'#fff':'var(--paper)'}'">
              <td style="padding:11px 16px;font-weight:800;font-size:13px;letter-spacing:-0.02em;display:flex;align-items:center;gap:10px;">
                <span style="width:9px;height:9px;border-radius:50%;background:${(DSP_META[dd.name]||{color:'#475569'}).color};display:inline-block;flex-shrink:0;"></span>${dd.name}
              </td>
              <td style="padding:11px 16px;text-align:right;font-family:'DM Mono',monospace;font-size:12px;">${formatStreams(dd.streams)}</td>
              <td style="padding:11px 16px;text-align:right;font-family:'DM Mono',monospace;font-weight:700;font-size:13px;">${formatCurrency(dd.gross)}</td>
              <td style="padding:11px 16px;text-align:right;font-family:'DM Mono',monospace;font-size:12px;opacity:0.5;">${formatCurrency(dd.labelShare)}</td>
              <td style="padding:11px 16px;text-align:right;font-family:'DM Mono',monospace;font-weight:900;font-size:14px;">${formatCurrency(dd.artistShare)}</td>
              <td style="padding:11px 16px;text-align:right;font-family:'DM Mono',monospace;font-size:11px;opacity:0.4;">${dd.sharePct.toFixed(1)}%</td>
            </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr style="background:var(--ink);color:#fff;font-weight:900;">
            <td style="padding:12px 16px;font:10px 'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.5px;">★ TỔNG CỘNG</td>
            <td style="padding:12px 16px;text-align:right;font-family:'DM Mono',monospace;">${formatStreams(totalStreams)}</td>
            <td style="padding:12px 16px;text-align:right;font-family:'DM Mono',monospace;">${formatCurrency(totalGross)}</td>
            <td style="padding:12px 16px;text-align:right;font-family:'DM Mono',monospace;opacity:0.6;">${formatCurrency(labelRet)}</td>
            <td style="padding:12px 16px;text-align:right;font-family:'DM Mono',monospace;color:var(--lime);font-size:15px;">${formatCurrency(artistNet)}</td>
            <td style="padding:12px 16px;text-align:right;font-family:'DM Mono',monospace;">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>

  ${state.activeView==='summary' ? `
  <!-- ===== TRACK TABLE ===== -->
  <div style="border:1px solid var(--ink);box-shadow:4px 4px 0 var(--ink);margin-bottom:32px;overflow:hidden;">
    <div style="background:var(--ink);color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
      <strong style="font-size:13px;font-weight:900;letter-spacing:-0.02em;">Chi Tiết Từng Bài Hát (Track-by-Track)</strong>
      <span style="font:10px 'DM Mono',monospace;opacity:0.5;">${trackBreakdown.length} bài hát</span>
    </div>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
        <thead>
          <tr style="border-bottom:1px solid var(--ink);background:var(--paper);">
            <th style="padding:10px 16px;width:40px;font:9.5px 'DM Mono',monospace;text-transform:uppercase;opacity:0.5;">#</th>
            <th style="padding:10px 16px;text-align:left;font:9.5px 'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.5px;opacity:0.6;">Bài hát & Nghệ sĩ</th>
            <th style="padding:10px 16px;text-align:left;font:9.5px 'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.5px;opacity:0.6;">Nguồn & Lãnh thổ</th>
            <th style="padding:10px 16px;text-align:right;font:9.5px 'DM Mono',monospace;text-transform:uppercase;opacity:0.6;">Streams</th>
            <th style="padding:10px 16px;text-align:right;font:9.5px 'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.5px;opacity:0.6;">Doanh thu Gộp</th>
            <th style="padding:10px 16px;text-align:right;font:9.5px 'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.5px;opacity:0.6;">Label (${labelPct}%)</th>
            <th style="padding:10px 16px;text-align:right;font:9.5px 'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.5px;opacity:0.6;">NĐ (${artistPct}%)</th>
          </tr>
        </thead>
        <tbody>
          ${trackHTML||`<tr><td colspan="7" style="padding:32px;text-align:center;opacity:0.4;font:12px 'DM Mono',monospace;">Không có bài hát phù hợp.</td></tr>`}
        </tbody>
        ${trackBreakdown.length>0?`
        <tfoot>
          <tr style="background:var(--ink);color:#fff;font-weight:900;">
            <td colspan="3" style="padding:12px 16px;font:10px 'DM Mono',monospace;text-transform:uppercase;">★ TỔNG (${trackBreakdown.length} bài hát)</td>
            <td style="padding:12px 16px;text-align:right;font-family:'DM Mono',monospace;">${formatStreams(totalStreams)}</td>
            <td style="padding:12px 16px;text-align:right;font-family:'DM Mono',monospace;">${formatCurrency(totalGross)}</td>
            <td style="padding:12px 16px;text-align:right;font-family:'DM Mono',monospace;opacity:0.6;">${formatCurrency(labelRet)}</td>
            <td style="padding:12px 16px;text-align:right;font-family:'DM Mono',monospace;color:var(--lime);font-size:15px;">${formatCurrency(artistNet)}</td>
          </tr>
        </tfoot>` : ''}
      </table>
    </div>
  </div>` : `
  <!-- ===== TRANSACTION LEDGER ===== -->
  <div style="border:1px solid var(--ink);box-shadow:4px 4px 0 var(--ink);margin-bottom:32px;overflow:hidden;">
    <div style="background:var(--ink);color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
      <strong style="font-size:13px;font-weight:900;letter-spacing:-0.02em;">Raw Distribution Ledger — Toàn Bộ Giao Dịch</strong>
      <span style="font:10px 'DM Mono',monospace;opacity:0.5;">${filteredRows.length} dòng</span>
    </div>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="border-bottom:1px solid var(--ink);background:var(--paper);">
            <th style="padding:9px 12px;width:35px;font:9px 'DM Mono',monospace;text-transform:uppercase;opacity:0.5;">#</th>
            <th style="padding:9px 12px;text-align:left;font:9px 'DM Mono',monospace;text-transform:uppercase;opacity:0.6;letter-spacing:0.5px;">Bài hát</th>
            <th style="padding:9px 12px;text-align:left;font:9px 'DM Mono',monospace;text-transform:uppercase;opacity:0.6;letter-spacing:0.5px;">Nền tảng</th>
            <th style="padding:9px 12px;text-align:left;font:9px 'DM Mono',monospace;text-transform:uppercase;opacity:0.6;letter-spacing:0.5px;">Loại</th>
            <th style="padding:9px 12px;text-align:center;font:9px 'DM Mono',monospace;text-transform:uppercase;opacity:0.6;">QG</th>
            <th style="padding:9px 12px;text-align:right;font:9px 'DM Mono',monospace;text-transform:uppercase;opacity:0.6;">Streams</th>
            <th style="padding:9px 12px;text-align:right;font:9px 'DM Mono',monospace;text-transform:uppercase;opacity:0.6;">Gross</th>
            <th style="padding:9px 12px;text-align:right;font:9px 'DM Mono',monospace;text-transform:uppercase;opacity:0.6;">Label</th>
            <th style="padding:9px 12px;text-align:right;font:9px 'DM Mono',monospace;text-transform:uppercase;opacity:0.6;">NĐ Nhận</th>
          </tr>
        </thead>
        <tbody>
          ${txHTML||`<tr><td colspan="9" style="padding:32px;text-align:center;opacity:0.4;font:12px 'DM Mono',monospace;">Không có dữ liệu.</td></tr>`}
        </tbody>
        <tfoot>
          <tr style="background:var(--ink);color:#fff;font-weight:900;">
            <td colspan="5" style="padding:12px;font:10px 'DM Mono',monospace;text-transform:uppercase;">★ TỔNG (${filteredRows.length} dòng)</td>
            <td style="padding:12px;text-align:right;font-family:'DM Mono',monospace;">${formatStreams(totalStreams)}</td>
            <td style="padding:12px;text-align:right;font-family:'DM Mono',monospace;">${formatCurrency(totalGross)}</td>
            <td style="padding:12px;text-align:right;font-family:'DM Mono',monospace;opacity:0.6;">${formatCurrency(labelRet)}</td>
            <td style="padding:12px;text-align:right;font-family:'DM Mono',monospace;color:var(--lime);font-size:15px;">${formatCurrency(artistNet)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>`}
  `;

  attachHandlers();
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================
function attachHandlers() {
  const $ = id => document.querySelector(id);
  const fileInput  = $('#dist-csv-file-input');
  const browseBtn  = $('#dist-btn-browse-csv');
  const loadSample = $('#dist-btn-load-sample');
  const loadKho    = $('#dist-btn-load-khoband');
  const dlTpl      = $('#dist-btn-download-tpl');
  const dropzone   = $('#dist-file-dropzone');
  const pctInput   = $('#dist-label-pct-input');
  const artSel     = $('#dist-artist-select');
  const dspSel     = $('#dist-dsp-select');
  const search     = $('#dist-search-input');
  const vndBtn     = $('#dist-cur-vnd');
  const usdBtn     = $('#dist-cur-usd');
  const expCSV     = $('#dist-btn-export-csv');
  const expArtist  = $('#dist-btn-export-artist-csv');
  const expAllArt  = $('#dist-btn-export-all-artists');
  const openPDF    = $('#dist-btn-open-pdf');
  const sumBtn     = $('#dist-view-summary-btn');
  const txBtn      = $('#dist-view-tx-btn');
  const printBtn   = $('#btn-print-royalty-dialog');
  const closeBtn   = $('#btn-close-royalty-dialog');
  const periodInp  = $('#dist-statement-period');
  const numInp     = $('#dist-statement-number');
  const noteInp    = $('#dist-curve-note');

  sumBtn?.addEventListener('click', ()=>{ state.activeView='summary'; renderDistributionTab(); });
  txBtn?.addEventListener('click',  ()=>{ state.activeView='transactions'; renderDistributionTab(); });
  browseBtn?.addEventListener('click', ()=>fileInput?.click());
  dropzone?.addEventListener('click', ()=>fileInput?.click());

  // PDF settings — live update state without re-render (avoid focus loss)
  periodInp?.addEventListener('change', e=>{ state.statementPeriod = e.target.value.trim() || state.statementPeriod; });
  numInp?.addEventListener('change',    e=>{ state.statementNumber  = e.target.value.trim() || state.statementNumber; });
  noteInp?.addEventListener('change',   e=>{ state.curveNote        = e.target.value; });

  async function loadCSVFile(file) {
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      if (!parsed.length) { alert('File CSV không có dữ liệu hợp lệ.'); return; }
      state.records=parsed; state.fileName=file.name; state.isCustomLoaded=true;
      state.selectedArtist='all'; state.selectedDsp='all'; state.searchQuery='';
      renderDistributionTab();
      // Show per-artist breakdown if multiple artists detected
      const artists = [...new Set(parsed.map(r=>r.artist))];
      if (artists.length > 1) {
        alert(`✓ Nạp thành công ${parsed.length} dòng từ: ${file.name}\n\n📁 Phát hiện ${artists.length} nghệ sĩ:\n${artists.map(a=>'  · '+a).join('\n')}\n\nDùng nút "📤 CSV: [Tên NĐ]" để xuất riêng từng nghệ sĩ một cách an toàn.`);
      } else {
        alert(`✓ Nạp thành công ${parsed.length} dòng từ: ${file.name}`);
      }
    } catch(e) { alert('Lỗi CSV: '+e.message); }
  }

  fileInput?.addEventListener('change', async e=>{ const f=e.target.files?.[0]; if(f) await loadCSVFile(f); if(fileInput) fileInput.value=''; });

  if (dropzone) {
    ['dragenter','dragover'].forEach(ev=>dropzone.addEventListener(ev,e=>{e.preventDefault();dropzone.style.borderColor='var(--ink)';dropzone.style.background='var(--lime)';}));
    ['dragleave','drop'].forEach(ev=>dropzone.addEventListener(ev,e=>{e.preventDefault();dropzone.style.borderColor='rgba(11,11,11,0.3)';dropzone.style.background='var(--paper)';}));
    dropzone.addEventListener('drop', async e=>{ const f=e.dataTransfer?.files?.[0]; if(f?.name.endsWith('.csv')) await loadCSVFile(f); });
  }

  loadSample?.addEventListener('click', ()=>{
    state.records=[...sampleDistributionData]; state.fileName='uniflows_sample_dataset.csv';
    state.isCustomLoaded=false; state.selectedArtist='all'; state.selectedDsp='all'; state.searchQuery='';
    renderDistributionTab(); alert('✓ Đã nạp dữ liệu demo!');
  });

  loadKho?.addEventListener('click', async ()=>{
    try {
      const res=await fetch('/sample_distribution_khoband.csv');
      if(!res.ok) throw new Error('Không tải được file.');
      const text=await res.text(); const parsed=parseCSV(text);
      state.records=parsed; state.fileName='sample_distribution_khoband.csv';
      state.isCustomLoaded=true; state.selectedArtist='all'; state.selectedDsp='all'; state.searchQuery='';
      renderDistributionTab(); alert(`✓ Nạp ${parsed.length} dòng dữ liệu Khờ Band!`);
    } catch(e) { alert('Lỗi: '+e.message); }
  });

  dlTpl?.addEventListener('click', ()=>downloadCSVTemplate());
  pctInput?.addEventListener('input', e=>{ let v=parseFloat(e.target.value); if(isNaN(v)) v=0; state.labelPercentage=Math.max(0,Math.min(100,v)); renderDistributionTab(); });
  document.querySelectorAll('.dist-pct-pill').forEach(p=>p.addEventListener('click',()=>{ state.labelPercentage=Number(p.dataset.pct)||20; renderDistributionTab(); }));
  artSel?.addEventListener('change', e=>{ state.selectedArtist=e.target.value; renderDistributionTab(); });
  dspSel?.addEventListener('change', e=>{ state.selectedDsp=e.target.value; renderDistributionTab(); });
  search?.addEventListener('input',  e=>{ state.searchQuery=e.target.value; renderDistributionTab(); });
  vndBtn?.addEventListener('click', ()=>{ state.currency='VND'; renderDistributionTab(); });
  usdBtn?.addEventListener('click', ()=>{ state.currency='USD'; renderDistributionTab(); });
  expCSV?.addEventListener('click', ()=>exportProcessedCSV());
  openPDF?.addEventListener('click', ()=>{
    // Sync any unsaved PDF field changes before opening
    if (periodInp) state.statementPeriod = periodInp.value.trim() || state.statementPeriod;
    if (numInp)    state.statementNumber  = numInp.value.trim()   || state.statementNumber;
    if (noteInp)   state.curveNote        = noteInp.value;
    openRoyaltyStatementPreview();
  });

  // Export CSV for the currently-selected artist only (private — no other artist data)
  expArtist?.addEventListener('click', ()=>{
    if (state.selectedArtist === 'all') { alert('Chọn một nghệ sĩ cụ thể để xuất CSV riêng.'); return; }
    exportArtistCSV(state.selectedArtist);
  });

  // Bulk: export one CSV file per artist — each file only contains that artist's data
  expAllArt?.addEventListener('click', async ()=>{
    const artists = [...new Set(state.records.map(r=>r.artist))].sort();
    if (artists.length < 2) { alert('Chỉ có 1 nghệ sĩ trong dataset.'); return; }
    const confirm = window.confirm(`Xuất ${artists.length} file CSV riêng:\n${artists.map(a=>'  · '+a).join('\n')}\n\nMỗi file chỉ chứa dữ liệu của nghệ sĩ đó.`);
    if (!confirm) return;
    for (const artist of artists) {
      await new Promise(r=>setTimeout(r,300)); // small delay between downloads
      exportArtistCSV(artist);
    }
  });

  printBtn?.addEventListener('click', ()=>printRoyaltyStatement());
  closeBtn?.addEventListener('click', ()=>document.querySelector('#admin-royalty-statement-dialog')?.close());
}
