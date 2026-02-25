/**
 * Rich Editor Component — 재사용 가능한 WYSIWYG 에디터
 * 
 * 사용법:
 *   const richEditor = new RichEditor(document.getElementById('container'), options);
 * 
 * Options:
 *   - placeholder: 에디터 플레이스홀더 텍스트
 *   - showHeading: 제목 드롭다운 표시 여부 (default: false)
 *   - headingMinLevel: 최소 제목 레벨 (default: 2, H2부터)
 *   - showImage: 이미지 삽입 버튼 표시 여부 (default: false, 512px 자동 리사이즈)
 *   - onInput: 입력 시 콜백
 */
class RichEditor {
    constructor(container, options = {}) {
        this.container = container;
        this.options = Object.assign({
            placeholder: '내용을 입력하세요...',
            showHeading: false,
            headingMinLevel: 2,
            showImage: false,
            onInput: null
        }, options);

        this.editor = null;
        this.headingMenu = null;
        this._build();
    }

    /* ===== Build ===== */
    _build() {
        this.container.innerHTML = '';
        this.container.classList.add('rich-editor-root');

        // Toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'rich-toolbar';

        // --- Heading dropdown (optional) ---
        if (this.options.showHeading) {
            const dd = document.createElement('div');
            dd.className = 'heading-dropdown';
            const btn = document.createElement('button');
            btn.className = 'toolbar-btn';
            btn.title = '제목';
            btn.textContent = 'H';
            dd.appendChild(btn);

            const menu = document.createElement('div');
            menu.className = 'heading-menu';
            this.headingMenu = menu;

            const minLv = this.options.headingMinLevel;
            for (let lv = minLv; lv <= 3; lv++) {
                const sizes = { 1: 18, 2: 15, 3: 13 };
                const item = document.createElement('button');
                item.className = 'heading-menu-item';
                item.dataset.tag = 'h' + lv;
                item.innerHTML = '<b style="font-size:' + sizes[lv] + 'px">제목 ' + lv + '</b>';
                menu.appendChild(item);
            }
            // 본문
            const pItem = document.createElement('button');
            pItem.className = 'heading-menu-item';
            pItem.dataset.tag = 'p';
            pItem.textContent = '본문';
            menu.appendChild(pItem);
            dd.appendChild(menu);
            toolbar.appendChild(dd);

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                menu.classList.toggle('visible');
            });

