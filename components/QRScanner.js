'use client';
import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function QRScanner({ onScan, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="glass-card scanner-modal">
        <div className="scanner-header">
          <h3>📸 Scan QR Code</h3>
          <button className="btn btn-outline" onClick={onClose} style={{ padding: '0.2rem 0.5rem' }}>✕</button>
        </div>
        <p className="subtitle" style={{ marginBottom: '1rem' }}>Scan a ShareIt Pro code to download.</p>
        <div className="scanner-container" style={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Scanner 
            onScan={(result) => {
              if (result && result.length > 0) {
                onScan(result[0].rawValue);
              }
            }}
            styles={{ container: { width: '100%', height: '300px' } }}
          />
        </div>
      </div>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(5px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .scanner-modal {
          width: 90%;
          max-width: 400px;
          padding: 1.5rem;
        }
        .scanner-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      `}</style>
    </div>
  );
}
