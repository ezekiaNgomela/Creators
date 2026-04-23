import { StyleSheet } from "react-native";

export const stylex = {
  create<T extends Record<string, object>>(styles: T) {
    return StyleSheet.create(styles);
  },
  props<T>(...styles: Array<T | false | null | undefined>) {
    return styles.filter(Boolean) as T[];
  },
};
