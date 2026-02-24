import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateParticipantProfile, changePassword } from '../../api';
import toast from 'react-hot-toast';

const INTEREST_OPTIONS = [
    'Technology', 'Programming', 'AI/ML', 'Web Development', 'Cybersecurity',
    'Robotics', 'Design', 'Music', 'Dance', 'Drama',
    'Photography', 'Literature', 'Sports', 'Gaming', 'Entrepreneurship',
    'Finance', 'Science', 'Art', 'Social Service', 'Quizzing',
];

const Profile = () => {
    const { user, updateUser } = useAuth();
    const [form, setForm] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        contactNumber: user?.contactNumber || '',
        college: user?.college || '',
        interests: user?.interests || [],
    });
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [loading, setLoading] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const toggleInterest = (interest) => {
        setForm(prev => ({
            ...prev,
            interests: prev.interests.includes(interest)
                ? prev.interests.filter(i => i !== interest)
                : [...prev.interests, interest],
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await updateParticipantProfile(form);
            updateUser(data.user);
            toast.success('Profile updated');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match');
        setPwLoading(true);
        try {
            await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
            toast.success('Password changed');
            setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Password change failed');
        } finally {
            setPwLoading(false);
        }
    };

    return (
        <div className="page-container" style={{ maxWidth: 600 }}>
            <div className="page-header">
                <h1 className="page-title">Profile</h1>
            </div>

            <form onSubmit={handleSave}>
                <div className="card" style={{ marginBottom: 16 }}>
                    <h3 className="card-title" style={{ marginBottom: 16 }}>Personal Information</h3>

                    <div className="form-group">
                        <label className="form-label">Email <span className="text-muted">(cannot change)</span></label>
                        <input className="form-input" value={user?.email || ''} disabled style={{ background: 'var(--bg-primary)' }} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Participant Type <span className="text-muted">(cannot change)</span></label>
                        <input className="form-input" value={user?.participantType === 'iiit' ? 'IIIT Student' : 'Non-IIIT'} disabled style={{ background: 'var(--bg-primary)' }} />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">First Name</label>
                            <input className="form-input" name="firstName" value={form.firstName} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Last Name</label>
                            <input className="form-input" name="lastName" value={form.lastName} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Contact Number</label>
                        <input className="form-input" name="contactNumber" value={form.contactNumber} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">College / Organization</label>
                        <input className="form-input" name="college" value={form.college} onChange={handleChange} />
                    </div>
                </div>

                <div className="card" style={{ marginBottom: 16 }}>
                    <h3 className="card-title" style={{ marginBottom: 12 }}>Interests</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {INTEREST_OPTIONS.map(interest => (
                            <span key={interest} className={`tag ${form.interests.includes(interest) ? 'selected' : ''}`} onClick={() => toggleInterest(interest)}>
                                {interest}
                            </span>
                        ))}
                    </div>
                </div>

                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </form>

            <div className="divider" style={{ margin: '24px 0' }} />

            <form onSubmit={handlePasswordChange}>
                <div className="card">
                    <h3 className="card-title" style={{ marginBottom: 16 }}>Change Password</h3>
                    <div className="form-group">
                        <label className="form-label">Current Password</label>
                        <input type="password" className="form-input" value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <input type="password" className="form-input" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={6} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm</label>
                            <input type="password" className="form-input" value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-outline" disabled={pwLoading}>
                        {pwLoading ? 'Changing...' : 'Change Password'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Profile;
