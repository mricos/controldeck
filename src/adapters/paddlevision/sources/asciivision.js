/**
 * ASCIIVisionSource
 *
 * Reads landmarks from window.ASCIIVision hand tracking API.
 */
(function() {
    'use strict';

    // Ensure namespace
    if (!window.ControlDeck) window.ControlDeck = {};
    if (!window.ControlDeck.PaddleVision) window.ControlDeck.PaddleVision = {};
    const PV = window.ControlDeck.PaddleVision;

    class ASCIIVisionSource extends PV.SourceAdapter {
        constructor(options) {
            super(options);
            this._unsubscribe = null;
        }

        async start() {
            if (this._running) return true;

            if (!window.ASCIIVision) {
                console.error('[ASCIIVisionSource] ASCIIVision API not available');
                return false;
            }

            // Initialize ASCIIVision if not already running
            if (typeof window.ASCIIVision.isRunning === 'function' && !window.ASCIIVision.isRunning()) {
                try {
                    await window.ASCIIVision.init(this.options.initOptions || { backend: 'js' });
                } catch (e) {
                    console.error('[ASCIIVisionSource] Failed to init ASCIIVision:', e);
                    return false;
                }
            }

            // Subscribe to landmarks
            this._unsubscribe = window.ASCIIVision.on('landmarks', (data) => {
                this._emit({
                    landmarks: data.landmarks,
                    timestamp: data.timestamp || performance.now(),
                    stats: data.stats || {}
                });
            });

            this._running = true;
            console.log('[ASCIIVisionSource] Started');
            return true;
        }

        stop() {
            if (this._unsubscribe) {
                this._unsubscribe();
                this._unsubscribe = null;
            }
            this._running = false;
            console.log('[ASCIIVisionSource] Stopped');
        }

        getStats() {
            if (window.ASCIIVision && typeof window.ASCIIVision.getStats === 'function') {
                return window.ASCIIVision.getStats();
            }
            return {};
        }
    }

    // Export
    PV.ASCIIVisionSource = ASCIIVisionSource;

})();
