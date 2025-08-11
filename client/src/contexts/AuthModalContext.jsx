import { createContext, useContext, useState } from 'react';

const AuthModalContext = createContext();

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
};

export const AuthModalProvider = ({ children }) => {
  const [authModal, setAuthModal] = useState({ isOpen: false, type: 'signup' });

  const openAuthModal = (type) => {
    setAuthModal({ isOpen: true, type });
  };

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, type: 'signup' });
  };

  const switchAuthType = (type) => {
    setAuthModal({ isOpen: true, type });
  };

  return (
    <AuthModalContext.Provider
      value={{
        authModal,
        openAuthModal,
        closeAuthModal,
        switchAuthType,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
};
