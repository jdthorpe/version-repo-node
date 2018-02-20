
//------------------------------
// LOAD RESOURCES
//------------------------------
import { name_regex } from "version-repo/src/utils"
import { repo_router_config } from "version-repo/src/typings"


import express = require('express');
import semver = require('semver');
//-- import Q = require('q');
import * as Promise from 'bluebird';
import { calculate_dependencies } from 'version-repo/index';

var multer = require('multer'), // v1.0.5
    upload = multer(), // for parsing multipart/form-data
    bodyParser = require('body-parser');



//------------------------------
// CONFIG
//------------------------------

export function router(config:repo_router_config){

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
    router.get('/',notify("list_packages: '/'"));
    if(config.query_credentials){router.get('/',config.query_credentials);}
    router.get('/',list_packages);

    router.get('/versions',notify("versions: '/versions'"));
    if(config.query_credentials){router.get('/versions',config.query_credentials);}
    router.get('/versions',versions);

    router.get('/:name/latest_version',notify("get_package: '/:name/'"));
    if(config.query_credentials){router.get('/:name/latest_version',config.query_credentials);}
    router.get('/:name/latest_version',latest_version);

    router.get('/:name/versions',notify("get_package: '/:name/'"));
    if(config.query_credentials){
        router.get('/:name/versions',config.query_credentials);
    }
    router.get('/:name/versions',package_versions);

    // QUERY ROUTES
    router.get('/:name/:versionRange',notify("fetch: '/:name/:versionRange'"));
    if(config.query_credentials){router.get('/:name/:versionRange',config.query_credentials);}
    router.get('/:name/:versionRange',fetch);

    router.get('/:name',notify("fetch: '/:name'"));
    if(config.query_credentials){router.get('/:name',config.query_credentials);}
    router.get('/:name',fetch);

    router.get('/:name/',notify("fetch: '/:name/'"));
    if(config.query_credentials){router.get('/:name/',config.query_credentials);}
    router.get('/:name/',fetch);

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


//--     // SUGAR / CRUFT 
//--     if(typeof config.dependency_repo !== 'undefined'){
//--         router.get('/resolve',notify("resolution-query: '/resolve'"));
//--         if(config.query_credentials){router.get('/resolve',config.query_credentials);}
//--         router.get('/resolve',get_dependencies);
//--     }

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
        Promise.resolve(config.repository.versions(req.params.name)).then(function(versions){
            res.status(200).send(versions);
        },function(err){
            res.sendStatus(500);
        });
    }

    function versions (req, res, next){
        Promise.resolve(config.repository.versions()).then(function(versions){
            res.status(200).send(versions);
        },function(err){
            res.sendStatus(500);
        });
    }

    function list_packages (req, res, next){
        Promise.resolve(config.repository.packages()).then(function(packages){
            res.status(200).send(packages);
        },function(err){
            res.sendStatus(500);
        });
    }

    //------------------------------
    // CRUD
    //------------------------------

    function fetch (req, res,next) {
        Promise.try(()=>{
            return config.repository.fetch({name:req.params.name, version:req.params.versionRange})
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
        console.log('router create received body: ',req.body)
        console.log('router create received body.package: ',req.body.package)
        Promise.try(() => {
            return config.repository.create(
                {name:req.params.name, version:req.params.version},
                req.body.package);
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

//-- function create (req, res, next) {
//--         Q.fcall(function(){
//--             console.log('router create received body: ',req.body)
//--             console.log('router create received body.package: ',req.body.package)
//--             return config.repository.create({name:req.params.name, version:req.params.version},
//--                     req.body.package);
//--         }).then( 
//--               function(data){
//--                   res.status(200).send({
//--                       action:'ADD',
//--                       name:req.params.name,
//--                       version:req.params.version,
//--                       success:true,
//--                   });
//--               },
//--               function(err){
//--                   next(err);
//--               });
//--     }

    function update (req, res, next) {

        Promise.try(() => {
            return config.repository.update({name:req.params.name, version:req.params.version}, req.body.package)
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
//--             console.log('calling DEL /package deletion failed: 1')

        Promise.try(() => {
//--             console.log('calling DEL /package deletion failed: 2',Object.keys(config.repository.__proto__))
            return config.repository.del({name:req.params.name, version:req.params.version})
        })
        .then( (data) => {
//--             console.log('calling DEL /package deletion failed: 4',data)
//--             console.log('calling DEL /package deletion failed: 4',err)
            res.status(200).send({
                action:'DELETE',
                name:req.params.name,
                version:req.params.version,
                success:true,
            });
//--             console.log('calling DEL /package deletion failed: 5')
        }).catch((err) => {
//--             console.log('calling DEL /package deletion failed: 6')
//--             console.log('DEL /package deletion failed: ',err)
            next(new Error('DEL /package deletion failed: '+err));
        });

    }

//--     // SUGAR / CRUFT
//--     function get_dependencies(req,res,next){
//--         if(!Object.keys(req.query).length){
//--             res.status(404).send("Missing query parameters");
//--             return ;
//--         }
//-- 
//--         return Promise.resolve(calculate_dependencies(req.query,config.dependency_repo))
//--             .then(function(data){
//--                 res.status(200).send(data);
//--             },function(err){
//--                 res.status(500).send(err.message);
//--             });
//--     }

    return router;

}


/*
 * 
export function router(config:repo_router_config){

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
    router.get('/',notify("list_packages: '/'"));
    if(config.query_credentials){router.get('/',config.query_credentials);}
    router.get('/',list_packages);

    router.get('/versions',notify("versions: '/versions'"));
    if(config.query_credentials){router.get('/versions',config.query_credentials);}
    router.get('/versions',versions);

    router.get('/:name/latest_version',notify("get_package: '/:name/'"));
    if(config.query_credentials){router.get('/:name/latest_version',config.query_credentials);}
    router.get('/:name/latest_version',latest_version);

    router.get('/:name/versions',notify("get_package: '/:name/'"));
    if(config.query_credentials){
        router.get('/:name/versions',config.query_credentials);
    }
    router.get('/:name/versions',package_versions);

    // QUERY ROUTES
    router.get('/:name/:versionRange',notify("fetch: '/:name/:versionRange'"));
    if(config.query_credentials){router.get('/:name/:versionRange',config.query_credentials);}
    router.get('/:name/:versionRange',fetch);

    router.get('/:name',notify("fetch: '/:name'"));
    if(config.query_credentials){router.get('/:name',config.query_credentials);}
    router.get('/:name',fetch);

    router.get('/:name/',notify("fetch: '/:name/'"));
    if(config.query_credentials){router.get('/:name/',config.query_credentials);}
    router.get('/:name/',fetch);

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


    // SUGAR / CRUFT 
    if(typeof config.dependency_repo !== 'undefined'){
        router.get('/resolve',notify("resolution-query: '/resolve'"));
        if(config.query_credentials){router.get('/resolve',config.query_credentials);}
        router.get('/resolve',get_dependencies);
    }

    //--------------------------------------------------
    // WRAPPER FUNCTIONS
    //--------------------------------------------------


    //------------------------------
    // ENUMERATION 
    //------------------------------

    function latest_version (req, res, next){
        Q.when(config.repository.latest_version(req.params.name)).then(function(v){
            res.status(200).send(v);
        },function(err){
            res.sendStatus(500);
        });
    }

    function package_versions (req, res, next){
        Q.when(config.repository.versions(req.params.name)).then(function(versions){
            res.status(200).send(versions);
        },function(err){
            res.sendStatus(500);
        });
    }

    function versions (req, res, next){
        Q.when(config.repository.versions()).then(function(versions){
            res.status(200).send(versions);
        },function(err){
            res.sendStatus(500);
        });
    }

    function list_packages (req, res, next){
        Q.when(config.repository.packages()).then(function(packages){
            res.status(200).send(packages);
        },function(err){
            res.sendStatus(500);
        });
    }

    //------------------------------
    // CRUD
    //------------------------------

    function fetch (req, res,next) {
        Q.when(config.repository.fetch({name:req.params.name, version:req.params.versionRange}))
                .then( 
                    function(data){
                        res.status(200).send({
                            name:req.params.name,
                            version:req.params.versionRange,
                            contents:data,
                        });
                    },
                    function(err){
                        next(new Error('GET /package get failed with error message: '+err.message));
                    });
    }

    function create (req, res, next) {
        Q.fcall(function(){
            console.log('router create received body: ',req.body)
            console.log('router create received body.package: ',req.body.package)
            return config.repository.create({name:req.params.name, version:req.params.version},
                    req.body.package);
        }).then( 
              function(data){
                  res.status(200).send({
                      action:'ADD',
                      name:req.params.name,
                      version:req.params.version,
                      success:true,
                  });
              },
              function(err){
                  next(err);
              });
    }


    function update (req, res, next) {

        Q.when(config.repository.update({name:req.params.name, version:req.params.version}, req.body.package))
                .then( 
                    function(data){
                        res.status(200).send({
                            action:'UPDATE',
                            name:req.params.name,
                            version:req.params.version,
                            success:true,
                        });
                    },
                    function(err){
                        next(new Error('PUT /package update failed: '+err));
                    });

    }

    function del (req, res, next) {

        Q.when(config.repository.del({name:req.params.name, version:req.params.version}))
                .then( 
                    function(data){
                        res.status(200).send({
                            action:'DELETE',
                            name:req.params.name,
                            version:req.params.version,
                            success:true,
                        });
                    },
                    function(err){
                        next(new Error('DEL /package deletion failed: '+err));
                    });

    }

    // SUGAR / CRUFT
    function get_dependencies(req,res,next){
        if(!Object.keys(req.query).length){
            res.status(404).send("Missing query parameters");
            return ;
        }

        Q.when(calculate_dependencies(req.query,config.dependency_repo)).then(function(data){
            res.status(200).send(data);
        },function(err){
            res.status(500).send(err.message);
        });
    }

    return router;

} 
 * */
