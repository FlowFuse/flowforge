---
navGroup: FlowFuse Self-Hosted
navTitle: Quick Start
navOrder: 1
meta:
   description: Quickly install FlowFuse in Docker or Kubernetes based environments.
   tags:
     - start
     - quick start
     - quickstart
     - installation
     - flowfuse
     - docker
     - trial license
     - deployment models
---

# Quick Start Guide

This guide provides a streamlined process for setting up and running the FlowFuse platform using Docker and docker-compose. 

The provided docker-compose file facilitates the deployment of the following services:
* **FlowFuse Platform**: Includes the core application, MQTT broker, and file server for storage
* **Database:** A pre-configured database for storing platform data
* **Proxy Server:** A pre-configured proxy server for managing HTTP traffic

For a full installation guide, including how to setup FlowFuse in a production environment, please refer to the dedicated page for [running FlowFuse on Docker](../install/docker/README.md).

## Prerequisites

Before you begin, ensure you have [Docker](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/) installed on your system (either as a standalone binary or as docker plugin)

## Step 1: Configure Domain

### No DNS Server

If you're just looking to test FlowFuse locally, and do not have a local DNS server, then we recommend [setting up an alternative to DNS](../install/dns-setup.md#no-local-dns-server). 

### DNS Server

Otherwise, before running FlowFuse, you need to configure your fully qualified domain name settings, and will need a domain name that you own and can configure DNS settings for:

1. Set up an A record for your domain (e.g., `example.com`) to your server's IP address (this works with subdomain as well e.g. `flowfuse.example.com`). FlowFuse will run here.
2. In the same manner, set up a wildcard DNS record (e.g., `*.example.com`, `*.flowfuse.example.com`) to point to your server's IP address. Any Node-RED instances setup by FlowFuse will run here.

This step is crucial for the proper functioning of the application. FlowFuse will not run properly on `localhost` domain.

## Step 2: Download Compose file

```bash
curl -L -o docker-compose.yml https://github.com/FlowFuse/docker-compose/releases/latest/download/docker-compose-quick-start.yml
```

## Step 3: Start the Application

Run the following command to deploy FlowFuse. Replace the  `yourdomain.com` with your domain name configured in step 1.:

```bash
DOMAIN=example.com docker compose up -d
```

This command will download the necessary Docker images, run initial setup and start all the required services in detached mode.

## Step 4: Complete the application Setup

Open your web browser and navigate to `http://forge.example.com/setup` . You will be redirected to the setup page where you can create your admin account and set up your instance.
For detailed information about first setup and configuration, please follow [this guide](../install/first-run.md).


## Cleanup

To stop and remove the FlowFuse application, run the following command. Replace `yourdomain.com` with your domain name:

```bash
DOMAIN=example.com docker compose down -v
```

## Troubleshooting

If you encounter any issues, please check the following:

1. Ensure all prerequisites are correctly installed
2. Verify your DNS settings are correct and have propagated
3. Check the Docker logs for any error messages:
   ```bash
   docker compose logs
   ```

For more detailed information or advanced configuration options for running FlowFuse on Docker, please refer to our [full documentation](../install/docker/README.md).