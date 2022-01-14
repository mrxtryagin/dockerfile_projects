package task

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/cloudreve/Cloudreve/v3/pkg/cluster"
	"github.com/shopspring/decimal"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	model "github.com/cloudreve/Cloudreve/v3/models"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem/fsctx"
	"github.com/cloudreve/Cloudreve/v3/pkg/serializer"
	"github.com/cloudreve/Cloudreve/v3/pkg/util"
)

// TransferTask 文件中转任务
type TransferTask struct {
	User      *model.User
	TaskModel *model.Task
	TaskProps TransferProps
	Err       *JobError
	OtherInfo TransferOtherInfo
	zipPath   string
}

// TransferProps 中转任务属性 task.props_json 字段
type TransferProps struct {
	Src      []string          `json:"src"`      // 原始文件
	SrcSizes map[string]uint64 `json:"src_size"` // 原始文件的大小信息，从机转存时使用
	Parent   string            `json:"parent"`   // 父目录
	Dst      string            `json:"dst"`      // 目的目录ID
	// 将会保留原始文件的目录结构，Src 除去 Parent 开头作为最终路径
	TrimPath bool `json:"trim_path"`
	// 负责处理中专任务的节点ID
	NodeID uint `json:"node_id"`
}

// transferOtherInfo 的 字段
type TransferOtherInfo struct {
	SpeedInfo    string `json:"speed"`          //速度信息
	TryCountInfo int    `json:"try_count_info"` //重试信息
}

// Props 获取任务属性
func (job *TransferTask) Props() string {
	res, _ := json.Marshal(job.TaskProps)
	return string(res)
}

// Type 获取任务状态
func (job *TransferTask) Type() int {
	return TransferTaskType
}

// Creator 获取创建者ID
func (job *TransferTask) Creator() uint {
	return job.User.ID
}

// Model 获取任务的数据库模型
func (job *TransferTask) Model() *model.Task {
	return job.TaskModel
}

//SetOtherInfo 设置其他信息
func (job *TransferTask) SetOtherInfo(speedInfo string, tryCountInfo int) {
	transferOtherInfo := &TransferOtherInfo{
		SpeedInfo:    speedInfo,
		TryCountInfo: tryCountInfo,
	}
	res, _ := json.Marshal(transferOtherInfo)
	job.TaskModel.SetOtherInfo(string(res))

}

// SetStatus 设定状态
func (job *TransferTask) SetStatus(status int) {
	job.TaskModel.SetStatus(status)
}

// SetError 设定任务失败信息
func (job *TransferTask) SetError(err *JobError) {
	job.Err = err
	res, _ := json.Marshal(job.Err)
	job.TaskModel.SetError(string(res))

}

// SetErrorMsg 设定任务失败信息
func (job *TransferTask) SetErrorMsg(msg string, err error) {
	jobErr := &JobError{Msg: msg}
	if err != nil {
		jobErr.Error = err.Error()
	}
	job.SetError(jobErr)
}

// GetError 返回任务失败信息
func (job *TransferTask) GetError() *JobError {
	return job.Err
}

