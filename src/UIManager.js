/**
 * UIManager - View and User Interaction Handler
 *
 * Manages all DOM manipulation and user interactions.
 * Responsibilities:
 * - Rendering canvas objects from AppState
 * - Handling user events (mouse, drag & drop)
 * - Managing UI elements (buttons, modals, context menu)
 * - Updating UI based on state changes
 */
export class UIManager {
    constructor(appState) {
        this.state = appState;

        // DOM element references
        this.canvas = document.getElementById('canvas');
        this.legendSquare = document.getElementById('square-legend');
        this.contextMenu = document.getElementById('contextMenu');
        this.historyModal = document.getElementById('historyModal');
        this.historyGridContainer = document.getElementById('history-grid-container');

        // Button references
        this.undoBtn = document.getElementById('undoBtn');
        this.redoBtn = document.getElementById('redoBtn');
        this.globalDeleteBtn = document.getElementById('globalDeleteBtn');
        this.historyBtn = document.getElementById('historyBtn');
        this.closeHistoryBtn = document.getElementById('closeHistoryBtn');
        this.saveBtn = document.getElementById('saveBtn');
        this.loadBtn = document.getElementById('loadBtn');
        this.loadFile = document.getElementById('loadFile');
        this.exportBtn = document.getElementById('exportBtn');

        // Interaction state
        this.activeObject = null; // Object with context menu open
        this.isDragging = false;
        this.isMarqueeSelecting = false;
        this.marqueeBox = null;
        this.marqueeStart = { x: 0, y: 0 };
        this.dragData = {
            element: null,
            instanceId: null,
            startX: 0,
            startY: 0,
            offsetX: 0,
            offsetY: 0,
            hasDragged: false
        };

        this.setupEventListeners();
        this.setupStateListeners();
        this.renderCanvas();
        this.updateHistoryButtons();
    }

