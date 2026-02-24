import { useAuth } from '../../context/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiHome, FiSearch, FiUsers, FiUser, FiLogOut, FiPlusCircle, FiActivity, FiSettings, FiShield } from 'react-icons/fi';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const participantLinks = [
        { to: '/participant/dashboard', icon: <FiHome />, label: 'Dashboard' },
        { to: '/participant/events', icon: <FiSearch />, label: 'Browse Events' },
        { to: '/participant/clubs', icon: <FiUsers />, label: 'Clubs' },
        { to: '/participant/profile', icon: <FiUser />, label: 'Profile' },
    ];

    const organizerLinks = [
        { to: '/organizer/dashboard', icon: <FiHome />, label: 'Dashboard' },
        { to: '/organizer/events/new', icon: <FiPlusCircle />, label: 'Create Event' },
        { to: '/organizer/ongoing', icon: <FiActivity />, label: 'Ongoing' },
        { to: '/organizer/profile', icon: <FiUser />, label: 'Profile' },
    ];

    const adminLinks = [
        { to: '/admin/dashboard', icon: <FiHome />, label: 'Dashboard' },
        { to: '/admin/clubs', icon: <FiUsers />, label: 'Manage Clubs' },
        { to: '/admin/password-resets', icon: <FiShield />, label: 'Password Resets' },
    ];

    const links = user?.role === 'admin' ? adminLinks
        : user?.role === 'organizer' ? organizerLinks
            : participantLinks;

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <span className="navbar-logo">✦</span>
                <span className="navbar-title">Felicity</span>
            </div>
            <div className="navbar-links">
                {links.map(link => (
                    <NavLink key={link.to} to={link.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        {link.icon}
                        <span>{link.label}</span>
                    </NavLink>
                ))}
            </div>
            <button className="nav-link logout-btn" onClick={handleLogout}>
                <FiLogOut />
                <span>Logout</span>
            </button>
        </nav>
    );
};

export default Navbar;
