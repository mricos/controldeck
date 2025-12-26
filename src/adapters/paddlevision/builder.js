/**
 * PaddleVisionBuilder
 *
 * Fluent API for configuring PaddleVision instances.
 *
 * Usage:
 *   ControlDeck.createPaddleVision()
 *     .useSchema('hand-basic')
 *     .fromSource('asciivision')
 *     .toSink('hub', { hub: hubInstance })
 *     .toSink('events')
 *     .withCalibration(savedProfile)
 *     .build();
 */
(function() {
    'use strict';

    // Ensure namespace
    if (!window.ControlDeck) window.ControlDeck = {};
    if (!window.ControlDeck.PaddleVision) window.ControlDeck.PaddleVision = {};
    const PV = window.ControlDeck.PaddleVision;

    // Source registry
    const SOURCES = {
        'asciivision': function(opts) { return new PV.ASCIIVisionSource(opts); },
        'mock': function(opts) { return new PV.MockSource(opts); }
    };

    // Sink registry
    const SINKS = {
        'hub': function(opts) { return new PV.HubSink(opts); },
        'events': function(opts) { return new PV.EventsSink(opts); },
        'console': function(opts) { return new PV.ConsoleSink(opts); }
    };

    // Schema registry (loaded schemas)
    const SCHEMAS = {};

    class PaddleVisionBuilder {
        constructor() {
            this._schema = null;
            this._source = null;
            this._sinks = [];
            this._calibration = null;
            this._customProcessors = [];
            this._customDerivers = {};
        }

        /**
         * Load a predefined schema by ID
         * @param {string} schemaId
         */
        useSchema(schemaId) {
            this._schema = SCHEMAS[schemaId];
            if (!this._schema) {
                throw new Error('Unknown schema: ' + schemaId);
            }
            return this;
        }

        /**
         * Use a custom schema object
         * @param {Object} schema
         */
        withSchema(schema) {
            this._schema = schema;
            return this;
        }

        /**
         * Set the input source
         * @param {string} type - 'asciivision', 'mock', etc.
         * @param {Object} options
         */
        fromSource(type, options) {
            const factory = SOURCES[type];
            if (!factory) {
                throw new Error('Unknown source type: ' + type);
            }
            this._source = factory(options || {});
            return this;
        }

        /**
         * Use a custom source instance
         * @param {SourceAdapter} source
         */
        withSource(source) {
            this._source = source;
            return this;
        }

        /**
         * Add an output sink
         * @param {string} type - 'hub', 'events', 'console', etc.
         * @param {Object} options
         */
        toSink(type, options) {
            const factory = SINKS[type];
            if (!factory) {
                throw new Error('Unknown sink type: ' + type);
            }
            this._sinks.push(factory(options || {}));
            return this;
        }

        /**
         * Use a custom sink instance
         * @param {SinkAdapter} sink
         */
        withSink(sink) {
            this._sinks.push(sink);
            return this;
        }

        /**
         * Add multiple sinks at once
         * @param {Object} sinks - { type: options, ... }
         */
        toSinks(sinks) {
            for (const type of Object.keys(sinks)) {
                this.toSink(type, sinks[type]);
            }
            return this;
        }

        /**
         * Set calibration profile
         * @param {Object} calibration
         */
        withCalibration(calibration) {
            this._calibration = calibration;
            return this;
        }

        /**
         * Load calibration from CalibrationStore
         * @param {string} profileId
         */
        async loadCalibration(profileId) {
            const CalibrationStore = window.ControlDeck?.CalibrationStore;
            if (!CalibrationStore) {
                console.warn('[Builder] CalibrationStore not available');
                return this;
            }
            const store = new CalibrationStore();
            await store.init();
            this._calibration = await store.load(profileId);
            return this;
        }

        /**
         * Add custom processor to pipeline
         * @param {Processor} processor
         * @param {number} position - Index in pipeline (-1 for end)
         */
        addProcessor(processor, position) {
            this._customProcessors.push({
                processor: processor,
                position: position === undefined ? -1 : position
            });
            return this;
        }

        /**
         * Register custom deriver function
         * @param {string} name
         * @param {Function} fn
         */
        registerDeriver(name, fn) {
            this._customDerivers[name] = fn;
            return this;
        }

        /**
         * Override specific output configuration
         * @param {string} outputName
         * @param {Object} config
         */
        configureOutput(outputName, config) {
            if (!this._schema) {
                throw new Error('Must set schema first');
            }
            this._schema = JSON.parse(JSON.stringify(this._schema));
            this._schema.outputs[outputName] = Object.assign(
                {},
                this._schema.outputs[outputName] || {},
                config
            );
            return this;
        }

        /**
         * Build the PaddleVision adapter
         * @returns {PaddleVisionAdapter}
         */
        build() {
            // Default schema
            if (!this._schema) {
                this._schema = SCHEMAS['hand-basic'] || this._getDefaultSchema();
            }

            // Default source
            if (!this._source) {
                this._source = new PV.ASCIIVisionSource({});
            }

            // Default sink
            if (this._sinks.length === 0) {
                this._sinks.push(new PV.EventsSink({}));
            }

            // Register custom derivers
            for (const name of Object.keys(this._customDerivers)) {
                PV.registerDeriver(name, this._customDerivers[name]);
            }

            return new PV.PaddleVisionAdapter({
                schema: this._schema,
                source: this._source,
                sinks: this._sinks,
                calibration: this._calibration,
                customProcessors: this._customProcessors
            });
        }

        /**
         * Get default schema if none loaded
         */
        _getDefaultSchema() {
            return {
                id: 'default',
                landmarks: {
                    WRIST: { index: 0 },
                    INDEX_MCP: { index: 5 },
                    PINKY_MCP: { index: 17 },
                    THUMB_TIP: { index: 4 },
                    INDEX_TIP: { index: 8 },
                    MIDDLE_TIP: { index: 12 }
                },
                derived: {
                    'hand-center': {
                        type: 'average',
                        inputs: ['WRIST', 'INDEX_MCP', 'PINKY_MCP'],
                        components: ['x', 'y']
                    },
                    'hand-rotation': {
                        type: 'angle',
                        from: 'INDEX_MCP',
                        to: 'PINKY_MCP'
                    },
                    'finger-spread': {
                        type: 'triangleArea',
                        points: ['THUMB_TIP', 'INDEX_TIP', 'MIDDLE_TIP'],
                        normalize: { min: 0.001, max: 0.05, outputMax: 1.0 }
                    }
                },
                outputs: {
                    'hand-x': { source: 'hand-center-calibrated', component: 'x', range: { input: [-1, 1], output: [0, 1] }, topic: 'hand' },
                    'hand-y': { source: 'hand-center-calibrated', component: 'y', range: { input: [-1, 1], output: [0, 1] }, topic: 'hand' },
                    'hand-theta': { source: 'hand-rotation-calibrated', range: { input: [-1, 1], output: [0, 1] }, topic: 'hand' },
                    'hand-spread': { source: 'finger-spread', range: { input: [0, 1], output: [0, 1] }, topic: 'hand' }
                },
                pipeline: [
                    { processor: 'extract', config: {} },
                    { processor: 'calibrate', config: {} },
                    { processor: 'smooth', config: { factor: 0.3, deadzone: 0.02 } },
                    { processor: 'flick-detect', config: { decay: 0.85, threshold: 0.15 } }
                ],
                calibration: {
                    reference: {
                        center: { rawRotation: 0, variance: 0.01 },
                        supinate: { rawRotation: -0.52, variance: 0.02 },
                        pronate: { rawRotation: 0.52, variance: 0.02 }
                    },
                    tuning: {
                        sensitivity: { left: 1.0, right: 1.0 },
                        reverse: false,
                        smoothing: { factor: 0.3, deadzone: 0.02 }
                    }
                }
            };
        }
    }

    /**
     * Register a schema
     * @param {string} id
     * @param {Object} schema
     */
    function registerSchema(id, schema) {
        SCHEMAS[id] = schema;
    }

    /**
     * Register a source type
     * @param {string} type
     * @param {Function} factory
     */
    function registerSource(type, factory) {
        SOURCES[type] = factory;
    }

    /**
     * Register a sink type
     * @param {string} type
     * @param {Function} factory
     */
    function registerSink(type, factory) {
        SINKS[type] = factory;
    }

    /**
     * Create a new builder
     * @returns {PaddleVisionBuilder}
     */
    function createPaddleVision() {
        return new PaddleVisionBuilder();
    }

    // Export
    PV.PaddleVisionBuilder = PaddleVisionBuilder;
    PV.registerSchema = registerSchema;
    PV.registerSource = registerSource;
    PV.registerSink = registerSink;
    PV.SCHEMAS = SCHEMAS;

    window.ControlDeck.createPaddleVision = createPaddleVision;

})();
