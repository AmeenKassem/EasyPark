import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons in bundlers (Vite)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
})

export default function MapView({ spots }) {
    const telAviv = [32.0853, 34.7818]

    return (
        <MapContainer
            center={telAviv}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
        >
            <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {Array.isArray(spots) &&
                spots.map((s) => (
                    <Marker key={s.id} position={[s.lat, s.lng]}>
                        <Popup>
                            <div style={{ minWidth: 180 }}>
                                <div style={{ fontWeight: 700 }}>{s.title}</div>
                                <div style={{ fontSize: 12, opacity: 0.85 }}>{s.address}</div>
                                <div style={{ marginTop: 6, fontSize: 12 }}>
                                    ₪{s.pricePerHour}/hr • {s.covered ? 'Covered' : 'Uncovered'}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
        </MapContainer>
    )
}
