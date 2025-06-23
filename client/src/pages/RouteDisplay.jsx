// pages/RouteDisplay.jsx
import React, {useEffect, useState} from 'react';
import config from '../config';

import { MapContainer, TileLayer } from 'react-leaflet';

// import componenets
import GpxLoader from '../components/GpxLoader';
import StatsCard from '../components/StatsCard';
import RoutePreferences from '../components/RoutePreferences';
import CueSheet from '../components/CueSheet';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Header from '../components/ui/Header';

export default function RouteDisplay() {
    const [cueSheet, setCueSheet] = useState([]);
    // default units = imperial
    const [unitSystem, setUnitSystem] = useState("imperial");
    // gpx info is in metric
    const [rawStats, setRawStats] = useState({ distanceKm: null, elevationM: null });
    // name of current route
    // TODO: possible AI integration can be naming routs
    const [routeName, setRouteName] = useState("Default Route");

    // route preferences/parameters
    // basic: starting point, target distance, target elevation
    // advanced: bike routes weight, poi weight
    // TODO: use location to set default starting point, otherwise make it city hall
    // TODO: default distace: 20 miles; default elevation: 1000ft
    const [preferences, setPreferences] = useState({
        startingPoint: null,
        endingPoint: null,
        distanceTarget: null,
        elevationTarget: null,
        bikeLanes: false,
        pointsOfInterest: false,
    });

    // generate routes when button clicked
    // TODO: implement, should run when triggered via button or page loads
    useEffect(() => {
        // TODO: create route to backend for route generation
    }, []);

    return (
        <div className="bg-base min-h-screen text-gray-800">
            <div className="w-full">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Sidebar - Route Preferences */}
                    <div className="lg:col-span-3">
                        <div className="space-y-4">
                            <RoutePreferences preferences={preferences} setPreferences={setPreferences} />
                            <Button className="w-full">
                                Generate Route
                            </Button>
                        </div>
                    </div>

                    {/* Center - Map and Route Name */}
                    <div className="lg:col-span-6 flex flex-col items-center space-y-4">
                        <Header className="font-semibold text-center" level={2}>{routeName}</Header>
                        <div className="w-full h-[400px] lg:h-[500px] xl:h-[600px] rounded-xl shadow-lg overflow-hidden">
                            <MapContainer className="h-full w-full" center={[39.95, -75.16]} zoom={13}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <GpxLoader onStatsReady={setRawStats} onCuesReady={setCueSheet} />
                            </MapContainer>
                        </div>
                    </div>

                    {/* Right Sidebar - Stats and Cue Sheet */}
                    <div className="lg:col-span-3">
                        <div className="space-y-4">
                            <Card>
                                <StatsCard stats={rawStats} unitSystem={unitSystem} setUnitSystem={setUnitSystem} />
                            </Card>
                            <CueSheet cueSheet={cueSheet} />
                            <Button as="a" href="/chill_hills.gpx" download="chill_hills.gpx" className="w-full">
                                Export GPX
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
