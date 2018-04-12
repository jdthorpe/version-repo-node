/// <reference types="bluebird" />
import * as Promise from 'bluebird';
import { deferred_repository, remote_repo_config, package_loc, resource_data, fetch_opts } from "version-repo/src/typings";
export declare class RemoteRepo<T> implements deferred_repository<T> {
    params: remote_repo_config;
    base_url: string;
    constructor(params: remote_repo_config);
    create(options: resource_data<T>): Promise<any>;
    update(options: resource_data<T>): Promise<any>;
    del(options: package_loc): Promise<any>;
    depends(x: package_loc | package_loc[] | {
        [key: string]: string;
    }): Promise<package_loc[]>;
    fetch(query: package_loc | package_loc[], opts?: fetch_opts): Promise<resource_data<T>[]>;
    fetchOne(query: package_loc, opts?: fetch_opts): Promise<any>;
    resolve_versions(versions: {
        [x: string]: string;
    }): any;
    latest_version(name: string): any;
    packages(): any;
    versions(): Promise<{
        [x: string]: string[];
    }>;
    versions(name: string): Promise<string[]>;
    _build_url(options: package_loc): string;
}
