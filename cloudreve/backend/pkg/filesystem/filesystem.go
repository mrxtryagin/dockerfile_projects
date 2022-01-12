package filesystem

import (
	"errors"
	"fmt"
	"github.com/cloudreve/Cloudreve/v3/pkg/cluster"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem/driver"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem/driver/shadow/masterinslave"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem/driver/shadow/slaveinmaster"
	"io"
	"net/http"
	"net/url"
	"sync"

	model "github.com/cloudreve/Cloudreve/v3/models"
	"github.com/cloudreve/Cloudreve/v3/pkg/auth"
	"github.com/cloudreve/Cloudreve/v3/pkg/conf"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem/driver/cos"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem/driver/local"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem/driver/onedrive"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem/driver/oss"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem/driver/qiniu"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem/driver/remote"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem/driver/s3"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem/driver/upyun"
	"github.com/cloudreve/Cloudreve/v3/pkg/request"
	"github.com/cloudreve/Cloudreve/v3/pkg/serializer"
	"github.com/gin-gonic/gin"
	cossdk "github.com/tencentyun/cos-go-sdk-v5"
)

// FSPool 文件系统资源池
var FSPool = sync.Pool{
	New: func() interface{} {
		return &FileSystem{}
	},
}

// FileHeader 上传来的文件数据处理器
type FileHeader interface {
	io.Reader
	io.Closer
	GetSize() uint64
	GetMIMEType() string
	GetFileName() string
	GetVirtualPath() string
}

// FileSystem 管理文件的文件系统
type FileSystem struct {
	// 文件系统所有者
	User *model.User
	// 操作文件使用的存储策略
	Policy *model.Policy
	// 当前正在处理的文件对象
	FileTarget []model.File
	// 当前正在处理的目录对象
	DirTarget []model.Folder
	// 相对根目录
	Root *model.Folder
	// 互斥锁
	Lock sync.Mutex

	/*
	   钩子函数
	*/
	Hooks map[string][]Hook

	/*
	   文件系统处理适配器
	*/
	Handler driver.Handler

	// 回收锁
	recycleLock sync.Mutex
}

// getEmptyFS 从pool中获取新的FileSystem
func getEmptyFS() *FileSystem {
	fs := FSPool.Get().(*FileSystem)
	return fs
}

// Recycle 回收FileSystem资源
func (dstfs *FileSystem) Recycle() {
	dstfs.recycleLock.Lock()
	dstfs.reset()
	FSPool.Put(dstfs)
}

// reset 重设文件系统，以便回收使用
func (dstfs *FileSystem) reset() {
	dstfs.User = nil
	dstfs.CleanTargets()
	dstfs.Policy = nil
	dstfs.Hooks = nil
	dstfs.Handler = nil
	dstfs.Root = nil
	dstfs.Lock = sync.Mutex{}
	dstfs.recycleLock = sync.Mutex{}
}

// NewFileSystem 初始化一个文件系统
func NewFileSystem(user *model.User) (*FileSystem, error) {
	fs := getEmptyFS()
	fs.User = user
	// 分配存储策略适配器
	err := fs.DispatchHandler()

	return fs, err
}

// NewAnonymousFileSystem 初始化匿名文件系统
func NewAnonymousFileSystem() (*FileSystem, error) {
	fs := getEmptyFS()
	fs.User = &model.User{}

	// 如果是主机模式下，则为匿名文件系统分配游客用户组
	if conf.SystemConfig.Mode == "master" {
		anonymousGroup, err := model.GetGroupByID(3)
		if err != nil {
			return nil, err
		}
		fs.User.Group = anonymousGroup
	} else {
		// 从机模式下，分配本地策略处理器
		fs.Handler = local.Driver{}
	}

	return fs, nil
}

// DispatchHandler 根据存储策略分配文件适配器
func (dstfs *FileSystem) DispatchHandler() error {
	var policyType string
	var currentPolicy *model.Policy

	if dstfs.Policy == nil {
		// 如果没有具体指定，就是用用户当前存储策略
		policyType = dstfs.User.Policy.Type
		currentPolicy = &dstfs.User.Policy
	} else {
		policyType = dstfs.Policy.Type
		currentPolicy = dstfs.Policy
	}

	switch policyType {
	case "mock", "anonymous":
		return nil
	case "local":
		dstfs.Handler = local.Driver{
			Policy: currentPolicy,
		}
		return nil
	case "remote":
		dstfs.Handler = remote.Driver{
			Policy:       currentPolicy,
			Client:       request.NewClient(),
			AuthInstance: auth.HMACAuth{[]byte(currentPolicy.SecretKey)},
		}
		return nil
	case "qiniu":
		dstfs.Handler = qiniu.Driver{
			Policy: currentPolicy,
		}
		return nil
	case "oss":
		dstfs.Handler = oss.Driver{
			Policy:     currentPolicy,
			HTTPClient: request.NewClient(),
		}
		return nil
	case "upyun":
		dstfs.Handler = upyun.Driver{
			Policy: currentPolicy,
		}
		return nil
	case "onedrive":
		var odErr error
		dstfs.Handler, odErr = onedrive.NewDriver(currentPolicy)
		return odErr
	case "cos":
		u, _ := url.Parse(currentPolicy.Server)
		b := &cossdk.BaseURL{BucketURL: u}
		dstfs.Handler = cos.Driver{
			Policy: currentPolicy,
			Client: cossdk.NewClient(b, &http.Client{
				Transport: &cossdk.AuthorizationTransport{
					SecretID:  currentPolicy.AccessKey,
					SecretKey: currentPolicy.SecretKey,
				},
			}),
			HTTPClient: request.NewClient(),
		}
		return nil
	case "s3":
		dstfs.Handler = s3.Driver{
			Policy: currentPolicy,
		}
		return nil
	default:
		return ErrUnknownPolicyType
	}
}

