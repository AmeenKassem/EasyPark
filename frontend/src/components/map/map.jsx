import React, { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const defaultCenter = [32.0853, 34.7818]
const defaultZoom = 13

const pinIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
})

export default function MapView({ spots = [], center = defaultCenter, zoom = defaultZoom, onSpotClick }) {
    const markers = useMemo(() => {
        return (spots || []).filter((s) => Array.isArray(s.coords) && s.coords.length === 2)
    }, [spots])

    return (
        <MapContainer
            center={center}
            zoom={zoom}
            zoomControl={false}
            attributionControl={false}
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {markers.map((s) => (
                <Marker
                    key={s.id ?? `${s.title}-${s.coords[0]}-${s.coords[1]}`}
                    position={s.coords}
                    icon={pinIcon}
                    eventHandlers={
                        onSpotClick
                            ? {
                                click: () => onSpotClick(s),
                            }
                            : undefined
                    }
                >
                    <Popup>
                        <div style={{ fontWeight: 700 }}>{s.title}</div>
                        <div style={{ opacity: 0.8 }}>{s.address}</div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    )
}
