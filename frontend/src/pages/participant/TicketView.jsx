import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRegistration, uploadPaymentProof } from '../../api';
import { FiArrowLeft, FiUpload, FiCalendar, FiDownload } from 'react-icons/fi';
import { downloadICS, openGoogleCalendar, openOutlookCalendar } from '../../utils/calendar';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const TicketView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [reg, setReg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const fetchReg = async () => {
        try {
            const { data } = await getRegistration(id);
            setReg(data.registration);
        } catch {
            toast.error('Ticket not found');
            navigate('/participant/dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReg(); }, [id]);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('paymentProof', file);
        setUploading(true);
        try {
            await uploadPaymentProof(id, formData);
            toast.success('Payment proof uploaded!');
            fetchReg();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
    if (!reg) return null;

    const isPendingApproval = reg.approvalStatus === 'pending';
    const isRejected = reg.approvalStatus === 'rejected';
    const isApproved = reg.approvalStatus === 'approved' || reg.approvalStatus === 'not_required';

    return (
        <div className="page-container" style={{ maxWidth: 600 }}>
            <button className="btn btn-ghost" onClick={() => navigate('/participant/dashboard')} style={{ marginBottom: 16 }}>
                <FiArrowLeft /> Back to Dashboard
            </button>

            <div className="card" style={{ textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Your Ticket</div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{reg.event?.name || 'Event'}</h2>
                <p className="text-muted" style={{ marginBottom: 20 }}>
                    {reg.event?.organizer?.organizerName}
                    {reg.event?.organizer?.category && ` · ${reg.event.organizer.category}`}
                </p>

                {/* Approval Status Banner */}
                {isPendingApproval && (
                    <div style={{ background: 'var(--warning-bg, #fff8e1)', border: '1px solid var(--warning, #f59e0b)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 14 }}>
                        ⏳ <strong>Pending Approval</strong> — Your order is waiting for organizer review.
                        {!reg.paymentProof && ' Upload payment proof below.'}
                    </div>
                )}
                {isRejected && (
                    <div style={{ background: 'var(--error-bg, #fef2f2)', border: '1px solid var(--error)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 14 }}>
                        ❌ <strong>Order Rejected</strong>{reg.approvalNote && ` — ${reg.approvalNote}`}
                    </div>
                )}

                {/* QR Code — only when approved */}
                {isApproved && reg.qrCodeData && (() => {
                    const qrSrc = reg.qrCodeData.startsWith('data:')
                        ? reg.qrCodeData
                        : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${reg.qrCodeData}`;
                    const handleDownload = async () => {
                        try {
                            const response = await fetch(qrSrc);
                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${reg.ticketId || 'qrcode'}.png`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        } catch {
                            toast.error('Failed to download QR code');
                        }
                    };
                    return (
                        <div style={{ marginBottom: 20 }}>
                            <img src={qrSrc} alt="QR Code" style={{ width: 220, height: 220, margin: '0 auto', borderRadius: 8, border: '1px solid var(--border)' }} />
                            <div style={{ marginTop: 10 }}>
                                <button className="btn btn-outline btn-sm" onClick={handleDownload}>
                                    <FiDownload /> Download QR (PNG)
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* Payment Proof Upload — for any pending orders (merch or paid normal) */}
                {isPendingApproval && (
                    <div style={{ marginBottom: 20 }}>
                        {reg.paymentProof ? (
                            <div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Payment proof uploaded ✓</div>
                                <img src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${reg.paymentProof}`} alt="Payment proof" style={{ maxWidth: 200, borderRadius: 8, border: '1px solid var(--border)' }} />
                            </div>
                        ) : (
                            <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
                                <FiUpload /> {uploading ? 'Uploading...' : 'Upload Payment Proof'}
                                <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
                            </label>
                        )}
                    </div>
                )}

                {/* Ticket ID */}
                <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '12px 20px', display: 'inline-block', marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Ticket ID</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: '0.05em' }}>
                        {reg.ticketId}
                    </div>
                </div>

                <div className="divider" />

                {/* Event info */}
                <div style={{ textAlign: 'left', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Type</div>
                        <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{reg.registrationType}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</div>
                        <span className={`badge ${reg.status === 'confirmed' ? 'badge-success' : reg.status === 'pending_approval' ? 'badge-warning' : reg.status === 'rejected' ? 'badge-error' : 'badge-gray'}`}>
                            {reg.status === 'pending_approval' ? 'Pending' : reg.status}
                        </span>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Event Date</div>
                        <div style={{ fontWeight: 500 }}>{reg.event?.eventStartDate ? dayjs(reg.event.eventStartDate).format('MMM D, YYYY') : 'TBA'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Amount</div>
                        <div style={{ fontWeight: 500 }}>{reg.totalAmount > 0 ? `₹${reg.totalAmount}` : 'Free'}</div>
                    </div>
                </div>

                {/* Merchandise items */}
                {reg.registrationType === 'merchandise' && reg.merchSelections?.length > 0 && (
                    <div style={{ textAlign: 'left', marginTop: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Items Ordered</div>
                        {reg.merchSelections.map((s, i) => (
                            <div key={i} className="flex justify-between" style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                                <span>{s.itemName} ({s.variant.size}{s.variant.color ? '/' + s.variant.color : ''}) × {s.quantity}</span>
                                <span style={{ fontWeight: 500 }}>₹{s.price * s.quantity}</span>
                            </div>
                        ))}
                    </div>
                )}

                {isApproved && (
                    <p className="text-muted mt-24" style={{ fontSize: 12 }}>
                        Present this QR code at the event venue.
                    </p>
                )}

                {/* Add to Calendar */}
                {isApproved && reg.event?.eventStartDate && (
                    <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => downloadICS(reg.event)}>
                            <FiCalendar /> Download .ics
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => openGoogleCalendar(reg.event)}>
                            📅 Google Calendar
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => openOutlookCalendar(reg.event)}>
                            📧 Outlook
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketView;
