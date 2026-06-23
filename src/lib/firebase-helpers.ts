import { db } from "./firebase";
import { collection, getDocs, limit, query } from "firebase/firestore";

const DEV_COLLECTION_READ_LIMIT = 50;

/**
 * Obtiene una muestra acotada de documentos de una colección de Firestore.
 * @param collectionName - Nombre de la colección
 * @param maxDocs - Cantidad máxima de documentos a leer
 * @returns Array de documentos con su id incluido
 */
export async function getLimitedFromCollection(
  collectionName: string,
  maxDocs = DEV_COLLECTION_READ_LIMIT
): Promise<any[]> {
  try {
    const snapshot = await getDocs(query(collection(db, collectionName), limit(maxDocs)));
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    // @ts-ignore
    console.error(`Error al traer ${collectionName}:`, error);
    return [];
  }
}

/**
 * Helper interno de diagnóstico. Mantiene límites explícitos para no leer colecciones completas.
 */
export async function getLimitedCollections(maxDocs = DEV_COLLECTION_READ_LIMIT): Promise<{
  stores: any[];
  categories: any[];
  items: any[];
  templates: any[];
}> {
  const [stores, categories, items, templates] = await Promise.all([
    getLimitedFromCollection("stores", maxDocs),
    getLimitedFromCollection("categories", maxDocs),
    getLimitedFromCollection("items", maxDocs),
    getLimitedFromCollection("templates", maxDocs)
  ]);

  return {
    stores,
    categories,
    items,
    templates
  };
}
