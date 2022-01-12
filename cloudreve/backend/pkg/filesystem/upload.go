package filesystem

import (
	"context"
	"io"
	"os"
	"path"

	model "github.com/cloudreve/Cloudreve/v3/models"
	"github.com/cloudreve/Cloudreve/v3/pkg/cache"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem/driver/local"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem/fsctx"
	"github.com/cloudreve/Cloudreve/v3/pkg/request"
	"github.com/cloudreve/Cloudreve/v3/pkg/serializer"
	"github.com/cloudreve/Cloudreve/v3/pkg/util"
	"github.com/gin-gonic/gin"
)

/* ================
	 上传处理相关
   ================
*/

// Upload 上传文件
func (dstfs *FileSystem) Upload(ctx context.Context, file FileHeader) (err error) {
	ctx = context.WithValue(ctx, fsctx.FileHeaderCtx, file)

	// 上传前的钩子
	err = dstfs.Trigger(ctx, "BeforeUpload")
	if err != nil {
		request.BlackHole(file)
		return err
	}

	// 生成文件名和路径,
	var savePath string
	// 如果是更新操作就从上下文中获取
	if originFile, ok := ctx.Value(fsctx.FileModelCtx).(model.File); ok {
		savePath = originFile.SourceName
	} else {
		savePath = dstfs.GenerateSavePath(ctx, file)
	}
	ctx = context.WithValue(ctx, fsctx.SavePathCtx, savePath)

	// 处理客户端未完成上传时，关闭连接
	go dstfs.CancelUpload(ctx, savePath, file)

	// 保存文件 主体
	err = dstfs.Handler.Put(ctx, file, savePath, file.GetSize())
	if err != nil {
		dstfs.Trigger(ctx, "AfterUploadFailed")
		return err
	}

	// 上传完成后的钩子
	err = dstfs.Trigger(ctx, "AfterUpload")

	if err != nil {
		//todo: 如果本地失败 onedrive 也会回收
		// 上传完成后续处理失败
		followUpErr := dstfs.Trigger(ctx, "AfterValidateFailed")
		// 失败后再失败...
		if followUpErr != nil {
			util.Log().Debug("AfterValidateFailed 钩子执行失败，%s", followUpErr)
		}

		return err
	}

	util.Log().Info(
		"新文件PUT:%s , 大小:%s, 上传者:%s",
		file.GetFileName(),
		util.ConvertSizeToString(float64(file.GetSize())),
		dstfs.User.Nick,
	)

	return nil
}

// GenerateSavePath 生成要存放文件的路径
// TODO 完善测试
func (dstfs *FileSystem) GenerateSavePath(ctx context.Context, file FileHeader) string {
	if dstfs.User.Model.ID != 0 {
		return path.Join(
			dstfs.User.Policy.GeneratePath(
				dstfs.User.Model.ID,
				file.GetVirtualPath(),
			),
			dstfs.User.Policy.GenerateFileName(
				dstfs.User.Model.ID,
				file.GetFileName(),
			),
		)
	}

	// 匿名文件系统尝试根据上下文中的上传策略生成路径
	var anonymousPolicy model.Policy
	if policy, ok := ctx.Value(fsctx.UploadPolicyCtx).(serializer.UploadPolicy); ok {
		anonymousPolicy = model.Policy{
			Type:         "remote",
			AutoRename:   policy.AutoRename,
			DirNameRule:  policy.SavePath,
			FileNameRule: policy.FileName,
		}
	}
	return path.Join(
		anonymousPolicy.GeneratePath(
			0,
			"",
		),
		anonymousPolicy.GenerateFileName(
			0,
			file.GetFileName(),
		),
	)
}

// CancelUpload 监测客户端取消上传
func (dstfs *FileSystem) CancelUpload(ctx context.Context, path string, file FileHeader) {
	var reqContext context.Context
	if ginCtx, ok := ctx.Value(fsctx.GinCtx).(*gin.Context); ok {
		reqContext = ginCtx.Request.Context()
	} else if reqCtx, ok := ctx.Value(fsctx.HTTPCtx).(context.Context); ok {
		reqContext = reqCtx
	} else {
		return
	}

	select {
	case <-reqContext.Done():
		select {
		case <-ctx.Done():
			// 客户端正常关闭，不执行操作
		default:
			// 客户端取消上传，删除临时文件
			util.Log().Debug("客户端取消上传")
			if dstfs.Hooks["AfterUploadCanceled"] == nil {
				return
			}
			ctx = context.WithValue(ctx, fsctx.SavePathCtx, path)
			err := dstfs.Trigger(ctx, "AfterUploadCanceled")
			if err != nil {
				util.Log().Debug("执行 AfterUploadCanceled 钩子出错，%s", err)
			}
		}

	}
}

