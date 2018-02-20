// <reference path="../typings/node/node.d.ts" />
// <reference path="../typings/chai/chai.d.ts" />
// <reference path="../typings/chai-as-promised/chai-as-promised.d.ts" />
// <reference path="../typings/promises-a-plus/promises-a-plus.d.ts" />
// <reference path="../bower_components/dt-mocha/mocha.d.ts" />

//-- var fs = require('fs'),
//--     path = require('path'),
//--     PEG = require('pegjs'),
//--     _ = require('lodash'),
//--     expect = require('chai').expect,
//--     sh = require('chai').should(),
//--     root, grammar_text, parser_code, p;
//-- 
//-- //__dirname =  process.cwd()
//-- parser_code = PEG.buildParser( fs.readFileSync(path.join(__dirname,'arithmatic.pegjs'), {'encoding':'utf8'}), {output:'source',trace:true})// ,trace:true
//-- p = eval(parser_code)

import chai = require('chai');
import chaiHttp = require('chai-http');
var chaiAsPromised = require("chai-as-promised"),
    should = chai.should(),
    expect = chai.expect;
chai.use(chaiHttp);
chai.use(chaiAsPromised);

// configure the Q library
import Q = require('q');
Q.longStackSupport = true;

// ------------------------------------------------------------
// ------------------------------------------------------------
// START OF FORMER ../src/app.ts
// START OF FORMER ../src/app.ts
// ------------------------------------------------------------
// ------------------------------------------------------------

//-- var package_routes = require('./routes/package'),
var repo = require('../index'),
    https = require('https'),
    http = require('http'),
    express = require('express'),
    app = express();

// NOTE THAT THE FOLLOWING IS NOT ITEMPOTENT
//-- var multer = require('multer'); // v1.0.5
//-- var upload = multer(); // for parsing multipart/form-data
//-- app.use('/',upload.array())
//-- 
//-- var bodyParser = require('body-parser');
//-- app.use(bodyParser.json({limit:'1mb'})); // for parsing application/json
//-- app.use(bodyParser.urlencoded({ limit:'1mb',extended: true })); // for parsing application/x-www-form-urlencoded

// ------------------------------
// set up the routes
// ------------------------------

//-- app.use('/',function(req,res,next){
//--     console.log("req.body: ",(req.body));
//--     console.log("request type: ",typeof req.body);
//--     console.log("request.hasOwnProperty type: ",typeof req.body.hasOwnProperty);
//-- //--     console.log("request size: "+sizeof(req.body));
//--     next()
//-- });

app.use('/',function(req,res,next){
    console.log('Processing route: ',req.method,req.originalUrl);
    next()
});

// BUILD THE REPOSITORIES
var temp = require('temp'),
    dir_1 = temp.mkdirSync(),
    dir_2 = temp.mkdirSync(),
    package_repo = new repo.FileRepo({directory:dir_1}),
    package_version_repo = new repo.FileRepo({directory:dir_2}),
    parser_repo  = new repo.MemoryRepo(),
    parser_version_repo  = new repo.MemoryRepo();

// PACKAGE ROUTES
app.use('/package',
        repo.router({ 
            repository:package_repo,
            version_repo:package_version_repo,
        }));

// PARSER ROUTES
app.use('/parser',
        repo.router({ 
            repository:parser_repo,
            version_repo:parser_version_repo,
        }));

app.use('/',function(req,res){
    res.status(200).send('no such route')
});

// ----------------------------------------
// error handling
// ----------------------------------------

app.use(function (err, req, res, next) {
    console.log('Error handling route: ',req.method,req.originalUrl);
    console.error(err.stack);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).send({ error: err.message });
});


// ------------------------------------------------------------
// ------------------------------------------------------------
// END OF ../src/app
// END OF ../src/app
// ------------------------------------------------------------
// ------------------------------------------------------------

// GET THE SERVER APP

