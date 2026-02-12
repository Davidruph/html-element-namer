import * as vscode from "vscode";

interface ClassOrIdMatch {
  name: string;
  type: "class" | "id";
  file: string;
  line: number;
}

/**
 * Scans workspace files for class and id names in HTML/JSX files
 */
export class ClassIdScanner {
  private cache: Map<string, ClassOrIdMatch[]> = new Map();

  /**
   * Scan all HTML/JSX files in workspace for class and id names
   */
  async scanWorkspace(): Promise<ClassOrIdMatch[]> {
    const results: ClassOrIdMatch[] = [];
    const classIdPattern = /(?:class|className|id)=["']([^"']+)["']/g;
    const files = await vscode.workspace.findFiles(
      "**/*.{html,jsx,tsx,vue}",
      "**/node_modules/**"
    );

    for (const file of files) {
      const document = await vscode.workspace.openTextDocument(file);
      const text = document.getText();
      const relativePath = vscode.workspace.asRelativePath(file);

      let match;
      while ((match = classIdPattern.exec(text)) !== null) {
        const content = match[1];
        const line = document.positionAt(match.index).line;

        // Handle multiple classes
        if (content.includes(" ")) {
          content.split(/\s+/).forEach((name) => {
            if (name.trim()) {
              results.push({
                name: name.trim(),
                type: "class",
                file: relativePath,
                line: line + 1
              });
            }
          });
        } else {
          results.push({
            name: content,
            type: match[0].includes("id=") ? "id" : "class",
            file: relativePath,
            line: line + 1
          });
        }
      }
    }

    // Cache results
    const cacheKey = "workspace-scan";
    this.cache.set(cacheKey, results);

    return results;
  }

  /**
   * Get cached classes and ids from HTML files
   */
  async getClassesAndIds(): Promise<ClassOrIdMatch[]> {
    const cached = this.cache.get("workspace-scan");
    if (cached) {
      return cached;
    }
    return this.scanWorkspace();
  }

  /**
   * Get only class names
   */
  async getClasses(): Promise<string[]> {
    const items = await this.getClassesAndIds();
    return [
      ...new Set(
        items.filter((item) => item.type === "class").map((item) => item.name)
      )
    ];
  }

  /**
   * Get only id names
   */
  async getIds(): Promise<string[]> {
    const items = await this.getClassesAndIds();
    return [
      ...new Set(
        items.filter((item) => item.type === "id").map((item) => item.name)
      )
    ];
  }

  /**
   * Clear cache (useful when files change)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const classIdScanner = new ClassIdScanner();
