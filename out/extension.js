"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const caseConverter_1 = require("./caseConverter");
const decorationProvider_1 = require("./decorationProvider");
const hoverProvider_1 = require("./hoverProvider");
function get_conversion_config() {
    const config = vscode.workspace.getConfiguration('caseConverter');
    return {
        convert_camelCase: config.get('convert_camelCase', true),
        convertPascalCase: config.get('convertPascalCase', true),
        convert_snakeCase: config.get('convert_snakeCase', true),
        convert_screamingSnakeCase: config.get('convert_screamingSnakeCase', true),
        output_format: config.get('output_format', 'upperˉcase')
    };
}
// Custom word range detection that handles macron characters
function getWordRangeAtPosition(document, position) {
    const line = document.lineAt(position.line);
    const text = line.text;
    const char = position.character;
    // Extended word pattern that includes macron characters
    const wordPattern = /[a-zA-Z0-9_ˉ]+/g;
    let match;
    while ((match = wordPattern.exec(text)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;
        if (char >= start && char < end) {
            return new vscode.Range(new vscode.Position(position.line, start), new vscode.Position(position.line, end));
        }
    }
    return undefined;
}
async function convert_singleFile(uri, converter) {
    try {
        // Clear scope for single file conversions (allow conversion of all variables)
        converter.clear_conversionScope();
        const document = await vscode.workspace.openTextDocument(uri);
        const original_text = document.getText();
        const conversion_config = get_conversion_config();
        const converted_text = converter.convert_text(original_text, conversion_config);
        if (original_text !== converted_text) {
            const edit = new vscode.WorkspaceEdit();
            const full_range = new vscode.Range(document.positionAt(0), document.positionAt(original_text.length));
            edit.replace(uri, full_range, converted_text);
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
                await document.save();
                vscode.window.showInformationMessage(`Converted: ${path.basename(uri.fsPath)}`);
            }
            else {
                vscode.window.showErrorMessage(`Failed to convert: ${path.basename(uri.fsPath)}`);
            }
        }
        else {
            vscode.window.showInformationMessage(`No changes needed in: ${path.basename(uri.fsPath)}`);
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`Error converting ${path.basename(uri.fsPath)}: ${error}`);
    }
}
async function convert_folder(folder_uri, converter) {
    const config = vscode.workspace.getConfiguration('caseConverter');
    const supported_types = config.get('supportedFileTypes', ['js', 'ts', 'jsx', 'tsx', 'py']);
    const exclude_patterns = config.get('excludePatterns', ['node_modules', '.git', 'dist', 'build']);
    try {
        const files = await findFilesInFolder(folder_uri.fsPath, supported_types, exclude_patterns);
        if (files.length === 0) {
            vscode.window.showInformationMessage('No supported files found in the selected folder.');
            return;
        }
        // Set conversion scope to analyze variables within the folder
        converter.set_conversionScope(folder_uri.fsPath, files);
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Converting files to upperˉcase...",
            cancellable: true
        }, async (progress, token) => {
            let converted = 0;
            let errors = 0;
            for (let i = 0; i < files.length; i++) {
                if (token.isCancellationRequested) {
                    vscode.window.showWarningMessage('Conversion cancelled by user');
                    converter.clear_conversionScope(); // Clear scope on cancellation
                    return;
                }
                const file = files[i];
                const file_name = path.basename(file);
                progress.report({
                    increment: (100 / files.length),
                    message: `Converting ${file_name} (${i + 1}/${files.length})`
                });
                try {
                    const fileUri = vscode.Uri.file(file);
                    await convert_singleFile(fileUri, converter);
                    converted++;
                }
                catch (error) {
                    console.error(`Error converting ${file}:`, error);
                    errors++;
                }
            }
            // Clear scope after conversion
            converter.clear_conversionScope();
            const message = `Conversion complete! ${converted} files converted${errors > 0 ? `, ${errors} errors` : ''}`;
            if (errors > 0) {
                vscode.window.showWarningMessage(message);
            }
            else {
                vscode.window.showInformationMessage(message);
            }
        });
    }
    catch (error) {
        converter.clear_conversionScope(); // Clear scope on error
        vscode.window.showErrorMessage(`Error processing folder: ${error}`);
    }
}
async function findFilesInFolder(folder_path, supported_types, exclude_patterns) {
    const files = [];
    async function scanDirectory(dir_path) {
        const entries = await fs.promises.readdir(dir_path, { withFileTypes: true });
        for (const entry of entries) {
            const full_path = path.join(dir_path, entry.name);
            // Skip excluded patterns
            if (exclude_patterns.some(pattern => entry.name.includes(pattern))) {
                continue;
            }
            if (entry.isDirectory()) {
                await scanDirectory(full_path);
            }
            else if (entry.isFile()) {
                const ext = path.extname(entry.name).slice(1); // Remove the dot
                if (supported_types.includes(ext)) {
                    files.push(full_path);
                }
            }
        }
    }
    await scanDirectory(folder_path);
    return files;
}
function activate(context) {
    const converter = new caseConverter_1.caseConverter();
    const decoration_provider = new decorationProvider_1.decorationProvider();
    // Create and register hover provider for conversion previews
    const hoverProvider = new hoverProvider_1.ConversionHoverProvider(converter);
    const hoverDisposable = vscode.languages.registerHoverProvider({ scheme: 'file' }, // Apply to all file schemes
    hoverProvider);
    const config = vscode.workspace.getConfiguration('caseConverter');
    let decorationsEnabled = config.get('enableHighlighting', true);
    let decorationsVisible = false; // Track if decorations are currently visible
    let decorationTimeout; // Timer for auto-hiding decorations
    // Register command for converting selected text
    const convert_selection_command = vscode.commands.registerCommand('caseConverter.convert_selection', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showInformationMessage('Please select text to convert');
            return;
        }
        // Clear scope for regular selection conversion
        converter.clear_conversionScope();
        const selected_text = editor.document.getText(selection);
        const conversion_config = get_conversion_config();
        const converted_text = converter.convert_text(selected_text, conversion_config);
        editor.edit(editBuilder => {
            editBuilder.replace(selection, converted_text);
        });
    });
    // Register command for converting selected text with scope awareness
    const convert_selection_withScopeCommand = vscode.commands.registerCommand('caseConverter.convert_selection_withScope', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showInformationMessage('Please select text to convert with scope');
            return;
        }
        const selected_text = editor.document.getText(selection);
        // Set the selected text as the conversion scope
        converter.set_textScope(selected_text);
        const conversion_config = get_conversion_config();
        const converted_text = converter.convert_text(selected_text, conversion_config);
        editor.edit(editBuilder => {
            editBuilder.replace(selection, converted_text);
        });
        vscode.window.showInformationMessage('Converted selection with scope awareness');
    });
    // Register command for converting entire document
    const convert_document_command = vscode.commands.registerCommand('caseConverter.convert_document', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        const document = editor.document;
        const full_range = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
        const original_text = document.getText();
        const conversion_config = get_conversion_config();
        const converted_text = converter.convert_text(original_text, conversion_config);
        const result = await vscode.window.showWarningMessage('This will convert the entire document. Continue?', 'Yes', 'No');
        if (result === 'Yes') {
            editor.edit(editBuilder => {
                editBuilder.replace(full_range, converted_text);
            });
        }
    });
    // Register commands for converting single file
    const convert_current_fileCommand = vscode.commands.registerCommand('caseConverter.convert_current_file', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        const result = await vscode.window.showWarningMessage('This will convert the entire file. Continue?', 'Yes', 'No');
        if (result === 'Yes') {
            await convert_singleFile(editor.document.uri, converter);
        }
    });
    // Register command for converting file from context menu
    const convert_fileCommand = vscode.commands.registerCommand('caseConverter.convert_file', async (uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('No file selected');
            return;
        }
        const result = await vscode.window.showWarningMessage(`This will convert ${path.basename(uri.fsPath)}. Continue?`, 'Yes', 'No');
        if (result === 'Yes') {
            await convert_singleFile(uri, converter);
        }
    });
    // Register commands for converting folders
    const convert_folder_command = vscode.commands.registerCommand('caseConverter.convertFolder', async (uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('No folder selected');
            return;
        }
        const result = await vscode.window.showWarningMessage(`This will convert all supported files in ${path.basename(uri.fsPath)}. Continue?`, 'Yes', 'No');
        if (result === 'Yes') {
            await convert_folder(uri, converter);
        }
    });
    // Register generic conversion commands
    const convert_current_file_toNewCaseCommand = vscode.commands.registerCommand('caseConverter.convert_current_fileToNewCase', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        // Show quick pick for output format
        const format_options = [
            { label: 'upperˉcase', description: 'Convert to lowercase with macron separators' },
            { label: 'UPPERˉCASE', description: 'Convert to uppercase with macron separators' },
            { label: 'ethan_case', description: 'Convert using algorithmic separator determination' }
        ];
        const selectedFormat = await vscode.window.showQuickPick(format_options, {
            placeHolder: 'Select output format'
        });
        if (!selectedFormat) {
            return;
        }
        // Temporarily override the output format
        const config = vscode.workspace.getConfiguration('caseConverter');
        await config.update('output_format', selectedFormat.label, vscode.ConfigurationTarget.Global);
        const result = await vscode.window.showWarningMessage('This will convert the entire file. Continue?', 'Yes', 'No');
        if (result === 'Yes') {
            await convert_singleFile(editor.document.uri, converter);
        }
    });
    const convert_folder_toNewCaseCommand = vscode.commands.registerCommand('caseConverter.convert_folder_toNewCase', async (uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('No folder selected');
            return;
        }
        // Show quick pick for output format
        const format_options = [
            { label: 'upperˉcase', description: 'Convert to lowercase with macron separators' },
            { label: 'UPPERˉCASE', description: 'Convert to uppercase with macron separators' },
            { label: 'ethan_case', description: 'Convert using algorithmic separator determination' }
        ];
        const selectedFormat = await vscode.window.showQuickPick(format_options, {
            placeHolder: 'Select output format'
        });
        if (!selectedFormat) {
            return;
        }
        // Temporarily override the output format
        const config = vscode.workspace.getConfiguration('caseConverter');
        await config.update('output_format', selectedFormat.label, vscode.ConfigurationTarget.Global);
        const result = await vscode.window.showWarningMessage(`This will convert all supported files in ${path.basename(uri.fsPath)}. Continue?`, 'Yes', 'No');
        if (result === 'Yes') {
            await convert_folder(uri, converter);
        }
    });
    // Helper function to convert with specific format
    async function convertFileWithFormat(uri, format) {
        const config = vscode.workspace.getConfiguration('caseConverter');
        const originalFormat = config.get('output_format');
        // Temporarily set the format
        await config.update('output_format', format, vscode.ConfigurationTarget.Global);
        const result = await vscode.window.showWarningMessage(`This will convert ${path.basename(uri.fsPath)} to ${format}. Continue?`, 'Yes', 'No');
        if (result === 'Yes') {
            await convert_singleFile(uri, converter);
        }
        // Restore original format
        await config.update('output_format', originalFormat, vscode.ConfigurationTarget.Global);
    }
    async function convertFolderWithFormat(uri, format) {
        const config = vscode.workspace.getConfiguration('caseConverter');
        const originalFormat = config.get('output_format');
        // Temporarily set the format
        await config.update('output_format', format, vscode.ConfigurationTarget.Global);
        const result = await vscode.window.showWarningMessage(`This will convert all supported files in ${path.basename(uri.fsPath)} to ${format}. Continue?`, 'Yes', 'No');
        if (result === 'Yes') {
            await convert_folder(uri, converter);
        }
        // Restore original format
        await config.update('output_format', originalFormat, vscode.ConfigurationTarget.Global);
    }
    // Register specific format conversion commands for files
    const convertFileToLowercase = vscode.commands.registerCommand('caseConverter.convertFileToLowercase', async (uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('No file selected');
            return;
        }
        await convertFileWithFormat(uri, 'upperˉcase');
    });
    const convertFileToUppercase = vscode.commands.registerCommand('caseConverter.convertFileToUppercase', async (uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('No file selected');
            return;
        }
        await convertFileWithFormat(uri, 'UPPERˉCASE');
    });
    const convertFileToEthanCase = vscode.commands.registerCommand('caseConverter.convertFileToEthanCase', async (uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('No file selected');
            return;
        }
        await convertFileWithFormat(uri, 'ethan_case');
    });
    // Register specific format conversion commands for folders
    const convertFolderToLowercase = vscode.commands.registerCommand('caseConverter.convertFolderToLowercase', async (uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('No folder selected');
            return;
        }
        await convertFolderWithFormat(uri, 'upperˉcase');
    });
    const convertFolderToUppercase = vscode.commands.registerCommand('caseConverter.convertFolderToUppercase', async (uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('No folder selected');
            return;
        }
        await convertFolderWithFormat(uri, 'UPPERˉCASE');
    });
    const convertFolderToEthanCase = vscode.commands.registerCommand('caseConverter.convertFolderToEthanCase', async (uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('No folder selected');
            return;
        }
        await convertFolderWithFormat(uri, 'ethan_case');
    });
    // Register toggle highlighting command
    const toggleHighlighting_command = vscode.commands.registerCommand('caseConverter.toggleHighlighting', () => {
        decorationsEnabled = !decorationsEnabled;
        const config = vscode.workspace.getConfiguration('caseConverter');
        config.update('enableHighlighting', decorationsEnabled, vscode.ConfigurationTarget.Global);
        if (decorationsEnabled) {
            vscode.window.showInformationMessage('Case highlighting enabled (hold Shift to see decorations)');
        }
        else {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                decoration_provider.clearDecorations(editor);
            }
            vscode.window.showInformationMessage('Case highlighting disabled');
        }
    });
    // Function to update decorations based on current state
    function updateDecorationsIfNeeded() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            if (decorationsEnabled && decorationsVisible) {
                decoration_provider.update_decorations(editor);
            }
            else {
                decoration_provider.clearDecorations(editor);
            }
        }
    }
    // Command to show decorations temporarily (replaces shift functionality)
    const showDecorationsTemporarily = vscode.commands.registerCommand('caseConverter.showDecorationsTemporarily', () => {
        if (!decorationsEnabled) {
            vscode.window.showInformationMessage('Case highlighting is disabled. Enable it in settings first.');
            return;
        }
        decorationsVisible = true;
        updateDecorationsIfNeeded();
        // Clear any existing timeout
        if (decorationTimeout) {
            clearTimeout(decorationTimeout);
        }
        // Hide decorations after 5 seconds
        decorationTimeout = setTimeout(() => {
            decorationsVisible = false;
            updateDecorationsIfNeeded();
        }, 5000);
        vscode.window.showInformationMessage('Showing decorations for 5 seconds...');
    });
    // Command to toggle decorations on/off
    const toggleDecorations = vscode.commands.registerCommand('caseConverter.toggleDecorations', () => {
        if (!decorationsEnabled) {
            vscode.window.showInformationMessage('Case highlighting is disabled. Enable it in settings first.');
            return;
        }
        decorationsVisible = !decorationsVisible;
        // Clear any existing timeout
        if (decorationTimeout) {
            clearTimeout(decorationTimeout);
            decorationTimeout = undefined;
        }
        updateDecorationsIfNeeded();
        update_status_bar(); // Update status bar to reflect new state
        if (decorationsVisible) {
            vscode.window.showInformationMessage('Highlights enabled');
        }
        else {
            vscode.window.showInformationMessage('Highlights disabled');
        }
    });
    // Command to quickly set favorite case format
    const setFavoriteCaseCommand = vscode.commands.registerCommand('caseConverter.setFavoriteCase', async () => {
        const format_options = [
            {
                label: 'upperˉcase',
                description: 'Convert to lowercase with macron separators',
                detail: 'camelCase → camelˉcase'
            },
            {
                label: 'UPPERˉCASE',
                description: 'Convert to uppercase with macron separators',
                detail: 'camelCase → CAMELˉCASE'
            },
            {
                label: 'ethan_case',
                description: 'Convert using algorithmic separator determination',
                detail: 'camelCase → camel_case or camelˉcase (smart choice)'
            }
        ];
        const current_favorite = vscode.workspace.getConfiguration('caseConverter').get('favoriteCase', 'upperˉcase');
        // Mark current favorite with a star
        format_options.forEach(option => {
            if (option.label === current_favorite) {
                option.label = `⭐ ${option.label}`;
                option.description = `${option.description} (current favorite)`;
            }
        });
        const selectedFormat = await vscode.window.showQuickPick(format_options, {
            placeHolder: 'Select your favorite case format for quick conversions',
            title: 'Set Favorite Case Format'
        });
        if (!selectedFormat) {
            return;
        }
        // Remove star from label if present
        const cleanLabel = selectedFormat.label.replace('⭐ ', '');
        // Update the setting
        const config = vscode.workspace.getConfiguration('caseConverter');
        await config.update('favoriteCase', cleanLabel, vscode.ConfigurationTarget.Global);
        // Update status bar to reflect new favorite
        update_status_bar();
        vscode.window.showInformationMessage(`Favorite case set to: ${cleanLabel}`);
    });
    // Command to convert individual word at cursor position
    const convertWordAtCursor = vscode.commands.registerCommand('caseConverter.convertWordAtCursor', async (position) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        // Use provided position or current cursor position
        const targetPosition = position || editor.selection.active;
        // Get word at position - use custom method for better macron support
        const wordRange = getWordRangeAtPosition(editor.document, targetPosition);
        if (!wordRange) {
            return;
        }
        const word = editor.document.getText(wordRange);
        console.log(`Converting word at cursor: "${word}"`);
        // Get favorite case format
        const config = vscode.workspace.getConfiguration('caseConverter');
        const favoriteCase = config.get('favoriteCase', 'upperˉcase');
        console.log(`Favorite case format: ${favoriteCase}`);
        // Create conversion config with favorite case format directly
        const conversion_config = get_conversion_config();
        conversion_config.output_format = favoriteCase;
        const convertedWord = converter.convert_text(word, conversion_config);
        console.log(`Conversion result: "${word}" → "${convertedWord}"`);
        // Apply the conversion if different
        if (convertedWord !== word) {
            await editor.edit(editBuilder => {
                editBuilder.replace(wordRange, convertedWord);
            });
            vscode.window.showInformationMessage(`Converted: ${word} → ${convertedWord}`);
        }
        else {
            console.log(`No conversion applied - word remained the same`);
            vscode.window.showInformationMessage(`No conversion needed for: ${word}`);
        }
    });
    // Status bar click handler with double-click for favorite case conversion
    let lastClickTime = 0;
    const statusBarClickCommand = vscode.commands.registerCommand('caseConverter.statusBarClick', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Open a file to use case conversion features');
            return;
        }
        const currentTime = Date.now();
        const isDoubleClick = currentTime - lastClickTime < 400; // 400ms window for double-click
        if (isDoubleClick) {
            // Double-click - convert to favorite case
            const config = vscode.workspace.getConfiguration('caseConverter');
            const favoriteCase = config.get('favoriteCase', 'upperˉcase');
            const result = await vscode.window.showWarningMessage(`Convert entire file to ${favoriteCase}? (Double-click detected)`, 'Yes', 'No');
            if (result === 'Yes') {
                // Temporarily set output format to favorite
                const originalFormat = config.get('output_format');
                await config.update('output_format', favoriteCase, vscode.ConfigurationTarget.Global);
                await convert_singleFile(editor.document.uri, converter);
                // Restore original format
                await config.update('output_format', originalFormat, vscode.ConfigurationTarget.Global);
            }
            lastClickTime = 0; // Reset to prevent triple-click issues
        }
        else {
            // Single click - toggle highlights
            if (!decorationsEnabled) {
                vscode.window.showInformationMessage('Case highlighting is disabled. Enable it in settings first.');
                return;
            }
            decorationsVisible = !decorationsVisible;
            // Clear any existing timeout
            if (decorationTimeout) {
                clearTimeout(decorationTimeout);
                decorationTimeout = undefined;
            }
            updateDecorationsIfNeeded();
            update_status_bar();
            lastClickTime = currentTime;
        }
    });
    // Update decorations when the active editor changes
    const onDidChangeActive_textEditor = vscode.window.onDidChangeActiveTextEditor(editor => {
        updateDecorationsIfNeeded();
    });
    // Update decorations when document content changes
    const onDidChange_text_document = vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (decorationsEnabled && decorationsVisible && editor && event.document === editor.document) {
            // Debounce updates to avoid excessive decoration updates
            setTimeout(() => {
                if (vscode.window.activeTextEditor === editor && decorationsVisible) {
                    decoration_provider.update_decorations(editor);
                }
            }, 500);
        }
    });
    // Handle clicks to convert individual words (using cursor position changes as proxy for clicks)
    const onDidChangeSelection = vscode.window.onDidChangeTextEditorSelection(event => {
        if (!decorationsVisible || !decorationsEnabled) {
            return;
        }
        const editor = event.textEditor;
        if (!editor) {
            return;
        }
        // Only handle single cursor selections (not multi-cursor or text selections)
        if (event.selections.length !== 1 || !event.selections[0].isEmpty) {
            return;
        }
        const selection = event.selections[0];
        const position = selection.active;
        // Get word at cursor position - use custom method for better macron support
        const wordRange = getWordRangeAtPosition(editor.document, position);
        if (!wordRange) {
            return;
        }
        const word = editor.document.getText(wordRange);
        // Check if this word is convertible using favorite case format
        const config = vscode.workspace.getConfiguration('caseConverter');
        const favoriteCase = config.get('favoriteCase', 'upperˉcase');
        const conversion_config = get_conversion_config();
        conversion_config.output_format = favoriteCase;
        console.log(`Checking word "${word}" for convertibility with format: ${favoriteCase}`);
        const isConvertible = converter.hasConvertibleCases(word, conversion_config);
        console.log(`Word "${word}" is convertible: ${isConvertible}`);
        if (!isConvertible) {
            return;
        }
        // Convert immediately on click
        console.log(`Converting word "${word}" at position ${position.line}:${position.character}`);
        vscode.commands.executeCommand('caseConverter.convertWordAtCursor', position);
    });
    // Status bar item for highlights toggle
    const status_barItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    function update_status_bar() {
        // Always show the toggle (even when no editor is active)
        const highlightIcon = decorationsVisible ? '$(eye)' : '$(eye-closed)';
        const highlightState = decorationsVisible ? 'ON' : 'OFF';
        // Get favorite case for double-click
        const favoriteCase = vscode.workspace.getConfiguration('caseConverter').get('favoriteCase', 'upperˉcase');
        status_barItem.text = `${highlightIcon} Highlights: ${highlightState}`;
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            // Check if there are convertible cases to show in tooltip
            const conversion_config = get_conversion_config();
            conversion_config.output_format = favoriteCase;
            const text = editor.document.getText();
            const hasConvertibleCases = converter.hasConvertibleCases(text, conversion_config);
            if (hasConvertibleCases) {
                status_barItem.tooltip = `Click: Toggle highlights\nDouble-click: Convert file to ${favoriteCase}\n\nClick once on highlighted words to convert them\n\n💡 Cmd+Shift+P → "Set Favorite Case" to change favorite format`;
            }
            else {
                status_barItem.tooltip = `Click: Toggle highlights\nDouble-click: Convert file to ${favoriteCase}\n\nNo convertible cases in current file\n\n💡 Cmd+Shift+P → "Set Favorite Case" to change favorite format`;
            }
        }
        else {
            status_barItem.tooltip = `Click: Toggle highlights\nDouble-click: Convert file to ${favoriteCase}\n\nOpen a file to see convertible cases\n\n💡 Cmd+Shift+P → "Set Favorite Case" to change favorite format`;
        }
        status_barItem.command = 'caseConverter.statusBarClick';
        status_barItem.show();
    }
    // Update status bar when active editor changes
    const onDidChangeActive_editor = vscode.window.onDidChangeActiveTextEditor(() => {
        update_status_bar();
    });
    // Update status bar when document content changes
    const onDidChange_document = vscode.workspace.onDidChangeTextDocument(() => {
        update_status_bar();
    });
    // Initial status bar setup - make it visible immediately
    status_barItem.text = `$(eye-closed) Highlights: OFF`;
    status_barItem.tooltip = `Click: Toggle highlights\nDouble-click: Convert file to ${vscode.workspace.getConfiguration('caseConverter').get('favoriteCase', 'upperˉcase')}\n\nOpen a file to see convertible cases`;
    status_barItem.command = 'caseConverter.statusBarClick';
    status_barItem.show();
    // Initial status bar update
    update_status_bar();
    // Note: Decorations will only show when Shift is pressed, so no initial decorations
    // Add all disposables to context
    context.subscriptions.push(hoverDisposable, setFavoriteCaseCommand, convertWordAtCursor, convert_selection_command, convert_selection_withScopeCommand, convert_document_command, convert_current_fileCommand, convert_fileCommand, convert_folder_command, convert_current_file_toNewCaseCommand, convert_folder_toNewCaseCommand, convertFileToLowercase, convertFileToUppercase, convertFileToEthanCase, convertFolderToLowercase, convertFolderToUppercase, convertFolderToEthanCase, toggleHighlighting_command, showDecorationsTemporarily, toggleDecorations, statusBarClickCommand, onDidChangeActive_textEditor, onDidChange_text_document, onDidChangeSelection, onDidChangeActive_editor, onDidChange_document, status_barItem, decoration_provider);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map