describe('Repo app (temp/packages)', function() {

    it('should return an empty list',function(done) {
        chai.request(app)
            .get('/package')
            .end(function(err, res){
                res.should.have.status(200);
                res.body.should.be.instanceof(Array);
                res.body.should.be.empty;
                done();
            });
    });

    it('POST(create) should require a version',function(done) {
        chai.request(app)
            .post('/package/foo/')
            .field('package','My favorite equations')
            .end(function(err, res){
                res.should.have.status(500);
                // TODO: validate the body (error message) of the response
                done();
            });
    });

    it('POST(create) should create a library',function(done) {
        chai.request(app)
            .post('/package/foo/v1.1.1')
            .field('package','My favorite equations')
            .end(function(err, res){
                res.should.have.status(200);
                res.body.action.should.equal('ADD');
                res.body.name.should.equal('foo');
                res.body.version.should.equal('v1.1.1');
                res.body.success.should.equal(true);
                done();
            });
    });

    it('POST(create) should not create a library twice',function(done) {
        chai.request(app)
            .post('/package/foo/v1.1.1')
            .field('package','My favorite equations')
            .end(function(err, res){
                res.should.have.status(500);
                done();
            });
    });

    it('POST(create) should not create a previous version',function(done) {
        chai.request(app)
            .post('/package/foo/v1.1.0')
            .field('package','My favorite equations')
            .end(function(err, res){
                res.should.have.status(500);
                done();
            });
    });

    it('GET(fetch) should get the library',function(done) {
        chai.request(app)
            .get('/package/foo/~v1.1.1')
            .end(function(err, res){
                res.should.have.status(200);
                res.body.should.not.be.empty;
                res.body.name.should.equal('foo');
                res.body.version.should.equal('~v1.1.1');
                res.body.contents.object.should.equal('My favorite equations');
                done();
            });
    });

    it('GET(versoins("foo")) should return the versions array',function(done) {
        chai.request(app)
            .get('/package/versions')
            .end(function(err, res){
                res.should.have.status(200);
                res.body.should.not.be.empty;
                (typeof res.body).should.equal('object');
                expect(Array.isArray(res.body)).to.be.false;
                expect(res.body.hasOwnProperty('foo')).to.be.true;
                res.body.foo.should.deep.equal(['1.1.1']);
                done();
            });
    });

    it('GET(versoins("foo")) should return the versions array',function(done) {
        chai.request(app)
            .get('/package/foo/versions')
            .end(function(err, res){
                res.should.have.status(200);
                res.body.should.not.be.empty;
                (typeof res.body).should.equal('object');
                expect(Array.isArray(res.body)).to.be.true;
                expect(res.body.indexOf("1.1.1")).to.not.equal(-1);
                expect(res.body.length).to.equal(1);
                done();
            });
    });

    it('put(updtate) should require a version',function(done) {
        chai.request(app)
            .put('/package/foo/')
            .field('package','hi there')
            .end(function(err, res){
                res.should.have.status(500);
                done();
            });
    });
//--         console.log("req.body.package: ",req.body.package)
//--         console.log("req.body.package: ",req.body.package)
//--         console.log("req.body.package: ",req.body.package)
//--         console.log("req.body.package: ",req.body.package)
//--         console.log("req.body.package: ",req.body.package)
//--                     console.log("update succeded with response: ",data)
//--                     console.log("update succeded with response: ",data)
//--                     console.log("update succeded with response: ",data)
//--                     console.log("update succeded with response: ",data)
//--                     config.repository.fetch({name:req.params.name, version:req.params.version}).then((x)=>console.log('new valiue: ',x))


    it('put(updtate) should overwrite the library',function(done) {
        chai.request(app)
            .put('/package/foo/v1.1.1')
            .field('package','hi there')
            .end(function(err, res){
                console.log("test 1")
                console.log("test 1")
                console.log("test 1")
                console.log("test 1")
                console.log("status: ", JSON.stringify(res));
                res.should.have.status(200);
                res.body.action.should.equal('UPDATE');
                res.body.name.should.equal('foo');
                res.body.version.should.equal('v1.1.1');
                res.body.success.should.equal(true);
                done();
            });
    });

    it('GET(fetch) should get the new library',function(done) {
        chai.request(app)
            .get('/package/foo/~v1.1.1')
            .end(function(err, res){
                res.should.have.status(200);
                res.body.should.not.be.empty;
                res.body.name.should.equal('foo');
                res.body.version.should.equal('~v1.1.1');
                res.body.contents.object.should.equal('hi there');
                done();
            });
    });

    it('GET (fetch) should not require the version number',function(done) {
        chai.request(app)
            .get('/package/foo/')
            .end(function(err, res){
                res.should.have.status(200);
                res.body.should.not.be.empty;
                res.body.name.should.equal('foo');
                res.body.should.not.have.property('version'); // version not provided in the query.
                res.body.contents.should.deep.equal({ name: 'foo', version: '1.1.1', object: 'hi there' });
                done();
            });
    });

    it('GET(fetch) / should return the list of libraries',function(done) {
        chai.request(app)
            .get('/package/')
            .end(function(err, res){
                res.should.have.status(200);
                res.body.should.not.be.empty;
                res.body[0].should.equal('foo');
                res.body.length.should.equal(1);
                done();
            });
    });

    it('DELETE /foo should require a version.',function(done) {
        chai.request(app)
            .del('/package/foo')
            .end(function(err, res){
                res.should.have.status(500);
                done();
            });
    });

    it('DELETE /foo not fail',function(done) {
        chai.request(app)
            .del('/package/foo/1.1.1')
            .end(function(err, res){
                res.should.have.status(200);
                done();
            });
    });

    it('should return an empty list',function(done) {
        chai.request(app)
            .get('/package')
            .end(function(err, res){
                res.should.have.status(200);
                res.body.should.be.instanceof(Array);
                res.body.should.be.empty;
                done();
            });
    });

});


