/**
 * MockSource
 *
 * Generates synthetic landmark data for testing.
 * Supports patterns: 'sine', 'random', 'static'
 */
(function() {
    'use strict';

    // Ensure namespace
    if (!window.ControlDeck) window.ControlDeck = {};
    if (!window.ControlDeck.PaddleVision) window.ControlDeck.PaddleVision = {};
    const PV = window.ControlDeck.PaddleVision;

    class MockSource extends PV.SourceAdapter {
        constructor(options) {
            super(options);
            this._intervalId = null;
            this._frameRate = options.frameRate || 30;
            this._pattern = options.pattern || 'sine';
            this._t = 0;
        }

        async start() {
            if (this._running) return true;

            this._running = true;
            this._intervalId = setInterval(() => {
                this._emit(this._generateFrame());
            }, 1000 / this._frameRate);

            console.log('[MockSource] Started with pattern:', this._pattern);
            return true;
        }

        stop() {
            if (this._intervalId) {
                clearInterval(this._intervalId);
                this._intervalId = null;
            }
            this._running = false;
            console.log('[MockSource] Stopped');
        }

        _generateFrame() {
            this._t += 0.05;
            return {
                landmarks: this._generateLandmarks(),
                timestamp: performance.now(),
                stats: { mock: true, pattern: this._pattern, t: this._t }
            };
        }

        _generateLandmarks() {
            const landmarks = [];

            let baseX, baseY, rotation;

            switch (this._pattern) {
                case 'sine':
                    baseX = 0.5 + Math.sin(this._t) * 0.3;
                    baseY = 0.5 + Math.cos(this._t * 0.7) * 0.2;
                    rotation = Math.sin(this._t * 0.5) * 0.5;
                    break;
                case 'random':
                    baseX = 0.3 + Math.random() * 0.4;
                    baseY = 0.3 + Math.random() * 0.4;
                    rotation = (Math.random() - 0.5) * 1.0;
                    break;
                case 'static':
                default:
                    baseX = 0.5;
                    baseY = 0.5;
                    rotation = 0;
                    break;
            }

            // Generate 21-point hand model
            // Approximate positions based on MediaPipe hand model
            const fingerOffsets = [
                // Wrist
                { x: 0, y: 0 },
                // Thumb (4 joints)
                { x: -0.08, y: -0.02 },
                { x: -0.10, y: -0.04 },
                { x: -0.11, y: -0.06 },
                { x: -0.12, y: -0.08 },
                // Index (4 joints)
                { x: -0.04, y: -0.10 },
                { x: -0.04, y: -0.14 },
                { x: -0.04, y: -0.17 },
                { x: -0.04, y: -0.20 },
                // Middle (4 joints)
                { x: 0, y: -0.11 },
                { x: 0, y: -0.15 },
                { x: 0, y: -0.18 },
                { x: 0, y: -0.21 },
                // Ring (4 joints)
                { x: 0.04, y: -0.10 },
                { x: 0.04, y: -0.14 },
                { x: 0.04, y: -0.17 },
                { x: 0.04, y: -0.19 },
                // Pinky (4 joints)
                { x: 0.08, y: -0.08 },
                { x: 0.08, y: -0.11 },
                { x: 0.08, y: -0.13 },
                { x: 0.08, y: -0.15 }
            ];

            const cos = Math.cos(rotation);
            const sin = Math.sin(rotation);

            for (let i = 0; i < 21; i++) {
                const offset = fingerOffsets[i];
                // Rotate offset
                const rx = offset.x * cos - offset.y * sin;
                const ry = offset.x * sin + offset.y * cos;

                landmarks.push({
                    x: baseX + rx,
                    y: baseY + ry,
                    z: 0
                });
            }

            return landmarks;
        }

        getStats() {
            return {
                pattern: this._pattern,
                frameRate: this._frameRate,
                t: this._t
            };
        }
    }

    // Export
    PV.MockSource = MockSource;

})();
