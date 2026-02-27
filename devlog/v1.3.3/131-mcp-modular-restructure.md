# 131. MCP 소스코드 디렉토리 구조 리팩토링 (v1.3.3)

## 개요
MCP 서버의 단일 파일(`src/mcp/index.js`, 1673줄)을 기능 단위 모듈로 분리하여 유지보수성과 확장성을 개선했다.

## 변경 사항

### 1. 모듈 구조 설계 및 분리
- 기존 1673줄의 모놀리식 `index.js`를 7개 파일로 분리:
  - `index.js` (165줄): 엔트리 포인트 — 클래스 정의, 서버 초기화, 핸들러 라우팅, 프로토타입 믹스인
  - `helpers.js` (252줄): 경로 해석, 유틸리티, 상태 관리, 빌드/의존성 헬퍼 + APP_TEMPLATES 상수
  - `definitions.js` (671줄): 54개 도구의 스키마 및 설명 정의
  - `handlers/workspace.js` (95줄): Workspace 핸들러 7개
  - `handlers/project.js` (275줄): Project 핸들러 19개
  - `handlers/source.js` (209줄): Source 핸들러 13개 + 공용 내부 메서드 8개
  - `handlers/package.js` (120줄): Package 핸들러 15개

### 2. 프로토타입 믹스인 패턴 적용
- 각 모듈은 plain object로 메서드를 export
- `Object.assign(WizMcpServer.prototype, ...)` 로 모든 메서드를 클래스에 믹스인
- `this` 컨텍스트가 자연스럽게 유지되어 모든 메서드 간 상호 호출이 정상 동작
- 공용 내부 메서드(`_appInfo`, `_updateApp` 등)를 `source.js`에 배치하되, 프로토타입 믹스인을 통해 `package.js` 핸들러에서도 호출 가능

### 3. 의존성 관리
- 각 핸들러 파일은 필요한 Node.js 모듈만 import (`fs`, `path`, `exec`)
- `APP_TEMPLATES`는 `helpers.js`에서 export하여 `source.js`, `package.js`에서 import
- 외부 SDK 의존성(`@modelcontextprotocol/sdk`)은 `index.js`에만 존재

### 4. 백업 파일 정리
- `src/mcp/index.js.bak` (이전 v2→v3 마이그레이션 백업) 삭제
- `src/mcp/index.js.old` (현재 리팩토링 전 백업) 삭제
