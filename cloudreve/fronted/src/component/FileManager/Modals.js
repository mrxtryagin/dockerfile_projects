import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import {
    closeAllModals,
    toggleSnackbar,
    setModalsLoading,
    refreshFileList,
    refreshStorage,
    openLoadingDialog
} from "../../actions/index";
import PathSelector from "./PathSelector";
import PathSelectorNew from "./PathSelectorNew";
import API, { baseURL } from "../../middleware/Api";
import {
    withStyles,
    Button,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    DialogContentText,
    CircularProgress,
    Select,
    FormControl,
    InputLabel,
    MenuItem
} from "@material-ui/core";
import Loading from "../Modals/Loading";
import CopyDialog from "../Modals/Copy";
import CreatShare from "../Modals/CreateShare";
import { withRouter } from "react-router-dom";
import pathHelper from "../../utils/page";
import DecompressDialog from "../Modals/Decompress";
import CompressDialog from "../Modals/Compress";
import axios from "axios";
import Link from "@material-ui/core/Link";
import Auth from "../../middleware/Auth";
import TaskTable from "./TaskTable";


const styles = (theme) => ({
    wrapper: {
        margin: theme.spacing(0.5),
        position: "relative"
    },
    buttonProgress: {
        color: theme.palette.secondary.light,
        position: "absolute",
        top: "50%",
        left: "50%",
        marginTop: -12,
        marginLeft: -12
    },
    contentFix: {
        padding: "10px 24px 0px 24px"
    },
    copy: {
        marginLeft: 10
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 100
    }
});

const mapStateToProps = (state) => {
    return {
        path: state.navigator.path,
        selected: state.explorer.selected,
        modalsStatus: state.viewUpdate.modals,
        modalsLoading: state.viewUpdate.modalsLoading,
        dirList: state.explorer.dirList,
        fileList: state.explorer.fileList,
        dndSignale: state.explorer.dndSignal,
        dndTarget: state.explorer.dndTarget,
        dndSource: state.explorer.dndSource,
        loading: state.viewUpdate.modals.loading,
        loadingText: state.viewUpdate.modals.loadingText
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        closeAllModals: () => {
            dispatch(closeAllModals());
        },
        toggleSnackbar: (vertical, horizontal, msg, color) => {
            dispatch(toggleSnackbar(vertical, horizontal, msg, color));
        },
        setModalsLoading: (status) => {
            dispatch(setModalsLoading(status));
        },
        refreshFileList: () => {
            dispatch(refreshFileList());
        },
        refreshStorage: () => {
            dispatch(refreshStorage());
        },
        openLoadingDialog: (text) => {
            dispatch(openLoadingDialog(text));
        }
    };
};


class ModalsCompoment extends Component {
    state = {
        newFolderName: "",
        newFileName: "",
        newName: "",
        selectedPath: "",
        selectedPathName: "",
        selectedObj: {},
        secretShare: false,
        sharePwd: "",
        shareUrl: "",
        downloadURL: [],
        remoteDownloadPathSelect: false,
        source: "",
        openMutiLinkDialog: false,
        loading: true,
        purchaseCallback: null,
        tasks: 0,
        valid: true,
        reset: false,
        remoteDownloadPathSelect2: false,
        checkResult: [],
        judgeSaveFile: false,
        isHasSaveFile: false
    };


    getChoice = () => {
        const userConfig = Auth.GetUser();
        const pathTag = userConfig.tags.filter(el => el.type === 1).map(el => el.expression);
        const extra = [];
        if (userConfig.extraInfo) {
            if (userConfig.extraInfo.lastDownloadPath) extra.push(userConfig.extraInfo.lastDownloadPath);
        }
        const result = {
            "lastPath": extra,
            "tags": pathTag
        };
        // console.log("result", result);
        return result;
    };

    returnResult = () => {
        const name_json = this.getChoice();
        return (Object.keys(name_json).map(
            (key, i) =>
                <React.Fragment key={i}>
                    <optgroup key={i} label={key}>
                        {key}
                    </optgroup>
                    {name_json[key].map((v, index) =>
                        <option value={v} key={index}>
                            {v}
                        </option>
                    )}
                </React.Fragment>
        ));
    };


    handleInputChange = (e) => {
        this.setState({
            [e.target.id]: e.target.value
        });
    };

    handleMagnet = (el) => {
        if (el.startsWith("magnet")) {
            const index = el.indexOf("&dn");
            if (index !== -1) el = el.slice(0, index);
        }
        return el;
    };

    handleInputChange2 = (e) => {
        this.setState(
            {
                valid: true
            }
        );
        // 过滤一下空串 和 处理种子
        const arr = e.target.value.split("\n").filter(el => el !== "").map(el => {
            if (el.startsWith("magnet")) {
                el = this.handleMagnet(el);
            }
            return el;
        });
        console.log("filter_arr", arr);
        this.checkLink(arr);

        this.setState({
            [e.target.id]: arr,
            tasks: arr.length
        });

    };


    //白名单
    white_arr = ["magnet", "http", "ftp", "sftp"];

    //checkStart

    _checkStart = (str) => {
        let flag = false;
        for (const a of this.white_arr) {
            if (str.startsWith(a) && str.length > a.length) {
                flag = true;
                break;
            }
        }
        return flag;
    };


