import { NextResponse } from 'next/server';
const { initStorage, readMeta, deleteFileAndMeta } = require('@/lib/storage');

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    initStorage();

    const { searchParams } = new URL(request.url);
    const fileId = (searchParams.get('id') || '').replace(/[^a-zA-Z0-9]/g, '');

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'Missing file ID' },
        { status: 400 }
      );
    }

    const meta = await readMeta(fileId);
    if (!meta) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // Check expiry
    if (meta.expiry && Date.now() > meta.expiry) {
      await deleteFileAndMeta(fileId, meta.ext);
      return NextResponse.json(
        { success: false, error: 'This file has expired' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      id: fileId,
      name: meta.originalName || fileId,
      ext: meta.ext || '',
      originalSize: meta.originalSize || 0,
      encryptedSize: meta.encryptedSize || 0,
      algorithm: meta.algorithm || 'AES-256-GCM',
      hasPassword: !!meta.hasPassword,
      expiry: meta.expiry || null,
      createdAt: meta.createdAt || null,
      downloadCount: meta.downloadCount || 0,
      maxDownloads: meta.maxDownloads || 3,
    });
  } catch (error) {
    console.error('Info error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
