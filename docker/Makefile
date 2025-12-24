.PHONY: help build test run clean logs health monitor prune

help:
	@echo "Docker Sandbox Management"
	@echo ""
	@echo "Targets:"
	@echo "  make build      - Build sandbox Docker image"
	@echo "  make test       - Run comprehensive sandbox tests"
	@echo "  make run        - Start sandbox with Docker Compose"
	@echo "  make stop       - Stop running sandbox"
	@echo "  make clean      - Remove containers and clean up"
	@echo "  make logs       - View sandbox logs"
	@echo "  make health     - Check sandbox health"
	@echo "  make monitor    - Monitor container stats"
	@echo "  make prune      - Deep clean Docker resources"
	@echo "  make shell      - Interactive shell in sandbox"

IMAGE_NAME := claude-agent-sandbox
IMAGE_TAG := latest
FULL_IMAGE := $(IMAGE_NAME):$(IMAGE_TAG)

build:
	@echo "Building $(FULL_IMAGE)..."
	bash build-sandbox.sh $(IMAGE_NAME) $(IMAGE_TAG)

test:
	@echo "Testing $(FULL_IMAGE)..."
	bash test-sandbox.sh $(FULL_IMAGE)

run:
	@echo "Starting sandbox with Docker Compose..."
	cd sandbox && docker-compose up -d
	stop:
	@echo "Stopping sandbox..."
	cd sandbox && docker-compose down

clean:
	@echo "Cleaning up sandbox resources..."
	bash sandbox/cleanup.sh

logs:
	@echo "Showing sandbox logs..."
	docker-compose -f sandbox/docker-compose.yml logs -f

health:
	@echo "Checking sandbox health..."
	@docker ps | grep sandbox || echo "No running sandbox containers"

monitor:
	@echo "Monitoring sandbox containers..."
	docker stats --filter "label=sandbox=true"

prune:
	@echo "Pruning Docker system..."
	docker system prune -af --volumes

shell:
	@echo "Starting interactive shell..."
	docker run -it --rm --memory 512m --cpus 1 $(FULL_IMAGE) /bin/bash
