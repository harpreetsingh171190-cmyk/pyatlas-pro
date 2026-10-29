FROM python:3.12-slim AS build
WORKDIR /src
COPY pyatlas ./pyatlas
RUN python -m pyatlas build --output /site

FROM nginxinc/nginx-unprivileged:stable-alpine
COPY --from=build /site /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/index.html || exit 1
