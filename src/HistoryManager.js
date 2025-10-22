/**
 * HistoryManager - 2D Branching History System
 *
 * Manages application state history with support for:
 * - Undo/Redo operations
 * - Timeline branching (when undoing and making new changes)
 * - State capture and restoration
 * - History visualization
 */
export class HistoryManager {
    constructor(captureStateFn, restoreStateFn) {
        // Callbacks for state management
        this.captureState = captureStateFn;
        this.restoreState = restoreStateFn;

        // 2D grid: grid[branch][time] = { action: string, state: object }
        this.grid = [
            [{ action: 'Initial State', state: this.captureState() }]
        ];

        // Current position in the history grid
        this.pointer = { branch: 0, time: 0 };

        // Archive of collapsed histories
        this.archivedHistory = [];

        // Listeners for UI updates
        this.listeners = [];
    }

    /**
     * Register a listener to be called when history changes
     */
    onChange(callback) {
        this.listeners.push(callback);
    }

    /**
     * Notify all listeners of a history change
     */
    notifyListeners() {
        this.listeners.forEach(callback => callback());
    }

    /**
     * Add a new state to the history
     * Creates a new branch if we're not at the end of the current timeline
     */
    addState(action) {
        const currentState = this.grid[this.pointer.branch][this.pointer.time].state;
        const nextState = this.captureState();

        // Don't add if state hasn't changed
        if (JSON.stringify(currentState) === JSON.stringify(nextState)) {
            return;
        }

        const newState = { action, state: nextState };
        const currentTimeline = this.grid[this.pointer.branch];

        if (this.pointer.time === currentTimeline.length - 1) {
            // At the end of timeline, just append
            currentTimeline.push(newState);
            this.pointer.time++;
        } else {
            // In the middle of timeline, create a new branch
            const newBranch = currentTimeline.slice(0, this.pointer.time + 1);
            newBranch.push(newState);
            this.grid.push(newBranch);
            this.pointer.branch = this.grid.length - 1;
            this.pointer.time = newBranch.length - 1;
        }

        this.notifyListeners();
    }

    /**
     * Move back one step in history
     */
    undo() {
        if (this.pointer.time > 0) {
            this.pointer.time--;
            this.restoreState(this.grid[this.pointer.branch][this.pointer.time].state);
            this.notifyListeners();
        }
    }

    /**
     * Move forward one step in history
     */
    redo() {
        const currentTimeline = this.grid[this.pointer.branch];
        if (this.pointer.time < currentTimeline.length - 1) {
            this.pointer.time++;
            this.restoreState(this.grid[this.pointer.branch][this.pointer.time].state);
            this.notifyListeners();
        }
    }

    /**
     * Jump to a specific state in the history grid
     */
    jumpToState(branch, time) {
        if (this.grid[branch] && this.grid[branch][time]) {
            this.pointer = { branch, time };
            this.restoreState(this.grid[branch][time].state);
            this.notifyListeners();
        }
    }

    /**
     * Collapse all branches into a single timeline up to the current state
     * Archives the full history before collapsing
     */
    collapseHistory() {
        const activeTimeline = this.grid[this.pointer.branch].slice(0, this.pointer.time + 1);
        const archive = {
            timestamp: Date.now(),
            grid: this.grid,
            message: `Collapsed ${this.grid.length} branches.`
        };
        this.archivedHistory.push(archive);
        this.grid = [activeTimeline];
        this.pointer = { branch: 0, time: activeTimeline.length - 1 };
        this.notifyListeners();
    }

    /**
     * Check if undo is available
     */
    canUndo() {
        return this.pointer.time > 0;
    }

    /**
     * Check if redo is available
     */
    canRedo() {
        return this.pointer.time < this.grid[this.pointer.branch].length - 1;
    }

    /**
     * Get the current state information
     */
    getCurrentState() {
        return this.grid[this.pointer.branch][this.pointer.time];
    }

    /**
     * Serialize the entire history for saving
     */
    toJSON() {
        return {
            grid: this.grid,
            pointer: this.pointer,
            archivedHistory: this.archivedHistory
        };
    }

    /**
     * Load history from serialized data
     */
    fromJSON(data) {
        this.grid = data.grid;
        this.pointer = data.pointer;
        this.archivedHistory = data.archivedHistory || [];
        this.restoreState(this.grid[this.pointer.branch][this.pointer.time].state);
        this.notifyListeners();
    }
}
