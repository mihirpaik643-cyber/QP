const $ = (selector) => document.querySelector(selector);

const defaultSubjects = ["English", "Hindi", "Mathematics", "Science", "Social Studies"];
const questionTypes = [
  "MCQ",
  "Short Answer",
  "Long Answer",
  "Fill in the Blanks",
  "True/False",
  "Match the Following",
  "One-Word Answer"
];

const sampleQuestions = [
  {
    id: 1,
    text: "Which figure of speech is used in 'the wind whispered through the trees'?",
    answer: "Personification",
    className: "7",
    subject: "English",
    topic: "Poetry",
    type: "MCQ",
    difficulty: "Medium",
    language: "English",
    source: "AI Generated",
    favorite: true,
    marks: 1
  },
  {
    id: 2,
    text: "Explain the difference between evaporation and condensation with one example each.",
    answer: "Evaporation changes liquid to vapor; condensation changes vapor to liquid.",
    className: "6",
    subject: "Science",
    topic: "Water Cycle",
    type: "Short Answer",
    difficulty: "Easy",
    language: "English",
    source: "Uploaded PDF",
    favorite: false,
    marks: 3
  },
  {
    id: 3,
    text: "Solve: 3x + 7 = 28.",
    answer: "x = 7",
    className: "8",
    subject: "Mathematics",
    topic: "Linear Equations",
    type: "One-Word Answer",
    difficulty: "Easy",
    language: "English",
    source: "Manual",
    favorite: true,
    marks: 2
  },
  {
    id: 4,
    text: "Describe three causes of the Revolt of 1857.",
    answer: "Political annexation, economic exploitation, military grievances, and social-religious fears.",
    className: "10",
    subject: "Social Studies",
    topic: "Modern India",
    type: "Long Answer",
    difficulty: "Hard",
    language: "English",
    source: "Internet Source",
    favorite: false,
    marks: 5
  }
];

const state = {
  route: location.hash.replace("#", "") || "/splash",
  isAuthed: localStorage.getItem("qp-auth") === "true",
  user: JSON.parse(localStorage.getItem("qp-user") || '{"name":"Mihir","school":"Green Valley School","designation":"Teacher"}'),
  customSubjects: JSON.parse(localStorage.getItem("qp-custom-subjects") || '["GK","Ethics","Computer"]'),
  lang: localStorage.getItem("qp-lang") || "English",
  dark: localStorage.getItem("qp-dark") === "true",
  apiKeyVisible: false,
  online: navigator.onLine,
  toast: "",
  onboardingStep: 0,
  selectedClasses: ["6", "7"],
  selectedSubjects: ["English", "Science"],
  paperConfig: {
    title: "Half Yearly Exam",
    className: "7",
    subject: "English",
    topic: "The Rime of the Ancient Mariner",
    language: "English",
    difficulty: "Mixed",
    duration: 60,
    totalMarks: 50
  },
  typeConfig: {
    MCQ: { enabled: true, count: 10, marks: 1 },
    "Short Answer": { enabled: true, count: 5, marks: 3 },
    "Long Answer": { enabled: true, count: 2, marks: 5 },
    "True/False": { enabled: true, count: 5, marks: 1 }
  },
  questions: JSON.parse(localStorage.getItem("qp-bank") || "null") || sampleQuestions,
  papers: JSON.parse(localStorage.getItem("qp-papers") || "null") || [
    { id: "p1", title: "Class 7 English Unit Test", className: "7", subject: "English", language: "English", date: "23 Jun 2026", count: 18, marks: 40, synced: "Local" },
    { id: "p2", title: "Science Worksheet - Water", className: "6", subject: "Science", language: "English", date: "20 Jun 2026", count: 12, marks: 30, synced: "Drive" }
  ],
  activeQuestions: [],
  showAnswers: false,
  cloud: JSON.parse(localStorage.getItem("qp-cloud") || '{"google":false,"oneDrive":false}'),
  filters: { query: "", className: "", subject: "", type: "", difficulty: "", favorites: false },
  paperFilters: { query: "", className: "", subject: "", language: "" },
  uploadedFile: JSON.parse(localStorage.getItem("qp-uploaded-file") || "null"),
  uploadLoading: false,
  uploadResults: [],
  searchQuery: "",
  searchLoading: false,
  searchResults: [],
  apiKey: localStorage.getItem("qp-gemini-api-key") || ""
};

let _uploadedFileBlob = null;
let _uploadProgress = 0;

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

