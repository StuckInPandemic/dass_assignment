import { useState, useEffect } from 'react';
import { getAdminOrganizers, createOrganizer, removeOrganizer, restoreOrganizer } from '../../api';
import { FiPlus, FiTrash2, FiRefreshCw, FiCopy, FiArchive, FiSlash } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ManageClubs = () => {
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [credentials, setCredentials] = useState(null);
    const [form, setForm] = useState({ organizerName: '', category: '', description: '', contactEmail: '' });
    const [creating, setCreating] = useState(false);

    const fetchOrganizers = async () => {
        try {
            const { data } = await getAdminOrganizers();
            setOrganizers(data.organizers || []);
        } catch {
            toast.error('Failed to load organizers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrganizers(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const { data } = await createOrganizer(form);
            setCredentials(data.credentials);
            toast.success('Organizer created!');
            setForm({ organizerName: '', category: '', description: '', contactEmail: '' });
            fetchOrganizers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Creation failed');
        } finally {
            setCreating(false);
        }
    };

    const handleRemove = async (id, action) => {
        const messages = {
            disable: 'Disable this organizer? They will not be able to log in but can be re-enabled later.',
            archive: 'Archive this organizer? They will not be able to log in. Use this for long-term removal.',
            delete: 'Permanently delete this organizer? This cannot be undone.',
        };
        if (!window.confirm(messages[action])) return;
        try {
            await removeOrganizer(id, action);
            toast.success(action === 'delete' ? 'Permanently deleted' : action === 'archive' ? 'Archived' : 'Disabled');
            fetchOrganizers();
        } catch { toast.error('Failed'); }
    };

    const handleRestore = async (id) => {
        try {
            await restoreOrganizer(id);
            toast.success('Restored');
            fetchOrganizers();
        } catch { toast.error('Failed'); }
    };

    const copyCredentials = () => {
        if (!credentials) return;
        navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`);
        toast.success('Copied to clipboard');
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    return (
        <div className="page-container">
            <div className="page-header flex justify-between items-center">
                <div>
                    <h1 className="page-title">Manage Clubs & Organizers</h1>
                    <p className="page-subtitle">{organizers.length} organizers</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setShowModal(true); setCredentials(null); }}>
                    <FiPlus /> Add Organizer
                </button>
            </div>

            {/* Credentials display */}
            {credentials && (
                <div className="card" style={{ marginBottom: 16, background: 'var(--success-light)', border: '1px solid var(--success)' }}>
                    <div className="flex justify-between items-center">
                        <div>
                            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--success)' }}>New Organizer Credentials</div>
                            <div style={{ fontSize: 13 }}><strong>Email:</strong> {credentials.email}</div>
                            <div style={{ fontSize: 13 }}><strong>Password:</strong> {credentials.password}</div>
                        </div>
                        <button className="btn btn-outline btn-sm" onClick={copyCredentials}><FiCopy /> Copy</button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="card">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {organizers.map(org => (
                                <tr key={org._id}>
                                    <td style={{ fontWeight: 500 }}>{org.organizerName}</td>
                                    <td>{org.category}</td>
                                    <td>{org.user?.email || org.contactEmail}</td>
                                    <td>
                                        <span className={`badge ${org.status === 'active' ? 'badge-success' : org.status === 'archived' ? 'badge-warning' : 'badge-error'}`}>
                                            {org.status === 'active' ? 'Active' : org.status === 'archived' ? 'Archived' : 'Disabled'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex gap-8">
                                            {org.status !== 'active' && (
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleRestore(org._id)} title="Restore">
                                                    <FiRefreshCw size={14} /> Restore
                                                </button>
                                            )}
                                            {org.status === 'active' && (
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleRemove(org._id, 'disable')} title="Disable" style={{ color: 'var(--error)' }}>
                                                    <FiSlash size={14} /> Disable
                                                </button>
                                            )}
                                            {org.status !== 'archived' && (
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleRemove(org._id, 'archive')} title="Archive" style={{ color: 'var(--warning)' }}>
                                                    <FiArchive size={14} /> Archive
                                                </button>
                                            )}
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleRemove(org._id, 'delete')} title="Permanently Delete" style={{ color: 'var(--error)' }}>
                                                <FiTrash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3 className="modal-title">Add New Organizer</h3>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Organizer Name *</label>
                                <input className="form-input" value={form.organizerName} onChange={e => setForm({ ...form, organizerName: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category *</label>
                                <input className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g., Technical, Cultural" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Contact Email *</label>
                                <input type="email" className="form-input" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageClubs;
