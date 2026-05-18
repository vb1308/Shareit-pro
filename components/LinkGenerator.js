'use client';
import { useState, useRef, useEffect } from 'react';
import { formatSize } from './ProgressSteps';

export default function LinkGenerator({ fileId, extension, uploadResult, onReset, showToast }) {
  const [expiry, setExpiry] = useState('86400');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const linkInputRef = useRef(null);

  const generateLink = async () => {
    if (usePassword && !password.trim()) {
      showToast('Please enter a password', 'error');
      return;
    }
    setGenerating(true);
    try {
      const resp = await fetch('/api/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          extension: extension || '',
          expiry: parseInt(expiry, 10),
          password: usePassword ? password : null,
        }),
      });
      const json = await resp.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      setShareLink(json.link);
      showToast('Secure link generated!', 'success');

      // Generate QR code
      try {
        const QRCode = (await import('qrcode')).default;
        const dataUrl = await QRCode.toDataURL(json.link, {
          width: 200,
          margin: 2,
          color: { dark: '#6366f1', light: '#ffffff' },
        });
        setQrDataUrl(dataUrl);
      } catch {}
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = () => {
    if (linkInputRef.current) {
      linkInputRef.current.select();
      navigator.clipboard.writeText(shareLink).then(() => {
        showToast('Link copied!', 'success');
      }).catch(() => {
        document.execCommand('copy');
        showToast('Link copied!', 'success');
      });
    }
  };

  return (
    <div className="link-section">
      <div className="success-checkmark">✅</div>
      <h3>File Encrypted & Uploaded!</h3>

      {uploadResult && (
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Original</span>
            <span className="stat-value">{formatSize(uploadResult.originalSize)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Encrypted</span>
            <span className="stat-value">{formatSize(uploadResult.encryptedSize)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Algorithm</span>
            <span className="stat-value" style={{ fontSize: '0.85rem' }}>{uploadResult.algorithm}</span>
          </div>
        </div>
      )}

      <div className="options-grid">
        <div className="option-box">
          <label htmlFor="expirySelect">⏱️ Link Expires In</label>
          <select
            id="expirySelect"
            className="form-select"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          >
            <option value="3600">1 Hour</option>
            <option value="86400">24 Hours</option>
            <option value="604800">7 Days</option>
            <option value="2592000">30 Days</option>
          </select>
        </div>
        <div className="option-box">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={usePassword}
              onChange={(e) => {
                setUsePassword(e.target.checked);
                if (!e.target.checked) setPassword('');
              }}
            />
            🔑 Password Protection
          </label>
          {usePassword && (
            <input
              type="password"
              className="form-input mt-1"
              placeholder="Enter a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={generateLink}
        disabled={generating}
        style={{ width: '100%' }}
      >
        {generating ? <span className="spinner" /> : '🔗'} Generate Secure Link
      </button>

      {shareLink && (
        <div className="link-display">
          <div className="link-row">
            <input
              ref={linkInputRef}
              type="text"
              className="link-input"
              value={shareLink}
              readOnly
            />
            <button className="btn btn-secondary" onClick={copyLink}>
              📋 Copy
            </button>
          </div>
          <p className="link-hint">
            Share this link. It will auto-delete after download{expiry !== '0' ? ' or expiry' : ''}.
          </p>

          {qrDataUrl && (
            <div className="qr-wrapper">
              <img src={qrDataUrl} alt="QR Code" />
            </div>
          )}
        </div>
      )}

      <div className="btn-group">
        <button className="btn btn-outline" onClick={onReset}>
          ➕ Upload Another File
        </button>
      </div>
    </div>
  );
}
