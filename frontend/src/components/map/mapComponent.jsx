import React, { useEffect, useMemo, useRef, useState } from 'react'
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api'
import axios from 'axios'

const containerStyle = { width: '100%', height: '100%' }
const defaultCenter = { lat: 32.0853, lng: 34.7818 }

// Style for the geolocation button
const locateBtnStyle = {
    position: 'absolute',
    bottom: '70px',
    left: '10px',
    zIndex: 10,
    backgroundColor: 'white',
    border: 'none',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
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
    height: 33,
    marginTop: 23,
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
    height: 33,
    marginTop: 23,
}
const btnStyleRequest = {
    backgroundColor: '#111827',  // you can choose any
    color: 'white',
    border: 'none',
    padding: '10px 12px',
    borderRadius: '10px',
    cursor: 'pointer',
    flex: 1,
    fontWeight: 800,
    height: 33,
    marginTop: 13,
}

export default function MapComponent({
                                         spots = null,
                                         center = defaultCenter,
                                         zoom = 13,
                                         onSpotClick = null,
                                         currentUserId = null,
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
    const isMine = Boolean(currentUserId && selectedSpot?.ownerId != null && Number(selectedSpot.ownerId) === Number(currentUserId));

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            {/* My Location Button */}
            <button
                onClick={handleLocateUser}
                style={locateBtnStyle}
                title="Show Your Location"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    viewBox="0 0 24 24"
                    width="24px"
                    fill="#444"
                >
                    <path d="M0 0h24v24H0V0z" fill="none"/>
                    <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
                </svg>
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
                            //if (onSpotClick) onSpotClick(spot)
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
                                {onSpotClick && (
                                    <div style={{ marginTop: 12 }}>
                                        {isMine && (
                                            <div style={{ marginBottom: 10, color: '#111827', fontWeight: 700 }}>
                                                This parking spot is yours
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            disabled={isMine}
                                            onClick={() => onSpotClick(selectedSpot)}
                                            style={{
                                                ...btnStyleRequest,
                                                width: '100%',
                                                opacity: isMine ? 0.55 : 1,
                                                cursor: isMine ? 'not-allowed' : 'pointer',
                                            }}
                                            title={isMine ? "You can't request a booking from yourself" : 'Request booking'}
                                        >
                                            Request booking
                                        </button>
                                    </div>
                                )}


                            </div>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>
        </div>
    )
}