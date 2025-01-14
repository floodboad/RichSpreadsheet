//  单元格数据验证

//  逻辑为
//  页面初始化的时候调用 useDataVerification 根据数据和 column 里面的数据验证规则
//  判断每一个 cell 是否通过了验证, 如果 未 通过验证, 则生成一个对应的缓存数据, 具体请看 useDataVerification 逻辑实现
//  当 cell 渲染之后, 调用 DataVerificationRenderRedTriangleIfDataVerificationFailed 来显示左上角的红色三角形
//  当 用户 点击单元格时, 显示对应的验证失败消息
//  当 用户 更新或者切换数据时候, 缓存重建
//  页面滚动或者点击等等事件触发时候, 删除对应 dom
//  全局搜索 removeDataVerificationTooltip 方法
//  这些未通过验证的 单元格, 在更新事件触发时, 不会响应

import { cell, column } from "../../customCell/types";
import type { CellRenderersParams } from "../../customCell/types";
import { rowLocationByIndex, colLocationByIndex } from "../../global/location";
import luckysheetConfigsetting from "../luckysheetConfigsetting";
import freezen from "../freezen";
import {
  getColumnByColIndex,
  getColumnById,
  getCurrentSheet,
  getRowIdByRowIndex,
} from "../../global/apiHelper";
import Store from "../../store";

enum ClassName {
  NAME = "rich-spreadsheet-cell-data-verification",
}

declare global {
  //  添加 window 上的全局变量
  interface Window {
    richSpreadSheetDataVerificationCache: Record<
      string,
      Array<{
        pattern: string;
        value: string;
        errorMessage: string;
      }>
    >;
  }
}

type FileData = {
  column: column[];
  data: cell[][];
};

window.richSpreadSheetDataVerificationCache =
  window.richSpreadSheetDataVerificationCache ?? {};

function dataValidate(pattern: string, value) {
  /*
    let str = item.replace(/^\/(.*)\/([a-z]*)$/, '$1')
    let args = item.replace(/^\/(.*)\/([a-z]*)$/, '$2')
    return new RegExp(str, args)
  * */
  try {
    const regexpObj = new RegExp(pattern.trim());

    return regexpObj.test(value);
  } catch (e) {
    console.log("数据验证,正则执行错误", { pattern, value });
    return false;
  }
}

function removeDom() {
  $(`.${ClassName.NAME}`).remove();
}

export function removeDataVerificationTooltip() {
  removeDom();
}

export function detectIsPassDataVerificationByIndex(rowIndex, colIndex) {
  const rowId = getRowIdByRowIndex(rowIndex);
  const { id: colId } = getColumnByColIndex(colIndex);
  return detectIsPassDataVerificationById(rowId, colId);
}

export function detectIsPassDataVerificationById(rowId, colId) {
  if (window.richSpreadSheetDataVerificationCache[`${rowId}_${colId}`]) {
    return (
      window.richSpreadSheetDataVerificationCache[`${rowId}_${colId}`]
        .length === 0
    );
  } else {
    return true;
  }
}

export function getDataVerificationByIndex(rowIndex, colIndex) {
  const rowId = getRowIdByRowIndex(rowIndex);
  const { id: colId } = getColumnByColIndex(colIndex);
  return window.richSpreadSheetDataVerificationCache[`${rowId}_${colId}`]
    ? window.richSpreadSheetDataVerificationCache[`${rowId}_${colId}`]
    : [];
}

/**
 * 重新检测指定 cell 是否通过验证
 * @param rowIndex
 * @param colIndex
 * @param v
 */
