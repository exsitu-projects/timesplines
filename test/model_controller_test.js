let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

describe('Test ModelController', function () {
    let integrationEnv;
    let modelController;
    let DataStructs;

    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        modelController = new integrationEnv.enviromentVariables.ModelController();
        DataStructs = integrationEnv.enviromentVariables.DataStructs;
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
        delete modelController;
    });

    describe('percent - time mapping tests', function () {
        it('should now have mapping with no references', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            assert.equal(modelController.getModel().hasTimeMapping(timeline.id), false);
        });

        it('should not have mapping with one time pin', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            let timePin = new DataStructs.TimePin(0.5);
            timePin.timeStamp = new Date("Jan 10, 2021").getTime();
            modelController.updatePinBinding(timeline.id, timePin);

            assert.equal(modelController.getModel().hasTimeMapping(timeline.id), false);
        });

        it('should not have mapping with one cell binding', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            modelController.addBoundTextRow(timeline.id, "<text>", "Jan 10, 2022");

            assert.equal(modelController.getModel().hasTimeMapping(timeline.id), false);
        });

        it('should not have mapping with one cell binding and one time pin that are the same', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            modelController.addBoundTextRow(timeline.id, "<text>", "Jan 10, 2022");

            let timePin = new DataStructs.TimePin(0.5);
            timePin.timeStamp = new Date("Jan 10, 2022").getTime();
            modelController.updatePinBinding(timeline.id, timePin);

            assert.equal(modelController.getModel().hasTimeMapping(timeline.id), false);
        });

        it('should caluclate time with two cell bindings', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            modelController.addBoundTextRow(timeline.id, "<text1>", "Jan 10, 2022");
            modelController.addBoundTextRow(timeline.id, "<text2>", "Jan 20, 2022");

            let percentToTime = function (percent) { return percent * (new Date("Jan 20, 2022").getTime() - new Date("Jan 10, 2022").getTime()) + new Date("Jan 10, 2022").getTime(); }
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0)).to.be.closeTo(new Date("Jan 10, 2022").getTime(), 0.0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0.25)).to.be.closeTo(percentToTime(0.25), 0.0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0.5)).to.be.closeTo(percentToTime(0.5), .0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0.75)).to.be.closeTo(percentToTime(0.75), 0.0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 1)).to.be.closeTo(new Date("Jan 20, 2022").getTime(), 0.0001);

            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 10, 2022").getTime())).to.be.closeTo(0, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 12, 2022").getTime())).to.be.closeTo(0.2, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 15, 2022").getTime())).to.be.closeTo(0.5, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 16, 2022").getTime())).to.be.closeTo(0.6, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 20, 2022").getTime())).to.be.closeTo(1, 0.0001);

            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 9, 2022").getTime())).to.be.closeTo(0, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 21, 2022").getTime())).to.be.closeTo(1, 0.0001);
        });

        it('should caluclate time with one cell binding and one time pin', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            modelController.addBoundTextRow(timeline.id, "<text>", "Jan 10, 2022");

            let timePin = new DataStructs.TimePin(0.5);
            timePin.timeStamp = new Date("Jan 20, 2022").getTime();
            modelController.updatePinBinding(timeline.id, timePin);

            let percentToTime = function (percent) { return percent * (new Date("Jan 30, 2022").getTime() - new Date("Jan 10, 2022").getTime()) + new Date("Jan 10, 2022").getTime(); }
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0)).to.be.closeTo(new Date("Jan 10, 2022").getTime(), 0.0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0.25)).to.be.closeTo(percentToTime(0.25), 0.0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0.5)).to.be.closeTo(percentToTime(0.5), .0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0.75)).to.be.closeTo(percentToTime(0.75), 0.0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 1)).to.be.closeTo(new Date("Jan 30, 2022").getTime(), 0.0001);

            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 10, 2022").getTime())).to.be.closeTo(0, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 15, 2022").getTime())).to.be.closeTo(0.25, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 20, 2022").getTime())).to.be.closeTo(0.5, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 25, 2022").getTime())).to.be.closeTo(0.75, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 30, 2022").getTime())).to.be.closeTo(1, 0.0001);

            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 1, 2022").getTime())).to.be.closeTo(0, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Feb 10, 2022").getTime())).to.be.closeTo(1, 0.0001);
        });

        it('should caluclate time with one cell binding between two time pins', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            modelController.addBoundTextRow(timeline.id, "<text>", "Jan 15, 2022");

            let timePin = new DataStructs.TimePin(0.25);
            timePin.timeStamp = new Date("Jan 10, 2022").getTime();
            modelController.updatePinBinding(timeline.id, timePin);

            timePin = new DataStructs.TimePin(0.75);
            timePin.timeStamp = new Date("Jan 20, 2022").getTime();
            modelController.updatePinBinding(timeline.id, timePin);


            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0)).to.be.closeTo(new Date("Jan 5, 2022").getTime(), 0.0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0.25)).to.be.closeTo(new Date("Jan 10, 2022").getTime(), 0.0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0.5)).to.be.closeTo(new Date("Jan 15, 2022").getTime(), .0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 0.75)).to.be.closeTo(new Date("Jan 20, 2022").getTime(), 0.0001);
            expect(modelController.getModel().mapLinePercentToTime(timeline.id, 1)).to.be.closeTo(new Date("Jan 25, 2022").getTime(), 0.0001);

            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 5, 2022").getTime())).to.be.closeTo(0, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 10, 2022").getTime())).to.be.closeTo(0.25, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 15, 2022").getTime())).to.be.closeTo(0.5, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 20, 2022").getTime())).to.be.closeTo(0.75, 0.0001);
            expect(modelController.getModel().mapTimeToLinePercent(timeline.id, new Date("Jan 25, 2022").getTime())).to.be.closeTo(1, 0.0001);
        });

        it('should get timePercent when getting with no references', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            assert.equal(modelController.getModel().mapLinePercentToTime(timeline.id, 0.5), 0.5);
        });

        it('should get timePercent when getting with only one time pin', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            let timePin = new DataStructs.TimePin(0.25);
            timePin.timeStamp = 100;
            timePin.timePercent = 0.1;
            modelController.updatePinBinding(timeline.id, timePin);

            assert.equal(modelController.getModel().mapLinePercentToTime(timeline.id, 0.5), 0.4);
        });

        it('should get timePercent when getting with only one cell binding', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            modelController.addBoundTextRow(timeline.id, "", 50);

            assert.equal(modelController.getModel().mapLinePercentToTime(timeline.id, 0.5), 0.5);
        });

        it('should map bound cell to a value', function () {
            // TODO: map text based on Index
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            modelController.addBoundTextRow(timeline.id, "some text", "textTimeValue");
            assert.equal(modelController.getModel().getAllCellBindingData().length, 1);

            let binding = modelController.getModel().getAllCellBindingData()[0];

            assert.equal(binding.linePercent, NO_LINE_PERCENT);

            let timePin = new DataStructs.TimePin(0.5);
            modelController.updatePinBinding(timeline.id, timePin);
            modelController.updateTimePinBinding(binding.cellBinding.id, timePin.id);

            assert.equal(modelController.getModel().getAllCellBindingData().length, 1);

            binding = modelController.getModel().getAllCellBindingData()[0];

            assert.equal(binding.cellBinding.timePinId, timePin.id);
            assert.equal(binding.linePercent, 0.5);
        });

        it('should map text time to no line percent', function () {
            // TODO: map text based on Index
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
            modelController.addBoundTextRow(timeline.id, "some text", "textTimeValue");
            assert.equal(modelController.getModel().getAllCellBindingData().length, 1);

            let binding = modelController.getModel().getAllCellBindingData()[0];

            assert.equal(binding.linePercent, NO_LINE_PERCENT);
        });
    })

    describe('cell binding test', function () {
        it('should bind a cell without error', function () {
            let timeline = modelController.newTimeline([{ x: 0, y: 0 }, { x: 10, y: 10 }]);

            let table = TestUtils.makeTestTable(3, 3);
            table.dataRows[0].dataCells[0].val = "Jan 2022";
            table.dataRows[0].dataCells[1].val = "text1";
            modelController.addTable(table);

            modelController.bindCells(timeline.id, [new DataStructs.CellBinding(table.dataRows[0].dataCells[1].id)])

            assert.equal(modelController.getModel().getAllCellBindingData().length, 1);
            assert.equal(modelController.getModel().getAllCellBindingData()[0].linePercent, NO_LINE_PERCENT);
        });
    })

    describe('delete points tests', function () {
        it('should break one line into two', function () {
            let timeline = modelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
                { x: 15, y: 0 },
                { x: 20, y: 0 }]);

            assert.equal(modelController.getModel().getAllTimelines().length, 1);

            let table = TestUtils.makeTestTable(3, 3);
            table.dataRows[0].dataCells[0].val = "Jan 10, 2022";
            table.dataRows[0].dataCells[1].val = "text1";
            table.dataRows[1].dataCells[0].val = "Jan 20, 2022";
            table.dataRows[1].dataCells[1].val = "text1";
            modelController.addTable(table);

            modelController.bindCells(timeline.id, [
                new DataStructs.CellBinding(table.dataRows[0].dataCells[1].id),
                new DataStructs.CellBinding(table.dataRows[1].dataCells[1].id),
            ])

            assert.equal(modelController.getModel().getAllCellBindingData().length, 2);
            modelController.breakTimeline(modelController.getModel().getAllTimelines()[0].id, [
                {
                    label: SEGMENT_LABELS.UNAFFECTED,
                    points: [{ x: 0, y: 0 },
                    { x: 5, y: 0 },
                    { x: 10, y: 0 },
                    { x: 14, y: 0 },]
                },
                {
                    label: SEGMENT_LABELS.DELETED,
                    points: [
                        { x: 14, y: 0 },
                        { x: 15, y: 0 },
                        { x: 16, y: 0 }]
                },
                {
                    label: SEGMENT_LABELS.UNAFFECTED,
                    points: [
                        { x: 16, y: 0 },
                        { x: 20, y: 0 }]
                },
            ]);

            assert.equal(modelController.getModel().getAllTimelines().length, 2);
            assert.equal(modelController.getModel().getAllTimelines()[0].cellBindings.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[1].cellBindings.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[1].timePins.length, 1);
        });
    })


    describe('delete updateTimelinePoints tests', function () {
        it('should update the points', function () {
            let timeline = modelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
                { x: 15, y: 0 },
                { x: 20, y: 0 }]);
            assert.equal(modelController.getModel().getAllTimelines().length, 1);

            let timePin = new DataStructs.TimePin(0.75);
            modelController.updatePinBinding(timeline.id, timePin);

            let oldSegments = PathMath.segmentPath(timeline.points, (point) => point.x > 11 ? SEGMENT_LABELS.CHANGED : SEGMENT_LABELS.UNAFFECTED);
            let newSegments = oldSegments.map(s => { return { label: s.label, points: [...s.points] } });
            newSegments[1].points = [{ x: 15, y: 0 }, { x: 20, y: 10 }, { x: 20, y: 0 }]

            modelController.updateTimelinePoints(timeline.id, oldSegments, newSegments);

            assert.equal(modelController.getModel().getAllTimelines().length, 1);
            expect(modelController.getModel().getAllTimelines()[0].points.map(p => p.y)).to.eql([0, 0, 0, 0, 10, 0]);
            assert.equal(modelController.getModel().getAllTimelines()[0].timePins.length, 1);
            expect(modelController.getModel().getAllTimelines()[0].timePins[0].linePercent).to.be.closeTo(0.41, 0.01);

        });
    })

    describe('tableUpdate tests', function () {
        it('should delete axis whose cells changed type', function () {
            let timeline = modelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
                { x: 15, y: 0 },
                { x: 20, y: 0 }]);
            assert.equal(modelController.getModel().getAllTimelines().length, 1);

            let table = TestUtils.makeTestTable(10, 3);
            for (let i = 0; i < 10; i++) {
                table.dataRows[i].dataCells[1].val = i;
            }
            modelController.addTable(table);
            assert.equal(modelController.getModel().getAllTables().length, 1);

            let cellBindings = []
            for (let i = 0; i < 10; i++) {
                cellBindings.push(new DataStructs.CellBinding(table.dataRows[i].dataCells[1].id));
            }
            modelController.bindCells(timeline.id, cellBindings);
            assert.equal(modelController.getModel().getAllCellBindingData().length, 10);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings.length, 1);

            for (let i = 0; i < 10; i++) {
                table.dataRows[i].dataCells[1].val = "text";
            }

            modelController.tableUpdated(table, TableChange.UPDATE_CELLS, table.dataRows.map(r => r.dataCells[1].id));
            assert.equal(modelController.getModel().getAllCellBindingData().length, 10);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings.length, 0);
        });

        it('should delete axis whose cells were in a deleted row', function () {
            let timeline = modelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
                { x: 15, y: 0 },
                { x: 20, y: 0 }]);
            assert.equal(modelController.getModel().getAllTimelines().length, 1);

            let table = TestUtils.makeTestTable(10, 3);
            for (let i = 0; i < 10; i++) {
                if (i >= 5 && i <= 7) table.dataRows[i].dataCells[1].val = i;
            }
            modelController.addTable(table);
            assert.equal(modelController.getModel().getAllTables().length, 1);

            let cellBindings = []
            for (let i = 0; i < 10; i++) {
                cellBindings.push(new DataStructs.CellBinding(table.dataRows[i].dataCells[1].id));
            }
            modelController.bindCells(timeline.id, cellBindings);
            assert.equal(modelController.getModel().getAllCellBindingData().length, 10);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings.length, 1);

            let deleteRows = [table.dataRows[5].id, table.dataRows[6].id, table.dataRows[7].id];
            table.dataRows = table.dataRows.filter((r, i) => i < 5 || i > 7);
            table.dataRows.forEach((r, i) => { if (i > 7) r.index -= 3 });

            modelController.tableUpdated(table, TableChange.DELETE_ROWS, deleteRows);
            assert.equal(modelController.getModel().getAllCellBindingData().length, 7);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings.length, 0);
        });

        it('should delete axis for deleted column', function () {
            let timeline = modelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
                { x: 15, y: 0 },
                { x: 20, y: 0 }]);
            assert.equal(modelController.getModel().getAllTimelines().length, 1);

            let table = TestUtils.makeTestTable(10, 3);
            for (let i = 0; i < 10; i++) {
                if (i > 3) table.dataRows[i].dataCells[1].val = i;
                table.dataRows[i].dataCells[2].val = i;
            }
            modelController.addTable(table);
            assert.equal(modelController.getModel().getAllTables().length, 1);

            let cellBindings = []
            for (let i = 0; i < 10; i++) {
                cellBindings.push(new DataStructs.CellBinding(table.dataRows[i].dataCells[1].id));
                cellBindings.push(new DataStructs.CellBinding(table.dataRows[i].dataCells[2].id));
            }
            modelController.bindCells(timeline.id, cellBindings);
            assert.equal(modelController.getModel().getAllCellBindingData().length, 20);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings.length, 2);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings[0].val1, 4);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings[1].val1, 0);

            let deleteCols = [table.dataColumns[1].id, table.dataRows[3].id];
            table.dataColumns = table.dataColumns.filter((c, i) => i != 1 && i != 3);
            table.dataRows.forEach((r) => { r.dataCells = r.dataCells.filter(cell => !deleteCols.includes(cell.columnId)) });

            modelController.tableUpdated(table, TableChange.DELETE_COLUMNS, deleteCols);
            assert.equal(modelController.getModel().getAllCellBindingData().length, 10);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings[0].val1, 0);
        });

        it('should update axis values', function () {
            let timeline = modelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
                { x: 15, y: 0 },
                { x: 20, y: 0 }]);
            assert.equal(modelController.getModel().getAllTimelines().length, 1);

            let table = TestUtils.makeTestTable(10, 3);
            for (let i = 0; i < 10; i++) {
                if (i >= 5 && i <= 7) table.dataRows[i].dataCells[1].val = i;
            }
            modelController.addTable(table);
            assert.equal(modelController.getModel().getAllTables().length, 1);

            let cellBindings = []
            for (let i = 0; i < 10; i++) {
                cellBindings.push(new DataStructs.CellBinding(table.dataRows[i].dataCells[1].id));
            }
            modelController.bindCells(timeline.id, cellBindings);
            assert.equal(modelController.getModel().getAllCellBindingData().length, 10);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings[0].val1, 5);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings[0].val2, 7);

            let deleteRows = [table.dataRows[5].id];
            table.dataRows = table.dataRows.filter((r, i) => i != 5);
            table.dataRows.forEach((r, i) => { if (i > 5) r.index-- });

            modelController.tableUpdated(table, TableChange.DELETE_ROWS, deleteRows);
            assert.equal(modelController.getModel().getAllTables().length, 1);
            assert.equal(modelController.getModel().getAllTables()[0].dataRows.length, 9);
            assert.equal(modelController.getModel().getAllCellBindingData().length, 9);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings[0].val1, 6);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings[0].val2, 7);

            deleteRows = [table.dataRows[5].id];
            table.dataRows = table.dataRows.filter((r, i) => i != 5);
            table.dataRows.forEach((r, i) => { if (i > 5) r.index-- });
            modelController.tableUpdated(table, TableChange.DELETE_ROWS, deleteRows);

            assert.equal(modelController.getModel().getAllCellBindingData().length, 8);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings[0].val1, 0);
            assert.equal(modelController.getModel().getAllTimelines()[0].axisBindings[0].val2, 7);
        });
    })
});


