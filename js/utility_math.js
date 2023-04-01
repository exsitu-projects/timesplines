let MathUtil = function () {
    function vectorFromAToB(a, b) {
        if (!a || !isNumeric(a.x) || !isNumeric(a.y) || !b || !isNumeric(b.x) || !isNumeric(b.y)) {
            console.error("Invalid vectors for vectorFromAToB:", a, b);
            return { x: 0, y: 0 };
        }

        return subtractAFromB(a, b);
    }

    function distanceFromAToB(a, b) {
        if (!a || !isNumeric(a.x) || !isNumeric(a.y) || !b || !isNumeric(b.x) || !isNumeric(b.y)) {
            console.error("Invalid vectors for distanceFromAToB: ", a, b);
            return 0;
        }

        let x = a.x - b.x;
        let y = a.y - b.y;

        return Math.sqrt(x * x + y * y);
    }

    function addAToB(a, b) {
        if (!a || !isNumeric(a.x) || !isNumeric(a.y) || !b || !isNumeric(b.x) || !isNumeric(b.y)) {
            console.error("Invalid vectors for addAToB: ", a, b);
            return { x: 0, y: 0 };
        }

        return {
            x: b.x + a.x,
            y: b.y + a.y
        }
    }

    function subtractAFromB(a, b) {
        if (!a || !isNumeric(a.x) || !isNumeric(a.y) || !b || !isNumeric(b.x) || !isNumeric(b.y)) {
            console.error("Invalid vectors for subtractAFromB: ", a, b);
            return { x: 0, y: 0 };
        }

        return {
            x: b.x - a.x,
            y: b.y - a.y
        }
    }

    function pointsEqual(a, b) {
        if (!a || !isNumeric(a.x) || !isNumeric(a.y) || !b || !isNumeric(b.x) || !isNumeric(b.y)) {
            console.error("Invalid vectors for pointsEqual: ", a, b);
            return false;
        }

        return a.x == b.x && a.y == b.y;
    }

    function vectorLength(v) {
        if (!v || !isNumeric(v.x) || !isNumeric(v.y)) {
            console.error("Invalid vectors for vectorLength: ", v);
            return 0;
        }

        return distanceFromAToB(v, { x: 0, y: 0 });
    }

    function normalize(vector) {
        if (!vector || !isNumeric(vector.x) || !isNumeric(vector.y)) {
            console.error("Invalid vector for normalize: ", vector);
            return { x: 0, y: 0 };
        }

        let length = vectorLength(vector);
        if (length == 0) {
            console.error("Invalid vector for vectorLength: ", vector)
            return vector;
        }

        return { x: vector.x / length, y: vector.y / length };
    }

    function getPointAtDistanceAlongVector(distance, vector, origin = { x: 0, y: 0 }) {
        if (!origin || !isNumeric(origin.x) || !isNumeric(origin.y) || !isNumeric(distance)) {
            console.error("Invalid values for getPointAtDistanceAlongVector: ", origin, distance);
            return { x: 0, y: 0 };
        }

        let normalVector = normalize(vector);
        return { x: normalVector.x * distance + origin.x, y: normalVector.y * distance + origin.y };
    }

    function projectPointOntoVector(point, vector, origin = { x: 0, y: 0 }) {
        if (!point || !isNumeric(point.x) || !isNumeric(point.y) ||
            !origin || !isNumeric(origin.x) || !isNumeric(origin.y) ||
            !vector || !isNumeric(vector.x) || !isNumeric(vector.y)) {
            console.error("Invalid values for projectPointOntoVector: ", point, vector, origin);
            return { x: 0, y: 0, neg: 0 };
        }

        // handle edge case of straight normal
        if (vector.y == 0) {
            return { x: point.x, y: origin.y, neg: point.x > origin.x }
        }

        if (vector.x == 0) {
            return { x: origin.x, y: point.y, neg: point.y < origin.y }
        }

        let normalVector = normalize(vector);

        let a = origin;
        let b = { x: origin.x + normalVector.x, y: origin.y + normalVector.y }

        var aToB = { x: b.x - a.x, y: b.y - a.y };
        var aToPoint = { x: point.x - a.x, y: point.y - a.y };
        var sqLenAToB = aToB.x * aToB.x + aToB.y * aToB.y;
        var dot = aToPoint.x * aToB.x + aToPoint.y * aToB.y;
        var t = dot / sqLenAToB;

        return {
            x: a.x + aToB.x * t,
            y: a.y + aToB.y * t,
            neg: t < 0
        };
    }

    function projectPointOntoLine(coords, point1, point2) {
        if (!coords || !isNumeric(coords.x) || !isNumeric(coords.y) ||
            !point1 || !isNumeric(point1.x) || !isNumeric(point1.y) ||
            !point2 || !isNumeric(point2.x) || !isNumeric(point2.y)) {
            console.error("Invalid values!", coords, point1, point2);
            return { x: 0, y: 0, percent: 0 };
        }

        if (MathUtil.pointsEqual(point1, point2)) {
            console.error("Invalid Line!", point1, point2);
            return {
                x: point1.x,
                y: point1.y,
                percent: 0
            }
        }

        var p1ToP2 = {
            x: point2.x - point1.x,
            y: point2.y - point1.y
        };
        var p1ToCoords = {
            x: coords.x - point1.x,
            y: coords.y - point1.y
        };
        var p1ToP2LenSquared = p1ToP2.x * p1ToP2.x + p1ToP2.y * p1ToP2.y;
        var dot = p1ToCoords.x * p1ToP2.x + p1ToCoords.y * p1ToP2.y;
        var percent = Math.min(1, Math.max(0, dot / p1ToP2LenSquared));

        return {
            x: point1.x + p1ToP2.x * percent,
            y: point1.y + p1ToP2.y * percent,
            percent: percent
        };
    }

    function vectorToRotation(vector) {
        vector = normalize(vector);
        var angle = Math.atan2(vector.y, vector.x);   //radians
        // you need to devide by PI, and MULTIPLY by 180:
        var degrees = 180 * angle / Math.PI;  //degrees
        return (360 + Math.round(degrees)) % 360 - 90; //round number, avoid decimal fragments
    }

    function rotateVectorLeft(vector) {
        if (!vector || !isNumeric(vector.x) || !isNumeric(vector.y)) {
            console.error("Invalid vector!", v);
            return { x: 0, y: 0 };
        }

        return { x: -vector.y, y: vector.x };
    }

    function rotateVectorRight(vector) {
        if (!vector || !isNumeric(vector.x) || !isNumeric(vector.y)) {
            console.error("Invalid vector!", v);
            return { x: 0, y: 0 };
        }

        return { x: vector.y, y: -vector.x };
    }

    function isNumeric(val) {
        return typeof val == 'number' && !isNaN(val);
    }

    return {
        vectorFromAToB,
        distanceFromAToB,
        addAToB,
        subtractAFromB,
        pointsEqual,
        vectorLength,
        normalize,
        getPointAtDistanceAlongVector,
        projectPointOntoVector,
        projectPointOntoLine,
        vectorToRotation,
        rotateVectorLeft,
        rotateVectorRight,
    }
}();