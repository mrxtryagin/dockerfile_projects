import React, { Component } from "react";
import PropTypes from "prop-types";
import SearchIcon from "@material-ui/icons/Search";
import { fade } from "@material-ui/core/styles/colorManipulator";
import FileIcon from "@material-ui/icons/InsertDriveFile";
import ShareIcon from "@material-ui/icons/Share";
import { connect } from "react-redux";
import { searchMyFile, toggleSnackbar } from "../../actions";
import Autocomplete from '@material-ui/lab/Autocomplete';
import {
    withStyles,
    InputBase,
    Popper,
    Fade,
    Paper,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Typography,
} from "@material-ui/core";
import { withRouter } from "react-router";
import pathHelper from "../../utils/page";
import Hotkeys from "react-hot-keys";
import { isMac } from "../../utils";



const mapStateToProps = (state) => {
    return {
        path: state.navigator.path,
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        searchMyFile: (keywords) => {
            dispatch(searchMyFile(keywords));
        },
        toggleSnackbar: (vertical, horizontal, msg, color) => {
            dispatch(toggleSnackbar(vertical, horizontal, msg, color));
        },
    };
};

const styles = (theme) => ({
    search: {
        [theme.breakpoints.down("sm")]: {
            display: "none",
        },
        position: "relative",
        borderRadius: theme.shape.borderRadius,
        backgroundColor: fade(theme.palette.common.white, 0.15),
        "&:hover": {
            backgroundColor: fade(theme.palette.common.white, 0.25),
        },
        marginRight: theme.spacing(2),
        marginLeft: 0,
        width: "100%",
        [theme.breakpoints.up("sm")]: {
            marginLeft: theme.spacing(7.2),
            width: "auto",
        },
    },
    searchIcon: {
        width: theme.spacing(9),
        height: "100%",
        position: "absolute",
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    inputRoot: {
        color: "inherit",
        width: "100%",
    },
    inputInput: {
        paddingTop: theme.spacing(1),
        paddingRight: theme.spacing(1),
        paddingBottom: theme.spacing(1),
        paddingLeft: theme.spacing(7),
        transition: theme.transitions.create("width"),
        width: "100%",
        [theme.breakpoints.up("md")]: {
            width: 200,
            "&:focus": {
                width: 300,
            },
        },
    },
    suggestBox: {
        zIndex: "9999",
        width: 364,
    },
});

const keyMap = {
    SEARCH: "enter",
};

class SearchBarCompoment extends Component {
    constructor(props) {
        super(props);
        this.state = {
            anchorEl: null,
            input: "",
        };
    }

    handlers = {
        SEARCH: (e) => {
            e.preventDefault()
            // console.log("e",e)
            this.searchMyFile();
            e.target.blur();
        },
    };
    onKeyDown(e) {
        // console.log(keyName,e,handle)
        // e.preventDefault();
        // console.log("onKeyDown", keyName, e, handle);
        e.persist()
        // console.log(this.props)

        if(e.keyCode === 13){
            if (pathHelper.isHomePage(this.props.location.pathname)) {
                this.searchMyFile();
            } else {
                this.searchShare();
            }
            e.target.blur();
        }
    }

    handleChange = (event) => {
        const { currentTarget } = event;
        this.input = event.target.value;
        this.setState({
            anchorEl: currentTarget,
            input: event.target.value,
        });
    };

    cancelSuggest = () => {
        this.setState({
            input: "",
        });
    };

    searchMyFile = () => {
        if(this.input.indexOf("/" ) !== -1 || this.input.indexOf("\\") !== -1) this.props.toggleSnackbar(
            "top",
            "right",
            "搜索字符中不应含有/,\\等字样",
            "error"
        );
        // else this.props.searchMyFile("keywords/" + this.input+"/path/");
            //直接搜索
        else this.props.searchMyFile("keywords/" + this.input);
    };

    //history其实相当于是回退
    searchShare = () => {
        this.props.history.push(
            "/search?keywords=" + encodeURIComponent(this.input)
        );
    };

    render() {
        const { classes } = this.props;
        const { anchorEl } = this.state;
        const id = this.state.input !== "" ? "simple-popper" : null;
        const isHomePage = pathHelper.isHomePage(this.props.location.pathname);

        return (
            <div className={classes.search}>
                <div className={classes.searchIcon}>
                    <SearchIcon />
                </div>
                <InputBase
                        placeholder="搜索..."
                        classes={{
                            root: classes.inputRoot,
                            input: classes.inputInput,
                        }}
                        onChange={this.handleChange}
                        onBlur={this.cancelSuggest}
                        value={this.state.input}
                        onKeyDown = {this.onKeyDown.bind(this)}
                />
                <Popper
                    id={id}
                    open={this.state.input !== ""}
                    anchorEl={anchorEl}
                    className={classes.suggestBox}
                    transition
                >
                    {({ TransitionProps }) => (
                        <Fade {...TransitionProps} timeout={350}>
                            <Paper square={true}>
                                {isHomePage && (
                                    <MenuItem onClick={this.searchMyFile}>
                                        <ListItemIcon className={classes.icon}>
                                            <FileIcon />
                                        </ListItemIcon>
                                        <ListItemText
                                            classes={{
                                                primary: classes.primary,
                                            }}
                                            primary={
                                                <Typography noWrap>
                                                    在我的文件中搜索{" "}
                                                    <strong>
                                                        {this.state.input}
                                                    </strong>
                                                </Typography>
                                            }
                                        />
                                    </MenuItem>
                                )}

                                <MenuItem onClick={this.searchShare}>
                                    <ListItemIcon className={classes.icon}>
                                        <ShareIcon />
                                    </ListItemIcon>
                                    <ListItemText
                                        classes={{ primary: classes.primary }}
                                        primary={
                                            <Typography noWrap>
                                                在全站分享中搜索{" "}
                                                <strong>
                                                    {this.state.input}
                                                </strong>
                                            </Typography>
                                        }
                                    />
                                </MenuItem>
                            </Paper>
                        </Fade>
                    )}
                </Popper>
            </div>
        );
    }
}

SearchBarCompoment.propTypes = {
    classes: PropTypes.object.isRequired,
};

const SearchBar = connect(
    mapStateToProps,
    mapDispatchToProps
)(withStyles(styles)(withRouter(SearchBarCompoment)));

export default SearchBar;
