import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

export default function PrivacyPage() {
  return (
    <div className="landing-wrap">
      <main className="landing-main">
        <Header />
        <div style={{ maxWidth: '800px', margin: '80px auto', padding: '40px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '32px', color: 'var(--text)' }}>Privacy Policy</h1>
          <div style={{ color: 'var(--text-muted)', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2 style={{ color: 'var(--text)', fontSize: '1.4rem', margin: '16px 0 0' }}>1. What we collect</h2>
            <p>To provide the PortShare service, we store:</p>
            <ul style={{ paddingLeft: '24px' }}>
              <li>Your anonymous Client ID.</li>
              <li>The subdomains and custom domains you have claimed.</li>
              <li>Basic bandwidth usage statistics to enforce plan limits.</li>
            </ul>

            <h2 style={{ color: 'var(--text)', fontSize: '1.4rem', margin: '16px 0 0' }}>2. What we DO NOT collect</h2>
            <p>We believe in absolute privacy for your development traffic:</p>
            <ul style={{ paddingLeft: '24px' }}>
              <li><strong>No Data Logging:</strong> We do not log, inspect, or store the contents of the HTTP requests or responses passing through your tunnels.</li>
              <li><strong>No Source Code:</strong> We do not have access to your local machine, your source code, or your files.</li>
            </ul>

            <h2 style={{ color: 'var(--text)', fontSize: '1.4rem', margin: '16px 0 0' }}>3. Third Parties</h2>
            <p>We do not sell or share your data with any third parties. If you upgrade to a paid plan, payment processing is handled securely by Stripe.</p>
          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
}
