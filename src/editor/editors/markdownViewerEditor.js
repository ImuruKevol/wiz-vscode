/**
 * Markdown Viewer Editor — .md 파일을 GitHub 스타일로 미리보기하는 Webview
 * 상단 헤더: 파일명 + 편집하기 버튼
 */

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const EditorBase = require('./editorBase');

class MarkdownViewerEditor extends EditorBase {
    /** @type {Map<string, MarkdownViewerEditor>} */
    static _instances = new Map();

    constructor(context, filePath) {
        super(context);
        this.filePath = filePath;
        this._fileWatcher = null;
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
        this.createPanel('wizMarkdownViewer', fileName, vscode.ViewColumn.Active);

        this._renderContent();

        // 파일 변경 감시 — 외부 편집 시 자동 새로고침
        const fileUri = vscode.Uri.file(this.filePath);
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
        const markdownViewerJs = fs.readFileSync(
            path.join(this.context.extensionPath, 'resources', 'editor', 'markdownViewer.js'), 'utf8'
        );

        const escapedMd = JSON.stringify(markdown);

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
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
    </style>
    <style id="mdViewerStyles"></style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <span class="icon">📄</span>
            <span class="filename" title="${fileName}">${fileName}</span>
        </div>
        <div class="header-right">
            <button class="btn btn-secondary" id="btnEdit" title="기본 에디터로 열기">✏️ 편집하기</button>
        </div>
    </div>
    <div class="content-wrapper" id="viewerRoot"></div>

    <script>
        ${markdownViewerJs}

        document.getElementById('mdViewerStyles').textContent = MarkdownViewer.getStyles();

        const vscode = acquireVsCodeApi();
        const viewer = new MarkdownViewer(document.getElementById('viewerRoot'));
        viewer.render(${escapedMd});

        document.getElementById('btnEdit').addEventListener('click', () => {
            vscode.postMessage({ command: 'openInEditor' });
        });
    </script>
</body>
</html>`;
    }
}

module.exports = MarkdownViewerEditor;
