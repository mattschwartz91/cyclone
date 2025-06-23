// components/GpxLoader.jsx
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-gpx';

export default function GpxLoader({ onStatsReady, onCuesReady }) {
    const map = useMap();

    useEffect(() => {
        const gpx = new L.GPX('/chill_hills.gpx', {
            async: true,
            marker_options: { startIconUrl: null, endIconUrl: null, shadowUrl: null },
            polyline_options: { color: '#4ED7F1', weight: 4 },
        });

        gpx.on('loaded', function (e) {
            map.fitBounds(e.target.getBounds());
            onStatsReady({
                distanceKm: e.target.get_distance() / 1000,
                elevationM: e.target.get_elevation_gain(),
            });
            onCuesReady(
                e.target.get_segments().flatMap((seg) =>
                    seg.points.map((pt) => pt.name).filter(Boolean)
                )
            );
        });

        gpx.addTo(map);
    }, [map, onStatsReady, onCuesReady]);

    return null;
}
