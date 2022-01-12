package filesystem

import (
	"context"
	"errors"
	"io/ioutil"
	"strings"
	"sync"

	model "github.com/cloudreve/Cloudreve/v3/models"
	"github.com/cloudreve/Cloudreve/v3/pkg/conf"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem/fsctx"
	"github.com/cloudreve/Cloudreve/v3/pkg/request"
	"github.com/cloudreve/Cloudreve/v3/pkg/serializer"
	"github.com/cloudreve/Cloudreve/v3/pkg/util"
)

// Hook 钩子函数
type Hook func(ctx context.Context, fs *FileSystem) error

// Use 注入钩子
func (dstfs *FileSystem) Use(name string, hook Hook) {
	if dstfs.Hooks == nil {
		dstfs.Hooks = make(map[string][]Hook)
	}
	if _, ok := dstfs.Hooks[name]; ok {
		dstfs.Hooks[name] = append(dstfs.Hooks[name], hook)
		return
	}
	dstfs.Hooks[name] = []Hook{hook}
}

// CleanHooks 清空钩子,name为空表示全部清空
func (dstfs *FileSystem) CleanHooks(name string) {
	if name == "" {
		dstfs.Hooks = nil
	} else {
		delete(dstfs.Hooks, name)
	}
}

// Trigger 触发钩子,遇到第一个错误时
// 返回错误，后续钩子不会继续执行
func (dstfs *FileSystem) Trigger(ctx context.Context, name string) error {
	if hooks, ok := dstfs.Hooks[name]; ok {
		for _, hook := range hooks {
			err := hook(ctx, dstfs)
			if err != nil {
				util.Log().Warning("钩子执行失败：%s", err)
				return err
			}
		}
	}
	return nil
}

// HookIsFileExist 检查虚拟路径文件是否存在
func HookIsFileExist(ctx context.Context, fs *FileSystem) error {
	filePath := ctx.Value(fsctx.PathCtx).(string)
	if ok, _ := fs.IsFileExist(filePath); ok {
		return nil
	}
	return ErrObjectNotExist
}

// HookSlaveUploadValidate Slave模式下对文件上传的一系列验证
func HookSlaveUploadValidate(ctx context.Context, fs *FileSystem) error {
	file := ctx.Value(fsctx.FileHeaderCtx).(FileHeader)
	policy := ctx.Value(fsctx.UploadPolicyCtx).(serializer.UploadPolicy)

	// 验证单文件尺寸
	if policy.MaxSize > 0 {
		if file.GetSize() > policy.MaxSize {
			return ErrFileSizeTooBig
		}
	}

	// 验证文件名
	if !fs.ValidateLegalName(ctx, file.GetFileName()) {
		return ErrIllegalObjectName
	}

	// 验证扩展名
	if len(policy.AllowedExtension) > 0 && !IsInExtensionList(policy.AllowedExtension, file.GetFileName()) {
		return ErrFileExtensionNotAllowed
	}

	return nil
}

//CheckFileBefore 上传前测试
//func CheckFileBefore(ctx context.Context, fs *FileSystem) error {
//	file := ctx.Value(fsctx.FileHeaderCtx).(FileHeader)
//
//}

// HookValidateFile 一系列对文件检验的集合
func HookValidateFile(ctx context.Context, fs *FileSystem) error {
	file := ctx.Value(fsctx.FileHeaderCtx).(FileHeader)

	// 验证单文件尺寸
	if !fs.ValidateFileSize(ctx, file.GetSize()) {
		return ErrFileSizeTooBig
	}

	// 验证文件名
	if !fs.ValidateLegalName(ctx, file.GetFileName()) {
		return ErrIllegalObjectName
	}

	// 验证扩展名
	if !fs.ValidateExtension(ctx, file.GetFileName()) {
		return ErrFileExtensionNotAllowed
	}

	return nil

}

// HookResetPolicy 重设存储策略为上下文已有文件
func HookResetPolicy(ctx context.Context, fs *FileSystem) error {
	originFile, ok := ctx.Value(fsctx.FileModelCtx).(model.File)
	if !ok {
		return ErrObjectNotExist
	}

	fs.Policy = originFile.GetPolicy()
	fs.User.Policy = *fs.Policy
	return fs.DispatchHandler()
}

