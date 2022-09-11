# 注意事项


## down与 up要一致 如果不一致可能会出现问题
如:
```bash
docker-compose -p 'test-network' -f 'docker-compose-no-ip.yml'  up -d
```

与
```bash
docker-compose -p 'test-network' -f 'docker-compose-no-ip.yml'  down
```
在指定配置文件的时候 要都使用 -f 来执行 这样才可以精确地删除
不然会出现
```bash

[+] Running 0/0
 ⠿ Network test-net-1  Error                                                                                            0.0s
failed to remove network test-net-1: Error response from daemon: error while removing network: network test-net-1 id 5ff8ead1932dfa93628f9552b286294fc2b1d6d4abb857c6bb3e193805d65e1b has active endpoints

```
的错误(猜测是因为没找到services只找到网络的原因,也就是主要还是因为没指定配置文件)


## docker版本问题
host.docker.internal:host-gateway
需要Docker 20.10 及以上版本
