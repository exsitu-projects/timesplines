let chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;
let should = chai.should();

let fs = require('fs');

describe('Test Main - Integration Test', function () {
    let integrationEnv;
    beforeEach(function () {
        integrationEnv = TestUtils.getIntegrationEnviroment();
    });

    afterEach(function (done) {
        integrationEnv.cleanup(done);
    });

    describe('Workspace Update Tests', function () {
        it('will update workspace from v0 to v1', async function () {
            integrationEnv.mainInit();
            let callCount = 0;

            let contents = fs.readFileSync(__dirname + "/test_viz_1.json", "utf-8");
            let filecontents = {
                "0.json": JSON.parse(JSON.stringify(contents)),
                "1.json": JSON.parse(JSON.stringify(contents)),
                "2.json": JSON.parse(JSON.stringify(contents)),
            }

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

            integrationEnv.enviromentVariables.window.directory = directoryHandle;
            await integrationEnv.enviromentVariables.$.selectors['#upload-button-folder'].eventCallbacks.click();

            assert.equal(callCount, 4)

            let result = JSON.parse(filecontents["2.json"])
            let imageBindings = result.canvas.imageBindings
                .concat(result.timelines
                    .map(t => t.imageBindings)
                    .flat());

            expect(imageBindings.map(b => b.imageData)).to.eql(['hashed', 'hashed', 'hashed']);
            expect(imageBindings.map(b => b.hash)).to.eql([-529222296, -54930653, 209152756]);
            expect(Object.keys(images)).to.eql(["-529222296.json", "-54930653.json", "209152756.json"]);
        });
    });
});