/**
 * ControlDeck Module Manifest
 * Defines load order for modular scripts
 *
 * Load these scripts in order after Terrain core:
 *
 * <!-- Terrain Framework -->
 * <script src="terrain/js/core/config.js"></script>
 * <script src="terrain/js/core/events.js"></script>
 * <script src="terrain/js/core/state.js"></script>
 *
 * <!-- ControlDeck Core -->
 * <script src="src/core/protocol.js"></script>
 * <script src="src/core/profiles.js"></script>
 * <script src="src/core/latency.js"></script>
 *
 * <!-- ControlDeck Adapters -->
 * <script src="src/adapters/gamepad.js"></script>
 * <script src="src/adapters/midi.js"></script>
 * <script src="src/adapters/relay.js"></script>
 * <script src="src/adapters/recorder.js"></script>
 *
 * <!-- ControlDeck AI -->
 * <script src="src/ai/controller.js"></script>
 * <script src="src/ai/configs.js"></script>
 *
 * <!-- ControlDeck Engine -->
 * <script src="src/core/engine.js"></script>
 *
 * <!-- ControlDeck Panels -->
 * <script src="src/panels/controller.js"></script>
 * <script src="src/panels/latency.js"></script>
 * <script src="src/panels/log.js"></script>
 *
 * <!-- ControlDeck Entry Point -->
 * <script src="src/index.js"></script>
 */

window.ControlDeck = window.ControlDeck || {};
window.ControlDeck.MODULES = [
    // Core (no dependencies)
    'src/core/protocol.js',
    'src/core/profiles.js',
    'src/core/latency.js',

    // Adapters (depend on core)
    'src/adapters/gamepad.js',
    'src/adapters/midi.js',
    'src/adapters/relay.js',
    'src/adapters/recorder.js',

    // AI (depends on core)
    'src/ai/controller.js',
    'src/ai/configs.js',

    // Engine (depends on adapters)
    'src/core/engine.js',

    // Panels (depend on engine + Terrain)
    'src/panels/controller.js',
    'src/panels/latency.js',
    'src/panels/log.js',

    // Entry point
    'src/index.js'
];

/**
 * Load all modules dynamically (for dev/testing)
 * @param {string} basePath - Base path to modules
 * @returns {Promise} Resolves when all modules loaded
 */
window.ControlDeck.loadModules = async function(basePath = '') {
    for (const module of window.ControlDeck.MODULES) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = basePath + module;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    console.log('[ControlDeck] All modules loaded');
};
