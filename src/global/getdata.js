import { getObjType } from '../utils/util';
import { getSheetIndex } from '../methods/get';
import server from '../controllers/server';
import formula from './formula';
import editor from './editor';
import { dynamicArrayCompute } from './dynamicArray';
import sheetmanage from '../controllers/sheetmanage';
import Store from '../store';

//Get selection range value
export function getdatabyselection(range, sheetIndex) {
    if(range == null){
        range = Store.luckysheet_select_save[0];
    }

    if (range["row"] == null || range["row"].length == 0) {
        return [];
    }

    //取数据
    let d, cfg;
    if(sheetIndex != null && sheetIndex != Store.currentSheetIndex){
        d = Store.luckysheetfile[getSheetIndex(sheetIndex)]["data"];
        cfg = Store.luckysheetfile[getSheetIndex(sheetIndex)]["config"];
    }
    else{
        d = editor.deepCopyFlowData(Store.flowdata);
        cfg = Store.config;    
    }

    let data = [];

    for (let r = range["row"][0]; r <= range["row"][1]; r++) {
        if(d[r] == null){
            continue;
        }

        if (cfg["rowhidden"] != null && cfg["rowhidden"][r] != null) {
            continue;
        }

        let row = [];

        for (let c = range["column"][0]; c <= range["column"][1]; c++) {
            row.push(d[r][c]);
        }

        data.push(row);
    }

    return data;
}

export function getdatabyselectionD(d, range) {
    if (range == null || range["row"] == null || range["row"].length == 0) {
        return [];
    }
    
    let dynamicArray_compute = dynamicArrayCompute(Store.luckysheetfile[getSheetIndex(Store.currentSheetIndex)]["dynamicArray"]);
    let data = [];

    for (let r = range["row"][0]; r <= range["row"][1]; r++) {
        if(d[r] == null){
            continue;
        }

        if (Store.config["rowhidden"] != null && Store.config["rowhidden"][r] != null) {
            continue;
        }

        let row = [];

        for (let c = range["column"][0]; c <= range["column"][1]; c++) {
            let value;
            
            if((r + "_" + c) in dynamicArray_compute){
                value = dynamicArray_compute[r + "_" + c];
            }
            else{
                value = d[r][c];
            }

            row.push(value);
        }

        data.push(row);
    }

    return data;
}

export function getdatabyselectionNoCopy(range) {
    if (range == null || range["row"] == null || range["row"].length == 0) {
        return [];
    }

    let data = [];

    for (let r = range["row"][0]; r <= range["row"][1]; r++) {
        let row = [];
        
        if (Store.config["rowhidden"] != null && Store.config["rowhidden"][r] != null) {
            continue;
        }

        for (let c = range["column"][0]; c <= range["column"][1]; c++) {
            let value = "";

            if (Store.flowdata[r] != null && Store.flowdata[r][c] != null) {
                value = Store.flowdata[r][c];
            }

            row.push(value);
        }
        
        data.push(row);
    }

    return data;
}

//Get the value of the cell
export function getcellvalue(r, c, data, type) {
    if (type == null) {
        type = "v";
    }

    if (data == null) {
        data = Store.flowdata;
    }

    let d_value;

    if (r != null && c != null) {
        d_value = data[r][c];
    }
    else if (r != null) {
        d_value = data[r];
    }
    else if (c != null) {
        let newData = data[0].map(function(col, i) {
            return data.map(function(row) {
                return row[i];
            })
        });
        d_value = newData[c];
    }
    else {
        return data;
    }

    let retv = d_value;

    if(getObjType(d_value) == "object"){
        retv = d_value[type];

        if (type == "f" && retv != null) {
            retv = formula.functionHTMLGenerate(retv);
        }
        else if(type == "f") {
            retv = d_value["v"];
        }
        else if(d_value && d_value.ct && d_value.ct.fa == 'yyyy-MM-dd') {
            retv = d_value.m;
        }
    }

    if(retv == undefined){
        retv = null;
    }

    return retv;
}

//Data increase in rows and columns
export function datagridgrowth(data, addr, addc, iscallback) {
    if (addr <= 0 && addc <= 0) {
        return data;
    }

    if (addr <= 0) {
        addr = 0;
    }

    if (addc <= 0) {
        addc = 0;
    }

    let dataClen = 0;
    if (data.length == 0) {
        data = [];
        dataClen = 0;
    }
    else {
        dataClen = data[0].length;
    }

    let coladd = [];//需要额外增加的空列
    for (let c = 0; c < addc; c++) {
        coladd.push(null);
    }

    let rowadd = [];//完整的一个空行
    for (let r = 0; r < dataClen + addc; r++) {
        rowadd.push(null);
    }

    for (let r = 0; r < data.length; r++) {
        data[r] = [].concat(data[r].concat(coladd));
    }

    for (let r = 0; r < addr; r++) {
        data.push([].concat(rowadd));
    }

    if(!!iscallback){
        server.saveParam("all", Store.currentSheetIndex, data.length, { "k": "row" });
        server.saveParam("all", Store.currentSheetIndex, data[0].length, { "k": "column" });
    }

    return data;
}


//Get the formula of the cell
export function getcellFormula(r, c, i, data) {
    let cell;
    if(data!=null){
        cell = data[r][c];
    }
    else{
        cell = getOrigincell(r,c,i);
    }

    
    if(cell==null){
        return null;
    }

    return cell.f;
}


export function getOrigincell(r, c, i) {
    if(r==null || c==null){
        return;
    }
    let data;
    if (i == null) {
        data = Store.flowdata;
    }
    else{
        let sheet = sheetmanage.getSheetByIndex(i);
        data = sheet.data;
    }

    if(data==null){
        return;
    }

    return data[r][c];


}

export function getRealCellValue(r, c){
    let value = getcellvalue(r, c, null, "m");
    if(value == null){
        value = getcellvalue(r, c);
        if(value==null){
            let ct = getcellvalue(r, c, null, "ct");
            if(ct!=null && ct.t=="inlineStr" && ct.s!=null && ct.s.length>0){
                value = ct.s;
            }
        }
    }

    return value;
}