let chai = require('chai');
let assert = chai.assert;

describe('Test VersionController', function () {
    let integrationEnv;
    let modelController;
    let DataStructs;

    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        versionController = new integrationEnv.enviromentVariables.VersionController();
        DataStructs = integrationEnv.enviromentVariables.DataStructs;
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
        delete modelController;
    });

    describe('undo/redo tests', function () {
        it('should add, undo, redo, then erase without error', function () {
            let v1 = {};
            let v2 = {};
            let v3 = {};
            let v4 = {};


            versionController.pushVersion(v1);

            assert.equal(versionController.doUndo(), null);
            assert.equal(versionController.doRedo(), null);

            versionController.pushVersion(v2);
            versionController.pushVersion(v3);

            assert.equal(versionController.doUndo(), v2);
            assert.equal(versionController.doRedo(), v3);
            assert.equal(versionController.doUndo(), v2);
            assert.equal(versionController.doUndo(), v1);
            assert.equal(versionController.doRedo(), v2);

            versionController.pushVersion(v4);

            assert.equal(versionController.doRedo(), null);
            assert.equal(versionController.doUndo(), v2);
        });
    });
});


describe('Integration Test VersionController', function () {
    let integrationEnv;
    let ctrlZ;
    let ctrlShiftZ;
    let ctrlY;
    let clickUndo;
    let clickRedo;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        integrationEnv.mainInit();

        ctrlZ = function () {
            integrationEnv.documentCallbacks.find(c => c.event == 'keydown').callback({ ctrlKey: true, which: 90 });
        };
        ctrlShiftZ = function () {
            integrationEnv.documentCallbacks.find(c => c.event == 'keydown').callback({ ctrlKey: true, shiftKey: true, which: 90 });
        };
        ctrlY = function () {
            integrationEnv.documentCallbacks.find(c => c.event == 'keydown').callback({ ctrlKey: true, which: 89 });
        };
        clickUndo = function () {
            IntegrationUtils.clickButton('#undo-button', integrationEnv.enviromentVariables.$);
        };
        clickRedo = function () {
            IntegrationUtils.clickButton('#redo-button', integrationEnv.enviromentVariables.$);
        };
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('undo/redo test', function () {
        it('should do nothing when there is no undo to do', function () {
            let originalModel = integrationEnv.ModelController.getModel().toObject();

            ctrlZ()
            clickUndo()

            TestUtils.deepEquals(integrationEnv.ModelController.getModel().toObject(), originalModel);

            ctrlY();
            ctrlShiftZ();
            clickRedo();

            TestUtils.deepEquals(integrationEnv.ModelController.getModel().toObject(), originalModel);
        });

        it('should undo and redo', function () {
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 0);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 0);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 0);

            IntegrationUtils.drawLine([{ x: 100, y: 200 }, { x: 150, y: 150 }, { x: 200, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ['Jan 10, 2021', '7'],
                ['Jan 20, 2021', '18']
            ], integrationEnv)

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);

            ctrlZ()

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 0);

            // remove pasted data
            clickUndo()
            // remove table
            clickUndo()

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 0);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 0);

            // return table
            ctrlY();
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 0);

            ctrlZ();
            ctrlZ();
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 0);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 0);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 0);

            ctrlShiftZ();
            clickRedo();
            clickRedo();
            clickRedo();

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTables().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);
        });
    });
});