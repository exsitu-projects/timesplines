const chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;


describe('Test ImageController', function () {
    let integrationEnv;
    let getImageController;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        getImageController = function () {
            let ImageController = integrationEnv.enviromentVariables.ImageController;
            let mockElement = integrationEnv.enviromentVariables.d3.mockElement;
            return new ImageController(new mockElement(), new mockElement(), new mockElement());
        }
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('instantiation test', function () {
        it('should start without error', function () {
            getImageController();
        })
    });
});

describe('Integration Test ImageController', function () {
    let integrationEnv;
    let lastThen = () => { console.error("not set") };
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        integrationEnv.enviromentVariables.FileHandler.getImageFile = function () {
            return {
                then: function (func) { lastThen = func; }
            }
        };
    });

    describe('image test', function () {
        afterEach(function (done) {
            lastThen = () => { console.error("not set") };
            integrationEnv.cleanup(done);
        });

        it('should add image at the correct location without time mapping', function () {
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
            IntegrationUtils.clickButton("#image-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 150, y: 102 }, timelineId, integrationEnv);
            lastThen({ imageData: "imageData1", width: 100, height: 100 });
            IntegrationUtils.clickLine({ x: 10, y: 105 }, timelineId, integrationEnv);
            lastThen({ imageData: "imageData2", width: 100, height: 100 });
            IntegrationUtils.clickLine({ x: 100, y: 100 }, timelineId, integrationEnv);
            lastThen({ imageData: "imageData3", width: 100, height: 100 });

            IntegrationUtils.clickButton("#image-button", integrationEnv.enviromentVariables.$);

            let imageSet = integrationEnv.enviromentVariables.d3.selectors[".image-item"].innerData;
            assert.equal(imageSet.length, 3, "Images not created")
            expect(imageSet.map(r => Math.round(r.x)).sort((a, b) => a - b)).to.eql([20, 110, 160]);
            expect(imageSet.map(r => Math.round(r.y)).sort((a, b) => a - b)).to.eql([110, 110, 110]);

            assert.equal(integrationEnv.ModelController.getModel().getAllImageBindingData().length, 3);

        });

        it('should draw image at the correct location with time mapping', function () {
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

            IntegrationUtils.clickButton("#image-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 100, y: 100 }, timelineId, integrationEnv);
            lastThen({ imageData: "imgdata1", width: 100, height: 100 });
            IntegrationUtils.clickLine({ x: 10, y: 105 }, timelineId, integrationEnv);
            lastThen({ imageData: "imgdata2", width: 100, height: 100 });
            IntegrationUtils.clickLine({ x: 150, y: 102 }, timelineId, integrationEnv);
            lastThen({ imageData: "imgdata3", width: 100, height: 100 });
            IntegrationUtils.clickButton("#image-button", integrationEnv.enviromentVariables.$);
            // checks
            let imageSet = integrationEnv.enviromentVariables.d3.selectors[".image-item"].innerData;
            assert.equal(imageSet.length, 3, "Images not created")
            expect(imageSet.map(r => Math.round(r.x)).sort((a, b) => a - b)).to.eql([20, 110, 160]);
            expect(imageSet.map(r => Math.round(r.y)).sort((a, b) => a - b)).to.eql([110, 110, 110]);

            assert.equal(integrationEnv.ModelController.getModel().getAllImageBindingData().length, 3);
        });

        it('should move line image', function () {
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

            IntegrationUtils.clickButton("#image-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 40, y: 103 }, timelineId, integrationEnv);
            lastThen({ imageData: "imgdata1", width: 100, height: 100 });
            IntegrationUtils.clickLine({ x: 100, y: 100 }, timelineId, integrationEnv);
            lastThen({ imageData: "imgdata2", width: 100, height: 100 });
            IntegrationUtils.clickButton("#image-button", integrationEnv.enviromentVariables.$);

            let imageSet = integrationEnv.enviromentVariables.d3.selectors[".image-item"].innerData;
            assert.equal(imageSet.length, 2);

            let data = imageSet[1]
            let movingImageId = data.binding.imageBinding.id;
            expect(data.binding.imageBinding.offset.x).to.eql(10)
            expect(data.binding.imageBinding.offset.y).to.eql(10)

            let imageTargetSet = integrationEnv.enviromentVariables.d3.selectors[".image-interaction-target"].innerData;
            let movingImageTargetData = imageTargetSet.find(item => item.binding.imageBinding.id == movingImageId);
            integrationEnv.enviromentVariables.d3.selectors[".image-interaction-target"].
                eventCallbacks.pointerdown({ clientX: 130, clientY: 110 }, movingImageTargetData);
            IntegrationUtils.pointerMove({ x: 140, y: 120 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 140, y: 120 }, integrationEnv);

            imageSet = integrationEnv.enviromentVariables.d3.selectors[".image-item"].innerData;
            let imageData = imageSet.find(item => item.binding.imageBinding.id == movingImageId);
            expect(imageData.binding.imageBinding.offset.x).to.eql(20)
            expect(imageData.binding.imageBinding.offset.y).to.eql(20)
            integrationEnv.ModelController.getModel().getAllImageBindingData()

            // Check that the correct cell binding was updated
            assert.equal(integrationEnv.ModelController.getModel().getAllImageBindingData().length, 2);

            expect(integrationEnv.ModelController.getModel().getAllImageBindingData()
                .find(item => item.imageBinding.id == movingImageId)
                .imageBinding.offset).to.eql({ x: 20, y: 20 });
        });

        it('should resize line image from bottom right', function () {
            integrationEnv.mainInit();
            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 110, y: 100 }, { x: 120, y: 100 }, { x: 150, y: 100 }, { x: 10, y: 100 }], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [["Jan 10, 2021", 1], ["Jan 20, 2021", 1]], integrationEnv)
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);

            IntegrationUtils.clickButton("#image-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 40, y: 103 }, timelineId, integrationEnv);
            lastThen({ imageData: "imgdata1", width: 100, height: 100 });
            IntegrationUtils.clickLine({ x: 100, y: 100 }, timelineId, integrationEnv);
            lastThen({ imageData: "imgdata2", width: 100, height: 100 });
            IntegrationUtils.clickButton("#image-button", integrationEnv.enviromentVariables.$);

            // check the data is as expected
            let model = integrationEnv.ModelController.getModel();
            let imageBindings = model.getAllImageBindingData();
            let img1 = imageBindings.find(i => i.imageBinding.imageData == "imgdata1")
            let positionData = DataUtil.getImageCanvasPositions(imageBindings);
            assert.equal(img1.imageBinding.offset.x, 10)
            assert.equal(img1.imageBinding.offset.y, 10)
            assert.equal(img1.imageBinding.height, 100)
            assert.equal(img1.imageBinding.width, 100)

            let img1Data = positionData.find(i => i.binding.imageBinding.imageData == "imgdata1")
            assert.equal(Math.round(img1Data.x), 50)
            assert.equal(Math.round(img1Data.y), 110)

            let img2 = imageBindings.find(i => i.imageBinding.imageData == "imgdata2")
            assert.equal(img2.imageBinding.offset.x, 10)
            assert.equal(img2.imageBinding.offset.y, 10)
            assert.equal(img2.imageBinding.height, 100)
            assert.equal(img2.imageBinding.width, 100)

            let img2Data = positionData.find(i => i.binding.imageBinding.imageData == "imgdata2")
            assert.equal(Math.round(img2Data.x), 110)
            assert.equal(Math.round(img2Data.y), 110)


            let resizeImageId = img1.imageBinding.id;

            // click the iamge
            let resizeImageTarget = integrationEnv.enviromentVariables.d3.selectors[".image-interaction-target"].innerData
                .find(item => item.binding.imageBinding.id == resizeImageId);
            integrationEnv.enviromentVariables.d3.selectors[".image-interaction-target"].
                eventCallbacks.pointerdown({ clientX: 260, clientY: 280 }, resizeImageTarget);
            IntegrationUtils.pointerUp({ x: 260, y: 280 }, integrationEnv);

            // move the resize target
            let controlData = integrationEnv.enviromentVariables.d3.selectors[".resize-target"].innerData
                .find(item => item.bottom && item.right);
            integrationEnv.enviromentVariables.d3.selectors[".resize-target"].
                eventCallbacks.pointerdown({ clientX: 150, clientY: 210 }, controlData);
            IntegrationUtils.pointerMove({ x: 250, y: 310 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 250, y: 310 }, integrationEnv);

            // img 1 has changed
            model = integrationEnv.ModelController.getModel();
            imageBindings = model.getAllImageBindingData();
            positionData = DataUtil.getImageCanvasPositions(imageBindings);
            img1 = imageBindings.find(i => i.imageBinding.imageData == "imgdata1")
            assert.equal(Math.round(img1.imageBinding.offset.x), 10)
            assert.equal(Math.round(img1.imageBinding.offset.y), 10)
            assert.equal(Math.round(img1.imageBinding.height), 200)
            assert.equal(Math.round(img1.imageBinding.width), 200)

            img1Data = positionData.find(i => i.binding.imageBinding.imageData == "imgdata1")
            assert.equal(Math.round(img1Data.x), 50)
            assert.equal(Math.round(img1Data.y), 110)

            img2 = imageBindings.find(i => i.imageBinding.imageData == "imgdata2")
            assert.equal(img2.imageBinding.offset.x, 10)
            assert.equal(img2.imageBinding.offset.y, 10)
            assert.equal(img2.imageBinding.height, 100)
            assert.equal(img2.imageBinding.width, 100)

            img2Data = positionData.find(i => i.binding.imageBinding.imageData == "imgdata2")
            assert.equal(Math.round(img2Data.x), 110)
            assert.equal(Math.round(img2Data.y), 110)

            // more the other corner
            controlData = integrationEnv.enviromentVariables.d3.selectors[".resize-target"].innerData
                .find(item => item.top && item.left);
            integrationEnv.enviromentVariables.d3.selectors[".resize-target"].
                eventCallbacks.pointerdown({ clientX: 50, clientY: 110 }, controlData);
            IntegrationUtils.pointerMove({ x: 0, y: 60 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 0, y: 60 }, integrationEnv);

            // img 1 has changed
            model = integrationEnv.ModelController.getModel();
            imageBindings = model.getAllImageBindingData();
            positionData = DataUtil.getImageCanvasPositions(imageBindings);
            img1 = imageBindings.find(i => i.imageBinding.imageData == "imgdata1")
            assert.equal(Math.round(img1.imageBinding.offset.x), -40)
            assert.equal(Math.round(img1.imageBinding.offset.y), -40)
            assert.equal(Math.round(img1.imageBinding.height), 250)
            assert.equal(Math.round(img1.imageBinding.width), 250)

            img1Data = positionData.find(i => i.binding.imageBinding.imageData == "imgdata1")
            assert.equal(Math.round(img1Data.x), 0)
            assert.equal(Math.round(img1Data.y), 60)

            img2 = imageBindings.find(i => i.imageBinding.imageData == "imgdata2")
            assert.equal(img2.imageBinding.offset.x, 10)
            assert.equal(img2.imageBinding.offset.y, 10)
            assert.equal(img2.imageBinding.height, 100)
            assert.equal(img2.imageBinding.width, 100)

            img2Data = positionData.find(i => i.binding.imageBinding.imageData == "imgdata2")
            assert.equal(Math.round(img2Data.x), 110)
            assert.equal(Math.round(img2Data.y), 110)
        });

        it('should add canvas image', function () {
            integrationEnv.mainInit();

            IntegrationUtils.clickButton("#image-button", integrationEnv.enviromentVariables.$);
            // first click
            IntegrationUtils.mainPointerDown({ x: 300, y: 200 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 300, y: 200 }, integrationEnv);
            lastThen({ imageData: "imgdata1", width: 100, height: 100 });
            // second click
            IntegrationUtils.mainPointerDown({ x: 300, y: 320 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 300, y: 320 }, integrationEnv);
            lastThen({ imageData: "imgdata2", width: 100, height: 100 });
            // third click
            IntegrationUtils.mainPointerDown({ x: 125, y: 200 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 125, y: 320 }, integrationEnv);
            lastThen({ imageData: "imageData3", width: 100, height: 100 });
            IntegrationUtils.clickButton("#image-button", integrationEnv.enviromentVariables.$);

            let imageSet = integrationEnv.enviromentVariables.d3.selectors[".image-item"].innerData;
            assert.equal(imageSet.length, 3);
            expect(imageSet.map(t => t.x)).to.eql([250, 250, 75]);
            expect(imageSet.map(t => t.y)).to.eql([150, 270, 150]);

            assert.equal(integrationEnv.ModelController.getModel().getCanvasImageBindings().length, 3);
        });

        it('should move canvas image', function () {
            integrationEnv.mainInit();

            IntegrationUtils.clickButton("#image-button", integrationEnv.enviromentVariables.$);
            // first click
            IntegrationUtils.mainPointerDown({ x: 300, y: 200 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 300, y: 200 }, integrationEnv);
            lastThen({ imageData: "imgdata1", width: 100, height: 100 });
            // second click
            IntegrationUtils.mainPointerDown({ x: 300, y: 320 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 300, y: 320 }, integrationEnv);
            lastThen({ imageData: "imgdata2", width: 100, height: 100 });

            let imageSet = integrationEnv.enviromentVariables.d3.selectors[".image-item"].innerData;
            assert.equal(imageSet.length, 2);
            expect(imageSet.map(t => t.x)).to.eql([250, 250]);
            expect(imageSet.map(t => t.y)).to.eql([150, 270]);

            assert.equal(integrationEnv.ModelController.getModel().getCanvasImageBindings().length, 2);

            let data = imageSet[1]
            let movingImageId = data.binding.imageBinding.id;
            expect(data.binding.imageBinding.offset.x).to.eql(250)
            expect(data.binding.imageBinding.offset.y).to.eql(270)

            let imageTargetSet = integrationEnv.enviromentVariables.d3.selectors[".image-interaction-target"].innerData;
            let movingImageTargetData = imageTargetSet.find(item => item.binding.imageBinding.id == movingImageId);
            integrationEnv.enviromentVariables.d3.selectors[".image-interaction-target"].
                eventCallbacks.pointerdown({ clientX: 260, clientY: 280 }, movingImageTargetData);
            IntegrationUtils.pointerMove({ x: 140, y: 120 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 140, y: 120 }, integrationEnv);

            imageSet = integrationEnv.enviromentVariables.d3.selectors[".image-item"].innerData;
            let imageData = imageSet.find(item => item.binding.imageBinding.id == movingImageId);
            expect(imageData.binding.imageBinding.offset.x).to.eql(130)
            expect(imageData.binding.imageBinding.offset.y).to.eql(110)
            integrationEnv.ModelController.getModel().getAllImageBindingData()

            // Check that the correct cell binding was updated
            assert.equal(integrationEnv.ModelController.getModel().getAllImageBindingData().length, 2);

            expect(integrationEnv.ModelController.getModel().getAllImageBindingData()
                .find(item => item.imageBinding.id == movingImageId)
                .imageBinding.offset).to.eql({ x: 130, y: 110 });
            expect(integrationEnv.ModelController.getModel().getAllImageBindingData()
                .find(item => item.imageBinding.id != movingImageId)
                .imageBinding.offset).to.eql({ x: 250, y: 150 });
        });

        it('should resize canvas image', function () {
            integrationEnv.mainInit();

            // add two images
            IntegrationUtils.clickButton("#image-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.mainPointerDown({ x: 300, y: 200 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 300, y: 200 }, integrationEnv);
            lastThen({ imageData: "imgdata1", width: 100, height: 100 });
            IntegrationUtils.mainPointerDown({ x: 300, y: 320 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 300, y: 320 }, integrationEnv);
            lastThen({ imageData: "imgdata2", width: 100, height: 100 });

            let model = integrationEnv.ModelController.getModel();
            let imageBindings = model.getAllImageBindingData();
            assert.equal(imageBindings.length, 2);

            let img1 = imageBindings.find(i => i.imageBinding.imageData == "imgdata1")
            assert.equal(img1.imageBinding.offset.x, 250)
            assert.equal(img1.imageBinding.offset.y, 150)
            assert.equal(img1.imageBinding.height, 100)
            assert.equal(img1.imageBinding.width, 100)

            let img2 = imageBindings.find(i => i.imageBinding.imageData == "imgdata2")
            assert.equal(img2.imageBinding.offset.x, 250)
            assert.equal(img2.imageBinding.offset.y, 270)
            assert.equal(img2.imageBinding.height, 100)
            assert.equal(img2.imageBinding.width, 100)

            let resizeImageId = img1.imageBinding.id;

            // click the iamge
            let resizeImageTarget = integrationEnv.enviromentVariables.d3.selectors[".image-interaction-target"].innerData
                .find(item => item.binding.imageBinding.id == resizeImageId);
            integrationEnv.enviromentVariables.d3.selectors[".image-interaction-target"].
                eventCallbacks.pointerdown({ clientX: 260, clientY: 280 }, resizeImageTarget);
            IntegrationUtils.pointerUp({ x: 260, y: 280 }, integrationEnv);

            let controlData = integrationEnv.enviromentVariables.d3.selectors[".resize-target"].innerData
                .find(item => item.bottom && item.right);
            integrationEnv.enviromentVariables.d3.selectors[".resize-target"].
                eventCallbacks.pointerdown({ clientX: 350, clientY: 250 }, controlData);
            IntegrationUtils.pointerMove({ x: 425, y: 375 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 425, y: 375 }, integrationEnv);

            model = integrationEnv.ModelController.getModel();
            imageBindings = model.getAllImageBindingData();

            // img 1 has changed
            img1 = imageBindings.find(i => i.imageBinding.imageData == "imgdata1")
            assert.equal(img1.imageBinding.offset.x, 250)
            assert.equal(img1.imageBinding.offset.y, 150)
            assert.equal(img1.imageBinding.height, 200)
            assert.equal(img1.imageBinding.width, 200)

            // img 2 has not.
            img2 = imageBindings.find(i => i.imageBinding.imageData == "imgdata2")
            assert.equal(img2.imageBinding.offset.x, 250)
            assert.equal(img2.imageBinding.offset.y, 270)
            assert.equal(img2.imageBinding.height, 100)
            assert.equal(img2.imageBinding.width, 100)
        });
    })
});