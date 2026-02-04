# 047. 파일 업로드 기능 추가

## 개요
폴더에 파일/폴더를 업로드할 수 있는 기능을 추가했습니다. Webview를 통해 다중 파일 및 폴더 업로드를 지원하며, Remote 환경에서도 정상 작동합니다.

## 변경 사항

### 1. UploadWebview.getMultiUploadHtml() 메서드 추가
**파일:** `src/core/uploadWebview.js`

다중 파일/폴더 업로드용 Webview HTML 템플릿:
- 파일 선택 버튼
- 폴더 선택 버튼
- 드래그 앤 드롭 지원
- 선택된 파일 목록 표시
- 진행률 표시

### 2. FileManager.upload() 메서드 추가
**파일:** `src/services/file/fileManager.js`

```javascript
async upload(targetDir, context) {
    // Webview 패널 생성
    // 파일 수신 및 저장
    // 트리 새로고침
}
```

### 3. wizExplorer.uploadFile 커맨드 추가
**파일:** `src/extension.js`

```javascript
['wizExplorer.uploadFile', async (node) => {
    await fileManager.upload(node.resourceUri.fsPath, context);
}]
```

### 4. 컨텍스트 메뉴 추가
**파일:** `package.json`

```json
{
    "command": "wizExplorer.uploadFile",
    "title": "업로드...",
    "icon": "$(cloud-upload)"
}
```

표시 조건:
- `folder`
- `configCategory`
- `copilotCategory`
- `sourceRootFolder`
- `portalRootFolder`

## 기술적 세부사항

### 파일 처리 흐름
1. 사용자가 파일/폴더 선택 또는 드래그 앤 드롭
2. FileReader API로 파일을 Base64 인코딩
3. postMessage로 Extension에 전송
4. Extension에서 Buffer.from(base64)로 디코딩
5. 대상 폴더에 파일 저장
6. 트리 새로고침

### 폴더 구조 유지
- `webkitRelativePath` 또는 `webkitGetAsEntry`로 상대 경로 추출
- 하위 폴더 자동 생성
- 원본 폴더 구조 그대로 업로드
