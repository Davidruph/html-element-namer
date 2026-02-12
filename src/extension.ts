import * as vscode from "vscode";
import { nameGenerator } from "./nameGenerator";
import { classIdScanner } from "./classIdScanner";
import { CSSCompletionProvider } from "./cssCompletionProvider";
import { EmmetCompletionProvider } from "./emmetCompletionProvider";

/**
 * Generate a unique class name and insert it into HTML
 */
async function generateUniqueClassName() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor");
    return;
  }

  const document = editor.document;
  if (
    !document.languageId.match(
      /html|jsx|tsx|vue|javascriptreact|typescriptreact/
    )
  ) {
    vscode.window.showErrorMessage(
      "This command only works in HTML/JSX/Vue files"
    );
    return;
  }

  // Scan workspace to get existing names
  const existingItems = await classIdScanner.getClassesAndIds();
  existingItems.forEach((item) => {
    nameGenerator.addUsedName(item.name);
  });

  // Ask user for prefix
  const prefix = await vscode.window.showInputBox({
    prompt: 'Enter a prefix for the class name (e.g., "button", "card")',
    value: "elem",
    validateInput: (input) => {
      if (!input.match(/^[a-z0-9_-]*$/i)) {
        return "Use only alphanumeric characters, hyphens, and underscores";
      }
      return "";
    }
  });

  if (prefix === undefined) {
    return; // User cancelled
  }

  const generatedName = nameGenerator.generateUniqueName(prefix || "elem");

  // Ask user whether to add as class or id
  const selection = await vscode.window.showQuickPick(["class", "id"], {
    placeHolder: "Add as class or id?"
  });

  if (!selection) {
    return;
  }

  const attributeName = selection === "class" ? "class" : "id";
  const replacement = `${attributeName}="${generatedName}"`;

  // Insert at cursor position
  editor.edit((editBuilder) => {
    editBuilder.insert(editor.selection.active, replacement);
  });

  vscode.window.showInformationMessage(`Generated: ${replacement}`);
}

/**
 * Refresh the workspace scan for class/id names
 */
async function refreshClassIdScan() {
  classIdScanner.clearCache();
  await classIdScanner.scanWorkspace();
  vscode.window.showInformationMessage("Workspace scan refreshed");
}

let hasSeededNames = false;
let isAutoInsertInProgress = false;

async function seedUsedNamesIfNeeded() {
  if (hasSeededNames) {
    return;
  }
  const existingItems = await classIdScanner.getClassesAndIds();
  existingItems.forEach((item) => {
    nameGenerator.addUsedName(item.name);
  });
  hasSeededNames = true;
}

async function handleAutoInsert(
  event: vscode.TextDocumentChangeEvent,
  editor: vscode.TextEditor
) {
  const document = event.document;
  const config = vscode.workspace.getConfiguration("html-element-namer");
  const autoGenerate = config.get<boolean>("autoGenerate", false);
  if (!autoGenerate || isAutoInsertInProgress) {
    return;
  }

  if (
    !document.languageId.match(
      /html|jsx|tsx|vue|javascriptreact|typescriptreact/
    )
  ) {
    return;
  }

  const autoPrefix = config.get<string>("autoPrefix", "elem") || "elem";
  const autoPrefixMode = config.get<string>("autoPrefixMode", "fixed");
  const attributePattern = /(class|className|id)=(['"])\2/g;

  for (const change of event.contentChanges) {
    if (!change.text) {
      continue;
    }

    const matches: { index: number; attribute: string }[] = [];
    let match: RegExpExecArray | null;
    while ((match = attributePattern.exec(change.text)) !== null) {
      matches.push({
        index: match.index,
        attribute: match[1]
      });
    }

    if (!matches.length) {
      continue;
    }

    await seedUsedNamesIfNeeded();

    isAutoInsertInProgress = true;
    await editor.edit((editBuilder) => {
      for (const item of matches.sort((a, b) => b.index - a.index)) {
        const insertOffset =
          document.offsetAt(change.range.start) +
          item.index +
          `${item.attribute}=`.length +
          1;
        const insertPosition = document.positionAt(insertOffset);
        const tagPrefix =
          autoPrefixMode === "element"
            ? getTagNameBeforePosition(document, insertPosition) || autoPrefix
            : autoPrefix;
        const generatedName = nameGenerator.generateUniqueName(tagPrefix);
        editBuilder.insert(insertPosition, generatedName);
      }
    });
    isAutoInsertInProgress = false;
  }
}

function getTagNameBeforePosition(
  document: vscode.TextDocument,
  position: vscode.Position
): string | undefined {
  const start = new vscode.Position(0, 0);
  const text = document.getText(new vscode.Range(start, position));
  const match = /<([a-zA-Z][\w:-]*)[^>]*$/.exec(text);
  return match?.[1];
}

export function activate(context: vscode.ExtensionContext) {
  console.log("HTML Element Namer extension activated");

  // Register command to generate unique class names
  const generateClassCommand = vscode.commands.registerCommand(
    "html-element-namer.generateUniqueName",
    generateUniqueClassName
  );

  // Register command to refresh scan
  const refreshCommand = vscode.commands.registerCommand(
    "html-element-namer.refreshScan",
    refreshClassIdScan
  );

  // Register CSS completion provider
  const cssProvider = vscode.languages.registerCompletionItemProvider(
    { language: "css", scheme: "file" },
    new CSSCompletionProvider(),
    ".",
    "#"
  );

  // Also register for SCSS and LESS
  const scssProvider = vscode.languages.registerCompletionItemProvider(
    { language: "scss", scheme: "file" },
    new CSSCompletionProvider(),
    ".",
    "#"
  );

  const lessProvider = vscode.languages.registerCompletionItemProvider(
    { language: "less", scheme: "file" },
    new CSSCompletionProvider(),
    ".",
    "#"
  );

  const emmetProvider = vscode.languages.registerCompletionItemProvider(
    [
      { language: "html", scheme: "file" },
      { language: "javascriptreact", scheme: "file" },
      { language: "typescriptreact", scheme: "file" },
      { language: "vue", scheme: "file" }
    ],
    new EmmetCompletionProvider(),
    ".",
    "#"
  );

  // File system watcher to refresh on changes
  const watcher = vscode.workspace.createFileSystemWatcher(
    "**/*.{html,jsx,tsx,vue}"
  );
  watcher.onDidChange(() => {
    classIdScanner.clearCache();
    hasSeededNames = false;
  });
  watcher.onDidCreate(() => {
    classIdScanner.clearCache();
    hasSeededNames = false;
  });
  watcher.onDidDelete(() => {
    classIdScanner.clearCache();
    hasSeededNames = false;
  });

  const autoInsert = vscode.workspace.onDidChangeTextDocument(async (event) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== event.document) {
      return;
    }
    await handleAutoInsert(event, editor);
  });

  context.subscriptions.push(
    generateClassCommand,
    refreshCommand,
    cssProvider,
    scssProvider,
    lessProvider,
    emmetProvider,
    watcher,
    autoInsert
  );
}

export function deactivate() {}
