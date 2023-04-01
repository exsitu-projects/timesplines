function DataTableController() {
    let mTableUpdatedCallback = (table, changeType, extraData) => { };
    let mSelectionCallback = (yTop, yBottom, isFirstColOnly) => { };
    let mDeselectionCallback = () => { };
    let mShouldDeselectCallback = () => { return true; }

    let mSelection = null;

    let mJSpreadsheetTables = {};
    let mDataTables = {};

    let mHighlightCells = {};

    let mIsPasting = false;
    let mUpdatedCells = [];

    function updateModel(model) {
        let scrollTop = $("#table-list").scrollTop()
        $("#table-list").empty();

        model.getAllTables().forEach(table => {
            mDataTables[table.id] = table;

            let tableDiv = $("<div>")
                .attr("id", "table_" + table.id)
                .attr("table-id", table.id);
            $("#table-list").append(tableDiv)
            $("#table-list").append($("<br>"))

            var data = getTextArray(table);
            let columns = table.dataColumns.map(col => {
                return { type: 'text', title: col.name, width: 200 };
            })
            mJSpreadsheetTables[table.id] = jspreadsheet(tableDiv[0], {
                data,
                columns,
                columnDrag: true,
                // Event handlers
                oninsertrow,
                oninsertcolumn,
                ondeleterow,
                onmoverow,
                ondeletecolumn,
                onmovecolumn,
                onbeforedeletecolumn,
                onbeforeinsertcolumn,
                onselection,
                onblur,
                onsort,
                onchange,
                onchangeheader,
                onpaste,
                onbeforepaste,
                // styling
                updateTable,
            });
        })

        $("#table-list").scrollTop(scrollTop)
    }

    function oninsertrow(instance, startIndex, numberOfRows, cells, insertBefore) {
        let tableId = $(instance).attr("table-id");

        if (!insertBefore) startIndex++;

        mDataTables[tableId].dataRows.forEach(row => {
            if (row.index >= startIndex) row.index += numberOfRows;
        })

        let newRows = [];
        for (let i = 0; i < numberOfRows; i++) {
            let newRow = new DataStructs.DataRow();
            mDataTables[tableId].dataColumns.forEach(column => {
                if (column.index == 0) {
                    newRow.dataCells.push(new DataStructs.TimeCell("", column.id));
                } else {
                    newRow.dataCells.push(new DataStructs.DataCell(DataTypes.UNSPECIFIED, "", column.id));
                }
            });
            newRow.index = startIndex + i;
            mDataTables[tableId].dataRows.push(newRow);
            newRows.push(newRow.id);
        }

        if (!mIsPasting) {
            mTableUpdatedCallback(mDataTables[tableId], TableChange.CREATE_ROWS, newRows);
        }
    }

    function ondeleterow(instance, index, amount) {
        let tableId = $(instance).attr("table-id");

        let removedRows = mDataTables[tableId].dataRows.filter(row => row.index >= index && row.index < index + amount).map(row => row.id);

        mDataTables[tableId].dataRows = mDataTables[tableId].dataRows.filter(row => row.index < index || row.index >= index + amount);

        mDataTables[tableId].dataRows.forEach(row => {
            if (row.index > index) row.index -= amount;
        });

        mTableUpdatedCallback(mDataTables[tableId], TableChange.DELETE_ROWS, removedRows);
    }

    function onmoverow(instance, fromIndex, toIndex) {
        let tableId = $(instance).attr("table-id");

        fromIndex = parseInt(fromIndex);
        toIndex = parseInt(toIndex);

        mDataTables[tableId].dataRows.forEach(row => {
            if (row.index == fromIndex) {
                row.index = toIndex;
            } else if (row.index > fromIndex && row.index <= toIndex) {
                row.index--;
            } else if (row.index < fromIndex && row.index >= toIndex) {
                row.index++;
            }
        })

        mTableUpdatedCallback(mDataTables[tableId], TableChange.REORDER_ROWS);
    }

    function oninsertcolumn(instance, startIndex, numberOfCols, cells, insertBefore) {
        let tableId = $(instance).attr("table-id");

        if (!insertBefore) startIndex++;

        mDataTables[tableId].dataColumns.forEach(col => {
            if (col.index >= startIndex) col.index += numberOfCols;
        })

        let newCols = [];
        for (let i = 0; i < numberOfCols; i++) {
            let newCol = new DataStructs.DataColumn("", startIndex + i);
            mDataTables[tableId].dataRows.forEach(row => row.dataCells.push(new DataStructs.DataCell(DataTypes.UNSPECIFIED, "", newCol.id)));
            mDataTables[tableId].dataColumns.push(newCol);
            newCols.push(newCol.id);
        }

        if (!mIsPasting) {
            mTableUpdatedCallback(mDataTables[tableId], TableChange.CREATE_COLUMNS, newCols)
        }
    }

    function ondeletecolumn(instance, index, amount) {
        let tableId = $(instance).attr("table-id");

        let removedColumns = mDataTables[tableId].dataColumns.filter(col => col.index >= index && col.index < index + amount).map(col => col.id);
        mDataTables[tableId].dataColumns = mDataTables[tableId].dataColumns.filter(col => col.index < index || col.index >= index + amount);

        mDataTables[tableId].dataColumns.forEach(col => {
            if (col.index > index) col.index -= amount;
        })

        mDataTables[tableId].dataRows.forEach(row => {
            row.dataCells = row.dataCells.filter(cell => !removedColumns.includes(cell.columnId));
        });

        mTableUpdatedCallback(mDataTables[tableId], TableChange.DELETE_COLUMNS, removedColumns)
    }

    function onmovecolumn(instance, fromIndex, toIndex) {
        if (fromIndex == 0 || (toIndex == 0 && fromIndex == 1)) {
            mJSpreadsheetTables.setData(getTextArray(mDataTables[tableId]));
            return;
        } else if (toIndex == 0) {
            toIndex = 1;
        }

        fromIndex = parseInt(fromIndex);
        toIndex = parseInt(toIndex);

        let tableId = $(instance).attr("table-id");

        mDataTables[tableId].dataColumns.forEach(col => {
            if (col.index == fromIndex) {
                col.index = toIndex;
            } else if (col.index > fromIndex && col.index <= toIndex) {
                col.index--;
            } else if (col.index < fromIndex && col.index >= toIndex) {
                col.index++;
            }
        })

        mTableUpdatedCallback(mDataTables[tableId], TableChange.REORDER_COLUMNS);
    }

    function onbeforedeletecolumn(instance, index, count) {
        if (index == 0) {
            return false;
        }
        return true;
    }

    function onbeforeinsertcolumn(instance, index, count, insertBefore) {
        if (index == 0 && insertBefore) {
            return false;
        }
        return true;
    }

    function onselection(instance, col1, row1, col2, row2) {
        let tableId = $(instance).attr("table-id");

        let topRight = mJSpreadsheetTables[tableId].getCell(jspreadsheet.getColumnNameFromId([col1, row1]));
        let selectionTop = topRight.getBoundingClientRect().top;
        let bottomRight = mJSpreadsheetTables[tableId].getCell(jspreadsheet.getColumnNameFromId([col1, row2]));
        let selectionBottom = bottomRight.getBoundingClientRect().bottom;

        mSelection = { tableId, col1, row1, col2, row2 }
        mSelectionCallback(selectionTop, selectionBottom, col1 == 0 && col2 == 0)
    }

    function onblur() {
        if (mSelection) {
            if (mShouldDeselectCallback()) {
                mSelection = null;
                mDeselectionCallback();
            } else {
                mJSpreadsheetTables[mSelection.tableId]
                    .updateSelectionFromCoords(mSelection.col1, mSelection.row1, mSelection.col2, mSelection.row2)
            }
        }
    }

    function onsort(instance, columnIndex, order) {
        let tableId = $(instance).attr("table-id");
        let columnId = mDataTables[tableId].dataColumns.find(col => col.index == columnIndex).id;
        order = order ? 1 : -1;

        mDataTables[tableId].dataRows.sort((rowA, rowB) => {
            let returnable = 0;
            let cellA = rowA.getCell(columnId);
            let cellB = rowB.getCell(columnId);

            if ((cellA.isTimeCell && !cellB.isTimeCell) || (!cellA.isTimeCell && cellB.isTimeCell)) {
                console.error("Bad state! TimeCell in non-time row or non-time cell in time row", cellA, cellB);
                return 0;
            }

            if (cellA.isTimeCell) {
                if (cellA.isValid() && cellB.isValid()) {
                    returnable = (cellA.getValue() - cellB.getValue()) / Math.abs(cellA.getValue() - cellB.getValue());
                } else if (cellA.isValid() && !cellB.isValid()) {
                    // a goes before b
                    returnable = -1;
                } else if (!cellA.isValid() && cellB.isValid()) {
                    // a goes after b
                    returnable = 1;
                } else if (!cellA.isValid() && !cellB.isValid()) {
                    returnable = cellA.getValue() == cellB.getValue() ? 0 : (cellA.getValue() < cellB.getValue() ? -1 : 1);
                }
            } else {
                let typeA = cellA.getType();
                let typeB = cellB.getType();

                if (typeA != typeB) {
                    if (typeA == DataTypes.NUM) {
                        // a goes before b
                        returnable = -1;
                    } else if (typeB == DataTypes.NUM) {
                        // a goes after b
                        returnable = 1;
                    } else { console.error("Unhandled case!"); return 0; }
                } else {
                    returnable = DataUtil.AGreaterThanB(cellA.getValue(), cellB.getValue(), typeA) ? 1 : -1;
                }
            }

            return returnable * order;
        });

        mDataTables[tableId].dataRows.forEach((row, index) => {
            row.index = index;
        });

        mTableUpdatedCallback(mDataTables[tableId], TableChange.REORDER_ROWS);
        mJSpreadsheetTables[tableId].setData(getTextArray(mDataTables[tableId]));

        return false;
    }

    function onchange(instance, cellInstance, col, row, newValue, oldValue) {
        let tableId = $(instance).attr("table-id");

        let colIndex = parseInt(col);
        let rowIndex = parseInt(row);

        let columnId = mDataTables[tableId].dataColumns.find(col => col.index == colIndex).id;
        let cell = mDataTables[tableId].dataRows.find(r => r.index == rowIndex).getCell(columnId);
        cell.val = newValue;

        if (mIsPasting) {
            mUpdatedCells.push(cell.id)
        } else {
            mTableUpdatedCallback(mDataTables[tableId], TableChange.UPDATE_CELLS, [cell.id]);
        }
    }

    function onchangeheader() {
        console.log("IMPLIMENT ME!", arguments, "onchangeheader")
    }

    function onbeforepaste() {
        mIsPasting = true;
    }

    function onpaste(instance) {
        let tableId = $(instance).attr("table-id");
        mTableUpdatedCallback(mDataTables[tableId], TableChange.UPDATE_CELLS, mUpdatedCells);
        mIsPasting = false;
        mUpdatedCells = [];
    }

    function updateTable(instance, cell, col, row, val, label, cellName) {
        let tableId = $(instance).attr("table-id");
        if (mHighlightCells && Object.keys(mHighlightCells).length > 0) {
            if (mHighlightCells[tableId] &&
                mHighlightCells[tableId][col] &&
                mHighlightCells[tableId][col][row]) {
                $(cell).css("filter", '');
            } else {
                $(cell).css("filter", 'brightness(85%) contrast(0.85) opacity(0.5)');
            }
        } else {
            $(cell).css("filter", '');
        }
    }

    function getSelectedCells() {
        let data = [];
        if (mSelection) {
            let table = mDataTables[mSelection.tableId];
            for (let col = mSelection.col1; col <= mSelection.col2; col++) {
                let columnId = table.dataColumns.find(c => c.index == col).id;
                for (let row = mSelection.row1; row <= mSelection.row2; row++) {
                    let dataRow = table.dataRows.find(r => r.index == row);
                    let cellId = dataRow.getCell(columnId).id;
                    data.push(new DataStructs.CellBinding(cellId));
                }
            }
        }
        return data;
    }

    function highlightCells(data) {
        // Do this async to avoid siezing up the system.
        mHighlightCells = data;
        let promise = Promise.resolve();
        Object.values(mJSpreadsheetTables).forEach(table => {
            promise.then(() => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        table.updateTable();
                        resolve();
                    }, 1);
                })
            })
        })
    }

    function deselectCells() {
        if (mSelection) {
            mJSpreadsheetTables[mSelection.tableId].resetSelection();
            mSelection = null;
        }
    }

    // this functions takes complex data types and simplifies them for table display
    function getTextArray(table) {
        let arr2D = Array(table.dataRows.length).fill(0).map(i => Array(table.dataColumns.length));

        table.dataRows.forEach(row => row.dataCells.forEach(cell => {
            let column = table.getColumn(cell.columnId);
            if (!column) {
                console.error("Column missing!")
            } else {
                arr2D[row.index][column.index] = cell.toString();
            }
        }))

        return arr2D;
    }

    this.updateModel = updateModel;

    this.highlightCells = highlightCells;
    this.deselectCells = deselectCells;

    this.getSelectedCells = getSelectedCells;
    this.setOnSelectionCallback = (callback) => mSelectionCallback = callback;
    this.setOnDeselectionCallback = (callback) => mDeselectionCallback = callback;
    this.setTableUpdatedCallback = (callback) => mTableUpdatedCallback = callback;
    this.setShouldDeselectCallback = (callback) => mShouldDeselectCallback = callback;
}