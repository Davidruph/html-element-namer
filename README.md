# HTML Element Namer

Auto-generate unique class/id names for HTML elements and provide CSS selector autocomplete.

## Features

- Generate unique class/id names from a command.
- Auto-insert class/id names when you type an empty class="" or id="" attribute.
- Use HTML tag names as the prefix (optional).
- CSS/SCSS/LESS autocomplete for class and id selectors.
- Emmet-style completions in HTML/JSX/TSX/Vue (e.g., `div.` or `section#`).

## Usage

### Generate a name manually

- Run **HTML Element Namer: Generate Unique Class/ID Name** from the Command Palette.
- Default keybinding: **Cmd+Shift+G** (macOS) / **Ctrl+Shift+G** (Windows/Linux).

### Auto-generate names while typing

1. Enable the setting `html-element-namer.autoGenerate`.
2. Type `class=""` or `id=""` in HTML/JSX/TSX/Vue.
3. A unique name is inserted automatically.

## Extension Settings

- `html-element-namer.autoGenerate`: Enable auto-insertion when typing empty class/id attributes.
- `html-element-namer.autoPrefix`: Prefix for generated names (default: `elem`).
- `html-element-namer.autoPrefixMode`: `fixed` or `element` to use the HTML tag name.

## Release Notes

### 0.0.1

- Initial release.
