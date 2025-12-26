/**
 * FlickDetectProcessor
 *
 * Detects flick gestures from theta velocity.
 */
(function() {
    'use strict';

    // Ensure namespace
    if (!window.ControlDeck) window.ControlDeck = {};
    if (!window.ControlDeck.PaddleVision) window.ControlDeck.PaddleVision = {};
    const PV = window.ControlDeck.PaddleVision;

    class FlickDetectProcessor extends PV.Processor {
        constructor(config, schema) {
            super(config, schema);
            this._state = { lastTheta: 0, velocity: 0 };
        }

        process(context) {
            const smoothed = context.smoothed || {};
            const theta = smoothed.theta ?? 0;

            const decay = this.config.decay ?? 0.85;
            const threshold = this.config.threshold ?? 0.15;

            // Compute velocity
            const velocity = theta - this._state.lastTheta;
            this._state.lastTheta = theta;

            // Apply decay to accumulated velocity
            this._state.velocity = this._state.velocity * decay + velocity;

            // Compute flick amount and direction
            const amount = Math.min(1, Math.abs(this._state.velocity) / threshold);
            const direction = Math.sign(this._state.velocity);

            return {
                ...context,
                gestures: {
                    ...context.gestures,
                    flick: {
                        amount,
                        direction,
                        velocity: this._state.velocity
                    }
                }
            };
        }

        reset() {
            this._state = { lastTheta: 0, velocity: 0 };
        }
    }

    // Export
    PV.FlickDetectProcessor = FlickDetectProcessor;

})();
