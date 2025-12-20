/**
 * ControlDeck Gamepad Adapter
 * Polls Gamepad API and emits standardized events via Terrain.Events
 */
(function() {
    'use strict';

    const Events = window.Terrain?.Events;
    const PROTOCOL = window.ControlDeck.PROTOCOL;
    const PROFILES = window.ControlDeck.PROFILES;
    const detectProfile = window.ControlDeck.detectProfile;
    const LatencyTracker = window.ControlDeck.LatencyTracker;

    // Event names
    const GAMEPAD_CONNECTED = 'controldeck:gamepad:connected';
    const GAMEPAD_BUTTON = 'controldeck:gamepad:button';
    const GAMEPAD_AXIS = 'controldeck:gamepad:axis';
    const GAMEPAD_PROFILE_CHANGE = 'controldeck:gamepad:profile';

    class GamepadAdapter {
        constructor(profileId = 'generic') {
            this.activeGamepad = null;
            this.profile = PROFILES[profileId] || PROFILES['generic'];
            this.prevButtons = {};
            this.prevAxes = {};
            this.latency = new LatencyTracker();
            this.polling = false;
            this._pollBound = this._poll.bind(this);
        }

        /**
         * Set controller profile
         * @param {string} profileId - Profile identifier
         */
        setProfile(profileId) {
            this.profile = PROFILES[profileId] || PROFILES['generic'];
            if (Events) {
                Events.emit(GAMEPAD_PROFILE_CHANGE, this.profile);
            }
        }

        /**
         * Start polling for gamepad input
         */
        startPolling() {
            if (this.polling) return;
            this.polling = true;
            this._poll();
        }

        /**
         * Stop polling
         */
        stopPolling() {
            this.polling = false;
        }

        /**
         * Main polling loop
         */
        _poll() {
            if (!this.polling) return;

            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            let gp = this.activeGamepad !== null ? gamepads[this.activeGamepad] : null;

            // Find connected gamepad if none active
            if (!gp || !gp.connected) {
                for (let i = 0; i < gamepads.length; i++) {
                    if (gamepads[i] && gamepads[i].connected) {
                        this.activeGamepad = i;
                        gp = gamepads[i];
                        this.profile = detectProfile(gp.id);

                        if (Events) {
                            Events.emit(GAMEPAD_CONNECTED, {
                                gamepad: gp,
                                profile: this.profile
                            });
                        }
                        break;
                    }
                }
            }

            if (gp && gp.connected) {
                this.latency.recordPoll(gp.timestamp);
                this._processState(gp);
            }

            requestAnimationFrame(this._pollBound);
        }

        /**
         * Process gamepad state and emit change events
         * @param {Gamepad} gp - Gamepad object
         */
        _processState(gp) {
            const mapping = this.profile.mapping;
            const deadzone = this.profile.deadzone || 0.1;

            // Process buttons
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

                    if (Events) {
                        Events.emit(GAMEPAD_BUTTON, event);
                    }
                }
                this.prevButtons[idx] = pressed;
            });

            // Process axes
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

                    if (Events) {
                        Events.emit(GAMEPAD_AXIS, event);
                    }
                }
                this.prevAxes[idx] = val;
            });
        }

        /**
         * Get current gamepad state snapshot
         * @returns {Object|null} State object or null if no gamepad
         */
        getState() {
            if (this.activeGamepad === null) return null;
            const gp = navigator.getGamepads()[this.activeGamepad];
            if (!gp) return null;

            return {
                id: gp.id,
                index: gp.index,
                buttons: gp.buttons.map(b => ({ pressed: b.pressed, value: b.value })),
                axes: [...gp.axes],
                profile: this.profile.id,
                latency: this.latency.getStats()
            };
        }
    }

    // Export event names
    GamepadAdapter.EVENTS = {
        CONNECTED: GAMEPAD_CONNECTED,
        BUTTON: GAMEPAD_BUTTON,
        AXIS: GAMEPAD_AXIS,
        PROFILE_CHANGE: GAMEPAD_PROFILE_CHANGE
    };

    // Export
    window.ControlDeck = window.ControlDeck || {};
    window.ControlDeck.GamepadAdapter = GamepadAdapter;

})();
