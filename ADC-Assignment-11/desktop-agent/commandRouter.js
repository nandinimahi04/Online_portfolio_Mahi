/**
 * ADC (AI Desktop Controller) - Command Router
 *
 * Routes incoming natural language requests via direct deterministic parsing
 * for common commands (low latency, 0 token cost), falling back to Groq LLM
 * for complex natural language comprehension.
 */

require("dotenv").config();

const { validateCommand } = require("./validator");
const { SYSTEM_PROMPT } = require("./systemPrompt");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const ACTIONS = [
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
];

const APP_ALIASES = {
    // Chrome
    chrome: "chrome",
    "google chrome": "chrome",
    "google-chrome": "chrome",
    chorme: "chrome",
    chroome: "chrome",
    chorome: "chrome",

    // VS Code
    vscode: "vscode",
    "vs code": "vscode",
    "visual studio code": "vscode",
    "visual studio": "vscode",
    code: "vscode",

    // Notepad
    notepad: "notepad",
    "note pad": "notepad",
    notpad: "notepad",
    notepadd: "notepad",

    // Calculator
    calculator: "calculator",
    calc: "calculator",
    calculater: "calculator",
    calulator: "calculator",

    // Explorer
    explorer: "explorer",
    "file explorer": "explorer",
    "file manager": "explorer",
    "files": "explorer",
    "file-explorer": "explorer",
    "my computer": "explorer",
    "this pc": "explorer"
};

/**
 * Standard helper to build a command object
 */
function createCommand(
    action,
    {
        app = null,
        query = null,
        url = null,
        path = null,
        text = null,
        confirmed = false
    } = {},
    message = "",
    requires_confirmation = false
) {
    return {
        action,
        parameters: {
            app,
            query,
            url,
            path,
            text,
            confirmed
        },
        message,
        requires_confirmation
    };
}

/**
 * String normalizer
 */
function normalize(text) {
    return (text || "")
        .toLowerCase()
        .trim()
        .replace(/[.,!?;:]+$/g, "")
        .replace(/\s+/g, " ");
}

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b[i - 1] === a[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

/**
 * Resolves application name against strict alias & fuzzy matching
 */
function findApp(target) {
    const value = normalize(target);
    if (!value) return null;

    if (APP_ALIASES[value]) {
        return APP_ALIASES[value];
    }

    const keys = Object.keys(APP_ALIASES);
    let best = null;
    let bestDistance = Infinity;

    for (const key of keys) {
        const distance = levenshtein(value, key);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = key;
        }
    }

    // Accept fuzzy match only within conservative edit distance
    const maxThreshold = Math.max(1, Math.floor(best ? best.length * 0.3 : 1));
    if (best && bestDistance <= maxThreshold) {
        return APP_ALIASES[best];
    }

    return null;
}

/**
 * Fast deterministic pattern matching for common commands
 */
