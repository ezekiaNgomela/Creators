import { BellRing, CheckCircle2, MessageSquareText, Radio } from "lucide-react";

const previewNotifications = [
  { body: "Your edited post is now visible on Home.", icon: CheckCircle2, title: "Post shared" },
  { body: "Gina started a member-only stream.", icon: Radio, title: "Live room" },
  { body: "New chat request from your collab room.", icon: MessageSquareText, title: "Chat" },
];

export function NotificationPreview() {
  return (
    <section className="notification-preview-block" aria-label="Notification feature preview">
      <header>
        <BellRing size={18} />
        <h3>Notifications</h3>
      </header>
      <div>
        {previewNotifications.map(({ body, icon: Icon, title }) => (
          <article key={title}>
            <Icon size={18} />
            <span>
              <strong>{title}</strong>
              <small>{body}</small>
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
