# before run
echo 'run before... local install curl wget and git-all'
# apt-get update && apt-get install -y curl wget git-all
# checkout_script
echo 'check out script ....'
# clone_project by $1
mkdir $1 # 创建一个目录
cd $1
git init #初始化
git remote add origin  https://github.com/mrxtryagin/dockerfile_projects.git # 增加远端的仓库地址
git config core.sparsecheckout true # 设置Sparse Checkout 为true 
echo "$1" >> .git/info/sparse-checkout # 将要部分clone的目录相对根目录的路径写入配置文件
git pull origin master #pull下来代码
cd .. # cd回来
# builder by docker
docker build -f $1/Dockerfile -t $1:$2 .