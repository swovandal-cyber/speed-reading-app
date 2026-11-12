(() => {
'use strict';
const VERSION = '1.0';

/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
function fmtDur(ms) {
  const m = ms / 60000;
  if (m < 1) return 'under 1 min';
  if (m < 60) return Math.round(m) + ' min';
  const h = Math.floor(m / 60), r = Math.round(m - h * 60);
  return h + ' h' + (r ? ' ' + r + ' min' : '');
}
const tickUI = () => new Promise((r) => setTimeout(r, 0));
const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ---------- settings and daily totals ---------- */
const SIZES_FOCUS = [30, 38, 46, 56], SIZES_GUIDE = [17, 19, 21, 24];
const DEFAULTS = { wpm: 250, base: 250, chunkFocus: 1, chunkGuide: 3, size: 1, face: 'sans', pivot: false, pauses: true, longWords: true, bold: false, mode: 'guide' };
const S = Object.assign({}, DEFAULTS, LS.get('sra.settings', {}));
const saveSettings = () => LS.set('sra.settings', S);
const dayKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const stats = LS.get('sra.stats', {});
let statsDirty = false;
function today() { const k = dayKey(); if (!stats[k]) stats[k] = { w: 0, ms: 0 }; return stats[k]; }
function count(words, ms) { const t = today(); t.w += words; t.ms += ms; statsDirty = true; }

/* ---------- sample texts ---------- */
const SAMPLES = [
  { id: 'sample-start', order: 0, title: 'Start here: how this reader works', text: `This is your speed-reading app. Everything in it stays on this phone: there is no account, and nothing you read is uploaded.

There are two ways to read. Guide shows the full page and moves a highlight through it at your chosen speed, so you can still see the sentence around each word. Of the two, it has the better research behind it, and it suits books and long documents. Focus shows one word or a short phrase at a time in the same spot, so your eyes can stay still. It suits short pieces. Switch between them at the top of the screen.

Tap the round button to start and stop. The arrows on either side jump back or forward one sentence. Looking back is not a bad habit. It is how readers repair a missed point, so use the back arrow whenever a sentence did not land.

Set your speed with the plus and minus buttons. A typical adult reads non-fiction at about 240 words a minute. Faster speeds trade away understanding, so match the speed to the job: slower for what you must understand, faster for what you only need to sort.

Settings holds the rest: how many words appear at once, the text size, pauses at punctuation, an optional red focus letter, and bold word beginnings. Change one thing at a time and notice what helps.

When a sentence is worth keeping, tap Mark. Marked sentences collect under Notes. Notes also asks for the bottom line in your own words when you finish, and one tap copies everything as a book note.

To read your own material, go back to the library and tap Add. You can open an EPUB, a PDF, a Word document or a text file, or add a web page you have copied. The file is read on this device and is not uploaded.

One caution. The iPhone does not promise to keep what a Home Screen web app stores. Tap Backup at the bottom of the library after you add something you care about, and keep the file it saves.

Run the speed check from the library to measure your normal pace. The presets in Settings are then set from that number.` },
  { id: 'sample-gettysburg', order: 1, title: 'The Gettysburg Address (Abraham Lincoln, 1863)', text: `Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.

Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battle-field of that war. We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this.

But, in a larger sense, we can not dedicate — we can not consecrate — we can not hallow — this ground. The brave men, living and dead, who struggled here, have consecrated it, far above our poor power to add or detract. The world will little note, nor long remember what we say here, but it can never forget what they did here. It is for us the living, rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced. It is rather for us to be here dedicated to the great task remaining before us — that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion — that we here highly resolve that these dead shall not have died in vain — that this nation, under God, shall have a new birth of freedom — and that government of the people, by the people, for the people, shall not perish from the earth.` },
  { id: 'sample-arena', order: 2, title: 'The Man in the Arena (Theodore Roosevelt, 1910)', text: `It is not the critic who counts; not the man who points out how the strong man stumbles, or where the doer of deeds could have done them better. The credit belongs to the man who is actually in the arena, whose face is marred by dust and sweat and blood; who strives valiantly; who errs, who comes short again and again, because there is no effort without error and shortcoming; but who does actually strive to do the deeds; who knows great enthusiasms, the great devotions; who spends himself in a worthy cause; who at the best knows in the end the triumph of high achievement, and who at the worst, if he fails, at least fails while daring greatly, so that his place shall never be with those cold and timid souls who neither know victory nor defeat.` },
];
const CHECK = {
  text: `Your eyes do not glide across a line of print. They jump. Each jump, called a saccade, lasts a few hundredths of a second, and during it you see almost nothing. Reading happens in the pauses between jumps, called fixations, which last about a quarter of a second each.

In one fixation a skilled reader takes in only a small window of text: three or four letters to the left of the point of gaze and about fourteen or fifteen to the right. Everything beyond that is too blurred to read, though the shapes of upcoming words still help the eyes decide where to land next.

Readers also look back. Roughly one jump in ten moves backward to re-read a word or phrase that did not make sense the first time. These regressions look like wasted motion, but they repair misunderstandings, and blocking them makes comprehension worse.

This is why reading speed has limits. A typical adult reads non-fiction at about 240 words a minute. Going much faster means either spending less time on each word or skipping words, and both cost understanding. Studies of speed readers find they are mostly skilled skimmers: they get the gist quickly and miss the details.

Skimming is still useful. When the goal is to decide whether a document deserves a careful read, a fast pass is the right tool. The skill worth building is matching speed to purpose: slow for what must be understood, fast for what only needs to be sorted.`,
  quiz: [
    { q: 'When does reading actually happen?', a: ['During the jumps between words', 'During the pauses between jumps', 'Only when the eyes move backward'], ok: 1 },
    { q: 'About how much text does a skilled reader take in during one pause?', a: ['A full line', 'Exactly one word', 'A few letters to the left and about fifteen to the right'], ok: 2 },
    { q: 'What does the passage say about looking back to re-read?', a: ['It repairs misunderstandings, and blocking it hurts comprehension', 'It is a habit to eliminate', 'Only poor readers do it'], ok: 0 },
  ],
};

/* ---------- storage: IndexedDB with an in-memory copy ---------- */
const DB = (() => {
  let db = null;
  const metas = new Map(), texts = new Map();
  const open = () => new Promise((res) => {
    try {
      const r = indexedDB.open('speed-reading-app', 1);
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('docs')) d.createObjectStore('docs', { keyPath: 'id' }); if (!d.objectStoreNames.contains('texts')) d.createObjectStore('texts', { keyPath: 'id' }); };
      r.onsuccess = () => { db = r.result; res(true); };
      r.onerror = () => res(false);
      r.onblocked = () => res(false);
    } catch (e) { res(false); }
  });
  const run = (store, mode, fn) => new Promise((res) => {
    if (!db) { res(undefined); return; }
    try {
      const t = db.transaction(store, mode);
      const rq = fn(t.objectStore(store));
      t.oncomplete = () => res(rq ? rq.result : undefined);
      t.onerror = () => res(undefined);
      t.onabort = () => res(undefined);
    } catch (e) { res(undefined); }
  });
  return {
    get persistent() { return db != null; },
    async init() { await open(); const all = await run('docs', 'readonly', (s) => s.getAll()); (all || []).forEach((m) => metas.set(m.id, m)); return db != null; },
    list() { return [...metas.values()].sort((a, b) => (b.opened || b.added) - (a.opened || a.added)); },
    meta(id) { return metas.get(id); },
    async add(meta, text) { metas.set(meta.id, meta); texts.set(meta.id, text); await run('texts', 'readwrite', (s) => s.put({ id: meta.id, text })); await run('docs', 'readwrite', (s) => s.put(meta)); },
    saveMeta(meta) { metas.set(meta.id, meta); return run('docs', 'readwrite', (s) => s.put(meta)); },
    async text(id) { if (texts.has(id)) return texts.get(id); const r = await run('texts', 'readonly', (s) => s.get(id)); const t = r ? r.text : null; if (t != null) texts.set(id, t); return t; },
    async put(meta, text) { await this.add(meta, text); },
    async remove(id) { metas.delete(id); texts.delete(id); await run('docs', 'readwrite', (s) => s.delete(id)); await run('texts', 'readwrite', (s) => s.delete(id)); },
  };
})();
async function docText(id) {
  const t = await DB.text(id);
  if (t != null) return t;
  const s = SAMPLES.find((x) => x.id === id);
  return s ? clean(s.text) : null;
}

