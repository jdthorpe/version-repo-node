An extention to the [version-repo](https://www.npmjs.com/package/version-repo)
package with a backend provided by MongoDB.

See [version-repo](https://www.npmjs.com/package/version-repo) for the general version-repo API.

# Repositories Classes

## RemoteRepo

An asynchronous repository which forwards all requests to another
version-repository over http.  (The **`RouterRepo`** class available in the
[version-repo-node](https://www.npmjs.com/package/version-repo-node) wraps
another repository with an HTTP interface).

##### Constructor parameters

- config:  An object with the following attributes: 
	- directory: (string) Path to the directory to use for persisting objects to file
	- ext?: (string, opitonal) A file extention for stored files
	- update: (optional) one of "latest" (default), "any", "none"
	- delete: (optional) one of "latest" (default), "any", "none"

##### Example:

```javascript
var my_file_based_repo = new FileRepo({ dir: "/some/place/nice", ext: "txt" })
```

## Router

A wrapper for another 'host' repository which provides an HTTP/S API via [ExpressJS](https://expressjs.com/)

##### Constructor parameters

- Config: An object with the following attributes
    - repository: The host repository that is being exposed via the Router instance
    - router: (optional) An ExpressJS Router instance
    - query_credentials: (optional) An express middleware function used for validating requesters authorization to perform the query
    - modify_credentials: (optional) An express middleware function used for validating requesters authorization to perform the query

##### Example:

```javascript
import { MemoryRepo } from "version-repo";
import { Router } from "version-repo-node";
var http = require('http'),
	express = require('express'),
	superagent = require("superagent");

const app = express();
const host_repo = new MemoryRepo();

app.use('/my-repo', router({ repository:backend, }));
var server = http.createServer(app);
server.listen(0);

console.log( `the host_repo is now expossed on http://localhost:${server.address().port}/my-repo` );
```

## RemoteRepo

An asynchronous repository which forwards all requests to another
version-repository over http.  (The **`RouterRepo`** class available in the
[version-repo-node](https://www.npmjs.com/package/version-repo-node) wraps
another repository with an HTTP interface).

Note that the RemoteRepo **can be [`webpack`](https://webpack.js.org/)ed** into a browser application.

##### Constructor parameters

One of: 
 
- (Most common) An object with a complete `base_url` attribute (e.g.  `{ 'base_url':"http://my.repo.com:1234/my-stuff", }`)

- (typically used for testing) an object with an Express App instance serving a repo router and the relative
path, such as: 

```typescript
import { MemoryRepo, RemoteRepo, router } from "version-repo"
import express = require('express');

var app = express(), 
	host_repo  = new MemoryRepo();
	app.use('/my-stuff', repo.router({ repository:parser_repo, }));

var my_repo = new RemoteRepo({ app: app, base_url: "/my-stuff" })
```

- (typically used for testing) an object with a server instance serving a repo router and the relative
path, such as: 

```typescript
import { MemoryRepo, RemoteRepo, router } from "version-repo"
import express = require('express');
import http = require('http');

var app = express(), 
	host_repo  = new MemoryRepo();
app.use('/my-stuff', repo.router({ repository:parser_repo, }));
var server = http.createServer(app)

my_repo =new RemoteRepo({ app: server, base_url: "/my-stuff" })
```


