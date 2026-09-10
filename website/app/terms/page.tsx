import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

export default function TermsPage() {
  return (
    <div className="landing-wrap">
      <main className="landing-main">
        <Header />
        <div style={{ maxWidth: '800px', margin: '80px auto', padding: '40px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '32px', color: 'var(--text)' }}>Terms of Service</h1>
          <div style={{ color: 'var(--text-muted)', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2 style={{ color: 'var(--text)', fontSize: '1.4rem', margin: '16px 0 0' }}>1. Acceptable Use</h2>
            <p>PortShare is designed exclusively for developers to expose their local web environments for testing, webhook delivery, and previewing work. You agree NOT to use PortShare to:</p>
            <ul style={{ paddingLeft: '24px' }}>
              <li>Host or distribute phishing sites, malware, viruses, or any malicious code.</li>
              <li>Host illegal, copyright-infringing, or highly regulated content.</li>
              <li>Attempt to bypass bandwidth limitations or abuse the free tier infrastructure.</li>
            </ul>

            <h2 style={{ color: 'var(--text)', fontSize: '1.4rem', margin: '16px 0 0' }}>2. Account Termination</h2>
            <p>We reserve the right to instantly terminate your access to PortShare and permanently ban your IP address and client identity without warning if we detect any violation of the Acceptable Use policy.</p>

            <h2 style={{ color: 'var(--text)', fontSize: '1.4rem', margin: '16px 0 0' }}>3. Disclaimer of Warranties</h2>
            <p>PortShare is provided "as is". While we strive for maximum uptime, we do not guarantee continuous availability. We are not responsible for any data loss, security breaches on your local machine, or damages resulting from the use of our service.</p>
          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
}
