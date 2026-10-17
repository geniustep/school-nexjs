// @vitest-environment happy-dom

/**
 * Timetable Academic Context screen/flow tests.
 * Requirement create UX is covered by Slot create form (no separate Requirement screen).
 */

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { baseOptions } from '@/features/academic-context/test-helpers';
import type { AcademicContextOptionsResponse } from '@/types/academic-context';
import type { TimetableSlot } from '@/types/timetable';

const fetchAdmin = vi.fn();
const fetchTeacher = vi.fn();
const apiPost = vi.fn();
const useAdminResource = vi.fn();

vi.mock('@/features/academic-context/api/academic-context-api', () => ({
  fetchAdminAcademicContextOptions: (...args: unknown[]) => fetchAdmin(...args),
  fetchTeacherAcademicContextOptions: (...args: unknown[]) => fetchTeacher(...args),
}));

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn(),
    post: (...args: unknown[]) => apiPost(...args),
  },
}));

vi.mock('@/lib/hooks/use-admin-resource', () => ({
  useAdminResource: (...args: unknown[]) => useAdminResource(...args),
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => ({
    role: 'admin',
    permissions: ['manage_timetable', 'view_classes', 'view_teachers'],
    effective_capabilities: ['academic.context.view'],
  }),
}));

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({
    activeAcademicYearId: 1,
    academicYearError: null,
  }),
}));

vi.mock('@/lib/permissions/permissions', () => ({
  hasPermission: () => true,
}));

