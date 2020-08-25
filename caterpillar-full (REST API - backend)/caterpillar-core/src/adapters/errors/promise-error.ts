export class PromiseError {
  constructor(
    public source: string,
    public errorMessage: any,
    public components: Array<Component>
  ) {}
}

export class Component {
  constructor(public components: string, public functions: string) {}
}
