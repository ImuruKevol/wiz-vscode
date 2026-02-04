# 044. Services 계층 구조 재구성

## 개요
Services 레이어의 폴더 구조를 상하위 개념에 따라 재구성하여 관련 기능들을 계층적으로 그룹화했습니다. 7개의 분산된 폴더를 3개의 계층 폴더로 통합했습니다.

## 변경 사항

### 1. 기존 구조 (7개 폴더)

```
src/services/
├── build/          # 별도 분리
├── file/           # 유지
├── mcp/            # 별도 분리
├── navigation/     # 별도 분리
├── packages/       # 별도 분리
├── project/        # 유지
└── source/         # 별도 분리
```

### 2. 새 구조 (3개 계층 폴더)

```
src/services/
├── project/              # 프로젝트 레벨 (상위)
│   ├── projectManager.js # 프로젝트 수명주기
│   ├── buildManager.js   # 빌드 관리 (← build/ 이동)
│   ├── mcpManager.js     # MCP 서버 (← mcp/ 이동)
│   └── index.js
├── app/                  # 앱 레벨 (중위)
│   ├── sourceManager.js  # Source 앱 (← source/appManager.js 이름 변경)
│   ├── packageManager.js # Package 앱 (← packages/ 이동)
│   ├── navigationManager.js # 앱 탐색 (← navigation/ 이동)
│   └── index.js
├── file/                 # 파일 레벨 (하위)
│   ├── fileManager.js
│   └── index.js
└── index.js
```

### 3. 계층 배치 원칙

| 레벨 | 폴더 | 책임 | Manager 클래스 |
|------|------|------|----------------|
| **상위** | `project/` | 프로젝트 전체 수명주기 | `ProjectManager`, `BuildManager`, `McpManager` |
| **중위** | `app/` | 개별 앱 생성/관리 | `SourceManager`, `PackageManager`, `NavigationManager` |
| **하위** | `file/` | 파일 단위 작업 | `FileManager` |

### 4. 이름 변경

- `AppManager` → `SourceManager` (역할 명확화)
- `source/` → `app/` (앱 관련 기능 통합)

### 5. 파일 이동

| 원래 위치 | 새 위치 | 이유 |
|-----------|---------|------|
| `build/buildManager.js` | `project/buildManager.js` | 빌드는 프로젝트의 하위 기능 |
| `mcp/mcpManager.js` | `project/mcpManager.js` | MCP 서버는 프로젝트 레벨 기능 |
| `source/appManager.js` | `app/sourceManager.js` | 앱 관련 기능 통합 + 이름 변경 |
| `packages/packageManager.js` | `app/packageManager.js` | Package도 앱 레벨 기능 |
| `navigation/navigationManager.js` | `app/navigationManager.js` | 앱 탐색 기능 |

### 6. architecture-guide.md 업데이트

- 프로젝트 구조 다이어그램 업데이트
- "서비스 계층 구조" 섹션 추가
- 계층 배치 원칙 정의
- 새 Manager 추가 시 결정 기준 플로우차트
- index.js 패턴 예제 업데이트
- 체크리스트 항목 추가

### 7. extension.js 업데이트

- `AppManager` → `SourceManager` import 변경
- `appManager` → `sourceManager` 인스턴스 이름 변경
- 모든 사용처 업데이트

## 계층 배치 원칙

1. **상위 기능이 하위 기능을 포함**: 빌드(build)는 프로젝트(project)의 하위 기능이므로 `project/` 폴더에 배치
2. **관련 기능은 동일 폴더**: Navigation은 앱 탐색 기능이므로 `app/` 폴더에 배치
3. **독립적 기능만 별도 폴더**: 파일 작업은 앱/프로젝트에 종속되지 않으므로 `file/` 폴더 유지

## 새 Manager 추가 시 결정 기준

```
새 기능이 프로젝트 전체에 영향을 미치는가?
    └─ Yes → project/ 폴더
    └─ No  → 새 기능이 특정 앱 생성/관리와 관련있는가?
                 └─ Yes → app/ 폴더
                 └─ No  → 파일 단위 작업인가?
                              └─ Yes → file/ 폴더
                              └─ No  → 새 폴더 생성 검토
```

## 효과

- **복잡성 감소**: 7개 폴더 → 3개 폴더
- **관련 기능 근접 배치**: 연관된 기능들이 같은 폴더에 위치
- **명확한 계층 구조**: 상위/중위/하위 레벨로 역할 분리
- **확장 용이성**: 새 기능 추가 시 배치 기준 명확
