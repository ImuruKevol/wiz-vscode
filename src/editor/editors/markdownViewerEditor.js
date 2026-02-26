/**
 * Markdown Viewer Editor — .md 파일을 GitHub 스타일로 미리보기하는 Webview
 * remarkable + highlight.js 기반
 * 상단 헤더: 파일명 + 편집하기 버튼
 */

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const EditorBase = require('./editorBase');
const { Remarkable } = require('remarkable');
const hljs = require('highlight.js');

class MarkdownViewerEditor extends EditorBase {
    /** @type {Map<string, MarkdownViewerEditor>} */
    static _instances = new Map();

    constructor(context, filePath) {
        super(context);
        this.filePath = filePath;
        this._fileWatcher = null;
        this._md = new Remarkable({
            html: true,
            linkify: true,
            typographer: false,
            highlight: (str, lang) => {
                if (lang && hljs.getLanguage(lang)) {
                    try { return hljs.highlight(str, { language: lang }).value; } catch (_) { /* ignore */ }
                }
                try { return hljs.highlightAuto(str).value; } catch (_) { /* ignore */ }
                return '';
            }
        });
    }

    /**
     * 파일 경로 기반 싱글톤 — 같은 파일이면 기존 패널 reveal
     */
    static async openOrCreate(context, filePath) {
        const existing = MarkdownViewerEditor._instances.get(filePath);
        if (existing && existing.panel) {
            existing.panel.reveal(vscode.ViewColumn.Active);
            return;
        }
        const editor = new MarkdownViewerEditor(context, filePath);
        MarkdownViewerEditor._instances.set(filePath, editor);
        await editor.open();
    }

    onDispose() {
        MarkdownViewerEditor._instances.delete(this.filePath);
        if (this._fileWatcher) {
            this._fileWatcher.dispose();
            this._fileWatcher = null;
        }
    }

    async open() {
        const fileName = path.basename(this.filePath);

        // createPanel with localResourceRoots for external script loading (html2pdf.js)
        this.dispose();
        const nodeModulesUri = vscode.Uri.file(path.join(this.context.extensionPath, 'node_modules'));
        this.panel = vscode.window.createWebviewPanel(
            'wizMarkdownViewer', fileName, vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [nodeModulesUri]
            }
        );
        this.panel.onDidDispose(() => {
            this.panel = undefined;
            this.onDispose();
        });

        this._renderContent();

