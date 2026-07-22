async function bar() {
  return Promise.resolve(1, 2);
}

export const foo = () => {
  const x = bar();
  if (x) {
    console.log("blah");
  }
};
