import React, { useCallback } from "react";
import PropTypes from "prop-types";
import clsx from "clsx";
import { lighten, makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TablePagination from "@material-ui/core/TablePagination";
import TableRow from "@material-ui/core/TableRow";
import TableSortLabel from "@material-ui/core/TableSortLabel";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import Checkbox from "@material-ui/core/Checkbox";
import IconButton from "@material-ui/core/IconButton";
import Tooltip from "@material-ui/core/Tooltip";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import DeleteIcon from "@material-ui/icons/Delete";
import FilterListIcon from "@material-ui/icons/FilterList";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";
import SaveIcon from "@material-ui/icons/Save";
import { DataGrid } from "@material-ui/data-grid";

import {
    CircularProgress,
    Dialog,
    Button,
    DialogActions,
    DialogContent,
    DialogTitle,
    Popper,
    Paper, DialogContentText
} from "@material-ui/core";
import axios from "axios";
import Auth from "../../middleware/Auth";
import { sizeToString } from "../../utils";
import { saveFile, toggleSnackbar } from "../../actions";
import { useDispatch } from "react-redux";

const useStyles = makeStyles((theme) => ({
    root2: {
        alignItems: "center",
        lineHeight: "24px",
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        "& .cellValue": {
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
        }
    },
    root: {
        width: "100%"
    },
    paper: {
        width: "100%",
        marginBottom: theme.spacing(2)
    },
    table: {
        minWidth: 850
    },
    visuallyHidden: {
        border: 0,
        clip: "rect(0 0 0 0)",
        height: 1,
        margin: -1,
        overflow: "hidden",
        padding: 0,
        position: "absolute",
        top: 20,
        width: 1
    },
    wrapper: {
        margin: theme.spacing(1),
        position: "relative"
    }
}));

// const data = {
//     data: [
//         {
//             id: 575,
//             is_dir: 0,
//             name: "[KTXP][Higurashi_Sotsu][26][BIG5][1080p].mp4",
//             objects: [
//                 {
//                     name: "[KTXP][Higurashi_Sotsu][26][BIG5][1080p].mp4",
//                     size: "395220972",
//                     source_name:
//                         "uploads/1/动漫杂/[KTXP][Higurashi_Sotsu][26][BIG5][1080p].mp4"
//                 }
//             ],
//             source: "magnet:?xt=urn:btih:J5SEX6HOVVOJMAENK2XMGD6O7OOMKIEI"
//         },
//         {
//             id: 31,
//             is_dir: 0,
//             name: "[Nekomoe kissaten][Gleipnir][04][1080p][CHS].mp4",
//             objects: [
//                 {
//                     name: "[Nekomoe kissaten][Gleipnir][04][1080p][CHS].mp4",
//                     size: "478155198",
//                     source_name:
//                         "uploads/1/动漫杂/[Nekomoe kissaten][Gleipnir][04][1080p][CHS].mp4"
//                 }
//             ],
//             source: "magnet:?xt=urn:btih:H4TQW27TEPQCXPL4IOUM7H7IXEACQULW"
//         },
//         {
//             id: 0,
//             name: "",
//             objects: [],
//             source: "magnet:?xt=urn:btih:38f3889868bf60fc75e08d2e51d33aa491912795"
//         },
//         {
//             id: 0,
//             name: "",
//             objects: [],
//             source: "magnet:?xt=urn:btih:399f3889868bf60fc75e08d2e51d33aa491912795"
//         },
//         {
//             id: 558,
//             is_dir: 1,
//             name: "無職転生 〜異世界行ったら本気だす〜",
//             objects: [
//                 {
//                     last_folder: "無職転生 〜異世界行ったら本気だす〜",
//                     name: "第06話 ロアの休日.mkv",
//                     size: "2318744241",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/第06話 ロアの休日.mkv"
//                 },
//                 {
//                     last_folder: "無職転生 〜異世界行ったら本気だす〜",
//                     name: "第02話 師匠.mkv",
//                     size: "1983047832",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/第02話 師匠.mkv"
//                 },
//                 {
//                     last_folder: "無職転生 〜異世界行ったら本気だす〜",
//                     name: "第03話 友達.mkv",
//                     size: "1532733782",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/第03話 友達.mkv"
//                 },
//                 {
//                     last_folder: "無職転生 〜異世界行ったら本気だす〜",
//                     name: "第04話 緊急家族会議.mkv",
//                     size: "1919808126",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/第04話 緊急家族会議.mkv"
//                 },
//                 {
//                     last_folder: "無職転生 〜異世界行ったら本気だす〜",
//                     name: "第05話 お嬢様と暴力.mkv",
//                     size: "2163824506",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/第05話 お嬢様と暴力.mkv"
//                 },
//                 {
//                     last_folder: "無職転生 〜異世界行ったら本気だす〜",
//                     name: "第01話 無職転生.mkv",
//                     size: "1958566487",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/第01話 無職転生.mkv"
//                 },
//                 {
//                     last_folder: "無職転生 〜異世界行ったら本気だす〜",
//                     name: "第07話 努力の先にあるもの.mkv",
//                     size: "2164285709",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/第07話 努力の先にあるもの.mkv"
//                 },
//                 {
//                     last_folder: "無職転生 〜異世界行ったら本気だす〜",
//                     name: "第08話 ターニングポイント1.mkv",
//                     size: "2106238041",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/第08話 ターニングポイント1.mkv"
//                 },
//                 {
//                     last_folder: "無職転生 〜異世界行ったら本気だす〜",
//                     name: "第09話 邂逅.mkv",
//                     size: "1751991120",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/第09話 邂逅.mkv"
//                 },
//                 {
//                     last_folder: "無職転生 〜異世界行ったら本気だす〜",
//                     name: "第10話 人の命と初仕事.mkv",
//                     size: "1925195043",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/第10話 人の命と初仕事.mkv"
//                 },
//                 {
//                     last_folder: "無職転生 〜異世界行ったら本気だす〜",
//                     name: "第11話 子供と戦士.mkv",
//                     size: "2110494602",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/第11話 子供と戦士.mkv"
//                 },
//                 {
//                     last_folder: "映像特典",
//                     name: "Blu-ray&DVD 宣伝 1.mkv",
//                     size: "29178950",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典/Blu-ray&DVD 宣伝 1.mkv"
//                 },
//                 {
//                     last_folder: "映像特典",
//                     name: "Blu-ray&DVD 宣伝 2.mkv",
//                     size: "28833597",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典/Blu-ray&DVD 宣伝 2.mkv"
//                 },
//                 {
//                     last_folder: "映像特典",
//                     name: "アニメ 宣伝1.mkv",
//                     size: "103042247",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典/アニメ 宣伝1.mkv"
//                 },
//                 {
//                     last_folder: "映像特典",
//                     name: "アニメ 宣伝2.mkv",
//                     size: "87820611",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典/アニメ 宣伝2.mkv"
//                 },
//                 {
//                     last_folder: "映像特典",
//                     name: "アニメ 宣伝3.mkv",
//                     size: "196538365",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典/アニメ 宣伝3.mkv"
//                 },
//                 {
//                     last_folder: "映像特典 - Blu-ray Menu",
//                     name: "Menu 1.mkv",
//                     size: "94310341",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典 - Blu-ray Menu/Menu 1.mkv"
//                 },
//                 {
//                     last_folder: "映像特典 - Blu-ray Menu",
//                     name: "Menu 2.mkv",
//                     size: "110772274",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典 - Blu-ray Menu/Menu 2.mkv"
//                 },
//                 {
//                     last_folder: "映像特典 - NCOP&NCED",
//                     name: "NCED - オンリー.mkv",
//                     size: "172801242",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典 - NCOP&NCED/NCED - オンリー.mkv"
//                 },
//                 {
//                     last_folder: "映像特典 - NCOP&NCED",
//                     name: "第02話NCOP.mkv",
//                     size: "142023577",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典 - NCOP&NCED/第02話NCOP.mkv"
//                 },
//                 {
//                     last_folder: "映像特典 - NCOP&NCED",
//                     name: "第03話NCOP.mkv",
//                     size: "232111325",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典 - NCOP&NCED/第03話NCOP.mkv"
//                 },
//                 {
//                     last_folder: "映像特典 - NCOP&NCED",
//                     name: "第04話NCOP.mkv",
//                     size: "192983473",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典 - NCOP&NCED/第04話NCOP.mkv"
//                 },
//                 {
//                     last_folder: "映像特典 - NCOP&NCED",
//                     name: "第05話NCOP.mkv",
//                     size: "289329378",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典 - NCOP&NCED/第05話NCOP.mkv"
//                 },
//                 {
//                     last_folder: "映像特典 - NCOP&NCED",
//                     name: "第06話NCOP.mkv",
//                     size: "552413891",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典 - NCOP&NCED/第06話NCOP.mkv"
//                 },
//                 {
//                     last_folder: "映像特典 - NCOP&NCED",
//                     name: "第07話NCOP.mkv",
//                     size: "198730140",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典 - NCOP&NCED/第07話NCOP.mkv"
//                 },
//                 {
//                     last_folder: "映像特典 - NCOP&NCED",
//                     name: "第08話NCED.mkv",
//                     size: "1164826664",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典 - NCOP&NCED/第08話NCED.mkv"
//                 },
//                 {
//                     last_folder: "映像特典 - NCOP&NCED",
//                     name: "第08話NCOP.mkv",
//                     size: "197966066",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典 - NCOP&NCED/第08話NCOP.mkv"
//                 },
//                 {
//                     last_folder: "映像特典 - NCOP&NCED",
//                     name: "第09話NCOP.mkv",
//                     size: "101150011",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典 - NCOP&NCED/第09話NCOP.mkv"
//                 },
//                 {
//                     last_folder: "映像特典 - NCOP&NCED",
//                     name: "第10話NCOP.mkv",
//                     size: "383741687",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典 - NCOP&NCED/第10話NCOP.mkv"
//                 },
//                 {
//                     last_folder: "映像特典 - NCOP&NCED",
//                     name: "第11話NCED.mkv",
//                     size: "536619387",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典 - NCOP&NCED/第11話NCED.mkv"
//                 },
//                 {
//                     last_folder: "映像特典 - NCOP&NCED",
//                     name: "第11話NCOP.mkv",
//                     size: "216903966",
//                     source_name:
//                         "uploads/1/动漫杂/無職転生 〜異世界行ったら本気だす〜/映像特典 - NCOP&NCED/第11話NCOP.mkv"
//                 }
//             ],
//             source: "magnet:?xt=urn:btih:5TBZVZHTF5GF5G7WZ4TJL5NCWUJNUWLS"
//         }
//     ]
// };


function descendingComparator(a, b, orderBy) {
    if (b[orderBy] < a[orderBy]) {
        return -1;
    }
    if (b[orderBy] > a[orderBy]) {
        return 1;
    }
    return 0;
}

function getComparator(order, orderBy) {
    return order === "desc"
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array, comparator) {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
}

const headCells = [
    {
        id: "source",
        numeric: true,
        disablePadding: false,
        label: "原始链接",
        minWidth: 80
    },
    {
        id: "name",
        numeric: true,
        disablePadding: false,
        label: "资源名称",
        minWidth: 80
    },
    {
        id: "isDir",
        numeric: true,
        disablePadding: false,
        label: "文件/目录",
        minWidth: 100
    },
    {
        id: "objects",
        numeric: true,
        disablePadding: true,
        label: "明细",
        minWidth: 50
    },
    {
        id: "operate",
        numeric: true,
        disablePadding: true,
        label: "操作",
        minWidth: 120
    }
];

//头部强化
function EnhancedTableHead(props) {
    const {
        classes,
        onSelectAllClick,
        order,
        orderBy,
        numSelected,
        rowCount,
        onRequestSort
    } = props;
    const createSortHandler = (property) => (event) => {
        onRequestSort(event, property);
    };

    return (
        <TableHead>
            <TableRow>
                {/* <TableCell padding="checkbox">
          <Checkbox
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            inputProps={{ "aria-label": "select all desserts" }}
          />
        </TableCell> */}
                {headCells.map((headCell) => (
                    <TableCell
                        key={headCell.id}
                        align={headCell.numeric ? "center" : "left"}
                        padding={headCell.disablePadding ? "none" : "normal"}
                        sortDirection={orderBy === headCell.id ? order : false}
                        style={{ minWidth: headCell.minWidth }}
                    >
                        <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : "asc"}
                            onClick={createSortHandler(headCell.id)}
                        >
                            {headCell.label}
                            {orderBy === headCell.id ? (
                                <span className={classes.visuallyHidden}>
                  {order === "desc" ? "sorted descending" : "sorted ascending"}
                </span>
                            ) : null}
                        </TableSortLabel>
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    );
}

EnhancedTableHead.propTypes = {
    classes: PropTypes.object.isRequired,
    numSelected: PropTypes.number.isRequired,
    onRequestSort: PropTypes.func.isRequired,
    onSelectAllClick: PropTypes.func.isRequired,
    order: PropTypes.oneOf(["asc", "desc"]).isRequired,
    orderBy: PropTypes.string.isRequired,
    rowCount: PropTypes.number.isRequired
};

const useToolbarStyles = makeStyles((theme) => ({
    root: {
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(1)
    },
    highlight:
        theme.palette.type === "light"
            ? {
                color: theme.palette.secondary.main,
                backgroundColor: lighten(theme.palette.secondary.light, 0.85)
            }
            : {
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.secondary.dark
            },
    title: {
        flex: "1 1 100%"
    }
}));

const EnhancedTableToolbar = (props) => {
    const classes = useToolbarStyles();
    const { numSelected } = props;

    return (
        <Toolbar
            className={clsx(classes.root, {
                [classes.highlight]: numSelected > 0
            })}
        >

            {/*{numSelected > 0 ? (*/}
            {/*    <Typography*/}
            {/*        className={classes.title}*/}
            {/*        color="inherit"*/}
            {/*        variant="subtitle1"*/}
            {/*        component="div"*/}
            {/*    >*/}
            {/*        {numSelected} selected*/}
            {/*    </Typography>*/}
            {/*) : (*/}
            {/*    <Typography*/}
            {/*        className={classes.title}*/}
            {/*        variant="h6"*/}
            {/*        id="tableTitle"*/}
            {/*        component="div"*/}
            {/*    >*/}
            {/*        处理结果*/}
            {/*    </Typography>*/}
            {/*)}*/}

            {/*{numSelected > 0 && (*/}
            {/*    <Tooltip title="Delete">*/}
            {/*        <IconButton aria-label="delete">*/}
            {/*            <DeleteIcon />*/}
            {/*        </IconButton>*/}
            {/*    </Tooltip>*/}
            {/*)}*/}
        </Toolbar>
    );
};

EnhancedTableToolbar.propTypes = {
    numSelected: PropTypes.number.isRequired
};

//文本扩展
const GridCellExpand = React.memo(function GridCellExpand(props) {
    const { width, value } = props;
    const wrapper = React.useRef(null);
    const cellDiv = React.useRef(null);
    const cellValue = React.useRef(null);
    const [anchorEl, setAnchorEl] = React.useState(null);
    const classes = useStyles();
    const [showFullCell, setShowFullCell] = React.useState(false);
    const [showPopper, setShowPopper] = React.useState(false);

    // const isOverflown = ({ clientWidth, clientHeight, scrollWidth, scrollHeight }) => {
    //     return scrollHeight > clientHeight || scrollWidth > clientWidth;
    // }
    const handleMouseEnter = () => {
        // const isCurrentlyOverflown = isOverflown(cellValue.current);
        const  isCurrentlyOverflown = false;
        //todo: isOverflown不存在了
        setShowPopper(isCurrentlyOverflown);
        setAnchorEl(cellDiv.current);
        setShowFullCell(true);
    };

    const handleMouseLeave = () => {
        setShowFullCell(false);
    };

    React.useEffect(() => {
        if (!showFullCell) {
            return undefined;
        }

        function handleKeyDown(nativeEvent) {
            // IE11, Edge (prior to using Bink?) use 'Esc'
            if (nativeEvent.key === "Escape" || nativeEvent.key === "Esc") {
                setShowFullCell(false);
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [setShowFullCell, showFullCell]);

    // console.log(showPopper, showFullCell, anchorEl);
    return (
        <div
            ref={wrapper}
            className={classes.root2}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div
                ref={cellDiv}
                style={{
                    height: 1,
                    width,
                    display: "block",
                    position: "absolute",
                    top: 0
                }}
            />
            <div ref={cellValue} className="cellValue" title={value}>
                {value}
            </div>
            {/* 好像没啥用 */}
            {showPopper && (
                <Popper
                    open={showFullCell}
                    anchorEl={anchorEl}
                    style={{ width, marginLeft: -17 }}
                >
                    <Paper
                        elevation={1}
                        style={{ minHeight: wrapper.current.offsetHeight - 3 }}
                    >
                        <Typography variant="body2" style={{ padding: 8 }}>
                            {value}
                        </Typography>
                    </Paper>
                </Popper>
            )}
        </div>
    );
});

GridCellExpand.propTypes = {
    value: PropTypes.string.isRequired,
    width: PropTypes.number.isRequired
};

function renderCellExpand(params) {
    return (
        <GridCellExpand
            value={params.value ? params.value.toString() : ""}
            width={params.colDef.width}
        />
    );
}

renderCellExpand.propTypes = {
    /**
     * The column of the row that the current cell belongs to.
     */
    colDef: PropTypes.any.isRequired,
    /**
     * The cell value, but if the column has valueGetter, use getValue.
     */
    value: PropTypes.oneOfType([
        PropTypes.instanceOf(Date),
        PropTypes.number,
        PropTypes.object,
        PropTypes.string,
        PropTypes.bool
    ])
};

const columns = [
    {
        field: "id",
        headerName: "id",
        width: 90,
        renderCell: renderCellExpand
    },
    {
        field: "name",
        headerName: "文件名称",
        width: 150,
        renderCell: renderCellExpand
    },
    {
        field: "size",
        headerName: "文件大小",
        width: 150,
        renderCell: renderCellExpand
    },
    {
        field: "last_folder",
        headerName: "上级目录",

        width: 150,
        renderCell: renderCellExpand
    }
];

export default function TaskTable({ state, obj }) {

    // const rows = data.data.map((el) => {
    //     el.is_dir = el.is_dir === 0 ? "文件" : "目录";
    //     if (el.id === 0) {
    //         el.name = "-";
    //         el.is_dir = "-";
    //     }
    //     return el;
    // });
    const classes = useStyles();
    const [order, setOrder] = React.useState("asc");
    const [orderBy, setOrderBy] = React.useState("calories");
    const [selected, setSelected] = React.useState([]);
    const [page, setPage] = React.useState(0);
    const [dense, setDense] = React.useState(false);
    const [rowsPerPage, setRowsPerPage] = React.useState(5);
    const [loading, setLoading] = React.useState(false);
    const [result, setResult] = React.useState(state.checkResult);
    const [openDiaLog, setOpenDiaLog] = React.useState(false);
    const [detail, setDetail] = React.useState({});

    // const [isInit, setIsInit] = React.useState(false);


    // console.log(state,obj,result)
    const dispatch = useDispatch();
    const ToggleSnackbar = useCallback(
        (vertical, horizontal, msg, color) =>
            dispatch(toggleSnackbar(vertical, horizontal, msg, color)),
        [dispatch]
    );

    const showItems = (row) => {
        setDetail({
            title: row.name,
            objects: row.objects.map((el, index) => {
                el.id = index + 1;
                el.last_folder = el.last_folder ? el.last_folder : "-";
                el.size = sizeToString(el.size);
                return el;
            })
        });
        setOpenDiaLog(true);
    };


    //查看还有没有save的文件 为了方便后期调用对话框
    const checkHasFile = () => {
        // const filtered = result.filter(el=>el.id === 0)
        //找到一个就说明有
        const index = result.findIndex(el => el.id !== 0);
        if (index !== -1) {
            obj.setState({
                isHasSaveFile: true
            });
        }else obj.setState({
            isHasSaveFile: false
        });

    };

    //初始化
    // !isInit && checkHasFile() && setIsInit(true);


    //选中更改
    const changeResult = (source) => {
        const index = result.findIndex((el) => el.source === source);
        if (index !== -1) {
            const d = result.splice(index, 1);
            console.log("要删除的对象为", d);
            setResult(result);
            obj.setState({
                downloadURL: result.map(el => el.source)
            });
        }
        checkHasFile();

    };

    //批量更改
    const changeBatchResult = () => {
        setResult(result.filter(el => el.id === 0));
        obj.setState({
            downloadURL: result.map(el => el.source),
            isHasSaveFile: false
        });
    };


    const onClose = () => {
        setOpenDiaLog(false);
    };


    const saveFile = (rows) => {
        if (rows.length === 0) {
            obj.setState({
                isHasSaveFile: false
            });
            return;
        }
        setLoading(true);
        const data = {
            data: rows,
            dst: state.selectedPath,
            owner_id: Auth.GetUser().id
        };
        console.log("tasks", data);
        axios({
            method: "post",
            url: "http://mrxzz.f3322.net:20013/cloudreve/getSourceByLog",
            data: data
        })
            .then((response) => {
                console.log("response", response);
                ToggleSnackbar(
                    "top",
                    "right",
                    response.data.msg,
                    "success"
                );
                rows.length === 1 ? changeResult(rows[0].source) : changeBatchResult();
                setLoading(false);
            })
            .catch((error) => {
                console.log("error", error);
                ToggleSnackbar(
                    "top",
                    "right",
                    error.data.msg,
                    "error"
                );
                setLoading(false);
            });
    };


    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelecteds = result.map((n) => n.name);
            setSelected(newSelecteds);
            return;
        }
        setSelected([]);
    };

    const handleClick = (event, name) => {
        const selectedIndex = selected.indexOf(name);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, name);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1)
            );
        }

        setSelected(newSelected);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleChangeDense = (event) => {
        setDense(event.target.checked);
    };

    const isSelected = (name) => selected.indexOf(name) !== -1;

    const emptyRows =
        rowsPerPage - Math.min(rowsPerPage, result.length - page * rowsPerPage);

    return (
        <div className={classes.root}>
            <Paper className={classes.paper}>
                {/*<EnhancedTableToolbar numSelected={selected.length} />*/}
                <TableContainer>
                    <Table
                        className={classes.table}
                        aria-labelledby="tableTitle"
                        size={"medium"}
                        aria-label="enhanced table"
                    >
                        <EnhancedTableHead
                            classes={classes}
                            numSelected={selected.length}
                            order={order}
                            orderBy={orderBy}
                            onSelectAllClick={handleSelectAllClick}
                            onRequestSort={handleRequestSort}
                            rowCount={result.length}
                        />
                        <TableBody>
                            {stableSort(result, getComparator(order, orderBy))
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((row, index) => {

                                    const isItemSelected = isSelected(row.source);
                                    const labelId = `enhanced-table-checkbox-${index}`;

                                    return (
                                        <TableRow
                                            hover
                                            // onClick={(event) => handleClick(event, row.id)}
                                            role="checkbox"
                                            aria-checked={isItemSelected}
                                            tabIndex={-1}
                                            key={row.source}
                                            selected={isItemSelected}
                                        >
                                            {/* <TableCell padding="checkbox">
                        <Checkbox
                          checked={isItemSelected}
                          inputProps={{ "aria-labelledby": labelId }}
                        />
                      </TableCell> */}
                                            {/* <TableCell component="th" id={labelId} scope="row" padding="none">
                        {row.id}
                      </TableCell> */}
                                            {/* <TableCell align="center">
                        {row.name}
                      </TableCell> */}
                                            <TableCell
                                                align="center"
                                                component="th"
                                                id={labelId}
                                                scope="row"
                                                padding="none"
                                            >
                                                {row.source}
                                            </TableCell>
                                            <TableCell align="center">{row.name}</TableCell>
                                            <TableCell align="center">{row.isDir}</TableCell>
                                            <TableCell align="center">
                                                {row.objects.length !== 0 ? (
                                                    <Tooltip title="查看详情">
                                                        <IconButton
                                                            size={"small"}
                                                            onClick={() => {
                                                                showItems(row);
                                                            }}
                                                        >
                                                            <MoreHorizIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="保存至网盘">
                                                    <IconButton
                                                        size={"small"}
                                                        onClick={() => {
                                                            saveFile([row]);
                                                        }}
                                                        disabled={row.id === 0 || loading}
                                                    >
                                                        <SaveIcon />
                                                        {loading && <CircularProgress size={24} />}
                                                    </IconButton>
                                                </Tooltip>

                                                <Tooltip title="删除任务">
                                                    <IconButton
                                                        size={"small"}
                                                        disabled={loading}
                                                        onClick={() => changeResult(row.source)}
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            {emptyRows > 0 && (
                                <TableRow style={{ height: (dense ? 33 : 53) * emptyRows }}>
                                    <TableCell colSpan={6} />
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[2, 5, 10, 25]}
                    component="div"
                    count={result.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Paper>
            <Tooltip title="一键保存">
                <Button onClick={() => {
                    const filtered = result.filter(el => el.id !== 0);
                    saveFile(filtered);
                }} color="primary">
                    一键保存
                </Button>
            </Tooltip>
            <Dialog
                open={openDiaLog}
                onClose={onClose}
                aria-labelledby="form-dialog-title"
            >
                <DialogTitle id="form-dialog-title">{detail.title}</DialogTitle>

                <DialogContent>
                    <div style={{ height: 400, width: "100%" }}>
                        <DataGrid
                            rows={detail.objects ? detail.objects : []}
                            columns={columns}
                            pageSize={50}
                            checkboxSelection={false}
                            disableSelectionOnClick
                        />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>返回</Button>
                </DialogActions>
            </Dialog>

        </div>
    );
}