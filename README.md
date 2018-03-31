
API: 

```JavaScript
// A MEMORY BASED REPO INSTANCE
var repo = require('versioned-repo'),
	my_mem_repo= repo.memory(),


// A FILE SYSTEM REPO (NodeJS)
var temp = require('temp'), // requires npm install temp
	path = require('path'),
	temp_dir = temp.mkdirSync(),
	my_file_repo = repo.file({directory:path.join(temp_dir,"my_repo_files")}),

// A READ-ONLY BUFFERED REPO BASED WRAPPING THE FILE SYSTEM REPO
var buffered_file_repo = repo.readonly_buffer(my_file_repo);

// AN EXPRESS APP WITH A VERSIONED REPO ON ROUTE /FOO/
var express = require('express'),
	app = express();
	app.use('/my_repo',
		repo.router({
			repository:buffered_file_repo,
			version_repo:my_mem_repo,
		}));

// A REMOTE REPO WHICH WRAPS THE EXPRESS SERVER
// build the base url
var server = ('function' === typeof app) ? http.createServer(app) : app,
    address =  server.address();
if (!address) {
    server.listen(0);
    address = server.address();
}
var protocol = (server instanceof https.Server) ? 'https:' : 'http:';
var hostname = address.address;
if (hostname === '0.0.0.0' || hostname === '::') {
    hostname = '127.0.0.1';
}
var base_url = protocol + '//' + hostname + ':' + address.port ;
// THE REMOTE REPOSITORY INSTANCE
var remote_repo = new repo.remote({
    'base_url':base_url + '/my_repo',
})


// REQUIREMENT RESOLUTION

//my_file_repo
repo.resolve({'a','~1.1.1'},my_mem_repo)

// sugar / cruft
my_remote_repo.resolve({'a','~1.1.1'})
```


NOTE THAT THE FOLLOWING IS NOT ITEMPOTENT, so it's important not to
`upload.array()` on a parent of the a route that the 

```JavaScript
	var multer = require('multer'); // v1.0.5
	var upload = multer(); // for parsing multipart/form-data
	app.use('/',upload.array())
```

