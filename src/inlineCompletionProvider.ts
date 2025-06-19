import * as vscode from 'vscode';
import { caseConverter, caseConversion_config } from './caseConverter';

export class InlineCompletionProvider implements vscode.InlineCompletionItemProvider {
    private converter: caseConverter;
    private lastPosition: vscode.Position | undefined;
    private lastSuggestion: string | undefined;

    constructor(converter: caseConverter) {
        this.converter = converter;
    }

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | null> {
        
        // Check if auto-suggestions are enabled
        const vsConfig = vscode.workspace.getConfiguration('caseConverter');
        const autoSuggestionsEnabled = vsConfig.get('enableAutoSuggestions', true);
        if (!autoSuggestionsEnabled) {
            return null;
        }
        
        // Get current line text up to cursor position
        const line = document.lineAt(position.line);
        const textBeforeCursor = line.text.substring(0, position.character);
        
        // Look for word boundaries to find the current word being typed
        const wordMatch = textBeforeCursor.match(/(\w+)$/);
        if (!wordMatch) {
            return null;
        }

        const currentWord = wordMatch[1];
        
        // Check if current word is too short or already converted
        const minLength = vsConfig.get('autoSuggestionMinLength', 3);
        if (currentWord.length < minLength || this.isAlreadyConverted(currentWord)) {
            return null;
        }

        // Get conversion config
        const conversionConfig = this.getConversionConfig();
        
        // Check if the current word has a convertible case
        if (!this.hasConvertibleCase(currentWord, conversionConfig)) {
            return null;
        }

        // Convert the word
        const convertedWord = this.converter.convert_text(currentWord, conversionConfig);
        
        // If no conversion happened, return null
        if (convertedWord === currentWord) {
            return null;
        }

        // Calculate the replacement range and suggestion text
        const startPos = new vscode.Position(position.line, position.character - currentWord.length);
        const range = new vscode.Range(startPos, position);
        
        // The suggestion should replace the current word
        const suggestionText = convertedWord;

        // Create inline completion item
        const completionItem = new vscode.InlineCompletionItem(suggestionText, range);
        completionItem.insertText = suggestionText;
        
        // Add command to be executed when accepted (optional)
        completionItem.command = {
            command: 'caseConverter.logConversion',
            title: 'Log Case Conversion',
            arguments: [currentWord, convertedWord]
        };

        return [completionItem];
    }

    private getConversionConfig(): caseConversion_config {
        const config = vscode.workspace.getConfiguration('caseConverter');
        const favoriteCase = config.get('favoriteCase', 'upperˉcase');
        return {
            convert_camelCase: config.get('convert_camelCase', true),
            convertPascalCase: config.get('convertPascalCase', true),
            convert_snakeCase: config.get('convert_snakeCase', true),
            convert_screamingSnakeCase: config.get('convert_screamingSnakeCase', true),
            output_format: favoriteCase as 'upperˉcase' | 'UPPERˉCASE' | 'ethan_case'
        };
    }

    private hasConvertibleCase(word: string, config: caseConversion_config): boolean {
        // Check for camelCase
        if (config.convert_camelCase && /^[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$/.test(word)) {
            return true;
        }
        
        // Check for PascalCase
        if (config.convertPascalCase && /^[A-Z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$/.test(word)) {
            return true;
        }
        
        // Check for snake_case
        if (config.convert_snakeCase && /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(word)) {
            return true;
        }
        
        // Check for SCREAMING_SNAKE_CASE
        if (config.convert_screamingSnakeCase && /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/.test(word)) {
            return true;
        }
        
        return false;
    }

    private isAlreadyConverted(word: string): boolean {
        // Check if word already contains macron (already converted)
        return word.includes('ˉ');
    }
} 
 