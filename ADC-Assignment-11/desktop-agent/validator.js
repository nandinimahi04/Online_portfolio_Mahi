/**
 * ADC (AI Desktop Controller) - Security Validator
 *
 * Enforces strict whitelist validation for actions, parameters, applications,
 * URLs, and system operations. Rejects dangerous parameters, arbitrary commands,
 * and malicious payloads.
 */

const ALLOWED_ACTIONS = new Set([
    "OPEN_APP",
    "OPEN_URL",
    "SEARCH_WEB",
    "OPEN_FILE",
    "CLIPBOARD_COPY",
    "CLIPBOARD_READ",
    "LOCK_SYSTEM",
    "SLEEP_SYSTEM",
    "SHUTDOWN",
    "RESTART",
    "HELP",
    "UNKNOWN"
]);

const ALLOWED_APPS = new Set([
    "chrome",
    "vscode",
    "notepad",
    "calculator",
    "explorer"
]);

const FORBIDDEN_KEYS = new Set([
    "command",
    "cmd",
    "shell",
    "powershell",
    "script",
    "executable",
    "exec",
    "spawn",
    "process",
    "code",
    "eval"
]);

/**
 * Creates a normalized safe UNKNOWN command response
 */
function unknown(message) {
    return {
        valid: false,
        command: {
            action: "UNKNOWN",
            parameters: {
                app: null,
                query: null,
                url: null,
                path: null,
                text: null,
                confirmed: false
            },
            message: message || "I couldn't determine a supported ADC action.",
            requires_confirmation: false
        }
    };
}

/**
 * Validates a parsed command structure against strict security constraints
 */
function validateCommand(command) {
    if (!command || typeof command !== "object") {
        return unknown("Unable to determine the requested action.");
    }

    if (!ALLOWED_ACTIONS.has(command.action)) {
        return unknown("That action is not supported.");
    }

    const rawParameters =
        command.parameters && typeof command.parameters === "object"
            ? command.parameters
            : {};

    // Check for forbidden execution parameters anywhere in the payload
    const allKeys = [
        ...Object.keys(command),
        ...Object.keys(rawParameters)
    ];

    for (const key of allKeys) {
        if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
            return unknown("That command was blocked for security reasons.");
        }
    }

    // Support legacy "application" parameter key safely mapped to "app"
    const rawApp = rawParameters.app || rawParameters.application;

    const clean = {
        action: command.action,
        parameters: {
            app: typeof rawApp === "string" ? rawApp.toLowerCase().trim() : null,
            query: typeof rawParameters.query === "string" ? rawParameters.query.trim() : null,
            url: typeof rawParameters.url === "string" ? rawParameters.url.trim() : null,
            path: typeof rawParameters.path === "string" ? rawParameters.path.trim() : null,
            text: typeof rawParameters.text === "string" ? rawParameters.text : null,
            confirmed: rawParameters.confirmed === true
        },
        message: typeof command.message === "string" ? command.message : "",
        requires_confirmation: command.requires_confirmation === true
    };

    /*
     * Action-specific validation
     */

    // OPEN_APP
    if (clean.action === "OPEN_APP") {
        if (!clean.parameters.app || !ALLOWED_APPS.has(clean.parameters.app)) {
            return unknown(`Application "${clean.parameters.app || ""}" is not supported.`);
        }
        return { valid: true, command: clean };
    }

    // OPEN_URL
    if (clean.action === "OPEN_URL") {
        if (!clean.parameters.url) {
            return unknown("Please provide a valid website URL.");
        }

        // Auto-prefix bare domains if needed, e.g. github.com -> https://github.com
        if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(clean.parameters.url)) {
            clean.parameters.url = "https://" + clean.parameters.url;
        }

        // Only allow safe HTTP/HTTPS protocols
        if (!/^https?:\/\//i.test(clean.parameters.url)) {
            return unknown("Only http:// and https:// URLs are permitted.");
        }

        // Reject dangerous protocol injection in URL
        if (/^(file|javascript|powershell|cmd|data|vbscript):/i.test(clean.parameters.url)) {
            return unknown("That URL protocol is forbidden.");
        }

        return { valid: true, command: clean };
    }

    // SEARCH_WEB
    if (clean.action === "SEARCH_WEB") {
        if (!clean.parameters.query) {
            return unknown("Please tell me what you want to search for.");
        }
        return { valid: true, command: clean };
    }

    // OPEN_FILE
    if (clean.action === "OPEN_FILE") {
        if (!clean.parameters.path) {
            return unknown("Unable to determine which file or folder to open.");
        }
        return { valid: true, command: clean };
    }

    // CLIPBOARD_COPY
    if (clean.action === "CLIPBOARD_COPY") {
        if (clean.parameters.text === null || clean.parameters.text === undefined) {
            return unknown("Please tell me what to copy.");
        }
        return { valid: true, command: clean };
    }

    // CLIPBOARD_READ
    if (clean.action === "CLIPBOARD_READ") {
        return { valid: true, command: clean };
    }

    // LOCK_SYSTEM
    if (clean.action === "LOCK_SYSTEM") {
        return { valid: true, command: clean };
    }

    // SLEEP_SYSTEM
    if (clean.action === "SLEEP_SYSTEM") {
        return { valid: true, command: clean };
    }

    // SHUTDOWN & RESTART
    if (clean.action === "SHUTDOWN" || clean.action === "RESTART") {
        clean.requires_confirmation = true;
        return { valid: true, command: clean };
    }

    // HELP & UNKNOWN
    if (clean.action === "HELP" || clean.action === "UNKNOWN") {
        return { valid: true, command: clean };
    }

    return { valid: true, command: clean };
}

module.exports = {
    validateCommand,
    ALLOWED_ACTIONS,
    ALLOWED_APPS,
    FORBIDDEN_KEYS
};