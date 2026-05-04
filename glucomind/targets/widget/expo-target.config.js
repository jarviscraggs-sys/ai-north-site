/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  name: 'GlucoMindWidget',
  bundleIdentifier: 'com.glucomind.app.GlucoMindWidget',
  deploymentTarget: '16.0',
  entitlements: {
    'com.apple.security.application-groups': ['group.com.glucomind.app.widget'],
  },
  frameworks: ['WidgetKit', 'SwiftUI'],
};
