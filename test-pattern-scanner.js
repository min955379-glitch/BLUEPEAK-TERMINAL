const assert = require('node:assert/strict');
const P = require('./pattern-scanner.js');
assert.equal(P.BACKTEST_HORIZON, 24);
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
