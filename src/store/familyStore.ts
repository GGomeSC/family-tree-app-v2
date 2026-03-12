import { create } from 'zustand';
import type { Person } from '../types/person';
import {
  createBlankPerson,
  getChildIds,
  wouldCreateCycle,
} from '../types/person';
import { generateId } from '../utils/idGenerator';
import { saveToLocalStorage, loadFromLocalStorage } from './persistence';

export interface FamilyState {
  // ── Data ──────────────────────────────────────────────
  persons: Map<string, Person>;
  selectedPersonId: string | null;
  isPanelOpen: boolean;
  hasStarted: boolean; // whether user has entered the editor

  // ── Actions ───────────────────────────────────────────
  startTree: () => void;
  addPerson: (overrides?: Partial<Person>) => string;
  updatePerson: (id: string, updates: Partial<Person>) => void;
  deletePerson: (id: string) => void;
  selectPerson: (id: string | null) => void;
  togglePanel: (open?: boolean) => void;

  // ── Relationship actions ──────────────────────────────
  addParent: (childId: string) => string | null;
  addChild: (parentId: string, secondParentId?: string) => string;
  addSibling: (siblingOfId: string) => string | null;
  addPartner: (personId: string) => string;

  // ── Derived ───────────────────────────────────────────
  getChildren: (personId: string) => string[];
  getPerson: (id: string) => Person | undefined;

  // ── Persistence ───────────────────────────────────────
  loadFromStorage: () => void;
  clearTree: () => void;
}

/**
 * Helper: saves state to localStorage after mutation.
 * Call this at the end of every state-modifying action.
 */
