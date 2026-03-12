import type { Person } from '../types/person';

/**
 * Serializes the persons map to JSON for localStorage.
 */
export function serializePersons(persons: Map<string, Person>): string {
  const obj: Record<string, Person> = {};
  for (const [id, person] of persons) {
    obj[id] = person;
  }
  return JSON.stringify(obj);
}

/**
 * Deserializes JSON from localStorage to a persons map.
 */
export function deserializePersons(json: string): Map<string, Person> {
  try {
    const obj: Record<string, Person> = JSON.parse(json);
    const map = new Map<string, Person>();
    for (const [id, person] of Object.entries(obj)) {
      map.set(id, person);
    }
    return map;
  } catch {
    return new Map();
  }
}

const STORAGE_KEY = 'family-tree-data';

/**
 * Saves persons map to localStorage.
 */
export function saveToLocalStorage(persons: Map<string, Person>): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializePersons(persons));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

/**
 * Loads persons map from localStorage.
 */
export function loadFromLocalStorage(): Map<string, Person> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return new Map();
    return deserializePersons(data);
  } catch {
    return new Map();
  }
}

/**
 * Clears the stored tree data.
 */
export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}