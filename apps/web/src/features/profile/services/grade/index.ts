import { Crown } from "lucide-react";
import type { ProfileService } from "../types";

export const gradeService: ProfileService = {
  action: "settings",
  helper: "Level, rewards, and creator rank",
  icon: Crown,
  id: "grade",
  label: "Grade",
  premium: true,
};
