# 114. 마크다운 PDF 다운로드 기능 제거 (v1.3.3)

## 개요
마크다운 뷰어에서 PDF 다운로드 관련 기능 전체 제거 및 html2pdf.js 패키지 정리.

## 변경 사항

### 1. src/editor/editors/markdownViewerEditor.js - PDF 기능 전체 제거
- `open()`: `downloadPdf`, `pdfError` 메시지 핸들러 제거
- `open()`: `localResourceRoots`를 위한 커스텀 `createWebviewPanel` → `EditorBase.createPanel()` 기본 메서드로 복원
- `_generateHtml()`: html2pdf.js URI 생성 코드 제거
- HTML: `📥 PDF` 버튼 제거 (편집하기 버튼만 유지)
- JS: html2pdf.js `<script src>` 태그 및 PDF 변환 로직 전체 제거

### 2. package.json - html2pdf.js 의존성 제거
- `dependencies`에서 `"html2pdf.js": "^0.14.0"` 제거
- `npm uninstall html2pdf.js` 실행으로 node_modules 정리
