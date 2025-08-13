// NovelFactory AI - Professional Edition
// Apple-Inspired Design with Advanced Features

// Global State
let bookData = {
    id: 'current',
    title: '',
    blurb: '',
    genre: '',
    targetAudience: '',
    premise: '',
    styleDirection: '',
    numChapters: 20,
    targetWordCount: 4000,
    outline: '',
    chapterOutline: '',
    chapters: [],
    currentStep: 'setup',
    createdAt: new Date().toISOString(),
    lastSaved: new Date().toISOString()
};

let aiSettings = {
    apiProvider: 'openrouter', // 'openrouter' or 'openai'
    openrouterApiKey: '',
    openaiApiKey: '',
    model: 'anthropic/claude-sonnet-4',
    temperature: 0.5,
    maxTokens: 50000,
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

let projects = {};
let autoSaveTimer;
let oneClickCancelled = false;
let currentExpandedChapter = null;
let currentTheme = 'light';
let selectedDonationAmount = 5;

// API Models Configuration
const apiModels = {
    openrouter: {
        creative: [
            { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4 ⭐', cost: { input: 3, output: 15 }},
            { value: 'anthropic/claude-opus-4.1', label: 'Claude Opus 4.1 ⭐⭐', cost: { input: 15, output: 75 }},
            { value: 'openai/gpt-4o', label: 'GPT-4o', cost: { input: 5, output: 15 }},
            { value: 'openai/gpt-5', label: 'GPT-5', cost: { input: 1.25, output: 10 }},
            { value: 'anthropic/claude-3.7-sonnet:thinking', label: 'Claude Sonnet 3.7 (Thinking)', cost: { input: 3, output: 15 }},
            { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', cost: { input: 1.25, output: 10 }}
        ],
        budget: [
            { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini 💵', cost: { input: 0.25, output: 2 }},
            { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', cost: { input: 0.15, output: 0.6 }},
            { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano 💵💵', cost: { input: 0.05, output: 0.4 }},
            { value: 'openai/google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', cost: { input: 0.3, output: 2.5 }},
            { value: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek Chat V3', cost: { input: 0.18, output: 0.72 }}
        ]
    },
    openai: {
        creative: [
            { value: 'gpt-5', label: 'GPT-5 ⭐', cost: { input: 1.25, output: 10 }},
            { value: 'gpt-4o', label: 'GPT-4o', cost: { input: 5, output: 15 }},
        ],
        budget: [
            { value: 'gpt-4o-mini', label: 'GPT-4o Mini', cost: { input: 0.15, output: 0.6 }},
            { value: 'gpt-5-mini', label: 'GPT-5 Mini', cost: { input: 0.25, output: 2 }}
        ]
    }
};

// Genre Requirements
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

// Default Prompts
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

Format as clear, numbered chapters with all details for seamless writing execution. Avoid split into multiple batches, deliver all chapters in one batch.`,

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
CHAPTERS: [Number only]

Generate something truly unique that readers would eagerly devour!`,

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

    // Enhanced Feedback Loop Prompts
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

CRITICAL: All feedback must respect and maintain the core premise, style direction, target audience, and technical specifications already established. Focus on enhancing execution within these constraints, not changing them.`,

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

Create an improved version that perfectly addresses the manual feedback while maintaining the highest standards of storytelling craft.

Write the complete improved {contentType} with all requested changes implemented seamlessly.`
};

// Theme Management
const themes = ['light', 'dark', 'fun'];

function changeTheme() {
    const selectedTheme = document.getElementById('theme-select').value;
    setTheme(selectedTheme);
}

function setTheme(theme) {
    currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('novelfactory_theme', theme);
    
    // Update dropdown selection
    document.getElementById('theme-select').value = theme;
}

// Update the initializeApp function to set initial dropdown value
function initializeApp() {
    loadSettings();
    loadProjects();
    setupEventListeners();
    initializePrompts();
    setupAutoSave();
    setupKeyboardShortcuts();
    updateModelSelect();
    updateNavProgress();
    
    // Initialize feedback modes
    ['outline', 'chapters', 'writing'].forEach(step => {
        const select = document.getElementById(`${step}-feedback-mode`);
        if (select) {
            select.value = 'ai';
            toggleManualFeedback(step);
        }
    });
    
    // Load saved theme and update dropdown
    const savedTheme = localStorage.getItem('novelfactory_theme') || 'light';
    setTheme(savedTheme);
}

// Update keyboard shortcut (optional - keep Ctrl+D cycling)
function toggleTheme() {
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const newTheme = themes[nextIndex];
    setTheme(newTheme);
}

// Event Listeners
function setupEventListeners() {
    const genreSelect = document.getElementById('genre');
    const audienceSelect = document.getElementById('target-audience');
    
    function checkRandomButtonVisibility() {
        const randomBtn = document.getElementById('random-idea-btn');
        if (genreSelect.value && audienceSelect.value) {
            randomBtn.style.display = 'inline-flex';
        } else {
            randomBtn.style.display = 'none';
        }
    }
    
    genreSelect.addEventListener('change', checkRandomButtonVisibility);
    audienceSelect.addEventListener('change', checkRandomButtonVisibility);

    // Word count updates
    document.getElementById('premise').addEventListener('input', updateWordCount);
    document.getElementById('style-direction').addEventListener('input', updateWordCount);
    
    // Feedback mode change listeners
    ['outline', 'chapters', 'writing'].forEach(step => {
        const select = document.getElementById(`${step}-feedback-mode`);
        if (select) {
            select.addEventListener('change', () => toggleManualFeedback(step));
        }
    });
}

// Feedback System Functions
function toggleManualFeedback(step) {
    const mode = document.getElementById(`${step}-feedback-mode`).value;
    const manualSection = document.getElementById(`${step}-manual-feedback`);
    
    if (mode === 'manual') {
        manualSection.style.display = 'block';
    } else {
        manualSection.style.display = 'none';
    }
}

function toggleFeedbackPromptEditor(step) {
    const editor = document.getElementById(`${step}-feedback-prompt-editor`);
    const isVisible = editor.style.display !== 'none';
    
    if (isVisible) {
        editor.style.display = 'none';
    } else {
        editor.style.display = 'block';
        // Load current prompt if not already loaded
        const textarea = document.getElementById(`${step}-feedback-prompt`);
        if (!textarea.value) {
            textarea.value = aiSettings.customPrompts.analysis || defaultPrompts.analysis;
        }
    }
}

function resetFeedbackPrompt(step) {
    if (confirm('Reset feedback prompt to default?')) {
        document.getElementById(`${step}-feedback-prompt`).value = defaultPrompts.analysis;
        aiSettings.customPrompts.analysis = '';
        saveSettings();
    }
}

function saveFeedbackPrompt(step) {
    // Save to settings
    aiSettings.customPrompts.analysis = document.getElementById(`${step}-feedback-prompt`).value;
    saveSettings();
    
    // Visual feedback
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="icon">✅</span>Saved!';
    setTimeout(() => {
        btn.innerHTML = originalText;
    }, 2000);
    
    autoSave();
}

// Donation System
function showDonationModal() {
    document.getElementById('donation-modal').classList.add('active');
}

function closeDonationModal() {
    document.getElementById('donation-modal').classList.remove('active');
}

function setDonationAmount(amount) {
    selectedDonationAmount = amount;
    
    // Update button states
    document.querySelectorAll('.donation-amount').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
    
    // Update donate button
    document.getElementById('donate-btn').innerHTML = `<span class="icon">💖</span>Donate $${amount}`;
    
    // Clear custom amount
    document.getElementById('custom-donation-amount').value = '';
}

function proceedToDonate() {
    const customAmount = document.getElementById('custom-donation-amount').value;
    const amount = customAmount || selectedDonationAmount;
    
    if (!amount || amount < 1) {
        alert('Please select or enter a valid donation amount.');
        return;
    }
    
    // Create PayPal donation URL
    const paypalUrl = `https://www.paypal.com/donate/?hosted_button_id=&business=dietrichandreas2%40t-online.de&amount=${amount}&currency_code=USD&item_name=NovelFactory%20AI%20Support`;
    
    // Open PayPal in new window
    window.open(paypalUrl, '_blank');
    
    // Close modal
    closeDonationModal();
    
    // Show thank you message
    setTimeout(() => {
        alert('🙏 Thank you so much for supporting NovelFactory AI! Your generosity helps keep this tool free for everyone.');
    }, 1000);
}

// Custom donation amount handling
document.addEventListener('DOMContentLoaded', function() {
    const customAmountInput = document.getElementById('custom-donation-amount');
    if (customAmountInput) {
        customAmountInput.addEventListener('input', function() {
            if (this.value) {
                // Clear selection from preset amounts
                document.querySelectorAll('.donation-amount').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                // Update donate button
                document.getElementById('donate-btn').innerHTML = `<span class="icon">💖</span>Donate $${this.value}`;
                selectedDonationAmount = parseFloat(this.value);
            }
        });
    }
});

// Feedback System
function showFeedbackForm() {
    document.getElementById('feedback-modal').classList.add('active');
}

function closeFeedbackModal() {
    document.getElementById('feedback-modal').classList.remove('active');
    
    // Reset form
    document.getElementById('feedback-type').value = 'bug';
    document.getElementById('feedback-message').value = '';
    document.getElementById('feedback-email').value = '';
}

function submitFeedback() {
    const type = document.getElementById('feedback-type').value;
    const message = document.getElementById('feedback-message').value;
    const email = document.getElementById('feedback-email').value;
    
    if (!message.trim()) {
        alert('Please enter your feedback message.');
        return;
    }
    
    // Create email subject and body
    const subject = `NovelFactory AI Feedback: ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const body = `Feedback Type: ${type}\n\nMessage:\n${message}\n\n${email ? `Contact Email: ${email}\n\n` : ''}---\nSent from NovelFactory AI (https://novelfactory.ink)`;
    
    // Create mailto link
    const mailtoLink = `mailto:dietrichandreas2@t-online.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open email client
    window.location.href = mailtoLink;
    
    // Close modal
    closeFeedbackModal();
    
    // Show confirmation
    alert('📧 Thank you for your feedback! Your default email client should open with your message. If it doesn\'t open automatically, please email me directly at dietrichandreas2@t-online.de');
}

// Auto-save System
function setupAutoSave() {
    setInterval(autoSave, 30000); // Auto-save every 30 seconds
}

function autoSave() {
    if (bookData.premise || bookData.styleDirection || bookData.outline) {
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

// Keyboard Shortcuts
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
                case 'f':
                    e.preventDefault();
                    if (currentExpandedChapter) {
                        expandChapter(currentExpandedChapter);
                    }
                    break;
                case 'd':
                    e.preventDefault();
                    toggleTheme();
                    break;
            }
        }
        if (e.key === 'Escape') {
            closeExpandModal();
            closeOneClickModal();
            closeFeedbackModal();
            closeDonationModal();
        }
    });
}

// Navigation System
function showStep(stepName) {
    // Hide all steps
    const steps = document.querySelectorAll('.step');
    steps.forEach(step => step.classList.remove('active'));
    
    // Remove active class from all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    // Show selected step
    document.getElementById(stepName).classList.add('active');
    
    // Add active class to clicked nav item
    const activeNavItem = document.querySelector(`[data-step="${stepName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    bookData.currentStep = stepName;
    updateNavProgress();
    autoSave();
}

function updateNavProgress() {
    const steps = ['setup', 'outline', 'chapters', 'writing', 'export'];
    const currentIndex = steps.indexOf(bookData.currentStep);
    const progress = ((currentIndex + 1) / steps.length) * 100;
    
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

// API Provider System
function switchApiProvider(provider) {
    aiSettings.apiProvider = provider;
    
    // Update toggle buttons
    document.getElementById('openrouter-btn').classList.toggle('active', provider === 'openrouter');
    document.getElementById('openai-btn').classList.toggle('active', provider === 'openai');
    
    // Show/hide appropriate API key fields
    const openrouterGroup = document.getElementById('openrouter-key-group');
    const openaiGroup = document.getElementById('openai-key-group');
    
    if (provider === 'openrouter') {
        openrouterGroup.style.display = 'block';
        openaiGroup.style.display = 'none';
    } else {
        openrouterGroup.style.display = 'none';
        openaiGroup.style.display = 'block';
    }
    
    updateModelSelect();
    saveSettings();
}

function updateModelSelect() {
    const modelSelect = document.getElementById('model-select');
    modelSelect.innerHTML = '';
    let provider = aiSettings.apiProvider || 'openrouter';
    let models = apiModels[provider]?.creative.concat(apiModels[provider]?.budget) || [];
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.label;
        if (aiSettings.model === model.value) {
            option.selected = true;
        }
        modelSelect.appendChild(option);
    });
    // If no model is selected, select the default
    if (!modelSelect.value) {
        modelSelect.value = 'anthropic/claude-sonnet-4';
        aiSettings.model = 'anthropic/claude-sonnet-4';
    }
    updateModelInfo();
}

function updateModelInfo() {
    const model = document.getElementById('model-select').value;
    const provider = aiSettings.apiProvider;
    const allModels = [...apiModels[provider].creative, ...apiModels[provider].budget];
    const modelInfo = allModels.find(m => m.value === model);
    
    if (modelInfo && modelInfo.cost) {
        document.getElementById('model-cost-info').textContent = 
            `Input: $${modelInfo.cost.input}/1M tokens | Output: $${modelInfo.cost.output}/1M tokens`;
    }
}

// Settings Management
function loadSettings() {
    initializePrompts();
    loadFromLocalStorage();
    
    const savedSettings = localStorage.getItem('novelfactory_settings');
    if (savedSettings) {
        const loadedSettings = JSON.parse(savedSettings);
        Object.assign(aiSettings, loadedSettings);
        populateSettingsFields();
    }
}

function saveSettings() {
    aiSettings.openrouterApiKey = document.getElementById('openrouter-api-key').value;
    aiSettings.openaiApiKey = document.getElementById('openai-api-key').value;
    aiSettings.model = document.getElementById('model-select').value;
    aiSettings.temperature = parseFloat(document.getElementById('temperature').value);
    aiSettings.maxTokens = parseInt(document.getElementById('max-tokens').value);
    
    // Save custom prompts
    aiSettings.customPrompts.outline = document.getElementById('outline-prompt').value;
    aiSettings.customPrompts.chapters = document.getElementById('chapters-prompt').value;
    aiSettings.customPrompts.writing = document.getElementById('writing-prompt').value;
    
    // Save feedback prompts if they exist
    ['outline', 'chapters', 'writing'].forEach(step => {
        const feedbackPrompt = document.getElementById(`${step}-feedback-prompt`);
        if (feedbackPrompt && feedbackPrompt.value) {
            aiSettings.customPrompts.analysis = feedbackPrompt.value;
        }
    });
    
    localStorage.setItem('novelfactory_settings', JSON.stringify(aiSettings));
}

function populateSettingsFields() {
    document.getElementById('openrouter-api-key').value = aiSettings.openrouterApiKey || '';
    document.getElementById('openai-api-key').value = aiSettings.openaiApiKey || '';
    document.getElementById('model-select').value = aiSettings.model || 'anthropic/claude-sonnet-4';
    document.getElementById('temperature').value = aiSettings.temperature || 0.5;
    document.getElementById('max-tokens').value = aiSettings.maxTokens || 50000;
    
    // Set API provider
    switchApiProvider(aiSettings.apiProvider || 'openrouter');
    
    updateTempValue();
}

function populateFormFields() {
    document.getElementById('genre').value = bookData.genre || '';
    document.getElementById('target-audience').value = bookData.targetAudience || '';
    document.getElementById('premise').value = bookData.premise || '';
    document.getElementById('style-direction').value = bookData.styleDirection || '';
    document.getElementById('num-chapters').value = bookData.numChapters || 20;
    document.getElementById('target-word-count').value = bookData.targetWordCount || 4000;
    updateWordCount();
}

function initializePrompts() {
    // Load custom prompts if they exist, otherwise use defaults
    document.getElementById('outline-prompt').value = aiSettings.customPrompts?.outline || defaultPrompts.outline;
    document.getElementById('chapters-prompt').value = aiSettings.customPrompts?.chapters || defaultPrompts.chapters;
    document.getElementById('writing-prompt').value = aiSettings.customPrompts?.writing || defaultPrompts.writing;
    
    // Initialize feedback prompts
    ['outline', 'chapters', 'writing'].forEach(step => {
        const feedbackPrompt = document.getElementById(`${step}-feedback-prompt`);
        if (feedbackPrompt) {
            feedbackPrompt.value = aiSettings.customPrompts?.analysis || defaultPrompts.analysis;
        }
    });
}

function updateTempValue() {
    const temp = document.getElementById('temperature').value;
    document.getElementById('temp-value').textContent = temp;
}

// Utility Functions
function updateWordCount() {
    const premise = document.getElementById('premise').value;
    const style = document.getElementById('style-direction').value;
    
    document.getElementById('premise-word-count').textContent = `${countWords(premise)} words`;
    document.getElementById('style-word-count').textContent = `${countWords(style)} words`;
}

function countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
}

function updateChapterEstimate() {
    const numChapters = parseInt(document.getElementById('num-chapters').value) || 20;
    const targetWords = parseInt(document.getElementById('target-word-count').value) || 4000;
    const totalWords = numChapters * targetWords;
    
    document.getElementById('chapter-estimate').textContent = 
        `Estimated book length: ~${totalWords.toLocaleString()} words`;
}

function updateGenreRequirements() {
    const genre = document.getElementById('genre').value;
    const requirementsDiv = document.getElementById('genre-requirements');
    const contentDiv = document.getElementById('genre-requirements-content');
    
    if (genre && genreRequirements[genre]) {
        const req = genreRequirements[genre];
        contentDiv.innerHTML = `
            <p><strong>Genre Requirements:</strong> ${req.requirements}</p>
            <p><strong>Pacing Guidelines:</strong> ${req.pacing}</p>
        `;
        requirementsDiv.style.display = 'block';
    } else {
        requirementsDiv.style.display = 'none';
    }
}

function updateAudienceRequirements() {
    updateChapterEstimate();
}

// AI API Functions
async function callAI(prompt, systemPrompt = "") {
    const settings = getAISettings();
    
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
            'X-Title': 'NovelFactory AI',
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
        
        // Use max_completion_tokens for GPT-5 models
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

function getAISettings() {
    const provider = aiSettings.apiProvider;
    let apiKey = '';
    
    if (provider === 'openrouter') {
        apiKey = document.getElementById('openrouter-api-key').value;
    } else {
        apiKey = document.getElementById('openai-api-key').value;
    }
    
    return {
        apiProvider: provider,
        apiKey: apiKey,
        model: document.getElementById('model-select').value,
        temperature: parseFloat(document.getElementById('temperature').value),
        maxTokens: parseInt(document.getElementById('max-tokens').value)
    };
}

function formatPrompt(template, replacements) {
    let formatted = template;
    for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`{${key}}`, 'g');
        formatted = formatted.replace(regex, value);
    }
    return formatted;
}

// Feedback Loop System
async function runFeedbackLoop(contentType) {
    const feedbackLoops = parseInt(document.getElementById(`${contentType}-feedback-loops`).value);
    if (feedbackLoops === 0) return;
    
    const feedbackMode = document.getElementById(`${contentType}-feedback-mode`).value;
    
    let content;
    switch(contentType) {
        case 'outline':
            content = bookData.outline;
            break;
        case 'chapters':
            content = bookData.chapterOutline;
            break;
        case 'writing':
            content = bookData.chapters.join('\n\n---\n\n');
            break;
    }
    
    if (!content) {
        alert(`No ${contentType} content to analyze. Please generate content first.`);
        return;
    }
    
    // Get manual feedback if in manual mode
    let manualFeedback = '';
    if (feedbackMode === 'manual') {
        manualFeedback = document.getElementById(`${contentType}-manual-input`).value;
        if (!manualFeedback.trim()) {
            alert('Please provide manual feedback instructions before running the feedback loop.');
            return;
        }
    }
    
    const outputDiv = document.getElementById(`${contentType}-output`);
    
    for (let i = 0; i < feedbackLoops; i++) {
        outputDiv.innerHTML = `<div class="loading"><div class="spinner"></div>Running ${feedbackMode} feedback loop ${i + 1} of ${feedbackLoops}...</div>`;
        
        try {
            let improvedContent;
            
            if (feedbackMode === 'manual') {
                // Use manual feedback directly
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
                
                improvedContent = await callAI(improvementPrompt, "You are a master storyteller and professional editor implementing specific feedback requests.");
                
            } else {
                // Use AI analysis first, then improvement
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
                
                const analysis = await callAI(analysisPrompt, "You are a professional editor and story consultant.");
                
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
                
                improvedContent = await callAI(improvementPrompt, "You are a master storyteller and professional editor.");
            }
            
            // Update content
            content = improvedContent;
            
            // Store improved content
            switch(contentType) {
                case 'outline':
                    bookData.outline = improvedContent;
                    break;
                case 'chapters':
                    bookData.chapterOutline = improvedContent;
                    break;
                case 'writing':
                    // For writing feedback, we'd need to split and reassign chapters
                    // This is simplified for the demo
                    break;
            }
            
            outputDiv.innerHTML = `<h3>Improved ${contentType} (${feedbackMode} feedback loop ${i + 1}):</h3><div style="white-space: pre-wrap; line-height: 1.6;">${improvedContent}</div>`;
            
            autoSave();
            
        } catch (error) {
            outputDiv.innerHTML = `<div class="error">Error in feedback loop ${i + 1}: ${error.message}</div>`;
            break;
        }
    }
}

function getCustomAnalysisPrompt(contentType) {
    const customPrompt = document.getElementById(`${contentType}-feedback-prompt`)?.value;
    return customPrompt && customPrompt.trim() ? customPrompt : (aiSettings.customPrompts.analysis || defaultPrompts.analysis);
}

// Random Idea Generation
async function generateRandomIdea() {
    const genre = document.getElementById('genre').value;
    const audience = document.getElementById('target-audience').value;
    
    if (!genre || !audience) {
        alert('Please select genre and target audience first!');
        return;
    }

    const randomBtn = document.getElementById('random-idea-btn');
    const originalText = randomBtn.innerHTML;
    randomBtn.innerHTML = '<span class="icon">🎲</span>Generating Idea...';
    randomBtn.disabled = true;

    try {
        const prompt = formatPrompt(aiSettings.customPrompts.randomIdea || defaultPrompts.randomIdea, {
            genre: genre.replace('-', ' '),
            targetAudience: audience.replace('-', ' ')
        });

        const aiResponse = await callAI(prompt, "You are a master storyteller and creative genius specializing in generating original, bestselling book concepts.");
        
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

        document.getElementById('premise').value = premise;
        document.getElementById('style-direction').value = style;
        document.getElementById('num-chapters').value = chapters;
        
        updateWordCount();
        updateChapterEstimate();
        autoSave();

        alert('🎲 Unique book idea generated by AI! Review and modify as needed, then click "Generate Book" when ready.');

    } catch (error) {
        alert(`Error generating random idea: ${error.message}`);
    } finally {
        randomBtn.innerHTML = originalText;
        randomBtn.disabled = false;
    }
}

// Book Generation Functions
function startBookGeneration() {
    collectBookData();
    
    if (!bookData.genre || !bookData.targetAudience || !bookData.premise) {
        alert('Please fill in all required fields before generating your book.');
        return;
    }

    autoSave();
    showStep('outline');
    generateOutline();
}

function collectBookData() {
    bookData.genre = document.getElementById('genre').value;
    bookData.targetAudience = document.getElementById('target-audience').value;
    bookData.premise = document.getElementById('premise').value;
    bookData.styleDirection = document.getElementById('style-direction').value;
    bookData.numChapters = parseInt(document.getElementById('num-chapters').value);
    bookData.targetWordCount = parseInt(document.getElementById('target-word-count').value);
}

async function generateOutline() {
    const outputDiv = document.getElementById('outline-output');
    outputDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Generating complete story structure with integrated characters...</div>';

    try {
        const act1End = Math.ceil(bookData.numChapters * 0.25);
        const act2Start = act1End + 1;
        const act2End = Math.ceil(bookData.numChapters * 0.75);
        const act3Start = act2End + 1;

        const genreReq = genreRequirements[bookData.genre] || { requirements: '', pacing: '' };
        const genreRequirementsText = `${genreReq.requirements}\nPacing: ${genreReq.pacing}`;

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

        const outline = await callAI(prompt, "You are a master storyteller and bestselling author creating commercially successful story structures.");
        bookData.outline = outline;

        outputDiv.innerHTML = `<h3>Generated Story Structure:</h3><div style="white-space: pre-wrap; line-height: 1.6;">${outline}</div>`;
        document.getElementById('outline-next').style.display = 'inline-flex';
        
        // Mark step as completed
        const outlineNavItem = document.querySelector('[data-step="outline"]');
        if (outlineNavItem) {
            outlineNavItem.classList.add('completed');
        }
        
        autoSave();

    } catch (error) {
        outputDiv.innerHTML = `<div class="error">Error generating story structure: ${error.message}</div>`;
    }
}

async function regenerateOutline() {
    await generateOutline();
}

function proceedToChapters() {
    showStep('chapters');
    generateChapterOutline();
}

async function generateChapterOutline() {
    const outputDiv = document.getElementById('chapters-output');
    outputDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Creating detailed chapter plan with scene breakdowns...</div>';

    try {
        const prompt = formatPrompt(document.getElementById('chapters-prompt').value, {
            outline: bookData.outline,
            genre: bookData.genre,
            targetAudience: bookData.targetAudience,
            numChapters: bookData.numChapters,
            targetWordCount: bookData.targetWordCount
        });

        const chapterOutline = await callAI(prompt, "You are a master storyteller creating detailed chapter breakdowns for commercially successful novels.");
        bookData.chapterOutline = chapterOutline;

        // Generate book title and blurb now that we have the full story structure
        outputDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Generating compelling book title and blurb...</div>';
        
        const titleBlurbPrompt = formatPrompt(aiSettings.customPrompts.bookTitle || defaultPrompts.bookTitle, {
            genre: bookData.genre,
            targetAudience: bookData.targetAudience,
            premise: bookData.premise,
            styleDirection: bookData.styleDirection,
            outline: bookData.outline,
            chapterOutline: chapterOutline
        });

        const titleBlurbResponse = await callAI(titleBlurbPrompt, "You are a bestselling book marketing expert and title creation genius.");
        
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

        // Store title and blurb
        bookData.title = title || extractFirstSentence(bookData.premise);
        bookData.blurb = blurb || bookData.premise;

        outputDiv.innerHTML = `
            <div class="book-title-section">
                <h3>📚 Book Title & Description</h3>
                <div class="title-display">
                    <h4>Title:</h4>
                    <div class="book-title">"${bookData.title}"</div>
                </div>
                <div class="blurb-display">
                    <h4>Book Blurb:</h4>
                    <div class="book-blurb">${bookData.blurb}</div>
                </div>
            </div>
            <h3>Detailed Chapter Plan:</h3>
            <div style="white-space: pre-wrap; line-height: 1.6;">${chapterOutline}</div>
        `;
        
        document.getElementById('chapters-next').style.display = 'inline-flex';
        
        // Mark step as completed
        const chaptersNavItem = document.querySelector('[data-step="chapters"]');
        if (chaptersNavItem) {
            chaptersNavItem.classList.add('completed');
        }
        
        autoSave();

    } catch (error) {
        outputDiv.innerHTML = `<div class="error">Error generating chapter plan: ${error.message}</div>`;
    }
}

function extractFirstSentence(text) {
    const sentences = text.split(/[.!?]+/);
    return sentences[0]?.trim() || text.substring(0, 50);
}

async function regenerateChapterOutline() {
    await generateChapterOutline();
}

function proceedToWriting() {
    showStep('writing');
    setupWritingInterface();
}

// Writing Interface
function setupWritingInterface() {
    const container = document.getElementById('chapters-container');
    container.innerHTML = '';
    bookData.chapters = Array(bookData.numChapters).fill(null);

    // Add chapter controls
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'chapter-controls';
    controlsDiv.innerHTML = `
        <h4>Chapter Generation Options</h4>
        <div class="controls-row">
            <button class="btn btn-ghost btn-sm" onclick="selectAllChapters()">
                <span class="icon">☑️</span>
                Select All
            </button>
            <button class="btn btn-ghost btn-sm" onclick="deselectAllChapters()">
                <span class="icon">☐</span>
                Deselect All
            </button>
            <button class="btn btn-primary btn-sm" onclick="generateSelectedChapters()" id="generate-selected-btn">
                <span class="icon">✍️</span>
                Generate Selected
            </button>
            <button class="btn btn-primary btn-sm" onclick="generateAllChapters()">
                <span class="icon">🚀</span>
                Generate All Chapters
            </button>
        </div>
        <p class="writing-hint">💡 Tip: Generate chapters individually for maximum control, or select multiple chapters to batch process them.</p>
    `;
    container.appendChild(controlsDiv);

    // Create chapter items
    for (let i = 1; i <= bookData.numChapters; i++) {
        const chapterDiv = document.createElement('div');
        chapterDiv.className = 'chapter-item';
        chapterDiv.innerHTML = `
            <div class="chapter-header">
                <div class="chapter-info">
                    <input type="checkbox" id="chapter-${i}-checkbox" onchange="updateGenerateSelectedButton()">
                    <h4>Chapter ${i}</h4>
                    <div class="chapter-word-count" id="chapter-${i}-word-count">0 words</div>
                </div>
                <div class="chapter-actions">
                    <button class="btn btn-primary btn-sm" onclick="generateSingleChapter(${i})" id="chapter-${i}-generate-btn">
                        <span class="icon">✍️</span>
                        Generate
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="regenerateChapter(${i})" id="chapter-${i}-regenerate-btn" style="display: none;">
                        <span class="icon">🔄</span>
                        Regenerate
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="expandChapter(${i})" id="chapter-${i}-expand-btn" style="display: none;">
                        <span class="icon">📖</span>
                        Expand
                    </button>
                </div>
            </div>
            <div class="chapter-status" id="chapter-${i}-status">Ready to write</div>
            <div class="chapter-content" id="chapter-${i}-content">
                <textarea class="chapter-textarea" id="chapter-${i}-text" placeholder="Chapter content will appear here..." oninput="updateChapterWordCount(${i})"></textarea>
                <div class="chapter-footer">
                    <button class="btn btn-success btn-sm" onclick="editChapter(${i})">
                        <span class="icon">✅</span>
                        Save Edits
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="analyzeChapter(${i})">
                        <span class="icon">🔍</span>
                        Analyze
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="runChapterFeedback(${i})">
                        <span class="icon">🔄</span>
                        Improve with Feedback
                    </button>
                </div>
            </div>
        `;
        container.appendChild(chapterDiv);
    }
}

function selectAllChapters() {
    for (let i = 1; i <= bookData.numChapters; i++) {
        document.getElementById(`chapter-${i}-checkbox`).checked = true;
    }
    updateGenerateSelectedButton();
}

function deselectAllChapters() {
    for (let i = 1; i <= bookData.numChapters; i++) {
        document.getElementById(`chapter-${i}-checkbox`).checked = false;
    }
    updateGenerateSelectedButton();
}

function updateGenerateSelectedButton() {
    const selectedCount = getSelectedChapters().length;
    const btn = document.getElementById('generate-selected-btn');
    if (selectedCount > 0) {
        btn.innerHTML = `<span class="icon">✍️</span>Generate Selected (${selectedCount})`;
        btn.disabled = false;
    } else {
        btn.innerHTML = '<span class="icon">✍️</span>Generate Selected';
        btn.disabled = true;
    }
}

function getSelectedChapters() {
    const selected = [];
    for (let i = 1; i <= bookData.numChapters; i++) {
        if (document.getElementById(`chapter-${i}-checkbox`)?.checked) {
            selected.push(i);
        }
    }
    return selected;
}

async function generateSingleChapter(chapterNum) {
    const statusDiv = document.getElementById('writing-status');
    statusDiv.innerHTML = `Writing Chapter ${chapterNum}...`;
    
    document.getElementById(`chapter-${chapterNum}-status`).innerHTML = '<div class="loading"><div class="spinner"></div>Writing...</div>';
    document.getElementById(`chapter-${chapterNum}-generate-btn`).disabled = true;
    
    try {
        await writeChapter(chapterNum);
        
        document.getElementById(`chapter-${chapterNum}-status`).innerHTML = '✅ Complete';
        document.getElementById(`chapter-${chapterNum}-content`).classList.add('active');
        document.getElementById(`chapter-${chapterNum}-generate-btn`).style.display = 'none';
        document.getElementById(`chapter-${chapterNum}-regenerate-btn`).style.display = 'inline-flex';
        document.getElementById(`chapter-${chapterNum}-expand-btn`).style.display = 'inline-flex';
        
        statusDiv.innerHTML = `✅ Chapter ${chapterNum} completed!`;
        updateOverallProgress();
        autoSave();
        
    } catch (error) {
        document.getElementById(`chapter-${chapterNum}-status`).innerHTML = `❌ Error: ${error.message}`;
        document.getElementById(`chapter-${chapterNum}-generate-btn`).disabled = false;
        statusDiv.innerHTML = `❌ Failed to generate Chapter ${chapterNum}`;
    }
}

async function writeChapter(chapterNum) {
    try {
        // Get previous chapter ending for continuity
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

        const chapterContent = await callAI(prompt, `You are a master storyteller writing professional ${bookData.genre} fiction for ${bookData.targetAudience} readers.`);
        
        bookData.chapters[chapterNum - 1] = chapterContent;
        document.getElementById(`chapter-${chapterNum}-text`).value = chapterContent;
        updateChapterWordCount(chapterNum);

    } catch (error) {
        throw new Error(`Failed to write chapter ${chapterNum}: ${error.message}`);
    }
}

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

async function regenerateChapter(chapterNum) {
    if (!confirm(`Are you sure you want to regenerate Chapter ${chapterNum}? This will overwrite the current content.`)) {
        return;
    }
    
    bookData.chapters[chapterNum - 1] = null;
    document.getElementById(`chapter-${chapterNum}-content`).classList.remove('active');
    document.getElementById(`chapter-${chapterNum}-regenerate-btn`).style.display = 'none';
    document.getElementById(`chapter-${chapterNum}-expand-btn`).style.display = 'none';
    document.getElementById(`chapter-${chapterNum}-generate-btn`).style.display = 'inline-flex';
    document.getElementById(`chapter-${chapterNum}-generate-btn`).disabled = false;
    
    await generateSingleChapter(chapterNum);
}

async function generateSelectedChapters() {
    const selectedChapters = getSelectedChapters();
    if (selectedChapters.length === 0) {
        alert('Please select at least one chapter to generate.');
        return;
    }

    const statusDiv = document.getElementById('writing-status');

    for (let i = 0; i < selectedChapters.length; i++) {
        const chapterNum = selectedChapters[i];
        statusDiv.innerHTML = `Writing Chapter ${chapterNum} (${i + 1} of ${selectedChapters.length})...`;
        
        document.getElementById(`chapter-${chapterNum}-status`).innerHTML = '<div class="loading"><div class="spinner"></div>Writing...</div>';
        document.getElementById(`chapter-${chapterNum}-generate-btn`).disabled = true;
        
        try {
            await writeChapter(chapterNum);
            
            document.getElementById(`chapter-${chapterNum}-status`).innerHTML = '✅ Complete';
            document.getElementById(`chapter-${chapterNum}-content`).classList.add('active');
            document.getElementById(`chapter-${chapterNum}-generate-btn`).style.display = 'none';
            document.getElementById(`chapter-${chapterNum}-regenerate-btn`).style.display = 'inline-flex';
            document.getElementById(`chapter-${chapterNum}-expand-btn`).style.display = 'inline-flex';
            
            document.getElementById(`chapter-${chapterNum}-checkbox`).checked = false;
            
        } catch (error) {
            document.getElementById(`chapter-${chapterNum}-status`).innerHTML = `❌ Error: ${error.message}`;
            document.getElementById(`chapter-${chapterNum}-generate-btn`).disabled = false;
            statusDiv.innerHTML = `❌ Failed to generate Chapter ${chapterNum}`;
            break;
        }
    }
    
    updateGenerateSelectedButton();
    updateOverallProgress();
    statusDiv.innerHTML = `✅ Selected chapters completed!`;
    autoSave();
}

async function generateAllChapters() {
    selectAllChapters();
    await generateSelectedChapters();
}

function updateChapterWordCount(chapterNum) {
    const textarea = document.getElementById(`chapter-${chapterNum}-text`);
    const wordCount = countWords(textarea.value);
    document.getElementById(`chapter-${chapterNum}-word-count`).textContent = `${wordCount} words`;
}

function updateOverallProgress() {
    const completedChapters = bookData.chapters.filter(chapter => chapter && chapter.trim().length > 0).length;
    const progress = (completedChapters / bookData.numChapters) * 100;
    document.getElementById('writing-progress').style.width = progress + '%';
    
    if (completedChapters === bookData.numChapters) {
        document.getElementById('writing-next').style.display = 'inline-flex';
        const writingNavItem = document.querySelector('[data-step="writing"]');
        if (writingNavItem) {
            writingNavItem.classList.add('completed');
        }
    }
}

function editChapter(chapterNum) {
    const textarea = document.getElementById(`chapter-${chapterNum}-text`);
    const content = textarea.value;
    
    bookData.chapters[chapterNum - 1] = content;
    
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="icon">✅</span>Saved!';
    button.style.background = 'var(--color-success)';
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = '';
    }, 2000);
    
    autoSave();
}

// Enhanced Expand Modal
function expandChapter(chapterNum) {
    const textarea = document.getElementById(`chapter-${chapterNum}-text`);
    const content = textarea.value;
    
    currentExpandedChapter = chapterNum;
    
    // Update modal content
    document.getElementById('expand-chapter-title').textContent = `Chapter ${chapterNum} - Expanded View`;
    document.getElementById('expand-textarea').value = content;
    
    updateExpandedWordCount();
    
    // Show modal
    const modal = document.getElementById('expand-modal');
    modal.classList.add('active');
    
    // Focus on textarea
    setTimeout(() => {
        document.getElementById('expand-textarea').focus();
    }, 100);
}

function updateExpandedWordCount() {
    const content = document.getElementById('expand-textarea').value;
    const wordCount = countWords(content);
    const readingTime = Math.ceil(wordCount / 250); // Assuming 250 WPM
    
    document.getElementById('expand-word-count').textContent = `${wordCount} words`;
    document.getElementById('expand-reading-time').textContent = `${readingTime} min read`;
}

function toggleExpandedReadMode() {
    const editor = document.getElementById('expand-editor');
    const reader = document.getElementById('expand-reader');
    const label = document.getElementById('read-mode-label');
    
    if (editor.style.display === 'none') {
        // Switch to edit mode
        editor.style.display = 'block';
        reader.style.display = 'none';
        label.textContent = 'Read Mode';
    } else {
        // Switch to read mode
        const content = document.getElementById('expand-textarea').value;
        document.getElementById('expand-reader-content').innerHTML = content.replace(/\n/g, '<br>');
        editor.style.display = 'none';
        reader.style.display = 'block';
        label.textContent = 'Edit Mode';
    }
}

function saveExpandedChapter() {
    if (currentExpandedChapter) {
        const content = document.getElementById('expand-textarea').value;
        document.getElementById(`chapter-${currentExpandedChapter}-text`).value = content;
        bookData.chapters[currentExpandedChapter - 1] = content;
        updateChapterWordCount(currentExpandedChapter);
        autoSave();
        
        // Visual feedback
        const saveBtn = event.target;
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="icon">✅</span>Saved!';
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
        }, 2000);
    }
}

function closeExpandModal() {
    const modal = document.getElementById('expand-modal');
    modal.classList.remove('active');
    currentExpandedChapter = null;
}

// Chapter Feedback System
async function runChapterFeedback(chapterNum) {
    const chapter = bookData.chapters[chapterNum - 1];
    if (!chapter) {
        alert('No chapter content to improve. Please generate the chapter first.');
        return;
    }
    
    const feedbackLoops = parseInt(document.getElementById('writing-feedback-loops').value) || 1;
    const feedbackMode = document.getElementById('writing-feedback-mode').value;
    
    // Get manual feedback if in manual mode
    let manualFeedback = '';
    if (feedbackMode === 'manual') {
        manualFeedback = document.getElementById('writing-manual-input').value;
        if (!manualFeedback.trim()) {
            alert('Please provide manual feedback instructions before running the feedback loop.');
            return;
        }
    }
    
    document.getElementById(`chapter-${chapterNum}-status`).innerHTML = '<div class="loading"><div class="spinner"></div>Running feedback analysis...</div>';
    
    try {
        let improvedChapter = chapter;
        
        for (let i = 0; i < feedbackLoops; i++) {
            if (feedbackMode === 'manual') {
                // Use manual feedback directly
                const improvementPrompt = formatPrompt(aiSettings.customPrompts.manualImprovement || defaultPrompts.manualImprovement, {
                    contentType: 'chapter',
                    originalContent: improvedChapter,
                    manualFeedback: manualFeedback,
                    genre: bookData.genre,
                    targetAudience: bookData.targetAudience,
                    premise: bookData.premise,
                    styleDirection: bookData.styleDirection,
                    targetWordCount: bookData.targetWordCount,
                    numChapters: bookData.numChapters
                });
                
                improvedChapter = await callAI(improvementPrompt, "You are a master storyteller implementing specific feedback requests.");
                
            } else {
                // Analyze chapter using custom or default prompt
                const analysisPrompt = formatPrompt(getCustomAnalysisPrompt('writing'), {
                    contentType: 'chapter',
                    content: improvedChapter,
                    genre: bookData.genre,
                    targetAudience: bookData.targetAudience,
                    premise: bookData.premise,
                    styleDirection: bookData.styleDirection,
                    targetWordCount: bookData.targetWordCount,
                    numChapters: bookData.numChapters
                });
                
                const analysis = await callAI(analysisPrompt, "You are a professional editor analyzing a book chapter.");
                
                // Improve chapter
                const improvementPrompt = formatPrompt(aiSettings.customPrompts.improvement || defaultPrompts.improvement, {
                    contentType: 'chapter',
                    originalContent: improvedChapter,
                    feedbackContent: analysis,
                    targetAudience: bookData.targetAudience,
                    genre: bookData.genre,
                    premise: bookData.premise,
                    styleDirection: bookData.styleDirection,
                    targetWordCount: bookData.targetWordCount,
                    numChapters: bookData.numChapters
                });
                
                improvedChapter = await callAI(improvementPrompt, "You are a master storyteller improving a book chapter.");
            }
        }
        
        // Update chapter
        bookData.chapters[chapterNum - 1] = improvedChapter;
        document.getElementById(`chapter-${chapterNum}-text`).value = improvedChapter;
        updateChapterWordCount(chapterNum);
        
        document.getElementById(`chapter-${chapterNum}-status`).innerHTML = `✅ Improved with ${feedbackLoops} ${feedbackMode} feedback loop(s)`;
        autoSave();
        
    } catch (error) {
        document.getElementById(`chapter-${chapterNum}-status`).innerHTML = `❌ Feedback error: ${error.message}`;
    }
}

// One-Click Generation System
function startOneClickGeneration() {
    collectBookData();
    
    if (!bookData.genre || !bookData.targetAudience || !bookData.premise) {
        alert('Please fill in all required fields before starting one-click generation.');
        return;
    }
    
    // Show configuration modal
    document.getElementById('one-click-modal').classList.add('active');
}

function closeOneClickModal() {
    document.getElementById('one-click-modal').classList.remove('active');
}

async function startOneClickProcess() {
    // Get feedback loop settings
    const outlineLoops = parseInt(document.getElementById('one-click-outline-loops').value);
    const chaptersLoops = parseInt(document.getElementById('one-click-chapters-loops').value);
    const writingLoops = parseInt(document.getElementById('one-click-writing-loops').value);
    
    // Close modal and show loading overlay
    closeOneClickModal();
    showLoadingOverlay('Starting one-click generation...');
    
    oneClickCancelled = false;
    
    try {
        // Step 1: Generate Outline
        updateLoadingText('Generating story structure...');
        showStep('outline');
        await generateOutline();
        
        if (oneClickCancelled) return;
        
        // Run feedback loops for outline
        if (outlineLoops > 0) {
            updateLoadingText(`Improving story structure (${outlineLoops} feedback loops)...`);
            document.getElementById('outline-feedback-loops').value = outlineLoops;
            document.getElementById('outline-feedback-mode').value = 'ai'; // Use AI mode for one-click
            await runFeedbackLoop('outline');
        }
        
        if (oneClickCancelled) return;
        
        // Step 2: Generate Chapter Outline
        updateLoadingText('Creating detailed chapter plan...');
        showStep('chapters');
        await generateChapterOutline();
        
        if (oneClickCancelled) return;
        
        // Run feedback loops for chapters
        if (chaptersLoops > 0) {
            updateLoadingText(`Improving chapter plan (${chaptersLoops} feedback loops)...`);
            document.getElementById('chapters-feedback-loops').value = chaptersLoops;
            document.getElementById('chapters-feedback-mode').value = 'ai'; // Use AI mode for one-click
            await runFeedbackLoop('chapters');
        }
        
        if (oneClickCancelled) return;
        
        // Step 3: Setup Writing Interface
        updateLoadingText('Setting up writing interface...');
        showStep('writing');
        setupWritingInterface();
        
        // Step 4: Generate All Chapters
        updateLoadingText('Writing all chapters...');
        document.getElementById('writing-feedback-loops').value = writingLoops;
        document.getElementById('writing-feedback-mode').value = 'ai'; // Use AI mode for one-click
        
        const statusDiv = document.getElementById('writing-status');
        
        for (let i = 1; i <= bookData.numChapters; i++) {
            if (oneClickCancelled) return;
            
            updateLoadingText(`Writing Chapter ${i} of ${bookData.numChapters}...`);
            statusDiv.innerHTML = `Writing Chapter ${i} of ${bookData.numChapters}...`;
            
            await generateSingleChapter(i);
            
            // Run feedback for this chapter if requested
            if (writingLoops > 0) {
                updateLoadingText(`Improving Chapter ${i} with feedback...`);
                await runChapterFeedback(i);
            }
            
            updateOverallProgress();
        }
        
        if (oneClickCancelled) return;
        
        // Step 5: Complete
        updateLoadingText('Finalizing book...');
        showStep('export');
        updateBookStats();
        generateAnalytics();
        
        hideLoadingOverlay();
        alert(`🎉 One-click generation completed! 

📚 Your book "${bookData.title}" is ready for export!

📊 Final Stats:
• ${bookData.chapters.filter(c => c).length} chapters completed
• ${bookData.chapters.filter(c => c).reduce((total, chapter) => total + countWords(chapter), 0).toLocaleString()} total words
• Ready for publishing!`);
        
    } catch (error) {
        hideLoadingOverlay();
        alert(`One-click generation failed: ${error.message}`);
    }
}

function cancelOneClickGeneration() {
    oneClickCancelled = true;
    hideLoadingOverlay();
}

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
}

