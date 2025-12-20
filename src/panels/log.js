/**
 * ControlDeck Log Panel
 * Event logging with timing statistics
 */
(function() {
    'use strict';

    const Events = window.Terrain?.Events;
    const State = window.Terrain?.State;

    // State paths
    const STATE_PREFIX = 'controldeck.log';

    /**
     * Timing tracker for delta/stddev/BPM detection
     */
    class TimingTracker {
        constructor(windowSize = 32) {
            this.windowSize = windowSize;
            this.sources = new Map();
        }

        record(control, value) {
            const now = performance.now();

            if (!this.sources.has(control)) {
                this.sources.set(control, {
                    times: [],
                    deltas: [],
                    lastValue: null,
                    toggleCount: 0
                });
            }

            const src = this.sources.get(control);

            // Track value toggles
            if (src.lastValue !== null && src.lastValue !== value) {
                src.toggleCount++;
            }
            src.lastValue = value;

            // Calculate delta
            let delta = null;
            if (src.times.length > 0) {
                delta = now - src.times[src.times.length - 1];
                src.deltas.push(delta);
                if (src.deltas.length > this.windowSize) {
                    src.deltas.shift();
                }
            }

            src.times.push(now);
            if (src.times.length > this.windowSize) {
                src.times.shift();
            }

            return { delta, stats: this.getStats(control) };
        }

        getStats(control) {
            const src = this.sources.get(control);
            if (!src || src.deltas.length < 2) {
                return { mean: null, stddev: null, bpm: null, isPeriodic: false };
            }

            const deltas = src.deltas;
            const n = deltas.length;
            const mean = deltas.reduce((a, b) => a + b, 0) / n;
            const variance = deltas.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
            const stddev = Math.sqrt(variance);

            // Coefficient of variation
            const cv = mean > 0 ? stddev / mean : 1;
            const isPeriodic = n >= 4 && cv < 0.25;

            // BPM if periodic
            let bpm = null;
            if (isPeriodic && mean > 0) {
                bpm = 60000 / mean;
                if (bpm < 20 || bpm > 300) bpm = null;
            }

            return { mean, stddev, bpm, isPeriodic, cv, sampleCount: n };
        }

        reset() {
            this.sources.clear();
        }
    }

    // Log options
    const logOptions = {
        delta: true,
        stddev: false,
        bpm: false
    };

    // Shared tracker
    const timingTracker = new TimingTracker();

    // Log entries (for state)
    let entries = [];
    const MAX_ENTRIES = 100;

    /**
     * Add log entry
     * @param {string} msg - Message text
     * @param {string} type - Entry type (info, press, release, midi, relay)
     * @param {Object} timing - Optional timing data
     */
    function log(msg, type = 'info', timing = null) {
        const time = new Date().toTimeString().split(' ')[0];

        const entry = {
            time,
            msg,
            type,
            delta: timing?.delta,
            stddev: timing?.stats?.stddev,
            bpm: timing?.stats?.bpm
        };

        entries.push(entry);
        if (entries.length > MAX_ENTRIES) {
            entries.shift();
        }

        // Emit for UI update
        if (Events) {
            Events.emit('controldeck:log:entry', entry);
        }
    }

    /**
     * Format log entry as HTML
     * @param {Object} entry - Log entry
     * @returns {string} HTML string
     */
    function formatEntry(entry) {
        let extras = '';

        if (logOptions.delta && entry.delta !== null && entry.delta !== undefined) {
            extras += ` <span class="log-delta">dt:${entry.delta.toFixed(1)}ms</span>`;
        }
        if (logOptions.stddev && entry.stddev !== null && entry.stddev !== undefined) {
            extras += ` <span class="log-stddev">σ:${entry.stddev.toFixed(1)}</span>`;
        }
        if (logOptions.bpm && entry.bpm !== null && entry.bpm !== undefined) {
            extras += ` <span class="log-bpm">${entry.bpm.toFixed(1)} BPM</span>`;
        }

        return `<div class="log-entry ${entry.type}">` +
            `<span class="log-time">[${entry.time}]</span>` +
            `<span class="log-msg">${entry.msg}</span>${extras}</div>`;
    }

    /**
     * Setup log panel
     */
    function setup() {
        if (!Events) return;

        const Engine = window.ControlDeck?.Engine;
        const GamepadAdapter = window.ControlDeck?.GamepadAdapter;
        const MIDIAdapter = window.ControlDeck?.MIDIAdapter;

        // Gamepad connected
        if (GamepadAdapter) {
            Events.on(GamepadAdapter.EVENTS.CONNECTED, (e) => {
                log(`Connected: ${e.profile.name}`, 'info');
            });
        }

        // Input events
        if (Engine) {
            Events.on(Engine.EVENTS.INPUT, (e) => {
                const controlKey = `${e.source}:${e.control}`;
                const timing = timingTracker.record(controlKey, e.value);

                if (e.source === 'gamepad' && e.type === 'trigger') {
                    log(`${e.control} ${e.pressed ? 'pressed' : 'released'}`,
                        e.pressed ? 'press' : 'release', timing);
                } else if (e.source === 'midi') {
                    log(`MIDI ${e.control}: ${e.value.toFixed(2)}`, 'midi', timing);
                }
            });

            Events.on(Engine.EVENTS.RELAY, (e) => {
                log(`[relay] ${e.control} (${e._relayLatency?.toFixed(1)}ms)`, 'relay');
            });
        }
    }

    /**
     * Clear log
     */
    function clear() {
        entries = [];
        timingTracker.reset();
        if (Events) {
            Events.emit('controldeck:log:clear', {});
        }
    }

    /**
     * Set log option
     * @param {string} key - Option name
     * @param {boolean} value - Option value
     */
    function setOption(key, value) {
        if (key in logOptions) {
            logOptions[key] = value;
        }
    }

    // Export
    window.ControlDeck = window.ControlDeck || {};
    window.ControlDeck.Panels = window.ControlDeck.Panels || {};
    window.ControlDeck.Panels.Log = {
        setup,
        log,
        clear,
        formatEntry,
        setOption,
        getEntries: () => entries,
        timingTracker
    };

})();
