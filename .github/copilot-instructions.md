# Wiz VS Code Extension Development Instructions

## Project Overview
This is the "Wiz Explorer" VS Code extension designed to manage Wiz Framework projects. It provides a custom Tree View for project structure (Source, Packages/Portal, Project), specialized Webview editors for configuration files, and a virtual file system (`wiz://`) for managing application files.

> 📚 **Architecture Guide**: See [architecture-guide.md](./architecture-guide.md) for detailed refactoring principles and coding conventions.

## Architecture & Core Components

- **Entry Point**: `src/extension.js` initializes providers, registers commands, and delegates to service managers.
- **Services Layer**: `src/services/` contains business logic separated by domain:
  - `source/appManager.js`: Standard App/Route creation and management
  - `packages/packageManager.js`: Package and Portal App management
  - `project/projectManager.js`: Project lifecycle (switch, import, export, delete)
  - `file/fileManager.js`: File operations (create, delete, copy, paste, rename, download)
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

### Task-Based Work Management

When the user gives a work instruction without specific details — such as **"do the task"**, **"proceed with todo"**, **"작업 수행해줘"**, **"todo 작업 진행해줘"** — read `.github/task/todo.md` and execute the defined tasks in order. See the **Task-Based Work Management (Details)** section below for full rules.

---

## Task-Based Work Management (Details)

### Directory Structure

```
.github/task/
├── todo.md              # Task list (to-do)
├── worked/              # Completed task archive
│   ├── FN-20260222-0001.md
│   ├── FN-20260222-0002.md
│   └── ...
└── reviewed/            # Archive moved after review cleanup
    ├── FN-20260222-0001.md
    └── ...
```

### todo.md Format

Tasks are separated by `#` headings with a **task number**. The task number follows the format `FN-{YYYYMMDD}-{NNNN}`.

```markdown
# FN-20260222-0001: Endpoint Settings / Variables Tab
- Implement toggle-style selection UI for actions in API parameters (since actions have fixed values)

# FN-20260222-0002: API Spec & Test Tab
- Implement actual API connection and result display in the API Spec & Test screen
```

### Task Execution Flow

When the user gives a work instruction, follow this sequence:

1. **Read todo.md**: Read `.github/task/todo.md` to identify the task list.
2. **Execute task**: Perform tasks in order by task number (or only the specified task if the user names a specific number). Each task must follow the development principles defined in this document.
3. **Write Devlog**: After completing a task, create a devlog entry following the Development Log (devlog) Convention section above.
4. **Create worked archive**: Create a per-task-number file in `.github/task/worked/`.
5. **Clean up todo.md**: Remove the completed task entry from `todo.md`.
6. **Maintain dummy template**: If all items are removed and `todo.md` becomes empty, leave a dummy template with the **next sequence number** after the last archived task number.
   ```markdown
   # FN-20260222-0004: (Next task title)
   - Describe the task here
   ```
   - Example: If `FN-20260222-0003` was the last completed → leave `FN-20260222-0004` as the template.
   - This allows the next sequential number to be immediately visible when adding new tasks.

### worked Archive File Format

Completed tasks are recorded in `.github/task/worked/{task-number}.md` using this format:

```markdown
# {task-number}: {Task Title}

## Original Task Description
{Copy the original content from todo.md exactly as-is}

## Summary of Work Done
{Concise summary of what was implemented and how}

## Related Devlog
- **Date**: {YYYY-MM-DD}
- **Devlog ID**: {NNN}
- **Detail File**: `devlog/v{version}/{NNN}-{slug}.md`
```

> ⚠️ **Original Preservation Principle**: The `## Original Task Description` section must contain the **exact original text** from `todo.md` — do not summarize, reorganize, or rephrase. Preserve line breaks, indentation, and markdown formatting as-is. Arbitrary abbreviation or restructuring is prohibited.

### Adding New Todo Items

When the user says **"add to todo"**, **"register a task"**, **"todo에 추가해줘"**, **"할 일 등록해줘"**, etc.:

1. Read `.github/task/todo.md` to check existing task numbers.
2. Generate a task number in `FN-{YYYYMMDD}-{NNNN}` format.
   - **YYYYMMDD**: Current date
   - **NNNN**: Zero-padded 4-digit sequence for that date (last existing number for the same date + 1)
   - Examples: `FN-20260222-0001`, `FN-20260222-0002`
3. Organize the user's request into a `# FN-{number}: {Title}` heading with sub-items and append it to `todo.md`.

```markdown
# FN-20260222-0003: Explorer Menu Updates
- Rename resource group labels
- Add namespace detail page
```

### Executing a Specific Task

When the user mentions a specific task number, execute only that task:
- "Do task FN-20260222-0001" → Execute only that numbered task
- "Do the 1st todo task" → Execute the first `#` item in todo.md
- No number specified → Execute from the **first item** in todo.md sequentially (one at a time; proceed to next after completion)

### Review Cleanup and TODO Generation

When the user says **"clean up reviews"**, **"generate TODO from reviews"**, **"리뷰 정리해줘"**, **"리뷰 정리해서 TODO 생성해줘"**, etc., follow the procedure below.

#### Procedure

1. **Scan worked folder**: Read all `.md` files in `.github/task/worked/`.
2. **Check for `# Review` section**: Check each file for a `# Review` (or `## Review`) heading.
   - Files **without** a `# Review` section are left untouched (no move, no modification).
3. **Create TODO items**: Organize the `# Review` section content into new task items in `.github/task/todo.md`.
   - Task numbers follow the existing todo addition rules (`FN-{YYYYMMDD}-{NNNN}`).
   - If the review content contains multiple independent tasks, split each into a separate TODO item.
   - If the review content is a single task, create one TODO item.
4. **Move to reviewed folder**: Move the worked files that had a `# Review` section to `.github/task/reviewed/`.
   - Create the `reviewed/` folder if it doesn't exist.
   - Keep the filename unchanged (e.g., `worked/FN-20260222-0001.md` → `reviewed/FN-20260222-0001.md`).
5. **Report results**: Inform the user of the number of files processed, TODO items created, and files skipped.

#### Review Section Guide (in worked files)

If additional improvements are needed after completing a task, add a `# Review` section to the worked archive file:

```markdown
# FN-20260222-0001: Task Title

## Original Task Description
...

## Summary of Work Done
...

## Related Devlog
...

# Review
- Search performance improvement needed: currently doing full scan with LIKE query, consider adding an index
- Error message i18n not yet applied
```

When the user later runs "clean up reviews", the Review content above is automatically converted into TODO items.

### Notable files
- `src/core/constants.js`: centralized icons, file types, and app definitions.
- `src/editor/editors/editorBase.js`: Shared logic for Webview panel creation and lifecycle.
