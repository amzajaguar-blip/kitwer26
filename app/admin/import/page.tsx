'use client';
/**
 * @module admin/import/page
 * @description Next.js App Router page — Admin Import Engine.
 */

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

const ImportEnginePanel = dynamic(
  () => import('@/components/admin/ImportEnginePanel'),
  { ssr: false }
);

/**
 * AdminImportPage — server component wrapper.
 *
 * @returns JSX.Element — the admin import engine page.
 * @throws Never — Suspense boundary handles loading state.
 */
export default function AdminImportPage(): React.JSX.Element {
  return (
    <main className="bg-[#0a0a0f] min-h-screen">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <span className="font-mono text-[#00d4ff] text-[13px] animate-pulse">
              Loading import engine…
            </span>
          </div>
        }
      >
        <ImportEnginePanel />
      </Suspense>
    </main>
  );
}
