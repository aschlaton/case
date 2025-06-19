import { externalPatterns } from './constants/externalPatterns';
import { camelCase_pattern, pascalCase_pattern, snakeCase_pattern, screamingSnakeCase_pattern } from './constants/casePatterns';
import { definitionPatterns } from './constants/definitionPatterns';

export interface caseConversion_config {
    convert_camelCase: boolean;
    convertPascalCase: boolean;
    convert_snakeCase: boolean;
    convert_screamingSnakeCase: boolean;
    output_format?: 'upperˉcase' | 'UPPERˉCASE' | 'ethan_case';
}

export class caseConverter {

    private readonly camelCase_pattern = camelCase_pattern;
    private readonly pascalCase_pattern = pascalCase_pattern;
    private readonly snakeCase_pattern = snakeCase_pattern;
    private readonly screamingSnakeCase_pattern = screamingSnakeCase_pattern;

    private scope_variables: Set<string> = new Set();
    private conversion_scope_path: string = '';
    private text_scopeContent: string = '';

    /**
     * Set the conversion scope and analyze variables defined within it
     */
    public set_conversionScope(folderPath: string, file_paths: string[]): void {
        this.conversion_scope_path = folderPath;
        this.text_scopeContent = '';
        this.scope_variables.clear();
        
        for (const file_path of file_paths) {
            this.analyzeFileForVariables(file_path);
        }
    }

    /**
     * Set conversion scope based on a text selection
     */
    public set_textScope(selected_text: string): void {
        this.conversion_scope_path = '';
        this.text_scopeContent = selected_text;
        this.scope_variables.clear();
        
        const variables = this.extract_defined_variables(selected_text);
        variables.forEach(variable => {
            this.scope_variables.add(variable);
        });
    }

    /**
     * Clear the conversion scope (for single file conversions)
     */
    public clear_conversionScope(): void {
        this.conversion_scope_path = '';
        this.text_scopeContent = '';
        this.scope_variables.clear();
    }

    /**
     * Analyze a file to find variables defined within it
     */
    private analyzeFileForVariables(file_path: string): void {
        try {
            const fs = require('fs');
            const content = fs.readFile_sync(file_path, 'utf8');
            const variables = this.extract_defined_variables(content);
            
            variables.forEach(variable => {
                this.scope_variables.add(variable);
            });
        } catch (error) {
        }
    }

