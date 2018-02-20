"use strict";
var fs = require('fs');
var path = require('path');
var semver = require('semver');
var Promise = require("bluebird");
//-- const readFile = Promise.promisify(fs.readFile);
var mkdir = Promise.promisify(fs.mkdir);
var writeFile = Promise.promisify(fs.writeFile);
var readDir = Promise.promisify(fs.readdir);
var stat = Promise.promisify(fs.stat);
var FileRepo = (function () {
    function FileRepo(config) {
        this.config = config;
        if (!fs.existsSync(config.directory)) {
            throw new Error('no such directory: ' + config.directory);
        }
    }
    // ------------------------------
    // CRUD
    // ------------------------------
    FileRepo.prototype.create = function (options, pkg) {
        //--         console.log('**************************** received :  '+pkg)
        //--         console.log('**************************** at :  ',options)
        // the output promise
        var _this = this;
        var dir_name = path.join(this.config.directory, options.name);
        return new Promise(function (resolve, reject) {
            if (!options.version)
                throw new Error("Version parameter is required to create a package");
            // CREATE THE DIRECTORY IF IT DOES NOT ALREADY EXIST
            resolve(mkdir(dir_name));
        })
            .catch(function (err) {
            if (err && err.code !== 'EEXIST') {
                err.message =
                    "Failed to create directory local directory '" + dir_name + "' with error message: " + err.message;
                throw err;
            }
            else {
                return true;
            }
        })
            .then(function () { return _this.latest_version(options.name); })
            .then(function (latest_version) {
            if (options.upsert) {
                if (latest_version && semver.gt(latest_version, options.version))
                    throw new Error("Version (" + options.version + ") preceeds the latest version (" + latest_version + ")");
            }
            else {
                if (latest_version && semver.gte(latest_version, options.version))
                    throw new Error("Version (" + options.version + ") does not exceed the latest_version (" + latest_version + ")");
            }
            var file_path = _this.compute_file_name(options);
            //console.log('**************************** writing :  '+pkg)
            //console.log('**************************** to:  '+fd)
            //--             return  writeFile( fd, pkg, {
            //--                         flag:options.upsert?"w":"wx",
            //--                         encoding : 'utf8'
            //--                     })
            return new Promise(function (resolve, reject) {
                fs.writeFile(file_path, pkg, { flag: "w", encoding: 'utf8' }, function (err) {
                    if (err)
                        reject(err);
                    else
                        resolve(true);
                });
            });
        }).then(function () { return true; });
    };
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
    FileRepo.prototype.fetch = function (options) {
        var _this = this;
        //--         console.log('**************************** fetching :  ',options)
        var versionPromise;
        if (options.version) {
            versionPromise = this.versions(options.name)
                .then(function (versions) {
                //console.log('versions: '+JSON.stringify(versions))
                var version = semver.maxSatisfying(versions, options.version);
                if (!version) {
                    throw new Error("No such version: " + options.version);
                }
                return version;
            });
        }
        else {
            versionPromise = this.latest_version(options.name);
        }
        return versionPromise.then(function (version) {
            // return the package
            var file_path = _this.compute_file_name({ name: options.name,
                version: version });
            //console.log('**************************** reading file :  '+file_path)
            return new Promise(function (resolve, reject) {
                fs.readFile(file_path, { encoding: 'utf8' }, function (err, data) {
                    //console.log('**************************** read :  '+data)
                    if (err)
                        reject(err);
                    else
                        resolve({
                            name: options.name,
                            version: version,
                            object: data,
                        });
                });
            });
        });
    };
    FileRepo.prototype.update = function (options, data) {
        var _this = this;
        // VALIDATE THE OPTIONS
        //needed? options = this.validate_options(options);
        return this.latest_version(options.name)
            .then(function (latest_version) {
            if (semver.neq(latest_version, options.version))
                throw new Error("Only the most recent version of a package may be updated");
            var file_path = _this.compute_file_name({ name: options.name,
                version: options.version });
            // THE ACTUAL WORK
            return new Promise(function (resolve, reject) {
                fs.writeFile(file_path, data, { flag: "w", encoding: 'utf8' }, function (err) {
                    if (err)
                        reject(err);
                    else
                        resolve(true);
                });
            });
        });
    };
    FileRepo.prototype.del = function (options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            fs.unlink(_this.compute_file_name(options), function (err) {
                if (err)
                    reject(new Error('No such pacakge or version'));
                else
                    resolve(true);
            });
        });
    };
    // ------------------------------
    // utilities
    // ------------------------------
    FileRepo.prototype.latest_version = function (name, filter) {
        if (typeof name !== 'string')
            throw new Error("Missing or invalid name parameter");
        return this.versions(name)
            .then(function (versions) {
            return semver.maxSatisfying(versions, filter ? filter : '>=0.0.0');
        });
    };
    // return a list of available packages
    FileRepo.prototype.packages = function () {
        var self = this;
        return readDir(this.config.directory)
            .then(function (pkg_names) {
            return Promise.all(pkg_names.map(function (_name) {
                return stat(path.join(self.config.directory, _name))
                    .then(function (x) {
                    if (!x.isDirectory())
                        return false;
                    return self.versions(_name)
                        .then(function (x) { return !!x.length; });
                });
            })).then(function (mask) {
                for (var i = pkg_names.length; i > 0; i--) {
                    if (!mask[i - 1]) {
                        pkg_names.splice(i - 1, 1);
                    }
                }
                return pkg_names;
            });
        });
    };
    FileRepo.prototype.versions = function (pkg) {
        if (typeof pkg === 'undefined') {
            var self = this;
            var out = {};
            return this.packages()
                .then(function (names) {
                return Promise.all(names.map(function (name) {
                    return self.versions(name)
                        .then(function (versions) {
                        out[name] = versions;
                        return true;
                    });
                }));
            })
                .then(function (x) { return out; });
        }
        else {
            var self = this;
            return readDir(path.join(this.config.directory, pkg))
                .catch(function (e) {
                if (typeof e.message === 'string' &&
                    e.message.startsWith('ENOENT: no such file or directory')) {
                    throw new Error("No such resource: " + pkg);
                }
                else {
                    throw e;
                }
            })
                .then(function (file_names) {
                file_names = file_names.filter(function (x) {
                    if (self.config.ext) {
                        var split = Math.max(0, x.length - self.config.ext.length), version_part = x.slice(0, split), suffix_part = x.slice(split, x.length);
                        return suffix_part === self.config.ext &&
                            semver.valid(version_part);
                    }
                    else {
                        return semver.valid(x);
                    }
                });
                return Promise.all(file_names.map(function (x) {
                    // RETURN ONLY FILES
                    return stat(path.join(self.config.directory, pkg, x))
                        .then(function (x) {
                        return x.isFile();
                    });
                })).then(function (mask) {
                    for (var i = pkg.length - 1; i > 0; i--) {
                        if (!mask[i])
                            file_names.splice(i, 1);
                    }
                    return file_names.map(function (x) {
                        if (self.config.ext) {
                            return semver.clean(x.slice(0, x.length - self.config.ext.length));
                        }
                        else {
                            return semver.clean(x);
                        }
                    });
                });
            });
        }
    };
    //------------------------------
    // REPO SPECIFIC UTILS
    //------------------------------
    // return the file name of a given package 
    FileRepo.prototype.get_file_name = function (options) {
        var self = this;
        if (options.version) {
            return this.versions(options.name)
                .then(function (versions) {
                var version = semver.maxSatisfying(versions, options.version);
                if (!version)
                    throw new Error('No compatibile version');
                return path.join(options.name, 'v' + version +
                    (self.config.ext ? self.config.ext : ""));
            });
        }
        // no version provided
        return this.latest_version(options.name)
            .then(function (version) {
            return path.join(options.name, 'v' + version +
                (self.config.ext ? self.config.ext : ""));
        });
    };
    FileRepo.prototype.compute_file_name = function (options) {
        if (!options.version) {
            throw new Error("Missing 'Version' attribute.");
        }
        var version = semver.valid(options.version);
        if (!version) {
            throw new Error("Invalid version foo: " + options.version);
        }
        return path.join(this.config.directory, options.name, 'v' + version +
            (this.config.ext ? this.config.ext : ""));
    };
    return FileRepo;
}());
exports.FileRepo = FileRepo;
//# sourceMappingURL=file_repo.js.map