function persistAfterSet(get: () => FamilyState) {
  saveToLocalStorage(get().persons);
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  // ── Initial state ────────────────────────────────────
  persons: new Map(),
  selectedPersonId: null,
  isPanelOpen: false,
  hasStarted: false,

  // ── Load from storage on init ────────────────────────
  loadFromStorage: () => {
    const persons = loadFromLocalStorage();
    set({
      persons,
      hasStarted: persons.size > 0,
    });
  },

  // ── Start the tree (show editor) ────────────────────
  startTree: () => {
    set({ hasStarted: true });
  },

  // ── CRUD ─────────────────────────────────────────────
  addPerson: (overrides) => {
    const id = generateId();
    const person = createBlankPerson({ id, ...overrides });
    const persons = new Map(get().persons);
    persons.set(id, person);
    set({ persons });
    persistAfterSet(get);
    return id;
  },

  updatePerson: (id, updates) => {
    const persons = new Map(get().persons);
    const existing = persons.get(id);
    if (!existing) return;

    persons.set(id, { ...existing, ...updates });
    set({ persons });
    persistAfterSet(get);
  },

  /**
   * Delete a person and cascade-clean all references:
   * - Remove from others' parentIds
   * - Remove from others' partnerIds
   * - Deselect if currently selected
   */
  deletePerson: (id) => {
    const persons = new Map(get().persons);
    if (!persons.has(id)) return;

    persons.delete(id);

    // Cascade-clean references
    for (const [, person] of persons) {
      person.parentIds = person.parentIds.filter(pid => pid !== id);
      person.partnerIds = person.partnerIds.filter(pid => pid !== id);
    }

    const selectedPersonId = get().selectedPersonId === id ? null : get().selectedPersonId;
    const isPanelOpen = selectedPersonId ? get().isPanelOpen : false;

    set({ persons, selectedPersonId, isPanelOpen });
    persistAfterSet(get);
  },

  selectPerson: (id) => {
    set({
      selectedPersonId: id,
      isPanelOpen: id !== null,
    });
  },

  togglePanel: (open) => {
    set({ isPanelOpen: open ?? !get().isPanelOpen });
  },

  // ── Relationship actions ────────────────────────────

  /**
   * Add a parent to the selected child.
   * Returns null if child already has 2 parents.
   * Prevents ancestor cycles.
   */
  addParent: (childId) => {
    const persons = get().persons;
    const child = persons.get(childId);
    if (!child) return null;
    if (child.parentIds.length >= 2) return null;

    const parentId = generateId();
    const gender: 'male' | 'female' = child.parentIds.length === 0 ? 'female' : 'male';
    const defaultName = gender === 'female' ? 'Mother' : 'Father';

    // Check cycle
    if (wouldCreateCycle(childId, parentId, persons)) return null;

    const parent = createBlankPerson({
      id: parentId,
      name: defaultName,
      gender,
    });

    // If child already has one parent and they don't share partners, link the new parent as partner
    const newPersons = new Map(persons);
    newPersons.set(parentId, parent);

    const updatedChild = {
      ...child,
      parentIds: [...child.parentIds, parentId],
    };
    newPersons.set(childId, updatedChild);

    // Link existing parent + new parent as partners (if applicable)
    if (child.parentIds.length === 1) {
      const existingParentId = child.parentIds[0];
      const existingParent = newPersons.get(existingParentId);
      if (existingParent && !existingParent.partnerIds.includes(parentId)) {
        newPersons.set(existingParentId, {
          ...existingParent,
          partnerIds: [...existingParent.partnerIds, parentId],
        });
        parent.partnerIds = [...parent.partnerIds, existingParentId];
        newPersons.set(parentId, parent);
      }
    }

    set({ persons: newPersons });
    persistAfterSet(get);
    return parentId;
  },

  /**
   * Add a child to the selected parent.
   */
  addChild: (parentId, secondParentId) => {
    const childId = generateId();
    const parentIds = [parentId];
    if (secondParentId) {
      parentIds.push(secondParentId);
    }
    const child = createBlankPerson({
      id: childId,
      name: 'Child',
      parentIds,
    });

    const newPersons = new Map(get().persons);
    newPersons.set(childId, child);
    set({ persons: newPersons });
    persistAfterSet(get);
    return childId;
  },

  /**
   * Add a sibling to the selected person.
   * Sibling shares the same parents.
   * Returns null if person has no parents.
   */
  addSibling: (siblingOfId) => {
    const persons = get().persons;
    const person = persons.get(siblingOfId);
    if (!person) return null;

    // If they have no parents, create one parent first and link both
    const siblingId = generateId();
    const sibling = createBlankPerson({
      id: siblingId,
      name: 'Sibling',
      parentIds: [...person.parentIds], // share parents
    });

    const newPersons = new Map(persons);
    newPersons.set(siblingId, sibling);

    // If the original person had no parents, create a shared parent
    if (person.parentIds.length === 0) {
      const sharedParentId = generateId();
      const sharedParent = createBlankPerson({
        id: sharedParentId,
        name: 'Parent',
        gender: 'female',
      });
      newPersons.set(sharedParentId, sharedParent);

      // Link both as children of the new parent
      const updatedPerson = {
        ...person,
        parentIds: [sharedParentId],
      };
      newPersons.set(siblingOfId, updatedPerson);
      sibling.parentIds = [sharedParentId];
      newPersons.set(siblingId, sibling);
    }

    set({ persons: newPersons });
    persistAfterSet(get);
    return siblingId;
  },

  /**
   * Add a partner to the selected person.
   * Partners are bidirectional.
   */
  addPartner: (personId) => {
    const persons = get().persons;
    const person = persons.get(personId);
    if (!person) return '';

    const partnerId = generateId();
    const partner = createBlankPerson({
      id: partnerId,
      name: 'Partner',
      gender: person.gender === 'male' ? 'female' : 'male',
      partnerIds: [personId],
    });

    const newPersons = new Map(persons);
    newPersons.set(partnerId, partner);

    // Add bidirectional reference
    const updatedPerson = {
      ...person,
      partnerIds: [...person.partnerIds, partnerId],
    };
    newPersons.set(personId, updatedPerson);

    set({ persons: newPersons });
    persistAfterSet(get);
    return partnerId;
  },

  // ── Derived ──────────────────────────────────────────
  getChildren: (personId) => {
    return getChildIds(personId, get().persons);
  },

  getPerson: (id) => {
    return get().persons.get(id);
  },

  clearTree: () => {
    set({
      persons: new Map(),
      selectedPersonId: null,
      isPanelOpen: false,
      hasStarted: false,
    });
    persistAfterSet(get);
  },
}));
