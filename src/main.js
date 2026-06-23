const $ = (selector) => document.querySelector(selector);

const subjects = ["English", "Hindi", "Mathematics", "Science", "Social Studies"];
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
  lang: localStorage.getItem("qp-lang") || "English",
  dark: localStorage.getItem("qp-dark") === "true",
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
    { id: "p1", title: "Class 7 English Unit Test", className: "7", subject: "English", date: "23 Jun 2026", count: 18, marks: 40, synced: "Local" },
    { id: "p2", title: "Science Worksheet - Water", className: "6", subject: "Science", date: "20 Jun 2026", count: 12, marks: 30, synced: "Drive" }
  ],
  activeQuestions: [],
  showAnswers: false,
  filters: { query: "", className: "", subject: "", type: "", difficulty: "", favorites: false },
  uploadResults: [],
  searchResults: []
};

function persist() {
  localStorage.setItem("qp-user", JSON.stringify(state.user));
  localStorage.setItem("qp-bank", JSON.stringify(state.questions));
  localStorage.setItem("qp-papers", JSON.stringify(state.papers));
  localStorage.setItem("qp-dark", String(state.dark));
  localStorage.setItem("qp-lang", state.lang);
}

function go(route) {
  state.route = route;
  history.replaceState(null, "", `#${route}`);
  render();
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
    home: "H",
    papers: "P",
    create: "+",
    bank: "B",
    profile: "U",
    upload: "^",
    search: "?",
    file: "[]",
    cloud: "CL",
    back: "<",
    star: "*"
  };
  return icons[name] || ".";
}

