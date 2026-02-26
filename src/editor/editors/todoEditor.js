/**
 * TODO Editor — 리치 텍스트 기반 TODO 작성 Webview
 * RichEditor 컴포넌트를 사용하여 WYSIWYG 에디터로 TODO를 작성하고
 * Markdown으로 변환하여 Copilot Chat에 전달
 */

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const EditorBase = require('./editorBase');

class TodoEditor extends EditorBase {
    static _instance = null;

    constructor(context, taskBasePath) {
        super(context);
        this.taskBasePath = taskBasePath; // .github/task
    }

    onDispose() {
        TodoEditor._instance = null;
    }

    async open() {
        if (TodoEditor._instance && TodoEditor._instance.panel) {
            TodoEditor._instance.panel.reveal(vscode.ViewColumn.Active);
            return;
        }

        this.createPanel('wizTodoEditor', 'TODO 작성', vscode.ViewColumn.Active);
        TodoEditor._instance = this;
        this.panel.webview.html = this.generateHtml();

        this.panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
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
     * 생성 버튼 클릭 시 — Markdown을 Copilot Chat으로 전달
     */
    async handleSubmit(markdown) {
        if (!markdown || !markdown.trim()) {
            vscode.window.showWarningMessage('내용을 입력해주세요.');
            return;
        }

        const query = `아래 내용을 분석해서 TODO 작성해줘.\n\n${markdown}`;
        try {
            await vscode.commands.executeCommand('workbench.action.chat.open', { query, mode: 'agent' });
            this.dispose();
        } catch (e) {
            vscode.window.showWarningMessage(
                'Copilot Chat을 열 수 없습니다. GitHub Copilot Chat 확장이 설치되어 있는지 확인해주세요.',
                '확인'
            );
        }
    }

    generateHtml() {
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
            padding: 10px 24px;
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
            align-items: center;
            gap: 8px;
        }

        /* ===== Buttons ===== */
        .btn {
            padding: 5px 14px;
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

        .word-count {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
    <style id="richEditorStyles"></style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <h1><span class="icon">📋</span> TODO 작성</h1>
        <div class="header-actions">
            <span class="word-count" id="wordCount">0자</span>
            <button class="btn btn-secondary" id="btnCancel">취소</button>
            <button class="btn btn-primary" id="btnSubmit">✨ TODO 생성</button>
        </div>
    </div>

    <!-- Rich Editor Container -->
    <div id="editorRoot" style="flex:1;display:flex;flex-direction:column;overflow:hidden;"></div>

    <script>
        ${richEditorJs}

        // Inject rich editor styles
        document.getElementById('richEditorStyles').textContent = RichEditor.getStyles();

        const vscode = acquireVsCodeApi();
        const wordCount = document.getElementById('wordCount');

        // ========== Rich Editor 초기화 ==========
        const richEditor = new RichEditor(document.getElementById('editorRoot'), {
            placeholder: 'TODO 내용을 작성하세요...\\n\\n서식 도구모음을 사용하거나 이미지를 드래그하여 첨부할 수 있습니다.',
            showImage: true,
            onInput: () => {
                updateWordCount();
                saveState();
            }
        });

        // ========== Word Count ==========
        function updateWordCount() {
            const text = richEditor.getText();
            const count = text.replace(/\\s/g, '').length;
            wordCount.textContent = count + '자';
        }

        // ========== Submit & Cancel ==========
        document.getElementById('btnSubmit').addEventListener('click', () => {
            const markdown = RichEditor.htmlToMarkdown(richEditor.editor);
            vscode.postMessage({
                command: 'submit',
                markdown: markdown
            });
        });

        document.getElementById('btnCancel').addEventListener('click', () => {
            vscode.postMessage({ command: 'close' });
        });

        // ========== State persistence ==========
        const previousState = vscode.getState();
        if (previousState) {
            if (previousState.html) richEditor.setHtml(previousState.html);
            updateWordCount();
        }

        function saveState() {
            vscode.setState({ html: richEditor.getHtml() });
        }

        // Focus editor on load
        richEditor.focus();
    </script>
</body>
</html>`;
    }
}

module.exports = TodoEditor;
