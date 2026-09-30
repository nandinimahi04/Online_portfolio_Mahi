/**
 * ADC (AI Desktop Controller) - Frontend Application Logic
 *
 * Implements:
 * - Unified REST chat pipeline (/api/chat)
 * - Confirmation flow (/api/confirm) for SHUTDOWN & RESTART
 * - Periodic health check polling (/api/health)
 * - Browser SpeechRecognition voice integration (en-IN)
 * - LocalStorage command history management
 * - Responsive multi-tab navigation
 */

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const chatLog = document.getElementById("chatLog");
    const commandInput = document.getElementById("commandInput");
    const sendBtn = document.getElementById("sendBtn");
    const voiceBtn = document.getElementById("voiceBtn");
    const voiceBanner = document.getElementById("voiceBanner");
    const voiceBannerText = document.getElementById("voiceBannerText");
    const voiceTabMicBtn = document.getElementById("voiceTabMicBtn");
    const voiceTabStatus = document.getElementById("voiceTabStatus");
    const voiceTabFeedback = document.getElementById("voiceTabFeedback");
    
    const healthDot = document.getElementById("healthDot");
    const healthStatusText = document.getElementById("healthStatusText");
    const modelBadge = document.getElementById("modelBadge");
    const aboutModelVal = document.getElementById("aboutModelVal");
    
    const timeGreeting = document.getElementById("timeGreeting");
    const clearChatBtn = document.getElementById("clearChatBtn");
    const clearHistoryBtn = document.getElementById("clearHistoryBtn");
    const recentHistoryList = document.getElementById("recentHistoryList");
    
    const navItems = document.querySelectorAll(".nav-item");
    const tabViews = document.querySelectorAll(".tab-view");
    const pageTitle = document.getElementById("pageTitle");
    const quickButtons = document.querySelectorAll(".quick-btn");

    // State Variables
    let isListening = false;
    let recognition = null;
    let commandHistory = [];

    /* ==========================================================================
       1. INITIALIZATION & GREETING
       ========================================================================== */
    function initGreeting() {
        const hour = new Date().getHours();
        let greeting = "Good evening";
        if (hour >= 5 && hour < 12) greeting = "Good morning";
        else if (hour >= 12 && hour < 17) greeting = "Good afternoon";
        if (timeGreeting) timeGreeting.textContent = greeting;
    }

    function loadHistory() {
        try {
            const saved = localStorage.getItem("adc_command_history");
            commandHistory = saved ? JSON.parse(saved) : [];
        } catch {
            commandHistory = [];
        }
        renderHistory();
    }

    function saveHistory(cmd) {
        if (!cmd || !cmd.trim()) return;
        const clean = cmd.trim();
        commandHistory = [clean, ...commandHistory.filter(item => item.toLowerCase() !== clean.toLowerCase())].slice(0, 15);
        try {
            localStorage.setItem("adc_command_history", JSON.stringify(commandHistory));
        } catch (e) {
            console.warn("Could not save history to localStorage:", e);
        }
        renderHistory();
    }

    function renderHistory() {
        if (!recentHistoryList) return;
        recentHistoryList.innerHTML = "";

        if (commandHistory.length === 0) {
            const empty = document.createElement("div");
            empty.className = "history-item";
            empty.style.color = "var(--text-muted)";
            empty.style.cursor = "default";
            empty.textContent = "No recent commands";
            recentHistoryList.appendChild(empty);
            return;
        }

        commandHistory.forEach(item => {
            const btn = document.createElement("button");
            btn.className = "history-item";
            btn.textContent = item;
            btn.title = `Run "${item}"`;
            btn.addEventListener("click", () => {
                switchTab("dashboard");
                commandInput.value = item;
                autoResizeInput();
                commandInput.focus();
            });
            recentHistoryList.appendChild(btn);
        });
    }

    /* ==========================================================================
       2. TAB NAVIGATION
       ========================================================================== */
    function switchTab(targetTab) {
        navItems.forEach(nav => {
            if (nav.dataset.tab === targetTab) {
                nav.classList.add("active");
            } else {
                nav.classList.remove("active");
            }
        });

        tabViews.forEach(view => {
            if (view.id === `view-${targetTab}`) {
                view.classList.add("active");
            } else {
                view.classList.remove("active");
            }
        });

        const titleMap = {
            dashboard: "Dashboard",
            commands: "Command Catalog",
            voice: "Voice Assistant",
            security: "Security Architecture",
            about: "System Overview"
        };
        if (pageTitle) pageTitle.textContent = titleMap[targetTab] || "ADC Controller";
    }

    navItems.forEach(btn => {
        btn.addEventListener("click", () => {
            switchTab(btn.dataset.tab);
        });
    });

    /* ==========================================================================
       3. HEALTH STATUS POLLING
       ========================================================================== */
    async function checkHealth() {
        try {
            const res = await fetch("/api/health");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (data.success && data.status === "online") {
                healthDot.className = "status-dot online";
                healthStatusText.textContent = "Agent Online";
                const modelName = data.model || "Groq Llama 3";
                if (modelBadge) modelBadge.textContent = modelName.split("/").pop();
                if (aboutModelVal) aboutModelVal.textContent = modelName;
            } else {
                throw new Error("Invalid health response");
            }
        } catch (error) {
            healthDot.className = "status-dot offline";
            healthStatusText.textContent = "Agent Offline";
            if (modelBadge) modelBadge.textContent = "Reconnecting...";
        }
    }

    checkHealth();
    setInterval(checkHealth, 10000);

    /* ==========================================================================
       4. CHAT RENDERING & MESSAGING
       ========================================================================== */
    function formatTime(date = new Date()) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    function appendUserMessage(text) {
        const row = document.createElement("div");
        row.className = "chat-message-row user";

        const bubble = document.createElement("div");
        bubble.className = "message-bubble";

        const textDiv = document.createElement("div");
        textDiv.className = "message-text";
        textDiv.textContent = text;

        const timeSpan = document.createElement("span");
        timeSpan.className = "timestamp";
        timeSpan.textContent = formatTime();

        bubble.appendChild(textDiv);
        bubble.appendChild(timeSpan);
        row.appendChild(bubble);

        chatLog.appendChild(row);
        scrollToBottom();
    }

    function appendAssistantMessage(data, isError = false) {
        const row = document.createElement("div");
        row.className = "chat-message-row assistant";

        const bubble = document.createElement("div");
        bubble.className = "message-bubble";

        const meta = document.createElement("div");
        meta.className = "message-meta";

        const actionBadge = document.createElement("span");
        actionBadge.className = `action-pill ${isError ? "error" : ""}`;
        actionBadge.textContent = `[${data.action || (isError ? "ERROR" : "ADC")}]`;

        const timeSpan = document.createElement("span");
        timeSpan.className = "timestamp";
        timeSpan.textContent = formatTime();

        meta.appendChild(actionBadge);
        meta.appendChild(timeSpan);

        const textDiv = document.createElement("div");
        textDiv.className = "message-text";
        textDiv.textContent = data.message || (isError ? "An error occurred." : "Command processed.");

        bubble.appendChild(meta);
        bubble.appendChild(textDiv);

        // Render Confirmation Card if requested
        if (data.requires_confirmation && (data.action === "SHUTDOWN" || data.action === "RESTART")) {
            const confirmCard = createConfirmationCard(data.action);
            bubble.appendChild(confirmCard);
        }

        row.appendChild(bubble);
        chatLog.appendChild(row);
        scrollToBottom();
        return row;
    }

    function appendLoadingBubble() {
        const row = document.createElement("div");
        row.className = "chat-message-row assistant loading-row";

        const bubble = document.createElement("div");
        bubble.className = "message-bubble";
        bubble.style.color = "var(--text-muted)";
        bubble.innerHTML = `<span>ADC is thinking...</span>`;

        row.appendChild(bubble);
        chatLog.appendChild(row);
        scrollToBottom();
        return row;
    }

    function createConfirmationCard(action) {
        const card = document.createElement("div");
        card.className = "confirmation-card";

        const warning = document.createElement("div");
        warning.className = "confirm-warning";
        warning.innerHTML = `<span>⚠️</span><span>Are you sure you want to ${action.toLowerCase()} Windows?</span>`;

        const actions = document.createElement("div");
        actions.className = "confirm-actions";

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "btn-confirm-cancel";
        cancelBtn.textContent = "Cancel";
        cancelBtn.addEventListener("click", () => {
            card.remove();
            appendAssistantMessage({
                action: "CANCELLED",
                message: `${action === "SHUTDOWN" ? "Shutdown" : "Restart"} cancelled.`
            });
        });

        const confirmBtn = document.createElement("button");
        confirmBtn.className = "btn-confirm-danger";
        confirmBtn.textContent = `Confirm ${action === "SHUTDOWN" ? "Shutdown" : "Restart"}`;
        confirmBtn.addEventListener("click", async () => {
            confirmBtn.disabled = true;
            cancelBtn.disabled = true;
            try {
                const res = await fetch("/api/confirm", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action })
                });
                const resData = await res.json();
                card.remove();
                appendAssistantMessage({
                    action,
                    message: resData.message || `${action} initiated.`
                });
            } catch (err) {
                card.remove();
                appendAssistantMessage({
                    action: "ERROR",
                    message: `Confirmation failed: ${err.message}`
                }, true);
            }
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);
        card.appendChild(warning);
        card.appendChild(actions);

        return card;
    }

    function scrollToBottom() {
        const tabViewport = document.querySelector(".tab-viewport");
        if (tabViewport) {
            tabViewport.scrollTop = tabViewport.scrollHeight;
        }
    }

    /* ==========================================================================
       5. COMMAND DISPATCH (/api/chat)
       ========================================================================== */
    async function sendCommand(rawText) {
        const text = (rawText || commandInput.value).trim();
        if (!text) return;

        // Switch to dashboard tab if not already on it
        switchTab("dashboard");

        // Clear input & auto-resize
        commandInput.value = "";
        autoResizeInput();

        // Add user message to UI & history
        appendUserMessage(text);
        saveHistory(text);

        sendBtn.disabled = true;
        const loadingIndicator = appendLoadingBubble();

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ message: text })
            });

            const rawResponseText = await response.text();
            let data;
            try {
                data = rawResponseText ? JSON.parse(rawResponseText) : {};
            } catch {
                throw new Error(`Server returned invalid JSON (HTTP ${response.status})`);
            }

            loadingIndicator.remove();

            if (!response.ok) {
                appendAssistantMessage({
                    action: data.action || "ERROR",
                    message: data.message || `Server returned HTTP ${response.status}`
                }, true);
            } else {
                appendAssistantMessage(data, data.success === false);
            }

        } catch (error) {
            loadingIndicator.remove();
            console.error("[ADC Client Error]", error);
            appendAssistantMessage({
                action: "ERROR",
                message: `Connection failed: ${error.message}. Ensure ADC Desktop Agent is running.`
            }, true);
        } finally {
            sendBtn.disabled = false;
            commandInput.focus();
        }
    }

    /* ==========================================================================
       6. COMPOSER INTERACTIONS & AUTO-RESIZE
       ========================================================================== */
    function autoResizeInput() {
        commandInput.style.height = "auto";
        commandInput.style.height = Math.min(commandInput.scrollHeight, 140) + "px";
    }

    commandInput.addEventListener("input", autoResizeInput);

    commandInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendCommand();
        }
    });

    sendBtn.addEventListener("click", () => sendCommand());

    // Quick suggestions buttons
    quickButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const cmd = btn.dataset.command;
            if (cmd) {
                sendCommand(cmd);
            }
        });
    });

    // Clear Chat
    if (clearChatBtn) {
        clearChatBtn.addEventListener("click", () => {
            chatLog.innerHTML = "";
        });
    }

    // Clear History
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener("click", () => {
            commandHistory = [];
            localStorage.removeItem("adc_command_history");
            renderHistory();
        });
    }

    /* ==========================================================================
       7. SPEECH RECOGNITION (VOICE ASSISTANT)
       ========================================================================== */
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        const noSupportMsg = "Voice recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.";
        if (voiceBtn) {
            voiceBtn.title = noSupportMsg;
            voiceBtn.addEventListener("click", () => {
                alert(noSupportMsg);
            });
        }
        if (voiceTabMicBtn) {
            voiceTabMicBtn.addEventListener("click", () => {
                alert(noSupportMsg);
            });
        }
        if (voiceTabStatus) voiceTabStatus.textContent = "Not Supported";
        if (voiceTabFeedback) voiceTabFeedback.textContent = noSupportMsg;
    } else {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-IN";

        function updateVoiceState(state, feedback = "") {
            if (state === "listening") {
                isListening = true;
                voiceBtn.classList.add("listening");
                if (voiceTabMicBtn) voiceTabMicBtn.classList.add("listening");
                voiceBanner.classList.remove("hidden");
                voiceBannerText.textContent = "Listening... Speak your command";
                if (voiceTabStatus) voiceTabStatus.textContent = "Listening...";
                if (voiceTabFeedback) voiceTabFeedback.textContent = feedback || "Speak now...";
            } else if (state === "processing") {
                voiceBannerText.textContent = "Processing voice input...";
                if (voiceTabStatus) voiceTabStatus.textContent = "Processing...";
            } else {
                isListening = false;
                voiceBtn.classList.remove("listening");
                if (voiceTabMicBtn) voiceTabMicBtn.classList.remove("listening");
                voiceBanner.classList.add("hidden");
                if (voiceTabStatus) voiceTabStatus.textContent = "Ready";
                if (voiceTabFeedback) voiceTabFeedback.textContent = feedback || "Click the microphone to start speaking";
            }
        }

        recognition.onstart = () => {
            updateVoiceState("listening");
        };

        recognition.onresult = (event) => {
            let transcript = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            commandInput.value = transcript.trim();
            autoResizeInput();
            if (voiceTabFeedback) voiceTabFeedback.textContent = `"${transcript.trim()}"`;
        };

        recognition.onerror = (event) => {
            console.error("[SpeechRecognition Error]", event.error);
            let errMsg = "Speech recognition error.";
            if (event.error === "not-allowed") {
                errMsg = "Microphone access was denied. Please allow microphone permissions in your browser.";
            } else if (event.error === "no-speech") {
                errMsg = "No speech detected. Please try again.";
            }
            updateVoiceState("idle", errMsg);
        };

        recognition.onend = () => {
            updateVoiceState("idle");
            // If text was captured in input, automatically execute it
            if (commandInput.value.trim()) {
                const captured = commandInput.value.trim();
                sendCommand(captured);
            }
        };

        function toggleVoice() {
            if (isListening) {
                recognition.stop();
            } else {
                try {
                    recognition.start();
                } catch (err) {
                    console.error("Could not start recognition:", err);
                }
            }
        }

        if (voiceBtn) voiceBtn.addEventListener("click", toggleVoice);
        if (voiceTabMicBtn) voiceTabMicBtn.addEventListener("click", toggleVoice);
    }

    // Initialize greeting and history on startup
    initGreeting();
    loadHistory();
    console.log("[ADC] Frontend UI initialized successfully.");
});