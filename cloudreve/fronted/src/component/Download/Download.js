import { Button, IconButton, LinearProgress, Typography, withStyles } from "@material-ui/core";
import RefreshIcon from "@material-ui/icons/Refresh";
import React, { Component } from "react";
import { connect } from "react-redux";
import { toggleSnackbar } from "../../actions";
import API from "../../middleware/Api";
import DownloadingCard from "./DownloadingCard";
import FinishedCard from "./FinishedCard";
import RemoteDownloadButton from "../Dial/Aria2";
import Auth from "../../middleware/Auth";
import axios from "axios";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import { getPercent, secondToTimeStr, sizeToString } from "../../utils";
import PauseCircleFilledTwoToneIcon from "@material-ui/icons/PauseCircleFilledTwoTone";
import PlayCircleFilledWhiteTwoToneIcon from "@material-ui/icons/PlayCircleFilledWhiteTwoTone";

const styles = (theme) => ({
    actions: {
        display: "flex"
    },
    title: {
        marginTop: "20px",
        width: "auto"
    },
    layout: {
        width: "auto",
        marginTop: "30px",
        marginLeft: theme.spacing(3),
        marginRight: theme.spacing(3),
        [theme.breakpoints.up(1100 + theme.spacing(3) * 2)]: {
            width: 700,
            marginLeft: "auto",
            marginRight: "auto"
        }
    },
    progress: {
        marginTop: 8,
        marginBottom: 4
    },
    shareTitle: {
        maxWidth: "200px"
    },
    avatarFile: {
        backgroundColor: theme.palette.primary.light
    },
    avatarFolder: {
        backgroundColor: theme.palette.secondary.light
    },
    gird: {
        marginTop: "30px"
    },
    hide: {
        display: "none"
    },
    loadingAnimation: {
        borderRadius: "6px 6px 0 0"
    },
    shareFix: {
        marginLeft: "20px"
    },
    loadMore: {
        textAlign: "center",
        marginTop: "20px",
        marginBottom: "20px"
    },
    margin: {
        marginTop: theme.spacing(2)
    },
    sideButton: {
        padding: "8px",
        marginRight: "5px"
    }
});
const mapStateToProps = () => {
    return {};
};

const mapDispatchToProps = (dispatch) => {
    return {
        toggleSnackbar: (vertical, horizontal, msg, color) => {
            dispatch(toggleSnackbar(vertical, horizontal, msg, color));
        }
    };
};

class DownloadComponent extends Component {
    page = 0;
    interval = 0;
    task_inteval = 0;
    previousDownloading = -1;

    state = {
        downloading: [],
        loading: false,
        finishedList: [],
        continue: true,
        option: -1,
        totalSpeed: 0, //总速度
        totalProcessing: 0, //总进度 status: "paused" 开始/总进度
        totalDownloadedSize: 0,
        totalSize: 0,
        downloadingStatus: 0, //0与1 0 开始 1 关闭
        finishedStatus: 1 //0与1 0开始 1关闭


    };

    componentDidMount = () => {
        this.loadDownloading();
    };


    componentWillUnmount() {
        clearTimeout(this.interval);
        clearTimeout(this.task_inteval);
    }

    loadDownloading = () => {
        this.setState({
            loading: true
        });
        API.get("/aria2/downloading")
            .then((response) => {
                    // if (this.state.downloading.length !== 0 && (response.data.length !== this.state.downloading.length)) this.loadFinishes();
                    this.setState({
                        downloading: response.data,
                        loading: false
                    }, () => {
                        // 记录统计信息
                        this.changeStatisInfo();
                    });


                    if (response.data.length > 0) {
                        if (this.state.downloadingStatus === 0) {
                            console.log("downloading_interval start...");
                            // 设定自动更新
                            clearTimeout(this.interval);
                            this.interval = setTimeout(
                                this.loadDownloading,
                                1000 *
                                response.data.reduce(function(prev, current) {
                                    return prev.interval < current.interval
                                        ? prev
                                        : current;
                                }).interval
                            );
                        } else {
                            console.log("downloading_interval stop...");
                            clearTimeout(this.interval);
                        }
                    }

                    // 下载中条目变更时刷新已完成列表
                    if (response.data.length !== this.previousDownloading) {
                        //初次也会加载
                        this.loadFinishes();
                    }
                    this.previousDownloading = response.data.length;
                }
            )
            .catch((error) => {
                this.props.toggleSnackbar(
                    "top",
                    "right",
                    error.message,
                    "error"
                );
            });

    };


