/**
 * Zip Utilities
 * 압축/해제 관련 유틸리티
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');
const util = require('util');

const exec = util.promisify(cp.exec);

class ZipUtils {
    /**
     * 폴더를 ZIP으로 압축
     * @param {string} sourcePath - 압축할 폴더 경로
     * @param {string} outputPath - 출력 ZIP 파일 경로
     * @param {string} [prefix] - ZIP 내부 폴더명 (기본: 소스 폴더명)
     * @returns {Promise<void>}
     */
    static async compress(sourcePath, outputPath, prefix = null) {
        const archiver = require('archiver');
        const folderName = prefix || path.basename(sourcePath);
        
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(outputPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', resolve);
            archive.on('error', reject);

            archive.pipe(output);
            archive.glob('**/*', {
                cwd: sourcePath,
                ignore: ['.git/**', 'node_modules/**']
            }, { prefix: folderName });
            archive.finalize();
        });
    }

    /**
     * Base64 데이터를 임시 파일로 저장하고 압축 해제
     * @param {string} base64Data - Base64 인코딩된 ZIP 데이터
     * @param {string} [extension='.zip'] - 파일 확장자
     * @returns {Promise<{ sourceDir: string, cleanup: Function }>}
     */
    static async extractFromBase64(base64Data, extension = '.zip') {
        const fileData = Buffer.from(base64Data, 'base64');
        const tmpDir = os.tmpdir();
        const timestamp = Date.now();
        const tmpZipPath = path.join(tmpDir, `wiz_upload_${timestamp}${extension}`);
        const tmpExtractDir = path.join(tmpDir, `wiz_upload_${timestamp}_extracted`);

        // 임시 파일로 저장
        fs.writeFileSync(tmpZipPath, fileData);
        fs.mkdirSync(tmpExtractDir, { recursive: true });

        // 압축 해제
        try {
            await exec(`unzip -o "${tmpZipPath}" -d "${tmpExtractDir}"`);
        } catch (err) {
            // 정리 후 에러 전파
            this.cleanupTempFiles(tmpZipPath, tmpExtractDir);
            throw new Error(`압축 해제 실패: ${err.message}`);
        }

        // 압축 해제된 폴더 찾기 (단일 폴더인 경우 그 안으로 이동)
        const extractedItems = fs.readdirSync(tmpExtractDir);
        let sourceDir = tmpExtractDir;
        if (extractedItems.length === 1) {
            const singleItem = path.join(tmpExtractDir, extractedItems[0]);
            if (fs.statSync(singleItem).isDirectory()) {
                sourceDir = singleItem;
            }
        }

        // cleanup 함수 반환
        const cleanup = () => this.cleanupTempFiles(tmpZipPath, tmpExtractDir);

        return { sourceDir, cleanup };
    }

    /**
     * 임시 파일들 정리
     * @param {string} zipPath - ZIP 파일 경로
     * @param {string} extractDir - 압축 해제 디렉토리 경로
     */
    static cleanupTempFiles(zipPath, extractDir) {
        try {
            if (fs.existsSync(zipPath)) {
                fs.unlinkSync(zipPath);
            }
            if (fs.existsSync(extractDir)) {
                fs.rmSync(extractDir, { recursive: true, force: true });
            }
        } catch (e) {
            // 무시
        }
    }

    /**
     * 폴더 내용을 대상 폴더로 복사 (특정 파일 제외 가능)
     * @param {string} sourceDir - 소스 디렉토리
     * @param {string} targetDir - 대상 디렉토리
     * @param {string[]} [excludeFiles=[]] - 제외할 파일명 목록
     */
    static copyFolderContents(sourceDir, targetDir, excludeFiles = []) {
        fs.mkdirSync(targetDir, { recursive: true });
        
        const files = fs.readdirSync(sourceDir);
        for (const file of files) {
            if (excludeFiles.includes(file)) continue;
            
            const srcPath = path.join(sourceDir, file);
            const destPath = path.join(targetDir, file);
            fs.cpSync(srcPath, destPath, { recursive: true });
        }
    }
}

module.exports = ZipUtils;
