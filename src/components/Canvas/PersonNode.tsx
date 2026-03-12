import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { User, Heart, Skull } from 'lucide-react';
import type { LayoutPerson } from '../../workers/layoutWorker';

export type PersonNodeData = LayoutPerson & { isSelected?: boolean } & Record<string, unknown>;

/**
 * Custom React Flow node representing a person in the family tree.
 * Shows avatar, name, birth/death info, and gender-colored accent.
 */
const PersonNode: React.FC<NodeProps<Node<PersonNodeData, 'person'>>> = memo(({ data, selected }) => {
  const person = data;
  const isSelected = selected || person.isSelected;

  const genderClass = person.gender === 'female' ? 'node-female' : 'node-male';
  const displayName = person.name || 'Unnamed';
  const displaySurname = person.surnameNow || '';

  const birthYear = person.dob ? new Date(person.dob).getFullYear() : null;
  const deathYear = person.dod ? new Date(person.dod).getFullYear() : null;

  let lifespan = '';
  if (birthYear) {
    lifespan = `${birthYear}`;
    if (deathYear) {
      lifespan += ` – ${deathYear}`;
    } else if (person.deceased) {
      lifespan += ' – ?';
    }
  }

  return (
    <div
      className={`person-node ${genderClass} ${isSelected ? 'selected' : ''} ${person.deceased ? 'deceased' : ''}`}
      id={`person-node-${person.id}`}
    >
      <Handle type="target" position={Position.Top} id="top" className="node-handle" />

      {/* Bidirectional Left Handles */}
      <Handle type="target" position={Position.Left} id="left" className="node-handle partner-handle" />
      <Handle type="source" position={Position.Left} id="left" className="node-handle partner-handle" style={{ opacity: 0 }} />

      {/* Bidirectional Right Handles */}
      <Handle type="source" position={Position.Right} id="right" className="node-handle partner-handle" />
      <Handle type="target" position={Position.Right} id="right" className="node-handle partner-handle" style={{ opacity: 0 }} />

      <div className="node-content">
        <div className="node-avatar">
          {person.avatarUrl ? (
            <img src={person.avatarUrl} alt={displayName} />
          ) : (
            <div className="avatar-placeholder">
              <User size={24} />
            </div>
          )}
        </div>

        <div className="node-info">
          <div className="node-name">
            {displayName}
            {displaySurname && <span className="node-surname"> {displaySurname}</span>}
          </div>

          {lifespan && (
            <div className="node-lifespan">
              {person.deceased && <Skull size={12} className="deceased-icon" />}
              {lifespan}
            </div>
          )}
        </div>

        <div className="node-gender-indicator">
          {person.gender === 'female' ? (
            <Heart size={14} />
          ) : (
            <div className="gender-dot" />
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} id="bottom" className="node-handle" />
    </div>
  );
});

PersonNode.displayName = 'PersonNode';

export default PersonNode;