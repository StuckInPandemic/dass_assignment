import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="loading-screen" style={{ flexDirection: 'column', gap: 16, padding: 32 }}>
                    <span style={{ fontSize: 48 }}>⚠️</span>
                    <h2 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h2>
                    <p className="text-muted" style={{ fontSize: 14, maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
                        An unexpected error occurred. Try refreshing the page or going back.
                    </p>
                    {this.state.error && (
                        <code style={{
                            fontSize: 12,
                            padding: '8px 16px',
                            background: 'var(--bg-primary)',
                            borderRadius: 6,
                            color: 'var(--error)',
                            maxWidth: 500,
                            overflow: 'auto',
                            border: '1px solid var(--border)',
                        }}>
                            {this.state.error.message}
                        </code>
                    )}
                    <div className="flex gap-8" style={{ marginTop: 8 }}>
                        <button className="btn btn-ghost" onClick={() => window.history.back()}>Go Back</button>
                        <button className="btn btn-primary" onClick={this.handleReset}>Try Again</button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