// Export Functions
function proceedToExport() {
    showStep('export');
    updateBookStats();
    generateAnalytics();
}

function updateBookStats() {
    if (bookData.chapters.length === 0) {
        return;
    }

    let totalWords = 0;
    let completedChapters = 0;
    
    bookData.chapters.forEach(chapter => {
        if (chapter && chapter.trim().length > 0) {
            totalWords += countWords(chapter);
            completedChapters++;
        }
    });

    const avgWords = completedChapters > 0 ? Math.round(totalWords / completedChapters) : 0;
    const readingTime = Math.round(totalWords / 250); // Assuming 250 WPM reading speed

    document.getElementById('total-words').textContent = totalWords.toLocaleString();
    document.getElementById('total-chapters').textContent = completedChapters;
    document.getElementById('avg-words').textContent = avgWords.toLocaleString();
    document.getElementById('reading-time').textContent = readingTime;
}

function downloadBook(format) {
    if (bookData.chapters.length === 0) {
        alert('No chapters to download. Please complete the writing process first.');
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
    }
}

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

function generateHtmlContent(title) {
    let content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="generator" content="NovelFactory AI - https://novelfactory.ink">
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
        <p>Generated by <a href="https://novelfactory.ink">NovelFactory AI</a></p>
    </div>
</body>
</html>`;
    return content;
}

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

    content += `\n*Generated by [NovelFactory AI](https://novelfactory.ink)*\n`;
    return content;
}

function sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function copyToClipboard() {
    if (bookData.chapters.length === 0) {
        alert('No content to copy. Please complete the writing process first.');
        return;
    }

    const title = bookData.title || bookData.premise;
    const content = generateTxtContent(title);
    navigator.clipboard.writeText(content).then(() => {
        alert('Book content copied to clipboard!');
    }).catch(err => {
        alert('Failed to copy to clipboard. Please try downloading instead.');
    });
}

// Analytics
function generateAnalytics() {
    if (bookData.chapters.filter(c => c).length === 0) {
        return;
    }

    const completedChapters = bookData.chapters.filter(c => c && c.trim().length > 0);
    const completionRate = Math.round((completedChapters.length / bookData.numChapters) * 100);
    
    // Enhanced readability calculation
    let totalSentences = 0;
    let totalWords = 0;
    let totalSyllables = 0;
    
    completedChapters.forEach(chapter => {
        const sentences = chapter.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        const words = countWords(chapter);
        const syllables = estimateSyllables(chapter);
        
        totalSentences += sentences;
        totalWords += words;
        totalSyllables += syllables;
    });
    
    const avgWordsPerSentence = totalSentences > 0 ? totalWords / totalSentences : 0;
    const avgSyllablesPerWord = totalWords > 0 ? totalSyllables / totalWords : 0;
    
    // Flesch Reading Ease Score (converted to grade level)
    let readabilityScore = 'N/A';
    let readabilityExplanation = 'No content to analyze';
    
    if (totalSentences > 0 && totalWords > 0) {
        const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
        if (fleschScore >= 90) {
            readabilityScore = '5th';
            readabilityExplanation = 'Very easy to read';
        } else if (fleschScore >= 80) {
            readabilityScore = '6th';
            readabilityExplanation = 'Easy to read';
        } else if (fleschScore >= 70) {
            readabilityScore = '7th';
            readabilityExplanation = 'Fairly easy to read';
        } else if (fleschScore >= 60) {
            readabilityScore = '8th-9th';
            readabilityExplanation = 'Standard reading level';
        } else if (fleschScore >= 50) {
            readabilityScore = '10th-12th';
            readabilityExplanation = 'Fairly difficult to read';
        } else if (fleschScore >= 30) {
            readabilityScore = 'College';
            readabilityExplanation = 'Difficult to read';
        } else {
            readabilityScore = 'Graduate';
            readabilityExplanation = 'Very difficult to read';
        }
    }
    
    // Enhanced dialogue estimation
    let dialogueCount = 0;
    let totalParagraphs = 0;
    completedChapters.forEach(chapter => {
        const paragraphs = chapter.split('\n\n').filter(p => p.trim().length > 0);
        totalParagraphs += paragraphs.length;
        
        paragraphs.forEach(paragraph => {
            if (paragraph.includes('"') || paragraph.includes("'") || paragraph.includes('"') || paragraph.includes('"')) {
                dialogueCount++;
            }
        });
    });
    
    const dialogueRatio = totalParagraphs > 0 ? Math.round((dialogueCount / totalParagraphs) * 100) : 0;
    let dialogueExplanation = '';
    if (dialogueRatio < 20) {
        dialogueExplanation = 'Low dialogue - very narrative-heavy';
    } else if (dialogueRatio < 35) {
        dialogueExplanation = 'Good balance of dialogue and narrative';
    } else if (dialogueRatio < 50) {
        dialogueExplanation = 'High dialogue - character-focused';
    } else {
        dialogueExplanation = 'Very high dialogue - conversation-heavy';
    }
    
    // Enhanced pacing score
    const chapterLengths = completedChapters.map(chapter => countWords(chapter));
    const avgChapterLength = chapterLengths.reduce((a, b) => a + b, 0) / chapterLengths.length;
    const targetLength = bookData.targetWordCount;
    
    let pacingScore = 10;
    let pacingExplanation = 'Perfect chapter consistency';
    
    if (chapterLengths.length > 1) {
        const variance = chapterLengths.reduce((acc, val) => acc + Math.pow(val - avgChapterLength, 2), 0) / chapterLengths.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = stdDev / avgChapterLength;
        
        if (coefficientOfVariation < 0.15) {
            pacingScore = 10;
            pacingExplanation = 'Excellent consistency';
        } else if (coefficientOfVariation < 0.25) {
            pacingScore = 8;
            pacingExplanation = 'Good consistency';
        } else if (coefficientOfVariation < 0.40) {
            pacingScore = 6;
            pacingExplanation = 'Moderate variation';
        } else if (coefficientOfVariation < 0.60) {
            pacingScore = 4;
            pacingExplanation = 'High variation';
        } else {
            pacingScore = 2;
            pacingExplanation = 'Very inconsistent lengths';
        }
    }
    
    let completionExplanation = '';
    if (completionRate === 100) {
        completionExplanation = 'Book ready for publication!';
    } else if (completionRate >= 75) {
        completionExplanation = 'Nearly complete';
    } else if (completionRate >= 50) {
        completionExplanation = 'Good progress made';
    } else if (completionRate >= 25) {
        completionExplanation = 'Getting started';
    } else {
        completionExplanation = 'Just beginning';
    }
    
    // Update analytics display
    document.getElementById('readability-score').textContent = readabilityScore;
    document.getElementById('readability-explanation').textContent = readabilityExplanation;
    
    document.getElementById('dialogue-ratio').textContent = dialogueRatio + '%';
    document.getElementById('dialogue-explanation').textContent = dialogueExplanation;
    
    document.getElementById('pacing-score').textContent = pacingScore + '/10';
    document.getElementById('pacing-explanation').textContent = pacingExplanation;
    
    document.getElementById('completion-rate').textContent = completionRate + '%';
    document.getElementById('completion-explanation').textContent = completionExplanation;
    
    // Chapter balance analysis
    const balanceAnalysis = analyzeChapterBalance(chapterLengths);
    document.getElementById('chapter-balance').innerHTML = balanceAnalysis;
    
    // Content analysis
    const contentAnalysis = analyzeContent(completedChapters);
    document.getElementById('content-analysis').innerHTML = contentAnalysis;
}

function estimateSyllables(text) {
    const words = text.toLowerCase().split(/\s+/);
    let syllables = 0;
    
    words.forEach(word => {
        if (word.length <= 3) syllables += 1;
        else {
            const vowelMatches = word.match(/[aeiouy]+/g);
            syllables += vowelMatches ? vowelMatches.length : 1;
        }
    });
    
    return syllables;
}

function analyzeChapterBalance(lengths) {
    if (lengths.length === 0) return 'No completed chapters to analyze.';
    
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    
    let analysis = `<p><strong>Average chapter length:</strong> ${Math.round(avg)} words</p>`;
    analysis += `<p><strong>Standard deviation:</strong> ${Math.round(stdDev)} words</p>`;
    
    if (stdDev < avg * 0.2) {
        analysis += `<p class="success">✅ Excellent balance - chapters are consistently sized</p>`;
    } else if (stdDev < avg * 0.4) {
        analysis += `<p class="warning">⚠️ Good balance - minor length variations</p>`;
    } else {
        analysis += `<p class="error">⚠️ Consider balancing - significant length variations detected</p>`;
    }
    
    return analysis;
}

function analyzeContent(chapters) {
    const combinedText = chapters.join(' ');
    const words = combinedText.split(/\s+/);
    const sentences = combinedText.split(/[.!?]+/).length - 1;
    
    // Word frequency analysis (top 10 excluding common words)
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
    
    const wordFreq = {};
    words.forEach(word => {
        const clean = word.toLowerCase().replace(/[^a-z]/g, '');
        if (clean.length > 3 && !commonWords.has(clean)) {
            wordFreq[clean] = (wordFreq[clean] || 0) + 1;
        }
    });
    
    const topWords = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    let analysis = `<p><strong>Total words:</strong> ${words.length}</p>`;
    analysis += `<p><strong>Total sentences:</strong> ${sentences}</p>`;
    analysis += `<p><strong>Average sentence length:</strong> ${Math.round(words.length / sentences)} words</p>`;
    
    if (topWords.length > 0) {
        analysis += `<p><strong>Most frequent words:</strong></p><ul>`;
        topWords.forEach(([word, count]) => {
            analysis += `<li>${word}: ${count} times</li>`;
        });
        analysis += `</ul>`;
    }
    
    return analysis;
}

function analyzeChapter(chapterNum) {
    const chapter = bookData.chapters[chapterNum - 1];
    if (!chapter) {
        alert('No content to analyze for this chapter.');
        return;
    }
    
    const wordCount = countWords(chapter);
    const sentences = chapter.split(/[.!?]+/).length - 1;
    const paragraphs = chapter.split('\n\n').length;
    const avgSentenceLength = Math.round(wordCount / sentences);
    
    // Dialogue estimation
    const dialogueMatches = chapter.match(/["'"]/g);
    const dialogueEstimate = dialogueMatches ? Math.round((dialogueMatches.length / 2) / sentences * 100) : 0;
    
    // Reading time
    const readingTime = Math.round(wordCount / 250);
    
    alert(`Chapter ${chapterNum} Analysis:

📊 Statistics:
• Word count: ${wordCount}
• Sentences: ${sentences}
• Paragraphs: ${paragraphs}
• Avg sentence length: ${avgSentenceLength} words
• Estimated dialogue: ${dialogueEstimate}%
• Reading time: ${readingTime} minutes

🎯 Target: ${bookData.targetWordCount} words
${wordCount < bookData.targetWordCount * 0.8 ? '⚠️ Below target length' : 
  wordCount > bookData.targetWordCount * 1.2 ? '⚠️ Above target length' : 
  '✅ Good length'}`);
}

// Project Management
function loadProjects() {
    const savedProjects = localStorage.getItem('novelfactory_projects');
    if (savedProjects) {
        projects = JSON.parse(savedProjects);
        updateProjectSelector();
    }
}

function updateProjectSelector() {
    const selector = document.getElementById('project-select');
    selector.innerHTML = '<option value="current">Current Project</option>';
    
    Object.keys(projects).forEach(projectId => {
        const project = projects[projectId];
        const option = document.createElement('option');
        option.value = projectId;
        option.textContent = project.title || `Project ${projectId}`;
        selector.appendChild(option);
    });
}

function newProject() {
    if (bookData.premise || bookData.outline) {
        if (!confirm('Starting a new project will clear your current work. Continue?')) {
            return;
        }
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
        targetWordCount: 4000,
        outline: '',
        chapterOutline: '',
        chapters: [],
        currentStep: 'setup',
        createdAt: new Date().toISOString(),
        lastSaved: new Date().toISOString()
    };
    
    resetEverything();
    alert('New project created!');
}

function saveProject() {
    if (!bookData.premise) {
        alert('Please add some content before saving the project.');
        return;
    }
    
    const title = prompt('Enter a title for this project:', bookData.premise.substring(0, 30));
    if (title) {
        bookData.title = title;
        projects[bookData.id] = { ...bookData };
        localStorage.setItem('novelfactory_projects', JSON.stringify(projects));
        updateProjectSelector();
        alert('Project saved successfully!');
    }
}

function loadProject() {
    document.getElementById('project-file').click();
}

function switchProject() {
    const selector = document.getElementById('project-select');
    const projectId = selector.value;
    
    if (projectId === 'current') return;
    
    if (projects[projectId]) {
        if (bookData.premise || bookData.outline) {
            if (!confirm('Loading a project will replace your current work. Continue?')) {
                selector.value = 'current';
                return;
            }
        }
        
        bookData = { ...projects[projectId] };
        populateFormFields();
        showStep(bookData.currentStep);
        alert('Project loaded successfully!');
    }
}

function importProject(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            bookData = imported;
            populateFormFields();
            showStep(bookData.currentStep);
            alert('Project imported successfully!');
        } catch (error) {
            alert('Error importing project: Invalid file format');
        }
    };
    reader.readAsText(file);
}

