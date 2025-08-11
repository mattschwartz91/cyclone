import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';

const AuthModal = ({ isOpen, onClose, type, onSwitchType }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement actual authentication logic
    console.log(`${type} submitted:`, formData);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Glassy backdrop */}
          <div className="absolute inset-0 bg-n-8/60 backdrop-blur-md" />
          
          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative backdrop-blur-sm bg-n-8/80 border border-n-2/20 p-8 rounded-2xl shadow-xl max-w-md w-full hover:border-color-1/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(172,108,255,0.3)]"
            onClick={(e) => e.stopPropagation()}
            whileHover={{ 
              scale: 1.02,
              transition: { duration: 0.2 }
            }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-n-3 hover:text-n-1 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <motion.h1
              className="text-center text-n-1 text-2xl font-bold mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {type === 'login' ? 'Sign In' : 'Create Account'}
            </motion.h1>

            <motion.form
              className="w-full flex flex-col space-y-6 font-medium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              onSubmit={handleSubmit}
            >
              {type === 'signup' && (
                <input
                  className="w-full px-4 py-3 bg-n-7/50 border border-n-6 rounded-xl text-n-1 placeholder-n-3 focus:border-color-1 focus:outline-none transition-all duration-300 focus:shadow-[0_0_15px_rgba(172,108,255,0.3)] focus:scale-105 backdrop-blur-sm"
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                />
              )}
              
              <input
                className="w-full px-4 py-3 bg-n-7/50 border border-n-6 rounded-xl text-n-1 placeholder-n-3 focus:border-color-1 focus:outline-none transition-all duration-300 focus:shadow-[0_0_15px_rgba(172,108,255,0.3)] focus:scale-105 backdrop-blur-sm"
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              
              <input
                className="w-full px-4 py-3 bg-n-7/50 border border-n-6 rounded-xl text-n-1 placeholder-n-3 focus:border-color-1 focus:outline-none transition-all duration-300 focus:shadow-[0_0_15px_rgba(172,108,255,0.3)] focus:scale-105 backdrop-blur-sm"
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />

              <Button className="w-full mt-4" type="submit">
                {type === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </motion.form>

            <motion.div
              className="text-center mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <p className="text-n-3">
                {type === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => onSwitchType(type === 'login' ? 'signup' : 'login')}
                  className="text-color-1 hover:text-color-2 transition-colors underline"
                >
                  {type === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
