import { BadgeCheck, Bell, Palette, ShieldCheck, UserCog } from "lucide-react";

const rows = [
  { label: "Profile details", value: "Ready", icon: UserCog },
  { label: "Theme sync", value: "Beautiful", icon: Palette },
  { label: "Notifications", value: "On", icon: Bell },
  { label: "Verification", value: "Open", icon: BadgeCheck },
  { label: "Privacy", value: "Protected", icon: ShieldCheck },
];

export function SettingsPreview() {
  return (
    <section className="settings-preview-block" aria-label="Settings feature preview">
      <header>
        <h3>Settings</h3>
        <button type="button">Save</button>
      </header>
      {rows.map(({ icon: Icon, label, value }) => (
        <article key={label}>
          <Icon size={18} />
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}
