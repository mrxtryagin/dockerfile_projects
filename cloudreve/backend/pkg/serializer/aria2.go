package serializer

import (
	"encoding/json"
	"github.com/cloudreve/Cloudreve/v3/pkg/hashid"
	"path"
	"strings"
	"time"

	model "github.com/cloudreve/Cloudreve/v3/models"
	"github.com/cloudreve/Cloudreve/v3/pkg/aria2/rpc"
)

// DownloadListResponse 下载列表响应条目
type DownloadListResponse struct {
	UpdateTime     time.Time      `json:"update"`
	UpdateInterval int            `json:"interval"`
	Name           string         `json:"name"`
	Status         int            `json:"status"`
	Dst            string         `json:"dst"`
	Total          uint64         `json:"total"`
	Downloaded     uint64         `json:"downloaded"`
	Speed          int            `json:"speed"`
	Info           rpc.StatusInfo `json:"info"`
	NodeId         uint           `json:"nodeId""`
	GID            string         `json:"gid"`
}

// FinishedListResponse 已完成任务条目
type FinishedListResponse struct {
	Name           string                 `json:"name"`
	GID            string                 `json:"gid"`
	Status         int                    `json:"status"`
	Dst            string                 `json:"dst"`
	Error          string                 `json:"error"`
	Total          uint64                 `json:"total"`
	Files          []rpc.FileInfo         `json:"files"`
	Source         string                 `json:"source"`
	DownloadCreate string                 `json:"download_create"`
	DownloadUpdate string                 `json:"download_update"`
	Mode           string                 `json:"mode"`
	TaskStatus     int                    `json:"task_status"`
	TaskError      string                 `json:"task_error"`
	TaskCreate     string                 `json:"task_create"`
	TaskUpdate     string                 `json:"task_update"`
	TaskProgress   int                    `json:"task_progress"`
	TaskSpeed      float64                `json:"speed"`
	TaskOtherInfo  map[string]interface{} `json:"other_info"`
	TaskId         string                 `json:"task_id"`
}

// BuildFinishedListResponse 构建已完成任务条目
func BuildFinishedListResponse(tasks []model.Download) Response {
	resp := make([]FinishedListResponse, 0, len(tasks))
	timeFormatter := "2006-01-02 15:04:05"
	for i := 0; i < len(tasks); i++ {
		fileName := tasks[i].StatusInfo.BitTorrent.Info.Name
		//如果就一个文件 就取文件0的名字
		if len(tasks[i].StatusInfo.Files) == 1 {
			fileName = path.Base(tasks[i].StatusInfo.Files[0].Path)
		}

		// 过滤敏感信息 去掉dir 之后的 task 信息
		for i2 := 0; i2 < len(tasks[i].StatusInfo.Files); i2++ {
			tasks[i].StatusInfo.Files[i2].Path = strings.ReplaceAll(tasks[i].StatusInfo.Files[i2].Path, tasks[i].StatusInfo.Dir, "")

		}

		download := FinishedListResponse{
			Name:           fileName,                            //文件名
			GID:            tasks[i].GID,                        //文件对应的aria2_gid
			Status:         tasks[i].Status,                     //下载状态
			Error:          tasks[i].Error,                      //下载错误
			Dst:            tasks[i].Dst,                        //下载的目的地
			Total:          tasks[i].TotalSize,                  //下载总大小
			Files:          tasks[i].StatusInfo.Files,           //文件列表
			Source:         tasks[i].Source,                     //下载原路径
			Mode:           tasks[i].StatusInfo.BitTorrent.Mode, //模式
			DownloadCreate: tasks[i].CreatedAt.Format(timeFormatter),
			DownloadUpdate: tasks[i].UpdatedAt.Format(timeFormatter),
			TaskStatus:     -1,
		}

		if tasks[i].Task != nil {
			download.TaskError = tasks[i].Task.Error
			download.TaskStatus = tasks[i].Task.Status
			download.TaskCreate = tasks[i].Task.CreatedAt.Format(timeFormatter)
			download.TaskUpdate = tasks[i].Task.UpdatedAt.Format(timeFormatter)
			download.TaskProgress = tasks[i].Task.Progress
			download.TaskSpeed = tasks[i].Task.Speed
			download.TaskId = hashid.HashID(tasks[i].Task.ID, hashid.TaskID) //加密
			if tasks[i].Task.OtherInfo != "" {
				m := map[string]interface{}{}
				err := json.Unmarshal([]byte(tasks[i].Task.OtherInfo), &m)
				if err != nil {

				} else {
					download.TaskOtherInfo = m
				}
			}

		}

		resp = append(resp, download)
	}

	return Response{Data: resp}
}

// BuildDownloadingResponse 构建正在下载的列表响应
func BuildDownloadingResponse(tasks []model.Download, intervals map[uint]int) Response {
	resp := make([]DownloadListResponse, 0, len(tasks))

	for i := 0; i < len(tasks); i++ {
		fileName := ""
		if len(tasks[i].StatusInfo.Files) > 0 {
			fileName = path.Base(tasks[i].StatusInfo.Files[0].Path)
		}

		// 过滤敏感信息
		tasks[i].StatusInfo.Dir = ""
		for i2 := 0; i2 < len(tasks[i].StatusInfo.Files); i2++ {
			tasks[i].StatusInfo.Files[i2].Path = path.Base(tasks[i].StatusInfo.Files[i2].Path)
		}

		interval := 10
		if actualInterval, ok := intervals[tasks[i].ID]; ok {
			interval = actualInterval
		}

		resp = append(resp, DownloadListResponse{
			UpdateTime:     tasks[i].UpdatedAt,
			UpdateInterval: interval,
			Name:           fileName,
			Status:         tasks[i].Status,
			Dst:            tasks[i].Dst,
			Total:          tasks[i].TotalSize,
			Downloaded:     tasks[i].DownloadedSize,
			Speed:          tasks[i].Speed,
			Info:           tasks[i].StatusInfo,
			NodeId:         tasks[i].NodeID, //带上节点信息
			GID:            tasks[i].GID,
		})
	}

	return Response{Data: resp}
}
