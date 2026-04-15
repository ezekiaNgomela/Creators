import { configureStore } from "@reduxjs/toolkit";

export const store = configureStore({
  reducer: {
    ui: (state = { theme: "dark" }) => state,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
