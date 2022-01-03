//
//  事件中心管理
//  支持的事件
//  ColumnsWidthChanged  columns 宽度改变时触发
//  RowHeightChanged     行高改变
//  FrozenChanged        冻结行列改变时触发

export function useEventManager() {
  let evenList = {};

  function $on(eventName: string, callback: Function) {
    evenList[eventName]
      ? evenList[eventName].push(callback)
      : (evenList[eventName] = [callback]);
    let isSubscribed = true; // 注册凭证

    return function unsubscribe() {
      if (!isSubscribed) {
        // 防止 unsubscribe 被多次执行
        return;
      }
      isSubscribed = false;

      // 找到队列中的函数，剔除
      const index = evenList[eventName].indexOf(callback);
      evenList[eventName].splice(index, 1);
    };
  }

  function $emit(eventName: string, ...args) {
    if (evenList[eventName]) {
      evenList[eventName].map(function (cb) {
        cb(...args);
      });
    }
  }

  function destroy() {
    evenList = {};
  }

  return {
    $on,
    $emit,
    destroy,
  };
}
