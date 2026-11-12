const assert = require('node:assert/strict');
require('./pattern-scanner.js');
const S = require('./scan-watched-assets.js');
(async()=>{
  const fake = async url => url.includes('/ticker/24hr')
    ? ({ok:true,json:async()=>({quoteVolume:'12500000'})})
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
  await assert.rejects(()=>S.loadCandles('bad symbol',{fetchImpl:fake}));
  console.log('asset scanner adapter tests passed');
})().catch(e=>{console.error(e);process.exit(1)});