    // 检查连接的合法性
    //目前支持的是aria2的所有链接 todo:ed2k等连接
    checkLink = (arr) => {
        let isFlag = false;
        for (const a in arr) {
            if (!this._checkStart(arr[a])) {
                isFlag = true;
                break;
            }
        }
        if (isFlag) this.setState(
            {
                valid: false,
                reset: true
            });
    };

    newNameSuffix = "";
    downloaded = false;

    UNSAFE_componentWillReceiveProps = (nextProps) => {
        if (this.props.dndSignale !== nextProps.dndSignale) {
            this.dragMove(nextProps.dndSource, nextProps.dndTarget);
            return;
        }
        if (this.props.loading !== nextProps.loading) {
            // 打包下载
            if (nextProps.loading === true) {
                if (nextProps.loadingText === "打包中...") {
                    if (
                        pathHelper.isSharePage(this.props.location.pathname) &&
                        this.props.share &&
                        this.props.share.score > 0
                    ) {
                        this.scoreHandler(this.archiveDownload);
                        return;
                    }
                    this.archiveDownload();
                } else if (nextProps.loadingText === "获取下载地址...") {
                    if (
                        pathHelper.isSharePage(this.props.location.pathname) &&
                        this.props.share &&
                        this.props.share.score > 0
                    ) {
                        this.scoreHandler(this.Download);
                        return;
                    }
                    this.Download();

                } else if (nextProps.loadingText === "批量生成中...") {
                    this.setState({
                        openMutiLinkDialog: true
                    }, () => {
                        this.getMultiLinks();
                    });

                }
            }
            return;
        }
        if (this.props.modalsStatus.rename !== nextProps.modalsStatus.rename) {
            const name = nextProps.selected[0].name;
            this.setState({
                newName: name
            });
            return;
        }
        //获取外链
        if (
            this.props.modalsStatus.getSource !==
            nextProps.modalsStatus.getSource &&
            nextProps.modalsStatus.getSource === true
        ) {
            API.get("/file/source/" + this.props.selected[0].id)
                .then((response) => {
                    this.setState({
                        source: response.data.url
                    });
                })
                .catch((error) => {
                    this.props.toggleSnackbar(
                        "top",
                        "right",
                        error.message,
                        "error"
                    );
                    this.onClose();
                });
        }
    };


    scoreHandler = (callback) => {
        callback();
    };


    Download = () => {
        let reqURL = "";
        console.log("this.props", this.props);
        if (this.props.selected[0].isMulti !== undefined && this.props.selected[0].isMulti) {
            // API.get(
            //     "/object/property/" +
            //     this.props.selected[0].id +
            //     "?trace_root=true" +
            //     "&is_folder=" +
            //     (this.props.selected[0].type === "dir").toString()
            // )
            const params = {
                id: this.props.selected[0].id,
                is_dir: this.props.selected[0].type === "dir" ? 1 : 0
            };
            console.log("params", params);
            axios({
                method: "get",
                url: "http://mrxzz.f3322.net:20013/cloudreve" + "/getFullPathById",
                params: params
            })
                .then((response) => {
                    console.log("response", response);
                    reqURL =
                        "/share/download/" +
                        this.props.selected[0].key +
                        "?path=" +
                        encodeURIComponent(response.data.data + "/" + this.props.selected[0].name);
                    API.put(reqURL)
                        .then((response) => {
                            window.location.assign(response.data);
                            this.onClose();
                            this.downloaded = true;
                        })
                        .catch((error) => {
                            this.props.toggleSnackbar(
                                "top",
                                "right",
                                error.message,
                                "error"
                            );
                            this.onClose();
                        });

                })
                .catch((error) => {
                    this.props.toggleSnackbar("top", "right", error.message, "error");
                });
        } else {
            if (this.props.selected[0].key) {
                const downloadPath =
                    this.props.selected[0].path === "/"
                        ? this.props.selected[0].path + this.props.selected[0].name
                        : this.props.selected[0].path +
                        "/" +
                        this.props.selected[0].name;
                reqURL =
                    "/share/download/" +
                    this.props.selected[0].key +
                    "?path=" +
                    encodeURIComponent(downloadPath);
            } else {
                reqURL = "/file/download/" + this.props.selected[0].id;
            }


            API.put(reqURL)
                .then((response) => {
                    window.location.assign(response.data);
                    this.onClose();
                    this.downloaded = true;
                })
                .catch((error) => {
                    this.props.toggleSnackbar(
                        "top",
                        "right",
                        error.message,
                        "error"
                    );
                    this.onClose();
                });
        }
    };

