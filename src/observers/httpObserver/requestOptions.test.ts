import { requestOptions } from './requestOptions';

describe('httpObserver/requestOptions', () => {
  type TestCase = [
    label: string,
    args: [url: string | URL | Record<string, unknown>, opts: Record<string, unknown> | undefined],
    expected: Record<string, unknown>,
  ];
  const testCases: Array<TestCase> = [
    [
      'url parameter can be a string',
      ['http://foo.com:7373/asdf?q=red', undefined],
      expect.objectContaining({
        host: 'foo.com',
        path: '/asdf?q=red',
        port: '7373',
        protocol: 'http:',
      }),
    ],
    [
      'url parameter can be a URL',
      [new URL('https://bar.com/fdsa?q=blue&sort=asc'), undefined],
      expect.objectContaining({
        host: 'bar.com',
        path: '/fdsa?q=blue&sort=asc',
        port: '',
        protocol: 'https:',
      }),
    ],
    [
      'url parameter can be a URL object',
      [{ host: 'bar.com', path: '/fdsa?q=blue&sort=asc', port: '', protocol: 'https:' }, undefined],
      { host: 'bar.com', path: '/fdsa?q=blue&sort=asc', port: '', protocol: 'https:' },
    ],
    [
      'if url and options are specified, they are merged, options properties taking precedence',
      [
        'https://foobar.com/asdffdsa',
        {
          host: 'fizbuz.com',
          path: '/foo/bar?category=shoes',
          port: 8080,
          protocol: 'http:',
        },
      ],
      expect.objectContaining({
        host: 'fizbuz.com',
        path: '/foo/bar?category=shoes',
        port: 8080,
        protocol: 'http:',
      }),
    ],
  ];
  testCases.forEach((test) => {
    const [scenario, args, expected] = test;
    it(`${scenario}`, () => {
      // @ts-ignore
      const options = requestOptions(...args);
      expect(options).toEqual(expected);
    });
  });

  describe('unexpected parameters provided', () => {
    type FailureCase = [label: string, args: Array<unknown>, expected: string];
    const failureCases: Array<FailureCase> = [
      [
        'should throw if first parameter is not a url or options',
        [() => 'no-op'],
        'First parameter should be the url, or options object.',
      ],
      [
        'should throw if second parameter is not an options or callback or undefined',
        ['http://foo.com', 'http://bar.com'],
        'Second parameter should be an options object or callback or undefined.',
      ],
      [
        'should throw if third parameter is not a callback or undefined',
        ['http://foo.com', { port: 8083 }, { contentType: 'text/json' }],
        'Third parameter should be a callback or undefined.',
      ],
    ];
    failureCases.forEach((failure) => {
      const [scenario, args, expected] = failure;
      it(`${scenario}`, () => {
        // @ts-ignore
        expect(() => requestOptions(...args)).toThrowError(expected);
      });
    });
  });
});
