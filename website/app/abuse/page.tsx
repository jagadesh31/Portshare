import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

export default function AbusePage() {
  return (
    <div className="landing-wrap">
      <main className="landing-main">
        <Header />
        <div style={{ maxWidth: '800px', margin: '80px auto', padding: '40px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: 'var(--text)' }}>Report Abuse</h1>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '1.1rem', marginBottom: '32px' }}>
            PortShare is a tool for developers. We have a zero-tolerance policy for using our service to host phishing sites, malware, or any other malicious content.
          </p>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '24px', borderRadius: '12px', marginBottom: '32px' }}>
            <h2 style={{ color: '#ef4444', margin: '0 0 12px', fontSize: '1.2rem' }}>How to report a malicious tunnel</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
              If you have discovered a PortShare tunnel being used for malicious purposes, please email us immediately at <strong>abuse@kexoz.dev</strong>. Include the full URL of the offending tunnel. We monitor this inbox 24/7 and will instantly terminate the tunnel and permanently ban the user.
            </p>
          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
}
