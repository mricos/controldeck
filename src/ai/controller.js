/**
 * ControlDeck AI Controller
 * Generates synthetic input for games based on game state
 */
(function() {
    'use strict';

    const Events = window.Terrain?.Events;

    // Event names
    const AI_OUTPUT = 'controldeck:ai:output';
    const AI_STARTED = 'controldeck:ai:started';
    const AI_STOPPED = 'controldeck:ai:stopped';
    const AI_CONFIG_LOADED = 'controldeck:ai:config';

    class AIController {
        /**
         * Create AI controller
         * @param {Object} options - Configuration options
         * @param {number} options.tickRate - Updates per second (default 60)
         */
        constructor(options = {}) {
            this.running = false;
            this.intervalId = null;
            this.tickRate = options.tickRate || 60;
            this.config = null;
            this.state = {};
        }

        /**
         * Load a game configuration
         * @param {Object} config - Game AI configuration
         */
        loadConfig(config) {
            this.config = config;
            this.state = config.initialState ? { ...config.initialState } : {};

            if (Events) {
                Events.emit(AI_CONFIG_LOADED, config);
            }
        }

        /**
         * Start the AI loop
         */
        start() {
            if (this.running || !this.config) return;

            this.running = true;
            const interval = 1000 / this.tickRate;
            this.intervalId = setInterval(() => this._tick(), interval);

            if (Events) {
                Events.emit(AI_STARTED, { config: this.config.name });
            }
        }

        /**
         * Stop the AI loop
         */
        stop() {
            if (!this.running) return;

            this.running = false;
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }

            if (Events) {
                Events.emit(AI_STOPPED, {});
            }
        }

        /**
         * Process one AI tick
         */
        _tick() {
            if (!this.config || !this.config.tick) return;

            const outputs = this.config.tick(this.state, this.config.params || {});
            if (outputs) {
                if (Events) {
                    Events.emit(AI_OUTPUT, outputs);
                }
            }
        }

        /**
         * Update game state from external source
         * @param {Object} newState - State update from game
         */
        updateState(newState) {
            Object.assign(this.state, newState);
        }

        /**
         * Set a configuration parameter
         * @param {string} key - Parameter name
         * @param {*} value - Parameter value
         */
        setParam(key, value) {
            if (this.config && this.config.params) {
                this.config.params[key] = value;
            }
        }

        /**
         * Get current state
         * @returns {Object} Current game state
         */
        getState() {
            return { ...this.state };
        }
    }

    // Export event names
    AIController.EVENTS = {
        OUTPUT: AI_OUTPUT,
        STARTED: AI_STARTED,
        STOPPED: AI_STOPPED,
        CONFIG_LOADED: AI_CONFIG_LOADED
    };

    // Export
    window.ControlDeck = window.ControlDeck || {};
    window.ControlDeck.AIController = AIController;

})();
