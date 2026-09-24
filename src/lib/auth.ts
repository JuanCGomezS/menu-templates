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

interface CachedUserProfile extends AppUserProfile {
  cachedAt: number;
  expiresAt: number;
}

const AUTH_SESSION_CACHE_PREFIX = "menu-templates:v1:auth-session:";
const AUTH_SESSION_CACHE_TTL_MS = 60 * 60 * 1000;
const profileRequests = new Map<string, Promise<AppUserProfile | null>>();

function getSessionStorage() {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getProfileCacheKey(uid: string) {
  return `${AUTH_SESSION_CACHE_PREFIX}${uid}`;
}

function isCachedUserProfile(value: unknown, uid: string): value is CachedUserProfile {
  if (!value || typeof value !== "object") return false;

  const profile = value as Partial<CachedUserProfile>;

  return profile.uid === uid
    && typeof profile.email === "string"
    && isUserRole(profile.role)
    && typeof profile.cachedAt === "number"
    && typeof profile.expiresAt === "number"
    && (profile.storeId === undefined || typeof profile.storeId === "string")
    && (profile.storeSlug === undefined || typeof profile.storeSlug === "string");
}

export function getCachedUserProfile(user: User): AppUserProfile | null {
  const storage = getSessionStorage();
  if (!storage) return null;

  const key = getProfileCacheKey(user.uid);

  try {
    const cached = storage.getItem(key);
    if (!cached) return null;

    const profile = JSON.parse(cached);
    if (!isCachedUserProfile(profile, user.uid) || profile.expiresAt <= Date.now()) {
      storage.removeItem(key);
      return null;
    }

    const { cachedAt: _cachedAt, expiresAt: _expiresAt, ...userProfile } = profile;
    return userProfile;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function primeUserProfile(profile: AppUserProfile) {
  const storage = getSessionStorage();
  if (!storage) return;

  const cachedAt = Date.now();

  try {
    storage.setItem(getProfileCacheKey(profile.uid), JSON.stringify({
      ...profile,
      cachedAt,
      expiresAt: cachedAt + AUTH_SESSION_CACHE_TTL_MS,
    } satisfies CachedUserProfile));
  } catch {
    // Profile reads remain functional when browser storage is unavailable.
  }
}

export function clearUserProfileCache(uid?: string) {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    if (uid) {
      storage.removeItem(getProfileCacheKey(uid));
      return;
    }

    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key?.startsWith(AUTH_SESSION_CACHE_PREFIX)) {
        storage.removeItem(key);
      }
    }
  } catch {
    // Cache cleanup is best-effort when browser storage becomes unavailable.
  }
}

export async function getUserProfile(user: User, options: { forceRefresh?: boolean } = {}): Promise<AppUserProfile | null> {
  if (!options.forceRefresh) {
    const cachedProfile = getCachedUserProfile(user);
    if (cachedProfile) return cachedProfile;
  }

  const existingRequest = profileRequests.get(user.uid);

  if (existingRequest) {
    return existingRequest;
  }

  const request = fetchUserProfile(user).finally(() => {
    profileRequests.delete(user.uid);
  });

  profileRequests.set(user.uid, request);
  return request;
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

  const profile: AppUserProfile = {
    uid: user.uid,
    email: typeof data.email === "string" ? data.email : user.email || "",
    role,
    storeId: typeof data.storeId === "string" ? data.storeId : undefined,
    storeSlug: typeof data.storeSlug === "string" ? data.storeSlug : undefined,
  };

  primeUserProfile(profile);
  return profile;
}

export { ROLE_LABELS, ROLES };
