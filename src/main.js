// CEH v13 Exam Prep — Main Application
import './style.css';
import { icon } from './icons.js';

// ==============================
// Data Loading
// ==============================
let modulesData = null;
let questionsData = null;

async function loadData() {
  if (!modulesData) {
    const mod = await import('./data/modules.json');
    modulesData = mod.default || mod;
  }
  if (!questionsData) {
    const [q1, q2, q3, q4, q5] = await Promise.all([
      import('./data/questions_1.json'),
      import('./data/questions_2.json'),
      import('./data/questions_3.json'),
      import('./data/questions_4.json'),
      import('./data/questions_5.json')
    ]);
    const d1 = q1.default || q1;
    const d2 = q2.default || q2;
    const d3 = q3.default || q3;
    const d4 = q4.default || q4;
    const d5 = q5.default || q5;
    questionsData = { questions: [...d1.questions, ...d2.questions, ...d3.questions, ...d4.questions, ...d5.questions] };
  }
}

// ==============================
// Progress Storage
// ==============================
const storage = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(`ceh_${key}`)); } catch { return null; }
  },
  set(key, val) {
    localStorage.setItem(`ceh_${key}`, JSON.stringify(val));
  },
  getProgress() {
    const p = this.get('progress') || { completed: {}, quizResults: [], moduleProgress: {} };
    if (!p.readTopics) p.readTopics = {};
    return p;
  },
  saveQuizResult(result) {
    const progress = this.getProgress();
    progress.quizResults.push({ ...result, date: new Date().toISOString() });
    // Mark questions as answered
    result.answers.forEach(a => {
      if (!progress.completed[a.questionId]) progress.completed[a.questionId] = {};
      progress.completed[a.questionId] = { correct: a.correct, date: new Date().toISOString() };
    });
    this.set('progress', progress);
  },
  toggleTopicRead(moduleId, topicIndex) {
    const p = this.getProgress();
    if (!p.readTopics[moduleId]) p.readTopics[moduleId] = {};
    p.readTopics[moduleId][topicIndex] = !p.readTopics[moduleId][topicIndex];
    this.set('progress', p);
  },
  getTopicStats(moduleId) {
    const p = this.getProgress();
    const read = p.readTopics[moduleId] || {};
    const readCount = Object.values(read).filter(Boolean).length;
    const mod = modulesData.modules.find(m => m.id === parseInt(moduleId));
    const total = mod ? mod.topics.length : 0;
    return { readCount, total };
  },
  getModuleStats(moduleId) {
    const progress = this.getProgress();
    if (!questionsData) return { total: 0, answered: 0, correct: 0 };
    const moduleQuestions = questionsData.questions.filter(q => q.moduleId === moduleId);
    const total = moduleQuestions.length;
    let answered = 0, correct = 0;
    moduleQuestions.forEach(q => {
      if (progress.completed[q.id]) {
        answered++;
        if (progress.completed[q.id].correct) correct++;
      }
    });
    return { total, answered, correct };
  },
  getOverallStats() {
    const progress = this.getProgress();
    if (!questionsData) return { total: 0, answered: 0, correct: 0 };
    const total = questionsData.questions.length;
    const answered = Object.keys(progress.completed).length;
    const correct = Object.values(progress.completed).filter(c => c.correct).length;
    return { total, answered, correct };
  },
  getLastResults(n = 5) {
    const progress = this.getProgress();
    return (progress.quizResults || []).slice(-n).reverse();
  }
};

// ==============================
// Router
// ==============================
function navigate(path) {
  window.location.hash = path;
}

function getRoute() {
  const hash = window.location.hash.slice(1) || '/';
  const pathPart = hash.split('?')[0];
  const parts = pathPart.split('/').filter(Boolean);
  return { path: hash, parts };
}

// ==============================
// Navbar
// ==============================
function renderNavbar(activeRoute) {
  const navLinks = [
    { path: '/', label: 'Dashboard', icon: 'home' },
    { path: '/modules', label: 'Study Modules', icon: 'book' },
    { path: '/quiz', label: 'Practice Quiz', icon: 'help-circle' },
  ];

  const isActive = (linkPath) => {
    if (linkPath === '/' && activeRoute === '/') return true;
    if (linkPath !== '/' && activeRoute.startsWith(linkPath)) return true;
    return false;
  };

  return `
    <nav class="navbar" id="navbar">
      <a class="nav-brand" href="#/" onclick="event.preventDefault()">
        <div class="nav-brand-icon">CEH</div>
        <span class="nav-brand-text">CEH Prep</span>
        <span class="nav-brand-badge">v13</span>
      </a>
      <div class="nav-links" id="navLinks">
        ${navLinks.map(l => `
          <a href="#${l.path}" class="nav-link ${isActive(l.path) ? 'active' : ''}" data-route="${l.path}">
            ${icon(l.icon, 18)}
            ${l.label}
          </a>
        `).join('')}
      </div>
      <button class="nav-hamburger" id="navHamburger" aria-label="Menu">
        ${icon('menu', 22)}
      </button>
    </nav>
    <div class="nav-mobile-overlay" id="navOverlay"></div>
    <div class="nav-mobile-menu" id="navMobileMenu">
      ${navLinks.map(l => `
        <a href="#${l.path}" class="nav-link ${isActive(l.path) ? 'active' : ''}" data-route="${l.path}">
          ${icon(l.icon, 18)}
          ${l.label}
        </a>
      `).join('')}
    </div>
  `;
}

