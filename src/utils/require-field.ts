// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RequireField<T, K extends keyof any> = T extends Record<K, any>
  ? T
  : never;
