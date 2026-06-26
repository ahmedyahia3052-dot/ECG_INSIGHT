import { analyzeCase } from "./ai";
import { createCase, createPatient } from "./clinical";
import { uploadClinicalEcgFile } from "./ecgFiles";
import type { EcgAcquisitionAsset } from "./ecgImageProcessor";

const DB_NAME = "ecg-insight-mobile-v30";
const DB_VERSION = 1;
const ACTION_STORE = "pendingActions";
const UPLOAD_STORE = "offlineUploads";
const PATIENT_STORE = "patientCache";
const META_STORE = "meta";

export type SyncStatus = "conflict" | "failed" | "pending" | "syncing" | "synced";

export interface PendingAction {
  attempts: number;
  conflictReason?: string;
  createdAt: string;
  entityId?: string;
  entityType: string;
  id: string;
  lastError?: string;
  operation: string;
  payload: Record<string, unknown>;
  status: SyncStatus;
  updatedAt: string;
}

export interface OfflineEcgUpload {
  asset: EcgAcquisitionAsset;
  attempts: number;
  clinicalNotes?: string;
  createdAt: string;
  dateOfBirth: string;
  gender: "female" | "male" | "other" | "unknown";
  id: string;
  lastError?: string;
  medicalRecordNumber: string;
  patientName: string;
  priority: "critical" | "high" | "low" | "medium";
  status: SyncStatus;
  updatedAt: string;
}

export interface MobileSyncSnapshot {
  isOnline: boolean;
  lastSyncAt?: string;
  pendingActions: number;
  pendingUploads: number;
  serviceWorkerReady: boolean;
}

type StoreName = typeof ACTION_STORE | typeof META_STORE | typeof PATIENT_STORE | typeof UPLOAD_STORE;

const memoryStores = new Map<StoreName, Map<string, unknown>>([
  [ACTION_STORE, new Map()],
  [UPLOAD_STORE, new Map()],
  [PATIENT_STORE, new Map()],
  [META_STORE, new Map()],
]);

function isWebIndexedDbAvailable() {
  return typeof indexedDB !== "undefined";
}

function randomId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function openDatabase() {
  if (!isWebIndexedDbAvailable()) return Promise.resolve(null);
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Unable to open ECG Insight offline database."));
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of [ACTION_STORE, UPLOAD_STORE, PATIENT_STORE, META_STORE]) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(storeName: StoreName, mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDatabase();
  if (!db) return null;
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = callback(transaction.objectStore(storeName));
    request.onerror = () => reject(request.error ?? new Error("Offline database operation failed."));
    request.onsuccess = () => resolve(request.result);
    transaction.oncomplete = () => db.close();
  });
}

async function putRecord<T extends { id: string }>(storeName: StoreName, record: T) {
  const result = await withStore(storeName, "readwrite", (store) => store.put(record));
  if (result === null) memoryStores.get(storeName)?.set(record.id, record);
  return record;
}

async function getAllRecords<T>(storeName: StoreName) {
  const result = await withStore<T[]>(storeName, "readonly", (store) => store.getAll() as IDBRequest<T[]>);
  if (result === null) return [...(memoryStores.get(storeName)?.values() ?? [])] as T[];
  return result;
}

async function deleteRecord(storeName: StoreName, id: string) {
  const result = await withStore(storeName, "readwrite", (store) => store.delete(id));
  if (result === null) memoryStores.get(storeName)?.delete(id);
}

export function networkIsOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

export function subscribeNetworkStatus(callback: (isOnline: boolean) => void) {
  if (typeof window === "undefined") return () => undefined;
  const emit = () => callback(networkIsOnline());
  window.addEventListener("online", emit);
  window.addEventListener("offline", emit);
  emit();
  return () => {
    window.removeEventListener("online", emit);
    window.removeEventListener("offline", emit);
  };
}

export async function registerPwaRuntime(onUpdate?: () => void) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return { ready: false };
  const registration = await navigator.serviceWorker.register("/sw.js");
  registration.addEventListener("updatefound", () => onUpdate?.());
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "ECG_BACKGROUND_SYNC") {
      window.dispatchEvent(new CustomEvent("ecg-insight-background-sync"));
    }
  });
  return { ready: true, registration };
}

export async function requestBackgroundSync() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.ready;
  const syncRegistration = registration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } };
  if (!syncRegistration.sync) return false;
  await syncRegistration.sync.register("ecg-insight-background-sync");
  return true;
}

export async function queuePendingAction(input: Omit<PendingAction, "attempts" | "createdAt" | "id" | "status" | "updatedAt">) {
  const now = new Date().toISOString();
  const action: PendingAction = {
    ...input,
    attempts: 0,
    createdAt: now,
    id: randomId("action"),
    status: "pending",
    updatedAt: now,
  };
  await putRecord(ACTION_STORE, action);
  await requestBackgroundSync().catch(() => false);
  return action;
}

