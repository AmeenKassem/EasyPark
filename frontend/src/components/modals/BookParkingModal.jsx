import React, { useState, useMemo, useEffect } from 'react';
import { createBooking } from '../../services/booking';

// --- HELPER: Generate Time Slots ---
const generateTimeOptions = () => {
    const times = [];
    for (let i = 0; i < 24 * 60; i += 15) {
        const hours = Math.floor(i / 60);
        const mins = i % 60;
        const formatted = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        times.push(formatted);
    }
    return times;
};

// --- HELPER: Time Manipulation ---
const addMinutesToTime = (timeStr, minutesToAdd) => {
    if (!timeStr) return "00:00";
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, 0, 0);
    date.setMinutes(date.getMinutes() + minutesToAdd);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const getRoundedCurrentTime = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const remainder = 15 - (minutes % 15);
    now.setMinutes(minutes + remainder);
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

function toInputDate(dt) {
    if (!dt) return '';
    return new Date(dt).toISOString().split('T')[0];
}

const timeToMins = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

export default function BookParkingModal({ isOpen, onClose, spot, onBooked }) {
    if (!isOpen || !spot) return null;

    // --- STATE ---
    const [selectedDate, setSelectedDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    const [totalPrice, setTotalPrice] = useState(0);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState({ message: '', isError: false });

    const [busyIntervals, setBusyIntervals] = useState([]);
    const [busyLoading, setBusyLoading] = useState(false);

    const timeOptions = useMemo(() => generateTimeOptions(), []);


    const getDailyLimits = (dateStr) => {
        if (!dateStr || !spot) return null;


        if (!spot.availabilityList || spot.availabilityList.length === 0) {
            // Fallback to simple fields if list is missing but old fields exist
            if (spot.startTime && spot.endTime) {
                return { start: spot.startTime.substring(0,5), end: spot.endTime.substring(0,5) };
            }
            return { start: "00:00", end: "23:59" };
        }

        const dateObj = new Date(dateStr);
        const dayOfWeek = dateObj.getDay(); // 0=Sun, 1=Mon...

        if (spot.availabilityType === 'RECURRING') {

            const rule = spot.availabilityList.find(r => r.dayOfWeek === dayOfWeek);
            if (rule && rule.startTime && rule.endTime) {
                return {
                    start: rule.startTime.substring(0, 5),
                    end: rule.endTime.substring(0, 5)
                };
            }
            return null;
        }

        else if (spot.availabilityType === 'SPECIFIC') {

            const targetDate = new Date(dateStr);

            const rule = spot.availabilityList.find(r => {
                const start = new Date(r.startDateTime);
                const end = new Date(r.endDateTime);
                return targetDate >= new Date(start.toDateString()) && targetDate <= new Date(end.toDateString());
            });

            if (rule) {

                const s = new Date(rule.startDateTime);
                const e = new Date(rule.endDateTime);


                const startStr = (s.toDateString() === targetDate.toDateString())
                    ? `${s.getHours().toString().padStart(2,'0')}:${s.getMinutes().toString().padStart(2,'0')}`
                    : "00:00";


                const endStr = (e.toDateString() === targetDate.toDateString())
                    ? `${e.getHours().toString().padStart(2,'0')}:${e.getMinutes().toString().padStart(2,'0')}`
                    : "23:59";

                return { start: startStr, end: endStr };
            }
            return null;
        }

        return { start: "00:00", end: "23:59" };
    };


    // --- SMART DEFAULTS ---
    useEffect(() => {
        if (isOpen) {
            const today = new Date().toISOString().split('T')[0];
            const defaultDate = (spot.availableFrom && spot.availableFrom > today)
                ? toInputDate(spot.availableFrom)
                : today;

            setSelectedDate(defaultDate);


            const limits = getDailyLimits(defaultDate);
            let smartStart = getRoundedCurrentTime();

            if (limits) {

                if (timeToMins(smartStart) < timeToMins(limits.start)) {
                    smartStart = limits.start;
                }

                if (timeToMins(smartStart) >= timeToMins(limits.end)) {
                    smartStart = limits.start;
                }

                setStartTime(smartStart);
                setEndTime(addMinutesToTime(smartStart, 120)); // +2 hours
            } else {

                setStartTime("09:00");
                setEndTime("11:00");
            }

            setFeedback({ message: '', isError: false });
        }

    }, [isOpen, spot]);

    // --- FETCH BUSY ---
    useEffect(() => {
        if (!isOpen || !spot?.id || !selectedDate) return;

        let cancelled = false;
        const fetchBusy = async () => {
            setBusyLoading(true);
            try {
                const startOfDay = `${selectedDate}T00:00:00`;
                const endOfDay = `${selectedDate}T23:59:59`;
                const params = new URLSearchParams({ from: startOfDay, to: endOfDay });
                const token = localStorage.getItem('easypark_token');

                const res = await fetch(`http://localhost:8080/api/parking-spots/${spot.id}/busy?${params}`, {
                    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
                });

                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled) setBusyIntervals(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error("Failed to load busy intervals", err);
            } finally {
                if (!cancelled) setBusyLoading(false);
            }
        };
        fetchBusy();
        return () => { cancelled = true; };
    }, [isOpen, spot, selectedDate]);

    // --- PRICE ---
    useEffect(() => {
        if (selectedDate && startTime && endTime) {
            const start = new Date(`${selectedDate}T${startTime}`);
            const end = new Date(`${selectedDate}T${endTime}`);
            if (end > start) {
                const diffMs = end - start;
                const diffHours = diffMs / (1000 * 60 * 60);
                setTotalPrice((diffHours * (spot.pricePerHour || 0)).toFixed(2));
            } else {
                setTotalPrice(0);
            }
        }
    }, [selectedDate, startTime, endTime, spot]);

    // --- VALIDATION HELPERS ---

    const isOwnerClosed = (timeStr) => {
        const limits = getDailyLimits(selectedDate);
        if (!limits) return true;

        const t = timeToMins(timeStr);
        return t < timeToMins(limits.start) || t > timeToMins(limits.end);
    };

    const isBookedBusy = (timeStr) => {
        const fullDateTime = new Date(`${selectedDate}T${timeStr}`);
        return busyIntervals.some(interval => {
            const busyStart = new Date(interval.startTime);
            const busyEnd = new Date(interval.endTime);
            return fullDateTime >= busyStart && fullDateTime < busyEnd;
        });
    };

    const getValidationError = () => {
        if (!selectedDate || !startTime || !endTime) return null;
        if (timeToMins(endTime) <= timeToMins(startTime)) return "End time must be after start time";

        if (isOwnerClosed(startTime) || isOwnerClosed(endTime)) return "Selected time is outside operating hours.";

        const s = new Date(`${selectedDate}T${startTime}`);
        const e = new Date(`${selectedDate}T${endTime}`);
        const hasOverlap = busyIntervals.some(interval => {
            const bS = new Date(interval.startTime);
            const bE = new Date(interval.endTime);
            return s < bE && e > bS;
        });

        if (hasOverlap) return "Selected range overlaps with an existing booking.";
        return null;
    };

    const errorMsg = getValidationError();

    // --- HANDLERS ---
    const handleBook = async () => {
        if (errorMsg) return;
        setSaving(true);
        setFeedback({ message: '', isError: false });

        try {
            const payload = {
                parkingId: spot.id,
                startTime: `${selectedDate}T${startTime}:00`,
                endTime: `${selectedDate}T${endTime}:00`,
            };

            await createBooking(payload);
            onBooked?.();
            onClose?.();
        } catch (e) {
            console.error(e);

            const msg = e.response?.data?.message || e.message || 'Booking failed. Try again.';
            setFeedback({ message: msg, isError: true });
        } finally {
            setSaving(false);
        }
    };

    // --- RENDER TIMELINE ---
    const renderTimeline = () => {
        const startMins = timeToMins(startTime);
        const endMins = timeToMins(endTime);
        const selectionLeft = (startMins / 1440) * 100;
        const selectionWidth = ((endMins - startMins) / 1440) * 100;

        // Visualizing Closed Areas based on Daily Limits
        const limits = getDailyLimits(selectedDate) || { start: "00:00", end: "00:00" }; // If null, treat as fully closed
        const limitStartMins = timeToMins(limits.start);
        const limitEndMins = timeToMins(limits.end);

        // Gray area BEFORE open
        const closedStartWidth = (limitStartMins / 1440) * 100;
        // Gray area AFTER close
        const closedEndLeft = (limitEndMins / 1440) * 100;
        const closedEndWidth = 100 - closedEndLeft;

        return (
            <div style={{ margin: '20px 0', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginBottom: '6px' }}>
                    <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:59</span>
                </div>

                <div style={{ position: 'relative', height: '24px', background: '#f1f5f9', borderRadius: '12px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                    {/* Closed Areas */}
                    <div style={{ position: 'absolute', left: 0, width: `${closedStartWidth}%`, height: '100%', background: '#cbd5e1', opacity: 0.5 }} title="Closed" />
                    <div style={{ position: 'absolute', left: `${closedEndLeft}%`, width: `${closedEndWidth}%`, height: '100%', background: '#cbd5e1', opacity: 0.5 }} title="Closed" />

                    {/* Busy Blocks */}
                    {busyIntervals.map((interval, idx) => {
                        const bS = new Date(interval.startTime);
                        const bE = new Date(interval.endTime);
                        const startOfDay = new Date(`${selectedDate}T00:00:00`);
                        let startPct = ((bS - startOfDay) / 1000 / 60 / 1440) * 100;
                        let widthPct = ((bE - bS) / 1000 / 60 / 1440) * 100;
                        if (startPct < 0) { widthPct += startPct; startPct = 0; }
                        if (startPct + widthPct > 100) widthPct = 100 - startPct;
                        return <div key={idx} style={{ position: 'absolute', left: `${startPct}%`, width: `${widthPct}%`, height: '100%', background: '#ef4444', opacity: 0.6 }} />;
                    })}

                    {/* Selection */}
                    {startTime && endTime && selectionWidth > 0 && (
                        <div style={{ position: 'absolute', left: `${selectionLeft}%`, width: `${selectionWidth}%`, height: '100%', background: '#22c55e', boxShadow: '0 0 0 2px white', zIndex: 10 }} />
                    )}
                </div>

                {/* Legend */}
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <span style={{display:'flex', alignItems:'center', gap:'4px'}}><div style={{width:8, height:8, background:'#cbd5e1', borderRadius:'50%'}}></div>Closed</span>
                    <span style={{display:'flex', alignItems:'center', gap:'4px'}}><div style={{width:8, height:8, background:'#ef4444', borderRadius:'50%'}}></div>Busy</span>
                    <span style={{display:'flex', alignItems:'center', gap:'4px'}}><div style={{width:8, height:8, background:'#22c55e', borderRadius:'50%'}}></div>Selected</span>
                </div>
            </div>
        );
    };

    return (
        <div style={overlayStyle}>
            <button onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', border: 0 }} />

            <div style={modalStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Request Booking</h2>
                    <button onClick={onClose} style={closeBtnStyle}>&times;</button>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={labelStyle}>Date</label>
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} min={new Date().toISOString().split('T')[0]} style={inputStyle} />
                </div>

                {renderTimeline()}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                    <div>
                        <label style={labelStyle}>Start Time</label>
                        <select
                            value={startTime}
                            onChange={(e) => {
                                setStartTime(e.target.value);
                                if (timeToMins(e.target.value) >= timeToMins(endTime)) {
                                    setEndTime(addMinutesToTime(e.target.value, 120));
                                }
                            }}
                            style={selectStyle}
                        >
                            {timeOptions.map(t => {
                                const closed = isOwnerClosed(t);
                                const busy = !closed && isBookedBusy(t);

                                return (
                                    <option
                                        key={t}
                                        value={t}
                                        disabled={closed || busy}
                                        style={{
                                            color: busy ? '#dc2626' : (closed ? '#cbd5e1' : '#0f172a'),
                                            fontWeight: busy ? 'bold' : 'normal',
                                            backgroundColor: busy ? '#fef2f2' : '#fff'
                                        }}
                                    >
                                        {t} {closed ? '(Closed)' : busy ? '⛔ (Busy)' : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>End Time</label>
                        <select value={endTime} onChange={(e) => setEndTime(e.target.value)} style={selectStyle}>
                            {timeOptions.map(t => {
                                if (startTime && timeToMins(t) <= timeToMins(startTime)) return null;

                                const closed = isOwnerClosed(t);
                                const busy = !closed && isBookedBusy(t);

                                return (
                                    <option
                                        key={t}
                                        value={t}
                                        disabled={closed || busy}
                                        style={{
                                            color: busy ? '#dc2626' : (closed ? '#cbd5e1' : '#0f172a'),
                                            fontWeight: busy ? 'bold' : 'normal',
                                            backgroundColor: busy ? '#fef2f2' : '#fff'
                                        }}
                                    >
                                        {t} {closed ? '(Closed)' : busy ? '⛔ (Busy)' : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Total Estimate</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>
                            {totalPrice > 0 ? `₪${totalPrice}` : '--'}
                        </div>
                    </div>

                    <button
                        onClick={handleBook}
                        disabled={saving || !!errorMsg || !totalPrice}
                        style={{
                            padding: '12px 24px',
                            background: (saving || !!errorMsg) ? '#94a3b8' : '#0f172a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: (saving || !!errorMsg) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {saving ? 'Booking...' : 'Confirm'}
                    </button>
                </div>

                {errorMsg && <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '10px', textAlign: 'center', background: '#fee2e2', padding: '8px', borderRadius: '6px' }}>{errorMsg}</div>}

                {feedback.isError && !errorMsg && (
                    <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '10px', textAlign: 'center', background: '#fee2e2', padding: '8px', borderRadius: '6px' }}>
                        {feedback.message}
                    </div>
                )}
            </div>
        </div>
    );
}

// --- STYLES ---
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' };
const overlayStyle = { position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalStyle = { position: 'relative', background: 'white', width: '90%', maxWidth: '400px', padding: '25px', borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' };
const closeBtnStyle = { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#cbd5e1' };
const selectStyle = {
    width: '100%', height: '48px', padding: '0 12px', paddingRight: '35px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '16px', outline: 'none', color: '#0f172a', backgroundColor: '#fff', cursor: 'pointer', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
};
const inputStyle = { ...selectStyle, backgroundImage: 'none', paddingRight: '12px' };