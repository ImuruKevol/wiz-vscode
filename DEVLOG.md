# Wiz VSCode Extension - Development Log

## 개요
Wiz Framework 프로젝트를 위한 VS Code 익스텐션 개발 이력입니다.

---

## 작업 이력

> 각 작업의 상세 내용은 [devlog/](./devlog/) 디렉토리의 개별 파일을 참고하세요.

### v1.4.1 (MCP appPath Resolution & Verification)

- [139](./devlog/v1.4.1/139-mcp-verification-report.md) - MCP 기능 전체 검증 보고서 작성 (54개 도구 전수 검증)
- [138](./devlog/v1.4.1/138-mcp-instructions-tool-names.md) - MCP 인스트럭션 도구명 불일치 수정 (~30건 v3.0 네이밍 반영)
- [137](./devlog/v1.4.1/137-mcp-list-apppath-field.md) - MCP list 도구 appPath 상대경로 필드 추가
- [136](./devlog/v1.4.1/136-mcp-apppath-descriptions.md) - MCP appPath 파라미터 설명 보강 (16개 도구 형식 예시)
- [135](./devlog/v1.4.1/135-mcp-resolve-app-path.md) - MCP _resolveAppPath 경로 해석 개선 (10단계 탐색)

### v1.4.0 (Editor Sync, MCP Restructuring & Non-WIZ Support)

- [134](./devlog/v1.4.0/134-non-wiz-recognition-fix.md) - 비-WIZ 프로젝트 인식 로직 재점검 (기본값 false, 조건 강화, 초기 컨텍스트)
- [133](./devlog/v1.4.0/133-non-wiz-view-improvement.md) - 비-WIZ 프로젝트 뷰 개선 (Info 뷰 README+version, Explorer 메시지 개선)
- [132](./devlog/v1.4.0/132-task-instruction-improvement.md) - 작업 관리 인스트럭션 적용 기능 개선 (프롬프트 상세화, 즉시 정리 원칙 등)
- [131](./devlog/v1.4.0/131-mcp-modular-restructure.md) - MCP 소스코드 디렉토리 구조 리팩토링 (1673줄 → 7개 모듈, 프로토타입 믹스인 패턴)
- [130](./devlog/v1.4.0/130-mcp-state-sync.md) - MCP 프로젝트 스위칭 UI 동기화 (FileSystemWatcher 기반 상태 파일 감시)
- [129](./devlog/v1.4.0/129-non-wiz-project-support.md) - 비-WIZ 프로젝트 기능 지원 (작업관리/인스트럭션 뷰 유지, WIZ 전용 항목 조건부 숨김)
- [128](./devlog/v1.4.0/128-view-refresh-buttons.md) - 뷰 액션 새로고침 버튼 추가 (wizExplorer, wizTask, wizInstruction)
- [127](./devlog/v1.4.0/127-copilot-confirm-dialog.md) - Copilot Chat 메시지 전송 확인창 추가 (6개소 모달 확인 대화상자)
- [126](./devlog/v1.4.0/126-mcp-restructuring.md) - MCP 구조 리팩토링 — 4개 카테고리 체계 전환 (8→4 카테고리, 36→54 도구)
- [125](./devlog/v1.4.0/125-rich-editor-paste-fix.md) - RichEditor 복사 붙여넣기 수정 (Selection/Range API 전환)
- [124](./devlog/v1.4.0/124-rich-editor-improvements.md) - Rich Editor 개선 (목록 depth, 소스코드 보기, 붙여넣기 서식 정리)
- [123](./devlog/v1.4.0/123-todo-selection-feature.md) - TODO 목록 선택 시작 기능 (체크박스, 해시태그 바, 선택 실행)
- [122](./devlog/v1.4.0/122-editor-sync-vscode-events.md) - 에디터 파일 동기화 — VS Code 이벤트 기반 재구현
- [121](./devlog/v1.4.0/121-editor-realtime-refresh.md) - 에디터 실시간 새로고침 (fs.watch 전환, 마크다운 뷰어 적용)
- [120](./devlog/v1.4.0/120-editor-file-sync-refresh-fix.md) - 에디터 파일 동기화 새로고침 동작 수정 (디바운스, onDidCreate, 가시성 갱신)
- [119](./devlog/v1.4.0/119-editor-file-sync.md) - 에디터 외부 파일 변경 자동 동기화 (무한루프 방지 전략 적용)

