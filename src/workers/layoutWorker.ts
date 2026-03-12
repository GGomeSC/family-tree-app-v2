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

  // 1. Generate Pedigree Domains: Aggregate raw edges into precise family groups.
  const familyGroupsMap = new Map<string, FamilyGroupData>();

  // Ensure all partner couples are registered as family groups
  for (const person of persons) {
    for (const partnerId of person.partnerIds) {
      const sortedParents = [person.id, partnerId].sort();
      const groupKey = `familyGroup-${sortedParents.join('-')}`;
      if (!familyGroupsMap.has(groupKey)) {
        familyGroupsMap.set(groupKey, { id: groupKey, parents: sortedParents, children: [] });
      }
    }
  }

  // Add all children to their respective parent's family groups.
  for (const person of persons) {
    if (person.parentIds.length === 0) continue;
    const sortedParents = [...person.parentIds].sort();
    const groupKey = `familyGroup-${sortedParents.join('-')}`;
    if (!familyGroupsMap.has(groupKey)) {
      // Handles single parents
      familyGroupsMap.set(groupKey, { id: groupKey, parents: sortedParents, children: [] });
    }
    familyGroupsMap.get(groupKey)!.children.push(person.id);
  }

  const familyGroups = Array.from(familyGroupsMap.values());

  // 2. Add nodes to Dagre
  for (const person of persons) {
    g.setNode(person.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  // 3. Add Structural Graph Edges
  for (const fg of familyGroups) {
    if (fg.parents.length === 2) {
      // It's a couple! Use an invisible union node so Dagre visually clusters them.
      const unionId = `union-${fg.id}`;
      g.setNode(unionId, { width: 10, height: 10 });
      
      // Parents point to Union
      g.setEdge(fg.parents[0], unionId, { weight: 10 });
      g.setEdge(fg.parents[1], unionId, { weight: 10 });

      // Union points to Children
      for (const childId of fg.children) {
        g.setEdge(unionId, childId, { weight: 1 });
      }
    } else if (fg.parents.length === 1) {
      // Single parent, point directly
      for (const childId of fg.children) {
        g.setEdge(fg.parents[0], childId, { weight: 1 });
      }
    }
  }

  // 4. Run layout
  dagre.layout(g);

  // 5. Extract positions
  const nodesMap = new Map<string, LayoutNode>();
  for (const person of persons) {
    const nodeWithPosition = g.node(person.id);
    if (nodeWithPosition) {
      nodesMap.set(person.id, {
        id: person.id,
        position: {
          x: nodeWithPosition.x - NODE_WIDTH / 2,
          y: nodeWithPosition.y - NODE_HEIGHT / 2,
        },
        data: person,
      });
    }
  }

  // 6. Post-process: Lock partners strictly to the same Y-axis rank.
  // Because Dagre clustered them on the X-axis using the UnionNode, we just need to equalize Y.
  const processedPartners = new Set<string>();
  for (const person of persons) {
    if (processedPartners.has(person.id)) continue;

    for (const partnerId of person.partnerIds) {
      if (processedPartners.has(partnerId)) continue;
      
      const p1Node = nodesMap.get(person.id);
      const p2Node = nodesMap.get(partnerId);

      if (p1Node && p2Node) {
        // Average their Y positions to lock them onto a single horizonal plane
        const targetY = (p1Node.position.y + p2Node.position.y) / 2;
        p1Node.position.y = targetY;
        p2Node.position.y = targetY;
      }
      processedPartners.add(partnerId);
    }
    processedPartners.add(person.id);
  }

  return { nodes: Array.from(nodesMap.values()), familyGroups };
}

// Web Worker message handler
self.onmessage = (event: MessageEvent<LayoutPerson[]>) => {
  const persons = event.data;
  const result = computeLayout(persons);
  self.postMessage(result);
};