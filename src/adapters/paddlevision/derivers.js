/**
 * PaddleVision Derivation Functions
 *
 * Functions that compute derived values from raw landmark data.
 * Each deriver takes (landmarks, config, schema) and returns a computed value.
 */
(function() {
    'use strict';

    const DERIVATION_TYPES = {
        /**
         * Average multiple landmark components
         * Config: { inputs: ['WRIST', 'INDEX_MCP'], components: ['x', 'y'] }
         */
        average: function(landmarks, config, schema) {
            const inputs = config.inputs.map(function(name) {
                const def = schema.landmarks[name];
                return landmarks[def.index];
            });

            const result = {};
            for (const comp of config.components) {
                let sum = 0;
                for (const lm of inputs) {
                    sum += lm[comp];
                }
                result[comp] = sum / inputs.length;
            }
            return result;
        },

        /**
         * Angle between two landmarks (radians)
         * Config: { from: 'INDEX_MCP', to: 'PINKY_MCP' }
         */
        angle: function(landmarks, config, schema) {
            const from = landmarks[schema.landmarks[config.from].index];
            const to = landmarks[schema.landmarks[config.to].index];
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            return Math.atan2(dy, dx);
        },

        /**
         * Distance between two landmarks
         * Config: { from: 'THUMB_TIP', to: 'INDEX_TIP', normalize: { min, max, outputMax } }
         */
        distance: function(landmarks, config, schema) {
            const from = landmarks[schema.landmarks[config.from].index];
            const to = landmarks[schema.landmarks[config.to].index];
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const dz = (to.z || 0) - (from.z || 0);
            const raw = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (config.normalize) {
                const min = config.normalize.min;
                const max = config.normalize.max;
                const outputMax = config.normalize.outputMax || 1.0;
                return Math.min(outputMax, Math.max(0, (raw - min) / (max - min) * outputMax));
            }
            return raw;
        },

        /**
         * Triangle area from three points (for finger spread)
         * Config: { points: ['THUMB_TIP', 'INDEX_TIP', 'MIDDLE_TIP'], normalize: { min, max, outputMax } }
         */
        triangleArea: function(landmarks, config, schema) {
            const pts = config.points.map(function(name) {
                return landmarks[schema.landmarks[name].index];
            });
            const a = pts[0], b = pts[1], c = pts[2];

            // Cross product for area
            const ax = b.x - a.x, ay = b.y - a.y;
            const bx = c.x - a.x, by = c.y - a.y;
            const raw = Math.abs(ax * by - ay * bx) / 2;

            if (config.normalize) {
                const min = config.normalize.min;
                const max = config.normalize.max;
                const outputMax = config.normalize.outputMax || 1.0;
                return Math.min(outputMax, (raw - min) / (max - min) * outputMax);
            }
            return raw;
        },

        /**
         * Single component from a landmark
         * Config: { landmark: 'WRIST', component: 'z' }
         */
        component: function(landmarks, config, schema) {
            const lm = landmarks[schema.landmarks[config.landmark].index];
            return lm[config.component] || 0;
        },

        /**
         * Dot product of two vectors (for detecting alignment)
         * Config: { from1: 'A', to1: 'B', from2: 'C', to2: 'D' }
         */
        dotProduct: function(landmarks, config, schema) {
            const from1 = landmarks[schema.landmarks[config.from1].index];
            const to1 = landmarks[schema.landmarks[config.to1].index];
            const from2 = landmarks[schema.landmarks[config.from2].index];
            const to2 = landmarks[schema.landmarks[config.to2].index];

            const v1x = to1.x - from1.x;
            const v1y = to1.y - from1.y;
            const v2x = to2.x - from2.x;
            const v2y = to2.y - from2.y;

            // Normalize vectors
            const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
            const len2 = Math.sqrt(v2x * v2x + v2y * v2y);

            if (len1 === 0 || len2 === 0) return 0;

            return (v1x * v2x + v1y * v2y) / (len1 * len2);
        }
    };

    /**
     * Compute a derived value given landmarks and a derivation config
     */
    function computeDerived(landmarks, deriveDef, schema) {
        const deriver = DERIVATION_TYPES[deriveDef.type];
        if (!deriver) {
            console.warn('[Derivers] Unknown derivation type:', deriveDef.type);
            return null;
        }
        return deriver(landmarks, deriveDef, schema);
    }

    /**
     * Register a custom derivation type
     */
    function registerDeriver(name, fn) {
        DERIVATION_TYPES[name] = fn;
    }

    // Export - ensure namespace exists
    if (!window.ControlDeck) window.ControlDeck = {};
    if (!window.ControlDeck.PaddleVision) window.ControlDeck.PaddleVision = {};

    const PV = window.ControlDeck.PaddleVision;
    PV.DERIVATION_TYPES = DERIVATION_TYPES;
    PV.computeDerived = computeDerived;
    PV.registerDeriver = registerDeriver;

})();
