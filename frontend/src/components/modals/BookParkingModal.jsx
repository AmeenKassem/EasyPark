import { useMemo, useState } from 'react'
import { createBooking } from '../../services/booking'

function toInputDateTime(dt) {
    if (!dt) return ''
    // "2026-01-05T10:00:00" -> "2026-01-05T10:00"
    return String(dt).slice(0, 16)
}
function validateRange(spot, startStr, endStr) {
    if (!spot?.id) return 'Missing parking spot.';
    if (!startStr || !endStr) return 'Start and End are required.';
    if (startStr >= endStr) return 'Start time must be before end time.';

    // Compare as Date to avoid edge cases
    const start = new Date(startStr);
    const end = new Date(endStr);

    if (spot?.availableFrom) {
        const from = new Date(spot.availableFrom);
        if (start < from) return 'Start time is before the parking availability window.';
    }
    if (spot?.availableTo) {
        const to = new Date(spot.availableTo);
        if (end > to) return 'End time is after the parking availability window.';
    }
    return null;
}


export default function BookParkingModal({ isOpen, onClose, spot, onBooked }) {
    const [saving, setSaving] = useState(false)
    const [feedback, setFeedback] = useState({ message: '', isError: false })
    const minStart = toInputDateTime(spot?.availableFrom)
    const maxEnd = toInputDateTime(spot?.availableTo)

    const [form, setForm] = useState({
        startTime: '',
        endTime: '',
    })

    const canSubmit = useMemo(() => {
        if (!spot?.id) return false;
        const err = validateRange(spot, form.startTime, form.endTime);
        return !err;
    }, [spot?.id, spot?.availableFrom, spot?.availableTo, form.startTime, form.endTime]);


    if (!isOpen) return null

    const onChange = (e) => {
        const { name, value } = e.target;

        setForm((p) => {
            const next = { ...p, [name]: value };

            // Auto-fix end if start moves after end
            if (name === 'startTime' && next.endTime && value && value >= next.endTime) {
                next.endTime = '';
            }

            // Clamp to availability window if user typed something invalid
            if (spot?.availableFrom) {
                const min = toInputDateTime(spot.availableFrom);
                if (next.startTime && next.startTime < min) next.startTime = min;
                if (next.endTime && next.endTime < min) next.endTime = min;
            }
            if (spot?.availableTo) {
                const max = toInputDateTime(spot.availableTo);
                if (next.startTime && next.startTime > max) next.startTime = max;
                if (next.endTime && next.endTime > max) next.endTime = max;
            }

            return next;
        });
    };


    const handleSubmit = async () => {
        setFeedback({ message: '', isError: false })

        const err = validateRange(spot, form.startTime, form.endTime);
        if (err) {
            setFeedback({ message: err, isError: true });
            return;
        }


        setSaving(true)
        try {
            const booking = await createBooking({
                parkingId: spot.id,
                startTime: form.startTime,
                endTime: form.endTime,
            })

            onBooked?.(booking)
            setForm({ startTime: '', endTime: '' })
            onClose?.()
        } catch (e) {
        const data = e?.response?.data;
        const msg =
            data?.message ||
            data?.error ||
            (typeof data === 'string' ? data : '') ||
            e?.message ||
            'Failed to create booking.';
        setFeedback({ message: String(msg), isError: true });
    } finally {
            setSaving(false)
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, pointerEvents: 'auto' }}>
            <button
                type="button"
                onClick={onClose}
                style={{ position: 'absolute', inset: 0, border: 0, background: 'rgba(15,23,42,0.45)' }}
            />
            <div
                style={{
                    position: 'absolute',
                    left: 12,
                    right: 12,
                    bottom: 12,
                    background: 'rgba(255,255,255,0.98)',
                    borderRadius: 18,
                    padding: 16,
                    boxShadow: '0 -18px 40px rgba(15, 23, 42, 0.20)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Request Booking</div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ border: 0, background: 'transparent', fontWeight: 900, cursor: 'pointer', color: '#2563eb' }}
                    >
                        Close
                    </button>
                </div>

                <div style={{ marginTop: 8, fontWeight: 800, color: '#0f172a' }}>
                    {spot?.location ? `Parking at ${spot.location}` : `Spot #${spot?.id}`}
                </div>

                <div style={{ marginTop: 4, fontWeight: 700, color: '#64748b' }}>
                    {spot?.pricePerHour != null ? `₪${spot.pricePerHour}/hr` : ''}
                </div>

                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                    {(spot?.availableFrom || spot?.availableTo) && (
                        <div style={{ marginTop: 10, fontWeight: 800, color: '#0f172a' }}>
                            Available:
                            <div style={{ fontWeight: 700, color: '#334155', marginTop: 4 }}>
                                {spot?.availableFrom ? toInputDateTime(spot.availableFrom).replace('T', ' ') : 'Any start'}{' '}
                                →{' '}
                                {spot?.availableTo ? toInputDateTime(spot.availableTo).replace('T', ' ') : 'Any end'}
                            </div>
                        </div>
                    )}

                    <div>
                        <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Start</div>
                        <input
                            type="datetime-local"
                            name="startTime"
                            value={form.startTime}
                            onChange={onChange}
                            min={minStart || undefined}
                            max={maxEnd || undefined}
                            style={{
                                width: '100%',
                                padding: 10,
                                borderRadius: 12,
                                border: '1px solid rgba(15,23,42,0.14)',
                                outline: 'none',
                            }}
                        />
                    </div>

                    <div>
                        <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>End</div>
                        <input
                            type="datetime-local"
                            name="endTime"
                            value={form.endTime}
                            onChange={onChange}
                            min={(form.startTime || minStart) || undefined}
                            max={maxEnd || undefined}
                            style={{
                                width: '100%',
                                padding: 10,
                                borderRadius: 12,
                                border: '1px solid rgba(15,23,42,0.14)',
                                outline: 'none',
                            }}
                        />
                    </div>

                    {feedback.message && (
                        <div
                            style={{
                                padding: 10,
                                borderRadius: 12,
                                background: feedback.isError ? '#fee2e2' : '#dcfce7',
                                color: feedback.isError ? '#991b1b' : '#166534',
                                fontWeight: 800,
                            }}
                        >
                            {feedback.message}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit || saving}
                        style={{
                            width: '100%',
                            height: 44,
                            borderRadius: 12,
                            border: 0,
                            background: '#0f172a',
                            color: 'white',
                            fontWeight: 900,
                            cursor: canSubmit && !saving ? 'pointer' : 'not-allowed',
                            opacity: canSubmit && !saving ? 1 : 0.7,
                        }}
                    >
                        {saving ? 'Requesting...' : 'Request Booking'}
                    </button>
                </div>
            </div>
        </div>
    )
}
