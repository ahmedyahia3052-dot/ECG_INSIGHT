import { apiRequest } from "@/services/api";
import { listNotifications } from "@/services/collaboration";
import { getDigitalECG } from "@/services/ecgProcessing";
import { getEnterpriseClinicalDashboard } from "@/services/enterpriseClinical";
import { getMySubscription, grantOwnerLicense, listLicenses, updateOwnerLicense } from "@/services/subscriptions";

export type UserDirectoryEntry = {
  email: string;
  id: string;
  name: string;
  username?: string;
};

export class UsersDomainService {
  listDirectory(accessToken: string) {
    return apiRequest<{ users: UserDirectoryEntry[] }>("/users", { accessToken });
  }
}

export class CollaborationDomainService {
  listDashboardNotifications(accessToken: string) {
    return listNotifications(accessToken, new URLSearchParams({ pageSize: "8" }));
  }
}

export class EnterpriseDomainService {
  getClinicalDashboard(accessToken: string) {
    return getEnterpriseClinicalDashboard(accessToken);
  }

  getMySubscription(accessToken: string) {
    return getMySubscription(accessToken);
  }
}

export class EcgProcessingDomainService {
  getDigitalEcg(accessToken: string, caseId: string) {
    return getDigitalECG(accessToken, caseId);
  }
}

export class OwnerLicensesDomainService {
  listLicenses(accessToken: string) {
    return listLicenses(accessToken);
  }

  grantLicense(accessToken: string, payload: Parameters<typeof grantOwnerLicense>[1]) {
    return grantOwnerLicense(accessToken, payload);
  }

  updateLicense(accessToken: string, licenseId: string, payload: Parameters<typeof updateOwnerLicense>[2]) {
    return updateOwnerLicense(accessToken, licenseId, payload);
  }
}

export const usersDomainService = new UsersDomainService();
export const collaborationDomainService = new CollaborationDomainService();
export const enterpriseDomainService = new EnterpriseDomainService();
export const ecgProcessingDomainService = new EcgProcessingDomainService();
export const ownerLicensesDomainService = new OwnerLicensesDomainService();
