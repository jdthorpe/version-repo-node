
import {
    file_repo_config,
    deferred_repository,
    package_loc,
    fetch_opts,
    resource_data,
    bare_deferred_readable_repository} from "version-repo/src/typings"


import {calculate_dependencies, isPackageLoc, validate_options} from "version-repo"
import { mkdir, writeFile, readFile, readdir, stat, PathLike, access, existsSync, unlink, Stats} from "fs"
import * as path from 'path';
import * as semver from 'semver';
import * as mkdirp from 'mkdirp';
import * as Promise from "bluebird";


const _mkdirp = Promise.promisify(mkdirp);

const _readFile:((path: PathLike | number, options: { encoding?: string | null; flag?: string; } | string | undefined | null) =>  Promise<string | Buffer>) = 
        Promise.promisify(readFile);
const _writeFile:((path: PathLike | number, data: any, options: { encoding?: string | null; mode?: number | string; flag?: string; } | string | undefined | null) =>  Promise<void> )
        = Promise.promisify(writeFile);
const _unlink = Promise.promisify(unlink);
const _mkdir = Promise.promisify(mkdir);
const _readDir = Promise.promisify(readdir);
const _stat = Promise.promisify(stat);
const _access = Promise.promisify(access);


export class FileRepo implements deferred_repository<string> {

    constructor(public config:file_repo_config){

        if(!existsSync(config.directory)){
            throw new Error('no such directory: ' +config.directory);
        }

    }

    // ------------------------------
    // CRUD
    // ------------------------------
    create(options:resource_data<string>):Promise<boolean>{

        var loc:package_loc;
        try{ 
            loc = validate_options(options);
        }catch(e){ 
            return Promise.reject(e) 
        }

        const dir_name:string = this.get_path(loc);
        //console.log(existsSync(this.config.directory)?"it's all good":"adfofhlajhfkhalf;")

        return this.latest_version(loc.name)
                .catch(err => undefined)
                .then( (latest_version:string) => {

                    //console.log("latest_version: ", latest_version)
                    if(latest_version){
                        if(options.upsert){
                            if(latest_version && semver.gt(latest_version, loc.version)){
                                var err = new Error(`Version (${loc.version}) preceeds the latest version (${latest_version})`)
                                return Promise.reject(err)
                            }
                        }else{
                            if(latest_version && semver.gte(latest_version, loc.version)){
                                var err = new Error(`Version (${loc.version}) does not exceed the latest version (${latest_version})`)
                                return Promise.reject(err)
                            }
                        }
                    }

                    return _mkdirp(dir_name).catch((err) => {
                                    if(err && err.code !== 'EEXIST') {
                                        err.message = 
                                            `Failed to create directory local directory '${dir_name}' with error message: ${err.message}`;
                                        throw err;
                            }})
                }).then( (x:any) => {

                    //console.log('**************************** writing :  '+pkg)
                    //console.log('**************************** to:  '+fd)

                    if(!options.depends){
                        return _writeFile(this.get_path(loc,"value"), 
                                            options.value,
                                            {flag:"w",encoding : 'utf8'}).then((x:any)=>true );
                    }else{
                const value_path = this.get_path(loc,"value");
                const depends_path = this.get_path(loc,"depends");
                        return Promise.all([
                            _writeFile(value_path, options.value, {flag:"w",encoding : 'utf8'}),
                            _writeFile(depends_path, JSON.stringify(options.depends), {flag:"w",encoding : 'utf8'}),
                        ]).then((x:any)=>true );
                    }

                })//.catch(e => {if(e)console.log(e.message) ; throw e})

    }

    fetchOne(options:package_loc,opts?:fetch_opts):Promise<resource_data<string>>{

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

        if(!!opts && opts.novalue){
            return  versionPromise.then( (version: string) => {
                // return the package
                var file_path = this.get_path({name:options.name, version:version},"depends");
                //console.log('**************************** reading file :  '+file_path)
                return _readFile(file_path, {encoding : 'utf8'})
                    .then((x:string) => {
                        return {
                            name:options.name,
                            version:version,
                            depends: JSON.parse(x),
                        }
                    }).catch((err) => { 

                        if(err.message.startsWith('ENOENT: no such file or directory')){
                            return {
                                    name:options.name,
                                    version:version,
                                }
                        }else{
                            throw err;
                        }
                    });
            }) 
        }else{
            return  versionPromise.then( (version: string) => {
                // return the package
                const value_path = this.get_path({name:options.name, version:version},"value");
                const depends_path = this.get_path({name:options.name, version:version},"depends");
                //console.log("fetching value: ", value_path)
                //console.log("fetching depends: ", depends_path)
                //console.log('**************************** reading file :  '+file_path)
                return Promise.all(
                        [
                            _readFile(value_path, {encoding : 'utf8'})
                                //.tap(x => console.log("hi" ,x))
                                .catch((err) => {
                                    if(err) {
                                        err.message = 
                                            `Failed to retrieve resource from '${value_path}' with error message: ${err.message}`;
                                        throw err;
                                    }}),
                            _readFile(depends_path, {encoding : 'utf8'})
                                //.tap(x => console.log("bye" ,x))
                                .catch((err) => { 
                                    //console.log("no dependencies");
                                    return undefined}),
                        ])

                    .then(x => {
                        if(x[1]){
                        //console.log("about to parse: ",x)
                            return {
                                name:options.name,
                                version:version,
                                value: (<string>x[0]),
                                depends: JSON.parse((<string>x[1])),
                            }
                        }else{
                            return {
                                name:options.name,
                                version:version,
                                value: (<string>x[0]),
                            }
                        }
                    });
            }) }

    }


