const head = { appendChild: (c: unknown) => c };
const body = { appendChild: (c: unknown) => c };

function createElement() {
  return {
    type: "",
    styleSheet: null,
    click: () => {},
    remove: () => {},
    appendChild: (c: unknown) => c,
    setAttribute: () => {},
    set textContent(_v: string) {},
    set innerHTML(_v: string) {},
  };
}

function createTextNode(text: string) {
  return { textContent: text };
}

(globalThis as any).window = globalThis;
(globalThis as any).document = {
  ...((globalThis as any).document ?? {}),
  head,
  body,
  createElement,
  createTextNode,
  getElementsByTagName: (tag: string) => {
    if (tag === "head") return [head];
    if (tag === "body") return [body];
    return [];
  },
};
