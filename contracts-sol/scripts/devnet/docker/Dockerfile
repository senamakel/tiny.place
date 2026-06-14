# Image for running Solana VERIFIED BUILDS (solana-verify) from the CLI without
# installing the Rust/Solana toolchain on the host.
#
# solana-verify performs a reproducible build by launching a pinned build
# container itself, so at runtime this image needs the host Docker socket mounted
# (docker-out-of-docker) and the `docker` client, which is installed below.
FROM rust:1-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
      git curl ca-certificates pkg-config libssl-dev libudev-dev docker.io \
    && rm -rf /var/lib/apt/lists/*

# Pin via --locked for a reproducible toolchain image.
RUN cargo install solana-verify --locked

ENTRYPOINT ["solana-verify"]
CMD ["--help"]
