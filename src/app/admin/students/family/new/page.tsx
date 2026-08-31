import { FamilyRegistrationPage } from '@/features/admin/students/components/family-registration-page';
import styles from './family-registration-shell.module.css';

export default function Page() {
  return (
    <div className={`student-create-page ${styles.page}`}>
      <FamilyRegistrationPage />
    </div>
  );
}
