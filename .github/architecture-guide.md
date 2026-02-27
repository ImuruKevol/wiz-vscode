# Wiz VSCode Extension - Architecture & Refactoring Guide

## 철학 (Philosophy)

이 문서는 Wiz VSCode Extension 개발 시 따라야 할 아키텍처 원칙과 리팩토링 가이드를 정의합니다.

### 핵심 원칙

1. **관심사 분리 (Separation of Concerns)**
   - UI 로직과 비즈니스 로직을 명확히 분리
   - extension.js는 "접착제(glue)" 역할만 수행
   - 실제 작업은 전문화된 모듈에 위임

2. **단일 책임 원칙 (Single Responsibility Principle)**
   - 각 모듈/클래스는 하나의 명확한 책임만 가짐
   - 파일 크기가 300줄을 넘으면 분리 검토

3. **의존성 주입 (Dependency Injection)**
   - 하드코딩된 의존성 대신 생성자/옵션으로 주입
   - 테스트 가능성과 유연성 향상

---

## 프로젝트 구조

```
src/
├── extension.js          # 진입점 - 초기화 및 커맨드 등록만
├── core/                 # 공통 유틸리티 (상태 없음)
│   ├── constants.js      # 상수 정의
│   ├── pathUtils.js      # 경로 파싱 유틸리티
│   ├── fileUtils.js      # 파일 I/O 유틸리티
│   ├── uriFactory.js     # URI 생성 팩토리
│   ├── webviewTemplates.js
│   ├── zipUtils.js
│   └── uploadWebview.js
├── services/             # 비즈니스 로직 레이어 (계층 구조)
│   ├── project/          # 프로젝트 레벨 (상위)
│   │   ├── projectManager.js   # 프로젝트 수명주기
│   │   ├── buildManager.js     # 빌드 관리
│   │   └── mcpManager.js       # MCP 서버 관리
│   ├── app/              # 앱 레벨 (중위)
│   │   ├── sourceManager.js    # Source 카테고리 앱
│   │   ├── packageManager.js   # Package 카테고리 앱
│   │   └── navigationManager.js # 앱 탐색/위치 선택
│   └── file/             # 파일 레벨 (하위)
│       └── fileManager.js      # 파일 작업
├── explorer/             # Tree View 관련
│   ├── fileExplorerProvider.js
│   ├── appPatternProcessor.js
│   ├── wizDragAndDropController.js
│   ├── models/
│   └── treeItems/
├── editor/               # 에디터 관련
│   ├── appEditorProvider.js
│   ├── appContextListener.js
│   ├── wizFileSystemProvider.js
│   └── editors/
└── mcp/                  # MCP 서버 엔트리포인트
```

---

## 서비스 계층 구조 (Services Hierarchy)

서비스 레이어는 **상하위 관계**에 따라 계층적으로 구성됩니다. 연관된 기능은 동일 폴더에 배치하여 복잡성을 줄입니다.

### 계층 구조 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                    project/ (상위 레벨)                      │
│  프로젝트 전체 수명주기를 관리하는 기능                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ProjectManager│ │BuildManager │ │ McpManager  │           │
│  │ 전환/가져오기 │ │ 빌드 실행   │ │ MCP 서버    │           │
│  │ 내보내기/삭제 │ │ Clean Build │ │ 시작/중지   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      app/ (중위 레벨)                        │
│  개별 앱 생성/관리 및 탐색 기능                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐       │
│  │SourceManager│ │PackageManager│ │NavigationManager│       │
│  │ Source 앱   │ │ Package 앱  │ │  앱 탐색/위치   │       │
│  │ page/layout │ │ portal app  │ │  goToApp 등    │       │
│  └─────────────┘ └─────────────┘ └─────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     file/ (하위 레벨)                        │
│  개별 파일 작업을 처리하는 기능                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    FileManager                       │   │
│  │  생성 / 삭제 / 복사 / 붙여넣기 / 이름 변경 / 다운로드   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 계층별 책임

| 레벨 | 폴더 | 책임 | Manager 클래스 |
|------|------|------|----------------|
| **상위** | `project/` | 프로젝트 전체 수명주기 | `ProjectManager`, `BuildManager`, `McpManager` |
| **중위** | `app/` | 개별 앱 생성/관리 | `SourceManager`, `PackageManager`, `NavigationManager` |
| **하위** | `file/` | 파일 단위 작업 | `FileManager` |

### 계층 배치 원칙

1. **상위 기능이 하위 기능을 포함**: 빌드(build)는 프로젝트(project)의 하위 기능이므로 `project/` 폴더에 배치
2. **관련 기능은 동일 폴더**: Navigation은 앱 탐색 기능이므로 `app/` 폴더에 배치
3. **독립적 기능만 별도 폴더**: 파일 작업은 앱/프로젝트에 종속되지 않으므로 `file/` 폴더 유지

