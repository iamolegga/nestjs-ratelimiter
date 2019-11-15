export type FirstConstructorArgument<T> = T extends new (
  arg1: infer U,
  ...args: any[]
) => any
  ? U
  : any;
