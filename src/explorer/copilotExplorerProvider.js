/**
 * WIZ Copilot Explorer Provider
 * .github 중심의 경량 Tree View (Instruction + 작업 관리)
 */

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const CategoryItem = require('./treeItems/categoryItem');
const FileTreeItem = require('./treeItems/fileTreeItem');
const EmptyItem = require('./treeItems/emptyItem');

// ==================== Categories ====================

/**
 * Instruction 카테고리 — .github 경로의 폴더/파일을 표시 (task 제외)
 */
class CopilotInstructionCategory extends CategoryItem {
    constructor(provider) {
        super('instruction', 'copilotInstruction', new vscode.ThemeIcon('book'));
        this.provider = provider;
        this.contextValue = 'copilotCategory';
    }

    get resourceUri() {
        if (!this.provider.wizRoot) return undefined;
        return vscode.Uri.file(path.join(this.provider.wizRoot, '.github'));
    }

    set resourceUri(_) {
        // TreeItem 내부 할당 무시 — getter로 동적 반환
    }

    async getChildren() {
        if (!this.provider.wizRoot) return [];
        const githubPath = path.join(this.provider.wizRoot, '.github');
        if (!fs.existsSync(githubPath)) return [];
        // task 폴더는 별도 카테고리로 분리하므로 여기서 제외
        return this.provider.getFilesAndFolders(githubPath, (item) => item !== 'task');
    }
}

/**
 * 작업 관리 카테고리 — .github/task 폴더를 표시
 */
class TaskCategory extends CategoryItem {
    constructor(provider) {
        super('작업 관리', 'copilotTask', new vscode.ThemeIcon('tasklist'));
        this.provider = provider;
        this.contextValue = 'taskCategory';
    }

    get resourceUri() {
        if (!this.provider.wizRoot) return undefined;
        return vscode.Uri.file(path.join(this.provider.wizRoot, '.github', 'task'));
    }

    set resourceUri(_) {
        // TreeItem 내부 할당 무시 — getter로 동적 반환
    }

    async getChildren() {
        if (!this.provider.wizRoot) return [];
        const taskPath = path.join(this.provider.wizRoot, '.github', 'task');
        if (!fs.existsSync(taskPath)) return [];
        return this.provider.getFilesAndFolders(taskPath);
    }
}

// ==================== Provider ====================

class CopilotExplorerProvider {
    constructor(mainProvider) {
        this.mainProvider = mainProvider;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;

        this.categories = [
            new CopilotInstructionCategory(this),
            new TaskCategory(this)
        ];
    }

    /** @type {string|undefined} */
    get workspaceRoot() { return this.mainProvider.workspaceRoot; }

    /** @type {string|undefined} */
    get wizRoot() { return this.mainProvider.wizRoot; }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    async getChildren(element) {
        if (!this.mainProvider.workspaceRoot) {
            return [
                new EmptyItem('열린 폴더 없음', 'noFolder'),
                new EmptyItem('폴더 열기...', 'openFolder')
            ];
        }

        if (!element) {
            if (!fs.existsSync(this.mainProvider.workspaceRoot)) {
                return [
                    new EmptyItem(`폴더를 찾을 수 없음`, 'noFolder'),
                    new EmptyItem('다른 프로젝트 선택...', 'switchProject')
                ];
            }
            return this.categories;
        }

        // 카테고리 항목은 자체 getChildren 사용
        if (typeof element.getChildren === 'function') {
            return element.getChildren();
        }

        // 일반 폴더 탐색
        if (element.isDirectory) {
            return this.getFilesAndFolders(element.resourceUri.fsPath);
        }

        return [];
    }

    getParent(element) {
        if (!element || this.categories.includes(element)) return null;

        const fsPath = element.resourceUri ? element.resourceUri.fsPath : null;
        if (!fsPath) return null;

        // Boundary guard: paths outside .github don't belong to this tree
        if (this.wizRoot) {
            const githubBase = path.join(this.wizRoot, '.github');
            if (!fsPath.startsWith(githubBase + path.sep) && fsPath !== githubBase) {
                return null;
            }
        }

        const parentPath = path.dirname(fsPath);

        // .github 직계 자식 → copilotInstruction 카테고리
        if (this.wizRoot) {
            const githubPath = path.join(this.wizRoot, '.github');
            if (parentPath === githubPath) {
                return this.categories.find(c => c.id === 'copilotInstruction');
            }
            // .github/task 직계 자식 → copilotTask 카테고리
            const taskPath = path.join(githubPath, 'task');
            if (parentPath === taskPath) {
                return this.categories.find(c => c.id === 'copilotTask');
            }
        }

        return new FileTreeItem(path.basename(parentPath), parentPath, true);
    }

    /**
     * 파일/폴더 목록 조회 (메인 프로바이더에 위임)
     */
    getFilesAndFolders(dirPath, filterFn = null) {
        return this.mainProvider.getFilesAndFolders(dirPath, filterFn);
    }
}

module.exports = CopilotExplorerProvider;
