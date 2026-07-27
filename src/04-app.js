
<script>
/* ============================================================
   hey EU · Oberfläche
   ============================================================ */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const SPEICHER = 'heyeu_web_v1';
const sanft = matchMedia('(prefers-reduced-motion: reduce)').matches;

function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
function landVon(id) { return LAENDER.find(l => l.id === id); }
function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

/* ---------------- Zustand ---------------- */

const zustand = {
  ich: { name: '', land: 'de', alter: 16, tags: [], stift: 'blau', seed: 4711 },
  punkte: 0,
  gesehen: [],
  quizFertig: [],
  aufgaben: START_AUFGABEN.map(a => ({ ...a })),
  beitraege: [],
  rolle: 'schueler',
  lehrkraft: false
};

function sichern() {
  try {
    localStorage.setItem(SPEICHER, JSON.stringify({
      ich: zustand.ich, punkte: zustand.punkte, gesehen: zustand.gesehen,
      quizFertig: zustand.quizFertig, aufgaben: zustand.aufgaben, beitraege: zustand.beitraege
    }));
  } catch (e) {
    try {
      const ohneBild = { ...zustand, beitraege: zustand.beitraege.map(b => ({ ...b, bild: null })) };
      localStorage.setItem(SPEICHER, JSON.stringify(ohneBild));
    } catch (e2) { /* ohne Speicher weiterarbeiten */ }
  }
}
function laden() {
  try {
    const d = JSON.parse(localStorage.getItem(SPEICHER));
    if (!d) return;
    Object.assign(zustand.ich, d.ich || {});
    zustand.punkte = d.punkte || 0;
    zustand.gesehen = d.gesehen || [];
    zustand.quizFertig = d.quizFertig || [];
    zustand.beitraege = d.beitraege || [];
    if (Array.isArray(d.aufgaben) && d.aufgaben.length) zustand.aufgaben = d.aufgaben;
  } catch (e) { /* frisch anfangen */ }
}

let punkteTimer = 0;
function punkte(n, grund) {
  zustand.punkte += n;
  const el = $('#tally-pts');
  el.textContent = zustand.punkte;
  el.classList.add('bump');
  clearTimeout(punkteTimer);
  punkteTimer = setTimeout(() => el.classList.remove('bump'), 400);
  if (grund) melde(`${grund} · +${n} Punkte`);
  sichern();
}

let meldeTimer = 0;
function melde(text) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.remove('hidden', 'pop');
  void t.offsetWidth;
  t.classList.add('pop');
  clearTimeout(meldeTimer);
  meldeTimer = setTimeout(() => t.classList.add('hidden'), 3600);
}

/* ---------------- Wortfilter (aus dem Spiel) ---------------- */

function normalisiere(text) {
  let t = text.toLowerCase();
  t = t.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
  t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const leet = { '0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b','@':'a','$':'s','!':'i','€':'e' };
  t = t.replace(/[0134578@$!€]/g, ch => leet[ch] || ch);
  t = t.replace(/(.)\1{2,}/g, '$1$1');
  return t;
}
function istSauber(text) {
  const norm = normalisiere(text);
  const eng = norm.replace(/[^a-z]/g, '');
  const kurz = eng.replace(/(.)\1+/g, '$1');
  for (const b of BAD_SUBSTRINGS) if (eng.includes(b) || kurz.includes(b)) return false;
  for (const w of norm.split(/[^a-z]+/).filter(Boolean)) if (BAD_WORDS.includes(w)) return false;
  return true;
}
function pruefeName(name) {
  const t = name.trim();
  if (t.length < 2) return 'Mindestens zwei Zeichen.';
  if (!istSauber(t)) return 'Dieser Name geht hier nicht. Nimm bitte einen anderen.';
  const eng = normalisiere(t).replace(/[^a-z]/g, '');
  for (const b of BAD_NAMES) if (eng.includes(b)) return 'Dieser Name ist gesperrt. Nimm bitte einen anderen.';
  return null;
}

/* ============================================================
   Gezeichnete Rahmen
   ============================================================ */

function strichLinie(x1, y1, x2, y2, rnd, amp) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const segs = Math.max(2, Math.round(len / 46));
  const ox = (rnd() - 0.5) * 4, oy = (rnd() - 0.5) * 4;   // Überstand an den Ecken
  let d = `M${(x1 - ox).toFixed(1)} ${(y1 - oy).toFixed(1)}`;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const jx = i < segs ? (rnd() - 0.5) * amp : ox;
    const jy = i < segs ? (rnd() - 0.5) * amp : oy;
    d += ` L${(x1 + (x2 - x1) * t + jx).toFixed(1)} ${(y1 + (y2 - y1) * t + jy).toFixed(1)}`;
  }
  return d;
}

/* Inhalte wachsen und schrumpfen – der gezeichnete Rahmen muss mitgehen,
   sonst hängt er neben dem Kasten, dem er gehört. */
let rahmenWache = null;
function rahmenNachfuehren(el) {
  if (el.dataset.bewacht) return;
  el.dataset.bewacht = '1';
  if (!rahmenWache) {
    if (!('ResizeObserver' in window)) return;
    rahmenWache = new ResizeObserver(eintraege => {
      for (const e of eintraege) rahmen(e.target);
    });
  }
  rahmenWache.observe(el);
}

function rahmen(el) {
  const w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h) return;
  rahmenNachfuehren(el);
  let svg = el.querySelector(':scope > .frame');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'frame');
    svg.setAttribute('aria-hidden', 'true');
    el.prepend(svg);
  }
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const seed = (el.dataset.seed ||= String(Math.floor(Math.random() * 1e6)));
  const p = 3;
  let d = '';
  for (let pass = 0; pass < 2; pass++) {
    const rnd = mulberry(Number(seed) + pass * 977);
    const o = pass * 1.4;
    d += strichLinie(p + o, p, w - p, p + o, rnd, 2.4) +
         strichLinie(w - p, p + o, w - p - o, h - p, rnd, 2.4) +
         strichLinie(w - p - o, h - p, p, h - p - o, rnd, 2.4) +
         strichLinie(p, h - p - o, p + o, p, rnd, 2.4);
  }
  svg.innerHTML = `<path d="${d}"/>`;
}

function alleRahmen() { $$('.sketch').forEach(rahmen); }