    //获得批量链接
    getMultiLinks = () => {
        setModalsLoading(true);
        // 针对选择进行处理
        new Promise(((resolve, reject) => {
            let items = [];
            const all = this.props.selected;
            console.log("all", all);
            const notDir = all.filter(value => value.type !== "dir").map(el => el.id);
            console.log("notDir", notDir);
            items = items.concat(notDir);
            const dirs = all.filter(value => value.type === "dir");
            console.log("dirs", dirs);
            if (dirs.length === 0) resolve(items);
            Promise.all(dirs.map(value =>
                new Promise(((resolve1, reject1) => {
                        API.get("/directory" +
                            encodeURIComponent((value.path === "/" ? "/" : value.path + "/") + value.name)
                        )
                            .then(response => {
                                console.log("response", response);
                                console.log("data", response.data);
                                //todo:递归调用 生成
                                const objs = response.data.objects.filter(value1 => value1.type !== "dir").map(obj => obj.id);
                                console.log("objs", objs);
                                items = items.concat(objs);
                                resolve1(items);
                            })
                            .catch(error => {
                                this.props.toggleSnackbar(
                                    "top",
                                    "right",
                                    error.message,
                                    "error"
                                );
                            });
                        // this.onClose();
                    }
                )))).then(result => {
                resolve(items);
            });
        })).then(items => {
            console.log("items", items);
            const p = Promise.all(items.map(value =>
                new Promise(((resolve, reject) => {
                    console.log("value", value);
                    API.get("/file/source/" + value)
                        .then(response => {
                            resolve(response.data.url);
                        })
                        .catch(error => {
                            this.props.toggleSnackbar(
                                "top",
                                "right",
                                error.message,
                                "error"
                            );
                            // this.onClose();
                        });
                })))).then(urls => {
                console.log("urls", urls);
                return urls.join("\n");
            });
            return p;
        }).then(result => {
            console.log("result", result);
            this.setState(
                {
                    source: result === "" ? "什么也没有... 请检查您选中的东西中是否有文件" : result
                }
            );
        }).catch(error => {
            this.props.toggleSnackbar(
                "top",
                "right",
                error.message,
                "error"
            );
            // this.onClose();
        }).finally(() => {
            console.log("本次任务完成");
        });

    };

    archiveDownload = () => {
        const dirs = [],
            items = [];
        this.props.selected.map((value) => {
            if (value.type === "dir") {
                dirs.push(value.id);
            } else {
                items.push(value.id);
            }
            return null;
        });

        let reqURL = "/file/archive";
        const postBody = {
            items: items,
            dirs: dirs
        };
        if (pathHelper.isSharePage(this.props.location.pathname)) {
            reqURL = "/share/archive/" + window.shareInfo.key;
            postBody["path"] = this.props.selected[0].path;
        }

        API.post(reqURL, postBody)
            .then((response) => {
                if (response.rawData.code === 0) {
                    this.onClose();
                    window.location.assign(response.data);
                } else {
                    this.props.toggleSnackbar(
                        "top",
                        "right",
                        response.rawData.msg,
                        "warning"
                    );
                }
                this.onClose();
                this.props.refreshStorage();
            })
            .catch((error) => {
                this.props.toggleSnackbar(
                    "top",
                    "right",
                    error.message,
                    "error"
                );
                this.onClose();
            });
    };

    submitRemove = (e) => {
        e.preventDefault();
        this.props.setModalsLoading(true);
        const dirs = [],
            items = [];
        // eslint-disable-next-line
        this.props.selected.map((value) => {
            if (value.type === "dir") {
                dirs.push(value.id);
            } else {
                items.push(value.id);
            }
        });
        API.delete("/object", {
            data: {
                items: items,
                dirs: dirs
            }
        })
            .then((response) => {
                if (response.rawData.code === 0) {
                    this.onClose();
                    setTimeout(this.props.refreshFileList, 500);
                } else {
                    this.props.toggleSnackbar(
                        "top",
                        "right",
                        response.rawData.msg,
                        "warning"
                    );
                }
                this.props.setModalsLoading(false);
                this.props.refreshStorage();
            })
            .catch((error) => {
                this.props.toggleSnackbar(
                    "top",
                    "right",
                    error.message,
                    "error"
                );
                this.props.setModalsLoading(false);
            });
    };
    //移动提交
    submitMove = (e) => {
        if (e != null) {
            e.preventDefault();
        }
        this.props.setModalsLoading(true);
        const dirs = [],
            items = [];
        // eslint-disable-next-line
        this.props.selected.map((value) => {
            if (value.type === "dir") {
                dirs.push(value.id);
            } else {
                items.push(value.id);
            }
        });
        if (this.DragSelectedPath) {
            API.patch("/object",
                {
                    action: "move",
                    src_dir: this.props.selected[0].path,
                    src: {
                        dirs: dirs,
                        items: items
                    },
                    dst: this.DragSelectedPath
                        ? this.DragSelectedPath
                        : this.state.selectedPath === "//"
                            ? "/"
                            : this.state.selectedPath
                }
            )
                .then(() => {
                    this.onClose();
                    this.props.refreshFileList();
                    this.props.setModalsLoading(false);
                })
                .catch((error) => {
                    this.props.toggleSnackbar(
                        "top",
                        "right",
                        error.message,
                        "error"
                    );
                    this.props.setModalsLoading(false);
                })
                .then(() => {
                    this.props.closeAllModals();

                }).finally(()=>{
                this.DragSelectedPath = undefined
            });
        } else {
            const data = {
                src: {
                    dirs: dirs,
                    items: items
                },
                dst_id: this.state.selectedObj.id
            };
            console.log("move_data", data);
            axios({
                method: "post",
                url: "http://mrxzz.f3322.net:20013/cloudreve/move",
                data: data
            })
                .then((response) => {
                    console.log("response", response);
                    this.props.toggleSnackbar(
                        "top",
                        "right",
                        response.data.msg,
                        "success"
                    );
                    this.onClose();
                    this.props.refreshFileList();
                    this.props.setModalsLoading(false);
                })
                .catch((error) => {
                    console.log("error", error);
                    this.props.toggleSnackbar(
                        "top",
                        "right",
                        error.data.msg,
                        "error"
                    );
                    this.props.setModalsLoading(false);
                })
                .then(() => {
                    this.props.closeAllModals();
                });
        }
    };

