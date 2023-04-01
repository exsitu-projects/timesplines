let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

describe('Integration Test LineDrawingController', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('draw line test', function () {
        it('should draw a line', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 10, y: 10 }, { x: 11, y: 10 }, { x: 1, y: 15 }], integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].points.length, 2)

            let longerLine = [
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 100 },
                { x: 150, y: 102 },
                { x: 90, y: 102 },
                { x: 40, y: 103 },
                { x: 10, y: 105 }
            ];
            IntegrationUtils.drawLine(longerLine, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[1].points.length, 5)

            IntegrationUtils.drawLine([{ x: 0, y: 0 }], integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2);
        });
    })

    describe('line extension tests', function () {
        it('should extend an timeline with data without moving the data', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 125, y: 100 },
                { x: 150, y: 100 },
            ], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");
            let timeline = integrationEnv.ModelController.getModel().getAllTimelines()[0];

            IntegrationUtils.bindDataToLine(timeline.id, [
                ["Jan 10, 2021", 1],
                ["Jan 12, 2021", "Text Note 1"],
                ["Jan 15, 2021", 2],
                ["Jan 14, 2021", 1.5],
                ["Jan 13, 2021", "Text Note 2"],
                ["Jan 20, 2021", "Text Note 5"]
            ], integrationEnv)

            assert.equal(PathMath.getPathLength(timeline.points), 50)

            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.data-display-point'].innerData.length, 3);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => item.x)).to.eql([100, 120, 125]);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => item.y)).to.eql([70, 35, 0]);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData.length, 3, "Annotations not created")
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text"]
                .innerData.map(item => item.origin.x)).to.eql([110, 115, 150]);
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text"]
                .innerData.map(item => item.origin.y)).to.eql([100, 100, 100]);

            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);

            // get the start button, mouse down, drag away, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-start-target'].eventCallbacks.pointerdown({}, {
                timelineId: integrationEnv.ModelController.getModel().getAllTimelines()[0].id
            });
            IntegrationUtils.pointerMove({ x: 75, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 50, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 25, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 0, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 0, y: 100 }, integrationEnv);

            // there should still be one line
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            assert.equal(PathMath.getPathLength(integrationEnv.ModelController.getModel().getAllTimelines()[0].points), 150)

            // there should be a time pin keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins[0].timeStamp, new Date("Jan 10, 2021").getTime());
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins[0].linePercent).to.be.closeTo(0.66666, 0.0001);

            // the data should have not moved
            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.data-display-point'].innerData.length, 3);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x))).to.eql([100, 120, 125]);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([70, 35, 0]);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData.length, 3, "Annotations not created")
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.origin.x))).to.eql([110, 115, 150]);
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.origin.y))).to.eql([100, 100, 100]);

            // get the end button, mouse down, drag away, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-end-target'].eventCallbacks.pointerdown({}, {
                timelineId: integrationEnv.ModelController.getModel().getAllTimelines()[0].id
            });
            IntegrationUtils.pointerMove({ x: 175, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 200, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 200, y: 100 }, integrationEnv);
            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);

            // there should still be one line
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            assert.equal(PathMath.getPathLength(integrationEnv.ModelController.getModel().getAllTimelines()[0].points), 200)

            // there should be another time pin keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins[1].timeStamp, new Date("Jan 20, 2021").getTime());
            // and the first one should have had it's line percent updated
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins[0].linePercent).to.be.closeTo(0.5, 0.0001);

            // the data should still have not moved
            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.data-display-point'].innerData.length, 3);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x))).to.eql([100, 120, 125]);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([70, 35, 0]);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData.length, 3, "Annotations not created")
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.origin.x))).to.eql([110, 115, 150]);
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.origin.y))).to.eql([100, 100, 100]);
        });
    });

    describe('line merging tests', function () {
        it('should merge empty timelines without error', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([
                { x: 0, y: 100 },
                { x: 25, y: 100 },
                { x: 50, y: 100 },
            ], integrationEnv);

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 125, y: 100 },
                { x: 150, y: 100 },
            ], integrationEnv);

            IntegrationUtils.drawLine([
                { x: 200, y: 100 },
                { x: 225, y: 100 },
                { x: 250, y: 100 },
            ], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 3, "lines not drawn");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 50, 50]);

            let timelineId1 = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            let timelineId3 = integrationEnv.ModelController.getModel().getAllTimelines()[2].id;

            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-end-target'].eventCallbacks.pointerdown({}, {
                timelineId: timelineId1
            });
            IntegrationUtils.pointerMove({ x: 75, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 100, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 100, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 150]);

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-start-target'].eventCallbacks.pointerdown({}, {
                timelineId: timelineId3
            });
            IntegrationUtils.pointerMove({ x: 200, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 175, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 150, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([250]);
            // should not have created pins for an empty line
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => timeline.timePins.length)).to.eql([0]);

        });

        it('should merge a timeline with data without moving time mapped data when its possible', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([
                { x: 0, y: 100 },
                { x: 25, y: 100 },
                { x: 50, y: 100 },
            ], integrationEnv);

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 125, y: 100 },
                { x: 150, y: 100 },
            ], integrationEnv);

            IntegrationUtils.drawLine([
                { x: 200, y: 100 },
                { x: 225, y: 100 },
                { x: 250, y: 100 },
            ], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 3, "lines not drawn");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 50, 50]);

            let timelineId1 = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            let timelineId2 = integrationEnv.ModelController.getModel().getAllTimelines()[1].id;
            let timelineId3 = integrationEnv.ModelController.getModel().getAllTimelines()[2].id;
            IntegrationUtils.bindDataToLine(timelineId1, [
                ["Jan 10, 2021", 1],
                ["Jan 12, 2021", "Text Note 1"]
            ], integrationEnv)
            IntegrationUtils.bindDataToLine(timelineId2, [
                ["Jan 13, 2021", "Text Note 2"],
                ["Jan 14, 2021", 1.5]
            ], integrationEnv)
            IntegrationUtils.bindDataToLine(timelineId3, [
                ["Jan 15, 2021", 2],
                ["Jan 20, 2021", "Text Note 5"]
            ], integrationEnv)


            let selectors = integrationEnv.enviromentVariables.d3.selectors;
            assert.equal(selectors['.data-display-point'].innerData.length, 3);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x))).to.eql([0, 150, 200]);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([0, 0, 0]);

            assert.equal(selectors[".annotation-text"].innerData[0].origin.x, 50)
            assert.equal(selectors[".annotation-text"].innerData[1].origin.x, 100)
            assert.equal(selectors[".annotation-text"].innerData[2].origin.x, 250)
            assert.equal(selectors[".annotation-text"].innerData[0].origin.y, 100)
            assert.equal(selectors[".annotation-text"].innerData[1].origin.y, 100)
            assert.equal(selectors[".annotation-text"].innerData[2].origin.y, 100)

            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-end-target'].eventCallbacks.pointerdown({}, {
                timelineId: timelineId1
            });
            IntegrationUtils.pointerMove({ x: 75, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 100, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 100, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 150]);

            // there should be a time pin keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[1].timePins.length, 2);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[1]
                .timePins.map(b => b.timeStamp)).to.eql([
                    new Date("Jan 12, 2021").getTime(),
                    new Date("Jan 13, 2021").getTime()
                ]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[1]
                .timePins.map(b => Math.round(b.linePercent * 100) / 100)).to.eql([0.33, 0.67]);

            selectors = integrationEnv.enviromentVariables.d3.selectors;
            assert.equal(selectors['.data-display-point'].innerData.length, 3);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x)).sort()).to.eql([0, 150, 200]);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([0, 0, 0]);
            let newTimelineId = integrationEnv.ModelController.getModel().getAllTimelines()[1].id;
            assert.equal(selectors[".annotation-text"].innerData.length, 3)
            assert.equal(selectors[".annotation-text"].innerData[0].origin.x, 250)
            assert.equal(selectors[".annotation-text"].innerData[0].origin.y, 100)
            assert.equal(selectors[".annotation-text"].innerData[1].origin.x, 50)
            assert.equal(selectors[".annotation-text"].innerData[1].origin.y, 100)
            assert.equal(selectors[".annotation-text"].innerData[2].origin.x, 100)
            assert.equal(selectors[".annotation-text"].innerData[2].origin.y, 100)

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-start-target'].eventCallbacks.pointerdown({}, {
                timelineId: timelineId3
            });
            IntegrationUtils.pointerMove({ x: 200, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 175, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 150, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([250]);

            // there should be time pins keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 4);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins.map(b => b.timeStamp)).to.eql([
                    new Date("Jan 12, 2021").getTime(),
                    new Date("Jan 13, 2021").getTime(),
                    new Date("Jan 14, 2021").getTime(),
                    new Date("Jan 15, 2021").getTime()
                ]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins.map(b => Math.round(100 * b.linePercent) / 100)).to.eql([0.2, 0.4, 0.6, 0.8]);

            // the data should still have not moved
            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.data-display-point'].innerData.length, 3);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x))).to.eql([0, 150, 200]);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([0, 0, 0]);

            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData.length, 3, "Annotations not created")
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.origin.x))).to.eql([50, 100, 250]);
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.origin.y))).to.eql([100, 100, 100]);
        });

        it('should merge a timeline with data moving time mapped data when its necessary', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([
                { x: 0, y: 100 },
                { x: 25, y: 100 },
                { x: 50, y: 100 },
            ], integrationEnv);

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 125, y: 100 },
                { x: 150, y: 100 },
            ], integrationEnv);

            IntegrationUtils.drawLine([
                { x: 200, y: 100 },
                { x: 225, y: 100 },
                { x: 250, y: 100 },
            ], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 3, "lines not drawn");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 50, 50]);

            let timelineId1 = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            let timelineId2 = integrationEnv.ModelController.getModel().getAllTimelines()[1].id;
            let timelineId3 = integrationEnv.ModelController.getModel().getAllTimelines()[2].id;
            IntegrationUtils.bindDataToLine(timelineId1, [
                ["Jan 10, 2021", 1],
                ["Jan 13, 2021", "Text Note 1"]
            ], integrationEnv)
            IntegrationUtils.bindDataToLine(timelineId2, [
                ["Jan 12, 2021", "Text Note 2"],
                ["Jan 16, 2021", 1.5]
            ], integrationEnv)
            IntegrationUtils.bindDataToLine(timelineId3, [
                ["Jan 15, 2021", 2],
                ["Jan 20, 2021", "Text Note 5"]
            ], integrationEnv)


            let selectors = integrationEnv.enviromentVariables.d3.selectors;
            assert.equal(selectors['.data-display-point'].innerData.length, 3);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x))).to.eql([0, 150, 200]);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([0, 0, 0]);

            assert.equal(selectors[".annotation-text"].innerData[0].origin.x, 50)
            assert.equal(selectors[".annotation-text"].innerData[1].origin.x, 100)
            assert.equal(selectors[".annotation-text"].innerData[2].origin.x, 250)
            assert.equal(selectors[".annotation-text"].innerData[0].origin.y, 100)
            assert.equal(selectors[".annotation-text"].innerData[1].origin.y, 100)
            assert.equal(selectors[".annotation-text"].innerData[2].origin.y, 100)

            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-end-target'].eventCallbacks.pointerdown({}, {
                timelineId: timelineId1
            });
            IntegrationUtils.pointerMove({ x: 75, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 100, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 100, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 150]);

            // there should be a time pin keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[1].timePins.length, 1);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[1]
                .timePins[0].timeStamp).to.eql(new Date("Jan 12, 2021").getTime());
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[1]
                .timePins[0].linePercent).to.be.closeTo(0.66666, 0.0001);

            selectors = integrationEnv.enviromentVariables.d3.selectors;
            assert.equal(selectors['.data-display-point'].innerData.length, 3);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x)).sort()).to.eql([0, 150, 200]);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([0, 0, 0]);
            assert.equal(selectors[".annotation-text"].innerData.length, 3)

            assert.equal(selectors[".annotation-text"].innerData[2].origin.x, 112.5)
            expect(selectors[".annotation-text"].innerData[2].origin.y).to.be.closeTo(100, 0.0001)

            assert.equal(selectors[".annotation-text"].innerData[0].origin.y, 100)
            assert.equal(selectors[".annotation-text"].innerData[0].origin.x, 250)

            assert.equal(selectors[".annotation-text"].innerData[1].origin.x, 100)
            assert.equal(selectors[".annotation-text"].innerData[1].origin.y, 100)


            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-start-target'].eventCallbacks.pointerdown({}, {
                timelineId: timelineId3
            });
            IntegrationUtils.pointerMove({ x: 200, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 175, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 150, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([250]);

            // there should be time pins keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 2);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins.map(b => b.timeStamp)).to.eql([
                    new Date("Jan 12, 2021").getTime(),
                    new Date("Jan 15, 2021").getTime()
                ]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins.map(b => Math.round(100 * b.linePercent) / 100)).to.eql([0.4, 0.8]);

            // the data should still have not moved
            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.data-display-point'].innerData.length, 3);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                // this last data display point had to move to 
                .innerData.map(item => Math.round(item.x)).sort()).to.eql([0, 200, 210]);
            expect(integrationEnv.enviromentVariables.d3.selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([0, 0, 0]);

            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData.length, 3, "Annotations not created")
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.origin.x))).to.eql([100, 133, 250]);
            expect(integrationEnv.enviromentVariables.d3.selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.origin.y))).to.eql([100, 100, 100]);
        });

        it('should merge a timeline, eliminating duplicate data when necessary', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 0, y: 100 }, { x: 25, y: 100 }, { x: 50, y: 100 }], integrationEnv);
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 125, y: 100 }, { x: 150, y: 100 }], integrationEnv);
            IntegrationUtils.drawLine([{ x: 200, y: 100 }, { x: 225, y: 100 }, { x: 250, y: 100 }], integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 3, "lines not drawn");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 50, 50]);

            let timelineId1 = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            let timelineId2 = integrationEnv.ModelController.getModel().getAllTimelines()[1].id;
            let timelineId3 = integrationEnv.ModelController.getModel().getAllTimelines()[2].id;

            IntegrationUtils.createTable([
                ["Jan 10, 2021", 1],
                ["Jan 12, 2021", "Text 1"],
                ["Jan 13, 2021", "Text 2"],
                ["Jan 16, 2021", 1.5],

                ["Jan 15, 2021", 2],
                ["Jan 20, 2021", "Text 3"],

                ["Jan 10, 2021", "Text 4"],
                ["Jan 16, 2021", "Text 5"]
            ], integrationEnv);
            let len = integrationEnv.ModelController.getModel().getAllTables().length;
            assert(len > 0);
            let tableId = integrationEnv.ModelController.getModel().getAllTables()[len - 1].id;


            IntegrationUtils.selectCells(tableId, 0, 0, 1, 4, integrationEnv);
            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 25, y: 102 }, timelineId1, integrationEnv);

            IntegrationUtils.selectCells(tableId, 0, 4, 1, 5, integrationEnv);
            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 125, y: 102 }, timelineId2, integrationEnv);

            IntegrationUtils.selectCells(tableId, 0, 5, 1, 7, integrationEnv);
            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 225, y: 102 }, timelineId3, integrationEnv);

            // extra bind to make sure we don't bind overlapping data
            IntegrationUtils.selectCells(tableId, 0, 5, 1, 7, integrationEnv);
            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 225, y: 102 }, timelineId3, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 10);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(timelineId1).map(b => b.dataCell.getValue()))
                .to.eql([1, "Text 1", "Text 2", 1.5, 2]);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(timelineId2).map(b => b.dataCell.getValue()))
                .to.eql([2, "Text 3"]);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(timelineId3).map(b => b.dataCell.getValue()))
                .to.eql(["Text 3", "Text 4", "Text 5"]);

            let selectors = integrationEnv.enviromentVariables.d3.selectors;
            assert.equal(selectors['.data-display-point'].innerData.length, 4);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x))).to.eql([0, 42, 50, 100]);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([70, 0, 35, 0]);

            expect(selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.origin.x))).to.eql([17, 25, 150, 250, 200, 230]);
            expect(selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.origin.y))).to.eql([100, 100, 100, 100, 100, 100]);

            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);
            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-end-target'].eventCallbacks.pointerdown({}, { timelineId: timelineId1 });
            IntegrationUtils.pointerMove({ x: 75, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 100, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 100, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 150]);

            let mergedLineId = integrationEnv.ModelController.getModel().getAllTimelines()[1].id;
            // check that the right data is on each line
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 9);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(mergedLineId).map(b => b.dataCell.getValue()))
                .to.eql([1, "Text 1", "Text 2", 1.5, 2, "Text 3"]);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(timelineId3).map(b => b.dataCell.getValue()))
                .to.eql(["Text 3", "Text 4", "Text 5"]);
            // check that the items that should have moved have moved and otherwise things are the same
            selectors = integrationEnv.enviromentVariables.d3.selectors;
            assert.equal(selectors['.data-display-point'].innerData.length, 3);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x))).to.eql([0, 42, 110]);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([70, 0, 35]);

            expect(selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.origin.x))).to.eql([250, 200, 230, 17, 25, 150]);
            expect(selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.origin.y))).to.eql([100, 100, 100, 100, 100, 100]);

            // there should be a time pin keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[1].timePins.length, 2);

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-start-target'].eventCallbacks.pointerdown({}, { timelineId: timelineId3 });
            IntegrationUtils.pointerMove({ x: 200, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 175, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 150, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([250]);


            mergedLineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            // check that the right data is on each line
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 8);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(mergedLineId).map(b => b.dataCell.getValue()))
                .to.eql([1, "Text 1", "Text 2", 1.5, 2, "Text 3", "Text 4", "Text 5"]);
            // check that the items that should have moved have moved and otherwise things are the same
            selectors = integrationEnv.enviromentVariables.d3.selectors;
            assert.equal(selectors['.data-display-point'].innerData.length, 3);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.x))).to.eql([0, 42, 110]);
            expect(selectors['.data-display-point']
                .innerData.map(item => Math.round(item.y))).to.eql([70, 0, 35]);

            expect(selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.origin.x))).to.eql([0, 17, 25, 110, 150]);
            expect(selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.origin.y))).to.eql([100, 100, 100, 100, 100]);


            // there should be time pins keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 4);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins.map(b => b.timeStamp)).to.eql([
                    new Date("Jan 15, 2021").getTime(),
                    new Date("Jan 15, 2021").getTime(),
                    new Date("Jan 20, 2021").getTime(),
                    new Date("Jan 20, 2021").getTime()
                ]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins.map(b => Math.round(100 * b.linePercent) / 100)).to.eql([0.17, 0.4, 0.6, 1]);
        });


        it('should merge a mapped timeline and an unmapped timeline', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 0, y: 100 }, { x: 25, y: 100 }, { x: 50, y: 100 }], integrationEnv);
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 125, y: 100 }, { x: 150, y: 100 }], integrationEnv);
            IntegrationUtils.drawLine([{ x: 200, y: 100 }, { x: 225, y: 100 }, { x: 250, y: 100 }], integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 3, "lines not drawn");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 50, 50]);

            let timelineId1 = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            let timelineId2 = integrationEnv.ModelController.getModel().getAllTimelines()[1].id;
            let timelineId3 = integrationEnv.ModelController.getModel().getAllTimelines()[2].id;

            IntegrationUtils.createTable([
                ["Jan 12, 2021", "Text 1"],
                ["Jan 13, 2021", "Text 2"],
                ["Jan 20, 2021", "Text 3"],
            ], integrationEnv);
            let len = integrationEnv.ModelController.getModel().getAllTables().length;
            assert(len > 0);
            let tableId = integrationEnv.ModelController.getModel().getAllTables()[len - 1].id;

            IntegrationUtils.selectCells(tableId, 0, 0, 1, 1, integrationEnv);
            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 25, y: 102 }, timelineId1, integrationEnv);

            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 125, y: 103 }, timelineId2, integrationEnv);
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);

            IntegrationUtils.selectCells(tableId, 0, 2, 1, 2, integrationEnv);
            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 225, y: 102 }, timelineId3, integrationEnv);

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            let textTargetSet = integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target"]
                .innerData.filter(d => d.binding.timeline.id == timelineId3);
            integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target"].
                eventCallbacks.pointerdown({ clientX: 211, clientY: 115 }, textTargetSet[0]);
            IntegrationUtils.pointerMove({ x: 225, y: 120 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 225, y: 120 }, integrationEnv);
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 4);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(timelineId1).map(b => b.dataCell.getValue()))
                .to.eql(["Text 1", "Text 2"]);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(timelineId2).map(b => b.dataCell.getValue()))
                .to.eql(['<text>']);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(timelineId3).map(b => b.dataCell.getValue()))
                .to.eql(["Text 3"]);

            let selectors = integrationEnv.enviromentVariables.d3.selectors;
            expect(selectors[".annotation-text"].innerData
                .filter(d => d.binding.timeline.id == timelineId1)
                .map(item => Math.round(item.origin.x))).to.eql([0, 50]);
            expect(selectors[".annotation-text"].innerData
                .filter(d => d.binding.timeline.id == timelineId1)
                .map(item => Math.round(item.origin.y))).to.eql([100, 100]);

            expect(selectors[".annotation-text"].innerData
                .filter(d => d.binding.timeline.id == timelineId2)
                .map(item => Math.round(item.origin.x))).to.eql([125]);
            expect(selectors[".annotation-text"].innerData
                .filter(d => d.binding.timeline.id == timelineId2)
                .map(item => Math.round(item.origin.y))).to.eql([100]);

            expect(selectors[".annotation-text"].innerData
                .filter(d => d.binding.timeline.id == timelineId3)
                .map(item => Math.round(item.origin.x))).to.eql([225]);
            expect(selectors[".annotation-text"].innerData
                .filter(d => d.binding.timeline.id == timelineId3)
                .map(item => Math.round(item.origin.y))).to.eql([100]);

            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);
            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-end-target'].eventCallbacks.pointerdown({}, { timelineId: timelineId1 });
            IntegrationUtils.pointerMove({ x: 75, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 100, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 100, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 150]);

            let mergedLineId = integrationEnv.ModelController.getModel().getAllTimelines()[1].id;
            // check that the right data is on each line
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 4);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(mergedLineId).map(b => b.dataCell.getValue()))
                .to.eql(["Text 1", "Text 2", '<text>']);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(timelineId3).map(b => b.dataCell.getValue()))
                .to.eql(["Text 3"]);
            // check that the items that should have moved have moved and otherwise things are the same
            selectors = integrationEnv.enviromentVariables.d3.selectors;
            expect(selectors[".annotation-text"].innerData
                .filter(d => d.binding.timeline.id == mergedLineId)
                .map(item => Math.round(item.origin.x))).to.eql([0, 50, 125]);
            expect(selectors[".annotation-text"].innerData
                .filter(d => d.binding.timeline.id == mergedLineId)
                .map(item => Math.round(item.origin.y))).to.eql([100, 100, 100]);

            // there should be a time pin keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[1].timePins.length, 2);

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-start-target'].eventCallbacks.pointerdown({}, { timelineId: timelineId3 });
            IntegrationUtils.pointerMove({ x: 200, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 175, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 150, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([250]);


            mergedLineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            // check that the right data is on each line
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 4);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(mergedLineId).map(b => b.dataCell.getValue()))
                .to.eql(["Text 1", "Text 2", "<text>", "Text 3"]);
            // check that the items that should have moved have moved and otherwise things are the same
            selectors = integrationEnv.enviromentVariables.d3.selectors;
            expect(selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.origin.x))).to.eql([0, 50, 125, 225]);
            expect(selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.origin.y))).to.eql([100, 100, 100, 100]);


            // there should be time pins keeping data in place
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 3);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins.map(b => b.timeStamp)).to.eql([
                    new Date("Jan 13, 2021").getTime(),
                    new Date("Jan 14 2021 12:00:00").getTime(),
                    new Date("Jan 20, 2021").getTime()
                ]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins.map(b => Math.round(100 * b.linePercent) / 100)).to.eql([0.2, 0.5, 0.9]);
        });

        it('should merge a unmapped timelines', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 0, y: 100 }, { x: 25, y: 100 }, { x: 50, y: 100 }], integrationEnv);
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 125, y: 100 }, { x: 150, y: 100 }], integrationEnv);
            IntegrationUtils.drawLine([{ x: 200, y: 100 }, { x: 225, y: 100 }, { x: 250, y: 100 }], integrationEnv);

            let timelineId1 = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            let timelineId2 = integrationEnv.ModelController.getModel().getAllTimelines()[1].id;
            let timelineId3 = integrationEnv.ModelController.getModel().getAllTimelines()[2].id;

            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 15, y: 103 }, timelineId1, integrationEnv);
            IntegrationUtils.clickLine({ x: 25, y: 103 }, timelineId1, integrationEnv);
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);

            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 125, y: 103 }, timelineId2, integrationEnv);
            IntegrationUtils.clickLine({ x: 135, y: 103 }, timelineId2, integrationEnv);
            IntegrationUtils.clickLine({ x: 145, y: 103 }, timelineId2, integrationEnv);
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);

            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 225, y: 103 }, timelineId3, integrationEnv);
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 6);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(timelineId1).map(b => b.dataCell.getValue()))
                .to.eql(["<text>", "<text>"]);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(timelineId2).map(b => b.dataCell.getValue()))
                .to.eql(["<text>", "<text>", "<text>"]);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(timelineId3).map(b => b.dataCell.getValue()))
                .to.eql(["<text>"]);

            let selectors = integrationEnv.enviromentVariables.d3.selectors;
            expect(selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.x))).to.eql([25, 35, 135, 145, 155, 235]);
            expect(selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.y))).to.eql([110, 110, 110, 110, 110, 110]);

            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);
            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-end-target'].eventCallbacks.pointerdown({}, { timelineId: timelineId1 });
            IntegrationUtils.pointerMove({ x: 75, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 100, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 100, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([50, 150]);

            let mergedLineId = integrationEnv.ModelController.getModel().getAllTimelines()[1].id;
            // check that the right data is on each line
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 6);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(mergedLineId).map(b => b.dataCell.getValue()))
                .to.eql(['<text>', '<text>', '<text>', '<text>', '<text>']);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(timelineId3).map(b => b.dataCell.getValue()))
                .to.eql(['<text>']);
            // check that the items that should have moved have moved and otherwise things are the same
            selectors = integrationEnv.enviromentVariables.d3.selectors;
            expect(selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.x))).to.eql([235, 25, 35, 135, 145, 155]);
            expect(selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.y))).to.eql([110, 110, 110, 110, 110, 110]);

            // there should be only the pins that were there already
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[1].timePins.length, 5);

            // get the start button, mouse down, drag to other point, mouse up
            integrationEnv.enviromentVariables.d3.selectors['.draw-start-target'].eventCallbacks.pointerdown({}, { timelineId: timelineId3 });
            IntegrationUtils.pointerMove({ x: 200, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 175, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 150, y: 100 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "lines not merged");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()
                .map(timeline => PathMath.getPathLength(timeline.points))).to.eql([250]);


            mergedLineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            // check that the right data is on each line
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 6);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(mergedLineId).map(b => b.dataCell.getValue()))
                .to.eql(["<text>", "<text>", "<text>", "<text>", "<text>", "<text>",]);
            // check that the items that should have moved have moved and otherwise things are the same
            selectors = integrationEnv.enviromentVariables.d3.selectors;
            expect(selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.x))).to.eql([25, 35, 135, 145, 155, 235]);
            expect(selectors[".annotation-text"]
                .innerData.map(item => Math.round(item.y))).to.eql([110, 110, 110, 110, 110, 110]);


            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 6);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins.map(b => b.timeStamp)).to.eql([null, null, null, null, null, null]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins.map(b => b.timePercent)).to.eql([0.075, 0.125, 0.375, 0.425, 0.475, 0.75]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0]
                .timePins.map(b => Math.round(100 * b.linePercent) / 100)).to.eql([0.06, 0.1, 0.5, 0.54, 0.58, 0.9]);
        });
    });


    describe('line merging with full data tests', function () {
        it('should extend large timeline without error', async function () {
            integrationEnv.mainInit();
            await IntegrationUtils.loadTestViz("test_viz_1.json", integrationEnv)

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 3);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].cellBindings.length, 6);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 15);
            assert.equal(integrationEnv.ModelController.getModel().getAllImageBindingData().length, 3);

            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);
            integrationEnv.enviromentVariables.d3.selectors['.draw-end-target'].eventCallbacks.pointerdown({ clientX: 1033, clientY: 355 }, {
                timelineId: integrationEnv.ModelController.getModel().getAllTimelines()[0].id
            });
            IntegrationUtils.pointerMove({ x: 1033, y: 355 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 1033, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 1033, y: 101 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 1033, y: 100 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 1033, y: 102 }, integrationEnv);
            IntegrationUtils.clickButton("#line-drawing-button", integrationEnv.enviromentVariables.$);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 3);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].cellBindings.length, 6);
        });
    });
});