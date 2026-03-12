import React, { useCallback } from 'react';
import type { EdgeProps, ReactFlowState, InternalNode, Edge } from '@xyflow/react';
import { useStore } from '@xyflow/react';

export type FamilyGroupEdgeData = {
  parents: string[];
  children: string[];
};

export type FamilyGroupEdgeType = Edge<FamilyGroupEdgeData, 'familyGroup'>;

export default function FamilyGroupEdge({ data }: EdgeProps<FamilyGroupEdgeType>) {
  // We use a custom selector that explicitly tracks ONLY the nodes involved in this specific family group.
  const nodeSelector = useCallback(
    (s: ReactFlowState) => {
      const activeNodes: Record<string, InternalNode | undefined> = {};
      
      data?.parents.forEach((pid: string) => {
        activeNodes[pid] = s.nodeLookup.get(pid) as InternalNode | undefined;
      });
      data?.children.forEach((cid: string) => {
        activeNodes[cid] = s.nodeLookup.get(cid) as InternalNode | undefined;
      });
      return activeNodes;
    },
    [data?.parents, data?.children]
  );

  const nodes = useStore(nodeSelector, (oldNodes, newNodes) => {
    // Custom shallow equality check for just the properties we care about
    const allKeys = new Set([...Object.keys(oldNodes), ...Object.keys(newNodes)]);
    for (const key of allKeys) {
      const o = oldNodes[key];
      const n = newNodes[key];
      if (!o && !n) continue;
      if (!o || !n) return false;
      
      // We only care about absolute position and measured width/height
      if (
        o.internals?.positionAbsolute?.x !== n.internals?.positionAbsolute?.x ||
        o.internals?.positionAbsolute?.y !== n.internals?.positionAbsolute?.y ||
        o.measured?.width !== n.measured?.width ||
        o.measured?.height !== n.measured?.height
      ) {
        return false;
      }
    }
    return true;
  });

  if (!data) return null;

  // Measurement contract validation
  const parents = data.parents.map(id => nodes[id]).filter(Boolean) as InternalNode[];
  const children = data.children.map(id => nodes[id]).filter(Boolean) as InternalNode[];

  // If ANY bound node is missing its measurements, do not draw this branch yet to avoid math errors (No zero-width flashes)
  if (parents.some(p => !p.measured?.width || !p.internals?.positionAbsolute)) return null;
  if (children.some(c => !c.measured?.width || !c.internals?.positionAbsolute)) return null;

  // Geometry calculations
  const paths: React.ReactNode[] = [];
  const STROKE_COLOR = '#6366f1'; // Indigo-500
  const STROKE_WIDTH = 2;

  if (parents.length === 2) {
    // ---------------------------------------------------------
    // COUPLE + CHILDREN GEOMETRY
    // ---------------------------------------------------------
    const p1 = parents[0];
    const p2 = parents[1];

    const p1X = p1.internals.positionAbsolute!.x;
    const p2X = p2.internals.positionAbsolute!.x;

    // Sort visually left-to-right to draw the couple line cleanly
    const [leftNode, rightNode] = p1X < p2X ? [p1, p2] : [p2, p1];
    
    const leftX = leftNode.internals.positionAbsolute!.x + leftNode.measured!.width!;
    const leftY = leftNode.internals.positionAbsolute!.y + leftNode.measured!.height! / 2;
    
    const rightX = rightNode.internals.positionAbsolute!.x;
    const rightY = rightNode.internals.positionAbsolute!.y + rightNode.measured!.height! / 2;

    const midX = (leftX + rightX) / 2;
    const midY = (leftY + rightY) / 2;

    // 1. Couple dashed line (left node right edge -> right node left edge)
    // Using a cubic bezier so that if dragged off-axis, it maintains a smooth connection
    paths.push(
      <path
        key="couple-line"
        d={`M ${leftX} ${leftY} C ${midX} ${leftY}, ${midX} ${rightY}, ${rightX} ${rightY}`}
        fill="none"
        stroke={STROKE_COLOR}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    );

    if (children.length > 0) {
      // 2. Midpoint descent trunk
      const lowestParentBottom = Math.max(
        leftNode.internals.positionAbsolute!.y + leftNode.measured!.height!,
        rightNode.internals.positionAbsolute!.y + rightNode.measured!.height!
      );
      
      const trunkStartY = midY;
      const trunkEndY = lowestParentBottom + 40; // Drop 40px below the bottom of the lowest parent

      paths.push(
        <path
          key="descent-trunk"
          d={`M ${midX} ${trunkStartY} L ${midX} ${trunkEndY}`}
          stroke={STROKE_COLOR}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
      );

      // 3. Optional junction wrapper (circle)
      paths.push(
        <circle
          key="junction"
          cx={midX}
          cy={trunkStartY}
          r={3}
          fill={STROKE_COLOR}
        />
      );

      if (children.length === 1) {
        // Direct drop to single child
        const child = children[0];
        const childX = child.internals.positionAbsolute!.x + child.measured!.width! / 2;
        const childY = child.internals.positionAbsolute!.y;

        paths.push(
          <path
            key={`child-drop-${child.id}`}
            d={`M ${midX} ${trunkEndY} H ${childX} V ${childY}`}
            fill="none"
            stroke={STROKE_COLOR}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
          />
        );
      } else {
        // Sibling bar + individual drops
        // Calculate the span of the sibling bar
        const childCenters = children.map(c => c.internals.positionAbsolute!.x + c.measured!.width! / 2);
        const minChildX = Math.min(...childCenters);
        const maxChildX = Math.max(...childCenters);

        // It spans either the children's outer bounds OR the trunk itself
        const forkLeftX = Math.min(minChildX, midX);
        const forkRightX = Math.max(maxChildX, midX);

        paths.push(
          <path
            key="sibling-bar"
            d={`M ${forkLeftX} ${trunkEndY} L ${forkRightX} ${trunkEndY}`}
            fill="none"
            stroke={STROKE_COLOR}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
          />
        );

        children.forEach(child => {
          const childX = child.internals.positionAbsolute!.x + child.measured!.width! / 2;
          const childY = child.internals.positionAbsolute!.y;
          paths.push(
            <path
              key={`child-drop-${child.id}`}
              d={`M ${childX} ${trunkEndY} L ${childX} ${childY}`}
              fill="none"
              stroke={STROKE_COLOR}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
            />
          );
        });
      }
    }
  } else if (parents.length === 1 && children.length > 0) {
    // ---------------------------------------------------------
    // SINGLE PARENT + CHILDREN GEOMETRY (Fallback)
    // ---------------------------------------------------------
    const p1 = parents[0];
    const p1X = p1.internals.positionAbsolute!.x;
    const p1Y = p1.internals.positionAbsolute!.y;
    const p1W = p1.measured!.width!;
    const p1H = p1.measured!.height!;

    const midX = p1X + p1W / 2;
    const trunkStartY = p1Y + p1H;
    const trunkEndY = p1Y + p1H + 40;

    paths.push(
      <path
        key="descent-trunk"
        d={`M ${midX} ${trunkStartY} L ${midX} ${trunkEndY}`}
        fill="none"
        stroke={STROKE_COLOR}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    );

    if (children.length === 1) {
      const child = children[0];
      const childX = child.internals.positionAbsolute!.x + child.measured!.width! / 2;
      const childY = child.internals.positionAbsolute!.y;

      paths.push(
        <path
          key={`child-drop-${child.id}`}
          d={`M ${midX} ${trunkEndY} H ${childX} V ${childY}`}
          fill="none"
          stroke={STROKE_COLOR}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
      );
    } else {
      const childCenters = children.map(c => c.internals.positionAbsolute!.x + c.measured!.width! / 2);
      const minChildX = Math.min(...childCenters);
      const maxChildX = Math.max(...childCenters);

      const forkLeftX = Math.min(minChildX, midX);
      const forkRightX = Math.max(maxChildX, midX);

      paths.push(
        <path
          key="sibling-bar"
          d={`M ${forkLeftX} ${trunkEndY} L ${forkRightX} ${trunkEndY}`}
          fill="none"
          stroke={STROKE_COLOR}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
      );

      children.forEach(child => {
        const childX = child.internals.positionAbsolute!.x + child.measured!.width! / 2;
        const childY = child.internals.positionAbsolute!.y;
        paths.push(
          <path
            key={`child-drop-${child.id}`}
            d={`M ${childX} ${trunkEndY} L ${childX} ${childY}`}
            fill="none"
            stroke={STROKE_COLOR}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
          />
        );
      });
    }
  }

  return (
    <g className="family-group-edge">
      {paths}
    </g>
  );
}
