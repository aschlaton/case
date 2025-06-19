"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.definitionPatterns = void 0;
exports.definitionPatterns = [
    /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    /(?:const|let|var)\s+\{\s*([^}]*)\s*\}/g,
    /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:function|\(.*\)\s*=>)/g,
    /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    /(?:interface|type|enum)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    /(?:public|private|protected|static)?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
    /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g,
    /export\s+(?:const|let|var|function|class|interface|type|enum)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    /\(([^)]*)\)/g
];
//# sourceMappingURL=definitionPatterns.js.map