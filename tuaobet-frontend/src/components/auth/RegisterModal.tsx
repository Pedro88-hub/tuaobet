import { UserPlus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { AuthForms } from './AuthForms';

export function RegisterModal() {
  const { isRegisterModalOpen, closeRegisterModal, openLoginModal } = useAuth();

  const handleSwitchToLogin = () => {
    closeRegisterModal();
    openLoginModal();
  };

  return (
    <Modal
      isOpen={isRegisterModalOpen}
      onClose={closeRegisterModal}
      title="Criar conta"
      subtitle="Regista-te em segundos e recebe bónus de boas-vindas para começar."
      headerIcon={<UserPlus size={20} strokeWidth={2} />}
    >
      <AuthForms mode="register" onSwitchMode={handleSwitchToLogin} />
    </Modal>
  );
}
