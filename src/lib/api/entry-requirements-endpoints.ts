// School entry requirements API registry. Paths are relative to /api/v1 via the BFF.
export const entryRequirementEndpoints = {
  admin: {
    lists: '/admin/entry-requirement-lists',
    list: (id: number | string) => `/admin/entry-requirement-lists/${id}`,
    submitForReview: (id: number | string) => `/admin/entry-requirement-lists/${id}/submit-for-review`,
    publish: (id: number | string) => `/admin/entry-requirement-lists/${id}/publish`,
    createRevision: (id: number | string) => `/admin/entry-requirement-lists/${id}/create-revision`,
    archive: (id: number | string) => `/admin/entry-requirement-lists/${id}/archive`,
    copyPreviousYear: (id: number | string) => `/admin/entry-requirement-lists/${id}/copy-from-previous-year`,
    teachingOfferings: '/admin/entry-requirement-lists/teaching-offerings',
    items: (listId: number | string) => `/admin/entry-requirement-lists/${listId}/items`,
    item: (listId: number | string, itemId: number | string) => `/admin/entry-requirement-lists/${listId}/items/${itemId}`,
    adoptTextbookAndLink: (listId: number | string, itemId: number | string) =>
      `/admin/entry-requirement-lists/${listId}/items/${itemId}/adopt-textbook-and-link`,
    reorderItems: (listId: number | string) => `/admin/entry-requirement-lists/${listId}/items/reorder`,
    importTemplate: '/admin/entry-requirement-lists/import/template',
    importPreview: '/admin/entry-requirement-lists/import/preview',
    importApply: '/admin/entry-requirement-lists/import/apply',
    attachments: (listId: number | string) => `/admin/entry-requirement-lists/${listId}/attachments`,
    publicShareLink: (listId: number | string) => `/admin/entry-requirement-lists/${listId}/public-share-link`,
    rotatePublicShareLink: (listId: number | string) => `/admin/entry-requirement-lists/${listId}/public-share-link/rotate`,
    revokePublicShareLink: (listId: number | string) => `/admin/entry-requirement-lists/${listId}/public-share-link/revoke`,
  },
  teacher: {
    mine: '/teacher/entry-requirements',
  },
  parent: {
    family: '/parent/entry-requirements',
    child: (studentId: number | string) => `/parent/children/${studentId}/entry-requirements`,
    progress: (studentId: number | string) => `/parent/children/${studentId}/entry-requirements/progress`,
  },
} as const;
