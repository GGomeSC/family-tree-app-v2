import { useEffect } from 'react';
import { useFamilyStore } from './store/familyStore';
import FamilyCanvas from './components/Canvas/FamilyCanvas';
import CanvasToolbar from './components/Toolbar/CanvasToolbar';
import DetailPanel from './components/Panel/DetailPanel';
import LandingHero from './components/Landing/LandingHero';

function App() {
  const { hasStarted, loadFromStorage } = useFamilyStore();

  // Load persisted data on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  if (!hasStarted) {
    return <LandingHero />;
  }

  return (
    <div className="app-layout" id="app-layout">
      <CanvasToolbar />
      <div className="app-body">
        <DetailPanel />
        <FamilyCanvas />
      </div>
    </div>
  );
}

export default App;