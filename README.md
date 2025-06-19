# Case Converter VS Code Extension

A powerful VS Code extension that intelligently detects and converts between multiple case formats including camelCase, PascalCase, snake_case, SCREAMING_SNAKE_CASE, macron case (upperˉcase), and the unique ethan_case format.

## Features

### Case Format Support
- **camelCase** → `userName`
- **PascalCase** → `UserName`
- **snake_case** → `user_name`
- **SCREAMING_SNAKE_CASE** → `USER_NAME`
- **macron case** → `userˉname` (upperˉcase/UPPERˉCASE)
- **ethan_case** → `userName` or `user_name` (hash-based decision)

### Smart Detection & Conversion
- **Intelligent highlighting** - Highlights convertible identifiers in real-time
- **Click to convert** - Simply click on highlighted words to convert them
- **Scope awareness** - Distinguishes between local variables and external dependencies
- **Import statement protection** - Automatically skips import/require statements
- **Hover previews** - See conversion results before applying changes

### ethan_case Algorithm
The unique ethan_case format uses a sophisticated hash function to determine whether word boundaries should use underscores or camelCase:
- Hash calculation is case-agnostic for consistency
- Uses adjacent character codes with bit mixing for even distribution
- Odd hash = underscore separator (`user_name`)
- Even hash = camelCase separator (`userName`)

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

## Installation

### From VSIX Package
1. Download the `.vsix` file
2. Open VS Code
3. Go to Extensions view (`Ctrl+Shift+X`)
4. Click the `...` menu → "Install from VSIX..."
5. Select the downloaded `.vsix` file

### Development Setup
1. Clone this repository
2. Install dependencies: `npm install`
3. Compile TypeScript: `npm run compile`
4. Press `F5` in VS Code to launch Extension Development Host

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

// To macron case (upperˉcase)
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

## File Structure
```
src/
├── extension.ts              # Main extension entry point
├── caseConverter.ts          # Core conversion logic
├── decorationProvider.ts     # Highlighting system
├── hoverProvider.ts          # Preview functionality
└── constants/
    ├── casePatterns.ts       # Regex patterns
    ├── definitionPatterns.ts # Variable detection
    └── externalPatterns.ts   # External library patterns
```

## Development

### Testing
Create test files to verify conversion accuracy:
- Mixed case formats
- Complex variable names
- Import statements
- External library usage

### Debugging
1. Set breakpoints in source files
2. Press `F5` to start debugging
3. Monitor console logs for hash calculations
4. Test scope detection and exclusions

### Building
```bash
npm install          # Install dependencies
npm run compile      # Compile TypeScript
vsce package         # Create .vsix file
```

## Advanced Features

### Hash Function Details
The ethan_case hash function:
- Normalizes character case for consistency
- Uses 33-bit left shift multiplication
- Applies bit mixing with prime numbers
- Provides even distribution across word boundaries

### Scope Analysis
The extension analyzes:
- Variable declarations (const, let, var)
- Function definitions
- Class declarations
- Object properties
- Export statements
- Import exclusions

### Performance
- Efficient regex-based pattern matching
- Debounced decoration updates
- Minimal impact on editor performance
- Smart import range detection

## Contributing

Contributions welcome! Areas for enhancement:
- Additional case format support
- Language-specific rules
- Custom pattern definitions
- Performance optimizations

## License

MIT License - feel free to use and modify! 
