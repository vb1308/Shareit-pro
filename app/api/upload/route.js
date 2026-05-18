import { NextResponse } from 'next/server';
const { encryptFile, masterEncrypt, generateFileId } = require('@/lib/crypto');
const { initStorage, saveFile, writeMeta } = require('@/lib/storage');

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    initStorage();

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const originalSize = fileBuffer.length;
    const originalName = file.name || 'unknown';
    const ext = originalName.includes('.')
      ? originalName.split('.').pop().toLowerCase()
      : '';

    // Generate file ID
    const fileId = generateFileId();

    // Encrypt file content with a random per-file key
    const { encryptedBlob, fileKey } = encryptFile(fileBuffer);
    const encryptedSize = encryptedBlob.length;

    // Encrypt the per-file key with the master key
    const fileKeyEncrypted = masterEncrypt(fileKey);

    // Save encrypted file to disk
    await saveFile(fileId, ext, encryptedBlob);

    // Save metadata
    const meta = {
      fileId,
      originalName,
      ext,
      createdAt: Date.now(),
      originalSize,
      encryptedSize,
      algorithm: 'AES-256-GCM',
      fileKeyEnc: fileKeyEncrypted,
      hasPassword: false,
      passwordHash: null,
      expiry: null,
      downloaded: false,
      downloadCount: 0,
      maxDownloads: 3,
      oneTime: true,
    };

    await writeMeta(fileId, meta);

    return NextResponse.json({
      success: true,
      fileId,
      originalName,
      extension: ext,
      originalSize,
      encryptedSize,
      algorithm: meta.algorithm,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed: ' + error.message },
      { status: 500 }
    );
  }
}
