/**
 * Markdown Viewer Component — 재사용 가능한 GitHub 스타일 마크다운 렌더러
 *
 * 사용법:
 *   const viewer = new MarkdownViewer(document.getElementById('container'));
 *   viewer.render(markdownText);
 *
 * Static:
 *   MarkdownViewer.getStyles()   — CSS 문자열 반환
 *   MarkdownViewer.toHtml(md)    — 마크다운 → HTML 변환
 */
class MarkdownViewer {
    constructor(container) {
        this.container = container;
        this._build();
    }

    _build() {
        this.container.innerHTML = '';
        this.container.classList.add('md-viewer-root');

        this.content = document.createElement('div');
        this.content.className = 'md-viewer-content markdown-body';
        this.container.appendChild(this.content);
    }

    render(md) {
        this.content.innerHTML = MarkdownViewer.toHtml(md || '');
    }

    /* ===== Static: Markdown → HTML ===== */
    static toHtml(md) {
        if (!md) return '';
        let html = md;

        // Code blocks (fenced) — must be first
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
            const escaped = MarkdownViewer._esc(code.trimEnd());
            const cls = lang ? ` class="language-${lang}"` : '';
            return `<pre><code${cls}>${escaped}</code></pre>`;
        });

        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Images (before links)
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />');

        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

        // Bold / italic / strikethrough
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

        // Horizontal rules
        html = html.replace(/^(---|___|\*\*\*)$/gm, '<hr>');

        // Headings (h1–h6)
        html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
        html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
        html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

        // Blockquotes (collapse consecutive)
        html = html.replace(/^>\s?(.*)$/gm, '<blockquote>$1</blockquote>');
        html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

        // Task lists
        html = html.replace(/^(\s*)[-*]\s+\[x\]\s+(.+)$/gm, (_, indent, text) => {
            const level = Math.floor(indent.length / 2);
            return `<li data-level="${level}" class="task-item checked"><input type="checkbox" checked disabled> ${text}</li>`;
        });
        html = html.replace(/^(\s*)[-*]\s+\[ \]\s+(.+)$/gm, (_, indent, text) => {
            const level = Math.floor(indent.length / 2);
            return `<li data-level="${level}" class="task-item"><input type="checkbox" disabled> ${text}</li>`;
        });

        // Unordered lists
        html = html.replace(/^(\s*)[-*]\s+(.+)$/gm, (_, indent, text) => {
            const level = Math.floor(indent.length / 2);
            return `<li data-level="${level}">${text}</li>`;
        });

        // Ordered lists
        html = html.replace(/^(\s*)\d+\.\s+(.+)$/gm, (_, indent, text) => {
            const level = Math.floor(indent.length / 2);
            return `<oli data-level="${level}">${text}</oli>`;
        });

        // Wrap consecutive <li> / <oli> in <ul> / <ol>
        html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
        html = html.replace(/((?:<oli[^>]*>.*<\/oli>\n?)+)/g, (m) => {
            return '<ol>' + m.replace(/<\/?oli/g, (t) => t.replace('oli', 'li')) + '</ol>';
        });

        // Tables (basic GFM)
        html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/gm, (_, header, sep, body) => {
            const ths = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
            const alignments = sep.split('|').filter(c => c.trim()).map(c => {
                const t = c.trim();
                if (t.startsWith(':') && t.endsWith(':')) return 'center';
                if (t.endsWith(':')) return 'right';
                return 'left';
            });
            const rows = body.trim().split('\n').map(row => {
                const tds = row.split('|').filter(c => c.trim()).map((c, i) => {
                    const align = alignments[i] || 'left';
                    return `<td style="text-align:${align}">${c.trim()}</td>`;
                }).join('');
                return `<tr>${tds}</tr>`;
            }).join('');
            return `<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
        });

        // Wrap remaining plain lines in <p>
        const lines = html.split('\n');
        html = lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('<')) return line;
            return '<p>' + line + '</p>';
        }).join('\n');
        html = html.replace(/<p><\/p>/g, '');

        return html;
    }

    static _esc(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /* ===== Static: GitHub-style CSS ===== */
    static getStyles() {
        return `
        /* ===== Markdown Viewer Component ===== */
        .md-viewer-root {
            display: flex;
            flex-direction: column;
            flex: 1;
            overflow: hidden;
        }
        .md-viewer-content {
            flex: 1;
            overflow-y: auto;
            padding: 24px 32px;
        }

        /* ===== GitHub-flavored Markdown ===== */
        .markdown-body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
            font-size: 14px;
            line-height: 1.6;
            word-wrap: break-word;
            color: var(--vscode-editor-foreground);
        }

        .markdown-body h1,
        .markdown-body h2,
        .markdown-body h3,
        .markdown-body h4,
        .markdown-body h5,
        .markdown-body h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
        }
        .markdown-body h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid var(--vscode-widget-border); }
        .markdown-body h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid var(--vscode-widget-border); }
        .markdown-body h3 { font-size: 1.25em; }
        .markdown-body h4 { font-size: 1em; }
        .markdown-body h5 { font-size: 0.875em; }
        .markdown-body h6 { font-size: 0.85em; color: var(--vscode-descriptionForeground); }

        .markdown-body p {
            margin-top: 0;
            margin-bottom: 16px;
        }

        .markdown-body a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }
        .markdown-body a:hover {
            text-decoration: underline;
        }

        .markdown-body strong { font-weight: 600; }
        .markdown-body em { font-style: italic; }
        .markdown-body del { text-decoration: line-through; color: var(--vscode-descriptionForeground); }

        .markdown-body code {
            padding: 0.2em 0.4em;
            margin: 0;
            font-size: 85%;
            background-color: var(--vscode-textCodeBlock-background, rgba(110,118,129,0.15));
            border-radius: 6px;
            font-family: var(--vscode-editor-font-family, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace);
        }

        .markdown-body pre {
            padding: 16px;
            overflow: auto;
            font-size: 85%;
            line-height: 1.45;
            background-color: var(--vscode-textCodeBlock-background, rgba(110,118,129,0.15));
            border-radius: 6px;
            margin-top: 0;
            margin-bottom: 16px;
        }
        .markdown-body pre code {
            background: transparent;
            padding: 0;
            margin: 0;
            font-size: 100%;
            border-radius: 0;
        }

        .markdown-body blockquote {
            padding: 0 1em;
            color: var(--vscode-descriptionForeground);
            border-left: 0.25em solid var(--vscode-widget-border);
            margin: 0 0 16px 0;
        }

        .markdown-body hr {
            height: 0.25em;
            padding: 0;
            margin: 24px 0;
            background-color: var(--vscode-widget-border);
            border: 0;
            border-radius: 2px;
        }

        .markdown-body ul,
        .markdown-body ol {
            padding-left: 2em;
            margin-top: 0;
            margin-bottom: 16px;
        }
        .markdown-body li {
            margin-top: 0.25em;
        }
        .markdown-body li + li {
            margin-top: 0.25em;
        }

        .markdown-body li.task-item {
            list-style: none;
            margin-left: -1.5em;
        }
        .markdown-body li.task-item input[type="checkbox"] {
            margin-right: 0.5em;
            vertical-align: middle;
        }

        .markdown-body table {
            border-spacing: 0;
            border-collapse: collapse;
            margin-top: 0;
            margin-bottom: 16px;
            width: auto;
            overflow: auto;
        }
        .markdown-body table th,
        .markdown-body table td {
            padding: 6px 13px;
            border: 1px solid var(--vscode-widget-border);
        }
        .markdown-body table th {
            font-weight: 600;
            background: var(--vscode-editorWidget-background);
        }
        .markdown-body table tr:nth-child(2n) {
            background: var(--vscode-editor-background);
        }

        .markdown-body img {
            max-width: 100%;
            border-radius: 4px;
        }
        `;
    }
}
