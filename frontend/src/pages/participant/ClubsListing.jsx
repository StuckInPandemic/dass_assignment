import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getClubs, followOrganizer, unfollowOrganizer } from '../../api';
import toast from 'react-hot-toast';

const ClubsListing = () => {
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClubs();
    }, []);

    const fetchClubs = async () => {
        try {
            const { data } = await getClubs();
            setClubs(data.organizers || []);
        } catch (err) {
            toast.error('Failed to load clubs');
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async (clubId, isFollowed) => {
        try {
            if (isFollowed) {
                await unfollowOrganizer(clubId);
            } else {
                await followOrganizer(clubId);
            }
            setClubs(prev => prev.map(c => c._id === clubId ? { ...c, isFollowed: !isFollowed, followerCount: c.followerCount + (isFollowed ? -1 : 1) } : c));
            toast.success(isFollowed ? 'Unfollowed' : 'Following!');
        } catch (err) {
            toast.error('Action failed');
        }
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Clubs & Organizers</h1>
                <p className="page-subtitle">Discover clubs and follow the ones you like</p>
            </div>

            {clubs.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🏢</div>
                    <div className="empty-state-text">No clubs available yet</div>
                </div>
            ) : (
                <div className="grid-3">
                    {clubs.map(club => (
                        <div key={club._id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div className="flex justify-between items-center mb-8">
                                <span className="badge badge-accent">{club.category}</span>
                                <span className="text-muted" style={{ fontSize: 12 }}>{club.followerCount} followers</span>
                            </div>
                            <Link to={`/participant/clubs/${club._id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{club.organizerName}</h3>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                                    {club.description || 'No description'}
                                </p>
                            </Link>
                            <button
                                className={`btn btn-sm ${club.isFollowed ? 'btn-outline' : 'btn-primary'}`}
                                onClick={() => handleFollow(club._id, club.isFollowed)}
                                style={{ alignSelf: 'flex-start' }}
                            >
                                {club.isFollowed ? 'Unfollow' : 'Follow'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ClubsListing;
