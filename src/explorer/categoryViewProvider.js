/**
 * CategoryViewProvider — 단일 카테고리를 별도 뷰(패널)로 표시하는 경량 TreeDataProvider
 * 메인 FileExplorerProvider의 폴더 확장 로직을 재사용하면서 루트는 카테고리의 자식만 표시.
 */

const vscode = require('vscode');
const path = require('path');
const FileTreeItem = require('./treeItems/fileTreeItem');

class CategoryViewProvider {
    /**
     * @param {import('./models/categoryHandlers').CategoryItem} category
     * @param {import('./fileExplorerProvider')} mainProvider
     */
    constructor(category, mainProvider) {
        this.category = category;
        this.mainProvider = mainProvider;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;

        // 메인 프로바이더 변경 시 자동 갱신
        mainProvider.onDidChangeTreeData(() => this.refresh());
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    getParent(element) {
        if (!element || !element.resourceUri) return null;
        const categoryUri = this.category.resourceUri;
        if (!categoryUri) return null;

        const categoryPath = categoryUri.fsPath;
        const parentPath = path.dirname(element.resourceUri.fsPath);

        // 카테고리 루트의 직접 자식 → parent는 null (뷰 루트)
        if (parentPath === categoryPath) return null;

        // 카테고리 범위 안의 하위 폴더
        if (parentPath.startsWith(categoryPath + path.sep)) {
            return new FileTreeItem(path.basename(parentPath), parentPath, true);
        }

        return null;
    }

    async getChildren(element) {
        if (!element) {
            return this.category.getChildren();
        }
        // 하위 폴더 확장은 메인 프로바이더에 위임
        return this.mainProvider.getChildren(element);
    }
}

module.exports = CategoryViewProvider;
