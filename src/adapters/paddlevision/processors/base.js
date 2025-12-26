/**
 * PaddleVision Processor Base Class
 *
 * All processors receive a context object and return a transformed context.
 *
 * Context shape:
 * {
 *   raw: { landmarks: [], timestamp: number },
 *   derived: { 'hand-center': {x, y}, 'hand-rotation': number, ... },
 *   calibrated: { theta: number, ... },
 *   smoothed: { x, y, theta, spread, ... },
 *   gestures: { flick: { amount, direction }, ... },
 *   outputs: { 'hand-x': 0.5, ... },
 *   calibration: { reference: {...}, tuning: {...} },
 *   meta: { framesProcessed: number, ... }
 * }
 */
(function() {
    'use strict';

    // Ensure namespace
    if (!window.ControlDeck) window.ControlDeck = {};
    if (!window.ControlDeck.PaddleVision) window.ControlDeck.PaddleVision = {};

    class Processor {
        /**
         * @param {Object} config - Processor-specific configuration
         * @param {Object} schema - Full schema for reference
         */
        constructor(config, schema) {
            this.config = config || {};
            this.schema = schema;
            this._state = {};
        }

        /**
         * Process data through this stage
         * @param {Object} context - Current processing context
         * @returns {Object} - Transformed context
         */
        process(context) {
            throw new Error('Processor.process() must be implemented');
        }

        /**
         * Reset processor state
         */
        reset() {
            this._state = {};
        }

        /**
         * Get processor name (for debugging/logging)
         */
        get name() {
            return this.constructor.name;
        }
    }

    // Export
    window.ControlDeck = window.ControlDeck || {};
    window.ControlDeck.PaddleVision = window.ControlDeck.PaddleVision || {};
    window.ControlDeck.PaddleVision.Processor = Processor;

})();
