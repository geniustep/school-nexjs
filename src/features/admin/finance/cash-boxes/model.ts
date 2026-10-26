import type {CurrentUser} from '@/types/user';
import type {Permission} from '@/types/permissions';
import {hasPermission} from '@/lib/permissions/permissions';
export type Kind='boxes'|'transfers'|'handovers';
export type CashRecord={id:number;name:string;state?:string;box_type?:string;school_id:number;allowed_actions?:string[];[key:string]:unknown};
export const capabilities={
 boxes:{view:'finance.view_cash_boxes',create:'finance.manage_cash_boxes'},
 transfers:{view:'finance.view_cash_transfers',create:'finance.create_cash_transfer',approve:'finance.approve_cash_transfer',dispatch:'finance.create_cash_transfer',accept:'finance.accept_cash_transfer'},
 handovers:{view:'finance.view_cash_handover',create:'finance.initiate_cash_handover',accept:'finance.accept_cash_handover'},
} as const;
export function can(user:CurrentUser|null,permission:string){return hasPermission(user,permission as Permission);}
export function allowed(row:CashRecord|null,action:string){return !!row?.allowed_actions?.includes(action);}
export function readRecords(value:unknown):CashRecord[]{
 if(Array.isArray(value))return value as CashRecord[];
 if(value&&typeof value==='object'&&'items' in value&&Array.isArray(value.items))return value.items as CashRecord[];
 return [];
}
export function readTotal(meta:unknown,fallback:number){if(meta&&typeof meta==='object'&&'pagination' in meta){const p=meta.pagination;if(p&&typeof p==='object'&&'total' in p&&typeof p.total==='number')return p.total;}return fallback;}
export function positive(v:string){return v.trim()!==''&&Number.isFinite(Number(v))&&Number(v)>0;}
