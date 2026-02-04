/**
 * ProjectManager - 프로젝트 관리 비즈니스 로직
 * 프로젝트 전환, 가져오기, 내보내기, 삭제 담당
 */

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const cp = require('child_process');
const util = require('util');
const exec = util.promisify(cp.exec);

class ProjectManager {
    /**
     * @param {Object} options
     * @param {string} options.wizRoot - Wiz 워크스페이스 루트 경로
     * @param {Function} options.onRefresh - 트리 갱신 콜백
     * @param {Function} options.onProjectChange - 프로젝트 변경 콜백 (projectName) => void
     * @param {vscode.OutputChannel} options.outputChannel - 빌드 출력 채널
     */
    constructor(options = {}) {
        this.wizRoot = options.wizRoot;
        this.onRefresh = options.onRefresh || (() => {});
        this.onProjectChange = options.onProjectChange || (() => {});
        this.outputChannel = options.outputChannel;
    }

    /**
     * 프로젝트 기본 경로 반환
     */
    getProjectBasePath() {
        return path.join(this.wizRoot, 'project');
    }

    /**
     * 프로젝트 목록 조회
     * @returns {string[]} 프로젝트 이름 배열
     */
    getProjectList() {
        const projectBasePath = this.getProjectBasePath();
        if (!fs.existsSync(projectBasePath)) {
            return [];
        }

        return fs.readdirSync(projectBasePath)
            .filter(item => {
                try {
                    return fs.statSync(path.join(projectBasePath, item)).isDirectory();
                } catch (e) {
                    return false;
                }
            });
    }

    /**
     * 프로젝트 폴더 존재 확인 및 생성
     * @returns {boolean} 성공 여부
     */
    ensureProjectFolder() {
        const projectBasePath = this.getProjectBasePath();
        if (!fs.existsSync(projectBasePath)) {
            try {
                fs.mkdirSync(projectBasePath, { recursive: true });
            } catch (e) {
                vscode.window.showErrorMessage(`'project' 폴더를 생성할 수 없습니다.`);
                return false;
            }
        }
        return true;
    }

