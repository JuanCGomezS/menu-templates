import { collection, doc, getDoc, getDocs, limit, query, where, type DocumentData, type DocumentSnapshot, type QuerySnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { getStoreWithData, type PublicStore } from "./store-helpers";

const CACHE_PREFIX = "menu-templates:v1";
const STORE_TTL_MS = 60 * 60 * 1000;
const CATEGORIES_TTL_MS = 60 * 60 * 1000;
const ITEMS_TTL_MS = 30 * 60 * 1000;
const TEMPLATES_TTL_MS = 2 * 60 * 60 * 1000;

export const PUBLIC_STORE_LIMIT = 1;
export const PUBLIC_CATEGORY_LIMIT = 50;
export const PUBLIC_ITEM_LIMIT = 200;
export const PUBLIC_TEMPLATE_LIMIT = 25;
export const ADMIN_STORE_LIST_LIMIT = 50;

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function clearPublicStoreCache(slug?: string, storeId?: string) {
  if (!canUseLocalStorage()) return;

  const keys = [
    slug ? `${CACHE_PREFIX}:store:${slug}` : null,
    slug ? `${CACHE_PREFIX}:legacy-restaurant:${slug}` : null,
    storeId ? `${CACHE_PREFIX}:store:${storeId}:categories` : null,
    storeId ? `${CACHE_PREFIX}:store:${storeId}:items` : null,
    storeId ? `${CACHE_PREFIX}:legacy-restaurant:${storeId}:categories` : null,
    storeId ? `${CACHE_PREFIX}:legacy-restaurant:${storeId}:items` : null,
  ];

  keys.forEach((key) => {
    if (key) window.localStorage.removeItem(key);
  });
}

async function getCachedOrFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const cacheKey = `${CACHE_PREFIX}:${key}`;

  if (canUseLocalStorage()) {
    const cached = window.localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const entry = JSON.parse(cached) as CacheEntry<T>;

        if (entry.expiresAt > Date.now()) {
          return entry.value;
        }
      } catch {
        window.localStorage.removeItem(cacheKey);
      }
    }
  }

  const value = await fetcher();

  if (canUseLocalStorage()) {
    window.localStorage.setItem(
      cacheKey,
      JSON.stringify({ expiresAt: Date.now() + ttlMs, value } satisfies CacheEntry<T>)
    );
  }

  return value;
}

function fromSnapshot<T extends DocumentData>(snapshot: QuerySnapshot<T>): Array<T & { id: string }> {
  return snapshot.docs.map((snapshotDoc) => ({
    ...snapshotDoc.data(),
    id: snapshotDoc.id,
  }));
}

function fromDoc<T extends DocumentData>(snapshot: DocumentSnapshot<T>) {
  if (!snapshot.exists()) {
    return null;
  }

  return {
    ...snapshot.data(),
    id: snapshot.id,
  };
}

async function getStoreBySlug(slug: string) {
  const storesQuery = query(
    collection(db, "stores"),
    where("slug", "==", slug),
    where("active", "==", true),
    limit(PUBLIC_STORE_LIMIT)
  );

  const snapshot = await getDocs(storesQuery);

  if (snapshot.empty) {
    return null;
  }

  const storeDoc = snapshot.docs[0];

  return {
    ...storeDoc.data(),
    id: storeDoc.id,
  };
}

async function getLegacyRestaurantBySlug(slug: string) {
  const restaurantsQuery = query(
    collection(db, "restaurants"),
    where("slug", "==", slug),
    where("isActive", "==", true),
    limit(PUBLIC_STORE_LIMIT)
  );
  const snapshot = await getDocs(restaurantsQuery);

  if (snapshot.empty) {
    return null;
  }

  const restaurantDoc = snapshot.docs[0];
  const data = restaurantDoc.data();

  return {
    ...data,
    id: restaurantDoc.id,
    type: data.type || "restaurant",
    active: data.active ?? data.isActive ?? true,
    isActive: data.isActive ?? data.active ?? true,
    themeId: data.themeId,
  };
}

async function getActiveTemplates() {
  const templatesQuery = query(
    collection(db, "templates"),
    where("active", "==", true),
    limit(PUBLIC_TEMPLATE_LIMIT)
  );
  const snapshot = await getDocs(templatesQuery);
  return fromSnapshot(snapshot);
}