export async function queueOfflineEcgUpload(input: Omit<OfflineEcgUpload, "attempts" | "createdAt" | "id" | "status" | "updatedAt">) {
  const now = new Date().toISOString();
  const upload: OfflineEcgUpload = {
    ...input,
    attempts: 0,
    createdAt: now,
    id: randomId("ecg-upload"),
    status: "pending",
    updatedAt: now,
  };
  await putRecord(UPLOAD_STORE, upload);
  await requestBackgroundSync().catch(() => false);
  return upload;
}

export async function cachePatientSnapshot(key: string, value: unknown) {
  return putRecord(PATIENT_STORE, { id: key, savedAt: new Date().toISOString(), value });
}

export async function listPendingActions() {
  return getAllRecords<PendingAction>(ACTION_STORE);
}

export async function listOfflineUploads() {
  return getAllRecords<OfflineEcgUpload>(UPLOAD_STORE);
}

export async function processPendingActions(accessToken: string) {
  const actions = await listPendingActions();
  const completed: PendingAction[] = [];
  for (const action of actions.filter((item) => item.status !== "synced")) {
    const next: PendingAction = { ...action, attempts: action.attempts + 1, status: "syncing", updatedAt: new Date().toISOString() };
    await putRecord(ACTION_STORE, next);
    try {
      if (next.payload["clientVersion"] && next.payload["serverVersion"] && next.payload["clientVersion"] !== next.payload["serverVersion"]) {
        await putRecord(ACTION_STORE, { ...next, conflictReason: "Client and server versions differ.", status: "conflict", updatedAt: new Date().toISOString() });
        continue;
      }
      await fetch("/api/sync/queue", {
        body: JSON.stringify({
          entityId: next.entityId,
          entityType: next.entityType,
          operation: next.operation,
          payloadJson: next.payload,
        }),
        headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
        method: "POST",
      });
      await deleteRecord(ACTION_STORE, next.id);
      completed.push({ ...next, status: "synced" });
    } catch (error) {
      await putRecord(ACTION_STORE, {
        ...next,
        lastError: error instanceof Error ? error.message : "Sync failed.",
        status: next.attempts >= 4 ? "failed" : "pending",
        updatedAt: new Date().toISOString(),
      });
    }
  }
  return completed;
}

export async function processOfflineUploads(accessToken: string) {
  const uploads = await listOfflineUploads();
  const completed: OfflineEcgUpload[] = [];
  for (const upload of uploads.filter((item) => item.status !== "synced")) {
    const next: OfflineEcgUpload = { ...upload, attempts: upload.attempts + 1, status: "syncing", updatedAt: new Date().toISOString() };
    await putRecord(UPLOAD_STORE, next);
    try {
      const [firstName, ...rest] = next.patientName.trim().split(/\s+/);
      const patient = await createPatient(accessToken, {
        dateOfBirth: next.dateOfBirth,
        firstName: firstName || "Offline",
        gender: next.gender,
        lastName: rest.join(" ") || "Patient",
        medicalRecordNumber: next.medicalRecordNumber,
      });
      const ecgCase = await createCase(accessToken, {
        ecgType: "12-Lead ECG",
        patientId: patient.patient.id,
        priority: next.priority,
      });
      const formData = new FormData();
      formData.append("patientId", patient.patient.id);
      formData.append("caseId", ecgCase.case.id);
      formData.append("file", next.asset.file ?? ({ name: next.asset.name, type: next.asset.mimeType, uri: next.asset.uri } as unknown as Blob));
      await uploadClinicalEcgFile(accessToken, formData);
      await analyzeCase(accessToken, ecgCase.case.id);
      await deleteRecord(UPLOAD_STORE, next.id);
      completed.push({ ...next, status: "synced" });
    } catch (error) {
      await putRecord(UPLOAD_STORE, {
        ...next,
        lastError: error instanceof Error ? error.message : "Upload sync failed.",
        status: next.attempts >= 4 ? "failed" : "pending",
        updatedAt: new Date().toISOString(),
      });
    }
  }
  return completed;
}

export async function syncNow(accessToken: string) {
  if (!networkIsOnline()) return { actions: [], uploads: [] };
  const [actions, uploads] = await Promise.all([processPendingActions(accessToken), processOfflineUploads(accessToken)]);
  await putRecord(META_STORE, { id: "lastSyncAt", value: new Date().toISOString() });
  return { actions, uploads };
}

export async function mobileSyncSnapshot(): Promise<MobileSyncSnapshot> {
  const [actions, uploads, meta] = await Promise.all([
    listPendingActions(),
    listOfflineUploads(),
    getAllRecords<{ id: string; value: string }>(META_STORE),
  ]);
  return {
    isOnline: networkIsOnline(),
    lastSyncAt: meta.find((item) => item.id === "lastSyncAt")?.value,
    pendingActions: actions.filter((item) => item.status !== "synced").length,
    pendingUploads: uploads.filter((item) => item.status !== "synced").length,
    serviceWorkerReady: typeof navigator !== "undefined" && "serviceWorker" in navigator,
  };
}