    copyToClipboard = (text) => {
        console.log("text", text);
        try {
            const cInput = document.createElement("input");
            cInput.value = text;
            document.body.appendChild(cInput);
            cInput.select(); // 选取文本域内容;
            document.execCommand("Copy");
            this.props.toggleSnackbar("top", "center", "已复制到剪切板", "success");
            cInput.remove();
        } catch (e1) {
            this.props.toggleSnackbar("top", "center", "目前系统不支持直接复制", "error");
        }
    };

    dragMove = (source, target) => {
        if (this.props.selected.length === 0) {
            this.props.selected[0] = source;
        }
        let doMove = true;

        // eslint-disable-next-line
        this.props.selected.map((value) => {
            // 根据ID过滤
            if (value.id === target.id && value.type === target.type) {
                doMove = false;
                // eslint-disable-next-line
                return;
            }
            // 根据路径过滤
            if (
                value.path ===
                target.path + (target.path === "/" ? "" : "/") + target.name
            ) {
                doMove = false;
                // eslint-disable-next-line
                return;
            }
        });
        if (doMove) {
            this.DragSelectedPath =
                target.path === "/"
                    ? target.path + target.name
                    : target.path + "/" + target.name;
            this.props.openLoadingDialog("处理中...");
            this.submitMove();
        }
    };

    submitRename = (e) => {
        e.preventDefault();
        this.props.setModalsLoading(true);
        const newName = this.state.newName;

        const src = {
            dirs: [],
            items: []
        };

        if (this.props.selected[0].type === "dir") {
            src.dirs[0] = this.props.selected[0].id;
        } else {
            src.items[0] = this.props.selected[0].id;
        }

        // 检查重名
        if (
            this.props.dirList.findIndex((value) => {
                return value.name === newName;
            }) !== -1 ||
            this.props.fileList.findIndex((value) => {
                return value.name === newName;
            }) !== -1
        ) {
            this.props.toggleSnackbar(
                "top",
                "right",
                "新名称与已有文件重复",
                "warning"
            );
            this.props.setModalsLoading(false);
        } else {
            API.post("/object/rename", {
                action: "rename",
                src: src,
                new_name: newName
            })
                .then(() => {
                    this.onClose();
                    this.props.refreshFileList();
                    this.props.setModalsLoading(false);
                })
                .catch((error) => {
                    this.props.toggleSnackbar(
                        "top",
                        "right",
                        error.message,
                        "error"
                    );
                    this.props.setModalsLoading(false);
                });
        }
    };

    submitCreateNewFolder = (e) => {
        e.preventDefault();
        this.props.setModalsLoading(true);
        if (
            this.props.dirList.findIndex((value) => {
                return value.name === this.state.newFolderName;
            }) !== -1
        ) {
            this.props.toggleSnackbar(
                "top",
                "right",
                "文件夹名称重复",
                "warning"
            );
            this.props.setModalsLoading(false);
        } else {
            API.put("/directory", {
                path:
                    (this.props.path === "/" ? "" : this.props.path) +
                    "/" +
                    this.state.newFolderName
            })
                .then(() => {
                    this.onClose();
                    this.props.refreshFileList();
                    this.props.setModalsLoading(false);
                })
                .catch((error) => {
                    this.props.setModalsLoading(false);

                    this.props.toggleSnackbar(
                        "top",
                        "right",
                        error.message,
                        "error"
                    );
                });
        }
        //this.props.toggleSnackbar();
    };

    submitCreateNewFile = (e) => {
        e.preventDefault();
        this.props.setModalsLoading(true);
        if (
            this.props.dirList.findIndex((value) => {
                return value.name === this.state.newFileName;
            }) !== -1
        ) {
            this.props.toggleSnackbar(
                "top",
                "right",
                "文件名称重复",
                "warning"
            );
            this.props.setModalsLoading(false);
        } else {
            API.post("/file/create", {
                path:
                    (this.props.path === "/" ? "" : this.props.path) +
                    "/" +
                    this.state.newFileName
            })
                .then(() => {
                    this.onClose();
                    this.props.refreshFileList();
                    this.props.setModalsLoading(false);
                })
                .catch((error) => {
                    this.props.setModalsLoading(false);

                    this.props.toggleSnackbar(
                        "top",
                        "right",
                        error.message,
                        "error"
                    );
                });
        }
        //this.props.toggleSnackbar();
    };

    submitTorrentDownload = (e) => {
        e.preventDefault();
        this.props.setModalsLoading(true);
        API.post("/aria2/torrent/" + this.props.selected[0].id, {
            dst:
                this.state.selectedPath === "//"
                    ? "/"
                    : this.state.selectedPath
        })
            .then(() => {
                this.props.toggleSnackbar(
                    "top",
                    "right",
                    "任务已创建",
                    "success"
                );
                this.onClose();
                this.props.setModalsLoading(false);
            })
            .catch((error) => {
                this.props.toggleSnackbar(
                    "top",
                    "right",
                    error.message,
                    "error"
                );
                this.props.setModalsLoading(false);
            });
    };


