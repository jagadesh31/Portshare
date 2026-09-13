'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Apple, ArrowLeft, ChevronRight, Monitor, Terminal } from 'lucide-react';

type Platform = {
  id: string;
  architecture: string;
  detail: string;
};

type OperatingSystem = { id: string; label: string; description: string; platforms: Platform[] };

const operatingSystems: OperatingSystem[] = [
  { id: 'windows', label: 'Windows', description: 'Installer and portable builds', platforms: [
    { id: 'windows-x64', architecture: 'x64', detail: 'Installer (.exe)' },
    { id: 'windows-arm64', architecture: 'ARM64', detail: 'Portable (.zip)' },
  ] },
  { id: 'macos', label: 'macOS', description: 'Apple Silicon and Intel builds', platforms: [
    { id: 'macos-arm64', architecture: 'Apple Silicon', detail: '.zip' },
    { id: 'macos-x64', architecture: 'Intel', detail: '.zip' },
  ] },
  { id: 'linux', label: 'Linux', description: 'Debian, RPM and portable builds', platforms: [
    { id: 'linux-x64-deb', architecture: 'x64', detail: '.deb' },
    { id: 'linux-x64-rpm', architecture: 'x64', detail: '.rpm' },
    { id: 'linux-arm64-deb', architecture: 'ARM64', detail: '.deb' },
    { id: 'linux-arm64-rpm', architecture: 'ARM64', detail: '.rpm' },
  ] },
];

const osIcons = { windows: Monitor, macos: Apple, linux: Terminal };

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

function operatingSystemFor(platformId: string | null): string {
  return operatingSystems.find((os) => os.platforms.some((platform) => platform.id === platformId))?.id ?? 'windows';
}

type Props = {
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
};

export default function DownloadButton({ className = 'btn btn-primary', style, children }: Props) {
  const [open, setOpen] = useState(false);
  const [recommended, setRecommended] = useState<string | null>(null);
  const [selectedOs, setSelectedOs] = useState('windows');
  const titleId = useId();

  const openModal = () => {
    const detected = detectPlatform();
    setRecommended(detected);
    setSelectedOs(operatingSystemFor(detected));
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

              <div className="download-content">
                <div className="download-os-grid" aria-label="Choose your operating system">
                  {operatingSystems.map((os) => {
                    const Icon = osIcons[os.id as keyof typeof osIcons];
                    return (
                      <button key={os.id} type="button" className={`download-os-card${selectedOs === os.id ? ' selected' : ''}`} onClick={() => setSelectedOs(os.id)} aria-pressed={selectedOs === os.id}>
                        <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
                        <span className="download-os-name">{os.label}</span>
                        <span className="download-os-description">{os.description}</span>
                        <ChevronRight className="download-os-arrow" size={17} aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence mode="wait">
                  {operatingSystems.filter((os) => os.id === selectedOs).map((os) => (
                    <motion.div key={os.id} className="download-installations" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                      <div className="download-installations-heading">
                        <div><span className="download-eyebrow">{os.label} downloads</span><h3>Choose your installation</h3></div>
                        <button type="button" className="download-back" onClick={() => setSelectedOs('')}><ArrowLeft size={14} aria-hidden="true" />All platforms</button>
                      </div>
                      <div className="download-list">
                        {os.platforms.map((platform) => (
                          <a key={platform.id} className="download-row available" href={`/download/portshare-desktop?platform=${platform.id}`}>
                            <span><strong>{platform.architecture}</strong><span className="download-detail">{platform.detail}</span></span>
                            <span className="download-action">{recommended === platform.id && <span className="download-badge">Your device</span>}Download</span>
                          </a>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
