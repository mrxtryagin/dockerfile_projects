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
        // ?????????????????? ??? ????????????
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


    //?????????
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


    // ????????????????????????
    //??????????????????aria2??????????????? todo:ed2k?????????
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
            // ????????????
            if (nextProps.loading === true) {
                if (nextProps.loadingText === "?????????...") {
                    if (
                        pathHelper.isSharePage(this.props.location.pathname) &&
                        this.props.share &&
                        this.props.share.score > 0
                    ) {
                        this.scoreHandler(this.archiveDownload);
                        return;
                    }
                    this.archiveDownload();
                } else if (nextProps.loadingText === "??????????????????...") {
                    if (
                        pathHelper.isSharePage(this.props.location.pathname) &&
                        this.props.share &&
                        this.props.share.score > 0
                    ) {
                        this.scoreHandler(this.Download);
                        return;
                    }
                    this.Download();

                } else if (nextProps.loadingText === "???????????????...") {
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
        //????????????
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

    //??????????????????
    getMultiLinks = () => {
        setModalsLoading(true);
        // ????????????????????????
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
                                //todo:???????????? ??????
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
                    source: result === "" ? "???????????????... ?????????????????????????????????????????????" : result
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
            console.log("??????????????????");
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
    //????????????
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
            cInput.select(); // ?????????????????????;
            document.execCommand("Copy");
            this.props.toggleSnackbar("top", "center", "?????????????????????", "success");
            cInput.remove();
        } catch (e1) {
            this.props.toggleSnackbar("top", "center", "?????????????????????????????????", "error");
        }
    };

    dragMove = (source, target) => {
        if (this.props.selected.length === 0) {
            this.props.selected[0] = source;
        }
        let doMove = true;

        // eslint-disable-next-line
        this.props.selected.map((value) => {
            // ??????ID??????
            if (value.id === target.id && value.type === target.type) {
                doMove = false;
                // eslint-disable-next-line
                return;
            }
            // ??????????????????
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
            this.props.openLoadingDialog("?????????...");
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

        // ????????????
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
                "??????????????????????????????",
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
                "?????????????????????",
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
                "??????????????????",
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
                    "???????????????",
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


    // ??????link???????????????
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
                    el.isDir = el.is_dir === 0 ? "??????" : "??????";
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
                        "????????????",
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
                    "????????????",
                    "error"
                );
                this.props.setModalsLoading(false);
                this.onClose();
            });
    };


    //???????????????
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
                "???????????????,????????????????????????",
                "success"
            );
            //??????extraInfo
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
        // console.log("render???!")
        return (
            <div>
                {/*//??????loading ????????????*/}
                <div>
                    <Loading />
                    <Dialog
                        open={this.props.modalsStatus.getSource}
                        onClose={this.onClose}
                        aria-labelledby="form-dialog-title"
                    >
                        <DialogTitle id="form-dialog-title">
                            ??????????????????
                        </DialogTitle>

                        <DialogContent>
                            <form onSubmit={this.submitCreateNewFolder}>
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="newFolderName"
                                    label="????????????"
                                    type="text"
                                    value={this.state.source}
                                    fullWidth
                                />
                            </form>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.onClose}>??????</Button>
                        </DialogActions>
                    </Dialog>
                    <Dialog
                        open={this.props.modalsStatus.createNewFolder}
                        onClose={this.onClose}
                        aria-labelledby="form-dialog-title"
                    >
                        <DialogTitle id="form-dialog-title">???????????????</DialogTitle>

                        <DialogContent>
                            <form onSubmit={this.submitCreateNewFolder}>
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="newFolderName"
                                    label="???????????????"
                                    type="text"
                                    value={this.state.newFolderName}
                                    onChange={e => this.handleInputChange(e)}
                                    fullWidth
                                />
                            </form>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.onClose}>??????</Button>
                            <div className={classes.wrapper}>
                                <Button
                                    onClick={this.submitCreateNewFolder}
                                    color="primary"
                                    disabled={
                                        this.state.newFolderName === "" ||
                                        this.props.modalsLoading
                                    }
                                >
                                    ??????
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
                        <DialogTitle id="form-dialog-title">????????????</DialogTitle>

                        <DialogContent>
                            <form onSubmit={this.submitCreateNewFile}>
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="newFileName"
                                    label="????????????"
                                    type="text"
                                    value={this.state.newFileName}
                                    onChange={e => this.handleInputChange(e)}
                                    fullWidth
                                />
                            </form>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.onClose}>??????</Button>
                            <div className={classes.wrapper}>
                                <Button
                                    onClick={this.submitCreateNewFile}
                                    color="primary"
                                    disabled={
                                        this.state.newFileName === "" ||
                                        this.props.modalsLoading
                                    }
                                >
                                    ??????
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
                        <DialogTitle id="form-dialog-title">?????????</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                ??????{" "}
                                <strong>
                                    {this.props.selected.length === 1
                                        ? this.props.selected[0].name
                                        : ""}
                                </strong>{" "}
                                ???????????????
                            </DialogContentText>
                            <form onSubmit={this.submitRename}>
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="newName"
                                    label="?????????"
                                    type="text"
                                    value={this.state.newName}
                                    onChange={e => this.handleInputChange(e)}
                                    fullWidth
                                />
                            </form>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.onClose}>??????</Button>
                            <div className={classes.wrapper}>
                                <Button
                                    onClick={this.submitRename}
                                    color="primary"
                                    disabled={
                                        this.state.newName === "" ||
                                        this.props.modalsLoading
                                    }
                                >
                                    ??????
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
                        <DialogTitle id="form-dialog-title">?????????</DialogTitle>
                        <PathSelectorNew
                            value={this}
                            getObj={true}
                        />
                        {this.state.selectedPath !== "" && (
                            <DialogContent className={classes.contentFix}>
                                <DialogContentText>
                                    ?????????{" "}
                                    <strong>{this.state.selectedPathName}</strong>
                                </DialogContentText>
                            </DialogContent>
                        )}
                        <DialogActions>
                            <Button onClick={this.onClose}>??????</Button>
                            <div className={classes.wrapper}>
                                <Button
                                    onClick={this.submitMove}
                                    color="primary"
                                    disabled={
                                        this.state.selectedPath === "" ||
                                        this.props.modalsLoading
                                    }
                                >
                                    ??????
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
                        <DialogTitle id="form-dialog-title">????????????</DialogTitle>

                        <DialogContent>
                            <DialogContentText>
                                ???????????????
                                {this.props.selected.length === 1 && (
                                    <strong> {this.props.selected[0].name} </strong>
                                )}
                                {this.props.selected.length > 1 && (
                                    <span>
                    ???{this.props.selected.length}?????????
                    </span>
                                )}
                                ??????
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.onClose}>??????</Button>
                            <div className={classes.wrapper}>
                                <Button
                                    onClick={this.submitRemove}
                                    color="primary"
                                    disabled={this.props.modalsLoading}
                                >
                                    ??????
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
                        <DialogTitle id="form-dialog-title">??????????????????</DialogTitle>

                        <DialogContent>
                            <DialogContentText>
                                {"??????????????????????????????????????????,???????????????????????????,?????????????????????????"}
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.onDiaLogClose}>??????</Button>
                            <div className={classes.wrapper}>
                                <Button
                                    onClick={this.submitDownload}
                                    color="primary"
                                    disabled={
                                        this.props.modalsLoading ||
                                        this.state.tasks > 25 || !this.state.valid
                                    }
                                >
                                    ??????
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
                        <DialogTitle id="form-dialog-title">????????????</DialogTitle>

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
                            <Button onClick={this.onClose}>??????</Button>
                        </DialogActions>
                    </Dialog>


                    <Dialog
                        open={this.props.modalsStatus.remoteDownload}
                        onClose={this.onClose}
                        aria-labelledby="form-dialog-title"
                        fullWidth
                    >
                        <DialogTitle id="form-dialog-title">
                            ????????????????????????
                        </DialogTitle>

                        <DialogContent>
                            <DialogContentText>
                                <TextField
                                    label={`????????????: ${this.state.tasks} / 25 ${(!this.state.valid && "???????????????????????????????????????") || (this.state.tasks > 25 && "????????????????????????????????????25???") || ""}`}
                                    autoFocus
                                    fullWidth
                                    id="downloadURL"
                                    onChange={this.handleInputChange2}
                                    placeholder="????????????????????????????????? HTTP(s)/FTP/?????????,?????????????????????,????????????????????????"
                                    error={this.state.tasks > 25 || !this.state.valid}
                                    helperText={`????????????: ${this.state.tasks} / 25 ${(!this.state.valid && "???????????????????????????????????????") || (this.state.tasks > 25 && "????????????????????????????????????25???") || ""}`}
                                    variant="outlined"
                                    multiline
                                    rowsMin={4}
                                />
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <FormControl className={classes.formControl}>
                                <InputLabel htmlFor="grouped-native-select">????????????</InputLabel>
                                <Select native defaultValue={this.state.selectedPath} id="grouped-native-select"
                                        onChange={this.handleChoice}>
                                    <option aria-label="None" value="" />
                                    {this.returnResult()}
                                </Select>
                            </FormControl>
                            <Button onClick={this.onClose}>??????</Button>

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
                                {this.state.selectedPath !== "" ? "????????????" : "?????????"}
                            </Button>
                        </DialogActions>
                    </Dialog>
                    <Dialog
                        open={this.state.remoteDownloadPathSelect}
                        onClose={this.onClose}
                        aria-labelledby="form-dialog-title"
                    >

                        <DialogTitle id="form-dialog-title">
                            ??????????????????
                        </DialogTitle>
                        <PathSelectorNew
                            value={this}
                        />
                        {this.state.selectedPath !== "" && (
                            <DialogContent className={classes.contentFix}>
                                <DialogContentText>
                                    ?????????{" "}
                                    <strong>{this.state.selectedPathName}</strong>
                                </DialogContentText>
                            </DialogContent>
                        )}
                        <DialogActions>
                            <Button onClick={this.onClose}>??????</Button>
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
                                    ????????????
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
                            ??????????????????????????????
                        </DialogTitle>

                        <DialogContent>
                            <TaskTable
                                state={this.state}
                                obj={this}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.onClose}>??????</Button>
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
                                {this.state.downloadURL.length === 0 ? "??????????????????????????????,??????" : "????????????"}
                            </Button>
                        </DialogActions>
                    </Dialog>


                    <Dialog
                        open={this.props.modalsStatus.torrentDownload}
                        onClose={this.onClose}
                        aria-labelledby="form-dialog-title"
                    >
                        <DialogTitle id="form-dialog-title">
                            ??????????????????
                        </DialogTitle>
                        <PathSelectorNew
                            value={this}
                        />
                        {this.state.selectedPath !== "" && (
                            <DialogContent className={classes.contentFix}>
                                <DialogContentText>
                                    ?????????{" "}
                                    <strong>{this.state.selectedPathName}</strong>
                                </DialogContentText>
                            </DialogContent>
                        )}
                        <DialogActions>
                            <Button onClick={this.onClose}>??????</Button>
                            <div className={classes.wrapper}>
                                <Button
                                    onClick={this.submitTorrentDownload}
                                    color="primary"
                                    disabled={
                                        this.state.selectedPath === "" ||
                                        this.props.modalsLoading
                                    }
                                >
                                    ????????????
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
                {/*//???????????????*/}
                {this.state.openMutiLinkDialog && (<div>
                    <Loading />
                    {this.state.source !== "" && (<Dialog
                        open
                        onClose={this.onClose}
                        aria-labelledby="form-dialog-title"
                    >
                        <DialogTitle id="form-dialog-title">
                            ????????????????????????
                        </DialogTitle>
                        <DialogContent>
                            <TextField
                                autoFocus
                                margin="dense"
                                id="multiLinks"
                                placeholder="????????????"
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
                                ??????
                            </Link>
                            <Button onClick={this.onClose}>??????</Button>
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
