# Isnadi Remote with Docker

The recommended compose file runs Isnadi and Tailscale in one network namespace. Tailscale terminates tailnet HTTPS and forwards directly to Isnadi.

1. Run `docker compose -f deploy/docker/compose.yaml up -d`.
2. If `TS_AUTHKEY` was not supplied, follow the login URL in `docker compose logs tailscale`.
3. Run `docker compose exec isnadi isnadi pair --tailscale`.

The image health check requests `/.well-known/t3/environment` from the server every 30 seconds.
`docker compose ps` shows the result, and `docker compose up -d --wait` blocks until it passes.

Data is durable in `isnadi-data`. Mount only the workspace paths bots need. Pin image tags for repeatable updates, take a volume snapshot, pull/build the new image, and keep the previous image until its health check succeeds.

Before an update, snapshot the data volume while Isnadi is stopped:

```sh
docker compose stop isnadi
docker run --rm -v isnadi-data:/data -v "$PWD":/backup alpine \
  tar -czf /backup/isnadi-data-before-update.tar.gz -C /data .
```

Releases do not publish a Docker image. Check out the release tag, build it under a versioned tag
with `ISNADI_IMAGE`, and wait for the image-level health check:

```sh
git checkout vVERSION
ISNADI_IMAGE=isnadi-remote:VERSION docker compose build isnadi
ISNADI_IMAGE=isnadi-remote:VERSION docker compose up -d --wait
```

If health fails, select the previous image. If the failed image reached database migration, stop the
containers and restore the snapshot before starting the previous image:

```sh
docker compose down
docker run --rm -v isnadi-data:/data -v "$PWD":/backup alpine sh -c \
  'rm -rf /data/* /data/.[!.]* /data/..?*; tar -xzf /backup/isnadi-data-before-update.tar.gz -C /data'
ISNADI_IMAGE=isnadi-remote:PREVIOUS docker compose up -d
```

For an existing reverse proxy, use `compose.direct.yaml`. It binds only to loopback; terminate HTTPS in the proxy and use normal manual pairing.

`isnadi remote doctor`, `status`, and `logs` run inside the image.
Image updates, rollback, and container removal remain Compose operations; the corresponding remote
admin commands exit with instructions instead of trying to manage a host systemd service.
