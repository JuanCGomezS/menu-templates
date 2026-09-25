import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { ROLE_LABELS, ROLE_VALUES, ROLES } from "../../config/app-constants.js";

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && ROLE_VALUES.includes(value as UserRole);
}

export interface AppUserProfile {
  uid: string;
  email: string;
  role: UserRole;
  storeId?: string;
  storeSlug?: string;
}

const profileRequests = new Map<string, Promise<AppUserProfile | null>>();
const profileCache = new Map<string, AppUserProfile | null>();
const PROFILE_CACHE_PREFIX = 'menu-templates:auth-profile:';
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

type PersistedProfile = { expiresAt: number; profile: AppUserProfile | null };

function getPersistedProfile(uid: string): AppUserProfile | null | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const cached = window.sessionStorage.getItem(`${PROFILE_CACHE_PREFIX}${uid}`);
    if (!cached) return undefined;
    const entry = JSON.parse(cached) as PersistedProfile;
    if (entry.expiresAt > Date.now()) return entry.profile;
    window.sessionStorage.removeItem(`${PROFILE_CACHE_PREFIX}${uid}`);
  } catch { /* A blocked storage API only disables this optimization. */ }
  return undefined;
}

function persistProfile(uid: string, profile: AppUserProfile | null) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(`${PROFILE_CACHE_PREFIX}${uid}`, JSON.stringify({ profile, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS } satisfies PersistedProfile));
  } catch { /* A blocked storage API only disables this optimization. */ }
}

export async function getUserProfile(user: User): Promise<AppUserProfile | null> {
  if (profileCache.has(user.uid)) return profileCache.get(user.uid) || null;
  const persisted = getPersistedProfile(user.uid);
  if (persisted !== undefined) {
    profileCache.set(user.uid, persisted);
    return persisted;
  }
  const existingRequest = profileRequests.get(user.uid);
  if (existingRequest) return existingRequest;

  const request = fetchUserProfile(user).then((profile) => {
    profileCache.set(user.uid, profile);
    persistProfile(user.uid, profile);
    return profile;
  }).finally(() => profileRequests.delete(user.uid));
  profileRequests.set(user.uid, request);
  return request;
}

export function clearUserProfileCache(uid?: string) {
  if (uid) {
    profileCache.delete(uid);
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(`${PROFILE_CACHE_PREFIX}${uid}`);
    return;
  }
  profileCache.clear();
  if (typeof window !== 'undefined') Object.keys(window.sessionStorage).filter((key) => key.startsWith(PROFILE_CACHE_PREFIX)).forEach((key) => window.sessionStorage.removeItem(key));
}

async function fetchUserProfile(user: User): Promise<AppUserProfile | null> {
  const snapshot = await getDoc(doc(db, "users", user.uid));

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  const role = data.role;

  if (!isUserRole(role)) {
    return null;
  }

  return {
    uid: user.uid,
    email: data.email || user.email || "",
    role,
    storeId: data.storeId,
    storeSlug: data.storeSlug,
  };
}

export { ROLE_LABELS, ROLES };
