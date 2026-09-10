import SectionHeader from "../ui/SectionHeader";

export default function HowItWorks({ sampleSubdomain, publicDomain }: { sampleSubdomain: string, publicDomain: string }) {
  return (
    <>
      <SectionHeader 
        id="how-it-works"
        eyebrow="How it works"
        title="Up and running in 30 seconds"
        description="Three simple steps from install to public URL. No DNS wrangling, no YAML, no tears."
      />
      <section className="flow-grid">
        {[
          {
            step: "01",
            title: "Install & identify",
            body: "Download the desktop app or grab the CLI. On first launch, PortShare generates a unique client identity and stores it locally for future sessions.",
          },
          {
            step: "02",
            title: "Claim your subdomain",
            body: `Pick a memorable name — like ${sampleSubdomain}.${publicDomain}. It's yours permanently. No more broken webhook URLs when you restart.`,
          },
          {
            step: "03",
            title: "Expose any port",
            body: "Enter the local port your dev server is running on. Your app is now live at your public URL — copy it and share anywhere.",
          },
        ].map((card) => (
          <article key={card.step} className="flow-card">
            <span className="flow-step-badge">{card.step}</span>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </article>
        ))}
      </section>
    </>
  );
}