vi.mock('@/lib/permissions/academic-context', () => ({
  canViewAcademicContext: () => true,
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string, vars?: Record<string, string | number>) => {
    if (vars?.language) return `${key}:${vars.language}`;
    if (vars?.count != null) return `${key}:${vars.count}`;
    return key;
  },
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('@/features/admin/confirm-action-button', () => ({
  ConfirmActionButton: () => <button type="button">archive</button>,
}));

vi.mock('@/features/admin/timetable/admin-timetable.css', () => ({}));

import { AdminTimetablePanel } from '@/features/admin/admin-timetable-panel';

async function chooseFacet(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
  const summary = screen.getByText(label, {selector:'summary'});
  const facet = summary.closest('details')!;
  if (!facet.open) await user.click(summary);
  await user.click(within(facet).getByRole('checkbox', {name:option}));
}

function ok(data: AcademicContextOptionsResponse) {
  return { success: true as const, data, meta: {} };
}

function slot(overrides: Partial<TimetableSlot> & { teaching_offering_id?: number | null } = {}): TimetableSlot & {
  teaching_offering_id?: number | null;
} {
  return {
    id: 1,
    day: 'monday',
    start_time: '08:30',
    end_time: '10:00',
    room: 'A1',
    class: { id: 40, name: '6A' },
    subject: { id: 11, name: 'الرياضيات' },
    teacher: { id: 3, name: 'Ada' },
    teaching_offering_id: 100,
    ...overrides,
  };
}

function nullResource() {
  return {
    data: null,
    loading: false,
    error: null,
    reload: vi.fn(),
    meta: null,
  };
}

function mockResources(slots: TimetableSlot[] = [slot()], classRows: unknown[] = [{ id: 40, name: '6A' }], teacherRows: unknown[] = [{ id: 3, name: 'Ada' }]) {
  useAdminResource.mockImplementation((path: string | null) => {
    if (!path) return nullResource();
    if (path.endsWith('/timetable/setup')) return {...nullResource(), data:{timezone:'Africa/Casablanca'}};
    if (path.includes('timetable') && !path.includes('slots')) {
      return {
        data: slots,
        loading: false,
        error: null,
        reload: vi.fn(),
        meta: null,
      };
    }
    if (path.includes('classes')) {
      return {
        data: classRows,
        loading: false,
        error: null,
        reload: vi.fn(),
        meta: null,
      };
    }
    return {
      data: teacherRows,
      loading: false,
      error: null,
      reload: vi.fn(),
      meta: null,
    };
  });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  fetchAdmin.mockReset();
  fetchTeacher.mockReset();
  apiPost.mockReset();
  useAdminResource.mockReset();
});

beforeEach(() => {
  mockResources();
  fetchAdmin.mockResolvedValue(ok(baseOptions()));
  fetchTeacher.mockResolvedValue(ok(baseOptions()));
  apiPost.mockResolvedValue({ success: true, data: {}, meta: {} });
});

describe('Timetable Slot create (Requirement-equivalent Academic Context UX)', () => {
  it('loads effective subjects from Academic Context with scope=timetable and class_id', async () => {
    const user = userEvent.setup();
    render(<AdminTimetablePanel />);

    await user.click(screen.getByRole('button', { name: 'admin.addSlot' }));

    const classSelect = await screen.findByLabelText(/admin\.selectClass/);
    await user.selectOptions(classSelect, '40');

    await waitFor(() => {
      expect(fetchAdmin).toHaveBeenCalled();
    });

    const lastQuery = fetchAdmin.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastQuery.scope).toBe('timetable');
    expect(String(lastQuery.class_id)).toBe('40');
    expect(fetchTeacher).not.toHaveBeenCalled();

    const subjectSelect = screen.getByLabelText(/admin\.selectSubject/) as HTMLSelectElement;
    const options = within(subjectSelect)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(options.some((t) => t?.includes('الرياضيات'))).toBe(true);
    expect(options.some((t) => /all subjects|جميع المواد/i.test(t ?? ''))).toBe(false);
    expect(document.body.textContent).not.toMatch(/res\.lang/i);
  });

  it('keeps multiple offerings distinct without auto-select and sends teaching_offering_id', async () => {
    const user = userEvent.setup();
    render(<AdminTimetablePanel />);
    await user.click(screen.getByText('admin.addSlot'));

    await user.selectOptions(await screen.findByLabelText(/admin\.selectClass/), '40');
    await waitFor(() => expect(fetchAdmin).toHaveBeenCalled());

    await user.selectOptions(screen.getByLabelText(/admin\.selectSubject/), '11');
    await waitFor(() => {
      const q = fetchAdmin.mock.calls.at(-1)?.[0] as Record<string, unknown>;
      expect(String(q.subject_id ?? '')).toBe('11');
    });

    const offering = screen.getByLabelText(/academicContext\.fields\.offering/) as HTMLSelectElement;
    expect(offering.value).toBe('');
    const offeringLabels = within(offering)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(offeringLabels.filter((t) => t && !t.includes('placeholders')).length).toBeGreaterThanOrEqual(2);

    await user.selectOptions(offering, '100');
    expect(screen.getByText(/academicContext\.language\.derivedFromOffering:العربية/)).toBeTruthy();
    expect(screen.getByText(/academicContext\.fields\.reference/)).toBeTruthy();
    expect(screen.getByText(/المنير في الرياضيات/)).toBeTruthy();

    await user.selectOptions(screen.getByLabelText(/admin\.selectTeacher/), '3');
    await user.click(screen.getByRole('button', { name: 'common.save' }));

    await waitFor(() => expect(apiPost).toHaveBeenCalled());
    const [, payload] = apiPost.mock.calls.find((c) => String(c[0]).includes('/slots') && !String(c[0]).includes('update')) ?? [];
    expect(payload).toMatchObject({
      class_id: 40,
      subject_id: 11,
      teaching_offering_id: 100,
      teacher_id: 3,
    });
  });

  it('clears subject and offering when class changes', async () => {
    const user = userEvent.setup();
    useAdminResource.mockImplementation((path: string | null) => {
      if (!path) return nullResource();
    if (path.endsWith('/timetable/setup')) return {...nullResource(), data:{timezone:'Africa/Casablanca'}};
      if (path.includes('timetable') && !path.includes('slots')) {
        return { data: [], loading: false, error: null, reload: vi.fn(), meta: null };
      }
      if (path.includes('classes')) {
        return {
          data: [
            { id: 40, name: '6A' },
            { id: 41, name: '6B' },
          ],
          loading: false,
          error: null,
          reload: vi.fn(),
          meta: null,
        };
      }
      return { data: [{ id: 3, name: 'Ada' }], loading: false, error: null, reload: vi.fn(), meta: null };
    });

    render(<AdminTimetablePanel />);
    await user.click(screen.getByText('admin.addSlot'));
    await user.selectOptions(await screen.findByLabelText(/admin\.selectClass/), '40');
    await waitFor(() => expect(fetchAdmin).toHaveBeenCalled());
    await user.selectOptions(screen.getByLabelText(/admin\.selectSubject/), '11');
    await user.selectOptions(screen.getByLabelText(/academicContext\.fields\.offering/), '100');

    await user.selectOptions(screen.getByLabelText(/admin\.selectClass/), '41');
    expect((screen.getByLabelText(/admin\.selectSubject/) as HTMLSelectElement).value).toBe('');
    expect((screen.getByLabelText(/academicContext\.fields\.offering/) as HTMLSelectElement).value).toBe('');
  });
});

