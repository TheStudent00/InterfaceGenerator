# Visual App Builder v73.0

A visual, no-code environment for creating interactive 2D layouts with drag-and-drop functionality, featuring a robust branching history system.

## Current Status

**Version**: v73.0 (De-blobbed Architecture)
**Stability**: Stable
**Migration Status**: Step 1 Complete (Multi-file structure)

## Quick Start

Simply open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge).

```bash
# Using a simple HTTP server (recommended)
python3 -m http.server 8000
# Then open http://localhost:8000
```

## Project Structure

```
InterfaceGenerator/
├── index.html              # Main HTML structure
├── style.css              # All application styles
├── app.js                 # Complete application logic
├── visual-app-builder.html  # Original single-file version (v73.0 backup)
└── README.md              # This file
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

### ✅ Completed: Migration Step 1
- [x] De-blobbed from single-file to multi-file architecture
- [x] Separated HTML, CSS, and JavaScript
- [x] Improved debugging experience (correct line numbers)
- [x] Better syntax highlighting and editing

### 🚧 Next: Migration Step 2 (ES Modules)
Convert to modern ES module architecture:

**Create module files:**
```
src/
├── Instance.js         # Data model class
├── AppState.js        # State management controller
├── HistoryManager.js  # History system
├── UIManager.js       # View/DOM management
└── main.js           # Application entry point
```

**Benefits:**
- Clean separation of concerns
- Explicit dependencies
- Better code organization
- Easier testing and maintenance

### 🔮 Future: Migration Step 3 (Build System)
Set up Vite for modern development workflow:
- Live reload development server
- Build/bundle for production
- npm package management
- Minification and optimization

### 🎯 Strategic Goal: Scene Graph Refactor
Current v73.0 is Step 1 of 2 for the scene graph architecture:

**Completed:**
- ✅ Migrated data model to `parentId` / `children[]` hierarchy

**Next (Critical):**
- [ ] Implement `localTransform` (parent-relative coordinates)
- [ ] Add `worldTransform` computation (recursive canvas position)
- [ ] Create `updateWorldTransforms()` traversal function
- [ ] Refactor `updateInstancePosition()` to use local coordinates
- [ ] Update `renderInstance()` to use world transforms

### 🌟 Long-Term Vision: Programming by Demonstration
Once the scene graph is complete, build towards a PBD (Programming by Demonstration) system:

1. **Action Logger**: Record user actions with abstract predicates
2. **Generalization Engine**: Infer rules from demonstrated patterns
3. **Macro Editor**: UI for viewing and editing generated programs

## Architecture

### Current (v73.0 - De-blobbed)
- **Instance**: Data-only model for canvas objects
- **HistoryManager**: 2D branching history system with state capture/restore
- **Event Handlers**: Direct DOM manipulation and state updates
- **Unidirectional Flow**: User Interaction → State Change → History → Re-render

### Data Flow
```
User Action (mousedown/mousemove/mouseup)
    ↓
Event Handler (UIManager)
    ↓
State Update (mutate DOM)
    ↓
History.addState('Action Name')
    ↓
Re-render UI
```

## Known Issues & Notes

- The current positioning system is still **delta-based** (canvas-relative)
- Parent-child relationships exist in data but use delta movement, not true hierarchy
- Scene graph refactor (Step 2) required before advanced features

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

- **v73.0** - Scene graph data model refactor (Step 1) + De-blobbed architecture
- Previous versions used single-file blob loading via VirtualAssetLoader

---

**Next Step**: Convert to ES Modules architecture for better code organization.
