import { redirect } from 'next/navigation';

export default async function InsightsPage() {
    redirect('/dashboard/interventions');
}
