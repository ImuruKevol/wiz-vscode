/**
 * Upload Webview Templates
 * 파일/폴더 업로드용 Webview HTML 템플릿
 */

class UploadWebview {
    /**
     * 파일 업로드 Webview HTML 생성 (단일 파일, 특정 확장자)
     * @param {Object} options - 옵션
     * @param {string} options.title - 제목
     * @param {string} options.acceptExtension - 허용할 파일 확장자 (예: '.wizapp')
     * @param {string} options.description - 설명 텍스트
     * @returns {string} HTML 문자열
     */
    static getUploadHtml(options = {}) {
        const {
            title = '파일 업로드',
            acceptExtension = '.wizapp',
            description = `${acceptExtension} 파일만 지원`
        } = options;

        return `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: var(--vscode-font-family); padding: 20px; }
        .upload-area { 
            border: 2px dashed var(--vscode-input-border); 
            padding: 40px; 
            text-align: center; 
            margin: 20px 0;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        .upload-area:hover { 
            border-color: var(--vscode-focusBorder);
            background: var(--vscode-list-hoverBackground);
        }
        .upload-area.dragover { 
            background: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-focusBorder);
        }
        input[type="file"] { display: none; }
        .status { margin-top: 20px; color: var(--vscode-descriptionForeground); }
        .status.error { color: var(--vscode-errorForeground); }
        .status.success { color: var(--vscode-testing-iconPassed); }
        h2 { color: var(--vscode-foreground); margin-bottom: 20px; }
        .icon { font-size: 32px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <h2>${title}</h2>
    <div class="upload-area" id="dropZone">
        <div class="icon">📁</div>
        <p>클릭하거나 파일을 드래그하여 업로드</p>
        <p style="font-size: 12px; color: var(--vscode-descriptionForeground);">${description}</p>
    </div>
    <input type="file" id="fileInput" accept="${acceptExtension}" />
    <div class="status" id="status"></div>
    
    <script>
        const vscode = acquireVsCodeApi();
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const status = document.getElementById('status');
        const expectedExtension = '${acceptExtension}';
        
        dropZone.addEventListener('click', () => fileInput.click());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        });
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFile(file);
        });
        
        function handleFile(file) {
            if (!file.name.endsWith(expectedExtension)) {
                status.textContent = '오류: ' + expectedExtension + ' 파일만 업로드 가능합니다.';
                status.className = 'status error';
                return;
            }
            
            status.textContent = '파일 읽는 중...';
            status.className = 'status';
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const arrayBuffer = e.target.result;
                const uint8Array = new Uint8Array(arrayBuffer);
                
                // 대용량 파일을 위한 청크 방식 Base64 인코딩
                let binary = '';
                const chunkSize = 8192;
                for (let i = 0; i < uint8Array.length; i += chunkSize) {
                    const chunk = uint8Array.subarray(i, i + chunkSize);
                    binary += String.fromCharCode.apply(null, chunk);
                }
                const base64 = btoa(binary);
                
                status.textContent = '업로드 중...';
                vscode.postMessage({
                    command: 'uploadFile',
                    fileName: file.name,
                    fileData: base64
                });
            };
            reader.onerror = () => {
                status.textContent = '파일 읽기 실패';
                status.className = 'status error';
            };
            reader.readAsArrayBuffer(file);
        }
    </script>
</body>
</html>`;
    }

