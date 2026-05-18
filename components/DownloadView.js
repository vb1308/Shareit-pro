'use client';
import { useState, useEffect } from 'react';
import { formatSize } from './ProgressSteps';

function timeRemaining(expiryMs) {
  if (!expiryMs) return null;
  const diff = expiryMs - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h remaining`;
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

export default function DownloadView({ fileId, showToast }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    fetchInfo();
  }, [fileId]);

  useEffect(() => {
    if (!info?.expiry) return;
    const update = () => setCountdown(timeRemaining(info.expiry));
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [info?.expiry]);

  const fetchInfo = async () => {
    try {
      const resp = await fetch(`/api/info?id=${encodeURIComponent(fileId)}`);
      const json = await resp.json();
      if (!json.success) throw new Error(json.error || 'File not found');
      setInfo(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (info.hasPassword && !password.trim()) {
      showToast('Please enter the password', 'error');
      return;
    }
    setDownloading(true);
    try {
      let resp;
      if (info.hasPassword) {
        resp = await fetch('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: fileId, password }),
        });
      } else {
        resp = await fetch(`/api/download?id=${encodeURIComponent(fileId)}`);
      }

      if (!resp.ok) {
        let errMsg = 'Download failed';
        try {
          const j = await resp.json();
          errMsg = j.error || errMsg;
        } catch {
          errMsg = await resp.text() || errMsg;
        }
        throw new Error(errMsg);
      }

      // Stream download
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = info.name || fileId;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Download started!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="download-card glass-card">
        <div className="download-hero-icon">🔒</div>
        <h2>Loading file info...</h2>
        <div className="mt-2" style={{ display: 'flex', justifyContent: 'center' }}>
          <span className="spinner" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card error-state">
        <div className="error-icon">❌</div>
        <h3>File Not Available</h3>
        <p>{error}</p>
        <div className="mt-2">
          <a href="/" className="btn btn-outline">⬅️ Go Back to Upload</a>
        </div>
      </div>
    );
  }

  return (
    <div className="download-card glass-card">
      <div className="download-hero-icon">⬇️</div>
      <h2>Secure File Download</h2>
      <p className="subtitle">This file is encrypted with {info.algorithm}</p>

      {countdown && (
        <div className="expiry-badge">⏱️ {countdown}</div>
      )}

      <div className="file-preview-card">
        <span className="fp-icon">📄</span>
        <div className="fp-details">
          <span className="fp-name">{info.name}</span>
          <span className="fp-meta">
            {formatSize(info.originalSize)} • {info.algorithm}
          </span>
        </div>
      </div>

      {info.hasPassword && (
        <div className="password-box">
          <label>🔑 Password Required</label>
          <input
            type="password"
            className="form-input"
            placeholder="Enter password to download"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
          />
        </div>
      )}

      <button
        className="btn btn-success"
        onClick={handleDownload}
        disabled={downloading}
        style={{ width: '100%' }}
      >
        {downloading ? <span className="spinner" /> : '⬇️'} Download File
      </button>

      <div className="mt-2">
        <a href="/" className="btn btn-outline">⬅️ Upload a File</a>
      </div>
    </div>
  );
}
