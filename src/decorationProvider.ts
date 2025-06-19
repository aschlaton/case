import * as vscode from 'vscode';
import { caseConverter, caseConversion_config } from './caseConverter';

export class decorationProvider {
    private readonly decoration_type: vscode.TextEditorDecorationType;
    private readonly converter: caseConverter;

    constructor() {
        this.converter = new caseConverter();
        
        // Create decoration type for highlighting convertible cases
        this.decoration_type = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 255, 0, 0.2)', // Light yellow background
            border: '1px dotted rgba(255, 165, 0, 0.8)', // Orange dotted border
            borderRadius: '2px',
            cursor: 'pointer', // Make cursor change to pointer when hovering
            overviewRulerColor: 'orange',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            after: {
                contentText: '',
                color: 'orange',
                fontWeight: 'bold'
            }
        });
    }

    /**
     * Update decorations for the active editor
     */
    public update_decorations(editor: vscode.TextEditor): void {
        if (!editor) {
            return;
        }

        // Get configuration settings
        const config = vscode.workspace.getConfiguration('caseConverter');
        const conversion_config: caseConversion_config = {
            convert_camelCase: config.get('convert_camelCase', true),
            convertPascalCase: config.get('convertPascalCase', true),
            convert_snakeCase: config.get('convert_snakeCase', true),
            convert_screamingSnakeCase: config.get('convert_screamingSnakeCase', true),
            output_format: config.get('output_format', 'upperˉcase')
        };

        const text = editor.document.getText();
        const decorations: vscode.DecorationOptions[] = [];

        // Get import ranges to skip them
        const import_ranges = this.converter.find_import_ranges(text);
        
        // Process line by line to skip import statements
        const lines = text.split('\n');
        let char_offset = 0;

        lines.forEach((line, lineIndex) => {
            if (!this.is_lineInImport_range(lineIndex, import_ranges)) {
                // Find all convertible case patterns based on configuration
                const patterns = [
                    { 
                        regex: /\b[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\b/g, 
                        type: 'camelCase',
                        enabled: conversion_config.convert_camelCase
                    },
                    { 
                        regex: /\b[A-Z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\b/g, 
                        type: 'PascalCase',
                        enabled: conversion_config.convertPascalCase
                    },
                    { 
                        regex: /\b[a-z][a-z0-9]*(_[a-z0-9]+)+\b/g, 
                        type: 'snake_case',
                        enabled: conversion_config.convert_snakeCase
                    },
                    { 
                        regex: /\b[A-Z][A-Z0-9]*(_[A-Z0-9]+)+\b/g, 
                        type: 'SCREAMING_SNAKE_CASE',
                        enabled: conversion_config.convert_screamingSnakeCase
                    }
                ];

                patterns.forEach(pattern => {
                    if (!pattern.enabled) {
                        return; // Skip this pattern if disabled
                    }

                    let match;
                    while ((match = pattern.regex.exec(line)) !== null) {
                        // Check if this variable should be excluded from conversion
                        if (this.converter.should_excludeFromConversion(match[0])) {
                            continue; // Skip highlighting external variables
                        }
                        
                        const absoluteIndex = char_offset + match.index;
                        const startPos = editor.document.positionAt(absoluteIndex);
                        const end_pos = editor.document.positionAt(absoluteIndex + match[0].length);
                        const range = new vscode.Range(startPos, end_pos);

                        const decoration: vscode.DecorationOptions = {
                            range,
                            hoverMessage: `${pattern.type} detected: "${match[0]}" → Click to convert to ${conversion_config.output_format === 'ethan_case' ? 'ethan_case' : conversion_config.output_format || 'upperˉcase'}`
                        };

                        decorations.push(decoration);
                    }
                    // Reset regex lastIndex
                    pattern.regex.lastIndex = 0;
                });
            }
            
            // Update character offset for next line (include newline character)
            char_offset += line.length + 1;
        });

        editor.setDecorations(this.decoration_type, decorations);
    }

    /**
     * Check if a line index is within any import range
     */
    private is_lineInImport_range(lineIndex: number, ranges: Array<{start: number, end: number}>): boolean {
        return ranges.some(range => lineIndex >= range.start && lineIndex <= range.end);
    }

    /**
     * Clear all decorations
     */
    public clearDecorations(editor: vscode.TextEditor): void {
        if (editor) {
            editor.setDecorations(this.decoration_type, []);
        }
    }

    /**
     * Dispose of the decoration type
     */
    public dispose(): void {
        this.decoration_type.dispose();
    }
} 
