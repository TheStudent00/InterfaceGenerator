# Visual App Builder v73.0

A visual, no-code environment for creating interactive 2D layouts with drag-and-drop functionality, featuring a robust branching history system.

## Current Status

**Version**: v73.0 (Scene Graph Architecture)
**Stability**: Stable
**Architecture Status**:
- ✅ ES Modules with MVC pattern (Migration Step 2)
- ✅ Scene Graph with localTransform/worldTransform (Complete!)

## Quick Start

⚠️ **Important**: This application uses ES Modules and **requires a local web server**. You cannot open `index.html` directly (double-click) due to CORS restrictions.

### Run with Python (Recommended)

```bash
# Navigate to the project folder
cd /path/to/InterfaceGenerator

# Start a local server
python3 -m http.server 8000

# Open in browser: http://localhost:8000
```

### Alternative: Using npm

```bash
npm start
# Opens http://localhost:8000
```

### Alternative: Other Servers

```bash
# Using Node.js http-server
npx http-server -p 8000

# Using PHP
php -S localhost:8000

# Using Ruby
ruby -run -ehttpd . -p8000
```

**Browser Support**: Chrome, Firefox, Safari, Edge (modern versions)

## Project Structure

```
InterfaceGenerator/
├── index.html                 # Main HTML structure
├── style.css                  # All application styles
├── src/                       # ES Module source files
│   ├── main.js               # Application entry point
│   ├── AppState.js           # State management controller (Model)
│   ├── UIManager.js          # View and interaction handler (View)
│   ├── HistoryManager.js     # 2D branching history system (Service)
│   └── Instance.js           # Data model for canvas objects (Model)
├── app.js                     # Legacy: Pre-ES Module version
├── visual-app-builder.html   # Legacy: Original single-file version
└── README.md                  # This file
```

## Features

### Core Functionality
- **Drag & Drop**: Create objects by dragging from the legend panel
- **Multi-Selection**: Click + Shift or use marquee selection
- **Positioning Modes**: Switch between relative (%) and absolute (px) positioning
- **Anchor Objects**: Lock objects to prevent movement
- **Context Menu**: Right-click on objects for quick actions

### History System
- **Branching History**: Full 2D history grid with timeline branches
- **Undo/Redo**: Navigate through your changes
- **History Visualization**: Visual grid showing all branches and states
- **Save/Load**: Export and import project states as JSON

### Export
- Export your canvas as a standalone HTML file with interactive objects

## Development Roadmap

### ✅ Completed: Migration Step 1 (De-blob)
- [x] De-blobbed from single-file to multi-file architecture
- [x] Separated HTML, CSS, and JavaScript
- [x] Improved debugging experience (correct line numbers)
- [x] Better syntax highlighting and editing

### ✅ Completed: Migration Step 2 (ES Modules)
- [x] Converted to ES Module architecture with `type="module"`
- [x] Created modular class-based structure (MVC pattern)
- [x] **Instance.js**: Pure data model for canvas objects
- [x] **AppState.js**: Single source of truth, state management controller
- [x] **HistoryManager.js**: Isolated 2D branching history service
- [x] **UIManager.js**: View layer handling all DOM and user interactions
- [x] **main.js**: Application initialization and bootstrap

**Benefits Achieved:**
- ✅ Clean separation of concerns (MVC pattern)
- ✅ Explicit module dependencies
- ✅ Better code organization and maintainability
- ✅ Easier testing (isolated components)
- ✅ Scalable architecture for future features

### 🔮 Future: Migration Step 3 (Build System)
Set up Vite for modern development workflow:
- Live reload development server
- Build/bundle for production
- npm package management
- Minification and optimization

### ✅ Completed: Scene Graph Refactor
The scene graph architecture is now fully implemented!

