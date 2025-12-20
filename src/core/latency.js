/**
 * ControlDeck Latency Tracker
 * Measures poll rate, input age, jitter with percentile statistics
 */
(function() {
    'use strict';

    class LatencyTracker {
        constructor(sampleSize = 120) {
            this.sampleSize = sampleSize;
            this.pollTimes = [];
            this.inputAges = [];
            this.lastPollTime = null;
        }

        /**
         * Record a poll event with optional gamepad timestamp
         * @param {number} gamepadTimestamp - Gamepad hardware timestamp
         */
        recordPoll(gamepadTimestamp) {
            const now = performance.now();

            // Track poll intervals
            if (this.lastPollTime !== null) {
                this.pollTimes.push(now - this.lastPollTime);
                if (this.pollTimes.length > this.sampleSize) {
                    this.pollTimes.shift();
                }
            }
            this.lastPollTime = now;

            // Track input age (time since gamepad hardware update)
            if (gamepadTimestamp) {
                const age = now - gamepadTimestamp;
                if (age >= 0 && age < 500) {
                    this.inputAges.push(age);
                    if (this.inputAges.length > this.sampleSize) {
                        this.inputAges.shift();
                    }
                }
            }
        }

        /**
         * Calculate statistics for an array of values
         * @param {number[]} arr - Values to analyze
         * @returns {Object} Statistics object
         */
        _calcStats(arr) {
            if (!arr.length) {
                return { avg: 0, min: 0, max: 0, jitter: 0, p50: 0, p95: 0, p99: 0 };
            }

            const sorted = [...arr].sort((a, b) => a - b);
            const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
            const variance = arr.reduce((acc, v) => acc + (v - avg) ** 2, 0) / arr.length;

            return {
                avg,
                min: sorted[0],
                max: sorted[sorted.length - 1],
                jitter: Math.sqrt(variance),
                p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
                p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
                p99: sorted[Math.floor(sorted.length * 0.99)] || 0
            };
        }

        /**
         * Get current latency statistics
         * @returns {Object} Latency stats with pollRate, inputAge, sparklineData
         */
        getStats() {
            const avgPollInterval = this.pollTimes.length
                ? this.pollTimes.reduce((a, b) => a + b, 0) / this.pollTimes.length
                : 0;

            return {
                pollRate: avgPollInterval > 0 ? 1000 / avgPollInterval : 0,
                inputAge: this._calcStats(this.inputAges),
                sparklineData: this.inputAges.slice(-60)
            };
        }

        /**
         * Reset all tracked data
         */
        reset() {
            this.pollTimes = [];
            this.inputAges = [];
            this.lastPollTime = null;
        }
    }

    // Export
    window.ControlDeck = window.ControlDeck || {};
    window.ControlDeck.LatencyTracker = LatencyTracker;

})();
