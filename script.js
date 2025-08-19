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
    VERSION: '1.0.7'
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
    styleExcerpt: '',
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

/**
 * Undo/Redo system
 */
let undoStack = [];
let redoStack = [];
const MAX_UNDO_STATES = 50;

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
        
        // For cost estimation, use direct HTML and adjust modal width
        if (title === 'Cost Estimation') {
            messageElement.innerHTML = message;
            messageElement.style.fontFamily = '';
            messageElement.style.fontSize = '';
            messageElement.style.lineHeight = '';
            messageElement.style.textAlign = 'left';
            messageElement.style.whiteSpace = 'normal';
            messageElement.style.overflowWrap = '';
            messageElement.style.fontWeight = '';
            modal.querySelector('.modal-content').style.maxWidth = '600px';
            modal.querySelector('.modal-content').style.width = '95%';
        } else {
            messageElement.innerHTML = message.replace(/\n/g, '<br>');
            // Reset to default styling for other alerts
            messageElement.style.fontSize = '';
            messageElement.style.lineHeight = '';
            messageElement.style.textAlign = 'center';
            messageElement.style.whiteSpace = '';
            messageElement.style.overflowWrap = '';
            messageElement.style.fontWeight = '';
            modal.querySelector('.modal-content').style.maxWidth = '500px';
            modal.querySelector('.modal-content').style.width = '90%';
        }
        
        okBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'none';
        
        alertCallback = resolve;
        modal.classList.add('active');
        
        // Ensure modal opens at the top - use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
            modal.scrollTop = 0;
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.scrollTop = 0;
            }
            // For Cost Estimation, also scroll the message element to top
            if (title === 'Cost Estimation') {
                messageElement.scrollTop = 0;
            }
        }, 10);
        
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
    outline: `You are a master storyteller creating a comprehensive STORY BIBLE for a {genre} novel targeting {targetAudience}. Create a complete reference document that will guide all future writing.

BOOK CONCEPT:
- Premise: {premise}
- Style Direction: {styleDirection}
- Chapters: {numChapters}
- Genre Requirements: {genreRequirements}

CREATE A COMPLETE STORY BIBLE:

## 1. CORE STORY FOUNDATIONS
**Premise & Logline:** One-sentence hook + core concept
**Central Themes:** 2-3 key ideas explored (love, betrayal, survival, freedom, etc.)
**Genre & Tone:** Mood, style, and audience expectations

## 2. THREE-ACT STORY STRUCTURE MAP
**ACT ONE: SETUP (Chapters 1-{act1End})**
- Business as Usual: Protagonist's ordinary world, strengths, flaws, desires
- Stumble: Early disruptions highlighting potential and wounds
- Inciting Incident: Event that shatters stability and forces story goal
- Coping & Denial: Protagonist scrambles, clings to flawed beliefs
- Point of No Return: Forced out of comfort zone into new world

**ACT TWO: CONFRONTATION (Chapters {act2Start}-{act2End})**
- Entering New World: Rules shift, dangers intensify
- First Encounters: Antagonist looms, protagonist underestimates threat
- Early Wins & Setbacks: Beginner's luck, then harsh lessons
- False Beliefs Tested: Coping mechanisms fail, forcing adaptation
- Twist/Midpoint Revelation: Deeper truth revealed - wrong battle or higher stakes
- Escalation: Confidence grows but flaws drag down, antagonist tightens grip
- Crisis: Devastating loss mirrors wound, pushes to brink

**ACT THREE: RESOLUTION (Chapters {act3Start}-{numChapters})**
- Dark Night of Soul: Hopelessness forces confronting misbelief as lie
- Renewed Purpose: Choosing growth, embracing new truth
- Final Confrontation: Ultimate showdown at full power
- Decisive Blow: Victory only possible by abandoning misbelief
- Aftermath: World resets, protagonist demonstrates lasting change

## 3. MAIN CHARACTERS
**PROTAGONIST:**
- Name, role, physical description, mannerisms
- Personality traits, voice, backstory, formative wounds
- Core misbelief/flaw, external goals, internal needs
- Complete growth arc through story

**ANTAGONIST:**
- Name, role, motives, philosophy, power, flaws
- How they oppose protagonist and represent thematic conflict

**SUPPORTING CAST:**
- Key allies, mentors, rivals with distinct roles
- Character web showing relationships and dynamics

## 4. WORLDBUILDING
**Setting & Locations:** Key places where story unfolds
**Culture & Society:** Social structure, traditions, beliefs relevant to story
**Rules of the World:** Magic/science/technology systems and limitations
**History & Lore:** Background events that impact current story

## 5. STORY-SPECIFIC ELEMENTS
**Conflict Map:** Antagonist's plan vs protagonist's goals
**Mysteries & Reveals:** What's hidden and when it's revealed
**Foreshadowing Seeds:** Setups for later payoffs
**Key Subplots:** Romance, rivalries, secondary character arcs
**Important Objects:** Weapons, artifacts, symbols that drive plot

Create a complete reference that ensures consistency and depth throughout all {numChapters} chapters.`, 

    chapters: `You are a master storyteller creating a complete chapter outline for ALL {numChapters} chapters in a single response. Use the story bible to create detailed chapter breakdowns.

STORY BIBLE:
{outline}

TARGET: {targetWordCount} words per chapter

CREATE COMPLETE CHAPTER OUTLINE FOR ALL CHAPTERS (1-{numChapters}):

For EACH chapter, provide:

**CHAPTER [NUMBER]: [COMPELLING TITLE]**

*Scene Structure:*
- Opening Hook: How chapter begins (continuation or new scene)
- Plot Beats: 2-3 key events that advance main story
- Character Moments: Development, relationships, emotional beats
- Chapter Climax: Tension peak, revelation, or turning point
- Ending Hook: Transition that pulls reader to next chapter

*Chapter Details:*
- POV Character: Who tells this chapter
- Setting: Where scenes take place
- Conflicts: Main obstacles/problems in this chapter
- Revelations: Information revealed or discovered
- Word Target: ~{targetWordCount} words

*Continuity Notes:* Key details for consistency

---

Continue this format for ALL {numChapters} chapters. Ensure each chapter flows logically from the previous while building toward the climax. Maintain consistent pacing and character development throughout.

IMPORTANT: Generate the complete outline for ALL chapters in this single response - do not split or abbreviate.`, 

    writing: `You are a master {genre} author writing Chapter {chapterNum}. Follow the chapter outline precisely - it is your highest priority.

**CHAPTER {chapterNum} OUTLINE (FOLLOW EXACTLY):**
{chapterOutline}

**PREVIOUS CHAPTER ENDING (for smooth transition):**
{previousChapterEnding}

{styleExcerptSection}

**WRITING REQUIREMENTS:**
- Target Length: {targetWordCount} words
- Style: {styleDirection}
- Audience: {targetAudience}

**CRITICAL INSTRUCTIONS:**
1. Follow the chapter outline exactly - do not deviate or continue past the planned ending
2. Focus on the current chapter's specific plot beats and character moments
3. Create smooth transition from previous chapter ending
4. End exactly where the outline specifies
5. Avoid melodramatic or overly emotional dialogue/descriptions
6. Show don't tell - use concrete actions and dialogue over internal thoughts
7. Keep dialogue natural and character-appropriate

**PROSE BALANCE:**
- Dialogue: 40% (natural, distinct character voices)
- Action/Events: 35% (show story progress through scenes)
- Description: 25% (efficient scene-setting, avoid purple prose)

**GENRE ELEMENTS:** {genreSpecificElements}

Write Chapter {chapterNum} following the outline exactly. Do not reference the broader story bible unless directly relevant to this chapter's events.`, 

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

