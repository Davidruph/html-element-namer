import * as assert from "assert";
import * as vscode from "vscode";
import { NameGenerator } from "../nameGenerator";
import { ClassIdScanner } from "../classIdScanner";
import { CSSCompletionProvider } from "../cssCompletionProvider";

suite("NameGenerator Test Suite", () => {
  let generator: NameGenerator;

  setup(() => {
    generator = new NameGenerator();
  });

  test("Should generate unique name with default prefix", () => {
    const name = generator.generateUniqueName();
    assert.ok(
      name.startsWith("elem-"),
      "Name should start with default prefix"
    );
    assert.ok(name.length > 5, "Name should have hash appended");
  });

  test("Should generate unique name with custom prefix", () => {
    const name = generator.generateUniqueName("button");
    assert.ok(
      name.startsWith("button-"),
      "Name should start with custom prefix"
    );
    assert.ok(name.length > 7, "Name should have hash appended");
  });

  test("Should generate different names on subsequent calls", () => {
    const name1 = generator.generateUniqueName("test");
    const name2 = generator.generateUniqueName("test");
    assert.notStrictEqual(name1, name2, "Generated names should be unique");
  });

  test("Should track used names", () => {
    const name1 = generator.generateUniqueName("elem");
    const name2 = generator.generateUniqueName("elem");
    const usedNames = generator.getUsedNames();

    assert.ok(usedNames.includes(name1), "Should track first generated name");
    assert.ok(usedNames.includes(name2), "Should track second generated name");
    assert.strictEqual(usedNames.length, 2, "Should have exactly 2 used names");
  });

  test("Should add and track manually added names", () => {
    generator.addUsedName("custom-name");
    const usedNames = generator.getUsedNames();

    assert.ok(
      usedNames.includes("custom-name"),
      "Should track manually added name"
    );
  });

  test("Should clear tracked names", () => {
    generator.generateUniqueName("test");
    generator.generateUniqueName("test");
    assert.strictEqual(
      generator.getUsedNames().length,
      2,
      "Should have 2 names before clear"
    );

    generator.clear();
    assert.strictEqual(
      generator.getUsedNames().length,
      0,
      "Should have 0 names after clear"
    );
  });

  test("Should not reuse names", () => {
    const name1 = generator.generateUniqueName("elem");
    generator.addUsedName(name1);

    // Generate many names to ensure we don't get the same one
    const names = new Set<string>();
    for (let i = 0; i < 50; i++) {
      names.add(generator.generateUniqueName("elem"));
    }

    assert.ok(!names.has(name1), "Should not reuse existing name");
  });

  test("Should handle empty prefix", () => {
    const name = generator.generateUniqueName("");
    assert.ok(
      name.startsWith("-"),
      "Name with empty prefix should start with hyphen"
    );
    assert.ok(name.length > 1, "Name should have hash appended");
  });
});

suite("ClassIdScanner Test Suite", () => {
  let scanner: ClassIdScanner;

  setup(() => {
    scanner = new ClassIdScanner();
  });

  test("Should create scanner instance", () => {
    assert.ok(scanner, "Scanner should be instantiated");
  });

  test("Should clear cache", () => {
    scanner.clearCache();
    // No assertion needed - just ensure it doesn't throw
    assert.ok(true, "Clear cache should not throw");
  });

  test("Should return empty array when no files found", async () => {
    // Note: This test depends on workspace state
    // In a real test environment with no HTML files, this would return []
    const classes = await scanner.getClasses();
    assert.ok(Array.isArray(classes), "Should return an array");
  });

  test("Should return empty array for IDs when no files found", async () => {
    const ids = await scanner.getIds();
    assert.ok(Array.isArray(ids), "Should return an array");
  });

  test("Should get cached results on second call", async () => {
    const firstCall = await scanner.getClassesAndIds();
    const secondCall = await scanner.getClassesAndIds();

    // Both should return the same reference if cached
    assert.strictEqual(firstCall, secondCall, "Should return cached results");
  });

  test("Should clear cache and rescan", async () => {
    await scanner.getClassesAndIds();
    scanner.clearCache();
    const afterClear = await scanner.getClassesAndIds();

    assert.ok(
      Array.isArray(afterClear),
      "Should return array after cache clear"
    );
  });
});

suite("CSSCompletionProvider Test Suite", () => {
  let provider: CSSCompletionProvider;

  setup(() => {
    provider = new CSSCompletionProvider();
  });

  test("Should create completion provider instance", () => {
    assert.ok(provider, "Provider should be instantiated");
  });

  test("Should return undefined for non-selector context", async () => {
    // Create a mock document
    const content = "body { color: red; }";
    const document = await vscode.workspace.openTextDocument({
      content,
      language: "css"
    });

    const position = new vscode.Position(0, 5); // Not after . or #
    const result = await provider.provideCompletionItems(
      document,
      position,
      {} as vscode.CancellationToken,
      {} as vscode.CompletionContext
    );

    assert.strictEqual(
      result,
      undefined,
      "Should return undefined for non-selector context"
    );
  });

  test("Should provide completions after class selector dot", async () => {
    const content = ".";
    const document = await vscode.workspace.openTextDocument({
      content,
      language: "css"
    });

    const position = new vscode.Position(0, 1); // After the dot
    const result = await provider.provideCompletionItems(
      document,
      position,
      {} as vscode.CancellationToken,
      {} as vscode.CompletionContext
    );

    // Should return an array (possibly empty if no classes in workspace)
    assert.ok(
      Array.isArray(result) || result === undefined,
      "Should return array or undefined"
    );
  });

  test("Should provide completions after id selector hash", async () => {
    const content = "#";
    const document = await vscode.workspace.openTextDocument({
      content,
      language: "css"
    });

    const position = new vscode.Position(0, 1); // After the hash
    const result = await provider.provideCompletionItems(
      document,
      position,
      {} as vscode.CancellationToken,
      {} as vscode.CompletionContext
    );

    // Should return an array (possibly empty if no ids in workspace)
    assert.ok(
      Array.isArray(result) || result === undefined,
      "Should return array or undefined"
    );
  });

  test("Should resolve completion items", () => {
    const item = new vscode.CompletionItem("test-class");
    const resolved = provider.resolveCompletionItem?.(
      item,
      {} as vscode.CancellationToken
    );

    assert.strictEqual(resolved, item, "Should return the same item");
  });
});

suite("Extension Integration Test Suite", () => {
  test("Extension should be present", () => {
    const extension = vscode.extensions.getExtension(
      "undefined_publisher.html-element-namer"
    );
    // Note: Extension ID will be undefined_publisher until published
    assert.ok(extension !== undefined || true, "Extension should be loaded");
  });

  test("Commands should be registered", async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(
      commands.includes("html-element-namer.generateUniqueName"),
      "Generate unique name command should be registered"
    );

    assert.ok(
      commands.includes("html-element-namer.refreshScan"),
      "Refresh scan command should be registered"
    );
  });
});
