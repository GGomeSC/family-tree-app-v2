import React from 'react';
import { TreePine, Users, Download, Shield, Sparkles } from 'lucide-react';
import { useFamilyStore } from '../../store/familyStore';

/**
 * Landing hero screen shown when the user hasn't started building a tree.
 * Features a modern glassmorphism design with feature highlights.
 */
const LandingHero: React.FC = () => {
  const { startTree, addPerson, selectPerson, persons } = useFamilyStore();

  const handleStartTree = () => {
    startTree();
    if (persons.size === 0) {
      const id = addPerson({ name: 'Me', gender: 'male' });
      selectPerson(id);
    }
  };

  return (
    <div className="landing-hero" id="landing-hero">
      {/* Animated background elements */}
      <div className="hero-bg-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
      </div>

      <div className="hero-content">
        <div className="hero-icon">
          <TreePine size={48} />
        </div>

        <h1 className="hero-title">
          Family Tree
          <span className="hero-title-accent"> Builder</span>
        </h1>

        <p className="hero-subtitle">
          Create beautiful, interactive family trees right in your browser.
          <br />
          No sign-up required — your data stays local until you choose to save.
        </p>

        <button
          className="hero-cta"
          onClick={handleStartTree}
          id="btn-start-tree"
        >
          <Sparkles size={20} />
          <span>Start Building</span>
        </button>

        <div className="hero-features">
          <div className="feature-card">
            <div className="feature-icon">
              <Users size={24} />
            </div>
            <h3>Visual Editor</h3>
            <p>Drag, zoom, and connect family members on an interactive canvas</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Shield size={24} />
            </div>
            <h3>Privacy First</h3>
            <p>All data stored locally in your browser — nothing leaves your device</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Download size={24} />
            </div>
            <h3>Export as Image</h3>
            <p>Download your family tree as a high-quality PNG with one click</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingHero;