/* ---------- text into words ---------- */
/* Abbreviations that never end a sentence, and ones that end it only when a capitalised word follows. */
const ABBR_HARD = new Set(['mr', 'mrs', 'ms', 'dr', 'st', 'mt', 'ft', 'vs', 'e.g', 'i.e', 'u.s', 'u.k', 'gen', 'adm', 'capt', 'cdr', 'lt', 'col', 'maj', 'sgt', 'prof', 'rev', 'gov', 'sen', 'rep']);
const ABBR_SOFT = new Set(['etc', 'no', 'fig', 'inc', 'co', 'ltd', 'jr', 'sr', 'a.m', 'p.m', 'ph.d']);
const CLOSERS = /["'”’)\]]+$/;
const CLAUSE = /[,;:—–]["'”’)\]]*$/;
function clean(text) {
  return String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/[­​‌‍﻿]/g, '')
    .replace(/[   \t]/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
function splitParas(text) {
  const out = [];
  for (const block of text.split(/\n\n/)) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.length === 1) { out.push(lines[0]); continue; }
    const body = lines.slice(0, -1);
    const even = body.filter((l) => l.length >= 35 && l.length <= 110).length >= body.length * 0.7;
    const stops = body.filter((l) => /[.!?:]["'”’)\]]*$/.test(l)).length <= body.length * 0.5;
    if (even && stops) out.push(lines.join(' ')); else out.push(...lines);
  }
  return out;
}
function tokenize(text) {
  const words = [], sentEnd = [], paraEnd = [], paraStart = [];
  for (const p of splitParas(text)) {
    const parts = p.replace(/([—–])(?=\S)/g, '$1 ').split(/\s+/).filter(Boolean);
    const ws = []; let carry = '';
    for (const w of parts) {
      if (!/[\p{L}\p{N}]/u.test(w)) { if (ws.length) ws[ws.length - 1] += ' ' + w; else carry += w + ' '; continue; }
      ws.push(carry + w); carry = '';
    }
    if (!ws.length) continue;
    paraStart.push(words.length);
    for (let k = 0; k < ws.length; k++) {
      const w = ws[k], last = k === ws.length - 1;
      const bare = w.replace(CLOSERS, '');
      let end = /[.!?…]$/.test(bare);
      if (end && bare.endsWith('.')) {
        const stem = bare.slice(0, -1).toLowerCase().replace(/^[^\p{L}\p{N}]+/u, '');
        const next = last ? '' : ws[k + 1].replace(/^[^\p{L}\p{N}]+/u, '');
        if (ABBR_HARD.has(stem) || /^\p{L}$/u.test(stem)) end = false;
        else if (ABBR_SOFT.has(stem) && !/^\p{Lu}/u.test(next)) end = false;
      }
      words.push(w); sentEnd.push(end || last ? 1 : 0); paraEnd.push(last ? 1 : 0);
    }
  }
  return { words, sentEnd, paraEnd, paraStart, n: words.length, w: null, cum: null, avg: 1 };
}
/* Each word gets a weight (long words, numbers and punctuation take longer). Weights are
   normalised, so the speed you set is the true overall words per minute. */
function weigh(T) {
  const n = T.n, w = new Float32Array(n), cum = new Float64Array(n + 1);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const t = T.words[i]; let x = 1;
    if (S.longWords) { const L = t.replace(/[^\p{L}\p{N}]/gu, '').length; if (L > 12) x += 0.6; else if (L > 8) x += 0.3; if (/\d/.test(t)) x += 0.3; }
    if (S.pauses) { if (T.paraEnd[i]) x += 1.5; else if (T.sentEnd[i]) x += 1.0; else if (CLAUSE.test(t)) x += 0.45; }
    w[i] = x; sum += x; cum[i + 1] = sum;
  }
  T.w = w; T.cum = cum; T.avg = n ? sum / n : 1;
}

/* ---------- reading files ---------- */
class ReadError extends Error {}
const need = (cond, msg) => { if (!cond) throw new ReadError(msg); };
const UNSUPPORTED = 'This kind of file is not supported yet. Try EPUB, PDF, Word (.docx) or plain text.';
const xml = (s, type) => new DOMParser().parseFromString(s, type || 'application/xml');
const byName = (node, name) => Array.from(node.getElementsByTagNameNS('*', name));
function normPath(p) { const out = []; for (const seg of p.split('/')) { if (seg === '..') out.pop(); else if (seg && seg !== '.') out.push(seg); } return out.join('/'); }
const SKIP = new Set(['script', 'style', 'head', 'nav', 'aside', 'svg', 'math', 'noscript', 'template', 'iframe', 'object', 'form', 'button', 'select', 'textarea']);
const BLOCK = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre', 'tr', 'td', 'th', 'section', 'article', 'header', 'footer', 'figcaption', 'dt', 'dd', 'table', 'ul', 'ol', 'hr', 'main', 'body', 'title']);
function domToText(root) {
  let out = '';
  const walk = (node) => {
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { out += n.nodeValue.replace(/\s+/g, ' '); continue; }
      if (n.nodeType !== 1) continue;
      const tag = (n.localName || '').toLowerCase();
      if (SKIP.has(tag)) continue;
      if (tag === 'sup' && /^[\d\s\[\]()*†‡§]+$/.test(n.textContent)) continue;
      if (tag === 'br') { out += '\n'; continue; }
      const block = BLOCK.has(tag);
      if (block) out += '\n\n';
      walk(n);
      if (block) out += '\n\n';
    }
  };
  walk(root);
  return out;
}
function parseMarkup(s) {
  let d = xml(s, 'application/xhtml+xml');
  if (!d.documentElement || d.getElementsByTagName('parsererror').length) {
    d = xml(s.replace(/<(script|title|style|a|span|div|p|i|b|em|strong|textarea|iframe|td|li)\b([^>]*)\/>/gi, '<$1$2></$1>'), 'text/html');
  }
  return d;
}
async function readEpub(zip, fallbackTitle, progress) {
  const enc = zip.file('META-INF/encryption.xml');
  if (enc) {
    const locked = byName(xml(await enc.async('string')), 'EncryptedData').some((d) => {
      const m = byName(d, 'EncryptionMethod')[0];
      const alg = m ? m.getAttribute('Algorithm') || '' : '';
      return !/idpf\.org\/2008\/embedding|ns\.adobe\.com\/pdf\/enc#RC/.test(alg);
    });
    need(!locked, 'This book is copy-protected by the store that sold it, so it cannot be opened here.');
  }
  const c = zip.file('META-INF/container.xml');
  need(c, 'This EPUB is damaged or incomplete and cannot be read.');
  const rootfile = byName(xml(await c.async('string')), 'rootfile')[0];
  need(rootfile, 'This EPUB is damaged or incomplete and cannot be read.');
  const opfPath = rootfile.getAttribute('full-path') || '';
  const opfFile = zip.file(opfPath);
  need(opfFile, 'This EPUB is damaged or incomplete and cannot be read.');
  const opf = xml(await opfFile.async('string'));
  const dir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
  const items = new Map();
  byName(opf, 'item').forEach((it) => items.set(it.getAttribute('id'), it));
  const spine = byName(opf, 'itemref').filter((r) => r.getAttribute('linear') !== 'no');
  const parts = [];
  for (let k = 0; k < spine.length; k++) {
    const it = items.get(spine[k].getAttribute('idref'));
    if (!it) continue;
    const type = it.getAttribute('media-type') || '';
    if (type && !/html|xml/.test(type)) continue;
    let href = (it.getAttribute('href') || '').split('#')[0];
    try { href = decodeURIComponent(href); } catch (e) { /* keep the raw path */ }
    const f = zip.file(normPath(dir + href));
    if (!f) continue;
    const d = parseMarkup(await f.async('string'));
    const t = clean(domToText(byName(d, 'body')[0] || d.documentElement));
    if (t) parts.push(t);
    if (progress && k % 5 === 0) { progress('Reading section ' + (k + 1) + ' of ' + spine.length); await tickUI(); }
  }
  const titleEl = byName(opf, 'title')[0];
  return { title: (titleEl && titleEl.textContent.trim()) || fallbackTitle, kind: 'EPUB', text: parts.join('\n\n') };
}
async function readDocx(zip, fallbackTitle) {
  const d = xml(await zip.file('word/document.xml').async('string'));
  const nested = (node) => { for (let a = node.parentNode; a; a = a.parentNode) if (a.localName === 'p') return true; return false; };
  const DROP = new Set(['txbxContent', 'drawing', 'pict', 'AlternateContent', 'del', 'instrText']);
  const grab = (node) => {
    let s = '';
    for (const n of node.childNodes) {
      if (n.nodeType !== 1) continue;
      const ln = n.localName;
      if (ln === 't') s += n.textContent;
      else if (ln === 'tab' || ln === 'br' || ln === 'cr') s += ' ';
      else if (ln === 'noBreakHyphen') s += '-';
      else if (!DROP.has(ln)) s += grab(n);
    }
    return s;
  };
  const out = [];
  for (const p of byName(d, 'p')) { if (nested(p)) continue; const s = grab(p).replace(/\s+/g, ' ').trim(); if (s) out.push(s); }
  return { title: fallbackTitle, kind: 'Word', text: out.join('\n\n') };
}
async function readPdf(buf, fallbackTitle, progress) {
  need(window.pdfjsLib, 'The PDF reader did not load. Close the app, open it again and try once more.');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  let pdf;
  try { pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise; }
  catch (e) { throw new ReadError(e && e.name === 'PasswordException' ? 'This PDF is locked with a password and cannot be opened here.' : 'This PDF could not be read.'); }
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const lines = []; let cur = '', y = null, h = 0;
    for (const it of tc.items) {
      if (typeof it.str !== 'string') continue;
      const iy = it.transform ? it.transform[5] : 0, ih = it.height || 10;
      if (cur && y !== null && Math.abs(iy - y) > Math.max(ih, h) * 0.6) { lines.push({ t: cur, y, h }); cur = ''; }
      cur += it.str;
      if (it.str.trim()) { y = iy; h = ih; }
      if (it.hasEOL) { if (cur.trim()) lines.push({ t: cur, y: y == null ? iy : y, h: h || ih }); cur = ''; y = null; }
    }
    if (cur.trim()) lines.push({ t: cur, y: y == null ? 0 : y, h: h || 10 });
    pages.push(lines.map((l) => ({ t: l.t.replace(/\s+/g, ' ').trim(), y: l.y, h: l.h })).filter((l) => l.t));
    page.cleanup();
    if (progress && (p % 3 === 0 || p === pdf.numPages)) { progress('Reading page ' + p + ' of ' + pdf.numPages); await tickUI(); }
  }
  /* drop running headers, footers and page numbers */
  const key = (s) => s.replace(/\d+/g, '#').toLowerCase();
  const tally = new Map();
  if (pages.length >= 4) {
    for (const ls of pages) {
      const edge = new Set();
      if (ls[0]) edge.add(key(ls[0].t));
      if (ls.length > 1) edge.add(key(ls[ls.length - 1].t));
      edge.forEach((k) => tally.set(k, (tally.get(k) || 0) + 1));
    }
  }
  const repeated = (s) => (tally.get(key(s)) || 0) >= Math.max(3, pages.length * 0.4);
  const pageNo = (s) => /^(page\s+)?\d{1,4}(\s+of\s+\d{1,4})?$/i.test(s) || /^[-–—]\s*\d{1,4}\s*[-–—]$/.test(s);
  const paras = []; let chars = 0;
  for (const ls of pages) {
    let lines = ls;
    if (lines.length && (repeated(lines[0].t) || pageNo(lines[0].t))) lines = lines.slice(1);
    if (lines.length && (repeated(lines[lines.length - 1].t) || pageNo(lines[lines.length - 1].t))) lines = lines.slice(0, -1);
    let para = '';
    for (let k = 0; k < lines.length; k++) {
      const l = lines[k], prev = lines[k - 1];
      if (para && prev && Math.abs(prev.y - l.y) > Math.max(prev.h, l.h) * 1.9) { paras.push(para); para = ''; }
      if (!para) para = l.t;
      else if (/\p{L}-$/u.test(para) && /^\p{Ll}/u.test(l.t)) para = para.slice(0, -1) + l.t;
      else para += ' ' + l.t;
      chars += l.t.length;
    }
    if (para) paras.push(para);
  }
  need(chars > pages.length * 20, 'This PDF holds pictures of pages rather than text, so there is nothing to read here.');
  /* a paragraph cut in two by a page break is joined back together */
  const joined = [];
  for (const p of paras) {
    const last = joined[joined.length - 1];
    if (last && !/[.!?:;"”’)]$/.test(last) && /^\p{Ll}/u.test(p)) joined[joined.length - 1] = (/\p{L}-$/u.test(last) ? last.slice(0, -1) : last + ' ') + p;
    else joined.push(p);
  }
  return { title: fallbackTitle, kind: 'PDF', text: joined.join('\n\n') };
}
async function readFile(file, progress) {
  const name = file.name || 'Untitled';
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
  const base = dot > 0 ? name.slice(0, dot) : name;
  need(file.size <= 80 * 1024 * 1024, 'This file is larger than 80 MB, which is too big for this app.');
  need(!['azw', 'azw3', 'azw4', 'kfx', 'mobi', 'prc'].includes(ext), 'This is a Kindle-format file. Kindle books are locked to Amazon’s own apps, so it cannot be opened here.');
  need(ext !== 'doc', 'Older .doc files are not supported. Save it as .docx in Word and try again.');
  need(ext !== 'pages', 'Pages files are not supported. Export it as Word or PDF and try again.');
  const buf = await file.arrayBuffer();
  const b = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return readPdf(buf, base, progress);
  if (b[0] === 0x50 && b[1] === 0x4B) {
    need(window.JSZip, 'The file reader did not load. Close the app, open it again and try once more.');
    let zip;
    try { zip = await window.JSZip.loadAsync(buf); } catch (e) { throw new ReadError('This file could not be opened.'); }
    if (zip.file('META-INF/container.xml') || ext === 'epub') return readEpub(zip, base, progress);
    if (zip.file('word/document.xml')) return readDocx(zip, base);
    throw new ReadError(UNSUPPORTED);
  }
  const text = new TextDecoder('utf-8').decode(buf);
  need(!/[\u0000-\u0008\u000E-\u001F]/.test(text.slice(0, 4000)), UNSUPPORTED);
  need(ext !== 'rtf' && !/^\s*{\\rtf/.test(text), 'RTF files are not supported. Save it as .docx or plain text and try again.');
  if (ext === 'html' || ext === 'htm' || /^\s*<(!doctype|html)/i.test(text)) {
    const d = xml(text, 'text/html');
    const main = d.querySelector('article') || d.querySelector('main') || d.body;
    main.querySelectorAll('header, footer').forEach((n) => n.remove());
    const t = d.querySelector('title');
    return { title: (t && t.textContent.trim()) || base, kind: 'Web page', text: domToText(main) };
  }
  return { title: base, kind: 'Text', text };
}
async function addDoc(r) {
  const text = clean(r.text);
  const n = tokenize(text).n;
  need(n >= 3, 'No readable text was found in this file.');
  const meta = { id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: String(r.title || 'Untitled').slice(0, 140), kind: r.kind, added: Date.now(), opened: Date.now(), n, pos: 0, notes: [] };
  await DB.add(meta, text);
  return meta;
}

/* ---------- reader engine ---------- */
let T = null, doc = null, pos = 0, playing = false, timer = 0, due = 0, ramp = 0, posDirty = false, scrubbing = false, wakeLock = null;
const G = { a: 0, b: 0, spans: [], cur: [], top: -1 };
const msFor = (a, b) => (T.cum[b] - T.cum[a]) / T.avg * (60000 / S.wpm);
const chunkSize = () => (S.mode === 'focus' ? S.chunkFocus : S.chunkGuide);
function chunkEnd(i) {
  const n = chunkSize(); let j = i, chars = 0;
  while (j < T.n && j - i < n) {
    const len = T.words[j].length;
    if (j > i && S.mode === 'focus' && chars + len > 26) break;
    chars += len + 1; j++;
    if (T.sentEnd[j - 1] || CLAUSE.test(T.words[j - 1])) break;
  }
  return Math.max(j, i + 1);
}
function sentenceBounds(i) {
  let a = i; while (a > 0 && !T.sentEnd[a - 1]) a--;
  let b = i; while (b < T.n - 1 && !T.sentEnd[b]) b++;
  return [a, b + 1];
}
function orp(word) {
  const lead = (word.match(/^[^\p{L}\p{N}]*/u) || [''])[0].length;
  const core = word.slice(lead).replace(/[^\p{L}\p{N}]+$/u, '');
  const L = core.length;
  const k = L <= 1 ? 0 : L <= 5 ? 1 : L <= 9 ? 2 : L <= 13 ? 3 : 4;
  return Math.min(word.length - 1, lead + k);
}
function showFocus(i, end) {
  const win = $('window'), W = win.clientWidth, base = SIZES_FOCUS[S.size];
  const single = end - i === 1 && S.pivot;
  win.classList.toggle('plain', !single);
  $('word').hidden = !single; $('phrase').hidden = single;
  if (single) {
    const w = T.words[i], k = orp(w), word = $('word');
    $('wPre').textContent = w.slice(0, k); $('wPiv').textContent = w.charAt(k); $('wPost').textContent = w.slice(k + 1);
    word.style.fontSize = '';
    const px = W * 0.37, width = (id) => $(id).getBoundingClientRect().width;
    /* Shrink a word that will not fit. Text does not scale exactly with font size, so measure again after each change. */
    let size = base;
    for (let pass = 0; pass < 4; pass++) {
      const fit = Math.min((px - 8) / Math.max(1, width('wPre') + width('wPiv') / 2), (W - px - 8) / Math.max(1, width('wPost') + width('wPiv') / 2));
      if (fit >= 1) break;
      size = Math.max(10, size * fit * 0.99);
      word.style.fontSize = size.toFixed(2) + 'px';
    }
    word.style.transform = 'translate3d(' + (px - width('wPre') - width('wPiv') / 2).toFixed(1) + 'px, -50%, 0)';
  } else {
    const inner = $('phraseIn');
    inner.textContent = T.words.slice(i, end).join(' ');
    inner.style.fontSize = '';
    let size = base;
    for (let pass = 0; pass < 4; pass++) {
      const width = inner.getBoundingClientRect().width;
      if (width <= W - 16) break;
      size = Math.max(10, size * (W - 16) / width * 0.99);
      inner.style.fontSize = size.toFixed(2) + 'px';
    }
  }
}
function paraOf(i) {
  const ps = T.paraStart; let lo = 0, hi = ps.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ps[mid] <= i) lo = mid; else hi = mid - 1; }
  return lo;
}
function buildWindow(i) {
  const ps = T.paraStart, endOf = (q) => (q + 1 < ps.length ? ps[q + 1] : T.n);
  const p = paraOf(i); let a = ps[p], b;
  if (endOf(p) - a > 700) { a += Math.floor((i - a) / 500) * 500; b = Math.min(a + 500, endOf(p)); }
  else { b = endOf(p); let q = p + 1; while (q < ps.length && b - a < 420 && endOf(q) - ps[q] <= 700) { b = endOf(q); q++; } }
  G.a = a; G.b = b; G.spans = []; G.cur = []; G.top = -1;
  const box = $('guideText'); box.textContent = '';
  let para = null;
  for (let k = a; k < b; k++) {
    if (k === a || T.paraEnd[k - 1]) { para = document.createElement('p'); box.append(para); }
    const s = document.createElement('span'), w = T.words[k];
    s.className = k < pos ? 'w done' : 'w'; s.dataset.i = String(k);
    if (S.bold) {
      const lead = (w.match(/^[^\p{L}\p{N}]*/u) || [''])[0].length;
      const core = w.slice(lead).replace(/[^\p{L}\p{N}].*$/u, '');
      const nb = lead + (core.length <= 3 ? 1 : Math.ceil(core.length * 0.45));
      s.append(el('b', '', w.slice(0, nb)), w.slice(nb) + ' ');
    } else s.textContent = w + ' ';
    para.append(s); G.spans.push(s);
  }
  $('btnNextWin').hidden = b >= T.n;
  $('guidePane').scrollTop = 0;
}
function refreshGuide() {
  for (let k = 0; k < G.spans.length; k++) { const s = G.spans[k]; s.classList.toggle('done', G.a + k < pos); s.classList.remove('cur'); }
  G.cur = []; G.top = -1;
}
function showGuide(i, end) {
  if (i < G.a || i >= G.b) buildWindow(i);
  for (const s of G.cur) { s.classList.remove('cur'); s.classList.add('done'); }
  G.cur = [];
  for (let k = i; k < Math.min(end, G.b); k++) { const s = G.spans[k - G.a]; s.classList.remove('done'); s.classList.add('cur'); G.cur.push(s); }
  const first = G.cur[0];
  if (first) {
    const top = first.offsetTop;
    if (Math.abs(top - G.top) > 2) {
      G.top = top;
      const pane = $('guidePane');
      pane.scrollTo({ top: Math.max(0, top - pane.clientHeight * 0.33), behavior: playing && !reduceMotion ? 'smooth' : 'auto' });
    }
  }
}
function showContext() {
  const c = $('context'); c.textContent = '';
  if (!T || !T.n) return;
  const i = Math.min(pos, T.n - 1), bounds = sentenceBounds(i), e = Math.min(chunkEnd(i), bounds[1]);
  const a = Math.max(bounds[0], i - 30), b = Math.min(bounds[1], i + 40);
  c.append((a > bounds[0] ? '… ' : '') + T.words.slice(a, i).join(' ') + (i > a ? ' ' : ''));
  c.append(el('mark', '', T.words.slice(i, e).join(' ')));
  if (e < b) c.append(' ' + T.words.slice(e, b).join(' ') + (b < bounds[1] ? ' …' : ''));
}
function paintMeta() {
  const n = T.n, p = Math.min(pos, n);
  if (!scrubbing) $('scrub').value = String(Math.round(p / Math.max(1, n - 1) * 1000));
  $('pct').textContent = Math.round(p / Math.max(1, n) * 100) + '%';
  $('left').textContent = p >= n ? 'Finished' : fmtDur(msFor(p, n)) + ' left';
}
function paintState() {
  $('playIcon').setAttribute('d', playing ? 'M7 5h4v14H7zM13 5h4v14h-4z' : 'M8 5v14l11-7z');
  $('btnPlay').setAttribute('aria-label', playing ? 'Pause' : 'Start reading');
  $('focusPane').classList.toggle('playing', playing);
  $('hint').textContent = !T ? '' : pos >= T.n ? 'End of the document. Tap to start again.' : pos === 0 ? 'Tap here to start' : 'Paused. Tap to continue.';
}
function render() {
  if (!T || !T.n) return;
  const i = Math.min(pos, T.n - 1), end = chunkEnd(i);
  if (S.mode === 'focus') { showFocus(i, end); showContext(); } else showGuide(i, end);
  paintMeta(); paintState();
}
function step() {
  if (!playing) return;
  const end = chunkEnd(pos);
  if (S.mode === 'focus') showFocus(pos, end); else showGuide(pos, end);
  paintMeta();
  const ms = msFor(pos, end) * (1 + 0.5 * Math.max(0, 1 - ramp / 5));
  ramp++;
  const now = performance.now();
  if (now - due > 250) due = now;
  due += ms;
  timer = setTimeout(() => {
    count(end - pos, ms);
    pos = end; posDirty = true;
    if (pos >= T.n) { finish(); return; }
    step();
  }, Math.max(0, due - now));
}
async function wake(on) {
  try {
    if (on && navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
    else if (!on && wakeLock) { const w = wakeLock; wakeLock = null; await w.release(); }
  } catch (e) { /* the screen lock is optional */ }
}
function play() {
  if (!T || !T.n || playing) return;
  if (pos >= T.n) { pos = 0; if (S.mode === 'guide') buildWindow(0); }
  playing = true; ramp = 0; due = performance.now();
  paintState(); wake(true); step();
}
function pause() {
  if (!playing) return;
  playing = false; clearTimeout(timer);
  wake(false); savePos(); render();
}
function finish() {
  playing = false; clearTimeout(timer); pos = T.n;
  wake(false); savePos(); paintMeta(); paintState();
  if (S.mode === 'focus') showContext();
  if (T.n >= 150 && !(doc.bluf && doc.bluf.trim())) {
    setTimeout(() => { if (doc && !$('reader').hidden && !sheetOpen()) { renderNotes(); openSheet('sheetNotes'); $('notesH').textContent = 'Finished. What was the bottom line?'; } }, 700);
  }
}
const toggle = () => (playing ? pause() : play());
function seek(i) {
  if (!T || !T.n) return;
  pos = clamp(i, 0, T.n - 1); posDirty = true;
  if (S.mode === 'guide') { if (pos < G.a || pos >= G.b) buildWindow(pos); else refreshGuide(); }
  if (playing) { clearTimeout(timer); ramp = 2; due = performance.now(); step(); } else render();
}
function prevSentence() { if (!T) return; const i = Math.min(pos, T.n - 1); let a = sentenceBounds(i)[0]; if (i - a < 3 && a > 0) a = sentenceBounds(a - 1)[0]; seek(a); }
function nextSentence() { if (!T) return; const b = sentenceBounds(Math.min(pos, T.n - 1))[1]; if (b < T.n) seek(b); }
function savePos() {
  if (!doc) return;
  doc.pos = pos; posDirty = false; DB.saveMeta(doc);
  if (statsDirty) { LS.set('sra.stats', stats); statsDirty = false; }
}
function setWpm(v) {
  S.wpm = clamp(Math.round(v / 10) * 10, 100, 900); saveSettings();
  $('wpmOut').textContent = S.wpm + ' wpm';
  if (T) paintMeta();
}
function applyLook() {
  const st = $('stage');
  st.style.setProperty('--fs', SIZES_FOCUS[S.size] + 'px');
  st.style.setProperty('--gfs', SIZES_GUIDE[S.size] + 'px');
  st.classList.toggle('serif', S.face === 'serif');
}
function setMode(mode) {
  pause();
  S.mode = mode === 'guide' ? 'guide' : 'focus'; saveSettings();
  $('modeFocus').setAttribute('aria-pressed', String(S.mode === 'focus'));
  $('modeGuide').setAttribute('aria-pressed', String(S.mode === 'guide'));
  $('focusPane').hidden = S.mode !== 'focus';
  $('guidePane').hidden = S.mode !== 'guide';
  if (T && S.mode === 'guide') buildWindow(Math.min(pos, T.n - 1));
  render();
}

/* ---------- views ---------- */
let toastTimer = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 1600); }
function showView(name) { $('lib').hidden = name !== 'lib'; $('reader').hidden = name !== 'reader'; }
const SHEETS = ['sheetAdd', 'sheetSet', 'sheetNotes', 'sheetCheck', 'sheetBackup'];
const sheetOpen = () => SHEETS.some((id) => !$(id).hidden);
function closeSheets() { SHEETS.forEach((id) => { $(id).hidden = true; }); if (!$('lib').hidden) renderLibrary(); }
function openSheet(id) { pause(); SHEETS.forEach((s) => { $(s).hidden = s !== id; }); const f = $(id).querySelector('button, [tabindex="0"], input, textarea'); if (f) f.focus({ preventScroll: true }); }
function renderLibrary() {
  const list = $('docList'); list.textContent = '';
  const docs = DB.list();
  if (!docs.length) list.append(el('p', 'empty', 'Your library is empty. Tap Add to open a file or paste some text.'));
  for (const m of docs) {
    const row = el('div', 'doc'); row.setAttribute('role', 'listitem');
    const open = el('button', 'doc-open'); open.type = 'button';
    const done = m.n ? Math.min(1, m.pos / m.n) : 0;
    const meta = [m.kind, fmtInt(m.n) + ' words', done >= 1 ? 'finished' : fmtDur(Math.max(0, m.n - m.pos) / S.wpm * 60000) + ' left'].join(' · ');
    const bar = el('span', 'bar'), fill = el('i'); fill.style.width = Math.round(done * 100) + '%'; bar.append(fill);
    open.append(el('span', 'doc-title', m.title), el('span', 'doc-meta', meta), bar);
    open.addEventListener('click', () => openDoc(m.id));
    const x = el('button', 'doc-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Remove ' + m.title);
    x.addEventListener('click', () => {
      if (x.classList.contains('arm')) { DB.remove(m.id).then(renderLibrary); return; }
      x.classList.add('arm'); x.textContent = 'Remove';
      setTimeout(() => { if (x.isConnected) { x.classList.remove('arm'); x.textContent = '✕'; } }, 3000);
    });
    row.append(open, x); list.append(row);
  }
  const t = today();
  $('stMin').textContent = Math.round(t.ms / 60000) + ' min';
  $('stWords').textContent = fmtInt(t.w);
  $('stWpm').textContent = S.wpm + ' wpm';
  paintWarn();
}
async function openDoc(id) {
  const m = DB.meta(id); if (!m) return;
  const text = await docText(id);
  if (text == null) { toast('This document is no longer stored on this device.'); return; }
  doc = m; T = tokenize(text); weigh(T);
  m.n = T.n; pos = m.pos >= T.n ? 0 : m.pos; m.opened = Date.now(); DB.saveMeta(m);
  $('rTitle').textContent = m.title;
  $('wpmOut').textContent = S.wpm + ' wpm';
  paintNotes();
  showView('reader'); applyLook(); setMode(S.mode);
}
function paintNotes() { const n = doc && doc.notes ? doc.notes.length : 0; $('noteCount').textContent = n ? String(n) : ''; }
function markSentence() {
  if (!T || !T.n || !doc) return;
  const [a, b] = sentenceBounds(Math.min(pos, T.n - 1));
  if (!doc.notes) doc.notes = [];
  if (doc.notes.some((x) => x.i === a)) { toast('Already marked'); return; }
  doc.notes.push({ i: a, text: T.words.slice(a, b).join(' ') });
  doc.notes.sort((x, y) => x.i - y.i);
  DB.saveMeta(doc); paintNotes(); toast('Sentence marked');
}
function notesText() {
  const lines = ['# ' + doc.title, '', 'Date read: ' + dayKey(), ''];
  if (doc.bluf && doc.bluf.trim()) lines.push('## Main idea', '', doc.bluf.trim(), '');
  if (doc.notes && doc.notes.length) { lines.push('## Best quotes', ''); doc.notes.forEach((n) => lines.push('> ' + n.text, '')); }
  return lines.join('\n');
}
function renderNotes() {
  const box = $('notesList'); box.textContent = ''; $('notesOut').hidden = true;
  $('notesH').textContent = 'Notes';
  const notes = (doc && doc.notes) || [];
  $('blufText').value = (doc && doc.bluf) || '';
  if (!notes.length) { box.append(el('p', 'note', 'Nothing marked yet. While you read, tap Mark to keep the sentence on screen.')); return; }
  notes.forEach((n) => {
    const item = el('div'), acts = el('div', 'note-acts');
    const go = el('button', 'link', 'Go to'); go.type = 'button'; go.addEventListener('click', () => { closeSheets(); seek(n.i); });
    const rm = el('button', 'link', 'Remove'); rm.type = 'button'; rm.addEventListener('click', () => { doc.notes = doc.notes.filter((x) => x !== n); DB.saveMeta(doc); paintNotes(); renderNotes(); });
    acts.append(go, rm); item.append(el('blockquote', '', n.text), acts); box.append(item);
  });
}

