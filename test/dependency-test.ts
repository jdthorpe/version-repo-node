
import chai = require("chai");
import chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
var expect = chai.expect;
import * as Promise from "bluebird"

//-- import {MemoryRepo} from "../src/memory_repo";

import { package_loc,
         sync_repository,
         deferred_repository,
         deferred_readable_repository} from "version-repo/src/typings"

import repo = require('../index');

var instances:{name:string,
                backend?:sync_repository<any> | deferred_repository<any> ,
                repo:sync_repository<any> | deferred_repository<any>|deferred_readable_repository<any> }[] = [  ] ;

instances.push({name: "Memory Repo", 
                repo: new repo.MemoryRepo()});
instances.push({name: "Memory Repo with trivial transform", 
                repo: new repo.sTransform(new repo.MemoryRepo(), (x => x), (x => x))});
instances.push({name: "Memory Repo with trivial async-transform", 
                repo: new repo.dTransform(new repo.MemoryRepo(), (x => x), (x => x))});
//--------------------------------------------------
var _backend:sync_repository<any> | deferred_repository<any> = new repo.MemoryRepo();
instances.push({name: "Memory Repo with trivial async-transform", 
                backend: _backend,
                repo: new repo.dTransform(_backend, (x => x), (x => x))});
_backend = null;
//--------------------------------------------------
_backend = new repo.MemoryRepo();
instances.push({name: "Memory Repo with trivial async-transform and buffer", 
                backend: _backend,
                repo: new repo.ReadonlyBuffer(new repo.dTransform(_backend, (x => x), (x => x)))});
_backend = null;



