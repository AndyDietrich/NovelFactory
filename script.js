// ==================================================
// GLOBAL CONFIGURATION & STATE
// ==================================================

/**
 * Application configuration constants
 */
const CONFIG = {
    MAX_SAVED_PROJECTS: 10,
    AUTO_SAVE_INTERVAL: 30000, // 30 seconds
    READING_SPEED_WPM: 250,
    VERSION: '1.0.1'
};

/**
 * Global application state
 */
let bookData = {
    id: 'current',
    title: '',
    blurb: '',
    genre: '',
    targetAudience: '',
    premise: '',
    styleDirection: '',
    numChapters: 20,
    targetWordCount: 2000,
    outline: '',
    chapterOutline: '',
    chapters: [],
    currentStep: 'setup',
    createdAt: new Date().toISOString(),
    lastSaved: new Date().toISOString()
};

/**
 * AI settings and configuration
 */
let aiSettings = {
    apiProvider: 'openrouter',
    openrouterApiKey: '',
    openaiApiKey: '',
    model: 'anthropic/claude-sonnet-4',
    temperature: 0.7,
    maxTokens: 50000,
    advancedModelsEnabled: false,
    advancedModels: {},
    customPrompts: {
        outline: '',
        chapters: '',
        writing: '',
        analysis: '',
        improvement: '',
        manualImprovement: '',
        randomIdea: '',
        bookTitle: ''
    }
};

/**
 * Runtime state variables
 */
let projects = {};
let autoSaveTimer;
let oneClickCancelled = false;
let currentExpandedChapter = null;
let currentTheme = 'light';
let selectedDonationAmount = 5;
let isGenerating = false;

// ==================================================
// CUSTOM ALERT SYSTEM
// ==================================================

let alertCallback = null;
let inputCallback = null;

/**
 * Show custom alert dialog
 * @param {string} message - Alert message
 * @param {string} title - Alert title
 * @returns {Promise<boolean>}
 */
function customAlert(message, title = 'Notification') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-alert-modal');
        const titleElement = document.getElementById('alert-title');
        const messageElement = document.getElementById('alert-message');
        const okBtn = document.getElementById('alert-ok-btn');
        const cancelBtn = document.getElementById('alert-cancel-btn');
        
        titleElement.textContent = title;
        messageElement.innerHTML = message.replace(/\n/g, '<br>');
        
        okBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'none';
        
        alertCallback = resolve;
        modal.classList.add('active');
        okBtn.focus();
    });
}

/**
 * Show custom confirmation dialog
 * @param {string} message - Confirmation message
 * @param {string} title - Dialog title
 * @returns {Promise<boolean>}
 */
function customConfirm(message, title = 'Confirmation') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-alert-modal');
        const titleElement = document.getElementById('alert-title');
        const messageElement = document.getElementById('alert-message');
        const okBtn = document.getElementById('alert-ok-btn');
        const cancelBtn = document.getElementById('alert-cancel-btn');
        
        titleElement.textContent = title;
        messageElement.textContent = message;
        
        okBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'inline-flex';
        okBtn.textContent = 'Yes';
        cancelBtn.textContent = 'No';
        
        alertCallback = resolve;
        modal.classList.add('active');
        cancelBtn.focus();
    });
}

/**
 * Show custom input dialog
 * @param {string} message - Input message
 * @param {string} title - Dialog title
 * @param {string} defaultValue - Default input value
 * @returns {Promise<string|null>}
 */
function customInput(message, title = 'Input', defaultValue = '') {
    return new Promise((resolve) => {
        // Use existing modal from HTML
        const modal = document.getElementById('custom-input-modal');
        if (!modal) {
            console.error('Custom input modal not found in HTML');
            resolve(null);
            return;
        }
        
        document.getElementById('input-title').textContent = title;
        document.getElementById('input-message').textContent = message;
        document.getElementById('input-field').value = defaultValue;
        
        inputCallback = resolve;
        modal.classList.add('active');
        document.getElementById('input-field').focus();
        document.getElementById('input-field').select();
    });
}

/**
 * Close custom input dialog
 * @param {string|null} result - Input result
 */
function closeCustomInput(result) {
    const modal = document.getElementById('custom-input-modal');
    modal.classList.remove('active');
    
    if (inputCallback) {
        inputCallback(result);
        inputCallback = null;
    }
}

/**
 * Close custom alert/confirm dialog
 * @param {boolean} result - Dialog result
 */
function closeCustomAlert(result = true) {
    const modal = document.getElementById('custom-alert-modal');
    const okBtn = document.getElementById('alert-ok-btn');
    
    modal.classList.remove('active');
    okBtn.textContent = 'OK';
    
    if (alertCallback) {
        alertCallback(result);
        alertCallback = null;
    }
}

// ==================================================
// API MODELS CONFIGURATION
// ==================================================

/**
 * Available AI models by provider
 */
