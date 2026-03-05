/**
 * TODO Viewer Editor — todo.md 파일을 리치 UI로 보여주는 Webview
 * # 헤딩 기준으로 페이지를 구분하여 페이지네이션으로 탐색
 * RichEditor 컴포넌트를 재사용하여 편집 기능 제공
 * 추가 / 삭제 / 저장 / 리뷰 반영 / 작업 시작 기능 제공
 */

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const EditorBase = require('./editorBase');

class TodoViewerEditor extends EditorBase {
    static _instance = null;

    constructor(context, todoFilePath) {
        super(context);
        this.todoFilePath = todoFilePath;
        this._disposables = [];
        this._isSaving = false;
        this._refreshDebounceTimer = null;
    }

    static async openOrCreate(context, todoFilePath) {
        if (TodoViewerEditor._instance && TodoViewerEditor._instance.panel) {
            TodoViewerEditor._instance.panel.reveal(vscode.ViewColumn.Active);
            return;
        }
        const editor = new TodoViewerEditor(context, todoFilePath);
        TodoViewerEditor._instance = editor;
        await editor.open();
    }

    onDispose() {
        TodoViewerEditor._instance = null;
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
        if (this._refreshDebounceTimer) {
            clearTimeout(this._refreshDebounceTimer);
            this._refreshDebounceTimer = null;
        }
    }

