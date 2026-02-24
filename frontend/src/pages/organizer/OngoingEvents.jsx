import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOrganizerEvents } from '../../api';
import { FiCalendar } from 'react-icons/fi';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const OngoingEvents = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data } = await getOrganizerEvents();
                setEvents((data.events || []).filter(e => e.status === 'ongoing'));
            } catch {
                toast.error('Failed to load');
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
                <h1 className="page-title">Ongoing Events</h1>
            </div>

            {events.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🎬</div>
                    <div className="empty-state-text">No ongoing events</div>
                </div>
            ) : (
                <div className="grid-3">
                    {events.map(ev => (
                        <Link to={`/organizer/events/${ev._id}`} key={ev._id} style={{ textDecoration: 'none' }}>
                            <div className="card" style={{ cursor: 'pointer' }}>
                                <span className="badge badge-accent mb-8">ongoing</span>
                                <h4 style={{ fontWeight: 600, marginBottom: 6 }}>{ev.name}</h4>
                                <div className="text-muted" style={{ fontSize: 12 }}>
                                    <div className="flex items-center gap-8"><FiCalendar size={11} /> {dayjs(ev.eventStartDate).format('MMM D, YYYY')}</div>
                                    <div className="mt-8">{ev.currentRegistrations} registrations</div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OngoingEvents;
