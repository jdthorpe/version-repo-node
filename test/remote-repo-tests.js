"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai = require("chai");
var chaiHttp = require("chai-http");
var chaiAsPromised = require("chai-as-promised"), should = chai.should(), expect = chai.expect;
chai.use(chaiHttp);
chai.use(chaiAsPromised);
var repo = require('../index'), express = require('express'), app = express();
app.use('/', function (req, res, next) {
    console.log('Processing route: ', req.method, req.originalUrl);
    next();
});
// BUILD THE REPOSITORIES
var temp = require('temp'), dir_1 = temp.mkdirSync(), dir_2 = temp.mkdirSync(), package_repo = new repo.FileRepo({ directory: dir_1 }), package_version_repo = new repo.FileRepo({ directory: dir_2 }), parser_repo = new repo.MemoryRepo(), parser_version_repo = new repo.MemoryRepo();
// ROUTES
app.use('/my-repo', repo.router({
    repository: package_repo,
    version_repo: package_version_repo,
}));
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
// ------------------------------------------------------------
// ------------------------------------------------------------
// END OF ../src/app
// END OF ../src/app
// ------------------------------------------------------------
// ------------------------------------------------------------
// GET THE SERVER APP
describe('Repo app (temp/packages)', function () {
    it('should return an empty list', function (done) {
        chai.request(app)
            .get('/my-repo')
            .end(function (err, res) {
            res.should.have.status(200);
            res.body.should.be.instanceof(Array);
            res.body.should.be.empty;
            done();
        });
    });
    it('POST(create) should require a version', function (done) {
        chai.request(app)
            .post('/my-repo/foo/')
            .field('value', 'Lorem Ipsum dolor sit amet, ...')
            .end(function (err, res) {
            res.should.have.status(500);
            // TODO: validate the body (error message) of the response
            done();
        });
    });
    it('POST(create) should create a library', function (done) {
        chai.request(app)
            .post('/my-repo/foo/v1.1.1')
            .field('value', 'Lorem Ipsum dolor sit amet, ...')
            .end(function (err, res) {
            res.should.have.status(200);
            res.body.action.should.equal('ADD');
            res.body.name.should.equal('foo');
            res.body.version.should.equal('v1.1.1');
            res.body.success.should.equal(true);
            done();
        });
    });
    it('POST(create) should require a value', function (done) {
        chai.request(app)
            .post('/my-repo/bar/v1.1.1')
            .end(function (err, res) {
            res.should.have.status(500);
            done();
        });
    });
    it('POST(create) should create another library', function (done) {
        chai.request(app)
            .post('/my-repo/bar/v1.1.1')
            .field('value', 'some other things')
            .end(function (err, res) {
            res.should.have.status(200);
            res.body.action.should.equal('ADD');
            res.body.name.should.equal('bar');
            res.body.version.should.equal('v1.1.1');
            res.body.success.should.equal(true);
            done();
        });
    });
    it('POST(create) should not create a library twice', function (done) {
        chai.request(app)
            .post('/my-repo/foo/v1.1.1')
            .field('value', 'Lorem Ipsum dolor sit amet, ...')
            .end(function (err, res) {
            res.should.have.status(500);
            done();
        });
    });
    it('POST(create) should not create a previous version', function (done) {
        chai.request(app)
            .post('/my-repo/foo/v1.1.0')
            .field('value', 'Lorem Ipsum dolor sit amet, ...')
            .end(function (err, res) {
            res.should.have.status(500);
            done();
        });
    });
    it('GET(fetch) should get the library', function (done) {
        chai.request(app)
            .get('/my-repo/foo/~v1.1.1')
            .send({ method: "fetch", args: [{ name: "foo", version: "1.1.1" }, null] })
            .end(function (err, res) {
            res.should.have.status(200);
            res.body.should.not.be.empty;
            res.body.name.should.equal('foo');
            res.body.version.should.equal('~v1.1.1');
            res.body.contents.value.should.equal('Lorem Ipsum dolor sit amet, ...');
            done();
        });
    });
    it('GET(versoins("foo")) should return the versions array', function (done) {
        chai.request(app)
            .get('/my-repo/versions')
            .end(function (err, res) {
            res.should.have.status(200);
            res.body.should.not.be.empty;
            (typeof res.body).should.equal('object');
            expect(Array.isArray(res.body)).to.be.false;
            expect(res.body.hasOwnProperty('foo')).to.be.true;
            res.body.foo.should.deep.equal(['1.1.1']);
            done();
        });
    });
    it('GET(versoins("foo")) should return the versions array', function (done) {
        chai.request(app)
            .get('/my-repo/foo/versions')
            .end(function (err, res) {
            res.should.have.status(200);
            res.body.should.not.be.empty;
            (typeof res.body).should.equal('object');
            expect(Array.isArray(res.body)).to.be.true;
            expect(res.body.indexOf("1.1.1")).to.not.equal(-1);
            expect(res.body.length).to.equal(1);
            done();
        });
    });
    it('put(updtate) should require a version', function (done) {
        chai.request(app)
            .put('/my-repo/foo/')
            .field('value', 'hi there')
            .end(function (err, res) {
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
    it('put(updtate) should overwrite the library', function (done) {
        chai.request(app)
            .put('/my-repo/foo/v1.1.1')
            .field('value', 'hi there')
            .end(function (err, res) {
            console.log("status: ", JSON.stringify(res));
            res.should.have.status(200);
            res.body.action.should.equal('UPDATE');
            res.body.name.should.equal('foo');
            res.body.version.should.equal('v1.1.1');
            res.body.success.should.equal(true);
            done();
        });
    });
    it('GET(fetch) /package/version should fetchOne(even without the args)', function (done) {
        chai.request(app)
            .get('/my-repo/foo/~v1.1.1')
            .end(function (err, res) {
            res.should.have.status(200);
            res.body.should.not.be.empty;
            res.body.name.should.equal('foo');
            res.body.version.should.equal('~v1.1.1');
            res.body.contents.value.should.equal('hi there');
            done();
        });
    });
    it('GET (fetch) should not require the version number', function (done) {
        chai.request(app)
            .get('/my-repo/foo/')
            .send({ method: "fetch", args: [{ name: "foo" }, null] })
            .end(function (err, res) {
            res.should.have.status(200);
            res.body.should.not.be.empty;
            res.body.name.should.equal('foo');
            res.body.should.not.have.property('version'); // version not provided in the query.
            res.body.contents.should.deep.equal({ name: 'foo', version: '1.1.1', value: 'hi there' });
            done();
        });
    });
    it('GET(fetch) / should return the list of libraries', function (done) {
        chai.request(app)
            .get('/my-repo/')
            .end(function (err, res) {
            res.should.have.status(200);
            res.body.should.not.be.empty;
            res.body.sort().should.deep.equal(['bar', 'foo']);
            done();
        });
    });
    it('DELETE /foo should require a version.', function (done) {
        chai.request(app)
            .del('/my-repo/foo')
            .end(function (err, res) {
            res.should.have.status(500);
            done();
        });
    });
    it('DELETE /foo not fail', function (done) {
        chai.request(app)
            .del('/my-repo/foo/1.1.1')
            .end(function (err, res) {
            res.should.have.status(200);
            done();
        });
    });
    it('The deleted package should really be deleted', function (done) {
        chai.request(app)
            .get('/my-repo')
            .end(function (err, res) {
            res.should.have.status(200);
            res.body.should.be.instanceof(Array);
            res.body.should.deep.equal(['bar']);
            done();
        });
    });
});
//# sourceMappingURL=remote-repo-tests.js.map