### v1.3.3 (Memo Feature & Copilot Chat Agent Mode)

- [118](./devlog/v1.3.3/118-copilot-chat-agent-mode.md) - Copilot Chat Agent 모드 및 attachFiles API 적용
- [117](./devlog/v1.3.3/117-memo-todo-apply-fix.md) - 메모 TODO 반영 동작 수정 및 작업관리 메뉴 상태 유지
- [116](./devlog/v1.3.3/116-memo-edit-button-and-worked-count.md) - 메모 기본 편집기 버튼 추가 및 검토필요 파일 개수 표시
- [115](./devlog/v1.3.3/115-memo-feature.md) - 메모 기능 구현 (MemoViewerEditor, TODO 반영 기능)
- [114](./devlog/v1.3.3/114-remove-pdf-download.md) - 마크다운 PDF 다운로드 기능 제거 및 html2pdf.js 패키지 정리
- [113](./devlog/v1.3.3/113-instruction-view-action-buttons.md) - 인스트럭션 뷰 액션 버튼 재구성 (통합 메뉴 + 파일/폴더 생성)
- [112](./devlog/v1.3.3/112-task-view-naming-order.md) - 작업관리 하위 구조 순서 및 명칭 변경 (TODO/검토필요/완료됨)
- [111](./devlog/v1.3.3/111-info-view-readme.md) - Info 뷰 README 기능 구현 (프리뷰/생성)
- [110](./devlog/v1.3.3/110-markdown-pdf-download-path-fix.md) - 마크다운 PDF 다운로드 경로 지정 수정 (vscode.workspace.fs API 전환)
- [109](./devlog/v1.3.3/109-mcp-readme-categorization.md) - MCP 기능 README 카테고리별 정리 (8개 카테고리, 36개 도구)
- [108](./devlog/v1.3.3/108-markdown-viewer-download-button-verify.md) - 마크다운 뷰어 다운로드 버튼 복원 확인
- [107](./devlog/v1.3.3/107-markdown-pdf-download-fix.md) - 마크다운 PDF 다운로드 수정 (외부 스크립트 로드, base64 전송)
- [106](./devlog/v1.3.3/106-markdown-pdf-download.md) - 마크다운 프리뷰 PDF 다운로드 기능
- [105](./devlog/v1.3.3/105-action-button-position-adjustment.md) - 액션 버튼 위치 조정 (Explorer → Info 뷰 이동)

