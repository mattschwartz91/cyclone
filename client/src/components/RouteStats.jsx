import { motion } from "framer-motion";

export default function RouteStats({ stats, unitSystem, setUnitSystem }) {
    return (
        <motion.div
            className="relative p-6 bg-n-8/40 backdrop-blur-sm rounded-2xl border border-n-2/20 transition-all duration-300 hover:border-color-1/50 hover:shadow-[0_0_25px_rgba(172,108,255,0.3)] hover:scale-105"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.1, ease: "easeOut" }}
            viewport={{ once: true }}
            whileHover={{ 
                scale: 1.05,
                transition: { duration: 0.2 }
            }}
        >
            <h3 className="h3 mb-4 text-n-1">Route Stats</h3>
            
            {stats.distanceKm !== null ? (
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="body-2 text-n-3">Distance:</span>
                        <span className="body-1 text-color-1 font-semibold">
                            {unitSystem === 'imperial'
                                ? (stats.distanceKm * 0.621371).toFixed(2) + ' mi'
                                : stats.distanceKm.toFixed(2) + ' km'}
                        </span>
                    </div>
                    {stats.totalRideTime && (
                        <div className="flex justify-between items-center">
                            <span className="body-2 text-n-3">Ride Time:</span>
                            <span className="body-1 text-color-1 font-semibold">
                                {stats.totalRideTime}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="body-2 text-n-3">Elevation Gain:</span>
                        <span className="body-1 text-color-1 font-semibold">
                            {unitSystem === 'imperial'
                                ? (stats.elevationM * 3.28084).toFixed(0) + ' ft'
                                : stats.elevationM.toFixed(0) + ' m'}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                        <motion.div
                            className="w-12 h-12 mx-auto mb-4 text-n-4"
                            animate={{ 
                                scale: [1, 1.1, 1],
                                rotate: [0, 180, 360] 
                            }}
                            transition={{ 
                                duration: 3, 
                                repeat: Infinity,
                                ease: "easeInOut" 
                            }}
                        >
                            <svg fill="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                                <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z" />
                            </svg>
                        </motion.div>
                        <p className="body-2 text-n-4">Route statistics will appear here</p>
                    </div>
                </div>
            )}
            
            <button
                onClick={() => setUnitSystem(prev => prev === 'imperial' ? 'metric' : 'imperial')}
                className="w-full mt-4 px-4 py-2 bg-n-7 hover:bg-n-6 border border-n-6 hover:border-color-1 rounded-xl text-n-3 hover:text-color-1 transition-all duration-300 hover:shadow-[0_0_15px_rgba(172,108,255,0.2)] hover:scale-105"
            >
                Switch to {unitSystem === 'imperial' ? 'Metric' : 'Imperial'}
            </button>
        </motion.div>
    );
}
