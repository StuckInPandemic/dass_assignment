import { useState, useEffect } from 'react';
import { getPasswordResets, resolvePasswordReset } from '../../api';
import { FiCheck, FiX } from 'react-icons/fi';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const PasswordResets = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newPassword, setNewPassword] = useState(null);
    const [comments, setComments] = useState({});

    const fetchRequests = async () => {
        try {
            const { data } = await getPasswordResets();
            setRequests(data.requests || []);
        } catch {
            toast.error('Failed to load');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRequests(); }, []);

    const handleAction = async (id, action) => {
        try {
            const { data } = await resolvePasswordReset(id, { action, comments: comments[id] || '' });
            if (action === 'resolve' && data.newPassword) {
                setNewPassword({ id, password: data.newPassword });
                toast.success('Password reset — share new credentials with organizer');
            } else {
                toast.success('Request rejected');
            }
            fetchRequests();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
        }
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Password Reset Requests</h1>
                <p className="page-subtitle">{requests.filter(r => r.status === 'pending').length} pending</p>
            </div>

            {newPassword && (
                <div className="card" style={{ marginBottom: 16, background: 'var(--success-light)', border: '1px solid var(--success)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 4 }}>New Password Generated</div>
                    <div style={{ fontSize: 14 }}>Password: <strong>{newPassword.password}</strong></div>
                    <p className="text-muted mt-8" style={{ fontSize: 12 }}>Share this with the organizer. It won't be shown again.</p>
                </div>
            )}

            <div className="card">
                {requests.length === 0 ? (
                    <div className="empty-state"><div className="empty-state-text">No requests</div></div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Club / Organizer</th>
                                    <th>Email</th>
                                    <th>Reason</th>
                                    <th>Requested</th>
                                    <th>Status</th>
                                    <th>Admin Comments</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req._id}>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{req.organizerName || '—'}</div>
                                            {req.organizerCategory && <div className="text-muted" style={{ fontSize: 11 }}>{req.organizerCategory}</div>}
                                        </td>
                                        <td style={{ fontSize: 13 }}>{req.organizer?.email || 'Unknown'}</td>
                                        <td style={{ fontSize: 13, maxWidth: 200 }}>{req.reason || <span className="text-muted">No reason given</span>}</td>
                                        <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{dayjs(req.createdAt).format('MMM D, YYYY h:mm A')}</td>
                                        <td>
                                            <span className={`badge ${req.status === 'pending' ? 'badge-warning' : req.status === 'resolved' ? 'badge-success' : 'badge-error'}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 13 }}>
                                            {req.status === 'pending' ? (
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="Add comments..."
                                                    value={comments[req._id] || ''}
                                                    onChange={(e) => setComments({ ...comments, [req._id]: e.target.value })}
                                                    style={{ fontSize: 12, padding: '4px 8px', minWidth: 120 }}
                                                />
                                            ) : (
                                                req.adminComments || <span className="text-muted">—</span>
                                            )}
                                        </td>
                                        <td>
                                            {req.status === 'pending' && (
                                                <div className="flex gap-8">
                                                    <button className="btn btn-success btn-sm" onClick={() => handleAction(req._id, 'resolve')}><FiCheck /> Approve</button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => handleAction(req._id, 'reject')}><FiX /> Reject</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PasswordResets;
