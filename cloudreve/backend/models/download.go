package model

import (
	"encoding/json"
	"path"

	"github.com/cloudreve/Cloudreve/v3/pkg/aria2/rpc"
	"github.com/cloudreve/Cloudreve/v3/pkg/util"
	"github.com/jinzhu/gorm"
)

// Download 离线下载队列模型
type Download struct {
	gorm.Model
	Status         int    // 任务状态
	Type           int    // 任务类型
	Source         string `gorm:"type:text"` // 文件下载地址
	TotalSize      uint64 // 文件大小
	DownloadedSize uint64 // 文件大小
	GID            string `gorm:"size:32,index:gid"` // 任务ID
	Speed          int    // 下载速度
	Parent         string `gorm:"type:text"`       // 存储目录
	Attrs          string `gorm:"size:4294967295"` // 任务状态属性
	Error          string `gorm:"type:text"`       // 错误描述
	Dst            string `gorm:"type:text"`       // 用户文件系统存储父目录路径
	UserID         uint   // 发起者UID
	TaskID         uint   // 对应的转存任务ID
	NodeID         uint   // 处理任务的节点ID

	// 关联模型
	User *User `gorm:"PRELOAD:false,association_autoupdate:false"`

	// 数据库忽略字段
	StatusInfo rpc.StatusInfo `gorm:"-"`
	Task       *Task          `gorm:"-"`
}

// AfterFind 找到下载任务后的钩子，处理Status结构
func (download *Download) AfterFind() (err error) {
	// 解析状态
	if download.Attrs != "" {
		err = json.Unmarshal([]byte(download.Attrs), &download.StatusInfo)
	}

	if download.TaskID != 0 {
		download.Task, _ = GetTasksByID(download.TaskID)
	}

	return err
}

// BeforeSave Save下载任务前的钩子
func (download *Download) BeforeSave() (err error) {
	// 解析状态
	if download.Attrs != "" {
		err = json.Unmarshal([]byte(download.Attrs), &download.StatusInfo)
	}
	return err
}

// Create 创建离线下载记录
func (download *Download) Create() (uint, error) {
	if err := DB.Create(download).Error; err != nil {
		util.Log().Warning("无法插入离线下载记录, %s", err)
		return 0, err
	}
	return download.ID, nil
}

// Save 更新
func (download *Download) Save() error {
	if err := DB.Save(download).Error; err != nil {
		util.Log().Warning("无法更新离线下载记录, %s", err)
		return err
	}
	return nil
}

// GetDownloadsByStatus 根据状态检索下载
func GetDownloadsByStatus(status ...int) []Download {
	var tasks []Download
	DB.Where("status in (?)", status).Find(&tasks)
	return tasks
}

// GetDownloadsByStatusAndUser 根据状态检索和用户ID下载
// page 为 0 表示列出所有，非零时分页
func GetDownloadsByStatusAndUser(page, uid uint, status ...int) []Download {
	var tasks []Download
	dbChain := DB
	if page > 0 {
		dbChain = dbChain.Limit(10).Offset((page - 1) * 10).Order("updated_at DESC")
	}
	dbChain.Where("user_id = ? and status in (?)", uid, status).Find(&tasks)
	return tasks
}

// GetDownloadByGid 根据GID和用户ID查找下载
func GetDownloadByGid(gid string, uid uint) (*Download, error) {
	download := &Download{}
	result := DB.Where("user_id = ? and g_id = ?", uid, gid).First(download)
	return download, result.Error
}

// GetOwner 获取下载任务所属用户
func (download *Download) GetOwner() *User {
	if download.User == nil {
		if user, err := GetUserByID(download.UserID); err == nil {
			return &user
		}
	}
	return download.User
}

// GetDownloadByTaskId 根据taskId 查找下载
func GetDownloadByTaskId(taskId uint) (*Download, error) {
	download := &Download{}
	result := DB.Where("task_id = ?", taskId).First(download)
	return download, result.Error
}

// GetDownloadName
func (download *Download) GetDownloadName() string {
	//err := json.Unmarshal([]byte(download.Attrs), &download.StatusInfo)
	//if err != nil {
	//	return ""
	//}
	fileName := download.StatusInfo.BitTorrent.Info.Name
	if len(download.StatusInfo.Files) == 1 {
		fileName = path.Base(download.StatusInfo.Files[0].Path)
	}
	return fileName
}

// Delete 删除离线下载记录
func (download *Download) Delete() error {
	return DB.Model(download).Delete(download).Error
}

// GetNodeID 返回任务所属节点ID
func (task *Download) GetNodeID() uint {
	// 兼容3.4版本之前生成的下载记录
	if task.NodeID == 0 {
		return 1
	}

	return task.NodeID
}

// GetDownloadJoinTask 获得下载的task
func GetDownloadJoinTask(taskStatus []int, downloadStatus []int, page, uid uint) []Download {
	var tasks []Download
	dbChain := DB.Debug()
	//分页情况
	if page > 0 {
		dbChain = dbChain.Limit(10).Offset((page - 1) * 10).Order("downloads.updated_at DESC")
	}
	// 拼接task 条件
	taskStatusFunc := func(db *gorm.DB) *gorm.DB {
		var d *gorm.DB
		if taskStatus == nil {
			d = db.Where("tasks.status is Null")
		} else {
			if len(taskStatus) == 0 {
				d = db.Where("")
			} else {
				d = db.Where("tasks.status in (?)", taskStatus)
			}

		}
		return d
	}

	dbChain.Joins(" left JOIN tasks on tasks.id=downloads.task_id").
		Where("downloads.status in (?) and downloads.user_id = ? and tasks.deleted_at is Null and tasks.user_id = ?", downloadStatus, uid, uid).
		Scopes(taskStatusFunc).Find(&tasks)
	return tasks
}
