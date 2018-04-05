"use strict";
//-- const is_node:boolean = (typeof module !== 'undefined') && (module.exports);
Object.defineProperty(exports, "__esModule", { value: true });
var http = require("http");
var https = require('https');
var url = require("url");
var request = require("superagent-bluebird-promise");
//-- import request = require('superagent');
//-- var promise_plugin  = require( 'superagent-promise-plugin'); "superagent-promise-plugin": "^3.2.0"
var Promise = require("bluebird");
var semver = require("semver");
var version_repo_1 = require("version-repo");
//-- promise_plugin.Promise = require('bluebird');
var trailing_slash = /\/$/;
var leading_slash = /^\//;
var RemoteRepo = /** @class */ (function () {
    function RemoteRepo(params) {
        this.params = params;
        var protocol, hostname, address, port;
        if (params.app) {
            // BUILD THE SERVER
            var server = ('function' === typeof params.app)
                ? http.createServer(params.app)
                : params.app;
            if (typeof server.listen !== "function") {
                throw "Inisufficient parameters: app is not a function or server instance";
            }
            address = server.address();
            if (!address) {
                server.listen(0);
                address = server.address();
            }
            protocol = (server instanceof https.Server) ? 'https:' : 'http:';
            hostname = address.address;
            port = address.port;
            if (hostname === '0.0.0.0' || hostname === '::') {
                hostname = '127.0.0.1';
            }
            this.base_url = protocol + '//' + hostname + ':' + port;
            if (params.base_url) {
                this.base_url += "/" + params.base_url.replace(/^\//, "");
            }
        }
        else if (params.server_config) {
            if (typeof params.server_config === 'string') {
                var url_parts = url.parse(params.server_config);
                protocol = url_parts.protocol;
                hostname = url_parts.hostname;
                port = url_parts.port;
            }
            else {
                protocol = params.server_config.protocol;
                hostname = params.server_config.hostname;
                port = params.server_config.port;
            }
            this.base_url = protocol + '//' + hostname;
            if (port) {
                this.base_url += ':' + port;
            }
            if (params.base_url) {
                this.base_url += "/" + params.base_url.replace(/^\//, "");
            }
        }
        else {
            this.base_url = !!params.base_url ? params.base_url : "";
        }
    }
    //--     // connection
    //--     connect(){
    //-- 
    //--         // this rediculus code is to trick typescript into compiling without error
    //--         var x = true;
    //--         if(x){
    //--             throw Error('Connect method not implented.')
    //--         }
    //--         return Promise.resolve(x);
    //--     }
    //-- 
    //--     is_connected(){
    //-- 
    //--         return request.get( this._build_url({name:'/' }))   // TODO: I'm just not sure how well this plan was thought through.
    //--             .then(function(res){ return true; })
    //--             .catch(function (err) {
    //--                 return false;  // TODO: I'm just not sure how well this plan was thought through.
    //--             });
    //-- 
    //--     }
    // ------------------------------
    // CRUD
    // ------------------------------
    RemoteRepo.prototype.create = function (options) {
        var _this = this;
        // validate the options
        return new Promise(function (resolve) {
            resolve(version_repo_1.validate_options(options));
        })
            .then(function (loc) {
            return request.post(_this._build_url(loc))
                .send({
                value: options.value,
                depends: options.depends
            })
                .then(function (response) {
                return true;
            })
                .catch(function (err) {
                var msg;
                try {
                    msg = err.body.error;
                }
                catch (err) {
                    msg = "Unknown Server Error";
                }
                throw new Error(msg);
            });
        });
    };
    RemoteRepo.prototype.update = function (options) {
        var _this = this;
        return new Promise(function (resolve) {
            resolve(version_repo_1.validate_options(options));
        })
            .then(function (loc) {
            return request.put(_this._build_url(loc))
                .send({ value: options.value, depends: options.depends })
                .then(function (response) {
                return true;
            })
                .catch(function (err) {
                var msg;
                try {
                    msg = err.body.error;
                }
                catch (err) {
                    msg = "Unknown Server Error";
                }
                throw new Error(msg);
            });
        });
    };
    RemoteRepo.prototype.del = function (options) {
        var _this = this;
        return new Promise(function (resolve) {
            resolve(version_repo_1.validate_options(options));
        })
            .then(function (loc) {
            return request.del(_this._build_url(loc))
                .then(function (response) {
                return true;
            })
                .catch(function (err) {
                throw new Error("Failed to delete package " + options.name + " with message " + err.text); // the full response object
            });
        });
    };
    RemoteRepo.prototype.depends = function (options) {
        return Promise.reject("not implemented");
    };
    RemoteRepo.prototype.fetch = function (query, opts) {
        return request.get(this.base_url.replace(trailing_slash, "") + "/")
            .send({ method: "fetch", args: [query, opts] })
            .then(function (response) {
            if (!response.body) {
                throw new Error("No response body.");
            }
            if (!response.body.value) {
                throw new Error("Request failed to return the `value` attribute.");
            }
            return response.body;
        })
            .catch(function (err) {
            throw new Error("Request failed with message " + err.text); // the full response object
        });
    };
    RemoteRepo.prototype.fetchOne = function (query, opts) {
        //--         if(1==1)
        //--             return Promise.reject("opts.novalue not implemented");
        //return Promise.reject("not implemented");
        var _this = this;
        return Promise.resolve(version_repo_1.validate_options_range(query))
            .then(function (options) {
            return request.get(_this._build_url(options))
                .send({ method: "fetchOne", args: [options, opts] })
                .then(function (response) {
                if (!response.body.contents) {
                    throw new Error("Request failed to return the `contents` attribute.");
                }
                var contents = response.body.contents;
                if (options.name !== contents.name) {
                    throw new Error("'response.contents.name' (" + contents.name + ") differes from the requested resource name (" + options.name + ").");
                }
                if (typeof options.version === 'string' &&
                    !semver.satisfies(contents.version, options.version)) {
                    throw new Error("'response.contents.version' (" + contents.version + ") does not match the requested version (" + options.version + ").");
                }
                return contents;
            })
                .catch(function (err) {
                console.log("fetch one error: ", err);
                throw new Error("Failed to retrieve package " + options.name + " with message " + err.text); // the full response object
            });
        });
    };
    RemoteRepo.prototype.resolve_versions = function (versions) {
        return request.get(this._build_url({ name: 'resolve' }))
            .query(versions)
            .then(function (response) {
            return response.body;
        })
            .catch(function (err) {
            throw new Error("Failed to resolve package versions for packages:  " + JSON.stringify(versions) + " with message " + err.text); // the full response object
        });
    };
    // ------------------------------
    // ENUMERATION
    // ------------------------------
    RemoteRepo.prototype.latest_version = function (name) {
        return request.get(this._build_url({ name: name, version: 'latest_version' }))
            .then(function (response) {
            return response.body;
        })
            .catch(function (err) {
            throw new Error("Failed to fetch latest version for packages:  " + name + " with message " + err.text); // the full response object
        });
    };
    // return a list of available packages
    RemoteRepo.prototype.packages = function () {
        return request.get(this._build_url({ name: "/" }))
            .set('Accept', 'application/json')
            .then(function (res) {
            return res.body;
        })
            .catch(function (err) {
            throw new Error("Failed to acquire package"); // the full response object
        });
    };
    RemoteRepo.prototype.versions = function (name) {
        // TODO: I'm just not sure how well this plan was thought through.
        var url_object = (typeof name === 'undefined') ?
            { name: "versions" } :
            { name: name, version: "versions" };
        return request
            .get(this._build_url(url_object))
            .then(function (response) { return response.body; })
            .catch(function (err) {
            throw new Error("Failed to acquire versions for package " + name + " with message " + err.text);
        });
    };
    // ------------------------------
    // UTILITIES
    // ------------------------------
    RemoteRepo.prototype._build_url = function (options) {
        var base = this.base_url;
        var URL = (base.replace(trailing_slash, "") +
            "/" +
            options.name
                .replace(trailing_slash, "")
                .replace(leading_slash, "") +
            ((!!options.version)
                ? "/" + options.version + (this.params.suffix ? this.params.suffix : '')
                : ''));
        return URL;
    };
    return RemoteRepo;
}());
exports.RemoteRepo = RemoteRepo;
;
/*
 *
export class RemoteRepo<T> implements deferred_repository<T> {

    base_url:string;
    constructor(public params:remote_repo_config){

        var protocol, hostname,address,port;
        if(params.app){

            // BUILD THE SERVER
            var server = ('function' === typeof params.app)
                    ? http.createServer(params.app)
                    : params.app;
            if(typeof server.listen !== "function"){
                throw "Inisufficient parameters: app is not a function or server instance";
            }
            address = server.address();
            if (!address) {
                server.listen(0);
                address = server.address();
            }

            protocol = (server instanceof https.Server) ? 'https:' : 'http:';
            hostname = address.address;
            port = address.port;
            if (hostname === '0.0.0.0' || hostname === '::') {
                hostname = '127.0.0.1';
            }

            this.base_url = protocol + '//' + hostname + ':' + port ;

            if(params.base_url){
                this.base_url += "/" + params.base_url.replace(/^\//,"");
            }

        }else if(params.server_config){
            
            if(typeof params.server_config === 'string'){
                var url_parts = url.parse(params.server_config);
                protocol = url_parts.protocol;
                hostname = url_parts.hostname;
                port = url_parts.port;
            }else{
                protocol = params.server_config.protocol;
                hostname = params.server_config.hostname;
                port = params.server_config.port;
            }

            this.base_url = protocol + '//' + hostname;

            if(port){ this.base_url += ':' + port }

            if(params.base_url){ this.base_url += "/" + params.base_url.replace(/^\//,""); }

        }else{
            this.base_url = !!params.base_url?params.base_url: "";
        }

    }

    // connection
    connect(){

        // this rediculus code is to trick typescript into compiling without error
        var x = true;
        if(x){
            throw Error('Connect method not implented.')
        }
        return Q.when(x);
    }

    is_connected(){

        return request.get( this._build_url({name:'/'    // TODO: I'm just not sure how well this plan was thought through.
            }))
            .use(promise_plugin)
            .then(function(res){
                return true;
            })
            .catch(function (err) {
                return false;  // TODO: I'm just not sure how well this plan was thought through.
            });

    }

    // ------------------------------
    // CRUD
    // ------------------------------

    create(options:package_loc,pkg:T){

        // validate the options
        try{
            options = validate_options(options);
        }catch(err){
            var deferred = Q.defer();
            deferred.reject(err);
            return deferred.promise;
        }

        return request.post( this._build_url(options))
            .send({package:pkg})
            .use(promise_plugin)
            .then(function (response) {
                return true;
            })
            .catch(function (err) {// the full response object
                var msg;
                try{
                    msg = err.response.body.error;
                }catch(err){
                    msg = "Unknown Server Error"
                }
                throw new Error(msg);
            });

    }

    update(options:package_loc,pkg:T){

        // validate the options
        try{
            options = validate_options(options);
        }catch(err){
            var deferred = Q.defer();
            deferred.reject(err);
            return deferred.promise;
        }

        return request.put( this._build_url(options))
            .send({package:pkg})
            .use(promise_plugin)
            .then(function (response) {
                return true;
            })
            .catch(function (err) {
                var msg;
                try{
                    msg = err.response.body.error;
                }catch(err){
                    msg = "Unknown Server Error"
                }
                throw new Error(msg);
            });

    }

    del(options:package_loc){

        // validate the options
        try{
            options = validate_options(options);
        }catch(err){
            var deferred = Q.defer();
            deferred.reject(err);
            return deferred.promise;
        }

        return request.del( this._build_url(options))
            .use(promise_plugin)
            .then(function (response) {
                return true;
            })
            .catch(function (err) {
                throw new Error( `Failed to delete package ${options.name} with message ${err.response.text}`); // the full response object
            });

    }

    fetch(options:package_loc){

        // validate the options
        try{
            options = validate_options_range(options);
        }catch(err){
            var deferred = Q.defer();
            deferred.reject(err);
            return deferred.promise;
        }

        return request.get( this._build_url(options))
            .use(promise_plugin)
            .then(function (response) {
                if(! response.body.contents){
                    throw new Error("Request failed to return the `contents` attribute.")
                }
                if(options.name !== response.body.contents.name){
                    throw new Error(`'response.contents.name' (${response.body.contents.name}) differes from the requested resource name (${options.name}).`)
                }
                if(typeof options.version === 'string' &&
                        !semver.satisfies(response.body.contents.version,options.version)){
                    throw new Error(`'response.contents.version' (${response.body.contents.version}) does not match the requested version (${options.version}).`)
                }
                return response.body.contents;
            })
            .catch(function (err) {
                throw new Error( `Failed to retrieve package ${options.name} with message ${err.response.text}`); // the full response object
            });
    }

    resolve_versions(versions:{[x:string]:string}){

        return request.get( this._build_url({name:'resolve'}))
            .query(versions)
            .use(promise_plugin)
            .then(function (response) {
                return response.body;
            })
            .catch(function (err) {
                throw new Error( `Failed to resolve package versions for packages:  ${JSON.stringify(versions)} with message ${err.response.text}`); // the full response object
            });

    }

    // ------------------------------
    // ENUMERATION
    // ------------------------------
    latest_version(name:string){

        return request.get( this._build_url({name:name,version:'latest_version'}))
            .use(promise_plugin)
            .then(function (response) {
                return response.body;
            })
            .catch(function (err) {
                throw new Error( `Failed to fetch latest version for packages:  ${name} with message ${err.response.text}`); // the full response object
            });

    }

    // return a list of available packages
    packages () {

        return request.get(this._build_url({name:"/"}))
            .set('Accept', 'application/json')
            .use(promise_plugin)
            .then(function (res) {
                return res.body;
            })
            .catch(function (err) {
                throw new Error( "Failed to acquire package"); // the full response object
            });

    }

    // return a list of available versions for a packages
    versions():Q.Promise<{[x:string]:string[]}>;
    versions(name:string):Q.Promise<string[]>;
    versions(name?:string):any{


        // TODO: I'm just not sure how well this plan was thought through.
        var url_object:package_loc = (typeof name === 'undefined')?
            {name:"versions"}:
            {name:name,version:"versions"};

        return request
            .get( this._build_url(url_object))
            .use(promise_plugin)
            .then(function (response) { return response.body; })
            .catch(function (err) {
                throw new Error( `Failed to acquire versions for package ${name} with message ${err.response.text}`);
            });

    }

    // ------------------------------
    // UTILITIES
    // ------------------------------
    _build_url(options:package_loc):string{
        var base = this.base_url;
        var URL =( base.replace(trailing_slash,"")+
                "/" +
                options.name
                    .replace(trailing_slash,"")
                    .replace(leading_slash,"") +
                
                ((!!options.version)
                 ?  "/" +options.version + (this.params.suffix?this.params.suffix:'')
                 :'')
                );
        return URL;
    }

}
 *
 *
 * */
//# sourceMappingURL=remote_repo.js.map