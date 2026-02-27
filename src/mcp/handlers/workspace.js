/**
 * Wiz MCP Server - Workspace Handlers
 * 워크스페이스 상태, 파일/폴더 관리 (7개 도구)
 */

const fs = require('fs');
const path = require('path');

/**
 * 프로토타입 믹스인용 핸들러 메서드
 * WizMcpServer 인스턴스의 this 컨텍스트로 호출된다.
 */
module.exports = {

    async workspaceStatus() {
        this._loadState();
        const projectPath = this.wizRoot ? path.join(this.wizRoot, 'project') : null;
        let projects = [];
        if (projectPath && fs.existsSync(projectPath)) {
            projects = fs.readdirSync(projectPath, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
        }
        return this._jsonResult({
            workspacePath: this.wizRoot,
            currentProject: this.currentProject,
            projects,
            paths: {
                workspace: this.wizRoot,
                config: this.wizRoot ? path.join(this.wizRoot, 'config') : null,
                project: this.wizRoot ? path.join(this.wizRoot, 'project', this.currentProject) : null,
                projectSrc: this.wizRoot ? this._getSrcPath(this.wizRoot, this.currentProject) : null
            }
        });
    },

    async workspaceListDir({ relativePath }) {
        const absPath = this._resolveWorkspacePath(relativePath || '');
        if (!fs.existsSync(absPath)) throw new Error(`Directory does not exist: ${absPath}`);
        if (!fs.statSync(absPath).isDirectory()) throw new Error(`Not a directory: ${absPath}`);
        const entries = fs.readdirSync(absPath, { withFileTypes: true });
        const items = entries.map(entry => {
            const fp = path.join(absPath, entry.name);
            const stat = fs.statSync(fp);
            return { name: entry.name, type: entry.isDirectory() ? 'directory' : 'file', size: stat.size, modified: stat.mtime.toISOString() };
        });
        return this._jsonResult({ path: absPath, relativePath: relativePath || '', items, count: items.length });
    },

    async workspaceReadFile({ relativePath, startLine, endLine }) {
        const absPath = this._resolveWorkspacePath(relativePath);
        if (!fs.existsSync(absPath)) throw new Error(`File does not exist: ${absPath}`);
        if (fs.statSync(absPath).isDirectory()) throw new Error(`Path is a directory: ${absPath}`);
        const content = fs.readFileSync(absPath, 'utf8');
        if (startLine || endLine) {
            const lines = content.split('\n');
            const s = (startLine || 1) - 1, e = endLine || lines.length;
            return this._jsonResult({ filePath: absPath, content: lines.slice(s, e).join('\n'), totalLines: lines.length, range: { start: s + 1, end: Math.min(e, lines.length) } });
        }
        return this._jsonResult({ filePath: absPath, content, size: Buffer.byteLength(content, 'utf8'), totalLines: content.split('\n').length });
    },

    async workspaceWriteFile({ relativePath, content }) {
        const absPath = this._resolveWorkspacePath(relativePath);
        const dir = path.dirname(absPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(absPath, content, 'utf8');
        return this._jsonResult({ success: true, filePath: absPath, size: Buffer.byteLength(content, 'utf8') });
    },

    async workspaceCreateDir({ relativePath }) {
        const absPath = this._resolveWorkspacePath(relativePath);
        if (fs.existsSync(absPath)) throw new Error(`Path already exists: ${absPath}`);
        fs.mkdirSync(absPath, { recursive: true });
        return this._jsonResult({ success: true, path: absPath });
    },

    async workspaceDelete({ relativePath }) {
        const absPath = this._resolveWorkspacePath(relativePath);
        if (!fs.existsSync(absPath)) throw new Error(`Path does not exist: ${absPath}`);
        const wasDir = fs.statSync(absPath).isDirectory();
        fs.rmSync(absPath, { recursive: true, force: true });
        return this._jsonResult({ success: true, deletedPath: absPath, wasDirectory: wasDir });
    },

    async workspaceRename({ oldRelativePath, newRelativePath }) {
        const oldAbs = this._resolveWorkspacePath(oldRelativePath);
        const newAbs = this._resolveWorkspacePath(newRelativePath);
        if (!fs.existsSync(oldAbs)) throw new Error(`Source does not exist: ${oldAbs}`);
        if (fs.existsSync(newAbs)) throw new Error(`Destination already exists: ${newAbs}`);
        const destDir = path.dirname(newAbs);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.renameSync(oldAbs, newAbs);
        return this._jsonResult({ success: true, oldPath: oldAbs, newPath: newAbs });
    },

};
