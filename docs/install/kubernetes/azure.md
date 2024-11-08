---
navTitle: Azure AKS Installation
meta:
   description: Learn how to install FlowFuse on AWS EKS with setup details for EKS, Nginx Ingress, AWS SES, and RDS PostgreSQL integration.
   tags:
      - flowfuse
      - nodered
      - azure
      - aks
      - nginx ingress
      - helm
      - kubernetes
---

# Azure AKS Specific details

This document includes details for installing FlowFuse on Azure AKS

## Nginx Ingress

We recommend using the <a href="https://kubernetes.github.io/ingress-nginx/" target="_blank">Nginx Ingress controller</a> as this is the one we test with and we have run into limits on the number of Instances with other Ingress Controllers. 

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm --kubeconfig=./k8s-flowforge-kubeconfig.yaml install nginx-ingress \
  ingress-nginx/ingress-nginx --namespace ingress-nginx \
  --create-namespace \
  --set controller.publishService.enabled=true \
  --set controller.ingressClassResource.default=true \
  --set controller.config.proxy-body-size="0" 
  --wait

```

The `controller.config.proxy-body-size="0"` removes the `1m` default payload limit 
from the nginx ingress proxy. You can change this to say `5m` which will match the 
Node-RED default value.


### HTTPS with Nginx Ingress

Azure's LoadBalancer does not support doing TLS termination so HTTPS certificates will either need to up added to AKS as Kubernetes Secrets or make use of 
Certificate Manager to provision certificates either from LetsEncrypt or other ACME Certificate Authorities.

## Persistent Storage

If making use of the Persistent Storage feature you will need to provide a StorageClass that support MultiPod mounting.

e.g. Azure Files backed Persistent Volumes


You should also set the `nobrl` Mount Option to ensure things like SQLite databases work correctly if using the Azure Files back Persistent Volumes.

## User Azure Database for PostgreSQL

By default the helm chart will install a local copy of PostgreSQL 14.

But you may make use of Azure's hosted PostgreSQL solution, but you will need to provision the user and empty database before doing the Helm install.