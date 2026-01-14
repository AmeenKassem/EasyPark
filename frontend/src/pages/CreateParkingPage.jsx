import React, { useState } from 'react';
import axios from 'axios';
import AddressAutocomplete from '../components/forms/AddressAutocomplete';

function normalizeLocalDateTime(v) {
    if (!v) return null;
    return v.length === 16 ? `${v}:00` : v;
}

const CreateParkingPage = ({ onClose, onCreated }) => {

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


  const handleAddressSelect = ({ lat, lng, address, address_components }) => {
    setMessage('');

    // Check if the address has a street number
    if (address_components) {
        const hasStreetNumber = address_components.some(component =>
            component.types.includes('street_number')
        );

        if (!hasStreetNumber) {
            setMessage('⚠️ Please select a precise address that includes a street number.');
            // Invalid address: Keep text but reset coordinates so form cannot be submitted
            setFormData(prev => ({
                ...prev,
                lat: null,
                lng: null,
                location: address
            }));
            return;
        }
    }

    // Valid address
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
      const token = localStorage.getItem('easypark_token');
      if (!token) {
        setMessage('You must be logged in to create a parking spot.');
        setLoading(false);
        return;
      }

      const payload = {
        location: formData.location,
        lat: formData.lat,
        lng: formData.lng,
        pricePerHour: parseFloat(formData.pricePerHour),
        covered: formData.covered,
        availableFrom: normalizeLocalDateTime(formData.availableFrom),
        availableTo: normalizeLocalDateTime(formData.availableTo)
      };

      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

      await axios.post(`${API_BASE}/api/parking-spots`, payload, {
          headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setMessage('Success! Parking spot created.');
      setTimeout(() => {
          onCreated?.();
          onClose?.();
      }, 700);

    } catch (error) {
        console.error("Create parking error:", error);
        const status = error?.response?.status;
        const apiMsg = error?.response?.data?.message || error?.response?.data?.error || null;

        if (status === 401) {
            setMessage('You are not logged in. Please login again.');
        } else if (status === 403) {
            setMessage('Permission denied. You must have OWNER role.');
        } else if (status === 400) {
            setMessage(apiMsg ? `Validation error: ${apiMsg}` : 'Validation error.');
        } else {
            setMessage(apiMsg ? `Error: ${apiMsg}` : 'Error creating parking spot.');
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

        {/* Updated: Passing strict options for Israel & Address type */}
        <AddressAutocomplete
            onAddressSelect={handleAddressSelect}
            options={{
                types: ['address'],
                componentRestrictions: { country: "il" }
            }}
        />

        {/* Success Feedback */}
        {formData.location && formData.lat && (
          <div style={{ marginBottom: '15px', fontSize: '14px', color: '#28a745' }}>
            ✓ Selected: {formData.location}
          </div>
        )}

        {/* Error Feedback for imprecise address */}
        {message && message.includes('precise address') && (
             <div style={{ marginBottom: '15px', fontSize: '14px', color: '#dc3545', fontWeight: 'bold' }}>
                 {message}
             </div>
        )}

        {/* Price Stepper Section */}
        <div style={groupStyle}>
          <style>
            {`
              input[type=number]::-webkit-inner-spin-button,
              input[type=number]::-webkit-outer-spin-button {
                -webkit-appearance: none;
                margin: 0;
              }
              input[type=number] {
                -moz-appearance: textfield;
              }
            `}
          </style>

          <label style={labelStyle}>Price per Hour</label>
          <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f3f4f6',
              borderRadius: '16px',
              padding: '4px',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
              width: '240px'
          }}>
            <button
                type="button"
                onClick={() => {
                    const newVal = parseFloat(formData.pricePerHour || 0) - 0.5;
                    if (newVal >= 0) handleChange({ target: { name: 'pricePerHour', value: newVal } });
                }}
                style={{
                    width: '48px',
                    height: '44px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '24px',
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                −
            </button>

            <div style={{
                flex: 1,
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                margin: '0 4px',
                position: 'relative'
            }}>
                <span style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#374151',
                    marginRight: '4px'
                }}>₪</span>
                <input
                    type="number"
                    name="pricePerHour"
                    value={formData.pricePerHour}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.5"
                    placeholder="0.0"
                    style={{
                        width: '60px',
                        border: 'none',
                        outline: 'none',
                        fontSize: '20px',
                        fontWeight: '600',
                        color: '#1f2937',
                        textAlign: 'left',
                        backgroundColor: 'transparent',
                        padding: 0
                    }}
                />
            </div>

            <button
                type="button"
                onClick={() => {
                    const newVal = (parseFloat(formData.pricePerHour) || 0) + 0.5;
                    handleChange({ target: { name: 'pricePerHour', value: newVal } });
                }}
                style={{
                    width: '48px',
                    height: '44px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '24px',
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                +
            </button>
          </div>
        </div>

        <div style={{ ...groupStyle, flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontWeight: '500', margin: 0 }}>Is the parking covered?</label>
            <div
                onClick={() => setFormData(prev => ({ ...prev, covered: !prev.covered }))}
                style={{
                    width: '50px',
                    height: '26px',
                    backgroundColor: formData.covered ? '#3b82f6' : '#e5e7eb',
                    borderRadius: '50px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s ease',
                    border: '1px solid #d1d5db',
                    flexShrink: 0
                }}
            >
                <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: formData.covered ? '26px' : '2px',
                    transition: 'left 0.3s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
            </div>
        </div>

        {/* Date Fields (Required) */}
        <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ ...groupStyle, flex: 1 }}>
            <label style={labelStyle}>Available From</label>
            <input
                type="datetime-local"
                name="availableFrom"
                value={formData.availableFrom}
                onChange={handleChange}
                style={inputStyle}
                required
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
                required
            />
            </div>
        </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>

              {/* Validation Logic for the Button */}
              {(() => {
                  const isFormValid =
                      formData.lat &&
                      formData.pricePerHour &&
                      formData.availableFrom &&
                      formData.availableTo;

                  return (
                      <>
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
                              disabled={loading || !isFormValid}
                              style={{
                                  flex: 1,
                                  padding: '14px',
                                  backgroundColor: (loading || !isFormValid) ? '#9ca3af' : '#007bff',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontSize: '16px',
                                  fontWeight: 'bold',
                                  cursor: (loading || !isFormValid) ? 'not-allowed' : 'pointer',
                                  opacity: (loading || !isFormValid) ? 0.7 : 1,
                              }}
                          >
                              {loading ? 'Processing...' : 'Create Parking Spot'}
                          </button>
                      </>
                  );
              })()}
          </div>

        {message && !message.includes('precise address') && (
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

const groupStyle = { marginBottom: '16px', display: 'flex', flexDirection: 'column' };
const labelStyle = { marginBottom: '6px', fontWeight: '500' };
const inputStyle = { padding: '10px', borderRadius: '6px', border: '1px solid #ddd' };

export default CreateParkingPage;