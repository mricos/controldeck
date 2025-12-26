/**
 * ConsoleSink
 *
 * Logs controls to console for debugging.
 */
(function() {
    'use strict';

    // Ensure namespace
    if (!window.ControlDeck) window.ControlDeck = {};
    if (!window.ControlDeck.PaddleVision) window.ControlDeck.PaddleVision = {};
    const PV = window.ControlDeck.PaddleVision;

    class ConsoleSink extends PV.SinkAdapter {
        constructor(options) {
            super(options);
            this.throttle = options.throttle || 100;  // ms between logs per control
            this._lastLog = {};
        }

        async connect() {
            this._connected = true;
            return true;
        }

        disconnect() {
            this._connected = false;
        }

        emit(control, value, topic, extra) {
            const now = performance.now();
            const lastTime = this._lastLog[control] || 0;

            if (now - lastTime < this.throttle) return;

            this._lastLog[control] = now;

            console.log(
                '[PaddleVision]',
                topic + '/' + control + ':',
                value.toFixed(3),
                extra || ''
            );
        }
    }

    // Export
    PV.ConsoleSink = ConsoleSink;

})();
