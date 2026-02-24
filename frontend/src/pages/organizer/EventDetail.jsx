import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEvent, publishEvent as publishEventApi, changeEventStatus, getEventParticipants, getEventAnalytics, exportParticipantsCSV, getEventOrders, approveOrder } from '../../api';
import { FiArrowLeft, FiDownload, FiSearch, FiCheck, FiX } from 'react-icons/fi';
import DiscussionForum from '../../components/DiscussionForum';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const statusColors = { draft: 'badge-gray', published: 'badge-success', ongoing: 'badge-accent', completed: 'badge-warning', closed: 'badge-error' };

const OrgEventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [orders, setOrders] = useState([]);
    const [orderFilter, setOrderFilter] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data } = await getEvent(id);
                setEvent(data.event);
                const { data: analyticsData } = await getEventAnalytics(id);
                setAnalytics(analyticsData.analytics);
            } catch {
                toast.error('Event not found');
                navigate('/organizer/dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [id]);

    useEffect(() => {
        if (tab === 'participants') fetchParticipants();
        if (tab === 'orders') fetchOrders();
    }, [tab, orderFilter]);

    const fetchParticipants = async () => {
        try {
            const { data } = await getEventParticipants(id, { search });
            setParticipants(data.registrations || []);
        } catch { /* ok */ }
    };

    const fetchOrders = async () => {
        try {
            const { data } = await getEventOrders(id, orderFilter ? { status: orderFilter } : {});
            setOrders(data.orders || []);
        } catch { /* ok */ }
    };

    const handlePublish = async () => {
        try {
            const { data } = await publishEventApi(id);
            setEvent(data.event);
            toast.success('Event published!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to publish');
        }
    };

    const handleStatusChange = async (status) => {
        try {
            const { data } = await changeEventStatus(id, { status });
            setEvent(data.event);
            toast.success(`Status changed to ${status}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to change status');
        }
    };

    const handleExport = async () => {
        try {
            const response = await exportParticipantsCSV(id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${event.name}_participants.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported');
        } catch { toast.error('Export failed'); }
    };

    const handleApprove = async (orderId) => {
        try {
            await approveOrder(orderId, { action: 'approve' });
            toast.success('Order approved — ticket generated');
            fetchOrders();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Approval failed');
        }
    };

    const handleReject = async (orderId) => {
        const note = prompt('Reason for rejection (optional):');
        try {
            await approveOrder(orderId, { action: 'reject', note: note || '' });
            toast.success('Order rejected');
            fetchOrders();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Rejection failed');
        }
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
    if (!event) return null;

    const isMerch = event.eventType === 'merchandise';

    return (
        <div className="page-container" style={{ maxWidth: 900 }}>
            <button className="btn btn-ghost" onClick={() => navigate('/organizer/dashboard')} style={{ marginBottom: 16 }}>
                <FiArrowLeft /> Dashboard
            </button>

            {/* Header */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="flex justify-between items-center">
                    <div>
                        <div className="flex gap-8 items-center mb-8">
                            <span className="badge badge-gray">{event.eventType}</span>
                            <span className={`badge ${statusColors[event.status]}`}>{event.status}</span>
                        </div>
                        <h1 style={{ fontSize: 22, fontWeight: 700 }}>{event.name}</h1>
                    </div>
                    <div className="flex gap-8">
                        {event.status === 'draft' && <button className="btn btn-success btn-sm" onClick={handlePublish}>Publish</button>}
                        {event.status === 'published' && <button className="btn btn-accent btn-sm" style={{ background: 'var(--accent)', color: '#fff' }} onClick={() => handleStatusChange('ongoing')}>Mark Ongoing</button>}
                        {event.status === 'published' && <button className="btn btn-danger btn-sm" onClick={() => handleStatusChange('closed')}>Close</button>}
                        {event.status === 'ongoing' && <button className="btn btn-success btn-sm" onClick={() => handleStatusChange('completed')}>Complete</button>}
                        {event.status === 'ongoing' && <button className="btn btn-danger btn-sm" onClick={() => handleStatusChange('closed')}>Close</button>}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
                <button className={`tab ${tab === 'participants' ? 'active' : ''}`} onClick={() => setTab('participants')}>Participants</button>
                {isMerch && <button className={`tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>Orders</button>}
                {['ongoing', 'completed'].includes(event.status) && (
                    <>
                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/organizer/events/${id}/scan`)} style={{ marginLeft: 'auto' }}>📷 Scan QR</button>
                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/organizer/events/${id}/attendance`)}>📊 Attendance</button>
                    </>
                )}
            </div>

            {tab === 'overview' && (
                <>
                    {analytics && (
                        <div className="grid-3" style={{ marginBottom: 20 }}>
                            <div className="stat-card"><div className="stat-value">{analytics.totalRegistrations}</div><div className="stat-label">{isMerch ? 'Orders' : 'Registrations'}</div></div>
                            <div className="stat-card"><div className="stat-value">₹{analytics.totalRevenue}</div><div className="stat-label">Revenue</div></div>
                            <div className="stat-card"><div className="stat-value">{analytics.totalAttended}</div><div className="stat-label">Attended</div></div>
                        </div>
                    )}

                    {/* Event Details Card */}
                    <div className="card" style={{ marginBottom: 16 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>📋 Event Details</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', fontSize: 14 }}>
                            <div><span style={{ color: 'var(--text-secondary)' }}>Start</span><div style={{ fontWeight: 500 }}>{event.eventStartDate ? dayjs(event.eventStartDate).format('ddd, MMM D, YYYY h:mm A') : 'TBA'}</div></div>
                            <div><span style={{ color: 'var(--text-secondary)' }}>End</span><div style={{ fontWeight: 500 }}>{event.eventEndDate ? dayjs(event.eventEndDate).format('ddd, MMM D, YYYY h:mm A') : 'TBA'}</div></div>
                            <div><span style={{ color: 'var(--text-secondary)' }}>{isMerch ? 'Purchase Deadline' : 'Registration Deadline'}</span><div style={{ fontWeight: 500 }}>{event.registrationDeadline ? dayjs(event.registrationDeadline).format('ddd, MMM D, YYYY h:mm A') : 'None'}</div></div>
                            <div><span style={{ color: 'var(--text-secondary)' }}>Eligibility</span><div style={{ fontWeight: 500 }}>{event.eligibility === 'all' ? 'Everyone' : event.eligibility === 'iiit-only' ? 'IIIT Students Only' : 'Non-IIIT Only'}</div></div>
                            {!isMerch && (
                                <>
                                    <div><span style={{ color: 'var(--text-secondary)' }}>Registration Fee</span><div style={{ fontWeight: 500 }}>{event.registrationFee ? `₹${event.registrationFee}` : 'Free'}</div></div>
                                    <div><span style={{ color: 'var(--text-secondary)' }}>Registrations</span><div style={{ fontWeight: 500 }}>{event.currentRegistrations}{event.registrationLimit > 0 ? ` / ${event.registrationLimit}` : ' (unlimited)'}</div></div>
                                </>
                            )}
                            {isMerch && event.merchDetails && (
                                <div><span style={{ color: 'var(--text-secondary)' }}>Purchase Limit</span><div style={{ fontWeight: 500 }}>{event.merchDetails.purchaseLimitPerParticipant || 1} per participant</div></div>
                            )}
                        </div>
                        {event.tags && event.tags.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Tags</span>
                                <div className="flex gap-8" style={{ marginTop: 4, flexWrap: 'wrap' }}>
                                    {event.tags.map((tag, i) => (
                                        <span key={i} className="badge badge-gray" style={{ fontSize: 12 }}>{tag}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {event.description && (
                            <>
                                <div className="divider" />
                                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Description</span>
                                <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)', marginTop: 4, fontSize: 14, lineHeight: 1.6 }}>{event.description}</p>
                            </>
                        )}
                    </div>

                    {/* Custom Form Fields Card (normal events) */}
                    {!isMerch && event.customForm && event.customForm.fields && event.customForm.fields.length > 0 && (
                        <div className="card" style={{ marginBottom: 16 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>📝 Registration Form Fields</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {event.customForm.fields
                                    .slice()
                                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                                    .map((field, idx) => (
                                    <div key={field.fieldId || idx} style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '10px 14px', borderRadius: 8,
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border)',
                                    }}>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, minWidth: 20 }}>#{idx + 1}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>
                                                {field.label}
                                                {field.required && <span style={{ color: 'var(--error)', marginLeft: 4 }}>*</span>}
                                            </div>
                                            {field.options && field.options.length > 0 && (
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                    Options: {field.options.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                        <span className="badge badge-gray" style={{ fontSize: 11, textTransform: 'uppercase' }}>{field.type}</span>
                                    </div>
                                ))}
                            </div>
                            {event.customForm.isLocked && (
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>🔒 Form is locked — fields cannot be modified</p>
                            )}
                        </div>
                    )}

                    {/* No custom fields placeholder (normal events) */}
                    {!isMerch && (!event.customForm || !event.customForm.fields || event.customForm.fields.length === 0) && (
                        <div className="card" style={{ marginBottom: 16 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>📝 Registration Form Fields</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No custom form fields configured. Participants will register with default info only.</p>
                        </div>
                    )}

                    {/* Merchandise Items Card */}
                    {isMerch && event.merchDetails && event.merchDetails.items && event.merchDetails.items.length > 0 && (
                        <div className="card" style={{ marginBottom: 16 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>🛍️ Merchandise Items</h3>
                            {event.merchDetails.items.map((item, itemIdx) => (
                                <div key={item._id || itemIdx} style={{
                                    padding: 14, borderRadius: 8,
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border)',
                                    marginBottom: itemIdx < event.merchDetails.items.length - 1 ? 12 : 0,
                                }}>
                                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>{item.name}</div>
                                    <div className="table-container" style={{ margin: 0 }}>
                                        <table style={{ fontSize: 13 }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ padding: '6px 12px' }}>Size</th>
                                                    <th style={{ padding: '6px 12px' }}>Color</th>
                                                    <th style={{ padding: '6px 12px', textAlign: 'right' }}>Stock</th>
                                                    <th style={{ padding: '6px 12px', textAlign: 'right' }}>Price</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {item.variants.map((v, vIdx) => (
                                                    <tr key={v._id || vIdx}>
                                                        <td style={{ padding: '6px 12px' }}>{v.size || '—'}</td>
                                                        <td style={{ padding: '6px 12px' }}>{v.color || '—'}</td>
                                                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>{v.stock}</td>
                                                        <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600 }}>₹{v.price}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No merch items placeholder */}
                    {isMerch && (!event.merchDetails || !event.merchDetails.items || event.merchDetails.items.length === 0) && (
                        <div className="card" style={{ marginBottom: 16 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>🛍️ Merchandise Items</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No merchandise items configured.</p>
                        </div>
                    )}
                </>
            )}

            {tab === 'participants' && (
                <div className="card">
                    <div className="flex justify-between items-center mb-16">
                        <form onSubmit={(e) => { e.preventDefault(); fetchParticipants(); }} style={{ display: 'flex', gap: 8 }}>
                            <div style={{ position: 'relative' }}>
                                <FiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input className="form-input" style={{ paddingLeft: 32, width: 260 }} placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                            <button type="submit" className="btn btn-outline btn-sm">Search</button>
                        </form>
                        <button className="btn btn-outline btn-sm" onClick={handleExport}><FiDownload /> Export CSV</button>
                    </div>
                    {participants.length === 0 ? (
                        <div className="empty-state"><div className="empty-state-text">No participants yet</div></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr><th>Name</th><th>Email</th><th>Registered</th><th>Status</th><th>Attended</th><th>Amount</th></tr>
                                </thead>
                                <tbody>
                                    {participants.map(reg => (
                                        <tr key={reg._id}>
                                            <td>{reg.participant?.firstName} {reg.participant?.lastName}</td>
                                            <td>{reg.participant?.email}</td>
                                            <td>{dayjs(reg.createdAt).format('MMM D')}</td>
                                            <td><span className={`badge ${reg.status === 'confirmed' ? 'badge-success' : reg.status === 'pending_approval' ? 'badge-warning' : 'badge-error'}`}>{reg.status === 'pending_approval' ? 'pending' : reg.status}</span></td>
                                            <td>{reg.attended ? '✓' : '—'}</td>
                                            <td>₹{reg.totalAmount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {tab === 'orders' && (
                <div className="card">
                    <div className="flex justify-between items-center mb-16">
                        <div className="flex gap-8">
                            {['', 'pending', 'approved', 'rejected'].map(f => (
                                <button key={f} className={`btn btn-sm ${orderFilter === f ? 'btn-primary' : 'btn-outline'}`} onClick={() => setOrderFilter(f)}>
                                    {f || 'All'}
                                </button>
                            ))}
                        </div>
                    </div>
                    {orders.length === 0 ? (
                        <div className="empty-state"><div className="empty-state-text">No orders</div></div>
                    ) : (
                        <div>
                            {orders.map(order => (
                                <div key={order._id} className="card" style={{ marginBottom: 12, padding: 16 }}>
                                    <div className="flex justify-between items-center mb-8">
                                        <div>
                                            <span style={{ fontWeight: 600 }}>{order.participant?.firstName} {order.participant?.lastName}</span>
                                            <span className="text-muted" style={{ marginLeft: 8, fontSize: 13 }}>{order.participant?.email}</span>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <span className={`badge ${order.approvalStatus === 'pending' ? 'badge-warning' : order.approvalStatus === 'approved' ? 'badge-success' : 'badge-error'}`}>
                                                {order.approvalStatus}
                                            </span>
                                            <span style={{ fontWeight: 600, color: 'var(--accent)' }}>₹{order.totalAmount}</span>
                                        </div>
                                    </div>
                                    {/* Items */}
                                    <div style={{ fontSize: 13, marginBottom: 8 }}>
                                        {order.merchSelections?.map((s, i) => (
                                            <span key={i} style={{ marginRight: 12 }}>{s.itemName} ({s.variant?.size}{s.variant?.color ? '/' + s.variant.color : ''}) ×{s.quantity}</span>
                                        ))}
                                    </div>
                                    {/* Payment proof */}
                                    {order.paymentProof && (
                                        <div style={{ marginBottom: 8 }}>
                                            <a href={`http://localhost:5000${order.paymentProof}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--accent)' }}>
                                                📎 View Payment Proof
                                            </a>
                                        </div>
                                    )}
                                    {/* Actions */}
                                    {order.approvalStatus === 'pending' && (
                                        <div className="flex gap-8" style={{ marginTop: 8 }}>
                                            <button className="btn btn-success btn-sm" onClick={() => handleApprove(order._id)}><FiCheck /> Approve</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleReject(order._id)}><FiX /> Reject</button>
                                        </div>
                                    )}
                                    {order.approvalNote && (
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Note: {order.approvalNote}</div>
                                    )}
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{dayjs(order.createdAt).format('MMM D, h:mm A')} · {order.ticketId}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {/* Discussion Forum */}
            {['published', 'ongoing'].includes(event.status) && (
                <div style={{ marginTop: 24 }}>
                    <DiscussionForum eventId={id} />
                </div>
            )}
        </div>
    );
};

export default OrgEventDetail;
