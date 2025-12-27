import React, { useEffect, useMemo, useRef, useState } from 'react'
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api'
import axios from 'axios'

const containerStyle = { width: '100%', height: '100%' }
const defaultCenter = { lat: 32.0853, lng: 34.7818 }

const btnStyleWaze = {
    backgroundColor: '#33ccff',
    color: '#fff',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '10px',
    cursor: 'pointer',
    flex: 1,
    fontWeight: 800,
}

const btnStyleGoogle = {
    backgroundColor: '#4285F4',
    color: '#fff',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '10px',
    cursor: 'pointer',
    flex: 1,
    fontWeight: 800,
}

export default function MapComponent({
                                         spots = null,
                                         center = defaultCenter,
                                         zoom = 13,
                                         onSpotClick = null,
                                     }) {
    const mapRef = useRef(null)
    const [apiSpots, setApiSpots] = useState([])
    const [selectedSpot, setSelectedSpot] = useState(null)

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'easypark-google-maps',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    })

    useEffect(() => {
        if (Array.isArray(spots)) return

        const fetchSpots = async () => {
            try {
                const res = await axios.get('http://localhost:8080/api/parking-spots/search')
                const valid = (res.data || []).filter((s) => s?.lat != null && s?.lng != null && s?.active)
                setApiSpots(valid)
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error('Error fetching parking spots:', e)
                setApiSpots([])
            }
        }

        fetchSpots()
    }, [spots])

    const markerSpots = useMemo(() => {
        const src = Array.isArray(spots) ? spots : apiSpots
        return (src || []).filter((s) => s?.lat != null && s?.lng != null)
    }, [spots, apiSpots])

    const options = useMemo(
        () => ({
            disableDefaultUI: true,
            zoomControl: false,
            fullscreenControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            clickableIcons: false,
            gestureHandling: 'greedy',
        }),
        [],
    )

    const handleNavigate = (lat, lng, app) => {
        if (app === 'waze') {
            window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank')
        } else {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank')
        }
    }

    const onLoad = (map) => {
        mapRef.current = map
        setTimeout(() => {
            if (window.google?.maps?.event && mapRef.current) {
                window.google.maps.event.trigger(mapRef.current, 'resize')
            }
        }, 120)
    }

    const onUnmount = () => {
        mapRef.current = null
        setSelectedSpot(null)
    }

    if (loadError) {
        return <div style={{ position: 'absolute', inset: 0, background: '#fff' }} />
    }

    if (!isLoaded) {
        return <div style={{ position: 'absolute', inset: 0, background: '#fff' }} />
    }

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={zoom}
                options={options}
                onLoad={onLoad}
                onUnmount={onUnmount}
            >
                {markerSpots.map((spot) => (
                    <Marker
                        key={spot.id ?? `${spot.lat}-${spot.lng}`}
                        position={{ lat: Number(spot.lat), lng: Number(spot.lng) }}
                        onClick={() => {
                            setSelectedSpot(spot)
                            if (onSpotClick) onSpotClick(spot)
                        }}
                    />
                ))}

                {selectedSpot && (
                    <InfoWindow
                        position={{ lat: Number(selectedSpot.lat), lng: Number(selectedSpot.lng) }}
                        onCloseClick={() => setSelectedSpot(null)}
                    >
                        <div style={{ minWidth: 240 }}>
                            <h3 style={{ margin: '0 0 10px 0' }}>
                                {selectedSpot.location ? `Parking at ${selectedSpot.location}` : 'Parking spot'}
                            </h3>

                            {selectedSpot.pricePerHour != null && (
                                <p style={{ margin: '6px 0' }}>
                                    <strong>Price:</strong> ₪{selectedSpot.pricePerHour}/hr
                                </p>
                            )}

                            {typeof selectedSpot.covered === 'boolean' && (
                                <p style={{ margin: '6px 0' }}>
                                    <strong>Covered:</strong> {selectedSpot.covered ? 'Yes' : 'No'}
                                </p>
                            )}

                            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                                <button
                                    type="button"
                                    onClick={() => handleNavigate(selectedSpot.lat, selectedSpot.lng, 'waze')}
                                    style={btnStyleWaze}
                                >
                                    Waze
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleNavigate(selectedSpot.lat, selectedSpot.lng, 'google')}
                                    style={btnStyleGoogle}
                                >
                                    Maps
                                </button>
                            </div>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>
        </div>
    )
}
