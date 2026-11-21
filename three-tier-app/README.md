# Optional Kubernetes deployment

This Helm chart deploys the same React frontend and Express/PostgreSQL application as separate workloads. Build the images from the repository root and load them into your cluster's image store:

```sh
docker build -t obi-devops-backend:local ./backend
docker build -t obi-devops-frontend:local ./frontend
minikube image load obi-devops-backend:local
minikube image load obi-devops-frontend:local
minikube start --cni=calico
minikube addons enable ingress
helm install my-app ./three-tier-app --set-string postgres.password='choose-a-local-password'
```

Set a unique disposable PostgreSQL password in your shell or local values file. Never commit that file or use a local password in a shared environment. Kubernetes Secrets are base64-encoded and require cluster encryption/access controls for protection.

The ingress routes /api/* to the backend and / to the frontend. The frontend calls the same-origin /api path. Backend readiness is /ready; liveness is /api/health.

Resolve the configured hostname three-tier-app.local to the Minikube IP and open it:

```sh
echo "$(minikube ip) three-tier-app.local" | sudo tee -a /etc/hosts
curl -i http://three-tier-app.local/
curl -i http://three-tier-app.local/api/health
```

The chart includes a PostgreSQL NetworkPolicy allowing database traffic from backend-labeled pods only. Remove the release with helm uninstall my-app; check the PVC separately if you also intend to erase its data.
