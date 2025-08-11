import { motion } from "framer-motion";

const Toggle = ({ checked, onChange, label }) => {
  return (
    <label className="flex items-center justify-between cursor-pointer group transition-all duration-300">
      <span className="body-2 text-n-3 transition-all duration-300">{label}</span>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <motion.div
          className={`w-12 h-6 rounded-full transition-all duration-300 hover:shadow-[0_0_10px_rgba(172,108,255,0.3)] ${
            checked 
              ? 'bg-gradient-to-r from-color-1 to-color-3 shadow-[0_0_15px_rgba(172,108,255,0.4)]' 
              : 'bg-n-6 hover:bg-n-5'
          }`}
        >
          <motion.div
            className="w-5 h-5 bg-white rounded-full shadow-lg absolute top-0.5"
            animate={{
              x: checked ? 26 : 2,
              scale: checked ? 1.1 : 1,
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30
            }}
          />
        </motion.div>
      </div>
    </label>
  );
};

export default Toggle;
