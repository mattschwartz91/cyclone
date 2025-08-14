import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';

//TODO fix bug with registration showing red text on success
const AuthModal = () => {
  const { login, register, logout } = useAuth();
  const { authModal, closeAuthModal, openAuthModal } = useAuthModal();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    passwordConf: ''
  });
  const [message, setMessage] = useState('');
  const [ok, setOk] = useState(false);

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    const { username, password, passwordConf } = formData;

    if (authModal.type === 'login') {
      const result = await login(username, password);
      if (result.ok) {
        setMessage('Logged in successfully!');
        setOk(true);
        setTimeout(() => {
          closeAuthModal();
          setFormData({ username: '', password: '', passwordConf: '' });
        }, 1500);
      } else {
        setOk(false);
        setMessage(result.message || 'Login failed');
      }
    } else if (authModal.type === 'signup') {
      if (password !== passwordConf) {
        setMessage('Passwords do not match');
        return;
      }
      const result = await register(username, password, passwordConf);
      if (result.ok) {
        setMessage('Registered successfully! Please log in.');
        setOk(true);
        setTimeout(() => {
          openAuthModal('login');
          setFormData({ username: '', password: '', passwordConf: '' });
        }, 1500);
      } else {
        setOk(false);
        setMessage(result.message || 'Registration failed');
      }
    }
  };

  // Reset message and ok when modal closes
  useEffect(() => {
    if (!authModal.isOpen) {
      setMessage('');
      setOk(false);
    }
  }, [authModal.isOpen]);

  if (!authModal.isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={closeAuthModal}
      >
        <div className="absolute inset-0 bg-n-8/60 backdrop-blur-md" />
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          className="relative backdrop-blur-sm bg-n-8/80 border border-n-2/20 p-8 rounded-2xl shadow-xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 text-n-3 hover:text-n-1 transition-colors"
          >
            ✕
          </button>

          {authModal.type === 'logout' ? (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Confirm Logout</h2>
              <p className="mb-6">Are you sure you want to log out?</p>
              <div className="flex justify-center gap-4">
                <Button
                  onClick={async () => {
                    await logout();
                    closeAuthModal();
                  }}
                >
                  Yes, log me out
                </Button>
                <Button onClick={closeAuthModal}>Cancel</Button>
              </div>
              
            </div>
          ) : (
            <>
              <h1 className="text-center text-n-1 text-2xl font-bold mb-8">
                {authModal.type === 'login' ? 'Sign In' : 'Create Account'}
              </h1>
              <form className="w-full flex flex-col space-y-6 font-medium" onSubmit={handleSubmit}>
                <input
                  className="w-full px-4 py-3 bg-n-7/50 border border-n-6 rounded-xl text-n-1 placeholder-n-3"
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                />
                <input
                  className="w-full px-4 py-3 bg-n-7/50 border border-n-6 rounded-xl text-n-1 placeholder-n-3"
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
                {authModal.type === 'signup' && (
                  <input
                    className="w-full px-4 py-3 bg-n-7/50 border border-n-6 rounded-xl text-n-1 placeholder-n-3"
                    type="password"
                    name="passwordConf"
                    placeholder="Confirm Password"
                    value={formData.passwordConf}
                    onChange={handleInputChange}
                    required
                  />
                )}
                {message && (
                  <p
                    className={`text-center ${ok ? 'text-green-500' : 'text-red-500'}`}
                  >
                    {message}
                  </p>
                  )}

                <Button className="w-full mt-4" type="submit">
                  {authModal.type === 'login' ? 'Sign In' : 'Create Account'}
                </Button>
              </form>

              <div className="text-center mt-6">
                <p className="text-n-3">
                  {authModal.type === 'login' ? "Don't have an account? " : 'Already have an account? '}
                  <button
                    onClick={() => onSwitchType(authModal.type === 'login' ? 'signup' : 'login')}
                    className="text-color-1 hover:text-color-2 transition-colors underline"
                  >
                    {authModal.type === 'login' ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
    
  );
};

export default AuthModal;
