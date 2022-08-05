# envelop-network-viewer
This plugin is designed to provide visibility into how many/what network requests are made by your GraphQL Operations. 
This tool is primarily targeted for existing graphql projects that have grown large and complex with integrations and 
developers want some insight into how heavy specific GraphQL operations are in order to identify cache or optimization 
candidates. Below is an example of possible log output of the plugin:

```
useNetworkViewer {"operationName":"test","document":"query test {\n  test\n}","observations":[{"label":"HTTP/HTTPS","data":{"requests":1,"hosts":["localhost"]}}]}
```

Keep in mind, that this is an investigative tool that can have a heavy impact on your logs. It should only be turned on 
for explicit data collection activities.


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



## Todo
- [x] HTTP/HTTPS observer
- [ ] Support extending w/ new observers
- [ ] review https://github.com/nock/nock ClientRequest override to support HTTP calls that use this class
- [ ] document plugin install / usage
- [ ] document plugin design for dev support
