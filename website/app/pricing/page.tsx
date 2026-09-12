'use client';
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import PricingCard from "../components/pricing/PricingCard";
import CheckoutForm from "../components/pricing/CheckoutForm";
import DownloadButton from "../components/download/DownloadButton";

export default function PricingPage() {
  return (
    <div className="landing-wrap">
      <div className="landing-frame">
        <Header />
        <main className="landing-main">
          <div className="landing-content">
            <section className="pricing-hero">
              <span className="eyebrow">Pricing</span>
              <h1>Simple plans</h1>
              <p>Start free. Upgrade when you need more.</p>
            </section>

            <section className="pricing-grid">
              <PricingCard
                title="Hobby"
                price="0"
                description="Local development and webhooks."
                features={[
                  "1 GB / month",
                  "Permanent subdomain",
                  "Request inspector"
                ]}
              >
                <DownloadButton className="btn btn-ghost" style={{ width: "100%" }}>
                  Download
                </DownloadButton>
              </PricingCard>

              <PricingCard
                title="Pro"
                price="12"
                description="Custom domains and higher limits."
                features={[
                  "100 GB / month",
                  "Custom domains",
                  "Google auth wall"
                ]}
                highlighted
              >
                <CheckoutForm />
              </PricingCard>
            </section>
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}
