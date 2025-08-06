// module.exports = {
//   theme: {
//     extend: {},
//   },
//   future: {
//     // Disable OKLCH colors if enabled
//     disableColorOpacityUtilitiesByDefault: false,
//   },
//   // Force use of RGB values
//   experimental: {
//         disableColorPalette: true, // 👈 THIS is the key line!

//     optimizeUniversalDefaults: true,
//   },
// }
// tailwind.config.js
module.exports = {
  theme: {
    extend: {},
  },
  experimental: {
    disableColorPalette: true, // ✅ disables oklch() entirely
    optimizeUniversalDefaults: true,
  },
};

