/// <reference types="bluebird" />
import { file_repo_config, deferred_repository, package_loc, fetch_opts, resource_data } from "version-repo/src/typings";
import * as Promise from "bluebird";
export declare class FileRepo implements deferred_repository<string> {
    config: file_repo_config;
    constructor(config: file_repo_config);
    create(options: resource_data<string>): Promise<boolean>;
    fetchOne(options: package_loc, opts?: fetch_opts): Promise<resource_data<string>>;
    fetch(query: package_loc | package_loc[], opts?: fetch_opts): Promise<resource_data<string>[]>;
    update(options: resource_data<string>): Promise<boolean>;
    del(options: package_loc): Promise<boolean>;
    depends(x: package_loc | package_loc[] | {
        [key: string]: string;
    }): Promise<package_loc[]>;
    latest_version(name: string, filter?: string): Promise<string>;
    packages(): Promise<string[]>;
    versions(): Promise<{
        [x: string]: string[];
    }>;
    versions(name: string): Promise<string[]>;
    get_file_name(options: package_loc): Promise<string>;
    get_path(options: package_loc, attr?: "depends" | "value"): string;
}
