# Dockefile from https://notes.ethereum.org/@GW1ZUbNKR5iRjjKYx6_dJQ/Bk8zsJ9xj
# FROM node:22.12.0-bullseye-slim
FROM node@sha256:9f385b101f66ecdf9ed9218d000cd5a35600722f0aab8112632371765109c065

# install wget, git and necessary certificates
RUN apt update && apt install --yes --no-install-recommends wget git apt-transport-https ca-certificates && rm -rf /var/lib/apt/lists/*

ENV GIT_REPOSITORY=https://github.com/tornadocontrib/tornado-scripts.git
# From main branch, double check with git.tornado.ws and codeberg.org
ENV GIT_COMMIT_HASH=0aa9f0038354412e01b171df7dcff96b1c55976c

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