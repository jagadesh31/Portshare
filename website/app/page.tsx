'use client';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HeroSection from './components/home/HeroSection';
import HowItWorks from './components/home/HowItWorks';
import FeaturesGrid from './components/home/FeaturesGrid';
import ComparisonTable from './components/home/ComparisonTable';
import LiveStatsSection from './components/home/LiveStatsSection';
import CTASection from './components/home/CTASection';

const requiredPublicEnv = (value: string | undefined, name: string): string => {
  if (!value?.trim()) throw new Error(`Missing required environment variable: ${name}`);
  return value.trim();
};

export default function Home() {
  const publicDomain = requiredPublicEnv(process.env.NEXT_PUBLIC_PORTSHARE_DOMAIN, 'NEXT_PUBLIC_PORTSHARE_DOMAIN');
  requiredPublicEnv(process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL, 'NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL');
  const sampleSubdomain = requiredPublicEnv(process.env.NEXT_PUBLIC_SAMPLE_SUBDOMAIN, 'NEXT_PUBLIC_SAMPLE_SUBDOMAIN');
  const samplePort = requiredPublicEnv(process.env.NEXT_PUBLIC_SAMPLE_PORT, 'NEXT_PUBLIC_SAMPLE_PORT');

  return (
    <div className="landing-wrap">
      <main className="landing-main">
        <Header />
        <HeroSection
          publicDomain={publicDomain}
          sampleSubdomain={sampleSubdomain}
          samplePort={samplePort}
          totalRequests={1284931}
        />
        <HowItWorks sampleSubdomain={sampleSubdomain} publicDomain={publicDomain} />
        <FeaturesGrid publicDomain={publicDomain} />
        <LiveStatsSection />
        <ComparisonTable />
        <CTASection />
        <Footer />
      </main>
    </div>
  );
}
