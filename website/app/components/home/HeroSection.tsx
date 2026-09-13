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
          initial={{ y: 16 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.7, ease }}
        >
          PortShare
        </motion.p>

        <motion.h1
          initial={{ y: 12 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.65, delay: 0.05, ease }}
        >
          Public URLs for localhost
        </motion.h1>

        <motion.p
          className="hero-lede"
          initial={{ y: 10 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
        >
          Permanent HTTPS tunnels for demos, webhooks, and local apps — without renting a subdomain.
        </motion.p>

        <motion.div
          className="hero-actions"
          initial={{ y: 8 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.55, delay: 0.14, ease }}
        >
          <DownloadButton className="btn btn-primary">Download</DownloadButton>
          <a className="btn btn-ghost" href="#how-it-works">How it works</a>
        </motion.div>

        <p className="hero-meta">
          <span className="hero-meta-dot" />
          Open source · {sampleSubdomain}.{publicDomain}
        </p>
      </div>

      <motion.div
        className="hero-stage"
        initial={{ y: 18 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.75, delay: 0.1, ease }}
      >
        <div className="hero-glow" aria-hidden />
        <TerminalMockup samplePort={samplePort} sampleUrl={sampleUrl} />
      </motion.div>
    </section>
  );
}
