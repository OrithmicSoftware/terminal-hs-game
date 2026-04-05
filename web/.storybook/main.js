/** @type { import('@storybook/html-vite').StorybookConfig } */
export default {
  stories: ["../stories/**/*.stories.@(js|mjs)"],
  addons: ["@storybook/addon-essentials"],
  framework: {
    name: "@storybook/html-vite",
    options: {},
  },
};