/* ---------- settings sheet ---------- */
const BELLS = [['1/3', 0.7], ['2/3', 0.85], ['STD', 1], ['FULL', 1.25], ['FLANK', 1.6]];
function segment(box, options, get, set) {
  box.textContent = '';
  const paint = () => [...box.children].forEach((c, k) => c.setAttribute('aria-pressed', String(options[k][0] === get())));
  options.forEach(([value, label]) => { const b = el('button', '', label); b.type = 'button'; b.addEventListener('click', () => { set(value); saveSettings(); paint(); }); box.append(b); });
  paint();
}
function renderPresets() {
  const box = $('presets'); box.textContent = '';
  BELLS.forEach(([name, f]) => {
    const v = clamp(Math.round(S.base * f / 10) * 10, 100, 900);
    const b = el('button', 'chip'); b.type = 'button';
    b.append(el('span', '', name), el('small', '', v + ' wpm'));
    b.setAttribute('aria-pressed', String(S.wpm === v));
    b.addEventListener('click', () => { setWpm(v); syncSettings(); });
    box.append(b);
  });
}
function syncSettings() {
  $('setWpm').value = String(S.wpm); $('setWpmOut').textContent = S.wpm + ' wpm';
  renderPresets();
  const key = S.mode === 'focus' ? 'chunkFocus' : 'chunkGuide';
  $('chunkL').textContent = 'Words at a time (' + (S.mode === 'focus' ? 'Focus' : 'Guide') + ')';
  segment($('segChunk'), [[1, '1'], [2, '2'], [3, '3'], [4, '4']], () => S[key], (v) => { S[key] = v; render(); });
  segment($('segSize'), [[0, 'S'], [1, 'M'], [2, 'L'], [3, 'XL']], () => S.size, (v) => { S.size = v; applyLook(); render(); });
  segment($('segFace'), [['sans', 'Sans'], ['serif', 'Serif']], () => S.face, (v) => { S.face = v; applyLook(); render(); });
  $('tgPivot').checked = S.pivot; $('tgPauses').checked = S.pauses; $('tgLong').checked = S.longWords; $('tgBold').checked = S.bold;
}

