/**
 * SmoothProcessor
 *
 * Applies exponential smoothing with deadzone to calibrated values.
 */
(function() {
    'use strict';

    // Ensure namespace
    if (!window.ControlDeck) window.ControlDeck = {};
    if (!window.ControlDeck.PaddleVision) window.ControlDeck.PaddleVision = {};
    const PV = window.ControlDeck.PaddleVision;

    class SmoothProcessor extends PV.Processor {
        constructor(config, schema) {
            super(config, schema);
            this._state = { x: 0, y: 0, theta: 0, spread: 0 };
        }

        process(context) {
            const calibrated = context.calibrated || {};
            const factor = this.config.factor ?? 0.3;
            const deadzone = this.config.deadzone ?? 0.02;

            const smooth = (current, target) => {
                const delta = target - current;
                if (Math.abs(delta) < deadzone) {
                    return current;
                }
                return current + delta * (1 - factor);
            };

            // Get values from calibrated data
            const center = calibrated['hand-center-calibrated'] || { x: 0, y: 0 };
            const theta = calibrated['hand-rotation-calibrated'] ?? 0;
            const spread = context.derived?.['finger-spread'] ?? 0;

            // Apply smoothing
            this._state.x = smooth(this._state.x, center.x);
            this._state.y = smooth(this._state.y, center.y);
            this._state.theta = smooth(this._state.theta, theta);
            this._state.spread = smooth(this._state.spread, spread);

            return {
                ...context,
                smoothed: { ...this._state }
            };
        }

        reset() {
            this._state = { x: 0, y: 0, theta: 0, spread: 0 };
        }
    }

    // Export
    PV.SmoothProcessor = SmoothProcessor;

})();
