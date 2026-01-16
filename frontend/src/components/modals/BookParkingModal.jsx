import React, { useState, useMemo, useEffect } from 'react';
import { createBooking } from '../../services/booking';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";


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
const toYMD = (d) => (d ? d.toISOString().split('T')[0] : '');

export default function BookParkingModal({ isOpen, onClose, spot, onBooked }) {
    if (!isOpen || !spot) return null;

    // --- STATE ---
    const [startDate, setStartDate] = useState(null); // Date object
    const [endDate, setEndDate] = useState(null);     // Date object
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');


    const [totalPrice, setTotalPrice] = useState(0);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState({ message: '', isError: false });

    const [busyIntervals, setBusyIntervals] = useState([]);
    const [busyLoading, setBusyLoading] = useState(false);

    const timeOptions = useMemo(() => generateTimeOptions(), []);

    const normalizedAvailabilityList = useMemo(() => {
        if (!spot) return [];

        const type = String(spot.availabilityType || '').toUpperCase();

        // Backend sends recurringSchedule: [{ dayOfWeek, start, end }]
        if (type === 'RECURRING' && Array.isArray(spot.recurringSchedule)) {
            return spot.recurringSchedule.map(r => ({
                dayOfWeek: r.dayOfWeek,
                startTime: r.start, // backend uses "start"
                endTime: r.end,     // backend uses "end"
            }));
        }

        // Backend sends specificAvailability: [{ start, end }]
        if (type === 'SPECIFIC' && Array.isArray(spot.specificAvailability)) {
            return spot.specificAvailability.map(r => ({
                startDateTime: r.start, // backend uses "start"
                endDateTime: r.end,     // backend uses "end"
            }));
        }

        return [];
    }, [spot]);
    const isSelectableDate = (date) => {
        console.log("check", date.toDateString(), "jsDay", date.getDay(), "rules", normalizedAvailabilityList.map(x=>x.dayOfWeek));

        if (!date || !spot) return false;

        const type = String(spot.availabilityType || '').trim().toUpperCase();

        // No availability config => not selectable (strict blocking)
        if (!normalizedAvailabilityList || normalizedAvailabilityList.length === 0) return false;

        if (type === 'RECURRING') {
            const jsDay = date.getDay(); // 0=Sun..6=Sat

            // Support multiple backend conventions
            const alt1 = jsDay === 0 ? 7 : jsDay;       // 1..7 (Mon..Sun)
            const alt2 = jsDay === 0 ? 1 : jsDay + 1;   // 1..7 (Sun..Sat)

            return normalizedAvailabilityList.some(r => {
                const d = r.dayOfWeek;
                return d === jsDay || d === alt1 || d === alt2;
            });
        }

        if (type === 'SPECIFIC') {
            const targetYMD = toYMD(date); // YYYY-MM-DD

            return normalizedAvailabilityList.some(r => {
                const sYMD = String(r.startDateTime || '').split('T')[0];
                const eYMD = String(r.endDateTime || '').split('T')[0];
                return targetYMD >= sYMD && targetYMD <= eYMD;
            });
        }

        return false;
    };

    const getDailyLimits = (dateStr) => {
        const type = String(spot.availabilityType || '').trim().toUpperCase();
        if (!dateStr || !spot) return null;

        console.log("DEBUG spot keys:", Object.keys(spot || {}));
        console.log("DEBUG availabilityType:", spot?.availabilityType);
        console.log("DEBUG normalizedAvailabilityList:", normalizedAvailabilityList);

        if (!normalizedAvailabilityList || normalizedAvailabilityList.length === 0) {
            // Fallback to simple fields if list is missing but old fields exist
            if (spot.startTime && spot.endTime) {
                return { start: spot.startTime.substring(0,5), end: spot.endTime.substring(0,5) };
            }
            return null;
        }

        const dateObj = new Date(dateStr);
        const dayOfWeek = dateObj.getDay(); // 0=Sun, 1=Mon...

        if (type === 'RECURRING') {

            const rule = normalizedAvailabilityList.find(r => r.dayOfWeek === dayOfWeek);
            if (rule && rule.startTime && rule.endTime) {
                return {
                    start: rule.startTime.substring(0, 5),
                    end: rule.endTime.substring(0, 5)
                };
            }
            return null;
        }

        else if (type === 'SPECIFIC') {

            const targetDate = new Date(dateStr);

            const rule = normalizedAvailabilityList.find(r => {
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
            const todayStr = new Date().toISOString().split('T')[0];
            const defaultDateStr = (spot.availableFrom && spot.availableFrom > todayStr)
                ? toInputDate(spot.availableFrom)
                : todayStr;

// Convert to Date object for DatePicker
            const defaultDateObj = new Date(`${defaultDateStr}T00:00:00`);
            setStartDate(defaultDateObj);
            setEndDate(defaultDateObj);
            const limits = getDailyLimits(defaultDateStr); // for start day defaults


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
        if (!isOpen || !spot?.id || !startDate || !endDate) return;
        const fromYMD = toYMD(startDate);
        const toYMD_ = toYMD(endDate);

        let cancelled = false;
        const fetchBusy = async () => {
            setBusyLoading(true);
            try {
                const startOfDay = `${fromYMD}T00:00:00`;
                const endOfDay = `${toYMD_}T23:59:59`;

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
    }, [isOpen, spot, startDate,endDate]);

    // --- PRICE ---
    useEffect(() => {
        if (startDate && endDate && startTime && endTime) {
            const start = new Date(`${toYMD(startDate)}T${startTime}`);
            const end = new Date(`${toYMD(endDate)}T${endTime}`);

            if (end > start) {
                const diffMs = end - start;
                const diffHours = diffMs / (1000 * 60 * 60);
                setTotalPrice((diffHours * (spot.pricePerHour || 0)).toFixed(2));
            } else {
                setTotalPrice(0);
            }
        }
    }, [startDate,endDate, startTime, endTime, spot]);

    // --- VALIDATION HELPERS ---

    const isOwnerClosed = (dateObj, timeStr) => {
        const limits = getDailyLimits(toYMD(dateObj));
        if (!limits) return true;

        const t = timeToMins(timeStr);
        return t < timeToMins(limits.start) || t > timeToMins(limits.end);
    };


    const isBookedBusy = (dateObj, timeStr) => {
        const ymd = toYMD(dateObj);
        const fullDateTime = new Date(`${ymd}T${timeStr}`);
        return busyIntervals.some(interval => {
            const busyStart = new Date(interval.startTime);
            const busyEnd = new Date(interval.endTime);
            return fullDateTime >= busyStart && fullDateTime < busyEnd;
        });
    };


    const getValidationError = () => {
        if (!startDate|| !endDate || !startTime || !endTime) return null;
        if (timeToMins(endTime) <= timeToMins(startTime)) return "End time must be after start time";

        if (isOwnerClosed(startDate,startTime) || isOwnerClosed(endDate,endTime)) return "Selected time is outside operating hours.";

        const s = new Date(`${toYMD(startDate)}T${startTime}`);
        const e = new Date(`${toYMD(endDate)}T${endTime}`);
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
                startTime: `${toYMD(startDate)}T${startTime}:00`,
                endTime: `${toYMD(endDate)}T${endTime}:00`,
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
        const limits = getDailyLimits(toYMD(startDate)) || { start: "00:00", end: "00:00" }; // If null, treat as fully closed
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
                        const startOfDay = new Date(`${toYMD(startDate)}T00:00:00`);
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
                    <label style={labelStyle}>Start Date</label>
                    <DatePicker
                        selected={startDate}
                        onChange={(d) => {
                            setStartDate(d);
                            // keep endDate >= startDate
                            if (!endDate || (d && endDate < d)) setEndDate(d);
                        }}
                        minDate={new Date()}
                        filterDate={isSelectableDate}
                        dateFormat="MM/dd/yyyy"
                        placeholderText="Select start date"
                        className="ep-date-picker"
                    />

                    <div style={{ height: 10 }} />

                    <label style={labelStyle}>End Date</label>
                    <DatePicker
                        selected={endDate}
                        onChange={(d) => setEndDate(d)}
                        minDate={startDate || new Date()}
                        filterDate={isSelectableDate}
                        dateFormat="MM/dd/yyyy"
                        placeholderText="Select end date"
                        className="ep-date-picker"
                    />


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
                                const closed = isOwnerClosed(startDate,t);
                                const busy = !closed && isBookedBusy(startDate,t);

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

                                const closed = isOwnerClosed(endDate,t);
                                const busy = !closed && isBookedBusy(endDate,t);

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