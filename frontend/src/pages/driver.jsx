
// import React, { useState, useEffect, useRef } from 'react'
// import { useLocation, useNavigate } from 'react-router-dom'
// import axios from 'axios'
// import { Autocomplete } from '@react-google-maps/api'
// import '../styles/driver.css'
// import MapComponent from '../components/map/mapComponent'
// import { logout } from '../services/session'
// import ProfileModal from '../components/modals/ProfileModal';
// import { getCurrentUser , subscribeAuthChanged} from '../services/session'
// import BookParkingModal from '../components/modals/BookParkingModal'


// // --- ICONS (Same as before) ---
// function IconPin({ size = 18 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 22s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z" stroke="currentColor" strokeWidth="1.8" /><path d="M12 13.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" strokeWidth="1.8" /></svg>) }
// function IconUser({ size = 18 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 12a4.2 4.2 0 1 0-4.2-4.2A4.2 4.2 0 0 0 12 12Z" stroke="currentColor" strokeWidth="1.8" /><path d="M4.5 20.2c1.4-4.2 13.6-4.2 15 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>) }
// function IconSearch({ size = 18 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10.5 18.5a8 8 0 1 1 5.2-14.1A8 8 0 0 1 10.5 18.5Z" stroke="currentColor" strokeWidth="1.8" /><path d="M16.8 16.8 21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>) }
// function IconSliders({ size = 18 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h6M14 18h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M14 6a2 2 0 1 0 0 .01ZM8 12a2 2 0 1 0 0 .01ZM12 18a2 2 0 1 0 0 .01Z" fill="currentColor" /></svg>) }

// const defaultCenter = { lat: 32.0853, lng: 34.7818 }; // Tel Aviv default

// export default function DriverPage() {
//     const nav = useNavigate()
//     const location = useLocation()
//     const [user, setUser] = useState(getCurrentUser())
//     const [bookingOpen, setBookingOpen] = useState(false)
//     const [bookingSpot, setBookingSpot] = useState(null)
//     const [bookingToast, setBookingToast] = useState('')



//     useEffect(() => {
//         // Re-render DriverPage when auth/user changes
//         return subscribeAuthChanged(() => {
//             setUser(getCurrentUser())
//         })
//     }, [])

//     const roles = new Set(user?.roles ?? [])



//     // Filters State
//     const [address, setAddress] = useState('')
//     const [filtersOpen, setFiltersOpen] = useState(false)
//     const [coveredOnly, setCoveredOnly] = useState(false)
//     const [activeOnly, setActiveOnly] = useState(true)
//     const [maxPrice, setMaxPrice] = useState(100)

//     // Data State
//     const [realSpots, setRealSpots] = useState([])
//     const [loading, setLoading] = useState(false)
    
//     // Map Center State
//     const [mapCenter, setMapCenter] = useState(defaultCenter)
//     const [autocomplete, setAutocomplete] = useState(null)
    
//     // NEW: We filter by MAP BOUNDS (Viewport), not by text
//     const [searchBounds, setSearchBounds] = useState(null)

//     // UI State
//     const [profileOpen, setProfileOpen] = useState(false)
//     const profileBtnRef = useRef(null)
//     const [profileMenuPos, setProfileMenuPos] = useState({ top: 0, left: 0 })
//     const [isProfileModalOpen, setProfileModalOpen] = useState(false);

//     useEffect(() => {
//         setProfileOpen(false)
//         setFiltersOpen(false)
//     }, [location.key])
//     useEffect(() => {
//         // pull latest user from localStorage whenever route changes
//         setUser(getCurrentUser())
//     }, [location.key])
//     // --- FETCH DATA & FILTER ---
//     useEffect(() => {
//         const fetchSpots = async () => {
//             setLoading(true);
//             try {
//                 // Server params (SQL Filtering)
//                 const params = {};
//                 if (coveredOnly) params.covered = true;
//                 if (maxPrice < 100) params.maxPrice = maxPrice;

//                 const response = await axios.get('http://localhost:8080/api/parking-spots/search', {
//                     params,
//                     headers: { Authorization: `Bearer ${localStorage.getItem('easypark_token')}` }
//                 });

//                 let data = response.data || [];

//                 // 1. Client-side Filter: Active Only
//                 if (activeOnly) {
//                     data = data.filter(s => s.active === true);
//                 }

//                 // 2. GEOSPATIAL FILTER: Bounds Check (Viewport)
//                 // This solves the language issue ("Ashdod" == "אשדוד") because both return the same coordinates box
//                 if (searchBounds) {
//                     data = data.filter(s => {
//                         if (!s.lat || !s.lng) return false;
//                         return (
//                             s.lat <= searchBounds.north &&
//                             s.lat >= searchBounds.south &&
//                             s.lng <= searchBounds.east &&
//                             s.lng >= searchBounds.west
//                         );
//                     });
//                 } 
//                 setRealSpots(data);
//             } catch (error) {
//                 console.error("Failed to fetch spots", error);
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchSpots();
//     }, [address, coveredOnly, maxPrice, activeOnly, searchBounds]); // Re-run when bounds change

// const handlePlaceSelect = (place) => {
//         if (place.geometry && place.geometry.location) {
//             const lat = place.geometry.location.lat();
//             const lng = place.geometry.location.lng();

//             // 1. Move Map (Always center on the result)
//             setMapCenter({ lat, lng });

