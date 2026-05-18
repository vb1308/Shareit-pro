'use client';
import { useRef, useState, useCallback } from 'react';

export default function DropZone({ onFileSelected, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files.length > 0) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  }, [onFileSelected, disabled]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  }, [disabled]);

  return (
    <div
      className={`drop-zone${dragging ? ' dragover' : ''}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
    >
      <span className="drop-zone-icon">📁</span>
      <h3>Drop your file here or click to browse</h3>
      <p>Files are encrypted with AES-256-GCM before storage</p>
      <button
        className="btn btn-primary"
        type="button"
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        disabled={disabled}
      >
        ⬆️ Choose File
      </button>
      <input
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files.length > 0) onFileSelected(e.target.files[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
