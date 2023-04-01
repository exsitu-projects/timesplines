const chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;


describe('Test TextController', function () {
    let integrationEnv;
    let getTextController;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        getTextController = function () {
            let TextController = integrationEnv.enviromentVariables.TextController;
            let mockElement = integrationEnv.enviromentVariables.d3.mockElement;
            return new TextController(new mockElement(), new mockElement(), new mockElement());
        }
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('instantiation test', function () {
        it('should start without error', function () {
            getTextController();
        })
    });
});

describe('Integration Test TextController', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('text test', function () {
        it('should add text at the correct location without time mapping', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 100 },
                { x: 150, y: 100 },
                { x: 90, y: 100 },
                { x: 40, y: 100 },
                { x: 10, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);

            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 100, y: 100 }, timelineId, integrationEnv);
            IntegrationUtils.clickLine({ x: 10, y: 105 }, timelineId, integrationEnv);
            IntegrationUtils.clickLine({ x: 150, y: 102 }, timelineId, integrationEnv);
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);

            let textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData;
            assert.equal(textSet.length, 3, "Annotations not created")
            expect(textSet.map(r => Math.round(r.x)).sort()).to.eql([110, 160, 20]);
            expect(textSet.map(r => Math.round(r.y)).sort()).to.eql([110, 110, 110]);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 3);
        });

        it('should draw text at the correct location with time mapping', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 100 },
                { x: 150, y: 100 },
                { x: 90, y: 100 },
                { x: 40, y: 100 },
                { x: 10, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", 1],
                ["Jan 20, 2021", 1]
            ], integrationEnv)
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);

            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 100, y: 100 }, timelineId, integrationEnv);
            IntegrationUtils.clickLine({ x: 10, y: 105 }, timelineId, integrationEnv);
            IntegrationUtils.clickLine({ x: 150, y: 102 }, timelineId, integrationEnv);
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);

            let textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData;
            assert.equal(textSet.length, 3, "Annotations not created")
            expect(textSet.map(r => Math.round(r.x)).sort()).to.eql([110, 160, 20]);
            expect(textSet.map(r => Math.round(r.y)).sort()).to.eql([110, 110, 110]);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 5);
        });


        it('should text for old times in the correct positions', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 20, 1788", "text1"],
                ["Jan 25, 1792", "text2"],
            ], integrationEnv);

            // check that the dates are at the end.
            let cellBindingData = integrationEnv.ModelController.getModel().getAllCellBindingData();
            expect(cellBindingData
                .map(cell => [cell.linePercent, cell.dataCell.getValue()])
                .sort((a, b) => a[0] - b[0]))
                .to.eql([[0, 'text1'], [1, 'text2']]);
        });

        it('should move text', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 110, y: 100 },
                { x: 120, y: 100 },
                { x: 150, y: 100 },
                { x: 90, y: 100 },
                { x: 40, y: 100 },
                { x: 10, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", 1],
                ["Jan 20, 2021", 1]
            ], integrationEnv)
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);

            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 40, y: 103 }, timelineId, integrationEnv);
            IntegrationUtils.clickLine({ x: 100, y: 100 }, timelineId, integrationEnv);
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 4);

            let textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData;
            assert.equal(textSet.length, 2);

            let annotationData = textSet[1]
            let movingTextId = annotationData.binding.cellBinding.id;
            expect(annotationData.binding.cellBinding.offset.x).to.eql(10)
            expect(annotationData.binding.cellBinding.offset.y).to.eql(10)

            let textTargetSet = integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target"]
                .innerData.filter(d => d.binding.timeline.id == timelineId);
            let movingTextTargetData = textTargetSet.find(item => item.binding.cellBinding.id == movingTextId);
            integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target"].
                eventCallbacks.pointerdown({ clientX: 130, clientY: 110 }, movingTextTargetData);
            IntegrationUtils.pointerMove({ x: 140, y: 120 }, integrationEnv);

            // Check that the correct annotation is updating
            textSet = integrationEnv.enviromentVariables.d3.selectors['.annotation-text[binding-id="' + movingTextId + '"]'].innerData;

            annotationData = textSet[0];
            expect(annotationData.binding.cellBinding.offset.x).to.eql(20)
            expect(annotationData.binding.cellBinding.offset.y).to.eql(20)
            expect(integrationEnv.ModelController.getModel().getAllCellBindingData()
                .filter(b => b.dataCell.getType() == DataTypes.TEXT)
                .map(b => b.cellBinding.offset.x)).to.eql([10, 10])
            expect(integrationEnv.ModelController.getModel().getAllCellBindingData()
                .filter(b => b.dataCell.getType() == DataTypes.TEXT)
                .map(b => b.cellBinding.offset.y)).to.eql([10, 10])

            IntegrationUtils.pointerUp({ x: 140, y: 120 }, integrationEnv);

            textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData;
            annotationData = textSet.find(item => item.binding.cellBinding.id == movingTextId);
            expect(annotationData.binding.cellBinding.offset.x).to.eql(20)
            expect(annotationData.binding.cellBinding.offset.y).to.eql(20)
            integrationEnv.ModelController.getModel().getAllCellBindingData()

            // Check that the correct cell binding was updated
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 4);

            expect(integrationEnv.ModelController.getModel().getAllCellBindingData()
                .find(item => item.cellBinding.id == movingTextId)
                .cellBinding.offset).to.eql({ x: 20, y: 20 });
        });


        it('should add canvas text', function () {
            integrationEnv.mainInit();

            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.mainPointerDown({ x: 300, y: 200 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 300, y: 200 }, integrationEnv);
            IntegrationUtils.mainPointerDown({ x: 300, y: 320 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 300, y: 320 }, integrationEnv);
            IntegrationUtils.mainPointerDown({ x: 125, y: 200 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 125, y: 320 }, integrationEnv);
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);

            assert.equal(integrationEnv.ModelController.getModel().getCanvasBindingData().length, 3);

            let textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData;
            assert.equal(textSet.length, 3);
            expect(textSet.map(t => t.x)).to.eql([300, 300, 125]);
            expect(textSet.map(t => t.y)).to.eql([200, 320, 200]);
        });
    })
});