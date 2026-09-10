import TerminalMockup from "./TerminalMockup";
import BadgesRow from "./BadgesRow";

export default function HeroSection({ publicDomain, sampleSubdomain, samplePort }: { publicDomain: string, sampleSubdomain: string, samplePort: string }) {
  const sampleUrl = `https://${sampleSubdomain}.${publicDomain}`;
  return (
    <section className="hero-block">
      <div className="hero-eyebrow">
        <span className="hero-eyebrow-dot" />
        Developer-first localhost tunneling
      </div>

      <h1>
        Expose localhost with a <span className="accent-word">public URL</span> in seconds.
      </h1>

      <p className="hero-copy">
        PortShare gives your local dev server a permanent public subdomain. Ship demos,
        test webhooks, and collaborate on localhost — with a desktop client that just works.
      </p>

      <div className="hero-actions">
        <a className="btn btn-primary" href="/download/portshare-desktop">
          Download Desktop App
        </a>
        <a className="btn btn-ghost" href="#how-it-works">
          See how it works →
        </a>
      </div>

      <TerminalMockup samplePort={samplePort} sampleUrl={sampleUrl} />
      <BadgesRow />
    </section>
  );
}
