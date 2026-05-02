import { ServiceListCard, ServiceMetricCard, ServicePageLayout, actionForService } from "../ServicePageLayout";
import type { ProfileServicePageProps } from "../types";

export function ItemStoreServicePage(props: ProfileServicePageProps) {
  const drops = props.posts.slice(0, 4);

  return (
    <ServicePageLayout
      heroLabel="Product drops connected to posts, rooms, and profile links"
      heroValue={`${Math.max(drops.length, 1)} active drops`}
      onBack={props.onBack}
      primaryAction={{ label: "Create item", onClick: actionForService(props.service.action, props) }}
      secondaryAction={{ label: "Copy shop link", onClick: props.onCopyProfileLink }}
      service={props.service}
      userName={props.user.name}
    >
      <div className="profile-service-gallery">
        {drops.length ? drops.map((post) => (
          <article key={post.id}>
            {post.gallery[0] ? <img alt="" src={post.gallery[0]} /> : <span>{post.mood}</span>}
            <strong>{post.mood}</strong>
          </article>
        )) : <article><span>Store</span><strong>First item</strong></article>}
      </div>
      <ServiceListCard title="Store flow" items={["Attach products to posts", "Share item links", "Feature items in live rooms"]} />
    </ServicePageLayout>
  );
}
