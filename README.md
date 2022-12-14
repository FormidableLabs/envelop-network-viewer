[![envelop-network-viewer — Formidable, We build the modern web](https://raw.githubusercontent.com/FormidableLabs/envelop-network-viewer/main/envelop-network-viewer-Hero.png)](https://formidable.com/open-source/)

[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=FormidableLabs_envelop-network-viewer&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=FormidableLabs_envelop-network-viewer)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=FormidableLabs_envelop-network-viewer&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=FormidableLabs_envelop-network-viewer)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=FormidableLabs_envelop-network-viewer&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=FormidableLabs_envelop-network-viewer)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=FormidableLabs_envelop-network-viewer&metric=coverage)](https://sonarcloud.io/summary/new_code?id=FormidableLabs_envelop-network-viewer)

This plugin is designed to provide visibility into how many/what network requests are made by your GraphQL Operations. 
This tool is primarily targeted for existing graphql projects that have grown large and complex with integrations and 
developers want some insight into how heavy specific GraphQL operations are in order to identify cache or optimization 
candidates. Below is an example of possible log output of the plugin:

```
useNetworkViewer {"operationName":"test","document":"query test {\n  test\n}","observations":[{"label":"HTTP/HTTPS","data":{"calls":1,"hosts":["localhost"],"requests":[{"time":1659986144633,"method":"GET","host":"localhost","port":"8883","headers":{},"response":{"time":1659986144636,"httpVersion":"1.1","statusCode":200,"headers":{"server":"stubby/5.1.0 node/v14.19.3 (darwin arm64)","x-stubby-resource-id":"1","date":"Mon, 08 Aug 2022 19:15:44 GMT","connection":"close","transfer-encoding":"chunked"},"statusMessage":"OK"},"duration_ms":3}]}}]}
```

Prettified output:
```JSON
{
  "operationName": "test",
  "document": "query test {\n  test\n}",
  "observations": [
    {
      "label": "HTTP/HTTPS",
      "data": {
        "calls": 1,
        "hosts": [
          "localhost"
        ],
        "requests": [
          {
            "time": 1659986144633,
            "method": "GET",
            "host": "localhost",
            "port": "8883",
            "headers": {},
            "response": {
              "time": 1659986144636,
              "httpVersion": "1.1",
              "statusCode": 200,
              "headers": {
                "server": "stubby/5.1.0 node/v14.19.3 (darwin arm64)",
                "x-stubby-resource-id": "1",
                "date": "Mon, 08 Aug 2022 19:15:44 GMT",
                "connection": "close",
                "transfer-encoding": "chunked"
              },
              "statusMessage": "OK"
            },
            "duration_ms": 3
          }
        ]
      }
    }
  ]
}
```


Keep in mind, that this is an investigative tool that can have a heavy impact on your logs. It should only be turned on 
for explicit data collection activities.

### Concurrency Caveat
Supporting concurrent requests relies on using Continuation-local storage, which has a performance cost, and so it isn't enabled by default.
If your use case is not lambda like (node process serves one request at a time), then you will need to enable concurrency support for the plugin.

Use the `enableConcurrencySupport` configuration option to enable concurrency support. 

## Usage
Add the useNetworkViewer plugin to your envelop configuration. Note the constructor takes two parameters:
1. The first parameter is a boolean determining if the plugin is enabled. You must explicitly enable the plugin (recommended w/ an env variable)
2. The second parameter is the configuration for the plugin

```javascript
const useNetworkViewerConfig = {
    // plugin options
};

const getEnveloped = envelop({
  plugins: [
    // all enabled plugins
    useNetworkViewer(boolean(process.env.USE_NETWORK_VIEWER), useNetworkViewerConfig)
  ]
})
```

### Config
Below is a list of configuration properties and what they do

| property | default | description |
| --- | --- | --- |
| additionalObservers | empty array | Only the http/https observer is included by default. You must specify other observers that are use case specific (knex, redis, mysql, etc) |
| logFunction | console.log | Specify what function is used to log network viewer info. You can specify your own logger (myLogger.debug for instance) |
| logGraphQlDocument | false | Set to true to include the graphql operation in the log message |
| enableConcurrencySupport | false | Support concurrent requests |


## Additional Observers
These additional observers aren't included by default. They are purpose specific observers that will only be applicable to some app stacks.

### Prisma Observer
If your application uses Prisma, you'll want to include the `PrismaObserver` in your configuration of the plugin. 
The prisma client observer provides observations for your database interactions using the prisma client.

#### Usage
You'll need to initialize the prisma client and pass it as a parameter when instantiating the `PrismaObserver`. 
Then pass the `PrismaObserver` instance in the `additionalObservers` configuration.   

```typescript
const prisma = new PrismaClient()

const useNetworkViewerConfig = {
  additionalObservers: [new PrismaObserver(prisma)]
};

const getEnveloped = envelop({
  plugins: [
    useNetworkViewer(true, useNetworkViewerConfig)
  ]
})
```

### Sequelize Observer
If your application uses Sequelize, you'll want to include the `SequelizeObserver` in your configuration of the plugin. 
The sequelize observer provides observations for your database interactions using the sequelize client.

#### Usage
You'll need to initialize the sequelize client and pass it as a parameter when instantiating the `SequelizeObserver`. 
Then pass the `SequelizeObserver` instance in the `additionalObservers` configuration.   

```typescript
const sequelize = new Sequelize('sqlite::memory:');

const useNetworkViewerConfig = {
  additionalObservers: [new SequelizeObserver(sequelize)]
};

const getEnveloped = envelop({
  plugins: [
    useNetworkViewer(true, useNetworkViewerConfig)
  ]
})
```

### Knex.js Observer
If your application uses Knex.js, you'll want to include the `KnexObserver` in your configuration of the plugin. 
The Knex observer provides observations for your database interactions using the Knex client.

#### Usage
You'll need to initialize the Knex client and pass it as a parameter when instantiating the `KnexObserver`. 
Then pass the `KnexObserver` instance in the `additionalObservers` configuration.   

```typescript
const knex = Knex({
  client: 'sqlite3',
  connection: {
    filename: ':memory:',
  },
});

const useNetworkViewerConfig = {
  additionalObservers: [new KnexObserver(knex)]
};

const getEnveloped = envelop({
  plugins: [
    useNetworkViewer(true, useNetworkViewerConfig)
  ]
})
```

### TypeORM Observer
If your application uses TypeORM, you'll want to include the `TypeORMObserver` in your configuration of the plugin. 
The TypeORM observer provides observations for your database interactions using the TypeORM datasource.

#### Usage
You'll need to initialize the TypeORM datasource with `options.logger` set to an instance of `TypeORMObserverLogger`.
Then pass the instance of the `TypeORMObserverLogger` when instantiating the `TypeORMObserver`. 
Finally, pass the `TypeORMObserver` instance in the `additionalObservers` configuration.   

```typescript
const typeOrmObserverLogger = new TypeOrmObserverLogger();

const datasource = new DataSource({
  type: 'sqlite',
  database: ':memory:',
  logger: typeOrmObserverLogger,
  logging: ['error'], // still respected
});

const useNetworkViewerConfig = {
  additionalObservers: [new TypeORMObserver(typeOrmObserverLogger)]
};

const getEnveloped = envelop({
  plugins: [
    useNetworkViewer(true, useNetworkViewerConfig)
  ]
})
```

If you've already configured your datasource with `logger` and `logging` value, you can provide those to `TypeORMObserverLogger` instead. 
The `TypeORMObserverLogger` will pass all logging to the provided logger.

Example, to use one the built-in file logger to log query errors then you would use the following
to initialize the `TypeORMObserverLogger`

```typescript 
const typeOrmObserverLogger = new TypeOrmObserverLogger(
  "file", /* or any valid DataSourceOptions.logger value */ 
  ['error'] /* or any valid DataSourceOptions.logging value */)
);
```
