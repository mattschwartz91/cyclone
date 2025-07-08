// components/RoutePreferences.jsx
import Card from './ui/Card';
import Header from './ui/Header';
import Input from './ui/Input';
import Button from "./ui/Button.jsx";
import React from "react";

export default function RoutePreferences({ preferences, setPreferences }) {
    const handleChange = (field) => (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setPreferences((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <Card>
            <Header level={2}>Route Preferences</Header>
            <div className="space-y-2">
                <label className="block">
                    {/* TODO: integrate google autocomplete - https://www.npmjs.com/package/react-google-autocomplete?activeTab=readme */}
                    <input type="text" placeholder="Start Location" onChange={handleChange('startingPoint')} className="w-full px-3 py-2"  />
                </label>
                <label className="block">
                    {/* TODO: integrate google autocomplete */}
                    <input type="text" placeholder="End Location" onChange={handleChange('endingPoint')} className="w-full px-3 py-2"  />
                </label>

            </div>
            <div className="space-y-1">
                {/* TODO1: make the units consistent */}
                {/* TODO2: add option for numerical input */}
                <label className="font-medium block">Distance: {preferences.distanceTarget} mi</label>
                <div className="flex items-center gap-4">
                    <input
                        type="range"
                        min="0"
                        max="125"
                        step="5"
                        value={preferences.distanceTarget || 0}
                        onChange={handleChange('distanceTarget')}
                        className="w-full"
                    />
                </div>
            </div>
            <div className="space-y-1">
                {/* TODO1: make the units consistent */}
                {/* TODO2: add option for numerical input */}
                <label className="font-medium block">Elevation: {preferences.elevationTarget} ft</label>
                <div className="flex items-center gap-4">
                    <input
                        type="range"
                        min="0"
                        max="10000"
                        step="100"
                        value={preferences.elevationTarget || 0}
                        onChange={handleChange('elevationTarget')}
                        className="w-full"
                    />
                </div>
            </div>

            <div className="space-y-2">
                {/* TODO: Make this a popout of some kind */}
                <h2 className="font-medium block py-3">Additional Options:</h2>
                <label className="block">
                    <input type="checkbox" className="mr-2" checked={preferences.bikeLanes} onChange={handleChange('bikeLanes')} />
                    Prioritize bike lanes
                </label>
                <label className="block">
                    <input type="checkbox" className="mr-2" checked={preferences.pointsOfInterest} onChange={handleChange('pointsOfInterest')} />
                    Points of interest
                </label>

            </div>




        </Card>
    );
}
