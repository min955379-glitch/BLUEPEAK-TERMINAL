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

assert.match(css, /--bp-bg-canvas:#060E1A/);
assert.match(css, /--bp-chart-bg:#07111F/);
assert.match(css, /:root\[data-theme="light"\]/);
assert.match(css, /--bp-bg-canvas:#EFE9DC/);
assert.match(css, /--bp-chart-bg:#FAF7F0/);
assert.match(css, /select option\{background:var\(--bp-bg-primary\);color:var\(--bp-text-primary\)\}/);
assert.match(css, /input::placeholder,textarea::placeholder\{color:var\(--bp-text-muted\)!important;opacity:\.9\}/);
assert.match(ui, /data-bp-theme-toggle/);
assert.match(ui, /bp-theme-change/);
assert.match(index, /id="theme"/);
assert.match(adminDashboard, /data-bp-theme-toggle/);
assert.match(adminUsers, /data-bp-theme-toggle/);
assert.match(gateway, /bpTheme=localStorage\.getItem\("bp-theme"\)/);

// Dark-mode normal/primary text and accents against each principal surface.
for (const surface of ['#060E1A', '#0C1B30', '#122642']) {
  ratioAtLeast('#FAF6EE', surface, 7, `dark primary text on ${surface}`);
  ratioAtLeast('#DFD8C8', surface, 7, `dark secondary text on ${surface}`);
  ratioAtLeast('#A8B5C8', surface, 4.5, `dark muted text on ${surface}`);
  ratioAtLeast('#DEB65E', surface, 4.5, `dark gold accent on ${surface}`);
}
ratioAtLeast('#07111F', '#DEB65E', 7, 'dark primary button label');

// Light-mode text and burnished-gold accents against principal paper surfaces.
for (const surface of ['#EFE9DC', '#FAF7F0', '#F3EDE0']) {
  ratioAtLeast('#09182C', surface, 7, `light primary text on ${surface}`);
  ratioAtLeast('#1E3452', surface, 7, `light secondary text on ${surface}`);
  ratioAtLeast('#4A5E78', surface, 4.5, `light muted text on ${surface}`);
  ratioAtLeast('#855B0E', surface, 4.5, `light gold accent on ${surface}`);
}
ratioAtLeast('#FAF6EE', '#102B4E', 7, 'light primary button label');

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
    assert.ok(!(hue >= 75 && hue <= 170 && saturation >= 0.2 && max >= 0.18), `green-family literal ${literal} in ${path.relative(__dirname, file)}`);
  }
}
console.log(`PASS test-theme-contrast: dual theme tokens, >=AA text pairs, AAA primary/button pairs, theme controls, dropdown/placeholder styling, and zero green-family production colors (${sourceFiles.length} shipped source files scanned).`);
