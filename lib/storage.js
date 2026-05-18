/**
 * DropLocker Storage Utilities using Supabase
 * Replaces local filesystem with Supabase Storage and PostgreSQL.
 */
const { generateMasterKeyBase64 } = require('./crypto');
const { supabase } = require('./supabase');
const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(process.cwd(), '.env.local');

/**
 * Ensure MASTER_KEY exists in .env.local. If not, generate one.
 * Also appends placeholders for Supabase credentials.
 */
function ensureMasterKey() {
  if (process.env.MASTER_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) return;

  let envContent = '';
  if (fs.existsSync(ENV_FILE)) {
    envContent = fs.readFileSync(ENV_FILE, 'utf-8');
    const match = envContent.match(/^MASTER_KEY=(.+)$/m);
    if (match) {
      process.env.MASTER_KEY = match[1].trim();
    }
  }

  let appended = false;

  if (!process.env.MASTER_KEY) {
    const newKey = generateMasterKeyBase64();
    envContent += (envContent && !envContent.endsWith('\n') ? '\n' : '') + `MASTER_KEY=${newKey}\n`;
    process.env.MASTER_KEY = newKey;
    appended = true;
  }

  if (!envContent.includes('NEXT_PUBLIC_SUPABASE_URL')) {
    envContent += `NEXT_PUBLIC_SUPABASE_URL=your-supabase-url-here\nSUPABASE_SERVICE_KEY=your-supabase-service-key-here\n`;
    appended = true;
  }

  if (appended) {
    fs.writeFileSync(ENV_FILE, envContent);
  }
}

/**
 * Initialize storage master key.
 */
function initStorage() {
  ensureMasterKey();
}

// --- File operations (Supabase Storage) ---

function getFilePath(fileId, ext) {
  return ext ? `${fileId}.${ext}` : fileId;
}

async function saveFile(fileId, ext, buffer) {
  const filePath = getFilePath(fileId, ext);
  const { data, error } = await supabase.storage
    .from('encrypted-files')
    .upload(filePath, buffer, {
      contentType: 'application/octet-stream',
      upsert: true,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error('Failed to upload file to Supabase');
  }
  return filePath;
}

async function readFile(fileId, ext) {
  // First try with the exact extension
  let filePath = getFilePath(fileId, ext);
  let { data, error } = await supabase.storage
    .from('encrypted-files')
    .download(filePath);

  if (error && !ext) {
    // If no ext provided, we would need to know the ext. 
    // In our logic, API routes should ideally pass the exact extension if available,
    // or we fetch metadata first to know the extension.
    return null;
  }

  if (error) return null;
  return Buffer.from(await data.arrayBuffer());
}

async function deleteFile(fileId, ext) {
  const filePath = getFilePath(fileId, ext);
  await supabase.storage.from('encrypted-files').remove([filePath]);
}

// --- Metadata operations (Supabase PostgreSQL) ---

async function readMeta(fileId) {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('id', fileId)
    .single();

  if (error || !data) return null;

  // Map snake_case db columns to camelCase object
  return {
    fileId: data.id,
    originalName: data.original_name,
    ext: data.ext,
    originalSize: parseInt(data.original_size, 10),
    encryptedSize: parseInt(data.encrypted_size, 10),
    algorithm: data.algorithm,
    fileKeyEnc: data.file_key_enc,
    hasPassword: data.has_password,
    passwordHash: data.password_hash,
    expiry: data.expiry ? parseInt(data.expiry, 10) : null,
    downloaded: data.downloaded,
    oneTime: data.one_time,
    createdAt: parseInt(data.created_at, 10),
    updatedAt: data.updated_at ? parseInt(data.updated_at, 10) : null,
  };
}

async function writeMeta(fileId, meta) {
  const dbData = {
    id: fileId,
    original_name: meta.originalName,
    ext: meta.ext || '',
    original_size: meta.originalSize,
    encrypted_size: meta.encryptedSize,
    algorithm: meta.algorithm,
    file_key_enc: meta.fileKeyEnc,
    has_password: meta.hasPassword || false,
    password_hash: meta.passwordHash || null,
    expiry: meta.expiry,
    downloaded: meta.downloaded || false,
    one_time: meta.oneTime || true,
    created_at: meta.createdAt || Date.now(),
    updated_at: meta.updatedAt || Date.now(),
    storage_path: getFilePath(fileId, meta.ext)
  };

  const { error } = await supabase
    .from('files')
    .upsert(dbData);

  if (error) {
    console.error('Supabase writeMeta error:', error);
    throw new Error('Failed to save metadata to Supabase');
  }
}

async function deleteMeta(fileId) {
  await supabase.from('files').delete().eq('id', fileId);
}

async function deleteFileAndMeta(fileId, ext) {
  await deleteFile(fileId, ext);
  await deleteMeta(fileId);
}

module.exports = {
  initStorage,
  saveFile,
  readFile,
  deleteFile,
  readMeta,
  writeMeta,
  deleteMeta,
  deleteFileAndMeta,
};
