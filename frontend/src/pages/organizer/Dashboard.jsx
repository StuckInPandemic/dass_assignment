import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOrganizerDashboard } from '../../api';
import { FiCalendar, FiUsers, FiDollarSign, FiCheckCircle } from 'react-icons/fi';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const statusColors = { draft: 'badge-gray', published: 'badge-success', ongoing: 'badge-accent', completed: 'badge-warning', closed: 'badge-error' };

const OrgDashboard = () => {
    const [events, setEvents] = useState([]);
    const [analytics, setAnalytics] = useState({ totalRegistrations: 0, totalRevenue: 0, totalAttended: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data } = await getOrganizerDashboard();
                setEvents(data.events || []);
                setAnalytics(data.analytics || {});
            } catch (err) {
                toast.error('Failed to load dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Organizer Dashboard</h1>
            </div>

            {/* Analytics */}
            <div className="grid-3" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                    <div className="flex items-center gap-8 mb-8"><FiUsers className="text-accent" /></div>
                    <div className="stat-value">{analytics.totalRegistrations}</div>
                    <div className="stat-label">Total Registrations</div>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-8 mb-8"><FiDollarSign className="text-accent" /></div>
                    <div className="stat-value">₹{analytics.totalRevenue}</div>
                    <div className="stat-label">Total Revenue</div>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-8 mb-8"><FiCheckCircle className="text-accent" /></div>
                    <div className="stat-value">{analytics.totalAttended}</div>
                    <div className="stat-label">Total Attended</div>
                </div>
            </div>

            {/* Events */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">My Events</h3>
                    <Link to="/organizer/events/new" className="btn btn-primary btn-sm">+ Create Event</Link>
                </div>
                {events.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📭</div>
                        <div className="empty-state-text">No events created yet</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                        {events.map(ev => (
                            <Link to={`/organizer/events/${ev._id}`} key={ev._id} style={{ textDecoration: 'none', minWidth: 240, flexShrink: 0 }}>
                                <div className="card" style={{ cursor: 'pointer', height: '100%' }}>
                                    <div className="flex justify-between items-center mb-8">
                                        <span className="badge badge-gray">{ev.eventType}</span>
                                        <span className={`badge ${statusColors[ev.status] || 'badge-gray'}`}>{ev.status}</span>
                                    </div>
                                    <h4 style={{ fontWeight: 600, marginBottom: 6 }}>{ev.name}</h4>
                                    <div className="text-muted" style={{ fontSize: 12 }}>
                                        <div className="flex items-center gap-8">
                                            <FiCalendar size={11} /> {ev.eventStartDate ? dayjs(ev.eventStartDate).format('MMM D, YYYY') : 'TBA'}
                                        </div>
                                        <div className="mt-8">{ev.currentRegistrations} registrations</div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrgDashboard;
