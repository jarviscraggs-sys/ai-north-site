/**
 * DismissKeyboard — Tap anywhere outside a TextInput to dismiss the keyboard.
 * Wrap any screen's content in this component.
 *
 * Also exports a KeyboardDoneBar for adding a "Done" toolbar above the keyboard.
 */

import React from 'react';
import {
  Keyboard,
  TouchableWithoutFeedback,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  InputAccessoryView,
} from 'react-native';
import { Colors } from '../constants/colors';

/**
 * Wrap a screen to dismiss keyboard on tap outside inputs.
 */
export function DismissKeyboard({ children }: { children: React.ReactNode }) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>{children}</View>
    </TouchableWithoutFeedback>
  );
}

/**
 * A "Done" toolbar that sits above the keyboard on iOS.
 * Attach to TextInputs via inputAccessoryViewID="keyboard-done".
 */
export const KEYBOARD_DONE_ID = 'keyboard-done';

export function KeyboardDoneBar() {
  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ID}>
      <View style={styles.bar}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={Keyboard.dismiss} style={styles.doneBtn}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card ?? '#f8f8f8',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.cardBorder ?? '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  doneBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  doneText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
});
