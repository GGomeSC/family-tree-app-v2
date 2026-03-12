import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import PersonNode from './PersonNode';
import RelationshipEdge from './RelationshipEdge';
import { useFamilyStore } from '../../store/familyStore';
import { useLayoutWorker } from '../../hooks/useLayoutWorker';
import type { LayoutPerson, LayoutResult } from '../../workers/layoutWorker';

const nodeTypes = { person: PersonNode };
const edgeTypes = { relationship: RelationshipEdge };

/**
 * Main canvas component wrapping React Flow.
 * Handles:
 * - Converting store data to React Flow nodes/edges
 * - Requesting layout from the Web Worker
 * - Node selection/click handling
 */
const FamilyCanvas: React.FC = () => {
  const { persons, selectedPersonId, selectPerson } = useFamilyStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLayoutReady, setIsLayoutReady] = useState(false);

  // Debounce ref for layout requests
  const layoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Callback when layout engine finishes
  const handleLayoutComplete = useCallback(
    (result: LayoutResult) => {
      const flowNodes: Node[] = result.nodes.map((n) => ({
        id: n.id,
        type: 'person',
        position: n.position,
        data: { ...n.data, isSelected: n.id === selectedPersonId },
        selected: n.id === selectedPersonId,
        draggable: true,
      }));

      const flowEdges: Edge[] = result.edges.map((e) => {
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'relationship',
          sourceHandle: e.sourceHandle || (e.type === 'partner' ? 'right' : 'bottom'),
          targetHandle: e.targetHandle || (e.type === 'partner' ? 'left' : 'top'),
          data: { type: e.type },
          animated: e.type === 'parent',
        };
      });

      setNodes(flowNodes);
      setEdges(flowEdges);
      setIsLayoutReady(true);
    },
    [selectedPersonId, setNodes, setEdges]
  );

  const { requestLayout } = useLayoutWorker(handleLayoutComplete);

  // Convert persons map to layout input and request layout
  useEffect(() => {
    if (persons.size === 0) {
      setNodes([]);
      setEdges([]);
      setIsLayoutReady(true);
      return;
    }

    // Debounce layout requests (50ms)
    if (layoutTimerRef.current) clearTimeout(layoutTimerRef.current);
    layoutTimerRef.current = setTimeout(() => {
      const layoutPersons: LayoutPerson[] = [];
      for (const [, person] of persons) {
        layoutPersons.push({
          id: person.id,
          name: person.name,
          surnameNow: person.surnameNow,
          gender: person.gender,
          deceased: person.deceased,
          dob: person.dob,
          dod: person.dod,
          avatarUrl: person.avatarUrl,
          parentIds: person.parentIds,
          partnerIds: person.partnerIds,
        });
      }
      requestLayout(layoutPersons);
    }, 50);

    return () => {
      if (layoutTimerRef.current) clearTimeout(layoutTimerRef.current);
    };
  }, [persons, requestLayout, setNodes, setEdges]);

  // Update selected state when selection changes without re-layout
  useEffect(() => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        selected: node.id === selectedPersonId,
        data: { ...node.data, isSelected: node.id === selectedPersonId },
      }))
    );
  }, [selectedPersonId, setNodes]);

  // Handle node click
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      selectPerson(node.id);
    },
    [selectPerson]
  );

  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    selectPerson(null);
  }, [selectPerson]);

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'relationship',
    }),
    []
  );

  return (
    <div className="family-canvas" id="family-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className={!isLayoutReady ? 'loading' : ''}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(99, 102, 241, 0.15)"
        />
        <Controls
          showInteractive={false}
          className="canvas-controls"
        />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as { gender?: string };
            return data?.gender === 'female' ? '#f472b6' : '#818cf8';
          }}
          maskColor="rgba(15, 15, 23, 0.8)"
          className="canvas-minimap"
        />
      </ReactFlow>
    </div>
  );
};

export default FamilyCanvas;