async function getLegacyRestaurantCategories(restaurantId: string) {
  const snapshot = await getDocs(
    query(
      collection(db, "restaurants", restaurantId, "categories"),
      where("active", "==", true),
      limit(PUBLIC_CATEGORY_LIMIT)
    )
  );

  return fromSnapshot(snapshot);
}

async function getLegacyRestaurantItems(restaurantId: string, categories: Array<{ id: string }>) {
  const nestedItems = await Promise.all(
    categories.map(async (category) => {
      const snapshot = await getDocs(
        query(
          collection(db, "restaurants", restaurantId, "categories", category.id, "items"),
          where("active", "==", true),
          limit(PUBLIC_ITEM_LIMIT)
        )
      );

      return fromSnapshot(snapshot).map((item) => ({
        ...item,
        categoryId: item.categoryId || category.id,
      }));
    })
  );

  return nestedItems.flat().slice(0, PUBLIC_ITEM_LIMIT);
}

export async function getStoreSlugById(storeId: string): Promise<string | null> {
  const snapshot = await getDoc(doc(db, "stores", storeId));

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return typeof data.slug === "string" && data.slug.trim() ? data.slug : null;
}

export async function getStoreForAdminById(storeId: string) {
  return fromDoc(await getDoc(doc(db, "stores", storeId)));
}

export async function getStoreForAdminBySlug(slug: string) {
  const storesQuery = query(collection(db, "stores"), where("slug", "==", slug), limit(PUBLIC_STORE_LIMIT));
  const snapshot = await getDocs(storesQuery);

  if (snapshot.empty) {
    return null;
  }

  const storeDoc = snapshot.docs[0];

  return {
    ...storeDoc.data(),
    id: storeDoc.id,
  };
}

export async function getLimitedStoresForAdmin(maxStores = ADMIN_STORE_LIST_LIMIT) {
  const storesQuery = query(collection(db, "stores"), limit(maxStores));
  const snapshot = await getDocs(storesQuery);

  return fromSnapshot(snapshot);
}

export async function getPublicStoreBySlug(slug: string): Promise<PublicStore | null> {
  const store = await getCachedOrFetch(`store:${slug}`, STORE_TTL_MS, () => getStoreBySlug(slug));

  if (store) {
    const [categories, items, templates] = await Promise.all([
      getCachedOrFetch(`store:${store.id}:categories`, CATEGORIES_TTL_MS, async () => {
        const snapshot = await getDocs(
          query(
            collection(db, "stores", store.id, "categories"),
            where("active", "==", true),
            limit(PUBLIC_CATEGORY_LIMIT)
          )
        );
        return fromSnapshot(snapshot);
      }),
      getCachedOrFetch(`store:${store.id}:items`, ITEMS_TTL_MS, async () => {
        const snapshot = await getDocs(
          query(
            collection(db, "stores", store.id, "items"),
            where("active", "==", true),
            limit(PUBLIC_ITEM_LIMIT)
          )
        );
        return fromSnapshot(snapshot);
      }),
      getCachedOrFetch("templates", TEMPLATES_TTL_MS, getActiveTemplates),
    ]);

    return getStoreWithData(store, categories, items, templates);
  }

  const legacyRestaurant = await getCachedOrFetch(
    `legacy-restaurant:${slug}`,
    STORE_TTL_MS,
    () => getLegacyRestaurantBySlug(slug)
  );

  if (!legacyRestaurant) {
    return null;
  }

  const categories = await getCachedOrFetch(
    `legacy-restaurant:${legacyRestaurant.id}:categories`,
    CATEGORIES_TTL_MS,
    () => getLegacyRestaurantCategories(legacyRestaurant.id)
  );

  const [items, templates] = await Promise.all([
    getCachedOrFetch(
      `legacy-restaurant:${legacyRestaurant.id}:items`,
      ITEMS_TTL_MS,
      () => getLegacyRestaurantItems(legacyRestaurant.id, categories)
    ),
    getCachedOrFetch("templates", TEMPLATES_TTL_MS, getActiveTemplates),
  ]);

  return getStoreWithData(legacyRestaurant, categories, items, templates);
}
