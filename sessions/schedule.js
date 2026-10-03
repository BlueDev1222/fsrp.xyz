export const scheduleZone='America/New_York';
const eastern=new Intl.DateTimeFormat('en-US',{timeZone:scheduleZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function parts(date){return Object.fromEntries(eastern.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]))}
// Resolve 11:30 Eastern on a calendar date, using that date's actual UTC offset.
export function sessionOn(year,month,day){
 const wall=Date.UTC(year,month-1,day,11,30);let instant=wall;
 for(let i=0;i<3;i++){const p=parts(new Date(instant));const observed=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);instant+=wall-observed}
 return new Date(instant);
}
export function nextSession(now=new Date()){
 const p=parts(now);let date=sessionOn(p.year,p.month,p.day);
 if(date<now){const tomorrow=new Date(Date.UTC(p.year,p.month-1,p.day+1));date=sessionOn(tomorrow.getUTCFullYear(),tomorrow.getUTCMonth()+1,tomorrow.getUTCDate())}
 return date;
}
