"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var version_resolution_test_fixture_1 = require("version-repo/test/version-resolution-test-fixture");
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
var expect = chai.expect;
// REPO SPECIFIC IMPORTS
var http = require("http");
var https = require("https");
var version_repo_1 = require("version-repo");
var index_1 = require("../index");
var temp = require('temp').track();
//--------------------------------------------------
// just making sure teh fixture works as expected
//--------------------------------------------------
version_resolution_test_fixture_1.generate_version_resolution_tests({
    name: "Memory Repo",
    repo: new version_repo_1.MemoryRepo()
});
// ------------------------------------------------------------
// set up the instances to be tested
// ------------------------------------------------------------
//--------------------------------------------------
// backends populated via the fronend
//--------------------------------------------------
(function () {
    var dir = temp.mkdirSync();
    version_resolution_test_fixture_1.generate_version_resolution_tests({ name: "File Repo", repo: new index_1.FileRepo({ directory: dir }) });
})();
(function () {
    var dir = temp.mkdirSync();
    var fr = new index_1.FileRepo({ directory: dir });
    var tx = new version_repo_1.dTransform(fr, JSON.stringify, JSON.parse);
    version_resolution_test_fixture_1.generate_version_resolution_tests({ name: "File Repo with a transformer",
        repo: tx });
})();
(function () {
    var _backend = new version_repo_1.MemoryRepo();
    var app = build_app(_backend);
    var server = ('function' === typeof app) ? http.createServer(app) : app;
    var remote_repo = new index_1.RemoteRepo({ 'base_url': get_server_address(server), });
    version_resolution_test_fixture_1.generate_version_resolution_tests({ name: "Remote Repo (URL config)", repo: remote_repo });
})();
(function () {
    var _backend = new version_repo_1.MemoryRepo();
    var app = build_app(_backend);
    var remote_repo = new index_1.RemoteRepo({ 'app': app, base_url: "/my-repo" });
    version_resolution_test_fixture_1.generate_version_resolution_tests({ name: "Remote Repo (app config)", repo: remote_repo });
})();
(function () {
    var _backend = new version_repo_1.MemoryRepo();
    var app = build_app(_backend);
    var server = ('function' === typeof app) ? http.createServer(app) : app;
    var remote_repo = new index_1.RemoteRepo({ 'app': server, base_url: "/my-repo" });
    version_resolution_test_fixture_1.generate_version_resolution_tests({ name: "Remote Repo (server config)", repo: remote_repo });
})();
//--------------------------------------------------
// backends populated via the fronend
//--------------------------------------------------
(function () {
    var _backend = new version_repo_1.MemoryRepo();
    var app = build_app(_backend);
    var server = ('function' === typeof app) ? http.createServer(app) : app;
    var remote_repo = new index_1.RemoteRepo({ 'app': server, base_url: "/my-repo" });
    version_resolution_test_fixture_1.generate_version_resolution_tests({
        name: "Remote Repo (server config, backend loaded memory repo)",
        repo: remote_repo,
        backend: _backend
    });
})();
(function () {
    var dir = temp.mkdirSync();
    var _backend = new index_1.FileRepo({ directory: dir });
    var app = build_app(_backend);
    var server = ('function' === typeof app) ? http.createServer(app) : app;
    var remote_repo = new index_1.RemoteRepo({ 'app': server, base_url: "/my-repo" });
    version_resolution_test_fixture_1.generate_version_resolution_tests({
        name: "Remote Repo (server config, backend loaded file repo)",
        repo: remote_repo,
        backend: _backend
    });
})();
//--------------------------------------------------
// backends populated directly 
//--------------------------------------------------
(function () {
    var _backend = new version_repo_1.MemoryRepo();
    version_resolution_test_fixture_1.generate_version_resolution_tests({
        name: "Memory Repo with trivial async-transform",
        backend: _backend,
        repo: new version_repo_1.dTransform(_backend, (function (x) { return x; }), (function (x) { return x; }))
    });
})();
(function () {
    var _backend = new version_repo_1.MemoryRepo();
    version_resolution_test_fixture_1.generate_version_resolution_tests({
        name: "Memory Repo with trivial async-transform and buffer",
        backend: _backend,
        repo: new version_repo_1.ReadonlyBuffer(new version_repo_1.dTransform(_backend, (function (x) { return x; }), (function (x) { return x; })))
    });
})();
(function () {
    var _backend = new version_repo_1.MemoryRepo();
    version_resolution_test_fixture_1.generate_version_resolution_tests({
        name: "Memory Repo with trivial async-transform and ProcessedBuffer",
        backend: _backend,
        repo: new version_repo_1.ProcessedBuffer(new version_repo_1.dTransform(_backend, (function (x) { return x; }), (function (x) { return x; })), (function (x) { return x; }))
    });
})();
//--------------------------------------------------
// utility funcitons
//--------------------------------------------------
function build_app(backend) {
    if (backend === void 0) { backend = new version_repo_1.MemoryRepo(); }
    var http = require('http'), express = require('express'), app = express();
    // PARSER ROUTES
    app.use('/', function (req, res, next) {
        console.log('Processing route: ', req.method, req.originalUrl);
        next();
    });
    app.use('/my-repo', index_1.router({ repository: backend, }));
    app.use('/', function (req, res) {
        res.status(200).send('no such route');
    });
    // ----------------------------------------
    // error handling
    // ----------------------------------------
    app.use(function (err, req, res, next) {
        console.log('Error handling route: ', req.method, req.originalUrl);
        console.error(err.stack);
        if (res.headersSent) {
            return next(err);
        }
        res.status(500).send({ error: err.message });
    });
    return app;
}
;
function get_server_address(server) {
    var address = server.address();
    if (!address) {
        server.listen(0);
        address = server.address();
    }
    var protocol = (server instanceof https.Server) ? 'https:' : 'http:';
    var hostname = address.address;
    if (hostname === '0.0.0.0' || hostname === '::') {
        hostname = '127.0.0.1';
    }
    return protocol + '//' + hostname + ':' + address.port + '/my-repo';
}
//# sourceMappingURL=version-resolution-test.js.map