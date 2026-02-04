# 046. Copilot 카테고리 추가

## 개요
탐색기에 Copilot 카테고리를 추가하여 `.github` 폴더에 쉽게 접근할 수 있도록 했습니다. Copilot Instructions 파일 등을 관리하기 편리해집니다.

## 변경 사항

### 1. CopilotCategory 클래스 생성
**파일:** `src/explorer/models/categoryHandlers.js`

```javascript
class CopilotCategory extends CategoryItem {
    constructor(provider) {
        super('copilot', 'copilot', new vscode.ThemeIcon('copilot'));
        this.provider = provider;
        this.contextValue = 'copilotCategory';
        if (provider.wizRoot) {
            this.resourceUri = vscode.Uri.file(path.join(provider.wizRoot, '.github'));
        }
    }

    async getChildren() {
        if (!this.provider.wizRoot) return [];
        const githubPath = path.join(this.provider.wizRoot, '.github');
        if (!fs.existsSync(githubPath)) return [];
        return this.provider.getFilesAndFolders(githubPath);
    }
}
```

### 2. 탐색기에 카테고리 등록
**파일:** `src/explorer/fileExplorerProvider.js`

- `CopilotCategory` import 추가
- categories 배열에 `new CopilotCategory(this)` 추가

### 3. 컨텍스트 메뉴 지원
**파일:** `package.json`

- `copilotCategory`에 대해 파일/폴더 생성, 복사, 붙여넣기 등 일반 폴더 메뉴 허용

## 특징

- **아이콘**: GitHub Copilot 아이콘 (`copilot`)
- **경로**: Wiz 워크스페이스 루트의 `.github` 폴더
- **컨텍스트 값**: `copilotCategory`
- **용도**: `copilot-instructions.md`, GitHub Actions 워크플로우 등 관리
