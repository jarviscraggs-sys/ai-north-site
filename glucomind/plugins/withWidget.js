/**
 * Expo Config Plugin — iOS Widget Extension
 *
 * Adds the GlucoMind widget target to the Xcode project during prebuild.
 * Copies Swift widget code and configures App Groups for data sharing.
 */
const { withXcodeProject, withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WIDGET_NAME = 'GlucoMindWidget';
const APP_GROUP = 'group.com.glucomind.app.widget';

function withWidget(config) {
  // 1. Add App Group entitlement to main app
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.security.application-groups'] = [APP_GROUP];
    return config;
  });

  // 2. Add widget extension to Xcode project
  config = withXcodeProject(config, async (config) => {
    const project = config.modResults;
    const targetName = WIDGET_NAME;
    const bundleId = `com.glucomind.app.${targetName}`;

    // Get the project root
    const projectRoot = config.modRequest.projectRoot;
    const iosPath = path.join(projectRoot, 'ios');
    const widgetPath = path.join(iosPath, targetName);

    // Create widget directory
    if (!fs.existsSync(widgetPath)) {
      fs.mkdirSync(widgetPath, { recursive: true });
    }

    // Copy Swift widget code
    const sourcePath = path.join(projectRoot, 'targets', 'widget', 'GlucoMindWidget.swift');
    const destPath = path.join(widgetPath, `${targetName}.swift`);
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
    }

    // Create Info.plist for widget
    const widgetInfoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleDisplayName</key>
  <string>GlucoMind</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>${bundleId}</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>`;
    fs.writeFileSync(path.join(widgetPath, 'Info.plist'), widgetInfoPlist);

    // Create entitlements for widget
    const widgetEntitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP}</string>
  </array>
</dict>
</plist>`;
    fs.writeFileSync(path.join(widgetPath, `${targetName}.entitlements`), widgetEntitlements);

    // Add widget extension target to Xcode project
    const targetUuid = project.generateUuid();
    const widgetGroup = project.addPbxGroup(
      [`${targetName}.swift`, 'Info.plist', `${targetName}.entitlements`],
      targetName,
      targetName
    );

    // Add to main project group
    const mainGroup = project.getFirstProject().firstProject.mainGroup;
    project.addToPbxGroup(widgetGroup.uuid, mainGroup);

    // Create native target
    const target = project.addTarget(
      targetName,
      'app_extension',
      targetName,
      bundleId
    );

    // Add source file to build phase
    project.addSourceFile(
      `${targetName}/${targetName}.swift`,
      { target: target.uuid },
      widgetGroup.uuid
    );

    // Set build settings for widget target
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const config = configurations[key];
      if (config && config.buildSettings && config.name) {
        // Find widget target configs
        if (typeof config.buildSettings === 'object') {
          if (config.buildSettings.PRODUCT_NAME === `"${targetName}"` ||
              config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER === `"${bundleId}"`) {
            config.buildSettings.SWIFT_VERSION = '5.0';
            config.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
            config.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '16.0';
            config.buildSettings.CODE_SIGN_ENTITLEMENTS = `${targetName}/${targetName}.entitlements`;
            config.buildSettings.DEVELOPMENT_TEAM = '6DFM687BVS';
            config.buildSettings.INFOPLIST_FILE = `${targetName}/Info.plist`;
          }
        }
      }
    }

    return config;
  });

  return config;
}

module.exports = withWidget;
