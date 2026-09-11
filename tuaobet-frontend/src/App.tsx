import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { HomePage } from './pages/HomePage';
import { CrashGame } from './pages/CrashGame'; // Mantendo o jogo Crash existente
import { MinesGame } from './pages/MinesGame';
import { DoubleGame } from './pages/DoubleGame';
import { PlinkoGame } from './pages/PlinkoGame';
import { DiceGame } from './pages/DiceGame';
import { TowerGame } from './pages/TowerGame';
import { Fairness } from './pages/institutional/Fairness';
import { InstitutionalStub } from './pages/institutional/InstitutionalStub';
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
            <Route path="/fairness" element={<Fairness />} />
            <Route path="/termos" element={<InstitutionalStub title="Termos de Serviço" />} />
            <Route path="/privacidade" element={<InstitutionalStub title="Política de Privacidade" />} />
            <Route path="/afiliados" element={<InstitutionalStub title="Termos e Condições de Afiliados" />} />
            <Route path="/regras-esportivas" element={<InstitutionalStub title="Regras de Apostas Esportivas" />} />
            <Route path="/kyc" element={<InstitutionalStub title="Política KYC" />} />
            <Route path="/aml" element={<InstitutionalStub title="Política AML" />} />
            <Route path="/jogo-responsavel" element={<InstitutionalStub title="Jogo Responsável" />} />
            <Route path="/apoio" element={<InstitutionalStub title="Central de Apoio ao Jogador" />} />
            <Route path="/cookies" element={<InstitutionalStub title="Preferências de Cookies" />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;