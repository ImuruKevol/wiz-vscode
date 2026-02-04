/**
 * BuildManager - 프로젝트 빌드 관리
 * 빌드 트리거, Normal/Clean 빌드, 출력 채널 관리
 */

const vscode = require('vscode');
const cp = require('child_process');

class BuildManager {
    /**
     * @param {Object} options
     * @param {Function} options.getWizRoot - Wiz 루트 경로 반환 함수
     * @param {Function} options.getCurrentProject - 현재 프로젝트명 반환 함수
     */
    constructor(options = {}) {
        this.getWizRoot = options.getWizRoot || (() => undefined);
        this.getCurrentProject = options.getCurrentProject || (() => undefined);
        this.outputChannel = vscode.window.createOutputChannel('Wiz Build');
        this.buildProcess = null;
    }

    /**
     * 출력 채널 반환
     * @returns {vscode.OutputChannel}
     */
    getOutputChannel() {
        return this.outputChannel;
    }

    /**
     * ANSI 색상 코드 제거
     * @private
     */
    _stripAnsi(str) {
        return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
    }

    /**
     * 빌드 실행
     * @param {boolean} [clean=false] - Clean 빌드 여부
     * @returns {boolean} 빌드 시작 성공 여부
     */
    triggerBuild(clean = false) {
        const currentProject = this.getCurrentProject();
        const wizRoot = this.getWizRoot();

        if (!currentProject || !wizRoot) {
            return false;
        }

        // 이전 빌드 프로세스가 실행 중이면 종료
        if (this.buildProcess) {
            this.buildProcess.kill();
            this.buildProcess = null;
        }

        const buildType = clean ? 'Clean Build' : 'Build';
        this.outputChannel.show(true);
        this.outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ${buildType} project: ${currentProject}...`);

        const args = ['project', 'build', '--project', currentProject];
        if (clean) {
            args.push('--clean');
        }

        this.buildProcess = cp.spawn('wiz', args, {
            cwd: wizRoot,
            shell: true,
            env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }
        });

        this.buildProcess.stdout.on('data', (data) => {
            this.outputChannel.append(this._stripAnsi(data.toString()));
        });

        this.buildProcess.stderr.on('data', (data) => {
            this.outputChannel.append(this._stripAnsi(data.toString()));
        });

        this.buildProcess.on('close', (code) => {
            this.outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] Build finished with code ${code}`);
            this.buildProcess = null;
        });

        this.buildProcess.on('error', (err) => {
            this.outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] Build error: ${err.message}`);
            this.buildProcess = null;
        });

        return true;
    }

    /**
     * Normal 빌드 실행
     * @returns {boolean} 성공 여부
     */
    normalBuild() {
        const currentProject = this.getCurrentProject();
        if (!currentProject) {
            vscode.window.showErrorMessage('프로젝트가 선택되지 않았습니다.');
            return false;
        }
        return this.triggerBuild(false);
    }

    /**
     * Clean 빌드 실행
     * @returns {boolean} 성공 여부
     */
    cleanBuild() {
        const currentProject = this.getCurrentProject();
        if (!currentProject) {
            vscode.window.showErrorMessage('프로젝트가 선택되지 않았습니다.');
            return false;
        }
        return this.triggerBuild(true);
    }

    /**
     * 빌드 타입 선택 후 실행
     * @returns {Promise<boolean>} 성공 여부
     */
    async showBuildMenu() {
        const currentProject = this.getCurrentProject();
        if (!currentProject) {
            vscode.window.showErrorMessage('프로젝트가 선택되지 않았습니다.');
            return false;
        }

        const buildOptions = [
            { label: '$(tools) Normal Build', description: '현재 상태에서 빌드', value: false },
            { label: '$(trash) Clean Build', description: '기존 빌드 결과물 삭제 후 빌드', value: true }
        ];

        const selected = await vscode.window.showQuickPick(buildOptions, {
            title: '빌드 타입 선택',
            placeHolder: '빌드 방식을 선택하세요'
        });

        if (selected) {
            return this.triggerBuild(selected.value);
        }
        return false;
    }

    /**
     * 빌드 출력 채널 표시
     */
    showOutput() {
        this.outputChannel.show(true);
    }

    /**
     * 리소스 정리
     */
    dispose() {
        if (this.buildProcess) {
            this.buildProcess.kill();
            this.buildProcess = null;
        }
        this.outputChannel.dispose();
    }
}

module.exports = BuildManager;
