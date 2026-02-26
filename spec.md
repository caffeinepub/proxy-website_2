# Specification

## Summary
**Goal:** Build a proxy website (ProxyPass) that lets users browse remote URLs through a Motoko backend HTTP outcall proxy, with a dark terminal/hacker aesthetic.

**Planned changes:**
- Implement a Motoko backend actor with a public async function that accepts a target URL, fetches the page content via HTTP outcalls, and returns the response body as text (with error handling for unreachable/invalid URLs)
- Build a frontend UI with a URL input field and a "Go" button that calls the backend proxy function
- Display the proxied HTML content in a sandboxed display area, with a loading indicator and error state
- Rewrite relative links, image src, stylesheet href, and script src attributes in the proxied HTML to route back through the proxy, enabling multi-hop browsing
- Apply a dark terminal/hacker aesthetic: near-black background, neon green/cyan accent color, monospace font, card-style input bar and content panel, consistent across all states

**User-visible outcome:** Users can enter any URL into the input bar, click "Go," and browse the proxied page content within the app — including following links, loading images, and stylesheets — all rendered in a styled dark terminal interface.
