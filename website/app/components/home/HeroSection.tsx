'use client';

import { motion } from 'motion/react';
import TerminalMockup from './TerminalMockup';
import DownloadButton from '../download/DownloadButton';

type Props = {
  publicDomain: string;
  sampleSubdomain: string;
  samplePort: string;
};

const ease = [0.22, 1, 0.36, 1] as const;

export default function HeroSection({ publicDomain, sampleSubdomain, samplePort }: Props) {
  const sampleUrl = `https://${sampleSubdomain}.${publicDomain}`;

  return (
    <section className="hero">
      <div className="hero-copy">
        <motion.p
          className="hero-brand"
          initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.85, ease }}
        >
          PortShare
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.08, ease }}
        >
          Public URLs for localhost
        </motion.h1>

        <motion.p
          className="hero-lede"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.16, ease }}
        >
          Permanent HTTPS tunnels for demos, webhooks, and local apps — without renting a subdomain.
        </motion.p>

        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.24, ease }}
        >
          <DownloadButton className="btn btn-primary">Download</DownloadButton>
          <a className="btn btn-ghost" href="#how-it-works">How it works</a>
        </motion.div>

        <motion.p
          className="hero-meta"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <span className="hero-meta-dot" />
          Open source · {sampleSubdomain}.{publicDomain}
        </motion.p>
      </div>

      <motion.div
        className="hero-stage"
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.95, delay: 0.18, ease }}
      >
        <div className="hero-glow" aria-hidden />
        <TerminalMockup samplePort={samplePort} sampleUrl={sampleUrl} />
      </motion.div>
    </section>
  );
}
