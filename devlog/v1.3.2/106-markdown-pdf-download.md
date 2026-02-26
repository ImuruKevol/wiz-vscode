# 106. 마크다운 프리뷰 PDF 다운로드 기능 (v1.3.2)

## 개요
마크다운 뷰어에 PDF 다운로드 버튼을 추가하여 현재 보이는 마크다운 콘텐츠를 PDF로 변환 및 저장하는 기능 구현.

## 변경 사항

### 1. html2pdf.js 의존성 추가
- `html2pdf.js` npm 패키지 설치 (html2canvas + jsPDF 번들)
- `package.json`의 dependencies에 추가

### 2. markdownViewerEditor.js - PDF 다운로드 버튼 추가
- 편집하기(✏️) 버튼 왼쪽에 📥 PDF 버튼 배치
- `.header-right`에 `display: flex; gap: 6px` 스타일 적용하여 버튼 간격 조정

### 3. markdownViewerEditor.js - PDF 생성 로직
- html2pdf.js 번들을 `fs.readFileSync`로 읽어 webview에 인라인 `<script>` 태그로 삽입
- 클릭 시 html2pdf.js로 `.markdown-body` 영역을 A4 PDF로 변환
- PDF 옵션: A4 세로, 여백 10mm, 2x 스케일, 흰색 배경
- 변환 중 버튼 텍스트 "⏳ 변환 중..." 표시 후 완료 시 원래 텍스트로 복원

### 4. markdownViewerEditor.js - PDF 저장 처리
- webview → extension `downloadPdf` 메시지 핸들러 추가
- `vscode.window.showSaveDialog`로 저장 위치 선택 (기본 파일명: 원본파일명.pdf)
- `Buffer.from(data)` → `fs.writeFileSync`로 PDF 파일 저장
- 저장 완료 시 정보 메시지 표시
