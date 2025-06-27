// pages/RouteDisplay.jsx
import React, {useEffect, useState} from 'react';
import config from '../config';

import { MapContainer, TileLayer } from 'react-leaflet';

// import componenets
import GpxLoader from '../components/GpxLoader';
import StatsCard from '../components/StatsCard';
import RoutePreferences from '../components/RoutePreferences';
import CueSheet from '../components/CueSheet';
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

    // Le - user sign in
    const user = JSON.parse(localStorage.getItem('user'));

    // generate routes when button clicked
    // TODO: implement, should run when triggered via button or page loads
    useEffect(() => {
        // TODO: create route to backend for route generation
    }, []);

    return (
    <div className="min-h-screen bg-gray-100 p-4">
      <Header level={2} className="text-2xl font-bold mb-4">Your Routes</Header>
      <GpxLoader setWaypoints={setWaypoints} setRawStats={setRawStats} setCueSheet={setCueSheet} />
      <RoutePreferences />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="col-span-1">
          <Map waypoints={waypoints} />
        </Card>
        <Card className="col-span-1">
          <StatsCard rawStats={rawStats} />
          <CueSheet cues={cueSheet} />
        </Card>
      </div>
    </div>
  );
}