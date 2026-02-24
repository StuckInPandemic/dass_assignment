import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAttendance, exportAttendanceCSV, manualAttendance } from '../../api';
import { FiArrowLeft, FiDownload, FiCheck, FiX } from 'react-icons/fi';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const AttendanceDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const fetchData = async () => {
        try {
            const { data: res } = await getAttendance(id);
            setData(res);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [id]);

    const handleExport = async () => {
        try {
            const response = await exportAttendanceCSV(id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `attendance_${id}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported');
        } catch { toast.error('Export failed'); }
    };

    const handleManualToggle = async (reg) => {
        const reason = prompt(`${reg.attended ? 'Unmark' : 'Mark'} attendance for ${reg.participant?.firstName}? Reason:`);
        if (reason === null) return;
        try {
            await manualAttendance(id, reg._id, { attended: !reg.attended, reason });
            toast.success('Updated');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed');
        }
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
    if (!data) return null;

    const filtered = filter === 'all'
        ? data.registrations
        : filter === 'scanned'
            ? data.registrations.filter(r => r.attended)
            : data.registrations.filter(r => !r.attended);

    const pct = data.total > 0 ? Math.round((data.scanned / data.total) * 100) : 0;

    return (
        <div className="page-container" style={{ maxWidth: 900 }}>
            <button className="btn btn-ghost" onClick={() => navigate(`/organizer/events/${id}`)} style={{ marginBottom: 16 }}>
                <FiArrowLeft /> Back to Event
            </button>

            <div className="page-header">
                <h1 className="page-title">Attendance Dashboard</h1>
                <p className="page-subtitle">Live attendance tracking</p>
            </div>

            {/* Stats */}
            <div className="grid-3" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                    <div className="stat-value">{data.total}</div>
                    <div className="stat-label">Registered</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--success)' }}>{data.scanned}</div>
                    <div className="stat-label">Scanned</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--error)' }}>{data.notScanned}</div>
                    <div className="stat-label">Not Yet</div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="card" style={{ marginBottom: 16, padding: 16 }}>
                <div className="flex justify-between mb-8" style={{ fontSize: 14 }}>
                    <span style={{ fontWeight: 600 }}>Attendance Progress</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{pct}%</span>
                </div>
                <div style={{ background: 'var(--bg-primary)', borderRadius: 8, height: 12, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--success)', borderRadius: 8, transition: 'width 0.3s ease' }} />
                </div>
            </div>

            {/* Filter + Export */}
            <div className="flex justify-between items-center mb-16">
                <div className="flex gap-8">
                    {['all', 'scanned', 'not-scanned'].map(f => (
                        <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(f)}>
                            {f === 'all' ? `All (${data.total})` : f === 'scanned' ? `Scanned (${data.scanned})` : `Not Yet (${data.notScanned})`}
                        </button>
                    ))}
                </div>
                <div className="flex gap-8">
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/organizer/events/${id}/scan`)}>📷 Scan</button>
                    <button className="btn btn-outline btn-sm" onClick={handleExport}><FiDownload /> Export CSV</button>
                </div>
            </div>

            {/* Table */}
            <div className="card">
                {filtered.length === 0 ? (
                    <div className="empty-state"><div className="empty-state-text">No participants match filter</div></div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr><th>Name</th><th>Email</th><th>Ticket ID</th><th>Attended</th><th>Scanned At</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {filtered.map(reg => (
                                    <tr key={reg._id}>
                                        <td>{reg.participant?.firstName} {reg.participant?.lastName}</td>
                                        <td>{reg.participant?.email}</td>
                                        <td><code style={{ fontSize: 12 }}>{reg.ticketId}</code></td>
                                        <td>
                                            <span className={`badge ${reg.attended ? 'badge-success' : 'badge-gray'}`}>
                                                {reg.attended ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 13 }}>{reg.attendedAt ? dayjs(reg.attendedAt).format('h:mm A') : '—'}</td>
                                        <td>
                                            <button className={`btn btn-sm ${reg.attended ? 'btn-ghost' : 'btn-outline'}`} onClick={() => handleManualToggle(reg)} title="Manual override">
                                                {reg.attended ? <FiX /> : <FiCheck />}
                                            </button>
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

export default AttendanceDashboard;
