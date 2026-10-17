// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { translate } from '@/lib/i18n/messages';
import type { Locale } from '@/lib/i18n/config';
import { TimetableMultiFilter } from './timetable-multi-filter';
afterEach(cleanup);
function Fixture({locale='ar'}:{locale?:Locale}) {
 const [selected,setSelected]=useState<string[]>([]);
 return <><TimetableMultiFilter label="QA Classes" options={[{id:'1',name:'QA Class 1'},{id:'2',name:'QA Class 2'},{id:'60',name:'QA Class 60'}]} selected={selected} onChange={setSelected} t={(key,params)=>translate(locale,key,params)}/><output>{selected.join(',')}</output></>;
}
describe('searchable multi-selection facet',()=>{
 it.each(['ar','fr','en','es'] as const)('supports search, select matching results and clear in %s',async(locale)=>{
  const user=userEvent.setup();render(<Fixture locale={locale}/>);
  const summary=document.querySelector('summary')!;await user.click(summary);
  await user.type(screen.getByRole('searchbox'),'60');
  expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  await user.click(screen.getByRole('button',{name:translate(locale,'timetableFilters.selectResults')}));
  expect(screen.getByRole('status').textContent).toBe('60');
  await user.clear(screen.getByRole('searchbox'));
  await user.click(screen.getByRole('checkbox',{name:'QA Class 1'}));
  expect(screen.getByRole('status').textContent).toBe('60,1');
  await user.click(screen.getByRole('button',{name:translate(locale,'timetableFilters.clear')}));
  expect(screen.getByRole('status').textContent).toBe('');
  expect(document.body.textContent).not.toContain('timetableFilters.');
 });
 it('closes on Escape and returns focus to its summary',async()=>{
  const user=userEvent.setup();render(<Fixture/>);
  const summary=document.querySelector('summary')!;await user.click(summary);
  await user.click(screen.getByRole('searchbox'));await user.keyboard('{Escape}');
  expect(summary.closest('details')?.open).toBe(false);expect(document.activeElement).toBe(summary);
 });
});

describe('incomplete API option labels',()=>{
 it('keeps unnamed options searchable and selectable without crashing',async()=>{
  const user=userEvent.setup();const changes:string[][]=[];
  render(<TimetableMultiFilter label="QA labels" options={[{id:'1'},{id:'2',name:null},{id:'3',name:false},{id:'4',name:'  '},{id:'5',name:'Known teacher'}]} selected={[]} onChange={(ids)=>changes.push(ids)} t={(key)=>key}/>);
  await user.click(document.querySelector('summary')!);
  expect(screen.getAllByRole('checkbox')).toHaveLength(5);
  for(const id of ['1','2','3','4']) expect(screen.getByRole('checkbox',{name:`#${id}`})).toBeTruthy();
  await user.type(screen.getByRole('searchbox'),'#2');
  expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  await user.click(screen.getByRole('checkbox',{name:'#2'}));
  expect(changes).toEqual([['2']]);
 });
});