/* ---------- speed check ---------- */
let chkT0 = 0, chkWpm = 0;
function chkStep(n) { [1, 2, 3, 4].forEach((k) => { $('chk' + k).hidden = k !== n; }); $('sheetCheck').querySelector('.sheet').scrollTop = 0; }
function openCheck() {
  const box = $('chkText'); box.textContent = '';
  CHECK.text.split(/\n\n/).forEach((p) => box.append(el('p', '', p)));
  const quiz = $('chkQuiz'); quiz.textContent = '';
  CHECK.quiz.forEach((q, qi) => {
    const fs = el('fieldset'); fs.append(el('legend', '', q.q));
    q.a.forEach((a, ai) => { const lab = el('label'), inp = el('input'); inp.type = 'radio'; inp.name = 'chkq' + qi; inp.id = 'chkq' + qi + 'a' + ai; inp.value = String(ai); lab.htmlFor = inp.id; lab.append(inp, el('span', '', a)); fs.append(lab); });
    quiz.append(fs);
  });
  chkStep(1); openSheet('sheetCheck');
}

/* ---------- backup, restore and storage ---------- */
/* iOS does not promise to keep a web app's stored files, so the whole library can be saved
   to one file and put back from it. Nothing leaves the phone unless the owner sends the file. */
const BACKUP_APP = 'speed-reading-app';
const standalone = () => navigator.standalone === true || !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
let persisted = null, offlineReady = false, pendingBackup = null;
async function checkStorage(ask) {
  try {
    if (navigator.storage && navigator.storage.persisted) {
      let p = await navigator.storage.persisted();
      if (!p && ask && navigator.storage.persist) p = await navigator.storage.persist();
      persisted = p;
    }
  } catch (e) { /* leave as unknown */ }
  paintWarn();
}
const userDocs = () => DB.list().filter((m) => m.kind !== 'Sample');
function unsaved() { const last = LS.get('sra.lastBackup', 0); return userDocs().filter((m) => m.added > last).length; }
function paintWarn() {
  const w = $('libWarn'), n = unsaved();
  let msg = '';
  if (!DB.persistent) msg = 'Storage is switched off in this browser window, so nothing you add will be kept after you close it.';
  else if (!persisted) msg = 'This device has not promised to keep your library, and it can clear it without warning.';
  if (n && DB.persistent) msg += (msg ? ' ' : '') + (n === 1 ? '1 document is' : n + ' documents are') + ' not in a backup yet.';
  w.hidden = !msg; w.textContent = '';
  if (msg) { w.append(el('b', '', 'Heads up. '), msg + ' ', el('u', '', 'Backup')); }
}
async function buildBackup() {
  const docs = [];
  for (const m of DB.list()) { const text = await DB.text(m.id); if (text != null) docs.push({ meta: m, text }); }
  const data = { app: BACKUP_APP, format: 1, version: VERSION, exported: new Date().toISOString(), settings: S, stats, docs };
  return new Blob([JSON.stringify(data)], { type: 'application/json' });
}
async function restoreBackup(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch (e) { throw new ReadError('This is not a backup file from this app.'); }
  need(data && data.app === BACKUP_APP && Array.isArray(data.docs), 'This is not a backup file from this app.');
  need(data.format === 1, 'This backup was made by a newer version of the app. Update the app, then restore.');
  const cleanBefore = unsaved() === 0;
  let n = 0;
  for (const d of data.docs) {
    const m = d && d.meta;
    if (!m || typeof m.id !== 'string' || typeof d.text !== 'string') continue;
    const text = clean(d.text), words = tokenize(text).n;
    if (words < 1) continue;
    const meta = {
      id: m.id, title: String(m.title || 'Untitled').slice(0, 140), kind: String(m.kind || 'Text'),
      added: Number(m.added) || Date.now(), opened: Number(m.opened) || 0, n: words,
      pos: clamp(Number(m.pos) || 0, 0, words),
      notes: Array.isArray(m.notes) ? m.notes.filter((x) => x && typeof x.text === 'string').map((x) => ({ i: Number(x.i) || 0, text: x.text })) : [],
    };
    if (typeof m.bluf === 'string') meta.bluf = m.bluf;
    await DB.put(meta, text); n++;
  }
  if (data.settings && typeof data.settings === 'object') {
    for (const k of Object.keys(DEFAULTS)) if (typeof data.settings[k] === typeof DEFAULTS[k]) S[k] = data.settings[k];
    S.wpm = clamp(S.wpm, 100, 900); saveSettings();
  }
  if (data.stats && typeof data.stats === 'object') {
    for (const [k, v] of Object.entries(data.stats)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !v) continue;
      const mine = stats[k] || { w: 0, ms: 0 };
      stats[k] = { w: Math.max(mine.w, Number(v.w) || 0), ms: Math.max(mine.ms, Number(v.ms) || 0) };
    }
    LS.set('sra.stats', stats);
  }
  LS.set('sra.seeded', true);
  /* what was just restored is already in a backup file, so do not nag about it */
  if (cleanBefore) LS.set('sra.lastBackup', Date.now());
  return n;
}
function paintBackup() {
  $('bkStorage').textContent = !DB.persistent ? 'Storage is switched off in this browser window (private browsing does this). Nothing you add will be kept.'
    : persisted ? 'This device has agreed to keep your library. A backup file is still the only protection if the phone is lost or the app is deleted.'
    : 'This device has not promised to keep your library. iOS can clear a web app’s storage without warning, for example when space runs low or the app goes unused. Save a backup file after you add books or notes you care about.';
  const last = LS.get('sra.lastBackup', 0), n = unsaved();
  $('bkLast').textContent = (last ? 'Last backup: ' + new Date(last).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) + '.' : 'No backup saved yet.')
    + (n ? ' ' + (n === 1 ? '1 document' : n + ' documents') + ' added since.' : '');
  $('bkInstall').textContent = standalone() ? 'Installed on the Home Screen.'
    : 'To install on an iPhone: open this page in Safari, tap Share, then Add to Home Screen. The Home Screen app keeps its own library, separate from this browser tab, so add your books there.';
  $('bkAbout').textContent = 'Version ' + VERSION + '. ' + (offlineReady ? 'Saved for use without a connection.' : 'Not yet saved for use without a connection.');
  $('btnSaveBackup').textContent = pendingBackup ? 'Backup ready. Tap to save it' : 'Save a backup file';
}
function backupSaved() { pendingBackup = null; LS.set('sra.lastBackup', Date.now()); paintBackup(); paintWarn(); toast('Backup saved'); }
async function saveBackup() {
  $('bkErr').hidden = true;
  try {
    if (!pendingBackup) {
      savePos();
      const blob = await buildBackup();
      pendingBackup = new File([blob], 'speed-reading-backup-' + dayKey() + '.json', { type: 'application/json' });
    }
    const file = pendingBackup;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); backupSaved(); return; }
      catch (e) {
        if (e && e.name === 'AbortError') { pendingBackup = null; paintBackup(); return; }
        /* the phone wants a fresh tap before it will open the Share sheet */
        if (e && e.name === 'NotAllowedError') { paintBackup(); return; }
      }
    }
    const url = URL.createObjectURL(file), a = el('a');
    a.href = url; a.download = file.name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    backupSaved();
  } catch (err) { pendingBackup = null; const e = $('bkErr'); e.textContent = 'The backup could not be made.'; e.hidden = false; console.error(err); }
}
$('btnBackup').addEventListener('click', () => { pendingBackup = null; $('bkErr').hidden = true; $('bkStatus').textContent = ''; paintBackup(); openSheet('sheetBackup'); });
$('libWarn').addEventListener('click', () => $('btnBackup').click());
$('btnSaveBackup').addEventListener('click', saveBackup);
$('restoreLabel').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('restoreIn').click(); } });
$('restoreIn').addEventListener('change', async (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const err = $('bkErr'); err.hidden = true; $('bkStatus').textContent = 'Restoring…';
  try {
    const n = await restoreBackup(f);
    $('bkStatus').textContent = n === 1 ? '1 document restored.' : n + ' documents restored.';
    setWpm(S.wpm); applyLook(); paintBackup(); renderLibrary();
  } catch (ex) {
    $('bkStatus').textContent = '';
    err.textContent = ex instanceof ReadError ? ex.message : 'This backup file could not be read.';
    err.hidden = false;
    if (!(ex instanceof ReadError)) console.error(ex);
  }
  e.target.value = '';
});
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* the app still works online */ });
  navigator.serviceWorker.ready.then(() => { offlineReady = true; if (!$('sheetBackup').hidden) paintBackup(); }).catch(() => {});
}

