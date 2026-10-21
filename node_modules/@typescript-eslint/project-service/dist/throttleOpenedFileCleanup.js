"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throttleOpenedFileCleanup = throttleOpenedFileCleanup;
const OPENED_FILE_CLEANUP_THROTTLE_MS = 250;
/**
 * Opening a file scans every open file and script info for cleanup.
 * ESLint opens every linted file and never closes them, making that quadratic.
 * @see https://github.com/typescript-eslint/typescript-eslint/issues/12936
 */
function throttleOpenedFileCleanup(service) {
    const serviceInternals = service;
    const cleanupKey = 'cleanupProjectsAndScriptInfos' in service
        ? 'cleanupProjectsAndScriptInfos'
        : 'cleanupAfterOpeningFile';
    const cleanup = serviceInternals[cleanupKey];
    const open = service.openClientFileWithNormalizedPath;
    let lastCleanup = -Infinity;
    let opening = false;
    serviceInternals[cleanupKey] = (...args) => {
        const now = performance.now();
        if (opening && now - lastCleanup < OPENED_FILE_CLEANUP_THROTTLE_MS) {
            return;
        }
        lastCleanup = now;
        cleanup.apply(service, args);
    };
    service.openClientFileWithNormalizedPath = (...args) => {
        opening = true;
        try {
            return open.apply(service, args);
        }
        finally {
            opening = false;
        }
    };
}
//# sourceMappingURL=throttleOpenedFileCleanup.js.map