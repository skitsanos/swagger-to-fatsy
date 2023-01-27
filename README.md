# swagger-to-fatsy

This script is a tool that helps developers who use a project called [Fatsy](https://github.com/skitsanos/fatsy). It takes a file called Swagger as input, which defines the structure of a web API, and creates a set of files and folders based on the contents of the Swagger file. The resulting files and folders make it easier for developers to define the routes of their web API using Fastify. It's like a blueprint that helps developers to set up the basic structure of their API project, and all they have to do is to fill it up with their logic. The script does not contain any logic for handling API requests; it just creates a set of empty files and folders that can be used as starting point for developers.

## How it works

The script reads a Swagger file, which is a file that defines the structure of a web API, and uses the information in the file to create a set of files and folders.

It first parses the Swagger file in YAML format into a JavaScript object and extracts the "paths" property. This property contains the endpoint paths of the API, such as "/users" or "/users/{userId}", and the methods that are available for each endpoint, such as GET or POST.

The script then loops through each endpoint path and the associated methods, and for each combination of endpoint path and method, it creates a new file. The file name is the method name in lowercase, and the file's content is a simple JavaScript function that sends a "Hello" message.

Then it creates a folder for each endpoint path, with the endpoint path as the folder name. The script also replaces any path parameters, such as {userId}, with a dollar sign followed by the parameter name, such as $userId.

Finally, it writes the newly created files to the appropriate folders within the destination folder provided by the user.

In other words, for each route, the script creates a folder with the same name as the route. Inside this folder, the script creates a file for each HTTP method (such as GET or POST) that is defined for that route. The file is named after the method, and contains a skeleton implementation of a handler function for that method and route.

For example, if the Swagger file defines a GET route for `/users`, the script will create a folder called `users` in the destination folder and create a file called `get.ts` inside this folder.

## Usage

First thing first, once you cloned the repo, do the linking:

```shell
npm link
```

If you got an `EACCES` error, re-run it with `sudo`.

Now you can run the script from the command line using the following command:

```shell
swagger-to-fatsy -s <source-file> -d <destination-folder> -t <file-type>
```

- `scriptName.js` is the name of the script you are running.
- `-s` or `--source` is the path to the Swagger file that you want to parse.
- `-d` or `--destination` is the path to the folder where you want to save the generated routes.
- `-t` or `--type` is the file type of the generated routes. The default is 'ts'.

For example:

```shell
swagger-to-fatsy -s swagger.yml -d routes -t js
```

This command will parse the Swagger file `swagger.yml` and create the routes in the `routes` folder with a javascript file type.