import SectionHeader from '../ui/SectionHeader';
import FeatureCheck from '../ui/FeatureCheck';

const comparisonData = [
  { feature: 'Permanent subdomains',       portshare: 'yes',   ngrok: 'yes',      cloudflare: 'yes'     },
  { feature: 'Custom domain (BYOD)',        portshare: 'yes',   ngrok: 'Paid only', cloudflare: 'yes'    },
  { feature: 'Request inspector + replay', portshare: 'yes',   ngrok: 'yes',      cloudflare: 'no'      },
  { feature: 'Desktop GUI client',         portshare: 'yes',   ngrok: 'no',       cloudflare: 'no'      },
  { feature: 'Zero-install SSH tunnel',    portshare: 'yes',   ngrok: 'no',       cloudflare: 'no'      },
  { feature: 'Self-hostable',              portshare: 'yes',   ngrok: 'no',       cloudflare: 'no'      },
  { feature: 'Open source client',         portshare: 'yes',   ngrok: 'no',       cloudflare: 'no'      },
  { feature: 'Generous free tier',         portshare: 'yes',   ngrok: 'Limited',  cloudflare: 'Limited' },
  { feature: 'Google Auth wall',           portshare: 'yes',   ngrok: 'Paid only', cloudflare: 'no'     },
  { feature: 'Live request stats',         portshare: 'yes',   ngrok: 'yes',      cloudflare: 'no'      },
];

export default function ComparisonTable() {
  return (
    <section id="comparison-section">
      <SectionHeader
        id="compare"
        eyebrow="Compare"
        title="Why choose PortShare?"
        description="We built the features developers actually need. See how we compare to the alternatives."
      />
      <div style={{ marginTop: '40px' }}>
        <div className="table-container">
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="feature-col" style={{ width: '40%' }}>Feature</th>
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
      </div>
    </section>
  );
}
