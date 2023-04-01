const { expect } = require('chai');
const chai = require('chai');
let assert = chai.assert;

describe('Integration Test StrokeController', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('lens stroke draw and display', function () {
        it('should show a stroke drawn in lens in the canvas without time data', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 300, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.clickButton("#lens-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 100 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors["#lens-line"].innerData.length, 1);

            let squiggle = [
                { x: 110, y: 100 },
                { x: 120, y: 110 },
                { x: 130, y: 100 },
                { x: 140, y: 110 },
                { x: 150, y: 102 },
                { x: 160, y: 110 }
            ];

            IntegrationUtils.drawLensColorLine(squiggle, integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".lens-annotation-stroke"].innerData.length, 1);
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 1);
            expect(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData[0].projectedPoints)
                .to.eql([{ x: 210, y: 150 },
                { x: 220, y: 160 },
                { x: 230, y: 150 },
                { x: 240, y: 160 },
                { x: 250, y: 152 },
                { x: 260, y: 160 }]);

            IntegrationUtils.drawLensColorLine([{ x: 10, y: 100 }, { x: 34, y: 110 }], integrationEnv);
            IntegrationUtils.drawLensColorLine([{ x: 130, y: 100 }, { x: 324, y: 110 }], integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".lens-annotation-stroke"].innerData.length, 3);
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 3);
        });

        it('should show a stroke drawn in lens in the canvas with time data', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.bindDataToLine(integrationEnv.ModelController.getModel().getAllTimelines()[0].id, [
                ["Jan 10, 2021", "7"],
                ["Jan 20, 2021", "18"]
            ], integrationEnv)

            IntegrationUtils.clickButton("#lens-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 100 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors["#lens-line"].innerData.length, 1);

            let squiggle = [
                { x: 10, y: 100 },
                { x: 20, y: 110 },
                { x: 30, y: 100 },
                { x: 40, y: 110 },
                { x: 50, y: 102 },
                { x: 60, y: 110 }
            ];

            IntegrationUtils.drawLensColorLine(squiggle, integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".lens-annotation-stroke"].innerData.length, 1);
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 1);
            expect(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData[0].projectedPoints)
                .to.eql([
                    { x: 110, y: 150 },
                    { x: 120, y: 160 },
                    { x: 130, y: 150 },
                    { x: 140, y: 160 },
                    { x: 150, y: 152 },
                    { x: 160, y: 160 }
                ]);

            IntegrationUtils.drawLensColorLine([{ x: 10, y: 100 }, { x: 34, y: 110 }], integrationEnv);
            IntegrationUtils.drawLensColorLine([{ x: 130, y: 100 }, { x: 324, y: 110 }], integrationEnv);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".lens-annotation-stroke"].innerData.length, 3);
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 3);
        });
    })

    describe('canvas stroke draw and display', function () {
        it('should show a stroke drawn in canvas', function () {
            integrationEnv.mainInit();
            let squiggle = [
                { x: 10, y: 100 },
                { x: 20, y: 110 },
                { x: 30, y: 100 },
                { x: 40, y: 110 },
                { x: 50, y: 102 },
                { x: 60, y: 110 }
            ];

            IntegrationUtils.clickButton("#color-brush-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.mainPointerDown(squiggle[0], integrationEnv)
            squiggle.forEach(point => {
                IntegrationUtils.pointerMove(point, integrationEnv);
            })
            IntegrationUtils.pointerUp(squiggle[squiggle.length - 1], integrationEnv);
            IntegrationUtils.clickButton("#color-brush-button", integrationEnv.enviromentVariables.$);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData.length, 1);
            expect(integrationEnv.enviromentVariables.d3.selectors[".canvas-annotation-stroke"].innerData[0].projectedPoints)
                .to.eql([
                    { x: 10, y: 100 },
                    { x: 20, y: 110 },
                    { x: 30, y: 100 },
                    { x: 40, y: 110 },
                    { x: 50, y: 102 },
                    { x: 60, y: 110 }
                ]);
        });
    })
});
