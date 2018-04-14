/// <reference types="express" />
import { repository } from "version-repo/src/typings";
import * as express from 'express';
export interface repo_router_config {
    repository: repository<any>;
    router?: express.Router;
    query_credentials?: () => void;
    modify_credentials?: () => void;
}
export declare function router(config: repo_router_config): express.Router;