// NewFileSystemFromContext 从gin.Context创建文件系统
func NewFileSystemFromContext(c *gin.Context) (*FileSystem, error) {
	user, exist := c.Get("user")
	if !exist {
		return NewAnonymousFileSystem()
	}
	fs, err := NewFileSystem(user.(*model.User))
	return fs, err
}

// NewFileSystemFromCallback 从gin.Context创建回调用文件系统
func NewFileSystemFromCallback(c *gin.Context) (*FileSystem, error) {
	fs, err := NewFileSystemFromContext(c)
	if err != nil {
		return nil, err
	}

	// 获取回调会话
	callbackSessionRaw, ok := c.Get("callbackSession")
	if !ok {
		return nil, errors.New("找不到回调会话")
	}
	callbackSession := callbackSessionRaw.(*serializer.UploadSession)

	// 重新指向上传策略
	policy, err := model.GetPolicyByID(callbackSession.PolicyID)
	if err != nil {
		return nil, err
	}
	fs.Policy = &policy
	fs.User.Policy = policy
	err = fs.DispatchHandler()

	return fs, err
}

// SwitchToSlaveHandler 将负责上传的 Handler 切换为从机节点
func (dstfs *FileSystem) SwitchToSlaveHandler(node cluster.Node) {
	dstfs.Handler = slaveinmaster.NewDriver(node, dstfs.Handler, &dstfs.User.Policy)
}

// SwitchToShadowHandler 将负责上传的 Handler 切换为从机节点转存使用的影子处理器
func (dstfs *FileSystem) SwitchToShadowHandler(master cluster.Node, masterURL, masterID string) {
	switch dstfs.Policy.Type {
	case "local":
		dstfs.Policy.Type = "remote"
		dstfs.Policy.Server = masterURL
		dstfs.Policy.AccessKey = fmt.Sprintf("%d", master.ID())
		dstfs.Policy.SecretKey = master.DBModel().MasterKey
		dstfs.DispatchHandler()
	case "onedrive":
		dstfs.Policy.MasterID = masterID
	}

	dstfs.Handler = masterinslave.NewDriver(master, dstfs.Handler, dstfs.Policy)
}

// SetTargetFile 设置当前处理的目标文件
func (dstfs *FileSystem) SetTargetFile(files *[]model.File) {
	if len(dstfs.FileTarget) == 0 {
		dstfs.FileTarget = *files
	} else {
		dstfs.FileTarget = append(dstfs.FileTarget, *files...)
	}

}

// SetTargetDir 设置当前处理的目标目录
func (dstfs *FileSystem) SetTargetDir(dirs *[]model.Folder) {
	if len(dstfs.DirTarget) == 0 {
		dstfs.DirTarget = *dirs
	} else {
		dstfs.DirTarget = append(dstfs.DirTarget, *dirs...)
	}

}

// SetTargetFileByIDs 根据文件ID设置目标文件，忽略用户ID
func (dstfs *FileSystem) SetTargetFileByIDs(ids []uint) error {
	files, err := model.GetFilesByIDs(ids, 0)
	if err != nil || len(files) == 0 {
		return ErrFileExisted.WithError(err)
	}
	dstfs.SetTargetFile(&files)
	return nil
}

// SetTargetByInterface 根据 model.File 或者 model.Folder 设置目标对象
// TODO 测试
func (dstfs *FileSystem) SetTargetByInterface(target interface{}) error {
	if file, ok := target.(*model.File); ok {
		dstfs.SetTargetFile(&[]model.File{*file})
		return nil
	}
	if folder, ok := target.(*model.Folder); ok {
		dstfs.SetTargetDir(&[]model.Folder{*folder})
		return nil
	}

	return ErrObjectNotExist
}

// CleanTargets 清空目标
func (dstfs *FileSystem) CleanTargets() {
	dstfs.FileTarget = dstfs.FileTarget[:0]
	dstfs.DirTarget = dstfs.DirTarget[:0]
}