    /**
     * 다중 파일/폴더 업로드 Webview HTML 생성
     * @param {Object} options - 옵션
     * @param {string} options.title - 제목
     * @param {string} options.targetPath - 업로드 대상 경로 (표시용)
     * @returns {string} HTML 문자열
     */
    static getMultiUploadHtml(options = {}) {
        const {
            title = '파일 업로드',
            targetPath = ''
        } = options;

        return `<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            font-family: var(--vscode-font-family); 
            padding: 20px; 
            color: var(--vscode-foreground);
        }
        h2 { margin-bottom: 10px; }
        .target-path {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 20px;
            word-break: break-all;
        }
        .upload-area { 
            border: 2px dashed var(--vscode-input-border); 
            padding: 40px; 
            text-align: center; 
            margin: 20px 0;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        .upload-area:hover { 
            border-color: var(--vscode-focusBorder);
            background: var(--vscode-list-hoverBackground);
        }
        .upload-area.dragover { 
            background: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-focusBorder);
        }
        .upload-area.uploading {
            opacity: 0.6;
            pointer-events: none;
        }
        input[type="file"] { display: none; }
        .btn-group {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 15px;
        }
        .btn {
            padding: 8px 16px;
            border: 1px solid var(--vscode-button-border, var(--vscode-input-border));
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        }
        .btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .btn-primary:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .file-list {
            max-height: 200px;
            overflow-y: auto;
            margin: 20px 0;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
        }
        .file-item {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            border-bottom: 1px solid var(--vscode-input-border);
            font-size: 13px;
        }
        .file-item:last-child {
            border-bottom: none;
        }
        .file-item .icon {
            margin-right: 8px;
        }
        .file-item .path {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .file-item .size {
            color: var(--vscode-descriptionForeground);
            margin-left: 10px;
            font-size: 11px;
        }
        .file-item .remove {
            margin-left: 10px;
            cursor: pointer;
            color: var(--vscode-errorForeground);
            opacity: 0.7;
        }
        .file-item .remove:hover {
            opacity: 1;
        }
        .status { 
            margin-top: 20px; 
            color: var(--vscode-descriptionForeground);
            text-align: center;
        }
        .status.error { color: var(--vscode-errorForeground); }
        .status.success { color: var(--vscode-testing-iconPassed); }
        .icon-large { font-size: 32px; margin-bottom: 10px; }
        .progress-container {
            margin-top: 15px;
            display: none;
        }
        .progress-bar {
            height: 4px;
            background: var(--vscode-input-border);
            border-radius: 2px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: var(--vscode-progressBar-background);
            width: 0%;
            transition: width 0.3s ease;
        }
        .progress-text {
            font-size: 12px;
            margin-top: 5px;
            text-align: center;
            color: var(--vscode-descriptionForeground);
        }
        .empty-hint {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            padding: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <h2>${title}</h2>
    <div class="target-path">📁 ${targetPath}</div>
    
    <div class="upload-area" id="dropZone">
        <div class="icon-large">📤</div>
        <p>파일 또는 폴더를 드래그하거나 아래 버튼을 클릭하세요</p>
        <div class="btn-group">
            <button class="btn" id="btnFiles">파일 선택</button>
            <button class="btn" id="btnFolder">폴더 선택</button>
        </div>
    </div>
    
    <input type="file" id="fileInput" multiple />
    <input type="file" id="folderInput" webkitdirectory />
    
    <div class="file-list" id="fileList" style="display: none;">
    </div>
    
    <div class="progress-container" id="progressContainer">
        <div class="progress-bar">
            <div class="progress-fill" id="progressFill"></div>
        </div>
        <div class="progress-text" id="progressText">0%</div>
    </div>
    
    <div style="text-align: center; margin-top: 20px;">
        <button class="btn btn-primary" id="btnUpload" style="display: none;">업로드</button>
    </div>
    
    <div class="status" id="status"></div>
    
    <script>
        const vscode = acquireVsCodeApi();
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const folderInput = document.getElementById('folderInput');
        const fileList = document.getElementById('fileList');
        const btnFiles = document.getElementById('btnFiles');
        const btnFolder = document.getElementById('btnFolder');
        const btnUpload = document.getElementById('btnUpload');
        const status = document.getElementById('status');
        const progressContainer = document.getElementById('progressContainer');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        let pendingFiles = [];
        
        btnFiles.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
        
        btnFolder.addEventListener('click', (e) => {
            e.stopPropagation();
            folderInput.click();
        });
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        
        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            
            const items = e.dataTransfer.items;
            if (items) {
                const entries = [];
                for (let i = 0; i < items.length; i++) {
                    const entry = items[i].webkitGetAsEntry();
                    if (entry) entries.push(entry);
                }
                await processEntries(entries);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            addFiles(Array.from(e.target.files));
        });
        
        folderInput.addEventListener('change', (e) => {
            addFiles(Array.from(e.target.files));
        });
        
        async function processEntries(entries) {
            const files = [];
            
            async function traverse(entry, path = '') {
                if (entry.isFile) {
                    return new Promise((resolve) => {
                        entry.file((file) => {
                            file.relativePath = path + file.name;
                            files.push(file);
                            resolve();
                        });
                    });
                } else if (entry.isDirectory) {
                    const reader = entry.createReader();
                    const subEntries = await new Promise((resolve) => {
                        reader.readEntries(resolve);
                    });
                    for (const subEntry of subEntries) {
                        await traverse(subEntry, path + entry.name + '/');
                    }
                }
            }
            
            for (const entry of entries) {
                await traverse(entry);
            }
            
            addFiles(files);
        }
        
        function addFiles(files) {
            for (const file of files) {
                const relativePath = file.relativePath || file.webkitRelativePath || file.name;
                if (!pendingFiles.find(f => f.relativePath === relativePath)) {
                    pendingFiles.push({
                        file: file,
                        relativePath: relativePath,
                        size: file.size
                    });
                }
            }
            renderFileList();
        }
        
        function renderFileList() {
            if (pendingFiles.length === 0) {
                fileList.style.display = 'none';
                btnUpload.style.display = 'none';
                return;
            }
            
            fileList.style.display = 'block';
            btnUpload.style.display = 'inline-block';
            
            fileList.innerHTML = pendingFiles.map((f, idx) => {
                const isFolder = f.relativePath.includes('/');
                const icon = isFolder ? '📄' : '📄';
                const size = formatSize(f.size);
                return '<div class="file-item">' +
                    '<span class="icon">' + icon + '</span>' +
                    '<span class="path" title="' + f.relativePath + '">' + f.relativePath + '</span>' +
                    '<span class="size">' + size + '</span>' +
                    '<span class="remove" data-idx="' + idx + '">✕</span>' +
                '</div>';
            }).join('');
            
            fileList.querySelectorAll('.remove').forEach(el => {
                el.addEventListener('click', (e) => {
                    const idx = parseInt(e.target.dataset.idx);
                    pendingFiles.splice(idx, 1);
                    renderFileList();
                });
            });
        }
        
        function formatSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }
        
        btnUpload.addEventListener('click', async () => {
            if (pendingFiles.length === 0) return;
            
            dropZone.classList.add('uploading');
            btnUpload.style.display = 'none';
            progressContainer.style.display = 'block';
            status.textContent = '파일 준비 중...';
            status.className = 'status';
            
            const filesData = [];
            let processed = 0;
            
            for (const item of pendingFiles) {
                try {
                    const base64 = await readFileAsBase64(item.file);
                    filesData.push({
                        relativePath: item.relativePath,
                        data: base64
                    });
                } catch (err) {
                    console.error('File read error:', err);
                }
                
                processed++;
                const percent = Math.round((processed / pendingFiles.length) * 100);
                progressFill.style.width = percent + '%';
                progressText.textContent = '파일 읽는 중... ' + percent + '%';
            }
            
            status.textContent = '업로드 중...';
            progressText.textContent = '업로드 중...';
            
            vscode.postMessage({
                command: 'uploadFiles',
                files: filesData
            });
        });
        
        function readFileAsBase64(file) {
            return new Promise((resolve, reject) => {
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
                    resolve(btoa(binary));
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            });
        }
        
        window.addEventListener('message', (e) => {
            const msg = e.data;
            if (msg.command === 'uploadComplete') {
                status.textContent = msg.message || '업로드 완료!';
                status.className = 'status success';
                progressFill.style.width = '100%';
                progressText.textContent = '완료!';
                pendingFiles = [];
                setTimeout(() => {
                    vscode.postMessage({ command: 'close' });
                }, 1000);
            } else if (msg.command === 'uploadError') {
                status.textContent = msg.message || '업로드 실패';
                status.className = 'status error';
                dropZone.classList.remove('uploading');
                btnUpload.style.display = 'inline-block';
            }
        });
    </script>
</body>
</html>`;
    }
}

module.exports = UploadWebview;