const apiModels = {
    openrouter: {
        Recommended: [
            { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4', cost: { input: 3.00, output: 15.00 }},
            { value: 'anthropic/claude-opus-4.1', label: 'Claude Opus 4.1', cost: { input: 15.00, output: 75.00 }},
            { value: 'openai/gpt-5', label: 'GPT-5', cost: { input: 1.25, output: 10.00 }} 
        ],
        
        More: [
            { value: 'openai/gpt-4o', label: 'GPT-4o', cost: { input: 5.00, output: 15.00 }},
            { value: 'anthropic/claude-3.7-sonnet:thinking', label: 'Claude Sonnet 3.7 (Thinking)', cost: { input: 3.00, output: 15.00 }},
            { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', cost: { input: 1.25, output: 10.00 }},
            { value: 'x-ai/grok-4', label: 'Grok 4', cost: { input: 3.00, output: 15.00 }},
            { value: 'perplexity/sonar-reasoning-pro', label: 'Sonar Reasoning Pro', cost: { input: 2.00, output: 8.00 }},
            { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', cost: { input: 0.25, output: 2.00 }},
            { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', cost: { input: 0.15, output: 0.60 }},
            { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano', cost: { input: 0.05, output: 0.40 }},
            { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', cost: { input: 0.30, output: 2.50 }},
            { value: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek Chat V3', cost: { input: 0.18, output: 0.72 }},
            { value: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3: FREE', cost: { input: 0.00, output: 0.00 }},
            { value: 'openai/gpt-oss-20b:free', label: 'OpenAI GPT-OSS 20B: FREE', cost: { input: 0.00, output: 0.00 }},
            { value: 'thedrummer/anubis-70b-v1.1t', label: 'Anubis 70B V1.1T', cost: { input: 0.40, output: 0.70 }},
            { value: 'microsoft/wizardlm-2-8x22b', label: 'WizardLM 2-8x22B', cost: { input: 0.48, output: 0.48 }}
        ]
    },
    openai: {
        Recommended: [
            { value: 'gpt-5', label: 'GPT-5', cost: { input: 1.25, output: 10 }},
            { value: 'gpt-4o', label: 'GPT-4o', cost: { input: 5, output: 15 }},
        ],
        More: [
            { value: 'gpt-4o-mini', label: 'GPT-4o Mini', cost: { input: 0.15, output: 0.6 }},
            { value: 'gpt-5-mini', label: 'GPT-5 Mini', cost: { input: 0.25, output: 2 }}
        ]
    }
};

// ==================================================
// GENRE REQUIREMENTS
// ==================================================

/**
 * Genre-specific requirements and pacing guidelines
 */
const genreRequirements = {
    fantasy: {
        requirements: "World-building consistency, magic system rules, mythical creatures, hero's journey structure",
        pacing: "Gradual world revelation, action-adventure balance, character growth arcs"
    },
    romance: {
        requirements: "Emotional tension, relationship development milestones, chemistry building, satisfying resolution",
        pacing: "Meet-cute, conflict, emotional stakes escalation, climactic confession, resolution"
    },
    mystery: {
        requirements: "Clue placement, red herrings, logical deduction, fair play rules, satisfying revelation",
        pacing: "Hook opening, clue discovery rhythm, misdirection timing, revelation climax"
    },
    thriller: {
        requirements: "Constant tension, escalating stakes, time pressure, plot twists, high-impact scenes",
        pacing: "Fast-paced chapters, cliffhanger endings, increasing urgency, explosive climax"
    },
    'science-fiction': {
        requirements: "Scientific plausibility, technology integration, future society rules, consequence exploration",
        pacing: "Concept introduction, world exploration, conflict escalation, resolution with implications"
    },
    horror: {
        requirements: "Atmosphere building, fear escalation, psychological tension, supernatural/realistic elements",
        pacing: "Slow dread building, jump scares, psychological terror, climactic confrontation"
    }
};

// ==================================================
// DEFAULT PROMPTS
// ==================================================

/**
 * Default AI generation prompts
 */
const defaultPrompts = {
    outline: `You are a master storyteller and bestselling author creating a complete story structure. Generate a compelling narrative framework that integrates plot, characters, and pacing for commercial success.

BOOK DETAILS:
- Genre: {genre}
- Target Audience: {targetAudience}
- Premise: {premise}
- Style Direction: {styleDirection}
- Number of Chapters: {numChapters}

GENRE-SPECIFIC REQUIREMENTS:
{genreRequirements}

CREATE A COMPREHENSIVE STORY STRUCTURE INCLUDING:

1. **THREE-ACT BREAKDOWN**:
   - ACT I (Setup) - Chapters 1-{act1End}: Hook, world/character introduction, inciting incident
   - ACT II (Confrontation) - Chapters {act2Start}-{act2End}: Rising action, obstacles, midpoint twist
   - ACT III (Resolution) - Chapters {act3Start}-{numChapters}: Climax, falling action, resolution

2. **MAIN CHARACTERS WITH ARCS**:
   - Protagonist(s): Goals, motivations, flaws, character arc
   - Antagonist(s): Compelling motivations, obstacles they create
   - Supporting characters: Their roles and mini-arcs
   - Character relationships and development throughout story

3. **PLOT STRUCTURE**:
   - Opening hook and world establishment
   - Key plot points and turning points
   - Major conflicts and obstacles
   - Midpoint game-changer
   - Climactic confrontation
   - Satisfying resolution

4. **PACING & TENSION**:
   - Chapter-level tension management
   - Action/reflection balance
   - Emotional beats and character development moments
   - Cliffhangers and hooks

Ensure this structure is commercially viable, emotionally engaging, and perfectly suited for {targetAudience}. Follow proven storytelling formulas while maintaining originality.`, 

    chapters: `You are a master storyteller creating a detailed chapter-by-chapter plan. Based on the complete story structure, create comprehensive chapter summaries and scene breakdowns.

COMPLETE STORY STRUCTURE:
{outline}

BOOK DETAILS:
- Genre: {genre}
- Target Audience: {targetAudience}
- Number of Chapters: {numChapters}
- Target Words per Chapter: {targetWordCount}

CREATE DETAILED CHAPTER BREAKDOWN:

For each chapter (1-{numChapters}), provide:

1. **CHAPTER TITLE** (compelling and genre-appropriate)

2. **SCENE STRUCTURE**:
   - Opening: Strong hook or continuation from previous chapter
   - 2-3 KEY PLOT BEATS that advance the main story
   - Character development moments and emotional beats
   - Chapter climax: Tension peak or revelation
   - Ending: Transition hook for next chapter

3. **SPECIFIC DETAILS**:
   - POV Character (if applicable)
   - Setting/Location
   - Main conflicts/obstacles in this chapter
   - Character interactions and relationship development
   - Clues, revelations, or plot advancement

4. **WORD COUNT TARGET**: {targetWordCount} words (adjust based on chapter importance)

5. **CONTINUITY NOTES**: Key details for maintaining consistency

PACING REQUIREMENTS:
- Maintain {genre} genre pacing throughout
- Balance action, dialogue, and description
- Ensure each chapter ends with reader engagement
- Build tension appropriately toward climax
- Include proper character development beats

Format as clear, numbered chapters with all details for seamless writing execution.`, 

    writing: `You are a master storyteller and bestselling author writing Chapter {chapterNum} of a {genre} novel. Create engaging, high-quality prose that brings the story to life.

CRITICAL CONTEXT:
{contextInfo}

CHAPTER {chapterNum} DETAILED PLAN:
{chapterOutline}

PREVIOUS CHAPTER ENDING (for seamless continuity):
{previousChapterEnding}

SCENE STRUCTURE REQUIREMENTS:
- **Opening**: Strong scene opener that hooks readers and flows from previous chapter
- **Development**: 2-3 key plot beats that advance the story as outlined
- **Character Moments**: Include emotional beats and character development
- **Climax**: Chapter tension peak or revelation as planned
- **Ending**: Compelling transition hook for next chapter

PROSE REQUIREMENTS FOR {genre}:
- **Dialogue**: 40% - Create distinct character voices and natural conversations
- **Action/Events**: 30% - Show don't tell for major plot developments
- **Description/Atmosphere**: 30% - Vivid settings and emotional atmosphere
- **Pacing**: {genre}-appropriate rhythm and tension building
- **Style**: {styleDirection}

GENRE-SPECIFIC ELEMENTS:
{genreSpecificElements}

WRITING STANDARDS:
- Target length: {targetWordCount} words
- Appropriate for {targetAudience}
- Maintain continuity with previous chapters
- Follow chapter outline precisely - no deviations
- Include proper scene transitions and emotional beats
- End with appropriate tension level as outlined

Write Chapter {chapterNum} with compelling, publishable prose that advances the plot exactly as planned while creating an immersive reading experience.`, 

    randomIdea: `You are a creative genius and bestselling author brainstorming machine. Generate a completely original, commercially viable book idea that would captivate readers and become a bestseller.

REQUIREMENTS:
- Genre: {genre}
- Target Audience: {targetAudience}

Create a unique book concept that includes:

1. **PREMISE** (2-3 sentences): A compelling, original premise that hooks readers immediately. Make it unique, intriguing, and marketable. Avoid clichés and overused tropes. Think of concepts that would make someone say "I've never read anything like this before!"

2. **STYLE DIRECTION** (1-2 sentences): Specify the writing style that would best serve this story and appeal to the target audience. Consider pacing, tone, voice, and literary techniques.

3. **CHAPTER COUNT**: Recommend the optimal number of chapters for this story and audience (children's: 8-15, YA: 15-25, adult: 12-30).

GUIDELINES:
- Be innovative and surprising - avoid predictable plots
- Ensure appropriate for target audience
- Think about bestseller elements in this genre
- Consider current trends while remaining timeless
- Make emotionally compelling and relatable
- Ensure sufficient depth for suggested length

FORMAT YOUR RESPONSE EXACTLY AS:
PREMISE: [Your 2-3 sentence premise here]
STYLE: [Your 1-2 sentence style direction here]  
CHAPTERS: [Number only]`,
    bookTitle: `You are a bestselling book marketing expert and title creation genius. Create an irresistible, clickbait-worthy book title and compelling blurb that will make readers immediately want to purchase and read this book.

BOOK DETAILS:
- Genre: {genre}
- Target Audience: {targetAudience}
- Premise: {premise}
- Style Direction: {styleDirection}

COMPLETE STORY STRUCTURE:
{outline}

DETAILED CHAPTER PLAN:
{chapterOutline}

CREATE:

1. **BOOK TITLE**: A powerful, attention-grabbing title that:
   - Makes readers stop scrolling and say "I NEED to read this!"
   - Perfectly captures the genre and audience expectations
   - Uses proven bestselling title formulas for {genre}
   - Is memorable, intriguing, and marketable
   - Has emotional hooks that create immediate desire

2. **BOOK BLURB** (150-200 words): A compelling back-cover description that:
   - Opens with an irresistible hook that grabs attention instantly
   - Introduces the main character(s) and their compelling situation
   - Presents the central conflict/stakes in an exciting way
   - Creates urgency and emotional investment
   - Ends with a cliffhanger question that demands answers
   - Uses power words and emotional triggers for {targetAudience}
   - Follows proven bestselling blurb formulas for {genre}

MARKET RESEARCH: Consider what makes {genre} titles successful in today's market. Think of titles that would trend on social media, generate word-of-mouth, and create instant recognition.

FORMAT YOUR RESPONSE EXACTLY AS:
TITLE: [Your amazing title here]

BLURB: [Your compelling 150-200 word blurb here]

Make this book impossible to ignore!`,
    analysis: `You are a professional editor and story consultant with 20+ years of experience analyzing {contentType} for {genre} novels targeting {targetAudience}. Provide detailed, actionable feedback while maintaining the established parameters.

CONTENT TO ANALYZE:
{content}

ESTABLISHED PARAMETERS TO MAINTAIN:
- Genre: {genre}
- Target Audience: {targetAudience}
- Premise: {premise}
- Style Direction: {styleDirection}
- Target Chapter Word Count: {targetWordCount}
- Number of Chapters: {numChapters}

ANALYZE WITH FOCUS ON:

1. **ADHERENCE TO ESTABLISHED PARAMETERS**:
   - Does content match the specified genre conventions?
   - Is style consistent with stated direction?
   - Are chapter lengths appropriate for target word count?
   - Does it serve the target audience effectively?

2. **STRUCTURAL COHERENCE**:
   - Plot consistency and logical flow
   - Character development and motivation
   - Pacing appropriate for {genre} and {targetAudience}
   - Genre-specific requirements fulfillment

3. **COMMERCIAL VIABILITY**:
   - Market appeal for {targetAudience}
   - Competitive positioning in {genre}
   - Emotional engagement and reader retention
   - Bestseller potential elements

4. **TECHNICAL CRAFT**:
   - Prose quality and clarity
   - Dialogue effectiveness and authenticity
   - Descriptive balance and atmosphere
   - Voice consistency throughout

5. **PRIORITY IMPROVEMENTS**:
   - List 3-5 specific, actionable improvements
   - Rank by importance to commercial success
   - Provide concrete solutions for each issue
   - Ensure suggestions maintain established parameters

CRITICAL: All feedback must respect and maintain the core premise, style direction, target audience, and technical specifications already established. Focus on enhancing execution within these constraints.`, 
    improvement: `You are a master storyteller and professional editor. Improve the {contentType} based on the analysis while strictly maintaining all established book parameters and requirements.

ORIGINAL CONTENT:
{originalContent}

FEEDBACK TO ADDRESS:
{feedbackContent}

MANDATORY PARAMETERS TO MAINTAIN:
- Genre: {genre} - Follow all genre conventions and expectations
- Target Audience: {targetAudience} - Keep language and content appropriate
- Premise: {premise} - Preserve the core story concept
- Style Direction: {styleDirection} - Maintain the specified writing style
- Target Word Count: {targetWordCount} words per chapter (if applicable)
- Number of Chapters: {numChapters} (maintain story structure)

IMPROVEMENT REQUIREMENTS:
1. Address ALL critical issues identified in the feedback
2. Enhance execution while preserving established parameters
3. Maintain character consistency and story logic
4. Improve commercial appeal for {targetAudience}
5. Strengthen {genre} elements and tropes
6. Enhance emotional engagement and readability
7. Keep the improved version within target length specifications

SPECIFIC GUIDELINES:
- If improving chapters, maintain target word count of {targetWordCount}
- Preserve character voices and development arcs
- Maintain plot consistency with overall story structure
- Enhance dialogue quality and authenticity
- Improve pacing for {genre} expectations
- Strengthen emotional beats and tension

Create a significantly improved version that addresses the feedback comprehensively while maintaining the artistic and commercial vision. The result should feel like a polished, professional upgrade of the original content.

Write the complete improved {contentType} with all enhancements seamlessly integrated.`, 
    manualImprovement: `You are a master storyteller and professional editor. Improve the {contentType} based on the specific feedback provided while maintaining all established book parameters unless explicitly overridden by the manual instructions.

ORIGINAL CONTENT:
{originalContent}

MANUAL FEEDBACK AND INSTRUCTIONS:
{manualFeedback}

ESTABLISHED PARAMETERS (maintain unless overridden by manual feedback):
- Genre: {genre}
- Target Audience: {targetAudience}  
- Premise: {premise}
- Style Direction: {styleDirection}
- Target Word Count: {targetWordCount} words per chapter (if applicable)
- Number of Chapters: {numChapters}

IMPROVEMENT APPROACH:
1. Prioritize the specific requests in the manual feedback above all else
2. If manual feedback conflicts with established parameters, follow the manual feedback
3. If manual feedback doesn't specify changes to parameters, maintain them
4. Address all points raised in the manual feedback thoroughly
5. Maintain story coherence and character consistency
6. Ensure the result serves the target audience effectively

EXECUTION GUIDELINES:
- Follow manual instructions precisely, even if they deviate from original parameters
- If word count changes are requested, adjust accordingly
- If style changes are requested, implement them while maintaining quality
- If plot changes are requested, ensure logical consistency
- Maintain professional writing quality throughout
- Preserve character development and story logic unless specifically asked to change

Create an improved version that perfectly addresses the manual feedback while maintaining the highest standards of storytelling craft.`
};

// ==================================================
// THEME MANAGEMENT
// ==================================================

const themes = ['light', 'dark', 'fun'];

/**
 * Change theme based on dropdown selection
 */
function changeTheme() {
    const selectedTheme = document.getElementById('theme-select').value;
    setTheme(selectedTheme);
}

/**
 * Set application theme
 * @param {string} theme - Theme name
 */
function setTheme(theme) {
    currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('novelfactory_theme', theme);
    document.getElementById('theme-select').value = theme;
}

/**
 * Toggle through themes programmatically
 */
function toggleTheme() {
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
}

// ==================================================
// NAVIGATION SYSTEM
// ==================================================

/**
 * Show specific step and handle initialization
 * @param {string} stepName - Step identifier
 */
function showStep(stepName) {
    // Hide all steps
    const steps = document.querySelectorAll('.step');
    steps.forEach(step => step.classList.remove('active'));
    
    // Remove active class from all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    // Show selected step
    const targetStep = document.getElementById(stepName);
    if (targetStep) {
        targetStep.classList.add('active');
    }
    
    // Add active class to clicked nav item
    const activeNavItem = document.querySelector(`[data-step="${stepName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Special handling for writing step - ensure it's properly initialized
    if (stepName === 'writing') {
        ensureWritingInterfaceInitialized();
    }
    
    // Special handling for export step - update stats
    if (stepName === 'export') {
        updateBookStats();
    }
    
    bookData.currentStep = stepName;
    updateNavProgress();
    autoSave();
}

/**
 * Ensure writing interface is properly initialized when accessed
 */
function ensureWritingInterfaceInitialized() {
    const container = document.getElementById('chapters-container');
    const placeholder = container.querySelector('.writing-placeholder');
    
    // Check if interface needs initialization
    if (placeholder || container.children.length === 0 || container.innerHTML.includes('Setting up')) {
        setupWritingInterface();
    }
}

/**
 * Update navigation progress indicator
 */
function updateNavProgress() {
    const steps = ['setup', 'outline', 'chapters', 'writing', 'export'];
    const currentIndex = steps.indexOf(bookData.currentStep);
    const progress = currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;
    
    const progressLine = document.getElementById('nav-progress-line');
    if (progressLine) {
        progressLine.style.width = `${progress}%`;
    }
    
    // Mark completed steps
    steps.forEach((step, index) => {
        const navItem = document.querySelector(`[data-step="${step}"]`);
        if (navItem) {
            if (index < currentIndex) {
                navItem.classList.add('completed');
            } else {
                navItem.classList.remove('completed');
            }
        }
    });
}

// ==================================================
// COLLAPSIBLE SECTIONS
// ==================================================

/**
 * Toggle collapsible section visibility
 * @param {HTMLElement} header - Section header element
 */
function toggleCollapsibleSection(header) {
    const section = header.closest('.collapsible-section');
    const content = section.querySelector('.collapsible-content');
    const icon = header.querySelector('.toggle-icon');
    
    if (content.style.display === 'none' || !content.style.display) {
        content.style.display = 'block';
        icon.textContent = '▲';
        section.classList.add('expanded');
    } else {
        content.style.display = 'none';
        icon.textContent = '▼';
        section.classList.remove('expanded');
    }
}

/**
 * Toggle advanced models section specifically
 */
function toggleAdvancedModelsSection() {
    const section = document.querySelector('.advanced-models-section');
    const content = section.querySelector('.collapsible-content');
    const icon = section.querySelector('.toggle-icon');
    
    if (content.style.display === 'none' || !content.style.display) {
        content.style.display = 'block';
        icon.textContent = '▲';
        section.classList.add('expanded');
    } else {
        content.style.display = 'none';
        icon.textContent = '▼';
        section.classList.remove('expanded');
    }
}

/**
 * Collapse toggle removed for per-chapter controls
 * (Global "Collapse Chapters" button is no longer used)
 */

// ==================================================
// EVENT LISTENERS SETUP
// ==================================================

/**
 * Set up all event listeners for the application
 */
function setupEventListeners() {
    const genreSelect = document.getElementById('genre');
    const audienceSelect = document.getElementById('target-audience');
    
    // Random idea button visibility
    function checkRandomButtonVisibility() {
        const randomBtn = document.getElementById('random-idea-btn');
        if (genreSelect.value && audienceSelect.value) {
            randomBtn.style.display = 'inline-flex';
        } else {
            randomBtn.style.display = 'none';
        }
    }
    
    if (genreSelect) genreSelect.addEventListener('change', checkRandomButtonVisibility);
    if (audienceSelect) audienceSelect.addEventListener('change', checkRandomButtonVisibility);

    // Word count updates
    const premise = document.getElementById('premise');
    const styleDirection = document.getElementById('style-direction');
    if (premise) premise.addEventListener('input', updateWordCount);
    if (styleDirection) styleDirection.addEventListener('input', updateWordCount);
    
    // Feedback mode change listeners
    ['outline', 'chapters', 'writing'].forEach(step => {
        const select = document.getElementById(`${step}-feedback-mode`);
        if (select) {
            select.addEventListener('change', () => toggleManualFeedback(step));
        }
    });

    // Project selector change listener
    const projectSelect = document.getElementById('project-select');
    if (projectSelect) {
        projectSelect.addEventListener('change', function() {
            updateDeleteButtonVisibility();
        });
    }

    // Custom donation amount handling
    const customAmountInput = document.getElementById('custom-donation-amount');
    if (customAmountInput) {
        customAmountInput.addEventListener('input', function() {
            if (this.value) {
                document.querySelectorAll('.donation-amount').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                document.getElementById('donate-btn').innerHTML = `<span class="label">Donate $${this.value}</span>`;
                selectedDonationAmount = parseFloat(this.value);
            }
        });
    }

    // Expand textarea word count tracking
    const expandTextarea = document.getElementById('expand-textarea');
    if (expandTextarea) {
        expandTextarea.addEventListener('input', updateExpandedWordCount);
    }
}

// ==================================================
// KEYBOARD SHORTCUTS
// ==================================================

/**
 * Set up keyboard shortcuts for power users
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 's':
                    e.preventDefault();
                    autoSave();
                    break;
                case 'g':
                    e.preventDefault();
                    if (bookData.currentStep === 'outline') generateOutline();
                    else if (bookData.currentStep === 'chapters') generateChapterOutline();
                    break;
                case 'd':
                    e.preventDefault();
                    toggleTheme();
                    break;
            }
        }
        if (e.key === 'Escape') {
            // Close any open modals
            closeExpandModal();
            closeOneClickModal();
            closeFeedbackModal();
            closeDonationModal();
            closeCustomAlert(false);
            closeProjectManagementModal();
            closeCustomInput(null);
        }
    });
}

// ==================================================
// FEEDBACK SYSTEM
// ==================================================

/**
 * Toggle manual feedback input visibility
 * @param {string} step - Step identifier
 */
function toggleManualFeedback(step) {
    const mode = document.getElementById(`${step}-feedback-mode`).value;
    const manualSection = document.getElementById(`${step}-manual-feedback`);
    
    if (manualSection) {
        manualSection.style.display = mode === 'manual' ? 'block' : 'none';
    }
}

/**
 * Run feedback loop for content improvement
 * @param {string} contentType - Type of content to improve
 */
async function runFeedbackLoop(contentType) {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    isGenerating = true;
    showGenerationInfo(`Running ${contentType} feedback analysis...`);
    
    try {
        const feedbackLoops = parseInt(document.getElementById(`${contentType}-feedback-loops`).value);
        if (feedbackLoops === 0) return;

        const feedbackMode = document.getElementById(`${contentType}-feedback-mode`).value;
        let content = getContentForFeedback(contentType);

        if (!content) {
            await customAlert(`No ${contentType} content to analyze. Please generate content first.`, 'No Content');
            return;
        }

        // Get manual feedback if in manual mode
        let manualFeedback = '';
        if (feedbackMode === 'manual') {
            manualFeedback = document.getElementById(`${contentType}-manual-input`).value;
            if (!manualFeedback.trim()) {
                await customAlert('Please provide manual feedback instructions before running the feedback loop.', 'Missing Feedback');
                return;
            }
        }

        // Run feedback loops
        const feedbackModel = getSelectedModel('feedback');
        
        for (let i = 0; i < feedbackLoops; i++) {
            showGenerationInfo(`Running ${feedbackMode} feedback loop ${i + 1} of ${feedbackLoops}...`);
            
            let improvedContent;
            
            if (feedbackMode === 'manual') {
                improvedContent = await runManualFeedback(contentType, content, manualFeedback, feedbackModel);
            } else {
                improvedContent = await runAIFeedback(contentType, content, feedbackModel);
            }
            
            content = improvedContent;
            updateContentAfterFeedback(contentType, improvedContent);
            autoSave();
        }
        
    } catch (error) {
        await customAlert(`Error in feedback loop: ${error.message}`, 'Feedback Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Get content for feedback analysis
 * @param {string} contentType - Type of content
 * @returns {string} Content text
 */
function getContentForFeedback(contentType) {
    switch(contentType) {
        case 'outline':
            return bookData.outline;
        case 'chapters':
            return bookData.chapterOutline;
        case 'writing':
            return bookData.chapters.filter(c => c).join('\n\n---\n\n');
        default:
            return '';
    }
}

/**
 * Update content after feedback improvement
 * @param {string} contentType - Type of content
 * @param {string} improvedContent - Improved content
 */
function updateContentAfterFeedback(contentType, improvedContent) {
    switch(contentType) {
        case 'outline':
            bookData.outline = improvedContent;
            const outlineContent = document.getElementById('outline-content');
            if (outlineContent) {
                outlineContent.value = improvedContent;
                saveOutlineContent();
            }
            break;
        case 'chapters':
            bookData.chapterOutline = improvedContent;
            const chaptersContent = document.getElementById('chapters-content');
            if (chaptersContent) {
                chaptersContent.value = improvedContent;
                saveChaptersContent();
            }
            break;
        case 'writing':
            // For writing feedback, this would need more complex handling
            // This is simplified for the current implementation
            break;
    }
}

// ==================================================
// AI API FUNCTIONS
// ==================================================

/**
 * Make API call to AI service
 * @param {string} prompt - User prompt
 * @param {string} systemPrompt - System prompt
 * @param {string} model - Model to use
 * @returns {Promise<string>} AI response
 */
async function callAI(prompt, systemPrompt = "", model = null) {
    const settings = getAISettings(model);
    
    if (!settings.apiKey) {
        throw new Error('Please enter your API key in the AI Settings page.');
    }

    const messages = [
        {
            role: "user",
            content: prompt
        }
    ];

    if (systemPrompt) {
        messages.unshift({
            role: "system",
            content: systemPrompt
        });
    }

    let apiUrl, headers, body;
    
    if (settings.apiProvider === 'openrouter') {
        apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
        headers = {
            'Authorization': `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://novelfactory.ink',
            'X-Title': 'NovelFactory',
        };
        body = {
            model: settings.model,
            messages: messages,
            temperature: settings.temperature,
            max_tokens: settings.maxTokens
        };
    } else {
        apiUrl = 'https://api.openai.com/v1/chat/completions';
        headers = {
            'Authorization': `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json'
        };
        
        const isGPT5 = settings.model.includes('gpt-5');
        body = {
            model: settings.model,
            messages: messages,
            temperature: settings.temperature
        };
        
        if (isGPT5) {
            body.max_completion_tokens = settings.maxTokens;
        } else {
            body.max_tokens = settings.maxTokens;
        }
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        throw new Error(`API call failed: ${error.message}`);
    }
}

/**
 * Get AI settings for API call
 * @param {string} model - Optional specific model
 * @returns {Object} AI settings
 */
function getAISettings(model = null) {
    const provider = aiSettings.apiProvider;
    let apiKey = '';
    
    if (provider === 'openrouter') {
        apiKey = document.getElementById('openrouter-api-key')?.value || aiSettings.openrouterApiKey || '';
    } else {
        apiKey = document.getElementById('openai-api-key')?.value || aiSettings.openaiApiKey || '';
    }

    const selectedModel = model || document.getElementById('model-select')?.value || aiSettings.model || 'anthropic/claude-sonnet-4';
    
    return {
        apiProvider: provider,
        apiKey: apiKey,
        model: selectedModel,
        temperature: parseFloat(document.getElementById('temperature')?.value || aiSettings.temperature),
        maxTokens: parseInt(document.getElementById('max-tokens')?.value || aiSettings.maxTokens)
    };
}

/**
 * Format prompt template with replacements
 * @param {string} template - Prompt template
 * @param {Object} replacements - Replacement values
 * @returns {string} Formatted prompt
 */
function formatPrompt(template, replacements) {
    let formatted = template;
    for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`{${key}}`, 'g');
        formatted = formatted.replace(regex, value || '');
    }
    return formatted;
}

// ==================================================
// ADVANCED MODEL SELECTION
// ==================================================

/**
 * Get selected model for specific step
 * @param {string} step - Generation step
 * @returns {string} Model identifier
 */
function getSelectedModel(step) {
    if (!step) {
        return document.getElementById('model-select')?.value || aiSettings.model || 'anthropic/claude-sonnet-4';
    }
    
    const checkbox = document.getElementById('enable-advanced-models');
    const advancedModelsEnabled = checkbox ? checkbox.checked : false;
    
    if (advancedModelsEnabled && aiSettings && aiSettings.advancedModels && aiSettings.advancedModels[step]) {
        return aiSettings.advancedModels[step];
    }
    
    return document.getElementById('model-select')?.value || aiSettings.model || 'anthropic/claude-sonnet-4';
}

/**
 * Save advanced model settings
 */
function saveAdvancedModelSettings() {
    const advancedModels = {};
    
    ['outline', 'chapters', 'writing', 'feedback', 'randomIdea', 'bookTitle'].forEach(step => {
        const select = document.getElementById(`advanced-model-${step}`);
        if (select && select.value) {
            advancedModels[step] = select.value;
        }
    });
    
    aiSettings.advancedModels = advancedModels;
    aiSettings.advancedModelsEnabled = document.getElementById('enable-advanced-models')?.checked || false;
    
    saveSettings();
}

/**
 * Reset advanced model settings to defaults
 */
function resetAdvancedModelSettings() {
    ['outline', 'chapters', 'writing', 'feedback', 'randomIdea', 'bookTitle'].forEach(step => {
        const select = document.getElementById(`advanced-model-${step}`);
        if (select) {
            select.value = '';
        }
    });
    
    const checkbox = document.getElementById('enable-advanced-models');
    if (checkbox) {
        checkbox.checked = false;
    }
    
    aiSettings.advancedModels = {};
    aiSettings.advancedModelsEnabled = false;
    saveSettings();
    
    updateAdvancedModelsVisualState();
}

/**
 * Update visual state of advanced models section
 */
function updateAdvancedModelsVisualState() {
    const checkbox = document.getElementById('enable-advanced-models');
    const selects = document.querySelectorAll('[id^="advanced-model-"]');
    const statusElement = document.getElementById('advanced-models-status');
    const expandableSection = document.getElementById('advanced-models-expandable');
    
    if (checkbox) {
        const isEnabled = checkbox.checked;
        
        // Update model selects
        selects.forEach(select => {
            select.disabled = !isEnabled;
            select.style.opacity = isEnabled ? '1' : '0.5';
        });
        
        // Update status text and styling
        if (statusElement) {
            statusElement.textContent = isEnabled ? 'Enabled' : 'Disabled';
            statusElement.classList.toggle('enabled', isEnabled);
        }
        
        // Show/hide expandable section with animation
        if (expandableSection) {
            if (isEnabled) {
                expandableSection.style.display = 'block';
                // Trigger animation by adding class after display
                setTimeout(() => {
                    expandableSection.classList.add('expanded');
                }, 10);
            } else {
                expandableSection.classList.remove('expanded');
                // Hide after animation completes
                setTimeout(() => {
                    if (!checkbox.checked) { // Double-check state hasn't changed
                        expandableSection.style.display = 'none';
                    }
                }, 300);
            }
        }
    }
}

/**
 * Update model select dropdowns
 */
function updateModelSelect() {
    updateMainModelSelect();
    updateAdvancedModelSelects();
}

/**
 * Update main model selection dropdown
 */
function updateMainModelSelect() {
    const modelSelect = document.getElementById('model-select');
    if (!modelSelect) return;
    
    modelSelect.innerHTML = '';
    const provider = aiSettings.apiProvider || 'openrouter';
    const models = apiModels[provider];

    if (!models) return;

    function createOptions(modelArray, groupLabel) {
        if (!modelArray || modelArray.length === 0) return;
        
        const group = document.createElement('optgroup');
        group.label = groupLabel;
        
        modelArray.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.label;
            
            if (model.cost) {
                option.title = `Input: $${model.cost.input}/1M tokens | Output: $${model.cost.output}/1M tokens`;
            }
            
            if (aiSettings.model === model.value) {
                option.selected = true;
            }
            
            group.appendChild(option);
        });
        
        modelSelect.appendChild(group);
    }

    if (models.Recommended && models.Recommended.length) {
        createOptions(models.Recommended, 'Recommended Models');
    }

    if (models.More && models.More.length) {
        createOptions(models.More, 'More Models');
    }

    updateModelInfo();
}

/**
 * Update advanced model selection dropdowns
 */
function updateAdvancedModelSelects() {
    ['outline', 'chapters', 'writing', 'feedback', 'randomIdea', 'bookTitle'].forEach(step => {
        updateAdvancedModelSelect(`advanced-model-${step}`);
    });
    
    // Load saved advanced model settings
    loadSavedAdvancedModels();
    updateAdvancedModelsVisualState();
}

/**
 * Update individual advanced model select
 * @param {string} selectId - Select element ID
 */
function updateAdvancedModelSelect(selectId) {
    const modelSelect = document.getElementById(selectId);
    if (!modelSelect) return;
    
    const provider = aiSettings.apiProvider || 'openrouter';
    const models = apiModels[provider];
    if (!models) return;

    modelSelect.innerHTML = '';

    // Add empty option first
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Use Default Model';
    emptyOption.style.fontStyle = 'italic';
    modelSelect.appendChild(emptyOption);

    function createOptions(modelArray, groupLabel) {
        if (!modelArray || modelArray.length === 0) return;
        
        const group = document.createElement('optgroup');
        group.label = groupLabel;
        
        modelArray.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.label;
            
            if (model.cost) {
                option.title = `Input: $${model.cost.input}/1M tokens | Output: $${model.cost.output}/1M tokens`;
            }
            
            group.appendChild(option);
        });
        
        modelSelect.appendChild(group);
    }

    if (models.Recommended && models.Recommended.length) {
        createOptions(models.Recommended, 'Recommended');
    }

    if (models.More && models.More.length) {
        createOptions(models.More, 'More');
    }
}

/**
 * Load saved advanced model settings
 */
function loadSavedAdvancedModels() {
    if (!aiSettings.advancedModels) return;
    
    const checkbox = document.getElementById('enable-advanced-models');
    if (checkbox) {
        checkbox.checked = aiSettings.advancedModelsEnabled || false;
    }
    
    Object.entries(aiSettings.advancedModels).forEach(([step, model]) => {
        const select = document.getElementById(`advanced-model-${step}`);
        if (select) {
            const isAvailable = Array.from(select.options).some(option => option.value === model);
            if (isAvailable) {
                select.value = model;
            } else {
                delete aiSettings.advancedModels[step];
            }
        }
    });
}

/**
 * Switch API provider
 * @param {string} provider - Provider name
 */
function switchApiProvider(provider) {
    aiSettings.apiProvider = provider;
    
    // Update toggle buttons
    const openrouterBtn = document.getElementById('openrouter-btn');
    const openaiBtn = document.getElementById('openai-btn');
    
    if (openrouterBtn && openaiBtn) {
        openrouterBtn.classList.toggle('active', provider === 'openrouter');
        openaiBtn.classList.toggle('active', provider === 'openai');
    }
    
    // Show/hide appropriate API key fields
    const openrouterGroup = document.getElementById('openrouter-key-group');
    const openaiGroup = document.getElementById('openai-key-group');
    
    if (openrouterGroup && openaiGroup) {
        if (provider === 'openrouter') {
            openrouterGroup.style.display = 'block';
            openaiGroup.style.display = 'none';
        } else {
            openrouterGroup.style.display = 'none';
            openaiGroup.style.display = 'block';
        }
    }
    
    updateModelSelect();
    saveSettings();
}

// ==================================================
// RANDOM IDEA GENERATION
// ==================================================

/**
 * Generate random book idea based on genre and audience
 */
async function generateRandomIdea() {
    const randomBtn = document.getElementById('random-idea-btn');

    if (isGenerating) {
        showGenerationInfo("Please wait until the current generation is finished...");
        return;
    }

    const genre = document.getElementById('genre').value;
    const audience = document.getElementById('target-audience').value;

    if (!genre || !audience) {
        await customAlert('Please select genre and target audience first!', 'Missing Information');
        return;
    }

    isGenerating = true;
    showGenerationInfo("AI is crafting your unique story idea...");
    randomBtn.disabled = true;

    try {
        const selectedModel = getSelectedModel('randomIdea');
        
        const prompt = formatPrompt(aiSettings.customPrompts.randomIdea || defaultPrompts.randomIdea, {
            genre: genre.replace('-', ' '),
            targetAudience: audience.replace('-', ' ')
        });

        const aiResponse = await callAI(prompt, "You are a master storyteller and creative genius specializing in generating original, bestselling book concepts.", selectedModel);
        
        // Parse the AI response
        const lines = aiResponse.split('\n');
        let premise = '';
        let style = '';
        let chapters = '20';

        for (const line of lines) {
            if (line.startsWith('PREMISE:')) {
                premise = line.replace('PREMISE:', '').trim();
            } else if (line.startsWith('STYLE:')) {
                style = line.replace('STYLE:', '').trim();
            } else if (line.startsWith('CHAPTERS:')) {
                chapters = line.replace('CHAPTERS:', '').trim().match(/\d+/)?.[0] || '20';
            }
        }

        // Fallback parsing if structured format not found
        if (!premise || !style) {
            const paragraphs = aiResponse.split('\n\n');
            if (paragraphs.length >= 2) {
                premise = premise || paragraphs[0];
                style = style || paragraphs[1];
            } else {
                premise = aiResponse;
                style = "Engaging and well-paced narrative style appropriate for the target audience";
            }
        }

        // Update form fields
        document.getElementById('premise').value = premise;
        document.getElementById('style-direction').value = style;
        document.getElementById('num-chapters').value = chapters;
        
        updateWordCount();
        updateChapterEstimate();
        autoSave();

        isGenerating = false;
        hideGenerationInfo();
        randomBtn.disabled = false;

        await customAlert('Unique book idea generated by AI! Review and modify as needed, then click "Start Creating Book" when ready.', 'Idea Generated');

    } catch (error) {
        isGenerating = false;
        hideGenerationInfo();
        randomBtn.disabled = false;
        
        await customAlert(`Error generating random idea: ${error.message}`, 'Generation Error');
    }
}

// ==================================================
// BOOK GENERATION FUNCTIONS
// ==================================================

/**
 * Collect book data from form fields
 */
function collectBookData() {
    bookData.genre = document.getElementById('genre').value;
    bookData.targetAudience = document.getElementById('target-audience').value;
    bookData.premise = document.getElementById('premise').value;
    bookData.styleDirection = document.getElementById('style-direction').value;
    bookData.numChapters = parseInt(document.getElementById('num-chapters').value) || 20;
    bookData.targetWordCount = parseInt(document.getElementById('target-word-count').value) || 2000;
    
    const currentStep = document.querySelector('.step.active')?.id;
    if (currentStep) {
        bookData.currentStep = currentStep;
    }
    
    bookData.lastSaved = new Date().toISOString();
}

/**
 * Generate story outline
 */
async function generateOutline() {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    isGenerating = true;
    showGenerationInfo("Generating complete story structure with integrated characters...");

    try {
        collectBookData();
        
        const act1End = Math.ceil(bookData.numChapters * 0.25);
        const act2Start = act1End + 1;
        const act2End = Math.ceil(bookData.numChapters * 0.75);
        const act3Start = act2End + 1;

        const genreReq = genreRequirements[bookData.genre] || { requirements: '', pacing: '' };
        const genreRequirementsText = `${genreReq.requirements}\nPacing: ${genreReq.pacing}`;

        const selectedModel = getSelectedModel('outline');

        const prompt = formatPrompt(document.getElementById('outline-prompt').value, {
            genre: bookData.genre,
            targetAudience: bookData.targetAudience,
            premise: bookData.premise,
            styleDirection: bookData.styleDirection,
            numChapters: bookData.numChapters,
            act1End: act1End,
            act2Start: act2Start,
            act2End: act2End,
            act3Start: act3Start,
            genreRequirements: genreRequirementsText
        });

        const outline = await callAI(prompt, "You are a master storyteller and bestselling author creating commercially successful story structures.", selectedModel);
        
        const outlineTextarea = document.getElementById('outline-content');
        if (outlineTextarea) {
            outlineTextarea.value = outline;
            saveOutlineContent();
        }
        
        const outlineNavItem = document.querySelector('[data-step="outline"]');
        if (outlineNavItem) outlineNavItem.classList.add('completed');

    } catch (error) {
        await customAlert(`Error generating story structure: ${error.message}`, 'Generation Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Regenerate story outline
 */
async function regenerateOutline() {
    await generateOutline();
}

/**
 * Proceed to chapters step
 */
function proceedToChapters() {
    showStep('chapters');
}

/**
 * Generate chapter outline
 */
async function generateChapterOutline() {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    isGenerating = true;
    showGenerationInfo("Creating detailed chapter plan with scene breakdowns...");

    try {
        const selectedModel = getSelectedModel('chapters');
        
        const prompt = formatPrompt(document.getElementById('chapters-prompt').value, {
            outline: bookData.outline,
            genre: bookData.genre,
            targetAudience: bookData.targetAudience,
            numChapters: bookData.numChapters,
            targetWordCount: bookData.targetWordCount
        });

        const chapterOutline = await callAI(prompt, "You are a master storyteller creating detailed chapter breakdowns for commercially successful novels.", selectedModel);
        
        // Generate book title and blurb
        showGenerationInfo("Generating compelling book title and blurb...");
        
        const titleModel = getSelectedModel('bookTitle');
        
        const titleBlurbPrompt = formatPrompt(aiSettings.customPrompts.bookTitle || defaultPrompts.bookTitle, {
            genre: bookData.genre,
            targetAudience: bookData.targetAudience,
            premise: bookData.premise,
            styleDirection: bookData.styleDirection,
            outline: bookData.outline,
            chapterOutline: chapterOutline
        });

        const titleBlurbResponse = await callAI(titleBlurbPrompt, "You are a bestselling book marketing expert and title creation genius.", titleModel);
        
        // Parse title and blurb from response
        const lines = titleBlurbResponse.split('\n');
        let title = '';
        let blurb = '';
        let collectingBlurb = false;

        for (const line of lines) {
            if (line.startsWith('TITLE:')) {
                title = line.replace('TITLE:', '').trim();
            } else if (line.startsWith('BLURB:')) {
                blurb = line.replace('BLURB:', '').trim();
                collectingBlurb = true;
            } else if (collectingBlurb && line.trim()) {
                blurb += ' ' + line.trim();
            }
        }

        bookData.title = title || extractFirstSentence(bookData.premise);
        bookData.blurb = blurb || bookData.premise;

        const titleBlurbSection = `BOOK TITLE: "${bookData.title}"\n\nBOOK BLURB:\n${bookData.blurb}\n\n${'='.repeat(50)}\n\n`;
        const finalContent = titleBlurbSection + chapterOutline;
        
        const chaptersTextarea = document.getElementById('chapters-content');
        if (chaptersTextarea) {
            chaptersTextarea.value = finalContent;
            saveChaptersContent();
        }
        
        const chaptersNavItem = document.querySelector('[data-step="chapters"]');
        if (chaptersNavItem) chaptersNavItem.classList.add('completed');

    } catch (error) {
        await customAlert(`Error generating chapter plan: ${error.message}`, 'Generation Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Regenerate chapter outline
 */
async function regenerateChapterOutline() {
    await generateChapterOutline();
}

/**
 * Extract first sentence from text
 * @param {string} text - Input text
 * @returns {string} First sentence
 */
function extractFirstSentence(text) {
    const sentences = text.split(/[.!?]+/);
    return sentences[0]?.trim() || text.substring(0, 50);
}

/**
 * Proceed to writing step
 */
function proceedToWriting() {
    showStep('writing');
}

// ==================================================
// CONTENT HANDLERS
// ==================================================

/**
 * Save outline content and update UI
 */
function saveOutlineContent() {
    const textarea = document.getElementById('outline-content');
    if (!textarea) return;
    
    bookData.outline = textarea.value;
    
    const wordCount = countWords(textarea.value);
    const wordCountEl = document.getElementById('outline-word-count');
    if (wordCountEl) {
        wordCountEl.textContent = `${wordCount} words`;
    }
    
    const nextBtn = document.getElementById('outline-next');
    if (nextBtn) {
        nextBtn.style.display = textarea.value.trim() ? 'inline-flex' : 'none';
    }
    
    autoSave();
}

/**
 * Save chapters content and update UI
 */
function saveChaptersContent() {
    const textarea = document.getElementById('chapters-content');
    if (!textarea) return;
    
    bookData.chapterOutline = textarea.value;
    
    const wordCount = countWords(textarea.value);
    const wordCountEl = document.getElementById('chapters-word-count');
    if (wordCountEl) {
        wordCountEl.textContent = `${wordCount} words`;
    }
    
    const nextBtn = document.getElementById('chapters-next');
    if (nextBtn) {
        nextBtn.style.display = textarea.value.trim() ? 'inline-flex' : 'none';
    }
    
    autoSave();
}

/**
 * Clear outline content with confirmation
 */
async function clearOutlineContent() {
    const confirmed = await customConfirm('Are you sure you want to clear the story structure content?', 'Clear Content');
    if (confirmed) {
        const textarea = document.getElementById('outline-content');
        if (textarea) {
            textarea.value = '';
            saveOutlineContent();
        }
    }
}

/**
 * Clear chapters content with confirmation
 */
async function clearChaptersContent() {
    const confirmed = await customConfirm('Are you sure you want to clear the chapter plan content?', 'Clear Content');
    if (confirmed) {
        const textarea = document.getElementById('chapters-content');
        if (textarea) {
            textarea.value = '';
            saveChaptersContent();
        }
    }
}

// ==================================================
// WRITING INTERFACE
// ==================================================

/**
 * Set up the writing interface with chapter management
 * - Per-chapter collapse icons are added to each chapter card header
 * - Collapse/expand toggles work per chapter
 * - No global "Collapse Chapters" button
 */
function setupWritingInterface() {
    const container = document.getElementById('chapters-container');
    container.innerHTML = '';
    
    // Ensure chapters array is properly sized
    bookData.chapters = Array(bookData.numChapters).fill(null).map((_, i) => bookData.chapters[i] || '');

    // Add primary generation actions section (similar to story structure and chapter planning)
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'primary-actions-section';
    actionsDiv.innerHTML = `
        <div class="main-generation-actions">
            <button class="btn btn-primary btn-large" onclick="generateAllChapters()">
                <span class="label">Generate All Chapters</span>
            </button>
            <button class="btn btn-secondary" onclick="generateSelectedChapters()" id="generate-selected-btn" disabled>
                <span class="label">Generate Selected (0)</span>
            </button>
        </div>
        <p class="writing-hint">Tip: Type directly in chapter fields or use AI generation. Select multiple chapters for batch processing.</p>
    `;
    container.appendChild(actionsDiv);

    // Create chapter items
    for (let i = 1; i <= bookData.numChapters; i++) {
        const chapterDiv = document.createElement('div');
        chapterDiv.className = 'chapter-item';
        chapterDiv.innerHTML = `
            <div class="chapter-header" aria-label="Chapter ${i} header" style="align-items: center;">
                <div class="chapter-info">
                    <div class="chapter-checkbox">
                        <input type="checkbox" id="chapter-${i}-checkbox" onchange="updateGenerateSelectedButton()">
                        <label for="chapter-${i}-checkbox" class="checkbox-label">
                            <h4>Chapter ${i}</h4>
                        </label>
                    </div>
                    <div class="chapter-word-count" id="chapter-${i}-word-count">0 words</div>
                </div>
                <div class="chapter-actions" style="display:flex; align-items:center; gap:6px;">
                    <button class="btn btn-ghost btn-sm" onclick="generateSingleChapter(${i})" id="chapter-${i}-generate-btn">
                        <span class="label">Generate</span>
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="regenerateChapter(${i})" id="chapter-${i}-regenerate-btn">
                        <span class="label">Regenerate</span>
                    </button>
                    <button class="btn btn-success btn-sm" onclick="saveChapterContent(${i})" id="chapter-${i}-save-btn">
                        <span class="label">Save</span>
                    </button>
                    <button class="collapse-chapter-btn btn btn-ghost btn-sm" onclick="toggleChapterCollapse(${i})" title="Collapse/Expand Chapter" aria-label="Collapse/Expand Chapter">
                        <span class="icon"><i class="fas fa-angle-down"></i></span>
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="expandChapter(${i})" id="chapter-${i}-expand-btn">
                        <span class="label">Expand</span>
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="runChapterFeedback(${i})">
                        <span class="label">Improve</span>
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="clearChapterContent(${i})">
                        <span class="label">Clear</span>
                    </button>
                </div>
            </div>
            
            <div class="chapter-content-field" id="chapter-${i}-content-field" style="display: block; padding-top: 8px;">
                <div class="form-group">
                    <div class="textarea-container">
                        <textarea 
                            id="chapter-${i}-content" 
                            class="chapter-textarea" 
                            placeholder="Type your chapter content here or use AI generation above..." 
                            rows="15"
                            oninput="updateChapterContent(${i})"></textarea>
                    </div>
                </div>
            </div>

            <div class="chapter-status" id="chapter-${i}-status"></div>
        `;
        container.appendChild(chapterDiv);
    }

    // Load existing chapter content
    for (let i = 1; i <= bookData.numChapters; i++) {
        if (bookData.chapters[i - 1]) {
            document.getElementById(`chapter-${i}-content`).value = bookData.chapters[i - 1];
            updateChapterContent(i);
        }
    }

    updateOverallProgress();
}

/**
 * Update chapter content and word count
 * @param {number} chapterNum - Chapter number
 */
function updateChapterContent(chapterNum) {
    const textarea = document.getElementById(`chapter-${chapterNum}-content`);
    const content = textarea.value;
    
    bookData.chapters[chapterNum - 1] = content;
    
    const wordCount = countWords(content);
    document.getElementById(`chapter-${chapterNum}-word-count`).textContent = `${wordCount} words`;
    
    updateOverallProgress();
    autoSave();
}

// New: Per-chapter collapse toggle
/**
 * Toggle a single chapter content visibility
 * @param {number} chapterNum
 */
function toggleChapterContent(chapterNum) {
    const field = document.getElementById(`chapter-${chapterNum}-content-field`);
    if (!field) return;
    // Simple toggle
    if (field.style.display === 'none') {
        field.style.display = 'block';
    } else {
        field.style.display = 'none';
    }
    // Optional: rotate the icon (not strictly necessary for functionality)
    const iconBtn = document.querySelector(`#chapter-${chapterNum}-content-field ~ .collapse-chapter-btn`);
    // If icon rotation needed, implement here
}

/**
 * Toggle individual chapter collapse
 */
function toggleChapterCollapse(chapterNum) {
    const contentField = document.getElementById(`chapter-${chapterNum}-content-field`);
    const collapseBtn = document.querySelector(`button[onclick="toggleChapterCollapse(${chapterNum})"]`);
    if (!contentField) return;
    
    contentField.classList.toggle('collapsed');
    if (collapseBtn) {
        const icon = collapseBtn.querySelector('i');
        if (icon) {
            if (contentField.classList.contains('collapsed')) {
                icon.className = 'fas fa-angle-right';
            } else {
                icon.className = 'fas fa-angle-down';
            }
        }
    }
}

//（Continuing existing per-chapter save flow; updated to avoid Event reliance）
// Replace previous saveChapterContent to be robust and not rely on event

function toggleChapterCollapse(chapterNum) {
    const contentField = document.getElementById(`chapter-${chapterNum}-content-field`);
    const collapseBtn = document.getElementById(`chapter-${chapterNum}-collapse-btn`);
    contentField.classList.toggle('collapsed');
    collapseBtn.innerHTML = contentField.classList.contains('collapsed') ? '<span class="label">▶</span>' : '<span class="label">▼</span>';
}

/**
 * Save chapter content with visual feedback
 * @param {number} chapterNum - Chapter number
 */
function saveChapterContent(chapterNum) {
    const textarea = document.getElementById(`chapter-${chapterNum}-content`);
    bookData.chapters[chapterNum - 1] = textarea.value;
    
    const btn = document.getElementById(`chapter-${chapterNum}-save-btn`);
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="label">Saved!</span>';
        btn.style.background = 'var(--color-success)';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
        }, 1200);
    }
    
    updateChapterContent(chapterNum);
}

/**
 * Clear chapter content with confirmation
 * @param {number} chapterNum - Chapter number
 */
async function clearChapterContent(chapterNum) {
    const confirmed = await customConfirm(`Are you sure you want to clear Chapter ${chapterNum} content?`, 'Clear Content');
    if (confirmed) {
        document.getElementById(`chapter-${chapterNum}-content`).value = '';
        updateChapterContent(chapterNum);
    }
}

/**
 * Generate single chapter
 * @param {number} chapterNum - Chapter number
 */
async function generateSingleChapter(chapterNum) {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    isGenerating = true;
    showGenerationInfo(`Writing Chapter ${chapterNum}...`);
    
    document.getElementById(`chapter-${chapterNum}-status`).innerHTML = '<div class="loading"><div class="spinner"></div>Writing...</div>';
    document.getElementById(`chapter-${chapterNum}-generate-btn`).disabled = true;

    try {
        const chapterContent = await writeChapter(chapterNum);
        
        document.getElementById(`chapter-${chapterNum}-content`).value = chapterContent;
        updateChapterContent(chapterNum);
        
        document.getElementById(`chapter-${chapterNum}-status`).innerHTML = 'Generated successfully';
        
    } catch (error) {
        document.getElementById(`chapter-${chapterNum}-status`).innerHTML = `Error: ${error.message}`;
    } finally {
        document.getElementById(`chapter-${chapterNum}-generate-btn`).disabled = false;
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Write chapter content using AI
 * @param {number} chapterNum - Chapter number
 * @returns {Promise<string>} Generated chapter content
 */
async function writeChapter(chapterNum) {
    try {
        let previousChapterEnding = '';
        if (chapterNum > 1 && bookData.chapters[chapterNum - 2]) {
            const prevChapter = bookData.chapters[chapterNum - 2];
            const words = prevChapter.split(' ');
            previousChapterEnding = words.slice(-200).join(' ');
        }

        const genreReq = genreRequirements[bookData.genre] || { requirements: '', pacing: '' };
        const genreSpecificElements = `Genre Requirements: ${genreReq.requirements}\nPacing Guidelines: ${genreReq.pacing}`;

        const contextInfo = `
BOOK SETUP:
- Genre: ${bookData.genre}
- Target Audience: ${bookData.targetAudience}
- Premise: ${bookData.premise}
- Style Direction: ${bookData.styleDirection}

COMPLETE STORY STRUCTURE:
${bookData.outline}

DETAILED CHAPTER PLAN:
${bookData.chapterOutline}
        `;

        const chapterOutline = extractChapterOutline(bookData.chapterOutline, chapterNum);
        const selectedModel = getSelectedModel('writing');

        const prompt = formatPrompt(document.getElementById('writing-prompt').value, {
            chapterNum: chapterNum,
            genre: bookData.genre,
            targetAudience: bookData.targetAudience,
            styleDirection: bookData.styleDirection,
            targetWordCount: bookData.targetWordCount,
            contextInfo: contextInfo,
            chapterOutline: chapterOutline,
            previousChapterEnding: previousChapterEnding,
            genreSpecificElements: genreSpecificElements
        });

        const chapterContent = await callAI(prompt, `You are a master storyteller writing professional ${bookData.genre} fiction for ${bookData.targetAudience} readers.`, selectedModel);
        
        return chapterContent;

    } catch (error) {
        throw new Error(`Failed to write chapter ${chapterNum}: ${error.message}`);
    }
}

/**
 * Extract chapter outline from full outline
 * @param {string} fullOutline - Complete chapter outline
 * @param {number} chapterNum - Chapter number to extract
 * @returns {string} Chapter-specific outline
 */
function extractChapterOutline(fullOutline, chapterNum) {
    const lines = fullOutline.split('\n');
    const chapterLines = [];
    let capturing = false;
    
    for (const line of lines) {
        if (line.toLowerCase().includes(`chapter ${chapterNum}`)) {
            capturing = true;
            chapterLines.push(line);
        } else if (capturing && line.toLowerCase().match(/chapter \d+/)) {
            break;
        } else if (capturing) {
            chapterLines.push(line);
        }
    }
    
    return chapterLines.join('\n') || `Chapter ${chapterNum} outline not found in full outline.`;
}

/**
 * Update overall writing progress
 */
function updateOverallProgress() {
    const completedChapters = bookData.chapters.filter(ch => ch && ch.toString().trim().length > 0).length;
    const progress = (completedChapters / bookData.numChapters) * 100;

    const progressEl = document.getElementById('writing-progress');
    if (progressEl) {
        progressEl.style.width = progress + '%';
    }

    // Show/hide Next button based on completion
    const nextBtn = document.getElementById('writing-next');
    if (nextBtn) {
        nextBtn.style.display = (completedChapters === bookData.numChapters) ? 'inline-flex' : 'none';
    }

    // Update navigation state
    const writingNavItem = document.querySelector('[data-step="writing"]');
    if (writingNavItem) {
        if (completedChapters === bookData.numChapters) {
            writingNavItem.classList.add('completed');
        } else {
            writingNavItem.classList.remove('completed');
        }
    }
}

/**
 * Regenerate chapter with confirmation
 * @param {number} chapterNum - Chapter number
 */
async function regenerateChapter(chapterNum) {
    const confirmed = await customConfirm(`Are you sure you want to regenerate Chapter ${chapterNum}? This will overwrite the current content.`, 'Regenerate Chapter');
    if (!confirmed) return;

    // Clear previous content and regenerate
    const contentEl = document.getElementById(`chapter-${chapterNum}-content`);
    if (contentEl) {
        contentEl.value = '';
        updateChapterContent(chapterNum);
    }

    await generateSingleChapter(chapterNum);
}

/**
 * Select all chapters for batch generation
 */
function selectAllChapters() {
    for (let i = 1; i <= bookData.numChapters; i++) {
        const checkbox = document.getElementById(`chapter-${i}-checkbox`);
        if (checkbox) checkbox.checked = true;
    }
    updateGenerateSelectedButton();
}

/**
 * Deselect all chapters
 */
function deselectAllChapters() {
    for (let i = 1; i <= bookData.numChapters; i++) {
        const checkbox = document.getElementById(`chapter-${i}-checkbox`);
        if (checkbox) checkbox.checked = false;
    }
    updateGenerateSelectedButton();
}

/**
 * Update generate selected button state
 */
function updateGenerateSelectedButton() {
    const selected = getSelectedChapters().length;
    const btn = document.getElementById('generate-selected-btn');
    if (!btn) return;

    if (selected > 0) {
        btn.innerHTML = `<span class="label">Generate Selected (${selected})</span>`;
        btn.disabled = false;
        btn.classList.remove('btn-ghost');
        btn.classList.add('btn-primary');
    } else {
        btn.innerHTML = '<span class="label">Generate Selected (0)</span>';
        btn.disabled = true;
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-ghost');
    }
}

/**
 * Get selected chapters for batch processing
 * @returns {number[]} Array of selected chapter numbers
 */
function getSelectedChapters() {
    const selected = [];
    for (let i = 1; i <= bookData.numChapters; i++) {
        const cb = document.getElementById(`chapter-${i}-checkbox`);
        if (cb && cb.checked) selected.push(i);
    }
    return selected;
}

/**
 * Generate selected chapters in batch
 */
async function generateSelectedChapters() {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }

    const selectedChapters = getSelectedChapters();
    if (selectedChapters.length === 0) {
        await customAlert('Please select at least one chapter to generate.', 'No Chapters Selected');
        return;
    }

    isGenerating = true;
    const total = selectedChapters.length;
    let completed = 0;

    try {
        showGenerationInfo(`Starting batch generation of ${total} chapters...`);
        for (let idx = 0; idx < selectedChapters.length; idx++) {
            const ch = selectedChapters[idx];
            completed = idx + 1;

            showGenerationInfo(`Writing Chapter ${ch} (${completed} of ${total})...`);
            document.getElementById(`chapter-${ch}-status`).innerHTML = '<div class="loading"><div class="spinner"></div>Writing...</div>';
            document.getElementById(`chapter-${ch}-generate-btn`).disabled = true;

            try {
                const content = await writeChapter(ch);
                document.getElementById(`chapter-${ch}-content`).value = content;
                updateChapterContent(ch);
                document.getElementById(`chapter-${ch}-status`).innerHTML = `✓ Generated (${completed}/${total})`;
                document.getElementById(`chapter-${ch}-checkbox`).checked = false;
            } catch (err) {
                document.getElementById(`chapter-${ch}-status`).innerHTML = `❌ Error: ${err.message}`;
                break;
            } finally {
                document.getElementById(`chapter-${ch}-generate-btn`).disabled = false;
            }
        }

        updateGenerateSelectedButton();

        if (completed === total) {
            showGenerationInfo(`✅ Batch generation complete! ${completed} chapters generated.`);
            setTimeout(() => { hideGenerationInfo(); }, 2000);
        }
    } finally {
        isGenerating = false;
        if (completed < total) {
            hideGenerationInfo();
        }
    }
}

/**
 * Generate all chapters
 */
async function generateAllChapters() {
    selectAllChapters();
    await generateSelectedChapters();
}

/**
 * Run feedback for individual chapter
 * @param {number} chapterNum - Chapter number
 */
async function runChapterFeedback(chapterNum) {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }

    const chapter = document.getElementById(`chapter-${chapterNum}-content`).value;
    if (!chapter.trim()) {
        await customAlert('No chapter content to improve. Please write or generate the chapter first.', 'No Content');
        return;
    }

    isGenerating = true;
    showGenerationInfo(`Analyzing Chapter ${chapterNum}...`);

    try {
        const feedbackLoops = parseInt(document.getElementById('writing-feedback-loops').value) || 1;
        const feedbackMode = document.getElementById('writing-feedback-mode').value;

        let manualFeedback = '';
        if (feedbackMode === 'manual') {
            manualFeedback = document.getElementById('writing-manual-input').value;
            if (!manualFeedback.trim()) {
                await customAlert('Please provide manual feedback instructions before running the feedback loop.', 'Missing Feedback');
                return;
            }
        }

        document.getElementById(`chapter-${chapterNum}-status`).innerHTML = '<div class="loading"><div class="spinner"></div>Running feedback analysis...</div>';

        let improvedChapter = chapter;
        const feedbackModel = getSelectedModel('feedback');

        for (let i = 0; i < feedbackLoops; i++) {
            if (feedbackMode === 'manual') {
                improvedChapter = await runManualFeedback('chapter', improvedChapter, manualFeedback, feedbackModel);
            } else {
                improvedChapter = await runAIFeedback('chapter', improvedChapter, feedbackModel);
            }
        }

        document.getElementById(`chapter-${chapterNum}-content`).value = improvedChapter;
        updateChapterContent(chapterNum);

        document.getElementById(`chapter-${chapterNum}-status`).innerHTML = `Improved with ${feedbackLoops} ${feedbackMode} feedback loop(s)`;
    } catch (error) {
        document.getElementById(`chapter-${chapterNum}-status`).innerHTML = `Feedback error: ${error.message}`;
        await customAlert(`Error in feedback loop: ${error.message}`, 'Feedback Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Run manual feedback improvement
 * @param {string} contentType - Type of content
 * @param {string} content - Content to improve
 * @param {string} manualFeedback - Manual feedback instructions
 * @param {string} feedbackModel - Model to use
 * @returns {Promise<string>} Improved content
 */
async function runManualFeedback(contentType, content, manualFeedback, feedbackModel) {
    const improvementPrompt = formatPrompt(aiSettings.customPrompts.manualImprovement || defaultPrompts.manualImprovement, {
        contentType: contentType,
        originalContent: content,
        manualFeedback: manualFeedback,
        genre: bookData.genre,
        targetAudience: bookData.targetAudience,
        premise: bookData.premise,
        styleDirection: bookData.styleDirection,
        targetWordCount: bookData.targetWordCount,
        numChapters: bookData.numChapters
    });
    
    return await callAI(improvementPrompt, "You are a master storyteller and professional editor implementing specific feedback requests.", feedbackModel);
}
 
/**
 * Run AI feedback improvement
 * @param {string} contentType - Type of content to improve
 * @param {string} content - Content to improve
 * @param {string} feedbackModel - Model to use
 * @returns {Promise<string>} Improved content
 */
async function runAIFeedback(contentType, content, feedbackModel) {
    const analysisPrompt = formatPrompt(getCustomAnalysisPrompt(contentType), {
        contentType: contentType,
        content: content,
        genre: bookData.genre,
        targetAudience: bookData.targetAudience,
        premise: bookData.premise,
        styleDirection: bookData.styleDirection,
        targetWordCount: bookData.targetWordCount,
        numChapters: bookData.numChapters
    });
    
    const analysis = await callAI(analysisPrompt, "You are a professional editor and story consultant.", feedbackModel);
    
    const improvementPrompt = formatPrompt(aiSettings.customPrompts.improvement || defaultPrompts.improvement, {
        contentType: contentType,
        originalContent: content,
        feedbackContent: analysis,
        targetAudience: bookData.targetAudience,
        genre: bookData.genre,
        premise: bookData.premise,
        styleDirection: bookData.styleDirection,
        targetWordCount: bookData.targetWordCount,
        numChapters: bookData.numChapters
    });
    
    return await callAI(improvementPrompt, "You are a master storyteller and professional editor.", feedbackModel);
}
 
/**
 * Get custom analysis prompt
 * @param {string} contentType - Type of content
 * @returns {string} Analysis prompt
 */
function getCustomAnalysisPrompt(contentType) {
    const customPrompt = document.getElementById(`${contentType}-feedback-prompt`)?.value;
    return customPrompt && customPrompt.trim() ? customPrompt : (aiSettings.customPrompts.analysis || defaultPrompts.analysis);
}

// ==================================================
// EXPAND MODAL
// ==================================================

/**
 * Expand chapter in full-screen modal
 * @param {number} chapterNum - Chapter number
 */
function expandChapter(chapterNum) {
    const textarea = document.getElementById(`chapter-${chapterNum}-content`);
    const content = textarea.value;
    
    currentExpandedChapter = chapterNum;
    
    document.getElementById('expand-chapter-title').textContent = `Chapter ${chapterNum} - Expanded View`;
    document.getElementById('expand-textarea').value = content;
    
    updateExpandedWordCount();
    
    const modal = document.getElementById('expand-modal');
    modal.classList.add('active');
    
    setTimeout(() => {
        document.getElementById('expand-textarea').focus();
    }, 100);
}

/**
 * Update word count in expand modal
 */
function updateExpandedWordCount() {
    const content = document.getElementById('expand-textarea').value;
    const wordCount = countWords(content);
    const readingTime = Math.ceil(wordCount / CONFIG.READING_SPEED_WPM);
    
    document.getElementById('expand-word-count').textContent = `${wordCount} words`;
    document.getElementById('expand-reading-time').textContent = `${readingTime} min read`;
}

/**
 * Save expanded chapter content
 */
function saveExpandedChapter() {
    if (currentExpandedChapter) {
        const content = document.getElementById('expand-textarea').value;
        document.getElementById(`chapter-${currentExpandedChapter}-content`).value = content;
        updateChapterContent(currentExpandedChapter);
        
        const saveBtn = event?.target || document.querySelector('#expand-modal .expand-controls .btn-success');
        const originalText = saveBtn?.innerHTML || 'Save';
        if (saveBtn) {
            saveBtn.innerHTML = '<span class="label">Saved!</span>';
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
            }, 2000);
        }
    }
}

/**
 * Toggle expanded read mode
 */
function toggleExpandedReadMode() {
    const editor = document.getElementById('expand-editor');
    const reader = document.getElementById('expand-reader');
    const label = document.getElementById('read-mode-label');
    
    if (editor.style.display === 'none') {
        editor.style.display = 'block';
        reader.style.display = 'none';
        label.textContent = 'Read Mode';
    } else {
        const content = document.getElementById('expand-textarea').value;
        document.getElementById('expand-reader-content').innerHTML = content.replace(/\n/g, '<br>');
        editor.style.display = 'none';
        reader.style.display = 'block';
        label.textContent = 'Edit Mode';
    }
}

/**
 * Close expand modal
 */
function closeExpandModal() {
    const modal = document.getElementById('expand-modal');
    modal.classList.remove('active');
    currentExpandedChapter = null;
}

// ==================================================
// ONE-CLICK GENERATION
// ==================================================

/**
 * Start one-click generation configuration
 */
async function startOneClickGeneration() {
    collectBookData();
    
    if (!bookData.genre || !bookData.targetAudience || !bookData.premise) {
        await customAlert('Please fill in all required fields before starting one-click generation.', 'Missing Information');
        return;
    }
    
    document.getElementById('one-click-modal').classList.add('active');
}
 
/**
 * Close one-click modal
 */
function closeOneClickModal() {
    document.getElementById('one-click-modal').classList.remove('active');
}
 
/**
 * Start one-click generation process
 */
async function startOneClickProcess() {
    const outlineLoops = parseInt(document.getElementById('one-click-outline-loops').value);
    const chaptersLoops = parseInt(document.getElementById('one-click-chapters-loops').value);
    const writingLoops = parseInt(document.getElementById('one-click-writing-loops').value);
    
    closeOneClickModal();
    showLoadingOverlay('Starting one-click generation...');
    
    oneClickCancelled = false;
    
    try {
        // Step 1: Generate Outline
        updateLoadingText('Generating story structure...');
        showStep('outline');
        await generateOutline();
        
        if (oneClickCancelled) return;
        
        if (outlineLoops > 0) {
            updateLoadingText(`Improving story structure (${outlineLoops} feedback loops)...`);
            document.getElementById('outline-feedback-loops').value = outlineLoops;
            document.getElementById('outline-feedback-mode').value = 'ai';
            await runFeedbackLoop('outline');
        }
        
        if (oneClickCancelled) return;
        
        // Step 2: Generate Chapter Outline
        updateLoadingText('Creating detailed chapter plan...');
        showStep('chapters');
        await generateChapterOutline();
        
        if (oneClickCancelled) return;
        
        if (chaptersLoops > 0) {
            updateLoadingText(`Improving chapter plan (${chaptersLoops} feedback loops)...`);
            document.getElementById('chapters-feedback-loops').value = chaptersLoops;
            document.getElementById('chapters-feedback-mode').value = 'ai';
            await runFeedbackLoop('chapters');
        }
        
        if (oneClickCancelled) return;
        
        // Step 3: Setup Writing Interface and Generate Chapters
        updateLoadingText('Setting up writing interface...');
        showStep('writing');
        
        updateLoadingText('Writing all chapters...');
        document.getElementById('writing-feedback-loops').value = writingLoops;
        document.getElementById('writing-feedback-mode').value = 'ai';
        
        for (let i = 1; i <= bookData.numChapters; i++) {
            if (oneClickCancelled) return;
            
            updateLoadingText(`Writing Chapter ${i} of ${bookData.numChapters}...`);
            await generateSingleChapter(i);
            
            if (writingLoops > 0) {
                updateLoadingText(`Improving Chapter ${i} with feedback...`);
                await runChapterFeedback(i);
            }
            
            updateOverallProgress();
        }
        
        if (oneClickCancelled) return;
        
        // Step 4: Complete
        updateLoadingText('Finalizing book...');
        showStep('export');
        updateBookStats();
        
        hideLoadingOverlay();
        
        const completedChapters = bookData.chapters.filter(c => c).length;
        const totalWords = bookData.chapters.filter(c => c).reduce((total, chapter) => total + countWords(chapter), 0);
        
        await customAlert(`One-click generation completed! 

Your book "${bookData.title || 'Untitled'}" is ready for export!

Final Stats:
• ${completedChapters} chapters completed
• ${totalWords.toLocaleString()} total words
• Ready for publishing!`, 'Generation Complete');
        
    } catch (error) {
        hideLoadingOverlay();
        await customAlert(`One-click generation failed: ${error.message}`, 'Generation Failed');
    }
}
 
/**
 * Cancel one-click generation
 */
function cancelOneClickGeneration() {
    oneClickCancelled = true;
    hideLoadingOverlay();
}
 
/**
 * Show loading overlay
 * @param {string} text - Loading text
 */
function showLoadingOverlay(text) {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').style.display = 'flex';
    document.getElementById('cancel-btn').style.display = 'inline-flex';
}
 
/**
 * Update loading text
 * @param {string} text - New loading text
 */
function updateLoadingText(text) {
    document.getElementById('loading-text').textContent = text;
}
 
/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('cancel-btn').style.display = 'none';
    isGenerating = false;
}
 
/**
 * Proceed to export step
 */
function proceedToExport() {
    showStep('export');
    updateBookStats();
}
 
// ==================================================
// EXPORT FUNCTIONS
// ==================================================

/**
 * Update book statistics for export
 */
function updateBookStats() {
    if (!bookData.chapters) return;

    let totalWords = 0;
    let completedChapters = 0;
    
    bookData.chapters.forEach(chapter => {
        if (chapter && chapter.trim().length > 0) {
            totalWords += countWords(chapter);
            completedChapters++;
        }
    });

    const avgWords = completedChapters > 0 ? Math.round(totalWords / completedChapters) : 0;
    const readingTime = Math.round(totalWords / CONFIG.READING_SPEED_WPM);

    const elements = {
        'total-words': totalWords.toLocaleString(),
        'total-chapters': completedChapters,
        'avg-words': avgWords.toLocaleString(),
        'reading-time': readingTime
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
}
 
/**
 * Download book in specified format
 * @param {string} format - Export format (txt, html, md)
 */
async function downloadBook(format) {
    if (!bookData.chapters || bookData.chapters.length === 0) {
        await customAlert('No chapters to download. Please complete the writing process first.', 'No Content');
        return;
    }

    let content = '';
    const title = bookData.title || bookData.premise.substring(0, 50) + (bookData.premise.length > 50 ? '...' : '');
    
    switch(format) {
        case 'txt':
            content = generateTxtContent(title);
            downloadFile(content, `${sanitizeFilename(title)}.txt`, 'text/plain');
            break;
        case 'html':
            content = generateHtmlContent(title);
            downloadFile(content, `${sanitizeFilename(title)}.html`, 'text/html');
            break;
        case 'md':
            content = generateMarkdownContent(title);
            downloadFile(content, `${sanitizeFilename(title)}.md`, 'text/markdown');
            break;
        // EPUB export removed per feedback
    }
}
 
/**
 * Generate text content for export
 * @param {string} title - Book title
 * @returns {string} Formatted text content
 */
function generateTxtContent(title) {
    let content = `${title}\n`;
    content += `Genre: ${bookData.genre}\n`;
    content += `Target Audience: ${bookData.targetAudience}\n\n`;
    
    if (bookData.blurb) {
        content += `BOOK DESCRIPTION:\n${bookData.blurb}\n\n`;
    }
    
    content += '='.repeat(50) + '\n\n';

    bookData.chapters.forEach((chapter, index) => {
        if (chapter) {
            content += `CHAPTER ${index + 1}\n\n`;
            content += chapter + '\n\n';
            content += '='.repeat(30) + '\n\n';
        }
    });

    return content;
}
 
/**
 * Generate HTML content for export
 * @param {string} title - Book title
 * @returns {string} Formatted HTML content
 */
function generateHtmlContent(title) {
    let content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="generator" content="NovelFactory - https://novelfactory.ink">
    <style>
        body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.8; }
        h1 { color: #333; border-bottom: 3px solid #007AFF; padding-bottom: 10px; }
        h2 { color: #666; margin-top: 40px; page-break-before: always; }
        .book-info { background: #f9f9f9; padding: 25px; border-radius: 10px; margin-bottom: 40px; }
        .book-blurb { background: #fff; padding: 20px; border-left: 4px solid #007AFF; margin: 20px 0; font-style: italic; }
        .chapter { margin-bottom: 50px; }
        p { margin-bottom: 1em; }
        .footer { text-align: center; margin-top: 50px; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="book-info">
        <h1>${title}</h1>
        <p><strong>Genre:</strong> ${bookData.genre}</p>
        <p><strong>Target Audience:</strong> ${bookData.targetAudience}</p>
        <p><strong>Style:</strong> ${bookData.styleDirection}</p>
        ${bookData.blurb ? `<div class="book-blurb">${bookData.blurb}</div>` : ''}
    </div>
`;

    bookData.chapters.forEach((chapter, index) => {
        if (chapter) {
            content += `    <div class="chapter">
        <h2>Chapter ${index + 1}</h2>
        <p>${chapter.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>
    </div>
`;
        }
    });

    content += `    <div class="footer">
        <p>Generated by <a href="https://novelfactory.ink">NovelFactory</a></p>
    </div>
</body>
</html>`;
    return content;
}
 
/**
 * Generate Markdown content for export
 * @param {string} title - Book title
 * @returns {string} Formatted Markdown content
 */
function generateMarkdownContent(title) {
    let content = `# ${title}\n\n`;
    content += `**Genre:** ${bookData.genre}  \n`;
    content += `**Target Audience:** ${bookData.targetAudience}  \n`;
    content += `**Style:** ${bookData.styleDirection}\n\n`;
    
    if (bookData.blurb) {
        content += `## Book Description\n\n`;
        content += `${bookData.blurb}\n\n`;
    }
    
    content += '---\n\n';

    bookData.chapters.forEach((chapter, index) => {
        if (chapter) {
            content += `## Chapter ${index + 1}\n\n`;
            content += chapter + '\n\n';
            content += '---\n\n';
        }
    });

    content += `\n*Generated by [NovelFactory](https://novelfactory.ink)*\n`;
    return content;
}
 
/**
 * Copy book content to clipboard
 */
async function copyToClipboard() {
    if (!bookData.chapters || bookData.chapters.length === 0) {
        await customAlert('No content to copy. Please complete the writing process first.', 'No Content');
        return;
    }

    const title = bookData.title || bookData.premise;
    const content = generateTxtContent(title);
    try {
        await navigator.clipboard.writeText(content);
        await customAlert('Book content copied to clipboard!', 'Copied');
    } catch (err) {
        await customAlert('Failed to copy to clipboard. Please try downloading instead.', 'Copy Failed');
    }
}

/**
 * PROJECT MANAGEMENT
 * Continuation from previous sections
 * - Load, save, switch, delete projects
 * - Manage projects modal
 * - Import/Export projects
 */

// Load saved projects from localStorage
function loadProjects() {
    const savedProjects = localStorage.getItem('novelfactory_projects');
    projects = savedProjects ? JSON.parse(savedProjects) : {};
    const select = document.getElementById('project-select');
    
    if (!select) return;
    
    select.innerHTML = '';
    
    // Current project option
    const currentOption = document.createElement('option');
    currentOption.value = 'current';
    currentOption.textContent = 'Current Project';
    select.appendChild(currentOption);
    
    const projectIds = Object.keys(projects);
    if (projectIds.length > 0) {
        const separator = document.createElement('option');
        separator.value = '';
        separator.disabled = true;
        separator.textContent = '──────────';
        select.appendChild(separator);
        
        const sortedProjects = projectIds.sort((a, b) => {
            const dateA = new Date(projects[a].lastSaved || 0);
            const dateB = new Date(projects[b].lastSaved || 0);
            return dateB - dateA;
        });
        
        sortedProjects.forEach(projectId => {
            const project = projects[projectId];
            const option = document.createElement('option');
            option.value = projectId;
            let title = project.title || project.premise?.substring(0, 30) || `Project ${projectId.slice(-8)}`;
            if (title.length > 40) title = title.substring(0, 37) + '...';
            const date = new Date(project.lastSaved || project.createdAt);
            const dateStr = date.toLocaleDateString();
            option.textContent = `${title} (${dateStr})`;
            select.appendChild(option);
        });
    }
    
    updateDeleteButtonVisibility();
}

// Update visibility of Delete button based on selection
function updateDeleteButtonVisibility() {
    const select = document.getElementById('project-select');
    const deleteBtn = document.getElementById('delete-project-btn');
    if (deleteBtn && select) {
        const isCurrent = select.value === 'current' || !select.value;
        deleteBtn.style.display = isCurrent ? 'none' : 'inline-flex';
    }
}

// Create a new project
async function newProject() {
    if (bookData.premise || bookData.outline) {
        const confirmed = await customConfirm('Starting a new project will clear your current work. Continue?', 'New Project');
        if (!confirmed) return;
    }
    
    const projectId = 'project_' + Date.now();
    bookData = {
        id: projectId,
        title: '',
        blurb: '',
        genre: '',
        targetAudience: '',
        premise: '',
        styleDirection: '',
        numChapters: 20,
        targetWordCount: 2000,
        outline: '',
        chapterOutline: '',
        chapters: [],
        currentStep: 'setup',
        createdAt: new Date().toISOString(),
        lastSaved: new Date().toISOString()
    };
    
    // Reset UI state for new project
    resetEverything();
    
    const selector = document.getElementById('project-select');
    if (selector) {
        selector.value = 'current';
        updateDeleteButtonVisibility();
    }
    
    await customAlert('New project created!', 'Project Created');
}

// Save current project
async function saveProject() {
    collectBookData();
    
    // Ensure latest content is captured
    const currentStep = document.querySelector('.step.active')?.id || bookData.currentStep;
    bookData.currentStep = currentStep;
    
    // If writing, serialize chapters
    if (currentStep === 'writing' && bookData.chapters) {
        for (let i = 0; i < bookData.numChapters; i++) {
            const chapterEl = document.getElementById(`chapter-${i + 1}-content`);
            if (chapterEl && chapterEl.value) {
                bookData.chapters[i] = chapterEl.value;
            }
        }
    }
    
    // Basic content check
    if (!bookData.premise && !bookData.outline && !bookData.chapterOutline) {
        await customAlert('Please add some content before saving the project.', 'No Content');
        return;
    }
    
    const savedProjects = localStorage.getItem('novelfactory_projects');
    const existingProjects = savedProjects ? JSON.parse(savedProjects) : {};
    const projectCount = Object.keys(existingProjects).length;
    
    if (projectCount >= CONFIG.MAX_SAVED_PROJECTS && bookData.id === 'current') {
        await customAlert(`You can save up to ${CONFIG.MAX_SAVED_PROJECTS} projects. Please delete some projects first or use the "Manage Projects" option.`, 'Project Limit Reached');
        return;
    }
    
    // Suggest a title
    let suggestedTitle = '';
    if (bookData.title) suggestedTitle = bookData.title;
    else if (bookData.premise) {
        suggestedTitle = bookData.premise.substring(0, 30).trim();
        if (bookData.premise.length > 30) suggestedTitle += '...';
    } else {
        suggestedTitle = `${bookData.genre} book for ${bookData.targetAudience}`;
    }
    
    const title = await customInput('Enter a title for this project:', 'Save Project', suggestedTitle);
    if (!title) return;
    
    if (bookData.id === 'current') bookData.id = 'project_' + Date.now();
    bookData.title = title;
    bookData.lastSaved = new Date().toISOString();
    
    const projectToSave = { ...bookData };
    existingProjects[bookData.id] = projectToSave;
    localStorage.setItem('novelfactory_projects', JSON.stringify(existingProjects));
    localStorage.setItem('novelfactory_currentProject', JSON.stringify(projectToSave));
    
    loadProjects();
    const selector = document.getElementById('project-select');
    if (selector) {
        selector.value = bookData.id;
        updateDeleteButtonVisibility();
    }
    
    await customAlert('Project saved successfully!', 'Project Saved');
}

// Handle project action from dropdown
async function handleProjectAction(value) {
    if (!value || value === 'current') {
        updateDeleteButtonVisibility();
        return;
    }
    await switchProject(value);
}

// Switch to a different project
async function switchProject(projectId) {
    if (!projectId || projectId === 'current') {
        updateDeleteButtonVisibility();
        return;
    }
    
    const savedProjects = localStorage.getItem('novelfactory_projects');
    const allProjects = savedProjects ? JSON.parse(savedProjects) : {};
    
    if (allProjects[projectId]) {
        if (bookData.premise || bookData.outline) {
            const confirmed = await customConfirm('Loading a project will replace your current work. Continue?', 'Load Project');
            if (!confirmed) {
                const selector = document.getElementById('project-select');
                if (selector) selector.value = bookData.id || 'current';
                return;
            }
        }
        
        bookData = { ...allProjects[projectId] };
        populateFormFields();
        showStep(bookData.currentStep);
        updateDeleteButtonVisibility();
        await customAlert('Project loaded successfully!', 'Project Loaded');
    }
}

// Delete current project
async function deleteCurrentProject() {
    const selector = document.getElementById('project-select');
    const projectId = selector.value;
    if (projectId === 'current' || !projectId) return;
    
    const savedProjects = localStorage.getItem('novelfactory_projects');
    const allProjects = savedProjects ? JSON.parse(savedProjects) : {};
    const project = allProjects[projectId];
    if (!project) return;
    
    const projectTitle = project.title || project.premise?.substring(0, 30) || 'Untitled Project';
    const confirmed = await customConfirm(`Are you sure you want to delete "${projectTitle}"? This cannot be undone.`, 'Delete Project');
    if (!confirmed) return;
    
    delete allProjects[projectId];
    localStorage.setItem('novelfactory_projects', JSON.stringify(allProjects));
    
    selector.value = 'current';
    bookData.id = 'current';
    
    loadProjects();
    await customAlert('Project deleted successfully!', 'Project Deleted');
}

// Manage projects modal
function manageProjects() {
    updateProjectManagementModal();
    document.getElementById('project-management-modal').classList.add('active');
}

// Close project management modal
function closeProjectManagementModal() {
    document.getElementById('project-management-modal').classList.remove('active');
}

// Update project management modal content
function updateProjectManagementModal() {
    const savedProjects = localStorage.getItem('novelfactory_projects');
    const allProjects = savedProjects ? JSON.parse(savedProjects) : {};
    const projectIds = Object.keys(allProjects);
    
    document.getElementById('project-count').textContent = projectIds.length;
    const progressBar = document.getElementById('project-count-progress');
    progressBar.style.width = `${(projectIds.length / CONFIG.MAX_SAVED_PROJECTS) * 100}%`;
    
    const projectList = document.getElementById('project-list');
    projectList.innerHTML = '';
    
    if (projectIds.length === 0) {
        projectList.innerHTML = '<p class="no-projects">No saved projects found.</p>';
        return;
    }
    
    const sortedProjects = projectIds.sort((a, b) => {
        const dateA = new Date(allProjects[a].lastSaved || 0);
        const dateB = new Date(allProjects[b].lastSaved || 0);
        return dateB - dateA;
    });
    
    sortedProjects.forEach(projectId => {
        const project = allProjects[projectId];
        const projectDiv = document.createElement('div');
        projectDiv.className = 'project-item';
        
        const title = project.title || project.premise?.substring(0, 30) || 'Untitled Project';
        const wordCount = project.chapters ? project.chapters.filter(c => c).reduce((total, chapter) => total + countWords(chapter), 0) : 0;
        const date = new Date(project.lastSaved || project.createdAt).toLocaleDateString();
        
        projectDiv.innerHTML = `
            <div class="project-info">
                <h4>${title}</h4>
                <p>Genre: ${project.genre || 'Not set'} | Audience: ${project.targetAudience || 'Not set'}</p>
                <p>Words: ${wordCount.toLocaleString()} | Last saved: ${date}</p>
            </div>
            <div class="project-actions">
                <button class="btn btn-ghost btn-sm" onclick="loadProjectFromManagement('${projectId}')">
                    <span class="label">Load</span>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteProjectFromManagement('${projectId}')">
                    <span class="label">Delete</span>
                </button>
            </div>
        `;
        projectList.appendChild(projectDiv);
    });
}

// Load project from management modal
async function loadProjectFromManagement(projectId) {
    closeProjectManagementModal();
    const selector = document.getElementById('project-select');
    if (selector) {
        selector.value = projectId;
        await switchProject(projectId);
    }
}

// Delete project from management modal
async function deleteProjectFromManagement(projectId) {
    const savedProjects = localStorage.getItem('novelfactory_projects');
    const allProjects = savedProjects ? JSON.parse(savedProjects) : {};
    const project = allProjects[projectId];
    if (!project) return;
    
    const projectTitle = project.title || project.premise?.substring(0, 30) || 'Untitled Project';
    const confirmed = await customConfirm(`Are you sure you want to delete "${projectTitle}"?`, 'Delete Project');
    if (!confirmed) return;
    
    delete allProjects[projectId];
    localStorage.setItem('novelfactory_projects', JSON.stringify(allProjects));
    
    const selector = document.getElementById('project-select');
    if (selector && selector.value === projectId) {
        selector.value = 'current';
        bookData.id = 'current';
    }
    
    loadProjects();
    updateProjectManagementModal();
    await customAlert('Project deleted successfully!', 'Project Deleted');
}

// Clear all saved projects
async function clearAllProjects() {
    const savedProjects = localStorage.getItem('novelfactory_projects');
    const allProjects = savedProjects ? JSON.parse(savedProjects) : {};
    const projectCount = Object.keys(allProjects).length;
    if (projectCount === 0) {
        await customAlert('No projects to delete.', 'No Projects');
        return;
    }
    const confirmed = await customConfirm(`Are you sure you want to delete all ${projectCount} saved projects? This cannot be undone.`, 'Delete All Projects');
    if (confirmed) {
        localStorage.removeItem('novelfactory_projects');
        loadProjects();
        updateProjectManagementModal();
        await customAlert('All projects deleted successfully!', 'Projects Cleared');
    }
}

// Export all projects
function exportAllProjects() {
    const savedProjects = localStorage.getItem('novelfactory_projects');
    const allProjects = savedProjects ? JSON.parse(savedProjects) : {};
    if (Object.keys(allProjects).length === 0) {
        customAlert('No projects to export.', 'No Projects');
        return;
    }
    const exportData = {
        exportDate: new Date().toISOString(),
        projectCount: Object.keys(allProjects).length,
        projects: allProjects,
        version: CONFIG.VERSION
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `novelfactory-projects-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import projects
function importProjects() {
    document.getElementById('projects-import-file').click();
}

// Handle projects import
async function handleProjectsImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            if (!importData.projects || typeof importData.projects !== 'object') {
                throw new Error('Invalid project file format');
            }
            const importProjects = importData.projects;
            const importCount = Object.keys(importProjects).length;
            if (importCount === 0) {
                await customAlert('No projects found in the import file.', 'Import Error');
                return;
            }
            const savedProjects = localStorage.getItem('novelfactory_projects');
            const existingProjects = savedProjects ? JSON.parse(savedProjects) : {};
            const existingCount = Object.keys(existingProjects).length;
            if (existingCount + importCount > CONFIG.MAX_SAVED_PROJECTS) {
                const allowed = CONFIG.MAX_SAVED_PROJECTS - existingCount;
                const confirmed = await customConfirm(
                    `Importing ${importCount} projects would exceed the limit of ${CONFIG.MAX_SAVED_PROJECTS} projects. Only the first ${allowed} will be imported. Continue?`,
                    'Import Limit'
                );
                if (!confirmed) return;
            }
            let importedCount = 0;
            Object.entries(importProjects).forEach(([projectId, project]) => {
                if (Object.keys(existingProjects).length < CONFIG.MAX_SAVED_PROJECTS) {
                    const newId = 'imported_' + Date.now() + '_' + importedCount;
                    existingProjects[newId] = {
                        ...project,
                        id: newId,
                        lastSaved: new Date().toISOString()
                    };
                    importedCount++;
                }
            });
            localStorage.setItem('novelfactory_projects', JSON.stringify(existingProjects));
            loadProjects();
            updateProjectManagementModal();
            await customAlert(`Successfully imported ${importedCount} projects!`, 'Import Complete');
        } catch (error) {
            await customAlert('Error importing projects: Invalid file format', 'Import Error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ==================================================
// SETTINGS MANAGEMENT
// ==================================================

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('novelfactory_settings');
    if (savedSettings) {
        try {
            const loadedSettings = JSON.parse(savedSettings);
            Object.assign(aiSettings, loadedSettings);
            if (!aiSettings.advancedModels) aiSettings.advancedModels = {};
            if (!aiSettings.customPrompts) aiSettings.customPrompts = {};
        } catch (err) {
            console.error('Error parsing saved settings:', err);
        }
    }
    
    initializePrompts();
    loadFromLocalStorage();
    setTimeout(() => populateSettingsFields(), 100);
}

// Save settings to localStorage
function saveSettings() {
    try {
        const openrouterKey = document.getElementById('openrouter-api-key')?.value || '';
        const openaiKey = document.getElementById('openai-api-key')?.value || '';
        const modelSelect = document.getElementById('model-select')?.value || 'anthropic/claude-sonnet-4';
        const temperature = parseFloat(document.getElementById('temperature')?.value || 0.7);
        const maxTokens = parseInt(document.getElementById('max-tokens')?.value || 50000);
        const advancedEnabled = document.getElementById('enable-advanced-models')?.checked || false;
        
        aiSettings.openrouterApiKey = openrouterKey;
        aiSettings.openaiApiKey = openaiKey;
        aiSettings.model = modelSelect;
        aiSettings.temperature = temperature;
        aiSettings.maxTokens = maxTokens;
        aiSettings.advancedModelsEnabled = advancedEnabled;
        
        if (!aiSettings.advancedModels) aiSettings.advancedModels = {};
        localStorage.setItem('novelfactory_settings', JSON.stringify(aiSettings));
        return true;
    } catch (err) {
        console.error('Error saving settings:', err);
        return false;
    }
}

// Populate settings form fields
function populateSettingsFields() {
    if (document.getElementById('openrouter-api-key')) {
        document.getElementById('openrouter-api-key').value = aiSettings.openrouterApiKey || '';
    }
    if (document.getElementById('openai-api-key')) {
        document.getElementById('openai-api-key').value = aiSettings.openaiApiKey || '';
    }
    if (document.getElementById('model-select')) {
        document.getElementById('model-select').value = aiSettings.model || 'anthropic/claude-sonnet-4';
    }
    if (document.getElementById('temperature')) {
        document.getElementById('temperature').value = aiSettings.temperature || 0.7;
    }
    if (document.getElementById('max-tokens')) {
        document.getElementById('max-tokens').value = aiSettings.maxTokens || 50000;
    }
    
    const enableCheckbox = document.getElementById('enable-advanced-models');
    if (enableCheckbox) enableCheckbox.checked = aiSettings.advancedModelsEnabled || false;
    
    switchApiProvider(aiSettings.apiProvider || 'openrouter');
    
    setTimeout(() => {
        loadSavedAdvancedModels();
        updateAdvancedModelsVisualState();
    }, 200);
    
    updateTempValue();
    updateModelInfo();
}

// Populate form fields from bookData
function populateFormFields() {
    document.getElementById('genre').value = bookData.genre || '';
    document.getElementById('target-audience').value = bookData.targetAudience || '';
    document.getElementById('premise').value = bookData.premise || '';
    document.getElementById('style-direction').value = bookData.styleDirection || '';
    document.getElementById('num-chapters').value = bookData.numChapters || 20;
    document.getElementById('target-word-count').value = bookData.targetWordCount || 2000;
    
    if (bookData.outline) {
        const outlineContent = document.getElementById('outline-content');
        if (outlineContent) {
            outlineContent.value = bookData.outline;
            saveOutlineContent();
        }
    }
    
    if (bookData.chapterOutline) {
        const chaptersContent = document.getElementById('chapters-content');
        if (chaptersContent) {
            chaptersContent.value = bookData.chapterOutline;
            saveChaptersContent();
        }
    }
    
    updateWordCount();
}

// Initialize prompts with defaults
function initializePrompts() {
    if (!aiSettings.customPrompts) aiSettings.customPrompts = {};
    // Outline / Chapters / Writing prompts for UI
    if (document.getElementById('outline-prompt')) {
        document.getElementById('outline-prompt').value = aiSettings.customPrompts?.outline || defaultPrompts.outline;
    }
    if (document.getElementById('chapters-prompt')) {
        document.getElementById('chapters-prompt').value = aiSettings.customPrompts?.chapters || defaultPrompts.chapters;
    }
    if (document.getElementById('writing-prompt')) {
        document.getElementById('writing-prompt').value = aiSettings.customPrompts?.writing || defaultPrompts.writing;
    }
    // Settings prompts
    if (document.getElementById('settings-outline-prompt')) {
        document.getElementById('settings-outline-prompt').value = aiSettings.customPrompts?.outline || defaultPrompts.outline;
    }
    if (document.getElementById('settings-chapters-prompt')) {
        document.getElementById('settings-chapters-prompt').value = aiSettings.customPrompts?.chapters || defaultPrompts.chapters;
    }
    if (document.getElementById('settings-writing-prompt')) {
        document.getElementById('settings-writing-prompt').value = aiSettings.customPrompts?.writing || defaultPrompts.writing;
    }
    if (document.getElementById('settings-analysis-prompt')) {
        document.getElementById('settings-analysis-prompt').value = aiSettings.customPrompts?.analysis || defaultPrompts.analysis;
    }
    if (document.getElementById('settings-randomidea-prompt')) {
        document.getElementById('settings-randomidea-prompt').value = aiSettings.customPrompts?.randomIdea || defaultPrompts.randomIdea;
    }
    if (document.getElementById('settings-booktitle-prompt')) {
        document.getElementById('settings-booktitle-prompt').value = aiSettings.customPrompts?.bookTitle || defaultPrompts.bookTitle;
    }
    
    ['outline', 'chapters', 'writing'].forEach(step => {
        const feedbackPrompt = document.getElementById(`${step}-feedback-prompt`);
        if (feedbackPrompt) {
            feedbackPrompt.value = aiSettings.customPrompts?.analysis || defaultPrompts.analysis;
        }
    });
}

// Save a specific custom prompt
function saveCustomPrompt(promptType) {
    const promptElement = document.getElementById(`settings-${promptType}-prompt`);
    if (!promptElement) return;
    if (!aiSettings.customPrompts) aiSettings.customPrompts = {};
    aiSettings.customPrompts[promptType] = promptElement.value;
    
    // Sync to generation step prompt if exists
    const stepPrompt = document.getElementById(`${promptType}-prompt`);
    if (stepPrompt) stepPrompt.value = promptElement.value;
    
    saveSettings();
}

// Reset a single custom prompt to default
function resetCustomPrompt(promptType) {
    const promptElement = document.getElementById(`settings-${promptType}-prompt`);
    if (promptElement && defaultPrompts[promptType]) {
        promptElement.value = defaultPrompts[promptType];
        saveCustomPrompt(promptType);
    }
}

// Reset all prompts
async function resetAllCustomPrompts() {
    const confirmed = await customConfirm('Are you sure you want to reset all custom prompts to their default values?', 'Reset All Prompts');
    if (!confirmed) return;
    Object.keys(defaultPrompts).forEach(promptType => {
        resetCustomPrompt(promptType);
    });
    await customAlert('All prompts have been reset to default values.', 'Prompts Reset');
}

// Update temperature display value
function updateTempValue() {
    const temp = document.getElementById('temperature').value;
    document.getElementById('temp-value').textContent = temp;
}

// Update model info display
function updateModelInfo() {
    const model = document.getElementById('model-select')?.value;
    const provider = aiSettings.apiProvider;
    const allModels = [...(apiModels[provider]?.Recommended || []), ...(apiModels[provider]?.More || [])];
    const modelInfo = allModels.find(m => m.value === model);
    
    const infoEl = document.getElementById('model-cost-info');
    if (infoEl && modelInfo && modelInfo.cost) {
        infoEl.textContent = `Input: ${modelInfo.cost.input}/1M tokens | Output: ${modelInfo.cost.output}/1M tokens`;
    }
}

// Test API connection
async function testApiConnection() {
    const statusDiv = document.getElementById('api-status');
    statusDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Testing connection...</div>';
    try {
        const response = await callAI("Respond with 'Connection successful!' if you can read this message.", "");
        statusDiv.innerHTML = '<div class="success">Connection successful!</div>';
    } catch (err) {
        statusDiv.innerHTML = `<div class="error">Connection failed: ${err.message}</div>`;
    }
}

// Export AI/settings
function exportSettings() {
    const settings = {
        aiSettings: aiSettings,
        prompts: {
            outline: document.getElementById('settings-outline-prompt')?.value || defaultPrompts.outline,
            chapters: document.getElementById('settings-chapters-prompt')?.value || defaultPrompts.chapters,
            writing: document.getElementById('settings-writing-prompt')?.value || defaultPrompts.writing,
            analysis: document.getElementById('settings-analysis-prompt')?.value || defaultPrompts.analysis,
            randomIdea: document.getElementById('settings-randomidea-prompt')?.value || defaultPrompts.randomIdea,
            bookTitle: document.getElementById('settings-booktitle-prompt')?.value || defaultPrompts.bookTitle
        },
        version: CONFIG.VERSION,
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'novelfactory-ai-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import AI/settings
function importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const settings = JSON.parse(e.target.result);
                if (settings.aiSettings) {
                    Object.assign(aiSettings, settings.aiSettings);
                    populateSettingsFields();
                }
                if (settings.prompts) {
                    Object.entries(settings.prompts).forEach(([type, prompt]) => {
                        const element = document.getElementById(`settings-${type}-prompt`);
                        if (element) element.value = prompt;
                    });
                }
                saveSettings();
                await customAlert('Settings imported successfully!', 'Settings Imported');
            } catch (err) {
                await customAlert('Error importing settings: Invalid file format', 'Import Error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Estimate generation costs
async function estimateCosts() {
    const numChapters = bookData.numChapters || 20;
    const targetWordCount = bookData.targetWordCount || 2000;
    
    // Simplified sample estimation; can be expanded
    const totalInputCostEst = 0.0;
    const totalOutputCostEst = 0.0;
    const totalCost = totalInputCostEst + totalOutputCostEst;
    
    const costText = `Estimated cost for complete book generation:

- Inputs: ${totalInputCostEst.toFixed(2)}
- Outputs: ${totalOutputCostEst.toFixed(2)}
- Total: ${totalCost.toFixed(2)}

Notes: This is a rough estimate. Actual costs depend on content complexity and selected models.`;
    
    await customAlert(costText, 'Cost Estimation');
}

// ==================================================
// UTILITY FUNCTIONS
// ==================================================

// Word counting
function countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function updateWordCount() {
    const premise = document.getElementById('premise')?.value || '';
    const style = document.getElementById('style-direction')?.value || '';
    document.getElementById('premise-word-count').textContent = `${countWords(premise)} words`;
    document.getElementById('style-word-count').textContent = `${countWords(style)} words`;
}

// Chapter estimate
function updateChapterEstimate() {
    const numChapters = parseInt(document.getElementById('num-chapters').value) || 20;
    const targetWords = parseInt(document.getElementById('target-word-count').value) || 2000;
    const totalWords = numChapters * targetWords;
    document.getElementById('chapter-estimate').textContent = `Estimated book length: ~${totalWords.toLocaleString()} words`;
}

// Genre/Audience requirements
function updateGenreRequirements() {
    const genre = document.getElementById('genre').value;
    const requirementsDiv = document.getElementById('genre-requirements');
    const contentDiv = document.getElementById('genre-requirements-content');
    if (genre && genreRequirements[genre]) {
        const req = genreRequirements[genre];
        contentDiv.innerHTML = `<p><strong>Genre Requirements:</strong> ${req.requirements}</p><p><strong>Pacing Guidelines:</strong> ${req.pacing}</p>`;
        requirementsDiv.style.display = 'block';
    } else {
        requirementsDiv.style.display = 'none';
    }
}

// Audience requirements (recomputes length)
function updateAudienceRequirements() {
    updateChapterEstimate();
}

// Auto-save system
function setupAutoSave() {
    setInterval(autoSave, CONFIG.AUTO_SAVE_INTERVAL);
}

function autoSave() {
    if (bookData.premise || bookData.styleDirection || bookData.outline) {
        collectBookData();
        saveToLocalStorage();
        showAutoSaveIndicator();
    }
}

function showAutoSaveIndicator() {
    const indicator = document.getElementById('auto-save-indicator');
    indicator.classList.add('show');
    setTimeout(() => indicator.classList.remove('show'), 2000);
}

function saveToLocalStorage() {
    bookData.lastSaved = new Date().toISOString();
    localStorage.setItem('novelfactory_currentProject', JSON.stringify(bookData));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('novelfactory_currentProject');
    if (saved) {
        const savedData = JSON.parse(saved);
        Object.assign(bookData, savedData);
        populateFormFields();
    }
}

// Donation
function showDonationModal() {
    document.getElementById('donation-modal').classList.add('active');
}
function closeDonationModal() {
    document.getElementById('donation-modal').classList.remove('active');
}
function setDonationAmount(amount) {
    selectedDonationAmount = amount;
    document.querySelectorAll('.donation-amount').forEach(btn => btn.classList.remove('selected'));
    event?.target?.classList.add('selected');
    document.getElementById('donate-btn').innerHTML = `<span class="label">Donate ${amount}</span>`;
    document.getElementById('custom-donation-amount').value = '';
}
async function proceedToDonate() {
    const customAmount = document.getElementById('custom-donation-amount').value;
    const amount = customAmount || selectedDonationAmount;
    if (!amount || amount < 1) {
        await customAlert('Please select or enter a valid donation amount.', 'Invalid Amount');
        return;
    }
    const paypalUrl = `https://www.paypal.com/donate/?hosted_button_id=&business=dietrichandreas2%40t-online.de&amount=${amount}&currency_code=USD&item_name=NovelFactory%20AI%20Support`;
    window.open(paypalUrl, '_blank');
    closeDonationModal();
    setTimeout(async () => {
        await customAlert('Thank you for supporting NovelFactory! Your generosity helps keep this tool free for everyone.', 'Thank You!');
    }, 1000);
}

// Feedback
function showFeedbackForm() {
    document.getElementById('feedback-modal').classList.add('active');
}
function closeFeedbackModal() {
    document.getElementById('feedback-modal').classList.remove('active');
    document.getElementById('feedback-type').value = 'bug';
    document.getElementById('feedback-message').value = '';
    document.getElementById('feedback-email').value = '';
}
async function submitFeedback() {
    const type = document.getElementById('feedback-type').value;
    const message = document.getElementById('feedback-message').value;
    const email = document.getElementById('feedback-email').value;
    if (!message.trim()) {
        await customAlert('Please enter your feedback message.', 'Missing Information');
        return;
    }
    const subject = `NovelFactory Feedback: ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const body = `Feedback Type: ${type}\n\nMessage:\n${message}\n\n${email ? `Contact Email: ${email}\n\n` : ''}---\nSent from NovelFactory v${CONFIG.VERSION} (https://novelfactory.ink)`;
    const mailtoLink = `mailto:dietrichandreas2@t-online.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
    closeFeedbackModal();
    await customAlert('Thank you for your feedback! Your default email client should open with your message.', 'Feedback Sent');
}

// One-Click and modals (existing patterns continued)
function showLoadingOverlay(text) {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').style.display = 'flex';
    document.getElementById('cancel-btn').style.display = 'inline-flex';
}
function updateLoadingText(text) {
    document.getElementById('loading-text').textContent = text;
}
function hideLoadingOverlay() {
    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('cancel-btn').style.display = 'none';
    isGenerating = false;
}

// Cancellation and modal helpers
function closeOneClickModal() {
    document.getElementById('one-click-modal').classList.remove('active');
}
async function closeCustomAlertWindow() { await closeCustomAlert(true); }

// INITIALIZATION
function initializeApp() {
    console.log(`NovelFactory v${CONFIG.VERSION} - Initializing...`);
    
    // Load or initialize settings
    if (!window.aiSettings) {
        window.aiSettings = aiSettings;
    }
    
    loadSettings();
    loadProjects();
    
    setupEventListeners();
    setupKeyboardShortcuts();
    setupAutoSave();
    
    initializePrompts();
    updateModelSelect();
    updateNavProgress();
    
    // Feedback modes initial state
    ['outline', 'chapters', 'writing'].forEach(step => {
        const sel = document.getElementById(`${step}-feedback-mode`);
        if (sel) {
            sel.value = 'ai';
            toggleManualFeedback(step);
        }
    });
    
    // Theme
    const savedTheme = localStorage.getItem('novelfactory_theme') || 'light';
    setTheme(savedTheme);
    
    // Collapse sections default
    document.querySelectorAll('.collapsible-content').forEach(content => {
        content.style.display = 'none';
    });
    
    console.log('NovelFactory initialization complete');
}

// DOM ready
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function setupModalEventListeners() {
    // Custom input modal event listeners
    document.getElementById('input-ok-btn').addEventListener('click', () => {
        const value = document.getElementById('input-field').value;
        closeCustomInput(value);
    });
    
    document.getElementById('input-cancel-btn').addEventListener('click', () => {
        closeCustomInput(null);
    });
    
    // Add keyboard support for input field
    document.getElementById('input-field').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const value = document.getElementById('input-field').value;
            closeCustomInput(value);
        } else if (e.key === 'Escape') {
            closeCustomInput(null);
        }
    });
}

// On full page load
window.addEventListener('load', function() {
    loadFromLocalStorage();
    updateWordCount();
    updateChapterEstimate();
    updateModelInfo();
    updateNavProgress();
    setupModalEventListeners();
});

// Auto-save on unload
window.addEventListener('beforeunload', function() {
    autoSave();
});

// Global error handling
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    if (document.getElementById('loading-overlay')?.style.display !== 'none') {
        hideLoadingOverlay();
        customAlert('An unexpected error occurred. Please try again.', 'Error');
    }
});

// Network status
window.addEventListener('online', function() {
    console.log('Connection restored');
});
window.addEventListener('offline', function() {
    customAlert('You appear to be offline. Some features may not work until connection is restored.', 'Connection Issue');
});

// Development helpers
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.bookData = bookData;
    window.aiSettings = aiSettings;
    window.CONFIG = CONFIG;
    console.log('Development mode: Global variables exposed for debugging');
}

// ==================================================
// MISSING FUNCTIONS
// ==================================================

/**
 * Reset everything and start a new project
 */
async function resetEverything() {
    const confirmed = await customConfirm('This will clear all current work and start fresh. Are you sure?', 'Reset Everything');
    if (!confirmed) return;
    
    // Reset book data
    bookData = {
        id: 'current',
        title: '',
        blurb: '',
        genre: '',
        targetAudience: '',
        premise: '',
        styleDirection: '',
        numChapters: 20,
        targetWordCount: 2000,
        outline: '',
        chapterOutline: '',
        chapters: [],
        currentStep: 'setup',
        createdAt: new Date().toISOString(),
        lastSaved: new Date().toISOString()
    };
    
    // Clear all form fields
    document.getElementById('genre').value = '';
    document.getElementById('target-audience').value = '';
    document.getElementById('premise').value = '';
    document.getElementById('style-direction').value = '';
    document.getElementById('num-chapters').value = '20';
    document.getElementById('target-word-count').value = '2000';
    document.getElementById('outline-content').value = '';
    document.getElementById('chapters-content').value = '';
    
    // Clear chapters container
    const container = document.getElementById('chapters-container');
    if (container) {
        container.innerHTML = '<div class="writing-placeholder"><p>Setting up writing interface...</p></div>';
    }
    
    // Reset navigation
    showStep('setup');
    updateNavProgress();
    updateWordCount();
    updateChapterEstimate();
    
    // Save the reset state
    autoSave();
    
    await customAlert('Everything has been reset. You can now start a new project.', 'Reset Complete');
}

/**
 * Show generation progress info
 * @param {string} message - Progress message
 */
function showGenerationInfo(message = '') {
    // Don't show generation indicator if loading overlay is already active
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay && loadingOverlay.style.display === 'flex') {
        // Update loading overlay text instead
        if (message) {
            document.getElementById('loading-text').textContent = message;
        }
        return;
    }
    
    const indicator = document.getElementById('generation-indicator');
    if (!indicator) return;
    
    if (message) {
        document.getElementById('generation-description').textContent = message;
    }
    
    indicator.style.display = 'flex';
}

/**
 * Hide generation progress info
 */
function hideGenerationInfo() {
    // Don't hide if loading overlay is active (let loading overlay handle the display)
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay && loadingOverlay.style.display === 'flex') {
        return;
    }
    
    const indicator = document.getElementById('generation-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
    isGenerating = false;
}

// Console welcome
console.log(`

NovelFactory v${CONFIG.VERSION}
https://novelfactory.ink

Happy writing!
`);
