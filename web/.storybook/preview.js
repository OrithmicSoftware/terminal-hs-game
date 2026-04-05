import "../theme.css";

/** @type { import('@storybook/html-vite').Preview } */
const preview = {
  parameters: {
    layout: "padded",
    backgrounds: {
      default: "hktm",
      values: [{ name: "hktm", value: "#0a0f0c" }],
    },
  },
};

export default preview;
