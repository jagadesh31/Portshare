import SectionHeader from "../ui/SectionHeader";
import FeatureCheck from "../ui/FeatureCheck";

const comparisonData = [
  { feature: "Permanent subdomains", portshare: "yes", ngrok: "yes", cloudflare: "yes" },
  { feature: "Custom domain (BYOD)", portshare: "yes", ngrok: "Paid only", cloudflare: "yes" },
  { feature: "Request inspector + replay", portshare: "yes", ngrok: "yes", cloudflare: "no" },
  { feature: "Desktop GUI client", portshare: "yes", ngrok: "no", cloudflare: "no" },
  { feature: "Zero-config setup", portshare: "yes", ngrok: "Partial", cloudflare: "Partial" },
  { feature: "Self-hostable", portshare: "yes", ngrok: "no", cloudflare: "no" },
  { feature: "Open source client", portshare: "yes", ngrok: "no", cloudflare: "no" },
  { feature: "Generous free tier", portshare: "yes", ngrok: "Limited", cloudflare: "Limited" },
];

export default function ComparisonTable() {
  return (
    <>
      <SectionHeader 
        id="compare"
        eyebrow="Compare"
        title="Why choose PortShare?"
        description="See how we stack up against the established alternatives."
      />
      <section className="comparison-section">
        <div className="table-container">
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="feature-col">Feature</th>
                <th className="portshare-col">PortShare</th>
                <th>ngrok</th>
                <th>Cloudflare</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row) => (
                <tr key={row.feature}>
                  <td className="feature-name">{row.feature}</td>
                  <td className="portshare-cell"><FeatureCheck value={row.portshare} /></td>
                  <td><FeatureCheck value={row.ngrok} /></td>
                  <td><FeatureCheck value={row.cloudflare} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
