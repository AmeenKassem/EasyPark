import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProfileModal = ({ isOpen, onClose, onUpdateSuccess }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        role: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // State handling for messages
    const [feedback, setFeedback] = useState({ message: '', isError: false });

    useEffect(() => {
        if (!isOpen) return;

        const fetchData = async () => {
            setLoading(true);
            setFeedback({ message: '', isError: false }); // Reset feedback
            try {
                const token = localStorage.getItem('easypark_token');
                if (!token) throw new Error("No token found");

                const response = await axios.get('http://localhost:8080/api/users/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const { fullName, phone, role } = response.data;
                setFormData({
                    fullName: fullName || '',
                    phone: phone || '',
                    role: role
                });
            } catch (error) {
                console.error("Fetch error details:", error.response || error);
                setFeedback({ 
                    message: "Failed to load user data. Check console for details.", 
                    isError: true 
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isOpen]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

const handleSave = async () => {
        setSaving(true);
        setFeedback({ message: '', isError: false });
        
        let token = localStorage.getItem('easypark_token');
        let config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            // 1. Update Profile (Name & Phone)
            // The server now returns a new token in the response
            const profileRes = await axios.put('http://localhost:8080/api/users/me', {
                fullName: formData.fullName,
                phone: formData.phone
            }, config);

            // Handle Token Refresh for Profile Update
            if (profileRes.data.token) {
                token = profileRes.data.token;
                localStorage.setItem('easypark_token', token);
                // Update config with new token for the next request
                config = { headers: { Authorization: `Bearer ${token}` } };
            }
            if (profileRes.data.user) {
                localStorage.setItem('easypark_user', JSON.stringify(profileRes.data.user));
            }

            // 2. Update Role (Separate Request)
            const roleRes = await axios.put('http://localhost:8080/api/users/me/role', {
                role: formData.role
            }, config);

            // Handle Token Refresh for Role Update
            if (roleRes.data.token) {
                localStorage.setItem('easypark_token', roleRes.data.token);
            }
            if (roleRes.data.user) {
                localStorage.setItem('easypark_user', JSON.stringify(roleRes.data.user));
            }

            setFeedback({ message: 'Profile updated successfully!', isError: false });
            
            setTimeout(() => {
                if (onUpdateSuccess) onUpdateSuccess();
                onClose();
            }, 1000);

        } catch (error) {
            console.error("Update error details:", error.response || error);
            setFeedback({ 
                message: error.response?.data?.message || 'Error updating profile. Please try again.', 
                isError: true 
            });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <h2 style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Manage Profile</h2>
                
                {loading ? (
                    <p>Loading user data...</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        
                        <div>
                            <label style={labelStyle}>Full Name</label>
                            <input
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="Enter full name"
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Phone Number</label>
                            <input
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="Enter phone number"
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Role</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                style={inputStyle}
                            >
                                <option value="DRIVER">Driver (Look for parking)</option>
                                <option value="OWNER">Owner (Rent out spots)</option>
                                <option value="BOTH">Both (Driver & Owner)</option>
                            </select>
                        </div>

                        {/* Feedback Message */}
                        {feedback.message && (
                            <div style={{ 
                                padding: '10px', 
                                borderRadius: '5px',
                                backgroundColor: feedback.isError ? '#fee2e2' : '#dcfce7',
                                color: feedback.isError ? '#991b1b' : '#166534',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}>
                                {feedback.message}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button onClick={onClose} style={cancelBtnStyle} disabled={saving}>Cancel</button>
                            <button onClick={handleSave} style={saveBtnStyle} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Styles
const overlayStyle = {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', 
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
};
const modalStyle = {
    backgroundColor: 'white', padding: '25px', borderRadius: '12px', 
    width: '90%', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
};
const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#333' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px' };
const saveBtnStyle = { flex: 1, padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };
const cancelBtnStyle = { flex: 1, padding: '12px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };

export default ProfileModal;