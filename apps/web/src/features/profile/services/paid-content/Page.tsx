import { ServiceListCard, ServiceMetricCard, ServicePageLayout, actionForService } from "../ServicePageLayout";
import type { ProfileServicePageProps } from "../types";

export function PaidContentServicePage(props: ProfileServicePageProps) {
  const premiumPosts = props.posts.filter((post) => post.tags.includes("premium") || post.promotionScore > 10);

  return (
    <ServicePageLayout
      heroLabel="Premium posts, unlockable media, and member-only access"
      heroValue={`${premiumPosts.length || 1} paid slots`}
      onBack={props.onBack}
      primaryAction={{ label: "Create paid post", onClick: actionForService(props.service.action, props) }}
      secondaryAction={{ label: "Manage access", onClick: props.onOpenSettings }}
      service={props.service}
      userName={props.user.name}
    >
      <div className="profile-service-grid">
        <ServiceMetricCard label="Subscribers" value="248" />
        <ServiceMetricCard label="Unlocks" value="1.2K" />
        <ServiceMetricCard label="Drafts" value={`${premiumPosts.length}`} />
      </div>
      <ServiceListCard title="Paid content" items={["Post unlock price", "Member preview", "Private gallery access"]} />
    </ServicePageLayout>
  );
}
