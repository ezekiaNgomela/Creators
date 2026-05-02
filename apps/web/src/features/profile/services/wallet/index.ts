import { WalletCards } from "lucide-react";
import type { ProfileService } from "../types";

export const walletService: ProfileService = {
  action: "settings",
  helper: "Balance, payouts, and billing",
  icon: WalletCards,
  id: "wallet",
  label: "Wallet",
};
