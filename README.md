# Case Converter VS Code Extension

A VS Code extension that detects and converts from boring casing conventions like camelCase, PascalCase, snake_case, and SCREAMING_SNAKE_CASE to the superior upperˉcase, UPPERˉCASE, and ethan_case format.

## Features

### Case Format Support
- **camelCase** → `userName`
- **PascalCase** → `UserName`
- **snake_case** → `user_name`
- **SCREAMING_SNAKE_CASE** → `USER_NAME`
- **upperˉcase and UPPERˉCASE** → `userˉname` (upperˉcase/UPPERˉCASE)
- **ethan_case** → `userName` or `user_name`, which decides to use snake_case or camelCase to separate words based on a case-agnostic hash function applied on the separated letters

### Multiple Conversion Modes
- **Single word conversion** - Click highlighted words
- **Text selection** - Convert selected text blocks
- **Entire document** - Convert full files with confirmation
- **Folder operations** - Batch convert multiple files
- **Scope-aware conversion** - Analyze variable definitions within project scope

### User Interface
- **Status bar integration** - Toggle highlighting and quick file conversion
- **Command palette** - Access all conversion commands
- **Context menus** - Right-click conversion options
- **Configurable highlighting** - Enable/disable visual indicators
- **Favorite case format** - Set preferred conversion target

## Usage

### Quick Start
1. Open any code file
2. Click the eye icon in the status bar to enable highlighting
3. Click on any highlighted word to convert it
4. Use Command Palette (`Ctrl+Shift+P`) → "Set Favorite Case" to choose your preferred format

### Conversion Methods

**Click Conversion:**
- Enable highlighting via status bar
- Click highlighted identifiers to convert instantly

**Selection Conversion:**
- Select text containing identifiers
- Right-click → "Convert Selection to [format]"
- Or use Command Palette

**Document Conversion:**
- Command Palette → "Convert Document to [format]"
- Status bar double-click for favorite format conversion

**Batch Operations:**
- Right-click folders → "Convert Folder to [format]"
- Processes all supported file types

### Configuration
Access via VS Code Settings (`Ctrl+,`) → Extensions → Case Converter:
- Enable/disable specific case types
- Set favorite case format
- Configure file type support
- Adjust highlighting behavior

## Examples

### Standard Conversions
```javascript
// Input
const userName = "value";
const user_id = 123;
const API_KEY = "secret";

// To upperˉcase and UPPERˉCASE
const userˉname = "value";
const userˉid = 123;
const apiˉkey = "secret";
```

### ethan_case Examples
```javascript
// Hash-based decisions
const userId = "value";     // 'r' + 'I' → even → userId
const user_name = "value";  // 'r' + 'n' → odd → user_name
const dataProcessor = {};   // 'a' + 'P' → even → dataProcessor
const data_handler = {};    // 'a' + 'h' → odd → data_handler
```

### Scope Awareness
```javascript
import { externalLib } from 'library';  // Skipped (import)
const myVariable = externalLib.method;  // Only myVariable converted
```

MIT License