5. **FORMAT AND STRUCTURE**:
   - Proper organization of content (headings, sections, etc.)
   - Consistent formatting throughout
   - Appropriate use of structural elements for the content type
   - Clear division between narrative elements

6. **PRIORITY IMPROVEMENTS**:
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

CRITICAL FORMAT REQUIREMENTS:
- Maintain the exact same structure and format as the original content
- Preserve all headings, sections, and organizational elements
- Keep the same narrative format (chapters, scenes, etc.)
- Do not add new structural elements unless specifically needed for improvement
- Ensure the output has the same type of content organization as the input

Write the complete improved {contentType} with all enhancements seamlessly integrated, maintaining the original format and structure exactly.`, 
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

Create an improved version that perfectly addresses the manual feedback while maintaining the highest standards of storytelling craft.

CRITICAL FORMAT REQUIREMENTS:
- Maintain the exact same structure and format as the original content unless manual feedback specifically requests format changes
- Preserve all headings, sections, and organizational elements
- Keep the same narrative format (chapters, scenes, etc.)
- Do not add new structural elements unless specifically requested in the manual feedback
- Ensure the output maintains the same type of content organization as the input

Provide the complete improved {contentType} with manual feedback fully implemented, preserving the original format and structure unless explicitly instructed otherwise.`
};

// ==================================================
// THEME MANAGEMENT
// ==================================================

const themes = ['light', 'dark'];

/**
 * Change theme based on dropdown selection
 */
function changeTheme() {
    const selectedTheme = document.getElementById('theme-select').value;
    setTheme(selectedTheme);
}

/**
 * Switch theme using button-based toggle
 * @param {string} theme - Theme name
 */
function switchTheme(theme) {
    setTheme(theme);
    
    // Update button states
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === theme) {
            btn.classList.add('active');
        }
    });
}

/**
 * Set application theme
 * @param {string} theme - Theme name
 */
