package util

import (
	"fmt"
	"github.com/fatih/color"
	"github.com/gin-gonic/gin"
	rotatelogs "github.com/lestrrat-go/file-rotatelogs"
	"io"
	"log"
	"os"
	"path"
	"path/filepath"
	"sync"
	"time"
)

var (
	_loggerAll   *log.Logger
	_loggerError *log.Logger
	_loggerOther *log.Logger
)

const (
	// LevelError 错误
	LevelError = iota
	// LevelWarning 警告
	LevelWarning
	// LevelInformational 提示
	LevelInformational
	// LevelDebug 除错
	LevelDebug
	LOGPATH       string = "./logInfo"
	TimeFormatter string = "2006-01-02 15:04:05"
)

var GloablLogger *Logger
var Level = LevelDebug

// Logger 日志
type Logger struct {
	level int
	mu    sync.Mutex
}

// 日志颜色
var colors = map[string]func(a ...interface{}) string{
	"Warning": color.New(color.FgYellow).Add(color.Bold).SprintFunc(),
	"Panic":   color.New(color.BgRed).Add(color.Bold).SprintFunc(),
	"Error":   color.New(color.FgRed).Add(color.Bold).SprintFunc(),
	"Info":    color.New(color.FgCyan).Add(color.Bold).SprintFunc(),
	"Debug":   color.New(color.FgWhite).Add(color.Bold).SprintFunc(),
}

// 不同级别前缀与时间的间隔，保持宽度一致
var spaces = map[string]string{
	"Warning": "",
	"Panic":   "  ",
	"Error":   "  ",
	"Info":    "   ",
	"Debug":   "  ",
}

func init() {
	allLogPath := path.Join(LOGPATH, "all")
	errorLogPath := path.Join(LOGPATH, "error")
	//if !Exists(LOGPATH) {
	//	err := os.MkdirAll(allLogPath, os.ModePerm)
	//	err = os.MkdirAll(errorLogPath, os.ModePerm)
	//	if err != nil {
	//		panic(err)
	//	}
	//}
	err := os.MkdirAll(allLogPath, os.ModePerm)
	err = os.MkdirAll(errorLogPath, os.ModePerm)
	if err != nil {
		panic(err)
	}
	fileName := time.Now().Format(TimeFormatter)
	allFile := path.Join(allLogPath, fileName)
	errorFile := path.Join(errorLogPath, fileName)
	//allLogFile, err1 := os.OpenFile(allFile, os.O_RDWR|os.O_CREATE|os.O_APPEND, 0766)
	//if err1 != nil {
	//	panic(err1)
	//}
	//errorLogFile, err2 := os.OpenFile(errorFile, os.O_RDWR|os.O_CREATE|os.O_APPEND, 0766)
	//if err2 != nil {
	//	panic(err2)
	//)
	logWriter := newWriter(allFile, "log")
	errorWriter := newWriter(errorFile, "err")
	_loggerAll = log.New(logWriter, "[Cloudreve]", log.LstdFlags|log.Lmicroseconds)
	_loggerError = log.New(errorWriter, "[Cloudreve]", log.LstdFlags|log.Lmicroseconds)
	_loggerOther = log.New(io.MultiWriter(os.Stdout, logWriter), "[Cloudreve]", log.LstdFlags|log.Lmicroseconds)
	initGin()
}

func initGin() {
	ginLogPath := path.Join(LOGPATH, "gin")
	err := os.MkdirAll(ginLogPath, os.ModePerm)
	if err != nil {
		panic(err)
	}
	fileName := time.Now().Format(TimeFormatter)
	allFile := path.Join(ginLogPath, fileName)
	errorFile := path.Join(ginLogPath, fileName)
	//同时写入
	//gin.ForceConsoleColor()
	gin.DefaultWriter = io.MultiWriter(os.Stdout, newWriter(allFile, "log"))
	gin.DefaultErrorWriter = io.MultiWriter(os.Stderr, newWriter(errorFile, "err"))
}

