import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

/**
 * Obtiene todos los documentos de una colección de Firestore
 * @param collectionName - Nombre de la colección
 * @returns Array de documentos con su id incluido
 */
export async function getAllFromCollection(collectionName: string): Promise<any[]> {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
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
 * Obtiene todas las colecciones principales de la base de datos
 */
export async function getAllCollections(): Promise<{
  restaurants: any[];
  categories: any[];
  items: any[];
  templates: any[];
}> {
  const [restaurants, categories, items, templates] = await Promise.all([
    getAllFromCollection("restaurants"),
    getAllFromCollection("categories"),
    getAllFromCollection("items"),
    getAllFromCollection("templates")
  ]);

  return {
    restaurants,
    categories,
    items,
    templates
  };
}

