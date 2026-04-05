'use client';

/**
 * PageTracker — fires a lightweight telemetry event on every page navigation.
 * Mounted once in RootLayout. Uses usePathname to detect route changes.
 * Fire-and-forget: never blocks rendering or throws visible errors.
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Skip admin, API, and static paths
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/api')) return;

    fetch('/api/telemetry', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ page_path: pathname }),
    }).catch(() => {}); // fire-and-forget
  }, [pathname]);

  return null;
}
