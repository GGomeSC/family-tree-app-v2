/**
 * Layout Web Worker
 *
 * Receives the persons map (serialized) and computes node positions
 * using the dagre graph layout algorithm. Returns positioned nodes
 * and edge definitions for React Flow to render.
 *
 * This runs off the main thread so layout computation for large trees
 * does not block the UI.
 */

import dagre from 'dagre';

export interface LayoutPerson {
  id: string;
  name: string;
  surnameNow: string;
  gender: 'male' | 'female';
  deceased: boolean;
  dob: string;
  dod: string;
  avatarUrl: string;
  parentIds: string[];
  partnerIds: string[];
}

export interface LayoutNode {
  id: string;
  position: { x: number; y: number };
  data: LayoutPerson;
}

export interface FamilyGroupData {
  id: string;
  parents: string[];
  children: string[];
}

export interface LayoutResult {
  nodes: LayoutNode[];
  familyGroups: FamilyGroupData[];
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 100;

function computeLayout(persons: LayoutPerson[]): LayoutResult {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'TB',
    ranksep: 100,
    nodesep: 60,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const personMap = new Map<string, LayoutPerson>();
  for (const p of persons) {
    personMap.set(p.id, p);
  }

  // Add nodes
  for (const person of persons) {
    g.setNode(person.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  const addedDagreEdges = new Set<string>();

  // Add parent-child edges for Dagre's structural hierarchy
  for (const person of persons) {
    for (const parentId of person.parentIds) {
      if (personMap.has(parentId)) {
        const edgeKey = `parent-${parentId}-${person.id}`;
        if (!addedDagreEdges.has(edgeKey)) {
          g.setEdge(parentId, person.id);
          addedDagreEdges.add(edgeKey);
        }
      }
    }
  }
  // Partner edges are intentionally NOT added to dagre to avoid hierarchical displacement.

  dagre.layout(g);

  // Extract positions
  const nodes: LayoutNode[] = [];
  for (const person of persons) {
    const nodeWithPosition = g.node(person.id);
    if (nodeWithPosition) {
      nodes.push({
        id: person.id,
        position: {
          x: nodeWithPosition.x - NODE_WIDTH / 2,
          y: nodeWithPosition.y - NODE_HEIGHT / 2,
        },
        data: person,
      });
    }
  }

  // Build a set of persons who are parents of at least one other person
  const isParentOf = new Set<string>();
  for (const p of persons) {
    for (const pid of p.parentIds) {
      isParentOf.add(pid);
    }
  }

  // Post-process: adjust partner positions to be side-by-side on the same Y level.
  const isSpaceOccupied = (x: number, y: number, ignoreIds: string[]) => {
    const padding = 20;
    for (const n of nodes) {
      if (ignoreIds.includes(n.id)) continue;
      if (
        Math.abs(n.position.x - x) < NODE_WIDTH + padding &&
        Math.abs(n.position.y - y) < NODE_HEIGHT + padding
      ) {
        return true;
      }
    }
    return false;
  };

  const processedPartners = new Set<string>();
  for (const person of persons) {
    if (processedPartners.has(person.id)) continue;

    for (const partnerId of person.partnerIds) {
      if (processedPartners.has(partnerId)) continue;
      if (!personMap.has(partnerId)) continue;

      const personNode = nodes.find(n => n.id === person.id);
      const partnerNode = nodes.find(n => n.id === partnerId);

      if (personNode && partnerNode) {
        const partner = personMap.get(partnerId)!;

        // A node is "anchored" if dagre placed it based on parent-child edges
        const personAnchored = person.parentIds.length > 0 || isParentOf.has(person.id);
        const partnerAnchored = partner.parentIds.length > 0 || isParentOf.has(partnerId);

        let targetY = personNode.position.y;
        let baseNode = personNode;
        let nodeToMove = partnerNode;

        if (personAnchored && !partnerAnchored) {
          targetY = personNode.position.y;
          baseNode = personNode;
          nodeToMove = partnerNode;
        } else if (partnerAnchored && !personAnchored) {
          targetY = partnerNode.position.y;
          baseNode = partnerNode;
          nodeToMove = personNode;
        } else {
          targetY = (personNode.position.y + partnerNode.position.y) / 2;
          baseNode = personNode;
          nodeToMove = partnerNode;
        }

        personNode.position.y = targetY;
        partnerNode.position.y = targetY;

        const rightX = baseNode.position.x + NODE_WIDTH + 60;
        const leftX = baseNode.position.x - NODE_WIDTH - 60;

        const currentDist = Math.abs(personNode.position.x - partnerNode.position.x);
        const alreadyAdjacent = currentDist >= NODE_WIDTH && currentDist <= NODE_WIDTH + 120;

        if (!alreadyAdjacent || isSpaceOccupied(nodeToMove.position.x, targetY, [personNode.id, partnerNode.id])) {
          if (!isSpaceOccupied(rightX, targetY, [personNode.id, partnerNode.id])) {
            nodeToMove.position.x = rightX;
          } else if (!isSpaceOccupied(leftX, targetY, [personNode.id, partnerNode.id])) {
            nodeToMove.position.x = leftX;
          } else {
            let fallbackX = rightX;
            while (isSpaceOccupied(fallbackX, targetY, [personNode.id, partnerNode.id])) {
              fallbackX += NODE_WIDTH + 60;
            }
            nodeToMove.position.x = fallbackX;
          }
        }
      }
      processedPartners.add(partnerId);
    }
    processedPartners.add(person.id);
  }

  // Generate Pedigree Domains: Aggregate raw edges into precise family groups.
  const familyGroupsMap = new Map<string, FamilyGroupData>();

  // 1. First ensure all partner couples are registered as family groups, even if they have no shared children yet.
  for (const person of persons) {
    for (const partnerId of person.partnerIds) {
      const sortedParents = [person.id, partnerId].sort();
      const groupKey = `familyGroup-${sortedParents.join('-')}`;
      if (!familyGroupsMap.has(groupKey)) {
        familyGroupsMap.set(groupKey, { id: groupKey, parents: sortedParents, children: [] });
      }
    }
  }

  // 2. Add all children to their respective parent's family groups.
  for (const person of persons) {
    if (person.parentIds.length === 0) continue;
    const sortedParents = [...person.parentIds].sort();
    const groupKey = `familyGroup-${sortedParents.join('-')}`;
    if (!familyGroupsMap.has(groupKey)) {
      // Handles single parents gracefully
      familyGroupsMap.set(groupKey, { id: groupKey, parents: sortedParents, children: [] });
    }
    familyGroupsMap.get(groupKey)!.children.push(person.id);
  }

  const familyGroups = Array.from(familyGroupsMap.values());

  return { nodes, familyGroups };
}

// Web Worker message handler
self.onmessage = (event: MessageEvent<LayoutPerson[]>) => {
  const persons = event.data;
  const result = computeLayout(persons);
  self.postMessage(result);
};