//             // 2. Determine Filter Bounds
//             // Check if the result is a broad area (City, Locality, Administrative Area)
//             const isCityOrRegion = place.types && (
//                 place.types.includes('locality') || 
//                 place.types.includes('administrative_area_level_1') ||
//                 place.types.includes('administrative_area_level_2')
//             );

//             if (isCityOrRegion && place.geometry.viewport) {
//                 // CASE A: City Search -> Use the official Google Viewport (Show everything in the city)
//                 const bounds = place.geometry.viewport;
//                 setSearchBounds({
//                     north: bounds.getNorthEast().lat(),
//                     south: bounds.getSouthWest().lat(),
//                     east: bounds.getNorthEast().lng(),
//                     west: bounds.getSouthWest().lng()
//                 });
                
//                 // Optional: Fit bounds visually
//                 if (mapRef.current) mapRef.current.fitBounds(bounds);

//             } else {
//                 // CASE B: Specific Place/Address (e.g., Soroka, specific street)
//                 // IGNORE the tiny viewport of the building. Instead, create a ~1.5km radius box.
//                 // 0.015 degrees is roughly 1.5-1.8km.
//                 const delta = 0.015; 
                
//                 setSearchBounds({
//                     north: lat + delta,
//                     south: lat - delta,
//                     east: lng + delta,
//                     west: lng - delta
//                 });

//                 // Set a reasonable zoom for specific places
//                 if (mapRef.current) {
//                     mapRef.current.setZoom(15);
//                     mapRef.current.panTo({ lat, lng });
//                 }
//             }

//             // 3. Update Text Input
//             if (place.formatted_address) {
//                 setAddress(place.formatted_address);
//             }
//         } else {
//             console.warn("No geometry details available");
//         }
//     };

//     // --- AUTOCOMPLETE HANDLERS ---
//     const onLoadAutocomplete = (au) => {
//         setAutocomplete(au);
//     }

//     // Updated: Uses the extracted function
//     const onPlaceChanged = () => {
//         if (autocomplete !== null) {
//             const place = autocomplete.getPlace();
//             handlePlaceSelect(place);
//         }
//     }

//     //Handle Enter key to select the first prediction automatically
//     const handleInputKeyDown = (e) => {
//         const isDropdownItemHtmlSelected = document.querySelector('.pac-item-selected');

//         if (isDropdownItemHtmlSelected) {
//             // If an item is highlighted, STOP here. 
//             // Let the default Google Autocomplete behavior handle the selection.
//             // Doing preventDefault() or running manual fetch here would break the selection.
//             return;
//         }
//         // Only trigger if Enter is pressed and we have text
//         if (e.key === 'Enter' && address.trim() !== '') {
//             // Prevent default form submission or page reload
//             e.preventDefault(); 
            
//             // If the user hasn't selected from the dropdown (autocomplete might be null or closed),
//             // we fetch the suggestions manually using the AutocompleteService.
//             if (window.google && window.google.maps && window.google.maps.places) {
//                 const service = new window.google.maps.places.AutocompleteService();
                
//                 service.getPlacePredictions({ input: address }, (predictions, status) => {
//                     if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
//                         // Get the first result (Best Match)
//                         const firstPrediction = predictions[0];

//                         // We need the Geocoder to get the geometry (lat/lng) from the place_id
//                         const geocoder = new window.google.maps.Geocoder();
//                         geocoder.geocode({ placeId: firstPrediction.place_id }, (results, status) => {
//                             if (status === 'OK' && results[0]) {
//                                 // Apply the logic using our extracted function
//                                 handlePlaceSelect(results[0]);
                                
//                                 // Optional: Close the dropdown visually (blur input)
//                                 e.target.blur();
//                             }
//                         });
//                     }
//                 });
//             }
//         }
//     };

//     // const onPlaceChanged = () => {
//     //     if (autocomplete !== null) {
//     //         const place = autocomplete.getPlace();
            
//     //         if (place.geometry && place.geometry.location) {
//     //             // 1. Move Map
//     //             setMapCenter({
//     //                 lat: place.geometry.location.lat(),
//     //                 lng: place.geometry.location.lng()
//     //             });
                
//     //             // 2. Set Bounds for Filtering
//     //             if (place.geometry.viewport) {
//     //                 // Google gives us a box for the city/place
//     //                 const bounds = place.geometry.viewport;
//     //                 setSearchBounds({
//     //                     north: bounds.getNorthEast().lat(),
//     //                     south: bounds.getSouthWest().lat(),
//     //                     east: bounds.getNorthEast().lng(),
//     //                     west: bounds.getSouthWest().lng()
//     //                 });
//     //             } else {
//     //                 // Fallback for specific points without viewport (create small box ~1km)
//     //                 const lat = place.geometry.location.lat();
//     //                 const lng = place.geometry.location.lng();
//     //                 const delta = 0.01; 
//     //                 setSearchBounds({
//     //                     north: lat + delta,
//     //                     south: lat - delta,
//     //                     east: lng + delta,
//     //                     west: lng - delta
//     //                 });
//     //             }

//     //             // 3. Update Text
//     //             if (place.formatted_address) {
//     //                 setAddress(place.formatted_address);
//     //             }
//     //         } else {
//     //             console.warn("No geometry details available");
//     //         }
//     //     }
//     // }

//     // --- RESET HANDLER ---
//     const handleReset = () => {
//         setAddress('');
//         setSearchBounds(null); // Clear geospatial filter
//         setCoveredOnly(false);
//         setActiveOnly(true);
//         setMaxPrice(100);
//     }

