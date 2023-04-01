let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;
let should = chai.should();

let fs = require('fs');

describe('Analysis function tests', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment(true);
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('conversion tests', function () {
        it('will convert version to json', async function () {
            integrationEnv.mainInit();
            let callCount = 0;

            let contents = fs.readFileSync(__dirname + "/test_viz_1.json", "utf-8");
            let filecontents = {
                "0.json": contents,
                "1.json": contents,
                "2.json": contents,
            }

            let obj = JSON.parse(contents);
            let imageDataLength = obj.canvas.imageBindings
                .concat(obj.timelines
                    .map(t => t.imageBindings)
                    .flat()).map(b => b.imageData).join("").length;

            let directoryHandle = {
                getFileHandle: async (name, options) => {
                    lastname = name;
                    if (name == "workspaceData.json" && !filecontents["workspaceData.json"] && (!options || !options.create)) {
                        throw new Error("file or directory could not be found");
                    } else {
                        return fileHandle
                    }
                },
                getDirectoryHandle: async (name) => {
                    if (name == "version") return versionDirectory;
                    if (name == "images") return imageDirectory;
                    if (name == "trace") return traceDirectory;
                },
            }
            let lastname;
            let versionDirectory = {
                values: () => Object.keys(filecontents).map(name => { return { name } }),
                getFileHandle: (name) => {
                    if (name == "3.json") throw new Error("file or directory could not be found");
                    lastname = name;
                    return fileHandle;
                }
            }

            let fileHandle = {
                getFile: async () => file,
                createWritable: async () => writable,
            }
            let file = { text: async () => filecontents[lastname] };
            let writable = { write: async (text) => { filecontents[lastname] = text }, close: async () => { callCount++ } }

            let lastImageName;
            let imageDirectory = {
                getFileHandle: (name) => {
                    lastImageName = name;
                    return imageFileHandle;
                },
                values: () => [],
            }
            let imageFileHandle = {
                getFile: async () => imageFile,
                createWritable: async () => imageWritable,
            }
            let images = {};
            let imageFile = { text: async () => { return images[lastImageName] } }
            let imageWritable = { write: async (text) => { images[lastImageName] = text }, close: async () => { } }

            let traces = {};
            let traceDirectory = {
                getDirectoryHandle: (name) => traceDirectory,
                getFileHandle: (name) => {
                    lastTraceName = name;
                    return traceFileHandle;
                }
            }
            let traceFileHandle = { createWritable: async () => traceWritable, }
            let traceWritable = { write: async (text) => { traces[lastTraceName] = text }, close: async () => { } }

            integrationEnv.enviromentVariables.window.directory = directoryHandle;
            await integrationEnv.enviromentVariables.$.selectors['#upload-button-folder'].eventCallbacks.click();

            assert.equal(callCount, 4)

            expect(Object.keys(images)).to.eql(["-529222296.json", "-54930653.json", "209152756.json"]);

            await integrationEnv.enviromentVariables.$.selectors['#extra-versioning-to-json'].eventCallbacks.click();

            expect(Object.keys(traces)).to.eql(['0.json', '1.json', '2.json']);

            let result = JSON.parse(traces["2.json"])
            let imageBindings = result.canvas.imageBindings
                .concat(result.timelines
                    .map(t => t.imageBindings)
                    .flat());
            expect(imageBindings.map(b => b.imageData).join("").length).to.eql(imageDataLength);
            expect(imageBindings.map(b => b.hash)).to.eql([-529222296, -54930653, 209152756]);
        });
    });


    describe('workspace viz creation tests', async function () {
        it('should create a viz', async function () {
            integrationEnv.mainInit();
            let callCount = 0;

            let contents = fs.readFileSync(__dirname + "/test_log.csv", "utf-8");
            let filecontents = {
                "workspaceData.json": '{"workspaceVersion":1}',
                "log.csv": contents
            }

            let lastname;
            let fileHandle = {
                getFile: async () => file,
                createWritable: async () => writable,
            }
            let file = { text: async () => filecontents[lastname] };
            let writable = { write: async (text) => { filecontents[lastname] = text }, close: async () => { callCount++ } }

            let directoryHandle = {
                getFileHandle: async (name, options) => {
                    lastname = name;
                    if (name == "workspaceData.json" && !filecontents["workspaceData.json"] && (!options || !options.create)) {
                        throw new Error("file or directory could not be found");
                    } else {
                        return fileHandle
                    }
                },
                getDirectoryHandle: async () => {
                    return directoryHandle;
                },
                values: () => Object.keys(filecontents).map(name => { return { name } }),
            }

            integrationEnv.enviromentVariables.window.directory = directoryHandle;
            await integrationEnv.enviromentVariables.$.selectors['#create-workspace-viz'].eventCallbacks.click();


        });
    });
});