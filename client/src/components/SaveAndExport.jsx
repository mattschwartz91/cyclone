import { motion } from "framer-motion";
import { useState } from "react";
import Button from "./Button";
import { generateGpxFile } from "../utils/routeApi";
import { ChevronDown } from 'lucide-react';

export default function SaveAndExport({
    routeData,
    stats,
    canExport = true,
    exportButtonText = "Export GPX",
    title = "Export Route"
}) {
    const [gpxName, setGpxName] = useState(routeData?.gpt_metadata?.gpt_route_name || "");
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    // Default canExport logic if not provided
    const shouldAllowExport = canExport !== undefined ? canExport : (routeData && routeData.route && Array.isArray(routeData.route) && routeData.route.length > 0);

    const handleExportGpx = () => {
        if (!shouldAllowExport) {
            console.warn("No route data available for export");
            return;
        }

        console.log("Exporting route as GPX...", routeData);
        const routeName = gpxName || routeData?.gpt_metadata?.gpt_route_name || null;
        console.log("Route name for export:", routeName);
        generateGpxFile(routeData.route, routeName);
    };

    const getExportButtonText = () => {
        if (!shouldAllowExport) return "No Route to Export";
        return exportButtonText;
    };

    return (
        <motion.div
            className="relative p-4 bg-n-8/40 backdrop-blur-sm rounded-2xl border border-n-2/20 transition-all duration-300 hover:border-color-1/50 hover:shadow-[0_0_25px_rgba(172,108,255,0.3)] hover:scale-105"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.1, ease: "easeOut" }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
        >
            <h3 className="h3 mb-4 text-n-1">{title}</h3>

            {/* Route Name and Description Display */}
            {stats?.routeName && (
                <motion.div 
                    className="mb-4 p-3 bg-gradient-to-r from-color-1/10 to-color-2/10 border border-color-1/20 rounded-xl"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => stats?.routeDescription && setIsDescriptionExpanded(!isDescriptionExpanded)}
                    >
                        <h4 className="text-lg font-semibold text-color-1">{stats.routeName}</h4>
                        {stats?.routeDescription && (
                            <motion.div
                                animate={{ rotate: isDescriptionExpanded ? 180 : 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="ml-2"
                            >
                                <ChevronDown className="w-5 h-5 text-color-1" />
                            </motion.div>
                        )}
                    </div>
                    
                    {stats?.routeDescription && (
                        <motion.div
                            initial={false}
                            animate={{ 
                                height: isDescriptionExpanded ? "auto" : 0,
                                opacity: isDescriptionExpanded ? 1 : 0
                            }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                        >
                            <p className="text-sm text-n-3 mt-2 pt-2 border-t border-color-1/10">
                                {stats.routeDescription}
                            </p>
                        </motion.div>
                    )}
                </motion.div>
            )}

            {/* Export GPX Section */}
            <div className="space-y-2">
                <label htmlFor="gpxName" className="body-2 text-n-3 block">
                    GPX Export Name (Optional)
                </label>
                <div className="flex gap-4 items-end flex-wrap">
                    <input
                        id="gpxName"
                        type="text"
                        placeholder="Enter GPX filename..."
                        value={gpxName}
                        onChange={(e) => setGpxName(e.target.value)}
                        className="flex-1 min-w-[220px] px-3 py-1.5 bg-n-7 border border-n-6 rounded-xl text-n-1 placeholder-n-4 focus:border-color-1 focus:outline-none transition-all duration-300 focus:shadow-[0_0_15px_rgba(172,108,255,0.3)]"
                        aria-label="GPX filename for export"
                    />
                    <Button
                        onClick={handleExportGpx}
                        disabled={!shouldAllowExport}
                        white
                        className="px-6 self-start"
                    >
                        {getExportButtonText()}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}