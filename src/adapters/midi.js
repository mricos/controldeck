/**
 * ControlDeck MIDI Adapter
 * Web MIDI API integration with standardized events via Terrain.Events
 */
(function() {
    'use strict';

    const Events = window.Terrain?.Events;
    const PROTOCOL = window.ControlDeck.PROTOCOL;

    // Event names
    const MIDI_MESSAGE = 'controldeck:midi:message';
    const MIDI_DEVICES_CHANGED = 'controldeck:midi:devices';

    class MIDIAdapter {
        constructor() {
            this.access = null;
            this.inputs = [];
            this.outputs = [];
            this.enabled = false;
        }

        /**
         * Initialize MIDI access
         * @returns {Promise<boolean>} Success status
         */
        async init() {
            if (!navigator.requestMIDIAccess) {
                console.warn('[ControlDeck] Web MIDI API not supported');
                return false;
            }

            try {
                this.access = await navigator.requestMIDIAccess({ sysex: false });
                this._setupInputs();
                this.access.onstatechange = () => this._setupInputs();
                this.enabled = true;
                return true;
            } catch (e) {
                console.warn('[ControlDeck] MIDI access denied:', e);
                return false;
            }
        }

        /**
         * Setup input listeners
         */
        _setupInputs() {
            this.inputs = [];
            this.outputs = [];

            this.access.inputs.forEach((input) => {
                this.inputs.push(input);
                input.onmidimessage = (e) => this._handleMessage(e, input);
            });

            this.access.outputs.forEach((output) => {
                this.outputs.push(output);
            });

            if (Events) {
                Events.emit(MIDI_DEVICES_CHANGED, {
                    inputs: this.inputs,
                    outputs: this.outputs
                });
            }
        }

        /**
         * Handle incoming MIDI message
         * @param {MIDIMessageEvent} e - MIDI event
         * @param {MIDIInput} input - Source input
         */
        _handleMessage(e, input) {
            const [status, data1, data2] = e.data;
            const channel = (status & 0x0F) + 1;
            const type = status & 0xF0;

            let event = null;

            // Control Change (CC)
            if (type === 0xB0) {
                event = PROTOCOL.createEvent(
                    'midi', input.name, 'continuous',
                    `cc${data1}`, data2 / 127,
                    { status, cc: data1, value: data2 },
                    { channel }
                );
            }
            // Note On
            else if (type === 0x90 && data2 > 0) {
                event = PROTOCOL.createEvent(
                    'midi', input.name, 'trigger',
                    `note${data1}`, data2 / 127,
                    { status, note: data1, velocity: data2 },
                    { channel, pressed: true, velocity: data2 }
                );
            }
            // Note Off
            else if (type === 0x80 || (type === 0x90 && data2 === 0)) {
                event = PROTOCOL.createEvent(
                    'midi', input.name, 'trigger',
                    `note${data1}`, 0,
                    { status, note: data1, velocity: 0 },
                    { channel, pressed: false, velocity: 0 }
                );
            }
            // Pitch Bend
            else if (type === 0xE0) {
                const value = ((data2 << 7) | data1) / 16383;
                event = PROTOCOL.createEvent(
                    'midi', input.name, 'continuous',
                    'pitchbend', value,
                    { status, lsb: data1, msb: data2 },
                    { channel }
                );
            }

            if (event && Events) {
                Events.emit(MIDI_MESSAGE, event);
            }
        }

        /**
         * Send CC message
         * @param {number} channel - MIDI channel 1-16
         * @param {number} cc - CC number 0-127
         * @param {number} value - Value 0-1
         * @param {number} outputIndex - Output port index
         */
        sendCC(channel, cc, value, outputIndex = 0) {
            if (this.outputs[outputIndex]) {
                this.outputs[outputIndex].send([
                    0xB0 | (channel - 1),
                    cc,
                    Math.round(value * 127)
                ]);
            }
        }

        /**
         * Send Note message
         * @param {number} channel - MIDI channel 1-16
         * @param {number} note - Note number 0-127
         * @param {number} velocity - Velocity 0-1
         * @param {number} outputIndex - Output port index
         */
        sendNote(channel, note, velocity, outputIndex = 0) {
            if (this.outputs[outputIndex]) {
                const status = velocity > 0 ? 0x90 : 0x80;
                this.outputs[outputIndex].send([
                    status | (channel - 1),
                    note,
                    Math.round(velocity * 127)
                ]);
            }
        }
    }

    // Export event names
    MIDIAdapter.EVENTS = {
        MESSAGE: MIDI_MESSAGE,
        DEVICES_CHANGED: MIDI_DEVICES_CHANGED
    };

    // Export
    window.ControlDeck = window.ControlDeck || {};
    window.ControlDeck.MIDIAdapter = MIDIAdapter;

})();
