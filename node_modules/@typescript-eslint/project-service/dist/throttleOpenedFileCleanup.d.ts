import type * as ts from 'typescript/lib/tsserverlibrary';
/**
 * Opening a file scans every open file and script info for cleanup.
 * ESLint opens every linted file and never closes them, making that quadratic.
 * @see https://github.com/typescript-eslint/typescript-eslint/issues/12936
 */
export declare function throttleOpenedFileCleanup(service: ts.server.ProjectService): void;