/* Überschriften einkringeln */
function kringel() {
  $$('.head h2').forEach((h2, i) => {
    if (h2.querySelector('.circle')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'circle');
    svg.setAttribute('viewBox', '0 0 200 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('filter', 'url(#rough-hard)');
    const rnd = mulberry(2200 + i * 31);
    let d = 'M';
    const n = 26;
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * Math.PI * 2.12 - 0.4;
      const rx = 96 + (rnd() - 0.5) * 7, ry = 46 + (rnd() - 0.5) * 7;
      d += `${(100 + Math.cos(a) * rx).toFixed(1)} ${(50 + Math.sin(a) * ry).toFixed(1)} ${k === 0 ? 'L' : ''}`;
    }
    svg.innerHTML = `<path d="${d}"/>`;
    h2.appendChild(svg);
    const path = svg.querySelector('path');
    const len = path.getTotalLength();
    path.style.setProperty('--len', len);
  });
}

/* Wortmarke zeichnen lassen */
function wortmarke() {
  $$('#wordmark path').forEach((p, i) => {
    const len = p.getTotalLength();
    p.style.setProperty('--len', len);
    p.classList.add('draw');
    p.style.animationDelay = (i * 0.11) + 's';
  });
}

/* Karten neigen sich zum Zeiger */
function neigung() {
  $$('.tilt').forEach(el => {
    el.addEventListener('pointermove', e => {
      if (sanft) return;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${(-dy * 4).toFixed(2)}deg) rotateY(${(dx * 5).toFixed(2)}deg)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

/* ============================================================
   Porträts – gezeichnete Gesichter
   ============================================================ */

const HAARE = [
  'M22 40 C24 20, 76 18, 78 42 C74 30, 62 24, 50 24 C36 24, 26 30, 22 40',
  'M22 42 C20 18, 80 16, 78 44 C78 62, 74 70, 72 76 C74 54, 68 30, 50 30 C32 30, 26 52, 28 76 C26 66, 22 60, 22 42',
  'M20 42 C22 14, 78 16, 80 44 C74 34, 70 40, 62 32 C56 40, 44 40, 38 32 C32 40, 26 34, 20 42',
  'M24 38 C26 16, 74 16, 76 40 C68 34, 60 44, 50 38 C42 44, 32 34, 24 38 M24 38 C18 46, 20 58, 24 62',
  'M23 44 C20 22, 80 20, 77 46 C72 34, 64 28, 50 28 C36 28, 28 34, 23 44 M77 46 C84 54, 82 66, 78 72'
];
const MUENDER = ['M40 66 C46 72, 56 72, 62 65', 'M41 67 C47 70, 55 70, 60 67', 'M40 64 C46 74, 57 73, 62 63', 'M42 68 L60 66'];
const EXTRAS = [
  '',
  'M28 78 C38 84, 62 84, 72 78',                                    /* Kragen */
  'M30 50 h16 M54 50 h16 M46 51 c2 -2, 6 -2, 8 0',                   /* Brille */
  'M26 80 C36 74, 64 74, 74 80 M50 74 L50 84',                       /* Schal */
  'M64 30 C70 24, 78 26, 76 34'                                      /* Klammer im Haar */
];

function portraet(svg, seed, stiftHex) {
  const rnd = mulberry(seed);
  const haar = HAARE[Math.floor(rnd() * HAARE.length)];
  const mund = MUENDER[Math.floor(rnd() * MUENDER.length)];
  const extra = EXTRAS[Math.floor(rnd() * EXTRAS.length)];
  const kopfR = 27 + rnd() * 3;
  let kopf = 'M';
  for (let k = 0; k <= 22; k++) {
    const a = (k / 22) * Math.PI * 2;
    const r = kopfR + (rnd() - 0.5) * 2.4;
    kopf += `${(50 + Math.cos(a) * r * 0.92).toFixed(1)} ${(52 + Math.sin(a) * r).toFixed(1)} ${k === 0 ? 'L' : ''}`;
  }
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.innerHTML =
    `<g fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
       <path d="${kopf}Z"/>
       <path d="${haar}" stroke-width="2.3"/>
       <path d="M30 88 C34 76, 66 76, 70 88" stroke-width="2"/>
       <path d="${mund}" stroke-width="1.9"/>
       <g class="augen">
         <circle cx="39" cy="52" r="2.4" fill="currentColor" stroke="none"/>
         <circle cx="61" cy="52" r="2.4" fill="currentColor" stroke="none"/>
       </g>
       <path d="M33 44 C36 41, 43 41, 45 44" stroke-width="1.7"/>
       <path d="M55 44 C58 41, 65 41, 68 44" stroke-width="1.7"/>
       ${extra ? `<path d="${extra}" stroke="${stiftHex}" stroke-width="2.2"/>` : ''}
     </g>`;
}

/* Augen folgen dem Zeiger */
function blickfolge(svg) {
  const ziel = svg.querySelector('.augen');
  if (!ziel) return;
  const bewege = e => {
    if (sanft) return;
    const r = svg.getBoundingClientRect();
    const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width || 1) * 2));
    const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height || 1) * 2));
    ziel.setAttribute('transform', `translate(${(dx * 2.6).toFixed(2)} ${(dy * 2).toFixed(2)})`);
  };
  window.addEventListener('pointermove', bewege, { passive: true });
}

/* ============================================================
   01 · Profil
   ============================================================ */

function baueProfil() {
  const sel = $('#me-country');
  sel.innerHTML = LAENDER.map(l => `<option value="${l.id}">${l.flag} ${esc(l.name)}</option>`).join('');
  sel.value = zustand.ich.land;

  const tags = $('#me-tags');
  tags.innerHTML = INTERESSEN.map(t =>
    `<button class="chip" data-tag="${esc(t)}" aria-pressed="false">${esc(t)}</button>`).join('');

  const farben = $('#me-colors');
  farben.innerHTML = STIFTE.map(s =>
    `<button class="chip" data-stift="${s.id}" aria-pressed="false" style="border-color:${s.hex}">
       <span style="color:${s.hex}">●</span> ${s.name}</button>`).join('');

  $('#me-name').value = zustand.ich.name;
  $('#me-age').value = zustand.ich.alter;

  const namensfeld = $('#me-name');
  namensfeld.addEventListener('input', () => {
    const hinweis = $('#me-name-hint');
    const wert = namensfeld.value;
    if (!wert.trim()) { hinweis.textContent = ''; hinweis.className = 'hint'; }
    else {
      const problem = pruefeName(wert);
      hinweis.textContent = problem || 'Sieht gut aus.';
      hinweis.className = 'hint ' + (problem ? 'bad' : 'good');
    }
    zustand.ich.name = wert;
    zeigeProfil();
  });

  sel.addEventListener('change', () => { zustand.ich.land = sel.value; zeigeProfil(); });
  $('#me-age').addEventListener('input', e => { zustand.ich.alter = e.target.value; zeigeProfil(); });

  tags.addEventListener('click', e => {
    const b = e.target.closest('[data-tag]');
    if (!b) return;
    const t = b.dataset.tag;
    const i = zustand.ich.tags.indexOf(t);
    if (i >= 0) zustand.ich.tags.splice(i, 1);
    else if (zustand.ich.tags.length >= 4) { melde('Vier Interessen reichen — nimm erst eins weg.'); return; }
    else zustand.ich.tags.push(t);
    zeigeProfil();
  });

  farben.addEventListener('click', e => {
    const b = e.target.closest('[data-stift]');
    if (!b) return;
    zustand.ich.stift = b.dataset.stift;
    zeigeProfil();
  });

  $('#me-shuffle').addEventListener('click', () => {
    zustand.ich.seed = Math.floor(Math.random() * 1e6);
    zeigeProfil();
  });

  $('#me-save').addEventListener('click', () => {
    const problem = pruefeName(zustand.ich.name || '');
    if (problem) { $('#me-name-hint').textContent = problem; $('#me-name-hint').className = 'hint bad'; namensfeld.focus(); return; }
    sichern();
    melde('Profil übernommen. Du kannst jetzt schreiben und Beiträge einreichen.');
    baueLeute();
  });

  blickfolge($('#me-portrait'));
  zeigeProfil();
}

function stiftHex() { return (STIFTE.find(s => s.id === zustand.ich.stift) || STIFTE[0]).hex; }

