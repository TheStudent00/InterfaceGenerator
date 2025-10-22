import { Instance } from './Instance.js';
import { HistoryManager } from './HistoryManager.js';

/**
 * AppState - Application State Controller
 *
 * Single source of truth for the application.
 * Manages:
 * - Collection of instances (canvas objects)
 * - Selection state
 * - Business logic for manipulating instances
 * - History management integration
 */
export class AppState {
    constructor() {
        // Core state
        this.instances = []; // Array of Instance objects
        this.selectedIds = new Set(); // Set of selected instance IDs
        this.objectCounter = 0; // For generating unique IDs

        // History management
        this.history = new HistoryManager(
            () => this.captureState(),
            (state) => this.restoreState(state)
        );

        // Listeners for state changes
        this.changeListeners = [];
        this.selectionListeners = [];

        // Initialize history with the current (empty) state
        this.history.addState('Initial State');
    }

    /**
     * Register a listener for state changes
     */
    onChange(callback) {
        this.changeListeners.push(callback);
    }

    /**
     * Register a listener for selection changes
     */
    onSelectionChange(callback) {
        this.selectionListeners.push(callback);
    }

    /**
     * Notify all change listeners
     */
    notifyChange() {
        this.changeListeners.forEach(callback => callback());
    }

    /**
     * Notify all selection listeners
     */
    notifySelectionChange() {
        this.selectionListeners.forEach(callback => callback());
    }

    /**
     * Capture the current state for history
     */
    captureState() {
        return {
            instances: this.instances.map(inst => inst.toJSON()),
            selectedIds: [...this.selectedIds],
            objectCounter: this.objectCounter
        };
    }

    /**
     * Restore state from history
     */
    restoreState(state) {
        this.instances = state.instances.map(data => Instance.fromJSON(data));
        this.selectedIds = new Set(state.selectedIds);
        this.objectCounter = state.objectCounter;
        this.updateWorldTransforms(); // Recompute world transforms after restore
        this.notifyChange();
        this.notifySelectionChange();
    }

    /**
     * Update world transforms for all instances
     * Traverses the scene graph from roots to leaves
     * This is called after any change that affects positions
     */
    updateWorldTransforms() {
        // Build a set of instances that have parents (non-roots)
        const nonRoots = new Set(
            this.instances
                .filter(inst => inst.parentId !== null)
                .map(inst => inst.id)
        );

        // Find all root instances (no parent)
        const roots = this.instances.filter(inst => inst.parentId === null);

        // Recursively update transforms starting from roots
        const updateRecursive = (instance, parentWorldTransform = null) => {
            // Compute this instance's world transform
            instance.computeWorldTransform(parentWorldTransform);

            // Update all children
            instance.children.forEach(childId => {
                const child = this.getInstance(childId);
                if (child) {
                    updateRecursive(child, instance.worldTransform);
                }
            });
        };

        // Process all roots
        roots.forEach(root => updateRecursive(root, null));
    }

    /**
     * Save current state to history
     */
    saveToHistory(action) {
        this.history.addState(action);
        this.notifyChange();
    }

    /**
     * Create and add a new instance
     */
    createInstance(x, y, type = 'square') {
        const instance = new Instance(`obj-${++this.objectCounter}`, type);
        instance.localTransform.x = x;
        instance.localTransform.y = y;
        instance.label = instance.id;
        this.instances.push(instance);

        // Compute world transform (it's a root, so world = local)
        instance.computeWorldTransform(null);

        // Select only the new instance
        this.selectedIds.clear();
        this.selectedIds.add(instance.id);

        this.notifyChange();
        this.notifySelectionChange();
        return instance;
    }

    /**
     * Delete an instance by ID
     */
    deleteInstance(id) {
        const index = this.instances.findIndex(inst => inst.id === id);
        if (index === -1) return false;

        const instance = this.instances[index];

        // Remove from parent's children array if it has a parent
        if (instance.parentId) {
            const parent = this.getInstance(instance.parentId);
            if (parent) {
                parent.children = parent.children.filter(childId => childId !== id);
            }
        }

        // Delete all children recursively
        [...instance.children].forEach(childId => {
            this.deleteInstance(childId);
        });

        // Remove from instances array
        this.instances.splice(index, 1);

        // Remove from selection
        this.selectedIds.delete(id);

        this.notifyChange();
        this.notifySelectionChange();
        return true;
    }

    /**
     * Delete multiple instances
     */
    deleteInstances(ids) {
        let deletedCount = 0;
        ids.forEach(id => {
            if (this.deleteInstance(id)) {
                deletedCount++;
            }
        });
        return deletedCount;
    }