### 새 Manager 추가 시 결정 기준

```
새 기능이 프로젝트 전체에 영향을 미치는가?
    └─ Yes → project/ 폴더
    └─ No  → 새 기능이 특정 앱 생성/관리와 관련있는가?
                 └─ Yes → app/ 폴더
                 └─ No  → 파일 단위 작업인가?
                              └─ Yes → file/ 폴더
                              └─ No  → 새 폴더 생성 검토
```

---

## 레이어 책임

### 1. Extension (extension.js)

**역할:** 진입점, 초기화, 커맨드 등록

```javascript
// ✅ Good - 위임만 수행
['wizExplorer.delete', async (node) => {
    await fileManager.delete(node.resourceUri.fsPath, { ... });
}]

// ❌ Bad - 직접 로직 구현
['wizExplorer.delete', async (node) => {
    const confirm = await vscode.window.showWarningMessage(...);
    if (confirm === '삭제') {
        fs.rmSync(path, { recursive: true });
        // ... 20줄 이상의 로직
    }
}]
```

### 2. Services Layer

**역할:** 비즈니스 로직 캡슐화

각 서비스는:
- 하나의 도메인/카테고리 담당
- VS Code API 직접 사용 가능 (UI 표시)
- 상태를 가질 수 있음 (clipboard 등)
- 콜백으로 외부와 통신

```javascript
class FileManager {
    constructor(options = {}) {
        this.onRefresh = options.onRefresh || (() => {});
        this.getWorkspaceRoot = options.getWorkspaceRoot;
        this.clipboard = null;  // 상태 보유 가능
    }

    async delete(targetPath, options = {}) {
        // 비즈니스 로직 + UI 상호작용
        const confirm = await vscode.window.showWarningMessage(...);
        if (confirm === '삭제') {
            fs.rmSync(targetPath, { recursive: true });
            options.onDeleted?.(targetPath);  // 콜백 호출
            this.onRefresh();
        }
    }
}
```

### 3. Core Layer

**역할:** 순수 유틸리티 함수 (상태 없음)

```javascript
// ✅ Good - 순수 함수
class WizPathUtils {
    static parseAppFolder(folderPath) {
        // 입력 → 출력, 부작용 없음
        return { appType, category, ... };
    }
}

// ❌ Bad - 상태 보유
class WizPathUtils {
    static lastParsedPath = null;  // 상태 보유 금지
}
```

### 4. Explorer Layer

**역할:** Tree View 데이터 및 표시 로직

- `FileExplorerProvider`: 트리 데이터 제공
- `treeItems/`: 트리 아이템 클래스
- `models/`: 카테고리 핸들러

### 5. Editor Layer

**역할:** Webview 에디터 및 파일 시스템

- Facade 패턴 사용 (`AppEditorProvider`)
- 각 에디터 타입별 클래스 분리

---

## 리팩토링 가이드

### 새 기능 추가 시

1. **계층 식별**: 어느 레벨에 속하는가?
   - 프로젝트 수명주기 관련 → `services/project/`
   - 앱 생성/관리 관련 → `services/app/`
   - 파일 작업 관련 → `services/file/`

2. **Manager에 메서드 추가**
   ```javascript
   // services/file/fileManager.js
   async rename(oldPath, options = {}) {
       // 구현
   }
   ```

3. **extension.js에서 위임**
   ```javascript
   ['wizExplorer.rename', async (node) => {
       await fileManager.rename(node.resourceUri.fsPath, { ... });
   }]
   ```

### 기존 코드 리팩토링 시

1. **300줄 규칙**: 파일이 300줄 초과 시 분리 검토
2. **중복 제거**: 동일 로직이 2곳 이상 → 유틸리티로 추출
3. **콜백 패턴**: 모듈 간 통신은 콜백/이벤트 사용

### Manager 클래스 템플릿

```javascript
/**
 * [Domain]Manager - [도메인 설명]
 */

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { /* 필요한 core 모듈 */ } = require('../../core');

class DomainManager {
    /**
     * @param {Object} options
     * @param {string} options.workspaceRoot - 워크스페이스 루트
     * @param {Function} options.onRefresh - 새로고침 콜백
     */
    constructor(options = {}) {
        this.workspaceRoot = options.workspaceRoot;
        this.onRefresh = options.onRefresh || (() => {});
    }

    /**
     * 기능 설명
     * @param {string} param - 파라미터 설명
     * @returns {Promise<boolean>} 성공 여부
     */
    async doSomething(param) {
        // 구현
        this.onRefresh?.();
        return true;
    }
}

module.exports = DomainManager;
```

