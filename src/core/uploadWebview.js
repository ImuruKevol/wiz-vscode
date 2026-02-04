/**
 * Upload Webview Templates
 * 파일 업로드용 Webview HTML 템플릿
 */

class UploadWebview {
    /**
     * 파일 업로드 Webview HTML 생성
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
}

module.exports = UploadWebview;
