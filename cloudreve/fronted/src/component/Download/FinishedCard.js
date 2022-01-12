import React, { useCallback } from "react";
import {
    Card,
    CardContent,
    IconButton,
    makeStyles,
    Typography,
    useTheme
} from "@material-ui/core";
import { hex2bin, sizeToString, getPercent, secondToTimeStr } from "../../utils";
import PermMediaIcon from "@material-ui/icons/PermMedia";
import TypeIcon from "../FileManager/TypeIcon";
import MuiExpansionPanel from "@material-ui/core/ExpansionPanel";
import MuiExpansionPanelSummary from "@material-ui/core/ExpansionPanelSummary";
import MuiExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails";
import withStyles from "@material-ui/core/styles/withStyles";
import Divider from "@material-ui/core/Divider";
import { ExpandMore } from "@material-ui/icons";
import classNames from "classnames";
import TableRow from "@material-ui/core/TableRow";
import TableCell from "@material-ui/core/TableCell";
import TableBody from "@material-ui/core/TableBody";
import Table from "@material-ui/core/Table";
import Badge from "@material-ui/core/Badge";
import Tooltip from "@material-ui/core/Tooltip";
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import API from "../../middleware/Api";
import { useDispatch } from "react-redux";
import { closeAllModals, toggleSnackbar } from "../../actions";
import { useHistory } from "react-router";
import { formatLocalTime } from "../../utils/datetime";
import Link from "@material-ui/core/Link";
import Chip from "@material-ui/core/Chip";

import ReplayIcon from "@material-ui/icons/Replay";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import PauseIcon from "@material-ui/icons/Pause";
import DeleteIcon from "@material-ui/icons/Delete";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import FolderOpenIcon from "@material-ui/icons/FolderOpen";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import Checkbox from "@material-ui/core/Checkbox";
import SpeedIcon from "@material-ui/icons/Speed";
import HourglassEmptyIcon from "@material-ui/icons/HourglassEmpty";
import WarningIcon from "@material-ui/icons/Warning";


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
        },
        textAlign: "left"
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
    badge: {
        marginLeft: theme.spacing(1),
        height: 17
    }
}));

