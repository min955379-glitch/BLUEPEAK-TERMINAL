const assert = require('node:assert/strict');
require('./pattern-scanner.js');
const S = require('./scan-watched-assets.js');
(async()=>{
  const fake = async url => url.includes('/ticker/24hr?symbol=')
    ? ({ok:true,json:async()=>({quoteVolume:'12500000'})})
    : url.includes('/ticker/24hr')
      ? ({ok:true,json:async()=>[{symbol:'BTCUSDT',lastPrice:'100',priceChange:'2',priceChangePercent:'2',highPrice:'110',lowPrice:'90',quoteVolume:'12500000'}]})
      : ({ok:true,json:async()=>Array.from({length:100},(_,i)=>[i*3600000,'100','101','99','100','1',0,'12000000'])});
  const candles = await S.loadCandles('BTCUSDT',{fetchImpl:fake,now:99.5*3600000});
  assert.equal(candles.length,99,'exclude the still-open hourly candle');
  assert.equal(candles[0].open,100);
  assert.equal(candles[0].quoteVol,12000000);
  assert.equal(await S.load24hQuoteVolume('BTCUSDT',{fetchImpl:fake}),12500000);
  const results = await S.scanAssets([{symbol:'BTCUSDT',name:'Bitcoin'}],{fetchImpl:fake,now:99.5*3600000});
  assert.equal(results.length,1);
  assert.equal(results[0].interval,'1h');
  assert.equal(results[0].quoteVolume24h,12500000);
  assert.ok(results[0].v1);
  assert.equal(S.getBacktests(results).length,6);
  const all=await S.loadAllTickers({fetchImpl:fake});assert.equal(all.get('BTCUSDT').lastPrice,100);
  const momentum=S.momentumScore(Array.from({length:60},(_,i)=>({time:i,open:100,high:102,low:98,close:100+(i%3),vol:100+i})),{highPrice:105,lowPrice:95});
  assert.ok(momentum.score>=0&&momentum.score<=100);assert.equal(momentum.formula.includes('40% RSI'),true);
  const overview=S.marketOverview(Array.from({length:18},(_,i)=>({asset:{symbol:`C${i}USDT`},ticker:{priceChangePercent:i-9,quoteVolume:1000+i,highPrice:110,lowPrice:90},candles:Array.from({length:60},(_,j)=>({time:j,open:100,high:102,low:98,close:100+(i%2?1:-1),vol:100+j}))})));assert.equal(overview.assets,18);assert.ok(['Bullish Expansion','Bearish Pullback','Range / Consolidation'].includes(overview.regime));assert.ok(overview.topGainer&&overview.topLoser&&overview.volumeLeader);
  const details=S.coinDetails({asset:{symbol:'BTCUSDT'},ticker:{lastPrice:100,highPrice:110,lowPrice:90,quoteVolume:5000},marketCap:1000000,candlesByTimeframe:{'1h':Array.from({length:100},(_,i)=>({time:i*3600000,open:100,high:102,low:98,close:100+(i%2),vol:100})), '1d':[]}});assert.equal(details.symbol,'BTCUSDT');assert.ok(details.timeframes['1h']);
  await assert.rejects(()=>S.loadCandles('bad symbol',{fetchImpl:fake}));
  console.log('asset scanner adapter tests passed');
})().catch(e=>{console.error(e);process.exit(1)});
