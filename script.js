/*COLOR-START*/
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rot = (h, d) => ((h + d) % 360 + 360) % 360;

function normHex(str) {
  let s = String(str).trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(s)) s = s.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return '#' + s.toUpperCase();
}
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, l * 100];
}
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
const hslToHex = (h, s, l) => rgbToHex(...hslToRgb(rot(h, 0), clamp(s, 0, 100), clamp(l, 0, 100)));
const hexToHsl = hex => rgbToHsl(...hexToRgb(hex));
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function rating(ratio) {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'Large only';
  return 'Fail';
}
/*COLOR-END*/

const INK = '#12171A', PAPER = '#FFFFFF';
const bestText = hex => (contrast(hex, PAPER) >= contrast(hex, INK) ? PAPER : INK);

const MODES = {
  analogous: {
    label: 'Analogous',
    make: (h, s, l) => [
      [rot(h, -30), s, l - 6, 'Cooler'],
      [rot(h, -15), s, l, 'Cool'],
      [h, s, l, 'Base'],
      [rot(h, 15), s, l, 'Warm'],
      [rot(h, 30), s, l + 8, 'Warmer']
    ]
  },
  complementary: {
    label: 'Complementary',
    make: (h, s, l) => [
      [h, s, l, 'Base'],
      [h, s * 0.8, l + 26, 'Base tint'],
      [rot(h, 180), s, l, 'Complement'],
      [rot(h, 180), s, l - 20, 'Complement shade'],
      [h, Math.min(s, 20), 12, 'Ink']
    ]
  },
  triadic: {
    label: 'Triadic',
    make: (h, s, l) => [
      [h, s, l, 'Base'],
      [rot(h, 120), s, l, 'Second'],
      [rot(h, 240), s, l, 'Third'],
      [h, Math.min(s, 14), 95, 'Paper'],
      [h, Math.min(s, 20), 12, 'Ink']
    ]
  },
  split: {
    label: 'Split complementary',
    make: (h, s, l) => [
      [h, s, l, 'Base'],
      [rot(h, 150), s, l, 'Split A'],
      [rot(h, 210), s, l, 'Split B'],
      [h, Math.min(s, 14), 95, 'Paper'],
      [h, Math.min(s, 20), 12, 'Ink']
    ]
  },
  tetradic: {
    label: 'Tetradic',
    make: (h, s, l) => [
      [h, s, l, 'Base'],
      [rot(h, 90), s, l, 'Quarter'],
      [rot(h, 180), s, l, 'Opposite'],
      [rot(h, 270), s, l, 'Three quarter'],
      [h, Math.min(s, 14), 95, 'Paper']
    ]
  },
  mono: {
    label: 'Monochrome',
    make: (h, s, l) => [
      [h, s, clamp(l - 32, 6, 95), 'Deepest'],
      [h, s, clamp(l - 16, 6, 95), 'Deep'],
      [h, s, l, 'Base'],
      [h, s, clamp(l + 16, 6, 95), 'Light'],
      [h, s * 0.7, clamp(l + 32, 6, 96), 'Lightest']
    ]
  }
};

const SCALE = [
  [50, 96], [100, 91], [200, 82], [300, 71], [400, 60],
  [500, 49], [600, 39], [700, 29], [800, 19], [900, 11]
];

const state = { base: '#1F6F78', mode: 'analogous', fmt: 'css' };
let palette = [];

function buildPalette() {
  const [h, s, l] = hexToHsl(state.base);
  palette = MODES[state.mode].make(h, s, l).map(([ph, ps, pl, role]) => ({
    role,
    hex: hslToHex(ph, clamp(ps, 0, 100), clamp(pl, 3, 97))
  }));
  palette[state.mode === 'mono' ? 2 : state.mode === 'analogous' ? 2 : 0].hex = state.base;
}

