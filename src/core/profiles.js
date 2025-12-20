/**
 * ControlDeck Controller Profiles
 * Button mappings and configurations for various controllers
 */
(function() {
    'use strict';

    const PROFILES = {
        'generic': {
            id: 'generic',
            name: 'Generic Controller',
            match: [],
            diagram: 'classic',
            mapping: {
                'a': 0, 'b': 1, 'x': 2, 'y': 3,
                'l': 4, 'r': 5, 'l2': 6, 'r2': 7,
                'select': 8, 'start': 9, 'l3': 10, 'r3': 11,
                'dpad-up': 12, 'dpad-down': 13, 'dpad-left': 14, 'dpad-right': 15,
                'home': 16
            },
            axes: { 'left-x': 0, 'left-y': 1, 'right-x': 2, 'right-y': 3 },
            deadzone: 0.1
        },

        '8bitdo-sn30-pro': {
            id: '8bitdo-sn30-pro',
            name: '8BitDo SN30 Pro',
            match: ['8BitDo SN30 Pro', '8Bitdo SF30', '8BitDo SN30'],
            diagram: 'classic',
            mapping: {
                'a': 0, 'b': 1, 'x': 2, 'y': 3,
                'l': 4, 'r': 5, 'l2': 6, 'r2': 7,
                'select': 8, 'start': 9, 'l3': 10, 'r3': 11,
                'dpad-up': 12, 'dpad-down': 13, 'dpad-left': 14, 'dpad-right': 15,
                'home': 16, 'star': 17
            },
            axes: { 'left-x': 0, 'left-y': 1, 'right-x': 2, 'right-y': 3 },
            deadzone: 0.08
        },

        'xbox': {
            id: 'xbox',
            name: 'Xbox Controller',
            match: ['Xbox', 'Microsoft', 'XInput'],
            diagram: 'modern-asym',
            mapping: {
                'a': 0, 'b': 1, 'x': 2, 'y': 3,
                'l': 4, 'r': 5, 'l2': 6, 'r2': 7,
                'select': 8, 'start': 9, 'l3': 10, 'r3': 11,
                'dpad-up': 12, 'dpad-down': 13, 'dpad-left': 14, 'dpad-right': 15,
                'home': 16
            },
            axes: { 'left-x': 0, 'left-y': 1, 'right-x': 2, 'right-y': 3 },
            deadzone: 0.12
        },

        'ps4': {
            id: 'ps4',
            name: 'PlayStation 4 Controller',
            match: ['DualShock 4', 'PS4', 'Wireless Controller'],
            diagram: 'modern-sym',
            mapping: {
                'a': 0, 'b': 1, 'x': 2, 'y': 3,
                'l': 4, 'r': 5, 'l2': 6, 'r2': 7,
                'select': 8, 'start': 9, 'l3': 10, 'r3': 11,
                'dpad-up': 12, 'dpad-down': 13, 'dpad-left': 14, 'dpad-right': 15,
                'home': 16, 'touchpad': 17
            },
            axes: { 'left-x': 0, 'left-y': 1, 'right-x': 2, 'right-y': 3 },
            deadzone: 0.08
        },

        'switch-pro': {
            id: 'switch-pro',
            name: 'Switch Pro Controller',
            match: ['Pro Controller', 'Nintendo'],
            diagram: 'modern-asym',
            mapping: {
                'a': 1, 'b': 0, 'x': 3, 'y': 2,  // Nintendo swapped layout
                'l': 4, 'r': 5, 'l2': 6, 'r2': 7,
                'select': 8, 'start': 9, 'l3': 10, 'r3': 11,
                'dpad-up': 12, 'dpad-down': 13, 'dpad-left': 14, 'dpad-right': 15,
                'home': 16, 'capture': 17
            },
            axes: { 'left-x': 0, 'left-y': 1, 'right-x': 2, 'right-y': 3 },
            deadzone: 0.1
        }
    };

    /**
     * Detect profile from gamepad ID string
     * @param {string} gamepadId - Gamepad identifier
     * @returns {Object} Matching profile or generic
     */
    function detectProfile(gamepadId) {
        for (const [key, profile] of Object.entries(PROFILES)) {
            if (profile.match.some(m => gamepadId.includes(m))) {
                return profile;
            }
        }
        return PROFILES['generic'];
    }

    // Export
    window.ControlDeck = window.ControlDeck || {};
    window.ControlDeck.PROFILES = PROFILES;
    window.ControlDeck.detectProfile = detectProfile;

})();
