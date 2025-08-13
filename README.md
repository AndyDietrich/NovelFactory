// NovelFactory AI - Professional Edition with Advanced Model Selection
// Complete JavaScript file with all fixes integrated

// Custom Alert System
let alertCallback = null;

function customAlert(message, title = 'Notification') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-alert-modal');
        const titleElement = document.getElementById('alert-title');
        const messageElement = document.getElementById('alert-message');
        const okBtn = document.getElementById('alert-ok-btn');
        const cancelBtn = document.getElementById('alert-cancel-btn');
        
        titleElement.textContent = title;
        // Replace newlines with <br> tags
        messageElement.innerHTML = message.replace(/\n/g, '<br>');
        
        // Show only OK button for simple alerts
        okBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'none';
        
        alertCallback = resolve;
        modal.classList.add('active');
        okBtn.focus();
    });
}

function customConfirm(message, title = 'Confirmation') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-alert-modal');
        const titleElement = document.getElementById('alert-title');
        const messageElement = document.getElementById('alert-message');
        const okBtn = document.getElementById('alert-ok-btn');
        const cancelBtn = document.getElementById('alert-cancel-btn');
        
        titleElement.textContent = title;
        messageElement.textContent = message;
        
        // Show both buttons for confirm dialogs
        okBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'inline-flex';
        okBtn.textContent = 'Yes';
        cancelBtn.textContent = 'No';
        
        alertCallback = resolve;
        modal.classList.add('active');
        cancelBtn.focus();
    });
}

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

let projects = {};
let autoSaveTimer;
let oneClickCancelled = false;
let currentExpandedChapter = null;
let currentTheme = 'light';
let selectedDonationAmount = 5;
let isGenerating = false;

