/**
 * Instance - Data model for canvas objects
 *
 * Pure data class representing an object on the canvas.
 * Scene Graph Architecture (v73.0 Step 2):
 * - localTransform: Position relative to parent (or canvas if no parent)
 * - worldTransform: Computed absolute position on canvas (cached)
 */
export class Instance {
    constructor(id, type = 'square') {
        // Identity
        this.id = id;
        this.type = type;

        // Scene Graph Transforms
        // Local transform: position relative to parent (in pixels)
        this.localTransform = {
            x: 0,
            y: 0
        };

        // World transform: absolute position on canvas (computed, cached)
        this.worldTransform = {
            x: 0,
            y: 0
        };

        // Render mode: how to display in CSS (percentage vs pixels)
        this.renderMode = {
            horizontal: 'relative', // 'relative' (%) or 'absolute' (px)
            vertical: 'relative'    // 'relative' (%) or 'absolute' (px)
        };

        // Sizing
        this.sizing = {
            width: 80,
            height: 80
        };

        // Hierarchy (Scene Graph)
        this.parentId = null;
        this.children = []; // Array of child instance IDs

        // State
        this.anchored = false;  // If true, object cannot be moved
        this.selected = false;  // Selection state

        // Display
        this.label = id; // Text to display on the object
    }

    /**
     * Compute world transform from local transform and parent's world transform
     * This is called during the scene graph traversal
     */
    computeWorldTransform(parentWorldTransform = null) {
        if (parentWorldTransform) {
            // Child: world = parent.world + local
            this.worldTransform.x = parentWorldTransform.x + this.localTransform.x;
            this.worldTransform.y = parentWorldTransform.y + this.localTransform.y;
        } else {
            // Root: world = local (no parent)
            this.worldTransform.x = this.localTransform.x;
            this.worldTransform.y = this.localTransform.y;
        }
    }

    /**
     * Serialize this instance to a plain object for storage
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            localTransform: { ...this.localTransform },
            renderMode: { ...this.renderMode },
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
     * Supports backward compatibility with old 'positioning' format
     */
    static fromJSON(data) {
        const instance = new Instance(data.id, data.type);

        // Backward compatibility: convert old 'positioning' to new 'localTransform'
        if (data.positioning) {
            instance.localTransform = {
                x: data.positioning.x || 0,
                y: data.positioning.y || 0
            };
            instance.renderMode = {
                horizontal: data.positioning.modeH || 'relative',
                vertical: data.positioning.modeV || 'relative'
            };
        } else {
            // New format
            instance.localTransform = { ...data.localTransform };
            instance.renderMode = { ...data.renderMode };
        }

        instance.sizing = { ...data.sizing };
        instance.parentId = data.parentId || null;
        instance.children = [...(data.children || [])];
        instance.anchored = data.anchored || false;
        instance.selected = data.selected || false;
        instance.label = data.label || data.id;

        return instance;
    }
}
