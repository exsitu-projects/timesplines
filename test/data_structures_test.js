let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

describe('Test DataStructs', function () {
    let integrationEnv;
    let DataStructs;

    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        DataStructs = integrationEnv.enviromentVariables.DataStructs;
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('Object conversion tests', function () {
        // expect them to be the same at sub levels for easier debugging of this test
        it('should create data objects from JSON objects', function () {
            let table = TestUtils.makeTestTable(5, 8);
            table.dataRows[3].dataCells[0].val = new Date("Jan 1, 1992");
            table.dataRows[3].dataCells[0].val = "Not a date"
            table.dataRows[3].dataCells[0].val = 200000123
            table.dataRows[3].dataCells[1].val = 1000
            table.dataRows[3].dataCells[1].val = "19992222"

            let timeline = new DataStructs.Timeline([{ x: 10, y: 10 }, { x: 20, y: 40 }, { x: 20, y: 10 }, { x: 10, y: 400 }]);
            timeline.timePins.push(new DataStructs.TimePin(0.5));
            timeline.timePins[0].timeStamp = 100000;
            timeline.timePins.push(new DataStructs.TimePin(0.7));
            timeline.cellBindings.push(new DataStructs.CellBinding(table.dataRows[2].dataCells[1].id));
            timeline.cellBindings[0].color = "#999999";
            timeline.cellBindings.push(new DataStructs.CellBinding(table.dataRows[3].dataCells[1].id));
            timeline.axisBindings.push(new DataStructs.AxisBinding(table.dataColumns[3].id));

            TestUtils.deepEquals(table, DataStructs.DataTable.fromObject(JSON.parse(JSON.stringify(table))))
            TestUtils.deepEquals(timeline, DataStructs.Timeline.fromObject(JSON.parse(JSON.stringify(timeline))))
        });

        it('should copy objects', function () {
            let table = TestUtils.makeTestTable(5, 8);
            table.dataRows[3].dataCells[2].val = new Date("Jan 2, 2002");
            table.dataRows[3].dataCells[3].val = new Date("Jan 2, 2002");

            let timeline = new DataStructs.Timeline([{ x: 10, y: 10 }, { x: 20, y: 40 }, { x: 20, y: 10 }, { x: 10, y: 400 }]);
            timeline.timePins.push(new DataStructs.TimePin(0.5));
            timeline.timePins[0].timeStamp = 100000;
            timeline.timePins.push(new DataStructs.TimePin(0.7));
            timeline.cellBindings.push(new DataStructs.CellBinding(table.dataRows[2].dataCells[1].id));
            timeline.cellBindings[0].color = "#999999";
            timeline.cellBindings.push(new DataStructs.CellBinding(table.dataRows[3].dataCells[1].id));
            timeline.axisBindings.push(new DataStructs.AxisBinding(table.dataColumns[3].id));

            TestUtils.deepEquals(table, table.copy())
            TestUtils.deepEquals(timeline, timeline.copy())

            let timeline2 = timeline.copy();
            timeline2.points[0].x = 10000;

            expect(timeline2.points[0].x).to.not.eql(timeline.points[0].x);
        });
    })
});
