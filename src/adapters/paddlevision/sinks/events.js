/**
 * EventsSink
 *
 * Emits controls via Terrain.Events (local pub/sub).
 */
(function() {
    'use strict';

    // Ensure namespace
    if (!window.ControlDeck) window.ControlDeck = {};
    if (!window.ControlDeck.PaddleVision) window.ControlDeck.PaddleVision = {};
    const PV = window.ControlDeck.PaddleVision;

    class EventsSink extends PV.SinkAdapter {
        constructor(options) {
            super(options);
            this.eventPrefix = options.eventPrefix || 'paddlevision';
        }

        async connect() {
            this._connected = !!(window.Terrain && window.Terrain.Events);
            return this._connected;
        }

        disconnect() {
            this._connected = false;
        }

        emit(control, value, topic, extra) {
            const Events = window.Terrain?.Events;
            if (!Events) return;

            topic = topic || 'hand';
            extra = extra || {};

            Events.emit(this.eventPrefix + ':' + control, {
                control: control,
                value: value,
                topic: topic,
                timestamp: performance.now(),
                raw: extra.raw,
                calibrated: extra.calibrated
            });
        }
    }

    // Export
    PV.EventsSink = EventsSink;

})();
