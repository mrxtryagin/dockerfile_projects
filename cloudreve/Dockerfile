

# statics backend
FROM golang:1.16-alpine AS be-builder
RUN echo 'before build....' \
    && apk update \
    && apk add git yarn build-base gcc abuild binutils binutils-doc gcc-doc

ENV MYPATH /usr/local

WORKDIR $MYPATH

# checkout目录
RUN echo "checkout cloudreve..."
RUN set -ex \
    #初始化
    && git init \ 
    # 增加远端的仓库地址
    && git remote add origin  https://github.com/mrxtryagin/dockerfile_projects.git \
    # 设置Sparse Checkout 为true
    && git config core.sparsecheckout true \
    # 将要部分clone的目录相对根目录的路径写入配置文件
    && echo "cloudreve" >> .git/info/sparse-checkout \
    #pull下来代码
    && git pull origin master 
RUN echo "checkout cloudreve done"
# 暴露 源地址
ENV SourcePath $MYPATH/cloudreve



# 处理前端代码
RUN echo 'start to build fronted...'
RUN mkdir -p $MYPATH/fronted

WORKDIR $MYPATH/fronted

# copy 前端
COPY $SourcePath/fronted .

# If encountered problems like JavaScript heap out of memory, please uncomment the following options
ENV NODE_OPTIONS --max_old_space_size=2048

# yarn repo connection is unstable, adjust the network timeout to 10 min.
# yarn build
RUN set -ex \
    && yarn install --network-timeout 600000 \
    && yarn run build
# 重命名
RUN mv build statics

RUN echo 'build fronted successfully!'


RUN echo 'start to build backend...'
ENV GO111MODULE on


# 处理后端源代码
RUN mkdir -p $MYPATH/backend
WORKDIR $MYPATH/backend

COPY $SourcePath/backend .
# build 后端
RUN set -ex \
    && go build -o cloudreve
RUN echo 'build backend successfully!'
# statics final image
FROM alpine:3.12 AS dist

ENV MYPATH /usr/local
LABEL maintainer="mrx"
ENV TZ="Asia/Shanghai"


WORKDIR $MYPATH

# 复制前后端 编译的东西
RUN mkdir -p $MYPATH/statics
COPY --from=be-builder $MYPATH/fronted/statics $MYPATH/statics
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
EXPOSE 5212
VOLUME ["/usr/local/cloudreve/uploads", "/usr/local/downloads", "/usr/local/cloudreve/avatar", "/usr/local/cloudreve/config", "/usr/local/cloudreve/db","/usr/local/cloudreve/logInfo","/usr/local/cloudreve/statics"]



ENTRYPOINT ["/usr/local/cloudreve", "-c", "/cloudreve/config/conf.ini"]
