'use client';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HeroSection from './components/home/HeroSection';
import HowItWorks from './components/home/HowItWorks';
import ProductPreview from './components/home/ProductPreview';
import ComparisonTable from './components/home/ComparisonTable';
import SmoothScroll from './components/motion/SmoothScroll';
import ParticlesField from './components/motion/ParticlesField';

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
    <SmoothScroll>
      <div className="landing-wrap">
        <ParticlesField />
        <div className="landing-frame">
          <Header />
          <main className="landing-main">
            <div className="shell">
              <HeroSection
                publicDomain={publicDomain}
                sampleSubdomain={sampleSubdomain}
                samplePort={samplePort}
              />
              <HowItWorks sampleSubdomain={sampleSubdomain} publicDomain={publicDomain} />
            </div>
            <ProductPreview
              publicDomain={publicDomain}
              sampleSubdomain={sampleSubdomain}
              samplePort={samplePort}
            />
            <div className="shell">
              <ComparisonTable />
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </SmoothScroll>
  );
}
