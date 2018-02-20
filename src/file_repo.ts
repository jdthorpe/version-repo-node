
import {file_repo_config, deferred_repository, package_loc, resource_data} from "version-repo/src/typings"

import fs = require('fs');
import path = require('path');
import semver = require('semver');
import * as Promise from "bluebird";


//-- const readFile = Promise.promisify(fs.readFile);
const mkdir = Promise.promisify(fs.mkdir);
const writeFile = Promise.promisify(fs.writeFile);
const readDir = Promise.promisify(fs.readdir);
const stat = Promise.promisify(fs.stat);

export class FileRepo implements deferred_repository<string> {

    constructor(public config:file_repo_config){

        if(!fs.existsSync(config.directory)){
            throw new Error('no such directory: ' +config.directory);
        }

    }

    // ------------------------------
    // CRUD
    // ------------------------------
    create(options:package_loc,pkg:string):Promise<boolean>{

//--         console.log('**************************** received :  '+pkg)
//--         console.log('**************************** at :  ',options)
        // the output promise

        const dir_name:string = path.join(this.config.directory,options.name);

        return new Promise((resolve,reject) => {

            if(!options.version)
                throw new Error("Version parameter is required to create a package");

            // CREATE THE DIRECTORY IF IT DOES NOT ALREADY EXIST
            resolve( mkdir(dir_name))

        })
        .catch((err) => {
            if(err && err.code !== 'EEXIST') {
                err.message = 
                    `Failed to create directory local directory '${dir_name}' with error message: ${err.message}`;
                throw err;
            }else{
                return true;
            }
        })
        .then( () => this.latest_version(options.name) )
        .then( (latest_version:string) => {

            if(options.upsert){
                if(latest_version && semver.gt(latest_version, options.version))
                    throw new Error(`Version (${options.version}) preceeds the latest version (${latest_version})`)
            }else{
                if(latest_version && semver.gte(latest_version, options.version))
                    throw new Error(`Version (${options.version}) does not exceed the latest_version (${latest_version})`)
            }

            const file_path:string = this.compute_file_name(options);
            //console.log('**************************** writing :  '+pkg)
            //console.log('**************************** to:  '+fd)

//--             return  writeFile( fd, pkg, {
//--                         flag:options.upsert?"w":"wx",
//--                         encoding : 'utf8'
//--                     })
            return new Promise( (resolve,reject) => {
                fs.writeFile(file_path, pkg, {flag:"w",encoding : 'utf8'} ,
                             function(err){
                                 if(err) reject(err);
                                 else resolve(true);
                             });
            })

        }).then(()=>true );

    }

//--     // exists is like fetch() but returns a boolean, not a package
//--     exists(options:package_loc){
//-- 
//--         // VALIDATE THE OPTIONS
//--         //needed? options = this.validate_options_range(options);
//-- 
//--         // DOES THE PACKAGE EXIST?
//--         if(!fs.existsSync(path.join(this.config.directory,options.name))){// is there a package container?
//--             return false;
//--         }
//-- 
//--         // ARE THERE ANY CONTENTS?
//--         var versions:string[] = this.versions(options.name);
//--         if(!versions.length){ 
//--             return false;
//--         }
//-- 
//--         // DOES THE SPECIFIC VERSION EXIST?
//--         if(options.version){
//--             var key:string = semver.maxSatisfying(versions, options.version);
//--             return !!key;
//--         } 
//--         return true;
//--     }



    fetch(options:package_loc):Promise<resource_data<string>>{

//--         console.log('**************************** fetching :  ',options)
        var versionPromise: Promise<string>;
        if(options.version){
            versionPromise = this.versions(options.name)
                .then((versions:string[]) => {
                    //console.log('versions: '+JSON.stringify(versions))
                    var version =  semver.maxSatisfying(versions,options.version);
                    if(!version){
                        throw new Error("No such version: " +options.version);
                    }
                    return version;
                })
        }else{
            versionPromise =  this.latest_version(options.name)
        }
        
        return  versionPromise.then( (version: string) => {
            // return the package
            var file_path = this.compute_file_name({name:options.name,
                                                          version:version});
            //console.log('**************************** reading file :  '+file_path)
            return new Promise<resource_data<string>>((resolve,reject) => {
                fs.readFile(file_path, 
                            {encoding : 'utf8'},
                            (err,data:string) => {
                        //console.log('**************************** read :  '+data)
                        if(err) reject(err)
                        else resolve( {
                            name:options.name,
                            version:version,
                            object: data,
                        })
                    });
            })
        });
        
    }

    update(options:package_loc,data:string):Promise<boolean>{

        // VALIDATE THE OPTIONS
        //needed? options = this.validate_options(options);
        return this.latest_version(options.name)
                .then((latest_version:string )=>{

            if(semver.neq(latest_version, options.version))
                throw new Error("Only the most recent version of a package may be updated");

            var file_path:string = 
                    this.compute_file_name({name:options.name,
                                            version:options.version});

            // THE ACTUAL WORK
            return new Promise<boolean>((resolve,reject) => {
                fs.writeFile(file_path, data, {flag:"w",encoding : 'utf8'} ,
                             (err) => {
                                 if(err) reject(err);
                                 else resolve(true);
                             })
            })
            
        })

    }

