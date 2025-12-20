/**
 * ControlDeck Polyfill v0.2.0
 * 
 * Drop-in script that lets your game receive virtual gamepad input
 * from ControlDeck via BroadcastChannel.
 * 
 * Usage:
 *   <script src="controldeck-polyfill.js"></script>
 *   <script src="your-game.js"></script>
 * 
 * Options (set before script loads):
 *   window.CONTROLDECK_OPTIONS = {
 *     channel: 'default',
 *     realGamepads: true,
 *     virtualIndex: 'auto',
 *     debug: false
 *   };
 */
(function(global) {
    'use strict';

    const DEFAULT_OPTIONS = {
        channel: 'default',
        realGamepads: true,
        virtualIndex: 'auto',
        debug: false
    };

    const options = Object.assign({}, DEFAULT_OPTIONS, global.CONTROLDECK_OPTIONS || {});

    function log(...args) {
        if (options.debug) console.log('[ControlDeck]', ...args);
    }

    const BUTTON_COUNT = 17;
    const AXES_COUNT = 4;

    const BUTTON_MAP = {
        'a': 0, 'b': 1, 'x': 2, 'y': 3,
        'l': 4, 'r': 5, 'l1': 4, 'r1': 5, 'l2': 6, 'r2': 7,
        'select': 8, 'back': 8, 'start': 9,
        'l3': 10, 'r3': 11,
        'dpad-up': 12, 'up': 12, 'dpad-down': 13, 'down': 13,
        'dpad-left': 14, 'left': 14, 'dpad-right': 15, 'right': 15,
        'home': 16, 'guide': 16, 'star': 17, 'capture': 17
    };

    const AXIS_MAP = {
        'left-x': 0, 'lx': 0, 'left-y': 1, 'ly': 1,
        'right-x': 2, 'rx': 2, 'right-y': 3, 'ry': 3
    };

    const virtualState = {
        connected: false,
        timestamp: performance.now(),
        buttons: Array(BUTTON_COUNT).fill(null).map(() => ({ pressed: false, touched: false, value: 0 })),
        axes: Array(AXES_COUNT).fill(0)
    };

    function createVirtualGamepad(index) {
        return {
            id: 'ControlDeck Virtual Controller (STANDARD GAMEPAD)',
            index: index,
            connected: virtualState.connected,
            timestamp: virtualState.timestamp,
            mapping: 'standard',
            axes: virtualState.axes,
            buttons: virtualState.buttons,
            vibrationActuator: null
        };
    }

    let channel = null;
    let virtualGamepadConnected = false;

    function initChannel() {
        if (typeof BroadcastChannel === 'undefined') {
            console.warn('[ControlDeck] BroadcastChannel not supported');
            return;
        }

        channel = new BroadcastChannel(`controldeck-${options.channel}`);

        channel.onmessage = (event) => {
            const data = event.data;
            if (data._src !== 'controldeck') return;

            virtualState.connected = true;
            virtualState.timestamp = performance.now();

            if (data.type === 'trigger' && data.control) {
                const btnIndex = BUTTON_MAP[data.control.toLowerCase()];
                if (btnIndex !== undefined && btnIndex < BUTTON_COUNT) {
                    const pressed = data.pressed !== undefined ? data.pressed : data.value > 0.5;
                    virtualState.buttons[btnIndex] = { pressed, touched: pressed, value: pressed ? 1 : 0 };
                    log(`Button ${data.control}: ${pressed}`);
                }
            }

            if (data.type === 'continuous' && data.control) {
                const axisIndex = AXIS_MAP[data.control.toLowerCase()];
                if (axisIndex !== undefined) {
                    // Use raw.value if available (already -1 to 1), otherwise convert from 0-1
                    const axisValue = (data.raw && data.raw.value !== undefined)
                        ? data.raw.value
                        : (data.value * 2) - 1;
                    virtualState.axes[axisIndex] = axisValue;
                    log(`Axis ${data.control}: ${axisValue.toFixed(3)}`);
                }
            }

            if (!virtualGamepadConnected) {
                virtualGamepadConnected = true;
                dispatchConnectionEvent('gamepadconnected');
                log('Virtual gamepad connected');
            }
        };

        log(`Listening on channel: controldeck-${options.channel}`);
    }

    const originalGetGamepads = navigator.getGamepads.bind(navigator);

    function getGamepadsOverride() {
        const realGamepads = originalGetGamepads();
        const result = [];

        if (options.realGamepads) {
            for (let i = 0; i < realGamepads.length; i++) {
                result[i] = realGamepads[i];
            }
        }

        if (virtualState.connected) {
            let virtualIndex;
            if (options.virtualIndex === 'auto') {
                virtualIndex = result.length;
                for (let i = 0; i < result.length; i++) {
                    if (!result[i]) { virtualIndex = i; break; }
                }
            } else {
                virtualIndex = parseInt(options.virtualIndex, 10);
            }
            result[virtualIndex] = createVirtualGamepad(virtualIndex);
        }

        return result;
    }

    try {
        Object.defineProperty(navigator, 'getGamepads', {
            value: getGamepadsOverride,
            writable: true,
            configurable: true
        });
        log('navigator.getGamepads() overridden');
    } catch (e) {
        console.error('[ControlDeck] Failed to override getGamepads:', e);
    }

    function dispatchConnectionEvent(type) {
        const idx = options.virtualIndex === 'auto' ? 0 : parseInt(options.virtualIndex, 10);
        const event = new Event(type);
        event.gamepad = createVirtualGamepad(idx);
        window.dispatchEvent(event);
    }

    const ControlDeckPolyfill = {
        init: function(opts) {
            Object.assign(options, opts || {});
            if (!channel) initChannel();
        },
        getState: function() { return { ...virtualState }; },
        inject: function(control, pressed) {
            const btnIndex = BUTTON_MAP[control.toLowerCase()];
            if (btnIndex !== undefined) {
                virtualState.connected = true;
                virtualState.timestamp = performance.now();
                virtualState.buttons[btnIndex] = { pressed, touched: pressed, value: pressed ? 1 : 0 };
                if (!virtualGamepadConnected) {
                    virtualGamepadConnected = true;
                    dispatchConnectionEvent('gamepadconnected');
                }
            }
        },
        injectAxis: function(axis, value) {
            const axisIndex = AXIS_MAP[axis.toLowerCase()];
            if (axisIndex !== undefined) {
                virtualState.connected = true;
                virtualState.timestamp = performance.now();
                virtualState.axes[axisIndex] = value;
            }
        },
        disconnect: function() {
            if (virtualState.connected) {
                virtualState.connected = false;
                virtualGamepadConnected = false;
                dispatchConnectionEvent('gamepaddisconnected');
                log('Virtual gamepad disconnected');
            }
        },
        isConnected: function() { return virtualState.connected; },
        version: '0.2.0',
        protocol: 'controldeck-v1'
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChannel);
    } else {
        initChannel();
    }

    global.ControlDeckPolyfill = ControlDeckPolyfill;
    global.ControlDeck = global.ControlDeck || ControlDeckPolyfill;

    log('ControlDeck Polyfill loaded');
})(typeof window !== 'undefined' ? window : this);