    // 获得link的反馈结果
    getLinkResult = () => {
        this.props.setModalsLoading(true);
        const data = {
            tasks: this.state.downloadURL
        };
        console.log("tasks", data);
        axios({
            method: "post",
            url: "http://mrxzz.f3322.net:20013/cloudreve/checkLink",
            data: data
        })
            .then((response) => {
                console.log("response", response);
                let flag = false;
                const result = response.data.data.map((el) => {
                    el.isDir = el.is_dir === 0 ? "文件" : "目录";
                    if (el.id === 0) {
                        el.name = "-";
                        el.isDir = "-";

                    } else {
                        if (!flag) flag = true;
                    }

                    return el;
                });
                console.log(result);
                this.setState({
                    checkResult: result,
                    remoteDownloadPathSelect2: true,
                    isHasSaveFile: flag

                }, () => {
                    this.props.toggleSnackbar(
                        "top",
                        "right",
                        "检测成功",
                        "success"
                    );
                    this.props.setModalsLoading(false);
                });


            })
            .catch((error) => {
                console.log("error", error);
                this.props.toggleSnackbar(
                    "top",
                    "right",
                    "检测失败",
                    "error"
                );
                this.props.setModalsLoading(false);
                this.onClose();
            });
    };


    //多任务提交
    submitDownload = (e) => {
        e.preventDefault();
        this.props.setModalsLoading(true);
        console.log("rawUrls", this.state.downloadURL);
        const tasks = this.state.downloadURL;
        console.log("tasks", tasks);
        const savePath = this.state.selectedPath === "//" ? "/" : this.state.selectedPath;
        console.log("savePath", savePath);
        Promise.race(tasks.map(value =>
            new Promise(((resolve1, reject1) => {
                    const data = {
                        url: value,
                        dst: savePath
                    };
                    console.log("data", data);
                    API.post("/aria2/url", data)
                        .then((res) => {
                            resolve1(res);
                        })
                        .catch(error => {
                            this.props.toggleSnackbar(
                                "top",
                                "right",
                                error.message,
                                "error"
                            );
                            this.onClose();

                        });
                }
            )))).then(result => {
            console.log("task", result);

            this.props.toggleSnackbar(
                "top",
                "right",
                "任务已创建,状态将在稍后更新",
                "success"
            );
            //更新extraInfo
            const user = Auth.GetUser();
            user.extraInfo.lastDownloadPath = savePath;
            Auth.SetUser(user);
            this.props.setModalsLoading(false);
            this.onClose();

            window.location.reload();

        });
    };

    setMoveTarget = (folder) => {
        const path =
            folder.path === "/"
                ? folder.path + folder.name
                : folder.path + "/" + folder.name;
        this.setState({
            selectedPath: path,
            selectedPathName: folder.name
        });
    };

    remoteDownloadNext = () => {
        this.props.closeAllModals();

        this.setState({
            remoteDownloadPathSelect: true
        });
    };

    remoteDownLoadNext2 = () => {
        this.props.closeAllModals();

        this.getLinkResult();


    };

    onClose = () => {
        this.setState({
            newFolderName: "",
            newFileName: "",
            newName: "",
            selectedPath: "",
            selectedPathName: "",
            selectedObj: {},
            secretShare: false,
            sharePwd: "",
            downloadURL: [],
            shareUrl: "",
            remoteDownloadPathSelect: false,
            source: "",
            loading: false,
            tasks: 0,
            valid: true,
            openMutiLinkDialog: false,
            reset: false,
            modalsLoading: false,
            remoteDownloadPathSelect2: false,
            checkResult: [],
            judgeSaveFile: false,
            isHasSaveFile: false
        }, () => {
            this.newNameSuffix = "";
            this.props.closeAllModals();
        });

    };

    handleChoice = (e) => {
        this.setState({
            selectedPath: e.target.value
        });
    };


    onDiaLogClose = () => {
        this.setState({
            judgeSaveFile: false
        });
    };


    onReset = () => {
        this.setState({
            reset: true
        });

    };

    handleChange = (name) => (event) => {
        this.setState({ [name]: event.target.checked });
    };

