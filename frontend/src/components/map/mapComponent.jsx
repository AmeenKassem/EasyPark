import React, { useEffect, useMemo, useRef, useState } from 'react'
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api'
import axios from 'axios'

const containerStyle = { width: '100%', height: '100%' }
const defaultCenter = { lat: 32.0853, lng: 34.7818 }

// Style for the geolocation button
const locateBtnStyle = {
    position: 'absolute',
    top: '145px', // Positioned below the search bar
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
    backgroundColor: 'white',
    border: '1px solid #ccc',
    padding: '10px 20px',
    borderRadius: '20px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
}

const btnStyleWaze = {
    backgroundColor: '#33ccff',
    color: 'black',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '10px',
    cursor: 'pointer',
    flex: 1,
    fontWeight: 800,
}

const btnStyleGoogle = {
    backgroundColor: '#4285F4',
    color: 'black',
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
                                         onMapLoad = null
                                     }) {
    const mapRef = useRef(null)
    const [apiSpots, setApiSpots] = useState([])
    const [selectedSpot, setSelectedSpot] = useState(null)

    const [myLocation, setMyLocation] = useState(null)
    // State to control map center dynamically
    const [mapCenter, setMapCenter] = useState(center)

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'easypark-google-maps',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    })

    // --- CRITICAL UPDATE FOR SEARCH ---
    // Update map center AND Pan to it when the prop changes
    useEffect(() => {
        setMapCenter(center)
        if (mapRef.current && center) {
            mapRef.current.panTo(center);
            // Optional: Zoom in slightly when a specific address is selected
            // mapRef.current.setZoom(15); 
        }
    }, [center])

    useEffect(() => {
        // Only fetch from DB if spots prop is NOT provided
        if (Array.isArray(spots)) return

        const fetchSpots = async () => {
            try {
                const res = await axios.get('http://localhost:8080/api/parking-spots/search')
                // Fix: Check for null/undefined explicitly, keeping 0 valid
                const valid = (res.data || []).filter((s) => s.lat != null && s.lng != null && s?.active)
                setApiSpots(valid)
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error('Error fetching parking spots:', e)
                setApiSpots([])
            }
        }

        fetchSpots()
    }, [spots])

    // Function to handle user geolocation with Fallback strategy
    const handleLocateUser = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

        // Shared success callback (used by both High and Low accuracy attempts)
        const onPositionSuccess = (position) => {
            const newPos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            setMyLocation(newPos);
            setMapCenter(newPos);

            if (mapRef.current) {
                mapRef.current.panTo(newPos);
                mapRef.current.setZoom(15);
            }
        };

        // Final error handler (to be called if the fallback also fails)
        const onFinalError = (error) => {
            console.error("Geolocation final error:", error);
            switch(error.code) {
                case 1: alert("Location access denied. Please check your browser or OS settings."); break;
                case 2: alert("Position unavailable. Please ensure Wi-Fi is enabled."); break;
                case 3: alert("Request timed out. Please try again."); break;
                default: alert(`Error retrieving location: ${error.message}`);
            }
        };

        // Options for the first attempt (High Accuracy / GPS)
        const highAccuracyOptions = {
            enableHighAccuracy: true,
            timeout: 10000, // 10 seconds to get a GPS fix
            maximumAge: 0
        };

        // Attempt 1: Try with High Accuracy
        navigator.geolocation.getCurrentPosition(
            onPositionSuccess,
            (error) => {
                console.warn("High accuracy lookup failed. Attempting fallback...", error);

                // If permission is denied (code 1), retrying won't help. Show error immediately.
                if (error.code === 1) {
                    onFinalError(error);
                    return;
                }

                // Attempt 2: Fallback to Low Accuracy (Wi-Fi / Cellular)
                const lowAccuracyOptions = {
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 0
                };

                navigator.geolocation.getCurrentPosition(
                    onPositionSuccess,
                    onFinalError, // If this also fails, show the alert
                    lowAccuracyOptions
                );
            },
            highAccuracyOptions
        );
    };

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
            // Corrected URL for Google Maps navigation
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank')
        }
    }

    const onLoad = (map) => {
        mapRef.current = map
        if (onMapLoad) {
            onMapLoad(map);
        }
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
            {/* My Location Button */}
            <button
                onClick={handleLocateUser}
                style={locateBtnStyle}
            >
                📍 My Location
            </button>

            <GoogleMap
                mapContainerStyle={containerStyle}
                center={mapCenter}
                zoom={zoom}
                options={options}
                onLoad={onLoad}
                onUnmount={onUnmount}
            >
                {myLocation && (
                    <>
                        {/* Layer 1: Outer beam/halo (background layer) */}
                        <Marker
                            position={myLocation}
                            zIndex={1} // Lower z-index so it appears behind the dot
                            clickable={false} // Ensures the halo doesn't intercept clicks
                            icon={{
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 20, // Size of the halo - significantly larger than the dot
                                fillColor: '#4285F4', // Same blue color
                                fillOpacity: 0.3, // High transparency (30%) to create the light effect
                                strokeWeight: 0, // No border for the halo
                            }}
                        />

                        {/* Layer 2: The center dot (foreground layer) */}
                        <Marker
                            position={myLocation}
                            zIndex={2} // Higher z-index so it appears on top
                            icon={{
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 8, // Size of the solid dot
                                fillColor: '#4285F4',
                                fillOpacity: 1, // Solid color
                                strokeColor: '#ffffff', // White border
                                strokeWeight: 2,
                            }}
                        />
                    </>
                )}

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
                            <h3 style={{ margin: '0 0 10px 0',color: 'black' }}>
                                {selectedSpot.location ? `Parking at ${selectedSpot.location}` : 'Parking spot'}
                            </h3>

                            {selectedSpot.pricePerHour != null && (
                                <p style={{ margin: '6px 0', color: 'black' }}>
                                    <strong>Price:</strong> ₪{selectedSpot.pricePerHour}/hr
                                </p>
                            )}

                            {typeof selectedSpot.covered === 'boolean' && (
                                <p style={{ margin: '6px 0', color: 'black' }}>
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