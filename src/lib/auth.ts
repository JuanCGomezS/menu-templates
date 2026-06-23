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

export async function getUserProfile(user: User): Promise<AppUserProfile | null> {
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

  return {
    uid: user.uid,
    email: data.email || user.email || "",
    role,
    storeId: data.storeId,
    storeSlug: data.storeSlug,
  };
}

export { ROLE_LABELS, ROLES };