//------------------------------------------------------------
// Round 2: same as above but with a `remote_repo` instance, 
// instead of the http API
//------------------------------------------------------------

// BUILD THE BASE URL
var server = ('function' === typeof app) ? http.createServer(app) : app,
    address =  server.address();


if (!address) {
    server.listen(0);
    address = server.address();
}

var protocol = (server instanceof https.Server) ? 'https:' : 'http:';
var hostname = address.address;
if (hostname === '0.0.0.0' || hostname === '::') {
    hostname = '127.0.0.1';
}


// GET THE REMOTE REPOSITORY INSTANCE
var base_url = protocol + '//' + hostname + ':' + address.port + '/parser';
var remote_repo = new repo.RemoteRepo({
    'base_url':base_url,
})

describe('Remote Repo (temp/parser)', function() {

    it('GET / (`packages()`) should return an empty list',function(done) {
        remote_repo.packages().then( function(x){
            console.log("get got x:",x);
                    return x;
                })
            .should.eventually.be.instanceof(Array).and.have.property('length',0)
                .and.notify(done);
    });

    it('POST(create) should require a version',function(done) {
        remote_repo.create({name:'foo'})
            .should.eventually.be.rejectedWith(
                    Error,
                    "missing required value options.version").and.notify(done);
    });

    it('POST(create) should create a library',function(done) {
        remote_repo.create({name:'foo',version:'v1.1.1'},
                'My favorite equations')
            .should.eventually.equal(true).and.notify(done);
    });

    it('POST(create) should create a library',function(done) {
        // FOR TESTING THE READ ONLY BUFFER
        remote_repo.create({name:'bar',version:'v1.1.1'},
                'My favorite equations')
            .should.eventually.equal(true).and.notify(done);
    });

    it('POST(create) should not create a library twice',function(done) {
        remote_repo.create({name:'foo',version:'v1.1.1'},
                'My favorite equations')
            .should.eventually.be.rejectedWith(
                    Error,
                    "Version (1.1.1) does not exceed the latest version (1.1.1)").and.notify(done);
    });

    it('POST(create) should not create a previous version',function(done) {
        remote_repo.create({name:'foo',version:'v1.1.0'},
                'My favorite equations')
            .should.eventually.be.rejectedWith(
                    Error,
                    "Version (1.1.0) does not exceed the latest version (1.1.1)").and.notify(done);
    });

    it('GET(fetch) should get the library',function(done) {
        remote_repo.fetch({name:'foo',version:'v1.1.1'})
            .should.eventually.deep.equal( { name: 'foo', version: '1.1.1', object: 'My favorite equations' })
                .and.notify(done);
    });

    it('PUT(updtate) should require a version',function(done) {
        remote_repo.update({name:'foo'})
            .should.eventually.be.rejectedWith(
                    Error,
                    "missing required value options.version").and.notify(done);
    });

    it('put(updtate) should overwrite the library',function(done) {
        console.log("test 2")
        console.log("test 2")
        console.log("test 2")
        console.log("test 2")
        remote_repo.update({name:'foo',version:'v1.1.1'}, 'hi there')
            .should.eventually.equal(true);
        done();
    });

    it('GET(fetch) should get the new library',function(done) {
        remote_repo.fetch({name:'foo',version:'v1.1.1'})
            .should.eventually.deep.equal( { name: 'foo', version: '1.1.1', object: 'hi there' })
                .and.notify(done);
    });

    it('GET(fetch) should not require the version number',function(done) {
        remote_repo.fetch({name:'foo'})
            .should.eventually.deep.equal( { name: 'foo', version: '1.1.1', object: 'hi there' })
                .and.notify(done);
    });

    it('GET "/" (`packages()`) should return the list of libraries',function(done) {
        remote_repo.packages()
            .should.eventually.be.instanceof(Array).and.deep.equal(['foo','bar'])
                .and.notify(done);
    });

    it('DELETE /foo should require a version.',function(done) {
        remote_repo.del({name:'foo'})
            .should.eventually.be.rejectedWith(
                    Error,
                    "missing required value options.version").and.notify(done);
    });

    it('DELETE /foo not fail',function(done) {
        remote_repo.del({name:'foo',version:'1.1.1'})
            .should.eventually.be.fulfilled.and.notify(done);
    });

    it('GET "/" (`packages()`) should return the list of libraries',function(done) {
        remote_repo.packages()
            .should.eventually.be.instanceof(Array).and.deep.equal(['bar'])
                .and.notify(done);
    });

})

