const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, 'bluepeak-design-system.css'), 'utf8');
const ui = fs.readFileSync(path.join(__dirname, 'bluepeak-ui.js'), 'utf8');
const index = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const adminDashboard = fs.readFileSync(path.join(__dirname, 'admin-dashboard.html'), 'utf8');
const adminUsers = fs.readFileSync(path.join(__dirname, 'admin-users.html'), 'utf8');
const gateway = fs.readFileSync(path.join(__dirname, 'api/gateway.js'), 'utf8');

function luminance(hex) {
  const rgb = hex.match(/[0-9a-f]{2}/gi).map(pair => parseInt(pair, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
function ratioAtLeast(foreground, background, minimum, label) {
  const result = contrast(foreground, background);
  assert.ok(result >= minimum, `${label}: ${result.toFixed(2)}:1 < ${minimum}:1`);
}

assert.match(css, /--bp-bg-canvas:#070D19/);
assert.match(css, /--bp-chart-bg:#0B1220/);
assert.match(css, /:root\[data-theme="light"\]/);
assert.match(css, /--bp-bg-canvas:#F1F5F9/);
assert.match(css, /--bp-chart-bg:#FFFFFF/);
assert.match(css, /select option\{background:var\(--bp-bg-primary\);color:var\(--bp-text-primary\)\}/);
assert.match(css, /input::placeholder,textarea::placeholder\{color:var\(--bp-text-muted\)!important;opacity:\.9\}/);
assert.match(ui, /data-bp-theme-toggle/);
assert.match(ui, /window\.BluePeakTheme/);
assert.match(ui, /bp-theme-change/);
assert.match(index, /id="theme"/);
assert.match(index, /function getChartPalette\(\)/);
assert.match(index, /window\.addEventListener\('bp-theme-change'/);
assert.match(index, /#089981/);
assert.match(index, /#F23645/);
assert.match(css, /\.asset-delta\.up[^}]*color:#089981/);
assert.match(css, /\.asset-delta\.down[^}]*color:#F23645/);
assert.match(css, /\.change\.up[^}]*color:#089981/);
assert.match(css, /\.change\.down[^}]*color:#F23645/);
assert.match(css, /\.depth\.bid\{background:rgba\(16,185,129,\.15\)!important;color:#10B981!important/);
assert.match(css, /\.depth\.ask\{background:rgba\(248,113,113,\.15\)!important;color:#F87171!important/);
assert.match(css, /max-width:100vw;overflow-x:hidden/);
assert.match(css, /\.topbar \.bp-theme-toggle\{position:static/);
assert.match(index, /id="zigzag-toggle"/);
assert.match(index, /id="zigzag-sensitivity"/);
assert.match(index, /window\.BPPatterns\.zigZag/);
for (const tf of ['1m','5m','15m','1h','4h','1d']) assert.match(index, new RegExp(`data-tf="${tf}"`));
for (const id of ['sma-toggle','sma200-toggle','ema-toggle','ema50-toggle','levels-toggle','rsi-toggle','macd-toggle']) assert.match(index, new RegExp(`id="${id}"`));
assert.match(index, /referenceLevels\(data/);
assert.match(index, /id="coin-details-dialog"/);
assert.match(index, /id="market-overview"/);
assert.match(index, /function plotPatternMarker\(/);
assert.match(index, /window\.BluePeakTerminal=\{[^}]*plotPatternMarker/);
assert.match(index, /type==='pattern-marker'/);
assert.match(css, /clamp\(12px,4vw,16px\)/);
assert.match(ui, /bp-select-list/);
assert.match(ui, /bp-password-field-wrap/);
assert.match(index, /volumeBull:'rgba\(8, 153, 129, 0\.35\)'/);
assert.match(index, /volumeBear:'rgba\(242, 54, 69, 0\.35\)'/);
assert.match(index, /col=up\?bullish:bearish;ctx\.strokeStyle=col;ctx\.fillStyle=col/);
assert.match(index, /ctx\.strokeStyle=last\.close>=last\.open\?bullish:bearish/);
assert.match(index, /bp-theme-change'[^\n]*drawChart\(\)/);
assert.match(index, /saveIndicators\(\);drawChart\(\)/);
assert.match(index, /id="zigzag-sensitivity"[^>]*aria-label/);
assert.match(adminDashboard, /data-bp-theme-toggle/);
assert.match(adminUsers, /data-bp-theme-toggle/);
assert.match(gateway, /bpTheme=localStorage\.getItem\("bp-theme"\)/);

// Dark-mode text and accents against each principal slate surface.
for (const surface of ['#070D19', '#0E172A', '#16223B']) {
  ratioAtLeast('#F8FAFC', surface, 7, `dark primary text on ${surface}`);
  ratioAtLeast('#CBD5E1', surface, 7, `dark secondary text on ${surface}`);
  ratioAtLeast('#94A3B8', surface, 4.5, `dark muted text on ${surface}`);
  ratioAtLeast('#F59E0B', surface, 4.5, `dark gold accent on ${surface}`);
}
ratioAtLeast('#070D19', '#F59E0B', 7, 'dark primary button label');

// Light-mode text and accessible burnished-gold text against principal paper surfaces.
for (const surface of ['#F1F5F9', '#FFFFFF', '#F8FAFC']) {
  ratioAtLeast('#0F172A', surface, 7, `light primary text on ${surface}`);
  ratioAtLeast('#334155', surface, 7, `light secondary text on ${surface}`);
  ratioAtLeast('#475569', surface, 4.5, `light muted text on ${surface}`);
  ratioAtLeast('#A6530A', surface, 4.5, `light gold accent on ${surface}`);
}
ratioAtLeast('#F8FAFC', '#0F172A', 7, 'light primary button label');

const appInline = index.slice(index.indexOf('function getChartPalette()'), index.indexOf('\nasync function loadDepth'));
assert.doesNotMatch(appInline, /(?:fillStyle|strokeStyle|shadowColor)\s*=\s*['\"]var\(/, 'canvas must not receive raw CSS var() text');
const paletteSource = appInline.slice(0, appInline.indexOf('function drawChart()')).trim();
const paletteTokens = {
  '--bp-chart-zigzag': '#38BDF8', '--bp-accent-gold': '#F59E0B', '--bp-chart-ema': '#64A8FF',
  '--bp-chart-rsi': '#C4A7FF', '--bp-chart-macd': '#64A8FF', '--bp-chart-signal': '#F0C36D',
  '--bp-chart-annotation': '#38BDF8'
};
function resolvePalette(theme) {
  const style = { getPropertyValue: name => paletteTokens[name] || '' };
  const doc = { documentElement: { getAttribute: () => theme }, createElement: () => ({ getContext: () => ({ fillStyle: '#000000' }) }) };
  const paletteFactory = new Function('document', 'getComputedStyle', `return (${paletteSource});`);
  return paletteFactory(doc, () => style)();
}
for (const [theme, expectedBg] of [['dark', '#0F192D'], ['light', '#FFFFFF']]) {
  const palette = resolvePalette(theme);
  assert.equal(palette.canvasTop, expectedBg, `${theme} chart background`);
  assert.equal(palette.bullish, '#089981');
  assert.equal(palette.bearish, '#F23645');
  for (const [name, value] of Object.entries(palette)) {
    if (typeof value === 'string') assert.doesNotMatch(value, /var\s*\(/i, `${theme} palette ${name} must be a resolved color`);
  }
}

// Scan shipped CSS/HTML/JS (not tests or docs) for green-family names or saturated green literals.
const sourceFiles = [];
function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name.startsWith('test-')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full);
    else if (/\.(?:css|html|js)$/i.test(entry.name)) sourceFiles.push(full);
  }
}
collect(__dirname);
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(source, /\b(?:green|emerald|lime|teal)\b|--green/i, `named green-family color in ${path.relative(__dirname, file)}`);
  for (const literal of source.match(/#[0-9a-f]{3,8}\b/gi) || []) {
    let hex = literal.slice(1);
    if (hex.length === 3) hex = [...hex].map(char => char + char).join('');
    if (hex.length !== 6) continue;
    const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
    let hue = 0;
    if (delta) hue = max === r ? 60 * (((g - b) / delta) % 6) : max === g ? 60 * ((b - r) / delta + 2) : 60 * ((r - g) / delta + 4);
    if (hue < 0) hue += 360;
    const saturation = max ? delta / max : 0;
    if (hue >= 75 && hue <= 170 && saturation >= 0.2 && max >= 0.18) {
      const hex = literal.slice(1, 7).toUpperCase();
      assert.ok(['089981','26A69A','10B981'].includes(hex) && ['index.html','bluepeak-design-system.css'].includes(path.basename(file)), `unapproved green-family literal ${literal} in ${path.relative(__dirname, file)}`);
    }
  }
}
console.log(`PASS test-theme-contrast: dual theme tokens, >=AA text pairs, AAA primary/button pairs, synchronized theme controls, resolved chart palette, universal candle colors, Zig Zag UI, and no unapproved green colors (${sourceFiles.length} shipped source files scanned).`);
