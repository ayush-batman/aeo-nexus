import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = process.cwd();

test('dashboard shell shares collapsed width and exposes a responsive drawer', async () => {
  const shell = await readFile(`${root}/components/dashboard/dashboard-shell.tsx`, 'utf8');
  const sidebar = await readFile(`${root}/components/dashboard/sidebar.tsx`, 'utf8');
  assert.match(shell, /collapsed && ["']lg:pl-16["']/);
  assert.match(shell, /lg:pl-60/);
  assert.match(sidebar, /aria-modal/);
  assert.match(sidebar, /event\.key === ["']Escape["']/);
  assert.match(sidebar, /event\.key !== ["']Tab["']/);
  assert.match(sidebar, /document\.body\.style\.overflow/);
  assert.match(sidebar, /returnFocusRef\.current\?\.focus/);
  assert.match(sidebar, /lg:translate-x-0/);
  assert.match(shell, /href=["']#dashboard-content["']/);
  assert.match(shell, /id=["']dashboard-content["']/);
});

test('dashboard header has a mobile menu and semantic, reachable controls', async () => {
  const header = await readFile(`${root}/components/dashboard/header.tsx`, 'utf8');
  assert.match(header, /aria-label=["']Open navigation["']/);
  assert.match(header, /min-h-11 min-w-11/);
  assert.doesNotMatch(header, /placeholder=["']Search\.\.\.["']/);
  assert.doesNotMatch(header, /<div[\s\S]{0,160}onClick=\{\(\) => openNotification/);
  assert.match(header, /role=["']alert["']/);
});

test('dashboard loading and onboarding failures remain explicit and retryable', async () => {
  const loading = await readFile(`${root}/app/(dashboard)/loading.tsx`, 'utf8');
  const gate = await readFile(`${root}/components/onboarding-check.tsx`, 'utf8');
  const notifications = await readFile(`${root}/app/api/alerts/notifications/route.ts`, 'utf8');
  assert.match(loading, /role=["']status["']/);
  assert.match(gate, /role=["']alert["']/);
  assert.match(gate, /Retry/);
  assert.match(notifications, /Failed to load notifications[\s\S]*status:\s*500/);
});

test('core controls meet target sizes and respect reduced motion', async () => {
  const [button, dialog, styles] = await Promise.all([
    readFile(`${root}/components/ui/button.tsx`, 'utf8'),
    readFile(`${root}/components/ui/dialog.tsx`, 'utf8'),
    readFile(`${root}/app/globals.css`, 'utf8'),
  ]);
  assert.match(button, /h-11[\s\S]*lg:h-10/);
  assert.match(dialog, /h-11 w-11[\s\S]*lg:h-10 lg:w-10/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
});

test('core public forms and product dialog have accessible names and focus behavior', async () => {
  const [freeScan, productDialog] = await Promise.all([
    readFile(`${root}/components/marketing/free-scan-widget.tsx`, 'utf8'),
    readFile(`${root}/components/dashboard/products/add-product-modal.tsx`, 'utf8'),
  ]);
  assert.match(freeScan, /htmlFor=["']free-scan-brand["']/);
  assert.match(freeScan, /htmlFor=["']free-scan-prompt["']/);
  assert.match(freeScan, /role=["']alert["']/);
  assert.match(productDialog, /<Dialog open=\{isOpen\}/);
  assert.match(productDialog, /<DialogTitle/);
  assert.match(productDialog, /<DialogDescription/);
});
