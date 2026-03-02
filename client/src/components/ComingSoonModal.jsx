import { motion, AnimatePresence } from 'framer-motion';
import { Rocket } from 'lucide-react';
import Button from './Button';

const ComingSoonModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
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
            onClick={onClose}
            className="absolute top-4 right-4 text-n-3 hover:text-n-1 transition-colors"
          >
            ✕
          </button>

          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              className="w-16 h-16 rounded-full bg-color-1/10 border border-color-1/30 flex items-center justify-center mb-6"
            >
              <Rocket className="w-8 h-8 text-color-1" />
            </motion.div>

            <h2 className="font-code text-2xl font-bold text-n-1 uppercase tracking-wider mb-3">
              Coming Soon
            </h2>

            <p className="text-n-3 body-2 mb-2">
              User accounts are currently under development.
            </p>
            <p className="text-n-3 body-2 mb-8">
              Check back soon for profiles, saved routes, and more!
            </p>

            <div className="w-full h-px bg-gradient-to-r from-transparent via-color-1/40 to-transparent mb-6" />

            <Button onClick={onClose} white>
              Got it
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ComingSoonModal;
