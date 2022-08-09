import { Namespace } from 'cls-hooked';

export type Namespaceish = Pick<Namespace, 'run' | 'get' | 'set' | 'bind'>;

/**
 * We use faux Cls hooks when we do not need to support concurrency.
 * It allows the plugin implementation to have the same interface when supporting concurrency or not
 */
class FauxNamespace implements Namespaceish {
  constructor(private name: string, private data: Record<string, any> = {}) {}
  get(key: string): unknown {
    return this.data[key];
  }

  run(func: () => void): void {
    func();
  }

  set<T>(key: string, value: T): T {
    this.data[key] = value;
    return this.data[key] as T;
  }

  bind<F>(fn: F, context: any): F {
    return fn;
  }
}

export const createNamespace = (name: string): Namespaceish => {
  return new FauxNamespace(name);
};

export class ContextTest {
  constructor(private readonly targetId: string, private namespace: Namespaceish) {}
  isTargetContext() {
    return this.targetId === this.namespace.get('id');
  }
}
