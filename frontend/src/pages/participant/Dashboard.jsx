import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyRegistrations } from '../../api';
import { FiCalendar, FiTag, FiExternalLink } from 'react-icons/fi';
import { downloadICS } from '../../utils/calendar';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const Dashboard = () => {
    const { user } = useAuth();
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('upcoming');

    useEffect(() => {
        const fetchRegs = async () => {
            try {
                const { data } = await getMyRegistrations();
                setRegistrations(data.registrations || []);
            } catch {
                toast.error('Failed to load registrations');
            } finally {
                setLoading(false);
            }
        };
        fetchRegs();
    }, []);

    const now = new Date();
    const upcoming = registrations.filter(r =>
        r.status === 'confirmed' && r.event?.eventStartDate && new Date(r.event.eventStartDate) >= now
    );
    const history = registrations.filter(r =>
        r.status !== 'confirmed' || !r.event?.eventStartDate || new Date(r.event.eventStartDate) < now
    );

    const displayList = tab === 'upcoming' ? upcoming : history;

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Welcome, {user?.firstName || 'Participant'}</h1>
                <p className="page-subtitle">Your events at a glance</p>
            </div>

            {/* Stats */}
            <div className="grid-3" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                    <div className="stat-value">{registrations.length}</div>
                    <div className="stat-label">Total Registrations</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{upcoming.length}</div>
                    <div className="stat-label">Upcoming Events</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{registrations.filter(r => r.registrationType === 'merchandise').length}</div>
                    <div className="stat-label">Merch Purchases</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="card">
                <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
                    <div className="flex gap-16">
                        <button
                            className={`btn btn-ghost ${tab === 'upcoming' ? 'text-accent' : ''}`}
                            onClick={() => setTab('upcoming')}
                            style={{ fontWeight: tab === 'upcoming' ? 600 : 400, borderBottom: tab === 'upcoming' ? '2px solid var(--accent)' : 'none', borderRadius: 0, paddingBottom: 12 }}
                        >
                            Upcoming ({upcoming.length})
                        </button>
                        <button
                            className={`btn btn-ghost ${tab === 'history' ? 'text-accent' : ''}`}
                            onClick={() => setTab('history')}
                            style={{ fontWeight: tab === 'history' ? 600 : 400, borderBottom: tab === 'history' ? '2px solid var(--accent)' : 'none', borderRadius: 0, paddingBottom: 12 }}
                        >
                            History ({history.length})
                        </button>
                    </div>
                    <Link to="/participant/events" className="btn btn-ghost btn-sm">Browse events</Link>
                </div>

                {displayList.length === 0 ? (
                    <div className="empty-state" style={{ padding: '32px 16px' }}>
                        <div className="empty-state-icon">{tab === 'upcoming' ? '📅' : '📋'}</div>
                        <div className="empty-state-text">
                            {tab === 'upcoming' ? 'No upcoming events' : 'No past registrations'}
                        </div>
                        {tab === 'upcoming' && (
                            <p className="text-muted mt-8" style={{ fontSize: 13 }}>
                                <Link to="/participant/events" className="text-accent">Browse events</Link> to register
                            </p>
                        )}
                    </div>
                ) : (
                    <div>
                        {displayList.map(reg => (
                            <Link key={reg._id} to={`/participant/ticket/${reg._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div className="flex justify-between items-center" style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                                    <div>
                                        <div className="flex items-center gap-8">
                                            <span style={{ fontWeight: 600, fontSize: 15 }}>{reg.event?.name || 'Event'}</span>
                                            <span className="badge badge-gray" style={{ fontSize: 11 }}>{reg.registrationType}</span>
                                        </div>
                                        <div className="flex items-center gap-12 mt-8" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                            <span className="flex items-center gap-8"><FiCalendar style={{ width: 12 }} /> {reg.event?.eventStartDate ? dayjs(reg.event.eventStartDate).format('MMM D, YYYY') : 'TBA'}</span>
                                            <span>{reg.event?.organizer?.organizerName || ''}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <span className={`badge ${reg.status === 'confirmed' ? 'badge-success' : reg.status === 'pending_approval' ? 'badge-warning' : reg.status === 'cancelled' ? 'badge-error' : 'badge-gray'}`}>
                                            {reg.status === 'pending_approval' ? 'Pending' : reg.status}
                                        </span>
                                        <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{reg.ticketId}</span>
                                        {reg.status === 'confirmed' && reg.event?.eventStartDate && (
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                title="Add to Calendar"
                                                onClick={(e) => { e.preventDefault(); downloadICS(reg.event); }}
                                                style={{ padding: '2px 6px', fontSize: 12 }}
                                            >
                                                📅
                                            </button>
                                        )}
                                        <FiExternalLink style={{ width: 14, color: 'var(--text-muted)' }} />
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

export default Dashboard;
