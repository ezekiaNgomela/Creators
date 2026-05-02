import type { LucideIcon } from "lucide-react";
import type { AuthUser, ProfileResponse } from "../../../api";
import type { DisplayPost } from "../../../shared/types";

export type ProfileServiceAction = "create" | "settings" | "share";

export type ProfileServiceId =
  | "grade"
  | "item-store"
  | "wallet"
  | "live-store"
  | "paid-content"
  | "mall"
  | "room-management";

export type ProfileService = {
  action: ProfileServiceAction;
  helper: string;
  icon: LucideIcon;
  id: ProfileServiceId;
  label: string;
  premium?: boolean;
};

export type ProfileServiceHandlers = {
  onCopyProfileLink: () => void;
  onOpenSettings: () => void;
  onStartCreating: () => void;
};

export type ProfileServicePageProps = ProfileServiceHandlers & {
  onBack: () => void;
  posts: DisplayPost[];
  profile: ProfileResponse | null;
  service: ProfileService;
  user: AuthUser;
};
