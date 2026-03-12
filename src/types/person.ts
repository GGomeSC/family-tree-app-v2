/**
 * Core domain model for a person in the family tree.
 *
 * Design decisions:
 * - `parentIds` is the single source of truth for parent-child relationships.
 *   Children are derived by scanning all persons' parentIds.
 * - `partnerIds` is bidirectional: adding A as partner of B also adds B as partner of A.
 * - `parentIds` is capped at 2 to prevent invalid biological states.
 * - Siblings are derived from shared parentIds — no explicit sibling array needed.
 */
export interface Person {
  id: string;
  name: string;
  surnameNow: string;
  surnameAtBirth: string;
  gender: 'male' | 'female';
  deceased: boolean;
  dob: string;         // ISO date string, e.g. "1990-05-15"
  dod: string;         // ISO date string or ""
  countryOfBirth: string;
  profession: string;
  interestingFacts: string;
  avatarUrl: string;   // base64 data URL or empty string
  parentIds: string[]; // max 2
  partnerIds: string[];
}

/**
 * Creates a blank person with sensible defaults.
 */
export function createBlankPerson(overrides: Partial<Person> & { id: string }): Person {
  return {
    name: '',
    surnameNow: '',
    surnameAtBirth: '',
    gender: 'male',
    deceased: false,
    dob: '',
    dod: '',
    countryOfBirth: '',
    profession: '',
    interestingFacts: '',
    avatarUrl: '',
    parentIds: [],
    partnerIds: [],
    ...overrides,
  };
}

/**
 * Derive child IDs for a given person from the full persons map.
 */
export function getChildIds(personId: string, persons: Map<string, Person>): string[] {
  const children: string[] = [];
  for (const [id, p] of persons) {
    if (id !== personId && p.parentIds.includes(personId)) {
      children.push(id);
    }
  }
  return children;
}

/**
 * Derive sibling IDs for a given person from the full persons map.
 * Siblings share at least one parent.
 */
export function getSiblingIds(personId: string, persons: Map<string, Person>): string[] {
  const person = persons.get(personId);
  if (!person || person.parentIds.length === 0) return [];

  const siblings = new Set<string>();
  for (const [id, p] of persons) {
    if (id === personId) continue;
    if (p.parentIds.some(pid => person.parentIds.includes(pid))) {
      siblings.add(id);
    }
  }
  return [...siblings];
}

/**
 * Checks if adding parentId as a parent of childId would create an ancestor cycle.
 * Prevents: A is parent of B, B is parent of C, trying to make C parent of A.
 */
export function wouldCreateCycle(
  childId: string,
  parentId: string,
  persons: Map<string, Person>
): boolean {
  // Walk up from parentId's ancestors to see if we ever reach childId
  const visited = new Set<string>();
  const queue = [parentId];

  while (queue.length > 0) {
    const current = queue.pop()!;
    if (current === childId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const person = persons.get(current);
    if (person) {
      for (const pid of person.parentIds) {
        queue.push(pid);
      }
    }
  }
  return false;
}