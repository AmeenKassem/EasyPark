import React, { useState } from 'react';
import axios from 'axios';
import AddressAutocomplete from '../components/forms/AddressAutocomplete';
function normalizeLocalDateTime(v) {
    if (!v) return null;
    return v.length === 16 ? `${v}:00` : v; // "YYYY-MM-DDTHH:mm" -> add ":00"
}

const CreateParkingPage = ({ onClose, onCreated }) => {
  
  // State matches your CreateParkingRequest.java DTO
  const [formData, setFormData] = useState({
    location: '',
    lat: null,
    lng: null,
    pricePerHour: '',
    covered: false,
    availableFrom: '',
    availableTo: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Callback for when user picks an address
  const handleAddressSelect = ({ lat, lng, address }) => {
    setFormData(prev => ({
      ...prev,
      lat,
      lng,
      location: address
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // 1. Validate coordinates
      if (formData.lat == null || formData.lng == null) {
          setMessage('Please select a valid address from the list.');
      setLoading(false);
      return;
    }

    try {
      // 2. Retrieve token using the correct key from session.js
      const token = localStorage.getItem('easypark_token');
      
      if (!token) {
        setMessage('You must be logged in to create a parking spot.');
        setLoading(false);
        return;
      }

      // 3. Prepare payload for Spring Boot
      const payload = {
        location: formData.location,
        lat: formData.lat,
        lng: formData.lng,
        pricePerHour: parseFloat(formData.pricePerHour),
        covered: formData.covered,
        // Send dates only if populated
          availableFrom: normalizeLocalDateTime(formData.availableFrom),
          availableTo: normalizeLocalDateTime(formData.availableTo)

      };

      // 4. Send Request
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

        await axios.post(`${API_BASE}/api/parking-spots`, payload, {

            headers: {
          'Authorization': `Bearer ${token}`, // Crucial for @PreAuthorize
          'Content-Type': 'application/json'
        }
      });

        setMessage('Success! Parking spot created.');
        setTimeout(() => {
            onCreated?.();   // optional: let OwnerPage refresh list
            onClose?.();     // close modal
        }, 700);


    } catch (error) {
        console.error("Create parking error:", error);

        const status = error?.response?.status;
        const apiMsg =
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            null;

        if (status === 401) {
            setMessage('You are not logged in (token missing/expired). Please login again.');
        } else if (status === 403) {
            setMessage('Permission denied. You must have OWNER role to create a parking spot.');
        } else if (status === 400) {
            setMessage(apiMsg ? `Validation error: ${apiMsg}` : 'Validation error. Check the form fields.');
        } else {
            setMessage(apiMsg ? `Error: ${apiMsg}` : 'Error creating parking spot. Try again.');
        }
    } finally {

      setLoading(false);
    }
  };

  return (
      <div
          style={{
              maxWidth: '600px',
              margin: '40px auto',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              borderRadius: '12px',
              backgroundColor: '#fff',
              color: '#0f172a',
          }}
      >

      <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>List Your Parking Spot</h2>
      
      <form onSubmit={handleSubmit}>
        
        {/* Address Component */}
        <AddressAutocomplete onAddressSelect={handleAddressSelect} />

        {/* Validation Feedback */}
        {formData.location && (
          <div style={{ marginBottom: '15px', fontSize: '14px', color: '#28a745' }}>
            ✓ Selected: {formData.location}
          </div>
        )}

        {/* Price */}
        <div style={groupStyle}>
          <label style={labelStyle}>Price per Hour (₪)</label>
          <input
            type="number"
            name="pricePerHour"
            value={formData.pricePerHour}
            onChange={handleChange}
            required
            min="0"
            step="0.5"
            placeholder="e.g. 15.0"
            style={inputStyle}
          />
        </div>

        {/* Covered Checkbox */}
        <div style={{ ...groupStyle, flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            name="covered"
            checked={formData.covered}
            onChange={handleChange}
            style={{ width: '20px', height: '20px' }}
          />
          <label>Is the parking covered?</label>
        </div>

        {/* Availability (Optional) */}
        <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ ...groupStyle, flex: 1 }}>
            <label style={labelStyle}>Available From</label>
            <input
                type="datetime-local"
                name="availableFrom"
                value={formData.availableFrom}
                onChange={handleChange}
                style={inputStyle}
            />
            </div>

            <div style={{ ...groupStyle, flex: 1 }}>
            <label style={labelStyle}>Available To</label>
            <input
                type="datetime-local"
                name="availableTo"
                value={formData.availableTo}
                onChange={handleChange}
                style={inputStyle}
            />
            </div>
        </div>

        {/* Submit */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                  type="button"
                  onClick={() => onClose?.()}
                  disabled={loading}
                  style={{
                      flex: 1,
                      padding: '14px',
                      backgroundColor: '#f3f4f6',
                      color: '#111827',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1,
                  }}
              >
                  Cancel
              </button>

              <button
                  type="submit"
                  disabled={loading}
                  style={{
                      flex: 1,
                      padding: '14px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1,
                  }}
              >
                  {loading ? 'Processing...' : 'Create Parking Spot'}
              </button>
          </div>


        {/* Message Banner */}
        {message && (
          <div style={{ 
            marginTop: '20px', 
            padding: '12px', 
            textAlign: 'center',
            borderRadius: '6px',
            backgroundColor: message.includes('Success') ? '#d4edda' : '#f8d7da',
            color: message.includes('Success') ? '#155724' : '#721c24',
          }}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
};

// Simple inline styles
const groupStyle = { marginBottom: '16px', display: 'flex', flexDirection: 'column' };
const labelStyle = { marginBottom: '6px', fontWeight: '500' };
const inputStyle = { padding: '10px', borderRadius: '6px', border: '1px solid #ddd' };

export default CreateParkingPage;