---

## 네이밍 컨벤션

### 파일명
- Manager 클래스: `[domain]Manager.js` (camelCase)
- 유틸리티: `[name]Utils.js`
- 상수: `constants.js`

### 클래스/함수명
- Manager 클래스: `[Domain]Manager` (PascalCase)
- 유틸리티 클래스: `Wiz[Name]Utils`
- 프롬프트 메서드: `prompt[Entity]Inputs()`
- 생성 메서드: `create[Entity]()`
- 표시 메서드: `show[Entity]Webview()`

### index.js 패턴

각 서비스 폴더에 index.js로 export:

```javascript
// services/project/index.js
const ProjectManager = require('./projectManager');
const BuildManager = require('./buildManager');
const McpManager = require('./mcpManager');

module.exports = {
    ProjectManager,
    BuildManager,
    McpManager
};

// services/app/index.js
const SourceManager = require('./sourceManager');
const PackageManager = require('./packageManager');
const NavigationManager = require('./navigationManager');

module.exports = {
    SourceManager,
    PackageManager,
    NavigationManager
};

// services/index.js (통합)
const { ProjectManager, BuildManager, McpManager } = require('./project');
const { SourceManager, PackageManager, NavigationManager } = require('./app');
const { FileManager } = require('./file');

module.exports = {
    // Project Level
    ProjectManager, BuildManager, McpManager,
    // App Level
    SourceManager, PackageManager, NavigationManager,
    // File Level
    FileManager
};
```

---

## 테스트 가능성

의존성 주입으로 테스트 용이성 확보:

```javascript
// 테스트에서
const manager = new FileManager({
    onRefresh: mockRefresh,
    getWorkspaceRoot: () => '/test/workspace'
});

// 프로덕션에서
const manager = new FileManager({
    onRefresh: () => fileExplorerProvider.refresh(),
    getWorkspaceRoot: () => fileExplorerProvider.workspaceRoot
});
```

---

## 에디터 파일 동기화 가이드라인

Webview 에디터에서 파일의 외부 변경을 감지하여 자동 갱신할 때, **무한루프 방지**를 반드시 적용해야 합니다.

### 문제 시나리오

```
에디터 저장(handleSave) → fs.writeFileSync → VS Code가 디스크 변경 감지
→ onDidChangeTextDocument 트리거 → webview 갱신 → (만약 갱신 시 자동 저장하면)
→ 다시 handleSave → 무한루프
```

### 필수 구현 패턴

#### 1. `_isSaving` 플래그로 자기 저장 이벤트 필터링

```javascript
// 생성자에서 초기화
constructor(context, filePath) {
    super(context);
    this.filePath = filePath;
    this._disposables = [];          // VS Code 이벤트 구독 정리용
    this._refreshDebounceTimer = null;
    this._isSaving = false;          // 필수
}

// handleSave에서 플래그 설정
async handleSave(markdown) {
    try {
        this._isSaving = true;  // 저장 시작 전 플래그 ON
        fs.writeFileSync(this.filePath, markdown, 'utf8');
        // ... postMessage 등 후처리
        setTimeout(() => { this._isSaving = false; }, 500);  // 지연 해제 (이벤트와의 경합 방지)
    } catch (e) {
        this._isSaving = false;  // 에러 시에도 반드시 해제
        // ... 에러 처리
    }
}
```

#### 2. VS Code 이벤트 기반 파일 동기화

> **참고**: `vscode.workspace.createFileSystemWatcher`와 Node.js `fs.watch()`는 특정 환경에서
> 이벤트가 발생하지 않는 문제가 확인되었습니다. VS Code 텍스트 문서 이벤트를 사용하면
> VS Code 에디터에서 편집 시 저장 전에도 실시간으로 변경을 감지할 수 있습니다.

```javascript
// 단일 파일 감시
this._disposables.push(
    // 편집 중(미저장) 변경 감지 — 실시간 동기화
    vscode.workspace.onDidChangeTextDocument((e) => {
        if (this._isSaving) return;                          // 자기 저장이면 무시
        if (e.document.uri.scheme !== 'file') return;        // 파일 스킴만 처리
        if (e.document.uri.fsPath !== this.filePath) return; // 대상 파일만 필터링
        if (e.contentChanges.length === 0) return;           // 메타데이터 변경 무시
        if (this._refreshDebounceTimer) clearTimeout(this._refreshDebounceTimer);
        this._refreshDebounceTimer = setTimeout(() => {
            this.postMessage({ command: 'refreshContent', content: e.document.getText() });
        }, 300);
    }),
    // 저장 시 확정 갱신
    vscode.workspace.onDidSaveTextDocument((doc) => {
        if (this._isSaving) return;
        if (doc.uri.fsPath !== this.filePath) return;
        const content = this.loadContent();
        this.postMessage({ command: 'refreshContent', content });
    })
);

// 패널 가시성 변경 시 최신화 (탭 전환 복귀 시 fallback)
this.panel.onDidChangeViewState(() => {
    if (this.panel && this.panel.visible && !this._isSaving) {
        const content = this.loadContent();
        this.postMessage({ command: 'refreshContent', content });
    }
});
```

