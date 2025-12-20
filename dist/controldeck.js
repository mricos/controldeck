/**
 * ControlDeck v0.2.0
 * Universal control input debugging, relay, and recording tool
 * Supports: Gamepad, MIDI CC, OSC (future)
 * Protocol: controldeck-v1
 */
const ControlDeck = (function() {
    'use strict';

    const VERSION = '0.2.0';

    // ========================================================================
    // PROTOCOL
    // ========================================================================
    const PROTOCOL = {
        name: 'controldeck',
        version: 1,
        createEvent: function(source, device, type, control, value, raw, extras) {
            return {
                _src: 'controldeck',
                _v: 1,
                _t: performance.now(),
                source, device, type, control, value, raw,
                ...(extras || {})
            };
        }
    };

    // ========================================================================
    // PROFILES
    // ========================================================================
    const PROFILES = {
        'generic': {
            id: 'generic', name: 'Generic Controller', match: [], diagram: 'classic',
            mapping: { 'a': 0, 'b': 1, 'x': 2, 'y': 3, 'l': 4, 'r': 5, 'l2': 6, 'r2': 7,
                       'select': 8, 'start': 9, 'l3': 10, 'r3': 11,
                       'dpad-up': 12, 'dpad-down': 13, 'dpad-left': 14, 'dpad-right': 15, 'home': 16 },
            axes: { 'left-x': 0, 'left-y': 1, 'right-x': 2, 'right-y': 3 },
            deadzone: 0.1
        },
        '8bitdo-sn30-pro': {
            id: '8bitdo-sn30-pro', name: '8BitDo SN30 Pro',
            match: ['8BitDo SN30 Pro', '8Bitdo SF30', '8BitDo SN30'], diagram: 'classic',
            mapping: { 'a': 0, 'b': 1, 'x': 2, 'y': 3, 'l': 4, 'r': 5, 'l2': 6, 'r2': 7,
                       'select': 8, 'start': 9, 'l3': 10, 'r3': 11,
                       'dpad-up': 12, 'dpad-down': 13, 'dpad-left': 14, 'dpad-right': 15,
                       'home': 16, 'star': 17 },
            axes: { 'left-x': 0, 'left-y': 1, 'right-x': 2, 'right-y': 3 },
            deadzone: 0.08
        },
        'xbox': {
            id: 'xbox', name: 'Xbox Controller',
            match: ['Xbox', 'Microsoft', 'XInput'], diagram: 'modern-asym',
            mapping: { 'a': 0, 'b': 1, 'x': 2, 'y': 3, 'l': 4, 'r': 5, 'l2': 6, 'r2': 7,
                       'select': 8, 'start': 9, 'l3': 10, 'r3': 11,
                       'dpad-up': 12, 'dpad-down': 13, 'dpad-left': 14, 'dpad-right': 15, 'home': 16 },
            axes: { 'left-x': 0, 'left-y': 1, 'right-x': 2, 'right-y': 3 },
            deadzone: 0.12
        },
        'ps4': {
            id: 'ps4', name: 'PlayStation 4 Controller',
            match: ['DualShock 4', 'PS4', 'Wireless Controller'], diagram: 'modern-sym',
            mapping: { 'a': 0, 'b': 1, 'x': 2, 'y': 3, 'l': 4, 'r': 5, 'l2': 6, 'r2': 7,
                       'select': 8, 'start': 9, 'l3': 10, 'r3': 11,
                       'dpad-up': 12, 'dpad-down': 13, 'dpad-left': 14, 'dpad-right': 15,
                       'home': 16, 'touchpad': 17 },
            axes: { 'left-x': 0, 'left-y': 1, 'right-x': 2, 'right-y': 3 },
            deadzone: 0.08
        },
        'switch-pro': {
            id: 'switch-pro', name: 'Switch Pro Controller',
            match: ['Pro Controller', 'Nintendo'], diagram: 'modern-asym',
            mapping: { 'a': 1, 'b': 0, 'x': 3, 'y': 2, 'l': 4, 'r': 5, 'l2': 6, 'r2': 7,
                       'select': 8, 'start': 9, 'l3': 10, 'r3': 11,
                       'dpad-up': 12, 'dpad-down': 13, 'dpad-left': 14, 'dpad-right': 15,
                       'home': 16, 'capture': 17 },
            axes: { 'left-x': 0, 'left-y': 1, 'right-x': 2, 'right-y': 3 },
            deadzone: 0.1
        }
    };

    // ========================================================================
    // EVENT EMITTER
    // ========================================================================
    class EventEmitter {
        constructor() { this._events = {}; }
        on(event, fn) { (this._events[event] = this._events[event] || []).push(fn); return this; }
        off(event, fn) { if (this._events[event]) this._events[event] = this._events[event].filter(f => f !== fn); return this; }
        emit(event, ...args) { (this._events[event] || []).forEach(fn => fn(...args)); return this; }
    }

    // ========================================================================
    // LATENCY TRACKER
    // ========================================================================
    class LatencyTracker {
        constructor(sampleSize = 120) {
            this.sampleSize = sampleSize;
            this.pollTimes = [];
            this.inputAges = [];
            this.lastPollTime = null;
        }

        recordPoll(gamepadTimestamp) {
            const now = performance.now();
            if (this.lastPollTime !== null) {
                this.pollTimes.push(now - this.lastPollTime);
                if (this.pollTimes.length > this.sampleSize) this.pollTimes.shift();
            }
            this.lastPollTime = now;
            if (gamepadTimestamp) {
                const age = now - gamepadTimestamp;
                if (age >= 0 && age < 500) {
                    this.inputAges.push(age);
                    if (this.inputAges.length > this.sampleSize) this.inputAges.shift();
                }
            }
        }

        getStats() {
            const calc = (arr) => {
                if (!arr.length) return { avg: 0, min: 0, max: 0, jitter: 0, p50: 0, p95: 0, p99: 0 };
                const sorted = [...arr].sort((a, b) => a - b);
                const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
                const variance = arr.reduce((acc, v) => acc + (v - avg) ** 2, 0) / arr.length;
                return {
                    avg, min: sorted[0], max: sorted[sorted.length - 1],
                    jitter: Math.sqrt(variance),
                    p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
                    p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
                    p99: sorted[Math.floor(sorted.length * 0.99)] || 0
                };
            };
            return {
                pollRate: this.pollTimes.length && this.pollTimes.reduce((a,b)=>a+b,0)/this.pollTimes.length > 0 
                    ? 1000 / (this.pollTimes.reduce((a,b)=>a+b,0)/this.pollTimes.length) : 0,
                inputAge: calc(this.inputAges),
                sparklineData: this.inputAges.slice(-60)
            };
        }

        reset() { this.pollTimes = []; this.inputAges = []; this.lastPollTime = null; }
    }

    // ========================================================================
    // RELAY (BroadcastChannel)
    // ========================================================================
    class Relay {
        constructor(channelName, mode, onReceive) {
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

        send(eventData) {
            if (this.channel && (this.mode === 'sender' || this.mode === 'both')) {
                this.channel.postMessage({ ...eventData, _src: 'controldeck', _t: performance.now() });
            }
        }

        _handleMessage(e) {
            if (e.data._src !== 'controldeck') return;
            const latency = performance.now() - e.data._t;
            this.latencies.push(latency);
            if (this.latencies.length > 60) this.latencies.shift();
            if (this.onReceive) this.onReceive({ ...e.data, _relayLatency: latency });
        }

        getAvgLatency() {
            return this.latencies.length ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length : 0;
        }

        destroy() { if (this.channel) { this.channel.close(); this.channel = null; } }
    }

    // ========================================================================
    // RECORDER
    // ========================================================================
    class Recorder {
        constructor() {
            this.recording = false;
            this.playing = false;
            this.events = [];
            this.startTime = 0;
            this.playbackIndex = 0;
            this.playbackStart = 0;
            this.onPlaybackEvent = null;
        }

        start() {
            this.events = [];
            this.startTime = performance.now();
            this.recording = true;
        }

        stop() {
            this.recording = false;
            return this.events;
        }

        record(event) {
            if (!this.recording) return;
            this.events.push({
                t: performance.now() - this.startTime,
                event: event
            });
        }

        play(onEvent) {
            if (!this.events.length) return;
            this.playing = true;
            this.playbackIndex = 0;
            this.playbackStart = performance.now();
            this.onPlaybackEvent = onEvent;
            this._playNext();
        }

        _playNext() {
            if (!this.playing || this.playbackIndex >= this.events.length) {
                this.playing = false;
                return;
            }
            const entry = this.events[this.playbackIndex];
            const elapsed = performance.now() - this.playbackStart;
            const delay = entry.t - elapsed;
            if (delay <= 0) {
                if (this.onPlaybackEvent) this.onPlaybackEvent(entry.event);
                this.playbackIndex++;
                this._playNext();
            } else {
                setTimeout(() => {
                    if (this.onPlaybackEvent) this.onPlaybackEvent(entry.event);
                    this.playbackIndex++;
                    this._playNext();
                }, delay);
            }
        }

        stopPlayback() { this.playing = false; }

        export() {
            return JSON.stringify({ version: 1, events: this.events }, null, 2);
        }

        import(json) {
            const data = typeof json === 'string' ? JSON.parse(json) : json;
            this.events = data.events || [];
        }
    }

    // ========================================================================
    // MIDI ADAPTER
    // ========================================================================
    class MIDIAdapter extends EventEmitter {
        constructor() {
            super();
            this.access = null;
            this.inputs = [];
            this.outputs = [];
            this.enabled = false;
        }

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

        _setupInputs() {
            this.inputs = [];
            this.access.inputs.forEach((input) => {
                this.inputs.push(input);
                input.onmidimessage = (e) => this._handleMessage(e, input);
            });
            this.access.outputs.forEach((output) => this.outputs.push(output));
            this.emit('deviceschanged', { inputs: this.inputs, outputs: this.outputs });
        }

        _handleMessage(e, input) {
            const [status, data1, data2] = e.data;
            const channel = (status & 0x0F) + 1;
            const type = status & 0xF0;

            let event = null;

            if (type === 0xB0) {
                event = PROTOCOL.createEvent(
                    'midi', input.name, 'continuous',
                    `cc${data1}`, data2 / 127,
                    { status, cc: data1, value: data2 },
                    { channel }
                );
            } else if (type === 0x90 && data2 > 0) {
                event = PROTOCOL.createEvent(
                    'midi', input.name, 'trigger',
                    `note${data1}`, data2 / 127,
                    { status, note: data1, velocity: data2 },
                    { channel, pressed: true, velocity: data2 }
                );
            } else if (type === 0x80 || (type === 0x90 && data2 === 0)) {
                event = PROTOCOL.createEvent(
                    'midi', input.name, 'trigger',
                    `note${data1}`, 0,
                    { status, note: data1, velocity: 0 },
                    { channel, pressed: false, velocity: 0 }
                );
            } else if (type === 0xE0) {
                const value = ((data2 << 7) | data1) / 16383;
                event = PROTOCOL.createEvent(
                    'midi', input.name, 'continuous',
                    'pitchbend', value,
                    { status, lsb: data1, msb: data2 },
                    { channel }
                );
            }

            if (event) this.emit('message', event);
        }

        sendCC(channel, cc, value, outputIndex = 0) {
            if (this.outputs[outputIndex]) {
                this.outputs[outputIndex].send([0xB0 | (channel - 1), cc, Math.round(value * 127)]);
            }
        }

        sendNote(channel, note, velocity, outputIndex = 0) {
            if (this.outputs[outputIndex]) {
                const status = velocity > 0 ? 0x90 : 0x80;
                this.outputs[outputIndex].send([status | (channel - 1), note, Math.round(velocity * 127)]);
            }
        }
    }

    // ========================================================================
    // GAMEPAD ADAPTER
    // ========================================================================
    class GamepadAdapter extends EventEmitter {
        constructor(profile = 'generic') {
            super();
            this.activeGamepad = null;
            this.profile = PROFILES[profile] || PROFILES['generic'];
            this.prevButtons = {};
            this.prevAxes = {};
            this.latency = new LatencyTracker();
            this.polling = false;
        }

        setProfile(profileId) {
            this.profile = PROFILES[profileId] || PROFILES['generic'];
            this.emit('profilechange', this.profile);
        }

        detectProfile(gamepadId) {
            for (const [key, profile] of Object.entries(PROFILES)) {
                if (profile.match.some(m => gamepadId.includes(m))) return profile;
            }
            return PROFILES['generic'];
        }

        startPolling() {
            if (this.polling) return;
            this.polling = true;
            this._poll();
        }

        stopPolling() { this.polling = false; }

        _poll() {
            if (!this.polling) return;
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            let gp = this.activeGamepad !== null ? gamepads[this.activeGamepad] : null;

            if (!gp || !gp.connected) {
                for (let i = 0; i < gamepads.length; i++) {
                    if (gamepads[i] && gamepads[i].connected) {
                        this.activeGamepad = i;
                        gp = gamepads[i];
                        this.profile = this.detectProfile(gp.id);
                        this.emit('connected', { gamepad: gp, profile: this.profile });
                        break;
                    }
                }
            }

            if (gp && gp.connected) {
                this.latency.recordPoll(gp.timestamp);
                this._processState(gp);
            }

            requestAnimationFrame(() => this._poll());
        }

        _processState(gp) {
            const mapping = this.profile.mapping;
            const deadzone = this.profile.deadzone || 0.1;

            gp.buttons.forEach((btn, idx) => {
                const pressed = btn.pressed || btn.value > 0.5;
                const wasPressed = this.prevButtons[idx] || false;
                if (pressed !== wasPressed) {
                    const name = Object.entries(mapping).find(([k, v]) => v === idx)?.[0] || `btn${idx}`;
                    const event = PROTOCOL.createEvent(
                        'gamepad', gp.id, 'trigger', name, pressed ? 1 : 0,
                        { index: idx, value: btn.value },
                        { pressed, channel: gp.index }
                    );
                    this.emit('button', event);
                }
                this.prevButtons[idx] = pressed;
            });

            const axesMap = this.profile.axes;
            gp.axes.forEach((val, idx) => {
                const name = Object.entries(axesMap).find(([k, v]) => v === idx)?.[0] || `axis${idx}`;
                const applied = Math.abs(val) < deadzone ? 0 : val;
                const prevApplied = Math.abs(this.prevAxes[idx] || 0) < deadzone ? 0 : (this.prevAxes[idx] || 0);
                if (Math.abs(applied - prevApplied) > 0.01) {
                    const event = PROTOCOL.createEvent(
                        'gamepad', gp.id, 'continuous', name, (applied + 1) / 2,
                        { index: idx, value: val },
                        { channel: gp.index }
                    );
                    this.emit('axis', event);
                }
                this.prevAxes[idx] = val;
            });
        }

        getState() {
            if (this.activeGamepad === null) return null;
            const gp = navigator.getGamepads()[this.activeGamepad];
            if (!gp) return null;
            return {
                id: gp.id, index: gp.index,
                buttons: gp.buttons.map(b => ({ pressed: b.pressed, value: b.value })),
                axes: [...gp.axes],
                profile: this.profile.id,
                latency: this.latency.getStats()
            };
        }
    }

    // ========================================================================
    // AI CONTROLLER - Generates synthetic input for games
    // ========================================================================
    class AIController extends EventEmitter {
        constructor(options = {}) {
            super();
            this.running = false;
            this.intervalId = null;
            this.tickRate = options.tickRate || 60; // Hz
            this.config = null;
            this.state = {};
        }

        // Load a game configuration
        loadConfig(config) {
            this.config = config;
            this.state = config.initialState ? { ...config.initialState } : {};
            this.emit('configloaded', config);
        }

        start() {
            if (this.running || !this.config) return;
            this.running = true;
            const interval = 1000 / this.tickRate;
            this.intervalId = setInterval(() => this._tick(), interval);
            this.emit('started');
        }

        stop() {
            if (!this.running) return;
            this.running = false;
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            this.emit('stopped');
        }

        _tick() {
            if (!this.config || !this.config.tick) return;
            const outputs = this.config.tick(this.state, this.config.params || {});
            if (outputs) {
                this.emit('output', outputs);
            }
        }

        // Update game state from external source (e.g., game sends ball position)
        updateState(newState) {
            Object.assign(this.state, newState);
        }

        setParam(key, value) {
            if (this.config && this.config.params) {
                this.config.params[key] = value;
            }
        }
    }

    // ========================================================================
    // GAME CONFIGS - Predefined AI behaviors for games
    // ========================================================================
    const GAME_CONFIGS = {
        'pong': {
            name: 'Pong AI',
            channel: 'pong',  // BroadcastChannel name - matches PJA.Deck channel
            description: 'AI controller for Pong - tracks ball and moves paddles (works with PJA SDK)',
            params: {
                p1Enabled: true,
                p2Enabled: true,
                p1Skill: 0.8,      // 0-1, reaction accuracy
                p2Skill: 0.8,
                p1Delay: 50,       // ms reaction delay
                p2Delay: 50,
                predictionNoise: 0.1  // Adds human-like imperfection
            },
            initialState: {
                ballX: 350, ballY: 200, ballVx: 5, ballVy: 2,
                p1Y: 200, p2Y: 200,
                canvasWidth: 700, canvasHeight: 400,
                paddleHeight: 80
            },
            tick: function(state, params) {
                const outputs = { axes: [0, 0, 0, 0] }; // [lx, ly, rx, ry]

                // Predict where ball will be when it reaches each paddle
                const predictBallY = (targetX) => {
                    if (state.ballVx === 0) return state.ballY;
                    const timeToTarget = (targetX - state.ballX) / state.ballVx;
                    if (timeToTarget < 0) return state.ballY; // Ball moving away
                    let predictedY = state.ballY + state.ballVy * timeToTarget;
                    // Simulate bounces
                    while (predictedY < 0 || predictedY > state.canvasHeight) {
                        if (predictedY < 0) predictedY = -predictedY;
                        if (predictedY > state.canvasHeight) predictedY = 2 * state.canvasHeight - predictedY;
                    }
                    // Add noise for imperfection
                    predictedY += (Math.random() - 0.5) * params.predictionNoise * state.paddleHeight;
                    return predictedY;
                };

                // P1 (left paddle) - uses left stick Y (axis 1)
                if (params.p1Enabled && state.ballVx < 0) {
                    const targetY = predictBallY(24); // Left paddle x position
                    const diff = targetY - state.p1Y;
                    const threshold = state.paddleHeight * 0.3 * (1 - params.p1Skill);
                    if (Math.abs(diff) > threshold) {
                        outputs.axes[1] = Math.sign(diff) * Math.min(1, Math.abs(diff) / 100) * params.p1Skill;
                    }
                }

                // P2 (right paddle) - uses right stick Y (axis 3)
                if (params.p2Enabled && state.ballVx > 0) {
                    const targetY = predictBallY(state.canvasWidth - 24);
                    const diff = targetY - state.p2Y;
                    const threshold = state.paddleHeight * 0.3 * (1 - params.p2Skill);
                    if (Math.abs(diff) > threshold) {
                        outputs.axes[3] = Math.sign(diff) * Math.min(1, Math.abs(diff) / 100) * params.p2Skill;
                    }
                }

                return outputs;
            }
        }
    };

    // ========================================================================
    // MAIN ENGINE
    // ========================================================================
    class ControlDeckEngine extends EventEmitter {
        constructor(options = {}) {
            super();
            this.options = {
                container: null,
                headless: false,
                profile: 'auto',
                mode: null,
                channel: 'default',
                midi: false,
                ...options
            };

            this.gamepad = new GamepadAdapter(this.options.profile);
            this.midi = new MIDIAdapter();
            this.recorder = new Recorder();
            this.relay = new Relay(this.options.channel, this.options.mode, (e) => this._onRelay(e));

            this._bindAdapters();
            this.gamepad.startPolling();

            if (this.options.midi) this.midi.init();
        }

        _bindAdapters() {
            this.gamepad.on('button', (e) => {
                this.emit('input', e);
                this.relay.send(e);
                this.recorder.record(e);
            });
            this.gamepad.on('axis', (e) => {
                this.emit('input', e);
                this.relay.send(e);
                this.recorder.record(e);
            });
            this.gamepad.on('connected', (e) => this.emit('connected', e));

            this.midi.on('message', (e) => {
                this.emit('input', e);
                this.relay.send(e);
                this.recorder.record(e);
            });
        }

        _onRelay(e) {
            this.emit('relay', e);
        }

        setRelayMode(mode) {
            this.relay.destroy();
            this.relay = new Relay(this.options.channel, mode, (e) => this._onRelay(e));
        }

        startRecording() { this.recorder.start(); }
        stopRecording() { return this.recorder.stop(); }
        playRecording(onEvent) { this.recorder.play(onEvent || ((e) => this.emit('playback', e))); }
        exportRecording() { return this.recorder.export(); }
        importRecording(json) { this.recorder.import(json); }

        send(eventData) { this.relay.send(eventData); }
        getState() { return this.gamepad.getState(); }
        getLatency() { return this.gamepad.latency.getStats(); }

        destroy() {
            this.gamepad.stopPolling();
            this.relay.destroy();
        }
    }

    // ========================================================================
    // INIT
    // ========================================================================
    function init(options = {}) {
        return new ControlDeckEngine(options);
    }

    return {
        init,
        PROTOCOL,
        PROFILES,
        GAME_CONFIGS,
        GamepadAdapter,
        MIDIAdapter,
        Recorder,
        Relay,
        LatencyTracker,
        AIController,
        version: VERSION
    };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ControlDeck;