describe('Timetable Slot edit', () => {
  it('shows legacy null offering as readable and updates payload without hidden stale offering', async () => {
    const user = userEvent.setup();
    mockResources([slot({ teaching_offering_id: null })]);
    render(<AdminTimetablePanel />);

    await user.click(screen.getByText('common.edit'));
    expect(await screen.findByText('academicContext.hints.legacyMissingOffering')).toBeTruthy();

    await user.selectOptions(screen.getByLabelText(/admin\.selectSubject/), '11');
    await waitFor(() => expect(fetchAdmin).toHaveBeenCalled());
    // leave offering empty — legacy
    await user.click(screen.getByRole('button', { name: 'common.save' }));

    await waitFor(() => expect(apiPost).toHaveBeenCalled());
    const updateCall = apiPost.mock.calls.find((c) => String(c[0]).includes('/update'));
    expect(updateCall?.[1]).toMatchObject({
      subject_id: 11,
    });
    expect(updateCall?.[1].teaching_offering_id).toBeUndefined();
  });

  it('does not expose Delivery or Jathatha actions from Academic Context integration', () => {
    render(<AdminTimetablePanel />);
    expect(document.body.textContent).not.toMatch(/jathatha|actual.?delivery|delivery\.create/i);
    expect(screen.queryByText(/teacher\.delivery/)).toBeNull();
  });
});

describe('Timetable list filters', () => {
  it('filters by class/teacher/day without All Subjects and without admin subjects endpoint', async () => {
    const user = userEvent.setup();
    mockResources([
      slot({ id: 1, class: { id: 40, name: '6A' }, teacher: { id: 3, name: 'Ada' }, day: 'monday' }),
      slot({
        id: 2,
        class: { id: 41, name: '6B' },
        teacher: { id: 4, name: 'Bea' },
        day: 'tuesday',
        subject: { id: 12, name: 'Science' },
      }),
    ]);
    useAdminResource.mockImplementation((path: string | null) => {
      if (!path) return nullResource();
    if (path.endsWith('/timetable/setup')) return {...nullResource(), data:{timezone:'Africa/Casablanca'}};
      if (path.includes('timetable') && !path.includes('slots')) {
        return {
          data: [
            slot({ id: 1, class: { id: 40, name: '6A' }, teacher: { id: 3, name: 'Ada' }, day: 'monday' }),
            slot({
              id: 2,
              class: { id: 41, name: '6B' },
              teacher: { id: 4, name: 'Bea' },
              day: 'tuesday',
              subject: { id: 12, name: 'Science' },
            }),
          ],
          loading: false,
          error: null,
          reload: vi.fn(),
          meta: null,
        };
      }
      if (path.includes('classes')) {
        return {
          data: [
            { id: 40, name: '6A' },
            { id: 41, name: '6B' },
          ],
          loading: false,
          error: null,
          reload: vi.fn(),
          meta: null,
        };
      }
      return {
        data: [
          { id: 3, name: 'Ada' },
          { id: 4, name: 'Bea' },
        ],
        loading: false,
        error: null,
        reload: vi.fn(),
        meta: null,
      };
    });

    render(<AdminTimetablePanel />);
    expect(screen.getByText('nav.classes', {selector:'summary'})).toBeTruthy();
    expect(screen.getByText('nav.teachers', {selector:'summary'})).toBeTruthy();
    expect(screen.getByText('admin.timetableList.day', {selector:'summary'})).toBeTruthy();
    expect(screen.queryByLabelText('admin.selectSubject')).toBeNull();
    expect(document.body.textContent).not.toMatch(/All Subjects|جميع المواد/i);

    await chooseFacet(user, 'nav.classes', '6A');
    expect(screen.getByText('الرياضيات')).toBeTruthy();
    expect(screen.queryByText('Science')).toBeNull();

    await user.click(screen.getByText('admin.timetableList.resetFilters'));
    expect(screen.getByText('Science')).toBeTruthy();
  });

  it('shows no-match empty state when filters exclude all slots', async () => {
    const user = userEvent.setup();
    useAdminResource.mockImplementation((path: string | null) => {
      if (!path) return nullResource();
    if (path.endsWith('/timetable/setup')) return {...nullResource(), data:{timezone:'Africa/Casablanca'}};
      if (path.includes('timetable') && !path.includes('slots')) {
        return { data: [slot()], loading: false, error: null, reload: vi.fn(), meta: null };
      }
      if (path.includes('classes')) {
        return {
          data: [
            { id: 40, name: '6A' },
            { id: 99, name: 'EmptyClass' },
          ],
          loading: false,
          error: null,
          reload: vi.fn(),
          meta: null,
        };
      }
      return { data: [{ id: 3, name: 'Ada' }], loading: false, error: null, reload: vi.fn(), meta: null };
    });

    render(<AdminTimetablePanel />);
    await chooseFacet(user, 'nav.classes', 'EmptyClass');
    expect(screen.getByText('admin.timetableList.noMatch.title')).toBeTruthy();
  });
});