/* ---------- wiring ---------- */
$('btnAdd').addEventListener('click', () => {
  $('addErr').hidden = true;
  $('addStatus').textContent = window.JSZip && window.pdfjsLib ? '' : 'The file reader has not loaded. Close the app and open it again. Pasting text still works.';
  openSheet('sheetAdd');
});
$('btnCheck').addEventListener('click', openCheck);
$('btnBack').addEventListener('click', () => { pause(); savePos(); showView('lib'); renderLibrary(); });
$('modeFocus').addEventListener('click', () => setMode('focus'));
$('modeGuide').addEventListener('click', () => setMode('guide'));
$('btnSettings').addEventListener('click', () => { syncSettings(); openSheet('sheetSet'); });
$('btnPlay').addEventListener('click', toggle);
$('focusPane').addEventListener('click', toggle);
$('btnPrev').addEventListener('click', prevSentence);
$('btnNext').addEventListener('click', nextSentence);
$('wpmDown').addEventListener('click', () => setWpm(S.wpm - 10));
$('wpmUp').addEventListener('click', () => setWpm(S.wpm + 10));
$('btnMark').addEventListener('click', markSentence);
$('btnNotes').addEventListener('click', () => { renderNotes(); openSheet('sheetNotes'); });
$('btnNextWin').addEventListener('click', () => seek(G.b));
$('guideText').addEventListener('click', (e) => { const s = e.target.closest ? e.target.closest('.w') : null; if (s) seek(Number(s.dataset.i)); });
$('scrub').addEventListener('input', () => { scrubbing = true; if (T) seek(Math.round(Number($('scrub').value) / 1000 * (T.n - 1))); });
$('scrub').addEventListener('change', () => { scrubbing = false; });
SHEETS.forEach((id) => {
  const s = $(id);
  s.addEventListener('click', (e) => { if (e.target === s || (e.target.closest && e.target.closest('[data-close]'))) closeSheets(); });
});
$('setWpm').addEventListener('input', () => { setWpm(Number($('setWpm').value)); $('setWpmOut').textContent = S.wpm + ' wpm'; renderPresets(); });
$('tgPivot').addEventListener('change', (e) => { S.pivot = e.target.checked; saveSettings(); render(); });
$('tgPauses').addEventListener('change', (e) => { S.pauses = e.target.checked; saveSettings(); if (T) { weigh(T); render(); } });
$('tgLong').addEventListener('change', (e) => { S.longWords = e.target.checked; saveSettings(); if (T) { weigh(T); render(); } });
$('tgBold').addEventListener('change', (e) => { S.bold = e.target.checked; saveSettings(); if (T && S.mode === 'guide') { buildWindow(Math.min(pos, T.n - 1)); render(); } });

