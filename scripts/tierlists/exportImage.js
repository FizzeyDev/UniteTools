/**
 * exportImage.js - Export the current tierlist as a PNG image
 *
 * Drawn straight on a <canvas> (no screenshot library): title, patch version
 * and date, one row per tier, the sprites of every item, and a UniteTools
 * watermark. A small dialog lets the user pick names on/off, dark/light and
 * the resolution, with a live preview, then download or copy the image.
 */

import state from './state.js';
import { getBasePath } from './dataLoader.js';

const THEMES = {
  dark:  { bg: '#14202a', row: '#1c2b38', text: '#e8f0f1', dim: '#8fa6ab', line: '#2b3d4a' },
  light: { bg: '#f3f7f8', row: '#ffffff', text: '#1a2e30', dim: '#5a7577', line: '#d3e0e2' },
};

const W = 1200;          // logical width (scaled afterwards)
const PAD = 24;
const LABEL_W = 130;
const SPRITE = 72;
const GAP = 8;
const NAME_H = 16;

let latestPatch = null;   // { version, date } cached

// ── Helpers ─────────────────────────────────────────────────────────────────

const t = (key, fb) => window.translations?.[localStorage.getItem('lang') || 'fr']?.[key] ?? fb;

async function getLatestPatch() {
  if (latestPatch) return latestPatch;
  try {
    const d = await (await fetch('data/patches.json')).json();
    const list = (d.patches || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    if (list[0]) latestPatch = { version: list[0].version, date: list[0].date };
  } catch { /* offline: no patch line */ }
  return latestPatch;
}

const imgCache = new Map();
function loadImage(src) {
  if (!imgCache.has(src)) {
    imgCache.set(src, new Promise(resolve => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = src;
    }));
  }
  return imgCache.get(src);
}

function textColorFor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.62 ? '#10202a' : '#ffffff';
}

function fitText(ctx, text, maxW, startSize, weight = '800') {
  let size = startSize;
  do { ctx.font = `${weight} ${size}px 'Exo 2', Roboto, Arial, sans-serif`; size -= 1; }
  while (ctx.measureText(text).width > maxW && size > 9);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ── Rendering ───────────────────────────────────────────────────────────────

export async function renderTierlistCanvas(draft, { names = true, theme = 'dark', scale = 2 } = {}) {
  const th = THEMES[theme] || THEMES.dark;
  const base = getBasePath();
  const patch = await getLatestPatch();

  const cellH = SPRITE + (names ? NAME_H : 0);
  const cols = Math.max(1, Math.floor((W - PAD * 2 - LABEL_W - GAP) / (SPRITE + GAP)));
  const headerH = 78;
  const footerH = 40;

  const rows = draft.tiers.map(tier => {
    const lines = Math.max(1, Math.ceil(tier.items.length / cols));
    return { tier, h: Math.max(SPRITE + GAP * 2, lines * (cellH + GAP) + GAP) };
  });
  const H = headerH + rows.reduce((s, r) => s + r.h + 6, 0) + footerH + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.textBaseline = 'middle';

  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.textAlign = 'left';
  ctx.fillStyle = th.text;
  fitText(ctx, draft.label || 'Tierlist', W - PAD * 2 - 260, 34, '800');
  ctx.fillText(draft.label || 'Tierlist', PAD, 38);
  ctx.fillStyle = th.dim;
  ctx.font = "600 15px 'Exo 2', Roboto, Arial, sans-serif";
  const sub = patch ? `Patch ${patch.version} · ${patch.date}` : new Date().toISOString().slice(0, 10);
  ctx.fillText(sub, PAD, 64);

  // Logo + brand (top right)
  const logo = await loadImage(`${base}assets/favicon.svg`);
  ctx.textAlign = 'right';
  ctx.fillStyle = th.text;
  ctx.font = "800 20px 'Exo 2', Roboto, Arial, sans-serif";
  ctx.fillText('UniteTools', W - PAD, 34);
  ctx.fillStyle = th.dim;
  ctx.font = "600 13px 'Exo 2', Roboto, Arial, sans-serif";
  ctx.fillText('unite-tools.com', W - PAD, 56);
  if (logo) ctx.drawImage(logo, W - PAD - 150, 14, 32, 32);

  // Tier rows
  let y = headerH;
  for (const { tier, h } of rows) {
    ctx.fillStyle = th.row;
    roundRect(ctx, PAD, y, W - PAD * 2, h, 10);
    ctx.fill();

    ctx.save();
    roundRect(ctx, PAD, y, LABEL_W, h, 10);
    ctx.clip();
    ctx.fillStyle = tier.color || '#4a90e2';
    ctx.fillRect(PAD, y, LABEL_W, h);
    ctx.restore();

    ctx.fillStyle = textColorFor(tier.color);
    ctx.textAlign = 'center';
    fitText(ctx, tier.name, LABEL_W - 20, 40, '800');
    ctx.fillText(tier.name, PAD + LABEL_W / 2, y + h / 2);

    const imgs = await Promise.all(tier.items.map(it => loadImage(`${base}assets/${it.category}/${it.file}`)));
    tier.items.forEach((it, i) => {
      const cx = PAD + LABEL_W + GAP + (i % cols) * (SPRITE + GAP);
      const cy = y + GAP + Math.floor(i / cols) * (cellH + GAP);
      const im = imgs[i];
      if (im) {
        const r = Math.min(SPRITE / im.width, SPRITE / im.height);
        const w = im.width * r, hh = im.height * r;
        ctx.drawImage(im, cx + (SPRITE - w) / 2, cy + (SPRITE - hh) / 2, w, hh);
      } else {
        ctx.fillStyle = th.line;
        roundRect(ctx, cx, cy, SPRITE, SPRITE, 8);
        ctx.fill();
      }
      if (names) {
        ctx.fillStyle = th.dim;
        ctx.textAlign = 'center';
        fitText(ctx, it.name, SPRITE + 4, 11, '600');
        ctx.fillText(it.name, cx + SPRITE / 2, cy + SPRITE + NAME_H / 2);
      }
    });

    y += h + 6;
  }

  // Footer watermark
  ctx.textAlign = 'center';
  ctx.fillStyle = th.dim;
  ctx.globalAlpha = 0.8;
  ctx.font = "600 13px 'Exo 2', Roboto, Arial, sans-serif";
  ctx.fillText('Made with UniteTools · unite-tools.com/tierlist.html', W / 2, H - footerH / 2 - 4);
  ctx.globalAlpha = 1;

  return canvas;
}

const toBlob = canvas => new Promise(res => canvas.toBlob(res, 'image/png'));

// ── Dialog ──────────────────────────────────────────────────────────────────

let dlg;
let busy = 0;

function buildDialog() {
  dlg = document.createElement('div');
  dlg.className = 'tl-img-modal';
  dlg.innerHTML = `
    <div class="tl-img-box" role="dialog" aria-modal="true">
      <div class="tl-img-head">
        <h2></h2>
        <button type="button" class="tl-img-close" aria-label="Close">✕</button>
      </div>
      <div class="tl-img-opts">
        <label><input type="checkbox" data-o="names" checked><span data-l="names"></span></label>
        <label><span data-l="theme"></span>
          <select data-o="theme"><option value="dark"></option><option value="light"></option></select></label>
        <label><span data-l="size"></span>
          <select data-o="scale"><option value="1">1x</option><option value="2" selected>2x</option><option value="3">3x</option></select></label>
      </div>
      <div class="tl-img-preview"><canvas></canvas></div>
      <div class="tl-img-foot">
        <button type="button" class="tl-img-btn" data-a="copy"></button>
        <button type="button" class="tl-img-btn primary" data-a="download"></button>
      </div>
    </div>`;
  document.body.appendChild(dlg);

  dlg.addEventListener('click', e => { if (e.target === dlg) closeDialog(); });
  dlg.querySelector('.tl-img-close').addEventListener('click', closeDialog);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && dlg.classList.contains('open')) closeDialog(); });
  dlg.querySelectorAll('[data-o]').forEach(el => el.addEventListener('change', refresh));
  dlg.querySelector('[data-a=download]').addEventListener('click', download);
  dlg.querySelector('[data-a=copy]').addEventListener('click', copyImage);
}

