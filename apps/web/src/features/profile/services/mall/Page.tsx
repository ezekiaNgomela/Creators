import { ServiceListCard, ServiceMetricCard, ServicePageLayout, actionForService } from "../ServicePageLayout";
import type { ProfileServicePageProps } from "../types";

export function MallServicePage(props: ProfileServicePageProps) {
  const handle = `@${props.user.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;

  return (
    <ServicePageLayout
      heroLabel={`${handle} shop, profile, and public share hub`}
      heroValue="Mall link"
      onBack={props.onBack}
      primaryAction={{ label: "Copy mall link", onClick: actionForService(props.service.action, props) }}
      secondaryAction={{ label: "Create post", onClick: props.onStartCreating }}
      service={props.service}
      userName={props.user.name}
    >
      <div className="profile-service-grid">
        <ServiceMetricCard label="Linked posts" value={`${props.posts.length}`} />
        <ServiceMetricCard label="Clicks" value="4.7K" />
        <ServiceMetricCard label="Shares" value="86" />
      </div>
      <ServiceListCard title="Mall sections" items={["Profile storefront", "Featured posts", "Creator collections"]} />
    </ServicePageLayout>
  );
}
