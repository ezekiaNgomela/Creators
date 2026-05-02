import { ServiceListCard, ServiceMetricCard, ServicePageLayout, actionForService } from "../ServicePageLayout";
import type { ProfileServicePageProps } from "../types";

export function WalletServicePage(props: ProfileServicePageProps) {
  const estimate = props.posts.reduce((total, post) => total + post.promotionScore, 0) * 2;

  return (
    <ServicePageLayout
      heroLabel="Payouts, creator balance, billing, and account safety"
      heroValue={`$${estimate.toLocaleString()}`}
      onBack={props.onBack}
      primaryAction={{ label: "Manage wallet", onClick: actionForService(props.service.action, props) }}
      secondaryAction={{ label: "Open profile", onClick: props.onBack }}
      service={props.service}
      userName={props.user.name}
    >
      <div className="profile-service-grid">
        <ServiceMetricCard label="Available" value={`$${estimate.toLocaleString()}`} />
        <ServiceMetricCard label="Pending" value="$420" />
        <ServiceMetricCard label="Payout day" value="Fri" />
      </div>
      <ServiceListCard title="Wallet controls" items={["Payout method", "Billing profile", "Premium purchase history"]} />
    </ServicePageLayout>
  );
}
