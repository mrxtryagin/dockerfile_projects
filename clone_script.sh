mkdir $1 # 创建一个目录
cd $1
git init #初始化
git remote add origin  https://github.com/mrxtryagin/dockerfile_projects.git # 增加远端的仓库地址
git config core.sparsecheckout true # 设置Sparse Checkout 为true 
echo "$1" >> .git/info/sparse-checkout # 将要部分clone的目录相对根目录的路径写入配置文件
git pull origin master #pull下来代码