    /**
     * Set up all event listeners for user interactions
     */
    setupEventListeners() {
        // Legend drag start
        this.legendSquare.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', 'square');
        });

        // Canvas drag & drop
        this.canvas.addEventListener('dragover', (e) => e.preventDefault());
        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const canvasRect = this.canvas.getBoundingClientRect();
            const x = e.clientX - canvasRect.left;
            const y = e.clientY - canvasRect.top;
            this.state.createInstance(x, y);
            this.state.saveToHistory('Create Object');
        });

        // Canvas mouse interactions
        this.canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleDocumentMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleDocumentMouseUp(e));

        // Context menu
        this.canvas.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        this.contextMenu.addEventListener('click', (e) => this.handleContextMenuClick(e));
        document.addEventListener('click', (e) => this.handleDocumentClick(e));

        // Buttons
        this.undoBtn.addEventListener('click', () => this.state.history.undo());
        this.redoBtn.addEventListener('click', () => this.state.history.redo());
        this.globalDeleteBtn.addEventListener('click', () => this.handleGlobalDelete());
        this.historyBtn.addEventListener('click', () => this.showHistoryModal());
        this.closeHistoryBtn.addEventListener('click', () => this.hideHistoryModal());
        this.historyModal.addEventListener('click', (e) => {
            if (e.target === this.historyModal) this.hideHistoryModal();
        });

        // Save/Load/Export
        this.saveBtn.addEventListener('click', () => this.handleSave());
        this.loadBtn.addEventListener('click', () => this.loadFile.click());
        this.loadFile.addEventListener('change', (e) => this.handleLoad(e));
        this.exportBtn.addEventListener('click', () => this.handleExport());
    }

    /**
     * Set up listeners for state changes
     */
    setupStateListeners() {
        this.state.onChange(() => {
            this.renderCanvas();
        });

        this.state.onSelectionChange(() => {
            this.updateSelectionUI();
        });

        this.state.history.onChange(() => {
            this.updateHistoryButtons();
        });
    }

    /**
     * Handle mousedown on canvas (start drag or marquee select)
     */
    handleCanvasMouseDown(e) {
        const target = e.target;

        // Marquee selection (clicked on canvas background)
        if (target === this.canvas) {
            this.isMarqueeSelecting = true;
            const canvasRect = this.canvas.getBoundingClientRect();
            this.marqueeStart.x = e.clientX - canvasRect.left;
            this.marqueeStart.y = e.clientY - canvasRect.top;

            this.marqueeBox = document.createElement('div');
            this.marqueeBox.id = 'selection-box';
            this.canvas.appendChild(this.marqueeBox);

            if (!e.shiftKey) {
                this.state.clearSelection();
            }
            return;
        }

        // Object drag (clicked on an object)
        if (target.classList.contains('canvas-object')) {
            const instanceId = target.dataset.instanceId;
            const instance = this.state.getInstance(instanceId);

            if (!instance || instance.anchored) return;

            this.isDragging = true;
            const objRect = target.getBoundingClientRect();
            this.dragData = {
                element: target,
                instanceId: instanceId,
                startX: e.clientX,
                startY: e.clientY,
                offsetX: e.clientX - objRect.left,
                offsetY: e.clientY - objRect.top,
                hasDragged: false
            };

            if (!e.shiftKey && !this.state.isSelected(instanceId)) {
                this.state.selectInstance(instanceId);
            }
            e.preventDefault();
        }
    }

    /**
     * Handle mousemove on document (drag or marquee select)
     */
    handleDocumentMouseMove(e) {
        // Marquee selection
        if (this.isMarqueeSelecting) {
            const canvasRect = this.canvas.getBoundingClientRect();
            const currentX = e.clientX - canvasRect.left;
            const currentY = e.clientY - canvasRect.top;
            const left = Math.min(this.marqueeStart.x, currentX);
            const top = Math.min(this.marqueeStart.y, currentY);
            const width = Math.abs(this.marqueeStart.x - currentX);
            const height = Math.abs(this.marqueeStart.y - currentY);
            this.marqueeBox.style.cssText = `left:${left}px; top:${top}px; width:${width}px; height:${height}px;`;
            return;
        }

        // Object drag
        if (!this.isDragging || !this.dragData.element) return;

        const dist = Math.hypot(e.clientX - this.dragData.startX, e.clientY - this.dragData.startY);
        if (dist > 5) {
            this.dragData.hasDragged = true;
        }

        if (this.dragData.hasDragged) {
            const canvasRect = this.canvas.getBoundingClientRect();
            let x = e.clientX - canvasRect.left - this.dragData.offsetX;
            let y = e.clientY - canvasRect.top - this.dragData.offsetY;

            const element = this.dragData.element;
            x = Math.max(0, Math.min(x, canvasRect.width - element.offsetWidth));
            y = Math.max(0, Math.min(y, canvasRect.height - element.offsetHeight));

            // Update state
            this.state.updateInstancePosition(this.dragData.instanceId, x, y);
        }
    }

    /**
     * Handle mouseup on document (end drag or marquee select)
     */
    handleDocumentMouseUp(e) {
        // End marquee selection
        if (this.isMarqueeSelecting) {
            const marqueeRect = this.marqueeBox.getBoundingClientRect();
            let selectionChanged = false;

            this.canvas.querySelectorAll('.canvas-object').forEach(obj => {
                const objRect = obj.getBoundingClientRect();
                const intersects = !(
                    marqueeRect.right < objRect.left ||
                    marqueeRect.left > objRect.right ||
                    marqueeRect.bottom < objRect.top ||
                    marqueeRect.top > objRect.bottom
                );

                if (intersects) {
                    const instanceId = obj.dataset.instanceId;
                    if (!this.state.isSelected(instanceId)) {
                        this.state.addToSelection(instanceId);
                        selectionChanged = true;
                    }
                }
            });

            this.marqueeBox.remove();
            this.isMarqueeSelecting = false;
            this.marqueeBox = null;

            if (selectionChanged) {
                this.state.saveToHistory('Marquee Select');
            }
            return;
        }

        // End object drag
        if (this.isDragging && this.dragData.element) {
            if (this.dragData.hasDragged) {
                this.state.saveToHistory('Move Object');
            } else {
                // It was a click, not a drag
                const instanceId = this.dragData.instanceId;
                if (e.shiftKey) {
                    this.state.toggleSelection(instanceId);
                } else {
                    this.state.selectInstance(instanceId);
                }
                this.state.saveToHistory('Select Object');
            }
        }

        this.isDragging = false;
        this.dragData = {
            element: null,
            instanceId: null,
            startX: 0,
            startY: 0,
            offsetX: 0,
            offsetY: 0,
            hasDragged: false
        };
    }

    /**
     * Handle right-click context menu
     */
    handleContextMenu(e) {
        if (e.target.classList.contains('canvas-object')) {
            e.preventDefault();
            const instanceId = e.target.dataset.instanceId;
            this.activeObject = this.state.getInstance(instanceId);

            if (!this.activeObject) return;

            this.updateContextMenuState();
            this.contextMenu.style.display = 'block';
            this.contextMenu.style.left = `${e.pageX}px`;
            this.contextMenu.style.top = `${e.pageY}px`;
        }
    }

    /**
     * Handle clicks on context menu items
     */
    handleContextMenuClick(e) {
        if (!this.activeObject) return;

        const button = e.target.closest('button');
        if (!button) return;

        let action = '';

        if (button.dataset.mode) {
            const mode = button.dataset.mode;
            const value = button.dataset.value;

            if (mode === 'h') {
                this.state.updateInstanceMode(this.activeObject.id, 'h', value);
                action = `Set H Mode: ${value}`;
            } else if (mode === 'v') {
                this.state.updateInstanceMode(this.activeObject.id, 'v', value);
                action = `Set V Mode: ${value}`;
            }
        } else if (button.id === 'toggleAnchor') {
            const newState = this.state.toggleAnchor(this.activeObject.id);
            action = newState ? `Anchor ${this.activeObject.id}` : `Un-anchor ${this.activeObject.id}`;
        } else if (button.id === 'deleteBtn') {
            action = `Delete ${this.activeObject.id}`;
            this.state.deleteInstance(this.activeObject.id);
        }

        this.contextMenu.style.display = 'none';
        if (action) {
            this.state.saveToHistory(action);
        }
        this.activeObject = null;
    }

    /**
     * Handle clicks outside context menu
     */
    handleDocumentClick(e) {
        if (!this.contextMenu.contains(e.target) && !e.target.closest('.canvas-object')) {
            this.contextMenu.style.display = 'none';
            this.activeObject = null;
        }

        if (e.target === this.canvas) {
            this.state.clearSelection();
            this.state.saveToHistory('Deselect all');
        }
    }

    /**
     * Update context menu checkmarks based on active object
     */
    updateContextMenuState() {
        if (!this.activeObject) return;

        const { modeH, modeV } = this.activeObject.positioning;
        const { anchored } = this.activeObject;

        this.contextMenu.querySelectorAll('button[data-mode]').forEach(btn => {
            const { mode, value } = btn.dataset;
            const shouldShow = (mode === 'h' && value === modeH) || (mode === 'v' && value === modeV);
            btn.querySelector('.check-icon').classList.toggle('visible', shouldShow);
        });

        const anchorButton = document.getElementById('toggleAnchor');
        anchorButton.querySelector('.check-icon').classList.toggle('visible', anchored);
        anchorButton.querySelector('#anchor-text').textContent = anchored ? 'Un-anchor Object' : 'Anchor Object';
    }

    /**
     * Handle global delete button
     */
    handleGlobalDelete() {
        const count = this.state.selectedIds.size;
        if (count > 0) {
            this.state.deleteInstances([...this.state.selectedIds]);
            this.state.saveToHistory(`Deleted ${count} objects`);
        }
    }

    /**
     * Render all objects on the canvas
     */
    renderCanvas() {
        this.canvas.innerHTML = '';

        this.state.instances.forEach(instance => {
            this.renderInstance(instance);
        });
    }

    /**
     * Render a single instance on the canvas
     */
    renderInstance(instance) {
        const obj = document.createElement('div');
        obj.className = 'canvas-object';
        obj.id = instance.id;
        obj.dataset.instanceId = instance.id;
        obj.textContent = instance.label;

        // Apply positioning
        const canvasRect = this.canvas.getBoundingClientRect();
        const { x, y, modeH, modeV } = instance.positioning;

        if (modeH === 'relative') {
            obj.style.left = `${(x / canvasRect.width) * 100}%`;
        } else {
            obj.style.left = `${x}px`;
        }

        if (modeV === 'relative') {
            obj.style.top = `${(y / canvasRect.height) * 100}%`;
        } else {
            obj.style.top = `${y}px`;
        }

        // Apply state classes
        if (instance.anchored) {
            obj.classList.add('anchored');
        }

        if (this.state.isSelected(instance.id)) {
            obj.classList.add('selected');
        }

        this.canvas.appendChild(obj);
    }

    /**
     * Update selection visual state
     */
    updateSelectionUI() {
        this.canvas.querySelectorAll('.canvas-object').forEach(obj => {
            const instanceId = obj.dataset.instanceId;
            obj.classList.toggle('selected', this.state.isSelected(instanceId));
        });

        this.globalDeleteBtn.disabled = this.state.selectedIds.size === 0;
    }

    /**
     * Update undo/redo button states
     */
    updateHistoryButtons() {
        this.undoBtn.disabled = !this.state.history.canUndo();
        this.redoBtn.disabled = !this.state.history.canRedo();
    }

    /**
     * Show history modal
     */
    showHistoryModal() {
        this.renderHistoryGrid();
        this.historyModal.classList.remove('hidden');
        this.historyModal.classList.add('flex');
    }

    /**
     * Hide history modal
     */
    hideHistoryModal() {
        this.historyModal.classList.add('hidden');
        this.historyModal.classList.remove('flex');
    }

    /**
     * Render the history grid visualization
     */
    renderHistoryGrid() {
        this.historyGridContainer.innerHTML = '';
        const grid = this.state.history.grid;
        const pointer = this.state.history.pointer;
        const maxTime = Math.max(...grid.map(branch => branch.length));

        grid.forEach((branch, branchIndex) => {
            const column = document.createElement('div');
            column.className = 'history-branch-column';

            const label = document.createElement('div');
            label.className = 'branch-label';
            label.textContent = `Branch ${branchIndex}`;
            column.appendChild(label);

            for (let timeIndex = 0; timeIndex < maxTime; timeIndex++) {
                const node = document.createElement('div');
                node.className = 'history-node';

                if (branch[timeIndex]) {
                    node.textContent = `${timeIndex}: ${branch[timeIndex].action}`;
                    node.title = `${branch[timeIndex].action}`;

                    if (branchIndex === pointer.branch && timeIndex === pointer.time) {
                        node.classList.add('active');
                    }

                    node.onclick = () => {
                        this.state.history.jumpToState(branchIndex, timeIndex);
                        this.renderHistoryGrid();
                    };
                } else {
                    node.classList.add('placeholder');
                }

                column.appendChild(node);
            }

            this.historyGridContainer.appendChild(column);
        });
    }

    /**
     * Handle save button (export project and collapse history)
     */
    handleSave() {
        const data = this.state.history.toJSON();
        const dataStr = JSON.stringify(data);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `canvas-project-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        this.state.history.collapseHistory();
    }

    /**
     * Handle load button (import project)
     */
    handleLoad(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const data = JSON.parse(event.target.result);
            this.state.history.fromJSON(data);
        };
        reader.readAsText(file);
        this.loadFile.value = '';
    }

    /**
     * Handle export button (generate standalone HTML)
     */
    handleExport() {
        const currentState = this.state.history.getCurrentState().state;
        let objectsHTML = '';
        let interactiveObjectsData = [];

        currentState.instances.forEach(instData => {
            const isAnchored = instData.anchored;
            const { x, y, modeH, modeV } = instData.positioning;
            const canvasRect = this.canvas.getBoundingClientRect();

            let leftStyle = modeH === 'relative' ? `${(x / canvasRect.width) * 100}%` : `${x}px`;
            let topStyle = modeV === 'relative' ? `${(y / canvasRect.height) * 100}%` : `${y}px`;

            objectsHTML += `<div class="canvas-object" id="${instData.id}" style="left: ${leftStyle}; top: ${topStyle};">${instData.label}</div>\n`;

            if (!isAnchored) {
                interactiveObjectsData.push({ id: instData.id });
            }
        });

        const styles = `
            body { margin: 0; font-family: sans-serif; }
            .canvas-container { position: relative; width: 100vw; height: 100vh; overflow: hidden; background-color: #f9fafb; }
            .canvas-object { position: absolute; width: 80px; height: 80px; background-color: #60a5fa; border: 2px solid #2563eb; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; color: white; box-sizing: border-box; user-select: none; }
        `;

        const exportScript = `
            const interactiveObjects = ${JSON.stringify(interactiveObjectsData)};
            let draggedObj = null; let offsetX, offsetY;
            interactiveObjects.forEach(data => {
                const obj = document.getElementById(data.id);
                if (!obj) return;
                obj.style.cursor = 'move';
                obj.addEventListener('mousedown', (e) => {
                    if (e.button === 0) {
                        draggedObj = obj;
                        const objRect = draggedObj.getBoundingClientRect();
                        offsetX = e.clientX - objRect.left; offsetY = e.clientY - objRect.top;
                        draggedObj.style.zIndex = 1000; draggedObj.style.cursor = 'grabbing';
                        e.preventDefault();
                    }
                });
            });
            document.addEventListener('mousemove', (e) => {
                if (!draggedObj) return;
                const canvasRect = document.getElementById('canvas').getBoundingClientRect();
                let x = e.clientX - canvasRect.left - offsetX;
                let y = e.clientY - canvasRect.top - offsetY;
                x = Math.max(0, Math.min(x, canvasRect.width - draggedObj.offsetWidth));
                y = Math.max(0, Math.min(y, canvasRect.height - draggedObj.offsetHeight));
                draggedObj.style.left = x + 'px'; draggedObj.style.top = y + 'px';
            });
            document.addEventListener('mouseup', () => {
                if (draggedObj) { draggedObj.style.zIndex = ''; draggedObj.style.cursor = 'move'; }
                draggedObj = null;
            });
        `;

        const htmlContent = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Exported Canvas</title><style>${styles}</style></head>
<body><div id="canvas" class="canvas-container">${objectsHTML}</div><script>${exportScript}<\/script></body></html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'canvas-export.html';
        a.click();
        URL.revokeObjectURL(a.href);
    }
}
