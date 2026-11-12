/* Batch scanner adapter for watched assets; fetches only completed candles. */
(function(root,factory){const api=factory(root.BPPatterns);if(typeof module!=='undefined'&&module.exports)module.exports=api;root.BPAssetScanner=api;})(typeof globalThis!=='undefined'?globalThis:this,function(P){
  'use strict';
  const BASE='https://data-api.binance.vision/api/v3/klines';
  const TICKER='https://data-api.binance.vision/api/v3/ticker/24hr';
  const HOUR=3600000, DAY=86400000;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function loadCandles(symbol,{interval='1h',limit=1000,fetchImpl=fetch,now=Date.now()}={}){
    if(!/^[A-Z0-9]{5,20}$/.test(symbol))throw new Error('Invalid market symbol');
    if(!['1h','1d','4h','5m','1m'].includes(interval))throw new Error('Unsupported chart timeframe');
    const n=Math.max(100,Math.min(1000,Number(limit)||1000));
    const step=interval==='1d'?DAY:interval==='4h'?4*HOUR:interval==='5m'?300000:interval==='1m'?60000:HOUR;
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
  async function scanAssets(assets,{interval='1h',limit=1000,concurrency=3,fetchImpl=fetch,onProgress=()=>{},now=Date.now(),v1Options={}}={}){
    if(!P||typeof P.detect!=='function')throw new Error('Pattern engine not loaded');
    const results=[];let next=0,done=0;
    const worker=async()=>{while(next<assets.length){const i=next++,asset=assets[i];try{
      const [candles,daily,quoteVolume24h]=await Promise.all([
        loadCandles(asset.symbol,{interval,limit,fetchImpl,now}),
        loadCandles(asset.symbol,{interval:'1d',limit:1000,fetchImpl,now}),
        load24hQuoteVolume(asset.symbol,{fetchImpl})
      ]);
      const analysis=P.detect(candles,interval);
      results[i]={asset,interval,candles,daily,quoteVolume24h,analysis,v1:null,error:null};
    }catch(error){results[i]={asset,interval,candles:[],daily:[],analysis:null,v1:null,error:String(error?.message||error)}}done++;onProgress({done,total:assets.length,asset:asset.symbol});await sleep(180)}};
    await Promise.all(Array.from({length:Math.max(1,Math.min(4,concurrency))},worker));
    const btc=results.find(r=>r.asset.symbol==='BTCUSDT'&&!r.error)?.candles||null;
    for(const r of results)if(!r.error)r.v1=P.detectV1({hourly:r.candles,daily:r.daily,quoteVolume24h:r.quoteVolume24h,options:v1Options,btcHourly:btc});
    return results;
  }
  function getMatches(results){return results.flatMap(r=>r.analysis?r.analysis.current.map(event=>({...event,asset:r.asset,interval:r.interval})):[]).sort((a,b)=>(b.time||0)-(a.time||0));}
  function getBacktests(results){return results.flatMap(r=>r.analysis?Object.entries(r.analysis.stats).map(([pattern,stats])=>({asset:r.asset,interval:r.interval,pattern,...stats})):[]);}
  function getV1Matches(results){return results.filter(r=>r.v1?.match).map(r=>({...r.v1.match,asset:r.asset,interval:'1h',v1:r.v1}));}
  return {loadCandles,load24hQuoteVolume,scanAssets,getMatches,getBacktests,getV1Matches};
});
