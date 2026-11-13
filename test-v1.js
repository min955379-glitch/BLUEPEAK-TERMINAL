const assert = require('node:assert/strict');
const P = require('./pattern-scanner.js');
const H=3600000,D=86400000;
function makeHourly(){
 const out=[];
 for(let i=0;i<1000;i++){
   let c=100+i*.05+1.1*Math.sin(i*.08);
   if(i>=970){const peak=100+969*.05+1.1*Math.sin(969*.08);if(i<=975)c=peak+(i-969)*.7;else c=peak+6*.7-(i-975)*.21;}
   if(i===996)c=148.25;if(i===997)c=148.45;if(i===998)c=148.65;if(i===999)c=149.1;
   const o=c-.12,high=Math.max(o,c)+(i===975?.5:.18),low=Math.min(o,c)-.18;
   let vol=200;if(i===996)vol=170;if(i===997)vol=150;if(i===998)vol=100;if(i===999)vol=220;
   out.push({time:239*D+i*H,open:o,high,low,close:c,vol,quoteVol:900000});
 }
 return out;
}
const d=Array.from({length:280},(_,i)=>{const c=100+i*.15+5*Math.sin(i*.1);return{time:i*D,open:c-.15,high:c+.55,low:c-.55,close:c,vol:50000,quoteVol:12000000}});
const h=makeHourly(),result=P.detectV1({hourly:h,daily:d,quoteVolume24h:12000000});
assert.equal(result.options.minListingAgeDays,30);
assert.equal(result.options.minQuoteVolume,5000000);
assert.equal(result.stats.horizon,24);
assert.match(P.RULES.v1,/Every step is required/);
assert.ok(result.match,'fixture should pass all four pipeline steps');
const v1Scanner=P.scanStrategies({candles:h,dailyCandles:d,timeframe:'1h',quoteVolume24h:12000000,only:'v1'});assert.ok(v1Scanner.length,'independent V1 strategy scanner returns the owner-rule setup');assert.equal(v1Scanner[0].strategy,'v1');
assert.ok(result.match.reference.stop<result.match.entry,'confirmed pullback swing should produce a buffered stop reference');
assert.ok(result.match.reference.rr2>result.match.entry&&result.match.reference.rr3>result.match.reference.rr2);
assert.equal(result.stats.sample,0,'latest signal is excluded without 24 future candles');
assert.equal(P.detectV1({hourly:h,daily:d,quoteVolume24h:1000}).match,null,'current quote-volume filter must exclude low-liquidity assets');
const over=d.map(c=>({...c}));for(let i=260;i<over.length;i++){const close=over[i-1].close+.8;over[i]={...over[i],open:close-.15,high:close+.55,low:close-.55,close}}
const overResult=P.detectV1({hourly:h,daily:over,quoteVolume24h:12000000});
assert.ok(overResult.overextended,'daily RSI >85 should be surfaced separately, not silently discarded');
assert.equal(overResult.match,null,'overextended daily trend must not qualify');
console.log('V1 rule, liquidity, overextension, levels, and horizon tests passed');
