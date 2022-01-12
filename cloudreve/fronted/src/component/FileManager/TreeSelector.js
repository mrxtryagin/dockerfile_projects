import React, { Component } from "react";
import PropTypes from "prop-types";
import FolderIcon from "@material-ui/icons/Folder";
import RightIcon from "@material-ui/icons/KeyboardArrowRight";
import UpIcon from "@material-ui/icons/ArrowUpward";
import Tree, { TreeNode } from 'rc-tree';
import cssAnimation from 'css-animation';
import { toggleSnackbar } from "../../actions";
import { connect } from "react-redux";
import { withStyles } from "@material-ui/core";


const styles = (theme) => ({
    iconWhite: {
        color: theme.palette.common.white,
    },
    selected: {
        backgroundColor: theme.palette.primary.main + "!important",
        "& $primary, & $icon": {
            color: theme.palette.common.white,
        },
    },
    primary: {},
    icon: {},
    buttonIcon: {},
    selector: {
        minWidth: "300px",
    },
    container: {
        maxHeight: "330px",
        overflowY: " auto",
    },
});

const mapStateToProps = (state) => {
    return {
        keywords: state.explorer.keywords,
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        toggleSnackbar: (vertical, horizontal, msg, color) => {
            dispatch(toggleSnackbar(vertical, horizontal, msg, color));
        },
    };
};


class TreeSelectorCompoment extends Component{
    // 更新全局json
    state = {
        treeData: [],
        checkedKeys: [],
    };

    onSelect = info => {
        console.log('selected', info);
    };



    //动态树动态创建节点方法
   createDynamicNode = (treeData,eventKey) =>{
        treeData.forEach(function(item){
            if(item.child!=null){
                this.createDynamicNode(item.child,eventKey);
            }else{
                if(eventKey==item.key){
                    item.child=[
                        {title: '子节点1', key: '0-0-1-0',level:2},
                        {title: '子节点2', key: '0-0-1-1',level:2}
                    ]
                }
            }
        });

    }

    //设置默认数据类型

    //设置默认属性值




    onExpand = (expandedKeys) =>{
        console.log('onExpand');

    }

    onCheck = (checkedKeys, info) =>{
        console.log('onCheck', checkedKeys, info);
    }



    onLoadData = treeNode => {
        return new Promise((resolve) => {
            if(treeNode.props.children!=null&&treeNode.props.children.length>0){
                resolve();
            }else{
                setTimeout(() => {
                    const treeData=this.state.treeData;
                    //动态加载树节点
                    this.createDynamicNode(treeData,treeNode.props.eventKey);
                    this.setState({ treeData });
                    resolve();
                },500);
            }
        });
    };
   
    render() {
        const { classes } = this.props;
        //循环递归展开树
        function findChild(node){
            if(node!=null){
                if(node.child!=null){
                    const str=node.child.map(function(n){
                        return(
                            <TreeNode title={n.title} key={n.key}>{findChild(n)}</TreeNode>
                        );
                    })
                    return str;
                }
            }
        }
        //先查出根节点
        function findRoot(treeData) {
            const nodeStr=treeData.map(function(node){
                return (
                    <TreeNode title={node.title} key={node.key}>{findChild(node)}</TreeNode>
                );
            });
            return nodeStr;
        }


        const dynamicNodeList=(
            <TreeNode title="根节点" key="0-0">
                {findRoot(this.state.treeData)}
            </TreeNode>
        );





        //defaultExpandAll 默认全部展开
        //showline  显示树中的虚线
        //checkable 提供复选框功能
        //onExpand 树展开后的回调  onSelect 树选中后的回调  onCheck 树选择的回调
        //onLoadData 动态加载树
        //openAnimation 展开节点时动画函数
        return (
            <div className={classes.container} >
            <Tree
                className="myCls"
                onExpand={this.onExpand}
                onSelect={this.onSelect}
                onCheck={this.onCheck}
                loadData={this.onLoadData}
            >
                {dynamicNodeList}
            </Tree>
        </div>);
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(withStyles(styles)(TreeSelectorCompoment));


