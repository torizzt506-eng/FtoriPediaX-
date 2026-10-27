(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- Data dasar ---------- */
  const KEY = 'ftoripediax.v1';
  const API = 'https://api.jikan.moe/v4';
  const MAXLV = 9999;
  const RANKS = [
    { n: 'Bronze', min: 1, max: 99, c: '#cd7f32', c2: '#7a4515' },
    { n: 'Silver', min: 100, max: 499, c: '#dfe6ef', c2: '#7d8a9c' },
    { n: 'Gold', min: 500, max: 1499, c: '#ffd34d', c2: '#b8860b' },
    { n: 'Glory', min: 1500, max: 4999, c: '#ff5cf0', c2: '#7a1fff' },
    { n: 'Eternal', min: 5000, max: 9999, c: '#4de1ff', c2: '#ffd34d' }
  ];
  const BANNERS = [
    'linear-gradient(120deg,#1b2a6b,#7c3aed)', 'linear-gradient(120deg,#0f766e,#22d3ee)',
    'linear-gradient(120deg,#9d174d,#fb7185)', 'linear-gradient(120deg,#78350f,#f59e0b)',
    'linear-gradient(120deg,#111827,#4b5563)'
  ];
  const K = 3; // XP untuk level n = K * (n-1)^2
  const base = (l) => K * (l - 1) * (l - 1);
  const lvOf = (xp) => Math.min(MAXLV, Math.floor(Math.sqrt(xp / K)) + 1);
  const tierOf = (l) => (l >= 5000 ? 4 : l >= 1500 ? 3 : l >= 500 ? 2 : l >= 100 ? 1 : 0);

  /* ---------- Penyimpanan ---------- */
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(me)); } catch (e) { toast('Penyimpanan penuh. Coba pakai foto yang lebih kecil.'); }
  }
  const me = Object.assign({ name: 'Pengguna Baru', handle: 'pengguna', bio: 'Pemburu anime dan film.', avatar: '', theme: 0, xp: 0, claim: '', favs: [], seen: [] }, load());
  me.xp = Math.max(0, Number(me.xp) || 0);
  me.favs = Array.isArray(me.favs) ? me.favs : [];
  me.seen = Array.isArray(me.seen) ? me.seen : [];
  me.theme = BANNERS[me.theme] ? me.theme : 0;
  me.banners = (me.banners && typeof me.banners === 'object') ? me.banners : {};

  const lv = () => lvOf(me.xp);
  const rankInfo = (l) => Object.assign({ t: tierOf(l) }, RANKS[tierOf(l)]);

  /* ---------- Badge SVG per rank ---------- */
  const P = {
    sh: '<path class="sh" d="M32 7l19 7v16c0 14-8 23-19 27C21 53 13 44 13 30V14z"/>',
    c1: '<path class="ln" d="M24 28l8 7 8-7"/>',
    c2: '<path class="ln" d="M24 37l8 7 8-7"/>',
    crown: '<path class="ac" d="M21 41l2-13 6 6 3-9 3 9 6-6 2 13z"/>',
    wings: '<path class="ac" d="M13 20C5 18 1 28 5 38c3-4 6-5 8-5zM51 20c8-2 12 8 8 18-3-4-6-5-8-5z"/>',
    star: '<path class="ac" d="M32 21l3.2 6.6 7.3 1-5.3 5.1 1.3 7.2L32 37.4l-6.5 3.5 1.3-7.2-5.3-5.1 7.3-1z"/>',
    ring: '<circle class="ring" cx="32" cy="32" r="30" fill="none" stroke="var(--rc)" stroke-width="1.6" stroke-dasharray="3 5"/>',
    gem: '<path class="ac" d="M32 37l5 6-5 8-5-8z"/>'
  };
  const BODY = [
    P.sh + P.c1,
    P.sh + P.c1 + P.c2,
    P.sh + P.crown,
    P.wings + P.sh + P.star,
    P.ring + P.wings + P.sh + '<g transform="translate(0,-6)">' + P.crown + '</g>' + P.gem
  ];
  function badge(t, size) {
    const r = RANKS[t];
    return '<svg class="badge t' + t + '" style="--rc:' + r.c + ';--rc2:' + r.c2 + '" viewBox="0 0 64 64" width="' + size + '" height="' + size + '" role="img" aria-label="' + r.n + '">' + BODY[t] + '</svg>';
  }

  function avatarHTML(size, img) {
    if (img === undefined) img = me.avatar;
    const r = rankInfo(lv());
    const ringW = [2, 3, 4, 5, 6][r.t];
    const inner = img ? '<img src="' + esc(img) + '" alt="Foto profil">' : '<span style="font-size:' + Math.round(size * 0.42) + 'px">' + esc((me.name || '?').trim().charAt(0).toUpperCase()) + '</span>';
    return '<div class="av t' + r.t + '" style="--s:' + size + 'px;--rg:' + ringW + 'px;--rc:' + r.c + ';--rc2:' + r.c2 + '"><i class="ring"></i><span class="pic">' + inner + '</span></div>';
  }

  /* ---------- Toast & XP ---------- */
  function toast(html, cls) {
    const box = $('#toasts');
    while (box.children.length >= 4) box.removeChild(box.firstChild);
    const t = document.createElement('div');
    t.className = 'toast ' + (cls || '');
    t.innerHTML = html;
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 3000);
  }

  function addXp(n, why) {
    const l0 = lv(), t0 = tierOf(l0);
    me.xp += n;
    const l1 = lv(), t1 = tierOf(l1);
    persist();
    toast('<b>+' + n + ' XP</b> ' + esc(why));
    if (l1 > l0) toast('Naik ke <b>Level ' + l1 + '</b>', 'up');
    if (t1 > t0) toast(badge(t1, 36) + ' Rank baru: <b>' + RANKS[t1].n + '</b>', 'up');
    renderChip();
    if (!$('#profile').hidden) renderProfile();
  }

  function renderChip() {
    const l = lv(), r = rankInfo(l);
    $('#chipMe').innerHTML = avatarHTML(36) + '<span class="cl"><b>' + esc(me.name) + '</b><small>Lv ' + l + ' ' + r.n + '</small></span>' + badge(r.t, 30);
  }

  /* ---------- Navigasi ---------- */
  function show(v) {
    $$('.view').forEach((s) => {
      const on = s.id === v;
      s.hidden = !on;
      if (on) { s.classList.add('enter'); setTimeout(() => s.classList.remove('enter'), 1100); }
    });
    $$('.tab').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
    if (v === 'profile') renderProfile();
    if (v === 'movies') showMovies();
    window.scrollTo(0, 0);
  }

  /* ---------- Judul hero (motion blur) ---------- */
  const ht = $('#heroTitle');
  ht.setAttribute('aria-label', ht.textContent);
  ht.innerHTML = Array.from(ht.textContent).map((c, i) => '<span aria-hidden="true" style="--i:' + i + '">' + c + '</span>').join('');
  setTimeout(() => ht.classList.add('ready'), 1800);
  ht.addEventListener('pointerenter', () => {
    if (!ht.classList.contains('ready')) return;
    ht.classList.add('sm');
    setTimeout(() => ht.classList.remove('sm'), 1400);
  });

  /* ---------- API ---------- */
  async function api(path, retry) {
    if (retry === undefined) retry = 1;
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 6500);
    try {
      const res = await fetch(API + path, { signal: ctl.signal });
      if (res.status === 429 && retry > 0) { clearTimeout(to); await sleep(1300); return api(path, retry - 1); }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally { clearTimeout(to); }
  }

  /* Sumber cadangan: AniList (dipakai kalau Jikan lambat atau error) */
  const AL_GENRE = { 1: 'Action', 2: 'Adventure', 4: 'Comedy', 8: 'Drama', 10: 'Fantasy', 14: 'Horror', 22: 'Romance', 24: 'Sci-Fi', 30: 'Sports', 36: 'Slice of Life' };
  const AL_FIELDS = 'id idMal title{romaji english} coverImage{extraLarge large} averageScore format episodes seasonYear genres description(asHtml:false) trailer{id site} externalLinks{site url type}';
  function alNorm(m) {
    return {
      mal_id: m.idMal || ('al' + m.id),
      title: (m.title && (m.title.english || m.title.romaji)) || 'Tanpa judul',
      images: { jpg: { image_url: (m.coverImage && (m.coverImage.extraLarge || m.coverImage.large)) || '' } },
      score: m.averageScore ? (m.averageScore / 10).toFixed(1) : 0,
      type: m.format === 'MOVIE' ? 'Film' : String(m.format || '').replace('_', ' '),
      episodes: m.episodes, year: m.seasonYear,
      genres: (m.genres || []).map((n) => ({ name: n })),
      synopsis: String(m.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
      trailer: m.trailer && m.trailer.site === 'youtube' ? { youtube_id: m.trailer.id } : null,
      streams: (m.externalLinks || []).filter((l) => l.type === 'STREAMING').map((l) => ({ name: l.site, url: l.url }))
    };
  }
  async function alList() {
    const args = ['type:ANIME', 'isAdult:false'], decl = [], vars = {};
    if (st.q) { args.push('search:$s', 'sort:[SEARCH_MATCH]'); decl.push('$s:String'); vars.s = st.q; }
    else if (st.type || st.genre) args.push('sort:[SCORE_DESC]');
    else args.push('status:RELEASING', 'sort:[POPULARITY_DESC]');
    if (st.type === 'movie') args.push('format:MOVIE');
    if (st.type === 'tv') args.push('format:TV');
    if (st.genre && AL_GENRE[st.genre]) { args.push('genre:$g'); decl.push('$g:String'); vars.g = AL_GENRE[st.genre]; }
    const query = 'query' + (decl.length ? '(' + decl.join(',') + ')' : '') + '{Page(perPage:24){media(' + args.join(',') + '){' + AL_FIELDS + '}}}';
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 9000);
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST', signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query, variables: vars })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      return ((j.data && j.data.Page && j.data.Page.media) || []).map(alNorm);
    } finally { clearTimeout(to); }
  }
  const imgOf = (a) => (a.images && ((a.images.webp && a.images.webp.large_image_url) || (a.images.jpg && a.images.jpg.image_url))) || '';

  /* ---------- Katalog ---------- */
  const st = { q: '', type: '', genre: '', tok: 0, list: [] };

  async function loadList() {
    const tok = ++st.tok;
    const grid = $('#grid'), state = $('#state');
    state.hidden = true;
    grid.innerHTML = '<div class="sk"></div>'.repeat(12);
    const p = new URLSearchParams({ limit: '24', sfw: 'true' });
    let path;
    if (!st.q && !st.type && !st.genre) {
      p.set('filter', 'airing');
      path = '/top/anime?' + p;
      $('#listTitle').textContent = 'Sedang tayang';
    } else {
      if (st.q) p.set('q', st.q);
      if (st.type) p.set('type', st.type);
      if (st.genre) p.set('genres', st.genre);
      if (!st.q) { p.set('order_by', 'score'); p.set('sort', 'desc'); }
      path = '/anime?' + p;
      $('#listTitle').textContent = st.q ? 'Hasil untuk "' + st.q + '"' : 'Hasil filter';
    }
    try {
      let data;
      try { data = (await api(path)).data || []; }
      catch (err) {
        if (tok !== st.tok) return;
        toast('Server utama lambat, pakai sumber cadangan.');
        data = await alList();
      }
      if (tok !== st.tok) return;
      const seen = new Set();
      st.list = data.filter((a) => !seen.has(a.mal_id) && seen.add(a.mal_id));
      drawGrid();
    } catch (e) {
      if (tok !== st.tok) return;
      grid.innerHTML = '';
      state.hidden = false;
      state.innerHTML = '<p>Data belum bisa dimuat. Periksa koneksi internet, lalu coba lagi.</p><button class="btn" id="retry" type="button">Coba lagi</button>';
    }
  }

  function drawGrid() {
    const grid = $('#grid'), state = $('#state');
    grid.innerHTML = '';
    if (!st.list.length) {
      state.hidden = false;
      state.innerHTML = '<p>Tidak ada hasil. Coba kata kunci atau filter lain.</p>';
      return;
    }
    state.hidden = true;
    st.list.forEach((a, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'card';
      b.dataset.i = i;
      b.style.setProperty('--n', Math.min(i, 14));
      b.innerHTML = '<img loading="lazy" src="' + esc(imgOf(a)) + '" alt="' + esc(a.title) + '"><span class="sc">&#9733; ' + (a.score || '-') + '</span><span class="ct">' + esc(a.title) + '</span>';
      grid.appendChild(b);
    });
  }

  /* ---------- Modal ---------- */
  let cur = null, draft = null, curM = null;
  function openModal(html) {
    $('#mBody').innerHTML = html;
    $('#modal').hidden = false;
    document.body.style.overflow = 'hidden';
    $('#mClose').focus();
  }
  function closeModal() {
    $('#modal').hidden = true;
    $('#mBody').innerHTML = '';
    document.body.style.overflow = '';
    cur = null; draft = null; curM = null;
  }

  function openDetail(a) {
    cur = a;
    const isFav = me.favs.some((f) => f.id === a.mal_id);
    const tags = [a.type, a.episodes ? a.episodes + ' episode' : '', a.year, a.score ? 'Skor ' + a.score : '']
      .filter(Boolean).map((m) => '<span class="tag soft">' + esc(m) + '</span>').join('') +
      (a.genres || []).map((g) => '<span class="tag">' + esc(g.name) + '</span>').join('');
    const syn = a.synopsis ? (a.synopsis.length > 700 ? a.synopsis.slice(0, 700) + '...' : a.synopsis) : 'Belum ada sinopsis.';
    const yt = a.trailer && a.trailer.youtube_id;
    openModal(
      '<div class="det"><img class="dp" src="' + esc(imgOf(a)) + '" alt="Poster ' + esc(a.title) + '"><div class="di">' +
      '<h2 class="glow">' + esc(a.title) + '</h2><div class="tags">' + tags + '</div><p class="syn">' + esc(syn) + '</p>' +
      '<div class="acts">' + (yt ? '<button class="btn" type="button" data-act="trailer">Putar trailer</button>' : '') +
      '<button class="btn ghost" type="button" data-act="fav">' + (isFav ? 'Hapus dari favorit' : 'Tambah favorit') + '</button></div>' +
      '<div id="trailer"></div><h3>Tonton di platform resmi</h3><div class="where" id="where"><span class="muted">Memuat tautan...</span></div></div></div>'
    );
    if (!me.seen.includes('o' + a.mal_id)) {
      me.seen.push('o' + a.mal_id);
      if (me.seen.length > 3000) me.seen.shift();
      addXp(15, 'buka detail');
    }
    (a.streams ? Promise.resolve({ data: a.streams }) : api('/anime/' + a.mal_id + '/streaming')).then((j) => {
      const w = $('#where');
      if (!w || cur !== a) return;
      const links = (j.data || []).filter((s) => s.url && /^https?:\/\//i.test(s.url));
      w.innerHTML = links.length
        ? links.map((s) => '<a class="btn ghost" target="_blank" rel="noopener noreferrer" href="' + esc(s.url) + '">' + esc(s.name) + '</a>').join('')
        : '<span class="muted">Belum ada tautan resmi di database. Coba cari judulnya di Crunchyroll, Bstation, atau Netflix.</span>';
    }).catch(() => {
      const w = $('#where');
      if (w && cur === a) w.innerHTML = '<span class="muted">Tautan platform belum bisa dimuat.</span>';
    });
  }

  function toggleFav(a) {
    const i = me.favs.findIndex((f) => f.id === a.mal_id);
    if (i > -1) {
      me.favs.splice(i, 1);
      persist();
      toast('Dihapus dari favorit');
      if (!$('#profile').hidden) renderProfile();
      return;
    }
    me.favs.unshift({ id: a.mal_id, title: a.title, img: imgOf(a) });
    persist();
    toast('Ditambahkan ke favorit');
    if (!me.seen.includes('f' + a.mal_id)) { me.seen.push('f' + a.mal_id); addXp(25, 'tambah favorit'); }
  }

  /* ---------- Edit profil ---------- */
  function openEdit() {
    draft = { avatar: me.avatar, theme: me.theme };
    openModal(
      '<h2 class="glow">Edit profil</h2><form class="ef" id="ef">' +
      '<div class="eav"><div id="eavp">' + avatarHTML(96, draft.avatar) + '</div><div>' +
      '<label class="btn ghost fl">Ganti foto<input type="file" id="ef-file" accept="image/*" hidden></label>' +
      '<button class="btn ghost" type="button" data-act="rmfoto">Hapus foto</button></div></div>' +
      '<label>Nama<input id="ef-name" maxlength="24" value="' + esc(me.name) + '" required></label>' +
      '<label>Username<input id="ef-handle" maxlength="20" value="' + esc(me.handle) + '"></label>' +
      '<label>Bio<textarea id="ef-bio" maxlength="120" rows="3">' + esc(me.bio) + '</textarea></label>' +
      '<div class="themes">' + BANNERS.map((b, i) => '<button type="button" class="sw' + (i === me.theme ? ' on' : '') + '" data-th="' + i + '" style="background:' + b + '" aria-label="Tema ' + (i + 1) + '"></button>').join('') + '</div>' +
      '<button class="btn" type="submit">Simpan profil</button></form>'
    );
  }

  function readPhoto(f) {
    if (!f || !/^image\//.test(f.type)) { toast('Pilih file gambar.'); return; }
    const fr = new FileReader();
    fr.onerror = () => toast('File tidak bisa dibaca.');
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => toast('Gambar tidak bisa dibaca.');
      im.onload = () => {
        if (!draft) return;
        const s = 256, c = document.createElement('canvas');
        c.width = c.height = s;
        const m = Math.min(im.width, im.height);
        c.getContext('2d').drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, s, s);
        draft.avatar = c.toDataURL('image/jpeg', 0.85);
        $('#eavp').innerHTML = avatarHTML(96, draft.avatar);
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(f);
  }

  function saveProfile() {
    const name = $('#ef-name').value.trim();
    if (!name) { toast('Nama tidak boleh kosong.'); return; }
    me.name = name.slice(0, 24);
    me.handle = $('#ef-handle').value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'pengguna';
    me.bio = $('#ef-bio').value.trim().slice(0, 120);
    me.avatar = draft.avatar;
    me.theme = draft.theme;
    persist();
    closeModal();
    toast('Profil disimpan');
    if (!me.seen.includes('edit')) { me.seen.push('edit'); addXp(50, 'lengkapi profil'); }
    renderChip();
    if (!$('#profile').hidden) renderProfile();
  }

  /* ---------- Profil ---------- */
  function drawSim(v) {
    const t = tierOf(v), r = RANKS[t];
    $('#sim').innerHTML = badge(t, 110) + '<div><b class="glow">' + r.n + '</b><br><span class="muted">Level ' + v + ' (rank ' + r.min + ' sampai ' + r.max + ')</span></div>';
  }

  function renderProfile() {
    const l = lv(), r = rankInfo(l);
    const cur0 = base(l), nxt = base(l + 1);
    const pct = l >= MAXLV ? 100 : Math.min(100, ((me.xp - cur0) / (nxt - cur0)) * 100);
    const claimed = me.claim === new Date().toDateString();
    $('#profile').innerHTML =
      '<div class="pcard"><div class="banner" style="background:' + BANNERS[me.theme] + '"></div>' +
      '<div class="phead">' + avatarHTML(112) +
      '<div class="pinfo"><h2 class="glow">' + esc(me.name) + '</h2><p class="handle">@' + esc(me.handle) + '</p><p class="bio">' + esc(me.bio) + '</p></div>' +
      '<div class="pbtns"><button class="btn" type="button" data-act="edit">Edit profil</button>' +
      '<button class="btn ghost" type="button" data-act="claim"' + (claimed ? ' disabled' : '') + '>' + (claimed ? 'Bonus sudah diklaim' : 'Klaim bonus +100 XP') + '</button></div></div>' +
      '<div class="pstats"><div><b>' + l + '</b><span>Level</span></div><div><b>' + me.xp.toLocaleString('id-ID') + '</b><span>Total XP</span></div>' +
      '<div><b>' + me.favs.length + '</b><span>Favorit</span></div><div>' + badge(r.t, 44) + '<span>' + r.n + '</span></div></div>' +
      '<div class="xpwrap"><div class="xpbar" style="--rc:' + r.c + '"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
      '<p>' + (l >= MAXLV ? 'Level maksimum tercapai' : (me.xp - cur0).toLocaleString('id-ID') + ' / ' + (nxt - cur0).toLocaleString('id-ID') + ' XP menuju Level ' + (l + 1)) + '</p></div></div>' +
      '<h3 class="sec glow">Semua rank</h3><div class="ranks">' +
      RANKS.map((x, i) => '<div class="rk">' + badge(i, 72) + '<b>' + x.n + '</b><small>Lv ' + x.min + ' sampai ' + x.max + '</small></div>').join('') + '</div>' +
      '<h3 class="sec glow">Simulator level</h3><div class="simbox"><div class="simout" id="sim"></div>' +
      '<input type="range" id="simR" min="1" max="' + MAXLV + '" value="' + l + '" aria-label="Pratinjau level"></div>' +
      '<h3 class="sec glow">Cara dapat XP</h3><ul class="tips"><li>Buka detail judul baru: +15 XP</li><li>Tambah favorit baru: +25 XP</li><li>Lengkapi profil sekali: +50 XP</li><li>Bonus harian: +100 XP</li></ul>' +
      '<h3 class="sec glow">Favorit</h3>' +
      (me.favs.length
        ? '<div class="favs">' + me.favs.map((f) => '<button class="ft" type="button" data-fid="' + esc(f.id) + '"><img loading="lazy" src="' + esc(f.img) + '" alt="' + esc(f.title) + '"></button>').join('') + '</div>'
        : '<p class="muted">Belum ada favorit. Buka sebuah judul lalu tekan Tambah favorit.</p>');
    drawSim(l);
  }

  /* ---------- Film (TMDB) ---------- */
  const TM = 'https://api.themoviedb.org/3', TI = 'https://image.tmdb.org/t/p/';
  const CATS = {
    trending: ['Trending minggu ini', '/trending/movie/week'], popular: ['Paling populer', '/movie/popular'],
    now: ['Sedang tayang di bioskop', '/movie/now_playing'], top: ['Rating tertinggi sepanjang masa', '/movie/top_rated'],
    upcoming: ['Akan tayang', '/movie/upcoming']
  };
  const mv = { cat: 'trending', q: '', genre: '', sort: '', year: '', page: 1, pages: 1, tok: 0, list: [], ready: false };
  let openTok = 0;
  const tkey = () => String(me.tmdb || '').trim();

  async function tmdb(path, params) {
    const key = tkey();
    const u = new URL(TM + path);
    u.searchParams.set('language', 'id-ID');
    Object.keys(params || {}).forEach((k) => { if (params[k] !== '' && params[k] != null) u.searchParams.set(k, params[k]); });
    const opt = { headers: {} };
    if (key.length > 40) opt.headers.Authorization = 'Bearer ' + key; else u.searchParams.set('api_key', key);
    const ctl = new AbortController();
    opt.signal = ctl.signal;
    const to = setTimeout(() => ctl.abort(), 9000);
    try {
      const res = await fetch(u.toString(), opt);
      if (res.status === 401) throw new Error('KEY');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally { clearTimeout(to); }
  }

  function showMovies() {
    const has = !!tkey();
    $('#keyBox').hidden = has;
    $('#mvApp').hidden = !has;
    if (has && !mv.ready) initMovies();
  }

  function initMovies() {
    mv.ready = true;
    const y = new Date().getFullYear();
    let h = '<option value="">Semua tahun</option>';
    for (let i = y + 1; i >= 1950; i--) h += '<option value="' + i + '">' + i + '</option>';
    $('#mvYear').innerHTML = h;
    tmdb('/genre/movie/list').then((j) => {
      $('#mvGenre').innerHTML = '<option value="">Semua genre</option>' + (j.genres || []).map((g) => '<option value="' + g.id + '">' + esc(g.name) + '</option>').join('');
    }).catch(() => {});
    loadMovies(false);
  }

  function mvEndpoint(page) {
    if (mv.q) return ['/search/movie', { query: mv.q, page: page, include_adult: 'false', primary_release_year: mv.year }];
    if (mv.genre || mv.sort || mv.year) {
      const p = { page: page, with_genres: mv.genre, sort_by: mv.sort || 'popularity.desc', primary_release_year: mv.year, include_adult: 'false' };
      if (mv.sort === 'vote_average.desc') p['vote_count.gte'] = 300;
      if (mv.sort === 'primary_release_date.desc') p['primary_release_date.lte'] = new Date().toISOString().slice(0, 10);
      return ['/discover/movie', p];
    }
    return [CATS[mv.cat][1], { page: page }];
  }

  function mvMark() {
    const plain = !mv.q && !mv.genre && !mv.sort && !mv.year;
    $$('#mvCats .chip').forEach((c) => c.classList.toggle('on', plain && c.dataset.cat === mv.cat));
    $('#mvTitle').textContent = mv.q ? 'Hasil untuk "' + mv.q + '"' : (plain ? CATS[mv.cat][0] : 'Hasil filter');
  }

  async function loadMovies(append) {
    const tok = ++mv.tok;
    const grid = $('#mvGrid'), state = $('#mvState');
    mvMark();
    state.hidden = true;
    if (!append) { mv.page = 1; grid.innerHTML = '<div class="sk"></div>'.repeat(12); $('#mvMore').hidden = true; }
    const ep = mvEndpoint(mv.page);
    try {
      const j = await tmdb(ep[0], ep[1]);
      if (tok !== mv.tok) return;
      let r = (j.results || []).filter((m) => m.poster_path);
      if (mv.q && mv.genre) r = r.filter((m) => (m.genre_ids || []).indexOf(+mv.genre) > -1);
      mv.pages = Math.min(j.total_pages || 1, 500);
      const base0 = append ? mv.list : [];
      mv.list = base0.concat(r.filter((m) => !base0.some((o) => o.id === m.id)));
      drawMovies();
    } catch (e) {
      if (tok !== mv.tok) return;
      if (e.message === 'KEY') { me.tmdb = ''; persist(); mv.ready = false; toast('API key ditolak TMDB. Masukkan lagi key-nya.'); showMovies(); return; }
      if (append) { mv.page = Math.max(1, mv.page - 1); toast('Gagal memuat halaman berikutnya.'); return; }
      grid.innerHTML = '';
      state.hidden = false;
      state.innerHTML = '<p>Data film belum bisa dimuat. Periksa koneksi internet, lalu coba lagi.</p><button class="btn" id="mvRetry" type="button">Coba lagi</button>';
    }
  }

  function drawMovies() {
    const grid = $('#mvGrid'), state = $('#mvState');
    grid.innerHTML = '';
    if (!mv.list.length) {
      state.hidden = false;
      state.innerHTML = '<p>Tidak ada film ditemukan. Coba kata kunci atau filter lain.</p>';
      $('#mvMore').hidden = true;
      return;
    }
    state.hidden = true;
    mv.list.forEach((m, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'card';
      b.dataset.i = i;
      b.style.setProperty('--n', Math.min(i, 14));
      b.innerHTML = '<img loading="lazy" src="' + TI + 'w342' + esc(m.poster_path) + '" alt="' + esc(m.title) + '"><span class="sc">&#9733; ' + (m.vote_average ? m.vote_average.toFixed(1) : '-') + '</span><span class="ct">' + esc(m.title) + '</span><span class="yr">' + esc((m.release_date || '').slice(0, 4) || 'Segera') + '</span>';
      grid.appendChild(b);
    });
    $('#mvMore').hidden = mv.page >= mv.pages;
  }

  async function openMovie(id) {
    const t = ++openTok;
    openModal('<p class="muted">Memuat detail film...</p>');
    let d;
    try {
      d = await tmdb('/movie/' + encodeURIComponent(id), { append_to_response: 'videos,credits,similar,watch/providers', include_video_language: 'id,en,null' });
    } catch (e) { if (t === openTok) { closeModal(); toast('Detail film belum bisa dimuat.'); } return; }
    if (t !== openTok || $('#modal').hidden) return;
    cur = null; curM = d;
    const vids = ((d.videos && d.videos.results) || []).filter((v) => v.site === 'YouTube');
    d._yt = (vids.filter((v) => v.type === 'Trailer')[0] || vids[0] || {}).key || '';
    const wp = d['watch/providers'] && d['watch/providers'].results && d['watch/providers'].results.ID;
    const link = (wp && wp.link) || ('https://www.themoviedb.org/movie/' + d.id + '/watch?locale=ID');
    const grp = (label, arr) => (arr && arr.length)
      ? '<div class="provs"><small>' + label + '</small>' + arr.map((p) => '<a class="prov" target="_blank" rel="noopener noreferrer" href="' + esc(link) + '" title="' + esc(p.provider_name) + '"><img loading="lazy" src="' + TI + 'w92' + esc(p.logo_path) + '" alt="' + esc(p.provider_name) + '"></a>').join('') + '</div>' : '';
    const provHtml = wp ? grp('Streaming', wp.flatrate) + grp('Sewa', wp.rent) + grp('Beli', wp.buy) : '';
    const crew = (d.credits && d.credits.crew) || [];
    const dir = crew.filter((c) => c.job === 'Director')[0];
    const cast = ((d.credits && d.credits.cast) || []).slice(0, 10);
    const sim = ((d.similar && d.similar.results) || []).filter((m) => m.poster_path).slice(0, 10);
    const rt = d.runtime ? Math.floor(d.runtime / 60) + 'j ' + (d.runtime % 60) + 'm' : '';
    const tags = [(d.release_date || '').slice(0, 4), rt, d.vote_average ? 'Skor ' + d.vote_average.toFixed(1) : '', dir ? 'Sutradara: ' + dir.name : '']
      .filter(Boolean).map((m) => '<span class="tag soft">' + esc(m) + '</span>').join('') +
      (d.genres || []).map((g) => '<span class="tag">' + esc(g.name) + '</span>').join('');
    const isFav = me.favs.some((f) => f.id === 'm' + d.id);
    $('#mBody').innerHTML =
      '<div class="mhead" style="' + (d.backdrop_path ? 'background-image:url(' + TI + 'w780' + esc(d.backdrop_path) + ')' : '') + '"></div>' +
      '<div class="det mvdet"><img class="dp" src="' + (d.poster_path ? TI + 'w500' + esc(d.poster_path) : '') + '" alt="Poster ' + esc(d.title) + '"><div class="di">' +
      '<h2 class="glow">' + esc(d.title) + '</h2>' + (d.tagline ? '<p class="tagline">' + esc(d.tagline) + '</p>' : '') +
      '<div class="tags">' + tags + '</div><p class="syn">' + esc(d.overview || 'Belum ada sinopsis dalam bahasa Indonesia.') + '</p>' +
      '<div class="acts">' + (d._yt ? '<button class="btn" type="button" data-mact="trailer">Putar trailer</button>' : '') +
      '<button class="btn ghost" type="button" data-mact="fav">' + (isFav ? 'Hapus dari favorit' : 'Tambah favorit') + '</button></div>' +
      '<div id="trailer"></div><h3>Tonton di platform resmi (Indonesia)</h3>' +
      (provHtml || '<p class="muted">Belum ada data platform untuk Indonesia. <a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">Cek di TMDB</a></p>') +
      '<p class="muted">Data platform dari JustWatch lewat TMDB.</p>' +
      (cast.length ? '<h3>Pemeran</h3><div class="cast">' + cast.map((c) => '<div class="person">' + (c.profile_path ? '<img loading="lazy" src="' + TI + 'w185' + esc(c.profile_path) + '" alt="' + esc(c.name) + '">' : '<i>' + esc(c.name.charAt(0)) + '</i>') + '<b>' + esc(c.name) + '</b><span>' + esc(c.character || '') + '</span></div>').join('') + '</div>' : '') +
      (sim.length ? '<h3>Film serupa</h3><div class="simrow">' + sim.map((m) => '<button type="button" data-mact="sim" data-id="' + m.id + '"><img loading="lazy" src="' + TI + 'w185' + esc(m.poster_path) + '" alt="' + esc(m.title) + '"></button>').join('') + '</div>' : '') +
      '</div></div>';
    $('#modal .sheet').scrollTop = 0;
    if (!me.seen.includes('om' + d.id)) {
      me.seen.push('om' + d.id);
      if (me.seen.length > 3000) me.seen.shift();
      addXp(15, 'buka detail film');
    }
  }

  function toggleFavMovie(d) {
    const fid = 'm' + d.id;
    const i = me.favs.findIndex((f) => f.id === fid);
    if (i > -1) {
      me.favs.splice(i, 1);
      persist();
      toast('Dihapus dari favorit');
      if (!$('#profile').hidden) renderProfile();
      return;
    }
    me.favs.unshift({ id: fid, kind: 'movie', title: d.title, img: d.poster_path ? TI + 'w342' + d.poster_path : '' });
    persist();
    toast('Ditambahkan ke favorit');
    if (!me.seen.includes('f' + fid)) { me.seen.push('f' + fid); addXp(25, 'tambah favorit'); }
  }

  /* Event film */
  $('#keyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = $('#keyIn').value.trim();
    if (!v) { toast('Tempel API key dulu.'); return; }
    const prev = me.tmdb, btn = $('#keyBtn');
    me.tmdb = v;
    btn.disabled = true; btn.textContent = 'Menguji...';
    try {
      await tmdb('/configuration');
      persist();
      $('#keyIn').value = '';
      mv.ready = false;
      toast('API key tersambung');
      showMovies();
    } catch (err) {
      me.tmdb = prev || '';
      toast(err.message === 'KEY' ? 'Key ditolak TMDB. Pastikan key benar.' : 'Tidak bisa terhubung ke TMDB. Cek internetmu.');
    } finally { btn.disabled = false; btn.textContent = 'Simpan dan tes'; }
  });
  $('#mvKeyReset').addEventListener('click', () => { me.tmdb = ''; persist(); mv.ready = false; showMovies(); });
  $('#mvForm').addEventListener('submit', (e) => { e.preventDefault(); mv.q = $('#mvQ').value.trim(); loadMovies(false); });
  $('#mvGenre').addEventListener('change', (e) => { mv.genre = e.target.value; loadMovies(false); });
  $('#mvSort').addEventListener('change', (e) => { mv.sort = e.target.value; loadMovies(false); });
  $('#mvYear').addEventListener('change', (e) => { mv.year = e.target.value; loadMovies(false); });
  $('#mvCats').addEventListener('click', (e) => {
    const c = e.target.closest('.chip');
    if (!c) return;
    mv.cat = c.dataset.cat; mv.q = ''; mv.genre = ''; mv.sort = ''; mv.year = '';
    $('#mvQ').value = ''; $('#mvGenre').value = ''; $('#mvSort').value = ''; $('#mvYear').value = '';
    loadMovies(false);
  });
  $('#mvMore').addEventListener('click', () => { mv.page += 1; loadMovies(true); });
  $('#mvState').addEventListener('click', (e) => { if (e.target.id === 'mvRetry') loadMovies(false); });
  $('#mvGrid').addEventListener('click', (e) => {
    const c = e.target.closest('.card');
    if (c && mv.list[+c.dataset.i]) openMovie(mv.list[+c.dataset.i].id);
  });
  $('#mvRandom').addEventListener('click', () => {
    if (!mv.list.length) { toast('Belum ada film yang dimuat.'); return; }
    openMovie(mv.list[Math.floor(Math.random() * mv.list.length)].id);
  });
  $('#mBody').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mact]');
    if (!b || !curM) return;
    const a = b.dataset.mact;
    if (a === 'trailer' && curM._yt) {
      $('#trailer').innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(curM._yt) + '?autoplay=1" title="Trailer" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
      b.hidden = true;
    }
    if (a === 'fav') { toggleFavMovie(curM); b.textContent = me.favs.some((f) => f.id === 'm' + curM.id) ? 'Hapus dari favorit' : 'Tambah favorit'; }
    if (a === 'sim') openMovie(b.dataset.id);
  });

  /* ---------- Aura, banner, dan efek latar ---------- */
  const AURAS = [
    { id: 'crimson', who: 'Penjaga Merah', name: 'Crimson Bulwark', tag: 'Perisai merah darah yang tak tertembus.', c: '#ff2a3d', c2: '#7a0010', fx: { horns: 1, bolts: 1 } },
    { id: 'emerald', who: 'Penjaga Hijau', name: 'Emerald Wraith', tag: 'Roh hijau secepat kilat yang menembus ilusi.', c: '#2dff7a', c2: '#075c2c', fx: { wings: 1 } },
    { id: 'azure', who: 'Penjaga Biru', name: 'Azure Tempest', tag: 'Petir dan baja biru dalam satu tebasan.', c: '#2f8bff', c2: '#0a2a7a', fx: { bolts: 1, wings: 1 } },
    { id: 'violet', who: 'Penguasa Ungu', name: 'Violet Sovereign', tag: 'Amarah ungu dari kekuatan paling purba.', c: '#9b5cff', c2: '#2b0f6b', fx: { halo: 1, bolts: 1, horns: 1 } },
    { id: 'ember', who: 'Roh Api', name: 'Ninefold Ember', tag: 'Sembilan ekor api, satu tekad.', c: '#ff8a1f', c2: '#7a2d00', fx: { tails: 9 } },
    { id: 'gold', who: 'Jubah Emas', name: 'Golden Mantle', tag: 'Selubung energi emas yang menyala penuh.', c: '#ffd23d', c2: '#7a5200', fx: { tails: 9, halo: 1 } },
    { id: 'prime', who: 'Cahaya Puncak', name: 'Prime Radiance', tag: 'Cahaya putih kebiruan di puncak kekuatan.', c: '#6fe9ff', c2: '#0b4a66', fx: { wings: 1, halo: 1, bolts: 1 } },
    { id: 'dusk', who: 'Raja Senja', name: 'Dusk Sovereign', tag: 'Ungu kelam dan merah bara, tak ada lawan.', c: '#d23cff', c2: '#5a0a6b', fx: { wings: 1, halo: 1, horns: 1, bolts: 1, tails: 5 } }
  ];
  const ADN = AURAS.length;
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

  function guardian(f) {
    f = f || {};
    let g = '<svg class="gd" viewBox="0 0 240 300" aria-hidden="true">';
    if (f.tails) {
      for (let i = 0; i < f.tails; i++) {
        const a = -74 + i * (148 / Math.max(1, f.tails - 1));
        g += '<g transform="rotate(' + a.toFixed(1) + ' 120 235)"><path class="tl" style="animation-delay:' + (-i * 0.35).toFixed(2) + 's" d="M120 235C106 180 134 140 120 62C142 138 142 182 134 235Z"/></g>';
      }
    }
    if (f.wings) g += '<path class="gb" d="M96 122C52 72 22 78 2 28C40 92 56 122 98 152Z"/><path class="gb" transform="translate(240 0) scale(-1 1)" d="M96 122C52 72 22 78 2 28C40 92 56 122 98 152Z"/>';
    if (f.halo) g += '<circle class="halo" cx="120" cy="72" r="66"/>';
    g += '<g class="fig"><path class="gb" d="M120 98L84 108L50 90L64 132L56 238H184L176 132L190 90L156 108Z"/>' +
      '<path class="gb" d="M50 90L26 64L70 84ZM190 90L214 64L170 84Z"/>' +
      '<path class="gb" d="M120 26L102 54L106 90H134L138 54Z"/>' +
      (f.horns ? '<path class="gb" d="M102 50L78 10L110 38ZM138 50L162 10L130 38Z"/>' : '<path class="gb" d="M102 50L84 24L110 40ZM138 50L156 24L130 40Z"/>') +
      '<path class="ln" d="M88 136H152M90 158H150M92 180H148M94 202H146"/>' +
      '<path class="eye" d="M108 66l9 3-9 4zM132 66l-9 3 9 4z"/>' +
      '<path class="gb blade" d="M117 100h6v178l-3 12-3-12z"/></g>';
    if (f.bolts) g += '<path class="bolt" d="M30 70l16 24-12 5 18 28M210 70l-16 24 12 5-18 28"/><path class="bolt" style="animation-delay:-.7s" d="M18 150l14 18-10 4 14 20M222 150l-14 18 10 4-14 20"/>';
    return g + '</svg>';
  }

  /* Partikel latar mengikuti warna aura */
  const fx = { c: $('#fx'), x: null, w: 0, h: 0, ps: [], col: [139, 92, 246], tgt: [139, 92, 246] };
  function fxResize() {
    const d = Math.min(window.devicePixelRatio || 1, 1.5);
    fx.w = window.innerWidth; fx.h = window.innerHeight;
    fx.c.width = fx.w * d; fx.c.height = fx.h * d;
    fx.x.setTransform(d, 0, 0, d, 0, 0);
  }
  function fxLoop() {
    requestAnimationFrame(fxLoop);
    if (document.hidden) return;
    const x = fx.x;
    x.clearRect(0, 0, fx.w, fx.h);
    for (let i = 0; i < 3; i++) fx.col[i] += (fx.tgt[i] - fx.col[i]) * 0.04;
    const col = fx.col.map(Math.round).join(',');
    x.globalCompositeOperation = 'lighter';
    fx.ps.forEach((p) => {
      p.t += p.w; p.y -= p.v; p.x += Math.sin(p.t) * 0.5;
      if (p.y < -12) { p.y = fx.h + 12; p.x = Math.random() * fx.w; }
      x.fillStyle = 'rgba(' + col + ',' + (p.a * (0.6 + 0.4 * Math.sin(p.t * 2))).toFixed(3) + ')';
      x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.2832); x.fill();
    });
  }
  function fxInit() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    fx.x = fx.c.getContext('2d');
    if (!fx.x) return;
    fxResize();
    window.addEventListener('resize', fxResize);
    const n = fx.w < 700 ? 45 : 90;
    for (let i = 0; i < n; i++) fx.ps.push({ x: Math.random() * fx.w, y: Math.random() * fx.h, r: 1 + Math.random() * 2.6, v: 0.25 + Math.random() * 0.9, w: 0.01 + Math.random() * 0.03, t: Math.random() * 6, a: 0.25 + Math.random() * 0.5 });
    fxLoop();
  }

  /* Banner */
  const adEl = $('#ad');
  let ai = 0, adTimer = null, adPause = false;
  const charHTML = (A) => (me.banners[A.id] ? '<img src="' + esc(me.banners[A.id]) + '" alt="' + esc(A.who) + '">' : guardian(A.fx));

  function buildAd() {
    const embers = (i) => Array.from({ length: 28 }, (_, k) => '<i style="--x:' + (((k * 37 + i * 11) % 96) + 2) + '%;--s:' + (3 + ((k * 5) % 6)) + 'px;--d:' + (4 + ((k * 7) % 5)) + 's;--l:-' + ((k * 13) % 7) + 's;--dx:' + (((k * 29) % 60) - 30) + 'px"></i>').join('');
    adEl.innerHTML = '<div class="ad-stage">' + AURAS.map((A, i) =>
      '<article class="slide" style="--a:' + A.c + ';--a2:' + A.c2 + '" aria-label="' + esc(A.name) + '">' +
      '<div class="flash"></div><div class="rays"></div><div class="rays r2"></div><div class="core"></div><div class="rings"><i></i><i></i><i></i></div><div class="streaks">'+'<i></i>'.repeat(10)+'</div><div class="embers">' + embers(i) + '</div>' +
      '<div class="txt"><span class="who">' + esc(A.who) + '</span><h3 class="bt">' + esc(A.name) + '</h3><p class="bs">' + esc(A.tag) + '</p>' +
      '<div class="bb"><button class="btn" type="button" data-ad="go">Mulai jelajah</button>' +
      '<label class="btn ghost fl">Ganti karakter<input type="file" accept="image/*" hidden data-adfile="' + A.id + '"></label>' +
      (me.banners[A.id] ? '<button class="btn ghost" type="button" data-ad="reset" data-id="' + A.id + '">Pakai siluet</button>' : '') + '</div></div>' +
      '<div class="char">' + charHTML(A) + '</div></article>').join('') + '</div>' +
      '<div class="ad-ctl"><button class="arr" type="button" data-ad="prev" aria-label="Sebelumnya">&#8249;</button><div class="dots">' +
      AURAS.map((A, i) => '<button class="dot" type="button" data-ad="dot" data-i="' + i + '" aria-label="' + esc(A.name) + '"></button>').join('') +
      '</div><button class="arr" type="button" data-ad="next" aria-label="Berikutnya">&#8250;</button></div>';
  }

  function setAd(i) {
    ai = (i + ADN) % ADN;
    $$('.slide', adEl).forEach((el, k) => el.classList.toggle('on', k === ai));
    $$('.dot', adEl).forEach((d, k) => { d.classList.toggle('on', k === ai); d.setAttribute('aria-current', k === ai ? 'true' : 'false'); });
    const A = AURAS[ai], rs = document.documentElement.style;
    rs.setProperty('--aura', A.c);
    rs.setProperty('--aura2', A.c2);
    fx.tgt = rgb(A.c);
  }
  function adStart() {
    clearInterval(adTimer);
    adTimer = setInterval(() => { if (!document.hidden && !adPause) setAd(ai + 1); }, 6500);
  }

  function adPhoto(id, f) {
    if (!f || !/^image\//.test(f.type)) { toast('Pilih file gambar.'); return; }
    const fr = new FileReader();
    fr.onerror = () => toast('File tidak bisa dibaca.');
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => toast('Gambar tidak bisa dibaca.');
      im.onload = () => {
        const sc = Math.min(1, 480 / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(im.width * sc));
        c.height = Math.max(1, Math.round(im.height * sc));
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        me.banners[id] = c.toDataURL('image/webp', 0.85);
        persist(); buildAd(); setAd(ai);
        toast('Karakter banner diganti');
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(f);
  }

  adEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ad]');
    if (!b) return;
    const a = b.dataset.ad;
    if (a === 'prev') setAd(ai - 1);
    else if (a === 'next') setAd(ai + 1);
    else if (a === 'dot') setAd(+b.dataset.i);
    else if (a === 'go') $('#listTitle').scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (a === 'reset') { delete me.banners[b.dataset.id]; persist(); buildAd(); setAd(ai); }
    adStart();
  });
  adEl.addEventListener('change', (e) => { const id = e.target.dataset && e.target.dataset.adfile; if (id) adPhoto(id, e.target.files[0]); });
  adEl.addEventListener('pointerenter', () => { adPause = true; });
  adEl.addEventListener('pointerleave', () => { adPause = false; });

  /* Karakter bayangan di latar, kursor bercahaya, dan tilt kartu */
  $('#ghosts').innerHTML = '<div class="gh l">' + guardian({ wings: 1, bolts: 1, horns: 1 }) + '</div><div class="gh r">' + guardian({ tails: 9, halo: 1 }) + '</div>';
  window.addEventListener('pointermove', (e) => { $('#cursor').style.transform = 'translate3d(' + (e.clientX - 190) + 'px,' + (e.clientY - 190) + 'px,0)'; });
  const tilt = (e) => {
    const c = e.target.closest('.card');
    if (!c || e.pointerType === 'touch') return;
    const r = c.getBoundingClientRect();
    c.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 14).toFixed(1) + 'deg');
    c.style.setProperty('--rx', ((-((e.clientY - r.top) / r.height - 0.5)) * 14).toFixed(1) + 'deg');
  };
  const untilt = (e) => { const c = e.target.closest && e.target.closest('.card'); if (c) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); } };
  ['#grid', '#mvGrid'].forEach((id) => { $(id).addEventListener('pointermove', tilt); $(id).addEventListener('pointerout', untilt); });

  buildAd();
  setAd(0);
  adStart();
  fxInit();

  /* ---------- Event ---------- */
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('.tab'); if (b) show(b.dataset.view); });
  $('#logo').addEventListener('click', (e) => { e.preventDefault(); show('explore'); });
  $('#chipMe').addEventListener('click', () => show('profile'));

  $('#searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    st.q = $('#q').value.trim();
    loadList();
  });
  $('#fType').addEventListener('change', (e) => { st.type = e.target.value; loadList(); });
  $('#fGenre').addEventListener('change', (e) => { st.genre = e.target.value; loadList(); });

  $('#grid').addEventListener('click', (e) => {
    const c = e.target.closest('.card');
    if (c && st.list[+c.dataset.i]) openDetail(st.list[+c.dataset.i]);
  });
  $('#state').addEventListener('click', (e) => { if (e.target.id === 'retry') loadList(); });

  $('#profile').addEventListener('click', (e) => {
    const f = e.target.closest('[data-fid]');
    if (f) {
      const fv = me.favs.find((x) => String(x.id) === f.dataset.fid);
      if (fv && fv.kind === 'movie') { openMovie(String(fv.id).slice(1)); return; }
      const mini = fv ? { mal_id: fv.id, title: fv.title, images: { jpg: { image_url: fv.img } }, streams: [] } : null;
      api('/anime/' + encodeURIComponent(f.dataset.fid))
        .then((j) => { if (j.data) openDetail(j.data); else if (mini) openDetail(mini); })
        .catch(() => { if (mini) openDetail(mini); else toast('Detail belum bisa dimuat.'); });
      return;
    }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'edit') openEdit();
    if (b.dataset.act === 'claim') {
      if (me.claim === new Date().toDateString()) return;
      me.claim = new Date().toDateString();
      addXp(100, 'bonus harian');
    }
  });
  $('#profile').addEventListener('input', (e) => { if (e.target.id === 'simR') drawSim(+e.target.value); });

  $('#mBody').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act],[data-th]');
    if (!b) return;
    if (b.dataset.th !== undefined && draft) {
      draft.theme = +b.dataset.th;
      $$('.sw').forEach((s) => s.classList.toggle('on', s === b));
      return;
    }
    const act = b.dataset.act;
    if (act === 'trailer' && cur && cur.trailer && cur.trailer.youtube_id) {
      $('#trailer').innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(cur.trailer.youtube_id) + '?autoplay=1" title="Trailer" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
      b.hidden = true;
    }
    if (act === 'fav' && cur) {
      toggleFav(cur);
      b.textContent = me.favs.some((f) => f.id === cur.mal_id) ? 'Hapus dari favorit' : 'Tambah favorit';
    }
    if (act === 'rmfoto' && draft) { draft.avatar = ''; $('#eavp').innerHTML = avatarHTML(96, ''); }
  });
  $('#mBody').addEventListener('change', (e) => { if (e.target.id === 'ef-file') readPhoto(e.target.files[0]); });
  $('#mBody').addEventListener('submit', (e) => { e.preventDefault(); if (e.target.id === 'ef' && draft) saveProfile(); });

  $('#mClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

  /* ---------- Mulai ---------- */
  renderChip();
  show('explore');
  loadList();
})();