const $ = sel => document.querySelector(sel);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 1600);
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  document.body.removeChild(ta);
  return ok;
}
function copy(text, label) {
  const done = () => toast('Copied ' + (label || text));
  const fail = () => { fallbackCopy(text) ? done() : toast('Select and copy manually'); };
  try {
    navigator.clipboard.writeText(text).then(done, fail);
  } catch (e) { fail(); }
}

function renderModes() {
  $('#modes').innerHTML = Object.entries(MODES).map(([key, m]) =>
    `<label class="pill"><input type="radio" name="mode" value="${key}"${key === state.mode ? ' checked' : ''}><span>${esc(m.label)}</span></label>`
  ).join('');
}

function renderStrips() {
  $('#strips').innerHTML = palette.map((c, i) => {
    const fg = bestText(c.hex);
    const ratio = contrast(c.hex, fg);
    const [r, g, b] = hexToRgb(c.hex);
    const [h, s, l] = hexToHsl(c.hex);
    return `<button class="chip" type="button" data-i="${i}" style="background:${c.hex};color:${fg}" aria-label="Copy ${c.hex}, ${esc(c.role)}">
      <span class="role">${esc(c.role)}</span>
      <span>
        <span class="hex">${c.hex}</span>
        <span class="meta" style="display:block">rgb ${r} ${g} ${b}<br>hsl ${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%</span>
        <span class="badge">Aa <b>${ratio.toFixed(1)}</b> ${rating(ratio)}</span>
      </span>
    </button>`;
  }).join('');
}

function renderScale() {
  const [h, s, l] = hexToHsl(state.base);
  let nearest = 0, best = 1e9;
  SCALE.forEach(([, sl], i) => { const d = Math.abs(sl - l); if (d < best) { best = d; nearest = i; } });
  $('#scale').innerHTML = SCALE.map(([n, sl], i) => {
    const hex = hslToHex(h, s, sl);
    const fg = bestText(hex);
    return `<button class="step" type="button" data-hex="${hex}" style="background:${hex};color:${fg}" aria-label="Copy ${n}, ${hex}">
      ${i === nearest ? '<span class="tag"></span>' : ''}
      <span class="n">${n}</span><span class="h">${hex.slice(1)}</span>
    </button>`;
  }).join('');
}

function renderMatrix() {
  const head = '<thead><tr><th></th>' + palette.map(c =>
    `<th scope="col"><span class="dot" style="background:${c.hex}"></span>${esc(c.role)}</th>`).join('') + '</tr></thead>';
  const rows = palette.map((fg, ri) => {
    const cells = palette.map((bg, ci) => {
      if (ri === ci) return '<td class="self">–</td>';
      const ratio = contrast(fg.hex, bg.hex);
      const rt = rating(ratio);
      const ok = ratio >= 4.5;
      return `<td><div class="cell"><span class="aa" style="background:${bg.hex};color:${fg.hex}">Aa</span><span class="ratio${ok ? ' ok' : ''}">${ratio.toFixed(1)} <b>${rt}</b></span></div></td>`;
    }).join('');
    return `<tr><th scope="row"><span class="dot" style="background:${fg.hex}"></span>${esc(fg.role)} ${fg.hex}</th>${cells}</tr>`;
  }).join('');
  $('#matrix').innerHTML = head + '<tbody>' + rows + '</tbody>';
}

function slugs() {
  const seen = {};
  return palette.map(c => {
    let s = c.role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    seen[s] = (seen[s] || 0) + 1;
    return seen[s] > 1 ? s + '-' + seen[s] : s;
  });
}
function exportText() {
  const sl = slugs();
  if (state.fmt === 'json') {
    return JSON.stringify({
      base: state.base,
      harmony: state.mode,
      colors: palette.map((c, i) => ({ name: sl[i], hex: c.hex }))
    }, null, 2);
  }
  if (state.fmt === 'tailwind') {
    return "// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n        swatch: {\n" +
      palette.map((c, i) => `          '${sl[i]}': '${c.hex}'`).join(',\n') +
      "\n        }\n      }\n    }\n  }\n}";
  }
  return ':root {\n' + palette.map((c, i) => `  --swatch-${sl[i]}: ${c.hex};`).join('\n') + '\n}';
}
function renderExport() {
  $('#exportOut').textContent = exportText();
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.fmt === state.fmt)));
}

