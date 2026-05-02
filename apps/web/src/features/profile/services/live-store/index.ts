import { Radio } from "lucide-react";
import type { ProfileService } from "../types";

export const liveStoreService: ProfileService = {
  action: "create",
  helper: "Live offers and stream goods",
  icon: Radio,
  id: "live-store",
  label: "Live store",
};
