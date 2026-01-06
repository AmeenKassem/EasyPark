import { useMemo, useState,useEffect } from 'react'
import { createBooking } from '../../services/booking'

function toInputDateTime(dt) {
    if (!dt) return ''
    // "2026-01-05T10:00:00" -> "2026-01-05T10:00"
    return String(dt).slice(0, 16)
}
function formatLocal(dt) {
    if (!dt) return ''
    // show "2026-01-06 14:00"
    return toInputDateTime(dt).replace('T', ' ')
}

function prettyInterval(it) {
    return `${formatLocal(it.startTime)} → ${formatLocal(it.endTime)}`
}

function overlapsAny(startStr, endStr, busyIntervals) {
        if (!startStr || !endStr) return false
            const s = new Date(startStr)
            const e = new Date(endStr)
            return (busyIntervals || []).some((it) => {
                    const a = new Date(it.startTime)
                        const b = new Date(it.endTime)
                        // overlap if a < e && b > s
                        return a < e && b > s
                    })
        }
function pad2(n) {
    return String(n).padStart(2, '0')
}

function dateToLocalInputValue(d) {
    const yyyy = d.getFullYear()
    const mm = pad2(d.getMonth() + 1)
    const dd = pad2(d.getDate())
    const hh = pad2(d.getHours())
    const mi = pad2(d.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

function displaySlot(s) {
    return `${(s.start || '').replace('T', ' ')} → ${(s.end || '').replace('T', ' ')}`
}

/**
 * Returns free slots inside [availableFrom, availableTo], after subtracting busyIntervals.
 * Output is an array of { start: "YYYY-MM-DDTHH:mm", end: "YYYY-MM-DDTHH:mm" }.
 */
function computeFreeSlots(spot, busyIntervals) {
    const fromStr = spot?.availableFrom ? toInputDateTime(spot.availableFrom) : null
    const toStr = spot?.availableTo ? toInputDateTime(spot.availableTo) : null
    if (!fromStr || !toStr) return []

    const windowStart = new Date(fromStr)
    const windowEnd = new Date(toStr)
    if (!(windowStart < windowEnd)) return []

    // Clip + normalize busy intervals to the owner window
    const busy = (busyIntervals || [])
        .map((it) => ({
            start: new Date(toInputDateTime(it.startTime)),
            end: new Date(toInputDateTime(it.endTime)),
        }))
        .filter((it) => it.start < windowEnd && it.end > windowStart)
        .map((it) => ({
            start: new Date(Math.max(it.start.getTime(), windowStart.getTime())),
            end: new Date(Math.min(it.end.getTime(), windowEnd.getTime())),
        }))
        .filter((it) => it.start < it.end)
        .sort((a, b) => a.start - b.start)

    // Merge overlaps/adjacent
    const merged = []
    for (const it of busy) {
        const last = merged[merged.length - 1]
        if (!last) {
            merged.push(it)
            continue
        }
        if (it.start.getTime() <= last.end.getTime()) {
            last.end = new Date(Math.max(last.end.getTime(), it.end.getTime()))
        } else {
            merged.push(it)
        }
    }

    // Subtract merged busy from window
    const free = []
    let cur = windowStart

    for (const b of merged) {
        if (cur < b.start) {
            free.push({ start: new Date(cur), end: new Date(b.start) })
        }
        if (b.end > cur) cur = b.end
    }
    if (cur < windowEnd) {
        free.push({ start: new Date(cur), end: new Date(windowEnd) })
    }

    return free
        .filter((s) => s.start < s.end)
        .map((s) => ({
            start: dateToLocalInputValue(s.start),
            end: dateToLocalInputValue(s.end),
        }))
}

function isInsideAnyFreeSlot(startStr, endStr, freeSlots) {
    if (!startStr || !endStr) return false
    const s = new Date(startStr)
    const e = new Date(endStr)
    if (!(s < e)) return false

    return (freeSlots || []).some((slot) => {
        const a = new Date(slot.start)
        const b = new Date(slot.end)
        // Fully contained within a single slot
        return s >= a && e <= b
    })
}

function validateRange(spot, startStr, endStr, busyIntervals, freeSlots) {

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
// Enforce that selection is fully inside an available slot
    if (spot?.availableFrom && spot?.availableTo) {
        if (!isInsideAnyFreeSlot(startStr, endStr, freeSlots)) {
            return 'Selected time is not available. Please choose a range inside an available slot.'
        }
    }

    return null;
}


export default function BookParkingModal({ isOpen, onClose, spot, onBooked }) {
    const [saving, setSaving] = useState(false)
    const [feedback, setFeedback] = useState({ message: '', isError: false })
    const [busyIntervals,setBusyIntervals] = useState([])
    const [busyLoading,setBusyLoading] = useState(false)
    const minStart = toInputDateTime(spot?.availableFrom)
    const maxEnd = toInputDateTime(spot?.availableTo)
    const freeSlots = useMemo(() => {
        return computeFreeSlots(spot, busyIntervals)
    }, [spot?.availableFrom, spot?.availableTo, busyIntervals])



    const [form, setForm] = useState({
        startTime: '',
        endTime: '',
    })

    const validationMessage = useMemo(() => {
        return validateRange(spot, form.startTime, form.endTime, busyIntervals, freeSlots)

    }, [spot, form.startTime, form.endTime, busyIntervals,freeSlots])
    // Fetch busy intervals (approved/pending bookings) for this spot.
    // This lets the UI block overlapping selections.
    useEffect(() => {
        if (!isOpen || !spot?.id) {
            setBusyIntervals([])
            setBusyLoading(false)
            return
        }

        let cancelled = false
        const controller = new AbortController()

        const fetchBusy = async () => {
            setBusyLoading(true)
            try {
                // Use the spot availability window if available; it reduces payload and is what the user sees.
                const from = spot?.availableFrom ? toInputDateTime(spot.availableFrom) : undefined
                const to = spot?.availableTo ? toInputDateTime(spot.availableTo) : undefined

                const params = new URLSearchParams()
                if (from) params.set('from', from)
                if (to) params.set('to', to)

                const token = localStorage.getItem('easypark_token')
                const res = await fetch(
                    `http://localhost:8080/api/parking-spots/${spot.id}/busy?${params.toString()}`,
                    {
                        method: 'GET',
                        headers: {
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        signal: controller.signal,
                    },
                )

                if (!res.ok) {
                    // Keep modal usable even if busy fetch fails
                    const txt = await res.text().catch(() => '')
                    throw new Error(txt || `Failed to fetch busy intervals (HTTP ${res.status})`)
                }

                const data = await res.json()
                if (!cancelled) setBusyIntervals(Array.isArray(data) ? data : [])
            } catch (err) {
                if (!cancelled) {
                    // Do not hard-fail booking UI; just clear intervals
                    setBusyIntervals([])
                    // Optional: uncomment if you want to show a warning
                    // setFeedback({ message: 'Could not load booked times. Try again.', isError: true })
                }
            } finally {
                if (!cancelled) setBusyLoading(false)
            }
        }

        fetchBusy()
        return () => {
            cancelled = true
            controller.abort()
        }
    }, [isOpen, spot?.id, spot?.availableFrom, spot?.availableTo])

    const canSubmit = useMemo(() => {
        if (!spot?.id) return false
        return !validationMessage
    }, [spot?.id, validationMessage])


    if (!isOpen) return null

    const onChange = (e) => {
        const { name, value } = e.target;
        setFeedback((f) => (f.message ? { message: '', isError: false } : f))

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
            // if (next.startTime && next.endTime && overlapsAny(next.startTime, next.endTime, busyIntervals)) {
            //     setFeedback({ message: 'Selected time overlaps an existing booking. Please choose another time.', isError: true })
            // }


            return next;
        });
    };


    const handleSubmit = async () => {
        setFeedback({ message: '', isError: false })

        const err = validateRange(spot, form.startTime, form.endTime, busyIntervals, freeSlots);

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
                            Available slots:
                            <div style={{ marginTop: 6, display: 'grid', gap: 6 }}>
                                {freeSlots.length === 0 ? (
                                    <div style={{ fontWeight: 800, color: '#991b1b' }}>
                                        No available slots in this window.
                                    </div>
                                ) : (
                                    freeSlots.map((s, idx) => (
                                        <div
                                            key={`${s.start}-${s.end}-${idx}`}
                                            style={{
                                                padding: '8px 10px',
                                                borderRadius: 12,
                                                background: 'rgba(37,99,235,0.08)',
                                                border: '1px solid rgba(37,99,235,0.18)',
                                                color: '#1e3a8a',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                            }}
                                            title="Click to set start time"
                                            onClick={() => setForm({ startTime: s.start, endTime: '' })}
                                        >
                                            {displaySlot(s)}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {busyLoading && (
                        <div style={{ marginTop: 6, fontWeight: 700, color: '#64748b' }}>
                            Loading booked times...
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

                    {feedback.message && !validationMessage && (
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
                    {validationMessage && (
                        <div
                            style={{
                                padding: 10,
                                borderRadius: 12,
                                background: '#fee2e2',
                                color: '#991b1b',
                                fontWeight: 800,
                            }}
                        >
                            {validationMessage}
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