function zeigeProfil() {
  const l = landVon(zustand.ich.land);
  $('#me-shown-name').textContent = zustand.ich.name.trim() || 'Noch kein Name';
  $('#me-shown-where').textContent = `${l.flag} ${l.name} · ${zustand.ich.alter} Jahre`;
  $('#me-shown-tags').textContent = zustand.ich.tags.length
    ? zustand.ich.tags.join(' · ')
    : 'Wähle ein paar Interessen aus.';
  $$('#me-tags [data-tag]').forEach(b =>
    b.setAttribute('aria-pressed', zustand.ich.tags.includes(b.dataset.tag) ? 'true' : 'false'));
  $$('#me-colors [data-stift]').forEach(b =>
    b.setAttribute('aria-pressed', b.dataset.stift === zustand.ich.stift ? 'true' : 'false'));
  portraet($('#me-portrait'), zustand.ich.seed, stiftHex());
  sichern();
}

/* ============================================================
   02 · Die Karte
   ============================================================ */

const Karte = {
  spalten: 0, zeilen: 0, zelle: 12, groesse: {},
  raster: [],            // [y][x] = null | Länder-id | '_'
  mitten: {},            // id -> {x,y}
  pfade: {},             // id -> Path2D
  basis: null,
  aktiv: null,           // Land unter dem Zeiger
  figur: { x: 0, y: 0 },
  route: null,
  animation: 0,

  bauen() {
    const rohZeilen = EUROPE_MAP.length;
    const rohSpalten = Math.max(...EUROPE_MAP.map(r => r.length));

    // Erst das volle Raster lesen …
    const voll = [];
    for (let y = 0; y < rohZeilen; y++) {
      const zeile = [];
      const roh = EUROPE_MAP[y];
      for (let x = 0; x < rohSpalten; x++) {
        const z = roh[x] || '.';
        zeile.push(z === '.' ? null : (z === '_' ? '_' : (MAP_CHARS[z] || '_')));
      }
      voll.push(zeile);
    }

    // … dann auf das tatsächlich bespielte Gebiet zuschneiden,
    // damit die Karte den Rahmen ausfüllt statt in leerem Meer zu schwimmen.
    let minX = rohSpalten, maxX = 0, minY = rohZeilen, maxY = 0;
    for (let y = 0; y < rohZeilen; y++) for (let x = 0; x < rohSpalten; x++) {
      if (!voll[y][x]) continue;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const rand = 2;
    minX = Math.max(0, minX - rand); minY = Math.max(0, minY - rand);
    maxX = Math.min(rohSpalten - 1, maxX + rand); maxY = Math.min(rohZeilen - 1, maxY + rand);

    this.spalten = maxX - minX + 1;
    this.zeilen = maxY - minY + 1;
    this.raster = [];
    const summen = {};
    for (let y = 0; y < this.zeilen; y++) {
      const zeile = [];
      for (let x = 0; x < this.spalten; x++) {
        const id = voll[y + minY][x + minX];
        zeile.push(id);
        if (id && id !== '_') {
          (summen[id] ||= { x: 0, y: 0, n: 0 });
          summen[id].x += x; summen[id].y += y; summen[id].n++;
        }
      }
      this.raster.push(zeile);
    }
    this.groesse = {};
    for (const id in summen) this.groesse[id] = summen[id].n;
    // Landesmitte: die Landzelle, die dem Schwerpunkt am nächsten liegt
    for (const l of LAENDER) {
      const s = summen[l.id];
      if (!s) continue;
      const cx = s.x / s.n, cy = s.y / s.n;
      let best = null, bd = Infinity;
      for (let y = 0; y < this.zeilen; y++) for (let x = 0; x < this.spalten; x++) {
        if (this.raster[y][x] !== l.id) continue;
        const d = (x - cx) ** 2 + (y - cy) ** 2;
        if (d < bd) { bd = d; best = { x, y }; }
      }
      this.mitten[l.id] = best;
      const p = new Path2D();
      for (let y = 0; y < this.zeilen; y++) for (let x = 0; x < this.spalten; x++) {
        if (this.raster[y][x] === l.id) p.rect(x * this.zelle, y * this.zelle, this.zelle, this.zelle);
      }
      this.pfade[l.id] = p;
    }
    const start = this.mitten[zustand.ich.land] || this.mitten.de;
    this.figur = { x: start.x, y: start.y };
  },

  istLand(x, y) {
    if (x < 0 || y < 0 || x >= this.spalten || y >= this.zeilen) return false;
    return this.raster[y][x] !== null;
  },

  basisZeichnen() {
    const b = document.createElement('canvas');
    b.width = this.spalten * this.zelle;
    b.height = this.zeilen * this.zelle;
    const c = b.getContext('2d');
    const tinte = css('--ink'), papier2 = css('--paper-2'), leise = css('--ink-faint');
    const dunkel = document.documentElement.dataset.theme === 'dark' ||
      (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);

    // Landflächen als leichte Lasur in der Farbe des Landes
    for (let y = 0; y < this.zeilen; y++) for (let x = 0; x < this.spalten; x++) {
      const id = this.raster[y][x];
      if (!id) continue;
      const l = id === '_' ? null : landVon(id);
      c.fillStyle = l
        ? (dunkel ? `hsl(${l.hue} 30% 26% / .55)` : `hsl(${l.hue} 42% 88% / .55)`)
        : (dunkel ? 'hsl(210 8% 30% / .35)' : 'hsl(210 12% 88% / .5)');
      c.fillRect(x * this.zelle, y * this.zelle, this.zelle, this.zelle);
    }

    // Landesgrenzen: feine gestrichelte Linien
    c.strokeStyle = leise; c.lineWidth = 0.8; c.setLineDash([3, 3]);
    c.beginPath();
    for (let y = 0; y < this.zeilen; y++) for (let x = 0; x < this.spalten; x++) {
      const id = this.raster[y][x];
      if (!id) continue;
      const px = x * this.zelle, py = y * this.zelle;
      if (this.istLand(x + 1, y) && this.raster[y][x + 1] !== id) { c.moveTo(px + this.zelle, py); c.lineTo(px + this.zelle, py + this.zelle); }
      if (this.istLand(x, y + 1) && this.raster[y + 1][x] !== id) { c.moveTo(px, py + this.zelle); c.lineTo(px + this.zelle, py + this.zelle); }
    }
    c.stroke();
    c.setLineDash([]);

    // Küstenlinie: mit leichtem Zittern gezeichnet
    const rnd = mulberry(90210);
    const w = (a, b) => a + (rnd() - 0.5) * b;
    c.strokeStyle = tinte; c.lineWidth = 1.5; c.lineCap = 'round';
    c.beginPath();
    for (let y = 0; y < this.zeilen; y++) for (let x = 0; x < this.spalten; x++) {
      if (!this.istLand(x, y)) continue;
      const px = x * this.zelle, py = y * this.zelle, s = this.zelle;
      if (!this.istLand(x, y - 1)) { c.moveTo(w(px, 1.6), w(py, 1.6)); c.lineTo(w(px + s, 1.6), w(py, 1.6)); }
      if (!this.istLand(x, y + 1)) { c.moveTo(w(px, 1.6), w(py + s, 1.6)); c.lineTo(w(px + s, 1.6), w(py + s, 1.6)); }
      if (!this.istLand(x - 1, y)) { c.moveTo(w(px, 1.6), w(py, 1.6)); c.lineTo(w(px, 1.6), w(py + s, 1.6)); }
      if (!this.istLand(x + 1, y)) { c.moveTo(w(px + s, 1.6), w(py, 1.6)); c.lineTo(w(px + s, 1.6), w(py + s, 1.6)); }
    }
    c.stroke();

    // Fährlinien zwischen den Inseln
    c.strokeStyle = leise; c.lineWidth = 1; c.setLineDash([2, 5]);
    c.beginPath();
    for (const [a, bId] of FAEHREN) {
      const p = this.mitten[a], q = this.mitten[bId];
      if (!p || !q) continue;
      c.moveTo(p.x * this.zelle + 5, p.y * this.zelle + 5);
      c.lineTo(q.x * this.zelle + 5, q.y * this.zelle + 5);
    }
    c.stroke();
    c.setLineDash([]);

    this.basis = b;
  },

  zeichnen() {
    const cv = $('#map');
    const c = cv.getContext('2d');
    const tinte = css('--ink'), stift = css('--pen'), leise = css('--ink-faint'), rot = css('--red');
    c.clearRect(0, 0, cv.width, cv.height);
    if (this.basis) c.drawImage(this.basis, 0, 0);

    // Schraffur des Landes unter dem Zeiger
    if (this.aktiv && this.pfade[this.aktiv]) {
      c.save();
      c.clip(this.pfade[this.aktiv]);
      c.fillStyle = stift; c.globalAlpha = 0.12;
      c.fillRect(0, 0, cv.width, cv.height);
      c.globalAlpha = 0.6;
      c.strokeStyle = stift; c.lineWidth = 1.3;
      c.beginPath();
      for (let i = -cv.height; i < cv.width; i += 7) { c.moveTo(i, 0); c.lineTo(i + cv.height, cv.height); }
      c.stroke();
      c.restore();
    }

    // Wahrzeichen und Namen
    c.textAlign = 'center';
    for (const l of LAENDER) {
      const m = this.mitten[l.id];
      if (!m) continue;
      const px = m.x * this.zelle + this.zelle / 2, py = m.y * this.zelle + this.zelle / 2;
      const dran = this.aktiv === l.id;
      const dort = zustand.gesehen.includes(l.id);
      c.strokeStyle = dort ? css('--green') : tinte;
      c.fillStyle = dort ? css('--green') : tinte;
      c.lineWidth = 1.4;
      c.beginPath(); c.arc(px, py, dran ? 5.5 : 4, 0, Math.PI * 2); c.stroke();
      if (dort) { c.beginPath(); c.arc(px, py, 2, 0, Math.PI * 2); c.fill(); }
      // In dicht bebauten Ecken würden alle Namen übereinanderliegen –
      // kleine Länder beschriften sich erst, wenn man sie anfährt.
      const grossGenug = (this.groesse[l.id] || 0) >= 55;
      if (!dran && !dort && !grossGenug) continue;
      c.font = `${dran ? '700 ' : ''}11px ui-monospace, monospace`;
      c.fillStyle = dran ? tinte : leise;
      c.fillText(l.name.toUpperCase(), px, py - 9);
      if (dran) {
        c.font = '10px ui-monospace, monospace';
        c.fillStyle = stift;
        c.fillText(l.wz, px, py + 18);
      }
    }

    // Gelaufene Strecke
    if (this.route) {
      c.strokeStyle = rot; c.lineWidth = 1.6; c.setLineDash([4, 4]); c.globalAlpha = 0.8;
      c.beginPath();
      c.moveTo(this.route.von.x * this.zelle + 5, this.route.von.y * this.zelle + 5);
      c.lineTo(this.figur.x * this.zelle + 5, this.figur.y * this.zelle + 5);
      c.stroke();
      c.setLineDash([]); c.globalAlpha = 1;
    }

    // Die eigene Figur – ein Strichmännchen
    const fx = this.figur.x * this.zelle + 5, fy = this.figur.y * this.zelle + 5;
    c.strokeStyle = stiftHex(); c.fillStyle = stiftHex(); c.lineWidth = 1.8; c.lineCap = 'round';
    c.beginPath();
    c.arc(fx, fy - 8, 3, 0, Math.PI * 2); c.stroke();
    c.beginPath();
    c.moveTo(fx, fy - 5); c.lineTo(fx, fy + 2);
    c.moveTo(fx - 4, fy - 2); c.lineTo(fx + 4, fy - 2);
    c.moveTo(fx, fy + 2); c.lineTo(fx - 3.5, fy + 7);
    c.moveTo(fx, fy + 2); c.lineTo(fx + 3.5, fy + 7);
    c.stroke();
  },

  zelleAus(e) {
    const cv = $('#map');
    const r = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / r.width * this.spalten);
    const y = Math.floor((e.clientY - r.top) / r.height * this.zeilen);
    return { x, y };
  },

  gehZu(x, y) {
    if (!this.istLand(x, y)) return;
    this.route = { von: { ...this.figur } };
    const von = { ...this.figur }, ziel = { x, y };
    const start = performance.now(), dauer = sanft ? 1 : 520;
    cancelAnimationFrame(this.animation);
    const schritt = t => {
      const p = Math.min(1, (t - start) / dauer);
      const e = 1 - Math.pow(1 - p, 3);
      this.figur.x = von.x + (ziel.x - von.x) * e;
      this.figur.y = von.y + (ziel.y - von.y) * e;
      this.zeichnen();
      if (p < 1) this.animation = requestAnimationFrame(schritt);
      else { this.figur = ziel; this.route = null; this.zeichnen(); this.angekommen(); }
    };
    this.animation = requestAnimationFrame(schritt);
  },

  angekommen() {
    const id = this.raster[Math.round(this.figur.y)]?.[Math.round(this.figur.x)];
    $('#map-coords').textContent = `X ${Math.round(this.figur.x)} · Y ${Math.round(this.figur.y)}`;
    if (!id || id === '_') { $('#map-where').textContent = 'Zwischen den Ländern'; return; }
    const l = landVon(id);
    $('#map-where').textContent = `${l.flag} ${l.name}`;
    const m = this.mitten[id];
    const nah = Math.abs(this.figur.x - m.x) <= 3 && Math.abs(this.figur.y - m.y) <= 3;
    if (nah && !zustand.gesehen.includes(id)) {
      zustand.gesehen.push(id);
      punkte(2, `${l.wz} erreicht`);
      zeigeFortschritt();
      this.zeichnen();
    }
    zeigeSteckbrief(id);
  }
};

