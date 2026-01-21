import React from "react";
import renderer, { act } from "react-test-renderer";
import App from "../App";

it("renders correctly", () => {
  let tree: renderer.ReactTestRenderer;

  act(() => {
    tree = renderer.create(<App />);
  });

  expect(tree!.toJSON()).toBeTruthy();
});
