"use client";

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReceiptError({ reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[60vh] px-6 py-20 md:py-28">
      <section role="alert" className="mx-auto max-w-2xl border-t border-[var(--border-default)] pt-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Receipt / connection interrupted</p>
        <h1 className="mt-5 text-3xl font-medium tracking-tight text-[var(--text-primary)] md:text-4xl">Receipt could not load</h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-[var(--text-secondary)]">
          We could not reach this receipt just now. That does not tell us whether your scan succeeded or failed.
          Try this link again before starting a new scan.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={reset}>
            <RefreshCw aria-hidden="true" className="size-4" /> Try again
          </Button>
          <Link href="/#scan" className="inline-flex min-h-11 items-center rounded-md px-4 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-base)]">
            Back to free scan
          </Link>
        </div>
      </section>
    </main>
  );
}
