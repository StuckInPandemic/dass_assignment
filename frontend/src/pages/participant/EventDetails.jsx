import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEvent, registerForEvent, purchaseMerch } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { FiCalendar, FiClock, FiUsers, FiTag, FiArrowLeft, FiCheck } from 'react-icons/fi';
import DiscussionForum from '../../components/DiscussionForum';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const EventDetails = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showRegModal, setShowRegModal] = useState(false);
    const [formResponses, setFormResponses] = useState({});
    const [merchSelections, setMerchSelections] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const { data } = await getEvent(id);
                setEvent(data.event);
            } catch (err) {
                toast.error('Event not found');
                navigate('/participant/events');
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
    if (!event) return null;

    const deadlinePassed = event.registrationDeadline && new Date(event.registrationDeadline) < new Date();
    const isMerch = event.eventType === 'merchandise';

    // For merch: check if any variant has stock > 0; for normal: check registration limit
    const isFull = isMerch
        ? (event.merchDetails?.items?.length > 0 && event.merchDetails.items.every(item => item.variants.every(v => v.stock <= 0)))
        : (event.registrationLimit > 0 && event.currentRegistrations >= event.registrationLimit);
    const canRegister = !deadlinePassed && !isFull;

    let eligibilityBlocked = false;
    if (event.eligibility === 'iiit-only' && user.participantType !== 'iiit') eligibilityBlocked = true;
    if (event.eligibility === 'non-iiit-only' && user.participantType !== 'non-iiit') eligibilityBlocked = true;

    const handleOpenRegister = () => {
        if (event.eventType === 'merchandise') {
            // Initialize merch selections
            setMerchSelections([]);
        } else {
            // Initialize form responses
            const initial = {};
            event.customForm?.fields?.forEach(f => { initial[f.fieldId] = ''; });
            setFormResponses(initial);
        }
        setShowRegModal(true);
    };

    const handleNormalRegister = async () => {
        setSubmitting(true);
        try {
            const { data } = await registerForEvent(id, { formResponses });
            toast.success(`Registered! Ticket: ${data.ticketId}`);
            setShowRegModal(false);
            navigate(`/participant/ticket/${data.registration._id}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleMerchPurchase = async () => {
        if (merchSelections.length === 0) return toast.error('Select at least one item');
        setSubmitting(true);
        try {
            const { data } = await purchaseMerch(id, { merchSelections });
            toast.success(`Purchased! Ticket: ${data.ticketId}`);
            setShowRegModal(false);
            navigate(`/participant/ticket/${data.registration._id}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Purchase failed');
        } finally {
            setSubmitting(false);
        }
    };

    const addMerchItem = (itemName, variant) => {
        const existing = merchSelections.find(
            s => s.itemName === itemName && s.variant.size === variant.size && s.variant.color === variant.color
        );
        if (existing) {
            setMerchSelections(prev => prev.map(s =>
                s.itemName === itemName && s.variant.size === variant.size && s.variant.color === variant.color
                    ? { ...s, quantity: s.quantity + 1 }
                    : s
            ));
        } else {
            setMerchSelections(prev => [...prev, {
                itemName,
                variant: { size: variant.size, color: variant.color },
                quantity: 1,
                price: variant.price,
            }]);
        }
    };

    const removeMerchItem = (index) => {
        setMerchSelections(prev => prev.filter((_, i) => i !== index));
    };

    const renderFormField = (field) => {
        const val = formResponses[field.fieldId] || '';
        const onChange = (e) => setFormResponses(prev => ({ ...prev, [field.fieldId]: e.target.value }));

        switch (field.type) {
            case 'text':
            case 'email':
            case 'number':
                return <input type={field.type} className="form-input" value={val} onChange={onChange} placeholder={field.label} />;
            case 'textarea':
                return <textarea className="form-input" value={val} onChange={onChange} rows={3} placeholder={field.label} />;
            case 'dropdown':
                return (
                    <select className="form-input" value={val} onChange={onChange}>
                        <option value="">Select...</option>
                        {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                );
            case 'radio':
                return (
                    <div className="flex gap-12" style={{ flexWrap: 'wrap' }}>
                        {field.options?.map(o => (
                            <label key={o} className="flex items-center gap-8" style={{ fontSize: 14, cursor: 'pointer' }}>
                                <input type="radio" name={field.fieldId} value={o} checked={val === o} onChange={onChange} />
                                {o}
                            </label>
                        ))}
                    </div>
                );
            case 'checkbox':
                return (
                    <div className="flex gap-12" style={{ flexWrap: 'wrap' }}>
                        {field.options?.map(o => (
                            <label key={o} className="flex items-center gap-8" style={{ fontSize: 14, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={Array.isArray(val) ? val.includes(o) : false}
                                    onChange={(e) => {
                                        const arr = Array.isArray(val) ? [...val] : [];
                                        if (e.target.checked) arr.push(o);
                                        else arr.splice(arr.indexOf(o), 1);
                                        setFormResponses(prev => ({ ...prev, [field.fieldId]: arr }));
                                    }}
                                />
                                {o}
                            </label>
                        ))}
                    </div>
                );
            default:
                return <input type="text" className="form-input" value={val} onChange={onChange} placeholder={field.label} />;
        }
    };

    const merchTotal = merchSelections.reduce((sum, s) => sum + s.price * s.quantity, 0);

    return (
        <div className="page-container" style={{ maxWidth: 800 }}>
            <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
                <FiArrowLeft /> Back
            </button>

            <div className="card">
                <div className="flex justify-between items-center mb-16">
                    <div className="flex gap-8 items-center">
                        <span className="badge badge-gray">{event.eventType === 'merchandise' ? '🛍️ Merch' : event.eventType}</span>
                        <span className={`badge ${event.status === 'published' ? 'badge-success' : event.status === 'ongoing' ? 'badge-accent' : 'badge-gray'}`}>
                            {event.status}
                        </span>
                    </div>
                    {isMerch ? (
                        (() => {
                            const prices = event.merchDetails?.items?.flatMap(i => i.variants.map(v => v.price)) || [];
                            const minP = Math.min(...prices);
                            const maxP = Math.max(...prices);
                            return prices.length > 0 ? (
                                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
                                    {minP === maxP ? `₹${minP}` : `₹${minP} – ₹${maxP}`}
                                </span>
                            ) : null;
                        })()
                    ) : event.registrationFee > 0 ? (
                        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>₹{event.registrationFee}</span>
                    ) : (
                        <span className="badge badge-success">Free</span>
                    )}
                </div>

                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{event.name}</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{event.organizer?.organizerName} · {event.organizer?.category}</p>

                <div className="divider" />

                <p style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 20, whiteSpace: 'pre-wrap' }}>{event.description || 'No description provided.'}</p>

                <div className="grid-2" style={{ marginBottom: 20 }}>
                    <div className="flex items-center gap-8">
                        <FiCalendar className="text-muted" />
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Start Date</div>
                            <div style={{ fontWeight: 500 }}>{event.eventStartDate ? dayjs(event.eventStartDate).format('ddd, MMM D, YYYY') : 'TBA'}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-8">
                        <FiCalendar className="text-muted" />
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>End Date</div>
                            <div style={{ fontWeight: 500 }}>{event.eventEndDate ? dayjs(event.eventEndDate).format('ddd, MMM D, YYYY') : 'TBA'}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-8">
                        <FiClock className="text-muted" />
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{isMerch ? 'Purchase Deadline' : 'Registration Deadline'}</div>
                            <div style={{ fontWeight: 500, color: deadlinePassed ? 'var(--error)' : undefined }}>
                                {event.registrationDeadline ? dayjs(event.registrationDeadline).format('ddd, MMM D, YYYY') : 'None'}
                                {deadlinePassed && ' (Passed)'}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-8">
                        <FiUsers className="text-muted" />
                        <div>
                            {isMerch ? (
                                <>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Stock</div>
                                    <div style={{ fontWeight: 500 }}>
                                        {(() => {
                                            const totalStock = event.merchDetails?.items?.reduce((sum, item) => sum + item.variants.reduce((s, v) => s + v.stock, 0), 0) || 0;
                                            return totalStock > 0 ? `${totalStock} units available` : <span style={{ color: 'var(--error)' }}>Sold Out</span>;
                                        })()}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Registrations</div>
                                    <div style={{ fontWeight: 500 }}>
                                        {event.currentRegistrations}{event.registrationLimit > 0 ? ` / ${event.registrationLimit}` : ''}{isFull && <span style={{ color: 'var(--error)' }}> (Full)</span>}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {event.eligibility !== 'all' && (
                    <div className="flex items-center gap-8 mb-16">
                        <FiTag className="text-muted" />
                        <span style={{ fontSize: 13, color: eligibilityBlocked ? 'var(--error)' : 'var(--text-secondary)' }}>
                            Eligibility: {event.eligibility === 'iiit-only' ? 'IIIT Students Only' : 'Non-IIIT Only'}
                            {eligibilityBlocked && ' — You are not eligible'}
                        </span>
                    </div>
                )}

                {event.tags?.length > 0 && (
                    <div className="flex gap-8" style={{ flexWrap: 'wrap', marginBottom: 20 }}>
                        {event.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                    </div>
                )}

                {/* Merch details */}
                {event.eventType === 'merchandise' && event.merchDetails?.items?.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Available Items</h3>
                        {event.merchDetails.items.map((item, i) => (
                            <div key={i} className="card" style={{ marginBottom: 8, padding: 14 }}>
                                <div style={{ fontWeight: 600, marginBottom: 6 }}>{item.name}</div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {item.variants.map((v, vi) => (
                                        <span key={vi} style={{ fontSize: 12, padding: '4px 8px', background: 'var(--bg-primary)', borderRadius: 4, border: '1px solid var(--border)' }}>
                                            {v.size}{v.color ? ` / ${v.color}` : ''} — ₹{v.price} ({v.stock} left)
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Register / Purchase button */}
                {user.role === 'participant' && (
                    <div style={{ marginTop: 20 }}>
                        {!canRegister || eligibilityBlocked ? (
                            <button className="btn btn-primary btn-block" disabled>
                                {eligibilityBlocked ? 'Not Eligible' : deadlinePassed ? (isMerch ? 'Purchase Closed' : 'Registration Closed') : (isMerch ? 'Sold Out' : 'Registrations Full')}
                            </button>
                        ) : (
                            <button className="btn btn-primary btn-block" onClick={handleOpenRegister}>
                                {event.eventType === 'merchandise' ? 'Purchase' : 'Register Now'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Registration Modal */}
            {showRegModal && (
                <div className="modal-overlay" onClick={() => !submitting && setShowRegModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, maxHeight: '85vh', overflow: 'auto' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {event.eventType === 'merchandise' ? 'Purchase Items' : 'Event Registration'}
                            </h3>
                        </div>

                        {event.eventType === 'normal' ? (
                            /* Normal Event Registration Form */
                            <div>
                                {event.customForm?.fields?.length > 0 ? (
                                    event.customForm.fields.sort((a, b) => a.order - b.order).map(field => (
                                        <div key={field.fieldId} className="form-group" style={{ marginBottom: 16 }}>
                                            <label className="form-label">
                                                {field.label}
                                                {field.required && <span style={{ color: 'var(--error)' }}>*</span>}
                                            </label>
                                            {renderFormField(field)}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted" style={{ marginBottom: 16 }}>No additional information required. Click confirm to register.</p>
                                )}
                                {event.registrationFee > 0 && (
                                    <div className="flex justify-between items-center" style={{ padding: '12px 0', borderTop: '1px solid var(--border)', marginBottom: 12 }}>
                                        <span style={{ fontWeight: 600 }}>Registration Fee</span>
                                        <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 18 }}>₹{event.registrationFee}</span>
                                    </div>
                                )}
                                <div className="flex gap-8">
                                    <button className="btn btn-ghost" onClick={() => setShowRegModal(false)} disabled={submitting}>Cancel</button>
                                    <button className="btn btn-primary" onClick={handleNormalRegister} disabled={submitting} style={{ flex: 1 }}>
                                        {submitting ? 'Registering...' : 'Confirm Registration'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Merchandise Purchase Form */
                            <div>
                                {event.merchDetails?.items?.map((item, i) => (
                                    <div key={i} style={{ marginBottom: 16 }}>
                                        <div style={{ fontWeight: 600, marginBottom: 8 }}>{item.name}</div>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {item.variants.map((v, vi) => (
                                                <button
                                                    key={vi}
                                                    className="btn btn-outline btn-sm"
                                                    disabled={v.stock <= 0}
                                                    onClick={() => addMerchItem(item.name, v)}
                                                    style={{ fontSize: 12 }}
                                                >
                                                    {v.size}{v.color ? ` / ${v.color}` : ''} — ₹{v.price}
                                                    {v.stock <= 0 && ' (Sold Out)'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {merchSelections.length > 0 && (
                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Your Cart</div>
                                        {merchSelections.map((s, i) => (
                                            <div key={i} className="flex justify-between items-center" style={{ padding: '6px 0', fontSize: 14 }}>
                                                <span>{s.itemName} ({s.variant.size}{s.variant.color ? '/' + s.variant.color : ''}) × {s.quantity}</span>
                                                <div className="flex items-center gap-8">
                                                    <span style={{ fontWeight: 500 }}>₹{s.price * s.quantity}</span>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => removeMerchItem(i)} style={{ padding: '2px 6px', fontSize: 12, color: 'var(--error)' }}>✕</button>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex justify-between items-center" style={{ padding: '12px 0', borderTop: '1px solid var(--border)', marginTop: 8 }}>
                                            <span style={{ fontWeight: 700 }}>Total</span>
                                            <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 18 }}>₹{merchTotal}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-8 mt-16">
                                    <button className="btn btn-ghost" onClick={() => setShowRegModal(false)} disabled={submitting}>Cancel</button>
                                    <button className="btn btn-primary" onClick={handleMerchPurchase} disabled={submitting || merchSelections.length === 0} style={{ flex: 1 }}>
                                        {submitting ? 'Processing...' : `Purchase (₹${merchTotal})`}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
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

export default EventDetails;
