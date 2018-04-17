// GENERAL TESTING IMPORTS
import { sync_repository, deferred_repository, resource_data, repository } from   "version-repo/src/typings";
import { generate_version_resolution_tests } from "version-repo/test/version-resolution-test-fixture"
import chai = require("chai");
import chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
var expect = chai.expect;


// REPO SPECIFIC IMPORTS
import http = require('http');
import https = require('https');
import { MemoryRepo, dTransform, sTransform, ReadonlyBuffer, ProcessedBuffer } from "version-repo"
import { FileRepo, router, RemoteRepo }  from "../index"
var temp = require('temp').track();

//--------------------------------------------------
// just making sure teh fixture works as expected
//--------------------------------------------------
generate_version_resolution_tests({
    name: "Memory Repo", 
    repo: new MemoryRepo()
});

// ------------------------------------------------------------
// set up the instances to be tested
// ------------------------------------------------------------

//--------------------------------------------------
// backends populated via the fronend
//--------------------------------------------------
(function (){
    var dir = temp.mkdirSync();
    generate_version_resolution_tests({name: "File Repo", repo: new FileRepo({directory:dir})});
})();

(function (){
    var dir = temp.mkdirSync();
    const fr = new FileRepo({directory:dir})
    const tx:dTransform<string,any> = new dTransform(fr, JSON.stringify, JSON.parse)
    generate_version_resolution_tests({name: "File Repo with a transformer", 
                    repo: tx});
})();

(function (){
    const _backend = new MemoryRepo();
    const app = build_app(_backend);
    var server = ('function' === typeof app) ? http.createServer(app) : app;
    var remote_repo = new RemoteRepo({ 'base_url':get_server_address(server), });
    generate_version_resolution_tests({name: "Remote Repo (URL config)", repo: remote_repo});
})();

(function (){
    const _backend = new MemoryRepo();
    const app = build_app(_backend);
    var remote_repo = new RemoteRepo({ 'app':app, base_url:"/my-repo" });
    generate_version_resolution_tests({name: "Remote Repo (app config)", repo: remote_repo});
})();

(function (){
    const _backend = new MemoryRepo();
    const app = build_app(_backend);
    var server = ('function' === typeof app) ? http.createServer(app) : app;
    var remote_repo = new RemoteRepo({ 'app':server, base_url:"/my-repo"});
    generate_version_resolution_tests({name: "Remote Repo (server config)", repo: remote_repo});
})();


//--------------------------------------------------
// backends populated via the fronend
//--------------------------------------------------
(function (){
    const _backend = new MemoryRepo();
    const app = build_app(_backend);
    var server = ('function' === typeof app) ? http.createServer(app) : app;
    var remote_repo = new RemoteRepo({ 'app':server, base_url:"/my-repo"});
    generate_version_resolution_tests({
        name: "Remote Repo (server config, backend loaded memory repo)",
        repo: remote_repo,
        backend: _backend
    });
})();

(function (){
    var dir = temp.mkdirSync();
    const _backend = new FileRepo({directory:dir})
    const app = build_app(_backend);
    var server = ('function' === typeof app) ? http.createServer(app) : app;
    var remote_repo = new RemoteRepo({ 'app':server, base_url:"/my-repo"});
    generate_version_resolution_tests({
        name: "Remote Repo (server config, backend loaded file repo)",
        repo: remote_repo,
        backend: _backend
    });
})();


//--------------------------------------------------
// backends populated directly 
//--------------------------------------------------

(function (){

    const _backend = new MemoryRepo();

    generate_version_resolution_tests({
        name: "Memory Repo with trivial async-transform", 
        backend: _backend,
        repo: new dTransform(_backend, (x => x), (x => x))
    });

})();


(function(){

    const _backend = new MemoryRepo();

    generate_version_resolution_tests({
        name: "Memory Repo with trivial async-transform and buffer", 
        backend: _backend,
        repo: new ReadonlyBuffer(new dTransform(_backend, (x => x), (x => x)))
    });

})();

(function(){

    const _backend = new MemoryRepo();

    generate_version_resolution_tests({
        name: "Memory Repo with trivial async-transform and ProcessedBuffer", 
        backend: _backend,
        repo: new ProcessedBuffer(new dTransform(_backend, (x => x), (x => x)), (x => x))
    });

})();







//--------------------------------------------------
// utility funcitons
//--------------------------------------------------

function build_app(backend:repository<any> = new MemoryRepo()){

    var http = require('http'),
        express = require('express'),
        app = express();

    // PARSER ROUTES
    app.use('/',function(req,res,next){
        console.log('Processing route: ',req.method,req.originalUrl);
        next()
    });

    app.use('/my-repo', router({ repository:backend, }));

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

    return app ;
};


function get_server_address(server){
    var address =  server.address();
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


