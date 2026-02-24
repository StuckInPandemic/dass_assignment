import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../api';
import toast from 'react-hot-toast';

const IIIT_DOMAINS = ['@iiit.ac.in', '@students.iiit.ac.in', '@research.iiit.ac.in'];

const Signup = () => {
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        college: '',
        contactNumber: '',
    });
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const isIIIT = useMemo(() => {
        return IIIT_DOMAINS.some(domain => form.email.toLowerCase().endsWith(domain));
    }, [form.email]);

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) {
            return toast.error('Passwords do not match');
        }
        setLoading(true);
        try {
            const { data } = await registerUser(form);
            login(data.token, data.user);
            toast.success('Account created!');
            navigate('/onboarding');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card" style={{ maxWidth: 440 }}>
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 32 }}>✦</span>
                </div>
                <h1 className="auth-title">Create account</h1>
                <p className="auth-subtitle">Join Felicity as a participant</p>
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">First Name</label>
                            <input type="text" className="form-input" name="firstName" value={form.firstName} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Last Name</label>
                            <input type="text" className="form-input" name="lastName" value={form.lastName} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input type="email" className="form-input" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
                        {form.email && (
                            <div style={{ marginTop: 6, fontSize: 13, color: isIIIT ? 'var(--success, #22c55e)' : 'var(--text-secondary)' }}>
                                {isIIIT ? '✓ Detected as IIIT student' : 'Non-IIIT participant'}
                            </div>
                        )}
                    </div>
                    {!isIIIT && (
                        <div className="form-group">
                            <label className="form-label">College / Organization</label>
                            <input type="text" className="form-input" name="college" value={form.college} onChange={handleChange} required />
                        </div>
                    )}
                    <div className="form-group">
                        <label className="form-label">Contact Number</label>
                        <input type="tel" className="form-input" name="contactNumber" value={form.contactNumber} onChange={handleChange} />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input type="password" className="form-input" name="password" value={form.password} onChange={handleChange} required minLength={6} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <input type="password" className="form-input" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create account'}
                    </button>
                </form>
                <div className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
};

export default Signup;
