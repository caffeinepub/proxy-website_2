import { useState, useRef, useCallback } from 'react';
import {
    Globe,
    ArrowRight,
    ArrowLeft,
    RotateCcw,
    AlertTriangle,
    Terminal,
    Shield,
    Loader2,
    X,
    ExternalLink,
} from 'lucide-react';
import { useProxyRequest } from './hooks/useQueries';
import { rewriteHtml, extractTitle } from './utils/rewriteHtml';

interface HistoryEntry {
    url: string;
    title: string | null;
}

function normalizeUrl(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return 'https://' + trimmed;
}

export default function App() {
    const [inputUrl, setInputUrl] = useState('');
    const [currentUrl, setCurrentUrl] = useState('');
    const [proxiedHtml, setProxiedHtml] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [pageTitle, setPageTitle] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const proxyMutation = useProxyRequest();

    const loadUrl = useCallback(
        async (url: string, addToHistory = true) => {
            const normalized = normalizeUrl(url);
            if (!normalized) return;

            setErrorMsg(null);
            setCurrentUrl(normalized);
            setInputUrl(normalized);

            try {
                const html = await proxyMutation.mutateAsync(normalized);

                if (
                    typeof html === 'string' &&
                    (html.toLowerCase().startsWith('error:') || html.toLowerCase().startsWith('http error'))
                ) {
                    setErrorMsg(html);
                    setProxiedHtml(null);
                    return;
                }

                const rewritten = rewriteHtml(html, normalized);
                const title = extractTitle(html);
                setPageTitle(title);
                setProxiedHtml(rewritten);

                if (addToHistory) {
                    const newEntry: HistoryEntry = { url: normalized, title };
                    setHistory((prev) => {
                        const truncated = prev.slice(0, historyIndex + 1);
                        return [...truncated, newEntry];
                    });
                    setHistoryIndex((prev) => prev + 1);
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
                setErrorMsg(message);
                setProxiedHtml(null);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [proxyMutation, historyIndex]
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputUrl.trim()) {
            loadUrl(inputUrl);
        }
    };

    const handleBack = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            loadUrl(history[newIndex].url, false);
        }
    };

    const handleForward = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            loadUrl(history[newIndex].url, false);
        }
    };

    const handleReload = () => {
        if (currentUrl) {
            loadUrl(currentUrl, false);
        }
    };

    const handleClear = () => {
        setProxiedHtml(null);
        setErrorMsg(null);
        setCurrentUrl('');
        setInputUrl('');
        setPageTitle(null);
    };

    const handleIframeLoad = () => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) return;

            iframeDoc.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const anchor = target.closest('a');
                if (!anchor) return;

                const proxyHref = anchor.getAttribute('data-proxy-href');
                const href = proxyHref || anchor.getAttribute('href');

                if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

                e.preventDefault();
                e.stopPropagation();
                loadUrl(href);
            });
        } catch {
            // Cross-origin access blocked — expected for some content
        }
    };

    const isLoading = proxyMutation.isPending;
    const canGoBack = historyIndex > 0;
    const canGoForward = historyIndex < history.length - 1;

    const appId =
        typeof window !== 'undefined'
            ? encodeURIComponent(window.location.hostname)
            : 'proxy-website';

    return (
        <div className="min-h-screen bg-background flex flex-col font-mono">
            {/* ── Header ── */}
            <header className="border-b border-terminal-border bg-terminal-card">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
                    {/* Logo + Brand */}
                    <div className="flex items-center gap-2 shrink-0">
                        <img
                            src="/assets/generated/proxy-logo.dim_128x128.png"
                            alt="ProxyPass"
                            className="w-8 h-8 object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                        <div className="flex items-center gap-1.5">
                            <Terminal className="w-5 h-5 text-neon" />
                            <span className="text-neon font-bold text-lg tracking-wider neon-text-glow">
                                PROXY<span className="text-foreground">PASS</span>
                            </span>
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 ml-2">
                        <Shield className="w-3.5 h-3.5 text-neon-dim" />
                        <span className="text-xs text-terminal-muted tracking-widest uppercase">
                            Anonymous Browsing
                        </span>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-neon animate-pulse-neon" />
                        <span className="text-xs text-neon-dim hidden sm:inline tracking-widest">ONLINE</span>
                    </div>
                </div>
            </header>

            {/* ── Main ── */}
            <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 py-4 gap-4">

                {/* Browser Controls Bar */}
                <div className="terminal-border rounded-md bg-terminal-card p-3">
                    <div className="flex items-center gap-2 mb-3">
                        {/* Back */}
                        <button
                            onClick={handleBack}
                            disabled={!canGoBack || isLoading}
                            className="p-1.5 rounded text-terminal-muted hover:text-neon hover:bg-neon/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Go back"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>

                        {/* Forward */}
                        <button
                            onClick={handleForward}
                            disabled={!canGoForward || isLoading}
                            className="p-1.5 rounded text-terminal-muted hover:text-neon hover:bg-neon/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Go forward"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </button>

                        {/* Reload */}
                        <button
                            onClick={handleReload}
                            disabled={!currentUrl || isLoading}
                            className="p-1.5 rounded text-terminal-muted hover:text-neon hover:bg-neon/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Reload"
                        >
                            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>

                        {/* URL Input */}
                        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2 bg-background border border-terminal-border rounded px-3 py-1.5 focus-within:border-neon focus-within:shadow-neon-sm transition-all">
                                <Globe className="w-3.5 h-3.5 text-neon-dim shrink-0" />
                                <input
                                    type="text"
                                    value={inputUrl}
                                    onChange={(e) => setInputUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-terminal-muted/60 font-mono"
                                    disabled={isLoading}
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                {inputUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setInputUrl('')}
                                        className="text-terminal-muted hover:text-foreground transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={!inputUrl.trim() || isLoading}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-neon text-primary-foreground rounded text-sm font-bold hover:bg-neon-bright disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-neon-sm hover:shadow-neon active:scale-95"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <ArrowRight className="w-4 h-4" />
                                )}
                                <span className="hidden sm:inline">
                                    {isLoading ? 'Loading...' : 'GO'}
                                </span>
                            </button>
                        </form>

                        {/* Clear */}
                        {(proxiedHtml || errorMsg) && (
                            <button
                                onClick={handleClear}
                                className="p-1.5 rounded text-terminal-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Clear"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Status Bar */}
                    <div className="flex items-center gap-3 text-xs text-terminal-muted border-t border-terminal-border pt-2">
                        <span className="font-mono flex items-center gap-1.5 min-w-0">
                            {isLoading ? (
                                <span className="text-neon animate-pulse-neon">▶ Fetching via proxy...</span>
                            ) : currentUrl ? (
                                <>
                                    <span className="text-neon shrink-0">✓</span>
                                    <span className="truncate">{pageTitle || currentUrl}</span>
                                </>
                            ) : (
                                <span>Enter a URL above to start browsing anonymously</span>
                            )}
                        </span>
                        {history.length > 0 && (
                            <span className="ml-auto shrink-0">
                                {historyIndex + 1}/{history.length}
                            </span>
                        )}
                    </div>
                </div>

                {/* Error Display */}
                {errorMsg && (
                    <div className="rounded-md bg-destructive/10 border border-destructive/40 p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-destructive mb-1">Connection Error</p>
                            <p className="text-xs text-terminal-muted font-mono break-all">{errorMsg}</p>
                        </div>
                        <button
                            onClick={() => setErrorMsg(null)}
                            className="text-terminal-muted hover:text-foreground transition-colors shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Proxied Content */}
                {proxiedHtml ? (
                    <div
                        className="flex-1 terminal-border rounded-md overflow-hidden bg-white relative"
                        style={{ minHeight: '60vh' }}
                    >
                        {/* Iframe chrome bar */}
                        <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-3 py-1.5 bg-terminal-card border-b border-terminal-border">
                            <div className="flex gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
                                <span className="w-2.5 h-2.5 rounded-full bg-neon-dim/70" />
                                <span className="w-2.5 h-2.5 rounded-full bg-neon/70" />
                            </div>
                            <span className="text-xs text-terminal-muted truncate flex-1 font-mono">
                                {currentUrl}
                            </span>
                            <a
                                href={currentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-terminal-muted hover:text-neon transition-colors"
                                title="Open original URL in new tab"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>

                        <iframe
                            ref={iframeRef}
                            srcDoc={proxiedHtml}
                            sandbox="allow-same-origin allow-forms allow-popups"
                            className="w-full border-0"
                            style={{ marginTop: '36px', height: 'calc(100% - 36px)', minHeight: '55vh' }}
                            title="Proxied Content"
                            onLoad={handleIframeLoad}
                        />
                    </div>
                ) : isLoading ? (
                    /* Loading State */
                    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-5">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full border-2 border-neon/20" />
                            <div className="absolute inset-0 rounded-full border-t-2 border-neon animate-spin" />
                            <Globe className="absolute inset-0 m-auto w-7 h-7 text-neon" />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-neon text-sm font-semibold animate-pulse-neon">
                                Routing request through proxy...
                            </p>
                            <p className="text-terminal-muted text-xs font-mono truncate max-w-xs">
                                {currentUrl}
                            </p>
                        </div>
                        <div className="flex gap-1.5">
                            {[0, 1, 2, 3, 4].map((i) => (
                                <span
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse-neon"
                                    style={{ animationDelay: `${i * 0.18}s` }}
                                />
                            ))}
                        </div>
                    </div>
                ) : !errorMsg ? (
                    /* Idle / Welcome State */
                    <div className="flex-1 flex flex-col items-center justify-center py-16 gap-8">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full border-2 border-neon/30 flex items-center justify-center">
                                <Globe className="w-12 h-12 text-neon animate-pulse-neon" />
                            </div>
                            <div
                                className="absolute inset-0 rounded-full border border-neon/10 scale-125 animate-ping"
                                style={{ animationDuration: '3s' }}
                            />
                        </div>

                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-neon neon-text-glow tracking-wider">
                                PROXYPASS
                            </h2>
                            <p className="text-terminal-muted text-sm max-w-md leading-relaxed">
                                Browse the web anonymously. Enter any URL above and route your
                                request through the on-chain proxy.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg w-full">
                            {[
                                { icon: Shield, label: 'Anonymous', desc: 'Your IP stays hidden' },
                                { icon: Globe, label: 'Any Website', desc: 'Access any public URL' },
                                { icon: Terminal, label: 'On-Chain', desc: 'Powered by ICP' },
                            ].map(({ icon: Icon, label, desc }) => (
                                <div
                                    key={label}
                                    className="terminal-border rounded-md p-4 bg-terminal-card text-center hover:border-neon/40 transition-colors"
                                >
                                    <Icon className="w-5 h-5 text-neon mx-auto mb-2" />
                                    <p className="text-xs font-semibold text-foreground">{label}</p>
                                    <p className="text-xs text-terminal-muted mt-0.5">{desc}</p>
                                </div>
                            ))}
                        </div>

                        <p className="text-xs text-terminal-muted/50 font-mono">
                            <span className="text-neon/50">$</span> type a URL and press GO
                            <span className="animate-blink">_</span>
                        </p>
                    </div>
                ) : null}
            </main>

            {/* ── Footer ── */}
            <footer className="border-t border-terminal-border bg-terminal-card mt-auto">
                <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-terminal-muted">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-neon-dim" />
                        <span>ProxyPass &copy; {new Date().getFullYear()}</span>
                        <span className="opacity-30">|</span>
                        <span>Powered by Internet Computer</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span>Built with</span>
                        <span className="text-neon animate-pulse-neon mx-0.5">♥</span>
                        <span>using</span>
                        <a
                            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${appId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neon hover:text-neon-bright transition-colors ml-1"
                        >
                            caffeine.ai
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
