import React, { useCallback } from "react";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/core/styles";
import TreeView from "@material-ui/lab/TreeView";
import TreeItem from "@material-ui/lab/TreeItem";
import {
    Typography, Button,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    CircularProgress
} from "@material-ui/core";
import MailIcon from "@material-ui/icons/Mail";
import DeleteIcon from "@material-ui/icons/Delete";
import Label from "@material-ui/icons/Label";
import SupervisorAccountIcon from "@material-ui/icons/SupervisorAccount";
import InfoIcon from "@material-ui/icons/Info";
import ForumIcon from "@material-ui/icons/Forum";
import LocalOfferIcon from "@material-ui/icons/LocalOffer";
import CreateNewFolderIcon from "@material-ui/icons/CreateNewFolder";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import ArrowRightIcon from "@material-ui/icons/ArrowRight";
import FolderIcon from "@material-ui/icons/Folder";
import { refreshFileList, toggleSnackbar } from "../../actions/index";
import API from "../../middleware/Api";
import { useDispatch, useSelector } from "react-redux";
import explorer from "../../redux/explorer";
import { CloudreveFile, SortMethod } from "../../types";


const useTreeItemStyles = makeStyles((theme) => ({
    root: {
        color: theme.palette.text.secondary,
        "&:hover > $content": {
            backgroundColor: theme.palette.action.hover
        },
        "&:focus > $content, &$selected > $content": {
            backgroundColor: `var(--tree-view-bg-color, ${theme.palette.grey[400]})`,
            color: "var(--tree-view-color)"
        },
        "&:focus > $content $label, &:hover > $content $label, &$selected > $content $label": {
            backgroundColor: "transparent"
        }
    },
    content: {
        color: theme.palette.text.secondary,
        borderTopRightRadius: theme.spacing(2),
        borderBottomRightRadius: theme.spacing(2),
        paddingRight: theme.spacing(1),
        fontWeight: theme.typography.fontWeightMedium,
        "$expanded > &": {
            fontWeight: theme.typography.fontWeightRegular
        }
    },
    //左偏移
    group: {
        marginLeft: 18,
        "& $content": {
            paddingLeft: theme.spacing(2)
        }
    },
    expanded: {},
    selected: {},
    label: {
        fontWeight: "inherit",
        color: "inherit"
    },
    labelRoot: {
        display: "flex",
        alignItems: "center",
        padding: theme.spacing(0.5, 0)
    },
    labelIcon: {
        marginRight: theme.spacing(1)
    },
    labelText: {
        fontWeight: "inherit",
        flexGrow: 1
    }
}));


function StyledTreeItem(props) {
    const classes = useTreeItemStyles();
    const { labelText, labelIcon: LabelIcon, labelInfo, color, bgColor, ...other } = props;

    return (
        <TreeItem
            label={
                <div className={classes.labelRoot}>
                    <LabelIcon color="inherit" className={classes.labelIcon} />
                    <Typography variant="body2" className={classes.labelText}>
                        {labelText}
                    </Typography>
                    <Typography variant="caption" color="inherit">
                        {labelInfo}
                    </Typography>
                </div>
            }
            style={{
                "--tree-view-color": color,
                "--tree-view-bg-color": bgColor
            }}
            classes={{
                root: classes.root,
                content: classes.content,
                expanded: classes.expanded,
                selected: classes.selected,
                group: classes.group,
                label: classes.label
            }}
            {...other}
        />
    );
}

StyledTreeItem.propTypes = {
    bgColor: PropTypes.string,
    color: PropTypes.string,
    labelIcon: PropTypes.elementType.isRequired,
    labelInfo: PropTypes.string,
    labelText: PropTypes.string.isRequired
};


// const useStyles = makeStyles({
//     //高度固定
//     root: {
//         maxHeight: "330px",
//         overflowY: "auto",
//         flexGrow: 1
//     }
// });


const useStyles = makeStyles((theme) => ({
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
    },
    contentFix: {
        padding: "10px 24px 0px 24px"
    },
    //高度固定
    root: {
        maxHeight: "330px",
        overflowY: "auto",
        flexGrow: 1
    }
}));


// const root = {
//     id: "/",
//     name: "/",
//     children: []
// };


// const data1 = {
//     obj: {
//         "/": root
//     },
//     result: []
// };


// const data = root;


const getFolderName = (fullPath) => {
    if (fullPath === "/" || fullPath === "//") return "/";
    const pathArr = fullPath.split("/");
    return pathArr[pathArr.length - 1];
};

const getInitArr = (props) => {
    //初始的init
    const initArr = ["/"];
    if (!props.path || props.path === "/" || props.path === "//" || !props.path.startsWith("/")) 1;
    else {
        const paths = props.path.split("/").slice(1);
        console.log("paths", paths);
        //拼接
        for (let aa = 0; aa < paths.length; aa++) {
            initArr.push("/" + paths.slice(0, aa + 1).join("/"));
        }

    }
    return initArr;
};

