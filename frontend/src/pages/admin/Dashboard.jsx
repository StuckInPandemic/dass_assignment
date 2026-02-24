import { Link } from 'react-router-dom';

const AdminDashboard = () => {
    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Admin Dashboard</h1>
                <p className="page-subtitle">System administration</p>
            </div>
            <div className="grid-2">
                <Link to="/admin/clubs" style={{ textDecoration: 'none' }}>
                    <div className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: 32 }}>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>🏢</div>
                        <h3 style={{ fontWeight: 600, marginBottom: 4 }}>Manage Clubs</h3>
                        <p className="text-muted" style={{ fontSize: 13 }}>Create, disable, or remove organizer accounts</p>
                    </div>
                </Link>
                <Link to="/admin/password-resets" style={{ textDecoration: 'none' }}>
                    <div className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: 32 }}>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>🔑</div>
                        <h3 style={{ fontWeight: 600, marginBottom: 4 }}>Password Resets</h3>
                        <p className="text-muted" style={{ fontSize: 13 }}>Handle organizer password reset requests</p>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default AdminDashboard;
