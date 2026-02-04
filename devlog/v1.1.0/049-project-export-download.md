# 049. 프로젝트 내보내기 다운로드 방식 변경

## 개요
프로젝트 내보내기 기능을 exports 폴더 저장 방식에서 다운로드 다이얼로그 방식으로 변경했습니다.

## 변경 사항

### 1. exportProject() 메서드 수정
**파일:** `src/services/project/projectManager.js`

#### Before
```javascript
async exportProject(projectName) {
    const exportsPath = path.join(this.wizRoot, 'exports');
    if (!fs.existsSync(exportsPath)) {
        fs.mkdirSync(exportsPath, { recursive: true });
    }
    const outputPath = path.join(exportsPath, projectName);
    // wiz CLI로 exports 폴더에 저장
}
```

#### After
```javascript
async exportProject(projectName) {
    const os = require('os');
    const tmpDir = os.tmpdir();
    const tmpOutputPath = path.join(tmpDir, `wiz_export_${Date.now()}_${projectName}`);

    // 1. 저장 다이얼로그 표시
    const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(path.join(os.homedir(), `${projectName}.wizproject`)),
        filters: { 'Wiz Project': ['wizproject'] },
        title: '프로젝트 내보내기'
    });
    if (!saveUri) return false;

    // 2. wiz CLI로 tmp 폴더에 내보내기
    const command = `wiz project export --project=${projectName} --output="${tmpOutputPath}"`;
    await exec(command, { cwd: this.wizRoot });

    // 3. 사용자가 선택한 위치로 복사
    const exportedFile = `${tmpOutputPath}.wizproject`;
    const fileContent = fs.readFileSync(exportedFile);
    await vscode.workspace.fs.writeFile(saveUri, fileContent);

    // 4. tmp 파일 정리
    fs.unlinkSync(exportedFile);
}
```

### 2. 메뉴 설명 업데이트
**파일:** `src/services/project/projectManager.js`

```javascript
// showProjectMenu() 내 항목
{ 
    label: '$(package) 프로젝트 내보내기', 
    description: '.wizproject 파일 다운로드',  // 변경됨
    action: 'export' 
}
```

## 장점

1. **직관적인 UX**: 일반적인 파일 다운로드 경험과 동일
2. **저장 위치 선택 가능**: 사용자가 원하는 위치에 직접 저장
3. **exports 폴더 불필요**: 프로젝트 폴더 구조 단순화
4. **Remote 환경 지원**: `vscode.workspace.fs.writeFile` 사용으로 Remote 환경에서도 정상 작동
