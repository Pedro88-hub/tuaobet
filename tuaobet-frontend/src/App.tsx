import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { HomePage } from './pages/HomePage';
import { CrashGame } from './pages/CrashGame'; // Mantendo o jogo Crash existente
import { MinesGame } from './pages/MinesGame';
import { DoubleGame } from './pages/DoubleGame';
import { PlinkoGame } from './pages/PlinkoGame';
import { DiceGame } from './pages/DiceGame';
import { BaccaratGame } from './pages/BaccaratGame';
import { TowerGame } from './pages/TowerGame';
import { Fairness } from './pages/institutional/Fairness';
import { SportsPage } from './pages/SportsPage';
import { AdminPage } from './pages/AdminPage';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/sports" element={<SportsPage />} />
            <Route path="/crash" element={<CrashGame />} />
            <Route path="/mines" element={<MinesGame />} />
            <Route path="/double" element={<DoubleGame />} />
            <Route path="/plinko" element={<PlinkoGame />} />
            <Route path="/dice" element={<DiceGame />} />
            <Route path="/tower" element={<TowerGame />} />
            <Route path="/baccarat" element={<BaccaratGame />} />
            <Route path="/fairness" element={<Fairness />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;