function shell(title, content, options = {}) {
  const back = options.back ? `<button class="ghost-btn" data-go="${options.back}">${icon("back")}</button>` : "";
  const noNav = options.noNav ? "" : bottomNav();
  return `
    <main class="app ${state.dark ? "dark" : ""}">
      ${!state.online ? '<div class="offline-banner">You are offline. Saved papers and question bank remain available.</div>' : ""}
      <div class="topbar">
        <div class="brand-row" style="margin:0">${back}<div class="logo-mark" style="width:40px;height:40px;border-radius:12px">QP</div><h1>${title}</h1></div>
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
  return `<div class="field"><label>${label}</label><select name="${name}">${options.map((option) => `<option ${option === selected ? "selected" : ""}>${option}</option>`).join("")}</select></div>`;
}

function onboarding() {
  const steps = [
    { title: "Preferred Classes", key: "selectedClasses", items: Array.from({ length: 10 }, (_, i) => String(i + 1)) },
    { title: "Preferred Subjects", key: "selectedSubjects", items: subjects },
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
  return shell(
    "QP.ai",
    `
    <div class="hero-panel">
      <h2>Hello, ${state.user.name}! </h2>
      <p>Create curriculum-aligned papers, reuse your question bank, and export polished PDFs.</p>
      <button class="primary-btn" style="background:white;color:var(--primary)" data-go="/create-paper/config">Create New Paper</button>
    </div>
    <div class="stats">
      <div class="stat-card"><span class="stat-value">${state.papers.length}</span><span class="stat-label">Papers Created</span></div>
      <div class="stat-card"><span class="stat-value">${state.questions.length}</span><span class="stat-label">Questions in Bank</span></div>
      <div class="stat-card"><span class="stat-value">${new Set(state.questions.map((q) => q.subject)).size}</span><span class="stat-label">Subjects Active</span></div>
    </div>
    <section class="section">
      <div class="section-head"><h2 class="section-title">Quick Actions</h2></div>
      <div class="grid two">
        <button class="card quick-action" data-go="/upload"><span class="icon">${icon("upload")}</span><strong>Upload File</strong><span class="muted">PDF, DOCX, JPG, PNG</span></button>
        <button class="card quick-action" data-go="/internet-search"><span class="icon">${icon("search")}</span><strong>Search Internet</strong><span class="muted">Import with sources</span></button>
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
  return `<button class="paper-card" data-go="/paper-preview/${paper.id}">
    <strong>${paper.title}</strong>
    <p class="muted">Class ${paper.className} &middot; ${paper.subject} &middot; ${paper.date}</p>
    <div class="badge-row"><span class="badge">${paper.count} questions</span><span class="badge">${paper.marks} marks</span><span class="badge">${paper.synced}</span></div>
  </button>`;
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
          ${selectField("Subject", "subject", subjects, state.paperConfig.subject)}
          ${field("Chapter / Topic", "topic", state.paperConfig.topic)}
          ${selectField("Language", "language", ["English", "Hindi", "Bilingual"], state.paperConfig.language)}
          ${selectField("Difficulty", "difficulty", ["Easy", "Medium", "Hard", "Mixed"], state.paperConfig.difficulty)}
          ${field("Duration (minutes)", "duration", state.paperConfig.duration, "number")}
          ${field("Total Marks", "totalMarks", state.paperConfig.totalMarks, "number")}
        </div>
        <div class="chip-row"><span class="chip active">AI suggestion: Chapter summary</span><span class="chip">Important themes</span><span class="chip">Grammar section</span></div>
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
          <button class="secondary-btn" data-cloud="Google Drive">Save to Google Drive</button>
          <button class="secondary-btn" data-cloud="OneDrive">Save to OneDrive</button>
          <button class="ghost-btn" data-share>Copy Share Link</button>
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
      <div class="chip-row" style="margin-top:8px">${subjects.map((s) => `<button class="chip ${state.filters.subject === s ? "active" : ""}" data-filter-chip="subject" data-value="${s}">${s}</button>`).join("")}</div>
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
        ${selectField("Subject", "subject", subjects, "English")}
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
  return shell(
    "Upload File",
    `
    <section class="card">
      <div class="upload-zone">
        <div class="icon">${icon("upload")}</div>
        <h2>Upload study material</h2>
        <p class="muted">JPG, PNG, PDF, DOCX up to 20MB.</p>
        <input type="file" data-file accept=".jpg,.jpeg,.png,.pdf,.docx" />
      </div>
      <div class="sticky-actions"><button class="primary-btn" data-analyze>Analyze File</button></div>
    </section>
    <section class="section question-list">${state.uploadResults.map(questionCard).join("")}</section>
    ${state.uploadResults.length ? '<div class="sticky-actions"><button class="secondary-btn" data-import-upload> Add Selected to Question Bank</button><button class="primary-btn" data-go="/create-paper/question-types">Add to Current Paper</button></div>' : ""}`,
    { back: "/dashboard" }
  );
}

function internetSearch() {
  return shell(
    "Search Online",
    `
    <section class="card">
      <div class="form-grid two">
        <input class="search-input" data-online-query placeholder="Class 9 Science Newton's Laws questions" />
        <button class="primary-btn" data-online-search>Search</button>
      </div>
      <div class="chip-row" style="margin-top:12px"><span class="chip active">Class filter</span><span class="chip">Subject filter</span><span class="chip">Review before using</span></div>
    </section>
    <section class="section question-list">${state.searchResults.map(questionCard).join("") || '<div class="empty card">Search results with source attribution will appear here.</div>'}</section>
    ${state.searchResults.length ? '<div class="sticky-actions"><button class="secondary-btn" data-import-search>Add Selected to Bank</button><button class="primary-btn" data-go="/create-paper/question-types">Add to Paper</button></div>' : ""}`,
    { back: "/dashboard" }
  );
}

