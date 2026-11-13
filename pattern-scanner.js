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
    ict: 'ICT scanner approximation: a completed-candle liquidity sweep must be followed by a same-direction FVG and a later close candle overlapping the measured 61.8–79% impulse retracement and the FVG zone, with a directional rejection. This is a transparent mechanical approximation, not a canonical or predictive ICT model.',
    smc: 'SMC scanner approximation: a completed BOS/CHoCH is linked to the opposing candle block emitted at that break; a later candle must mitigate the uninvalidated zone, close directionally, and be on the discount/premium side of a recent 50-bar range midpoint. Stop is beyond the zone; target references use equilibrium and range extreme when valid.',
    priceAction: 'Price-action scanner: requires a multi-touch clustered support/resistance level and a directional engulfing, 2x wick rejection, inside-bar break, or close-confirmed break-and-retest. Levels use confirmed 3-left/3-right pivots clustered within the configured percentage tolerance.',
    pump: 'Pump scanner: completed bullish candle closes beyond the prior 20-bar high, closes in the top 30% of its own range, has volume at least the configurable multiple (default 2.5x the prior 20-bar average), RSI(14) 55–80, and meets the optional minimum gain. Long-only breakout filter; no prediction is implied.',
    v1: 'V1 trend continuation (rule used here): (1) most recent completed 1D close is above EMA21 and EMA50, daily RSI14 is above 50 and no higher than 85, and the last 3 confirmed 2-left/2-right daily swing highs and lows rise. Default observed-history age proxy is 30 days, measured from the earliest returned daily candle (not an official exchange listing date), and default current 24h quote volume is at least $5M USDT; both filters are configurable. RSI above 85 is listed separately as overextended, not qualified. (2) On 1H, close is at least the configured 2–5% below the prior 24h or 48h high, OR RSI14 was below 45 within the preceding configurable 3–6 completed hourly candles. (3) Current RSI14 is greater than prior RSI14. (4) The completed current 1H candle is bullish, closes above the prior candle midpoint, and its volume exceeds each of the preceding 3 strictly declining-volume candles. Every step is required. References: entry is trigger close; stop is the latest confirmed 1h swing low within 48 bars minus 1.5%; TP1 is previous confirmed 1h swing high; TP2 is next clustered daily resistance when present, with 2R/3R alternatives when stop is available. Context: BTC is weak only if both 1h and derived 4h close < EMA21 < EMA50; major resistance is a 2-touch cluster <=1.5% overhead; late candle range is >7% of open. Reference levels are informational only.',
  });

  const mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;

  // Confirmed, alternating swing pivots plus one developing endpoint for chart structure.
  function zigZag(candles, { deviationPct = null, pivotDepth = 5 } = {}) {
    if (!Array.isArray(candles) || candles.length < 3) return { pivots: [], deviationPct: Number(deviationPct) || 1.5, pivotDepth: 1 };
    const depth = Math.max(1, Math.min(20, Math.floor(Number(pivotDepth) || 5)));
    const data = candles.filter(c => c && [c.high, c.low].every(Number.isFinite));
    if (data.length < depth * 2 + 1) return { pivots: [], deviationPct: Number(deviationPct) || 1.5, pivotDepth: depth };
    let volatility = [];
    for (let i = Math.max(1, data.length - 28); i < data.length; i++) {
      const c = data[i], p = data[i - 1], tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
      if (Number.isFinite(p.close) && p.close > 0) volatility.push(tr / p.close * 100);
    }
    const sortedVol = volatility.slice().sort((a, b) => a - b);
    const medianVol = sortedVol.length ? sortedVol[Math.floor(sortedVol.length / 2)] : 1;
    const autoDeviation = Math.max(1.5, Math.min(3, medianVol * 1.5));
    const threshold = Number.isFinite(Number(deviationPct)) && Number(deviationPct) > 0
      ? Math.max(0.5, Math.min(8, Number(deviationPct))) : autoDeviation;
    const candidates = [];
    for (let i = depth; i < data.length - depth; i++) {
      const c = data[i];
      let isHigh = true, isLow = true;
      for (let j = i - depth; j <= i + depth; j++) {
        if (j === i) continue;
        if (data[j].high > c.high || (data[j].high === c.high && j > i)) isHigh = false;
        if (data[j].low < c.low || (data[j].low === c.low && j > i)) isLow = false;
      }
      if (isHigh && isLow) {
        const close = Number.isFinite(c.close) ? c.close : (c.high + c.low) / 2;
        candidates.push({ index: i, type: close >= (c.high + c.low) / 2 ? 'high' : 'low', value: close >= (c.high + c.low) / 2 ? c.high : c.low, confirmed: true });
      } else if (isHigh) candidates.push({ index: i, type: 'high', value: c.high, confirmed: true });
      else if (isLow) candidates.push({ index: i, type: 'low', value: c.low, confirmed: true });
    }
    const pivots = [];
    for (const candidate of candidates) {
      const last = pivots.at(-1);
      if (!last) { pivots.push(candidate); continue; }
      if (candidate.type === last.type) {
        const moreExtreme = candidate.type === 'high' ? candidate.value > last.value : candidate.value < last.value;
        if (moreExtreme) pivots[pivots.length - 1] = candidate;
        continue;
      }
      const swing = Math.abs(candidate.value - last.value) / Math.max(Math.abs(last.value), 1e-12) * 100;
      if (swing >= threshold) pivots.push(candidate);
    }
    if (!pivots.length) {
      const first = data[0], last = data.at(-1), type = last.close >= first.close ? 'low' : 'high';
      pivots.push({ index: 0, type, value: type === 'low' ? first.low : first.high, confirmed: true });
    }
    const anchor = pivots.at(-1), from = Math.min(data.length - 1, anchor.index + 1);
    let extreme = null;
    for (let i = from; i < data.length; i++) {
      const type = anchor.type === 'high' ? 'low' : 'high', value = type === 'high' ? data[i].high : data[i].low;
      if (!extreme || (type === 'high' ? value > extreme.value : value < extreme.value)) extreme = { index: i, type, value, confirmed: false };
    }
    if (extreme && extreme.index !== anchor.index) {
      const swing = Math.abs(extreme.value - anchor.value) / Math.max(Math.abs(anchor.value), 1e-12) * 100;
      if (swing >= threshold) pivots.push(extreme);
    }
    const previous = { high: null, low: null };
    return { pivots: pivots.map(p => {
      const prior = previous[p.type];
      const label = p.type === 'high' ? (prior ? (p.value > prior.value ? 'HH' : 'LH') : 'H') : (prior ? (p.value < prior.value ? 'LL' : 'HL') : 'L');
      if (p.confirmed) previous[p.type] = p;
      return { ...p, label };
    }), deviationPct: threshold, pivotDepth: depth };
  }

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

  const STRATEGIES = Object.freeze({
    hidden_bullish_divergence: 'Hidden Bullish Divergence', v1: 'V1 Method', ict: 'ICT Strategy',
    smc: 'Smart Money Concepts', price_action: 'Price Action', pump: 'Pump Scanner'
  });
  function smaSeries(candles, period) {
    const out = Array(candles.length).fill(null); let sum = 0;
    for (let i = 0; i < candles.length; i++) { sum += candles[i].close; if (i >= period) sum -= candles[i-period].close; if (i >= period-1) out[i] = sum / period; }
    return out;
  }
  function referenceLevels(candles, { dailyCandles = [], tolerancePct = 0.35, maxLevels = 2 } = {}) {
    const data = (candles || []).filter(c => Number.isFinite(c.high) && Number.isFinite(c.low));
    if (!data.length) return { price: null, supports: [], resistances: [], pivots: [], zones: [], previousDay: { high: null, low: null } };
    const price = data.at(-1).close, highs = confirmedPivots(data,'high',3), lows = confirmedPivots(data,'low',3);
    const cluster = (points, side) => {
      const sorted=points.map(p=>p.value).sort((a,b)=>a-b), groups=[];
      for (const level of sorted) { const last=groups.at(-1),tol=Math.max(Math.abs(level)*tolerancePct/100,1e-12); if(last&&Math.abs(last.level-level)<=tol){last.values.push(level);last.level=last.values.reduce((a,b)=>a+b,0)/last.values.length}else groups.push({level,values:[level]}); }
      return groups.map(g=>({level:g.level,touches:g.values.length,side,low:g.level*(1-tolerancePct/100),high:g.level*(1+tolerancePct/100)})).filter(x=>side==='support'?x.level<price:x.level>price).sort((a,b)=>side==='support'?b.level-a.level:a.level-b.level).slice(0,maxLevels);
    };
    const supports=cluster(lows,'support'),resistances=cluster(highs,'resistance');
    const today=data.at(-1).time, utcDay=Math.floor(today/86400000), days=(dailyCandles||[]).filter(c=>Math.floor(c.time/86400000)<utcDay);
    const prior=days.at(-1);
    return {price,supports,resistances,pivots:[...highs.map(p=>({...p,side:'resistance'})),...lows.map(p=>({...p,side:'support'}))].sort((a,b)=>a.index-b.index),zones:[...supports,...resistances].filter(x=>x.touches>=2),previousDay:{high:prior?.high??null,low:prior?.low??null,time:prior?.time??null}};
  }
  function historicalPatternStats(candles, pattern, { horizon = 24, timeframe = '1h', eventList = null } = {}) {
    const data=(candles||[]).filter(c=>Number.isFinite(c.close)), events=(eventList||detect(data,timeframe).events).filter(e=>e.type===pattern), rows=[];
    for(const e of events){if(e.index+horizon>=data.length)continue;const entry=data[e.index].close,dir=e.direction,forward=data.slice(e.index+1,e.index+1+horizon);if(!forward.length)continue;let mfe=0,mae=0,hit=null;
      for(let j=0;j<forward.length;j++){const c=forward[j],fav=dir>0?(c.high-entry)/entry*100:(entry-c.low)/entry*100,adv=dir>0?(entry-c.low)/entry*100:(c.high-entry)/entry*100;mfe=Math.max(mfe,fav);mae=Math.max(mae,adv);if(!hit&&Number.isFinite(e.atr)&&e.atr>0){const target=entry+dir*e.atr,stop=entry-dir*e.atr,ht=dir>0?c.high>=target:c.low<=target,hs=dir>0?c.low<=stop:c.high>=stop;if(ht||hs)hit=hs?'LOSS':'WIN'}}
      rows.push({pattern,direction:dir>0?'Bullish':'Bearish',timeframe,time:data[e.index].time,index:e.index,entry,maxFavorablePct:mfe,maxAdversePct:mae,change10Pct:forward.length>=10?(forward[Math.min(9,forward.length-1)].close-entry)/entry*dir*100:null,change24Pct:(forward.at(-1).close-entry)/entry*dir*100,barrierOutcome:hit||'UNRESOLVED',sampleCandles:forward.length});}
    const mean=k=>rows.length?rows.reduce((s,r)=>s+(r[k]||0),0)/rows.length:null, resolved=rows.filter(r=>r.barrierOutcome!=='UNRESOLVED');
    return {pattern,timeframe,sampleCount:rows.length,favorableRate:resolved.length?100*resolved.filter(r=>r.barrierOutcome==='WIN').length/resolved.length:null,averageFavorablePct:mean('maxFavorablePct'),averageAdversePct:mean('maxAdversePct'),occurrences:rows};
  }
  function planSignal({strategy,direction,candles,index=candles.length-1,timeframe='1h',stop,confirmations=[],metadata={}}){
    const c=candles[index],entry=c?.close;if(!c||!Number.isFinite(entry)||!Number.isFinite(stop))return null;const risk=direction>0?entry-stop:stop-entry;if(!(risk>0))return null;
    return {strategy,name:STRATEGIES[strategy],direction:direction>0?'Bullish':'Bearish',side:direction>0?'LONG':'SHORT',timeframe,index,time:c.time,entry,stop,takeProfit1:entry+direction*risk*1.5,takeProfit2:entry+direction*risk*2.5,riskPct:risk/entry*100,rr1:1.5,rr2:2.5,confirmations,metadata};
  }
  function trendContinuationAnalysis(candlesByTimeframe={}){
    const matrix={},scores=[];for(const tf of ['15m','1h','4h','1d']){const d=(candlesByTimeframe[tf]||[]).filter(c=>Number.isFinite(c.close)),n=d.length-1,c=d[n];if(n<50){matrix[tf]={direction:'Neutral',score:0,rsi:null,reason:'Insufficient completed-candle history'};scores.push(0);continue}
      const e21=emaSeries(d,21),e50=emaSeries(d,50),s50=smaSeries(d,50),s200=n>=199?smaSeries(d,200):[],rsi=rsiSeries(d),highs=confirmedPivots(d,'high',2).slice(-3),lows=confirmedPivots(d,'low',2).slice(-3),hh=highs.length===3&&highs[0].value<highs[1].value&&highs[1].value<highs[2].value,hl=lows.length===3&&lows[0].value<lows[1].value&&lows[1].value<lows[2].value,lh=highs.length===3&&highs[0].value>highs[1].value&&highs[1].value>highs[2].value,ll=lows.length===3&&lows[0].value>lows[1].value&&lows[1].value>lows[2].value;
      const bullMA=c.close>e21[n]&&e21[n]>e50[n]&&c.close>(s50[n]||0)&&(!s200.length||c.close>s200[n]),bearMA=c.close<e21[n]&&e21[n]<e50[n]&&c.close<(s50[n]||Infinity)&&(!s200.length||c.close<s200[n]),bullStructure=hh&&hl,bearStructure=lh&&ll,dir=bullMA&&bullStructure?1:bearMA&&bearStructure?-1:0,vol=d.slice(-21,-1).map(x=>x.vol||0),avg=vol.length?vol.reduce((a,b)=>a+b,0)/vol.length:0,volRatio=avg?(c.vol||0)/avg:0,slope=(e21[n]-e21[Math.max(0,n-8)])/Math.max(Math.abs(e21[Math.max(0,n-8)]),1e-12)*100;
      const score=Math.max(0,Math.min(100,Math.round((bullMA||bearMA?30:0)+(bullStructure||bearStructure?30:0)+(dir&&Math.sign(slope)===dir?20:0)+(dir&&volRatio>=1?20:volRatio>=.7?10:0))));scores.push(score);matrix[tf]={direction:dir>0?'Bullish':dir<0?'Bearish':'Neutral',score,rsi:rsi[n],ema21:e21[n],ema50:e50[n],sma50:s50[n],sma200:s200[n]??null,structure:bullStructure?'HH+HL':bearStructure?'LH+LL':'Mixed',slopePct:slope,volumeMultiple:volRatio};
    }
    const d=(candlesByTimeframe['1h']||[]).filter(c=>Number.isFinite(c.close)),n=d.length-1,c=d[n],e21=emaSeries(d,21),e50=emaSeries(d,50),rsi=rsiSeries(d),vol=d.slice(-21,-1).map(x=>x.vol||0),avg=vol.length?vol.reduce((a,b)=>a+b,0)/vol.length:0,volOK=avg>0&&(c?.vol||0)>=avg,dir=matrix['1h']?.direction==='Bullish'?1:matrix['1h']?.direction==='Bearish'?-1:0,lo=Math.min(e21[n]||Infinity,e50[n]||Infinity),hi=Math.max(e21[n]||-Infinity,e50[n]||-Infinity),pullback=!!c&&c.low<=hi&&c.high>=lo,curled=n>0&&rsi[n]!=null&&rsi[n-1]!=null&&(dir>0?rsi[n]>rsi[n-1]:dir<0?rsi[n]<rsi[n-1]:false),trigger=!!c&&(dir>0?c.close>c.open:dir<0?c.close<c.open:false)&&volOK,checklist={structureAligned:!!dir,maFilterPassed:!!dir,pullbackDepthValid:pullback,momentumCurling:curled,volumeTriggerConfirmed:trigger},aligned=Object.values(matrix).filter(x=>x.direction!=='Neutral'),alignedAll=aligned.length===4&&aligned.every(x=>x.direction===matrix['1h']?.direction),strength=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:0;
    return{timeframes:matrix,direction:dir>0?'Bullish':dir<0?'Bearish':'Neutral',score:Math.round(strength),label:strength>=75?'Strong Trend':strength>=50?'Moderate Trend':'Weak / Choppy',multiTimeframeAligned:alignedAll,checklist,potentialContinuation:!!dir&&pullback,disclaimer:'Rule-based historical structure only; not financial advice, a prediction, or a trading signal.'};
  }
  function scanStrategies({candles,dailyCandles=[],timeframe='1h',quoteVolume24h=0,options={},only='all'}={}){
    const wants=key=>only==='all'||only===key;
    const data=(candles||[]).filter(c=>Number.isFinite(c.open)&&Number.isFinite(c.high)&&Number.isFinite(c.low)&&Number.isFinite(c.close));if(data.length<60)return [];
    const i=data.length-1,c=data[i],atr=atrSeries(data).at(-1)||c.close*.01,signals=[],events=(only==='all'||['hidden_bullish_divergence','ict','smc','price_action'].includes(only))?detect(data,timeframe).events:[];
    const add=s=>{if(s)signals.push(s)};
    // 1. Existing confirmed hidden bullish divergence; levels are anchored to a real confirmed pivot.
    if(wants('hidden_bullish_divergence')){const hidden=events.filter(e=>e.type==='hidden_bullish_divergence'&&e.index===i).at(-1);
    if(hidden){const pivot=confirmedPivots(data,'low').filter(p=>p.index<i).at(-1);if(pivot)add(planSignal({strategy:'hidden_bullish_divergence',direction:1,candles:data,index:i,timeframe,stop:pivot.value-atr*.25,confirmations:['Confirmed higher price low','RSI lower low','Bullish confirmation candle'],metadata:{pivotTime:pivot.time}}))}}
    // 2. V1 Method remains the owner-defined, long-only four-step rule set.
    if(wants('v1')&&timeframe==='1h'&&dailyCandles.length){const v=detectV1({hourly:data,daily:dailyCandles,quoteVolume24h,options:options.v1||{}});if(v.match?.time===c.time){const ref=v.match.reference;if(Number.isFinite(ref.stop))add({...planSignal({strategy:'v1',direction:1,candles:data,index:i,timeframe,stop:ref.stop,confirmations:['Daily EMA21/EMA50 + RSI + rising swings','1h pullback or RSI dip','RSI curling up','Bullish close and declining-volume trigger'],metadata:{reference:ref}}),takeProfit1:ref.takeProfit1??undefined,takeProfit2:ref.takeProfit2Resistance??ref.rr3??undefined})}}
    // 3. ICT rule approximation: sweep, displacement FVG, then an observed OTE retracement.
    if(wants('ict')){const sweeps=events.filter(e=>e.type==='liquidity_sweep'&&e.index<i&&i-e.index<=30);
    for(const sw of sweeps.slice(-5)){const gaps=events.filter(e=>e.type==='fair_value_gap'&&e.direction===sw.direction&&e.index>sw.index&&e.index<=i&&i-e.index<=12);const gap=gaps.at(-1);if(!gap)continue;const segment=data.slice(sw.index,gap.index+1),lo=Math.min(...segment.map(x=>x.low)),hi=Math.max(...segment.map(x=>x.high)),range=hi-lo;if(!(range>0))continue;const dir=sw.direction,oteLow=dir>0?hi-range*.79:lo+range*.618,oteHigh=dir>0?hi-range*.618:lo+range*.79,overlap=c.low<=oteHigh&&c.high>=oteLow&&gap.zoneLow<=c.high&&gap.zoneHigh>=c.low;if(overlap&&((dir>0&&c.close>c.open)||(dir<0&&c.close<c.open))){add(planSignal({strategy:'ict',direction:dir,candles:data,index:i,timeframe,stop:dir>0?Math.min(...segment.map(x=>x.low))-atr*.15:Math.max(...segment.map(x=>x.high))+atr*.15,confirmations:['Confirmed liquidity sweep','Displacement left an FVG','Current candle overlaps 61.8–79% retracement','Directional rejection close'],metadata:{sweepTime:sw.time,fvg:[gap.zoneLow,gap.zoneHigh],ote:[oteLow,oteHigh]}}));if(signals.at(-1)){const target=dir>0?hi:lo;if(dir*(target-signals.at(-1).entry)>0)signals.at(-1).takeProfit2=target}break}}}
    // 4. SMC: confirmed BOS/CHoCH followed by mitigation of its real opposing-candle block.
    if(wants('smc')){const breaks=events.filter(e=>(e.type==='bos'||e.type==='choch')&&e.index<i&&i-e.index<=40);
    for(const br of breaks.slice(-5)){const ob=events.find(e=>e.type==='order_block'&&e.index===br.index&&e.direction===br.direction);if(!ob||c.low>ob.zoneHigh||c.high<ob.zoneLow)continue;const rangeHigh=Math.max(...data.slice(Math.max(0,i-50),i+1).map(x=>x.high)),rangeLow=Math.min(...data.slice(Math.max(0,i-50),i+1).map(x=>x.low)),mid=(rangeHigh+rangeLow)/2,discount=br.direction>0?c.close<mid:c.close>mid;if(!discount||!(br.direction>0?c.close>c.open:c.close<c.open))continue;add(planSignal({strategy:'smc',direction:br.direction,candles:data,index:i,timeframe,stop:br.direction>0?ob.zoneLow-atr*.15:ob.zoneHigh+atr*.15,confirmations:[`Confirmed ${br.type.toUpperCase()}`,'Unmitigated order block retested','Discount/premium location','Directional rejection close'],metadata:{block:[ob.zoneLow,ob.zoneHigh],breakTime:br.time}}));if(signals.at(-1)){if(br.direction*(mid-signals.at(-1).entry)>0)signals.at(-1).takeProfit1=mid;const opposite=br.direction>0?rangeHigh:rangeLow;if(br.direction*(opposite-signals.at(-1).entry)>0)signals.at(-1).takeProfit2=opposite}break}}
    // 5. Price action: multi-touch clustered S/R plus an engulfing, pin rejection, or inside-bar break.
    if(wants('price_action')){const refs=referenceLevels(data,{maxLevels:4}),prev=data[i-1],body=Math.abs(c.close-c.open),range=c.high-c.low||1,lower=Math.min(c.open,c.close)-c.low,upper=c.high-Math.max(c.open,c.close);
    const nearSupport=refs.supports.find(x=>x.touches>=2&&c.low<=x.high&&c.close>x.level),nearResistance=refs.resistances.find(x=>x.touches>=2&&c.high>=x.low&&c.close<x.level);
    const bullEngulf=prev&&c.close>c.open&&prev.close<prev.open&&c.close>=prev.open&&c.open<=prev.close,bearEngulf=prev&&c.close<c.open&&prev.close>prev.open&&c.close<=prev.open&&c.open>=prev.close,prior2=data[i-2],insideBreakBull=prior2&&prev.high<prior2.high&&prev.low>prior2.low&&c.close>prior2.high,insideBreakBear=prior2&&prev.high<prior2.high&&prev.low>prior2.low&&c.close<prior2.low;
    const bullFlip=refs.resistances.find(x=>x.touches>=2&&data[i-1].close<x.level&&c.low<=x.high&&c.close>x.level),bearFlip=refs.supports.find(x=>x.touches>=2&&data[i-1].close>x.level&&c.high>=x.low&&c.close<x.level);
    const dir=(nearSupport&&(bullEngulf||lower>=2*body||insideBreakBull)||bullFlip)?1:(nearResistance&&(bearEngulf||upper>=2*body||insideBreakBear)||bearFlip)?-1:0;
    if(dir){const ref=dir>0?(bullFlip||nearSupport):(bearFlip||nearResistance),level=ref?.level??(dir>0?c.low:c.high),shape=insideBreakBull||insideBreakBear?'Inside-bar breakout':bullFlip||bearFlip?'Break-and-retest':bullEngulf||bearEngulf?'Engulfing close':'Pin-bar wick rejection';add(planSignal({strategy:'price_action',direction:dir,candles:data,index:i,timeframe,stop:dir>0?Math.min(c.low,level)-atr:Math.max(c.high,level)+atr,confirmations:[`Multi-touch ${dir>0?'support':'resistance'} (${ref?.touches||2} touches)`,shape],metadata:{level,atr}}))}}
    // 6. Pump: fully closed breakout candle with volume and RSI confirmation (long-only by specification).
    if(wants('pump')){const rsi=rsiSeries(data).at(-1),candleRange=c.high-c.low||1,volumes=data.slice(Math.max(0,i-20),i).map(x=>x.vol||0),avgVol=volumes.length?volumes.reduce((a,b)=>a+b,0)/volumes.length:0,resistance=Math.max(...data.slice(Math.max(0,i-20),i).map(x=>x.high)),multiplier=Number(options.pumpVolumeMultiplier)||2.5,minGain=Number(options.pumpMinGainPct)||0;
    if(avgVol>0&&c.close>c.open&&c.close>resistance&&(c.high-c.close)/candleRange<=.3&&(c.vol||0)>=avgVol*multiplier&&rsi>=55&&rsi<=80&&(c.close/resistance-1)*100>=minGain)add(planSignal({strategy:'pump',direction:1,candles:data,index:i,timeframe,stop:Math.min(c.low,c.close-atr),confirmations:[`Volume ${(c.vol/avgVol).toFixed(2)}× 20-bar average`, 'Close broke 20-bar resistance','Bullish body occupies top 30%','RSI(14) between 55 and 80'],metadata:{resistance,volumeMultiple:c.vol/avgVol,rsi}}))}
    return signals;
  }
  function runBacktest({candles,strategy='all',timeframe='1h',dailyCandles=[],quoteVolume24h=0,startTime=-Infinity,endTime=Infinity,feePerSidePct=.10,slippagePct=.05,maxHolding=24,initialCapital=10000,signalProvider=null}={}){
    const data=(candles||[]).filter(c=>Number.isFinite(c.close)&&Number.isFinite(c.open)),fee=Math.max(0,Number(feePerSidePct)||0)/100,slip=Math.max(0,Number(slippagePct)||0)/100,hold=Math.max(1,Math.min(500,Number(maxHolding)||24)),capital0=Math.max(1,Number(initialCapital)||10000),equity=capital0,trades=[];let cash=equity,peak=equity,maxDrawdown=0,totalFees=0;
    for(let i=60;i<data.length-1;i++){const sigs=signalProvider?signalProvider(data.slice(0,i+1),i):scanStrategies({candles:data.slice(0,i+1),dailyCandles:(dailyCandles||[]).filter(x=>x.time<=data[i].time),timeframe,quoteVolume24h,only:strategy});for(const s of sigs){if(strategy!=='all'&&s.strategy!==strategy)continue;if(s.time<data[i].time||s.time<startTime||s.time>endTime)continue;const dir=s.side==='LONG'?1:-1,entryRaw=data[i+1].open,entry=entryRaw*(1+dir*slip),risk=Math.abs(entry-s.stop);if(!(risk>0))continue;const tp=s.takeProfit1??(entry+dir*risk*1.5);let exit=entry,outcome='TIME_EXIT',exitIndex=Math.min(data.length-1,i+hold),gross=0;
      for(let j=i+1;j<=exitIndex;j++){const b=data[j],hitStop=dir>0?b.low<=s.stop:b.high>=s.stop,hitTp=dir>0?b.high>=tp:b.low<=tp;if(hitStop&&hitTp){exit=s.stop;outcome='LOSS';exitIndex=j;break}if(hitStop){exit=s.stop;outcome='LOSS';exitIndex=j;break}if(hitTp){exit=tp;outcome='WIN';exitIndex=j;break}exit=b.close}
      const exitWithSlip=exit*(1-dir*slip),move=dir*(exitWithSlip-entry)/entry,fees=fee*2,costPct=(fee+slip)*2,net=move-fees;gross=net;const pnl=cash*gross;cash+=pnl;totalFees+=cash*0+fees*capital0;peak=Math.max(peak,cash);maxDrawdown=Math.max(maxDrawdown,peak?100*(peak-cash)/peak:0);trades.push({strategy:s.strategy,direction:s.direction,timeframe,entryTime:data[i+1].time,exitTime:data[exitIndex].time,entry,stop:s.stop,takeProfit:tp,exit:exitWithSlip,outcome,grossPnlPct:move*100,netPnlPct:net*100,pnl,feesPct:costPct*100,r:risk?dir*(exitWithSlip-entry)/risk:null});
    }}
    const wins=trades.filter(t=>t.outcome==='WIN'),losses=trades.filter(t=>t.outcome==='LOSS'),grossWins=wins.reduce((a,t)=>a+t.pnl,0),grossLoss=Math.abs(losses.reduce((a,t)=>a+t.pnl,0));return{strategy,timeframe,totalTrades:trades.length,wins:wins.length,losses:losses.length,timeExits:trades.filter(t=>t.outcome==='TIME_EXIT').length,winRate:trades.length?wins.length/trades.length*100:null,netPnl:cash-capital0,netPnlPct:(cash/capital0-1)*100,maxDrawdownPct:maxDrawdown,profitFactor:grossLoss?grossWins/grossLoss:grossWins>0?Infinity:null,averageR:trades.length?trades.reduce((a,t)=>a+(t.r||0),0)/trades.length:null,totalFeesAndSlippagePct:trades.reduce((a,t)=>a+t.feesPct,0),endingEquity:cash,initialCapital:capital0,trades};
  }
  function createSignalTracker({storage=null,key='bp_signal_history_v1'}={}){
    if(!storage)try{storage=globalThis.localStorage}catch{}
    const safe=()=>{try{const a=JSON.parse(storage?.getItem(key)||'[]');return Array.isArray(a)?a:[]}catch{return[]}};
    const save=a=>{try{storage?.setItem(key,JSON.stringify(a))}catch{}return a};
    return {list:safe,add(signals,symbol){const rows=safe(),seen=new Set(rows.map(x=>x.id));for(const s of signals||[]){const id=[symbol,s.strategy,s.timeframe,s.time].join('|');if(seen.has(id))continue;rows.push({...s,symbol,id,status:'OPEN',createdAt:Date.now(),realizedPnlPct:null,unrealizedPnlPct:0});seen.add(id)}return save(rows)},resolve(symbol,candles){const rows=safe(),data=candles||[];for(const r of rows){if(r.symbol!==symbol||r.status!=='OPEN')continue;const future=data.filter(c=>c.time>r.time);for(const c of future){const long=r.side==='LONG',stop=long?c.low<=r.stop:c.high>=r.stop,tp=long?c.high>=(r.takeProfit1??r.takeProfit):c.low<=(r.takeProfit1??r.takeProfit);if(stop||tp){const loss=stop; r.status=loss?'LOSS':'WIN';r.resolvedAt=c.time;const px=loss?r.stop:(r.takeProfit1??r.takeProfit);r.realizedPnlPct=(long?px-r.entry:r.entry-px)/r.entry*100;r.unrealizedPnlPct=r.realizedPnlPct;break}}if(r.status==='OPEN'&&data.length){const last=data.at(-1).close;r.unrealizedPnlPct=(r.side==='LONG'?last-r.entry:r.entry-last)/r.entry*100}}return save(rows)},analytics(){const rows=safe(),done=rows.filter(x=>x.status!=='OPEN'),wins=done.filter(x=>x.status==='WIN'),byStrategy={};for(const k of Object.keys(STRATEGIES)){const set=rows.filter(x=>x.strategy===k),closed=set.filter(x=>x.status!=='OPEN');byStrategy[k]={total:set.length,wins:closed.filter(x=>x.status==='WIN').length,losses:closed.filter(x=>x.status==='LOSS').length,open:set.filter(x=>x.status==='OPEN').length,winRate:closed.length?closed.filter(x=>x.status==='WIN').length/closed.length*100:null,avgPnl:closed.length?closed.reduce((a,x)=>a+(x.realizedPnlPct||0),0)/closed.length:null}}return{total:rows.length,wins:wins.length,losses:done.length-wins.length,open:rows.length-done.length,winRate:done.length?wins.length/done.length*100:null,averagePnl:done.length?done.reduce((a,x)=>a+(x.realizedPnlPct||0),0)/done.length:null,byStrategy}}
    };
  }

  return { RULES, detect, detectV1, rsiSeries, atrSeries, emaSeries, confirmedPivots, clusterSwings, zigZag, smaSeries, referenceLevels, historicalPatternStats, scanStrategies, runBacktest, createSignalTracker, trendContinuationAnalysis, STRATEGIES, BACKTEST_HORIZON, SWING_SPAN, MIN_V1_SAMPLE };
});
