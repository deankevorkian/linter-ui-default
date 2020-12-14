"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applySolution = exports.sortSolutions = exports.sortMessages = exports.openExternally = exports.visitMessage = exports.openFile = exports.filterMessagesByRangeOrPoint = exports.filterMessages = exports.getEditorsMap = exports.getActiveTextEditor = exports.getPathOfMessage = exports.copySelection = exports.$file = exports.$range = exports.DOCK_DEFAULT_LOCATION = exports.DOCK_ALLOWED_LOCATIONS = exports.WORKSPACE_URI = exports.severityNames = exports.severityScore = void 0;
const atom_1 = require("atom");
const electron_1 = require("electron");
let lastPaneItem = null;
exports.severityScore = {
    error: 3,
    warning: 2,
    info: 1,
};
exports.severityNames = {
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
};
exports.WORKSPACE_URI = 'atom://linter-ui-default';
exports.DOCK_ALLOWED_LOCATIONS = ['center', 'bottom'];
exports.DOCK_DEFAULT_LOCATION = 'bottom';
function $range(message) {
    return message.location.position;
}
exports.$range = $range;
function $file(message) {
    return message.location.file;
}
exports.$file = $file;
function copySelection() {
    const selection = getSelection();
    if (selection) {
        atom.clipboard.write(selection.toString());
    }
}
exports.copySelection = copySelection;
function getPathOfMessage(message) {
    return atom.project.relativizePath($file(message) || '')[1];
}
exports.getPathOfMessage = getPathOfMessage;
function getActiveTextEditor() {
    let paneItem = atom.workspace.getCenter().getActivePaneItem();
    const paneIsTextEditor = atom.workspace.isTextEditor(paneItem);
    if (!paneIsTextEditor &&
        paneItem &&
        lastPaneItem &&
        paneItem.getURI &&
        paneItem.getURI() === exports.WORKSPACE_URI &&
        (!lastPaneItem.isAlive || lastPaneItem.isAlive())) {
        paneItem = lastPaneItem;
    }
    else {
        lastPaneItem = paneItem;
    }
    return atom.workspace.isTextEditor(paneItem) ? paneItem : null;
}
exports.getActiveTextEditor = getActiveTextEditor;
function getEditorsMap(editors) {
    const editorsMap = new Map();
    const filePaths = [];
    for (const entry of editors.editors) {
        const filePath = entry.textEditor.getPath();
        if (editorsMap.has(filePath)) {
            editorsMap.get(filePath).editors.push(entry);
        }
        else {
            editorsMap.set(filePath, {
                added: [],
                removed: [],
                editors: [entry],
            });
            filePaths.push(filePath);
        }
    }
    return { editorsMap, filePaths };
}
exports.getEditorsMap = getEditorsMap;
function filterMessages(messages, filePath, severity = null) {
    const filtered = [];
    messages.forEach(function (message) {
        if (!message || !message.location) {
            return;
        }
        if ((filePath === null || $file(message) === filePath) && (!severity || message.severity === severity)) {
            filtered.push(message);
        }
    });
    return filtered;
}
exports.filterMessages = filterMessages;
function filterMessagesByRangeOrPoint(messages, filePath, rangeOrPoint) {
    const filtered = [];
    const expectedRange = rangeOrPoint.constructor.name === 'Point'
        ? new atom_1.Range(rangeOrPoint, rangeOrPoint)
        : atom_1.Range.fromObject(rangeOrPoint);
    messages.forEach(function (message) {
        const file = $file(message);
        const range = $range(message);
        if (file &&
            range &&
            file === filePath &&
            typeof range.intersectsWith === 'function' &&
            range.intersectsWith(expectedRange)) {
            filtered.push(message);
        }
    });
    return filtered;
}
exports.filterMessagesByRangeOrPoint = filterMessagesByRangeOrPoint;
function openFile(file, position) {
    const options = { searchAllPanes: true };
    if (position) {
        options.initialLine = position.row;
        options.initialColumn = position.column;
    }
    atom.workspace.open(file, options);
}
exports.openFile = openFile;
function visitMessage(message, reference = false) {
    let messageFile;
    let messagePosition;
    if (reference) {
        if (!message.reference || !message.reference.file) {
            console.warn('[Linter-UI-Default] Message does not have a valid reference. Ignoring');
            return;
        }
        messageFile = message.reference.file;
        messagePosition = message.reference.position;
    }
    else {
        const messageRange = $range(message);
        messageFile = $file(message);
        if (messageRange) {
            messagePosition = messageRange.start;
        }
    }
    if (messageFile) {
        openFile(messageFile, messagePosition);
    }
}
exports.visitMessage = visitMessage;
function openExternally(message) {
    if (message.version === 2 && message.url) {
        electron_1.shell.openExternal(message.url);
    }
}
exports.openExternally = openExternally;
function sortMessages(sortInfo, rows) {
    const sortColumns = {};
    sortInfo.forEach(function (entry) {
        sortColumns[entry.column] = entry.type;
    });
    return rows.slice().sort(function (a, b) {
        if (sortColumns.severity) {
            const multiplyWith = sortColumns.severity === 'asc' ? 1 : -1;
            const severityA = exports.severityScore[a.severity];
            const severityB = exports.severityScore[b.severity];
            if (severityA !== severityB) {
                return multiplyWith * (severityA > severityB ? 1 : -1);
            }
        }
        if (sortColumns.linterName) {
            const multiplyWith = sortColumns.linterName === 'asc' ? 1 : -1;
            const sortValue = a.severity.localeCompare(b.severity);
            if (sortValue !== 0) {
                return multiplyWith * sortValue;
            }
        }
        if (sortColumns.file) {
            const multiplyWith = sortColumns.file === 'asc' ? 1 : -1;
            const fileA = getPathOfMessage(a);
            const fileALength = fileA.length;
            const fileB = getPathOfMessage(b);
            const fileBLength = fileB.length;
            if (fileALength !== fileBLength) {
                return multiplyWith * (fileALength > fileBLength ? 1 : -1);
            }
            else if (fileA !== fileB) {
                return multiplyWith * fileA.localeCompare(fileB);
            }
        }
        if (sortColumns.line) {
            const multiplyWith = sortColumns.line === 'asc' ? 1 : -1;
            const rangeA = $range(a);
            const rangeB = $range(b);
            if (rangeA && !rangeB) {
                return 1;
            }
            else if (rangeB && !rangeA) {
                return -1;
            }
            else if (rangeA && rangeB) {
                if (rangeA.start.row !== rangeB.start.row) {
                    return multiplyWith * (rangeA.start.row > rangeB.start.row ? 1 : -1);
                }
                if (rangeA.start.column !== rangeB.start.column) {
                    return multiplyWith * (rangeA.start.column > rangeB.start.column ? 1 : -1);
                }
            }
        }
        return 0;
    });
}
exports.sortMessages = sortMessages;
function sortSolutions(solutions) {
    return solutions.slice().sort(function (a, b) {
        return b.priority - a.priority;
    });
}
exports.sortSolutions = sortSolutions;
function applySolution(textEditor, solution) {
    if ('apply' in solution) {
        solution.apply();
        return true;
    }
    const range = solution.position;
    const replaceWith = solution.replaceWith;
    if ('currentText' in solution) {
        const currentText = solution.currentText;
        const textInRange = textEditor.getTextInBufferRange(range);
        if (currentText !== textInRange) {
            console.warn('[linter-ui-default] Not applying fix because text did not match the expected one', 'expected', currentText, 'but got', textInRange);
            return false;
        }
    }
    textEditor.setTextInBufferRange(range, replaceWith);
    return true;
}
exports.applySolution = applySolution;
//# sourceMappingURL=helpers.js.map