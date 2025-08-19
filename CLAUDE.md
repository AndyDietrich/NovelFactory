# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NovelFactory is a client-side web application that generates complete books using AI. It's a single-page application built with vanilla HTML, CSS, and JavaScript that runs entirely in the browser with no backend services.

**Live Website:** https://novelfactory.ink

## Architecture

### Core Files Structure
```
├── index.html          # Single-page application entry point
├── script.js           # Main application logic (~4000+ lines)
├── styles.css          # Complete styling with theme system
├── favicon.ico         # Application icon
├── robots.txt          # SEO directives
├── CNAME              # GitHub Pages custom domain
└── README.md          # User documentation
```

### Application State Architecture

**Global State Variables (script.js:1-80):**
- `CONFIG` - Application configuration constants (version, auto-save interval, max projects)
- `bookData` - Current book project state with all book details and chapters
- `aiSettings` - API configuration, model selection, and custom prompts
- `projects` - All saved projects management
- `undoStack`/`redoStack` - Undo/redo system with 50-state history

**State Persistence:**
- All data stored in browser localStorage only
- Auto-save every 30 seconds via `saveToLocalStorage()`
- Maximum 10 saved projects (configurable in CONFIG)
- No cloud sync or external storage

### Core System Architecture

**Custom UI System:**
- Custom modal/alert system replaces native browser dialogs
- Tab-based navigation (Setup → Outline → Chapters → Writing → Export)
- Three complete themes (light/dark/color) with CSS custom properties
- Responsive design with mobile-first approach

**AI Generation Pipeline:**
- Multi-step book generation: Setup → Story Structure → Chapter Planning → Writing
- Async/await pattern for all AI API calls
- Feedback loop system for iterative content improvement
- One-click automated generation option

## Development Commands

### Testing
```bash
# Manual testing - open in browser
open index.html

# Or start local server for testing
python -m http.server 8000
# Then visit: http://localhost:8000
```

### Deployment
```bash
# No build required - static files only
# Deploy by uploading files to any static hosting
```

**Note:** This project intentionally has no build system, package.json, or dependency management. All development is direct file editing.

## Key Functions & Critical Components

### State Management System
**Location:** script.js:1-80
- `saveToLocalStorage()` - Auto-save with 30-second intervals
- `loadProjects()` - Load all saved projects from localStorage
- Undo/redo system with `undoStack`/`redoStack` (50-state max)

### AI Generation Pipeline
**Core generation functions (all async/await pattern):**
- `generateOutline()` - Creates story structure and narrative framework
- `generateChapterOutline()` - Detailed chapter-by-chapter breakdown
- `generateChapter()` - Individual chapter content generation
- `improveContent()` - Feedback loop system for quality enhancement
- `generateOneClick()` - Fully automated book creation workflow

### Custom UI Framework
**Modal/Alert System (script.js:~80-200):**
- `customAlert()`, `customConfirm()`, `customInput()` - Replace browser dialogs
- Promise-based with callback system
- Fully themed and responsive

**Theme System:**
- `switchTheme()` - Handles light/dark/color theme switching
- CSS custom properties for dynamic theming
- Theme persistence in localStorage

### API Integration Architecture
**Supported Providers:**
- OpenRouter (primary) - Multi-model access
- OpenAI (direct) - GPT models only

**Key Configuration:**
- `aiSettings` object contains all API configurations
- `testApiConnection()` - Validates API keys and model access
- Temperature, max tokens, and model selection per provider

## Code Architecture Patterns

### JavaScript Structure
- **Global state pattern**: All state in global variables at file top
- **Async/await throughout**: No callback hell, clean error handling  
- **localStorage as database**: No external persistence layer
- **Custom event system**: Direct DOM manipulation, no framework events
- **Modular functions**: Each major feature encapsulated in focused functions

### CSS Architecture  
- **CSS Custom Properties**: `--primary-color`, `--background-color` etc for theming
- **Three complete themes**: Light, dark, color variants all fully defined
- **Component-based classes**: `.tab`, `.button`, `.modal` etc with BEM-like naming
- **Mobile-first responsive**: Min-width media queries, flex/grid layouts

## Critical Implementation Details

### Data Flow Architecture
1. **User Input** → Global state variables (`bookData`, `aiSettings`)
2. **Auto-save** → localStorage every 30 seconds
3. **AI Generation** → API calls via fetch() with error handling
4. **UI Updates** → Direct DOM manipulation, no virtual DOM
5. **Theme Changes** → CSS custom property updates

### Security & Storage
- **Client-side only**: No backend, all processing in browser
- **API keys**: Stored in localStorage, never transmitted to other services
- **Data persistence**: Browser localStorage only, no cloud sync
- **Privacy**: No external analytics beyond Google Analytics for traffic

### Browser Requirements
- **ES6+ support**: Uses modern JavaScript features extensively
- **Required APIs**: Fetch API, localStorage, CSS Grid/Flexbox
- **No polyfills**: Assumes modern browser environment
- **Responsive**: Mobile-first design, works on all screen sizes

## Development Workflow Notes

### When Adding Features
1. **State first**: Update relevant global state objects (`bookData`, `aiSettings`, etc.)
2. **UI updates**: Modify index.html structure if needed
3. **Styling**: Update styles.css, ensure all three themes work
4. **JavaScript**: Add event handlers and logic to script.js
5. **Test manually**: Open in browser, test all themes and screen sizes

### When Modifying AI Integration
- All AI models configured in `apiModels` object in script.js
- Test new models using built-in "Test Connection" feature
- Consider cost implications (shown in UI cost estimates)
- Maintain backward compatibility with existing saved projects

### Theme System Implementation
- Three complete theme definitions in styles.css using CSS custom properties
- Theme switching via `switchTheme()` function updates CSS variables
- All UI components must work across all three themes
- Test theme switching during development