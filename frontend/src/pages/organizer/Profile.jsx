import { useState, useEffect } from 'react';
import { getOrganizerProfile, updateOrganizerProfile, requestPasswordReset } from '../../api';
import toast from 'react-hot-toast';

const OrgProfile = () => {
    const [form, setForm] = useState({ organizerName: '', category: '', description: '', contactEmail: '', contactNumber: '', discordWebhookUrl: '' });
    const [loginEmail, setLoginEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resetReason, setResetReason] = useState('');

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data } = await getOrganizerProfile();
                const o = data.organizer;
                setLoginEmail(o.user?.email || '');
                setForm({
                    organizerName: o.organizerName || '',
                    category: o.category || '',
                    description: o.description || '',
                    contactEmail: o.contactEmail || '',
                    contactNumber: o.contactNumber || '',
                    discordWebhookUrl: o.discordWebhookUrl || '',
                });
            } catch (err) {
                toast.error('Failed to load profile');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateOrganizerProfile(form);
            toast.success('Profile updated');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    const handleResetRequest = async () => {
        try {
            await requestPasswordReset({ reason: resetReason });
            toast.success('Password reset request sent to admin');
            setResetReason('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Request failed');
        }
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    return (
        <div className="page-container" style={{ maxWidth: 600 }}>
            <div className="page-header">
                <h1 className="page-title">Organizer Profile</h1>
            </div>

            <form onSubmit={handleSave}>
                <div className="card" style={{ marginBottom: 16 }}>
                    <h3 className="card-title" style={{ marginBottom: 16 }}>Organization Info</h3>
                    <div className="form-group">
                        <label className="form-label">Login Email</label>
                        <input className="form-input" value={loginEmail} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                        <span className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>Login email cannot be changed</span>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Organizer Name</label>
                        <input className="form-input" name="organizerName" value={form.organizerName} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Category</label>
                        <input className="form-input" name="category" value={form.category} onChange={handleChange} placeholder="e.g., Technical, Cultural" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="form-textarea" name="description" value={form.description} onChange={handleChange} rows={3} />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Contact Email</label>
                            <input type="email" className="form-input" name="contactEmail" value={form.contactEmail} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contact Number</label>
                            <input className="form-input" name="contactNumber" value={form.contactNumber} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: 16 }}>
                    <h3 className="card-title" style={{ marginBottom: 16 }}>Discord Integration</h3>
                    <div className="form-group">
                        <label className="form-label">Webhook URL</label>
                        <input className="form-input" name="discordWebhookUrl" value={form.discordWebhookUrl} onChange={handleChange} placeholder="https://discord.com/api/webhooks/..." />
                    </div>
                    <p className="text-muted" style={{ fontSize: 12 }}>New events will be auto-posted to your Discord channel when published.</p>
                </div>

                <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </form>

            <div className="divider" style={{ margin: '24px 0' }} />

            <div className="card">
                <h3 className="card-title" style={{ marginBottom: 8 }}>Password Reset</h3>
                <p className="text-muted" style={{ fontSize: 13, marginBottom: 12 }}>Password resets are handled by the Admin. Submit a request below.</p>
                <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">Reason for Reset</label>
                    <textarea className="form-textarea" value={resetReason} onChange={(e) => setResetReason(e.target.value)} rows={2} placeholder="Why do you need a password reset?" />
                </div>
                <button className="btn btn-outline" onClick={handleResetRequest}>Request Password Reset</button>
            </div>
        </div>
    );
};

export default OrgProfile;
