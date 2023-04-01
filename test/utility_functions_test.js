let chai = require('chai');
let rewire = require('rewire');
let assert = chai.assert;
let expect = chai.expect;

describe('Test PathMath', function () {
    let PathMath;

    beforeEach(function (done) {
        integrationEnv = TestUtils.getIntegrationEnviroment();
        PathMath = integrationEnv.enviromentVariables.PathMath;

        done();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('path length test', function () {
        it('should call without error', function () {
            let points = [
                { x: 10, y: 10 },
                { x: 10, y: 15 },
                { x: 15, y: 15 },
                { x: 20, y: 15 },
                { x: 15, y: 20 },
                { x: 20, y: 20 }
            ]

            PathMath.getPathLength(points);
        })

        it('should get simple lengths', function () {
            let points = [
                { x: 10, y: 10 },
                { x: 10, y: 15 },
                { x: 15, y: 15 },
                { x: 20, y: 15 },
                { x: 15, y: 20 },
                { x: 20, y: 20 }
            ]


            expect(PathMath.getPathLength(points)).to.be.closeTo(27, .1);
        })

        it('should get cloest point on end of line', function () {
            let points = [
                { x: 10, y: 10 },
                { x: 10, y: 15 },
                { x: 15, y: 15 },
                { x: 20, y: 15 },
                { x: 15, y: 20 },
                { x: 20, y: 20 }
            ]

            let point = PathMath.getClosestPointOnPath({ x: 0, y: 0 }, points);

            expect(point.x).to.be.closeTo(10, .0001);
            expect(point.y).to.be.closeTo(10, .0001);

            point = PathMath.getClosestPointOnPath({ x: 30, y: 30 }, points);

            expect(point.x).to.be.closeTo(20, .0001);
            expect(point.y).to.be.closeTo(20, .0001);

            point = PathMath.getClosestPointOnPath({ x: 11, y: 12.5 }, points);

            expect(point.x).to.be.closeTo(10, .0001);
            expect(point.y).to.be.closeTo(12.5, .0001);


            point = PathMath.getClosestPointOnPath({ x: 15, y: 15 }, points);

            expect(point.x).to.be.closeTo(15, .0001);
            expect(point.y).to.be.closeTo(15, .0001);
        })
    })

    describe('path segmentation tests', function () {
        it('should break line into three segments', function () {
            let points = [
                { x: 10, y: 10 },
                { x: 10, y: 15 },
                { x: 15, y: 15 },
                { x: 20, y: 15 },
                { x: 15, y: 20 },
                { x: 20, y: 20 }
            ]

            let segments = PathMath.segmentPath(points, (point) => {
                if (point.x == 15 && point.y == 15) return "labelYes";
                else return "labelNo";
            });

            assert.equal(segments.length, 3);
        })

        it('should segment line on empty section', function () {
            let points = [
                { x: 0, y: 0 },
                { x: 0, y: 100 }
            ]

            let segments = PathMath.segmentPath(points, (point) => {
                if (point.y > 40 && point.y <= 50) return "labelYes";
                else return "labelNo";
            });

            assert.equal(segments.length, 3);
        })
    });
});