// glc自动清理
func newWriter(fileName string, suffix string) io.Writer {
	/* 日志轮转相关函数
	`WithLinkName` 为最新的日志建立软连接
	`WithRotationTime` 设置日志分割的时间，隔多久分割一次
	WithMaxAge 和 WithRotationCount二者只能设置一个
	 `WithMaxAge` 设置文件清理前的最长保存时间
	 `WithRotationCount` 设置文件清理前最多保存的个数
	WithRotationSize:多大分割一次
	*/
	abs, err := filepath.Abs(path.Join(fileName+"(rotate)", "/"+time.Now().Format(TimeFormatter)+"."+suffix))
	if err != nil {
		panic(err)
	}
	writer, err := rotatelogs.New(
		abs,
		//原本的文件 通过这个就可以打开最新的
		rotatelogs.WithLinkName(fileName+"."+suffix),
		//一天分割一次
		rotatelogs.WithRotationTime(time.Hour*24),
		//保存一周
		rotatelogs.WithMaxAge(time.Hour*24*7),
		//最多二十个
		//rotatelogs.WithRotationCount(20),
		//10M1分割
		rotatelogs.WithRotationSize(10*1024*1024),
	)
	if err != nil {
		panic(err)
	}
	return writer
}

// Println 打印
func (ll *Logger) Println(prefix string, msg string) {
	// TODO Release时去掉
	// color.NoColor = false

	c := color.New()

	ll.mu.Lock()
	defer ll.mu.Unlock()
	_msg := fmt.Sprintf("%s%s %s %s\n",
		colors[prefix]("["+prefix+"]"),
		spaces[prefix],
		time.Now().Format(TimeFormatter),
		msg)
	_, _ = c.Printf(
		_msg,
	)
	_loggerAll.Printf("%s %s\n",
		"["+prefix+"]",
		msg,
	)
}

// Panic 极端错误
func (ll *Logger) Panic(format string, v ...interface{}) {
	if LevelError > ll.level {
		return
	}
	msg := fmt.Sprintf(format, v...)
	ll.Println("Panic", msg)
	_loggerError.Printf("%s %s\n",
		"[Panic]",
		msg)
	panic(msg)
}

// PanicNotTruePanic 不会真的抛出系统panic
func (ll *Logger) PanicNotTruePanic(format string, v ...interface{}) {
	if LevelError > ll.level {
		return
	}
	msg := fmt.Sprintf(format, v...)
	ll.Println("Panic", msg)
	_loggerError.Printf("%s %s\n",
		"[Panic]",
		msg)
}

// Error 错误
func (ll *Logger) Error(format string, v ...interface{}) {
	if LevelError > ll.level {
		return
	}
	msg := fmt.Sprintf(format, v...)

	ll.Println("Error", msg)
	_loggerError.Printf("%s %s\n",
		"[Error]",
		msg)
}

// Warning 警告
func (ll *Logger) Warning(format string, v ...interface{}) {
	if LevelWarning > ll.level {
		return
	}
	msg := fmt.Sprintf(format, v...)
	ll.Println("Warning", msg)
}

// Info 信息
func (ll *Logger) Info(format string, v ...interface{}) {
	if LevelInformational > ll.level {
		return
	}
	msg := fmt.Sprintf(format, v...)
	ll.Println("Info", msg)
}

// Debug 校验
func (ll *Logger) Debug(format string, v ...interface{}) {
	if LevelDebug > ll.level {
		return
	}
	msg := fmt.Sprintf(format, v...)
	ll.Println("Debug", msg)
}

// Print GORM 的 Logger实现
//func (ll *Logger) Print(v ...interface{}) {
//	if LevelDebug > ll.level {
//		return
//	}
//	msg := fmt.Sprintf("[SQL] %s", v...)
//	ll.Println(msg)
//}

// BuildLogger 构建logger
func BuildLogger(level string) {
	intLevel := LevelError
	switch level {
	case "error":
		intLevel = LevelError
	case "warning":
		intLevel = LevelWarning
	case "info":
		intLevel = LevelInformational
	case "debug":
		intLevel = LevelDebug
	}
	l := Logger{
		level: intLevel,
	}
	GloablLogger = &l
}

// Log 返回日志对象
func Log() *Logger {
	if GloablLogger == nil {
		l := Logger{
			level: Level,
		}
		GloablLogger = &l
	}
	return GloablLogger
}

// SystemLoggerAll
func SystemLoggerAll() *log.Logger {
	return _loggerOther
}

// SystemLoggerErr
func SystemLoggerErr() *log.Logger {
	return _loggerError
}