//     // ... (Logout & Profile Logic - UNCHANGED) ...
//     const doLogout = () => {
//         try { localStorage.removeItem('easypark_token') } catch {}
//         try { logout() } catch {}
//         setProfileOpen(false)
//         nav('/', { replace: true })
//     }

//     const openProfileMenu = () => {
//         const el = profileBtnRef.current
//         if (el) {
//             const r = el.getBoundingClientRect()
//             const menuWidth = 220
//             const gap = 10
//             const left = Math.min(window.innerWidth - menuWidth - 12, Math.max(12, r.right - menuWidth))
//             const top = r.bottom + gap
//             setProfileMenuPos({ top, left })
//         }
//         setProfileOpen(true)
//     }

//     useEffect(() => {
//         if (!profileOpen) return
//         const onResizeOrScroll = () => {
//             const el = profileBtnRef.current
//             if (!el) return
//             const r = el.getBoundingClientRect()
//             const menuWidth = 220
//             const gap = 10
//             const left = Math.min(window.innerWidth - menuWidth - 12, Math.max(12, r.right - menuWidth))
//             const top = r.bottom + gap
//             setProfileMenuPos({ top, left })
//         }
//         window.addEventListener('resize', onResizeOrScroll)
//         window.addEventListener('scroll', onResizeOrScroll, true)
//         return () => {
//             window.removeEventListener('resize', onResizeOrScroll)
//             window.removeEventListener('scroll', onResizeOrScroll, true)
//         }
//     }, [profileOpen])


//     return (
//         <div style={{ position: 'relative', height: '100dvh', width: '100vw', overflow: 'hidden', background: '#0b1220' }}>
            
//             <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
//                 <MapComponent
//                     key={location.key}
//                     spots={realSpots}
//                     center={mapCenter}
//                     onSpotClick={(spot) => {
//                         setBookingSpot(spot)
//                         setBookingOpen(true)
//                     }}
//                 />
//             </div>

//             <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
//                 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '12px 14px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 30px rgba(15, 23, 42, 0.12)', pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
//                     <div onClick={() => nav('/driver')} role="button" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
//                         <span style={{ width: 42, height: 42, borderRadius: 999, background: 'rgb(37,99,235)', display: 'grid', placeItems: 'center', color: 'white', overflow: 'hidden' }} aria-hidden="true">
//                           <img src="Logo_notext.png" alt="Logo" style={{ width: 41, height: 50, display: 'block', marginLeft: -1 }} />
//                         </span>
//                         <div style={{ fontWeight: 900, fontSize: 18, color: '#0549fa' }}>EasyPark</div>
//                     </div>
//                     <button ref={profileBtnRef} type="button" onClick={() => { if (profileOpen) setProfileOpen(false); else openProfileMenu() }} aria-label="Profile menu" style={{ width: 42, height: 42, borderRadius: 999, border: 0, background: '#2563eb', color: 'white', cursor: 'pointer', display: 'grid', placeItems: 'center', boxShadow: '0 10px 20px rgba(37, 99, 235, 0.25)' }}>
//                         <IconUser size={18} />
//                     </button>
//                 </div>

//                 {/* SEARCH BAR SECTION */}
//                 <div style={{ position: 'absolute', top: 74, left: 12, right: 12, pointerEvents: 'auto' }}>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.96)', boxShadow: '0 14px 40px rgba(15, 23, 42, 0.14)' }}>
//                         <span style={{ color: '#94a3b8' }} aria-hidden="true">
//                             <IconSearch size={18} />
//                         </span>

//                         <div style={{ flex: 1 }}>
//                             <Autocomplete
//                                 onLoad={onLoadAutocomplete}
//                                 onPlaceChanged={onPlaceChanged}
//                             >
//                                 <input
//                                     value={address}
//                                     onChange={(e) => {
//                                         setAddress(e.target.value);
//                                         // Clear bounds if user clears text manually
//                                         if (e.target.value === '') setSearchBounds(null);
//                                     }}
//                                     onKeyDown={handleInputKeyDown}
//                                     placeholder="Search location..."
//                                     autoComplete="off"
//                                     style={{
//                                         width: '100%',
//                                         border: 0,
//                                         outline: 'none',
//                                         fontSize: 16,
//                                         background: 'transparent',
//                                         color: '#0f172a',
//                                     }}
//                                 />
//                             </Autocomplete>
//                         </div>

//                         <button type="button" onClick={() => setFiltersOpen(true)} aria-label="Filters" style={{ width: 40, height: 40, borderRadius: 999, border: 0, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#2563eb' }}>
//                             <IconSliders size={18} />
//                         </button>
//                     </div>
//                 </div>

//                 {/* Footer Stats */}
//                 <div style={{ position: 'absolute', left: 12, bottom: 18, pointerEvents: 'none' }}>
//                     <div style={{ pointerEvents: 'auto', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', borderRadius: 999, padding: '8px 12px', boxShadow: '0 14px 40px rgba(15, 23, 42, 0.14)', fontWeight: 800, color: '#0f172a' }}>
//                         {loading ? 'Loading...' : `${realSpots.length} spots found`}
//                     </div>
//                 </div>