function loadSaved() {
  try { const v = JSON.parse(localStorage.getItem('swatchbook.saved') || '[]'); return Array.isArray(v) ? v : []; }
  catch (e) { return []; }
}
function storeSaved(list) {
  try { localStorage.setItem('swatchbook.saved', JSON.stringify(list)); } catch (e) { /* storage unavailable */ }
}
let savedList = loadSaved();
function renderSaved() {
  const box = $('#saved');
  if (!savedList.length) {
    box.innerHTML = '<div class="empty" style="grid-column:1/-1">Nothing saved yet. Use Save palette above to keep one you like.</div>';
    return;
  }
  box.innerHTML = savedList.map((p, i) => `<div class="save-card">
    <button class="mini" type="button" data-load="${i}" aria-label="Load palette based on ${esc(p.base)}">${p.colors.map(c => `<i style="background:${esc(c)}"></i>`).join('')}</button>
    <div class="row"><span>${esc(p.base)} · ${esc((MODES[p.mode] || MODES.analogous).label)}</span><button class="x" type="button" data-del="${i}" aria-label="Remove saved palette">Remove</button></div>
  </div>`).join('');
}

function render(skipHexInput) {
  buildPalette();
  $('#picker').value = state.base.toLowerCase();
  if (!skipHexInput) { $('#hexIn').value = state.base; $('#hexIn').removeAttribute('aria-invalid'); }
  renderStrips();
  renderScale();
  renderMatrix();
  renderExport();
}

/* events */
$('#modes').addEventListener('change', e => {
  if (e.target.name === 'mode') { state.mode = e.target.value; render(); }
});
$('#picker').addEventListener('input', e => { state.base = e.target.value.toUpperCase(); render(); });
$('#hexIn').addEventListener('input', e => {
  const h = normHex(e.target.value);
  if (h) { e.target.removeAttribute('aria-invalid'); state.base = h; render(true); }
  else e.target.setAttribute('aria-invalid', 'true');
});
$('#hexIn').addEventListener('blur', e => { if (normHex(e.target.value)) e.target.value = state.base; });

function shuffle() {
  const h = Math.random() * 360, s = 45 + Math.random() * 35, l = 36 + Math.random() * 22;
  state.base = hslToHex(h, s, l);
  render();
}
$('#shuffle').addEventListener('click', shuffle);
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); shuffle(); }
});

$('#strips').addEventListener('click', e => {
  const b = e.target.closest('.chip');
  if (b) copy(palette[+b.dataset.i].hex);
});
$('#scale').addEventListener('click', e => {
  const b = e.target.closest('.step');
  if (b) copy(b.dataset.hex);
});
$('#tabs').addEventListener('click', e => {
  const t = e.target.closest('.tab');
  if (t) { state.fmt = t.dataset.fmt; renderExport(); }
});
$('#copyExport').addEventListener('click', () => copy(exportText(), 'export'));

$('#save').addEventListener('click', () => {
  const colors = palette.map(c => c.hex);
  if (savedList.some(p => p.base === state.base && p.mode === state.mode)) { toast('Already saved'); return; }
  savedList.unshift({ base: state.base, mode: state.mode, colors });
  savedList = savedList.slice(0, 12);
  storeSaved(savedList);
  renderSaved();
  toast('Palette saved');
});
$('#saved').addEventListener('click', e => {
  const l = e.target.closest('[data-load]');
  const d = e.target.closest('[data-del]');
  if (l) {
    const p = savedList[+l.dataset.load];
    if (p && normHex(p.base) && MODES[p.mode]) { state.base = p.base; state.mode = p.mode; renderModes(); render(); }
  } else if (d) {
    savedList.splice(+d.dataset.del, 1);
    storeSaved(savedList);
    renderSaved();
  }
});

renderModes();
render();
renderSaved();