function initNavbar() {
  const hamburger = document.getElementById('navHamburger');
  const overlay = document.getElementById('navOverlay');
  const mobileMenu = document.getElementById('navMobileMenu');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('active');
      overlay.classList.toggle('active');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', () => {
      mobileMenu.classList.remove('active');
      overlay.classList.remove('active');
    });
  }

  // Close mobile menu on nav link click
  document.querySelectorAll('.nav-mobile-menu .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu?.classList.remove('active');
      overlay?.classList.remove('active');
    });
  });

  // Navbar scroll shadow
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (navbar) {
      navbar.classList.toggle('scrolled', window.scrollY > 10);
    }
  });
}

// ==============================
// Home Page
// ==============================
function renderHome() {
  const stats = storage.getOverallStats();
  const lastResults = storage.getLastResults();
  const progressPct = stats.total ? Math.round((stats.answered / stats.total) * 100) : 0;
  const correctPct = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0;

  const examInfo = modulesData.examInfo;
  const domains = modulesData.domains;

  return `
    <div class="main-content">
      <!-- Hero -->
      <div class="hero">
        <div class="hero-content">
          <h1>CEH v13 Exam Preparation</h1>
          <p>Master the Certified Ethical Hacker (312-50v13) exam with comprehensive study materials, hands-on practice questions, and progress tracking.</p>
          <div class="hero-badges">
            <span class="hero-badge">${icon('file-text', 14)} ${examInfo.questions} Questions</span>
            <span class="hero-badge">${icon('clock', 14)} ${examInfo.duration}</span>
            <span class="hero-badge">${icon('target', 14)} ${examInfo.passingScore}</span>
            <span class="hero-badge">${icon('award', 14)} ${examInfo.format}</span>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-icon brown">${icon('book', 24)}</div>
          <div>
            <div class="stat-value">20</div>
            <div class="stat-label">Study Modules</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">${icon('help-circle', 24)}</div>
          <div>
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Practice Questions</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon warm">${icon('check-circle', 24)}</div>
          <div>
            <div class="stat-value">${stats.answered}</div>
            <div class="stat-label">Answered</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">${icon('bar-chart', 24)}</div>
          <div>
            <div class="stat-value">${correctPct}%</div>
            <div class="stat-label">Accuracy</div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <div class="quick-action-card" onclick="window.location.hash='/modules'">
          <div class="quick-action-icon" style="background:var(--accent-primary-bg);color:var(--accent-primary)">
            ${icon('book', 28)}
          </div>
          <div>
            <div class="quick-action-title">Study Modules</div>
            <div class="quick-action-desc">Browse all 20 CEH v13 modules with detailed content and key concepts</div>
          </div>
        </div>
        <div class="quick-action-card" onclick="window.location.hash='/quiz'">
          <div class="quick-action-icon" style="background:var(--accent-secondary-bg);color:var(--accent-secondary)">
            ${icon('help-circle', 28)}
          </div>
          <div>
            <div class="quick-action-title">Practice Questions</div>
            <div class="quick-action-desc">Test your knowledge with ${stats.total}+ exam-style practice questions</div>
          </div>
        </div>
      </div>

      <!-- Overall Progress -->
      <div class="section">
        <div class="section-header">
          <div>
            <div class="section-title">Your Progress</div>
            <div class="section-subtitle">${stats.answered} of ${stats.total} questions answered</div>
          </div>
        </div>
        <div class="card" style="cursor:default">
          <div class="progress-bar-container" style="height:10px;margin-bottom:var(--space-md)">
            <div class="progress-bar green" style="width:${progressPct}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--text-tertiary)">
            <span>${progressPct}% Complete</span>
            <span>${stats.correct} Correct / ${stats.answered - stats.correct} Incorrect</span>
          </div>
        </div>
      </div>

      <!-- Exam Domains -->
      <div class="section">
        <div class="section-header">
          <div>
            <div class="section-title">Exam Domains</div>
            <div class="section-subtitle">9 domains covering ${modulesData.modules.length} modules</div>
          </div>
        </div>
        <div class="domain-list">
          ${domains.map(d => `
            <div class="domain-item" onclick="window.location.hash='/modules?domain=${d.id}'">
              <div class="domain-number">${d.id}</div>
              <div class="domain-name">${d.name}</div>
              <div class="domain-modules">${d.modules.length} module${d.modules.length > 1 ? 's' : ''}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- v13 Highlights -->
      <div class="section">
        <div class="section-header">
          <div>
            <div class="section-title">What's New in v13</div>
            <div class="section-subtitle">Key additions and updates from the latest version</div>
          </div>
        </div>
        <div class="v13-updates">
          <div class="v13-updates-title">CEH v13 Highlights</div>
          <ul class="v13-updates-list">
            ${examInfo.highlights.map(h => `<li>${h}</li>`).join('')}
          </ul>
        </div>
      </div>

      ${lastResults.length > 0 ? `
      <!-- Recent Quiz Results -->
      <div class="section">
        <div class="section-header">
          <div>
            <div class="section-title">Recent Results</div>
          </div>
          <a href="#/quiz" class="btn btn-sm btn-secondary">Take New Quiz</a>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-sm)">
          ${lastResults.map(r => {
            const pct = r.totalQuestions ? Math.round((r.correctCount / r.totalQuestions) * 100) : 0;
            const date = new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return `
              <div class="card" style="cursor:default;padding:var(--space-lg)">
                <div style="display:flex;align-items:center;justify-content:space-between">
                  <div>
                    <div style="font-weight:600;color:var(--text-primary)">${r.title || 'Quiz'}</div>
                    <div style="font-size:0.82rem;color:var(--text-tertiary)">${date} · ${r.totalQuestions} questions</div>
                  </div>
                  <div style="font-size:1.2rem;font-weight:700;color:${pct >= 70 ? 'var(--success)' : 'var(--error)'}">${pct}%</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  `;
}

// ==============================
// Modules List Page
// ==============================
function renderModules() {
  const modules = modulesData.modules;
  const domains = modulesData.domains;

  // Get domain filter from URL
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const domainFilter = params.get('domain');

  const moduleIcons = {
    shield: 'shield', footprints: 'footprints', radar: 'radar', list: 'list',
    bug: 'bug', lock: 'lock', virus: 'virus', wifi: 'wifi', users: 'users',
    zap: 'zap', link: 'link', 'eye-off': 'eye-off', server: 'server',
    globe: 'globe', database: 'database', radio: 'radio', smartphone: 'smartphone',
    cpu: 'cpu', cloud: 'cloud', key: 'key'
  };

  let filteredModules = modules;
  if (domainFilter) {
    const domain = domains.find(d => d.id === parseInt(domainFilter));
    if (domain) {
      filteredModules = modules.filter(m => domain.modules.includes(m.id));
    }
  }

  return `
    <div class="main-content">
      <div class="page-header">
        <h1>Study Modules</h1>
        <p>Explore all 20 CEH v13 modules. Each module covers key concepts, tools, and techniques you need to master.</p>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="search-input-wrapper">
          ${icon('search', 18)}
          <input type="text" class="search-input" id="moduleSearch" placeholder="Search modules..." />
        </div>
        <select class="filter-select" id="domainFilter">
          <option value="">All Domains</option>
          ${domains.map(d => `<option value="${d.id}" ${domainFilter == d.id ? 'selected' : ''}>Domain ${d.id}: ${d.name}</option>`).join('')}
        </select>
      </div>

      <!-- Module Grid -->
      <div class="card-grid" id="moduleGrid">
        ${filteredModules.map(m => {
          const stats = storage.getModuleStats(m.id);
          const progressPct = stats.total ? Math.round((stats.answered / stats.total) * 100) : 0;
          const iconName = moduleIcons[m.icon] || 'shield';
          return `
            <div class="card card-clickable module-card" data-module="${m.id}" data-title="${m.title.toLowerCase()}" onclick="window.location.hash='/module/${m.id}'">
              <div class="module-card-header">
                <div class="module-card-icon">${icon(iconName, 22)}</div>
                <div class="module-card-info">
                  <div class="module-card-number">Module ${m.id}</div>
                  <div class="module-card-title">${m.title}</div>
                </div>
              </div>
              <div class="module-card-desc">${m.description}</div>
              <div class="module-card-footer">
                <div style="flex:1">
                  <div class="progress-bar-container">
                    <div class="progress-bar" style="width:${progressPct}%"></div>
                  </div>
                  <div class="progress-text">${stats.answered}/${stats.total} questions · ${progressPct}%</div>
                </div>
                <span style="color:var(--text-tertiary);margin-left:var(--space-md)">${icon('chevron-right', 16)}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function initModulesPage() {
  const searchInput = document.getElementById('moduleSearch');
  const domainFilter = document.getElementById('domainFilter');
  const grid = document.getElementById('moduleGrid');

  if (searchInput) {
    searchInput.addEventListener('input', () => filterModules());
  }
  if (domainFilter) {
    domainFilter.addEventListener('change', () => {
      const val = domainFilter.value;
      if (val) {
        window.location.hash = `/modules?domain=${val}`;
      } else {
        window.location.hash = '/modules';
      }
    });
  }
}

function filterModules() {
  const search = document.getElementById('moduleSearch')?.value.toLowerCase() || '';
  const cards = document.querySelectorAll('.module-card');
  cards.forEach(card => {
    const title = card.dataset.title || '';
    card.style.display = title.includes(search) ? '' : 'none';
  });
}

// ==============================
// Module Detail Page
// ==============================

function renderModuleDetail(moduleId) {
  const m = modulesData.modules.find(mod => mod.id === parseInt(moduleId));
  if (!m) return `<div class="main-content"><div class="empty-state">Module not found</div></div>`;

  const qStats = storage.getModuleStats(m.id);
  const tStats = storage.getTopicStats(m.id);
  const domain = modulesData.domains.find(d => d.modules.includes(m.id));
  
  return `
    <div class="main-content">
      <a class="back-link" href="#/modules">
        ${icon('arrow-left', 16)} Back to Modules
      </a>
      
      <div class="module-detail-header" style="text-align:center; padding: var(--space-2xl) 0;">
        <h1 style="font-family:var(--font-serif);font-size:2rem;font-weight:700;">Module ${m.id}: ${m.title}</h1>
        <p style="color:var(--text-secondary);max-width:600px;margin:var(--space-md) auto;">${m.description}</p>
        <div class="module-detail-meta" style="justify-content:center;margin-top:var(--space-md)">
          ${domain ? `<span class="module-meta-item">${icon('target', 16)} ${domain.name}</span>` : ''}
        </div>
      </div>

      <div class="module-split-container">
        <!-- Study Material Card -->
        <a class="module-choice-card" href="#/study/${m.id}" style="text-decoration:none;">
          <div class="icon-wrapper">${icon('book-open', 32)}</div>
          <h3>Study Topics</h3>
          <p>Read detailed, textbook-level explanations covering all concepts for this module.</p>
          <div style="width:100%;margin-top:var(--space-lg);">
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--text-secondary);margin-bottom:var(--space-xs)">
              <span>Reading Progress</span>
              <span>${tStats.readCount} / ${tStats.total} topics</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width:${tStats.total ? (tStats.readCount/tStats.total)*100 : 0}%"></div>
            </div>
          </div>
        </a>

        <!-- Practice Quiz Card -->
        <a class="module-choice-card" href="#/quiz?module=${m.id}" style="text-decoration:none;">
          <div class="icon-wrapper" style="background:rgba(239,68,68,0.1);color:#ef4444;">${icon('play', 32)}</div>
          <h3 style="color:var(--text-primary)">Practice Quiz</h3>
          <p>Test your knowledge with scenario-based CEH practice questions.</p>
          <div style="width:100%;margin-top:var(--space-lg);">
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--text-secondary);margin-bottom:var(--space-xs)">
              <span>Quiz Progress</span>
              <span>${qStats.answered} / ${qStats.total} answered (${qStats.correct} correct)</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="background:#ef4444;width:${qStats.total ? (qStats.answered/qStats.total)*100 : 0}%"></div>
            </div>
          </div>
        </a>
      </div>
    </div>
  `;
}

function renderStudyModule(moduleId) {
  const m = modulesData.modules.find(mod => mod.id === parseInt(moduleId));
  if (!m) return '';
  const p = storage.getProgress().readTopics[m.id] || {};
  const tStats = storage.getTopicStats(m.id);

  return `
    <div class="main-content">
      <a class="back-link" href="#/module/${m.id}">
        ${icon('arrow-left', 16)} Back to Module ${m.id}
      </a>
      
      <div style="margin-bottom: var(--space-xl)">
        <h1 style="font-family:var(--font-serif);font-size:2rem;margin-bottom:var(--space-sm)">${m.title} - Study Topics</h1>
        <div style="display:flex;align-items:center;gap:var(--space-md)">
          <div class="progress-bar-container" style="flex:1;max-width:300px;">
            <div class="progress-bar-fill" style="width:${tStats.total ? (tStats.readCount/tStats.total)*100 : 0}%"></div>
          </div>
          <span style="color:var(--text-secondary);font-size:0.9rem">${tStats.readCount} of ${tStats.total} completed</span>
        </div>
      </div>

      <div class="topic-container">
        ${m.topics.map((t, i) => {
          const isCompleted = !!p[i];
          return `
            <div class="topic-card" id="topic-${i}">
              <div class="topic-content">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                  <span style="background:var(--accent-primary);color:var(--bg-base);padding:2px 8px;border-radius:12px;font-size:0.8rem;font-weight:bold;">Topic ${i + 1}</span>
                  ${isCompleted ? `<span style="color:var(--success);">${icon('check-circle', 16)}</span>` : ''}
                </div>
                <h3>${t.title}</h3>
                <div>${t.content}</div>
                ${t.keyTerms && t.keyTerms.length > 0 ? `
                  <div style="margin-top:var(--space-md);background:var(--bg-secondary);padding:var(--space-md);border-radius:var(--radius-md);">
                    <strong style="display:block;margin-bottom:var(--space-xs);font-size:0.85rem;color:var(--text-tertiary);text-transform:uppercase;">Key Terms</strong>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                      ${t.keyTerms.map(kt => `<span style="background:var(--bg-card);border:1px solid var(--border-light);padding:4px 8px;border-radius:4px;font-size:0.85rem;">${kt}</span>`).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
              <div class="topic-actions">
                <button class="btn-complete ${isCompleted ? 'completed' : ''}" onclick="window.toggleTopicComplete(${m.id}, ${i})">
                  ${isCompleted ? icon('check-circle', 18) + ' Completed' : icon('circle', 18) + ' Mark as Completed'}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ==============================
// Quiz Page
// ==============================
let quizState = null;

function renderQuizSetup() {
  const modules = modulesData.modules;

  return `
    <div class="main-content">
      <div class="page-header">
        <h1>Practice Quiz</h1>
        <p>Test your knowledge with exam-style questions. Choose a quiz mode and select which modules to practice.</p>
      </div>

      <div class="quiz-setup">
        <!-- Quiz Modes -->
        <div class="section">
          <div class="section-title" style="margin-bottom:var(--space-md)">Quiz Mode</div>
          <div class="quiz-mode-grid" id="quizModeGrid">
            <div class="quiz-mode-card active" data-mode="module" onclick="selectQuizMode(this, 'module')">
              <div class="quiz-mode-icon">📖</div>
              <div class="quiz-mode-title">By Module</div>
              <div class="quiz-mode-desc">Select specific modules to focus on</div>
            </div>
            <div class="quiz-mode-card" data-mode="random" onclick="selectQuizMode(this, 'random')">
              <div class="quiz-mode-icon">🎲</div>
              <div class="quiz-mode-title">Random Mix</div>
              <div class="quiz-mode-desc">Random questions from all modules</div>
            </div>
            <div class="quiz-mode-card" data-mode="weak" onclick="selectQuizMode(this, 'weak')">
              <div class="quiz-mode-icon">🎯</div>
              <div class="quiz-mode-title">Weak Areas</div>
              <div class="quiz-mode-desc">Focus on previously incorrect answers</div>
            </div>
          </div>
        </div>

        <!-- Module Selection -->
        <div class="section" id="moduleSelectSection">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-md)">
            <div class="section-title">Select Modules</div>
            <button class="btn btn-sm btn-secondary" id="selectAllBtn" onclick="toggleSelectAll()">Select All</button>
          </div>
          <div class="module-select-grid" id="moduleSelectGrid">
            ${modules.map(m => `
              <div class="module-select-item" data-module="${m.id}" onclick="toggleModuleSelect(this)">
                <div class="module-select-check">${icon('check', 14)}</div>
                <div class="module-select-name">M${m.id}: ${m.title}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Question Count -->
        <div class="section">
          <div class="section-title" style="margin-bottom:var(--space-md)">Number of Questions</div>
          <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap" id="questionCountGrid">
            <button class="btn btn-secondary" data-count="10" onclick="selectCount(this, 10)">10</button>
            <button class="btn btn-primary" data-count="20" onclick="selectCount(this, 20)">20</button>
            <button class="btn btn-secondary" data-count="50" onclick="selectCount(this, 50)">50</button>
            <button class="btn btn-secondary" data-count="all" onclick="selectCount(this, 0)">All</button>
          </div>
        </div>

        <!-- Start Button -->
        <div style="text-align:center;margin-top:var(--space-xl)">
          <button class="btn btn-primary btn-lg" onclick="startQuiz()" id="startQuizBtn">
            ${icon('play', 18)} Start Quiz
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderQuiz() {
  if (!quizState || !quizState.active) {
    // Check URL params for direct module quiz
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const moduleParam = params.get('module');
    if (moduleParam) {
      const moduleId = parseInt(moduleParam);
      const questions = questionsData.questions.filter(q => q.moduleId === moduleId);
      if (questions.length > 0) {
        const m = modulesData.modules.find(mod => mod.id === moduleId);
        quizState = {
          active: true,
          questions: shuffleArray([...questions]),
          currentIndex: 0,
          answers: [],
          selectedOption: null,
          answered: false,
          title: `Module ${moduleId}: ${m ? m.title : ''}`,
          startTime: Date.now()
        };
        return renderQuizQuestion();
      }
    }
    return renderQuizSetup();
  }
  return renderQuizQuestion();
}

function renderQuizQuestion() {
  const q = quizState.questions[quizState.currentIndex];
  const total = quizState.questions.length;
  const current = quizState.currentIndex + 1;
  const progressPct = Math.round((current / total) * 100);
  const elapsed = Math.floor((Date.now() - quizState.startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const letters = ['A', 'B', 'C', 'D'];

  return `
    <div class="main-content">
      <div class="quiz-container">
        <!-- Quiz Header -->
        <div class="quiz-header">
          <div class="quiz-progress" style="flex:1">
            <span class="quiz-progress-text">Question ${current} of ${total}</span>
            <div class="progress-bar-container" style="flex:1">
              <div class="progress-bar" style="width:${progressPct}%"></div>
            </div>
          </div>
          <div class="quiz-timer" id="quizTimer">
            ${icon('clock', 16)} ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}
          </div>
        </div>

        <!-- Question Card -->
        <div class="question-card">
          <div class="question-meta">
            <span class="question-number">Question ${current}</span>
            <span class="difficulty-badge ${q.difficulty}">${q.difficulty}</span>
            <span style="font-size:0.78rem;color:var(--text-tertiary)">Module ${q.moduleId}</span>
          </div>
          <div class="question-text">${q.question}</div>
          <div class="options-list">
            ${q.options.map((opt, i) => {
              let optClass = '';
              if (quizState.answered) {
                if (i === q.correctAnswer) optClass = 'correct';
                else if (i === quizState.selectedOption && i !== q.correctAnswer) optClass = 'incorrect';
                optClass += ' disabled';
              } else if (quizState.selectedOption === i) {
                optClass = 'selected';
              }
              return `
                <button class="option-btn ${optClass}" data-option="${i}" onclick="selectOption(${i})">
                  <span class="option-letter">${letters[i]}</span>
                  <span class="option-text">${opt}</span>
                </button>
              `;
            }).join('')}
          </div>

          ${quizState.answered ? `
            <div class="explanation ${quizState.selectedOption === q.correctAnswer ? 'correct' : 'incorrect'}">
              <div class="explanation-title">
                ${quizState.selectedOption === q.correctAnswer
                  ? `${icon('check-circle', 18)} Correct!`
                  : `${icon('x-circle', 18)} Incorrect — The correct answer is ${letters[q.correctAnswer]}`
                }
              </div>
              <div class="explanation-text">${q.explanation}</div>
            </div>
          ` : ''}
        </div>

        <!-- Navigation -->
        <div class="quiz-nav">
          ${!quizState.answered ? `
            <button class="btn btn-secondary" onclick="skipQuestion()">Skip</button>
            <button class="btn btn-primary" onclick="submitAnswer()" ${quizState.selectedOption === null ? 'disabled style="opacity:0.5;pointer-events:none"' : ''}>
              Submit Answer
            </button>
          ` : `
            <button class="btn btn-secondary" onclick="endQuiz()">End Quiz</button>
            <button class="btn btn-primary" onclick="nextQuestion()">
              ${current < total ? 'Next Question' : 'View Results'} ${icon('arrow-right', 16)}
            </button>
          `}
        </div>
      </div>
    </div>
  `;
}

// Quiz timer
let quizTimerInterval = null;

function startQuizTimer() {
  if (quizTimerInterval) clearInterval(quizTimerInterval);
  quizTimerInterval = setInterval(() => {
    const timerEl = document.getElementById('quizTimer');
    if (timerEl && quizState && quizState.active) {
      const elapsed = Math.floor((Date.now() - quizState.startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      timerEl.innerHTML = `${icon('clock', 16)} ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }, 1000);
}

// Quiz functions (window scope)
window.selectQuizMode = function(el, mode) {
  document.querySelectorAll('.quiz-mode-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const moduleSection = document.getElementById('moduleSelectSection');
  if (moduleSection) {
    moduleSection.style.display = mode === 'module' ? '' : 'none';
  }
  window._quizMode = mode;
};

window.toggleModuleSelect = function(el) {
  el.classList.toggle('selected');
};

window.toggleSelectAll = function() {
  const items = document.querySelectorAll('.module-select-item');
  const allSelected = [...items].every(i => i.classList.contains('selected'));
  items.forEach(i => {
    if (allSelected) i.classList.remove('selected');
    else i.classList.add('selected');
  });
};

window.selectCount = function(el, count) {
  document.querySelectorAll('#questionCountGrid .btn').forEach(b => {
    b.classList.remove('btn-primary');
    b.classList.add('btn-secondary');
  });
  el.classList.remove('btn-secondary');
  el.classList.add('btn-primary');
  window._quizCount = count;
};

window._quizMode = 'module';
window._quizCount = 20;

window.toggleTopicComplete = function(moduleId, topicIndex) {
  storage.toggleTopicRead(moduleId, topicIndex);
  renderApp(); // re-render to update UI and progress bar
};

window.startQuiz = function() {
  const mode = window._quizMode || 'module';
  const count = window._quizCount || 20;
  let questions = [];
  let title = 'Practice Quiz';

  if (mode === 'module') {
    const selected = [...document.querySelectorAll('.module-select-item.selected')].map(el => parseInt(el.dataset.module));
    if (selected.length === 0) {
      alert('Please select at least one module.');
      return;
    }
    questions = questionsData.questions.filter(q => selected.includes(q.moduleId));
    if (selected.length === 1) {
      const m = modulesData.modules.find(mod => mod.id === selected[0]);
      title = `Module ${selected[0]}: ${m ? m.title : ''}`;
    } else {
      title = `${selected.length} Modules Mixed`;
    }
  } else if (mode === 'random') {
    questions = [...questionsData.questions];
    title = 'Random Mix Quiz';
  } else if (mode === 'weak') {
    const progress = storage.getProgress();
    const incorrectIds = Object.entries(progress.completed)
      .filter(([, v]) => !v.correct)
      .map(([k]) => parseInt(k));
    questions = questionsData.questions.filter(q => incorrectIds.includes(q.id));
    title = 'Weak Areas Review';
    if (questions.length === 0) {
      questions = [...questionsData.questions];
      title = 'Random Mix (No weak areas found)';
    }
  }

  // Shuffle and limit
  questions = shuffleArray(questions);
  if (count > 0 && count < questions.length) {
    questions = questions.slice(0, count);
  }

  quizState = {
    active: true,
    questions,
    currentIndex: 0,
    answers: [],
    selectedOption: null,
    answered: false,
    title,
    startTime: Date.now()
  };

  renderApp();
  startQuizTimer();
};

window.selectOption = function(idx) {
  if (quizState.answered) return;
  quizState.selectedOption = idx;
  renderApp();
};

window.submitAnswer = function() {
  if (quizState.selectedOption === null) return;
  quizState.answered = true;
  const q = quizState.questions[quizState.currentIndex];
  quizState.answers.push({
    questionId: q.id,
    selected: quizState.selectedOption,
    correct: quizState.selectedOption === q.correctAnswer,
    moduleId: q.moduleId
  });
  renderApp();
};

window.skipQuestion = function() {
  const q = quizState.questions[quizState.currentIndex];
  quizState.answers.push({
    questionId: q.id,
    selected: -1,
    correct: false,
    skipped: true,
    moduleId: q.moduleId
  });
  if (quizState.currentIndex < quizState.questions.length - 1) {
    quizState.currentIndex++;
    quizState.selectedOption = null;
    quizState.answered = false;
    renderApp();
  } else {
    finishQuiz();
  }
};

window.nextQuestion = function() {
  if (quizState.currentIndex < quizState.questions.length - 1) {
    quizState.currentIndex++;
    quizState.selectedOption = null;
    quizState.answered = false;
    renderApp();
  } else {
    finishQuiz();
  }
};

window.endQuiz = function() {
  finishQuiz();
};

function finishQuiz() {
  if (quizTimerInterval) clearInterval(quizTimerInterval);
  const elapsed = Math.floor((Date.now() - quizState.startTime) / 1000);
  const correctCount = quizState.answers.filter(a => a.correct).length;
  const skippedCount = quizState.answers.filter(a => a.skipped).length;
  const totalQuestions = quizState.questions.length;

  const result = {
    title: quizState.title,
    totalQuestions,
    correctCount,
    incorrectCount: totalQuestions - correctCount - skippedCount,
    skippedCount,
    elapsed,
    answers: quizState.answers,
    questions: quizState.questions
  };

  storage.saveQuizResult(result);

  // Store for results page
  window._lastQuizResult = result;
  quizState = null;
  navigate('/results');
}

// ==============================
// Results Page
// ==============================
function renderResults() {
  const result = window._lastQuizResult;
  if (!result) {
    return `
      <div class="main-content">
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-text">No quiz results to display</div>
          <a href="#/quiz" class="btn btn-primary" style="margin-top:var(--space-lg)">Start a Quiz</a>
        </div>
      </div>
    `;
  }

  const pct = Math.round((result.correctCount / result.totalQuestions) * 100);
  const passed = pct >= 70;
  const circumference = 2 * Math.PI * 65;
  const dashOffset = circumference - (pct / 100) * circumference;
  const minutes = Math.floor(result.elapsed / 60);
  const seconds = result.elapsed % 60;
  const letters = ['A', 'B', 'C', 'D'];

  return `
    <div class="main-content">
      <div class="results-container">
        <!-- Results Hero -->
        <div class="results-hero">
          <div class="results-score-ring">
            <svg viewBox="0 0 140 140">
              <circle class="ring-bg" cx="70" cy="70" r="65" />
              <circle class="ring-fill ${passed ? 'pass' : 'fail'}" cx="70" cy="70" r="65"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${dashOffset}" />
            </svg>
            <div class="results-score-text">
              <div class="results-score-value">${pct}%</div>
              <div class="results-score-label">Score</div>
            </div>
          </div>
          <div class="results-title" style="color:${passed ? 'var(--success)' : 'var(--error)'}">
            ${passed ? '🎉 Great Job!' : '📚 Keep Studying!'}
          </div>
          <div class="results-subtitle">${result.title} — ${minutes}m ${seconds}s</div>

          <div class="results-stats">
            <div class="result-stat">
              <div class="result-stat-value correct">${result.correctCount}</div>
              <div class="result-stat-label">Correct</div>
            </div>
            <div class="result-stat">
              <div class="result-stat-value incorrect">${result.incorrectCount}</div>
              <div class="result-stat-label">Incorrect</div>
            </div>
            <div class="result-stat">
              <div class="result-stat-value skipped">${result.skippedCount}</div>
              <div class="result-stat-label">Skipped</div>
            </div>
          </div>

          <div class="results-actions">
            <button class="btn btn-primary" onclick="window.location.hash='/quiz'">
              ${icon('refresh-cw', 16)} New Quiz
            </button>
            <button class="btn btn-secondary" onclick="window.location.hash='/'">
              ${icon('home', 16)} Dashboard
            </button>
          </div>
        </div>

        <!-- Answer Review -->
        <div class="review-section">
          <div class="section-header">
            <div class="section-title">Answer Review</div>
          </div>
          ${result.answers.map((a, i) => {
            const q = result.questions.find(qu => qu.id === a.questionId);
            if (!q) return '';
            return `
              <div class="review-question ${a.correct ? 'was-correct' : 'was-incorrect'}">
                <div class="review-question-header">
                  <span class="question-number">Q${i + 1}</span>
                  <span class="difficulty-badge ${q.difficulty}">${q.difficulty}</span>
                  ${a.correct
                    ? `<span style="color:var(--success);display:flex;align-items:center;gap:4px;font-size:0.82rem">${icon('check-circle', 14)} Correct</span>`
                    : a.skipped
                      ? `<span style="color:var(--text-tertiary);font-size:0.82rem">Skipped</span>`
                      : `<span style="color:var(--error);display:flex;align-items:center;gap:4px;font-size:0.82rem">${icon('x-circle', 14)} Incorrect</span>`
                  }
                </div>
                <div class="review-question-text">${q.question}</div>
                <div class="review-answer">
                  ${!a.skipped ? `<span>Your answer: <strong>${letters[a.selected]}) ${q.options[a.selected]}</strong></span><br/>` : ''}
                  <span style="color:var(--success)">Correct answer: <strong>${letters[q.correctAnswer]}) ${q.options[q.correctAnswer]}</strong></span>
                  <p style="margin-top:var(--space-sm);color:var(--text-tertiary);font-size:0.85rem">${q.explanation}</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// ==============================
// Utility Functions
// ==============================
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ==============================
// App Router & Renderer
// ==============================
async function renderApp() {
  const app = document.getElementById('app');
  const { path, parts } = getRoute();

  // Show loading if data not ready
  if (!modulesData || !questionsData) {
    app.innerHTML = `
      ${renderNavbar(path)}
      <div class="app-layout">
        <div class="loading-spinner"><div class="spinner"></div></div>
      </div>
    `;
    initNavbar();
    await loadData();
  }

  let pageContent = '';

  if (parts[0] === 'modules' && !parts[1]) {
    pageContent = renderModules();
  } else if (parts[0] === 'module' && parts[1]) {
    pageContent = renderModuleDetail(parts[1]);
  } else if (parts[0] === 'study' && parts[1]) {
    pageContent = renderStudyModule(parts[1]);
    pageContent = renderModuleDetail(parts[1]);
  } else if (parts[0] === 'quiz') {
    pageContent = renderQuiz();
  } else if (parts[0] === 'results') {
    pageContent = renderResults();
  } else {
    pageContent = renderHome();
  }

  app.innerHTML = `
    ${renderNavbar(path)}
    <div class="app-layout">
      ${pageContent}
    </div>
  `;

  initNavbar();

  // Page-specific init
  if (parts[0] === 'modules' && !parts[1]) {
    initModulesPage();
  }

  // Start timer if quiz active
  if (parts[0] === 'quiz' && quizState && quizState.active) {
    startQuizTimer();
  }

  // Scroll to top on page change
  window.scrollTo(0, 0);
}

// Route change handler
window.addEventListener('hashchange', () => {
  renderApp();
});

// Init
renderApp();
