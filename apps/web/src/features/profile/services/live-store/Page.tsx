import { ServiceListCard, ServiceMetricCard, ServicePageLayout, actionForService } from "../ServicePageLayout";
import type { ProfileServicePageProps } from "../types";

export function LiveStoreServicePage(props: ProfileServicePageProps) {
  return (
    <ServicePageLayout
      heroLabel="Live offers, stream bundles, and room shopping moments"
      heroValue="Live-ready"
      onBack={props.onBack}
      primaryAction={{ label: "Prepare live drop", onClick: actionForService(props.service.action, props) }}
      secondaryAction={{ label: "Share profile", onClick: props.onCopyProfileLink }}
      service={props.service}
      userName={props.user.name}
    >
      <div className="profile-service-grid">
        <ServiceMetricCard label="Pinned offers" value="3" />
        <ServiceMetricCard label="Room slots" value="6" />
        <ServiceMetricCard label="Conversion" value="12%" />
      </div>
      <ServiceListCard title="Live setup" items={["Offer shelf", "Stream schedule", "Member-only deals"]} />
    </ServicePageLayout>
  );
}