export function reVerificationSpecificCellByIndex(
  rowIndex,
  colIndex,
  v = undefined
) {
  let file: FileData = getCurrentSheet();
  if (file.data[rowIndex][colIndex] === null) return;
  const rowId = getRowIdByRowIndex(rowIndex);
  const { id: colId } = getColumnByColIndex(colIndex);
  const column = getColumnById(colId);
  const key = `${rowId}_${colId}`;
  const value = v === undefined ? file.data[rowIndex][colIndex].v : v;

  if (!column.dataVerification) return;

  if (window.richSpreadSheetDataVerificationCache[key]) {
    window.richSpreadSheetDataVerificationCache[key] = [];
  }

  column.dataVerification.map(({ pattern, errorMessage }) => {
    let isPassed = dataValidate(pattern, value);

    if (!isPassed) {
      const info = {
        pattern: pattern,
        value: value,
        errorMessage: errorMessage,
      };
      if (window.richSpreadSheetDataVerificationCache[key]) {
        window.richSpreadSheetDataVerificationCache[key].push(info);
      } else {
        window.richSpreadSheetDataVerificationCache[key] = [info];
      }
    }
  });
}

export function useDataVerificationBuildCache() {
  let file: FileData = getCurrentSheet();

  //  清空
  window.richSpreadSheetDataVerificationCache = {};

  //  构建验证缓存, 避免每次 render 时候都重新执行 正则验证
  for (let row = 0; row < file.data.length; row++) {
    for (let col = 0; col < file.column.length; col++) {
      const column = file.column[col];
      if (column.dataVerification && column.dataVerification.length > 0) {
        if (file.data[row][col] === null) continue;

        const value = file.data[row][col].v;
        if (value !== null) {
          column.dataVerification.map(({ pattern, errorMessage }) => {
            let isPassed = dataValidate(pattern, value);
            const rowId = getRowIdByRowIndex(row);
            const { id: colId } = getColumnByColIndex(col);
            const key = `${rowId}_${colId}`;

            if (!isPassed) {
              const info = {
                pattern: pattern,
                value: value,
                errorMessage: errorMessage,
              };
              if (window.richSpreadSheetDataVerificationCache[key]) {
                window.richSpreadSheetDataVerificationCache[key].push(info);
              } else {
                window.richSpreadSheetDataVerificationCache[key] = [info];
              }
            }
          });
        }
      }
    }
  }
}

/**
 * 如果数据验证未通过时花个红色的三角
 * @constructor
 */
export function DataVerificationRenderRedTriangleIfDataVerificationFailed(
  CellRenderersParams: CellRenderersParams
) {
  const { rowIndex, colIndex, positionX, positionY, ctx } = CellRenderersParams;

  if (!detectIsPassDataVerificationByIndex(rowIndex, colIndex)) {
    const path = new Path2D();
    const w = 6;
    const h = 6;

    if (positionX + w >= Store.rowHeaderWidth) {
      path.moveTo(positionX, positionY);
      path.lineTo(positionX + w, positionY);
      path.lineTo(positionX, positionY + h);

      ctx.fillStyle = "#f20";
      ctx.fill(path);
    }
  }
}

