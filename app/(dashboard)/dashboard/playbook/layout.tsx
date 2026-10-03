import { redirect } from 'next/navigation';

export default function RetiredPlaybookLayout() {
  // The former playbook guessed content coverage and impact. Actions is the
  // evidence-backed replacement and preserves the old URL as a safe redirect.
  redirect('/dashboard/interventions');
}
