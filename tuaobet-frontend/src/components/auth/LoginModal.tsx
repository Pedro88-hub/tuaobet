import { LogIn } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { AuthForms } from './AuthForms';

export function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, openRegisterModal } = useAuth();

  const handleSwitchToRegister = () => {
    closeLoginModal();
    openRegisterModal();
  };

  return (
    <Modal
      isOpen={isLoginModalOpen}
      onClose={closeLoginModal}
      title="Entrar"
      subtitle="Use seu e-mail e senha para continuar a jogar."
      headerIcon={<LogIn size={20} strokeWidth={2} />}
    >
      <AuthForms mode="login" onSwitchMode={handleSwitchToRegister} />
    </Modal>
  );
}
