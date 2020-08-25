export class FunctionInfo {
  constructor(
    public functionName: string,
    public paramTypes: Array<string>,
    public returnType?: string,
    public fullInfo?: boolean
  ) {}
}
