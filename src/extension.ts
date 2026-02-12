import * as vscode from "vscode";
import { nameGenerator } from "./nameGenerator";
import { classIdScanner } from "./classIdScanner";
import { CSSCompletionProvider } from "./cssCompletionProvider";

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
  if (!document.languageId.match(/html|jsx|tsx|vue/)) {
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

  // File system watcher to refresh on changes
  const watcher = vscode.workspace.createFileSystemWatcher(
    "**/*.{html,jsx,tsx,vue}"
  );
  watcher.onDidChange(() => classIdScanner.clearCache());
  watcher.onDidCreate(() => classIdScanner.clearCache());
  watcher.onDidDelete(() => classIdScanner.clearCache());

  context.subscriptions.push(
    generateClassCommand,
    refreshCommand,
    cssProvider,
    scssProvider,
    lessProvider,
    watcher
  );
}

export function deactivate() {}
