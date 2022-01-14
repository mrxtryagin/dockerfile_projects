package slavetask

import (
	"context"
	"fmt"
	model "github.com/cloudreve/Cloudreve/v3/models"
	"github.com/cloudreve/Cloudreve/v3/pkg/cluster"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem/fsctx"
	"github.com/cloudreve/Cloudreve/v3/pkg/mq"
	"github.com/cloudreve/Cloudreve/v3/pkg/serializer"
	"github.com/cloudreve/Cloudreve/v3/pkg/task"
	"github.com/cloudreve/Cloudreve/v3/pkg/util"
	"os"
	"time"
)

// TransferTask 文件中转任务
type TransferTask struct {
	Err      *task.JobError
	Req      *serializer.SlaveTransferReq
	MasterID string
}

// Props 获取任务属性
func (job *TransferTask) Props() string {
	return ""
}

// Type 获取任务类型
func (job *TransferTask) Type() int {
	return 0
}

// Creator 获取创建者ID
func (job *TransferTask) Creator() uint {
	return 0
}

// Model 获取任务的数据库模型
func (job *TransferTask) Model() *model.Task {
	return nil
}

// SetStatus 设定状态
func (job *TransferTask) SetStatus(status int) {
}

// SetError 设定任务失败信息
func (job *TransferTask) SetError(err *task.JobError) {
	job.Err = err

}

// SetErrorMsg 设定任务失败信息
func (job *TransferTask) SetErrorMsg(msg string, err error) {
	jobErr := &task.JobError{Msg: msg}
	if err != nil {
		jobErr.Error = err.Error()
	}

	job.SetError(jobErr)

	notifyMsg := mq.Message{
		TriggeredBy: job.MasterID,
		Event:       serializer.SlaveTransferFailed,
		Content: serializer.SlaveTransferResult{
			Error: err.Error(),
		},
	}
	util.Log().Info("即将发送错误信息给:%s", job.MasterID)
	if err := cluster.DefaultController.SendNotification(job.MasterID, job.Req.Hash(job.MasterID), notifyMsg); err != nil {
		util.Log().Warning("无法发送转存失败通知到从机, %s", err)
	}
}

// GetError 返回任务失败信息
func (job *TransferTask) GetError() *task.JobError {
	return job.Err
}

// Do 开始执行任务
func (job *TransferTask) Do() {
	defer job.Recycle()
	util.Log().Info("开始执行从机上传任务...")

	fs, err := filesystem.NewAnonymousFileSystem()
	if err != nil {
		util.Log().Error("无法初始化匿名文件系统:%s", err.Error())
		job.SetErrorMsg("无法初始化匿名文件系统", err)
		return
	}

	fs.Policy = job.Req.Policy
	if err := fs.DispatchHandler(); err != nil {
		util.Log().Error("无法分发存储策略:%s", err.Error())
		job.SetErrorMsg("无法分发存储策略", err)
		return
	}

	master, err := cluster.DefaultController.GetMasterInfo(job.MasterID)
	if err != nil {
		util.Log().Error("找不到主机节点:%s", err.Error())
		job.SetErrorMsg("找不到主机节点", err)
		return
	}

	fs.SwitchToShadowHandler(master.Instance, master.URL.String(), master.ID)

	//使用上传策略
	//ctx := context.WithValue(context.Background(), fsctx.DisableOverwrite, true)
	//出现命名冲突 走默认覆盖
	ctx := context.WithValue(context.Background(), fsctx.OnlyOverwrite, true)
	//带上这次task 信息向后传
	ctx = context.WithValue(ctx, fsctx.SlaveInfo, job.Req)

	file, err := os.Open(util.RelativePath(job.Req.Src))
	if err != nil {
		util.Log().Error("无法读取源文件:%s", err.Error())
		job.SetErrorMsg("无法读取源文件", err)
		return
	}

	defer file.Close()

	// 获取源文件大小
	fi, err := file.Stat()
	if err != nil {
		util.Log().Error("无法获取源文件大小:%s", err.Error())
		job.SetErrorMsg("无法获取源文件大小", err)
		return
	}

	size := fi.Size()
	var RetryMax = 15
	for j := 1; j <= RetryMax+1; j++ {
		err = fs.Handler.Put(ctx, file, job.Req.Dst, uint64(size))
		if err != nil {
			util.Log().Error("%s --> %s,文件上传失败:%s", job.Req.Src, job.Req.Dst, err.Error())

		} else {
			//成功则变为空
			err = nil
			break
		}
		if j <= RetryMax {
			//停止10秒
			time.Sleep(time.Duration(10) * time.Second)
			util.Log().Warning("%s --> %s,重试中: %d/%d", job.Req.Src, job.Req.Dst, j, RetryMax)
			//修复错误和信息
			//job.Err.Error = ""
			//job.Err.Msg = ""
			err = nil

		}
		//最后一次重试
		if j == RetryMax+1 {
			job.SetErrorMsg(fmt.Sprintf("上传文件 %s --> %s 的过程中发生错误", job.Req.Src, job.Req.Dst), err)
			return
		}
	}

	msg := mq.Message{
		TriggeredBy: job.MasterID,
		Event:       serializer.SlaveTransferSuccess,
		Content:     serializer.SlaveTransferResult{},
	}

	if err := cluster.DefaultController.SendNotification(job.MasterID, job.Req.Hash(job.MasterID), msg); err != nil {
		util.Log().Warning("无法发送转存成功通知到从机, %s", err)
	}
}

// Recycle 回收临时文件
func (job *TransferTask) Recycle() {
	//新增错误判断
	if job.Err != nil {
		util.Log().Error("任务 %s --> %s 转存过程中出现错误:\n%s,\n信息为:\n%s\n不回收临时文件", job.Req.Src, job.Req.Dst, job.Err.Error, job.Err.Msg)
		return
	}

	util.Log().Info("任务 %s --> %s 转存结束:10s后即将回收临时文件", job.Req.Src, job.Req.Dst)
	time.Sleep(time.Duration(10) * time.Second)
	err := os.Remove(job.Req.Src)
	if err != nil {
		util.Log().Warning("无法删除中转临时文件[%s], %s", job.Req.Src, err)
	} else {
		util.Log().Info("%s 回收成功!", job.Req.Src)
	}
}
