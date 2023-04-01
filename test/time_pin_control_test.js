const chai = require('chai');
const { text } = require('stream/consumers');

let assert = chai.assert;
let expect = chai.expect;


describe('Test TimePinController', function () {
    let integrationEnv;
    let getTimePinController;

    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        DataStructs = integrationEnv.enviromentVariables.DataStructs;
        getTimePinController = function (externalCall) {
            let TimePinController = integrationEnv.enviromentVariables.TimePinController;
            let mockElement = integrationEnv.enviromentVariables.d3.mockElement;
            return new TimePinController(new mockElement(), new mockElement(), new mockElement(), externalCall);
        }
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
        delete modelController;
    });

    describe('instantiation test', function () {
        it('should start without error', function () {
            getTimePinController(() => { });
        })
    });

    describe('time controls test', function () {
        it('should add time ticks without time', function () {
            let model = new DataStructs.DataModel();
            model.getAllTimelines().push(new DataStructs.Timeline([{ x: 0, y: 0 }, { x: 10, y: 15 }, { x: 5, y: 20 }]))
            model.getAllTimelines()[0].timePins.push(new DataStructs.TimePin(0.2), new DataStructs.TimePin(0.4))
            model.getAllTimelines().push(new DataStructs.Timeline([{ x: 10, y: 10 }, { x: 15, y: 10 }, { x: 15, y: 15 }]))
            model.getAllTimelines()[1].timePins.push(new DataStructs.TimePin(0.5))

            let timePinController = getTimePinController(() => { });
            timePinController.updateModel(model);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.pin-tick[timeline-id="' + model.getAllTimelines()[0].id + '"]']
                .innerData.length, 2, "ticks were passed data");
            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.pin-tick[timeline-id="' + model.getAllTimelines()[1].id + '"]']
                .innerData.length, 1, "ticks were passed data");
        });

        it('should add time ticks with time', function () {
            let model = new DataStructs.DataModel();
            model.getAllTimelines().push(new DataStructs.Timeline([{ x: 0, y: 0 }, { x: 10, y: 15 }, { x: 5, y: 20 }]))
            model.getAllTimelines().push(new DataStructs.Timeline([{ x: 10, y: 10 }, { x: 15, y: 10 }, { x: 15, y: 15 }]))
            model.getAllTimelines()[0].timePins.push(new DataStructs.TimePin(0.2), new DataStructs.TimePin(0.4))
            model.getAllTimelines()[1].timePins.push(new DataStructs.TimePin(0.5))
            model.getAllTimelines()[0].timePins[0].timeStamp = new Date("jan 2, 2022").getTime();
            model.getAllTimelines()[0].timePins[1].timeCellId = "id7";
            model.getAllTimelines()[1].timePins[0].timeStamp = new Date("jan 2, 2022").getTime();

            let timePinController = getTimePinController(() => { });
            timePinController.updateModel(model);

            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.pin-tick[timeline-id="' + model.getAllTimelines()[0].id + '"]']
                .innerData.length, 2, "ticks were passed data");
            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.pin-tick[timeline-id="' + model.getAllTimelines()[1].id + '"]']
                .innerData.length, 1, "ticks were passed data");
        })
    });
});