// Do 开始执行任务
//todo:上传完毕大小校验
//todo: 从机问题
func (job *TransferTask) Do() {

	// 创建文件系统
	fs, err := filesystem.NewFileSystem(job.User)
	if err != nil {
		job.SetErrorMsg(err.Error(), nil)
		return
	}
	start := time.Now().Unix()
	//当前的任务的index
	LocalIndex := util.If(job.TaskModel.Progress == 0, 1, job.TaskModel.Progress).(int)
	//出现命名冲突 走默认覆盖
	ctx := context.WithValue(context.Background(), fsctx.OnlyOverwrite, true)
	//大于0判断已经下过一次了 带上唯一标识(这个标识理论上会一直存在于后面)
	if job.TaskModel.Progress > 0 {
		ctx = context.WithValue(ctx, fsctx.OtherId, time.Now().Unix())
	}
	//defer job.Recycle()
	//task 目前都是顺序上传
	util.Log().Info("user %d task %d do transfering... 从 第 %d 个 任务开始...", job.TaskModel.UserID, job.TaskModel.ID, LocalIndex)

	//带上这次task 信息向后传
	ctx = context.WithValue(ctx, fsctx.TaskInfo, job.TaskModel)
	var isSlaveUpload = false
	// todo:使用从机还是主机进行上传
	if job.TaskProps.NodeID > 1 {
		// 指定为从机中转
		// 获取从机节点
		node := cluster.Default.GetNodeByID(job.TaskProps.NodeID)
		if node == nil {
			util.Log().Error("指定了从机,但从机节点 %d 不可用(或失活),此时的任务为:%d,请检查自己配置的节点是否正确", job.TaskProps.NodeID, job.TaskModel.ID)
			job.SetErrorMsg(fmt.Sprintf("指定了从机,但从机节点 %d 不可用(或失活),请检查自己配置的节点是否正确", job.TaskProps.NodeID), nil)
			return
		}

		// 切换为从机节点处理上传
		fs.SwitchToSlaveHandler(node)
		// check 过后 仍然使用从机上传
		util.Log().Info("system,upload will use node %d", job.TaskProps.NodeID)
		isSlaveUpload = true

	}

	// 重点
	//选取剩余任务(不让每次重启的时候都从头开始)
	//总任务
	totalTaskLen := len(job.TaskProps.Src)
	TaskSlice := job.TaskProps.Src[LocalIndex-1:]
	// 总重试次数
	TotalTryCount := util.If(job.OtherInfo != TransferOtherInfo{}, job.OtherInfo.TryCountInfo, 0).(int)
	//遍历任务
	for index, file := range TaskSlice {
		//index 为 数组中元素 file 为待上传列表的每一个文件的绝对路径
		//设置进度的时候 progress 跟着改了 todo: 这边的速度记录 不是很好.可以通过ctx 带到后面去 来更新分块的速度
		job.TaskModel.SetProgress(LocalIndex + index)

		dst := path.Join(job.TaskProps.Dst, filepath.Base(file))
		if job.TaskProps.TrimPath {
			//如果是TrimPath 说明下载的种子最后是一个文件夹,这个时候 上传的路径就不一样了
			trim := util.FormSlash(job.TaskProps.Parent)
			src := util.FormSlash(file)
			dst = path.Join(job.TaskProps.Dst, strings.TrimPrefix(src, trim))
		}
		//为从机上传提供地址
		ctx = context.WithValue(ctx, fsctx.SlaveSrcPath, file)
		//开始上传
		util.Log().Info("user: %d task: %d  file: %s  progress: %d/%d,will to upload ...", job.TaskModel.UserID, job.TaskModel.ID, dst, LocalIndex+index, totalTaskLen)
		fileSize := job.TaskProps.SrcSizes[file]
		//远端上传
		//todo:改整体重试为局部重试
		var RetryMax = 15
		for j := 1; j <= RetryMax+1; j++ {
			_start := time.Now().Unix()
			//如果走从机
			if isSlaveUpload {
				err = fs.UploadFromStream(ctx, nil, dst, fileSize)
			} else {
				err = fs.UploadFromPath(ctx, file, dst, true)
			}
			_end := time.Now().Unix()
			//耗费的秒数
			cost := util.If(_end-_start == 0, 0.0001, float64(_end-_start)).(float64)
			_speed, _ := decimal.NewFromFloat(float64(fileSize) / cost).Round(2).Float64()
			_speedstr := util.ConvertSizeToString(_speed)
			util.Log().Info("filesize: %s uploaded! cost: %g speed: %s /s", util.ConvertSizeToString(float64(fileSize)), cost, _speedstr)
			// 记录其他信息
			job.SetOtherInfo(_speedstr, TotalTryCount)
			// 如果 是从机 记录speed 如果发生错误 退出
			if isSlaveUpload {
				job.TaskModel.SetSpeed(_speed)
				if err != nil {
					util.Log().Error("从机任务 %d 转存出现错误 %s,此时为上传队列的第 %d 个,上传的文件是: %s", job.TaskModel.ID, err, LocalIndex+index, file)
					job.SetErrorMsg("文件转存失败", err)
					goto endFor
				}
				//否则继续下面的
				break

			}
			//如果上传有问题
			if err != nil {
				util.Log().Error("任务 %d 转存出现错误 %s,此时为上传队列的第 %d 个,上传的文件是: %s", job.TaskModel.ID, err, LocalIndex+index, file)
				job.SetErrorMsg("文件转存失败", err)
				//if err.Error() == "同名文件或目录已存在" {
				//	//如果同名文件或目录已存在 直接略过 不用重试了
				//	//job.Err = nil
				//	break
				//}

			} else {
				//没问题 退出重试

				break
			}
			if j <= RetryMax {
				//停止10秒
				time.Sleep(time.Duration(10) * time.Second)
				util.Log().Warning("重试 %d 中: %d/%d", job.TaskModel.ID, j, RetryMax)
				TotalTryCount++
				//修复错误和信息
				//job.Err.Error = ""
				//job.Err.Msg = ""
				job.Err = nil

			}
			//最后一次重试
			if j == RetryMax+1 {
				//退出外层循环
				goto endFor
			}
		}
	}
endFor:
	end := time.Now().Unix()
	util.Log().Info("user: %d task: %d finished cost: %d s", job.TaskModel.UserID, job.TaskModel.ID, end-start)
	job.Recycle()

}

