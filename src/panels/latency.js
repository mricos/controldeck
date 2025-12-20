/**
 * ControlDeck Latency Panel
 * Displays latency statistics with Terrain state binding
 */
(function() {
    'use strict';

    const Events = window.Terrain?.Events;
    const State = window.Terrain?.State;
    const Engine = window.ControlDeck?.Engine;

    // State paths
    const STATE_PREFIX = 'controldeck.latency';

    /**
     * Initialize latency panel state
     */
    function initState() {
        if (!State) return;

        // Set initial state structure
        State.set(`${STATE_PREFIX}.pollRate`, '--');
        State.set(`${STATE_PREFIX}.inputAge`, '--');
        State.set(`${STATE_PREFIX}.jitter`, '--');
        State.set(`${STATE_PREFIX}.p50`, '--');
        State.set(`${STATE_PREFIX}.p95`, '--');
        State.set(`${STATE_PREFIX}.p99`, '--');
    }

    /**
     * Update latency display from engine stats
     * @param {Object} stats - Latency statistics
     */
    function updateFromStats(stats) {
        if (!State) return;

        State.update({
            [`${STATE_PREFIX}.pollRate`]: stats.pollRate.toFixed(1),
            [`${STATE_PREFIX}.inputAge`]: stats.inputAge.avg.toFixed(1),
            [`${STATE_PREFIX}.jitter`]: stats.inputAge.jitter.toFixed(1),
            [`${STATE_PREFIX}.p50`]: stats.inputAge.p50.toFixed(1),
            [`${STATE_PREFIX}.p95`]: stats.inputAge.p95.toFixed(1),
            [`${STATE_PREFIX}.p99`]: stats.inputAge.p99.toFixed(1)
        });
    }

    /**
     * Setup latency panel bindings
     * @param {ControlDeckEngine} deck - Engine instance
     */
    function setup(deck) {
        initState();

        if (!Events) return;

        // Update on every input event
        Events.on(Engine.EVENTS.INPUT, () => {
            if (deck) {
                updateFromStats(deck.getLatency());
            }
        });
    }

    // Export
    window.ControlDeck = window.ControlDeck || {};
    window.ControlDeck.Panels = window.ControlDeck.Panels || {};
    window.ControlDeck.Panels.Latency = {
        setup,
        updateFromStats,
        STATE_PREFIX
    };

})();
