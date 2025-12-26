/**
 * SinkAdapter Base Class
 *
 * Abstracts the output destination for control events.
 */
(function() {
    'use strict';

    // Ensure namespace
    if (!window.ControlDeck) window.ControlDeck = {};
    if (!window.ControlDeck.PaddleVision) window.ControlDeck.PaddleVision = {};

    class SinkAdapter {
        constructor(options) {
            this.options = options || {};
            this._connected = false;
        }

        /**
         * Initialize connection
         * @returns {Promise<boolean>}
         */
        async connect() {
            throw new Error('SinkAdapter.connect() must be implemented');
        }

        /**
         * Disconnect
         */
        disconnect() {
            throw new Error('SinkAdapter.disconnect() must be implemented');
        }

        /**
         * Emit a control value
         * @param {string} control - Control name
         * @param {number} value - Normalized value 0-1
         * @param {string} topic - Topic for routing
         * @param {Object} extra - Additional metadata
         */
        emit(control, value, topic, extra) {
            throw new Error('SinkAdapter.emit() must be implemented');
        }

        /**
         * Check if connected
         * @returns {boolean}
         */
        isConnected() {
            return this._connected;
        }
    }

    // Export
    window.ControlDeck = window.ControlDeck || {};
    window.ControlDeck.PaddleVision = window.ControlDeck.PaddleVision || {};
    window.ControlDeck.PaddleVision.SinkAdapter = SinkAdapter;

})();
