import React, { useState, useCallback } from "react";
import { makeStyles } from "@material-ui/core";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    DialogContentText,
    CircularProgress
} from "@material-ui/core";
import {
    toggleSnackbar,
    setModalsLoading,
    refreshFileList
} from "../../actions/index";
import PathSelector from "../FileManager/PathSelector";
import { useDispatch } from "react-redux";
import API from "../../middleware/Api";
import PathSelectorNew from "../FileManager/PathSelectorNew";
import Auth from "../../middleware/Auth";
import axios from "axios";

const useStyles = makeStyles((theme) => ({
    contentFix: {
        padding: "10px 24px 0px 24px"
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

export default function CopyDialog(props) {
    const [selectedPath, setSelectedPath] = useState("");
    const [selectedPathName, setSelectedPathName] = useState("");
    const [selectObj, setSelectObj] = useState({});

    const dispatch = useDispatch();
    const ToggleSnackbar = useCallback(
        (vertical, horizontal, msg, color) =>
            dispatch(toggleSnackbar(vertical, horizontal, msg, color)),
        [dispatch]
    );
    const SetModalsLoading = useCallback(
        (status) => {
            dispatch(setModalsLoading(status));
        },
        [dispatch]
    );
    const RefreshFileList = useCallback(() => {
        dispatch(refreshFileList());
    }, [dispatch]);

    const setMoveTarget = (folder) => {
        const path =
            folder.path === "/"
                ? folder.path + folder.name
                : folder.path + "/" + folder.name;
        setSelectedPath(path);
        setSelectedPathName(folder.name);
    };

    const submitMove = (e) => {
        if (e != null) {
            e.preventDefault();
        }
        SetModalsLoading(true);
        const dirs = [],
            items = [];
        // 复制改变
        console.log("props_2", props);
        props.selected.map((value) => {
            if (value.type === "dir") {
                dirs.push(value.id);
            } else {
                items.push(value.id);
            }
        });
        const user = Auth.GetUser();
        const data = {
            src: {
                dirs: dirs,
                items: items
            },
            dst_id: selectObj.id,
            owner_id: user.id
        };
        console.log("copy_data", data);
        axios({
            method: "post",
            url: "http://mrxzz.f3322.net:20013/cloudreve/copy",
            data: data
        })
            .then((response) => {
                ToggleSnackbar("top", "right", response.data.msg, "success");
                props.onClose();
                RefreshFileList();
                SetModalsLoading(false);
            })
            .catch((error) => {
                ToggleSnackbar("top", "right", error.data.msg, "error");
                SetModalsLoading(false);
            });
    };

    const classes = useStyles();

    return (
        <Dialog
            open={props.open}
            onClose={props.onClose}
            aria-labelledby="form-dialog-title"
        >
            <DialogTitle id="form-dialog-title">复制到</DialogTitle>
            <PathSelectorNew
                value={{
                    setSelectedPath: setSelectedPath,
                    setSelectedPathName: setSelectedPathName,
                    setSelectObj:setSelectObj
                }}
                selects={props.selected}
            />

            {selectedPath !== "" && (
                <DialogContent className={classes.contentFix}>
                    <DialogContentText>
                        复制到 <strong>{selectedPathName}</strong>
                    </DialogContentText>
                </DialogContent>
            )}
            <DialogActions>
                <Button onClick={props.onClose}>取消</Button>
                <div className={classes.wrapper}>
                    <Button
                        onClick={submitMove}
                        color="primary"
                        disabled={selectedPath === "" || props.modalsLoading}
                    >
                        确定
                        {props.modalsLoading && (
                            <CircularProgress
                                size={24}
                                className={classes.buttonProgress}
                            />
                        )}
                    </Button>
                </div>
            </DialogActions>
        </Dialog>
    );
}
