import { redirect } from 'next/navigation';

/** Legacy detail route — fee types are managed inside the fee plans workspace. */
export default function AdminFinanceFeeTypeDetailRedirectPage() {
  redirect('/admin/finance/fee-plans?catalog=open');
}