    del(options:package_loc):Promise<boolean>{

        return new Promise<boolean>((resolve,reject) => {
            fs.unlink(this.compute_file_name(options),
                    function(err){
                        if(err) 
                            reject(new Error('No such pacakge or version'));
                        else
                            resolve(true);
                    });
        })
    }

    // ------------------------------
    // utilities
    // ------------------------------

    latest_version(name:string,filter?:string){
        if(typeof name !== 'string')
            throw new Error("Missing or invalid name parameter")
        return this.versions(name)
            .then(function(versions){
                return semver.maxSatisfying(versions,
                        filter?filter:'>=0.0.0');
            });
    }

    // return a list of available packages
    packages ():Promise<string[]>{
        var self = this;
        return readDir(this.config.directory)
            .then(function(pkg_names:string[]){
                return Promise.all( 
                        pkg_names.map(function(_name:string){
                            return stat(path.join(self.config.directory,_name))
                                .then(function(x:fs.Stats):(boolean|Promise<boolean>){
                                    if(!x.isDirectory())
                                        return false;
                                    return self.versions(_name)
                                        .then(function(x){return !!x.length});
                                });
                        })).then(function(mask){
                            for(var i:number = pkg_names.length; i > 0 ; i--){
                                if(!mask[i-1]){
                                    pkg_names.splice(i-1,1);
                                }
                            }
                            return pkg_names;
                        });
            });
    }

    // return a list of available versions for a packages
    versions():Promise<{[x:string]:string[]}>;
    versions(name:string):Promise<string[]>;
    versions(pkg?:string):Promise<{[x:string]:string[]}> | Promise<string[]>{ 
        if(typeof pkg === 'undefined'){

            var self = this;
            var out:{[x:string]:string[]} = {};
            return this.packages() 
                .then(names => {
                    return Promise.all(
                            names.map(
                                (name) => {
                                    return self.versions(name)
                                        .then((versions) => {
                                            out[name]= versions;
                                            return true;
                                        });
                                }))})
                .then( (x) => {return out;});

        }else{

            var self = this;
            return readDir(path.join(this.config.directory,pkg))
                .catch((e) => {
                    if(typeof e.message === 'string' && 
                            e.message.startsWith('ENOENT: no such file or directory')){
                        throw new Error("No such resource: " + pkg);
                    }else {
                        throw e;
                    }
                })
                .then(function(file_names:string[]){
                    file_names = file_names.filter(function(x){
                        if(self.config.ext){
                            var split = Math.max(0,x.length - self.config.ext.length),
                                version_part = x.slice(0,split),
                                suffix_part = x.slice(split,x.length);
                            return suffix_part === self.config.ext && // x.endsWith(self.config.ext) && 
                                semver.valid(version_part)
                        }else{
                            return semver.valid(x)
                        }
                    })
                    return Promise.all( 
                            file_names.map(function(x){
                                // RETURN ONLY FILES
                                return stat(path.join(self.config.directory,pkg,x))
                                    .then(function(x:fs.Stats){
                                        return x.isFile();
                                    });
                            })).then(function(mask){
                                for(var i = pkg.length - 1; i > 0 ; i--){
                                    if(!mask[i])
                                        file_names.splice(i,1);
                                }
                                return file_names.map(function(x){

                                    if(self.config.ext){
                                        return semver.clean(x.slice(0,x.length - self.config.ext.length)) ;
                                    }else{
                                        return semver.clean(x)
                                    }

                                });
                            });
                });
        }
    }

    //------------------------------
    // REPO SPECIFIC UTILS
    //------------------------------

    // return the file name of a given package 
    get_file_name(options:package_loc){
        var self = this;
        if(options.version){
            return this.versions(options.name)
                .then(function(versions){
                    var version = semver.maxSatisfying(versions,options.version);
                    if(!version) 
                        throw new Error('No compatibile version');
                    return path.join(options.name,
                            'v' + version + 
                            (self.config.ext?self.config.ext:""));
                });
        }
        // no version provided
        return this.latest_version(options.name)
            .then(function(version){
                return path.join(options.name, 
                        'v' + version + 
                        (self.config.ext?self.config.ext:""));
            });
    }

    compute_file_name(options:package_loc){
        if(!options.version){
            throw new Error("Missing 'Version' attribute.");
        }
        var version:string = semver.valid(options.version);
        if(!version){
            throw new Error("Invalid version foo: " +options.version);
        }
        return path.join(this.config.directory, 
                         options.name, 
                         'v' + version + 
                         (this.config.ext?this.config.ext:""));
    }

}

