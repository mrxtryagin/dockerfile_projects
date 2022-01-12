package task

import (
	"fmt"
	"github.com/cloudreve/Cloudreve/v3/pkg/util"
	"github.com/yezihack/e"
)

// Worker 处理任务的对象
type Worker interface {
	Do(Job) // 执行任务
}

// GeneralWorker 通用Worker
type GeneralWorker struct {
}

// Do 执行任务
func (worker *GeneralWorker) Do(job Job) {
	util.Log().Debug("开始执行任务")
	job.SetStatus(Processing)

	defer func() {
		// 致命错误捕获
		if err := recover(); err != nil {
			er := e.New(fmt.Sprintf("%v", err))
			if e.Assert(er) {
				e1 := e.Convert(er)
				util.Log().PanicNotTruePanic(e1.Msg())
				util.Log().PanicNotTruePanic("stack info :\n%s", e1.ToStr())
				//util.Log().Panic(e1.Msg())

			}
			job.SetError(&JobError{Msg: "致命错误", Error: fmt.Sprintf("%v", err)})
			job.SetStatus(Error)
		}
	}()

	// 开始执行任务
	job.Do()

	// 任务执行失败
	if err := job.GetError(); err != nil {
		util.Log().Debug("任务执行出错")
		job.SetStatus(Error)
		return
	}

	util.Log().Debug("任务执行完成")
	// 执行完成
	job.SetStatus(Complete)
}
