'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';

type Platform = {
  id: string;
  label: string;
  detail: string;
  available: boolean;
  href?: string;
};

const platforms: Platform[] = [
  {
    id: 'windows-x64',
    label: 'Windows',
    detail: 'x64 installer',
    available: true,
    href: '/download/portshare-desktop?platform=windows-x64',
  },
  {
    id: 'windows-arm',
    label: 'Windows',
    detail: 'ARM64',
    available: false,
  },
  {
    id: 'macos',
    label: 'macOS',
    detail: 'Apple Silicon & Intel',
    available: false,
  },
  {
    id: 'linux',
    label: 'Linux',
    detail: '.deb / AppImage',
    available: false,
  },
];

type Props = {
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
};

export default function DownloadButton({ className = 'btn btn-primary', style, children }: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

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
      <button type="button" className={className} style={style} onClick={() => setOpen(true)}>
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
                  <p>Windows is available now. Other platforms are coming soon.</p>
                </div>
                <button type="button" className="download-close" onClick={() => setOpen(false)} aria-label="Close">
                  ×
                </button>
              </div>

              <div className="download-list">
                {platforms.map((platform) =>
                  platform.available && platform.href ? (
                    <a key={platform.id} className="download-row available" href={platform.href}>
                      <span>
                        <strong>{platform.label}</strong>
                        <span className="download-detail">{platform.detail}</span>
                      </span>
                      <span className="download-action">Download</span>
                    </a>
                  ) : (
                    <div key={platform.id} className="download-row soon">
                      <span>
                        <strong>{platform.label}</strong>
                        <span className="download-detail">{platform.detail}</span>
                      </span>
                      <span className="download-badge">Coming soon</span>
                    </div>
                  ),
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
