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
└── robots.txt          # SEO directives
```

### Key Application Components

**State Management:**
- `bookData` - Global state for current book project
- `aiSettings` - API configuration and model settings
- `projects` - Saved project management
- All data persisted in browser localStorage

**Core Modules (in script.js):**
- Custom alert/dialog system (replaces native browser dialogs)
- AI API integration (OpenRouter & OpenAI)
- Book generation pipeline (Setup → Outline → Chapters → Writing → Export)
- Theme management (Light/Dark/Color themes)
- Project save/load system
- Auto-save functionality

**AI Integration:**
- Supports OpenRouter (primary) and OpenAI APIs
- Models: Claude Sonnet 4, GPT-5, Gemini 2.5 Pro, and others
- Custom prompt system with genre-specific requirements
- Feedback loop system for iterative improvement

## Development Workflow

### No Build System
This is a static web application with no build process, package.json, or dependency management. Development is direct file editing.

### Testing
- **Manual Testing**: Open index.html in browser
- **API Testing**: Use built-in "Test Connection" feature in Settings tab
- **Cross-browser**: Test in Chrome, Firefox, Safari, Edge

### Deployment
- Static file hosting (currently on GitHub Pages)
- No compilation or bundling required
- Direct file upload to web server

## Code Conventions

### JavaScript Patterns
- Global state variables at top of script.js
- Extensive use of async/await for AI API calls
- Custom event handling and DOM manipulation
- localStorage for all persistence
- Extensive inline documentation

### CSS Architecture
- CSS Custom Properties (CSS Variables) for theming
- Three complete theme definitions (light/dark/color)
- Mobile-first responsive design
- Component-based styling approach

### HTML Structure
- Single index.html with all UI components
- Tab-based navigation system
- Extensive use of data attributes for state management
- Semantic HTML with accessibility considerations

## Key Functions & Components

### Critical State Functions (script.js)
- `saveToLocalStorage()` - Auto-save functionality
- `loadProject()` / `saveProject()` - Project management
- `switchTheme()` - Theme switching system
- `testApiConnection()` - API validation

### AI Generation Pipeline
- `generateOutline()` - Story structure generation
- `generateChapterOutline()` - Chapter planning
- `generateChapter()` - Individual chapter writing
- `improveContent()` - Feedback loop system
- `generateOneClick()` - Automated full book generation

### UI Management
- Custom modal system (alerts, confirmations, inputs)
- Tab switching and step progression
- Dynamic content rendering
- Export functionality (TXT, HTML, Markdown)

## Important Notes

### API Security
- API keys stored in localStorage (client-side only)
- No server-side API key storage or proxying
- Direct API calls from browser to AI providers

### Browser Compatibility
- Requires modern browser with ES6+ support
- Uses Fetch API, localStorage, CSS Grid/Flexbox
- No polyfills or fallbacks included

### Content Management
- Maximum 10 saved projects (configurable in CONFIG)
- Auto-save every 30 seconds
- Export capabilities to multiple formats
- No cloud sync - all data local to browser

## Common Development Tasks

### Adding New AI Models
1. Update `apiModels` object in script.js
2. Add model-specific configuration if needed
3. Test API connection functionality

### Theme Modifications
1. Update CSS custom properties in styles.css
2. Ensure all three themes (light/dark/color) are updated
3. Test theme switching functionality

### Adding New Genres
1. Update `genreRequirements` object in script.js
2. Add genre-specific prompts and requirements
3. Test generation with new genre

### UI Changes
1. Modify index.html for structure changes
2. Update corresponding CSS in styles.css
3. Add JavaScript event handlers if needed
4. Test across all themes and screen sizes