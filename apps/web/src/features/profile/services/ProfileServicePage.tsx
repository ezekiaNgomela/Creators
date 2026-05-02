import { gradeService } from "./grade";
import { GradeServicePage } from "./grade/Page";
import { itemStoreService } from "./item-store";
import { ItemStoreServicePage } from "./item-store/Page";
import { liveStoreService } from "./live-store";
import { LiveStoreServicePage } from "./live-store/Page";
import { mallService } from "./mall";
import { MallServicePage } from "./mall/Page";
import { paidContentService } from "./paid-content";
import { PaidContentServicePage } from "./paid-content/Page";
import { roomManagementService } from "./room-management";
import { RoomManagementServicePage } from "./room-management/Page";
import type { ProfileServiceId, ProfileServicePageProps } from "./types";
import { walletService } from "./wallet";
import { WalletServicePage } from "./wallet/Page";

const pageByService = {
  [gradeService.id]: GradeServicePage,
  [itemStoreService.id]: ItemStoreServicePage,
  [walletService.id]: WalletServicePage,
  [liveStoreService.id]: LiveStoreServicePage,
  [paidContentService.id]: PaidContentServicePage,
  [mallService.id]: MallServicePage,
  [roomManagementService.id]: RoomManagementServicePage,
};

const serviceById = {
  [gradeService.id]: gradeService,
  [itemStoreService.id]: itemStoreService,
  [walletService.id]: walletService,
  [liveStoreService.id]: liveStoreService,
  [paidContentService.id]: paidContentService,
  [mallService.id]: mallService,
  [roomManagementService.id]: roomManagementService,
};

export function ProfileServicePage({
  serviceId,
  ...props
}: Omit<ProfileServicePageProps, "service"> & {
  serviceId: ProfileServiceId;
}) {
  const service = serviceById[serviceId];
  const Page = pageByService[serviceId];

  return <Page {...props} service={service} />;
}
