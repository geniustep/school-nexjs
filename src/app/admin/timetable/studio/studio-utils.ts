export type StudioPeriod={id:number;name:string;start_time:number;end_time:number;session_half?:'morning'|'afternoon';sequence:number};
export type StudioLine={line_id?:number;period_id?:number|false;weekday:string;start_time:number;end_time:number;assignment_id:number};
export type StudioCell={key:string;day:string;periodId:number;assignmentId:number|null;savedLine:boolean};
export function selectStudioPeriod(periods:StudioPeriod[],id:number,day:string,allowed:string[],dayRows?:Array<string|{key:string;day_mode?:string}>):StudioPeriod|null{
 const p=periods.find(x=>x.id===id);
 if(!p||!allowed.includes(day))return null;
 const info=dayRows?.find(d=>typeof d==='string'?d===day:d.key===day);
 const mode=info&&typeof info==='object'?info.day_mode:null;
 if(mode==='closed'||mode==='morning_only'&&p.session_half==='afternoon'||mode==='afternoon_only'&&p.session_half==='morning')return null;
 return p;
}
export function buildStudioGrid(periods:StudioPeriod[],days:string[],lines:StudioLine[],pending:Record<string,number|null>):StudioCell[]{
 return days.flatMap(day=>periods.map(period=>{
  const key=day+':'+period.id;
  const assigned=lines.find(line=>line.weekday===day&&(line.period_id===period.id||(!line.period_id&&Math.abs(line.start_time-period.start_time)<0.0001&&Math.abs(line.end_time-period.end_time)<0.0001)));
  return {key,day,periodId:period.id,assignmentId:Object.prototype.hasOwnProperty.call(pending,key)?pending[key]:(assigned?.assignment_id??null),savedLine:!!assigned};
 }));
}
