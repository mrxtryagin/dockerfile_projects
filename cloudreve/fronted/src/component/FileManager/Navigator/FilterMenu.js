import React, { useCallback } from "react";
import IconButton from "@material-ui/core/IconButton";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import FormControl from "@material-ui/core/FormControl";
import FormLabel from "@material-ui/core/FormLabel";
import Select from "@material-ui/core/Select";
import TextField from "@material-ui/core/TextField";
import Input from "@material-ui/core/Input";
import ListSubheader from "@material-ui/core/ListSubheader";
import InputLabel from "@material-ui/core/InputLabel";
import InputBase from "@material-ui/core/InputBase";
import { makeStyles } from "@material-ui/core/styles";
import Slider from "@material-ui/core/Slider";
import Grid from "@material-ui/core/Grid";
import RefreshIcon from "@material-ui/icons/Refresh";
import FilterListIcon from '@material-ui/icons/FilterList';
import { useDispatch, useSelector } from "react-redux";
import { toggleSnackbar } from "../../../actions";
import axios from "axios";
import Button from "@material-ui/core/Button";
import Auth from "../../../middleware/Auth";
import {
    setNavigatorLoadingStatus
} from "../../../actions/index";
import { updateFileList, updateSearchTime } from "../../../redux/explorer/action";
import API from "../../../middleware/Api";

const useStyles = makeStyles((theme) => ({
    container: {
        display: "flex",
        flexWrap: "wrap"
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120
    },
    margin: {
        margin: theme.spacing(1)
    },
    root: {
        display: "flex",
        flexWrap: "wrap"
    },

}));

const ITEM_HEIGHT = 48;
const min = 1;
const max = 10000;