// API Models Configuration
const apiModels = {
    openrouter: {
        creative: [
            { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4', cost: { input: 3.00, output: 15.00 }},
            { value: 'anthropic/claude-opus-4.1', label: 'Claude Opus 4.1', cost: { input: 15.00, output: 75.00 }},
            { value: 'openai/gpt-4o', label: 'GPT-4o', cost: { input: 5.00, output: 15.00 }},
            { value: 'openai/gpt-5', label: 'GPT-5', cost: { input: 1.25, output: 10.00 }},
            { value: 'anthropic/claude-3.7-sonnet:thinking', label: 'Claude Sonnet 3.7 (Thinking)', cost: { input: 3.00, output: 15.00 }},
            { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', cost: { input: 1.25, output: 10.00 }}
        ],
        budget: [
            { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', cost: { input: 0.25, output: 2.00 }},
            { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', cost: { input: 0.15, output: 0.60 }},
            { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano', cost: { input: 0.05, output: 0.40 }},
            { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', cost: { input: 0.30, output: 2.50 }},
            { value: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek Chat V3', cost: { input: 0.18, output: 0.72 }}
        ]
    },
    openai: {
        creative: [
            { value: 'gpt-5', label: 'GPT-5', cost: { input: 1.25, output: 10 }},
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

1. **PREMISE** (2-3 sentences): A compelling, original premise that hooks readers immediately. Make it unique, intriguing, and marketable. Avoid clichÃ©s and overused tropes. Think of concepts that would make someone say "I've never read anything like this before!"

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

// ==================================================
// ENHANCED MODEL SELECTION SYSTEM
// ==================================================

// Fixed getSelectedModel function with proper priority logic
function getSelectedModel(step) {
    // Check if advanced models are enabled via checkbox
    const advancedModelsEnabled = document.getElementById('enable-advanced-models')?.checked || false;
    
    if (advancedModelsEnabled && aiSettings.advancedModels && aiSettings.advancedModels[step]) {
        const advancedModel = aiSettings.advancedModels[step];
        console.log(`âœ“ Using advanced model for ${step}: ${advancedModel}`);
        return advancedModel;
    }
    
    // Fall back to default model from the main model select
    const defaultModel = document.getElementById('model-select')?.value || aiSettings.model || 'anthropic/claude-sonnet-4';
    console.log(`â†’ Using default model for ${step}: ${defaultModel}`);
    return defaultModel;
}

// Debounced auto-save function for better performance
const debouncedSaveAdvancedModels = debounce(saveAdvancedModelSettings, 500);

// Auto-save advanced model settings (no manual save button needed)
function saveAdvancedModelSettings() {
    const advancedModels = {};
    
    ['outline', 'chapters', 'writing', 'feedback', 'randomIdea', 'bookTitle'].forEach(step => {
        const select = document.getElementById(`advanced-model-${step}`);
        if (select && select.value && select.value !== '') {
            advancedModels[step] = select.value;
        }
    });
    
    // Save to aiSettings
    aiSettings.advancedModels = advancedModels;
    aiSettings.advancedModelsEnabled = document.getElementById('enable-advanced-models')?.checked || false;
    
    // Save to localStorage
    saveSettings();
    
    console.log('âœ“ Advanced model settings auto-saved:', advancedModels);
    
    // Visual feedback - subtle color change
    showModelSettingsSaved();
}

// Visual feedback for settings save
function showModelSettingsSaved() {
    const section = document.querySelector('.advanced-models-section');
    if (section) {
        section.style.borderColor = 'var(--color-success)';
        setTimeout(() => {
            section.style.borderColor = '';
        }, 1000);
    }
}

// Reset advanced model settings
function resetAdvancedModelSettings() {
    ['outline', 'chapters', 'writing', 'feedback', 'randomIdea', 'bookTitle'].forEach(step => {
        const select = document.getElementById(`advanced-model-${step}`);
        if (select) {
            select.value = ''; // Reset to "Use Default Model"
            
            // Visual feedback
            const label = select.previousElementSibling;
            if (label) {
                label.style.color = 'var(--text-secondary)';
                label.style.fontWeight = '500';
            }
        }
    });
    
    // Reset checkbox
    const checkbox = document.getElementById('enable-advanced-models');
    if (checkbox) {
        checkbox.checked = false;
    }
    
    // Clear settings
    aiSettings.advancedModels = {};
    aiSettings.advancedModelsEnabled = false;
    saveSettings();
    
    // Update visual state
    updateAdvancedModelsVisualState();
    
    console.log('âœ“ Advanced model settings reset to defaults');
}

// Setup auto-save listeners for advanced models
function setupAdvancedModelListeners() {
    // Add change listeners to all advanced model selects
    ['outline', 'chapters', 'writing', 'feedback', 'randomIdea', 'bookTitle'].forEach(step => {
        const select = document.getElementById(`advanced-model-${step}`);
        if (select) {
            select.addEventListener('change', (e) => {
                // Debounced auto-save
                debouncedSaveAdvancedModels();
                
                // Visual feedback - highlight the changed setting
                const label = select.previousElementSibling;
                if (label) {
                    if (e.target.value) {
                        label.style.color = 'var(--color-primary)';
                        label.style.fontWeight = '600';
                    } else {
                        label.style.color = 'var(--text-secondary)';
                        label.style.fontWeight = '500';
                    }
                }
                
                console.log(`Model changed for ${step}: ${e.target.value || 'default'}`);
            });
        }
    });
    
    // Add listener to the enable checkbox
    const enableCheckbox = document.getElementById('enable-advanced-models');
    if (enableCheckbox) {
        enableCheckbox.addEventListener('change', (e) => {
            // Immediate save for enable/disable
            saveAdvancedModelSettings();
            
            // Update visual state
            updateAdvancedModelsVisualState();
            
            // Log state change
            console.log(`Advanced models ${e.target.checked ? 'enabled' : 'disabled'}`);
        });
    }
}

// Update visual state of advanced models section
function updateAdvancedModelsVisualState() {
    const section = document.querySelector('.advanced-models-section');
    const checkbox = document.getElementById('enable-advanced-models');
    const selects = document.querySelectorAll('[id^="advanced-model-"]');
    
    if (section && checkbox) {
        if (checkbox.checked) {
            section.classList.add('active');
            selects.forEach(select => {
                select.disabled = false;
                select.style.opacity = '1';
            });
        } else {
            section.classList.remove('active');
            selects.forEach(select => {
                select.disabled = true;
                select.style.opacity = '0.5';
            });
        }
    }
}

// Validate and update models when switching API providers
function validateAdvancedModelsOnProviderSwitch() {
    const provider = aiSettings.apiProvider || 'openrouter';
    const models = apiModels[provider];
    
    if (!models) return;
    
    // Get all available model values for the current provider
    const availableModels = [
        ...(models.creative || []).map(m => m.value),
        ...(models.budget || []).map(m => m.value)
    ];
    
    // Check and update advanced model selections
    let hasChanges = false;
    ['outline', 'chapters', 'writing', 'feedback', 'randomIdea', 'bookTitle'].forEach(step => {
        const currentModel = aiSettings.advancedModels[step];
        if (currentModel && !availableModels.includes(currentModel)) {
            console.warn(`Model ${currentModel} for ${step} not available in ${provider}, clearing selection`);
            delete aiSettings.advancedModels[step];
            
            // Update UI
            const select = document.getElementById(`advanced-model-${step}`);
            if (select) {
                select.value = '';
                const label = select.previousElementSibling;
                if (label) {
                    label.style.color = 'var(--text-secondary)';
                    label.style.fontWeight = '500';
                }
            }
            
            hasChanges = true;
        }
    });
    
    if (hasChanges) {
        saveSettings();
        console.log('âœ“ Advanced model selections updated for new provider');
    }
}

// Enhanced updateAdvancedModelSelect with proper model loading
function updateAdvancedModelSelect(selectId) {
    const modelSelect = document.getElementById(selectId);
    if (!modelSelect) return;
    
    const provider = aiSettings.apiProvider || 'openrouter';
    const models = apiModels[provider];

    if (!models) {
        console.warn(`No models found for provider: ${provider}`);
        return;
    }

    // Clear and rebuild options
    modelSelect.innerHTML = '';

    // Add empty option first
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Use Default Model';
    emptyOption.style.fontStyle = 'italic';
    modelSelect.appendChild(emptyOption);

    // Helper to create options with enhanced info
    function createOptions(modelArray, groupLabel) {
        if (!modelArray || modelArray.length === 0) return;
        
        const group = document.createElement('optgroup');
        group.label = `${groupLabel} Models`;
        
        modelArray.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.label;
            
            // Add cost info if available
            if (model.cost) {
                option.title = `Input: $${model.cost.input}/1M tokens | Output: $${model.cost.output}/1M tokens`;
            }
            
            group.appendChild(option);
        });
        
        modelSelect.appendChild(group);
    }

    // Add model groups
    if (models.creative && models.creative.length) {
        createOptions(models.creative, 'Creative â­');
    }

    if (models.budget && models.budget.length) {
        createOptions(models.budget, 'Budget ðŸ’°');
    }

    // Set saved value if exists and valid
    const stepName = selectId.replace('advanced-model-', '');
    if (aiSettings.advancedModels && aiSettings.advancedModels[stepName]) {
        const savedModel = aiSettings.advancedModels[stepName];
        
        // Check if the saved model is still available
        const allOptions = Array.from(modelSelect.options);
        const isAvailable = allOptions.some(option => option.value === savedModel);
        
        if (isAvailable) {
            modelSelect.value = savedModel;
            
            // Visual feedback for selected models
            const label = modelSelect.previousElementSibling;
            if (label) {
                label.style.color = 'var(--color-primary)';
                label.style.fontWeight = '600';
            }
        } else {
            // Model no longer available, clear the setting
            delete aiSettings.advancedModels[stepName];
            console.warn(`Model ${savedModel} no longer available for ${stepName}`);
        }
    }
    
    // Update visual state based on checkbox
    const checkbox = document.getElementById('enable-advanced-models');
    if (checkbox && !checkbox.checked) {
        modelSelect.disabled = true;
        modelSelect.style.opacity = '0.5';
    }
}

// Enhanced updateModelSelect with advanced models integration
function updateModelSelect() {
    // Update main model select
    const modelSelect = document.getElementById('model-select');
    if (!modelSelect) return;
    
    modelSelect.innerHTML = '';

    const provider = aiSettings.apiProvider || 'openrouter';
    const models = apiModels[provider];

    if (!models) {
        console.warn(`No models found for provider: ${provider}`);
        return;
    }

    // Helper to create options
    function createOptions(modelArray) {
        if (!modelArray || modelArray.length === 0) return [];
        
        return modelArray.map(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.label;
            
            // Add cost info
            if (model.cost) {
                option.title = `Input: $${model.cost.input}/1M tokens | Output: $${model.cost.output}/1M tokens`;
            }
            
            if (aiSettings.model === model.value) {
                option.selected = true;
            }
            return option;
        });
    }

    // Creative group
    if (models.creative && models.creative.length) {
        const creativeGroup = document.createElement('optgroup');
        creativeGroup.label = 'Creative Models â­';
        createOptions(models.creative).forEach(option => creativeGroup.appendChild(option));
        modelSelect.appendChild(creativeGroup);
    }

    // Budget group
    if (models.budget && models.budget.length) {
        const budgetGroup = document.createElement('optgroup');
        budgetGroup.label = 'Budget Models ðŸ’°';
        createOptions(models.budget).forEach(option => budgetGroup.appendChild(option));
        modelSelect.appendChild(budgetGroup);
    }

    // Update all advanced model selects
    ['outline', 'chapters', 'writing', 'feedback', 'randomIdea', 'bookTitle'].forEach(step => {
        updateAdvancedModelSelect(`advanced-model-${step}`);
    });
    
    // Validate advanced models for the current provider
    validateAdvancedModelsOnProviderSwitch();
    
    // Update model info display
    updateModelInfo();
}

// Enhanced switchApiProvider with validation
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
    
    // Update model selections
    updateModelSelect();
    saveSettings();
}

// Initialize advanced models section
function initializeAdvancedModelsSection() {
    const section = document.querySelector('.advanced-models-section');
    if (section) {
        // Start collapsed
        section.classList.add('collapsed');
        
        // Set up toggle functionality
        const header = section.querySelector('.advanced-models-header');
        if (header) {
            header.addEventListener('click', (e) => {
                // Don't toggle if clicking the checkbox area
                if (e.target.closest('.advanced-models-toggle')) {
                    return;
                }
                toggleAdvancedModelsSection();
            });
        }
        
        // Update initial visual state
        updateAdvancedModelsVisualState();
    }
}

// Toggle advanced models section
function toggleAdvancedModelsSection() {
    const section = document.querySelector('.advanced-models-section');
    if (section) {
        section.classList.toggle('collapsed');
        
        // Update toggle icon
        const icon = section.querySelector('.toggle-icon');
        if (icon) {
            icon.textContent = section.classList.contains('collapsed') ? 'â–¼' : 'â–²';
        }
        
        console.log('Advanced models section:', section.classList.contains('collapsed') ? 'collapsed' : 'expanded');
    }
}

// ==================================================
// THEME MANAGEMENT
// ==================================================

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

function toggleTheme() {
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const newTheme = themes[nextIndex];
    setTheme(newTheme);
}

// ==================================================
// EVENT LISTENERS
// ==================================================

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

// ==================================================
// FEEDBACK SYSTEM
// ==================================================

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

async function resetFeedbackPrompt(step) {
    const confirmed = await customConfirm('Reset feedback prompt to default?', 'Reset Prompt');
    if (confirmed) {
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
    btn.innerHTML = '<span class="label">Saved!</span>';
    setTimeout(() => {
        btn.innerHTML = originalText;
    }, 2000);
    
    autoSave();
}

// ==================================================
// DONATION SYSTEM
// ==================================================

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
    document.getElementById('donate-btn').innerHTML = `<span class="label">Donate $${amount}</span>`;
    
    // Clear custom amount
    document.getElementById('custom-donation-amount').value = '';
}

async function proceedToDonate() {
    const customAmount = document.getElementById('custom-donation-amount').value;
    const amount = customAmount || selectedDonationAmount;
    
    if (!amount || amount < 1) {
        await customAlert('Please select or enter a valid donation amount.', 'Invalid Amount');
        return;
    }
    
    // Create PayPal donation URL
    const paypalUrl = `https://www.paypal.com/donate/?hosted_button_id=&business=dietrichandreas2%40t-online.de&amount=${amount}&currency_code=USD&item_name=NovelFactory%20AI%20Support`;
    
    // Open PayPal in new window
    window.open(paypalUrl, '_blank');
    
    // Close modal
    closeDonationModal();
    
    // Show thank you message
    setTimeout(async () => {
        await customAlert('Thank you so much for supporting NovelFactory AI! Your generosity helps keep this tool free for everyone.', 'Thank You!');
    }, 1000);
}

// ==================================================
// FEEDBACK SYSTEM
// ==================================================

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

async function submitFeedback() {
    const type = document.getElementById('feedback-type').value;
    const message = document.getElementById('feedback-message').value;
    const email = document.getElementById('feedback-email').value;
    
    if (!message.trim()) {
        await customAlert('Please enter your feedback message.', 'Missing Information');
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
    await customAlert('Thank you for your feedback! Your default email client should open with your message. If it doesn\'t open automatically, please email me directly at dietrichandreas2@t-online.de', 'Feedback Sent');
}

// ==================================================
// AUTO-SAVE SYSTEM
// ==================================================

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

// ==================================================
// KEYBOARD SHORTCUTS
// ==================================================

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
            closeCustomAlert(false);
        }
    });
}

// ==================================================
// NAVIGATION SYSTEM
// ==================================================

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

// ==================================================
// SETTINGS MANAGEMENT
// ==================================================

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

// Enhanced saveSettings function
function saveSettings() {
    // Get current form values
    aiSettings.openrouterApiKey = document.getElementById('openrouter-api-key')?.value || '';
    aiSettings.openaiApiKey = document.getElementById('openai-api-key')?.value || '';
    aiSettings.model = document.getElementById('model-select')?.value || 'anthropic/claude-sonnet-4';
    aiSettings.temperature = parseFloat(document.getElementById('temperature')?.value || 0.5);
    aiSettings.maxTokens = parseInt(document.getElementById('max-tokens')?.value || 50000);
    aiSettings.advancedModelsEnabled = document.getElementById('enable-advanced-models')?.checked || false;
    
    // Ensure advanced models object exists
    if (!aiSettings.advancedModels) {
        aiSettings.advancedModels = {};
    }
    
    // Save custom prompts
    if (document.getElementById('outline-prompt')) {
        aiSettings.customPrompts.outline = document.getElementById('outline-prompt').value;
    }
    if (document.getElementById('chapters-prompt')) {
        aiSettings.customPrompts.chapters = document.getElementById('chapters-prompt').value;
    }
    if (document.getElementById('writing-prompt')) {
        aiSettings.customPrompts.writing = document.getElementById('writing-prompt').value;
    }
    
    // Save feedback prompts if they exist
    ['outline', 'chapters', 'writing'].forEach(step => {
        const feedbackPrompt = document.getElementById(`${step}-feedback-prompt`);
        if (feedbackPrompt && feedbackPrompt.value) {
            aiSettings.customPrompts.analysis = feedbackPrompt.value;
        }
    });
    
    // Save to localStorage
    localStorage.setItem('novelfactory_settings', JSON.stringify(aiSettings));
    console.log('âœ“ Settings saved');
}

// Enhanced populateSettingsFields with advanced models loading
function populateSettingsFields() {
    // Populate basic fields
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
        document.getElementById('temperature').value = aiSettings.temperature || 0.5;
    }
    if (document.getElementById('max-tokens')) {
        document.getElementById('max-tokens').value = aiSettings.maxTokens || 50000;
    }
    
    // Set advanced models checkbox
    const enableCheckbox = document.getElementById('enable-advanced-models');
    if (enableCheckbox) {
        enableCheckbox.checked = aiSettings.advancedModelsEnabled || false;
    }
    
    // Set API provider
    switchApiProvider(aiSettings.apiProvider || 'openrouter');
    
    // Load advanced model selections after models are populated
    setTimeout(() => {
        if (aiSettings.advancedModels) {
            ['outline', 'chapters', 'writing', 'feedback', 'randomIdea', 'bookTitle'].forEach(step => {
                const select = document.getElementById(`advanced-model-${step}`);
                if (select && aiSettings.advancedModels[step]) {
                    select.value = aiSettings.advancedModels[step];
                    
                    // Visual feedback for pre-selected models
                    const label = select.previousElementSibling;
                    if (label && select.value) {
                        label.style.color = 'var(--color-primary)';
                        label.style.fontWeight = '600';
                    }
                }
            });
        }
        
        // Update visual state
        updateAdvancedModelsVisualState();
    }, 100);
    
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
    // Initialize aiSettings if not exists
    if (!aiSettings.advancedModels) {
        aiSettings.advancedModels = {};
    }
    if (!aiSettings.customPrompts) {
        aiSettings.customPrompts = {};
    }
    
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

// ==================================================
// UTILITY FUNCTIONS
// ==================================================

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

// ==================================================
// AI API FUNCTIONS
// ==================================================

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

function getAISettings(model = null) {
    const provider = aiSettings.apiProvider;
    let apiKey = '';
    
    if (provider === 'openrouter') {
        apiKey = document.getElementById('openrouter-api-key').value;
    } else {
        apiKey = document.getElementById('openai-api-key').value;
    }

    // Use provided model or fall back to default
    const selectedModel = model || document.getElementById('model-select')?.value || aiSettings.model || 'anthropic/claude-sonnet-4';
    
    return {
        apiProvider: provider,
        apiKey: apiKey,
        model: selectedModel,
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

// ==================================================
// FEEDBACK LOOP SYSTEM
// ==================================================

async function runFeedbackLoop(contentType) {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    isGenerating = true;
    try {
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

        const outputDiv = document.getElementById(`${contentType}-output`);
        
        for (let i = 0; i < feedbackLoops; i++) {
            outputDiv.innerHTML = `<div class="loading"><div class="spinner"></div>Running ${feedbackMode} feedback loop ${i + 1} of ${feedbackLoops}...</div>`;
            
            try {
                let improvedContent;
                
                // Get the model for feedback
                const feedbackModel = getSelectedModel('feedback');
                console.log(`Using model for feedback: ${feedbackModel}`);
                
                if (feedbackMode === 'manual') {
                    // Use manual feedback directly
                    const improvementPrompt = formatPrompt(aiSettings.customPrompts.manualImprovement || defaultPrompts.manualImprovement, {
                        contentType: 'chapter',
                        originalContent: content,
                        manualFeedback: manualFeedback,
                        genre: bookData.genre,
                        targetAudience: bookData.targetAudience,
                        premise: bookData.premise,
                        styleDirection: bookData.styleDirection,
                        targetWordCount: bookData.targetWordCount,
                        numChapters: bookData.numChapters
                    });
                    
                    improvedContent = await callAI(improvementPrompt, "You are a master storyteller and professional editor implementing specific feedback requests.", feedbackModel);
                    
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
                    
                    improvedContent = await callAI(improvementPrompt, "You are a master storyteller and professional editor.", feedbackModel);
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
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

function getCustomAnalysisPrompt(contentType) {
    const customPrompt = document.getElementById(`${contentType}-feedback-prompt`)?.value;
    return customPrompt && customPrompt.trim() ? customPrompt : (aiSettings.customPrompts.analysis || defaultPrompts.analysis);
}

// ==================================================
// RANDOM IDEA GENERATION
// ==================================================

async function generateRandomIdea() {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    isGenerating = true;
    console.log('Starting random idea generation...');
    const genre = document.getElementById('genre').value;
    const audience = document.getElementById('target-audience').value;
    
    if (!genre || !audience) {
        await customAlert('Please select genre and target audience first!', 'Missing Information');
        return;
    }

    const randomBtn = document.getElementById('random-idea-btn');
    const originalText = randomBtn.innerHTML;
    randomBtn.innerHTML = '<span class="label"><div class="spinner"></div>Generating Idea...</span>';
    randomBtn.disabled = true;

    try {
        // Get the model for this step
        const selectedModel = getSelectedModel('randomIdea');
        console.log(`Using model for randomIdea: ${selectedModel}`);
        
        const prompt = formatPrompt(aiSettings.customPrompts.randomIdea || defaultPrompts.randomIdea, {
            genre: genre.replace('-', ' '),
            targetAudience: audience.replace('-', ' ')
        });

        const aiResponse = await callAI(prompt, "You are a master storyteller and creative genius specializing in generating original, bestselling book concepts.", selectedModel);
        
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

        await customAlert('Unique book idea generated by AI! Review and modify as needed, then click "Generate Book" when ready.', 'Idea Generated');

    } catch (error) {
        await customAlert(`Error generating random idea: ${error.message}`, 'Generation Error');
    } finally {
        randomBtn.innerHTML = originalText;
        randomBtn.disabled = false;
        isGenerating = false;
        hideGenerationInfo();
    }
}

// ==================================================
// BOOK GENERATION FUNCTIONS
// ==================================================

async function startBookGeneration() {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    isGenerating = true;
    showGenerationInfo("Generating story structure...");
    try {
        collectBookData();
    
        if (!bookData.genre || !bookData.targetAudience || !bookData.premise) {
            await customAlert('Please fill in all required fields before generating your book.', 'Missing Information');
            return;
        }

        autoSave();
        showStep('outline');
        generateOutline();
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
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
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    isGenerating = true;
    showGenerationInfo("Generating complete story structure with integrated characters...");
    const outputDiv = document.getElementById('outline-output');
    outputDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Generating complete story structure with integrated characters...</div>';

    try {
        const act1End = Math.ceil(bookData.numChapters * 0.25);
        const act2Start = act1End + 1;
        const act2End = Math.ceil(bookData.numChapters * 0.75);
        const act3Start = act2End + 1;

        const genreReq = genreRequirements[bookData.genre] || { requirements: '', pacing: '' };
        const genreRequirementsText = `${genreReq.requirements}\nPacing: ${genreReq.pacing}`;

        // Get the model for this step
        const selectedModel = getSelectedModel('outline');
        console.log(`Using model for outline: ${selectedModel}`);

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
    } finally {
        isGenerating = false;
        hideGenerationInfo();
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
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    isGenerating = true;
    showGenerationInfo("Creating detailed chapter plan with scene breakdowns...");
    const outputDiv = document.getElementById('chapters-output');
    outputDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Creating detailed chapter plan with scene breakdowns...</div>';

    try {
        // Get the model for chapter planning
        const selectedModel = getSelectedModel('chapters');
        console.log(`Using model for chapters: ${selectedModel}`);
        
        const prompt = formatPrompt(document.getElementById('chapters-prompt').value, {
            outline: bookData.outline,
            genre: bookData.genre,
            targetAudience: bookData.targetAudience,
            numChapters: bookData.numChapters,
            targetWordCount: bookData.targetWordCount
        });

        const chapterOutline = await callAI(prompt, "You are a master storyteller creating detailed chapter breakdowns for commercially successful novels.", selectedModel);
        bookData.chapterOutline = chapterOutline;

        // Generate book title and blurb now that we have the full story structure
        outputDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Generating compelling book title and blurb...</div>';
        
        // Get the model for book title generation
        const titleModel = getSelectedModel('bookTitle');
        console.log(`Using model for bookTitle: ${titleModel}`);
        
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

        // Store title and blurb
        bookData.title = title || extractFirstSentence(bookData.premise);
        bookData.blurb = blurb || bookData.premise;

        outputDiv.innerHTML = `
            <div class="book-title-section">
                <h3>Book Title & Description</h3>
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
    } finally {
        isGenerating = false;
        hideGenerationInfo();
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

// ==================================================
// WRITING INTERFACE
// ==================================================

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
                <span class="label">Select All</span>
            </button>
            <button class="btn btn-ghost btn-sm" onclick="deselectAllChapters()">
                <span class="label">Deselect All</span>
            </button>
            <button class="btn btn-primary btn-sm" onclick="generateSelectedChapters()" id="generate-selected-btn">
                <span class="label">Generate Selected</span>
            </button>
            <button class="btn btn-primary btn-sm" onclick="generateAllChapters()">
                <span class="label">Generate All Chapters</span>
            </button>
        </div>
        <p class="writing-hint">Tip: Generate chapters individually for maximum control, or select multiple chapters to batch process them.</p>
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
                        <span class="label">Generate</span>
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="regenerateChapter(${i})" id="chapter-${i}-regenerate-btn" style="display: none;">
                        <span class="label">Regenerate</span>
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="expandChapter(${i})" id="chapter-${i}-expand-btn" style="display: none;">
                        <span class="label">Expand</span>
                    </button>
                </div>
            </div>
            <div class="chapter-status" id="chapter-${i}-status">Ready to write</div>
            <div class="chapter-content" id="chapter-${i}-content">
                <textarea class="chapter-textarea" id="chapter-${i}-text" placeholder="Chapter content will appear here..." oninput="updateChapterWordCount(${i})"></textarea>
                <div class="chapter-footer">
                    <button class="btn btn-success btn-sm" onclick="editChapter(${i})">
                        <span class="label">Save Edits</span>
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="analyzeChapter(${i})">
                        <span class="label">Analyze</span>
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="runChapterFeedback(${i})">
                        <span class="label">Improve with Feedback</span>
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
        btn.innerHTML = `<span class="label">Generate Selected (${selectedCount})</span>`;
        btn.disabled = false;
    } else {
        btn.innerHTML = '<span class="label">Generate Selected</span>';
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
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    isGenerating = true;
    const statusDiv = document.getElementById('writing-status');
    statusDiv.innerHTML = `Writing Chapter ${chapterNum}...`;
    
    document.getElementById(`chapter-${chapterNum}-status`).innerHTML = '<div class="loading"><div class="spinner"></div>Writing...</div>';
    document.getElementById(`chapter-${chapterNum}-generate-btn`).disabled = true;

    try {
        await writeChapter(chapterNum);
        
        document.getElementById(`chapter-${chapterNum}-status`).innerHTML = 'Complete';
        document.getElementById(`chapter-${chapterNum}-content`).classList.add('active');
        document.getElementById(`chapter-${chapterNum}-generate-btn`).style.display = 'none';
        document.getElementById(`chapter-${chapterNum}-regenerate-btn`).style.display = 'inline-flex';
        document.getElementById(`chapter-${chapterNum}-expand-btn`).style.display = 'inline-flex';
        
        statusDiv.innerHTML = `Chapter ${chapterNum} completed!`;
        updateOverallProgress();
        autoSave();
        
    } catch (error) {
        document.getElementById(`chapter-${chapterNum}-status`).innerHTML = `Error: ${error.message}`;
        document.getElementById(`chapter-${chapterNum}-generate-btn`).disabled = false;
        statusDiv.innerHTML = `Failed to generate Chapter ${chapterNum}`;
    } finally {
        isGenerating = false;
        hideGenerationInfo();
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

        // Get the model for chapter writing
        const selectedModel = getSelectedModel('writing');
        console.log(`Using model for writing chapter ${chapterNum}: ${selectedModel}`);

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
    const confirmed = await customConfirm(`Are you sure you want to regenerate Chapter ${chapterNum}? This will overwrite the current content.`, 'Regenerate Chapter');
    if (!confirmed) return;
    
    bookData.chapters[chapterNum - 1] = null;
    document.getElementById(`chapter-${chapterNum}-content`).classList.remove('active');
    document.getElementById(`chapter-${chapterNum}-regenerate-btn`).style.display = 'none';
    document.getElementById(`chapter-${chapterNum}-expand-btn`).style.display = 'none';
    document.getElementById(`chapter-${chapterNum}-generate-btn`).style.display = 'inline-flex';
    document.getElementById(`chapter-${chapterNum}-generate-btn`).disabled = false;
    
    await generateSingleChapter(chapterNum);
}

async function generateSelectedChapters() {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    isGenerating = true;
    const selectedChapters = getSelectedChapters();
    if (selectedChapters.length === 0) {
        await customAlert('Please select at least one chapter to generate.', 'No Chapters Selected');
        isGenerating = false;
        hideGenerationInfo();
        return;
    }

    const statusDiv = document.getElementById('writing-status');

    try {
        for (let i = 0; i < selectedChapters.length; i++) {
            const chapterNum = selectedChapters[i];
            statusDiv.innerHTML = `Writing Chapter ${chapterNum} (${i + 1} of ${selectedChapters.length})...`;
            
            document.getElementById(`chapter-${chapterNum}-status`).innerHTML = '<div class="loading"><div class="spinner"></div>Writing...</div>';
            document.getElementById(`chapter-${chapterNum}-generate-btn`).disabled = true;
            
            try {
                await writeChapter(chapterNum);
                
                document.getElementById(`chapter-${chapterNum}-status`).innerHTML = 'Complete';
                document.getElementById(`chapter-${chapterNum}-content`).classList.add('active');
                document.getElementById(`chapter-${chapterNum}-generate-btn`).style.display = 'none';
                document.getElementById(`chapter-${chapterNum}-regenerate-btn`).style.display = 'inline-flex';
                document.getElementById(`chapter-${chapterNum}-expand-btn`).style.display = 'inline-flex';
                
                document.getElementById(`chapter-${chapterNum}-checkbox`).checked = false;
                
            } catch (error) {
                document.getElementById(`chapter-${chapterNum}-status`).innerHTML = `Error: ${error.message}`;
                document.getElementById(`chapter-${chapterNum}-generate-btn`).disabled = false;
                statusDiv.innerHTML = `Failed to generate Chapter ${chapterNum}`;
                break;
            }
        }
        
        updateGenerateSelectedButton();
        updateOverallProgress();
        statusDiv.innerHTML = `Selected chapters completed!`;
        autoSave();
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
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
    button.innerHTML = '<span class="label">Saved!</span>';
    button.style.background = 'var(--color-success)';
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = '';
    }, 2000);
    
    autoSave();
}

// ==================================================
// ENHANCED EXPAND MODAL
// ==================================================

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
        saveBtn.innerHTML = '<span class="label">Saved!</span>';
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

// ==================================================
// CHAPTER FEEDBACK SYSTEM
// ==================================================

async function runChapterFeedback(chapterNum) {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    isGenerating = true;
    try {
        const chapter = bookData.chapters[chapterNum - 1];
        if (!chapter) {
            await customAlert('No chapter content to improve. Please generate the chapter first.', 'No Content');
            return;
        }
        
        const feedbackLoops = parseInt(document.getElementById('writing-feedback-loops').value) || 1;
        const feedbackMode = document.getElementById('writing-feedback-mode').value;
        
        // Get manual feedback if in manual mode
        let manualFeedback = '';
        if (feedbackMode === 'manual') {
            manualFeedback = document.getElementById('writing-manual-input').value;
            if (!manualFeedback.trim()) {
                await customAlert('Please provide manual feedback instructions before running the feedback loop.', 'Missing Feedback');
                return;
            }
        }
        
        document.getElementById(`chapter-${chapterNum}-status`).innerHTML = '<div class="loading"><div class="spinner"></div>Running feedback analysis...</div>';
        
        try {
            let improvedChapter = chapter;
            
            // Get the model for feedback
            const feedbackModel = getSelectedModel('feedback');
            console.log(`Using model for chapter feedback: ${feedbackModel}`);
            
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
                    
                    improvedChapter = await callAI(improvementPrompt, "You are a master storyteller and professional editor implementing specific feedback requests.", feedbackModel);
                    
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
                    
                    const analysis = await callAI(analysisPrompt, "You are a professional editor analyzing a book chapter.", feedbackModel);
                    
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
                    
                    improvedChapter = await callAI(improvementPrompt, "You are a master storyteller and professional editor.", feedbackModel);
                }
            }
            
            // Update chapter
            bookData.chapters[chapterNum - 1] = improvedChapter;
            document.getElementById(`chapter-${chapterNum}-text`).value = improvedChapter;
            updateChapterWordCount(chapterNum);
            
            document.getElementById(`chapter-${chapterNum}-status`).innerHTML = `Improved with ${feedbackLoops} ${feedbackMode} feedback loop(s)`;
            autoSave();
            
        } catch (error) {
            document.getElementById(`chapter-${chapterNum}-status`).innerHTML = `Feedback error: ${error.message}`;
        }
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

// ==================================================
// ONE-CLICK GENERATION SYSTEM
// ==================================================

async function startOneClickGeneration() {
    collectBookData();
    
    if (!bookData.genre || !bookData.targetAudience || !bookData.premise) {
        await customAlert('Please fill in all required fields before starting one-click generation.', 'Missing Information');
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
        await customAlert(`One-click generation completed! 

Your book "${bookData.title}" is ready for export!

Final Stats:
â€¢ ${bookData.chapters.filter(c => c).length} chapters completed
â€¢ ${bookData.chapters.filter(c => c).reduce((total, chapter) => total + countWords(chapter), 0).toLocaleString()} total words
â€¢ Ready for publishing!`, 'Generation Complete');
        
    } catch (error) {
        hideLoadingOverlay();
        await customAlert(`One-click generation failed: ${error.message}`, 'Generation Failed');
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

// ==================================================
// EXPORT FUNCTIONS
// ==================================================

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

async function downloadBook(format) {
    if (bookData.chapters.length === 0) {
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

async function copyToClipboard() {
    if (bookData.chapters.length === 0) {
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

// ==================================================
// ANALYTICS
// ==================================================

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
    
    const avgWordsPerSentence = totalSentences > 0 ? Math.round(totalWords / totalSentences) : 0;
    const avgSyllablesPerWord = totalWords > 0 ? Math.round(totalSyllables / totalWords) : 0;
    
    // Flesch-Kincaid readability score (simplified)
    const fleschScore = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
    let readabilityScore = '';
    let readabilityExplanation = '';
    if (fleschScore >= 90) {
        readabilityScore = '5th grade';
        readabilityExplanation = 'Very easy to read';
    } else if (fleschScore >= 80) {
        readabilityScore = '6th-8th grade';
        readabilityExplanation = 'Easy to read';
    } else if (fleschScore >= 70) {
        readabilityScore = '9th-10th grade';
        readabilityExplanation = 'Fairly easy to read';
    } else if (fleschScore >= 60) {
        readabilityScore = '11th-12th grade';
        readabilityExplanation = 'Standard reading';
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
    
    // Update quality analysis
    document.getElementById('quality-analysis').innerHTML = `
        <h4>Book Quality Metrics</h4>
        <ul>
            <li><strong>Readability:</strong> ${readabilityScore} level (${readabilityExplanation})</li>
            <li><strong>Completion Rate:</strong> ${completionRate}% (${completedChapters.length}/${bookData.numChapters} chapters)</li>
            <li><strong>Average Chapter Length:</strong> ${Math.round(totalWords / completedChapters.length)} words</li>
            <li><strong>Writing Style:</strong> ${avgWordsPerSentence} words per sentence</li>
        </ul>
        <p><strong>Overall Assessment:</strong> ${completionRate === 100 ? 'Book ready for publication!' : `${100 - completionRate}% remaining to complete.`}</p>
    `;
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

async function analyzeChapter(chapterNum) {
    const chapter = bookData.chapters[chapterNum - 1];
    if (!chapter) {
        await customAlert('No content to analyze for this chapter.', 'No Content');
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
    
    const analysisText = `Chapter ${chapterNum} Analysis:

Statistics:
â€¢ Word count: ${wordCount}
â€¢ Sentences: ${sentences}
â€¢ Paragraphs: ${paragraphs}
â€¢ Avg sentence length: ${avgSentenceLength} words
â€¢ Estimated dialogue: ${dialogueEstimate}%
â€¢ Reading time: ${readingTime} minutes

Target: ${bookData.targetWordCount} words
${wordCount < bookData.targetWordCount * 0.8 ? 'Below target length' : 
  wordCount > bookData.targetWordCount * 1.2 ? 'Above target length' : 
  'Good length'}`;

    await customAlert(analysisText, 'Chapter Analysis');
}

// ==================================================
// PROJECT MANAGEMENT
// ==================================================

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
        targetWordCount: 4000,
        outline: '',
        chapterOutline: '',
        chapters: [],
        currentStep: 'setup',
        createdAt: new Date().toISOString(),
        lastSaved: new Date().toISOString()
    };
    
    resetEverything();
    await customAlert('New project created!', 'Project Created');
}

async function saveProject() {
    if (!bookData.premise) {
        await customAlert('Please add some content before saving the project.', 'No Content');
        return;
    }
    
    const title = prompt('Enter a title for this project:', bookData.premise.substring(0, 30));
    if (title) {
        bookData.title = title;
        projects[bookData.id] = { ...bookData };
        localStorage.setItem('novelfactory_projects', JSON.stringify(projects));
        updateProjectSelector();
        await customAlert('Project saved successfully!', 'Project Saved');
    }
}

function loadProject() {
    document.getElementById('project-file').click();
}

async function switchProject() {
    const selector = document.getElementById('project-select');
    const projectId = selector.value;
    
    if (projectId === 'current') return;
    
    if (projects[projectId]) {
        if (bookData.premise || bookData.outline) {
            const confirmed = await customConfirm('Loading a project will replace your current work. Continue?', 'Load Project');
            if (!confirmed) {
                selector.value = 'current';
                return;
            }
        }
        
        bookData = { ...projects[projectId] };
        populateFormFields();
        showStep(bookData.currentStep);
        await customAlert('Project loaded successfully!', 'Project Loaded');
    }
}

function importProject(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            bookData = imported;
            populateFormFields();
            showStep(bookData.currentStep);
            await customAlert('Project imported successfully!', 'Project Imported');
        } catch (error) {
            await customAlert('Error importing project: Invalid file format', 'Import Error');
        }
    };
    reader.readAsText(file);
}

// ==================================================
// SETTINGS FUNCTIONS
// ==================================================

async function testApiConnection() {
    const statusDiv = document.getElementById('api-status');
    statusDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Testing connection...</div>';

    try {
        const response = await callAI("Respond with 'Connection successful!' if you can read this message.", "", "");
        statusDiv.innerHTML = '<div class="success">API connection successful!</div>';
    } catch (error) {
        statusDiv.innerHTML = `<div class="error">Connection failed: ${error.message}</div>`;
    }
}

async function resetPrompts() {
    const confirmed = await customConfirm('Are you sure you want to reset all prompts to their default values?', 'Reset Prompts');
    if (confirmed) {
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
        await customAlert('All prompts have been reset to default values.', 'Prompts Reset');
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
                    document.getElementById('outline-prompt').value = settings.prompts.outline || defaultPrompts.outline;
                    document.getElementById('chapters-prompt').value = settings.prompts.chapters || defaultPrompts.chapters;
                    document.getElementById('writing-prompt').value = settings.prompts.writing || defaultPrompts.writing;
                }
                saveSettings();
                await customAlert('Settings imported successfully!', 'Settings Imported');
            } catch (error) {
                await customAlert('Error importing settings: Invalid file format', 'Import Error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Enhanced cost estimation with advanced models support
async function estimateCosts() {
    const numChapters = bookData.numChapters || 20;
    const targetWordCount = bookData.targetWordCount || 4000;
    
    // Estimate tokens per chapter (roughly 1.3x word count)
    const estimatedTokensPerChapter = targetWordCount * 1.3;
    const contextTokensPerChapter = 1500; // Estimated context
    
    // Calculate costs for each step based on selected models
    const steps = {
        outline: { description: 'Story Structure', chapters: 1, multiplier: 3 },
        chapters: { description: 'Chapter Planning', chapters: 1, multiplier: 2 },
        writing: { description: 'Chapter Writing', chapters: numChapters, multiplier: 1 },
        feedback: { description: 'Feedback Loops', chapters: numChapters * 0.5, multiplier: 0.5 },
        randomIdea: { description: 'Random Ideas', chapters: 0.1, multiplier: 0.5 },
        bookTitle: { description: 'Title & Blurb', chapters: 1, multiplier: 1 }
    };
    
    let totalInputCost = 0;
    let totalOutputCost = 0;
    let costBreakdown = '';
    
    Object.entries(steps).forEach(([step, config]) => {
        const selectedModel = getSelectedModel(step);
        const provider = aiSettings.apiProvider || 'openrouter';
        const allModels = [...(apiModels[provider]?.creative || []), ...(apiModels[provider]?.budget || [])];
        const modelInfo = allModels.find(m => m.value === selectedModel);
        
        if (modelInfo && modelInfo.cost) {
            const inputTokens = contextTokensPerChapter * config.chapters * config.multiplier;
            const outputTokens = estimatedTokensPerChapter * config.chapters * config.multiplier;
            
            const stepInputCost = (inputTokens / 1000000) * modelInfo.cost.input;
            const stepOutputCost = (outputTokens / 1000000) * modelInfo.cost.output;
            
            totalInputCost += stepInputCost;
            totalOutputCost += stepOutputCost;
            
            costBreakdown += `\nâ€¢ ${config.description}: ${(stepInputCost + stepOutputCost).toFixed(3)} (${modelInfo.label})`;
        }
    });
    
    const totalCost = totalInputCost + totalOutputCost;
    
    const costText = `Estimated cost for complete book generation:

BREAKDOWN BY STEP:${costBreakdown}

SUMMARY:
â€¢ Input tokens: ${totalInputCost.toFixed(3)}
â€¢ Output tokens: ${totalOutputCost.toFixed(3)}
â€¢ Total estimated: ${totalCost.toFixed(3)}

NOTES:
â€¢ Based on ${numChapters} chapters of ${targetWordCount} words each
â€¢ Uses ${aiSettings.advancedModelsEnabled ? 'advanced model selections' : 'default model for all steps'}
â€¢ Actual costs may vary based on content complexity
â€¢ Feedback loops and regenerations not included

Generated with NovelFactory AI (novelfactory.ink)`;

    await customAlert(costText, 'Cost Estimation');
}

// ==================================================
// RESET FUNCTIONALITY
// ==================================================

async function resetEverything() {
    const confirmed = await customConfirm('Are you sure you want to reset everything and start a new book? This will clear all current progress and cannot be undone.', 'Reset Everything');
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
    
    await customAlert('Everything has been reset! You can now start creating a new book.', 'Reset Complete');
}

// ==================================================
// GENERATION INFO DISPLAY
// ==================================================

function showGenerationInfo(message = "Please wait until the current step is finished.") {
    const indicator = document.getElementById('generation-indicator');
    const title = document.getElementById('generation-title');
    const description = document.getElementById('generation-description');
    
    if (indicator && title && description) {
        title.textContent = "AI Generation in Progress";
        description.textContent = message;
        indicator.style.display = 'block';
    }
    isGenerating = true;
}

function hideGenerationInfo() {
    const indicator = document.getElementById('generation-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
    isGenerating = false;
}

// ==================================================
// ENHANCED INITIALIZATION
// ==================================================

// Enhanced initializeApp function
function initializeApp() {
    loadSettings();
    loadProjects();
    setupEventListeners();
    initializePrompts();
    setupAutoSave();
    setupKeyboardShortcuts();
    setupAdvancedModelListeners(); // Add advanced model listeners
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
    
    // Initialize advanced models section state
    initializeAdvancedModelsSection();
}

// ==================================================
// DEBOUNCE FUNCTION
// ==================================================

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

// ==================================================
// CSS INJECTION FOR ADVANCED MODELS
// ==================================================

const additionalCSS = `
/* Advanced Models Visual States */
.advanced-models-section.active {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 1px rgba(0, 122, 255, 0.1);
}

.advanced-models-section.collapsed .advanced-models-grid,
.advanced-models-section.collapsed .advanced-models-actions {
    display: none;
}

.advanced-models-section .toggle-icon {
    transition: transform 0.3s ease;
    font-size: 0.8em;
    color: var(--text-secondary);
}

.advanced-models-section.collapsed .toggle-icon {
    transform: rotate(-90deg);
}

.advanced-models-header {
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s ease;
    border-radius: var(--radius-sm);
    padding: var(--spacing-sm);
    margin: calc(-1 * var(--spacing-sm));
}

.advanced-models-header:hover {
    background-color: var(--bg-secondary);
}

.advanced-models-toggle {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.model-setting label {
    transition: color 0.3s ease, font-weight 0.3s ease;
}

.model-setting select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Toggle Switch Styles */
.toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
}

.toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--border-primary);
    transition: 0.3s;
    border-radius: 24px;
}

.slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.toggle-switch input:checked + .slider {
    background-color: var(--color-primary);
}

.toggle-switch input:checked + .slider:before {
    transform: translateX(20px);
}

.toggle-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-weight: 500;
}
`;

// Function to inject additional CSS
function injectAdvancedModelsCSS() {
    const style = document.createElement('style');
    style.textContent = additionalCSS;
    document.head.appendChild(style);
}

// ==================================================
// INITIALIZATION
// ==================================================

// Initialize expand textarea word count tracking
document.addEventListener('DOMContentLoaded', function() {
    const expandTextarea = document.getElementById('expand-textarea');
    if (expandTextarea) {
        expandTextarea.addEventListener('input', updateExpandedWordCount);
    }
    
    // Custom donation amount handling
    const customAmountInput = document.getElementById('custom-donation-amount');
    if (customAmountInput) {
        customAmountInput.addEventListener('input', function() {
            if (this.value) {
                // Clear selection from preset amounts
                document.querySelectorAll('.donation-amount').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                // Update donate button
                document.getElementById('donate-btn').innerHTML = `<span class="label">Donate ${this.value}</span>`;
                selectedDonationAmount = parseFloat(this.value);
            }
        });
    }
    
    // Inject CSS and initialize the app
    injectAdvancedModelsCSS();
    initializeApp();
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
        customAlert('An unexpected error occurred. Please try again.', 'Error');
    }
});

// Handle network errors gracefully
window.addEventListener('online', function() {
    console.log('Connection restored');
});

window.addEventListener('offline', function() {
    customAlert('You appear to be offline. Some features may not work until connection is restored.', 'Connection Issue');
});

// Development helpers (remove in production)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.bookData = bookData;
    window.aiSettings = aiSettings;
    window.themes = themes;
    console.log('Development mode: Global variables exposed for debugging');
}

// Console welcome message
console.log(`
NovelFactory AI - Professional Edition with Advanced Model Selection
https://novelfactory.ink

âœ… Fixed Issues:
â€¢ Advanced model selection priority system working
â€¢ Auto-save for all model selections (no save button needed)
â€¢ Model validation when switching API providers
â€¢ Visual feedback for selected models
â€¢ Proper cost estimation with step-specific models

âœ… Enhanced Features:
â€¢ Debounced auto-save for better performance
â€¢ Visual state management for advanced models
â€¢ Enhanced error handling and validation
â€¢ Step-specific model selection working correctly

Happy writing!
`);

console.log('âœ“ NovelFactory AI initialized with enhanced model 