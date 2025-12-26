/**
 * ExtractProcessor
 *
 * Extracts derived values from raw landmarks using the schema's derived definitions.
 */
(function() {
    'use strict';

    // Ensure namespace
    if (!window.ControlDeck) window.ControlDeck = {};
    if (!window.ControlDeck.PaddleVision) window.ControlDeck.PaddleVision = {};
    const PV = window.ControlDeck.PaddleVision;

    class ExtractProcessor extends PV.Processor {
        process(context) {
            const landmarks = context.raw.landmarks;

            if (!landmarks || landmarks.length < 21) {
                return context;
            }

            const derived = {};

            for (const [name, deriveDef] of Object.entries(this.schema.derived || {})) {
                const value = PV.computeDerived(landmarks, deriveDef, this.schema);
                if (value !== null) {
                    derived[name] = value;
                }
            }

            return {
                ...context,
                derived
            };
        }
    }

    // Export
    PV.ExtractProcessor = ExtractProcessor;

})();