export function useDataVerification(r, c) {
  const [row_pre, row, row_index] = rowLocationByIndex(r);
  const [col_pre, col, col_index] = colLocationByIndex(c);

  //  如果当前 cell 的验证信息已经显示了, 就直接跳过
  const existEl = $(`.${ClassName.NAME}`);
  if (existEl.length > 0) {
    if (
      parseInt(existEl.get(0).dataset.row) === row_index &&
      parseInt(existEl.get(0).dataset.col) === col_index
    ) {
      return;
    }
  }

  removeDom();

  const cache = getDataVerificationByIndex(row_index, col_index);
  //  判断是否有缓存, 如果没有的话代表验证通过, 无需继续执行
  if (!cache || cache.length === 0) return;

  const cellWidth = col - col_pre - 2;
  const cellHeight = row - row_pre - 1;
  const scrollLeft = $("#luckysheet-scrollbar-x").scrollLeft();
  const scrollTop = $("#luckysheet-scrollbar-y").scrollTop();
  const positionX =
    col - scrollLeft - cellWidth + luckysheetConfigsetting.rowHeaderWidth;
  const positionY =
    row - scrollTop - cellHeight + luckysheetConfigsetting.defaultRowHeight;

  //  构建 dom
  let el = document.createElement("section");
  el.classList.add(ClassName.NAME);
  el.dataset.row = row_index;
  el.dataset.col = col_index;

  const $el = $(el);
  let html = ``;

  cache.map((item) => {
    html += `<p style="font-size: 12px;margin-bottom:6px;"><span style="color:#f20">验证错误: </span><span>${item.errorMessage}</span></p>`;
  });

  $el.html(html);

  let left = positionX;
  let [newLeft, isNewColPreInFrozen, mainScrollLeft] =
    freezen.getAdaptOffsetLeftInfo(left);
  left = newLeft + (isNewColPreInFrozen ? mainScrollLeft : 0);

  let top = positionY + cellHeight;

  $el.css({
    position: "absolute",
    background: "#ffffff",
    padding: "6px 12px 0 12px",
    "box-shadow":
      "rgba(50, 50, 93, 0.25) 0px 6px 12px -2px, rgba(0, 0, 0, 0.3) 0px 3px 7px -3px",
    "border-radius": "2px",
    border: "1px solid #ccc",
    "z-index": 11,
    "font-size": "14px",
    "user-select": "auto",
    left: 0,
    top: 0,
    opacity: 0,
  });

  $el.appendTo($("#luckysheet"));

  //  边缘检测, 这里要放在 $el 插入 dom 后才能获取到实际的 size
  const { width: elWidth, height: elHeight } = $el
    .get(0)
    .getBoundingClientRect();
  const { width: boxWidth, height: boxHeight } = $("#luckysheet")
    .get(0)
    .getBoundingClientRect();

  //  右侧溢出
  if (left + elWidth + 20 > boxWidth) {
    left = positionX - elWidth;
  }

  //  底部溢出
  if (top + elHeight + 20 > boxHeight) {
    top = positionY - elHeight;
  }

  $(el).css({
    left,
    top,
  });

  $el.animate({ opacity: 1 }, { duration: 200 });
}

/**
 * 编辑输入时判断验证是否通过
 * 并且显示对应的未通过内容
 */
export function useDataVerificationOnInput(inputWrapDom, colIndex) {
  const $inputBox = $("#luckysheet-input-box");
  $inputBox
    .removeClass("on-error-data-verification")
    .removeClass("error-msg-stick-top");
  $inputBox.find(".error-message-box").remove();

  const column = getColumnByColIndex(colIndex);
  if (
    !column ||
    !column.dataVerification ||
    column.dataVerification.length === 0
  )
    return;

  //  判断是否能找到元素
  const $target =
    $(inputWrapDom).find("input").length === 0
      ? $(inputWrapDom).find("textarea")
      : $(inputWrapDom).find("input");
  if ($target.length === 0) return;

  //  监听事件
  $target.on("input", (ev) => {
    const target = ev.target as HTMLInputElement;
    const value = target.value;
    let unPassMsg = [];
    column.dataVerification.map(({ pattern, errorMessage }) => {
      let isPassed = dataValidate(pattern, value);
      if (!isPassed) {
        unPassMsg.push(errorMessage);
      }
    });

    let $errorSpan = $inputBox.find(".error-message-box");

    //  如果存在未通过信息则进行显示
    if (unPassMsg.length > 0) {
      if ($errorSpan.length === 0) {
        $inputBox.append('<div class="error-message-box" />');
        $errorSpan = $inputBox.find(".error-message-box");
      }

      $inputBox.addClass("on-error-data-verification");
      $errorSpan.text(unPassMsg[0]);

      //  溢出判断

      //  边缘检测, 这里要放在 $el 插入 dom 后才能获取到实际的 size
      const {
        width: elWidth,
        height: elHeight,
        top: elTop,
      } = $errorSpan.get(0).getBoundingClientRect();
      const {
        width: boxWidth,
        height: boxHeight,
        top: boxTop,
      } = $("#luckysheet").get(0).getBoundingClientRect();

      let top = elTop - boxTop;

      //  底部溢出
      if (top + elHeight + 20 > boxHeight) {
        $inputBox.addClass("error-msg-stick-top");
      }
    } else {
      $errorSpan.remove();
      $inputBox.removeClass("on-error-data-verification");
    }
  });
}
