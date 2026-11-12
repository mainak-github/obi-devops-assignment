# three-tier-app Helm chart

This chart deploys PostgreSQL, a two-replica backend, a frontend, an Ingress, and a NetworkPolicy. The defaults use public `postgres`, `hashicorp/http-echo`, and `nginx` images so the chart does not need image builds. The echo backend is a connectivity/demo backend; pass the teacher-provided API image and its port, args, and health path through a values file for the actual application. The frontend should be built/configured to call the same-origin `/api` path; the Ingress sends that prefix to the backend.

## Install on minikube

Start a cluster with a NetworkPolicy-capable CNI. Minikube's default CNI supports NetworkPolicy; enable its ingress controller:

```sh
minikube start --cni=calico
minikube addons enable ingress
helm install my-app ./three-tier-app \
  --set postgres.password='local-demo-password'
kubectl get pods,svc,ingress,pvc
```

For an application image supplied by the assignment, create `my-values.yaml` and set the image and matching container details, then install with `-f my-values.yaml`. For example:

```yaml
backend:
  image: your-backend-image:tag
  port: 3000
  args: []
  probePath: /api/health
frontend:
  image: your-frontend-image:tag
```

Make the Ingress host resolvable locally. `minikube ip` returns the address to map to `three-tier-app.local` in `/etc/hosts`, or use `minikube tunnel` if needed for your driver:

```sh
echo "$(minikube ip) three-tier-app.local" | sudo tee -a /etc/hosts
curl -i http://three-tier-app.local/
curl -i http://three-tier-app.local/api/
```

The echo backend responds to `/api/` with its configured text. The provided application backend can be checked at `/api/health` after configuring it as above.

## Verify database NetworkPolicy

The policy selects only this chart's PostgreSQL pod and allows ingress on TCP 5432 only from pods labeled `role: backend`. The chart's backend pods have that label; frontend pods do not. These commands create short-lived test pods and try a TCP connection from each:

```sh
kubectl run db-test-backend --rm -i --restart=Never \
  --labels=role=backend --image=busybox:1.36 -- \
  sh -c 'nc -zvw 3 my-app-three-tier-app-postgres 5432'

kubectl run db-test-frontend --rm -i --restart=Never \
  --labels=role=frontend --image=busybox:1.36 -- \
  sh -c 'nc -zvw 3 my-app-three-tier-app-postgres 5432'
```

The backend-labeled pod should connect; the frontend-labeled pod should time out/fail. If both connect, confirm the cluster CNI enforces Kubernetes NetworkPolicy. If neither connects, check that PostgreSQL is ready and that the policy and test pods are in the same namespace. Remove the release when finished with `helm uninstall my-app`; the PVC may need separate deletion depending on the storage provisioner.

## Values and local security

Set `postgres.password` to a local demo value for a disposable cluster. Kubernetes Secrets are base64-encoded and are not encrypted by default at rest; do not commit real credentials or use this sample password outside local development. Change `ingress.className` if your cluster uses a different Ingress controller.
