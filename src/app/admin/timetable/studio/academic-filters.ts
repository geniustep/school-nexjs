import type {SchoolClass,Level} from '@/types/class';

export type AcademicFilterClass=Pick<SchoolClass,'id'|'name'|'level'>;
export type StudioLevel={id:number;name:string;cycleName:string};
export type StudioCatalog={cycles:string[];levels:StudioLevel[]};
export function buildStudioCatalog(classes:AcademicFilterClass[],referenceLevels:Level[]):StudioCatalog{
  const used=new Set(classes.map(c=>c.level?.id).filter((id):id is number=>typeof id==='number'));
  const byId=new Map(referenceLevels.filter(l=>used.has(l.id)).map(l=>[l.id,l]));
  const levels=new Map<number,StudioLevel>();
  for(const c of classes){
    const l=c.level;if(!l?.id)continue;
    const ref=byId.get(l.id);
    // Prefer the level's canonical cycle; class references may be abbreviated.
    const cycleName=ref?.cycle?.name||l.cycle?.name||'سلك غير محدد';
    levels.set(l.id,{id:l.id,name:ref?.name||l.name||'مستوى غير محدد',cycleName});
  }
  const values=[...levels.values()].sort((a,b)=>a.cycleName.localeCompare(b.cycleName,'ar')||a.name.localeCompare(b.name,'ar'));
  return {cycles:[...new Set(values.map(l=>l.cycleName))],levels:values};
}
export function studioLevelsForCycle(catalog:StudioCatalog,cycle:string):StudioLevel[]{
  return cycle?catalog.levels.filter(level=>level.cycleName===cycle):[];
}
export function studioClassesForLevel(classes:AcademicFilterClass[],levelId:number):AcademicFilterClass[]{
  return levelId>0?classes.filter(c=>c.level?.id===levelId).sort((a,b)=>a.name.localeCompare(b.name,'ar')):[];
}
export function studioClassSelection(classes:AcademicFilterClass[],cycle:string,levelId:number,classId:number,catalog:StudioCatalog):number{
  if(!cycle||!catalog.levels.some(l=>l.id===levelId&&l.cycleName===cycle))return 0;
  return studioClassesForLevel(classes,levelId).some(c=>c.id===classId)?classId:0;
}
