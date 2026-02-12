import * as vscode from "vscode";
import { classIdScanner } from "./classIdScanner";

/**
 * Provides class/id completions for Emmet-style abbreviations in HTML-like files.
 */
export class EmmetCompletionProvider implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | vscode.CompletionList | undefined> {
    const line = document.lineAt(position.line).text;
    const beforeCursor = line.substring(0, position.character);

    const match = /(^|[\s<])([a-zA-Z][\w-]*)?([.#])([\w-]*)$/.exec(
      beforeCursor
    );

    if (!match) {
      return undefined;
    }

    const selectorType = match[3] === "." ? "class" : "id";
    const typedPart = match[4] ?? "";
    const replaceRange = new vscode.Range(
      position.translate(0, -typedPart.length),
      position
    );

    try {
      const items = await classIdScanner.getClassesAndIds();
      const completionItems: vscode.CompletionItem[] = [];
      const uniqueItems = new Map<string, vscode.CompletionItem>();

      const filtered = items.filter((item) => item.type === selectorType);

      filtered.forEach((entry) => {
        if (uniqueItems.has(entry.name)) {
          return;
        }
        const kind =
          selectorType === "class"
            ? vscode.CompletionItemKind.Class
            : vscode.CompletionItemKind.Field;
        const item = new vscode.CompletionItem(entry.name, kind);
        item.detail = `Found in: ${entry.file}`;
        item.documentation = new vscode.MarkdownString(
          `**File:** ${entry.file}\n\n**Line:** ${entry.line}`
        );
        item.insertText = entry.name;
        item.range = replaceRange;
        uniqueItems.set(entry.name, item);
        completionItems.push(item);
      });

      return completionItems;
    } catch (error) {
      console.error("Error providing Emmet completions:", error);
    }

    return undefined;
  }

  resolveCompletionItem?(
    item: vscode.CompletionItem,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CompletionItem> {
    return item;
  }
}