function zeigeFortschritt() {
  $('#seen-count').textContent = zustand.gesehen.length;
  $('#seen-list').textContent = zustand.gesehen.length
    ? zustand.gesehen.map(id => landVon(id).flag + ' ' + landVon(id).name).join(' · ')
    : 'Noch keins.';
}

function zeigeSteckbrief(id) {
  const l = landVon(id);
  const d = $('#dossier');
  const gemacht = zustand.quizFertig.includes(id);
  d.innerHTML = `
    <div class="flagline"><span class="fl">${l.flag}</span><h3>${esc(l.name)}</h3></div>
    <dl>
      <dt>Hauptstadt</dt><dd>${esc(l.hauptstadt)}</dd>
      <dt>Wahrzeichen</dt><dd>${esc(l.wz)}</dd>
      <dt>Dazu</dt><dd>${esc(l.wzInfo)}</dd>
      <dt>Gut zu wissen</dt><dd>${esc(l.fakt)}</dd>
      <dt>Vor Ort</dt><dd><button class="btn small ghost" data-schreib="${l.id}">${esc(l.person.name)}, ${l.person.alter} — schreiben</button></dd>
    </dl>
    <div class="quiz" style="margin-top:1rem">
      <p class="note">Frage dazu</p>
      <p style="margin:.35rem 0 .6rem"><b>${esc(l.quiz.f)}</b></p>
      <div class="row" id="quiz-antworten"></div>
      <p class="hint" id="quiz-hint">${gemacht ? 'Schon beantwortet.' : ''}</p>
    </div>`;
  rahmen(d);

  const box = $('#quiz-antworten');
  const antworten = [l.quiz.r, ...l.quiz.w].map(v => ({ v, s: Math.random() })).sort((a, b) => a.s - b.s);
  let versuch = 0;
  antworten.forEach(({ v }) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = v;
    b.disabled = gemacht;
    b.addEventListener('click', () => {
      if (v === l.quiz.r) {
        b.style.borderColor = css('--green'); b.style.color = css('--green');
        $$('#quiz-antworten .chip').forEach(x => x.disabled = true);
        if (!zustand.quizFertig.includes(id)) {
          zustand.quizFertig.push(id);
          punkte(versuch === 0 ? 3 : 1, 'Frage richtig beantwortet');
        }
        $('#quiz-hint').textContent = versuch === 0 ? 'Richtig, auf Anhieb.' : 'Richtig.';
        $('#quiz-hint').className = 'hint good';
      } else {
        versuch++;
        b.disabled = true;
        b.style.opacity = '.4';
        $('#quiz-hint').textContent = 'Nicht ganz. Versuch es nochmal.';
        $('#quiz-hint').className = 'hint bad';
      }
    });
    box.appendChild(b);
  });

  const schreib = d.querySelector('[data-schreib]');
  if (schreib) schreib.addEventListener('click', () => {
    oeffneGespraech('person:' + l.id);
    $('#leute').scrollIntoView({ behavior: sanft ? 'auto' : 'smooth', block: 'start' });
  });
}

