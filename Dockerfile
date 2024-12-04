# Dockefile from https://notes.ethereum.org/@GW1ZUbNKR5iRjjKYx6_dJQ/Bk8zsJ9xj
# FROM node:20.18.0-bullseye-slim
FROM node@sha256:9b558df8f10198fcd1f48cf344c55c4442c3446b8a9a69487523b3d890a4a59e

# install wget, git and necessary certificates
RUN apt update && apt install --yes --no-install-recommends wget git apt-transport-https ca-certificates && rm -rf /var/lib/apt/lists/*

ENV GIT_REPOSITORY=https://git.tornado.ws/tornadocontrib/tornado-core.git
# From development branch, double check with tornado.ws
ENV GIT_COMMIT_HASH=309a53600ce4e17b8d3225ca5923bdf280edaaf0

# clone the repository
RUN mkdir /app/

WORKDIR /app

# Simple hack to fetch only commit and nothing more (no need to download 1GB sized repo, only 100MB would be enough)
RUN git init && \
  git remote add origin $GIT_REPOSITORY && \
  git fetch --depth 1 origin $GIT_COMMIT_HASH && \
  git checkout $GIT_COMMIT_HASH

# install, build and prep for deployment
RUN yarn install --frozen-lockfile --ignore-scripts
RUN yarn build