"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.caseConverter = void 0;
const externalPatterns_1 = require("./constants/externalPatterns");
class caseConverter {
    constructor() {
        // Regex patterns for different case styles
        this.camelCase_pattern = /\b[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\b/g;
        this.pascalCase_pattern = /\b[A-Z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\b/g;
        this.snakeCase_pattern = /\b[a-z][a-z0-9]*(_[a-z0-9]+)+\b/g;
        this.screamingSnakeCase_pattern = /\b[A-Z][A-Z0-9]*(_[A-Z0-9]+)+\b/g;
        // Store variables defined within the current conversion scope
        this.scope_variables = new Set();
        this.conversion_scope_path = '';
        this.text_scopeContent = '';
    }
    /**
     * Set the conversion scope and analyze variables defined within it
     */
    set_conversionScope(folderPath, file_paths) {
        this.conversion_scope_path = folderPath;
        this.text_scopeContent = '';
        this.scope_variables.clear();
        // Analyze all files in scope to find defined variables
        for (const file_path of file_paths) {
            this.analyzeFileForVariables(file_path);
        }
    }
    /**
     * Set conversion scope based on a text selection
     */
    set_textScope(selected_text) {
        this.conversion_scope_path = '';
        this.text_scopeContent = selected_text;
        this.scope_variables.clear();
        // Analyze the selected text to find defined variables
        const variables = this.extract_defined_variables(selected_text);
        variables.forEach(variable => {
            this.scope_variables.add(variable);
        });
    }
    /**
     * Clear the conversion scope (for single file conversions)
     */
    clear_conversionScope() {
        this.conversion_scope_path = '';
        this.text_scopeContent = '';
        this.scope_variables.clear();
    }
    /**
     * Analyze a file to find variables defined within it
     */
    analyzeFileForVariables(file_path) {
        try {
            const fs = require('fs');
            const content = fs.readFile_sync(file_path, 'utf8');
            const variables = this.extract_defined_variables(content);
            variables.forEach(variable => {
                this.scope_variables.add(variable);
            });
        }
        catch (error) {
            // Silently ignore files that can't be read
        }
    }
    /**
     * Extract variables that are defined (not just used) in the content
     */
    extract_defined_variables(content) {
        const variables = new Set();
        // Patterns for variable definitions
        const definitionPatterns = [
            // Variable declarations
            /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
            /(?:const|let|var)\s+\{\s*([^}]*)\s*\}/g,
            // Function declarations
            /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
            /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:function|\(.*\)\s*=>)/g,
            // Class declarations
            /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
            // Interface/type declarations
            /(?:interface|type|enum)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
            // Method definitions
            /(?:public|private|protected|static)?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
            // Object property definitions
            /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g,
            // Export declarations
            /export\s+(?:const|let|var|function|class|interface|type|enum)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
            // Function parameters
            /\(([^)]*)\)/g
        ];
        definitionPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const captured = match[1];
                if (captured) {
                    if (captured.includes(',')) {
                        // Handle destructuring or parameter lists
                        const parts = captured.split(',');
                        parts.forEach(part => {
                            const cleanPart = part.trim().split(/[:\s=]/)[0].trim();
                            if (cleanPart && this.is_valid_identifier(cleanPart)) {
                                variables.add(cleanPart);
                            }
                        });
                    }
                    else if (this.is_valid_identifier(captured)) {
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
    is_valid_identifier(identifier) {
        // Must be valid identifier format
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(identifier)) {
            return false;
        }
        // Must not be external dependency
        return !this.isExternalDependency(identifier);
    }
    /**
     * Check if an identifier should be excluded from conversion because it's external
     */
    should_excludeFromConversion(identifier) {
        // Always exclude external dependencies
        if (this.isExternalDependency(identifier)) {
            return true;
        }
        // If no conversion scope is set, don't exclude anything (single file mode)
        if (!this.conversion_scope_path && !this.text_scopeContent) {
            return false;
        }
        // If variable is defined within scope, allow conversion
        if (this.scope_variables.has(identifier)) {
            return false;
        }
        // If variable is not in scope but not external, exclude it (could be from other files)
        return true;
    }
    /**
     * Check if an identifier is from an external dependency
     */
    isExternalDependency(identifier) {
        return externalPatterns_1.externalPatterns.some(pattern => pattern.test(identifier));
    }
    /**
     * Convert text containing various case styles to macron-separated case
     */
    convert_text(text, config) {
        // Use default config if not provided
        const activeConfig = config || {
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
    find_import_ranges(text) {
        const lines = text.split('\n');
        const ranges = [];
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
                ranges.push({ start: startLine, end: end_line });
                i = end_line + 1;
            }
            else {
                i++;
            }
        }
        return ranges;
    }
    /**
     * Check if a line starts an import statement
     */
    isImport_start(line) {
        // Skip empty lines and comments
        if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('#') || line.startsWith('*')) {
            return false;
        }
        const importPatterns = [
            /^\s*import\s+/,
            /^\s*from\s+.*\s+import/,
            /^\s*const\s+.*\s*=\s*require\s*\(/,
            /^\s*let\s+.*\s*=\s*require\s*\(/,
            /^\s*var\s+.*\s*=\s*require\s*\(/,
            /^\s*const\s+\{/,
            /^\s*let\s+\{/,
            /^\s*var\s+\{/,
            /^\s*require\s*\([^)]*\)(?:\s*;)?\s*$/,
            /^\s*#include\s*[<"]/,
            /^\s*using\s+/,
            /^\s*use\s+/,
            /^\s*package\s+/,
            /^\s*namespace\s+/,
            /^\s*module\s+/,
            /^\s*extern\s+/,
            /^\s*typedef\s+/, // C/C++: typedef
        ];
        return importPatterns.some(pattern => pattern.test(line));
    }
    /**
     * Check if an import line might be multi-line (has opening brackets/parentheses)
     */
    isMulti_lineImport_start(line) {
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
    find_importEnd(lines, startIndex) {
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
                    }
                    else if (char === string_char) {
                        in_string = false;
                        string_char = '';
                    }
                    continue;
                }
                if (in_string)
                    continue;
                // Count brackets and parentheses
                if (char === '{')
                    bracket_count++;
                else if (char === '}')
                    bracket_count--;
                else if (char === '(')
                    paren_count++;
                else if (char === ')')
                    paren_count--;
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
    is_lineInImport_range(lineIndex, ranges) {
        return ranges.some(range => lineIndex >= range.start && lineIndex <= range.end);
    }
    /**
     * Check if a line contains import statements (legacy method for backward compatibility)
     */
    isImportLine(line) {
        return this.isImport_start(line);
    }
    /**
     * Convert a single line of text
     */
    convertLine(line, config, output_format) {
        let result = line;
        if (output_format === 'ethan_case') {
            // For ethan_case, convert everything to a normalized form first, then apply hash logic
            result = this.convertLine_toEthan_case(result);
        }
        else {
            // Original macron case logic
            // Convert camelCase to macron case
            if (config.convert_camelCase) {
                result = result.replace(this.camelCase_pattern, (match) => {
                    if (this.should_excludeFromConversion(match)) {
                        return match; // Don't convert external variables
                    }
                    return this.camel_to_macron_case(match, output_format);
                });
            }
            // Convert PascalCase to macron case
            if (config.convertPascalCase) {
                result = result.replace(this.pascalCase_pattern, (match) => {
                    if (this.should_excludeFromConversion(match)) {
                        return match; // Don't convert external variables
                    }
                    return this.pascal_to_macron_case(match, output_format);
                });
            }
            // Convert snake_case to macron case
            if (config.convert_snakeCase) {
                result = result.replace(this.snakeCase_pattern, (match) => {
                    if (this.should_excludeFromConversion(match)) {
                        return match; // Don't convert external variables
                    }
                    return this.snake_to_macron_case(match, output_format);
                });
            }
            // Convert SCREAMING_SNAKE_CASE to macron case
            if (config.convert_screamingSnakeCase) {
                result = result.replace(this.screamingSnakeCase_pattern, (match) => {
                    if (this.should_excludeFromConversion(match)) {
                        return match; // Don't convert external variables
                    }
                    return this.screamingSnake_to_macron_case(match, output_format);
                });
            }
        }
        return result;
    }
    /**
     * Convert a single line to ethan_case using algorithmic separator determination
     */
    convertLine_toEthan_case(line) {
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
    applyEthan_conversion(word) {
        console.log(`applyEthan_conversion called with: "${word}"`);
        // First, normalize the word by splitting on various separators
        let normalizedSegments = [];
        // Handle macron-separated words - split on macrons
        if (word.includes('ˉ')) {
            normalizedSegments = word.split('ˉ').filter(segment => segment.length > 0);
        }
        // Handle snake_case and SCREAMING_SNAKE_CASE - split on underscores
        else if (word.includes('_')) {
            normalizedSegments = word.split('_').filter(segment => segment.length > 0);
        }
        else {
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
            }
            else {
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
                }
                else {
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
    find_word_boundaries(word) {
        const boundaries = [];
        for (let i = 1; i < word.length; i++) {
            const current = word[i];
            const previous = word[i - 1];
            // CamelCase boundary (lowercase to uppercase)
            if (/[a-z]/.test(previous) && /[A-Z]/.test(current)) {
                boundaries.push({ index: i, type: 'camel' });
            }
            // Snake_case boundary - but skip the underscore itself
            else if (previous === '_' && current !== '_') {
                boundaries.push({ index: i, type: 'snake' });
            }
        }
        return boundaries;
    }
    /**
     * Determine if underscore should be used based on adjacent characters
     */
    should_useUnderscore(left_char, right_char) {
        // Normalize to lowercase for case-agnostic hash calculation
        const left_normalized = left_char.toLowerCase();
        const right_normalized = right_char.toLowerCase();
        const left_code = left_normalized.charCodeAt(0);
        const right_code = right_normalized.charCodeAt(0);
        // Proper hash function with bit mixing and primes
        let hash = ((left_code << 5) + left_code) + right_code; // hash * 33 + right_code
        hash ^= hash >>> 16; // Mix high/low bits
        hash *= 0x85ebca6b; // Prime multiply
        hash ^= hash >>> 13; // More mixing
        hash *= 0xc2b2ae35; // Another prime
        hash ^= hash >>> 16; // Final mix
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
    camel_to_macron_case(text, format = 'upperˉcase') {
        const result = text.replace(/([a-z])([A-Z])/g, '$1ˉ$2');
        return format === 'UPPERˉCASE' ? result.toUpperCase() : result.toLowerCase();
    }
    /**
     * Convert PascalCase to pascalˉcase or PASCALˉCASE
     */
    pascal_to_macron_case(text, format = 'upperˉcase') {
        const result = text.replace(/([a-z])([A-Z])/g, '$1ˉ$2');
        return format === 'UPPERˉCASE' ? result.toUpperCase() : result.toLowerCase();
    }
    /**
     * Convert snake_case to snakeˉcase or SNAKEˉCASE
     */
    snake_to_macron_case(text, format = 'upperˉcase') {
        const result = text.replace(/_/g, 'ˉ');
        return format === 'UPPERˉCASE' ? result.toUpperCase() : result.toLowerCase();
    }
    /**
     * Convert SCREAMING_SNAKE_CASE to screamingˉsnakeˉcase or SCREAMINGˉSNAKEˉCASE
     */
    screamingSnake_to_macron_case(text, format = 'upperˉcase') {
        const result = text.replace(/_/g, 'ˉ');
        return format === 'UPPERˉCASE' ? result.toUpperCase() : result.toLowerCase();
    }
    /**
     * Detect if text contains any convertible case patterns
     */
    hasConvertibleCases(text, config) {
        const activeConfig = config || {
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
    get_case_statistics(text) {
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
exports.caseConverter = caseConverter;
//# sourceMappingURL=caseConverter.js.map