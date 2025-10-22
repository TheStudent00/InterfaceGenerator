/**
 * Instance - Data model for canvas objects
 *
 * Pure data class representing an object on the canvas.
 * Contains properties for positioning, sizing, hierarchy, and state.
 */
export class Instance {
    constructor(id, type = 'square') {
        // Identity
        this.id = id;
        this.type = type;

        // Positioning (currently canvas-relative, will become parent-relative in scene graph refactor)
        this.positioning = {
            x: 0,
            y: 0,
            modeH: 'relative', // 'relative' (%) or 'absolute' (px)
            modeV: 'relative'  // 'relative' (%) or 'absolute' (px)
        };

        // Sizing
        this.sizing = {
            width: 80,
            height: 80
        };

        // Hierarchy (v73.0 - Step 1 of scene graph refactor)
        this.parentId = null;
        this.children = []; // Array of child instance IDs

        // State
        this.anchored = false;  // If true, object cannot be moved
        this.selected = false;  // Selection state

        // Display
        this.label = id; // Text to display on the object
    }

    /**
     * Serialize this instance to a plain object for storage
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            positioning: { ...this.positioning },
            sizing: { ...this.sizing },
            parentId: this.parentId,
            children: [...this.children],
            anchored: this.anchored,
            selected: this.selected,
            label: this.label
        };
    }

    /**
     * Create an Instance from a plain object (deserialization)
     */
    static fromJSON(data) {
        const instance = new Instance(data.id, data.type);
        instance.positioning = { ...data.positioning };
        instance.sizing = { ...data.sizing };
        instance.parentId = data.parentId || null;
        instance.children = [...(data.children || [])];
        instance.anchored = data.anchored || false;
        instance.selected = data.selected || false;
        instance.label = data.label || data.id;
        return instance;
    }
}
