import { Recipe } from '../types';

const DB_NAME = 'DailyMealRecipeOffline';
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pinned_recipes')) {
        db.createObjectStore('pinned_recipes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pantry')) {
        db.createObjectStore('pantry', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meal_plans')) {
        db.createObjectStore('meal_plans', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('shopping_list')) {
        db.createObjectStore('shopping_list', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error || 'Failed to open IndexedDB');
    };
  });
}

// Recipes
export async function saveRecipeOffline(recipe: Recipe): Promise<void> {
  if (!recipe.id) return;
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('pinned_recipes', 'readwrite');
    const store = tx.objectStore('pinned_recipes');
    const request = store.put(recipe);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteRecipeOffline(id: string): Promise<void> {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('pinned_recipes', 'readwrite');
    const store = tx.objectStore('pinned_recipes');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPinnedRecipes(): Promise<Recipe[]> {
  const db = await initDB();
  return new Promise<Recipe[]>((resolve, reject) => {
    const tx = db.transaction('pinned_recipes', 'readonly');
    const store = tx.objectStore('pinned_recipes');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function isRecipePinned(id: string): Promise<boolean> {
  if (!id) return false;
  try {
    const db = await initDB();
    return new Promise<boolean>((resolve) => {
      const tx = db.transaction('pinned_recipes', 'readonly');
      const store = tx.objectStore('pinned_recipes');
      const request = store.get(id);
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

// Sync Cache for other models (Pantry, Meal plans, Shopping list)
export async function cacheOfflineItems(storeName: 'pantry' | 'meal_plans' | 'shopping_list', items: any[]): Promise<void> {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    for (const item of items) {
      if (item && item.id) {
        store.put(item);
      }
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineItems(storeName: 'pantry' | 'meal_plans' | 'shopping_list'): Promise<any[]> {
  const db = await initDB();
  return new Promise<any[]>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function addOfflineItem(storeName: 'pantry' | 'meal_plans' | 'shopping_list', item: any): Promise<void> {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteOfflineItem(storeName: 'pantry' | 'meal_plans' | 'shopping_list', id: string): Promise<void> {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
