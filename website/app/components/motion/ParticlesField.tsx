'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Particles, ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Engine, ISourceOptions } from '@tsparticles/engine';

function useThemeMode() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const read = () => {
      const value = document.documentElement.dataset.theme;
      setTheme(value === 'light' ? 'light' : 'dark');
    };
    read();

    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}

function ParticlesCanvas({ theme }: { theme: 'light' | 'dark' }) {
  const options = useMemo<ISourceOptions>(() => {
    const light = theme === 'light';
    return {
      fullScreen: false,
      background: { color: { value: 'transparent' } },
      fpsLimit: 60,
      detectRetina: true,
      particles: {
        number: { value: light ? 55 : 42, density: { enable: true, width: 1200, height: 800 } },
        color: {
          value: light ? ['#0f9f6e', '#0e8aa8', '#334155'] : ['#3dd68c', '#5ee1f0', '#94a3b8'],
        },
        opacity: { value: light ? { min: 0.28, max: 0.55 } : { min: 0.14, max: 0.38 } },
        size: { value: { min: 1.2, max: light ? 3 : 2.4 } },
        links: {
          enable: true,
          distance: 150,
          color: light ? '#64748b' : '#94a3b8',
          opacity: light ? 0.28 : 0.14,
          width: 1,
        },
        move: {
          enable: true,
          speed: 0.4,
          direction: 'none',
          outModes: { default: 'out' },
        },
      },
      interactivity: {
        events: {
          onHover: { enable: true, mode: 'grab' },
        },
        modes: {
          grab: { distance: 150, links: { opacity: light ? 0.45 : 0.28 } },
        },
      },
    };
  }, [theme]);

  return (
    <div className="particles-host" aria-hidden>
      <Particles key={theme} id={`portshare-particles-${theme}`} options={options} />
    </div>
  );
}

export default function ParticlesField() {
  const theme = useThemeMode();

  const init = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  return (
    <ParticlesProvider init={init}>
      <ParticlesCanvas theme={theme} />
    </ParticlesProvider>
  );
}
