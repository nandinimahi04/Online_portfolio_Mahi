/**
 * ADC (AI Desktop Controller) - Desktop Executor
 *
 * Executes only approved Windows desktop operations based on validated
 * structured commands. Never accepts arbitrary shell commands, scripts,
 * or raw executables from the AI or user input.
 */

const { spawn, execFile } = require("child_process");

// Fixed mapping from supported logical application names to Windows binaries
const ALLOWED_APPS = {
    chrome: {
        executable: "chrome.exe"
    },
    vscode: {
        executable: "Code.exe"
    },
    notepad: {
        executable: "notepad.exe"
    },
    calculator: {
        executable: "calc.exe"
    },
    explorer: {
        executable: "explorer.exe"
    }
};

/**
 * Utility promise-based sleep helper
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safe process launcher without shell expansion
 */
function launch(executable, args = []) {
    return new Promise((resolve, reject) => {
        try {
            const child = spawn(executable, args, {
                detached: true,
                stdio: "ignore",
                shell: false,
                windowsHide: true
            });

            child.once("error", reject);
            child.unref();
            resolve();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Safely writes text into Notepad or active window.
 * The text is UTF-16LE Base64 encoded to guarantee it cannot
 * execute or inject arbitrary PowerShell code.
 */
async function typeText(text) {
    const encoded = Buffer.from(text, "utf16le").toString("base64");

    const script = `
$text = [System.Text.Encoding]::Unicode.GetString(
    [System.Convert]::FromBase64String('${encoded}')
)
Set-Clipboard -Value $text
$wshell = New-Object -ComObject WScript.Shell
Start-Sleep -Milliseconds 350
$wshell.SendKeys('^v')
`;

    const encodedScript = Buffer.from(script, "utf16le").toString("base64");

    return new Promise((resolve, reject) => {
        execFile(
            "powershell.exe",
            [
                "-NoProfile",
                "-NonInteractive",
                "-EncodedCommand",
                encodedScript
            ],
            { windowsHide: true },
            error => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            }
        );
    });
}

/**
 * Safely reads the actual current contents of the Windows clipboard.
 */
function readClipboard() {
    return new Promise((resolve, reject) => {
        execFile(
            "powershell.exe",
            [
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "Get-Clipboard"
            ],
            { windowsHide: true },
            (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                const content = (stdout || "").trim();
                resolve(content);
            }
        );
    });
}

/**
 * Safely sets the clipboard text on Windows.
 */
function setClipboard(text) {
    const encoded = Buffer.from(text, "utf16le").toString("base64");

    const script = `
$text = [System.Text.Encoding]::Unicode.GetString(
    [System.Convert]::FromBase64String('${encoded}')
)
Set-Clipboard -Value $text
`;

    const encodedScript = Buffer.from(script, "utf16le").toString("base64");

    return new Promise((resolve, reject) => {
        execFile(
            "powershell.exe",
            [
                "-NoProfile",
                "-NonInteractive",
                "-EncodedCommand",
                encodedScript
            ],
            { windowsHide: true },
            error => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            }
        );
    });
}

/**
 * Main command execution engine
 */
async function executeCommand(command) {
    if (!command) {
        return {
            success: false,
            message: "No command received."
        };
    }

    const { action, parameters = {} } = command;

    /*
     * 1. OPEN_APP
     */
    if (action === "OPEN_APP") {
        const appInfo = ALLOWED_APPS[parameters.app];

        if (!appInfo) {
            return {
                success: false,
                message: `Application "${parameters.app || ""}" is not supported.`
            };
        }

        try {
            await launch(appInfo.executable);

            // Optional automated text typing (e.g. for Notepad)
            if (parameters.text && parameters.text.trim()) {
                await wait(1000);
                await typeText(parameters.text);
            }

            return {
                success: true,
                message: parameters.text
                    ? `Opened ${parameters.app} and entered the requested text.`
                    : `Opened ${parameters.app}.`
            };
        } catch (error) {
            return {
                success: false,
                message: `Could not open ${parameters.app}: ${error.message}`
            };
        }
    }

    /*
     * 2. OPEN_FILE / OPEN_FOLDER
     */
    if (action === "OPEN_FILE") {
        try {
            await launch("explorer.exe", [parameters.path]);

            return {
                success: true,
                message: `Opened ${parameters.path}.`
            };
        } catch (error) {
            return {
                success: false,
                message: `Could not open ${parameters.path}: ${error.message}`
            };
        }
    }

    /*
     * 3. OPEN_URL
     */
    if (action === "OPEN_URL") {
        let url = parameters.url || "";

        if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(url)) {
            url = "https://" + url;
        }

        if (!/^https?:\/\//i.test(url)) {
            return {
                success: false,
                message: "Invalid or unsupported URL protocol."
            };
        }

        try {
            await launch("cmd.exe", ["/c", "start", "", url]);

            return {
                success: true,
                message: `Opened ${url}.`
            };
        } catch (error) {
            return {
                success: false,
                message: `Could not open URL: ${error.message}`
            };
        }
    }

    /*
     * 4. SEARCH_WEB
     */
    if (action === "SEARCH_WEB") {
        const query = parameters.query || "";
        const searchUrl = "https://www.google.com/search?q=" + encodeURIComponent(query);

        try {
            await launch("cmd.exe", ["/c", "start", "", searchUrl]);

            return {
                success: true,
                message: `Searching Google for "${query}".`
            };
        } catch (error) {
            return {
                success: false,
                message: `Could not search the web: ${error.message}`
            };
        }
    }

    /*
     * 5. CLIPBOARD_COPY
     */
    if (action === "CLIPBOARD_COPY") {
        try {
            await setClipboard(parameters.text || "");

            return {
                success: true,
                message: `Copied to clipboard: "${parameters.text || ""}"`
            };
        } catch (error) {
            return {
                success: false,
                message: `Clipboard copy error: ${error.message}`
            };
        }
    }

    /*
     * 6. CLIPBOARD_READ
     */
    if (action === "CLIPBOARD_READ") {
        try {
            const content = await readClipboard();

            if (!content) {
                return {
                    success: true,
                    message: "Clipboard is currently empty.",
                    data: ""
                };
            }

            return {
                success: true,
                message: `Clipboard contents: "${content}"`,
                data: content
            };
        } catch (error) {
            return {
                success: false,
                message: `Clipboard read error: ${error.message}`
            };
        }
    }

    /*
     * 7. LOCK_SYSTEM
     */
    if (action === "LOCK_SYSTEM") {
        try {
            await launch("rundll32.exe", ["user32.dll,LockWorkStation"]);

            return {
                success: true,
                message: "Windows has been locked."
            };
        } catch (error) {
            return {
                success: false,
                message: `Could not lock Windows: ${error.message}`
            };
        }
    }

    /*
     * 8. SLEEP_SYSTEM
     */
    if (action === "SLEEP_SYSTEM") {
        try {
            await launch("rundll32.exe", ["powrprof.dll,SetSuspendState", "0,1,0"]);

            return {
                success: true,
                message: "Putting Windows to sleep."
            };
        } catch (error) {
            return {
                success: false,
                message: `Could not put Windows to sleep: ${error.message}`
            };
        }
    }

    /*
     * 9. SHUTDOWN & RESTART
     * Always requires explicit confirmation through POST /api/confirm
     */
    if (action === "SHUTDOWN" || action === "RESTART") {
        return {
            success: true,
            requires_confirmation: true,
            message: `${action === "SHUTDOWN" ? "Shutdown" : "Restart"} requires your confirmation.`
        };
    }

    /*
     * 10. HELP
     */
    if (action === "HELP") {
        return {
            success: true,
            message: "I can open apps (Chrome, VS Code, Notepad, Calculator, Explorer), search Google, open websites, open files/folders, copy/read clipboard, lock or sleep Windows, and shut down or restart with confirmation."
        };
    }

    /*
     * 11. UNKNOWN
     */
    return {
        success: false,
        message: command.message || "I couldn't determine a supported ADC action."
    };
}

module.exports = {
    executeCommand,
    ALLOWED_APPS
};