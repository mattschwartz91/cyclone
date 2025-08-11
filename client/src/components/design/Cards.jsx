import { useState } from "react";
import { motion } from "framer-motion";


const Cards = ({ title, text, icon }) => {
  const [glow, setGlow] = useState(true);

  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 1.2, ease: "easeOut" },
    },
  };
  const handleAnimationComplete = () => {
    setGlow(false);
  };

  return (
    <motion.div
      className={`relative p-6 bg-n-8/40 backdrop-blur-sm rounded-2xl border transition-all duration-300 hover:border-color-1/50 hover:shadow-[0_0_25px_rgba(172,108,255,0.3)] hover:scale-105 cursor-pointer ${glow ? 'border-color-1/50' : 'border-n-2/20'}`}
      variants={cardVariants}
      onAnimationComplete={handleAnimationComplete}
      whileHover={{ 
        scale: 1.05,
        transition: { duration: 0.2 }
      }}
    >
      <div className="flex items-center justify-center w-12 h-12 mb-4 bg-gradient-to-br from-color-1/20 to-color-3/20 rounded-xl">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-n-1">{title}</h3>
      <p className="text-n-3 leading-relaxed">{text}</p>
    </motion.div>
  );
};
export default Cards;