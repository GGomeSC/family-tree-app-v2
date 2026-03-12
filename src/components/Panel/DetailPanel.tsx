import React, { useCallback, useState } from 'react';
import {
  X,
  UserPlus,
  Users,
  Heart,
  Baby,
  Trash2,
} from 'lucide-react';
import { useFamilyStore } from '../../store/familyStore';
import { getChildIds, getSiblingIds } from '../../types/person';
import PersonForm from './PersonForm';

/**
 * Left-side sliding detail panel for viewing and editing a selected person.
 * Shows the person form, relationship action buttons, and related people list.
 */
const DetailPanel: React.FC = () => {
  const {
    persons,
    selectedPersonId,
    isPanelOpen,
    selectPerson,
    deletePerson,
    addParent,
    addChild,
    addSibling,
    addPartner,
  } = useFamilyStore();

  const person = selectedPersonId ? persons.get(selectedPersonId) : null;

  const handleClose = useCallback(() => {
    selectPerson(null);
  }, [selectPerson]);

  const handleDelete = useCallback(() => {
    if (!selectedPersonId) return;
    const name = person?.name || 'this person';
    if (window.confirm(`Delete ${name}? This will remove all their relationships.`)) {
      deletePerson(selectedPersonId);
    }
  }, [selectedPersonId, person, deletePerson]);

  const handleAddParent = useCallback(() => {
    if (!selectedPersonId) return;
    const parentId = addParent(selectedPersonId);
    if (parentId) {
      selectPerson(parentId);
    } else {
      alert('Cannot add more parents. A person can have at most 2 parents.');
    }
  }, [selectedPersonId, addParent, selectPerson]);

  const [showChildOptions, setShowChildOptions] = useState(false);

  const handleAddChild = useCallback((secondParentId?: string | 'new') => {
    if (!selectedPersonId) return;

    let siblingParentId: string | undefined = secondParentId === 'new' ? undefined : secondParentId;
    if (secondParentId === 'new') {
      siblingParentId = addPartner(selectedPersonId) ?? undefined;
    }

    const childId = addChild(selectedPersonId, siblingParentId);
    selectPerson(childId);
    setShowChildOptions(false);
  }, [selectedPersonId, addPartner, addChild, selectPerson]);

  const handleAddSibling = useCallback(() => {
    if (!selectedPersonId) return;
    const sibId = addSibling(selectedPersonId);
    if (sibId) {
      selectPerson(sibId);
    }
  }, [selectedPersonId, addSibling, selectPerson]);

  const handleAddPartner = useCallback(() => {
    if (!selectedPersonId) return;
    const partnerId = addPartner(selectedPersonId);
    if (partnerId) selectPerson(partnerId);
  }, [selectedPersonId, addPartner, selectPerson]);

  if (!isPanelOpen || !person || !selectedPersonId) {
    return null;
  }

  // Derive relationships
  const children = getChildIds(selectedPersonId, persons);
  const siblings = getSiblingIds(selectedPersonId, persons);
  const parents = person.parentIds
    .map((pid) => persons.get(pid))
    .filter(Boolean);
  const partners = person.partnerIds
    .map((pid) => persons.get(pid))
    .filter(Boolean);

  return (
    <div className={`detail-panel ${isPanelOpen ? 'open' : ''}`} id="detail-panel">
      {/* Header */}
      <div className="panel-header">
        <h2 className="panel-title">
          {person.name || 'Unnamed Person'}
          {person.surnameNow && <span className="panel-surname"> {person.surnameNow}</span>}
        </h2>
        <button
          className="panel-close-btn"
          onClick={handleClose}
          id="btn-close-panel"
          title="Close panel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="panel-content">
        {/* Relationship Actions */}
        <div className="panel-section">
          <h3 className="section-title">Add Relationship</h3>
          <div className="relationship-actions">
            <button
              className="rel-btn"
              onClick={handleAddParent}
              disabled={person.parentIds.length >= 2}
              id="btn-add-parent"
              title="Add a parent"
            >
              <UserPlus size={16} />
              <span>Parent</span>
            </button>
            {showChildOptions ? (
              <div className="child-options-menu" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  className="rel-link"
                  onClick={() => handleAddChild('new')}
                >
                  <Heart size={14} style={{ marginRight: 6, display: 'inline', verticalAlign: 'middle' }} /> Add child with a new partner
                </button>
                <button
                  className="rel-link"
                  onClick={() => handleAddChild()}
                >
                  <Baby size={14} style={{ marginRight: 6, display: 'inline', verticalAlign: 'middle' }} /> Add single parent child
                </button>
                {partners.map(p => p && (
                  <button
                    key={p.id}
                    className="rel-link partner"
                    onClick={() => handleAddChild(p.id)}
                  >
                    <Heart size={14} style={{ marginRight: 6, display: 'inline', verticalAlign: 'middle' }} /> Add child with {p.name || 'Unnamed'}
                  </button>
                ))}
                <button
                  className="rel-link"
                  onClick={() => setShowChildOptions(false)}
                  style={{ textAlign: 'center', color: 'var(--text-muted)', borderStyle: 'dashed' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="rel-btn"
                onClick={() => setShowChildOptions(true)}
                id="btn-add-child"
                title="Add a child"
              >
                <Baby size={16} />
                <span>Child</span>
              </button>
            )}
            <button
              className="rel-btn"
              onClick={handleAddSibling}
              id="btn-add-sibling"
              title="Add a sibling"
            >
              <Users size={16} />
              <span>Sibling</span>
            </button>
            <button
              className="rel-btn"
              onClick={handleAddPartner}
              id="btn-add-partner"
              title="Add a partner/spouse"
            >
              <Heart size={16} />
              <span>Partner</span>
            </button>
          </div>
        </div>

        {/* Person Form */}
        <div className="panel-section">
          <h3 className="section-title">Details</h3>
          <PersonForm person={person} />
        </div>

        {/* Relationships Summary */}
        {(parents.length > 0 || partners.length > 0 || children.length > 0 || siblings.length > 0) && (
          <div className="panel-section">
            <h3 className="section-title">Relationships</h3>
            <div className="relationships-list">
              {parents.length > 0 && (
                <div className="rel-group">
                  <span className="rel-label">Parents</span>
                  {parents.map((p) => p && (
                    <button
                      key={p.id}
                      className="rel-link"
                      onClick={() => selectPerson(p.id)}
                    >
                      {p.name || 'Unnamed'} {p.surnameNow || ''}
                    </button>
                  ))}
                </div>
              )}
              {partners.length > 0 && (
                <div className="rel-group">
                  <span className="rel-label">Partners</span>
                  {partners.map((p) => p && (
                    <button
                      key={p.id}
                      className="rel-link partner"
                      onClick={() => selectPerson(p.id)}
                    >
                      {p.name || 'Unnamed'} {p.surnameNow || ''}
                    </button>
                  ))}
                </div>
              )}
              {children.length > 0 && (
                <div className="rel-group">
                  <span className="rel-label">Children</span>
                  {children.map((cid) => {
                    const child = persons.get(cid);
                    return child ? (
                      <button
                        key={cid}
                        className="rel-link"
                        onClick={() => selectPerson(cid)}
                      >
                        {child.name || 'Unnamed'} {child.surnameNow || ''}
                      </button>
                    ) : null;
                  })}
                </div>
              )}
              {siblings.length > 0 && (
                <div className="rel-group">
                  <span className="rel-label">Siblings</span>
                  {siblings.map((sid) => {
                    const sib = persons.get(sid);
                    return sib ? (
                      <button
                        key={sid}
                        className="rel-link"
                        onClick={() => selectPerson(sid)}
                      >
                        {sib.name || 'Unnamed'} {sib.surnameNow || ''}
                      </button>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delete */}
        <div className="panel-section panel-danger-zone">
          <button
            className="delete-person-btn"
            onClick={handleDelete}
            id="btn-delete-person"
          >
            <Trash2 size={16} />
            <span>Delete {person.name || 'Person'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailPanel;