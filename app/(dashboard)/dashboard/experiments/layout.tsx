import { redirect } from 'next/navigation';

export default function RetiredExperimentsLayout() {
  // The former screen created drafts but did not execute a controlled test.
  // Actions runs compatible baseline/follow-up measurements instead.
  redirect('/dashboard/interventions');
}
