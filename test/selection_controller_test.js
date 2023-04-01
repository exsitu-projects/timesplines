const chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

describe('Test SelectionController', function () {
    let integrationEnv;
    let getSelectionController;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        getSelectionController = function () {
            let SelectionController = integrationEnv.enviromentVariables.SelectionController;
            let mockElement = integrationEnv.enviromentVariables.d3.mockElement;
            return new SelectionController(new mockElement(), new mockElement(), new mockElement());
        }
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('instantiation test', function () {
        it('should start without error', function () {
            getSelectionController();
        })
    });

    describe('drag controls tests', function () {
        it('should rotate the line from the start point', function () {
            let selectionController = getSelectionController();

            let lineData = {
                id: "1656511643611_1",
                points: [{ x: 10, y: 10 }, { x: 5, y: 10 }, { x: 10, y: 15 }, { x: 25, y: 5 }, { x: 25, y: 10 }, { x: 25, y: 15 }, { x: 20, y: 15 }, { x: 0, y: 0 }],
                color: "#FF0000",
            };

            selectionController.updateModel({ getTimelineById: () => lineData });
            selectionController.setActive(true);

            let called = false;
            selectionController.setLineModifiedCallback((lineId, oldPoints, result) => {
                assert.equal(result.length, lineData.points.length);
                expect(result.map(p => Math.round(p.x))).to.eql(lineData.points.map(p => p.y * 2));
                expect(result.map(p => Math.round(p.y))).to.eql(lineData.points.map(p => p.x == 0 ? 0 : p.x * -2));
                called = true;
            })

            selectionController.onTimelineDragStart("1656511643611_1", { x: 20, y: -20 });
            selectionController.onPointerUp({ x: 20, y: -20 });
            let endPoint = integrationEnv.enviromentVariables.d3.selectors['#line-selection-start-point-target'];
            endPoint.eventCallbacks.pointerdown({ clientX: 10, clientY: 10 }, lineData);
            selectionController.onPointerMove({ x: 20, y: -20 });
            selectionController.onPointerUp({ x: 20, y: -20 });

            assert.equal(called, true);
        });

        it('should rotate the line from the end point', function () {
            let selectionController = getSelectionController();

            let lineData = {
                id: "1656511643611_1",
                points: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 5, y: 10 }, { x: 10, y: 15 }, { x: 15, y: 20 }, { x: 20, y: 20 }, { x: 15, y: 15 }, { x: 10, y: 10 }, { x: 15, y: 5 }, { x: 25, y: 5 }, { x: 25, y: 10 }, { x: 25, y: 15 }, { x: 20, y: 15 }, { x: 10, y: 10 }],
                color: "#FF0000",
            };

            selectionController.updateModel({ getTimelineById: () => lineData });
            selectionController.setActive(true);

            let called = false;
            selectionController.setLineModifiedCallback((lineId, oldPoints, result) => {
                assert.equal(result.length, lineData.points.length);
                expect(result.map(p => Math.round(p.x))).to.eql(lineData.points.map(p => p.y * 2));
                expect(result.map(p => Math.round(p.y))).to.eql(lineData.points.map(p => p.x == 0 ? 0 : p.x * -2));
                called = true;
            })

            selectionController.onTimelineDragStart("1656511643611_1", { x: 20, y: -20 });
            selectionController.onPointerUp({ x: 20, y: -20 });
            let endPoint = integrationEnv.enviromentVariables.d3.selectors['#line-selection-end-point-target'];
            endPoint.eventCallbacks.pointerdown({ clientX: 10, clientY: 10 }, lineData);
            selectionController.onPointerMove({ x: 20, y: -20 });
            selectionController.onPointerUp({ x: 20, y: -20 });

            assert.equal(called, true);
        });
    });
});

describe('Integration Test SelectionController', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('drag line end point test', function () {
        it('should drag the whole line', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 200, y: 200 }
            ], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.clickButton("#selection-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 100, y: 100 }, { x: 150, y: 200 }, { x: 150, y: 200 }],
                integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.clickButton("#selection-button", integrationEnv.enviromentVariables.$);

            let linePoints = integrationEnv.ModelController.getModel().getAllTimelines()[0].points;
            expect(linePoints[0]).to.eql({ x: 150, y: 200 });
            expect(linePoints[linePoints.length - 1]).to.eql({ x: 250, y: 300 });
        });
    })
});