// A READ-ONLY BUFFERED REPO BASED WRAPPING THE FILE SYSTEM REPO
var buffered_repo = new repo.ReadonlyBuffer(remote_repo);

describe('Buffered Remote Repo (temp/parser)', function() {

    // ENUMERATION
    it('GET "/" (`packages()`) should return the list of libraries',function(done) {
        buffered_repo.packages().then(function(x){
            console.log("buffered_repo promised: ",x," with type: ",typeof x);

            return ['bar'];
        })
            .should.eventually.deep.equal(['bar'])
                .and.notify(done);
    });

    // FETCH
    it("fetch({name:'bar'}) should return the library",function(done) {
        remote_repo.fetch({name:'bar'})
            .should.eventually.deep.equal( { name: 'bar', version: '1.1.1', object: 'My favorite equations' })
                .and.notify(done);
    });

    // CUD
    it('CREATE call should be rejected.',function(done) {
        buffered_repo.create({name:'foo',version:"1.1.1"},"ASFD")
            .should.eventually.be.rejectedWith(
                    Error,
                    "Cannot create a record in a read-only buffer").and.notify(done);
    });

    it('UPDATE call should be rejected.',function(done) {
        buffered_repo.update({name:'foo',version:"1.1.1"},"asdf")
            .should.eventually.be.rejectedWith(
                    Error,
                    "Cannot update a record in a read-only buffer").and.notify(done);
    });

    it('DELETE call should be rejected.',function(done) {
        buffered_repo.del({name:'foo',version:"1.1.1"})
            .should.eventually.be.rejectedWith(
                    Error,
                    "Cannot delete a record in a read-only buffer").and.notify(done);
    });


})




// A READ-ONLY BUFFERED REPO BASED WRAPPING THE FILE SYSTEM REPO
var proc_repo;
describe('======= Processed Repo =======', function() {

    it('should not throw an error',function(done) {
        proc_repo = new repo.ProcessedBuffer(remote_repo,(x)=>{return "Processed: "+String(x);});
        console.log(Object.keys(proc_repo));
        console.log(repo.ProcessedBuffer.toString());

            done();
    });


    // ENUMERATION
    it('GET "/" (`packages()`) should return the list of libraries',function(done) {
        proc_repo.packages().then(function(x){
            console.log("proc_repo promised: ",x," with type: ",typeof x);

            return ['bar'];
        })
            .should.eventually.deep.equal(['bar'])
                .and.notify(done);
    });

    // FETCH-sync
    it("fetch_sync({name:'bar'}) should throw when called before the item is defined (by fetching!)",
        function(done) {
            try{
                proc_repo.fetch_sync({name:'bar',version:"1.1.1"});
            }catch (err){
                done();
            }
    });

    // FETCH
    it("fetch({name:'bar'}) should return the library",function(done) {
        proc_repo.fetch({name:'bar',version:"1.1.1"})
            .should.eventually.deep.equal( { name: 'bar', version: '1.1.1', object: 'Processed: My favorite equations' })
                .and.notify(done);
    });

    // FETCH-sync
    it("fetch_sync({name:'bar'}) should return the library",
            function() {
                proc_repo.fetch_sync({name:'bar',version:"1.1.1"}).should
                    .deep.equal( { name: 'bar', version: '1.1.1', object: 'Processed: My favorite equations' })
    });

    // CUD
    it('CREATE call should be rejected.',function(done) {
        proc_repo.create({name:'foo',version:"1.1.1"},"ASFD")
            .should.eventually.be.rejectedWith(
                    Error,
                    "Cannot create a record in a read-only buffer").and.notify(done);
    });

    it('UPDATE call should be rejected.',function(done) {
        proc_repo.update({name:'foo',version:"1.1.1"},"asdf")
            .should.eventually.be.rejectedWith(
                    Error,
                    "Cannot update a record in a read-only buffer").and.notify(done);
    });

    it('DELETE call should be rejected.',function(done) {
        proc_repo.del({name:'foo',version:"1.1.1"})
            .should.eventually.be.rejectedWith(
                    Error,
                    "Cannot delete a record in a read-only buffer").and.notify(done);
    });


})