export default function FinishedCard(props) {
    const classes = useStyles();
    const theme = useTheme();
    const history = useHistory();
    // console.log(props)


    const [expanded, setExpanded] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [page, setPage] = React.useState(false);


    const dispatch = useDispatch();
    const ToggleSnackbar = useCallback(
        (vertical, horizontal, msg, color) =>
            dispatch(toggleSnackbar(vertical, horizontal, msg, color)),
        [dispatch]
    );

    const CloseAllModals = useCallback(
        () =>
            dispatch(closeAllModals()),
        [dispatch]
    );
    //状态更新
    const updateStatus = () => {
        props.reload.loadDownloading();
        props.reload.loadFinishes();
    };


    // function getPercent(completed, total, num) {
    //     if (total === "0" || total === 0 || completed === "0" || completed === 0) return "0.00";
    //     if (completed > total) return "0.00";
    //     if (completed === total) return "100.00";
    //     const result = ((completed / total) * Math.pow(10, 2)).toString();
    //     const index = result.indexOf(".");
    //     if (index === -1) return Number(result).toFixed(num);
    //     else return result.slice(0, index + (num + 1));
    // }

    const delTask = () => {
        setLoading(true);
        API.delete("/aria2/task/" + props.task.gid)
            .then(() => {
                ToggleSnackbar("top", "right", "删除成功", "success");

            }).then(() => {
            props.reload.loadFinishes();
        })
            .catch((error) => {
                ToggleSnackbar("top", "right", error.message, "error");
            })
            .then(() => {
                setLoading(false);
            });
    };


    const reLoadTask = () => {
        setLoading(true);
        API.get("/aria2/reDownload/" + props.task.task_id)
            .then(() => {
                ToggleSnackbar("top", "right", "恢复下载成功", "success");

            }).then(() => {
            props.reload.loadFinishes();
        })
            .catch((error) => {
                ToggleSnackbar("top", "right", error.message, "error");
            })
            .then(() => {
                setLoading(false);
            });
    };

    const getDownloadName = useCallback(() => {
        return props.task.name === "." ? "[未知]" : props.task.name;
    }, [props.task.name]);

    const scrollToAnchor = (anchorName) => {
        setTimeout(() => {
            if (anchorName) {
                const anchorElement = document.getElementById(anchorName);
                console.log("anchorElement", anchorElement);
                if (anchorElement) {
                    anchorElement.scrollIntoView(
                        { block: "start", behavior: "smooth" }
                    );
                    // window.scrollTo(0, anchorElement.offsetTop - window.innerHeight / 2);
                }
            }
        }, 100);

    };
    const getSelected = useCallback(() => {
        // const filtered = props.task.files.map(el => {
        //     el.path = el.path.replace(props.task.parent + "/", "");
        //     if (props.task.mode === "multi") el.path = el.path.replace(props.task.name + "/", "");
        //     return el;
        // });
        return [props.task.files.length, props.task.files];
    }, [props.task.files]);

    const [len, filtered] = getSelected();


    // console.log("url",url)

    const activeFiles = () => {
        props.task.size = !props.task.size ? 6 : props.task.size;

        props.task.len = len;
        // console.log("过滤详情: len filtered size",len,filtered, props.task.size)
        return filtered.slice(0, props.task.size > len ? len : props.task.size);
    };

    const handleChange = () => (event, newExpanded) => {
        setExpanded(!!newExpanded);
        props.task.size = 6;
        // console.log("change ~~")

    };
    const getTaskType = () => {
        const index = props.task.source.indexOf(":");
        return index === -1 ? "UnKnown" : props.task.source.slice(0, index);
    };

    const reDownload = () => {
        setLoading(true);
        API.delete("/aria2/task/" + props.task.gid)
            .then(() => {
                API.post("/aria2/url", {
                    url: props.task.source,
                    dst: props.task.dst
                })
                    .then(() => {
                        ToggleSnackbar(
                            "top",
                            "right",
                            "任务已重建",
                            "success"
                        );
                        setLoading(false);
                        updateStatus();
                        // window.location.reload()
                    })
                    .catch((error) => {
                        ToggleSnackbar(
                            "top",
                            "right",
                            error.message,
                            "error"
                        );
                        setLoading(false);
                    });
            })
            .catch((error) => {
                ToggleSnackbar("top", "right", error.message, "error");
            });


    };


    const getIcon = useCallback(() => {
        if (props.task.mode === "multi") {
            return (
                <Badge badgeContent={len} max={9999} color="secondary">
                    <PermMediaIcon className={classes.iconMultiple} />
                </Badge>
            );
        } else {
            return (
                <TypeIcon
                    className={classes.iconBig}
                    fileName={getDownloadName(props.task)}
                />
            );
        }
    }, [props.task, classes]);

    const getTaskError = (error) => {
        try {
            const res = JSON.parse(error);
            if (res.error === "The specified item name already exists.") return res.msg + "：" + "该目录下已存在同名文件! 请直接通过下方按钮找到对应目录！";
            return res.msg + "：" + res.error;
        } catch (e) {
            return "文件转存失败";
        }
    };

    const copyToClipboard = (text,info) => {
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
                ToggleSnackbar("top", "center", info?info:"已复制到剪切板", "success");
                cInput.remove();
            } catch (e1) {
                ToggleSnackbar("top", "center", "目前系统不支持直接复制", "error");
            }

        }

    };

    const getFromOtherInfo = (otherInfo, key) => {
        try {
            return JSON.parse(otherInfo)[key];
        } catch (e) {
            return;
        }
    };

    const getTryCount = () => {
        const try_count_info = getFromOtherInfo(props.task.other_info, "try_count_info");
        if (try_count_info !== undefined && try_count_info !== 0) {
            return try_count_info;
        }
    };


    return (
        <Card className={classes.card}>
            <ExpansionPanel
                square
                expanded={expanded}
                onChange={handleChange("")}
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
                        {props.task.status === 3 && (
                            <Tooltip title={props.task.error}>
                                <Typography
                                    variant="body2"
                                    color="error"
                                    noWrap
                                >
                                    下载出错：{props.task.error}
                                </Typography>
                            </Tooltip>
                        )}
                        {props.task.status === 5 && (
                            <Typography
                                variant="body2"
                                color="textSecondary"
                                noWrap
                            >
                                已取消
                                {props.task.error !== "" && (
                                    <span>：{props.task.error}</span>
                                )}
                            </Typography>
                        )}
                        {props.task.status === 4 &&
                            props.task.task_status === 4 && (
                                <Typography
                                    variant="body2"
                                    style={{
                                        color: theme.palette.success.main
                                    }}
                                    noWrap
                                >
                                    已转存完成
                                </Typography>
                            )}
                        {props.task.status === 4 &&
                            props.task.task_status === 0 && (
                                <Typography
                                    variant="body2"
                                    style={{
                                        color: theme.palette.success.light
                                    }}
                                    noWrap
                                >
                                    已下载完成，转存排队中
                                </Typography>
                            )}
                        {props.task.status === 4 &&
                            props.task.task_status === 1 && (
                                <Typography
                                    variant="body2"
                                    style={{
                                        color: theme.palette.success.light
                                    }}
                                    noWrap
                                >
                                    已下载完成，转存处理中
                                </Typography>
                            )}

                        {props.task.status === 4 &&
                            props.task.task_status === 2 && (
                                <Typography
                                    variant="body2"
                                    color={"error"}
                                    noWrap
                                    title={props.task.task_error}

                                >
                                    {getTaskError(props.task.task_error)}
                                </Typography>
                            )}
                        {props.task.status === 4 &&
                            props.task.task_status === -1 && (
                                <Typography
                                    variant="body2"
                                    color={"error"}
                                    noWrap
                                    title={"下载完成,即将转存时出现问题"}
                                >
                                    {"下载完成,即将转存时出现问题"}
                                </Typography>
                            )}
                        <Typography
                            variant="body2"
                            noWrap
                        >
                            <Chip
                                size="small"
                                className={classes.badge}
                                color="primary"
                                label={getTaskType()}
                            />
                            <Chip
                                size="small"
                                className={classes.badge}
                                color="primary"
                                label={sizeToString(
                                    props.task.total
                                )}
                            />
                            {props.task.status === 4 &&
                                props.task.task_status === 1 && (<Chip
                                        size="small"
                                        color="primary"
                                        icon={<HourglassEmptyIcon />}
                                        className={classes.badge}
                                        label={`${props.task.task_progress}/${props.task.files.filter(el => el.selected === "true").length}`}
                                    />
                                )}
                            {props.task.status === 4
                                &&
                                props.task.task_status === 1
                                &&
                                props.task.speed !== undefined && props.task.speed !== null
                                &&
                                (<Chip
                                        size="small"
                                        className={classes.badge}
                                        icon={<SpeedIcon />}
                                        color="primary"
                                        label={`${sizeToString(props.task.speed)} /s`}
                                    />
                                )}
                            {props.task.status === 4
                                &&
                                props.task.task_status === 1
                                &&
                                props.task.other_info
                                &&
                                props.task.other_info.try_count_info !== undefined &&  props.task.other_info.try_count_info !== 0
                                &&
                                (<Chip
                                        size="small"
                                        className={classes.badge}
                                        icon={<WarningIcon />}
                                        color="secondary"
                                        label={`try:${props.task.other_info.try_count_info}`}
                                    />
                                )}
                        </Typography>

                    </CardContent>
                    <CardContent className={classes.contentSide} id={"head" + props.index}>
                        <IconButton
                            onClick={(e) => {
                                console.log("expand", expanded);
                                if (!expanded) {
                                    e.preventDefault();
                                    scrollToAnchor("end" + props.index);
                                }
                            }}
                        >
                            <ExpandMore

                                className={classNames(
                                    {
                                        [classes.expanded]: expanded
                                    },
                                    classes.expand
                                )}

                            />
                        </IconButton>
                    </CardContent>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <Divider />
                    {len >= 1 && (
                        <div className={classes.scroll}>
                            <Table>
                                <TableBody>
                                    {activeFiles().map((value) => {
                                        return (
                                            <TableRow key={value.index}>
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
                                                        )}
                                                        %
                                                    </Typography>
                                                </TableCell>
                                                <TableCell
                                                    component="th"
                                                    scope="row"
                                                >
                                                    <Typography noWrap>
                                                        <Checkbox
                                                            checked={value.selected === "true"}
                                                            value="checkedA"
                                                            disables
                                                        />
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                                {props.task.len > props.task.size ? (
                                    <div>
                                        <IconButton
                                            size={"small"}
                                            className={classes.actionButton}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                props.task.size += 6;
                                                setPage(!page);
                                                scrollToAnchor("temp" + props.index);
                                            }}
                                        >
                                            <MoreHorizIcon />
                                        </IconButton>
                                        <Button

                                            size="small"
                                            className={classes.actionButton}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                props.task.size = props.task.len;
                                                setPage(!page);
                                                scrollToAnchor("temp" + props.index);
                                            }}
                                            disabled={props.task.len <= props.task.size}

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

                                {props.task.len <= props.task.size && (
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

                                                e.preventDefault();
                                                if (expanded) scrollToAnchor("head" + props.index);
                                                handleChange("");
                                            }}

                                        />

                                    </IconButton>

                                )
                                }
                            </Table>
                        </div>
                    )}

                    <div className={classes.action} id={"temp" + props.index}>

                        <IconButton
                            className={classes.actionButton}
                            onClick={() => {
                                history.push("/home?path=" +
                                    encodeURIComponent(props.task.dst + (props.task.task_status === 4 || props.task.task_error.indexOf("The specified item name already exists.") !== -1 ? (props.task.mode === "multi" ? "/" + props.task.name : "") : "")));
                            }
                            }
                            title={"打开存放目录"}
                            size="small"
                            disabled={loading}

                        >
                            <FolderOpenIcon />
                        </IconButton>

                        <IconButton
                            id={"end" + props.index}
                            className={classes.actionButton}
                            onClick={delTask}
                            disabled={loading}
                            title="删除"
                            size="small"
                        >
                            <DeleteIcon />
                        </IconButton>
                        <IconButton
                            className={classes.actionButton}
                            onClick={(props.task.status === 3 || props.task.status === 5 || props.task.task_status ===-1 ||  (props.task.status === 4 && props.task.task_status === 4)) ? reDownload : reLoadTask}
                            disabled={loading || (props.task.status === 4  && (props.task.task_status === 0 || props.task.task_status === 1))} //loading 或者 下载状态为4并且转存状态为[0 1] 的时候 不给按
                            title={(props.task.status === 3 || props.task.status === 5 || props.task.task_status ===-1 || (props.task.status === 4 && props.task.task_status === 4)) ? "重新下载" : "重新转存"}
                            size="small"
                        >
                            <ReplayIcon />
                        </IconButton>
                        {props.task.name && (<IconButton
                            className={classes.actionButton}
                            onClick={() =>
                                copyToClipboard(
                                    props.task.name,"已成功复制文件名到剪切板"
                                )
                            }
                            title="复制"
                            size="small"
                        >
                            <FileCopyIcon />
                        </IconButton>)}
                    </div>
                    <Divider />
                    <div className={classes.info}>
                        <Grid container>
                            <Grid container xs={12} sm={6}>
                                <Grid item xs={6} className={classes.infoTitle}>
                                    下载开始日期：
                                </Grid>
                                <Grid item xs={6} className={classes.infoValue}>
                                    {formatLocalTime(
                                        props.task.download_create,
                                        "YYYY-MM-DD H:mm:ss"
                                    )}
                                </Grid>
                            </Grid>
                            <Grid container xs={12} sm={6}>
                                <Grid item xs={6} className={classes.infoTitle}>
                                    下载完成日期：
                                </Grid>
                                <Grid item xs={6} className={classes.infoValue}>
                                    {formatLocalTime(
                                        props.task.download_update,
                                        "YYYY-MM-DD H:mm:ss"
                                    )}
                                </Grid>
                            </Grid>
                            {!!props.task.task_create && (<Grid container xs={12} sm={6}>
                                <Grid item xs={6} className={classes.infoTitle}>
                                    转存开始日期：
                                </Grid>
                                <Grid item xs={6} className={classes.infoValue}>
                                    {formatLocalTime(
                                        props.task.task_create,
                                        "YYYY-MM-DD H:mm:ss"
                                    )}
                                </Grid>
                            </Grid>)}
                            {props.task.task_status === 4 && !!props.task.task_update && (
                                <Grid container xs={12} sm={6}>
                                    <Grid item xs={6} className={classes.infoTitle}>
                                        转存完成日期：
                                    </Grid>
                                    <Grid item xs={6} className={classes.infoValue}>
                                        {props.task.task_status === 0 || props.task.task_status === 1 ? "-" : formatLocalTime(
                                            props.task.task_update,
                                            "YYYY-MM-DD H:mm:ss"
                                        )}
                                    </Grid>
                                </Grid>)}
                            <Grid container xs={12} sm={12}>
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
                                    xs={10}
                                    sm={10}
                                    style={{
                                        wordBreak: "break-all"
                                    }}
                                    className={classes.infoValue}
                                >
                                    {props.task.source.length > 60 ? props.task.source.slice(0, 61) + "..." : props.task.source}
                                    {
                                        props.task.source !== "" && (
                                            <IconButton
                                                className={classes.copy}
                                                onClick={() =>
                                                    copyToClipboard(
                                                        props.task.source,"已成功复制原始连接到剪切板"
                                                    )
                                                }
                                                title="复制"
                                                size="small"
                                            >
                                                <FileCopyIcon />
                                            </IconButton>
                                        )
                                    }
                                    {/*<Link*/}
                                    {/*    className={classes.copy}*/}
                                    {/*    onClick={() =>*/}
                                    {/*        copyToClipboard(*/}
                                    {/*            props.task.source*/}
                                    {/*        )*/}
                                    {/*    }*/}
                                    {/*    href={"javascript:void;"}*/}
                                    {/*>*/}
                                    {/*    复制*/}
                                    {/*</Link>*/}
                                </Grid>
                            </Grid>
                        </Grid>
                    </div>
                </ExpansionPanelDetails>
            </ExpansionPanel>
        </Card>
    );
}
