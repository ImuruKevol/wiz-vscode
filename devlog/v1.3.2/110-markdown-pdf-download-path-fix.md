# 110. 마크다운 PDF 다운로드 경로 지정 수정 (v1.3.2)

## 개요
마크다운 뷰어 PDF 다운로드 시 ENOENT 에러가 발생하는 문제를 수정. 파일 저장 API를 `fs.writeFileSync` → `vscode.workspace.fs.writeFile`로 변경.

## 변경 사항

### 1. src/editor/editors/markdownViewerEditor.js - PDF 저장 로직 수정
- **`defaultUri` 변경**: `path.join(path.dirname(this.filePath), pdfName)` → `pdfName` (파일명만 사용)
  - 소스 파일 경로가 리모트/특수 경로일 때 `showSaveDialog`에서 잘못된 기본 경로가 설정되는 문제 방지
  - zip 다운로드(`fileManager.js`)와 동일한 패턴 적용
- **파일 쓰기 API 변경**: `fs.writeFileSync(uri.fsPath, buffer)` → `vscode.workspace.fs.writeFile(uri, buffer)`
  - Node.js `fs` 대신 VS Code 가상 파일시스템 API 사용으로 리모트 환경 호환성 확보
- **`title` 추가**: 저장 다이얼로그에 "PDF 저장 위치 선택" 타이틀 표시
- **완료 메시지 개선**: 저장된 파일명을 메시지에 포함
