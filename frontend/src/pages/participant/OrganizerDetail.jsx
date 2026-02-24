import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getClubDetail, followOrganizer, unfollowOrganizer } from '../../api';
import { FiArrowLeft, FiCalendar, FiMail } from 'react-icons/fi';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const OrganizerDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [organizer, setOrganizer] = useState(null);
    const [upcoming, setUpcoming] = useState([]);
    const [past, setPast] = useState([]);
    const [tab, setTab] = useState('upcoming');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data } = await getClubDetail(id);
                setOrganizer(data.organizer);
                setUpcoming(data.upcoming || []);
                setPast(data.past || []);
            } catch {
                toast.error('Organizer not found');
                navigate('/participant/clubs');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [id]);

    const handleFollow = async () => {
        try {
            if (organizer.isFollowed) {
                await unfollowOrganizer(organizer._id);
            } else {
                await followOrganizer(organizer._id);
            }
            setOrganizer(prev => ({ ...prev, isFollowed: !prev.isFollowed, followerCount: prev.followerCount + (prev.isFollowed ? -1 : 1) }));
        } catch { toast.error('Action failed'); }
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
    if (!organizer) return null;

    const events = tab === 'upcoming' ? upcoming : past;

    return (
        <div className="page-container" style={{ maxWidth: 800 }}>
            <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
                <FiArrowLeft /> Back
            </button>

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="flex justify-between items-center mb-16">
                    <div>
                        <span className="badge badge-accent mb-8">{organizer.category}</span>
                        <h1 style={{ fontSize: 22, fontWeight: 700 }}>{organizer.organizerName}</h1>
                    </div>
                    <button className={`btn ${organizer.isFollowed ? 'btn-outline' : 'btn-primary'}`} onClick={handleFollow}>
                        {organizer.isFollowed ? 'Unfollow' : 'Follow'}
                    </button>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>{organizer.description || 'No description'}</p>
                {organizer.contactEmail && (
                    <div className="flex items-center gap-8 text-muted" style={{ fontSize: 13 }}>
                        <FiMail size={14} /> {organizer.contactEmail}
                    </div>
                )}
                <div className="text-muted mt-8" style={{ fontSize: 13 }}>{organizer.followerCount} followers</div>
            </div>

            <div className="tabs">
                <button className={`tab ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>Upcoming ({upcoming.length})</button>
                <button className={`tab ${tab === 'past' ? 'active' : ''}`} onClick={() => setTab('past')}>Past ({past.length})</button>
            </div>

            {events.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <div className="empty-state-text">No {tab} events</div>
                </div>
            ) : (
                <div className="grid-2">
                    {events.map(ev => (
                        <Link to={`/participant/events/${ev._id}`} key={ev._id} style={{ textDecoration: 'none' }}>
                            <div className="card" style={{ cursor: 'pointer' }}>
                                <div className="flex justify-between items-center mb-8">
                                    <span className="badge badge-gray">{ev.eventType}</span>
                                    <span className="badge badge-accent">{ev.status}</span>
                                </div>
                                <h4 style={{ fontWeight: 600, marginBottom: 4 }}>{ev.name}</h4>
                                <div className="flex items-center gap-8 text-muted" style={{ fontSize: 12 }}>
                                    <FiCalendar size={11} /> {ev.eventStartDate ? dayjs(ev.eventStartDate).format('MMM D, YYYY') : 'TBA'}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OrganizerDetail;