### v1.3.2 (TODO Viewer & Explorer Panel Redesign)
- [104](./devlog/v1.3.2/104-instruction-improvements.md) - 인스트럭션 Git clone 로직 변경, 업로드 추가, 아이콘 변경
- [103](./devlog/v1.3.2/103-task-upload-and-worked-click.md) - 작업관리 업로드 기능, worked 폴더 클릭 시 리뷰 에디터 열기
- [102](./devlog/v1.3.2/102-explorer-panel-download.md) - 탐색기 패널 다운로드 기능 (작업관리, 인스트럭션)
- [101](./devlog/v1.3.2/101-multi-select-delete.md) - 파일 다중 선택 삭제 기능
- [100](./devlog/v1.3.2/100-explorer-panel-separation.md) - 탐색기 패널(뷰) 분리 (Info, 작업 관리, 인스트럭션, Explorer)
- [099](./devlog/v1.3.2/099-markdown-viewer-remarkable.md) - 마크다운 뷰어 remarkable + highlight.js 전환
- [098](./devlog/v1.3.2/098-explorer-panel-merge.md) - 탐색기 패널 통합 (wizCopilot + wizExplorer → 단일 뷰)
- [097](./devlog/v1.3.2/097-markdown-viewer-showdown.md) - 마크다운 뷰어 showdown + github-markdown-css 라이브러리 전환
- [096](./devlog/v1.3.2/096-instruction-confirm-and-markdown-viewer.md) - 인스트럭션 확인창 변경 및 GitHub 스타일 마크다운 뷰어 구현
- [095](./devlog/v1.3.2/095-action-button-and-editor-ui-improvements.md) - 액션버튼 QuickPick 통합, 리뷰 에디터 UX 개선, 인스트럭션 마법사 아키텍처 분석 추가
- [094](./devlog/v1.3.2/094-autoformat-fix-and-review-editor.md) - RichEditor 자동변환 keydown 전환 및 worked 리뷰 에디터 구현
- [093](./devlog/v1.3.2/093-richeditor-autoformat-fix-and-image-blob.md) - RichEditor 자동변환 수정 및 이미지 blob 삽입 방식 전환
- [092](./devlog/v1.3.2/092-richeditor-improvements-and-mcp-fix.md) - RichEditor 개선, TODO 뷰어 기능 보강, MCP 빌드 환경 수정
- [091](./devlog/v1.3.2/091-editor-component-separation.md) - 에디터 컴포넌트 분리 및 TODO 뷰어 개선 (RichEditor 추출, 삭제 버튼, 인라인 편집)
- [090](./devlog/v1.3.2/090-todo-viewer-overhaul.md) - TODO 목록 뷰어 전면 개편 (렌더링 버그, 리치 에디터, 싱글톤, 레이아웃 재설계)
- [089](./devlog/v1.3.2/089-todo-viewer-improvements.md) - TODO 뷰어/에디터 UI 개선 5종 (글자수 정렬, 기본뷰어, 숫자 페이지네이션, 추가 동작, 리뷰 반영)
- [088](./devlog/v1.3.2/088-todo-viewer-editor.md) - todo.md 에디터 뷰어 (페이지네이션, 추가/저장/마크다운 보기/작업 시작)
- [087](./devlog/v1.3.2/087-todo-editor-ui-layout.md) - TODO 에디터 UI 레이아웃 개선 (헤더로 버튼 이동, 제목 제거, 프롬프트 변경)
- [086](./devlog/v1.3.2/086-todo-editor-webview.md) - TODO 생성 기능 개선: Webview 리치 에디터 (이미지 업로드, Markdown 변환)
- [085](./devlog/v1.3.2/085-mcp-copilot-infinite-loop-fix.md) - MCP Configuration / Copilot 탐색기 무한루프 수정 (getParent 경계 가드, auto-reveal 가드, 디바운스)

### v1.3.1 (Copilot Explorer & Task Management)

- [084](./devlog/v1.3.1/084-copilot-explorer-refresh-fix.md) - Copilot Explorer 메모리 누수 수정 (블랭킷 리스너 제거, 타겟팅 refresh)
- [083](./devlog/v1.3.1/083-todo-wizard.md) - TODO 생성 마법사 추가 및 작업 관리 버튼 순서 정렬
- [082](./devlog/v1.3.1/082-task-category-wizard-buttons.md) - 작업 관리 카테고리에 리뷰 정리 마법사/작업 실행 버튼 추가
- [081](./devlog/v1.3.1/081-instruction-wizard-improvements.md) - 인스트럭션 마법사 이름 변경, 중복 방지, 버튼 위치 이동
- [080](./devlog/v1.3.1/080-instruction-copilot-chat-integration.md) - 인스트럭션 생성 방식을 Copilot 채팅 연동으로 변경
- [079](./devlog/v1.3.1/079-copilot-source-menu-restructure.md) - Copilot/Source 메뉴 구성 변경 (뷰 순서, 카테고리 정리)
- [078](./devlog/v1.3.1/078-task-management-instruction.md) - 작업 관리 카테고리 및 인스트럭션 자동 생성 기능
- [077](./devlog/v1.3.1/077-copilot-explorer-menu.md) - WIZ Copilot 탐색기 메뉴 구현 (Instruction, 작업 관리 카테고리)

### v1.3.0 (MCP Native Delegation & Auto Update)

- [076](./devlog/v1.3.0/076-mcp-native-delegation-and-version-update.md) - MCP 네이티브 위임 (cp.spawn 제거), GitHub vsix 자동 업데이트, 버전 상태 표시
- [075](./devlog/v1.3.0/075-mcp-state-sync-and-github-import.md) - MCP 상태 동기화 개선, mcp.json 자동 생성, Git에서 .github 불러오기
- [074](./devlog/v1.3.0/074-session-based-state-management.md) - 세션 기반 MCP 상태 관리 (다중 인스턴스 충돌 방지, 7일 만료 자동 정리)
- [073](./devlog/v1.3.0/073-settings-category-and-ux-improvements.md) - Settings 카테고리 전면 구축, MCP 설정 메뉴/상태 동기화, 프로젝트명 복사, 빌드 UX 개선
- [072](./devlog/v1.3.0/072-mcp-config-version-sync-and-explorer-footer.md) - MCP 설정 버전/경로 자동 동기화, mcp.json 유무 기반 메뉴 노출 정리, 탐색기 하단 버전 푸터 추가

