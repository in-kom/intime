#!/bin/bash

# Navigate to the directory containing the docker-compose.yml file
cd "$(dirname "$0")/../" || exit

# Run the docker-compose.yml file
docker-compose up --build
