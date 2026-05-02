import { ServiceListCard, ServiceMetricCard, ServicePageLayout, actionForService } from "../ServicePageLayout";
import type { ProfileServicePageProps } from "../types";

export function RoomManagementServicePage(props: ProfileServicePageProps) {
  return (
    <ServicePageLayout
      heroLabel="Room access, live chat permissions, and creator room styling"
      heroValue="3 rooms"
      onBack={props.onBack}
      primaryAction={{ label: "Manage rooms", onClick: actionForService(props.service.action, props) }}
      secondaryAction={{ label: "Create room post", onClick: props.onStartCreating }}
      service={props.service}
      userName={props.user.name}
    >
      <div className="profile-service-grid">
        <ServiceMetricCard label="Open rooms" value="3" />
        <ServiceMetricCard label="Members" value="940" />
        <ServiceMetricCard label="Moderation" value="On" />
      </div>
      <ServiceListCard title="Room controls" items={["Member access", "Room theme", "Live chat safety"]} />
    </ServicePageLayout>
  );
}
