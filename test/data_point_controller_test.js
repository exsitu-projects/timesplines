const chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;

describe('Test DataPointController', function () {
    let integrationEnv;
    let getDataPointController;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        getDataPointController = function () {
            let DataPointController = integrationEnv.enviromentVariables.DataPointController;
            let mockElement = integrationEnv.enviromentVariables.d3.mockElement;
            return new DataPointController(new mockElement(), new mockElement(), new mockElement());
        }
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('instantiation test', function () {
        it('should start without error', function () {
            getDataPointController();
        })
    });
});

describe('Integration Test DataPointController', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('data test', function () {
        it('should draw data on the line', function () {
            integrationEnv.mainInit();

            IntegrationUtils.clickButton("#add-datasheet-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            let tableId = integrationEnv.ModelController.getModel().getAllTables()[0].id;

            let onchange = integrationEnv.enviromentVariables.jspreadsheetTables[tableId].onchange;
            onchange("#table_" + tableId, "cellInstance", 0, 0, "5", "");
            onchange("#table_" + tableId, "cellInstance", 1, 0, "15", "");
            onchange("#table_" + tableId, "cellInstance", 0, 1, "10", "");
            onchange("#table_" + tableId, "cellInstance", 1, 1, "25", "");

            IntegrationUtils.drawLine([{ x: 0, y: 10 }, { x: 100, y: 10 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].points.length, 3)

            IntegrationUtils.selectCells(tableId, 0, 0, 1, 1, integrationEnv);

            IntegrationUtils.clickButton("#link-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 50, y: 50 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);

            // won't bind the two time cols.
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].cellBindings.length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].axisBindings.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().find(item => item.axisBinding).axisBinding.val1, 15);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().find(item => item.axisBinding).axisBinding.val2, 25);
        });

        it('should draw a data line', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 0, y: 10 }, { x: 25, y: 20 }, { x: 50, y: -10 }, { x: 75, y: 20 }, { x: 90, y: 10 }, { x: 100, y: 10 }], integrationEnv);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 20, 2022", 25, -25],
                ["Jan 21, 2022", 15, -15],
                ["Jan 22, 2022", 5, -5],
                ["Jan 22, 2022", -5, -5],
                ["Jan 25, 2022", 15, -15],
            ], integrationEnv)
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].axisBindings.length, 2);
            let axis1Id = integrationEnv.ModelController.getModel().getAllTimelines()[0].axisBindings[0].id;
            let axis2Id = integrationEnv.ModelController.getModel().getAllTimelines()[0].axisBindings[1].id;

            let axisControlCircles = integrationEnv.enviromentVariables.d3.selectors['.axis-target-circle'];
            assert.equal(axisControlCircles.innerData.length, 4);
            expect(axisControlCircles.innerData.find(d => d.ctrl == 1 && d.axis.id == axis1Id).x).to.be.closeTo(93.6, 0.1);
            expect(axisControlCircles.innerData.find(d => d.ctrl == 1 && d.axis.id == axis1Id).y).to.be.closeTo(-19.3, 0.1);
            let data = axisControlCircles.innerData.find(d => d.ctrl == 1 && d.axis.id == axis1Id);
            axisControlCircles.eventCallbacks.pointerdown({ x: 100, y: -20 }, data);

            IntegrationUtils.clickButton("#toggle-data-style-button", integrationEnv.enviromentVariables.$);
            let lineData = integrationEnv.enviromentVariables.d3.selectors['.data-line-path'];
            assert.equal(lineData.innerData.length, 1);
            expect(lineData.innerData[0].line.map(p => Math.round(p.x))).to.eql([-19, -7, 5, 6, 17, 45, 61, 62, 53, 63, 75, 87, 60, 64, 72, 80, 82, 84]);
            expect(lineData.innerData[0].line.map(p => Math.round(p.y))).to.eql([-88, -79, -70, -69, -61, -53, -48, -46, -25, -27, -30, -33, -38, -42, -51, -61, -63, -65]);

            data = axisControlCircles.innerData.find(d => d.ctrl == 1 && d.axis.id == axis2Id);
            axisControlCircles.eventCallbacks.pointerdown({ x: 100, y: -20 }, data);
            IntegrationUtils.clickButton("#toggle-data-style-button", integrationEnv.enviromentVariables.$);
            lineData = integrationEnv.enviromentVariables.d3.selectors['.data-line-path'];
            assert.equal(lineData.innerData.length, 2);
            expect(lineData.innerData[0].line.map(p => Math.round(p.x))).to.eql([-19, -7, 5, 6, 17, 45, 61, 62, 53, 63, 75, 87, 60, 64, 72, 80, 82, 84]);
            expect(lineData.innerData[0].line.map(p => Math.round(p.y))).to.eql([-88, -79, -70, -69, -61, -53, -48, -46, -25, -27, -30, -33, -38, -42, -51, -61, -63, -65]);
            expect(lineData.innerData[1].line.map(p => Math.round(p.x))).to.eql([-6, 1, 8, 8, 14, 49, 79, 81, 81, 86, 93, 100, 55, 60, 71, 81, 84, 86]);
            expect(lineData.innerData[1].line.map(p => Math.round(p.y))).to.eql([-19, -38, -56, -58, -75, -94, -88, -89, -89, -81, -72, -63, -63, -62, -58, -55, -54, -54]);

            IntegrationUtils.clickButton("#toggle-data-style-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickButton("#toggle-data-style-button", integrationEnv.enviromentVariables.$);
            lineData = integrationEnv.enviromentVariables.d3.selectors['.data-line-path'];
            assert.equal(lineData.innerData.length, 1);

            lineData = integrationEnv.enviromentVariables.d3.selectors['.data-stream-path'];
            assert.equal(lineData.innerData.length, 1);
        });

        it('should update the axis', function () {
            //TODO investigate this, it's wierd. 
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 0, y: 10 }, { x: 100, y: 10 }], integrationEnv);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["5", 15],
                ["10", 25]
            ], integrationEnv)

            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData()[0].axisBinding.dist1, 30);

            let axisControlCircles = integrationEnv.enviromentVariables.d3.selectors['.axis-target-circle'];
            assert.equal(axisControlCircles.innerData.length, 2);
            assert.equal(axisControlCircles.innerData.find(d => d.ctrl == 1).x, 100);
            assert.equal(axisControlCircles.innerData.find(d => d.ctrl == 1).y, -20);

            let data = axisControlCircles.innerData.find(d => d.ctrl == 1);

            axisControlCircles.eventCallbacks.pointerdown({ x: 100, y: -20 }, data);
            IntegrationUtils.pointerMove({ x: 100, y: 20 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 100, y: 20 }, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData()[0].axisBinding.dist1, 10);
            assert.equal(axisControlCircles.innerData.length, 2);
            assert.equal(axisControlCircles.innerData.find(d => d.ctrl == 1).x, 100);
            assert.equal(axisControlCircles.innerData.find(d => d.ctrl == 1).y, 0);
        });
    })
});