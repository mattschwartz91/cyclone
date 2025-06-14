// src/pages/RouteDisplay.jsx
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-gpx';

function GpxLoader({ onStatsReady, onCuesReady }) {
    const map = useMap();

    useEffect(() => {
        const gpx = new L.GPX('/chill_hills.gpx', {
            async: true,
            marker_options: {
                startIconUrl: null,
                endIconUrl: null,
                shadowUrl: null,
            },
            polyline_options: {
                color: '#4ED7F1',
                weight: 4,
            },
        });

        gpx.on('loaded', function (e) {
            map.fitBounds(e.target.getBounds());

            // raw metric stats
            const distanceKm = e.target.get_distance() / 1000;
            const elevationM = e.target.get_elevation_gain();

            onStatsReady({
                distanceKm,
                elevationM
            });

            // Cue sheet
            const cues = e.target.get_segments().flatMap((seg) =>
                seg.points.map((pt) => pt.name).filter(Boolean)
            );
            onCuesReady(cues);
        });

        gpx.addTo(map);
    }, [map, onStatsReady, onCuesReady]);

    return null;
}


export default function RouteDisplay() {
    const [cueSheet, setCueSheet] = useState([]);
    const [unitSystem, setUnitSystem] = useState("imperial");
    const [rawStats, setRawStats] = useState({ distanceKm: null, elevationM: null });


    return (
        <div className="bg-base min-h-screen text-gray-800">
            <div className="max-w-screen-xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-4 p-4">
                {/* Left Column – Stats + Route Preferences stacked */}
                <div className="col-span-1 flex flex-col gap-4">
                    {/* Stats */}
                    <div className="bg-accent p-4 rounded-xl shadow-md flex-1 space-y-2">
                        <h2 className="text-base md:text-lg font-bold">Stats</h2>

                        {rawStats.distanceKm !== null ? (
                            <>
                                <p>
                                    Distance:{' '}
                                    {unitSystem === 'imperial'
                                        ? (rawStats.distanceKm * 0.621371).toFixed(2) + ' mi'
                                        : rawStats.distanceKm.toFixed(2) + ' km'}
                                </p>
                                <p>
                                    Elevation Gain:{' '}
                                    {unitSystem === 'imperial'
                                        ? (rawStats.elevationM * 3.28084).toFixed(0) + ' ft'
                                        : rawStats.elevationM.toFixed(0) + ' m'}
                                </p>
                            </>
                        ) : (
                            <p>Loading...</p>
                        )}

                        {/* Unit Toggle */}
                        <button
                            onClick={() =>
                                setUnitSystem((prev) => (prev === 'imperial' ? 'metric' : 'imperial'))
                            }
                            className="block w-full text-center px-4 py-2 mt-2 bg-primary text-white rounded shadow hover:bg-[#3bc6df] transition"
                        >
                            Switch to {unitSystem === 'imperial' ? 'metric' : 'imperial'}
                        </button>
                    </div>

                    {/* Route Preferences */}
                    <div className="bg-accent p-4 rounded-xl shadow-md flex-1 space-y-4">
                        <h2 className="text-base md:text-lg font-bold">Route Preferences</h2>

                        {/* Checkboxes */}
                        <div className="space-y-2">
                            <label className="block">
                                <input type="checkbox" className="mr-2" />
                                Avoid hills
                            </label>
                            <label className="block">
                                <input type="checkbox" className="mr-2" />
                                Use bike lanes
                            </label>
                        </div>

                        {/* Distance Range */}
                        <div className="space-y-1">
                            <label className="font-medium block">Distance (mi)</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Min"
                                    className="w-1/2 p-1 rounded border"
                                />
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Max"
                                    className="w-1/2 p-1 rounded border"
                                />
                            </div>
                        </div>

                        {/* Elevation Gain Range */}
                        <div className="space-y-1">
                            <label className="font-medium block">Elevation Gain (ft)</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Min"
                                    className="w-1/2 p-1 rounded border"
                                />
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Max"
                                    className="w-1/2 p-1 rounded border"
                                />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Map */}
                <div className="col-span-3 flex flex-col items-center space-y-2">
                    <div className="font-medium text-center w-full">Route Name</div>
                    <MapContainer className="h-[300px] md:h-[400px] w-full rounded-xl shadow-md z-0" center={[39.95, -75.16]} zoom={13}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <GpxLoader onStatsReady={setRawStats} onCuesReady={setCueSheet} />
                    </MapContainer>
                </div>

                {/* Cue Sheet */}
                <div className="col-span-1 bg-highlight p-4 rounded-xl shadow-md min-h-[300px] md:min-h-[500px] flex flex-col justify-between">
                    <div className="space-y-2 overflow-auto flex-1">
                        <h2 className="text-base md:text-lg font-bold">Cue Sheet</h2>

                        {cueSheet.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full space-y-4">
                                <p className="text-sm text-gray-700">No directions available</p>
                                <img
                                    src="/lost.jpg"
                                    alt="No directions"
                                    className="w-full object-contain rounded"
                                />
                            </div>
                        ) : (
                            <ul className="text-sm list-disc pl-4 space-y-1">
                                {cueSheet.map((step, idx) => (
                                    <li key={idx}>{step}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Export Button aligned under Cue Sheet */}
                <div className="col-span-1">
                    <a
                        href="/chill_hills.gpx"
                        download="chill_hills.gpx"
                        className="block w-full text-center px-4 py-2 mt-2 bg-primary text-white rounded shadow hover:bg-[#3bc6df] transition"
                    >
                        Export GPX
                    </a>
                </div>


            </div>
        </div>
    );
}
