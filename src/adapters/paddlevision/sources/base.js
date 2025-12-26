/**
 * SourceAdapter Base Class
 *
 * Abstracts the input source for landmark data.
 * Implementations receive raw landmark data and emit it to listeners.
 */
(function() {
    'use strict';

    // Ensure namespace
    if (!window.ControlDeck) window.ControlDeck = {};
    if (!window.ControlDeck.PaddleVision) window.ControlDeck.PaddleVision = {};

    class SourceAdapter {
        constructor(options) {
            this.options = options || {};
            this._listeners = [];
            this._running = false;
        }

        /**
         * Start receiving data
         * @returns {Promise<boolean>} - Success status
         */
        async start() {
            throw new Error('SourceAdapter.start() must be implemented');
        }

        /**
         * Stop receiving data
         */
        stop() {
            throw new Error('SourceAdapter.stop() must be implemented');
        }

        /**
         * Subscribe to landmark data
         * @param {Function} callback - (data: { landmarks, timestamp, stats }) => void
         * @returns {Function} - Unsubscribe function
         */
        onData(callback) {
            this._listeners.push(callback);
            return () => {
                const idx = this._listeners.indexOf(callback);
                if (idx !== -1) {
                    this._listeners.splice(idx, 1);
                }
            };
        }

        /**
         * Emit data to all listeners
         * @param {Object} data - { landmarks, timestamp, stats }
         */
        _emit(data) {
            for (const listener of this._listeners) {
                try {
                    listener(data);
                } catch (e) {
                    console.error('[SourceAdapter] Listener error:', e);
                }
            }
        }

        /**
         * Check if source is running
         * @returns {boolean}
         */
        isRunning() {
            return this._running;
        }

        /**
         * Get source statistics
         * @returns {Object}
         */
        getStats() {
            return {};
        }
    }

    // Export
    window.ControlDeck = window.ControlDeck || {};
    window.ControlDeck.PaddleVision = window.ControlDeck.PaddleVision || {};
    window.ControlDeck.PaddleVision.SourceAdapter = SourceAdapter;

})();
