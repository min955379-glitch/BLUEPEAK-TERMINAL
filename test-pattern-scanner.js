const assert = require('node:assert/strict');
const P = require('./pattern-scanner.js');
assert.equal(P.BACKTEST_HORIZON, 24);
assert.equal(typeof P.zigZag, 'function');
const zzHighs = [102,104,108,110,108,106,104,102,100,102,105,110,115,112,110,107,105,102,102,104,108,115,120,118,116,114,110];
const zzCandles = zzHighs.map((high, i) => ({time:i, high, low:high-(i===18?2:4), open:high-3, close:high-2, vol:1}));
const zz = P.zigZag(zzCandles, {pivotDepth:2, deviationPct:5});
assert.deepEqual(zz.pivots.map(p=>p.type), ['high','low','high','low','high','low']);
assert.deepEqual(zz.pivots.map(p=>p.label), ['H','L','HH','HL','HH','HL']);
assert.equal(zz.pivots.at(-1).confirmed, false, 'last leg should be clearly marked as developing');
assert.equal(P.zigZag(zzCandles.slice(0, 3), {pivotDepth:5}).pivots.length, 0);
assert.match(P.RULES.hiddenBullishDivergence, /higher/);
assert.match(P.RULES.fvg, /three-candle/);
const flat = Array.from({length: 260}, (_, i) => ({time:i*3600000, open:100, high:101, low:99, close:100, vol:1}));
const out = P.detect(flat, '1h');
assert.equal(out.candles, 260);
assert.equal(out.uptrend.checks.aboveSma50, false);
assert.equal(out.uptrend.checks.aboveSma200, false);
for (const key of ['hidden_bullish_divergence','order_block','bos','choch','fair_value_gap','liquidity_sweep']) {
  assert.ok(out.stats[key]);
  assert.equal(out.stats[key].horizon, 24);
}
assert.equal(P.detect(flat.slice(0, 60)).events.length, 0);
console.log('pattern scanner smoke tests passed');