#### 3. 콘텐츠 로드 시 문서 버퍼 우선 사용

```javascript
loadContent() {
    try {
        // VS Code에서 열린 문서가 있으면 버퍼 내용 우선 사용 (미저장 변경 포함)
        const openDoc = vscode.workspace.textDocuments.find(
            doc => doc.uri.fsPath === this.filePath
        );
        if (openDoc) return openDoc.getText();
        if (fs.existsSync(this.filePath)) {
            return fs.readFileSync(this.filePath, 'utf8');
        }
    } catch (e) { /* ignore */ }
    return '';
}
```

#### 4. 디렉토리 감시 (WorkedReviewEditor 등)

```javascript
// 디렉토리 내 .md 파일 변경 + 생성/삭제 이벤트도 구독
this._disposables.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
        if (this._isSaving) return;
        if (e.document.uri.scheme !== 'file') return;
        if (e.contentChanges.length === 0) return;
        const docDir = path.dirname(e.document.uri.fsPath);
        if (docDir !== this.dirPath || !e.document.uri.fsPath.endsWith('.md')) return;
        debouncedRefresh();
    }),
    vscode.workspace.onDidCreateFiles((e) => { /* 새 파일 감지 */ }),
    vscode.workspace.onDidDeleteFiles((e) => { /* 삭제된 파일 감지 */ })
);
```

#### 5. Webview 측에서 refresh 수신 시 save 미트리거

```javascript
// Webview 메시지 핸들러
if (msg.command === 'refreshContent') {
    pages = parseContent(msg.content);  // 내부 상태만 갱신
    render();                           // UI만 갱신
    // ❌ vscode.postMessage({ command: 'save', ... }) 호출 금지!
}
```

#### 6. onDispose에서 구독 정리

```javascript
onDispose() {
    this._disposables.forEach(d => d.dispose());  // VS Code 이벤트 구독 해제
    this._disposables = [];
    if (this._refreshDebounceTimer) {
        clearTimeout(this._refreshDebounceTimer);
        this._refreshDebounceTimer = null;
    }
}
```

### 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **VS Code 이벤트 사용** | `onDidChangeTextDocument`(실시간) + `onDidSaveTextDocument`(저장 시) 조합 |
| **문서 버퍼 우선** | `vscode.workspace.textDocuments`에서 열린 문서 검색 → `getText()`로 미저장 내용 반영 |
| **자기 저장 필터링** | `_isSaving` 플래그로 자신이 쓴 파일 변경 이벤트 무시 |
| **디바운스 (300ms)** | `onDidChangeTextDocument`는 키 입력마다 발생하므로 300ms 디바운스 필수 |
| **가시성 fallback** | `panel.onDidChangeViewState`로 탭 전환 시 최신화 (파일이 VS Code에 열려있지 않을 때 보완) |
| **refresh ≠ save** | 외부 변경으로 인한 webview 갱신은 읽기 전용 갱신만 수행하고 save를 트리거하지 않음 |
| **리소스 정리** | 에디터 닫힐 때 반드시 `_disposables.forEach(d => d.dispose())` + 타이머 정리 |

### 적용 대상 에디터 목록

- `MarkdownViewerEditor` — 읽기 전용, VS Code 이벤트 + 디바운스 + 가시성 갱신
- `TodoViewerEditor` — 단일 파일 감시 + `_isSaving` 적용
- `MemoViewerEditor` — 단일 파일 감시 + `_isSaving` 적용
- `WorkedReviewEditor` — 디렉토리 감시 (문서 변경 + 파일 생성/삭제) + `_isSaving` 적용

---

## 체크리스트

새 기능 PR 전 확인:

- [ ] 적절한 계층 레벨(project/app/file)에 배치했는가?
- [ ] extension.js는 위임만 수행하는가?
- [ ] JSDoc 주석이 있는가?
- [ ] 콜백으로 외부 의존성을 처리했는가?
- [ ] core 모듈에 상태가 없는가?
- [ ] index.js에 export 추가했는가?
- [ ] 관련 기능이 동일 폴더에 있는가? (예: build는 project에)
- [ ] 파일 변경 감시가 있는 에디터에 `_isSaving` 무한루프 방지가 적용되었는가?
