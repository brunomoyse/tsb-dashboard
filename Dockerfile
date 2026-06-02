FROM node:24.16-slim AS builder

WORKDIR /usr/src/app

ARG DASHBOARD_BASE_URL
ARG API_BASE_URL
ARG S3_BUCKET_URL
ARG GRAPHQL_WS_URL
ARG ZITADEL_AUTHORITY
ARG ZITADEL_CLIENT_ID

ENV DASHBOARD_BASE_URL=${DASHBOARD_BASE_URL} \
    API_BASE_URL=${API_BASE_URL} \
    S3_BUCKET_URL=${S3_BUCKET_URL} \
    GRAPHQL_WS_URL=${GRAPHQL_WS_URL} \
    ZITADEL_AUTHORITY=${ZITADEL_AUTHORITY} \
    ZITADEL_CLIENT_ID=${ZITADEL_CLIENT_ID}

COPY package*.json ./

RUN npm ci --prefer-offline --no-audit

COPY . .

# `nuxt generate` (vs `nuxt build`) ensures Nitro emits the SPA shell as a real
# /index.html in .output/public/ rather than serving it from a virtual server
# module at runtime — required for static file serving.
RUN npm run generate

# ---------- Runtime (Caddy) ----------
FROM caddy:2-alpine

# ARGs don't cross stages — re-declare the subset needed for the CSP origins.
ARG API_BASE_URL
ARG S3_BUCKET_URL
ARG GRAPHQL_WS_URL
ARG ZITADEL_AUTHORITY

COPY Caddyfile.template /tmp/Caddyfile.template

# Derive the CSP origins exactly the way nuxt.config.ts does (URL → origin,
# http→ws), then envsubst them into the Caddyfile. gettext is removed after
# substitution so the runtime image stays minimal.
RUN apk add --no-cache gettext libcap && \
    export API_ORIGIN=$(echo "$API_BASE_URL" | awk -F/ '{print $1"//"$3}') && \
    export WS_ORIGIN=$(echo "$API_ORIGIN" | sed 's/^http/ws/') && \
    export S3_BUCKET_URL ZITADEL_AUTHORITY && \
    envsubst '${API_ORIGIN} ${WS_ORIGIN} ${S3_BUCKET_URL} ${ZITADEL_AUTHORITY}' \
        < /tmp/Caddyfile.template > /etc/caddy/Caddyfile && \
    rm /tmp/Caddyfile.template && \
    setcap -r /usr/bin/caddy && \
    apk del gettext libcap

# Strip cap_net_bind_service from /usr/bin/caddy above. The base image grants
# it so Caddy can bind ports <1024; we listen on 3000 so it's unused, and
# leaving it on breaks Kubernetes pods that set allowPrivilegeEscalation:false
# + drop:ALL caps — the kernel refuses to exec a binary whose file caps
# exceed the container's bounding set under no_new_privs.

# Strip the base image's welcome page so any future Nuxt rename doesn't leave
# it lingering alongside the SPA shell.
RUN rm -rf /usr/share/caddy/*

COPY --from=builder /usr/src/app/.output/public /usr/share/caddy

USER 1000:1000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/healthz || exit 1

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
