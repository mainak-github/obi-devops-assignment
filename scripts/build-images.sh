#!/usr/bin/env bash
set -euo pipefail

TAG="${1:-local}"

docker build -t "obi-devops-backend:${TAG}" ./backend
docker build -t "obi-devops-frontend:${TAG}" ./frontend