function labels() {
  dlg.querySelector('h2').textContent = t('tierlist_img_title', '📷 Export as image');
  dlg.querySelector('[data-l=names]').textContent = t('tierlist_img_names', 'Show names');
  dlg.querySelector('[data-l=theme]').textContent = t('tierlist_img_theme', 'Theme');
  dlg.querySelector('[data-l=size]').textContent = t('tierlist_img_size', 'Resolution');
  const sel = dlg.querySelector('[data-o=theme]');
  sel.options[0].textContent = t('tierlist_img_dark', 'Dark');
  sel.options[1].textContent = t('tierlist_img_light', 'Light');
  dlg.querySelector('[data-a=copy]').textContent = t('tierlist_img_copy', '📋 Copy image');
  dlg.querySelector('[data-a=download]').textContent = t('tierlist_img_download', '⬇ Download PNG');
}

const options = () => ({
  names: dlg.querySelector('[data-o=names]').checked,
  theme: dlg.querySelector('[data-o=theme]').value,
  scale: Number(dlg.querySelector('[data-o=scale]').value),
});

let current = null;   // last rendered canvas

async function refresh() {
  const draft = state.drafts.find(d => d.id === state.currentDraft);
  if (!draft) return;
  const id = ++busy;
  const canvas = await renderTierlistCanvas(draft, options());
  if (id !== busy) return;              // a newer render superseded this one
  current = canvas;
  const prev = dlg.querySelector('.tl-img-preview canvas');
  prev.width = canvas.width;
  prev.height = canvas.height;
  prev.getContext('2d').drawImage(canvas, 0, 0);
}

async function download() {
  if (!current) return;
  const blob = await toBlob(current);
  const draft = state.drafts.find(d => d.id === state.currentDraft);
  const name = (draft?.label || 'tierlist').replace(/[^\w\-]+/g, '_');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  window.showToast?.(t('tierlist_img_downloaded', 'Image downloaded'), 'success');
}

async function copyImage() {
  if (!current) return;
  try {
    const blob = await toBlob(current);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    window.showToast?.(t('tierlist_img_copied', 'Image copied'), 'success');
  } catch {
    window.showToast?.(t('tierlist_img_copy_failed', 'Copy not supported here - use Download'), 'error');
  }
}

function closeDialog() { dlg?.classList.remove('open'); }

export function openImageExport() {
  if (!dlg) buildDialog();
  labels();
  dlg.classList.add('open');
  refresh();
}

export function setupImageExport() {
  document.getElementById('export-image')?.addEventListener('click', openImageExport);
}