function savedPapers() {
  return shell(
    "My Papers",
    `
    <section class="card"><input class="search-input" placeholder="Search saved papers" /><div class="chip-row" style="margin-top:12px"><span class="chip active">Newest</span><span class="chip">Class</span><span class="chip">Subject</span><span class="chip">Language</span></div></section>
    <section class="section grid">${state.papers.map(paperCard).join("") || '<div class="empty card">Create your first paper.</div>'}</section>
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
          <button class="secondary-btn" data-toggle-answers>${state.showAnswers ? "Hide" : "Show"} Answer Key</button>
          <button class="secondary-btn" data-go="/create-paper/review">Edit Paper</button>
          <button class="ghost-btn" data-share>Share</button>
        </div>
      </section>
    </div>`,
    { back: "/saved-papers" }
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
      <div class="grid two">
        <button class="secondary-btn" data-toggle-dark>${state.dark ? "Light Mode" : "Dark Mode"}</button>
        <button class="secondary-btn" data-notify>Notifications On</button>
        <button class="secondary-btn" data-cloud="Google Drive">Connect Google Drive</button>
        <button class="secondary-btn" data-cloud="OneDrive">Connect OneDrive</button>
      </div>
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
      state.activeQuestions = state.activeQuestions.filter((q) => q.id !== id);
      state.questions = state.questions.filter((q) => q.id !== id);
      notify("Question deleted.");
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
  const analyze = $("[data-analyze]");
  if (analyze) {
    analyze.addEventListener("click", () => {
      state.uploadResults = sampleQuestions.slice(0, 3).map((q, i) => ({ ...q, id: Date.now() + i, source: "Uploaded File" }));
      notify("File analyzed. 3 questions detected.");
      render();
    });
  }
  const importUpload = $("[data-import-upload]");
  if (importUpload) importUpload.addEventListener("click", () => { state.questions.unshift(...state.uploadResults); notify("Questions added to bank."); go("/question-bank"); });
  const onlineSearch = $("[data-online-search]");
  if (onlineSearch) {
    onlineSearch.addEventListener("click", () => {
      state.searchResults = sampleQuestions.slice(1).map((q, i) => ({ ...q, id: Date.now() + i, source: "Internet Source" }));
      notify("Online results loaded with source labels.");
      render();
    });
  }
  const importSearch = $("[data-import-search]");
  if (importSearch) importSearch.addEventListener("click", () => { state.questions.unshift(...state.searchResults); notify("Internet questions added."); go("/question-bank"); });
  document.querySelectorAll("[data-export]").forEach((button) => button.addEventListener("click", () => window.print()));
  document.querySelectorAll("[data-cloud]").forEach((button) => button.addEventListener("click", () => notify(`Connected to ${button.dataset.cloud}.`)));
  const share = $("[data-share]");
  if (share) share.addEventListener("click", () => { navigator.clipboard?.writeText(location.href); notify("Share link copied."); });
  const toggleAnswers = $("[data-toggle-answers]");
  if (toggleAnswers) toggleAnswers.addEventListener("click", () => { state.showAnswers = !state.showAnswers; render(); });
  const toggleDark = $("[data-toggle-dark]");
  if (toggleDark) toggleDark.addEventListener("click", () => { state.dark = !state.dark; render(); });
  const logout = $("[data-logout]");
  if (logout) logout.addEventListener("click", () => { state.isAuthed = false; localStorage.removeItem("qp-auth"); go("/login"); });
  const saveProfile = $("[data-save-profile]");
  if (saveProfile) {
    saveProfile.addEventListener("click", () => {
      state.user.name = $('[name="profileName"]').value;
      state.user.school = $('[name="profileSchool"]').value;
      state.user.designation = $('[name="profileDesignation"]').value;
      state.lang = $('[name="profileLang"]').value;
      notify("Profile saved.");
    });
  }
}

function savePaper() {
  const paper = {
    id: `p${Date.now()}`,
    title: state.paperConfig.title,
    className: state.paperConfig.className,
    subject: state.paperConfig.subject,
    date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    count: state.activeQuestions.length,
    marks: state.activeQuestions.reduce((sum, q) => sum + Number(q.marks || 0), 0),
    synced: "Local"
  };
  state.papers = [paper, ...state.papers.filter((p) => p.title !== paper.title)];
}

window.addEventListener("online", () => { state.online = true; render(); });
window.addEventListener("offline", () => { state.online = false; render(); });
window.addEventListener("hashchange", () => { state.route = location.hash.replace("#", "") || "/dashboard"; render(); });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

render();
