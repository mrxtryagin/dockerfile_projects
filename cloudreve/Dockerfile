# statics frontend
#checkout git hub

FROM node:lts-buster AS fe-builder
# 环境变量
ENV MYPATH /usr/local
RUN mkdir -p $MYPATH/fronted

WORKDIR $MYPATH/fronted

# copy 前端
COPY cloudreve/fronted .

# If encountered problems like JavaScript heap out of memory, please uncomment the following options
ENV NODE_OPTIONS --max_old_space_size=2048

# yarn repo connection is unstable, adjust the network timeout to 10 min.
# yarn build
RUN set -ex \
    && yarn install --network-timeout 600000 \
    && yarn build

# 重命名
RUN mv build statics

# statics backend
FROM golang:1.16-alpine AS be-builder

RUN apk update \
    && apk add  build-base gcc abuild binutils binutils-doc gcc-doc

ENV GO111MODULE on

ENV MYPATH /usr/local
# 处理后端源代码
RUN mkdir -p backend
WORKDIR $MYPATH/backend

COPY cloudreve/backend .
# build 后端
RUN set -ex \
    && go build -o cloudreve




# COPY --from=fe-builder /assets/build/ /go/src/github.com/cloudreve/Cloudreve/v3/assets/build/


# RUN set -ex \
#     && apk upgrade \
#     && apk add gcc libc-dev git \
#     && export COMMIT_SHA=$(git rev-parse --short HEAD) \
#     && export VERSION=$(git describe --tags) \
#     && (cd && go get github.com/rakyll/statik) \
#     && statik -src=assets/statics/ -include=*.html,*.js,*.json,*.css,*.png,*.svg,*.ico -f \
#     && go install -ldflags "-X 'github.com/cloudreve/Cloudreve/v3/pkg/conf.BackendVersion=${VERSION}' \
#     -X 'github.com/cloudreve/Cloudreve/v3/pkg/conf.LastCommit=${COMMIT_SHA}'\
#     -w -s"

# statics final image
FROM alpine:3.12 AS dist

LABEL maintainer="mrx"

# we use the Asia/Shanghai timezone by default, you can be modified
# by `docker statics --statics-arg=TZ=Other_Timezone ...`
ARG TZ="Asia/Shanghai"
ENV MYPATH /usr/local
RUN mkdir -p $MYPATH/cloudreve
WORKDIR $MYPATH/cloudreve
ENV TZ ${TZ}

# 复制前后端 编译的东西
COPY --from=fe-builder $MYPATH/fronted/statics .
COPY --from=be-builder $MYPATH/backend/cloudreve .


# COPY --from=be-builder /go/bin/Cloudreve /cloudreve/cloudreve
# COPY docker-bootstrap.sh /cloudreve/bootstrap.sh

RUN set -ex \
    && echo ">>>>>> update dependencies" \
    && apk update \
    && apk add tzdata \
    && echo ">>>>>> set up timezone" \
    && cp /usr/share/zoneinfo/${TZ} /etc/localtime \
    && echo ${TZ} > /etc/timezone \
    && echo ">>>>>> fix cloudreve-main premission" \
    && chmod +x cloudreve
    # # 建立配置
    # && mkdir /etc/cloudreve \
    # # db的配置
    # && ln -s /etc/cloudreve/cloureve.db /cloudreve/cloudreve.db \
    # # conf的配置
    # && ln -s /etc/cloudreve/conf.ini /cloudreve/conf.ini \
    # # statics的配置
    # && ln -s /etc/cloudreve/statics /cloudreve/statics \
    # # log的配置
    # && ln -s /etc/cloudreve/logInfo /cloudreve/logInfo \
    # # data下载目录的配置 aria2的路径要与之相似
    # && ln -s /etc/cloudreve/data /cloudreve/data 

# cloudreve use tcp 5212 port by default
EXPOSE 5212/tcp
VOLUME ["/usr/local/cloudreve/uploads", "/usr/local/downloads", "/usr/local/cloudreve/avatar", "/usr/local/cloudreve/config", "/usr/local/cloudreve/db","/usr/local/cloudreve/logInfo","/usr/local/cloudreve/statics"]



ENTRYPOINT ["/usr/local/cloudreve", "-c", "/cloudreve/config/conf.ini"]
