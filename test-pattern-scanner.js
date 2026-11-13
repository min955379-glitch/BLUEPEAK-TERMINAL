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

// The six scanner registry and new deterministic engines are public and testable.
assert.deepEqual(Object.keys(P.STRATEGIES), ['hidden_bullish_divergence','v1','ict','smc','price_action','pump']);
function seededCandles(seed,count=180){let x=seed,rand=()=>((x=(x*1664525+1013904223)>>>0)/4294967296),price=100,out=[];for(let i=0;i<count;i++){const drift=i<80?.02:i<130?-.01:.005;price=Math.max(2,price+drift+(rand()-.52)*2);const open=price-(rand()-.5)*.35;out.push({time:i,open,high:Math.max(price,open)+.3,low:Math.min(price,open)-.3,close:price,vol:100+(rand()-.5)*50})}return out}
const hiddenFixture=(()=>{let x=594,rand=()=>((x=(x*1664525+1013904223)>>>0)/4294967296),price=100,out=[];for(let i=0;i<100;i++){price+= (i<50?.03:-.005)+(rand()-.52)*2;const open=price-(rand()-.5)*.5;out.push({time:i,open,high:price+.15,low:price-.25,close:price,vol:100})}return out})();
assert.ok(P.scanStrategies({candles:hiddenFixture,only:'hidden_bullish_divergence'}).length,'Hidden Bullish Divergence scanner emits a rule-confirmed setup');
assert.ok(P.scanStrategies({candles:seededCandles(1),only:'ict'}).length,'ICT scanner recognizes sweep-displacement-OTE fixture');
assert.ok(P.scanStrategies({candles:seededCandles(23),only:'smc'}).length,'SMC scanner recognizes BOS/CHoCH-order-block retest fixture');
assert.ok(P.scanStrategies({candles:seededCandles(2),only:'price_action'}).length,'Price Action scanner recognizes multi-touch rejection fixture');
const pumpFixture=seededCandles(1);{const resistance=Math.max(...pumpFixture.slice(-21,-1).map(c=>c.high)),close=resistance*1.02,open=close-(close-resistance)*2;pumpFixture[pumpFixture.length-1]={time:179,open,high:close+.05,low:open-.05,close,vol:10000}}
assert.ok(P.scanStrategies({candles:pumpFixture,only:'pump'}).length,'Pump scanner requires breakout, volume, candle body, and RSI filters');
const sweepFixture = Array.from({length:120},(_,i)=>{const center=100+8*Math.sin(i*Math.PI/10);return{time:Date.UTC(2026,0,1)+i*3600000,open:center-.3,high:center+1,low:center-1,close:center,vol:1000+(i%7)*10}});
assert.deepEqual(P.scanStrategies({candles:sweepFixture,timeframe:'1h'}),P.scanStrategies({candles:sweepFixture,timeframe:'1h'}),'scanner outputs are deterministic');
const levels=P.referenceLevels(sweepFixture,{dailyCandles:Array.from({length:3},(_,i)=>({time:Date.UTC(2025,11,29+i),open:100,high:110+i,low:90-i,close:100,vol:1}))});
assert.ok(levels.pivots.length>0,'reference engine returns confirmed swings');
assert.ok(levels.supports.every(x=>x.level<levels.price));
assert.ok(levels.resistances.every(x=>x.level>levels.price));
assert.equal(typeof levels.previousDay.high,'number');assert.equal(typeof levels.previousDay.low,'number');
const trend=P.trendContinuationAnalysis(Object.fromEntries(['15m','1h','4h','1d'].map(tf=>[tf,sweepFixture])));assert.ok(trend.score>=0&&trend.score<=100);assert.ok(['Strong Trend','Moderate Trend','Weak / Choppy'].includes(trend.label));assert.deepEqual(Object.keys(trend.timeframes),['15m','1h','4h','1d']);assert.ok('structureAligned' in trend.checklist);
const hist=P.historicalPatternStats(flat,'bos');assert.equal(hist.sampleCount,0);assert.ok(Array.isArray(hist.occurrences));
const winBars=Array.from({length:64},(_,i)=>({time:i,open:100,high:i===61?116:101,low:99,close:100,vol:10}));
const win=P.runBacktest({candles:winBars,strategy:'pump',feePerSidePct:.1,slippagePct:0,maxHolding:3,signalProvider:(prefix)=>prefix.length===61?[{strategy:'pump',side:'LONG',direction:'Bullish',time:prefix.at(-1).time,stop:90,takeProfit1:115}]:[]});
assert.equal(win.totalTrades,1);assert.equal(win.wins,1);assert.equal(win.trades[0].outcome,'WIN');assert.ok(win.netPnlPct<16&&win.netPnlPct>14,'round-trip fees are deducted');assert.equal(win.trades[0].exitTime,61);
assert.equal(win.averageR,1.5,'R:R is computed from execution entry, stop risk, and realized exit');
assert.equal(win.maxDrawdownPct,0,'a monotonic profitable backtest has zero peak-to-trough drawdown');
assert.equal(win.totalTrades,1,'trade count includes the deterministic completed setup exactly once');
const lossBars=Array.from({length:64},(_,i)=>({time:i,open:100,high:i===61?116:101,low:i===61?89:99,close:100,vol:10}));
const loss=P.runBacktest({candles:lossBars,strategy:'pump',feePerSidePct:0,slippagePct:0,maxHolding:3,signalProvider:prefix=>prefix.length===61?[{strategy:'pump',side:'LONG',time:prefix.at(-1).time,stop:90,takeProfit1:115}]:[]});
assert.equal(loss.trades[0].outcome,'LOSS','same-candle SL/TP touch resolves conservatively to SL');assert.equal(loss.losses,1);assert.ok(loss.maxDrawdownPct>0,'a losing trade increases peak-to-trough drawdown');
const store={value:'[]',getItem(){return this.value},setItem(k,v){this.value=v}};
const tracker=P.createSignalTracker({storage:store}),signal={strategy:'pump',timeframe:'1h',time:1,side:'LONG',entry:100,stop:95,takeProfit1:110};
tracker.add([signal],'BTCUSDT');tracker.add([signal],'BTCUSDT');assert.equal(tracker.list().length,1,'signal history is deduplicated');
tracker.resolve('BTCUSDT',[{time:2,open:100,high:102,low:94,close:96}]);assert.equal(tracker.list()[0].status,'LOSS');assert.equal(tracker.analytics().losses,1);
const winningSignal={...signal,time:10,entry:100,stop:95,takeProfit1:110};tracker.add([winningSignal],'ETHUSDT');assert.equal(tracker.list().find(x=>x.symbol==='ETHUSDT').status,'OPEN');tracker.resolve('ETHUSDT',[{time:11,open:100,high:111,low:99,close:110}]);assert.equal(tracker.list().find(x=>x.symbol==='ETHUSDT').status,'WIN','an open signal resolves to WIN when its target is reached first');assert.equal(tracker.analytics().wins,1);
console.log('pattern scanner, six-strategy, reference-level, backtest, and tracker tests passed');