instances.map(inst => {

    const __backend__:sync_repository<any> | deferred_repository<any> = <sync_repository<any> | deferred_repository<any>>(inst.backend || inst.repo);
    const __repo__ = inst.repo;

//-- function init_repo():sync_repository<string>{
//-- 
//--     // create the testing repository.
//--     var repo= new MemoryRepo<string>();
//-- }

    describe(inst.name, function(){

        before(function(){
//            __repo__= new MemoryRepo<string>();
            return populate_repo(__backend__);
        })


        describe("repo.version()",function(){

            it("version(name) should return an array",function() {
                return Promise.all([
                    Promise.resolve(__repo__.versions("a")).then(Array.isArray).should.eventually.be.true,
                    Promise.resolve(__repo__.versions("b")).then(Array.isArray).should.eventually.be.true,
                    Promise.resolve(__repo__.versions("c")).then(Array.isArray).should.eventually.be.true,
                ]);
            });

            it("version() should return an dictionary of strings",function() {
                return Promise.resolve(__repo__.versions())
                        .then( x => {
                            (typeof x).should.equal("object");
                            var keys = Object.keys(x);
                            keys.length.should.equal(3);
                            expect(keys.indexOf("a")).to.not.equal(-1);
                            (typeof x["a"]).should.equal("object");
                            expect(Array.isArray(x["a"])).to.be.true;
                            expect(Array.isArray(x["b"])).to.be.true;
                            expect(Array.isArray(x["c"])).to.be.true;
                            expect(x["a"].indexOf("1.2.3")).to.not.equal(-1);
                            expect(x["b"].indexOf("1.1.4")).to.not.equal(-1);
                            expect(x["c"].indexOf("1.1.2")).to.not.equal(-1);
                        })
            });
        });

        describe("multiple version resolution",function(){

//--             var __repo__:sync_repository<string>;
//--             before(function(){
//--                 __repo__= new MemoryRepo<string>();
//--                 return populate_repo(__repo__);
//--             })

            it("should handle single packages with *no* dependencies.",function() {
                return Promise.resolve(__repo__.depends([{name:"a",version:"1.1.2"}]))
                        .should.eventually.deep.equal([{name:"a",version:"1.1.2"}]);
            });

            it("should handle single packages with *no* dependencies.",function() {
                return Promise.resolve(__repo__.depends([{name:"a",version:"~1.1.1"}]))
                        .should.eventually.deep.equal([{name:"a",version:"1.1.3"}]);
            });

            it("should handle single packages with *no* dependencies.",function() {
                return Promise.resolve(__repo__.depends([{name:"a",version:"~1.x"}]))
                        .should.eventually.deep.equal([{name:"a",version:"1.2.3"}]);
            });

            it("should handle single packages with dependencies.",function() {
                return Promise.resolve(__repo__.depends([{name:"b",version:"1.0.0"}]))
                        .should.eventually.deep.equal([{name:"b",version:"1.0.0"},
                                                       {name:"a",version:"1.0.0"}]);
            });
            it("should handle single packages with dependencies.",function() {
                return Promise.resolve(__repo__.depends([{name:"b",version:"1.1.1"}]))
                        .should.eventually.deep.equal([{name:"b",version:"1.1.1"},
                                                       {name:"a",version:"1.1.3"}]);
            });
            it("should handle single packages with dependencies.",function() {
                return Promise.resolve(__repo__.depends([{name:"b",version:"1.1.3"}]))
                        .should.eventually.deep.equal([{name:"b",version:"1.1.3"},
                                                       {name:"a",version:"1.1.2"}]);
            });
            it("should handle single packages with dependencies.",function() {
                return Promise.resolve(__repo__.depends([{name:"b",version:"1.1.4"}]))
                        .should.eventually.deep.equal([{name:"b",version:"1.1.4"},
                                                       {name:"a",version:"2.0.0"}]);
            });

            it("should error out on internlly inconsietent specifications .",function() {
                var request;
                try{
                    request = Promise.resolve(__repo__.depends([{name:"c",version:"1.1.3"}]))
                }catch(err){
                    request = Promise.reject(err)
                }
                return request.should.be.rejectedWith(/Version Conflict:/);
            });

            it("should error out with inconsietent arrays .",function() {
                var request;
                try{
                    request = Promise.resolve(__repo__.depends([{name:"a",version:"~1.1.1"},{name:"c",version:"~1.1.3"}]))
                }catch(err){
                    request = Promise.reject(err)
                }
                return request.should.be.rejectedWith(/Version Conflict:/);
            });
            it("should error out with inconsietent arrays .",function() {
                var request;
                try{
                    request = Promise.resolve(__repo__.depends([{name:"a",version:"~1.1.1"},{name:"b",version:"~1.1.4"}]))
                }catch(err){
                    request = Promise.reject(err)
                }
                return request.should.be.rejectedWith(/Version Conflict:/);
            });

            it("should reject confliced dependencies (previously accomodated both).",function() {
                var request;
                try{
                    request = Promise.resolve(__repo__.depends([{name:"a",version:"~1.1.1"},{name:"b",version:"~1.1.3"}]))
                }catch(err){
                    request = Promise.reject(err)
                }
                return request.should.be.rejectedWith(/Version Conflict:/);;
            });

        })

        describe("Fetch multiple version",function(){

//--             var __repo__:sync_repository<string>;
//--             before(function(){
//--                 __repo__= new MemoryRepo<string>();
//--                 return populate_repo(__repo__);
//--             })

            it("should handle single packages with *no* dependencies.",function() {
                return Promise.resolve(__repo__.fetch([{name:"a",version:"1.1.2"}],{dependencies:true}))
                        .then(x => x.map(y => {return {name:y.name,version:y.version,value:y.value};}))
                        .should.eventually.deep.equal([{name:"a",version:"1.1.2",value:"1.1.2"}]);
            });
            it("should handle single packages with *no* dependencies.",function() {
                return Promise.resolve(__repo__.fetch([{name:"a",version:"~1.1.1"}],{dependencies:true}))
                        .then(x => x.map(y => {return {name:y.name,version:y.version,value:y.value};}))
                        .should.eventually.deep.equal([{name:"a",version:"1.1.3",value:"1.1.3"}]);
            });
            it("should handle single packages with *no* dependencies.",function() {
                Promise.resolve(__repo__.fetch([{name:"a",version:"~1.x"}],{dependencies:true}))
                        .then(x => x.map(y => {return {name:y.name,version:y.version,value:y.value};}))
                        .should.eventually.deep.equal([{name:"a",version:"1.2.3",value:"1.2.3"}]);
            });

            it("should handle single packages with dependencies.",function() {
                return Promise.resolve(__repo__.fetch([{name:"b",version:"1.0.0"}],{dependencies:true}))
                        .then(x => x.map(y => {return {name:y.name,version:y.version,value:y.value};}))
                        .should.eventually.deep.equal([{name:"b",version:"1.0.0",value:"1.0.0"},
                                                       {name:"a",version:"1.0.0",value:"1.0.0"}]);
            });
            it("should handle single packages with dependencies.",function() {
                return Promise.resolve(__repo__.fetch([{name:"b",version:"1.1.1"}],{dependencies:true}))
                        .then(x => x.map(y => {return {name:y.name,version:y.version,value:y.value};}))
                        .should.eventually.deep.equal([{name:"b",version:"1.1.1",value:"1.1.1"},
                                                       {name:"a",version:"1.1.3",value:"1.1.3"}]);
            });
            it("should handle single packages with dependencies.",function() {
                return Promise.resolve(__repo__.fetch([{name:"b",version:"1.1.3"}],{dependencies:true}))
                        .then(x => x.map(y => {return {name:y.name,version:y.version,value:y.value};}))
                        .should.eventually.deep.equal([{name:"b",version:"1.1.3",value:"1.1.3"},
                                                       {name:"a",version:"1.1.2",value:"1.1.2"}]);
            });
            it("should handle single packages with dependencies.",function() {
                return Promise.resolve(__repo__.fetch([{name:"b",version:"1.1.4"}],{dependencies:true}))
                        .then(x => x.map(y => {return {name:y.name,version:y.version,value:y.value};}))
                        .should.eventually.deep.equal([{name:"b",version:"1.1.4",value:"1.1.4"},
                                                       {name:"a",version:"2.0.0",value:"2.0.0"}]);
            });

            it("should error out on internlly inconsietent specifications .",function() {
                var request;
                try{
                    request = Promise.resolve(__repo__.fetch([{name:"c",version:"1.1.3"}],{dependencies:true}))
                }catch(err){
                    request = Promise.reject(err)
                };
                return request.should.be.rejectedWith(/Version Conflict:/);
            });

            it("should error out with inconsietent arrays .",function() {
                var request;
                try{
                    request = Promise.resolve(__repo__.fetch([{name:"a",version:"~1.1.1"},{name:"c",version:"~1.1.3"}],{dependencies:true}))
                }catch(err){
                    request = Promise.reject(err)
                }
                return request.should.be.rejectedWith(/Version Conflict:/);
            });
            it("should error out with inconsietent arrays .",function() {
                var request;
                try{
                    request = Promise.resolve(__repo__.fetch([{name:"a",version:"~1.1.1"},{name:"b",version:"~1.1.4"}],{dependencies:true}))
                }catch(err){
                    request = Promise.reject(err)
                }
                return request.should.be.rejectedWith(/Version Conflict:/);
            });

            it("should reject confliced dependencies (previously accomodated both).",function() {
                var request;
                try{
                    request = Promise.resolve(__repo__.fetch([{name:"a",version:"~1.1.1"},{name:"b",version:"~1.1.3"}],{dependencies:true}))
                }catch(err){
                    request = Promise.reject(err)
                }
                return request.should.be.rejectedWith(/Version Conflict:/);;
            });

        });
    });

});


