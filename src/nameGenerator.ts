import * as crypto from "crypto";

/**
 * Generates a unique class/id name
 */
export class NameGenerator {
  private usedNames: Set<string> = new Set();

  /**
   * Generate a unique name based on timestamp and random hash
   * @param prefix Optional prefix for the generated name
   * @returns A unique class/id name
   */
  generateUniqueName(prefix: string = "elem"): string {
    let name = "";
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const hash = crypto
        .createHash("md5")
        .update(Date.now() + Math.random().toString())
        .digest("hex")
        .slice(0, 5);

      name = `${prefix}-${hash}`;

      if (!this.usedNames.has(name)) {
        this.usedNames.add(name);
        return name;
      }

      attempts++;
    }

    throw new Error("Unable to generate unique name after max attempts");
  }

  /**
   * Add a name that's already in use
   */
  addUsedName(name: string): void {
    this.usedNames.add(name);
  }

  /**
   * Get all used names
   */
  getUsedNames(): string[] {
    return Array.from(this.usedNames);
  }

  /**
   * Clear all tracked names
   */
  clear(): void {
    this.usedNames.clear();
  }
}

export const nameGenerator = new NameGenerator();
