package aria2

import (
	model "github.com/cloudreve/Cloudreve/v3/models"
	"github.com/cloudreve/Cloudreve/v3/pkg/aria2/common"
	"github.com/cloudreve/Cloudreve/v3/pkg/cluster"
	"github.com/cloudreve/Cloudreve/v3/pkg/serializer"
	"github.com/cloudreve/Cloudreve/v3/pkg/task"
	"github.com/cloudreve/Cloudreve/v3/pkg/util"
	"github.com/gin-gonic/gin"
)

// SelectFileService 选择要下载的文件服务
type SelectFileService struct {
	Indexes []int `json:"indexes" binding:"required"`
}

// DownloadTaskService 下载任务管理服务
type DownloadTaskService struct {
	GID string `uri:"gid" binding:"required"`
}

// DownloadListService 下载列表服务
type DownloadListService struct {
	Page      uint `form:"page"`
	FilterKey int  `form:"filterKey"`
}

type ReloadTaskService struct {
}

var (
	//map filterKey status_list download_list
	statusMap = map[int][][]int{
		-1: {{}, {common.Error, common.Complete, common.Canceled, common.Unknown}}, //全部
		0:  {nil, {common.Error}},                                                  //下载出错
		1:  {nil, {common.Canceled}},                                               //已取消
		2:  {{task.Complete}, {common.Complete}},                                   //已完成
		3:  {{task.Queued}, {common.Complete}},                                     //已完成 转存排队中
		4:  {{task.Processing}, {common.Complete}},                                 //已完成 转存处理中
		5:  {{task.Error}, {common.Complete}},                                      //已完成 转存失败
	}
)

// Finished 获取已完成的任务
func (service *DownloadListService) Finished(c *gin.Context, user *model.User) serializer.Response {
	var downloads []model.Download
	//util.Log().Info("选中 %d", service.FilterKey)
	//状态映射map
	statusArr, ok := statusMap[service.FilterKey]
	if !ok {
		//如果不存在返回空
		downloads = []model.Download{}
	} else {
		// 查找下载记录
		//downloads = model.GetDownloadsByStatusAndUser(service.Page, user.ID, common.Error, common.Complete, common.Canceled, common.Unknown)
		downloads = model.GetDownloadJoinTask(statusArr[0], statusArr[1], service.Page, user.ID)
	}

	return serializer.BuildFinishedListResponse(downloads)
}

// Downloading 获取正在下载中的任务
func (service *DownloadListService) Downloading(c *gin.Context, user *model.User) serializer.Response {
	// 查找下载记录
	downloads := model.GetDownloadsByStatusAndUser(service.Page, user.ID, common.Downloading, common.Paused, common.Ready)
	intervals := make(map[uint]int)
	//增加interval
	for _, download := range downloads {
		if _, ok := intervals[download.ID]; !ok {
			if node := cluster.Default.GetNodeByID(download.GetNodeID()); node != nil {
				intervals[download.ID] = node.DBModel().Aria2OptionsSerialized.Interval
			}
		}
	}

	return serializer.BuildDownloadingResponse(downloads, intervals)
}

// Delete 取消或删除下载任务
func (service *DownloadTaskService) Delete(c *gin.Context) serializer.Response {
	userCtx, _ := c.Get("user")
	user := userCtx.(*model.User)

	// 查找下载记录
	download, err := model.GetDownloadByGid(c.Param("gid"), user.ID)
	if err != nil {
		return serializer.Err(serializer.CodeNotFound, "下载记录不存在", err)
	}
	// 删除任务,取消记录
	if download.Status >= common.Error {
		// 如果任务已完成，则删除任务记录
		if err := download.Delete(); err != nil {
			return serializer.Err(serializer.CodeDBError, "任务记录删除失败", err)
		}
		return serializer.Response{}
	}

	// 取消任务
	node := cluster.Default.GetNodeByID(download.GetNodeID())
	if node == nil {
		return serializer.Err(serializer.CodeInternalSetting, "目标节点不可用", err)
	}

	if err := node.GetAria2Instance().Cancel(download); err != nil {
		return serializer.Err(serializer.CodeNotSet, "操作失败", err)
	}

	return serializer.Response{}
}

// OnlyDelete 仅删除
func (service *DownloadTaskService) OnlyDelete(c *gin.Context) serializer.Response {
	userCtx, _ := c.Get("user")
	user := userCtx.(*model.User)

	// 查找下载记录
	download, err := model.GetDownloadByGid(c.Param("gid"), user.ID)
	if err != nil {
		return serializer.Err(serializer.CodeNotFound, "下载记录不存在", err)
	}
	// 删除任务,取消记录
	if err := download.Delete(); err != nil {
		return serializer.Err(serializer.CodeDBError, "任务记录删除失败", err)
	}

	return serializer.Response{}
}

// Start 开启下载任务
func (service *DownloadTaskService) Start(c *gin.Context) serializer.Response {
	userCtx, _ := c.Get("user")
	user := userCtx.(*model.User)

	// 查找下载记录
	download, err := model.GetDownloadByGid(c.Param("gid"), user.ID)
	if err != nil {
		return serializer.Err(serializer.CodeNotFound, "下载记录不存在", err)
	}

	node := cluster.Default.GetNodeByID(download.GetNodeID())
	if node == nil {
		return serializer.Err(serializer.CodeInternalSetting, "目标节点不可用", err)
	}

	if err := node.GetAria2Instance().Start(download); err != nil {
		return serializer.Err(serializer.CodeNotSet, "操作失败", err)
	}

	return serializer.Response{}
}

