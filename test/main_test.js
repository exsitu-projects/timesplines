let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;
let should = chai.should();

describe('Test Main - Integration Test', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('intialization test', function () {
        it('should intialize', function () {
            integrationEnv.mainInit();
        });
    })

    describe('link data test', function () {
        it('should link non-blank data cell', function () {
            integrationEnv.mainInit();

            IntegrationUtils.createTable([
                ["timeCell", 10, ""],
                ["", 20, ""],
                ["", "text1", "text2"],
            ], integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 100 },
                { x: 150, y: 102 },
                { x: 90, y: 102 },
                { x: 40, y: 103 },
                { x: 10, y: 105 }], integrationEnv);
            let len = integrationEnv.ModelController.getModel().getAllTables().length;
            assert(len > 0);
            let tableId = integrationEnv.ModelController.getModel().getAllTables()[len - 1].id;

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].points.length, 5)

            IntegrationUtils.selectCells(tableId, 0, 0, 2, 0, integrationEnv);
            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 102 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);

            IntegrationUtils.selectCells(tableId, 0, 0, 1, 1, integrationEnv);
            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 102 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);

            // won't bind the two time cols.
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].cellBindings.length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);
            expect(integrationEnv.ModelController.getModel().getAllCellBindingData().map(cb => cb.dataCell.getValue())).to.eql([10, 20]);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().find(item => item.axisBinding).axisBinding.val1, 10);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().find(item => item.axisBinding).axisBinding.val2, 20);
        });

        it('draw data points for linked cells', function () {
            // WARNING: This test liable to break when moved to another timezone. (written for CET)
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 150, y: 100 },
                { x: 200, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            IntegrationUtils.bindDataToLine(integrationEnv.ModelController.getModel().getAllTimelines()[0].id, [
                ["textTime", "10", "text1"],
                ["2022", "20", "text5"],
                ["Jan 30, 2022", "text2", "text3"],
                ["2022-01-03", "text4", "10"],
                ["2022-01-6", "text6", "text7"],
                ["Jan 15, 2022", "text8", "13"],
                ["2022-01-27", "15", "text9"],
                ["Jan 2022", "16", "18"],
            ], integrationEnv);

            // check that all 8 data cells were bound, with one axis for each column
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].cellBindings.length, 16);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].axisBindings.length, 2);

            // check that the comments were drawn in the correct places
            let annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData;
            assert.equal(annotationSet.length, 9)
            expect(annotationSet.map(a => {
                return {
                    x: Math.round(a.origin.x),
                    y: Math.round(a.origin.y),
                    label: a.text
                }
            }).sort((a, b) => a.label < b.label ? -1 : 1)).to.eql([{
                x: 100,
                y: 100,
                label: "text1"
            }, {
                x: 200,
                y: 100,
                label: "text2"
            }, {
                x: 200,
                y: 100,
                label: "text3"
            }, {
                x: 107,
                y: 100,
                label: "text4"
            }, {
                x: 100,
                y: 100,
                label: "text5"
            }, {
                x: 117,
                y: 100,
                label: "text6"
            }, {
                x: 117,
                y: 100,
                label: "text7"
            }, {
                x: 148,
                y: 100,
                label: "text8"
            }, {
                x: 190,
                y: 100,
                label: "text9"
            }]);

            // check that the numbers were drawn in the correct places
            let dataPoints = integrationEnv.enviromentVariables.d3.selectors[".data-display-point"].innerData;
            assert.equal(dataPoints.length, 7)
            expect(dataPoints.map(d => {
                return {
                    x: Math.round(d.x),
                    y: Math.round(d.y)
                }
            }).sort((a, b) => a.x - b.x == 0 ? a.y - b.y : a.x - b.x)).to.eql([{
                x: 50,
                y: 70,
            }, {
                x: 100,
                y: 0,
            }, {
                x: 100,
                y: 0,
            }, {
                x: 100,
                y: 28,
            }, {
                x: 107,
                y: 70,
            }, {
                x: 148,
                y: 44,
            }, {
                x: 190,
                y: 35,
            }]);
        });
    });


    describe('table - time pin test', function () {
        it('time pin should move comment', function () {
            integrationEnv.mainInit();

            // draw a line, bind data
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", "sometext1"],
                ["Jan 20, 2021", "sometext3"]
            ], integrationEnv)
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);

            // add a time pin at 40%, and drag to 20%
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 140, y: 110 }, { x: 125, y: 110 }], timelineId, integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].linePercent, 0.25);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].timeStamp,
                0.40 * (new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime());

            // add a comment
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 125, y: 110 }, timelineId, integrationEnv);
            let annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData;
            assert.equal(annotationSet.length, 3, "annotation not created");
            assert.equal(annotationSet[2].origin.x, 125);
            assert.equal(annotationSet[2].origin.y, 100);

            // add a second comment
            IntegrationUtils.clickLine({ x: 150, y: 110 }, timelineId, integrationEnv);
            annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text"]
                .innerData.filter(d => d.binding.timeline.id == timelineId);
            assert.equal(annotationSet.length, 4, "annotation not created");
            assert.equal(annotationSet[3].origin.x, 150);
            assert.equal(annotationSet[3].origin.y, 100);

            // check that two table rows were created
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 5);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows[3].dataCells[1].val, "Jan 14, 2021 00:00:00");
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows[4].dataCells[1].val, "Jan 16, 2021 00:00:00");

            // check that the annotation was bound to the line
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 4);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData()[2].timeCell.getValue(), new Date("Jan 14, 2021").getTime());
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData()[2].dataCell.getValue(), "Jan 14, 2021 00:00:00");
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData()[3].timeCell.getValue(), new Date("Jan 16, 2021").getTime());
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData()[3].dataCell.getValue(), "Jan 16, 2021 00:00:00");

            // move the time pin
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            let tickTargets = integrationEnv.enviromentVariables.d3.selectors['.pin-tick-target[timeline-id="' + timelineId + '"]'];
            tickTargets.eventCallbacks.pointerdown({ clientX: 150, clientY: 110 }, tickTargets.innerData[0]);
            IntegrationUtils.pointerMove({ x: 150, y: 110 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 150, y: 110 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].linePercent, 0.5);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].timeStamp,
                0.40 * (new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime());

            // check that comments moved
            annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData;
            assert.equal(annotationSet.length, 4)
            assert.equal(annotationSet[1].origin.x, 150);
            assert.equal(annotationSet[1].origin.y, 100);
            assert.equal(annotationSet[1].text, 'Jan 14, 2021 00:00:00');
            assert.equal(Math.round(annotationSet[2].origin.x), 167);
            assert.equal(annotationSet[2].origin.y, 100);
            assert.equal(annotationSet[2].text, 'Jan 16, 2021 00:00:00');

            // add and drag another pin (with 0.4 mapped to 0.5, 0.75 should be 0.7)
            IntegrationUtils.dragLine([{ x: 175, y: 110 }, { x: 170, y: 110 }], timelineId, integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[1].linePercent, 0.7);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[1].timeStamp, new Date("Jan 17 2021").getTime());

            // update the time cells
            // check the table is what we expect it to be4
            let tableId = integrationEnv.ModelController.getModel().getAllTables()[0].id;
            let table = integrationEnv.enviromentVariables.jspreadsheetTables[tableId];
            expect(table.data).to.eql([
                ['Jan 10, 2021', 'sometext1', ''],
                ['Jan 20, 2021', 'sometext3', ''],
                ['', '', ''],
                ['Jan 14, 2021 00:00:00', 'Jan 14, 2021 00:00:00', ''],
                ['Jan 16, 2021 00:00:00', 'Jan 16, 2021 00:00:00', '']
            ])
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].timeStamp, new Date("Jan 14 2021").getTime());
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].linePercent, 0.5);

            table.onchange("#table_" + tableId, "cellInstance", 0, 3, "Jan 12, 2021", 'Jan 14, 2021 00:00:00');

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].timeStamp, new Date("Jan 14 2021").getTime());
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].linePercent, 0.5);

            // check the the comment moved
            annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData;
            assert.equal(annotationSet.length, 4)
            assert.equal(annotationSet[3].origin.x, 125);
            assert.equal(annotationSet[3].origin.y, 100);
            assert.equal(annotationSet[3].text, "Jan 14, 2021 00:00:00");
            assert.equal(Math.round(annotationSet[2].origin.x), 163);
            assert.equal(annotationSet[2].origin.y, 100);
            assert.equal(annotationSet[2].text, "Jan 16, 2021 00:00:00");
        });
    });

    describe('Data - time pin test', function () {
        it('should create a time pin for a dragged comment', function () {
            integrationEnv.mainInit();

            // draw a line
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", "7"],
                ["Jan 20, 2021", "18"]
            ], integrationEnv)

            // add a few comments
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 100, y: 100 }, timelineId, integrationEnv);
            IntegrationUtils.clickLine({ x: 200, y: 100 }, timelineId, integrationEnv);
            IntegrationUtils.clickLine({ x: 120, y: 100 }, timelineId, integrationEnv);
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 5);

            // check that three table rows were created
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 6);

            // go to pin mode
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);

            // there should be no bindings yet
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 0);

            // drag the comment
            let targetData = integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target"]
                .innerData.filter(d => d.binding.timeline.id == timelineId);
            integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target"]
                .eventCallbacks.pointerdown({ clientX: 130, clientY: 110 }, targetData[1]);
            IntegrationUtils.pointerMove({ x: 130, y: 130 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 140, y: 150 }, integrationEnv);

            // check that there are still the six table rows
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 6);

            // check that a binding was created for the annotation row
            let annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text"]
                .innerData.filter(d => d.binding.timeline.id == timelineId);
            assert.equal(annotationSet[2].binding.cellBindingId, targetData[2].binding.cellBindingId);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].linePercent, 0.4);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].timeStamp, new Date("Jan 12 2021").getTime());

            // check that the comment is where it's expect to be
            assert.equal(annotationSet[1].origin.x, 140);
            assert.equal(annotationSet[1].origin.y, 100);
            assert.equal(annotationSet[1].binding.cellBinding.offset.x, 0);
            assert.equal(annotationSet[1].binding.cellBinding.offset.y, 50, "offset not updated");
        });

        it('should create a time pin for a dragged data point', function () {
            integrationEnv.mainInit();

            // draw a line
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", "<text1>"],
                ["Jan 15, 2021", "10"],
                ["Jan 20, 2021", "<text2>"]
            ], integrationEnv)

            // check that three table rows were created
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 3);

            // go to pin mode
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);

            // there should be no bindings yet
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 0);

            // drag the point
            let targetData = integrationEnv.enviromentVariables.d3.selectors[".data-target-point"].innerData;
            assert.equal(targetData.length, 1);
            assert.equal(targetData[0].x, 150);
            assert.equal(targetData[0].y, 0);
            integrationEnv.enviromentVariables.d3.selectors[".data-target-point"]
                .eventCallbacks.pointerdown({ clientX: 130, clientY: 110 }, targetData[0]);
            IntegrationUtils.pointerMove({ x: 130, y: 130 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 140, y: 150 }, integrationEnv);

            // check that there are still the six table rows
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 3);

            // check that a binding was created
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].linePercent, 0.4);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].timeStamp, new Date("Jan 15 2021").getTime());

            // check that the point is where it's expect to be
            targetData = integrationEnv.enviromentVariables.d3.selectors[".data-target-point"].innerData;
            assert.equal(targetData.length, 1);
            assert.equal(targetData[0].x, 140);
            assert.equal(targetData[0].y, 0);
        });


        it('should set the offset correctly for dragged comment creating time pin', function () {
            integrationEnv.mainInit();

            // draw a line
            IntegrationUtils.drawLine([{ x: 100, y: 200 }, { x: 150, y: 150 }, { x: 200, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", "7"],
                ["Jan 20, 2021", "18"]
            ], integrationEnv)

            // add a few comments
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 100, y: 200 }, timelineId, integrationEnv);
            IntegrationUtils.clickLine({ x: 200, y: 100 }, timelineId, integrationEnv);
            IntegrationUtils.clickLine({ x: 120, y: 180 }, timelineId, integrationEnv);
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 5);

            // check that three table rows were created
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 6);

            // get the drag functions
            let annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData;
            expect(annotationSet[2].binding.cellBinding.offset.x).to.be.closeTo(10, 0.1);
            expect(annotationSet[2].binding.cellBinding.offset.y).to.be.closeTo(10, 0.1);


            // go to pin mode
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);

            // there should be no bindings yet
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 0);

            // drag the comment
            let onCommentDragStart = integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target"].eventCallbacks.pointerdown;
            let targetSet = integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target"]
                .innerData.filter(d => d.binding.timeline.id == timelineId);;
            onCommentDragStart({ clientX: 130, clientY: 190 }, targetSet[2]);
            IntegrationUtils.pointerMove({ x: 150, y: 170 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 160, y: 180 }, integrationEnv);

            // check that there are still three extra table rows
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables()[0].dataRows.length, 6);

            // check that the offset is what it's expect to be
            annotationSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData;
            expect(annotationSet[2].origin.x).to.be.closeTo(140, 0.1);
            expect(annotationSet[2].origin.y).to.be.closeTo(160, 0.1);
            expect(annotationSet[2].binding.cellBinding.offset.x).to.be.closeTo(20, 0.1);
            expect(annotationSet[2].binding.cellBinding.offset.y).to.be.closeTo(20, 0.1);
        });
    });

    describe('Data linking - eraser test', function () {
        it('should correctly add end time pins', async function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 0, y: 10 }, { x: 100, y: 10 }, { x: 200, y: 10 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");
            IntegrationUtils.bindDataToLine(integrationEnv.ModelController.getModel().getAllTimelines()[0].id, [
                ["Jan 10, 2021", "7"],
                ["Jan 20, 2021", "18"]
            ], integrationEnv)

            // add a few comments
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 0, y: 10 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.clickLine({ x: 200, y: 10 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.clickLine({ x: 10, y: 10 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.clickLine({ x: 100, y: 10 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.clickLine({ x: 190, y: 10 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);

            await IntegrationUtils.erase([
                { x: 60, y: 10 },
                { x: 60, y: 100 },
                { x: 140, y: 100 },
                { x: 140, y: 10 }], 10, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 3);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[1].timePins.length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[2].timePins.length, 1);

            let timePins = integrationEnv.ModelController.getModel().getAllTimelines().map(t => t.timePins);
            expect(timePins.map(pins => pins.map(pin => pin.timeStamp))).to.eql([
                [0.25 * (new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime()],
                [
                    0.40 * (new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime(),
                    0.65 * (new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime()
                ],
                [0.80 * (new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime()],
            ]);
            expect(timePins.map(pins => pins.map(pin => Math.round(pin.linePercent * 100) / 100))).to.eql([[1], [0, 1], [0]]);
        });

        it('should eliminate and split cell bindings', async function () {
            integrationEnv.mainInit();

            // Draw the line
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
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            // Link Data
            IntegrationUtils.bindDataToLine(
                integrationEnv.ModelController.getModel().getAllTimelines()[0].id,
                [["textTime", "10", "text1"],
                ["Jan 10, 2022", "20", "text5"],
                ["Jan 20, 2022", "text2", "text3"],
                ["Jan 13, 2022", "text4", "10"],
                ["Jan 11, 2022", "text6", "12"],
                ["Jan 19, 2022", "text7", "17"],],
                integrationEnv)

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 12);
            expect(integrationEnv.ModelController.getModel().getAllCellBindingData().map(cbd => Math.round(cbd.linePercent * 100) / 100).sort())
                .to.eql([NO_LINE_PERCENT, NO_LINE_PERCENT, 0, 0, 0.1, 0.1, 0.3, 0.3, 0.9, 0.9, 1, 1])

            // this erases a chunk between .26 and .32 percent of the line
            await IntegrationUtils.erase([{ x: 150, y: 102 }], 10, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 10);
        })
    })

    describe('Image context menu tests', function () {
        let lastThen = () => { console.error("not set") };
        beforeEach(function () {
            integrationEnv.enviromentVariables.FileHandler.getImageFile = function () {
                return {
                    then: function (func) { lastThen = func; }
                }
            };
        });

        it('should unlink an image', function () {
            integrationEnv.mainInit();

            // Draw the line
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.clickButton("#image-button", integrationEnv.enviromentVariables.$);
            // create a canvas image
            IntegrationUtils.mainPointerDown({ x: 300, y: 200 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 300, y: 200 }, integrationEnv);
            lastThen({ imageData: "imgdata1", width: 100, height: 100 });
            // and two line images
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.clickLine({ x: 150, y: 102 }, timelineId, integrationEnv);
            lastThen({ imageData: "imageData1", width: 100, height: 100 });
            let unlinkImageId = integrationEnv.ModelController.getModel().getAllTimelines()[0].imageBindings[0].id;

            IntegrationUtils.clickLine({ x: 170, y: 102 }, timelineId, integrationEnv);
            lastThen({ imageData: "imageData1", width: 100, height: 100 });
            IntegrationUtils.clickButton("#image-button", integrationEnv.enviromentVariables.$);


            assert.equal(integrationEnv.ModelController.getModel().getAllImageBindingData().length, 3);
            expect(integrationEnv.ModelController.getModel().getAllImageBindingData().map(b => b.isCanvasBinding)).to.eql([false, false, true]);

            let imageTargetSet = integrationEnv.enviromentVariables.d3.selectors[".image-interaction-target"].innerData;
            let movingImageTargetData = imageTargetSet.find(item => item.binding.imageBinding.id == unlinkImageId);
            integrationEnv.enviromentVariables.d3.selectors[".image-interaction-target"].
                eventCallbacks.pointerdown({ clientX: 160, clientY: 120 }, movingImageTargetData);
            IntegrationUtils.pointerUp({ x: 160, y: 120 }, integrationEnv);

            IntegrationUtils.clickButton("#image-unlink-button", integrationEnv.enviromentVariables.$);

            assert.equal(integrationEnv.ModelController.getModel().getAllImageBindingData().length, 3);
            expect(integrationEnv.ModelController.getModel().getAllImageBindingData().map(b => b.isCanvasBinding)).to.eql([false, true, true]);
        })

        it('should link an image', function () {
            integrationEnv.mainInit();

            // Draw the line
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.clickButton("#image-button", integrationEnv.enviromentVariables.$);
            // create a canvas image
            IntegrationUtils.mainPointerDown({ x: 300, y: 200 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 300, y: 200 }, integrationEnv);
            lastThen({ imageData: "imageData", width: 100, height: 100 });
            let unlinkImageId = integrationEnv.ModelController.getModel().getCanvas().imageBindings[0].id;

            IntegrationUtils.mainPointerDown({ x: 200, y: 200 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 200, y: 200 }, integrationEnv);
            lastThen({ imageData: "imageData", width: 100, height: 100 });
            // and two line images
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.clickLine({ x: 150, y: 102 }, timelineId, integrationEnv);
            lastThen({ imageData: "imageData", width: 100, height: 100 });
            IntegrationUtils.clickButton("#image-button", integrationEnv.enviromentVariables.$);


            assert.equal(integrationEnv.ModelController.getModel().getAllImageBindingData().length, 3);
            expect(integrationEnv.ModelController.getModel().getAllImageBindingData().map(b => b.isCanvasBinding)).to.eql([false, true, true]);

            let imageTargetSet = integrationEnv.enviromentVariables.d3.selectors[".image-interaction-target"].innerData;
            let movingImageTargetData = imageTargetSet.find(item => item.binding.imageBinding.id == unlinkImageId);
            integrationEnv.enviromentVariables.d3.selectors[".image-interaction-target"].
                eventCallbacks.pointerdown({ clientX: 160, clientY: 120 }, movingImageTargetData);
            IntegrationUtils.pointerUp({ x: 160, y: 120 }, integrationEnv);

            IntegrationUtils.clickButton("#image-link-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.pointerMove({ x: 150, y: 100 }, integrationEnv);
            IntegrationUtils.pointerMove({ x: 140, y: 100 }, integrationEnv);
            IntegrationUtils.clickLine({ x: 140, y: 100 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllImageBindingData().length, 3);
            expect(integrationEnv.ModelController.getModel().getAllImageBindingData().map(b => b.isCanvasBinding)).to.eql([false, false, true]);
        })
    })
    describe('Data Highlight test', function () {
        it('should highlight timeline bound points', function () {
            integrationEnv.mainInit();

            // Draw the line
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
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            // Link Data
            IntegrationUtils.createTable(
                [["Jan 10", "10", "text1"],
                ["Jan 11", "20", "text5"],
                ["Jan 12", "text2", "text3"],
                ["Jan 13", "text4", "10"],
                ["Jan 14", "text6", "12"],
                ["Jan 15", "text7", "17"]],
                integrationEnv);


            let len = integrationEnv.ModelController.getModel().getAllTables().length;
            assert(len > 0);
            let tableId = integrationEnv.ModelController.getModel().getAllTables()[len - 1].id;
            IntegrationUtils.selectCells(tableId, 0, 0, 1, 3, integrationEnv);

            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 102 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 4);

            let timeLineTargets = integrationEnv.enviromentVariables.d3.selectors['.timeline-target'];
            let data = timeLineTargets.innerData.find(d => d.id == integrationEnv.ModelController.getModel().getAllTimelines()[0].id);
            timeLineTargets.eventCallbacks.pointerenter({ clientX: 150, clientY: 102 }, data);

            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            let updateTable = integrationEnv.enviromentVariables.jspreadsheetTables[tableId].updateTable;

            let instance = "#table_" + tableId;
            //check bound time rows
            for (let i = 0; i < 4; i++) {
                let cell = "#cell_id1_" + i;
                updateTable(instance, cell, 0, i, "val", "label", "cellName");
                let result = $("anything").getSelectors()["#cell_id1_" + i].style;
                should.not.exist(result.filter)
            }
            //check unbound time rows
            for (let i = 4; i < 6; i++) {
                let cell = "#cell_id2_" + i;
                updateTable(instance, cell, 0, i, "val", "label", "cellName");
                let result = $("anything").getSelectors()["#cell_id2_" + i].style;
                should.exist(result.filter)
            }
            //check bound data rows
            for (let i = 0; i < 4; i++) {
                let cell = "#cell_id3_" + i;
                updateTable(instance, cell, 1, i, "val", "label", "cellName");
                let result = $("anything").getSelectors()["#cell_id1_" + i].style;
                should.not.exist(result.filter);
            }
            //check unbound data rows
            for (let i = 4; i < 6; i++) {
                let cell = "#cell_id4_" + i;
                updateTable(instance, cell, 1, i, "val", "label", "cellName");
                let result = $("anything").getSelectors()["#cell_id4_" + i].style;
                should.exist(result.filter);
            }
            // check unbound col
            for (let i = 0; i < 6; i++) {
                let cell = "#cell_id5_" + i;
                updateTable(instance, cell, 2, i, "val", "label", "cellName");
                let result = $("anything").getSelectors()["#cell_id5_" + i].style;
                should.exist(result.filter);
            }

            timeLineTargets.eventCallbacks['pointerout']({ x: 150, y: 102 }, data);
            // all data showing again
            for (let i = 0; i < 6; i++) {
                updateTable(instance, "#cell_id6_" + i, 1, i, "val", "label", "cellName");
                should.not.exist($("anything").getSelectors()["#cell_id6_" + i].style.filter);
                updateTable(instance, "#cell_id7_" + i, 1, i, "val", "label", "cellName");
                should.not.exist($("anything").getSelectors()["#cell_id7_" + i].style.filter);
                updateTable(instance, "#cell_id8_" + i, 1, i, "val", "label", "cellName");
                should.not.exist($("anything").getSelectors()["#cell_id8_" + i].style.filter);
            }

            let circleData = integrationEnv.enviromentVariables.d3.selectors['.data-target-point'];
            data = circleData.innerData[1];
            circleData.eventCallbacks['pointerenter']({ x: 150, y: 102 }, data);
            for (let i = 0; i < 6; i++) {
                if (i == 1) {
                    // the single set data cell
                    updateTable(instance, "#cell_id9_" + i, 1, i, "val", "label", "cellName");
                    should.not.exist($("anything").getSelectors()["#cell_id9_" + i].style.filter);
                    // the single set time cell
                    updateTable(instance, "#cell_id10_" + i, 0, i, "val", "label", "cellName");
                    should.not.exist($("anything").getSelectors()["#cell_id10_" + i].style.filter);

                    updateTable(instance, "#cell_id11_" + i, 2, i, "val", "label", "cellName");
                    should.exist($("anything").getSelectors()["#cell_id11_" + i].style.filter);
                } else {
                    updateTable(instance, "#cell_id12_" + i, 0, i, "val", "label", "cellName");
                    should.exist($("anything").getSelectors()["#cell_id12_" + i].style.filter);
                    updateTable(instance, "#cell_id13_" + i, 1, i, "val", "label", "cellName");
                    should.exist($("anything").getSelectors()["#cell_id13_" + i].style.filter);
                    updateTable(instance, "#cell_id14_" + i, 2, i, "val", "label", "cellName");
                    should.exist($("anything").getSelectors()["#cell_id14_" + i].style.filter);
                }
            }
        })
    })

    describe('Style Test', function () {
        it('should toggle without error', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 0, y: 10 }, { x: 100, y: 10 }, { x: 200, y: 10 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;

            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", "7"],
                ["Jan 11, 2021", "17"],
                ["Jan 12 2021", "19"],
                ["Jan 13, 2021", "23"],
                ["Jan 18, 2021", "31"],
                ["Jan 19, 2021", "2"],
                ["Jan 20, 2021", "18"]
            ], integrationEnv)

            // add a few comments
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 0, y: 10 }, timelineId, integrationEnv);
            IntegrationUtils.clickLine({ x: 200, y: 10 }, timelineId, integrationEnv);
            IntegrationUtils.clickLine({ x: 10, y: 10 }, timelineId, integrationEnv);
            IntegrationUtils.clickLine({ x: 100, y: 10 }, timelineId, integrationEnv);
            IntegrationUtils.clickLine({ x: 190, y: 10 }, timelineId, integrationEnv);
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);

            // add some pins
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 140, y: 12 }, { x: 125, y: 12 }], timelineId, integrationEnv);
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].cellBindings.length, 12);

            // toggle and drag again
            IntegrationUtils.clickButton("#toggle-timeline-style-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 150, y: 12 }, { x: 160, y: 12 }], timelineId, integrationEnv);
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 2);

            // Toggle again to ensure the reverse operation is error free
            IntegrationUtils.clickButton("#toggle-timeline-style-button", integrationEnv.enviromentVariables.$);
            // and a couple more times because pressing buttons is fun.
            IntegrationUtils.clickButton("#toggle-timeline-style-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickButton("#toggle-timeline-style-button", integrationEnv.enviromentVariables.$);
        })
    })
});