    fetch(query:package_loc|package_loc[],opts?:fetch_opts):Promise<resource_data<string>[]>{
       
        if(Array.isArray(query)){

            const names = query.map(x => x.name);
            return this.depends(query)
                    .then(pkgs => 
                            Promise.all(pkgs
                                        .filter(x => (opts && opts.dependencies) || names.indexOf(x.name) != -1)
                                        .map(pkg => this.fetchOne(pkg,opts)))
                    )

        }else if(opts && opts.dependencies){
            return this.depends([query])
                    .then(pkgs => Promise.all(pkgs.map(x => this.fetchOne(x,opts))));
        }else{
            return this.fetchOne(query,opts).then(x => [x]);
        }
        
    }

    update(options:resource_data<string>):Promise<boolean>{

        if(this.config.update == "none"){
            return Promise.reject( new Error("updates are disableed in this repository"));
        }

        // VALIDATE THE NAME AND VERSION
        var loc:package_loc;
        try{ 
            loc = validate_options(options);
        }catch(e){ 
            return Promise.reject(e) 
        }

        // VERIFY THE VERSION IS UPDATABLE
        var out;
        if(this.config.update === undefined || this.config.update == "latest"){
            out = this.latest_version(loc.name)
                    .then((latest_version:string )=>{
                        if(semver.neq(latest_version, loc.version))
                            throw new Error("Only the most recent version of a package may be updated");
                        return true;
                    })

        }else{ 
            out = Promise.resolve(true);
        }

        return out.then( _ => {
            var value_path:string = this.get_path(loc,"value"),
                depends_path:string = this.get_path(loc,"depends");
            // THE ACTUAL WORK

            return Promise.all([
                // write the value
                _writeFile(value_path, 
                                options.value, 
                                {flag:"w",encoding : 'utf8'}),

                // write or delete the dependencies
                options.depends === undefined ? 
                    _unlink(depends_path).catch(e => {/* pass */}):
                    _writeFile(depends_path, 
                               JSON.stringify(options.depends), 
                               {flag:"w",encoding : 'utf8'}),
            ]).then(x => true)
        })
    }

    del(options:package_loc):Promise<boolean>{
        var loc
        try{ loc = validate_options(options);
        }catch(e){ return Promise.reject(e) }
        return Promise.all([
            _unlink(this.get_path(loc,"value")),
            _unlink(this.get_path(loc,"depends")).catch(e => {/* pass */}),
        ])
                .then(() => true)
                .catch(e => {
                    throw new Error('No such pacakge or version')
                });
                
    }

    depends(x:package_loc|package_loc[]|{[key: string]:string}):Promise<package_loc[]>{

        var bare_repo:bare_deferred_readable_repository = {
            fetchOne: (request:package_loc,opts:fetch_opts) => this.fetchOne(request,{novalue:true}),
            versions: (name:string) => this.versions(name)
        }

        if(Array.isArray(x)){
            return calculate_dependencies(x,bare_repo);
        }if(isPackageLoc(x)){
            return calculate_dependencies([x],bare_repo);
        }else{
            var y:package_loc[] =  
                Object.keys(x) 
                        .filter(y => x.hasOwnProperty(y))
                        .map(y => { return {name:y,version:x[y]} })
            return calculate_dependencies(y,bare_repo);
        }
 
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
        return _readDir(this.config.directory)
            .then(function(pkg_names:string[]){
                return Promise.all( 
                        pkg_names.map(function(_name:string){
                            return _stat(path.join(self.config.directory,_name))
                                .then(function(x:Stats):(boolean|Promise<boolean>){
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
            return _readDir(path.join(this.config.directory,pkg))
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
                                return _stat(path.join(self.config.directory,pkg,x))
                                    .then(function(x:Stats){
                                        return x.isDirectory();
                                    });
                            })).then(mask => {
                                //TODO: check that this indexing error isn't copied elsewhere.. (i.e.`i > 0` instead of `i >= 0` )
                    //console.log(pkg,": mask1: ",mask)
                    //console.log(pkg,": file_names: ",file_names)
                    //console.log(pkg,": ",self.config.directory)
                    //console.log(pkg)
                                for(var i = mask.length - 1; i >= 0 ; i--){
                                    if(!mask[i])
                                        file_names.splice(i,1);
                                }
                                const ext = self.config.ext ? self.config.ext : "";
                    //console.log(pkg,": ",ext)
                    //console.log(pkg,": ","file_names: ",file_names)
                                return Promise.all(file_names
                                                        .map(x => 

                            _access(path.join(self.config.directory, pkg, x, "value" + ext))
                            .then(function(x){return true;})
                            .catch(function(err){
                                if (err.code === 'ENOENT') {
                                    //console.error('myfile does not exist');
                                    return false;
                                }

                                throw err;
                            })
));

                            }).then(mask => {
                    //console.log(pkg,": ","mask2: ",mask)
                    //console.log(pkg,": ","file_names: ",file_names)
                                for(var i = mask.length - 1; i >= 0 ; i--){
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

    get_path(options:package_loc,attr?:"depends"|"value"){
        if(!options.version){
            throw new Error("Missing 'Version' attribute.");
        }
        const ext = (attr === "depends"? 
                        ".json" : 
                        (this.config.ext?this.config.ext:""));
        var version:string = semver.valid(options.version);
        if(!version){
            throw new Error("Invalid version foo: " +options.version);
        }

        const dir = path.join(this.config.directory, options.name, 'v' + version);
        if(!attr){ return dir; }
        if(attr === "value"){ return path.join(dir, attr + ext); }
        return path.join(dir, "depends.json");
    }

}