// HookValidateCapacity 验证并扣除用户容量，包含数据库操作
func HookValidateCapacity(ctx context.Context, fs *FileSystem) error {
	file := ctx.Value(fsctx.FileHeaderCtx).(FileHeader)
	// 验证并扣除容量
	if !fs.ValidateCapacity(ctx, file.GetSize()) {
		return ErrInsufficientCapacity
	}
	return nil
}

// HookValidateCapacityWithoutIncrease 验证用户容量，不扣除
func HookValidateCapacityWithoutIncrease(ctx context.Context, fs *FileSystem) error {
	file := ctx.Value(fsctx.FileHeaderCtx).(FileHeader)
	// 验证并扣除容量
	if fs.User.GetRemainingCapacity() < file.GetSize() {
		return ErrInsufficientCapacity
	}
	return nil
}

// HookChangeCapacity 根据原有文件和新文件的大小更新用户容量
func HookChangeCapacity(ctx context.Context, fs *FileSystem) error {
	newFile := ctx.Value(fsctx.FileHeaderCtx).(FileHeader)
	originFile := ctx.Value(fsctx.FileModelCtx).(model.File)

	if newFile.GetSize() > originFile.Size {
		if !fs.ValidateCapacity(ctx, newFile.GetSize()-originFile.Size) {
			return ErrInsufficientCapacity
		}
		return nil
	}

	fs.User.DeductionStorage(originFile.Size - newFile.GetSize())
	return nil
}

// HookDeleteTempFile 删除已保存的临时文件
func HookDeleteTempFile(ctx context.Context, fs *FileSystem) error {
	util.Log().Error("上传被取消或上传过程中出现失败,即将回收临时文件...")
	filePath := ctx.Value(fsctx.SavePathCtx).(string)
	// 删除临时文件
	_, err := fs.Handler.Delete(ctx, []string{filePath})
	if err != nil {
		util.Log().Warning("无法清理上传临时文件，%s", err)
	}

	return nil
}

// HookCleanFileContent 清空文件内容
func HookCleanFileContent(ctx context.Context, fs *FileSystem) error {
	filePath := ctx.Value(fsctx.SavePathCtx).(string)
	// 清空内容
	return fs.Handler.Put(ctx, ioutil.NopCloser(strings.NewReader("")), filePath, 0)
}

// HookClearFileSize 将原始文件的尺寸设为0
func HookClearFileSize(ctx context.Context, fs *FileSystem) error {
	originFile, ok := ctx.Value(fsctx.FileModelCtx).(model.File)
	if !ok {
		return ErrObjectNotExist
	}
	return originFile.UpdateSize(0)
}

// HookCancelContext 取消上下文
func HookCancelContext(ctx context.Context, fs *FileSystem) error {
	cancelFunc, ok := ctx.Value(fsctx.CancelFuncCtx).(context.CancelFunc)
	if ok {
		cancelFunc()
	}
	return nil
}

// HookGiveBackCapacity 归还用户容量
func HookGiveBackCapacity(ctx context.Context, fs *FileSystem) error {
	file := ctx.Value(fsctx.FileHeaderCtx).(FileHeader)
	once, ok := ctx.Value(fsctx.ValidateCapacityOnceCtx).(*sync.Once)
	if !ok {
		once = &sync.Once{}
	}

	// 归还用户容量
	res := true
	once.Do(func() {
		res = fs.User.DeductionStorage(file.GetSize())
	})

	if !res {
		return errors.New("无法继续降低用户已用存储")
	}
	return nil
}

// HookUpdateSourceName 更新文件SourceName
// TODO：测试
func HookUpdateSourceName(ctx context.Context, fs *FileSystem) error {
	originFile, ok := ctx.Value(fsctx.FileModelCtx).(model.File)
	if !ok {
		return ErrObjectNotExist
	}
	return originFile.UpdateSourceName(originFile.SourceName)
}

// GenericAfterUpdate 文件内容更新后
func GenericAfterUpdate(ctx context.Context, fs *FileSystem) error {
	// 更新文件尺寸
	originFile, ok := ctx.Value(fsctx.FileModelCtx).(model.File)
	if !ok {
		return ErrObjectNotExist
	}

	fs.SetTargetFile(&[]model.File{originFile})

	newFile, ok := ctx.Value(fsctx.FileHeaderCtx).(FileHeader)
	if !ok {
		return ErrObjectNotExist
	}
	err := originFile.UpdateSize(newFile.GetSize())
	if err != nil {
		return err
	}

	// 尝试清空原有缩略图并重新生成
	if originFile.GetPolicy().IsThumbGenerateNeeded() {
		fs.recycleLock.Lock()
		go func() {
			defer fs.recycleLock.Unlock()
			if originFile.PicInfo != "" {
				_, _ = fs.Handler.Delete(ctx, []string{originFile.SourceName + conf.ThumbConfig.FileSuffix})
				fs.GenerateThumbnail(ctx, &originFile)
			}
		}()
	}

	return nil
}

