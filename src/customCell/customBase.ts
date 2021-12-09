import Store from "../store";
import { getSheetIndex } from "../methods/get";
import formula from "../global/formula";
import type { CellRenderersParams } from "./types";

export class CustomBase {
  /**
   * 关闭编辑, 更新值
   */
  protected finishEdit() {
    if (Store.luckysheetCellUpdate.length > 0) {
      const [r, c] = Store.luckysheetCellUpdate;
      formula.updatecell(r, c);
    } else {
      console.log("无法找到当前 row_index 和 col_index", Store);
    }
  }

  /**
   * 停止编辑, 不会更新值
   */
  protected stopEdit() {
    formula.dontupdate();
  }

  /**
   * 在 render 时候显示一串额外的 dom
   */
  protected showDom() {
    //  todo 如何关闭? 什么时候关闭?
  }

  //  直接进入编辑状态
  protected startEdit(CellRenderersParams: CellRenderersParams) {
    const { colIndex: col, rowIndex: row } = CellRenderersParams;
    const currentSheet =
      Store.luckysheetfile[getSheetIndex(Store.currentSheetIndex)];
    const { visibledatacolumn, visibledatarow } = currentSheet;
    const columnX = visibledatacolumn[Math.max(0, col - 1)] + 20;
    const rowY = visibledatarow[Math.max(0, row - 1)] + 20;

    let event = $.Event("dblclick");
    let { left, top } = $("#" + Store.container).offset();
    event.target = $(".luckysheet-cell-sheettable").get(0);
    event.pageX = columnX + left + Store.rowHeaderWidth;
    event.pageY = rowY + top + Store.columnHeaderHeight;

    $(".luckysheet-cell-sheettable").trigger(event);
  }

  /**
   * 清理单元格内容
   */
  protected clearCell(CellRenderersParams: CellRenderersParams) {
    const { ctx, positionX, positionY, cellWidth, cellHeight } =
      CellRenderersParams;
    ctx.beginPath();
    ctx.save();
    ctx.rect(positionX, positionY, cellWidth - 1, cellHeight - 1);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.restore();
    ctx.closePath();
  }

  /**
   * 设置 Cell 的 clip 范围, 请务必在渲染后调用 remoteCellClip
   * @param CellRenderersParams
   */
  protected startCellClip(CellRenderersParams: CellRenderersParams) {
    const { ctx, positionX, positionY, cellWidth, cellHeight } =
      CellRenderersParams;
    ctx.save();
    ctx.beginPath();
    ctx.rect(positionX, positionY, cellWidth - 1, cellHeight - 1);
    ctx.clip();
  }

  /**
   * 清理 Cell 的 clip 范围
   * @param CellRenderersParams
   */
  protected closeCellClip(CellRenderersParams: CellRenderersParams) {
    const { ctx, positionX, positionY, cellWidth, cellHeight } =
      CellRenderersParams;
    ctx.closePath();
    ctx.restore();
  }
}