import { ServiceListCard, ServiceMetricCard, ServicePageLayout, actionForService } from "../ServicePageLayout";
import type { ProfileServicePageProps } from "../types";

export function GradeServicePage(props: ProfileServicePageProps) {
  const likes = props.posts.reduce((total, post) => total + post.likes, 0);

  return (
    <ServicePageLayout
      heroLabel="Creator rank, account progress, and premium boosts"
      heroValue="Level 08"
      onBack={props.onBack}
      primaryAction={{ label: "Manage grade", onClick: actionForService(props.service.action, props) }}
      secondaryAction={{ label: "Open settings", onClick: props.onOpenSettings }}
      service={props.service}
      userName={props.user.name}
    >
      <div className="profile-service-grid">
        <ServiceMetricCard label="Profile posts" value={`${props.posts.length}`} />
        <ServiceMetricCard label="Total likes" value={`${likes}`} />
        <ServiceMetricCard label="Next rank" value="Ruby" />
      </div>
      <ServiceListCard title="Grade benefits" items={["Priority profile badge", "Boosted live discovery", "Premium room tools"]} />
    </ServicePageLayout>
  );
}
