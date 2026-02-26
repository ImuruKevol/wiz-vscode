# 107. 마크다운 PDF 다운로드 수정 (v1.3.2)

## 개요
마크다운 뷰어의 PDF 다운로드 기능이 동작하지 않는 문제를 수정. html2pdf.js 로드 방식과 데이터 전송 방식을 전면 개선.

## 변경 사항

### 1. html2pdf.js 로드 방식 변경 (인라인 → 외부 스크립트)
- 기존: `fs.readFileSync()`로 ~946KB 번들을 읽어 `<script>${html2pdfJs}</script>`로 템플릿 리터럴에 인라인
- 문제: 번들 내 `${}`, 백틱 문자가 템플릿 리터럴과 충돌하여 HTML 깨짐
- 수정: `webview.asWebviewUri()`로 외부 스크립트 URI 생성 → `<script src="${html2pdfUri}"></script>`로 로드
- `localResourceRoots`에 `node_modules` 경로 추가하여 웹뷰에서 접근 허용

### 2. 웹뷰 패널 생성 방식 변경
- 기존: `EditorBase.createPanel()` (localResourceRoots 미지원)
- 수정: `vscode.window.createWebviewPanel()` 직접 호출, `localResourceRoots: [nodeModulesUri]` 옵션 포함
- `onDidDispose` 핸들러 수동 등록

### 3. PDF 데이터 전송 방식 변경 (Array → Base64)
- 기존: `Array.from(new Uint8Array(pdfBuffer))` — 수십만 원소의 배열을 JSON 직렬화
- 수정: ArrayBuffer → Uint8Array → chunked String.fromCharCode → `btoa()` base64 인코딩
- Extension 측: `Buffer.from(message.data, 'base64')`로 디코딩

### 4. 에러 핸들링 강화
- Extension 측 `downloadPdf` 핸들러에 try-catch 추가
- Webview의 html2pdf catch에서 `pdfError` 메시지 전송
- Extension 측 `pdfError` 핸들러 추가 — `showErrorMessage`로 사용자에게 에러 표시