    /**
     * Get an instance by ID
     */
    getInstance(id) {
        return this.instances.find(inst => inst.id === id);
    }

    /**
     * Get all children of an instance
     */
    getChildren(id) {
        const instance = this.getInstance(id);
        if (!instance) return [];
        return instance.children.map(childId => this.getInstance(childId)).filter(Boolean);
    }

    /**
     * Set the parent of an instance
     * Scene Graph: Converts between world and local coordinates when parent changes
     */
    setParent(childId, parentId) {
        const child = this.getInstance(childId);
        const parent = parentId ? this.getInstance(parentId) : null;

        if (!child) return false;
        if (parentId && !parent) return false;

        // Store current world position
        const currentWorldX = child.worldTransform.x;
        const currentWorldY = child.worldTransform.y;

        // Remove from old parent's children
        if (child.parentId) {
            const oldParent = this.getInstance(child.parentId);
            if (oldParent) {
                oldParent.children = oldParent.children.filter(id => id !== childId);
            }
        }

        // Set new parent
        child.parentId = parentId;

        // Add to new parent's children
        if (parent) {
            if (!parent.children.includes(childId)) {
                parent.children.push(childId);
            }

            // Convert world position to local position relative to new parent
            child.localTransform.x = currentWorldX - parent.worldTransform.x;
            child.localTransform.y = currentWorldY - parent.worldTransform.y;
        } else {
            // Becoming a root: local = world
            child.localTransform.x = currentWorldX;
            child.localTransform.y = currentWorldY;
        }

        // Recompute all transforms
        this.updateWorldTransforms();
        this.notifyChange();
        return true;
    }

    /**
     * Update an instance's position (Scene Graph)
     *
     * In the scene graph, we only update the localTransform.
     * Children automatically move because their worldTransform is computed
     * from their parent's worldTransform + their own localTransform.
     *
     * x, y are in WORLD coordinates (canvas-relative pixels)
     */
    updateInstancePosition(id, x, y) {
        const instance = this.getInstance(id);
        if (!instance || instance.anchored) return false;

        // Convert world coordinates to local coordinates
        if (instance.parentId) {
            const parent = this.getInstance(instance.parentId);
            if (parent) {
                // Local = World - Parent.World
                instance.localTransform.x = x - parent.worldTransform.x;
                instance.localTransform.y = y - parent.worldTransform.y;
            } else {
                // Parent not found, treat as root
                instance.localTransform.x = x;
                instance.localTransform.y = y;
            }
        } else {
            // Root instance: local = world
            instance.localTransform.x = x;
            instance.localTransform.y = y;
        }

        // Recompute world transforms (this updates the instance and all its children)
        this.updateWorldTransforms();

        this.notifyChange();
        return true;
    }

    /**
     * Update an instance's render mode (how position is displayed in CSS)
     */
    updateInstanceMode(id, axis, mode) {
        const instance = this.getInstance(id);
        if (!instance) return false;

        if (axis === 'h') {
            instance.renderMode.horizontal = mode;
        } else if (axis === 'v') {
            instance.renderMode.vertical = mode;
        }

        this.notifyChange();
        return true;
    }

    /**
     * Toggle anchor state of an instance
     */
    toggleAnchor(id) {
        const instance = this.getInstance(id);
        if (!instance) return false;

        instance.anchored = !instance.anchored;
        this.notifyChange();
        return instance.anchored;
    }

    /**
     * Select an instance (replaces current selection)
     */
    selectInstance(id) {
        this.selectedIds.clear();
        this.selectedIds.add(id);
        this.notifySelectionChange();
    }

    /**
     * Toggle selection of an instance
     */
    toggleSelection(id) {
        if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id);
        } else {
            this.selectedIds.add(id);
        }
        this.notifySelectionChange();
    }

    /**
     * Add to selection (for multi-select)
     */
    addToSelection(id) {
        this.selectedIds.add(id);
        this.notifySelectionChange();
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedIds.clear();
        this.notifySelectionChange();
    }

    /**
     * Set multiple selections
     */
    setSelection(ids) {
        this.selectedIds = new Set(ids);
        this.notifySelectionChange();
    }

    /**
     * Check if an instance is selected
     */
    isSelected(id) {
        return this.selectedIds.has(id);
    }

    /**
     * Get all selected instances
     */
    getSelectedInstances() {
        return [...this.selectedIds].map(id => this.getInstance(id)).filter(Boolean);
    }
}
