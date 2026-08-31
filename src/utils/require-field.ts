export type RequireField<T, K extends keyof any> =
  T extends Record<K, unknown> ? T : never;
