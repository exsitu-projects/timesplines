let PathMath = function () {
    let cache = {};
    const PATH_PRECISION = 10; // pixels

    function getHash(points) {
        if (!Array.isArray(points)) {
            console.error("Bad point array for getHash: ", points);
            return "";
        };

        return points.map(p => "(" + Math.round(p.x) + "," + Math.round(p.y) + ")").join(",");
    }

    function getPathData(points) {
        if (!Array.isArray(points)) {
            console.error("Bad point array for getPathData: ", points);
            return {};
        };

        let hash = getHash(points);
        if (!cache[hash]) {
            cache[hash] = { accessed: Date.now() }

            if (Object.keys(cache).length > 10) {
                // ditch the least used
                let deleteItem = Object.entries(cache).reduce((min, d) => {
                    if (d[1].accessed < min[1].accessed) {
                        return d;
                    } else {
                        return min;
                    }
                })

                delete cache[deleteItem[0]]
            }
        }
        return cache[hash]
    }

    let mLineGenerator;
    function getLineGenerator() {
        if (!mLineGenerator) {
            mLineGenerator = d3.line()
                .x((p) => p.x)
                .y((p) => p.y)
                .curve(d3.curveCatmullRom.alpha(0.5));
        }
        return mLineGenerator;
    }


    function getPathD(points) {
        if (!Array.isArray(points)) {
            console.error("Bad point array for getPathD: ", points);
            return "";
        };

        return getLineGenerator()(points);
    }

    function getPathLength(points) {
        let pathData = getPathData(points);
        pathData.accessed = Date.now();

        if (!pathData.length) {
            let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute('d', getPathD(points));
            pathData.length = path.getTotalLength();
        }

        return pathData.length;
    }

    function getSubpathLength(points) {
        let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('d', getPathD(points));
        return path.getTotalLength();
    }

    function equalsPath(points1, points2) {
        if (points1.length != points2.length) return false;
        for (let i = 0; i < points1.length; i++) {
            if (points1[i].x != points2[i].x || points1[i].y != points2[i].y) return false;
        }
        return true;
    }

    function getClosestPointOnPath(coords, points) {
        if (!Array.isArray(points)) {
            console.error("Bad point array for getClosestPointOnPath: ", points);
            return { x: 0, y: 0, percent: 0, length: 0 };
        };

        let metaPoints = getMetaPoints(points);

        if (metaPoints.length < 2) {
            console.error("Bad state! Should be impossible for points structures to have less than 2 points.", metaPoints);
            return { x: 0, y: 0, percent: 0, length: 0 };
        }

        let point1 = metaPoints.reduce((minData, pointData) => {
            let dist = MathUtil.distanceFromAToB(coords, pointData.point);
            if (dist < minData.dist) {
                return { dist, pointData };
            } else {
                return minData;
            }
        }, { dist: Infinity }).pointData;

        // we now have 1 - 2 points to check to see which is closest;
        let point2 = (point1.index + 1) == metaPoints.length ? null : metaPoints[point1.index + 1];
        let prevPoint = point1.index == 0 ? null : metaPoints[point1.index - 1];

        if (!point2 || (prevPoint &&
            MathUtil.distanceFromAToB(coords, prevPoint.point) <
            MathUtil.distanceFromAToB(coords, point2.point))) {
            point2 = point1;
            point1 = prevPoint;
        }

        let pathLength = getPathLength(points);
        let projectedPoint = MathUtil.projectPointOntoLine(coords, point1.point, point2.point);
        let lenOnLine = MathUtil.distanceFromAToB(point1.point, point2.point) * projectedPoint.percent;
        let length = lenOnLine + point1.percent * pathLength;
        let percent = length / pathLength;

        return { x: projectedPoint.x, y: projectedPoint.y, percent, length };
    }

    function getPositionForPercent(points, percent) {
        if (isNaN(percent)) { console.error("Invalid percent to get position for: ", percent); return { x: 0, y: 0 }; }
        if (!points) { console.error("Invalid point array:  ", points); return { x: 0, y: 0 }; }
        if (points.length < 2) { console.error("Invalid point array, too short: ", points); return { x: 0, y: 0 }; }

        return getPositionForPercents(points, [percent])[0];
    }

    function getPositionForPercents(points, percents) {
        if (!points) { console.error("Invalid point array:  ", points); return { x: 0, y: 0 }; }
        if (points.length < 2) { console.error("Invalid point array, too short: ", points); return { x: 0, y: 0 }; }
        percents = percents.map(percent => {
            if (isNaN(parseInt(percent))) {
                console.error("Invalid percent to batch get position for: ", percent);
                return 0;
            }
            return percent;
        })
        percents.sort();

        let returnable = [];

        let metaPoints = getMetaPoints(points);
        let metaPointIndex = 0;
        for (let percentIndex = 0; percentIndex < percents.length; percentIndex++) {
            if (percents[percentIndex] <= 0) {
                let direction = MathUtil.vectorFromAToB(points[1], points[0]);
                let length = Math.abs(percents[percentIndex]) * TAIL_LENGTH;
                returnable.push(MathUtil.getPointAtDistanceAlongVector(length, direction, points[0]));
            } else if (percents[percentIndex] >= 1) {
                let direction = MathUtil.vectorFromAToB(points[points.length - 2], points[points.length - 1]);
                let length = (percents[percentIndex] - 1) * TAIL_LENGTH;
                returnable.push(MathUtil.getPointAtDistanceAlongVector(length, direction, points[points.length - 1]));
            } else {
                let afterPoint = null;
                while (metaPointIndex < metaPoints.length && percents[percentIndex] > metaPoints[metaPointIndex].percent) {
                    metaPointIndex++;
                }
                if (metaPointIndex >= metaPoints.length) {
                    console.error("Code should be unreachable", percents[percentIndex], metaPoints)
                    metaPointIndex = metaPoints.length - 1;
                }
                afterPoint = metaPoints[metaPointIndex];

                if (afterPoint.index == 0) {
                    console.error("Code should be unreachable", percents[percentIndex], afterPoint);
                    afterPoint = metaPoints[1];
                }
                let beforePoint = metaPoints[afterPoint.index - 1];

                let percentBetween = (percents[percentIndex] - beforePoint.percent) / (afterPoint.percent - beforePoint.percent);
                let x = percentBetween * (afterPoint.point.x - beforePoint.point.x) + beforePoint.point.x;
                let y = percentBetween * (afterPoint.point.y - beforePoint.point.y) + beforePoint.point.y;

                returnable.push({ x, y });
            }
        }

        return returnable;
    }

    function getNormalForPercent(points, percent) {
        if (isNaN(percent)) {
            console.error("Invalid normal percent!", percent);
            return { x: 0, y: 1 };
        }

        if (points.length < 2) throw new Error("invalid point array! Too short!", points);

        return getNormalsForPercents(points, [percent])[0];
    }

    function getNormalsForPercents(points, percents) {
        percents = percents.filter((percent) => {
            if (isNaN(percent)) {
                console.error("Invalid normal percent!", percent);
                return false;
            } return true;
        });

        if (points.length < 2) throw new Error("invalid point array! Too short!", points);

        return percents.map(percent => {
            if (percent <= 0) {
                return MathUtil.rotateVectorRight(
                    MathUtil.normalize(
                        MathUtil.vectorFromAToB(points[0], points[1])));
            } else if (percent >= 1) {
                return MathUtil.rotateVectorRight(
                    MathUtil.normalize(
                        MathUtil.vectorFromAToB(points[points.length - 2], points[points.length - 1])));
            } else {
                let metaPoints = getMetaPoints(points);
                let afterPoint = null;
                for (let i = 0; i < metaPoints.length; i++) {
                    if (percent < metaPoints[i].percent) {
                        afterPoint = metaPoints[i];
                        break;
                    }
                }
                if (afterPoint.index == 0) {
                    console.error("Code should be unreachable", "percent:" + percent, afterPoint);
                    afterPoint = metaPoints[1];
                }
                let beforePoint = metaPoints[afterPoint.index - 1];

                let normalPositionBefore = MathUtil.addAToB(beforePoint.point, beforePoint.normal);
                let normalPositionAfter = MathUtil.addAToB(afterPoint.point, afterPoint.normal);

                let percentBetween = (percent - beforePoint.percent) / (afterPoint.percent - beforePoint.percent);
                let x = percentBetween * (afterPoint.point.x - beforePoint.point.x) + beforePoint.point.x;
                let y = percentBetween * (afterPoint.point.y - beforePoint.point.y) + beforePoint.point.y;
                let normalX = percentBetween * (normalPositionAfter.x - normalPositionBefore.x) + normalPositionBefore.x;
                let normalY = percentBetween * (normalPositionAfter.y - normalPositionBefore.y) + normalPositionBefore.y;

                let normalVector = MathUtil.vectorFromAToB({ x, y }, { x: normalX, y: normalY });

                return MathUtil.normalize(normalVector);
            }
        })
    }

    function getPositionForPercentAndDist(points, percent, dist) {
        if (isNaN(percent) || isNaN(dist)) {
            console.error("Invalid percent, dist!", percent, dist);
            return { x: 0, y: 0 };
        }

        return getPositionsForPercentsAndDists(points, [percent], [dist])[0];
    }

    function getPositionsForPercentsAndDists(points, percents, dists, fixedNormal = null) {
        if (percents.length != dists.length) {
            console.error("Invalid inputs, unequal percents and dists counts", percents.length, dists.length);
            return [];
        }

        let filteredValues = [];
        for (let i = 0; i < percents.length; i++) {
            if (isNaN(percents[i]) || isNaN(dists[i])) {
                console.error("Invalid percent, dist!", percents[i], dists[i]);
            } else {
                filteredValues.push([percents[i], dists[i]])
            }
        }
        percents = filteredValues.map(v => v[0]);
        dists = filteredValues.map(v => v[1]);

        let basePoses = getPositionForPercents(points, percents);
        let normals;
        if (fixedNormal == null) {
            normals = getNormalsForPercents(points, percents);
        }

        return dists.map((dist, index) => {
            return MathUtil.getPointAtDistanceAlongVector(dist, fixedNormal ? fixedNormal : normals[index], basePoses[index])
        });
    }

    function interpolatePoints(points, interpolationValues, fixedNormal = null) {
        let metaPoints = getMetaPoints(points);
        let interpolatedPoints = [];

        interpolationValues.filter(iv => {
            if (!DataUtil.isNumeric(iv.percent) || !DataUtil.isNumeric(iv.dist)) {
                console.error("Invalid interpolation value", iv);
                return false;
            }
            return true;
        })
        interpolationValues.forEach(iv => {
            if (iv.percent < -0.001 || iv.percent > 1.001) {
                console.error("Invalid interpolation value percent", iv);
            }
            if (iv.percent < 0) iv.percent = 0;
            if (iv.percent > 1) iv.percent = 1;
        });

        interpolationValues.sort((a, b) => a.percent - b.percent);
        let interpolationQueue = [...interpolationValues]
        for (let i = 0; i < metaPoints.length; i++) {
            while (interpolationQueue.length > 0 && interpolationQueue[0].percent <= metaPoints[i].percent) {
                interpolatedPoints.push(interpolationQueue.shift());
            }
            if (interpolationQueue.length == 0) {
                // if we've emptied the queue, we're done.
                break;
            }

            // only interpolate when we're between interpolation points
            if (interpolatedPoints.length > 0 && interpolationQueue.length > 0) {
                let p1 = interpolatedPoints[interpolatedPoints.length - 1];
                let p2 = interpolationQueue[0];
                // if a metapoint equals an interpolation point skip it. 
                if (metaPoints[i].percent == p1.percent || metaPoints[i].percent == p2.percent) continue;

                let percentBetween = (metaPoints[i].percent - p1.percent) / (p2.percent - p1.percent);
                let interpolatedDist = percentBetween * (p2.dist - p1.dist) + p1.dist;

                interpolatedPoints.push({
                    percent: metaPoints[i].percent,
                    dist: interpolatedDist
                })
            }
        }

        return getPositionsForPercentsAndDists(points,
            interpolatedPoints.map(p => p.percent),
            interpolatedPoints.map(p => p.dist),
            fixedNormal);
    }

    function getPointsWithin(x, coords, points) {
        let returnable = [];
        for (let i = 0; i < points.length; i++) {
            if (MathUtil.distanceFromAToB(points[i], coords) < x) returnable.push(i);
        }
        return returnable;
    }

    function segmentPath(points, labelerFunc) {
        let metaPoints = getMetaPoints(points);

        let segments = []

        let seg = { label: labelerFunc(metaPoints[0].point, metaPoints[0].percent), points: [metaPoints[0].point] };
        for (let i = 1; i < metaPoints.length; i++) {
            let point = metaPoints[i].point;
            let label = labelerFunc(point, metaPoints[i].percent);
            if (label == seg.label) {
                if (metaPoints[i].isOriginal) seg.points.push(point);
            } else {
                seg.points.push(point);
                segments.push(seg)
                seg = { label, points: [{ x: point.x, y: point.y }] }
            }
        }
        segments.push(seg);

        return segments;
    }

    function mergeSegments(segments) {
        if (!segments.length) throw new Error("Array has no length!");

        let points = [...segments[0].points];
        for (let i = 1; i < segments.length; i++) {
            let s = segments[i];
            if (MathUtil.pointsEqual(s.points[0], points[points.length - 1])) {
                points.push(...s.points.slice(1))
            } else {
                points.push(...s.points)
            }
        }
        return points;
    }

    function cloneSegments(segments) {
        return [...segments.map(segment => {
            return {
                label: segment.label,
                points: segment.points.map(p => {
                    return { x: p.x, y: p.y };
                })
            };
        })]
    }

    // UTILITY //

    function getMetaPoints(points) {
        let pathData = getPathData(points);
        pathData.accessed = Date.now();

        if (!pathData.metaPoints) {
            pathData.metaPoints = createMetaPoints(points);
        }

        return pathData.metaPoints;
    }

    function createMetaPoints(points) {
        let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('d', getPathD(points));

        let pathLength = getPathLength(points);

        let metaPoints = [];
        for (let scanLength = 0; scanLength < pathLength + PATH_PRECISION; scanLength += PATH_PRECISION) {
            let currLen = Math.min(scanLength, pathLength);

            // get the point
            let point = path.getPointAtLength(currLen);
            metaPoints.push({
                point: { x: point.x, y: point.y },
                percent: currLen / pathLength,
                normal: getNormal(point, currLen, pathLength, path)
            });
        }

        // if the line is really twisty, add extra points.
        let prevPointsStructure = metaPoints;
        metaPoints = [metaPoints[0]];
        for (let i = 1; i < prevPointsStructure.length; i++) {
            if (MathUtil.distanceFromAToB(prevPointsStructure[i - 1].point, prevPointsStructure[i].point) < 0.75 * PATH_PRECISION) {
                let percent = (prevPointsStructure[i - 1].percent + prevPointsStructure[i].percent) / 2;
                let currLen = pathLength * percent;
                let point = path.getPointAtLength(currLen);

                metaPoints.push({
                    point: { x: point.x, y: point.y },
                    percent,
                    normal: getNormal(point, currLen, pathLength, path)
                });
            }

            metaPoints.push(prevPointsStructure[i])
        }

        let originalPoints = [];
        for (let i = 0; i < points.length; i++) {
            let point = points[i];
            let currLen = getSubpathLength(points.slice(0, i + 1));
            originalPoints.push({
                point: { x: point.x, y: point.y },
                percent: currLen / pathLength,
                normal: getNormal(point, currLen, pathLength, path),
                isOriginal: true
            });
        }

        prevPointsStructure = originalPoints.concat(metaPoints);
        prevPointsStructure.sort((a, b) => a.percent - b.percent);
        metaPoints = [prevPointsStructure[0]]
        for (let i = 1; i < prevPointsStructure.length; i++) {
            let pointData = prevPointsStructure[i];
            let lastPointData = metaPoints[metaPoints.length - 1];
            if (MathUtil.pointsEqual(lastPointData.point, pointData.point)) {
                // we're going to assume that if the percents are the same the points are close enough to make no difference
                lastPointData.isOriginal = lastPointData.isOriginal || pointData.isOriginal;
            } else {
                metaPoints.push(pointData);
            }
        }

        for (let i = 0; i < metaPoints.length; i++) {
            metaPoints[i].index = i;
        }

        return metaPoints;
    }

    function getNormal(point, pointLen, pathLength, path) {
        let point1 = point;
        let point2;
        if (pointLen + 1 > pathLength) {
            point1 = path.getPointAtLength(pointLen - 1);
            point2 = point;
        } else {
            point2 = path.getPointAtLength(pointLen + 1);
        }
        let normal = MathUtil.rotateVectorRight(MathUtil.normalize(MathUtil.vectorFromAToB(point1, point2)));

        return normal;
    }

    // END UTILITY //

    return {
        getPathD,
        getPathLength,
        getSubpathLength,
        equalsPath,
        getPositionForPercent,
        getPositionForPercents,
        getNormalForPercent,
        getPositionForPercentAndDist,
        getPositionsForPercentsAndDists,
        getClosestPointOnPath,
        getPointsWithin,
        segmentPath,
        mergeSegments,
        cloneSegments,
        interpolatePoints,
    }
}();