### v1.2.2 (Route Title Display & MCP Dependency Management)

- [071](./devlog/v1.2.2/071-mcp-dependency-management.md) - MCP pip/npm 패키지 관리 도구 추가 (6개 도구: 설치, 제거, 목록 조회)
- [070](./devlog/v1.2.2/070-route-title-display.md) - Route/Portal App 트리 아이템 Title 표시 (ID → Title 전환)

### v1.2.1 (MCP Explorer Sync & Config)

- [069](./devlog/v1.2.1/069-mcp-path-auto-resolve.md) - MCP 경로 자동 해석 (상대경로 → 프로젝트 루트 기준 절대경로 변환)
- [068](./devlog/v1.2.1/068-mcp-explorer-project-sync.md) - MCP-Explorer 프로젝트 동기화 (상태 파일 기반 양방향 연동)
- [067](./devlog/v1.2.1/067-mcp-config-auto-save.md) - MCP 설정 파일 자동 저장 (.vscode/mcp.json) 및 Create/Show 동적 전환
- [066](./devlog/v1.2.1/066-mcp-menu-integration.md) - MCP 서버 시작/중지/설정을 Wiz Explorer 상단 메뉴에 통합
- [065](./devlog/v1.2.1/065-mcp-server-tool-expansion.md) - MCP 서버 도구 16개→29개 확장 (파일시스템, 포탈앱, 검색, 헬퍼 등)
- [064](./devlog/v1.2.1/064-current-project-command.md) - 에이전트 모드용 Current Project 커맨드 추가

### v1.2.0 (Python 환경 자동 탐색 & 패키지 관리)

- [063](./devlog/v1.2.0/063-explorer-stability-improvements.md) - 탐색기 안정성 개선 (디바운스 refresh, findItem 루프 방지, auto-reveal 안전장치)
- [062](./devlog/v1.2.0/062-pip-package-manager.md) - pip 패키지 관리 Webview 에디터 추가
- [061](./devlog/v1.2.0/061-npm-package-manager.md) - npm 패키지 관리 Webview 에디터 추가
- [060](./devlog/v1.2.0/060-python-env-autodiscovery.md) - Python 환경 자동 탐색 및 QuickPick 선택, 설정 메뉴 구조 변경

### v1.1.3 (Infinite Loop Fix & Save Performance)

- [059](./devlog/v1.1.3/059-file-save-performance-fix.md) - 파일 저장 후 트리 탐색 무한 로딩 방지 및 빌드 디바운싱, Auto-Reveal 안전장치
- [058](./devlog/v1.1.3/058-infinite-loop-fix.md) - 무한루프 방지 및 트리 안정성 개선 (디바운스 refresh, findItem 범위 제한, 편집 추적 정리)

### v1.1.2 (Save Watcher & Category Fix)

- [057](./devlog/v1.1.2/057-copilot-config-category-fix.md) - Copilot/Config 카테고리 경로 동적 반환 및 파일 조작/드래그 앤 드롭 수정
- [056](./devlog/v1.1.2/056-save-watcher-refactoring.md) - 저장 시 자동 빌드 로직 BuildManager로 이동 및 이벤트 방식 개선

### v1.1.1 (ktw updated)

- [055](./devlog/v1.1.1/055-source-angular-duplicate-id-fix.md) - Source Angular 트리 ID 중복으로 인한 확장 오류 수정
- [054](./devlog/v1.1.1/054-keyboard-navigation-and-wiz-tab-label-fix.md) - 키보드 네비게이션 개편
- [053](./devlog/v1.1.1/053-build-python-environment-fallback.md) - 자동 빌드 Python 환경 선택 및 Wiz 실행 경로 개선
- [052](./devlog/v1.1.1/052-save-trigger-build-and-wiz-uri-fix.md) - 저장 시 실제 변경 기반 자동 빌드 및 Wiz URI 호환성 개선
- [051](./devlog/v1.1.1/051-auto-build-condition-fix.md) - Wiz 탭 활성화 이후 자동 빌드 조건 처리 개선

### v1.1.0 (Configs & Improvements & Refactoring)