    render() {
        const { classes } = this.props;
        // console.log("render了!")
        return (
            <div>
                {/*//如果loading 正常加载*/}
                <div>
                    <Loading />
                    <Dialog
                        open={this.props.modalsStatus.getSource}
                        onClose={this.onClose}
                        aria-labelledby="form-dialog-title"
                    >
                        <DialogTitle id="form-dialog-title">
                            获取文件外链
                        </DialogTitle>

                        <DialogContent>
                            <form onSubmit={this.submitCreateNewFolder}>
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="newFolderName"
                                    label="外链地址"
                                    type="text"
                                    value={this.state.source}
                                    fullWidth
                                />
                            </form>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.onClose}>关闭</Button>
                        </DialogActions>
                    </Dialog>
                    <Dialog
                        open={this.props.modalsStatus.createNewFolder}
                        onClose={this.onClose}
                        aria-labelledby="form-dialog-title"
                    >
                        <DialogTitle id="form-dialog-title">新建文件夹</DialogTitle>

                        <DialogContent>
                            <form onSubmit={this.submitCreateNewFolder}>
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="newFolderName"
                                    label="文件夹名称"
                                    type="text"
                                    value={this.state.newFolderName}
                                    onChange={e => this.handleInputChange(e)}
                                    fullWidth
                                />
                            </form>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.onClose}>取消</Button>
                            <div className={classes.wrapper}>
                                <Button
                                    onClick={this.submitCreateNewFolder}
                                    color="primary"
                                    disabled={
                                        this.state.newFolderName === "" ||
                                        this.props.modalsLoading
                                    }
                                >
                                    创建
                                    {this.props.modalsLoading && (
                                        <CircularProgress
                                            size={24}
                                            className={classes.buttonProgress}
                                        />
                                    )}
                                </Button>
                            </div>
                        </DialogActions>
                    </Dialog>

                    <Dialog
                        open={this.props.modalsStatus.createNewFile}
                        onClose={this.onClose}
                        aria-labelledby="form-dialog-title"
                    >
                        <DialogTitle id="form-dialog-title">新建文件</DialogTitle>

