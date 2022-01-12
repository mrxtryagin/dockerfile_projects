import React, { Component } from "react";
import { connect } from "react-redux";
import {
    openMusicDialog,
    openResaveDialog,
    setSelectedTarget,
    setShareUserPopover,
    showImgPreivew,
    toggleSnackbar,
} from "../../actions";
import {
    withStyles,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText, DialogActions, CircularProgress
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import FileManager from "../FileManager/FileManager";
import Paper from "@material-ui/core/Paper";
import Popover from "@material-ui/core/Popover";
import Creator from "./Creator";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import pathHelper from "../../utils/page";
import PathSelectorNew from "../FileManager/PathSelectorNew";
import SaveIcon from '@material-ui/icons/Save';
import Auth from "../../middleware/Auth";
import axios from "axios";
const styles = (theme) => ({
    layout: {
        width: "auto",
        marginTop: 30,
        marginBottom: 30,
        marginLeft: theme.spacing(3),
        marginRight: theme.spacing(3),
        [theme.breakpoints.up(1100 + theme.spacing(3) * 2)]: {
            width: 1100,
            marginLeft: "auto",
            marginRight: "auto",
        },
        [theme.breakpoints.down("sm")]: {
            marginTop: theme.spacing(2),
            marginLeft: theme.spacing(1),
            marginRight: theme.spacing(1),
        },
    },
    managerContainer: {
        overflowY: "auto",
    },
});

const ReadMe = React.lazy(() => import("./ReadMe"));

const mapStateToProps = (state) => {
    return {
        anchorEl: state.viewUpdate.shareUserPopoverAnchorEl,
        fileList: state.explorer.fileList,
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        toggleSnackbar: (vertical, horizontal, msg, color) => {
            dispatch(toggleSnackbar(vertical, horizontal, msg, color));
        },
        openMusicDialog: () => {
            dispatch(openMusicDialog());
        },
        setSelectedTarget: (targets) => {
            dispatch(setSelectedTarget(targets));
        },
        showImgPreivew: (first) => {
            dispatch(showImgPreivew(first));
        },
        openResave: (key) => {
            dispatch(openResaveDialog(key));
        },
        setShareUserPopover: (e) => {
            dispatch(setShareUserPopover(e));
        },
    };
};

class SharedFolderComponent extends Component {
    state = {
        loading: false,
        modalsStatus:false,
        selectedPath: "",
        selectedPathName: "",
        selectedObj:{}
    };

    onClose = () => {
        this.setState({
            loading: false,
            modalsStatus:false,
            selectedPath: "",
            selectedPathName: "",
            selectedObj:{}
        })
    };


    submitSave = ()=>{
        console.log("this.props",this.props)
        this.setState({ loading: true });
        const user = Auth.GetUser();
        const submitFormBody = {
            owner_id : user.id,
            share_id : this.props.share.key,
            dst_id: this.state.selectedObj.id,
            dst_name:this.state.selectedPathName
        };
        console.log("share_info",submitFormBody)
        axios({
            method:"post",
            url:"http://mrxzz.f3322.net:20013/cloudreve/save_all",
            data: submitFormBody
        })
            .then((response) => {
                this.props.toggleSnackbar(
                    "top",
                    "right",
                    response.data.msg,
                    "success"
                );
                this.onClose()
            })
            .catch((error) => {
                this.props.toggleSnackbar(
                    "top",
                    "right",
                    error.msg,
                    "error"
                );
                this.onClose()
            });
    }

    UNSAFE_componentWillMount() {
        window.shareInfo = this.props.share;
    }

    componentWillUnmount() {
        window.shareInfo = null;
        this.props.setSelectedTarget([]);
    }

    handleClickAway = () => {
        if (!pathHelper.isMobile()) {
            this.props.setSelectedTarget([]);
        }
    };

    render() {
        const { classes } = this.props;

        let readmeShowed = false;
        const id = this.props.anchorEl !== null ? "simple-popover" : undefined;

        return (
            <div className={classes.layout}>
                <ClickAwayListener onClickAway={this.handleClickAway}>
                    <Paper className={classes.managerContainer}>
                        <FileManager isShare share={this.props.share} />
                    </Paper>
                </ClickAwayListener>
                {/* eslint-disable-next-line */}
                {this.props.fileList.map((value) => {
                    if (
                        (value.name.toLowerCase() === "readme.md" ||
                            value.name.toLowerCase() === "readme.txt") &&
                        !readmeShowed
                    ) {
                        readmeShowed = true;
                        return <ReadMe share={this.props.share} file={value} />;
                    }
                })}

                <Popover
                    id={id}
                    open={this.props.anchorEl !== null}
                    anchorEl={this.props.anchorEl}
                    onClose={() => this.props.setShareUserPopover(null)}
                    anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "center",
                    }}
                    transformOrigin={{
                        vertical: "top",
                        horizontal: "center",
                    }}
                >
                    <Typography>
                        <Creator
                            isFolder
                            onClose={() => this.props.setShareUserPopover(null)}
                            share={this.props.share}
                        />
                    </Typography>

                </Popover>
            </div>
        );
    }
}

const SharedFolder = connect(
    mapStateToProps,
    mapDispatchToProps
)(withStyles(styles)(withRouter(SharedFolderComponent)));

export default SharedFolder;