- [050](./devlog/v1.1.0/050-explorer-bug-fix.md) - 탐색기 오류 수정 및 정렬 개선
- [049](./devlog/v1.1.0/049-project-export-download.md) - 프로젝트 내보내기 다운로드 방식 변경
- [048](./devlog/v1.1.0/048-extension-refactoring.md) - Extension.js 비즈니스 로직 완전 분리
- [047](./devlog/v1.1.0/047-file-upload-feature.md) - 파일/폴더 업로드 기능 추가
- [046](./devlog/v1.1.0/046-copilot-category.md) - Copilot 카테고리 추가 (.github 폴더 접근)
- [045](./devlog/v1.1.0/045-folder-protection.md) - Source/Packages 루트 폴더 보호 기능
- [044](./devlog/v1.1.0/044-services-hierarchy-restructure.md) - Services 계층 구조 재구성 (7개 폴더 → 3개 계층 폴더)
- [043](./devlog/v1.1.0/043-services-refactoring.md) - Services 레이어 리팩토링 (비즈니스 로직 분리, 아키텍처 문서화)
- [042](./devlog/v1.1.0/042-core-refactoring.md) - Core 모듈 리팩토링 (AppCreator, ZipUtils, UploadWebview 클래스 분리)
- [041](./devlog/v1.1.0/041-download-upload-feature.md) - 다운로드/업로드 기능 구현 (.wizpkg, .wizapp 지원)
- [040](./devlog/v1.1.0/040-explorer-sorting-improvements.md) - 탐색기 정렬 및 표시 개선
- [039](./devlog/v1.1.0/039-config-category-update.md) - Config 카테고리 추가 및 탐색기 구조 개선

### v1.0.0 (Initial Release)

#### 커맨드 팔레트 지원
- [038](./devlog/v1.0.0/038-command-palette-improvements.md) - 커맨드 팔레트 기능 개선 및 버그 수정
- [037](./devlog/v1.0.0/037-command-palette.md) - 커맨드 팔레트에서 주요 기능 접근 지원

#### 프로젝트 내보내기/가져오기
- [036](./devlog/v1.0.0/036-project-export-import.md) - 프로젝트 내보내기 및 .wizproject 파일 가져오기 기능

#### View Type 기능
- [035](./devlog/v1.0.0/035-view-type-selection.md) - View Type 선택 기능 (pug/html), 기본 타입 HTML로 변경

#### 패키지 관리 및 빌드
- [034](./devlog/v1.0.0/034-package-management.md) - 패키지 생성/내보내기, 빌드 트리거, App/Route 생성 다이얼로그 방식 변경

#### 프로젝트 관리 기능
- [033](./devlog/v1.0.0/033-app-title-display.md) - App 트리 아이템 표기 개선
- [032](./devlog/v1.0.0/032-project-deletion.md) - 프로젝트 삭제 기능 추가
- [031](./devlog/v1.0.0/031-project-import.md) - 프로젝트 불러오기 기능 추가

#### 탐색기 기능 강화
- [030](./devlog/v1.0.0/030-auto-reveal.md) - 탐색기 자동 하이라이팅 구현
- [029](./devlog/v1.0.0/029-portal-app-path-label.md) - Portal App 에디터 경로 개선
- [028](./devlog/v1.0.0/028-portal-default-folders.md) - Portal 기본 폴더 자동 표시
- [027](./devlog/v1.0.0/027-multi-select.md) - 다중 선택 기능 추가
- [026](./devlog/v1.0.0/026-drag-and-drop.md) - 드래그 앤 드롭 기능 추가

#### Route 앱 생성 기능
- [025](./devlog/v1.0.0/025-route-creation.md) - Route 앱 생성 기능 구현

#### UI/UX 개선
- [024](./devlog/v1.0.0/024-source-route-group-removal.md) - Source app/route 그룹 제거
- [023](./devlog/v1.0.0/023-explorer-ui-cleanup.md) - 탐색기 상단 UI 정리
- [022](./devlog/v1.0.0/022-portal-folder-icons.md) - Portal 패키지 폴더 아이콘 통일

#### Portal App 에디터 및 생성 기능
- [021](./devlog/v1.0.0/021-portal-route-controller.md) - Portal Route Controller 경로 수정
- [020](./devlog/v1.0.0/020-portal-app-creation.md) - Portal App 생성 기능
- [019](./devlog/v1.0.0/019-portal-app-editor.md) - Portal App 에디터 구현