    //如果option 为 中转进行中 进行reload
    handleChangeOption = (event) => {
        this.setState({
            option: event.target.value
        });


    };

    changeDownloadingStatus = () => {
        this.setState({
            downloadingStatus: this.state.downloadingStatus === 0 ? 1 : 0
        }, () => {
            this.loadDownloading();
        });

    };

    changeFinishedStatus = () => {
        // console.log("before...",this.state.finishedStatus)
        this.setState({
            finishedStatus: this.state.finishedStatus === 0 ? 1 : 0
        }, () => {
            // console.log("after...",this.state.finishedStatus)
            this.loadFinishes();
        });

    };


    changeStatisInfo = () => {
        if (this.state.downloading.length > 0) {
            let totalSpeed = 0;
            let processingCount = 0;
            let totalSize = 0;
            let totalDownloadSize = 0;
            this.state.downloading.forEach(el => {
                totalSpeed += el.speed;
                processingCount += el.info.status === "paused" ? 0 : 1;
                totalSize += el.total;
                totalDownloadSize += el.downloaded;
            });
            this.setState({
                totalSpeed: totalSpeed,
                totalProcessing: processingCount,
                totalDownloadedSize: totalDownloadSize,
                totalSize: totalSize
            });
        }
    };

    renderTotalbar = () => {
        const speedStr = this.state.totalSpeed === "0" ? "0B/s" : sizeToString(this.state.totalSpeed) + "/s";
        const progressStr = `${this.state.totalProcessing}/${this.state.downloading.length}`;
        const percentStr = getPercent(this.state.totalDownloadedSize, this.state.totalSize, 2);
        const downloaded = this.state.totalDownloadedSize === 0 ? "0Bytes" : sizeToString(this.state.totalDownloadedSize);
        const total = this.state.totalSize === 0 ? "0Bytes" : sizeToString(this.state.totalSize);
        const sizeStr = `${downloaded}/${total}`;
        const leftTime = secondToTimeStr((this.state.totalSize - this.state.totalDownloadedSize) / this.state.totalSpeed);
        return `${progressStr} -- ${percentStr}% -- ${sizeStr} -- ${speedStr} -- ${leftTime} `;
    };


    loadMore = () => {
        this.setState({
            loading: true
        });
        // const user = Auth.GetUser();

        // axios({
        //     method: "get",
        //     url: "http://mrxzz.f3322.net:20013/cloudreve/getFinishedTasks?" + "page=" + ++this.page + "&owner_id=" + user.id + "&filterKey=" + this.state.option
        // })
        // axios({
        //     method: "get",
        //     url: "http://mrxzz.f3322.net:20013/cloudreve/getFinishedTasks?" + "page=" + ++this.page + "&owner_id=" + user.id + "&filterKey=" + this.state.option
        // })
        API.get("/aria2/finished"+"?page="+ ++this.page + "&filterKey="+this.state.option)
            .then((response) => {
                const data = response.data;
                console.log("data",data)
                this.setState({
                    finishedList: [
                        ...this.state.finishedList,
                        ...data
                    ],
                    loading: false,
                    continue: data.length >= 10
                });

            })
            .catch((e) => {
                this.props.toggleSnackbar("top", "right", "加载失败", `error:${e}`);
                this.setState({
                    loading: false
                });
            });
    };

    loadFinishes = () => {
        this.setState({
            finishedList: [],
            continue: true
        }, () => {
            this.page = 0;
            this.loadMore();
            if (this.state.finishedStatus === 0) {
                clearTimeout(this.task_inteval);
                console.log("finishes_interval started...");
                this.task_inteval = setTimeout(() => {
                    this.loadFinishes();
                }, 3000);
            } else {
                console.log("finishes_interval stoped...");
                clearTimeout(this.task_inteval);
            }
        });


    };

