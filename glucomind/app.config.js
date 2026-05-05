const baseConfig = require('./app.json');

module.exports = ({ config }) => {
  return {
    ...baseConfig.expo,
    ...config,
    extra: {
      ...baseConfig.expo.extra,
      openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    },
  };
};
