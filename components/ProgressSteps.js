'use client';

const STEPS = [
  { icon: '🗜️', label: 'Compressing' },
  { icon: '🔐', label: 'Encrypting' },
  { icon: '☁️', label: 'Uploading' },
];

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

export default function ProgressSteps({ fileName, fileSize, progress }) {
  // progress = [compress%, encrypt%, upload%]
  return (
    <div className="progress-section">
      <div className="file-info-bar">
        <span className="file-icon">📄</span>
        <div className="file-details">
          <span className="file-name">{fileName}</span>
          <span className="file-size">{formatSize(fileSize)}</span>
        </div>
      </div>

      {STEPS.map((step, i) => {
        const pct = progress[i] || 0;
        const isDone = pct >= 100;
        const isActive = pct > 0 && pct < 100;
        return (
          <div key={i} className="step-row">
            <div className={`step-icon-circle${isDone ? ' done' : isActive ? ' active' : ''}`}>
              {isDone ? '✓' : step.icon}
            </div>
            <div className="step-content">
              <span className="step-label">
                {isDone ? step.label.replace('ing', 'ed') : step.label}
              </span>
              <div className="progress-track">
                <div
                  className={`progress-fill${isDone ? ' done' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { formatSize };
