import { NextResponse } from 'next/server';
const bcrypt = require('bcryptjs');
const { masterDecrypt, decryptFile } = require('@/lib/crypto');
const { initStorage, readMeta, readFile, writeMeta, deleteFileAndMeta } = require('@/lib/storage');

export const dynamic = 'force-dynamic';

/**
 * GET download — for non-password-protected files
 */
export async function GET(request) {
  try {
    initStorage();

    const { searchParams } = new URL(request.url);
    const fileId = (searchParams.get('id') || '').replace(/[^a-zA-Z0-9]/g, '');

    if (!fileId) {
      return new Response('Missing file ID', { status: 400 });
    }

    const meta = await readMeta(fileId);
    if (!meta) {
      return new Response('File not found or expired', { status: 404 });
    }

    // Check expiry
    if (meta.expiry && Date.now() > meta.expiry) {
      await deleteFileAndMeta(fileId);
      return new Response('File expired', { status: 404 });
    }

    // If password-protected, require POST
    if (meta.hasPassword) {
      return NextResponse.json(
        { success: false, error: 'Password required. Use POST.' },
        { status: 403 }
      );
    }

    return serveFile(fileId, meta);
  } catch (error) {
    console.error('Download error:', error);
    return new Response('Server error: ' + error.message, { status: 500 });
  }
}

/**
 * POST download — for password-protected files
 */
export async function POST(request) {
  try {
    initStorage();

    const body = await request.json();
    const fileId = (body.id || '').replace(/[^a-zA-Z0-9]/g, '');
    const password = body.password || '';

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'Missing file ID' },
        { status: 400 }
      );
    }

    const meta = await readMeta(fileId);
    if (!meta) {
      return NextResponse.json(
        { success: false, error: 'File not found or expired' },
        { status: 404 }
      );
    }

    // Check expiry
    if (meta.expiry && Date.now() > meta.expiry) {
      await deleteFileAndMeta(fileId);
      return NextResponse.json(
        { success: false, error: 'File expired' },
        { status: 404 }
      );
    }

    // Check password
    if (meta.hasPassword) {
      if (!password) {
        return NextResponse.json(
          { success: false, error: 'Password required' },
          { status: 403 }
        );
      }
      const valid = await bcrypt.compare(password, meta.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { success: false, error: 'Wrong password' },
          { status: 403 }
        );
      }
    }

    return serveFile(fileId, meta);
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * Decrypt and serve the file as a download response.
 */
async function serveFile(fileId, meta) {
  // Read encrypted blob
  const blob = await readFile(fileId, meta.ext);
  if (!blob) {
    await deleteFileAndMeta(fileId);
    return new Response('File not found on disk', { status: 404 });
  }

  // Decrypt per-file key using master key
  if (!meta.fileKeyEnc) {
    return new Response('Missing encryption key', { status: 500 });
  }
  const fileKey = masterDecrypt(meta.fileKeyEnc);
  if (!fileKey) {
    return new Response('Key decryption failed', { status: 500 });
  }

  // Decrypt file content
  const plaintext = decryptFile(blob, fileKey);
  if (!plaintext) {
    return new Response('File decryption failed', { status: 500 });
  }

  // Build response headers
  const filename = meta.originalName || `${fileId}.${meta.ext || 'bin'}`;
  const headers = new Headers();
  headers.set('Content-Type', 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  headers.set('Content-Length', String(plaintext.length));
  headers.set('Cache-Control', 'no-store');

  // One-time download: delete after serving
  if (meta.oneTime) {
    // We cannot easily do fire-and-forget in Next.js Serverless Functions because the process might die,
    // but we can try to await the deletion before returning the response. However, we want to return the response stream!
    // Since we are loading the plaintext into memory entirely (not great for large files, but it's what we have),
    // we can safely delete it from Supabase NOW and still return the plaintext buffer!
    try { await deleteFileAndMeta(fileId); } catch {}
  } else {
    // Mark as downloaded
    meta.downloaded = true;
    await writeMeta(fileId, meta);
  }

  return new Response(plaintext, { status: 200, headers });
}