    async open() {
        this.createPanel('wizTodoViewer', 'TODO 목록', vscode.ViewColumn.Active);

        const content = this.loadTodoContent();
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
                case 'confirmReview': {
                    const answer = await vscode.window.showWarningMessage(
                        '리뷰 반영을 실행하시겠습니까?', { modal: true }, '실행'
                    );
                    if (answer === '실행') {
                        await this.handleSave(message.markdown);
                        await this.handleReviewWizard();
                    }
                    break;
                }
                case 'confirmRunTask': {
                    const ids = message.selectedIds || [];
                    let confirmMessage;
                    if (ids.length > 0) {
                        confirmMessage = `선택된 항목 (${ids.join(', ')})을 실행하시겠습니까?`;
                    } else {
                        confirmMessage = '전체 항목을 실행합니다. 시작하시겠습니까?';
                    }
                    const answer = await vscode.window.showWarningMessage(
                        confirmMessage, { modal: true }, '시작'
                    );
                    if (answer === '시작') {
                        await this.handleSave(message.markdown);
                        await this.handleRunTask(ids);
                    }
                    break;
                }
                case 'runTask':
                    await this.handleRunTask();
                    break;
                case 'reviewWizard':
                    await this.handleReviewWizard();
                    break;
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
                if (e.document.uri.fsPath !== this.todoFilePath) return;
                if (e.contentChanges.length === 0) return;
                if (this._refreshDebounceTimer) clearTimeout(this._refreshDebounceTimer);
                this._refreshDebounceTimer = setTimeout(() => {
                    this.postMessage({ command: 'refreshContent', content: e.document.getText() });
                }, 300);
            }),
            vscode.workspace.onDidSaveTextDocument((doc) => {
                if (this._isSaving) return;
                if (doc.uri.fsPath !== this.todoFilePath) return;
                const content = this.loadTodoContentFromDisk();
                this.postMessage({ command: 'refreshContent', content });
            })
        );

        // FileSystemWatcher — 외부 프로세스(git, Copilot, 터미널 등)에 의한 파일 변경 감지
        const fsWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(path.dirname(this.todoFilePath), path.basename(this.todoFilePath))
        );
        const fsWatcherHandler = () => {
            if (this._isSaving) return;
            if (this._refreshDebounceTimer) clearTimeout(this._refreshDebounceTimer);
            this._refreshDebounceTimer = setTimeout(() => {
                const content = this.loadTodoContentFromDisk();
                this.postMessage({ command: 'refreshContent', content });
            }, 300);
        };
        this._disposables.push(
            fsWatcher,
            fsWatcher.onDidChange(fsWatcherHandler),
            fsWatcher.onDidCreate(fsWatcherHandler),
            fsWatcher.onDidDelete(fsWatcherHandler)
        );

        // 패널 가시성 변경 시 최신화 (탭 전환 복귀 시) — 디스크 우선 읽기
        this.panel.onDidChangeViewState(() => {
            if (this.panel && this.panel.visible && !this._isSaving) {
                const content = this.loadTodoContentFromDisk();
                this.postMessage({ command: 'refreshContent', content });
            }
        });
    }

    /**
     * 디스크 파일을 직접 읽어 최신 내용 반환 (외부 변경 감지, 탭 복귀 시 사용)
     * VS Code 버퍼 캐시를 무시하고 항상 디스크의 실제 내용을 반환
     */
    loadTodoContentFromDisk() {
        try {
            if (fs.existsSync(this.todoFilePath)) {
                return fs.readFileSync(this.todoFilePath, 'utf8');
            }
        } catch (e) { /* ignore */ }
        return '';
    }

    /**
     * VS Code에서 열린 문서 버퍼 우선 사용 (에디터 실시간 편집 반영용)
     * 열린 문서가 dirty 상태가 아니면 디스크 우선 읽기로 폴백
     */
    loadTodoContent() {
        try {
            const openDoc = vscode.workspace.textDocuments.find(
                doc => doc.uri.fsPath === this.todoFilePath
            );
            // 열린 문서가 dirty(미저장 편집 중)일 때만 버퍼 사용
            if (openDoc && openDoc.isDirty) return openDoc.getText();
            return this.loadTodoContentFromDisk();
        } catch (e) { /* ignore */ }
        return '';
    }

    async handleSave(markdown) {
        try {
            this._isSaving = true;
            const dir = path.dirname(this.todoFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.todoFilePath, markdown, 'utf8');
            this.postMessage({ command: 'saveComplete' });
            vscode.window.showInformationMessage('todo.md 저장 완료');
            setTimeout(() => { this._isSaving = false; }, 500);
        } catch (e) {
            this._isSaving = false;
            vscode.window.showErrorMessage(`저장 실패: ${e.message}`);
        }
    }

    async handleRunTask(selectedIds = []) {
        const confirmMsg = selectedIds.length > 0
            ? `선택한 작업(${selectedIds.join(', ')})을 Copilot Chat으로 실행하시겠습니까?`
            : 'Copilot Chat으로 작업 실행을 요청하시겠습니까?';
        const confirm = await vscode.window.showWarningMessage(
            confirmMsg, { modal: true }, '실행'
        );
        if (confirm !== '실행') return;

        try {
            const query = selectedIds.length > 0
                ? `${selectedIds.join(', ')} 작업 수행해줘`
                : '작업 수행해줘';
            await vscode.commands.executeCommand('workbench.action.chat.open', {
                query,
                mode: 'agent',
                attachFiles: [vscode.Uri.file(this.todoFilePath)]
            });
            this.dispose();
        } catch (e) {
            vscode.window.showWarningMessage(
                'Copilot Chat을 열 수 없습니다. GitHub Copilot Chat 확장이 설치되어 있는지 확인해주세요.',
                '확인'
            );
        }
    }

    async handleReviewWizard() {
        const confirm = await vscode.window.showWarningMessage(
            'Copilot Chat으로 리뷰 정리를 요청하시겠습니까?',
            { modal: true }, '실행'
        );
        if (confirm !== '실행') return;

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
        .page-id-input {
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 12px;
            padding: 3px 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-weight: 600;
            width: 180px;
            outline: none;
            transition: border-color 0.15s;
        }
        .page-id-input:focus {
            border-color: var(--vscode-focusBorder);
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

        /* ===== Pagination (inline with ID row) ===== */
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

        /* Selection checkbox */
        .page-select-checkbox {
            width: 16px;
            height: 16px;
            accent-color: var(--vscode-button-background);
            cursor: pointer;
            flex-shrink: 0;
            margin: 0;
        }
        .page-select-checkbox:disabled {
            opacity: 0.3;
            cursor: default;
        }

        /* Selected items bar */
        .selected-items-bar {
            padding: 6px 20px;
            border-bottom: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editor-background);
            flex-shrink: 0;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px;
        }
        .selected-items-bar.hidden { display: none; }
        .selected-tag {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 10px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
            font-family: var(--vscode-editor-font-family, monospace);
        }
        .selected-tag .tag-remove {
            cursor: pointer;
            opacity: 0.7;
            font-size: 14px;
            line-height: 1;
            margin-left: 2px;
            font-family: sans-serif;
        }
        .selected-tag .tag-remove:hover { opacity: 1; }
        .selected-label {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            font-weight: 500;
            margin-right: 4px;
        }
    </style>
    <style id="richEditorStyles"></style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="header-left">
            <h1><span class="icon">📋</span> TODO 목록</h1>
            <span class="save-indicator" id="saveIndicator"></span>
        </div>
        <div class="header-actions">
            <button class="btn btn-secondary" id="btnAdd" title="새 TODO 추가">＋ 추가</button>
            <button class="btn btn-secondary" id="btnSave" title="todo.md에 저장">💾 저장</button>
            <button class="btn btn-danger" id="btnDelete" title="현재 TODO 삭제">🗑 삭제</button>
            <button class="btn btn-secondary" id="btnReview" title="리뷰 반영">리뷰 반영</button>
            <button class="btn btn-primary" id="btnRunTask" title="작업 시작">▶ 작업 시작</button>
        </div>
    </div>

    <!-- Page Info -->
    <div class="page-info" id="pageInfo">
        <div class="page-info-row">
            <span class="page-info-label">ID</span>
            <input type="checkbox" class="page-select-checkbox" id="pageSelectCheckbox" title="이 항목 선택" />
            <input class="page-id-input" id="pageId" value="" placeholder="FN-XXXXXXXX-XXXX" />
            <div class="pagination" id="pagination">
                <button class="nav-btn" id="btnPrev" title="이전"><svg viewBox="0 0 16 16"><polyline points="10 3 5 8 10 13"/></svg></button>
                <div class="page-numbers" id="pageNumbers"></div>
                <button class="nav-btn" id="btnNext" title="다음"><svg viewBox="0 0 16 16"><polyline points="6 3 11 8 6 13"/></svg></button>
            </div>
        </div>
        <div class="page-info-row">
            <span class="page-info-label">제목</span>
            <input class="page-title-input" id="pageTitle" value="" placeholder="(제목 없음)" />
        </div>
    </div>

    <!-- Selected Items Bar -->
    <div class="selected-items-bar hidden" id="selectedItemsBar">
        <span class="selected-label">선택됨:</span>
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
        let selectedIds = new Set();

        // ========== Rich Editor 초기화 ==========
        const richEditor = new RichEditor(document.getElementById('editorRoot'), {
            placeholder: '내용을 입력하세요...',
            showImage: true,
            onInput: () => {}
        });

        // ========== DOM ==========
        const editor = richEditor.editor;
        const pageIdInput = document.getElementById('pageId');
        const pageTitleInput = document.getElementById('pageTitle');
        const pageNumbers = document.getElementById('pageNumbers');
        const btnPrev = document.getElementById('btnPrev');
        const btnNext = document.getElementById('btnNext');
        const saveIndicator = document.getElementById('saveIndicator');
        const pageSelectCheckbox = document.getElementById('pageSelectCheckbox');
        const selectedItemsBar = document.getElementById('selectedItemsBar');

        // ========== Parse todo.md into pages ==========
        function parseTodoContent(content) {
            const lines = content.split('\\n');
            const result = [];
            let current = null;

            for (const line of lines) {
                const headingMatch = line.match(/^#\\s+(.+)/);
                if (headingMatch) {
                    if (current) result.push(current);
                    const titleStr = headingMatch[1].trim();
                    const idMatch = titleStr.match(/^(FN-\\d{8}-\\d{4}):\\s*(.*)/);
                    current = {
                        id: idMatch ? idMatch[1] : '',
                        title: idMatch ? idMatch[2] : titleStr,
                        fullHeading: line,
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
                const heading = p.id ? '# ' + p.id + ': ' + p.title : '# ' + p.title;
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
                richEditor.setHtml('<div class="empty-state"><div class="icon-large">📭</div><p>등록된 TODO가 없습니다.</p><p>"추가" 버튼으로 새 TODO를 만들어보세요.</p></div>');
                richEditor.setEditable(false);
            }
        }

        // ========== Render ==========
        function render() {
            if (pages.length === 0) {
                pageIdInput.value = '';
                pageIdInput.disabled = true;
                pageSelectCheckbox.checked = false;
                pageSelectCheckbox.disabled = true;
                pageTitleInput.value = '';
                pageTitleInput.placeholder = 'TODO가 없습니다';
                pageTitleInput.disabled = true;
                pageNumbers.innerHTML = '';
                btnPrev.disabled = true;
                btnNext.disabled = true;
                syncBodyToEditor();
                renderSelectedItems();
                return;
            }

            if (currentPage >= pages.length) currentPage = pages.length - 1;
            if (currentPage < 0) currentPage = 0;

            const page = pages[currentPage];
            pageIdInput.value = page.id || '';
            pageIdInput.disabled = false;
            pageSelectCheckbox.checked = page.id ? selectedIds.has(page.id) : false;
            pageSelectCheckbox.disabled = !page.id;
            pageTitleInput.value = page.title || '';
            pageTitleInput.placeholder = '(제목 없음)';
            pageTitleInput.disabled = false;

            syncBodyToEditor();
            renderPagination();
            renderSelectedItems();

            btnPrev.disabled = currentPage <= 0;
            btnNext.disabled = currentPage >= pages.length - 1;
        }

        // Sync input changes back to page data
        pageIdInput.addEventListener('change', () => {
            if (pages.length > 0 && pages[currentPage]) {
                const oldId = pages[currentPage].id;
                const newId = pageIdInput.value.trim();
                if (selectedIds.has(oldId)) {
                    selectedIds.delete(oldId);
                    if (newId) selectedIds.add(newId);
                }
                pages[currentPage].id = newId;
                pageSelectCheckbox.checked = newId ? selectedIds.has(newId) : false;
                pageSelectCheckbox.disabled = !newId;
                renderSelectedItems();
                saveViewState();
            }
        });
        pageTitleInput.addEventListener('change', () => {
            if (pages.length > 0 && pages[currentPage]) {
                pages[currentPage].title = pageTitleInput.value.trim();
            }
        });

        // ========== Checkbox Selection ==========
        pageSelectCheckbox.addEventListener('change', () => {
            if (pages.length > 0 && pages[currentPage]) {
                const pageId = pages[currentPage].id;
                if (!pageId) {
                    pageSelectCheckbox.checked = false;
                    return;
                }
                if (pageSelectCheckbox.checked) {
                    selectedIds.add(pageId);
                } else {
                    selectedIds.delete(pageId);
                }
                renderSelectedItems();
                saveViewState();
            }
        });

        function renderSelectedItems() {
            selectedItemsBar.innerHTML = '';
            if (selectedIds.size === 0) {
                selectedItemsBar.classList.add('hidden');
                return;
            }
            selectedItemsBar.classList.remove('hidden');

            const label = document.createElement('span');
            label.className = 'selected-label';
            label.textContent = '선택됨:';
            selectedItemsBar.appendChild(label);

            for (const id of selectedIds) {
                const tag = document.createElement('span');
                tag.className = 'selected-tag';
                tag.innerHTML = id + ' <span class="tag-remove" data-id="' + id + '">×</span>';
                selectedItemsBar.appendChild(tag);
            }

            selectedItemsBar.querySelectorAll('.tag-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const removeId = e.target.dataset.id;
                    selectedIds.delete(removeId);
                    if (pages.length > 0 && pages[currentPage] && pages[currentPage].id === removeId) {
                        pageSelectCheckbox.checked = false;
                    }
                    renderSelectedItems();
                    saveViewState();
                });
            });
        }

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
            btn.title = pages[idx].id || 'Page ' + (idx + 1);
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
            const today = new Date();
            const dateStr = today.getFullYear().toString() +
                String(today.getMonth() + 1).padStart(2, '0') +
                String(today.getDate()).padStart(2, '0');

            let seq = 1;
            pages.forEach(p => {
                const m = p.id.match(/^FN-(\\d{8})-(\\d{4})\$/);
                if (m && m[1] === dateStr) {
                    const n = parseInt(m[2], 10);
                    if (n >= seq) seq = n + 1;
                }
            });

            const newId = 'FN-' + dateStr + '-' + String(seq).padStart(4, '0');
            const newPage = {
                id: newId,
                title: '(새 작업)',
                body: ['- 작업 내용을 입력하세요']
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
            const label = page.id ? page.id + ': ' + page.title : page.title;
            vscode.postMessage({ command: 'confirmDelete', label });
        });

        // ========== Save ==========
        document.getElementById('btnSave').addEventListener('click', () => {
            syncBodyFromEditor();
            const md = pagesToMarkdown(pages);
            vscode.postMessage({ command: 'save', markdown: md });
        });

        // ========== Review ==========
        document.getElementById('btnReview').addEventListener('click', () => {
            syncBodyFromEditor();
            const md = pagesToMarkdown(pages);
            vscode.postMessage({ command: 'confirmReview', markdown: md });
        });

        // ========== Run Task ==========
        document.getElementById('btnRunTask').addEventListener('click', () => {
            syncBodyFromEditor();
            const md = pagesToMarkdown(pages);
            const ids = Array.from(selectedIds);
            vscode.postMessage({ command: 'confirmRunTask', markdown: md, selectedIds: ids });
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
                const deletedId = pages[currentPage]?.id;
                if (deletedId) selectedIds.delete(deletedId);
                pages.splice(currentPage, 1);
                if (currentPage >= pages.length && currentPage > 0) currentPage--;
                const md = pagesToMarkdown(pages);
                vscode.postMessage({ command: 'save', markdown: md });
                render();
                saveViewState();
            }
            if (msg.command === 'refreshContent') {
                pages = parseTodoContent(msg.content);
                if (currentPage >= pages.length) currentPage = Math.max(0, pages.length - 1);
                const validIds = new Set(pages.map(p => p.id).filter(Boolean));
                for (const id of selectedIds) {
                    if (!validIds.has(id)) selectedIds.delete(id);
                }
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
            vscode.setState({ currentPage, selectedIds: Array.from(selectedIds) });
        }

        // ========== Init ==========
        const prevState = vscode.getState();
        pages = parseTodoContent(initialContent);
        if (prevState) {
            currentPage = prevState.currentPage || 0;
            if (prevState.selectedIds) {
                prevState.selectedIds.forEach(id => selectedIds.add(id));
            }
        }
        render();
    </script>
</body>
</html>`;
    }
}

module.exports = TodoViewerEditor;