// components/StatsCard.jsx
export default function StatsCard({ stats, unitSystem, setUnitSystem }) {
    return (
        <div>
            <h2 className="text-base md:text-lg font-bold">Stats</h2>
            {stats.distanceKm !== null ? (
                <>
                    <p>
                        Distance:{' '}
                        {unitSystem === 'imperial'
                            ? (stats.distanceKm * 0.621371).toFixed(2) + ' mi'
                            : stats.distanceKm.toFixed(2) + ' km'}
                    </p>
                    <p>
                        Elevation Gain:{' '}
                        {unitSystem === 'imperial'
                            ? (stats.elevationM * 3.28084).toFixed(0) + ' ft'
                            : stats.elevationM.toFixed(0) + ' m'}
                    </p>
                </>
            ) : (
                <p>Loading...</p>
            )}
            <button
                onClick={() => setUnitSystem((prev) => (prev === 'imperial' ? 'metric' : 'imperial'))}
                className="block w-full text-center mt-2 bg-accent rounded shadow hover:bg-[#3bc6df] transition"
            >
                Switch to {unitSystem === 'imperial' ? 'metric' : 'imperial'}
            </button>
        </div>
    );
}
