const assert = require('node:assert/strict');
const fs = require('node:fs');
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
  const progress=[];const results = await S.scanAssets([{symbol:'BTCUSDT',name:'Bitcoin'}],{fetchImpl:fake,now:99.5*3600000,limit:320,dailyLimit:60,concurrency:9,onProgress:p=>progress.push(p)});
  assert.equal(results.length,1);
  assert.equal(results[0].interval,'1h');
  assert.equal(progress.length,1);assert.equal(progress[0].completed,1);assert.equal(progress[0].total,1);assert.equal(progress[0].partialResults.length,1);assert.equal(progress[0].latestAssetResult.asset.symbol,'BTCUSDT');
  assert.equal(results[0].quoteVolume24h,12500000);
  assert.ok(results[0].v1);
  assert.equal(S.getBacktests(results).length,6);
  const scanSymbols=['PAXGUSDT','ADAUSDT','ARBUSD','APTUSDT','NEARUSDT','DOTUSDT','TRXUSDT','SUIUSDT','LINKUSDT','PEPEUSDT','SHIBUSDT','AVAXUSDT','ADAUSDT','DOGEUSDT','XRPUSDT','BNBUSDT','SOLUSDT','ETHUSDT','BTCUSDT'].filter((x,i,a)=>a.indexOf(x)===i),stream=[];
  const progressive=await S.scanAssets(scanSymbols.map(symbol=>({symbol,ticker:symbol.replace('USDT','')})),{fetchImpl:fake,now:99.5*3600000,limit:320,dailyLimit:60,concurrency:9,onProgress:p=>stream.push(p)});
  assert.deepEqual(progressive.slice(0,6).map(r=>r.asset.symbol),['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT'],'flagship markets are ordered first for streaming results');
  assert.equal(stream.length,scanSymbols.length);assert.deepEqual(stream.map(x=>x.completed),Array.from({length:scanSymbols.length},(_,i)=>i+1));assert.ok(stream.every(x=>x.partialResults.length===x.completed&&x.latestAssetResult));
  const all=await S.loadAllTickers({fetchImpl:fake});assert.equal(all.get('BTCUSDT').lastPrice,100);
  const momentum=S.momentumScore(Array.from({length:60},(_,i)=>({time:i,open:100,high:102,low:98,close:100+(i%3),vol:100+i})),{highPrice:105,lowPrice:95});
  assert.ok(momentum.score>=0&&momentum.score<=100);assert.equal(momentum.formula.includes('40% RSI'),true);
  const overview=S.marketOverview(Array.from({length:18},(_,i)=>({asset:{symbol:`C${i}USDT`},ticker:{priceChangePercent:i-9,quoteVolume:1000+i,highPrice:110,lowPrice:90},candles:Array.from({length:60},(_,j)=>({time:j,open:100,high:102,low:98,close:100+(i%2?1:-1),vol:100+j}))})));assert.equal(overview.assets,18);assert.ok(['Bullish Expansion','Bearish Pullback','Range / Consolidation'].includes(overview.regime));assert.ok(overview.topGainer&&overview.topLoser&&overview.volumeLeader);
  const details=S.coinDetails({asset:{symbol:'BTCUSDT'},ticker:{lastPrice:100,highPrice:110,lowPrice:90,quoteVolume:5000},marketCap:1000000,candlesByTimeframe:{'1h':Array.from({length:100},(_,i)=>({time:i*3600000,open:100,high:102,low:98,close:100+(i%2),vol:100})), '1d':[]}});assert.equal(details.symbol,'BTCUSDT');assert.ok(details.timeframes['1h']);
  await assert.rejects(()=>S.loadCandles('bad symbol',{fetchImpl:fake}));
  // Retry across official Binance mirrors, and ensure a hung endpoint is aborted before failover.
  const mirrors=['https://data-api.binance.vision','https://api.binance.com'],tried=[];
  const mirrorResult=await S.fetchBinanceJson('/api/v3/test',{mirrors,timeoutMs:50,fetchImpl:async url=>{tried.push(url);return url.startsWith(mirrors[0])?{ok:false,status:429}:{ok:true,json:async()=>({ok:true})}}});
  assert.deepEqual(tried,mirrors.map(x=>x+'/api/v3/test'));assert.equal(mirrorResult.ok,true);
  const timeoutHosts=[];await assert.rejects(()=>S.fetchBinanceJson('/api/v3/slow',{mirrors,timeoutMs:10,fetchImpl:(url,{signal})=>{timeoutHosts.push(url);return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted'))))}}));
  assert.equal(timeoutHosts.length,mirrors.length,'a stalled request times out and tries each configured official mirror');
  assert.equal(S.CACHE_TTL,180000);
  let cacheCalls=0;const cacheFetch=async url=>{cacheCalls++;return fake(url)};
  const cached=await S.loadCandles('LTCUSDT',{fetchImpl:cacheFetch,now:99.5*3600000,limit:100});
  const cachedAgain=await S.loadCandles('LTCUSDT',{fetchImpl:async()=>{throw new Error('fresh cache must avoid request')},now:99.5*3600000,limit:100});
  assert.equal(cacheCalls,1);assert.deepEqual(cachedAgain,cached,'fresh session cache resolves without another HTTP call');
  const previousSession=global.sessionStorage,staleKey='bp_klines_v1:XRPUSDT:1h',staleData={savedAt:Date.now()-S.CACHE_TTL-1000,limit:100,data:cached};
  global.sessionStorage={getItem:key=>key===staleKey?JSON.stringify(staleData):null,setItem(){}};
  try{const stale=await S.loadCandles('XRPUSDT',{fetchImpl:async()=>{throw new Error('background refresh expected to fail in this test')},now:99.5*3600000,limit:100});assert.deepEqual(stale,cached,'stale cache is returned immediately while refresh runs in the background')}finally{if(previousSession===undefined)delete global.sessionStorage;else global.sessionStorage=previousSession}
  const fastRows=Array.from({length:18},(_,i)=>({asset:{symbol:`F${i}USDT`,ticker:`F${i}`},ticker:{symbol:`F${i}USDT`,lastPrice:i%2?120:80,priceChange:i-8,priceChangePercent:i-8,highPrice:125,lowPrice:75,quoteVolume:1000000+i}}));
  const fastOverview=S.marketOverview(fastRows);
  assert.equal(fastOverview.assets,18);assert.equal(fastOverview.breadthBasis,'24h midpoint');assert.ok(fastOverview.aboveBreadth>0&&fastOverview.aboveBreadth<18);
  assert.ok(fastOverview.rows.every(x=>x.momentum.score>=0&&x.momentum.score<=100));assert.ok(fastOverview.topGainer&&fastOverview.topLoser&&fastOverview.volumeLeader&&fastOverview.momentumLeader);
  const adapterSource=fs.readFileSync(require.resolve('./scan-watched-assets.js'),'utf8'),indexSource=fs.readFileSync(require.resolve('./index.html'),'utf8');
  assert.match(adapterSource,/const MIRRORS=\['https:\/\/data-api\.binance\.vision','https:\/\/api1\.binance\.com','https:\/\/api2\.binance\.com','https:\/\/api3\.binance\.com'\]/);
  assert.match(adapterSource,/timeoutMs=3500/);assert.match(adapterSource,/bp_klines_v1:/);assert.match(adapterSource,/CACHE_TTL=180000/);assert.match(adapterSource,/limit=250/);assert.match(adapterSource,/limit=320,dailyLimit=60,concurrency=9/);assert.match(adapterSource,/const priority=\['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT'\]/);assert.match(adapterSource,/completed:done,total:ordered.length,asset:asset.symbol,latestAssetResult:results\[i\],partialResults/);assert.match(adapterSource,/mirrorCursor\+\+%mirrors.length/);assert.match(adapterSource,/const n=Math.max\(60,Math.min\(1000/);
  assert.match(indexSource,/bp_market_overview_cache_v1/);assert.match(indexSource,/bp_ticker_24h_cache_v1/);assert.match(indexSource,/fetchBinanceJson\('\/api\/v3\/ticker\/24hr'\)/);assert.match(indexSource,/setTimeout\(\(\)=>\{if\(!state\.marketOverview&&!tickerRowsFromState\(\)\.length\)/);assert.match(indexSource,/\}\s*,1500\)/);assert.match(indexSource,/fetchBinanceJson\(pathWithQuery,\{timeoutMs=3500\}/);assert.match(indexSource,/https:\/\/api3\.binance\.com/);
  const fastRefresh=indexSource.slice(indexSource.indexOf('async function refreshMarketOverview()'),indexSource.indexOf('function openCoinDetails('));
  assert.match(fastRefresh,/updateMarketOverviewFromTickers/);assert.match(fastRefresh,/refineMarketOverview/);assert.doesNotMatch(fastRefresh,/await scanner\.loadCandles/,'initial market strip must not wait for OHLCV fanout');
  assert.match(indexSource,/Array\.from\(\{length:4\},worker\)/,'background refinement is bounded to four concurrent candle loads');
  const accessSource=fs.readFileSync(require.resolve('./bluepeak-access-ui.js'),'utf8');assert.match(accessSource,/limit:320,dailyLimit:60,concurrency:9/);assert.match(accessSource,/limit:320\}\),daily=only==='v1'\|\|only==='all'\?await S\.loadCandles\(asset\.symbol,\{interval:'1d',limit:60\}/);assert.match(accessSource,/await Promise\.all\(Array\.from\(\{length:9\},worker\)\)/);
  console.log('asset scanner adapter, mirror failover, cache, and ticker-only breadth tests passed');
})().catch(e=>{console.error(e);process.exit(1)});
