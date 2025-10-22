import { AppState } from './AppState.js';
import { UIManager } from './UIManager.js';

/**
 * Main entry point for Visual App Builder v73.0
 * ES Module Architecture
 *
 * This file initializes the application by:
 * 1. Creating the AppState (single source of truth)
 * 2. Creating the UIManager (view and interaction handler)
 * 3. Exposing them globally for debugging
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize application state
    const appState = new AppState();

    // Initialize UI manager
    const uiManager = new UIManager(appState);

    // Expose to window for debugging and external access
    window.appState = appState;
    window.uiManager = uiManager;

    // Log initialization
    console.log('✅ Visual App Builder v73.0 Ready (ES Module Architecture)');
    console.log('📦 Modules loaded:', {
        appState: '✓ AppState controller',
        uiManager: '✓ UIManager view',
        instances: `${appState.instances.length} objects`,
        history: '✓ 2D branching history'
    });

    // Helpful debugging info
    console.log('🔍 Debug access:');
    console.log('  window.appState - Access application state');
    console.log('  window.uiManager - Access UI manager');
});
