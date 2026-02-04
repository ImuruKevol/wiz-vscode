# 050. 탐색기 오류 수정 및 정렬 개선

## 개요
탐색기 초기화 오류를 수정하고, 불필요한 코드를 정리했습니다.

## 변경 사항

### 1. Import 오류 수정
**파일:** `src/explorer/fileExplorerProvider.js`

#### Before (오류)
```javascript
const { SourceCategory, PortalCategory, ProjectCategory, ConfigCategory } = require('./models/categoryHandlers');
```

#### After (수정)
```javascript
const { SourceCategory, PortalCategory, ProjectCategory, CopilotCategory, ConfigCategory } = require('./models/categoryHandlers');
```

- `CopilotCategory` import 누락으로 인한 탐색기 초기화 실패 수정

### 2. 불필요한 코드 제거

#### angular 폴더 필터링 로직 제거
```javascript
// 제거됨
if (folderName === 'angular') {
    const parentDir = path.dirname(dirPath);
    if (path.basename(parentDir) === 'src') {
        items = items.filter(item => !['libs', 'styles'].includes(item.label));
    }
}
```

#### ConfigCategory resourceUri 동적 업데이트 로직 제거
```javascript
// 제거됨
const configCategory = this.categories.find(c => c.id === 'config');
if (configCategory && this.workspaceRoot) {
    configCategory.resourceUri = vscode.Uri.file(path.join(this.workspaceRoot, 'config'));
}
```

### 3. Packages 정렬 순서 변경
**파일:** `src/explorer/fileExplorerProvider.js`

```javascript
// Before
const priority = ['info', 'app', 'route', 'model', 'controller', 'assets', 'libs', 'styles', 'README.md'];

// After
const priority = ['info', 'app', 'route', 'controller', 'model', 'assets', 'libs', 'styles'];
```

- `controller`가 `model`보다 먼저 표시
- `README.md` 제거 (일반 파일로 처리)