function PathSelectorNew(props) {

    console.log("props_args", props);

    const classes = useStyles();
    const dispatch = useDispatch();

    const ToggleSnackbar = useCallback(
        (vertical, horizontal, msg, color) =>
            dispatch(toggleSnackbar(vertical, horizontal, msg, color)),
        [dispatch]
    );
    const RefreshFileList = useCallback(() => {
        dispatch(refreshFileList());
    }, [dispatch]);

    const sortMethod = useSelector(state => state.viewUpdate.sortMethod);


    const [refresh, setRefresh] = React.useState(false);
    const [isInit, setIsInit] = React.useState(false);
    const [isclickDisabled, setIsClickDisabled] = React.useState(false);
    const [selects, setSelects] = React.useState([]);
    const [root, setRoot] = React.useState(
        {
            id: "/",
            name: "/",
            obj: {},
            children: []

        });

    const [data, setData] = React.useState(root
    );
    const [data1, setDate1] = React.useState(
        {
            obj: {
                "/": root
            },
            result: []
        });


    const [state, setState] = React.useState({
        modalsLoading: false,
        newFolderName: "",
        modalsStatus: false
    });


    console.log("sortMethod", sortMethod);

    // 排序方法
    const sortMethodFuncs = {
        sizePos: (a, b) => {
            return a.size - b.size;
        },
        sizeRes: (a, b) => {
            return b.size - a.size;
        },
        namePos: (a, b) => {
            return a.name.localeCompare(
                b.name,
                navigator.languages[0] || navigator.language,
                { numeric: true, ignorePunctuation: true }
            );
        },
        nameRev: (a, b) => {
            return b.name.localeCompare(
                a.name,
                navigator.languages[0] || navigator.language,
                { numeric: true, ignorePunctuation: true }
            );
        },
        timePos: (a, b) => {
            return Date.parse(a.date) - Date.parse(b.date);
        },
        timeRev: (a, b) => {
            return Date.parse(b.date) - Date.parse(a.date);
        }
    };


    // todo:之后要改写
    const enterFolder = (toBeLoad) => {
        console.log("地址是", toBeLoad);
        return API.get(
           props.api ? props.api + encodeURIComponent(toBeLoad) : ("/directory") + encodeURIComponent(toBeLoad)
        )
            .then((response) => {
                // 记录根Id
                if (toBeLoad === "/") data1.obj[toBeLoad].obj.id = response.data.parent;
                const dirNames = response.data.objects.filter(el => el.type === "dir");
                console.log(dirNames);
                //sort
                dirNames.sort(sortMethodFuncs[sortMethod]);
                console.log("sorted", dirNames);
                return dirNames;

            })
            .catch((error) => {
                ToggleSnackbar("top", "right", error.message, "error");
            });
    };

    const openDiaglog = () => {
        setState({
            modalsLoading: false,
            newFolderName: "",
            modalsStatus: true

        });
    };
    const onClose = () => {
        setState({
            modalsLoading: false,
            newFolderName: "",
            modalsStatus: false
        });
        root.result = [];
        data1.result = [];
        // RefreshFileList();
    };

    const handleInputChange = (e) => {
        setState({
            [e.target.id]: e.target.value,
            modalsLoading: false,
            modalsStatus: true
        });
    };


    const _expand = (key) => {

        if (data1.result.indexOf(key) !== -1) return new Promise((resolve => resolve(null)));
        else data1.result.push(key);
        return enterFolder(key).then((data2) => {
            data2.forEach(el => {
                const a = {
                    id: key === "/" ? "/" + el.name : key + "/" + el.name, //全路径
                    name: el.name, //显示名称
                    obj: el, //该对象的信息
                    children: [], // 子节点
                    parentId: key //父节点Id
                };
                console.log(key, a);
                data1.obj[key].children.push(a);
                data1.obj[a.id] = a;

            });
            // console.log(data)

        });
    };

    const onExpand = (e, id) => {
        console.log(data1);
        if (id.length === 0) return;
        else {
            const key = id[0];
            _expand(key).then(() => {
                setRefresh(!refresh);
            });
        }
        // let key = id.shift();
        // if(data1.result.indexOf(key) !==-1)return
        // else data1.result.push(key)
        // const a = {
        // id:(data1.start++).toString(),
        // name:(data1.start).toString(),
        // chilren:[]
        // }
        // console.log(data1.obj[key])
        // data1.obj[key].children.push(a)
        // data1.obj[a.id] = a

    };


    const onSelect = (e, id) => {
        if (selects[selects.length - 1] !== id) selects.push(id);
        if (props.value.state) {
            if (props.getObj) {
                props.value.setState({
                    selectedPath: id,
                    selectedPathName: getFolderName(id),
                    selectedObj: data1.obj[id].obj
                });
            } else props.value.setState({
                selectedPath: id,
                selectedPathName: getFolderName(id)
            });
        } else {
            if (props.value.setSelectedPath) props.value.setSelectedPath(id);
            if (props.value.setSelectedPathName) props.value.setSelectedPathName(getFolderName(id));
            if (props.value.setSelectObj) props.value.setSelectObj(data1.obj[id].obj);
        }
        console.log(props);

    };


    //顺序执行 todo:改写
    const run = (arr) => {
        let p = Promise.resolve();
        arr.forEach(el => {
            p = p.then(() => _expand(el));
        });
        return p;
    };


    //初始化方法
    const init = () => {
        const initArr = getInitArr(props);
        console.log("initArr", initArr);
        run(initArr).finally(() => {
            console.log("data", data);
            !isclickDisabled && setIsClickDisabled(true);
            setIsInit(true);
        });

    };

    const clickDisabled = (e) => {
        console.log(isclickDisabled);
        if (isclickDisabled) e.preventDefault();
    };


    const createNewFolder = (e) => {
        e.preventDefault();
        setState({
            modalsStatus: true,
            modalsLoading: true
        });
        console.log("selects", data1);
        //   console.log("data",data1.obj)
        const end = selects[selects.length - 1];

        //判断 父id 旗下的文件夹名字
        const names = data1.obj[end].children.map(el => el.name);
        if (names.indexOf(state.newFolderName) !== -1) {
            ToggleSnackbar("top", "right", "文件夹名称重复", "warning");
            onClose();
        } else {
            const newId = end === "/" ? "/" + state.newFolderName : end + "/" + state.newFolderName;
            API.put("/directory", {
                path: newId
            })
                .then(() => {
                    enterFolder(end).then((data2) => {
                        data1.obj[end].children = [];
                        data2.forEach(el => {
                            const a = {
                                id: end === "/" ? "/" + el.name : end + "/" + el.name,
                                name: el.name,
                                obj: el,
                                children: [],
                                parentId: end
                            };
                            console.log(end, a);
                            data1.obj[end].children.push(a);
                            data1.obj[a.id] = a;
                        });
                        onClose();
                    });

                })
                .catch((error) => {
                    onClose();
                    ToggleSnackbar("top", "right", error.message, "error");
                });

        }


    };


    //测试递归操作节点
    const testtest = () => {
        const target = selects[selects.length - 1];
        console.log("选择的项目", props.selects);

        //将该节点的附属信息传过去
        props.selects.forEach(el => {
            const fullPath = el.path === "/" ? "/" + el.name : el.path + "/" + el.name;
            console.log("data_path_obj", data1.obj[fullPath]);
        });


    };

    const renderTree = (nodes) => (
        <StyledTreeItem key={nodes.id} nodeId={nodes.id} labelText={nodes.name} labelIcon={FolderIcon}  labelInfo={props.noDateShow?"":(nodes.obj.date?nodes.obj.date:"")} color="#3c8039"
                        bgColor="#e6f4ea" onIconClick={nodes.id === "/" ? clickDisabled : () => {
            console.log("other");
        }} onLabelClick={nodes.id === "/" ? clickDisabled : () => {
            console.log("other");
        }}>
            {Array.isArray(nodes.children) ? nodes.children.map((node) => renderTree(node)) : null}
            <span />
        </StyledTreeItem>
    );

    //初始化操作
    !isInit && init();


    return (
        isInit && (
            <div>
                {/* <Typography  component={'div'} variant={'body2'}> */}
                <TreeView
                    className={classes.root}
                    defaultExpanded={getInitArr(props)}
                    // expanded ={['root']}
                    onNodeSelect={onSelect}
                    onNodeToggle={onExpand}
                    // disableSelection
                    // defaultSelected = '4'
                    defaultCollapseIcon={<ArrowDropDownIcon />}
                    defaultExpandIcon={<ArrowRightIcon />}
                    defaultEndIcon={<div style={{ width: 24 }} />}
                >
                    {renderTree(data)}
                </TreeView>
                <Button
                    onClick={openDiaglog}
                    size="small"
                    fontSize="small"
                    startIcon={<CreateNewFolderIcon />}
                    disabled={selects.length <= 0 || props.noNewDir}
                >新建文件夹</Button>
                <Dialog
                    open={state.modalsStatus}
                    onClose={onClose}
                    aria-labelledby="form-dialog-title"
                >
                    <DialogTitle id="form-dialog-title">新建文件夹</DialogTitle>

                    <DialogContent>
                        <form onSubmit={createNewFolder}>
                            <TextField
                                autoFocus
                                margin="dense"
                                id="newFolderName"
                                label="文件夹名称"
                                type="text"
                                defaultValue={state.newFolderName}
                                onChange={e => handleInputChange(e)}
                                fullWidth
                            />
                        </form>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={onClose}>取消</Button>
                        <div>
                            <Button
                                onClick={createNewFolder}
                                color="primary"
                                disabled={
                                    state.newFolderName === "" ||
                                    state.modalsLoading
                                }
                            >
                                创建
                                {state.modalsLoading && (
                                    <CircularProgress
                                        size={24}

                                    />
                                )}
                            </Button>
                        </div>
                    </DialogActions>
                </Dialog>


            </div>
        )
    );
}

export default PathSelectorNew;