//                 {/* FILTERS MODAL */}
//                 {filtersOpen && (
//                     <div style={{ position: 'absolute', inset: 0, zIndex: 20000, pointerEvents: 'auto' }}>
//                         <button type="button" onClick={() => setFiltersOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.45)', border: 0 }} />
//                         <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.98)', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, boxShadow: '0 -18px 40px rgba(15, 23, 42, 0.20)' }}>
//                             <div style={{ width: 46, height: 5, borderRadius: 999, background: 'rgba(15, 23, 42, 0.12)', margin: '0 auto 12px auto' }} />
//                             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
//                                 <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Filters</div>
//                                 <button type="button" onClick={() => setFiltersOpen(false)} style={{ border: 0, background: 'transparent', fontWeight: 800, cursor: 'pointer', color: '#2563eb' }}>Close</button>
//                             </div>
//                             <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
//                                 <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
//                                     <span style={{ fontWeight: 800, color: '#0f172a' }}>Active only</span>
//                                     <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
//                                 </label>
//                                 <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
//                                     <span style={{ fontWeight: 800, color: '#0f172a' }}>Covered only</span>
//                                     <input type="checkbox" checked={coveredOnly} onChange={(e) => setCoveredOnly(e.target.checked)} />
//                                 </label>
//                                 <div>
//                                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
//                                         <span style={{ fontWeight: 800, color: '#0f172a' }}>Max price</span>
//                                         <span style={{ fontWeight: 900, color: '#64748b' }}>{maxPrice}/hr</span>
//                                     </div>
//                                     <input type="range" min="0" max="100" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} style={{ width: '100%' }} />
//                                 </div>
//                                 <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
//                                     <button type="button" onClick={handleReset} style={{ flex: 1, height: 44, borderRadius: 12, border: '1px solid rgba(15, 23, 42, 0.14)', background: 'transparent', fontWeight: 900, cursor: 'pointer' }}>Reset</button>
//                                     <button type="button" onClick={() => setFiltersOpen(false)} style={{ flex: 1, height: 44, borderRadius: 12, border: 0, background: '#0f172a', color: 'white', fontWeight: 900, cursor: 'pointer' }}>Apply</button>
//                                 </div>
//                             </div>
//                             <div style={{ height: 14 }} />
//                         </div>
//                     </div>
//                 )}
//             </div>

//             {profileOpen && (
//                 <div style={{ position: 'fixed', inset: 0, zIndex: 999999, pointerEvents: 'auto' }}>
//                     <button type="button" onClick={() => setProfileOpen(false)} style={{ position: 'absolute', inset: 0, background: 'transparent', border: 0, padding: 0, margin: 0 }} />
//                     <div
//                         style={{
//                             position: 'absolute',
//                             top: profileMenuPos.top,
//                             left: profileMenuPos.left,
//                             width: 220,
//                             background: 'rgba(255,255,255,0.98)',
//                             backdropFilter: 'blur(10px)',
//                             border: '1px solid rgba(15, 23, 42, 0.10)',
//                             boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)',
//                             borderRadius: 14,
//                             padding: 8,
//                         }}
//                     >
//                         {roles.has('OWNER') && (
//                             <button
//                                 type="button"
//                                 onClick={() => {
//                                     setProfileOpen(false)
//                                     nav('/manage-spots')
//                                 }}
//                                 style={{
//                                     width: '100%',
//                                     height: 42,
//                                     borderRadius: 12,
//                                     border: 0,
//                                     background: '#e2e8f0',
//                                     textAlign: 'left',
//                                     padding: '0 12px',
//                                     fontWeight: 700,
//                                     cursor: 'pointer',
//                                     color: '#1e293b',
//                                     marginBottom: '5px',
//                                     transition: 'background 0.2s',
//                                 }}
//                                 onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
//                                 onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
//                             >
//                                 Manage Spots
//                             </button>
//                         )}
//                         {roles.has('DRIVER') && (
//                             <button
//                                 type="button"
//                                 onClick={() => {
//                                     setProfileOpen(false)
//                                     nav('/my-bookings')
//                                 }}
//                                 style={{
//                                     width: '100%',
//                                     height: 42,
//                                     borderRadius: 12,
//                                     border: 0,
//                                     background: 'transparent',
//                                     textAlign: 'left',
//                                     padding: '0 12px',
//                                     fontWeight: 600,
//                                     cursor: 'pointer',
//                                     color: '#1e293b',
//                                     marginBottom: '5px',
//                                     transition: 'background 0.2s',
//                                 }}
//                                 onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
//                                 onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
//                             >
//                                 My Bookings
//                             </button>
//                         )}

//                         <button
//                             type="button"
//                             onClick={() => {
//                                 setProfileModalOpen(true)
//                                 nav('/manage-profile')
//                             }}
//                             style={{
//                                 width: '100%',
//                                 height: 42,
//                                 borderRadius: 12,
//                                 border: 0,
//                                 background: 'transparent',
//                                 textAlign: 'left',
//                                 padding: '0 12px',
//                                 fontWeight: 600,
//                                 cursor: 'pointer',
//                                 color: '#1e293b',
//                                 marginBottom: '5px',
//                                 transition: 'background 0.2s',
//                             }}
//                             onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
//                             onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
//                         >
//                             Manage Profile
//                         </button>

//                         <button
//                             type="button"
//                             onClick={doLogout}
//                             style={{
//                                 width: '100%',
//                                 height: 42,
//                                 borderRadius: 12,
//                                 border: 0,
//                                 background: 'rgba(239, 68, 68, 0.10)',
//                                 textAlign: 'left',
//                                 padding: '0 12px',
//                                 fontWeight: 900,
//                                 cursor: 'pointer',
//                                 color: '#ef4444',
//                             }}
//                         >
//                             Logout
//                         </button>
//                     </div>