// Settings Functions
function testApiConnection() {
    const statusDiv = document.getElementById('api-status');
    statusDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Testing connection...</div>';

    callAI("Respond with 'Connection successful!' if you can read this message.")
        .then(response => {
            statusDiv.innerHTML = '<div class="success">✅ API connection successful!</div>';
        })
        .catch(error => {
            statusDiv.innerHTML = `<div class="error">❌ Connection failed: ${error.message}</div>`;
        });
}

function resetPrompts() {
    if (confirm('Are you sure you want to reset all prompts to their default values?')) {
        initializePrompts();
        // Clear custom prompts from settings
        aiSettings.customPrompts = {
            outline: '',
            chapters: '',
            writing: '',
            analysis: '',
            improvement: '',
            manualImprovement: '',
            randomIdea: '',
            bookTitle: ''
        };
        saveSettings();
        alert('All prompts have been reset to default values.');
    }
}

function exportSettings() {
    const settings = {
        aiSettings: aiSettings,
        prompts: {
            outline: document.getElementById('outline-prompt').value,
            chapters: document.getElementById('chapters-prompt').value,
            writing: document.getElementById('writing-prompt').value
        }
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

function importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const settings = JSON.parse(e.target.result);
                if (settings.aiSettings) {
                    Object.assign(aiSettings, settings.aiSettings);
                    populateSettingsFields();
                }
                if (settings.prompts) {
                    document.getElementById('outline-prompt').value = settings.prompts.outline || defaultPrompts.outline;
                    document.getElementById('chapters-prompt').value = settings.prompts.chapters || defaultPrompts.chapters;
                    document.getElementById('writing-prompt').value = settings.prompts.writing || defaultPrompts.writing;
                }
                saveSettings();
                alert('Settings imported successfully!');
            } catch (error) {
                alert('Error importing settings: Invalid file format');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Cost estimation
function estimateCosts() {
    const model = document.getElementById('model-select').value;
    const provider = aiSettings.apiProvider;
    const allModels = [...apiModels[provider].creative, ...apiModels[provider].budget];
    const modelInfo = allModels.find(m => m.value === model);
    
    if (!modelInfo || !modelInfo.cost) {
        alert('Cost estimation not available for this model.');
        return;
    }
    
    const estimatedTokensPerChapter = bookData.targetWordCount * 1.3; // Rough token estimate
    const totalOutputTokens = bookData.numChapters * estimatedTokensPerChapter;
    const totalInputTokens = bookData.numChapters * 1000; // Context tokens
    
    const inputCost = (totalInputTokens / 1000000) * modelInfo.cost.input;
    const outputCost = (totalOutputTokens / 1000000) * modelInfo.cost.output;
    const totalCost = inputCost + outputCost;
    
    alert(`💰 Estimated cost for ${bookData.numChapters} chapters:

📥 Input tokens: ${inputCost.toFixed(3)}
📤 Output tokens: ${outputCost.toFixed(3)}
💰 Total: ${totalCost.toFixed(3)}

⚠️ This is a rough estimate. Actual costs may vary based on:
• Actual content length
• Complexity of prompts  
• Number of feedback loops
• API pricing changes

💡 Costs calculated per 1M tokens.
🔗 Generated with NovelFactory AI (novelfactory.ink)`);
}

// Keyboard shortcuts info
function showKeyboardShortcuts() {
    alert(`⌨️ Keyboard Shortcuts:

📱 General:
• Ctrl+S (⌘+S): Auto-save current work
• Ctrl+G (⌘+G): Generate current step
• Ctrl+F (⌘+F): Enter focus mode / Expand chapter
• Ctrl+D (⌘+D): Toggle theme (Light → Dark → Fun)
• Escape: Close modals

🖱️ Navigation:
• Tab: Move between fields
• Enter: Activate buttons
• Escape: Close modals and overlays

✍️ Writing Tips:
• Use expand mode for distraction-free writing
• Auto-save runs every 30 seconds
• Export regularly to backup your work
• Use feedback loops to improve quality
• Try 1-click generation for automation

🎨 Themes:
• Light: Classic clean interface
• Dark: Easy on the eyes for long sessions  
• Fun: Colorful and playful design

🔗 Generated with NovelFactory AI (novelfactory.ink)`);
}

// Reset functionality
function resetEverything() {
    if (!confirm('🚫 Are you sure you want to reset everything and start a new book? This will clear all current progress and cannot be undone.')) {
        return;
    }
    
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
        targetWordCount: 4000,
        outline: '',
        chapterOutline: '',
        chapters: [],
        currentStep: 'setup',
        createdAt: new Date().toISOString(),
        lastSaved: new Date().toISOString()
    };
    
    // Reset form fields
    document.getElementById('genre').value = '';
    document.getElementById('target-audience').value = '';
    document.getElementById('premise').value = '';
    document.getElementById('style-direction').value = '';
    document.getElementById('num-chapters').value = '20';
    document.getElementById('target-word-count').value = '4000';
    
    // Clear outputs
    document.getElementById('outline-output').innerHTML = 'Click "Generate Story Structure" to create your complete narrative framework...';
    document.getElementById('chapters-output').innerHTML = 'Chapter planning will be generated...';
    document.getElementById('chapters-container').innerHTML = '';
    document.getElementById('total-words').textContent = '0';
    document.getElementById('total-chapters').textContent = '0';
    document.getElementById('avg-words').textContent = '0';
    document.getElementById('reading-time').textContent = '0';
    document.getElementById('quality-analysis').innerHTML = 'Complete the writing process to see quality analysis...';
    
    // Reset navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active', 'completed');
    });
    document.querySelector('[data-step="setup"]').classList.add('active');
    
    // Hide next buttons
    document.getElementById('outline-next').style.display = 'none';
    document.getElementById('chapters-next').style.display = 'none';
    document.getElementById('writing-next').style.display = 'none';
    document.getElementById('random-idea-btn').style.display = 'none';
    
    // Reset progress
    document.getElementById('writing-progress').style.width = '0%';
    document.getElementById('writing-status').innerHTML = 'Ready to begin writing chapters...';
    
    // Reset feedback loops
    document.getElementById('outline-feedback-loops').value = '0';
    document.getElementById('chapters-feedback-loops').value = '0';
    document.getElementById('writing-feedback-loops').value = '0';
    
    // Clear word counts
    updateWordCount();
    updateChapterEstimate();
    
    // Go to setup
    showStep('setup');
    
    // Clear API status
    document.getElementById('api-status').innerHTML = '';
    
    // Clear local storage
    localStorage.removeItem('novelfactory_currentProject');
    
    // Reset global variables
    oneClickCancelled = false;
    currentExpandedChapter = null;
    
    alert('✅ Everything has been reset! You can now start creating a new book.');
}

