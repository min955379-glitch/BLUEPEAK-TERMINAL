const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, 'bluepeak-design-system.css'), 'utf8');
const ui = fs.readFileSync(path.join(__dirname, 'bluepeak-ui.js'), 'utf8');
const accessUI = fs.readFileSync(path.join(__dirname, 'bluepeak-access-ui.js'), 'utf8');
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
function orderbookRules(source){return (source.match(/[^{}]+\{[^{}]*\}/g)||[]).filter(rule=>/\.orderbook|\.depth|\.book-row|\.mid-price|\.spread/.test(rule.split('{')[0]))}
for(const rule of [...orderbookRules(index),...orderbookRules(css)])assert.doesNotMatch(rule, /#D6AD55|#DEB65E|#F59E0B|#EAB308|214\s*,\s*173\s*,\s*85|222\s*,\s*182\s*,\s*94|245\s*,\s*158\s*,\s*11|var\(--(?:bp-accent-gold|gold)\)|yellow|amber/i, `yellow/gold order-book styling remains: ${rule}`);
assert.match(css, /\.orderbook \.depth\.bid\{background:rgba\(16,185,129,\.16\)!important;border-left:2px solid rgba\(16,185,129,\.45\)!important/);
assert.match(css, /\.orderbook \.depth\.ask\{background:rgba\(248,113,113,\.16\)!important;border-left:2px solid rgba\(248,113,113,\.45\)!important/);
assert.match(css, /\.orderbook \.mid-price\{background:#111C32;color:#F8FAFC/);
assert.match(css, /html\[data-theme=\"light\"\] \.orderbook \.mid-price\{background:#F1F5F9;color:#0F172A/);
assert.match(css, /\[hidden\],\.bp-select-menu\[hidden\][^}]*display:none!important[^}]*visibility:hidden!important/);
assert.match(css, /\.bp-select-menu:not\(\.is-open\)[^}]*display:none!important/);
assert.ok((css.match(/\[hidden\],\.bp-select-menu\[hidden\]/g)||[]).length>=2,'global hidden/closed enforcement is present at both the start and end of the design system stylesheet');
assert.match(index, /\[hidden\],\.bp-select-menu\[hidden\][^}]*display:none!important/);
assert.match(ui, /function closeAllSelectMenus\(/);
assert.match(ui, /selectMenuManager\.register\(record\)/);
assert.match(ui, /selectPortal\.hidden=true/);
assert.match(ui, /selectMenuManager\.open\(record\)/);
assert.match(ui, /bp-select-backdrop/);
assert.doesNotMatch(ui, /addEventListener\(['\"](?:scroll|resize)['\"][^;]*closeAllSelectMenus/, 'dropdowns must not auto-close on scroll or viewport changes');
assert.match(ui, /select\.closest\('label'\)/, 'custom select enhancement detects wrapping labels');
assert.match(ui, /labelEl\.parentNode\.insertBefore\(wrapper,labelEl\.nextSibling\)/, 'portal trigger is moved outside wrapping label to prevent synthetic activation');
assert.match(ui, /select\.style\.setProperty\('pointer-events','none','important'\)/);
assert.match(ui, /select\.tabIndex=-1/);
assert.match(ui, /selectPortal\.dataset\.openedAt=String\(openedAt\)/);
assert.match(ui, /window\.__bpSelectLastOpenedAt=openedAt/);
assert.match(ui, /Date\.now\(\)-\(window\.__bpSelectLastOpenedAt\|\|0\)<350/);
assert.match(ui, /data-bp-select-title/);
assert.match(ui, /✕ Close/);
assert.match(css, /\.bp-select-menu\.is-mobile\{[^}]*bottom:calc\(16px \+ env\(safe-area-inset-bottom\)\)[^}]*max-height:68vh!important[^}]*-webkit-overflow-scrolling:touch!important[^}]*z-index:100001!important/);
assert.match(css, /\.bp-select-backdrop:not\(\[hidden\]\)\{[^}]*z-index:100000[^}]*rgba\(4,10,22,\.72\)/);
assert.match(accessUI, /bp_last_full_scan_snapshot_v2/);
assert.match(accessUI, /SCAN_SNAPSHOT_TTL=5\*60\*1000/);
assert.match(accessUI, /Cached · Refreshing live/);
assert.match(accessUI, /onProgress:p=>/);
assert.match(accessUI, /partialResults/);
assert.match(accessUI, /limit:320,dailyLimit:60,concurrency:9/);
assert.match(ui, /select\.dispatchEvent\(new Event\('change',\{bubbles:true\}\)\)/);
assert.doesNotMatch(ui, /bp-select-list\[data-open/);
assert.match(css, /\.bp-select-control,\.bp-select-trigger\{[^}]*min-height:40px/);
assert.match(css, /\.bp-select-menu\.is-open\{[^}]*display:block!important/);
// Exercise the same open/close manager used by the enhancer with several simulated select records.
const vm = require('node:vm');
const fakeDocument = { readyState:'loading', addEventListener(){}, querySelector(){return null}, querySelectorAll(){return []} };
const fakeWindow = { addEventListener(){}, matchMedia(){return {matches:false}}, innerWidth:1280, innerHeight:800 };
const context = { window:fakeWindow, document:fakeDocument, setTimeout, clearTimeout, console, Event:function(){}, CustomEvent:function(){}, MutationObserver:function(){} };
vm.runInNewContext(ui,context);
const manager=fakeWindow.BluePeakSelects.createSelectMenuManager();
const records=[];function fakeElement(){const classes=new Set();return{hidden:false,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},attrs:{},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]}}}
for(let i=0;i<9;i++){const record={menu:fakeElement(),control:fakeElement()};manager.register(record);records.push(record)}
assert.equal(manager.getOpenCount(),0,'nine controls start with all menus hidden');
assert.ok(records.every(r=>r.menu.hidden&&!r.menu.classList.contains('is-open')&&r.control.attrs['aria-expanded']==='false'));
manager.open(records[3]);assert.equal(manager.getOpenCount(),1);assert.equal(manager.active,records[3]);
manager.open(records[7]);assert.equal(manager.getOpenCount(),1,'opening another control closes the previously active menu');assert.equal(manager.active,records[7]);
manager.closeAll();assert.equal(manager.getOpenCount(),0);assert.ok(records.every(r=>r.menu.hidden&&r.control.attrs['aria-expanded']==='false'));

(async()=>{
// Exercise the actual select enhancer with a wrapping label at a mobile viewport.
class MiniElement {
  constructor(tag, owner) { this.tagName=tag.toUpperCase(); this.owner=owner; this.children=[]; this.parentNode=null; this.attrs={}; this.dataset={}; this.hidden=false; this.disabled=false; this.tabIndex=0; this.style={setProperty(){}}; this.listeners={}; this._className=''; this.classList={add:(...xs)=>xs.forEach(x=>this._classSet().add(x)),remove:(...xs)=>xs.forEach(x=>this._classSet().delete(x)),contains:x=>this._classSet().has(x),toggle:(x,on)=>{const set=this._classSet();if(on===undefined)on=!set.has(x);on?set.add(x):set.delete(x);return on}}; }
  _classSet(){if(!this._classes)this._classes=new Set(this._className.split(/\s+/).filter(Boolean));return this._classes}
  set className(value){this._className=value;this._classes=new Set(String(value).split(/\s+/).filter(Boolean))} get className(){return [...this._classSet()].join(' ')}
  setAttribute(k,v){this.attrs[k]=String(v)} getAttribute(k){return this.attrs[k]??null} removeAttribute(k){delete this.attrs[k]}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)} dispatchEvent(e){e.target??=this;for(const fn of this.listeners[e.type]||[])fn(e);return !e.defaultPrevented}
  append(...nodes){for(const n of nodes){if(!n)continue;if(n.parentNode)n.parentNode.removeChild(n);this.children.push(n);n.parentNode=this}}
  appendChild(n){this.append(n);return n}
  insertBefore(n,ref){if(n.parentNode)n.parentNode.removeChild(n);const i=ref?this.children.indexOf(ref):-1;if(i<0)this.children.push(n);else this.children.splice(i,0,n);n.parentNode=this;return n}
  removeChild(n){const i=this.children.indexOf(n);if(i>=0)this.children.splice(i,1);n.parentNode=null;return n}
  replaceChildren(...nodes){for(const n of this.children)n.parentNode=null;this.children=[];this.append(...nodes)}
  contains(node){for(let n=node;n;n=n.parentNode)if(n===this)return true;return false}
  closest(selector){for(let n=this;n;n=n.parentNode)if((selector.startsWith('.')&&n.classList?.contains(selector.slice(1)))||n.tagName?.toLowerCase()===selector.toLowerCase())return n;return null}
  querySelectorAll(selector){const all=[];const walk=n=>n.children.forEach(c=>{all.push(c);walk(c)});walk(this);return all.filter(n=>selector==='[role="option"]'?n.getAttribute('role')==='option':selector==='[role="listbox"]'?n.getAttribute('role')==='listbox':selector==='[aria-selected="true"]'?n.getAttribute('aria-selected')==='true':selector==='[data-bp-select-header]'?Object.hasOwn(n.dataset,'bpSelectHeader'):selector==='[data-bp-select-title]'?Object.hasOwn(n.dataset,'bpSelectTitle'):false)}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null}
  focus(){this.owner.activeElement=this}
  get isConnected(){let n=this;while(n.parentNode)n=n.parentNode;return n===this.owner.body}
  getBoundingClientRect(){return{left:20,bottom:100,width:120}}
  get textContent(){return this._textContent||this.children.map(x=>x.textContent||'').join(' ')} set textContent(x){this._textContent=String(x);this.replaceChildren()}
}
const mobileDoc={readyState:'loading',listeners:{},activeElement:null,querySelectorAll(){return [mobileSelect]},querySelector(){return null},addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)},createElement(tag){return new MiniElement(tag,this)}};
mobileDoc.body=new MiniElement('body',mobileDoc);mobileDoc.documentElement=new MiniElement('html',mobileDoc);mobileDoc.documentElement.setAttribute('data-theme','dark');
const mobileWindow={innerWidth:390,innerHeight:844,listeners:{},matchMedia:()=>({matches:true}),addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)}};
const label=new MiniElement('label',mobileDoc);label.textContent='Minimum listing age';const host=new MiniElement('div',mobileDoc);host.append(label);mobileDoc.body.append(host);
const mobileSelect=new MiniElement('select',mobileDoc);mobileSelect.options=[{textContent:'30 days',disabled:false},{textContent:'60 days',disabled:false}];mobileSelect.selectedIndex=0;Object.defineProperty(mobileSelect,'selectedOptions',{get(){return [this.options[this.selectedIndex]]}});mobileSelect.labels=[label];mobileSelect.addEventListener=MiniElement.prototype.addEventListener;label.append(mobileSelect);
const mobileContext={window:mobileWindow,document:mobileDoc,setTimeout,clearTimeout,console,Event:function(type){this.type=type},CustomEvent:function(type){this.type=type},MutationObserver:function(){this.observe=()=>{}},localStorage:{getItem(){return null},setItem(){}}};
const instrumentedUi=ui.replace("if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();","window.__testInitializeSelects=initializeSelects;");
vm.runInNewContext(instrumentedUi,mobileContext);mobileWindow.__testInitializeSelects();
const trigger=host.children[1].children.find(x=>x.classList.contains('bp-select-trigger'));
assert.ok(trigger,'enhanced trigger is placed after and outside its wrapping label');assert.equal(label.contains(mobileSelect),false,'native select is relocated out of the wrapping label');
let prevented=false,stopped=false;label.dispatchEvent({type:'click',target:trigger,preventDefault(){prevented=true},stopPropagation(){stopped=true}});assert.ok(prevented&&stopped,'label click guard prevents native synthetic activation');
trigger.dispatchEvent({type:'click',preventDefault(){},stopPropagation(){}});
const mobilePortal=mobileDoc.body.children.find(x=>x.classList.contains('bp-select-menu'));
assert.ok(mobilePortal&&mobilePortal.isConnected&&!mobilePortal.hidden&&mobilePortal.classList.contains('is-open'),'mobile menu opens in the document.body portal');assert.equal(mobileWindow.BluePeakSelects.getOpenCount(),1);assert.equal(mobilePortal.querySelectorAll('[role="option"]').length,2);
assert.equal(mobilePortal.classList.contains('is-mobile'),true);assert.equal(mobileWindow.__bpSelectLastOpenedAt,Number(mobilePortal.dataset.openedAt));
for(const type of ['scroll','resize'])for(const fn of mobileWindow.listeners[type]||[])fn({type});assert.equal(mobilePortal.hidden,false,'scroll and resize leave the menu open');
for(const fn of mobileDoc.listeners.click||[])fn({type:'click',target:host,preventDefault(){},stopPropagation(){}});assert.equal(mobilePortal.hidden,false,'outside ghost click during the guard leaves the menu open');
const backdrop=mobileDoc.body.children.find(x=>x.classList.contains('bp-select-backdrop'));backdrop.dispatchEvent({type:'click',preventDefault(){},stopPropagation(){}});assert.equal(mobilePortal.hidden,false,'backdrop tap-through is ignored during the opening guard');
await new Promise(resolve=>setTimeout(resolve,360));backdrop.dispatchEvent({type:'click',preventDefault(){},stopPropagation(){}});assert.equal(mobilePortal.hidden,true,'backdrop closes the menu after the 350 ms guard');
let changeEvents=0;mobileSelect.addEventListener('change',()=>changeEvents++);trigger.dispatchEvent({type:'click',preventDefault(){},stopPropagation(){}});mobilePortal.querySelectorAll('[role=\"option\"]')[1].dispatchEvent({type:'click',preventDefault(){},stopPropagation(){}});assert.equal(mobilePortal.hidden,true,'choosing an option closes the menu');assert.equal(mobileSelect.selectedIndex,1);assert.equal(changeEvents,1,'native change event is emitted after selection');
trigger.dispatchEvent({type:'click',preventDefault(){},stopPropagation(){}});mobilePortal.querySelector('[role=\"listbox\"]').dispatchEvent({type:'keydown',key:'Escape',preventDefault(){}});assert.equal(mobilePortal.hidden,true,'Escape closes the mobile sheet');
assert.match(ui, /bp-password-field-wrap/);
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
      assert.ok(['089981','26A69A','10B981','059669'].includes(hex) && ['index.html','bluepeak-design-system.css'].includes(path.basename(file)), `unapproved green-family literal ${literal} in ${path.relative(__dirname, file)}`);
    }
  }
}
console.log(`PASS test-theme-contrast: dual theme tokens, >=AA text pairs, AAA primary/button pairs, synchronized theme controls, resolved chart palette, universal candle colors, Zig Zag UI, and no unapproved green colors (${sourceFiles.length} shipped source files scanned).`);
})().catch(error=>{console.error(error);process.exitCode=1});
