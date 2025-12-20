/**
 * ControlDeck v0.3.0
 * Universal control input debugging, relay, and recording tool
 *
 * Modular version using Terrain framework
 *
 * Usage:
 *   const deck = ControlDeck.init({ profile: 'auto', channel: 'default' });
 *
 *   // Listen via Terrain.Events
 *   Terrain.Events.on(ControlDeck.Engine.EVENTS.INPUT, (e) => console.log(e));
 */
(function() {
    'use strict';

    const VERSION = '0.3.0';

    /**
     * Initialize ControlDeck
     * @param {Object} options - Configuration options
     * @returns {ControlDeckEngine} Engine instance
     */
    function init(options = {}) {
        return new window.ControlDeck.Engine(options);
    }

    // Collect all exports
    const ControlDeck = window.ControlDeck || {};

    // Add init and version
    ControlDeck.init = init;
    ControlDeck.version = VERSION;

    // Re-export for convenience
    window.ControlDeck = ControlDeck;

    // Log initialization
    console.log(`[ControlDeck] v${VERSION} loaded (modular)`);

})();
