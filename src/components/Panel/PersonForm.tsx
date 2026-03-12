import React, { useCallback, useRef } from 'react';
import type { Person } from '../../types/person';
import { useFamilyStore } from '../../store/familyStore';
import {
  Camera,
  X,
} from 'lucide-react';

interface PersonFormProps {
  person: Person;
}

/**
 * Form for editing all attributes of a selected person.
 * Changes are debounced and saved to the store on each field change.
 */
const PersonForm: React.FC<PersonFormProps> = ({ person }) => {
  const { updatePerson } = useFamilyStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (field: keyof Person, value: string | boolean) => {
      updatePerson(person.id, { [field]: value });
    },
    [person.id, updatePerson]
  );

  const handleAvatarUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        updatePerson(person.id, { avatarUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    },
    [person.id, updatePerson]
  );

  const handleRemoveAvatar = useCallback(() => {
    updatePerson(person.id, { avatarUrl: '' });
  }, [person.id, updatePerson]);

  return (
    <div className="person-form" id="person-form">
      {/* Avatar Section */}
      <div className="form-avatar-section">
        <div className="form-avatar" onClick={() => fileInputRef.current?.click()}>
          {person.avatarUrl ? (
            <>
              <img src={person.avatarUrl} alt={person.name} />
              <button
                className="avatar-remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveAvatar();
                }}
                title="Remove photo"
              >
                <X size={12} />
              </button>
            </>
          ) : (
            <div className="avatar-upload-placeholder">
              <Camera size={24} />
              <span>Add photo</span>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          style={{ display: 'none' }}
          id="avatar-upload-input"
        />
      </div>

      {/* Name Fields */}
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="field-name">First Name</label>
          <input
            id="field-name"
            type="text"
            value={person.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="First name"
          />
        </div>
      </div>

      <div className="form-row two-cols">
        <div className="form-field">
          <label htmlFor="field-surname-now">Current Surname</label>
          <input
            id="field-surname-now"
            type="text"
            value={person.surnameNow}
            onChange={(e) => handleChange('surnameNow', e.target.value)}
            placeholder="Current surname"
          />
        </div>
        <div className="form-field">
          <label htmlFor="field-surname-birth">Birth Surname</label>
          <input
            id="field-surname-birth"
            type="text"
            value={person.surnameAtBirth}
            onChange={(e) => handleChange('surnameAtBirth', e.target.value)}
            placeholder="Maiden/birth name"
          />
        </div>
      </div>

      {/* Gender */}
      <div className="form-row">
        <div className="form-field">
          <label>Gender</label>
          <div className="gender-toggle" id="gender-toggle">
            <button
              className={`gender-btn ${person.gender === 'male' ? 'active male' : ''}`}
              onClick={() => handleChange('gender', 'male')}
              type="button"
            >
              Male
            </button>
            <button
              className={`gender-btn ${person.gender === 'female' ? 'active female' : ''}`}
              onClick={() => handleChange('gender', 'female')}
              type="button"
            >
              Female
            </button>
          </div>
        </div>
      </div>

      {/* Deceased Toggle */}
      <div className="form-row">
        <div className="form-field checkbox-field">
          <label className="checkbox-label" htmlFor="field-deceased">
            <input
              id="field-deceased"
              type="checkbox"
              checked={person.deceased}
              onChange={(e) => handleChange('deceased', e.target.checked)}
            />
            <span className="checkbox-custom" />
            <span>Deceased</span>
          </label>
        </div>
      </div>

      {/* Dates */}
      <div className="form-row two-cols">
        <div className="form-field">
          <label htmlFor="field-dob">Date of Birth</label>
          <input
            id="field-dob"
            type="date"
            value={person.dob}
            onChange={(e) => handleChange('dob', e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="field-dod">Date of Death</label>
          <input
            id="field-dod"
            type="date"
            value={person.dod}
            onChange={(e) => handleChange('dod', e.target.value)}
            disabled={!person.deceased}
          />
        </div>
      </div>

      {/* Country & Profession */}
      <div className="form-row two-cols">
        <div className="form-field">
          <label htmlFor="field-country">Country of Birth</label>
          <input
            id="field-country"
            type="text"
            value={person.countryOfBirth}
            onChange={(e) => handleChange('countryOfBirth', e.target.value)}
            placeholder="e.g. Brazil"
          />
        </div>
        <div className="form-field">
          <label htmlFor="field-profession">Profession</label>
          <input
            id="field-profession"
            type="text"
            value={person.profession}
            onChange={(e) => handleChange('profession', e.target.value)}
            placeholder="e.g. Engineer"
          />
        </div>
      </div>

      {/* Interesting Facts */}
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="field-facts">Interesting Facts</label>
          <textarea
            id="field-facts"
            value={person.interestingFacts}
            onChange={(e) => handleChange('interestingFacts', e.target.value)}
            placeholder="Notable achievements, hobbies, stories..."
            rows={3}
          />
        </div>
      </div>

      {/* Read-only ID */}
      <div className="form-row">
        <div className="form-field id-field">
          <label>ID</label>
          <code className="person-id">{person.id}</code>
        </div>
      </div>
    </div>
  );
};

export default PersonForm;
