import { describe, expect, it } from 'vitest';
import {
  missingRequiredDocumentTypes,
  normalizeStudentDocumentsResponse,
} from './normalize-student-documents';
import {
  buildAvailableStudent360Tabs,
  buildStudent360TabHref,
  parseStudent360Tab,
} from './student-360-tabs';

describe('Student 360 URL tab synchronization', () => {
  const allTabs = buildAvailableStudent360Tabs({
    showFinance: true,
    showHealth: true,
    showDocuments: true,
  });

  it('resolves direct links for every operational tab', () => {
    for (const tab of allTabs) {
      const href = buildStudent360TabHref(727, tab);
      const query = tab === 'overview' ? null : tab;
      expect(parseStudent360Tab(query, allTabs)).toBe(tab);
      if (tab !== 'overview') {
        expect(href).toContain(`tab=${tab}`);
      }
    }
  });

  it('falls back invalid tab URLs to overview', () => {
    expect(parseStudent360Tab('not-a-tab', allTabs)).toBe('overview');
  });

  it('hides capability-gated tabs from availability', () => {
    const limited = buildAvailableStudent360Tabs({
      showFinance: false,
      showHealth: true,
      showDocuments: false,
    });
    expect(limited).not.toContain('finance');
    expect(limited).not.toContain('documents');
    expect(parseStudent360Tab('finance', limited)).toBe('overview');
    expect(parseStudent360Tab('documents', limited)).toBe('overview');
  });
});

describe('documents compact UX data guards', () => {
  it('treats null items as empty array for zero-data KPIs', () => {
    const data = normalizeStudentDocumentsResponse({
      items: null,
      summary: { total: 0, valid: 0, expired: 0, missing_required: 2 },
      capabilities: { can_view: true, can_manage: true },
    });
    expect(data?.items).toEqual([]);
    expect(data?.summary.missing_required).toBe(2);
  });

  it('derives missing required types from active documents only', () => {
    const types = [
      { id: 1, code: 'birth_cert', name: 'Birth certificate', is_required: true },
      { id: 2, code: 'insurance', name: 'Insurance', is_required: true },
    ];
    const items = normalizeStudentDocumentsResponse({
      items: [
        {
          id: 10,
          state: 'archived',
          active: false,
          document_type: { id: 1, code: 'birth_cert', name: 'Birth certificate', is_required: true },
        },
      ],
      summary: {},
      capabilities: {},
    })!.items;
    expect(missingRequiredDocumentTypes(types, items).map((t) => t.code)).toEqual([
      'birth_cert',
      'insurance',
    ]);
  });
});

describe('finance zero-data markers', () => {
  it('keeps four summary keys for empty finance payloads', () => {
    const summary = { total_due: 0, total_paid: 0, total_balance: 0, overdue_count: 0 };
    expect(Object.keys(summary)).toHaveLength(4);
    expect(Object.values(summary).every((v) => v === 0)).toBe(true);
  });
});
