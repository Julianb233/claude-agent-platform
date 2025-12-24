FROM ubuntu:22.04 AS base

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    wget \
    git \
    vim \
    nano \
    build-essential \
    libssl-dev \
    zlib1g-dev \
    libbz2-dev \
    libreadline-dev \
    libsqlite3-dev \
    xz-utils \
    apt-transport-https \
    gnupg \
    lsb-release \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

RUN add-apt-repository ppa:deadsnakes/ppa && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-venv \
    python3.11-dev \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1 && \
    update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1

RUN python3 -m pip install --no-cache-dir --upgrade pip setuptools wheel

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

RUN python3 --version && \
    pip --version && \
    node --version && \
    npm --version

RUN groupadd -r sandboxuser && \
    useradd -r -g sandboxuser -u 1000 -d /home/sandboxuser -s /sbin/nologin -c "Sandbox execution user" sandboxuser && \
    mkdir -p /home/sandboxuser && \
    chown -R sandboxuser:sandboxuser /home/sandboxuser

RUN mkdir -p /sandbox /tmp/sandbox /var/log/sandbox && \
    chown -R sandboxuser:sandboxuser /sandbox /tmp/sandbox /var/log/sandbox && \
    chmod 755 /sandbox /tmp/sandbox /var/log/sandbox

RUN apt-get update && apt-get install -y --no-install-recommends \
    cgroup-tools \
    htop \
    procps \
    && rm -rf /var/lib/apt/lists/*

COPY limits.conf /etc/security/limits.d/sandbox.conf
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

RUN mkdir -p /usr/local/bin/health && \
    echo '#!/bin/bash' > /usr/local/bin/health/check.sh && \
    echo 'exit 0' >> /usr/local/bin/health/check.sh && \
    chmod +x /usr/local/bin/health/check.sh

RUN rm -rf /usr/bin/man /usr/bin/less /usr/bin/more /usr/share/doc/* /usr/share/man/*

WORKDIR /sandbox
USER sandboxuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD /usr/local/bin/health/check.sh || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["bash"]