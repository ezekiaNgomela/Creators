import { ArrowLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { firstName } from "../../../shared/helpers";
import type { ProfileService, ProfileServiceHandlers } from "./types";

type ServiceAction = {
  label: string;
  onClick: () => void;
};

export function ServicePageLayout({
  children,
  heroLabel,
  heroValue,
  onBack,
  primaryAction,
  secondaryAction,
  service,
  userName,
}: {
  children: ReactNode;
  heroLabel: string;
  heroValue: string;
  onBack: () => void;
  primaryAction: ServiceAction;
  secondaryAction?: ServiceAction;
  service: ProfileService;
  userName: string;
}) {
  const Icon = service.icon;

  return (
    <section className="profile-service-page" aria-label={`${service.label} service`}>
      <header className="profile-service-header">
        <button type="button" onClick={onBack} aria-label="Back to profile">
          <ArrowLeft size={18} />
        </button>
        <div className="profile-service-title">
          <span>
            <Icon size={18} />
          </span>
          <strong>{service.label}</strong>
        </div>
        {service.premium ? <i>Premium</i> : null}
      </header>

      <section className="profile-service-hero">
        <div>
          <small>{firstName(userName)} workspace</small>
          <h1>{heroValue}</h1>
          <p>{heroLabel}</p>
        </div>
        <span className="profile-service-hero-icon">
          <Icon size={30} />
        </span>
      </section>

      <div className="profile-service-actions">
        <button type="button" onClick={primaryAction.onClick}>
          {primaryAction.label}
          <ChevronRight size={16} />
        </button>
        {secondaryAction ? <button type="button" onClick={secondaryAction.onClick}>{secondaryAction.label}</button> : null}
      </div>

      {children}
    </section>
  );
}

export function ServiceMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="profile-service-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

export function ServiceListCard({ items, title }: { items: string[]; title: string }) {
  return (
    <article className="profile-service-list">
      <h2>{title}</h2>
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </article>
  );
}

export function actionForService(action: ProfileService["action"], handlers: ProfileServiceHandlers) {
  if (action === "settings") {
    return handlers.onOpenSettings;
  }

  if (action === "share") {
    return handlers.onCopyProfileLink;
  }

  return handlers.onStartCreating;
}
