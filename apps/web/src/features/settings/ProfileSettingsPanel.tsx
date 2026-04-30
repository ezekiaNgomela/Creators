import { FormEvent, useEffect, useState } from "react";
import Crop169Rounded from "@mui/icons-material/Crop169Rounded";
import ImageRounded from "@mui/icons-material/ImageRounded";
import type { AuthUser, ProfileResponse } from "../../api";
import { firstName } from "../../shared/helpers";
import { themeOptions } from "../../shared/theme";
import type { ThemeName } from "../../shared/types";

export function ProfileSettingsPanel({
  onBack,
  onLogout,
  onSaveProfile,
  onThemeChange,
  onUploadMedia,
  profile,
  theme,
  themes,
  user,
}: {
  onBack: () => void;
  onLogout: () => void;
  onSaveProfile: (input: { name: string; bio: string; headline: string; location: string; avatarUrl?: string; coverUrl?: string; websiteUrl?: string }) => Promise<void>;
  onThemeChange: (theme: ThemeName) => void;
  onUploadMedia: (file: File) => Promise<{ url: string; mediaType: "image" | "video" | string }>;
  profile: ProfileResponse | null;
  theme: ThemeName;
  themes: typeof themeOptions;
  user: AuthUser;
}) {
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? user.avatarUrl ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [coverUrl, setCoverUrl] = useState(profile?.coverUrl ?? "");
  const [headline, setHeadline] = useState(profile?.headline ?? "Creator");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [uploadingProfileMedia, setUploadingProfileMedia] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState(profile?.websiteUrl ?? "");

  useEffect(() => {
    setName(user.name);
    setAvatarUrl(profile?.avatarUrl ?? user.avatarUrl ?? "");
    setBio(profile?.bio ?? "");
    setCoverUrl(profile?.coverUrl ?? "");
    setHeadline(profile?.headline ?? "Creator");
    setLocation(profile?.location ?? "");
    setWebsiteUrl(profile?.websiteUrl ?? "");
  }, [profile?.avatarUrl, profile?.bio, profile?.coverUrl, profile?.headline, profile?.location, profile?.websiteUrl, user.avatarUrl, user.name]);

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSaveProfile({ name, bio, headline, location, avatarUrl, coverUrl, websiteUrl });
      onBack();
    } finally {
      setSaving(false);
    }
  }

  async function uploadProfileMedia(file: File | null, target: "avatar" | "cover") {
    if (!file) {
      return;
    }
    setUploadingProfileMedia(true);
    try {
      const upload = await onUploadMedia(file);
      if (target === "avatar") {
        setAvatarUrl(upload.url);
      } else {
        setCoverUrl(upload.url);
      }
    } finally {
      setUploadingProfileMedia(false);
    }
  }

  return (
    <section className="settings-screen">
      <header className="settings-topbar">
        <button className="round-icon" type="button" onClick={onBack} aria-label="Back to profile">x</button>
        <strong>Settings</strong>
        <button className="settings-save" form="profile-settings-form" type="submit" disabled={saving}>
          {saving ? "Saving" : "Save"}
        </button>
      </header>

      <div className="settings-profile-card">
        <div className="settings-cover-preview">
          {coverUrl ? <img alt="" src={coverUrl} /> : <span />}
        </div>
        <div className="settings-profile-inline">
          {avatarUrl ? <img alt="" src={avatarUrl} /> : <strong>{firstName(user.name).slice(0, 1)}</strong>}
          <span>
            <h1>{user.name}</h1>
            <p>{user.email}</p>
          </span>
          <button type="button" onClick={onBack}>View</button>
        </div>
      </div>

      <form id="profile-settings-form" className="settings-form" onSubmit={(event) => void submitProfile(event)}>
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Headline<input value={headline} onChange={(event) => setHeadline(event.target.value)} /></label>
        <label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
        <label>Website<input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://your-site.com" /></label>
        <label>Bio<textarea value={bio} onChange={(event) => setBio(event.target.value)} /></label>
        <div className="profile-media-actions">
          <label>
            <ImageRounded fontSize="small" />
            Avatar
            <input accept="image/*" type="file" onChange={(event) => void uploadProfileMedia(event.target.files?.[0] ?? null, "avatar")} />
          </label>
          <label>
            <Crop169Rounded fontSize="small" />
            Cover
            <input accept="image/*" type="file" onChange={(event) => void uploadProfileMedia(event.target.files?.[0] ?? null, "cover")} />
          </label>
          {uploadingProfileMedia ? <span>Uploading...</span> : null}
        </div>
      </form>

      <div className="settings-list">
        <button type="button" onClick={onBack}><span>My Profile</span><strong>View</strong></button>
        <button type="button" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/?profile=${user.id}`)}><span>Share Profile</span><strong>Copy</strong></button>
        <button type="button" onClick={() => onThemeChange(theme)}><span>Activity Sync</span><strong>On</strong></button>
      </div>

      <section className="settings-card">
        <div className="theme-section-head">
          <h2>Theme</h2>
          <p>Pick the look for your web and app view.</p>
        </div>
        <div className="theme-options" aria-label="Theme options">
          {themes.map((option) => (
            <label className={option.id === theme ? "theme-option active" : "theme-option"} key={option.id}>
              <input
                checked={option.id === theme}
                name="app-theme"
                type="radio"
                onChange={() => onThemeChange(option.id)}
              />
              <span className="theme-radio" aria-hidden="true">
                <i />
              </span>
              <span className="theme-swatches" aria-hidden="true">
                {option.swatches.map((swatch) => (
                  <i key={swatch} style={{ background: swatch }} />
                ))}
              </span>
              <span className="theme-copy">
                <strong>{option.label}</strong>
                <small>{option.caption}</small>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="settings-card">
        <h2>Notifications</h2>
        <div className="setting-toggle"><span>New followers</span><i /></div>
        <div className="setting-toggle"><span>Creator drops</span><i /></div>
        <div className="setting-toggle"><span>Marketing team</span><i /></div>
      </section>

      <button className="logout-link danger" type="button" onClick={onLogout}>Log out</button>
    </section>
  );
}
