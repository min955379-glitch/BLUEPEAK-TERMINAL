/* Batch scanner adapter for watched assets; fetches only completed candles. */
(function(root,factory){const api=factory(root.BPPatterns);if(typeof module!=='undefined'&&module.exports)module.exports=api;root.BPAssetScanner=api;})(typeof globalThis!=='undefined'?globalThis:this,function(P){
  'use strict';
  const BASE='https://data-api.binance.vision/api/v3/klines';
  const TICKER='https://data-api.binance.vision/api/v3/ticker/24hr';
  const HOUR=3600000, DAY=86400000;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function loadCandles(symbol,{interval='1h',limit=1000,fetchImpl=fetch,now=Date.now()}={}){
    if(!/^[A-Z0-9]{5,20}$/.test(symbol))throw new Error('Invalid market symbol');
    if(!['1h','1d','4h','15m','5m','1m'].includes(interval))throw new Error('Unsupported chart timeframe');
    const n=Math.max(100,Math.min(1000,Number(limit)||1000));
    const step=interval==='1d'?DAY:interval==='4h'?4*HOUR:interval==='15m'?900000:interval==='5m'?300000:interval==='1m'?60000:HOUR;
    const endTime=Math.floor(now/step)*step-1;
    const response=await fetchImpl(`${BASE}?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${n}&endTime=${endTime}`,{headers:{accept:'application/json'}});
    if(!response.ok)throw new Error(`Market data request failed (${response.status})`);
    const rows=await response.json();
    return rows.map(r=>({time:+r[0],open:+r[1],high:+r[2],low:+r[3],close:+r[4],vol:+r[5],quoteVol:+r[7]})).filter(c=>Number.isFinite(c.close)&&c.time+step<=now);
  }
  async function load24hQuoteVolume(symbol,{fetchImpl=fetch}={}){
    const response=await fetchImpl(`${TICKER}?symbol=${encodeURIComponent(symbol)}`,{headers:{accept:'application/json'}});
    if(!response.ok)throw new Error(`24h ticker request failed (${response.status})`);
    const data=await response.json();const value=Number(data.quoteVolume);
    if(!Number.isFinite(value))throw new Error('24h quote volume unavailable');return value;
  }
  async function loadAllTickers({fetchImpl=fetch}={}){
    const response=await fetchImpl(TICKER,{headers:{accept:'application/json'}});if(!response.ok)throw new Error(`24h market snapshot failed (${response.status})`);const rows=await response.json();
    return new Map((Array.isArray(rows)?rows:[]).filter(x=>/^[A-Z0-9]{5,20}$/.test(x.symbol||'')).map(x=>[x.symbol,{...x,lastPrice:+x.lastPrice,priceChange:+x.priceChange,priceChangePercent:+x.priceChangePercent,highPrice:+x.highPrice,lowPrice:+x.lowPrice,quoteVolume:+x.quoteVolume,volume:+x.volume}]));
  }
  function momentumScore(candles,ticker={}){
    const data=(candles||[]).filter(c=>Number.isFinite(c.close)),last=data.at(-1);if(data.length<15||!last)return{score:null,rsi:null,rangePosition:null,volumeExpansion:null,components:null};
    const rsi=P?.rsiSeries(data)?.at(-1),rangeHigh=Number(ticker.highPrice)||Math.max(...data.slice(-24).map(c=>c.high)),rangeLow=Number(ticker.lowPrice)||Math.min(...data.slice(-24).map(c=>c.low)),rangePosition=rangeHigh>rangeLow?Math.max(0,Math.min(1,(last.close-rangeLow)/(rangeHigh-rangeLow))):.5;
    const vols=data.slice(-21,-1).map(c=>Number(c.vol)||0),avg=vols.length?vols.reduce((a,b)=>a+b,0)/vols.length:0,volumeExpansion=avg?(Number(last.vol)||0)/avg:1;
    const rsiComponent=Number.isFinite(rsi)?Math.max(0,Math.min(100,rsi)):50,volumeComponent=Math.max(0,Math.min(100,volumeExpansion/2*100));
    return{score:Math.round(rsiComponent*.4+rangePosition*100*.4+volumeComponent*.2),rsi,rangePosition:rangePosition*100,volumeExpansion,components:{rsi:rsiComponent,range:rangePosition*100,volume:volumeComponent},formula:'40% RSI(14) + 40% 24h high/low position + 20% capped (2x) 20-bar volume expansion'};
  }
  function marketOverview(rows){
    const valid=(rows||[]).filter(r=>!r.error&&r.ticker),enriched=valid.map(r=>{const data=r.candles||[],last=data.at(-1),mean=data.length>=50?data.slice(-50).reduce((sum,c)=>sum+c.close,0)/50:null;return{...r,momentum:r.momentum||momentumScore(data,r.ticker),aboveSma50:mean!=null&&last.close>mean,change24h:Number(r.ticker.priceChangePercent)||0,quoteVolume24h:Number(r.ticker.quoteVolume??r.quoteVolume24h)||0}});
    const changes=enriched.map(x=>x.change24h),averageChange=changes.length?changes.reduce((a,b)=>a+b,0)/changes.length:0,aboveSma50=enriched.filter(x=>x.aboveSma50).length,positive24h=enriched.filter(x=>x.change24h>0).length;
    const by=(key,sign=1)=>enriched.filter(x=>Number.isFinite(x[key])).sort((a,b)=>sign*(a[key]-b[key]))[0]||null;
    const breadthBull=aboveSma50>=Math.ceil(enriched.length*2/3)&&positive24h>=Math.ceil(enriched.length*2/3),breadthBear=aboveSma50<=Math.floor(enriched.length/3)&&positive24h<=Math.floor(enriched.length/3);
    return{assets:enriched.length,expectedAssets:18,rows:enriched,aboveSma50,positive24h,averageChange,topGainer:by('change24h',-1),topLoser:by('change24h',1),volumeLeader:by('quoteVolume24h',-1),momentumLeader:enriched.filter(x=>Number.isFinite(x.momentum?.score)).sort((a,b)=>b.momentum.score-a.momentum.score)[0]||null,regime:breadthBull?'Bullish Expansion':breadthBear?'Bearish Pullback':'Range / Consolidation',asOf:Date.now()};
  }
  function coinDetails({asset,ticker,candlesByTimeframe={},marketCap=null}={}){
    const matrix={};for(const tf of ['15m','1h','4h','1d']){const bars=(candlesByTimeframe[tf]||[]).filter(c=>Number.isFinite(c.close)),last=bars.at(-1),rsi=P?.rsiSeries(bars)?.at(-1)??null,ma=bars.length>=50?bars.slice(-50).reduce((s,c)=>s+c.close,0)/50:null;let trend='Neutral';if(last&&ma!=null){if(last.close>ma&&rsi!=null&&rsi>50)trend='Bullish';else if(last.close<ma&&rsi!=null&&rsi<50)trend='Bearish'}const analysis=bars.length>=80?P?.detect(bars,tf):null;matrix[tf]={trend,rsi,close:last?.close??null,observedCandles:bars.length,uptrend:analysis?.uptrend?.up??false,confirmedPivots:analysis?P.confirmedPivots(bars,'high').slice(-2).concat(P.confirmedPivots(bars,'low').slice(-2)):[]}}
    const primary=candlesByTimeframe['1h']||[],first=(candlesByTimeframe['1d']||primary)[0]?.time??null,latest=primary.at(-1)?.close??(Number(ticker?.lastPrice)||null),levels=P?.referenceLevels(primary,{dailyCandles:candlesByTimeframe['1d']||[]})||null;
    return{asset,symbol:asset?.symbol,price:latest,high24h:Number(ticker?.highPrice)||null,low24h:Number(ticker?.lowPrice)||null,volume24h:Number(ticker?.quoteVolume)||null,marketCap:Number(marketCap)||null,historyAgeDays:first?Math.max(0,(Date.now()-first)/DAY):null,historyStart:first,timeframes:matrix,trendContinuation:P?.trendContinuationAnalysis(candlesByTimeframe)||null,levels,patterns:primary.length>=80?P.detect(primary,'1h').current:[],signals:primary.length>=60?P.scanStrategies({candles:primary,dailyCandles:candlesByTimeframe['1d']||[],timeframe:'1h',quoteVolume24h:Number(ticker?.quoteVolume)||0}):[]};
  }
  async function loadMarketCaps(assets,{fetchImpl=fetch}={}){const ids=(assets||[]).map(a=>a.cg).filter(Boolean);if(!ids.length)return new Map();const url=`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(ids.join(','))}`;const r=await fetchImpl(url,{headers:{accept:'application/json'}});if(!r.ok)throw new Error(`Market-cap snapshot failed (${r.status})`);const data=await r.json();return new Map((data||[]).map(x=>[x.id,Number(x.market_cap)||null]));}
  async function scanAssets(assets,{interval='1h',limit=1000,concurrency=3,fetchImpl=fetch,onProgress=()=>{},now=Date.now(),v1Options={}}={}){
    if(!P||typeof P.detect!=='function')throw new Error('Pattern engine not loaded');
    const results=[];let next=0,done=0,tickerSnapshot=new Map();try{tickerSnapshot=await loadAllTickers({fetchImpl})}catch{}
    const worker=async()=>{while(next<assets.length){const i=next++,asset=assets[i];try{
      const [candles,daily]=await Promise.all([
        loadCandles(asset.symbol,{interval,limit,fetchImpl,now}),
        loadCandles(asset.symbol,{interval:'1d',limit:1000,fetchImpl,now})
      ]);const ticker=tickerSnapshot.get(asset.symbol)||null,quoteVolume24h=Number(ticker?.quoteVolume)||await load24hQuoteVolume(asset.symbol,{fetchImpl});
      const analysis=P.detect(candles,interval);
      results[i]={asset,interval,candles,daily,ticker,quoteVolume24h,analysis,v1:null,error:null};
    }catch(error){results[i]={asset,interval,candles:[],daily:[],analysis:null,v1:null,error:String(error?.message||error)}}done++;onProgress({done,total:assets.length,asset:asset.symbol});await sleep(180)}};
    await Promise.all(Array.from({length:Math.max(1,Math.min(4,concurrency))},worker));
    const btc=results.find(r=>r.asset.symbol==='BTCUSDT'&&!r.error)?.candles||null;
    for(const r of results)if(!r.error)r.v1=P.detectV1({hourly:r.candles,daily:r.daily,quoteVolume24h:r.quoteVolume24h,options:v1Options,btcHourly:btc});
    return results;
  }
  function getMatches(results){return results.flatMap(r=>r.analysis?r.analysis.current.map(event=>({...event,asset:r.asset,interval:r.interval})):[]).sort((a,b)=>(b.time||0)-(a.time||0));}
  function getBacktests(results){return results.flatMap(r=>r.analysis?Object.entries(r.analysis.stats).map(([pattern,stats])=>({asset:r.asset,interval:r.interval,pattern,...stats})):[]);}
  function getV1Matches(results){return results.filter(r=>r.v1?.match).map(r=>({...r.v1.match,asset:r.asset,interval:'1h',v1:r.v1}));}
  return {loadCandles,load24hQuoteVolume,loadAllTickers,loadMarketCaps,momentumScore,marketOverview,coinDetails,scanAssets,getMatches,getBacktests,getV1Matches};
});