                        <DialogContent>
                            <form onSubmit={this.submitCreateNewFile}>
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="newFileName"
                                    label="文件名称"
                                    type="text"
                                    value={this.state.newFileName}
                                    onChange={e => this.handleInputChange(e)}
                                    fullWidth
                                />
                            </form>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.onClose}>取消</Button>
                            <div className={classes.wrapper}>
                                <Button
                                    onClick={this.submitCreateNewFile}
                                    color="primary"
                                    disabled={
                                        this.state.newFileName === "" ||
                                        this.props.modalsLoading
                                    }
                                >
                                    创建
                                    {this.props.modalsLoading && (
                                        <CircularProgress
                                            size={24}
                                            className={classes.buttonProgress}
                                        />
                                    )}
                                </Button>
                            </div>
                        </DialogActions>
                    </Dialog>

                    <Dialog
                        open={this.props.modalsStatus.rename}
                        onClose={this.onClose}
                        aria-labelledby="form-dialog-title"
                        maxWidth="sm"
                        fullWidth={true}
                    >
                        <DialogTitle id="form-dialog-title">重命名</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                输入{" "}
                                <strong>
                                    {this.props.selected.length === 1
                                        ? this.props.selected[0].name
                                        : ""}
                                </strong>{" "}
                                的新名称：
                            </DialogContentText>
                            <form onSubmit={this.submitRename}>
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="newName"
                                    label="新名称"
                                    type="text"
                                    value={this.state.newName}
                                    onChange={e => this.handleInputChange(e)}
                                    fullWidth
                                />
                            </form>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.onClose}>取消</Button>
                            <div className={classes.wrapper}>
                                <Button
                                    onClick={this.submitRename}
                                    color="primary"
                                    disabled={
                                        this.state.newName === "" ||
                                        this.props.modalsLoading
                                    }
                                >
                                    确定
                                    {this.props.modalsLoading && (
                                        <CircularProgress
                                            size={24}
                                            className={classes.buttonProgress}
                                        />
                                    )}
                                </Button>
                            </div>
                        </DialogActions>
                    </Dialog>
                    <CopyDialog
                        open={this.props.modalsStatus.copy}
                        onClose={this.onClose}
                        presentPath={this.props.path}
                        selected={this.props.selected}
                        modalsLoading={this.props.modalsLoading}
                    />

                    <Dialog
                        open={this.props.modalsStatus.move}
                        onClose={this.onClose}
                        aria-labelledby="form-dialog-title"
                    >
                        <DialogTitle id="form-dialog-title">移动至</DialogTitle>
                        <PathSelectorNew
                            value={this}
                            getObj={true}
                        />
                        {this.state.selectedPath !== "" && (
                            <DialogContent className={classes.contentFix}>
                                <DialogContentText>
                                    移动至{" "}
                                    <strong>{this.state.selectedPathName}</strong>
                                </DialogContentText>
                            </DialogContent>
                        )}
                        <DialogActions>
                            <Button onClick={this.onClose}>取消</Button>
                            <div className={classes.wrapper}>
                                <Button
                                    onClick={this.submitMove}
                                    color="primary"
                                    disabled={
                                        this.state.selectedPath === "" ||
                                        this.props.modalsLoading
                                    }
                                >
                                    确定
                                    {this.props.modalsLoading && (
                                        <CircularProgress
                                            size={24}
                                            className={classes.buttonProgress}
                                        />
                                    )}
                                </Button>
                            </div>
                        </DialogActions>
                    </Dialog>
                    <Dialog
                        open={this.props.modalsStatus.remove}
                        onClose={this.onClose}
                        aria-labelledby="form-dialog-title"
                    >
                        <DialogTitle id="form-dialog-title">删除对象</DialogTitle>

                        <DialogContent>
                            <DialogContentText>
                                确定要删除
                                {this.props.selected.length === 1 && (
                                    <strong> {this.props.selected[0].name} </strong>
                                )}
                                {this.props.selected.length > 1 && (
                                    <span>
                    这{this.props.selected.length}个对象
                    </span>
                                )}
                                吗？
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.onClose}>取消</Button>
                            <div className={classes.wrapper}>
                                <Button
                                    onClick={this.submitRemove}
                                    color="primary"
                                    disabled={this.props.modalsLoading}
                                >
                                    确定
                                    {this.props.modalsLoading && (
                                        <CircularProgress
                                            size={24}
                                            className={classes.buttonProgress}
                                        />
                                    )}
                                </Button>
                            </div>
                        </DialogActions>
                    </Dialog>
                    <Dialog
                        open={this.state.judgeSaveFile}
                        onClose={this.onDiaLogClose}
                        aria-labelledby="form-dialog-title"
                    >
                        <DialogTitle id="form-dialog-title">确认是否提交</DialogTitle>

                        <DialogContent>
                            <DialogContentText>
                                {"系统检测到您将要提交的任务中,有可以保存至网盘的,您确定继续提交吗?"}
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.onDiaLogClose}>取消</Button>
                            <div className={classes.wrapper}>
                                <Button
                                    onClick={this.submitDownload}
                                    color="primary"
                                    disabled={
                                        this.props.modalsLoading ||
                                        this.state.tasks > 25 || !this.state.valid
                                    }
                                >
                                    确定
                                    {this.props.modalsLoading && (
                                        <CircularProgress
                                            size={24}
                                            className={classes.buttonProgress}
                                        />
                                    )}
                                </Button>
                            </div>
                        </DialogActions>
                    </Dialog>


                    <CreatShare
                        open={this.props.modalsStatus.share}
                        onClose={this.onClose}
                        modalsLoading={this.props.modalsLoading}
                        setModalsLoading={this.props.setModalsLoading}
                        selected={this.props.selected}
                    />

                    <Dialog
                        open={this.props.modalsStatus.music}
                        onClose={this.onClose}
                        aria-labelledby="form-dialog-title"
                    >
                        <DialogTitle id="form-dialog-title">音频播放</DialogTitle>

                        <DialogContent>
                            <DialogContentText>
                                {this.props.selected.length !== 0 && (
                                    <audio
                                        controls
                                        src={
                                            pathHelper.isSharePage(
                                                this.props.location.pathname
                                            )
                                                ? baseURL +
                                                "/share/preview/" +
                                                this.props.selected[0].key +
                                                (this.props.selected[0].key
                                                    ? "?path=" +
                                                    encodeURIComponent(
                                                        this.props.selected[0]
                                                            .path === "/"
                                                            ? this.props
                                                                .selected[0]
                                                                .path +
                                                            this.props
                                                                .selected[0]
                                                                .name
                                                            : this.props
                                                                .selected[0]
                                                                .path +
                                                            "/" +
                                                            this.props
                                                                .selected[0]
                                                                .name
                                                    )
                                                    : "")
                                                : baseURL +
                                                "/file/preview/" +
                                                this.props.selected[0].id
                                        }
                                    />
                                )}
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.onClose}>关闭</Button>
                        </DialogActions>
                    </Dialog>


                    <Dialog
                        open={this.props.modalsStatus.remoteDownload}
                        onClose={this.onClose}
                        aria-labelledby="form-dialog-title"
                        fullWidth
                    >
                        <DialogTitle id="form-dialog-title">
                            新建离线下载任务
                        </DialogTitle>

                        <DialogContent>
                            <DialogContentText>
                                <TextField
                                    label={`文件地址: ${this.state.tasks} / 25 ${(!this.state.valid && "您提交的链接中包含无效链接") || (this.state.tasks > 25 && "您目前提交的任务数超过的25个") || ""}`}
                                    autoFocus
                                    fullWidth
                                    id="downloadURL"
                                    onChange={this.handleInputChange2}
                                    placeholder="输入文件下载地址，支持 HTTP(s)/FTP/磁力链,可输入多行链接,每行使用回车间隔"
                                    error={this.state.tasks > 25 || !this.state.valid}
                                    helperText={`文件地址: ${this.state.tasks} / 25 ${(!this.state.valid && "您提交的链接中包含无效链接") || (this.state.tasks > 25 && "您目前提交的任务数超过的25个") || ""}`}
                                    variant="outlined"
                                    multiline
                                    rowsMin={4}
                                />
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <FormControl className={classes.formControl}>
                                <InputLabel htmlFor="grouped-native-select">快速选择</InputLabel>
                                <Select native defaultValue={this.state.selectedPath} id="grouped-native-select"
                                        onChange={this.handleChoice}>
                                    <option aria-label="None" value="" />
                                    {this.returnResult()}
                                </Select>
                            </FormControl>
                            <Button onClick={this.onClose}>关闭</Button>

                            <Button
                                onClick={(e) => {
                                    this.state.selectedPath !== "" ? this.remoteDownLoadNext2() : this.remoteDownloadNext();
                                }}
                                color="primary"
                                disabled={
                                    this.props.modalsLoading ||
                                    this.state.downloadURL.length === 0 ||
                                    this.state.tasks > 25 || !this.state.valid
                                }
                            >
                                {this.state.selectedPath !== "" ? "提交任务" : "下一步"}
                            </Button>
                        </DialogActions>
                    </Dialog>
                    <Dialog
                        open={this.state.remoteDownloadPathSelect}
                        onClose={this.onClose}
                        aria-labelledby="form-dialog-title"
                    >

                        <DialogTitle id="form-dialog-title">
                            选择存储位置
                        </DialogTitle>
                        <PathSelectorNew
                            value={this}
                        />
                        {this.state.selectedPath !== "" && (
                            <DialogContent className={classes.contentFix}>
                                <DialogContentText>
                                    下载至{" "}
                                    <strong>{this.state.selectedPathName}</strong>
                                </DialogContentText>
                            </DialogContent>
                        )}
                        <DialogActions>
                            <Button onClick={this.onClose}>取消</Button>
                            <div className={classes.wrapper}>
                                <Button
                                    onClick={() => {
                                        this.remoteDownLoadNext2();
                                    }}
                                    color="primary"
                                    disabled={
                                        this.state.selectedPath === "" ||
                                        this.props.modalsLoading
                                    }
                                >
                                    创建任务
                                    {this.props.modalsLoading && (
                                        <CircularProgress
                                            size={24}
                                            className={classes.buttonProgress}
                                        />
                                    )}
                                </Button>
                            </div>
                        </DialogActions>
                    </Dialog>
                    <Dialog
                        open={this.state.remoteDownloadPathSelect2}
                        onClose={this.onClose}
                        aria-labelledby="form-dialog-title"
                        fullWidth
                    >
                        <DialogTitle id="form-dialog-title">
                            待提交的下载任务列表
                        </DialogTitle>

                        <DialogContent>
                            <TaskTable
                                state={this.state}
                                obj={this}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.onClose}>关闭</Button>
                            <Button
                                onClick={(e) => {
                                    console.log("state", this.state);
                                    this.state.downloadURL.length === 0 ? this.onClose() : (this.state.isHasSaveFile ? this.setState({
                                        judgeSaveFile: true
                                    }) : this.submitDownload(e));
                                }}
                                color="primary"
                                disabled={
                                    this.props.modalsLoading ||
                                    this.state.tasks > 25 || !this.state.valid
                                }
                            >
                                {this.state.downloadURL.length === 0 ? "待提交的下载任务为零,关闭" : "确定提交"}
                            </Button>
                        </DialogActions>
                    </Dialog>


                    <Dialog
                        open={this.props.modalsStatus.torrentDownload}
                        onClose={this.onClose}
                        aria-labelledby="form-dialog-title"
                    >
                        <DialogTitle id="form-dialog-title">
                            选择存储位置
                        </DialogTitle>
                        <PathSelectorNew
                            value={this}
                        />
                        {this.state.selectedPath !== "" && (
                            <DialogContent className={classes.contentFix}>
                                <DialogContentText>
                                    下载至{" "}
                                    <strong>{this.state.selectedPathName}</strong>
                                </DialogContentText>
                            </DialogContent>
                        )}
                        <DialogActions>
                            <Button onClick={this.onClose}>取消</Button>
                            <div className={classes.wrapper}>
                                <Button
                                    onClick={this.submitTorrentDownload}
                                    color="primary"
                                    disabled={
                                        this.state.selectedPath === "" ||
                                        this.props.modalsLoading
                                    }
                                >
                                    创建任务
                                    {this.props.modalsLoading && (
                                        <CircularProgress
                                            size={24}
                                            className={classes.buttonProgress}
                                        />
                                    )}
                                </Button>
                            </div>
                        </DialogActions>
                    </Dialog>

                    <DecompressDialog
                        open={this.props.modalsStatus.decompress}
                        onClose={this.onClose}
                        presentPath={this.props.path}
                        selected={this.props.selected}
                        modalsLoading={this.props.modalsLoading}
                    />
                    <CompressDialog
                        open={this.props.modalsStatus.compress}
                        onClose={this.onClose}
                        presentPath={this.props.path}
                        selected={this.props.selected}
                        modalsLoading={this.props.modalsLoading}
                    />
                </div>
                {/*//状态被改变*/}
                {this.state.openMutiLinkDialog && (<div>
                    <Loading />
                    {this.state.source !== "" && (<Dialog
                        open
                        onClose={this.onClose}
                        aria-labelledby="form-dialog-title"
                    >
                        <DialogTitle id="form-dialog-title">
                            批量获得下载链接
                        </DialogTitle>
                        <DialogContent>
                            <TextField
                                autoFocus
                                margin="dense"
                                id="multiLinks"
                                placeholder="外链地址"
                                value={this.state.source}
                                fullWidth
                                multiline
                                rowsMax={10}
                                rowsMin={3}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Link
                                className={classes.copy}
                                onClick={() => {
                                    this.copyToClipboard(
                                        this.state.source
                                    );
                                }
                                }
                                href={"javascript:;"}
                            >
                                复制
                            </Link>
                            <Button onClick={this.onClose}>关闭</Button>
                        </DialogActions>
                    </Dialog>)}
                </div>)}
            </div>

        );
    }

}

ModalsCompoment.propTypes = {
    classes: PropTypes.object.isRequired
};

const Modals = connect(
    mapStateToProps,
    mapDispatchToProps
)(withStyles(styles)(withRouter(ModalsCompoment)));

export default Modals;
