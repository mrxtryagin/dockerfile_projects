package main

import (
	"flag"
	"fmt"
	"github.com/cloudreve/Cloudreve/v3/bootstrap"
	"github.com/cloudreve/Cloudreve/v3/pkg/conf"
	"github.com/cloudreve/Cloudreve/v3/pkg/util"
	"github.com/cloudreve/Cloudreve/v3/routers"
	"github.com/yezihack/e"
)

var (
	isEject    bool
	confPath   string
	scriptName string
)

//优先级比main高可以做一些服务器运行之前的操作
func init() {
	defer catchError()
	util.Log().Info("mod by mrx ~~")
	flag.StringVar(&confPath, "c", util.RelativePath("conf.ini"), "配置文件路径")
	flag.BoolVar(&isEject, "eject", false, "导出内置静态资源")
	flag.StringVar(&scriptName, "database-script", "", "运行内置数据库助手脚本")
	flag.Parse()
	bootstrap.Init(confPath)
}

func main() {
	defer catchError()
	if isEject {
		// 开始导出内置静态资源文件
		bootstrap.Eject()
		return
	}

	if scriptName != "" {
		// 开始运行助手数据库脚本
		bootstrap.RunScript(scriptName)
		return
	}

	//初始化路由
	api := routers.InitRouter()
	util.Log().Info("初始化路由完毕")

	// 如果启用了SSL
	if conf.SSLConfig.CertPath != "" {
		go func() {
			util.Log().Info("开始监听 %s", conf.SSLConfig.Listen)
			if err := api.RunTLS(conf.SSLConfig.Listen,
				conf.SSLConfig.CertPath, conf.SSLConfig.KeyPath); err != nil {
				util.Log().Error("无法监听[%s]，%s", conf.SSLConfig.Listen, err)
			}
		}()
	}

	// 如果启用了Unix
	if conf.UnixConfig.Listen != "" {
		util.Log().Info("开始监听 %s", conf.UnixConfig.Listen)
		if err := api.RunUnix(conf.UnixConfig.Listen); err != nil {
			util.Log().Error("无法监听[%s]，%s", conf.UnixConfig.Listen, err)
		}
		return
	}
	//以什么端口启动
	util.Log().Info("开始监听 %s", conf.SystemConfig.Listen)
	if err := api.Run(conf.SystemConfig.Listen); err != nil {
		util.Log().Error("无法监听[%s]，%s", conf.SystemConfig.Listen, err)
	}
}

// catch 所有的panic 保存
func catchError() {
	errs := recover()
	if errs == nil {
		return
	} else {
		err := e.New(fmt.Sprintf("%v", errs))
		if e.Assert(err) {
			e1 := e.Convert(err)
			util.Log().PanicNotTruePanic(e1.Msg())
			util.Log().PanicNotTruePanic("stack info :\n%s", e1.ToStr())
			//util.Log().Panic(e1.Msg())

		}
		panic(err)

	}

}
