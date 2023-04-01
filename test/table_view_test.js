let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

describe('Test TableViewer', function () {
    let integrationEnv;
    let getTableViewController;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        getTableViewController = function () {
            let DataTableController = integrationEnv.enviromentVariables.DataTableController;
            return new DataTableController();
        }
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('intialization test', function () {
        it('should intialize', function () {
            let controller = getTableViewController();
            controller.updateModel({ getAllTables: () => [TestUtils.makeTestTable(3, 3)] });
        });
    })

    describe('move row test', function () {
        it('should shift one element down the table', function () {
            let callbackCalled = false;
            let rowCount = 6;
            let controller = getTableViewController();

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);
                table.dataRows.sort((a, b) => a.index - b.index);
                expect(table.dataRows.map(row => row.index)).to.eql([0, 1, 2, 3, 4, 5])
                expect(table.dataRows.map(row => row.dataCells[0].val)).to.eql(["Jan 1, 2022", "Jan 3, 2022", "Jan 4, 2022", "Jan 5, 2022", "Jan 2, 2022", "Jan 6, 2022"])
                callbackCalled = true;
            });

            let testTable = TestUtils.makeTestTable(rowCount, 3);
            controller.updateModel({ getAllTables: () => [testTable] });
            let onmoverow = integrationEnv.enviromentVariables.jspreadsheetTables[testTable.id].onmoverow;
            onmoverow("#table_" + testTable.id, 1, 4);

            assert.equal(callbackCalled, true);
        });

        it('should shift one element up the table', function () {
            let callbackCalled = false;

            let rowCount = 6;

            let controller = getTableViewController();
            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);
                table.dataRows.sort((a, b) => a.index - b.index);
                expect(table.dataRows.map(row => row.index)).to.eql([0, 1, 2, 3, 4, 5])
                expect(table.dataRows.map(row => row.dataCells[0].val)).to.eql([
                    "Jan 1, 2022",
                    "Jan 4, 2022",
                    "Jan 2, 2022",
                    "Jan 3, 2022",
                    "Jan 5, 2022",
                    "Jan 6, 2022"
                ]);
                callbackCalled = true;
            });

            let testTable = TestUtils.makeTestTable(rowCount, 3);
            controller.updateModel({ getAllTables: () => [testTable] });
            let onmoverow = integrationEnv.enviromentVariables.jspreadsheetTables[testTable.id].onmoverow;
            onmoverow("#table_" + testTable.id, 3, 1);

            assert.equal(callbackCalled, true);
        });
    })


    describe('sort rows test', function () {
        it('should sort all text rows by multiple columns', function () {
            let rowCount = 6;

            let controller = getTableViewController();

            let testTable = TestUtils.makeTestTable(rowCount, 3)
            controller.updateModel({ getAllTables: () => [testTable] });

            let onsort = integrationEnv.enviromentVariables.jspreadsheetTables[testTable.id].onsort;

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql(["Jan 1, 2022", "Jan 2, 2022", "Jan 3, 2022", "Jan 4, 2022", "Jan 5, 2022", "Jan 6, 2022",]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5]);
            });
            onsort("#table_" + testTable.id, 0, true);

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql([
                    "Jan 6, 2022",
                    "Jan 5, 2022",
                    "Jan 4, 2022",
                    "Jan 3, 2022",
                    "Jan 2, 2022",
                    "Jan 1, 2022"]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5]);
            });
            onsort("#table_" + testTable.id, 0, false);

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql([
                    "Jan 1, 2022",
                    "Jan 2, 2022",
                    "Jan 3, 2022",
                    "Jan 4, 2022",
                    "Jan 5, 2022",
                    "Jan 6, 2022",]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5]);
            });
            onsort("#table_" + testTable.id, 0, true);

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql(["Jan 1, 2022", "Jan 2, 2022", "Jan 3, 2022", "Jan 4, 2022", "Jan 5, 2022", "Jan 6, 2022",]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5]);
            });
            onsort("#table_" + testTable.id, 0, true);

            let callbackCalled = false;
            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql(["Jan 6, 2022", "Jan 5, 2022", "Jan 4, 2022", "Jan 3, 2022", "Jan 2, 2022", "Jan 1, 2022",]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5]);

                callbackCalled = true;
            });
            onsort("#table_" + testTable.id, 1, false);

            assert.equal(callbackCalled, true);
        });

        it('should mixed types correctly', function () {
            let rowCount = 8;

            let callbackCalled = 0;

            let controller = getTableViewController();

            let testTable = TestUtils.makeTestTable(rowCount, 3);
            testTable.dataRows[0].dataCells[0].val = "text1";
            testTable.dataRows[1].dataCells[0].val = "text2";
            testTable.dataRows[2].dataCells[0].val = "2022-02-03";
            testTable.dataRows[3].dataCells[0].val = "2022-02-04";
            testTable.dataRows[4].dataCells[0].val = "7";
            testTable.dataRows[5].dataCells[0].val = "10";
            testTable.dataRows[6].dataCells[0].val = "1643846500000"; // just after 2022-02-03
            testTable.dataRows[7].dataCells[0].val = "1643932900000";// just after 2022-02-04
            controller.updateModel({ getAllTables: () => [testTable] });

            let onsort = integrationEnv.enviromentVariables.jspreadsheetTables[testTable.id].onsort;

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql([
                    "7",
                    "10",
                    "2022-02-03",
                    "1643846500000",
                    "2022-02-04",
                    "1643932900000",
                    "text1",
                    "text2"]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5, 6, 7]);

                callbackCalled++;
            });
            onsort("#table_" + testTable.id, 0, true);

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);

                expect(table.dataRows.map(r => r.dataCells[0].val)).to.eql([
                    "text2",
                    "text1",
                    "1643932900000",
                    "2022-02-04",
                    "1643846500000",
                    "2022-02-03",
                    "10",
                    "7"
                ]);
                expect(table.dataRows.map(r => r.index)).to.eql([0, 1, 2, 3, 4, 5, 6, 7]);

                callbackCalled++;
            });
            onsort("#table_" + testTable.id, 0, false);

            assert.equal(callbackCalled, 2);
        });
    });


    describe('remove columns and rows test', function () {
        it('should remove one column', function () {
            let callbackCalled = false;

            let controller = getTableViewController();

            let rowCount = 6;
            let colCount = 5;
            let testTable = TestUtils.makeTestTable(rowCount, colCount);
            controller.updateModel({ getAllTables: () => [testTable] });

            let ondeletecolumn = integrationEnv.enviromentVariables.jspreadsheetTables[testTable.id].ondeletecolumn;

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);
                assert.equal(table.dataColumns.length, 4);

                expect(table.dataColumns.map(col => col.index).sort()).to.eql([0, 1, 2, 3]);
                expect(table.dataRows[0].dataCells.map(cell => cell.val).sort()).to.eql([
                    "0_1",
                    "0_3",
                    "0_4",
                    "Jan 1, 2022",]);

                callbackCalled = true;
            });

            ondeletecolumn("#table_" + testTable.id, 2, 1);

            assert.equal(callbackCalled, true);
        });
    });

    describe('change cells test', function () {
        it('should update a cell', function () {
            let callbackCalled = false;

            let controller = getTableViewController();

            let rowCount = 6;
            let colCount = 5;
            let testTable = TestUtils.makeTestTable(rowCount, colCount);
            controller.updateModel({ getAllTables: () => [testTable] });

            let onchange = integrationEnv.enviromentVariables.jspreadsheetTables[testTable.id].onchange;

            controller.setTableUpdatedCallback((table) => {
                assert.equal(table.dataRows.length, rowCount);
                assert.equal(table.dataColumns.length, colCount);

                expect(table.dataRows[0].dataCells[3].val).to.eql("newValue");

                callbackCalled = true;
            });

            onchange("#table_" + testTable.id, "cellInstance", 3, 0, "newValue", "oldValue")

            assert.equal(callbackCalled, true);
        });
    });
});
