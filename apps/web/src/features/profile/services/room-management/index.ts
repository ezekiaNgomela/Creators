import { Palette } from "lucide-react";
import type { ProfileService } from "../types";

export const roomManagementService: ProfileService = {
  action: "settings",
  helper: "Rooms, access, and styling",
  icon: Palette,
  id: "room-management",
  label: "Room Management",
};
