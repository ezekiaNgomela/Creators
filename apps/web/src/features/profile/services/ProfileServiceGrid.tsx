import { profileServices } from "./catalog";
import type { ProfileService, ProfileServiceId } from "./types";

type ProfileServiceGridProps = {
  onOpenService: (serviceId: ProfileServiceId) => void;
  services?: readonly ProfileService[];
};

export function ProfileServiceGrid({
  onOpenService,
  services = profileServices,
}: ProfileServiceGridProps) {
  return (
    <section className="web-profile-tools web-profile-services" aria-label="Creator account services">
      {services.map((service) => {
        const Icon = service.icon;

        return (
          <button className={service.premium ? "premium" : ""} key={service.id} type="button" onClick={() => onOpenService(service.id)}>
            <span className="web-profile-service-icon">
              <Icon size={19} />
            </span>
            <span className="web-profile-service-copy">
              <strong>{service.label}</strong>
              <small>{service.helper}</small>
            </span>
          </button>
        );
      })}
    </section>
  );
}
