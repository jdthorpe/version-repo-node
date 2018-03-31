"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var version_repo_1 = require("version-repo");
var fs_1 = require("fs");
var path = require("path");
var semver = require("semver");
var mkdirp = require("mkdirp");
var Promise = require("bluebird");
var _mkdirp = Promise.promisify(mkdirp);
var _readFile = Promise.promisify(fs_1.readFile);
var _writeFile = Promise.promisify(fs_1.writeFile);
var _unlink = Promise.promisify(fs_1.unlink);
var _mkdir = Promise.promisify(fs_1.mkdir);
var _readDir = Promise.promisify(fs_1.readdir);
var _stat = Promise.promisify(fs_1.stat);
var _access = Promise.promisify(fs_1.access);
var FileRepo = /** @class */ (function () {
    function FileRepo(config) {
        this.config = config;
        if (!fs_1.existsSync(config.directory)) {
            throw new Error('no such directory: ' + config.directory);
        }
    }
    // ------------------------------
    // CRUD
    // ------------------------------
    FileRepo.prototype.create = function (options) {
        var _this = this;
        var loc;
        try {
            loc = version_repo_1.validate_options(options);
        }
        catch (e) {
            return Promise.reject(e);
        }
        var dir_name = this.get_path(loc);
        //console.log(existsSync(this.config.directory)?"it's all good":"adfofhlajhfkhalf;")
        return this.latest_version(loc.name)
            .catch(function (err) { return undefined; })
            .then(function (latest_version) {
            //console.log("latest_version: ", latest_version)
            if (latest_version) {
                if (options.upsert) {
                    if (latest_version && semver.gt(latest_version, loc.version)) {
                        var err = new Error("Version (" + loc.version + ") preceeds the latest version (" + latest_version + ")");
                        return Promise.reject(err);
                    }
                }
                else {
                    if (latest_version && semver.gte(latest_version, loc.version)) {
                        var err = new Error("Version (" + loc.version + ") does not exceed the latest version (" + latest_version + ")");
                        return Promise.reject(err);
                    }
                }
            }
            return _mkdirp(dir_name).catch(function (err) {
                if (err && err.code !== 'EEXIST') {
                    err.message =
                        "Failed to create directory local directory '" + dir_name + "' with error message: " + err.message;
                    throw err;
                }
            });
        }).then(function (x) {
            //console.log('**************************** writing :  '+pkg)
            //console.log('**************************** to:  '+fd)
            if (!options.depends) {
                return _writeFile(_this.get_path(loc, "value"), options.value, { flag: "w", encoding: 'utf8' }).then(function (x) { return true; });
            }
            else {
                var value_path = _this.get_path(loc, "value");
                var depends_path = _this.get_path(loc, "depends");
                //console.log("writing value: ", value_path)
                //console.log("writing depends: ", depends_path)
                return Promise.all([
                    _writeFile(value_path, options.value, { flag: "w", encoding: 'utf8' }),
                    _writeFile(depends_path, JSON.stringify(options.depends), { flag: "w", encoding: 'utf8' }),
                ]).then(function (x) { return true; });
            }
        }); //.catch(e => {if(e)console.log(e.message) ; throw e})
    };
    FileRepo.prototype.fetchOne = function (options, opts) {
        var _this = this;
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
        if (!!opts && opts.novalue) {
            return versionPromise.then(function (version) {
                // return the package
                var file_path = _this.get_path({ name: options.name, version: version }, "depends");
                //console.log('**************************** reading file :  '+file_path)
                return _readFile(file_path, { encoding: 'utf8' })
                    .then(function (x) {
                    return {
                        name: options.name,
                        version: version,
                        depends: JSON.parse(x),
                    };
                });
            });
        }
        else {
            return versionPromise.then(function (version) {
                // return the package
                var value_path = _this.get_path({ name: options.name, version: version }, "value");
                var depends_path = _this.get_path({ name: options.name, version: version }, "depends");
                //console.log("fetching value: ", value_path)
                //console.log("fetching depends: ", depends_path)
                //console.log('**************************** reading file :  '+file_path)
                return Promise.all([
                    _readFile(value_path, { encoding: 'utf8' })
                        .catch(function (err) {
                        if (err) {
                            err.message =
                                "Failed to retrieve resource from '" + value_path + "' with error message: " + err.message;
                            throw err;
                        }
                    }),
                    _readFile(depends_path, { encoding: 'utf8' })
                        .catch(function (err) {
                        //console.log("no dependencies");
                        return undefined;
                    }),
                ])
                    .then(function (x) {
                    if (x[1]) {
                        //console.log("about to parse: ",x)
                        return {
                            name: options.name,
                            version: version,
                            value: x[0],
                            depends: JSON.parse(x[1]),
                        };
                    }
                    else {
                        return {
                            name: options.name,
                            version: version,
                            value: x[0],
                        };
                    }
                });
            });
        }
    };
    FileRepo.prototype.fetch = function (query, opts) {
        var _this = this;
        if (Array.isArray(query)) {
            var names_1 = query.map(function (x) { return x.name; });
            return this.depends(query)
                .then(function (pkgs) {
                return Promise.all(pkgs
                    .filter(function (x) { return (opts && opts.dependencies) || names_1.indexOf(x.name) != -1; })
                    .map(function (pkg) { return _this.fetchOne(pkg, opts); }));
            });
        }
        else if (opts && opts.dependencies) {
            return this.depends([query])
                .then(function (pkgs) { return Promise.all(pkgs.map(function (x) { return _this.fetchOne(x, opts); })); });
        }
        else {
            return this.fetchOne(query, opts).then(function (x) { return [x]; });
        }
    };
    FileRepo.prototype.update = function (options) {
        var _this = this;
        // VALIDATE THE OPTIONS
        var loc;
        try {
            loc = version_repo_1.validate_options(options);
        }
        catch (e) {
            return Promise.reject(e);
        }
        return this.latest_version(loc.name)
            .then(function (latest_version) {
            if (semver.neq(latest_version, loc.version))
                throw new Error("Only the most recent version of a package may be updated");
            var file_path = _this.get_path({ name: loc.name,
                version: loc.version }, "value");
            //console.log("updating value: ", file_path)
            // THE ACTUAL WORK
            // TODO; need to write new dependencies
            // TODO; need to get rid of old dependencies
            return _writeFile(file_path, options.value, { flag: "w", encoding: 'utf8' }).then(function (x) { return true; });
        });
    };
    FileRepo.prototype.del = function (options) {
        var loc;
        try {
            loc = version_repo_1.validate_options(options);
        }
        catch (e) {
            return Promise.reject(e);
        }
        return Promise.all([
            _unlink(this.get_path(loc, "value")),
            _unlink(this.get_path(loc, "depends")).catch(function (e) { }),
        ])
            .then(function () { return true; })
            .catch(function (e) {
            throw new Error('No such pacakge or version');
        });
    };
    FileRepo.prototype.depends = function (x) {
        var _this = this;
        var bare_repo = {
            fetchOne: function (request, opts) { return _this.fetchOne(request, { novalue: true }); },
            versions: function (name) { return _this.versions(name); }
        };
        if (Array.isArray(x)) {
            return version_repo_1.calculate_dependencies(x, bare_repo);
        }
        if (version_repo_1.isPackageLoc(x)) {
            return version_repo_1.calculate_dependencies([x], bare_repo);
        }
        else {
            var y = Object.keys(x)
                .filter(function (y) { return x.hasOwnProperty(y); })
                .map(function (y) { return { name: y, version: x[y] }; });
            return version_repo_1.calculate_dependencies(y, bare_repo);
        }
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
        return _readDir(this.config.directory)
            .then(function (pkg_names) {
            return Promise.all(pkg_names.map(function (_name) {
                return _stat(path.join(self.config.directory, _name))
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
            return _readDir(path.join(this.config.directory, pkg))
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
                        return suffix_part === self.config.ext && // x.endsWith(self.config.ext) && 
                            semver.valid(version_part);
                    }
                    else {
                        return semver.valid(x);
                    }
                });
                return Promise.all(file_names.map(function (x) {
                    // RETURN ONLY FILES
                    return _stat(path.join(self.config.directory, pkg, x))
                        .then(function (x) {
                        return x.isDirectory();
                    });
                })).then(function (mask) {
                    //TODO: check that this indexing error isn't copied elsewhere.. (i.e.`i > 0` instead of `i >= 0` )
                    //console.log(pkg,": mask1: ",mask)
                    //console.log(pkg,": file_names: ",file_names)
                    //console.log(pkg,": ",self.config.directory)
                    //console.log(pkg)
                    for (var i = mask.length - 1; i >= 0; i--) {
                        if (!mask[i])
                            file_names.splice(i, 1);
                    }
                    var ext = self.config.ext ? self.config.ext : "";
                    //console.log(pkg,": ",ext)
                    //console.log(pkg,": ","file_names: ",file_names)
                    return Promise.all(file_names
                        .map(function (x) {
                        return _access(path.join(self.config.directory, pkg, x, "value" + ext))
                            .then(function (x) { return true; })
                            .catch(function (err) {
                            if (err.code === 'ENOENT') {
                                //console.error('myfile does not exist');
                                return false;
                            }
                            throw err;
                        });
                    }));
                }).then(function (mask) {
                    //console.log(pkg,": ","mask2: ",mask)
                    //console.log(pkg,": ","file_names: ",file_names)
                    for (var i = mask.length - 1; i >= 0; i--) {
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
    FileRepo.prototype.get_path = function (options, attr) {
        if (!options.version) {
            throw new Error("Missing 'Version' attribute.");
        }
        var ext = (attr === "depends" ?
            ".json" :
            (this.config.ext ? this.config.ext : ""));
        var version = semver.valid(options.version);
        if (!version) {
            throw new Error("Invalid version foo: " + options.version);
        }
        var dir = path.join(this.config.directory, options.name, 'v' + version);
        if (!attr) {
            return dir;
        }
        if (attr === "value") {
            return path.join(dir, attr + ext);
        }
        return path.join(dir, "depends.json");
    };
    return FileRepo;
}());
exports.FileRepo = FileRepo;
//# sourceMappingURL=file_repo.js.map