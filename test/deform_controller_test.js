const chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

describe('Test DeformController', function () {
    let integrationEnv;
    let getDeformController;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        getDeformController = function () {
            let DeformController = integrationEnv.enviromentVariables.DeformController;
            let mockElement = integrationEnv.enviromentVariables.d3.mockElement;
            return new DeformController(new mockElement(), new mockElement(), new mockElement());
        }
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('instantiation test', function () {
        it('should start without error', function () {
            getDeformController();
        })
    });

    describe('drag line tests', function () {
        it('should start drag without error', function () {
            let deformController = getDeformController();
            deformController.updateModel({
                getAllTimelines: () => [{
                    id: "id1", points: [
                        { x: 0, y: 0 },
                        { x: 10, y: 15 },
                        { x: 5, y: 20 }]
                }, {
                    id: "id2", points: [
                        { x: 10, y: 10 },
                        { x: 15, y: 10 },
                        { x: 15, y: 15 }]
                }]
            })
            deformController.setActive(true);

            deformController.onPointerDown({ x: 10, y: 10 });
        })

        it('should drag start of line without error', function () {
            let deformController = getDeformController();

            deformController.updateModel({
                getAllTimelines: () => [{
                    id: "id1", points: [
                        { x: -10, y: -10 },
                        { x: -10, y: -15 },
                        { x: -5, y: -20 }]
                }, {
                    id: "id2", points: [
                        { x: 10, y: 10 },
                        { x: 20, y: 20 },
                        { x: 30, y: 30 }]
                }]
            })
            deformController.setActive(true);

            deformController.onWheel(-10000);
            deformController.onWheel(400);

            let called = false;
            deformController.setLineModifiedCallback((result) => {
                assert.equal(result[0].newSegments[0].points[0].x, 15)
                assert.equal(result[0].newSegments[0].points[0].y, 15)
                called = true;
            })

            deformController.onPointerDown({ x: 10, y: 10 });
            deformController.onPointerMove({ x: 15, y: 15 });
            deformController.onPointerUp({ x: 15, y: 15 });

            assert.equal(called, true);
        });

        it('should drag end of line without error', function () {
            let deformController = getDeformController();

            deformController.updateModel({
                getAllTimelines: () => [{
                    id: "id1", points: [
                        { x: -10, y: -10 },
                        { x: -10, y: -15 },
                        { x: -5, y: -20 }]
                }, {
                    id: "id2", points: [
                        { x: 10, y: 10 },
                        { x: 20, y: 20 },
                        { x: 30, y: 30 }]
                }]
            })
            deformController.setActive(true);

            deformController.onWheel(-10000);
            deformController.onWheel(400);

            let called = false;
            deformController.setLineModifiedCallback((result) => {
                assert.equal(result[0].newSegments[1].points[1].x, 5)
                assert.equal(result[0].newSegments[1].points[1].y, -2)
                called = true;
            })


            deformController.onPointerDown({ x: -5, y: -28 });
            deformController.onPointerMove({ x: 5, y: -8 });
            deformController.onPointerUp({ x: 5, y: -10 });

            assert.equal(called, true);
        });

        it('should drag points in middle of line', function () {
            let deformController = getDeformController();

            deformController.updateModel({
                getAllTimelines: () => [{
                    id: "1654867647735_5", points: [
                        { x: 121, y: 306 },
                        { x: 170.47430419921875, y: 313.05169677734375 },
                        { x: 220.34288024902344, y: 316.6365661621094 },
                        { x: 270.1659240722656, y: 320.81927490234375 },
                        { x: 320.0511169433594, y: 323.1343994140625 },
                        { x: 369.8844909667969, y: 319.5586242675781 },
                        { x: 419.21697998046875, y: 311.4256286621094 },
                        { x: 468.8236083984375, y: 305.245361328125 },
                        { x: 518.4913940429688, y: 299.5127258300781 },
                        { x: 568.2349853515625, y: 294.8827209472656 },
                        { x: 618.2064208984375, y: 293.8427734375 },
                        { x: 667.8211669921875, y: 287.9786682128906 },
                        { x: 682, y: 282 }]
                }]
            });
            deformController.setActive(true);

            // set the brush size to 10
            deformController.onWheel(-10000);
            deformController.onWheel(400);

            let called = false;
            deformController.setLineModifiedCallback((result) => {
                assert.equal(result.length, 1);
                assert.equal(result[0].oldSegments.length, 3);
                assert.equal(result[0].oldSegments[1].points.length, 2);
                assert.equal(result[0].newSegments.length, 3);
                assert.equal(result[0].newSegments[1].points.length, 2);
                expect(result[0].newSegments[1].points[0].x).to.be.closeTo(14.2, .1);
                expect(result[0].newSegments[1].points[0].y).to.be.closeTo(13.4, .1);
                called = true;
            })

            deformController.onPointerDown({ x: 420, y: 313 });
            deformController.onPointerMove({ x: 100, y: 100 });
            deformController.onPointerUp({ x: 15, y: 15 });

            assert.equal(called, true);
        });

        it('should create appropriate new points for line with no points', function () {
            let deformController = getDeformController();

            deformController.updateModel({
                getAllTimelines: () => [{
                    id: "1654867647735_5", points: [
                        { x: 0, y: 40 },
                        { x: 0, y: 0 },
                        { x: 40, y: 40 },
                        { x: 40, y: 0 }]
                }]
            });
            deformController.setActive(true);

            // set the brush size to 10
            deformController.onWheel(-10000);
            deformController.onWheel(400);

            let called = false;
            deformController.setLineModifiedCallback((result) => {
                assert.equal(result.length, 1);
                assert.equal(result[0].oldSegments.length, 3);
                assert.equal(result[0].oldSegments[1].points.length, 2);
                assert.equal(result[0].newSegments.length, 3);
                assert.equal(result[0].newSegments[1].points.length, 2);

                expect(result[0].newSegments[1].points[0].x).to.be.closeTo(14.1, .1);
                expect(result[0].newSegments[1].points[0].y).to.be.closeTo(14.1, .1);

                expect(result[0].newSegments[1].points[1].x).to.be.closeTo(28.2, .1);
                expect(result[0].newSegments[1].points[1].y).to.be.closeTo(28.2, .1);

                called = true;
            })

            let clickPoint = { x: 21, y: 19 };
            deformController.onPointerDown(clickPoint);
            deformController.onPointerUp(clickPoint);

            assert.equal(called, true);
        });

        it('should create appropriate new points for line with points', function () {
            let deformController = getDeformController();

            deformController.updateModel({
                getAllTimelines: () => [{
                    id: "1654867647735_5", points: [
                        { x: 0, y: 40 },
                        { x: 0, y: 0 },
                        { x: 20, y: 20 },
                        { x: 40, y: 40 },
                        { x: 40, y: 0 }]
                }]
            });
            deformController.setActive(true);

            // set the brush size to 10
            deformController.onWheel(-10000);
            deformController.onWheel(400);

            let called = false;
            deformController.setLineModifiedCallback((result) => {
                assert.equal(result.length, 1);
                assert.equal(result[0].oldSegments.length, 3);
                assert.equal(result[0].oldSegments[1].points.length, 3);
                assert.equal(result[0].newSegments.length, 3);
                assert.equal(result[0].newSegments[1].points.length, 3);

                expect(result[0].newSegments[1].points[0].x).to.be.closeTo(14.1, .1);
                expect(result[0].newSegments[1].points[0].y).to.be.closeTo(14.1, .1);

                expect(result[0].newSegments[1].points[1].x).to.be.closeTo(20, .1);
                expect(result[0].newSegments[1].points[1].y).to.be.closeTo(20, .1);

                expect(result[0].newSegments[1].points[2].x).to.be.closeTo(28.2, 1);
                expect(result[0].newSegments[1].points[2].y).to.be.closeTo(28.2, 1);

                called = true;
            })

            let clickPoint = { x: 21, y: 19 };
            deformController.onPointerDown(clickPoint);
            deformController.onPointerUp(clickPoint);

            assert.equal(called, true);
        });

        it('should drag line between points', function () {
            let deformController = getDeformController();

            deformController.updateModel({
                getAllTimelines: () => [{
                    id: "1654867647735_5", points: [
                        { x: 57, y: 292 },
                        { x: 106.71902465820312, y: 287.2408142089844 },
                        { x: 156.71688842773438, y: 286.9873962402344 },
                        { x: 206.7021942138672, y: 286.83392333984375 },
                        { x: 256.36041259765625, y: 281.0871276855469 },
                        { x: 305.69073486328125, y: 272.94775390625 },
                        { x: 355.42828369140625, y: 268.02215576171875 },
                        { x: 405.401611328125, y: 266.8685607910156 },
                        { x: 455.37518310546875, y: 266.03228759765625 },
                        { x: 505.30194091796875, y: 266.1291809082031 },
                        { x: 554.2832641601562, y: 275.4727783203125 },
                        { x: 603.6814575195312, y: 280.8619079589844 },
                        { x: 652.7205810546875, y: 271.8529052734375 },
                        { x: 702.0360717773438, y: 263.6290283203125 },
                        { x: 750.932861328125, y: 254.02215576171875 },
                        { x: 778, y: 243 }]
                }]
            });
            deformController.setActive(true);

            // set the brush size to 10
            deformController.onWheel(-10000);
            deformController.onWheel(400);

            let called = false;
            deformController.setLineModifiedCallback((result) => {
                assert.equal(result.length, 1);
                assert.equal(result[0].oldSegments.length, 3);
                assert.equal(result[0].oldSegments[1].points.length, 2);
                assert.equal(result[0].newSegments.length, 3);
                assert.equal(result[0].newSegments[1].points.length, 2);
                expect(result[0].newSegments[1].points[0].x).to.be.closeTo(175.5, .1);
                expect(result[0].newSegments[1].points[0].y).to.be.closeTo(67.5, .1);
                expect(result[0].newSegments[1].points[1].x).to.be.closeTo(195.5, .1);
                expect(result[0].newSegments[1].points[1].y).to.be.closeTo(67.0, .1);
                called = true;
            })

            deformController.onPointerDown({ x: 378, y: 265 });
            deformController.onPointerMove({ x: 178, y: 65 });
            deformController.onPointerUp({ x: 178, y: 65 });

            assert.equal(called, true);
        });

    });
});