function directCommand(rawText) {
    const normalized = normalize(rawText);

    /*
     * 1. PROMPT INJECTION / ATTACK DETECTION
     */
    if (
        /ignore\s+(all\s+|previous\s+)?instructions/i.test(rawText) ||
        /\b(run|execute|spawn|eval)\b.*?\b(powershell|cmd|shell|arbitrary|script|whoami|code|shutdown\s+\/s)\b/i.test(rawText) ||
        /format\s+[a-z]:/i.test(rawText)
    ) {
        return createCommand(
            "UNKNOWN",
            {},
            "Blocked: Arbitrary system execution and prompt overrides are strictly forbidden."
        );
    }

    /*
     * 2. GREETINGS & HELP
     */
    if (
        /^(hi|hello|hey|hii|good morning|good afternoon|good evening|help|commands|what can you do|show commands)$/.test(
            normalized
        )
    ) {
        return createCommand(
            "HELP",
            {},
            "I can open apps (Chrome, VS Code, Notepad, Calculator, Explorer), search the web, open URLs/files, read/copy clipboard, lock/sleep Windows, and shut down or restart with confirmation."
        );
    }

    /*
     * 3. SHUTDOWN
     */
    if (
        /^(shutdown|shut down|turn off|power off)(\s+(my\s+)?(pc|laptop|computer|windows))?$/.test(
            normalized
        ) ||
        normalized === "shutdown"
    ) {
        return createCommand(
            "SHUTDOWN",
            { confirmed: false },
            "Shutdown requires your confirmation.",
            true
        );
    }

    /*
     * 4. RESTART
     */
    if (
        /^(restart|reboot)(\s+(my\s+)?(pc|laptop|computer|windows))?$/.test(
            normalized
        ) ||
        normalized === "restart"
    ) {
        return createCommand(
            "RESTART",
            { confirmed: false },
            "Restart requires your confirmation.",
            true
        );
    }

    /*
     * 5. LOCK WORKSTATION
     */
    if (
        /^(lock|lock\s+(my\s+)?(pc|computer|laptop|windows|workstation))$/.test(
            normalized
        )
    ) {
        return createCommand(
            "LOCK_SYSTEM",
            {},
            "Locking Windows."
        );
    }

    /*
     * 6. SLEEP SYSTEM
     */
    if (
        /^(sleep|sleep\s+(the\s+|my\s+)?(pc|computer|laptop|system|windows)|put\s+(the\s+|my\s+)?(pc|computer|laptop)\s+to\s+sleep)$/.test(
            normalized
        )
    ) {
        return createCommand(
            "SLEEP_SYSTEM",
            {},
            "Putting Windows to sleep."
        );
    }

    /*
     * 7. CLIPBOARD READ
     */
    if (
        normalized === "read clipboard" ||
        normalized === "show clipboard" ||
        normalized === "clipboard contents" ||
        normalized === "get clipboard" ||
        normalized === "view clipboard" ||
        normalized === "what is in my clipboard" ||
        normalized === "what is in clipboard"
    ) {
        return createCommand(
            "CLIPBOARD_READ",
            {},
            "Reading clipboard contents."
        );
    }

    /*
     * 8. CLIPBOARD COPY
     */
    const copyMatch = rawText.match(
        /^(?:copy|copy this|copy to clipboard)\s+(.+)$/i
    );
    if (copyMatch) {
        return createCommand(
            "CLIPBOARD_COPY",
            { text: copyMatch[1].trim() },
            `Copied to clipboard: "${copyMatch[1].trim()}"`
        );
    }

    /*
     * 9. OPEN APP AND TYPE / WRITE TEXT
     * Example: "open notepad and write Hello ADC"
     */
    const writeMatch = rawText.match(
        /^(?:open|launch|start)\s+([a-zA-Z\s]+?)\s+(?:and|then)\s+(?:write|type|enter|put)\s+(.+)$/i
    );
    if (writeMatch) {
        const app = findApp(writeMatch[1]);
        if (app) {
            return createCommand(
                "OPEN_APP",
                {
                    app,
                    text: writeMatch[2].trim()
                },
                `Opening ${app} and entering text.`
            );
        }
    }

    /*
     * 10. OPEN FOLDER IN DRIVE
     * Example: "open Nandini folder in D drive"
     */
    const driveFolderMatch = rawText.match(
        /^(?:open|launch)\s+(?:folder\s+)?(.+?)\s+(?:folder\s+)?in\s+([a-zA-Z])\s+drive$/i
    );
    if (driveFolderMatch) {
        const folder = driveFolderMatch[1].trim();
        const drive = driveFolderMatch[2].toUpperCase();
        return createCommand(
            "OPEN_FILE",
            { path: `${drive}:\\${folder}` },
            `Opening ${drive}:\\${folder} in File Explorer.`
        );
    }

    /*
     * 11. OPEN DRIVE DIRECTLY
     * Example: "open D drive"
     */
    const driveMatch = rawText.match(/^(?:open|launch)\s+([a-zA-Z])\s+drive$/i);
    if (driveMatch) {
        const drive = driveMatch[1].toUpperCase();
        return createCommand(
            "OPEN_FILE",
            { path: `${drive}:\\` },
            `Opening ${drive}:\\ in File Explorer.`
        );
    }

    /*
     * 12. EXPLICIT WINDOWS PATH
     * Example: "open D:\Nandini", "D:\Projects", "C:\Users"
     */
    const pathMatch = rawText.match(
        /^(?:(?:open|launch)\s+)?([A-Za-z]:\\[^\n\r*?"<>|]*)$/i
    );
    if (pathMatch) {
        const cleanPath = pathMatch[1].trim();
        return createCommand(
            "OPEN_FILE",
            { path: cleanPath },
            `Opening ${cleanPath} in File Explorer.`
        );
    }

    /*
     * 13. WEB SEARCH
     * Examples: "search for laptops", "find Python tutorials", "search laptops", "I want to buy a bag"
     */
    const searchMatch = rawText.match(
        /^(?:search\s+web\s+for|search\s+for|search|google|find|look\s+up)\s+(.+)$/i
    );
    if (searchMatch) {
        const query = searchMatch[1].replace(/^for\s+/i, "").trim();
        if (query) {
            return createCommand(
                "SEARCH_WEB",
                { query },
                `Searching Google for "${query}".`
            );
        }
    }

    if (
        normalized.startsWith("i want to buy ") ||
        normalized.startsWith("i want to find ") ||
        normalized.startsWith("i need to buy ") ||
        normalized.startsWith("i want ")
    ) {
        const query = normalized
            .replace(/^i want to buy\s+/, "")
            .replace(/^i want to find\s+/, "")
            .replace(/^i need to buy\s+/, "")
            .replace(/^i want\s+/, "")
            .trim();
        if (query) {
            return createCommand(
                "SEARCH_WEB",
                { query },
                `Searching Google for "${query}".`
            );
        }
    }

    /*
     * 14. OPEN URL / WEBSITE
     * Examples: "open github.com", "open https://github.com", "open youtube.com"
     */
    const urlMatch = rawText.match(
        /^(?:open|visit|go to)\s+(https?:\/\/[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/[^\s]*)?)$/i
    );
    if (urlMatch) {
        let url = urlMatch[1].trim();
        if (!/^https?:\/\//i.test(url)) {
            url = "https://" + url;
        }
        return createCommand(
            "OPEN_URL",
            { url },
            `Opening ${url} in default browser.`
        );
    }

    if (/^https?:\/\/[^\s]+$/i.test(rawText.trim())) {
        return createCommand(
            "OPEN_URL",
            { url: rawText.trim() },
            `Opening ${rawText.trim()} in default browser.`
        );
    }

    /*
     * 15. OPEN APP
     * Handles: "open chrome", "launch vscode", "start notepad", or standalone "chrome"
     */
    let target = normalized;
    const openAppMatch = normalized.match(/^(?:open|launch|start)\s+(.+)$/);
    if (openAppMatch) {
        target = openAppMatch[1].trim();
    }

    const app = findApp(target);
    if (app) {
        return createCommand(
            "OPEN_APP",
            { app },
            `Opening ${app}.`
        );
    }

    return null;
}

/**
 * Main parseCommand function:
 * 1. Executes deterministic pattern matching
 * 2. If no direct match, calls Groq LLM OpenAI-compatible endpoint
 * 3. Validates and returns structured safe command
 */
async function parseCommand(userMessage) {
    if (!userMessage || !userMessage.trim()) {
        return createCommand(
            "UNKNOWN",
            {},
            "Please enter a command."
        );
    }

    // Check direct deterministic match first
    const direct = directCommand(userMessage);
    if (direct) {
        const validation = validateCommand(direct);
        return validation.command;
    }

    // Require GROQ_API_KEY for LLM fallback
    if (!process.env.GROQ_API_KEY) {
        return createCommand(
            "UNKNOWN",
            {},
            "GROQ_API_KEY is not configured in desktop-agent/.env"
        );
    }

    const payload = {
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        messages: [
            {
                role: "system",
                content: SYSTEM_PROMPT
            },
            {
                role: "user",
                content: userMessage.trim()
            }
        ],
        temperature: 0,
        response_format: {
            type: "json_object"
        }
    };

    let response;
    try {
        response = await fetch(GROQ_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error("[Groq Connect Error]", error);
        return createCommand(
            "UNKNOWN",
            {},
            `Could not connect to Groq AI: ${error.message}`
        );
    }

    const rawText = await response.text();
    let data;

    try {
        data = rawText ? JSON.parse(rawText) : null;
    } catch {
        return createCommand(
            "UNKNOWN",
            {},
            `Groq returned invalid JSON. HTTP ${response.status}`
        );
    }

    if (!response.ok) {
        const message =
            data?.error?.message ||
            data?.error?.type ||
            rawText ||
            "Unknown Groq API error.";
        console.error("[Groq API Error]", message);
        return createCommand(
            "UNKNOWN",
            {},
            `Groq API error (HTTP ${response.status}): ${message}`
        );
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
        return createCommand(
            "UNKNOWN",
            {},
            "Groq response did not contain command content."
        );
    }

    let parsed;
    try {
        parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
        return createCommand(
            "UNKNOWN",
            {},
            "Groq returned malformed command JSON."
        );
    }

    const validation = validateCommand(parsed);
    return validation.command;
}

module.exports = {
    parseCommand,
    directCommand,
    findApp,
    ACTIONS,
    APP_ALIASES
};