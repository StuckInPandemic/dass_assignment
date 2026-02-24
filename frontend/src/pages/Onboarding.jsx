import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { completeOnboarding, getClubs } from '../api';
import toast from 'react-hot-toast';

const INTEREST_OPTIONS = [
    'Technology', 'Programming', 'AI/ML', 'Web Development', 'Cybersecurity',
    'Robotics', 'Design', 'Music', 'Dance', 'Drama',
    'Photography', 'Literature', 'Sports', 'Gaming', 'Entrepreneurship',
    'Finance', 'Science', 'Art', 'Social Service', 'Quizzing',
];

const Onboarding = () => {
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [selectedClubs, setSelectedClubs] = useState([]);
    const [loading, setLoading] = useState(false);
    const { updateUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchClubs = async () => {
            try {
                const { data } = await getClubs();
                setClubs(data.organizers || []);
            } catch { /* no clubs yet is fine */ }
        };
        fetchClubs();
    }, []);

    const toggleInterest = (interest) => {
        setSelectedInterests(prev =>
            prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
        );
    };

    const toggleClub = (clubId) => {
        setSelectedClubs(prev =>
            prev.includes(clubId) ? prev.filter(id => id !== clubId) : [...prev, clubId]
        );
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await completeOnboarding({
                interests: selectedInterests,
                followedOrganizers: selectedClubs,
            });
            updateUser({ onboardingComplete: true, interests: selectedInterests });
            toast.success('Preferences saved!');
            navigate('/participant/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save preferences');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        setLoading(true);
        try {
            await completeOnboarding({ interests: [], followedOrganizers: [] });
            updateUser({ onboardingComplete: true });
            navigate('/participant/dashboard');
        } catch {
            navigate('/participant/dashboard');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card" style={{ maxWidth: 520 }}>
                <h1 className="auth-title">Set your preferences</h1>
                <p className="auth-subtitle">Help us personalize your experience (optional)</p>

                <div style={{ marginBottom: 24 }}>
                    <label className="form-label" style={{ marginBottom: 10 }}>Areas of Interest</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {INTEREST_OPTIONS.map(interest => (
                            <span
                                key={interest}
                                className={`tag ${selectedInterests.includes(interest) ? 'selected' : ''}`}
                                onClick={() => toggleInterest(interest)}
                            >
                                {interest}
                            </span>
                        ))}
                    </div>
                </div>

                {clubs.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                        <label className="form-label" style={{ marginBottom: 10 }}>Follow Clubs / Organizers</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {clubs.map(club => (
                                <label
                                    key={club._id}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                                        border: `1px solid ${selectedClubs.includes(club._id) ? 'var(--accent)' : 'var(--border)'}`,
                                        borderRadius: 6, cursor: 'pointer', fontSize: 14,
                                        background: selectedClubs.includes(club._id) ? 'var(--accent-light)' : 'transparent',
                                    }}
                                    onClick={() => toggleClub(club._id)}
                                >
                                    <input type="checkbox" checked={selectedClubs.includes(club._id)} readOnly style={{ accentColor: 'var(--accent)' }} />
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{club.organizerName}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{club.category}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex gap-8">
                    <button className="btn btn-ghost btn-block" onClick={handleSkip} disabled={loading}>Skip</button>
                    <button className="btn btn-primary btn-block" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Saving...' : 'Save preferences'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