function setTheme(theme) {
    currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('novelfactory_theme', theme);
    
    // Update theme button active states
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === theme) {
            btn.classList.add('active');
        }
    });
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
    
    // Only set active step, no completed states
    steps.forEach((step, index) => {
        const navItem = document.querySelector(`[data-step="${step}"]`);
        if (navItem) {
            navItem.classList.remove('completed', 'active');
            if (index === currentIndex) {
                navItem.classList.add('active');
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

    // Random idea button visibility - always visible with styling based on selection
    function checkRandomButtonVisibility() {
        const randomBtn = document.getElementById('random-idea-btn');
        if (randomBtn) {
            randomBtn.style.display = 'inline-flex';
            
            if (genreSelect.value && audienceSelect.value) {
                // Both selected - normal styling
                randomBtn.style.opacity = '1';
                randomBtn.style.cursor = 'pointer';
            } else {
                // Not both selected - lighter gray styling
                randomBtn.style.opacity = '0.6';
                randomBtn.style.cursor = 'pointer';
            }
        }
    }
    
    if (genreSelect) genreSelect.addEventListener('change', checkRandomButtonVisibility);
    if (audienceSelect) audienceSelect.addEventListener('change', checkRandomButtonVisibility);
    
    // Make sure button is visible on page load
    checkRandomButtonVisibility();

    // Word count updates
    const premise = document.getElementById('premise');
    const styleDirection = document.getElementById('style-direction');
    if (premise) premise.addEventListener('input', updateWordCount);
    if (styleDirection) styleDirection.addEventListener('input', updateWordCount);
    
    // Feedback mode change listeners (removed as Advanced Settings sections were removed)

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
    const modeEl = document.getElementById(`${step}-feedback-mode`);
    const manualSection = document.getElementById(`${step}-manual-feedback`);
    
    if (modeEl && manualSection) {
        const mode = modeEl.value;
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
        // Check if feedback elements exist (they may have been removed)
        const feedbackLoopsEl = document.getElementById(`${contentType}-feedback-loops`);
        const feedbackModeEl = document.getElementById(`${contentType}-feedback-mode`);
        
        if (!feedbackLoopsEl || !feedbackModeEl) {
            console.log(`Feedback elements for ${contentType} not found. Skipping feedback loop.`);
            return;
        }
        
        const feedbackLoops = parseInt(feedbackLoopsEl.value);
        if (feedbackLoops === 0) return;

        const feedbackMode = feedbackModeEl.value;
        let content = getContentForFeedback(contentType);

        if (!content) {
            await customAlert(`No ${contentType} content to analyze. Please generate content first.`, 'No Content');
            return;
        }

        // Get manual feedback if in manual mode
        let manualFeedback = '';
        if (feedbackMode === 'manual') {
            const manualInputEl = document.getElementById(`${contentType}-manual-input`);
            if (manualInputEl) {
                manualFeedback = manualInputEl.value;
                if (!manualFeedback.trim()) {
                    await customAlert('Please provide manual feedback instructions before running the feedback loop.', 'Missing Feedback');
                    return;
                }
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
    bookData.styleExcerpt = document.getElementById('style-excerpt').value;
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
    
    // Save state for undo before generating
    saveStateForUndo('Generate Story Bible');
    
    isGenerating = true;
    showGenerationInfo("Generating complete story bible...");

    try {
        collectBookData();
        
        const act1End = Math.ceil(bookData.numChapters * 0.25);
        const act2Start = act1End + 1;
        const act2End = Math.ceil(bookData.numChapters * 0.75);
        const act3Start = act2End + 1;

        const genreReq = genreRequirements[bookData.genre] || { requirements: '', pacing: '' };
        const genreRequirementsText = `${genreReq.requirements}\nPacing: ${genreReq.pacing}`;

        const selectedModel = getSelectedModel('outline');

        const promptEl = document.getElementById('outline-prompt');
        const prompt = formatPrompt(promptEl ? promptEl.value : (aiSettings.customPrompts?.outline || defaultPrompts.outline), {
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

        const outline = await callAI(prompt, "You are a master storyteller and bestselling author creating commercially successful story bibles.", selectedModel);
        
        const outlineTextarea = document.getElementById('outline-content');
        if (outlineTextarea) {
            outlineTextarea.value = outline;
            saveOutlineContent();
        }
        

    } catch (error) {
        await customAlert(`Error generating story bible: ${error.message}`, 'Generation Error');
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
    
    // Save state for undo before generating
    saveStateForUndo('Generate Chapter Outline');
    
    isGenerating = true;
    showGenerationInfo("Creating detailed chapter outline with scene breakdowns...");

    try {
        const selectedModel = getSelectedModel('chapters');
        
        const promptEl = document.getElementById('chapters-prompt');
        const prompt = formatPrompt(promptEl ? promptEl.value : (aiSettings.customPrompts?.chapters || defaultPrompts.chapters), {
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
        

    } catch (error) {
        await customAlert(`Error generating chapter outline: ${error.message}`, 'Generation Error');
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
    const confirmed = await customConfirm('Are you sure you want to clear the story bible content?', 'Clear Content');
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
    const confirmed = await customConfirm('Are you sure you want to clear the chapter outline content?', 'Clear Content');
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
    if (!container) return;
    
    container.innerHTML = '';
    
    // Ensure numChapters is valid
    if (!bookData.numChapters || bookData.numChapters < 1) {
        bookData.numChapters = 20; // Default value
    }
    
    // Ensure chapters array is properly sized
    if (!bookData.chapters) {
        bookData.chapters = [];
    }
    bookData.chapters = Array(bookData.numChapters).fill(null).map((_, i) => bookData.chapters[i] || '');

    // Add primary generation actions section (similar to story structure and chapter planning)
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'primary-actions-section';
    actionsDiv.innerHTML = `
        <div class="main-generation-actions">
            <button class="btn btn-primary btn-large" onclick="generateAllChapters()">
                <span class="label">Generate All Chapters</span>
            </button>
            <button class="btn btn-primary" onclick="generateSelectedChapters()" id="generate-selected-btn" disabled>
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
            <div class="chapter-header" aria-label="Chapter ${i} header">
                <button class="collapse-chapter-btn" onclick="toggleChapterCollapse(${i})" title="Collapse/Expand Chapter" aria-label="Collapse/Expand Chapter">
                    <i class="fas fa-angle-down"></i>
                </button>
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
                    <button class="btn btn-primary btn-sm" onclick="generateSingleChapter(${i})" id="chapter-${i}-generate-btn">
                        <span class="label">Generate</span>
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="showChapterEditModal(${i})">
                        <span class="label">Edit</span>
                    </button>
                </div>
            </div>
            
            <div class="chapter-content-field" id="chapter-${i}-content-field" style="display: block; padding-top: 8px;">
                <div class="form-group">
                    <div class="line-editing-controls" style="margin-bottom: 8px;">
                        <div class="line-edit-buttons">
                            <button class="btn btn-ghost btn-sm" onclick="continueWriting(${i})" title="Continue writing from cursor position (~200-300 words)">
                                <i class="fas fa-arrow-right"></i> Continue
                            </button>
                            <button class="btn btn-ghost btn-sm" onclick="rewriteSelection(${i})" title="Rewrite selected paragraph with context awareness">
                                <i class="fas fa-edit"></i> Rewrite
                            </button>
                            <button class="btn btn-ghost btn-sm" onclick="expandSelection(${i})" title="Expand selected paragraph with more details">
                                <i class="fas fa-expand-arrows-alt"></i> Expand
                            </button>
                            <button class="btn btn-ghost btn-sm" onclick="showDontTell(${i})" title="Convert selected paragraph to 'show don't tell' style">
                                <i class="fas fa-eye"></i> Show Don't Tell
                            </button>
                        </div>
                        <div class="line-edit-hint">Select text for rewrite/expand/show options, or place cursor for continue</div>
                    </div>
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
    
    if (!contentField) {
        console.warn(`Content field not found for chapter ${chapterNum}. Make sure you're on the Writing tab and chapters are initialized.`);
        return;
    }
    
    // Toggle the collapsed class
    contentField.classList.toggle('collapsed');
    
    // Update the button icon
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
    
    // Save state for undo before generating
    saveStateForUndo(`Generate Chapter ${chapterNum}`);
    
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
            previousChapterEnding = words.slice(-500).join(' ');
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

        // Add style excerpt section if provided
        const styleExcerptSection = bookData.styleExcerpt ? 
`CRITICAL: WRITING STYLE EXAMPLE (EMULATE THIS STYLE HEAVILY):

The following excerpt demonstrates the EXACT writing style, voice, tone, and prose structure you must emulate. Pay close attention to:
- Sentence structure and rhythm
- Word choice and vocabulary level  
- Dialogue style and character voice
- Descriptive language and imagery
- Pacing and flow

STYLE EXAMPLE TO EMULATE:
"${bookData.styleExcerpt}"

**Write your chapter in this EXACT style. This is your highest priority - match this voice and prose style precisely.**

` : '';

        const promptEl = document.getElementById('writing-prompt');
        const prompt = formatPrompt(promptEl ? promptEl.value : (aiSettings.customPrompts?.writing || defaultPrompts.writing), {
            chapterNum: chapterNum,
            genre: bookData.genre,
            targetAudience: bookData.targetAudience,
            styleDirection: bookData.styleDirection,
            targetWordCount: bookData.targetWordCount,
            chapterOutline: chapterOutline,
            previousChapterEnding: previousChapterEnding,
            genreSpecificElements: genreSpecificElements,
            styleExcerptSection: styleExcerptSection
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

// ==================================================
// LINE EDITING FUNCTIONS
// ==================================================

/**
 * Continue writing from cursor position
 * @param {number} chapterNum - Chapter number
 */
async function continueWriting(chapterNum) {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    // Save state for undo
    saveStateForUndo(`Continue Chapter ${chapterNum}`);
    
    const textarea = document.getElementById(`chapter-${chapterNum}-content`);
    if (!textarea) {
        await customAlert('Chapter textarea not found. Please try again.', 'Error');
        return;
    }
    
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPosition);
    const textAfterCursor = textarea.value.substring(cursorPosition);
    
    isGenerating = true;
    showGenerationInfo(`Continuing Chapter ${chapterNum} from cursor position...`);
    
    try {
        const contextBefore = textBeforeCursor.split(' ').slice(-500).join(' '); // Last 500 words
        const contextAfter = textAfterCursor.split(' ').slice(0, 500).join(' '); // Next 500 words
        
        const styleExcerptSection = bookData.styleExcerpt ? 
`CRITICAL: WRITING STYLE TO MATCH:
"${bookData.styleExcerpt}"
**Match this style exactly - voice, tone, sentence structure, vocabulary level.**

` : '';

        const prompt = `You are a master ${bookData.genre} storyteller continuing a chapter mid-sentence or mid-paragraph.

BOOK CONTEXT:
- Genre: ${bookData.genre}
- Target Audience: ${bookData.targetAudience}
- Style Direction: ${bookData.styleDirection}

CHAPTER ${chapterNum} CONTEXT:
- Complete Story Bible: ${bookData.outline}
- Chapter Outline: ${extractChapterOutline(bookData.chapterOutline, chapterNum)}

${styleExcerptSection}

CONTINUATION TASK:
Continue writing seamlessly from where the cursor is positioned. Write approximately 200-300 words that:

PRECEDING TEXT (for context):
"${contextBefore}"

FOLLOWING TEXT (to connect to):
"${textAfterCursor ? `"${contextAfter}"` : 'END OF CHAPTER'}"

REQUIREMENTS:
- Continue seamlessly from the preceding text
- Write in the established voice and style
- Advance the plot naturally according to the chapter outline
- Maintain character consistency
- Write 200-300 words of engaging, publishable prose
- If there's following text, ensure your continuation flows smoothly into it
- Match the genre conventions for ${bookData.genre}

Write the continuation only (no explanations or meta-text):`;

        const continuation = await callAI(prompt, `You are continuing a ${bookData.genre} chapter with seamless narrative flow.`, getSelectedModel('writing'));
        
        // Insert the continuation at cursor position
        const newContent = textBeforeCursor + continuation + textAfterCursor;
        textarea.value = newContent;
        
        // Position cursor at end of inserted text
        const newCursorPosition = textBeforeCursor.length + continuation.length;
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
        
        updateChapterContent(chapterNum);
        
    } catch (error) {
        await customAlert(`Failed to continue writing: ${error.message}`, 'Continue Writing Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Rewrite selected text with context awareness
 * @param {number} chapterNum - Chapter number
 */
async function rewriteSelection(chapterNum) {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    const textarea = document.getElementById(`chapter-${chapterNum}-content`);
    if (!textarea) {
        await customAlert('Chapter textarea not found. Please try again.', 'Error');
        return;
    }
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start === end) {
        await customAlert('Please select text to rewrite first.', 'No Selection');
        return;
    }
    
    // Save state for undo
    saveStateForUndo(`Rewrite Selection Chapter ${chapterNum}`);
    
    const selectedText = textarea.value.substring(start, end);
    const textBefore = textarea.value.substring(0, start);
    const textAfter = textarea.value.substring(end);
    
    isGenerating = true;
    showGenerationInfo(`Rewriting selected text in Chapter ${chapterNum}...`);
    
    try {
        const contextBefore = textBefore.split(' ').slice(-500).join(' ');
        const contextAfter = textAfter.split(' ').slice(0, 500).join(' ');
        
        const styleExcerptSection = bookData.styleExcerpt ? 
`CRITICAL: WRITING STYLE TO MATCH:
"${bookData.styleExcerpt}"
**Match this style exactly - voice, tone, sentence structure, vocabulary level.**

` : '';

        const prompt = `You are a master ${bookData.genre} editor improving a paragraph while maintaining story continuity.

BOOK CONTEXT:
- Genre: ${bookData.genre}
- Target Audience: ${bookData.targetAudience}
- Style Direction: ${bookData.styleDirection}

CHAPTER ${chapterNum} CONTEXT:
- Complete Story Bible: ${bookData.outline}
- Chapter Outline: ${extractChapterOutline(bookData.chapterOutline, chapterNum)}

${styleExcerptSection}

REWRITING TASK:
Improve the following paragraph while maintaining perfect continuity with surrounding text:

PRECEDING TEXT:
"${contextBefore}"

TEXT TO REWRITE:
"${selectedText}"

FOLLOWING TEXT:
"${contextAfter}"

REQUIREMENTS:
- Improve the prose quality, clarity, and engagement
- Maintain the same story events and character actions
- Ensure smooth transition from preceding text
- Ensure smooth connection to following text
- Match the established voice and style
- Keep the same general paragraph length
- Enhance dialogue, descriptions, or action as appropriate

Provide only the improved paragraph (no explanations):`;

        const rewrittenText = await callAI(prompt, `You are improving ${bookData.genre} prose while maintaining story continuity.`, getSelectedModel('writing'));
        
        // Replace selected text with rewritten version
        const newContent = textBefore + rewrittenText + textAfter;
        textarea.value = newContent;
        
        // Select the new text
        textarea.setSelectionRange(start, start + rewrittenText.length);
        
        updateChapterContent(chapterNum);
        
    } catch (error) {
        await customAlert(`Failed to rewrite selection: ${error.message}`, 'Rewrite Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Expand selected text with more details
 * @param {number} chapterNum - Chapter number
 */
async function expandSelection(chapterNum) {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    const textarea = document.getElementById(`chapter-${chapterNum}-content`);
    if (!textarea) {
        await customAlert('Chapter textarea not found. Please try again.', 'Error');
        return;
    }
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start === end) {
        await customAlert('Please select text to expand first.', 'No Selection');
        return;
    }
    
    // Save state for undo
    saveStateForUndo(`Expand Selection Chapter ${chapterNum}`);
    
    const selectedText = textarea.value.substring(start, end);
    const textBefore = textarea.value.substring(0, start);
    const textAfter = textarea.value.substring(end);
    
    isGenerating = true;
    showGenerationInfo(`Expanding selected text in Chapter ${chapterNum}...`);
    
    try {
        const contextBefore = textBefore.split(' ').slice(-500).join(' ');
        const contextAfter = textAfter.split(' ').slice(0, 500).join(' ');
        
        const styleExcerptSection = bookData.styleExcerpt ? 
`CRITICAL: WRITING STYLE TO MATCH:
"${bookData.styleExcerpt}"
**Match this style exactly - voice, tone, sentence structure, vocabulary level.**

` : '';

        const prompt = `You are a master ${bookData.genre} writer expanding a paragraph with rich detail and depth.

BOOK CONTEXT:
- Genre: ${bookData.genre}
- Target Audience: ${bookData.targetAudience}
- Style Direction: ${bookData.styleDirection}

CHAPTER ${chapterNum} CONTEXT:
- Complete Story Bible: ${bookData.outline}
- Chapter Outline: ${extractChapterOutline(bookData.chapterOutline, chapterNum)}

${styleExcerptSection}

EXPANSION TASK:
Take the following paragraph and expand it with rich details, deeper character insight, more vivid descriptions, and enhanced atmosphere while maintaining story continuity:

PRECEDING TEXT:
"${contextBefore}"

TEXT TO EXPAND:
"${selectedText}"

FOLLOWING TEXT:
"${contextAfter}"

REQUIREMENTS:
- Expand with sensory details, internal thoughts, dialogue, or environmental descriptions
- Maintain the same story events and character actions
- Add depth and richness without changing the plot
- Ensure smooth transition from preceding text
- Ensure smooth connection to following text
- Match the established voice and style
- Make it approximately 1.5-2x longer than original
- Enhance the emotional resonance and immersion

Provide only the expanded paragraph (no explanations):`;

        const expandedText = await callAI(prompt, `You are expanding ${bookData.genre} prose with rich details and depth.`, getSelectedModel('writing'));
        
        // Replace selected text with expanded version
        const newContent = textBefore + expandedText + textAfter;
        textarea.value = newContent;
        
        // Select the new text
        textarea.setSelectionRange(start, start + expandedText.length);
        
        updateChapterContent(chapterNum);
        
    } catch (error) {
        await customAlert(`Failed to expand selection: ${error.message}`, 'Expand Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Convert selected text to "show don't tell" style
 * @param {number} chapterNum - Chapter number  
 */
async function showDontTell(chapterNum) {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    const textarea = document.getElementById(`chapter-${chapterNum}-content`);
    if (!textarea) {
        await customAlert('Chapter textarea not found. Please try again.', 'Error');
        return;
    }
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start === end) {
        await customAlert('Please select text to convert to "show don\'t tell" first.', 'No Selection');
        return;
    }
    
    // Save state for undo
    saveStateForUndo(`Show Don't Tell Chapter ${chapterNum}`);
    
    const selectedText = textarea.value.substring(start, end);
    const textBefore = textarea.value.substring(0, start);
    const textAfter = textarea.value.substring(end);
    
    isGenerating = true;
    showGenerationInfo(`Converting to "show don't tell" in Chapter ${chapterNum}...`);
    
    try {
        const contextBefore = textBefore.split(' ').slice(-500).join(' ');
        const contextAfter = textAfter.split(' ').slice(0, 500).join(' ');
        
        const styleExcerptSection = bookData.styleExcerpt ? 
`CRITICAL: WRITING STYLE TO MATCH:
"${bookData.styleExcerpt}"
**Match this style exactly - voice, tone, sentence structure, vocabulary level.**

` : '';

        const prompt = `You are a master ${bookData.genre} writer expert in "show don't tell" technique. Transform telling statements into vivid, immersive showing.

BOOK CONTEXT:
- Genre: ${bookData.genre}
- Target Audience: ${bookData.targetAudience}
- Style Direction: ${bookData.styleDirection}

CHAPTER ${chapterNum} CONTEXT:
- Complete Story Bible: ${bookData.outline}
- Chapter Outline: ${extractChapterOutline(bookData.chapterOutline, chapterNum)}

${styleExcerptSection}

SHOW DON'T TELL TASK:
Transform the following text from "telling" to "showing" using:
- Actions and behaviors instead of statements
- Sensory details and imagery
- Dialogue that reveals character
- Body language and physical reactions
- Environmental details that reflect mood
- Character thoughts and internal reactions

PRECEDING TEXT:
"${contextBefore}"

TEXT TO TRANSFORM (from telling to showing):
"${selectedText}"

FOLLOWING TEXT:
"${contextAfter}"

REQUIREMENTS:
- Replace exposition with action and imagery
- Show character emotions through behavior, not statements
- Use concrete, specific details instead of abstract concepts
- Maintain the same story information and events
- Ensure smooth transition from preceding text
- Ensure smooth connection to following text  
- Match the established voice and style
- Make the reader experience rather than be told

Provide only the transformed "showing" paragraph (no explanations):`;

        const showingText = await callAI(prompt, `You are transforming ${bookData.genre} prose to masterful "show don't tell" technique.`, getSelectedModel('writing'));
        
        // Replace selected text with showing version
        const newContent = textBefore + showingText + textAfter;
        textarea.value = newContent;
        
        // Select the new text
        textarea.setSelectionRange(start, start + showingText.length);
        
        updateChapterContent(chapterNum);
        
    } catch (error) {
        await customAlert(`Failed to convert to "show don't tell": ${error.message}`, 'Show Don\'t Tell Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
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
            showGenerationInfo(`Batch generation complete! ${completed} chapters generated.`);
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
        // Check if feedback elements exist (they may have been removed)
        const feedbackLoopsEl = document.getElementById('writing-feedback-loops');
        const feedbackModeEl = document.getElementById('writing-feedback-mode');
        
        // Use default values if elements don't exist
        const feedbackLoops = feedbackLoopsEl ? parseInt(feedbackLoopsEl.value) || 1 : 1;
        const feedbackMode = feedbackModeEl ? feedbackModeEl.value : 'ai';

        let manualFeedback = '';
        if (feedbackMode === 'manual') {
            const manualInputEl = document.getElementById('writing-manual-input');
            if (manualInputEl) {
                manualFeedback = manualInputEl.value;
                if (!manualFeedback.trim()) {
                    await customAlert('Please provide manual feedback instructions before running the feedback loop.', 'Missing Feedback');
                    return;
                }
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

// Global variable to store current chapter being edited
let currentEditingChapter = null;

// Global variable to store chapter content for undo functionality
let currentChapterEditMode = 'automated';

/**
 * Show chapter edit modal
 * @param {number} chapterNum - Chapter number
 */
function showChapterEditModal(chapterNum) {
    // Ensure writing interface is initialized so chapter elements exist
    ensureWritingInterfaceInitialized();
    
    currentEditingChapter = chapterNum;
    
    // Update modal title
    document.getElementById('chapter-edit-title').textContent = `Edit Chapter ${chapterNum}`;
    
    // Reset form
    selectEditMode('automated');
    document.getElementById('chapter-edit-instructions').value = '';
    document.getElementById('chapter-edit-loops').value = '1';
    
    // Show modal
    document.getElementById('chapter-edit-modal').style.display = 'flex';
}

/**
 * Toggle edit mode using toggle switch
 * @param {HTMLInputElement} toggleElement - The checkbox input element
 */
function toggleEditMode(toggleElement) {
    const mode = toggleElement.checked ? 'automated' : 'manual';
    currentChapterEditMode = mode;
    
    // Update status text
    const statusElement = document.getElementById('edit-mode-status');
    if (statusElement) {
        statusElement.textContent = mode === 'automated' ? 'Automated' : 'Manual';
    }
    
    // Show/hide manual feedback section
    const manualSection = document.getElementById('manual-edit-feedback');
    if (mode === 'manual') {
        manualSection.style.display = 'block';
    } else {
        manualSection.style.display = 'none';
    }
}

/**
 * Select edit mode and update UI (legacy function for compatibility)
 * @param {string} mode - 'automated' or 'manual'
 */
function selectEditMode(mode) {
    const toggle = document.getElementById('edit-mode-toggle');
    if (toggle) {
        toggle.checked = mode === 'automated';
        toggleEditMode(toggle);
    }
}

/**
 * Close chapter edit modal
 */
function closeChapterEditModal() {
    document.getElementById('chapter-edit-modal').style.display = 'none';
    currentEditingChapter = null;
}

/**
 * Execute chapter edit based on selected mode
 */
async function executeChapterEdit() {
    if (!currentEditingChapter) {
        return;
    }
    
    const editMode = currentChapterEditMode;
    const feedbackLoops = parseInt(document.getElementById('chapter-edit-loops').value);
    let manualFeedback = '';
    
    if (editMode === 'manual') {
        manualFeedback = document.getElementById('chapter-edit-instructions').value.trim();
        if (!manualFeedback) {
            await customAlert('Please provide edit instructions for manual mode.', 'Missing Instructions');
            return;
        }
    }
    
    // Store the chapter number before closing modal
    const chapterToEdit = currentEditingChapter;
    
    // Close modal
    closeChapterEditModal();
    
    // Execute the edit  
    await runChapterEdit(chapterToEdit, editMode, feedbackLoops, manualFeedback);
}

/**
 * Run chapter edit with specified parameters
 * @param {number} chapterNum - Chapter number
 * @param {string} editMode - 'automated' or 'manual'
 * @param {number} feedbackLoops - Number of edit loops
 * @param {string} manualFeedback - Manual feedback for manual mode
 */
async function runChapterEdit(chapterNum, editMode, feedbackLoops, manualFeedback = '') {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }

    const chapterElement = document.getElementById(`chapter-${chapterNum}-content`);
    if (!chapterElement) {
        await customAlert(`Could not find chapter ${chapterNum} content element. Please try refreshing the page.`, 'Element Not Found');
        return;
    }
    
    const chapter = chapterElement.value;
    
    if (!chapter.trim()) {
        await customAlert('No chapter content to edit. Please write or generate the chapter first.', 'No Content');
        return;
    }


    try {
        isGenerating = true;
        document.getElementById(`chapter-${chapterNum}-status`).innerHTML = `Editing Chapter ${chapterNum}...`;
        showGenerationInfo(`Editing Chapter ${chapterNum} with ${editMode} mode...`);

        let improvedChapter = chapter;
        const feedbackModel = getSelectedModel('feedback');

        for (let i = 0; i < feedbackLoops; i++) {
            showGenerationInfo(`Running ${editMode} edit loop ${i + 1} of ${feedbackLoops}...`);
            
            if (editMode === 'manual') {
                improvedChapter = await runManualFeedback('chapter', improvedChapter, manualFeedback, feedbackModel);
            } else {
                improvedChapter = await runAIFeedback('chapter', improvedChapter, feedbackModel);
            }
        }

        const updateElement = document.getElementById(`chapter-${chapterNum}-content`);
        if (updateElement) {
            updateElement.value = improvedChapter;
            updateChapterContent(chapterNum);
        }

        document.getElementById(`chapter-${chapterNum}-status`).innerHTML = `Edited with ${feedbackLoops} ${editMode} edit loop(s)`;
        
        // Undo/redo now handled by global toolbar
        
    } catch (error) {
        document.getElementById(`chapter-${chapterNum}-status`).innerHTML = `Edit error: ${error.message}`;
        await customAlert(`Error during editing: ${error.message}`, 'Edit Error');
        // No need to clean up undo data - handled by global system
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Undo chapter edit - restore original content
 * @param {number} chapterNum - Chapter number
 */
// Outline Edit Modal Functions
let currentOutlineEditMode = 'automated';

function showOutlineEditModal() {
    // Reset form
    selectOutlineEditMode('automated');
    document.getElementById('outline-edit-instructions').value = '';
    document.getElementById('outline-edit-loops').value = '2';
    
    // Show modal
    document.getElementById('outline-edit-modal').style.display = 'flex';
}

function closeOutlineEditModal() {
    document.getElementById('outline-edit-modal').style.display = 'none';
}

/**
 * Toggle outline edit mode using toggle switch
 * @param {HTMLInputElement} toggleElement - The checkbox input element
 */
function toggleOutlineEditMode(toggleElement) {
    const mode = toggleElement.checked ? 'automated' : 'manual';
    currentOutlineEditMode = mode;
    
    // Update status text
    const statusElement = document.getElementById('outline-edit-mode-status');
    if (statusElement) {
        statusElement.textContent = mode === 'automated' ? 'Automated' : 'Manual';
    }
    
    // Show/hide manual feedback section
    const manualSection = document.getElementById('manual-outline-edit-feedback');
    if (mode === 'manual') {
        manualSection.style.display = 'block';
    } else {
        manualSection.style.display = 'none';
    }
}

function selectOutlineEditMode(mode) {
    const toggle = document.getElementById('outline-edit-mode-toggle');
    if (toggle) {
        toggle.checked = mode === 'automated';
        toggleOutlineEditMode(toggle);
    }
}

async function executeOutlineEdit() {
    const feedbackLoops = parseInt(document.getElementById('outline-edit-loops').value);
    let manualFeedback = '';
    
    if (currentOutlineEditMode === 'manual') {
        manualFeedback = document.getElementById('outline-edit-instructions').value.trim();
        if (!manualFeedback) {
            await customAlert('Please provide edit instructions for manual mode.', 'Instructions Required');
            return;
        }
    }
    
    closeOutlineEditModal();
    
    // Run the edit function (similar to runChapterEdit but for outline)
    await runOutlineEdit(currentOutlineEditMode, feedbackLoops, manualFeedback);
}

// Chapter Outline Edit Modal Functions
let currentChapterOutlineEditMode = 'automated';

function showChapterOutlineEditModal() {
    // Reset form
    selectChapterOutlineEditMode('automated');
    document.getElementById('chapter-outline-edit-instructions').value = '';
    document.getElementById('chapter-outline-edit-loops').value = '2';
    
    // Show modal
    document.getElementById('chapter-outline-edit-modal').style.display = 'flex';
}

function closeChapterOutlineEditModal() {
    document.getElementById('chapter-outline-edit-modal').style.display = 'none';
}

/**
 * Toggle chapter outline edit mode using toggle switch
 * @param {HTMLInputElement} toggleElement - The checkbox input element
 */
function toggleChapterOutlineEditMode(toggleElement) {
    const mode = toggleElement.checked ? 'automated' : 'manual';
    currentChapterOutlineEditMode = mode;
    
    // Update status text
    const statusElement = document.getElementById('chapter-outline-edit-mode-status');
    if (statusElement) {
        statusElement.textContent = mode === 'automated' ? 'Automated' : 'Manual';
    }
    
    // Show/hide manual feedback section
    const manualSection = document.getElementById('manual-chapter-outline-edit-feedback');
    if (mode === 'manual') {
        manualSection.style.display = 'block';
    } else {
        manualSection.style.display = 'none';
    }
}

function selectChapterOutlineEditMode(mode) {
    const toggle = document.getElementById('chapter-outline-edit-mode-toggle');
    if (toggle) {
        toggle.checked = mode === 'automated';
        toggleChapterOutlineEditMode(toggle);
    }
}

async function executeChapterOutlineEdit() {
    const feedbackLoops = parseInt(document.getElementById('chapter-outline-edit-loops').value);
    let manualFeedback = '';
    
    if (currentChapterOutlineEditMode === 'manual') {
        manualFeedback = document.getElementById('chapter-outline-edit-instructions').value.trim();
        if (!manualFeedback) {
            await customAlert('Please provide edit instructions for manual mode.', 'Instructions Required');
            return;
        }
    }
    
    closeChapterOutlineEditModal();
    
    // Run the edit function (similar to runChapterEdit but for chapter outline)
    await runChapterOutlineEdit(currentChapterOutlineEditMode, feedbackLoops, manualFeedback);
}

// Outline Edit Function
async function runOutlineEdit(editMode, feedbackLoops, manualFeedback = '') {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }

    const outlineElement = document.getElementById('outline-content');
    if (!outlineElement) {
        await customAlert('Could not find story bible content element.', 'Element Not Found');
        return;
    }
    
    const outline = outlineElement.value;
    
    if (!outline.trim()) {
        await customAlert('No story bible content to edit. Please generate the story bible first.', 'No Content');
        return;
    }

    try {
        isGenerating = true;
        showGenerationInfo(`Editing Story Bible with ${editMode} mode...`);

        let improvedOutline = outline;

        for (let i = 0; i < feedbackLoops; i++) {
            if (editMode === 'manual') {
                improvedOutline = await runManualFeedback('outline', improvedOutline, manualFeedback, getSelectedModel());
            } else {
                improvedOutline = await runAIFeedback('outline', improvedOutline, getSelectedModel());
            }
        }

        // Update outline content
        outlineElement.value = improvedOutline;
        bookData.outline = improvedOutline;
        saveToLocalStorage();

        await customAlert(`Story bible edited successfully with ${feedbackLoops} ${editMode} edit loop(s).`, 'Edit Complete');
        
    } catch (error) {
        await customAlert(`Error during editing: ${error.message}`, 'Edit Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

// Chapter Outline Edit Function
async function runChapterOutlineEdit(editMode, feedbackLoops, manualFeedback = '') {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }

    const chapterOutlineElement = document.getElementById('chapters-content');
    if (!chapterOutlineElement) {
        await customAlert('Could not find chapter outline content element.', 'Element Not Found');
        return;
    }
    
    const chapterOutline = chapterOutlineElement.value;
    
    if (!chapterOutline.trim()) {
        await customAlert('No chapter outline content to edit. Please generate the chapter outline first.', 'No Content');
        return;
    }

    try {
        isGenerating = true;
        showGenerationInfo(`Editing Chapter Outline with ${editMode} mode...`);

        let improvedChapterOutline = chapterOutline;

        for (let i = 0; i < feedbackLoops; i++) {
            if (editMode === 'manual') {
                improvedChapterOutline = await runManualFeedback('chapters', improvedChapterOutline, manualFeedback, getSelectedModel());
            } else {
                improvedChapterOutline = await runAIFeedback('chapters', improvedChapterOutline, getSelectedModel());
            }
        }

        // Update chapter outline content
        chapterOutlineElement.value = improvedChapterOutline;
        bookData.chapterOutline = improvedChapterOutline;
        saveToLocalStorage();

        await customAlert(`Chapter outline edited successfully with ${feedbackLoops} ${editMode} edit loop(s).`, 'Edit Complete');
        
    } catch (error) {
        await customAlert(`Error during editing: ${error.message}`, 'Edit Error');
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
    
    document.getElementById('one-click-modal').style.display = 'flex';
}
 
/**
 * Close one-click modal
 */
function closeOneClickModal() {
    document.getElementById('one-click-modal').style.display = 'none';
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
    isGenerating = true;
    
    try {
        // Step 1: Generate Outline
        updateLoadingText('Generating story bible...');
        showStep('outline');
        await generateOutline();
        
        if (oneClickCancelled) return;
        
        if (outlineLoops > 0) {
            updateLoadingText(`Improving story bible (${outlineLoops} feedback loops)...`);
            await runOutlineEdit('ai', outlineLoops, '');
        }
        
        if (oneClickCancelled) return;
        
        // Step 2: Generate Chapter Outline
        updateLoadingText('Creating detailed chapter outline...');
        showStep('chapters');
        await generateChapterOutline();
        
        if (oneClickCancelled) return;
        
        if (chaptersLoops > 0) {
            updateLoadingText(`Improving chapter outline (${chaptersLoops} feedback loops)...`);
            await runChapterOutlineEdit('ai', chaptersLoops, '');
        }
        
        if (oneClickCancelled) return;
        
        // Step 3: Setup Writing Interface and Generate Chapters
        updateLoadingText('Setting up writing interface...');
        showStep('writing');
        
        updateLoadingText('Writing all chapters...');
        
        for (let i = 1; i <= bookData.numChapters; i++) {
            if (oneClickCancelled) return;
            
            updateLoadingText(`Writing Chapter ${i} of ${bookData.numChapters}...`);
            await generateSingleChapter(i);
            
            if (writingLoops > 0) {
                updateLoadingText(`Improving Chapter ${i} with feedback...`);
                await runChapterEdit(i, 'ai', writingLoops, '');
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
    } finally {
        isGenerating = false;
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

// Create a new project (same functionality as Reset & Start New)
async function newProject() {
    const confirmed = await customConfirm('This will clear all current work and start fresh. Are you sure?', 'New Project');
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
        styleExcerpt: '',
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
    document.getElementById('style-excerpt').value = '';
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
    
    // Update project selector
    const selector = document.getElementById('project-select');
    if (selector) {
        selector.value = 'current';
        updateDeleteButtonVisibility();
    }
    
    // Save the reset state
    autoSave();
    
    await customAlert('Everything has been reset. You can now start a new project.', 'Reset Complete');
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
    document.getElementById('project-management-modal').style.display = 'flex';
}

// Close project management modal
function closeProjectManagementModal() {
    document.getElementById('project-management-modal').style.display = 'none';
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
    document.getElementById('style-excerpt').value = bookData.styleExcerpt || '';
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
    
    // Get current model pricing
    const currentModel = aiSettings.model;
    const provider = aiSettings.apiProvider || 'openrouter';
    const allModels = [...(apiModels[provider]?.Recommended || []), ...(apiModels[provider]?.More || [])];
    const modelInfo = allModels.find(m => m.value === currentModel);
    
    if (!modelInfo || !modelInfo.cost) {
        await customAlert('Cost information not available for the selected model.', 'Cost Estimation');
        return;
    }
    
    const { input: inputCostPer1M, output: outputCostPer1M } = modelInfo.cost;
    
    // Estimate token usage (rough approximation: 1 word ≈ 1.3 tokens)
    const wordsToTokens = (words) => Math.ceil(words * 1.3);
    
    // Input tokens estimation
    const premiseTokens = wordsToTokens((bookData.premise || '').split(' ').length);
    const styleTokens = wordsToTokens((bookData.styleDirection || '').split(' ').length);
    const basePromptTokens = 7500; // Estimated tokens for prompts and instructions
    
    // Story structure generation
    const outlineInputTokens = basePromptTokens + premiseTokens + styleTokens;
    const outlineOutputTokens = wordsToTokens(3000);
    
    // Chapter planning generation
    const chaptersInputTokens = basePromptTokens + outlineOutputTokens;
    const chaptersOutputTokens = wordsToTokens(6000);
    
    // Chapter writing
    const singleChapterInputTokens = basePromptTokens + Math.floor((outlineOutputTokens + chaptersOutputTokens) / 4);
    const singleChapterOutputTokens = wordsToTokens(targetWordCount);
    const totalChapterInputTokens = singleChapterInputTokens * numChapters;
    const totalChapterOutputTokens = singleChapterOutputTokens * numChapters;
    
    // Total tokens
    const totalInputTokens = outlineInputTokens + chaptersInputTokens + totalChapterInputTokens;
    const totalOutputTokens = outlineOutputTokens + chaptersOutputTokens + totalChapterOutputTokens;
    
    // Calculate costs (costs are per 1M tokens)
    const totalInputCostEst = (totalInputTokens / 1000000) * inputCostPer1M;
    const totalOutputCostEst = (totalOutputTokens / 1000000) * outputCostPer1M;
    const totalCost = totalInputCostEst + totalOutputCostEst;
    
    // Time estimation based on typical model speeds (tokens per second)
    const modelSpeeds = {
        'anthropic/claude-sonnet-4': { inputTPS: 5000, outputTPS: 50 },
        'anthropic/claude-opus-4.1': { inputTPS: 4000, outputTPS: 35 },
        'openai/gpt-5': { inputTPS: 6000, outputTPS: 60 },
        'openai/gpt-4o': { inputTPS: 7000, outputTPS: 80 },
        'anthropic/claude-3.7-sonnet:thinking': { inputTPS: 4500, outputTPS: 45 },
        'google/gemini-2.5-pro': { inputTPS: 8000, outputTPS: 100 },
        'anthropic/claude-3.5-sonnet': { inputTPS: 5500, outputTPS: 55 }
    };
    
    // Default speeds for unknown models
    const defaultSpeed = { inputTPS: 5000, outputTPS: 50 };
    const modelSpeed = modelSpeeds[currentModel] || defaultSpeed;
    
    // Calculate time estimates (in seconds)
    const inputProcessingTime = totalInputTokens / modelSpeed.inputTPS;
    const outputGenerationTime = totalOutputTokens / modelSpeed.outputTPS;
    const totalGenerationTime = inputProcessingTime + outputGenerationTime;
    
    // Add buffer time for API latency and processing (20% overhead)
    const totalTimeWithOverhead = totalGenerationTime * 1.2;
    
    // Convert to human-readable format
    const formatTime = (seconds) => {
        if (seconds < 60) return `${Math.round(seconds)} seconds`;
        if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
        
        // For over an hour, show hours and minutes
        const hours = Math.floor(seconds / 3600);
        const remainingMinutes = Math.round((seconds % 3600) / 60);
        
        if (remainingMinutes === 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        } else {
            return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
        }
    };
    
    const costText = `<div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6; color: #374151;">
<h2 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">Cost & Time Estimation</h2>

<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
<h3 style="color: #1f2937; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Selected Model</h3>
<p style="margin: 0; font-weight: 500; color: #2563eb;">${modelInfo.label}</p>
</div>

<div style="background: #fefefe; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
<h3 style="color: #1f2937; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">Book Specifications</h3>
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
  <div><span style="color: #6b7280;">Chapters:</span> <strong>${numChapters}</strong></div>
  <div><span style="color: #6b7280;">Words/Chapter:</span> <strong>${targetWordCount.toLocaleString()}</strong></div>
  <div style="grid-column: 1/-1;"><span style="color: #6b7280;">Total Length:</span> <strong>${(numChapters * targetWordCount).toLocaleString()} words</strong></div>
</div>
</div>

<div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin: 16px 0;">
<h3 style="color: #c2410c; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">Cost Breakdown</h3>
<div style="font-size: 13px; margin-bottom: 12px;">
  <div style="display: flex; justify-content: space-between; margin: 4px 0;">
    <span style="color: #78716c;">Input Tokens:</span> 
    <span style="font-weight: 500;">${totalInputTokens.toLocaleString()}</span>
  </div>
  <div style="display: flex; justify-content: space-between; margin: 4px 0;">
    <span style="color: #78716c;">Output Tokens:</span> 
    <span style="font-weight: 500;">${totalOutputTokens.toLocaleString()}</span>
  </div>
</div>
<div style="border-top: 1px solid #fed7aa; padding-top: 8px; font-size: 13px;">
  <div style="display: flex; justify-content: space-between; margin: 4px 0;">
    <span style="color: #78716c;">Input Cost:</span> 
    <span style="font-weight: 500;">$${totalInputCostEst.toFixed(2)}</span>
  </div>
  <div style="display: flex; justify-content: space-between; margin: 4px 0;">
    <span style="color: #78716c;">Output Cost:</span> 
    <span style="font-weight: 500;">$${totalOutputCostEst.toFixed(2)}</span>
  </div>
  <div style="display: flex; justify-content: space-between; margin: 8px 0 0 0; font-size: 16px; font-weight: 700; color: #c2410c;">
    <span>TOTAL COST:</span> 
    <span>$${totalCost.toFixed(2)}</span>
  </div>
</div>
</div>

<div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0;">
<h3 style="color: #0369a1; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">Time Estimation</h3>
<div style="font-size: 13px;">
  <div style="display: flex; justify-content: space-between; margin: 4px 0;">
    <span style="color: #475569;">Processing:</span> 
    <span style="font-weight: 500;">${formatTime(inputProcessingTime)}</span>
  </div>
  <div style="display: flex; justify-content: space-between; margin: 4px 0;">
    <span style="color: #475569;">Generation:</span> 
    <span style="font-weight: 500;">${formatTime(outputGenerationTime)}</span>
  </div>
  <div style="display: flex; justify-content: space-between; margin: 8px 0 0 0; font-size: 15px; font-weight: 600; color: #0369a1;">
    <span>TOTAL TIME:</span> 
    <span>${formatTime(totalTimeWithOverhead)}</span>
  </div>
  <div style="font-size: 11px; color: #64748b; margin-top: 4px; font-style: italic;">
    (includes 20% processing buffer)
  </div>
</div>
</div>

<div style="background: #f9fafb; border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
<strong>Note:</strong> Estimates are based on typical model performance and token usage patterns without feedback loops. Actual costs and times may vary depending on content complexity, API load, and generation quality requirements.
</div>
</div>`;
    
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
    const styleExcerpt = document.getElementById('style-excerpt')?.value || '';
    document.getElementById('premise-word-count').textContent = `${countWords(premise)} words`;
    document.getElementById('style-word-count').textContent = `${countWords(style)} words`;
    if (document.getElementById('style-excerpt-word-count')) {
        document.getElementById('style-excerpt-word-count').textContent = `${countWords(styleExcerpt)} words`;
    }
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
    document.getElementById('donation-modal').style.display = 'flex';
}
function closeDonationModal() {
    document.getElementById('donation-modal').style.display = 'none';
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
    const paypalUrl = `https://www.paypal.com/donate/?hosted_button_id=&business=dietrichandreas2%40t-online.de&amount=${amount}&currency_code=USD&item_name=NovelFactory%20Donation`;
    window.open(paypalUrl, '_blank');
    closeDonationModal();
    setTimeout(async () => {
        await customAlert('Thank you for supporting NovelFactory! Your generosity helps keep this tool free for everyone.', 'Thank You!');
    }, 1000);
}

// Feedback
function showFeedbackForm() {
    document.getElementById('feedback-modal').style.display = 'flex';
}
function closeFeedbackModal() {
    document.getElementById('feedback-modal').style.display = 'none';
    document.getElementById('feedback-type').value = 'bug';
    document.getElementById('feedback-message').value = '';
}
async function submitFeedback() {
    const type = document.getElementById('feedback-type').value;
    const message = document.getElementById('feedback-message').value;
    
    if (!message.trim()) {
        await customAlert('Please enter your feedback message.', 'Missing Information');
        return;
    }
    
    const subject = `NovelFactory Feedback: ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const body = `Feedback Type: ${type}\n\nMessage:\n${message}\n\n---\nSent from NovelFactory v${CONFIG.VERSION} (https://novelfactory.ink)`;
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
    document.getElementById('one-click-modal').style.display = 'none';
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
    updateUndoRedoButtons();
    
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
    // Ensure theme is valid (fallback from removed 'fun' theme)
    const validTheme = themes.includes(savedTheme) ? savedTheme : 'light';
    setTheme(validTheme);
    
    // Collapse sections default
    document.querySelectorAll('.collapsible-content').forEach(content => {
        content.style.display = 'none';
    });
    
    console.log('NovelFactory initialization complete');
}

// ==================================================
// UNDO/REDO SYSTEM
// ==================================================

/**
 * Save current state for undo functionality
 * @param {string} actionDescription - Description of the action
 */
function saveStateForUndo(actionDescription = 'Action') {
    const currentState = {
        bookData: JSON.parse(JSON.stringify(bookData)),
        description: actionDescription,
        timestamp: Date.now()
    };
    
    undoStack.push(currentState);
    
    // Limit undo stack size
    if (undoStack.length > MAX_UNDO_STATES) {
        undoStack.shift();
    }
    
    // Clear redo stack when new action is performed
    redoStack = [];
    
    updateUndoRedoButtons();
}

/**
 * Undo the last action
 */
function undoAction() {
    if (undoStack.length === 0) return;
    
    // Save current state to redo stack
    const currentState = {
        bookData: JSON.parse(JSON.stringify(bookData)),
        description: 'Current State',
        timestamp: Date.now()
    };
    redoStack.push(currentState);
    
    // Get and apply previous state
    const previousState = undoStack.pop();
    bookData = JSON.parse(JSON.stringify(previousState.bookData));
    
    // Update UI
    populateFormFields();
    setupWritingInterface();
    saveToLocalStorage();
    
    updateUndoRedoButtons();
}

/**
 * Redo the last undone action
 */
function redoAction() {
    if (redoStack.length === 0) return;
    
    // Save current state to undo stack
    const currentState = {
        bookData: JSON.parse(JSON.stringify(bookData)),
        description: 'Current State',  
        timestamp: Date.now()
    };
    undoStack.push(currentState);
    
    // Get and apply next state
    const nextState = redoStack.pop();
    bookData = JSON.parse(JSON.stringify(nextState.bookData));
    
    // Update UI
    populateFormFields();
    setupWritingInterface();
    saveToLocalStorage();
    
    updateUndoRedoButtons();
}

/**
 * Update undo/redo button states
 */
function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    
    if (undoBtn) {
        undoBtn.disabled = undoStack.length === 0;
        undoBtn.title = undoStack.length > 0 ? 
            `Undo: ${undoStack[undoStack.length - 1].description}` : 
            'No actions to undo';
    }
    
    if (redoBtn) {
        redoBtn.disabled = redoStack.length === 0;
        redoBtn.title = redoStack.length > 0 ? 
            `Redo: ${redoStack[redoStack.length - 1].description}` : 
            'No actions to redo';
    }
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
    
    // Clean up any active loading states
    if (document.getElementById('loading-overlay')?.style.display !== 'none') {
        hideLoadingOverlay();
    }
    
    // Clean up generation indicator if it's showing
    if (isGenerating || document.getElementById('generation-indicator')?.style.display === 'flex') {
        hideGenerationInfo();
    }
    
    // Show error to user if in an active process
    if (document.getElementById('loading-overlay')?.style.display !== 'none' || isGenerating) {
        customAlert('An unexpected error occurred. Please try again.', 'Error');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    
    // Clean up generation states
    if (isGenerating) {
        hideGenerationInfo();
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
        styleExcerpt: '',
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
    document.getElementById('style-excerpt').value = '';
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
    
    // Safety timeout to auto-hide after 5 minutes if not properly cleaned up
    clearTimeout(window.generationTimeout);
    window.generationTimeout = setTimeout(() => {
        console.warn('Generation indicator auto-hidden after timeout');
        hideGenerationInfo();
    }, 300000); // 5 minutes
}

/**
 * Hide generation progress info
 */
function hideGenerationInfo() {
    // Clear the safety timeout
    clearTimeout(window.generationTimeout);
    
    // Don't hide if loading overlay is active (let loading overlay handle the display)
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay && loadingOverlay.style.display === 'flex') {
        return;
    }
    
    const indicator = document.getElementById('generation-indicator');
    if (indicator) {
        indicator.style.display = 'none';
        // Force hide with important style as backup
        indicator.style.setProperty('display', 'none', 'important');
    }
    
    // Always reset the generating state
    isGenerating = false;
    
    // Remove any potential ai-generating class from body
    document.body.classList.remove('ai-generating');
}

// Console welcome
console.log(`

NovelFactory v${CONFIG.VERSION}
https://novelfactory.ink

Happy writing!
`);
