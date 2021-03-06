import React, { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { toggleSnackbar } from "../../actions";
import OpenIcon from "@material-ui/icons/OpenInNew";
import Pagination from "@material-ui/lab/Pagination";
import FolderIcon from "@material-ui/icons/Folder";

import {
    Tooltip,
    Card,
    Avatar,
    CardHeader,
    Typography,
    Grid,
    IconButton
} from "@material-ui/core";
import API from "../../middleware/Api";
import TypeIcon from "../FileManager/TypeIcon";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import { useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import { useLocation } from "react-router";
import TimeAgo from "timeago-react";
import axios from "axios";
import Auth from "../../middleware/Auth";

const useStyles = makeStyles((theme) => ({
    cardContainer: {
        padding: theme.spacing(1)
    },
    card: {
        maxWidth: 400,
        margin: "0 auto"
    },
    actions: {
        display: "flex"
    },
    layout: {
        width: "auto",
        marginTop: "50px",
        marginLeft: theme.spacing(3),
        marginRight: theme.spacing(3),
        [theme.breakpoints.up(1100 + theme.spacing(3) * 2)]: {
            width: 1100,
            marginLeft: "auto",
            marginRight: "auto"
        }
    },
    shareTitle: {
        maxWidth: "200px"
    },
    avatarFile: {
        backgroundColor: theme.palette.primary.light
    },
    avatarFolder: {
        backgroundColor: theme.palette.secondary.light
    },
    gird: {
        marginTop: "30px"
    },
    loadMore: {
        textAlign: "right",
        marginTop: "20px",
        marginBottom: "40px"
    },
    badge: {
        marginLeft: theme.spacing(1),
        height: 17
    },
    orderSelect: {
        textAlign: "right",
        marginTop: 5
    }
}));

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

export default function SearchResult() {
    const classes = useStyles();
    const dispatch = useDispatch();

    const query = useQuery();
    const location = useLocation();
    const history = useHistory();

    const ToggleSnackbar = useCallback(
        (vertical, horizontal, msg, color) =>
            dispatch(toggleSnackbar(vertical, horizontal, msg, color)),
        [dispatch]
    );

    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [shareList, setShareList] = useState([]);
    const [orderBy, setOrderBy] = useState("created_at DESC");
    const [time, setTime] = useState(0);
    const [loading, setLoading] = useState(false);


    //??????
    const search = useCallback((keywords, page, orderBy) => {
        const order = orderBy.split(" ");
        const start = new Date().getTime();
        setLoading(true);
        axios({
            method: "get",
            url: "http://mrxzz.f3322.net:20013/cloudreve" + "/share?page=" +
                page +
                "&order_by=" +
                order[0] +
                "&order=" +
                order[1] +
                "&owner_id=" + Auth.GetUser().id + "&keywords=" + keywords + "&keywordsField=source_name"
        })
            // API.get(
            //     "/share/search?page=" +
            //         page +
            //         "&order_by=" +
            //         order[0] +
            //         "&order=" +
            //         order[1] +
            //         "&keywords=" +
            //         encodeURIComponent(keywords)
            // )
            .then((response) => {
                const end = new Date().getTime();
                setTime((end - start) / 1000);
                if (response.data.data.items.length === 0) {
                    ToggleSnackbar(
                        "top",
                        "right",
                        "??????????????????????????????",
                        "info"
                    );
                }
                setTotal(response.data.data.total);
                setShareList(response.data.data.items);
                setLoading(false);


            })
            .catch(() => {
                ToggleSnackbar("top", "right", "????????????", "error");
            });
    }, []);

    useEffect(() => {
        const keywords = query.get("keywords");
        if (keywords) {
            search(keywords, page, orderBy);
        } else {
            ToggleSnackbar("top", "right", "????????????????????????", "warning");
        }
    }, [location]);

    const handlePageChange = (event, value) => {
        setPage(value);
        const keywords = query.get("keywords");
        search(keywords, value, orderBy);
    };

    const handleOrderChange = (event) => {
        setOrderBy(event.target.value);
        const keywords = query.get("keywords");
        search(keywords, page, event.target.value);
    };

    const getSearchInfo = () => {
        console.log("time_use",time)
        const newText =  `??????<strong><em>${query.get("keywords")}</em></strong>??????:    ??????????????????<strong><em>${total}</em></strong>?????????,??????<strong><em>${time}</em></strong>s`;
        return (<span dangerouslySetInnerHTML={{ __html: newText }} />)
    };

    return (
        <div className={classes.layout}>
            <Grid container>
                <Grid sm={6} xs={6}>
                    {!loading && (<Typography color="textSecondary" variant="h6">
                        {getSearchInfo()}
                    </Typography>)}
                </Grid>
                <Grid sm={6} xs={6} className={classes.orderSelect}>
                    <FormControl>
                        <Select
                            color={"secondary"}
                            onChange={handleOrderChange}
                            value={orderBy}
                        >
                            <MenuItem value={"created_at DESC"}>
                                ????????????????????????
                            </MenuItem>
                            <MenuItem value={"created_at ASC"}>
                                ????????????????????????
                            </MenuItem>
                            <MenuItem value={"downloads DESC"}>
                                ????????????????????????
                            </MenuItem>
                            <MenuItem value={"downloads ASC"}>
                                ????????????????????????
                            </MenuItem>
                            <MenuItem value={"views DESC"}>
                                ????????????????????????
                            </MenuItem>
                            <MenuItem value={"views ASC"}>
                                ????????????????????????
                            </MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
            <Grid container spacing={24} className={classes.gird}>
                {shareList.map((value) => (
                    <Grid
                        item
                        xs={12}
                        sm={4}
                        key={value.id}
                        className={classes.cardContainer}
                    >
                        <Card className={classes.card}>
                            <CardHeader
                                avatar={
                                    <div>
                                        {!value.is_dir && (
                                            <TypeIcon
                                                fileName={
                                                    value.source
                                                        ? value.source.name
                                                        : ""
                                                }
                                                isUpload
                                            />
                                        )}{" "}
                                        {value.is_dir && (
                                            <Avatar
                                                className={classes.avatarFolder}
                                            >
                                                <FolderIcon />
                                            </Avatar>
                                        )}
                                    </div>
                                }
                                action={
                                    <Tooltip placement="top" title="??????">
                                        <IconButton
                                            onClick={() =>
                                                history.push("/s/" + value.key)
                                            }
                                        >
                                            <OpenIcon />
                                        </IconButton>
                                    </Tooltip>
                                }
                                title={
                                    <Tooltip
                                        placement="top"
                                        title={
                                            value.source
                                                ? value.source.name
                                                : "[?????????????????????]"
                                        }
                                    >
                                        <Typography
                                            noWrap
                                            className={classes.shareTitle}
                                        >
                                            {value.source
                                                ? value.source.name
                                                : "[?????????????????????]"}{" "}
                                        </Typography>
                                    </Tooltip>
                                }
                                subheader={
                                    <span>
                                        ?????????{" "}
                                        <TimeAgo
                                            datetime={value.create_date}
                                            locale="zh_CN"
                                        />
                                    </span>
                                }
                            />
                        </Card>
                    </Grid>
                ))}
            </Grid>
            <div className={classes.loadMore}>
                <Pagination
                    count={Math.ceil(total / 18)}
                    onChange={handlePageChange}
                    color="secondary"
                />
            </div>
            {" "}
        </div>
    );
}
