import { createContext, useContext, useState } from 'react';
import ComingSoonModal from '../components/ComingSoonModal';

const AuthModalContext = createContext();

const MODAL_TYPES = {
  SIGNUP: 'signup',
  LOGIN: 'login',
  LOGOUT: 'logout',
};

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
};

export const AuthModalProvider = ({ children }) => {
  const [authModal, setAuthModal] = useState({
    isOpen: false,
    type: MODAL_TYPES.SIGNUP,
  });

  const openAuthModal = (_type) => {
    // All auth actions now show the Coming Soon modal
    setAuthModal({ isOpen: true, type: 'coming-soon' });
  };

  const closeAuthModal = () => {
    setAuthModal(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <AuthModalContext.Provider
      value={{
        authModal,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
      <ComingSoonModal isOpen={authModal.isOpen} onClose={closeAuthModal} />
    </AuthModalContext.Provider>
  );
};
