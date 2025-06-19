import * as vscode from 'vscode';
import { caseConverter, caseConversion_config } from './caseConverter';

export class ConversionHoverProvider implements vscode.HoverProvider {
    private converter: caseConverter;

    constructor(converter: caseConverter) {
        this.converter = converter;
    }

    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        
        // Get word at position
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return null;
        }

        const word = document.getText(wordRange);
        
        // Get conversion config
        const config = this.getConversionConfig();
        
        // Check if this word is convertible using the main converter logic
        if (!this.converter.hasConvertibleCases(word, config)) {
            return null;
        }

        // Convert the word to see the result
        const convertedWord = this.converter.convert_text(word, config);
        
        // If no conversion happened, don't show hover
        if (convertedWord === word) {
            return null;
        }

        // Create hover content
        const favoriteCase = vscode.workspace.getConfiguration('caseConverter').get('favoriteCase', 'upperˉcase') as string;
        
        const hoverContent = new vscode.MarkdownString();
        hoverContent.appendCodeblock(convertedWord, 'javascript');
        
        if (favoriteCase === 'ethan_case') {
            hoverContent.appendMarkdown(`**🔄 ethan_case conversion preview**\n\n`);
            hoverContent.appendMarkdown(`Click on this word to apply hash-based conversion\n\n`);
        } else {
            hoverContent.appendMarkdown(`**Click once to convert to ${favoriteCase}**\n\n`);
        }
        
        hoverContent.appendMarkdown(`**Original:** \`${word}\`\n`);
        hoverContent.appendMarkdown(`**Preview:** \`${convertedWord}\`\n\n`);
        hoverContent.appendMarkdown(`*Hover over highlighted words to see conversion previews*`);
        
        // Make the hover support commands (for future click functionality)
        hoverContent.isTrusted = true;

        return new vscode.Hover(hoverContent, wordRange);
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


} 
