import { createColumnCellRendererParamsViaMouseDetail } from "./helper";

enum ClassName {
  NAME = "rich-spreadsheet-cell-extract-dom",
}

let timerRemove = null;
let timerShow = null;

function RenderDom(
  position: "left" | "right" | "top" | "bottom",
  DOM: HTMLElement,
  params
) {
  //  渲染 DOM
  const { rowIndex, colIndex, cellWidth } = params;

  let el = document.createElement("section");
  el.classList.add(ClassName.NAME);
  el.dataset.row = rowIndex;
  el.dataset.col = colIndex;

  const $el = $(el);
  $el.append(DOM);

  let top = 0;
  let left = 0;

  //  判断不同位置
  if (position === "bottom") {
    left = params.positionX;
    top = params.positionY + params.cellHeight;
  }
  if (position === "right") {
    left = params.positionX + cellWidth;
    top = params.positionY;
  }

  $el.css({
    position: "absolute",
    background: "#f0fdfb",
    "box-shadow":
      "rgba(50, 50, 93, 0.25) 0px 6px 12px -2px, rgba(0, 0, 0, 0.3) 0px 3px 7px -3px",
    "border-radius": "4px",
    border: "1px solid #ccc",
    "z-index": 99999,
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
    left = params.positionX - elWidth;
  }

  //  底部溢出
  if (top + elHeight + 20 > boxHeight) {
    top = params.positionY - elHeight;
  }

  $(el).css({
    left,
    top,
  });

  $el.animate({ opacity: 1 }, { duration: 200 });
}

/**
 * 判断当前的 dom 是否处于 hover 状态
 */
function isHover(event) {
  let el = document.elementFromPoint(event.pageX, event.pageY);
  if (
    el?.closest(`.${ClassName.NAME}`) ||
    el?.classList.contains(ClassName.NAME)
  ) {
    return true;
  }
}

function removeDom(event, force = false) {
  window.clearTimeout(timerRemove);

  if (force) {
    $(`.${ClassName.NAME}`).remove();
    return;
  }

  timerRemove = setTimeout(() => {
    if (isHover(event)) {
      return;
    }

    $(`.${ClassName.NAME}`).remove();
  }, 300);
}

export function removeCellExtractDom(event = null) {
  if (event) {
    removeDom(event);
  } else {
    removeDom(null, true);
  }
}

export function useShowCellExtractDomOnMouseEnter(mouseDetail, event) {
  window.clearTimeout(timerShow);
  timerShow = setTimeout(() => {
    //  如果不是在表格上的 mousemove 事件,直接关闭
    if (!event.target || !event.target.closest("#luckysheet-cell-main")) {
      removeDom(event);
      return;
    }

    //  如果找不到 dom
    if (!mouseDetail) {
      removeDom(event);
      return;
    }

    const [Render, params] =
      createColumnCellRendererParamsViaMouseDetail(mouseDetail);

    if (!params) {
      removeDom(event);
      return;
    }

    //  判断当前的 rich-spreadsheet-cell-extract-dom 是否存在
    const $existDom = $(`.${ClassName.NAME}`);
    if ($existDom.length > 0) {
      const row = $existDom.data("row");
      const col = $existDom.data("col");

      //  如果存在的话, 并且已经显示为当前 cell 了就什么不干
      if (row === params.rowIndex && col === params.colIndex) {
        return;
      } else {
        if (isHover(event)) {
          return;
        }
        //  否则删除
        removeDom(event, true);
      }
    }

    const DOM = Render.showExtractDomOnMouseEnter(params);
    if (DOM === false) return;

    if (DOM instanceof HTMLElement) {
      //  如果返回的是 DOM 默认渲染到底部
      RenderDom("bottom", DOM, params);
    } else {
      //  如果返回的是多个 DOM
      Object.keys(DOM).map((key) => {
        RenderDom(key, DOM[key], params);
      });
    }
  }, 200);
}
