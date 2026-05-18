'use client';
import { useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ToastProvider, useToast } from '@/components/Toast';
import DropZone from '@/components/DropZone';
import ProgressSteps from '@/components/ProgressSteps';
import LinkGenerator from '@/components/LinkGenerator';
import DownloadView from '@/components/DownloadView';

function AppContent() {
  const searchParams = useSearchParams();
  const downloadId = searchParams.get('download');

  const showToast = useToast();

  // Upload state
  const [phase, setPhase] = useState('idle'); // idle | uploading | done
  const [progress, setProgress] = useState([0, 0, 0]);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [fileId, setFileId] = useState('');
  const [fileExt, setFileExt] = useState('');

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const handleFileSelected = useCallback(async (file) => {
    if (phase === 'uploading') return;

    setPhase('uploading');
    setFileName(file.name);
    setFileSize(file.size);
    setProgress([0, 0, 0]);

    try {
      // Step 1: Simulate compression
      for (let i = 0; i <= 100; i += 20) {
        setProgress([i, 0, 0]);
        await delay(50);
      }

      // Step 2: Simulate encryption
      for (let i = 0; i <= 100; i += 25) {
        setProgress([100, i, 0]);
        await delay(50);
      }

      // Step 3: Real upload with XHR for progress
      const formData = new FormData();
      formData.append('file', file);

      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload', true);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress([100, 100, pct]);
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              if (res.success) resolve(res);
              else reject(new Error(res.error || 'Upload failed'));
            } catch { reject(new Error('Invalid server response')); }
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        };

        xhr.send(formData);
      });

      setProgress([100, 100, 100]);
      await delay(300);

      setUploadResult(result);
      setFileId(result.fileId);
      setFileExt(result.extension || '');
      setPhase('done');
      showToast('Upload completed!', 'success');
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error');
      resetUpload();
    }
  }, [phase, showToast]);

  const resetUpload = useCallback(() => {
    setPhase('idle');
    setProgress([0, 0, 0]);
    setFileName('');
    setFileSize(0);
    setUploadResult(null);
    setFileId('');
    setFileExt('');
  }, []);

  // If download mode
  if (downloadId) {
    return (
      <div className="app-container">
        <Header />
        <DownloadView fileId={downloadId} showToast={showToast} />
        <Footer />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header />
      <main style={{ flex: 1 }}>
        <div className="glass-card">
          {phase === 'idle' && (
            <DropZone onFileSelected={handleFileSelected} disabled={false} />
          )}
          {phase === 'uploading' && (
            <ProgressSteps fileName={fileName} fileSize={fileSize} progress={progress} />
          )}
          {phase === 'done' && (
            <LinkGenerator
              fileId={fileId}
              extension={fileExt}
              uploadResult={uploadResult}
              onReset={resetUpload}
              showToast={showToast}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="app-header">
      <div className="logo-row">
        <div className="logo-icon">🔒</div>
        <span className="logo-text">DropLocker</span>
      </div>
      <p className="tagline">Secure Encrypted File Sharing • AES-256-GCM</p>
    </header>
  );
}

function Footer() {
  return (
    <footer className="app-footer">
      <div style={{ marginBottom: '0.5rem' }}>
        <a href="https://github.com/Samarth-SR/Droplocker/" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </div>
      <p>© 2025 DropLocker — Encrypted File Sharing</p>
    </footer>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <Suspense fallback={
        <div className="app-container">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <span className="spinner" style={{ width: 40, height: 40 }} />
          </div>
        </div>
      }>
        <AppContent />
      </Suspense>
    </ToastProvider>
  );
}