        // 파일 변경 감시 — 외부 편집 시 자동 새로고침
        this._fileWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(path.dirname(this.filePath), path.basename(this.filePath))
        );
        this._fileWatcher.onDidChange(() => this._renderContent());

        this.panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'openInEditor': {
                    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(this.filePath));
                    await vscode.window.showTextDocument(doc, vscode.ViewColumn.Active);
                    break;
                }
                case 'downloadPdf': {
                    try {
                        const pdfName = path.basename(this.filePath, '.md') + '.pdf';
                        const uri = await vscode.window.showSaveDialog({
                            defaultUri: vscode.Uri.file(path.join(path.dirname(this.filePath), pdfName)),
                            filters: { 'PDF': ['pdf'] }
                        });
                        if (uri) {
                            const buffer = Buffer.from(message.data, 'base64');
                            fs.writeFileSync(uri.fsPath, buffer);
                            vscode.window.showInformationMessage('PDF 파일이 저장되었습니다.');
                        }
                    } catch (e) {
                        vscode.window.showErrorMessage(`PDF 저장 실패: ${e.message}`);
                    }
                    break;
                }
                case 'pdfError': {
                    vscode.window.showErrorMessage(`PDF 변환 실패: ${message.error}`);
                    break;
                }
            }
        });
    }

    _renderContent() {
        if (!this.panel) return;
        let markdown = '';
        try {
            markdown = fs.readFileSync(this.filePath, 'utf8');
        } catch (e) {
            markdown = `> 파일을 읽을 수 없습니다: ${e.message}`;
        }
        this.panel.webview.html = this._generateHtml(markdown);
    }

    _generateHtml(markdown) {
        const fileName = path.basename(this.filePath);

        // Render markdown → HTML in Node.js (highlight.js applied via callback)
        const renderedHtml = this._md.render(markdown);

        // Load highlight.js theme CSS (github-dark)
        const hljsCssPath = path.join(this.context.extensionPath, 'node_modules', 'highlight.js', 'styles', 'github.css');
        let hljsCss = '';
        try { hljsCss = fs.readFileSync(hljsCssPath, 'utf8'); } catch (_) { /* ignore */ }

        // Get webview URI for html2pdf.js (external script to avoid template literal issues)
        const html2pdfUri = this.panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'node_modules', 'html2pdf.js', 'dist', 'html2pdf.bundle.min.js'))
        );

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* ===== Header ===== */
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 20px;
            border-bottom: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editorWidget-background);
            flex-shrink: 0;
        }
        .header-left {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
        }
        .header-left .icon {
            font-size: 15px;
            flex-shrink: 0;
        }
        .header-left .filename {
            font-size: 13px;
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .header-right {
            display: flex;
            gap: 6px;
            flex-shrink: 0;
        }

        .btn {
            padding: 4px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            transition: all 0.15s ease;
            white-space: nowrap;
            letter-spacing: 0.1px;
        }
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        /* ===== Content ===== */
        .content-wrapper {
            flex: 1;
            overflow-y: auto;
            padding: 24px 32px;
        }

        /* ===== Markdown Styles ===== */
        .markdown-body {
            font-size: 14px;
            line-height: 1.6;
            word-wrap: break-word;
        }
        .markdown-body h1, .markdown-body h2, .markdown-body h3,
        .markdown-body h4, .markdown-body h5, .markdown-body h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
        }
        .markdown-body h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid var(--vscode-widget-border); }
        .markdown-body h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid var(--vscode-widget-border); }
        .markdown-body h3 { font-size: 1.25em; }
        .markdown-body p { margin-top: 0; margin-bottom: 16px; }
        .markdown-body ul, .markdown-body ol { padding-left: 2em; margin-bottom: 16px; }
        .markdown-body li + li { margin-top: 0.25em; }
        .markdown-body blockquote {
            margin: 0 0 16px 0;
            padding: 0 1em;
            color: var(--vscode-descriptionForeground);
            border-left: 0.25em solid var(--vscode-widget-border);
        }
        .markdown-body a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }
        .markdown-body a:hover {
            text-decoration: underline;
        }
        .markdown-body code {
            padding: 0.2em 0.4em;
            margin: 0;
            font-size: 85%;
            background-color: var(--vscode-textCodeBlock-background, rgba(110,118,129,0.15));
            border-radius: 6px;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
        }
        .markdown-body pre {
            padding: 16px;
            overflow: auto;
            font-size: 85%;
            line-height: 1.45;
            background-color: var(--vscode-textCodeBlock-background, rgba(110,118,129,0.15));
            border-radius: 6px;
            margin-bottom: 16px;
        }
        .markdown-body pre code {
            padding: 0;
            margin: 0;
            font-size: 100%;
            background-color: transparent;
            border-radius: 0;
        }
        .markdown-body table {
            border-spacing: 0;
            border-collapse: collapse;
            margin-bottom: 16px;
            width: auto;
        }
        .markdown-body table th, .markdown-body table td {
            padding: 6px 13px;
            border: 1px solid var(--vscode-widget-border);
        }
        .markdown-body table th {
            font-weight: 600;
            background-color: var(--vscode-editorWidget-background);
        }
        .markdown-body hr {
            height: 0.25em;
            padding: 0;
            margin: 24px 0;
            background-color: var(--vscode-widget-border);
            border: 0;
        }
        .markdown-body img {
            max-width: 100%;
        }
        .markdown-body strong { font-weight: 600; }
    </style>
    <style>${hljsCss}</style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <span class="icon">📄</span>
            <span class="filename" title="${fileName}">${fileName}</span>
        </div>
        <div class="header-right">
            <button class="btn btn-secondary" id="btnPdf" title="PDF로 다운로드">📥 PDF</button>
            <button class="btn btn-secondary" id="btnEdit" title="기본 에디터로 열기">✏️ 편집하기</button>
        </div>
    </div>
    <div class="content-wrapper">
        <article class="markdown-body" id="content">${renderedHtml}</article>
    </div>

    <script src="${html2pdfUri}"></script>
    <script>
        const vscode = acquireVsCodeApi();
        document.getElementById('btnEdit').addEventListener('click', () => {
            vscode.postMessage({ command: 'openInEditor' });
        });

        document.getElementById('btnPdf').addEventListener('click', () => {
            const btn = document.getElementById('btnPdf');
            btn.disabled = true;
            btn.textContent = '⏳ 변환 중...';

            const element = document.getElementById('content');
            const opt = {
                margin: 10,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().from(element).set(opt).outputPdf('arraybuffer').then(function(pdfBuffer) {
                // base64 인코딩으로 안전한 postMessage 전달
                const bytes = new Uint8Array(pdfBuffer);
                let binary = '';
                const chunkSize = 8192;
                for (let i = 0; i < bytes.length; i += chunkSize) {
                    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
                }
                vscode.postMessage({
                    command: 'downloadPdf',
                    data: btoa(binary)
                });
                btn.disabled = false;
                btn.textContent = '📥 PDF';
            }).catch(function(err) {
                btn.disabled = false;
                btn.textContent = '📥 PDF';
                vscode.postMessage({ command: 'pdfError', error: err.message || String(err) });
            });
        });
    </script>
</body>
</html>`;
    }
}

module.exports = MarkdownViewerEditor;
