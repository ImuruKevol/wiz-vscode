/**
 * McpManager - MCP 서버 관리
 * MCP 서버 시작/중지, 설정 생성
 */

const vscode = require('vscode');
const path = require('path');
const cp = require('child_process');

class McpManager {
    /**
     * @param {Object} options
     * @param {string} options.extensionPath - 익스텐션 경로
     * @param {Function} options.getWizRoot - Wiz 루트 경로 반환 함수
     * @param {Function} options.getCurrentProject - 현재 프로젝트명 반환 함수
     */
    constructor(options = {}) {
        this.extensionPath = options.extensionPath;
        this.getWizRoot = options.getWizRoot || (() => undefined);
        this.getCurrentProject = options.getCurrentProject || (() => 'main');
        this.outputChannel = vscode.window.createOutputChannel('Wiz MCP Server');
        this.serverProcess = null;
    }

    /**
     * MCP 서버 시작
     * @returns {boolean} 시작 성공 여부
     */
    start() {
        if (this.serverProcess) {
            vscode.window.showWarningMessage('MCP 서버가 이미 실행 중입니다.');
            return false;
        }

        const mcpServerPath = path.join(this.extensionPath, 'src', 'mcp', 'index.js');
        const wizRoot = this.getWizRoot();

        this.serverProcess = cp.spawn('node', [mcpServerPath], {
            cwd: wizRoot,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] MCP Server started`);
        this.outputChannel.show(true);

        this.serverProcess.stderr.on('data', (data) => {
            this.outputChannel.appendLine(data.toString());
        });

        this.serverProcess.on('close', (code) => {
            this.outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] MCP Server stopped (code: ${code})`);
            this.serverProcess = null;
        });

        this.serverProcess.on('error', (err) => {
            this.outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] MCP Server error: ${err.message}`);
            this.serverProcess = null;
        });

        vscode.window.showInformationMessage('MCP 서버가 시작되었습니다.');
        return true;
    }

    /**
     * MCP 서버 중지
     * @returns {boolean} 중지 성공 여부
     */
    stop() {
        if (!this.serverProcess) {
            vscode.window.showWarningMessage('실행 중인 MCP 서버가 없습니다.');
            return false;
        }

        this.serverProcess.kill();
        this.serverProcess = null;
        vscode.window.showInformationMessage('MCP 서버가 중지되었습니다.');
        return true;
    }

    /**
     * MCP 설정 객체 생성
     * @returns {Object} MCP 설정 객체
     */
    getConfig() {
        return {
            mcpServers: {
                wiz: {
                    command: 'node',
                    args: [path.join(this.extensionPath, 'src', 'mcp', 'index.js')],
                    env: {
                        WIZ_WORKSPACE: this.getWizRoot() || '',
                        WIZ_PROJECT: this.getCurrentProject() || 'main'
                    }
                }
            }
        };
    }

    /**
     * MCP 설정을 문서로 표시하고 클립보드에 복사
     */
    async showConfig() {
        const config = this.getConfig();
        const configJson = JSON.stringify(config, null, 2);

        // 새 문서에 설정 표시
        const doc = await vscode.workspace.openTextDocument({
            content: configJson,
            language: 'json'
        });
        await vscode.window.showTextDocument(doc);

        // 클립보드에 복사
        await vscode.env.clipboard.writeText(configJson);
        vscode.window.showInformationMessage('MCP 설정이 클립보드에 복사되었습니다. Claude Desktop 설정에 붙여넣기 하세요.');
    }

    /**
     * 서버 실행 중 여부
     * @returns {boolean}
     */
    isRunning() {
        return this.serverProcess !== null;
    }

    /**
     * 리소스 정리
     */
    dispose() {
        if (this.serverProcess) {
            this.serverProcess.kill();
            this.serverProcess = null;
        }
        this.outputChannel.dispose();
    }
}

module.exports = McpManager;
