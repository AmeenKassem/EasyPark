import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import axios from 'axios';

// Map size
const containerStyle = {
  width: '100%',
  height: '600px' // Map height on screen
};

// Default center (Tel Aviv) - used if user location is not provided
const defaultCenter = {
  lat: 32.0853,
  lng: 34.7818
};

// Style for the "My Location" floating button
const locateBtnStyle = {
  position: 'absolute',
  top: '10px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 10, // Ensure it sits on top of the map
  backgroundColor: 'white',
  border: '1px solid #ccc',
  padding: '10px 20px',
  borderRadius: '20px',
  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '14px'
};

const MapComponent = () => {
  const [parkingSpots, setParkingSpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  
  // State for map center - starts with default, updates on geolocation
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  // Loading data from your API
  useEffect(() => {
    const fetchSpots = async () => {
      try {
        // Call to your existing endpoint
        const response = await axios.get('http://localhost:8080/api/parking-spots/search');
        
        // Filter spots that don't have coordinates (lat/lng are null in DB)
        const validSpots = response.data.filter(spot => spot.lat && spot.lng && spot.active);
        setParkingSpots(validSpots);
      } catch (error) {
        console.error("Error fetching parking spots:", error);
      }
    };

    fetchSpots();
  }, []);

  // Function to handle Geolocation
  const handleLocateUser = () => {
    if (navigator.geolocation) {
      // Browser API to get current position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not retrieve your location. Please ensure location access is allowed.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  // Function to open navigation apps
  const handleNavigate = (lat, lng, app) => {
    if (app === 'waze') {
      window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
    } else {
      // Standard Google Maps link
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    }
  };

  return (
    <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY}>
      
      {/* Wrapper div to position the button absolutely over the map */}
      <div style={{ position: 'relative' }}>
        
        {/* The "My Location" Button */}
        <button 
          onClick={handleLocateUser}
          style={locateBtnStyle}
        >
          📍 My Location
        </button>

        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter} // Dynamic center based on state
          zoom={13}
        >
          {parkingSpots.map((spot) => (
            <Marker
              key={spot.id}
              // Using fields as defined in ParkingResponse.java
              position={{ lat: spot.lat, lng: spot.lng }} 
              onClick={() => setSelectedSpot(spot)}
            />
          ))}

          {selectedSpot && (
            <InfoWindow
              position={{ lat: selectedSpot.lat, lng: selectedSpot.lng }}
              onCloseClick={() => setSelectedSpot(null)}
            >
              {/* InfoWindow Content - English Only */}
              <div style={{ textAlign: 'left', minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 10px 0' }}>Parking at {selectedSpot.location}</h3>
                <p><strong>Price:</strong> {selectedSpot.pricePerHour} ₪/hr</p>
                <p><strong>Covered:</strong> {selectedSpot.covered ? 'Yes ✅' : 'No ❌'}</p>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button
                    onClick={() => handleNavigate(selectedSpot.lat, selectedSpot.lng, 'waze')}
                    style={btnStyleWaze}
                  >
                    Waze 🚙
                  </button>
                  <button
                    onClick={() => handleNavigate(selectedSpot.lat, selectedSpot.lng, 'google')}
                    style={btnStyleGoogle}
                  >
                    Maps 📍
                  </button>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </LoadScript>
  );
};

// Button styles for InfoWindow
const btnStyleWaze = {
  backgroundColor: '#33ccff', color: 'white', border: 'none', 
  padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', flex: 1
};

const btnStyleGoogle = {
  backgroundColor: '#4285F4', color: 'white', border: 'none', 
  padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', flex: 1
};

export default MapComponent;