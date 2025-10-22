document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const legendSquare = document.getElementById('square-legend');
    const contextMenu = document.getElementById('contextMenu');
    const exportBtn = document.getElementById('exportBtn');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const globalDeleteBtn = document.getElementById('globalDeleteBtn');
    const saveBtn = document.getElementById('saveBtn');
    const loadBtn = document.getElementById('loadBtn');
    const loadFile = document.getElementById('loadFile');
    const historyBtn = document.getElementById('historyBtn');
    const historyModal = document.getElementById('historyModal');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    const historyGridContainer = document.getElementById('history-grid-container');

    let activeObject = null;
    let objectCounter = 0;
    let history;
    let selectedObjects = new Set();
    let isDragging = false;
    let isMarqueeSelecting = false;
    let marqueeBox = null;
    let marqueeStart = { x: 0, y: 0 };
    let dragData = { element: null, startX: 0, startY: 0, offsetX: 0, offsetY: 0, hasDragged: false };


    // --- History Management System ---
    class HistoryManager {
        constructor() {
            this.grid = [
                [{ action: 'Initial State', state: this.captureState() }]
            ]; // grid[branch][time]
            this.pointer = { branch: 0, time: 0 };
            this.archivedHistory = [];
            this.updateUI();
        }

        captureState() {
            const objects = [];
            canvas.querySelectorAll('.canvas-object').forEach(obj => {
                objects.push({
                    id: obj.id,
                    textContent: obj.textContent,
                    dataset: { ...obj.dataset },
                    style: { left: obj.style.left, top: obj.style.top }
                });
            });
            return { objects, objectCounter, selectedIds: [...selectedObjects] };
        }

        restoreState(state) {
            if (!state) return;
            canvas.innerHTML = '';
            objectCounter = state.objectCounter;
            state.objects.forEach(objData => {
                const obj = document.createElement('div');
                obj.className = 'canvas-object';
                obj.id = objData.id;
                obj.textContent = objData.textContent;
                Object.assign(obj.dataset, objData.dataset);
                Object.assign(obj.style, objData.style);
                obj.classList.toggle('anchored', obj.dataset.anchored === 'true');
                canvas.appendChild(obj);
            });
            selectedObjects = new Set(state.selectedIds || []);
            updateSelectionUI();
            this.updateUI();
        }

        addState(action) {
            const currentState = this.grid[this.pointer.branch][this.pointer.time].state;
            const nextState = this.captureState();

            if (JSON.stringify(currentState) === JSON.stringify(nextState)) return;

            const newState = { action, state: nextState };
            const currentTimeline = this.grid[this.pointer.branch];

            if (this.pointer.time === currentTimeline.length - 1) {
                currentTimeline.push(newState);
                this.pointer.time++;
            } else {
                const newBranch = currentTimeline.slice(0, this.pointer.time + 1);
                newBranch.push(newState);
                this.grid.push(newBranch);
                this.pointer.branch = this.grid.length - 1;
                this.pointer.time = newBranch.length - 1;
            }
            this.updateUI();
        }

        undo() {
            if (this.pointer.time > 0) {
                this.pointer.time--;
                this.restoreState(this.grid[this.pointer.branch][this.pointer.time].state);
            }
        }

        redo() {
            const currentTimeline = this.grid[this.pointer.branch];
            if (this.pointer.time < currentTimeline.length - 1) {
                this.pointer.time++;
                this.restoreState(this.grid[this.pointer.branch][this.pointer.time].state);
            }
        }

        jumpToState(branch, time) {
            if (this.grid[branch] && this.grid[branch][time]) {
                this.pointer = { branch, time };
                this.restoreState(this.grid[branch][time].state);
            }
        }

        collapseHistory() {
            const activeTimeline = this.grid[this.pointer.branch].slice(0, this.pointer.time + 1);
            const archive = { timestamp: Date.now(), grid: this.grid, message: `Collapsed ${this.grid.length} branches.` };
            this.archivedHistory.push(archive);
            this.grid = [activeTimeline];
            this.pointer = { branch: 0, time: activeTimeline.length - 1 };
            this.updateUI();
        }

        updateUI() {
            undoBtn.disabled = this.pointer.time <= 0;
            redoBtn.disabled = this.pointer.time >= this.grid[this.pointer.branch].length - 1;
        }

        renderHistoryGrid() {
            historyGridContainer.innerHTML = '';
            const maxTime = Math.max(...this.grid.map(branch => branch.length));
            this.grid.forEach((branch, branchIndex) => {
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
                        if (branchIndex === this.pointer.branch && timeIndex === this.pointer.time) {
                            node.classList.add('active');
                        }
                        node.onclick = () => { this.jumpToState(branchIndex, timeIndex); this.renderHistoryGrid(); };
                    } else {
                        node.classList.add('placeholder');
                    }
                    column.appendChild(node);
                }
                historyGridContainer.appendChild(column);
            });
        }
    }

    history = new HistoryManager();

    function onActionComplete(action) {
        history.addState(action);
    }

    function updateSelectionUI() {
        canvas.querySelectorAll('.canvas-object').forEach(obj => {
            obj.classList.toggle('selected', selectedObjects.has(obj.id));
        });
        globalDeleteBtn.disabled = selectedObjects.size === 0;
    }

    legendSquare.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', 'square'); });
    canvas.addEventListener('dragover', (e) => { e.preventDefault(); });
    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        createCanvasObject(e.clientX, e.clientY);
        onActionComplete('Create Object');
    });

    canvas.addEventListener('mousedown', (e) => {
        const target = e.target;

        // --- MARQUEE SELECT ---
        if (target === canvas) {
            isMarqueeSelecting = true;
            const canvasRect = canvas.getBoundingClientRect();
            marqueeStart.x = e.clientX - canvasRect.left;
            marqueeStart.y = e.clientY - canvasRect.top;

            marqueeBox = document.createElement('div');
            marqueeBox.id = 'selection-box';
            canvas.appendChild(marqueeBox);

            if (!e.shiftKey) {
                selectedObjects.clear();
            }
            updateSelectionUI();
            return;
        }

        // --- OBJECT CLICK/DRAG ---
        if (target.classList.contains('canvas-object')) {
            const obj = target;
            if (obj.dataset.anchored === 'true') return;

            isDragging = true;
            const objRect = obj.getBoundingClientRect();
            dragData = {
                element: obj,
                startX: e.clientX,
                startY: e.clientY,
                offsetX: e.clientX - objRect.left,
                offsetY: e.clientY - objRect.top,
                hasDragged: false
            };

            if (!e.shiftKey && !selectedObjects.has(obj.id)) {
                selectedObjects.clear();
                selectedObjects.add(obj.id);
                updateSelectionUI();
            }
            e.preventDefault();
        }
    });

    document.addEventListener('mousemove', (e) => {
        // --- MARQUEE MOVE ---
        if (isMarqueeSelecting) {
            const canvasRect = canvas.getBoundingClientRect();
            const currentX = e.clientX - canvasRect.left;
            const currentY = e.clientY - canvasRect.top;
            const left = Math.min(marqueeStart.x, currentX);
            const top = Math.min(marqueeStart.y, currentY);
            const width = Math.abs(marqueeStart.x - currentX);
            const height = Math.abs(marqueeStart.y - currentY);
            marqueeBox.style.cssText = `left:${left}px; top:${top}px; width:${width}px; height:${height}px;`;
            return;
        }

        // --- OBJECT DRAG ---
        if (!isDragging || !dragData.element) return;

        const dist = Math.hypot(e.clientX - dragData.startX, e.clientY - dragData.startY);
        if (dist > 5) {
            dragData.hasDragged = true;
        }

        if (dragData.hasDragged) {
            const canvasRect = canvas.getBoundingClientRect();
            let x = e.clientX - canvasRect.left - dragData.offsetX;
            let y = e.clientY - canvasRect.top - dragData.offsetY;
            x = Math.max(0, Math.min(x, canvasRect.width - dragData.element.offsetWidth));
            y = Math.max(0, Math.min(y, canvasRect.height - dragData.element.offsetHeight));
            updateObjectPosition(dragData.element, x, y);
        }
    });

    document.addEventListener('mouseup', (e) => {
        // --- MARQUEE END ---
        if (isMarqueeSelecting) {
            const marqueeRect = marqueeBox.getBoundingClientRect();
            let selectionChanged = false;
            canvas.querySelectorAll('.canvas-object').forEach(obj => {
                const objRect = obj.getBoundingClientRect();
                const intersects = !(marqueeRect.right < objRect.left || marqueeRect.left > objRect.right || marqueeRect.bottom < objRect.top || marqueeRect.top > objRect.bottom);
                if (intersects && !selectedObjects.has(obj.id)) {
                     selectedObjects.add(obj.id);
                     selectionChanged = true;
                }
            });
            marqueeBox.remove();
            isMarqueeSelecting = false;
            marqueeBox = null;
            updateSelectionUI();
            if (selectionChanged) {
                onActionComplete('Marquee Select');
            }
            return;
        }

        // --- OBJECT MOUSEUP ---
        if (isDragging && dragData.element) {
            if (dragData.hasDragged) {
                onActionComplete('Move Object');
            } else { // It was a click
                const target = dragData.element;
                if (e.shiftKey) {
                    if (selectedObjects.has(target.id)) {
                        selectedObjects.delete(target.id);
                    } else {
                        selectedObjects.add(target.id);
                    }
                } else {
                    selectedObjects.clear();
                    selectedObjects.add(target.id);
                }
                updateSelectionUI();
                onActionComplete('Select Object');
            }
        }
        isDragging = false;
        dragData = { element: null, startX: 0, startY: 0, offsetX: 0, offsetY: 0, hasDragged: false };
    });

    contextMenu.addEventListener('click', (e) => {
        if (!activeObject) return;
        const button = e.target.closest('button');
        if (!button) return;
        let action = '';
        if (button.dataset.mode) {
            const mode = button.dataset.mode;
            const value = button.dataset.value;
            if (mode === 'h') { activeObject.dataset.positionH = value; action = `Set H Mode: ${value}`; }
            else if (mode === 'v') { activeObject.dataset.positionV = value; action = `Set V Mode: ${value}`; }
            updateObjectPosition(activeObject, parseFloat(activeObject.dataset.absX), parseFloat(activeObject.dataset.absY));
        } else if (button.id === 'toggleAnchor') {
            const isAnchored = activeObject.dataset.anchored === 'true';
            activeObject.dataset.anchored = !isAnchored;
            activeObject.classList.toggle('anchored', !isAnchored);
            action = isAnchored ? `Un-anchor ${activeObject.id}` : `Anchor ${activeObject.id}`;
        } else if (button.id === 'deleteBtn') {
            action = `Delete ${activeObject.id}`;
            activeObject.remove();
            selectedObjects.delete(activeObject.id);
        }
        contextMenu.style.display = 'none';
        if (action) { onActionComplete(action); }
        activeObject = null;
        updateSelectionUI();
    });

    globalDeleteBtn.addEventListener('click', () => {
        if (selectedObjects.size > 0) {
            selectedObjects.forEach(id => {
                document.getElementById(id)?.remove();
            });
            onActionComplete(`Deleted ${selectedObjects.size} objects`);
            selectedObjects.clear();
            updateSelectionUI();
        }
    });

    function createCanvasObject(clientX, clientY) {
        const canvasRect = canvas.getBoundingClientRect();
        const x = clientX - canvasRect.left;
        const y = clientY - canvasRect.top;
        const obj = document.createElement('div');
        obj.className = 'canvas-object';
        obj.id = `obj-${++objectCounter}`;
        obj.textContent = obj.id;
        obj.dataset.positionH = 'relative';
        obj.dataset.positionV = 'relative';
        obj.dataset.anchored = 'false';
        canvas.appendChild(obj);
        const finalX = x - (obj.offsetWidth / 2);
        const finalY = y - (obj.offsetHeight / 2);
        updateObjectPosition(obj, finalX, finalY);
        selectedObjects.clear();
        selectedObjects.add(obj.id);
        updateSelectionUI();
    }

    function updateObjectPosition(obj, x, y) {
        obj.dataset.absX = x;
        obj.dataset.absY = y;
        const canvasRect = canvas.getBoundingClientRect();
        if (obj.dataset.positionH === 'relative') { obj.style.left = `${(x / canvasRect.width) * 100}%`; }
        else { obj.style.left = `${x}px`; }
        if (obj.dataset.positionV === 'relative') { obj.style.top = `${(y / canvasRect.height) * 100}%`; }
        else { obj.style.top = `${y}px`; }
    }

    function updateContextMenuState() {
        if (!activeObject) return;
        const { positionH, positionV, anchored } = activeObject.dataset;
        contextMenu.querySelectorAll('button[data-mode]').forEach(btn => {
            const { mode, value } = btn.dataset;
            btn.querySelector('.check-icon').classList.toggle('visible', (mode === 'h' && value === positionH) || (mode === 'v' && value === positionV));
        });
        const anchorButton = document.getElementById('toggleAnchor');
        const isAnchored = anchored === 'true';
        anchorButton.querySelector('.check-icon').classList.toggle('visible', isAnchored);
        anchorButton.querySelector('#anchor-text').textContent = isAnchored ? 'Un-anchor Object' : 'Anchor Object';
    }

    canvas.addEventListener('contextmenu', (e) => {
        if (e.target.classList.contains('canvas-object')) {
            e.preventDefault();
            activeObject = e.target;
            updateContextMenuState();
            contextMenu.style.display = 'block';
            contextMenu.style.left = `${e.pageX}px`;
            contextMenu.style.top = `${e.pageY}px`;
        }
    });
    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target) && !e.target.closest('.canvas-object')) {
            contextMenu.style.display = 'none';
            activeObject = null;
        }
        if (e.target === canvas) {
            selectedObjects.clear();
            updateSelectionUI();
            onActionComplete('Deselect all');
        }
    });

    undoBtn.addEventListener('click', () => history.undo());
    redoBtn.addEventListener('click', () => history.redo());

    saveBtn.addEventListener('click', () => {
        const dataStr = JSON.stringify({
            grid: history.grid,
            pointer: history.pointer,
            archivedHistory: history.archivedHistory
        });
        const blob = new Blob([dataStr], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `canvas-project-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        history.collapseHistory();
    });

    loadBtn.addEventListener('click', () => loadFile.click());
    loadFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const data = JSON.parse(event.target.result);
            history.grid = data.grid;
            history.pointer = data.pointer;
            history.archivedHistory = data.archivedHistory || [];
            history.jumpToState(history.pointer.branch, history.pointer.time);
        };
        reader.readAsText(file);
        loadFile.value = '';
    });

    historyBtn.addEventListener('click', () => {
        history.renderHistoryGrid();
        historyModal.classList.remove('hidden');
        historyModal.classList.add('flex');
    });
    closeHistoryBtn.addEventListener('click', () => {
        historyModal.classList.add('hidden');
        historyModal.classList.remove('flex');
    });
    historyModal.addEventListener('click', (e) => {
        if (e.target === historyModal) {
            historyModal.classList.add('hidden');
            historyModal.classList.remove('flex');
        }
    });

    exportBtn.addEventListener('click', () => {
        const currentState = history.grid[history.pointer.branch][history.pointer.time].state;
        let objectsHTML = '';
        let interactiveObjectsData = [];

        currentState.objects.forEach(objData => {
            const isAnchored = objData.dataset.anchored === 'true';
            objectsHTML += `<div class="canvas-object" id="${objData.id}" style="left: ${objData.style.left}; top: ${objData.style.top};">${objData.textContent}</div>\n`;
            if (!isAnchored) {
                interactiveObjectsData.push({ id: objData.id });
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
    });

    console.log('✅ Visual App Builder v73.0 Ready (De-blobbed Architecture)');
});
