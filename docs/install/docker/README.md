# Docker Install

This version of the FlowForge platform is intended for running in the Docker Container management system. Typically suited for small/medium on premise deployments.

### Prerequistes

#### Docker Compose

FlowForge uses Docker Compose to install and manager the required components. Instructions on how to install Docker Compose on your system can be found here:

[https://docs.docker.com/compose/install/](https://docs.docker.com/compose/install/)

These instructions assume you are running Docker on a Linux or MacOS host system.

#### DNS

The orchestration uses an instance of Nginx to route requests to each Node-RED Project. To do this it needs each instance to have a unique hostname, to generate this the project name is prepended to a supplied domain.

To make this work you will need to configure a DNS server to map a wildcard domain entry to the IP address of the host running Docker. e.g `*.example.com`.

The FlowForge Application will be hosted on `http://forge.example.com`

**Note** When testing locally you can add entries for each project to your `/etc/hosts` file but you must use the external IP address of the host machine, not the loopback address (`127.0.0.1`).

### Installing FlowForge

#### Download

Download the latest release tar.gz from the docker-compose project:

[https://github.com/flowforge/docker-compose/releases/latest] (https://github.com/flowforge/docker-compose/releases/latest)

Unpack this and cd into the created directory.	

```
tar zxf v0.x.0.tar.gz
cd docker-compose-0.x.0
```

#### Building Containers

To build the 2 required containers run `./build-containers.sh`.

This will build and tag both `flowforge/forge-docker` and `flowforge/node-red`

##### flowforge/flowforge-docker

This container holds the FlowForge App and the Docker Driver

##### flowforge/node-red

This is a basic Node-RED image with the FlowForge Lanucher and the required Node-RED plugins to talk to the FlowForge Platform.

This is the container you can customise for your deployment.

### Configuring FlowForge

Configuration details are stored in the `etc/flowforge.yml` file which is mapped into the `flowforge/forge-docker` container. You will need to edit this file to update the `domain` and `base_url` entries to match the DNS settings.

You also need to update the VIRTUAL_HOST entry in the docker-compose.yml file to use the same domain as in the etc/flowforge.yml file.

For more details on the options available, see the [configuration guide](../configuration.md).

### Running FlowForge

Once the containers have been built you can start FlowForge by running:

```
docker-compose up -d
```

This will also create a directory called `db` to hold the database files used to store project instance and user information.

### First Run Setup

The first time you access the platform in your browser, it will take you through
creating an administrator for the platform and other configuration options.

For more information, follow [this guide](../first-run.md).
