/**
 * @module AdminImportFilesRoute
 * @description GET /api/admin/import/files — Returns sorted list of .csv/.CSV files
 * from MAGAZZINO/ directory with file stats (name, size, mtime).
 * Auth: x-admin-secret header OR kitwer_vault_session cookie must match ADMIN_API_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { z } from 'zod';

export const runtime = 'nodejs';

/** No query params accepted — schema kept for pattern compliance */
const QuerySchema = z.object({});

/** File entry returned by this endpoint */
export interface FileEntry {
  name: string;
  size: number;
  mtime: string;
}

/**
 * Checks if the request is authorized via header or cookie.
 * @param req - The incoming NextRequest
 * @returns true if authorized, false otherwise
 * @throws never — authorization failures are returned as booleans
 */
async function isAuthorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return false;

  const headerVal = req.headers.get('x-admin-secret');
  if (headerVal === secret) return true;

  const cookieStore = await cookies();
  const cookieVal = cookieStore.get('kitwer_vault_session')?.value;
  return cookieVal === secret;
}

/**
 * GET /api/admin/import/files
 * Returns sorted list of .csv/.CSV files in the MAGAZZINO/ directory with stats.
 *
 * @param req - NextRequest
 * @returns JSON { files: FileEntry[] } on success, or JSON error with appropriate status
 * @throws never — all errors are caught and returned as JSON responses
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const queryResult = QuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams.entries())
  );
  if (!queryResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: queryResult.error.issues },
      { status: 422 }
    );
  }

  const authorized = await isAuthorized(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const magazzinoDir = path.join(process.cwd(), 'MAGAZZINO');

  let entries: string[];
  try {
    entries = await fsPromises.readdir(magazzinoDir);
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return NextResponse.json(
        { error: 'MAGAZZINO directory not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: 'File system error' }, { status: 500 });
  }

  const csvFiles = entries.filter(
    (f) => f.endsWith('.csv') || f.endsWith('.CSV')
  );

  const sorted = csvFiles.sort((a, b) =>
    a.localeCompare(b, 'en', { sensitivity: 'base' })
  );

  const filesWithStats: FileEntry[] = await Promise.all(
    sorted.map(async (file): Promise<FileEntry> => {
      const filePath = path.join(magazzinoDir, file);
      try {
        const stat = await fsPromises.stat(filePath);
        return {
          name: file,
          size: stat.size,
          mtime: stat.mtime.toISOString(),
        };
      } catch {
        return {
          name: file,
          size: 0,
          mtime: new Date(0).toISOString(),
        };
      }
    })
  );

  return NextResponse.json({ files: filesWithStats }, { status: 200 });
}