describe('Integration Test DeformController', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('deform line test', function () {
        it("should only move affected pins", async () => {
            integrationEnv.mainInit();

            let line = [
                { x: 100, y: 100 },
                { x: 125, y: 100 },
                { x: 150, y: 100 },
                { x: 175, y: 100 },
                { x: 250, y: 100 },
                { x: 300, y: 100 },
            ];
            IntegrationUtils.drawLine(line, integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");
            let beforePoints = integrationEnv.ModelController.getModel().getAllTimelines()[0].points;
            assert.equal(beforePoints.length, 5, "line not drawn");
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", "sometext1"],
                ["Jan 20, 2021", "sometext3"]
            ], integrationEnv)
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 100, y: 102 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 150, y: 101 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 200, y: 101 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 250, y: 103 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 300, y: 101 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(p => p.linePercent)).to.eql([0, 0.25, 0.5, 0.75, 1]);


            IntegrationUtils.clickButton("#line-manipulation-button", integrationEnv.enviromentVariables.$);
            // set the brush size to 10
            IntegrationUtils.wheel(-10000, integrationEnv);
            IntegrationUtils.wheel(498, integrationEnv);

            IntegrationUtils.mainPointerDown({ x: 195, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 195, y: 200 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 195, y: 200 }, integrationEnv);
            IntegrationUtils.clickButton("#line-manipulation-button", integrationEnv.enviromentVariables.$);

            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].points).to.not.eql(beforePoints);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].points.length, 9);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(p => Math.round(p.linePercent * 1000) / 1000)).to.eql([0, 0.125, 0.5, 0.875, 1]);
        })

    })
});
