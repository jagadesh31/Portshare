'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';

type Platform = {
  id: string;
  label: string;
  detail: string;
};

const platforms: Platform[] = [
  { id: 'windows-x64', label: 'Windows', detail: 'x64 · Installer (.exe)' },
  { id: 'windows-arm64', label: 'Windows', detail: 'ARM64 · Portable (.zip)' },
  { id: 'macos-arm64', label: 'macOS', detail: 'Apple Silicon · .zip' },
  { id: 'macos-x64', label: 'macOS', detail: 'Intel · .zip' },
  { id: 'linux-x64-deb', label: 'Linux', detail: 'x64 · .deb' },
  { id: 'linux-x64-rpm', label: 'Linux', detail: 'x64 · .rpm' },
  { id: 'linux-arm64-deb', label: 'Linux', detail: 'ARM64 · .deb' },
  { id: 'linux-arm64-rpm', label: 'Linux', detail: 'ARM64 · .rpm' },
];

/** Best-effort guess of the visitor's package. macOS arch is not detectable. */
function detectPlatform(): string | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  const arm = /arm64|aarch64/i.test(ua);
  if (/Windows/i.test(ua)) return arm ? 'windows-arm64' : 'windows-x64';
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) {
    return arm ? 'linux-arm64-deb' : 'linux-x64-deb';
  }
  return null;
}

type Props = {
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
};

export default function DownloadButton({ className = 'btn btn-primary', style, children }: Props) {
  const [open, setOpen] = useState(false);
  const [recommended, setRecommended] = useState<string | null>(null);
  const titleId = useId();

  const openModal = () => {
    setRecommended(detectPlatform());
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button type="button" className={className} style={style} onClick={openModal}>
        {children}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="download-overlay"
            onClick={() => setOpen(false)}
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="download-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="download-modal-header">
                <div>
                  <h2 id={titleId}>Download PortShare</h2>
                  <p>Available for Windows, macOS and Linux on both x64 and ARM64.</p>
                </div>
                <button type="button" className="download-close" onClick={() => setOpen(false)} aria-label="Close">
                  ×
                </button>
              </div>

              <div className="download-list">
                {platforms.map((platform) => (
                  <a
                    key={platform.id}
                    className="download-row available"
                    href={`/download/portshare-desktop?platform=${platform.id}`}
                  >
                    <span>
                      <strong>{platform.label}</strong>
                      <span className="download-detail">{platform.detail}</span>
                    </span>
                    <span className="download-action">
                      {recommended === platform.id && (
                        <span className="download-badge">Your device</span>
                      )}
                      Download
                    </span>
                  </a>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
