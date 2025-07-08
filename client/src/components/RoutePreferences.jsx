// components/RoutePreferences.jsx
import Card from './ui/Card';
import Header from './ui/Header';
import Input from './ui/Input';
import Button from "./ui/Button.jsx";
import React, { useState, useEffect } from "react";

export default function RoutePreferences({ preferences, setPreferences }) {

    const [startAddress, setStartAddress] = useState('');
    const [endAddress, setEndAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [geocodeError, setGeocodeError] = useState('');

    const geocode = async (query) => {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data && data.length > 0) {
            return [parseFloat(data[0].lon), parseFloat(data[0].lat)]; // [lon, lat]
        } else {
            throw new Error('Address not found');
        }
    };

    const handleGeocode = async () => {
        setLoading(true);
        setGeocodeError('');

        try {
            const [startCoords, endCoords] = await Promise.all([
                geocode(startAddress),
                geocode(endAddress),
            ]);

            setPreferences(prev => ({
                ...prev,
                startingPoint: startCoords,
                endingPoint: endCoords,
            }));
        } catch (err) {
            console.error(err);
            setGeocodeError('Failed to geocode one or both addresses.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field) => (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setPreferences((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block font-semibold mb-1">Start Address</label>
                <input
                    type="text"
                    value={startAddress}
                    onChange={(e) => setStartAddress(e.target.value)}
                    className="border p-2 rounded w-full"
                    placeholder="e.g. 123 Main St, Philadelphia"
                />
            </div>
            <div>
                <label className="block font-semibold mb-1">End Address</label>
                <input
                    type="text"
                    value={endAddress}
                    onChange={(e) => setEndAddress(e.target.value)}
                    className="border p-2 rounded w-full"
                    placeholder="e.g. 456 Market St, Philadelphia"
                />
            </div>

            <button
                onClick={handleGeocode}
                disabled={loading || !startAddress || !endAddress}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
            >
                {loading ? 'Geocoding...' : 'Set Start & End Points'}
            </button>

            {geocodeError && <p className="text-red-500">{geocodeError}</p>}
        </div>
    );
}
