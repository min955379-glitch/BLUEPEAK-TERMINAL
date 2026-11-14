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
  const scanSymbols=['BTCUSDT','ETHUSDT','XRPUSDT','SOLUSDT','TRXUSDT','BCHUSDT','ADAUSDT','DOTUSDT','LTCUSDT','AVAXUSDT','LINKUSDT','XLMUSDT','HBARUSDT','SUIUSDT','TONUSDT','NEARUSDT','ETCUSDT','FILUSDT','ATOMUSDT','VETUSDT','ALGOUSDT','APTUSDT','ARBUSDT','OPUSDT','STXUSDT','TIAUSDT','SEIUSDT','JASMYUSDT','GRTUSDT','RENDERUSDT','PYTHUSDT','IOTAUSDT','ZILUSDT','CKBUSDT','XECUSDT','TAOUSDT','BATUSDT','LPTUSDT','POLUSDT','THETAUSDT','TWTUSDT','ZROUSDT','MASKUSDT','NEOUSDT','EGLDUSDT'].slice().reverse(),stream=[];
  const progressive=await S.scanAssets(scanSymbols.map(symbol=>({symbol,ticker:symbol.replace('USDT','')})),{fetchImpl:fake,now:99.5*3600000,limit:320,dailyLimit:60,concurrency:9,onProgress:p=>stream.push(p)});
  assert.deepEqual(progressive.slice(0,6).map(r=>r.asset.symbol),['BTCUSDT','ETHUSDT','XRPUSDT','SOLUSDT','TRXUSDT','BCHUSDT'],'flagship markets are ordered first for streaming results');assert.equal(progressive.length,45,'all 45 tracked markets scan');
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
  const cached=await S.loadCandles('ZECUSDT',{fetchImpl:cacheFetch,now:99.5*3600000,limit:100});
  const cachedAgain=await S.loadCandles('ZECUSDT',{fetchImpl:async()=>{throw new Error('fresh cache must avoid request')},now:99.5*3600000,limit:100});
  assert.equal(cacheCalls,1);assert.deepEqual(cachedAgain,cached,'fresh session cache resolves without another HTTP call');
  const previousSession=global.sessionStorage,staleKey='bp_klines_v1:EOSUSDT:1h',staleData={savedAt:Date.now()-S.CACHE_TTL-1000,limit:100,data:cached};
  global.sessionStorage={getItem:key=>key===staleKey?JSON.stringify(staleData):null,setItem(){}};
  try{const stale=await S.loadCandles('EOSUSDT',{fetchImpl:async()=>{throw new Error('background refresh expected to fail in this test')},now:99.5*3600000,limit:100});assert.deepEqual(stale,cached,'stale cache is returned immediately while refresh runs in the background')}finally{if(previousSession===undefined)delete global.sessionStorage;else global.sessionStorage=previousSession}
  const fastRows=Array.from({length:18},(_,i)=>({asset:{symbol:`F${i}USDT`,ticker:`F${i}`},ticker:{symbol:`F${i}USDT`,lastPrice:i%2?120:80,priceChange:i-8,priceChangePercent:i-8,highPrice:125,lowPrice:75,quoteVolume:1000000+i}}));
  const fastOverview=S.marketOverview(fastRows);
  assert.equal(fastOverview.assets,18);assert.equal(fastOverview.breadthBasis,'24h midpoint');assert.ok(fastOverview.aboveBreadth>0&&fastOverview.aboveBreadth<18);
  assert.ok(fastOverview.rows.every(x=>x.momentum.score>=0&&x.momentum.score<=100));assert.ok(fastOverview.topGainer&&fastOverview.topLoser&&fastOverview.volumeLeader&&fastOverview.momentumLeader);
  const adapterSource=fs.readFileSync(require.resolve('./scan-watched-assets.js'),'utf8'),indexSource=fs.readFileSync(require.resolve('./index.html'),'utf8');
  assert.match(adapterSource,/const MIRRORS=\['https:\/\/data-api\.binance\.vision','https:\/\/api1\.binance\.com','https:\/\/api2\.binance\.com','https:\/\/api3\.binance\.com'\]/);
  assert.match(adapterSource,/timeoutMs=3500/);assert.match(adapterSource,/bp_klines_v1:/);assert.match(adapterSource,/CACHE_TTL=180000/);assert.match(adapterSource,/limit=250/);assert.match(adapterSource,/limit=320,dailyLimit=60,concurrency=9/);assert.match(adapterSource,/const priority=\['BTCUSDT','ETHUSDT','XRPUSDT','SOLUSDT','TRXUSDT','BCHUSDT'\]/);assert.match(adapterSource,/expectedAssets:45/);assert.match(adapterSource,/completed:done,total:ordered.length,asset:asset.symbol,latestAssetResult:results\[i\],partialResults/);assert.match(adapterSource,/mirrorCursor\+\+%mirrors.length/);assert.match(adapterSource,/const n=Math.max\(60,Math.min\(1000/);
  assert.match(indexSource,/bp_market_overview_cache_v1/);assert.match(indexSource,/bp_ticker_24h_cache_v1/);assert.match(indexSource,/fetchBinanceJson\('\/api\/v3\/ticker\/24hr'\)/);assert.match(indexSource,/setTimeout\(\(\)=>\{if\(!state\.marketOverview&&!tickerRowsFromState\(\)\.length\)/);assert.match(indexSource,/\}\s*,1500\)/);assert.match(indexSource,/fetchBinanceJson\(pathWithQuery,\{timeoutMs=3500\}/);assert.match(indexSource,/https:\/\/api3\.binance\.com/);
  const fastRefresh=indexSource.slice(indexSource.indexOf('async function refreshMarketOverview()'),indexSource.indexOf('function openCoinDetails('));
  assert.match(fastRefresh,/updateMarketOverviewFromTickers/);assert.match(fastRefresh,/refineMarketOverview/);assert.doesNotMatch(fastRefresh,/await scanner\.loadCandles/,'initial market strip must not wait for OHLCV fanout');
  assert.match(indexSource,/Array\.from\(\{length:4\},worker\)/,'background refinement is bounded to four concurrent candle loads');
  const accessSource=fs.readFileSync(require.resolve('./bluepeak-access-ui.js'),'utf8');assert.match(accessSource,/limit:320,dailyLimit:60,concurrency:9/);assert.match(accessSource,/limit:320\}\),daily=only==='v1'\|\|only==='all'\?await S\.loadCandles\(asset\.symbol,\{interval:'1d',limit:60\}/);assert.match(accessSource,/await Promise\.all\(Array\.from\(\{length:9\},worker\)\)/);
  // ---- 45-pair watchlist parity + market breadth & sentiment engine ----
  const {WATCHED_ASSET_COUNT,SENTIMENT_SOURCE}=S;
  assert.equal(WATCHED_ASSET_COUNT,45);
  assert.equal(SENTIMENT_SOURCE,'Binance Spot Public API (24hr Ticker & Live WebSocket)');
  const indexWatch=indexSource.slice(indexSource.indexOf('const assets=['),indexSource.indexOf('];',indexSource.indexOf('const assets=[')));
  const indexSymbols=[...indexWatch.matchAll(/symbol:'([A-Z0-9]+USDT)'/g)].map(m=>m[1]);
  assert.deepEqual(indexSymbols,['BTCUSDT','ETHUSDT','XRPUSDT','SOLUSDT','TRXUSDT','BCHUSDT','ADAUSDT','DOTUSDT','LTCUSDT','AVAXUSDT','LINKUSDT','XLMUSDT','HBARUSDT','SUIUSDT','TONUSDT','NEARUSDT','ETCUSDT','FILUSDT','ATOMUSDT','VETUSDT','ALGOUSDT','APTUSDT','ARBUSDT','OPUSDT','STXUSDT','TIAUSDT','SEIUSDT','JASMYUSDT','GRTUSDT','RENDERUSDT','PYTHUSDT','IOTAUSDT','ZILUSDT','CKBUSDT','XECUSDT','TAOUSDT','BATUSDT','LPTUSDT','POLUSDT','THETAUSDT','TWTUSDT','ZROUSDT','MASKUSDT','NEOUSDT','EGLDUSDT'],'index.html tracks the exact 45 requested USDT pairs in order');
  assert.equal(indexWatch.match(/symbol:'/g).length,45);
  const accessWatch=accessSource.slice(accessSource.indexOf('const watched=['),accessSource.indexOf('].map(([symbol,name,ticker])'));
  const accessSymbols=[...accessWatch.matchAll(/\['([A-Z0-9]+USDT)'/g)].map(m=>m[1]);
  assert.deepEqual(accessSymbols,['BTCUSDT','ETHUSDT','XRPUSDT','SOLUSDT','TRXUSDT','BCHUSDT','ADAUSDT','DOTUSDT','LTCUSDT','AVAXUSDT','LINKUSDT','XLMUSDT','HBARUSDT','SUIUSDT','TONUSDT','NEARUSDT','ETCUSDT','FILUSDT','ATOMUSDT','VETUSDT','ALGOUSDT','APTUSDT','ARBUSDT','OPUSDT','STXUSDT','TIAUSDT','SEIUSDT','JASMYUSDT','GRTUSDT','RENDERUSDT','PYTHUSDT','IOTAUSDT','ZILUSDT','CKBUSDT','XECUSDT','TAOUSDT','BATUSDT','LPTUSDT','POLUSDT','THETAUSDT','TWTUSDT','ZROUSDT','MASKUSDT','NEOUSDT','EGLDUSDT'],'the approved-user scanner tracks the same 45 pairs');
  for(const removed of ['BNBUSDT','DOGEUSDT','SHIBUSDT','PEPEUSDT','PAXGUSDT']){
    assert.equal(indexSymbols.includes(removed),false,`${removed} must be gone from index.html`);
    assert.equal(accessSymbols.includes(removed),false,`${removed} must be gone from the scanner`);
    assert.doesNotMatch(adapterSource,new RegExp(`['\"]${removed}['\"]`),`${removed} must be gone from the scanner adapter`);
  }
  // deterministic fixture: 20 bullish, 15 bearish, 10 neutral of 45 analysed markets
  const sentimentRow=(symbol,i)=>{
    const bullish=i<20,bearish=i>=20&&i<35;
    const last=bullish?110:bearish?78:100,high=110,low=80,change=bullish?2:bearish?-2:0.1;
    return{asset:{symbol,ticker:symbol.replace('USDT','')},ticker:{symbol,lastPrice:last,highPrice:high,lowPrice:low,priceChangePercent:change}};
  };
  const sentiment=S.marketSentiment(['BTCUSDT','ETHUSDT','XRPUSDT','SOLUSDT','TRXUSDT','BCHUSDT','ADAUSDT','DOTUSDT','LTCUSDT','AVAXUSDT','LINKUSDT','XLMUSDT','HBARUSDT','SUIUSDT','TONUSDT','NEARUSDT','ETCUSDT','FILUSDT','ATOMUSDT','VETUSDT','ALGOUSDT','APTUSDT','ARBUSDT','OPUSDT','STXUSDT','TIAUSDT','SEIUSDT','JASMYUSDT','GRTUSDT','RENDERUSDT','PYTHUSDT','IOTAUSDT','ZILUSDT','CKBUSDT','XECUSDT','TAOUSDT','BATUSDT','LPTUSDT','POLUSDT','THETAUSDT','TWTUSDT','ZROUSDT','MASKUSDT','NEOUSDT','EGLDUSDT'].map(sentimentRow),{now:1700000000000});
  assert.equal(sentiment.totalAnalyzed,45);
  assert.equal(sentiment.bullishCount,20);assert.equal(sentiment.bearishCount,15);assert.equal(sentiment.neutralCount,10);
  assert.equal(sentiment.bullishPct,44.4);assert.equal(sentiment.bearishPct,33.3);assert.equal(sentiment.neutralPct,22.3);
  assert.equal(Number((sentiment.bullishPct+sentiment.bearishPct+sentiment.neutralPct).toFixed(1)),100);
  assert.equal(sentiment.dominant,'BULLISH');assert.equal(sentiment.dominantPct,44.4);
  assert.equal(sentiment.totalAssetUniverse,45);assert.equal(sentiment.missingCount,0);
  assert.equal(sentiment.dataSource,'Binance Spot Public API (24hr Ticker & Live WebSocket)');
  assert.equal(sentiment.lastUpdated,1700000000000);
  assert.equal(sentiment.classifications.filter(x=>x.sentiment==='Bullish').length,20,'classification counts match the reported counts');
  // guard clauses: strong moves qualify even against an unfavourable intraday range position
  const edge=S.marketSentiment([
    {asset:{symbol:'AUSDT'},ticker:{lastPrice:80,highPrice:110,lowPrice:80,priceChangePercent:1.25}},
    {asset:{symbol:'BUSDT'},ticker:{lastPrice:110,highPrice:110,lowPrice:80,priceChangePercent:-1.25}},
    {asset:{symbol:'CUSDT'},ticker:{lastPrice:109,highPrice:110,lowPrice:80,priceChangePercent:0.4}},
    {asset:{symbol:'DUSDT'},ticker:{lastPrice:81,highPrice:110,lowPrice:80,priceChangePercent:-0.4}},
    {asset:{symbol:'EUSDT'},ticker:{lastPrice:105,highPrice:110,lowPrice:80,priceChangePercent:0.6}},
    {asset:{symbol:'FUSDT'},ticker:{lastPrice:90,highPrice:110,lowPrice:80,priceChangePercent:null}}
  ],{now:1});
  assert.equal(edge.classifications.find(x=>x.symbol==='AUSDT').sentiment,'Bullish','change >= +1.25% is bullish regardless of range position');
  assert.equal(edge.classifications.find(x=>x.symbol==='BUSDT').sentiment,'Bearish','change <= -1.25% is bearish regardless of range position');
  assert.equal(edge.classifications.find(x=>x.symbol==='CUSDT').sentiment,'Neutral');
  assert.equal(edge.classifications.find(x=>x.symbol==='DUSDT').sentiment,'Neutral');
  assert.equal(edge.classifications.find(x=>x.symbol==='EUSDT').sentiment,'Bullish','+0.60% with range position >= 0.45 is bullish');
  assert.equal(edge.totalAnalyzed,5,'a market without a usable 24h change is excluded, not guessed');
  assert.equal(edge.bullishPct,40);assert.equal(edge.bearishPct,20);assert.equal(edge.neutralPct,40);
  assert.doesNotMatch(adapterSource,/marketSentiment[^}]*Math\.random/,'sentiment is computed from live data, never randomised');
  console.log('asset scanner adapter, mirror failover, cache, and ticker-only breadth tests passed');
})().catch(e=>{console.error(e);process.exit(1)});
