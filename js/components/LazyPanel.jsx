import React, { Suspense } from 'react';
import { Button, Spinner } from './common.jsx';

// The visual editors and diff views load on demand, so the app starts faster.
// LazyPanel shows a spinner while an editor downloads. If the download fails (for example,
// the connection drops or a new deployment has replaced the old files), or the editor throws
// while it starts, LazyPanel shows a message in place of the editor and the rest of the app
// keeps working.
class LoadFailureBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error) {
        console.error(`The ${this.props.name} failed:`, error);
    }

    componentDidUpdate(prevProps) {
        // Switching to another diagram type gives its editor a fresh start.
        if (this.state.failed && prevProps.resetKey !== this.props.resetKey) {
            this.setState({ failed: false });
        }
    }

    render() {
        if (!this.state.failed) return this.props.children;
        return (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center text-slate-600" role="alert">
                <p className="text-sm">The {this.props.name} couldn't open. Reload the page to try again.</p>
                <Button onClick={() => window.location.reload()}>Reload page</Button>
            </div>
        );
    }
}

export const LazyPanel = ({ name, resetKey, children }) => (
    <LoadFailureBoundary name={name} resetKey={resetKey}>
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-full">
                    <Spinner text={`Loading the ${name}…`} />
                </div>
            }
        >
            {children}
        </Suspense>
    </LoadFailureBoundary>
);

// React.lazy expects a default export; the editors use named exports.
export const lazyNamed = (load, exportName) =>
    React.lazy(() => load().then((module) => ({ default: module[exportName] })));
