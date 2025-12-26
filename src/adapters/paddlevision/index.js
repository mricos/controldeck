/**
 * PaddleVision Module Index
 *
 * Provides backward-compatible API and exports all components.
 *
 * Legacy Usage (still works):
 *   const pv = new ControlDeck.PaddleVision({ hub, calibration });
 *   pv.start();
 *
 * New Usage:
 *   const pv = ControlDeck.createPaddleVision()
 *     .useSchema('hand-basic')
 *     .fromSource('asciivision')
 *     .toSink('hub', { hub: instance })
 *     .build();
 */
(function() {
    'use strict';

    // Ensure namespace
    if (!window.ControlDeck) window.ControlDeck = {};
    if (!window.ControlDeck.PaddleVision) window.ControlDeck.PaddleVision = {};
    const PV = window.ControlDeck.PaddleVision;

    /**
     * Backward-compatible PaddleVision class
     *
     * Wraps the new data-driven adapter with the old API.
     */
    class PaddleVision {
        /**
         * @param {Object} options
         * @param {Hub} options.hub - ControlDeck Hub instance
         * @param {Object} options.calibration - Calibration profile
         * @param {boolean} options.autoStart - Start immediately
         */
        constructor(options) {
            options = options || {};

            // Build adapter using builder
            const builder = window.ControlDeck.createPaddleVision();

            // Use default schema
            builder.withSchema(builder._getDefaultSchema());

            // Configure source
            builder.fromSource('asciivision');

            // Configure sinks
            if (options.hub) {
                builder.toSink('hub', { hub: options.hub });
            }
            builder.toSink('events');

            // Set calibration
            if (options.calibration) {
                builder.withCalibration(options.calibration);
            }

            // Build the adapter
            this._adapter = builder.build();

            // Store hub reference for compatibility
            this.hub = options.hub;
            this.calibration = this._adapter.calibration;
            this.running = false;

            if (options.autoStart) {
                this.start();
            }
        }

        // Delegate methods to adapter
        start() {
            this._adapter.start();
            this.running = this._adapter.isRunning();
        }

        stop() {
            this._adapter.stop();
            this.running = false;
        }

        getCalibration() {
            return this._adapter.getCalibration();
        }

        setCalibration(profile) {
            this._adapter.setCalibration(profile);
            this.calibration = this._adapter.calibration;
        }

        captureReferencePoint(point) {
            return this._adapter.captureReferencePoint(point);
        }

        validateCalibration() {
            return this._adapter.validateCalibration();
        }

        exportCalibration() {
            return this._adapter.exportCalibration();
        }

        importCalibration(json) {
            return this._adapter.importCalibration(json);
        }

        getTuning() {
            return this._adapter.getTuning();
        }

        setTuning(partial) {
            this._adapter.setTuning(partial);
        }

        resetTuning() {
            this._adapter.resetTuning();
        }

        getStats() {
            return this._adapter.getStats();
        }

        getValues() {
            return this._adapter.getValues();
        }

        destroy() {
            this._adapter.destroy();
            this.running = false;
            this.hub = null;
        }
    }

    // Load default schema from JSON (async)
    async function loadDefaultSchema() {
        try {
            const response = await fetch('/src/adapters/paddlevision/schemas/hand-tracking.json');
            if (response.ok) {
                const schema = await response.json();
                PV.registerSchema('hand-basic', schema);
                PV.registerSchema(schema.id, schema);
                console.log('[PaddleVision] Loaded schema:', schema.id);
            }
        } catch (e) {
            console.warn('[PaddleVision] Could not load schema from file, using default');
        }
    }

    // Try to load schema (non-blocking)
    if (typeof fetch !== 'undefined') {
        loadDefaultSchema();
    }

    // Export backward-compatible class
    window.ControlDeck.PaddleVision = PaddleVision;

    // Export all components for advanced usage
    window.ControlDeck.PaddleVision.Adapter = PV.PaddleVisionAdapter;
    window.ControlDeck.PaddleVision.Builder = PV.PaddleVisionBuilder;
    window.ControlDeck.PaddleVision.Pipeline = PV.ProcessorPipeline;
    window.ControlDeck.PaddleVision.Processor = PV.Processor;
    window.ControlDeck.PaddleVision.SourceAdapter = PV.SourceAdapter;
    window.ControlDeck.PaddleVision.SinkAdapter = PV.SinkAdapter;

    // Export processor classes
    window.ControlDeck.PaddleVision.Processors = {
        Extract: PV.ExtractProcessor,
        Calibrate: PV.CalibrateProcessor,
        Smooth: PV.SmoothProcessor,
        FlickDetect: PV.FlickDetectProcessor
    };

    // Export source classes
    window.ControlDeck.PaddleVision.Sources = {
        ASCIIVision: PV.ASCIIVisionSource,
        Mock: PV.MockSource
    };

    // Export sink classes
    window.ControlDeck.PaddleVision.Sinks = {
        Hub: PV.HubSink,
        Events: PV.EventsSink,
        Console: PV.ConsoleSink
    };

    // Export utilities
    window.ControlDeck.PaddleVision.registerSchema = PV.registerSchema;
    window.ControlDeck.PaddleVision.registerProcessor = PV.registerProcessor;
    window.ControlDeck.PaddleVision.registerSource = PV.registerSource;
    window.ControlDeck.PaddleVision.registerSink = PV.registerSink;
    window.ControlDeck.PaddleVision.registerDeriver = PV.registerDeriver;

})();
