# Wiz VS Code Extension Development Instructions

## Project Overview
This is the "Wiz Explorer" VS Code extension designed to manage Wiz Framework projects. It provides a custom Tree View for project structure (Source, Packages/Portal, Project), specialized Webview editors for configuration files, and a virtual file system (`wiz://`) for managing application files.

## Architecture & Core Components

- **Entry Point**: `src/extension.js` initializes the `FileExplorerProvider`, `AppEditorProvider`, and registers all `wizExplorer.*` commands.
- **Tree Explorer**:
  - `src/explorer/fileExplorerProvider.js`: Main provider. Handles tree data, sorts Portal folders (`info` > `app` > `route`...), and creates virtual items (`(create)`) for missing standard directories.
  - `src/explorer/models/categoryHandlers.js`: Logic for distinct tree categories (`Source`, `Packages/Portal`, `Project`).
  - `src/explorer/wizDragAndDropController.js`: Handles drag-and-drop logic for standard files, preventing illegal moves into app groups.
- **Editors (Facade Pattern)**:
  - `src/editor/appEditorProvider.js`: Facade that manages editor instances.
  - `src/editor/editors/`: Specific implementations extending `EditorBase`.
    - `appEditor.js`: Standard Apps (Page, Widget).
    - `routeEditor.js`: Route Apps (Source & Portal).
    - `portalAppEditor.js`: Portal Apps (syncs Namespace=Folder=ID, hides ID/Template fields).
    - `create*Editor.js`: Webviews for creating new apps/routes.
- **Core Utilities**: `src/core/` contains `pathUtils.js` (path parsing), `fileUtils.js` (I/O), and `constants.js` (App Types, Icons).

## Key Patterns & Conventions

### 1. App Structure & Identification
- **Standard Apps**: Located in `src/{type}/` (e.g., `src/page`, `src/layout`).
- **Portal Apps**: Located in `src/portal/{package}/app/{namespace}`. Folder name MUST match the `namespace`.
- **Routes**: Located in `src/route/` or `src/portal/{package}/route/`. Supports "Flat" structure (no type prefix).
- **Identification**: `WizPathUtils.parseAppFolder()` is the authority for determining app type and category from a path.

### 2. Virtual File System (`wiz://`)
- Used to open specific "tabs" (UI, Controller, API) for an App without cluttering the native editor history with complex paths.
- **URI Format**: `wiz://{authority}/{path}?label={label}`.
- Handled by `src/editor/wizFileSystemProvider.js`.

### 3. Portal Packages
- **Structure**: `src/portal/{package}`.
- **Special Folders**: `app`, `route`, `controller`, `model`, `assets`, `libs`, `styles`.
- **UI Behavior**: These folders override standard icons (`layers`, `circuit-board`, etc.) and context values (`portalAppGroup`, `portalRouteGroup`) to trigger specific context menus. Virtual items are shown if these folders are missing.

### 4. Webview Interaction
- Editors (Info, Create) use Webviews.
- **State Management**: Use `vscode.setState()` in the Webview script to persist state during split-view changes.
- **Communication**: Post messages (`command: 'update'`, `data: {...}`) back to the extension.

## Developer Workflows

### Creating New Features
1. **Tree Item**: If adding a new tree node, modify `fileExplorerProvider.js` or `appPatternProcessor.js`. Assign a specific `contextValue`.
2. **Command**: Register the command in `package.json` (menus/command palette) and `extension.js`.
3. **Handler**: If it opens an editor, add a method to `AppEditorProvider` and creating a matching `*Editor.js` class.

### Debugging
- Press `F5` to launch the "Extension Development Host".
- Use `Developer: Toggle Developer Tools` in the host window to inspect Webview DOM and console errors.

### Development Log (devlog) Convention
When the user says "devlog 남겨줘", record all unlogged development changes following this convention:

#### When to Log
- Changes to `src/` directory files
- Changes to `package.json`

#### Directory Structure
```
devlog/
├── v{major}.{minor}.{patch}/   # Version folders (e.g., v1.0.0, v1.0.1)
│   ├── 001-feature-name.md
│   ├── 002-another-feature.md
│   └── ...
```

#### File Naming
- Format: `{sequence}-{feature-name}.md`
- Sequence: 3-digit number, continues from previous version (e.g., 039, 040...)
- Feature name: kebab-case description

#### Log File Template
```markdown
# {sequence}. {Feature Title} (v{version})

## 개요
Brief description of the change.

## 변경 사항

### 1. {Change Category}
- Detailed bullet points of what changed
- Include file paths when relevant

### 2. {Another Category}
- More details...
```

#### DEVLOG.md Update
After creating the log file, update `DEVLOG.md`:
1. Add entry under the appropriate version section
2. Link format: `- [{sequence}](./devlog/v{version}/{filename}) - {brief description}`
3. Keep newer entries at the top within each version section

### Notable files
- `src/core/constants.js`: centralized icons, file types, and app definitions.
- `src/editor/editors/editorBase.js`: Shared logic for Webview panel creation and lifecycle.