function baueKarte() {
  const cv = $('#map');
  Karte.bauen();
  cv.width = Karte.spalten * Karte.zelle;
  cv.height = Karte.zeilen * Karte.zelle;
  Karte.basisZeichnen();
  Karte.zeichnen();
  zeigeFortschritt();
  zeigeSteckbrief(zustand.ich.land);

  const tip = $('#map-tip');
  cv.addEventListener('pointermove', e => {
    const { x, y } = Karte.zelleAus(e);
    $('#map-coords').textContent = `X ${x} · Y ${y}`;
    const id = Karte.raster[y]?.[x];
    const land = id && id !== '_' ? id : null;
    if (land !== Karte.aktiv) {
      Karte.aktiv = land;
      Karte.zeichnen();
    }
    if (land) {
      const l = landVon(land);
      const r = cv.getBoundingClientRect();
      tip.innerHTML = `${l.flag} ${esc(l.name)}<em>${esc(l.person.name)} · ${esc(l.wz)}</em>`;
      tip.style.left = (e.clientX - r.left) + 'px';
      tip.style.top = (e.clientY - r.top) + 'px';
      tip.classList.remove('hidden');
    } else tip.classList.add('hidden');
  });
  cv.addEventListener('pointerleave', () => {
    tip.classList.add('hidden');
    if (Karte.aktiv) { Karte.aktiv = null; Karte.zeichnen(); }
  });
  cv.addEventListener('click', e => {
    const { x, y } = Karte.zelleAus(e);
    cv.focus();
    Karte.gehZu(x, y);
  });
  cv.addEventListener('keydown', e => {
    const schritte = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
                       w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
    const s = schritte[e.key];
    if (!s) return;
    e.preventDefault();
    const nx = Math.round(Karte.figur.x) + s[0], ny = Math.round(Karte.figur.y) + s[1];
    if (!Karte.istLand(nx, ny)) return;
    Karte.figur = { x: nx, y: ny };
    Karte.zeichnen();
    Karte.angekommen();
  });

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    Karte.basisZeichnen(); Karte.zeichnen();
  });
}

/* ============================================================
   03 · Leute treffen
   ============================================================ */

function alleLeute() {
  const liste = LAENDER.map(l => ({
    schluessel: 'person:' + l.id,
    art: 'schueler',
    name: l.person.name,
    ort: l.person.ort,
    land: l.id,
    zusatz: `${l.person.alter} Jahre`,
    kurz: l.person.kurz,
    tags: l.person.tags
  }));
  LEHRKRAEFTE.forEach((t, i) => liste.push({
    schluessel: 'lehr:' + i,
    art: 'lehr',
    name: t.name,
    ort: t.ort,
    land: t.land,
    zusatz: t.fach,
    kurz: t.kurz,
    tags: []
  }));
  return liste;
}

let filterArt = 'alle';

function baueLeute() {
  const box = $('#people');
  const leute = alleLeute().filter(p => filterArt === 'alle' || p.art === filterArt);
  box.innerHTML = '';
  leute.forEach((p, i) => {
    const l = landVon(p.land);
    // Bewusst kein <button>: dessen Innenlayout bricht im Raster aus dem
    // gezeichneten Rahmen aus.
    const el = document.createElement('div');
    el.className = 'person sketch';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.dataset.wer = p.schluessel;
    el.innerHTML =
      `<svg class="por" viewBox="0 0 100 100" style="color:var(--ink)"></svg>
       <span class="name">${esc(p.name)}</span>
       <span class="where">${l.flag} ${esc(p.ort)}</span>
       <span class="say"><b>${esc(p.zusatz)}</b>${p.tags.length ? ' · ' + esc(p.tags.join(', ')) : ''}<br>${esc(p.kurz)}</span>
       ${p.art === 'lehr' ? '<span class="tag">Lehrkraft</span>' : ''}`;
    box.appendChild(el);
    portraet(el.querySelector('svg'), 8000 + i * 137 + p.name.length * 13, STIFTE[i % STIFTE.length].hex);
    rahmen(el);
  });
  box.querySelectorAll('.person').forEach(el => {
    el.addEventListener('click', () => oeffneGespraech(el.dataset.wer));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); oeffneGespraech(el.dataset.wer); }
    });
  });
}

const Gespraech = { wer: null, daten: null };

function oeffneGespraech(schluessel) {
  const p = alleLeute().find(x => x.schluessel === schluessel);
  if (!p) return;
  Gespraech.wer = schluessel;
  Gespraech.daten = p;
  const l = landVon(p.land);
  $('#talk-name').textContent = p.name;
  $('#talk-where').textContent = `${l.flag} ${l.name} · ${p.zusatz}`;
  portraet($('#talk-face'), 8000 + alleLeute().findIndex(x => x.schluessel === schluessel) * 137 + p.name.length * 13, stiftHex());
  $('#talk-log').innerHTML = '';
  $('#talk-input').disabled = false;
  $('#talk-send').disabled = false;
  $$('.person').forEach(el => el.classList.toggle('open', el.dataset.wer === schluessel));

  sage('sys', 'Jedes Gespräch beginnt mit „hey EU“');
  sage('me', 'hey EU!');
  if (p.art === 'lehr') {
    const t = LEHRKRAEFTE[Number(schluessel.split(':')[1])];
    antworte(t.hallo);
    schnellantworten([
      ['Welche Aufgaben gibt es?', () => antworte(aufgabenText())],
      ['Wie läuft die Prüfung ab?', () => antworte('Du reichst ein, ich lese es und gebe es frei oder schicke es mit einer Notiz zurück. Bis dahin sieht es niemand außer mir.')],
      ['Wer sieht meine Beiträge?', () => antworte('Vor der Freigabe nur die Lehrkräfte. Danach alle, die hier angemeldet sind — dein Klarname steht nirgends, nur dein Anzeigename.')],
      ['Danke, bis dann', beenden]
    ]);
  } else {
    const anrede = zustand.ich.name.trim() ? `, ${zustand.ich.name.trim()}` : '';
    antworte(`hey EU! Ich bin ${p.name} aus ${p.ort}. Schön, dass du schreibst${anrede}.`);
    schuelerAntworten();
  }
}

