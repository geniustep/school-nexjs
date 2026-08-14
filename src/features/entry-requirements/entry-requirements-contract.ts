export type RequirementItemType = 'textbook' | 'book' | 'notebook' | 'stationery' | 'uniform' | 'material' | 'other';
export type RequirementProgress = 'pending' | 'already_have' | 'purchased';

export type RequirementItem = {
  id: number;
  stable_key: string;
  sequence: number;
  item_type: RequirementItemType;
  name: string;
  title?: string | null;
  quantity: number;
  subject_id: number | null;
  subject: string | null;
  importance: 'required' | 'optional';
  provision_source: 'family' | 'school';
  provided_by_school: boolean;
  reusable_allowed: 'yes' | 'no' | null;
  reusable: boolean;
  notes: string | null;
  needs_resolution: boolean;
  publisher?: string | null;
  edition?: string | null;
  isbn?: string | null;
  teaching_offering_id?: number | null;
  teaching_reference_id?: number | null;
};

export type RequirementDiff = {
  added: RequirementItem[];
  changed: Array<{ stable_key: string; before: RequirementItem; after: RequirementItem }>;
  removed: RequirementItem[];
  unchanged: RequirementItem[];
};

export type RequirementList = {
  id: number;
  school_id: number;
  academic_year_id: number;
  academic_year: string | null;
  level_id: number;
  level: string | null;
  track_id: number | null;
  track: string | null;
  class_id: number | null;
  class_name: string | null;
  name: string;
  revision: number;
  state: 'draft' | 'under_review' | 'published' | 'archived';
  is_current: boolean;
  supersedes_id: number | null;
  published_at: string | null;
  active: boolean;
  notes: string | null;
  item_count: number;
  items?: RequirementItem[];
  changes?: RequirementDiff;
};

export type TeachingOfferingChoice = {
  id: number;
  academic_year_id: number;
  academic_year: string | null;
  level_id: number;
  level: string | null;
  subject_id: number;
  subject: string | null;
  teaching_language_id: number;
  language: string | null;
  track_id: number | null;
  track: string | null;
  state: string;
  reference: {
    id: number | null;
    title: string | null;
    publisher: string | null;
    edition: string | null;
    isbn: string | null;
    status: string | null;
  };
};

export type TeacherRequirementAssignment = {
  assignment_id: number;
  academic_year_id: number;
  academic_year: string | null;
  class_id: number;
  class_name: string | null;
  level_id: number;
  level: string | null;
  subject_id: number;
  subject: string | null;
  teaching_offering_id: number | null;
  teaching_reference: TeachingOfferingChoice['reference'] | null;
  entry_requirement_list_id: number | null;
  entry_requirement_revision: number | null;
  items: RequirementItem[];
};

export type ParentRequirementChild = {
  student: { id: number; name: string };
  academic_year_id: number | null;
  academic_year: string | null;
  level_id: number | null;
  level: string | null;
  class_id: number | null;
  class_name: string | null;
  list_id: number | null;
  revision: number | null;
  published_at: string | null;
  updated: boolean;
  changes: RequirementDiff | null;
  books: RequirementItem[];
  notebooks: RequirementItem[];
  stationery: RequirementItem[];
  uniform: RequirementItem[];
  materials: RequirementItem[];
  other: RequirementItem[];
  view_receipt: { first_viewed_at: string; last_viewed_at: string } | null;
  progress: Array<{ item_stable_key: string; status: RequirementProgress }>;
};

export type ParentRequirementFamily = {
  children: ParentRequirementChild[];
  completed_count: number;
  total_family_provided_count: number;
  pending_count: number;
};

export function requirementStateLabel(state: RequirementList['state']): string {
  return ({ draft: 'مسودة', under_review: 'قيد المراجعة', published: 'منشورة', archived: 'مؤرشفة' } as const)[state];
}

export function requirementItemTypeLabel(type: RequirementItemType): string {
  return ({ textbook: 'كتاب مقرر', book: 'كتاب آخر', notebook: 'دفتر', stationery: 'أداة مدرسية', uniform: 'زي', material: 'مستلزم', other: 'أخرى' } as const)[type];
}

export function requirementProgressLabel(status: RequirementProgress): string {
  return ({ pending: 'متبقٍ', already_have: 'لدي بالفعل', purchased: 'تم الشراء' } as const)[status];
}

export function familyRequirementItems(child: ParentRequirementChild): RequirementItem[] {
  return [...child.books, ...child.notebooks, ...child.stationery, ...child.uniform, ...child.materials, ...child.other];
}
