import { NextResponse } from 'next/server';
const bcrypt = require('bcryptjs');
const { initStorage, readMeta, writeMeta } = require('@/lib/storage');

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    initStorage();

    const body = await request.json();
    const { fileId, extension, expiry, password } = body;

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'Missing fileId' },
        { status: 400 }
      );
    }

    // Sanitize fileId
    const cleanId = fileId.replace(/[^a-zA-Z0-9]/g, '');
    const meta = await readMeta(cleanId);

    if (!meta) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // Update expiry
    if (expiry && expiry > 0) {
      const maxExpiry = 60 * 60 * 24 * 30; // 30 days max
      const seconds = Math.min(parseInt(expiry, 10), maxExpiry);
      meta.expiry = Date.now() + seconds * 1000;
    } else {
      meta.expiry = null;
    }

    // Update password
    if (password && password.trim() !== '') {
      meta.hasPassword = true;
      meta.passwordHash = await bcrypt.hash(password, 10);
    } else {
      meta.hasPassword = false;
      meta.passwordHash = null;
    }

    meta.ext = extension || meta.ext || '';
    meta.updatedAt = Date.now();

    await writeMeta(cleanId, meta);

    // Build shareable links
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    const uiLink = `${baseUrl}/?download=${encodeURIComponent(cleanId)}`;
    const directLink = `${baseUrl}/api/download?id=${encodeURIComponent(cleanId)}`;

    return NextResponse.json({
      success: true,
      link: uiLink,
      directLink,
      fileId: cleanId,
      extension: meta.ext,
      hasPassword: meta.hasPassword,
      expiry: meta.expiry,
    });
  } catch (error) {
    console.error('Link generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate link: ' + error.message },
      { status: 500 }
    );
  }
}