// Pause 暂停下载任务
func (service *DownloadTaskService) Pause(c *gin.Context) serializer.Response {
	userCtx, _ := c.Get("user")
	user := userCtx.(*model.User)

	// 查找下载记录
	download, err := model.GetDownloadByGid(c.Param("gid"), user.ID)
	if err != nil {
		return serializer.Err(serializer.CodeNotFound, "下载记录不存在", err)
	}

	node := cluster.Default.GetNodeByID(download.GetNodeID())
	if node == nil {
		return serializer.Err(serializer.CodeInternalSetting, "目标节点不可用", err)
	}

	if err := node.GetAria2Instance().Pause(download); err != nil {
		return serializer.Err(serializer.CodeNotSet, "操作失败", err)
	}

	return serializer.Response{}
}

// Select 选取要下载的文件
func (service *SelectFileService) Select(c *gin.Context) serializer.Response {
	userCtx, _ := c.Get("user")
	user := userCtx.(*model.User)

	// 查找下载记录
	download, err := model.GetDownloadByGid(c.Param("gid"), user.ID)
	if err != nil {
		return serializer.Err(serializer.CodeNotFound, "下载记录不存在", err)
	}

	if download.StatusInfo.BitTorrent.Mode != "multi" || (download.Status != common.Downloading && download.Status != common.Paused) {
		return serializer.Err(serializer.CodeNoPermissionErr, "此下载任务无法选取文件", err)
	}

	// 选取下载
	node := cluster.Default.GetNodeByID(download.GetNodeID())
	if err := node.GetAria2Instance().Select(download, service.Indexes); err != nil {
		return serializer.Err(serializer.CodeNotSet, "操作失败", err)
	}

	return serializer.Response{}

}

//ReLoadTask 重新下载某个任务
func (service *ReloadTaskService) ReLoadTask(c *gin.Context) serializer.Response {
	taskId, _ := c.Get("object_id")
	util.Log().Info("task %d", taskId)
	err := task.ResumeTaskById(taskId)
	if err != nil {
		return serializer.Err(serializer.CodeNotFound, "该中转任务不存在", err)
	}

	return serializer.Response{}
}

// SlaveStatus 从机查询离线任务状态
func SlaveStatus(c *gin.Context, service *serializer.SlaveAria2Call) serializer.Response {
	caller, _ := c.Get("MasterAria2Instance")

	// 查询任务
	status, err := caller.(common.Aria2).Status(service.Task)
	if err != nil {
		util.Log().Error("离线下载任务查询失败:%s", err.Error())
		return serializer.Err(serializer.CodeInternalSetting, "离线下载任务查询失败", err)
	}

	return serializer.NewResponseWithGobData(status)

}

// SlaveCancel 取消从机离线下载任务
func SlaveCancel(c *gin.Context, service *serializer.SlaveAria2Call) serializer.Response {
	caller, _ := c.Get("MasterAria2Instance")

	// 查询任务
	err := caller.(common.Aria2).Cancel(service.Task)
	if err != nil {
		return serializer.Err(serializer.CodeInternalSetting, "任务取消失败", err)
	}

	return serializer.Response{}

}

// SlaveSelect 从机选取离线下载任务文件
func SlaveSelect(c *gin.Context, service *serializer.SlaveAria2Call) serializer.Response {
	caller, _ := c.Get("MasterAria2Instance")

	// 查询任务
	err := caller.(common.Aria2).Select(service.Task, service.Files)
	if err != nil {
		return serializer.Err(serializer.CodeInternalSetting, "任务选取失败", err)
	}

	return serializer.Response{}

}

// SlaveSelect 从机选取离线下载任务文件
func SlaveDeleteTemp(c *gin.Context, service *serializer.SlaveAria2Call) serializer.Response {
	caller, _ := c.Get("MasterAria2Instance")

	// 查询任务
	err := caller.(common.Aria2).DeleteTempFile(service.Task)
	if err != nil {
		return serializer.Err(serializer.CodeInternalSetting, "临时文件删除失败", err)
	}

	return serializer.Response{}

}

// SlaveStart 取消从机离线下载任务
func SlaveStart(c *gin.Context, service *serializer.SlaveAria2Call) serializer.Response {
	caller, _ := c.Get("MasterAria2Instance")

	// 查询任务
	err := caller.(common.Aria2).Start(service.Task)
	if err != nil {
		return serializer.Err(serializer.CodeInternalSetting, "任务开启失败", err)
	}

	return serializer.Response{}

}

// SlaveStart 取消从机离线下载任务
func SlavePause(c *gin.Context, service *serializer.SlaveAria2Call) serializer.Response {
	caller, _ := c.Get("MasterAria2Instance")

	// 查询任务
	err := caller.(common.Aria2).Pause(service.Task)
	if err != nil {
		return serializer.Err(serializer.CodeInternalSetting, "任务强制暂停失败", err)
	}

	return serializer.Response{}

}
