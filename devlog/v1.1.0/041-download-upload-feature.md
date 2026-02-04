# 041. 다운로드/업로드 기능

## 개요
파일, 폴더, 패키지, 앱에 대한 다운로드 기능과 앱 업로드 기능을 구현했습니다.

## 변경 사항

### 1. 다운로드 기능 개선

#### wizExplorer.downloadFile 커맨드
- `vscode.window.showSaveDialog` 사용하여 저장 위치 직접 선택
- Remote 환경 지원을 위해 OS tmp 디렉토리에 먼저 압축 후 `vscode.workspace.fs.writeFile`로 복사
- 파일 종류별 확장자 자동 설정:
  - `.wizpkg` - Portal 패키지
  - `.wizapp` - App 아이템
  - `.zip` - 일반 폴더
  - 원본 확장자 - 일반 파일

#### context 메뉴 조건 업데이트 (package.json)
```json
"when": "viewItem == file || viewItem == folder || viewItem == portalPackage || viewItem == appItem"
```

### 2. Export Package 메뉴 제거
- context 메뉴에서 `wizExplorer.exportPackage` 제거
- 다운로드 기능으로 대체 (직접 다운로드 방식)

### 3. 앱 업로드 기능 추가

#### wizExplorer.uploadApp 커맨드
- Webview를 통한 로컬 파일 선택 (Remote 환경 지원)
- HTML5 FileReader API로 파일 읽어 Base64 인코딩
- 드래그 앤 드롭 지원
- `.wizapp` 파일만 허용

#### 업로드 후 앱 생성 흐름
- Standard App: 타입 선택 → namespace/title/category/controller 입력 → (page인 경우) layout/viewuri 입력
- Portal App: namespace/title/category/controller 입력
- 업로드된 파일에서 app.json 제외하고 복사, 새 app.json 생성

### 4. package.json 변경

#### 새 커맨드 추가
```json
{
    "command": "wizExplorer.uploadApp",
    "title": "App 업로드",
    "icon": "$(cloud-upload)"
}
```

#### context 메뉴 추가
- `appGroup`, `portalAppGroup`에 "App 업로드" 메뉴 추가

## 기술적 세부사항

### Remote 환경 파일 처리
1. 로컬 PC에서 파일 선택 → FileReader로 Base64 인코딩
2. Webview → Extension으로 postMessage 전송
3. Extension에서 Buffer.from(base64)로 디코딩
4. OS tmp 디렉토리에 저장 후 압축 해제
5. 앱 생성 완료 후 임시 파일 정리

### archiver 모듈 사용
```javascript
const archiver = require('archiver');
archive.glob('**/*', { cwd: sourcePath }, { prefix: folderName });
```
