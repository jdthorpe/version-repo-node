
import { sync_repository, deferred_repository, resource_data } from   "version-repo/src/typings";
import { generate_tests } from "version-repo/test/general-repo-test-fixture"

import chai = require('chai');
var temp = require('temp').track();
import http = require('http');
import https = require('https');
const should = chai.should(),
      expect = chai.expect;
import chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

import repo = require('../index');
import * as Promise from "bluebird"

// ------------------------------------------------------------
// set up the instances to be tested
// ------------------------------------------------------------

(function (){
    var dir = temp.mkdirSync();
    generate_tests({name: "File Repo", repo: new repo.FileRepo({directory:dir})});
})();

(function (){
    var dir = temp.mkdirSync();
    const fr = new repo.FileRepo({directory:dir})
    const tx:repo.dTransform<string,any> = new repo.dTransform(fr, JSON.stringify, JSON.parse)
    generate_tests({name: "File Repo with a transformer", 
                    repo: tx});
})();



function build_app(){

    var http = require('http'),
        express = require('express'),
        app = express(),
        parser_repo  = new repo.MemoryRepo();

    // PARSER ROUTES
    app.use('/',function(req,res,next){
        console.log('Processing route: ',req.method,req.originalUrl);
        next()
    });

    app.use('/my-repo', repo.router({ repository:parser_repo, }));

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

(function (){
    const app = build_app();
    var server = ('function' === typeof app) ? http.createServer(app) : app;
    var remote_repo = new repo.RemoteRepo({ 'base_url':get_server_address(server), });
    generate_tests({name: "Remote Repo (URL config)", repo: remote_repo});
})();

(function (){
    const app = build_app();
    var remote_repo = new repo.RemoteRepo({ 'app':app, base_url:"/my-repo" });
    generate_tests({name: "Remote Repo (app config)", repo: remote_repo});
})();

(function (){
    const app = build_app();
    var server = ('function' === typeof app) ? http.createServer(app) : app;
    var remote_repo = new repo.RemoteRepo({ 'app':server, base_url:"/my-repo"});
    generate_tests({name: "Remote Repo (server config)", repo: remote_repo});
})();





