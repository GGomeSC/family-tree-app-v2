import React from 'react';
import {
  Download,
  Trash2,
  UserPlus,
  TreePine,
} from 'lucide-react';
import { useFamilyStore } from '../../store/familyStore';
import { useExport } from '../../hooks/useExport';

/**
 * Top toolbar with global actions:
 * - Add first person
 * - Export as PNG
 * - Clear tree
 */
const CanvasToolbar: React.FC = () => {
  const { persons, addPerson, selectPerson, clearTree } = useFamilyStore();
  const { exportAsPng } = useExport();

  const handleAddPerson = () => {
    const id = addPerson({ name: 'New Person' });
    selectPerson(id);
  };

  const handleClearTree = () => {
    if (window.confirm('Are you sure you want to delete the entire family tree? This cannot be undone.')) {
      clearTree();
    }
  };

  return (
    <div className="canvas-toolbar" id="canvas-toolbar">
      <div className="toolbar-left">
        <div className="toolbar-brand">
          <TreePine size={22} />
          <span className="toolbar-title">Family Tree Builder</span>
        </div>
      </div>

      <div className="toolbar-center">
        <span className="toolbar-count">
          {persons.size} {persons.size === 1 ? 'person' : 'people'}
        </span>
      </div>

      <div className="toolbar-right">
        <button
          className="toolbar-btn primary"
          onClick={handleAddPerson}
          id="btn-add-person"
          title="Add a new person"
        >
          <UserPlus size={16} />
          <span>Add Person</span>
        </button>

        <button
          className="toolbar-btn"
          onClick={exportAsPng}
          id="btn-export-png"
          title="Export tree as PNG"
          disabled={persons.size === 0}
        >
          <Download size={16} />
          <span>Export</span>
        </button>

        <button
          className="toolbar-btn danger"
          onClick={handleClearTree}
          id="btn-clear-tree"
          title="Clear entire tree"
          disabled={persons.size === 0}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default CanvasToolbar;