let DataStructs = function () {
    let idCounter = 0;
    function getUniqueId() {
        idCounter++
        return Date.now() + "_" + idCounter;
    }

    function Canvas() {
        this.color = "#FFFFFF";
        this.cellBindings = [];
        this.annotationStrokes = [];
        this.imageBindings = [];

        this.copy = function () {
            let canvas = new Canvas();
            canvas.color = this.color;
            canvas.cellBindings = this.cellBindings.map(b => b.copy());
            canvas.annotationStrokes = this.annotationStrokes.map(b => b.copy());
            canvas.imageBindings = this.imageBindings.map(b => b.copy());
            return canvas;
        }
    }
    Canvas.fromObject = function (obj) {
        let canvas = new Canvas();
        canvas.color = obj.color;
        obj.cellBindings.forEach(b => canvas.cellBindings.push(CellBinding.fromObject(b)));
        obj.annotationStrokes.forEach(b => canvas.annotationStrokes.push(Stroke.fromObject(b)));
        if (obj.imageBindings) obj.imageBindings.forEach(
            b => canvas.imageBindings.push(ImageBinding.fromObject(b)));
        return canvas;
    }

    function Timeline(points = []) {
        this.points = points;

        this.id = getUniqueId();
        this.color = "#000000"
        this.cellBindings = [];
        this.timePins = [];
        this.axisBindings = [];
        this.annotationStrokes = [];
        this.imageBindings = [];

        this.copy = function () {
            let timeline = new Timeline();
            // sometimes the x, y, points are not nessisarily plain objects (i.e. SVG point)
            // TODO: Should maybe make my own point object...
            timeline.points = this.points.map(p => Object.assign({}, { x: p.x, y: p.y }));

            timeline.id = this.id;
            timeline.color = this.color;
            timeline.cellBindings = this.cellBindings.map(b => b.copy());
            timeline.timePins = this.timePins.map(b => b.copy());
            timeline.axisBindings = this.axisBindings.map(b => b.copy());
            timeline.annotationStrokes = this.annotationStrokes.map(b => b.copy());
            timeline.imageBindings = this.imageBindings.map(b => b.copy());
            return timeline;
        }
    }
    Timeline.fromObject = function (obj) {
        let timeline = new Timeline(obj.points);
        timeline.id = obj.id;
        timeline.color = obj.color;
        obj.cellBindings.forEach(b => timeline.cellBindings.push(CellBinding.fromObject(b)));
        obj.timePins.forEach(b => timeline.timePins.push(TimePin.fromObject(b)));
        obj.axisBindings.forEach(b => timeline.axisBindings.push(AxisBinding.fromObject(b)));
        if (obj.annotationStrokes) obj.annotationStrokes.forEach(
            b => timeline.annotationStrokes.push(Stroke.fromObject(b)));
        if (obj.imageBindings) obj.imageBindings.forEach(
            b => timeline.imageBindings.push(ImageBinding.fromObject(b)));
        return timeline;
    }

    function CellBinding(cellId) {
        this.cellId = cellId;

        this.id = getUniqueId();
        this.color = null
        this.timePinId = null;

        // text display values
        this.offset = { x: 10, y: 10 };
        this.font = null;
        this.fontWeight = null;
        this.fontItalics = null;
        this.fontSize = 16;

        this.clone = function () {
            let binding = new CellBinding(this.cellId);
            binding.color = this.color;
            binding.offset = { x: this.offset.x, y: this.offset.y };
            binding.font = this.font;
            binding.fontWeight = this.fontWeight;
            binding.fontItalics = this.fontItalics;
            binding.fontSize = this.fontSize;
            binding.timePinId = this.timePinId;
            return binding;
        }

        this.copy = function () {
            let binding = new CellBinding(this.cellId);
            binding.id = this.id;
            binding.color = this.color;
            binding.offset = { x: this.offset.x, y: this.offset.y };
            binding.font = this.font;
            binding.fontWeight = this.fontWeight;
            binding.fontItalics = this.fontItalics;
            binding.fontSize = this.fontSize;
            binding.timePinId = this.timePinId;
            return binding;
        }
    }
    CellBinding.fromObject = function (obj) {
        let binding = new CellBinding(obj.cellId);
        binding.id = obj.id;
        binding.color = obj.color;
        binding.offset = { x: obj.offset.x, y: obj.offset.y };
        binding.font = obj.font;
        binding.fontWeight = obj.fontWeight;
        binding.fontItalics = obj.fontItalics;
        binding.fontSize = obj.fontSize ? obj.fontSize : 16;
        binding.timePinId = obj.timePinId;
        return binding;
    }

    function ImageBinding(imageData) {
        this.imageData = imageData;

        this.id = getUniqueId();
        this.offset = { x: 10, y: 10 };
        this.height = null;
        this.width = null;
        this.timeStamp = null;
        this.timePinId = null;

        this.copy = function () {
            let binding = new ImageBinding(this.imageData);
            binding.id = this.id;
            binding.offset = { x: this.offset.x, y: this.offset.y };
            binding.height = this.height;
            binding.width = this.width;
            binding.timeStamp = this.timeStamp;
            binding.timePinId = this.timePinId;
            return binding;
        }

    }
    ImageBinding.fromObject = function (obj) {
        let binding = new ImageBinding(obj.imageData);
        binding.id = obj.id;
        binding.offset = obj.offset;
        binding.height = obj.height;
        binding.width = obj.width;
        binding.timeStamp = obj.timeStamp;
        binding.timePinId = obj.timePinId;
        return binding;
    }


    /**
     * Time pins must have a line percent, but not necessarily anything else.
     * @param {float} linePercent 
     */
    function TimePin(linePercent) {
        this.linePercent = linePercent;

        this.id = getUniqueId();
        // Timestamp in miliseconds
        this.timeStamp = null;
        this.timePercent = null;
        this.color = "#000000"

        this.clone = function () {
            let binding = new TimePin(this.linePercent);
            binding.timeStamp = this.timeStamp;
            binding.timePercent = this.timePercent;
            binding.color = this.color;
            return binding;
        };

        this.copy = function () {
            let binding = new TimePin(this.linePercent);
            binding.id = this.id;
            binding.timeStamp = this.timeStamp;
            binding.timePercent = this.timePercent;
            binding.color = this.color;
            return binding;
        }
    }
    TimePin.fromObject = function (obj) {
        let binding = new TimePin(obj.linePercent);
        binding.id = obj.id;
        binding.timeStamp = obj.timeStamp;
        binding.timePercent = obj.timePercent;
        binding.color = obj.color;

        // for robustness in case a Date get into a time pin instead of a timestamp
        if (typeof binding.timeStamp === 'string' || binding.timeStamp instanceof String) {
            if (!isNaN(new Date(binding.timeStamp))) {
                binding.timeStamp = new Date(binding.timeStamp).getTime();
            } else if (!isNaN(new Date(parseInt(binding.timeStamp)))) {
                binding.timeStamp = new Date(parseInt(binding.timeStamp)).getTime();
            }
        }

        return binding;
    }

    // These are only for number sets now, but if we get 
    // another type (i.e. duration) might need a 'type' specifier. 
    function AxisBinding(columnId) {
        this.columnId = columnId;

        this.id = getUniqueId();
        this.val1 = 0;
        this.dist1 = 0;
        this.color1 = "#550000";
        this.val2 = 1;
        this.dist2 = 1;
        this.color2 = "#FF0000";
        this.style = DataDisplayStyles.POINTS;
        this.alignment = DataDisplayAlignments.DYNAMIC;
        this.linePercent = 1;
        this.clone = function () {
            let newAxis = new AxisBinding(this.columnId);
            newAxis.val1 = this.val1;
            newAxis.dist1 = this.dist1;
            newAxis.color1 = this.color1;
            newAxis.val2 = this.val2;
            newAxis.dist2 = this.dist2;
            newAxis.color2 = this.color2;
            newAxis.style = this.style;
            newAxis.alignment = this.alignment;
            newAxis.linePercent = this.linePercent;
            return newAxis;
        }

        this.copy = function () {
            let binding = new AxisBinding(this.columnId);
            binding.id = this.id;
            binding.val1 = this.val1;
            binding.dist1 = this.dist1;
            binding.color1 = this.color1;
            binding.val2 = this.val2;
            binding.dist2 = this.dist2;
            binding.color2 = this.color2;
            binding.style = this.style;
            binding.alignment = this.alignment;
            binding.linePercent = this.linePercent;
            return binding;
        }

        this.equals = function (other) {
            if (!other) return false;
            if (this.columnId != other.columnId) return false;
            if (this.linePercent != other.linePercent) return false;
            if (this.val1 != other.val1) return false;
            if (this.dist1 != other.dist1) return false;
            if (this.color1 != other.color1) return false;
            if (this.val2 != other.val2) return false;
            if (this.dist2 != other.dist2) return false;
            if (this.color2 != other.color2) return false;
            if (this.style != other.style) return false;
            if (this.alignment != other.alignment) return false;
        }
    }
    AxisBinding.fromObject = function (obj) {
        let binding = new AxisBinding(obj.columnId);
        binding.id = obj.id;
        binding.val1 = obj.val1;
        binding.dist1 = obj.dist1;
        binding.color1 = obj.color1;
        binding.val2 = obj.val2;
        binding.dist2 = obj.dist2;
        binding.color2 = obj.color2;
        binding.style = obj.style ? obj.style : DataDisplayStyles.POINTS;
        binding.alignment = obj.alignment ? obj.alignment : DataDisplayAlignments.DYNAMIC;
        binding.linePercent = obj.linePercent;
        return binding;
    }

    function DataTable(columns = []) {
        this.id = getUniqueId();
        this.dataRows = [];
        this.dataColumns = columns;

        this.getRow = (rowId) => this.dataRows.find(row => row.id == rowId);
        this.getColumn = (colId) => this.dataColumns.find(col => col.id == colId)

        this.copy = function () {
            let table = new DataTable();
            table.id = this.id;
            table.dataRows = this.dataRows.map(r => r.copy());
            table.dataColumns = this.dataColumns.map(c => c.copy());
            return table;
        }
    }
    DataTable.fromObject = function (obj) {
        let table = new DataTable();
        table.id = obj.id;
        obj.dataRows.forEach(r => table.dataRows.push(DataRow.fromObject(r)));
        obj.dataColumns.forEach(c => table.dataColumns.push(DataColumn.fromObject(c)));
        return table;
    }

    function DataColumn(name, index) {
        this.id = getUniqueId();
        this.name = name;
        this.index = index;

        this.copy = function () {
            let col = new DataColumn(this.name, this.index);
            col.id = this.id;
            return col;
        }
    }
    DataColumn.fromObject = function (obj) {
        let column = new DataColumn(obj.name, obj.index);
        column.id = obj.id;
        return column;
    }

    function DataRow() {
        this.id = getUniqueId();
        this.index = -1;
        this.dataCells = [];
        this.getCell = (columnId) => this.dataCells.find(cell => cell.columnId == columnId);

        this.copy = function () {
            let row = new DataRow();
            row.id = this.id;
            row.index = this.index;
            row.dataCells = this.dataCells.map(c => c.copy());
            return row;
        }
    }
    DataRow.fromObject = function (obj) {
        let row = new DataRow();
        row.id = obj.id;
        row.index = obj.index;
        obj.dataCells.forEach(c => {
            if (c.isTimeCell) {
                row.dataCells.push(TimeCell.fromObject(c));
            } else {
                row.dataCells.push(DataCell.fromObject(c));
            }
        });
        return row;
    }

    function TimeCell(val, columnId = null) {
        this.id = getUniqueId();
        // could be string or timestamp or just text
        this.val = val;
        this.columnId = columnId;
        this.isTimeCell = true;

        this.isValid = function () {
            return this.val && !isNaN(new Date(this.val)) || !isNaN(new Date(parseInt(this.val)));
        }

        this.getValue = function () {
            // if this isn't valid, return a string to display.
            if (!this.isValid()) {
                if (!this.val) {
                    return "";
                } else {
                    return this.val.toString();
                }
            } else if (!isNaN(new Date(this.val))) {
                return new Date(this.val).getTime();
            } else if (!isNaN(new Date(parseInt(this.val)))) {
                // we want the timestamp which is what we assume this is. 
                return parseInt(this.val);
            } else {
                console.error("Bad state!", this);
                return 0;
            }
        }

        this.toString = function () {
            if (!this.val) {
                return "";
            } else if (typeof this.val == "string") {
                return this.val;
            } else if (this.val instanceof Date) {
                return DataUtil.getFormattedDate(this.val);
            } else if (typeof this.val == 'number') {
                return DataUtil.getFormattedDate(new Date(this.val));
            }
        }

        this.copy = function () {
            // TODO: Make sure that val get copied properly. We'll worry about it later.
            let cell = new TimeCell(this.val, this.columnId);
            cell.id = this.id;
            return cell;
        }

        this.clone = function () {
            return new TimeCell(this.val, this.columnId);
        }
    }
    TimeCell.fromObject = function (obj) {
        let time = obj.val;
        let cell = new TimeCell(time, obj.columnId);
        cell.val = obj.val;
        cell.id = obj.id;
        return cell;
    }

    function DataCell(type, val, columnId) {
        this.type = type;
        this.val = val;
        this.columnId = columnId;

        this.id = getUniqueId();
        this.color = null;

        this.isValid = function () {
            switch (this.type) {
                case DataTypes.TEXT:
                    return true;
                case DataTypes.NUM:
                    if (DataUtil.isNumeric(this.val)) return true;
                    else return false;
                case DataTypes.UNSPECIFIED:
                    return true;
            }
        }

        this.getValue = function () {
            // if this isn't valid, return a string to display.
            if (!this.isValid()) return this.val.toString();

            switch (this.type) {
                case DataTypes.TEXT:
                    return this.val.toString();
                case DataTypes.NUM:
                    return parseFloat("" + this.val);
                case DataTypes.UNSPECIFIED:
                    return DataUtil.inferDataAndType(this.val).val;
            }
        }

        this.getType = function () {
            return this.type == DataTypes.UNSPECIFIED ? DataUtil.inferDataAndType(this.val).type : this.type;
        }

        this.toString = function () {
            if (typeof this.val == 'string') {
                return this.val;
            } if (typeof this.val == 'number') {
                return "" + Math.round(this.val * 100) / 100;
            } else {
                console.error("Invalid value type! ", this.val);
            }
        }

        this.copy = function () {
            // TODO: Make sure that val get copied properly. We'll worry about it later.
            let cell = new DataCell(this.type, this.val, this.columnId);
            cell.id = this.id;
            cell.color = this.color;
            return cell;
        }

        this.clone = function () {
            let cell = new DataCell(this.type, this.val, this.columnId);
            cell.color = this.color;
            return cell;
        }
    }
    DataCell.fromObject = function (obj) {
        let cell = new DataCell(obj.type, obj.val, obj.columnId, obj.color);
        cell.id = obj.id;
        cell.color = obj.color;
        return cell;
    }

    function Stroke(points, color, width) {
        if (!Array.isArray(points)) throw new Error("Invalid stroke array: " + points);

        this.points = points;
        this.color = color;
        this.width = width ? width : 1.5;

        this.id = getUniqueId();

        this.copy = function () {
            let stroke = new Stroke(this.points.map(p => p.copy()), this.color, this.width);
            stroke.id = this.id;
            return stroke;
        }

        this.equals = function (otherStroke) {
            if (this.id != otherStroke.id) return false;
            if (this.points.length != otherStroke.points.length) return false;
            if (this.color != otherStroke.color) return false;
            if (this.width != otherStroke.width) return false;
            for (let i = 0; i < this.points.length; i++) {
                if (this.points[i].timeStamp) {
                    if (this.points[i].timeStamp != otherStroke.points[i].timeStamp) return false;
                } else {
                    if (this.points[i].linePercent != otherStroke.points[i].linePercent) return false;
                }
                if (this.points[i].lineDist != otherStroke.points[i].lineDist) return false;
            }
            return true;
        }
    }
    Stroke.fromObject = function (obj) {
        let stroke = new Stroke(obj.points.map(p => StrokePoint.fromObject(p)), obj.color, obj.width);
        stroke.id = obj.id;
        return stroke;
    }

    function StrokePoint(lineDist) {
        this.lineDist = lineDist;

        this.timeStamp = null;
        this.timePercent = null;
        this.xValue = null;
        this.copy = function () {
            let point = new StrokePoint(this.lineDist);
            point.timeStamp = this.timeStamp;
            point.timePercent = this.timePercent;
            point.xValue = this.xValue;
            return point;
        }
    }
    StrokePoint.fromObject = function (obj) {
        let point = new StrokePoint(obj.lineDist);
        point.timeStamp = obj.timeStamp;
        point.timePercent = obj.timePercent;
        point.xValue = obj.xValue;
        return point;
    }

    return {
        Canvas,

        Timeline,
        DataTable,
        DataColumn,
        DataRow,
        TimeCell,
        DataCell,
        Stroke,
        StrokePoint,

        CellBinding,
        ImageBinding,
        AxisBinding,
        TimePin,
    }
}();