// Initialize expand textarea word count tracking
document.addEventListener('DOMContentLoaded', function() {
    const expandTextarea = document.getElementById('expand-textarea');
    if (expandTextarea) {
        expandTextarea.addEventListener('input', updateExpandedWordCount);
    }
});

// Initialize on load
window.addEventListener('load', function() {
    // Load any saved work
    loadFromLocalStorage();
    
    // Update UI elements
    updateWordCount();
    updateChapterEstimate();
    updateModelInfo();
    updateNavProgress();
});

// Auto-save on page unload
window.addEventListener('beforeunload', function() {
    autoSave();
});

// Prevent accidental page refresh during generation
window.addEventListener('beforeunload', function(e) {
    if (document.getElementById('loading-overlay').style.display !== 'none') {
        e.preventDefault();
        e.returnValue = 'Generation in progress. Are you sure you want to leave?';
        return e.returnValue;
    }
});

// Global error handler for better user experience
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    if (document.getElementById('loading-overlay').style.display !== 'none') {
        hideLoadingOverlay();
        alert('An unexpected error occurred. Please try again.');
    }
});

// Handle network errors gracefully
window.addEventListener('online', function() {
    console.log('Connection restored');
});

window.addEventListener('offline', function() {
    alert('You appear to be offline. Some features may not work until connection is restored.');
});