            menu.querySelectorAll('.heading-menu-item').forEach(mi => {
                mi.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tag = mi.dataset.tag;
                    this.editor.focus();
                    document.execCommand('formatBlock', false, tag);
                    menu.classList.remove('visible');
                    this._fireInput();
                });
            });

            document.addEventListener('click', () => menu.classList.remove('visible'));

            toolbar.appendChild(this._sep());
        }

        // --- Text formatting ---
        toolbar.appendChild(this._btn('bold', '<b>B</b>', '굵게 (Ctrl+B)'));
        toolbar.appendChild(this._btn('italic', '<i>I</i>', '기울임 (Ctrl+I)'));
        toolbar.appendChild(this._btn('strikeThrough', '<s>S</s>', '취소선'));
        toolbar.appendChild(this._btn('code', '&lt;/&gt;', '인라인 코드', 'font-family:monospace;font-size:12px;'));

        toolbar.appendChild(this._sep());

        // --- Lists ---
        toolbar.appendChild(this._btn('insertUnorderedList', '•≡', '목록'));
        toolbar.appendChild(this._btn('insertOrderedList', '1.', '번호 목록'));

        toolbar.appendChild(this._sep());

        // --- Block ---
        toolbar.appendChild(this._btn('blockquote', '❝', '인용'));
        toolbar.appendChild(this._btn('codeBlock', '{}', '코드 블록', 'font-family:monospace;font-size:10px;'));
        toolbar.appendChild(this._btn('insertHorizontalRule', '―', '구분선'));

        toolbar.appendChild(this._sep());

        // --- Image (optional) ---
        if (this.options.showImage) {
            const imgBtn = document.createElement('button');
            imgBtn.className = 'toolbar-btn';
            imgBtn.title = '이미지 업로드';
            imgBtn.textContent = '🖼';
            const imgInput = document.createElement('input');
            imgInput.type = 'file';
            imgInput.accept = 'image/*';
            imgInput.multiple = true;
            imgInput.style.display = 'none';
            imgBtn.addEventListener('click', (e) => { e.preventDefault(); imgInput.click(); });
            imgInput.addEventListener('change', () => {
                Array.from(imgInput.files).forEach(f => this._handleImageFile(f));
                imgInput.value = '';
            });
            toolbar.appendChild(imgBtn);
            toolbar.appendChild(imgInput);
            this._imageInput = imgInput;
        }

        if (this.options.showImage) {
            toolbar.appendChild(this._sep());
        }

        // --- Undo / Redo ---
        toolbar.appendChild(this._btn('undo', '↩', '실행취소 (Ctrl+Z)'));
        toolbar.appendChild(this._btn('redo', '↪', '다시실행 (Ctrl+Y)'));

        this.container.appendChild(toolbar);

        // Editor area
        const editorContainer = document.createElement('div');
        editorContainer.className = 'rich-editor-container';
        const ed = document.createElement('div');
        ed.className = 'rich-editor-content';
        ed.contentEditable = 'true';
        ed.dataset.placeholder = this.options.placeholder;
        ed.addEventListener('input', () => this._fireInput());
        editorContainer.appendChild(ed);
        this.container.appendChild(editorContainer);
        this.editor = ed;

        // Markdown auto-format
        this._setupAutoFormat();

        // Image drop overlay (optional)
        if (this.options.showImage) {
            this._setupImageDragDrop();
        }
    }

    /* ===== Helpers ===== */
    _btn(cmd, html, title, style) {
        const b = document.createElement('button');
        b.className = 'toolbar-btn';
        b.dataset.cmd = cmd;
        b.title = title || '';
        b.innerHTML = html;
        if (style) b.setAttribute('style', style);
        b.addEventListener('click', (e) => {
            e.preventDefault();
            this.editor.focus();
            if (cmd === 'code') this._wrapSelectionWith('code');
            else if (cmd === 'blockquote') document.execCommand('formatBlock', false, 'blockquote');
            else if (cmd === 'codeBlock') this._insertCodeBlock();
            else document.execCommand(cmd, false, null);
            this._fireInput();
        });
        return b;
    }

    _sep() {
        const s = document.createElement('div');
        s.className = 'toolbar-sep';
        return s;
    }

    _fireInput() {
        if (this.options.onInput) this.options.onInput();
    }

    /* ===== Commands ===== */
    _wrapSelectionWith(tag) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        const el = document.createElement(tag);
        try { range.surroundContents(el); }
        catch (e) {
            el.textContent = selection.toString();
            range.deleteContents();
            range.insertNode(el);
        }
    }

    _insertCodeBlock() {
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
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            pre.parentNode.insertBefore(p, pre.nextSibling);
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
    }

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /* ===== Markdown Auto-Format ===== */
    _setupAutoFormat() {
        // Use keydown for both space and enter — more reliable than input event in webview
        this.editor.addEventListener('keydown', (e) => {
            if (e.key === ' ') {
                if (this._handleSpaceAutoFormat()) e.preventDefault();
            }
            if (e.key === 'Enter' && !e.shiftKey) {
                this._handleEnterAutoFormat(e);
            }
        });
    }

    _getBlockParent(node) {
        let current = node;
        while (current && current !== this.editor) {
            if (current.nodeType === Node.ELEMENT_NODE) {
                const tag = current.tagName;
                if (['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'PRE'].includes(tag)) return current;
            }
            current = current.parentNode;
        }
        return null;
    }

    /** Get current line text and its container (block element or direct text node) */
    _getCurrentLineInfo() {
        const sel = window.getSelection();
        if (!sel.rangeCount || !sel.isCollapsed) return null;

        let block = this._getBlockParent(sel.anchorNode);

        // Text typed directly in editor root without block wrapper
        if (!block) {
            const anchor = sel.anchorNode;
            if (anchor.nodeType === Node.TEXT_NODE && anchor.parentNode === this.editor) {
                return { text: anchor.textContent, node: anchor, isDirect: true };
            }
            return null;
        }

        const tag = block.tagName.toLowerCase();
        if (tag !== 'p' && tag !== 'div') return null;
        return { text: block.textContent, node: block, isDirect: false };
    }

    /** Clear current line content and apply formatting command */
    _applyFormat(info, formatCmd, formatArg) {
        const sel = window.getSelection();
        const range = document.createRange();
        if (info.isDirect) {
            range.selectNode(info.node);
        } else {
            range.selectNodeContents(info.node);
        }
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('delete', false, null);
        document.execCommand(formatCmd, false, formatArg);
        this._fireInput();
    }

    /**
     * Space key: check text BEFORE space is inserted.
     * Returns true if format was applied (caller should preventDefault).
     */
    _handleSpaceAutoFormat() {
        const info = this._getCurrentLineInfo();
        if (!info) return false;

        const text = info.text;
        let formatCmd = null;
        let formatArg = null;

        // Unordered list: "- " or "* "
        if (text === '-' || text === '*') {
            formatCmd = 'insertUnorderedList';
        }
        // Ordered list: "1." "2." etc.
        if (!formatCmd && /^\d+\.$/.test(text)) {
            formatCmd = 'insertOrderedList';
        }
        // Blockquote: ">"
        if (!formatCmd && text === '>') {
            formatCmd = 'formatBlock';
            formatArg = 'blockquote';
        }

        if (!formatCmd) return false;

        this._applyFormat(info, formatCmd, formatArg);
        return true;
    }

    /** Enter key: convert --- / *** / ___ to horizontal rule */
    _handleEnterAutoFormat(e) {
        const info = this._getCurrentLineInfo();
        if (!info) return;

        const text = info.text.trim();
        if (text === '---' || text === '***' || text === '___') {
            e.preventDefault();
            if (info.isDirect) info.node.remove();
            else info.node.remove();
            document.execCommand('insertHorizontalRule', false, null);
            this._fireInput();
        }
    }

    /* ===== Image drag & drop ===== */
    _setupImageDragDrop() {
        const overlay = document.createElement('div');
        overlay.className = 'rich-drop-overlay';
        overlay.textContent = '🖼 이미지를 여기에 놓으세요';
        this.container.style.position = 'relative';
        this.container.appendChild(overlay);
        this._dropOverlay = overlay;

        let dragCounter = 0;
        this.container.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
                overlay.classList.add('visible');
            }
        });
        this.container.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter <= 0) { dragCounter = 0; overlay.classList.remove('visible'); }
        });
        this.container.addEventListener('dragover', (e) => e.preventDefault());
        this.container.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            overlay.classList.remove('visible');
            Array.from(e.dataTransfer.files)
                .filter(f => f.type.startsWith('image/'))
                .forEach(f => this._handleImageFile(f));
        });

        // Paste
        this.editor.addEventListener('paste', (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) this._handleImageFile(file);
                    return;
                }
            }
        });
    }

    /* ===== Image inline insertion with resize ===== */
    _handleImageFile(file) {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let dataUri = e.target.result;
                const maxWidth = 512;
                if (img.width > maxWidth) {
                    const ratio = maxWidth / img.width;
                    const canvas = document.createElement('canvas');
                    canvas.width = maxWidth;
                    canvas.height = Math.round(img.height * ratio);
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    dataUri = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85);
                }
                this.editor.focus();
                document.execCommand('insertHTML', false,
                    '<img src="' + dataUri + '" alt="image" style="max-width:100%;"><br>');
                this._fireInput();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    /* ===== Public API ===== */
    getHtml() { return this.editor.innerHTML; }
    setHtml(html) { this.editor.innerHTML = html; }
    getText() { return this.editor.textContent || ''; }
    focus() { setTimeout(() => this.editor.focus(), 50); }
    setEditable(flag) { this.editor.contentEditable = flag ? 'true' : 'false'; }

    /* ===== Static: HTML → Markdown ===== */
    static htmlToMarkdown(root) {
        let md = '';

        function process(node, listType, listIndex, indent) {
            if (node.nodeType === Node.TEXT_NODE) return node.textContent;
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
                case 'h1': return '# ' + children().trim() + '\n\n';
                case 'h2': return '## ' + children().trim() + '\n\n';
                case 'h3': return '### ' + children().trim() + '\n\n';
                case 'p': {
                    const content = children().trim();
                    return content ? content + '\n\n' : '\n';
                }
                case 'br': return '\n';
                case 'strong': case 'b': return '**' + children() + '**';
                case 'em': case 'i': return '*' + children() + '*';
                case 's': case 'strike': case 'del': return '~~' + children() + '~~';
                case 'code': {
                    if (node.parentElement?.tagName?.toLowerCase() === 'pre') return children();
                    return '\x60' + children() + '\x60';
                }
                case 'pre': {
                    const codeContent = children().trim();
                    return '\x60\x60\x60\n' + codeContent + '\n\x60\x60\x60\n\n';
                }
                case 'blockquote': {
                    const lines = children().trim().split('\n');
                    return lines.map(l => '> ' + l).join('\n') + '\n\n';
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
                    return result + (indent === '' ? '\n' : '');
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
                    return result + (indent === '' ? '\n' : '');
                }
                case 'li': {
                    const prefix = listType === 'ol' ? (listIndex + 1) + '. ' : '- ';
                    const content = children().trim();
                    return indent + prefix + content + '\n';
                }
                case 'a': {
                    const href = node.getAttribute('href') || '';
                    const text = children().trim();
                    return '[' + text + '](' + href + ')';
                }
                case 'img': {
                    const alt = node.getAttribute('alt') || 'image';
                    const src = node.dataset.mdPath || node.getAttribute('src') || '';
                    return '![' + alt + '](' + src + ')';
                }
                case 'hr': return '---\n\n';
                case 'table': return RichEditor._processTable(node);
                case 'div': {
                    const content = children();
                    return content + (content.endsWith('\n') ? '' : '\n');
                }
                default: return children();
            }
        }

        for (const child of root.childNodes) {
            md += process(child, null, 0, '');
        }
        return md.replace(/\n{3,}/g, '\n\n').trim();
    }

    static _processTable(tableNode) {
        const rows = tableNode.querySelectorAll('tr');
        if (rows.length === 0) return '';
        let md = '';
        rows.forEach((row, i) => {
            const cells = row.querySelectorAll('th, td');
            const line = '| ' + Array.from(cells).map(c => c.textContent.trim()).join(' | ') + ' |';
            md += line + '\n';
            if (i === 0) {
                md += '| ' + Array.from(cells).map(() => '---').join(' | ') + ' |\n';
            }
        });
        return md + '\n';
    }

    /** Simple Markdown → HTML (for rendering body in viewer) */
    static markdownToHtml(md) {
        if (!md) return '';
        let html = md;

        html = html.replace(/\`\`\`([\s\S]*?)\`\`\`/g, (_, code) => {
            return '<pre><code>' + RichEditor._escapeHtmlStatic(code.trim()) + '</code></pre>';
        });
        html = html.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />');
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
        html = html.replace(/^---$/gm, '<hr>');
        html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^>\s?(.*)$/gm, '<blockquote>$1</blockquote>');
        html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

        html = html.replace(/^(\s*)[-*]\s+(.+)$/gm, (match, indent, text) => {
            const level = Math.floor(indent.length / 2);
            return '<li data-level="' + level + '">' + text + '</li>';
        });
        html = html.replace(/^(\s*)\d+\.\s+(.+)$/gm, (match, indent, text) => {
            const level = Math.floor(indent.length / 2);
            return '<oli data-level="' + level + '">' + text + '</oli>';
        });
        html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
        html = html.replace(/((?:<oli[^>]*>.*<\/oli>\n?)+)/g, (m) => {
            return '<ol>' + m.replace(/<\/?oli/g, (t) => t.replace('oli', 'li')) + '</ol>';
        });

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

    static _escapeHtmlStatic(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /* ===== Static: CSS ===== */
    static getStyles() {
        return `
        /* ===== Rich Editor Component ===== */
        .rich-editor-root {
            display: flex;
            flex-direction: column;
            flex: 1;
            overflow: hidden;
        }
        .rich-toolbar {
            display: flex;
            align-items: center;
            gap: 2px;
            padding: 4px 20px;
            border-bottom: 1px solid var(--vscode-widget-border);
            background: var(--vscode-editorWidget-background);
            flex-wrap: wrap;
            flex-shrink: 0;
        }
        .rich-toolbar .toolbar-btn {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            background: transparent;
            color: var(--vscode-editor-foreground);
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: background 0.15s;
        }
        .rich-toolbar .toolbar-btn:hover {
            background: var(--vscode-toolbar-hoverBackground, rgba(90,93,94,0.31));
        }
        .rich-toolbar .toolbar-btn.active {
            background: var(--vscode-toolbar-activeBackground, rgba(99,102,103,0.4));
            color: var(--vscode-textLink-foreground);
        }
        .rich-toolbar .toolbar-sep {
            width: 1px;
            height: 18px;
            background: var(--vscode-widget-border);
            margin: 0 4px;
        }

        /* Heading dropdown */
        .heading-dropdown { position: relative; display: inline-block; }
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
        .heading-menu-item:hover { background: var(--vscode-list-hoverBackground); }

        /* Editor container */
        .rich-editor-container {
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .rich-editor-content {
            flex: 1;
            padding: 12px 20px;
            overflow-y: auto;
            outline: none;
            font-size: 14px;
            line-height: 1.7;
            color: var(--vscode-editor-foreground);
        }
        .rich-editor-content:empty::before {
            content: attr(data-placeholder);
            color: var(--vscode-input-placeholderForeground);
            pointer-events: none;
        }
        .rich-editor-content:focus { outline: none; }
        .rich-editor-content h1 { font-size: 24px; font-weight: 700; margin: 16px 0 8px; }
        .rich-editor-content h2 { font-size: 18px; font-weight: 600; margin: 12px 0 6px; }
        .rich-editor-content h3 { font-size: 15px; font-weight: 600; margin: 10px 0 4px; }
        .rich-editor-content p { margin: 4px 0; }
        .rich-editor-content ul, .rich-editor-content ol { margin: 4px 0; padding-left: 24px; }
        .rich-editor-content li { margin: 2px 0; }
        .rich-editor-content blockquote {
            border-left: 3px solid var(--vscode-textLink-foreground);
            padding-left: 12px;
            margin: 8px 0;
            opacity: 0.85;
        }
        .rich-editor-content pre {
            background: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.2));
            padding: 10px;
            border-radius: 4px;
            margin: 8px 0;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 13px;
        }
        .rich-editor-content code {
            background: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.2));
            padding: 2px 5px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 13px;
        }
        .rich-editor-content pre code { background: none; padding: 0; }
        .rich-editor-content img { max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; cursor: pointer; }
        .rich-editor-content a { color: var(--vscode-textLink-foreground); text-decoration: underline; }
        .rich-editor-content hr { border: none; border-top: 1px solid var(--vscode-widget-border); margin: 10px 0; }
        .rich-editor-content table { border-collapse: collapse; margin: 8px 0; }
        .rich-editor-content th, .rich-editor-content td {
            border: 1px solid var(--vscode-widget-border);
            padding: 6px 10px;
            text-align: left;
        }
        .rich-editor-content th { background: var(--vscode-editorWidget-background); font-weight: 600; }

        /* Image drop overlay */
        .rich-drop-overlay {
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
        .rich-drop-overlay.visible { display: flex; }
        `;
    }
}
