import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/layout';
import { getOwnerDashboard, getDriverReport } from '../services/report';
import { getCurrentUser } from '../services/session';

export default function StatsPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            const user = getCurrentUser();
            const roles = user?.roles || [];

            try {
                if (roles.includes('OWNER')) {
                    setUserRole('OWNER');
                    const data = await getOwnerDashboard();
                    setStats(data);
                } else if (roles.includes('DRIVER')) {
                    setUserRole('DRIVER');
                    const data = await getDriverReport();
                    setStats(data);
                }
            } catch (error) {
                console.error("Failed to load stats", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const fmtDate = (dt) => dt ? dt.replace('T', ' ').slice(0, 16) : '';

    if (loading) return <Layout><div style={{padding: 20}}>Loading statistics...</div></Layout>;
    if (!stats) return <Layout><div style={{padding: 20}}>No data available.</div></Layout>;

    const isOwner = userRole === 'OWNER';
    const title = isOwner ? 'Statistics' : 'Driver Report';
    const moneyLabel = isOwner ? 'Total Revenue' : 'Total Expenses';
    const moneyColor = isOwner ? '#166534' : '#991b1b';
    const moneyBg = isOwner ? '#dcfce7' : '#fee2e2';

    const totalMoney = isOwner ? stats.totalRevenue : stats.totalExpenses;
    const countLabel = isOwner ? 'Total Reservations' : 'Total Bookings';
    const totalCount = isOwner ? stats.totalReservations : stats.totalBookings;
    const list = isOwner ? stats.recentActivity : stats.bookingHistory;

    return (
        <Layout title={title}>
            <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 30 }}>
                    <div style={{
                        background: moneyBg,
                        padding: 20,
                        borderRadius: 12,
                        textAlign: 'center',
                        color: moneyColor
                    }}>
                        <h3 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase' }}>{moneyLabel}</h3>
                        <div style={{ fontSize: 32, fontWeight: 900 }}>₪{totalMoney?.toFixed(2)}</div>
                    </div>

                    <div style={{
                        background: '#e0f2fe',
                        padding: 20,
                        borderRadius: 12,
                        textAlign: 'center',
                        color: '#075985'
                    }}>
                        <h3 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase' }}>{countLabel}</h3>
                        <div style={{ fontSize: 32, fontWeight: 900 }}>{totalCount}</div>
                    </div>
                </div>

                <h3>Recent Activity</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                    {list && list.length > 0 ? list.map((item) => (
                        <div key={item.id} style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: 10,
                            padding: 15,
                            background: 'white',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ fontWeight: 'bold' }}>Parking ID: {item.parkingId}</div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>
                                    {fmtDate(item.startTime)} - {fmtDate(item.endTime)}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 900, color: isOwner ? '#166534' : '#1e293b' }}>
                                    {isOwner ? '+' : '-'}₪{item.totalPrice}
                                </div>
                                <span style={{
                                    fontSize: 10,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    background: '#f1f5f9'
                                }}>
                                    {item.status}
                                </span>
                            </div>
                        </div>
                    )) : <p>No activity found.</p>}
                </div>
            </div>
        </Layout>
    );
}