// Performance optimization: Debounce word count updates
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debouncing to word count updates
const debouncedUpdateWordCount = debounce(updateWordCount, 300);
const debouncedUpdateExpandedWordCount = debounce(updateExpandedWordCount, 300);

// Replace direct calls with debounced versions for better performance
document.addEventListener('DOMContentLoaded', function() {
    const premiseTextarea = document.getElementById('premise');
    const styleTextarea = document.getElementById('style-direction');
    const expandTextarea = document.getElementById('expand-textarea');
    
    if (premiseTextarea) {
        premiseTextarea.removeEventListener('input', updateWordCount);
        premiseTextarea.addEventListener('input', debouncedUpdateWordCount);
    }
    
    if (styleTextarea) {
        styleTextarea.removeEventListener('input', updateWordCount);
        styleTextarea.addEventListener('input', debouncedUpdateWordCount);
    }
    
    if (expandTextarea) {
        expandTextarea.addEventListener('input', debouncedUpdateExpandedWordCount);
    }
});

// Accessibility improvements
document.addEventListener('DOMContentLoaded', function() {
    // Add ARIA labels to important buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        if (!button.getAttribute('aria-label')) {
            const text = button.textContent.trim();
            if (text) {
                button.setAttribute('aria-label', text);
            }
        }
    });
    
    // Add focus management for modals
    const modals = document.querySelectorAll('.modal, .expand-modal');
    modals.forEach(modal => {
        modal.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                // Basic focus trapping could be implemented here
                // For now, we rely on natural tab order
            }
        });
    });
});