// GetUploadToken 生成新的上传凭证
func (dstfs *FileSystem) GetUploadToken(ctx context.Context, path string, size uint64, name string) (*serializer.UploadCredential, error) {
	// 获取相关有效期设置
	credentialTTL := model.GetIntSetting("upload_credential_timeout", 3600)
	callBackSessionTTL := model.GetIntSetting("upload_session_timeout", 86400)

	var err error

	// 检查文件大小
	if dstfs.User.Policy.MaxSize != 0 {
		if size > dstfs.User.Policy.MaxSize {
			return nil, ErrFileSizeTooBig
		}
	}

	// 是否需要预先生成存储路径
	var savePath string
	if dstfs.User.Policy.IsPathGenerateNeeded() {
		savePath = dstfs.GenerateSavePath(ctx, local.FileStream{Name: name, VirtualPath: path})
		ctx = context.WithValue(ctx, fsctx.SavePathCtx, savePath)
	}
	ctx = context.WithValue(ctx, fsctx.FileSizeCtx, size)

	// 获取上传凭证
	callbackKey := util.RandStringRunes(32)
	credential, err := dstfs.Handler.Token(ctx, int64(credentialTTL), callbackKey)
	if err != nil {
		return nil, serializer.NewError(serializer.CodeEncryptError, "无法获取上传凭证", err)
	}

	// 创建回调会话
	err = cache.Set(
		"callback_"+callbackKey,
		serializer.UploadSession{
			Key:         callbackKey,
			UID:         dstfs.User.ID,
			PolicyID:    dstfs.User.GetPolicyID(0),
			VirtualPath: path,
			Name:        name,
			Size:        size,
			SavePath:    savePath,
		},
		callBackSessionTTL,
	)
	if err != nil {
		return nil, err
	}

	return &credential, nil
}

// UploadFromStream 从文件流上传文件
func (dstfs *FileSystem) UploadFromStream(ctx context.Context, src io.ReadCloser, dst string, size uint64) error {
	// 构建文件头
	fileName := path.Base(dst)
	filePath := path.Dir(dst)
	fileData := local.FileStream{
		File:        src,
		Size:        size,
		Name:        fileName,
		VirtualPath: filePath,
	}

	// 给文件系统分配钩子
	dstfs.Lock.Lock()
	if dstfs.Hooks == nil {
		dstfs.Use("BeforeUpload", HookValidateFile)
		dstfs.Use("BeforeUpload", HookValidateCapacity)
		dstfs.Use("AfterUploadCanceled", HookDeleteTempFile)
		dstfs.Use("AfterUploadCanceled", HookGiveBackCapacity)
		dstfs.Use("AfterUpload", GenericAfterUpload)
		dstfs.Use("AfterValidateFailed", HookDeleteTempFile)
		dstfs.Use("AfterValidateFailed", HookGiveBackCapacity)
		dstfs.Use("AfterUploadFailed", HookGiveBackCapacity)
	}
	dstfs.Lock.Unlock()

	// 开始上传
	return dstfs.Upload(ctx, fileData)
}

// UploadFromPath 将本机已有文件上传到用户的文件系统
func (dstfs *FileSystem) UploadFromPath(ctx context.Context, src, dst string, resetPolicy bool) error {
	// 重设存储策略
	if resetPolicy {
		dstfs.Policy = &dstfs.User.Policy
		err := dstfs.DispatchHandler()
		if err != nil {
			return err
		}
	}

	// 打开流
	file, err := os.Open(util.RelativePath(src))
	if err != nil {
		return err
	}
	defer file.Close()

	// 获取源文件大小
	fi, err := file.Stat()
	if err != nil {
		return err
	}
	size := fi.Size()

	// 开始上传
	return dstfs.UploadFromStream(ctx, file, dst, uint64(size))
}
