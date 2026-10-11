export type ScheduleInterval={name:string;start_time:string|number;end_time:string|number;session_half?:'morning'|'afternoon';sequence:number;id?:number|null};
export const DEFAULT_DAY_MODES=['full','full','full','full','morning_only','closed','closed'] as const;
export function toMinutes(value:string|number):number{
  if(typeof value==='number')return Number.isFinite(value)?Math.round(value*60):NaN;
  const match=/^(\d{1,2}):(\d{2})$/.exec(value);
  return match&&Number(match[1])<24&&Number(match[2])<60?Number(match[1])*60+Number(match[2]):NaN;
}
export const formatMinutes=(n:number)=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
export function inferredBreaks(periods:ScheduleInterval[],existing:ScheduleInterval[]):ScheduleInterval[]{
  const ordered=periods.filter(p=>Number.isFinite(toMinutes(p.start_time))&&Number.isFinite(toMinutes(p.end_time))).sort((a,b)=>toMinutes(a.start_time)-toMinutes(b.start_time));
  const generated:ScheduleInterval[]=[];
  for(let i=1;i<ordered.length;i++){
    const prev=ordered[i-1],next=ordered[i],start=toMinutes(prev.end_time),end=toMinutes(next.start_time);
    if(end<=start||existing.some(b=>Number.isFinite(toMinutes(b.start_time))&&Number.isFinite(toMinutes(b.end_time))&&toMinutes(b.start_time)<end&&toMinutes(b.end_time)>start))continue;
    const lunch=prev.session_half!==next.session_half||end-start>=60;
    generated.push({name:lunch?'استراحة الغداء':'استراحة '+(generated.filter(b=>b.name.startsWith('استراحة ')).length+1),start_time:formatMinutes(start),end_time:formatMinutes(end),sequence:(existing.length+generated.length+1)*10});
  }
  return generated;
}