function schuelerAntworten() {
  schnellantworten([
    ['Wie ist es bei euch?', () => antwortThema('land')],
    ['Wie läuft eure Schule?', () => antwortThema('alltag')],
    ['Was machst du sonst?', () => antwortThema('freizeit')],
    ['Was esst ihr?', () => antwortThema('essen')],
    ['Bis dann', beenden]
  ]);
}

function antwortThema(thema) {
  const p = Gespraech.daten;
  const l = landVon(p.land);
  const fragen = { land: 'Wie ist es bei euch?', alltag: 'Wie läuft eure Schule?',
                   freizeit: 'Was machst du sonst?', essen: 'Was esst ihr?' };
  sage('me', fragen[thema]);
  antworte(l.person[thema]);
  schuelerAntworten();
}

function beenden() {
  sage('me', 'Bis dann');
  const abschied = ['Bis bald! Schreib wieder, wenn du in der Nähe bist.',
                    'Ciao. Und schau dir die Aufgaben an, da ist gerade was Gutes dabei.',
                    'Tschüss! Grüß die anderen von mir.'];
  antworte(abschied[Math.floor(Math.random() * abschied.length)]);
  schnellantworten([]);
}

function aufgabenText() {
  const offen = zustand.aufgaben.filter(a => !zustand.beitraege.some(b => b.aufgabe === a.id && b.status !== 'abgelehnt'));
  if (!offen.length) return 'Du hast zu allem schon etwas eingereicht. Respekt — dann warte kurz auf die Freigaben.';
  return `Gerade offen: ${offen.slice(0, 3).map(a => '„' + a.titel + '“').join(', ')}. Insgesamt sind es ${offen.length}.`;
}

function sage(wer, text) {
  const log = $('#talk-log');
  const p = document.createElement('p');
  p.className = 'said ' + wer;
  p.textContent = text;
  log.appendChild(p);
  log.scrollTop = log.scrollHeight;
  return p;
}

function antworte(text) {
  const log = $('#talk-log');
  const tippt = document.createElement('p');
  tippt.className = 'said them typing';
  tippt.textContent = '···';
  log.appendChild(tippt);
  log.scrollTop = log.scrollHeight;
  setTimeout(() => {
    tippt.remove();
    sage('them', text);
  }, sanft ? 10 : 400 + Math.min(text.length * 7, 900));
}

function schnellantworten(paare) {
  const box = $('#talk-quick');
  box.innerHTML = '';
  paare.forEach(([label, fn]) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = label;
    b.addEventListener('click', fn);
    box.appendChild(b);
  });
}

function freierText(text) {
  const p = Gespraech.daten;
  const l = landVon(p.land);
  const t = text.toLowerCase();
  if (p.art === 'lehr') {
    if (/aufgab|task|einreich/.test(t)) return aufgabenText();
    if (/pr(ü|u)f|freigab|admin/.test(t)) return 'Ich lese alles selbst. Freigabe oder Rückfrage kommt meist am selben Tag.';
    if (/tsch(ü|u)ss|bye|danke/.test(t)) return 'Gern. Melde dich, wenn etwas hakt.';
    return 'Gute Frage. Schreib sie ruhig ausführlicher auf, dann kann ich sie im Unterricht aufgreifen.';
  }
  if (/tsch(ü|u)ss|bye|ciao|bis dann/.test(t)) return 'Bis bald! War gut, mit dir zu schreiben.';
  if (/ess|koch|gericht|food|hunger/.test(t)) return l.person.essen;
  if (/schule|unterricht|noten|abi|pr(ü|u)fung|lernen/.test(t)) return l.person.alltag;
  if (/freizeit|hobby|sport|musik|machst du/.test(t)) return l.person.freizeit;
  if (/land|stadt|wohnst|zuhause|bei euch/.test(t)) return l.person.land;
  if (/hallo|hi|hey|moin|servus/.test(t)) return `hey EU! Alles gut bei dir?`;
  if (/wie alt|alter/.test(t)) return `Ich bin ${l.person.alter}. Und du?`;
  if (t.includes('?')) return l.person.land;
  const smalltalk = [
    'Warst du schon in anderen Ländern auf der Karte unterwegs?',
    'Bei uns reden gerade alle über die Aufgabe mit dem Schulweg. Hast du die schon?',
    'Ich versuche, ein paar Wörter in anderen Sprachen zu lernen. Sag mir eins aus deiner.',
    'Erzähl mal was von dir — ich schreibe hier sonst nur über mich.'
  ];
  return smalltalk[Math.floor(Math.random() * smalltalk.length)];
}

