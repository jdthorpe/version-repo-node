
//-- const is_node:boolean = (typeof module !== 'undefined') && (module.exports);

import * as http from 'http';
var https = require('https');
import * as url from 'url';

//-- import * as request from 'superagent';
//-- var promise_plugin  = require( 'superagent-promise-plugin'); "superagent-promise-plugin": "^3.2.0"

import * as Promise from 'bluebird';
import * as semver from 'semver';

import { deferred_repository, remote_repo_config, package_loc, resource_data, fetch_opts } from "version-repo/src/typings"
import { validate_options, validate_options_range, RemoteRepo as _RemoteRepo, dTransform } from 'version-repo';
//-- promise_plugin.Promise = require('bluebird');

export interface node_remote_repo_config  extends remote_repo_config{ 
    app?:any,
}



export class RemoteRepo<T> extends _RemoteRepo<T> {

    constructor( params:node_remote_repo_config){

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

            let base_url:string = protocol + '//' + hostname + ':' + port ;

            if(params.base_url){
                base_url += "/" + params.base_url.replace(/^\//,"");
            }
            params.base_url  = base_url

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

            let base_url:string = protocol + '//' + hostname;

            if(port){ base_url += ':' + port }

            if(params.base_url){ 
                base_url += "/" + params.base_url.replace(/^\//,""); 
            }

            params.base_url  = base_url

        }else{
            params.base_url = !!params.base_url?params.base_url: "";
        }

        super(params)
    }

}
