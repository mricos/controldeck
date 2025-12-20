/**
 * ControlDeck Controller Panel
 * Visual gamepad diagram with button/axis visualization
 */
(function() {
    'use strict';

    const Events = window.Terrain?.Events;

    // Button name to element ID mapping
    const BUTTON_MAP = {
        a: 0, b: 1, x: 2, y: 3,
        l: 4, r: 5, l2: 6, r2: 7,
        select: 8, start: 9, l3: 10, r3: 11,
        'dpad-up': 12, 'dpad-down': 13, 'dpad-left': 14, 'dpad-right': 15,
        home: 16, star: 17
    };

    // Classic controller SVG diagram
    const DIAGRAM_CLASSIC = `
    <svg viewBox="0 0 480 260" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="30" width="440" height="190" rx="40" fill="#1e2028" stroke="#3a3d45" stroke-width="2"/>
        <rect x="30" y="40" width="420" height="170" rx="32" fill="none" stroke="#2a2d35"/>

        <!-- Labels -->
        <text x="5" y="18" fill="#555" font-size="10">L, L2</text>
        <text x="435" y="18" fill="#555" font-size="10">R, R2</text>
        <text x="0" y="85" fill="#555" font-size="10">- select</text>
        <text x="430" y="85" fill="#555" font-size="10">+ start</text>
        <text x="0" y="125" fill="#555" font-size="10">d-pad</text>

        <!-- Shoulder buttons -->
        <rect id="gp-l" class="btn-pad" x="50" y="30" width="70" height="16" rx="4" fill="#2a2d35" stroke="#444"/>
        <rect id="gp-r" class="btn-pad" x="360" y="30" width="70" height="16" rx="4" fill="#2a2d35" stroke="#444"/>

        <!-- Select/Start -->
        <rect id="gp-select" class="btn-pad" x="148" y="85" width="44" height="16" rx="8" fill="#2a2d35" stroke="#444"/>
        <rect id="gp-start" class="btn-pad" x="288" y="85" width="44" height="16" rx="8" fill="#2a2d35" stroke="#444"/>

        <!-- D-pad -->
        <rect x="78" y="98" width="24" height="65" rx="3" fill="#252830" stroke="#444"/>
        <rect x="58" y="118" width="65" height="24" rx="3" fill="#252830" stroke="#444"/>
        <rect id="gp-dpad-up" class="btn-pad" x="78" y="98" width="24" height="25" rx="3" fill="#2a2d35"/>
        <rect id="gp-dpad-down" class="btn-pad" x="78" y="138" width="24" height="25" rx="3" fill="#2a2d35"/>
        <rect id="gp-dpad-left" class="btn-pad" x="58" y="118" width="25" height="24" rx="3" fill="#2a2d35"/>
        <rect id="gp-dpad-right" class="btn-pad" x="98" y="118" width="25" height="24" rx="3" fill="#2a2d35"/>

        <!-- Face buttons -->
        <circle id="gp-x" class="btn-pad" cx="365" cy="85" r="16" fill="#2a2d35" stroke="#444"/>
        <text x="365" y="90" text-anchor="middle" fill="#666" font-size="12" font-weight="bold">X</text>
        <circle id="gp-y" class="btn-pad" cx="330" cy="115" r="16" fill="#2a2d35" stroke="#444"/>
        <text x="330" y="120" text-anchor="middle" fill="#666" font-size="12" font-weight="bold">Y</text>
        <circle id="gp-a" class="btn-pad" cx="400" cy="115" r="16" fill="#2a2d35" stroke="#444"/>
        <text x="400" y="120" text-anchor="middle" fill="#666" font-size="12" font-weight="bold">A</text>
        <circle id="gp-b" class="btn-pad" cx="365" cy="145" r="16" fill="#2a2d35" stroke="#444"/>
        <text x="365" y="150" text-anchor="middle" fill="#666" font-size="12" font-weight="bold">B</text>

        <!-- Analog sticks -->
        <circle id="gp-l3" class="btn-pad" cx="130" cy="175" r="28" fill="#252830" stroke="#444" stroke-width="2"/>
        <circle id="stick-left" class="stick-pos" cx="130" cy="175" r="16" fill="#333" stroke="#555"/>
        <circle id="gp-r3" class="btn-pad" cx="350" cy="175" r="28" fill="#252830" stroke="#444" stroke-width="2"/>
        <circle id="stick-right" class="stick-pos" cx="350" cy="175" r="16" fill="#333" stroke="#555"/>

        <!-- Special buttons -->
        <circle id="gp-star" class="btn-pad" cx="85" cy="200" r="12" fill="#2a2d35" stroke="#444"/>
        <text x="85" y="204" text-anchor="middle" fill="#555" font-size="10">★</text>
        <circle id="gp-home" class="btn-pad" cx="395" cy="190" r="12" fill="#2a2d35" stroke="#444"/>
        <text x="395" y="194" text-anchor="middle" fill="#555" font-size="9">⌂</text>

        <!-- LEDs -->
        <circle id="led-power" class="led" cx="240" cy="65" r="5" fill="#222" stroke="#444"/>
        <circle id="led-home" class="led" cx="415" cy="200" r="4" fill="#222" stroke="#444"/>
        <rect id="led-status" class="led" x="220" y="215" width="40" height="6" rx="3" fill="#222" stroke="#444"/>
    </svg>`;

    /**
     * Update button visual state
     * @param {string} name - Button name
     * @param {boolean} pressed - Press state
     */
    function updateButton(name, pressed) {
        const el = document.getElementById(`gp-${name}`);
        if (el) {
            el.classList.toggle('pressed', pressed);
        }

        // Special LED for home button
        if (name === 'home') {
            const led = document.getElementById('led-home');
            if (led) led.classList.toggle('on', pressed);
        }
    }

    /**
     * Update stick visual position
     * @param {string} name - Axis name (left-x, left-y, right-x, right-y)
     * @param {number} value - Axis value (-1 to 1)
     */
    function updateStick(name, value) {
        const el = document.getElementById(name.includes('left') ? 'stick-left' : 'stick-right');
        if (!el) return;

        const current = el.getAttribute('transform') || '';
        const match = current.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
        let x = match ? parseFloat(match[1]) : 0;
        let y = match ? parseFloat(match[2]) : 0;

        if (name.includes('-x')) x = value * 10;
        if (name.includes('-y')) y = value * 10;

        el.setAttribute('transform', `translate(${x},${y})`);
    }

    /**
     * Setup controller diagram
     * @param {string} containerId - Container element ID
     */
    function setup(containerId = 'diagram') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = DIAGRAM_CLASSIC;
        }

        if (!Events) return;

        const Engine = window.ControlDeck?.Engine;
        const GamepadAdapter = window.ControlDeck?.GamepadAdapter;

        // Update on connected
        if (GamepadAdapter) {
            Events.on(GamepadAdapter.EVENTS.CONNECTED, () => {
                const powerLed = document.getElementById('led-power');
                const statusLed = document.getElementById('led-status');
                if (powerLed) powerLed.classList.add('on');
                if (statusLed) statusLed.classList.add('on');
            });
        }

        // Update on input
        if (Engine) {
            Events.on(Engine.EVENTS.INPUT, (e) => {
                if (e.source === 'gamepad') {
                    if (e.type === 'trigger') {
                        updateButton(e.control, e.pressed);
                    } else if (e.type === 'continuous') {
                        updateStick(e.control, e.raw.value);
                    }
                }
            });

            Events.on(Engine.EVENTS.RELAY, (e) => {
                if (e.type === 'trigger') {
                    updateButton(e.control, e.pressed);
                }
            });
        }
    }

    /**
     * Setup click-to-simulate on diagram buttons
     * @param {ControlDeckEngine} deck - Engine instance for sending
     */
    function setupClickSimulation(deck) {
        const PROTOCOL = window.ControlDeck.PROTOCOL;

        document.querySelectorAll('.btn-pad').forEach(el => {
            const name = el.id.replace('gp-', '');

            el.addEventListener('mousedown', () => {
                el.classList.add('pressed');
                if (deck) {
                    deck.send(PROTOCOL.createEvent(
                        'gamepad', 'ControlDeck UI', 'trigger', name, 1,
                        {}, { pressed: true }
                    ));
                }
            });

            el.addEventListener('mouseup', () => {
                el.classList.remove('pressed');
                if (deck) {
                    deck.send(PROTOCOL.createEvent(
                        'gamepad', 'ControlDeck UI', 'trigger', name, 0,
                        {}, { pressed: false }
                    ));
                }
            });

            el.addEventListener('mouseleave', () => {
                if (el.classList.contains('pressed')) {
                    el.classList.remove('pressed');
                }
            });
        });
    }

    // Export
    window.ControlDeck = window.ControlDeck || {};
    window.ControlDeck.Panels = window.ControlDeck.Panels || {};
    window.ControlDeck.Panels.Controller = {
        setup,
        setupClickSimulation,
        updateButton,
        updateStick,
        DIAGRAM_CLASSIC,
        BUTTON_MAP
    };

})();