async function callGeminiInteractions(payload) {
  const headers = {
    "Content-Type": "application/json",
    "x-goog-api-key": state.apiKey
  };

  if (location.protocol !== "file:") {
    try {
      const proxied = await fetch("/api/analyze", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (proxied.ok || ![404, 405, 501].includes(proxied.status)) return proxied;
    } catch {
      // Fall back to direct mode below for plain static hosting.
    }
  }

  return fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
}

function persist() {
  localStorage.setItem("qp-user", JSON.stringify(state.user));
  localStorage.setItem("qp-custom-subjects", JSON.stringify(state.customSubjects));
  localStorage.setItem("qp-bank", JSON.stringify(state.questions));
  localStorage.setItem("qp-papers", JSON.stringify(state.papers));
  localStorage.setItem("qp-uploaded-file", JSON.stringify(state.uploadedFile));
  localStorage.setItem("qp-cloud", JSON.stringify(state.cloud));
  localStorage.setItem("qp-dark", String(state.dark));
  localStorage.setItem("qp-lang", state.lang);
  if (state.apiKey) localStorage.setItem("qp-gemini-api-key", state.apiKey);
  else localStorage.removeItem("qp-gemini-api-key");
}

function go(route) {
  if (!state.isAuthed && !isPublicRoute(route)) {
    notify("Please login to view your documents.");
    route = "/login";
  }
  state.route = route;
  history.replaceState(null, "", `#${route}`);
  render();
}

function isPublicRoute(route) {
  return ["/splash", "/login", "/signup", "/forgot-password"].includes(route);
}

function allSubjects() {
  return [...new Set([...defaultSubjects, ...state.customSubjects])];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function confirmDelete(message) {
  return typeof confirm === "function" ? confirm(message) : true;
}

function subjectManager() {
  return `
    <div class="subject-manager">
      <div class="field" style="margin-bottom:0">
        <label>Add Subject</label>
        <div class="inline-control">
          <input name="newSubject" data-new-subject placeholder="GK, Ethics, Computer..." />
          <button class="secondary-btn" data-add-subject>Add</button>
        </div>
      </div>
      <div class="chip-row" style="margin-top:10px">
        ${allSubjects().map((subject) => `<span class="chip ${state.customSubjects.includes(subject) ? "active" : ""}">${escapeHtml(subject)}${state.customSubjects.includes(subject) ? ` <button class="chip-x" data-remove-subject="${encodeURIComponent(subject)}" aria-label="Remove ${escapeHtml(subject)}">x</button>` : ""}</span>`).join("")}
      </div>
    </div>
  `;
}

function notify(message) {
  state.toast = message;
  render();
  setTimeout(() => {
    state.toast = "";
    render();
  }, 2400);
}

function icon(name) {
  const icons = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5h-5.2v-6.2H8.7V21H3.5a.5.5 0 0 1-.5-.5z"/></svg>',
    papers: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v5h5M10 13h7M10 17h7"/></svg>',
    create: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    bank: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
    profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 16v3h14v-3"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>',
    file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v6h5"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.2-1.8A5 5 0 0 0 7 18z"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6"/></svg>',
    key: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M17 6l2 2M15 8l2 2"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2 7.5 14 3 9.6l6.2-.9z"/></svg>'
  };
  return icons[name] || "";
}

function shell(title, content, options = {}) {
  const back = options.back ? `<button class="icon-btn" data-go="${options.back}" aria-label="Back">${icon("back")}</button>` : "";
  const noNav = options.noNav ? "" : bottomNav();
  return `
    <main class="app ${state.dark ? "dark" : ""}">
      ${!state.online ? '<div class="offline-banner">You are offline. Saved papers and question bank remain available.</div>' : ""}
      <div class="topbar">
        <div class="brand-row" style="margin:0">${back}<div class="logo-mark compact">QP</div><h1>${title}</h1></div>
        ${options.action || `<button class="avatar" data-go="/profile">${state.user.name.slice(0, 1).toUpperCase()}</button>`}
      </div>
      <section class="shell"><div class="content">${content}</div></section>
      ${noNav}
      ${state.toast ? `<div class="toast">${state.toast}</div>` : ""}
    </main>
  `;
}

function bottomNav() {
  const items = [
    ["/dashboard", "home", "Home"],
    ["/saved-papers", "papers", "Papers"],
    ["/create-paper/config", "create", "Create"],
    ["/question-bank", "bank", "Bank"],
    ["/profile", "profile", "Profile"]
  ];
  return `<nav class="bottom-nav">${items
    .map(([route, glyph, label]) => `<button class="nav-btn ${glyph === "create" ? "create" : ""} ${state.route === route ? "active" : ""}" data-go="${route}"><span>${icon(glyph)}</span><span>${label}</span></button>`)
    .join("")}</nav>`;
}

function splash() {
  setTimeout(() => go(state.isAuthed ? "/dashboard" : "/login"), 1000);
  return `
    <main class="splash">
      <div>
        <div class="logo-mark">QP</div>
        <h1>QP.ai</h1>
        <p>Smart Question Papers, Instantly.</p>
        <div class="spinner"></div>
      </div>
    </main>
  `;
}

function auth(mode) {
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";
  return `
    <main class="auth-shell ${state.dark ? "dark" : ""}">
      <section class="auth-card">
        <div class="brand-row">
          <div class="logo-mark">QP</div>
          <div><h1 class="brand-title">${isForgot ? "Reset Password" : isSignup ? "Create account" : "Welcome back"}</h1><p class="muted" style="margin:2px 0 0">Smart Question Papers, Instantly.</p></div>
        </div>
        ${isSignup ? field("Full Name", "name", "Aarav Sharma") : ""}
        ${isSignup ? field("School Name", "school", "Green Valley School") : ""}
        ${isSignup ? selectField("Designation", "designation", ["Teacher", "Tutor", "Principal", "Other"]) : ""}
        ${field("Email", "email", "teacher@school.edu", "email")}
        ${!isForgot ? field("Password", "password", "••••••••", "password") : ""}
        ${isSignup ? field("Confirm Password", "confirm", "••••••••", "password") : ""}
        ${isSignup ? '<label class="chip active" style="display:flex;gap:8px;margin-bottom:14px"><input type="checkbox" checked /> I agree to Terms & Privacy Policy</label>' : ""}
        <div class="button-stack">
          <button class="primary-btn" data-auth="${isForgot ? "forgot" : isSignup ? "signup" : "login"}">${isForgot ? "Send Reset Link" : isSignup ? "Create Account" : "Login"}</button>
          ${!isForgot ? '<button class="secondary-btn" data-auth="google">Continue with Google</button>' : ""}
        </div>
        <p style="text-align:center">
          ${isForgot ? '<button class="link-btn" data-go="/login">Back to Login</button>' : isSignup ? '<button class="link-btn" data-go="/login">Already have an account? Login</button>' : '<button class="link-btn" data-go="/forgot-password">Forgot Password?</button><br><button class="link-btn" data-go="/signup">Don&apos;t have an account? Sign Up</button>'}
        </p>
      </section>
    </main>
  `;
}

function field(label, name, value = "", type = "text") {
  return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${value}" /></div>`;
}

function selectField(label, name, options, selected = options[0]) {
  return `<div class="field"><label>${label}</label><select name="${name}">${options.map((option) => `<option ${option === selected ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></div>`;
}

function onboarding() {
  const steps = [
    { title: "Preferred Classes", key: "selectedClasses", items: Array.from({ length: 10 }, (_, i) => String(i + 1)) },
    { title: "Preferred Subjects", key: "selectedSubjects", items: allSubjects() },
    { title: "Interface Language", key: "lang", items: ["English", "Hindi", "Both"] }
  ];
  const step = steps[state.onboardingStep];
  const selected = state[step.key];
  return shell(
    "Onboarding",
    `
    <div class="card">
      <div class="steps">Step ${state.onboardingStep + 1}/3 <div class="progress" style="flex:1"><div style="width:${((state.onboardingStep + 1) / 3) * 100}%"></div></div></div>
      <h2 style="margin-top:18px">${step.title}</h2>
      <p class="muted">Personalize the dashboard and question generation defaults.</p>
      <div class="chip-row">${step.items
        .map((item) => `<button class="chip ${Array.isArray(selected) ? selected.includes(item) ? "active" : "" : selected === item ? "active" : ""}" data-pick="${step.key}" data-value="${item}">${item}</button>`)
        .join("")}</div>
      <div class="sticky-actions">
        <button class="secondary-btn" data-onboard="back">Back</button>
        <button class="primary-btn" data-onboard="next">${state.onboardingStep === 2 ? "Get Started" : "Next"}</button>
      </div>
    </div>`,
    { noNav: true, action: '<button class="link-btn" data-go="/dashboard">Skip</button>' }
  );
}

function dashboard() {
  const apiReady = Boolean(state.apiKey);
  return shell(
    "QP.ai",
    `
    <div class="hero-panel">
      <div>
        <span class="overline">Teacher workspace</span>
        <h2>Hello, ${state.user.name}.</h2>
        <p>Create curriculum-aligned papers, extract questions from uploads, and export polished PDFs.</p>
      </div>
      <button class="hero-action" data-go="/create-paper/config">${icon("create")} New Paper</button>
    </div>
    <button class="ai-status ${apiReady ? "ready" : ""}" data-go="/api-settings">
      <span class="status-icon">${icon("key")}</span>
      <span><strong>${apiReady ? "AI analysis is ready" : "Add your Gemini API key"}</strong><small>${apiReady ? "Upload a paper and extract questions." : "Connect Gemini in Profile to analyze PDFs and photos."}</small></span>
    </button>
    <div class="stats">
      <div class="stat-card"><span class="stat-value">${state.papers.length}</span><span class="stat-label">Papers Created</span></div>
      <div class="stat-card"><span class="stat-value">${state.questions.length}</span><span class="stat-label">Questions in Bank</span></div>
      <div class="stat-card"><span class="stat-value">${new Set(state.questions.map((q) => q.subject)).size}</span><span class="stat-label">Subjects Active</span></div>
    </div>
    <section class="section">
      <div class="section-head"><h2 class="section-title">Quick Actions</h2></div>
      <div class="grid two">
        <button class="card quick-action" data-go="/upload"><span class="icon">${icon("upload")}</span><strong>Upload File</strong><span class="muted">PDF, JPG, PNG</span></button>
        <button class="card quick-action" data-go="/internet-search"><span class="icon">${icon("search")}</span><strong>Search Online</strong><span class="muted">Import with sources</span></button>
        <button class="card quick-action" data-go="/question-bank"><span class="icon">${icon("bank")}</span><strong>Question Bank</strong><span class="muted">Filter and reuse</span></button>
        <button class="card quick-action" data-go="/saved-papers"><span class="icon">${icon("papers")}</span><strong>Saved Papers</strong><span class="muted">Preview and export</span></button>
      </div>
    </section>
    <section class="section">
      <div class="section-head"><h2 class="section-title">Recent Papers</h2><button class="link-btn" data-go="/saved-papers">View all</button></div>
      <div class="paper-strip">${state.papers.map(paperCard).join("")}</div>
    </section>`
  );
}

function paperCard(paper) {
  return `<article class="paper-card">
    <button class="paper-main" data-go="/paper-preview/${paper.id}">
      <strong>${paper.title}</strong>
      <p class="muted">Class ${paper.className} &middot; ${paper.subject} &middot; ${paper.language || "English"} &middot; ${paper.date}</p>
      <div class="badge-row"><span class="badge">${paper.count} questions</span><span class="badge">${paper.marks} marks</span><span class="badge">${paper.synced}</span></div>
    </button>
    <div class="card-actions">
      <button class="secondary-btn" data-go="/paper-preview/${paper.id}">Preview</button>
      <button class="danger-lite-btn" data-delete-paper="${paper.id}">Delete</button>
    </div>
  </article>`;
}

function createConfig() {
  return shell(
    "New Question Paper",
    `
    <div class="desktop-columns">
      <section class="card">
        <div class="steps">Step 1/3 <div class="progress" style="flex:1"><div style="width:33%"></div></div></div>
        <div class="form-grid two" style="margin-top:16px">
          ${field("Paper Title", "title", state.paperConfig.title)}
          ${selectField("Class", "className", Array.from({ length: 10 }, (_, i) => String(i + 1)), state.paperConfig.className)}
          ${selectField("Subject", "subject", allSubjects(), state.paperConfig.subject)}
          ${field("Chapter / Topic", "topic", state.paperConfig.topic)}
          ${selectField("Language", "language", ["English", "Hindi", "Bilingual"], state.paperConfig.language)}
          ${selectField("Difficulty", "difficulty", ["Easy", "Medium", "Hard", "Mixed"], state.paperConfig.difficulty)}
          ${field("Duration (minutes)", "duration", state.paperConfig.duration, "number")}
          ${field("Total Marks", "totalMarks", state.paperConfig.totalMarks, "number")}
        </div>
        <div class="chip-row"><span class="chip active">AI suggestion: Chapter summary</span><span class="chip">Important themes</span><span class="chip">Grammar section</span></div>
        ${subjectManager()}
        <div class="sticky-actions"><button class="secondary-btn" data-go="/dashboard">Cancel</button><button class="primary-btn" data-save-config>Next: Add Question Types</button></div>
      </section>
      ${paperPreview()}
    </div>`,
    { back: "/dashboard" }
  );
}

function questionTypesScreen() {
  const total = Object.values(state.typeConfig).reduce((sum, row) => sum + (row.enabled ? row.count * row.marks : 0), 0);
  return shell(
    "Question Types",
    `
    <section class="card">
      <div class="steps">Step 2/3 <div class="progress" style="flex:1"><div style="width:66%"></div></div></div>
      <p class="muted">Running total: <strong>${total}/${state.paperConfig.totalMarks} marks</strong></p>
      <div class="grid two">${questionTypes.map(typeCard).join("")}</div>
      ${total !== Number(state.paperConfig.totalMarks) ? '<p class="badge" style="display:inline-block;background:#fffbeb;color:#92400e">Marks do not match configured total.</p>' : '<p class="badge" style="display:inline-block;background:#ecfdf5;color:#047857">Marks match configured total.</p>'}
      <div class="sticky-actions">
        <button class="secondary-btn" data-go="/question-bank">Add from Bank</button>
        <button class="secondary-btn" data-go="/upload">Upload File</button>
        <button class="primary-btn" data-generate>Next: Generate Paper</button>
      </div>
    </section>`,
    { back: "/create-paper/config" }
  );
}

function typeCard(type) {
  const row = state.typeConfig[type] || { enabled: false, count: 0, marks: 1 };
  return `<div class="card type-card ${row.enabled ? "enabled" : ""}">
    <div class="counter-row"><strong>${type}</strong><label class="chip ${row.enabled ? "active" : ""}"><input type="checkbox" data-type-toggle="${type}" ${row.enabled ? "checked" : ""}/> ${row.enabled ? "On" : "Off"}</label></div>
    <div class="counter-row"><span class="muted">Questions</span><span><button class="mini-btn" data-type-step="${type}" data-delta="-1">-</button> <strong>${row.count}</strong> <button class="mini-btn" data-type-step="${type}" data-delta="1">+</button></span></div>
    <div class="counter-row"><span class="muted">Marks each</span><input class="search-input" style="width:76px;padding:8px" type="number" data-type-marks="${type}" value="${row.marks}" /></div>
  </div>`;
}

function generating() {
  setTimeout(() => {
    if (state.route === "/create-paper/generating") {
      generateQuestions();
      go("/create-paper/review");
    }
  }, 1800);
  return shell(
    "Generating",
    `<section class="card empty">
      <div>
        <div class="spinner" style="border-color:#c7d2fe;border-top-color:var(--primary)"></div>
        <h2>Generating questions...</h2>
        <p class="muted">Analyzing topic, balancing marks, and preparing the answer key.</p>
        <div class="progress"><div style="width:78%"></div></div>
        <button class="ghost-btn" data-go="/create-paper/question-types">Cancel</button>
      </div>
    </section>`,
    { noNav: true }
  );
}

function generateQuestions() {
  const generated = [];
  Object.entries(state.typeConfig).forEach(([type, config]) => {
    if (!config.enabled) return;
    for (let index = 1; index <= config.count; index += 1) {
      generated.push({
        id: Date.now() + generated.length,
        text: `${type}: Write a ${state.paperConfig.difficulty.toLowerCase()} question on ${state.paperConfig.topic} for Class ${state.paperConfig.className}.`,
        answer: `Expected answer for ${state.paperConfig.topic}.`,
        className: state.paperConfig.className,
        subject: state.paperConfig.subject,
        topic: state.paperConfig.topic,
        type,
        difficulty: state.paperConfig.difficulty,
        language: state.paperConfig.language,
        source: "AI Generated",
        favorite: false,
        marks: config.marks
      });
    }
  });
  state.activeQuestions = generated;
}

function reviewScreen() {
  return shell(
    "Review Paper",
    `
    <div class="desktop-columns">
      <section>
        <div class="section-head"><div class="steps">Step 3/3 <div class="progress" style="width:140px"><div style="width:100%"></div></div></div><button class="primary-btn" data-finalize>Finalize</button></div>
        <div class="question-list">${state.activeQuestions.map(questionCard).join("") || '<div class="empty card">Generate a paper first, then review questions here.</div>'}</div>
        <div class="sticky-actions"><button class="secondary-btn" data-add-question>Add Question Manually</button><button class="primary-btn" data-finalize>Save & Export</button></div>
      </section>
      ${paperPreview(state.activeQuestions)}
    </div>`,
    { back: "/create-paper/question-types" }
  );
}

function questionCard(question) {
  return `<article class="question-card">
    <div class="question-card-head"><span class="badge">${question.type}</span><span class="muted">${question.marks} marks</span></div>
    <p>${question.text}</p>
    <div class="badge-row"><span class="chip">${question.difficulty}</span><span class="chip">${question.source}</span><button class="link-btn" data-edit-question="${question.id}">Edit</button><button class="link-btn" data-delete-question="${question.id}">Delete</button></div>
  </article>`;
}

function paperPreview(questions = state.activeQuestions) {
  const grouped = questionTypes
    .map((type) => [type, questions.filter((q) => q.type === type)])
    .filter(([, items]) => items.length);
  return `<aside class="paper">
    <header>
      <h2>${state.user.school}</h2>
      <p>${state.paperConfig.title}</p>
      <div class="paper-meta">
        <span>Class: ${state.paperConfig.className}</span><span>Subject: ${state.paperConfig.subject}</span>
        <span>Duration: ${state.paperConfig.duration} min</span><span>Marks: ${state.paperConfig.totalMarks}</span>
      </div>
    </header>
    ${grouped.length ? grouped.map(([type, items]) => `<h3>${type}</h3><ol>${items.map((q) => `<li>${q.text} <strong>[${q.marks}]</strong>${state.showAnswers ? `<br><em>Answer: ${q.answer}</em>` : ""}</li>`).join("")}</ol>`).join("") : "<p class='muted'>Your print-ready question paper preview will appear here.</p>"}
  </aside>`;
}

function exportScreen() {
  return shell(
    "Save & Export",
    `
    <div class="desktop-columns">
      ${paperPreview(state.activeQuestions)}
      <section class="card">
        <h2>Export Options</h2>
        <p class="muted">Save a copy in your library, download PDFs, or sync to cloud storage.</p>
        <div class="button-stack">
          <button class="primary-btn" data-export="paper">Download PDF</button>
          <button class="secondary-btn" data-export="answers">Download Answer Key PDF</button>
          <button class="secondary-btn" data-cloud="google">Save to Google Drive ${state.cloud.google ? "(Connected)" : ""}</button>
          <button class="secondary-btn" data-cloud="oneDrive">Save to OneDrive ${state.cloud.oneDrive ? "(Connected)" : ""}</button>
          <button class="ghost-btn" data-share>Copy Share Link</button>
        </div>
        <div class="cloud-panel">
          <strong>Cloud save status</strong>
          <p class="muted">Google Drive: ${state.cloud.google ? "Connected and ready to save" : "Not connected yet"}</p>
          <p class="muted">OneDrive: ${state.cloud.oneDrive ? "Connected and ready to save" : "Not connected yet"}</p>
        </div>
        <div class="field" style="margin-top:16px"><label>Paper Name</label><input value="${state.paperConfig.title}" /></div>
        <label class="chip active"><input type="checkbox" checked /> Save to QP.ai Library</label>
        <div class="sticky-actions"><button class="primary-btn" data-go="/dashboard">Done</button></div>
      </section>
    </div>`,
    { back: "/create-paper/review" }
  );
}

function questionBank() {
  const filtered = state.questions.filter((q) => {
    const query = state.filters.query.toLowerCase();
    return (!query || q.text.toLowerCase().includes(query) || q.topic.toLowerCase().includes(query)) &&
      (!state.filters.className || q.className === state.filters.className) &&
      (!state.filters.subject || q.subject === state.filters.subject) &&
      (!state.filters.type || q.type === state.filters.type) &&
      (!state.filters.difficulty || q.difficulty === state.filters.difficulty) &&
      (!state.filters.favorites || q.favorite);
  });
  return shell(
    "Question Bank",
    `
    <section class="card">
      <input class="search-input" placeholder="Search by topic or question" value="${state.filters.query}" data-filter="query" />
      <div class="chip-row" style="margin-top:12px">
        ${["", ...Array.from({ length: 10 }, (_, i) => String(i + 1))].map((c) => `<button class="chip ${state.filters.className === c ? "active" : ""}" data-filter-chip="className" data-value="${c}">${c || "All Classes"}</button>`).join("")}
      </div>
      <div class="chip-row" style="margin-top:8px">${allSubjects().map((s) => `<button class="chip ${state.filters.subject === s ? "active" : ""}" data-filter-chip="subject" data-value="${s}">${s}</button>`).join("")}</div>
    </section>
    <section class="section question-list">
      ${filtered.length ? filtered.map(questionCard).join("") : '<div class="empty card">No questions match these filters.</div>'}
    </section>
    <div class="sticky-actions"><button class="secondary-btn" data-filter-fav>${state.filters.favorites ? "Show All" : "Favorites"}</button><button class="primary-btn" data-go="/add-question-manual">Add Question</button></div>`
  );
}

function addQuestion() {
  return shell(
    "Add Question",
    `
    <section class="card">
      <div class="form-grid two">
        ${selectField("Class", "className", Array.from({ length: 10 }, (_, i) => String(i + 1)), "7")}
        ${selectField("Subject", "subject", allSubjects(), "English")}
        ${field("Topic / Chapter", "topic", "Poetry")}
        ${selectField("Question Type", "type", questionTypes, "Short Answer")}
        ${selectField("Difficulty", "difficulty", ["Easy", "Medium", "Hard"], "Medium")}
        ${selectField("Language", "language", ["English", "Hindi", "Bilingual"], "English")}
        ${field("Marks", "marks", "3", "number")}
      </div>
      <div class="field"><label>Question Text</label><textarea name="text">Explain the central idea of the poem in your own words.</textarea></div>
      <div class="field"><label>Answer</label><textarea name="answer">A concise explanation of the poem's main message.</textarea></div>
      <label class="chip active"><input type="checkbox" checked /> Add to Bank</label>
      <div class="sticky-actions"><button class="secondary-btn" data-go="/question-bank">Cancel</button><button class="primary-btn" data-save-question>Save</button></div>
    </section>`,
    { back: "/question-bank" }
  );
}

function uploadScreen() {
  const file = state.uploadedFile;
  const fileIcon = file?.type?.startsWith("image/") ? "🖼️" : file?.type === "application/pdf" ? "📄" : "📁";
  return shell(
    "Upload File",
    `
    <section class="card">
      ${!state.apiKey ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:13px;font-weight:700;color:#92400e;margin-bottom:14px">
        ⚠️ No API key set. <button class="link-btn" style="font-size:13px" data-go="/profile">Go to Profile → add your key</button>
      </div>` : ""}
      <div class="upload-zone">
        <div class="icon">📤</div>
        <h2>Drop your question paper here</h2>
        <p class="muted">JPG, PNG or PDF — up to 20 MB</p>
        <input type="file" data-file accept=".jpg,.jpeg,.png,.pdf" />
        ${file ? `
          <div class="file-pill" style="display:flex;align-items:center;gap:12px;margin-top:12px;padding:10px 12px;background:white;border:1px solid var(--line);border-radius:8px;text-align:left">
            <span style="font-size:22px">${fileIcon}</span>
            <div style="flex:1"><strong>${escapeHtml(file.name)}</strong><br><span class="muted">${escapeHtml(file.type || "Unknown")} · ${formatBytes(file.size)}</span></div>
          </div>` : ""}
      </div>
      ${state.uploadLoading ? `
        <div class="progress" style="margin-top:14px"><div id="upload-progress-bar" style="width:${_uploadProgress}%"></div></div>
        <p class="muted" style="text-align:center;font-size:13px;margin-top:8px">Gemini is reading your paper...</p>` : ""}
      <div class="sticky-actions">
        <button class="primary-btn" data-analyze ${state.uploadLoading || !state.apiKey ? "disabled" : ""}>
          ${state.uploadLoading ? "Analyzing…" : "🔍 Analyze Paper"}
        </button>
      </div>
    </section>
    <section class="section question-list">
      ${state.uploadLoading ? skeletonResults() : state.uploadResults.length ? state.uploadResults.map(questionCard).join("") : !file ? `<div class="empty card"><p>Select a question paper image or PDF above, then tap <strong>Analyze Paper</strong>.</p></div>` : ""}
    </section>
    ${state.uploadResults.length ? `
      <div class="sticky-actions">
        <button class="secondary-btn" data-import-upload>Add ${state.uploadResults.length} Questions to Bank</button>
        <button class="primary-btn" data-go="/create-paper/question-types">Add to Paper</button>
      </div>` : ""}`,
    { back: "/dashboard" }
  );
}

function internetSearch() {
  return shell(
    "Search Online",
    `
    <section class="card">
      <div class="form-grid two">
        <input class="search-input" data-online-query value="${state.searchQuery}" placeholder="Class 9 Science Newton's Laws questions" />
        <button class="primary-btn" data-online-search>${state.searchLoading ? "Searching..." : "Search"}</button>
      </div>
      <div class="chip-row" style="margin-top:12px"><span class="chip active">Source attribution</span><span class="chip">Review before using</span><span class="chip">Backend API required for live web</span></div>
    </section>
    <section class="section question-list">${state.searchLoading ? skeletonResults() : state.searchResults.map(searchResultCard).join("") || '<div class="empty card">Enter a topic and tap Search. This prototype creates reviewable internet-style results; live web search should be connected through a Supabase Edge Function so API keys stay private.</div>'}</section>
    ${state.searchResults.length ? '<div class="sticky-actions"><button class="secondary-btn" data-import-search>Add Selected to Bank</button><button class="primary-btn" data-go="/create-paper/question-types">Add to Paper</button></div>' : ""}`,
    { back: "/dashboard" }
  );
}

function skeletonResults() {
  return Array.from({ length: 3 }, () => `<article class="question-card"><div class="skeleton" style="width:42%"></div><div class="skeleton"></div><div class="skeleton" style="width:70%"></div></article>`).join("");
}

function searchResultCard(question) {
  return `<article class="question-card">
    <div class="question-card-head"><span class="badge">${question.type}</span><span class="muted">${question.relevance}% match</span></div>
    <p>${question.text}</p>
    <p class="muted">Suggested answer: ${question.answer}</p>
    <div class="badge-row">
      <span class="chip">Class ${question.className}</span>
      <span class="chip">${question.subject}</span>
      <a class="source-link" href="${question.url}" target="_blank" rel="noreferrer">Source: ${question.sourceName}</a>
    </div>
  </article>`;
}

function savedPapers() {
  const filteredPapers = state.papers.filter((paper) => {
    const query = state.paperFilters.query.toLowerCase();
    return (!query || paper.title.toLowerCase().includes(query) || paper.subject.toLowerCase().includes(query)) &&
      (!state.paperFilters.className || paper.className === state.paperFilters.className) &&
      (!state.paperFilters.subject || paper.subject === state.paperFilters.subject) &&
      (!state.paperFilters.language || (paper.language || "English") === state.paperFilters.language);
  });
  return shell(
    "My Papers",
    `
    <section class="card">
      <input class="search-input" placeholder="Search by paper name or subject" value="${escapeHtml(state.paperFilters.query)}" data-paper-filter="query" />
      <div class="filter-block">
        <strong>Class</strong>
        <div class="chip-row">${["", ...Array.from({ length: 10 }, (_, i) => String(i + 1))].map((c) => `<button class="chip ${state.paperFilters.className === c ? "active" : ""}" data-paper-filter-chip="className" data-value="${c}">${c || "All"}</button>`).join("")}</div>
      </div>
      <div class="filter-block">
        <strong>Subject</strong>
        <div class="chip-row">${["", ...allSubjects()].map((s) => `<button class="chip ${state.paperFilters.subject === s ? "active" : ""}" data-paper-filter-chip="subject" data-value="${s}">${s || "All"}</button>`).join("")}</div>
      </div>
      <div class="filter-block">
        <strong>Language</strong>
        <div class="chip-row">${["", "English", "Hindi", "Bilingual"].map((language) => `<button class="chip ${state.paperFilters.language === language ? "active" : ""}" data-paper-filter-chip="language" data-value="${language}">${language || "All"}</button>`).join("")}</div>
      </div>
      <div class="section-head" style="margin:12px 0 0"><span class="muted">${filteredPapers.length} paper${filteredPapers.length === 1 ? "" : "s"} found</span><button class="link-btn" data-clear-paper-filters>Clear filters</button></div>
    </section>
    <section class="section grid">${filteredPapers.map(paperCard).join("") || '<div class="empty card">No papers match these filters.</div>'}</section>
    <div class="sticky-actions"><button class="primary-btn" data-go="/create-paper/config">New Paper</button></div>`
  );
}

function paperPreviewScreen() {
  const id = state.route.split("/").pop();
  const paper = state.papers.find((p) => p.id === id) || state.papers[0];
  return shell(
    paper?.title || "Paper Preview",
    `
    <div class="desktop-columns">
      ${paperPreview(state.activeQuestions.length ? state.activeQuestions : state.questions.slice(0, 6))}
      <section class="card">
        <h2>${paper?.title || "Preview"}</h2>
        <p class="muted">Class ${paper?.className || state.paperConfig.className} &middot; ${paper?.subject || state.paperConfig.subject}</p>
        <div class="button-stack">
          <button class="primary-btn" data-export="paper">Export PDF</button>
          <button class="secondary-btn" data-go="/paper-export/current">Save / Cloud Options</button>
          <button class="secondary-btn" data-cloud="google">Save to Google Drive ${state.cloud.google ? "(Connected)" : ""}</button>
          <button class="secondary-btn" data-cloud="oneDrive">Save to OneDrive ${state.cloud.oneDrive ? "(Connected)" : ""}</button>
          <button class="secondary-btn" data-toggle-answers>${state.showAnswers ? "Hide" : "Show"} Answer Key</button>
          <button class="secondary-btn" data-go="/create-paper/review">Edit Paper</button>
          <button class="ghost-btn" data-share>Share</button>
        </div>
      </section>
    </div>`,
    { back: "/saved-papers" }
  );
}

function apiSettings() {
  return shell(
    "AI Setup",
    `
    <section class="card">
      <div class="api-card">
        <div class="api-card-head">
          <div class="status-icon">${icon("key")}</div>
          <div>
            <h2 style="margin:0">Install API Key</h2>
            <p class="muted">${state.apiKey ? "Your Gemini key is saved on this device." : "Add your Gemini API key to enable Upload & Analyze."}</p>
          </div>
        </div>
        <div class="field">
          <label>Gemini API Key</label>
          <div class="secret-row">
            <input name="apiKey" type="${state.apiKeyVisible ? "text" : "password"}" value="${escapeHtml(state.apiKey)}" placeholder="AIza..." autocomplete="off" />
            <button class="secondary-btn" data-toggle-api-visibility>${state.apiKeyVisible ? "Hide" : "Show"}</button>
          </div>
          <p class="muted" style="font-size:12px;margin:6px 0 0">The key is stored only in this browser. For sharing the app publicly, move API calls to a backend first.</p>
        </div>
        <div class="api-actions">
          <a class="secondary-btn" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Get Key</a>
          <button class="danger-lite-btn" data-clear-api-key ${state.apiKey ? "" : "disabled"}>Remove Key</button>
        </div>
      </div>
      <div class="sticky-actions">
        <button class="secondary-btn" data-go="/profile">Profile</button>
        <button class="primary-btn" data-save-api-key>Save Key</button>
      </div>
    </section>`,
    { back: "/dashboard" }
  );
}

function profile() {
  return shell(
    "Profile & Settings",
    `
    <section class="card">
      <div class="brand-row"><div class="avatar">${state.user.name.slice(0, 1)}</div><div><h2 style="margin:0">${state.user.name}</h2><p class="muted">${state.user.designation} &middot; ${state.user.school}</p></div></div>
      <div class="form-grid two">
        ${field("Full Name", "profileName", state.user.name)}
        ${field("School Name", "profileSchool", state.user.school)}
        ${selectField("Designation", "profileDesignation", ["Teacher", "Tutor", "Principal", "Other"], state.user.designation)}
        ${selectField("UI Language", "profileLang", ["English", "Hindi"], state.lang)}
      </div>
      <div class="field" style="margin-top:4px">
        <label>Gemini API Key</label>
        <input name="apiKey" type="password" value="${state.apiKey}" placeholder="AIza..." />
        <p class="muted" style="font-size:12px;margin-top:5px">Stored only on your device. Get a key at <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--primary)">Google AI Studio</a></p>
      </div>
      ${state.apiKey ? `<p style="font-size:12px;color:var(--success);font-weight:700;margin-top:-6px">✅ API key saved — Upload & Analyze is active.</p>` : `<p style="font-size:12px;color:var(--accent);font-weight:700;margin-top:-6px">⚠️ No API key yet — Upload & Analyze won't work until you add one.</p>`}
      <div class="grid two">
        <button class="secondary-btn" data-go="/api-settings">${state.apiKey ? "API Key Connected" : "Install API Key"}</button>
        <button class="secondary-btn" data-toggle-dark>${state.dark ? "Light Mode" : "Dark Mode"}</button>
        <button class="secondary-btn" data-notify>Notifications On</button>
        <button class="secondary-btn" data-cloud="google">${state.cloud.google ? "Google Drive Connected" : "Connect Google Drive"}</button>
        <button class="secondary-btn" data-cloud="oneDrive">${state.cloud.oneDrive ? "OneDrive Connected" : "Connect OneDrive"}</button>
      </div>
      ${subjectManager()}
      <div class="sticky-actions"><button class="danger-btn" data-logout>Logout</button><button class="primary-btn" data-save-profile>Save Profile</button></div>
    </section>`
  );
}

function notifications() {
  return shell("Notifications", `<section class="grid">
    <article class="card"><strong>Paper generated</strong><p class="muted">Your Class 7 English paper is ready.</p></article>
    <article class="card"><strong>Upload complete</strong><p class="muted">15 questions were extracted from the PDF.</p></article>
    <article class="card"><strong>Cloud save success</strong><p class="muted">Saved to Google Drive.</p></article>
  </section>`, { back: "/profile" });
}

function offlineScreen() {
  return shell("Offline", `<section class="card empty"><div><h2>You are offline</h2><p class="muted">Some features require internet. Saved papers and question bank are still available.</p><div class="button-stack"><button class="primary-btn" data-go="/saved-papers">View Saved Papers</button><button class="secondary-btn" data-go="/question-bank">View Question Bank</button></div></div></section>`);
}

function render() {
  document.documentElement.classList.toggle("dark", state.dark);
  if (!state.isAuthed && !isPublicRoute(state.route)) {
    state.route = "/login";
    history.replaceState(null, "", "#/login");
  }
  const routes = {
    "/splash": splash,
    "/login": () => auth("login"),
    "/signup": () => auth("signup"),
    "/forgot-password": () => auth("forgot"),
    "/onboarding": onboarding,
    "/dashboard": dashboard,
    "/create-paper/config": createConfig,
    "/create-paper/question-types": questionTypesScreen,
    "/create-paper/generating": generating,
    "/create-paper/review": reviewScreen,
    "/paper-export/p1": exportScreen,
    "/paper-export/current": exportScreen,
    "/question-bank": questionBank,
    "/add-question-manual": addQuestion,
    "/upload": uploadScreen,
    "/internet-search": internetSearch,
    "/saved-papers": savedPapers,
    "/api-settings": apiSettings,
    "/profile": profile,
    "/notifications": notifications,
    "/offline": offlineScreen
  };
  const routeFn = routes[state.route] || (state.route.startsWith("/paper-preview/") ? paperPreviewScreen : exportScreen);
  $("#app").innerHTML = routeFn();
  wireEvents();
  persist();
}

function wireEvents() {
  document.querySelectorAll("[data-go]").forEach((el) => el.addEventListener("click", () => go(el.dataset.go)));
  document.querySelectorAll("[data-add-subject]").forEach((button) =>
    button.addEventListener("click", () => {
      const input = button.closest(".subject-manager")?.querySelector("[data-new-subject]");
      const subject = input?.value.trim().replace(/\s+/g, " ");
      if (!subject) {
        notify("Type a subject name first.");
        return;
      }
      if (allSubjects().some((item) => item.toLowerCase() === subject.toLowerCase())) {
        notify(`${subject} is already in your subject list.`);
        return;
      }
      state.customSubjects.push(subject);
      state.selectedSubjects = [...new Set([...state.selectedSubjects, subject])];
      notify(`${subject} added to subjects.`);
      render();
    })
  );
  document.querySelectorAll("[data-remove-subject]").forEach((button) =>
    button.addEventListener("click", () => {
      const subject = decodeURIComponent(button.dataset.removeSubject);
      state.customSubjects = state.customSubjects.filter((item) => item !== subject);
      state.selectedSubjects = state.selectedSubjects.filter((item) => item !== subject);
      if (state.filters.subject === subject) state.filters.subject = "";
      notify(`${subject} removed from custom subjects.`);
      render();
    })
  );
  document.querySelectorAll("[data-auth]").forEach((el) =>
    el.addEventListener("click", () => {
      if (el.dataset.auth === "forgot") return notify("Password reset link sent.");
      state.isAuthed = true;
      localStorage.setItem("qp-auth", "true");
      go(el.dataset.auth === "signup" ? "/onboarding" : "/dashboard");
    })
  );
  document.querySelectorAll("[data-pick]").forEach((el) =>
    el.addEventListener("click", () => {
      const key = el.dataset.pick;
      const value = el.dataset.value;
      if (Array.isArray(state[key])) {
        state[key] = state[key].includes(value) ? state[key].filter((item) => item !== value) : [...state[key], value];
      } else {
        state[key] = value;
      }
      render();
    })
  );
  document.querySelectorAll("[data-onboard]").forEach((el) =>
    el.addEventListener("click", () => {
      if (el.dataset.onboard === "back") state.onboardingStep = Math.max(0, state.onboardingStep - 1);
      if (el.dataset.onboard === "next") {
        if (state.onboardingStep === 2) go("/dashboard");
        else state.onboardingStep += 1;
      }
      render();
    })
  );
  const saveConfig = $("[data-save-config]");
  if (saveConfig) {
    saveConfig.addEventListener("click", () => {
      document.querySelectorAll("input, select").forEach((input) => {
        if (input.name && input.name in state.paperConfig) state.paperConfig[input.name] = input.value;
      });
      go("/create-paper/question-types");
    });
  }
  document.querySelectorAll("[data-type-toggle]").forEach((input) =>
    input.addEventListener("change", () => {
      const type = input.dataset.typeToggle;
      state.typeConfig[type] = state.typeConfig[type] || { enabled: false, count: 1, marks: 1 };
      state.typeConfig[type].enabled = input.checked;
      if (input.checked && state.typeConfig[type].count === 0) state.typeConfig[type].count = 1;
      render();
    })
  );
  document.querySelectorAll("[data-type-step]").forEach((button) =>
    button.addEventListener("click", () => {
      const row = state.typeConfig[button.dataset.typeStep];
      row.count = Math.max(0, row.count + Number(button.dataset.delta));
      render();
    })
  );
  document.querySelectorAll("[data-type-marks]").forEach((input) =>
    input.addEventListener("change", () => {
      state.typeConfig[input.dataset.typeMarks].marks = Number(input.value);
      render();
    })
  );
  const generate = $("[data-generate]");
  if (generate) generate.addEventListener("click", () => go("/create-paper/generating"));
  document.querySelectorAll("[data-delete-question]").forEach((button) =>
    button.addEventListener("click", () => {
      const id = Number(button.dataset.deleteQuestion);
      const question = [...state.activeQuestions, ...state.questions].find((q) => q.id === id);
      if (!confirmDelete(`Delete this question${question ? `: "${question.text.slice(0, 48)}..."` : ""}?`)) return;
      state.activeQuestions = state.activeQuestions.filter((q) => q.id !== id);
      state.questions = state.questions.filter((q) => q.id !== id);
      notify("Question deleted.");
    })
  );
  document.querySelectorAll("[data-delete-paper]").forEach((button) =>
    button.addEventListener("click", () => {
      const id = button.dataset.deletePaper;
      const paper = state.papers.find((item) => item.id === id);
      if (!confirmDelete(`Delete paper "${paper?.title || "this paper"}"?`)) return;
      state.papers = state.papers.filter((item) => item.id !== id);
      notify("Paper deleted.");
      render();
    })
  );
  document.querySelectorAll("[data-edit-question]").forEach((button) =>
    button.addEventListener("click", () => {
      const id = Number(button.dataset.editQuestion);
      const q = [...state.activeQuestions, ...state.questions].find((item) => item.id === id);
      if (q) q.text = prompt("Edit question", q.text) || q.text;
      render();
    })
  );
  const addQuestionButton = $("[data-add-question]");
  if (addQuestionButton) addQuestionButton.addEventListener("click", () => go("/add-question-manual"));
  const finalize = document.querySelectorAll("[data-finalize]");
  finalize.forEach((button) =>
    button.addEventListener("click", () => {
      savePaper();
      go("/paper-export/current");
    })
  );
  const saveQuestion = $("[data-save-question]");
  if (saveQuestion) {
    saveQuestion.addEventListener("click", () => {
      const data = Object.fromEntries([...document.querySelectorAll("[name]")].map((input) => [input.name, input.value]));
      state.questions.unshift({ id: Date.now(), favorite: false, source: "Manual", ...data, marks: Number(data.marks) });
      notify("Question saved to bank.");
      go("/question-bank");
    });
  }
  document.querySelectorAll("[data-filter]").forEach((input) =>
    input.addEventListener("input", () => {
      state.filters[input.dataset.filter] = input.value;
      render();
    })
  );
  document.querySelectorAll("[data-filter-chip]").forEach((button) =>
    button.addEventListener("click", () => {
      const key = button.dataset.filterChip;
      state.filters[key] = state.filters[key] === button.dataset.value ? "" : button.dataset.value;
      render();
    })
  );
  const fav = $("[data-filter-fav]");
  if (fav) fav.addEventListener("click", () => { state.filters.favorites = !state.filters.favorites; render(); });
  document.querySelectorAll("[data-paper-filter]").forEach((input) =>
    input.addEventListener("input", () => {
      state.paperFilters[input.dataset.paperFilter] = input.value;
      render();
    })
  );
  document.querySelectorAll("[data-paper-filter-chip]").forEach((button) =>
    button.addEventListener("click", () => {
      const key = button.dataset.paperFilterChip;
      state.paperFilters[key] = state.paperFilters[key] === button.dataset.value ? "" : button.dataset.value;
      render();
    })
  );
  const clearPaperFilters = $("[data-clear-paper-filters]");
  if (clearPaperFilters) {
    clearPaperFilters.addEventListener("click", () => {
      state.paperFilters = { query: "", className: "", subject: "", language: "" };
      render();
    });
  }
  // Store file blob when user picks a file
  const fileInput = $("[data-file]");
  if (fileInput) {
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      const allowed = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
      if (!allowed.includes(file.type)) { notify("Only JPG, PNG, or PDF files are supported."); return; }
      if (file.size > 20 * 1024 * 1024) { notify("File too large. Maximum is 20 MB."); return; }
      _uploadedFileBlob = file;
      state.uploadedFile = { name: file.name, type: file.type, size: file.size };
      state.uploadResults = [];
      _uploadProgress = 0;
      render();
    });
  }

  // Analyze with Gemini multimodal API
  const analyze = $("[data-analyze]");
  if (analyze) {
    analyze.addEventListener("click", async () => {
      if (!state.apiKey) { notify("Add your Gemini API key first."); go("/api-settings"); return; }
      if (!_uploadedFileBlob) { notify("Select a file first."); return; }

      state.uploadLoading = true;
      state.uploadResults = [];
      _uploadProgress = 15;
      render();

      // Animate progress bar smoothly without full re-renders
      const ticker = setInterval(() => {
        if (_uploadProgress < 85) {
          _uploadProgress = Math.min(85, _uploadProgress + Math.random() * 7);
          const bar = document.getElementById("upload-progress-bar");
          if (bar) bar.style.width = _uploadProgress + "%";
        }
      }, 600);

      try {
        const base64 = await readFileAsBase64(_uploadedFileBlob);
        const mediaType = _uploadedFileBlob.type || "image/jpeg";

        const fileContent = mediaType.startsWith("image/")
          ? { type: "image", data: base64, mime_type: mediaType }
          : { type: "document", data: base64, mime_type: "application/pdf" };

        const prompt = `You are an expert teacher assistant analyzing a scanned or photographed exam question paper.

Extract EVERY question visible in this paper. Return ONLY a valid JSON array — no markdown, no explanation, no preamble.

Each object must have:
- "text": full question text exactly as written (string)
- "answer": concise model answer (string)
- "type": one of ["MCQ","Short Answer","Long Answer","Fill in the Blanks","True/False","Match the Following","One-Word Answer"]
- "difficulty": one of ["Easy","Medium","Hard"]
- "marks": integer (read from paper if shown; otherwise estimate: MCQ=1, Short Answer=2-3, Long Answer=4-6)
- "topic": the topic or chapter this question relates to (string)

Rules:
- Include ALL questions including sub-parts (a), (b), (c)
- For MCQs include the options inside the "text" field
- Do not skip any question even if partially legible
- If no questions found, return []`;

        const response = await callGeminiInteractions({
          model: "gemini-3.5-flash",
          input: [fileContent, { type: "text", text: prompt }],
          generation_config: {
            temperature: 0.2
          }
        });

        clearInterval(ticker);
        _uploadProgress = 95;

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.error?.message || `API error ${response.status}`);
        }

        const data = await response.json();
        const rawText = data.output_text || data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "[]";
        const clean = rawText.replace(/```json\n?|```/g, "").trim();
        const extracted = JSON.parse(clean);

        if (!Array.isArray(extracted) || extracted.length === 0) {
          notify("No questions detected. Try a clearer image.");
          state.uploadLoading = false;
          _uploadProgress = 0;
          render();
          return;
        }

        state.uploadResults = extracted.map((q, i) => ({
          id: Date.now() + i,
          text: q.text || "Question text not detected",
          answer: q.answer || "",
          type: q.type || "Short Answer",
          difficulty: q.difficulty || "Medium",
          marks: Number(q.marks) || 1,
          topic: q.topic || state.paperConfig.topic,
          className: state.paperConfig.className,
          subject: state.paperConfig.subject,
          language: state.paperConfig.language || "English",
          source: "Uploaded File",
          favorite: false
        }));

        _uploadProgress = 100;
        notify(`✅ ${state.uploadResults.length} question${state.uploadResults.length !== 1 ? "s" : ""} extracted from your paper.`);

      } catch (err) {
        clearInterval(ticker);
        console.error("Analyze error:", err);
        const message = err?.message === "Failed to fetch"
          ? "Network failed. Start the app with node server.js, then upload again."
          : err.message || "Please try a clearer image.";
        notify("Analysis failed: " + message);
      }

      state.uploadLoading = false;
      _uploadProgress = 0;
      render();
    });
  }
  const importUpload = $("[data-import-upload]");
  if (importUpload) importUpload.addEventListener("click", () => { state.questions.unshift(...state.uploadResults); notify("Questions added to bank."); go("/question-bank"); });
  const onlineSearch = $("[data-online-search]");
  if (onlineSearch) {
    onlineSearch.addEventListener("click", () => {
      if (!state.online) {
        notify("Internet search needs a connection.");
        return;
      }
      const queryInput = $("[data-online-query]");
      state.searchQuery = queryInput?.value.trim() || "Class 9 Science sample questions";
      state.searchLoading = true;
      render();
      setTimeout(() => {
        state.searchResults = buildSearchResults(state.searchQuery);
        state.searchLoading = false;
        notify(`${state.searchResults.length} internet-style results loaded with sources.`);
        render();
      }, 700);
    });
  }
  const onlineQuery = $("[data-online-query]");
  if (onlineQuery) {
    onlineQuery.addEventListener("input", () => {
      state.searchQuery = onlineQuery.value;
    });
    onlineQuery.addEventListener("keydown", (event) => {
      if (event.key === "Enter") onlineSearch?.click();
    });
  }
  const importSearch = $("[data-import-search]");
  if (importSearch) {
    importSearch.addEventListener("click", () => {
      state.questions.unshift(...state.searchResults.map((result) => ({ ...result, source: "Internet Source" })));
      notify("Internet questions added.");
      go("/question-bank");
    });
  }
  document.querySelectorAll("[data-export]").forEach((button) => button.addEventListener("click", () => window.print()));
  document.querySelectorAll("[data-cloud]").forEach((button) =>
    button.addEventListener("click", () => {
      const provider = button.dataset.cloud;
      state.cloud[provider] = true;
      const label = provider === "google" ? "Google Drive" : "OneDrive";
      if (state.route.startsWith("/paper-export") || state.route.startsWith("/paper-preview")) {
        const latest = state.papers[0];
        if (latest) latest.synced = label;
        notify(`Saved to ${label}.`);
      } else {
        notify(`${label} connected.`);
      }
      render();
    })
  );
  const share = $("[data-share]");
  if (share) share.addEventListener("click", () => { navigator.clipboard?.writeText(location.href); notify("Share link copied."); });
  const toggleAnswers = $("[data-toggle-answers]");
  if (toggleAnswers) toggleAnswers.addEventListener("click", () => { state.showAnswers = !state.showAnswers; render(); });
  const toggleDark = $("[data-toggle-dark]");
  if (toggleDark) toggleDark.addEventListener("click", () => { state.dark = !state.dark; render(); });
  const toggleApiVisibility = $("[data-toggle-api-visibility]");
  if (toggleApiVisibility) {
    toggleApiVisibility.addEventListener("click", () => {
      state.apiKeyVisible = !state.apiKeyVisible;
      render();
    });
  }
  const saveApiKey = $("[data-save-api-key]");
  if (saveApiKey) {
    saveApiKey.addEventListener("click", () => {
      state.apiKey = $('[name="apiKey"]')?.value.trim() || "";
      persist();
      notify(state.apiKey ? "API key saved." : "API key field is empty.");
      render();
    });
  }
  const clearApiKey = $("[data-clear-api-key]");
  if (clearApiKey) {
    clearApiKey.addEventListener("click", () => {
      state.apiKey = "";
      localStorage.removeItem("qp-gemini-api-key");
      notify("API key removed.");
      render();
    });
  }
  const logout = $("[data-logout]");
  if (logout) logout.addEventListener("click", () => { state.isAuthed = false; localStorage.removeItem("qp-auth"); go("/login"); });
  const saveProfile = $("[data-save-profile]");
  if (saveProfile) {
    saveProfile.addEventListener("click", () => {
      state.user.name = $('[name="profileName"]').value;
      state.user.school = $('[name="profileSchool"]').value;
      state.user.designation = $('[name="profileDesignation"]').value;
      state.lang = $('[name="profileLang"]').value;
      const keyInput = $('[name="apiKey"]')?.value.trim();
      if (keyInput) {
        state.apiKey = keyInput;
        localStorage.setItem("qp-gemini-api-key", keyInput);
      }
      notify("Profile saved.");
      render();
    });
  }
}

function savePaper() {
  const paper = {
    id: `p${Date.now()}`,
    title: state.paperConfig.title,
    className: state.paperConfig.className,
    subject: state.paperConfig.subject,
    language: state.paperConfig.language,
    date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    count: state.activeQuestions.length,
    marks: state.activeQuestions.reduce((sum, q) => sum + Number(q.marks || 0), 0),
    synced: "Local"
  };
  state.papers = [paper, ...state.papers.filter((p) => p.title !== paper.title)];
}

function buildSearchResults(query) {
  const normalized = query.toLowerCase();
  const inferredClass = normalized.match(/class\s*(\d+)/)?.[1] || state.paperConfig.className;
  const inferredSubject = allSubjects().find((subject) => normalized.includes(subject.toLowerCase())) || state.paperConfig.subject;
  const topic = query.replace(/class\s*\d+/i, "").replace(new RegExp(escapeRegExp(inferredSubject), "i"), "").trim() || state.paperConfig.topic;
  const sourceBase = encodeURIComponent(query);
  return [
    {
      id: Date.now() + 1,
      text: `Explain the key concept of ${topic} in two or three sentences.`,
      answer: `A clear answer should define ${topic}, include one example, and use age-appropriate wording.`,
      className: inferredClass,
      subject: inferredSubject,
      topic,
      type: "Short Answer",
      difficulty: "Medium",
      language: "English",
      marks: 3,
      source: "Internet Source",
      sourceName: "NCERT-aligned search",
      url: `https://www.google.com/search?q=${sourceBase}+NCERT+questions`,
      relevance: 94
    },
    {
      id: Date.now() + 2,
      text: `Choose the correct option related to ${topic}.`,
      answer: "The correct option depends on the final teacher-reviewed choices.",
      className: inferredClass,
      subject: inferredSubject,
      topic,
      type: "MCQ",
      difficulty: "Easy",
      language: "English",
      marks: 1,
      source: "Internet Source",
      sourceName: "Teacher resource search",
      url: `https://www.google.com/search?q=${sourceBase}+worksheet+mcq`,
      relevance: 89
    },
    {
      id: Date.now() + 3,
      text: `Write a long answer question that connects ${topic} with a real classroom example.`,
      answer: `The answer should describe the concept, explain its importance, and provide a relevant example.`,
      className: inferredClass,
      subject: inferredSubject,
      topic,
      type: "Long Answer",
      difficulty: "Hard",
      language: "English",
      marks: 5,
      source: "Internet Source",
      sourceName: "Exam preparation search",
      url: `https://www.google.com/search?q=${sourceBase}+exam+questions`,
      relevance: 83
    }
  ];
}

window.addEventListener("online", () => { state.online = true; render(); });
window.addEventListener("offline", () => { state.online = false; render(); });
window.addEventListener("hashchange", () => { state.route = location.hash.replace("#", "") || "/dashboard"; render(); });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

render();
