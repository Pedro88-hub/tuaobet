import { Layout } from '../components/layout/Layout';
import { GameMaintenanceScreen } from '../components/games/GameMaintenanceScreen';

/** Tower ainda não está disponível — card na home aponta para esta tela. */
export function TowerGame() {
  return (
    <Layout>
      <GameMaintenanceScreen gameName="Tower" />
    </Layout>
  );
}