//                 </div>
//             )}
//             <ProfileModal
//                 isOpen={isProfileModalOpen}
//                 onClose={() => setProfileModalOpen(false)}
//                 onUpdateSuccess={(updatedUser) => {
//                     const u = updatedUser ?? getCurrentUser()
//                     const roles = new Set(u?.roles ?? [])

//                     // If user became OWNER-only, driver page is no longer allowed -> redirect now
//                     if (roles.has('OWNER') && !roles.has('DRIVER')) {
//                         nav('/owner', { replace: true })
//                         return
//                     }

//                     // BOTH or still DRIVER -> stay on /driver (no action needed)
//                 }}
//             />
//             <BookParkingModal
//                 isOpen={bookingOpen}
//                 spot={bookingSpot}
//                 onClose={() => setBookingOpen(false)}
//                 onBooked={(b) => {
//                     const total = b?.totalPrice != null ? `₪${b.totalPrice}` : ''
//                     setBookingToast(`Booking created (#${b?.id}). Status: ${b?.status || 'PENDING'} ${total}`)
//                     setTimeout(() => setBookingToast(''), 3500)
//                 }}
//             />

//             {bookingToast && (
//                 <div style={{ position: 'absolute', left: 12, right: 12, bottom: 80, zIndex: 50000, pointerEvents: 'none' }}>
//                     <div
//                         style={{
//                             pointerEvents: 'auto',
//                             background: 'rgba(255,255,255,0.96)',
//                             border: '1px solid rgba(15,23,42,0.12)',
//                             borderRadius: 14,
//                             padding: 12,
//                             boxShadow: '0 14px 40px rgba(15, 23, 42, 0.14)',
//                             fontWeight: 900,
//                             color: '#0f172a',
//                         }}
//                     >
//                         {bookingToast}
//                     </div>
//                 </div>
//             )}


//         </div>
//     )
// }

import React, { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Autocomplete } from '@react-google-maps/api'
import '../styles/driver.css'
import MapComponent from '../components/map/mapComponent'
import { logout, getCurrentUser, subscribeAuthChanged } from '../services/session'
import ProfileModal from '../components/modals/ProfileModal';
import BookParkingModal from '../components/modals/BookParkingModal'

