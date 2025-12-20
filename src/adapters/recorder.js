/**
 * ControlDeck Recorder
 * Records and plays back input sequences
 */
(function() {
    'use strict';

    const Events = window.Terrain?.Events;

    // Event names
    const RECORDER_STARTED = 'controldeck:recorder:started';
    const RECORDER_STOPPED = 'controldeck:recorder:stopped';
    const RECORDER_PLAYBACK = 'controldeck:recorder:playback';

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

        /**
         * Start recording
         */
        start() {
            this.events = [];
            this.startTime = performance.now();
            this.recording = true;

            if (Events) {
                Events.emit(RECORDER_STARTED, { time: this.startTime });
            }
        }

        /**
         * Stop recording
         * @returns {Array} Recorded events
         */
        stop() {
            this.recording = false;

            if (Events) {
                Events.emit(RECORDER_STOPPED, {
                    events: this.events,
                    duration: performance.now() - this.startTime
                });
            }

            return this.events;
        }

        /**
         * Record an event
         * @param {Object} event - Event to record
         */
        record(event) {
            if (!this.recording) return;

            this.events.push({
                t: performance.now() - this.startTime,
                event: event
            });
        }

        /**
         * Play back recorded events
         * @param {Function} onEvent - Callback for each event
         */
        play(onEvent) {
            if (!this.events.length) return;

            this.playing = true;
            this.playbackIndex = 0;
            this.playbackStart = performance.now();
            this.onPlaybackEvent = onEvent;
            this._playNext();
        }

        /**
         * Play next event in sequence
         */
        _playNext() {
            if (!this.playing || this.playbackIndex >= this.events.length) {
                this.playing = false;
                return;
            }

            const entry = this.events[this.playbackIndex];
            const elapsed = performance.now() - this.playbackStart;
            const delay = entry.t - elapsed;

            if (delay <= 0) {
                this._emitPlayback(entry.event);
                this.playbackIndex++;
                this._playNext();
            } else {
                setTimeout(() => {
                    this._emitPlayback(entry.event);
                    this.playbackIndex++;
                    this._playNext();
                }, delay);
            }
        }

        /**
         * Emit playback event
         * @param {Object} event - Event being played
         */
        _emitPlayback(event) {
            if (Events) {
                Events.emit(RECORDER_PLAYBACK, event);
            }

            if (this.onPlaybackEvent) {
                this.onPlaybackEvent(event);
            }
        }

        /**
         * Stop playback
         */
        stopPlayback() {
            this.playing = false;
        }

        /**
         * Export recording as JSON
         * @returns {string} JSON string
         */
        export() {
            return JSON.stringify({
                version: 1,
                events: this.events
            }, null, 2);
        }

        /**
         * Import recording from JSON
         * @param {string|Object} json - JSON string or object
         */
        import(json) {
            const data = typeof json === 'string' ? JSON.parse(json) : json;
            this.events = data.events || [];
        }
    }

    // Export event names
    Recorder.EVENTS = {
        STARTED: RECORDER_STARTED,
        STOPPED: RECORDER_STOPPED,
        PLAYBACK: RECORDER_PLAYBACK
    };

    // Export
    window.ControlDeck = window.ControlDeck || {};
    window.ControlDeck.Recorder = Recorder;

})();