export default function FilterMenu() {
    const classes = useStyles();
    const dispatch = useDispatch();
    const keywords = useSelector(
        (state) => state.explorer.keywords
    );

    const SetNavigatorLoadingStatus = useCallback(
        (status) => dispatch(setNavigatorLoadingStatus(status)),
        [dispatch]
    );

    const UpdateFileList = useCallback(
        (status) => dispatch(updateFileList(status)),
        [dispatch]
    );

    const UpdateSearchTime = useCallback(
        (time) => dispatch(updateSearchTime(time)),
        [dispatch]
    );

    const ToggleSnackbar = useCallback(
        (vertical, horizontal, msg, color) =>
            dispatch(toggleSnackbar(vertical, horizontal, msg, color)),
        [dispatch]
    );


    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);

    const [fileFilter, setFileFilter] = React.useState(2);
    const [showNum, setShowNum] = React.useState(200);
    const [range, setRange] = React.useState([1000, 2000]);

    const handleChange1 = (event) => {
        setFileFilter(event.target.value);
    };

    const handleInputChange = (event) => {
        const result = event.target.value === "" ? min : Number(event.target.value);
        if (result <= min) {
            event.target.name === "left"
                ? setRange([min, range[1]])
                : setRange([min, range[0]]);
        } else if (result >= max) {
            event.target.name === "left"
                ? setRange([range[1], max])
                : setRange([range[0], max]);
        } else {
            event.target.name === "left"
                ? result > range[1]
                ? setRange([range[1], result])
                : setRange([result, range[1]])
                : result > range[0]
                ? setRange([range[0], result])
                : setRange([result, range[0]]);
        }
    };

    const handleChange2 = (event) => {
        setShowNum(event.target.value);
    };

    const reset = () => {
        setRange([1000, 2000]);
    };

    const handleBlur = (event) => {
        const result = event.target.value === "" ? min : Number(event.target.value);
        if (result <= min) {
            event.target.value = min;
            handleInputChange(event);
        } else if (result >= max) {
            event.target.value = max;
            handleInputChange(event);
        }
    };

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    //过滤数据
    const filter =()=>{
        SetNavigatorLoadingStatus(true);
        const start = new Date().getTime()
        const data = {
            fileType:fileFilter,
            showNum: showNum,
            range: showNum === -2?range:undefined
        };

        console.log("filter_data", data);
        // axios({
        //     method: "post",
        //     url: "http://mrxzz.f3322.net:20013/cloudreve" + "/search/"+keywords+"/"+"/currentId/"+Auth.GetUser().id,
        //     data: data
        // })
        const url = "/file/search/"
        API.post(url + encodeURIComponent(keywords),data)
            .then((response) => {
                const end = new Date().getTime()
                console.log("时间差为",(end-start))
                UpdateSearchTime((end-start)/1000)
                UpdateFileList(response.data.objects)
                SetNavigatorLoadingStatus(false);
                ToggleSnackbar("top", "right", "筛选成功!", "success");


            })
            .catch((error) => {
                ToggleSnackbar("top", "right","筛选失败!", `error:${error}`);
                SetNavigatorLoadingStatus(false);
            });
    }

    const onClose = ()=>{
        setFileFilter(2)
        setShowNum(200)
        setRange([1000,2000])
    }



    // 关闭时 筛选
    const handleClose = () => {
        setAnchorEl(null);
    };
    const handleChange3 = (event, newValue) => {
        setRange(newValue);
    };

    return (
        <>
            <IconButton
                aria-label="more"
                aria-controls="long-menu"
                aria-haspopup="true"
                onClick={handleClick}
                size = {"small"}
            >
                <FilterListIcon />
            </IconButton>
            <Menu
                id="long-menu"
                anchorEl={anchorEl}
                keepMounted
                open={open}
                onClose={handleClose}
                PaperProps={{
                    style: {
                        maxHeight: ITEM_HEIGHT * 4.5,
                        width: "20ch"
                    }
                }}
            >
                <>
                    <FormControl className={classes.formControl}>
                        <InputLabel id="demo-dialog-select-label">筛选类型</InputLabel>
                        <Select
                            labelId="demo-dialog-select-label"
                            id="demo-dialog-select"
                            value={fileFilter}
                            onChange={handleChange1}
                            input={<Input />}
                        >
                            <MenuItem value={0}>文件</MenuItem>
                            <MenuItem value={1}>文件夹</MenuItem>
                            <MenuItem value={2}>文件和文件夹</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl className={classes.formControl}>
                        <InputLabel id="demo-dialog-select-label">显示数量</InputLabel>
                        <Select
                            labelId="demo-dialog-select-label"
                            id="demo-dialog-select"
                            value={showNum}
                            onChange={handleChange2}
                            input={<Input />}
                        >
                            <MenuItem value={10}>前10条</MenuItem>
                            <MenuItem value={50}>前50条</MenuItem>
                            <MenuItem value={100}>前100条</MenuItem>
                            <MenuItem value={200}>前200条</MenuItem>
                            <MenuItem value={400}>前400条</MenuItem>
                            <MenuItem value={500}>前600条</MenuItem>
                            <MenuItem value={800}>前800条</MenuItem>
                            <MenuItem value={1000}>前1000条</MenuItem>
                            <MenuItem value={-2}>自定义</MenuItem>
                            <MenuItem value={-1}>全部</MenuItem>
                        </Select>
                    </FormControl>
                    {showNum === -2 && (
                        <div>
                            <Grid container spacing={3}>
                                <Grid item xs>
                                    <Input

                                        margin="dense"
                                        name="left"
                                        onChange={handleInputChange}
                                        value={range[0]}
                                        inputProps={{
                                            min: min,
                                            max: max,
                                            type: "number",
                                            "aria-labelledby": "input-slider"
                                        }}
                                        variant="outlined"
                                    />
                                </Grid>
                                <Grid item>~</Grid>
                                <Grid item xs>
                                    <Input

                                        value={range[1]}
                                        margin="dense"
                                        name="right"
                                        onChange={handleInputChange}
                                        inputProps={{
                                            min: min,
                                            max: max,
                                            type: "number",
                                            "aria-labelledby": "input-slider"
                                        }}
                                        variant="outlined"
                                    />
                                </Grid>
                            </Grid>
                            <Grid container spacing={1}>
                                <Grid item>
                                    <IconButton onClick={reset} size={"small"}>
                                        <RefreshIcon />
                                    </IconButton>
                                </Grid>
                                <Grid item xs>
                                    <Slider

                                        value={range}
                                        onChange={handleChange3}
                                        valueLabelDisplay="auto"
                                        aria-labelledby="range-slider"
                                        with="auto"
                                        min={min}
                                        max={max}
                                    />
                                </Grid>
                            </Grid>
                        </div>
                    )}
                </>
                <Button onClick={()=>{handleClose()}} color="default">
                    取消
                </Button>
                <Button onClick={()=>{filter()}}  color="primary">
                    应用
                </Button>
            </Menu>
        </>
    );
}
