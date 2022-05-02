// 先定义三个常量表示状态
var PENDING = 'pending';
var FULFILLED = 'fulfilled';
var REJECTED = 'rejected';

class MyPromise {
  constructor(executor) {
    // 初始化状态，为pending
    this.status = PENDING;

    // 结果/原因
    this.value = undefined;
    this.reason = undefined;

    // 用于存储回调函数
    this.onResolvedCallbacks = [];
    this.onRejectedCallbacks = [];


    // 修改状态，并执行成功回调
    let resolve = (value) => {
      // 只有状态是等待，才执行状态修改
      if (this.status === PENDING) {
        // 状态修改为成功，并保存值
        this.status = FULFILLED;
        this.value = value;
        // 执行回调
        this.onResolvedCallbacks.forEach(fn => fn());
      }
    }

    // 修改状态，并执行失败回调
    let reject = (reason) => {
      // 只有状态是等待，才执行状态修改
      if (this.status === PENDING) {
        // 状态修改为失败，并保存原因
        this.status = REJECTED;
        this.reason = reason;
        // 执行回调
        this.onRejectedCallbacks.forEach(fn => fn());
      }
    }

    try {
      // 立即执行，将 resolve 和 reject 函数传给使用者  
      executor(resolve, reject)
    } catch (error) {
      reject(error)
    }
  }

  // 执行回调
  then(onFulfilled, onRejected) {
    //解决 onFufilled，onRejected 没有传值的问题
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : v => v;
    //因为错误的值要让后面访问到，所以这里也要跑出个错误，不然会在之后 then 的 resolve 中捕获
    onRejected = typeof onRejected === 'function' ? onRejected : err => { throw err };

    // 每次调用 then 都返回一个新的 promise
    let promise2 = new Promise((resolve, reject) => {
      if (this.status === FULFILLED) {
        process.nextTick(() => { // 状态变化，添加微任务
          try {
            // 得到then方法的返回值
            let x = onFulfilled(this.value);
            resolvePromise(promise2, x, resolve, reject); // 先不考虑x为promise的情况
          } catch (e) {
            reject(e)
          }
        });
      }
      if (this.status === REJECTED) {
        process.nextTick(() => {
          try {
            let x = onRejected(this.reason);
            resolvePromise(promise2, x, resolve, reject); // 先不考虑x为promise的情况
          } catch (e) {
            reject(e)
          }
        });
      }
      if (this.status === PENDING) {
        this.onResolvedCallbacks.push(() => {
          process.nextTick(() => {
            try {
              let x = onFulfilled(this.value);
              resolvePromise(promise2, x, resolve, reject); // 先不考虑x为promise的情况
            } catch (e) {
              reject(e)
            }
          });
        });
        this.onRejectedCallbacks.push(() => {
          process.nextTick(() => {
            try {
              let x = onRejected(this.reason);
              resolvePromise(promise2, x, resolve, reject); // 先不考虑x为promise的情况
            } catch (e) {
              reject(e)
            }
          });
        });
      }
    })
    return promise2
  }
}

module.exports = MyPromise

const resolvePromise = (promise2, x, resolve, reject) => {
  // 不允许自己引用自己，这样会陷入死循环
  if (promise2 === x) {
    return reject(new TypeError('Chaining cycle detected for promise #<Promise>'))
  }
  // 一个then方法防止调用多个操作
  let called;

  // x是一个对象或者函数，且不是null
  if ((typeof x === 'object' && x != null) || typeof x === 'function') {
    try {
      // 为了判断 resolve 过的就不用再 reject 了（比如 reject 和 resolve 同时调用的时候）
      let then = x.then;
      // 如果then是函数，就默认是promise了
      if (typeof then === 'function') {
        // 就让then执行 第一个参数是this指向   后面是成功的回调 和 失败的回调
        then.call(x, y => {
          // 成功和失败只能调用一个
          if (called) return;
          called = true;
          // resolve的结果依旧是promise 那就继续解析
          resolvePromise(promise2, y, resolve, reject);
        }, r => {
          // 成功和失败只能调用一个
          if (called) return;
          called = true;
          reject(r);
        });
      } else {
        // 如果 x.then 是个普通值就直接返回 resolve 作为结果(能调用.then，但不是函数，说明不是promise，只是和promise类似)
        resolve(x);
      }
    } catch (e) {
      if (called) return;
      called = true;
      reject(e)
    }
  } else {
    // 如果 x 是个普通值就直接返回 resolve 作为结果
    resolve(x)
  }
}

// 测试Promise/A+的规范
MyPromise.defer = MyPromise.deferred = function() {
  let dfd = {}
  dfd.promise = new MyPromise((resolve, reject) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
}