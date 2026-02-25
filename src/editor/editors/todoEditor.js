/**
 * TODO Editor — 리치 텍스트 기반 TODO 작성 Webview
 * CKEditor 스타일의 WYSIWYG 에디터로 TODO를 작성하고
 * Markdown으로 변환하여 Copilot Chat에 전달
 */

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const EditorBase = require('./editorBase');

class TodoEditor extends EditorBase {
    constructor(context, taskBasePath) {
        super(context);
        this.taskBasePath = taskBasePath; // .github/task
    }

    async open() {
        this.createPanel('wizTodoEditor', 'TODO 작성', vscode.ViewColumn.Active);
        this.panel.webview.html = this.generateHtml();

        this.panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'uploadImage':
                    await this.handleImageUpload(message);
                    break;
                case 'submit':
                    await this.handleSubmit(message.markdown);
                    break;
                case 'close':
                    this.dispose();
                    break;
            }
        });
    }

    /**
     * 이미지 업로드 처리 — .github/task/resources/ 에 저장
     */
    async handleImageUpload(message) {
        try {
            const resourcesDir = path.join(this.taskBasePath, 'resources');
            if (!fs.existsSync(resourcesDir)) {
                fs.mkdirSync(resourcesDir, { recursive: true });
            }

            const fileName = message.fileName;
            const base64Data = message.fileData;
            const buffer = Buffer.from(base64Data, 'base64');

            // 중복 방지: 같은 이름이 있으면 타임스탬프 붙이기
            let targetName = fileName;
            const targetPath = path.join(resourcesDir, targetName);
            if (fs.existsSync(targetPath)) {
                const ext = path.extname(fileName);
                const base = path.basename(fileName, ext);
                targetName = `${base}_${Date.now()}${ext}`;
            }

            const finalPath = path.join(resourcesDir, targetName);
            fs.writeFileSync(finalPath, buffer);

            // Webview에 삽입할 이미지 경로 전달 (상대 경로)
            const relativePath = `resources/${targetName}`;
            this.postMessage({
                command: 'imageUploaded',
                relativePath: relativePath,
                placeholderId: message.placeholderId,
                webviewUri: this.panel.webview.asWebviewUri(vscode.Uri.file(finalPath)).toString()
            });
        } catch (e) {
            vscode.window.showErrorMessage(`이미지 업로드 실패: ${e.message}`);
        }
    }

    /**
     * 생성 버튼 클릭 시 — Markdown을 Copilot Chat으로 전달
     */
    async handleSubmit(markdown) {
        if (!markdown || !markdown.trim()) {
            vscode.window.showWarningMessage('내용을 입력해주세요.');
            return;
        }

        const query = `TODO 작성해줘\n\n${markdown}`;
        try {
            await vscode.commands.executeCommand('workbench.action.chat.open', { query });
            this.dispose();
        } catch (e) {
            vscode.window.showWarningMessage(
                'Copilot Chat을 열 수 없습니다. GitHub Copilot Chat 확장이 설치되어 있는지 확인해주세요.',
                '확인'
            );
        }
    }

    generateHtml() {
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
            padding: 16px 24px;
            border-bottom: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editorWidget-background);
            flex-shrink: 0;
        }
        .header h1 {
            font-size: 18px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .header h1 .icon { font-size: 20px; }
        .header-actions {
            display: flex;
            gap: 8px;
        }

        /* ===== Toolbar ===== */
        .toolbar {
            display: flex;
            align-items: center;
            gap: 2px;
            padding: 8px 24px;
            border-bottom: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editorWidget-background);
            flex-wrap: wrap;
            flex-shrink: 0;
        }
        .toolbar-btn {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            background: transparent;
            color: var(--vscode-editor-foreground);
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background 0.15s;
        }
        .toolbar-btn:hover {
            background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
        }
        .toolbar-btn.active {
            background: var(--vscode-toolbar-activeBackground, rgba(99, 102, 103, 0.4));
            color: var(--vscode-textLink-foreground);
        }
        .toolbar-sep {
            width: 1px;
            height: 20px;
            background: var(--vscode-widget-border);
            margin: 0 6px;
        }
        .toolbar-btn svg {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }
        .toolbar-btn .codicon {
            font-size: 16px;
        }

        /* ===== Editor Area ===== */
        .editor-wrapper {
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            padding: 0 24px 16px;
        }
        .editor-container {
            flex: 1;
            margin-top: 16px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            background: var(--vscode-input-background);
        }
        #editor {
            flex: 1;
            padding: 16px 20px;
            overflow-y: auto;
            outline: none;
            font-size: 14px;
            line-height: 1.7;
            color: var(--vscode-editor-foreground);
            min-height: 200px;
        }
        #editor:empty::before {
            content: attr(data-placeholder);
            color: var(--vscode-input-placeholderForeground);
            pointer-events: none;
        }
        #editor:focus {
            outline: none;
        }

        /* Editor Content Styles */
        #editor h1 { font-size: 24px; font-weight: 700; margin: 16px 0 8px; }
        #editor h2 { font-size: 20px; font-weight: 600; margin: 14px 0 6px; }
        #editor h3 { font-size: 16px; font-weight: 600; margin: 12px 0 4px; }
        #editor p { margin: 4px 0; }
        #editor ul, #editor ol { margin: 4px 0; padding-left: 24px; }
        #editor li { margin: 2px 0; }
        #editor blockquote {
            border-left: 3px solid var(--vscode-textLink-foreground);
            padding-left: 12px;
            margin: 8px 0;
            opacity: 0.85;
        }
        #editor pre {
            background: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.2));
            padding: 12px;
            border-radius: 4px;
            margin: 8px 0;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 13px;
        }
        #editor code {
            background: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.2));
            padding: 2px 5px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 13px;
        }
        #editor pre code {
            background: none;
            padding: 0;
        }
        #editor img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            margin: 8px 0;
            cursor: pointer;
        }
        #editor a {
            color: var(--vscode-textLink-foreground);
            text-decoration: underline;
        }
        #editor hr {
            border: none;
            border-top: 1px solid var(--vscode-widget-border);
            margin: 12px 0;
        }
        #editor table {
            border-collapse: collapse;
            margin: 8px 0;
        }
        #editor th, #editor td {
            border: 1px solid var(--vscode-widget-border);
            padding: 6px 10px;
            text-align: left;
        }
        #editor th {
            background: var(--vscode-editorWidget-background);
            font-weight: 600;
        }

        /* ===== Image Drop Overlay ===== */
        .drop-overlay {
            display: none;
            position: absolute;
            inset: 0;
            background: rgba(0, 120, 212, 0.1);
            border: 3px dashed var(--vscode-textLink-foreground);
            border-radius: 6px;
            z-index: 100;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 500;
            color: var(--vscode-textLink-foreground);
            pointer-events: none;
        }
        .drop-overlay.visible {
            display: flex;
        }

        /* ===== Buttons ===== */
        .btn {
            padding: 8px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: background 0.2s, opacity 0.2s;
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

        /* ===== Title Input ===== */
        .title-input-row {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 24px;
            flex-shrink: 0;
        }
        .title-input-row label {
            font-size: 13px;
            font-weight: 600;
            white-space: nowrap;
            color: var(--vscode-descriptionForeground);
        }
        .title-input {
            flex: 1;
            padding: 6px 12px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            font-size: 14px;
            outline: none;
        }
        .title-input:focus {
            border-color: var(--vscode-focusBorder);
        }

        /* ===== Footer ===== */
        .footer {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            padding: 12px 24px;
            border-top: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editorWidget-background);
            flex-shrink: 0;
        }
        .word-count {
            margin-right: auto;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        /* Image upload button */
        .image-upload-input { display: none; }

        /* Heading dropdown */
        .heading-dropdown {
            position: relative;
            display: inline-block;
        }
        .heading-menu {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 200;
            min-width: 140px;
            padding: 4px 0;
        }
        .heading-menu.visible { display: block; }
        .heading-menu-item {
            display: block;
            width: 100%;
            padding: 6px 12px;
            text-align: left;
            border: none;
            background: transparent;
            color: var(--vscode-editor-foreground);
            cursor: pointer;
            font-size: 13px;
        }
        .heading-menu-item:hover {
            background: var(--vscode-list-hoverBackground);
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <h1><span class="icon">📋</span> TODO 작성</h1>
    </div>

    <!-- Title Input -->
    <div class="title-input-row">
        <label>제목</label>
        <input type="text" class="title-input" id="todoTitle" placeholder="TODO 제목을 입력하세요 (예: 검색 기능에 페이지네이션 추가)" autofocus />
    </div>

    <!-- Toolbar -->
    <div class="toolbar" id="toolbar">
        <!-- Heading -->
        <div class="heading-dropdown">
            <button class="toolbar-btn" id="btnHeading" title="제목">H</button>
            <div class="heading-menu" id="headingMenu">
                <button class="heading-menu-item" data-tag="h1"><b style="font-size:18px">제목 1</b></button>
                <button class="heading-menu-item" data-tag="h2"><b style="font-size:15px">제목 2</b></button>
                <button class="heading-menu-item" data-tag="h3"><b style="font-size:13px">제목 3</b></button>
                <button class="heading-menu-item" data-tag="p">본문</button>
            </div>
        </div>

        <div class="toolbar-sep"></div>

        <!-- Text formatting -->
        <button class="toolbar-btn" data-cmd="bold" title="굵게 (Ctrl+B)"><b>B</b></button>
        <button class="toolbar-btn" data-cmd="italic" title="기울임 (Ctrl+I)"><i>I</i></button>
        <button class="toolbar-btn" data-cmd="strikeThrough" title="취소선"><s>S</s></button>
        <button class="toolbar-btn" data-cmd="code" title="인라인 코드" style="font-family: monospace; font-size: 13px;">&lt;/&gt;</button>

        <div class="toolbar-sep"></div>

        <!-- Lists -->
        <button class="toolbar-btn" data-cmd="insertUnorderedList" title="목록">•≡</button>
        <button class="toolbar-btn" data-cmd="insertOrderedList" title="번호 목록">1.</button>
        
        <div class="toolbar-sep"></div>

        <!-- Block -->
        <button class="toolbar-btn" data-cmd="blockquote" title="인용">❝</button>
        <button class="toolbar-btn" data-cmd="codeBlock" title="코드 블록" style="font-family: monospace; font-size: 11px;">{}</button>
        <button class="toolbar-btn" data-cmd="insertHorizontalRule" title="구분선">―</button>

        <div class="toolbar-sep"></div>

        <!-- Link & Image -->
        <button class="toolbar-btn" data-cmd="link" title="링크 삽입">🔗</button>
        <button class="toolbar-btn" id="btnImage" title="이미지 업로드">🖼</button>
        <input type="file" class="image-upload-input" id="imageInput" accept="image/*" multiple />

        <div class="toolbar-sep"></div>

        <!-- Undo/Redo -->
        <button class="toolbar-btn" data-cmd="undo" title="실행취소 (Ctrl+Z)">↩</button>
        <button class="toolbar-btn" data-cmd="redo" title="다시실행 (Ctrl+Y)">↪</button>
    </div>

    <!-- Editor -->
    <div class="editor-wrapper" style="position: relative;">
        <div class="drop-overlay" id="dropOverlay">🖼 이미지를 여기에 놓으세요</div>
        <div class="editor-container">
            <div id="editor" contenteditable="true" data-placeholder="TODO 내용을 작성하세요...&#10;&#10;서식 도구모음을 사용하거나 이미지를 드래그하여 첨부할 수 있습니다."></div>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <span class="word-count" id="wordCount">0자</span>
        <button class="btn btn-secondary" id="btnCancel">취소</button>
        <button class="btn btn-primary" id="btnSubmit">✨ TODO 생성</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const editor = document.getElementById('editor');
        const titleInput = document.getElementById('todoTitle');
        const wordCount = document.getElementById('wordCount');
        const imageInput = document.getElementById('imageInput');
        const dropOverlay = document.getElementById('dropOverlay');
        const headingMenu = document.getElementById('headingMenu');

        // ========== Toolbar Commands ==========
        document.querySelectorAll('.toolbar-btn[data-cmd]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const cmd = btn.dataset.cmd;
                editor.focus();

                if (cmd === 'code') {
                    wrapSelectionWith('code');
                } else if (cmd === 'blockquote') {
                    document.execCommand('formatBlock', false, 'blockquote');
                } else if (cmd === 'codeBlock') {
                    insertCodeBlock();
                } else if (cmd === 'link') {
                    insertLink();
                } else {
                    document.execCommand(cmd, false, null);
                }
                updateWordCount();
            });
        });

        // ========== Heading Dropdown ==========
        document.getElementById('btnHeading').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            headingMenu.classList.toggle('visible');
        });

        document.querySelectorAll('.heading-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tag = item.dataset.tag;
                editor.focus();
                document.execCommand('formatBlock', false, tag);
                headingMenu.classList.remove('visible');
                updateWordCount();
            });
        });

        document.addEventListener('click', () => {
            headingMenu.classList.remove('visible');
        });

        // ========== Helper Functions ==========
        function wrapSelectionWith(tag) {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            const range = selection.getRangeAt(0);
            const el = document.createElement(tag);
            try {
                range.surroundContents(el);
            } catch (e) {
                // Complex selection, insert around
                el.textContent = selection.toString();
                range.deleteContents();
                range.insertNode(el);
            }
        }

        function insertCodeBlock() {
            const selection = window.getSelection();
            const text = selection.toString() || '// code here';
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.textContent = text;
            pre.appendChild(code);
            
            if (selection.rangeCount) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(pre);
                // Add a paragraph after for continued typing
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                pre.parentNode.insertBefore(p, pre.nextSibling);
                // Move cursor after
                const newRange = document.createRange();
                newRange.setStart(p, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
        }

        function insertLink() {
            const selection = window.getSelection();
            const text = selection.toString() || '';
            const url = prompt('URL을 입력하세요:', 'https://');
            if (url) {
                const displayText = text || url;
                document.execCommand('insertHTML', false, 
                    '<a href="' + escapeHtml(url) + '">' + escapeHtml(displayText) + '</a>');
            }
        }

        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        // ========== Image Upload ==========
        document.getElementById('btnImage').addEventListener('click', (e) => {
            e.preventDefault();
            imageInput.click();
        });

        imageInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => uploadImage(file));
            imageInput.value = '';
        });

        // Drag & Drop images into editor
        let dragCounter = 0;
        const editorWrapper = document.querySelector('.editor-wrapper');

        editorWrapper.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            if (hasImageFiles(e)) {
                dropOverlay.classList.add('visible');
            }
        });

        editorWrapper.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter <= 0) {
                dragCounter = 0;
                dropOverlay.classList.remove('visible');
            }
        });

        editorWrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        editorWrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            dropOverlay.classList.remove('visible');
            
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            files.forEach(file => uploadImage(file));
        });

        // Also handle paste of images
        editor.addEventListener('paste', (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) uploadImage(file);
                    return;
                }
            }
        });

        function hasImageFiles(e) {
            if (e.dataTransfer?.types) {
                return Array.from(e.dataTransfer.types).includes('Files');
            }
            return false;
        }

        function uploadImage(file) {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const arrayBuffer = e.target.result;
                const uint8Array = new Uint8Array(arrayBuffer);
                let binary = '';
                const chunkSize = 8192;
                for (let i = 0; i < uint8Array.length; i += chunkSize) {
                    const chunk = uint8Array.subarray(i, i + chunkSize);
                    binary += String.fromCharCode.apply(null, chunk);
                }
                const base64 = btoa(binary);

                // Insert a placeholder while uploading
                const placeholderId = 'img-' + Date.now();
                document.execCommand('insertHTML', false, 
                    '<span id="' + placeholderId + '" style="color:var(--vscode-descriptionForeground);font-style:italic;">⏳ 이미지 업로드 중...</span>');

                vscode.postMessage({
                    command: 'uploadImage',
                    fileName: file.name,
                    fileData: base64,
                    placeholderId: placeholderId
                });
            };
            reader.readAsArrayBuffer(file);
        }

        // Receive uploaded image URI
        window.addEventListener('message', (e) => {
            const msg = e.data;
            if (msg.command === 'imageUploaded') {
                const placeholder = msg.placeholderId ? document.getElementById(msg.placeholderId) : null;
                if (placeholder) {
                    const img = document.createElement('img');
                    img.src = msg.webviewUri;
                    img.alt = msg.relativePath;
                    img.dataset.mdPath = msg.relativePath;
                    placeholder.replaceWith(img);
                }
                updateWordCount();
            }
        });

        // ========== Word Count ==========
        function updateWordCount() {
            const text = editor.textContent || '';
            const count = text.replace(/\\s/g, '').length;
            wordCount.textContent = count + '자';
        }
        editor.addEventListener('input', updateWordCount);

        // ========== Submit & Cancel ==========
        document.getElementById('btnSubmit').addEventListener('click', () => {
            const title = titleInput.value.trim();
            const markdown = htmlToMarkdown(editor);
            
            let fullMarkdown = '';
            if (title) {
                fullMarkdown = '# ' + title + '\\n\\n' + markdown;
            } else {
                fullMarkdown = markdown;
            }

            vscode.postMessage({
                command: 'submit',
                markdown: fullMarkdown
            });
        });

        document.getElementById('btnCancel').addEventListener('click', () => {
            vscode.postMessage({ command: 'close' });
        });

        // ========== HTML → Markdown Converter ==========
        function htmlToMarkdown(root) {
            let md = '';
            
            function process(node, listType, listIndex, indent) {
                if (node.nodeType === Node.TEXT_NODE) {
                    return node.textContent;
                }
                if (node.nodeType !== Node.ELEMENT_NODE) return '';

                const tag = node.tagName.toLowerCase();
                const children = () => {
                    let result = '';
                    for (const child of node.childNodes) {
                        result += process(child, null, 0, indent);
                    }
                    return result;
                };

                switch (tag) {
                    case 'h1': return '# ' + children().trim() + '\\n\\n';
                    case 'h2': return '## ' + children().trim() + '\\n\\n';
                    case 'h3': return '### ' + children().trim() + '\\n\\n';
                    case 'p': {
                        const content = children().trim();
                        return content ? content + '\\n\\n' : '\\n';
                    }
                    case 'br': return '\\n';
                    case 'strong': case 'b': return '**' + children() + '**';
                    case 'em': case 'i': return '*' + children() + '*';
                    case 's': case 'strike': case 'del': return '~~' + children() + '~~';
                    case 'code': {
                        if (node.parentElement?.tagName?.toLowerCase() === 'pre') {
                            return children();
                        }
                        return '\\x60' + children() + '\\x60';
                    }
                    case 'pre': {
                        const codeContent = children().trim();
                        return '\\x60\\x60\\x60\\n' + codeContent + '\\n\\x60\\x60\\x60\\n\\n';
                    }
                    case 'blockquote': {
                        const lines = children().trim().split('\\n');
                        return lines.map(l => '> ' + l).join('\\n') + '\\n\\n';
                    }
                    case 'ul': {
                        let result = '';
                        let idx = 0;
                        for (const child of node.childNodes) {
                            if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'li') {
                                result += process(child, 'ul', idx, indent);
                                idx++;
                            }
                        }
                        return result + (indent === '' ? '\\n' : '');
                    }
                    case 'ol': {
                        let result = '';
                        let idx = 0;
                        for (const child of node.childNodes) {
                            if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'li') {
                                result += process(child, 'ol', idx, indent);
                                idx++;
                            }
                        }
                        return result + (indent === '' ? '\\n' : '');
                    }
                    case 'li': {
                        const prefix = listType === 'ol' ? (listIndex + 1) + '. ' : '- ';
                        const content = children().trim();
                        return indent + prefix + content + '\\n';
                    }
                    case 'a': {
                        const href = node.getAttribute('href') || '';
                        const text = children().trim();
                        return '[' + text + '](' + href + ')';
                    }
                    case 'img': {
                        const alt = node.dataset.mdPath || node.getAttribute('alt') || 'image';
                        const mdPath = node.dataset.mdPath || '';
                        return '![' + alt + '](' + mdPath + ')';
                    }
                    case 'hr': return '---\\n\\n';
                    case 'div': {
                        const content = children();
                        return content + (content.endsWith('\\n') ? '' : '\\n');
                    }
                    case 'table': {
                        return processTable(node);
                    }
                    default: return children();
                }
            }

            function processTable(tableNode) {
                const rows = tableNode.querySelectorAll('tr');
                if (rows.length === 0) return '';
                
                let md = '';
                rows.forEach((row, i) => {
                    const cells = row.querySelectorAll('th, td');
                    const line = '| ' + Array.from(cells).map(c => c.textContent.trim()).join(' | ') + ' |';
                    md += line + '\\n';
                    if (i === 0) {
                        md += '| ' + Array.from(cells).map(() => '---').join(' | ') + ' |\\n';
                    }
                });
                return md + '\\n';
            }

            for (const child of root.childNodes) {
                md += process(child, null, 0, '');
            }

            // Clean up excessive newlines
            return md.replace(/\\n{3,}/g, '\\n\\n').trim();
        }

        // ========== State persistence ==========
        const previousState = vscode.getState();
        if (previousState) {
            if (previousState.title) titleInput.value = previousState.title;
            if (previousState.html) editor.innerHTML = previousState.html;
            updateWordCount();
        }

        function saveState() {
            vscode.setState({
                title: titleInput.value,
                html: editor.innerHTML
            });
        }

        editor.addEventListener('input', saveState);
        titleInput.addEventListener('input', saveState);

        // Focus title on load
        setTimeout(() => titleInput.focus(), 100);
    </script>
</body>
</html>`;
    }
}

module.exports = TodoEditor;
