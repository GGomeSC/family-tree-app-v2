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

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  type: 'parent' | 'partner';
  sourceHandle?: string;
  targetHandle?: string;
}

export interface LayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
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

  // Track edges we've added to avoid duplicates
  const addedEdges = new Set<string>();
  const edges: LayoutEdge[] = [];

  // Add parent-child edges
  for (const person of persons) {
    for (const parentId of person.parentIds) {
      if (personMap.has(parentId)) {
        const edgeKey = `parent-${parentId}-${person.id}`;
        if (!addedEdges.has(edgeKey)) {
          g.setEdge(parentId, person.id);
          addedEdges.add(edgeKey);
          edges.push({
            id: edgeKey,
            source: parentId,
            target: person.id,
            type: 'parent',
          });
        }
      }
    }
  }

  // Add partner edges (invisible to dagre but rendered)
  // For dagre, we add partner edges with minimal weight so partners
  // stay on the same rank but dagre doesn't overly constrain them.
  for (const person of persons) {
    for (const partnerId of person.partnerIds) {
      const edgeKey1 = `partner-${person.id}-${partnerId}`;
      const edgeKey2 = `partner-${partnerId}-${person.id}`;
      if (!addedEdges.has(edgeKey1) && !addedEdges.has(edgeKey2) && personMap.has(partnerId)) {
        // Don't add partner edges to dagre (they should be same-rank, not hierarchical)
        addedEdges.add(edgeKey1);
        addedEdges.add(edgeKey2);
        edges.push({
          id: edgeKey1,
          source: person.id,
          target: partnerId,
          type: 'partner',
        });
      }
    }
  }

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
  // Instead of averaging Y (which displaces nodes placed by dagre's hierarchy),
  // we keep the "anchored" partner's Y and move the other to match.
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
          // Both or neither anchored — average is fine
          targetY = (personNode.position.y + partnerNode.position.y) / 2;
          baseNode = personNode;
          nodeToMove = partnerNode;
        }

        // Apply computed Y
        personNode.position.y = targetY;
        partnerNode.position.y = targetY;

        // Try to place nodeToMove next to baseNode
        const rightX = baseNode.position.x + NODE_WIDTH + 60;
        const leftX = baseNode.position.x - NODE_WIDTH - 60;

        // Important: check if dagre already placed them well and they don't overlap with others
        const currentDist = Math.abs(personNode.position.x - partnerNode.position.x);
        const alreadyAdjacent = currentDist >= NODE_WIDTH && currentDist <= NODE_WIDTH + 120;
        
        if (!alreadyAdjacent || isSpaceOccupied(nodeToMove.position.x, targetY, [personNode.id, partnerNode.id])) {
          // We must place nodeToMove
          if (!isSpaceOccupied(rightX, targetY, [personNode.id, partnerNode.id])) {
            nodeToMove.position.x = rightX;
          } else if (!isSpaceOccupied(leftX, targetY, [personNode.id, partnerNode.id])) {
            nodeToMove.position.x = leftX;
          } else {
            // Both occupied, just put it to the right with extra spacing
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

  // Assign handles dynamically to ensure elegant connections
  for (const edge of edges) {
    if (edge.type === 'partner') {
      const sNode = nodes.find(n => n.id === edge.source);
      const tNode = nodes.find(n => n.id === edge.target);
      if (sNode && tNode) {
        if (sNode.position.x < tNode.position.x) {
          edge.sourceHandle = 'right';
          edge.targetHandle = 'left';
        } else {
          edge.sourceHandle = 'left';
          edge.targetHandle = 'right';
        }
      }
    } else if (edge.type === 'parent') {
      edge.sourceHandle = 'bottom';
      edge.targetHandle = 'top';
    }
  }

  return { nodes, edges };
}

// Web Worker message handler
self.onmessage = (event: MessageEvent<LayoutPerson[]>) => {
  const persons = event.data;
  const result = computeLayout(persons);
  self.postMessage(result);
};
