import{nextSession}from'./schedule.js';
function updateSchedule(){
 try{
  const date=nextSession(),locale=navigator.language||'en-US';
  const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  const time=document.getElementById('ssu-time');time.dateTime=date.toISOString();
  time.textContent=new Intl.DateTimeFormat(locale,{hour:'numeric',minute:'2-digit',timeZone:zone}).format(date);
  document.getElementById('ssu-date').textContent=new Intl.DateTimeFormat(locale,{weekday:'long',month:'long',day:'numeric',timeZone:zone}).format(date);
  const zoneName=new Intl.DateTimeFormat(locale,{timeZone:zone,timeZoneName:'short'}).formatToParts(date).find(p=>p.type==='timeZoneName')?.value||zone;
  document.getElementById('viewer-zone').textContent=`Your time · ${zoneName} · ${zone.replaceAll('_',' ')}`;
  document.getElementById('local-time-note').textContent='Converted to your device’s time zone, with daylight saving applied automatically.';
 }catch{document.getElementById('local-time-note').textContent='Local conversion is unavailable. Use the Eastern Time schedule above.'}
}
updateSchedule();setInterval(updateSchedule,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateSchedule()});
document.getElementById('copy-server-code').addEventListener('click',async()=>{const status=document.getElementById('session-copy-status');try{await navigator.clipboard.writeText('FloridaOne');status.textContent='Server code copied!'}catch{status.textContent='Select and copy the server code: FloridaOne.';const range=document.createRange();range.selectNodeContents(document.getElementById('session-server-code'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range)}});