function baueGespraech() {
  $('#talk-form').addEventListener('submit', e => {
    e.preventDefault();
    const feld = $('#talk-input');
    const text = feld.value.trim();
    if (!text || !Gespraech.daten) return;
    const hinweis = $('#talk-hint');
    if (!istSauber(text)) {
      hinweis.textContent = 'Diese Nachricht wurde vom Filter gestoppt. Formulier sie bitte anders.';
      hinweis.className = 'hint bad';
      return;
    }
    hinweis.textContent = '';
    hinweis.className = 'hint';
    sage('me', text);
    feld.value = '';
    antworte(freierText(text));
  });

  $$('[data-filter]').forEach(b => b.addEventListener('click', () => {
    filterArt = b.dataset.filter;
    $$('[data-filter]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    baueLeute();
  }));
}

/* ============================================================
   04 · Aufgaben
   ============================================================ */

let offeneAufgabe = null;
let angehaengtesBild = null;

function beitragZu(aufgabeId) {
  return zustand.beitraege.find(b => b.aufgabe === aufgabeId && b.status !== 'abgelehnt');
}

function baueAufgaben() {
  const box = $('#tasks');
  box.innerHTML = '';
  const sichtbar = zustand.aufgaben.filter(a => !a.land || a.land === zustand.ich.land);
  $('#tasks-count').textContent =
    `${sichtbar.length} Aufgaben für dich · ${zustand.aufgaben.length} insgesamt eingestellt`;

  sichtbar.forEach(a => {
    const b = beitragZu(a.id);
    const el = document.createElement('article');
    el.className = 'sticky';
    const stand = b
      ? (b.status === 'wartet'
        ? '<span class="badge wait">in Prüfung</span>'
        : '<span class="badge ok">freigegeben</span>')
      : '';
    el.innerHTML =
      `<span class="pin"></span>
       <h4>${esc(a.titel)}</h4>
       <p>${esc(a.text)}</p>
       <div class="foot">
         <span class="badge">${a.punkte} Punkte</span>
         ${a.land ? `<span class="badge">${landVon(a.land).flag} ${esc(landVon(a.land).name)}</span>` : ''}
         ${stand}
       </div>
       <span class="by">eingestellt von ${esc(a.von)}</span>`;
    if (!b) {
      const btn = document.createElement('button');
      btn.className = 'btn small pen';
      btn.textContent = 'Bearbeiten';
      btn.addEventListener('click', () => oeffneEinreichen(a));
      el.querySelector('.foot').appendChild(btn);
    }
    if (zustand.lehrkraft) {
      const del = document.createElement('button');
      del.className = 'btn small ghost';
      del.textContent = 'Zurückziehen';
      del.addEventListener('click', () => {
        zustand.aufgaben = zustand.aufgaben.filter(x => x.id !== a.id);
        sichern(); baueAufgaben();
        melde('Aufgabe zurückgezogen.');
      });
      el.querySelector('.foot').appendChild(del);
    }
    box.appendChild(el);
  });

  zeigeVeroeffentlicht();
  zeigePruefung();
}

function oeffneEinreichen(a) {
  if (!zustand.ich.name.trim()) {
    melde('Leg zuerst oben dein Profil an — sonst weiß niemand, von wem der Beitrag ist.');
    $('#profil').scrollIntoView({ behavior: sanft ? 'auto' : 'smooth' });
    return;
  }
  offeneAufgabe = a;
  angehaengtesBild = null;
  $('#submit-title').textContent = a.titel;
  $('#submit-desc').textContent = a.text;
  $('#submit-text').value = '';
  $('#submit-hint').textContent = '';
  $('#sub-preview').classList.add('hidden');
  $('#submit-photo').value = '';
  const karte = $('#submit-card');
  karte.classList.remove('hidden');
  rahmen(karte);
  karte.scrollIntoView({ behavior: sanft ? 'auto' : 'smooth', block: 'center' });
  $('#submit-text').focus();
}

function baueEinreichen() {
  $('#submit-cancel').addEventListener('click', () => $('#submit-card').classList.add('hidden'));

  $('#submit-photo').addEventListener('change', e => {
    const datei = e.target.files && e.target.files[0];
    if (!datei) return;
    const leser = new FileReader();
    leser.onload = () => {
      const bild = new Image();
      bild.onload = () => {
        const max = 520;
        const f = Math.min(1, max / Math.max(bild.width, bild.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(bild.width * f);
        cv.height = Math.round(bild.height * f);
        cv.getContext('2d').drawImage(bild, 0, 0, cv.width, cv.height);
        angehaengtesBild = cv.toDataURL('image/jpeg', 0.72);
        const v = $('#sub-preview');
        v.src = angehaengtesBild;
        v.classList.remove('hidden');
      };
      bild.src = leser.result;
    };
    leser.readAsDataURL(datei);
  });

  $('#submit-send').addEventListener('click', () => {
    const text = $('#submit-text').value.trim();
    const hinweis = $('#submit-hint');
    if (!text && !angehaengtesBild) {
      hinweis.textContent = 'Schreib etwas oder häng ein Bild an.';
      hinweis.className = 'hint bad';
      return;
    }
    if (text && !istSauber(text)) {
      hinweis.textContent = 'Der Filter hat etwas beanstandet. Formulier den Text bitte anders.';
      hinweis.className = 'hint bad';
      return;
    }
    zustand.beitraege.push({
      id: 'b' + Date.now(),
      aufgabe: offeneAufgabe.id,
      titel: offeneAufgabe.titel,
      punkte: offeneAufgabe.punkte,
      von: zustand.ich.name.trim(),
      land: zustand.ich.land,
      text, bild: angehaengtesBild,
      status: 'wartet',
      datum: new Date().toLocaleDateString('de-DE')
    });
    sichern();
    $('#submit-card').classList.add('hidden');
    baueAufgaben();
    melde('Eingereicht. Eine Lehrkraft schaut sich das an.');
  });
}

function zeigeVeroeffentlicht() {
  const box = $('#published');
  const frei = zustand.beitraege.filter(b => b.status === 'frei');
  if (!frei.length) {
    box.innerHTML = '<p class="tiny soft">Noch nichts freigegeben. Was du einreichst, erscheint hier, sobald eine Lehrkraft es geprüft hat.</p>';
    return;
  }
  box.innerHTML = frei.map(b => `
    <article class="entry">
      <span class="meta">${esc(b.titel)} · ${landVon(b.land).flag} ${esc(b.von)} · ${esc(b.datum)}</span>
      ${b.bild ? `<img src="${b.bild}" alt="Beitrag von ${esc(b.von)}">` : ''}
      ${b.text ? `<p>${esc(b.text)}</p>` : ''}
      ${b.notiz ? `<p class="tiny soft">Anmerkung: ${esc(b.notiz)}</p>` : ''}
    </article>`).join('');
}

/* ============================================================
   05 · Lehrkräfte-Bereich
   ============================================================ */

function baueLehrkraft() {
  const sel = $('#nt-country');
  sel.innerHTML = '<option value="">Alle Länder</option>' +
    LAENDER.map(l => `<option value="${l.id}">${l.flag} ${esc(l.name)}</option>`).join('');

  $('#pin-ok').addEventListener('click', pruefePin);
  $('#pin').addEventListener('keydown', e => { if (e.key === 'Enter') pruefePin(); });

  $('#teacher-out').addEventListener('click', () => {
    zustand.lehrkraft = false;
    $('#teacher-area').classList.add('hidden');
    $('#lock-card').classList.remove('hidden');
    $('#pin').value = '';
    setzeRolle('schueler');
    baueAufgaben();
    melde('Abgemeldet.');
  });

  $('#nt-add').addEventListener('click', () => {
    const titel = $('#nt-title').value.trim();
    const text = $('#nt-desc').value.trim();
    const hinweis = $('#nt-hint');
    if (titel.length < 4 || text.length < 10) {
      hinweis.textContent = 'Titel und Aufgabenstellung dürfen nicht zu kurz sein.';
      hinweis.className = 'hint bad';
      return;
    }
    if (!istSauber(titel) || !istSauber(text)) {
      hinweis.textContent = 'Der Filter hat etwas beanstandet.';
      hinweis.className = 'hint bad';
      return;
    }
    zustand.aufgaben.unshift({
      id: 'eigen-' + Date.now(),
      land: $('#nt-country').value || null,
      titel, text,
      punkte: Math.max(1, Math.min(20, Number($('#nt-points').value) || 5)),
      von: 'Lehrkraft (du)'
    });
    sichern();
    $('#nt-title').value = ''; $('#nt-desc').value = '';
    hinweis.textContent = 'Veröffentlicht — die Aufgabe hängt jetzt an der Wand.';
    hinweis.className = 'hint good';
    baueAufgaben();
    melde('Aufgabe eingestellt.');
  });
}

function pruefePin() {
  const hinweis = $('#pin-hint');
  if ($('#pin').value === LEHRER_PIN) {
    zustand.lehrkraft = true;
    $('#lock-card').classList.add('hidden');
    const bereich = $('#teacher-area');
    bereich.classList.remove('hidden');
    $$('.sketch', bereich).forEach(rahmen);
    hinweis.textContent = '';
    setzeRolle('lehr');
    baueAufgaben();
    melde('Angemeldet. Du kannst Aufgaben einstellen und Beiträge prüfen.');
  } else {
    hinweis.textContent = 'Falsche PIN.';
    hinweis.className = 'hint bad';
    const s = $('#lock-shackle');
    s.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' },
               { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }],
              { duration: 260, iterations: 2 });
  }
}

function zeigePruefung() {
  const box = $('#review');
  if (!box) return;
  const wartend = zustand.beitraege.filter(b => b.status === 'wartet');
  $('#review-count').textContent = wartend.length
    ? `${wartend.length} wartet auf Prüfung`
    : 'nichts offen';
  if (!wartend.length) {
    box.innerHTML = '<p class="tiny soft">Keine offenen Beiträge.</p>';
    return;
  }
  box.innerHTML = '';
  wartend.forEach(b => {
    const el = document.createElement('article');
    el.className = 'entry';
    el.innerHTML =
      `<span class="meta">${esc(b.titel)} · ${landVon(b.land).flag} ${esc(b.von)} · ${esc(b.datum)} · ${b.punkte} Punkte</span>
       ${b.bild ? `<img src="${b.bild}" alt="Eingereichtes Bild">` : ''}
       ${b.text ? `<p>${esc(b.text)}</p>` : ''}
       <div class="field"><label for="n-${b.id}">Anmerkung (wird mitgeschickt)</label>
         <input type="text" id="n-${b.id}" maxlength="140" placeholder="optional"></div>
       <div class="acts"></div>`;
    const acts = el.querySelector('.acts');

    const ok = document.createElement('button');
    ok.className = 'btn small ok';
    ok.textContent = 'Freigeben';
    ok.addEventListener('click', () => {
      b.status = 'frei';
      b.notiz = $('#n-' + b.id).value.trim() || '';
      punkte(b.punkte, `Beitrag „${b.titel}“ freigegeben`);
      baueAufgaben();
    });

    const nein = document.createElement('button');
    nein.className = 'btn small no';
    nein.textContent = 'Zurückgeben';
    nein.addEventListener('click', () => {
      b.status = 'abgelehnt';
      b.notiz = $('#n-' + b.id).value.trim() || '';
      sichern();
      baueAufgaben();
      melde('Zurückgegeben — die Aufgabe kann neu bearbeitet werden.');
    });

    acts.append(ok, nein);
    box.appendChild(el);
  });
}

/* ---------------- Rollen ---------------- */

function setzeRolle(rolle) {
  zustand.rolle = rolle;
  $('#tab-student').setAttribute('aria-pressed', rolle === 'schueler' ? 'true' : 'false');
  $('#tab-teacher').setAttribute('aria-pressed', rolle === 'lehr' ? 'true' : 'false');
  $('#new-task-btn').classList.toggle('hidden', rolle !== 'lehr');
}

function baueRollen() {
  $('#tab-student').addEventListener('click', () => {
    setzeRolle('schueler');
    $('#profil').scrollIntoView({ behavior: sanft ? 'auto' : 'smooth' });
  });
  $('#tab-teacher').addEventListener('click', () => {
    if (zustand.lehrkraft) setzeRolle('lehr');
    $('#lehrkraft').scrollIntoView({ behavior: sanft ? 'auto' : 'smooth' });
    if (!zustand.lehrkraft) setTimeout(() => $('#pin').focus(), sanft ? 0 : 500);
  });
  $('#new-task-btn').addEventListener('click', () =>
    $('#lehrkraft').scrollIntoView({ behavior: sanft ? 'auto' : 'smooth' }));
}

/* ============================================================
   06 · Wortfilter zum Ausprobieren
   ============================================================ */

const FILTER_BEISPIELE = ['Hallo aus Lissabon!', 'Du 1d10t', 'S i e g H e i l', 'fiiiiick', 'Marschkapelle'];

function baueFilter() {
  const feld = $('#filter-in');
  $('#filter-samples').innerHTML = FILTER_BEISPIELE.map(b =>
    `<button class="chip" data-bsp="${esc(b)}">${esc(b)}</button>`).join('');
  $$('[data-bsp]').forEach(b => b.addEventListener('click', () => {
    feld.value = b.dataset.bsp;
    zeigeFilter();
  }));
  feld.addEventListener('input', zeigeFilter);
  zeigeFilter();
}

function zeigeFilter() {
  const text = $('#filter-in').value;
  const urteil = $('#filter-verdict');
  const spur = $('#filter-trace');
  if (!text.trim()) {
    urteil.className = 'verdict idle';
    urteil.innerHTML = '<span>·</span><span>Noch nichts eingegeben</span>';
    spur.innerHTML = '<p class="tiny soft">Tipp links etwas ein.</p>';
    return;
  }
  const norm = normalisiere(text);
  const eng = norm.replace(/[^a-z]/g, '');
  const kurz = eng.replace(/(.)\1+/g, '$1');
  const sauber = istSauber(text);
  urteil.className = 'verdict ' + (sauber ? 'ok' : 'no');
  urteil.innerHTML = sauber
    ? '<span>✓</span><span>Geht durch</span>'
    : '<span>✕</span><span>Wird geblockt</span>';
  spur.innerHTML = [
    ['Eingabe', text],
    ['Kleingeschrieben, Umlaute aufgelöst, Zahlen zurückgesetzt', norm],
    ['Ohne Leer- und Sonderzeichen', eng],
    ['Doppelbuchstaben zusammengezogen', kurz]
  ].map(([k, v]) => `<div class="trace-row"><span>${esc(k)}</span><code>${esc(v) || '—'}</code></div>`).join('');
}

/* ============================================================
   Titelseite
   ============================================================ */

function baueTitel() {
  const box = $('#hero-figures');
  const leute = alleLeute();
  const auswahl = [];
  const rnd = mulberry(Date.now() & 0xffff);
  while (auswahl.length < 6 && auswahl.length < leute.length) {
    const k = leute[Math.floor(rnd() * leute.length)];
    if (!auswahl.includes(k)) auswahl.push(k);
  }
  box.innerHTML = '';
  auswahl.forEach((p, i) => {
    const f = document.createElement('figure');
    f.innerHTML = `<svg viewBox="0 0 100 100" style="color:var(--ink)"></svg>
                   <figcaption>${esc(p.art === 'lehr' ? p.name.split(' ').pop() : p.name)}</figcaption>`;
    f.title = `${p.name} · ${p.ort}`;
    box.appendChild(f);
    const svg = f.querySelector('svg');
    portraet(svg, 8000 + leute.indexOf(p) * 137 + p.name.length * 13, STIFTE[i % STIFTE.length].hex);
    blickfolge(svg);
    f.addEventListener('click', () => {
      oeffneGespraech(p.schluessel);
      $('#leute').scrollIntoView({ behavior: sanft ? 'auto' : 'smooth' });
    });
    f.style.cursor = 'pointer';
  });

  $$('[data-goto]').forEach(b => b.addEventListener('click', () =>
    $(b.dataset.goto).scrollIntoView({ behavior: sanft ? 'auto' : 'smooth' })));
}

/* ============================================================
   Start
   ============================================================ */

function beobachte() {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(eintraege => {
    eintraege.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('seen', 'marked');
      io.unobserve(e.target);
    });
  }, { threshold: 0.4 });
  $$('.head, .lead').forEach(el => io.observe(el));
}

function start() {
  laden();
  setzeRolle('schueler');
  $('#tally-pts').textContent = zustand.punkte;

  baueTitel();
  baueProfil();
  baueKarte();
  baueLeute();
  baueGespraech();
  baueAufgaben();
  baueEinreichen();
  baueLehrkraft();
  baueFilter();
  baueRollen();

  wortmarke();
  kringel();
  neigung();
  beobachte();
  alleRahmen();

  $('#reset-all').addEventListener('click', () => {
    try { localStorage.removeItem(SPEICHER); } catch (e) {}
    location.reload();
  });

  let entprellen;
  addEventListener('resize', () => {
    clearTimeout(entprellen);
    entprellen = setTimeout(alleRahmen, 180);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(alleRahmen);
}

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start);
else start();
</script>
