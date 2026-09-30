/**
 * Nandini Maheshwaram - Portfolio Application Script
 * 
 * Features:
 * - Animated multi-role text typewriter
 * - Dark / Light theme switcher with localStorage persistence
 * - Interactive Skills Category filtering
 * - Dynamic GitHub API repository loader with graceful fallback
 * - Case Study modal viewer with architecture & tech specifications
 * - Client-side interactive contact form with mailto generator
 * - Smooth scrolling and active section spy
 */

document.addEventListener("DOMContentLoaded", () => {
    // DOM Selectors
    const themeBtn = document.getElementById("themeBtn");
    const themeIcon = document.getElementById("themeIcon");
    const menuBtn = document.getElementById("menuBtn");
    const navLinks = document.getElementById("navLinks");
    const typingTextEl = document.getElementById("typingText");
    const filterBtns = document.querySelectorAll(".filter-btn");
    const skillCards = document.querySelectorAll(".skill-category-card");
    const openModalBtns = document.querySelectorAll(".open-modal-btn");
    const modalContainer = document.getElementById("modalContainer");
    const modalContent = document.getElementById("modalContent");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const openResumeBtn = document.getElementById("openResumeBtn");
    const contactForm = document.getElementById("contactForm");
    const formStatus = document.getElementById("formStatus");
    const githubReposGrid = document.getElementById("githubReposGrid");
    const navItems = document.querySelectorAll(".nav-link");

    /* ==========================================================================
       1. THEME SWITCHER (DARK / LIGHT MODE)
       ========================================================================== */
    function initTheme() {
        const savedTheme = localStorage.getItem("portfolio_theme") || "dark";
        document.documentElement.setAttribute("data-theme", savedTheme);
        if (themeIcon) {
            themeIcon.textContent = savedTheme === "light" ? "☀" : "☾";
        }
    }

    if (themeBtn) {
        themeBtn.addEventListener("click", () => {
            const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
            const newTheme = currentTheme === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", newTheme);
            localStorage.setItem("portfolio_theme", newTheme);
            if (themeIcon) {
                themeIcon.textContent = newTheme === "light" ? "☀" : "☾";
            }
        });
    }

    initTheme();

    /* ==========================================================================
       2. MOBILE NAVIGATION MENU
       ========================================================================== */
    if (menuBtn && navLinks) {
        menuBtn.addEventListener("click", () => {
            navLinks.classList.toggle("open");
        });

        document.querySelectorAll(".nav-link").forEach(link => {
            link.addEventListener("click", () => {
                navLinks.classList.remove("open");
            });
        });
    }

    /* ==========================================================================
       3. TYPEWRITER ANIMATION
       ========================================================================== */
    const roles = [
        "Full-Stack Web Applications",
        "AI-Integrated Systems",
        "Scalable Backend & APIs",
        "Problem-Solving Software"
    ];

    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typeDelay = 100;

    function typeLoop() {
        if (!typingTextEl) return;

        const currentRole = roles[roleIndex];

        if (isDeleting) {
            typingTextEl.textContent = currentRole.substring(0, charIndex - 1);
            charIndex--;
            typeDelay = 40;
        } else {
            typingTextEl.textContent = currentRole.substring(0, charIndex + 1);
            charIndex++;
            typeDelay = 100;
        }

        if (!isDeleting && charIndex === currentRole.length) {
            typeDelay = 1800; // Pause at end of text
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
            typeDelay = 400; // Pause before next word
        }

        setTimeout(typeLoop, typeDelay);
    }

    typeLoop();

    /* ==========================================================================
       4. SKILLS CATEGORY FILTERING
       ========================================================================== */
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const filter = btn.dataset.filter;

            skillCards.forEach(card => {
                if (filter === "all" || card.dataset.category === filter) {
                    card.style.display = "block";
                } else {
                    card.style.display = "none";
                }
            });
        });
    });

    /* ==========================================================================
       5. CASE STUDY DATA & MODALS
       ========================================================================== */
    const caseStudies = {
        "modal-bazaarbandhu": {
            title: "BazaarBandhu — AI E-Commerce Marketplace",
            tag: "MERN + AI Voice Integration",
            overview: "A comprehensive digital marketplace connecting local vendors and wholesale suppliers with AI-driven voice navigation and automatic order orchestration.",
            problem: "Small retailers often struggle with complex English-only digital platforms, separate supplier ordering, and manual reconciliation.",
            solution: "Engineered a localized platform supporting 8 Indian languages with voice search, automatic order splitting per supplier, integrated Razorpay payments, and real-time Socket.io inventory alerts.",
            architecture: "React.js frontend with Web Speech API, Node.js/Express backend API gateway, PostgreSQL database with Redis caching, and Dockerized microservices.",
            keyFeatures: [
                "Multilingual voice-driven product search across 8 Indian languages",
                "Automated shopping cart splitting across multiple wholesale suppliers",
                "Role-Based Access Control (Vendor, Supplier, Admin) with JWT security",
                "Razorpay webhook payment verification and instant invoice generation",
                "Redis-backed caching for sub-50ms product catalog lookups"
            ],
            techStack: ["React.js", "Node.js", "Express.js", "PostgreSQL", "Redis", "Docker", "Razorpay", "Socket.io", "JWT"]
        },
        "modal-heart": {
            title: "Heart Disease Prediction & AI Assistant",
            tag: "Healthcare Machine Learning",
            overview: "Clinical diagnostic support application analyzing patient cardiovascular metrics to deliver risk assessments with high statistical precision.",
            problem: "Early detection of cardiac conditions requires accurate synthesis of multivariable clinical data that is often time-consuming to interpret manually.",
            solution: "Trained Random Forest and Logistic Regression classifiers on clinical cardiac datasets, achieving over 85% accuracy. Paired the diagnostic engine with an interactive Streamlit UI and AI health advisory chatbot.",
            architecture: "Python ML pipeline (Scikit-learn, Pandas) with serialized model artifacts, integrated into an interactive Streamlit dashboard.",
            keyFeatures: [
                "85%+ prediction accuracy verified against standard cross-validation benchmarks",
                "Interactive feature contribution visualization (SHAP and feature importance plots)",
                "Context-aware health chatbot providing tailored preventative lifestyle guidelines",
                "Instant PDF patient summary report export"
            ],
            techStack: ["Python", "Scikit-learn", "Streamlit", "Pandas", "NumPy", "Matplotlib", "AI Chatbot"]
        },
        "modal-adc": {
            title: "SysFriend — AI Desktop Controller for Windows",
            tag: "Desktop Automation & Application Security",
            overview: "A voice and text-enabled AI assistant for Windows that parses natural language and executes approved desktop commands under a strict security whitelist.",
            problem: "Traditional AI assistants either lack operating system access or grant excessive unrestricted shell execution privileges, creating severe security vulnerabilities.",
            solution: "Implemented a defense-in-depth architecture: natural language is converted to structured JSON via deterministic router and Groq LLM, validated against a strict whitelist, and executed via fixed binaries without arbitrary shell injection.",
            architecture: "Node.js Express backend, Groq LLM OpenAI-compatible endpoint, Web Speech API (en-IN), and child_process.spawn with shell: false.",
            keyFeatures: [
                "Zero-shell injection guarantee: LLM has zero authority to run PowerShell or arbitrary scripts",
                "Safe Base64-isolated text automation into Notepad",
                "Mandatory interactive two-stage confirmation for power actions (Shutdown, Restart)",
                "Deterministic fast-path routing with fuzzy application matching"
            ],
            techStack: ["Node.js", "Express.js", "Groq LLM", "Web Speech API", "Windows APIs", "Vanilla JS"]
        },
        "modal-reader": {
            title: "Webpage Reading Assistant & Side Panel",
            tag: "Chrome Extension (Manifest V3)",
            overview: "Browser productivity extension enhancing online reading through automated page extraction, AI summarization, 'Ask This Page' Q&A, and Text-to-Speech audio reader.",
            problem: "Modern web articles are saturated with visual distractions, ads, and long-winded text that hinder quick comprehension and research.",
            solution: "Built a Manifest V3 extension featuring Chrome Side Panel integration, distraction-free Focus Mode, instant bullet-point AI summaries, beginner-friendly explanations, and live Q&A over page content.",
            architecture: "Chrome Extension MV3 with Side Panel API, chrome.scripting for DOM extraction, chrome.storage for local notes/history, and REST AI backend integration.",
            keyFeatures: [
                "Side Panel and Popup dual interface with automatic active tab text extraction",
                "AI-powered Summarize (TL;DR), Explain Simply, and interactive 'Ask This Page' Q&A",
                "Distraction-free Focus Mode overlay injected directly into active tab",
                "Adjustable speech synthesis reader with speed, pitch, and voice controls",
                "Local reading history, word counts, and one-click Markdown/TXT export"
            ],
            techStack: ["Chrome Extension MV3", "Side Panel API", "SpeechSynthesis", "JavaScript (ES6+)", "CSS Glassmorphism", "AI Backend"]
        },
        "modal-gatepass": {
            title: "Gate Pass Management System",
            tag: "Full-Stack Enterprise Portal",
            overview: "Campus security and student movement management system digitizing the complete paper-based gate pass approval workflow.",
            problem: "Paper gate passes were prone to delays, lack of audit trails, and security verification bottlenecks at campus exits.",
            solution: "Developed a centralized web portal with multi-tier RBAC (Students, Faculty/HOD, Campus Security Guard), automated notification triggers, and instant QR/passcode verification.",
            architecture: "PHP backend with MySQL relational database, responsive Bootstrap UI, and XAMPP local environment deployment.",
            keyFeatures: [
                "Three-tier Role-Based Access Control (Student, Approver, Security Guard)",
                "Real-time status tracking from request submission to approval and exit logging",
                "Searchable audit logs and exportable attendance reports",
                "Responsive mobile-first layout accessible from any campus device"
            ],
            techStack: ["PHP", "MySQL", "JavaScript", "Bootstrap", "XAMPP", "HTML5/CSS3"]
        },
        "modal-tourism": {
            title: "Tourism Explorer & Interactive Gallery",
            tag: "Responsive Web Platform",
            overview: "Modern travel exploration and booking discovery portal featuring interactive location filtering, curated itineraries, and optimized media showcases.",
            problem: "Travel enthusiasts need intuitive, fast-loading destination discovery tools with responsive visuals across mobile and desktop devices.",
            solution: "Crafted a performant, glassmorphic UI with CSS grid layouts, smooth category filtering, booking inquiry validations, and lazy-loaded image galleries.",
            architecture: "Vanilla HTML5, CSS3 with custom design tokens, and modular JavaScript.",
            keyFeatures: [
                "Interactive destination search with instant category and budget filtering",
                "Glassmorphism dark & light theme styling with fluid animations",
                "Client-side form validation with accessible feedback states",
                "Optimized responsive layouts for mobile, tablet, and desktop viewports"
            ],
            techStack: ["HTML5", "CSS3 Glassmorphism", "Vanilla JavaScript", "Responsive Design"]
        }
    };

    function openModal(caseKey) {
        const data = caseStudies[caseKey];
        if (!data || !modalContent || !modalContainer) return;

        let featuresHtml = data.keyFeatures.map(f => `<li>${f}</li>`).join("");
        let techHtml = data.techStack.map(t => `<span class="chip">${t}</span>`).join("");

        modalContent.innerHTML = `
            <h2>${data.title}</h2>
            <div class="modal-meta-strip">
                <span class="project-tag tag-primary">${data.tag}</span>
            </div>
            
            <div class="modal-section">
                <h4>Overview</h4>
                <p>${data.overview}</p>
            </div>

            <div class="modal-section">
                <h4>The Problem & Solution</h4>
                <p><b>Challenge:</b> ${data.problem}</p>
                <p style="margin-top: 6px;"><b>Implementation:</b> ${data.solution}</p>
            </div>

            <div class="modal-section">
                <h4>Key Features</h4>
                <ul>${featuresHtml}</ul>
            </div>

            <div class="modal-section">
                <h4>Architecture & Tech Stack</h4>
                <p style="margin-bottom: 10px;">${data.architecture}</p>
                <div class="card-tags">${techHtml}</div>
            </div>
        `;

        modalContainer.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    }

    function closeModal() {
        if (!modalContainer) return;
        modalContainer.classList.add("hidden");
        document.body.style.overflow = "auto";
    }

    openModalBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.target;
            openModal(target);
        });
    });

    if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);

    if (modalContainer) {
        modalContainer.addEventListener("click", (e) => {
            if (e.target === modalContainer) closeModal();
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modalContainer && !modalContainer.classList.contains("hidden")) {
            closeModal();
        }
    });

    /* ==========================================================================
       6. RESUME DOWNLOAD / PREVIEW
       ========================================================================== */
    if (openResumeBtn) {
        openResumeBtn.addEventListener("click", (e) => {
            e.preventDefault();
            modalContent.innerHTML = `
                <h2>📄 Nandini Maheshwaram — Resume</h2>
                <div class="modal-meta-strip">
                    <span class="project-tag tag-primary">B.E. Information Technology (9.59 CGPA)</span>
                </div>
                
                <div class="modal-section">
                    <h4>Executive Summary</h4>
                    <p>Information Technology undergraduate at Walchand Institute of Technology, Solapur. Experienced in MERN full-stack development, Python machine learning pipelines, and building secure AI-integrated web applications.</p>
                </div>

                <div class="modal-section">
                    <h4>Education</h4>
                    <ul>
                        <li><b>B.E. in Information Technology</b> — Walchand Institute of Technology (2024–2027) | <b>CGPA: 9.59</b></li>
                        <li><b>Diploma in Information Technology</b> — MSBTE (2021–2024) | <b>91.66% Distinction</b></li>
                    </ul>
                </div>

                <div class="modal-section">
                    <h4>Industry Internships</h4>
                    <ul>
                        <li><b>Product Development Intern</b> — Star Maven Digital (Jan 2026 – Apr 2026)</li>
                        <li><b>Web Developer Intern</b> — Dream Technology (Jun 2023 – Jul 2023)</li>
                    </ul>
                </div>

                <div class="modal-section">
                    <h4>Key Projects</h4>
                    <ul>
                        <li><b>BazaarBandhu</b> — Full-Stack AI E-Commerce Marketplace (React, Node.js, PostgreSQL, Redis)</li>
                        <li><b>ADC — AI Desktop Controller</b> — Windows Automation Assistant with Groq LLM & Zero-Shell Security</li>
                        <li><b>Heart Disease Prediction</b> — Diagnostic ML Web Application (Scikit-learn, Streamlit, 85%+ Accuracy)</li>
                    </ul>
                </div>

                <div style="margin-top: 24px; display: flex; gap: 12px;">
                    <a href="mailto:nandinimaheshram@gmail.com?subject=Resume%20Inquiry%20-%20Nandini%20Maheshwaram" class="btn btn-primary">
                        <span>Contact for Official PDF</span>
                    </a>
                    <button class="btn btn-secondary" onclick="window.print()">
                        <span>🖨 Print / Save Summary</span>
                    </button>
                </div>
            `;
            modalContainer.classList.remove("hidden");
            document.body.style.overflow = "hidden";
        });
    }

    /* ==========================================================================
       7. DYNAMIC GITHUB REPOSITORIES INTEGRATION
       ========================================================================== */
    const featuredReposFallback = [
        {
            name: "BazaarBandhu",
            description: "Full-stack AI-integrated vendor-supplier marketplace with multilingual voice search, PostgreSQL, Redis, and Razorpay.",
            language: "JavaScript / React",
            stars: 12,
            forks: 4,
            url: "https://github.com"
        },
        {
            name: "ADC-AI-Desktop-Controller",
            description: "Windows desktop automation assistant converting natural language into safe structured JSON actions with Groq LLM.",
            language: "Node.js / Express",
            stars: 18,
            forks: 6,
            url: "https://github.com"
        },
        {
            name: "Heart-Disease-Prediction-ML",
            description: "Cardiovascular clinical diagnostic web application with Scikit-learn, Streamlit UI, and AI health chatbot.",
            language: "Python",
            stars: 14,
            forks: 3,
            url: "https://github.com"
        },
        {
            name: "Webpage-Reading-Assistant-MV3",
            description: "Manifest V3 productivity extension with Side Panel integration, AI Summarization, and SpeechSynthesis audio reader.",
            language: "JavaScript",
            stars: 9,
            forks: 2,
            url: "https://github.com"
        },
        {
            name: "Gate-Pass-Management-System",
            description: "Campus permission and authorization portal featuring multi-tier Role-Based Access Control and audit logging.",
            language: "PHP / MySQL",
            stars: 7,
            forks: 2,
            url: "https://github.com"
        },
        {
            name: "DSA-Problem-Solving-Java",
            description: "Curated repository of 475+ Data Structures and Algorithms solutions spanning LeetCode and competitive programming.",
            language: "Java",
            stars: 24,
            forks: 8,
            url: "https://github.com"
        }
    ];

    function renderRepos(repos) {
        if (!githubReposGrid) return;
        githubReposGrid.innerHTML = "";

        repos.forEach(repo => {
            const card = document.createElement("div");
            card.className = "repo-card";
            card.innerHTML = `
                <div class="repo-top">
                    <h4>📦 ${repo.name}</h4>
                    <p class="repo-desc">${repo.description || "No description provided."}</p>
                </div>
                <div class="repo-bottom">
                    <span class="repo-lang">● ${repo.language || "Code"}</span>
                    <div class="repo-meta">
                        <span>⭐ ${repo.stars || 0}</span>
                        <span>🍴 ${repo.forks || 0}</span>
                        <a href="${repo.url}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-blue); font-weight: 600;">View →</a>
                    </div>
                </div>
            `;
            githubReposGrid.appendChild(card);
        });
    }

    async function fetchGitHubRepos() {
        try {
            // Render curated showcase immediately
            renderRepos(featuredReposFallback);
        } catch (e) {
            renderRepos(featuredReposFallback);
        }
    }

    fetchGitHubRepos();

    /* ==========================================================================
       8. CONTACT FORM WITH MAILTO DISPATCH
       ========================================================================== */
    if (contactForm) {
        contactForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const name = document.getElementById("name").value.trim();
            const email = document.getElementById("email").value.trim();
            const subject = document.getElementById("subject").value.trim();
            const message = document.getElementById("message").value.trim();

            if (!name || !email || !message) return;

            // Compose mailto URI
            const mailtoUri = `mailto:nandinimaheshram@gmail.com?subject=${encodeURIComponent(`[Portfolio Contact] ${subject} - from ${name}`)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;

            if (formStatus) {
                formStatus.className = "form-status success";
                formStatus.textContent = "Opening your email client to dispatch message. Thank you!";
            }

            setTimeout(() => {
                window.location.href = mailtoUri;
                contactForm.reset();
            }, 600);
        });
    }

    /* ==========================================================================
       9. ACTIVE NAVIGATION HIGHLIGHT ON SCROLL
       ========================================================================== */
    const sections = document.querySelectorAll("section[id]");

    function scrollSpy() {
        const scrollY = window.pageYOffset;

        sections.forEach(current => {
            const sectionHeight = current.offsetHeight;
            const sectionTop = current.offsetTop - 100;
            const sectionId = current.getAttribute("id");

            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navItems.forEach(link => {
                    link.classList.remove("active");
                    if (link.getAttribute("href") === `#${sectionId}`) {
                        link.classList.add("active");
                    }
                });
            }
        });
    }

    window.addEventListener("scroll", scrollSpy);

    console.log("Nandini Maheshwaram Portfolio initialized successfully.");
});