// --- ICONS ---
function IconPin({ size = 18 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 22s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z" stroke="currentColor" strokeWidth="1.8" /><path d="M12 13.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" strokeWidth="1.8" /></svg>) }
function IconUser({ size = 18 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 12a4.2 4.2 0 1 0-4.2-4.2A4.2 4.2 0 0 0 12 12Z" stroke="currentColor" strokeWidth="1.8" /><path d="M4.5 20.2c1.4-4.2 13.6-4.2 15 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>) }
function IconSearch({ size = 18 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10.5 18.5a8 8 0 1 1 5.2-14.1A8 8 0 0 1 10.5 18.5Z" stroke="currentColor" strokeWidth="1.8" /><path d="M16.8 16.8 21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>) }
function IconSliders({ size = 18 }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h6M14 18h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M14 6a2 2 0 1 0 0 .01ZM8 12a2 2 0 1 0 0 .01ZM12 18a2 2 0 1 0 0 .01Z" fill="currentColor" /></svg>) }

const defaultCenter = { lat: 32.0853, lng: 34.7818 };

export default function DriverPage() {
    const nav = useNavigate()
    const location = useLocation()
    const [user, setUser] = useState(getCurrentUser())
    
    // -- Refs --
    const mapRef = useRef(null)
    const isPlaceSelectedRef = useRef(false) // למניעת כפילות בבחירה

    const [bookingOpen, setBookingOpen] = useState(false)
    const [bookingSpot, setBookingSpot] = useState(null)
    const [bookingToast, setBookingToast] = useState('')
    const [availFrom, setAvailFrom] = useState('')
    const [availTo, setAvailTo] = useState('')

    useEffect(() => {
        return subscribeAuthChanged(() => setUser(getCurrentUser()))
    }, [])

    const roles = new Set(user?.roles ?? [])

    // Filters & Search State
    const [address, setAddress] = useState('')
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [coveredOnly, setCoveredOnly] = useState(false)
    const [activeOnly, setActiveOnly] = useState(true)
    const [maxPrice, setMaxPrice] = useState('')
    
    // -- State עבור גבולות המפה (המשתנה החסר!) --
    const [searchBounds, setSearchBounds] = useState(null)

    // Data State
    const [realSpots, setRealSpots] = useState([])
    const [loading, setLoading] = useState(false)
    const [mapCenter, setMapCenter] = useState(defaultCenter)
    const [autocomplete, setAutocomplete] = useState(null)

    // UI State
    const [profileOpen, setProfileOpen] = useState(false)
    const profileBtnRef = useRef(null)
    const [profileMenuPos, setProfileMenuPos] = useState({ top: 0, left: 0 })
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);

    useEffect(() => {
        setProfileOpen(false)
        setFiltersOpen(false)
    }, [location.key])
    
    useEffect(() => {
        setUser(getCurrentUser())
    }, [location.key])

    // --- FETCH DATA ---
    // שיחזרנו את הלוגיקה שלך אבל הסרנו את address מהתלויות כדי למנוע ריענון בכל הקלדה
    useEffect(() => {
        const fetchSpots = async () => {
            setLoading(true);
            try {
                const params = {};
                if (coveredOnly) params.covered = true;
                const max = Number(maxPrice);
                if (Number.isFinite(max) && max > 0) params.maxPrice = max;

                const response = await axios.get('http://localhost:8080/api/parking-spots/search', {
                    params,
                    headers: { Authorization: `Bearer ${localStorage.getItem('easypark_token')}` }
                });

                let data = response.data || [];

                if (activeOnly) {
                    data = data.filter(s => s.active === true);
                }

                // Availability Filter
                if (availFrom && availTo) {
                    const wantFrom = new Date(availFrom)
                    const wantTo = new Date(availTo)
                    data = data.filter((s) => {
                        if (!s?.availableFrom || !s?.availableTo) return true
                        const spotFrom = new Date(s.availableFrom)
                        const spotTo = new Date(s.availableTo)
                        return spotFrom <= wantFrom && spotTo >= wantTo
                    })
                }

                // GEOSPATIAL FILTER (Bounds Check)
                // זהו המשתנה שגרם לשגיאה - עכשיו הוא בטוח בתוך ה-Effect
                if (searchBounds) {
                    data = data.filter(s => {
                        const lat = Number(s.lat);
                        const lng = Number(s.lng);
                        if (isNaN(lat) || isNaN(lng)) return false;

                        return (
                            lat <= searchBounds.north &&
                            lat >= searchBounds.south &&
                            lng <= searchBounds.east &&
                            lng >= searchBounds.west
                        );
                    });
                }
                
                setRealSpots(data);
            } catch (error) {
                console.error("Failed to fetch spots", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSpots();
    }, [coveredOnly, maxPrice, activeOnly, searchBounds, availFrom, availTo]); 

    // --- HELPER: Fetch Place Details Manually ---
    const fetchFirstPredictionDetails = (inputText) => {
        return new Promise((resolve, reject) => {
            if (!window.google || !window.google.maps || !window.google.maps.places) {
                return reject("Google Maps API not loaded");
            }
            const autocompleteService = new window.google.maps.places.AutocompleteService();
            autocompleteService.getPlacePredictions({ input: inputText }, (predictions, status) => {
                if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions || predictions.length === 0) {
                    return reject("No predictions found");
                }
                // לוקחים את התוצאה הראשונה
                const firstPlaceId = predictions[0].place_id;
                setAddress(predictions[0].description);

                const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
                placesService.getDetails({
                    placeId: firstPlaceId,
                    fields: ['geometry', 'formatted_address', 'types', 'place_id'] 
                }, (place, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                        resolve(place);
                    } else {
                        reject("Failed to get place details");
                    }
                });
            });
        });
    };

    // --- MAIN LOGIC: Handle Selected Place ---
    const handlePlaceSelect = (place) => {
        if (place.geometry && place.geometry.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();

            setMapCenter({ lat, lng });

            const types = place.types || [];
            const isBroadArea = types.includes('locality') || 
                                types.includes('administrative_area_level_1') ||
                                types.includes('administrative_area_level_2');

            if (isBroadArea && place.geometry.viewport) {
                // עיר/אזור - משתמשים ב-Viewport של גוגל
                const bounds = place.geometry.viewport;
                setSearchBounds({
                    north: bounds.getNorthEast().lat(),
                    south: bounds.getSouthWest().lat(),
                    east: bounds.getNorthEast().lng(),
                    west: bounds.getSouthWest().lng()
                });
                
                // שימוש ב-ref כדי להזיז את המפה בפועל
                if (mapRef.current) {
                    mapRef.current.fitBounds(bounds);
                }

            } else {
                // כתובת ספציפית - רדיוס קבוע
                const delta = 0.015; 
                setSearchBounds({
                    north: lat + delta,
                    south: lat - delta,
                    east: lng + delta,
                    west: lng - delta
                });
                
                // זום ידני למקום
                if (mapRef.current) {
                    mapRef.current.setZoom(15);
                    mapRef.current.panTo({ lat, lng });
                }
            }

            if (place.formatted_address) {
                setAddress(place.formatted_address);
            }
        }
    };

    const onLoadAutocomplete = (au) => setAutocomplete(au);

    const onPlaceChanged = () => {
        isPlaceSelectedRef.current = true;
        if (autocomplete !== null) {
            const place = autocomplete.getPlace();
            handlePlaceSelect(place);
        }
    }

    // --- לוגיקת Enter המשולבת (הקוד הישן + החדש) ---
    const handleInputKeyDown = (e) => {
        // שילוב הקוד הישן: בדיקה אם המשתמש מנווט עם החצים
        const isDropdownItemHtmlSelected = document.querySelector('.pac-item-selected');
        if (isDropdownItemHtmlSelected) {
            return; // תן לגוגל לעשות את העבודה
        }

        if (e.key === 'Enter' && address.trim() !== '') {
            isPlaceSelectedRef.current = false;
            
            // חיכיון קצר כדי לראות אם onPlaceChanged נתפס קודם
            setTimeout(async () => {
                if (isPlaceSelectedRef.current) return;
                
                // אם לא נבחר כלום - חיפוש ידני של התוצאה הראשונה
                try {
                    const place = await fetchFirstPredictionDetails(address);
                    handlePlaceSelect(place);
                    if (e.target) e.target.blur();
                } catch (err) {
                    console.warn("Manual fetch failed:", err);
                }
            }, 300);
        }
    };

    const handleReset = () => {
        setAddress('');
        setSearchBounds(null); 
        setCoveredOnly(false);
        setActiveOnly(true);
        setMaxPrice('');
    }

    const doLogout = () => { try { localStorage.removeItem('easypark_token') } catch {} try { logout() } catch {} setProfileOpen(false); nav('/', { replace: true }) }
    const openProfileMenu = () => { const el = profileBtnRef.current; if (el) { const r = el.getBoundingClientRect(); setProfileMenuPos({ top: r.bottom + 10, left: Math.min(window.innerWidth - 220 - 12, Math.max(12, r.right - 220)) }) } setProfileOpen(true) }

    useEffect(() => {
        if (!profileOpen) return
        const onResizeOrScroll = () => { if(profileBtnRef.current) openProfileMenu() }
        window.addEventListener('resize', onResizeOrScroll)
        window.addEventListener('scroll', onResizeOrScroll, true)
        return () => { window.removeEventListener('resize', onResizeOrScroll); window.removeEventListener('scroll', onResizeOrScroll, true) }
    }, [profileOpen])

    return (
        <div style={{ position: 'relative', height: '100dvh', width: '100vw', overflow: 'hidden', background: '#0b1220' }}>
            
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <MapComponent
                    key={location.key}
                    spots={realSpots}
                    center={mapCenter}
                    // העברת ה-Ref כדי שנוכל לשלוט בזום
                    onMapLoad={(map) => mapRef.current = map}
                    currentUserId={user?.id}
                    onSpotClick={(spot) => {
                        setBookingSpot(spot)
                        setBookingOpen(true)
                    }}
                />
            </div>

            <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '12px 14px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 30px rgba(15, 23, 42, 0.12)', pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div onClick={() => nav('/driver')} role="button" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                        <span style={{ width: 42, height: 42, borderRadius: 999, background: 'rgb(37,99,235)', display: 'grid', placeItems: 'center', color: 'white', overflow: 'hidden' }} aria-hidden="true">
                          <img src="Logo_notext.png" alt="Logo" style={{ width: 41, height: 50, display: 'block', marginLeft: -1 }} />
                        </span>
                        <div style={{ fontWeight: 900, fontSize: 18, color: '#0549fa' }}>EasyPark</div>
                    </div>
                    <button ref={profileBtnRef} type="button" onClick={() => { if (profileOpen) setProfileOpen(false); else openProfileMenu() }} aria-label="Profile menu" style={{ width: 42, height: 42, borderRadius: 999, border: 0, background: '#2563eb', color: 'white', cursor: 'pointer', display: 'grid', placeItems: 'center', boxShadow: '0 10px 20px rgba(37, 99, 235, 0.25)' }}>
                        <IconUser size={18} />
                    </button>
                </div>

                <div style={{ position: 'absolute', top: 74, left: 12, right: 12, pointerEvents: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.96)', boxShadow: '0 14px 40px rgba(15, 23, 42, 0.14)' }}>
                        <span style={{ color: '#94a3b8' }} aria-hidden="true"><IconSearch size={18} /></span>
                        <div style={{ flex: 1 }}>
                            <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChanged}>
                                <input
                                    value={address}
                                    onChange={(e) => {
                                        setAddress(e.target.value);
                                        if (e.target.value === '') setSearchBounds(null);
                                    }}
                                    onKeyDown={handleInputKeyDown}
                                    placeholder="Search location..."
                                    autoComplete="off"
                                    style={{ width: '100%', border: 0, outline: 'none', fontSize: 16, background: 'transparent', color: '#0f172a' }}
                                />
                            </Autocomplete>
                        </div>
                        <button type="button" onClick={() => setFiltersOpen(true)} aria-label="Filters" style={{ width: 40, height: 40, borderRadius: 999, border: 0, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#2563eb' }}><IconSliders size={18} /></button>
                    </div>
                </div>

                 <div style={{ position: 'absolute', left: 12, bottom: 18, pointerEvents: 'none' }}>
                    <div style={{ pointerEvents: 'auto', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', borderRadius: 999, padding: '8px 12px', boxShadow: '0 14px 40px rgba(15, 23, 42, 0.14)', fontWeight: 800, color: '#0f172a' }}>
                        {loading ? 'Loading...' : `${realSpots.length} spots found`}
                    </div>
                </div>

                {/* Filters Modal Logic */}
                {filtersOpen && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 20000, pointerEvents: 'auto' }}>
                        <button type="button" onClick={() => setFiltersOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.45)', border: 0 }} />
                        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.98)', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, boxShadow: '0 -18px 40px rgba(15, 23, 42, 0.20)' }}>
                            <div style={{ width: 46, height: 5, borderRadius: 999, background: 'rgba(15, 23, 42, 0.12)', margin: '0 auto 12px auto' }} />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Filters</div>
                                <button type="button" onClick={() => setFiltersOpen(false)} style={{ border: 0, background: 'transparent', fontWeight: 800, cursor: 'pointer', color: '#2563eb' }}>Close</button>
                            </div>
                            <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontWeight: 800, color: '#0f172a' }}>Active only</span><input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} /></label>
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontWeight: 800, color: '#0f172a' }}>Covered only</span><input type="checkbox" checked={coveredOnly} onChange={(e) => setCoveredOnly(e.target.checked)} /></label>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><span style={{ fontWeight: 800, color: '#0f172a' }}>Max price</span><span style={{ fontWeight: 900, color: '#64748b' }}>{maxPrice ? `${maxPrice}/hr` : 'Any'}</span></div>
                                    <input type="number" inputMode="numeric" min="1" step="1" placeholder="e.g. 100" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid rgba(15,23,42,0.14)', padding: '0 12px', outline: 'none', fontSize: 16, color: '#0f172a' }} />
                                </div>
                                <div style={{ display: 'grid', gap: 10 }}>
                                    <div>
                                        <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Available from</div>
                                        <input type="datetime-local" value={availFrom} onChange={(e) => { const v = e.target.value; setAvailFrom(v); if (availTo && v && v > availTo) setAvailTo('') }} style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid rgba(15,23,42,0.14)', padding: '0 12px', outline: 'none', fontSize: 16, color: '#0f172a' }} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Available to</div>
                                        <input type="datetime-local" value={availTo} min={availFrom || undefined} onChange={(e) => setAvailTo(e.target.value)} style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid rgba(15,23,42,0.14)', padding: '0 12px', outline: 'none', fontSize: 16, color: '#0f172a' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                                    <button type="button" onClick={handleReset} style={{ flex: 1, height: 44, borderRadius: 12, border: '1px solid rgba(15, 23, 42, 0.14)', background: 'transparent', fontWeight: 900, cursor: 'pointer' }}>Reset</button>
                                    <button type="button" onClick={() => setFiltersOpen(false)} style={{ flex: 1, height: 44, borderRadius: 12, border: 0, background: '#0f172a', color: 'white', fontWeight: 900, cursor: 'pointer' }}>Apply</button>
                                </div>
                            </div>
                            <div style={{ height: 14 }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Profile Modal Logic */}
            {profileOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999999, pointerEvents: 'auto' }}>
                    <button type="button" onClick={() => setProfileOpen(false)} style={{ position: 'absolute', inset: 0, background: 'transparent', border: 0, padding: 0, margin: 0 }} />
                    <div style={{ position: 'absolute', top: profileMenuPos.top, left: profileMenuPos.left, width: 220, background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(10px)', border: '1px solid rgba(15, 23, 42, 0.10)', boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)', borderRadius: 14, padding: 8 }}>
                        {roles.has('OWNER') && ( <button type="button" onClick={() => { setProfileOpen(false); nav('/manage-spots') }} style={{ width: '100%', height: 42, borderRadius: 12, border: 0, background: '#e2e8f0', textAlign: 'left', padding: '0 12px', fontWeight: 700, cursor: 'pointer', color: '#1e293b', marginBottom: '5px' }}>Manage Spots</button> )}
                        {roles.has('DRIVER') && ( <button type="button" onClick={() => { setProfileOpen(false); nav('/my-bookings') }} style={{ width: '100%', height: 42, borderRadius: 12, border: 0, background: 'transparent', textAlign: 'left', padding: '0 12px', fontWeight: 600, cursor: 'pointer', color: '#1e293b', marginBottom: '5px' }}>My Bookings</button> )}
                        <button type="button" onClick={() => { setProfileModalOpen(true); nav('/manage-profile') }} style={{ width: '100%', height: 42, borderRadius: 12, border: 0, background: 'transparent', textAlign: 'left', padding: '0 12px', fontWeight: 600, cursor: 'pointer', color: '#1e293b', marginBottom: '5px' }}>Manage Profile</button>
                        <button type="button" onClick={() => { setProfileOpen(false); nav('/change-password') }} style={{ width: '100%', height: 42, borderRadius: 12, border: 0, background: 'transparent', textAlign: 'left', padding: '0 12px', fontWeight: 600, cursor: 'pointer', color: '#1e293b', marginBottom: '5px' }}>Change Password</button>
                        <button type="button" onClick={doLogout} style={{ width: '100%', height: 42, borderRadius: 12, border: 0, background: 'rgba(239, 68, 68, 0.10)', textAlign: 'left', padding: '0 12px', fontWeight: 900, cursor: 'pointer', color: '#ef4444' }}>Logout</button>
                    </div>
                </div>
            )}
            
            <ProfileModal isOpen={isProfileModalOpen} onClose={() => setProfileModalOpen(false)} onUpdateSuccess={(updatedUser) => { const u = updatedUser ?? getCurrentUser(); const roles = new Set(u?.roles ?? []); if (roles.has('OWNER') && !roles.has('DRIVER')) { nav('/owner', { replace: true }); return } }} />
            <BookParkingModal isOpen={bookingOpen} spot={bookingSpot} onClose={() => setBookingOpen(false)} onBooked={(b) => { const total = b?.totalPrice != null ? `₪${b.totalPrice}` : ''; setBookingToast(`Booking created (#${b?.id}). Status: ${b?.status || 'PENDING'} ${total}`); setTimeout(() => setBookingToast(''), 3500) }} />

            {bookingToast && ( <div style={{ position: 'absolute', left: 12, right: 12, bottom: 80, zIndex: 50000, pointerEvents: 'none' }}> <div style={{ pointerEvents: 'auto', background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 14, padding: 12, boxShadow: '0 14px 40px rgba(15, 23, 42, 0.14)', fontWeight: 900, color: '#0f172a' }}> {bookingToast} </div> </div> )}
        </div>
    )
}