    /**
     * Extract variables that are defined (not just used) in the content
     */
    private extract_defined_variables(content: string): Set<string> {
        const variables = new Set<string>();
        

        
        definitionPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const captured = match[1];
                if (captured) {
                    if (captured.includes(',')) {
                        const parts = captured.split(',');
                        parts.forEach(part => {
                            const cleanPart = part.trim().split(/[:\s=]/)[0].trim();
                            if (cleanPart && this.is_valid_identifier(cleanPart)) {
                                variables.add(cleanPart);
                            }
                        });
                    } else if (this.is_valid_identifier(captured)) {
                        variables.add(captured);
                    }
                }
            }
            pattern.lastIndex = 0; // Reset for next use
        });
        
        return variables;
    }

    /**
     * Check if a string is a valid identifier and not an external dependency
     */
    private is_valid_identifier(identifier: string): boolean {
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(identifier)) {
            return false;
        }
        
        return !this.isExternalDependency(identifier);
    }

    /**
     * Check if an identifier should be excluded from conversion because it's external
     */
    public should_excludeFromConversion(identifier: string): boolean {
        if (this.isExternalDependency(identifier)) {
            return true;
        }
        
        if (!this.conversion_scope_path && !this.text_scopeContent) {
            return false;
        }
        
        if (this.scope_variables.has(identifier)) {
            return false;
        }
        
        return true;
    }

    /**
     * Check if an identifier is from an external dependency
     */
    private isExternalDependency(identifier: string): boolean {
        return externalPatterns.some(pattern => pattern.test(identifier));
    }

    /**
     * Convert text containing various case styles to macron-separated case
     */
    public convert_text(text: string, config?: caseConversion_config): string {
        // Use default config if not provided
        const activeConfig: caseConversion_config = config || {
            convert_camelCase: true,
            convertPascalCase: true,
            convert_snakeCase: true,
            convert_screamingSnakeCase: true,
            output_format: 'upperˉcase'
        };

        const output_format = activeConfig.output_format || 'upperˉcase';
        
        console.log(`Converting text: "${text}" with format: ${output_format}`);
        console.log(`Config:`, activeConfig);

        // Process text with multi-line import awareness
        const import_ranges = this.find_import_ranges(text);
        const lines = text.split('\n');
        const processed_lines = lines.map((line, lineIndex) => {
            if (this.is_lineInImport_range(lineIndex, import_ranges)) {
                return line; // Skip import lines unchanged
            }
            return this.convertLine(line, activeConfig, output_format);
        });

        const result = processed_lines.join('\n');
        console.log(`Conversion result: "${text}" → "${result}"`);
        return result;
    }

    /**
     * Find all import statement ranges (including multi-line imports)
     */
    public find_import_ranges(text: string): Array<{start: number, end: number}> {
        const lines = text.split('\n');
        const ranges: Array<{start: number, end: number}> = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i].trim();
            
            // Check for various import patterns
            if (this.isImport_start(line)) {
                const startLine = i;
                let end_line = i;
                
                // Handle multi-line imports
                if (this.isMulti_lineImport_start(line)) {
                    end_line = this.find_importEnd(lines, i);
                }
                
                ranges.push({start: startLine, end: end_line});
                i = end_line + 1;
            } else {
                i++;
            }
        }

        return ranges;
    }

    /**
     * Check if a line starts an import statement
     */
    private isImport_start(line: string): boolean {
        // Skip empty lines and comments
        if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('#') || line.startsWith('*')) {
            return false;
        }

        const importPatterns = [
            /^\s*import\s+/,           // JavaScript/TypeScript/Python/Java/Go: import
            /^\s*from\s+.*\s+import/, // Python: from ... import
            /^\s*const\s+.*\s*=\s*require\s*\(/,  // JavaScript: const ... = require(
            /^\s*let\s+.*\s*=\s*require\s*\(/,    // JavaScript: let ... = require(
            /^\s*var\s+.*\s*=\s*require\s*\(/,    // JavaScript: var ... = require(
            /^\s*const\s+\{/,         // JavaScript: const { ... (destructuring, may be multi-line)
            /^\s*let\s+\{/,           // JavaScript: let { ... (destructuring, may be multi-line)
            /^\s*var\s+\{/,           // JavaScript: var { ... (destructuring, may be multi-line)
            /^\s*require\s*\([^)]*\)(?:\s*;)?\s*$/,  // JavaScript: require() - only if complete on one line
            /^\s*#include\s*[<"]/,    // C/C++: #include
            /^\s*using\s+/,           // C#: using
            /^\s*use\s+/,             // Rust: use
            /^\s*package\s+/,         // Go/Java: package
            /^\s*namespace\s+/,       // C#: namespace
            /^\s*module\s+/,          // Various: module
            /^\s*extern\s+/,          // C/C++: extern
            /^\s*typedef\s+/,         // C/C++: typedef
        ];

        return importPatterns.some(pattern => pattern.test(line));
    }

    /**
     * Check if an import line might be multi-line (has opening brackets/parentheses)
     */
    private isMulti_lineImport_start(line: string): boolean {
        // Count opening vs closing brackets/parentheses
        const open_brackets = (line.match(/[{(]/g) || []).length;
        const close_brackets = (line.match(/[})]/g) || []).length;
        
        // If there are unmatched opening brackets, it's likely multi-line
        const hasUnmatched_brackets = open_brackets > close_brackets;
        
        // Also check if line doesn't end with semicolon (for JS/TS)
        const doesntEnd_properly = !line.endsWith(';') && !line.endsWith('}') && !line.endsWith(')');
        
        return hasUnmatched_brackets || (doesntEnd_properly && (line.includes('{') || line.includes('(')));
    }

    /**
     * Find the end line of a multi-line import
     */
    private find_importEnd(lines: string[], startIndex: number): number {
        let bracket_count = 0;
        let paren_count = 0;
        let in_string = false;
        let string_char = '';

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                const prevChar = j > 0 ? line[j - 1] : '';
                
                // Handle string literals
                if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
                    if (!in_string) {
                        in_string = true;
                        string_char = char;
                    } else if (char === string_char) {
                        in_string = false;
                        string_char = '';
                    }
                    continue;
                }
                
                if (in_string) continue;
                
                // Count brackets and parentheses
                if (char === '{') bracket_count++;
                else if (char === '}') bracket_count--;
                else if (char === '(') paren_count++;
                else if (char === ')') paren_count--;
            }
            
            // If we've balanced all brackets and parentheses, the import is complete
            if (bracket_count <= 0 && paren_count <= 0) {
                // Check if line ends properly (semicolon, closing bracket, etc.)
                const trimmed = line.trim();
                if (trimmed.endsWith(';') || trimmed.endsWith('}') || trimmed.endsWith(')') || 
                    (bracket_count === 0 && paren_count === 0 && (trimmed.includes('require(') || trimmed.includes("'") || trimmed.includes('"')))) {
                    return i;
                }
            }
        }
        
        // If we couldn't find the end, assume it's just the start line
        return startIndex;
    }

    /**
     * Check if a line index is within any import range
     */
    private is_lineInImport_range(lineIndex: number, ranges: Array<{start: number, end: number}>): boolean {
        return ranges.some(range => lineIndex >= range.start && lineIndex <= range.end);
    }

    /**
     * Check if a line contains import statements (legacy method for backward compatibility)
     */
    private isImportLine(line: string): boolean {
        return this.isImport_start(line);
    }

    /**
     * Convert a single line of text
     */
    private convertLine(line: string, config: caseConversion_config, output_format: string): string {
        let result = line;

        if (output_format === 'ethan_case') {
            // For ethan_case, convert everything to a normalized form first, then apply hash logic
            result = this.convertLine_toEthan_case(result);
        } else {
            // Original macron case logic
            // Convert camelCase to macron case
            if (config.convert_camelCase) {
                result = result.replace(this.camelCase_pattern, (match) => {
                    if (this.should_excludeFromConversion(match)) {
                        return match; // Don't convert external variables
                    }
                    return this.camel_to_macron_case(match, output_format as 'upperˉcase' | 'UPPERˉCASE');
                });
            }

            // Convert PascalCase to macron case
            if (config.convertPascalCase) {
                result = result.replace(this.pascalCase_pattern, (match) => {
                    if (this.should_excludeFromConversion(match)) {
                        return match; // Don't convert external variables
                    }
                    return this.pascal_to_macron_case(match, output_format as 'upperˉcase' | 'UPPERˉCASE');
                });
            }

            // Convert snake_case to macron case
            if (config.convert_snakeCase) {
                result = result.replace(this.snakeCase_pattern, (match) => {
                    if (this.should_excludeFromConversion(match)) {
                        return match; // Don't convert external variables
                    }
                    return this.snake_to_macron_case(match, output_format as 'upperˉcase' | 'UPPERˉCASE');
                });
            }

            // Convert SCREAMING_SNAKE_CASE to macron case
            if (config.convert_screamingSnakeCase) {
                result = result.replace(this.screamingSnakeCase_pattern, (match) => {
                    if (this.should_excludeFromConversion(match)) {
                        return match; // Don't convert external variables
                    }
                    return this.screamingSnake_to_macron_case(match, output_format as 'upperˉcase' | 'UPPERˉCASE');
                });
            }
        }

        return result;
    }

    /**
     * Convert a single line to ethan_case using algorithmic separator determination
     */
    private convertLine_toEthan_case(line: string): string {
        let result = line;

        // Convert all case types to a normalized form first, then apply hash logic
        const macronPattern = /\b[a-zA-Z]+ˉ[a-zA-Z]+(?:ˉ[a-zA-Z]+)*\b/g;
        const allCase_patterns = [
            this.camelCase_pattern,
            this.pascalCase_pattern,    
            this.snakeCase_pattern,
            this.screamingSnakeCase_pattern,
            macronPattern
        ];

        allCase_patterns.forEach(pattern => {
            result = result.replace(pattern, (match) => {
                if (this.should_excludeFromConversion(match)) {
                    return match; // Don't convert external variables
                }
                return this.applyEthan_conversion(match);
            });
            pattern.lastIndex = 0; // Reset regex
        });

        return result;
    }

    /**
     * Apply ethan_case conversion logic to a single word
     */
    private applyEthan_conversion(word: string): string {
        console.log(`applyEthan_conversion called with: "${word}"`);
        
        // First, normalize the word by splitting on various separators
        let normalizedSegments: string[] = [];
        
        // Handle macron-separated words - split on macrons
        if (word.includes('ˉ')) {
            normalizedSegments = word.split('ˉ').filter(segment => segment.length > 0);
        }
        // Handle snake_case and SCREAMING_SNAKE_CASE - split on underscores
        else if (word.includes('_')) {
            normalizedSegments = word.split('_').filter(segment => segment.length > 0);
        } else {
            // Handle camelCase and PascalCase - split on case boundaries
            const boundaries = this.find_word_boundaries(word);
            
            if (boundaries.length === 0) {
                console.log(`Single word detected: "${word}" - returning unchanged`);
                return word; // Single word, return unchanged for ethan_case
            }

            let lastIndex = 0;
            boundaries.forEach(boundary => {
                normalizedSegments.push(word.substring(lastIndex, boundary.index));
                lastIndex = boundary.index;
            });
            
            // Add final segment
            if (lastIndex < word.length) {
                normalizedSegments.push(word.substring(lastIndex));
            }
        }

        if (normalizedSegments.length === 0) {
            console.log(`No segments found for: "${word}" - returning unchanged`);
            return word; // Return unchanged for single words
        }

        // Convert segments based on hash decisions
        console.log(`Processing segments:`, normalizedSegments);
        let result = '';
        
        for (let i = 0; i < normalizedSegments.length; i++) {
            const segment = normalizedSegments[i];
            
            if (i === 0) {
                // First segment is always lowercase
                result += segment.toLowerCase();
                console.log(`First segment: "${segment}" → "${segment.toLowerCase()}"`);
            } else {
                // For subsequent segments, decide based on hash of adjacent characters
                const prev_segment = normalizedSegments[i - 1];
                const left_char = prev_segment[prev_segment.length - 1];
                const right_char = segment[0];
                
                console.log(`\n📍 Boundary ${i}: "${prev_segment}" | "${segment}"`);
                console.log(`   Endpoint chars: '${left_char}' → '${right_char}'`);
                
                const should_useUnderscore = this.should_useUnderscore(left_char, right_char);
                
                if (should_useUnderscore) {
                    // Use underscore separator - everything lowercase
                    const underscoreSegment = '_' + segment.toLowerCase();
                    result += underscoreSegment;
                    console.log(`   ✅ Applied: "${underscoreSegment}"`);
                } else {
                    // Use camelCase - capitalize first letter, rest lowercase
                    const camelSegment = segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
                    result += camelSegment;
                    console.log(`   ✅ Applied: "${camelSegment}"`);
                }
            }
        }

        console.log(`\n🎯 Final ethan_case result: "${word}" → "${result}"`);
        return result;
    }

    /**
     * Find word boundaries in a string (camelCase, snake_case, etc.)
     */
    private find_word_boundaries(word: string): Array<{index: number, type: string}> {
        const boundaries: Array<{index: number, type: string}> = [];

        for (let i = 1; i < word.length; i++) {
            const current = word[i];
            const previous = word[i - 1];

            // CamelCase boundary (lowercase to uppercase)
            if (/[a-z]/.test(previous) && /[A-Z]/.test(current)) {
                boundaries.push({index: i, type: 'camel'});
            }
            // Snake_case boundary - but skip the underscore itself
            else if (previous === '_' && current !== '_') {
                boundaries.push({index: i, type: 'snake'});
            }
        }

        return boundaries;
    }

    /**
     * Determine if underscore should be used based on adjacent characters
     */
    private should_useUnderscore(left_char: string, right_char: string): boolean {
        // Normalize to lowercase for case-agnostic hash calculation
        const left_normalized = left_char.toLowerCase();
        const right_normalized = right_char.toLowerCase();
        
        const left_code = left_normalized.charCodeAt(0);
        const right_code = right_normalized.charCodeAt(0);
        
        // Proper hash function with bit mixing and primes
        let hash = ((left_code << 5) + left_code) + right_code;  // hash * 33 + right_code
        hash ^= hash >>> 16;                                  // Mix high/low bits
        hash *= 0x85ebca6b;                                   // Prime multiply
        hash ^= hash >>> 13;                                  // More mixing
        hash *= 0xc2b2ae35;                                   // Another prime
        hash ^= hash >>> 16;                                  // Final mix
        
        const finalHash = Math.abs(hash);
        const isOdd = finalHash % 2 === 1;
        const separator = isOdd ? 'underscore' : 'camelCase';
        
        console.log(`🔢 Hash calculation: '${left_char}' (${left_code}) + '${right_char}' (${right_code}) [normalized: '${left_normalized}' + '${right_normalized}']`);
        console.log(`   → Final hash: ${finalHash} (${isOdd ? 'ODD' : 'EVEN'}) → Use ${separator}`);
        
        return isOdd; // Odd = underscore, Even = camelCase
    }

    /**
     * Convert camelCase to camelˉcase or CAMELˉCASE
     */
    private camel_to_macron_case(text: string, format: 'upperˉcase' | 'UPPERˉCASE' = 'upperˉcase'): string {
        const result = text.replace(/([a-z])([A-Z])/g, '$1ˉ$2');
        return format === 'UPPERˉCASE' ? result.toUpperCase() : result.toLowerCase();
    }

    /**
     * Convert PascalCase to pascalˉcase or PASCALˉCASE
     */
    private pascal_to_macron_case(text: string, format: 'upperˉcase' | 'UPPERˉCASE' = 'upperˉcase'): string {
        const result = text.replace(/([a-z])([A-Z])/g, '$1ˉ$2');
        return format === 'UPPERˉCASE' ? result.toUpperCase() : result.toLowerCase();
    }

    /**
     * Convert snake_case to snakeˉcase or SNAKEˉCASE
     */
    private snake_to_macron_case(text: string, format: 'upperˉcase' | 'UPPERˉCASE' = 'upperˉcase'): string {
        const result = text.replace(/_/g, 'ˉ');
        return format === 'UPPERˉCASE' ? result.toUpperCase() : result.toLowerCase();
    }

    /**
     * Convert SCREAMING_SNAKE_CASE to screamingˉsnakeˉcase or SCREAMINGˉSNAKEˉCASE
     */
    private screamingSnake_to_macron_case(text: string, format: 'upperˉcase' | 'UPPERˉCASE' = 'upperˉcase'): string {
        const result = text.replace(/_/g, 'ˉ');
        return format === 'UPPERˉCASE' ? result.toUpperCase() : result.toLowerCase();
    }

    /**
     * Detect if text contains any convertible case patterns
     */
    public hasConvertibleCases(text: string, config?: caseConversion_config): boolean {
        const activeConfig: caseConversion_config = config || {
            convert_camelCase: true,
            convertPascalCase: true,
            convert_snakeCase: true,
            convert_screamingSnakeCase: true,
            output_format: 'upperˉcase'
        };

        // Reset regex lastIndex to avoid issues with global flags
        this.camelCase_pattern.lastIndex = 0;
        this.pascalCase_pattern.lastIndex = 0;
        this.snakeCase_pattern.lastIndex = 0;
        this.screamingSnakeCase_pattern.lastIndex = 0;

        // Check for standard patterns
        const hasCamelCase = activeConfig.convert_camelCase && this.camelCase_pattern.test(text);
        const hasPascalCase = activeConfig.convertPascalCase && this.pascalCase_pattern.test(text);
        const hasSnakeCase = activeConfig.convert_snakeCase && this.snakeCase_pattern.test(text);
        const hasScreamingSnakeCase = activeConfig.convert_screamingSnakeCase && this.screamingSnakeCase_pattern.test(text);
        
        const hasStandardCases = hasCamelCase || hasPascalCase || hasSnakeCase || hasScreamingSnakeCase;

        console.log(`Checking convertibility for "${text}" with format: ${activeConfig.output_format}`);
        console.log(`Config object:`, JSON.stringify(activeConfig, null, 2));
        console.log(`  - camelCase: ${hasCamelCase}`);
        console.log(`  - PascalCase: ${hasPascalCase}`);
        console.log(`  - snake_case: ${hasSnakeCase}`);
        console.log(`  - SCREAMING_SNAKE_CASE: ${hasScreamingSnakeCase}`);
        console.log(`  - hasStandardCases: ${hasStandardCases}`);

        // For ethan_case, use the same detection as other formats
        if (activeConfig.output_format === 'ethan_case') {
            const macronPattern = /\b[a-zA-Z]+ˉ[a-zA-Z]+(?:ˉ[a-zA-Z]+)*\b/;
            const hasMacronCases = macronPattern.test(text);
            console.log(`  - macron cases: ${hasMacronCases}`);
            
            // For ethan_case, convert the same patterns as other formats - just use different conversion logic
            const result = hasStandardCases || hasMacronCases;
            console.log(`  - final result for ethan_case: ${result}`);
            return result;
        }

        console.log(`  - final result: ${hasStandardCases}`);
        return hasStandardCases;
    }

    /**
     * Get statistics about convertible cases in text
     */
    public get_case_statistics(text: string): { [key: string]: number } {
        const stats = {
            camelCase: (text.match(this.camelCase_pattern) || []).length,
            pascalCase: (text.match(this.pascalCase_pattern) || []).length,
            snakeCase: (text.match(this.snakeCase_pattern) || []).length,
            screamingSnakeCase: (text.match(this.screamingSnakeCase_pattern) || []).length
        };

        // Reset regex lastIndex to avoid issues with global flags
        this.camelCase_pattern.lastIndex = 0;
        this.pascalCase_pattern.lastIndex = 0;
        this.snakeCase_pattern.lastIndex = 0;
        this.screamingSnakeCase_pattern.lastIndex = 0;

        return stats;
    }
} 