describe('Integration Test TimePinController', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });
    describe('pin display tests', function () {
        it('should display tooltip on mouseover without time mapping', function () {
            integrationEnv.mainInit();

            integrationEnv.mainInit();
            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 200, y: 100 },
            ], integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 150, y: 100 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 125, y: 100 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 115, y: 100 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 3);

            let pinTargets = integrationEnv.enviromentVariables.d3.selectors['.pin-tick-target[timeline-id="' +
                integrationEnv.ModelController.getModel().getAllTimelines()[0].id + '"]']
            pinTargets.eventCallbacks['pointerenter']({ clientX: 125, clientY: 200 }, pinTargets.innerData[0]);
            assert.equal(integrationEnv.enviromentVariables.$.selectors["#main-tooltip"].html(), 'Percent of time: 15%');
            pinTargets.eventCallbacks['pointerenter']({ clientX: 125, clientY: 200 }, pinTargets.innerData[1]);
            assert.equal(integrationEnv.enviromentVariables.$.selectors["#main-tooltip"].html(), 'Percent of time: 25%');
            pinTargets.eventCallbacks['pointerenter']({ clientX: 125, clientY: 200 }, pinTargets.innerData[2]);
            assert.equal(integrationEnv.enviromentVariables.$.selectors["#main-tooltip"].html(), 'Percent of time: 50%');
        });

        it('should display tooltip on mouseover with time mapping', function () {
            integrationEnv.mainInit();

            integrationEnv.mainInit();
            IntegrationUtils.drawLine([
                { x: 100, y: 100 },
                { x: 200, y: 100 },
            ], integrationEnv);

            IntegrationUtils.bindDataToLine(integrationEnv.ModelController.getModel().getAllTimelines()[0].id, [
                ["Jan 10, 2021", "sometext1"],
                ["Jan 20, 2021", "sometext3"]
            ], integrationEnv)
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines().length, 1, "line not drawn");

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 150, y: 100 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 125, y: 100 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 115, y: 100 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 3);

            let pinTargets = integrationEnv.enviromentVariables.d3.selectors['.pin-tick-target[timeline-id="' +
                integrationEnv.ModelController.getModel().getAllTimelines()[0].id + '"]'];
            pinTargets.eventCallbacks['pointerenter']({ clientX: 125, clientY: 200 }, pinTargets.innerData[0]);
            assert.equal(integrationEnv.enviromentVariables.$.selectors["#main-tooltip"].html(), 'Jan 11, 2021 12:00:00');
            pinTargets.eventCallbacks['pointerenter']({ clientX: 125, clientY: 200 }, pinTargets.innerData[1]);
            assert.equal(integrationEnv.enviromentVariables.$.selectors["#main-tooltip"].html(), 'Jan 12, 2021 12:00:00');
            pinTargets.eventCallbacks['pointerenter']({ clientX: 125, clientY: 200 }, pinTargets.innerData[2]);
            assert.equal(integrationEnv.enviromentVariables.$.selectors["#main-tooltip"].html(), 'Jan 15, 2021 00:00:00');
        });
    });

    describe('pin data tests', function () {
        it('should create pins without time', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 150, y: 100 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 125, y: 100 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 175, y: 100 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 3);

            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => Math.round(w.linePercent * 100) / 100).sort())
                .to.eql([0.25, 0.50, 0.75]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.timeStamp))
                .to.eql([null, null, null]);
        });

        it('should create pins with time', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            IntegrationUtils.bindDataToLine(integrationEnv.ModelController.getModel().getAllTimelines()[0].id, [
                ["Jan 10, 2021", "sometext1"],
                ["Jan 15, 2021", "sometext2"],
                ["Jan 20, 2021", "sometext3"]
            ], integrationEnv)

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 150, y: 102 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 125, y: 101 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 175, y: 103 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 3);

            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => Math.round(w.linePercent * 100) / 100).sort())
                .to.eql([0.25, 0.50, 0.75]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.timeStamp).sort())
                .to.eql([
                    0.25 * (new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime(),
                    0.50 * (new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime(),
                    0.75 * (new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime()
                ]);
        });

        it('should create and update pin on drag with no time', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 150, y: 110 }, { x: 125, y: 110 }], timelineId, integrationEnv);

            // the timeline has the point set
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].linePercent, 0.25);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].timePercent, 0.5);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].timeStamp, null);

            // no data was bound
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 0);

            // the tick was drawn
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".pin-tick[timeline-id=\"" + timelineId + "\"]"].innerData.length == 1, true, "ticks were passed data");
        });

        it('should create and update a pin for data without time only when dropped', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;

            IntegrationUtils.bindDataToLine(timelineId, [
                ["", "sometext1"],
                ["Jan 10, 2021", "17"],
                ["Jan 11, 2021", "17"],
                ["Jan 19, 2021", "18"],
                ["Jan 20, 2021", "18"]
            ], integrationEnv)
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 100, y: 100 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 110, y: 100 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 190, y: 100 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 200, y: 100 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 4);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.linePercent).sort())
                .to.eql([0, 0.1, 0.9, 1]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.timePercent).sort())
                .to.eql([null, null, null, null]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.timeStamp))
                .to.eql([
                    new Date("Jan 10, 2021").getTime(),
                    new Date("Jan 11, 2021").getTime(),
                    new Date("Jan 19, 2021").getTime(),
                    new Date("Jan 20, 2021").getTime()
                ]);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 5);
            let textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData;
            assert.equal(textSet.length, 1);
            expect(textSet[0].binding.cellBinding.offset.x).to.eql(10)
            expect(textSet[0].binding.cellBinding.offset.y).to.eql(10)
            expect(textSet[0].x).to.eql(110)
            expect(textSet[0].y).to.eql(110)
            let textTargetSet = integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target"]
                .innerData.filter(d => d.binding.timeline.id == timelineId);;

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target"].
                eventCallbacks.pointerdown({ clientX: 111, clientY: 115 }, textTargetSet[0]);
            IntegrationUtils.pointerMove({ x: 150, y: 120 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 150, y: 120 }, integrationEnv);
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 5);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.linePercent).sort())
                .to.eql([0, 0.1, 0.5, 0.9, 1]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.timePercent).sort())
                .to.eql([null, null, null, null, null]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.timeStamp).sort())
                .to.eql([
                    new Date("Jan 10, 2021").getTime(),
                    new Date("Jan 11, 2021").getTime(),
                    new Date("Jan 15, 2021").getTime(),
                    new Date("Jan 19, 2021").getTime(),
                    new Date("Jan 20, 2021").getTime()
                ]);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 5);
            textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData;
            assert.equal(textSet.length, 1);
            expect(textSet[0].binding.cellBinding.offset.x).to.eql(0)
            expect(textSet[0].binding.cellBinding.offset.y).to.eql(20)
            expect(textSet[0].origin.x).to.eql(150)
            expect(textSet[0].origin.y).to.eql(100)
        });

        it('should create and update pin on drag with data', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", "sometext1"],
                ["Jan 15, 2021", "sometext2"],
                ["Jan 20, 2021", "sometext3"]
            ], integrationEnv)
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 3);

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 150, y: 110 }, { x: 125, y: 110 }], timelineId, integrationEnv);

            // the timeline has the point set
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].linePercent, 0.25);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].timeStamp,
                0.50 * (new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime());

            // no new data was bound
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 3);

            // the tick was drawn
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".pin-tick[timeline-id=\"" + timelineId + "\"]"].innerData.length == 1, true, "ticks were passed data");
        });

        it('should display a pin while dragging, but not update until done, with a timeline mapping', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", "sometext1"],
                ["Jan 20, 2021", "sometext3"]
            ], integrationEnv)
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);

            let timeLineTargets = integrationEnv.enviromentVariables.d3.selectors['.timeline-target'];
            let data = timeLineTargets.innerData.find(d => d.id == integrationEnv.ModelController.getModel().getAllTimelines()[0].id);

            let onLineDragStart = timeLineTargets.eventCallbacks.pointerdown;
            onLineDragStart({ clientX: 150, clientY: 110 }, data)

            let timelineSegments = integrationEnv.enviromentVariables.d3.selectors['.warped-timeline-path'];
            assert.equal(timelineSegments.innerData.length, 2);
            expect(timelineSegments.innerData.map(d => Math.round(d.label * 1000) / 1000)).to.eql([0.5, 0.5]);

            // the tick was drawn
            assert.isNotNull(integrationEnv.enviromentVariables.d3.selectors[".pin-tick[timeline-id=\"" + timelineId + "\"]"], "pin ticks were not set")
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".pin-tick[timeline-id=\"" + timelineId + "\"]"].innerData.length > 0, true, "ticks were passed data");
            let pinTickData = integrationEnv.enviromentVariables.d3.selectors[".pin-tick[timeline-id=\"" + timelineId + "\"]"].innerData[0];

            assert(pinTickData, "tick was not drawn");

            // the timeline not been updated yet
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 0);

            IntegrationUtils.pointerMove({ x: 125, y: 110 }, integrationEnv);

            // the tick was updated
            assert.isNotNull(integrationEnv.enviromentVariables.d3.selectors[".pin-tick[timeline-id=\"" + timelineId + "\"]"], "pin ticks were not set")
            assert.equal(integrationEnv.enviromentVariables.d3.selectors[".pin-tick[timeline-id=\"" + timelineId + "\"]"].innerData.length > 0, true, "ticks were passed data");

            pinTickData = integrationEnv.enviromentVariables.d3.selectors[".pin-tick[timeline-id=\"" + timelineId + "\"]"].innerData[0];
            assert(pinTickData);
            assert.equal(pinTickData.position.x, 125);
            assert.equal(pinTickData.position.y, 100);

            // the timeline not been updated yet
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 0);
            // but the visuals have
            timelineSegments = integrationEnv.enviromentVariables.d3.selectors['.warped-timeline-path'];
            // TODO: FIssues with the test infrastrucure filter function means the last segment doesn't get deleted
            // hense the extra 0.5s that shouldn't be there. 
            assert.equal(timelineSegments.innerData.length, 4);
            expect(timelineSegments.innerData.map(d => Math.round(d.label * 1000) / 1000)).to.eql([0.5, 0.5, 0.575, 0.456]);

            IntegrationUtils.pointerUp({ x: 125, y: 110 }, integrationEnv);

            // the timeline has been updated
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].linePercent, 0.25);

            timelineSegments = integrationEnv.enviromentVariables.d3.selectors['.warped-timeline-path'];
            assert.equal(timelineSegments.innerData.length, 2);
            expect(timelineSegments.innerData.map(d => Math.round(d.label * 1000) / 1000)).to.eql([0.575, 0.456]);

            // no new data was bound
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);
        });

        it('should delete visual pins while dragging, but not update until done', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;
            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", "sometext1"],
                ["Jan 20, 2021", "sometext3"]
            ], integrationEnv)
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 125, y: 102 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 150, y: 101 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 175, y: 103 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);

            // we have three ticks in data and three drawn
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 3);

            let tickTargets = integrationEnv.enviromentVariables.d3.selectors['.pin-tick-target[timeline-id="' + timelineId + '"]']
            assert.equal(tickTargets.innerData.length, 3)

            // start drag
            let onTickDragStart = tickTargets.eventCallbacks.pointerdown;
            onTickDragStart({ clientX: 150, clientY: 110 }, tickTargets.innerData[1]);
            // drag this tick over another one
            IntegrationUtils.pointerMove({ x: 110, y: 110 }, integrationEnv);

            // the timeline not been updated yet
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 3);
            // but the visual has
            assert.equal(integrationEnv.enviromentVariables.d3.selectors['.pin-tick-target[timeline-id="' + timelineId + '"]'].innerData.length, 2)

            let pinTickData = integrationEnv.enviromentVariables.d3.selectors[".pin-tick[timeline-id=\"" + timelineId + "\"]"].innerData[0];
            assert(pinTickData);
            assert.equal(pinTickData.position.x, 110);
            assert.equal(pinTickData.position.y, 100);

            // finish the drag
            IntegrationUtils.pointerUp({ x: 110, y: 110 }, integrationEnv);

            // the timeline has been updated
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].linePercent, 0.1);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins[0].timeStamp,
                0.50 * (new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime());

            // no new data was bound
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);
        });

        it('should set time when binding enough time', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 125, y: 102 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 150, y: 101 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 175, y: 103 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 3);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 3);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.linePercent).sort())
                .to.eql([0.25, 0.50, 0.75]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.timePercent).sort())
                .to.eql([0.25, 0.50, 0.75]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.timeStamp))
                .to.eql([null, null, null]);

            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", "sometext1"],
                ["Jan 18, 2021", "sometext2"],
                ["Jan 20, 2021", "sometext3"]
            ], integrationEnv)
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 3);

            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 3);

            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => Math.round(w.linePercent * 100) / 100).sort())
                .to.eql([0.25, 0.50, 0.75]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.timeStamp).sort())
                .to.eql([
                    0.25 * (new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime(),
                    0.50 * (new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime(),
                    0.75 * (new Date("Jan 20, 2021") - new Date("Jan 10, 2021")) + new Date("Jan 10, 2021").getTime()
                ]);
        });


        it('should set time when binding enough time after a single pin had a time set', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);
            let timelineId = integrationEnv.ModelController.getModel().getAllTimelines()[0].id;

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 150, y: 101 }, { x: 125, y: 101 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 150, y: 103 }, { x: 175, y: 103 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 2);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.timeStamp).sort())
                .to.eql([null, null]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => Math.round(1000 * w.timePercent) / 1000).sort())
                .to.eql([0.5, 0.667]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.linePercent).sort())
                .to.eql([0.25, 0.75]);

            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 15, 2021", "sometext2"]
            ], integrationEnv)
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 1);
            let textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData;
            assert.equal(textSet.length, 1);
            expect(textSet[0].binding.cellBinding.offset.x).to.eql(10)
            expect(textSet[0].binding.cellBinding.offset.y).to.eql(10)
            expect(textSet[0].x).to.eql(110)
            expect(textSet[0].y).to.eql(110)
            let textTargetSet = integrationEnv.enviromentVariables.d3.selectors[".text-interaction-target"]
                .innerData.filter(d => d.binding.timeline.id == timelineId);;

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            integrationEnv.enviromentVariables.d3.selectors['.text-interaction-target'].
                eventCallbacks.pointerdown({ clientX: 111, clientY: 115 }, textTargetSet[0]);
            IntegrationUtils.pointerMove({ x: 150, y: 120 }, integrationEnv);
            IntegrationUtils.pointerUp({ x: 150, y: 120 }, integrationEnv);
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);

            // check that the time pin was created
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 3);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.timeStamp).sort())
                .to.eql([new Date("Jan 15, 2021").getTime(), null, null]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => Math.round(1000 * w.timePercent) / 1000).sort())
                .to.eql([0.5, 0.583, 0.667]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.linePercent).sort())
                .to.eql([0.25, 0.5, 0.75]);

            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 1);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData()[0].cellBinding.timePinId, null);

            // check that it's positioning the text correctly
            textSet = integrationEnv.enviromentVariables.d3.selectors[".annotation-text"].innerData;
            expect(textSet[0].binding.cellBinding.offset.x).to.eql(0)
            expect(textSet[0].binding.cellBinding.offset.y).to.eql(20)
            expect(textSet[0].x).to.eql(150)
            expect(textSet[0].y).to.eql(120)

            IntegrationUtils.bindDataToLine(timelineId, [
                ["Jan 10, 2021", "sometext1"],
                ["Jan 20, 2021", "sometext3"]
            ], integrationEnv)
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 3);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 3);

            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.linePercent).sort())
                .to.eql([0.25, 0.5, 0.75]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.timePercent).sort())
                .to.eql([null, null, null]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => Math.round(w.timeStamp / 1000) * 1000).sort())
                .to.eql([
                    new Date("Thu Jan 14 2021 06:51:26 GMT+0100 (Central European Standard Time)").getTime(),
                    new Date("Jan 15, 2021").getTime(),
                    new Date("Jan 16, 2021").getTime()
                ]);
        });


        it('should set time on pins when changing data cells', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);

            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 125, y: 10 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.clickLine({ x: 175, y: 10 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);

            let timePinIds = integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(p => p.id);
            assert(timePinIds.includes(integrationEnv.ModelController.getModel().getAllCellBindingData()[0].cellBinding.timePinId));
            assert(timePinIds.includes(integrationEnv.ModelController.getModel().getAllCellBindingData()[1].cellBinding.timePinId));

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 150, y: 101 }, { x: 135, y: 101 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 150, y: 103 }, { x: 165, y: 103 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 4);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins
                .sort((a, b) => a.linePercent - b.linePercent)
                .map(w => w.timeStamp))
                .to.eql([null, null, null, null]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => Math.round(1000 * w.timePercent) / 1000).sort())
                .to.eql([0.25, 0.5, 0.594, 0.75]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.linePercent).sort())
                .to.eql([0.25, 0.35, 0.65, 0.75]);

            let tableId = integrationEnv.ModelController.getModel().getAllTables()[0].id;
            let onchange = integrationEnv.enviromentVariables.jspreadsheetTables[tableId].onchange;
            onchange("#table_" + tableId, "cellInstance", 0, 0, "Jan 10, 2022", "");

            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins
                .sort((a, b) => a.linePercent - b.linePercent)
                .map(w => w.timeStamp))
                .to.eql([new Date("Jan 10, 2022").getTime(), null, null, null]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => Math.round(1000 * w.timePercent) / 1000).sort())
                .to.eql([0.25, 0.5, 0.594, 0.75]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.linePercent).sort())
                .to.eql([0.25, 0.35, 0.65, 0.75]);

            timePinIds = integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(p => p.id);
            assert(!timePinIds.includes(integrationEnv.ModelController.getModel().getAllCellBindingData()[0].cellBinding.timePinId));
            assert(timePinIds.includes(integrationEnv.ModelController.getModel().getAllCellBindingData()[1].cellBinding.timePinId));

            onchange = integrationEnv.enviromentVariables.jspreadsheetTables[tableId].onchange;
            onchange("#table_" + tableId, "cellInstance", 0, 1, "Jan 20, 2022", "");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins
                .sort((a, b) => a.linePercent - b.linePercent)
                .map(w => w.timeStamp))
                .to.eql([
                    new Date("Jan 10, 2022").getTime(),
                    new Date("Jan 15, 2022").getTime(),
                    new Date("Sun Jan 16 2022 21:00:00 GMT+0100 (Central European Standard Time)").getTime(),
                    new Date("Jan 20, 2022").getTime()
                ]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.timePercent).sort())
                .to.eql([null, null, null, null]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.linePercent).sort())
                .to.eql([0.25, 0.35, 0.65, 0.75]);
        });


        it('should break the link on a datacell but not set if it would be invalid', function () {
            integrationEnv.mainInit();

            IntegrationUtils.drawLine([{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 200, y: 100 }], integrationEnv);

            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.clickLine({ x: 125, y: 10 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.clickLine({ x: 175, y: 10 }, integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.clickButton("#text-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 2);
            assert.equal(integrationEnv.ModelController.getModel().getAllCellBindingData().length, 2);

            let timePinIds = integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(p => p.id);
            assert(timePinIds.includes(integrationEnv.ModelController.getModel().getAllCellBindingData()[0].cellBinding.timePinId));
            assert(timePinIds.includes(integrationEnv.ModelController.getModel().getAllCellBindingData()[1].cellBinding.timePinId));

            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            IntegrationUtils.dragLine([{ x: 150, y: 101 }, { x: 135, y: 101 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.dragLine([{ x: 150, y: 103 }, { x: 165, y: 103 }], integrationEnv.ModelController.getModel().getAllTimelines()[0].id, integrationEnv);
            IntegrationUtils.clickButton("#pin-button", integrationEnv.enviromentVariables.$);
            assert.equal(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.length, 4);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins
                .sort((a, b) => a.linePercent - b.linePercent)
                .map(w => w.timeStamp))
                .to.eql([null, null, null, null]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => Math.round(1000 * w.timePercent) / 1000).sort())
                .to.eql([0.25, 0.5, 0.594, 0.75]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.linePercent).sort())
                .to.eql([0.25, 0.35, 0.65, 0.75]);

            let tableId = integrationEnv.ModelController.getModel().getAllTables()[0].id;
            let onchange = integrationEnv.enviromentVariables.jspreadsheetTables[tableId].onchange;
            onchange("#table_" + tableId, "cellInstance", 0, 0, "Jan 20, 2022", "");

            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins
                .sort((a, b) => a.linePercent - b.linePercent)
                .map(w => w.timeStamp))
                .to.eql([new Date("Jan 20, 2022").getTime(), null, null, null]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => Math.round(1000 * w.timePercent) / 1000).sort())
                .to.eql([0.25, 0.5, 0.594, 0.75]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.linePercent).sort())
                .to.eql([0.25, 0.35, 0.65, 0.75]);

            timePinIds = integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(p => p.id);
            assert(!timePinIds.includes(integrationEnv.ModelController.getModel().getAllCellBindingData()[0].cellBinding.timePinId));
            assert(timePinIds.includes(integrationEnv.ModelController.getModel().getAllCellBindingData()[1].cellBinding.timePinId));

            onchange = integrationEnv.enviromentVariables.jspreadsheetTables[tableId].onchange;
            onchange("#table_" + tableId, "cellInstance", 0, 1, "Jan 10, 2022", "");
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins
                .sort((a, b) => a.linePercent - b.linePercent)
                .map(w => w.timeStamp))
                .to.eql([
                    new Date("Jan 20, 2022").getTime(),
                    new Date("Jan 30 2022").getTime(),
                    new Date("Feb 02 2022 18:00:00 GMT+0100 (Central European Standard Time)").getTime(),
                    new Date("Feb 09 2022").getTime(),
                ]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.timePercent).sort())
                .to.eql([null, null, null, null]);
            expect(integrationEnv.ModelController.getModel().getAllTimelines()[0].timePins.map(w => w.linePercent).sort())
                .to.eql([0.25, 0.35, 0.65, 0.75]);
        });
    })
});
