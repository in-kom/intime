# GitHub Workflows

This directory contains GitHub Actions workflows for the Intime project.

## Docker Compose Workflow

The `docker-compose.yml` workflow:

1. Builds and starts all services defined in the project's docker-compose.yml file
2. Waits for the backend service to be ready
3. Runs any backend tests
4. Collects logs on failure
5. Has a deployment stage that runs only on the main branch

### Prerequisites

- The workflow runs on GitHub-hosted runners with Docker and Docker Compose pre-installed
- Backend should have a `/health` endpoint for the workflow to check readiness

### Configuration

You may need to modify the workflow for:

- Different branch names
- Custom environment variables
- Specific test commands
- Production deployment steps

### Running Locally

To test the Docker Compose setup locally before pushing:

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Code Quality & Testing Workflow

The `code-quality.yml` workflow:

1. Runs in parallel for both frontend and backend code
2. Performs linting, type checking, and unit tests
3. Verifies that the frontend builds correctly

## Security Scanning Workflow

The `security-scan.yml` workflow:

1. Scans dependencies for vulnerabilities using Snyk
2. Performs code scanning with CodeQL
3. Scans Docker images for security issues with Trivy
4. Runs weekly and on code changes to main branch

## Release Workflow

The `release.yml` workflow:

1. Triggers when a tag starting with 'v' is pushed
2. Builds and pushes Docker images with version tags
3. Generates a changelog from commits
4. Creates a GitHub release with the changelog and deployment instructions

### Prerequisites for the Release Workflow

- Docker Hub credentials stored in GitHub Secrets (DOCKERHUB_USERNAME, DOCKERHUB_TOKEN)
- Update the Docker image names in the workflow file to match your Docker Hub username

## Adding New Workflows

When adding new workflows, please:

1. Use descriptive names
2. Document prerequisites and configuration options
3. Include steps for local testing
