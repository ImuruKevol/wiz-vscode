/**
 * Worked Review Editor — worked 폴더의 파일을 리뷰하는 Webview
 * 파일별 페이지네이션, ID/제목/본문은 읽기전용,
 * 하단 RichEditor로 리뷰 내용 작성
 */

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const EditorBase = require('./editorBase');

class WorkedReviewEditor extends EditorBase {
    static _instance = null;

    constructor(context, workedDirPath) {
        super(context);
        this.workedDirPath = workedDirPath;
        this._disposables = [];
        this._isSaving = false;
        this._refreshDebounceTimer = null;
    }

    static async openOrCreate(context, workedDirPath) {
        if (WorkedReviewEditor._instance && WorkedReviewEditor._instance.panel) {
            WorkedReviewEditor._instance.panel.reveal(vscode.ViewColumn.Active);
            return;
        }
        const editor = new WorkedReviewEditor(context, workedDirPath);
        WorkedReviewEditor._instance = editor;
        await editor.open();
    }

    onDispose() {
        WorkedReviewEditor._instance = null;
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
        if (this._refreshDebounceTimer) {
            clearTimeout(this._refreshDebounceTimer);
            this._refreshDebounceTimer = null;
        }
    }

    async open() {
        this.createPanel('wizWorkedReview', '리뷰 에디터', vscode.ViewColumn.Active);

        const files = this.loadWorkedFiles();
        this.panel.webview.html = this.generateHtml(files);

        this.panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'save':
                    await this.handleSave(message.fileName, message.content);
                    break;
                case 'confirmReview': {
                    // 확인 대화상자 표시
                    const answer = await vscode.window.showWarningMessage(
                        '리뷰 내용을 반영하시겠습니까?\n저장 후 Copilot Chat에서 리뷰 정리가 실행됩니다.',
                        { modal: true },
                        '반영'
                    );
                    if (answer !== '반영') return;
                    // Save first, then trigger review cleanup
                    await this.handleSave(message.fileName, message.content);
                    await this.handleReviewCleanup();
                    break;
                }
            }
        });

        // VS Code 이벤트 기반 파일 동기화 — 편집 중(미저장) 변경 및 저장 시 자동 갱신
        const debouncedRefresh = () => {
            if (this._isSaving) return;
            if (this._refreshDebounceTimer) clearTimeout(this._refreshDebounceTimer);
            this._refreshDebounceTimer = setTimeout(() => {
                const files = this.loadWorkedFiles();
                this.postMessage({ command: 'refreshFiles', files });
            }, 300);
        };
        this._disposables.push(
            vscode.workspace.onDidChangeTextDocument((e) => {
                if (this._isSaving) return;
                if (e.document.uri.scheme !== 'file') return;
                if (e.contentChanges.length === 0) return;
                const docDir = path.dirname(e.document.uri.fsPath);
                if (docDir !== this.workedDirPath || !e.document.uri.fsPath.endsWith('.md')) return;
                debouncedRefresh();
            }),
            vscode.workspace.onDidSaveTextDocument((doc) => {
                if (this._isSaving) return;
                const docDir = path.dirname(doc.uri.fsPath);
                if (docDir !== this.workedDirPath || !doc.uri.fsPath.endsWith('.md')) return;
                debouncedRefresh();
            }),
            vscode.workspace.onDidCreateFiles((e) => {
                const hasRelevant = e.files.some(uri => {
                    return path.dirname(uri.fsPath) === this.workedDirPath && uri.fsPath.endsWith('.md');
                });
                if (hasRelevant) debouncedRefresh();
            }),
            vscode.workspace.onDidDeleteFiles((e) => {
                const hasRelevant = e.files.some(uri => {
                    return path.dirname(uri.fsPath) === this.workedDirPath && uri.fsPath.endsWith('.md');
                });
                if (hasRelevant) debouncedRefresh();
            })
        );

        // 패널 가시성 변경 시 최신화 (탭 전환 복귀 시)
        this.panel.onDidChangeViewState(() => {
            if (this.panel && this.panel.visible && !this._isSaving) {
                const files = this.loadWorkedFiles();
                this.postMessage({ command: 'refreshFiles', files });
            }
        });
    }

    /**
     * worked 폴더의 .md 파일 목록과 내용을 로드
     */
    loadWorkedFiles() {
        const files = [];
        if (!fs.existsSync(this.workedDirPath)) return files;

        const entries = fs.readdirSync(this.workedDirPath)
            .filter(f => f.endsWith('.md'))
            .sort();

        for (const fileName of entries) {
            const filePath = path.join(this.workedDirPath, fileName);
            // VS Code에서 열린 문서가 있으면 버퍼 내용 우선 사용 (미저장 변경 포함)
            const openDoc = vscode.workspace.textDocuments.find(
                doc => doc.uri.fsPath === filePath
            );
            const content = openDoc ? openDoc.getText() : fs.readFileSync(filePath, 'utf8');
            files.push({ fileName, content });
        }
        return files;
    }

    async handleSave(fileName, content) {
        try {
            this._isSaving = true;
            const filePath = path.join(this.workedDirPath, fileName);
            fs.writeFileSync(filePath, content, 'utf8');
            this.postMessage({ command: 'saveComplete' });
            setTimeout(() => { this._isSaving = false; }, 500);
        } catch (e) {
            this._isSaving = false;
            vscode.window.showErrorMessage(`저장 실패: ${e.message}`);
        }
    }

    async handleReviewCleanup() {
        try {
            await vscode.commands.executeCommand('workbench.action.chat.open', {
                query: '리뷰 정리해줘',
                mode: 'agent'
            });
            this.dispose();
        } catch (e) {
            vscode.window.showWarningMessage(
                'Copilot Chat을 열 수 없습니다. GitHub Copilot Chat 확장이 설치되어 있는지 확인해주세요.',
                '확인'
            );
        }
    }

    generateHtml(files) {
        const filesJson = JSON.stringify(files)
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\$/g, '\\$');

        const richEditorJs = fs.readFileSync(
            path.join(this.context.extensionPath, 'resources', 'editor', 'richEditor.js'), 'utf8'
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
            padding: 10px 20px;
            border-bottom: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editorWidget-background);
            flex-shrink: 0;
        }
        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .header h1 {
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
            letter-spacing: -0.2px;
        }
        .header h1 .icon { font-size: 16px; }
        .header-actions {
            display: flex;
            gap: 6px;
            align-items: center;
        }

        /* ===== Page Info ===== */
        .page-info {
            padding: 8px 20px;
            border-bottom: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editor-background);
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .page-info-row {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .page-info-label {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            width: 28px;
            flex-shrink: 0;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .page-id-display {
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 12px;
            padding: 3px 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-descriptionForeground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-weight: 600;
            width: 180px;
            opacity: 0.7;
        }
        .page-title-display {
            font-size: 13px;
            font-weight: 600;
            flex: 1;
            padding: 3px 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-descriptionForeground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            opacity: 0.7;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* ===== Pagination ===== */
        .pagination {
            display: flex;
            align-items: center;
            gap: 1px;
            margin-left: auto;
        }
        .page-numbers {
            display: flex;
            align-items: center;
            gap: 1px;
        }
        .page-num {
            min-width: 22px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            background: transparent;
            color: #888;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            transition: background 0.15s;
            padding: 0 3px;
        }
        .page-num:hover { background: rgba(90,93,94,0.25); }
        .page-num.active { background: #555; color: #fff; font-weight: 600; }
        .page-ellipsis {
            min-width: 16px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            color: #666;
            cursor: default;
        }
        .nav-btn {
            width: 22px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            background: transparent;
            color: #888;
            border-radius: 3px;
            cursor: pointer;
            transition: background 0.15s;
        }
        .nav-btn:hover { background: rgba(90,93,94,0.25); }
        .nav-btn:disabled { opacity: 0.3; cursor: default; }
        .nav-btn:disabled:hover { background: transparent; }
        .nav-btn svg {
            width: 12px;
            height: 12px;
            fill: none;
            stroke: currentColor;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        /* ===== Buttons ===== */
        .btn {
            padding: 5px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            transition: all 0.15s ease;
            white-space: nowrap;
            letter-spacing: 0.1px;
        }
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .btn-primary:hover { background: var(--vscode-button-hoverBackground); }
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }

        /* ===== Content Area ===== */
        .content-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* Body (readonly) */
        .body-area {
            flex: 1;
            overflow-y: auto;
            padding: 12px 20px;
            font-size: 14px;
            line-height: 1.7;
            color: var(--vscode-editor-foreground);
            min-height: 80px;
        }
        .body-area h1 { font-size: 20px; font-weight: 700; margin: 12px 0 6px; }
        .body-area h2 { font-size: 16px; font-weight: 600; margin: 10px 0 4px; }
        .body-area h3 { font-size: 14px; font-weight: 600; margin: 8px 0 4px; }
        .body-area p { margin: 4px 0; }
        .body-area ul, .body-area ol { margin: 4px 0; padding-left: 24px; }
        .body-area li { margin: 2px 0; }
        .body-area code {
            background: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.2));
            padding: 2px 5px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 13px;
        }
        .body-area pre {
            background: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.2));
            padding: 10px;
            border-radius: 4px;
            margin: 8px 0;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 13px;
        }
        .body-area pre code { background: none; padding: 0; }
        .body-area strong { font-weight: 700; }
        .body-area em { font-style: italic; }
        .body-area hr { border: none; border-top: 1px solid var(--vscode-widget-border); margin: 10px 0; }

        /* Review separator */
        .review-separator {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 20px;
            background: var(--vscode-editorWidget-background);
            border-top: 1px solid var(--vscode-widget-border);
            border-bottom: 1px solid var(--vscode-widget-border);
            flex-shrink: 0;
        }
        .review-separator .label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-textLink-foreground);
        }

        /* Resize handle */
        .resize-handle {
            height: 4px;
            flex-shrink: 0;
            cursor: row-resize;
            background: transparent;
            transition: background 0.15s;
            position: relative;
        }
        .resize-handle::after {
            content: '';
            position: absolute;
            top: -2px;
            bottom: -2px;
            left: 0;
            right: 0;
        }
        .resize-handle:hover,
        .resize-handle.active {
            background: var(--vscode-focusBorder);
        }

        /* Review editor area */
        .review-area {
            flex-shrink: 0;
            height: 200px;
            display: flex;
            flex-direction: column;
            border-top: none;
        }

        /* Save indicator */
        .save-indicator {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .save-indicator.visible { opacity: 1; }
        .save-indicator.saved { color: var(--vscode-testing-iconPassed); }

        /* Empty state */
        .empty-state {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--vscode-descriptionForeground);
            gap: 12px;
            padding: 40px;
        }
        .empty-state .icon-large { font-size: 40px; opacity: 0.4; }
        .empty-state p { font-size: 13px; opacity: 0.8; }
    </style>
    <style id="richEditorStyles"></style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="header-left">
            <h1><span class="icon">📝</span> 리뷰 에디터</h1>
            <span class="save-indicator" id="saveIndicator"></span>
        </div>
        <div class="header-actions">
            <button class="btn btn-secondary" id="btnSave" title="저장">💾 저장</button>
            <button class="btn btn-primary" id="btnReview" title="리뷰 반영">🪄 리뷰 반영</button>
        </div>
    </div>

    <!-- Page Info -->
    <div class="page-info" id="pageInfo">
        <div class="page-info-row">
            <span class="page-info-label">ID</span>
            <div class="page-id-display" id="pageId"></div>
            <div class="pagination" id="pagination">
                <button class="nav-btn" id="btnPrev" title="이전"><svg viewBox="0 0 16 16"><polyline points="10 3 5 8 10 13"/></svg></button>
                <div class="page-numbers" id="pageNumbers"></div>
                <button class="nav-btn" id="btnNext" title="다음"><svg viewBox="0 0 16 16"><polyline points="6 3 11 8 6 13"/></svg></button>
            </div>
        </div>
        <div class="page-info-row">
            <span class="page-info-label">제목</span>
            <div class="page-title-display" id="pageTitle"></div>
        </div>
    </div>

    <!-- Content -->
    <div class="content-wrapper">
        <div class="body-area" id="bodyArea"></div>
        <div class="resize-handle" id="resizeHandle"></div>
        <div class="review-separator">
            <span class="label">✏️ Review</span>
        </div>
        <div class="review-area" id="reviewRoot"></div>
    </div>

    <script>
        ${richEditorJs}

        // Inject rich editor styles
        document.getElementById('richEditorStyles').textContent = RichEditor.getStyles();

        const vscode = acquireVsCodeApi();

        // ========== Data ==========
        const workedFiles = JSON.parse(\`${filesJson}\`);
        let currentPage = 0;

        // ========== Parse file content ==========
        function parseWorkedFile(content) {
            // Split by "# Review" line
            const reviewMarker = /^# Review$/m;
            const match = content.match(reviewMarker);
            let bodyPart = content;
            let reviewPart = '';

            if (match) {
                const idx = content.indexOf(match[0]);
                bodyPart = content.substring(0, idx).trimEnd();
                reviewPart = content.substring(idx + match[0].length).trim();
            }

            // Extract heading from body
            const headingMatch = bodyPart.match(/^# (.+)/m);
            let id = '';
            let title = '';
            let bodyContent = bodyPart;

            if (headingMatch) {
                const titleStr = headingMatch[1].trim();
                const idMatch = titleStr.match(/^(FN-\\d{8}-\\d{4}):\\s*(.*)/);
                if (idMatch) {
                    id = idMatch[1];
                    title = idMatch[2];
                } else {
                    title = titleStr;
                }
                // Body is everything after the first heading line
                bodyContent = bodyPart.substring(bodyPart.indexOf('\\n', bodyPart.indexOf(headingMatch[0])) + 1).trim();
            }

            return { id, title, bodyContent, reviewPart };
        }

        /** Simple markdown → HTML for read-only body display */
        function bodyMarkdownToHtml(md) {
            if (!md) return '';
            return RichEditor.markdownToHtml(md);
        }

        // ========== Rich Editor for Review ==========
        const reviewEditor = new RichEditor(document.getElementById('reviewRoot'), {
            placeholder: '리뷰 내용을 작성하세요...',
            showImage: true,
            onInput: () => {}
        });

        // ========== Resize Handle ==========
        const resizeHandle = document.getElementById('resizeHandle');
        const bodyArea = document.getElementById('bodyArea');
        const reviewRoot = document.getElementById('reviewRoot');
        let isResizing = false;
        let startY = 0;
        let startBodyH = 0;
        let startReviewH = 0;

        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isResizing = true;
            startY = e.clientY;
            startBodyH = bodyArea.offsetHeight;
            startReviewH = reviewRoot.offsetHeight;
            resizeHandle.classList.add('active');
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const delta = e.clientY - startY;
            const newBodyH = Math.max(60, startBodyH + delta);
            const newReviewH = Math.max(60, startReviewH - delta);
            bodyArea.style.flex = 'none';
            bodyArea.style.height = newBodyH + 'px';
            reviewRoot.style.height = newReviewH + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (!isResizing) return;
            isResizing = false;
            resizeHandle.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        });

        // ========== DOM ==========
        const pageIdEl = document.getElementById('pageId');
        const pageTitleEl = document.getElementById('pageTitle');
        const pageNumbers = document.getElementById('pageNumbers');
        const btnPrev = document.getElementById('btnPrev');
        const btnNext = document.getElementById('btnNext');
        const saveIndicator = document.getElementById('saveIndicator');

        // ========== Reconstruct file content ==========
        function buildFileContent(fileData, reviewMarkdown) {
            // Get original content up to (but not including) "# Review"
            const content = fileData.content;
            const reviewMarker = /^# Review$/m;
            const match = content.match(reviewMarker);
            let basePart = content;
            if (match) {
                basePart = content.substring(0, content.indexOf(match[0])).trimEnd();
            }

            // Only append review section if there's actual review content
            if (reviewMarkdown && reviewMarkdown.trim()) {
                return basePart + '\\n\\n# Review\\n' + reviewMarkdown.trim() + '\\n';
            }
            return basePart + '\\n';
        }

        // ========== Current parsed data cache ==========
        let currentParsed = null;

        // ========== Render ==========
        function render() {
            if (workedFiles.length === 0) {
                pageIdEl.textContent = '';
                pageTitleEl.textContent = 'worked 파일이 없습니다';
                bodyArea.innerHTML = '<div class="empty-state"><div class="icon-large">📭</div><p>완료된 작업이 없습니다.</p></div>';
                reviewEditor.setHtml('');
                reviewEditor.setEditable(false);
                pageNumbers.innerHTML = '';
                btnPrev.disabled = true;
                btnNext.disabled = true;
                return;
            }

            if (currentPage >= workedFiles.length) currentPage = workedFiles.length - 1;
            if (currentPage < 0) currentPage = 0;

            const file = workedFiles[currentPage];
            currentParsed = parseWorkedFile(file.content);

            pageIdEl.textContent = currentParsed.id || '(ID 없음)';
            pageTitleEl.textContent = currentParsed.title || '(제목 없음)';

            // Body (read-only rendered markdown)
            bodyArea.innerHTML = bodyMarkdownToHtml(currentParsed.bodyContent);

            // Review (editable RichEditor)
            if (currentParsed.reviewPart) {
                reviewEditor.setHtml(RichEditor.markdownToHtml(currentParsed.reviewPart));
            } else {
                reviewEditor.setHtml('');
            }
            reviewEditor.setEditable(true);

            renderPagination();
            btnPrev.disabled = currentPage <= 0;
            btnNext.disabled = currentPage >= workedFiles.length - 1;
        }

        function syncReviewBack() {
            if (workedFiles.length === 0 || !workedFiles[currentPage]) return;
            const reviewMd = RichEditor.htmlToMarkdown(reviewEditor.editor);
            const file = workedFiles[currentPage];
            file.content = buildFileContent(file, reviewMd);
        }

        // ========== Pagination ==========
        function renderPagination() {
            pageNumbers.innerHTML = '';
            const total = workedFiles.length;
            if (total <= 1) return;

            const maxVisible = 5;
            let start, end;

            if (total <= maxVisible) {
                start = 0;
                end = total - 1;
            } else {
                const half = Math.floor(maxVisible / 2);
                start = Math.max(0, currentPage - half);
                end = start + maxVisible - 1;
                if (end >= total) {
                    end = total - 1;
                    start = end - maxVisible + 1;
                }
            }

            if (start > 0) {
                appendPageBtn(0);
                if (start > 1) appendEllipsis();
            }
            for (let i = start; i <= end; i++) {
                appendPageBtn(i);
            }
            if (end < total - 1) {
                if (end < total - 2) appendEllipsis();
                appendPageBtn(total - 1);
            }
        }

        function appendPageBtn(idx) {
            const btn = document.createElement('button');
            btn.className = 'page-num' + (idx === currentPage ? ' active' : '');
            btn.textContent = idx + 1;
            const parsed = parseWorkedFile(workedFiles[idx].content);
            btn.title = parsed.id || workedFiles[idx].fileName;
            btn.addEventListener('click', () => {
                syncReviewBack();
                currentPage = idx;
                render();
                saveViewState();
            });
            pageNumbers.appendChild(btn);
        }

        function appendEllipsis() {
            const span = document.createElement('span');
            span.className = 'page-ellipsis';
            span.textContent = '\\u2026';
            pageNumbers.appendChild(span);
        }

        // ========== Navigation ==========
        btnPrev.addEventListener('click', () => {
            if (currentPage > 0) {
                syncReviewBack();
                currentPage--;
                render();
                saveViewState();
            }
        });
        btnNext.addEventListener('click', () => {
            if (currentPage < workedFiles.length - 1) {
                syncReviewBack();
                currentPage++;
                render();
                saveViewState();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.closest('.rich-editor-content')) return;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                if (currentPage > 0) { syncReviewBack(); currentPage--; render(); saveViewState(); }
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                if (currentPage < workedFiles.length - 1) { syncReviewBack(); currentPage++; render(); saveViewState(); }
            }
        });

        // ========== Save ==========
        document.getElementById('btnSave').addEventListener('click', () => {
            if (workedFiles.length === 0) return;
            syncReviewBack();
            const file = workedFiles[currentPage];
            vscode.postMessage({ command: 'save', fileName: file.fileName, content: file.content });
        });

        // ========== Review Cleanup ==========
        document.getElementById('btnReview').addEventListener('click', () => {
            if (workedFiles.length === 0) return;
            syncReviewBack();
            const file = workedFiles[currentPage];
            vscode.postMessage({ command: 'confirmReview', fileName: file.fileName, content: file.content });
        });

        // ========== Ctrl+S ==========
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (workedFiles.length === 0) return;
                syncReviewBack();
                const file = workedFiles[currentPage];
                vscode.postMessage({ command: 'save', fileName: file.fileName, content: file.content });
            }
        });

        // ========== Messages from extension ==========
        window.addEventListener('message', (e) => {
            const msg = e.data;
            if (msg.command === 'saveComplete') {
                saveIndicator.textContent = '✓ 저장됨';
                saveIndicator.className = 'save-indicator visible saved';
                setTimeout(() => {
                    saveIndicator.className = 'save-indicator';
                }, 2000);
            }
            if (msg.command === 'refreshFiles') {
                // 외부 변경 시 파일 목록 갱신 — save 트리거하지 않음
                syncReviewBack();
                const prevFileName = workedFiles.length > 0 && workedFiles[currentPage]
                    ? workedFiles[currentPage].fileName : null;
                workedFiles.length = 0;
                msg.files.forEach(f => workedFiles.push(f));
                // 이전 페이지 위치 보존 시도
                if (prevFileName) {
                    const idx = workedFiles.findIndex(f => f.fileName === prevFileName);
                    if (idx >= 0) currentPage = idx;
                }
                if (currentPage >= workedFiles.length) currentPage = Math.max(0, workedFiles.length - 1);
                render();
                saveViewState();
            }
        });

        // ========== State persistence ==========
        function saveViewState() {
            vscode.setState({ currentPage });
        }

        // ========== Init ==========
        const prevState = vscode.getState();
        if (prevState) {
            currentPage = prevState.currentPage || 0;
        }
        render();
    </script>
</body>
</html>`;
    }
}

module.exports = WorkedReviewEditor;
