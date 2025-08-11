// components/CueSheet.jsx
import { motion } from "framer-motion";
import ArrowLeftIcon from "../assets/svg/ArrowLeftIcon";
import ArrowRightIcon from "../assets/svg/ArrowRightIcon";
import ArrowUpIcon from "../assets/svg/ArrowUpIcon";
import ArrowUturnDownIcon from "../assets/svg/ArrowUTurnIcon";
import MapPinIcon from "../assets/svg/MapPinIcon";

// Direction type mapping for icons
const getDirectionIcon = (type) => {
  const iconMap = {
    0: <ArrowLeftIcon className="w-6 h-6" />, // Left turn
    1: <ArrowRightIcon className="w-6 h-6" />, // Right turn
    2: <ArrowRightIcon className="w-6 h-6" />, // Sharp right
    3: <ArrowLeftIcon className="w-6 h-6" />, // Sharp left (this was missing)
    4: <ArrowLeftIcon className="w-6 h-6" />, // Slight left
    5: <ArrowRightIcon className="w-6 h-6" />, // Slight right
    6: <ArrowUpIcon className="w-6 h-6" />, // Continue
    7: <MapPinIcon className="w-6 h-6" />, // Enter roundabout
    8: <MapPinIcon className="w-6 h-6" />, // Exit roundabout
    9: <ArrowUturnDownIcon className="w-6 h-6" />, // U-turn
    10: <MapPinIcon className="w-6 h-6" />, // Destination (use map pin instead of arrow)
    11: <MapPinIcon className="w-6 h-6" />, // Start (use map pin instead of arrow)
    12: <ArrowLeftIcon className="w-6 h-6" />, // Keep left
    13: <ArrowRightIcon className="w-6 h-6" />, // Keep right
  };

  return iconMap[type] || <ArrowUpIcon className="w-6 h-6" />;
};

const formatDuration = (seconds) => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}min`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}h ${minutes}min`;
  }
};

export default function CueSheet({ cueSheet, instructions = [] }) {
  const rawInstructions = instructions.length > 0 ? instructions : 
    (cueSheet || []).map((step, idx) => ({
      instruction: step,
      distance: "",
      type: idx === 0 ? 11 : (idx === cueSheet.length - 1 ? 10 : 6),
      duration: 0
    }));

  // Filter out duplicate instructions
  const displayInstructions = rawInstructions
    .filter((step, index, self) => {
      const isDuplicate = index !== self.findIndex((s) => s.instruction === step.instruction);
      if (isDuplicate) return false;
      
      if (step.instruction === "Arrive at destination") {
        const hasDetailedDestination = self.some(s => s.instruction === "Arrive at your destination");
        if (hasDetailedDestination) return false;
      }
      
      return true;
    });

  return (
    <motion.div
      className="relative p-6 bg-n-8/40 backdrop-blur-sm rounded-2xl border border-n-2/20 transition-all duration-300 hover:border-color-1/50 hover:shadow-[0_0_25px_rgba(172,108,255,0.3)] hover:scale-105"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
      viewport={{ once: true }}
      whileHover={{ 
        scale: 1.05,
        transition: { duration: 0.2 }
      }}
    >
      <h3 className="h3 mb-4 text-n-1">Cue Sheet</h3>
      
      {displayInstructions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="text-center">
            <motion.div
              className="w-12 h-12 mx-auto mb-4 text-n-4"
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.5, 1, 0.5] 
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut" 
              }}
            >
              <svg fill="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </motion.div>
            <p className="body-2 text-n-4">Generate a route to see turn-by-turn directions</p>
          </div>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          <div className="space-y-3">
            {displayInstructions.map((step, idx) => {
              const isStart = step.type === 11;
              const isEnd = step.type === 10;
              const icon = getDirectionIcon(step.type);
              
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`flex items-start p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
                    isStart || isEnd
                      ? 'bg-n-7/50 border-n-6/50 hover:border-color-1/50 hover:shadow-[0_0_15px_rgba(172,108,255,0.2)]' 
                      : 'bg-n-7/50 border-n-6/50 hover:border-color-1/50 hover:shadow-[0_0_15px_rgba(172,108,255,0.2)]'
                  }`}
                >
                  {/* Direction Icon */}
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full mr-4 flex-shrink-0 text-lg font-bold ${
                    isStart || isEnd
                      ? 'bg-color-1/20 text-color-1' 
                      : 'bg-color-1/20 text-color-1'
                  }`}>
                    {icon}
                  </div>
                  
                  {/* Instruction Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className={`body-2 font-medium leading-relaxed ${
                        isStart || isEnd
                          ? 'text-n-1' 
                          : 'text-n-1'
                      }`}>
                        {step.instruction}
                      </p>
                      
                      {/* Distance and Duration */}
                      {step.distance && (
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-semibold text-color-1">
                            {step.distance}
                          </div>
                          {step.duration > 0 && (
                            <div className="text-xs text-n-4">
                              {formatDuration(step.duration)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