describe('Weekly Slot ≠ Session Occurrence', () => {
  it('keeps Weekly Slot form semantics without occurrence delivery actions', () => {
    render(<AdminTimetablePanel />);
    expect(screen.getAllByText(/admin\.timetableList\.slotsCount/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'admin.addSlot' })).toBeTruthy();
    expect(document.body.innerHTML).not.toMatch(/session-occurrence|create_delivery/i);
  });
});
 describe('weekly workspace controls', () => {
  it('switches to the weekly view, filters sessions, and retains list actions', async () => {
    mockResources([slot(), slot({id:2, day:'tuesday', subject:{id:12,name:'Science'}})]);
    const user = userEvent.setup();
    render(<AdminTimetablePanel initialView="week" aside={<aside>Draft rail</aside>} />);
    expect(screen.getByText('Draft rail')).toBeTruthy();
    expect(screen.getByText('Science')).toBeTruthy();
    await chooseFacet(user, 'admin.timetableList.day', 'days.monday');
    expect(screen.queryByText('Science')).toBeNull();
    await user.click(screen.getByRole('button', {name:'timetableWorkspace.list'}));
    expect(screen.getByRole('button', {name:'common.edit'})).toBeTruthy();
    await user.click(screen.getByText('admin.timetableList.resetFilters'));
    expect(screen.getByText('Science')).toBeTruthy();
  });
 });

