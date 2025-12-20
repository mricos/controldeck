/**
 * ControlDeck Relay
 * BroadcastChannel-based inter-window communication
 */
(function() {
    'use strict';

    const Events = window.Terrain?.Events;

    // Event names
    const RELAY_MESSAGE = 'controldeck:relay:message';

    class Relay {
        /**
         * Create a relay for cross-window communication
         * @param {string} channelName - Channel identifier
         * @param {string|null} mode - 'sender', 'receiver', 'both', or null
         * @param {Function|null} onReceive - Legacy callback for received messages
         */
        constructor(channelName, mode, onReceive) {
            this.channelName = channelName;
            this.mode = mode;
            this.channel = null;
            this.onReceive = onReceive;
            this.latencies = [];

            if (mode && typeof BroadcastChannel !== 'undefined') {
                this.channel = new BroadcastChannel(`controldeck-${channelName}`);

                if (mode === 'receiver' || mode === 'both') {
                    this.channel.onmessage = (e) => this._handleMessage(e);
                }
            }
        }

        /**
         * Send event data to other windows
         * @param {Object} eventData - ControlDeck event object
         */
        send(eventData) {
            if (this.channel && (this.mode === 'sender' || this.mode === 'both')) {
                this.channel.postMessage({
                    ...eventData,
                    _src: 'controldeck',
                    _t: performance.now()
                });
            }
        }

        /**
         * Handle received message
         * @param {MessageEvent} e - BroadcastChannel message
         */
        _handleMessage(e) {
            if (e.data._src !== 'controldeck') return;

            const latency = performance.now() - e.data._t;
            this.latencies.push(latency);
            if (this.latencies.length > 60) {
                this.latencies.shift();
            }

            const eventData = { ...e.data, _relayLatency: latency };

            // Emit via Terrain.Events
            if (Events) {
                Events.emit(RELAY_MESSAGE, eventData);
            }

            // Legacy callback
            if (this.onReceive) {
                this.onReceive(eventData);
            }
        }

        /**
         * Get average relay latency
         * @returns {number} Average latency in ms
         */
        getAvgLatency() {
            return this.latencies.length
                ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
                : 0;
        }

        /**
         * Close the channel
         */
        destroy() {
            if (this.channel) {
                this.channel.close();
                this.channel = null;
            }
        }
    }

    // Export event names
    Relay.EVENTS = {
        MESSAGE: RELAY_MESSAGE
    };

    // Export
    window.ControlDeck = window.ControlDeck || {};
    window.ControlDeck.Relay = Relay;

})();
