const MyPromise = require('./my-promise.js')

const promise = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    reject('失败');
  }, 1000);
})

promise.then().then().then(data => {
  console.log(data);
}, err => {
  console.log('err', err);
})