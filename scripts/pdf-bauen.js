const { chromium } = require('playwright');
const OUT = '/home/user/projekt/docs/pdf/';
require('fs').mkdirSync(OUT, { recursive: true });

const teile = [
  { datei: 'hey-EU-Arbeitsblatt-1.pdf',        seiten: '1-2', titel: 'hey EU · Arbeitsblatt 1 — Erster Eindruck und Fehlersuche' },
  { datei: 'hey-EU-Arbeitsblatt-2.pdf',        seiten: '3-5', titel: 'hey EU · Arbeitsblatt 2 — Wie funktioniert das eigentlich?' },
  { datei: 'hey-EU-Hinweise-Lehrkraft.pdf',    seiten: '6',   titel: 'hey EU · Hinweise zur Durchführung' },
  { datei: 'hey-EU-Arbeitsblaetter-komplett.pdf', seiten: '',  titel: 'hey EU · Arbeitsblätter für den Klassentest' }
];

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage();
  await p.goto('file:///home/user/projekt/docs/arbeitsblaetter.html');
  await p.waitForTimeout(400);

  for (const t of teile) {
    // Der Dokumenttitel wird zum PDF-Titel – so heißt die Datei im
    // Betrachter sinnvoll und nicht "arbeitsblaetter".
    await p.evaluate(x => { document.title = x; }, t.titel);
    const opt = { path: OUT + t.datei, format: 'A4', printBackground: false };
    if (t.seiten) opt.pageRanges = t.seiten;
    await p.pdf(opt);
    const buf = require('fs').readFileSync(OUT + t.datei).toString('latin1');
    const n = (buf.match(/\/Type\s*\/Pages[\s\S]{0,200}?\/Count\s+(\d+)/) || [])[1];
    const kb = Math.round(require('fs').statSync(OUT + t.datei).size / 1024);
    console.log(`${t.datei.padEnd(38)} ${n} Seite(n)  ${kb} kB`);
  }
  await b.close();
})();
