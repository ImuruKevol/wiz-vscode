/**
 * App Service Module
 * 앱 관련 비즈니스 로직 통합 Export
 * 
 * - SourceManager: Source 카테고리 앱 (page, component, layout, route)
 * - PackageManager: Package 카테고리 앱 (portal app, portal route)
 * - NavigationManager: 앱 탐색 및 위치 선택
 */

const SourceManager = require('./sourceManager');
const PackageManager = require('./packageManager');
const NavigationManager = require('./navigationManager');

module.exports = {
    SourceManager,
    PackageManager,
    NavigationManager
};
