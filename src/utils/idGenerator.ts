import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a unique identifier for new persons.
 */
export function generateId(): string {
  return uuidv4();
}
