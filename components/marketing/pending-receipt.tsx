"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export function PendingReceipt() {
  const router = useRouter();
  useEffect(() => { const timer = window.setInterval(() => router.refresh(), 3000); return () => window.clearInterval(timer); }, [router]);
  return <p role="status" className="mb-6 text-sm text-[var(--text-secondary)]">Waiting for real provider evidence… You can return to this link later.</p>;
}
