import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scanTicket } from '../../api';
import { FiArrowLeft, FiCamera, FiUpload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import jsQR from 'jsqr';

const ScannerPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [result, setResult] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [manualId, setManualId] = useState('');
    const [scannerActive, setScannerActive] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const animFrameRef = useRef(null);
    const lastScannedRef = useRef('');

    useEffect(() => {
        return () => stopCamera();
    }, []);

    const processQRData = useCallback((rawText) => {
        // Prevent duplicate rapid scans of the same code
        if (rawText === lastScannedRef.current) return;
        lastScannedRef.current = rawText;
        setTimeout(() => { lastScannedRef.current = ''; }, 3000);

        let ticketId = null;
        try {
            const parsed = JSON.parse(rawText);
            ticketId = parsed.ticketId;
        } catch {
            // If not JSON, treat raw text as ticket ID
            ticketId = rawText.trim();
        }
        if (ticketId) {
            handleScan(ticketId);
        }
    }, []);

    const scanLoop = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
            animFrameRef.current = requestAnimationFrame(scanLoop);
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
            processQRData(code.data);
        }

        animFrameRef.current = requestAnimationFrame(scanLoop);
    }, [processQRData]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
            });
            streamRef.current = stream;
            setScannerActive(true);
            // Attach stream after React renders the video element
            requestAnimationFrame(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current.play();
                        animFrameRef.current = requestAnimationFrame(scanLoop);
                    };
                }
            });
        } catch (err) {
            toast.error('Camera access denied or unavailable');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        setScannerActive(false);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth',
            });

            if (code && code.data) {
                processQRData(code.data);
            } else {
                toast.error('No QR code detected in the image. Try a clearer photo.');
            }
            URL.revokeObjectURL(img.src);
        };
        img.onerror = () => {
            toast.error('Failed to load the image');
        };
        img.src = URL.createObjectURL(file);
        // Reset file input so same file can be re-uploaded
        e.target.value = '';
    };

    const handleScan = async (ticketId) => {
        if (!ticketId || scanning) return;
        setScanning(true);
        try {
            const { data } = await scanTicket(id, { ticketId });
            setResult(data);
            toast.success('✅ Attendance marked!');
        } catch (err) {
            const errData = err.response?.data || {};
            setResult(errData);
            if (errData.duplicate) {
                toast.error('Already scanned!');
            } else {
                toast.error(errData.message || 'Invalid ticket');
            }
        } finally {
            setScanning(false);
        }
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (manualId.trim()) {
            handleScan(manualId.trim());
            setManualId('');
        }
    };

    return (
        <div className="page-container" style={{ maxWidth: 600 }}>
            <button className="btn btn-ghost" onClick={() => navigate(`/organizer/events/${id}`)} style={{ marginBottom: 16 }}>
                <FiArrowLeft /> Back to Event
            </button>

            <div className="card" style={{ textAlign: 'center', padding: 32, marginBottom: 16 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>QR Scanner</h2>
                <p className="text-muted" style={{ marginBottom: 20 }}>Scan participant QR codes to mark attendance</p>

                {/* Camera view */}
                {scannerActive ? (
                    <div style={{ marginBottom: 20 }}>
                        <video ref={videoRef} style={{ width: '100%', maxWidth: 400, borderRadius: 8, border: '2px solid var(--accent)' }} />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        <div style={{ marginTop: 8 }}>
                            <button className="btn btn-danger btn-sm" onClick={stopCamera}>Stop Camera</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-8 justify-center" style={{ marginBottom: 20 }}>
                        <button className="btn btn-outline" onClick={startCamera}>
                            <FiCamera /> Start Camera
                        </button>
                        <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
                            <FiUpload /> Upload QR Image
                            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                        </label>
                    </div>
                )}

                <div className="divider" />

                {/* Manual entry */}
                <form onSubmit={handleManualSubmit} style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Manual Ticket ID Entry</div>
                    <div className="flex gap-8">
                        <input
                            className="form-input"
                            placeholder="e.g. FEL-2026-A1B2C3D4"
                            value={manualId}
                            onChange={e => setManualId(e.target.value)}
                            style={{ flex: 1, fontFamily: "'SF Mono', monospace" }}
                        />
                        <button type="submit" className="btn btn-primary" disabled={scanning || !manualId.trim()}>
                            {scanning ? 'Scanning...' : 'Verify'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Scan Result */}
            {result && (
                <div className="card" style={{
                    padding: 20,
                    borderLeft: `4px solid ${result.valid ? 'var(--success)' : 'var(--error)'}`,
                }}>
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: result.valid ? 'var(--success)' : 'var(--error)' }}>
                        {result.valid ? '✅ Valid Ticket' : '❌ Invalid'}
                    </div>
                    {result.message && <div style={{ fontSize: 14, marginBottom: 8 }}>{result.message}</div>}
                    {result.participant && (
                        <div style={{ fontSize: 14 }}>
                            <div><strong>Name:</strong> {result.participant.firstName} {result.participant.lastName}</div>
                            <div><strong>Email:</strong> {result.participant.email}</div>
                            {result.ticketId && <div><strong>Ticket:</strong> <code>{result.ticketId}</code></div>}
                        </div>
                    )}
                    {result.duplicate && (
                        <div style={{ fontSize: 13, color: 'var(--warning, #f59e0b)', marginTop: 8 }}>⚠️ This ticket was already scanned</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ScannerPage;
