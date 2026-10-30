import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// An app's stylesheet never makes Tailwind run a file of its own (2026-10-30):
// `@config "./x.js"` (and Tailwind 4's `@plugin`) names a JS file that Tailwind
// loads as code — on our servers, inside the preview and the publish build. The
// platform's tailwind.config.js is the only config: the at-rule is dropped
// before Tailwind reads the sheet. src/lib/preview/build-config.ts keeps this
// file in every workdir; scripts/_test-stylesheet-config.ts pins it.
const noStylesheetConfig = {
  postcssPlugin: 'whacka-no-stylesheet-config',
  Once(root) {
    root.walkAtRules((rule) => {
      const name = rule.name.toLowerCase()
      if (name === 'config' || name === 'plugin') rule.remove()
    })
  },
}

export default {
  plugins: [noStylesheetConfig, tailwindcss, autoprefixer],
}