    render() {
        const { classes } = this.props;
        const user = Auth.GetUser();
        // console.log("render了!")


        return (
            <div className={classes.layout}>
                {user.group.allowRemoteDownload && <RemoteDownloadButton />}
                <Typography
                    color="textSecondary"
                    variant="h4"
                    className={classes.title}
                >
                    进行中
                    <IconButton
                        disabled={this.state.loading}
                        title={this.state.downloadingStatus === 1 ?"开启自动刷新":"关闭自动刷新"}
                        onClick={() => {
                            console.log("change_downloading");
                            this.changeDownloadingStatus();
                        }}
                    >
                        {this.state.downloadingStatus === 1 ? (
                            <PlayCircleFilledWhiteTwoToneIcon />
                        ) : (
                            <PauseCircleFilledTwoToneIcon />
                        )}
                    </IconButton>
                    <IconButton
                        disabled={this.state.loading}
                        title={"手动刷新"}
                        onClick={this.loadDownloading}
                    >
                        <RefreshIcon />
                    </IconButton>

                </Typography>
                {this.state.downloading.length > 0 && (<div>
                    {/*<Typography*/}
                    {/*    color="textSecondary"*/}
                    {/*    variant="h5"*/}
                    {/*    className={classes.title}*/}
                    {/*>*/}
                    {/*    totalProgress:*/}
                    {/*</Typography>*/}
                    <LinearProgress
                        color="secondary"
                        variant="determinate"
                        className={classes.progress}
                        value={getPercent(this.state.totalDownloadedSize, this.state.totalSize, 2)}
                    />
                    <Typography
                        variant="body2"
                        color="textSecondary"
                        noWrap
                    >
                        {this.renderTotalbar()}
                    </Typography>
                </div>)}
                {this.state.downloading.map((value, k) => (
                    <DownloadingCard key={k} task={value} reload={this} />
                ))}
                <Typography
                    color="textSecondary"
                    variant="h4"
                    className={classes.title}
                >
                    已完成
                    <FormControl className={classes.sideButton}>
                        {/*<InputLabel id="demo-simple-select-label">筛选范围</InputLabel>*/}
                        <Select
                            labelId="demo-simple-select-label"
                            id="demo-simple-select"
                            value={this.state.option}
                            onChange={this.handleChangeOption}
                        >
                            <MenuItem value={-1}>全部</MenuItem>
                            <MenuItem value={0}>下载出错</MenuItem>
                            <MenuItem value={1}>已取消</MenuItem>
                            <MenuItem value={2}>已转存完成</MenuItem>
                            <MenuItem value={3}>已下载完成,转存排队中</MenuItem>
                            <MenuItem value={4}>已下载完成,转存处理中</MenuItem>
                            <MenuItem value={5}>转存失败</MenuItem>
                        </Select>
                    </FormControl>
                    <IconButton
                        disabled={this.state.loading}
                        title={this.state.downloadingStatus === 1 ?"开启自动刷新":"关闭自动刷新"}
                        onClick={() => {
                            console.log("change_finishes");
                            this.changeFinishedStatus();
                        }}
                    >
                        {this.state.finishedStatus === 1 ? (
                            <PlayCircleFilledWhiteTwoToneIcon />
                        ) : (
                            <PauseCircleFilledTwoToneIcon />
                        )}
                    </IconButton>
                    <IconButton
                        disabled={this.state.loading}
                        onClick={this.loadFinishes}
                        title={"手动刷新"}
                    >
                        <RefreshIcon />
                    </IconButton>
                </Typography>
                <div className={classes.loadMore}>
                    {this.state.finishedList.map((value, k) => {
                        if (value.files) {
                            return <FinishedCard key={k} task={value} index={k} reload={this} />;
                        }
                        return null;
                    })}
                    <Button
                        size="large"
                        className={classes.margin}
                        disabled={!this.state.continue}
                        onClick={this.loadMore}
                    >
                        加载更多
                    </Button>
                </div>
            </div>
        );
    }
}

const Download = connect(
    mapStateToProps,
    mapDispatchToProps
)(withStyles(styles)(DownloadComponent));

export default Download;
