/**
 * CalibrateProcessor
 *
 * Applies calibration to normalize derived values based on reference points.
 */
(function() {
    'use strict';

    // Ensure namespace
    if (!window.ControlDeck) window.ControlDeck = {};
    if (!window.ControlDeck.PaddleVision) window.ControlDeck.PaddleVision = {};
    const PV = window.ControlDeck.PaddleVision;

    class CalibrateProcessor extends PV.Processor {
        process(context) {
            const derived = context.derived || {};
            const calibration = context.calibration || this.schema.calibration || {};
            const reference = calibration.reference || {};
            const tuning = calibration.tuning || {};

            const calibrated = { ...derived };

            // Normalize rotation based on reference points
            if (derived['hand-rotation'] !== undefined && reference.center) {
                const raw = derived['hand-rotation'];
                const thetaRange = (reference.pronate?.rawRotation || 0.52) -
                                   (reference.supinate?.rawRotation || -0.52);
                let normalized = (raw - (reference.center?.rawRotation || 0)) / (thetaRange / 2);

                // Apply asymmetric sensitivity
                const sensitivity = tuning.sensitivity || { left: 1.0, right: 1.0 };
                if (normalized < 0) {
                    normalized *= sensitivity.left;
                } else {
                    normalized *= sensitivity.right;
                }

                // Clamp to -1..1
                normalized = Math.max(-1, Math.min(1, normalized));

                // Apply reverse
                if (tuning.reverse) {
                    normalized = -normalized;
                }

                calibrated['hand-rotation-calibrated'] = normalized;
            }

            // Normalize center position to -1..1
            if (derived['hand-center']) {
                calibrated['hand-center-calibrated'] = {
                    x: (derived['hand-center'].x - 0.5) * 2,
                    y: (derived['hand-center'].y - 0.5) * 2
                };
            }

            return {
                ...context,
                calibrated
            };
        }
    }

    // Export
    PV.CalibrateProcessor = CalibrateProcessor;

})();
