import { name_regex } from "version-repo/src/utils"
import { repository, resource_data } from "version-repo/src/typings"
import * as express from 'express';
import * as semver from 'semver';
import * as Promise from 'bluebird';
import { calculate_dependencies } from 'version-repo/index';

var multer = require('multer'), // v1.0.5
    upload = multer(), // for parsing multipart/form-data
    bodyParser = require('body-parser');

export interface repo_router_config { 
    repository: repository<any>;
    router?: express.Router; 
    query_credentials?: () => void;
    modify_credentials?: () => void;
}

export function router(config:repo_router_config):express.Router{

    var router = (typeof config.router === 'undefined')? 
                    express.Router():
                    config.router;

    router.use(bodyParser.json({limit:'1mb'})); // for parsing application/json
    router.use(bodyParser.urlencoded({ limit:'1mb',extended: true })); // for parsing application/x-www-form-urlencoded
    router.use('/',upload.array())

    //------------------------------
    // Paramter Handlers / validators
    //------------------------------

    router.param('name', function(req, res, next, name){
        if(!name_regex.test(name)){
            next(new Error("Invalid package name: "+name));
        }
        next();
    });

    router.param('version', function(req, res, next, version){
        if(!version.length){
            next();
        }
        if(!semver.valid(version)){
            next(new Error("Invalid version string: "+version));
        }
        next();
    });

    router.param('versionRange', function(req, res, next, version){
        if(!version.length){
            next();
        }
        if(!semver.validRange(version)){
            next(new Error("Invalid version string: "+version));
        }
        next();
    });

    //------------------------------
    // ROUTES
    //------------------------------

    var notify = function(x){
        return function(req,res,next){
            console.log(
                    req.method,
                    '==: ',
                    req.originalUrl,
                    '==> ',
                    x);
            next();
        }
    }

    // ENUMERATION ROUTES
    router.get('/',notify("root: '/'"));
    if(config.query_credentials){router.get('/',config.query_credentials);}
    router.get('/',handle_root);

    router.get('/versions',notify("versions: '/versions'"));
    if(config.query_credentials){router.get('/versions',config.query_credentials);}
    router.get('/versions',versions);

    router.get('/:name/latest_version',notify("get_package: '/:name/'"));
    if(config.query_credentials){router.get('/:name/latest_version',config.query_credentials);}
    router.get('/:name/latest_version',latest_version);

    router.get('/:name/versions',notify("get_package: '/:name/versions'"));
    if(config.query_credentials){router.get('/:name/versions',config.query_credentials);}
    router.get('/:name/versions',package_versions);

    // QUERY ROUTES
    router.get('/:name/:versionRange',notify("fetchOne: '/:name/:versionRange'"));
    if(config.query_credentials){router.get('/:name/:versionRange',config.query_credentials);}
    router.get('/:name/:versionRange',fetchOne);

    router.get('/:name',notify("fetchOne: '/:name'"));
    if(config.query_credentials){router.get('/:name',config.query_credentials);}
    router.get('/:name',fetchOne);

    router.get('/:name/',notify("fetchLatest: '/:name/'"));
    if(config.query_credentials){router.get('/:name/',config.query_credentials);}
    router.get('/:name/',fetchLatest);

    // MODIFY ROUTES
    router.post('/:name/:version',notify("create: '/:name/:version'"));
    if(config.modify_credentials){router.get('/:name/:version',config.modify_credentials);}
    router.post('/:name/:version',create);// upload.array(),

    router.post('/:name',notify("create: '/:name'"));
    if(config.modify_credentials){router.get('/:name',config.modify_credentials);}
    router.post('/:name',create);// upload.array(),

    router.put('/:name/:version',notify("update: '/:name/:version'"));
    if(config.modify_credentials){router.get('/:name/:version',config.modify_credentials);}
    router.put('/:name/:version',update);// upload.array(),

    router.put('/:name',notify("update: '/:name'"));
    if(config.modify_credentials){router.get('/:name',config.modify_credentials);}
    router.put('/:name',update);// upload.array(),

    router.delete('/:name/:version',notify("del: '/:name/:version'"));
    if(config.modify_credentials){router.get('/:name/:version',config.modify_credentials);}
    router.delete('/:name/:version',del);

    router.delete('/:name',notify("del: '/:name'"));
    if(config.modify_credentials){router.get('/:name',config.modify_credentials);}
    router.delete('/:name',del);

    //--------------------------------------------------
    // WRAPPER FUNCTIONS
    //--------------------------------------------------


    //------------------------------
    // ENUMERATION 
    //------------------------------

    function latest_version (req, res, next){
        Promise.resolve(config.repository.latest_version(req.params.name)).then(function(v){
            res.status(200).send(v);
        },function(err){
            res.sendStatus(500);
        });
    }

    function package_versions (req, res, next){
        Promise.resolve(config.repository.versions(req.params.name))
            .then(versions =>  (res.status(200).send(versions)))
            .catch(err => {
                console.error("package_versions Error:\n", err.stack);
                res.sendStatus(500)
            })
    }

    function versions (req, res, next){
        Promise.resolve(config.repository.versions()).then(function(versions){
            res.status(200).send(versions);
        },function(err){
            res.sendStatus(500);
        });
    }

    function handle_root(req, res, next){
        //console.log('router root received params: ',req.params)
        //console.log('router root received body: ',req.body)
        if(!req.body || !req.body.method){
            list_packages (req, res, next)
        }else if(req.body.method == "versions"){
            versions(req, res, next)
        }else if(req.body.method == "fetch"){
            fetch(req, res, next)
        }else if(req.body.method == "depends"){
            depends(req, res, next)
        }
    }

    function list_packages (req, res, next){
        Promise.resolve(config.repository.packages()).then(function(packages){
            res.status(200).send(packages);
        },function(err){
            res.sendStatus(500);
        });
    }

    function depends(req, res,next) {

        //console.log('router depends received params: ',JSON.stringify(req.body.args));
        //console.log('router depends received body: ',req.body);
        Promise.try(()=>{
            return config.repository.depends.apply(config.repository,req.body.args)
        })
        .then( (data) => {
            res.status(200).send(data);
        }).catch((err) => {
            //console.log("hi world ")
            console.log("Error (itself): ", err)
            console.log("Error Message: ", err.message)

            next(err);
        });
    }


    //------------------------------
    // CRUD
    //------------------------------

    function fetch(req, res,next) {

        //console.log('router fetch received params: ',JSON.stringify(req.body.args))
        //console.log('router fetch received body: ',JSON.stringify(req.body))
        Promise.try(()=>{
            return config.repository.fetch.apply(config.repository,req.body.args)
        })
        .then( (data) => {
            //console.log("HELLO WORLD ")
            //console.log("data: ", data)
            res.status(200).send(data);
        }).catch((err) => {
            //console.log("HELLO world ")
            //console.log("Error (itself): ", err)
            //console.log("Error Message: ", err.message)
            next(err);
        });
    }


    function fetchLatest(req, res,next) {

        //console.log('router fetchLatest received params: ',req.params)
        //console.log('router fetchLatest received body: ',req.body)
        Promise.try(()=>{
            return config.repository.fetchOne.apply(config.repository,req.body.args)
        })
        .then( (data) => {
            res.status(200).send({
                name:req.params.name,
                version:req.params.versionRange,
                contents:data,
            });
        }).catch((err) => {
            next(new Error('GET /package get failed with error message: '+err.message));
        });
    }


    function fetchOne(req, res,next) {

        var args = req.body && req.body.args ? req.body.args : [{name:req.params.name, version:req.params.versionRange}];
        //console.log('router fetchOne received params: ',req.params)
        //console.log('router fetchOne received body: ',req.body)
        //console.log('router fetchOne received args: ',JSON.stringify(args))
        Promise.try(()=>{
            return config.repository.fetchOne.apply(config.repository,args)
        })
        .then( (data) => {
            res.status(200).send({
                name:req.params.name,
                version:req.params.versionRange,
                contents:data,
            });
        }).catch((err) => {
            next(new Error('GET /package get failed with error message: '+err.message));
        });
    }

    function create (req, res, next) {
        //console.log('router create received body: ',req.body)
        //console.log('router create received body.value: ',req.body.value)
        if (!req.body || Object.keys(req.body).indexOf("value") == -1) {
            res.sendStatus(500).send("Request body missing field 'value'");
        }
        Promise.try(() => {
            var opts:resource_data<any> = {
                    name: req.params.name, 
                    version: req.params.version,
                    value: req.body.value,
                }
            if(req.body.depends)
                opts.depends = req.body.depends
            return config.repository.create(opts);
        }).then( (data) => {
            res.status(200).send({
                action:'ADD',
                name:req.params.name,
                version:req.params.version,
                success:true,
            });
        }).catch((err) => {
            console.log("returning error: ",err) 
            next(err);
        });
    }

    function update (req, res, next) {

        Promise.try(() => {
            return config.repository.update({
                name: req.params.name,
                version: req.params.version, 
                value: req.body.value,
                depends: req.body.depends,
            })
        }).then( (data) => {
            res.status(200).send({
                action:'UPDATE',
                name:req.params.name,
                version:req.params.version,
                success:true,
            });
        }).catch((err) => {
            next(new Error('PUT /package update failed: '+err));
        });

    }

    function del (req, res, next) {
        Promise.try(() => {
            return config.repository.del({name:req.params.name, version:req.params.version})
        })
        .then( (data) => {
            res.status(200).send({
                action:'DELETE',
                name:req.params.name,
                version:req.params.version,
                success:true,
            });
        }).catch((err) => {
            next(new Error('DEL /package deletion failed: '+err));
        });

    }

    return router;

}


