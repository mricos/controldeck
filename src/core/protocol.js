/**
 * ControlDeck Protocol
 * Standardized event format for control input messages
 */
(function() {
    'use strict';

    const PROTOCOL = {
        name: 'controldeck',
        version: 1,

        /**
         * Create a standardized control event
         * @param {string} source - 'gamepad', 'midi', 'ai', etc.
         * @param {string} device - Device identifier
         * @param {string} type - 'trigger' (button) or 'continuous' (axis)
         * @param {string} control - Control name (e.g., 'a', 'left-y', 'cc64')
         * @param {number} value - Normalized value 0-1
         * @param {Object} raw - Raw input data
         * @param {Object} extras - Additional properties (pressed, channel, etc.)
         * @returns {Object} Standardized event object
         */
        createEvent: function(source, device, type, control, value, raw, extras) {
            return {
                _src: 'controldeck',
                _v: 1,
                _t: performance.now(),
                source,
                device,
                type,
                control,
                value,
                raw,
                ...(extras || {})
            };
        },

        /**
         * Validate that an object is a ControlDeck event
         * @param {Object} obj - Object to validate
         * @returns {boolean}
         */
        isValid: function(obj) {
            return obj && obj._src === 'controldeck' && obj._v === 1;
        }
    };

    // Export
    window.ControlDeck = window.ControlDeck || {};
    window.ControlDeck.PROTOCOL = PROTOCOL;

})();
