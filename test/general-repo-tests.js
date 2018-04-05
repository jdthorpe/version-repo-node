"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var general_repo_test_fixture_1 = require("version-repo/test/general-repo-test-fixture");
var chai = require("chai");
var temp = require("temp");
var http = require("http");
var https = require("https");
var should = chai.should(), expect = chai.expect;
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var repo = require("../index");
// ------------------------------------------------------------
// set up the instances to be tested
// ------------------------------------------------------------
//TODO: tests for object (json) as well as string reposotories.
//TODO: tests verifying that dependencies are updated and/or deleted with updates / upserts / deletes
var instances = [];
instances.push({ name: "Memory Repo",
    repo: new repo.MemoryRepo() });
instances.push({ name: "Memory Repo with trivial transform",
    repo: new repo.sTransform(new repo.MemoryRepo(), (function (x) { return x; }), (function (x) { return x; })) });
instances.push({ name: "Memory Repo with trivial async-transform",
    repo: new repo.dTransform(new repo.MemoryRepo(), (function (x) { return x; }), (function (x) { return x; })) });
(function () {
    var dir = temp.mkdirSync();
    instances.push({ name: "File Repo", repo: new repo.FileRepo({ directory: dir }) });
})();
(function () {
    var dir = temp.mkdirSync();
    var fr = new repo.FileRepo({ directory: dir });
    var tx = new repo.dTransform(fr, JSON.stringify, JSON.parse);
    instances.push({ name: "File Repo with a transformer",
        repo: tx });
})();
function build_app() {
    var http = require('http'), express = require('express'), app = express(), parser_repo = new repo.MemoryRepo();
    // PARSER ROUTES
    app.use('/', function (req, res, next) {
        console.log('Processing route: ', req.method, req.originalUrl);
        next();
    });
    app.use('/my-repo', repo.router({ repository: parser_repo, }));
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
(function () {
    var app = build_app();
    var server = ('function' === typeof app) ? http.createServer(app) : app;
    var remote_repo = new repo.RemoteRepo({ 'base_url': get_server_address(server), });
    instances.push({ name: "Remote Repo (URL config)", repo: remote_repo });
})();
(function () {
    var app = build_app();
    var remote_repo = new repo.RemoteRepo({ 'app': app, base_url: "/my-repo" });
    instances.push({ name: "Remote Repo (app config)", repo: remote_repo });
})();
(function () {
    var app = build_app();
    var server = ('function' === typeof app) ? http.createServer(app) : app;
    var remote_repo = new repo.RemoteRepo({ 'app': server, base_url: "/my-repo" });
    instances.push({ name: "Remote Repo (server config)", repo: remote_repo });
})();
instances.map(function (inst) { return general_repo_test_fixture_1.generate_tests(inst); });
// ------------------------------------------------------------
// ------------------------------------------------------------
/*

instances.map(inst => {

    const repo = inst.repo;

    describe(inst.name, function() {

        it('GET / (`packages()`) should return an empty list',function() {
            return Promise.resolve(repo.packages())
                .should.eventually.be.instanceof(Array).and.have.property('length',0);
        });

        it('POST(create) should require a version',function() {
            var request:Promise<any>;
            try{
                request = Promise.resolve(repo.create(<resource_data<any>>{name:'foo'}));
            }
            catch(err){
                request = Promise.reject(err);
            }
            return request.should.eventually.be.rejectedWith( Error, "missing required value options.version");
        });

        it('POST(create) should create a library',function() {
            return Promise.resolve(repo.create({name:'foo',version:'v1.1.1',value:'Lorem Ipsum dolor sit amet, ...'}))
                .should.eventually.equal(true);
        });

        it('POST(create) should create a library',function() {
            // FOR TESTING THE READ ONLY BUFFER
            return Promise.resolve(repo.create({name:'bar',version:'v1.1.1',value:'Lorem Ipsum dolor sit amet, ...'}))
                .should.eventually.equal(true);
        });

        it('versions(name) return an array',function() {
            // FOR TESTING THE READ ONLY BUFFER
            return Promise.resolve(repo.versions('bar')).then(x => {
                (typeof x).should.equal('object');
                expect(Array.isArray(x)).to.be.true;
                expect(x.indexOf("1.1.1")).to.not.equal(-1);
                expect(x.length).to.equal(1);
            });
        });

        it('versions() return a dictionary',function() {
            // FOR TESTING THE READ ONLY BUFFER
            return Promise.resolve(repo.versions()).then(x => {
                (typeof x).should.equal('object');
                expect(Array.isArray(x)).to.be.false;
                expect(x.hasOwnProperty('foo')).to.be.true;
                x.foo.should.deep.equal(['1.1.1']);
            });
        });

        it('POST(create) should not create a library twice',function() {

            var request:Promise<any>;
            try{
                request = Promise.resolve(repo.create({name:'foo',version:'v1.1.1',value: 'Lorem Ipsum dolor sit amet, ...'}));
            }
            catch(err){
                request = Promise.reject(err);
            }
            return request.should.eventually.be.rejectedWith( Error, "Version (1.1.1) does not exceed the latest version (1.1.1)");
        });

        it('POST(create) should not create a previous version',function() {

            var request:Promise<any>;
            try{
                request = Promise.resolve(repo.create({name:'foo',version:'v1.1.0',value:'Lorem Ipsum dolor sit amet, ...'}));
            }
            catch(err){
                request = Promise.reject(err);
            }
            return request.should.eventually.be.rejectedWith( Error, "Version (1.1.0) does not exceed the latest version (1.1.1)");

        });

        it('fetchOne() should get the library',function() {
            return Promise.resolve(repo.fetchOne({name:'foo',version:'v1.1.1'}))
                .should.eventually.deep.equal( { name: 'foo', version: '1.1.1', value: 'Lorem Ipsum dolor sit amet, ...' }) ;
        });


        it('POST(create) should create a library with a dependency',function() {
            // FOR TESTING THE READ ONLY BUFFER
            return Promise.resolve(repo.create({name:'bar',version:'v1.1.2',value:'Lorem Ipsum dolor sit amet, ...',depends:{"foo":"~1.0.0"}}))
                .should.eventually.equal(true);
        });

        it('fetchOne() should get the library',function() {
            return Promise.resolve(repo.fetchOne({name:'bar',version:'v1.1.2'}))
                .should.eventually.deep.equal( {name:'bar',version:'1.1.2',value:'Lorem Ipsum dolor sit amet, ...',depends:{"foo":"~1.0.0"}}) ;
        });

        it('fetchOne(...,{novalue:true}) should get the library dependency only ',function() {
            return Promise.resolve(repo.fetchOne({name:'bar',version:'v1.1.2'},{novalue:true}))
                .should.eventually.deep.equal( {name:'bar',version:'1.1.2',depends:{"foo":"~1.0.0"}}) ;
        });

        it('`var x = repo.fetchOne(); x.depends = "foo";` should not modify the dependencies in the repo',function() {
            // setup:
            return Promise.resolve(repo.fetchOne({name:'bar',version:'v1.1.2'}))
                            .then(x =>
                                {
                                    x.depends = {"bar":"1.2.3"};
                                    return repo.fetchOne({name:'bar',version:'v1.1.2'})
                                })
                .should.eventually.deep.equal( {name:'bar',version:'1.1.2',value:'Lorem Ipsum dolor sit amet, ...',depends:{"foo":"~1.0.0"}}) ;
        });


        it('`var x = repo.fetchOne(); x.value = "bar";` should not modify the values in the repo',function() {
            return Promise.resolve(repo.fetchOne({name:'bar',version:'v1.1.2'}))
                            .then(x => {
                                // setup:
                                x.value = {"bar":"1.2.3"}
                                // test:
                                return repo.fetchOne({name:'bar',version:'v1.1.2'})
                            })
                .should.eventually.deep.equal( {name:'bar',version:'1.1.2',value:'Lorem Ipsum dolor sit amet, ...',depends:{"foo":"~1.0.0"}}) ;
        });


        it('PUT(updtate) should require a version',function() {

            var request:Promise<any>;
            try{
                request = Promise.resolve(repo.update(<resource_data<any>>{name:'foo'}));
            }
            catch(err){
                request = Promise.reject(err);
            }
            return request.should.eventually.be.rejectedWith( Error, "missing required value options.version");
        });

        it('put(updtate) should overwrite the library and dependencies',function() {
            return Promise.resolve(repo.update({name:'foo',version:'v1.1.1',value:'hi there',depends:{"bat":"~1.4.7"}}))
                .should.eventually.equal(true);
        });

        it('GET(fetch) should get the updated library and dependencies',function() {
            return Promise.resolve(repo.fetchOne({name:'foo',version:'v1.1.1'}))
                .should.eventually.deep.equal( { name: 'foo', version: '1.1.1', value: 'hi there' ,depends:{"bat":"~1.4.7"}}) ;
        });

        it('GET(fetch) should not require the version number',function() {
            return Promise.resolve(repo.fetchOne({name:'foo'}))
                .should.eventually.deep.equal( { name: 'foo', version: '1.1.1', value: 'hi there' ,depends:{"bat":"~1.4.7"}}) ;
        });

        it('put(updtate) should overwrite the library and dependencies',function() {
            return Promise.resolve(repo.update({name:'foo',version:'v1.1.1',value:'Hi World!'}))
                .should.eventually.equal(true);
        });


        it('GET(fetch) should not require the version number (AGAIN)',function() {
            return Promise.resolve(repo.fetchOne({name:'foo'}))
                .should.eventually.deep.equal( { name: 'foo', version: '1.1.1', value: 'Hi World!' }) ;
        });


        it('GET "/" (`packages()`) should return the list of libraries',function() {
            return Promise.resolve(repo.packages()).then(x => x.sort())
                .should.eventually.be.instanceof(Array).and.deep.equal(['foo','bar'].sort()) ;
        });

        it('DELETE /foo should require a version.',function() {

            var request:Promise<any>;
            try{
                request = Promise.resolve(repo.del({name:'foo'}));
            }
            catch(err){
                request = Promise.reject(err);
            }
            return request.should.eventually.be.rejectedWith( Error, "missing required value options.version");
        });

        it('DELETE /foo not fail',function() {
            return Promise.resolve(repo.del({name:'foo',version:'1.1.1'}))
                .should.eventually.to.be.true;
        });

        it('GET "/" (`packages()`) should return the list of libraries',function() {
            return Promise.resolve(repo.packages())
                .should.eventually.be.instanceof(Array).and.deep.equal(['bar']) ;
        });

    })
})


*/
//# sourceMappingURL=general-repo-tests.js.map