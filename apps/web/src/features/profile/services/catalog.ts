import { gradeService } from "./grade";
import { itemStoreService } from "./item-store";
import { liveStoreService } from "./live-store";
import { mallService } from "./mall";
import { paidContentService } from "./paid-content";
import { roomManagementService } from "./room-management";
import type { ProfileService } from "./types";
import { walletService } from "./wallet";

export const profileServices = [
  gradeService,
  itemStoreService,
  walletService,
  liveStoreService,
  paidContentService,
  mallService,
  roomManagementService,
] satisfies ProfileService[];