// SlaveAfterUpload Slave模式下上传完成钩子
func SlaveAfterUpload(ctx context.Context, fs *FileSystem) error {
	fileHeader := ctx.Value(fsctx.FileHeaderCtx).(FileHeader)
	policy := ctx.Value(fsctx.UploadPolicyCtx).(serializer.UploadPolicy)

	// 构造一个model.File，用于生成缩略图
	file := model.File{
		Name:       fileHeader.GetFileName(),
		SourceName: ctx.Value(fsctx.SavePathCtx).(string),
	}
	fs.GenerateThumbnail(ctx, &file)

	if policy.CallbackURL == "" {
		return nil
	}

	// 发送回调请求
	callbackBody := serializer.UploadCallback{
		Name:       file.Name,
		SourceName: file.SourceName,
		PicInfo:    file.PicInfo,
		Size:       fileHeader.GetSize(),
	}
	return request.RemoteCallback(policy.CallbackURL, callbackBody)
}

// GenericAfterUpload 文件上传完成后，包含数据库操作
func GenericAfterUpload(ctx context.Context, fs *FileSystem) error {
	// 文件存放的虚拟路径
	virtualPath := ctx.Value(fsctx.FileHeaderCtx).(FileHeader).GetVirtualPath()

	// 检查路径是否存在，不存在就创建(也就是目录重复是可以的)
	isExist, folder := fs.IsPathExist(virtualPath)
	if !isExist {
		newFolder, err := fs.CreateDirectory(ctx, virtualPath)
		if err != nil {
			return err
		}
		folder = newFolder
	}
	//todo:如果开启了重命名 会存在upload 流转的问题,这样很容易找不到对应的文件,所以重命名目前不考虑
	//todo:但是理论上不同的磁力链到相同的文件夹 理应要有不同的文件的,而不应该进行覆盖
	//如果是重命名 直接报错
	if ctx.Value(fsctx.RenameOverwrite) != nil {
		util.Log().Error("命中了系统未规定的重命名操作,报错退出")
		return ErrRenameOption
		//如果不允许覆盖但是
	} else if ctx.Value(fsctx.DisableOverwrite) != nil {
		if ok, _ := fs.IsChildFileExist(
			folder,
			ctx.Value(fsctx.FileHeaderCtx).(FileHeader).GetFileName(),
		); ok {
			util.Log().Error("系统设置了不允许覆盖,但是检验库里出现同名文件,直接报错")
			return ErrFileExisted
		}
		//如果是覆盖,查询原来存在需要删除
	} else if ctx.Value(fsctx.OnlyOverwrite) != nil {
		fileName := ctx.Value(fsctx.FileHeaderCtx).(FileHeader).GetFileName()
		if ok, existFile := fs.IsChildFileExist(
			folder,
			fileName,
		); ok {
			//发现存在 删除原来的
			util.Log().Info("走冲突覆盖策略,检测到 %d 文件夹下 文件 %s 已存在,即将删除旧文件...", folder.ID, fileName)
			//删除旧文件
			model.DeleteFileByIDs([]uint{existFile.ID})

		}
	} else {
		util.Log().Error("未指定冲突解决方案,走不允许覆盖")
		if ok, _ := fs.IsChildFileExist(
			folder,
			ctx.Value(fsctx.FileHeaderCtx).(FileHeader).GetFileName(),
		); ok {
			util.Log().Error("系统设置了不允许覆盖,但是检验库里出现同名文件,直接报错")
			return ErrFileExisted
		}
	}

	// 向数据库中插入记录(一般有错都是索引冲突)
	file, err := fs.AddFile(ctx, folder)
	if err != nil {
		return ErrInsertFileRecord
	}
	fs.SetTargetFile(&[]model.File{*file})

	// 异步尝试生成缩略图
	if fs.User.Policy.IsThumbGenerateNeeded() {
		fs.recycleLock.Lock()
		go func() {
			defer fs.recycleLock.Unlock()
			fs.GenerateThumbnail(ctx, file)
		}()
	}

	return nil
}
