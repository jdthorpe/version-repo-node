import { remote_repo_config } from "version-repo/src/typings";
import { RemoteRepo as _RemoteRepo } from 'version-repo';
export interface node_remote_repo_config extends remote_repo_config {
    app?: any;
}
export declare class RemoteRepo<T> extends _RemoteRepo<T> {
    constructor(params: node_remote_repo_config);
}