**What Changed:**
- ✅ **localTransform**: Instances now store position relative to their parent (not canvas)
- ✅ **worldTransform**: Computed absolute position on canvas (cached for performance)
- ✅ **updateWorldTransforms()**: Recursive scene graph traversal from roots to leaves
- ✅ **updateInstancePosition()**: Converts world coordinates to local space automatically
- ✅ **renderInstance()**: Uses worldTransform for rendering
- ✅ **setParent()**: Preserves world position when changing parent relationships
- ✅ **Backward compatibility**: Can load old saves from pre-scene-graph versions

**How It Works:**
```
Root Object (no parent)
  localTransform: (100, 50)
  worldTransform: (100, 50)  ← local = world for roots
  └─ Child Object
      localTransform: (20, 30)  ← relative to parent
      worldTransform: (120, 80)  ← computed: parent.world + local
```

**Key Benefits:**
- 🎯 **True hierarchical transforms**: Children automatically follow parents
- 🚀 **No delta calculations**: Position updates are clean and predictable
- 🔧 **Foundation for PBD**: Scene graph enables relationship-based programming
- ✨ **Intuitive parenting**: Objects maintain visual position when changing parents

### 🌟 Long-Term Vision: Programming by Demonstration
With the scene graph complete, the foundation is set for PBD features:

1. **Action Logger**: Record user actions with abstract predicates
2. **Generalization Engine**: Infer rules from demonstrated patterns
3. **Macro Editor**: UI for viewing and editing generated programs

## Architecture

### Current (v73.0 - ES Modules MVC)

The application follows a clean Model-View-Controller (MVC) pattern with ES Modules:

**Model:**
- **Instance.js**: Pure data class representing canvas objects with positioning, hierarchy, and state
- **AppState.js**: Single source of truth managing the collection of instances and selection state

**View:**
- **UIManager.js**: Handles all DOM manipulation, rendering, and user event processing

**Service:**
- **HistoryManager.js**: Isolated 2D branching history system with state capture/restore

**Controller:**
- **main.js**: Application bootstrap and initialization

### Data Flow (Unidirectional)
```
User Action (mousedown/mousemove/mouseup)
    ↓
UIManager.handleEvent()
    ↓
AppState.methodCall() (e.g., updateInstancePosition)
    ↓
AppState.saveToHistory('Action Name')
    ↓
AppState.notifyChange() → UIManager.renderCanvas()
    ↓
UIManager renders instances from AppState
```

### Key Architectural Principles
1. **Single Source of Truth**: AppState holds all application data
2. **Unidirectional Data Flow**: State changes flow down, events flow up
3. **Separation of Concerns**: Clear boundaries between Model, View, and Services
4. **Observer Pattern**: AppState notifies listeners (UIManager) of changes
5. **Immutable History**: HistoryManager captures deep clones of state

## Known Issues & Notes

- **Scene Graph is Live**: Parent-child relationships now use true hierarchical transforms
- Backward compatibility maintained: can load saves from pre-scene-graph versions
- Ready for advanced features like spatial queries and PBD macro recording

## Migration Benefits

### Before (Single-file Blob)
- ❌ Incorrect line numbers in debugger
- ❌ No syntax highlighting for embedded code
- ❌ Difficult to edit and maintain
- ❌ Hard to collaborate on

### After (De-blobbed Multi-file)
- ✅ Accurate debugging with correct line numbers
- ✅ Full IDE support (syntax highlighting, autocomplete)
- ✅ Easy to read and modify
- ✅ Git-friendly (meaningful diffs)

## Contributing

This project follows a structured migration path. Before adding new features:

1. Complete the ES Modules migration (Step 2)
2. Set up the build system (Step 3)
3. Implement the scene graph refactor
4. Then add new features on the solid foundation

## License

See COPYING.txt for license information.

## Version History

- **v73.0** - Complete architecture modernization
  - Migration Step 1: De-blobbed to multi-file structure
  - Migration Step 2: ES Module architecture with MVC pattern
  - **Scene Graph**: Full localTransform/worldTransform implementation
    - True hierarchical parent-child relationships
    - Automatic world transform computation
    - Parent-relative local coordinates
- Previous versions used single-file blob loading via VirtualAssetLoader

---

**Next Step**: Set up Vite build system (Migration Step 3) or begin PBD action logger.
