import { BellRing } from "lucide-react";
import type { Notification } from "../../api";

export function NotificationDrawer({ notifications }: { notifications: Notification[] }) {
  return (
    <section className="notification-drawer" aria-label="Notifications">
      <div className="notification-drawer-head">
        <BellRing size={16} />
        <strong>Notifications</strong>
      </div>
      {notifications.length ? notifications.slice(0, 5).map((notification) => (
        <article key={notification.id}>
          <strong>{notification.title}</strong>
          <span>{notification.body}</span>
        </article>
      )) : <p>No notifications yet.</p>}
    </section>
  );
}
