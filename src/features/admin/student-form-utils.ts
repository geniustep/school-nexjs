/** @deprecated Import from student-profile / student-api-errors instead. */
export {
  buildStudentCreatePayload as buildStudentPayload,
  type StudentProfileFormState as StudentFormInput,
} from '@/features/admin/students/utils/student-profile';

export { mapStudentApiErrorMessage as mapStudentApiError } from '@/features/admin/students/utils/student-api-errors';
