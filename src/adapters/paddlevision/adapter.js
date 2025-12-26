/**
 * PaddleVisionAdapter
 *
 * Data-driven hand tracking adapter.
 * Processes landmark data through a configurable pipeline
 * and emits control events to registered sinks.
 */
(function() {
    'use strict';

    // Ensure namespace
    if (!window.ControlDeck) window.ControlDeck = {};
    if (!window.ControlDeck.PaddleVision) window.ControlDeck.PaddleVision = {};
    const PV = window.ControlDeck.PaddleVision;

    class PaddleVisionAdapter {
        /**
         * @param {Object} options
         * @param {Object} options.schema - Processing schema
         * @param {SourceAdapter} options.source - Input source
         * @param {SinkAdapter[]} options.sinks - Output sinks
         * @param {Object} options.calibration - Calibration profile
         * @param {Array} options.customProcessors - Additional processors
         */
        constructor(options) {
            options = options || {};

            this.schema = options.schema;
            this.source = options.source;
            this.sinks = options.sinks || [];
            this.calibration = options.calibration || this.schema.calibration;

            // Build pipeline
            this.pipeline = new PV.ProcessorPipeline(this.schema);

            // Insert custom processors
            const customProcessors = options.customProcessors || [];
            for (const item of customProcessors) {
                this.pipeline.insertProcessor(item.processor, item.position);
            }

            // Stats
            this._stats = {
                framesProcessed: 0,
                lastTimestamp: 0,
                detectedFrames: 0
            };

            this._running = false;
            this._unsubscribe = null;
        }

        /**
         * Start processing
         */
        async start() {
            if (this._running) return;

            // Connect sinks
            for (const sink of this.sinks) {
                await sink.connect();
            }

            // Start source
            const started = await this.source.start();
            if (!started) {
                console.error('[PaddleVisionAdapter] Failed to start source');
                return;
            }

            // Subscribe to source data
            this._unsubscribe = this.source.onData((data) => {
                this._processFrame(data);
            });

            this._running = true;
            console.log('[PaddleVisionAdapter] Started');
        }

        /**
         * Stop processing
         */
        stop() {
            if (!this._running) return;

            if (this._unsubscribe) {
                this._unsubscribe();
                this._unsubscribe = null;
            }

            this.source.stop();

            for (const sink of this.sinks) {
                sink.disconnect();
            }

            this._running = false;
            console.log('[PaddleVisionAdapter] Stopped');
        }

        /**
         * Process a single frame
         */
        _processFrame(data) {
            this._stats.framesProcessed++;
            this._stats.lastTimestamp = data.timestamp;

            if (!data.landmarks || data.landmarks.length < 21) {
                return;
            }

            this._stats.detectedFrames++;

            // Run through pipeline
            const context = this.pipeline.process(data, this.calibration);

            // Emit outputs
            this._emitOutputs(context);
        }

        /**
         * Emit outputs based on schema
         */
        _emitOutputs(context) {
            const outputs = this.schema.outputs || {};

            for (const name of Object.keys(outputs)) {
                const config = outputs[name];
                let value = this._resolveOutput(context, config);

                // Apply range transform
                if (config.range) {
                    const inMin = config.range.input[0];
                    const inMax = config.range.input[1];
                    const outMin = config.range.output[0];
                    const outMax = config.range.output[1];

                    value = (value - inMin) / (inMax - inMin);
                    value = outMin + value * (outMax - outMin);
                }

                // Apply invert
                if (config.invert) {
                    value = 1 - value;
                }

                // Clamp to 0-1
                value = Math.max(0, Math.min(1, value));

                // Store in context
                context.outputs[name] = value;

                // Emit to all sinks
                for (const sink of this.sinks) {
                    sink.emit(name, value, config.topic || 'hand', {
                        raw: context.raw,
                        calibrated: config.calibrated
                    });
                }
            }

            // Emit flick if detected
            const flick = context.gestures?.flick;
            if (flick && flick.amount > 0.1) {
                for (const sink of this.sinks) {
                    sink.emit('flick-amount', flick.amount, 'hand', {});
                    sink.emit('flick-direction', (flick.direction + 1) / 2, 'hand', {});
                }
            }
        }

        /**
         * Resolve output value from context
         */
        _resolveOutput(context, config) {
            const source = config.source;
            const component = config.component;

            // Check smoothed first
            if (source in context.smoothed) {
                const val = context.smoothed[source];
                return component ? val[component] : val;
            }

            // Then calibrated
            if (source in context.calibrated) {
                const val = context.calibrated[source];
                return component ? val[component] : val;
            }

            // Then derived
            if (source in context.derived) {
                const val = context.derived[source];
                return component ? val[component] : val;
            }

            return 0;
        }

        // =========================================================================
        // CALIBRATION API
        // =========================================================================

        /**
         * Get current calibration
         * @returns {Object}
         */
        getCalibration() {
            return JSON.parse(JSON.stringify(this.calibration));
        }

        /**
         * Set calibration profile
         * @param {Object} profile
         */
        setCalibration(profile) {
            this.calibration = Object.assign({}, this.schema.calibration, profile);
        }

        /**
         * Capture a reference point from current reading
         * @param {'center'|'supinate'|'pronate'} point
         */
        captureReferencePoint(point) {
            const smoothProc = this.pipeline.getProcessor('SmoothProcessor');
            if (!smoothProc || !smoothProc._state.theta) {
                console.warn('[PaddleVisionAdapter] No current reading to capture');
                return null;
            }

            const variance = 0.02;
            this.calibration.reference = this.calibration.reference || {};
            this.calibration.reference[point] = {
                rawRotation: smoothProc._state.theta,
                variance: variance
            };

            console.log('[PaddleVisionAdapter] Captured ' + point + ':', smoothProc._state.theta.toFixed(3));
            return this.calibration.reference[point];
        }

        /**
         * Validate calibration
         * @returns {{ valid: boolean, issues: string[], quality: number }}
         */
        validateCalibration() {
            const reference = this.calibration.reference || {};
            const issues = [];
            let quality = 1.0;

            // Check range
            const range = (reference.pronate?.rawRotation || 0) - (reference.supinate?.rawRotation || 0);
            if (range < 0.3) {
                issues.push('Rotation range too small');
                quality *= 0.5;
            }

            // Check symmetry
            const asymmetry = Math.abs(
                Math.abs(reference.supinate?.rawRotation || 0) -
                Math.abs(reference.pronate?.rawRotation || 0)
            );
            if (asymmetry > 0.2) {
                issues.push('Asymmetric range detected');
                quality *= 0.8;
            }

            // Check center offset
            if (Math.abs(reference.center?.rawRotation || 0) > 0.1) {
                issues.push('Center point not neutral');
                quality *= 0.9;
            }

            return {
                valid: issues.length === 0,
                issues: issues,
                quality: quality
            };
        }

        /**
         * Export calibration as JSON
         * @returns {string}
         */
        exportCalibration() {
            return JSON.stringify(this.calibration, null, 2);
        }

        /**
         * Import calibration from JSON
         * @param {string} json
         * @returns {boolean}
         */
        importCalibration(json) {
            try {
                const profile = JSON.parse(json);
                this.setCalibration(profile);
                return true;
            } catch (e) {
                console.error('[PaddleVisionAdapter] Invalid calibration JSON:', e);
                return false;
            }
        }

        // =========================================================================
        // TUNING API
        // =========================================================================

        /**
         * Get tuning config
         * @returns {Object}
         */
        getTuning() {
            return Object.assign({}, this.calibration.tuning);
        }

        /**
         * Update tuning config
         * @param {Object} partial
         */
        setTuning(partial) {
            this.calibration.tuning = Object.assign({}, this.calibration.tuning, partial);
        }

        /**
         * Reset tuning to schema defaults
         */
        resetTuning() {
            this.calibration.tuning = Object.assign({}, this.schema.calibration.tuning);
        }

        // =========================================================================
        // STATS API
        // =========================================================================

        /**
         * Get tracking statistics
         * @returns {Object}
         */
        getStats() {
            return {
                framesProcessed: this._stats.framesProcessed,
                detectedFrames: this._stats.detectedFrames,
                detectionRate: this._stats.framesProcessed > 0
                    ? this._stats.detectedFrames / this._stats.framesProcessed
                    : 0,
                lastTimestamp: this._stats.lastTimestamp,
                source: this.source.getStats()
            };
        }

        /**
         * Get current smoothed values
         * @returns {Object}
         */
        getValues() {
            const smoothProc = this.pipeline.getProcessor('SmoothProcessor');
            return smoothProc ? Object.assign({}, smoothProc._state) : {};
        }

        /**
         * Check if running
         * @returns {boolean}
         */
        isRunning() {
            return this._running;
        }

        // =========================================================================
        // CLEANUP
        // =========================================================================

        /**
         * Destroy adapter
         */
        destroy() {
            this.stop();
            this.pipeline.reset();
            console.log('[PaddleVisionAdapter] Destroyed');
        }
    }

    // Export
    PV.PaddleVisionAdapter = PaddleVisionAdapter;

})();
