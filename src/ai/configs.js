/**
 * ControlDeck AI Game Configurations
 * Predefined AI behaviors for various games
 */
(function() {
    'use strict';

    const GAME_CONFIGS = {
        'pong': {
            name: 'Pong AI',
            channel: 'pong',
            description: 'AI controller for Pong - tracks ball and moves paddles',

            params: {
                p1Enabled: true,
                p2Enabled: true,
                p1Skill: 0.8,          // 0-1 reaction accuracy
                p2Skill: 0.8,
                p1Delay: 50,           // ms reaction delay
                p2Delay: 50,
                predictionNoise: 0.1   // Human-like imperfection
            },

            initialState: {
                ballX: 350,
                ballY: 200,
                ballVx: 5,
                ballVy: 2,
                p1Y: 200,
                p2Y: 200,
                canvasWidth: 700,
                canvasHeight: 400,
                paddleHeight: 80
            },

            /**
             * AI tick function - called every frame
             * @param {Object} state - Current game state
             * @param {Object} params - AI parameters
             * @returns {Object} Output axes [lx, ly, rx, ry]
             */
            tick: function(state, params) {
                const outputs = { axes: [0, 0, 0, 0] };

                /**
                 * Predict where ball will be at targetX
                 * @param {number} targetX - X position to predict for
                 * @returns {number} Predicted Y position
                 */
                const predictBallY = (targetX) => {
                    if (state.ballVx === 0) return state.ballY;

                    const timeToTarget = (targetX - state.ballX) / state.ballVx;
                    if (timeToTarget < 0) return state.ballY;

                    let predictedY = state.ballY + state.ballVy * timeToTarget;

                    // Simulate bounces
                    while (predictedY < 0 || predictedY > state.canvasHeight) {
                        if (predictedY < 0) predictedY = -predictedY;
                        if (predictedY > state.canvasHeight) {
                            predictedY = 2 * state.canvasHeight - predictedY;
                        }
                    }

                    // Add noise for imperfection
                    predictedY += (Math.random() - 0.5) * params.predictionNoise * state.paddleHeight;

                    return predictedY;
                };

                // P1 (left paddle) - uses left stick Y (axis 1)
                if (params.p1Enabled && state.ballVx < 0) {
                    const targetY = predictBallY(24);
                    const diff = targetY - state.p1Y;
                    const threshold = state.paddleHeight * 0.3 * (1 - params.p1Skill);

                    if (Math.abs(diff) > threshold) {
                        outputs.axes[1] = Math.sign(diff) * Math.min(1, Math.abs(diff) / 100) * params.p1Skill;
                    }
                }

                // P2 (right paddle) - uses right stick Y (axis 3)
                if (params.p2Enabled && state.ballVx > 0) {
                    const targetY = predictBallY(state.canvasWidth - 24);
                    const diff = targetY - state.p2Y;
                    const threshold = state.paddleHeight * 0.3 * (1 - params.p2Skill);

                    if (Math.abs(diff) > threshold) {
                        outputs.axes[3] = Math.sign(diff) * Math.min(1, Math.abs(diff) / 100) * params.p2Skill;
                    }
                }

                return outputs;
            }
        }
    };

    // Export
    window.ControlDeck = window.ControlDeck || {};
    window.ControlDeck.GAME_CONFIGS = GAME_CONFIGS;

})();
