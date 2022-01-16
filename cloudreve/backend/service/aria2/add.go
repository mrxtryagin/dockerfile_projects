package aria2

import (
	"context"
	"fmt"
	model "github.com/cloudreve/Cloudreve/v3/models"
	"github.com/cloudreve/Cloudreve/v3/pkg/aria2"
	"github.com/cloudreve/Cloudreve/v3/pkg/aria2/common"
	"github.com/cloudreve/Cloudreve/v3/pkg/aria2/monitor"
	"github.com/cloudreve/Cloudreve/v3/pkg/cluster"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem/fsctx"
	"github.com/cloudreve/Cloudreve/v3/pkg/mq"
	"github.com/cloudreve/Cloudreve/v3/pkg/serializer"
	"github.com/cloudreve/Cloudreve/v3/pkg/util"
	"github.com/gin-gonic/gin"
)

// AddURLService 添加URL离线下载服务
type AddURLService struct {
	URL         string `json:"url" binding:"required"`
	Dst         string `json:"dst" binding:"required,min=1"`
	IsCreateDir uint   `json:"isCreateDir"` //  是否创建文件夹 默认是0 不创建 1为创建
	GID         string `json:"gid"`         // 任务ID

}

// Add 主机创建新的链接离线下载任务
func (service *AddURLService) Add(c *gin.Context, taskType int) serializer.Response {
	// 创建文件系统
	fs, err := filesystem.NewFileSystemFromContext(c)
	if err != nil {
		return serializer.Err(serializer.CodePolicyNotAllowed, err.Error(), err)
	}
	defer fs.Recycle()

	// 检查用户组权限
	if !fs.User.Group.OptionsSerialized.Aria2 {
		return serializer.Err(serializer.CodeGroupNotAllowed, "当前用户组无法进行此操作", nil)
	}
	//预留接口 CreateDir 为 0 则 存放路径不存在则报错,否则创建
	// 存放目录是否存在
	if exist, _ := fs.IsPathExist(service.Dst); !exist {
		if service.IsCreateDir == 0 {
			return serializer.Err(serializer.CodeNotFound, "存放路径不存在", nil)
		} else if service.IsCreateDir == 1 {
			util.Log().Info("指定了创建时不存在,则创建,即将创建改路径")
			ctx := context.WithValue(context.Background(), fsctx.IgnoreDirectoryConflictCtx, true) //忽略命名冲突
			_, err := fs.CreateDirectory(ctx, service.Dst)
			if err != nil {
				return serializer.Err(serializer.CodeParamErr, "创建文件夹的过程中出现问题", err)
			}
			util.Log().Info("文件夹 %s 创建成功!", service.Dst)
		} else {
			return serializer.Err(serializer.CodeParamErr, fmt.Sprintf("传入 isCreateDir 参数为 %d 改参数应该在0,1中进行选择", service.IsCreateDir), nil)
		}
	}

	////检查任务是否已经存在 YkzMAbo3
	//existedTask, isExist := CheckUrlBeforeDownload(service.URL)
	//if isExist {
	//
	//}

	// 创建任务
	task := &model.Download{
		Status: common.Ready,
		Type:   taskType,
		Dst:    service.Dst,
		UserID: fs.User.ID,
		Source: service.URL,
		GID:    service.GID, //如果带上gid 进行创建的话
	}

	// 获取 Aria2 负载均衡器
	lb := aria2.GetLoadBalancer()

	// 获取 Aria2 实例
	err, node := cluster.Default.BalanceNodeByFeature("aria2", lb)
	if err != nil {
		return serializer.Err(serializer.CodeInternalSetting, "Aria2 实例获取失败", err)
	}

	// 创建任务
	gid, err := node.GetAria2Instance().CreateTask(task, fs.User.Group.OptionsSerialized.Aria2Options)
	if err != nil {
		util.Log().Error("新建离线任务时发生错误:%s", err.Error())
		return serializer.Err(serializer.CodeNotSet, "任务创建失败", err)
	}

	task.GID = gid
	task.NodeID = node.ID()
	_, err = task.Create()
	if err != nil {
		return serializer.DBErr("任务创建失败", err)
	}

	// 创建任务监控
	monitor.NewMonitor(task, cluster.Default, mq.GlobalMQ)

	return serializer.Response{}
}

// Add 从机创建新的链接离线下载任务
func Add(c *gin.Context, service *serializer.SlaveAria2Call) serializer.Response {
	caller, _ := c.Get("MasterAria2Instance")

	// 创建任务
	gid, err := caller.(common.Aria2).CreateTask(service.Task, service.GroupOptions)
	if err != nil {
		return serializer.Err(serializer.CodeInternalSetting, "无法创建离线下载任务,可能是aria2那边有什么问题", err)
	}

	// 创建事件通知回调
	siteID, _ := c.Get("MasterSiteID")
	mq.GlobalMQ.SubscribeCallback(gid, func(message mq.Message) {
		if err := cluster.DefaultController.SendNotification(siteID.(string), message.TriggeredBy, message); err != nil {
			util.Log().Error("无法发送离线下载任务状态变更通知, %s", err)
		}
	})

	return serializer.Response{Data: gid}
}
