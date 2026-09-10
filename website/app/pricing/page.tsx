'use client';
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SectionHeader from "../components/ui/SectionHeader";
import PricingCard from "../components/pricing/PricingCard";
import CheckoutForm from "../components/pricing/CheckoutForm";

export default function PricingPage() {
  return (
    <div className="landing-wrap">
      <main className="landing-main" style={{ paddingTop: "80px" }}>
        
        <Header style={{ marginBottom: "60px" }} />

        <SectionHeader 
          title="Simple, transparent pricing" 
          description="Start for free, upgrade when you need more bandwidth and power."
        />

        <section className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", maxWidth: "900px", margin: "0 auto" }}>
          
          <PricingCard
            title="Hobby"
            price="0"
            description="Perfect for local development and occasional webhooks."
            features={[
              "1 GB Bandwidth / month",
              "Permanent subdomain",
              "Request Inspector"
            ]}
          >
            <a href="/download/portshare-desktop" className="btn btn-ghost" style={{ width: "100%" }}>Download Free</a>
          </PricingCard>

          <PricingCard
            title="Pro"
            price="12"
            description="For professionals who need reliability and branded domains."
            features={[
              "100 GB Bandwidth / month",
              "Custom Domains (BYOD)",
              "Google Auth Wall Protection"
            ]}
            highlighted={true}
          >
            <CheckoutForm />
          </PricingCard>

        </section>

      </main>
      <Footer />
    </div>
  );
}
