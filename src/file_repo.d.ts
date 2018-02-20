import { file_repo_config, deferred_repository, package_loc } from "./typings";
export declare class FileRepo implements deferred_repository<string> {
    config: file_repo_config;
    constructor(config: file_repo_config);
    connect(): any;
    is_connected(): any;
    create(options: package_loc, pkg: string): Q.Promise<boolean>;
    fetch(options: package_loc): Q.Promise<any>;
    update(options: package_loc, data: string): Q.Promise<any>;
    del(options: package_loc): any;
    latest_version(name: string, filter?: string): Q.Promise<any>;
    packages(): Q.Promise<string[]>;
    versions(): Q.Promise<{[x:string]:string[]}>;
    versions(name: string): Q.Promise<string[]>;
    get_file_name(options: package_loc): Q.Promise<any>;
    compute_file_name(options: package_loc): any;
}
