# happypandax dockfile by dezhao

FROM ubuntu:20.04 as system
RUN useradd --create-home --no-log-init --shell /bin/bash happypandax
RUN apt update \
    && apt install -y tzdata locales
RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
RUN echo 'Asia/Shanghai' >/etc/timezone
ENV HPX_DOCKER=true
ENV HPX_CONTENT=/content
ENV HPX_DATA=/data
WORKDIR /happypandax
ADD --chown=happypandax:happypandax happypandax0.13.3.linux.tar.gz /happypandax/
ADD --chown=happypandax:happypandax config.yaml /happypandax
ADD --chown=happypandax:happypandax startup.sh /
RUN mkdir $HPX_CONTENT && mkdir $HPX_DATA && mkdir /happypandax/data
RUN chmod -R 777 /happypandax && chmod -R 777 $HPX_CONTENT && chmod -R 777 $HPX_DATA
RUN chown -R happypandax:happypandax $HPX_CONTENT && chown -R happypandax:happypandax $HPX_DATA
RUN chmod +x /startup.sh
EXPOSE 7006 
EXPOSE 7007
EXPOSE 7008
ENTRYPOINT ["/startup.sh"]
