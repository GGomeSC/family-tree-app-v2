import React from 'react';
import {
  BaseEdge,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react';

/**
 * Custom edge component for rendering parent-child and partner connections.
 * Parent-child edges use smooth step paths (angled).
 * Partner edges use straight dashed lines.
 */
const RelationshipEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}) => {
  const isPartner = (data as { type?: string })?.type === 'partner';

  let edgePath: string;

  if (isPartner) {
    [edgePath] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });
  } else {
    [edgePath] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: 16,
    });
  }

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        ...style,
        stroke: isPartner ? '#f472b6' : '#6366f1',
        strokeWidth: isPartner ? 2 : 2.5,
        strokeDasharray: isPartner ? '8 4' : undefined,
        opacity: 0.7,
      }}
    />
  );
};

export default RelationshipEdge;
