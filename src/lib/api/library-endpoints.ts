// Physical library API registry. Keep v1 route construction outside UI/domain components.
export const libraryEndpoints = {
  titles: '/admin/library/titles',
  title: (id: number | string) => `/admin/library/titles/${id}`,
  copies: '/admin/library/copies',
  copy: (id: number | string) => `/admin/library/copies/${id}`,
  circulations: '/admin/library/circulations',
  circulation: (id: number | string) => `/admin/library/circulations/${id}`,
  archiveTitle: (id: number | string) => `/admin/library/titles/${id}/archive`,
  copyAction: (id: number | string, action: string) => `/admin/library/copies/${id}/${action}`,
  checkout: (id: number | string) => `/admin/library/copies/${id}/checkout`,
  returnLoan: (id: number | string) => `/admin/library/circulations/${id}/return`,
} as const;