// Touch device optimizations
if ('ontouchstart' in window) {
    document.body.classList.add('touch-device');
    
    // Add touch-friendly interactions
    document.addEventListener('touchstart', function() {}, {passive: true});
}

// Print styles helper
function preparePrintView() {
    const printCSS = `
        @media print {
            .nav, .header, .project-bar, .step-actions, .keyboard-shortcuts { display: none !important; }
            .main-content { padding: 0 !important; }
            .chapter-item { page-break-inside: avoid; }
            .step { display: block !important; }
        }
    `;
    
    const style = document.createElement('style');
    style.textContent = printCSS;
    document.head.appendChild(style);
}

// Call print preparation on load
document.addEventListener('DOMContentLoaded', preparePrintView);

// Console welcome message for developers
console.log(`
🚀 NovelFactory AI - Professional Edition
🔗 https://novelfactory.ink
Built with ❤️ for writers and creators

Features:
✨ AI-powered story generation
🎨 Modern simplistic design with 3 themes
🔄 Advanced feedback loops
⚡ One-click automation
📤 Multiple export formats
📊 Book analytics
🎓 Detailed tutorial
💬 Built-in feedback system
☕ Optional donation support

Happy writing! 📚✨
`);

// Development helpers (remove in production)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.bookData = bookData;
    window.aiSettings = aiSettings;
    window.themes = themes;
    console.log('🔧 Development mode: Global variables exposed for debugging');
}

