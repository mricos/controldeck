/**
 * HubSink
 *
 * Emits controls via ControlDeck Hub (SharedWorker).
 */
(function() {
    'use strict';

    // Ensure namespace
    if (!window.ControlDeck) window.ControlDeck = {};
    if (!window.ControlDeck.PaddleVision) window.ControlDeck.PaddleVision = {};
    const PV = window.ControlDeck.PaddleVision;

    class HubSink extends PV.SinkAdapter {
        constructor(options) {
            super(options);
            this.hub = options.hub || null;
        }

        async connect() {
            if (this.hub && this.hub.isConnected()) {
                this._connected = true;
                return true;
            }
            this._connected = false;
            return false;
        }

        disconnect() {
            this._connected = false;
        }

        emit(control, value, topic, extra) {
            if (!this.hub || !this.hub.isConnected()) return;

            topic = topic || 'hand';
            extra = extra || {};

            this.hub.continuous(control, value, topic, extra.raw || null);
        }

        /**
         * Set hub instance
         * @param {Hub} hub
         */
        setHub(hub) {
            this.hub = hub;
            this._connected = hub && hub.isConnected();
        }
    }

    // Export
    PV.HubSink = HubSink;

})();
