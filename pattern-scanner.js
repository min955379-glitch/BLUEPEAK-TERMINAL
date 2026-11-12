/* BluePeak historical pattern scanner. Transparent rule set; never a trading signal. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BPPatterns = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SWING_SPAN = 3;
  const RSI_PERIOD = 14;
  const ATR_PERIOD = 14;
  const BACKTEST_HORIZON = 24;
  const TARGET_R = 1;
  const MAX_CURRENT_AGE = 24;

  const RULES = Object.freeze({
    hiddenBullishDivergence: 'Hidden bullish divergence (rule used here): compare two consecutive confirmed swing lows (3 candles on each side). The second price low must be higher, while RSI(14) at that low is at least 3 points lower. The match is confirmed only after the right-side pivot candles close.',
    orderBlock: 'Order block (rule used here): on a confirmed close through the latest 3-left/3-right swing level, mark the last opposite-colour candle in the preceding 10 candles as the block. Bullish blocks are the last down candle before an upside break; bearish blocks are the last up candle before a downside break. It stays active until a candle closes beyond the far edge.',
    bos: 'Break of Structure (rule used here): a candle closes beyond the latest confirmed swing high (upside) or swing low (downside), with the prior close on the other side. If that break agrees with the last recorded structure direction, label BOS.',
    choch: 'Change of Character (rule used here): a confirmed close through the latest opposite swing level that reverses the last recorded structure direction. The first break, before a direction is established, is labeled BOS. This is a simple close-based structure rule, not a universal ICT definition.',
    fvg: 'Fair Value Gap (rule used here): a three-candle gap where candle 3 low is above candle 1 high (bullish), or candle 3 high is below candle 1 low (bearish); the gap must be at least 0.05 × ATR(14). It is active until price fully crosses the gap.',
    liquiditySweep: 'Liquidity sweep (rule used here): after a confirmed swing level exists, price wicks beyond that level but the same candle closes back inside it. A sweep above a swing high is tagged buy-side / bearish; a sweep below a swing low is tagged sell-side / bullish. This uses wick-and-close only.',
    v1: 'V1 trend continuation (rule used here): (1) most recent completed 1D close is above EMA21 and EMA50, daily RSI14 is above 50 and no higher than 85, and the last 3 confirmed 2-left/2-right daily swing highs and lows rise. Default observed-history age proxy is 30 days, measured from the earliest returned daily candle (not an official exchange listing date), and default current 24h quote volume is at least $5M USDT; both filters are configurable. RSI above 85 is listed separately as overextended, not qualified. (2) On 1H, close is at least the configured 2–5% below the prior 24h or 48h high, OR RSI14 was below 45 within the preceding configurable 3–6 completed hourly candles. (3) Current RSI14 is greater than prior RSI14. (4) The completed current 1H candle is bullish, closes above the prior candle midpoint, and its volume exceeds each of the preceding 3 strictly declining-volume candles. Every step is required. References: entry is trigger close; stop is the latest confirmed 1h swing low within 48 bars minus 1.5%; TP1 is previous confirmed 1h swing high; TP2 is next clustered daily resistance when present, with 2R/3R alternatives when stop is available. Context: BTC is weak only if both 1h and derived 4h close < EMA21 < EMA50; major resistance is a 2-touch cluster <=1.5% overhead; late candle range is >7% of open. Reference levels are informational only.',
  });

  const mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
  function rsiSeries(candles, period = RSI_PERIOD) {
    const out = Array(candles.length).fill(null);
    if (candles.length <= period) return out;
    let gain = 0, loss = 0;
    for (let i = 1; i <= period; i++) {
      const d = candles[i].close - candles[i - 1].close;
      if (d > 0) gain += d; else loss -= d;
    }
    let ag = gain / period, al = loss / period;
    out[period] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    for (let i = period + 1; i < candles.length; i++) {
      const d = candles[i].close - candles[i - 1].close;
      ag = (ag * (period - 1) + Math.max(0, d)) / period;
      al = (al * (period - 1) + Math.max(0, -d)) / period;
      out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    }
    return out;
  }
  function atrSeries(candles, period = ATR_PERIOD) {
    const tr = Array(candles.length).fill(null), out = Array(candles.length).fill(null);
    for (let i = 1; i < candles.length; i++) {
      tr[i] = Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i - 1].close), Math.abs(candles[i].low - candles[i - 1].close));
    }
    if (candles.length <= period) return out;
    let a = mean(tr.slice(1, period + 1)); out[period] = a;
    for (let i = period + 1; i < candles.length; i++) { a = (a * (period - 1) + tr[i]) / period; out[i] = a; }
    return out;
  }
  function smaAt(candles, end, period) {
    if (end + 1 < period) return null;
    let s = 0; for (let i = end - period + 1; i <= end; i++) s += candles[i].close;
    return s / period;
  }
  function isPivot(candles, i, kind, span = SWING_SPAN) {
    if (i < span || i + span >= candles.length) return false;
    const v = kind === 'high' ? candles[i].high : candles[i].low;
    for (let j = i - span; j <= i + span; j++) {
      if (j === i) continue;
      const x = kind === 'high' ? candles[j].high : candles[j].low;
      if (kind === 'high' ? x >= v : x <= v) return false;
    }
    return true;
  }
  function confirmedPivots(candles, kind, span = SWING_SPAN) {
    const out = [];
    for (let i = span; i < candles.length - span; i++) {
      if (isPivot(candles, i, kind, span)) out.push({ index: i, confirmedAt: i + span, value: kind === 'high' ? candles[i].high : candles[i].low, time: candles[i].time });
    }
    return out;
  }

  function detect(candles, timeframe = '1h') {
    if (!Array.isArray(candles) || candles.length < 80) return { events: [], current: [], stats: {}, uptrend: { up: false, reasons: [], checks: {} }, candles: candles?.length || 0 };
    const data = candles.filter(c => Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close));
    const rsi = rsiSeries(data), atr = atrSeries(data);
    const lows = confirmedPivots(data, 'low'), highs = confirmedPivots(data, 'high');
    const events = [];
    const push = (type, index, direction, extra = {}) => {
      if (index < 0 || index >= data.length) return;
      events.push({ type, index, time: data[index].time, direction, atr: atr[index], ...extra });
    };

    // Hidden bullish divergence: higher confirmed price low with lower RSI low.
    const rsiLows = lows.filter(p => rsi[p.index] != null);
    for (let n = 1; n < rsiLows.length; n++) {
      const a = rsiLows[n - 1], b = rsiLows[n];
      if (b.value > a.value && rsi[b.index] <= rsi[a.index] - 3) {
        push('hidden_bullish_divergence', b.confirmedAt, 1, { pivotTime: b.time, detail: 'Higher price low; lower RSI(14) low' });
      }
    }

    // Close-confirmed structure breaks, their direction changes, and last opposing candle blocks.
    let bias = 0, lastHigh = null, lastLow = null;
    let hiCursor = 0, loCursor = 0, usedHigh = new Set(), usedLow = new Set();
    for (let i = 1; i < data.length; i++) {
      while (hiCursor < highs.length && highs[hiCursor].confirmedAt <= i) lastHigh = highs[hiCursor++];
      while (loCursor < lows.length && lows[loCursor].confirmedAt <= i) lastLow = lows[loCursor++];
      let breakDir = 0, level = null;
      if (lastHigh && !usedHigh.has(lastHigh.index) && data[i - 1].close <= lastHigh.value && data[i].close > lastHigh.value) { breakDir = 1; level = lastHigh.value; usedHigh.add(lastHigh.index); }
      else if (lastLow && !usedLow.has(lastLow.index) && data[i - 1].close >= lastLow.value && data[i].close < lastLow.value) { breakDir = -1; level = lastLow.value; usedLow.add(lastLow.index); }
      if (breakDir) {
        const type = bias && bias !== breakDir ? 'choch' : 'bos';
        push(type, i, breakDir, { level, detail: `Close crossed confirmed swing at ${level}` });
        // Last opposite-colour candle in the preceding ten bars forms the rule-defined block.
        for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
          const opposite = breakDir > 0 ? data[j].close < data[j].open : data[j].close > data[j].open;
          if (opposite) {
            push('order_block', i, breakDir, { zoneLow: data[j].low, zoneHigh: data[j].high, sourceTime: data[j].time, detail: `${breakDir > 0 ? 'Last down' : 'Last up'} candle before close-break` });
            break;
          }
        }
        bias = breakDir;
      }
    }

    // Three-candle fair value gaps, filtered by a small ATR-relative minimum.
    for (let i = 2; i < data.length; i++) {
      const a = data[i - 2], c = data[i], minGap = (atr[i] || 0) * 0.05;
      if (c.low > a.high && c.low - a.high >= minGap) push('fair_value_gap', i, 1, { zoneLow: a.high, zoneHigh: c.low, detail: `Bullish gap ${((c.low - a.high) / (atr[i] || 1)).toFixed(2)} ATR` });
      if (c.high < a.low && a.low - c.high >= minGap) push('fair_value_gap', i, -1, { zoneLow: c.high, zoneHigh: a.low, detail: `Bearish gap ${((a.low - c.high) / (atr[i] || 1)).toFixed(2)} ATR` });
    }

    // Wick beyond a confirmed swing, close back inside that swing.
    hiCursor = 0; loCursor = 0; lastHigh = null; lastLow = null;
    for (let i = 1; i < data.length; i++) {
      while (hiCursor < highs.length && highs[hiCursor].confirmedAt < i) lastHigh = highs[hiCursor++];
      while (loCursor < lows.length && lows[loCursor].confirmedAt < i) lastLow = lows[loCursor++];
      if (lastHigh && data[i].high > lastHigh.value && data[i].close < lastHigh.value) push('liquidity_sweep', i, -1, { level: lastHigh.value, sweep: 'buy-side', detail: 'Wick above swing high; close back below' });
      if (lastLow && data[i].low < lastLow.value && data[i].close > lastLow.value) push('liquidity_sweep', i, 1, { level: lastLow.value, sweep: 'sell-side', detail: 'Wick below swing low; close back above' });
    }

    events.sort((a, b) => a.index - b.index || a.type.localeCompare(b.type));
    const stats = {};
    const types = ['hidden_bullish_divergence', 'order_block', 'bos', 'choch', 'fair_value_gap', 'liquidity_sweep'];
    for (const type of types) {
      const occurrences = events.filter(e => e.type === type && e.index + BACKTEST_HORIZON < data.length && Number.isFinite(e.atr) && e.atr > 0);
      let favorable = 0;
      for (const e of occurrences) {
        const entry = data[e.index].close, target = entry + e.direction * e.atr * TARGET_R, stop = entry - e.direction * e.atr * TARGET_R;
        let resolved = false;
        for (let j = e.index + 1; j <= e.index + BACKTEST_HORIZON && j < data.length; j++) {
          const c = data[j];
          const hitTarget = e.direction > 0 ? c.high >= target : c.low <= target;
          const hitStop = e.direction > 0 ? c.low <= stop : c.high >= stop;
          if (hitTarget && hitStop) { resolved = true; break; } // same-bar ambiguity counted conservatively as not favorable
          if (hitStop) { resolved = true; break; }
          if (hitTarget) { favorable++; resolved = true; break; }
        }
        void resolved;
      }
      stats[type] = { sample: occurrences.length, favorable, percent: occurrences.length ? 100 * favorable / occurrences.length : null, horizon: BACKTEST_HORIZON, windowCandles: data.length, windowFrom: data[0].time, windowTo: data[data.length - 1].time, excludedRecent: events.filter(e => e.type === type).length - occurrences.length, rule: '1 ATR favorable barrier before 1 ATR adverse barrier within the next 24 completed candles; same-candle double touches count as not favorable.' };
    }

    // Mark current active order blocks/FVGs and include recent confirmed events.
    const current = events.filter(e => {
      if (e.type === 'order_block') {
        for (let j = e.index + 1; j < data.length; j++) if (e.direction > 0 ? data[j].close < e.zoneLow : data[j].close > e.zoneHigh) return false;
        return true;
      }
      if (e.type === 'fair_value_gap') {
        for (let j = e.index + 1; j < data.length; j++) {
          if (e.direction > 0 ? data[j].low <= e.zoneLow : data[j].high >= e.zoneHigh) return false;
        }
        return true;
      }
      return e.index >= data.length - MAX_CURRENT_AGE;
    }).slice(-120);

    // Trend finder uses the required 1h candle set and explicit combined criteria.
    const n = data.length - 1, price = data[n].close, ma50 = smaAt(data, n, 50), ma200 = smaAt(data, n, 200);
    const pHighs = highs.filter(p => p.confirmedAt <= n).slice(-3), pLows = lows.filter(p => p.confirmedAt <= n).slice(-3);
    const higherHighs = pHighs.length === 3 && pHighs[0].value < pHighs[1].value && pHighs[1].value < pHighs[2].value;
    const higherLows = pLows.length === 3 && pLows[0].value < pLows[1].value && pLows[1].value < pLows[2].value;
    const checks = { aboveSma50: ma50 != null && price > ma50, aboveSma200: ma200 != null && price > ma200, higherHighs, higherLows };
    const reasons = [];
    if (checks.aboveSma50) reasons.push('1h close > SMA50');
    if (checks.aboveSma200) reasons.push('1h close > SMA200');
    if (higherHighs && higherLows) reasons.push('last 3 confirmed swing highs and lows are rising');
    const uptrend = { up: Object.values(checks).every(Boolean), price, ma50, ma200, checks, reasons };
    return { events, current, stats, uptrend, candles: data.length, from: data[0].time, to: data[data.length - 1].time, timeframe };
  }

  function emaSeries(candles, period) {
    const out = Array(candles.length).fill(null);
    if (candles.length < period) return out;
    let value = mean(candles.slice(0, period).map(c => c.close));
    out[period - 1] = value;
    const alpha = 2 / (period + 1);
    for (let i = period; i < candles.length; i++) { value = candles[i].close * alpha + value * (1 - alpha); out[i] = value; }
    return out;
  }
  // Same 2-left/2-right swing and 0.3% proximity clustering convention as the dashboard's support/resistance helper.
  function clusterSwings(candles, kind) {
    const points = [];
    for (let i = 2; i < candles.length - 2; i++) if (isPivot(candles, i, kind, 2)) points.push({ value: kind === 'high' ? candles[i].high : candles[i].low, time: candles[i].time, index: i });
    const groups = [];
    for (const p of points) {
      let g = groups.find(x => Math.abs(x.level - p.value) / x.level < 0.003);
      if (g) { g.level = (g.level * g.count + p.value) / (g.count + 1); g.count++; g.lastTime = p.time; }
      else groups.push({ level: p.value, count: 1, lastTime: p.time, index: p.index });
    }
    return groups.filter(g => g.count >= 2);
  }
  const DAY = 86400000, MIN_V1_SAMPLE = 5;
  function dailyTrendAt(daily, index, ctx, options) {
    if (index < 0) return { ok: false, reason: 'No completed daily candle yet' };
    if (ctx.cache.has(index)) return ctx.cache.get(index);
    const c = daily[index], ageDays = (c.time + DAY - daily[0].time) / DAY;
    const e21 = ctx.ema21[index], e50 = ctx.ema50[index], r = ctx.rsi[index];
    const highs = ctx.highPivots.filter(p => p.confirmedAt <= index).slice(-3);
    const lows = ctx.lowPivots.filter(p => p.confirmedAt <= index).slice(-3);
    const higherHighs = highs.length === 3 && highs[0].value < highs[1].value && highs[1].value < highs[2].value;
    const higherLows = lows.length === 3 && lows[0].value < lows[1].value && lows[1].value < lows[2].value;
    const aged = ageDays >= options.minListingAgeDays;
    const liquid = Number.isFinite(c.quoteVol) && c.quoteVol >= options.minQuoteVolume;
    const overextended = Number.isFinite(r) && r > 85 && c.close > e21 && c.close > e50 && higherHighs && higherLows && aged && liquid;
    const checks = { aboveEma21: e21 != null && c.close > e21, aboveEma50: e50 != null && c.close > e50, rsiAbove50: r != null && r > 50, rsiNotOverextended: r != null && r <= 85, higherHighs, higherLows, listingAge: aged, quoteVolume: liquid };
    const result = { ok: Object.values(checks).every(Boolean), overextended, checks, rsi: r, close: c.close, ema21: e21, ema50: e50, ageDays, quoteVol: c.quoteVol, time: c.time, reasons: Object.entries(checks).filter(([, pass]) => !pass).map(([k]) => k) };
    ctx.cache.set(index, result); return result;
  }
  function dailyIndexForHour(hour, daily) {
    const closeTime = hour.time + 3600000; let lo = 0, hi = daily.length - 1, found = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (daily[mid].time + DAY <= closeTime) { found = mid; lo = mid + 1; } else hi = mid - 1; }
    return found;
  }
  function aggregateFourHour(hourly) {
    const groups = new Map();
    for (const c of hourly) { const bucket = Math.floor(c.time / (4 * 3600000)) * 4 * 3600000; let g = groups.get(bucket); if (!g) groups.set(bucket, g = { time: bucket, open: c.open, high: c.high, low: c.low, close: c.close, vol: c.vol, n: 0, last: c.time }); else { g.high = Math.max(g.high, c.high); g.low = Math.min(g.low, c.low); g.close = c.close; g.vol += c.vol; } g.n++; g.last = c.time; }
    return [...groups.values()].filter(g => g.n === 4 && g.last === g.time + 3 * 3600000).sort((a, b) => a.time - b.time);
  }
  function btcWeak(hourly) {
    const check = cs => { if (cs.length < 60) return false; const e21 = emaSeries(cs, 21), e50 = emaSeries(cs, 50), i = cs.length - 1; return cs[i].close < e21[i] && e21[i] < e50[i]; };
    const four = aggregateFourHour(hourly);
    const down1h = check(hourly), down4h = check(four);
    return { down: down1h && down4h, down1h, down4h };
  }
  function detectV1({ hourly, daily, quoteVolume24h, options = {}, btcHourly = null }) {
    const opts = { minListingAgeDays: 30, minQuoteVolume: 5000000, pullbackPercent: 2, rsiDipLookback: 4, stopBufferPercent: 1.5, majorResistancePercent: 1.5, lateCandlePercent: 7, minSamples: MIN_V1_SAMPLE, ...options };
    opts.minListingAgeDays = Math.max(30, Number(opts.minListingAgeDays) || 30);
    opts.minQuoteVolume = Math.max(0, Number(opts.minQuoteVolume) || 5000000);
    opts.pullbackPercent = Math.max(2, Math.min(5, Number(opts.pullbackPercent) || 2));
    opts.rsiDipLookback = Math.max(3, Math.min(6, Number(opts.rsiDipLookback) || 4));
    opts.stopBufferPercent = Math.max(1, Math.min(2, Number(opts.stopBufferPercent) || 1.5));
    const h = (hourly || []).filter(c => Number.isFinite(c.close)).slice(-1000);
    const d = (daily || []).filter(c => Number.isFinite(c.close)).slice(-1000);
    if (h.length < 80 || d.length < 60) return { match: null, overextended: null, occurrences: [], stats: { sample: 0, favorable: 0, percent: null, tooFew: true, minSamples: opts.minSamples, windowCandles: h.length, windowFrom: h[0]?.time, windowTo: h.at(-1)?.time, excludedRecent: 0 }, options: opts, reason: 'Not enough hourly or daily history yet' };
    const ctx = { ema21: emaSeries(d, 21), ema50: emaSeries(d, 50), rsi: rsiSeries(d), highPivots: confirmedPivots(d, 'high', 2), lowPivots: confirmedPivots(d, 'low', 2), cache: new Map() };
    const hRsi = rsiSeries(h), hAtr = atrSeries(h), hiPivots = confirmedPivots(h, 'high', 2), loPivots = confirmedPivots(h, 'low', 2);
    const signals = [];
    for (let i = Math.max(50, RSI_PERIOD + 2); i < h.length; i++) {
      const dayIndex = dailyIndexForHour(h[i], d); if (dayIndex < 0) continue;
      const trend = dailyTrendAt(d, dayIndex, ctx, opts); if (!trend.ok) continue;
      const prior = h.slice(Math.max(0, i - 48), i); if (prior.length < 24 || hRsi[i] == null || hRsi[i - 1] == null) continue;
      const high24 = Math.max(...h.slice(Math.max(0, i - 24), i).map(c => c.high));
      const high48 = Math.max(...prior.map(c => c.high));
      const pull24 = (high24 - h[i].close) / high24 * 100, pull48 = (high48 - h[i].close) / high48 * 100;
      const pullbackByPrice = Math.max(pull24, pull48) >= opts.pullbackPercent;
      const rsiStart = Math.max(0, i - opts.rsiDipLookback), rsiDip = hRsi.slice(rsiStart, i).some(v => v != null && v < 45);
      const pullback = pullbackByPrice || rsiDip;
      const momentumUp = hRsi[i] > hRsi[i - 1];
      const prev = h[i - 1], midpoint = (prev.high + prev.low) / 2;
      const bullishCandle = h[i].close > h[i].open, closesOverMid = h[i].close > midpoint;
      const vol3 = [h[i - 3]?.vol, h[i - 2]?.vol, h[i - 1]?.vol];
      const decliningVolume = vol3.every(Number.isFinite) && vol3[0] > vol3[1] && vol3[1] > vol3[2] && h[i].vol > Math.max(...vol3);
      if (!(pullback && momentumUp && bullishCandle && closesOverMid && decliningVolume)) continue;
      const pullbackLow = loPivots.filter(p => p.confirmedAt <= i && p.index < i && p.index >= i - 48).at(-1);
      const lastSwingHigh = hiPivots.filter(p => p.confirmedAt <= i && p.index < i).at(-1);
      const stop = pullbackLow ? pullbackLow.value * (1 - opts.stopBufferPercent / 100) : null;
      const risk = stop != null ? h[i].close - stop : null;
      const resistance = clusterSwings(d, 'high').filter(x => x.level > h[i].close).sort((a, b) => a.level - b.level)[0] || null;
      const rr2 = risk > 0 ? h[i].close + risk * 2 : null, rr3 = risk > 0 ? h[i].close + risk * 3 : null;
      const candleRangePercent = (h[i].high - h[i].low) / h[i].open * 100;
      const btc = btcHourly && h[i] === h.at(-1) ? btcWeak(btcHourly) : null;
      signals.push({ index: i, time: h[i].time, entry: h[i].close, rsi: hRsi[i], previousRsi: hRsi[i - 1], pullbackPercent: Math.max(pull24, pull48), pullbackByPrice, rsiDip, priorHighBreak: h[i].close > prev.high, reference: { entry: h[i].close, stop, stopSwingLow: pullbackLow?.value ?? null, stopBufferPercent: opts.stopBufferPercent, takeProfit1: lastSwingHigh?.value ?? null, takeProfit2Resistance: resistance?.level ?? null, takeProfit2ResistanceTouches: resistance?.count ?? null, rr2, rr3 }, flags: { underDailyResistance: !!(resistance && (resistance.level - h[i].close) / h[i].close * 100 <= opts.majorResistancePercent), lateEntry: candleRangePercent > opts.lateCandlePercent, candleRangePercent, btcWeak: btc?.down || false }, detail: `Daily trend passed; ${pullbackByPrice ? `${Math.max(pull24, pull48).toFixed(1)}% retracement` : `RSI dipped below 45 in prior ${opts.rsiDipLookback} bars`}; RSI rising; bullish close above prior midpoint; trigger volume > previous three declining bars.` });
    }
    const events = signals.filter(s => s.index + BACKTEST_HORIZON < h.length && Number.isFinite(hAtr[s.index]) && hAtr[s.index] > 0);
    let favorable = 0;
    for (const e of events) { const target = e.entry + hAtr[e.index], stop = e.entry - hAtr[e.index]; for (let j = e.index + 1; j <= e.index + BACKTEST_HORIZON; j++) { const c = h[j], hitT = c.high >= target, hitS = c.low <= stop; if (hitT && hitS) break; if (hitS) break; if (hitT) { favorable++; break; } } }
    const latestDay = dailyIndexForHour(h.at(-1), d), latestTrend = dailyTrendAt(d, latestDay, ctx, opts);
    const latestDayRsi = latestTrend.rsi;
    const tickerLiquid = Number(quoteVolume24h) >= opts.minQuoteVolume;
    const overextended = latestTrend.overextended && tickerLiquid ? { time: latestTrend.time, rsi: latestDayRsi, close: latestTrend.close, label: 'Overextended — daily RSI(14) above 85; excluded from qualifying V1 results.' } : null;
    const latest = signals.at(-1)?.index === h.length - 1 && latestTrend.ok ? signals.at(-1) : null;
    const currentMatch = latest && tickerLiquid ? { ...latest, assetQuoteVolume24h: Number(quoteVolume24h), sample: events.length, favorable, favorablePercent: events.length ? favorable / events.length * 100 : null, tooFew: events.length < opts.minSamples } : null;
    const result = { match: currentMatch, overextended, occurrences: signals, stats: { sample: events.length, favorable, percent: events.length ? favorable / events.length * 100 : null, tooFew: events.length < opts.minSamples, minSamples: opts.minSamples, horizon: BACKTEST_HORIZON, windowCandles: h.length, windowFrom: h[0].time, windowTo: h.at(-1).time, excludedRecent: signals.length - events.length, rule: '1 ATR favorable barrier before 1 ATR adverse barrier within next 24 completed 1h candles; same-candle double touches are not favorable; each qualifying trigger candle is counted (events may overlap).' }, options: opts, latestDailyTrend: latestTrend, liquidityPass: tickerLiquid, dailyResistance: clusterSwings(d, 'high').filter(x => x.level > h.at(-1).close).sort((a, b) => a.level - b.level)[0] || null };
    return result;
  }

  return { RULES, detect, detectV1, rsiSeries, atrSeries, emaSeries, confirmedPivots, clusterSwings, BACKTEST_HORIZON, SWING_SPAN, MIN_V1_SAMPLE };
});
