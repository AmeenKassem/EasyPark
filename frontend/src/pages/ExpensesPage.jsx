import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/layout';
import { getDriverReport } from '../services/report';

export default function ExpensesPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await getDriverReport();
                setStats(data);
            } catch (error) {
                console.error("Failed to load driver expenses", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const fmtDate = (dt) => dt ? dt.replace('T', ' ').slice(0, 16) : '';

    if (loading) return <Layout><div style={{padding: 20}}>Loading statistics...</div></Layout>;
    if (!stats) return <Layout><div style={{padding: 20}}>No data available.</div></Layout>;

    const list = stats.bookingHistory;

    return (
        <Layout title="My Expenses">
            <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 30 }}>
                    <div style={{ background: '#fee2e2', padding: 20, borderRadius: 12, textAlign: 'center', color: '#991b1b' }}>
                        <h3 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase' }}>Total Expenses</h3>
                        <div style={{ fontSize: 32, fontWeight: 900 }}>₪{stats.totalExpenses?.toFixed(2) || 0}</div>
                    </div>

                    <div style={{ background: '#e0f2fe', padding: 20, borderRadius: 12, textAlign: 'center', color: '#075985' }}>
                        <h3 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase' }}>Total Bookings</h3>
                        <div style={{ fontSize: 32, fontWeight: 900 }}>{stats.totalBookings || 0}</div>
                    </div>
                </div>

                <h3>Booking History</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                    {list && list.length > 0 ? list.map((item) => (
                        <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 15, background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 'bold' }}>Parking ID: {item.parkingId}</div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>
                                    {fmtDate(item.startTime)} - {fmtDate(item.endTime)}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 900, color: '#1e293b' }}>
                                    -₪{item.totalPrice}
                                </div>
                                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#f1f5f9' }}>
                                    {item.status}
                                </span>
                            </div>
                        </div>
                    )) : <p>No booking history found.</p>}
                </div>
            </div>
        </Layout>
    );
}