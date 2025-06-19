"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.screamingSnakeCase_pattern = exports.snakeCase_pattern = exports.pascalCase_pattern = exports.camelCase_pattern = void 0;
exports.camelCase_pattern = /\b[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\b/g;
exports.pascalCase_pattern = /\b[A-Z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\b/g;
exports.snakeCase_pattern = /\b[a-z][a-z0-9]*(_[a-z0-9]+)+\b/g;
exports.screamingSnakeCase_pattern = /\b[A-Z][A-Z0-9]*(_[A-Z0-9]+)+\b/g;
//# sourceMappingURL=casePatterns.js.map