'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function HowItWorks({ sampleSubdomain, publicDomain }: { sampleSubdomain: string; publicDomain: string }) {
  const rootRef = useRef<HTMLElement>(null);

  const steps = [
    { n: '01', title: 'Install', body: 'Download the Windows desktop app.' },
    { n: '02', title: 'Claim', body: `Reserve ${sampleSubdomain}.${publicDomain}` },
    { n: '03', title: 'Expose', body: 'Point it at any local port and go live.' },
  ];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        root.querySelector('.steps-intro'),
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.75,
          ease: 'power3.out',
          immediateRender: false,
          scrollTrigger: { trigger: root, start: 'top 80%', once: true },
        },
      );

      gsap.fromTo(
        root.querySelectorAll('.step'),
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: 'power3.out',
          immediateRender: false,
          scrollTrigger: { trigger: root.querySelector('.steps-list'), start: 'top 85%', once: true },
        },
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section id="how-it-works" className="steps" ref={rootRef}>
      <div className="steps-intro">
        <span className="eyebrow">How it works</span>
        <h2>Three steps to a public URL</h2>
      </div>
      <ol className="steps-list">
        {steps.map((step) => (
          <li key={step.n} className="step">
            <span className="step-n">{step.n}</span>
            <div className="step-body">
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