#### 에디터 코드 리팩토링
- [018](./devlog/v1.0.0/018-editor-refactoring.md) - AppEditorProvider 분리

#### Portal/Packages 개선
- [017](./devlog/v1.0.0/017-portal-info-editor.md) - Portal Info 에디터 구현
- [016](./devlog/v1.0.0/016-portal-category.md) - Portal 카테고리 개선

#### Route 앱 지원
- [015](./devlog/v1.0.0/015-route-ui-improvements.md) - Route 앱 UI 개선
- [014](./devlog/v1.0.0/014-namespace-sync.md) - Namespace 변경 시 폴더명/ID 자동 변경
- [013](./devlog/v1.0.0/013-route-info-editor.md) - Route Info 에디터 구현
- [012](./devlog/v1.0.0/012-route-support.md) - Route 앱 지원 추가

#### 버그 수정 및 개선
- [011](./devlog/v1.0.0/011-split-view-fix.md) - 창 분할 시 Wiz 탭 복원 버그 수정
- [010](./devlog/v1.0.0/010-refactoring.md) - 전체 코드 리팩토링
- [009](./devlog/v1.0.0/009-keyboard-shortcuts-fix.md) - Alt+1-6 단축키 버그 수정

#### 초기 개발 (기반 기능 구현)
- [008](./devlog/v1.0.0/008-keyboard-shortcuts.md) - Alt+1-6 단축키 구현
- [007](./devlog/v1.0.0/007-delete.md) - Delete 기능 구현
- [006](./devlog/v1.0.0/006-new-app.md) - New App 기능 구현
- [005](./devlog/v1.0.0/005-info-editor.md) - Info Editor 구현
- [004](./devlog/v1.0.0/004-app-editor-provider.md) - App Editor Provider 구현
- [003](./devlog/v1.0.0/003-file-system-provider.md) - File System Provider 구현
- [002](./devlog/v1.0.0/002-tree-view.md) - Tree View 구현
- [001](./devlog/v1.0.0/001-project-setup.md) - 프로젝트 초기 설정

---

## 현재 지원 기능

### src/core/ (신규)
```
src/core/
├── constants.js      # 중앙화된 상수
├── pathUtils.js      # 경로 유틸리티
├── fileUtils.js      # 파일 유틸리티
├── uriFactory.js     # URI 팩토리
├── webviewTemplates.js # HTML 템플릿
└── index.js          # 모듈 exports
```

### src/editor/
- `appEditorProvider.js` - Facade 패턴, 에디터 인스턴스 관리
- `appContextListener.js` - appCategory 컨텍스트 추가
- `wizFileSystemProvider.js` - 경로 유틸리티 사용
- `editors/editorBase.js` - 공통 Webview 패널 관리
- `editors/appEditor.js` - 일반 앱 Info 에디터
- `editors/routeEditor.js` - Route 앱 Info 에디터
- `editors/portalEditor.js` - Portal Info 에디터
- `editors/portalAppEditor.js` - Portal App 에디터

### src/explorer/
- `fileExplorerProvider.js` - Flat App Types, 패키지 폴더 정렬, 가상 폴더 지원
- `models/categoryHandlers.js` - packages 라벨 변경, routeGroup 컨텍스트
- `appPatternProcessor.js` - 상수 사용
- `wizDragAndDropController.js` - 드래그 앤 드롭 컨트롤러

### package.json
- keybindings when 조건 수정
- Controller 커맨드 추가
- 메뉴 조건 분기 (appCategory)

---

## 현재 지원 기능

