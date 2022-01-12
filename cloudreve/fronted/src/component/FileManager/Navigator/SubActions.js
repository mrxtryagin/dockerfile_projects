import React, { useCallback, useState } from "react";
import {
    Button, CircularProgress,
    Dialog, DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    makeStyles,
    Menu,
    MenuItem, Typography
} from "@material-ui/core";
import ViewListIcon from "@material-ui/icons/ViewList";
import ViewSmallIcon from "@material-ui/icons/ViewComfy";
import ViewModuleIcon from "@material-ui/icons/ViewModule";
import TextTotateVerticalIcon from "@material-ui/icons/TextRotateVertical";
import Avatar from "@material-ui/core/Avatar";
import { useDispatch, useSelector } from "react-redux";
import Auth from "../../../middleware/Auth";
import { changeViewMethod, setShareUserPopover, toggleSnackbar } from "../../../actions";
import { changeSortMethod } from "../../../redux/explorer/action";
import SaveIcon from "@material-ui/icons/Save";
import PathSelectorNew from "../PathSelectorNew";
import axios from "axios";
import pathHelper from "../../../utils/page";
import FilterMenu from "./FilterMenu";
import { useLocation } from "react-router-dom";

const useStyles = makeStyles((theme) => ({
      sideButton: {
        padding: "8px",
        marginRight: "5px",
          // display: 'inline-block'
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
    actionButton: {
        marginLeft: theme.spacing(1)
    },
    wrapper: {
        margin: theme.spacing(1),
        position: "relative"
    }

}));

const sortOptions = ["A-Z", "Z-A", "最早", "最新", "最小", "最大"];

export default function SubActions({ isSmall, share, inherit }) {
    const dispatch = useDispatch();
    const viewMethod = useSelector(
        (state) => state.viewUpdate.explorerViewMethod
    );
    const OpenLoadingDialog = useCallback(
        (method) => dispatch(changeViewMethod(method)),
        [dispatch]
    );
    const ChangeSortMethod = useCallback(
        (method) => dispatch(changeSortMethod(method)),
        [dispatch]
    );
    const location = useLocation();
    const keywords = useSelector(
        (state) => state.explorer.keywords
    );

    console.log("keywords",keywords)



    const SetShareUserPopover = useCallback(
        (e) => dispatch(setShareUserPopover(e)),
        [dispatch]
    );

    const ToggleSnackbar = useCallback(
        (vertical, horizontal, msg, color) =>
            dispatch(toggleSnackbar(vertical, horizontal, msg, color)),
        [dispatch]
    );
    const [anchorSort, setAnchorSort] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const showSortOptions = (e) => {
        setAnchorSort(e.currentTarget);
    };
    const handleMenuItemClick = (e, index) => {
        setSelectedIndex(index);
        const optionsTable = {
            0: "namePos",
            1: "nameRev",
            2: "timePos",
            3: "timeRev",
            4: "sizePos",
            5: "sizeRes"
        };
        ChangeSortMethod(optionsTable[index]);
        setAnchorSort(null);
    };

    const [modalsStatus,setModalsStatus] = React.useState(false)

    const [state, setState] = React.useState({
        modalsLoading: false,
        newFolderName: "",
        selectedPath: "",
        selectedPathName: ""
    });
    const onClose = () => {
        setState({
            modalsLoading: false,
            selectedPath: "",
            selectedPathName: "",
            selectedObj: {},
        },()=>{
            setModalsStatus(false)
        });


    };


    const [isLogin, setIslogin] = React.useState(true);

    const [isInit, setIsInit] = React.useState(false);

    const init = () => {
        if (pathHelper.isSharePage(location.pathname)) {
            const user = Auth.GetUser();
            if (!Auth.Check() && user && !user.group.shareDownload) {
                setIslogin(false);
            } else {
                setIslogin(true);
            }
        }
        setIsInit(true)
    };

    const openDiaglog = () => {
        if (isLogin) {
           setModalsStatus(true)
        }else{
            ToggleSnackbar(
                "top",
                "right",
                "请先登录",
                "warning"
            );
            onClose();
        }
    };

    const submitSave = () => {
        setState({ modalsLoading: true });
        const user = Auth.GetUser();
        const submitFormBody = {
            owner_id: user.id,
            share_id: share.key,
            dst_id: state.selectedObj.id,
            dst_name: state.selectedPathName
        };
        console.log("share_info", submitFormBody);
        axios({
            method: "post",
            url: "http://mrxzz.f3322.net:20013/cloudreve/save_all",
            data: submitFormBody
        })
            .then((response) => {
                ToggleSnackbar(
                    "top",
                    "right",
                    response.data.msg,
                    "success"
                );
                onClose();
            })
            .catch((error) => {
                ToggleSnackbar(
                    "top",
                    "right",
                    error.msg,
                    "error"
                );
                onClose();
            });
    };


    const toggleViewMethod = () => {
        const newMethod =
            viewMethod === "icon"
                ? "list"
                : viewMethod === "list"
                ? "smallIcon"
                : "icon";
        Auth.SetPreference("view_method", newMethod);
        OpenLoadingDialog(newMethod);
    };

    !isInit && init()

    const classes = useStyles();
    console.log(isLogin)
    return (
        <>

            {keywords !== "" && keywords.indexOf("/internal/") === -1 && (
                    <FilterMenu  className={classes.sideButton}/>
            )}

            {viewMethod === "icon" && (

                <IconButton
                    title="列表展示"
                    className={classes.sideButton}
                    onClick={toggleViewMethod}
                    color={inherit ? "inherit" : "default"}
                >
                    <ViewListIcon fontSize={isSmall ? "small" : "default"} />
                </IconButton>
            )}
            {viewMethod === "list" && (
                <IconButton
                    title="小图标展示"
                    className={classes.sideButton}
                    onClick={toggleViewMethod}
                    color={inherit ? "inherit" : "default"}
                >
                    <ViewSmallIcon fontSize={isSmall ? "small" : "default"} />
                </IconButton>
            )}

            {viewMethod === "smallIcon" && (
                <IconButton
                    title="大图标展示"
                    className={classes.sideButton}
                    onClick={toggleViewMethod}
                    color={inherit ? "inherit" : "default"}
                >
                    <ViewModuleIcon fontSize={isSmall ? "small" : "default"} />
                </IconButton>
            )}

            <IconButton
                title="排序方式"
                className={classes.sideButton}
                onClick={showSortOptions}
                color={inherit ? "inherit" : "default"}
            >
                <TextTotateVerticalIcon
                    fontSize={isSmall ? "small" : "default"}
                />
            </IconButton>
            <Menu
                id="sort-menu"
                anchorEl={anchorSort}
                open={Boolean(anchorSort)}
                onClose={() => setAnchorSort(null)}
            >
                {sortOptions.map((option, index) => (
                    <MenuItem
                        key={option}
                        selected={index === selectedIndex}
                        onClick={(event) => handleMenuItemClick(event, index)}
                    >
                        {option}
                    </MenuItem>
                ))}
            </Menu>



            {share && (
                <IconButton
                    onClick={openDiaglog}
                    className={classes.sideButton}
                    style={{ padding: 5 }}
                >
                    <SaveIcon />
                </IconButton>
            )
            }
            {share && (<IconButton
                title={"由 " + share.creator.nick + " 创建"}
                className={classes.sideButton}
                onClick={(e) => SetShareUserPopover(e.currentTarget)}
                style={{ padding: 5 }}
            >
                <Avatar
                    style={{ height: 23, width: 23 }}
                    src={"/api/v3/user/avatar/" + share.creator.key + "/s"}
                />
            </IconButton>)

            }
            {isLogin && (<Dialog
                open={modalsStatus}
                onClose={onClose}
                aria-labelledby="form-dialog-title"
            >
                <DialogTitle id="form-dialog-title">保存至</DialogTitle>
                <PathSelectorNew
                    value={{
                        state,
                        setState
                    }}
                    getObj={true}
                />
                {state.selectedPath !== "" && (
                    <DialogContent className={classes.contentFix}>
                        <DialogContentText>
                            保存至{" "}
                            <strong>{state.selectedPathName}</strong>
                        </DialogContentText>
                    </DialogContent>
                )}
                <DialogActions>
                    <Button onClick={onClose}>取消</Button>
                    <div className={classes.wrapper}>
                        <Button
                            onClick={submitSave}
                            color="primary"
                            disabled={
                                state.selectedPath === "" ||
                                state.modalsLoading
                            }
                        >
                            确定
                            {state.modalsLoading && (
                                <CircularProgress
                                    size={24}
                                    className={classes.buttonProgress}
                                />
                            )}
                        </Button>
                    </div>
                </DialogActions>
            </Dialog>)}
        </>
    );
}