//GetFolderProperty 获得文件夹极其子目录的大小
func GetFolderProperty(userId uint, folder *model.Folder) (serializer.ObjectProps, error) {
	var props serializer.ObjectProps
	props.QueryDate = time.Now()
	//// 如果对象是目录, 先尝试返回缓存结果
	//if cacheRes, ok := cache.Get(fmt.Sprintf("folder_props_%d",folder.ID)); ok {
	//	return cacheRes.(serializer.ObjectProps),nil
	//}

	props.CreatedAt = folder.CreatedAt
	props.UpdatedAt = folder.UpdatedAt

	// 统计子目录
	childFolders, err := model.GetRecursiveChildFolder([]uint{folder.ID},
		userId, true)
	if err != nil {
		return props, err
	}
	props.ChildFolderNum = len(childFolders) - 1

	// 统计子文件
	files, err := model.GetChildFilesOfFolders(&childFolders)
	if err != nil {
		return props, err
	}

	// 统计子文件个数和大小
	props.ChildFileNum = len(files)
	for i := 0; i < len(files); i++ {
		props.Size += files[i].Size
	}

	return props, nil
}

// JudgeSize 判断大小
func (job *TransferTask) JudgeSize() bool {
	util.Log().Warning("校验 任务 %d 大小是否一致中...", job.TaskModel.ID)
	//获得指定task_id的download信息
	download, err := model.GetDownloadByTaskId(job.TaskModel.ID)
	if err != nil {
		util.Log().Error("task %d 对应的下载记录不存在 不回收文件", job.TaskModel.ID)
		return false
	}
	//util.Log().Info("task %d 对应的download 为 %+v",job.TaskModel.ID,download.StatusInfo)
	//通过download信息获得文件名
	fileName := download.GetDownloadName()
	if fileName == "" {
		util.Log().Error("task %d 未找到对应的文件名", job.TaskModel.ID)
		return false
	}
	//绝对路径
	absPath := path.Join(download.Dst, fileName)
	//获得size
	var size uint64
	//如果是文件夹
	if download.StatusInfo.BitTorrent.Mode == "multi" {
		//通过文件夹的绝对路径获得文件夹对象
		result, folder := model.UseFolderNameGetFolder(absPath, job.TaskModel.UserID)
		if !result {
			util.Log().Error("task %d 对应的 文件夹 %s 不存在", job.TaskModel.ID, absPath)
			return false
		}
		//获得该文件夹的详情
		props, err := GetFolderProperty(job.TaskModel.UserID, folder)
		if err != nil {
			util.Log().Error("task %d 对应的文件夹 %+v 查看详情时出现错误,错误为 %s", job.TaskModel.ID, folder, err)
			return false
		}
		size = props.Size

	} else if download.StatusInfo.BitTorrent.Mode == "single" || download.StatusInfo.BitTorrent.Mode == "" {
		//获得父目录的id
		result, folder := model.UseFolderNameGetFolder(download.Dst, job.TaskModel.UserID)
		if !result {
			util.Log().Error("task %d 对应的文件 %s 的父文件夹 %s 不存在", job.TaskModel.ID, absPath, download.Dst)
			return false
		}
		//通过父目录获得子文件
		file, err := folder.GetChildFile(fileName)
		if err != nil {
			util.Log().Error("task %d 对应的文件 %s 查看大小时出现错误,错误为 %s", job.TaskModel.ID, absPath, err)
			return false
		}
		size = file.Size
	} else {
		util.Log().Error("task %d 对应的下载记录中记录的下载文件类型不对应", job.TaskModel.ID)
		job.SetErrorMsg("任务的中转过程中可能出现错误,对应的下载记录中记录的下载文件类型不对应", nil)
		return false
	}
	util.Log().Info("经过计算: 中转任务 %d :\n %s --> %s 理论大小为: %d 实际大小为 %d", job.TaskModel.ID, job.TaskProps.Parent, absPath, download.TotalSize, size)
	if download.TotalSize == size {
		util.Log().Info("中转任务 %d 理论大小与实际大小一致!", job.TaskModel.ID)
		return true
	} else {
		util.Log().Error("中转任务 %d 理论大小与实际大小不一致! 不回收文件", job.TaskModel.ID)
		job.SetErrorMsg("任务的中转过程中可能出现错误(理论大小与实际大小不一致),请检查中转完成的文件是否符合需求", nil)
		return false
	}

}

