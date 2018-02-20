
import chai = require('chai');
import chaiHttp = require('chai-http');
var chaiAsPromised = require("chai-as-promised"),
    should = chai.should(),
    expect = chai.expect;
chai.use(chaiHttp);
chai.use(chaiAsPromised);

var repo = require('../index'),
    https = require('https'),
    http = require('http');

// ------------------------------
// set up the routes
// ------------------------------
var express = require('express'),
    app = express();


app.use('/',function(req,res,next){
    console.log('Processing route: ',req.method,req.originalUrl);
    next()
});

// BUILD THE REPOSITORIES
var parser_repo  = new repo.MemoryRepo(),
    parser_version_repo  = new repo.MemoryRepo();

// PARSER ROUTES
app.use('/parser',
        repo.router({ 
            repository:parser_repo,
            version_repo:parser_version_repo,
        }));

app.use('/',function(req,res){
    res.status(200).send('no such route')
});

// ERROR HANDLING
app.use(function (err, req, res, next) {
    console.log('Error handling route: ',req.method,req.originalUrl);
    console.error(err.stack);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).send({ error: err.message });
});

// ------------------------------------------------------------

// GET THE SERVER APP

var server2 = ('function' === typeof app) ? http.createServer(app) : app;
var remote_repo2 = new repo.RemoteRepo({ 'app':server2 ,base_url:'parser' })

describe('Remote Repo (alternate parameterization)', function() {

    it('GET / (`packages()`) should return an empty list',function(done) {
        remote_repo2.packages()
            .then( function(x){
                console.log("get got x:",x);
                return x;
            })
            .should.eventually.be.instanceof(Array).and.have.property('length',0)
                .and.notify(done);
    });

    it('POST(create) should require a version',function(done) {
        remote_repo2.create({name:'foo'})
            .should.eventually.be.rejectedWith(
                    Error,
                    "missing required value options.version").and.notify(done);
    });

    it('POST(create) should create a library',function(done) {
        remote_repo2.create({name:'foo',version:'v1.1.1'},
                'My favorite equations')
            .should.eventually.equal(true).and.notify(done);
    });

    it('POST(create) should create a library',function(done) {
        // FOR TESTING THE READ ONLY BUFFER
        remote_repo2.create({name:'bar',version:'v1.1.1'},
                'My favorite equations')
            .should.eventually.equal(true).and.notify(done);
    });

    it('versions(name) return an array',function(done) {
        // FOR TESTING THE READ ONLY BUFFER
        remote_repo2.versions('bar')
            .then(function(x){
                (typeof x).should.equal('object');
                expect(Array.isArray(x)).to.be.true;
                expect(x.indexOf("1.1.1")).to.not.equal(-1);
                expect(x.length).to.equal(1);
                done();
        })
    });

    it('versions() return a dictionary',function(done) {
        // FOR TESTING THE READ ONLY BUFFER
        remote_repo2.versions()
            .then(function(x){
                console.log('versions() returned:', x);
                (typeof x).should.equal('object');
                expect(Array.isArray(x)).to.be.false;
                expect(x.hasOwnProperty('foo')).to.be.true;
                x.foo.should.deep.equal(['1.1.1']);
                done();
        })
    });

    it('POST(create) should not create a library twice',function(done) {
        remote_repo2.create({name:'foo',version:'v1.1.1'},
                'My favorite equations')
            .should.eventually.be.rejectedWith(
                    Error,
                    "Version (1.1.1) does not exceed the latest version (1.1.1)").and.notify(done);
    });

    it('POST(create) should not create a previous version',function(done) {
        remote_repo2.create({name:'foo',version:'v1.1.0'},
                'My favorite equations')
            .should.eventually.be.rejectedWith(
                    Error,
                    "Version (1.1.0) does not exceed the latest version (1.1.1)").and.notify(done);
    });

    it('GET(fetch) should get the library',function(done) {
        remote_repo2.fetch({name:'foo',version:'v1.1.1'})
            .should.eventually.deep.equal( { name: 'foo', version: '1.1.1', object: 'My favorite equations' })
                .and.notify(done);
    });

    it('PUT(updtate) should require a version',function(done) {
        remote_repo2.update({name:'foo'})
            .should.eventually.be.rejectedWith(
                    Error,
                    "missing required value options.version").and.notify(done);
    });

    it('PUT(updtate) should overwrite the library',function(done) {
        remote_repo2.update({name:'foo',version:'v1.1.1'}, 'hi there')
            .should.eventually.equal(true);
        done();
    });

    it('GET(fetch) should get the new library',function(done) {
        remote_repo2.fetch({name:'foo',version:'v1.1.1'})
            .should.eventually.deep.equal( { name: 'foo', version: '1.1.1', object: 'hi there' })
                .and.notify(done);
    });

    it('GET(fetch) should not require the version number',function(done) {
        remote_repo2.fetch({name:'foo'})
            .should.eventually.deep.equal( { name: 'foo', version: '1.1.1', object: 'hi there' })
                .and.notify(done);
    });

    it('GET "/" (`packages()`) should return the list of libraries',function(done) {
        remote_repo2.packages()
            .should.eventually.be.instanceof(Array).and.deep.equal(['foo','bar'])
                .and.notify(done);
    });

    it('DELETE /foo should require a version.',function(done) {
        remote_repo2.del({name:'foo'})
            .should.eventually.be.rejectedWith(
                    Error,
                    "missing required value options.version").and.notify(done);
    });

    it('DELETE /foo not fail',function(done) {
        remote_repo2.del({name:'foo',version:'1.1.1'})
            .should.eventually.be.fulfilled.and.notify(done);
    });

    it('GET "/" (`packages()`) should return the list of libraries',function(done) {
        remote_repo2.packages()
            .should.eventually.be.instanceof(Array).and.deep.equal(['bar'])
                .and.notify(done);
    });

})


