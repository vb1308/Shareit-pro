import './globals.css';

export const metadata = {
  title: 'DropLocker — Secure Encrypted File Sharing',
  description: 'Upload, encrypt, and share files securely with AES-256-GCM encryption. Password protection, expiry links, and one-time downloads.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <div className="bg-animated" />
        <Particles />
        {children}
        <div id="toastRoot" className="toast-container" />
      </body>
    </html>
  );
}

function Particles() {
  // Generate deterministic particles with inline styles
  const particles = Array.from({ length: 20 }, (_, i) => {
    const left = ((i * 37 + 13) % 100);
    const size = 2 + (i % 3);
    const duration = 12 + (i % 8) * 3;
    const delay = (i * 1.3) % 10;
    const opacity = 0.2 + (i % 4) * 0.1;
    return (
      <div
        key={i}
        className="particle"
        style={{
          left: `${left}%`,
          width: `${size}px`,
          height: `${size}px`,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          opacity,
        }}
      />
    );
  });
  return <div className="particles">{particles}</div>;
}