// Recycle 回收临时文件
func (job *TransferTask) Recycle() bool {
	//新增错误判断
	if job.Err != nil {
		util.Log().Error("任务 %d 转存结束:\n最后的错误为:\n%s,\n信息为:\n%s\n不回收临时文件", job.TaskModel.ID, job.Err.Error, job.Err.Msg)
		return false
	}
	//主节点上传才删
	if job.TaskProps.NodeID <= 0 {
		//todo: 判断大小校验(暂时不校验(可能会有问题))
		//if !job.JudgeSize() {
		//	return false
		//}

		util.Log().Info("任务 %d 转存完成...30s后回收临时文件", job.TaskModel.ID)
		time.Sleep(time.Duration(30) * time.Second)
		err := os.RemoveAll(job.TaskProps.Parent)
		if err != nil {
			util.Log().Warning("无法删除中转临时目录[%s], %s", job.TaskProps.Parent, err)
		} else {
			util.Log().Info(" %s 回收成功!", job.TaskProps.Parent)
		}
		return true
	} else {
		util.Log().Info("任务 %d 转存结束,由于全程使用节点:%d 所以不回收临时目录", job.TaskModel.ID, job.TaskProps.NodeID)
	}

	return true
}

// NewTransferTask 新建中转任务
func NewTransferTask(user uint, src []string, dst, parent string, trim bool, node uint, sizes map[string]uint64) (Job, error) {
	creator, err := model.GetActiveUserByID(user)
	if err != nil {
		return nil, err
	}

	newTask := &TransferTask{
		User: &creator,
		// task props
		TaskProps: TransferProps{
			Src:      src,
			Parent:   parent,
			Dst:      dst,
			TrimPath: trim,
			NodeID:   node,
			SrcSizes: sizes,
		},
	}

	record, err := Record(newTask)
	if err != nil {
		return nil, err
	}
	newTask.TaskModel = record

	return newTask, nil
}

// NewTransferTaskFromModel 从数据库记录中恢复中转任务
func NewTransferTaskFromModel(task *model.Task) (Job, error) {
	user, err := model.GetActiveUserByID(task.UserID)
	if err != nil {
		return nil, err
	}
	newTask := &TransferTask{
		User:      &user,
		TaskModel: task,
	}

	err = json.Unmarshal([]byte(task.Props), &newTask.TaskProps)
	if err != nil {
		return nil, err
	}
	if task.OtherInfo != "" {
		err = json.Unmarshal([]byte(task.OtherInfo), &newTask.OtherInfo)
	}
	return newTask, nil
}
