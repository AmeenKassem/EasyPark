import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import axios from 'axios';

// Map size
const containerStyle = {
  width: '100%',
  height: '600px' // Map height on screen
};

// Default center (Tel Aviv) - in case there is no user location
const defaultCenter = {
  lat: 32.0853,
  lng: 34.7818
};

const MapComponent = () => {
  const [parkingSpots, setParkingSpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);

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

  // Function to open navigation
  const handleNavigate = (lat, lng, app) => {
    if (app === 'waze') {
      window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
  };

  return (
    <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
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
            <div style={{ direction: 'rtl', textAlign: 'right', minWidth: '200px' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>parking at -{selectedSpot.location}</h3>
              <p><strong>price:</strong> {selectedSpot.pricePerHour} ₪ לשעה</p>
              <p><strong>covered:</strong> {selectedSpot.covered ? 'yes ✅' : 'no ❌'}</p>
              
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
    </LoadScript>
  );
};

// Button styles
const btnStyleWaze = {
  backgroundColor: '#33ccff', color: 'white', border: 'none', 
  padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', flex: 1
};

const btnStyleGoogle = {
  backgroundColor: '#4285F4', color: 'white', border: 'none', 
  padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', flex: 1
};

export default MapComponent;