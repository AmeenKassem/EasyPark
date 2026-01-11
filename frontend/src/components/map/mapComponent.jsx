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
    backgroundColor: '#111827',
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
    const [mapCenter, setMapCenter] = useState(center)

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'easypark-google-maps',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    })

    useEffect(() => {
        setMapCenter(center)
        if (mapRef.current && center) {
            mapRef.current.panTo(center);
        }
    }, [center])

    useEffect(() => {
        if (Array.isArray(spots)) return

        const fetchSpots = async () => {
            try {
                const res = await axios.get('http://localhost:8080/api/parking-spots/search')
                const valid = (res.data || []).filter((s) => s.lat != null && s.lng != null && s?.active)
                setApiSpots(valid)
            } catch (e) {
                console.error('Error fetching parking spots:', e)
                setApiSpots([])
            }
        }

        fetchSpots()
    }, [spots])

    const handleLocateUser = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

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

        const onFinalError = (error) => {
            console.error("Geolocation final error:", error);
            switch(error.code) {
                case 1: alert("Location access denied. Please check your browser or OS settings."); break;
                case 2: alert("Position unavailable. Please ensure Wi-Fi is enabled."); break;
                case 3: alert("Request timed out. Please try again."); break;
                default: alert(`Error retrieving location: ${error.message}`);
            }
        };

        const highAccuracyOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            onPositionSuccess,
            (error) => {
                console.warn("High accuracy lookup failed. Attempting fallback...", error);

                if (error.code === 1) {
                    onFinalError(error);
                    return;
                }

                const lowAccuracyOptions = {
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 0
                };

                navigator.geolocation.getCurrentPosition(
                    onPositionSuccess,
                    onFinalError,
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

    // --- NEW HELPER FUNCTION: Obscure Address ---
    // This removes numbers from the address string to protect privacy
    const getObscuredAddress = (fullAddress) => {
        if (!fullAddress) return 'Parking spot';

        // Remove all digits (0-9)
        let safeAddr = fullAddress.replace(/[0-9]/g, '');

        // Clean up double spaces or floating commas left behind
        // e.g. "Herzl , Tel Aviv" -> "Herzl, Tel Aviv"
        safeAddr = safeAddr.replace(/\s+,/g, ',').replace(/\s\s+/g, ' ').trim();

        return `Parking at ${safeAddr}`;
    };
    // --------------------------------------------

    if (loadError) {
        return <div style={{ position: 'absolute', inset: 0, background: '#fff' }} />
    }

    if (!isLoaded) {
        return <div style={{ position: 'absolute', inset: 0, background: '#fff' }} />
    }
    const isMine = Boolean(currentUserId && selectedSpot?.ownerId != null && Number(selectedSpot.ownerId) === Number(currentUserId));

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
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
                        <Marker
                            position={myLocation}
                            zIndex={1}
                            clickable={false}
                            icon={{
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 20,
                                fillColor: '#4285F4',
                                fillOpacity: 0.3,
                                strokeWeight: 0,
                            }}
                        />
                        <Marker
                            position={myLocation}
                            zIndex={2}
                            icon={{
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 8,
                                fillColor: '#4285F4',
                                fillOpacity: 1,
                                strokeColor: '#ffffff',
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
                                {/* Updated: Using the helper function to hide numbers */}
                                {getObscuredAddress(selectedSpot.location)}
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