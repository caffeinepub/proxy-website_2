/**
 * Rewrites relative URLs in proxied HTML to absolute URLs,
 * and injects a base tag so relative resources resolve correctly.
 */
export function rewriteHtml(html: string, baseUrl: string): string {
    try {
        const base = new URL(baseUrl);
        const baseOrigin = base.origin;
        const basePath = base.href.substring(0, base.href.lastIndexOf('/') + 1);

        function resolveUrl(url: string): string {
            if (!url || url.startsWith('data:') || url.startsWith('javascript:') || url.startsWith('#')) {
                return url;
            }
            try {
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    return url;
                }
                if (url.startsWith('//')) {
                    return base.protocol + url;
                }
                if (url.startsWith('/')) {
                    return baseOrigin + url;
                }
                return new URL(url, basePath).href;
            } catch {
                return url;
            }
        }

        // Rewrite href on <a> tags — mark with data-proxy-href for click interception
        let result = html.replace(
            /(<a\s[^>]*?)href\s*=\s*(['"])(.*?)\2/gi,
            (_match, prefix, quote, url) => {
                const resolved = resolveUrl(url);
                return `${prefix}href=${quote}${resolved}${quote} data-proxy-href=${quote}${resolved}${quote}`;
            }
        );

        // Rewrite src on media/script/iframe elements
        result = result.replace(
            /(<(?:img|script|iframe|video|audio|source|embed)\s[^>]*?)src\s*=\s*(['"])(.*?)\2/gi,
            (_match, prefix, quote, url) => {
                const resolved = resolveUrl(url);
                return `${prefix}src=${quote}${resolved}${quote}`;
            }
        );

        // Rewrite href on <link> tags
        result = result.replace(
            /(<link\s[^>]*?)href\s*=\s*(['"])(.*?)\2/gi,
            (_match, prefix, quote, url) => {
                const resolved = resolveUrl(url);
                return `${prefix}href=${quote}${resolved}${quote}`;
            }
        );

        // Rewrite action on <form> tags
        result = result.replace(
            /(<form\s[^>]*?)action\s*=\s*(['"])(.*?)\2/gi,
            (_match, prefix, quote, url) => {
                const resolved = resolveUrl(url);
                return `${prefix}action=${quote}${resolved}${quote}`;
            }
        );

        // Rewrite url() in inline styles
        result = result.replace(
            /url\(\s*(['"]?)((?!data:)[^'")]+)\1\s*\)/gi,
            (_match, quote, url) => {
                const resolved = resolveUrl(url.trim());
                return `url(${quote}${resolved}${quote})`;
            }
        );

        // Inject base tag if not present
        if (!/<base\s/i.test(result)) {
            result = result.replace(
                /(<head[^>]*>)/i,
                `$1<base href="${baseUrl}">`
            );
        }

        return result;
    } catch {
        return html;
    }
}

/**
 * Extract the title from an HTML string.
 */
export function extractTitle(html: string): string | null {
    const match = html.match(/<title[^>]*>(.*?)<\/title>/is);
    return match ? match[1].trim() : null;
}