describe('school-scale timetable filters',()=>{
 it('shows today in the school timezone and preserves class selection when opening the week',async()=>{
  vi.useFakeTimers({toFake:['Date']}); vi.setSystemTime(new Date('2026-10-19T10:30:00Z'));
  mockResources([slot(),slot({id:2,day:'tuesday',subject:{id:12,name:'Science'}})]);
  const user=userEvent.setup();render(<AdminTimetablePanel initialView="day"/>);
  expect(screen.getByText(/2026-10-19/)).toBeTruthy();
  expect(screen.getByText('الرياضيات')).toBeTruthy();expect(screen.queryByText('Science')).toBeNull();
  await chooseFacet(user,'nav.classes','6A');
  await user.click(screen.getByRole('button',{name:'timetableWorkspace.week'}));
  expect(screen.getByText('Science')).toBeTruthy();
  const facet=screen.getByText('nav.classes',{selector:'summary'}).closest('details')!;
  expect((within(facet).getByRole('checkbox',{name:'6A'}) as HTMLInputElement).checked).toBe(true);
 });
 it('shows an explicit empty today and never silently changes the date',async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-19T10:30:00Z'));
  mockResources([slot({day:'tuesday'})]);render(<AdminTimetablePanel initialView="day"/>);
  expect(screen.getByText('admin.timetableList.noMatch.title')).toBeTruthy();
  expect(screen.queryByText('الرياضيات')).toBeNull();
  await userEvent.setup().click(screen.getByRole('button',{name:'timetableFilters.showWeek'}));
  expect(screen.getByText('الرياضيات')).toBeTruthy();
 });
 it('does not show all weekdays as today when the timezone is unavailable',async()=>{
  mockResources();const resource=useAdminResource.getMockImplementation()!;
  useAdminResource.mockImplementation((path,...rest)=>path?.endsWith('/timetable/setup')?{...nullResource(),error:{code:'forbidden',message:'Denied'}}:resource(path,...rest));
  render(<AdminTimetablePanel initialView="day"/>);
  expect(screen.getByText('timetableFilters.timezoneUnavailable')).toBeTruthy();
  expect(screen.queryByText('الرياضيات')).toBeNull();
  await userEvent.setup().click(screen.getByRole('button',{name:'timetableFilters.showWeek'}));
  expect(screen.getByText('الرياضيات')).toBeTruthy();
 });
 it('searches and selects classes beyond 50, combines teacher filters and removes a chip',async()=>{
  const many=Array.from({length:65},(_,i)=>({id:i+1,name:`QA Class ${i+1}`}));
  mockResources(many.map((c)=>slot({id:c.id,class:c,subject:{id:c.id,name:`Subject ${c.id}`},teacher:{id:c.id===65?4:3,name:c.id===65?'Bea':'Ada'}})),many,[{id:3,name:'Ada'},{id:4,name:'Bea'}]);
  const user=userEvent.setup();render(<AdminTimetablePanel initialView="week"/>);
  expect(document.querySelectorAll('.timetable-group')).toHaveLength(65);
  expect(screen.getAllByRole('table')).toHaveLength(1);
  const facet=screen.getByText('nav.classes',{selector:'summary'}).closest('details')!;
  await user.click(facet.querySelector('summary')!);
  await user.type(within(facet).getByRole('searchbox'),'QA Class 6');
  await user.click(within(facet).getByRole('checkbox',{name:'QA Class 60'}));
  await user.click(within(facet).getByRole('checkbox',{name:'QA Class 65'}));
  expect(screen.getByText('Subject 60')).toBeTruthy();expect(screen.getByText('Subject 65')).toBeTruthy();
  await chooseFacet(user,'nav.teachers','Bea');
  expect(screen.queryByText('Subject 60')).toBeNull();expect(screen.getByText('Subject 65')).toBeTruthy();
  const chips=document.querySelector('.timetable-filters__chips')!;
  const teacherChip=Array.from(chips.querySelectorAll('button')).find((b)=>b.textContent?.includes('Bea'))!;
  await user.click(teacherChip);
  expect(screen.getByText('Subject 60')).toBeTruthy();
  const calls=useAdminResource.mock.calls.filter(([path])=>path?.includes('/classes') || path?.includes('/teachers'));
  expect(calls.every((call)=>call[2]?.allPages===true && call[2]?.keepPreviousData===false)).toBe(true);
 });
 it('cascades academic facets and clears incompatible child selections',async()=>{
  const classes=[{id:40,name:'6A',level:{id:10,name:'Level 1',cycle:{id:100,name:'Primary'}}},{id:41,name:'6B',level:{id:20,name:'Level 2',cycle:{id:200,name:'Secondary'}}}];
  mockResources([slot(),slot({id:2,class:{id:41,name:'6B'},subject:{id:12,name:'Science'}})],classes);
  const user=userEvent.setup();render(<AdminTimetablePanel/>);
  await chooseFacet(user,'timetableFilters.level','Level 1');
  await chooseFacet(user,'nav.classes','6A');
  await chooseFacet(user,'timetableFilters.cycle','Secondary');
  expect(screen.getByText('Science')).toBeTruthy();expect(screen.queryByText('الرياضيات')).toBeNull();
  const chips=document.querySelector('.timetable-filters__chips')!;
  expect(chips.textContent).not.toContain('Level 1');expect(chips.textContent).not.toContain('6A');
 });
 it('blocks academic-filtered results on metadata failure and exposes retry',async()=>{
  mockResources([slot()],[{id:40,name:'6A',level:{id:10,name:'Level 1',cycle:{id:100,name:'Primary'}}}]);
  const user=userEvent.setup();const {rerender}=render(<AdminTimetablePanel/>);
  await chooseFacet(user,'timetableFilters.cycle','Primary');
  const resource=useAdminResource.getMockImplementation()!;
  useAdminResource.mockImplementation((path,...rest)=>path?.includes('/classes')?{...nullResource(),error:{code:'network_error',message:'Failed'}}:resource(path,...rest));
  rerender(<AdminTimetablePanel/>);
  expect(screen.queryByText('الرياضيات')).toBeNull();expect(screen.getByRole('button',{name:'common.retry'})).toBeTruthy();
 });
});

describe('timetable incomplete resource labels regression',()=>{
 it('renders and filters when class, cycle, level and teacher names are absent',async()=>{
  mockResources([slot({class:{id:40,name:''},teacher:{id:3,name:''}})], [{id:40,level:{id:10,cycle:{id:100}}}], [{id:3}]);
  const user=userEvent.setup();render(<AdminTimetablePanel/>);
  expect(screen.getByText('الرياضيات')).toBeTruthy();
  await chooseFacet(user,'timetableFilters.cycle','#100');
  await chooseFacet(user,'timetableFilters.level','#10');
  await chooseFacet(user,'nav.classes','#40');
  await chooseFacet(user,'nav.teachers','#3');
  expect(screen.getByText('الرياضيات')).toBeTruthy();
  expect(screen.getAllByRole('table')).toHaveLength(1);
 });
});
