package aria2

import (
	"encoding/json"
	"fmt"
	model "github.com/cloudreve/Cloudreve/v3/models"
	"github.com/cloudreve/Cloudreve/v3/pkg/aria2/common"
	"github.com/cloudreve/Cloudreve/v3/pkg/filesystem"
	"github.com/cloudreve/Cloudreve/v3/pkg/serializer"
	"github.com/cloudreve/Cloudreve/v3/pkg/task"
	"github.com/cloudreve/Cloudreve/v3/pkg/util"
	"github.com/gin-gonic/gin"
	"path"
	"path/filepath"
	"strings"
)

// 下载前检查url 是否已经下载
func CheckUrlBeforeDownload(url string) (*model.Task, bool) {
	//搜索
	task, err := model.GetDownloadJoinTaskFirstByStatusAndUrl([]int{common.Complete}, []int{task.Complete}, url)
	if err != nil {
		util.Log().Warning("未找到... %s", err.Error())
		return nil, false
	}
	fmt.Printf("result:%v\n", task)
	return task, true
}

//saveFinishedJob 保存已经完成的job
// 思路:
// 1.一键转存的关键是关心策略的最终路径 -> 通过 policies 获得 dir_name_rule 获得 上传任务的前缀,嫁接到 file上面 则为文件的路径
//2. 文件夹怎么办 -> 通过解析 /xxx/xxx/xxx/... path 来分组
func saveFinishedJob(task2 *model.Task, c *gin.Context) {
	//check
	if task2.Status != task.Complete {
		util.Log().Warning("task %d 的 status 为 %d 未完成...", task2.ID, task2.Status)

	}
	//解析TransferProps
	transfer := &task.TransferProps{}
	err := json.Unmarshal([]byte(task2.Props), transfer)
	if err != nil {
		util.Log().Warning("反序列化task.TransferProps失败!")
		return
	}
	srcLength := len(transfer.Src)
	files := make([]string, srcLength)
	for index, file := range transfer.Src {
		dst := path.Join(transfer.Dst, filepath.Base(file))
		if transfer.TrimPath {
			// 保留原始目录 感觉更像是 更好的处理了多目录的情况
			trim := util.FormSlash(transfer.Parent)
			src := util.FormSlash(file)
			dst = path.Join(transfer.Dst, strings.TrimPrefix(src, trim))
		}
		files[index] = dst
	}
	//创建文件系统
	fs, err := filesystem.NewFileSystemFromContext(c)
	if err != nil {
		util.Log().Warning("创建文件系统失败: %s,%s", serializer.CodePolicyNotAllowed, err.Error())
		return
	}
	defer fs.Recycle()
	//// 复制开始
	//err = fs.Copy(nil, service.Src.Raw().Dirs, service.Src.Raw().Items, service.SrcDir, service.Dst)
	//if err != nil {
	//	return serializer.Err(serializer.CodeNotSet, err.Error(), err)
	//}
}