function populate_repo( repo: sync_repository<any>| 
                              deferred_repository<any>):Promise<any>{

    // create the testing repository.
    return Promise.all([
        Promise.resolve(repo.create({name:"a",version:"1.0.0",value:"1.0.0"})),
        Promise.resolve(repo.create({name:"a",version:"1.1.1",value:"1.1.1"})),
        Promise.resolve(repo.create({name:"a",version:"1.1.2",value:"1.1.2"})),
        Promise.resolve(repo.create({name:"a",version:"1.1.3",value:"1.1.3"})),
        Promise.resolve(repo.create({name:"a",version:"1.2.3",value:"1.2.3"})),
        Promise.resolve(repo.create({name:"a",version:"2.0.0",value:"2.0.0"})),
                                                           
        Promise.resolve(repo.create({name:"b",version:"1.0.0",value:"1.0.0",depends:{"a":"~1.0.0"}})),
        Promise.resolve(repo.create({name:"b",version:"1.1.1",value:"1.1.1",depends:{"a":"~1.1.1"}})),
        Promise.resolve(repo.create({name:"b",version:"1.1.3",value:"1.1.3",depends:{"a":"1.1.2"}})),
        Promise.resolve(repo.create({name:"b",version:"1.1.4",value:"1.1.4",depends:{"a":"~2.0.0"}})),
                                                           
        Promise.resolve(repo.create({name:"c",version:"1.0.0",value:"1.0.0"})),
        Promise.resolve(repo.create({name:"c",version:"1.1.1",value:"1.1.1",depends:{"b":"~1.1.1"}})),
        Promise.resolve(repo.create({name:"c",version:"1.1.2",value:"1.1.2",depends:{"b":"~1.1.2"}})),
        Promise.resolve(repo.create({name:"c",version:"1.1.3",value:"1.1.3",depends:{"b":"1.1.1","a":"2.0.0"}})), // internally conflicted;
        Promise.resolve(repo.create({name:"c",version:"1.1.4",value:"1.1.4",depends:{"b":"~1.1.3"}})),
    ])
}