const addStatus = (msg) => { $('addStatus').textContent = msg; };
function addError(err) {
  addStatus('');
  const e = $('addErr');
  e.textContent = err instanceof ReadError ? err.message : 'This file could not be read.';
  e.hidden = false;
  if (!(err instanceof ReadError)) console.error(err);
}
$('fileLabel').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('fileIn').click(); } });
$('fileIn').addEventListener('change', async (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  $('addErr').hidden = true; addStatus('Reading “' + f.name + '”…');
  try {
    await tickUI();
    const meta = await addDoc(await readFile(f, addStatus));
    addStatus(''); closeSheets(); checkStorage(true); await openDoc(meta.id);
  } catch (err) { addError(err); }
  e.target.value = '';
});
/* Pasted or copied text. A short first line followed by a blank line is taken as the title
   (the Share-sheet Shortcut sends a web page that way). */
async function addPasted(raw, givenTitle) {
  let text = clean(raw), title = (givenTitle || '').trim(), kind = 'Pasted';
  const m = /^([^\n]{3,140})\n\n([\s\S]+)$/.exec(text);
  if (!title && m && !/[.!?:]$/.test(m[1])) { title = m[1]; text = m[2]; kind = 'Web page'; }
  if (!title) {
    const first = text.split('\n')[0] || '';
    title = first.split(' ').slice(0, 7).join(' ');
    if (title.length > 60) title = title.slice(0, 57).trimEnd();
    if (title && title.length < first.length) title += '…';
  }
  const meta = await addDoc({ title: title || 'Pasted text', kind, text });
  $('pasteText').value = ''; $('pasteTitle').value = '';
  closeSheets(); checkStorage(true); await openDoc(meta.id);
}
$('btnPaste').addEventListener('click', async () => {
  $('addErr').hidden = true;
  try { await addPasted($('pasteText').value, $('pasteTitle').value); }
  catch (err) { addError(err instanceof ReadError ? new ReadError('Paste some text first.') : err); }
});
$('btnClip').addEventListener('click', async () => {
  $('addErr').hidden = true;
  let text = '';
  try { text = await navigator.clipboard.readText(); }
  catch (e) { addError(new ReadError('The clipboard could not be read. Tap in the box below, choose Paste, then tap Add pasted text.')); return; }
  try { await addPasted(text, ''); }
  catch (err) { addError(err instanceof ReadError ? new ReadError('There is no text on the clipboard. Copy the article first.') : err); }
});
$('blufText').addEventListener('input', () => { if (doc) { doc.bluf = $('blufText').value; posDirty = true; } });
$('btnCopyNotes').addEventListener('click', () => {
  if (!(doc.bluf && doc.bluf.trim()) && !(doc.notes && doc.notes.length)) { toast('Nothing to copy yet'); return; }
  const text = notesText();
  const fallback = () => { const out = $('notesOut'); out.value = text; out.hidden = false; out.focus(); out.select(); toast('Select and copy the text below'); };
  try { navigator.clipboard.writeText(text).then(() => toast('Copied'), fallback); } catch (e) { fallback(); }
});
$('chkStart').addEventListener('click', () => { chkStep(2); chkT0 = performance.now(); });
$('chkDone').addEventListener('click', () => {
  const minutes = (performance.now() - chkT0) / 60000;
  const words = CHECK.text.split(/\s+/).filter(Boolean).length;
  chkWpm = minutes > 0 ? words / minutes : 0;
  chkStep(3);
});
$('chk3').addEventListener('submit', (e) => {
  e.preventDefault();
  let right = 0;
  CHECK.quiz.forEach((q, qi) => { const c = document.querySelector('input[name="chkq' + qi + '"]:checked'); if (c && Number(c.value) === q.ok) right++; });
  const wpm = clamp(Math.round(chkWpm / 10) * 10, 100, 900), tooFast = chkWpm > 1200;
  const res = $('chkResult'); res.textContent = '';
  res.append(tooFast ? 'Too fast to measure' : wpm + ' wpm', el('small', '', right + ' of ' + CHECK.quiz.length + ' questions right'));
  $('chkAdvice').textContent = tooFast ? 'That was faster than anyone reads. Run the check again and read the whole passage.'
    : right < 2 ? 'Understanding was low at this pace, so treat this number as too fast for careful reading. Run the check again a little slower.'
    : 'This is your normal pace with good understanding. Using it sets your speed and the presets.';
  $('chkUse').hidden = tooFast || right < 2;
  $('chkUse').dataset.wpm = String(wpm);
  chkStep(4);
});
$('chkUse').addEventListener('click', () => { const v = Number($('chkUse').dataset.wpm); S.base = v; setWpm(v); toast('Speed set to ' + v + ' wpm'); closeSheets(); });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (sheetOpen()) closeSheets(); return; }
  if ($('reader').hidden || sheetOpen() || (e.target.closest && e.target.closest('input, textarea, select'))) return;
  if (e.code === 'Space' && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); toggle(); }
  else if (e.key === 'ArrowLeft') prevSentence();
  else if (e.key === 'ArrowRight') nextSentence();
  else if (e.key === 'ArrowUp') { e.preventDefault(); setWpm(S.wpm + 10); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); setWpm(S.wpm - 10); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); savePos(); } });
window.addEventListener('resize', () => { if (T && !$('reader').hidden) render(); });
setInterval(() => { if (posDirty) savePos(); else if (statsDirty) { LS.set('sra.stats', stats); statsDirty = false; } }, 4000);

/* ---------- start ---------- */
(async function init() {
  applyLook();
  await Promise.race([DB.init(), new Promise((r) => setTimeout(r, 1500))]);
  if (!DB.list().length && (!LS.get('sra.seeded', false) || !DB.persistent)) {
    const t0 = Date.now();
    for (const s of SAMPLES) {
      const text = clean(s.text);
      await DB.add({ id: s.id, title: s.title, kind: 'Sample', added: t0 - s.order * 1000, opened: 0, n: tokenize(text).n, pos: 0, notes: [] }, text);
    }
    LS.set('sra.seeded', true);
  }
  renderLibrary();
  checkStorage(true);
})();
})();
