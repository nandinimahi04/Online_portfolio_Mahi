require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { spawn } = require("child_process");

const { parseCommand } = require("./commandRouter");
const { executeCommand } = require("./executor");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/*
 * Serve ADC UI static assets
 */
const uiPath = path.join(__dirname, "..", "desktop-ui");
app.use(express.static(uiPath));

/*
 * GET /api/health
 */
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        status: "online",
        service: "ADC Desktop Agent",
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b"
    });
});

/*
 * POST /api/chat
 * Main natural language command endpoint
 */
app.post("/api/chat", async (req, res) => {
    try {
        const userMessage =
            typeof req.body?.message === "string"
                ? req.body.message.trim()
                : "";

        if (!userMessage) {
            return res.status(400).json({
                success: false,
                action: "UNKNOWN",
                message: "Please enter a command.",
                requires_confirmation: false
            });
        }

        console.log(`[ADC] Input: "${userMessage}"`);

        // Convert natural language to structured safe command
        const command = await parseCommand(userMessage);
        console.log(`[ADC] Parsed Action: ${command.action}`, command.parameters);

        // Sensitive actions require explicit UI confirmation and must NOT run automatically
        if (
            command.action === "SHUTDOWN" ||
            command.action === "RESTART" ||
            command.requires_confirmation === true
        ) {
            return res.json({
                success: true,
                action: command.action,
                message:
                    command.message ||
                    (command.action === "SHUTDOWN"
                        ? "Shutdown requires your confirmation."
                        : "Restart requires your confirmation."),
                requires_confirmation: true
            });
        }

        // Execute only validated safe commands
        const result = await executeCommand(command);
        console.log(`[ADC] Execution Result:`, result);

        return res.json({
            success: result.success !== false,
            action: command.action,
            message: result.message || command.message || "Command processed.",
            data: result.data !== undefined ? result.data : undefined,
            requires_confirmation: false
        });

    } catch (error) {
        console.error("[ADC Server Error]", error);
        return res.status(500).json({
            success: false,
            action: "UNKNOWN",
            message: error.message || "ADC encountered an unexpected internal error.",
            requires_confirmation: false
        });
    }
});

/*
 * POST /api/confirm
 * Explicit confirmation execution for SHUTDOWN and RESTART only
 */
app.post("/api/confirm", async (req, res) => {
    try {
        const action = String(req.body?.action || "").toUpperCase().trim();

        if (action !== "SHUTDOWN" && action !== "RESTART") {
            return res.status(400).json({
                success: false,
                message: "Invalid confirmation action. Only SHUTDOWN and RESTART are allowed."
            });
        }

        if (action === "SHUTDOWN") {
            spawn("shutdown.exe", ["/s", "/t", "10"], {
                detached: true,
                stdio: "ignore",
                windowsHide: true
            });

            console.log("[ADC] Executed scheduled Windows shutdown (10s delay).");
            return res.json({
                success: true,
                action: "SHUTDOWN",
                message: "Windows shutdown has been scheduled in 10 seconds."
            });
        }

        if (action === "RESTART") {
            spawn("shutdown.exe", ["/r", "/t", "10"], {
                detached: true,
                stdio: "ignore",
                windowsHide: true
            });

            console.log("[ADC] Executed scheduled Windows restart (10s delay).");
            return res.json({
                success: true,
                action: "RESTART",
                message: "Windows restart has been scheduled in 10 seconds."
            });
        }

    } catch (error) {
        console.error("[ADC Confirm Error]", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Execution of confirmed action failed."
        });
    }
});

/*
 * SPA fallback - Serves UI for any non-API route
 */
app.get("*", (req, res) => {
    res.sendFile(path.join(uiPath, "index.html"));
});

// Start server if not imported by test
if (require.main === module) {
    app.listen(PORT, () => {
        console.log("");
        console.log("================================================");
        console.log("          ADC — AI DESKTOP CONTROLLER           ");
        console.log("================================================");
        console.log(`[Status]  Server running at http://localhost:${PORT}`);
        console.log(`[Model]   ${process.env.GROQ_MODEL || "openai/gpt-oss-120b"}`);
        console.log(`[UI]      Loaded from ${uiPath}`);
        console.log("================================================");
        console.log("");
    });
}

module.exports = app;