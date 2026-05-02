import { BadgeCheck } from "lucide-react";
import type { ProfileService } from "../types";

export const paidContentService: ProfileService = {
  action: "create",
  helper: "Premium posts and unlocks",
  icon: BadgeCheck,
  id: "paid-content",
  label: "Paid content",
  premium: true,
};
