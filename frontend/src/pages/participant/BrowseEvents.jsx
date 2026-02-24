import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEvents, getTrendingEvents } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { FiCalendar, FiUsers, FiTag, FiTrendingUp, FiSearch, FiFilter, FiX } from 'react-icons/fi';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const BrowseEvents = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ eventType: '', eligibility: '', startDate: '', endDate: '', followed: false });
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [showFilters, setShowFilters] = useState(false);

    const fetchEvents = async (p = 1) => {
        try {
            const params = { page: p, limit: 12 };
            if (search) params.search = search;
            if (filters.eventType) params.eventType = filters.eventType;
            if (filters.eligibility) params.eligibility = filters.eligibility;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.followed) params.followed = 'true';
            const { data } = await getEvents(params);
            setEvents(data.events);
            setPagination(data.pagination);
        } catch (err) {
            toast.error('Failed to load events');
        } finally {
            setLoading(false);
        }
    };

    const fetchTrending = async () => {
        try {
            const { data } = await getTrendingEvents();
            setTrending(data.events || []);
        } catch { /* ok */ }
    };

    useEffect(() => {
        fetchEvents(page);
    }, [page]);

    useEffect(() => { fetchTrending(); }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchEvents(1);
    };

    const clearFilters = () => {
        setFilters({ eventType: '', eligibility: '', startDate: '', endDate: '', followed: false });
        setSearch('');
        setPage(1);
        setTimeout(() => fetchEvents(1), 0);
    };

    const applyFilters = () => {
        setPage(1);
        fetchEvents(1);
        setShowFilters(false);
    };

    const getStatusBadge = (event) => {
        if (event.registrationLimit > 0 && event.currentRegistrations >= event.registrationLimit) return <span className="badge badge-error">Full</span>;
        if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) return <span className="badge badge-gray">Closed</span>;
        if (event.registrationFee === 0) return <span className="badge badge-success">Free</span>;
        return <span className="badge badge-accent">₹{event.registrationFee}</span>;
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Browse Events</h1>
                <p className="page-subtitle">Discover and register for events</p>
            </div>

            {/* Trending */}
            {trending.length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                        <h3 className="card-title"><FiTrendingUp style={{ verticalAlign: 'middle', marginRight: 6 }} /> Trending Now</h3>
                    </div>
                    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                        {trending.map(ev => (
                            <Link to={`/participant/events/${ev._id}`} key={ev._id} style={{ textDecoration: 'none', minWidth: 200 }}>
                                <div className="card" style={{ padding: 14, cursor: 'pointer' }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{ev.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ev.organizer?.organizerName}</div>
                                    <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>{ev.trendingCount} registrations in 24h</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Search + Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', gap: 8 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <FiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search events or organizers..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary">Search</button>
                </form>
                <button className="btn btn-outline" onClick={() => setShowFilters(!showFilters)}>
                    <FiFilter /> Filters
                </button>
            </div>

            {/* Filter panel */}
            {showFilters && (
                <div className="card" style={{ marginBottom: 16 }}>
                    <div className="form-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        <div className="form-group">
                            <label className="form-label">Event Type</label>
                            <select className="form-select" value={filters.eventType} onChange={e => setFilters({ ...filters, eventType: e.target.value })}>
                                <option value="">All Types</option>
                                <option value="normal">Normal</option>
                                <option value="merchandise">Merchandise</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Eligibility</label>
                            <select className="form-select" value={filters.eligibility} onChange={e => setFilters({ ...filters, eligibility: e.target.value })}>
                                <option value="">All</option>
                                <option value="all">Everyone</option>
                                <option value="iiit-only">IIIT Only</option>
                                <option value="non-iiit-only">Non-IIIT Only</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">From Date</label>
                            <input type="date" className="form-input" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">To Date</label>
                            <input type="date" className="form-input" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex gap-8 items-center">
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                            <input type="checkbox" checked={filters.followed} onChange={e => setFilters({ ...filters, followed: e.target.checked })} style={{ accentColor: 'var(--accent)' }} />
                            Followed Clubs Only
                        </label>
                        <div style={{ flex: 1 }} />
                        <button className="btn btn-ghost btn-sm" onClick={clearFilters}><FiX /> Clear</button>
                        <button className="btn btn-primary btn-sm" onClick={applyFilters}>Apply</button>
                    </div>
                </div>
            )}

            {/* Events Grid */}
            {loading ? (
                <div className="loading-screen"><div className="spinner" /></div>
            ) : events.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <div className="empty-state-text">No events found</div>
                </div>
            ) : (
                <>
                    <div className="grid-3">
                        {events.map(event => (
                            <Link to={`/participant/events/${event._id}`} key={event._id} style={{ textDecoration: 'none' }}>
                                <div className="card" style={{ cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <div className="flex justify-between items-center mb-8">
                                        <span className="badge badge-gray">{event.eventType}</span>
                                        {getStatusBadge(event)}
                                    </div>
                                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{event.name}</h3>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                        {event.description || 'No description'}
                                    </p>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                        <div className="flex items-center gap-8 mb-8">
                                            <FiUsers size={12} /> {event.organizer?.organizerName || 'Unknown'}
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <FiCalendar size={12} /> {event.eventStartDate ? dayjs(event.eventStartDate).format('MMM D, YYYY') : 'TBA'}
                                        </div>
                                    </div>
                                    {event.tags?.length > 0 && (
                                        <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
                                            {event.tags.slice(0, 3).map(tag => (
                                                <span key={tag} style={{ fontSize: 11, padding: '2px 6px', background: 'var(--bg-primary)', borderRadius: 4, color: 'var(--text-muted)' }}>{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="flex justify-between items-center mt-24">
                            <span className="text-muted" style={{ fontSize: 13 }}>Page {pagination.page} of {pagination.pages}</span>
                            <div className="flex gap-8">
                                <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                                <button className="btn btn-outline btn-sm" disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>Next</button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default BrowseEvents;
