"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.externalPatterns = void 0;
/**
 * Patterns for identifying external dependencies and built-in APIs
 * that should be excluded from case conversion
 */
exports.externalPatterns = [
    // VS Code API
    /^vscode$/,
    /WorkspaceEdit$/,
    /TextEditor$/,
    /TextDocument$/,
    /Range$/,
    /Position$/,
    /Uri$/,
    /ConfigurationTarget$/,
    /ProgressLocation$/,
    /StatusBarAlignment$/,
    /OverviewRulerLane$/,
    /DecorationOptions$/,
    /TextEditorDecorationType$/,
    /ExtensionContext$/,
    /QuickPickItem$/,
    // Node.js APIs
    /^fs$/,
    /^path$/,
    /^console$/,
    /^process$/,
    /^Buffer$/,
    /^__dirname$/,
    /^__filename$/,
    /^require$/,
    /^module$/,
    /^exports$/,
    // JavaScript built-ins
    /^Promise$/,
    /^Array$/,
    /^Object$/,
    /^String$/,
    /^Number$/,
    /^Boolean$/,
    /^RegExp$/,
    /^Date$/,
    /^Math$/,
    /^JSON$/,
    /^Error$/,
    /^TypeError$/,
    /^setTimeout$/,
    /^setInterval$/,
    /^clearTimeout$/,
    /^clearInterval$/,
    // Common built-in method names
    /^forEach$/,
    /^map$/,
    /^filter$/,
    /^reduce$/,
    /^push$/,
    /^pop$/,
    /^slice$/,
    /^join$/,
    /^split$/,
    /^indexOf$/,
    /^includes$/,
    /^match$/,
    /^replace$/,
    /^test$/,
    /^exec$/,
    /^toString$/,
    /^hasOwnProperty$/,
    /^length$/,
    /^substring$/,
    /^charAt$/,
    /^toLowerCase$/,
    /^toUpperCase$/,
    /^trim$/,
    /^startsWith$/,
    /^endsWith$/,
    // VS Code specific method names
    /^showInformationMessage$/,
    /^showErrorMessage$/,
    /^showWarningMessage$/,
    /^getConfiguration$/,
    /^registerCommand$/,
    /^createStatusBarItem$/,
    /^onDidChangeActiveTextEditor$/,
    /^withProgress$/,
    /^getText$/,
    /^positionAt$/,
    /^setDecorations$/,
    /^edit$/,
    /^save$/,
    /^get$/,
    /^set$/,
    /^dispose$/,
    // Single character variables (usually loop counters)
    /^[ijklmnpqrstuvwxyz]$/,
    // Common parameter names
    /^event$/,
    /^error$/,
    /^err$/,
    /^callback$/,
    /^resolve$/,
    /^reject$/,
    /^context$/,
    /^args$/,
    /^options$/,
    /^config$/,
    /^data$/,
    /^result$/,
    /^element$/,
    /^index$/,
    /^value$/,
    /^key$/,
    /^name$/,
    /^type$/,
    /^path$/,
    /^file$/
];
//# sourceMappingURL=externalPatterns.js.map