### App 타입
| 타입 | 위치 | 탭 구성 |
|------|------|---------|
| page | app/page.* | Info, UI, Component, SCSS, API, Socket |
| component | app/component.* | Info, UI, Component, SCSS, API, Socket |
| layout | app/layout.* | Info, UI, Component, SCSS, API, Socket |
| route | route/* | Info, Controller |

### 키보드 단축키
| 단축키 | 기능 |
|--------|------|
| Alt+1 | Info 탭 |
| Alt+2 | UI / Controller 탭 |
| Alt+3 | Component 탭 |
| Alt+4 | SCSS 탭 |
| Alt+5 | API 탭 |
| Alt+6 | Socket 탭 |

### 트리뷰 구조
```
Project (프로젝트명)
├── source (src/)
│   ├── page 그룹
│   ├── component 그룹
│   ├── layout 그룹
│   ├── route/
│   ├── controller/
│   └── 기타 폴더들
├── packages (src/portal/)
│   └── 패키지명/
│       ├── info (portal.json)
│       ├── app/           # 아이콘: layers
│       ├── route/         # 아이콘: circuit-board
│       ├── controller/    # 아이콘: symbol-method
│       ├── model/         # 아이콘: symbol-method
│       ├── assets/        # 아이콘: folder-library
│       ├── libs/          # 아이콘: library
│       ├── styles/        # 아이콘: symbol-color
│       └── ...
├── config (config/)
└── project (루트/)
    └── 기타 파일들 (config 제외)
```

---

## 향후 개선 사항

### 기본 기능 완성
- [ ] 패키지 생성 기능
- [x] Route 앱 생성 기능 (Source/Portal Route 지원)
- [x] Portal App 생성 기능
- [x] 드래그 앤 드롭 파일 이동
- [x] 다중 파일 선택
- [x] Portal 기본 폴더 자동 표시
- [ ] 검색 기능 (파일/앱 이름 빠른 검색)
- [ ] Git 상태 표시 (변경/추가/삭제 파일 아이콘)

### 빌드 & 개발 워크플로우
- [ ] Wiz CLI 명령어 연동
  - [ ] 빌드 실행 (`wiz build`)
  - [ ] 개발 서버 시작/중지 (`wiz run`)
  - [ ] 배포 명령 (`wiz deploy`)
  - [ ] 상태바에 빌드 상태 표시
  - [ ] 빌드 에러/경고 Problems 패널 연동
- [ ] Wiz API 서버 연동
  - [ ] 실시간 앱 목록 동기화
  - [ ] 서버 상태 모니터링
  - [ ] Hot Reload 지원

### MCP (Model Context Protocol) 기능
- [ ] VSCode WIZ MCP Server 구현
  - [ ] Wiz 프로젝트 구조 분석 제공
  - [ ] App/Route/Controller 정보 컨텍스트 제공
  - [ ] 코드 생성 지원 (템플릿 기반)
  - [ ] AI 기반 앱 구조 추천
- [ ] GitHub Copilot 연동
  - [ ] Wiz Framework 특화 코드 제안
  - [ ] app.json 스키마 자동완성

### 에디터 & 뷰어 기능
- [ ] 프리뷰 기능
  - [ ] 앱 실시간 미리보기 (iframe)
  - [ ] Route 경로 시뮬레이션
  - [ ] 모바일/태블릿 뷰포트 전환
- [ ] 코드 에디터 개선
  - [ ] Pug/HTML 구문 강조 개선
  - [ ] SCSS IntelliSense
  - [ ] Python Controller 자동완성
  - [ ] TypeScript/JavaScript 타입 정의

### 디버깅 & 테스팅
- [ ] 디버거 연동
  - [ ] Python Controller 디버깅
  - [ ] 브레이크포인트 지원
  - [ ] 변수 Inspector
- [ ] 테스트 러너
  - [ ] 단위 테스트 실행
  - [ ] E2E 테스트 지원
  - [ ] 테스트 커버리지 표시

### 협업 & 문서화
- [ ] 앱 문서 자동 생성
  - [ ] app.json 기반 문서화
  - [ ] API 엔드포인트 목록 추출
  - [ ] 의존성 그래프 시각화
- [ ] 팀 협업 기능
  - [ ] 앱 변경 이력 추적
  - [ ] 코드 리뷰 연동
  - [ ] 배포 승인 워크플로우

### 성능 & 최적화
- [ ] 대규모 프로젝트 지원
  - [ ] 가상 스크롤링 (수백개 앱 처리)
  - [ ] 지연 로딩 (Lazy Loading)
  - [ ] 캐싱 전략 개선
- [ ] 번들 크기 최적화 분석
- [ ] 의존성 중복 감지

### 확장성
- [ ] 플러그인 시스템
  - [ ] 커스텀 App 타입 등록
  - [ ] 에디터 확장 API
  - [ ] 테마/아이콘 커스터마이징
- [ ] 설정 관리
  - [ ] 프로젝트별 설정 프로파일
  - [ ] 팀 공유 설정 지원