describe('Integration Test ModelController', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('data tooltips test', function () {
        it('should show a tooltip with a date', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 125, y: 200 }, { x: 150, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["July 1 2022", "Text1"],
                ["July 11 2022", "Text2"],
                ["July 21 2022", "Text3"]
            ], integrationEnv);

            let timeLineTargets = integrationEnv.enviromentVariables.d3.selectors['.timeline-target'];
            let data = timeLineTargets.innerData.find(d => d.id == integrationEnv.ModelController.getModel().getAllTimelines()[0].id);
            timeLineTargets.eventCallbacks['pointerenter']({ clientX: 125, clientY: 200 }, data);

            assert.equal(integrationEnv.enviromentVariables.$.selectors["#main-tooltip"].html(), DataUtil.getFormattedDate(new Date("Jul 10, 2022 23:32:16")));
        });
    });

    describe('Import Export Test', function () {
        it('should serialize and unserialize to the same object (except for the Ids)', async function () {
            // Running this as an integration test to test the upload/download buttons code
            integrationEnv.mainInit();
            let timeline = integrationEnv.ModelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
                { x: 15, y: 0 },
                { x: 20, y: 0 }]);

            integrationEnv.ModelController.newTimeline([
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 245, y: 16 },
                { x: 23, y: 2 },
                { x: 34, y: 1234 }]);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2);

            let table = TestUtils.makeTestTable(3, 3);
            table.dataRows[0].dataCells[0].val = "0.25";
            table.dataRows[0].dataCells[1].val = "text1";
            table.dataRows[1].dataCells[0].val = "0.75";
            table.dataRows[1].dataCells[1].val = "text1";
            integrationEnv.ModelController.addTable(table);

            integrationEnv.ModelController.bindCells(timeline.id, [
                new DataStructs.CellBinding(table.dataRows[0].dataCells[1].id),
                new DataStructs.CellBinding(table.dataRows[1].dataCells[1].id),
            ])

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);

            let originalModel = integrationEnv.ModelController.getModel().toObject();

            integrationEnv.enviromentVariables.$.selectors['#download-button-json'].eventCallbacks.click();
            integrationEnv.enviromentVariables.window.fileText = integrationEnv.enviromentVariables.URL.objectUrls[0].init[0];

            // clear the data
            integrationEnv.ModelController.setModelFromObject({ canvas: new DataStructs.Canvas(), timelines: [], dataTables: [] });
            assert.equal(integrationEnv.ModelController.getModel().toObject().timelines.length, 0);
            assert.equal(integrationEnv.ModelController.getModel().toObject().dataTables.length, 0);

            await integrationEnv.enviromentVariables.$.selectors["#upload-button-json"].eventCallbacks.click();

            // Do both directions to make sure we aren't missing anything. 
            TestUtils.deepEquals(integrationEnv.ModelController.getModel().toObject(), originalModel);
            TestUtils.deepEquals(originalModel, integrationEnv.ModelController.getModel().toObject());
        });

        it('should draw correctly from unserialized data', async function () {
            // Running this as an integration test to test the upload/download buttons code
            integrationEnv.mainInit();
            let line1Points = [
                { x: 10, y: 10 },
                { x: 5, y: 0 },
                { x: 10, y: 0 },
                { x: 15, y: 0 },
                { x: 20, y: 0 }];
            let line2Points = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 20, y: 16 },
                { x: 30, y: 2 },
                { x: 40, y: 10 }];
            IntegrationUtils.drawLine(line1Points, integrationEnv);
            IntegrationUtils.drawLine(line2Points, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2);

            IntegrationUtils.bindDataToLine(integrationEnv.ModelController.getModel().getAllTimelines()[0].id, [
                ["0.25", "text1"],
                ["0.75", "text1"]
            ], integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);
            let textSet = integrationEnv.enviromentVariables.d3.selectors['.annotation-text'].innerData;
            assert.equal(textSet.length, 2);
            assert.equal(textSet[0].binding.cellBinding.offset.x, 10);
            assert.equal(textSet[0].binding.cellBinding.offset.y, 10);
            assert.equal(textSet[1].binding.cellBinding.offset.x, 14);
            assert.equal(textSet[1].binding.cellBinding.offset.y, -10);

            integrationEnv.enviromentVariables.$.selectors['#download-button-json'].eventCallbacks.click();
            integrationEnv.enviromentVariables.window.fileText = integrationEnv.enviromentVariables.URL.objectUrls[0].init[0];

            // clear the data
            await IntegrationUtils.erase(line1Points, 10, integrationEnv);
            await IntegrationUtils.erase(line2Points, 10, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 0);

            await integrationEnv.enviromentVariables.$.selectors["#upload-button-json"].eventCallbacks.click();

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 2);
            textSet = integrationEnv.enviromentVariables.d3.selectors['.annotation-text'].innerData;
            assert.equal(textSet.length, 2);
            assert.equal(textSet[0].binding.cellBinding.offset.x, 14);
            assert.equal(textSet[0].binding.cellBinding.offset.y, -10);
            assert.equal(textSet[1].binding.cellBinding.offset.x, 10);
            assert.equal(textSet[1].binding.cellBinding.offset.y, 10);
        });
    });
    describe('Data Binding Test', function () {
        it('should bind data, but not bind duplicate data', function () {
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

                ["Jan 11, 2021", "Text 4"],
                ["Jan 16, 2021", "Text 5"]
            ], integrationEnv);
            let len = integrationEnv.ModelController.getModel().getAllTables().length;
            assert(len > 0);
            let tableId = integrationEnv.ModelController.getModel().getAllTables()[len - 1].id;

            IntegrationUtils.selectCells(tableId, 0, 0, 1, 4, integrationEnv);
            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 25, y: 102 }, timelineId1, integrationEnv);
            IntegrationUtils.selectCells(tableId, 0, 1, 1, 4, integrationEnv);
            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 25, y: 102 }, timelineId1, integrationEnv);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(timelineId1).map(b => b.dataCell.getValue()))
                .to.eql([1, "Text 1", "Text 2", 1.5, 2]);

            IntegrationUtils.selectCells(tableId, 0, 4, 1, 5, integrationEnv);
            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 125, y: 102 }, timelineId2, integrationEnv);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(timelineId2).map(b => b.dataCell.getValue()))
                .to.eql([2, "Text 3"]);

            IntegrationUtils.selectCells(tableId, 0, 5, 1, 7, integrationEnv);
            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 225, y: 102 }, timelineId3, integrationEnv);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(timelineId3).map(b => b.dataCell.getValue()))
                .to.eql(["Text 3", "Text 4", "Text 5"]);

            // extra bind to make sure we don't bind overlapping data
            IntegrationUtils.selectCells(tableId, 0, 5, 1, 7, integrationEnv);
            IntegrationUtils.clickButton('#link-button', integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 225, y: 102 }, timelineId3, integrationEnv);
            expect(integrationEnv.ModelController.getModel().getCellBindingData(timelineId3).map(b => b.dataCell.getValue()))
                .to.eql(["Text 3", "Text 4", "Text 5"]);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 10);
        });
    });
});