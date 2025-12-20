/**
 * ControlDeck Engine
 * Main orchestrator that ties together all adapters
 */
(function() {
    'use strict';

    const Events = window.Terrain?.Events;
    const State = window.Terrain?.State;

    const PROTOCOL = window.ControlDeck.PROTOCOL;
    const GamepadAdapter = window.ControlDeck.GamepadAdapter;
    const MIDIAdapter = window.ControlDeck.MIDIAdapter;
    const Relay = window.ControlDeck.Relay;
    const Recorder = window.ControlDeck.Recorder;

    // Unified input event
    const INPUT_EVENT = 'controldeck:input';
    const RELAY_EVENT = 'controldeck:relay';

    class ControlDeckEngine {
        /**
         * Create engine instance
         * @param {Object} options - Configuration
         * @param {string} options.profile - Controller profile ('auto' or profile id)
         * @param {string} options.channel - Relay channel name
         * @param {string|null} options.mode - Relay mode ('sender', 'receiver', 'both', null)
         * @param {boolean} options.midi - Enable MIDI on init
         */
        constructor(options = {}) {
            this.options = {
                profile: 'auto',
                mode: null,
                channel: 'default',
                midi: false,
                ...options
            };

            // Create adapters
            this.gamepad = new GamepadAdapter(this.options.profile);
            this.midi = new MIDIAdapter();
            this.recorder = new Recorder();
            this.relay = new Relay(
                this.options.channel,
                this.options.mode,
                (e) => this._onRelay(e)
            );

            this._bindAdapters();
            this.gamepad.startPolling();

            if (this.options.midi) {
                this.midi.init();
            }
        }

        /**
         * Bind adapter events to unified input stream
         */
        _bindAdapters() {
            const Events = window.Terrain?.Events;
            if (!Events) return;

            // Gamepad events -> unified input
            Events.on(GamepadAdapter.EVENTS.BUTTON, (e) => {
                Events.emit(INPUT_EVENT, e);
                this.relay.send(e);
                this.recorder.record(e);
            });

            Events.on(GamepadAdapter.EVENTS.AXIS, (e) => {
                Events.emit(INPUT_EVENT, e);
                this.relay.send(e);
                this.recorder.record(e);
            });

            // MIDI events -> unified input
            Events.on(MIDIAdapter.EVENTS.MESSAGE, (e) => {
                Events.emit(INPUT_EVENT, e);
                this.relay.send(e);
                this.recorder.record(e);
            });
        }

        /**
         * Handle relay receive
         * @param {Object} e - Received event
         */
        _onRelay(e) {
            const Events = window.Terrain?.Events;
            if (Events) {
                Events.emit(RELAY_EVENT, e);
            }
        }

        /**
         * Set relay mode
         * @param {string|null} mode - 'sender', 'receiver', 'both', or null
         */
        setRelayMode(mode) {
            this.relay.destroy();
            this.relay = new Relay(
                this.options.channel,
                mode,
                (e) => this._onRelay(e)
            );
        }

        /**
         * Send event via relay
         * @param {Object} eventData - Event to send
         */
        send(eventData) {
            this.relay.send(eventData);
        }

        // Recording methods
        startRecording() { this.recorder.start(); }
        stopRecording() { return this.recorder.stop(); }
        exportRecording() { return this.recorder.export(); }
        importRecording(json) { this.recorder.import(json); }

        playRecording(onEvent) {
            const Events = window.Terrain?.Events;
            this.recorder.play(onEvent || ((e) => {
                if (Events) Events.emit('controldeck:playback', e);
            }));
        }

        /**
         * Get current gamepad state
         * @returns {Object|null}
         */
        getState() {
            return this.gamepad.getState();
        }

        /**
         * Get latency statistics
         * @returns {Object}
         */
        getLatency() {
            return this.gamepad.latency.getStats();
        }

        /**
         * Cleanup
         */
        destroy() {
            this.gamepad.stopPolling();
            this.relay.destroy();
        }
    }

    // Export event names
    ControlDeckEngine.EVENTS = {
        INPUT: INPUT_EVENT,
        RELAY: RELAY_EVENT
    };

    // Export
    window.ControlDeck = window.ControlDeck || {};
    window.ControlDeck.Engine = ControlDeckEngine;

})();
