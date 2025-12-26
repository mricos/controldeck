/**
 * ProcessorPipeline
 *
 * Chains processors and manages data flow through the processing stages.
 */
(function() {
    'use strict';

    // Ensure namespace
    if (!window.ControlDeck) window.ControlDeck = {};
    if (!window.ControlDeck.PaddleVision) window.ControlDeck.PaddleVision = {};
    const PV = window.ControlDeck.PaddleVision;

    // Processor registry
    const PROCESSOR_REGISTRY = {
        'extract': function() { return PV.ExtractProcessor; },
        'calibrate': function() { return PV.CalibrateProcessor; },
        'smooth': function() { return PV.SmoothProcessor; },
        'flick-detect': function() { return PV.FlickDetectProcessor; }
    };

    class ProcessorPipeline {
        /**
         * @param {Object} schema - Schema defining the pipeline
         */
        constructor(schema) {
            this.schema = schema;
            this.processors = [];
            this._buildFromSchema();
        }

        /**
         * Build pipeline from schema definition
         */
        _buildFromSchema() {
            const pipelineDef = this.schema.pipeline || [];

            for (const stage of pipelineDef) {
                const processorName = stage.processor;
                const ProcessorClass = this._getProcessorClass(processorName);

                if (ProcessorClass) {
                    this.processors.push(new ProcessorClass(stage.config || {}, this.schema));
                } else {
                    console.warn('[Pipeline] Unknown processor:', processorName);
                }
            }
        }

        /**
         * Get processor class by name
         */
        _getProcessorClass(name) {
            const getter = PROCESSOR_REGISTRY[name];
            return getter ? getter() : null;
        }

        /**
         * Process data through all stages
         * @param {Object} input - Raw input data { landmarks, timestamp, stats }
         * @param {Object} calibration - Current calibration profile
         * @returns {Object} - Final processed context
         */
        process(input, calibration) {
            let context = {
                raw: input,
                derived: {},
                calibrated: {},
                smoothed: {},
                gestures: {},
                outputs: {},
                meta: {},
                calibration: calibration || this.schema.calibration
            };

            for (const processor of this.processors) {
                try {
                    context = processor.process(context);
                } catch (e) {
                    console.error('[Pipeline] Error in', processor.name + ':', e);
                }
            }

            return context;
        }

        /**
         * Add processor at specific index
         * @param {Processor} processor
         * @param {number} index - Position in pipeline (-1 for end)
         */
        insertProcessor(processor, index) {
            if (index < 0 || index >= this.processors.length) {
                this.processors.push(processor);
            } else {
                this.processors.splice(index, 0, processor);
            }
            return this;
        }

        /**
         * Remove processor by name or class
         * @param {string|Function} nameOrClass
         */
        removeProcessor(nameOrClass) {
            this.processors = this.processors.filter(function(p) {
                if (typeof nameOrClass === 'string') {
                    return p.name !== nameOrClass;
                }
                return !(p instanceof nameOrClass);
            });
            return this;
        }

        /**
         * Get processor by name
         * @param {string} name
         * @returns {Processor|null}
         */
        getProcessor(name) {
            return this.processors.find(function(p) {
                return p.name === name;
            }) || null;
        }

        /**
         * Reset all processor states
         */
        reset() {
            for (const processor of this.processors) {
                processor.reset();
            }
        }
    }

    /**
     * Register a custom processor type
     * @param {string} name
     * @param {Function} ProcessorClass
     */
    function registerProcessor(name, ProcessorClass) {
        PROCESSOR_REGISTRY[name] = function() { return ProcessorClass; };
    }

    // Export
    PV.ProcessorPipeline = ProcessorPipeline;
    PV.registerProcessor = registerProcessor;
    PV.PROCESSOR_REGISTRY = PROCESSOR_REGISTRY;

})();
