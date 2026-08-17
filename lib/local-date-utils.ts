export type DateRange={start:Date;end:Date}
export const localDateKey=(value:Date|string)=>{const d=typeof value==='string'?new Date(value):value;return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export function startOfLocalWeek(value=new Date()){const d=new Date(value);d.setHours(0,0,0,0);const day=d.getDay()||7;d.setDate(d.getDate()-day+1);return d}
export function endOfLocalWeek(value=new Date()){const d=startOfLocalWeek(value);d.setDate(d.getDate()+6);d.setHours(23,59,59,999);return d}
export function weekRange(offset=0):DateRange{const start=startOfLocalWeek();start.setDate(start.getDate()+offset*7);const end=new Date(start);end.setDate(end.getDate()+6);end.setHours(23,59,59,999);return{start,end}}
export const inRange=(iso:string,range:DateRange)=>{const time=new Date(iso).getTime();return time>=range.start.getTime()&&time<=range.end.getTime()}
export function enumerateLocalDates(range:DateRange){const dates:string[]=[];for(const d=new Date(range.start);d<=range.end;d.setDate(d.getDate()+1))dates.push(localDateKey(d));return dates}
