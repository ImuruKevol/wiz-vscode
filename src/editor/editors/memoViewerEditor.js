/**
 * Memo Viewer Editor — memo.md 파일을 리치 UI로 보여주는 Webview
 * # 헤딩 기준으로 페이지를 구분하여 페이지네이션으로 탐색
 * RichEditor 컴포넌트를 재사용하여 편집 기능 제공
 * 추가 / 삭제 / 저장 / TODO 반영 기능 제공
 */

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const EditorBase = require('./editorBase');

class MemoViewerEditor extends EditorBase {
    static _instance = null;

    constructor(context, memoFilePath) {
        super(context);
        this.memoFilePath = memoFilePath;
        this._disposables = [];
        this._isSaving = false;
        this._refreshDebounceTimer = null;
    }

    static async openOrCreate(context, memoFilePath) {
        if (MemoViewerEditor._instance && MemoViewerEditor._instance.panel) {
            MemoViewerEditor._instance.panel.reveal(vscode.ViewColumn.Active);
            return;
        }
        const editor = new MemoViewerEditor(context, memoFilePath);
        MemoViewerEditor._instance = editor;
        await editor.open();
    }

    onDispose() {
        MemoViewerEditor._instance = null;
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
        if (this._refreshDebounceTimer) {
            clearTimeout(this._refreshDebounceTimer);
            this._refreshDebounceTimer = null;
        }
    }

