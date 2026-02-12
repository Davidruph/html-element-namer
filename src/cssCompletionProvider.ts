import * as vscode from "vscode";
import { classIdScanner } from "./classIdScanner";

/**
 * Provides CSS completion items for class and id selectors
 */
export class CSSCompletionProvider implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | vscode.CompletionList | undefined> {
    const line = document.lineAt(position.line).text;
    const beforeCursor = line.substring(0, position.character);
    const classMatch = /\.([\w-]*)$/.exec(beforeCursor);
    const idMatch = /#([\w-]*)$/.exec(beforeCursor);

    const isClassSelector = classMatch !== null;
    const isIdSelector = idMatch !== null;

    if (!isClassSelector && !isIdSelector) {
      return undefined;
    }

    const replaceLength = isClassSelector
      ? (classMatch?.[1]?.length ?? 0)
      : (idMatch?.[1]?.length ?? 0);
    const replaceRange = new vscode.Range(
      position.translate(0, -replaceLength),
      position
    );

    try {
      const items = await classIdScanner.getClassesAndIds();
      const completionItems: vscode.CompletionItem[] = [];

      if (isClassSelector) {
        // Filter and provide class completions
        const classes = items.filter((item) => item.type === "class");
        const uniqueClasses = new Map<string, vscode.CompletionItem>();

        classes.forEach((cls) => {
          if (!uniqueClasses.has(cls.name)) {
            const item = new vscode.CompletionItem(
              cls.name,
              vscode.CompletionItemKind.Class
            );
            item.detail = `Found in: ${cls.file}`;
            item.documentation = new vscode.MarkdownString(
              `**File:** ${cls.file}\n\n**Line:** ${cls.line}`
            );
            item.insertText = cls.name;
            item.range = replaceRange;
            uniqueClasses.set(cls.name, item);
          }
        });

        return Array.from(uniqueClasses.values());
      } else if (isIdSelector) {
        // Filter and provide id completions
        const ids = items.filter((item) => item.type === "id");
        const uniqueIds = new Map<string, vscode.CompletionItem>();

        ids.forEach((id) => {
          if (!uniqueIds.has(id.name)) {
            const item = new vscode.CompletionItem(
              id.name,
              vscode.CompletionItemKind.Field
            );
            item.detail = `Found in: ${id.file}`;
            item.documentation = new vscode.MarkdownString(
              `**File:** ${id.file}\n\n**Line:** ${id.line}`
            );
            item.insertText = id.name;
            item.range = replaceRange;
            uniqueIds.set(id.name, item);
          }
        });

        return Array.from(uniqueIds.values());
      }
    } catch (error) {
      console.error("Error providing CSS completions:", error);
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