    /**
     * 프로젝트 삭제
     * @param {string} projectName - 삭제할 프로젝트 이름
     * @param {string} currentProject - 현재 활성 프로젝트 이름
     * @returns {Promise<{success: boolean, newCurrentProject: string|null}>}
     */
    async deleteProject(projectName, currentProject) {
        const projectBasePath = this.getProjectBasePath();
        const targetPath = path.join(projectBasePath, projectName);

        const confirm = await vscode.window.showWarningMessage(
            `경고: 프로젝트 '${projectName}'와(과) 포함된 모든 파일이 영구적으로 삭제됩니다. 계속하시겠습니까?`,
            '삭제', '취소'
        );

        if (confirm !== '삭제') {
            return { success: false, newCurrentProject: currentProject };
        }

        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `프로젝트 '${projectName}' 삭제 중...`,
            cancellable: false
        }, async () => {
            try {
                fs.rmSync(targetPath, { recursive: true, force: true });
                vscode.window.showInformationMessage(`프로젝트 '${projectName}'가 삭제되었습니다.`);

                let newCurrentProject = currentProject;
                
                // 삭제된 프로젝트가 현재 프로젝트인 경우 다른 프로젝트로 전환
                if (currentProject === projectName) {
                    newCurrentProject = 'main';
                    if (!fs.existsSync(path.join(projectBasePath, 'main'))) {
                        const remaining = this.getProjectList();
                        newCurrentProject = remaining.length > 0 ? remaining[0] : null;
                    }
                }

                return { success: true, newCurrentProject };
            } catch (err) {
                vscode.window.showErrorMessage(`프로젝트 삭제 실패: ${err.message}`);
                return { success: false, newCurrentProject: currentProject };
            }
        });
    }

    /**
     * 프로젝트 내보내기 (wiz CLI 사용)
     * @param {string} projectName - 내보낼 프로젝트 이름
     */
    async exportProject(projectName) {
        const exportsPath = path.join(this.wizRoot, 'exports');
        if (!fs.existsSync(exportsPath)) {
            fs.mkdirSync(exportsPath, { recursive: true });
        }

        const outputPath = path.join(exportsPath, projectName);

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `프로젝트 '${projectName}' 내보내는 중...`,
            cancellable: false
        }, async () => {
            try {
                const command = `wiz project export --project=${projectName} --output="${outputPath}"`;
                this.log(`[Export] ${command}`);

                await exec(command, { cwd: this.wizRoot });

                this.log(`[Export] 완료: ${outputPath}`);
                vscode.window.showInformationMessage(`프로젝트 '${projectName}'가 exports 폴더로 내보내졌습니다.`);
                this.onRefresh();
            } catch (err) {
                this.log(`[Export] 실패: ${err.message}`);
                vscode.window.showErrorMessage(`프로젝트 내보내기 실패: ${err.message}`);
            }
        });
    }

    /**
     * 프로젝트 파일(.wizproject)에서 가져오기
     * @param {string} filePath - .wizproject 파일 경로
     * @param {string} projectName - 새 프로젝트 이름
     * @returns {Promise<boolean>} 성공 여부
     */
    async importFromFile(filePath, projectName) {
        const projectBasePath = this.getProjectBasePath();
        const targetPath = path.join(projectBasePath, projectName);

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `프로젝트 '${projectName}' 가져오는 중...`,
                cancellable: false
            }, async () => {
                fs.mkdirSync(targetPath, { recursive: true });
                
                const command = `unzip -o "${filePath}" -d "${targetPath}"`;
                this.log(`[Import] ${command}`);

                await exec(command);

                this.log(`[Import] 완료: ${targetPath}`);
            });

            return true;
        } catch (err) {
            // 실패 시 생성된 폴더 정리
            if (fs.existsSync(targetPath)) {
                fs.rmSync(targetPath, { recursive: true, force: true });
            }
            this.log(`[Import] 실패: ${err.message}`);
            vscode.window.showErrorMessage(`프로젝트 가져오기 실패: ${err.message}`);
            return false;
        }
    }

    /**
     * Git 저장소에서 프로젝트 가져오기
     * @param {string} gitUrl - Git 저장소 URL
     * @param {string} projectName - 새 프로젝트 이름
     * @returns {Promise<boolean>} 성공 여부
     */
    async importFromGit(gitUrl, projectName) {
        const projectBasePath = this.getProjectBasePath();
        const targetPath = path.join(projectBasePath, projectName);

        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `프로젝트 '${projectName}' 불러오는 중...`,
            cancellable: false
        }, async () => {
            try {
                await exec(`git clone "${gitUrl}" "${targetPath}"`);
                return true;
            } catch (err) {
                vscode.window.showErrorMessage(`프로젝트 불러오기 실패: ${err.message}`);
                return false;
            }
        });
    }

    /**
     * 프로젝트 이름 유효성 검사
     * @param {string} value - 검사할 값
     * @returns {string|null} 에러 메시지 또는 null
     */
    validateProjectName(value) {
        if (!/^[a-z0-9]+$/.test(value)) {
            return '영문 소문자와 숫자만 허용됩니다.';
        }
        const projectBasePath = this.getProjectBasePath();
        if (fs.existsSync(path.join(projectBasePath, value))) {
            return '이미 존재하는 프로젝트 이름입니다.';
        }
        return null;
    }

    /**
     * 프로젝트 이름 입력 받기
     * @param {Object} options - InputBox 옵션
     * @returns {Promise<string|undefined>}
     */
    async promptProjectName(options = {}) {
        return await vscode.window.showInputBox({
            title: options.title || '새 프로젝트 이름 입력',
            prompt: options.prompt || '영문 소문자와 숫자만 허용됩니다.',
            placeHolder: options.placeHolder || 'projectname',
            value: options.value,
            validateInput: (value) => this.validateProjectName(value)
        });
    }

    /**
     * 프로젝트 선택 메뉴 표시
     * @param {string} title - 메뉴 제목
     * @param {string} placeHolder - 플레이스홀더
     * @returns {Promise<string|undefined>}
     */
    async selectProject(title, placeHolder) {
        const projects = this.getProjectList();
        if (projects.length === 0) {
            vscode.window.showInformationMessage('프로젝트가 없습니다.');
            return undefined;
        }

        return await vscode.window.showQuickPick(projects, {
            title,
            placeHolder
        });
    }

    /**
     * Git URL 입력 받기
     * @returns {Promise<string|undefined>}
     */
    async promptGitUrl() {
        return await vscode.window.showInputBox({
            title: 'Git 저장소 주소 입력',
            prompt: '복제할 Git 리포지토리의 URL을 입력하세요.',
            placeHolder: 'https://github.com/username/repo.git',
            ignoreFocusOut: true
        });
    }

    /**
     * .wizproject 파일 선택 다이얼로그
     * @returns {Promise<string|undefined>}
     */
    async selectProjectFile() {
        const fileUris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: { 'Wiz Project': ['wizproject'] },
            title: 'Wiz 프로젝트 파일 선택'
        });

        if (!fileUris || fileUris.length === 0) {
            return undefined;
        }
        return fileUris[0].fsPath;
    }

    /**
     * 출력 채널에 로그
     * @param {string} message 
     */
    log(message) {
        if (this.outputChannel) {
            this.outputChannel.appendLine(message);
            this.outputChannel.show(true);
        }
    }
}

module.exports = ProjectManager;
