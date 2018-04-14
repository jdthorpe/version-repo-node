"use strict";
//-- const is_node:boolean = (typeof module !== 'undefined') && (module.exports);
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var http = require("http");
var https = require('https');
var url = require("url");
var version_repo_1 = require("version-repo");
var RemoteRepo = /** @class */ (function (_super) {
    __extends(RemoteRepo, _super);
    function RemoteRepo(params) {
        var _this = this;
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
            var base_url = protocol + '//' + hostname + ':' + port;
            if (params.base_url) {
                base_url += "/" + params.base_url.replace(/^\//, "");
            }
            params.base_url = base_url;
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
            var base_url = protocol + '//' + hostname;
            if (port) {
                base_url += ':' + port;
            }
            if (params.base_url) {
                base_url += "/" + params.base_url.replace(/^\//, "");
            }
            params.base_url = base_url;
        }
        else {
            params.base_url = !!params.base_url ? params.base_url : "";
        }
        _this = _super.call(this, params) || this;
        return _this;
    }
    return RemoteRepo;
}(version_repo_1.RemoteRepo));
exports.RemoteRepo = RemoteRepo;
//# sourceMappingURL=remote_repo.js.map