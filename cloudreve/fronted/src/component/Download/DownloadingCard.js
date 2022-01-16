import {
    Card,
    CardContent, CircularProgress,
    darken, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    IconButton,
    lighten,
    LinearProgress,
    makeStyles,
    Typography,
    useTheme
} from "@material-ui/core";
import Badge from "@material-ui/core/Badge";
import Button from "@material-ui/core/Button";
import Divider from "@material-ui/core/Divider";
import MuiExpansionPanel from "@material-ui/core/ExpansionPanel";
import MuiExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails";
import MuiExpansionPanelSummary from "@material-ui/core/ExpansionPanelSummary";
import Grid from "@material-ui/core/Grid";
import withStyles from "@material-ui/core/styles/withStyles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import Tooltip from "@material-ui/core/Tooltip";
import { ExpandMore, HighlightOff } from "@material-ui/icons";
import PermMediaIcon from "@material-ui/icons/PermMedia";
import classNames from "classnames";
import React, { useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import TimeAgo from "timeago-react";
import { toggleSnackbar } from "../../actions";
import API from "../../middleware/Api";
import { hex2bin, sizeToString,getPercent,secondToTimeStr } from "../../utils";
import TypeIcon from "../FileManager/TypeIcon";
import SelectFileDialog from "../Modals/SelectFile";
import { useHistory } from "react-router";
import axios from "axios";
import Link from "@material-ui/core/Link";
import ReplayIcon from "@material-ui/icons/Replay";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import PauseIcon from "@material-ui/icons/Pause";
import CancelIcon from "@material-ui/icons/Cancel";
import DeleteIcon from "@material-ui/icons/Delete";
import FolderOpenIcon from "@material-ui/icons/FolderOpen";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import EditIcon from "@material-ui/icons/Edit";
import Chip from "@material-ui/core/Chip";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";

const ExpansionPanel = withStyles({
    root: {
        maxWidth: "100%",
        boxShadow: "none",
        "&:not(:last-child)": {
            borderBottom: 0
        },
        "&:before": {
            display: "none"
        },
        "&$expanded": {}
    },
    expanded: {}
})(MuiExpansionPanel);

const ExpansionPanelSummary = withStyles({
    root: {
        minHeight: 0,
        padding: 0,

        "&$expanded": {
            minHeight: 56
        }
    },
    content: {
        maxWidth: "100%",
        margin: 0,
        display: "flex",
        "&$expanded": {
            margin: "0"
        }
    },
    expanded: {}
})(MuiExpansionPanelSummary);

const ExpansionPanelDetails = withStyles((theme) => ({
    root: {
        display: "block",
        padding: theme.spacing(0)
    }
}))(MuiExpansionPanelDetails);

const useStyles = makeStyles((theme) => ({
    card: {
        marginTop: "20px",
        justifyContent: "space-between"
    },
    iconContainer: {
        width: "90px",
        height: "96px",
        padding: " 35px 29px 29px 29px",
        paddingLeft: "35px",
        [theme.breakpoints.down("sm")]: {
            display: "none"
        }
    },
    content: {
        width: "100%",
        minWidth: 0,
        [theme.breakpoints.up("sm")]: {
            borderInlineStart: "1px " + theme.palette.divider + " solid"
        }
    },
    contentSide: {
        minWidth: 0,
        paddingTop: "24px",
        paddingRight: "28px",
        [theme.breakpoints.down("sm")]: {
            display: "none"
        }
    },
    iconBig: {
        fontSize: "30px"
    },
    iconMultiple: {
        fontSize: "30px",
        color: "#607D8B"
    },
    progress: {
        marginTop: 8,
        marginBottom: 4
    },
    expand: {
        transition: ".15s transform ease-in-out"
    },
    expanded: {
        transform: "rotate(180deg)"
    },
    subFileName: {
        display: "flex"
    },
    subFileIcon: {
        marginRight: "20px"
    },
    scroll: {
        overflowY: "auto"
    },
    action: {
        padding: theme.spacing(2),
        textAlign: "right"
    },
    actionButton: {
        marginLeft: theme.spacing(1)
    },
    info: {
        padding: theme.spacing(2)
    },
    infoTitle: {
        fontWeight: 700
    },
    infoValue: {
        color: theme.palette.text.secondary
    },
    bitmap: {
        width: "100%",
        height: "50px",
        backgroundColor: theme.palette.background.default
    },
    copy: {
        marginLeft: 10
    },
    badge: {
        marginLeft: theme.spacing(1),
        height: 17
    },
    wrapper: {
        margin: theme.spacing(1),
        position: "relative"
    },
    buttonProgress: {
        color: theme.palette.secondary.light,
        position: "absolute",
        top: "50%",
        left: "50%",
        marginTop: -12,
        marginLeft: -12
    }
}));

export default function DownloadingCard(props) {
    const canvasRef = React.createRef();
    const classes = useStyles();
    const theme = useTheme();
    const history = useHistory();

    const [expanded, setExpanded] = React.useState("");
    const [task, setTask] = React.useState(props.task);
    const [loading, setLoading] = React.useState(false);
    const [selectDialogOpen, setSelectDialogOpen] = React.useState(false);
    const [selectFileOption, setSelectFileOption] = React.useState([]);
    const [isStart, setIsStart] = React.useState(task.info.status === "active");

    const [page, setPage] = React.useState(false);
    const [uploadDownloadeds, setUploadDownloadeds] = React.useState([]);

    const [isOpenUploadDialog, setIsOpenUploadDialog] = React.useState(false);

    const getSelected = useCallback(() => {
        if(task || task.info || task.info.files){
            return [0,[]]
        }
        const filtered = task.info.files.filter((v) => v.selected === "true");
        return [filtered.length, filtered];
    }, [task.info.files]);

    const [len, filtered] = getSelected();

    const handleChange = (panel) => (event, newExpanded) => {
        setExpanded(newExpanded ? panel : false);
        task.size = 20;
    };


    const dispatch = useDispatch();
    const ToggleSnackbar = useCallback(
        (vertical, horizontal, msg, color) =>
            dispatch(toggleSnackbar(vertical, horizontal, msg, color)),
        [dispatch]
    );

    useEffect(() => {
        setTask(props.task);
    }, [props.task]);

    useEffect(() => {
        if (task.info.bitfield === "") {
            return;
        }
        let result = "";
        task.info.bitfield.match(/.{1,2}/g).forEach((str) => {
            result += hex2bin(str);
        });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = theme.palette.primary.main;
        for (let i = 0; i < canvas.width; i++) {
            let bit =
                result[
                    Math.round(((i + 1) / canvas.width) * task.info.numPieces)
                    ];
            bit = bit ? bit : result.slice(-1);
            if (bit === "1") {
                context.beginPath();
                context.moveTo(i, 0);
                context.lineTo(i, canvas.height);
                context.stroke();
            }
        }
        // eslint-disable-next-line
    }, [task.info.bitfield, task.info.numPieces, theme]);




    const activeFiles = () => {
        task.size = !task.size ? 20 : task.size;

        task.len = len;
        // console.log("过滤详情: len filtered size",len,filtered, props.task.size)
        return filtered.slice(0, task.size > len ? len : task.size);
    };


    const deleteFile = (index) => {
        setLoading(true);
        const current = activeFiles();
        const newIndex = [];
        const newFiles = [];
        // eslint-disable-next-line
        current.map((v) => {
            if (v.index !== index && v.selected) {
                newIndex.push(parseInt(v.index));
                newFiles.push({
                    ...v,
                    selected: "true"
                });
            } else {
                newFiles.push({
                    ...v,
                    selected: "false"
                });
            }
        });
        API.put("/aria2/select/" + task.info.gid, {
            indexes: newIndex
        })
            .then(() => {
                setTask({
                    ...task,
                    info: {
                        ...task.info,
                        files: newFiles
                    }
                });
                ToggleSnackbar("top", "right", "文件已删除", "success");
            })
            .catch((error) => {
                ToggleSnackbar("top", "right", error.message, "error");
            })
            .then(() => {
                setLoading(false);
            });
    };


    const getDownloadName = useCallback(() => {
        if (task.info.bittorrent.info.name !== "") {
            return task.info.bittorrent.info.name;
        }
        return task.name === "." ? "[未知]" : task.name;
    }, [task]);

    const getIcon = useCallback(() => {
        if (task.info.bittorrent.mode === "multi") {
            return (
                <Badge badgeContent={len} max={9999} color="secondary">
                    <PermMediaIcon className={classes.iconMultiple} />
                </Badge>
            );
        } else {
            return (
                <TypeIcon
                    className={classes.iconBig}
                    fileName={getDownloadName(task)}
                />
            );
        }
        // eslint-disable-next-line
    }, [task, classes]);

    const cancel = () => {
        setLoading(true);
        API.delete("/aria2/task/" + task.info.gid)
            .then(() => {
                ToggleSnackbar(
                    "top",
                    "right",
                    "任务已取消，请不要刷新页面,状态会在稍后更新",
                    "success"
                );
            })
            .catch((error) => {
                ToggleSnackbar("top", "right", error.message, "error");
            })
            .then(() => {
                setLoading(false);
                // window.location.reload()
            });
    };

    //重新下载
    const reDownLoad = () => {
        new Promise(((resolve, reject) => {
            setLoading(true);
            API.delete("/aria2/task/" + task.info.gid)
                .then(() => {
                    ToggleSnackbar(
                        "top",
                        "right",
                        "重新下载，状态会在稍后更新",
                        "success"
                    );
                    setLoading(false);
                    resolve("delete ok!");
                })
                .catch(error => {
                    ToggleSnackbar("top", "right", error.message, "error");
                    // window.location.reload();
                });
        })).then(result => {

            console.log("result", result);
            return new Promise(((resolve, reject) => {
                setTimeout(() => {
                    setLoading(true);
                    API.post("/aria2/url", {
                        dst: task.dst,
                        url: "magnet:?xt=urn:btih:" + task.info.infoHash
                    })
                        .then((res) => {
                            resolve(res);
                        })
                        .catch(error => {
                            ToggleSnackbar("top", "right", error.message, "error");
                        });

                }, 5000);
            }));
        }).then((res) => {
            console.log("res", res);
            setLoading(false);
        }).finally(() => {
            console.log("任务完成 刷新页面");
            window.location.reload();
        });

    };

    // aria2 相关 停止 forcePause 继续 unpause
    const ariaClient = () => {
        axios({
            method: "get",
            url: "http://mrxzz.f3322.net:20013/main/test_cache"


        }).then((res) => {
            console.log("test_flask", res);
            //错误再往后看
        }).catch((error) => {
            ToggleSnackbar("top", "right", error.message, "error");
        });
    };
    //状态更新
    const updateStatus = () => {
        // console.log("props.reload", props.reload);
        props.reload.loadDownloading();
        props.reload.loadFinishes();
    };


    const _aria_op = (op, args) => {
        setLoading(true);
        const data = {
            op: op,
            args: args
        };
        console.log("data", data);
        return axios({
            method: "post",
            url: "http://mrxzz.f3322.net:20013/tools/aria2/op",
            data: data
        })
            .catch((error) => {
                ToggleSnackbar("top", "right", error.data.message, "error");
            });
    };


    const pause = () => {
        setLoading(true)
        API.get("/aria2/pause/" + task.info.gid).then(() => {
            ToggleSnackbar(
                "top",
                "right",
                "暂停成功，状态会在稍后更新",
                "success"
            );
            setIsStart(false);
        })
            .catch((error) => {
                ToggleSnackbar("top", "right", error.message, "error");
            })
            .finally(() => {
                setLoading(false);
            });

    };

    const remove = () => {
        //先确保开始再取消
        if (task.info.status === "paused") {
            _aria_op("unpause", [task.info.gid]).then(() => {
                return _aria_op("forceRemove", [task.info.gid]).then(() => {
                    ToggleSnackbar(
                        "top",
                        "right",
                        "任务已取消，请不要刷新页面,状态会在稍后更新",
                        "success"
                    );
                })
                    .catch((error) => {
                        ToggleSnackbar("top", "right", error.message, "error");
                    })
                    .then(() => {
                        setLoading(false);
                        setTimeout(() => {
                            updateStatus();
                        }, 1000);

                        // window.location.reload()
                    });
            });

        } else {
            _aria_op("forceRemove", [task.info.gid]).then(() => {
                ToggleSnackbar(
                    "top",
                    "right",
                    "任务已取消，请不要刷新页面,状态会在稍后更新",
                    "success"
                );
            })
                .catch((error) => {
                    ToggleSnackbar("top", "right", error.message, "error");
                })
                .then(() => {
                    setLoading(false);
                    setTimeout(() => {
                        props.reload.loadFinishes();
                    }, 1000);
                    // window.location.reload()
                });
        }


    };

    const start = () => {
        setLoading(true)
        API.get("/aria2/start/" + task.info.gid).then(() => {
            ToggleSnackbar(
                "top",
                "right",
                "开启成功，状态会在稍后更新",
                "success"
            );
            setIsStart(true);
        })
        .catch((error) => {
            ToggleSnackbar("top", "right", error.message, "error");
        })
        .finally(() => {

            setLoading(false);
            });
    };


    const getOriginalLink = (subLen) => {
        let result = "";
        try {
            if (task.info.infoHash === "") result = task.info.files.uris ? task.info.files.uris[0].uri : "未知链接";
            else result = "magnet:?xt=urn:btih:" + task.info.infoHash;
        } catch (e) {
            result = "未知链接";
        }
        if (subLen) return result.length > subLen ? result.slice(0, subLen + 1) + "..." : result;
        else return result;


    };


    const changeSelectedFile = (fileIndex) => {
        setLoading(true);
        API.put("/aria2/select/" + task.info.gid, {
            indexes: fileIndex
        })
            .then(() => {
                ToggleSnackbar(
                    "top",
                    "right",
                    "操作成功，状态会在稍后更新",
                    "success"
                );
                setSelectDialogOpen(false);
            })
            .catch((error) => {
                ToggleSnackbar("top", "right", error.message, "error");
            })
            .then(() => {
                setLoading(false);
            });
    };


    const closeUploadDiaLog = () => {
        setIsOpenUploadDialog(false);
        setUploadDownloadeds([]);
        props.reload.loadDownloading();
    };

    const openUploadDialog = () => {
        if(task || task.info || task.info.files)return
        const task_mod = task.info.files.filter(el => el.selected === "true" && (el.completedLength === el.length));
        console.log("task_mod", task_mod);
        setUploadDownloadeds(task_mod);
        setIsOpenUploadDialog(true);
    };

    const uploadDownloaded = () => {
        setLoading(true);

        API.put("/aria2/select/" + task.info.gid, {
            indexes: uploadDownloadeds.map(el => parseInt(el.index))
        })
            .then(() => {
                ToggleSnackbar(
                    "top",
                    "right",
                    "已完成文件上传成功，状态会在稍后更新",
                    "success"
                );
                setLoading(false);
                closeUploadDiaLog();
                updateStatus();
            })
            .catch((error) => {
                ToggleSnackbar("top", "right", error.message, "error");
            });

    };


    const copyToClipboard = (text) => {
        try {
            navigator.clipboard.writeText(text);
            ToggleSnackbar("top", "center", "已复制到剪切板", "success");
        } catch (e) {
            try {
                const cInput = document.createElement("input");
                cInput.value = text;
                document.body.appendChild(cInput);
                cInput.select(); // 选取文本域内容;
                document.execCommand("Copy");
                ToggleSnackbar("top", "center", "已复制到剪切板", "success");
                cInput.remove();
            } catch (e1) {
                ToggleSnackbar("top", "center", "目前系统不支持直接复制", "error");
            }

        }

    };

    return (
        <>
            <Card className={classes.card}>
                <SelectFileDialog
                    open={selectDialogOpen}
                    onClose={() => setSelectDialogOpen(false)}
                    modalsLoading={loading}
                    files={selectFileOption}
                    onSubmit={changeSelectedFile}
                />
                <ExpansionPanel
                    square
                    expanded={expanded === task.info.gid}
                    onChange={handleChange(task.info.gid)}
                >
                    <ExpansionPanelSummary
                        aria-controls="panel1d-content"
                        id="panel1d-header"
                    >
                        <div className={classes.iconContainer}>{getIcon()}
                        </div>
                        <CardContent className={classes.content}>
                            <Typography color="primary" noWrap>
                                <Tooltip title={getDownloadName()}>
                                    <span>{getDownloadName()}</span>
                                </Tooltip>
                            </Typography>
                            <LinearProgress
                                color="secondary"
                                variant="determinate"
                                className={classes.progress}
                                value={getPercent(task.downloaded, task.total, 2)}
                            />
                            <Typography
                                variant="body2"
                                color="textSecondary"
                                noWrap
                            >
                                {task.total > 0 && (
                                    <span>
                                    {getPercent(
                                        task.downloaded,
                                        task.total,
                                        2
                                    )}
                                        % -{" "}
                                        {task.downloaded === 0
                                            ? "0Bytes"
                                            : sizeToString(task.downloaded)}
                                        /
                                        {task.total === 0
                                            ? "0Bytes"
                                            : sizeToString(task.total)}{" "}
                                        -{" "}
                                        {task.speed === "0"
                                            ? "0B/s"
                                            : sizeToString(task.speed) + "/s"}{" "}
                                        -{" "}
                                        {" "}{"剩余时间:" + secondToTimeStr((task.total - task.downloaded) / task.speed)}
                                </span>
                                )}
                                {task.total === 0 && <span> - </span>}
                            </Typography>
                        </CardContent>
                        <CardContent className={classes.contentSide}>
                            <IconButton>
                                <ExpandMore
                                    className={classNames(
                                        {
                                            [classes.expanded]:
                                            expanded === task.info.gid
                                        },
                                        classes.expand
                                    )}
                                />
                            </IconButton>
                        </CardContent>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails>
                        <Divider />
                        {task.info.bittorrent.mode === "multi" && (
                            <div className={classes.scroll}>
                                <Table size="small">
                                    <TableBody>
                                        {activeFiles().map((value) => {
                                            return (
                                                <TableRow
                                                    key={value.index}
                                                    style={{
                                                        background:
                                                            "linear-gradient(to right, " +
                                                            (theme.palette.type ===
                                                            "dark"
                                                                ? darken(
                                                                    theme.palette
                                                                        .primary
                                                                        .main,
                                                                    0.4
                                                                )
                                                                : lighten(
                                                                    theme.palette
                                                                        .primary
                                                                        .main,
                                                                    0.85
                                                                )) +
                                                            " 0%," +
                                                            (theme.palette.type ===
                                                            "dark"
                                                                ? darken(
                                                                    theme.palette
                                                                        .primary
                                                                        .main,
                                                                    0.4
                                                                )
                                                                : lighten(
                                                                    theme.palette
                                                                        .primary
                                                                        .main,
                                                                    0.85
                                                                )) +
                                                            " " +
                                                            getPercent(
                                                                value.completedLength,
                                                                value.length, 2
                                                            ) +
                                                            "%," +
                                                            theme.palette.background
                                                                .paper +
                                                            " " +
                                                            getPercent(
                                                                value.completedLength,
                                                                value.length, 2
                                                            ) +
                                                            "%," +
                                                            theme.palette.background
                                                                .paper +
                                                            " 100%)"
                                                    }}
                                                >
                                                    <TableCell
                                                        component="th"
                                                        scope="row"
                                                    >
                                                        <Typography
                                                            className={
                                                                classes.subFileName
                                                            }
                                                        >
                                                            <TypeIcon
                                                                className={
                                                                    classes.subFileIcon
                                                                }
                                                                fileName={
                                                                    value.path
                                                                }
                                                            />
                                                            {value.path}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell
                                                        component="th"
                                                        scope="row"
                                                    >
                                                        <Typography noWrap>
                                                            {" "}
                                                            {sizeToString(
                                                                value.length
                                                            )}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell
                                                        component="th"
                                                        scope="row"
                                                    >
                                                        <Typography noWrap>
                                                            {getPercent(
                                                                value.completedLength,
                                                                value.length, 2
                                                            )}%
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Tooltip title="删除此文件">
                                                            <IconButton
                                                                onClick={() =>
                                                                    deleteFile(
                                                                        value.index
                                                                    )
                                                                }
                                                                disabled={loading}
                                                                size={"small"}
                                                            >
                                                                <HighlightOff />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                    {task.len > task.size ? (
                                        <div>
                                            <IconButton
                                                size={"small"}
                                                className={classes.actionButton}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    task.size += 20;
                                                    setPage(!page);
                                                }}
                                            >
                                                <MoreHorizIcon />
                                            </IconButton>
                                            <Button

                                                size="small"
                                                className={classes.actionButton}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    task.size = task.len;
                                                    setPage(!page);

                                                }}
                                                disabled={task.len <= task.size}

                                            >
                                                展开全部
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            size={"small"}
                                            className={classes.actionButton}
                                            title="没有更多内容~"
                                            disabled
                                        >
                                            已经到底
                                        </Button>
                                    )
                                    }

                                    {task.len <= task.size && (
                                        <IconButton

                                        >
                                            <ExpandMore
                                                className={classNames(
                                                    {
                                                        [classes.expand]: !expanded
                                                    },
                                                    classes.expanded
                                                )}
                                                onClick={(e) => {
                                                    handleChange("");
                                                    // e.preventDefault();

                                                }}

                                            />

                                        </IconButton>

                                    )
                                    }
                                </Table>
                            </div>
                        )}

                        <div className={classes.action}>
                            <IconButton
                                className={classes.actionButton}
                                onClick={start}
                                disabled={loading || isStart }
                                title="开始"
                                size="small"
                            >
                                <PlayArrowIcon />
                            </IconButton>
                            <IconButton
                                className={classes.actionButton}
                                onClick={pause}

                                disabled={loading || !isStart}
                                title="暂停"
                                size="small"
                            >
                                <PauseIcon />
                            </IconButton>
                            {/*<IconButton*/}
                            {/*    className={classes.actionButton}*/}
                            {/*    onClick={() => {*/}
                            {/*        console.log("REPLAY");*/}
                            {/*    }}*/}
                            {/*    disabled={loading}*/}
                            {/*    title="重新下载"*/}
                            {/*    size="small"*/}
                            {/*>*/}
                            {/*    <ReplayIcon />*/}
                            {/*</IconButton>*/}
                            <IconButton
                                className={classes.actionButton}
                                onClick={cancel}
                                disabled={loading}
                                title="取消任务"
                                size="small"
                            >
                                <CancelIcon />
                            </IconButton>
                            {task.info.bittorrent.mode === "multi" && (
                                <IconButton
                                    className={classes.actionButton}
                                    disabled={loading}
                                    onClick={() => {
                                        setSelectDialogOpen(true);
                                        setSelectFileOption([
                                            ...props.task.info.files
                                        ]);
                                    }}
                                    title="选择要下载的文件"
                                    size="small"
                                >
                                    <EditIcon />
                                </IconButton>
                            )}
                            {task.info.bittorrent.mode === "multi" && (
                                <IconButton
                                    className={classes.actionButton}
                                    disabled={loading}
                                    onClick={openUploadDialog}
                                    title="上传已完成的文件"
                                    size="small"
                                >
                                    <CloudUploadIcon />
                                </IconButton>
                            )}
                            <IconButton
                                className={classes.actionButton}
                                onClick={() =>
                                    history.push(
                                        "/home?path=" +
                                        encodeURIComponent(task.dst)
                                    )
                                }
                                title="打开存放目录"
                                size="small"
                            >
                                <FolderOpenIcon />
                            </IconButton>
                            <IconButton
                                className={classes.actionButton}
                                onClick={handleChange(task.info.gid)}
                            >
                                <ExpandMore
                                    className={classNames(
                                        {
                                            [classes.expanded]:
                                            expanded !== task.info.gid
                                        },
                                        classes.expand
                                    )}
                                />
                            </IconButton>
                            {/*<IconButton*/}
                            {/*    className={classes.actionButton}*/}
                            {/*    onClick={() => {*/}
                            {/*        console.log("DELETE");*/}
                            {/*    }}*/}
                            {/*    disabled={loading}*/}
                            {/*    title="删除"*/}
                            {/*    size="small"*/}
                            {/*>*/}
                            {/*    <DeleteIcon />*/}
                            {/*</IconButton>*/}
                        </div>
                        <Divider />
                        <div className={classes.info}>
                            {task.info.bitfield !== "" && (
                                <canvas
                                    width={"700"}
                                    height={"100"}
                                    ref={canvasRef}
                                    className={classes.bitmap}
                                />
                            )}

                            <Grid container>
                                <Grid container xs={12} sm={4}>
                                    <Grid item xs={4} className={classes.infoTitle}>
                                        更新于：
                                    </Grid>
                                    <Grid item xs={8} className={classes.infoValue}>
                                        <TimeAgo
                                            datetime={task.update * 1000}
                                            locale="zh_CN"
                                        />
                                    </Grid>
                                </Grid>
                                <Grid container xs={12} sm={4}>
                                    <Grid item xs={4} className={classes.infoTitle}>
                                        上传大小：
                                    </Grid>
                                    <Grid item xs={8} className={classes.infoValue}>
                                        {sizeToString(task.info.uploadLength)}
                                    </Grid>
                                </Grid>
                                <Grid container xs={12} sm={4}>
                                    <Grid item xs={4} className={classes.infoTitle}>
                                        上传速度：
                                    </Grid>
                                    <Grid item xs={8} className={classes.infoValue}>
                                        {sizeToString(task.info.uploadSpeed)} / s
                                    </Grid>
                                </Grid>
                                <Grid container xs={12} sm={8}>
                                    <Grid
                                        item
                                        sm={2}
                                        xs={4}
                                        className={classes.infoTitle}
                                    >
                                        原始链接：
                                    </Grid>
                                    <Grid
                                        item
                                        sm={10}
                                        xs={8}
                                        style={{
                                            wordBreak: "break-all"
                                        }}
                                        className={classes.infoValue}
                                    >
                                        {getOriginalLink(40)}
                                        {
                                            task.info.infoHash !== "" && (
                                                <IconButton
                                                    className={classes.copy}
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            getOriginalLink()
                                                        )
                                                    }
                                                    title="复制"
                                                    size="small"
                                                >
                                                    <FileCopyIcon />
                                                </IconButton>
                                            )
                                        }
                                    </Grid>
                                </Grid>
                                {task.info.bittorrent.mode !== "" && (
                                    <>
                                        <Grid container xs={12} sm={4}>
                                            <Grid
                                                item
                                                xs={4}
                                                className={classes.infoTitle}
                                            >
                                                做种/连接数:
                                            </Grid>
                                            <Grid
                                                item
                                                xs={8}
                                                className={classes.infoValue}
                                            >
                                                {task.info.numSeeders + "/" + task.info.connections}
                                            </Grid>
                                        </Grid>
                                        <Grid container xs={12} sm={4}>
                                            <Grid
                                                item
                                                xs={4}
                                                className={classes.infoTitle}
                                            >
                                                做种中：
                                            </Grid>
                                            <Grid
                                                item
                                                xs={8}
                                                className={classes.infoValue}
                                            >
                                                {task.info.seeder === "true"
                                                    ? "是"
                                                    : "否"}
                                            </Grid>
                                        </Grid>
                                    </>
                                )}
                                <Grid container xs={12} sm={4}>
                                    <Grid item xs={4} className={classes.infoTitle}>
                                        分片大小：
                                    </Grid>
                                    <Grid item xs={8} className={classes.infoValue}>
                                        {sizeToString(task.info.pieceLength)}
                                    </Grid>
                                </Grid>
                                <Grid container xs={12} sm={4}>
                                    <Grid item xs={4} className={classes.infoTitle}>
                                        分片数量：
                                    </Grid>
                                    <Grid item xs={8} className={classes.infoValue}>
                                        {task.info.numPieces}
                                    </Grid>
                                </Grid>
                            </Grid>
                        </div>
                    </ExpansionPanelDetails>
                </ExpansionPanel>
            </Card>
            <Dialog
                open={isOpenUploadDialog}
                onClose={closeUploadDiaLog}
                aria-labelledby="form-dialog-title"
            >
                <DialogTitle id="form-dialog-title">上传已下载完成的对象</DialogTitle>

                <DialogContent>
                    <DialogContentText>
                        {uploadDownloadeds.length === 0 ? "当前任务中还没有下载完成的对象" :
                            `您确定要直接上传:
                        ${uploadDownloadeds.map(el => el.path).join("<br>")}
                        吗？`}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeUploadDiaLog}>取消</Button>
                    <div className={classes.wrapper}>
                        <Button
                            onClick={uploadDownloaded}
                            color="primary"
                            disabled={loading || uploadDownloadeds.length === 0}
                        >
                            确定
                            {loading && (
                                <CircularProgress
                                    size={24}
                                    className={classes.buttonProgress}
                                />
                            )}
                        </Button>
                    </div>
                </DialogActions>
            </Dialog>
        </>
    );
}
