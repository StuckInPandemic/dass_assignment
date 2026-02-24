import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getMessages, deleteMessage as deleteMessageAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { FiSend, FiTrash2, FiCornerUpLeft, FiX } from 'react-icons/fi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import toast from 'react-hot-toast';

dayjs.extend(relativeTime);

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const DiscussionForum = ({ eventId }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [replyTo, setReplyTo] = useState(null);
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const socketRef = useRef(null);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        // Fetch initial messages
        const fetchMessages = async () => {
            try {
                const { data } = await getMessages(eventId, { limit: 100 });
                setMessages(data.messages || []);
            } catch { /* ok */ }
            setLoading(false);
        };
        fetchMessages();

        // Connect socket
        const token = localStorage.getItem('felicity_token');
        const socket = io(SOCKET_URL, { auth: { token } });
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            socket.emit('join-event', eventId);
        });

        socket.on('disconnect', () => setConnected(false));

        socket.on('new-message', (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        socket.on('message-deleted', ({ messageId }) => {
            setMessages(prev => prev.filter(m => m._id !== messageId));
        });

        socket.on('error', (err) => {
            toast.error(err.message || 'Forum error');
        });

        return () => {
            socket.emit('leave-event');
            socket.disconnect();
        };
    }, [eventId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!text.trim() || !socketRef.current) return;
        socketRef.current.emit('send-message', {
            text: text.trim(),
            replyTo: replyTo?._id || null,
        });
        setText('');
        setReplyTo(null);
    };

    const handleDelete = async (msg) => {
        if (!confirm('Delete this message?')) return;
        try {
            await deleteMessageAPI(eventId, msg._id);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete');
        }
    };

    const canDelete = (msg) => {
        return user?.role === 'organizer' || msg.sender === user?._id;
    };

    if (loading) return <div style={{ padding: 20, textAlign: 'center' }}><div className="spinner" /></div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 420, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
            {/* Header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>💬 Discussion</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? 'var(--success)' : 'var(--error)' }} />
                    {connected ? 'Live' : 'Disconnected'}
                </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 60, fontSize: 14 }}>
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    messages.map(msg => (
                        <div key={msg._id} style={{ marginBottom: 12 }}>
                            {/* Reply context */}
                            {msg.replyTo && (
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2, paddingLeft: 12, borderLeft: '2px solid var(--border)' }}>
                                    ↩ {msg.replyTo.senderName}: {msg.replyTo.text?.substring(0, 60)}{msg.replyTo.text?.length > 60 ? '...' : ''}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                {/* Avatar */}
                                <div style={{
                                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                    background: msg.senderRole === 'organizer' ? 'var(--accent)' : 'var(--bg-primary)',
                                    border: msg.senderRole === 'organizer' ? 'none' : '1px solid var(--border)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 13, fontWeight: 600,
                                    color: msg.senderRole === 'organizer' ? '#fff' : 'var(--text-primary)',
                                }}>
                                    {msg.senderName?.[0]?.toUpperCase() || '?'}
                                </div>
                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                        <span style={{ fontWeight: 600, fontSize: 13 }}>{msg.senderName}</span>
                                        {msg.senderRole === 'organizer' && (
                                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--accent)', color: '#fff', fontWeight: 600 }}>ORG</span>
                                        )}
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dayjs(msg.createdAt).fromNow()}</span>
                                    </div>
                                    <div style={{ fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word', color: 'var(--text-primary)' }}>
                                        {msg.text}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                        <button
                                            onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}
                                        >
                                            <FiCornerUpLeft style={{ width: 12 }} /> Reply
                                        </button>
                                        {canDelete(msg) && (
                                            <button
                                                onClick={() => handleDelete(msg)}
                                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--error)', display: 'flex', alignItems: 'center', gap: 3 }}
                                            >
                                                <FiTrash2 style={{ width: 12 }} /> Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            {/* Reply indicator */}
            {replyTo && (
                <div style={{ padding: '6px 16px', background: 'var(--bg-primary)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                        Replying to <strong>{replyTo.senderName}</strong>: {replyTo.text?.substring(0, 40)}...
                    </span>
                    <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                        <FiX />
                    </button>
                </div>
            )}

            {/* Input */}
            <form onSubmit={handleSend} style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', gap: 8 }}>
                <input
                    ref={inputRef}
                    className="form-input"
                    placeholder="Type a message..."
                    value={text}
                    onChange={e => setText(e.target.value)}
                    maxLength={1000}
                    style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim() || !connected}>
                    <FiSend />
                </button>
            </form>
        </div>
    );
};

export default DiscussionForum;