    async open() {
        this.createPanel('wizMemoViewer', '메모', vscode.ViewColumn.Active);

        const content = this.loadMemoContent();
        this.panel.webview.html = this.generateHtml(content);

        this.panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'save':
                    await this.handleSave(message.markdown);
                    break;
                case 'confirmDelete': {
                    const answer = await vscode.window.showWarningMessage(
                        `"${message.label}" 항목을 삭제하시겠습니까?`,
                        { modal: true }, '삭제'
                    );
                    this.postMessage({ command: 'deleteConfirmed', confirmed: answer === '삭제' });
                    break;
                }
                case 'confirmApplyToTodo': {
                    const answer = await vscode.window.showWarningMessage(
                        '현재 메모를 TODO에 반영하시겠습니까?\n메모 항목에 ID가 부여되어 todo.md에 추가됩니다.',
                        { modal: true }, '반영'
                    );
                    if (answer === '반영') {
                        await this.handleApplyToTodo(message.markdown);
                    }
                    break;
                }
                case 'close':
                    this.dispose();
                    break;
            }
        });

        // VS Code 이벤트 기반 파일 동기화 — 편집 중(미저장) 변경 및 저장 시 자동 갱신
        this._disposables.push(
            vscode.workspace.onDidChangeTextDocument((e) => {
                if (this._isSaving) return;
                if (e.document.uri.scheme !== 'file') return;
                if (e.document.uri.fsPath !== this.memoFilePath) return;
                if (e.contentChanges.length === 0) return;
                if (this._refreshDebounceTimer) clearTimeout(this._refreshDebounceTimer);
                this._refreshDebounceTimer = setTimeout(() => {
                    this.postMessage({ command: 'refreshContent', content: e.document.getText() });
                }, 300);
            }),
            vscode.workspace.onDidSaveTextDocument((doc) => {
                if (this._isSaving) return;
                if (doc.uri.fsPath !== this.memoFilePath) return;
                const content = this.loadMemoContent();
                this.postMessage({ command: 'refreshContent', content });
            })
        );

        // 패널 가시성 변경 시 최신화 (탭 전환 복귀 시)
        this.panel.onDidChangeViewState(() => {
            if (this.panel && this.panel.visible && !this._isSaving) {
                const content = this.loadMemoContent();
                this.postMessage({ command: 'refreshContent', content });
            }
        });
    }

    loadMemoContent() {
        try {
            // VS Code에서 열린 문서가 있으면 버퍼 내용 우선 사용 (미저장 변경 포함)
            const openDoc = vscode.workspace.textDocuments.find(
                doc => doc.uri.fsPath === this.memoFilePath
            );
            if (openDoc) return openDoc.getText();
            if (fs.existsSync(this.memoFilePath)) {
                return fs.readFileSync(this.memoFilePath, 'utf8');
            }
        } catch (e) { /* ignore */ }
        return '';
    }

    async handleSave(markdown) {
        try {
            this._isSaving = true;
            const dir = path.dirname(this.memoFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.memoFilePath, markdown, 'utf8');
            this.postMessage({ command: 'saveComplete' });
            vscode.window.showInformationMessage('memo.md 저장 완료');
            setTimeout(() => { this._isSaving = false; }, 500);
        } catch (e) {
            this._isSaving = false;
            vscode.window.showErrorMessage(`저장 실패: ${e.message}`);
        }
    }

    /**
     * 메모 항목들을 todo.md에 반영 (ID 부여)
     * @param {string} markdown - 웹뷰에서 전달받은 최신 메모 마크다운
     */
    async handleApplyToTodo(markdown) {
        try {
            const taskDir = path.dirname(this.memoFilePath);
            const todoPath = path.join(taskDir, 'todo.md');
            const context = this.context;

            // 현재 todo.md 읽기
            let todoContent = '';
            if (fs.existsSync(todoPath)) {
                todoContent = fs.readFileSync(todoPath, 'utf8');
            }

            // 전달받은 마크다운에서 메모 파싱 (파일 I/O 대신 직접 사용)
            const memoPages = this.parseMemoPages(markdown || '');

            if (memoPages.length === 0) {
                vscode.window.showInformationMessage('반영할 메모가 없습니다.');
                return;
            }

            // 기존 TODO에서 최대 ID 찾기
            const today = new Date();
            const dateStr = today.getFullYear().toString() +
                String(today.getMonth() + 1).padStart(2, '0') +
                String(today.getDate()).padStart(2, '0');

            let maxSeq = 0;
            const idPattern = /^#\s+FN-(\d{8})-(\d{4}):/gm;
            let match;
            while ((match = idPattern.exec(todoContent)) !== null) {
                if (match[1] === dateStr) {
                    const seq = parseInt(match[2], 10);
                    if (seq > maxSeq) maxSeq = seq;
                }
            }

            // worked 폴더도 확인하여 최대 ID 결정
            const workedPath = path.join(taskDir, 'worked');
            if (fs.existsSync(workedPath)) {
                const workedFiles = fs.readdirSync(workedPath);
                for (const f of workedFiles) {
                    const m = f.match(/^FN-(\d{8})-(\d{4})/);
                    if (m && m[1] === dateStr) {
                        const seq = parseInt(m[2], 10);
                        if (seq > maxSeq) maxSeq = seq;
                    }
                }
            }

            // reviewed 폴더도 확인
            const reviewedPath = path.join(taskDir, 'reviewed');
            if (fs.existsSync(reviewedPath)) {
                const reviewedFiles = fs.readdirSync(reviewedPath);
                for (const f of reviewedFiles) {
                    const m = f.match(/^FN-(\d{8})-(\d{4})/);
                    if (m && m[1] === dateStr) {
                        const seq = parseInt(m[2], 10);
                        if (seq > maxSeq) maxSeq = seq;
                    }
                }
            }

            // 메모 → TODO 변환 (ID 부여)
            let seq = maxSeq + 1;
            const newTodoEntries = memoPages.map(page => {
                const id = `FN-${dateStr}-${String(seq++).padStart(4, '0')}`;
                const heading = `# ${id}: ${page.title}`;
                const body = page.body.join('\n');
                return heading + '\n' + body;
            });

            // todo.md에 추가
            const newEntries = newTodoEntries.join('\n\n');
            const updatedTodo = todoContent.trim()
                ? todoContent.trim() + '\n\n' + newEntries
                : newEntries;

            fs.writeFileSync(todoPath, updatedTodo.trim() + '\n', 'utf8');

            // memo.md 비우기 — 딜레이를 두어 파일 저장 경합 방지
            await new Promise(resolve => setTimeout(resolve, 150));
            fs.writeFileSync(this.memoFilePath, '', 'utf8');

            // 비우기 확인 및 재시도
            await new Promise(resolve => setTimeout(resolve, 100));
            const verifyContent = fs.readFileSync(this.memoFilePath, 'utf8');
            if (verifyContent.trim() !== '') {
                fs.writeFileSync(this.memoFilePath, '', 'utf8');
            }

            const count = memoPages.length;
            vscode.window.showInformationMessage(`${count}개 메모가 TODO에 반영되었습니다.`);

            // 메모 뷰어 닫기
            await new Promise(resolve => setTimeout(resolve, 100));
            this.dispose();

            // TODO 뷰어 열기
            await new Promise(resolve => setTimeout(resolve, 300));
            const TodoViewerEditor = require('./todoViewerEditor');
            await TodoViewerEditor.openOrCreate(context, todoPath);

        } catch (e) {
            vscode.window.showErrorMessage(`TODO 반영 실패: ${e.message}`);
        }
    }

    /**
     * memo.md 파싱: # 제목 형식 (ID 없음)
     */
    parseMemoPages(content) {
        const lines = content.split('\n');
        const result = [];
        let current = null;

        for (const line of lines) {
            const headingMatch = line.match(/^#\s+(.+)/);
            if (headingMatch) {
                if (current) result.push(current);
                current = {
                    title: headingMatch[1].trim(),
                    body: []
                };
            } else {
                if (current) {
                    current.body.push(line);
                }
            }
        }
        if (current) result.push(current);
        return result;
    }

    generateHtml(initialContent) {
        const escapedContent = initialContent
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
        .page-title-input {
            font-size: 13px;
            font-weight: 600;
            flex: 1;
            padding: 3px 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            outline: none;
            min-width: 0;
            transition: border-color 0.15s;
        }
        .page-title-input:focus {
            border-color: var(--vscode-focusBorder);
        }

        /* ===== Pagination (inline with title row) ===== */
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
        .page-num:hover {
            background: rgba(90,93,94,0.25);
        }
        .page-num.active {
            background: #555;
            color: #fff;
            font-weight: 600;
        }
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
        .btn-danger {
            background: transparent;
            color: var(--vscode-errorForeground, #f48771);
            border: 1px solid var(--vscode-errorForeground, #f48771);
        }
        .btn-danger:hover {
            background: var(--vscode-inputValidation-errorBackground, rgba(90,29,29,0.5));
        }

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

        /* Save indicator */
        .save-indicator {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .save-indicator.visible { opacity: 1; }
        .save-indicator.saved { color: var(--vscode-testing-iconPassed); }
    </style>
    <style id="richEditorStyles"></style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="header-left">
            <h1><span class="icon">📝</span> 메모</h1>
            <span class="save-indicator" id="saveIndicator"></span>
        </div>
        <div class="header-actions">
            <button class="btn btn-secondary" id="btnAdd" title="새 메모 추가">＋ 추가</button>
            <button class="btn btn-secondary" id="btnSave" title="memo.md에 저장">💾 저장</button>
            <button class="btn btn-danger" id="btnDelete" title="현재 메모 삭제">🗑 삭제</button>
            <button class="btn btn-primary" id="btnApplyToTodo" title="TODO에 반영하기">📋 TODO에 반영</button>
        </div>
    </div>

    <!-- Page Info -->
    <div class="page-info" id="pageInfo">
        <div class="page-info-row">
            <span class="page-info-label">제목</span>
            <input class="page-title-input" id="pageTitle" value="" placeholder="(제목 없음)" />
            <div class="pagination" id="pagination">
                <button class="nav-btn" id="btnPrev" title="이전"><svg viewBox="0 0 16 16"><polyline points="10 3 5 8 10 13"/></svg></button>
                <div class="page-numbers" id="pageNumbers"></div>
                <button class="nav-btn" id="btnNext" title="다음"><svg viewBox="0 0 16 16"><polyline points="6 3 11 8 6 13"/></svg></button>
            </div>
        </div>
    </div>

    <!-- Rich Editor Container -->
    <div id="editorRoot" style="flex:1;display:flex;flex-direction:column;overflow:hidden;"></div>

    <script>
        ${richEditorJs}

        // Inject rich editor styles
        document.getElementById('richEditorStyles').textContent = RichEditor.getStyles();

        const vscode = acquireVsCodeApi();

        // ========== State ==========
        const initialContent = \`${escapedContent}\`;
        let pages = [];
        let currentPage = 0;

        // ========== Rich Editor 초기화 ==========
        const richEditor = new RichEditor(document.getElementById('editorRoot'), {
            placeholder: '내용을 입력하세요...',
            showImage: true,
            onInput: () => {}
        });

        // ========== DOM ==========
        const editor = richEditor.editor;
        const pageTitleInput = document.getElementById('pageTitle');
        const pageNumbers = document.getElementById('pageNumbers');
        const btnPrev = document.getElementById('btnPrev');
        const btnNext = document.getElementById('btnNext');
        const saveIndicator = document.getElementById('saveIndicator');

        // ========== Parse memo.md into pages ==========
        function parseMemoContent(content) {
            const lines = content.split('\\n');
            const result = [];
            let current = null;

            for (const line of lines) {
                const headingMatch = line.match(/^#\\s+(.+)/);
                if (headingMatch) {
                    if (current) result.push(current);
                    current = {
                        title: headingMatch[1].trim(),
                        body: []
                    };
                } else {
                    if (current) {
                        current.body.push(line);
                    }
                }
            }
            if (current) result.push(current);
            return result;
        }

        function pagesToMarkdown(pgs) {
            return pgs.map(p => {
                const heading = '# ' + p.title;
                const bodyStr = p.body.join('\\n');
                return heading + '\\n' + bodyStr;
            }).join('\\n\\n').replace(/\\n{3,}/g, '\\n\\n').trim();
        }

        // ========== Body Sync ==========
        function syncBodyFromEditor() {
            if (pages.length > 0 && pages[currentPage]) {
                const md = RichEditor.htmlToMarkdown(editor);
                pages[currentPage].body = md.split('\\n');
            }
        }

        function syncBodyToEditor() {
            if (pages.length > 0 && pages[currentPage]) {
                const bodyMd = pages[currentPage].body.join('\\n').trim();
                richEditor.setHtml(bodyMd ? RichEditor.markdownToHtml(bodyMd) : '');
                richEditor.setEditable(true);
            } else {
                richEditor.setHtml('<div class="empty-state"><div class="icon-large">📝</div><p>등록된 메모가 없습니다.</p><p>"추가" 버튼으로 새 메모를 만들어보세요.</p></div>');
                richEditor.setEditable(false);
            }
        }

        // ========== Render ==========
        function render() {
            if (pages.length === 0) {
                pageTitleInput.value = '';
                pageTitleInput.placeholder = '메모가 없습니다';
                pageTitleInput.disabled = true;
                pageNumbers.innerHTML = '';
                btnPrev.disabled = true;
                btnNext.disabled = true;
                syncBodyToEditor();
                return;
            }

            if (currentPage >= pages.length) currentPage = pages.length - 1;
            if (currentPage < 0) currentPage = 0;

            const page = pages[currentPage];
            pageTitleInput.value = page.title || '';
            pageTitleInput.placeholder = '(제목 없음)';
            pageTitleInput.disabled = false;

            syncBodyToEditor();
            renderPagination();

            btnPrev.disabled = currentPage <= 0;
            btnNext.disabled = currentPage >= pages.length - 1;
        }

        // Sync input changes back to page data
        pageTitleInput.addEventListener('change', () => {
            if (pages.length > 0 && pages[currentPage]) {
                pages[currentPage].title = pageTitleInput.value.trim();
            }
        });

        function renderPagination() {
            pageNumbers.innerHTML = '';
            const total = pages.length;
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
            btn.title = pages[idx].title || 'Page ' + (idx + 1);
            btn.addEventListener('click', () => {
                syncBodyFromEditor();
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
                syncBodyFromEditor();
                currentPage--;
                render();
                saveViewState();
            }
        });

        btnNext.addEventListener('click', () => {
            if (currentPage < pages.length - 1) {
                syncBodyFromEditor();
                currentPage++;
                render();
                saveViewState();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.closest('.rich-editor-content')) return;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                if (currentPage > 0) { syncBodyFromEditor(); currentPage--; render(); saveViewState(); }
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                if (currentPage < pages.length - 1) { syncBodyFromEditor(); currentPage++; render(); saveViewState(); }
            }
        });

        // ========== Add ==========
        document.getElementById('btnAdd').addEventListener('click', () => {
            syncBodyFromEditor();
            const newPage = {
                title: '(새 메모)',
                body: ['- 내용을 입력하세요']
            };
            pages.push(newPage);
            currentPage = pages.length - 1;

            const md = pagesToMarkdown(pages);
            vscode.postMessage({ command: 'save', markdown: md });
            render();
            saveViewState();
            richEditor.focus();
        });

        // ========== Delete ==========
        document.getElementById('btnDelete').addEventListener('click', () => {
            if (pages.length === 0) return;
            const page = pages[currentPage];
            vscode.postMessage({ command: 'confirmDelete', label: page.title });
        });

        // ========== Save ==========
        document.getElementById('btnSave').addEventListener('click', () => {
            syncBodyFromEditor();
            const md = pagesToMarkdown(pages);
            vscode.postMessage({ command: 'save', markdown: md });
        });

        // ========== Apply to TODO ==========
        document.getElementById('btnApplyToTodo').addEventListener('click', () => {
            syncBodyFromEditor();
            const md = pagesToMarkdown(pages);
            vscode.postMessage({ command: 'confirmApplyToTodo', markdown: md });
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
            if (msg.command === 'deleteConfirmed' && msg.confirmed) {
                pages.splice(currentPage, 1);
                if (currentPage >= pages.length && currentPage > 0) currentPage--;
                const md = pagesToMarkdown(pages);
                vscode.postMessage({ command: 'save', markdown: md });
                render();
                saveViewState();
            }
            if (msg.command === 'refreshContent') {
                pages = parseMemoContent(msg.content);
                if (currentPage >= pages.length) currentPage = Math.max(0, pages.length - 1);
                render();
                saveViewState();
            }
        });

        // ========== Keyboard shortcut: Ctrl+S ==========
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                syncBodyFromEditor();
                const md = pagesToMarkdown(pages);
                vscode.postMessage({ command: 'save', markdown: md });
            }
        });

        // ========== State persistence ==========
        function saveViewState() {
            vscode.setState({ currentPage });
        }

        // ========== Init ==========
        const prevState = vscode.getState();
        pages = parseMemoContent(initialContent);
        if (prevState) {
            currentPage = prevState.currentPage || 0;
        }
        render();
    </script>
</body>
</html>`;
    }
}

module.exports = MemoViewerEditor;
